# OUTLAW100 - Next.js + Supabase migration design

Date: 2026-09-02
Status: approved in-chat design, written specification pending user review

## 1. Purpose

Migrate the existing OUTLAW100 standalone HTML into a maintainable, independent web application for completing Red Dead Redemption 2 from Chapter 1 (Colter) through Epilogue 2 (American Venom), preserving the existing experience while replacing the monolithic runtime/state model with a canonical relational data model and authenticated per-user progress.

The result must not be a Chapter 2 demo, a visual mockup, or a dashboard that discards the existing databases. The finished product must cover the complete route and all catalog categories supplied by the source files.

## 2. Source hierarchy and provenance

The migration uses four attached sources with explicit precedence.

### 2.1 Excel - catalog master

`RDR2 Completion(2).xlsx` is the authoritative source for catalog entities, category membership, per-entity completion criteria, crafting materials/quantities, and the distinction between material acquisition and crafting completion.

All 15 sheets are imported and audited:

1. Hunting
2. Outfits (Legendary)
3. Outfits (Normal)
4. Clothing
5. Saddles
6. Satchels
7. Camp
8. PROGRESS
9. Animals
10. Fish
11. Plants
12. Horses
13. Weapons
14. Equipment
15. Cigarette Cards

The importer preserves multi-step criteria. Example: animals can expose tracked, killed, skinned and studied independently. Materials are inventory facts; crafted items are separate completion facts.

### 2.2 PDF - route master

`RDR2 Complete Checklist (2).pdf` is the authoritative route/checklist source. All 51 pages are processed. It covers story chapters and epilogues plus stranger quests, companion activities, item requests, points of interest, bounty hunting, graves, treasures/maps, crafting/upgrades/hunting, pamphlets, compendium categories, challenges and related completion material.

The route editor converts the PDF into ordered milestones while preserving source page references and time-sensitive/missable annotations.

### 2.3 HTML - experience, media, translations and metadata

`outlaw100-rdr2-v0.31.5.1-es-cloud(2).html` is the authoritative migration reference for the existing product experience and for metadata not superseded by Excel/PDF. The HTML is about 1.75 MB and contains a full monolithic application with dashboard, mission view, story, strangers, missables, camp, map, animals, legendary animals, weapons, horses, equipment, gangs, nature, collectibles, challenges, crafting, archive, achievements, search, local persistence and legacy cloud synchronization.

The migration preserves useful Spanish translations, aliases, route hints, mission metadata, map links, coordinates, marker normalization, search behavior, media references, embedded images, secret chains, archive categories, map relationships and responsive visual language.

Existing progress state is not imported as catalog data. A voluntary legacy progress importer may be provided separately.

The HTML currently depends at runtime on public datasets/scripts including `randomstaircase/rdr2`, map markers and plant datasets. Static source datasets used as catalog inputs will be vendored into the repository/import pipeline so the application does not depend on those remote scripts at runtime. Map tile delivery can remain an external tile service/asset CDN because bundling the full world tile pyramid into the application is not practical.

### 2.4 Chinese Rocks

`chinese-rocks(2).otf` is bundled as a local application asset and loaded via `@font-face`. It is used for major identity headings and mission/milestone titles, not body copy.

## 3. Existing Supabase project

Reuse the already-connected Supabase project:

- name: `OUTLAW 100`
- project ref: `fxhytpkwekkedieuyncc`
- region: `eu-west-1`

The existing legacy `public.outlaw_progress` sync-secret system is preserved untouched during migration so the current HTML is not broken. New authenticated tables and RLS policies are added alongside it. Once the new application is accepted, the legacy table may be archived in a later migration.

No service-role credential is exposed to the browser.

## 4. Application architecture

### 4.1 Frontend

- Next.js App Router
- TypeScript strict mode
- React Server Components where suitable
- Client components only for interaction-heavy surfaces
- Supabase SSR/browser clients using publishable key
- Leaflet via npm for interactive map
- CSS modules/global token layer based on the existing OUTLAW100 palette and layout language
- desktop + mobile responsive layouts

Primary routes:

- `/` current milestone dashboard
- `/route` complete editorial route/timeline
- `/archive` canonical searchable catalog
- `/archive/[entityId]` canonical entity detail
- `/map` interactive map
- `/crafting` recipes/material readiness/crafted state
- `/challenges` challenge families and ranks
- `/profile` account, backup, import/export and completion stats
- `/login` authentication

The sidebar/mobile navigation maps to these canonical routes rather than keeping separate copies of the same entity data.

### 4.2 Domain layer

Application code is split into clear domains:

- `catalog`: entities, criteria, relations, metadata
- `route`: milestones, tasks, prerequisites, availability and next-action selection
- `progress`: per-user state, optimistic writes and status derivation
- `inventory`: material counts and readiness calculations
- `crafting`: recipes and requirements
- `map`: markers, nearby queries and entity linkage
- `media`: canonical images/assets
- `sources`: source provenance and audit records
- `auth`: account/session handling

UI components consume domain services/types instead of reading imported raw source shapes directly.

## 5. Canonical data model

Required public catalog tables:

### `entities`
Stable canonical record for anything addressable in the application.

Important fields:
- `id uuid`
- `stable_key text unique`
- `type text`
- `category text`
- `name_es text`
- `name_en text`
- `description_es text`
- `chapter_min text/null`
- `chapter_max text/null`
- `missable boolean`
- `metadata jsonb`

### `criteria`
One entity can expose multiple completion facts.

Fields include:
- `id uuid`
- `entity_id uuid`
- `stable_key text`
- `label_es text`
- `kind text`
- `required boolean`
- `sort_order int`
- `metadata jsonb`

Unique `(entity_id, stable_key)`.

### `relations`
Canonical links such as material-for, appears-in, unlocks, nearby-to, requires, part-of, reward-of and mission-related.

### `milestones`
Editorial route items. A milestone can be story, stranger, camp activity, item request, hunt, fishing expedition, compendium block, collectible route, challenge block, crafting session, exploration, preparation or chapter close.

Fields include:
- stable key
- chapter
- ordinal/editorial order
- milestone type
- title/summary
- reason-now
- availability text/structured metadata
- missable risk
- location
- map focus
- spoiler level

### `milestone_tasks`
Operational checks for a milestone. Every task must link to either an entity, a criterion, or be an explicit editorial task with a source reference.

### `milestone_dependencies`
Dependencies and ordering constraints used by the recommendation engine.

### `craft_recipes`
Craftable output entity and recipe metadata.

### `craft_requirements`
Required material entity, quantity and quality/state requirement. Inventory readiness never marks the output as crafted.

### `map_markers`
Marker coordinates/category plus canonical `entity_id` when linked. Unmatched real markers remain trackable without polluting another entity's completion.

### `media_assets`
Canonical local/remote media reference, entity/milestone linkage, source attribution metadata and preferred variant.

### `source_references`
File/source identifier, sheet/page/section/row details, original name and provenance. Every imported/editable route task gets a traceable source.

### `audit_records`
Importer/audit findings: duplicate candidates, orphan relations, missing criteria, unmatched markers, source conflicts and unresolved translations.

Authenticated per-user tables:

### `profiles`
One row per `auth.users` user.

### `progress`
User + criterion/task/entity progress facts.

Status enum/string set:
- `not_started`
- `available`
- `in_progress`
- `prepared`
- `completable`
- `completed`
- `blocked`
- `missed`

Completion facts are explicit. Derived availability/completable/readiness is calculated rather than destructively rewriting editorial order.

### `inventory`
Per-user item/material quantities and optional quality/state metadata.

All user-owned tables have RLS based on `auth.uid() = user_id`. Catalog tables are read-only to normal authenticated/anonymous clients.

## 6. Progress semantics

There is one canonical progress state.

Checking a criterion updates the single corresponding progress record. Dashboard, route, timeline, archive, compendium, crafting, map and percentages all derive from that record.

Users may complete content outside the recommended order. The editorial milestone order never changes. The "next action" selector skips already-completed or currently impossible milestones and promotes the next valid unfinished milestone according to dependency and availability rules.

Local resilience:
- optimistic UI
- queued/retryable Supabase writes
- local snapshot backup (IndexedDB/localStorage)
- reload recovery
- JSON export/import

Conflict rule for the first release: server `updated_at` last-write-wins per atomic progress/inventory record, never for the whole user state blob.

## 7. Route model and editorial hierarchy

All milestone types are visually and operationally equal. Story missions are not parent cards with secondary content hidden underneath.

A typical route sequence may be:

story -> camp request -> hunt -> stranger -> crafting -> compendium -> story -> collectibles -> challenge -> story

Milestone scheduling uses only source-supported facts plus clearly identified editorial inference derived from source metadata/relations. It considers:
- chapter/unlock window
- time sensitivity/missable risk
- geographic proximity
- material dependencies
- available tools/weapons when represented in the supplied sources
- existing completion state
- efficiency and pacing

Every milestone can expose:
- objective
- why now
- requirements
- availability
- missable risk
- operational checklist
- linked entities/criteria
- required materials/animals
- newly ready crafting outputs
- unlocked content
- gold objectives when supplied
- map focus and nearby satellites
- source references

## 8. Dashboard

The current milestone is the dashboard protagonist regardless of type.

Required layout/data:
- hero image
- Chinese Rocks headline
- milestone type + chapter + location
- "Ten en cuenta"
- gold medal panel when relevant
- in-mission objectives
- prior tasks
- missable warnings
- active requests
- nearby satellites
- contextual map
- bottom timeline
- global and chapter completion
- directly interactive checkboxes

The existing OUTLAW100 palette, paper/ink/red visual system, grain, compact metadata, chips and dense completionist information architecture are retained and refined rather than replaced with generic SaaS cards.

## 9. Archive / databases

The Archive is a unified canonical entity browser with category-specific facets rather than disconnected duplicated databases.

Minimum categories preserved/covered:
- story
- strangers
- camp
- item requests
- animals
- legendary animals
- fish
- plants
- horses/coats
- weapons
- equipment
- cigarette cards
- outfits
- satchels
- saddles
- camp upgrades
- challenges
- collectibles
- points of interest
- encounters
- secrets
- documents/unique items
- achievements/trophies

Cards use media where available. Detail drawers/pages expose category-specific criteria and metadata including location, chapter/window, recommended weapon/bait/time when present in sources, mission/crafting relations and map access.

## 10. Map

The map uses canonical markers and the same progress records as every other surface.

Features:
- category filters
- completed/pending filters
- marker detail using the canonical entity detail model
- criteria toggles from the marker detail
- nearby-to-current-milestone mode
- recommended route segments/groups
- deep links from missions/entities/collectibles
- no Red Dead Online-only content

Static marker/plant datasets currently loaded remotely by the HTML are vendored into the import source snapshot where licensing/source terms permit. Leaflet is installed as a package rather than CDN script. World tile images may continue to load from the existing tile CDN/source unless a suitable redistributable local tile package is available.

## 11. Import pipeline

Repository scripts are reproducible and idempotent:

- `scripts/import-excel.ts`
- `scripts/import-pdf.ts`
- `scripts/import-html.ts`
- `scripts/import-rdr2-data.ts`
- `scripts/build-catalog.ts`
- `scripts/audit-catalog.ts`
- `scripts/seed-supabase.ts`

Generated normalized data is committed as deterministic JSON/SQL seed artifacts so normal Vercel builds do not need to parse Excel/PDF.

Importer behavior:
- stable key generation with explicit override table
- source provenance on every record
- duplicate candidate report instead of silent destructive merging
- exact criteria retention
- deterministic ordering
- explicit unmatched items

## 12. Repository layout

```text
outlaw100/
  app/
  components/
  domains/
    auth/
    catalog/
    crafting/
    inventory/
    map/
    progress/
    route/
    sources/
  public/
    fonts/
    media/
    data/
  scripts/
  data/
    source-manifest/
    normalized/
    editorial/
  supabase/
    migrations/
    seed/
  tests/
  docs/
    superpowers/specs/
  .env.example
  README.md
```

Binary source files do not need to be published into GitHub when copyright/size/privacy makes that undesirable. Import manifests record their hashes and expected filenames; normalized output needed by the app is versioned.

## 13. Supabase migrations and security

Migrations are versioned in `supabase/migrations` and applied through the connected Supabase project.

Migration order:
1. enums/extensions/helpers
2. catalog tables
3. route/crafting/map/media/source tables
4. profile/progress/inventory tables
5. indexes
6. RLS enablement
7. read policies for catalog
8. owner policies for user tables
9. profile trigger/function if used
10. seed version metadata

The existing legacy `outlaw_progress` table remains untouched until explicit retirement.

Security verification includes:
- RLS enabled on every user-owned table
- anonymous user cannot read another user's progress
- authenticated user can only CRUD own progress/inventory/profile
- normal client cannot mutate catalog
- service-role never present in `NEXT_PUBLIC_*`
- Supabase security advisor checked after DDL changes

## 14. Authentication

Supabase Auth supports:
- email/password
- magic link

New users receive a profile. Auth redirects preserve intended route. The app shell requires authentication for private progress features, while catalog public-read availability can remain possible if desired by UI design.

## 15. Testing and verification

### Import/audit tests
- all 15 Excel sheets seen by importer
- all 51 PDF pages represented in source manifest
- chapters 1-6 and epilogues 1-2 represented
- American Venom present
- category parity report versus HTML navigation/data
- duplicate stable-key scan
- orphan relation scan
- unreachable criterion scan
- milestone task source-reference scan
- unmatched map marker report

### Unit tests
- progress status derivation
- craft readiness vs crafted state
- chapter availability
- next milestone selection
- percent calculations
- stable key generation/overrides

### Integration tests
- login/session restoration
- toggle criterion -> Supabase write -> reload -> restored state
- same criterion reflected in archive/dashboard/map
- inventory quantity affects readiness only
- JSON export/import

### E2E / responsive
- desktop
- mobile
- login -> dashboard -> check progress -> reload
- map marker -> entity -> criterion update
- route from early Chapter 1 to Epilogue content is navigable

Before final acceptance:
- lint passes
- typecheck passes
- tests pass
- production build passes
- Supabase advisors reviewed
- Vercel production URL verified

## 16. GitHub and Vercel

GitHub is the canonical source repository. Vercel is connected to its default production branch. Environment variables are configured in Vercel and documented in `.env.example`.

Expected public variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Any server-only secret used later is non-public and only added when needed.

The current GitHub connector has access to repositories but no OUTLAW100 repository currently exists in the connected installation. If repository creation cannot be performed by the connector, the only manual step requested from the user will be creating an empty GitHub repository in the web UI and sharing/authorizing it; no terminal workflow is required.

## 17. Migration strategy

Use a strangler-style migration around a new canonical data layer rather than a literal React translation or a clean-room rewrite.

Order:
1. source inventory and deterministic normalized exports
2. schema + RLS migrations
3. seed catalog
4. application shell/auth
5. route engine/dashboard
6. archive/entity detail
7. crafting/inventory
8. map
9. remaining category parity
10. legacy progress importer
11. audit/test/build
12. GitHub/Vercel production deployment

No incremental public demos are treated as the finished application. Intermediate work may exist locally/branch-wise, but the user-facing production handoff is a single complete release candidate.

## 18. Definition of done

OUTLAW100 is complete only when a user can:
- create an account
- start with a clean game state
- follow milestones from Colter through American Venom
- alternate naturally between story and completion content
- inspect every catalog record imported from all 15 Excel sheets
- mark exact criteria from any relevant view
- see the same state reflected everywhere
- recover progress on another device
- use the interactive map
- see preparation/missables/objectives before milestones
- manage material inventory separately from crafted completion
- finish the game without the route intentionally deferring a large unhandled secondary-content backlog to the end

