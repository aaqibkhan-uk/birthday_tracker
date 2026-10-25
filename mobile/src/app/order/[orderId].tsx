import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../components/Button';
import { CardPreview } from '../../components/CardPreview';
import { EmptyState } from '../../components/EmptyState';
import { OrderSummary } from '../../components/OrderSummary';
import { formatOrderNumber, fromIsoDate } from '../../domain/checkout';
import { formatLongDate } from '../../domain/format';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { colors, fontSize, spacing } from '../../theme';

// FR-6.6: a past order, read-only. Everything shown comes from the order's own snapshot, so it
// survives later edits to (or deletion of) the friend.
export default function OrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { ordersRepo } = useRepos();
  const load = useCallback(() => ordersRepo.getById(Number(orderId)), [ordersRepo, orderId]);
  const { data: order } = useFocusedQuery(load);
  const { width } = useWindowDimensions();

  if (order === undefined) return null;
  if (order === null) {
    return (
      <EmptyState
        title="Order not found"
        message="It may have been removed."
        actionLabel="Back to orders"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.meta}>
        Order {formatOrderNumber(order.id)} · placed {formatLongDate(new Date(order.createdAt))}
      </Text>
      <CardPreview
        imagePath={order.imagePath}
        frontText={order.frontText}
        insideMessage={order.insideMessage}
        width={width - spacing.md * 2}
      />
      <OrderSummary
        destination={order}
        estimatedDelivery={fromIsoDate(order.estimatedDeliveryDate)}
        pricePence={order.pricePence}
      />
      <View>
        <Button
          label="See the confirmation email"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/checkout/[cardId]/email-preview',
              params: { cardId: String(order.cardId) },
            })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  meta: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
});
