import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, animationDuration: 220 }}>
          <Stack.Screen
            name="index"
            options={{
              // Makes `router.replace('/')` feel like a natural back/pop.
              animationTypeForReplace: 'pop',
            }}
          />
          <Stack.Screen
            name="gallery"
            options={{
              animation: 'slide_from_right',
              // Makes `router.replace('/gallery')` feel like a normal push.
              animationTypeForReplace: 'push',
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
