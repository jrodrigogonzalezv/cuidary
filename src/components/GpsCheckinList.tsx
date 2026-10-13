import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { GpsCheckin } from '@/types/models';

export function GpsCheckinList({ shiftId }: { shiftId: string }) {
  const [checkins, setCheckins] = useState<GpsCheckin[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'shifts', shiftId, 'gpsCheckins'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setCheckins(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GpsCheckin));
      },
      () => setCheckins([]),
    );
  }, [shiftId]);

  if (checkins.length === 0) {
    return <Text style={styles.empty}>Sin check-in GPS registrado en este turno.</Text>;
  }

  return (
    <View>
      {checkins.map((checkin, index) => (
        <View key={checkin.id} style={styles.row}>
          {index === 0 ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Check-in GPS verificado</Text>
            </View>
          ) : null}
          <Text style={styles.meta}>
            {new Date(checkin.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
            {checkin.address ? ` · ${checkin.address}` : ''} · ±{Math.round(checkin.accuracy)} m
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6B7280', paddingVertical: 24, textAlign: 'center' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  verifiedText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  meta: { color: '#374151' },
});
