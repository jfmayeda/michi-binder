import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SQL = readFileSync('supabase/migrations/20260815000000_init.sql', 'utf8');

const TABLES = ['binders', 'pages', 'merges', 'media_assets', 'placements'] as const;

describe('T5.1 migration matches data-model §5', () => {
  it('creates every table, the deferred page unique, and the cell partial unique', () => {
    for (const table of TABLES) {
      expect(SQL).toMatch(new RegExp(`create table ${table}`, 'i'));
    }
    expect(SQL).toMatch(/unique \(binder_id, position\) deferrable initially deferred/);
    expect(SQL).toMatch(/create unique index placements_cell_unique/);
    expect(SQL).toMatch(/on placements \(page_id, row, col\) where merge_id is null/);
  });

  it('keeps owner-only RLS with (select auth.uid()) and never queries its own table', () => {
    for (const table of TABLES) {
      expect(SQL).toMatch(new RegExp(`alter table ${table} enable row level security`, 'i'));
      expect(SQL).toMatch(
        new RegExp(
          `create policy ${table}_owner on ${table}[\\s\\S]*using \\(user_id = \\(select auth\\.uid\\(\\)\\)\\)`,
        ),
      );
      expect(SQL).toMatch(
        new RegExp(
          `create policy ${table}_owner on ${table}[\\s\\S]*with check \\(user_id = \\(select auth\\.uid\\(\\)\\)\\)`,
        ),
      );
    }
    expect(SQL).not.toMatch(/using\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s*\)/);
  });

  it('touches binders.updated_at on binder updates and does not seed cards', () => {
    expect(SQL).toMatch(/create trigger binders_touch_updated_at/);
    expect(SQL).not.toMatch(/cards-index|pokemon-tcg|insert into cards/i);
  });

  it('creates a private media-originals bucket with folder-owner policies', () => {
    expect(SQL).toMatch(/values \('media-originals', 'media-originals', false\)/);
    expect(SQL).toMatch(/\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  });
});
