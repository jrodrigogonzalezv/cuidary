import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDoc, collection, doc, getDoc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Patient, UserProfile } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRatingDisplay } from '@/components/StarRating';
import { reportError } from '@/lib/errors';
import { colors } from '@/theme/colors';

const durationOptions = [
  { label: '4 horas', hours: 4 },
  { label: '8 horas', hours: 8 },
  { label: '12h Día', hours: 12 },
  { label: '12h Noche', hours: 12 },
  { label: '24 horas', hours: 24 },
];

const startOptions = [
  { label: 'Ahora', offsetMs: 0 },
  { label: 'En 1 hora', offsetMs: 60 * 60 * 1000 },
  { label: 'Mañana 09:00', offsetMs: null },
];

function nextDayAt9() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export default function BookCaregiverScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [caregivers, setCaregivers] = useState<UserProfile[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<UserProfile | null>(null);
  const [durationIndex, setDurationIndex] = useState(1);
  const [startIndex, setStartIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(db, 'patients', patientId)).then((snapshot) => {
      if (snapshot.exists()) setPatient({ id: snapshot.id, ...snapshot.data() } as Patient);
    });
  }, [patientId]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'cuidador'));
    return onSnapshot(
      q,
      (snapshot) => {
        setCaregivers(snapshot.docs.map((d) => d.data() as UserProfile));
      },
      () => setCaregivers([]),
    );
  }, []);

  async function handleConfirm() {
    if (!user || !patient || !selectedCaregiver) return;
    setSubmitting(true);
    try {
      const start = startOptions[startIndex];
      const startTime = start.offsetMs === null ? nextDayAt9() : Date.now() + start.offsetMs;
      await addDoc(collection(db, 'shifts'), {
        patientId: patient.id,
        patientName: patient.name,
        patientPhotoUrl: patient.photoUrl ?? null,
        caregiverUid: selectedCaregiver.uid,
        caregiverName: selectedCaregiver.name,
        familyUids: [user.uid],
        startTime,
        endTime: null,
        durationHours: durationOptions[durationIndex].hours,
        status: 'programado',
      });
      await addDoc(collection(db, 'notifications'), {
        uid: selectedCaregiver.uid,
        title: 'Nuevo turno asignado',
        body: `Te asignaron un turno con ${patient.name} — ${new Date(startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        read: false,
        createdAt: Date.now(),
        type: 'shift_assigned',
      });
      router.replace(`/(family)/patient/${patient.id}`);
    } catch (error) {
      reportError('No se pudo reservar el turno', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Reservar" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Reservar" showBack />
      <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reservar cuidador</Text>
      <Text style={styles.subtitle}>para {patient.name}</Text>

      <Text style={styles.sectionLabel}>1. Elige un cuidador</Text>
      {caregivers.length === 0 ? (
        <Text style={styles.empty}>No hay cuidadores disponibles por ahora.</Text>
      ) : (
        caregivers.map((caregiver) => {
          const selected = selectedCaregiver?.uid === caregiver.uid;
          return (
            <Pressable
              key={caregiver.uid}
              style={[styles.caregiverCard, selected && styles.caregiverCardSelected]}
              onPress={() => setSelectedCaregiver(caregiver)}
            >
              <Avatar name={caregiver.name} size={44} photoUrl={caregiver.photoUrl} />
              <View style={{ flex: 1 }}>
                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                <Text style={styles.caregiverMeta}>{caregiver.title || 'Cuidador/a'} · {caregiver.yearsExperience ?? 0} años exp.</Text>
                <StarRatingDisplay value={caregiver.ratingAvg ?? 0} count={caregiver.ratingCount ?? 0} size={11} />
              </View>
              {selected && <FontAwesome name="check-circle" size={22} color={colors.primary} />}
            </Pressable>
          );
        })
      )}

      <Text style={styles.sectionLabel}>2. Duración del turno</Text>
      <View style={styles.pillRow}>
        {durationOptions.map((option, index) => (
          <Pressable
            key={option.label}
            style={[styles.pill, durationIndex === index && styles.pillActive]}
            onPress={() => setDurationIndex(index)}
          >
            <Text style={[styles.pillText, durationIndex === index && styles.pillTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>3. Cuándo comienza</Text>
      <View style={styles.pillRow}>
        {startOptions.map((option, index) => (
          <Pressable
            key={option.label}
            style={[styles.pill, startIndex === index && styles.pillActive]}
            onPress={() => setStartIndex(index)}
          >
            <Text style={[styles.pillText, startIndex === index && styles.pillTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.confirmButton, !selectedCaregiver && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!selectedCaregiver || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.confirmButtonText}>Confirmar reserva</Text>
        )}
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 130 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 2, marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 10, marginTop: 8 },
  empty: { color: colors.muted },
  caregiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  caregiverCardSelected: { borderColor: colors.primary },
  caregiverName: { fontWeight: '700', color: colors.ink, fontSize: 15 },
  caregiverMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: colors.white },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
