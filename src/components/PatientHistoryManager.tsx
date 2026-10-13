import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { doc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { EmergencyContact, Patient } from '@/types/models';
import { FieldError } from '@/components/FieldError';
import { PhoneInput } from '@/components/PhoneInput';
import { isValidChileanPhone, isValidName } from '@/lib/validators';
import { colors } from '@/theme/colors';

export function PatientHistoryManager({ patient }: { patient: Patient }) {
  const [anamnesis, setAnamnesis] = useState(patient.anamnesis ?? '');
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function saveAnamnesis() {
    setSavingAnamnesis(true);
    try {
      await updateDoc(doc(db, 'patients', patient.id), { anamnesis: anamnesis.trim() || null });
      setDirty(false);
    } finally {
      setSavingAnamnesis(false);
    }
  }

  return (
    <View>
      <Text style={styles.title}>Historia clínica</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        multiline
        placeholder="Antecedentes médicos, alergias, diagnósticos, nivel de movilidad, etc."
        placeholderTextColor={colors.muted}
        value={anamnesis}
        onChangeText={(text) => {
          setAnamnesis(text);
          setDirty(true);
        }}
      />
      {dirty && (
        <Pressable style={styles.saveButton} onPress={saveAnamnesis} disabled={savingAnamnesis}>
          {savingAnamnesis ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Guardar historia</Text>}
        </Pressable>
      )}

      <Text style={[styles.title, { marginTop: 22 }]}>Contactos de emergencia</Text>
      <EmergencyContactsEditor patient={patient} />
    </View>
  );
}

function EmergencyContactsEditor({ patient }: { patient: Patient }) {
  const contacts = patient.emergencyContacts ?? [];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; relationship?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function persist(next: EmergencyContact[]) {
    await updateDoc(doc(db, 'patients', patient.id), { emergencyContacts: next });
  }

  async function handleAdd() {
    const nextErrors: typeof errors = {};
    if (!isValidName(name)) nextErrors.name = 'Ingresa el nombre.';
    if (!relationship.trim()) nextErrors.relationship = 'Ingresa el parentesco.';
    if (!isValidChileanPhone(phone)) nextErrors.phone = 'Ingresa un teléfono válido.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      Alert.alert('Revisa estos campos', Object.values(nextErrors).join('\n'));
      return;
    }
    setSubmitting(true);
    try {
      await persist([...contacts, { name: name.trim(), relationship: relationship.trim(), phone }]);
      setName('');
      setRelationship('');
      setPhone('');
      setErrors({});
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(index: number) {
    await persist(contacts.filter((_, i) => i !== index));
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.hint}>Para que el cuidador sepa a quién llamar en una emergencia.</Text>
        <Pressable style={styles.addButton} onPress={() => setShowForm((v) => !v)}>
          <FontAwesome name={showForm ? 'close' : 'plus'} size={13} color={colors.white} />
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
          <FieldError message={errors.name} />
          <TextInput
            style={styles.input}
            placeholder="Parentesco (ej. hija, hijo, vecina)"
            placeholderTextColor={colors.muted}
            value={relationship}
            onChangeText={setRelationship}
          />
          <FieldError message={errors.relationship} />
          <PhoneInput style={styles.input} value={phone} onChangeText={setPhone} />
          <FieldError message={errors.phone} />
          <Pressable style={styles.saveButton} onPress={handleAdd} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Agregar contacto</Text>}
          </Pressable>
        </View>
      )}

      {contacts.length === 0 ? (
        <Text style={styles.empty}>Sin contactos de emergencia registrados.</Text>
      ) : (
        contacts.map((contact, index) => (
          <View key={`${contact.name}-${index}`} style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>
                {contact.name} · {contact.relationship}
              </Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            <Pressable onPress={() => handleRemove(index)} hitSlop={8}>
              <FontAwesome name="trash-o" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
    marginBottom: 4,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  saveButton: { backgroundColor: colors.mint, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: colors.white, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 },
  hint: { color: colors.muted, fontSize: 12, flex: 1 },
  addButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  form: { gap: 4, marginBottom: 14 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactName: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  contactPhone: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
