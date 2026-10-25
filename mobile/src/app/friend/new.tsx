import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { FieldError, FormField } from '../../components/FormField';
import { formatReminderOffset, MONTH_NAMES } from '../../domain/format';
import {
  ADDRESS_FIELD_MAX_LENGTH,
  emptyFriendForm,
  friendToForm,
  NAME_MAX_LENGTH,
  REMINDER_OFFSETS,
  validateFriendForm,
  type FriendFormErrors,
  type FriendFormValues,
} from '../../domain/friend';
import { useRepos } from '../../hooks/useRepos';
import { colors, fontSize, spacing } from '../../theme';

// FR-1.1, FR-1.2, FR-1.5: add a friend, or edit one when opened with ?id=.
export default function FriendFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const { friendsRepo } = useRepos();

  const [form, setForm] = useState<FriendFormValues>(emptyFriendForm);
  const [loaded, setLoaded] = useState(editingId === null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId === null) return;
    friendsRepo.getById(editingId).then((friend) => {
      if (friend) setForm(friendToForm(friend));
      setLoaded(true);
    });
  }, [editingId, friendsRepo]);

  // Errors appear after the first save attempt, then update live as the user fixes them.
  const validation = validateFriendForm(form, new Date());
  const errors: FriendFormErrors = submitted && !validation.ok ? validation.errors : {};

  const set =
    <K extends keyof FriendFormValues>(key: K) =>
    (value: FriendFormValues[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSubmitted(true);
    if (!validation.ok || saving) return;
    setSaving(true);
    try {
      if (editingId === null) await friendsRepo.create(validation.value);
      else await friendsRepo.update(editingId, validation.value);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Something went wrong saving this friend. Please try again.');
    }
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen options={{ title: editingId === null ? 'Add friend' : 'Edit friend' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormField
          label="Name"
          value={form.name}
          onChangeText={set('name')}
          error={errors.name}
          maxLength={NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoFocus={editingId === null}
          textContentType="name"
        />

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Birthday</Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Month">
            {MONTH_NAMES.map((month, index) => (
              <Chip
                key={month}
                label={month.slice(0, 3)}
                accessibilityLabel={month}
                selected={form.birthMonth === index + 1}
                onPress={() => set('birthMonth')(index + 1)}
              />
            ))}
          </View>
          <FieldError error={errors.birthMonth} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <FormField
                label="Day"
                value={form.birthDay}
                onChangeText={set('birthDay')}
                error={errors.birthDay}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="e.g. 14"
              />
            </View>
            <View style={styles.flex}>
              <FormField
                label="Year (optional)"
                value={form.birthYear}
                onChangeText={set('birthYear')}
                error={errors.birthYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="e.g. 1990"
              />
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Remind me</Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Remind me">
            {REMINDER_OFFSETS.map((offset) => (
              <Chip
                key={offset}
                label={formatReminderOffset(offset)}
                selected={form.reminderOffsetDays === offset}
                onPress={() => set('reminderOffsetDays')(offset)}
              />
            ))}
          </View>
          <Text style={styles.hint}>Reminders arrive at 9am.</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Address (optional)</Text>
          <Text style={styles.hint}>Saves typing it at checkout. UK addresses only.</Text>
          <FormField
            label="Address line 1"
            value={form.addressLine1}
            onChangeText={set('addressLine1')}
            error={errors.addressLine1}
            maxLength={ADDRESS_FIELD_MAX_LENGTH}
            textContentType="streetAddressLine1"
          />
          <FormField
            label="Address line 2"
            value={form.addressLine2}
            onChangeText={set('addressLine2')}
            error={errors.addressLine2}
            maxLength={ADDRESS_FIELD_MAX_LENGTH}
            textContentType="streetAddressLine2"
          />
          <FormField
            label="Town or city"
            value={form.city}
            onChangeText={set('city')}
            error={errors.city}
            maxLength={ADDRESS_FIELD_MAX_LENGTH}
            textContentType="addressCity"
          />
          <FormField
            label="Postcode"
            value={form.postcode}
            onChangeText={set('postcode')}
            error={errors.postcode}
            autoCapitalize="characters"
            maxLength={8}
            textContentType="postalCode"
          />
        </View>

        <Button label={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: fontSize.title, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  hint: { fontSize: fontSize.small, color: colors.textMuted },
});
