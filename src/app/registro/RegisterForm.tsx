"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction } from "@/app/actions/auth";

export type Preview =
  | { error: string }
  | { familyName: string; name: string | null; email: string | null; role: string; personal: boolean; approval?: boolean };

export function RegisterForm({ initialCode, preview, allowCreate = true }: { initialCode: string; preview: Preview | null; allowCreate?: boolean }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [mode, setMode] = useState<"create" | "join">(initialCode ? "join" : "join");
  const ok = preview && !("error" in preview) ? preview : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="inline-block rounded-xl mb-4" style={{ background: "#0e2138", padding: "10px 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Club de Inversión Familiar" className="w-60" /></div><h1 className="mb-1">Crear cuenta</h1>
        <p className="text-sm text-slate-500 mb-6">Únete a tu familia con el código de invitación o crea una familia nueva.</p>

        {ok && (
          <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
            {ok.personal ? (
              <>
                <b>Invitación personal</b> para entrar en <b>{ok.familyName}</b>{ok.name ? ` a nombre de ${ok.name}` : ""}{ok.role === "ADMIN" ? " como presidente del club" : ""}.
                {ok.email && <div className="text-xs text-slate-600 mt-1">Regístrate con el email {ok.email}.</div>}
              </>
            ) : (
              <>
                Código general de <b>{ok.familyName}</b>.{ok.approval && <div className="text-xs text-slate-600 mt-1">Tu entrada quedará pendiente hasta que el presidente del club la apruebe.</div>}
              </>
            )}
          </div>
        )}
        {preview && "error" in preview && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{preview.error}</p>}

        {!ok && allowCreate && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button type="button" onClick={() => setMode("join")} className={mode === "join" ? "btn-primary" : "btn-secondary"}>
              Tengo un código
            </button>
            <button type="button" onClick={() => setMode("create")} className={mode === "create" ? "btn-primary" : "btn-secondary"}>
              Crear familia
            </button>
          </div>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          {mode === "join" ? (
            <div>
              <label className="label" htmlFor="inviteCode">Código de invitación</label>
              <input id="inviteCode" name="inviteCode" required defaultValue={initialCode} readOnly={!!ok} className={`input uppercase tracking-widest ${ok ? "bg-slate-50 text-slate-500" : ""}`} placeholder="ABCD2345" />
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="familyName">Nombre de la familia</label>
              <input id="familyName" name="familyName" required className="input" placeholder="Familia García" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="name">Tu nombre</label>
            <input id="name" name="name" required defaultValue={ok?.name ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required defaultValue={ok?.email ?? ""} className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={6} className="input" autoComplete="new-password" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Creando…" : mode === "create" ? "Crear familia y entrar" : ok?.approval ? "Solicitar entrada" : "Unirme y entrar"}</button>
        </form>
        <p className="text-sm text-slate-500 mt-6 text-center">
          ¿Ya tienes cuenta? <Link href="/login" className="text-indigo-600 font-medium">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}
