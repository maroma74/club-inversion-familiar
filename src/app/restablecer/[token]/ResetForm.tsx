"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/password";
import { NewPasswordFields } from "@/components/NewPasswordFields";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <NewPasswordFields idPrefix="reset" label="Contraseña nueva" />
      {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Guardando…" : "Guardar y entrar"}</button>
    </form>
  );
}
