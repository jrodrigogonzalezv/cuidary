import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'cuidary-events';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let readyPromise: Promise<boolean> | null = null;

export function ensureNotificationsReady(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Notificaciones de Cuidary',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.status === 'granted') return true;
      const requested = await Notifications.requestPermissionsAsync();
      return requested.status === 'granted';
    })().catch(() => false);
  }
  return readyPromise;
}

export async function showLocalNotification(title: string, body: string) {
  try {
    const granted = await ensureNotificationsReady();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === 'android' ? ({ channelId: CHANNEL_ID } as Notifications.NotificationTriggerInput) : null,
    });
  } catch {
    // Local notifications are a best-effort convenience — never block the app on this.
  }
}
