"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/password";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">Contraseña nueva</label>
        <input id="password" name="password" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" className="input" required minLength={10} maxLength={72} autoComplete="new-password" />
      </div>
      {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}
