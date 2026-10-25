import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { colors, fontSize, radius, spacing } from '../../theme';

// FR-7.1 empty state. The full read-only order history (FR-6.6) is built in Milestone 5.
export default function OrdersScreen() {
  const { ordersRepo } = useRepos();
  const load = useCallback(() => ordersRepo.list(), [ordersRepo]);
  const { data: orders } = useFocusedQuery(load);

  if (!orders) return null;

  return (
    <FlatList
      data={orders}
      keyExtractor={(order) => String(order.id)}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.recipientName}</Text>
          <Text style={styles.details}>Arrives by {item.estimatedDeliveryDate}</Text>
        </View>
      )}
      contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
      ListEmptyComponent={
        <EmptyState
          title="No orders yet"
          message="Cards you send will appear here."
          actionLabel="See upcoming birthdays"
          onAction={() => router.navigate('/')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  name: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  details: { fontSize: fontSize.small, color: colors.textMuted },
});
