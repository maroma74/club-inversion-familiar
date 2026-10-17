"use client";

import { useActionState } from "react";
import { updatePhoneAction } from "@/app/actions/profile";

export function PhoneForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(updatePhoneAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="field">
        <label htmlFor="phone">Móvil</label>
        <input id="phone" name="phone" type="tel" className="input" defaultValue={initial} placeholder="612 345 678" autoComplete="tel" maxLength={24} />
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state?.error && <p role="alert" className="m-0 text-sm text-neutral-800">{state.error}</p>}
      {state?.ok && <p role="status" className="m-0 text-sm text-accent-700">{state.ok}</p>}
    </form>
  );
}
