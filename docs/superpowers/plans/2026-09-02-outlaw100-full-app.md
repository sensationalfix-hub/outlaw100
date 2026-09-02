# OUTLAW100 Full App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete OUTLAW100 Next.js companion app, migrating the supplied HTML experience and all source data into a canonical Supabase-backed product from Colter through American Venom.

**Architecture:** A Next.js App Router frontend consumes a canonical catalog generated reproducibly from the supplied XLSX, PDF and HTML. Supabase stores shared read-only catalog tables plus per-user progress/inventory under RLS. The original monolithic HTML remains a migration source only; useful media, translations, coordinates, relationships and UX patterns are extracted into structured assets/components.

**Tech Stack:** Next.js 15+, TypeScript, React 19, Supabase JS/SSR, Postgres/RLS, Leaflet, Zod, Vitest, Testing Library, Playwright, xlsx parser scripts, pdf text extraction, Cheerio, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-02-outlaw100-next-supabase-design.md`

## Global Constraints

- Frontend: Next.js with TypeScript.
- Hosting: Vercel.
- Database: Supabase Postgres.
- Authentication: Supabase Auth.
- Persist progress per user; catalog is shared.
- Preserve the supplied HTML's visual language, translations, images, maps, coordinates, metadata and navigation where useful.
- Audit all 15 XLSX sheets and all 51 PDF pages.
- Route must cover Chapter 1 through Epilogue 2 and American Venom.
- Criteria remain granular; materials owned never imply crafted item completion.
- Chinese Rocks is loaded locally with `@font-face` and used for identity/headline typography.
- RLS must prevent one user from reading or modifying another user's progress/inventory.
- Never expose a Supabase service-role key in frontend code.
- Include `.env.example`, versioned SQL migrations, reproducible import scripts and audit scripts.
- Run tests, lint and production build before deployment.

---

### Task 1: Repository scaffold, source manifests and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `scripts/source-manifest.ts`, `src/lib/source-files.ts`
- Create: `tests/unit/source-files.test.ts`
- Copy source inputs to: `data/source/`

**Interfaces:**
- Produces `SOURCE_FILES` and `assertSourceFiles()` used by all import scripts.

- [ ] Write a failing unit test asserting exactly 15 expected workbook sheet names and the four source input paths.
- [ ] Run `npm test -- tests/unit/source-files.test.ts` and verify failure before implementation.
- [ ] Implement `SOURCE_FILES` and `assertSourceFiles()` with explicit paths and expected sheet names.
- [ ] Scaffold Next.js/Vitest/Playwright and copy the supplied HTML/XLSX/PDF/font into `data/source/`.
- [ ] Run unit test, lint and `next build`.
- [ ] Commit `chore: scaffold outlaw100 app and source manifest`.

### Task 2: XLSX canonical extractor

**Files:**
- Create: `scripts/importers/xlsx.ts`, `scripts/importers/types.ts`, `scripts/importers/ids.ts`
- Create: `tests/unit/xlsx-importer.test.ts`
- Create generated output: `data/generated/xlsx-catalog.json`

**Interfaces:**
- Produces `ImportedEntity[]`, `ImportedCriterion[]`, `ImportedRelation[]`, `ImportedRecipe[]`.
- Stable IDs use `stableId(namespace, rawName, discriminator?)`.

- [ ] Write failing tests for workbook sheet coverage, animal criteria (`tracked`, `killed`, `skinned`, `studied`) and recipe/material separation.
- [ ] Run the test and verify failure.
- [ ] Implement workbook parsing with explicit per-sheet adapters for Hunting, Outfits (Legendary), Outfits (Normal), Clothing, Saddles, Satchels, Camp, PROGRESS, Animals, Fish, Plants, Horses, Weapons, Equipment and Cigarette Cards.
- [ ] Generate stable IDs and source references containing workbook sheet/cell context.
- [ ] Serialize canonical XLSX JSON.
- [ ] Run tests and an importer audit proving all 15 sheets were visited.
- [ ] Commit `feat: import complete rdr2 excel catalog`.

### Task 3: PDF route extractor and editorial route model

**Files:**
- Create: `scripts/importers/pdf.ts`, `scripts/importers/pdf-sections.ts`
- Create: `tests/unit/pdf-importer.test.ts`
- Create generated output: `data/generated/pdf-route.json`

**Interfaces:**
- Produces `ImportedMilestone[]` with `chapter`, `kind`, `title`, `availability`, `missableRisk`, `requirements`, `sourcePage`.

- [ ] Write failing tests requiring Chapter 1, Chapter 6, Epilogue 1, Epilogue 2 and `American Venom`, plus companion activities and item requests.
- [ ] Run tests and verify failure.
- [ ] Extract all 51 pages to text while preserving page numbers.
- [ ] Parse known PDF sections into milestones/tasks: main story, strangers, companion activities, item requests, POI, bounties, graves, treasures, crafting/upgrades/hunting, pamphlets, robberies, legendary content, compendium lists, challenges and checklist sections.
- [ ] Convert time-sensitive markers and explicit chapter windows into structured availability/risk fields.
- [ ] Run tests and assert pages 1-51 were consumed.
- [ ] Commit `feat: import full completion route from pdf`.

### Task 4: HTML migration extractor

**Files:**
- Create: `scripts/importers/html.ts`, `scripts/importers/html-assets.ts`
- Create: `tests/unit/html-importer.test.ts`
- Create generated output: `data/generated/html-metadata.json`
- Create: `public/media/` and `public/fonts/chinese-rocks.otf`

**Interfaces:**
- Produces translations, archive entries, map markers, coordinates, aliases, media assets and legacy relations without importing legacy progress.

- [ ] Write failing tests that detect map coordinates, Spanish translations, archive categories and reject `outlaw_progress`/legacy state as catalog data.
- [ ] Run tests and verify failure.
- [ ] Parse the HTML with Cheerio plus targeted JavaScript-source extraction for embedded datasets/constants.
- [ ] Extract images/data URIs/assets into stable files under `public/media/` when legally supplied in the source.
- [ ] Copy the supplied OTF to `public/fonts/chinese-rocks.otf`.
- [ ] Generate HTML metadata JSON and tests for map/entity links.
- [ ] Commit `feat: extract html metadata media and map data`.

### Task 5: Canonical merge and audit engine

**Files:**
- Create: `scripts/build-catalog.ts`, `scripts/audit-catalog.ts`, `src/lib/catalog/schema.ts`, `src/lib/catalog/status.ts`
- Create: `tests/unit/catalog-audit.test.ts`
- Generate: `data/generated/catalog.json`, `data/generated/audit-report.json`

**Interfaces:**
- `buildCatalog()` merges XLSX master entities/criteria, PDF route/editorial data and HTML metadata/media.
- `auditCatalog()` returns duplicate IDs, orphan relations, inaccessible criteria, tasks without source, route coverage and source coverage.

- [ ] Write failing tests for stable dedupe, no orphan criteria, full chapter coverage and materials-vs-crafted state.
- [ ] Run tests and verify failure.
- [ ] Implement canonical merge rules using XLSX > PDF > HTML precedence for conflicting catalog fields, while retaining source references from every origin.
- [ ] Implement audit report with hard errors for orphaned criteria/tasks and missing source references.
- [ ] Generate catalog and audit output; require zero hard errors.
- [ ] Commit `feat: build canonical rdr2 catalog with audits`.

### Task 6: Supabase schema, RLS and seed

**Files:**
- Create: `supabase/migrations/202609020001_outlaw100_core.sql`
- Create: `supabase/migrations/202609020002_outlaw100_rls.sql`
- Create: `supabase/seed.sql`, `scripts/generate-seed.ts`
- Create: `tests/sql/rls.sql`

**Interfaces:**
- Tables: `profiles`, `entities`, `criteria`, `relations`, `milestones`, `milestone_tasks`, `progress`, `inventory`, `source_references`, `map_markers`, `media_assets`, `audit_records`, `craft_recipes`, `craft_requirements`.

- [ ] Write SQL assertions for required tables and RLS policies.
- [ ] Author core migration with stable text IDs/UUID user IDs, FKs, indexes and status checks.
- [ ] Author RLS: shared catalog readable by authenticated users; progress/inventory/profile rows restricted to `auth.uid()`.
- [ ] Generate deterministic seed SQL from `catalog.json`.
- [ ] Apply migrations to the existing `OUTLAW 100` Supabase project without deleting `outlaw_progress`.
- [ ] Run SQL RLS checks and Supabase security advisors.
- [ ] Commit `feat: add supabase canonical schema rls and seed`.

### Task 7: Auth, data clients and canonical progress store

**Files:**
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`
- Create: `src/features/auth/*`, `src/features/progress/store.ts`, `src/features/progress/repository.ts`, `src/features/progress/local-backup.ts`
- Create: `tests/unit/progress-store.test.ts`, `tests/e2e/auth-progress.spec.ts`

**Interfaces:**
- `setCriterionStatus(criterionId, status)` and `setInventoryQuantity(entityId, quantity)` update optimistic local state then Supabase.
- JSON export/import uses versioned payload `{version,userProgress,inventory}`.

- [ ] Write failing store tests for optimistic update, rollback and local JSON backup.
- [ ] Implement Supabase browser/server clients and session-aware auth forms.
- [ ] Implement canonical store/repository with upserts keyed by user and criterion/task/entity IDs.
- [ ] Implement export/import JSON and reload recovery.
- [ ] Run unit tests and auth/progress Playwright flow against configured Supabase.
- [ ] Commit `feat: add auth and synchronized user progress`.

### Task 8: OUTLAW100 application shell and dashboard

**Files:**
- Create: `src/components/app-shell/*`, `src/features/dashboard/*`, `src/features/route/*`
- Modify: `src/app/globals.css`, `src/app/page.tsx`
- Create: `tests/unit/route-engine.test.ts`, `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- `getRecommendedMilestone(catalog, progress)` preserves editorial order but skips already completed/out-of-order work.

- [ ] Write failing route-engine tests for skip-completed, missable priority and editorial-order preservation.
- [ ] Implement route engine and milestone view model.
- [ ] Implement the preserved black/bone/red visual shell, Chinese Rocks headlines, responsive sidebar/bottom nav and dashboard hero.
- [ ] Add directly toggleable checks, “Ten en cuenta”, gold objectives, prerequisites, missables, requests, nearby satellites and bottom timeline.
- [ ] Run component/e2e tests at desktop and mobile viewport.
- [ ] Commit `feat: build completionist dashboard and route engine`.

### Task 9: Archive, compendium, crafting and exhaustive databases

**Files:**
- Create: `src/features/archive/*`, `src/features/compendium/*`, `src/features/crafting/*`, `src/features/search/*`
- Create: `tests/e2e/archive.spec.ts`, `tests/unit/crafting.test.ts`

**Interfaces:**
- Every card/detail view resolves the same canonical `entity.id`; criteria updates flow through the progress store.

- [ ] Write failing tests for animal multi-criteria, craft readiness vs crafted state, filters and search aliases.
- [ ] Implement grid/detail panels for all required categories with images, metadata, location, chapter, conditions, weapons/bait/time and relations.
- [ ] Implement crafting material availability independently from crafted criterion.
- [ ] Implement global accent-insensitive Spanish/internal-name search.
- [ ] Run unit/e2e tests.
- [ ] Commit `feat: migrate archive compendium and crafting views`.

### Task 10: Interactive map and cross-navigation

**Files:**
- Create: `src/features/map/*`, `src/lib/geo/nearby.ts`
- Create: `tests/unit/nearby.test.ts`, `tests/e2e/map.spec.ts`

**Interfaces:**
- `nearbyEntities(marker, radiusKm, catalog)` returns canonical entities without duplicating progress.

- [ ] Write failing tests for proximity ordering and canonical progress resolution.
- [ ] Implement Leaflet map with real supplied coordinates, category/status filters, current milestone overlays and recommended route markers.
- [ ] Link map popovers to canonical detail views and allow checks where criteria apply.
- [ ] Exclude Red Dead Online data.
- [ ] Run unit/e2e tests.
- [ ] Commit `feat: migrate canonical completion map`.

### Task 11: Full-route editorial enrichment and completeness verification

**Files:**
- Create: `data/editorial/milestone-overrides.json`, `scripts/verify-route.ts`
- Modify generated seed inputs as needed.
- Create: `tests/unit/full-route.test.ts`

**Interfaces:**
- Editorial overrides can interleave equivalent-priority milestone kinds while preserving source references and canonical IDs.

- [ ] Write failing test requiring every chapter/epilogue to contain story plus relevant completionist milestone kinds where supported by sources.
- [ ] Add deterministic editorial interleaving based on unlock, missability, geography, prerequisites, available gear/materials and rhythm.
- [ ] Add “why now”, prerequisites, availability, risks, operational checklist and unlocked-content fields where source material supports them; inference fields must be explicitly marked editorial/inferred.
- [ ] Verify route from Outlaws from the West to American Venom with no inaccessible milestone tasks.
- [ ] Commit `feat: complete colter to american venom editorial route`.

### Task 12: Production verification, GitHub and Vercel

**Files:**
- Modify: `README.md`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- CI runs importer audit, unit tests, lint and build.

- [ ] Add README setup instructions for Supabase, Vercel, source reimport and development without ChatGPT Sites.
- [ ] Run `npm test`, `npm run audit:data`, `npm run lint`, `npm run build` and Playwright smoke tests.
- [ ] Re-run Supabase RLS checks/security advisors.
- [ ] Push the complete branch to GitHub and merge after verification.
- [ ] Connect the GitHub repo to Vercel, configure `NEXT_PUBLIC_SUPABASE_URL` and publishable key, deploy production.
- [ ] Verify login -> mark progress -> reload -> recover progress on deployed URL at desktop/mobile widths.
- [ ] Commit `chore: verify and document production deployment`.
