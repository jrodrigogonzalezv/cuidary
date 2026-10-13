import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ShiftOffer } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RATE_UNIT_LABEL, formatClp } from '@/lib/fees';
import { colors } from '@/theme/colors';

const statusLabel: Record<ShiftOffer['status'], string> = {
  abierta: 'Abierta — esperando postulantes',
  asignada: 'Asignada',
  cerrada: 'Cerrada',
};

function ApplicantCount({ offerId }: { offerId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'shiftOffers', offerId, 'applications'),
      (snapshot) => setCount(snapshot.size),
      () => setCount(null),
    );
  }, [offerId]);

  if (count === null) return null;
  return (
    <Text style={styles.applicantCount}>
      {count === 0 ? 'Sin postulantes aún' : `${count} ${count === 1 ? 'postulante' : 'postulantes'}`}
    </Text>
  );
}

export default function FamilyOffersScreen() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<ShiftOffer[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'shiftOffers'), where('createdBy', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        setOffers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ShiftOffer).sort((a, b) => b.createdAt - a.createdAt));
      },
      () => setOffers([]),
    );
  }, [user]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mis ofertas" />
      <ScrollView contentContainerStyle={styles.content}>
        {offers.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome name="briefcase" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>Todavía no has publicado ninguna oferta de turno.</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <Pressable
              key={offer.id}
              style={styles.card}
              onPress={() => offer.status === 'abierta' && router.push(`/(family)/offer-applicants/${offer.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{offer.patientName}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{offer.scheduleType === 'puntual' ? 'Puntual' : 'Estable'}</Text>
                </View>
              </View>
              <Text style={styles.amount}>
                {formatClp(offer.offeredAmount)} {RATE_UNIT_LABEL[offer.rateUnit]}
              </Text>
              <Text style={[styles.status, offer.status === 'asignada' && styles.statusAssigned]}>{statusLabel[offer.status]}</Text>
              {offer.status === 'abierta' && (
                <View style={styles.footer}>
                  <ApplicantCount offerId={offer.id} />
                  <FontAwesome name="chevron-right" size={13} color={colors.muted} />
                </View>
              )}
              {offer.status === 'asignada' && offer.assignedCaregiverName && (
                <Text style={styles.assignedTo}>Elegido: {offer.assignedCaregiverName}</Text>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 50 },
  emptyText: { color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  typeBadge: { backgroundColor: colors.lavenderSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { color: colors.lavender, fontSize: 11, fontWeight: '700' },
  amount: { color: colors.ink, fontWeight: '700', fontSize: 14, marginTop: 8 },
  status: { color: colors.muted, fontSize: 12.5, marginTop: 4 },
  statusAssigned: { color: colors.success, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  applicantCount: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  assignedTo: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
});
