import { Platform } from 'react-native';

import { fetchInstagramProfileDirect } from '@/features/home/api/instagram-direct';
import { fetchInstagramProfileFromProxy } from '@/features/home/api/instagram-proxy';
import { DEFAULT_PROXY_BASE_URL } from '@/features/home/constants';
import type { InstagramProfileLoadResult } from '@/features/home/types';
import { normalizeUsername } from '@/features/home/utils/profile';

function getInstagramProxyBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_INSTAGRAM_PROXY_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return Platform.OS === 'web' ? DEFAULT_PROXY_BASE_URL : '';
}

function shouldFallbackToProxy(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  return error.message !== 'PROFILE_NOT_FOUND' && error.message !== 'PROFILE_PRIVATE' && error.message !== 'PROFILE_BLOCKED';
}

export async function fetchInstagramProfile(username: string): Promise<InstagramProfileLoadResult> {
  const normalizedUsername = normalizeUsername(username);
  const proxyBaseUrl = getInstagramProxyBaseUrl();

  if (!normalizedUsername) {
    throw new Error('EMPTY_USERNAME');
  }

  if (Platform.OS !== 'web') {
    try {
      return await fetchInstagramProfileDirect(normalizedUsername);
    } catch (error) {
      if (!shouldFallbackToProxy(error)) {
        throw error;
      }

      if (!proxyBaseUrl) {
        throw new Error('PROXY_NOT_CONFIGURED');
      }

      return fetchInstagramProfileFromProxy(proxyBaseUrl, normalizedUsername);
    }
  }

  if (!proxyBaseUrl) {
    throw new Error('PROXY_NOT_CONFIGURED');
  }

  return fetchInstagramProfileFromProxy(proxyBaseUrl, normalizedUsername);
}
