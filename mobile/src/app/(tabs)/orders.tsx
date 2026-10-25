import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { formatPrice, fromIsoDate } from '../../domain/checkout';
import { formatLongDate } from '../../domain/format';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { resolveImageUri } from '../../services/fileStorage';
import { colors, fonts, fontSize, radius, shadow, spacing } from '../../theme';

// FR-6.6 order history (newest first) and the FR-7.1 empty state.
export default function OrdersScreen() {
  const { ordersRepo } = useRepos();
  const load = useCallback(() => ordersRepo.list(), [ordersRepo]);
  const { data: orders } = useFocusedQuery(load);

  if (!orders) return null;

  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => String(order.id)}
      renderItem={({ item }) => {
        const delivery = formatLongDate(fromIsoDate(item.estimatedDeliveryDate));
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Card for ${item.recipientName}, arrives by ${delivery}`}
            onPress={() =>
              router.push({ pathname: '/order/[orderId]', params: { orderId: String(item.id) } })
            }
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Image
              source={{ uri: resolveImageUri(item.imagePath) }}
              style={styles.thumb}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.body}>
              <Text style={styles.name}>{item.recipientName}</Text>
              <Text style={styles.details}>Arrives by {delivery}</Text>
              <Text style={styles.details}>{formatPrice(item.pricePence)} · demo order</Text>
            </View>
          </Pressable>
        );
      }}
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
      ListEmptyComponent={
        <EmptyState
          title="No orders yet"
          message="Cards you send will appear here."
          actionLabel="See upcoming birthdays"
          onAction={() => router.navigate('/')}
          icon="📮"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm + 4, paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  thumb: { width: 60, height: 84, borderRadius: 6, backgroundColor: colors.border },
  body: { flex: 1, gap: 3 },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
  },
  details: { fontSize: fontSize.small, color: colors.textMuted },
});
