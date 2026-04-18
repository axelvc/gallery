import { Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppThemeColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import type { HomeScreenStyles } from '@/features/home/styles';

type HeaderMenuProps = {
  onBack: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onReset: () => void;
  profileLoaded: boolean;
  styles: HomeScreenStyles;
  theme: AppThemeColors;
  visible: boolean;
};

type MenuAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

export function HeaderMenu({
  onBack,
  onClose,
  onRefresh,
  onReset,
  profileLoaded,
  styles,
  theme,
  visible,
}: HeaderMenuProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const actions: MenuAction[] = [
    {
      icon: 'sparkles-outline',
      label: String(t('home.menu.refresh')),
      onPress: onRefresh,
    },
  ];

  if (profileLoaded) {
    actions.push({
      icon: 'refresh-outline',
      label: String(t('home.menu.reset')),
      onPress: onReset,
    });
  }

  actions.push({
    icon: 'arrow-back-outline',
    label: String(t('home.menu.back')),
    onPress: onBack,
    tone: 'danger',
  });

  const handleAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.menuSafeArea}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.menuBackdrop}>
          <Pressable
            accessibilityRole="menu"
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.menuSurface,
              isCompact ? styles.menuSurfaceCompact : styles.menuSurfaceWide,
            ]}
          >
            <View style={styles.menuHeader}>
              <ThemedText type="defaultSemiBold" style={styles.menuTitle}>
                {t('home.menu.title')}
              </ThemedText>
              <ThemedText style={styles.menuSubtitle}>{t('home.menu.subtitle')}</ThemedText>
            </View>

            <View style={styles.menuActionList}>
              {actions.map((action, index) => {
                const isDanger = action.tone === 'danger';

                return (
                  <Pressable
                    key={action.label}
                    accessibilityRole="menuitem"
                    onPress={() => handleAction(action.onPress)}
                    style={({ pressed }) => [
                      styles.menuAction,
                      index < actions.length - 1 ? styles.menuActionBorder : null,
                      pressed ? styles.menuActionPressed : null,
                    ]}
                  >
                    <View style={[styles.menuActionIcon, isDanger ? styles.menuActionIconDanger : null]}>
                      <Ionicons
                        color={isDanger ? theme.destructive : theme.text}
                        name={action.icon}
                        size={18}
                      />
                    </View>
                    <ThemedText style={[styles.menuActionLabel, isDanger ? styles.menuActionLabelDanger : null]}>
                      {action.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.menuDismissButton, pressed ? styles.menuActionPressed : null]}>
              <ThemedText style={styles.menuDismissText}>{t('home.menu.cancel')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
