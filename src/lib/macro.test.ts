import { test } from "node:test";
import assert from "node:assert/strict";
import { macroAsOfLabel, parseEcbObservation, parseFredObservation } from "./macroData";
import { beatCount, parseEarnings, parseNextEarnings, parseRecommendation, summarizeConsensus } from "./finnhubData";

test("se lee la última observación del formato jsondata del BCE", () => {
  const json = {
    dataSets: [{ series: { "0:0:0:0:0:0": { observations: { "0": [2.25], "1": [2.5] } } } }],
    structure: { dimensions: { observation: [{ values: [{ id: "2026-06-11" }, { id: "2026-10-17" }] }] } },
  };
  assert.deepEqual(parseEcbObservation(json), { asOf: "2026-10-17", value: 2.5 });
  assert.equal(parseEcbObservation({}), null);
  assert.equal(parseEcbObservation({ dataSets: [{ series: {} }], structure: { dimensions: { observation: [{ values: [] }] } } }), null);
});

test("FRED: último dato y variación interanual del IPC saltando huecos", () => {
  assert.deepEqual(parseFredObservation({ observations: [{ date: "2026-10-15", value: "4.12" }, { date: "2026-10-14", value: "." }] }), { asOf: "2026-10-15", value: 4.12 });
  const months = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.UTC(2026, 8 - i, 1)); return { date: d.toISOString().slice(0, 10), value: String(300 + (13 - i)) }; });
  // último 313 (2026-09-01) frente a 301 (2025-09-01): +3,99 % → 4 %
  assert.deepEqual(parseFredObservation({ observations: months }, true), { asOf: "2026-09-01", value: 4 });
  assert.equal(parseFredObservation({ observations: months.slice(0, 6) }, true), null);
});

test("etiquetas de fecha del contexto macro", () => {
  assert.equal(macroAsOfLabel("2026-10-17"), "17/10/2026");
  assert.match(macroAsOfLabel("2025-12"), /^dic 2025$/);
});

test("Finnhub: consenso, sorpresas y próxima fecha", () => {
  const rec = parseRecommendation([{ period: "2026-09-01", strongBuy: 10, buy: 15, hold: 5, sell: 1, strongSell: 0 }, { period: "2026-08-01", strongBuy: 1, buy: 1, hold: 1 }]);
  assert.equal(rec?.period, "2026-09-01");
  const s = summarizeConsensus(rec);
  assert.deepEqual([s.total, s.buyPct, s.sellPct, s.label], [31, 81, 3, "Comprar"]);
  assert.equal(summarizeConsensus({ period: "x", strongBuy: 1, buy: 0, hold: 1, sell: 0, strongSell: 0 }).label, "Sin consenso");
  assert.equal(summarizeConsensus({ period: "x", strongBuy: 0, buy: 1, hold: 4, sell: 5, strongSell: 0 }).label, "Vender");
  const e = parseEarnings([{ period: "2026-06-30", actual: 1.05, estimate: 0.98 }, { period: "2026-03-31", actual: 0.9, estimate: 0.95 }, { period: "2025-12-31", actual: null, estimate: 1 }]);
  assert.equal(e.length, 2);
  assert.deepEqual(beatCount(e), { beats: 1, total: 2 });
  assert.equal(parseNextEarnings({ earningsCalendar: [{ date: "2026-01-20" }, { date: "2026-11-02" }, { date: "2027-02-01" }] }, "2026-10-17"), "2026-11-02");
  assert.equal(parseNextEarnings({ earningsCalendar: [] }, "2026-10-17"), null);
});
