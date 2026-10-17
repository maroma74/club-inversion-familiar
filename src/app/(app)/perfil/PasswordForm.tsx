"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/password";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
      <div className="field">
        <label htmlFor="pw-current">Contraseña actual</label>
        <input id="pw-current" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-new">Contraseña nueva</label>
        <input id="pw-new" name="password" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Repite la nueva</label>
        <input id="pw-confirm" name="confirm" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" />
      </div>
      <div className="flex flex-wrap items-center gap-3" style={{ gridColumn: "1 / -1" }}>
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button>
        {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
        {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
      </div>
    </form>
  );
}
