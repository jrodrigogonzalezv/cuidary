import { Alert } from 'react-native';

function messageFor(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code ?? '');
    if (code.includes('permission-denied')) {
      return 'No tienes permiso para hacer esto. Puede que la información haya cambiado — vuelve a intentarlo.';
    }
    if (code.includes('unavailable') || code.includes('network')) {
      return 'No hay conexión a internet en este momento. Intenta de nuevo.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Intenta de nuevo en unos segundos.';
}

export function reportError(title: string, error: unknown) {
  Alert.alert(title, messageFor(error));
}
