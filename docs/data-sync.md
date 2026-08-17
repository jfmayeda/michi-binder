# Re-syncing the Pokémon TCG catalog

The app does not call a live card API. Search runs against files in `public/data/`
that we generate from the free [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data)
dump and commit. When The Pokémon Company releases a new set, we refresh those files.

## When to run this

After a new English set appears in pokemon-tcg-data (usually within a day or two of
release). You do **not** need to run it for app features — only for catalog freshness.

## Steps

1. From the repo root, run:

   ```bash
   npm run sync-cards
   ```

   This downloads the latest dump, rebuilds `public/data/`, and prints counts + the
   index file size. The index must stay at or under 6 MB.

2. Look at the git diff:

   ```bash
   git diff --stat public/data
   ```

   You should see new card ids for the new set, plus maybe a few image-URL exceptions.
   If the diff is huge across old sets, stop and ask — something upstream changed shape.

3. Open the app (`npm run dev`), search for a card from the new set, and eyeball its
   name, set, and thumbnail. If the picture is missing, it will be in
   `public/data/image-exceptions.json` (or the CDN is lagging).

4. Commit the generated files with a message like `Sync TCG data for <set name>.`

## What the files are

| File | Purpose |
| --- | --- |
| `cards-index.json` | Columnar search index (id, name, set, number, rarity, artist, types, dex, era) |
| `sets.json` | Set names, series (era), release dates, symbol/logo URLs |
| `dex-species.json` | National dex number → species name (for the species facet) |
| `image-exceptions.json` | Cards whose CDN URL does not match `images.pokemontcg.io/{set}/{number}.png` |
| `colors.json` | Dominant colors (added later by `extract-colors.ts`; not this script) |

`era` is the dataset’s `series` field (Base, Sword & Shield, Scarlet & Violet, …).

## Determinism

Running the script twice on the same upstream dump must produce no git diff. Ordering is
alphabetical by card/set id. No generated timestamps.
