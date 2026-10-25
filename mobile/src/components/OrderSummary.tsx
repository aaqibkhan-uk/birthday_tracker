import { StyleSheet, Text, View } from 'react-native';
import { formatAddressLines, formatPrice, type Destination } from '../domain/checkout';
import { formatLongDate } from '../domain/format';
import { colors, fontSize, radius, spacing } from '../theme';

interface Props {
  destination: Omit<Destination, 'type'>;
  estimatedDelivery: Date;
  pricePence: number;
}

/** Who, where, when and how much: shown at payment, on the confirmation and in order history. */
export function OrderSummary({ destination, estimatedDelivery, pricePence }: Props) {
  return (
    <View style={styles.box}>
      <Row
        label="Sending to"
        value={[destination.recipientName, ...formatAddressLines(destination)].join('\n')}
      />
      <Row label="Estimated delivery" value={formatLongDate(estimatedDelivery)} />
      <Row label="Price" value={formatPrice(pricePence)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  row: { gap: 2 },
  label: { fontSize: fontSize.small, fontWeight: '600', color: colors.textMuted },
  value: { fontSize: fontSize.body, color: colors.text },
});
