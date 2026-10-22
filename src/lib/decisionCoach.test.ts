import { test } from "node:test";
import assert from "node:assert/strict";
import { COACH_MAX_MESSAGES, COACH_MAX_USER_CHARS, buildCoachSystemPrompt, coachRules, parseCoachMessages, previewAllocation, type CoachContext } from "./decisionCoach";
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
  assert.match(r, /Se compran fracciones: .*20,00 € en un valor que cueste el doble compran media participación/);
  const single = coachRules({ ...ctx, maxChoices: 1 }).join("\n");
  assert.match(single, /una sola opción/);
  assert.doesNotMatch(single, /efectivo/);
});

test("el prompt por defecto sustituye sus variables: nombre, cartera con sus datos y lección, y reglas", () => {
  const p = buildCoachSystemPrompt(ctx);
  assert.doesNotMatch(p, /\{\{/);
  assert.match(p, /por su nombre: Pablo\./);
  assert.match(p, /Cartera disponible este mes: «Núcleo global de bajo coste» \(cartera de octubre de 2026\)/);
  assert.match(p, /VWCE\.DE: Vanguard FTSE All-World \(ETF/);
  assert.match(p, /precio ahora: 128,40 €/);
  assert.match(p, /qué investigar, según el presidente: ¿Cuántas empresas/);
  assert.match(p, /SAN\.MC: Banco Santander \(acción de una empresa\)$/m);
  assert.match(p, /Fíjate en las comisiones\./);
  assert.match(p, /Reglas y límites de inversión de este mes: \n- Este mes tiene 20,00 €/);
  // Las instrucciones de la app van siempre al final
  assert.match(p, /# INSTRUCCIONES DE LA APP[\s\S]*<porque valor="SÍMBOLO">…<\/porque> → casilla «¿Por qué eliges SÍMBOLO\?»[\s\S]*<vender valor="SÍMBOLO">[\s\S]*<idea>…<\/idea> → casilla «Tu idea general»[\s\S]*como si los escribiera Pablo/);
  assert.ok(p.trimEnd().endsWith("palabras sencillas."));
  // El paso 3 del prompt pide un texto por casilla, no un único bloque
  assert.match(p, /uno para cada casilla del formulario de su decisión/);
});

test("un prompt cambiado admite espacios en las variables y, si no usa la cartera o las reglas, se añaden", () => {
  const p = buildCoachSystemPrompt(ctx, "Eres un tutor de la {{ FAMILIA }} y hablas con {{NOMBRE_USUARIO}} de su paga. Sé breve y claro siempre.");
  assert.match(p, /^Eres un tutor de la Familia Ruiz y hablas con Pablo de su paga\./);
  assert.match(p, /# CARTERA DEL MES\n«Núcleo global de bajo coste»/);
  assert.match(p, /# REGLAS DEL MES\n- Este mes tiene 20,00 €/);
  assert.match(p, /# INSTRUCCIONES DE LA APP/);
  const withData = buildCoachSystemPrompt(ctx, "Tutor. Cartera: {{CARTERA_DEL_MES}}. Reglas: {{REGLAS_MES}}. Hablas con {{NOMBRE_USUARIO}}.");
  assert.doesNotMatch(withData, /# CARTERA DEL MES|# REGLAS DEL MES/);
  // El texto de las variables no se interpreta como patrón de reemplazo ($&, $1…)
  assert.match(buildCoachSystemPrompt({ ...ctx, firstName: "A$&B" }, "Hola {{NOMBRE_USUARIO}}, {{CARTERA_DEL_MES}} {{REGLAS_MES}}"), /^Hola A\$&B,/);
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

test("el bloque <resumen> sale aparte para copiarlo, también a medio llegar", () => {
  const pieces = parseCoachReply("Aquí tienes el resumen de tu razonamiento:\n<resumen>Elijo VWCE porque reparte el riesgo entre miles de empresas.</resumen>");
  assert.deepEqual(pieces, [
    { type: "text", text: "Aquí tienes el resumen de tu razonamiento:" },
    { type: "resumen", text: "Elijo VWCE porque reparte el riesgo entre miles de empresas.", done: true },
  ]);
  assert.deepEqual(parseCoachReply("Vale:\n<resumen>Elijo VW").at(-1), { type: "resumen", text: "Elijo VW", done: false });
  assert.deepEqual(parseCoachReply("Vale:\n<resu"), [{ type: "text", text: "Vale:" }]);
});

test("el presidente prueba con su importe, si no con la media asignada y si no con la paga de la familia", () => {
  const a = [{ userId: "hija", amount: 20 }, { userId: "hijo", amount: 30 }, { userId: "otro", amount: 0 }];
  assert.equal(previewAllocation([...a, { userId: "presi", amount: 15 }], "presi", 100), 15);
  assert.equal(previewAllocation(a, "presi", 100), 25);
  assert.equal(previewAllocation([], "presi", 40), 40);
  assert.equal(previewAllocation([], "presi", 0), 20);
});
