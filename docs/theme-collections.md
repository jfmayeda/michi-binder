# Theme collections

Human-editable JSON at `src/templates/theme-collections.json`.

Each collection:

| Field | Meaning |
| --- | --- |
| `id` | Stable slug |
| `name` | Display name |
| `description` | One or two sentences |
| `cardIds` | Catalog ids (`base1-58`) shown as examples |
| `examplePage` | Id of a page template in `src/templates/catalog/` |
| `searchText` | Name/artist query used when opening the collection in Search |

Ship 6–10 collections eventually. Two drafts are included so the vibe tab has something to show. Add objects to the `collections` array — no code change required.
