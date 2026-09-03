import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardModel } from '../../src/features/dashboard/model.ts';
import type { CanonicalCatalog } from '../../src/lib/catalog/types.ts';
import type { ProgressSnapshot } from '../../src/features/progress/types.ts';

const catalog: CanonicalCatalog = {
  version: 1,
  entities: [],
  criteria: [],
  relations: [],
  recipes: [],
  archiveEntries: [],
  mapMarkers: [],
  mediaAssets: [],
  milestones: [
    { id: 'c2-01', kind: 'story', chapter: 'chapter-2', title: 'Polite Society, Valentine Style', order: 10, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
    { id: 'c2-02', kind: 'story', chapter: 'chapter-2', title: 'Americans at Rest', order: 20, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
    { id: 'c3-01', kind: 'story', chapter: 'chapter-3', title: 'The New South', order: 30, sourcePage: 2, sourceReference: 'PDF p.2', missableRisk: false },
  ],
  milestoneTasks: [],
};

const progress: ProgressSnapshot = { version: 1, criteria: {}, tasks: {}, inventory: {} };

test('dashboard assigns a stable official Rockstar hero and rotates it between adjacent milestones', () => {
  const first = buildDashboardModel(catalog, catalog.milestones[0], progress) as ReturnType<typeof buildDashboardModel> & { curatedHeroImageUrl?: string };
  const firstAgain = buildDashboardModel(catalog, catalog.milestones[0], progress) as ReturnType<typeof buildDashboardModel> & { curatedHeroImageUrl?: string };
  const second = buildDashboardModel(catalog, catalog.milestones[1], progress) as ReturnType<typeof buildDashboardModel> & { curatedHeroImageUrl?: string };

  assert.equal(typeof first.curatedHeroImageUrl, 'string');
  assert.match(first.curatedHeroImageUrl ?? '', /^https:\/\/media\.rockstargames\.com\/rockstargames-newsite\/uploads\/[a-f0-9]+\.jpg$/);
  assert.equal(first.curatedHeroImageUrl, firstAgain.curatedHeroImageUrl);
  assert.notEqual(first.curatedHeroImageUrl, second.curatedHeroImageUrl);
});

test('dashboard uses chapter-specific curated pools rather than one global repeated image', () => {
  const chapter2 = buildDashboardModel(catalog, catalog.milestones[0], progress) as ReturnType<typeof buildDashboardModel> & { curatedHeroImageUrl?: string };
  const chapter3 = buildDashboardModel(catalog, catalog.milestones[2], progress) as ReturnType<typeof buildDashboardModel> & { curatedHeroImageUrl?: string };

  assert.notEqual(chapter2.curatedHeroImageUrl, chapter3.curatedHeroImageUrl);
});
