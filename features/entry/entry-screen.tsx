import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { fetchInstagramProfile } from '@/features/home/api/instagram';
import type { PersistedHomeState } from '@/features/home/types';
import { clearPersistedHomeState, readPersistedHomeState, writePersistedHomeState } from '@/features/home/utils/persistence';
import { formatCount, normalizeUsername } from '@/features/home/utils/profile';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { createEntryScreenStyles } from './styles';

function createProfileSnapshot(profile: Awaited<ReturnType<typeof fetchInstagramProfile>>): PersistedHomeState {
  return {
    version: 1,
    profileName: profile.username,
    displayName: profile.displayName,
    bio: profile.biography,
    avatarUrl: profile.profilePictureUrl,
    postsCount: formatCount(profile.postsCount),
    followers: profile.followers,
    following: profile.following,
    profileLoaded: true,
    profileSource: profile.source ?? '',
    highlights: profile.highlights,
    photos: profile.photos.map((photo) => ({ ...photo, locked: true, source: 'instagram' })),
  };
}

export function EntryScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createEntryScreenStyles(theme), [theme]);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedPersistedState, setHasCheckedPersistedState] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function maybeSkipLanding() {
      try {
        const persisted = await readPersistedHomeState();

        if (persisted && !cancelled) {
          router.replace('/gallery');
          return;
        }
      } catch {
        // If persistence is unavailable for any reason, we fall back to the landing experience.
      } finally {
        if (!cancelled) {
          setHasCheckedPersistedState(true);
        }
      }
    }

    void maybeSkipLanding();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartBlank = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await clearPersistedHomeState();
      router.replace('/gallery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseProfile = async () => {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername || isSubmitting) {
      if (!normalizedUsername) {
        Alert.alert(t('home.alerts.usernameNeededTitle'), t('home.alerts.usernameNeededMessage'));
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await fetchInstagramProfile(normalizedUsername);
      await writePersistedHomeState(createProfileSnapshot(profile));
      router.replace('/gallery');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PROFILE_PRIVATE') {
          Alert.alert(t('home.alerts.privateProfileTitle'), t('home.alerts.privateProfileMessage'));
        } else if (error.message === 'PROFILE_NOT_FOUND') {
          Alert.alert(t('home.alerts.profileNotFoundTitle'), t('home.alerts.profileNotFoundMessage'));
        } else if (error.message === 'EMPTY_USERNAME') {
          Alert.alert(t('home.alerts.usernameNeededTitle'), t('home.alerts.usernameNeededMessage'));
        } else if (error.message === 'PROXY_NOT_CONFIGURED') {
          Alert.alert(t('home.alerts.proxyNotConfiguredTitle'), t('home.alerts.proxyNotConfiguredMessage'));
        } else {
          Alert.alert(t('home.alerts.profileUnavailableTitle'), t('home.alerts.profileUnavailableMessage'));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasCheckedPersistedState) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ThemedView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBar}>
            <View style={styles.brandMark}>
              <Ionicons name="logo-instagram" size={54} color={theme.text} />
            </View>
          </View>

          <View style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.formTitle}>
              {t('entry.title')}
            </ThemedText>
            <ThemedText style={styles.formSubtitle}>{t('entry.subtitle')}</ThemedText>

            <View style={styles.formCard}>
              <ThemedText type="defaultSemiBold" style={styles.formCardTitle}>
                {t('entry.formTitle')}
              </ThemedText>

              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('home.usernamePlaceholder')}
                placeholderTextColor={theme.mutedText}
                returnKeyType="done"
                selectionColor={theme.accent}
                onSubmitEditing={() => void handleUseProfile()}
                style={styles.usernameInput}
              />

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void handleUseProfile()}
                style={({ pressed }) => [styles.primaryButton, pressed || isSubmitting ? styles.buttonPressed : null]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {isSubmitting ? t('home.loading') : t('entry.useProfile')}
                </ThemedText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void handleStartBlank()}
              style={({ pressed }) => [styles.secondaryButton, pressed || isSubmitting ? styles.buttonPressed : null]}
            >
              <ThemedText style={styles.secondaryButtonText}>{t('entry.startBlank')}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}
