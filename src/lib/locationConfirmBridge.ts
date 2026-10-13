export interface LocationConfirmResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string | null;
}

type Resolver = (result: LocationConfirmResult | null) => void;
let pendingResolver: Resolver | null = null;

export function waitForLocationConfirm(): Promise<LocationConfirmResult | null> {
  return new Promise((resolve) => {
    pendingResolver = resolve;
  });
}

export function resolveLocationConfirm(result: LocationConfirmResult | null) {
  pendingResolver?.(result);
  pendingResolver = null;
}
