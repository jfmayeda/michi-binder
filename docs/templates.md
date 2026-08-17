# Templates (draft)

Versioned JSON in `src/templates/catalog/`. Jacob curates content; the agent
shipped placeholders marked `"draft": true`.

## Format

Each file is a `TemplateFile` (`src/templates/types.ts`):

- `version`: `1`
- `kind`: `starter-binder` or `page-template`
- `layoutId` / `pageMode` / `pages` / `merges` / `placements` — same shapes as a binder
- Every card placement **must** embed display data next to `cardId`:

```json
"card": {
  "card_id": "base1-58",
  "name": "Pikachu",
  "set": "base1",
  "number": "58",
  "imageUrl": "https://images.pokemontcg.io/base1/58.png"
}
```

That keeps the landing flip from loading `cards-index.json` (AT-9).

Never put user uploads in a template — cards and pack art only.

## Adding a collection page later

1. Copy a `page-template` JSON.
2. Change `id` and `title`.
3. Put card ids in placements.
4. Run `npm run sync-cards` (or `node --experimental-strip-types scripts/write-draft-templates.ts` only if regenerating drafts). Sync rewrites the `card` display objects from the catalog so names/URLs cannot rot.

## Files

See `manifest.json` for the list. The starter binder is the landing showcase.
