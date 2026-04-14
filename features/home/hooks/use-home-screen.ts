import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSortableList } from 'react-native-drax';

import { fetchInstagramProfile } from '@/features/home/api/instagram';
import {
  BLANK_PROFILE_BIO,
  DEFAULT_BIO,
  DEFAULT_DISPLAY_NAME,
  DEFAULT_USERNAME,
  GRID_COLUMNS,
} from '@/features/home/constants';
import type { GalleryPhoto, PersistedHomeState, ProfileHighlight } from '@/features/home/types';
import { mergePhotos, getPersistentPhotoUri, splitPhotosByLock } from '@/features/home/utils/photos';
import { readPersistedHomeState, writePersistedHomeState } from '@/features/home/utils/persistence';
import { formatCount, normalizeUsername } from '@/features/home/utils/profile';

export function useHomeScreen() {
  const profileLoadLockRef = useRef(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [usernameInput, setUsernameInput] = useState(DEFAULT_USERNAME);
  const [profileName, setProfileName] = useState(DEFAULT_USERNAME);
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const [bio, setBio] = useState(DEFAULT_BIO);
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
    setUsernameInput(snapshot.usernameInput);
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

    setProfileName(normalizedUsername || 'username');
    setDisplayName(normalizedUsername || 'Instagram profile');
    setBio(BLANK_PROFILE_BIO);
    setAvatarUrl('');
    setPostsCount('0');
    setFollowers('0');
    setFollowing('0');
    setHighlights([]);
    setPhotos([]);
    setProfileLoaded(false);
    setProfileSource('');
  }, []);

  const loadProfile = useCallback(
    async (requestedUsername: string) => {
      const normalizedUsername = normalizeUsername(requestedUsername);

      if (!normalizedUsername || profileLoadLockRef.current) {
        if (!normalizedUsername) {
          Alert.alert('Username needed', 'Enter an Instagram username to load a public profile grid.');
        }

        return;
      }

      profileLoadLockRef.current = true;
      setIsLoadingProfile(true);

      try {
        const profile = await fetchInstagramProfile(normalizedUsername);

        setProfileName(profile.username);
        setUsernameInput(profile.username);
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
            Alert.alert(
              'Private profile',
              'That Instagram account is private, so its posts cannot be used for the grid.'
            );
          } else if (error.message === 'PROFILE_NOT_FOUND') {
            Alert.alert('Profile not found', 'That Instagram username does not exist. Try another public account.');
          } else if (error.message === 'EMPTY_USERNAME') {
            Alert.alert('Username needed', 'Enter an Instagram username to load a public profile grid.');
          } else if (error.message === 'PROXY_NOT_CONFIGURED') {
            Alert.alert(
              'Proxy not configured',
              'Set EXPO_PUBLIC_INSTAGRAM_PROXY_URL or run npm run instagram-proxy before loading a profile.'
            );
          } else {
            Alert.alert(
              'Profile unavailable',
              'Instagram did not return a usable public profile. The grid has been cleared.'
            );
          }
        }
      } finally {
        profileLoadLockRef.current = false;
        setIsLoadingProfile(false);
      }
    },
    [resetProfileToBlank]
  );

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

        if (DEFAULT_USERNAME) {
          await loadProfile(DEFAULT_USERNAME);
        }
      } catch {
        if (DEFAULT_USERNAME) {
          await loadProfile(DEFAULT_USERNAME);
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

    async function persistHomeState() {
      try {
        await writePersistedHomeState({
          version: 1,
          usernameInput,
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
          photos,
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
    usernameInput,
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
          Alert.alert(
            'Photo access needed',
            'Please allow photo library access so you can build your gallery grid.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        base64: true,
        quality: 1,
        selectionLimit: 0,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const nextPhotos = result.assets
        .filter((asset) => asset.uri)
        .map((asset, index) => ({
          id: `${asset.assetId ?? asset.fileName ?? 'photo'}-${Date.now()}-${index}`,
          uri: getPersistentPhotoUri(asset),
          locked: false,
          source: 'local' as const,
        }));

      setPhotos((current) => {
        const { unlocked, locked } = splitPhotosByLock(current);

        return mergePhotos([...unlocked, ...nextPhotos], locked);
      });
    } catch {
      Alert.alert('Unable to open gallery', 'Please try picking your photos again.');
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId || photo.locked));
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
    sortable,
    loadProfile,
    pickPhotos,
    setUsernameInput,
    usernameInput,
  };
}
