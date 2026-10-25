import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { CardFront } from '../../../components/CardFront';
import { EmptyState } from '../../../components/EmptyState';
import { OrderSummary } from '../../../components/OrderSummary';
import { formatOrderNumber, fromIsoDate } from '../../../domain/checkout';
import { useFocusedQuery } from '../../../hooks/useFocusedQuery';
import { useRepos } from '../../../hooks/useRepos';
import { colors, fontSize, spacing } from '../../../theme';

// FR-6.4: order confirmation. Reached with the card flow dismissed, so there is no way back.
export default function ConfirmationScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const { ordersRepo } = useRepos();
  const load = useCallback(() => ordersRepo.getByCardId(Number(cardId)), [ordersRepo, cardId]);
  const { data: order } = useFocusedQuery(load);

  if (order === undefined) return null;
  if (order === null) {
    return (
      <EmptyState
        title="Order not found"
        message="Check your order history."
        actionLabel="See orders"
        onAction={() => router.dismissTo('/orders')}
      />
    );
  }

  const recipient = order.destinationType === 'self' ? 'you' : order.recipientName;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Thank you!
        </Text>
        <Text style={styles.text}>
          Your card for {order.recipientName} is on its way to {recipient}.
        </Text>
        <Text style={styles.number}>Order {formatOrderNumber(order.id)}</Text>
      </View>

      <View style={styles.thumb}>
        <CardFront imagePath={order.imagePath} frontText={order.frontText} textSize={14} />
      </View>

      <OrderSummary
        destination={order}
        estimatedDelivery={fromIsoDate(order.estimatedDeliveryDate)}
        pricePence={order.pricePence}
      />

      <View style={styles.actions}>
        <Button
          label="See the confirmation email"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/checkout/[cardId]/email-preview', params: { cardId } })
          }
        />
        <Button label="Done" onPress={() => router.dismissTo('/orders')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.xs, alignItems: 'center' },
  title: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  text: { fontSize: fontSize.body, color: colors.text, textAlign: 'center' },
  number: { fontSize: fontSize.small, color: colors.textMuted },
  thumb: { width: '35%', alignSelf: 'center' },
  actions: { gap: spacing.sm },
});
