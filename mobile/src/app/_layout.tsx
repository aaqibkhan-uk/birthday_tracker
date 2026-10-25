import { router, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { DATABASE_NAME, initDatabase } from '../db/database';
import { RemindersProvider } from '../hooks/reminders';
import {
  clearTappedReminder,
  configureNotifications,
  useTappedReminder,
} from '../services/notificationsService';
import { colors } from '../theme';

configureNotifications();

/** FR-3.4: a tapped reminder opens that friend's screen, which shows the "Create card" prompt. */
function ReminderTapHandler() {
  const tapped = useTappedReminder();
  const key = tapped?.key;
  const friendId = tapped?.friendId;

  useEffect(() => {
    if (key === undefined || friendId === undefined) return;
    router.push({ pathname: '/friend/[id]', params: { id: String(friendId) } });
    clearTappedReminder();
  }, [key, friendId]);

  return null;
}

export default function RootLayout() {
  return (
    // onInit enables foreign keys and runs migrations before any screen renders.
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <RemindersProvider>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="friend/[id]" options={{ title: 'Friend' }} />
          <Stack.Screen
            name="friend/new"
            options={{ title: 'Add friend', presentation: 'modal' }}
          />
          <Stack.Screen name="card/[cardId]/describe" options={{ title: 'Describe the picture' }} />
          <Stack.Screen name="card/[cardId]/designs" options={{ title: 'Choose a design' }} />
          <Stack.Screen name="card/[cardId]/message" options={{ title: 'Add your words' }} />
          <Stack.Screen name="dev-reminders" options={{ title: 'Scheduled reminders' }} />
        </Stack>
        {/* Rendered after the Stack so the navigator is mounted before it navigates. */}
        <ReminderTapHandler />
      </RemindersProvider>
    </SQLiteProvider>
  );
}
