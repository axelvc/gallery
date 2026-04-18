import { StyleSheet } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { Layout } from '@/constants/theme';

export function createEntryScreenStyles(theme: AppThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoid: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      backgroundColor: theme.background,
    },
    brandBar: {
      paddingTop: Layout.spacing.xxl,
      paddingBottom: Layout.spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    brandMark: {
      width: 84,
      height: 84,
      borderRadius: Layout.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.actionSurface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    formSection: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Layout.spacing.xl,
      paddingVertical: Layout.spacing.xxl,
      gap: Layout.spacing.lg,
    },
    formCard: {
      gap: Layout.spacing.md,
      marginVertical: 'auto',
    },
    formTitle: {
      color: theme.text,
      fontSize: 22,
      lineHeight: 28,
      textAlign: 'center',
    },
    formSubtitle: {
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
      color: theme.mutedText,
    },
    formCardTitle: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
    },
    usernameInput: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Layout.spacing.md,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.actionSurface,
    },
    primaryButton: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
    primaryButtonText: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    secondaryButton: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.actionSurface,
      marginTop: 'auto',
    },
    secondaryButtonText: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: theme.text,
    },
    buttonPressed: {
      opacity: 0.86,
    },
  });
}
