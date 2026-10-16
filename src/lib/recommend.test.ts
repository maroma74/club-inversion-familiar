import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, type Candle } from "./technical";
import { recommend } from "./recommend";
import { PER_CONFIG } from "./perConfig";

/** 400 velas diarias con tendencia y ruido determinista (sin azar: las pruebas deben ser repetibles). */
function candles(): Candle[] {
  const out: Candle[] = [];
  let p = 100;
  for (let i = 0; i < 400; i++) {
    p *= 1 + 0.0012 + Math.sin(i / 7) * 0.012 + Math.cos(i / 3) * 0.004;
    const date = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);
    out.push({ date, open: p * 0.998, high: p * 1.01, low: p * 0.99, close: p, volume: 1_000_000 + (i % 9) * 90_000 });
  }
  return out;
}

const meta = { ticker: "TEST", name: "Test Inc", currency: "USD" };
const sum = (r: ReturnType<typeof recommend>) => r.blocks.reduce((s, b) => s + b.weight, 0);

test("sin datos de PER la recomendación conserva exactamente los cuatro bloques de siempre", () => {
  const r = recommend(analyze(candles()), meta, {});
  assert.deepEqual(r.blocks.map((b) => b.key), ["trend", "momentum", "volume", "structure"]);
  assert.deepEqual(r.blocks.map((b) => b.weight), [0.3, 0.25, 0.2, 0.25]);
  assert.ok(Math.abs(sum(r) - 1) < 1e-9);
});

test("con PER se añade un quinto bloque con el peso configurado y todo sigue sumando 1", () => {
  const w = PER_CONFIG.recommendationWeight;
  const r = recommend(analyze(candles()), meta, { valuation: { score: 1.5, weight: w, per: 18.2, percentile: 12, rangeLabel: "5 años", signal: "Barata", valueTrap: false, reason: "PER bajo" } });
  assert.deepEqual(r.blocks.map((b) => b.key), ["trend", "momentum", "volume", "structure", "valuation"]);
  const v = r.blocks[4];
  assert.equal(v.weight, w);
  assert.equal(v.score, 1.5);
  assert.match(v.note, /PER 18,2/); // formato español: coma decimal
  assert.match(v.note, /percentil 12/);
  assert.ok(Math.abs(sum(r) - 1) < 1e-9);
  // los técnicos se reescalan en proporción
  const base = recommend(analyze(candles()), meta, {});
  r.blocks.slice(0, 4).forEach((b, i) => assert.ok(Math.abs(b.weight - base.blocks[i].weight * (1 - w)) < 1e-9));
});

test("una valoración favorable sube la puntuación total y una cara la baja, sin tocar los bloques técnicos", () => {
  const a = analyze(candles());
  const base = recommend(a, meta, {});
  const barata = recommend(a, meta, { valuation: { score: 1.5, weight: 0.3, per: 15, percentile: 10, rangeLabel: "5 años", signal: "Barata", valueTrap: false, reason: "" } });
  const cara = recommend(a, meta, { valuation: { score: -1.5, weight: 0.3, per: 45, percentile: 95, rangeLabel: "5 años", signal: "Cara", valueTrap: false, reason: "Más caro que casi todo el periodo" } });
  assert.ok(barata.total > cara.total);
  base.blocks.forEach((b, i) => {
    assert.equal(barata.blocks[i].score, b.score);
    assert.equal(cara.blocks[i].score, b.score);
  });
  assert.ok(cara.risks.some((x) => /Valoración exigente/.test(x)) || cara.risks.length === 3);
});

test("la trampa de valor avisa en los riesgos y no suma puntos", () => {
  const a = analyze(candles());
  const r = recommend(a, meta, { valuation: { score: 0, weight: 0.15, per: 9, percentile: 8, rangeLabel: "5 años", signal: "Neutral", valueTrap: true, reason: "PER bajo, pero el beneficio por acción está cayendo: posible trampa de valor." } });
  assert.equal(r.blocks[4].score, 0);
  assert.match(r.blocks[4].note, /posible trampa de valor/);
  assert.ok(r.risks.some((x) => /trampa de valor/.test(x)));
});

test("un peso de 0 o fuera de rango desactiva el bloque", () => {
  const a = analyze(candles());
  for (const weight of [0, 1, 1.5, -0.1]) {
    const r = recommend(a, meta, { valuation: { score: 1.5, weight, per: 15, percentile: 10, rangeLabel: "5 años", signal: "Barata", valueTrap: false, reason: "" } });
    assert.equal(r.blocks.length, 4, `peso ${weight}`);
  }
});
