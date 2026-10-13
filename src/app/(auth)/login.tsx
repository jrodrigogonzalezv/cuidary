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
import { AuthBackground } from '@/components/AuthBackground';
import { FieldError } from '@/components/FieldError';
import { Logo } from '@/components/Logo';
import { GoogleButton } from '@/components/GoogleButton';
import { isValidEmail } from '@/lib/validators';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!isValidEmail(email)) {
      const message = 'Ingresa un correo válido.';
      setEmailError(message);
      Alert.alert('Revisa el correo', message);
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      Alert.alert('Falta la contraseña', 'Ingresa tu contraseña.');
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch {
      setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
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
      setError('No pudimos iniciar sesión con Google.');
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
            <Text style={styles.heroSubtitle}>Cuidado con resguardo clínico{'\n'}en tiempo real</Text>

            <Text style={styles.title}>Inicia sesión</Text>
            <Text style={styles.subtitle}>Accede a la bitácora digital de tu familiar o a tus turnos.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Correo</Text>
              <View style={[styles.inputRow, emailError && styles.inputRowError]}>
                <FontAwesome name="envelope-o" size={16} color={colors.muted} style={styles.inputIcon} />
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
              <FieldError message={emailError} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputRow}>
                <FontAwesome name="lock" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Entrar</Text>}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={handleGoogle} loading={googleLoading} />

            <Link href="/(auth)/register" style={styles.link}>
              ¿No tienes cuenta? Regístrate
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
  logoWrap: { alignItems: 'center', marginBottom: 14 },
  heroSubtitle: { color: colors.muted, textAlign: 'center', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 22 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 16 },
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
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  error: { color: colors.primaryDark, marginBottom: 12 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
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
