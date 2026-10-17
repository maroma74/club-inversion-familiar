import { signed } from "@/lib/format";

/**
 * Barra de la puntuación de la Recomendación del Club (de −2 a +2): la zona central (±0,3) es neutral y a
 * partir de ±1 se propone actuar. Enseña hacia dónde se inclina un valor aunque el veredicto sea «mantener».
 */
export function ScoreBar({ total, blocks, size = "sm" }: { total: number; blocks?: { label: string; score: number; weight: number }[]; size?: "sm" | "lg" }) {
  const clamp = Math.max(-2, Math.min(2, total));
  const pos = ((clamp + 2) / 4) * 100; // 0 % = −2, 50 % = 0, 100 % = +2
  const tone = total >= 0.3 ? "var(--color-accent-700)" : total <= -0.3 ? "var(--color-ink)" : "#e5a016";
  const title = blocks ? blocks.map((b) => `${b.label} ${signed(b.score, 2)} (×${b.weight})`).join(" · ") : undefined;
  const h = size === "lg" ? 10 : 6;
  return (
    <div className={size === "lg" ? "flex flex-col gap-1" : "inline-flex flex-col gap-0.5"} style={{ width: size === "lg" ? "100%" : 84, maxWidth: size === "lg" ? 420 : undefined }} title={title} role="img" aria-label={`Puntuación ${signed(total, 2)} de ±2`}>
      <div className="relative w-full rounded-full" style={{ height: h, background: "linear-gradient(90deg, var(--color-ink) 0 25%, var(--color-divider) 25% 42.5%, #fde68a 42.5% 57.5%, var(--color-divider) 57.5% 75%, var(--color-accent-400) 75% 100%)" }}>
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos}%`, width: h + 6, height: h + 6, background: tone, boxShadow: "0 0 0 2px var(--color-surface, #fff)" }} />
      </div>
      {size === "lg" && (
        <div className="flex justify-between text-[11px] text-neutral-700 tabular-nums"><span>−2 vender</span><span>−1</span><span>neutral</span><span>+1</span><span>comprar +2</span></div>
      )}
    </div>
  );
}

/** Texto del sesgo para el veredicto «mantener»: inclinación alcista, bajista o neutral de verdad. */
export function tiltLabel(action: string, total: number): string {
  if (action === "COMPRAR") return "Favorable";
  if (action === "VENDER") return "Desfavorable";
  if (total >= 0.3) return "▲ Sesgo alcista";
  if (total <= -0.3) return "▼ Sesgo bajista";
  return "Neutral";
}
