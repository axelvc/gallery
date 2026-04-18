import { useMemo, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DraxProvider, DraxScrollView } from 'react-native-drax';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedView } from '@/components/themed-view';
import { EmptyGalleryState } from '@/features/home/components/empty-gallery-state';
import { PhotoGrid } from '@/features/home/components/photo-grid';
import { ProfileHeader } from '@/features/home/components/profile-header';
import { GRID_COLUMNS, GRID_GAP } from '@/features/home/constants';
import { useHomeScreen } from '@/features/home/hooks/use-home-screen';
import { createHomeScreenStyles } from '@/features/home/styles';
import { clearPersistedHomeState } from '@/features/home/utils/persistence';

export function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const { width } = useWindowDimensions();
  const theme = Colors[colorScheme];
  const styles = useMemo(() => createHomeScreenStyles(theme), [theme]);
  const {
    avatarUrl,
    bio,
    displayName,
    followers,
    following,
    hasPhotos,
    highlights,
    isLoadingProfile,
    isPicking,
    photos,
    postsCount,
    profileLoaded,
    profileName,
    profileSource,
    removePhoto,
    refreshAddedPhotos,
    sortable,
    loadProfile,
    pickPhotos,
  } = useHomeScreen();

  const gridSize = useMemo(() => {
    const horizontalPadding = 0;
    return Math.floor((width - horizontalPadding) / GRID_COLUMNS - GRID_GAP);
  }, [width]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ThemedView style={styles.screen}>
        <DraxProvider>
          <DraxScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={sortable.onContentSizeChange}
            onScroll={sortable.onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <ProfileHeader
              avatarUrl={avatarUrl}
              bio={bio}
              displayName={displayName}
              followers={followers}
              following={following}
              highlights={highlights}
              isLoadingProfile={isLoadingProfile}
              isPicking={isPicking}
              onRefreshAddedPhotos={refreshAddedPhotos}
              onResetProfile={() => void loadProfile(profileName)}
              onStartOver={() =>
                void (async () => {
                  try {
                    await clearPersistedHomeState();
                  } finally {
                    router.replace('/');
                  }
                })()
              }
              onPickPhotos={pickPhotos}
              postsCount={postsCount}
              profileLoaded={profileLoaded}
              profileName={profileName}
              profileSource={profileSource}
              styles={styles}
              theme={theme}
            />

            <View style={styles.tabBar}>
              <View style={styles.tabItemActive}>
                <Ionicons name="grid-outline" size={22} color={theme.text} />
              </View>
              <View style={styles.tabItem}>
                <Ionicons name="bookmark-outline" size={22} color={theme.mutedText} />
              </View>
              <View style={styles.tabItem}>
                <Ionicons name="person-circle-outline" size={24} color={theme.mutedText} />
              </View>
            </View>

            {hasPhotos ? (
              <PhotoGrid
                gridSize={gridSize}
                onRemovePhoto={removePhoto}
                photos={photos}
                scrollRef={scrollRef}
                sortable={sortable}
                styles={styles}
              />
            ) : (
              <EmptyGalleryState onPickPhotos={pickPhotos} styles={styles} theme={theme} />
            )}
          </DraxScrollView>
        </DraxProvider>
      </ThemedView>
    </SafeAreaView>
  );
}
