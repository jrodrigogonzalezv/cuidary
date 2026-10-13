import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

export function StarRatingDisplay({ value, count, size = 13 }: { value: number; count?: number; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesome
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half-full' : 'star-o'}
          size={size}
          color={colors.peach}
          style={{ marginRight: 2 }}
        />
      ))}
      {typeof count === 'number' && <Text style={styles.count}>({count})</Text>}
    </View>
  );
}

export function StarRatingInput({ value, onChange, size = 32 }: { value: number; onChange: (stars: number) => void; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={6} style={{ marginRight: 6 }}>
          <FontAwesome name={value >= i ? 'star' : 'star-o'} size={size} color={colors.peach} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  count: { marginLeft: 6, color: colors.muted, fontSize: 12, fontWeight: '600' },
});
