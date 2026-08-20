/** Grupos do Active Directory mapeados a perfis da aplicação. */
export const LDAP_AD_GROUPS = [
  { name: 'GG_OCR_BL_ADMIN', roleName: 'Administrador' },
  { name: 'GG_OCR_BL_SUPERVISOR', roleName: 'Supervisor' },
  { name: 'GG_OCR_BL_OPERADOR', roleName: 'Operador' },
] as const;

export const ROLE_PRIORITY: Record<string, number> = {
  Administrador: 3,
  Supervisor: 2,
  Operador: 1,
};

export function pickPrimaryRole(roleNames: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;

  for (const roleName of roleNames) {
    const score = ROLE_PRIORITY[roleName] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = roleName;
    }
  }

  return best;
}

export function extractGroupCnFromMemberOf(memberOfDn: string): string | null {
  const match = memberOfDn.match(/^CN=([^,]+)/i);
  return match?.[1] ?? null;
}
