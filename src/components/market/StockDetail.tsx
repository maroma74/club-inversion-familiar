import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { fetchHistory, isRange, RANGE_LABEL, RANGE_SESSIONS, type Range, type WatchKind } from "@/lib/stocks";
import { analyze, type Verdict } from "@/lib/technical";
import { getClubRecommendation } from "@/lib/club";
import { eur } from "@/lib/format";
import { ClubRecommendationCard } from "@/components/ClubRecommendationCard";
import { DiaryDialog } from "@/components/DiaryDialog";
import { StockChart } from "@/app/(app)/acciones/[symbol]/StockChart";

const RANGES: Range[] = ["3m", "6m", "1y", "2y", "5y"];

const tone = (v: Verdict) => (v === "alcista" ? "border-accent-400 bg-accent-100" : v === "bajista" ? "border-neutral-800" : "border-divider");
const dot = (v: Verdict) => (v === "alcista" ? "▲" : v === "bajista" ? "▼" : "•");
const Pct = ({ v, d = 1 }: { v: number | null; d?: number }) => (v === null ? <span className="text-neutral-500">—</span> : <span className="tabular-nums font-medium" style={{ color: v >= 0 ? "var(--color-accent-700)" : "var(--color-text)" }}>{v >= 0 ? "+" : "−"}{(Math.abs(v) * 100).toFixed(d)} %</span>);

export async function StockDetail({ symbol: rawSymbol, range: rawRange, kind }: { symbol: string; range?: string; kind: WatchKind }) {
  await requireUser();
  const base = kind === "ETF" ? "/etf" : "/acciones";
  const symbol = decodeURIComponent(rawSymbol).toUpperCase();
  const range: Range = isRange(rawRange) ? rawRange : "1y";
  const [hist, club] = await Promise.all([fetchHistory(symbol, range), symbol.startsWith("^") ? Promise.resolve(null) : getClubRecommendation(symbol, { withNews: true })]);
  if (!hist) notFound();

  const a = analyze(hist.candles);
  const points = a.points.slice(-RANGE_SESSIONS[range]);
  const cur = hist.currency === "GBp" ? "GBX" : hist.currency;
  const fmt = (n: number | null, d = 2) => (n === null ? "—" : cur === "EUR" ? eur(n, d) : `${n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })} ${cur}`);
  const isIndex = symbol.startsWith("^");
  const distance = (lvl: number | null) => (lvl === null ? null : lvl / a.last - 1);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="card-kicker text-[11px]">{kind === "ETF" ? "ETF" : "Acciones"} · {hist.exchange}</div>
          <h1 className="mt-1 mb-0.5">{hist.name} <span className="text-neutral-600 font-normal">{hist.symbol}</span></h1>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="figure text-[36px]">{fmt(a.last)}</span>
            <span className="text-[15px]" style={{ color: a.change1d >= 0 ? "var(--color-accent-700)" : "var(--color-text)" }}>{a.change1d >= 0 ? "▲" : "▼"} {a.change1d >= 0 ? "+" : "−"}{Math.abs(a.last - a.prevClose).toLocaleString("es-ES", { maximumFractionDigits: 2 })} ({a.change1d >= 0 ? "+" : "−"}{(Math.abs(a.change1d) * 100).toFixed(2)} %)</span>
            <span className="text-xs text-neutral-700">cierre anterior {fmt(a.prevClose)} · datos con hasta 15 min de retraso</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Link href={base} className="btn-ghost">← {kind === "ETF" ? "ETF" : "Acciones"}</Link>
          <Link href={`${base}/ranking`} className="btn-secondary">Ranking del Club</Link>
          {!isIndex && <DiaryDialog label="Añadir al diario" symbol={hist.symbol} side="NOTE" />}
          {!isIndex && <Link href={`/operaciones?activo=${encodeURIComponent(hist.symbol)}#operar`} className="btn-primary blueprint">Operar</Link>}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        <div className="card blueprint gap-1 col-span-2" style={{ padding: "14px 18px" }}>
          <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">Lectura técnica global</div>
          <div className="font-heading text-[26px] capitalize">{a.overall}</div>
          <div className="text-xs text-neutral-700">{a.signals.filter((s) => s.verdict === "alcista").length} señales alcistas · {a.signals.filter((s) => s.verdict === "bajista").length} bajistas · {a.signals.filter((s) => s.verdict === "neutral").length} neutrales</div>
        </div>
        <div className="card blueprint gap-1" style={{ padding: "14px 18px" }}><div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">1 semana</div><div className="font-heading text-[26px]"><Pct v={a.returns["1w"]} /></div></div>
        <div className="card blueprint gap-1" style={{ padding: "14px 18px" }}><div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">1 mes</div><div className="font-heading text-[26px]"><Pct v={a.returns["1m"]} /></div></div>
        <div className="card blueprint gap-1" style={{ padding: "14px 18px" }}><div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">Año en curso</div><div className="font-heading text-[26px]"><Pct v={a.returns.ytd} /></div></div>
        <div className="card blueprint gap-1" style={{ padding: "14px 18px" }}><div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">1 año</div><div className="font-heading text-[26px]"><Pct v={a.returns["1y"]} /></div></div>
      </div>

      {club && (
        <div className="mb-4">
          <ClubRecommendationCard r={club} />
        </div>
      )}

      <div className="card mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="font-semibold">Precio, medias móviles y Bollinger</h2>
          <div className="flex gap-1">
            {RANGES.map((x) => (
              <Link key={x} href={`${base}/${encodeURIComponent(hist.symbol)}?r=${x}`} className={x === range ? "btn-primary py-1 text-xs" : "btn-secondary py-1 text-xs"}>{RANGE_LABEL[x]}</Link>
            ))}
          </div>
        </div>
        <StockChart points={points} support={a.support} resistance={a.resistance} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 mb-4">
        <div className="card lg:col-span-3">
          <h2 className="font-semibold mb-3">Señales</h2>
          <ul className="space-y-2">
            {a.signals.map((s) => (
              <li key={s.id} className={`rounded-lg border px-3 py-2 ${tone(s.verdict)}`}>
                <div className="text-sm font-medium">{dot(s.verdict)} {s.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{s.detail}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-3">Niveles e indicadores</h2>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <tbody>
              <Row k="Resistencia (pivote)" v={fmt(a.resistance)} extra={<Pct v={distance(a.resistance)} />} />
              <Row k="Soporte (pivote)" v={fmt(a.support)} extra={<Pct v={distance(a.support)} />} />
              <Row k="Máximo 52 semanas" v={fmt(a.high52)} extra={<Pct v={distance(a.high52)} />} />
              <Row k="Mínimo 52 semanas" v={fmt(a.low52)} extra={<Pct v={distance(a.low52)} />} />
              <Row k="Media 20 sesiones" v={fmt(a.sma20)} extra={<Pct v={distance(a.sma20)} />} />
              <Row k="Media 50 sesiones" v={fmt(a.sma50)} extra={<Pct v={distance(a.sma50)} />} />
              <Row k="Media 200 sesiones" v={fmt(a.sma200)} extra={<Pct v={distance(a.sma200)} />} />
              <Row k="EMA 9 / EMA 21" v={`${fmt(a.ema9)} / ${fmt(a.ema21)}`} />
              <Row k="RSI (14)" v={a.rsi === null ? "—" : a.rsi.toFixed(1)} extra={<span className="text-xs text-slate-500">{a.rsi === null ? "" : a.rsi > 70 ? "sobrecompra" : a.rsi < 30 ? "sobreventa" : "neutral"}</span>} />
              <Row k="MACD / señal" v={a.macd === null || a.macdSignal === null ? "—" : `${a.macd.toFixed(2)} / ${a.macdSignal.toFixed(2)}`} extra={<span className={`text-xs ${(a.macdHist ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>hist. {a.macdHist?.toFixed(2) ?? "—"}</span>} />
              <Row k="Estocástico %K / %D" v={a.stochK === null || a.stochD === null ? "—" : `${a.stochK.toFixed(0)} / ${a.stochD.toFixed(0)}`} extra={<span className="text-xs text-slate-500">{a.stochK === null ? "" : a.stochK > 80 ? "sobrecompra" : a.stochK < 20 ? "sobreventa" : ""}</span>} />
              <Row k="ADX (+DI / −DI)" v={a.adx === null ? "—" : a.adx.toFixed(0)} extra={<span className="text-xs text-slate-500">{a.plusDI !== null && a.minusDI !== null ? `${a.plusDI.toFixed(0)} / ${a.minusDI.toFixed(0)}` : ""}</span>} />
              <Row k="Bollinger (20, 2σ)" v={`${fmt(a.bbLower)} – ${fmt(a.bbUpper)}`} extra={<span className="text-xs text-slate-500">{a.bbPosition === null ? "" : `${(a.bbPosition * 100).toFixed(0)} % del canal${a.bbSqueeze ? " · squeeze" : ""}`}</span>} />
              <Row k="ATR (14)" v={fmt(a.atr14)} extra={<span className="text-xs text-slate-500">{a.atr14 ? `${((a.atr14 / a.last) * 100).toFixed(1)} % diario` : ""}</span>} />
              <Row k="Volatilidad 30 d (anual.)" v={a.volatility30 === null ? "—" : `${(a.volatility30 * 100).toFixed(0)} %`} extra={<span className="text-xs text-slate-500">{a.volatility30 === null ? "" : a.volatility30 > 0.4 ? "alta" : a.volatility30 > 0.2 ? "media" : "baja"}</span>} />
              <Row k="Máxima caída (periodo)" v={`${(a.maxDrawdown * 100).toFixed(1)} %`} />
              <Row k="Volumen" v={a.volume.toLocaleString("es-ES")} extra={<span className="text-xs text-slate-500">{a.volumeAvg20 ? `${(a.volume / a.volumeAvg20).toFixed(1)}× media 20 d` : ""}</span>} />
              <Row k="OBV (20 sesiones)" v={a.obvSlope === null ? "—" : a.obvSlope > 0.02 ? "subiendo" : a.obvSlope < -0.02 ? "bajando" : "plano"} />
              <Row k="Fibonacci (52 sem.)" v="" extra={<span className="text-xs text-slate-500">{a.fib.map((x) => `${x.level} ${x.price.toFixed(2)}`).join(" · ")}</span>} />
              <Row k="Rentabilidad 3 m / 6 m" v="" extra={<><Pct v={a.returns["3m"]} /> / <Pct v={a.returns["6m"]} /></>} />
            </tbody>
          </table></div>
        </div>
      </div>

      <div className="card text-xs text-slate-500 space-y-1">
        <p><b>Cómo leerlo.</b> Las <b>medias móviles</b> suavizan el precio: cuando el precio y las medias cortas están por encima de las largas, la tendencia es alcista. El <b>RSI</b> mide la velocidad de las subidas y bajadas (por encima de 70, sobrecompra; por debajo de 30, sobreventa). El <b>MACD</b> compara dos medias exponenciales: sus cruces con la línea de señal anticipan cambios de impulso. El <b>estocástico</b> sitúa el cierre dentro del rango reciente. El <b>ADX</b> mide la fuerza de la tendencia (más de 25, fuerte; menos de 20, lateral). Las <b>bandas de Bollinger</b> marcan hasta dónde suele moverse el precio alrededor de su media. El <b>OBV</b> acumula volumen según el precio suba o baje. Los <b>soportes y resistencias</b> son niveles donde el precio ha rebotado o se ha frenado recientemente.</p>
        <p>Este análisis es automático y educativo. No es una recomendación de inversión personalizada: combina siempre la lectura técnica con los fundamentales y tu horizonte temporal.</p>
      </div>
    </>
  );
}

function Row({ k, v, extra }: { k: string; v: string; extra?: React.ReactNode }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-1.5 text-slate-600 whitespace-nowrap">{k}</td>
      <td className="py-1.5 text-right tabular-nums font-medium whitespace-nowrap">{v}</td>
      <td className="py-1.5 text-right w-24">{extra}</td>
    </tr>
  );
}
