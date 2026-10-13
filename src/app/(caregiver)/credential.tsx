import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { QrCode } from '@/components/QrCode';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRatingDisplay } from '@/components/StarRating';
import { colors } from '@/theme/colors';

export default function CredentialScreen() {
  const { profile } = useAuth();
  if (!profile) return null;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Credencial" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.lavender, colors.primary]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.cardTop}>
            <Avatar name={profile.name} size={72} photoUrl={profile.photoUrl} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.title}>{profile.title || 'Cuidador/a profesional'}</Text>
              <StarRatingDisplay value={profile.ratingAvg ?? 0} count={profile.ratingCount ?? 0} size={14} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <Stat label="Turnos exitosos" value={String(profile.shiftsCompleted ?? 0)} />
            <Stat label="Años de experiencia" value={String(profile.yearsExperience ?? 0)} />
            <Stat label="Con Cuidary desde" value={memberSince} small />
          </View>
          <Text style={styles.uid}>ID {profile.uid.slice(0, 8).toUpperCase()}</Text>
        </LinearGradient>

        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Código de verificación</Text>
          <Text style={styles.qrSubtitle}>Cualquier familia puede escanear o ingresar este código en Cuidary para confirmar que soy parte verificada de la plataforma.</Text>
          <View style={styles.qrWrap}>
            <QrCode data={`cuidary:verify:${profile.uid}`} size={190} />
          </View>
          <Text style={styles.code}>{profile.uid}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, small && { fontSize: 13 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  card: { borderRadius: 24, padding: 20 },
  cardTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { color: colors.white, fontSize: 19, fontWeight: '800' },
  title: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 6 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  uid: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 16, letterSpacing: 1 },
  qrCard: { backgroundColor: colors.white, borderRadius: 24, padding: 20, alignItems: 'center' },
  qrTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  qrSubtitle: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 18 },
  qrWrap: { padding: 12, backgroundColor: colors.bgSoft, borderRadius: 16 },
  code: { marginTop: 14, color: colors.muted, fontSize: 11, letterSpacing: 0.5 },
});
