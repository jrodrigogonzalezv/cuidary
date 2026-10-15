import type { AppNotification, UserRole } from '@/types/models';

export function notificationHref(notification: AppNotification, role: UserRole | undefined): string | null {
  if (!role) return null;
  switch (notification.targetType) {
    case 'shift':
      if (!notification.targetId) return null;
      return role === 'familia' ? `/(family)/shift/${notification.targetId}` : `/(caregiver)/shift/${notification.targetId}`;
    case 'offerApplicants':
      if (!notification.targetId) return null;
      return `/(family)/offer-applicants/${notification.targetId}`;
    case 'offers':
      return role === 'familia' ? '/(family)/offers' : '/(caregiver)/offers';
    default:
      return null;
  }
}
