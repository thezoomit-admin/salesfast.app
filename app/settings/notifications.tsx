import { NotificationsScreen } from '../(tabs)/notifications';

/**
 * Stack copy of the inbox — opened from Settings so back returns there.
 * Tab bar still uses `(tabs)/notifications`.
 */
export default function SettingsNotificationsScreen() {
  return <NotificationsScreen showBack />;
}
