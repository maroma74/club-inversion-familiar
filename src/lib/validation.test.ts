import { test } from "node:test";
import assert from "node:assert/strict";
import { clubEndOfDay, currentMonthYm, monthSchema, nameText, newPasswordSchema, parseDay, parsePastDay, todayYmd } from "./validation";

test("el plazo termina a las 23:59 de Madrid, con horario de verano y de invierno", () => {
  assert.equal(clubEndOfDay("2026-10-18")?.toISOString(), "2026-10-18T21:59:00.000Z"); // CEST, UTC+2
  assert.equal(clubEndOfDay("2026-11-10")?.toISOString(), "2026-11-10T22:59:00.000Z"); // CET, UTC+1
  assert.equal(clubEndOfDay("2026-10-25")?.toISOString(), "2026-10-25T22:59:00.000Z"); // día del cambio de hora
  assert.equal(clubEndOfDay("2026-02-30"), null);
  assert.equal(todayYmd(clubEndOfDay("2026-10-18")!), "2026-10-18");
});

test("hoy se decide en hora de España, no en la del servidor", () => {
  // 23:30 UTC del 16 de octubre ya es 17 de octubre en Madrid (CEST)
  assert.equal(todayYmd(new Date("2026-10-16T23:30:00Z")), "2026-10-17");
  // 00:30 UTC del 1 de noviembre todavía es 1 de noviembre en Madrid (CET): el mes nuevo ya ha empezado
  assert.equal(currentMonthYm(new Date("2026-11-01T00:30:00Z")), "2026-11");
});

test("una operación con la fecha de hoy nunca se rechaza como futura, a cualquier hora", () => {
  // Antes fallaba por la mañana: el mediodía del día se comparaba con el instante actual en UTC
  const earlyMorning = new Date("2026-10-17T06:00:00Z"); // 08:00 en Madrid
  const r = parsePastDay("2026-10-17", earlyMorning);
  assert.ok("date" in r);
  assert.deepEqual(parsePastDay("2026-10-18", earlyMorning), { error: "La fecha no puede ser futura" });
  assert.deepEqual(parsePastDay("1989-12-31", earlyMorning), { error: "Fecha demasiado antigua" });
});

test("solo fechas reales del calendario", () => {
  assert.equal(parseDay("2026-02-31"), null);
  assert.equal(parseDay("2026-13-01"), null);
  assert.equal(parseDay("2026-2-1"), null);
  assert.equal(parseDay("2026-02-28")?.getDate(), 28);
});

test("meses estrictos", () => {
  assert.ok(monthSchema.safeParse("2026-12").success);
  assert.ok(!monthSchema.safeParse("2026-13").success);
  assert.ok(!monthSchema.safeParse("2026-00").success);
  assert.ok(!monthSchema.safeParse("2026-1").success);
});

test("nombres sin caracteres de control; contraseñas de 10 a 72", () => {
  assert.ok(nameText(60, 2).safeParse("Familia Pérez-García").success);
  assert.ok(!nameText(60, 2).safeParse("Pérez\r\nBcc: otro").success);
  assert.ok(!nameText(60, 2).safeParse("P").success);
  assert.ok(!newPasswordSchema.safeParse("corta1234").success);
  assert.ok(newPasswordSchema.safeParse("una-frase-larga-10").success);
  assert.ok(!newPasswordSchema.safeParse("x".repeat(73)).success);
});
