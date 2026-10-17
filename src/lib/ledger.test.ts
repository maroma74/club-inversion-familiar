import { test } from "node:test";
import assert from "node:assert/strict";
import { firstOversell, sortTrades } from "./ledger";

const d = (s: string) => new Date(s + "T12:00:00");
const t = (symbol: string, side: "BUY" | "SELL", quantity: number, date: string, createdAt?: string) => ({ symbol, side, quantity, date: d(date), createdAt: createdAt ? new Date(createdAt) : null });

test("un historial coherente no tiene ventas en descubierto", () => {
  assert.equal(firstOversell([t("AAPL", "BUY", 10, "2026-01-05"), t("AAPL", "SELL", 4, "2026-02-01"), t("AAPL", "SELL", 6, "2026-03-01")]), null);
});

test("vender antes de comprar se detecta aunque al final de la historia haya posición", () => {
  // El truco de la auditoría: comprar hoy y «vender» con fecha de 1990 para fabricar efectivo
  const over = firstOversell([t("AAPL", "BUY", 1, "2026-10-01"), t("AAPL", "SELL", 1, "1990-01-01")]);
  assert.ok(over);
  assert.equal(over.symbol, "AAPL");
  assert.equal(over.held, 0);
  assert.equal(over.wanted, 1);
});

test("encoger o quitar una compra de la que después se vendió deja la venta en descubierto", () => {
  assert.ok(firstOversell([t("MSFT", "BUY", 0.000001, "2026-01-01"), t("MSFT", "SELL", 10, "2026-02-01")]));
  assert.ok(firstOversell([t("MSFT", "SELL", 10, "2026-02-01")]));
});

test("los símbolos no distinguen mayúsculas y el mismo día se ordena por registro", () => {
  assert.equal(firstOversell([t("san.mc", "BUY", 5, "2026-01-01", "2026-01-01T10:00:00Z"), t("SAN.MC", "SELL", 5, "2026-01-01", "2026-01-01T11:00:00Z")]), null);
  // Una operación nueva (sin createdAt) del mismo día va después de las ya registradas
  const sorted = sortTrades([t("X", "SELL", 1, "2026-01-01"), t("X", "BUY", 1, "2026-01-01", "2026-01-01T09:00:00Z")]);
  assert.equal(sorted[0].side, "BUY");
  assert.equal(firstOversell(sorted), null);
});

test("las cantidades fraccionarias toleran el redondeo", () => {
  assert.equal(firstOversell([t("BTC-EUR", "BUY", 0.1 + 0.2, "2026-01-01"), t("BTC-EUR", "SELL", 0.3, "2026-01-02")]), null);
});
