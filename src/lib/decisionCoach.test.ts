import { test } from "node:test";
import assert from "node:assert/strict";
import { COACH_MAX_MESSAGES, COACH_MAX_USER_CHARS, buildCoachSystemPrompt, coachRules, parseCoachMessages, type CoachContext } from "./decisionCoach";
import { hasSummary, parseCoachReply } from "./coachSummary";

const ctx: CoachContext = {
  firstName: "Pablo",
  familyName: "Familia Ruiz",
  monthLabel: "octubre de 2026",
  title: "Núcleo global de bajo coste",
  lesson: "Este mes comparamos fondos indexados.\n\nFíjate en las comisiones.",
  allocation: 20,
  minChoices: 1,
  maxChoices: 2,
  deadline: new Date("2026-10-26T21:59:00Z"),
  now: new Date("2026-10-23T10:00:00Z"),
  options: [
    { symbol: "VWCE.DE", name: "Vanguard FTSE All-World", kind: "ETF", note: "¿Cuántas empresas tiene dentro?", priceEur: 128.4, signal: "El club ve buena señal" },
    { symbol: "SAN.MC", name: "Banco Santander", kind: "STOCK", note: null, priceEur: null, signal: null },
  ],
};

test("las reglas dicen el importe, cuántas opciones, el plazo y cómo se gana el repaso", () => {
  const r = coachRules(ctx).join("\n");
  assert.match(r, /20,00 €/);
  assert.match(r, /entre 1 y 2 opciones/);
  assert.match(r, /se queda como efectivo/);
  assert.match(r, /26 de octubre \(quedan 4 días\)/);
  assert.match(r, /quien mejor explicó/);
  const single = coachRules({ ...ctx, maxChoices: 1 }).join("\n");
  assert.match(single, /una sola opción/);
  assert.doesNotMatch(single, /efectivo/);
});

test("el prompt lleva el nombre, las opciones con sus datos, la lección y las etiquetas del resumen", () => {
  const p = buildCoachSystemPrompt(ctx);
  assert.match(p, /Hablas con Pablo, de la Familia Ruiz/);
  assert.match(p, /VWCE\.DE: Vanguard FTSE All-World \(ETF/);
  assert.match(p, /precio ahora: 128,40 €/);
  assert.match(p, /qué investigar, según el presidente: ¿Cuántas empresas/);
  assert.match(p, /SAN\.MC: Banco Santander \(acción de una empresa\)$/m);
  assert.match(p, /Fíjate en las comisiones\./);
  assert.match(p, /<porque valor="SÍMBOLO">/);
  assert.match(p, /<idea>/);
});

test("la conversación válida empieza y acaba en el miembro y alterna turnos", () => {
  const ok = parseCoachMessages([{ role: "user", content: " hola " }, { role: "assistant", content: "¿Qué tal?" }, { role: "user", content: "bien" }]);
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.messages[0].content, "hola");
  for (const bad of [[], null, "hola", [{ role: "assistant", content: "x" }], [{ role: "user", content: "a" }, { role: "assistant", content: "b" }], [{ role: "user", content: "a" }, { role: "user", content: "b" }], [{ role: "user", content: "   " }], [{ role: "system", content: "x" }], [{ role: "user", content: 3 }]]) {
    assert.equal(parseCoachMessages(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseCoachMessages([{ role: "user", content: "x".repeat(COACH_MAX_USER_CHARS + 1) }]).ok, false);
  const long = Array.from({ length: COACH_MAX_MESSAGES + 1 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" }));
  assert.equal(parseCoachMessages(long).ok, false);
});

test("el resumen se separa en piezas para copiar, también a medio llegar", () => {
  const reply = 'Puedes copiar cada parte.\n<porque valor="VWCE.DE">Elijo VWCE porque tiene miles de empresas.</porque>\n<vender valor="VWCE.DE">Si sube la comisión.</vender>\n<idea>He aprendido que las comisiones importan.</idea>\n¡Suerte!';
  const pieces = parseCoachReply(reply);
  assert.deepEqual(pieces.map((p) => p.type), ["text", "porque", "vender", "idea", "text"]);
  assert.deepEqual(pieces[1], { type: "porque", symbol: "VWCE.DE", text: "Elijo VWCE porque tiene miles de empresas.", done: true });
  assert.ok(hasSummary(reply));
  assert.equal(hasSummary("Solo texto, sin resumen."), false);

  const partial = parseCoachReply('Vale.\n<porque valor="VWCE.DE">Elijo VWCE porque');
  assert.deepEqual(partial.at(-1), { type: "porque", symbol: "VWCE.DE", text: "Elijo VWCE porque", done: false });
  assert.deepEqual(parseCoachReply("Vale, aquí va.\n<porq"), [{ type: "text", text: "Vale, aquí va." }]);
  assert.deepEqual(parseCoachReply('Vale.\n<porque valor="VW'), [{ type: "text", text: "Vale." }]);
});
