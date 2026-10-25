// DEV ONLY (linked from the Upcoming tab when __DEV__): shows what the OS has scheduled and fires
// a test reminder to check tap handling. Replaces the Milestone 0 spike screen.
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { useFocusedQuery } from '../hooks/useFocusedQuery';
import { useReminders } from '../hooks/reminders';
import { useRepos } from '../hooks/useRepos';
import { getPending, scheduleTestReminder } from '../services/notificationsService';
import { colors, fontSize, spacing } from '../theme';

const TEST_DELAY_SECONDS = 10;

export default function DevRemindersScreen() {
  const { friendsRepo } = useRepos();
  const { permission, reschedule } = useReminders();
  const [message, setMessage] = useState('');

  const load = useCallback(
    async () => ({ friends: await friendsRepo.list(), pending: await getPending() }),
    [friendsRepo],
  );
  const { data, reload } = useFocusedQuery(load);
  if (!data) return null;

  const names = new Map(data.friends.map((f) => [f.id, f.name]));
  const first = data.friends[0];

  const rescheduleNow = async () => {
    await reschedule();
    setMessage('Rescheduled.');
    reload();
  };

  const testTap = async () => {
    if (!first) return;
    await scheduleTestReminder(first, TEST_DELAY_SECONDS);
    setMessage(
      `Test reminder for ${first.name} in ${TEST_DELAY_SECONDS} s. Lock the phone, then tap it.`,
    );
    reload();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.text}>Permission: {permission ?? 'checking…'}</Text>
      <Text style={styles.text}>
        {data.pending.length} scheduled for {data.friends.length} friends
      </Text>
      <Button label="Reschedule now" variant="secondary" onPress={rescheduleNow} />
      <Button
        label={first ? `Test tap: ${first.name} in ${TEST_DELAY_SECONDS} s` : 'Add a friend first'}
        variant="secondary"
        disabled={!first || permission !== 'granted'}
        onPress={testTap}
      />
      {message ? <Text style={styles.text}>{message}</Text> : null}
      <View style={styles.list}>
        {data.pending.map((item, index) => (
          <Text key={index} style={styles.text}>
            {item.fireAt?.toLocaleString() ?? '?'} · {names.get(item.friendId ?? -1) ?? '?'} ·{' '}
            {item.title}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md },
  list: { gap: spacing.sm },
  text: { fontSize: fontSize.small, color: colors.text },
});
