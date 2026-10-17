import "server-only";
import { cachedJson } from "./apiCache";
import { todayYmd } from "./validation";
import { parseEarnings, parseNextEarnings, parseRecommendation, type AnalystView } from "./finnhubData";

/**
 * Finnhub (https://finnhub.io): consenso de analistas, sorpresas de resultados y próxima fecha de resultados.
 * Cuenta gratuita: 60 peticiones por minuto; cada símbolo se guarda 12 horas en la caché compartida.
 * Los símbolos de Yahoo (AAPL, SAN.MC) coinciden con los de Finnhub en la mayoría de bolsas; si un dato es
 * de pago o el valor no existe, Finnhub devuelve 403 o listas vacías y el panel simplemente no se muestra.
 */
const TTL_MS = 12 * 3600 * 1000;

export const finnhubConfigured = () => Boolean(process.env.FINNHUB_API_KEY?.trim());

async function finnhub(path: string): Promise<unknown | null> {
  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch(`https://finnhub.io/api/v1${path}`, { headers: { "X-Finnhub-Token": key }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (res.status === 403) return null; // dato de pago para este símbolo: no insistir
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status} ${path.split("?")[0]}`);
  return res.json();
}

export async function getAnalystView(symbolRaw: string): Promise<AnalystView | null> {
  if (!finnhubConfigured()) return null;
  const symbol = symbolRaw.toUpperCase();
  return cachedJson<AnalystView>(`finnhub:${symbol}`, TTL_MS, async () => {
    const today = todayYmd();
    const to = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);
    const [rec, earn, cal] = await Promise.all([
      finnhub(`/stock/recommendation?symbol=${encodeURIComponent(symbol)}`),
      finnhub(`/stock/earnings?symbol=${encodeURIComponent(symbol)}&limit=4`),
      finnhub(`/calendar/earnings?symbol=${encodeURIComponent(symbol)}&from=${today}&to=${to}`),
    ]);
    const view: AnalystView = { consensus: parseRecommendation(rec), surprises: parseEarnings(earn), nextEarnings: parseNextEarnings(cal, today) };
    return view.consensus || view.surprises.length || view.nextEarnings ? view : null;
  });
}
