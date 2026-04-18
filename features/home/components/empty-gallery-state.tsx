import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { AppThemeColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import type { HomeScreenStyles } from '@/features/home/styles';

type EmptyGalleryStateProps = {
  onPickPhotos: () => void;
  styles: HomeScreenStyles;
  theme: AppThemeColors;
};

export function EmptyGalleryState({ onPickPhotos, styles, theme }: EmptyGalleryStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="images-outline" size={30} color={theme.text} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {t('home.emptyTitle')}
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onPickPhotos} style={({ pressed }) => [styles.emptyAction, { opacity: pressed ? 0.8 : 1 }]}> 
        <ThemedText style={styles.emptyActionText}>{t('home.addPhotos')}</ThemedText>
      </Pressable>
    </View>
  );
}
