import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/** Empty list placeholder with a call to action (FR-7.1). */
export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Button label={actionLabel} onPress={onAction} />
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
  title: { fontSize: fontSize.title, fontWeight: '600', color: colors.text, textAlign: 'center' },
  message: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
});
