import { createServer } from 'node:http';

const PORT = Number(process.env.INSTAGRAM_PROXY_PORT || 8787);
const INSTAGRAM_APP_ID = '936619743392459';
const DEFAULT_HEADERS = {
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end();
}

function normalizeUsername(value) {
  return value.trim().replace(/^@+/, '').replace(/\/$/, '');
}

function buildProxyMediaUrl(baseUrl, targetUrl) {
  if (!targetUrl) {
    return '';
  }

  return `${baseUrl}/instagram/media?url=${encodeURIComponent(targetUrl)}`;
}

function formatHighlightPayload(user, baseUrl) {
  const highlightEdges = user.edge_highlight_reels?.edges ?? [];

  return highlightEdges
    .map((edge, index) => {
      const node = edge?.node;
      const coverUrl =
        node?.cover_media_cropped_thumbnail?.url ?? node?.cover_media?.thumbnail_src ?? '';

      return {
        id: node?.id ?? `highlight-${index}`,
        title: node?.title?.trim() || 'Highlight',
        coverUrl: buildProxyMediaUrl(baseUrl, coverUrl),
      };
    })
    .filter((highlight) => highlight.coverUrl);
}

function extractProfileExtrasQueryId(html) {
  return html.match(/"profile_extras":\{.*?"query_id":"(\d+)"/s)?.[1] ?? '';
}

async function fetchProfileExtrasUser(username, userId) {
  const profileResponse = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!profileResponse.ok) {
    throw new Error('PROFILE_EXTRAS_UNAVAILABLE');
  }

  const profileHtml = await profileResponse.text();
  const queryId = extractProfileExtrasQueryId(profileHtml);

  if (!queryId) {
    throw new Error('PROFILE_EXTRAS_UNAVAILABLE');
  }

  const query = new URLSearchParams({
    query_id: queryId,
    user_id: String(userId),
    include_chaining: 'false',
    include_reel: 'true',
    include_suggested_users: 'false',
    include_logged_out_extras: 'true',
    include_live_status: 'false',
    include_highlight_reels: 'true',
  });

  const response = await fetch(`https://www.instagram.com/graphql/query/?${query.toString()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
      Referer: `https://www.instagram.com/${username}/`,
      'X-IG-App-ID': INSTAGRAM_APP_ID,
    },
  });

  if (!response.ok) {
    throw new Error('PROFILE_EXTRAS_UNAVAILABLE');
  }

  const payload = await response.json();
  const user = payload?.data?.user;

  if (!user) {
    throw new Error('PROFILE_EXTRAS_UNAVAILABLE');
  }

  return user;
}

function formatProfilePayload(user, baseUrl, profileExtrasUser = null) {
  const edges = user.edge_owner_to_timeline_media?.edges ?? [];
  const highlightUser = profileExtrasUser ?? user;
  const highlights = formatHighlightPayload(highlightUser, baseUrl);

  return {
    source: 'web_profile_info',
    username: user.username,
    fullName: user.full_name ?? '',
    biography: user.biography ?? '',
    profilePictureUrl: buildProxyMediaUrl(baseUrl, user.profile_pic_url_hd ?? user.profile_pic_url ?? ''),
    postsCount: user.edge_owner_to_timeline_media?.count ?? edges.length,
    followersCount: user.edge_followed_by?.count ?? 0,
    followingCount: user.edge_follow?.count ?? 0,
    isPrivate: Boolean(user.is_private),
    highlightCount:
      highlights.length > 0
        ? highlights.length
        : (highlightUser.highlight_reel_count ?? user.highlight_reel_count ?? 0),
    highlights,
    photos: edges
      .map((edge, index) => ({
        id: edge?.node?.id ?? `instagram-${index}`,
        uri: buildProxyMediaUrl(baseUrl, edge?.node?.display_url ?? ''),
      }))
      .filter((photo) => photo.uri)
      .slice(0, 18),
  };
}

async function fetchPublicProfileInfo(username, baseUrl) {
  const response = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: `https://www.instagram.com/${username}/`,
        'X-IG-App-ID': INSTAGRAM_APP_ID,
      },
    }
  );

  if (response.status === 404) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (response.status === 401 || response.status === 403 || response.status === 429) {
    throw new Error('PROFILE_BLOCKED');
  }

  if (!response.ok) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  const payload = await response.json();
  const user = payload?.data?.user;

  if (!user) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (user.is_private) {
    throw new Error('PROFILE_PRIVATE');
  }

  let profileExtrasUser = null;

  if (user.id) {
    try {
      profileExtrasUser = await fetchProfileExtrasUser(username, user.id);
    } catch {
      profileExtrasUser = null;
    }
  }

  return formatProfilePayload(user, baseUrl, profileExtrasUser);
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractMeta(content, property) {
  const match = content.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  );

  return match?.[1] ? decodeHtml(match[1]) : '';
}

function extractCounts(description) {
  const normalized = description.replace(/,/g, '');
  const counts = {
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  };

  const postsMatch = normalized.match(/([\d.]+[MK]?)\s+Posts/i);
  const followersMatch = normalized.match(/([\d.]+[MK]?)\s+Followers/i);
  const followingMatch = normalized.match(/([\d.]+[MK]?)\s+Following/i);

  const parseCount = (value) => {
    if (!value) {
      return 0;
    }

    const upper = value.toUpperCase();

    if (upper.endsWith('M')) {
      return Math.round(Number.parseFloat(upper) * 1_000_000);
    }

    if (upper.endsWith('K')) {
      return Math.round(Number.parseFloat(upper) * 1_000);
    }

    return Number.parseInt(upper, 10) || 0;
  };

  counts.postsCount = parseCount(postsMatch?.[1]);
  counts.followersCount = parseCount(followersMatch?.[1]);
  counts.followingCount = parseCount(followingMatch?.[1]);

  return counts;
}

async function fetchProfileHtml(username, baseUrl) {
  const response = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (response.status === 404) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (!response.ok) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  const html = await response.text();

  if (/This Account is Private/i.test(html)) {
    throw new Error('PROFILE_PRIVATE');
  }

  const ogTitle = extractMeta(html, 'og:title');
  const ogDescription = extractMeta(html, 'og:description');
  const description = ogDescription || ogTitle;
  const counts = extractCounts(description);
  const fullName = (ogTitle.split('(')[0] || '').trim();

  return {
    source: 'profile_html',
    username,
    fullName,
    biography: '',
    profilePictureUrl: buildProxyMediaUrl(baseUrl, extractMeta(html, 'og:image')),
    postsCount: counts.postsCount,
    followersCount: counts.followersCount,
    followingCount: counts.followingCount,
    isPrivate: false,
    highlightCount: 0,
    highlights: [],
    photos: [],
  };
}

async function loadInstagramProfile(username, baseUrl) {
  try {
    return await fetchPublicProfileInfo(username, baseUrl);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    if (error.message === 'PROFILE_NOT_FOUND' || error.message === 'PROFILE_PRIVATE') {
      throw error;
    }

    const fallback = await fetchProfileHtml(username, baseUrl);

    if (fallback.isPrivate) {
      throw new Error('PROFILE_PRIVATE');
    }

    return fallback;
  }
}

async function proxyInstagramMedia(targetUrl, response) {
  let parsedUrl;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    sendJson(response, 400, { error: 'INVALID_MEDIA_URL' });
    return;
  }

  if (parsedUrl.protocol !== 'https:') {
    sendJson(response, 400, { error: 'INVALID_MEDIA_URL' });
    return;
  }

  const responseFromInstagram = await fetch(parsedUrl, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: 'https://www.instagram.com/',
    },
  });

  if (!responseFromInstagram.ok) {
    sendJson(response, 502, { error: 'MEDIA_UNAVAILABLE' });
    return;
  }

  const contentType = responseFromInstagram.headers.get('content-type') ?? 'image/jpeg';
  const buffer = Buffer.from(await responseFromInstagram.arrayBuffer());

  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300',
    'Content-Length': buffer.length,
    'Content-Type': contentType,
  });
  response.end(buffer);
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'INVALID_REQUEST' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendEmpty(response, 204);
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  const baseUrl = `http://${request.headers.host ?? `localhost:${PORT}`}`;

  if (request.method === 'GET' && url.pathname === '/instagram/media') {
    const targetUrl = url.searchParams.get('url') ?? '';
    await proxyInstagramMedia(targetUrl, response);
    return;
  }

  if (request.method !== 'GET' || url.pathname !== '/instagram/profile') {
    sendJson(response, 404, { error: 'NOT_FOUND' });
    return;
  }

  const username = normalizeUsername(url.searchParams.get('username') ?? '');

  if (!username) {
    sendJson(response, 400, { error: 'EMPTY_USERNAME' });
    return;
  }

  try {
    const profile = await loadInstagramProfile(username, baseUrl);
    sendJson(response, 200, profile);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PROFILE_NOT_FOUND') {
        sendJson(response, 404, { error: 'PROFILE_NOT_FOUND' });
        return;
      }

      if (error.message === 'PROFILE_PRIVATE') {
        sendJson(response, 403, { error: 'PROFILE_PRIVATE' });
        return;
      }
    }

    sendJson(response, 502, { error: 'PROFILE_UNAVAILABLE' });
  }
});

server.listen(PORT, () => {
  console.log(`Instagram proxy running on http://localhost:${PORT}`);
});
