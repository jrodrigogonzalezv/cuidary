import { useMemo } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StyleSheet, Text, View } from 'react-native';
import type { Shift } from '@/types/models';
import { dayKey, isSameMonth, shiftNetAmount } from '@/lib/earnings';
import { formatClp } from '@/lib/fees';
import { colors } from '@/theme/colors';

export function EarningsSummary({ history }: { history: Shift[] }) {
  const { workedDays, totalHours, totalNet, monthlyAgreements } = useMemo(() => {
    const thisMonth = history.filter((s) => isSameMonth(s.startTime));
    const days = new Set(thisMonth.map((s) => dayKey(s.startTime)));
    const totalHours = thisMonth.reduce((sum, s) => sum + s.durationHours, 0);
    const totalNet = thisMonth.reduce((sum, s) => sum + (shiftNetAmount(s) ?? 0), 0);
    const monthlySeen = new Map<string, number>();
    thisMonth
      .filter((s) => s.rateUnit === 'mes' && s.agreedAmount != null && s.offerId)
      .forEach((s) => monthlySeen.set(s.offerId!, s.agreedAmount!));
    return { workedDays: days.size, totalHours, totalNet, monthlyAgreements: Array.from(monthlySeen.values()) };
  }, [history]);

  if (history.length === 0) return null;

  const monthLabel = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Este mes · {monthLabel}</Text>
      <View style={styles.row}>
        <Metric icon="calendar-check-o" label="Días trabajados" value={String(workedDays)} />
        <Metric icon="clock-o" label="Horas" value={String(totalHours)} />
      </View>
      {(totalNet > 0 || monthlyAgreements.length > 0) && (
        <View style={styles.payWrap}>
          {totalNet > 0 && (
            <>
              <Text style={styles.payAmount}>{formatClp(totalNet)}</Text>
              <Text style={styles.payLabel}>ganado este mes (neto, comisión Cuidary descontada)</Text>
            </>
          )}
          {monthlyAgreements.map((amount, i) => (
            <Text key={i} style={styles.payLabelSoft}>
              + sueldo mensual acordado: {formatClp(amount)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <FontAwesome name={icon} size={14} color={colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18, marginBottom: 20 },
  title: { fontSize: 14, fontWeight: '800', color: colors.ink, marginBottom: 14, textTransform: 'capitalize' },
  row: { flexDirection: 'row', gap: 24 },
  metric: { alignItems: 'flex-start', gap: 4 },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 11, color: colors.muted },
  payWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  payAmount: { fontSize: 22, fontWeight: '800', color: colors.success },
  payLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  payLabelSoft: { fontSize: 12, color: colors.ink, marginTop: 6, fontWeight: '600' },
});
