import type { Shift } from '@/types/models';
import { caregiverNetAmount } from '@/lib/fees';

export function shiftNetAmount(shift: Shift): number | null {
  if (shift.agreedAmount == null || !shift.rateUnit) return null;
  if (shift.rateUnit === 'hora') return caregiverNetAmount(shift.agreedAmount * shift.durationHours);
  if (shift.rateUnit === 'turno') return caregiverNetAmount(shift.agreedAmount);
  return null;
}

export function isSameMonth(timestamp: number, reference = Date.now()) {
  const a = new Date(timestamp);
  const b = new Date(reference);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dayKey(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
