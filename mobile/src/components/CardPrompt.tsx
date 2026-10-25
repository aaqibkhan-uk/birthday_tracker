import { StyleSheet, Text, View } from 'react-native';
import { getEstimatedDelivery } from '../domain/delivery';
import { formatDaysUntil, formatLongDate } from '../domain/format';
import type { CardPrompt as CardPromptData } from '../domain/schedule';
import { colors, fontSize, radius, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  name: string;
  prompt: CardPromptData;
  now: Date;
}

/** FR-3.4 / FR-3.5: nudges the user to make a card, warning if it cannot arrive in time (FR-6.2). */
export function CardPrompt({ name, prompt, now }: Props) {
  const when =
    prompt.daysUntil === 0 ? 'is today' : `is ${formatDaysUntil(prompt.daysUntil).toLowerCase()}`;
  return (
    <View style={styles.prompt}>
      <Text style={styles.title} accessibilityRole="header">
        {name}&apos;s birthday {when}
      </Text>
      <Text style={styles.text}>Make them a personalised card.</Text>
      {!prompt.canArriveInTime && (
        <Text style={styles.warning}>
          A card ordered now should arrive {formatLongDate(getEstimatedDelivery(now))}, after their
          birthday. You can still send one.
        </Text>
      )}
      {/* Card creation is built in Milestone 3. */}
      <Button label="Create card (coming soon)" onPress={() => {}} disabled />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  text: { fontSize: fontSize.body, color: colors.text },
  warning: { fontSize: fontSize.small, color: colors.error },
});
