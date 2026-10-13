import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { doc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Address } from '@/types/models';
import { AddressPicker } from '@/components/AddressPicker';
import { FieldError } from '@/components/FieldError';
import { PhoneInput } from '@/components/PhoneInput';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { isValidChileanPhone, isValidName } from '@/lib/validators';
import { colors } from '@/theme/colors';

interface FormErrors {
  name?: string;
  phone?: string;
}

export default function EditFamilyProfile() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl);
  const [address, setAddress] = useState<Partial<Address>>(profile?.address ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  async function handleSave() {
    if (!user) return;
    const errors: FormErrors = {};
    if (!isValidName(name)) errors.name = 'Ingresa tu nombre completo.';
    if (!isValidChileanPhone(phone)) errors.phone = 'Ingresa un teléfono chileno válido.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert('Revisa estos campos', Object.values(errors).join('\n'));
      return;
    }
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        phone: phone.trim(),
        photoUrl: photoUrl ?? null,
        address: address.regionCode && address.comunaCode ? address : null,
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Editar perfil" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoPicker name={name || '?'} photoUrl={photoUrl} onChange={setPhotoUrl} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos personales</Text>
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.muted}
              />
              <FieldError message={fieldErrors.name} />
            </View>
            <View>
              <Text style={styles.label}>Teléfono</Text>
              <PhoneInput style={[styles.input, fieldErrors.phone && styles.inputError]} value={phone} onChangeText={setPhone} />
              <FieldError message={fieldErrors.phone} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dirección</Text>
          <AddressPicker value={address} onChange={setAddress} />
        </View>

        <Pressable style={styles.button} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 140, gap: 10 },
  section: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
  inputError: { borderColor: colors.primary },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
