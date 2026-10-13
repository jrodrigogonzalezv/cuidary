import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/theme/colors';

export function DashboardHeader({
  name,
  subtitle,
  photoUrl,
  right,
}: {
  name: string;
  subtitle: string;
  photoUrl?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Avatar name={name} photoUrl={photoUrl} />
        <View>
          <Text style={styles.greeting}>Hola, {name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 18, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 1 },
});
