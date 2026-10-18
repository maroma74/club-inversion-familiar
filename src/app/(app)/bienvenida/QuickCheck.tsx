"use client";

import { useState } from "react";

const OPTIONS = [
  { id: "money", label: "Quien más dinero ha ganado ese mes", right: false, reply: "Casi: el dinero se mira, pero en un mes manda mucho la suerte. Lo que se premia es otra cosa." },
  { id: "why", label: "Quien mejor ha explicado su decisión", right: true, reply: "Exacto. Acertar puede ser suerte; explicar bien por qué eliges algo es lo que te hace mejor inversor, y eso no se pierde aunque un mes salga mal." },
  { id: "first", label: "Quien decide antes", right: false, reply: "No hay prisa: tienes hasta el plazo. Mejor pensarlo bien que decidir el primero." },
];

/** Pregunta rápida con respuesta inmediata: refuerza la idea central del club (gana el mejor porqué). */
export function QuickCheck() {
  const [picked, setPicked] = useState<string | null>(null);
  const choice = OPTIONS.find((o) => o.id === picked);
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-2.5">
      <legend className="font-heading font-bold text-[17px] mb-2">Pregunta rápida: en el repaso de cada mes, ¿quién gana?</legend>
      {OPTIONS.map((o) => (
        <label key={o.id} className={`welcome-option ${picked === o.id ? (o.right ? "is-right" : "is-wrong") : ""}`}>
          <input type="radio" name="quick-check" value={o.id} checked={picked === o.id} onChange={() => setPicked(o.id)} />
          <span>{o.label}</span>
        </label>
      ))}
      <p role="status" className={`m-0 text-sm min-h-[20px] [text-wrap:pretty] ${choice?.right ? "text-accent-700" : ""}`} style={choice && !choice.right ? { color: "var(--color-amber-700)" } : undefined}>{choice?.reply ?? ""}</p>
    </fieldset>
  );
}
