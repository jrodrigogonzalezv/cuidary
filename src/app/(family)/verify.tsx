import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRatingDisplay } from '@/components/StarRating';
import { colors } from '@/theme/colors';

function extractUid(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^cuidary:verify:(.+)$/);
  return match ? match[1] : trimmed;
}

export default function VerifyCaregiverScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UserProfile | 'not_found' | null>(null);

  async function handleVerify() {
    const uid = extractUid(code);
    if (!uid) return;
    setLoading(true);
    setResult(null);
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (snapshot.exists() && (snapshot.data() as UserProfile).role === 'cuidador') {
        setResult(snapshot.data() as UserProfile);
      } else {
        setResult('not_found');
      }
    } catch {
      setResult('not_found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Verificar" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Verificar un cuidador</Text>
        <Text style={styles.subtitle}>
          Pide a tu cuidador/a que te muestre su credencial Cuidary y escribe el código que aparece bajo el QR.
        </Text>

        <View style={styles.inputRow}>
          <FontAwesome name="qrcode" size={18} color={colors.muted} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="Código o ID del cuidador"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
          />
        </View>

        <Pressable style={styles.button} onPress={handleVerify} disabled={!code.trim() || loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verificar</Text>}
        </Pressable>

        {result === 'not_found' && (
          <View style={styles.notFound}>
            <FontAwesome name="exclamation-triangle" size={18} color={colors.primaryDark} />
            <Text style={styles.notFoundText}>No encontramos un cuidador verificado con ese código.</Text>
          </View>
        )}

        {result && result !== 'not_found' && (
          <LinearGradient colors={[colors.mint, colors.accent]} style={styles.resultCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.verifiedBadge}>
              <FontAwesome name="check-circle" size={14} color={colors.white} />
              <Text style={styles.verifiedText}>Verificado en Cuidary</Text>
            </View>
            <View style={styles.resultTop}>
              <Avatar name={result.name} size={64} photoUrl={result.photoUrl} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={styles.resultTitle}>{result.title || 'Cuidador/a profesional'}</Text>
                <StarRatingDisplay value={result.ratingAvg ?? 0} count={result.ratingCount ?? 0} size={13} />
              </View>
            </View>
            <View style={styles.resultStats}>
              <Text style={styles.resultStat}>{result.shiftsCompleted ?? 0} turnos completados</Text>
              <Text style={styles.resultStat}>{result.yearsExperience ?? 0} años de experiencia</Text>
            </View>
          </LinearGradient>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 20, lineHeight: 19 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.ink },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  notFound: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: colors.primarySoft,
    padding: 16,
    borderRadius: 14,
  },
  notFoundText: { color: colors.primaryDark, flex: 1, fontWeight: '600' },
  resultCard: { marginTop: 20, borderRadius: 22, padding: 18 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },
  verifiedText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  resultTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  resultName: { color: colors.white, fontSize: 17, fontWeight: '800' },
  resultTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  resultStat: { color: colors.white, fontSize: 12, fontWeight: '600' },
});
