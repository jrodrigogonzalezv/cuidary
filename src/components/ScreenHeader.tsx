import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/colors';

function AnimatedLogo() {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Logo size={32} />
    </Animated.View>
  );
}

export function ScreenHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  return (
    <View style={styles.row}>
      {showBack && (
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <FontAwesome name="chevron-left" size={16} color={colors.ink} />
        </Pressable>
      )}
      <AnimatedLogo />
      <View style={styles.divider} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { width: 1, height: 20, backgroundColor: colors.border },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
