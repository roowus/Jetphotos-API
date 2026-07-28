/**
 * JetPhotos Unofficial API (free self-hosted via Wrangler/workerd)
 *
 * FREE runtime:
 *   npm start
 *   -> npx wrangler dev  (uses your machine/VPS network + workerd fetch)
 *
 * This works on many residential IPs. Plain Node fetch()/curl often get Cloudflare 403
 * even on the same network because of TLS fingerprint differences.
 *
 * Deploying to Cloudflare's edge (workers.dev) is optional and often blocked by JetPhotos.
 */

const DEFAULT_CACHE_TTL_SECONDS = 21600;
const JETPHOTOS_BASE_URL = 'https://www.jetphotos.com/showphotos.php';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-Cache, X-Mode',
};

export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env || {}, ctx || null);
    if (request.method === 'HEAD') {
      return new Response(null, { status: response.status, headers: response.headers });
    }
    return response;
  },
};

async function handleRequest(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed. Use GET.' }, 405);
  }

  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return json({
      ok: true,
      free: true,
      mode: 'workerd-direct',
      message:
        'Free JetPhotos API. Run with npm start (wrangler dev) on a home PC or VPS. Edge deploy to workers.dev is often blocked by JetPhotos.',
    });
  }

  if (url.pathname !== '/' && url.pathname !== '/search') {
    return json(
      {
        error: 'Not found',
        endpoints: ['/health', '/', '/search'],
      },
      404
    );
  }

  const jetPhotosUrl = buildJetPhotosUrl(url.searchParams);
  const cacheTtl = parsePositiveInt(env.CACHE_TTL_SECONDS, DEFAULT_CACHE_TTL_SECONDS);
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/__cache?${jetPhotosUrl}`, request);

  const cached = await cache.match(cacheKey);
  if (cached) {
    try {
      const data = await cached.json();
      if (data && typeof data === 'object') {
        data.meta = { ...(data.meta || {}), cached: true, free: true };
      }
      return json(data, cached.status || 200, {
        'X-Cache': 'HIT',
        'X-Mode': 'workerd-direct',
        'Cache-Control': cached.headers.get('Cache-Control') || `public, max-age=${cacheTtl}`,
      });
    } catch {
      const headers = new Headers(cached.headers);
      headers.set('X-Cache', 'HIT');
      headers.set('X-Mode', 'workerd-direct');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(cached.body, { status: cached.status, headers });
    }
  }

  try {
    const fetched = await fetchJetPhotosHtml(jetPhotosUrl);
    if (!fetched.ok) {
      return json(
        {
          error: `Failed to fetch source data: ${fetched.status} ${fetched.statusText}`,
          free: true,
          mode: 'workerd-direct',
          targetUrl: jetPhotosUrl,
          blocked: looksLikeCloudflareBlock(fetched.html),
          hint: fetched.status === 403
            ? 'Cloudflare blocked this host IP. Try a residential network, another VPS IP/region, or run locally at home.'
            : null,
          details: truncate(fetched.html, 300),
        },
        fetched.status >= 400 ? fetched.status : 502,
        { 'X-Cache': 'MISS', 'X-Mode': 'workerd-direct' }
      );
    }

    if (looksLikeCloudflareBlock(fetched.html)) {
      return json(
        {
          error: 'Upstream returned a Cloudflare/anti-bot page instead of photo results',
          free: true,
          mode: 'workerd-direct',
          targetUrl: jetPhotosUrl,
          blocked: true,
          hint: 'This IP appears blocked. Run on a home network or a different VPS IP.',
        },
        502,
        { 'X-Cache': 'MISS', 'X-Mode': 'workerd-direct' }
      );
    }

    const photos = await parsePhotosFromHtml(fetched.html);
    const body = {
      photos,
      count: photos.length,
      meta: {
        free: true,
        mode: 'workerd-direct',
        provider: 'local-workerd',
        cached: false,
        cacheTtlSeconds: cacheTtl,
        targetUrl: jetPhotosUrl,
      },
    };

    const response = json(body, 200, {
      'X-Cache': 'MISS',
      'X-Mode': 'workerd-direct',
      'Cache-Control': `public, max-age=${photos.length ? cacheTtl : Math.min(cacheTtl, 300)}`,
    });

    if (ctx && typeof ctx.waitUntil === 'function') {
      const ttl = photos.length ? cacheTtl : Math.min(cacheTtl, 300);
      ctx.waitUntil(
        cache.put(
          cacheKey,
          new Response(JSON.stringify(body), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': `public, max-age=${ttl}`,
            },
          })
        )
      );
    }

    return response;
  } catch (error) {
    return json(
      {
        error: 'Internal API Proxy Error',
        details: error instanceof Error ? error.message : String(error),
        free: true,
      },
      500
    );
  }
}

function buildJetPhotosUrl(params) {
  const jetPhotosParams = new URLSearchParams();
  jetPhotosParams.set('page', params.get('page') || '1');
  jetPhotosParams.set('sort-order', params.get('sort-order') || '0');
  jetPhotosParams.set('keywords-contain', params.get('keywords-contain') || '3');
  jetPhotosParams.set('keywords-type', params.get('keywords-type') || 'all');
  jetPhotosParams.set('keywords', params.get('keywords') || '');
  jetPhotosParams.set('aircraft', params.get('aircraft') || 'all');
  jetPhotosParams.set('airline', params.get('airline') || 'all');
  jetPhotosParams.set('country-location', params.get('country') || 'all');
  jetPhotosParams.set('photo-year', params.get('year') || 'all');
  jetPhotosParams.set('photographer-group', params.get('photographer') || 'all');
  jetPhotosParams.set('category', params.get('category') || 'all');
  jetPhotosParams.set('width', params.get('width') || '');
  jetPhotosParams.set('height', params.get('height') || '');
  jetPhotosParams.set('genre', 'all');
  jetPhotosParams.set('search-type', 'Advanced');
  return `${JETPHOTOS_BASE_URL}?${jetPhotosParams.toString()}`;
}

async function fetchJetPhotosHtml(jetPhotosUrl) {
  const response = await fetch(jetPhotosUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.jetphotos.com/',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    redirect: 'follow',
  });
  const html = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    html,
  };
}

function looksLikeCloudflareBlock(html) {
  const sample = String(html || '').slice(0, 8000).toLowerCase();
  return (
    sample.includes('sorry, you have been blocked') ||
    sample.includes('cf-browser-verification') ||
    sample.includes('just a moment...') ||
    sample.includes('attention required! | cloudflare') ||
    sample.includes('cdn-cgi/challenge-platform')
  );
}

async function parsePhotosFromHtml(html) {
  const photos = [];
  const handler = new PhotoStreamHandler(photos);

  await new HTMLRewriter()
    .on('div[data-photo]', { element: handler.divElement.bind(handler) })
    .on('img.result__photo', { element: handler.imgElement.bind(handler) })
    .on('a.result__photoLink', { element: handler.photoLinkElement.bind(handler) })
    .on('.result__infoListText', {
      element: handler.infoListItemElement.bind(handler),
      text: handler.infoListTextAccumulator.bind(handler),
    })
    .on('.result__infoListText a', {
      element: handler.linkInInfoTextElement.bind(handler),
      text: handler.linkTextInInfoTextAccumulator.bind(handler),
    })
    .on('.result__stat', {
      element: handler.statElement.bind(handler),
      text: handler.statTextAccumulator.bind(handler),
    })
    .transform(new Response(html))
    .text();

  return photos;
}

class PhotoStreamHandler {
  constructor(photosArray) {
    this.photos = photosArray;
    this.currentPhoto = null;
    this.currentStatText = '';
    this.isInsideInfoListItem = false;
    this.currentInfoListText = '';
    this.currentLinkHref = '';
    this.currentLinkText = '';
  }

  divElement(element) {
    if (!element.hasAttribute('data-photo')) return;

    this.currentPhoto = {
      photoId: element.getAttribute('data-photo'),
      thumbnailUrl: 'N/A',
      imageUrl: 'N/A',
      photoPageUrl: 'N/A',
      registration: 'N/A',
      registrationUrl: 'N/A',
      aircraftType: 'N/A',
      airline: 'N/A',
      airlineUrl: 'N/A',
      photographer: 'N/A',
      photographerUrl: 'N/A',
      location: 'N/A',
      locationUrl: 'N/A',
      photoDate: 'N/A',
      uploadedDate: 'N/A',
      likes: '0',
      comments: '0',
      views: '0',
    };

    element.onEndTag(() => {
      if (!this.currentPhoto) return;
      this.currentPhoto.aircraftType =
        this.currentPhoto.aircraftType.replace(/[\\/:*?"<>|]/g, '').trim() || 'Unknown';
      this.photos.push(this.currentPhoto);
      this.currentPhoto = null;
    });
  }

  imgElement(element) {
    if (!this.currentPhoto) return;
    const src = element.getAttribute('src');
    if (src) {
      this.currentPhoto.thumbnailUrl = src.startsWith('//') ? `https:${src}` : src;
      this.currentPhoto.imageUrl = this.currentPhoto.thumbnailUrl.replace('/400/', '/full/');
    }
    const altText = element.getAttribute('alt');
    if (altText) {
      const parts = altText.split('-').map((p) => p.trim());
      if (parts.length >= 3) {
        this.currentPhoto.registration = parts[0];
        this.currentPhoto.aircraftType = parts[1];
        this.currentPhoto.airline = parts[2];
      }
    }
  }

  photoLinkElement(element) {
    if (!this.currentPhoto) return;
    const href = element.getAttribute('href');
    if (href) this.currentPhoto.photoPageUrl = `https://www.jetphotos.com${href}`;
  }

  infoListItemElement(element) {
    if (!this.currentPhoto) return;
    this.isInsideInfoListItem = true;
    this.currentInfoListText = '';
    this.currentLinkHref = '';
    this.currentLinkText = '';

    element.onEndTag(() => {
      if (!this.currentPhoto) return;
      this.isInsideInfoListItem = false;

      const fullText = this.currentInfoListText.trim();
      let valueToUse = this.currentLinkText ? this.currentLinkText.trim() : fullText;

      if (!this.currentLinkText) {
        if (fullText.includes('Reg:')) valueToUse = fullText.replace('Reg:', '').trim().split(' ')[0];
        else if (fullText.includes('Aircraft:')) valueToUse = fullText.replace('Aircraft:', '').trim();
        else if (fullText.includes('Airline:')) valueToUse = fullText.replace('Airline:', '').trim();
        else if (fullText.includes('Location:')) valueToUse = fullText.replace('Location:', '').trim();
        else if (fullText.includes('Photo date:')) valueToUse = fullText.replace('Photo date:', '').trim();
        else if (fullText.includes('Uploaded:')) valueToUse = fullText.replace('Uploaded:', '').trim();
        else if (fullText.includes('By:') || fullText.includes('Photographer:')) {
          valueToUse = fullText.replace('By:', '').replace('Photographer:', '').trim();
        }
      }

      if (fullText.includes('Reg:')) {
        this.currentPhoto.registration = valueToUse.replace(/\s+photos$/i, '').trim();
        this.currentPhoto.registrationUrl = this.currentLinkHref
          ? `https://www.jetphotos.com${this.currentLinkHref}`
          : 'N/A';
      } else if (fullText.includes('Aircraft:')) {
        this.currentPhoto.aircraftType = valueToUse;
      } else if (fullText.includes('Airline:')) {
        this.currentPhoto.airline = valueToUse;
        this.currentPhoto.airlineUrl = this.currentLinkHref
          ? `https://www.jetphotos.com${this.currentLinkHref}`
          : 'N/A';
      } else if (fullText.includes('Location:')) {
        this.currentPhoto.location = valueToUse;
        this.currentPhoto.locationUrl = this.currentLinkHref
          ? `https://www.jetphotos.com${this.currentLinkHref}`
          : 'N/A';
      } else if (fullText.includes('Photo date:')) {
        this.currentPhoto.photoDate = valueToUse;
      } else if (fullText.includes('Uploaded:')) {
        this.currentPhoto.uploadedDate = valueToUse;
      } else if (fullText.includes('By:') || fullText.includes('Photographer:')) {
        this.currentPhoto.photographer = valueToUse;
        this.currentPhoto.photographerUrl = this.currentLinkHref
          ? `https://www.jetphotos.com${this.currentLinkHref}`
          : 'N/A';
      }
    });
  }

  infoListTextAccumulator(textChunk) {
    if (this.isInsideInfoListItem) this.currentInfoListText += textChunk.text;
  }

  linkInInfoTextElement(element) {
    if (this.currentPhoto && this.isInsideInfoListItem) {
      this.currentLinkHref = element.getAttribute('href');
      this.currentLinkText = '';
    }
  }

  linkTextInInfoTextAccumulator(textChunk) {
    if (this.currentPhoto && this.isInsideInfoListItem && this.currentLinkHref) {
      this.currentLinkText += textChunk.text;
    }
  }

  statElement(element) {
    if (!this.currentPhoto) return;
    this.currentStatText = '';
    element.onEndTag(() => {
      const text = this.currentStatText;
      const valueMatch = text.match(/\d+/);
      const value = valueMatch ? valueMatch[0] : '0';
      if (text.includes('Likes:')) this.currentPhoto.likes = value;
      else if (text.includes('Comments:')) this.currentPhoto.comments = value;
      else if (text.includes('Views:')) this.currentPhoto.views = value;
    });
  }

  statTextAccumulator(textChunk) {
    if (this.currentPhoto) this.currentStatText += textChunk.text;
  }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...extra,
    },
  });
}

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
