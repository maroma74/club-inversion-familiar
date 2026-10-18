"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/password";
import { NewPasswordFields } from "@/components/NewPasswordFields";
import { PasswordInput } from "@/components/PasswordInput";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="grid gap-3 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
      <div className="field">
        <label htmlFor="pw-current">Contraseña actual</label>
        <PasswordInput id="pw-current" name="current" required autoComplete="current-password" />
      </div>
      <NewPasswordFields idPrefix="pw" label="Contraseña nueva" confirmLabel="Repite la nueva" inline />
      <div className="flex flex-wrap items-center gap-3" style={{ gridColumn: "1 / -1" }}>
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button>
        {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
        {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
      </div>
    </form>
  );
}
