import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Shift } from '@/types/models';
import { colors, cardPalettes } from '@/theme/colors';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatTile } from '@/components/StatTile';
import { FadeInUp } from '@/components/FadeInUp';
import { Pulse } from '@/components/Pulse';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { StableShiftsSection } from '@/components/StableShiftsSection';
import { EarningsSummary } from '@/components/EarningsSummary';
import { Toast, useToastQueue } from '@/components/Toast';

const statusLabel: Record<Shift['status'], string> = {
  programado: 'Programado',
  activo: 'En curso',
  completado: 'Completado',
};

export default function CaregiverHome() {
  const { user, profile } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [history, setHistory] = useState<Shift[]>([]);
  const [tab, setTab] = useState<'proximos' | 'historial'>('proximos');
  const { toast, showToast, dismiss } = useToastQueue();
  const knownShiftIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'shifts'),
      where('caregiverUid', '==', user.uid),
      where('status', 'in', ['programado', 'activo']),
      orderBy('startTime', 'asc'),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Shift);
        if (knownShiftIds.current) {
          const fresh = next.find((s) => !knownShiftIds.current!.has(s.id));
          if (fresh) showToast(`Nuevo turno asignado: ${fresh.patientName}`, 'info');
        }
        knownShiftIds.current = new Set(next.map((s) => s.id));
        setShifts(next);
      },
      () => setShifts([]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'shifts'),
      where('caregiverUid', '==', user.uid),
      where('status', '==', 'completado'),
      orderBy('startTime', 'asc'),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        setHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Shift).reverse());
      },
      () => setHistory([]),
    );
  }, [user]);

  const activeCount = shifts.filter((s) => s.status === 'activo').length;
  const list = tab === 'proximos' ? shifts : history;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Turnos" />
      <Toast toast={toast} onDone={dismiss} />
      <ScrollView contentContainerStyle={styles.content}>
        <DashboardHeader
          name={profile?.name ?? 'Cuidador'}
          subtitle="Tus turnos de hoy"
          photoUrl={profile?.photoUrl}
          right={<NotificationBell href="/(caregiver)/notifications" />}
        />

        <FadeInUp>
          <View style={styles.statsRow}>
            <StatTile
              icon="clock-o"
              label="Turnos asignados"
              value={String(shifts.length)}
              bg={colors.accentSoft}
              fg={colors.accent}
            />
            <StatTile
              icon="heartbeat"
              label="En curso ahora"
              value={String(activeCount)}
              bg={colors.primarySoft}
              fg={colors.primary}
            />
          </View>
        </FadeInUp>

        <EarningsSummary history={history} />

        <StableShiftsSection />

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'proximos' && styles.tabActive]} onPress={() => setTab('proximos')}>
            <Text style={[styles.tabText, tab === 'proximos' && styles.tabTextActive]}>Próximos</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'historial' && styles.tabActive]} onPress={() => setTab('historial')}>
            <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>Historial</Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <FontAwesome name="clock-o" size={28} color={colors.accent} />
            </View>
            <Text style={styles.empty}>
              {tab === 'proximos' ? 'No tienes turnos asignados por ahora.' : 'Todavía no tienes turnos completados.'}
            </Text>
          </View>
        ) : (
          list.map((item, index) => {
            const palette = cardPalettes[(index + 1) % cardPalettes.length];
            const isHistory = tab === 'historial';
            return (
              <FadeInUp key={item.id} delay={index * 70}>
                <Pressable
                  style={[styles.card, { backgroundColor: palette.bg }, isHistory && styles.cardMuted]}
                  onPress={() => !isHistory && router.push(`/(caregiver)/shift/${item.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardAvatar, { backgroundColor: palette.fg }]}>
                      <FontAwesome name="heart" size={18} color={colors.white} />
                    </View>
                    {item.status === 'activo' ? (
                      <Pulse>
                        <View style={[styles.badge, styles.badgeActive]}>
                          <Text style={[styles.badgeText, styles.badgeTextActive]}>{statusLabel[item.status]}</Text>
                        </View>
                      </Pulse>
                    ) : (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{statusLabel[item.status]}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardName}>{item.patientName}</Text>
                  <Text style={styles.cardMeta}>
                    {new Date(item.startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </Pressable>
              </FadeInUp>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 5, gap: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.white },
  emptyState: { alignItems: 'center', marginTop: 24, gap: 10, paddingVertical: 24 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center' },
  card: { borderRadius: 22, padding: 18, marginBottom: 14 },
  cardMuted: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 19, fontWeight: '800', color: colors.ink },
  cardMeta: { color: colors.muted, marginTop: 2, fontWeight: '500' },
  badge: { backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActive: { backgroundColor: colors.primary },
  badgeText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: colors.white },
});
