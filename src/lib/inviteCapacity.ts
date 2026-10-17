import "server-only";
import { prisma } from "./prisma";
import { inviteCapacity, type InviteCapacity } from "./familyInvites";

type Actor = { id: string; familyId: string; role: string; unlimitedFamilyInvites: boolean; familyInvitePack: number };

/** Capacidad real de un usuario para invitar a familias nuevas: las cinco del club (si preside) y su paquete personal. */
export async function loadInviteCapacity(user: Actor): Promise<InviteCapacity> {
  const [poolRows, packRows] = await Promise.all([
    prisma.invitation.findMany({ where: { familyId: user.familyId, newFamily: true, fromPack: false }, select: { usedAt: true, revokedAt: true, expiresAt: true } }),
    prisma.invitation.findMany({ where: { createdById: user.id, newFamily: true, fromPack: true }, select: { usedAt: true, revokedAt: true, expiresAt: true } }),
  ]);
  return inviteCapacity({ isAdmin: user.role === "ADMIN", unlimited: user.unlimitedFamilyInvites, packGranted: user.familyInvitePack, packRows, poolRows });
}
