import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAgeTurning, getDaysUntilBirthday } from '../domain/birthdays';
import { formatBirthday, formatDaysUntil } from '../domain/format';
import type { Friend } from '../domain/friend';
import { colors, fonts, fontSize, radius, shadow, spacing } from '../theme';
import { Avatar } from './Avatar';

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
      <Avatar name={friend.name} />
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={styles.details}>{details}</Text>
      </View>
      {isToday ? (
        <View style={[styles.badge, styles.badgeToday]}>
          <Text style={styles.badgeEmoji}>🎂</Text>
          <Text style={[styles.badgeUnit, styles.badgeTodayText]}>Today</Text>
        </View>
      ) : days === 1 ? (
        <View style={[styles.badge, styles.badgeSoon]}>
          <Text style={[styles.badgeUnit, styles.badgeSoonText]}>Tomorrow</Text>
        </View>
      ) : (
        <View style={[styles.badge, days <= 7 && styles.badgeSoon]}>
          <Text style={[styles.badgeNumber, days <= 7 && styles.badgeSoonText]}>{days}</Text>
          <Text style={[styles.badgeUnit, days <= 7 && styles.badgeSoonText]}>days</Text>
        </View>
      )}
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
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  today: { backgroundColor: colors.highlight, borderWidth: 2, borderColor: colors.gold },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  main: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  details: { fontSize: fontSize.small, color: colors.textMuted },
  badge: {
    minWidth: 60,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  badgeSoon: { backgroundColor: colors.primarySoft },
  badgeSoonText: { color: colors.primary },
  badgeToday: { backgroundColor: colors.gold },
  badgeTodayText: { color: colors.text },
  badgeNumber: {
    fontFamily: fonts.display,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  badgeUnit: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  badgeEmoji: { fontSize: 18, lineHeight: 22 },
});
