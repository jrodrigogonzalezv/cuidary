import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { GpsMapPreview } from '@/components/GpsMapPreview';
import { resolveLocationConfirm } from '@/lib/locationConfirmBridge';
import { colors } from '@/theme/colors';

type Coords = { latitude: number; longitude: number; accuracy: number };
type Status = 'loading' | 'ready' | 'denied';

export default function GpsCheckinConfirmScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    fetchLocation();
    return () => {
      if (!resolvedRef.current) resolveLocationConfirm(null);
    };
  }, []);

  async function fetchLocation() {
    setStatus('loading');
    setAddress(null);
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('denied');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    const next = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 0,
    };
    setCoords(next);
    setStatus('ready');
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: next.latitude, longitude: next.longitude });
      if (place) {
        setAddress([place.street, place.streetNumber, place.name, place.city, place.region].filter(Boolean).join(', '));
      }
    } catch {
      // Sin conexión o sin resultados de geocodificación; se muestran solo las coordenadas.
    }
  }

  function handleCancel() {
    resolvedRef.current = true;
    resolveLocationConfirm(null);
    router.back();
  }

  function handleConfirm() {
    if (!coords) return;
    setSubmitting(true);
    resolvedRef.current = true;
    resolveLocationConfirm({ ...coords, address });
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} hitSlop={10} style={styles.closeButton}>
          <FontAwesome name="close" size={16} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirmar ubicación</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
          </View>
        )}

        {status === 'denied' && (
          <View style={styles.center}>
            <FontAwesome name="map-marker" size={32} color={colors.muted} />
            <Text style={styles.deniedText}>Activa el permiso de ubicación para continuar.</Text>
            <Pressable style={styles.retryButton} onPress={fetchLocation}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && coords && (
          <>
            <Text style={styles.hint}>Confirma que esta es tu ubicación actual para registrar el check-in.</Text>
            <GpsMapPreview lat={coords.latitude} lng={coords.longitude} height={260} />

            <View style={styles.card}>
              <View style={styles.addressRow}>
                <FontAwesome name="map-marker" size={16} color={colors.primary} />
                <Text style={styles.address}>{address ?? 'Buscando dirección...'}</Text>
              </View>
              <Text style={styles.coords}>
                Lat {coords.latitude.toFixed(5)} · Lng {coords.longitude.toFixed(5)} · ±{Math.round(coords.accuracy)} m
              </Text>
            </View>

            <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {mode === 'start' ? 'Confirmar e iniciar turno' : 'Confirmar check-in'}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  content: { flex: 1, padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: colors.muted },
  deniedText: { color: colors.muted, textAlign: 'center', paddingHorizontal: 30 },
  retryButton: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: colors.white, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, gap: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  address: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 15, lineHeight: 20 },
  coords: { color: colors.muted, fontSize: 12 },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  confirmButtonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
