import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { MedicationLog } from '@/types/models';

export function MedicationList({ shiftId }: { shiftId: string }) {
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'shifts', shiftId, 'medications'), orderBy('administeredAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MedicationLog));
      },
      () => setLogs([]),
    );
  }, [shiftId]);

  if (logs.length === 0) {
    return <Text style={styles.empty}>Sin fármacos administrados en este turno.</Text>;
  }

  return (
    <View>
      {logs.map((log) => (
        <View key={log.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.name}>
              {log.name} {log.dose}
            </Text>
            <Text style={styles.meta}>
              Administrado {new Date(log.administeredAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
            </Text>
            {log.observation ? <Text style={styles.observation}>{log.observation}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6B7280', paddingVertical: 24, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginTop: 6 },
  content: { flex: 1 },
  name: { fontWeight: '600', color: '#111827' },
  meta: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  observation: { color: '#374151', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
});
