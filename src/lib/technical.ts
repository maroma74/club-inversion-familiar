/** Indicadores de análisis técnico calculados sobre velas diarias. Uso educativo: no es asesoramiento financiero. */

export type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number };

export type Verdict = "alcista" | "bajista" | "neutral";
export type Signal = { id: string; label: string; verdict: Verdict; detail: string };

export type ChartPoint = {
  date: string;
  close: number;
  volume: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
};

export type Analysis = {
  last: number;
  prevClose: number;
  lastDate: string;
  change1d: number;
  returns: { "1w": number | null; "1m": number | null; "3m": number | null; "6m": number | null; "1y": number | null; ytd: number | null };
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  sma50Slope: number | null; // variación relativa de la SMA50 en 10 sesiones
  sma200Slope: number | null;
  ema9: number | null;
  ema21: number | null;
  stochK: number | null;
  stochD: number | null;
  prevStochK: number | null;
  prevStochD: number | null;
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  obvSlope: number | null; // pendiente relativa del OBV en 20 sesiones
  priceSlope20: number | null; // variación del precio en 20 sesiones
  volumeAvg50: number | null;
  bbWidth: number | null; // (upper - lower) / mid
  bbSqueeze: boolean; // anchura en el 20 % más bajo de las últimas 120 sesiones
  fib: { level: string; price: number }[]; // retrocesos sobre el rango de 52 semanas
  prevMacdHist: number | null;
  rsiPrev: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbPosition: number | null; // 0 = banda inferior, 1 = banda superior
  high52: number;
  low52: number;
  support: number | null;
  resistance: number | null;
  volume: number;
  volumeAvg20: number | null;
  volatility30: number | null; // anualizada
  maxDrawdown: number; // negativo, sobre el periodo
  atr14: number | null;
  signals: Signal[];
  score: number; // suma de señales: >0 alcista, <0 bajista
  overall: Verdict;
  points: ChartPoint[];
};

export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

export function ema(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (n + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (prev === null) {
      if (i === n - 1) {
        prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
        out.push(prev);
      } else out.push(null);
    } else {
      prev = values[i] * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function rsi(closes: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gain = 0, loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = Math.max(d, 0), l = Math.max(-d, 0);
    if (i <= n) {
      gain += g;
      loss += l;
      if (i === n) {
        gain /= n;
        loss /= n;
        out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
      } else out.push(null);
    } else {
      gain = (gain * (n - 1) + g) / n;
      loss = (loss * (n - 1) + l) / n;
      out.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
    }
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signalN = 9) {
  const ef = ema(closes, fast), es = ema(closes, slow);
  const line = closes.map((_, i) => (ef[i] !== null && es[i] !== null ? ef[i]! - es[i]! : null));
  const valid = line.map((v) => v ?? 0);
  const firstIdx = line.findIndex((v) => v !== null);
  const sig = ema(valid.slice(firstIdx), signalN);
  const signal = line.map((v, i) => (v === null || i - firstIdx < 0 ? null : sig[i - firstIdx]));
  const hist = line.map((v, i) => (v !== null && signal[i] !== null ? v - signal[i]! : null));
  return { line, signal, hist };
}

export function bollinger(closes: number[], n = 20, k = 2) {
  const mid = sma(closes, n);
  const upper: (number | null)[] = [], lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = closes.slice(i - n + 1, i + 1);
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - mid[i]!) ** 2, 0) / n);
    upper.push(mid[i]! + k * sd);
    lower.push(mid[i]! - k * sd);
  }
  return { mid, upper, lower };
}

export function atr(candles: Candle[], n = 14): number | null {
  if (candles.length < n + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  return trs.slice(-n).reduce((a, b) => a + b, 0) / n;
}

/** Estocástico (14, 3, 3): %K suavizado y %D. */
export function stochastic(candles: Candle[], n = 14, kSmooth = 3, dSmooth = 3) {
  const raw: (number | null)[] = candles.map((c, i) => {
    if (i < n - 1) return null;
    const w = candles.slice(i - n + 1, i + 1);
    const hi = Math.max(...w.map((x) => x.high)), lo = Math.min(...w.map((x) => x.low));
    return hi > lo ? ((c.close - lo) / (hi - lo)) * 100 : 50;
  });
  const smooth = (arr: (number | null)[], m: number) => arr.map((_, i) => {
    const w = arr.slice(Math.max(0, i - m + 1), i + 1);
    return w.length === m && w.every((v) => v !== null) ? (w as number[]).reduce((a, b) => a + b, 0) / m : null;
  });
  const k = smooth(raw, kSmooth);
  const d = smooth(k, dSmooth);
  return { k, d };
}

/** ADX (14) con +DI y −DI (suavizado de Wilder). */
export function adx(candles: Candle[], n = 14) {
  const len = candles.length;
  const out = { adx: Array<number | null>(len).fill(null), plusDI: Array<number | null>(len).fill(null), minusDI: Array<number | null>(len).fill(null) };
  if (len < 2 * n + 1) return out;
  const tr: number[] = [], pdm: number[] = [], mdm: number[] = [];
  for (let i = 1; i < len; i++) {
    const c = candles[i], p = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    const up = c.high - p.high, down = p.low - c.low;
    pdm.push(up > down && up > 0 ? up : 0);
    mdm.push(down > up && down > 0 ? down : 0);
  }
  let sTR = tr.slice(0, n).reduce((a, b) => a + b, 0), sP = pdm.slice(0, n).reduce((a, b) => a + b, 0), sM = mdm.slice(0, n).reduce((a, b) => a + b, 0);
  const dx: number[] = [];
  let adxVal: number | null = null;
  for (let i = n; i < tr.length; i++) {
    sTR = sTR - sTR / n + tr[i];
    sP = sP - sP / n + pdm[i];
    sM = sM - sM / n + mdm[i];
    const pdi = sTR > 0 ? (sP / sTR) * 100 : 0, mdi = sTR > 0 ? (sM / sTR) * 100 : 0;
    const d = pdi + mdi > 0 ? (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 : 0;
    dx.push(d);
    if (dx.length === n) adxVal = dx.reduce((a, b) => a + b, 0) / n;
    else if (dx.length > n && adxVal !== null) adxVal = (adxVal * (n - 1) + d) / n;
    const idx = i + 1; // índice de la vela
    out.plusDI[idx] = pdi;
    out.minusDI[idx] = mdi;
    out.adx[idx] = adxVal;
  }
  return out;
}

/** On Balance Volume. */
export function obv(candles: Candle[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const d = candles[i].close > candles[i - 1].close ? candles[i].volume : candles[i].close < candles[i - 1].close ? -candles[i].volume : 0;
    out.push(out[i - 1] + d);
  }
  return out;
}

/** Retrocesos de Fibonacci sobre el rango de 52 semanas, en la dirección del movimiento dominante. */
export function fibonacci(high: number, low: number, uptrend: boolean) {
  const range = high - low;
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786];
  return ratios.map((r) => ({ level: `${(r * 100).toFixed(1)} %`, price: uptrend ? high - range * r : low + range * r }));
}

/** Soporte y resistencia por pivotes: mínimos/máximos locales de los últimos `lookback` días. */
function pivots(candles: Candle[], lookback = 120, width = 5) {
  const slice = candles.slice(-lookback);
  const last = slice[slice.length - 1]?.close ?? 0;
  const lows: number[] = [], highs: number[] = [];
  for (let i = width; i < slice.length - width; i++) {
    const w = slice.slice(i - width, i + width + 1);
    if (slice[i].low === Math.min(...w.map((c) => c.low))) lows.push(slice[i].low);
    if (slice[i].high === Math.max(...w.map((c) => c.high))) highs.push(slice[i].high);
  }
  const support = lows.filter((l) => l < last).sort((a, b) => b - a)[0] ?? null;
  const resistance = highs.filter((h) => h > last).sort((a, b) => a - b)[0] ?? null;
  return { support, resistance };
}

const pctChange = (closes: number[], sessions: number) => (closes.length > sessions ? closes[closes.length - 1] / closes[closes.length - 1 - sessions] - 1 : null);

export function analyze(candles: Candle[]): Analysis {
  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const last = closes[n - 1];
  const prevClose = closes[n - 2] ?? last;
  const s20 = sma(closes, 20), s50 = sma(closes, 50), s200 = sma(closes, 200);
  const r = rsi(closes);
  const m = macd(closes);
  const bb = bollinger(closes);
  const vols = candles.map((c) => c.volume);
  const volAvg = sma(vols, 20);
  const volAvg50 = sma(vols, 50);
  const year = candles.slice(-252);
  const high52 = Math.max(...year.map((c) => c.high));
  const low52 = Math.min(...year.map((c) => c.low));
  const { support, resistance } = pivots(candles);
  const e9 = ema(closes, 9), e21 = ema(closes, 21);
  const st = stochastic(candles);
  const dmi = adx(candles);
  const obvArr = obv(candles);
  const slope = (arr: (number | null)[], back: number) => {
    const a = arr[n - 1], b = arr[n - 1 - back];
    return a !== null && b !== null && b !== 0 ? a / b - 1 : null;
  };
  const obvSlope = (() => {
    const a = obvArr[n - 1], b = obvArr[n - 21];
    if (b === undefined) return null;
    const scale = Math.max(Math.abs(a), Math.abs(b), vols.slice(-20).reduce((x, y) => x + y, 0) || 1);
    return (a - b) / scale;
  })();
  const yearStart = candles.find((c) => c.date >= `${candles[n - 1].date.slice(0, 4)}-01-01`);
  const ytd = yearStart && yearStart !== candles[n - 1] ? last / yearStart.close - 1 : null;

  // Volatilidad anualizada de los últimos 30 días
  let volatility30: number | null = null;
  if (n > 31) {
    const rets = [];
    for (let i = n - 30; i < n; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((a, v) => a + (v - mean) ** 2, 0) / (rets.length - 1));
    volatility30 = sd * Math.sqrt(252);
  }
  // Máxima caída desde máximos en el periodo
  let peak = closes[0], maxDrawdown = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    maxDrawdown = Math.min(maxDrawdown, c / peak - 1);
  }

  const at = <T,>(arr: T[]) => arr[n - 1];
  const prevAt = <T,>(arr: T[]) => arr[n - 2];
  const signals: Signal[] = [];
  const push = (id: string, label: string, verdict: Verdict, detail: string) => signals.push({ id, label, verdict, detail });

  // Tendencia de fondo: precio vs SMA200
  if (at(s200) !== null) {
    const d = last / at(s200)! - 1;
    push("sma200", "Tendencia de largo plazo", d > 0 ? "alcista" : "bajista", `El precio está un ${(Math.abs(d) * 100).toFixed(1)} % ${d > 0 ? "por encima" : "por debajo"} de la media de 200 sesiones (${at(s200)!.toFixed(2)}). ${d > 0 ? "Tendencia de fondo alcista." : "Tendencia de fondo bajista."}`);
  }
  // Medio plazo: SMA50 y cruce dorado / de la muerte
  if (at(s50) !== null && at(s200) !== null) {
    const golden = at(s50)! > at(s200)!;
    // ¿Cruce reciente (últimas 10 sesiones)?
    let crossed = false;
    for (let i = n - 10; i < n; i++) if (i > 0 && s50[i] !== null && s200[i] !== null && s50[i - 1] !== null && s200[i - 1] !== null && (s50[i]! > s200[i]!) !== (s50[i - 1]! > s200[i - 1]!)) crossed = true;
    push("cross", golden ? "Cruce dorado" : "Cruce de la muerte", golden ? "alcista" : "bajista", `La media de 50 sesiones está ${golden ? "por encima" : "por debajo"} de la de 200${crossed ? " y se han cruzado en las últimas dos semanas, señal clásica de cambio de tendencia" : ""}.`);
  }
  if (at(s20) !== null && at(s50) !== null) {
    const up = last > at(s20)! && at(s20)! > at(s50)!;
    const down = last < at(s20)! && at(s20)! < at(s50)!;
    push("short", "Impulso de corto plazo", up ? "alcista" : down ? "bajista" : "neutral", up ? "Precio por encima de la media de 20, y ésta por encima de la de 50: las medias están ordenadas al alza." : down ? "Precio por debajo de la media de 20, y ésta por debajo de la de 50: las medias están ordenadas a la baja." : "Las medias de 20 y 50 sesiones no muestran una dirección clara.");
  }
  // RSI
  if (at(r) !== null) {
    const v = at(r)!;
    push("rsi", `RSI (14): ${v.toFixed(0)}`, v > 70 ? "bajista" : v < 30 ? "alcista" : "neutral", v > 70 ? "Sobrecompra: el precio ha subido muy rápido y es más probable una pausa o recorte." : v < 30 ? "Sobreventa: el precio ha caído muy rápido y es más probable un rebote." : v > 55 ? "Zona neutral con sesgo positivo." : v < 45 ? "Zona neutral con sesgo negativo." : "Zona neutral.");
  }
  // MACD
  if (at(m.hist) !== null && prevAt(m.hist) !== null) {
    const h = at(m.hist)!, ph = prevAt(m.hist)!;
    const crossedUp = h > 0 && ph <= 0, crossedDown = h < 0 && ph >= 0;
    push("macd", "MACD", h > 0 ? "alcista" : "bajista", crossedUp ? "El MACD acaba de cruzar por encima de su señal: impulso alcista reciente." : crossedDown ? "El MACD acaba de cruzar por debajo de su señal: impulso bajista reciente." : h > 0 ? `El MACD está por encima de su señal (histograma ${h > ph ? "creciendo" : "menguando"}).` : `El MACD está por debajo de su señal (histograma ${h < ph ? "cayendo" : "recuperándose"}).`);
  }
  // Bollinger
  let bbPosition: number | null = null;
  let bbWidth: number | null = null;
  let bbSqueeze = false;
  if (at(bb.upper) !== null && at(bb.lower) !== null) {
    const u = at(bb.upper)!, l = at(bb.lower)!;
    bbPosition = u > l ? (last - l) / (u - l) : 0.5;
    bbWidth = at(bb.mid) ? (u - l) / at(bb.mid)! : null;
    const widths = candles.map((_, i) => (bb.upper[i] !== null && bb.lower[i] !== null && bb.mid[i] ? (bb.upper[i]! - bb.lower[i]!) / bb.mid[i]! : null)).slice(-120).filter((w): w is number => w !== null).sort((a, b) => a - b);
    if (bbWidth !== null && widths.length >= 40) bbSqueeze = bbWidth <= widths[Math.floor(widths.length * 0.2)];
    push("bb", "Bandas de Bollinger", bbPosition > 1 ? "bajista" : bbPosition < 0 ? "alcista" : "neutral", bbPosition > 1 ? "El precio ha salido por la banda superior: movimiento extremo, posible vuelta hacia la media." : bbPosition < 0 ? "El precio ha salido por la banda inferior: movimiento extremo, posible rebote hacia la media." : `El precio está en el ${(bbPosition * 100).toFixed(0)} % del canal (0 % = banda inferior, 100 % = superior).`);
  }
  // Volumen
  const volume = at(vols);
  if (at(volAvg) !== null && at(volAvg)! > 0) {
    const ratio = volume / at(volAvg)!;
    const dayUp = last >= prevClose;
    if (ratio > 1.5) push("vol", `Volumen ${ratio.toFixed(1)}× la media`, dayUp ? "alcista" : "bajista", `Volumen muy superior a la media de 20 sesiones en un día ${dayUp ? "de subida: el movimiento tiene respaldo" : "de caída: la presión vendedora es fuerte"}.`);
  }
  // 52 semanas
  const from52h = last / high52 - 1;
  if (from52h > -0.03) push("52h", "Cerca de máximos anuales", "alcista", `A un ${(Math.abs(from52h) * 100).toFixed(1)} % del máximo de 52 semanas (${high52.toFixed(2)}). Los valores en máximos suelen seguir fuertes, pero vigila el RSI.`);
  else if (last / low52 - 1 < 0.05) push("52l", "Cerca de mínimos anuales", "bajista", `A un ${((last / low52 - 1) * 100).toFixed(1)} % del mínimo de 52 semanas (${low52.toFixed(2)}).`);

  const score = signals.reduce((a, s) => a + (s.verdict === "alcista" ? 1 : s.verdict === "bajista" ? -1 : 0), 0);
  const overall: Verdict = score >= 2 ? "alcista" : score <= -2 ? "bajista" : "neutral";

  const points: ChartPoint[] = candles.map((c, i) => ({
    date: c.date,
    close: c.close,
    volume: c.volume,
    sma20: s20[i],
    sma50: s50[i],
    sma200: s200[i],
    bbUpper: bb.upper[i],
    bbLower: bb.lower[i],
    rsi: r[i],
    macd: m.line[i],
    macdSignal: m.signal[i],
    macdHist: m.hist[i],
  }));

  return {
    last,
    prevClose,
    lastDate: candles[n - 1].date,
    change1d: last / prevClose - 1,
    returns: { "1w": pctChange(closes, 5), "1m": pctChange(closes, 21), "3m": pctChange(closes, 63), "6m": pctChange(closes, 126), "1y": pctChange(closes, 252), ytd },
    sma20: at(s20),
    sma50: at(s50),
    sma200: at(s200),
    sma50Slope: slope(s50, 10),
    sma200Slope: slope(s200, 10),
    ema9: at(e9),
    ema21: at(e21),
    stochK: at(st.k),
    stochD: at(st.d),
    prevStochK: prevAt(st.k),
    prevStochD: prevAt(st.d),
    adx: at(dmi.adx),
    plusDI: at(dmi.plusDI),
    minusDI: at(dmi.minusDI),
    obvSlope,
    priceSlope20: pctChange(closes, 20),
    volumeAvg50: at(volAvg50),
    bbWidth,
    bbSqueeze,
    fib: fibonacci(high52, low52, at(s200) !== null ? last >= at(s200)! : true),
    prevMacdHist: prevAt(m.hist),
    rsiPrev: r[n - 15] ?? null,
    rsi: at(r),
    macd: at(m.line),
    macdSignal: at(m.signal),
    macdHist: at(m.hist),
    bbUpper: at(bb.upper),
    bbLower: at(bb.lower),
    bbPosition,
    high52,
    low52,
    support,
    resistance,
    volume,
    volumeAvg20: at(volAvg),
    volatility30,
    maxDrawdown,
    atr14: atr(candles),
    signals,
    score,
    overall,
    points,
  };
}
