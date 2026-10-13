import { useState } from 'react';
import { Link, router } from 'expo-router';
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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/models';
import { AuthBackground } from '@/components/AuthBackground';
import { FieldError } from '@/components/FieldError';
import { Logo } from '@/components/Logo';
import { GoogleButton } from '@/components/GoogleButton';
import { PhoneInput } from '@/components/PhoneInput';
import { isValidChileanPhone, isValidEmail, isValidName } from '@/lib/validators';
import { colors } from '@/theme/colors';

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('familia');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!isValidName(name)) errors.name = 'Ingresa tu nombre completo.';
    if (!isValidChileanPhone(phone)) errors.phone = 'Ingresa un teléfono chileno válido (ej. +56 9 1234 5678).';
    if (!isValidEmail(email)) errors.email = 'Ingresa un correo válido.';
    if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert('Revisa estos campos', Object.values(errors).join('\n'));
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp({ email: email.trim(), password, name: name.trim(), phone: phone.trim(), role });
      router.replace('/');
    } catch {
      setError('No pudimos crear tu cuenta. Verifica los datos ingresados.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch {
      setError('No pudimos continuar con Google.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Logo size={50} />
          </View>
          <Text style={styles.title}>Crea tu cuenta</Text>

          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleButton, role === 'familia' && styles.roleButtonActive]}
              onPress={() => setRole('familia')}
            >
              <FontAwesome
                name="heart"
                size={14}
                color={role === 'familia' ? colors.white : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.roleButtonText, role === 'familia' && styles.roleButtonTextActive]}>
                Soy familia
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleButton, role === 'cuidador' && styles.roleButtonActive]}
              onPress={() => setRole('cuidador')}
            >
              <FontAwesome
                name="user-md"
                size={14}
                color={role === 'cuidador' ? colors.white : colors.muted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.roleButtonText, role === 'cuidador' && styles.roleButtonTextActive]}>
                Soy cuidador/a
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={[styles.inputRow, fieldErrors.name && styles.inputRowError]}>
              <FontAwesome name="user-o" size={15} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </View>
            <FieldError message={fieldErrors.name} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={[styles.inputRow, fieldErrors.phone && styles.inputRowError]}>
              <FontAwesome name="phone" size={16} color={colors.muted} style={styles.inputIcon} />
              <PhoneInput style={styles.input} value={phone} onChangeText={setPhone} />
            </View>
            <FieldError message={fieldErrors.phone} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Correo</Text>
            <View style={[styles.inputRow, fieldErrors.email && styles.inputRowError]}>
              <FontAwesome name="envelope-o" size={15} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="tu@correo.cl"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <FieldError message={fieldErrors.email} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputRow, fieldErrors.password && styles.inputRowError]}>
              <FontAwesome name="lock" size={18} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <FieldError message={fieldErrors.password} />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleButton onPress={handleGoogle} loading={googleLoading} />

          <Link href="/(auth)/login" style={styles.link}>
            Ya tengo cuenta, iniciar sesión
          </Link>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 32,
    padding: 28,
    shadowColor: '#4B3F72',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  logoWrap: { alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 20 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleButtonText: { color: '#374151', fontWeight: '600' },
  roleButtonTextActive: { color: colors.white },
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: 14,
  },
  inputRowError: { borderColor: colors.primary },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.ink },
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  link: { marginTop: 22, textAlign: 'center', color: colors.primary, fontWeight: '700' },
});
