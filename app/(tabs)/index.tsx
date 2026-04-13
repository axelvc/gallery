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
    { label: 'Layout', value: `${GRID_COLUMNS}x grid` },
    { label: 'Mode', value: 'Drag sort' },
  ];

  const isDark = colorScheme === 'dark';
  const tileBackground = isDark ? '#16181D' : '#F3F5F7';
  const tileBorder = isDark ? '#2A2F3A' : '#E3E8EE';
  const accentBackground = isDark ? '#F2F5F8' : '#111418';
  const accentText = isDark ? '#111418' : '#FFFFFF';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ThemedView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isDark ? '#20242C' : '#E8EDF2', borderColor: tileBorder },
              ]}
            >
              <Ionicons
                name="images-outline"
                size={28}
                color={isDark ? '#F7F8FA' : '#111418'}
              />
            </View>

            <View style={styles.identityCopy}>
              <ThemedText type="title" style={styles.title}>
                Gallery Grid
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Pick photos from your library, then long-press and drag to reorder them like a
                profile gallery.
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <ThemedView
                key={stat.label}
                style={[styles.statCard, { borderColor: tileBorder, backgroundColor: tileBackground }]}
              >
                <ThemedText type="defaultSemiBold" style={styles.statValue}>
                  {stat.value}
                </ThemedText>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
              </ThemedView>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={pickPhotos}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accentBackground, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Ionicons name="add" size={18} color={accentText} />
              <ThemedText style={[styles.primaryButtonText, { color: accentText }]}>
                {isPicking ? 'Opening library...' : 'Add photos'}
              </ThemedText>
            </Pressable>

            <ThemedView
              style={[styles.helperPill, { borderColor: tileBorder, backgroundColor: tileBackground }]}
            >
              <Ionicons
                name="hand-left-outline"
                size={16}
                color={isDark ? '#F7F8FA' : '#111418'}
              />
              <ThemedText style={styles.helperText}>
                Long-press a tile to move it
              </ThemedText>
            </ThemedView>
          </View>
        </View>

        {photos.length === 0 ? (
          <ThemedView
            style={[styles.emptyState, { borderColor: tileBorder, backgroundColor: tileBackground }]}
          >
            <Ionicons name="image-outline" size={40} color={isDark ? '#F7F8FA' : '#111418'} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Your profile grid starts here
            </ThemedText>
            <ThemedText style={styles.emptyCopy}>
              Add a few photos from your gallery to build the feed, then drag them into the order
              you want.
            </ThemedText>
          </ThemedView>
        ) : (
          <DraxProvider>
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
                        <View style={[styles.dragBadge, { backgroundColor: 'rgba(17, 20, 24, 0.62)' }]}>
                          <Ionicons name="reorder-three-outline" size={16} color="#FFFFFF" />
                        </View>

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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    gap: 18,
    paddingBottom: 18,
  },
  identityRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  identityCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    opacity: 0.72,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.65,
  },
  actionsRow: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  helperPill: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  helperText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyCopy: {
    textAlign: 'center',
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContainer: {
    flex: 1,
  },
  sortableItem: {
    borderRadius: 22,
  },
  tile: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dragBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
