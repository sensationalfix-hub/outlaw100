import { isAllowedMediaSource } from '@/features/media/browser-url';

const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';
const MAX_REDIRECTS = 3;

async function fetchAllowedImage(source: string): Promise<Response> {
  let current = source;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!isAllowedMediaSource(current)) {
      return new Response('Media source not allowed', { status: 400 });
    }

    const upstream = await fetch(current, {
      redirect: 'manual',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'OUTLAW100/1.0 media proxy',
      },
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (!location) return new Response('Invalid media redirect', { status: 502 });
      current = new URL(location, current).toString();
      continue;
    }

    if (!upstream.ok) {
      return new Response('Upstream media failed', { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return new Response('Upstream is not an image', { status: 415 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return new Response('Too many media redirects', { status: 508 });
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('url');
  if (!source) return new Response('Missing media URL', { status: 400 });

  try {
    return await fetchAllowedImage(source);
  } catch {
    return new Response('Media proxy failed', { status: 502 });
  }
}
