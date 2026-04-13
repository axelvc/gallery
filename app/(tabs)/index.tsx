import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
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
};

const GRID_COLUMNS = 3;
const GRID_GAP = 6;

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

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  const gridSize = useMemo(() => {
    const horizontalPadding = 32;

    return Math.floor((width - horizontalPadding) / GRID_COLUMNS - GRID_GAP);
  }, [width]);

  const sortable = useSortableList({
    data: photos,
    numColumns: GRID_COLUMNS,
    keyExtractor: (item) => item.id,
    onReorder: ({ data }) => setPhotos([...data]),
    onDragEnd: ({ index, toIndex, cancelled }) => {
      if (cancelled || typeof toIndex !== 'number' || toIndex === index) {
        return;
      }

      setPhotos((current) => moveItem(current, index, toIndex));
    },
  });

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
        }));

      setPhotos((current) => [...current, ...nextPhotos]);
    } catch {
      Alert.alert('Unable to open gallery', 'Please try picking your photos again.');
    } finally {
      setIsPicking(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  };

  const stats = [
    { label: 'Posts', value: photos.length.toString() },
    { label: 'Followers', value: '0' },
    { label: 'Following', value: '0' },
  ];

  const isDark = colorScheme === 'dark';
  const screenBackground = isDark ? '#000000' : '#FAFAFA';
  const cardBackground = isDark ? '#121212' : '#FFFFFF';
  const tileBackground = isDark ? '#101214' : '#F3F5F7';
  const tileBorder = isDark ? '#262626' : '#DBDBDB';
  const mutedText = isDark ? '#A8A8A8' : '#737373';
  const actionBackground = isDark ? '#262626' : '#EFEFEF';
  const actionText = isDark ? '#F5F5F5' : '#111111';
  const accentBlue = '#0095F6';
  const profileName = 'duck.1110358';
  const displayName = 'Duck Gallery';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: screenBackground }]}>
      <ThemedView style={[styles.screen, { backgroundColor: screenBackground }]}>
        <View style={styles.topBar}>
          <View style={styles.topBarTitleRow}>
            <ThemedText type="defaultSemiBold" style={styles.topBarTitle}>
              {profileName}
            </ThemedText>
            <Ionicons name="chevron-down" size={16} color={actionText} />
          </View>

          <View style={styles.topBarActions}>
            <Pressable accessibilityRole="button" onPress={pickPhotos} style={styles.iconButton}>
              <Ionicons name="add-circle-outline" size={24} color={actionText} />
            </Pressable>
            <View style={styles.iconButton}>
              <Ionicons name="menu-outline" size={24} color={actionText} />
            </View>
          </View>
        </View>

        <View style={styles.header}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isDark ? '#1F1F1F' : '#E8EDF2', borderColor: tileBorder },
              ]}
            >
              <View style={[styles.avatarInner, { backgroundColor: isDark ? '#8E8E8E' : '#C7C7C7' }]}>
                <Ionicons name="person" size={42} color={isDark ? '#F5F5F5' : '#FFFFFF'} />
              </View>
              <View style={[styles.avatarBadge, { backgroundColor: cardBackground, borderColor: tileBorder }]}>
                <Ionicons name="camera-outline" size={18} color={actionText} />
              </View>
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
              Curate your photos in profile order. Add images from your library, then long-press
              any tile to move it around the grid.
            </ThemedText>
            <ThemedText style={[styles.linkText, { color: accentBlue }]}>gallery.dev/profile</ThemedText>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: actionBackground, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: actionText }]}>Edit profile</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={pickPhotos}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: actionBackground, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: actionText }]}> 
                {isPicking ? 'Opening...' : 'Add photos'}
              </ThemedText>
            </Pressable>

            <View style={[styles.smallActionButton, { backgroundColor: actionBackground }]}>
              <Ionicons name="archive-outline" size={18} color={actionText} />
            </View>
          </View>

          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <View style={[styles.highlightCircle, { borderColor: '#3A3A3A', backgroundColor: '#1A1A1A' }]}>
                <Ionicons name="add" size={32} color={mutedText} />
              </View>
              <ThemedText style={styles.highlightLabel}>New</ThemedText>
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
              Add photos to fill the profile grid, then drag them into the order you want.
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
                    style={[
                      styles.sortableItem,
                      {
                        width: gridSize,
                        height: gridSize,
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
                      ]}
                    >
                      <Image source={{ uri: item.uri }} style={styles.tileImage} contentFit="cover" />

                      <View style={styles.tileOverlay}>
                        <Pressable
                          accessibilityLabel="Remove photo"
                          accessibilityRole="button"
                          onPress={() => removePhoto(item.id)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </Pressable>
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
  },
  screen: {
    flex: 1,
    paddingBottom: 16,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
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
