import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import type { AppThemeColors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import type { HomeScreenStyles } from '@/features/home/styles';
import type { ProfileHighlight } from '@/features/home/types';

type ProfileHeaderProps = {
  avatarUrl: string;
  bio: string;
  displayName: string;
  highlights: ProfileHighlight[];
  isLoadingProfile: boolean;
  isPicking: boolean;
  onLoadProfile: () => void;
  onPickPhotos: () => void;
  postsCount: string;
  followers: string;
  following: string;
  profileLoaded: boolean;
  profileName: string;
  profileSource: string;
  setUsernameInput: (value: string) => void;
  styles: HomeScreenStyles;
  theme: AppThemeColors;
  usernameInput: string;
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
  onLoadProfile,
  onPickPhotos,
  postsCount,
  profileLoaded,
  profileName,
  profileSource,
  setUsernameInput,
  styles,
  theme,
  usernameInput,
}: ProfileHeaderProps) {
  const stats = [
    { label: 'Posts', value: postsCount },
    { label: 'Followers', value: followers },
    { label: 'Following', value: following },
  ];

  return (
    <View style={styles.header}>
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
          <ThemedText style={styles.sourceNote}>
            Loaded from public profile HTML. Stats and avatar are available, but recent images may be limited.
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.usernameRow}>
        <View style={styles.usernameInputWrap}>
          <ThemedText style={styles.usernamePrefix}>@</ThemedText>
          <TextInput
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="instagram username"
            placeholderTextColor={theme.mutedText}
            selectionColor={theme.accent}
            style={styles.usernameInput}
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPickPhotos}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed || isLoadingProfile ? 0.8 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>{isPicking ? 'Opening...' : 'Add photos'}</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onLoadProfile}
          style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.78 : 1 }]}
        >
          <ThemedText style={styles.buttonText}>
            {isLoadingProfile ? 'Loading' : profileLoaded ? 'Refresh profile' : 'Try profile'}
          </ThemedText>
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
          <ThemedText style={styles.highlightLabel}>New</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}
