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

export type InviteSource = "unlimited" | "pool" | "pack" | "none";

export type InviteCapacity = {
  unlimited: boolean;
  /** Las cinco del club: solo las gestiona el presidente (null para miembros). */
  pool: FamilyInviteSlots | null;
  /** Paquete personal asignado por la administración de la web. */
  pack: { granted: number; used: number; pending: number; free: number };
  /** De dónde saldría la siguiente invitación. */
  source: InviteSource;
  /** Invitaciones disponibles ahora mismo (Infinity si no hay límite). */
  available: number;
};

/**
 * Cuántas invitaciones para familias nuevas puede crear un usuario y de dónde salen:
 * sin límite (administración) > las cinco del club (solo el presidente) > su paquete personal.
 */
export function inviteCapacity(opts: { isAdmin: boolean; unlimited: boolean; packGranted: number; packRows: FamilyInviteRow[]; poolRows: FamilyInviteRow[] }, now = new Date()): InviteCapacity {
  const pool = opts.isAdmin ? familyInviteSlots(opts.poolRows, now) : null;
  const used = opts.packRows.filter((i) => i.usedAt).length;
  const pending = opts.packRows.filter((i) => isLiveInvitation(i, now)).length;
  const pack = { granted: opts.packGranted, used, pending, free: Math.max(0, opts.packGranted - used - pending) };
  const source: InviteSource = opts.unlimited ? "unlimited" : pool && pool.free > 0 ? "pool" : pack.free > 0 ? "pack" : "none";
  return { unlimited: opts.unlimited, pool, pack, source, available: opts.unlimited ? Infinity : (pool?.free ?? 0) + pack.free };
}

/** Texto del aviso cuando no quedan huecos: distingue «todas usadas» de «hay pendientes que liberar». */
export function noSlotsMessage(s: FamilyInviteSlots): string {
  if (s.used >= s.limit) return `Cada familia puede invitar a ${s.limit} familias como máximo y las tuyas ya han fundado su club. Las otras cinco podrán invitar a cinco más.`;
  return `Ya tienes ${s.used + s.pending} invitaciones de familia entre usadas y pendientes, el máximo son ${s.limit}. Anula una pendiente si quieres invitar a otra familia.`;
}
