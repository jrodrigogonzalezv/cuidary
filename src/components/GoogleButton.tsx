import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function GoogleButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Pressable style={styles.button} onPress={onPress} disabled={loading}>
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <FontAwesome name="google" size={17} color={colors.ink} />
          <Text style={styles.text}>Continuar con Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 13,
  },
  text: { color: colors.ink, fontWeight: '700', fontSize: 15 },
});
