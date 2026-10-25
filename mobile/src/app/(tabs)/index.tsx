import { Link, router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { FriendRow } from '../../components/FriendRow';
import { PermissionBanner } from '../../components/PermissionBanner';
import { UPCOMING_WINDOW_DAYS } from '../../config';
import { getDaysUntilBirthday } from '../../domain/birthdays';
import { sortFriends } from '../../domain/friend';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { colors, fonts, fontSize, spacing } from '../../theme';

// FR-2.1, FR-2.2: birthdays in the next UPCOMING_WINDOW_DAYS days, soonest first, today highlighted.
export default function UpcomingScreen() {
  const { friendsRepo } = useRepos();
  const load = useCallback(() => friendsRepo.list(), [friendsRepo]);
  const { data: friends, loadedAt: now } = useFocusedQuery(load);

  if (!friends) return null;

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
      contentContainerStyle={[styles.list, upcoming.length === 0 && styles.grow]}
      ListHeaderComponent={
        <View style={styles.header}>
          <PermissionBanner />
          {upcoming.length > 0 ? (
            <Text style={styles.caption} accessibilityRole="header">
              Next {UPCOMING_WINDOW_DAYS} days
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        friends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            message="Add a friend's birthday and we'll remind you in time to send a card."
            actionLabel="Add a friend"
            onAction={() => router.push('/friend/new')}
            icon="🎁"
          />
        ) : (
          <EmptyState
            title={`No birthdays in the next ${UPCOMING_WINDOW_DAYS} days`}
            message="Enjoy the quiet. All your friends' birthdays are on the Friends tab."
            actionLabel="See all friends"
            onAction={() => router.navigate('/friends')}
            icon="☕️"
          />
        )
      }
      ListFooterComponent={
        __DEV__ ? (
          <View style={styles.footer}>
            <Link href="/dev-reminders" style={styles.devLink}>
              Scheduled reminders (dev)
            </Link>
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm + 4, paddingBottom: spacing.xl },
  grow: { flexGrow: 1 },
  header: { gap: spacing.sm },
  caption: {
    fontFamily: fonts.display,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  footer: { alignItems: 'center', padding: spacing.lg },
  devLink: { fontSize: fontSize.small, color: colors.textMuted, textDecorationLine: 'underline' },
});
