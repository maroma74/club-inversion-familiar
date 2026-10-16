import { test } from "node:test";
import assert from "node:assert/strict";
import { isNeutral, neutralIssues, PROPOSAL_THEMES, proposalProblems, proposalSignature, type ProposalInput } from "./proposals";
import { PROPOSALS } from "../../prisma/proposals-data";
import { isCommodity } from "./commodities";

const base: ProposalInput = {
  title: "Dividendos de calidad",
  lesson: "x".repeat(300),
  theme: "Dividendos",
  risk: 2,
  minChoices: 1,
  maxChoices: 2,
  options: [
    { symbol: "KO", name: "Coca-Cola", kind: "STOCK", note: "Mira el payout." },
    { symbol: "PEP", name: "PepsiCo", kind: "STOCK", note: "Compara el PER." },
  ],
};

test("el texto neutro no contiene meses, años ni referencias a periodos", () => {
  assert.equal(isNeutral("Cartera de dividendos para el largo plazo con empresas estables."), true);
  assert.equal(isNeutral("Una inversión a 10 años en un fondo diversificado."), true); // una duración no es un periodo concreto
});

test("se detectan los nombres de mes, con o sin mayúsculas y tildes", () => {
  assert.ok(neutralIssues("Cartera de octubre").some((i) => i.label === "nombres de mes"));
  assert.ok(neutralIssues("SEPTIEMBRE y Diciembre").some((i) => i.found.includes("septiembre") && i.found.includes("diciembre")));
  assert.equal(isNeutral("El mayor banco del mundo"), true); // «mayor» no es «mayo»
});

test("se detectan los años y las referencias al momento actual", () => {
  assert.ok(neutralIssues("Resultados de 2026").some((i) => i.label === "años"));
  assert.equal(isNeutral("Una década de 1990 a 2000"), false);
  for (const t of ["hoy cotiza barata", "actualmente paga dividendo", "ahora mismo está en máximos", "ha subido recientemente", "en la actualidad"]) assert.equal(isNeutral(t), false, t);
});

test("se detectan «mes», «semana», trimestres y periodos relativos", () => {
  for (const t of ["la cartera del mes", "durante este mes", "cada mes aportas", "hace seis meses", "la semana pasada", "esta semana", "el trimestre anterior", "resultados trimestrales", "el próximo año", "este año", "el último trimestre", "del semestre", "verano pasado"]) assert.equal(isNeutral(t), false, t);
});

test("palabras parecidas que no son de tiempo no dan falso positivo", () => {
  for (const t of ["diversificación mensajera", "mesa de dinero", "semanario", "preseleccionar", "marzoleta"]) assert.equal(isNeutral(t), true, t);
});

test("una propuesta correcta no tiene problemas", () => {
  assert.deepEqual(proposalProblems(base), []);
});

test("límites: título, lección, número de opciones y elecciones", () => {
  assert.ok(proposalProblems({ ...base, title: "ab" }).some((p) => /título/.test(p)));
  assert.ok(proposalProblems({ ...base, lesson: "corta" }).some((p) => /demasiado corta/.test(p)));
  assert.ok(proposalProblems({ ...base, lesson: "x".repeat(9000) }).some((p) => /demasiado larga/.test(p)));
  assert.ok(proposalProblems({ ...base, options: [base.options[0]], maxChoices: 1 }).some((p) => /al menos 2 opciones/.test(p)));
  const many = Array.from({ length: 13 }, (_, i) => ({ symbol: `S${i}`, name: `S${i}`, kind: "STOCK", note: "" }));
  assert.ok(proposalProblems({ ...base, options: many, maxChoices: 3 }).some((p) => /Máximo 12 opciones/.test(p)));
  assert.ok(proposalProblems({ ...base, minChoices: 3, maxChoices: 2 }).some((p) => /mínimo no puede superar/.test(p)));
  assert.ok(proposalProblems({ ...base, minChoices: 1, maxChoices: 3 }).some((p) => /no puede ser mayor que el número de opciones/.test(p)));
  assert.ok(proposalProblems({ ...base, maxChoices: 11 }).length > 0);
});

test("tema, riesgo, duplicados, tipo y nota larga", () => {
  assert.ok(proposalProblems({ ...base, theme: "Inventado" }).some((p) => /tema/.test(p)));
  assert.ok(proposalProblems({ ...base, risk: 0 }).some((p) => /riesgo/.test(p)));
  assert.ok(proposalProblems({ ...base, risk: 6 }).some((p) => /riesgo/.test(p)));
  assert.ok(proposalProblems({ ...base, options: [base.options[0], { ...base.options[0] }] }).some((p) => /repetido/.test(p)));
  assert.ok(proposalProblems({ ...base, options: [base.options[0], { symbol: "PEP", name: "Pepsi", kind: "BOND", note: "" }] }).some((p) => /tipo/.test(p)));
  assert.ok(proposalProblems({ ...base, options: [base.options[0], { symbol: "PEP", name: "Pepsi", kind: "STOCK", note: "n".repeat(301) }] }).some((p) => /nota/.test(p)));
});

test("el texto no neutro del título, la lección o una nota impide publicar y dice dónde está", () => {
  assert.ok(proposalProblems({ ...base, title: "Cartera de octubre" }).some((p) => /en el título/.test(p) && /octubre/.test(p)));
  assert.ok(proposalProblems({ ...base, lesson: base.lesson + " Este mes toca invertir." }).some((p) => /en la lección/.test(p)));
  assert.ok(proposalProblems({ ...base, options: [{ ...base.options[0], note: "Resultados del trimestre" }, base.options[1]] }).some((p) => /nota de KO/.test(p)));
});

test("la firma: club, familia firmante o anónima", () => {
  assert.equal(proposalSignature({ source: "CLUB", signed: false }), "Club de Inversión");
  assert.equal(proposalSignature({ source: "FAMILY", signed: true, familyName: "Familia Pérez" }), "Familia Pérez");
  assert.equal(proposalSignature({ source: "FAMILY", signed: false, familyName: "Familia Pérez" }), "Anónima"); // nunca se revela el nombre
  assert.equal(proposalSignature({ source: "FAMILY", signed: true, familyName: null }), "Anónima");
});

// ----------------------------------------------------------------- las 20 propuestas del club

test("hay 20 propuestas del club con identificadores y títulos únicos", () => {
  assert.equal(PROPOSALS.length, 20);
  assert.equal(new Set(PROPOSALS.map((p) => p.slug)).size, 20);
  assert.equal(new Set(PROPOSALS.map((p) => p.title)).size, 20);
});

test("todas las propuestas del club cumplen la normativa y tienen texto neutro", () => {
  for (const p of PROPOSALS) {
    assert.deepEqual(proposalProblems(p), [], `${p.slug}: ${proposalProblems(p).join(" | ")}`);
  }
});

test("las propuestas del club usan todos los temas, niveles de riesgo variados y avisan de que son educativas", () => {
  assert.deepEqual(new Set(PROPOSALS.map((p) => p.theme)), new Set(PROPOSAL_THEMES));
  const risks = new Set(PROPOSALS.map((p) => p.risk));
  for (const r of [1, 2, 3, 4, 5]) assert.ok(risks.has(r as 1), `falta riesgo ${r}`);
  for (const p of PROPOSALS) {
    assert.match(p.lesson, /no es asesoramiento financiero/, p.slug);
    for (const heading of ["## La idea", "## Las opciones", "## Qué investigar antes de decidir", "## Cómo decidir", "> **Idea clave:**"]) assert.ok(p.lesson.includes(heading), `${p.slug} no tiene «${heading}»`);
  }
});

test("el tipo de cada opción es coherente con su símbolo", () => {
  const crypto = /^[A-Z0-9]{2,10}-(EUR|USD|GBP|USDT)$/;
  for (const p of PROPOSALS) {
    for (const o of p.options) {
      assert.equal(o.kind === "CRYPTO", crypto.test(o.symbol), `${p.slug} ${o.symbol}`);
      assert.equal(o.kind === "COMMODITY", isCommodity(o.symbol), `${p.slug} ${o.symbol}`); // las materias primas son las del catálogo del club
      assert.ok(o.note.length >= 40, `${p.slug} ${o.symbol}: nota demasiado corta para guiar la investigación`);
    }
  }
});
