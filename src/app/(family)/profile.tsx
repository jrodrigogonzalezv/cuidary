import { Link, router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme/colors';

export default function FamilyProfile() {
  const { profile, signOut } = useAuth();
  if (!profile) return null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Perfil" />
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.mintSoft, colors.accentSoft]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Avatar name={profile.name} size={76} photoUrl={profile.photoUrl} />
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Familia</Text>
          </View>
          <Pressable style={styles.editButton} onPress={() => router.push('/(family)/edit-profile')}>
            <FontAwesome name="pencil" size={12} color={colors.primaryDark} />
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </Pressable>
        </LinearGradient>

        <Link href="/(family)/verify" asChild>
          <Pressable style={styles.linkCard}>
            <View style={[styles.linkIcon, { backgroundColor: colors.mintSoft }]}>
              <FontAwesome name="qrcode" size={18} color={colors.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Verificar un cuidador</Text>
              <Text style={styles.linkSubtitle}>Escanea o ingresa el código de su credencial</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.muted} />
          </Pressable>
        </Link>

        <View style={styles.card}>
          <InfoRow icon="envelope" label="Correo" value={profile.email} />
          <InfoRow icon="phone" label="Teléfono" value={profile.phone} />
          {profile.address && (
            <InfoRow icon="map-marker" label="Dirección" value={`${profile.address.comunaName}, ${profile.address.regionName}`} />
          )}
        </View>

        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <FontAwesome name="sign-out" size={16} color={colors.primaryDark} />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof FontAwesome>['name']; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <FontAwesome name={icon} size={14} color={colors.accent} />
      </View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },
  hero: { borderRadius: 24, paddingVertical: 28, alignItems: 'center', gap: 6 },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 10 },
  roleBadge: { backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  editButtonText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  linkIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  linkSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 2 },
  signOutButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.primaryDark, fontWeight: '700' },
});
