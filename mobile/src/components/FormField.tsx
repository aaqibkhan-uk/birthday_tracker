import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shows "used/max" under the field; needs `maxLength`. */
  showCount?: boolean;
}

export function FormField({ label, error, hint, showCount, style, ...inputProps }: Props) {
  const { value, maxLength, multiline } = inputProps;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...inputProps}
      />
      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : <View />}
        {showCount && maxLength ? (
          <Text style={styles.count}>
            {value?.length ?? 0}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function FieldError({ error }: { error?: string }) {
  return error ? <Text style={styles.error}>{error}</Text> : null;
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.text },
  hint: { fontSize: fontSize.small, color: colors.textMuted },
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
  multiline: { minHeight: 110, paddingTop: spacing.sm, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  error: { flex: 1, fontSize: fontSize.small, color: colors.error },
  count: { fontSize: fontSize.small, color: colors.textMuted },
});
