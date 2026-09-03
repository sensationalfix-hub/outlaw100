const PSU_BASE = 'https://www.psu.com/wp/wp-content/uploads/2020/09';

// Clean 1920×1080 RDR2 wallpapers/screens sourced from PlayStation Universe's
// Red Dead Redemption 2 wallpaper collection. Keep this list explicit so a
// milestone always resolves to the same visual instead of changing at random.
export const DASHBOARD_HERO_POOLS: Record<string, readonly string[]> = {
  'chapter-1': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-05.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-01.jpg`,
  ],
  'chapter-2': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-08.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-22.jpg`,
  ],
  'chapter-3': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-38.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-21.jpg`,
  ],
  'chapter-4': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-16.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-33.jpg`,
  ],
  'chapter-5': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-12.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-02.jpg`,
  ],
  'chapter-6': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-15.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-03.jpg`,
  ],
  'epilogue-1': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-04.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-06.jpg`,
  ],
  'epilogue-2': [
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-07.jpg`,
    `${PSU_BASE}/Red-Dead-Redemption-2-PS4-Wallpaper-09.jpg`,
  ],
};

const DEFAULT_POOL = DASHBOARD_HERO_POOLS['chapter-2'];

export function getCuratedDashboardHero(chapter: string, chapterIndex: number): string {
  const pool = DASHBOARD_HERO_POOLS[chapter] ?? DEFAULT_POOL;
  const safeIndex = Number.isFinite(chapterIndex) && chapterIndex >= 0 ? Math.floor(chapterIndex) : 0;
  return pool[safeIndex % pool.length] ?? DEFAULT_POOL[0];
}

export function getNextCuratedDashboardHero(chapter: string, chapterIndex: number): string {
  return getCuratedDashboardHero(chapter, chapterIndex + 1);
}
