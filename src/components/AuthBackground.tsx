import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.primarySoft, colors.bg, colors.mintSoft]} style={styles.flex}>
      <View style={[styles.blob, styles.blobLavender]} />
      <View style={[styles.blob, styles.blobMint]} />
      <View style={[styles.blob, styles.blobPeach]} />

      <FontAwesome name="heartbeat" size={120} color={colors.primary} style={[styles.icon, styles.iconHeartbeat]} />
      <FontAwesome name="leaf" size={90} color={colors.mint} style={[styles.icon, styles.iconLeaf]} />
      <FontAwesome name="user-md" size={80} color={colors.lavender} style={[styles.icon, styles.iconDoctor]} />
      <FontAwesome name="home" size={70} color={colors.accent} style={[styles.icon, styles.iconHome]} />

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 999 },
  blobLavender: { width: 220, height: 220, backgroundColor: colors.lavenderSoft, top: -70, left: -70, opacity: 0.6 },
  blobMint: { width: 180, height: 180, backgroundColor: colors.mintSoft, bottom: -50, right: -60, opacity: 0.6 },
  blobPeach: { width: 140, height: 140, backgroundColor: colors.peachSoft, top: '38%', right: -70, opacity: 0.5 },
  icon: { position: 'absolute', opacity: 0.1 },
  iconHeartbeat: { top: 70, right: -20, transform: [{ rotate: '-12deg' }] },
  iconLeaf: { bottom: 160, left: -20, transform: [{ rotate: '18deg' }] },
  iconDoctor: { top: '46%', left: -10, transform: [{ rotate: '-8deg' }] },
  iconHome: { bottom: 40, right: 30, transform: [{ rotate: '10deg' }] },
});
