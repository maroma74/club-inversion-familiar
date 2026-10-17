import "server-only";
import { prisma } from "./prisma";
import { invitationEmail, sendEmail } from "./email";
import { appUrl } from "./appUrl";
import { firstName } from "./names";
import { rateLimit } from "./ratelimit";

type Actor = { id: string; name: string; familyId: string; role: string };

/** ¿Puede este usuario tocar esta invitación? El presidente, las de su familia; cualquiera, las que creó él mismo. */
export function canManageInvitation(actor: Actor, inv: { familyId: string; createdById: string }): boolean {
  return (actor.role === "ADMIN" && inv.familyId === actor.familyId) || inv.createdById === actor.id;
}

/** Envía (o reenvía) una invitación pendiente por correo con el enlace de registro. Comprueba estado, destinatario y límites. */
export async function deliverInvitation(actor: Actor, invitationId: string, emailFromForm: string): Promise<{ error?: string; ok?: string }> {
  const inv = await prisma.invitation.findUnique({ where: { id: invitationId }, include: { family: true } });
  if (!inv || !canManageInvitation(actor, inv)) return { error: "Invitación no encontrada" };
  if (inv.usedAt) return { error: "Esta invitación ya se ha usado" };
  if (inv.revokedAt) return { error: "Esta invitación está anulada; reactívala antes de enviarla" };
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return { error: "Esta invitación ha caducado; reactívala antes de enviarla" };
  const to = inv.email ?? emailFromForm ?? "";
  if (!to) return { error: "Indica a qué email enviarla" };
  // Una invitación, un destinatario: una vez enviada no se reutiliza para escribir a otras direcciones.
  if (inv.sentTo && inv.sentTo !== to) return { error: `Esta invitación ya se envió a ${inv.sentTo}. Para otra persona, crea una invitación nueva.` };
  // Límites de envío: 10 minutos entre reenvíos de la misma invitación y 30 correos por familia cada 24 horas.
  if (inv.sentAt && Date.now() - inv.sentAt.getTime() < 10 * 60 * 1000) return { error: "Esta invitación se envió hace menos de 10 minutos. Espera un poco antes de reenviarla." };
  const daily = await rateLimit(`invite-mail:${inv.familyId}`, 30, 24 * 60 * 60 * 1000);
  if (!daily.ok) return { error: "Se ha alcanzado el límite de 30 correos de invitación al día" };
  const message = invitationEmail({
    to,
    inviteeName: inv.name ? firstName(inv.name) : null,
    familyName: inv.family.name,
    presidentName: firstName(actor.name),
    code: inv.code,
    link: `${appUrl()}/registro?codigo=${inv.code}`,
    expiresAt: inv.expiresAt,
    newFamily: inv.newFamily,
  });
  const result = await sendEmail(message);
  if (!result.sent) return { error: result.error };
  await prisma.invitation.update({ where: { id: inv.id }, data: { sentAt: new Date(), sentTo: to } });
  return { ok: `Invitación enviada a ${to}` };
}
