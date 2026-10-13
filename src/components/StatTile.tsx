import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StyleSheet, Text, View } from 'react-native';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

export function StatTile({
  icon,
  label,
  value,
  bg,
  fg,
}: {
  icon: IconName;
  label: string;
  value: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <View style={[styles.iconBadge, { backgroundColor: fg }]}>
        <FontAwesome name={icon} size={14} color="#fff" />
      </View>
      <Text style={[styles.value, { color: fg }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12.5, color: '#4B4557', fontWeight: '600' },
});
