/**
 * Motor de recomendación COMPRAR / MANTENER / VENDER.
 * Implementa el marco multi-bloque (tendencia 30 %, momentum 25 %, volumen 20 %, volatilidad/estructura 25 %),
 * puntuando cada bloque de -2 a +2 solo con los datos disponibles. Uso educativo, no es asesoramiento financiero.
 */
import type { Analysis } from "./technical";

export type Action = "COMPRAR" | "MANTENER" | "VENDER";
export type Confidence = "Alta" | "Media" | "Baja";
export type Block = { key: "trend" | "momentum" | "volume" | "structure"; label: string; weight: number; score: number; note: string; available: number; total: number };

export type Extras = {
  sector?: string | null;
  industry?: string | null;
  beta?: number | null;
  earningsDate?: string | null; // YYYY-MM-DD
  news?: { title: string; publisher: string; publishedAt: Date }[];
  newsTone?: "favorable" | "desfavorable" | "neutral" | null;
  newsSummary?: string | null;
  isFund?: boolean; // ETF o fondo: no publica resultados
};

export type Recommendation = {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  dataDate: string;
  sector: string | null;
  industry: string | null;
  beta: number | null;
  earningsDate: string | null;
  daysToEarnings: number | null;
  news: { title: string; publisher: string; publishedAt: Date }[];
  newsSummary: string | null;
  isFund: boolean;
  action: Action;
  bias: string; // "sesgo alcista / vigilar entrada", "neutral", "sesgo bajista / proteger beneficios"
  confidence: Confidence;
  horizon: string;
  blocks: Block[];
  total: number;
  plan: {
    entryLow: number | null;
    entryHigh: number | null;
    stop: number | null;
    stopReason: string;
    target1: number | null;
    target2: number | null;
    rr: number | null;
    invalidation: string;
  };
  thesis: string[];
  risks: string[];
  missing: string[];
  notes: string[]; // reglas aplicadas (p. ej. degradación por R/B)
};

const clamp = (v: number, lo = -2, hi = 2) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function recommend(a: Analysis, meta: { ticker: string; name: string; currency: string }, extras: Extras = {}): Recommendation {
  const missing: string[] = [];
  const notes: string[] = [];
  const p = a.last;
  const earningsDate = extras.earningsDate ?? null;
  const daysToEarnings = earningsDate ? Math.round((new Date(earningsDate + "T12:00:00").getTime() - Date.now()) / 86400000) : null;
  const earningsSoon = daysToEarnings !== null && daysToEarnings >= 0 && daysToEarnings <= 10;

  // ---------- A. Tendencia (30 %) ----------
  let trend = 0, tAvail = 0;
  const tNotes: string[] = [];
  if (a.sma200 !== null) {
    tAvail++;
    trend += p > a.sma200 ? 1 : -1;
    tNotes.push(`precio ${p > a.sma200 ? "sobre" : "bajo"} SMA200`);
  } else missing.push("SMA 200");
  if (a.sma50 !== null) {
    tAvail++;
    trend += p > a.sma50 ? 0.5 : -0.5;
    if (a.sma50Slope !== null) trend += a.sma50Slope > 0.002 ? 0.25 : a.sma50Slope < -0.002 ? -0.25 : 0;
  } else missing.push("SMA 50");
  if (a.sma50 !== null && a.sma200 !== null) {
    trend += a.sma50 > a.sma200 ? 0.5 : -0.5;
    tNotes.push(a.sma50 > a.sma200 ? "golden cross vigente" : "death cross vigente");
  }
  if (a.adx !== null && a.plusDI !== null && a.minusDI !== null) {
    tAvail++;
    const dir = a.plusDI >= a.minusDI ? 1 : -1;
    if (a.adx > 25) {
      trend += 0.5 * dir;
      tNotes.push(`ADX ${a.adx.toFixed(0)} (tendencia fuerte ${dir > 0 ? "alcista" : "bajista"})`);
    } else if (a.adx < 20) {
      trend *= 0.6;
      tNotes.push(`ADX ${a.adx.toFixed(0)} (lateral)`);
    } else tNotes.push(`ADX ${a.adx.toFixed(0)}`);
  } else missing.push("ADX");
  trend = clamp(trend);
  const primaryDown = a.sma200 !== null && a.sma50 !== null && p < a.sma200 && a.sma50 < a.sma200;

  // ---------- B. Momentum (25 %) ----------
  let mom = 0, mAvail = 0;
  const mNotes: string[] = [];
  if (a.rsi !== null) {
    mAvail++;
    const v = a.rsi;
    mom += v > 70 ? -1 : v < 30 ? 1 : v >= 55 ? 0.5 : v <= 45 ? -0.5 : 0;
    mNotes.push(`RSI ${v.toFixed(0)}${v > 70 ? " sobrecompra" : v < 30 ? " sobreventa" : ""}`);
    // Divergencia simple: precio sube 20 sesiones y RSI baja (bajista), o al revés (alcista).
    if (a.rsiPrev !== null && a.priceSlope20 !== null) {
      if (a.priceSlope20 > 0.03 && v < a.rsiPrev - 5) { mom -= 0.5; mNotes.push("divergencia bajista RSI"); }
      if (a.priceSlope20 < -0.03 && v > a.rsiPrev + 5) { mom += 0.5; mNotes.push("divergencia alcista RSI"); }
    }
  } else missing.push("RSI");
  if (a.macd !== null && a.macdSignal !== null && a.macdHist !== null) {
    mAvail++;
    mom += a.macd > a.macdSignal ? 0.5 : -0.5;
    mom += a.macd > 0 ? 0.25 : -0.25;
    if (a.prevMacdHist !== null) mom += a.macdHist > a.prevMacdHist ? 0.25 : -0.25;
    const crossUp = a.prevMacdHist !== null && a.macdHist > 0 && a.prevMacdHist <= 0;
    const crossDown = a.prevMacdHist !== null && a.macdHist < 0 && a.prevMacdHist >= 0;
    mNotes.push(crossUp ? "MACD cruza al alza" : crossDown ? "MACD cruza a la baja" : `MACD ${a.macd > a.macdSignal ? "sobre" : "bajo"} señal`);
  } else missing.push("MACD");
  if (a.stochK !== null && a.stochD !== null) {
    mAvail++;
    const k = a.stochK, d = a.stochD, pk = a.prevStochK, pd = a.prevStochD;
    if (pk !== null && pd !== null && pk <= pd && k > d && k < 25) { mom += 0.75; mNotes.push("estocástico gira al alza en sobreventa"); }
    else if (pk !== null && pd !== null && pk >= pd && k < d && k > 75) { mom -= 0.75; mNotes.push("estocástico gira a la baja en sobrecompra"); }
    else if (k > 80) { mom -= 0.25; mNotes.push(`estocástico ${k.toFixed(0)} alto`); }
    else if (k < 20) { mom += 0.25; mNotes.push(`estocástico ${k.toFixed(0)} bajo`); }
  } else missing.push("Estocástico");
  mom = clamp(mom);

  // ---------- C. Volumen (20 %) ----------
  let vol = 0, vAvail = 0;
  const vNotes: string[] = [];
  const dayUp = p >= a.prevClose;
  if (a.volumeAvg20 !== null && a.volumeAvg20 > 0) {
    vAvail++;
    const ratio = a.volume / a.volumeAvg20;
    if (ratio >= 1.5) { vol += dayUp ? 1 : -1; vNotes.push(`volumen ${ratio.toFixed(1)}× media confirma ${dayUp ? "subida" : "caída"}`); }
    else if (ratio >= 1) { vol += dayUp ? 0.25 : -0.25; vNotes.push(`volumen ${ratio.toFixed(1)}× media`); }
    else { vNotes.push(`volumen bajo (${ratio.toFixed(1)}× media)`); }
    if (a.volumeAvg50 !== null && a.volumeAvg50 > 0) vol += a.volumeAvg20 > a.volumeAvg50 * 1.1 ? 0.25 : 0;
  } else missing.push("Volumen medio");
  if (a.obvSlope !== null && a.priceSlope20 !== null) {
    vAvail++;
    const obvUp = a.obvSlope > 0.02, obvDown = a.obvSlope < -0.02;
    const prUp = a.priceSlope20 > 0.01, prDown = a.priceSlope20 < -0.01;
    if (obvUp && prUp) { vol += 0.5; vNotes.push("OBV acompaña la subida"); }
    else if (obvDown && prDown) { vol -= 0.5; vNotes.push("OBV acompaña la caída"); }
    else if (obvUp && prDown) { vol += 0.5; vNotes.push("OBV sube con precio cayendo (acumulación)"); }
    else if (obvDown && prUp) { vol -= 0.5; vNotes.push("OBV cae con precio subiendo (distribución)"); }
    else vNotes.push("OBV plano");
  } else missing.push("OBV");
  vol = clamp(vol);

  // ---------- D. Volatilidad y estructura (25 %) ----------
  let str = 0, sAvail = 0;
  const sNotes: string[] = [];
  if (a.bbPosition !== null) {
    sAvail++;
    if (a.bbPosition > 1) { str -= 0.5; sNotes.push("fuera de banda superior"); }
    else if (a.bbPosition < 0) { str += 0.5; sNotes.push("fuera de banda inferior (posible rebote)"); }
    else if (a.bbPosition >= 0.5 && a.bbPosition <= 0.85) { str += 0.25; }
    if (a.bbSqueeze) sNotes.push("squeeze de Bollinger: movimiento fuerte próximo");
  } else missing.push("Bollinger");
  if (a.atr14 !== null) {
    sAvail++;
    const atrPct = a.atr14 / p;
    if (atrPct > 0.045) { str -= 0.5; sNotes.push(`ATR ${(atrPct * 100).toFixed(1)} % diario (muy volátil)`); }
    else sNotes.push(`ATR ${(atrPct * 100).toFixed(1) } % diario`);
  } else missing.push("ATR");
  const distRes = a.resistance !== null ? a.resistance / p - 1 : null;
  const distSup = a.support !== null ? 1 - a.support / p : null;
  if (distRes !== null || distSup !== null) {
    sAvail++;
    if (distRes !== null && distRes < 0.02) { str -= 0.5; sNotes.push("resistencia a menos del 2 %"); }
    else if (distRes !== null && distRes > 0.08) { str += 0.5; sNotes.push(`recorrido libre del ${(distRes * 100).toFixed(0)} % hasta resistencia`); }
    if (distSup !== null && distSup < 0.03) { str += 0.5; sNotes.push("apoyado en soporte"); }
    else if (distSup !== null && distSup > 0.12) { str -= 0.25; sNotes.push("soporte lejano (stop amplio)"); }
  } else missing.push("Soportes/resistencias");
  const from52h = p / a.high52 - 1;
  if (from52h > -0.03) { str += a.rsi !== null && a.rsi > 70 ? -0.25 : 0.5; sNotes.push("en zona de máximos de 52 semanas"); }
  else if (p / a.low52 - 1 < 0.05) { str -= 0.5; sNotes.push("en zona de mínimos de 52 semanas"); }
  str = clamp(str);

  const blocks: Block[] = [
    { key: "trend", label: "Tendencia", weight: 0.3, score: r2(trend), note: tNotes.join(" · ") || "N/D", available: tAvail, total: 3 },
    { key: "momentum", label: "Momentum", weight: 0.25, score: r2(mom), note: mNotes.join(" · ") || "N/D", available: mAvail, total: 3 },
    { key: "volume", label: "Volumen", weight: 0.2, score: r2(vol), note: vNotes.join(" · ") || "N/D", available: vAvail, total: 2 },
    { key: "structure", label: "Volatilidad/Estructura", weight: 0.25, score: r2(str), note: sNotes.join(" · ") || "N/D", available: sAvail, total: 3 },
  ];
  const availableKey = tAvail + mAvail + vAvail + sAvail;
  const total = r2(blocks.reduce((s, b) => s + b.score * b.weight, 0));

  // ---------- Plan de operación ----------
  const atr = a.atr14;
  let stop: number | null = null, stopReason = "N/D";
  if (a.support !== null && atr !== null && p - a.support <= 2.5 * atr && a.support < p) {
    stop = r2(a.support * 0.99);
    stopReason = `bajo el soporte ${a.support.toFixed(2)} (estructura)`;
  } else if (atr !== null) {
    stop = r2(p - 2 * atr);
    stopReason = `2× ATR (${atr.toFixed(2)}) bajo el precio`;
  } else if (a.support !== null && a.support < p) {
    stop = r2(a.support * 0.99);
    stopReason = `bajo el soporte ${a.support.toFixed(2)}`;
  }
  // Un objetivo debe dejar recorrido: al menos 1× ATR (o un 2 %) por encima del precio.
  const minGap = Math.max(atr ?? 0, p * 0.02);
  const candidates = [a.resistance, a.high52, ...a.fib.map((f) => f.price)].filter((x): x is number => x !== null && x >= p + minGap).sort((x, y) => x - y);
  let target1: number | null = candidates[0] ?? (atr !== null ? r2(p + 2 * atr) : null);
  let target2: number | null = candidates.find((c) => target1 !== null && c > target1 * 1.02) ?? (a.high52 > p * 1.02 ? a.high52 : atr !== null ? r2(p + 4 * atr) : null);
  if (target1 !== null) target1 = r2(target1);
  if (target2 !== null) target2 = r2(target2);
  const rr = stop !== null && target1 !== null && p > stop ? r2((target1 - p) / (p - stop)) : null;
  const entryLow = a.sma20 !== null && a.sma20 < p ? r2(Math.max(a.sma20, a.support ?? 0)) : a.support !== null ? r2(a.support) : null;
  const entryHigh = r2(p);

  // ---------- Decisión ----------
  let action: Action = total >= 1 ? "COMPRAR" : total <= -1 ? "VENDER" : "MANTENER";
  let bias = total >= 0.3 ? "sesgo alcista / vigilar entrada" : total <= -0.3 ? "sesgo bajista / proteger beneficios" : "neutral";
  if (availableKey < 4) {
    action = "MANTENER";
    bias = "sin señal clara (datos insuficientes)";
    notes.push(`Solo ${availableKey} indicadores clave disponibles: recomendación por defecto MANTENER.`);
  }
  if (action === "COMPRAR" && primaryDown) {
    const confirmed = a.volumeAvg20 !== null && a.volume / a.volumeAvg20 >= 1.5 && a.prevMacdHist !== null && a.macdHist !== null && a.macdHist > 0;
    if (!confirmed) {
      action = "MANTENER";
      bias = "sesgo alcista contra tendencia bajista principal: esperar confirmación";
      notes.push("Regla 3: no se compra contra la tendencia bajista principal sin giro confirmado (cruce + volumen).");
    }
  }
  if (action === "COMPRAR" && (rr === null || rr < 2)) {
    action = "MANTENER";
    bias = "sesgo alcista / vigilar entrada";
    notes.push(`Regla 5: ratio riesgo/beneficio ${rr === null ? "N/D" : `1:${rr.toFixed(1)}`} inferior a 1:2; se degrada a MANTENER hasta mejorar la entrada.`);
  }
  if (action === "VENDER") bias = "reducir o salir";

  // Confianza: datos disponibles + coherencia entre bloques + fuerza de tendencia.
  const signs = blocks.map((b) => Math.sign(b.score)).filter((s) => s !== 0);
  const agreement = signs.length ? Math.abs(signs.reduce((x, y) => x + y, 0)) / signs.length : 0;
  let confScore = (availableKey / 11) * 0.5 + agreement * 0.3 + (a.adx !== null && a.adx > 25 ? 0.2 : a.adx !== null && a.adx < 20 ? 0 : 0.1);
  if (missing.length >= 3) confScore -= 0.15;
  if (earningsSoon) {
    confScore -= 0.25;
    notes.push(`Regla 6: resultados el ${earningsDate} (en ${daysToEarnings} días); confianza penalizada.`);
  }
  if (extras.beta !== null && extras.beta !== undefined && extras.beta > 1.5) confScore -= 0.05;
  const confidence: Confidence = confScore >= 0.7 ? "Alta" : confScore >= 0.45 ? "Media" : "Baja";
  const horizon = a.adx !== null && a.adx > 25 && Math.abs(total) >= 0.5 ? "medio (1–6 meses)" : "corto (1–4 sem)";

  // ---------- Tesis y riesgos ----------
  const thesis: string[] = [];
  thesis.push(`Tendencia ${trend > 0.5 ? "alcista" : trend < -0.5 ? "bajista" : "sin dirección clara"}: ${tNotes.slice(0, 2).join(", ") || "sin datos de medias"}.`);
  thesis.push(`Momentum ${mom > 0.5 ? "positivo" : mom < -0.5 ? "negativo" : "neutral"} (${mNotes.slice(0, 2).join(", ") || "N/D"}) y volumen ${vol > 0.25 ? "que confirma" : vol < -0.25 ? "que no acompaña" : "neutro"}.`);
  thesis.push(
    action === "COMPRAR"
      ? `Estructura favorable: ${sNotes.slice(0, 2).join(", ") || "sin notas"}; objetivo ${target1?.toFixed(2) ?? "N/D"} con stop ${stop?.toFixed(2) ?? "N/D"} (R/B 1:${rr?.toFixed(1) ?? "N/D"}).`
      : action === "VENDER"
        ? `Estructura deteriorada: ${sNotes.slice(0, 2).join(", ") || "sin notas"}; conviene reducir y esperar a recuperar ${a.sma50 !== null ? `la SMA50 (${a.sma50.toFixed(2)})` : "las medias"}.`
        : `Sin ventaja clara ahora: ${sNotes.slice(0, 2).join(", ") || "estructura neutra"}; esperar ${total > 0 ? "un retroceso a la zona de entrada" : "una señal de giro"}.`,
  );
  const risks: string[] = [];
  if (earningsSoon) risks.push(`Publica resultados el ${earningsDate} (en ${daysToEarnings} días): el gap posterior puede saltarse el stop.`);
  if (a.volatility30 !== null && a.volatility30 > 0.4) risks.push(`Volatilidad anualizada alta (${(a.volatility30 * 100).toFixed(0)} %): dimensionar la posición con el ATR.`);
  if (distRes !== null && distRes < 0.04) risks.push(`Resistencia muy cercana en ${a.resistance!.toFixed(2)}: posible rechazo.`);
  if (a.rsi !== null && a.rsi > 70) risks.push("RSI en sobrecompra: riesgo de recorte a corto plazo.");
  if (a.rsi !== null && a.rsi < 30 && action !== "COMPRAR") risks.push("RSI en sobreventa: puede rebotar bruscamente contra una posición corta o vendida.");
  if (primaryDown) risks.push("Tendencia principal bajista: los rebotes pueden ser trampas alcistas.");
  if (a.bbSqueeze) risks.push("Squeeze de Bollinger: el próximo movimiento puede ser violento en cualquier dirección.");
  if (a.maxDrawdown < -0.3) risks.push(`Caída máxima del ${(a.maxDrawdown * 100).toFixed(0)} % en el periodo: el valor ha sufrido retrocesos profundos.`);
  if (extras.beta !== null && extras.beta !== undefined && extras.beta > 1.3) risks.push(`Beta ${extras.beta.toFixed(2)}: amplifica los movimientos del mercado.`);
  if (extras.newsTone === "desfavorable" && action !== "VENDER") risks.push("Flujo de noticias desfavorable: la lectura técnica puede deteriorarse si se confirman los titulares.");
  if (extras.newsTone === "favorable" && action === "VENDER") risks.push("Flujo de noticias favorable: un rebote por titulares podría invalidar la señal de venta.");
  if (!earningsDate && !extras.isFund) risks.push("Fecha de resultados: N/D; comprobar el calendario antes de operar.");
  if (missing.length) risks.push(`Indicadores no disponibles: ${missing.join(", ")}.`);

  const invalidation =
    action === "VENDER"
      ? `Cierre diario por encima de ${a.sma50 !== null ? `la SMA50 (${a.sma50.toFixed(2)})` : a.resistance !== null ? `la resistencia ${a.resistance.toFixed(2)}` : "la última resistencia"} con volumen.`
      : `Cierre diario por debajo de ${stop !== null ? stop.toFixed(2) : "el soporte"}${a.sma200 !== null && p > a.sma200 ? ` o pérdida de la SMA200 (${a.sma200.toFixed(2)})` : ""}.`;

  return {
    ticker: meta.ticker,
    name: meta.name,
    price: p,
    currency: meta.currency,
    dataDate: a.lastDate,
    sector: extras.sector ?? null,
    industry: extras.industry ?? null,
    beta: extras.beta ?? null,
    earningsDate,
    daysToEarnings,
    news: (extras.news ?? []).slice(0, 3),
    newsSummary: extras.newsSummary ?? null,
    isFund: extras.isFund ?? false,
    action,
    bias,
    confidence,
    horizon,
    blocks,
    total,
    plan: { entryLow: action === "VENDER" ? null : entryLow, entryHigh: action === "VENDER" ? null : entryHigh, stop, stopReason, target1, target2, rr, invalidation },
    thesis,
    risks: risks.slice(0, 3),
    missing,
    notes,
  };
}

export const DISCLAIMER = "Análisis técnico generado a partir de los datos proporcionados. No constituye asesoramiento financiero personalizado. Cada miembro debe valorar su perfil de riesgo y tamaño de posición.";

const f = (v: number | null, d = 2) => (v === null ? "N/D" : v.toFixed(d));
const sg = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

/** Ficha en Markdown con el formato de salida acordado. */
export function recommendationMarkdown(r: Recommendation): string {
  const lines = [
    `**[${r.ticker}] – ${r.name}** | Precio: ${f(r.price)} ${r.currency} | Fecha datos: ${r.dataDate}`,
    r.isFund
      ? `Fondo cotizado | Beta: ${r.beta === null ? "N/D" : r.beta.toFixed(2)}`
      : `Sector: ${r.sector ?? "N/D"}${r.industry ? ` (${r.industry})` : ""} | Beta: ${r.beta === null ? "N/D" : r.beta.toFixed(2)} | Próximos resultados: ${r.earningsDate ?? "N/D"}${r.daysToEarnings !== null && r.daysToEarnings >= 0 ? ` (en ${r.daysToEarnings} días)` : ""}`,
    `**RECOMENDACIÓN DEL CLUB DE INVERSIÓN: ${r.action}** (${r.bias}) | Confianza: ${r.confidence} | Horizonte: ${r.horizon}`,
    "",
    "| Bloque | Puntuación | Lectura clave |",
    "|---|---|---|",
    ...r.blocks.map((b) => `| ${b.label} (${Math.round(b.weight * 100)} %) | ${sg(b.score)} | ${b.note} |`),
    `| **Total ponderado** | **${sg(r.total)}** | ${r.notes.join(" ") || "—"} |`,
    "",
    "**Plan de operación**",
    `- Zona de entrada: ${r.plan.entryLow !== null && r.plan.entryHigh !== null ? `${f(r.plan.entryLow)} – ${f(r.plan.entryHigh)}` : "no abrir posiciones nuevas"}`,
    `- Stop loss: ${f(r.plan.stop)} (${r.plan.stopReason})`,
    `- Objetivo 1 / Objetivo 2: ${f(r.plan.target1)} / ${f(r.plan.target2)}`,
    `- Ratio riesgo/beneficio: ${r.plan.rr === null ? "N/D" : `1:${r.plan.rr.toFixed(1)}`}`,
    `- Señal de invalidación: ${r.plan.invalidation}`,
    "",
    `**Tesis en 3 líneas:** ${r.thesis.join(" ")}`,
    `**Riesgos principales:** ${r.risks.map((x, i) => `${i + 1}) ${x}`).join(" ")}`,
    ...(r.newsSummary ? ["", `**Contexto de noticias:** ${r.newsSummary}`] : []),
    ...(r.news.length ? ["**Titulares recientes:**", ...r.news.map((n) => `- ${n.title} (${n.publisher}, ${n.publishedAt.toISOString().slice(0, 10)})`)] : []),
    "",
    DISCLAIMER,
  ];
  return lines.join("\n");
}
