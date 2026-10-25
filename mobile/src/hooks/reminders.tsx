import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking } from 'react-native';
import {
  getPermissionStatus,
  requestPermission,
  rescheduleAll,
  type PermissionStatus,
} from '../services/notificationsService';
import { useRepos } from './useRepos';

interface RemindersContextValue {
  permission: PermissionStatus | null;
  /** FR-3.1: reminders are off and the user has not dismissed the banner this session. */
  showPermissionBanner: boolean;
  dismissPermissionBanner: () => void;
  /** Asks again if the OS still allows it, otherwise opens system settings. */
  fixPermission: () => Promise<void>;
  /** Re-derives all notifications from the friends table. Call after any friend change. */
  reschedule: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

/**
 * Owns notification permission and rescheduling. On first launch it asks for permission
 * (FR-3.1); on every launch and every return to the foreground it reschedules (FR-3.3.2), which
 * also re-anchors reminders to 09:00 after a timezone change.
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { friendsRepo, profileRepo } = useRepos();
  const [permission, setPermission] = useState<PermissionStatus | null>(null);
  const [prompted, setPrompted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const reschedule = useCallback(async () => {
    try {
      await rescheduleAll(await friendsRepo.list());
    } catch (error) {
      // Never block the UI on scheduling; the next launch or foreground retries.
      console.warn('Rescheduling reminders failed', error);
    }
  }, [friendsRepo]);

  const refresh = useCallback(async () => {
    setPermission(await getPermissionStatus());
    await reschedule();
  }, [reschedule]);

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await profileRepo.get();
      if (!profile.notificationsPrompted) {
        await requestPermission();
        await profileRepo.setNotificationsPrompted(true);
      }
      if (!active) return;
      setPrompted(true);
      await refresh();
    })();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [profileRepo, refresh]);

  const fixPermission = useCallback(async () => {
    if (permission === 'undetermined') {
      await requestPermission();
      await refresh();
    } else {
      // Returning from Settings fires AppState 'active', which refreshes the status.
      await Linking.openSettings();
    }
  }, [permission, refresh]);

  const value = useMemo<RemindersContextValue>(
    () => ({
      permission,
      showPermissionBanner:
        prompted && permission !== null && permission !== 'granted' && !bannerDismissed,
      dismissPermissionBanner: () => setBannerDismissed(true),
      fixPermission,
      reschedule,
    }),
    [permission, prompted, bannerDismissed, fixPermission, reschedule],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const value = useContext(RemindersContext);
  if (!value) throw new Error('useReminders must be used inside RemindersProvider');
  return value;
}
