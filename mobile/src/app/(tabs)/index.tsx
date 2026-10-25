import { Link, router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { FriendRow } from '../../components/FriendRow';
import { UPCOMING_WINDOW_DAYS } from '../../config';
import { getDaysUntilBirthday } from '../../domain/birthdays';
import { sortFriends } from '../../domain/friend';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { colors, fontSize, spacing } from '../../theme';

// FR-2.1, FR-2.2: birthdays in the next UPCOMING_WINDOW_DAYS days, soonest first, today highlighted.
export default function UpcomingScreen() {
  const { friendsRepo } = useRepos();
  const load = useCallback(() => friendsRepo.list(), [friendsRepo]);
  const { data: friends, loadedAt: now } = useFocusedQuery(load);

  if (!friends) return null;

  if (friends.length === 0) {
    return (
      <EmptyState
        title="No friends yet"
        message="Add a friend's birthday and we'll remind you in time to send a card."
        actionLabel="Add a friend"
        onAction={() => router.push('/friend/new')}
      />
    );
  }

  const upcoming = sortFriends(friends, 'upcoming', now).filter(
    (f) => getDaysUntilBirthday(f.birthDay, f.birthMonth, now) <= UPCOMING_WINDOW_DAYS,
  );

  return (
    <FlatList
      data={upcoming}
      keyExtractor={(friend) => String(friend.id)}
      renderItem={({ item }) => (
        <FriendRow friend={item} now={now} onPress={() => router.push(`/friend/${item.id}`)} />
      )}
      contentContainerStyle={upcoming.length === 0 ? styles.emptyContainer : styles.list}
      ListHeaderComponent={
        upcoming.length > 0 ? (
          <Text style={styles.caption}>Next {UPCOMING_WINDOW_DAYS} days</Text>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          title={`No birthdays in the next ${UPCOMING_WINDOW_DAYS} days`}
          message="Enjoy the quiet. All your friends' birthdays are on the Friends tab."
          actionLabel="See all friends"
          onAction={() => router.navigate('/friends')}
        />
      }
      ListFooterComponent={
        // TEMPORARY (Milestone 0 spike): remove with the dev-notifications screen in Milestone 2.
        <View style={styles.footer}>
          <Link href="/dev-notifications" style={styles.devLink}>
            Notification spike
          </Link>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  caption: { fontSize: fontSize.small, color: colors.textMuted, marginBottom: spacing.xs },
  footer: { alignItems: 'center', padding: spacing.lg },
  devLink: { fontSize: fontSize.small, color: colors.textMuted, textDecorationLine: 'underline' },
});
