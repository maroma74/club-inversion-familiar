"use client";

import { useActionState } from "react";
import { createFamilyInvitationAction, sendFamilyInvitationAction } from "@/app/actions/familyInvites";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="m-0 text-xs text-neutral-800">{state.error}</p>;
  if (state.ok) return <p role="status" className="m-0 text-xs text-accent-700">{state.ok}</p>;
  return null;
}

/** Crear una invitación para que otra familia funde su club. */
export function FamilyInviteForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(createFamilyInvitationAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="field">
        <label htmlFor="fi-name">Nombre de quien invitas (opcional)</label>
        <input id="fi-name" name="name" className="input" placeholder="Ana" maxLength={80} disabled={disabled} />
      </div>
      <div className="field">
        <label htmlFor="fi-phone">Su móvil (opcional, para WhatsApp)</label>
        <input id="fi-phone" name="phone" type="tel" className="input" placeholder="+34 612 345 678" maxLength={30} disabled={disabled} />
      </div>
      <div className="field">
        <label htmlFor="fi-email">Su email (opcional; si lo pones, solo valdrá con ese email)</label>
        <input id="fi-email" name="email" type="email" className="input" placeholder="ana@ejemplo.com" disabled={disabled} />
      </div>
      <div className="field">
        <label htmlFor="fi-days">Caduca en (días, 0 = nunca)</label>
        <input id="fi-days" name="expiresDays" type="number" min={0} max={365} defaultValue={30} className="input" disabled={disabled} />
      </div>
      <div className="field sm:col-span-2">
        <label htmlFor="fi-note">Nota para ti (opcional)</label>
        <input id="fi-note" name="note" className="input" placeholder="Los padres de la amiga de Lucía" maxLength={200} disabled={disabled} />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button className="btn-primary whitespace-nowrap" disabled={pending || disabled}>{pending ? "Creando…" : "Crear la invitación"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function SendFamilyInviteForm({ id, email, resend }: { id: string; email: string | null; resend: boolean }) {
  const [state, action, pending] = useActionState(sendFamilyInvitationAction, undefined);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {!email && <input name="email" type="email" required placeholder="email del invitado" className="input py-1 text-xs w-44" />}
      <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Enviando…" : resend ? "Reenviar correo" : "Enviar por correo"}</button>
      <Msg state={state} />
    </form>
  );
}
