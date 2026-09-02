import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChapterGroups, chapterLabel } from '../../src/features/dashboard/navigation.ts';

const milestones = [
  { id: 'c1-1', chapter: 'chapter-1', order: 1, metadata: { editorialChapter: 'chapter-1' } },
  { id: 'c1-2', chapter: 'chapter-1', order: 2, metadata: { editorialChapter: 'chapter-1' } },
  { id: 'c2-1', chapter: 'chapter-2', order: 3, metadata: { editorialChapter: 'chapter-2' } },
  { id: 'c3-1', chapter: 'chapter-3', order: 4, metadata: { editorialChapter: 'chapter-3' } },
];

test('groups milestones into ordered editorial chapters and marks the current chapter', () => {
  const groups = buildChapterGroups(milestones, milestones[2]);
  assert.deepEqual(groups.map((group) => [group.key, group.milestones.length, group.current]), [
    ['chapter-1', 2, false],
    ['chapter-2', 1, true],
    ['chapter-3', 1, false],
  ]);
});

test('gives canonical Spanish display names to the campaign chapters', () => {
  assert.equal(chapterLabel('chapter-1'), 'C1 · COLTER');
  assert.equal(chapterLabel('chapter-2'), 'C2 · MIRADOR DE LA HERRADURA');
  assert.equal(chapterLabel('chapter-4'), 'C4 · SAINT DENIS');
  assert.equal(chapterLabel('epilogue-2'), 'E2 · BEECHER’S HOPE');
});
