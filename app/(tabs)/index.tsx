import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
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
  photos: GalleryPhoto[];
};

const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const DEFAULT_USERNAME = '';
const DEFAULT_PROXY_BASE_URL = 'http://localhost:8787';

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (movedItem === undefined) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

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
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSource, setProfileSource] = useState('');

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
    onDragEnd: ({ index, toIndex, cancelled }) => {
      if (cancelled || typeof toIndex !== 'number' || toIndex === index) {
        return;
      }

      setPhotos((current) => {
        const { unlocked, locked } = splitPhotosByLock(current);
        const lastUnlockedIndex = unlocked.length - 1;

        if (index < 0 || index > lastUnlockedIndex || lastUnlockedIndex < 0) {
          return current;
        }

        const nextUnlockedIndex = Math.max(0, Math.min(toIndex, lastUnlockedIndex));

        if (nextUnlockedIndex === index) {
          return current;
        }

        return mergePhotos(moveItem(unlocked, index, nextUnlockedIndex), locked);
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
    void loadProfile(DEFAULT_USERNAME);
  }, [loadProfile]);

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
            uri: asset.uri,
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

          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <View style={[styles.highlightCircle, { borderColor: '#3A3A3A', backgroundColor: '#1A1A1A' }]}>
                <Ionicons name="add" size={32} color={mutedText} />
              </View>
              <ThemedText style={[styles.highlightLabel, { color: actionText }]}>New</ThemedText>
            </View>
          </View>
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
  },
  highlightLabel: {
    fontSize: 12,
    lineHeight: 16,
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
