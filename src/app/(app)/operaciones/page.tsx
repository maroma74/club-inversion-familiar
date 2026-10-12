import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computePortfolio } from "@/lib/portfolio";
import { fxToEur, isCrypto } from "@/lib/prices";
import { eur, pct } from "@/lib/format";
import { Kpi, PageHeader } from "@/components/ui";
import { TradeList } from "../inversiones/TradeList";
import { ManualPriceForm, ReconcileForm, TradeForm } from "../inversiones/forms";
import { AutoRefresh } from "../inversiones/AutoRefresh";

export default async function OperacionesPage({ searchParams }: { searchParams: Promise<{ activo?: string }> }) {
  const user = await requireUser();
  const { activo } = await searchParams;
  const [me, myTrades, usdRate] = await Promise.all([
    computePortfolio(user.id),
    prisma.trade.findMany({ where: { userId: user.id }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50 }),
    fxToEur("USD").catch(() => null), // euros por dólar, para mostrar los importes también en $
  ]);
  const usdPerEur = usdRate ? 1 / usdRate : null;

  return (
    <>
      <PageHeader kicker="Invertir" title="Operaciones" subtitle="Tu cartera, el registro de compras y ventas, y los precios manuales. El ranking y las estadísticas están en la Liga.">
        <AutoRefresh />
      </PageHeader>

      {me.missingPrices.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo obtener cotización de: <b>{me.missingPrices.join(", ")}</b>. Se valoran a precio de compra. Comprueba el símbolo (p. ej. <code>SAN.MC</code>, <code>AAPL</code>, <code>VWCE.DE</code>) o fija un precio manual más abajo.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Valor de mi cartera" value={eur(me.totalValue)} hint={`Aportado ${eur(me.contributed)}`} />
        <Kpi label="Rentabilidad" value={pct(me.returnPct, 2)} hint={`Ganancia ${eur(me.pnl)}`} tone={me.pnl >= 0 ? "good" : "bad"} />
        <Kpi label="Efectivo disponible" value={eur(me.cash)} hint={me.holdings.length ? `${me.holdings.length} ${me.holdings.length === 1 ? "posición" : "posiciones"} abiertas` : "Sin posiciones"} />
        <Kpi label="Beneficio realizado" value={eur(me.realized)} hint={`${me.trades} operaciones`} tone={me.realized > 0 ? "good" : me.realized < 0 ? "bad" : "neutral"} />
      </div>

      <div className="card mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Mis posiciones</h2>
          <Link href="/inversiones" className="text-sm text-indigo-600">Ver la liga →</Link>
        </div>
        {me.holdings.length === 0 ? (
          <p className="text-sm text-slate-500">Sin posiciones abiertas. Registra tu primera compra abajo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="text-left py-1">Activo</th><th className="text-right py-1">Uds.</th><th className="text-right py-1">Precio</th><th className="text-right py-1">Coste medio</th><th className="text-right py-1">Invertido</th><th className="text-right py-1">Valor</th><th className="text-right py-1">Resultado</th><th className="py-1" /></tr>
              </thead>
              <tbody>
                {me.holdings.map((h) => (
                  <tr key={h.symbol} className="border-t border-slate-100">
                    <td className="py-1.5">
                      <div className="font-medium">{h.symbol} {isCrypto(h.symbol) && <span className="badge bg-orange-100 text-orange-700">cripto</span>}{h.stale && <span className="badge bg-slate-100 text-slate-500 ml-1" title="Cotización sin actualizar">sin actualizar</span>}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{h.name}{h.brokers.length ? ` · ${h.brokers.join(", ")}` : ""}</div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{h.quantity.toLocaleString("es-ES", { maximumFractionDigits: 6 })}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{h.price === null ? "—" : eur(h.price)}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{eur(h.avgCost)}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{eur(h.invested)}</td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap font-medium">{eur(h.value)}</td>
                    <td className={`py-1.5 text-right tabular-nums whitespace-nowrap font-medium ${h.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>{eur(h.pnl)}<div className="text-xs">{pct(h.pnlPct)}</div></td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {!isCrypto(h.symbol) && <Link href={`/acciones/${encodeURIComponent(h.symbol)}`} className="text-xs text-indigo-600 hover:underline mr-3">Análisis</Link>}
                      <Link href={`/operaciones?activo=${encodeURIComponent(h.symbol)}#operar`} className="text-xs text-indigo-600 hover:underline">Operar</Link>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 text-xs text-slate-500"><td className="py-1.5" colSpan={5}>Efectivo</td><td className="py-1.5 text-right tabular-nums">{eur(me.cash)}</td><td colSpan={2} /></tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 id="operar" className="font-semibold mb-1 scroll-mt-4">Registrar operación</h2>
          <p className="text-xs text-slate-500 mb-3">Efectivo disponible: <b>{eur(me.cash)}</b>. Busca el activo por nombre o escribe el símbolo de Yahoo Finance. Acciones, ETF, fondos y criptomonedas (BTC-EUR, ETH-EUR, SOL-EUR…). Si una compra supera tu efectivo (por ejemplo, posiciones que ya tenías), la diferencia se anota como aportación propia.</p>
          <TradeForm key={activo ?? "none"} initialSymbol={activo} holdings={me.holdings.map((h) => ({ symbol: h.symbol, name: h.name, quantity: h.quantity }))} />
        </div>
        <div className="card">
          <h2 className="font-semibold mb-1">Mis operaciones</h2>
          <p className="text-xs text-slate-500 mb-3">Importe = cantidad × precio + comisión. En dólares al cambio del día de la operación si se hizo en USD; si no, al cambio actual{usdPerEur ? ` (1 € = ${usdPerEur.toFixed(4)} $)` : ""}.</p>
          <TradeList
            usdPerEur={usdPerEur}
            trades={myTrades.map((t) => ({
              id: t.id,
              date: t.date.toISOString().slice(0, 10),
              symbol: t.symbol,
              name: t.name,
              side: t.side as "BUY" | "SELL",
              quantity: t.quantity,
              price: t.price,
              currency: t.currency,
              fxRate: t.fxRate,
              fees: t.fees,
              broker: t.broker,
            }))}
          />
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold mb-1">Aportaciones propias</h3>
            <p className="text-xs text-slate-500 mb-2">Las compras que superan el efectivo generan una «aportación propia» automática. Se recalculan solas al registrar, editar o borrar operaciones; si algo no cuadra, fuérzalo aquí.</p>
            <ReconcileForm />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold mb-1">Precio manual</h3>
            <p className="text-xs text-slate-500 mb-2">Para fondos o activos sin cotización automática, fija el valor liquidativo en euros.</p>
            <ManualPriceForm />
          </div>
        </div>
      </div>
    </>
  );
}
