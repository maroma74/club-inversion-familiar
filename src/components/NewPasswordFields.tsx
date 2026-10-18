"use client";

import { useEffect, useRef, useState } from "react";
import { PasswordInput } from "./PasswordInput";

/**
 * Contraseña nueva escrita dos veces, cada una con su ojo. Avisa mientras se escribe si no coinciden o si es
 * demasiado corta, y bloquea el envío del formulario hasta que las dos cajas sean iguales (el servidor lo vuelve
 * a comprobar). Los nombres de campo son `password` y `confirm`.
 */
export function NewPasswordFields({ idPrefix = "pw", label = "Contraseña", confirmLabel = "Repite la contraseña", inline = false }: { idPrefix?: string; label?: string; confirmLabel?: string; inline?: boolean }) {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);
  const tooShort = pw.length > 0 && pw.length < 10;
  const mismatch = again.length > 0 && pw !== again;
  const match = again.length > 0 && pw === again && pw.length >= 10;

  // El navegador no deja enviar mientras la repetición no coincida (y muestra este mensaje en la caja)
  useEffect(() => {
    confirmRef.current?.setCustomValidity(pw !== again ? "Las dos contraseñas no coinciden" : "");
  }, [pw, again]);

  const first = (
    <div className="field">
      <label className="label" htmlFor={`${idPrefix}-password`}>{label}</label>
      <PasswordInput id={`${idPrefix}-password`} name="password" required minLength={10} maxLength={72} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-describedby={`${idPrefix}-password-hint`} />
      <p id={`${idPrefix}-password-hint`} className={`m-0 mt-1 text-xs ${tooShort ? "pw-hint-bad" : "text-slate-500"}`}>{tooShort ? `Faltan ${10 - pw.length} ${10 - pw.length === 1 ? "carácter" : "caracteres"}: al menos 10.` : "Al menos 10 caracteres."}</p>
    </div>
  );
  const second = (
    <div className="field">
      <label className="label" htmlFor={`${idPrefix}-confirm`}>{confirmLabel}</label>
      <PasswordInput ref={confirmRef} id={`${idPrefix}-confirm`} name="confirm" required minLength={10} maxLength={72} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-describedby={`${idPrefix}-confirm-hint`} aria-invalid={mismatch || undefined} />
      <p id={`${idPrefix}-confirm-hint`} role="status" className={`m-0 mt-1 text-xs min-h-[16px] ${mismatch ? "pw-hint-bad" : match ? "pw-hint-ok" : "text-slate-500"}`}>{mismatch ? "No coinciden: escribe exactamente la misma contraseña." : match ? "Coinciden." : "Escríbela otra vez para evitar errores."}</p>
    </div>
  );
  return inline ? <>{first}{second}</> : <div className="space-y-4">{first}{second}</div>;
}
