import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import type { AppThemeColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { HeaderMenu } from '@/features/home/components/header-menu';
import type { HomeScreenStyles } from '@/features/home/styles';
import type { ProfileHighlight } from '@/features/home/types';

type ProfileHeaderProps = {
  avatarUrl: string;
  bio: string;
  displayName: string;
  highlights: ProfileHighlight[];
  isLoadingProfile: boolean;
  isPicking: boolean;
  onRefreshAddedPhotos: () => void;
  onResetProfile: () => void;
  onStartOver: () => void;
  onPickPhotos: () => void;
  postsCount: string;
  followers: string;
  following: string;
  profileLoaded: boolean;
  profileName: string;
  profileSource: string;
  styles: HomeScreenStyles;
  theme: AppThemeColors;
};

export function ProfileHeader({
  avatarUrl,
  bio,
  displayName,
  followers,
  following,
  highlights,
  isLoadingProfile,
  isPicking,
  onRefreshAddedPhotos,
  onResetProfile,
  onStartOver,
  onPickPhotos,
  postsCount,
  profileLoaded,
  profileName,
  profileSource,
  styles,
  theme,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const stats = [
    { label: t('home.stats.posts'), value: postsCount },
    { label: t('home.stats.followers'), value: followers },
    { label: t('home.stats.following'), value: following },
  ];

  return (
    <View style={styles.header}>
      <HeaderMenu
        onBack={onStartOver}
        onClose={() => setIsMenuVisible(false)}
        onRefresh={onRefreshAddedPhotos}
        onReset={onResetProfile}
        profileLoaded={profileLoaded}
        styles={styles}
        theme={theme}
        visible={isMenuVisible}
      />

      <View style={styles.topBar}>
        <ThemedText type="defaultSemiBold" style={styles.topBarTitle}>
          @{profileName}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.menu.title')}
          onPress={() => setIsMenuVisible(true)}
          style={({ pressed }) => [styles.topBarMenuButton, { opacity: pressed ? 0.72 : 1 }]}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={42} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statBlock}>
              <ThemedText type="defaultSemiBold" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label.toLowerCase()}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.identityCopy}>
        <ThemedText type="defaultSemiBold" style={styles.displayName}>
          {displayName}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{bio}</ThemedText>
        <ThemedText style={styles.linkText}>instagram.com/{profileName}</ThemedText>
        {profileSource === 'profile_html' ? (
          <ThemedText style={styles.sourceNote}>{t('home.sourceNote')}</ThemedText>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPickPhotos}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed || isLoadingProfile ? 0.8 : 1 }]}
        >
          <ThemedText style={styles.primaryButtonText}>{isPicking ? t('home.opening') : t('home.addPhotos')}</ThemedText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightRow}>
        {highlights.map((highlight) => (
          <View key={highlight.id} style={styles.highlightItem}>
            <View style={styles.highlightCircle}>
              <Image source={{ uri: highlight.coverUrl }} style={styles.highlightImage} contentFit="cover" />
            </View>
            <ThemedText numberOfLines={1} style={styles.highlightLabel}>
              {highlight.title}
            </ThemedText>
          </View>
        ))}

        <View style={styles.highlightItem}>
          <View style={styles.highlightCircle}>
            <Ionicons name="add" size={32} color={theme.mutedText} />
          </View>
          <ThemedText style={styles.highlightLabel}>{t('home.newHighlight')}</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}
