"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { PasswordInput } from "@/components/PasswordInput";

/** Caja de entrada: la misma en /login y en la portada. */
export function LoginForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <>
      <form action={action} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
        </div>
        {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar en mi club"}</button>
      </form>
      <p className={`text-sm text-slate-500 text-center ${compact ? "mt-4" : "mt-6"}`}>
        ¿Tienes una invitación? <Link href="/registro" className="text-indigo-600 font-medium">Crea tu club</Link>
      </p>
    </>
  );
}
