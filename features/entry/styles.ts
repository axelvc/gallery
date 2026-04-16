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
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: Layout.spacing.xl,
      gap: Layout.spacing.xxl,
    },
    heroBlock: {
      gap: Layout.spacing.sm,
    },
    title: {
      textAlign: 'center',
      color: theme.text,
    },
    subtitle: {
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 22,
      color: theme.mutedText,
    },
    optionsBlock: {
      gap: Layout.spacing.md,
    },
    primaryOption: {
      gap: Layout.spacing.xs,
      borderRadius: Layout.radius.lg,
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.xl,
      backgroundColor: theme.accent,
    },
    secondaryOption: {
      gap: Layout.spacing.xs,
      borderRadius: Layout.radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.xl,
      backgroundColor: theme.actionSurface,
    },
    optionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '700',
      color: theme.text,
    },
    optionCopy: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.mutedText,
    },
    formCard: {
      gap: Layout.spacing.md,
      borderRadius: Layout.radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Layout.spacing.lg,
      backgroundColor: theme.card,
    },
    formTitle: {
      color: theme.text,
    },
    usernameInput: {
      minHeight: 48,
      borderRadius: Layout.radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: Layout.spacing.md,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.actionSurface,
    },
    submitButton: {
      minHeight: 46,
      borderRadius: Layout.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accent,
    },
    submitButtonText: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: theme.text,
    },
  });
}
