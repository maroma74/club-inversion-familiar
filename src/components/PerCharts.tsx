"use client";

import { Bar, BarChart, Cell, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type Point = { date: string; price: number; eps: number | null; per: number | null };
type Band = { mean: number; p25: number; p75: number; min: number; max: number };

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
};
const tickDate = (d: string) => {
  const [y, m] = d.split("-");
  return `${m}/${y.slice(2)}`;
};
const num = (v: unknown, d = 2) => (typeof v === "number" ? v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");
const AXIS_W = 58; // mismo ancho de eje en los tres gráficos: así las fechas quedan alineadas
const MARGIN = { left: 4, right: 14, top: 6, bottom: 0 };
const tick = { fontSize: 11 };
const tooltipStyle = { borderRadius: 10, border: "1px solid rgba(14,33,56,0.12)", fontSize: 12 };

/**
 * Tres gráficos apilados que comparten el eje de fechas: precio, BPA de los últimos 12 meses (barras) y PER con su media
 * y la banda entre los percentiles 25 y 75. `syncId` sincroniza el cursor y el tooltip entre los tres.
 */
export function PerCharts({ points, band, currency }: { points: Point[]; band: Band | null; currency: string }) {
  const n = points.length;
  const interval = Math.max(Math.floor(n / 6), 1);
  const perValues = points.map((p) => p.per).filter((v): v is number => v !== null);
  const perMax = perValues.length ? Math.max(...perValues, band?.p75 ?? 0) : 0;

  return (
    <div className="flex flex-col gap-1" role="group" aria-label="Precio, beneficio por acción y PER en el mismo eje de fechas">
      <div>
        <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700 mb-0.5">Precio ({currency})</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={points} margin={MARGIN} syncId="per">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" />
            <XAxis dataKey="date" hide />
            <YAxis width={AXIS_W} tick={tick} domain={["auto", "auto"]} tickFormatter={(v) => num(v, v >= 100 ? 0 : 2)} />
            <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [`${num(v)} ${currency}`, "Precio"]} contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="price" name="Precio" stroke="#0e2138" strokeWidth={1.8} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700 mb-0.5">BPA de los últimos 12 meses ({currency})</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={points} margin={MARGIN} syncId="per" barCategoryGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" />
            <XAxis dataKey="date" hide />
            <YAxis width={AXIS_W} tick={tick} tickFormatter={(v) => num(v, 1)} />
            <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [`${num(v)} ${currency}`, "BPA TTM"]} contentStyle={tooltipStyle} />
            <Bar dataKey="eps" name="BPA TTM" isAnimationActive={false}>
              {points.map((p) => (
                <Cell key={p.date} fill={(p.eps ?? 0) >= 0 ? "#10b981" : "#b91c1c"} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700 mb-0.5">PER (precio / BPA de los últimos 12 meses)</div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={points} margin={{ ...MARGIN, bottom: 4 }} syncId="per">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.22)" />
            <XAxis dataKey="date" tickFormatter={tickDate} tick={tick} interval={interval} />
            <YAxis width={AXIS_W} tick={tick} domain={[0, Math.ceil((perMax || 10) * 1.1)]} allowDataOverflow tickFormatter={(v) => `${num(v, 0)}×`} />
            <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [`${num(v, 1)}×`, "PER"]} contentStyle={tooltipStyle} />
            {band && (
              <>
                {/* Por debajo del percentil 25: zona donde ha estado barata; por encima del 75, cara */}
                <ReferenceArea y1={0} y2={band.p25} fill="#10b981" fillOpacity={0.1} ifOverflow="extendDomain" />
                <ReferenceArea y1={band.p75} y2={Math.ceil((perMax || 10) * 1.1)} fill="#0e2138" fillOpacity={0.07} ifOverflow="extendDomain" />
                <ReferenceLine y={band.mean} stroke="#e5a016" strokeDasharray="6 4" strokeWidth={1.4} />
                <ReferenceLine y={band.p25} stroke="#059669" strokeDasharray="2 3" />
                <ReferenceLine y={band.p75} stroke="#475569" strokeDasharray="2 3" />
              </>
            )}
            <Line type="monotone" dataKey="per" name="PER" stroke="#0e2138" strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        {band && (
          <ul className="list-none m-0 mt-1 p-0 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-700" aria-label="Leyenda del gráfico del PER">
            <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: "#e5a016" }} />Media {num(band.mean, 1)}×</li>
            <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(16,185,129,0.25)", border: "1px dotted #059669" }} />Zona barata: por debajo de {num(band.p25, 1)}× (P25)</li>
            <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="inline-block w-3 h-3 rounded-sm" style={{ background: "rgba(14,33,56,0.14)", border: "1px dotted #475569" }} />Zona cara: por encima de {num(band.p75, 1)}× (P75)</li>
          </ul>
        )}
      </div>
    </div>
  );
}
