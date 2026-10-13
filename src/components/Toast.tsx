import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';

export interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'info';
}

export function useToastQueue() {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, tone: ToastState['tone'] = 'success') {
    setToast({ id: Date.now(), message, tone });
  }

  return { toast, showToast, dismiss: () => setToast(null) };
}

export function Toast({ toast, onDone }: { toast: ToastState | null; onDone: () => void }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    progress.setValue(0);
    Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [toast, progress, onDone]);

  if (!toast) return null;

  const tone = toast.tone === 'success' ? colors.mint : colors.accent;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}
    >
      <FontAwesome name="check-circle" size={18} color={tone} />
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 50,
  },
  text: { color: colors.ink, fontWeight: '700', fontSize: 14, flex: 1 },
});
