"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="inline-block rounded-xl mb-4" style={{ background: "#0e2138", padding: "10px 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Club de Inversión Familiar" className="w-60" /></div><h1 className="mb-1">Entrar</h1>
        <p className="text-sm text-slate-500 mb-6">Aprende, invierte y crece en familia.</p>
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
        </form>
        <p className="text-sm text-slate-500 mt-6 text-center">
          ¿Sin cuenta? <Link href="/registro" className="text-indigo-600 font-medium">Regístrate</Link>
        </p>
      </div>
    </main>
  );
}
