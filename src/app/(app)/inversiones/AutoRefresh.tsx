"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const INTERVAL_S = 60;

/** Vuelve a pedir la página (y con ella las cotizaciones) cada minuto, y permite forzarlo con un botón. */
export function AutoRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (seconds >= INTERVAL_S && !pending && document.visibilityState === "visible") {
      start(() => router.refresh());
      setSeconds(0);
    }
  }, [seconds, pending, router]);

  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span>{pending ? "Actualizando…" : `Precios actualizados hace ${seconds} s`}</span>
      <button
        type="button"
        className="btn-secondary py-1"
        disabled={pending}
        onClick={() => {
          start(() => router.refresh());
          setSeconds(0);
        }}
      >
        ↻ Actualizar
      </button>
    </div>
  );
}
