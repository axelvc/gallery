import { Platform } from 'react-native';

import { DEFAULT_PROXY_BASE_URL } from '@/features/home/constants';
import type { InstagramProfileLoadResult, ProfileHighlight, GalleryPhoto } from '@/features/home/types';
import { formatCount, normalizeUsername } from '@/features/home/utils/profile';

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
};

function getInstagramProxyBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_INSTAGRAM_PROXY_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return Platform.OS === 'web' ? DEFAULT_PROXY_BASE_URL : '';
}

export async function fetchInstagramProfile(username: string): Promise<InstagramProfileLoadResult> {
  const normalizedUsername = normalizeUsername(username);
  const proxyBaseUrl = getInstagramProxyBaseUrl();

  if (!normalizedUsername) {
    throw new Error('EMPTY_USERNAME');
  }

  if (!proxyBaseUrl) {
    throw new Error('PROXY_NOT_CONFIGURED');
  }

  const response = await fetch(
    `${proxyBaseUrl}/instagram/profile?username=${encodeURIComponent(normalizedUsername)}`
  );

  if (response.status === 404) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (response.status === 403) {
    throw new Error('PROFILE_PRIVATE');
  }

  if (response.status === 429) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  if (!response.ok) {
    throw new Error('PROFILE_UNAVAILABLE');
  }

  const data = (await response.json()) as InstagramProfileResponse | { error?: string };

  if ('error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!('username' in data) || !data.username) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  return {
    source: data.source,
    username: data.username || normalizedUsername,
    displayName: data.fullName?.trim() || data.username || normalizedUsername,
    biography: data.biography?.trim() || 'Public Instagram profile imported into your grid.',
    profilePictureUrl: data.profilePictureUrl ?? '',
    postsCount: typeof data.postsCount === 'number' ? data.postsCount : data.photos?.length ?? 0,
    followers: formatCount(data.followersCount),
    following: formatCount(data.followingCount),
    highlightCount: typeof data.highlightCount === 'number' ? data.highlightCount : data.highlights?.length ?? 0,
    highlights: (data.highlights ?? []).filter((highlight) => highlight.coverUrl),
    photos: (data.photos ?? []).slice(0, 18),
  };
}
