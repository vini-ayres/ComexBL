export function toCanonicalString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}
