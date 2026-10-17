"use client";

import { useActionState } from "react";
import { setInvitePackAction } from "@/app/actions/siteAdmin";

/** Paquete de invitaciones, sin límite y administración de la web para un usuario. */
export function PackForm({ userId, pack, unlimited, siteAdmin, isMe }: { userId: string; pack: number; unlimited: boolean; siteAdmin: boolean; isMe: boolean }) {
  const [state, action, pending] = useActionState(setInvitePackAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <input type="hidden" name="userId" value={userId} />
      <label className="inline-flex items-center gap-1">
        <span className="text-neutral-700">Paquete</span>
        <input name="pack" type="number" min={0} max={1000} defaultValue={pack} className="input py-0.5 text-xs w-16" aria-label="Invitaciones del paquete" />
      </label>
      <label className="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" name="unlimited" defaultChecked={unlimited} /> Sin límite</label>
      <label className={`inline-flex items-center gap-1 ${isMe ? "opacity-60" : "cursor-pointer"}`} title={isMe ? "No puedes quitarte la administración a ti mismo" : undefined}>
        <input type="checkbox" name="siteAdmin" defaultChecked={siteAdmin} disabled={isMe} />{isMe && <input type="hidden" name="siteAdmin" value="on" />} Administra la web
      </label>
      <button className="btn-secondary py-0.5 text-xs" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state?.error && <span role="alert" className="text-neutral-800">{state.error}</span>}
      {state?.ok && <span role="status" className="text-accent-700">{state.ok}</span>}
    </form>
  );
}
