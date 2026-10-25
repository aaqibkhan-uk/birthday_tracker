import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { DESIGNS_PER_ROUND, GENERATION_ROUNDS_PER_CARD } from '../../../config';
import { getRemainingGenerations } from '../../../domain/card';
import type { CardDesign } from '../../../domain/models';
import { useCardDraft } from '../../../hooks/useCardDraft';
import { useRepos } from '../../../hooks/useRepos';
import { generateRound } from '../../../services/designGeneration';
import { resolveImageUri } from '../../../services/fileStorage';
import { isRetryable, type GenerationFailure } from '../../../services/imageApi';
import { colors, fontSize, radius, spacing } from '../../../theme';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; failure: GenerationFailure | 'cap_reached'; message: string };

// FR-4.4–4.6: generate, show and pick designs; regenerate within the cap.
export default function DesignsScreen() {
  const { cardId, generate } = useLocalSearchParams<{ cardId: string; generate?: string }>();
  const id = Number(cardId);
  const repos = useRepos();
  const { data, reload } = useCardDraft(id);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const autoStarted = useRef(false);
  const inFlight = useRef(false);

  const card = data?.card ?? null;

  const runGeneration = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus({ kind: 'loading' });
    try {
      const result = await generateRound(repos, id);
      setStatus(result.ok ? { kind: 'idle' } : { kind: 'error', ...result });
    } finally {
      inFlight.current = false;
      reload();
    }
  };

  // Arriving from "Create designs" starts a round once; the param is cleared so a remount
  // (or coming back to this screen) does not start another.
  useEffect(() => {
    if (generate !== '1' || !card || autoStarted.current) return;
    autoStarted.current = true;
    router.setParams({ generate: undefined });
    void runGeneration();
    // Runs when the card first loads; runGeneration reads the latest card itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generate, card]);

  if (!data) return null;
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
  const selected = data.designs.find((design) => design.isSelected) ?? null;
  const rounds = groupByRound(data.designs);
  const loading = status.kind === 'loading';

  const select = async (design: CardDesign) => {
    await repos.designsRepo.select(id, design.id);
    reload();
  };

  // Describe is always below this screen in the stack, so this goes back to it.
  const editDescription = () =>
    router.dismissTo({ pathname: '/card/[cardId]/describe', params: { cardId } });

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.remaining}>
          {remaining} of {GENERATION_ROUNDS_PER_CARD} rounds left
        </Text>

        {loading && (
          <View style={styles.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              Creating {DESIGNS_PER_ROUND === 1 ? 'a design' : `${DESIGNS_PER_ROUND} designs`}…
            </Text>
            <Text style={styles.hint}>This can take up to a minute.</Text>
          </View>
        )}

        {status.kind === 'error' && (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{status.message}</Text>
            {status.failure !== 'cap_reached' && (
              <Text style={styles.hint}>This didn&apos;t use up one of your rounds.</Text>
            )}
            <View style={styles.actions}>
              {status.failure !== 'cap_reached' && isRetryable(status.failure) && remaining > 0 && (
                <Button label="Try again" onPress={runGeneration} />
              )}
              <Button label="Edit description" variant="secondary" onPress={editDescription} />
            </View>
          </View>
        )}

        {!loading && status.kind !== 'error' && rounds.length === 0 && (
          <EmptyState
            title="No designs yet"
            message="Describe the picture you'd like, then create some designs."
            actionLabel="Describe the picture"
            onAction={editDescription}
          />
        )}

        {rounds.map(({ round, designs }) => (
          <View key={round} style={styles.round}>
            <Text style={styles.roundLabel}>
              Round {round}: “{designs[0]?.promptUsed}”
            </Text>
            <View style={styles.grid} accessibilityRole="radiogroup">
              {designs.map((design, index) => (
                <Pressable
                  key={design.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Design ${index + 1} of round ${round}`}
                  accessibilityState={{ selected: design.isSelected, checked: design.isSelected }}
                  onPress={() => select(design)}
                  style={[styles.thumb, design.isSelected && styles.thumbSelected]}
                >
                  <Image
                    source={{ uri: resolveImageUri(design.imagePath) }}
                    style={styles.thumbImage}
                    contentFit="cover"
                  />
                  {design.isSelected && (
                    <View style={styles.tick}>
                      <Text style={styles.tickText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Use this design"
          disabled={!selected || loading}
          accessibilityHint={selected ? undefined : 'Tap a design to choose it first'}
          onPress={() => router.push({ pathname: '/card/[cardId]/message', params: { cardId } })}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Edit description" variant="secondary" onPress={editDescription} />
          </View>
          <View style={styles.flex}>
            <Button
              label={remaining > 0 ? `More designs (${remaining})` : 'No rounds left'}
              variant="secondary"
              disabled={remaining === 0 || loading}
              onPress={runGeneration}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Newest round first; designs within a round in generated order. */
function groupByRound(designs: readonly CardDesign[]) {
  const byRound = new Map<number, CardDesign[]>();
  for (const design of designs) {
    byRound.set(design.generationRound, [...(byRound.get(design.generationRound) ?? []), design]);
  }
  return [...byRound.entries()]
    .sort(([a], [b]) => b - a)
    .map(([round, roundDesigns]) => ({ round, designs: roundDesigns }));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.md, gap: spacing.lg, flexGrow: 1 },
  remaining: { fontSize: fontSize.small, color: colors.textMuted },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  hint: { fontSize: fontSize.small, color: colors.textMuted },
  error: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  errorText: { fontSize: fontSize.body, color: colors.text },
  actions: { gap: spacing.sm },
  round: { gap: spacing.sm },
  roundLabel: { fontSize: fontSize.small, color: colors.textMuted },
  grid: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    flex: 1,
    aspectRatio: 5 / 7,
    borderRadius: radius.sm,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbSelected: { borderColor: colors.primary },
  thumbImage: { flex: 1 },
  tick: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { color: colors.primaryText, fontWeight: '700' },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
});
