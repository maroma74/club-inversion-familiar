"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

/**
 * Campo de contraseña con el botón del ojo para ver lo que se escribe. Al enviar el formulario vuelve a ocultarse
 * (el navegador no debe recordar la contraseña como texto visible). Acepta los mismos atributos que un <input>.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput({ className = "", ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="pw-field">
      <input ref={ref} {...props} type={visible ? "text" : "password"} className={`input pw-input ${className}`} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
        aria-pressed={visible}
        aria-controls={props.id}
        title={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.4 9.5 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.5 8 3.1 10 2.5 12c1 2.6 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 12C3.5 9.4 7 5 12 5s8.5 4.4 9.5 7c-1 2.6-4.5 7-9.5 7s-8.5-4.4-9.5-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
});
