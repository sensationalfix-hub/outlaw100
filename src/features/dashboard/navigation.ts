export type DashboardMilestoneLike = {
  id: string;
  chapter: string;
  order: number;
  metadata?: Record<string, unknown>;
};

export type ChapterGroup<T extends DashboardMilestoneLike = DashboardMilestoneLike> = {
  key: string;
  label: string;
  milestones: T[];
  current: boolean;
};

const LABELS: Record<string, string> = {
  'chapter-1': 'C1 · COLTER',
  'chapter-2': 'C2 · MIRADOR DE LA HERRADURA',
  'chapter-3': 'C3 · CLEMENS POINT',
  'chapter-4': 'C4 · SAINT DENIS',
  'chapter-5': 'C5 · GUARMA',
  'chapter-6': 'C6 · BEAVER HOLLOW',
  'epilogue-1': 'E1 · PRONGHORN RANCH',
  'epilogue-2': 'E2 · BEECHER’S HOPE',
};

export function chapterKey(milestone: DashboardMilestoneLike): string {
  return String(milestone.metadata?.editorialChapter ?? milestone.chapter);
}

export function chapterLabel(key: string): string {
  return LABELS[key.toLowerCase()] ?? key.replaceAll('-', ' ').toUpperCase();
}

export function buildChapterGroups<T extends DashboardMilestoneLike>(
  milestones: T[],
  current: DashboardMilestoneLike,
): ChapterGroup<T>[] {
  const currentKey = chapterKey(current);
  const ordered = [...milestones].sort((a, b) => a.order - b.order);
  const map = new Map<string, T[]>();
  for (const milestone of ordered) {
    const key = chapterKey(milestone);
    const bucket = map.get(key) ?? [];
    bucket.push(milestone);
    map.set(key, bucket);
  }
  return [...map.entries()].map(([key, rows]) => ({
    key,
    label: chapterLabel(key),
    milestones: rows,
    current: key === currentKey,
  }));
}
