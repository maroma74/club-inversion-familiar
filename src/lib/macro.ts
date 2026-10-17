import "server-only";
import { cachedJson } from "./apiCache";
import { ECB_SERIES, FRED_SERIES, parseEcbObservation, parseFredObservation, type MacroItem } from "./macroData";

/**
 * Descarga del contexto macro: BCE (sin clave) y FRED (con FRED_API_KEY). Cada serie se guarda 12 horas en la
 * caché compartida; si una falla se muestra lo último guardado o se omite, nunca se cae la página.
 */
const TTL_MS = 12 * 3600 * 1000;

async function getJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ClubInversionFamiliar/1.0" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.split("?")[0]}`);
  return res.json();
}

export const fredConfigured = () => Boolean(process.env.FRED_API_KEY?.trim());

export async function getMacroSnapshot(): Promise<MacroItem[]> {
  const ecb = ECB_SERIES.map((s) =>
    cachedJson<{ asOf: string; value: number }>(`macro:${s.id}`, TTL_MS, async () => parseEcbObservation(await getJson(`https://data-api.ecb.europa.eu/service/data/${s.path}?lastNObservations=1&format=jsondata`))).then((o) =>
      o ? ({ id: s.id, label: s.label, value: o.value, asOf: o.asOf, source: s.source, note: s.note } satisfies MacroItem) : null,
    ),
  );
  const key = process.env.FRED_API_KEY?.trim();
  const fred = key
    ? FRED_SERIES.map((s) =>
        cachedJson<{ asOf: string; value: number }>(`macro:${s.id}`, TTL_MS, async () => {
          const limit = s.yoy ? 14 : 1;
          const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.series}&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=${limit}`;
          return parseFredObservation(await getJson(url), s.yoy);
        }).then((o) => (o ? ({ id: s.id, label: s.label, value: o.value, asOf: o.asOf, source: "FRED", note: s.note } satisfies MacroItem) : null)),
      )
    : [];
  const items = await Promise.all([...ecb, ...fred]);
  return items.filter((i): i is MacroItem => i !== null);
}
