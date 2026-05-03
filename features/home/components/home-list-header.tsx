import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { ProfileHeader } from '@/features/home/components/profile-header';
import type { useHomeScreen } from '@/features/home/hooks/use-home-screen';
import type { HomeScreenStyles } from '@/features/home/styles';
import { clearPersistedHomeState } from '@/features/home/utils/persistence';

type HomeScreenState = ReturnType<typeof useHomeScreen>;

type HomeListHeaderProps = Pick<
  HomeScreenState,
  | 'avatarUrl'
  | 'bio'
  | 'displayName'
  | 'followers'
  | 'following'
  | 'highlights'
  | 'isLoadingProfile'
  | 'isPicking'
  | 'loadProfile'
  | 'pickPhotos'
  | 'postsCount'
  | 'profileLoaded'
  | 'profileName'
  | 'profileSource'
  | 'refreshAddedPhotos'
> & {
  styles: HomeScreenStyles;
  theme: AppThemeColors;
};

export function HomeListHeader({
  avatarUrl,
  bio,
  displayName,
  followers,
  following,
  highlights,
  isLoadingProfile,
  isPicking,
  loadProfile,
  pickPhotos,
  postsCount,
  profileLoaded,
  profileName,
  profileSource,
  refreshAddedPhotos,
  styles,
  theme,
}: HomeListHeaderProps) {
  return (
    <View>
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
    </View>
  );
}
