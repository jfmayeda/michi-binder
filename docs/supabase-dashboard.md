# Supabase dashboard steps (T5.1)

The migration file `supabase/migrations/20260815000000_init.sql` is the schema.
This Cloud run could not apply it (no database URL / management token) and could
not complete a live auth round-trip. Jacob should do these once in the project
that already has URL + anon + service-role keys.

## 1. Apply the migration

SQL Editor → paste the contents of `supabase/migrations/20260815000000_init.sql`
→ Run. Confirm tables `binders`, `pages`, `merges`, `media_assets`, `placements`
exist and that the private bucket `media-originals` exists.

## 2. Auth providers (only these two)

**Authentication → Providers**

- **Email:** enable. Use magic links (OTP email). Disable password signups if
  they are on — V1 is magic-link + Google only.
- **Google:** enable. Add the Google OAuth client ID and secret from Google Cloud.
  Authorized redirect URI is the Supabase callback:
  `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

**Authentication → URL configuration**

- Site URL: the production origin (Vercel).
- Redirect allow list: production origin, `http://localhost:3000`, and
  `http://localhost:3000/auth/callback`.

## 3. What this app expects

- Browser env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Never put the service role in client code.
- Media originals go to bucket `media-originals` at `{user_id}/{asset_id}`.
- Card catalog is static files; do not seed cards into Postgres.
