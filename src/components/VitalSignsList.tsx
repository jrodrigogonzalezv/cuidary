import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { db } from '@/lib/firebase';
import type { VitalSignLog } from '@/types/models';

export function VitalSignsList({ shiftId }: { shiftId: string }) {
  const [logs, setLogs] = useState<VitalSignLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'shifts', shiftId, 'vitalSigns'), orderBy('recordedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VitalSignLog));
      },
      () => setLogs([]),
    );
  }, [shiftId]);

  if (logs.length === 0) {
    return <Text style={styles.empty}>Sin registros de signos vitales en este turno.</Text>;
  }

  const latest = logs[0];

  return (
    <View>
      <View style={styles.grid}>
        <Metric label="Presión arterial" value={`${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}`} unit="mmHg" />
        <Metric label="Saturación O₂" value={`${latest.oxygenSaturation}`} unit="%" />
        <Metric label="Frecuencia cardíaca" value={`${latest.heartRate}`} unit="lpm" />
        <Metric label="Temperatura" value={`${latest.temperature}`} unit="°C" />
      </View>
      <Text style={styles.historyTitle}>Historial</Text>
      {logs.map((log) => (
        <View key={log.id} style={styles.historyRow}>
          <Text style={styles.historyTime}>{new Date(log.recordedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.historyText}>
            PA {log.bloodPressureSystolic}/{log.bloodPressureDiastolic} · O₂ {log.oxygenSaturation}% · FC {log.heartRate}lpm · {log.temperature}°C
          </Text>
        </View>
      ))}
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value} <Text style={styles.metricUnit}>{unit}</Text>
      </Text>
      <Text style={styles.metricRange}>Rango normal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: '#6B7280', paddingVertical: 24, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: '#EAF3F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D3E6F0',
  },
  metricLabel: { color: '#2E6E9E', fontWeight: '600', fontSize: 12 },
  metricValue: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 4 },
  metricUnit: { fontSize: 13, fontWeight: '400', color: '#6B7280' },
  metricRange: { color: '#059669', fontSize: 11, marginTop: 4 },
  historyTitle: { fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 8 },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  historyTime: { color: '#6B7280', width: 48 },
  historyText: { color: '#374151', flex: 1 },
});
