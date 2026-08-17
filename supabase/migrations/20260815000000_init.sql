-- Michi Binder Studio — data-model §5 schema + RLS + storage.
-- Card catalog is static and is not seeded here.

create table binders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'My binder',
  layout_id   text not null check (layout_id in ('2x2','3x3','4x3','4x4')),
  page_mode   text not null default 'double' check (page_mode in ('single','double')),
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  binder_id   uuid not null references binders(id) on delete cascade,
  position    int  not null,
  created_at  timestamptz not null default now(),
  unique (binder_id, position) deferrable initially deferred
);

create table merges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  page_id      uuid not null references pages(id) on delete cascade,
  row          int  not null,
  col          int  not null,
  row_span     int  not null check (row_span >= 1),
  col_span     int  not null check (col_span >= 1),
  spans_gutter boolean not null default false,
  check (row_span * col_span >= 2)
);

create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime         text not null,
  width_px     int  not null,
  height_px    int  not null,
  byte_size    int  not null,
  created_at   timestamptz not null default now()
);

create table placements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  page_id         uuid not null references pages(id) on delete cascade,
  merge_id        uuid references merges(id) on delete cascade,
  row             int,
  col             int,
  kind            text not null check (kind in ('card','art')),
  card_id         text,
  asset_kind      text check (asset_kind in ('upload','pack')),
  upload_asset_id uuid references media_assets(id) on delete restrict,
  pack_item_id    text,
  transform       jsonb not null default '{}',
  ownership       text check (ownership in ('owned','wanted')),
  check ( (merge_id is not null and row is null and col is null)
       or (merge_id is null and row is not null and col is not null) ),
  check ( (kind = 'card' and card_id is not null and asset_kind is null)
       or (kind = 'art'  and card_id is null and asset_kind is not null) ),
  check ( asset_kind is distinct from 'upload' or upload_asset_id is not null ),
  check ( asset_kind is distinct from 'pack'   or pack_item_id  is not null ),
  check ( kind = 'card' or ownership is null ),
  unique (merge_id)
);
create unique index placements_cell_unique
  on placements (page_id, row, col) where merge_id is null;

create or replace function touch_binder_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger binders_touch_updated_at
  before update on binders
  for each row execute function touch_binder_updated_at();

alter table binders enable row level security;
alter table pages enable row level security;
alter table merges enable row level security;
alter table media_assets enable row level security;
alter table placements enable row level security;

create policy binders_owner on binders
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy pages_owner on pages
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy merges_owner on merges
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy media_assets_owner on media_assets
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy placements_owner on placements
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('media-originals', 'media-originals', false)
on conflict (id) do nothing;

-- Folder-first owner check: objects live at `{auth.uid()}/{assetId}`. Using
-- `owner = auth.uid()` on INSERT fails because Storage has not stamped owner yet.
create policy media_originals_select on storage.objects
  for select using (
    bucket_id = 'media-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy media_originals_insert on storage.objects
  for insert with check (
    bucket_id = 'media-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy media_originals_update on storage.objects
  for update using (
    bucket_id = 'media-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'media-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy media_originals_delete on storage.objects
  for delete using (
    bucket_id = 'media-originals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

grant select, insert, update, delete
  on binders, pages, merges, media_assets, placements
  to authenticated;
