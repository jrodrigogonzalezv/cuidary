import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { BitacoraEntry } from '@/types/models';
import { colors } from '@/theme/colors';

export function ShiftNotesList({ shiftId }: { shiftId: string }) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'shifts', shiftId, 'bitacoraEntries'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as BitacoraEntry)),
      () => setEntries([]),
    );
  }, [shiftId]);

  if (entries.length === 0) {
    return <Text style={styles.empty}>Sin notas en este turno todavía.</Text>;
  }

  return (
    <View>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.row}>
          {entry.photoUrl && <Image source={{ uri: entry.photoUrl }} style={styles.photo} />}
          {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
          <Text style={styles.meta}>
            {new Date(entry.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, paddingVertical: 10, textAlign: 'center' },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  photo: { width: '100%', height: 160, borderRadius: 10, marginBottom: 6 },
  note: { color: colors.ink, fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
