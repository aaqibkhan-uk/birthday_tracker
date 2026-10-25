import { useReminders } from '../hooks/reminders';
import { Banner } from './Banner';

/** FR-3.1: explains that reminders are off, with a way to turn them on. */
export function PermissionBanner() {
  const { permission, showPermissionBanner, dismissPermissionBanner, fixPermission } =
    useReminders();
  if (!showPermissionBanner) return null;
  return (
    <Banner
      message="Notifications are off, so you won't get birthday reminders."
      actionLabel={permission === 'undetermined' ? 'Turn on reminders' : 'Open Settings'}
      onAction={() => void fixPermission()}
      onDismiss={dismissPermissionBanner}
    />
  );
}
