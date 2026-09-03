# OUTLAW100 · Compendium UX, localization and media design

## Goal

Make OUTLAW100 easier to use alongside a Spanish-language RDR2 playthrough while preserving the current canonical data model, Supabase progress and RDR2 editorial identity.

This pass covers four connected problems:

1. Story mission numbering is not a useful campaign number.
2. Functional microcopy across the app is too small to read comfortably.
3. Compendium/entity cards need recognizable game imagery.
4. Compendium names should be Spanish-first while remaining searchable in English.

## Non-goals

- No changes to Supabase progress semantics or save format.
- No responsive/mobile redesign in this pass.
- No replacement of canonical English entity IDs/names used internally.
- No attempt to manually translate every metadata field in the application.
- No mission-specific hero overhaul beyond the existing dashboard hero system.

## 1. Story numbering

### User-facing behavior

Historia keeps the existing chapter grouping and canonical chapter order, but every story mission receives a single campaign-global visible number.

The visible sequence is `001` through the final campaign mission, continuing across chapter boundaries. The number is assigned only after the canonical chapter and mission ordering has been resolved.

Example:

- Chapter 1: 001, 002, 003…
- Chapter 2: continues from the previous chapter rather than restarting at 01.

### Data behavior

`missionIndex` remains source metadata and is not rewritten. A derived `campaignOrder` is added to the Story view model after flattening canonically ordered chapter groups.

The UI uses `campaignOrder` for the card number and detail panel `ORDEN`. Source metadata remains available for debugging and internal relations.

### Tests

- Canonical chapter order still wins over scrambled legacy group indices.
- Mission order inside each chapter remains source-backed.
- Flattened campaign order is unique, continuous and starts at 1.
- Search/filtering never renumbers a mission; filtered cards preserve their original global number.

## 2. Readable typography scale

### Principle

Chinese Rocks remains for display titles and identity. Functional UI uses the existing sans-serif stack, but the minimum readable size increases throughout the application.

The app should stop using 6–8 px text for meaningful information on desktop.

### Target desktop scale

- Micro labels / categories / metadata labels: 9–10 px.
- Secondary metadata / English aliases: 10–11 px.
- Card titles: 12–13 px.
- Checklist / criteria text: 11–12 px.
- Inputs, selects, chips and toolbar labels: 11–12 px.
- Body copy and detail descriptions: 12–13 px.
- Navigation labels: minimum 10–11 px where visible.
- Decorative numeric/display elements may retain their existing larger Chinese Rocks treatment.

### Scope

Apply the scale consistently to:

- Dashboard cards and lists.
- Historia.
- Route.
- Entity grids / compendium.
- Detail panels.
- Checklists and status controls.
- Search/filter toolbars.
- Visible sidebar/rail labels and tooltips where applicable.

### Layout rule

Font increases must not cause uncontrolled card growth. Cards may grow modestly, wrap titles to two lines and use internal truncation only for secondary aliases. No meaningful Spanish display name should be ellipsized when there is reasonable vertical space.

## 3. Spanish-first compendium localization

### Display hierarchy

For compendium-style entity views:

- Spanish official/localized name is the primary large title.
- English canonical name is secondary and visually quieter.
- Detail panels use the same hierarchy.

Target views:

- Animals and legendary animals.
- Fish.
- Plants.
- Horses and coats.
- Weapons.
- Equipment.
- Cigarette cards.

### Canonical data rule

Internal canonical names remain unchanged in English. Spanish names are stored/served through the existing translation layer rather than replacing entity identity.

The expected conceptual model remains:

- `entity.name`: canonical English name.
- `catalog.translations[entity.name]`: Spanish display name when available.

### Search behavior

Entity search must match both:

- Spanish display name.
- English canonical name.

Search remains accent-insensitive.

### Localization quality

Use official in-game Spanish terminology where it can be verified. Do not create literal ad-hoc translations for species, weapons or equipment when an official localized name exists.

If an official Spanish name cannot be confidently sourced, retain the English name until a verified translation is available rather than inventing one.

## 4. Canonical media resolver

### Objective

Every card in the target compendium views should have a recognizable image when a suitable source exists, without making each React view responsible for source-specific URL logic.

### Architecture

Add a dedicated media resolver layer for entity cards.

Conceptual API:

```ts
resolveEntityMedia(catalog, entity): {
  url: string | null;
  source: 'catalog' | 'official-compendium' | 'official-game' | 'curated-external' | 'fallback';
  orientation: 'landscape' | 'portrait' | 'square' | 'unknown';
  objectPosition?: string;
}
```

Resolution priority:

1. Existing canonical/local `catalog.mediaAssets` image.
2. Curated compendium artwork/drawing from the game when available.
3. Clean official/in-game image for entities without usable isolated compendium art.
4. Curated category fallback only when no entity-specific image exists.
5. Never render a broken-image icon.

The resolver is independent from progress state and entity view filtering.

### Source manifests

Do not hard-code hundreds of media URLs inside React components.

Keep source mappings in dedicated data/manifest modules grouped by category, with normalized canonical entity keys. This allows media coverage to be audited and expanded without rewriting the UI.

Example conceptual shape:

```ts
const animalMedia = {
  'American Alligator': { url: '...', orientation: 'landscape' },
};
```

### Failure behavior

Remote image failure must fall through to an available bundled/category fallback rather than leaving a broken image.

When an external host blocks hotlinking, the manifest entry must be considered unusable and replaced with a source that can render reliably. Do not add runtime scraping.

## 5. Compendium card design

### Card anatomy

Cards become more visually led while keeping current progress information.

Recommended structure:

```text
[ image area ]
SPANISH NAME
English name
category / progress
```

For dense views, image and copy may remain side-by-side when that produces better information density, but image dimensions must be consistent within a category.

### Image fitting

- Animals, fish, plants, horses, weapons and equipment default to a landscape/contained presentation.
- Artwork with transparent/isolated subjects should use `object-fit: contain` on a dark/paper-like stage.
- Screenshot-like media should use `object-fit: cover` with per-item `object-position` support.
- Image area must not distort the source aspect ratio.

### Detail panel

Use the same resolved image in the detail hero when it is better than the current canonical media entry. Detail images may be larger but must preserve the same resolver priority.

## 6. Cigarette cards

### Coverage

Map all 144 cigarette cards to their corresponding artwork from the user-provided GTABase cigarette-card collection reference.

### Orientation

The UI must support portrait and landscape card artwork explicitly.

- Portrait cards: centered, contained, with vertical breathing room.
- Landscape cards: contained at full available width.
- Never crop card borders/artwork merely to force every image into one aspect ratio.

### Card layout

The collection card should use a fixed media stage and allow the artwork to letterbox naturally. Background treatment should make the card artwork feel intentional rather than like an incorrectly sized thumbnail.

### Matching

The mapping must be deterministic by canonical cigarette-card entity name/set/number, not DOM order or fuzzy runtime matching.

### Tests/audit

- 144 canonical cigarette-card entities resolve to 144 deterministic mapping entries when source coverage is complete.
- No duplicate mapping keys.
- Orientation value is valid for every mapped card.
- Missing or failed images produce a clean fallback.

## 7. Component boundaries

### Story

- `src/features/story/model.ts`: derive campaign-global order.
- `src/components/views/story-view.tsx`: render global number.

### Localization

- Keep translations in the catalog localization layer.
- Add source-backed translation data/import steps only where current coverage is missing.
- `EntityGridView` continues to consume `catalog.translations`, not a view-local dictionary.

### Media

Add focused feature modules under a dedicated media/entity-media area, for example:

- `src/features/media/entity-media.ts`
- `src/features/media/manifests/animals.ts`
- `src/features/media/manifests/fish.ts`
- `src/features/media/manifests/plants.ts`
- `src/features/media/manifests/horses.ts`
- `src/features/media/manifests/weapons.ts`
- `src/features/media/manifests/equipment.ts`
- `src/features/media/manifests/cigarette-cards.ts`

Exact filenames may change during implementation if the existing project structure suggests a cleaner boundary.

### Entity grids

`EntityGridView` receives resolved media rather than embedding source knowledge. Category-specific orientation rules are expressed as data/classes returned by the resolver.

## 8. Implementation sequence

### Phase A · Story + typography

- Add global 001–109 campaign numbering.
- Raise the desktop typography scale across shared components.
- Verify cards and detail panels do not overflow.

### Phase B · Spanish-first names

- Audit current translation coverage for target categories.
- Fill verified missing Spanish display names.
- Confirm bilingual accent-insensitive search.

### Phase C · Core compendium media

- Add resolver + manifests.
- Cover animals, fish, plants, horses, weapons and equipment.
- Add orientation-aware card media styling and graceful fallback.

### Phase D · Cigarette cards

- Build deterministic 144-card manifest from the GTABase collection reference.
- Add portrait/landscape handling.
- Audit full coverage.

## 9. Verification

Before merge:

- Story model unit tests for global numbering.
- Search tests for Spanish + English names.
- Media resolver tests for priority, orientation and fallback.
- Coverage audits for target categories and cigarette cards.
- Existing progress/Supabase tests remain green.
- Catalog audit remains green.
- Python source-independent tests remain green.
- ESLint passes without new warnings introduced by this work.
- Production Next build passes.
- Vercel preview is visually checked on desktop for Historia, Animals, Plants, Fish, Horses, Weapons, Equipment and Cigarette Cards.

## 10. Acceptance criteria

The pass is complete when:

1. Story shows a stable global campaign number for every mission, continuous across chapters.
2. No meaningful desktop functional text in the targeted surfaces is rendered at the current 6–8 px scale.
3. Target compendium cards present Spanish as the primary display name and remain searchable in English.
4. Compendium cards have entity-specific game imagery wherever a suitable source is available, with graceful fallback otherwise.
5. All 144 cigarette cards use deterministic artwork mappings and render correctly regardless of portrait/landscape orientation.
6. Existing completion, gold-medal, milestone, mission, Supabase and persistence behavior is unchanged.
