import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function FormField({ label, error, style, ...inputProps }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function FieldError({ error }: { error?: string }) {
  return error ? <Text style={styles.error}>{error}</Text> : null;
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: fontSize.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  error: { fontSize: fontSize.small, color: colors.error },
});
