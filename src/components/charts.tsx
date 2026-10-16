"use client";

import { num } from "@/lib/format";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Series en la paleta de marca: esmeralda, ámbar, navy, slate y variantes. */
const PALETTE = ["#10b981", "#e5a016", "var(--chart-ink)", "var(--chart-muted)", "#34d399", "#f5b82e", "var(--chart-ink-2)", "#94a3b8"];

export function LeagueChart({ data, members }: { data: Record<string, number | string>[]; members: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.25)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)} %`} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={50} axisLine={false} tickLine={false} />
        <ReferenceLine y={0} stroke="var(--chart-muted)" />
        <Tooltip formatter={(v, name) => [`${num(Number(v) * 100, 2)} %`, name]} contentStyle={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-divider)", borderRadius: 10, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text)" }} iconType="plainline" />
        {members.map((m, i) => (
          <Line key={m} type="monotone" dataKey={m} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
