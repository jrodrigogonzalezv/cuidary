import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { addDoc, collectionGroup, collection, doc, onSnapshot, query, setDoc, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ApplicationStatus, ShiftOffer } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DAYS_OF_WEEK, RATE_UNIT_LABEL, caregiverNetAmount, formatClp } from '@/lib/fees';
import { reportError } from '@/lib/errors';
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

const applicationStatusLabel: Record<ApplicationStatus, string> = {
  pendiente: 'Postulación enviada — esperando respuesta de la familia',
  elegido: '¡Fuiste elegido! Revisa "Turnos" para iniciarlo',
  rechazado: 'La familia eligió a otro cuidador',
};

export default function OffersScreen() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'disponibles' | 'mias'>('disponibles');
  const [offers, setOffers] = useState<ShiftOffer[]>([]);
  const [myApplications, setMyApplications] = useState<Record<string, ApplicationStatus>>({});
  const [appliedOffers, setAppliedOffers] = useState<ShiftOffer[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;
    const q = query(collectionGroup(db, 'applications'), where('caregiverUid', '==', user.uid));
    return onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, ApplicationStatus> = {};
        snapshot.docs.forEach((d) => {
          const offerId = d.ref.parent.parent?.id;
          if (offerId) map[offerId] = (d.data().status as ApplicationStatus) ?? 'pendiente';
        });
        setMyApplications(map);
      },
      () => setMyApplications({}),
    );
  }, [user]);

  useEffect(() => {
    const ids = Object.keys(myApplications);
    if (ids.length === 0) return;
    const unsubs = ids.map((offerId) =>
      onSnapshot(
        doc(db, 'shiftOffers', offerId),
        (snapshot) => {
          setAppliedOffers((prev) => {
            const rest = prev.filter((o) => o.id !== offerId);
            if (!snapshot.exists()) return rest;
            return [...rest, { id: snapshot.id, ...snapshot.data() } as ShiftOffer];
          });
        },
        () => {},
      ),
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(myApplications).sort())]);

  async function handleApply(offer: ShiftOffer) {
    if (!user || !profile) return;
    setApplyingId(offer.id);
    try {
      await setDoc(doc(db, 'shiftOffers', offer.id, 'applications', user.uid), {
        caregiverUid: user.uid,
        caregiverName: profile.name,
        caregiverPhotoUrl: profile.photoUrl ?? null,
        caregiverTitle: profile.title ?? null,
        ratingAvg: profile.ratingAvg ?? null,
        ratingCount: profile.ratingCount ?? null,
        status: 'pendiente',
        // eslint-disable-next-line react-hooks/purity -- Date.now() here runs inside an onPress handler, not during render.
        appliedAt: Date.now(),
      });
      await Promise.all(
        offer.familyUids.map((uid) =>
          addDoc(collection(db, 'notifications'), {
            uid,
            title: 'Nueva postulación',
            body: `${profile.name} se postuló al turno de ${offer.patientName}.`,
            read: false,
            createdAt: Date.now(),
            type: 'offer_applied',
          }),
        ),
      );
    } catch (error) {
      reportError('No se pudo enviar tu postulación', error);
    } finally {
      setApplyingId(null);
    }
  }

  const appliedIds = new Set(Object.keys(myApplications));
  const availableOffers = offers.filter((o) => !appliedIds.has(o.id));
  const sortedApplied = appliedOffers.slice().sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Ofertas" />
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'disponibles' && styles.tabActive]} onPress={() => setTab('disponibles')}>
          <Text style={[styles.tabText, tab === 'disponibles' && styles.tabTextActive]}>Disponibles</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'mias' && styles.tabActive]} onPress={() => setTab('mias')}>
          <Text style={[styles.tabText, tab === 'mias' && styles.tabTextActive]}>Mis postulaciones</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'disponibles' ? (
          <>
            <Text style={styles.hint}>
              {profile?.workComunas?.length
                ? `Mostrando ofertas en tus zonas de trabajo (${profile.workComunas.length} comunas).`
                : 'Aún no elegiste zonas de trabajo — te mostramos todas las ofertas abiertas. Configúralas en tu perfil para filtrar mejor.'}
            </Text>

            {availableOffers.length === 0 ? (
              <View style={styles.empty}>
                <FontAwesome name="briefcase" size={28} color={colors.muted} />
                <Text style={styles.emptyText}>No hay ofertas abiertas por ahora.</Text>
              </View>
            ) : (
              availableOffers.map((offer) => (
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

                  <Pressable style={styles.acceptButton} onPress={() => handleApply(offer)} disabled={applyingId === offer.id}>
                    <Text style={styles.acceptButtonText}>{applyingId === offer.id ? 'Enviando...' : 'Postularme'}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        ) : sortedApplied.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome name="paper-plane-o" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>Todavía no te has postulado a ninguna oferta.</Text>
          </View>
        ) : (
          sortedApplied.map((offer) => {
            const status = myApplications[offer.id] ?? 'pendiente';
            return (
              <View key={offer.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.patientName}>{offer.patientName}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{offer.scheduleType === 'puntual' ? 'Puntual' : 'Estable'}</Text>
                  </View>
                </View>
                <Text style={styles.schedule}>{scheduleLabel(offer)}</Text>
                <View
                  style={[
                    styles.statusRow,
                    status === 'elegido' && styles.statusRowChosen,
                    status === 'rechazado' && styles.statusRowRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      status === 'elegido' && styles.statusTextChosen,
                      status === 'rechazado' && styles.statusTextRejected,
                    ]}
                  >
                    {applicationStatusLabel[status]}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 12, paddingBottom: 120 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 5, gap: 4, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.white },
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
  statusRow: { backgroundColor: colors.bgSoft, borderRadius: 12, padding: 12, marginTop: 12 },
  statusRowChosen: { backgroundColor: colors.successSoft },
  statusRowRejected: { backgroundColor: colors.bgSoft },
  statusText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  statusTextChosen: { color: colors.success },
  statusTextRejected: { color: colors.muted },
});
