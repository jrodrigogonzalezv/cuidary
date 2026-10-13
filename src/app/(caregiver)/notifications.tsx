import { View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NotificationsList } from '@/components/NotificationsList';
import { useNotifications } from '@/lib/useNotifications';
import { colors } from '@/theme/colors';

export default function NotificationsScreen() {
  const items = useNotifications();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notificaciones" showBack />
      <NotificationsList items={items} />
    </View>
  );
}
