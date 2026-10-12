import Link from "next/link";
import { safeHref } from "@/lib/validation";
import type { ClubRecommendation } from "@/lib/club";
import { CRYPTO_DISCLAIMER, DISCLAIMER, recommendationMarkdown } from "@/lib/recommend";
import { CopyButton } from "./CopyButton";
import { fmtDate } from "@/lib/format";
import { priceDecimals } from "@/lib/fmtPrice";

/** Etiqueta de acción con el estilo del sistema: COMPRAR relleno acento, MANTENER borde acento, VENDER fondo oscuro. */
export function ActionBadge({ action, small = false }: { action: string; small?: boolean }) {
  const style =
    action === "COMPRAR"
      ? { background: "linear-gradient(135deg, #10b981, #059669)", color: "#ffffff", border: "1px solid transparent" }
      : action === "VENDER"
        ? { background: "#0e2138", color: "#f8fafc", border: "1px solid #0e2138" }
        : { background: "var(--color-amber-100)", color: "var(--color-amber-700)", border: "1px solid #e5a016" };
  return (
    <span className="inline-flex items-center font-heading" style={{ ...style, fontSize: small ? 11 : 16, letterSpacing: "0.04em", padding: small ? "2px 10px" : "5px 16px", lineHeight: 1.3, borderRadius: 999, fontWeight: 800 }}>
      {action}
    </span>
  );
}

const LESSON_BY_BLOCK: Record<string, string> = {
  trend: "/academia/analisis-tecnico/tendencia-y-medias",
  momentum: "/academia/analisis-tecnico/rsi-y-momentum",
  volume: "/academia/analisis-tecnico/volumen",
  structure: "/academia/analisis-tecnico/soportes-y-resistencias",
};

const f = (v: number | null, d?: number) => (v === null ? "N/D" : v.toLocaleString("es-ES", { minimumFractionDigits: d ?? priceDecimals(v), maximumFractionDigits: d ?? priceDecimals(v) }));
const sg = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v < 0 ? `−${Math.abs(v).toFixed(2)}` : "0,00");
const toneOf = (v: number) => (v > 0 ? "var(--color-accent-700)" : "var(--color-text)");

/** Ficha completa de la Recomendación del Club con el formato acordado. */
export function ClubRecommendationCard({ r }: { r: ClubRecommendation }) {
  const cur = r.currency;
  return (
    <section className="card blueprint gap-4" style={{ padding: 24, borderColor: "var(--color-accent)" }}>
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <div className="card-kicker text-[11px] font-medium">Recomendación del Club de inversión</div>
          <div className="text-[14px] mt-1"><b>[{r.ticker}] – {r.name}</b> | Precio: {f(r.price)} {cur} | Fecha datos: {fmtDate(r.dataDate)}</div>
          {r.isCrypto ? (
            <div className="text-xs text-neutral-700 mt-0.5">
              Criptomoneda · {r.cryptoRank !== null ? `puesto #${r.cryptoRank} por capitalización · ` : ""}mercado 24/7
              {r.fearGreed && <> · Miedo y codicia: <b className="text-ink">{r.fearGreed.value} ({r.fearGreed.labelEs.toLowerCase()})</b></>}
            </div>
          ) : r.profile.isFund ? (
            <div className="text-xs text-neutral-700 mt-0.5">Fondo cotizado · Gestora: {r.profile.fundFamily ?? "N/D"} · TER: {r.profile.expenseRatio === null ? "N/D" : `${(r.profile.expenseRatio * 100).toFixed(2)} %`} · Beta: {r.beta === null ? "N/D" : r.beta.toFixed(2)}</div>
          ) : (
            <div className="text-xs text-neutral-700 mt-0.5">
              Sector: {r.sector ?? "N/D"}{r.industry ? ` (${r.industry})` : ""} · Beta: {r.beta === null ? "N/D" : r.beta.toFixed(2)} · Próximos resultados: {r.earningsDate ? fmtDate(r.earningsDate) : "N/D"}
              {r.daysToEarnings !== null && r.daysToEarnings >= 0 && <b className="text-ink"> (en {r.daysToEarnings} días)</b>}
            </div>
          )}
        </div>
        <CopyButton text={recommendationMarkdown(r)} label="Copiar ficha" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ActionBadge action={r.action} />
        <span className="text-[15px]">{r.bias}</span>
        <span className="text-[13px] text-neutral-700">Confianza: <b className="text-ink">{r.confidence}</b> · Horizonte: <b className="text-ink">{r.horizon}</b>{r.since ? ` · desde ${fmtDate(r.since)}${r.previousAction ? ` (antes ${r.previousAction})` : ""}` : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Bloque</th><th className="text-right">Puntuación</th><th>Lectura clave</th><th /></tr></thead>
          <tbody>
            {r.blocks.map((b) => (
              <tr key={b.key}>
                <td className="whitespace-nowrap">{b.label} <span className="text-xs text-neutral-600">({Math.round(b.weight * 100)} %{b.available < b.total ? ` · ${b.available}/${b.total} datos` : ""})</span></td>
                <td className="text-right tabular-nums font-bold" style={{ color: toneOf(b.score) }}>{sg(b.score)}</td>
                <td className="text-neutral-800">{b.note}</td>
                <td className="text-right"><Link href={LESSON_BY_BLOCK[b.key] ?? "/academia"} className="btn-ghost text-xs whitespace-nowrap">¿Qué mide?</Link></td>
              </tr>
            ))}
            <tr className="font-bold">
              <td style={{ borderTop: "1px solid var(--color-divider)" }}>Total ponderado</td>
              <td className="text-right tabular-nums" style={{ borderTop: "1px solid var(--color-divider)", color: toneOf(r.total) }}>{sg(r.total)}</td>
              <td colSpan={2} className="font-normal text-[13px] text-neutral-700" style={{ borderTop: "1px solid var(--color-divider)" }}>{r.notes.join(" ") || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
        <div>
          <h5 className="m-0 mb-1.5 text-[18px]">Plan de operación</h5>
          <div className="grid gap-x-4 gap-y-1 text-[14px]" style={{ gridTemplateColumns: "auto 1fr" }}>
            <span className="text-neutral-700">Zona de entrada</span><b>{r.plan.entryLow !== null && r.plan.entryHigh !== null ? `${f(r.plan.entryLow)} – ${f(r.plan.entryHigh)} ${cur}` : "no abrir posiciones nuevas"}</b>
            <span className="text-neutral-700">Stop loss</span><span><b>{f(r.plan.stop)} {r.plan.stop !== null ? cur : ""}</b> <span className="text-xs text-neutral-700">({r.plan.stopReason})</span></span>
            <span className="text-neutral-700">Objetivo 1 / 2</span><b>{f(r.plan.target1)} / {f(r.plan.target2)} {cur}</b>
            <span className="text-neutral-700">Riesgo/beneficio</span><b>{r.plan.rr === null ? "N/D" : `1:${r.plan.rr.toFixed(1)}`}</b>
            <span className="text-neutral-700">Invalidación</span><span>{r.plan.invalidation}</span>
          </div>
        </div>
        <div>
          <h5 className="m-0 mb-1.5 text-[18px]">Tesis en 3 líneas</h5>
          <ol className="m-0 pl-5 text-[14px] flex flex-col gap-0.5">
            {r.thesis.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
          <h5 className="mt-3 mb-1.5 text-[18px]">Riesgos principales</h5>
          <ul className="m-0 pl-5 text-[14px] flex flex-col gap-0.5">
            {r.risks.length === 0 ? <li className="list-none -ml-5 text-neutral-700">Sin riesgos técnicos destacados con los datos actuales.</li> : r.risks.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>

      <CompanyAndNews r={r} />

      {r.history.length > 1 && (
        <div className="text-xs text-neutral-700">
          Historial: {r.history.slice(-10).map((h) => `${h.date.slice(5)} ${h.action[0]}${h.score >= 0 ? "+" : "−"}${Math.abs(h.score).toFixed(1)}`).join(" · ")}
          <span className="text-neutral-600"> (C = comprar, M = mantener, V = vender)</span>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-3 items-center border-t border-divider pt-3">
        <p className="m-0 text-xs italic text-neutral-700 max-w-[70ch]">{DISCLAIMER}{r.isCrypto ? ` ${CRYPTO_DISCLAIMER}` : ""}</p>
        <span className="text-xs text-neutral-700">Para entender esta ficha: <Link href="/academia/analisis-tecnico/tendencia-y-medias" className="btn-ghost text-xs">Nivel 5 · Análisis técnico</Link></span>
      </div>
    </section>
  );
}

const compactEur = (n: number) => `${new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(n)} €`;
const compactNum = (n: number) => new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 2 }).format(n);
const priceEur = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 })} €`;
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} %`;

/** Ficha de la criptomoneda: capitalización, oferta, máximo histórico y descripción (CoinGecko). */
function CryptoBlock({ r }: { r: ClubRecommendation }) {
  const c = r.crypto!;
  return (
    <div>
      <h5 className="m-0 mb-1.5 text-[18px]">La criptomoneda</h5>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 mb-2">
        {c.rank !== null && <span>Puesto: <b className="text-ink">#{c.rank}</b></span>}
        {c.marketCap !== null && <span>Capitalización: <b className="text-ink">{compactEur(c.marketCap)}</b></span>}
        {c.volume24h !== null && <span>Volumen 24 h: <b className="text-ink">{compactEur(c.volume24h)}</b></span>}
        {c.circulatingSupply !== null && <span>Oferta circulante: <b className="text-ink">{compactNum(c.circulatingSupply)} {c.symbol}</b>{c.maxSupply ? ` de ${compactNum(c.maxSupply)} como máximo` : " (sin máximo fijo)"}</span>}
        {c.ath !== null && <span>Máximo histórico: <b className="text-ink">{priceEur(c.ath)}</b>{c.athDate ? ` (${fmtDate(c.athDate)})` : ""}{c.athChange !== null ? `, hoy ${signedPct(c.athChange)}` : ""}</span>}
        {c.change30d !== null && <span>30 días: <b className="text-ink">{signedPct(c.change30d)}</b></span>}
        {c.change1y !== null && <span>1 año: <b className="text-ink">{signedPct(c.change1y)}</b></span>}
        {c.hashingAlgorithm && <span>Algoritmo: <b className="text-ink">{c.hashingAlgorithm}</b></span>}
        {c.genesisDate && <span>Creación: <b className="text-ink">{fmtDate(c.genesisDate)}</b></span>}
        {safeHref(c.website) && <a href={safeHref(c.website)} target="_blank" rel="noopener noreferrer">Web</a>}
      </div>
      {c.categories.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{c.categories.map((t) => <span key={t} className="tag tag-neutral">{t}</span>)}</div>}
      {c.description && <p className="m-0 text-xs text-neutral-800 leading-relaxed">{c.description.length > 600 ? c.description.slice(0, 600).replace(/\s\S*$/, "") + "…" : c.description}</p>}
      <p className="m-0 text-[11px] text-neutral-600 mt-2">Datos de CoinGecko; la descripción está en inglés.</p>
    </div>
  );
}

const compact = (n: number, cur: string) => `${new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 }).format(n)} ${cur}`;
const IMPACT_MARK: Record<string, string> = { favorable: "▲", desfavorable: "▼", neutral: "•" };

/** Perfil de la empresa o del fondo y lectura de las últimas noticias. */
function CompanyAndNews({ r }: { r: ClubRecommendation }) {
  const p = r.profile;
  const d = r.newsDigest;
  const hasProfile = p.description || p.marketCap || p.trailingPE || p.dividendYield || p.fundFamily || p.totalAssets;
  if (!hasProfile && !d && !r.crypto) return null;
  return (
    <div className="grid gap-6 border-t border-divider pt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
      {r.crypto && <CryptoBlock r={r} />}
      {hasProfile && p.isFund && (
        <div>
          <h5 className="m-0 mb-1.5 text-[18px]">El fondo</h5>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 mb-2">
            {p.fundFamily && <span>Gestora: <b className="text-ink">{p.fundFamily}</b></span>}
            {p.fundCategory && <span>Categoría: <b className="text-ink">{p.fundCategory}</b></span>}
            {p.expenseRatio !== null && <span>TER: <b className="text-ink">{(p.expenseRatio * 100).toFixed(2)} %</b></span>}
            {p.totalAssets !== null && <span>Patrimonio: <b className="text-ink">{compact(p.totalAssets, r.currency)}</b></span>}
            {p.dividendYield !== null && <span>Dividendo: <b className="text-ink">{(p.dividendYield * (p.dividendYield > 1 ? 1 : 100)).toFixed(2)} %</b></span>}
          </div>
          {p.topHoldings.length > 0 && (
            <div className="mb-2">
              <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700 mb-1">Principales posiciones</div>
              <ul className="text-xs text-neutral-800 grid grid-cols-2 gap-x-3 gap-y-0.5 list-none m-0 p-0">
                {p.topHoldings.slice(0, 10).map((h) => (
                  <li key={h.symbol || h.name} className="flex justify-between gap-2"><span className="truncate">{h.name}</span><span className="tabular-nums">{(h.weight * 100).toFixed(1)} %</span></li>
                ))}
              </ul>
            </div>
          )}
          {p.sectorWeights.length > 0 && (
            <div className="mb-2">
              <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700 mb-1">Sectores</div>
              <div className="flex flex-col gap-1">
                {p.sectorWeights.slice(0, 6).map((s) => (
                  <div key={s.sector} className="flex items-center gap-2 text-xs text-neutral-800">
                    <span className="w-28 truncate">{s.sector}</span>
                    <div className="bar flex-1"><span style={{ width: `${Math.min(s.weight * 100, 100)}%` }} /></div>
                    <span className="w-12 text-right tabular-nums">{(s.weight * 100).toFixed(1)} %</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {p.description && <p className="m-0 text-xs text-neutral-800 leading-relaxed">{p.description.length > 400 ? p.description.slice(0, 400).replace(/\s\S*$/, "") + "…" : p.description}</p>}
        </div>
      )}
      {hasProfile && !p.isFund && !r.isCrypto && (
        <div>
          <h5 className="m-0 mb-1.5 text-[18px]">La empresa</h5>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 mb-2">
            {p.marketCap !== null && <span>Capitalización: <b className="text-ink">{compact(p.marketCap, r.currency)}</b></span>}
            {p.trailingPE !== null && <span>PER: <b className="text-ink">{p.trailingPE.toFixed(1)}</b>{p.forwardPE !== null ? ` (est. ${p.forwardPE.toFixed(1)})` : ""}</span>}
            {p.dividendYield !== null && <span>Dividendo: <b className="text-ink">{(p.dividendYield * (p.dividendYield > 1 ? 1 : 100)).toFixed(2)} %</b></span>}
            {p.employees !== null && <span>Empleados: <b className="text-ink">{p.employees.toLocaleString("es-ES")}</b></span>}
            {p.country && <span>País: <b className="text-ink">{p.country}</b></span>}
            {safeHref(p.website) && <a href={safeHref(p.website)} target="_blank" rel="noopener noreferrer">Web</a>}
          </div>
          {p.description && <p className="m-0 text-xs text-neutral-800 leading-relaxed">{p.description.length > 600 ? p.description.slice(0, 600).replace(/\s\S*$/, "") + "…" : p.description}</p>}
        </div>
      )}
      {d && (
        <div>
          <h5 className="m-0 mb-1.5 text-[18px]">Qué dicen las noticias</h5>
          <p className="m-0 mb-2 text-xs text-neutral-700"><span className="tag tag-neutral mr-1">tono {d.tone}</span>{d.summary}</p>
          {r.newsGeneral && <p className="m-0 mb-2 text-xs text-amber-700">No hay titulares recientes específicos de {r.name.replace(/\s+(EUR|USD)$/i, "")}: se muestran noticias del mercado cripto en general.</p>}
          {d.items.length > 0 && (
            <ul className="text-[14px] flex flex-col gap-1 list-none m-0 p-0">
              {d.items.slice(0, 6).map((n) => (
                <li key={n.id} className="flex items-start gap-2">
                  <span className="shrink-0 w-4 text-accent-700" title={n.matched.length ? `claves: ${n.matched.join(", ")}` : "sin palabras clave"}>{IMPACT_MARK[n.impact]}</span>
                  <div>
                    <a href={safeHref(n.link)} target="_blank" rel="noopener noreferrer" className="text-ink no-underline leading-snug hover:text-accent-700">{n.title}</a>
                    <div className="text-[11px] text-neutral-600">{n.publisher} · {fmtDate(n.publishedAt)}{n.themes.length ? ` · ${n.themes.join(", ")}` : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-[11px] text-neutral-600 mt-2">Clasificación automática por palabras clave del titular; el tono de las noticias no altera la puntuación técnica, solo se añade como contexto y riesgo.{r.isCrypto ? " Fuentes: Cointelegraph, CoinDesk, Decrypt, Bitcoin Magazine, CriptoNoticias y Yahoo Finance." : ""}</p>
        </div>
      )}
    </div>
  );
}
