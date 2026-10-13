export function isValidChileanPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('56') ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(normalized) || /^[2-9]\d{7,8}$/.test(normalized);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidRut(rut: string) {
  const clean = rut.replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const computed = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return computed === dv;
}

export function isValidName(name: string) {
  return name.trim().length >= 2;
}

export function isValidAge(raw: string) {
  const age = Number(raw);
  return Number.isInteger(age) && age >= 0 && age <= 120;
}

export function isInRange(raw: string, min: number, max: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max;
}
