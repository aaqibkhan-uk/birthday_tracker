import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSize, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** A friendly emoji above the title (decorative). */
  icon?: string;
}

/** Empty list placeholder with a call to action (FR-7.1). */
export function EmptyState({ title, message, actionLabel, onAction, icon = '🎈' }: Props) {
  return (
    <View style={styles.container}>
      <View
        style={styles.iconCircle}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.action}>
        <Button label={actionLabel} onPress={onAction} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 44 },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.heading,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
