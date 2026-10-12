/**
 * Datos complementarios de cada valor (sector, beta, próxima fecha de resultados) desde el endpoint
 * quoteSummary de Yahoo Finance, que requiere una cookie de sesión y un «crumb». Ambos se obtienen
 * de forma gratuita y se cachean en memoria. Si algo falla, los campos quedan en null (N/D).
 */

export type Profile = {
  symbol: string;
  sector: string | null;
  industry: string | null;
  beta: number | null;
  earningsDate: string | null; // YYYY-MM-DD
  quoteType: string | null;
  description: string | null; // resumen del negocio (Yahoo lo sirve en inglés)
  website: string | null;
  country: string | null;
  employees: number | null;
  marketCap: number | null; // en la divisa del valor
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null; // 0.03 = 3 %
  isFund: boolean; // ETF o fondo
  fundFamily: string | null; // gestora
  fundCategory: string | null;
  expenseRatio: number | null; // TER, 0.0022 = 0,22 %
  totalAssets: number | null;
  topHoldings: { symbol: string; name: string; weight: number }[];
  sectorWeights: { sector: string; weight: number }[];
};

const SECTOR_ES: Record<string, string> = {
  realestate: "Inmobiliario",
  consumer_cyclical: "Consumo cíclico",
  basic_materials: "Materiales básicos",
  consumer_defensive: "Consumo defensivo",
  technology: "Tecnología",
  communication_services: "Comunicación",
  financial_services: "Finanzas",
  utilities: "Servicios públicos",
  industrials: "Industria",
  energy: "Energía",
  healthcare: "Salud",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TTL_MS = 6 * 60 * 60 * 1000; // el perfil cambia poco: 6 h
let session: { cookie: string; crumb: string; at: number } | null = null;
const cache = new Map<string, { at: number; data: Profile }>();

async function getSession() {
  if (session && Date.now() - session.at < 60 * 60 * 1000) return session;
  const r1 = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual", cache: "no-store" });
  const setCookie = r1.headers.get("set-cookie") ?? "";
  const cookie = setCookie
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter((c) => /^(A1|A3|A1S|B|GUC)=/.test(c))
    .join("; ");
  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie }, cache: "no-store" });
  const crumb = (await r2.text()).trim();
  if (!r2.ok || !crumb || crumb.includes("<")) throw new Error("No se pudo obtener el crumb de Yahoo");
  session = { cookie, crumb, at: Date.now() };
  return session;
}

type Raw = { raw?: number; fmt?: string } | number | undefined;
const num = (v: Raw): number | null => (typeof v === "number" ? v : typeof v?.raw === "number" ? v.raw : null);

export async function fetchProfile(symbol: string): Promise<Profile> {
  const sym = symbol.toUpperCase();
  const cached = cache.get(sym);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;
  const empty: Profile = { symbol: sym, sector: null, industry: null, beta: null, earningsDate: null, quoteType: null, description: null, website: null, country: null, employees: null, marketCap: null, trailingPE: null, forwardPE: null, dividendYield: null, isFund: false, fundFamily: null, fundCategory: null, expenseRatio: null, totalAssets: null, topHoldings: [], sectorWeights: [] };
  if (sym.startsWith("^")) return empty;
  try {
    const s = await getSession();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=calendarEvents,summaryProfile,summaryDetail,defaultKeyStatistics,quoteType,fundProfile,topHoldings&crumb=${encodeURIComponent(s.crumb)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Cookie: s.cookie, Accept: "application/json" }, signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (res.status === 401 || res.status === 403) session = null; // crumb caducado: se renovará en la siguiente llamada
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const r = j?.quoteSummary?.result?.[0];
    if (!r) throw new Error("sin perfil");
    const earnings = r.calendarEvents?.earnings?.earningsDate as Array<{ raw?: number; fmt?: string }> | undefined;
    const nextEarnings = earnings?.map((e) => e.raw).filter((x): x is number => typeof x === "number").sort((a, b) => a - b)[0];
    const profile: Profile = {
      symbol: sym,
      sector: r.summaryProfile?.sector ?? null,
      industry: r.summaryProfile?.industry ?? null,
      beta: num(r.summaryDetail?.beta) ?? num(r.defaultKeyStatistics?.beta),
      earningsDate: nextEarnings ? new Date(nextEarnings * 1000).toISOString().slice(0, 10) : null,
      quoteType: r.quoteType?.quoteType ?? null,
      description: r.summaryProfile?.longBusinessSummary ?? null,
      website: r.summaryProfile?.website ?? null,
      country: r.summaryProfile?.country ?? null,
      employees: typeof r.summaryProfile?.fullTimeEmployees === "number" ? r.summaryProfile.fullTimeEmployees : null,
      marketCap: num(r.summaryDetail?.marketCap),
      trailingPE: num(r.summaryDetail?.trailingPE),
      forwardPE: num(r.summaryDetail?.forwardPE) ?? num(r.defaultKeyStatistics?.forwardPE),
      dividendYield: num(r.summaryDetail?.dividendYield) ?? num(r.summaryDetail?.yield),
      isFund: ["ETF", "MUTUALFUND"].includes(r.quoteType?.quoteType ?? ""),
      fundFamily: r.fundProfile?.family ?? null,
      fundCategory: r.fundProfile?.categoryName ?? null,
      expenseRatio: num(r.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio) ?? num(r.fundProfile?.feesExpensesInvestment?.netExpRatio),
      totalAssets: num(r.defaultKeyStatistics?.totalAssets),
      topHoldings: ((r.topHoldings?.holdings ?? []) as Array<{ symbol?: string; holdingName?: string; holdingPercent?: Raw }>)
        .map((h) => ({ symbol: h.symbol ?? "", name: h.holdingName ?? h.symbol ?? "", weight: num(h.holdingPercent) ?? 0 }))
        .filter((h) => h.name),
      sectorWeights: ((r.topHoldings?.sectorWeightings ?? []) as Array<Record<string, Raw>>)
        .flatMap((o) => Object.entries(o).map(([k, v]) => ({ sector: SECTOR_ES[k] ?? k, weight: num(v) ?? 0 })))
        .filter((s) => s.weight > 0)
        .sort((a, b) => b.weight - a.weight),
    };
    cache.set(sym, { at: Date.now(), data: profile });
    return profile;
  } catch {
    return cached?.data ?? empty;
  }
}
