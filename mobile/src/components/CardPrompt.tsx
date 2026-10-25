import { StyleSheet, Text, View } from 'react-native';
import { getEstimatedDelivery } from '../domain/delivery';
import { formatDaysUntil, formatLongDate } from '../domain/format';
import type { CardPrompt as CardPromptData } from '../domain/schedule';
import { colors, fonts, fontSize, radius, shadow, spacing } from '../theme';
import { Button } from './Button';

interface Props {
  name: string;
  prompt: CardPromptData;
  now: Date;
  actionLabel: string;
  onAction: () => void;
}

/** FR-3.4 / FR-3.5: nudges the user to make a card, warning if it cannot arrive in time (FR-6.2). */
export function CardPrompt({ name, prompt, now, actionLabel, onAction }: Props) {
  const when =
    prompt.daysUntil === 0 ? 'is today' : `is ${formatDaysUntil(prompt.daysUntil).toLowerCase()}`;
  return (
    <View style={styles.prompt}>
      <Text style={styles.emoji} importantForAccessibility="no" accessibilityElementsHidden>
        💌
      </Text>
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
      <Button label={actionLabel} onPress={onAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    gap: spacing.sm,
    ...shadow.card,
  },
  emoji: { fontSize: 32 },
  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.title + 2,
    fontWeight: '700',
    color: colors.text,
  },
  text: { fontSize: fontSize.body, color: colors.text, marginBottom: spacing.xs },
  warning: {
    fontSize: fontSize.small,
    color: colors.error,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
    lineHeight: 20,
  },
});
