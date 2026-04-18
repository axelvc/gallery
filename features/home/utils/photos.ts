import type { ImagePickerAsset } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import type { GalleryPhoto } from '@/features/home/types';

export function splitPhotosByLock(photos: GalleryPhoto[]) {
  return photos.reduce(
    (groups, photo) => {
      if (photo.locked) {
        groups.locked.push(photo);
      } else {
        groups.unlocked.push(photo);
      }

      return groups;
    },
    { unlocked: [] as GalleryPhoto[], locked: [] as GalleryPhoto[] }
  );
}

export function mergePhotos(unlocked: GalleryPhoto[], locked: GalleryPhoto[]) {
  return [...unlocked, ...locked];
}

export function getPersistentPhotoUri(asset: ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }

  return asset.uri;
}

function sanitizePhotoIdForFileName(photoId: string) {
  return photoId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image blob.'));
    };

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unexpected FileReader result type.'));
      }
    };

    reader.readAsDataURL(blob);
  });
}

function guessPhotoExtension(asset: ImagePickerAsset) {
  const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? '';
  const match = fileName.match(/\.(?<ext>[a-zA-Z0-9]+)(?:\?|#|$)/);

  if (match?.groups?.ext) {
    return `.${match.groups.ext}`;
  }

  if (asset.mimeType === 'image/png') {
    return '.png';
  }

  if (asset.mimeType === 'image/webp') {
    return '.webp';
  }

  return '.jpg';
}

const LOCAL_PHOTO_DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}gallery/photos`
  : null;

export function isAppOwnedLocalPhotoUri(uri: string) {
  return Boolean(LOCAL_PHOTO_DIRECTORY && uri.startsWith(`${LOCAL_PHOTO_DIRECTORY}/`));
}

/**
 * Ensures the picked asset has a stable, app-owned URI on native.
 *
 * On iOS/Android, image-picker URIs can point to cache locations that are not guaranteed long-term.
 * Copying into the app's document directory makes the photo appear instantly (local file) and
 * persist across app lifecycles.
 */
export async function persistPickedPhotoAssetUri(asset: ImagePickerAsset, photoId: string) {
  if (Platform.OS === 'web') {
    if (asset.base64) {
      return getPersistentPhotoUri(asset);
    }

    if (asset.uri.startsWith('data:')) {
      return asset.uri;
    }

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch {
      return asset.uri;
    }
  }

  if (!LOCAL_PHOTO_DIRECTORY) {
    return asset.uri;
  }

  try {
    await FileSystem.makeDirectoryAsync(LOCAL_PHOTO_DIRECTORY, { intermediates: true });
  } catch {
    // Directory may already exist.
  }

  const safePhotoId = sanitizePhotoIdForFileName(photoId);
  const targetUri = `${LOCAL_PHOTO_DIRECTORY}/${safePhotoId}${guessPhotoExtension(asset)}`;

  try {
    const info = await FileSystem.getInfoAsync(targetUri);

    if (!info.exists) {
      await FileSystem.copyAsync({ from: asset.uri, to: targetUri });
    }

    return targetUri;
  } catch {
    return asset.uri;
  }
}
