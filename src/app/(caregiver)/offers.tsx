import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { addDoc, collection, doc, getDoc, onSnapshot, query, updateDoc, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ShiftOffer } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DAYS_OF_WEEK, RATE_UNIT_LABEL, caregiverNetAmount, formatClp } from '@/lib/fees';
import { colors } from '@/theme/colors';

function scheduleLabel(offer: ShiftOffer) {
  if (offer.scheduleType === 'puntual') {
    const date = offer.startTime ? new Date(offer.startTime) : null;
    return date
      ? `${date.toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })} · ${offer.durationHours} horas`
      : 'Turno puntual';
  }
  const days = (offer.daysOfWeek ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAYS_OF_WEEK.find((item) => item.value === d)?.label)
    .join(', ');
  return `${days} · ${offer.startHour} a ${offer.endHour}`;
}

export default function OffersScreen() {
  const { user, profile } = useAuth();
  const [offers, setOffers] = useState<ShiftOffer[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'shiftOffers'), where('status', '==', 'abierta'));
    return onSnapshot(
      q,
      (snapshot) => {
        const zones = profile?.workComunas ?? [];
        const docs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ShiftOffer)
          .filter((offer) => zones.length === 0 || zones.includes(offer.patientComuna))
          .sort((a, b) => b.createdAt - a.createdAt);
        setOffers(docs);
      },
      () => setOffers([]),
    );
  }, [profile?.workComunas]);

  async function handleAccept(offer: ShiftOffer) {
    if (!user || !profile) return;
    setAcceptingId(offer.id);
    try {
      await updateDoc(doc(db, 'shiftOffers', offer.id), {
        status: 'asignada',
        assignedCaregiverUid: user.uid,
        assignedCaregiverName: profile.name,
      });

      if (offer.scheduleType === 'puntual') {
        const patientSnap = await getDoc(doc(db, 'patients', offer.patientId));
        const patientPhotoUrl = patientSnap.exists() ? (patientSnap.data()?.photoUrl as string | undefined) : undefined;
        await addDoc(collection(db, 'shifts'), {
          patientId: offer.patientId,
          patientName: offer.patientName,
          patientPhotoUrl: patientPhotoUrl ?? null,
          caregiverUid: user.uid,
          caregiverName: profile.name,
          familyUids: offer.familyUids,
          startTime: offer.startTime,
          endTime: null,
          durationHours: offer.durationHours,
          status: 'programado',
          offerId: offer.id,
          agreedAmount: offer.offeredAmount,
          rateUnit: offer.rateUnit,
        });
      }

      await Promise.all(
        offer.familyUids.map((uid) =>
          addDoc(collection(db, 'notifications'), {
            uid,
            title: 'Oferta aceptada',
            body: `${profile.name} aceptó tu oferta para ${offer.patientName}.`,
            read: false,
            createdAt: Date.now(),
            type: 'shift_assigned',
          }),
        ),
      );

      if (offer.scheduleType === 'recurrente') {
        Alert.alert(
          'Turno estable aceptado',
          'Lo vas a ver en "Turnos" como un turno estable. Cada día que corresponda, entra y presiona "Iniciar turno de hoy".',
        );
      }
    } catch {
      Alert.alert('No se pudo aceptar', 'Puede que otro cuidador ya haya tomado esta oferta.');
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ofertas" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          {profile?.workComunas?.length
            ? `Mostrando ofertas en tus zonas de trabajo (${profile.workComunas.length} comunas).`
            : 'Aún no elegiste zonas de trabajo — te mostramos todas las ofertas abiertas. Configúralas en tu perfil para filtrar mejor.'}
        </Text>

        {offers.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome name="briefcase" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>No hay ofertas abiertas por ahora.</Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{offer.patientName}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{offer.scheduleType === 'puntual' ? 'Puntual' : 'Estable'}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                <FontAwesome name="map-marker" size={12} color={colors.muted} /> {offer.patientComuna}
              </Text>
              <Text style={styles.schedule}>{scheduleLabel(offer)}</Text>
              {offer.observations ? <Text style={styles.observations}>{offer.observations}</Text> : null}

              <View style={styles.payRow}>
                <Text style={styles.payAmount}>{formatClp(caregiverNetAmount(offer.offeredAmount))}</Text>
                <Text style={styles.payUnit}>{RATE_UNIT_LABEL[offer.rateUnit]} · ya descontada la comisión de Cuidary</Text>
              </View>

              <Pressable style={styles.acceptButton} onPress={() => handleAccept(offer)} disabled={acceptingId === offer.id}>
                <Text style={styles.acceptButtonText}>{acceptingId === offer.id ? 'Aceptando...' : 'Aceptar oferta'}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  hint: { color: colors.muted, fontSize: 12.5, marginBottom: 16, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 50 },
  emptyText: { color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  typeBadge: { backgroundColor: colors.lavenderSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { color: colors.lavender, fontSize: 11, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
  schedule: { color: colors.ink, fontWeight: '700', fontSize: 14, marginTop: 6 },
  observations: { color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 18 },
  payRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  payAmount: { fontSize: 20, fontWeight: '800', color: colors.success },
  payUnit: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  acceptButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  acceptButtonText: { color: colors.white, fontWeight: '700' },
});
