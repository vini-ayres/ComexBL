/** Valores permitidos para BlVersion (CHECK constraint no SQL Server). */
export const BL_VERSION = {
  DRAFT: 'DRAFT',
  FINAL: 'FINAL',
} as const;

export type BlVersion = (typeof BL_VERSION)[keyof typeof BL_VERSION];

export const BL_VERSION_VALUES: readonly BlVersion[] = [
  BL_VERSION.DRAFT,
  BL_VERSION.FINAL,
];

export function isBlVersion(value: string): value is BlVersion {
  return BL_VERSION_VALUES.includes(value as BlVersion);
}
