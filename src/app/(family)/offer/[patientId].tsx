import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { OfferRateUnit, OfferScheduleType, Patient, UserProfile } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectModal } from '@/components/SelectModal';
import { CUIDARY_FEE_RATE, DAYS_OF_WEEK, RATE_UNIT_LABEL, caregiverNetAmount, formatClp } from '@/lib/fees';
import { reportError } from '@/lib/errors';
import { colors } from '@/theme/colors';

const durationOptions = [
  { label: '4 horas', hours: 4 },
  { label: '8 horas', hours: 8 },
  { label: '12 horas', hours: 12 },
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

const rateUnitOptions = (Object.keys(RATE_UNIT_LABEL) as OfferRateUnit[]).map((code) => ({ code, name: RATE_UNIT_LABEL[code] }));
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function PostShiftOfferScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);

  const [scheduleType, setScheduleType] = useState<OfferScheduleType>('puntual');
  const [durationIndex, setDurationIndex] = useState(1);
  const [startIndex, setStartIndex] = useState(0);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('17:00');
  const [observations, setObservations] = useState('');
  const [amount, setAmount] = useState('');
  const [rateUnit, setRateUnit] = useState<OfferRateUnit>('turno');
  const [rateUnitModal, setRateUnitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    getDoc(doc(db, 'patients', patientId)).then((snapshot) => {
      if (snapshot.exists()) setPatient({ id: snapshot.id, ...snapshot.data() } as Patient);
    });
  }, [patientId]);

  function toggleDay(value: number) {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  async function notifyMatchingCaregivers(patientComuna: string, body: string) {
    const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'cuidador')));
    const matches = snapshot.docs
      .map((d) => d.data() as UserProfile)
      .filter((c) => !c.workComunas || c.workComunas.length === 0 || c.workComunas.includes(patientComuna));
    await Promise.all(
      matches.map((c) =>
        addDoc(collection(db, 'notifications'), {
          uid: c.uid,
          title: 'Nueva oferta de turno',
          body,
          read: false,
          createdAt: Date.now(),
          type: 'shift_assigned',
        }),
      ),
    );
  }

  async function handleSubmit() {
    if (!user || !patient) return;
    setError(null);
    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (scheduleType === 'recurrente') {
      if (days.length === 0) {
        setError('Elige al menos un día de la semana.');
        return;
      }
      if (!timePattern.test(startHour) || !timePattern.test(endHour)) {
        setError('Ingresa horas válidas en formato HH:MM.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const base = {
        patientId: patient.id,
        patientName: patient.name,
        patientComuna: patient.comuna,
        familyUids: [user.uid],
        createdBy: user.uid,
        scheduleType,
        observations: observations.trim() || null,
        offeredAmount: amountNumber,
        rateUnit,
        status: 'abierta' as const,
        createdAt: Date.now(),
      };
      if (scheduleType === 'puntual') {
        const start = startOptions[startIndex];
        const startTime = start.offsetMs === null ? nextDayAt9() : Date.now() + start.offsetMs;
        await addDoc(collection(db, 'shiftOffers'), {
          ...base,
          startTime,
          durationHours: durationOptions[durationIndex].hours,
        });
      } else {
        await addDoc(collection(db, 'shiftOffers'), {
          ...base,
          daysOfWeek: days,
          startHour,
          endHour,
        });
      }
      await notifyMatchingCaregivers(
        patient.comuna,
        `Nueva oferta para ${patient.name} en ${patient.comuna} · ${formatClp(caregiverNetAmount(amountNumber))} ${RATE_UNIT_LABEL[rateUnit]}.`,
      );
      router.replace('/(family)/offers');
    } catch (submitError) {
      reportError('No se pudo publicar la oferta', submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Publicar oferta" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  const amountNumber = Number(amount) || 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Publicar oferta" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Oferta de turno abierta</Text>
        <Text style={styles.subtitle}>para {patient.name} · visible para cuidadores de {patient.comuna}</Text>

        <Text style={styles.sectionLabel}>1. Tipo de turno</Text>
        <View style={styles.pillRow}>
          <Pressable style={[styles.pill, scheduleType === 'puntual' && styles.pillActive]} onPress={() => setScheduleType('puntual')}>
            <Text style={[styles.pillText, scheduleType === 'puntual' && styles.pillTextActive]}>Turno puntual</Text>
          </Pressable>
          <Pressable style={[styles.pill, scheduleType === 'recurrente' && styles.pillActive]} onPress={() => setScheduleType('recurrente')}>
            <Text style={[styles.pillText, scheduleType === 'recurrente' && styles.pillTextActive]}>Turno estable</Text>
          </Pressable>
        </View>

        {scheduleType === 'puntual' ? (
          <>
            <Text style={styles.sectionLabel}>2. Duración</Text>
            <View style={styles.pillRow}>
              {durationOptions.map((option, index) => (
                <Pressable key={option.label} style={[styles.pill, durationIndex === index && styles.pillActive]} onPress={() => setDurationIndex(index)}>
                  <Text style={[styles.pillText, durationIndex === index && styles.pillTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>3. Cuándo comienza</Text>
            <View style={styles.pillRow}>
              {startOptions.map((option, index) => (
                <Pressable key={option.label} style={[styles.pill, startIndex === index && styles.pillActive]} onPress={() => setStartIndex(index)}>
                  <Text style={[styles.pillText, startIndex === index && styles.pillTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>2. Días de la semana</Text>
            <View style={styles.pillRow}>
              {DAYS_OF_WEEK.map((d) => (
                <Pressable key={d.value} style={[styles.pill, days.includes(d.value) && styles.pillActive]} onPress={() => toggleDay(d.value)}>
                  <Text style={[styles.pillText, days.includes(d.value) && styles.pillTextActive]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>3. Horario</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Desde</Text>
                <TextInput style={styles.input} placeholder="08:00" placeholderTextColor={colors.muted} value={startHour} onChangeText={setStartHour} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hasta</Text>
                <TextInput style={styles.input} placeholder="17:00" placeholderTextColor={colors.muted} value={endHour} onChangeText={setEndHour} />
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>{scheduleType === 'puntual' ? '4' : '4'}. Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          multiline
          placeholder="Ej. debe traer su propia comida, el paciente usa silla de ruedas, etc."
          placeholderTextColor={colors.muted}
          value={observations}
          onChangeText={setObservations}
        />

        <Text style={styles.sectionLabel}>5. ¿Cuánto vas a pagar?</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="$ monto"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Pressable style={styles.unitSelect} onPress={() => setRateUnitModal(true)}>
            <Text style={styles.unitSelectText}>{RATE_UNIT_LABEL[rateUnit]}</Text>
            <FontAwesome name="chevron-down" size={12} color={colors.muted} />
          </Pressable>
        </View>

        {amountNumber > 0 && (
          <View style={styles.feeCard}>
            <Text style={styles.feeRow}>
              Ofreces <Text style={styles.feeAmount}>{formatClp(amountNumber)}</Text> {RATE_UNIT_LABEL[rateUnit]}
            </Text>
            <Text style={styles.feeRow}>
              Comisión Cuidary ({Math.round(CUIDARY_FEE_RATE * 100)}%): {formatClp(amountNumber - caregiverNetAmount(amountNumber))}
            </Text>
            <Text style={styles.feeNet}>El cuidador recibe {formatClp(caregiverNetAmount(amountNumber))}</Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitButtonText}>Publicar oferta</Text>}
        </Pressable>
      </ScrollView>

      <SelectModal
        visible={rateUnitModal}
        title="¿Cómo pagas?"
        options={rateUnitOptions}
        selectedCode={rateUnit}
        onClose={() => setRateUnitModal(false)}
        onSelect={(option) => setRateUnit(option.code as OfferRateUnit)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 130 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 10, marginTop: 14 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  row: { flexDirection: 'row', gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  unitSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  unitSelectText: { color: colors.ink, fontWeight: '600' },
  feeCard: { backgroundColor: colors.mintSoft, borderRadius: 16, padding: 16, marginTop: 14, gap: 4 },
  feeRow: { color: colors.ink, fontSize: 13 },
  feeAmount: { fontWeight: '800' },
  feeNet: { color: colors.mint, fontWeight: '800', fontSize: 15, marginTop: 4 },
  error: { color: colors.primaryDark, marginTop: 12 },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  submitButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
