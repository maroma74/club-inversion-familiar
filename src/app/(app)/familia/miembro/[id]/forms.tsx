"use client";

import { useActionState } from "react";
import { updateMemberAction } from "@/app/actions/members";

/** Ficha editable de un miembro (solo el presidente): nombre, email con el que entra y móvil para WhatsApp. */
export function MemberForm({ id, name, email, phone }: { id: string; name: string; email: string; phone: string }) {
  const [state, action, pending] = useActionState(updateMemberAction, undefined);
  return (
    <form action={action} className="grid gap-4 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
      <input type="hidden" name="userId" value={id} />
      <div className="field">
        <label htmlFor="m-name">Nombre</label>
        <input id="m-name" name="name" defaultValue={name} required minLength={2} maxLength={60} className="input" autoComplete="off" />
        <p className="m-0 mt-1 text-xs text-neutral-700">En el club se muestra solo el nombre de pila.</p>
      </div>
      <div className="field">
        <label htmlFor="m-email">Email</label>
        <input id="m-email" name="email" type="email" defaultValue={email} required maxLength={120} className="input" autoComplete="off" />
        <p className="m-0 mt-1 text-xs text-neutral-700">Es con el que entra. Si lo cambias, díselo.</p>
      </div>
      <div className="field">
        <label htmlFor="m-phone">Móvil</label>
        <input id="m-phone" name="phone" type="tel" defaultValue={phone} maxLength={30} className="input" placeholder="+34 612 345 678" autoComplete="off" />
        <p className="m-0 mt-1 text-xs text-neutral-700">Para los avisos de la cartera por WhatsApp. Déjalo vacío para quitarlo.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3" style={{ gridColumn: "1 / -1" }}>
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar la ficha"}</button>
        {state?.error && <p role="alert" className="m-0 text-sm" style={{ color: "var(--color-amber-700)" }}>{state.error}</p>}
        {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
      </div>
    </form>
  );
}
