import type { GalleryPhoto, InstagramProfileLoadResult, ProfileHighlight } from '../types';
import { formatCount } from '../utils/profile';

const IMPORTED_PROFILE_BIO = 'Public Instagram profile imported into your grid.';

type InstagramProfileResponse = {
  source?: string;
  username?: string;
  fullName?: string;
  biography?: string;
  profilePictureUrl?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  highlightCount?: number;
  highlights?: ProfileHighlight[];
  photos?: GalleryPhoto[];
  error?: unknown;
};

function getProxyError(data: unknown) {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return '';
  }

  const error = data.error;

  return typeof error === 'string' ? error : '';
}

function looksLikeJson(text: string, contentType: string | null) {
  if (contentType?.toLowerCase().includes('json')) {
    return true;
  }

  const trimmed = text.trim();

  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function mapProxyStatusError(status: number) {
  if (status === 404) {
    return 'PROFILE_NOT_FOUND';
  }

  if (status === 403) {
    return 'PROFILE_PRIVATE';
  }

  if (status === 429) {
    return 'PROFILE_BLOCKED';
  }

  return 'PROFILE_UNAVAILABLE';
}

function mapNonJsonProxyError(status: number) {
  if (status === 401 || status === 403 || status === 429) {
    return 'PROFILE_BLOCKED';
  }

  return 'PROFILE_UNAVAILABLE';
}

async function parseProxyResponseBody(response: Response) {
  const text = await response.text();

  if (!looksLikeJson(text, response.headers.get('content-type'))) {
    return { data: null, isJson: false };
  }

  try {
    return { data: JSON.parse(text) as unknown, isJson: true };
  } catch {
    return { data: null, isJson: false };
  }
}

export async function fetchInstagramProfileFromProxy(
  proxyBaseUrl: string,
  normalizedUsername: string
): Promise<InstagramProfileLoadResult> {
  const response = await fetch(
    `${proxyBaseUrl}/instagram/profile?username=${encodeURIComponent(normalizedUsername)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );
  const { data, isJson } = await parseProxyResponseBody(response);

  if (!isJson) {
    throw new Error(mapNonJsonProxyError(response.status));
  }

  const proxyError = getProxyError(data);

  if (proxyError) {
    throw new Error(proxyError);
  }

  if (!response.ok) {
    throw new Error(mapProxyStatusError(response.status));
  }

  if (typeof data !== 'object' || data === null || !('username' in data) || !data.username) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const profile = data as InstagramProfileResponse;

  return {
    source: profile.source,
    username: profile.username || normalizedUsername,
    displayName: profile.fullName?.trim() || profile.username || normalizedUsername,
    biography: profile.biography?.trim() || IMPORTED_PROFILE_BIO,
    profilePictureUrl: profile.profilePictureUrl ?? '',
    postsCount: typeof profile.postsCount === 'number' ? profile.postsCount : profile.photos?.length ?? 0,
    followers: formatCount(profile.followersCount),
    following: formatCount(profile.followingCount),
    highlightCount:
      typeof profile.highlightCount === 'number' ? profile.highlightCount : profile.highlights?.length ?? 0,
    highlights: (profile.highlights ?? []).filter((highlight) => highlight.coverUrl),
    photos: (profile.photos ?? []).slice(0, 18),
  };
}
