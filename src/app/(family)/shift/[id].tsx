import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { Shift } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { VitalSignsList } from '@/components/VitalSignsList';
import { MedicationList } from '@/components/MedicationList';
import { GpsCheckinList } from '@/components/GpsCheckinList';
import { ShiftNotesList } from '@/components/ShiftNotesList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme/colors';

const statusLabel: Record<Shift['status'], string> = {
  programado: 'Programado',
  activo: 'En curso',
  completado: 'Completado',
};

export default function FamilyShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shift, setShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, 'shifts', id),
      (snapshot) => setShift(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Shift) : null),
      () => setShift(null),
    );
  }, [id]);

  if (!shift) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Turno" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Turno" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={shift.caregiverName} size={52} />
          <View>
            <Text style={styles.name}>{shift.caregiverName}</Text>
            <Text style={styles.meta}>
              {new Date(shift.startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
              {shift.durationHours}h
            </Text>
            <Text style={styles.statusBadge}>{statusLabel[shift.status]}</Text>
          </View>
        </View>

        <Section title="Signos Vitales">
          <VitalSignsList shiftId={shift.id} />
        </Section>
        <Section title="Fármacos administrados">
          <MedicationList shiftId={shift.id} />
        </Section>
        <Section title="Check-ins GPS">
          <GpsCheckinList shiftId={shift.id} />
        </Section>
        <Section title="Notas del turno">
          <ShiftNotesList shiftId={shift.id} />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 2 },
  statusBadge: { color: colors.primary, fontWeight: '700', fontSize: 12, marginTop: 4 },
  section: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 12 },
});
