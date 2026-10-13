export type UserRole = 'familia' | 'cuidador';

export interface Address {
  regionCode: string;
  regionName: string;
  comunaCode: string;
  comunaName: string;
  street: string;
}

export type BankAccountType = 'corriente' | 'vista' | 'ahorro';

export interface BankAccount {
  bankName: string;
  accountType: BankAccountType;
  accountNumber: string;
  rut: string;
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  createdAt: number;
  photoUrl?: string;
  address?: Address;
  bankAccount?: BankAccount;
  title?: string;
  yearsExperience?: number;
  bio?: string;
  ratingAvg?: number;
  ratingCount?: number;
  shiftsCompleted?: number;
  workComunas?: string[];
}

export type DependencyLevel = 'autovalente' | 'moderada' | 'severa';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  comuna: string;
  dependencyLevel: DependencyLevel;
  familyUids: string[];
  activeShiftId: string | null;
  photoUrl?: string;
  address?: Address;
  anamnesis?: string;
  emergencyContacts?: EmergencyContact[];
}

export type ShiftStatus = 'programado' | 'activo' | 'completado';

export interface Shift {
  id: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string;
  caregiverUid: string;
  caregiverName: string;
  familyUids: string[];
  startTime: number;
  endTime: number | null;
  durationHours: number;
  status: ShiftStatus;
  offerId?: string;
  agreedAmount?: number;
  rateUnit?: OfferRateUnit;
}

export interface VitalSignLog {
  id: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  oxygenSaturation: number;
  heartRate: number;
  temperature: number;
  recordedAt: number;
  recordedBy: string;
}

export interface PrescribedMedication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  notes?: string;
  active: boolean;
  createdAt: number;
  createdBy: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  name: string;
  dose: string;
  observation?: string;
  administeredAt: number;
  administeredBy: string;
}

export interface GpsCheckin {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
  timestamp: number;
}

export interface BitacoraEntry {
  id: string;
  patientId: string;
  note: string;
  mood?: 'muy bueno' | 'bueno' | 'regular' | 'malo';
  photoUrl?: string;
  createdAt: number;
  createdBy: string;
  createdByName: string;
}

export type NotificationType = 'shift_assigned' | 'shift_started' | 'shift_completed';

export interface AppNotification {
  id: string;
  uid: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
  type: NotificationType;
}

export interface Rating {
  id: string;
  shiftId: string;
  caregiverUid: string;
  familyUid: string;
  patientName: string;
  stars: number;
  comment?: string;
  createdAt: number;
}

export type OfferScheduleType = 'puntual' | 'recurrente';
export type OfferRateUnit = 'turno' | 'hora' | 'mes';
export type OfferStatus = 'abierta' | 'asignada' | 'cerrada';

export interface ShiftOffer {
  id: string;
  patientId: string;
  patientName: string;
  patientComuna: string;
  familyUids: string[];
  createdBy: string;
  scheduleType: OfferScheduleType;
  startTime?: number;
  durationHours?: number;
  daysOfWeek?: number[];
  startHour?: string;
  endHour?: string;
  observations?: string;
  offeredAmount: number;
  rateUnit: OfferRateUnit;
  status: OfferStatus;
  assignedCaregiverUid?: string;
  assignedCaregiverName?: string;
  createdAt: number;
}
