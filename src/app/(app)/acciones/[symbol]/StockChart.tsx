"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/technical";

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
};
const num = (v: unknown, d = 2) => (typeof v === "number" ? v.toLocaleString("es-ES", { maximumFractionDigits: d }) : "—");

export function StockChart({ points, support, resistance }: { points: ChartPoint[]; support: number | null; resistance: number | null }) {
  const data = points.map((p) => ({ ...p, bbBand: p.bbUpper !== null && p.bbLower !== null ? [p.bbLower, p.bbUpper] : null, histUp: (p.macdHist ?? 0) >= 0 ? p.macdHist : null, histDown: (p.macdHist ?? 0) < 0 ? p.macdHist : null }));
  const tick = { fontSize: 11 };
  const interval = Math.max(Math.floor(points.length / 8), 1);
  const closes = points.map((p) => p.close);
  const lo = Math.min(...closes, support ?? Infinity) * 0.97;
  const hi = Math.max(...closes, resistance ?? -Infinity) * 1.03;

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8 }} syncId="stock">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={tick} interval={interval} />
          <YAxis domain={[lo, hi]} tick={tick} width={64} tickFormatter={(v) => num(v, 0)} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v, name) => [num(v), name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="bbBand" name="Bollinger" stroke="none" fill="#10b981" fillOpacity={0.10} connectNulls isAnimationActive={false} legendType="none" tooltipType="none" />
          <Line type="monotone" dataKey="close" name="Cierre" stroke="#0e2138" strokeWidth={1.8} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="sma20" name="Media 20" stroke="#e5a016" strokeWidth={1.2} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="sma50" name="Media 50" stroke="#34d399" strokeWidth={1.2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="sma200" name="Media 200" stroke="#64748b" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          {resistance !== null && <ReferenceLine y={resistance} stroke="#e5a016" strokeDasharray="4 3" label={{ value: `Resistencia ${num(resistance)}`, position: "insideTopLeft", fontSize: 11, fill: "#a5700c" }} />}
          {support !== null && <ReferenceLine y={support} stroke="#10b981" strokeDasharray="4 3" label={{ value: `Soporte ${num(support)}`, position: "insideBottomLeft", fontSize: 11, fill: "#047857" }} />}
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={data} margin={{ left: 8, right: 16 }} syncId="stock">
          <XAxis dataKey="date" hide />
          <YAxis tick={tick} width={64} tickFormatter={(v) => (Number(v) >= 1e6 ? `${(Number(v) / 1e6).toFixed(0)}M` : Number(v) >= 1e3 ? `${(Number(v) / 1e3).toFixed(0)}k` : String(v))} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [num(v, 0), "Volumen"]} />
          <Bar dataKey="volume" name="Volumen" fill="#94a3b8" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} margin={{ left: 8, right: 16 }} syncId="stock">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={tick} width={64} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [num(v, 1), "RSI"]} />
          <ReferenceLine y={70} stroke="#e5a016" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="rsi" name="RSI" stroke="#0e2138" strokeWidth={1.4} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data} margin={{ left: 8, right: 16 }} syncId="stock">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={tick} interval={interval} />
          <YAxis tick={tick} width={64} tickFormatter={(v) => num(v, 1)} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v, name) => [num(v, 3), name]} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="histUp" name="Histograma +" fill="#10b981" isAnimationActive={false} stackId="h" />
          <Bar dataKey="histDown" name="Histograma −" fill="#94a3b8" isAnimationActive={false} stackId="h" />
          <Line type="monotone" dataKey="macd" name="MACD" stroke="#0e2138" strokeWidth={1.3} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="macdSignal" name="Señal" stroke="#e5a016" strokeWidth={1.3} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 text-[11px] text-slate-500 px-2"><span>Arriba: precio con medias y Bollinger · volumen · RSI (14) · MACD (12, 26, 9)</span></div>
    </div>
  );
}
