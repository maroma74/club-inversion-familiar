import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fetchCryptoMarket, fetchFearGreed } from "@/lib/crypto";
import { getWatchlist } from "@/lib/stocks";
import { followWatchlistAction } from "@/app/actions/watchlist";
import { MarketList } from "@/components/market/MarketList";
import { familyLeaderboard } from "@/lib/portfolio";
import { isCrypto } from "@/lib/prices";
import { eur, pct } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { Kpi, PageHeader } from "@/components/ui";
import { AutoRefresh } from "../inversiones/AutoRefresh";

const compact = (n: number) => new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1, style: "currency", currency: "EUR" }).format(n);
const price = (n: number) => eur(n, n >= 100 ? 0 : n >= 1 ? 2 : 4);
const Change = ({ v }: { v: number }) => <span className={`tabular-nums font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{v >= 0 ? "+" : ""}{v.toFixed(1)} %</span>;

export default async function CriptoPage() {
  const user = await requireUser();
  const [market, fg, ranking, followedItems] = await Promise.all([fetchCryptoMarket(25), fetchFearGreed(), familyLeaderboard(user.familyId), getWatchlist(user.familyId, "CRYPTO")]);
  const followed = new Set(followedItems.map((w) => w.symbol));

  // Posiciones cripto de toda la familia
  const positions = ranking.flatMap((r) => r.holdings.filter((h) => isCrypto(h.symbol)).map((h) => ({ ...h, owner: r.userName, ownerId: r.userId })));
  const cryptoValue = positions.reduce((a, p) => a + p.value, 0);
  const cryptoInvested = positions.reduce((a, p) => a + p.invested, 0);
  const familyValue = ranking.reduce((a, r) => a + r.totalValue, 0);
  const heldSymbols = new Set(positions.map((p) => p.symbol.toUpperCase()));
  const byMember = ranking
    .map((r) => {
      const mine = positions.filter((p) => p.ownerId === r.userId);
      const value = mine.reduce((a, p) => a + p.value, 0);
      return { name: r.userName, value, pnl: mine.reduce((a, p) => a + p.pnl, 0), share: r.totalValue > 0 ? value / r.totalValue : 0, n: mine.length };
    })
    .filter((m) => m.n > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader kicker="Invertir" title="Cripto" subtitle="Lista de seguimiento con Recomendación del Club, análisis técnico, histórico y noticias por moneda; mercado en euros, sentimiento y la exposición de la familia.">
        <div className="flex items-center gap-2">
          <Link href="/cripto/ranking" className="btn-secondary">Ranking del Club</Link>
          <AutoRefresh />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Cripto de la familia" value={eur(cryptoValue)} hint={familyValue > 0 ? `${((cryptoValue / familyValue) * 100).toFixed(0)} % del patrimonio de la liga` : "Sin posiciones"} />
        <Kpi label="Resultado en cripto" value={eur(cryptoValue - cryptoInvested)} hint={cryptoInvested > 0 ? pct((cryptoValue - cryptoInvested) / cryptoInvested) : "—"} tone={cryptoValue - cryptoInvested >= 0 ? "good" : "bad"} />
        <Kpi label="Bitcoin" value={market.coins[0] ? price(market.coins[0].price) : "—"} hint={market.coins[0] ? `${market.coins[0].change24h >= 0 ? "+" : ""}${market.coins[0].change24h.toFixed(1)} % en 24 h` : ""} tone={market.coins[0] ? (market.coins[0].change24h >= 0 ? "good" : "bad") : "neutral"} />
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Miedo y codicia</div>
          {fg ? (
            <>
              <div className="text-2xl font-bold mt-1">{fg.value} <span className="text-sm font-medium text-slate-600">{fg.labelEs}</span></div>
              <div className="h-2 mt-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative">
                <div className="absolute -top-1 w-1 h-4 bg-slate-900 rounded" style={{ left: `calc(${fg.value}% - 2px)` }} />
              </div>
              <div className="text-xs text-slate-500 mt-1">0 = pánico · 100 = euforia</div>
            </>
          ) : (
            <div className="text-sm text-slate-500 mt-2">No disponible</div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <MarketList kind="CRYPTO" embedded />
      </div>

      {byMember.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Posiciones cripto de la familia</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="text-left py-1">Miembro</th><th className="text-right py-1">Valor</th><th className="text-right py-1">Resultado</th><th className="text-right py-1">% de su cartera</th></tr></thead>
              <tbody>
                {byMember.map((m) => (
                  <tr key={m.name} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium">{m.name} <span className="text-xs text-slate-400">· {m.n} {m.n === 1 ? "activo" : "activos"}</span></td>
                    <td className="py-1.5 text-right tabular-nums">{eur(m.value)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${m.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{eur(m.pnl)}</td>
                    <td className="py-1.5 text-right tabular-nums">{(m.share * 100).toFixed(0)} %</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="text-left py-1">Activo</th><th className="text-left py-1">De</th><th className="text-right py-1">Uds.</th><th className="text-right py-1">Valor</th><th className="text-right py-1">Rent.</th></tr></thead>
              <tbody>
                {positions.sort((a, b) => b.value - a.value).map((p) => (
                  <tr key={`${p.ownerId}-${p.symbol}`} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium"><Link href={`/cripto/${encodeURIComponent(p.symbol)}`} className="text-indigo-700 hover:underline">{p.symbol}</Link></td>
                    <td className="py-1.5 text-slate-600">{p.owner}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })}</td>
                    <td className="py-1.5 text-right tabular-nums">{eur(p.value)}</td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${p.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{pct(p.pnlPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold">Mercado · top {market.coins.length} por capitalización</h2>
          <span className="text-xs text-slate-500">Fuente: CoinGecko · precios en euros · sin stablecoins</span>
        </div>
        {market.error && <p className="px-5 py-3 text-sm text-amber-700 bg-amber-50">{market.error}</p>}
        {market.coins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">#</th>
                  <th className="text-left px-2 py-2 font-medium">Moneda</th>
                  <th className="text-right px-2 py-2 font-medium">Precio</th>
                  <th className="text-right px-2 py-2 font-medium">24 h</th>
                  <th className="text-right px-2 py-2 font-medium">7 d</th>
                  <th className="px-2 py-2 font-medium hidden md:table-cell">Últimos 7 días</th>
                  <th className="text-right px-2 py-2 font-medium hidden lg:table-cell">Cap. mercado</th>
                  <th className="text-right px-2 py-2 font-medium hidden lg:table-cell">Desde máximo</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {market.coins.map((c, i) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.image} alt="" width={22} height={22} className="rounded-full" />
                        <div>
                          <div className="font-medium"><Link href={`/cripto/${encodeURIComponent(c.yahooSymbol)}`} className="text-indigo-700 hover:underline">{c.name}</Link> {heldSymbols.has(c.yahooSymbol) && <span className="badge bg-indigo-100 text-indigo-700">en cartera</span>}</div>
                          <div className="text-xs text-slate-400 uppercase">{c.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums font-medium whitespace-nowrap">{price(c.price)}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap"><Change v={c.change24h} /></td>
                    <td className="px-2 py-2 text-right whitespace-nowrap"><Change v={c.change7d} /></td>
                    <td className="px-2 py-2 hidden md:table-cell"><Sparkline data={c.sparkline} positive={c.change7d >= 0} /></td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600 hidden lg:table-cell whitespace-nowrap">{compact(c.marketCap)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600 hidden lg:table-cell whitespace-nowrap">{c.athChange.toFixed(0)} %</td>
                    <td className="px-5 py-2 text-right whitespace-nowrap">
                      <Link href={`/cripto/${encodeURIComponent(c.yahooSymbol)}`} className="btn-primary py-1 text-xs whitespace-nowrap mr-2">Analizar</Link>
                      {followed.has(c.yahooSymbol) ? (
                        <span className="text-xs text-slate-500 mr-2">en seguimiento</span>
                      ) : (
                        <form action={followWatchlistAction} className="inline mr-2">
                          <input type="hidden" name="symbol" value={c.yahooSymbol} />
                          <input type="hidden" name="name" value={c.name} />
                          <input type="hidden" name="kind" value="CRYPTO" />
                          <button className="btn-ghost py-1 text-xs">Seguir</button>
                        </form>
                      )}
                      <Link href={`/operaciones?activo=${encodeURIComponent(c.yahooSymbol)}#operar`} className="btn-secondary py-1 text-xs whitespace-nowrap">Operar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-4">Las operaciones se registran en la liga con el símbolo de Yahoo (BTC-EUR, ETH-EUR…), que es el que se usa para valorar la cartera. El índice de miedo y codicia lo publica alternative.me a diario.</p>
    </>
  );
}
