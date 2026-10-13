import { useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { doc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import type { Address, BankAccount } from '@/types/models';
import { AddressPicker } from '@/components/AddressPicker';
import { FieldError } from '@/components/FieldError';
import { PhoneInput } from '@/components/PhoneInput';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectModal } from '@/components/SelectModal';
import { WorkZonesPicker } from '@/components/WorkZonesPicker';
import { BANK_ACCOUNT_TYPES, CHILE_BANKS } from '@/data/chileBanks';
import { isInRange, isValidChileanPhone, isValidName, isValidRut } from '@/lib/validators';
import { colors } from '@/theme/colors';

interface FormErrors {
  name?: string;
  phone?: string;
  yearsExperience?: string;
  bankAccountNumber?: string;
  bankRut?: string;
}

export default function EditCaregiverProfile() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl);
  const [address, setAddress] = useState<Partial<Address>>(profile?.address ?? {});
  const [title, setTitle] = useState(profile?.title ?? '');
  const [yearsExperience, setYearsExperience] = useState(String(profile?.yearsExperience ?? ''));
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [bank, setBank] = useState<Partial<BankAccount>>(profile?.bankAccount ?? {});
  const [workComunas, setWorkComunas] = useState<string[]>(profile?.workComunas ?? []);
  const [bankModal, setBankModal] = useState(false);
  const [accountTypeModal, setAccountTypeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  async function handleSave() {
    if (!user) return;
    const errors: FormErrors = {};
    if (!isValidName(name)) errors.name = 'Ingresa tu nombre completo.';
    if (!isValidChileanPhone(phone)) errors.phone = 'Ingresa un teléfono chileno válido.';
    if (yearsExperience && !isInRange(yearsExperience, 0, 70)) {
      errors.yearsExperience = 'Ingresa un número de años válido (0 a 70).';
    }
    const bankStarted = Boolean(bank.bankName || bank.accountType || bank.accountNumber || bank.rut);
    if (bankStarted) {
      if (!bank.accountNumber || !/^\d{4,20}$/.test(bank.accountNumber)) {
        errors.bankAccountNumber = 'Ingresa un número de cuenta válido.';
      }
      if (!bank.rut || !isValidRut(bank.rut)) {
        errors.bankRut = 'Ingresa un RUT válido (ej. 12.345.678-9).';
      }
    }
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
        title: title.trim(),
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        bio: bio.trim(),
        bankAccount: bank.bankName && bank.accountNumber ? bank : null,
        workComunas,
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

        <Section title="Datos personales">
          <Field label="Nombre completo" value={name} onChangeText={setName} error={fieldErrors.name} />
          <View>
            <Text style={styles.label}>Teléfono</Text>
            <PhoneInput style={[styles.input, fieldErrors.phone && styles.inputError]} value={phone} onChangeText={setPhone} />
            <FieldError message={fieldErrors.phone} />
          </View>
        </Section>

        <Section title="Dirección">
          <AddressPicker value={address} onChange={setAddress} />
        </Section>

        <Section title="Perfil profesional">
          <Field label="Título / especialidad" value={title} onChangeText={setTitle} placeholder="Técnico en Enfermería de Nivel Superior" />
          <Field
            label="Años de experiencia"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            keyboardType="numeric"
            error={fieldErrors.yearsExperience}
          />
          <View>
            <Text style={styles.label}>Sobre mí</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              placeholder="Cuéntale a las familias sobre tu experiencia cuidando adultos mayores..."
              placeholderTextColor={colors.muted}
              value={bio}
              onChangeText={setBio}
            />
          </View>
        </Section>

        <Section title="Zonas de trabajo">
          <Text style={styles.zonesHint}>Elige las comunas donde te interesa recibir ofertas de turno.</Text>
          <WorkZonesPicker value={workComunas} onChange={setWorkComunas} />
        </Section>

        <Section title="Cuenta para pagos">
          <View>
            <Text style={styles.label}>Banco</Text>
            <Pressable style={styles.selectRow} onPress={() => setBankModal(true)}>
              <Text style={[styles.selectText, !bank.bankName && styles.placeholder]}>{bank.bankName ?? 'Selecciona tu banco'}</Text>
              <FontAwesome name="chevron-down" size={13} color={colors.muted} />
            </Pressable>
          </View>
          <View>
            <Text style={styles.label}>Tipo de cuenta</Text>
            <Pressable style={styles.selectRow} onPress={() => setAccountTypeModal(true)}>
              <Text style={[styles.selectText, !bank.accountType && styles.placeholder]}>
                {BANK_ACCOUNT_TYPES.find((t) => t.code === bank.accountType)?.name ?? 'Selecciona el tipo'}
              </Text>
              <FontAwesome name="chevron-down" size={13} color={colors.muted} />
            </Pressable>
          </View>
          <Field
            label="Número de cuenta"
            value={bank.accountNumber ?? ''}
            onChangeText={(accountNumber) => setBank({ ...bank, accountNumber })}
            keyboardType="numeric"
            error={fieldErrors.bankAccountNumber}
          />
          <Field
            label="RUT titular"
            value={bank.rut ?? ''}
            onChangeText={(rut) => setBank({ ...bank, rut })}
            placeholder="12.345.678-9"
            error={fieldErrors.bankRut}
          />
        </Section>

        <Pressable style={styles.button} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>

      <SelectModal
        visible={bankModal}
        title="Elige tu banco"
        options={CHILE_BANKS}
        selectedCode={bank.bankName}
        onClose={() => setBankModal(false)}
        onSelect={(option) => setBank({ ...bank, bankName: option.name })}
      />
      <SelectModal
        visible={accountTypeModal}
        title="Tipo de cuenta"
        options={BANK_ACCOUNT_TYPES}
        selectedCode={bank.accountType}
        onClose={() => setAccountTypeModal(false)}
        onSelect={(option) => setBank({ ...bank, accountType: option.code as BankAccount['accountType'] })}
      />
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  error?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.error && styles.inputError]}
        placeholder={props.placeholder}
        placeholderTextColor={colors.muted}
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
      />
      <FieldError message={props.error} />
    </View>
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
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  zonesHint: { color: colors.muted, fontSize: 12.5, marginTop: -6, marginBottom: 4 },
  inputError: { borderColor: colors.primary },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.bgSoft,
  },
  selectText: { fontSize: 15, color: colors.ink },
  placeholder: { color: colors.muted },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
