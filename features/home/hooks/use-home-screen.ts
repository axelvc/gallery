import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSortableList } from 'react-native-drax';
import { useTranslation } from 'react-i18next';

import { fetchInstagramProfile } from '@/features/home/api/instagram';
import { GRID_COLUMNS } from '@/features/home/constants';
import type { GalleryPhoto, PersistedHomeState, ProfileHighlight } from '@/features/home/types';
import { isAppOwnedLocalPhotoUri, mergePhotos, persistPickedPhotoAssetUri, splitPhotosByLock } from '@/features/home/utils/photos';
import { readPersistedHomeState, writePersistedHomeState } from '@/features/home/utils/persistence';
import { formatCount, normalizeUsername } from '@/features/home/utils/profile';

export function useHomeScreen() {
  const { t } = useTranslation();
  const profileLoadLockRef = useRef(false);
  const isMountedRef = useRef(true);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [profileName, setProfileName] = useState<string>(() => t('home.blankProfileName'));
  const [displayName, setDisplayName] = useState<string>(() => t('home.defaultDisplayName'));
  const [bio, setBio] = useState<string>(() => t('home.defaultBio'));
  const [avatarUrl, setAvatarUrl] = useState('');
  const [postsCount, setPostsCount] = useState('0');
  const [followers, setFollowers] = useState('0');
  const [following, setFollowing] = useState('0');
  const [highlights, setHighlights] = useState<ProfileHighlight[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSource, setProfileSource] = useState('');
  const [hasHydratedState, setHasHydratedState] = useState(false);

  const applyPersistedState = useCallback((snapshot: PersistedHomeState) => {
    setProfileName(snapshot.profileName);
    setDisplayName(snapshot.displayName);
    setBio(snapshot.bio);
    setAvatarUrl(snapshot.avatarUrl);
    setPostsCount(snapshot.postsCount);
    setFollowers(snapshot.followers);
    setFollowing(snapshot.following);
    setProfileLoaded(snapshot.profileLoaded);
    setProfileSource(snapshot.profileSource);
    setHighlights(snapshot.highlights);
    setPhotos(snapshot.photos);
  }, []);

  const sortable = useSortableList({
    data: photos,
    numColumns: GRID_COLUMNS,
    keyExtractor: (item) => item.id,
    onReorder: ({ data }) => {
      setPhotos((current) => {
        const { locked } = splitPhotosByLock(current);
        const { unlocked } = splitPhotosByLock(data);

        return mergePhotos(unlocked, locked);
      });
    },
  });

  const resetProfileToBlank = useCallback((nextUsername: string) => {
    const normalizedUsername = normalizeUsername(nextUsername);

    setProfileName(normalizedUsername || t('home.blankProfileName'));
    setDisplayName(normalizedUsername || t('home.blankProfileDisplayName'));
    setBio(t('home.blankProfileBio'));
    setAvatarUrl('');
    setPostsCount('0');
    setFollowers('0');
    setFollowing('0');
    setHighlights([]);
    setPhotos([]);
    setProfileLoaded(false);
    setProfileSource('');
  }, [t]);

  const loadProfile = useCallback(
    async (requestedUsername: string) => {
      const normalizedUsername = normalizeUsername(requestedUsername);

      if (!normalizedUsername || profileLoadLockRef.current) {
        if (!normalizedUsername) {
          Alert.alert(t('home.alerts.usernameNeededTitle'), t('home.alerts.usernameNeededMessage'));
        }

        return;
      }

      profileLoadLockRef.current = true;
      setIsLoadingProfile(true);

      try {
        const profile = await fetchInstagramProfile(normalizedUsername);

        setProfileName(profile.username);
        setDisplayName(profile.displayName);
        setBio(profile.biography);
        setAvatarUrl(profile.profilePictureUrl);
        setPostsCount(formatCount(profile.postsCount));
        setFollowers(profile.followers);
        setFollowing(profile.following);
        setHighlights(profile.highlights);
        setPhotos(profile.photos.map((photo) => ({ ...photo, locked: true, source: 'instagram' })));
        setProfileLoaded(true);
        setProfileSource(profile.source ?? '');
      } catch (error) {
        resetProfileToBlank(normalizedUsername);

        if (error instanceof Error) {
          if (error.message === 'PROFILE_PRIVATE') {
            Alert.alert(t('home.alerts.privateProfileTitle'), t('home.alerts.privateProfileMessage'));
          } else if (error.message === 'PROFILE_BLOCKED') {
            Alert.alert(t('home.alerts.profileBlockedTitle'), t('home.alerts.profileBlockedMessage'));
          } else if (error.message === 'PROFILE_NOT_FOUND') {
            Alert.alert(t('home.alerts.profileNotFoundTitle'), t('home.alerts.profileNotFoundMessage'));
          } else if (error.message === 'EMPTY_USERNAME') {
            Alert.alert(t('home.alerts.usernameNeededTitle'), t('home.alerts.usernameNeededMessage'));
          } else if (error.message === 'PROXY_NOT_CONFIGURED') {
            Alert.alert(t('home.alerts.proxyNotConfiguredTitle'), t('home.alerts.proxyNotConfiguredMessage'));
          } else {
            Alert.alert(t('home.alerts.profileUnavailableTitle'), t('home.alerts.profileUnavailableMessage'));
          }
        }
      } finally {
        profileLoadLockRef.current = false;
        setIsLoadingProfile(false);
      }
    },
    [resetProfileToBlank, t]
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function restoreHomeState() {
      try {
        const parsedState = await readPersistedHomeState();

        if (parsedState) {
          if (!isCancelled) {
            applyPersistedState(parsedState);
          }

          return;
        }
      } finally {
        if (!isCancelled) {
          setHasHydratedState(true);
        }
      }
    }

    void restoreHomeState();

    return () => {
      isCancelled = true;
    };
  }, [applyPersistedState, loadProfile]);

  useEffect(() => {
    if (!hasHydratedState) {
      return;
    }

    const photosToPersist = photos.filter((photo) => {
      if (photo.source !== 'local') {
        return true;
      }

      if (Platform.OS === 'web') {
        return photo.uri.startsWith('data:');
      }

      return isAppOwnedLocalPhotoUri(photo.uri);
    });

    async function persistHomeState() {
      try {
        await writePersistedHomeState({
          version: 1,
          profileName,
          displayName,
          bio,
          avatarUrl,
          postsCount,
          followers,
          following,
          profileLoaded,
          profileSource,
          highlights,
          photos: photosToPersist,
        });
      } catch (error) {
        console.warn('Failed to persist home screen state.', error);
      }
    }

    void persistHomeState();
  }, [
    avatarUrl,
    bio,
    displayName,
    followers,
    following,
    hasHydratedState,
    highlights,
    photos,
    postsCount,
    profileLoaded,
    profileName,
    profileSource,
  ]);

  const pickPhotos = useCallback(async () => {
    if (isPicking) {
      return;
    }

    setIsPicking(true);

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(t('home.alerts.photoAccessNeededTitle'), t('home.alerts.photoAccessNeededMessage'));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        base64: false,
        quality: 1,
        selectionLimit: 0,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const picked = result.assets
        .filter((asset) => asset.uri)
        .map((asset, index) => {
          const id = `${asset.assetId ?? asset.fileName ?? 'photo'}-${Date.now()}-${index}`;
          const uri = asset.uri;

          return {
            asset,
            id,
            initialUri: uri,
            photo: {
              id,
              uri,
              locked: false,
              source: 'local' as const,
            },
          };
        });

      const nextPhotos = picked.map((entry) => entry.photo);

      setPhotos((current) => {
        const { unlocked, locked } = splitPhotosByLock(current);

        return mergePhotos([...unlocked, ...nextPhotos], locked);
      });

      for (const entry of picked) {
        void (async () => {
          try {
            const persistedUri = await persistPickedPhotoAssetUri(entry.asset, entry.id);

            if (!isMountedRef.current || !persistedUri || persistedUri === entry.initialUri) {
              return;
            }

            setPhotos((current) =>
              current.map((photo) => {
                if (photo.id !== entry.id || photo.source !== 'local' || photo.uri !== entry.initialUri) {
                  return photo;
                }

                return {
                  ...photo,
                  uri: persistedUri,
                };
              })
            );
          } catch (error) {
            console.warn('Failed to persist picked photo asset.', error);
          }
        })();
      }
    } catch {
      Alert.alert(t('home.alerts.unableToOpenGalleryTitle'), t('home.alerts.unableToOpenGalleryMessage'));
    } finally {
      setIsPicking(false);
    }
  }, [isPicking, t]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId || photo.locked));
  }, []);

  const refreshAddedPhotos = useCallback(() => {
    setPhotos((current) => splitPhotosByLock(current).locked);
  }, []);

  return {
    avatarUrl,
    bio,
    displayName,
    followers,
    following,
    hasPhotos: photos.length > 0,
    highlights,
    isLoadingProfile,
    isPicking,
    photos,
    postsCount,
    profileLoaded,
    profileName,
    profileSource,
    removePhoto,
    refreshAddedPhotos,
    sortable,
    loadProfile,
    pickPhotos,
  };
}
