import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { PhoneInput } from '@/components/PhoneInput';
import { isValidChileanPhone } from '@/lib/validators';
import { colors } from '@/theme/colors';

export default function CompleteProfileScreen() {
  const { user, completeProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('familia');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!isValidChileanPhone(phone)) {
      const message = 'Ingresa un teléfono chileno válido (ej. +56 9 1234 5678).';
      setError(message);
      Alert.alert('Revisa el teléfono', message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completeProfile({ role, phone: phone.trim() });
      router.replace('/');
    } catch {
      setError('No pudimos guardar tu perfil. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Avatar name={user?.displayName ?? '?'} size={64} />
          <Text style={styles.title}>Un último paso</Text>
          <Text style={styles.subtitle}>Hola {user?.displayName?.split(' ')[0]}, cuéntanos cómo usarás Cuidary.</Text>
        </View>

        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleButton, role === 'familia' && styles.roleButtonActive]}
            onPress={() => setRole('familia')}
          >
            <Text style={[styles.roleButtonText, role === 'familia' && styles.roleButtonTextActive]}>
              Soy familia
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleButton, role === 'cuidador' && styles.roleButtonActive]}
            onPress={() => setRole('cuidador')}
          >
            <Text style={[styles.roleButtonText, role === 'cuidador' && styles.roleButtonTextActive]}>
              Soy cuidador/a
            </Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Teléfono</Text>
          <PhoneInput style={[styles.input, error && styles.inputError]} value={phone} onChangeText={setPhone} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continuar</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 4 },
  header: { alignItems: 'center', gap: 10, marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 6 },
  subtitle: { color: colors.muted, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleButtonText: { color: '#374151', fontWeight: '600' },
  roleButtonTextActive: { color: colors.white },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.bgSoft,
    color: colors.ink,
  },
  inputError: { borderColor: colors.primary },
  error: { color: colors.primaryDark, marginBottom: 12 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
