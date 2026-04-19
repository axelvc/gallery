import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || process.env.INSTAGRAM_PROXY_PORT || 8787);
const INSTAGRAM_BASE_URL = 'https://www.instagram.com';
const INSTAGRAM_API_BASE_URL = 'https://i.instagram.com';
const INSTAGRAM_APP_ID = '936619743392459';
const INSTAGRAM_MOBILE_USER_AGENT =
  'Instagram 289.0.0.77.109 Android (33/13; 420dpi; 1080x2400; samsung; SM-G998B; p3s; exynos2100; en_US; 485483842)';
const DEFAULT_HEADERS = {
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
};

function createLogContext(username) {
  return {
    requestId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    username,
  };
}

function logProxyEvent(event, details = {}) {
  console.log(
    JSON.stringify({
      scope: 'instagram-proxy',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    })
  );
}

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

function getRequestBaseUrl(request) {
  const forwardedProtoHeader = request.headers['x-forwarded-proto'];
  const forwardedHostHeader = request.headers['x-forwarded-host'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(',')[0]?.trim();
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.host || `localhost:${PORT}`;
  const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
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

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const setCookie = headers.get('set-cookie');

  if (!setCookie) {
    return [];
  }

  return setCookie.split(/, (?=[^;]+=[^;]+)/g).map((value) => value.trim());
}

function buildCookieHeader(headers) {
  const cookieParts = getSetCookieHeaders(headers)
    .map((value) => value.split(';', 1)[0]?.trim())
    .filter(Boolean);

  return cookieParts.join('; ');
}

function extractCsrfToken(html, cookieHeader) {
  const htmlToken = html.match(/"csrf_token":"([^"]+)"/)?.[1]?.trim();

  if (htmlToken) {
    return htmlToken;
  }

  return cookieHeader.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1]?.trim() ?? '';
}

function extractLsdToken(html) {
  return html.match(/"token":"([^"]+)"/)?.[1]?.trim() ?? '';
}

function summarizeHtml(html) {
  return {
    htmlLength: html.length,
    hasOgTitle: html.includes('og:title'),
    hasOgDescription: html.includes('og:description'),
    hasOgImage: html.includes('og:image'),
    hasProfileExtrasQueryId: Boolean(extractProfileExtrasQueryId(html)),
    hasPrivateMarker: /This Account is Private/i.test(html),
    title: html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.slice(0, 120) ?? '',
  };
}

async function createInstagramSession(username, context) {
  const profileResponse = await fetch(`${INSTAGRAM_BASE_URL}/${encodeURIComponent(username)}/`, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  logProxyEvent('session_response', {
    ...context,
    status: profileResponse.status,
    contentType: profileResponse.headers.get('content-type') ?? '',
  });

  if (!profileResponse.ok) {
    throw new Error('PROFILE_EXTRAS_UNAVAILABLE');
  }

  const profileHtml = await profileResponse.text();
  const cookieHeader = buildCookieHeader(profileResponse.headers);
  const csrfToken = extractCsrfToken(profileHtml, cookieHeader);
  const lsdToken = extractLsdToken(profileHtml);
  const cookieNames = cookieHeader
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter(Boolean);

  logProxyEvent('session_parsed', {
    ...context,
      cookieNames,
      cookieCount: cookieNames.length,
      hasCsrfToken: Boolean(csrfToken),
      hasLsdToken: Boolean(lsdToken),
      ...summarizeHtml(profileHtml),
    });

  return {
    cookieHeader,
    context,
    csrfToken,
    html: profileHtml,
    lsdToken,
  };
}

function buildInstagramApiHeaders(username, session, apiBaseUrl) {
  const baseHeaders = {
    ...DEFAULT_HEADERS,
    Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
    Referer: `${INSTAGRAM_BASE_URL}/${username}/`,
    'X-CSRFToken': session.csrfToken,
    'X-IG-App-ID': INSTAGRAM_APP_ID,
    'X-Requested-With': 'XMLHttpRequest',
    ...(session.cookieHeader ? { Cookie: session.cookieHeader } : {}),
  };

  if (apiBaseUrl === INSTAGRAM_API_BASE_URL) {
    return {
      ...baseHeaders,
      Accept: '*/*',
      'User-Agent': INSTAGRAM_MOBILE_USER_AGENT,
      'X-FB-LSD': session.lsdToken,
      'X-IG-Connection-Type': 'WIFI',
      'X-IG-Capabilities': '3brTvw==',
    };
  }

  return baseHeaders;
}

async function fetchProfileInfoFromApi(apiBaseUrl, username, session, context) {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: buildInstagramApiHeaders(username, session, apiBaseUrl),
    }
  );

  logProxyEvent('profile_info_response', {
    ...context,
    apiBaseUrl,
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
  });

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

  logProxyEvent('profile_info_payload', {
    ...context,
    apiBaseUrl,
    hasUser: Boolean(user),
    isPrivate: Boolean(user?.is_private),
    photoEdgeCount: user?.edge_owner_to_timeline_media?.edges?.length ?? 0,
  });

  if (!user) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (user.is_private) {
    throw new Error('PROFILE_PRIVATE');
  }

  return user;
}

async function fetchProfileExtrasUser(username, userId, session) {
  const activeSession = session ?? (await createInstagramSession(username, createLogContext(username)));
  const profileHtml = activeSession.html;
  const queryId = extractProfileExtrasQueryId(profileHtml);

  logProxyEvent('extras_query_detected', {
    ...activeSession.context,
    hasQueryId: Boolean(queryId),
    userId,
  });

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

  const response = await fetch(`${INSTAGRAM_BASE_URL}/graphql/query/?${query.toString()}`, {
    headers: {
      ...buildInstagramApiHeaders(username, activeSession, INSTAGRAM_BASE_URL),
      Accept: 'application/json',
    },
  });

  logProxyEvent('extras_response', {
    ...activeSession.context,
    status: response.status,
    userId,
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

async function fetchPublicProfileInfo(username, baseUrl, context = createLogContext(username)) {
  const session = await createInstagramSession(username, context);
  let user;

  try {
    user = await fetchProfileInfoFromApi(INSTAGRAM_API_BASE_URL, username, session, context);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logProxyEvent('profile_info_primary_failed', {
      ...context,
      apiBaseUrl: INSTAGRAM_API_BASE_URL,
      message: error.message,
    });

    if (error.message === 'PROFILE_NOT_FOUND' || error.message === 'PROFILE_PRIVATE') {
      throw error;
    }

    user = await fetchProfileInfoFromApi(INSTAGRAM_BASE_URL, username, session, context);
  }

  let profileExtrasUser = null;

  if (user.id) {
    try {
      profileExtrasUser = await fetchProfileExtrasUser(username, user.id, session);
    } catch (error) {
      logProxyEvent('extras_failed', {
        ...context,
        userId: user.id,
        message: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
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

function hasUsableProfileData(profile) {
  return Boolean(
    profile.fullName ||
      profile.profilePictureUrl ||
      profile.postsCount ||
      profile.followersCount ||
      profile.followingCount
  );
}

async function fetchProfileHtml(username, baseUrl, session = null) {
  const html = session?.html;

  if (!html) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  logProxyEvent('html_fallback_started', {
    ...session.context,
    ...summarizeHtml(html),
  });

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
  let session = null;
  const context = createLogContext(username);

  try {
    return await fetchPublicProfileInfo(username, baseUrl, context);
  } catch (error) {
    logProxyEvent('profile_load_failed', {
      ...context,
      message: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });

    if (!(error instanceof Error)) {
      throw error;
    }

    if (
      error.message === 'PROFILE_NOT_FOUND' ||
      error.message === 'PROFILE_PRIVATE' ||
      error.message === 'PROFILE_BLOCKED'
    ) {
      throw error;
    }

    try {
      session = await createInstagramSession(username, context);
    } catch (sessionError) {
      logProxyEvent('session_retry_failed', {
        ...context,
        message: sessionError instanceof Error ? sessionError.message : 'UNKNOWN_ERROR',
      });
      session = null;
    }

    const fallback = await fetchProfileHtml(username, baseUrl, session);

    if (fallback.isPrivate) {
      throw new Error('PROFILE_PRIVATE');
    }

    if (!hasUsableProfileData(fallback)) {
      logProxyEvent('html_fallback_empty', {
        ...context,
        fullName: fallback.fullName,
        hasProfilePictureUrl: Boolean(fallback.profilePictureUrl),
        postsCount: fallback.postsCount,
        followersCount: fallback.followersCount,
        followingCount: fallback.followingCount,
      });
      throw new Error('PROFILE_UNAVAILABLE');
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

  const baseUrl = getRequestBaseUrl(request);
  const url = new URL(request.url, baseUrl);

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
    logProxyEvent('request_failed', {
      username,
      message: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    });

    if (error instanceof Error) {
      if (error.message === 'PROFILE_NOT_FOUND') {
        sendJson(response, 404, { error: 'PROFILE_NOT_FOUND' });
        return;
      }

      if (error.message === 'PROFILE_PRIVATE') {
        sendJson(response, 403, { error: 'PROFILE_PRIVATE' });
        return;
      }

      if (error.message === 'PROFILE_BLOCKED') {
        sendJson(response, 429, { error: 'PROFILE_BLOCKED' });
        return;
      }
    }

    sendJson(response, 502, { error: 'PROFILE_UNAVAILABLE' });
  }
});

server.listen(PORT, () => {
  console.log(`Instagram proxy running on ${PORT === 8787 ? `http://localhost:${PORT}` : `port ${PORT}`}`);
});
