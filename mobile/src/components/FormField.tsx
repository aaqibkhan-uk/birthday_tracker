import { useState } from 'react';
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
  const { value, maxLength, multiline, onFocus, onBlur } = inputProps;
  // Visual only: highlights the field being typed in.
  const [focused, setFocused] = useState(false);
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
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
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
  label: { fontSize: fontSize.small, fontWeight: '700', color: colors.text },
  hint: { fontSize: fontSize.small, color: colors.textMuted, lineHeight: 19 },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.error },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  error: { flex: 1, fontSize: fontSize.small, color: colors.error },
  count: { fontSize: fontSize.small, color: colors.textMuted },
});
