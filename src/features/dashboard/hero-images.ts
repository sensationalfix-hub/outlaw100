const ROCKSTAR_MEDIA_ROOT = 'https://media-rockstargames-com.akamaized.net/rockstargames-newsite/uploads';

// Official Red Dead Redemption 2 screenshots published by Rockstar Games.
// Keep the URLs explicit and deterministic: the dashboard should feel authored,
// not like a random wallpaper carousel, and must not depend on third-party hotlinks.
const ROCKSTAR_RDR2 = {
  forestRide: `${ROCKSTAR_MEDIA_ROOT}/d00445b4a48b2c0a2aa8beb8d6e0c9ff74e01ec6.jpg`,
  frontier: `${ROCKSTAR_MEDIA_ROOT}/fb251063185633d076705addacb36d6bbf9e8d7e.jpg`,
  camp: `${ROCKSTAR_MEDIA_ROOT}/4cea5d512cd936e570ce17261a4b697b959b26a2.jpg`,
  riders: `${ROCKSTAR_MEDIA_ROOT}/d0d67b9e853c2cebe6eb01a89cb524274fc949bc.jpg`,
  heartlands: `${ROCKSTAR_MEDIA_ROOT}/ead1fdd384d1dc96107ef78f9397637efd3e9d4f.jpg`,
  town: `${ROCKSTAR_MEDIA_ROOT}/c6a4b95cdb837c0dcace6e17f986be52b8c9e968.jpg`,
  plains: `${ROCKSTAR_MEDIA_ROOT}/f57f491f8dd4c91ba4a5266e4f55896ea750cf11.jpg`,
  arthurRide: `${ROCKSTAR_MEDIA_ROOT}/5b5313332394d20cd7c3c91987529d9dd15a242e.jpg`,
  openCountry: `${ROCKSTAR_MEDIA_ROOT}/bb98bc168c6a89180a326def291efeff23f6bb51.jpg`,
} as const;

export const DASHBOARD_HERO_POOLS: Record<string, readonly string[]> = {
  'chapter-1': [ROCKSTAR_RDR2.forestRide, ROCKSTAR_RDR2.riders],
  'chapter-2': [ROCKSTAR_RDR2.heartlands, ROCKSTAR_RDR2.town],
  'chapter-3': [ROCKSTAR_RDR2.camp, ROCKSTAR_RDR2.frontier],
  'chapter-4': [ROCKSTAR_RDR2.town, ROCKSTAR_RDR2.arthurRide],
  'chapter-5': [ROCKSTAR_RDR2.plains, ROCKSTAR_RDR2.openCountry],
  'chapter-6': [ROCKSTAR_RDR2.arthurRide, ROCKSTAR_RDR2.forestRide],
  'epilogue-1': [ROCKSTAR_RDR2.openCountry, ROCKSTAR_RDR2.heartlands],
  'epilogue-2': [ROCKSTAR_RDR2.frontier, ROCKSTAR_RDR2.plains],
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
