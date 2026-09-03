# OUTLAW100 Compendium UX + Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Historia globally numbered, raise desktop readability, make compendium views Spanish-first, and add robust entity imagery including all 144 cigarette cards.

**Architecture:** Keep canonical English entity identity and Supabase progress untouched. Derive campaign numbering in the Story model, merge verified Spanish display-name overrides into the catalog translation layer, and centralize imagery behind a deterministic entity-media resolver with per-category manifests and graceful fallbacks. EntityGridView remains source-agnostic and consumes only resolved presentation data.

**Tech Stack:** Next.js 15, React 19, TypeScript, Node test runner, Python catalog tooling, Supabase catalog repository, CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-compendium-ux-media-design.md`

## Global Constraints

- Do not change Supabase progress semantics or save format.
- Do not replace canonical English entity IDs/names used internally.
- Spanish official/localized name is the primary large title in target compendium views.
- Search must match both Spanish and English, accent-insensitively.
- Functional desktop text in targeted surfaces must leave the current 6–8 px scale.
- Image priority: existing canonical/local asset, compendium artwork, clean official/in-game image, category fallback.
- Never render a broken-image icon.
- Cigarette-card media must be deterministic by canonical card identity and support portrait/landscape orientation.
- Existing mission, milestone, gold-medal, Supabase and persistence behavior must stay unchanged.

---

### Task 1: Global campaign numbering for Historia

**Files:**
- Modify: `src/features/story/model.ts`
- Modify: `src/components/views/story-view.tsx`
- Test: `tests/unit/story-groups.test.ts`

**Interfaces:**
- Produces: `StoryMissionModel.campaignOrder: number`
- Consumers: Story cards and detail panel.

- [ ] **Step 1: Write the failing campaign-order test**

Add a test that builds multiple canonically ordered chapters with scrambled legacy `groupIndex`, then asserts the flattened mission sequence exposes `campaignOrder` values `[1,2,3,...]` independent of per-chapter `missionIndex` values.

```ts
const groups = buildStoryGroups(catalog, {});
const missions = groups.flatMap((group) => group.missions);
assert.deepEqual(missions.map((mission) => mission.campaignOrder), [1, 2, 3, 4]);
```

Also assert filtering/rendering can use the stable number without recomputing it.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/unit/story-groups.test.ts`
Expected: FAIL because `campaignOrder` is missing.

- [ ] **Step 3: Derive campaign order after canonical grouping**

In `buildStoryGroups`, first construct and sort chapter groups exactly as today, then walk the sorted groups once and return cloned missions with a 1-based campaign counter.

```ts
let campaignOrder = 0;
return sortedGroups.map((group) => ({
  ...group,
  missions: group.missions.map((mission) => ({ ...mission, campaignOrder: ++campaignOrder })),
}));
```

Add `campaignOrder: number` to `StoryMissionModel`.

- [ ] **Step 4: Render the global number**

Change Story cards from `mission.order` to `mission.campaignOrder`, padded to three digits:

```tsx
<span>{String(mission.campaignOrder).padStart(3, '0')}</span>
```

Change detail meta `ORDEN` to `active.campaignOrder`.

- [ ] **Step 5: Run tests**

Run: `node --experimental-strip-types --test tests/unit/story-groups.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: number story missions across the campaign`

---

### Task 2: Raise the desktop typography scale

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/story-view.css`
- Modify: `src/app/dashboard-golden.css`
- Test: `tests/unit/readability-css-contract.test.ts`

**Interfaces:**
- Produces: CSS contract that meaningful functional text in targeted surfaces uses 9 px minimum for micro labels and 11 px minimum for interactive/body text.

- [ ] **Step 1: Write a failing CSS contract test**

Read the three CSS files and assert representative selectors no longer contain legacy 6–8 px functional sizes:

```ts
assert.doesNotMatch(css, /\.entity-card small\{[^}]*font-size:(?:6|7|8)px/);
assert.doesNotMatch(css, /\.criteria-list button b\{[^}]*font-size:(?:6|7|8)px/);
assert.doesNotMatch(storyCss, /\.story-mission-card h3[^}]*font-size:\s*9px/);
```

Also assert target sizes for card titles, checklist labels, toolbar controls and detail body copy.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --experimental-strip-types --test tests/unit/readability-css-contract.test.ts`
Expected: FAIL against current 6–9 px declarations.

- [ ] **Step 3: Update shared component sizes**

Apply these targets without changing display-title typography:

- `.entity-card small`: 9–10 px
- `.entity-card h3`: 12–13 px
- `.entity-card > span`: 10 px
- `.browser-toolbar input/select`: 11 px
- `.browser-toolbar span`: 10 px
- `.detail-panel > p`: 12 px
- `.detail-meta small`: 9 px
- `.detail-meta b`: 11 px
- `.criteria-list button b`: 11 px
- `.criteria-list button small`: 9 px
- `.progress-status select`: 9–10 px
- `.route-row small`: 9 px
- `.route-row h3`: 12 px
- dashboard guide/gold/nearby functional text: 9–11 px
- Story toolbar/nav/meta/card title/alias/footer: 9–13 px.

Increase card min-heights/padding only where wrapping needs it.

- [ ] **Step 4: Ensure long Spanish names can wrap**

Keep primary display names unconstrained to one line where vertical space permits. Secondary English aliases may ellipsize.

- [ ] **Step 5: Run CSS contract and full unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `style: increase outlaw100 desktop readability`

---

### Task 3: Spanish-first compendium localization layer

**Files:**
- Create: `src/features/localization/compendium-es.ts`
- Create: `src/features/localization/apply-translations.ts`
- Modify: `src/lib/catalog/client.ts`
- Modify: `src/components/views/entity-grid-view.tsx`
- Test: `tests/unit/compendium-localization.test.ts`
- Test: `tests/unit/search-model.test.ts`

**Interfaces:**
- Produces: `applyCompendiumTranslations(catalog: CanonicalCatalog): CanonicalCatalog`
- Data: `COMPENDIUM_ES: Record<string, string>` keyed by canonical English entity name.
- Consumers: catalog client and existing `catalog.translations` lookups.

- [ ] **Step 1: Write failing translation-merge tests**

Create fixtures for an animal, fish, plant, horse, weapon and equipment item. Assert verified override names merge on top of existing legacy translations without deleting unrelated entries.

```ts
const localized = applyCompendiumTranslations(catalog);
assert.equal(localized.translations?.['American Alligator'], 'Caimán americano');
assert.equal(localized.translations?.['Legacy Mission'], 'Misión heredada');
```

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/unit/compendium-localization.test.ts`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Add verified Spanish mapping data**

Populate `COMPENDIUM_ES` only with verified in-game Spanish names for the target categories. Canonical English names remain keys. Do not invent literal translations when uncertain.

- [ ] **Step 4: Merge translations after either catalog source loads**

In `useCanonicalCatalog`, wrap the chosen result once:

```ts
const localizedCatalog = applyCompendiumTranslations(result.catalog);
setCatalog(localizedCatalog);
```

This keeps static and Supabase catalog behavior identical.

- [ ] **Step 5: Make EntityGridView explicitly Spanish-first**

Continue using `catalog.translations?.[entity.name]`. Render the translated value as `<h3>` and English `entity.name` as a secondary alias only when a translation exists.

Search already concatenates both names; add regression assertions that `caiman`, `caimán` and `alligator` all match the same entity.

- [ ] **Step 6: Run focused + full unit tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: localize compendium names in Spanish`

---

### Task 4: Entity-media resolver and presentation model

**Files:**
- Create: `src/features/media/entity-media.ts`
- Create: `src/features/media/types.ts`
- Create: `src/features/media/manifests/compendium.ts`
- Modify: `src/components/views/entity-grid-view.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/entity-media.test.ts`

**Interfaces:**

```ts
export type EntityMedia = {
  url: string | null;
  fallbackUrl: string | null;
  source: 'catalog' | 'official-compendium' | 'official-game' | 'curated-external' | 'fallback';
  orientation: 'landscape' | 'portrait' | 'square' | 'unknown';
  fit: 'cover' | 'contain';
  objectPosition?: string;
};

export function resolveEntityMedia(catalog: CanonicalCatalog, entity: CatalogEntity): EntityMedia;
```

- [ ] **Step 1: Write priority/fallback tests**

Test that a canonical `mediaAsset` wins over manifest media; manifest media wins over category fallback; unresolved entities return a clean fallback rather than a broken URL.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/unit/entity-media.test.ts`
Expected: FAIL because resolver does not exist.

- [ ] **Step 3: Implement resolver**

Normalize canonical entity names for manifest lookup, return source/fit/orientation metadata, and supply bundled category fallback paths for target views.

- [ ] **Step 4: Refactor EntityGridView to use the resolver**

Replace `imageByEntity` direct map lookup with `resolveEntityMedia`. Render a media stage even when using fallback. Add `data-orientation`, `objectFit` and optional `objectPosition` to the image.

- [ ] **Step 5: Add graceful runtime image error handling**

On `onError`, replace the failed source with `fallbackUrl` once and remove the handler to prevent loops.

- [ ] **Step 6: Add orientation-aware card CSS**

Create a fixed `.entity-card-media-stage`; use `contain` for isolated/portrait art and `cover` only where manifest data says so. Do not distort aspect ratio.

- [ ] **Step 7: Run tests and commit**

Run: `npm test`
Commit message: `feat: add canonical compendium media resolver`

---

### Task 5: Core compendium image manifests

**Files:**
- Create: `src/features/media/manifests/animals.ts`
- Create: `src/features/media/manifests/fish.ts`
- Create: `src/features/media/manifests/plants.ts`
- Create: `src/features/media/manifests/horses.ts`
- Create: `src/features/media/manifests/weapons.ts`
- Create: `src/features/media/manifests/equipment.ts`
- Modify: `src/features/media/manifests/compendium.ts`
- Test: `tests/unit/compendium-media-coverage.test.ts`

**Interfaces:**
- Each manifest exports `Record<string, ManifestMediaEntry>` keyed by canonical English name.
- `compendium.ts` merges category manifests without duplicate keys.

- [ ] **Step 1: Write coverage/audit tests**

For catalog fixtures and/or source-backed generated catalog data, assert every target entity resolves either entity-specific media or a deliberate category fallback. Assert no duplicate keys and valid orientation/fit values.

- [ ] **Step 2: Curate source-backed mappings**

For each target category use this source priority:

1. Existing bundled legacy compendium drawing if correctly linked.
2. Clean RDR2 compendium drawing/artwork from a reliable source.
3. Official Rockstar/in-game screenshot or item render.
4. Category fallback.

Record source URL and orientation in manifest data. Do not add runtime scraping.

- [ ] **Step 3: Verify representative category coverage**

Check at minimum American Alligator, one bird, one Guarma animal, one fish, one orchid/herb, Arabian/horse coat, one sidearm, one longarm, one equipment/talisman item.

- [ ] **Step 4: Run coverage + full unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `data: add compendium entity artwork manifests`

---

### Task 6: All 144 cigarette-card artworks

**Files:**
- Create: `src/features/media/manifests/cigarette-cards.ts`
- Modify: `src/features/media/manifests/compendium.ts`
- Test: `tests/unit/cigarette-card-media.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- `CIGARETTE_CARD_MEDIA: Record<string, ManifestMediaEntry>` with exactly one deterministic entry for every canonical `cigarette_card` entity.

- [ ] **Step 1: Write failing 144-card coverage test**

Using canonical cigarette-card entities from the catalog fixture/source, assert:

```ts
assert.equal(cards.length, 144);
assert.equal(cards.filter((card) => CIGARETTE_CARD_MEDIA[card.name]).length, 144);
assert.equal(new Set(Object.keys(CIGARETTE_CARD_MEDIA)).size, 144);
```

Also assert every orientation is `portrait` or `landscape` and every entry has a non-empty URL.

- [ ] **Step 2: Verify RED**

Run: `node --experimental-strip-types --test tests/unit/cigarette-card-media.test.ts`
Expected: FAIL because mapping is absent/incomplete.

- [ ] **Step 3: Build the deterministic GTABase mapping**

Use the user-provided GTABase cigarette-card collection reference. Match each canonical entity by set + number/name and record the exact artwork URL/orientation in the static manifest. No DOM-order assumptions and no fuzzy matching at runtime.

- [ ] **Step 4: Add cigarette-card-specific layout rules**

Use a contained media stage. Portrait cards get vertical breathing room; landscape cards use the available width. Never crop card borders.

- [ ] **Step 5: Run coverage and full unit suite**

Run: `npm test`
Expected: PASS with all 144 mappings.

- [ ] **Step 6: Commit**

Commit message: `data: map all cigarette card artworks`

---

### Task 7: End-to-end catalog and UI verification

**Files:**
- Modify only if verification finds a regression.
- Test existing full suite and CI.

**Interfaces:** None new.

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 2: Run catalog audit**

Run: `npm run audit:data`
Expected: PASS.

- [ ] **Step 3: Run Python tests**

Run: `npm run test:python`
Expected: PASS.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no new errors/warnings introduced by this feature.

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: successful Next production build.

- [ ] **Step 6: Review Vercel preview on desktop**

Check Historia, Animals, Plants, Fish, Horses, Weapons, Equipment and Cigarette Cards. Verify global numbering, readable typography, Spanish-first names, image aspect-ratio handling and no broken images.

- [ ] **Step 7: Review final diff**

Confirm no Supabase progress/schema changes, no unrelated refactors and no replacement of canonical entity names.

- [ ] **Step 8: Open PR and merge only after verification**

PR title: `Compendio: español, media y legibilidad`

