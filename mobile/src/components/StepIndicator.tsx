import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const STEPS = ['Describe', 'Design', 'Words', 'Preview'] as const;

interface Props {
  /** 0-based index into the card-making steps. */
  current: number;
}

/** Where the user is in the card flow. Display only; the back arrow moves between steps. */
export function StepIndicator({ current }: Props) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}
    >
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.bar, (done || active) && styles.barOn]} />
            <Text style={[styles.label, active && styles.labelActive, done && styles.labelDone]}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  step: { flex: 1, gap: spacing.xs },
  bar: { height: 4, borderRadius: radius.pill, backgroundColor: colors.border },
  barOn: { backgroundColor: colors.primary },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  labelActive: { color: colors.primary },
  labelDone: { color: colors.text },
});
