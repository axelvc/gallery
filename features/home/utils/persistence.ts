import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  DEFAULT_BIO,
  DEFAULT_DISPLAY_NAME,
  HOME_SCREEN_DB_NAME,
  HOME_SCREEN_DB_STORE,
  HOME_SCREEN_STATE_STORAGE_KEY,
} from '@/features/home/constants';
import type { GalleryPhoto, PersistedHomeState, ProfileHighlight } from '@/features/home/types';

function openHomeStateDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HOME_SCREEN_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(HOME_SCREEN_DB_STORE)) {
        database.createObjectStore(HOME_SCREEN_DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

async function readPersistedHomeStateValue() {
  if (Platform.OS !== 'web' || typeof indexedDB === 'undefined') {
    return AsyncStorage.getItem(HOME_SCREEN_STATE_STORAGE_KEY);
  }

  const database = await openHomeStateDatabase();

  return new Promise<string | null>((resolve, reject) => {
    const transaction = database.transaction(HOME_SCREEN_DB_STORE, 'readonly');
    const store = transaction.objectStore(HOME_SCREEN_DB_STORE);
    const request = store.get(HOME_SCREEN_STATE_STORAGE_KEY);

    request.onsuccess = () => {
      resolve(typeof request.result === 'string' ? request.result : null);
      database.close();
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to read persisted home state.'));
      database.close();
    };
  });
}

async function writePersistedHomeStateValue(value: string) {
  if (Platform.OS !== 'web' || typeof indexedDB === 'undefined') {
    await AsyncStorage.setItem(HOME_SCREEN_STATE_STORAGE_KEY, value);
    return;
  }

  const database = await openHomeStateDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(HOME_SCREEN_DB_STORE, 'readwrite');
    const store = transaction.objectStore(HOME_SCREEN_DB_STORE);

    transaction.oncomplete = () => {
      resolve();
      database.close();
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error('Failed to write persisted home state.'));
      database.close();
    };

    store.put(value, HOME_SCREEN_STATE_STORAGE_KEY);
  });
}

function isProfileHighlight(value: unknown): value is ProfileHighlight {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as ProfileHighlight).id === 'string' &&
      typeof (value as ProfileHighlight).title === 'string' &&
      typeof (value as ProfileHighlight).coverUrl === 'string'
  );
}

function isGalleryPhoto(value: unknown): value is GalleryPhoto {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as GalleryPhoto).id === 'string' &&
      typeof (value as GalleryPhoto).uri === 'string'
  );
}

export function parsePersistedHomeState(value: string | null): PersistedHomeState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PersistedHomeState> | null;

    if (!parsed || parsed.version !== 1) {
      return null;
    }

    return {
      version: 1,
      usernameInput: typeof parsed.usernameInput === 'string' ? parsed.usernameInput : '',
      profileName: typeof parsed.profileName === 'string' ? parsed.profileName : '',
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : DEFAULT_DISPLAY_NAME,
      bio: typeof parsed.bio === 'string' ? parsed.bio : DEFAULT_BIO,
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
      postsCount: typeof parsed.postsCount === 'string' ? parsed.postsCount : '0',
      followers: typeof parsed.followers === 'string' ? parsed.followers : '0',
      following: typeof parsed.following === 'string' ? parsed.following : '0',
      profileLoaded: Boolean(parsed.profileLoaded),
      profileSource: typeof parsed.profileSource === 'string' ? parsed.profileSource : '',
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter(isProfileHighlight).map((highlight) => ({ ...highlight }))
        : [],
      photos: Array.isArray(parsed.photos)
        ? parsed.photos.filter(isGalleryPhoto).map((photo) => ({
            id: photo.id,
            uri: photo.uri,
            locked: Boolean(photo.locked),
            source: photo.source === 'instagram' ? 'instagram' : 'local',
          }))
        : [],
    };
  } catch {
    return null;
  }
}

export async function readPersistedHomeState() {
  const storedValue = await readPersistedHomeStateValue();
  return parsePersistedHomeState(storedValue);
}

export async function writePersistedHomeState(snapshot: PersistedHomeState) {
  await writePersistedHomeStateValue(JSON.stringify(snapshot));
}
