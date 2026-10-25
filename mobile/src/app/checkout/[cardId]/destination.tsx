import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button } from '../../../components/Button';
import { Chip } from '../../../components/Chip';
import { EmptyState } from '../../../components/EmptyState';
import { FormField } from '../../../components/FormField';
import { getNextBirthday } from '../../../domain/birthdays';
import {
  addressFormFrom,
  validateAddressForm,
  type AddressFormErrors,
  type AddressFormValues,
} from '../../../domain/checkout';
import { canArriveByBirthday, getEstimatedDelivery } from '../../../domain/delivery';
import { formatLongDate } from '../../../domain/format';
import type { Friend } from '../../../domain/friend';
import type { DestinationType, UserProfile } from '../../../domain/models';
import { useFocusedQuery } from '../../../hooks/useFocusedQuery';
import { useRepos } from '../../../hooks/useRepos';
import { colors, fonts, fontSize, radius, shadow, spacing } from '../../../theme';

const sameAddress = (a: AddressFormValues, b: AddressFormValues) =>
  (Object.keys(a) as (keyof AddressFormValues)[]).every((key) => a[key].trim() === b[key].trim());

// FR-6.1, FR-6.2: choose where the card goes, enter any missing address, see when it arrives.
export default function DestinationScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const id = Number(cardId);
  const { cardsRepo, friendsRepo, profileRepo } = useRepos();
  const load = useCallback(async () => {
    const card = await cardsRepo.getById(id);
    const friend = card?.friendId != null ? await friendsRepo.getById(card.friendId) : null;
    const profile = await profileRepo.get();
    return { card, friend, profile };
  }, [cardsRepo, friendsRepo, profileRepo, id]);
  const { data, loadedAt: now } = useFocusedQuery(load);

  if (!data) return null;
  const { card, friend, profile } = data;
  if (!card || card.status !== 'approved') {
    return (
      <EmptyState
        title="Preview the card first"
        message="Approve the card before choosing where to send it."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }
  return <DestinationForm cardId={cardId} friend={friend} profile={profile} now={now} />;
}

interface FormProps {
  cardId: string;
  friend: Friend | null;
  profile: UserProfile;
  now: Date;
}

// Mounted once the data is loaded, so the forms start from the saved addresses and a reload on
// focus never overwrites what the user has typed.
function DestinationForm({ cardId, friend, profile, now }: FormProps) {
  const { friendsRepo, profileRepo } = useRepos();
  const [type, setType] = useState<DestinationType>(friend ? 'friend' : 'self');
  const [forms, setForms] = useState<Record<DestinationType, AddressFormValues>>(() => ({
    friend: addressFormFrom(friend ?? profile),
    self: addressFormFrom(profile),
  }));
  const [save, setSave] = useState(true);
  const [errors, setErrors] = useState<AddressFormErrors>({});
  const [busy, setBusy] = useState(false);

  const form = forms[type];
  const saved = type === 'friend' && friend ? addressFormFrom(friend) : addressFormFrom(profile);
  const changed = !sameAddress(form, saved);
  const update = (patch: Partial<AddressFormValues>) => {
    setForms({ ...forms, [type]: { ...form, ...patch } });
    setErrors({});
  };

  const delivery = getEstimatedDelivery(now);
  const birthday = friend ? getNextBirthday(friend.birthDay, friend.birthMonth, now) : null;
  const late = birthday !== null && !canArriveByBirthday(now, birthday);

  const next = async () => {
    const result = validateAddressForm(form, type);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    const destination = result.value;
    setBusy(true);
    try {
      if (save && changed) {
        const address = {
          addressLine1: destination.addressLine1,
          addressLine2: destination.addressLine2,
          city: destination.city,
          postcode: destination.postcode,
        };
        if (type === 'self') {
          await profileRepo.update({ name: destination.recipientName, ...address });
        } else if (friend) {
          await friendsRepo.update(friend.id, {
            name: friend.name,
            birthDay: friend.birthDay,
            birthMonth: friend.birthMonth,
            birthYear: friend.birthYear,
            reminderOffsetDays: friend.reminderOffsetDays,
            ...address,
          });
        }
      }
      router.push({
        pathname: '/checkout/[cardId]/payment',
        params: {
          cardId,
          type: destination.type,
          name: destination.recipientName,
          line1: destination.addressLine1,
          line2: destination.addressLine2 ?? '',
          city: destination.city,
          postcode: destination.postcode,
        },
      });
    } catch (error) {
      console.warn('Saving the address failed', error);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.chips} accessibilityRole="radiogroup">
          {friend ? (
            <Chip
              label={`To ${friend.name}`}
              selected={type === 'friend'}
              onPress={() => {
                setType('friend');
                setErrors({});
              }}
            />
          ) : null}
          <Chip
            label="To me"
            selected={type === 'self'}
            onPress={() => {
              setType('self');
              setErrors({});
            }}
            accessibilityLabel="To me, so I can hand it over"
          />
        </View>

        {type === 'friend' && friend && !friend.addressLine1 ? (
          <Text style={styles.note}>No address saved for {friend.name} yet. Enter it below.</Text>
        ) : null}

        {type === 'self' ? (
          <FormField
            label="Your name"
            value={form.name}
            onChangeText={(name) => update({ name })}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
          />
        ) : null}
        <FormField
          label="Address line 1"
          value={form.addressLine1}
          onChangeText={(addressLine1) => update({ addressLine1 })}
          error={errors.addressLine1}
          autoComplete="address-line1"
          textContentType="streetAddressLine1"
        />
        <FormField
          label="Address line 2 (optional)"
          value={form.addressLine2}
          onChangeText={(addressLine2) => update({ addressLine2 })}
          error={errors.addressLine2}
          autoComplete="address-line2"
          textContentType="streetAddressLine2"
        />
        <FormField
          label="Town or city"
          value={form.city}
          onChangeText={(city) => update({ city })}
          error={errors.city}
          textContentType="addressCity"
        />
        <FormField
          label="Postcode"
          value={form.postcode}
          onChangeText={(postcode) => update({ postcode })}
          error={errors.postcode}
          autoCapitalize="characters"
          autoComplete="postal-code"
          textContentType="postalCode"
        />

        {changed ? (
          <View style={styles.saveRow}>
            <Text style={styles.saveLabel}>
              {type === 'self'
                ? 'Save as my address'
                : `Save to ${friend?.name ?? 'their'} details`}
            </Text>
            <Switch
              trackColor={{ true: colors.primary }}
              value={save}
              onValueChange={setSave}
              accessibilityLabel={type === 'self' ? 'Save as my address' : 'Save to their details'}
            />
          </View>
        ) : null}

        <View style={[styles.delivery, late && styles.late]}>
          <Text style={styles.deliveryTitle}>Estimated delivery: {formatLongDate(delivery)}</Text>
          {birthday ? (
            <Text style={styles.deliveryText}>
              {friend?.name}&apos;s birthday: {formatLongDate(birthday)}
            </Text>
          ) : null}
          {late ? (
            <Text style={styles.warning} accessibilityRole="alert">
              This card is likely to arrive after the birthday. You can still send it.
            </Text>
          ) : null}
        </View>

        <Button label="Continue to payment" onPress={next} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: fontSize.body, color: colors.textMuted },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  saveLabel: { flex: 1, fontSize: fontSize.body, color: colors.text },
  delivery: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    ...shadow.card,
  },
  late: { borderColor: colors.error, borderWidth: 2 },
  deliveryTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.body + 1,
    fontWeight: '700',
    color: colors.text,
  },
  deliveryText: { fontSize: fontSize.body, color: colors.textMuted },
  warning: { fontSize: fontSize.body, color: colors.error },
});
