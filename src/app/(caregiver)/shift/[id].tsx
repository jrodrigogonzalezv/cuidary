import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { GpsCheckin, NotificationType, Patient, PrescribedMedication, Shift } from '@/types/models';
import { VitalSignsList } from '@/components/VitalSignsList';
import { MedicationList } from '@/components/MedicationList';
import { GpsCheckinList } from '@/components/GpsCheckinList';
import { GpsMapPreview } from '@/components/GpsMapPreview';
import { ShiftNotesList } from '@/components/ShiftNotesList';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Toast, useToastQueue } from '@/components/Toast';
import { waitForLocationConfirm } from '@/lib/locationConfirmBridge';
import { pickImage } from '@/lib/imagePicker';
import { isInRange } from '@/lib/validators';
import { reportError } from '@/lib/errors';
import { colors } from '@/theme/colors';

async function notifyFamily(shift: Shift, title: string, body: string, type: NotificationType) {
  await Promise.all(
    shift.familyUids.map((uid) =>
      addDoc(collection(db, 'notifications'), {
        uid,
        title,
        body,
        read: false,
        createdAt: Date.now(),
        type,
        targetType: 'shift',
        targetId: shift.id,
      }),
    ),
  );
}

export default function ShiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [shift, setShift] = useState<Shift | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lastCheckin, setLastCheckin] = useState<GpsCheckin | null>(null);
  const [medicationPlan, setMedicationPlan] = useState<PrescribedMedication[]>([]);
  const [administeringMedId, setAdministeringMedId] = useState<string | null>(null);
  const [administerNote, setAdministerNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, showToast, dismiss } = useToastQueue();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [spo2, setSpo2] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');

  const [note, setNote] = useState('');
  const [notePhoto, setNotePhoto] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, 'shifts', id),
      (snapshot) => {
        setShift(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Shift) : null);
      },
      () => setShift(null),
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'shifts', id, 'gpsCheckins'), orderBy('timestamp', 'desc'), limit(1));
    return onSnapshot(
      q,
      (snapshot) => {
        const docSnap = snapshot.docs[0];
        setLastCheckin(docSnap ? ({ id: docSnap.id, ...docSnap.data() } as GpsCheckin) : null);
      },
      () => setLastCheckin(null),
    );
  }, [id]);

  useEffect(() => {
    if (!shift || shift.status !== 'activo') return;
    return onSnapshot(
      doc(db, 'patients', shift.patientId),
      (snapshot) => setPatient(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Patient) : null),
      () => setPatient(null),
    );
  }, [shift]);

  useEffect(() => {
    if (!shift) return;
    const q = query(collection(db, 'patients', shift.patientId, 'medications'), where('active', '==', true));
    return onSnapshot(
      q,
      (snapshot) => setMedicationPlan(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PrescribedMedication)),
      () => setMedicationPlan([]),
    );
  }, [shift]);

  if (!shift || !user) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Turno" showBack />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  const activeShift: Shift = shift;
  const currentUser = user;

  async function handleStartShift() {
    router.push({ pathname: '/gps-checkin-confirm', params: { mode: 'start' } });
    const result = await waitForLocationConfirm();
    if (!result) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'shifts', activeShift.id, 'gpsCheckins'), {
        lat: result.latitude,
        lng: result.longitude,
        accuracy: result.accuracy,
        address: result.address,
        timestamp: Date.now(),
      });
      await updateDoc(doc(db, 'shifts', activeShift.id), { status: 'activo' });
      await updateDoc(doc(db, 'patients', activeShift.patientId), { activeShiftId: activeShift.id });
      await notifyFamily(
        activeShift,
        'Turno iniciado',
        `${currentUser.displayName ?? 'El cuidador'} comenzó el turno con ${activeShift.patientName}.`,
        'shift_started',
      );
      showToast('Turno iniciado y check-in GPS registrado');
    } catch (error) {
      reportError('No se pudo iniciar el turno', error);
    } finally {
      setBusy(false);
    }
  }

  async function handleGpsCheckin() {
    router.push({ pathname: '/gps-checkin-confirm', params: { mode: 'checkin' } });
    const result = await waitForLocationConfirm();
    if (!result) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'shifts', activeShift.id, 'gpsCheckins'), {
        lat: result.latitude,
        lng: result.longitude,
        accuracy: result.accuracy,
        address: result.address,
        timestamp: Date.now(),
      });
      showToast('Check-in GPS registrado');
    } catch (error) {
      reportError('No se pudo registrar el check-in', error);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddVital() {
    if (!systolic || !diastolic || !spo2 || !heartRate || !temperature) {
      Alert.alert('Completa todos los campos de signos vitales.');
      return;
    }
    if (!isInRange(systolic, 60, 250) || !isInRange(diastolic, 40, 150)) {
      Alert.alert('Presión arterial fuera de rango', 'Revisa los valores de presión sistólica y diastólica.');
      return;
    }
    if (!isInRange(spo2, 50, 100)) {
      Alert.alert('Saturación de oxígeno inválida', 'El valor de O₂ debe estar entre 50 y 100%.');
      return;
    }
    if (!isInRange(heartRate, 30, 220)) {
      Alert.alert('Frecuencia cardíaca inválida', 'Ingresa un valor entre 30 y 220 lpm.');
      return;
    }
    if (!isInRange(temperature, 30, 43)) {
      Alert.alert('Temperatura inválida', 'Ingresa un valor entre 30 y 43 °C.');
      return;
    }
    setBusy(true);
    try {
      await addDoc(collection(db, 'shifts', activeShift.id, 'vitalSigns'), {
        bloodPressureSystolic: Number(systolic),
        bloodPressureDiastolic: Number(diastolic),
        oxygenSaturation: Number(spo2),
        heartRate: Number(heartRate),
        temperature: Number(temperature),
        recordedAt: Date.now(),
        recordedBy: currentUser.uid,
      });
      setSystolic('');
      setDiastolic('');
      setSpo2('');
      setHeartRate('');
      setTemperature('');
      showToast('Signos vitales registrados');
    } catch (error) {
      reportError('No se pudieron registrar los signos vitales', error);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdministerMedication(med: PrescribedMedication, observation: string) {
    setBusy(true);
    try {
      await addDoc(collection(db, 'shifts', activeShift.id, 'medications'), {
        medicationId: med.id,
        name: med.name,
        dose: med.dose,
        observation: observation.trim() || null,
        // eslint-disable-next-line react-hooks/purity -- Date.now() here runs inside an onPress handler, not during render.
        administeredAt: Date.now(),
        administeredBy: currentUser.uid,
      });
      setAdministeringMedId(null);
      setAdministerNote('');
      showToast(`${med.name} marcado como administrado`);
    } catch (error) {
      reportError('No se pudo registrar el medicamento', error);
    } finally {
      setBusy(false);
    }
  }

  async function handlePickNotePhoto() {
    setPickingPhoto(true);
    try {
      const uri = await pickImage();
      if (uri) setNotePhoto(uri);
    } finally {
      setPickingPhoto(false);
    }
  }

  async function handleAddNote() {
    if (!note.trim() && !notePhoto) return;
    setBusy(true);
    try {
      await addDoc(collection(db, 'shifts', activeShift.id, 'bitacoraEntries'), {
        patientId: activeShift.patientId,
        note: note.trim(),
        photoUrl: notePhoto ?? null,
        createdAt: Date.now(),
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName ?? 'Cuidador/a',
      });
      setNote('');
      setNotePhoto(null);
      showToast('Nota agregada a la bitácora');
    } catch (error) {
      reportError('No se pudo agregar la nota', error);
    } finally {
      setBusy(false);
    }
  }

  async function handleEndShift() {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'shifts', activeShift.id), { status: 'completado', endTime: Date.now() });
      await updateDoc(doc(db, 'patients', activeShift.patientId), { activeShiftId: null });
      await updateDoc(doc(db, 'users', currentUser.uid), { shiftsCompleted: increment(1) });
      await notifyFamily(
        activeShift,
        'Turno finalizado',
        `El turno con ${activeShift.patientName} ha finalizado.`,
        'shift_completed',
      );
      showToast('Turno finalizado');
    } catch (error) {
      reportError('No se pudo finalizar el turno', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Turno" showBack />
      <Toast toast={toast} onDone={dismiss} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar name={shift.patientName} size={52} photoUrl={patient?.photoUrl ?? shift.patientPhotoUrl} />
          <View>
            <Text style={styles.name}>{shift.patientName}</Text>
            <Text style={styles.meta}>
              {new Date(shift.startTime).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
        </View>

        {shift.status === 'programado' && (
          <Pressable style={styles.primaryButton} onPress={handleStartShift} disabled={busy}>
            <Text style={styles.primaryButtonText}>Iniciar turno (check-in GPS)</Text>
          </Pressable>
        )}

        {shift.status === 'activo' && (
          <>
            {lastCheckin && (
              <View style={styles.statusCard}>
                <View style={styles.statusBadge}>
                  <FontAwesome name="check-circle" size={12} color={colors.success} />
                  <Text style={styles.statusBadgeText}>En el lugar, ejecutando el turno</Text>
                </View>
                <GpsMapPreview lat={lastCheckin.lat} lng={lastCheckin.lng} height={140} />
                <Text style={styles.statusAddress}>{lastCheckin.address ?? 'Dirección no disponible'}</Text>
                <Text style={styles.statusMeta}>
                  Lat {lastCheckin.lat.toFixed(5)} · Lng {lastCheckin.lng.toFixed(5)} ·{' '}
                  {new Date(lastCheckin.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
                </Text>
              </View>
            )}

            <Pressable style={styles.secondaryButton} onPress={handleGpsCheckin} disabled={busy}>
              <Text style={styles.secondaryButtonText}>{lastCheckin ? 'Marcar nuevo check-in GPS' : 'Marcar check-in GPS'}</Text>
            </Pressable>

            {patient && (patient.anamnesis || (patient.emergencyContacts?.length ?? 0) > 0) && (
              <View style={styles.infoCard}>
                {patient.anamnesis && (
                  <View style={{ marginBottom: patient.emergencyContacts?.length ? 14 : 0 }}>
                    <Text style={styles.infoTitle}>Historia clínica</Text>
                    <Text style={styles.infoText}>{patient.anamnesis}</Text>
                  </View>
                )}
                {(patient.emergencyContacts?.length ?? 0) > 0 && (
                  <View>
                    <Text style={styles.infoTitle}>Contactos de emergencia</Text>
                    {patient.emergencyContacts!.map((contact, index) => (
                      <View key={`${contact.name}-${index}`} style={styles.contactRow}>
                        <FontAwesome name="phone" size={13} color={colors.primary} />
                        <Text style={styles.contactText}>
                          {contact.name} ({contact.relationship}) · {contact.phone}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Section title="Signos Vitales" tint={colors.accentSoft} accent={colors.accent}>
              <View style={styles.row}>
                <TextInput style={styles.inputSmall} placeholder="Sist." placeholderTextColor={colors.muted} keyboardType="numeric" value={systolic} onChangeText={setSystolic} />
                <TextInput style={styles.inputSmall} placeholder="Diast." placeholderTextColor={colors.muted} keyboardType="numeric" value={diastolic} onChangeText={setDiastolic} />
                <TextInput style={styles.inputSmall} placeholder="O₂ %" placeholderTextColor={colors.muted} keyboardType="numeric" value={spo2} onChangeText={setSpo2} />
              </View>
              <View style={styles.row}>
                <TextInput style={styles.inputSmall} placeholder="FC lpm" placeholderTextColor={colors.muted} keyboardType="numeric" value={heartRate} onChangeText={setHeartRate} />
                <TextInput style={styles.inputSmall} placeholder="Temp °C" placeholderTextColor={colors.muted} keyboardType="numeric" value={temperature} onChangeText={setTemperature} />
              </View>
              <Pressable style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={handleAddVital} disabled={busy}>
                <Text style={styles.addButtonText}>Registrar signos vitales</Text>
              </Pressable>
              <VitalSignsList shiftId={activeShift.id} />
            </Section>

            <Section title="Control de Fármacos" tint={colors.lavenderSoft} accent={colors.lavender}>
              {medicationPlan.length === 0 ? (
                <Text style={styles.planEmpty}>La familia no ha registrado medicamentos en la ficha de {activeShift.patientName}.</Text>
              ) : (
                medicationPlan.map((med) =>
                  administeringMedId === med.id ? (
                    <View key={med.id} style={styles.planRowExpanded}>
                      <Text style={styles.planName}>
                        {med.name} · {med.dose}
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Observación (opcional, ej. no quiso tomarlo completo)"
                        placeholderTextColor={colors.muted}
                        value={administerNote}
                        onChangeText={setAdministerNote}
                      />
                      <View style={styles.row}>
                        <Pressable
                          style={[styles.planButton, { backgroundColor: colors.muted, flex: 1 }]}
                          onPress={() => {
                            setAdministeringMedId(null);
                            setAdministerNote('');
                          }}
                        >
                          <Text style={styles.planButtonText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.planButton, { backgroundColor: colors.lavender, flex: 1 }]}
                          onPress={() => handleAdministerMedication(med, administerNote)}
                          disabled={busy}
                        >
                          <Text style={styles.planButtonText}>Confirmar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View key={med.id} style={styles.planRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>
                          {med.name} · {med.dose}
                        </Text>
                        <Text style={styles.planMeta}>{med.frequency}</Text>
                      </View>
                      <Pressable
                        style={[styles.planButton, { backgroundColor: colors.lavender }]}
                        onPress={() => setAdministeringMedId(med.id)}
                        disabled={busy}
                      >
                        <Text style={styles.planButtonText}>Administrar</Text>
                      </Pressable>
                    </View>
                  ),
                )
              )}
              <View style={{ marginTop: medicationPlan.length ? 14 : 0 }}>
                <MedicationList shiftId={activeShift.id} />
              </View>
            </Section>

            <Section title="GPS del turno" tint={colors.accentSoft} accent={colors.accent}>
              <GpsCheckinList shiftId={activeShift.id} />
            </Section>

            <Section title="Notas del turno" tint={colors.mintSoft} accent={colors.mint}>
              {notePhoto && (
                <View style={styles.notePhotoPreviewWrap}>
                  <Image source={{ uri: notePhoto }} style={styles.notePhotoPreview} />
                  <Pressable style={styles.notePhotoRemove} onPress={() => setNotePhoto(null)}>
                    <FontAwesome name="close" size={12} color={colors.white} />
                  </Pressable>
                </View>
              )}
              <View style={styles.noteInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Nota (ej. almorzó completo)"
                  placeholderTextColor={colors.muted}
                  value={note}
                  onChangeText={setNote}
                />
                <Pressable style={styles.notePhotoButton} onPress={handlePickNotePhoto} disabled={pickingPhoto}>
                  {pickingPhoto ? <ActivityIndicator size="small" color={colors.mint} /> : <FontAwesome name="camera" size={16} color={colors.mint} />}
                </Pressable>
              </View>
              <Pressable style={[styles.addButton, { backgroundColor: colors.mint, marginTop: 10 }]} onPress={handleAddNote} disabled={busy}>
                <Text style={styles.addButtonText}>Agregar nota a la bitácora</Text>
              </Pressable>
              <ShiftNotesList shiftId={activeShift.id} />
            </Section>

            <Pressable style={styles.endButton} onPress={handleEndShift} disabled={busy}>
              <Text style={styles.endButtonText}>Finalizar turno</Text>
            </Pressable>
          </>
        )}

        {shift.status === 'completado' && <Text style={styles.empty}>Este turno ya fue completado.</Text>}
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  tint,
  accent,
  children,
}: {
  title: string;
  tint: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: tint }]}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 130 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 2 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
  statusCard: { backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 10, marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  statusAddress: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  statusMeta: { color: colors.muted, fontSize: 12 },
  infoCard: { backgroundColor: colors.white, borderRadius: 20, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  contactText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  section: { borderRadius: 22, padding: 18, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.ink,
    marginBottom: 8,
  },
  inputSmall: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  addButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: colors.white, fontWeight: '700' },
  planEmpty: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  planRowExpanded: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  planName: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  planMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  planButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  planButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  noteInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  notePhotoButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notePhotoPreviewWrap: { marginBottom: 8, alignSelf: 'flex-start' },
  notePhotoPreview: { width: 90, height: 90, borderRadius: 12 },
  notePhotoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endButton: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  endButtonText: { color: colors.primaryDark, fontWeight: '700' },
});
