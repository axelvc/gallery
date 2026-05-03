import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { SortableItem } from 'react-native-drax';

import { GRID_GAP } from '@/features/home/constants';
import type { useHomeScreen } from '@/features/home/hooks/use-home-screen';
import type { HomeScreenStyles } from '@/features/home/styles';
import type { GalleryPhoto } from '@/features/home/types';

type GalleryGridItemProps = {
  gridSize: number;
  index: number;
  item: GalleryPhoto;
  onRemovePhoto: ReturnType<typeof useHomeScreen>['removePhoto'];
  removePhotoLabel: string;
  sortable: ReturnType<typeof useHomeScreen>['sortable'];
  styles: HomeScreenStyles;
};

export function GalleryGridItem({
  gridSize,
  index,
  item,
  onRemovePhoto,
  removePhotoLabel,
  sortable,
  styles,
}: GalleryGridItemProps) {
  return (
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
    >
      <View style={[styles.tile, item.locked ? styles.lockedTile : null]}>
        <Image
          source={{ uri: item.uri }}
          style={styles.tileImage}
          contentFit="cover"
          transition={0}
          recyclingKey={item.id}
        />

        <View style={styles.tileOverlay}>
          {item.locked ? (
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
            </View>
          ) : (
            <Pressable
              accessibilityLabel={removePhotoLabel}
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
  );
}
