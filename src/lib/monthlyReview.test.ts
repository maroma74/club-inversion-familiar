import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReview } from "./monthlyReview";

const options = [
  { id: "o1", symbol: "AAPL", name: "Apple", kind: "STOCK", note: null },
  { id: "o2", symbol: "KO", name: "Coca-Cola", kind: "STOCK", note: null },
  { id: "o3", symbol: "BTC-EUR", name: "Bitcoin", kind: "CRYPTO", note: null },
];
const when = new Date("2026-06-01T10:00:00Z");

test("rendimiento de cada opción desde la decisión y qué habría sido mejor", () => {
  const review = buildReview({
    options,
    decisions: [
      { id: "d1", userId: "u1", userName: "Lucía", argument: "a", submittedAt: when, choices: [{ id: "c1", optionId: "o1", amount: 100, price: 200, quantity: 0.5, why: "x", exitCondition: null }] },
      { id: "d2", userId: "u2", userName: "Pablo", argument: "b", submittedAt: when, choices: [{ id: "c2", optionId: "o2", amount: 60, price: 50, quantity: 1.2, why: "y", exitCondition: null }, { id: "c3", optionId: "o1", amount: 40, price: 210, quantity: null, why: "z", exitCondition: null }] },
    ],
    pricesNow: new Map([["AAPL", 240], ["KO", 45], ["BTC-EUR", 80000]]),
    pricesAtPublish: new Map([["BTC-EUR", 64000]]),
  });
  const aapl = review.options.find((o) => o.symbol === "AAPL")!;
  assert.equal(aapl.priceThen, 205, "media de lo que pagaron los miembros");
  assert.ok(Math.abs((aapl.changePct as number) - (240 / 205 - 1)) < 1e-9);
  assert.deepEqual(aapl.pickedBy, ["Lucía", "Pablo"]);
  const btc = review.options.find((o) => o.symbol === "BTC-EUR")!;
  assert.equal(btc.priceThen, 64000, "nadie la eligió: cierre del día de la publicación");
  assert.equal(btc.rank, 1, "bitcoin subió un 25 %: la mejor");
  assert.equal(review.best?.symbol, "BTC-EUR");
  assert.equal(review.options.find((o) => o.symbol === "KO")!.rank, 3);

  const lucia = review.decisions.find((d) => d.userName === "Lucía")!;
  assert.equal(lucia.valueNow, 120);
  assert.ok(Math.abs((lucia.changePct as number) - 0.2) < 1e-9);
  assert.deepEqual(lucia.bestAlternative, { symbol: "BTC-EUR", changePct: 0.25, valueIfBest: 125 });
  const pablo = review.decisions.find((d) => d.userName === "Pablo")!;
  // KO: 1,2 uds × 45 = 54; AAPL sin cantidad guardada: 40/210 uds × 240 = 45,71
  assert.equal(pablo.valueNow, 99.71);
  assert.equal(lucia.rank, 1);
  assert.equal(pablo.rank, 2);
});

test("sin precio actual no se inventan rendimientos ni puestos", () => {
  const review = buildReview({
    options,
    decisions: [{ id: "d1", userId: "u1", userName: "Lucía", argument: "a", submittedAt: when, choices: [{ id: "c1", optionId: "o1", amount: 100, price: 200, quantity: 0.5, why: "x", exitCondition: null }] }],
    pricesNow: new Map(),
    pricesAtPublish: new Map(),
  });
  assert.equal(review.best, null);
  assert.equal(review.decisions[0].valueNow, null);
  assert.equal(review.decisions[0].rank, null);
  assert.ok(review.options.every((o) => o.rank === null && o.changePct === null));
});
