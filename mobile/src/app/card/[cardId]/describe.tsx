import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Chip } from '../../../components/Chip';
import { EmptyState } from '../../../components/EmptyState';
import { FormField } from '../../../components/FormField';
import {
  ART_PROMPT_MAX_LENGTH,
  DESIGNS_PER_ROUND,
  GENERATION_ROUNDS_PER_CARD,
} from '../../../config';
import { CARD_STYLES, getRemainingGenerations, validateArtPrompt } from '../../../domain/card';
import { useCardDraft } from '../../../hooks/useCardDraft';
import { colors, fontSize, spacing } from '../../../theme';

const STYLE_LABELS: Record<(typeof CARD_STYLES)[number], string> = {
  watercolour: 'Watercolour',
  cartoon: 'Cartoon',
  minimalist: 'Minimalist',
  vintage: 'Vintage',
  playful: 'Playful',
};

// FR-4.2: describe the artwork and optionally pick a style.
export default function DescribeScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const id = Number(cardId);
  const { data, saveContent } = useCardDraft(id);
  const [submitted, setSubmitted] = useState(false);

  if (!data) return null;
  const { card, designs } = data;
  if (!card) {
    return (
      <EmptyState
        title="Card not found"
        message="This draft may have been deleted."
        actionLabel="Back to upcoming"
        onAction={() => router.dismissTo('/')}
      />
    );
  }

  const remaining = getRemainingGenerations(card);
  const promptError = validateArtPrompt(card.artPrompt);
  const designsHref = { pathname: '/card/[cardId]/designs', params: { cardId } } as const;

  const generate = () => {
    setSubmitted(true);
    if (promptError || remaining === 0) return;
    router.push({ ...designsHref, params: { cardId, generate: '1' } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormField
          label="What should the picture show?"
          hint="For example: a fox reading a book under an oak tree. Words go on later, not in the picture."
          value={card.artPrompt ?? ''}
          onChangeText={(artPrompt) => saveContent({ artPrompt })}
          error={submitted && promptError ? promptError : undefined}
          maxLength={ART_PROMPT_MAX_LENGTH}
          showCount
          multiline
        />

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Style (optional)</Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Style">
            {CARD_STYLES.map((style) => (
              <Chip
                key={style}
                label={STYLE_LABELS[style]}
                selected={card.style === style}
                // Tapping the selected style again clears it.
                onPress={() => saveContent({ style: card.style === style ? null : style })}
              />
            ))}
          </View>
        </View>

        <Text style={styles.remaining}>
          {remaining === 0
            ? `You've used all ${GENERATION_ROUNDS_PER_CARD} rounds of designs for this card.`
            : `${remaining} of ${GENERATION_ROUNDS_PER_CARD} rounds of designs left. Each round makes ${DESIGNS_PER_ROUND} designs.`}
        </Text>

        <View style={styles.actions}>
          {remaining > 0 && <Button label="Create designs" onPress={generate} />}
          {designs.length > 0 && (
            <Button
              label="See your designs"
              variant={remaining > 0 ? 'secondary' : 'primary'}
              onPress={() => router.push(designsHref)}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: fontSize.small, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  remaining: { fontSize: fontSize.small, color: colors.textMuted },
  actions: { gap: spacing.sm },
});
