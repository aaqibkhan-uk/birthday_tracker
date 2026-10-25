import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { CardFront } from '../../../components/CardFront';
import { EmptyState } from '../../../components/EmptyState';
import { FormField } from '../../../components/FormField';
import { FRONT_TEXT_MAX_LENGTH, INSIDE_MESSAGE_MAX_LENGTH } from '../../../config';
import { StepIndicator } from '../../../components/StepIndicator';
import { useCardDraft } from '../../../hooks/useCardDraft';
import { colors, fontSize, radius, shadow, spacing } from '../../../theme';

// FR-4.3, FR-4.8: front text (overlaid by the app) and the inside message.
export default function MessageScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const { data, saveContent } = useCardDraft(Number(cardId));

  if (!data) return null;
  const { card, designs } = data;
  const selected = designs.find((design) => design.isSelected) ?? null;

  if (!card || !selected) {
    return (
      <EmptyState
        title={card ? 'Choose a design first' : 'Card not found'}
        message={
          card ? 'Pick the picture for the front of the card.' : 'This draft may have been deleted.'
        }
        actionLabel={card ? 'See designs' : 'Back to upcoming'}
        onAction={() =>
          card
            ? router.dismissTo({ pathname: '/card/[cardId]/designs', params: { cardId } })
            : router.dismissTo('/')
        }
      />
    );
  }

  const done = () => {
    if (card.friendId !== null) {
      router.dismissTo({ pathname: '/friend/[id]', params: { id: String(card.friendId) } });
    } else {
      router.dismissTo('/');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StepIndicator current={2} />
        <View style={styles.preview}>
          <CardFront imagePath={selected.imagePath} frontText={card.frontText} textSize={24} />
        </View>
        <Button
          label="Change picture"
          variant="secondary"
          // Designs is always below this screen in the stack, so this goes back to it.
          onPress={() =>
            router.dismissTo({ pathname: '/card/[cardId]/designs', params: { cardId } })
          }
        />

        <FormField
          label="Front text (optional)"
          hint="Shown over the top of the picture, e.g. Happy birthday, Sam!"
          value={card.frontText ?? ''}
          onChangeText={(frontText) => saveContent({ frontText })}
          maxLength={FRONT_TEXT_MAX_LENGTH}
          showCount
        />

        <FormField
          label="Inside message"
          hint="Printed inside the card. Long messages are resized to fit."
          value={card.insideMessage ?? ''}
          onChangeText={(insideMessage) => saveContent({ insideMessage })}
          maxLength={INSIDE_MESSAGE_MAX_LENGTH}
          showCount
          multiline
        />

        <Text style={styles.saved}>Your card is saved as you go.</Text>

        <View style={styles.actions}>
          <Button
            label="Preview card"
            onPress={() => router.push({ pathname: '/card/[cardId]/preview', params: { cardId } })}
          />
          <Button label="Done for now" variant="secondary" onPress={done} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  preview: { width: '60%', alignSelf: 'center', borderRadius: radius.sm, ...shadow.raised },
  saved: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: spacing.sm },
});
