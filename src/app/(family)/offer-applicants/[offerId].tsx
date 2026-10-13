import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { OfferApplication, ShiftOffer } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { CaregiverReputationCard } from '@/components/CaregiverReputationCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { reportError } from '@/lib/errors';
import { colors } from '@/theme/colors';

export default function OfferApplicantsScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const [offer, setOffer] = useState<ShiftOffer | null>(null);
  const [applications, setApplications] = useState<OfferApplication[]>([]);
  const [choosingUid, setChoosingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!offerId) return;
    return onSnapshot(
      doc(db, 'shiftOffers', offerId),
      (snapshot) => setOffer(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ShiftOffer) : null),
      () => setOffer(null),
    );
  }, [offerId]);

  useEffect(() => {
    if (!offerId) return;
    return onSnapshot(
      collection(db, 'shiftOffers', offerId, 'applications'),
      (snapshot) =>
        setApplications(
          snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as OfferApplication)
            .sort((a, b) => b.appliedAt - a.appliedAt),
        ),
      () => setApplications([]),
    );
  }, [offerId]);

  async function handleChoose(application: OfferApplication) {
    if (!offer) return;
    setChoosingUid(application.caregiverUid);
    try {
      await updateDoc(doc(db, 'shiftOffers', offer.id), {
        status: 'asignada',
        assignedCaregiverUid: application.caregiverUid,
        assignedCaregiverName: application.caregiverName,
      });

      if (offer.scheduleType === 'puntual') {
        const patientSnap = await getDoc(doc(db, 'patients', offer.patientId));
        const patientPhotoUrl = patientSnap.exists() ? (patientSnap.data()?.photoUrl as string | undefined) : undefined;
        await addDoc(collection(db, 'shifts'), {
          patientId: offer.patientId,
          patientName: offer.patientName,
          patientPhotoUrl: patientPhotoUrl ?? null,
          caregiverUid: application.caregiverUid,
          caregiverName: application.caregiverName,
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

      const applicationsSnap = await getDocs(collection(db, 'shiftOffers', offer.id, 'applications'));
      await Promise.all(
        applicationsSnap.docs.map((d) => {
          const chosen = d.id === application.caregiverUid;
          return Promise.all([
            updateDoc(d.ref, { status: chosen ? 'elegido' : 'rechazado' }),
            addDoc(collection(db, 'notifications'), {
              uid: d.data().caregiverUid,
              title: chosen ? '¡Fuiste elegido!' : 'Oferta no disponible',
              body: chosen
                ? `La familia te eligió para el turno de ${offer.patientName}.`
                : `La familia eligió a otro cuidador para el turno de ${offer.patientName}.`,
              read: false,
              createdAt: Date.now(),
              type: chosen ? 'offer_chosen' : 'offer_not_chosen',
            }),
          ]);
        }),
      );

      router.back();
    } catch (error) {
      reportError('No se pudo elegir a este cuidador', error);
    } finally {
      setChoosingUid(null);
    }
  }

  if (!offer) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Postulantes" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Postulantes" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Turno para {offer.patientName}</Text>
        <Text style={styles.subtitle}>Elige quién lo va a cuidar. Al elegir, los demás postulantes quedan notificados.</Text>

        {applications.length === 0 ? (
          <View style={styles.empty}>
            <FontAwesome name="user-o" size={28} color={colors.muted} />
            <Text style={styles.emptyText}>Todavía no hay postulantes para esta oferta.</Text>
          </View>
        ) : (
          applications.map((application) => (
            <View key={application.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Avatar name={application.caregiverName} size={48} photoUrl={application.caregiverPhotoUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{application.caregiverName}</Text>
                  <Text style={styles.jobTitle}>{application.caregiverTitle || 'Cuidador/a'}</Text>
                </View>
              </View>

              <View style={styles.reputationWrap}>
                <CaregiverReputationCard
                  caregiverUid={application.caregiverUid}
                  ratingAvg={application.ratingAvg}
                  ratingCount={application.ratingCount}
                />
              </View>

              {offer.status === 'abierta' ? (
                <Pressable
                  style={styles.chooseButton}
                  onPress={() => handleChoose(application)}
                  disabled={choosingUid === application.caregiverUid}
                >
                  {choosingUid === application.caregiverUid ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.chooseButtonText}>Elegir a este cuidador</Text>
                  )}
                </Pressable>
              ) : (
                <View style={styles.statusPill}>
                  <Text
                    style={[
                      styles.statusPillText,
                      application.status === 'elegido' && { color: colors.success },
                    ]}
                  >
                    {application.status === 'elegido' ? 'Elegido' : application.status === 'rechazado' ? 'No elegido' : 'Pendiente'}
                  </Text>
                </View>
              )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 20, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 50 },
  emptyText: { color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  jobTitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  reputationWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  chooseButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  chooseButtonText: { color: colors.white, fontWeight: '700' },
  statusPill: { backgroundColor: colors.bgSoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 14 },
  statusPillText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
});
