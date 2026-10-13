export const CUIDARY_FEE_RATE = 0.12;

export function caregiverNetAmount(offeredAmount: number) {
  return Math.round(offeredAmount * (1 - CUIDARY_FEE_RATE));
}

export function cuidaryFeeAmount(offeredAmount: number) {
  return Math.round(offeredAmount * CUIDARY_FEE_RATE);
}

export function formatClp(amount: number) {
  return `$${amount.toLocaleString('es-CL')}`;
}

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

export const RATE_UNIT_LABEL: Record<'turno' | 'hora' | 'mes', string> = {
  turno: 'por turno',
  hora: 'por hora',
  mes: 'al mes',
};
