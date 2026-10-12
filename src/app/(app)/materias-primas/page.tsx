import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fetchStockQuotes } from "@/lib/stocks";
import { familyLeaderboard } from "@/lib/portfolio";
import { findCommodity, isCommodity } from "@/lib/commodities";
import { priceDecimals } from "@/lib/fmtPrice";
import { eur, pct } from "@/lib/format";
import { Kpi, PageHeader } from "@/components/ui";
import { AutoRefresh } from "../inversiones/AutoRefresh";
import { MarketList } from "@/components/market/MarketList";

/** Las cuatro materias primas que sirven de termómetro: oro (refugio), plata, petróleo (energía) y gas natural. */
const FEATURED = ["GC=F", "SI=F", "BZ=F", "NG=F"];

const usd = (n: number) => `${n.toLocaleString("es-ES", { minimumFractionDigits: priceDecimals(n), maximumFractionDigits: priceDecimals(n) })} $`;

export default async function MateriasPrimasPage() {
  const user = await requireUser();
  const [quotes, ranking] = await Promise.all([fetchStockQuotes(FEATURED), familyLeaderboard(user.familyId)]);

  // Posiciones de la familia en materias primas (futuros del catálogo). Los ETC y ETF se ven en la sección ETF.
  const positions = ranking.flatMap((r) => r.holdings.filter((h) => isCommodity(h.symbol)).map((h) => ({ ...h, owner: r.userName, ownerId: r.userId })));
  const value = positions.reduce((a, p) => a + p.value, 0);
  const invested = positions.reduce((a, p) => a + p.invested, 0);
  const familyValue = ranking.reduce((a, r) => a + r.totalValue, 0);

  return (
    <>
      <PageHeader kicker="Invertir" title="Materias primas" subtitle="Metales, energía, agrícolas y ganadería: lista de seguimiento con Recomendación del Club, análisis técnico, histórico y noticias por materia prima.">
        <div className="flex items-center gap-2">
          <Link href="/materias-primas/ranking" className="btn-secondary">Ranking del Club</Link>
          <AutoRefresh />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {quotes.map((q) => {
          const c = findCommodity(q.symbol);
          return (
            <Link key={q.symbol} href={`/materias-primas/${encodeURIComponent(q.symbol)}`} className="no-underline text-inherit">
              <Kpi
                label={c?.name ?? q.symbol}
                value={q.price ? usd(q.price) : "—"}
                hint={q.price ? `${q.change1d >= 0 ? "+" : "−"}${(Math.abs(q.change1d) * 100).toFixed(2)} % hoy · ${eur(q.priceEur, 2)} · ${c?.unit.replace("USD ", "") ?? ""}` : "Sin datos"}
                tone={q.price ? (q.change1d >= 0 ? "good" : "neutral") : "neutral"}
              />
            </Link>
          );
        })}
      </div>

      <div className="mb-6">
        <MarketList kind="COMMODITY" embedded />
      </div>

      {positions.length > 0 && (
        <div className="card mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h2 className="font-semibold">Posiciones de la familia en materias primas</h2>
            <span className="text-xs text-slate-500">
              {eur(value)}{familyValue > 0 ? ` · ${((value / familyValue) * 100).toFixed(0)} % del patrimonio de la liga` : ""}{invested > 0 ? ` · resultado ${pct((value - invested) / invested)}` : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="text-left py-1">Materia prima</th><th className="text-left py-1">De</th><th className="text-right py-1">Uds.</th><th className="text-right py-1">Valor</th><th className="text-right py-1">Rent.</th></tr>
              </thead>
              <tbody>
                {[...positions].sort((a, b) => b.value - a.value).map((p) => (
                  <tr key={`${p.ownerId}-${p.symbol}`} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium"><Link href={`/materias-primas/${encodeURIComponent(p.symbol)}`} className="text-indigo-700 hover:underline">{findCommodity(p.symbol)?.name ?? p.symbol}</Link> <span className="text-xs text-slate-400">{p.symbol}</span></td>
                    <td className="py-1.5 text-slate-600">{p.owner}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })}</td>
                    <td className="py-1.5 text-right tabular-nums">{eur(p.value)}</td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${p.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{pct(p.pnlPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card text-xs text-slate-500 space-y-1">
        <p><b>Cómo se invierte en materias primas.</b> Los precios de esta sección son los de los futuros, contratos de compraventa a plazo que cotizan en bolsas como COMEX, NYMEX o CBOT. Un futuro real tiene apalancamiento y un tamaño de contrato grande (por ejemplo, 100 onzas de oro), por eso no es un producto para empezar. En la liga puedes registrar operaciones sobre estos precios con la cantidad que quieras (por ejemplo, 0,5 onzas de oro) para practicar el análisis.</p>
        <p>Para invertir de forma sencilla con dinero real se usan ETC y ETF de materias primas, como los de oro físico, que se siguen en la sección ETF. Recuerda que el precio de los futuros se expresa en dólares: el cambio euro-dólar también influye en tu resultado.</p>
      </div>
    </>
  );
}
