import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { FriendRow } from '../../components/FriendRow';
import { sortFriends, type FriendSort } from '../../domain/friend';
import { useFocusedQuery } from '../../hooks/useFocusedQuery';
import { useRepos } from '../../hooks/useRepos';
import { spacing } from '../../theme';

const SORT_OPTIONS: { value: FriendSort; label: string }[] = [
  { value: 'name', label: 'A–Z' },
  { value: 'upcoming', label: 'Next birthday' },
];

// FR-1.3: all friends, sortable alphabetically or by next birthday.
export default function FriendsScreen() {
  const { friendsRepo } = useRepos();
  const load = useCallback(() => friendsRepo.list(), [friendsRepo]);
  const { data: friends, loadedAt: now } = useFocusedQuery(load);
  const [sort, setSort] = useState<FriendSort>('name');

  if (!friends) return null;

  if (friends.length === 0) {
    return (
      <EmptyState
        title="No friends yet"
        message="Add the people whose birthdays you want to remember."
        actionLabel="Add a friend"
        onAction={() => router.push('/friend/new')}
      />
    );
  }

  return (
    <FlatList
      data={sortFriends(friends, sort, now)}
      keyExtractor={(friend) => String(friend.id)}
      renderItem={({ item }) => (
        <FriendRow friend={item} now={now} onPress={() => router.push(`/friend/${item.id}`)} />
      )}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Sort by">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              accessibilityLabel={`Sort ${option.label}`}
              selected={sort === option.value}
              onPress={() => setSort(option.value)}
            />
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  sortRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
});
