import type { ImagePickerAsset } from 'expo-image-picker';

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
