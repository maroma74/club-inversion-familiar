/**
 * La regla de las cinco familias: cada club puede invitar como máximo a otras cinco familias.
 * Cuentan las invitaciones de familia nueva ya usadas (una familia fundada) y las pendientes
 * (vivas: ni anuladas ni caducadas). Anular o dejar caducar una pendiente libera su hueco;
 * una familia ya fundada lo ocupa para siempre.
 */
export const FAMILY_INVITE_LIMIT = 5;

export type FamilyInviteRow = { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date | null };

export type FamilyInviteSlots = { limit: number; used: number; pending: number; free: number };

export function isLiveInvitation(i: FamilyInviteRow, now = new Date()): boolean {
  return !i.usedAt && !i.revokedAt && (!i.expiresAt || i.expiresAt.getTime() > now.getTime());
}

export function familyInviteSlots(invitations: FamilyInviteRow[], now = new Date()): FamilyInviteSlots {
  const used = invitations.filter((i) => i.usedAt).length;
  const pending = invitations.filter((i) => isLiveInvitation(i, now)).length;
  return { limit: FAMILY_INVITE_LIMIT, used, pending, free: Math.max(0, FAMILY_INVITE_LIMIT - used - pending) };
}

/** Texto del aviso cuando no quedan huecos: distingue «todas usadas» de «hay pendientes que liberar». */
export function noSlotsMessage(s: FamilyInviteSlots): string {
  if (s.used >= s.limit) return `Cada familia puede invitar a ${s.limit} familias como máximo y las tuyas ya han fundado su club. Las otras cinco podrán invitar a cinco más.`;
  return `Ya tienes ${s.used + s.pending} invitaciones de familia entre usadas y pendientes, el máximo son ${s.limit}. Anula una pendiente si quieres invitar a otra familia.`;
}
