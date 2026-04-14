import { Platform, StyleSheet } from 'react-native';

import { AppThemeColors, Layout } from '@/constants/theme';

export function createHomeScreenStyles(theme: AppThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      marginTop: Platform.OS === 'web' ? Layout.sizes.safeAreaTopWeb : 0,
      backgroundColor: theme.background,
    },
    screen: {
      flex: 1,
      paddingBottom: Layout.spacing.lg,
      backgroundColor: theme.background,
    },
    header: {
      gap: 14,
      paddingHorizontal: Layout.spacing.lg,
      paddingBottom: 18,
    },
    identityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    avatar: {
      width: Layout.sizes.avatarOuter,
      height: Layout.sizes.avatarOuter,
      borderRadius: Layout.sizes.avatarOuter / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.avatarShell,
    },
    avatarInner: {
      width: Layout.sizes.avatarInner,
      height: Layout.sizes.avatarInner,
      borderRadius: Layout.sizes.avatarInner / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.avatarFallback,
    },
    avatarImage: {
      width: Layout.sizes.avatarInner,
      height: Layout.sizes.avatarInner,
      borderRadius: Layout.sizes.avatarInner / 2,
    },
    statsRow: {
      alignSelf: 'center',
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-evenly',
      paddingTop: Layout.spacing.md,
      marginLeft: Layout.spacing.lg,
    },
    statBlock: {
      alignItems: 'center',
      minWidth: 74,
    },
    statValue: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 14,
      lineHeight: 18,
      color: theme.text,
    },
    identityCopy: {
      gap: Layout.spacing.xxs,
    },
    displayName: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.mutedText,
    },
    linkText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: theme.accent,
    },
    sourceNote: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: Layout.spacing.xs,
      color: theme.mutedText,
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    usernameInputWrap: {
      flex: 1,
      minHeight: Layout.sizes.inputHeight,
      borderRadius: Layout.radius.md,
      borderWidth: 1,
      paddingHorizontal: Layout.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.xxs,
      backgroundColor: theme.actionSurface,
      borderColor: theme.border,
    },
    usernamePrefix: {
      fontSize: 15,
      lineHeight: 18,
      color: theme.mutedText,
    },
    usernameInput: {
      flex: 1,
      fontSize: 15,
      lineHeight: 18,
      paddingVertical: 0,
      color: theme.text,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Layout.spacing.sm,
    },
    primaryButton: {
      flex: 1,
      minHeight: Layout.sizes.actionButtonHeight,
      borderRadius: Layout.radius.sm,
      paddingHorizontal: Layout.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
    secondaryButton: {
      flex: 1,
      minHeight: Layout.sizes.actionButtonHeight,
      borderRadius: Layout.radius.sm,
      paddingHorizontal: Layout.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.actionSurface,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
      color: theme.text,
    },
    highlightRow: {
      paddingTop: Layout.spacing.xxs,
      paddingBottom: Layout.spacing.xs,
      flexDirection: 'row',
    },
    highlightItem: {
      alignItems: 'center',
      width: Layout.sizes.highlightItemWidth,
      gap: 6,
    },
    highlightCircle: {
      width: Layout.sizes.highlight,
      height: Layout.sizes.highlight,
      borderRadius: Layout.radius.round,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderColor: theme.border,
      backgroundColor: theme.highlightSurface,
    },
    highlightImage: {
      width: '100%',
      height: '100%',
    },
    highlightLabel: {
      fontSize: 12,
      lineHeight: 16,
      maxWidth: Layout.sizes.highlightItemWidth,
      textAlign: 'center',
      color: theme.text,
    },
    tabBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginBottom: Layout.spacing.xxs,
    },
    tabItem: {
      flex: 1,
      height: Layout.sizes.tabHeight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabItemActive: {
      flex: 1,
      height: Layout.sizes.tabHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.text,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Layout.spacing.md,
      paddingHorizontal: 36,
      paddingVertical: Layout.spacing.xl,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    emptyIconCircle: {
      width: Layout.sizes.emptyCircle,
      height: Layout.sizes.emptyCircle,
      borderRadius: Layout.sizes.emptyCircle / 2,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      textAlign: 'center',
      color: theme.text,
    },
    emptyCopy: {
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      color: theme.mutedText,
    },
    emptyAction: {
      paddingVertical: 6,
    },
    emptyActionText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: theme.accent,
    },
    listContent: {
      margin: 'auto',
      paddingBottom: Layout.spacing.xxl,
      paddingHorizontal: 1.5,
    },
    listProvider: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    sortableItem: {
      borderRadius: 0,
    },
    tile: {
      flex: 1,
      borderRadius: 0,
      overflow: 'hidden',
      borderColor: theme.border,
      backgroundColor: theme.tileSurface,
    },
    lockedTile: {
      opacity: 0.94,
    },
    tileImage: {
      width: '100%',
      height: '100%',
    },
    tileOverlay: {
      ...StyleSheet.absoluteFillObject,
      padding: Layout.spacing.sm,
    },
    lockedBadge: {
      width: Layout.sizes.overlayButton,
      height: Layout.sizes.overlayButton,
      borderRadius: Layout.sizes.overlayButton / 2,
      marginLeft: 'auto',
      backgroundColor: theme.overlaySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeButton: {
      width: Layout.sizes.overlayButton,
      height: Layout.sizes.overlayButton,
      borderRadius: Layout.sizes.overlayButton / 2,
      marginLeft: 'auto',
      backgroundColor: theme.overlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hover: {
      opacity: 0.96,
    },
    dragging: {
      opacity: 0.55,
    },
    dragRelease: {
      opacity: 0.9,
    },
  });
}

export type HomeScreenStyles = ReturnType<typeof createHomeScreenStyles>;
