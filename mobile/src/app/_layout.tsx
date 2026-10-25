import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { DATABASE_NAME, initDatabase } from '../db/database';
import { colors } from '../theme';

// TEMPORARY (Milestone 0 spike): moves into notificationsService in Milestone 2.
// Without a handler, notifications that arrive while the app is open are not shown.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  // Covers taps that cold-start the app (after force-quit) as well as taps while it is running.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { data } = lastResponse.notification.request.content;
    if (data?.screen === 'dev-notifications') {
      router.push({
        pathname: '/dev-notifications',
        params: { tappedScheduledFor: String(data.scheduledFor ?? '') },
      });
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse]);

  return (
    // onInit enables foreign keys and runs migrations before any screen renders.
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="friend/[id]" options={{ title: 'Friend' }} />
        <Stack.Screen name="friend/new" options={{ title: 'Add friend', presentation: 'modal' }} />
        <Stack.Screen name="dev-notifications" options={{ title: 'Notification spike' }} />
      </Stack>
    </SQLiteProvider>
  );
}
