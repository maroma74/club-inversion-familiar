import { test } from "node:test";
import assert from "node:assert/strict";
import { isAcceptableSecret } from "./secretPolicy";

test("se rechazan los secretos de ejemplo aunque sean largos", () => {
  assert.equal(isAcceptableSecret("cambia-esta-clave-por-una-larga-y-aleatoria"), false);
  assert.equal(isAcceptableSecret("pon-aqui-una-cadena-larga-y-secreta-de-verdad"), false);
  assert.equal(isAcceptableSecret("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), false);
  assert.equal(isAcceptableSecret("corto"), false);
});

test("un secreto aleatorio de 32+ caracteres vale", () => {
  assert.equal(isAcceptableSecret("Zq9vL2mX7bT4kR8nW1pH5sD3fG6jY0cE"), true);
  assert.equal(isAcceptableSecret("k8/3F+Qw1zXm9Lp2Rt7Yb4Nc6Vd0Hg5JsAe1UiOo3PqWz="), true);
});
