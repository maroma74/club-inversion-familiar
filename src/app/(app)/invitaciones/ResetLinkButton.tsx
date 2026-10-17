"use client";

import { useActionState } from "react";
import { createPasswordResetAction } from "@/app/actions/password";
import { CopyButton } from "@/components/CopyButton";

/** Botón del presidente para generar (y enviar) el enlace con el que un miembro fija una contraseña nueva. */
export function ResetLinkButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(createPasswordResetAction, undefined);
  const link = state?.ok?.match(/https?:\/\/\S+$/)?.[0];
  return (
    <form action={action} className="inline-flex flex-col items-end gap-1 max-w-[280px]">
      <input type="hidden" name="userId" value={userId} />
      <button className="text-xs text-indigo-600 hover:underline" disabled={pending} title={`Generar un enlace para que ${name} elija una contraseña nueva`}>{pending ? "Generando…" : "Restablecer contraseña"}</button>
      {state?.error && <span role="alert" className="text-xs text-neutral-800 text-right">{state.error}</span>}
      {state?.ok && (
        <span role="status" className="text-xs text-neutral-700 text-right [text-wrap:pretty]">
          {state.ok.replace(/\s*Si prefieres pasárselo tú:.*$/, "")}
          {link && <> <CopyButton text={link} label="Copiar enlace" /></>}
        </span>
      )}
    </form>
  );
}
