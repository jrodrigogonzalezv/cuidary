import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ShiftOffer } from '@/types/models';
import { colors } from '@/theme/colors';

function todayAt(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function isSameDay(timestamp: number) {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}

export function StableShiftsSection() {
  const { user, profile } = useAuth();
  const [offers, setOffers] = useState<ShiftOffer[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'shiftOffers'),
      where('assignedCaregiverUid', '==', user.uid),
      where('status', '==', 'asignada'),
      where('scheduleType', '==', 'recurrente'),
    );
    return onSnapshot(
      q,
      (snapshot) => setOffers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ShiftOffer)),
      () => setOffers([]),
    );
  }, [user]);

  if (offers.length === 0) return null;

  const today = new Date().getDay();

  async function handleStartToday(offer: ShiftOffer) {
    if (!user || !profile || !offer.startHour || !offer.endHour) return;
    setStartingId(offer.id);
    try {
      const existing = await getDocs(query(collection(db, 'shifts'), where('offerId', '==', offer.id)));
      const todayDoc = existing.docs.find((d) => isSameDay(d.data().startTime as number));
      if (todayDoc) {
        router.push(`/(caregiver)/shift/${todayDoc.id}`);
        return;
      }
      const start = todayAt(offer.startHour);
      const end = todayAt(offer.endHour);
      const durationHours = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
      const patientSnap = await getDoc(doc(db, 'patients', offer.patientId));
      const patientPhotoUrl = patientSnap.exists() ? (patientSnap.data()?.photoUrl as string | undefined) : undefined;
      const ref = await addDoc(collection(db, 'shifts'), {
        patientId: offer.patientId,
        patientName: offer.patientName,
        patientPhotoUrl: patientPhotoUrl ?? null,
        caregiverUid: user.uid,
        caregiverName: profile.name,
        familyUids: offer.familyUids,
        startTime: start,
        endTime: null,
        durationHours,
        status: 'programado',
        offerId: offer.id,
        agreedAmount: offer.offeredAmount,
        rateUnit: offer.rateUnit,
      });
      router.push(`/(caregiver)/shift/${ref.id}`);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Turnos estables</Text>
      {offers.map((offer) => {
        const isToday = (offer.daysOfWeek ?? []).includes(today);
        return (
          <View key={offer.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{offer.patientName}</Text>
              <Text style={styles.meta}>
                {offer.startHour} – {offer.endHour}
              </Text>
            </View>
            <Pressable
              style={[styles.button, !isToday && styles.buttonDisabled]}
              onPress={() => handleStartToday(offer)}
              disabled={!isToday || startingId === offer.id}
            >
              {startingId === offer.id ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>{isToday ? 'Iniciar turno de hoy' : 'Hoy no corresponde'}</Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  name: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 11.5, textAlign: 'center' },
});
