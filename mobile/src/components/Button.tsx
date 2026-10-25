import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text
        style={[styles.label, variant === 'primary' ? styles.labelOnPrimary : labelColor(variant)]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const labelColor = (variant: Variant) => ({
  color: variant === 'danger' ? colors.danger : colors.primary,
});

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  dimmed: { opacity: 0.6 },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  labelOnPrimary: { color: colors.primaryText },
});
