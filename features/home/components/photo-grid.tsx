import { useRef } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  DraxProvider,
  SortableContainer,
  SortableItem,
  type SortableListHandle,
} from 'react-native-drax';

import { GRID_COLUMNS, GRID_GAP } from '@/features/home/constants';
import type { HomeScreenStyles } from '@/features/home/styles';
import type { GalleryPhoto } from '@/features/home/types';

type PhotoGridProps = {
  gridSize: number;
  onRemovePhoto: (photoId: string) => void;
  photos: GalleryPhoto[];
  sortable: SortableListHandle<GalleryPhoto>;
  styles: HomeScreenStyles;
};

export function PhotoGrid({ gridSize, onRemovePhoto, photos, sortable, styles }: PhotoGridProps) {
  const listRef = useRef<FlatList<GalleryPhoto>>(null);

  return (
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
              <View style={[styles.tile, item.locked ? styles.lockedTile : null]}>
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
                      onPress={() => onRemovePhoto(item.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>
              </View>
            </SortableItem>
          )}
        />
      </SortableContainer>
    </DraxProvider>
  );
}
