import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AppThemeColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import type { HomeScreenStyles } from '@/features/home/styles';

type EmptyGalleryStateProps = {
  onPickPhotos: () => void;
  styles: HomeScreenStyles;
  theme: AppThemeColors;
};

export function EmptyGalleryState({ onPickPhotos, styles, theme }: EmptyGalleryStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="images-outline" size={30} color={theme.text} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        Share your first photo
      </ThemedText>
      <ThemedText style={styles.emptyCopy}>
        Load a public Instagram username to seed the first 18 posts, or add your own photos to start with a blank grid.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onPickPhotos} style={({ pressed }) => [styles.emptyAction, { opacity: pressed ? 0.8 : 1 }]}>
        <ThemedText style={styles.emptyActionText}>Add photos</ThemedText>
      </Pressable>
    </View>
  );
}
