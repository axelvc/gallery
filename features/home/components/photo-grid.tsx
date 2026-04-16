import type { RefObject } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
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
  scrollRef: RefObject<ScrollView | null>;
  sortable: SortableListHandle<GalleryPhoto>;
  styles: HomeScreenStyles;
};

export function PhotoGrid({ gridSize, onRemovePhoto, photos, scrollRef, sortable, styles }: PhotoGridProps) {
  return (
    <DraxProvider style={styles.listProvider}>
      <SortableContainer sortable={sortable} scrollRef={scrollRef} style={styles.listContainer}>
        <View style={styles.listContent}>
          {sortable.data.map((item, index) => (
            <SortableItem
              key={sortable.stableKeyExtractor(item, index)}
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
          ))}
        </View>
      </SortableContainer>
    </DraxProvider>
  );
}
