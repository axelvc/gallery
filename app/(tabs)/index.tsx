import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  DraxProvider,
  SortableContainer,
  SortableItem,
  useSortableList,
} from 'react-native-drax';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

type GalleryPhoto = {
  id: string;
  uri: string;
  locked?: boolean;
  source?: 'instagram' | 'local';
};

type InstagramProfileLoadResult = {
  source?: string;
  username: string;
  displayName: string;
  biography: string;
  profilePictureUrl: string;
  postsCount: number;
  followers: string;
  following: string;
  highlightCount: number;
  highlights: ProfileHighlight[];
  photos: GalleryPhoto[];
};

type ProfileHighlight = {
  id: string;
  title: string;
  coverUrl: string;
};

type PersistedHomeState = {
  version: 1;
  usernameInput: string;
  profileName: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  postsCount: string;
  followers: string;
  following: string;
  profileLoaded: boolean;
  profileSource: string;
  highlights: ProfileHighlight[];
  photos: GalleryPhoto[];
};

const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const DEFAULT_USERNAME = '';
const DEFAULT_PROXY_BASE_URL = 'http://localhost:8787';
const HOME_SCREEN_STATE_STORAGE_KEY = 'gallery.home-screen-state.v1';
const HOME_SCREEN_DB_NAME = 'gallery-home-screen-db';
const HOME_SCREEN_DB_STORE = 'keyval';

function splitPhotosByLock(photos: GalleryPhoto[]) {
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

function mergePhotos(unlocked: GalleryPhoto[], locked: GalleryPhoto[]) {
  return [...unlocked, ...locked];
}

function getPersistentPhotoUri(asset: ImagePicker.ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }

  return asset.uri;
}

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

function parsePersistedHomeState(value: string | null): PersistedHomeState | null {
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
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : 'Duck Gallery',
      bio:
        typeof parsed.bio === 'string'
          ? parsed.bio
          : 'Curate your photos in profile order. Add images from your library, then long-press any tile to move it around the grid.',
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
      postsCount: typeof parsed.postsCount === 'string' ? parsed.postsCount : '0',
      followers: typeof parsed.followers === 'string' ? parsed.followers : '0',
      following: typeof parsed.following === 'string' ? parsed.following : '0',
      profileLoaded: Boolean(parsed.profileLoaded),
      profileSource: typeof parsed.profileSource === 'string' ? parsed.profileSource : '',
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights
            .filter(
              (highlight): highlight is ProfileHighlight =>
                typeof highlight?.id === 'string' &&
                typeof highlight?.title === 'string' &&
                typeof highlight?.coverUrl === 'string'
            )
            .map((highlight) => ({
              id: highlight.id,
              title: highlight.title,
              coverUrl: highlight.coverUrl,
            }))
        : [],
      photos: Array.isArray(parsed.photos)
        ? parsed.photos
            .filter(
              (photo): photo is GalleryPhoto =>
                typeof photo?.id === 'string' &&
                typeof photo?.uri === 'string'
            )
            .map((photo) => ({
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

function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, '').replace(/\/$/, '');
}

function formatCount(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '0';
}

function getInstagramProxyBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_INSTAGRAM_PROXY_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  return Platform.OS === 'web' ? DEFAULT_PROXY_BASE_URL : '';
}

async function fetchInstagramProfile(username: string): Promise<InstagramProfileLoadResult> {
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

  const data = (await response.json()) as
    | {
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
      }
    | { error?: string };

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

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const profileLoadLockRef = useRef(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [usernameInput, setUsernameInput] = useState(DEFAULT_USERNAME);
  const [profileName, setProfileName] = useState(DEFAULT_USERNAME);
  const [displayName, setDisplayName] = useState('Duck Gallery');
  const [bio, setBio] = useState(
    'Curate your photos in profile order. Add images from your library, then long-press any tile to move it around the grid.'
  );
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

  const gridSize = useMemo(() => {
    const horizontalPadding = 0;

    return Math.floor((width - horizontalPadding) / GRID_COLUMNS - GRID_GAP);
  }, [width]);

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
    setBio(
      'This profile could not be loaded. Try another public Instagram username or add your own photos below.'
    );
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
            Alert.alert(
              'Profile not found',
              'That Instagram username does not exist. Try another public account.'
            );
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
        const storedState = await readPersistedHomeStateValue();
        const parsedState = parsePersistedHomeState(storedState);

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
        const snapshot: PersistedHomeState = {
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
        };

        await writePersistedHomeStateValue(JSON.stringify(snapshot));
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

  const pickPhotos = async () => {
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
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId || photo.locked));
  };

  const stats = [
    { label: 'Posts', value: postsCount },
    { label: 'Followers', value: followers },
    { label: 'Following', value: following },
  ];

  const isDark = colorScheme === 'dark';
  const screenBackground = isDark ? '#000000' : '#FAFAFA';
  const tileBackground = isDark ? '#101214' : '#F3F5F7';
  const tileBorder = isDark ? '#262626' : '#DBDBDB';
  const mutedText = isDark ? '#A8A8A8' : '#737373';
  const actionBackground = isDark ? '#262626' : '#EFEFEF';
  const actionText = isDark ? '#F5F5F5' : '#111111';
  const accentBlue = '#0095F6';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: screenBackground }]}>
      <ThemedView style={[styles.screen, { backgroundColor: screenBackground }]}>
        <View style={styles.header}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isDark ? '#1F1F1F' : '#E8EDF2', borderColor: tileBorder },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: isDark ? '#8E8E8E' : '#C7C7C7' }]}>
                  <Ionicons name="person" size={42} color={isDark ? '#F5F5F5' : '#FFFFFF'} />
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              {stats.map((stat) => (
                <View key={stat.label} style={styles.statBlock}>
                  <ThemedText type="defaultSemiBold" style={styles.statValue}>
                    {stat.value}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: actionText }]}>
                    {stat.label.toLowerCase()}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.identityCopy}>
            <ThemedText type="defaultSemiBold" style={styles.displayName}>
              {displayName}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }]}>
              {bio}
            </ThemedText>
            <ThemedText style={[styles.linkText, { color: accentBlue }]}>instagram.com/{profileName}</ThemedText>
            {profileSource === 'profile_html' ? (
              <ThemedText style={[styles.sourceNote, { color: mutedText }]}>
                Loaded from public profile HTML. Stats and avatar are available, but recent images may be limited.
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.usernameRow}>
            <View
              style={[
                styles.usernameInputWrap,
                { backgroundColor: actionBackground, borderColor: tileBorder },
              ]}
            >
              <ThemedText style={[styles.usernamePrefix, { color: mutedText }]}>@</ThemedText>
              <TextInput
                value={usernameInput}
                onChangeText={setUsernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="instagram username"
                placeholderTextColor={mutedText}
                selectionColor={accentBlue}
                style={[styles.usernameInput, { color: actionText }]}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={pickPhotos}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: accentBlue, opacity: pressed || isLoadingProfile ? 0.8 : 1 },
                // { backgroundColor: actionBackground, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: actionText }]}>
                {isPicking ? 'Opening...' : 'Add photos'}
              </ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadProfile(usernameInput)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: actionBackground, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: actionText }]}>
                {isLoadingProfile ? 'Loading' : profileLoaded ? 'Refresh profile' : 'Try profile'}
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightRow}
          >
            {highlights.map((highlight) => (
              <View key={highlight.id} style={styles.highlightItem}>
                <View
                  style={[
                    styles.highlightCircle,
                    { borderColor: tileBorder, backgroundColor: isDark ? '#1A1A1A' : '#F1F1F1' },
                  ]}
                >
                  <Image source={{ uri: highlight.coverUrl }} style={styles.highlightImage} contentFit="cover" />
                </View>
                <ThemedText numberOfLines={1} style={[styles.highlightLabel, { color: actionText }]}>
                  {highlight.title}
                </ThemedText>
              </View>
            ))}

            <View style={styles.highlightItem}>
              <View
                style={[
                  styles.highlightCircle,
                  { borderColor: tileBorder, backgroundColor: isDark ? '#1A1A1A' : '#F1F1F1' },
                ]}
              >
                <Ionicons name="add" size={32} color={mutedText} />
              </View>
              <ThemedText style={[styles.highlightLabel, { color: actionText }]}>New</ThemedText>
            </View>
          </ScrollView>
        </View>

        <View style={[styles.tabBar, { borderTopColor: tileBorder }]}>
          <View style={styles.tabItemActive}>
            <Ionicons name="grid-outline" size={22} color={actionText} />
          </View>
          <View style={styles.tabItem}>
            <Ionicons name="bookmark-outline" size={22} color={mutedText} />
          </View>
          <View style={styles.tabItem}>
            <Ionicons name="person-circle-outline" size={24} color={mutedText} />
          </View>
        </View>

        {photos.length === 0 ? (
          <ThemedView
            style={[styles.emptyState, { borderColor: tileBorder, backgroundColor: screenBackground }]}
          >
            <View style={[styles.emptyIconCircle, { borderColor: tileBorder }]}>
              <Ionicons name="images-outline" size={30} color={actionText} />
            </View>
            <ThemedText type="subtitle" style={[styles.emptyTitle, { color: actionText }]}>
              Share your first photo
            </ThemedText>
            <ThemedText style={[styles.emptyCopy, { color: mutedText }]}>
              Load a public Instagram username to seed the first 18 posts, or add your own photos to start with a blank grid.
              </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={pickPhotos}
              style={({ pressed }) => [styles.emptyAction, { opacity: pressed ? 0.8 : 1 }]}
            >
              <ThemedText style={[styles.emptyActionText, { color: accentBlue }]}>Add photos</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <DraxProvider style={styles.listProvider}>
            <SortableContainer sortable={sortable} scrollRef={listRef} style={styles.listContainer}>
              <FlatList
                ref={listRef}
                data={sortable.data}
                numColumns={GRID_COLUMNS}
                keyExtractor={sortable.stableKeyExtractor}
                onScroll={sortable.onScroll}
                onContentSizeChange={sortable.onContentSizeChange}
                scrollEventThrottle={16}
                initialNumToRender={photos.length}
                windowSize={100}
                maxToRenderPerBatch={photos.length}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                  <SortableItem
                    sortable={sortable}
                    index={index}
                    fixed={item.locked}
                    style={[
                      styles.sortableItem,
                      {
                        width: gridSize,
                        height: gridSize * 1.33,
                        margin: GRID_GAP / 2,
                      },
                    ]}
                    dragReleasedStyle={styles.dragRelease}
                    draggingStyle={styles.dragging}
                    hoverStyle={styles.hover}
                    >
                      <ThemedView
                        style={[
                          styles.tile,
                          {
                            borderColor: tileBorder,
                            backgroundColor: tileBackground,
                          },
                          item.locked ? styles.lockedTile : null,
                        ]}
                      >
                        <Image source={{ uri: item.uri }} style={styles.tileImage} contentFit="cover" />

                        <View style={styles.tileOverlay}>
                          {item.locked ? (
                            <View style={styles.lockedBadge}>
                              <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                            </View>
                          ) : (
                            <Pressable
                              accessibilityLabel="Remove photo"
                              accessibilityRole="button"
                              onPress={() => removePhoto(item.id)}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close" size={16} color="#FFFFFF" />
                            </Pressable>
                          )}
                        </View>
                      </ThemedView>
                    </SortableItem>
                )}
              />
            </SortableContainer>
          </DraxProvider>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'web' ? 16 : 0,
  },
  screen: {
    flex: 1,
    paddingBottom: 16,
  },
  iconButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    gap: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    paddingTop: 12,
    marginLeft: 16,
  },
  statBlock: {
    alignItems: 'center',
    minWidth: 74,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  displayName: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sourceNote: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInputWrap: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  usernamePrefix: {
    fontSize: 15,
    lineHeight: 18,
  },
  usernameInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    paddingVertical: 0,
  },
  loadButton: {
    minWidth: 76,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  loadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 32,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  smallActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightRow: {
    paddingTop: 2,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  highlightItem: {
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  highlightCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightLabel: {
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 72,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginBottom: 2,
  },
  tabItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 36,
    paddingVertical: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyCopy: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyAction: {
    paddingVertical: 6,
  },
  emptyActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  listContent: {
    margin: 'auto',
    paddingBottom: 32,
    paddingHorizontal: 1.5,
  },
  listProvider: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  sortableItem: {
    borderRadius: 0,
  },
  tile: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  lockedTile: {
    opacity: 0.94,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
  },
  lockedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 'auto',
    backgroundColor: 'rgba(17, 20, 24, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 'auto',
    backgroundColor: 'rgba(17, 20, 24, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hover: {
    opacity: 0.96,
  },
  dragging: {
    opacity: 0.55,
  },
  dragRelease: {
    opacity: 0.9,
  },
});
