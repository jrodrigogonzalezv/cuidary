import { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image, StyleSheet, Text, View } from 'react-native';
import { collectionGroup, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { BitacoraEntry } from '@/types/models';
import { colors } from '@/theme/colors';

const moodIcon: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  'muy bueno': 'smile-o',
  bueno: 'smile-o',
  regular: 'meh-o',
  malo: 'frown-o',
};

export function PatientBitacoraList({ patientId }: { patientId: string }) {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);

  useEffect(() => {
    const q = query(collectionGroup(db, 'bitacoraEntries'), where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as BitacoraEntry)),
      () => setEntries([]),
    );
  }, [patientId]);

  if (entries.length === 0) {
    return <Text style={styles.empty}>Aún no hay notas registradas para este paciente.</Text>;
  }

  return (
    <View>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.iconWrap}>
            <FontAwesome name={entry.mood ? moodIcon[entry.mood] : 'file-text-o'} size={15} color={colors.mint} />
          </View>
          <View style={{ flex: 1 }}>
            {entry.photoUrl && <Image source={{ uri: entry.photoUrl }} style={styles.photo} />}
            {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
            <Text style={styles.meta}>
              {entry.createdByName} ·{' '}
              {new Date(entry.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  note: { color: colors.ink, fontSize: 14, lineHeight: 19 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
