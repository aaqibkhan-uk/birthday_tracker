import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { CardPrompt } from '../../components/CardPrompt';
import { EmptyState } from '../../components/EmptyState';
import { getResumeStep } from '../../domain/card';
import { getAgeTurning, getDaysUntilBirthday, getNextBirthday } from '../../domain/birthdays';
import {
  formatBirthday,
  formatDaysUntil,
  formatLongDate,
  formatReminderOffset,
} from '../../domain/format';
import { getCardPrompt } from '../../domain/schedule';
import { useReminders } from '../../hooks/reminders';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { deleteImages } from '../../services/fileStorage';
import { colors, fontSize, radius, spacing } from '../../theme';

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const friendId = Number(id);
  const { friendsRepo, cardsRepo, designsRepo } = useRepos();
  const { reschedule } = useReminders();
  const load = useCallback(async () => {
    const friend = await friendsRepo.getById(friendId);
    // FR-4.1: an unordered card for this friend means "Resume card".
    const card = friend ? await cardsRepo.getActiveForFriend(friendId) : null;
    const designs = card ? await designsRepo.listByCard(card.id) : [];
    return { friend, card, designs };
  }, [friendsRepo, cardsRepo, designsRepo, friendId]);
  const { data, loadedAt: now } = useFocusedQuery(load);

  if (data === undefined) return null;
  const { friend, card, designs } = data;

  if (friend === null) {
    return (
      <EmptyState
        title="Friend not found"
        message="They may have been deleted."
        actionLabel="Back to friends"
        onAction={() => router.navigate('/friends')}
      />
    );
  }

  const days = getDaysUntilBirthday(friend.birthDay, friend.birthMonth, now);
  const next = getNextBirthday(friend.birthDay, friend.birthMonth, now);
  const age =
    friend.birthYear === null
      ? null
      : getAgeTurning(friend.birthYear, friend.birthDay, friend.birthMonth, now);
  const address = [friend.addressLine1, friend.addressLine2, friend.city, friend.postcode].filter(
    (line): line is string => line !== null,
  );
  const prompt = getCardPrompt(friend, now);
  const cardActionLabel = card ? 'Resume card' : 'Create card';

  const openCard = async () => {
    const target = card ?? (await cardsRepo.create(friend.id));
    const step = card
      ? getResumeStep(
          designs.length > 0,
          designs.some((d) => d.isSelected),
        )
      : 'describe';
    // Build the whole flow up to the resume step, so each back arrow goes one step back
    // (message → designs → describe → friend) instead of jumping out of the card.
    const params = { cardId: String(target.id) };
    router.push({ pathname: '/card/[cardId]/describe', params });
    if (step !== 'describe') router.push({ pathname: '/card/[cardId]/designs', params });
    if (step === 'message') router.push({ pathname: '/card/[cardId]/message', params });
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${friend.name}?`,
      'Their reminder and any unsent card drafts are removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { deletedImagePaths } = await friendsRepo.delete(friend.id);
            deleteImages(deletedImagePaths);
            void reschedule(); // FR-3.3.5: drops their notification
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: friend.name }} />

      <View style={[styles.card, days === 0 && styles.today]}>
        <Text style={styles.when}>{days === 0 ? 'Birthday today!' : formatDaysUntil(days)}</Text>
        <Text style={styles.date}>
          {formatLongDate(next)}
          {age === null ? '' : ` · turning ${age}`}
        </Text>
      </View>

      {prompt ? (
        <CardPrompt
          name={friend.name}
          prompt={prompt}
          now={now}
          actionLabel={cardActionLabel}
          onAction={openCard}
        />
      ) : (
        <Button label={cardActionLabel} onPress={openCard} />
      )}

      <View style={styles.section}>
        <Detail label="Birthday" value={formatBirthday(friend.birthDay, friend.birthMonth)} />
        {friend.birthYear !== null && <Detail label="Born" value={String(friend.birthYear)} />}
        <Detail label="Reminder" value={formatReminderOffset(friend.reminderOffsetDays)} />
        <Detail label="Address" value={address.length > 0 ? address.join('\n') : 'Not saved'} />
      </View>

      <View style={styles.actions}>
        <Button
          label="Edit"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/friend/new', params: { id: String(friend.id) } })
          }
        />
        <Button label="Delete" variant="danger" onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg },
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  today: { backgroundColor: colors.highlight, borderColor: colors.highlightBorder, borderWidth: 2 },
  when: { fontSize: fontSize.heading, fontWeight: '700', color: colors.text },
  date: { fontSize: fontSize.body, color: colors.textMuted },
  section: { gap: spacing.md },
  detail: { gap: 2 },
  detailLabel: { fontSize: fontSize.small, fontWeight: '600', color: colors.textMuted },
  detailValue: { fontSize: fontSize.body, color: colors.text },
  actions: { gap: spacing.sm },
});
