import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../../components/Button';
import { CardFront } from '../../../components/CardFront';
import { EmptyState } from '../../../components/EmptyState';
import { FormField } from '../../../components/FormField';
import { OrderSummary } from '../../../components/OrderSummary';
import {
  CARD_PRICE_PENCE,
  formatPrice,
  validateAddressForm,
  validateEmail,
  type Destination,
} from '../../../domain/checkout';
import type { Card, CardDesign } from '../../../domain/models';
import { getEstimatedDelivery } from '../../../domain/delivery';
import { useFocusedQuery } from '../../../hooks/useFocusedQuery';
import { useRepos } from '../../../hooks/useRepos';
import { placeOrder } from '../../../services/orderPlacement';
import { colors, fontSize, radius, spacing } from '../../../theme';

type Params = {
  cardId: string;
  type: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
};

// FR-6.3, FR-6.4: mock payment. Demo mode only: there are no card fields and nothing is charged.
export default function PaymentScreen() {
  const params = useLocalSearchParams<Params>();
  const id = Number(params.cardId);
  const { cardsRepo, designsRepo, profileRepo } = useRepos();
  const load = useCallback(async () => {
    const card = await cardsRepo.getById(id);
    const selected = card ? await designsRepo.getSelected(id) : null;
    const profile = await profileRepo.get();
    return { card, selected, profile };
  }, [cardsRepo, designsRepo, profileRepo, id]);
  const { data, loadedAt: now } = useFocusedQuery(load);

  if (!data) return null;
  const { card, selected, profile } = data;

  // The destination comes from the previous screen; check it again rather than trust it.
  const destination = validateAddressForm(
    {
      name: params.name ?? '',
      addressLine1: params.line1 ?? '',
      addressLine2: params.line2 ?? '',
      city: params.city ?? '',
      postcode: params.postcode ?? '',
    },
    params.type === 'self' ? 'self' : 'friend',
  );

  if (!card || card.status !== 'approved' || !selected || !destination.ok) {
    return (
      <EmptyState
        title="Checkout needs restarting"
        message="Go back and choose where to send the card."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }
  return (
    <PaymentForm
      card={card}
      selected={selected}
      destination={destination.value}
      savedEmail={profile.email ?? ''}
      now={now}
    />
  );
}

interface FormProps {
  card: Card;
  selected: CardDesign;
  destination: Destination;
  savedEmail: string;
  now: Date;
}

function PaymentForm({ card, selected, destination, savedEmail, now }: FormProps) {
  const repos = useRepos();
  const [email, setEmail] = useState(savedEmail);
  const [emailError, setEmailError] = useState<string>();
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    setPaying(true);
    try {
      await placeOrder(repos, {
        cardId: card.id,
        destination,
        email,
        now: new Date(),
      });
      await repos.profileRepo.update({ email: email.trim() });
      // Leave the card and checkout flow entirely: the confirmation has no way back to here.
      router.dismissAll();
      router.push({
        pathname: '/checkout/[cardId]/confirmation',
        params: { cardId: String(card.id) },
      });
    } catch (orderError) {
      console.warn('Placing the order failed', orderError);
      Alert.alert('The order did not go through', 'Nothing was charged. Please try again.');
      setPaying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.demo} accessibilityRole="summary">
          <Text style={styles.demoTitle}>Demo mode, no real payment</Text>
          <Text style={styles.demoText}>
            This is a demo app. No card details are asked for, nothing is charged and no card is
            printed or posted.
          </Text>
        </View>

        <View style={styles.thumb}>
          <CardFront imagePath={selected.imagePath} frontText={card.frontText} textSize={14} />
        </View>

        <OrderSummary
          destination={destination}
          estimatedDelivery={getEstimatedDelivery(now)}
          pricePence={CARD_PRICE_PENCE}
        />

        <FormField
          label="Your email"
          hint="For the order confirmation (shown in the app, not sent)."
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setEmailError(undefined);
          }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Button
          label={paying ? 'Placing order…' : `Pay ${formatPrice(CARD_PRICE_PENCE)} (demo)`}
          onPress={pay}
          disabled={paying}
          accessibilityHint="Places a demo order. Nothing is charged."
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  demo: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.highlight,
    borderWidth: 2,
    borderColor: colors.highlightBorder,
    gap: spacing.xs,
  },
  demoTitle: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  demoText: { fontSize: fontSize.body, color: colors.text },
  thumb: { width: '35%', alignSelf: 'center' },
});
