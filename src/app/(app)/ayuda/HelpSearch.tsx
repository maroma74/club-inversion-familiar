"use client";

import { useEffect, useState } from "react";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Buscador de la ayuda: oculta los apartados (`[data-help]`) que no contienen el texto buscado, sin tildes ni
 * mayúsculas. Sin JavaScript la ayuda se ve entera, así que el buscador es solo un atajo.
 */
export function HelpSearch() {
  const [q, setQ] = useState("");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>("[data-help]")];
    const needle = norm(q.trim());
    let shown = 0;
    for (const el of items) {
      const hit = !needle || norm(el.textContent ?? "").includes(needle);
      el.hidden = !hit;
      if (hit) shown++;
    }
    for (const g of document.querySelectorAll<HTMLElement>("[data-help-group]")) {
      g.hidden = !!needle && ![...g.querySelectorAll<HTMLElement>("[data-help]")].some((el) => !el.hidden);
    }
    setCount(needle ? shown : null);
  }, [q]);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="ayuda-buscar" className="label">Buscar en la ayuda</label>
      <input id="ayuda-buscar" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="input max-w-[420px]" placeholder="PER, plazo, WhatsApp, paga…" autoComplete="off" />
      <p className="m-0 text-xs text-neutral-700 min-h-[18px]" role="status">{count === null ? "" : count === 0 ? "No hay ningún apartado con ese texto." : `${count} ${count === 1 ? "apartado" : "apartados"} con «${q.trim()}».`}</p>
    </div>
  );
}
