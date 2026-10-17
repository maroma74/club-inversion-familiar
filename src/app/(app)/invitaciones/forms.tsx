"use client";

import { useActionState } from "react";
import { createInvitationAction, regenerateFamilyCodeAction, sendInvitationAction, setJoinModeAction } from "@/app/actions/invitations";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-green-600">{state.ok}</p>;
  return null;
}

export function InvitationForm() {
  const [state, action, pending] = useActionState(createInvitationAction, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="label">Nombre (opcional)</label>
        <input name="name" className="input" placeholder="Lucía" maxLength={80} />
      </div>
      <div>
        <label className="label">Email (opcional, restringe la invitación)</label>
        <input name="email" type="email" className="input" placeholder="lucia@ejemplo.com" />
      </div>
      <div>
        <label className="label">Tipo de invitación</label>
        <select name="kind" className="input" defaultValue="MEMBER">
          <option value="MEMBER">Entrar en mi familia como miembro</option>
          <option value="ADMIN">Entrar en mi familia como presidente</option>
          <option value="NEW_FAMILY">Crear una familia nueva (será su presidente)</option>
        </select>
      </div>
      <div>
        <label className="label">Caduca en (días, 0 = nunca)</label>
        <input name="expiresDays" type="number" min={0} max={365} defaultValue={14} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Nota interna (opcional)</label>
        <input name="note" className="input" placeholder="Hijo mayor, empieza en noviembre" maxLength={200} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Creando…" : "Crear invitación"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

/** Botón «Enviar por correo» de una invitación pendiente; si no tiene email fijado, pide uno. */
export function SendInvitationForm({ id, email, resend }: { id: string; email: string | null; resend: boolean }) {
  const [state, action, pending] = useActionState(sendInvitationAction, undefined);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {!email && <input name="email" type="email" required placeholder="email del invitado" className="input py-1 text-xs w-44" />}
      <button className="btn-secondary py-1 text-xs" disabled={pending}>{pending ? "Enviando…" : resend ? "Reenviar correo" : "Enviar por correo"}</button>
      <Msg state={state} />
    </form>
  );
}

const MODES = [
  { value: "CODE", label: "Entrada directa", detail: "Quien tenga el código general entra al momento." },
  { value: "CODE_APPROVAL", label: "Con aprobación", detail: "Entra con el código, pero queda pendiente hasta que lo apruebes." },
  { value: "INVITE_ONLY", label: "Solo invitación personal", detail: "El código general no funciona; cada persona necesita su invitación." },
];

export function JoinModeForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(setJoinModeAction, undefined);
  return (
    <form action={action} className="space-y-2">
      {MODES.map((m) => (
        <label key={m.value} className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="radio" name="joinMode" value={m.value} defaultChecked={current === m.value} className="mt-1" />
          <span><b>{m.label}</b><span className="block text-xs text-slate-500">{m.detail}</span></span>
        </label>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button className="btn-secondary py-1 text-xs" disabled={pending}>Guardar</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function RegenerateCodeForm() {
  const [state, action, pending] = useActionState(regenerateFamilyCodeAction, undefined);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <button className="btn-secondary py-1 text-xs" disabled={pending} onClick={(e) => { if (!confirm("¿Generar un código general nuevo? El actual dejará de funcionar.")) e.preventDefault(); }}>
        Regenerar código
      </button>
      <Msg state={state} />
    </form>
  );
}
