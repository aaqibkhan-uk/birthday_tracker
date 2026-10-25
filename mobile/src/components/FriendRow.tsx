import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAgeTurning, getDaysUntilBirthday } from '../domain/birthdays';
import { formatBirthday, formatDaysUntil } from '../domain/format';
import type { Friend } from '../domain/friend';
import { colors, fontSize, radius, spacing } from '../theme';

interface Props {
  friend: Friend;
  now: Date;
  onPress: () => void;
}

/** One friend in a list: birthday, age turning (if known) and days remaining. Today is highlighted. */
export function FriendRow({ friend, now, onPress }: Props) {
  const days = getDaysUntilBirthday(friend.birthDay, friend.birthMonth, now);
  const isToday = days === 0;
  const birthday = formatBirthday(friend.birthDay, friend.birthMonth);
  const age =
    friend.birthYear === null
      ? null
      : getAgeTurning(friend.birthYear, friend.birthDay, friend.birthMonth, now);
  const details = age === null ? birthday : `${birthday} · turning ${age}`;
  const when = isToday ? 'Birthday today!' : formatDaysUntil(days);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.name}, ${details}, ${when}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isToday && styles.today, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={styles.details}>{details}</Text>
      </View>
      <Text style={[styles.when, isToday && styles.whenToday]}>{when}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  today: { backgroundColor: colors.highlight, borderColor: colors.highlightBorder, borderWidth: 2 },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  details: { fontSize: fontSize.small, color: colors.textMuted },
  when: { fontSize: fontSize.small, color: colors.textMuted },
  whenToday: { color: colors.primary, fontWeight: '700' },
});
