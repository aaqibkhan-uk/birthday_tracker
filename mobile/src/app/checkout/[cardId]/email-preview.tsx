import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../../components/EmptyState';
import { buildConfirmationEmail } from '../../../domain/checkout';
import { useFocusedQuery } from '../../../hooks/useFocusedQuery';
import { useRepos } from '../../../hooks/useRepos';
import { colors, fontSize, radius, spacing } from '../../../theme';

// FR-6.5: shows exactly what the confirmation email would contain. Nothing is sent.
export default function EmailPreviewScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const { ordersRepo } = useRepos();
  const load = useCallback(() => ordersRepo.getByCardId(Number(cardId)), [ordersRepo, cardId]);
  const { data: order } = useFocusedQuery(load);

  if (order === undefined) return null;
  if (order === null) {
    return (
      <EmptyState
        title="Order not found"
        message="There is no email for this card."
        actionLabel="Close"
        onAction={() => router.back()}
      />
    );
  }

  const email = buildConfirmationEmail(order);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.notice}>Simulated: this email was not actually sent.</Text>
      <View style={styles.email}>
        <View style={styles.headers}>
          <Text style={styles.header}>
            <Text style={styles.headerLabel}>To: </Text>
            {email.to}
          </Text>
          <Text style={styles.header}>
            <Text style={styles.headerLabel}>Subject: </Text>
            {email.subject}
          </Text>
        </View>
        {email.paragraphs.map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  notice: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
  email: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headers: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  header: { fontSize: fontSize.body, color: colors.text },
  headerLabel: { fontWeight: '600', color: colors.textMuted },
  paragraph: { fontSize: fontSize.body, color: colors.text, lineHeight: fontSize.body * 1.4 },
});
