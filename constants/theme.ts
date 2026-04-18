/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FAFAFA',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#737373',
    tabIconSelected: tintColorLight,
    mutedText: '#737373',
    border: '#DBDBDB',
    card: '#FFFFFF',
    actionSurface: '#EFEFEF',
    tileSurface: '#F3F5F7',
    avatarShell: '#E8EDF2',
    avatarFallback: '#C7C7C7',
    highlightSurface: '#F1F1F1',
    accent: '#0095F6',
    destructive: '#E5484D',
    overlay: 'rgba(17, 20, 24, 0.72)',
    overlaySoft: 'rgba(17, 20, 24, 0.30)',
  },
  dark: {
    text: '#F5F5F5',
    background: '#000000',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    mutedText: '#A8A8A8',
    border: '#262626',
    card: '#000000',
    actionSurface: '#262626',
    tileSurface: '#101214',
    avatarShell: '#1F1F1F',
    avatarFallback: '#8E8E8E',
    highlightSurface: '#1A1A1A',
    accent: '#0095F6',
    destructive: '#FF5A5F',
    overlay: 'rgba(17, 20, 24, 0.72)',
    overlaySoft: 'rgba(17, 20, 24, 0.30)',
  },
};

export type AppThemeColors = typeof Colors.light;

export const Layout = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 10,
    lg: 15,
    round: 31,
    full: 999,
  },
  sizes: {
    safeAreaTopWeb: 16,
    avatarOuter: 86,
    avatarInner: 78,
    highlight: 62,
    highlightItemWidth: 72,
    emptyCircle: 72,
    overlayButton: 30,
    tabHeight: 44,
    actionButtonHeight: 32,
    inputHeight: 40,
    iconButton: 26,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
