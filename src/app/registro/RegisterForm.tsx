"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction } from "@/app/actions/auth";
import { NewPasswordFields } from "@/components/NewPasswordFields";

export type Preview =
  | { error: string }
  | { familyName: string; name: string | null; email: string | null; role: string; personal: boolean; approval?: boolean; newFamily?: boolean; invitingFamily?: string };

export function RegisterForm({ initialCode, preview, allowCreate = true }: { initialCode: string; preview: Preview | null; allowCreate?: boolean }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [mode, setMode] = useState<"create" | "join">(initialCode ? "join" : "join");
  const ok = preview && !("error" in preview) ? preview : null;

  // Solo la tarjeta: la página de registro la coloca junto a la presentación del Club.
  return (
      <div id="registro" className="card lp-login w-full">
        <h2 className="lp-login-title">{ok?.newFamily ? "Crea el club de tu familia" : ok ? `Entrar en ${ok.familyName}` : "Crear cuenta"}</h2>
        <p className="lp-login-sub">{ok?.newFamily ? "Un minuto: el nombre de tu familia, el tuyo y una contraseña." : "Únete a tu familia con el código de invitación o crea una familia nueva."}</p>

        {ok && (
          <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
            {ok.newFamily ? (
              <>
                <b>Invitación de {ok.invitingFamily}</b> para crear el club de inversión de tu familia{ok.name ? `, a nombre de ${ok.name}` : ""}. Serás su presidente, invitarás a tu familia y tendrás cinco invitaciones para otras familias.
                {ok.email && <div className="text-xs text-slate-600 mt-1">Regístrate con el email {ok.email}.</div>}
              </>
            ) : ok.personal ? (
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
            <>
              <div>
                <label className="label" htmlFor="inviteCode">Código de invitación</label>
                <input id="inviteCode" name="inviteCode" required defaultValue={initialCode} readOnly={!!ok} className={`input uppercase tracking-widest ${ok ? "bg-slate-50 text-slate-500" : ""}`} placeholder="ABCD2345" />
              </div>
              {ok?.newFamily && (
                <div>
                  <label className="label" htmlFor="familyName">Nombre de tu familia</label>
                  <input id="familyName" name="familyName" required className="input" placeholder="Familia García" maxLength={60} />
                </div>
              )}
            </>
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
          <NewPasswordFields idPrefix="reg" inline />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Creando…" : mode === "create" || ok?.newFamily ? "Crear mi familia y entrar" : ok?.approval ? "Solicitar entrada" : "Unirme y entrar"}</button>
        </form>
        <p className="text-sm text-slate-500 mt-6 text-center">
          ¿Ya tienes cuenta? <Link href="/login" className="text-indigo-600 font-medium">Inicia sesión</Link>
        </p>
      </div>
  );
}
