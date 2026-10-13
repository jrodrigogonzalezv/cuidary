import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { Patient, Shift } from '@/types/models';
import { VitalSignsList } from '@/components/VitalSignsList';
import { MedicationList } from '@/components/MedicationList';
import { MedicationPlanManager } from '@/components/MedicationPlanManager';
import { GpsCheckinList } from '@/components/GpsCheckinList';
import { PatientBitacoraList } from '@/components/PatientBitacoraList';
import { PatientHistoryManager } from '@/components/PatientHistoryManager';
import { PhotoPicker } from '@/components/PhotoPicker';
import { RatingPrompt } from '@/components/RatingPrompt';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme/colors';

type SectionKey = 'vitales' | 'farmacos' | 'gps';

const sections: { key: SectionKey; label: string }[] = [
  { key: 'vitales', label: 'Signos Vitales' },
  { key: 'farmacos', label: 'Administrados' },
  { key: 'gps', label: 'GPS' },
];

export default function PatientBitacoraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [upcomingShift, setUpcomingShift] = useState<Shift | null>(null);
  const [lastCompletedShift, setLastCompletedShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [activeSection, setActiveSection] = useState<SectionKey>('vitales');

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, 'patients', id),
      (snapshot) => {
        setPatient(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Patient) : null);
      },
      () => setPatient(null),
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'shifts'),
      where('patientId', '==', id),
      where('status', 'in', ['programado', 'activo']),
      orderBy('startTime', 'asc'),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const docSnap = snapshot.docs[0];
        setUpcomingShift(docSnap ? ({ id: docSnap.id, ...docSnap.data() } as Shift) : null);
      },
      () => setUpcomingShift(null),
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'shifts'),
      where('patientId', '==', id),
      where('status', '==', 'completado'),
      orderBy('startTime', 'asc'),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs;
        const last = docs[docs.length - 1];
        setLastCompletedShift(last ? ({ id: last.id, ...last.data() } as Shift) : null);
      },
      () => setLastCompletedShift(null),
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'shifts'), where('patientId', '==', id), orderBy('startTime', 'desc'), limit(20));
    return onSnapshot(
      q,
      (snapshot) => setShiftHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Shift)),
      () => setShiftHistory([]),
    );
  }, [id]);

  if (!patient) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Paciente" showBack />
        <View style={styles.center}>
          <Text style={styles.empty}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paciente" showBack />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <PhotoPicker
          name={patient.name}
          photoUrl={patient.photoUrl}
          size={52}
          onChange={(photoUrl) => updateDoc(doc(db, 'patients', patient.id), { photoUrl })}
        />
        <View>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.meta}>
            {patient.age} años · {patient.comuna}
          </Text>
        </View>
      </View>

      {patient.activeShiftId ? (
        <>
          <View style={styles.tabs}>
            {sections.map((section) => (
              <Pressable
                key={section.key}
                style={[styles.tab, activeSection === section.key && styles.tabActive]}
                onPress={() => setActiveSection(section.key)}
              >
                <Text style={[styles.tabText, activeSection === section.key && styles.tabTextActive]}>
                  {section.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.panel}>
            {activeSection === 'vitales' && <VitalSignsList shiftId={patient.activeShiftId} />}
            {activeSection === 'farmacos' && <MedicationList shiftId={patient.activeShiftId} />}
            {activeSection === 'gps' && <GpsCheckinList shiftId={patient.activeShiftId} />}
          </View>
        </>
      ) : upcomingShift ? (
        <View style={styles.upcomingCard}>
          <View style={styles.upcomingIconWrap}>
            <FontAwesome name="clock-o" size={24} color={colors.accent} />
          </View>
          <Text style={styles.upcomingTitle}>Turno programado</Text>
          <Text style={styles.upcomingMeta}>
            {upcomingShift.caregiverName} ·{' '}
            {new Date(upcomingShift.startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
          <Text style={styles.upcomingMeta}>{upcomingShift.durationHours} horas</Text>
        </View>
      ) : (
        <View style={styles.noShiftCard}>
          <View style={styles.upcomingIconWrap}>
            <FontAwesome name="calendar-plus-o" size={24} color={colors.primary} />
          </View>
          <Text style={styles.noShift}>No hay un turno activo en este momento.</Text>
          <Pressable style={styles.bookButton} onPress={() => router.push(`/(family)/book/${patient.id}`)}>
            <Text style={styles.bookButtonText}>Reservar cuidador</Text>
          </Pressable>
          <Pressable style={styles.offerButton} onPress={() => router.push(`/(family)/offer/${patient.id}`)}>
            <Text style={styles.offerButtonText}>Publicar oferta abierta</Text>
          </Pressable>
        </View>
      )}

      {lastCompletedShift && !patient.activeShiftId && (
        <View style={{ marginTop: 16 }}>
          <RatingPrompt shift={lastCompletedShift} patientName={patient.name} />
        </View>
      )}

      <View style={styles.sectionCard}>
        <PatientHistoryManager patient={patient} />
      </View>

      <View style={styles.sectionCard}>
        <MedicationPlanManager patientId={patient.id} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Turnos</Text>
        {shiftHistory.length === 0 ? (
          <Text style={styles.empty}>Sin turnos registrados aún.</Text>
        ) : (
          shiftHistory.map((s) => (
            <Pressable key={s.id} style={styles.shiftRow} onPress={() => router.push(`/(family)/shift/${s.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftCaregiver}>{s.caregiverName}</Text>
                <Text style={styles.shiftMeta}>
                  {new Date(s.startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} · {s.durationHours}h
                </Text>
              </View>
              <Text style={[styles.shiftStatus, s.status === 'activo' && { color: colors.success }]}>
                {s.status === 'programado' ? 'Programado' : s.status === 'activo' ? 'En curso' : 'Completado'}
              </Text>
              <FontAwesome name="chevron-right" size={13} color={colors.muted} />
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Bitácora</Text>
        <PatientBitacoraList patientId={patient.id} />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 2 },
  noShiftCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  upcomingCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 4,
  },
  upcomingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  upcomingTitle: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  upcomingMeta: { color: colors.muted, fontSize: 13 },
  noShift: { color: colors.muted, textAlign: 'center' },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  bookButtonText: { color: colors.white, fontWeight: '700' },
  offerButton: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 10 },
  offerButtonText: { color: colors.primary, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 5, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 12.5 },
  tabTextActive: { color: colors.white },
  panel: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
  },
  sectionCardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shiftCaregiver: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  shiftMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  shiftStatus: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
