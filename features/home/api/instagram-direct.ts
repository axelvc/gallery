import type { GalleryPhoto, InstagramProfileLoadResult, ProfileHighlight } from '../types';
import { formatCount, normalizeUsername } from '../utils/profile';

const INSTAGRAM_APP_ID = '936619743392459';
const INSTAGRAM_PROFILE_URL = 'https://i.instagram.com/api/v1/users/web_profile_info/';
const MAX_INSTAGRAM_PHOTOS = 18;
const IMPORTED_PROFILE_BIO = 'Public Instagram profile imported into your grid.';
const INSTAGRAM_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getRecord(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];

  return isRecord(nestedValue) ? nestedValue : undefined;
}

function getArray(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];

  return Array.isArray(nestedValue) ? nestedValue : undefined;
}

function getString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];

  return typeof nestedValue === 'string' ? nestedValue : undefined;
}

function getNumber(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];

  return typeof nestedValue === 'number' ? nestedValue : undefined;
}

function getBoolean(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];

  return typeof nestedValue === 'boolean' ? nestedValue : undefined;
}

function getCountFromEdge(value: unknown, key: string) {
  return getNumber(getRecord(value, key), 'count');
}

function looksLikeJson(text: string, contentType: string | null) {
  if (contentType?.toLowerCase().includes('json')) {
    return true;
  }

  const trimmed = text.trim();

  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

async function parseInstagramJson(response: Response) {
  const text = await response.text();

  if (!looksLikeJson(text, response.headers.get('content-type'))) {
    throw new Error('PROFILE_BLOCKED');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('PROFILE_BLOCKED');
  }
}

function mapInstagramPhotos(user: unknown) {
  const timelineEdges = getArray(getRecord(user, 'edge_owner_to_timeline_media'), 'edges') ?? [];

  return timelineEdges
    .map((edge, index): GalleryPhoto | null => {
      const node = getRecord(edge, 'node');
      const uri = getString(node, 'display_url');
      const id = getString(node, 'id') ?? getString(node, 'shortcode') ?? `${index}`;

      if (!uri) {
        return null;
      }

      return {
        id,
        uri,
        source: 'instagram',
      };
    })
    .filter((photo): photo is GalleryPhoto => photo !== null)
    .slice(0, MAX_INSTAGRAM_PHOTOS);
}

function mapInstagramHighlights(user: unknown): ProfileHighlight[] {
  const edges = getArray(getRecord(user, 'edge_highlight_reels'), 'edges') ?? [];

  return edges
    .map((edge, index): ProfileHighlight | null => {
      const node = getRecord(edge, 'node');
      const coverMedia = getRecord(node, 'cover_media');
      const croppedImageVersion = getRecord(coverMedia, 'cropped_image_version');
      const coverUrl = [
        getString(croppedImageVersion, 'url'),
        getString(coverMedia, 'thumbnail_src'),
        getString(coverMedia, 'display_url'),
      ].find((value): value is string => typeof value === 'string' && value.length > 0);

      if (!coverUrl) {
        return null;
      }

      return {
        id: getString(node, 'id') ?? `${index}`,
        title: getString(node, 'title') ?? '',
        coverUrl,
      };
    })
    .filter((highlight): highlight is ProfileHighlight => highlight !== null);
}

function mapBlockedPayload(payload: unknown) {
  const message = getString(payload, 'message')?.toLowerCase();
  const status = getString(payload, 'status')?.toLowerCase();

  if (message?.includes('login') || message?.includes('checkpoint') || status === 'fail') {
    throw new Error('PROFILE_BLOCKED');
  }
}

export async function fetchInstagramProfileDirect(username: string): Promise<InstagramProfileLoadResult> {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error('EMPTY_USERNAME');
  }

  const response = await fetch(
    `${INSTAGRAM_PROFILE_URL}?username=${encodeURIComponent(normalizedUsername)}`,
    {
      headers: {
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `https://www.instagram.com/${normalizedUsername}/`,
        'User-Agent': INSTAGRAM_USER_AGENT,
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

  const payload = await parseInstagramJson(response);

  mapBlockedPayload(payload);

  const user = getRecord(getRecord(payload, 'data'), 'user');

  if (getBoolean(user, 'is_private') === true) {
    throw new Error('PROFILE_PRIVATE');
  }

  if (!user) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  const mappedHighlights = mapInstagramHighlights(user);
  const mappedPhotos = mapInstagramPhotos(user);
  const fallbackUsername = getString(user, 'username') ?? normalizedUsername;

  return {
    source: 'instagram-direct',
    username: fallbackUsername,
    displayName: getString(user, 'full_name')?.trim() || fallbackUsername,
    biography: getString(user, 'biography')?.trim() || IMPORTED_PROFILE_BIO,
    profilePictureUrl: getString(user, 'profile_pic_url_hd') ?? getString(user, 'profile_pic_url') ?? '',
    postsCount: getCountFromEdge(user, 'edge_owner_to_timeline_media') ?? mappedPhotos.length,
    followers: formatCount(getCountFromEdge(user, 'edge_followed_by')),
    following: formatCount(getCountFromEdge(user, 'edge_follow')),
    highlightCount: getNumber(user, 'highlight_reel_count') ?? mappedHighlights.length,
    highlights: mappedHighlights,
    photos: mappedPhotos,
  };
}
