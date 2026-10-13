import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, doc, onSnapshot, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FadeInUp } from '@/components/FadeInUp';
import { colors } from '@/theme/colors';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('uid', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as AppNotification)
          .sort((a, b) => b.createdAt - a.createdAt);
        setItems(list);
        list.filter((n) => !n.read).forEach((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      },
      () => setItems([]),
    );
  }, [user]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notificaciones" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <FontAwesome name="bell-o" size={28} color={colors.accent} />
            </View>
            <Text style={styles.empty}>No tienes notificaciones todavía.</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <FadeInUp key={item.id} delay={index * 60}>
              <View style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={styles.iconWrap}>
                  <FontAwesome name="heart" size={16} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(item.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
              </View>
            </FadeInUp>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 4, paddingBottom: 120 },
  emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardUnread: { backgroundColor: colors.primarySoft },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '800', color: colors.ink, fontSize: 14.5 },
  cardBody: { color: colors.muted, fontSize: 13, marginTop: 2 },
  cardTime: { color: colors.muted, fontSize: 11, marginTop: 6 },
});
