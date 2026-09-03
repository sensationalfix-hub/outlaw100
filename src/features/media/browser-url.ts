const PROXIED_MEDIA_HOSTS = new Set([
  'media.rockstargames.com',
  'www.gtabase.com',
  'gtabase.com',
  'raw.githubusercontent.com',
  'img.atwiki.jp',
  'www.schwobygames.com',
  'schwobygames.com',
  'www.rdr2.org',
  'rdr2.org',
  'i.ytimg.com',
  'mods.club',
  'www.mods.club',
]);

export function isAllowedMediaSource(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && PROXIED_MEDIA_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function mediaUrlForBrowser(value: string | null | undefined): string {
  if (!value) return '';
  if (value.startsWith('/')) return value;
  if (!isAllowedMediaSource(value)) return value;
  return `/api/media?url=${encodeURIComponent(value)}`;
}
