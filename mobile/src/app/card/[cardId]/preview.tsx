import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../../components/Button';
import { CardPreview } from '../../../components/CardPreview';
import { EmptyState } from '../../../components/EmptyState';
import { getCardIncompleteReason } from '../../../domain/checkout';
import { useCardDraft } from '../../../hooks/useCardDraft';
import { useRepos } from '../../../hooks/useRepos';
import { colors, fontSize, spacing } from '../../../theme';

// FR-5.1–5.3: open the card, go back to edit, or approve and continue to checkout.
export default function PreviewScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const id = Number(cardId);
  const { cardsRepo } = useRepos();
  const { data } = useCardDraft(id);
  const { width } = useWindowDimensions();
  const [approving, setApproving] = useState(false);

  if (!data) return null;
  const { card, designs } = data;
  const selected = designs.find((design) => design.isSelected) ?? null;

  if (!card || card.status === 'ordered') {
    return (
      <EmptyState
        title={card ? 'Already ordered' : 'Card not found'}
        message={
          card ? 'This card has been sent and can no longer change.' : 'It may have been deleted.'
        }
        actionLabel="Back to upcoming"
        onAction={() => router.dismissTo('/')}
      />
    );
  }

  const incomplete = getCardIncompleteReason(card, selected !== null);
  // The flow below this screen is always describe → designs → message, so these go back to them.
  const params = { cardId };
  const changePicture = () => router.dismissTo({ pathname: '/card/[cardId]/designs', params });
  const editWords = () => router.dismissTo({ pathname: '/card/[cardId]/message', params });

  const approve = async () => {
    setApproving(true);
    try {
      await cardsRepo.setStatus(id, 'approved');
      router.push({ pathname: '/checkout/[cardId]/destination', params });
    } catch (error) {
      console.warn('Approve failed', error);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {selected ? (
        <CardPreview
          imagePath={selected.imagePath}
          frontText={card.frontText}
          insideMessage={card.insideMessage ?? ''}
          width={width - spacing.md * 2}
        />
      ) : null}
      <Text style={styles.hint}>Tap the card or swipe it to the left to open it.</Text>

      {incomplete ? <Text style={styles.incomplete}>{incomplete}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Approve and continue"
          onPress={approve}
          disabled={incomplete !== null || approving}
          accessibilityHint="Goes to delivery and payment"
        />
        <Button label="Edit words" variant="secondary" onPress={editWords} />
        <Button label="Change picture" variant="secondary" onPress={changePicture} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  hint: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
  incomplete: { fontSize: fontSize.body, color: colors.error, textAlign: 'center' },
  actions: { gap: spacing.sm },
});
