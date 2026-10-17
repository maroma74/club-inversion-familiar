"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const INTERVAL_MIN = 3;

/**
 * Vuelve a pedir la página (y con ella las cotizaciones) cada tres minutos, y permite forzarlo con un botón.
 * `renderedAt` es la hora (ms) en que el servidor generó los datos: el texto dice la antigüedad real y no un
 * contador que arranca al cargar. Sin él, cuenta desde que se abrió la pantalla.
 */
export function AutoRefresh({ renderedAt }: { renderedAt?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [base, setBase] = useState(renderedAt ?? 0);
  const [now, setNow] = useState(renderedAt ?? 0);
  const [failed, setFailed] = useState(false);
  const waiting = useRef<number | null>(null);

  // Al montar (y cuando el servidor trae datos nuevos) se fija la referencia; el reloj avanza cada 30 s.
  useEffect(() => {
    const t0 = renderedAt ?? Date.now();
    setBase(t0);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [renderedAt]);

  // Si tras actualizar los datos no cambian (la hora del servidor es la misma), se avisa del fallo.
  useEffect(() => {
    if (!pending && waiting.current !== null) {
      setFailed(renderedAt !== undefined && renderedAt === waiting.current);
      waiting.current = null;
    }
  }, [pending, renderedAt]);

  function refresh() {
    setFailed(false);
    waiting.current = renderedAt ?? null;
    if (renderedAt === undefined) setBase(Date.now());
    start(() => router.refresh());
  }

  const minutes = Math.max(0, Math.floor((now - base) / 60_000));

  useEffect(() => {
    if (minutes >= INTERVAL_MIN && !pending && document.visibilityState === "visible") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  return (
    <div className="flex items-center gap-3 text-sm text-neutral-700">
      <span aria-live="polite">
        {pending ? "Actualizando…" : failed ? "No se pudieron actualizar los precios." : minutes < 1 ? "Precios al día" : `Precios actualizados hace ${minutes} min`}
      </span>
      <button type="button" className="btn-secondary" disabled={pending} onClick={refresh}>
        ↻ Actualizar
      </button>
    </div>
  );
}
