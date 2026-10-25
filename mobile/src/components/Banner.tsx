import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface Props {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

/** A dismissible notice with one action, shown above a list. */
export function Banner({ message, actionLabel, onAction, onDismiss }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.body}>
        <Text style={styles.message}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
        hitSlop={12}
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.highlightBorder,
    backgroundColor: colors.highlight,
  },
  body: { flex: 1, gap: spacing.sm },
  message: { fontSize: fontSize.small, color: colors.text },
  action: { fontSize: fontSize.small, fontWeight: '700', color: colors.primary },
  dismiss: { paddingHorizontal: spacing.xs },
  dismissText: { fontSize: fontSize.body, color: colors.textMuted },
});
