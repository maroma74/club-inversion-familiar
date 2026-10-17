/** Texto de una invitación para compartir por WhatsApp (o copiar), con el enlace de registro y el código. */
export function invitationWhatsAppText(opts: { inviteeName: string | null; inviterName: string; familyName: string; newFamily: boolean; link: string; code: string; expiresAt: Date | null }): string {
  const hola = opts.inviteeName ? `¡Hola, ${opts.inviteeName}!` : "¡Hola!";
  const que = opts.newFamily
    ? `Te invito a crear el club de inversión de tu familia en el *Club de Inversión Familiar*: cada mes una lección, una decisión y un porqué, con la paga de los hijos y en valores de verdad. Tú presides tu club y recibes cinco invitaciones para otras familias.`
    : `Te invito a entrar en el club de inversión de *${opts.familyName}* en el Club de Inversión Familiar: cada mes una lección, una decisión y un porqué, con tu paga y en valores de verdad.`;
  const caduca = opts.expiresAt ? ` · caduca el ${opts.expiresAt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}` : "";
  return [
    `${hola} Soy ${opts.inviterName}, de ${opts.familyName}.`,
    "",
    que,
    "",
    `${opts.newFamily ? "Crea tu club" : "Entra"} con este enlace: ${opts.link}`,
    `Código: ${opts.code}${caduca}`,
  ].join("\n");
}

/** Enlace de WhatsApp: con móvil abre el chat de esa persona; sin él, WhatsApp pide elegir el contacto. */
export function whatsappShareLink(phoneE164: string | null, text: string): string {
  const to = phoneE164 ? phoneE164.replace(/^\+/, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
