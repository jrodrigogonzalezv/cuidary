import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { PrescribedMedication } from '@/types/models';
import { colors } from '@/theme/colors';

export function MedicationPlanManager({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const [meds, setMeds] = useState<PrescribedMedication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'patients', patientId, 'medications'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => setMeds(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PrescribedMedication)),
      () => setMeds([]),
    );
  }, [patientId]);

  async function handleAdd() {
    if (!user || !name.trim() || !dose.trim() || !frequency.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'patients', patientId, 'medications'), {
        name: name.trim(),
        dose: dose.trim(),
        frequency: frequency.trim(),
        active: true,
        createdAt: Date.now(),
        createdBy: user.uid,
      });
      setName('');
      setDose('');
      setFrequency('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(medId: string) {
    await deleteDoc(doc(db, 'patients', patientId, 'medications', medId));
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Medicamentos recetados</Text>
        <Pressable style={styles.addButton} onPress={() => setShowForm((v) => !v)}>
          <FontAwesome name={showForm ? 'close' : 'plus'} size={13} color={colors.white} />
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nombre del medicamento" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Dosis (ej. 50 mg)" placeholderTextColor={colors.muted} value={dose} onChangeText={setDose} />
          <TextInput style={styles.input} placeholder="Frecuencia (ej. cada 8 horas)" placeholderTextColor={colors.muted} value={frequency} onChangeText={setFrequency} />
          <Pressable style={styles.submitButton} onPress={handleAdd} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitButtonText}>Agregar a la ficha</Text>}
          </Pressable>
        </View>
      )}

      {meds.length === 0 ? (
        <Text style={styles.empty}>Aún no has registrado medicamentos para este paciente.</Text>
      ) : (
        meds.map((med) => (
          <View key={med.id} style={styles.medRow}>
            <View style={styles.medDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>
                {med.name} · {med.dose}
              </Text>
              <Text style={styles.medMeta}>{med.frequency}</Text>
            </View>
            <Pressable onPress={() => handleRemove(med.id)} hitSlop={8}>
              <FontAwesome name="trash-o" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: 10, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
  submitButton: { backgroundColor: colors.lavender, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitButtonText: { color: colors.white, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  medDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lavender },
  medName: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  medMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
