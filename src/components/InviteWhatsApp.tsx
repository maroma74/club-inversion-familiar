"use client";

import { useState, useTransition } from "react";
import { markInvitationSharedAction } from "@/app/actions/familyInvites";
import { whatsappShareLink } from "@/lib/invitationMessages";

/** Abre WhatsApp con la invitación escrita (al móvil del invitado si lo hay) y deja constancia de que se compartió. */
export function InviteWhatsApp({ id, phone, text, sharedAt, small = true }: { id: string; phone: string | null; text: string; sharedAt: string | null; small?: boolean }) {
  const [, start] = useTransition();
  const [shared, setShared] = useState(sharedAt);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={whatsappShareLink(phone, text)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${shared ? "btn-secondary" : "btn-primary"} ${small ? "py-1 text-xs" : ""}`}
        title={phone ? `Abrir WhatsApp con ${phone}` : "Abrir WhatsApp y elegir el contacto"}
        onClick={() => {
          if (!shared) setShared(new Date().toISOString());
          start(() => { void markInvitationSharedAction(id); });
        }}
      >
        {shared ? "Volver a enviar por WhatsApp" : "Enviar por WhatsApp"}
      </a>
      {shared && <span className="text-xs text-neutral-700">WhatsApp abierto el {new Date(shared).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}</span>}
    </span>
  );
}
