import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: { color: colors.primaryDark, fontSize: 12, marginTop: 5, fontWeight: '600' },
});
