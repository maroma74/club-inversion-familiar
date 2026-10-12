import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getWatchlist, type WatchKind } from "@/lib/stocks";
import { familyLeaderboard } from "@/lib/portfolio";
import { isCrypto } from "@/lib/prices";
import { getClubRecommendations } from "@/lib/club";
import { DISCLAIMER } from "@/lib/recommend";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ActionBadge } from "@/components/ClubRecommendationCard";
import { CopyButton } from "@/components/CopyButton";

const sg = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

export async function ClubRanking({ kind }: { kind: WatchKind }) {
  const user = await requireUser();
  const base = kind === "ETF" ? "/etf" : "/acciones";
  const label = kind === "ETF" ? "ETF" : "acciones";
  const [watchlist, ranking] = await Promise.all([getWatchlist(user.familyId, kind), familyLeaderboard(user.familyId)]);
  const held = new Map<string, string[]>();
  for (const r of ranking) for (const h of r.holdings) if (!isCrypto(h.symbol)) held.set(h.symbol, [...(held.get(h.symbol) ?? []), r.userName]);
  const allListed = new Set((await getWatchlist(user.familyId)).map((w) => w.symbol));
  const symbols = [...new Set([...watchlist.map((w) => w.symbol), ...(kind === "STOCK" ? [...held.keys()].filter((s) => !allListed.has(s)) : [])])];
  const recs = await getClubRecommendations(symbols);
  const rows = [...recs.values()].sort((a, b) => b.total - a.total);
  const buys = rows.filter((r) => r.action === "COMPRAR").slice(0, 3);
  const topOpportunities = buys.length ? buys : rows.filter((r) => r.total >= 0.3).slice(0, 3);
  const exits = rows.filter((r) => r.action === "VENDER" || r.total <= -0.3);
  const failed = symbols.filter((s) => !recs.has(s.toUpperCase()));

  const md = [
    `# Ranking del Club de inversión (${label}) · ${fmtDate(new Date())}`,
    "",
    "| Ticker | Recomendación | Puntuación | Confianza | R/B |",
    "|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.ticker} | ${r.action} (${r.bias}) | ${sg(r.total)} | ${r.confidence} | ${r.plan.rr === null ? "N/D" : `1:${r.plan.rr.toFixed(1)}`} |`),
    "",
    `**Mejores oportunidades:** ${topOpportunities.map((r) => `${r.ticker} (${sg(r.total)})`).join(", ") || "ninguna con señal de compra"}`,
    `**Reducir o salir:** ${exits.map((r) => `${r.ticker} (${sg(r.total)})`).join(", ") || "ninguno"}`,
    "",
    DISCLAIMER,
  ].join("\n");

  return (
    <>
      <PageHeader title={`Ranking del Club de inversión · ${kind === "ETF" ? "ETF" : "Acciones"}`} subtitle={`${rows.length} valores de la lista de seguimiento${kind === "STOCK" ? " y de las carteras" : ""}, ordenados por puntuación ponderada (tendencia 30 %, momentum 25 %, volumen 20 %, estructura 25 %).`}>
        <div className="flex gap-2 items-center">
          <Link href={base} className="btn-secondary py-1">← {kind === "ETF" ? "ETF" : "Acciones"}</Link>
          <CopyButton text={md} label="Copiar resumen" />
        </div>
      </PageHeader>

      {failed.length > 0 && <p className="mb-4 text-xs text-amber-700">Sin datos suficientes para: {failed.join(", ")}.</p>}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card border-green-200">
          <h2 className="font-semibold mb-2">{buys.length ? "Mejores oportunidades de compra" : "Mejor puntuados (sin señal de compra firme: vigilar entrada)"}</h2>
          {topOpportunities.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún valor alcanza señal de compra ahora mismo.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topOpportunities.map((r) => (
                <li key={r.ticker} className="flex items-start gap-2">
                  <ActionBadge action={r.action} small />
                  <div>
                    <Link href={`${base}/${encodeURIComponent(r.ticker)}`} className="font-medium text-indigo-700 hover:underline">{r.ticker}</Link> <span className="text-slate-600">{r.name}</span> · {sg(r.total)} · {r.bias}
                    <div className="text-xs text-slate-500">Entrada {r.plan.entryLow !== null && r.plan.entryHigh !== null ? `${r.plan.entryLow.toFixed(2)}–${r.plan.entryHigh.toFixed(2)}` : "N/D"} · stop {r.plan.stop?.toFixed(2) ?? "N/D"} · objetivo {r.plan.target1?.toFixed(2) ?? "N/D"} · R/B {r.plan.rr === null ? "N/D" : `1:${r.plan.rr.toFixed(1)}`}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card border-red-200">
          <h2 className="font-semibold mb-2">Reducir o salir</h2>
          {exits.length === 0 ? (
            <p className="text-sm text-slate-500">Ningún valor con señal de venta o sesgo bajista.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {exits.map((r) => (
                <li key={r.ticker} className="flex items-start gap-2">
                  <ActionBadge action={r.action} small />
                  <div>
                    <Link href={`${base}/${encodeURIComponent(r.ticker)}`} className="font-medium text-indigo-700 hover:underline">{r.ticker}</Link> <span className="text-slate-600">{r.name}</span> · {sg(r.total)} · {r.bias}
                    {held.get(r.ticker) && <div className="text-xs text-amber-700">En cartera de {held.get(r.ticker)!.join(", ")}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold">Tabla completa</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-5 py-2 font-medium">#</th>
                <th className="text-left px-2 py-2 font-medium">Ticker</th>
                <th className="text-left px-2 py-2 font-medium">Recomendación</th>
                <th className="text-right px-2 py-2 font-medium">Puntuación</th>
                <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Tend. / Mom. / Vol. / Estr.</th>
                <th className="text-left px-2 py-2 font-medium">Confianza</th>
                <th className="text-right px-2 py-2 font-medium">R/B</th>
                <th className="text-left px-2 py-2 font-medium hidden lg:table-cell">Desde</th>
                <th className="text-left px-5 py-2 font-medium hidden lg:table-cell">{kind === "ETF" ? "TER" : "Resultados"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.ticker} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2">
                    <Link href={`${base}/${encodeURIComponent(r.ticker)}`} className="font-medium text-indigo-700 hover:underline">{r.ticker}</Link>
                    {held.get(r.ticker) && <span className="badge bg-indigo-100 text-indigo-700 ml-2">en cartera</span>}
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.name}</div>
                  </td>
                  <td className="px-2 py-2"><ActionBadge action={r.action} small /> <span className="text-xs text-slate-500">{r.bias}</span></td>
                  <td className={`px-2 py-2 text-right tabular-nums font-semibold ${r.total >= 1 ? "text-green-700" : r.total <= -1 ? "text-red-700" : r.total >= 0.3 ? "text-green-600" : r.total <= -0.3 ? "text-red-600" : "text-slate-700"}`}>{sg(r.total)}</td>
                  <td className="px-2 py-2 text-xs text-slate-500 tabular-nums hidden md:table-cell">{r.blocks.map((b) => sg(b.score)).join(" / ")}</td>
                  <td className="px-2 py-2">{r.confidence}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.plan.rr === null ? "N/D" : `1:${r.plan.rr.toFixed(1)}`}</td>
                  <td className="px-2 py-2 text-xs text-slate-500 hidden lg:table-cell">{r.since ? fmtDate(r.since) : "—"}{r.previousAction ? ` (antes ${r.previousAction})` : ""}</td>
                  <td className={`px-5 py-2 text-xs hidden lg:table-cell ${r.daysToEarnings !== null && r.daysToEarnings >= 0 && r.daysToEarnings <= 10 ? "text-amber-700 font-medium" : "text-slate-500"}`}>
                    {kind === "ETF" ? (r.profile.expenseRatio !== null ? `${(r.profile.expenseRatio * 100).toFixed(2)} %` : "N/D") : r.earningsDate ?? "N/D"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500 italic mt-4">{DISCLAIMER}</p>
    </>
  );
}
