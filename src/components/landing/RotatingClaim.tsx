"use client";

import { useEffect, useState } from "react";

/** Los claims de la campaña, en el orden en que rotan. */
export const CLAIMS = [
  "Aprended a invertir juntos. Con la paga, sin prisas y con un porqué.",
  "Pequeñas cantidades. Grandes conversaciones en la cena.",
  "Enséñales a invertir antes de que alguien les enseñe a apostar.",
];

/**
 * Muestra un claim y pasa al siguiente cada pocos segundos con un fundido. El primero se pinta en el servidor,
 * así que sin JavaScript (o con «reducir movimiento») se queda fijo y la página sigue teniendo sentido.
 */
export function RotatingClaim({ intervalMs = 6000, className = "" }: { intervalMs?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIndex((i) => (i + 1) % CLAIMS.length); setVisible(true); }, 450);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return (
    <span className={`lp-claim-rotate ${className}`} data-visible={visible ? "true" : "false"} aria-live="off">
      {CLAIMS[index]}
    </span>
  );
}
