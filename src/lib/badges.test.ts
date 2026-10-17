import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBadges } from "./badges";
import type { PortfolioSummary } from "./portfolio";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const holding = (symbol: string, value: number) => ({ symbol, name: symbol, quantity: 1, avgCost: value, invested: value, price: value, value, pnl: 0, pnlPct: 0, stale: false, updatedAt: null, brokers: [] });
const member = (over: Partial<PortfolioSummary> = {}): PortfolioSummary => ({
  userId: "u1", userName: "Lucía", avatarUpdatedAt: null, contributed: 1000, cash: 50, invested: 950, marketValue: 1100, totalValue: 1150, realized: 0, pnl: 150, returnPct: 0.15,
  holdings: [holding("SAN.MC", 300), holding("VWCE.DE", 300), holding("MSFT", 300), holding("BTC-EUR", 200)], trades: 4, contributions: [], missingPrices: [], ...over,
});
const earned = (p: ReturnType<typeof computeBadges>) => new Set(p.badges.filter((b) => b.earned).map((b) => b.id));

test("hay 27 logros y los nuevos se calculan con los datos extra", () => {
  const trades = [
    { id: "t1", symbol: "SAN.MC", side: "BUY", date: daysAgo(400), currency: "EUR" },
    { id: "t2", symbol: "VWCE.DE", side: "BUY", date: daysAgo(100), currency: "EUR" },
    { id: "t3", symbol: "MSFT", side: "BUY", date: daysAgo(30), currency: "USD" },
    { id: "t4", symbol: "BTC-EUR", side: "BUY", date: daysAgo(10), currency: "EUR" },
    { id: "t5", symbol: "GC=F", side: "BUY", date: daysAgo(5), currency: "USD" },
  ];
  const contributions = [{ date: daysAgo(400), note: null }, { date: daysAgo(370), note: null }, { date: daysAgo(340), note: null }];
  const p = computeBadges(member(), trades, contributions, 2, 5, 12, {
    journalEntries: 12, buysWithJournal: 5, allCoursesCompleted: true, decisions: 3, decisionsOnTime: 3, longestArgument: 420, etfSymbols: new Set(["VWCE.DE"]),
  });
  assert.equal(p.badges.length, 27);
  const e = earned(p);
  for (const id of ["ten", "patience", "balanced", "home", "fund", "commodity", "chronicler", "why", "student", "graduate", "decided", "punctual", "arguer", "podium"]) assert.ok(e.has(id), `falta ${id}`);
  assert.ok(!e.has("veteran"), "veterano exige 25 operaciones");
  assert.ok(!e.has("leader"));
});

test("sin datos extra los logros nuevos no se conceden y los antiguos siguen igual", () => {
  const p = computeBadges(member({ holdings: [holding("MSFT", 1100)], returnPct: 0.02 }), [{ symbol: "MSFT", side: "BUY", date: daysAgo(10), currency: "USD" }], [], 0, 2, 0);
  const e = earned(p);
  assert.deepEqual([...e].sort(), ["allin", "first", "global", "green", "leader"]);
});

test("cartera equilibrada exige cuatro activos sin ninguno por encima del 40 %", () => {
  const unbalanced = member({ holdings: [holding("A", 700), holding("B", 100), holding("C", 100), holding("D", 100)], marketValue: 1000 });
  assert.ok(!earned(computeBadges(unbalanced, [], [], 0, 1)).has("balanced"));
  const balanced = member({ holdings: [holding("A", 250), holding("B", 250), holding("C", 250), holding("D", 250)], marketValue: 1000 });
  assert.ok(earned(computeBadges(balanced, [], [], 0, 1)).has("balanced"));
});
