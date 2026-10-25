import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, shadow, spacing } from '../theme';

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
        disabled && styles.dimmed,
        pressed && !disabled && styles.pressed,
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
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary, ...shadow.raised, shadowColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primarySoft },
  danger: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#f1cfcc' },
  dimmed: { opacity: 0.5, shadowOpacity: 0 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: { fontSize: fontSize.body, fontWeight: '700', letterSpacing: 0.2 },
  labelOnPrimary: { color: colors.primaryText },
});
