import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORTFOLIO_TEMPLATE, formatPhone, normalizePhone, renderMessage, templateProblems, whatsappLink } from "./communications";

test("teléfonos españoles e internacionales se normalizan a formato internacional", () => {
  assert.equal(normalizePhone("612 345 678"), "+34612345678");
  assert.equal(normalizePhone("+34 612-345-678"), "+34612345678");
  assert.equal(normalizePhone("0034612345678"), "+34612345678");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("12"), null);
  assert.equal(normalizePhone("hola"), null);
  assert.equal(formatPhone("+34612345678"), "+34 612 345 678");
});

test("el mensaje lleva los datos de la cartera y el enlace, y el enlace de WhatsApp lo codifica", () => {
  const text = renderMessage(DEFAULT_PORTFOLIO_TEMPLATE, { nombre: "Lucía", presidente: "Miguel", familia: "Familia Rodero", mes: "octubre de 2026", titulo: "Tecnología o consumo", importe: "100,00 €", opciones: 4, minimo: 1, maximo: 2, plazo: "hasta el 18/10/2026", enlace: "https://clubdeinversionfamiliar.com/cartera" });
  assert.match(text, /^¡Hola, Lucía!/);
  assert.ok(text.includes("*Tecnología o consumo*"));
  assert.ok(text.includes("100,00 € para invertir entre 4 opciones (elige de 1 a 2), hasta el 18/10/2026."));
  assert.ok(text.includes("https://clubdeinversionfamiliar.com/cartera"));
  assert.ok(text.endsWith("Miguel · Club de Inversión de Familia Rodero"));
  const link = whatsappLink("+34612345678", text);
  assert.ok(link.startsWith("https://wa.me/34612345678?text=%C2%A1Hola%2C%20Luc%C3%ADa!"));
  assert.equal(renderMessage("{eleccion}{plazo}", { nombre: "", presidente: "", familia: "", mes: "", titulo: "", importe: "", opciones: 3, minimo: 1, maximo: 1, plazo: "", enlace: "" }), "elige una");
});

test("la plantilla exige el marcador del enlace", () => {
  assert.deepEqual(templateProblems(DEFAULT_PORTFOLIO_TEMPLATE), []);
  assert.ok(templateProblems("Hola {nombre}, ya está la cartera del mes. Entra y decide cuanto antes.")[0].includes("{enlace}"));
});
