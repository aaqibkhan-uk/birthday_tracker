// TEMPORARY (Milestone 0 spike): verifies local notifications fire with the app force-quit.
// Delete this screen in Milestone 2 once notificationsService exists.
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ANDROID_CHANNEL_ID = 'reminders';

type Pending = { id: string; title: string; scheduledFor: string };

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export default function DevNotificationsScreen() {
  const { tappedScheduledFor } = useLocalSearchParams<{ tappedScheduledFor?: string }>();
  const [permission, setPermission] = useState<string>('unknown');
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState<string>('');

  const refresh = useCallback(async () => {
    const settings = await Notifications.getPermissionsAsync();
    setPermission(settings.granted ? 'granted' : settings.canAskAgain ? 'not asked' : 'denied');

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    setPending(
      scheduled.map((request) => ({
        id: request.identifier,
        title: request.content.title ?? '(no title)',
        scheduledFor: String(request.content.data?.scheduledFor ?? '?'),
      })),
    );
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Birthday reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const requestPermission = async () => {
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    setMessage(result.granted ? 'Permission granted.' : 'Permission not granted.');
    await refresh();
  };

  const schedule = async (secondsAhead: number) => {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      setMessage('Grant permission first.');
      return;
    }
    // DATE trigger (an absolute moment), the same kind the real reminders will use.
    const date = new Date(Date.now() + secondsAhead * 1000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Spike: birthday reminder',
        body: `Scheduled for ${date.toLocaleTimeString()}. Tap to open the spike screen.`,
        data: { screen: 'dev-notifications', scheduledFor: date.toISOString() },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    setMessage(`Scheduled for ${date.toLocaleTimeString()}.`);
    await refresh();
  };

  const cancelAll = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setMessage('Cancelled all scheduled notifications.');
    await refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {tappedScheduledFor ? (
        <View style={styles.tapped}>
          <Text style={styles.tappedText}>
            Opened from a notification scheduled for {formatTime(tappedScheduledFor)}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Permission: {permission}</Text>

      <SpikeButton label="Request permission" onPress={requestPermission} />
      <SpikeButton label="Schedule in 2 minutes" onPress={() => schedule(120)} />
      <SpikeButton label="Schedule in 10 seconds" onPress={() => schedule(10)} />
      <SpikeButton label="Refresh pending list" onPress={refresh} />
      <SpikeButton label="Cancel all" onPress={cancelAll} />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.heading}>Pending ({pending.length})</Text>
      {pending.length === 0 ? <Text style={styles.label}>None scheduled.</Text> : null}
      {pending.map((item) => (
        <Text key={item.id} style={styles.label}>
          • {item.title}: {formatTime(item.scheduledFor)}
        </Text>
      ))}
    </ScrollView>
  );
}

function SpikeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  message: {
    fontSize: 16,
    color: '#1a5e20',
  },
  button: {
    backgroundColor: '#1f4ea8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapped: {
    backgroundColor: '#fff4cc',
    padding: 12,
    borderRadius: 8,
  },
  tappedText: {
    fontSize: 16,
  },
});
