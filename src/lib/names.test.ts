import { test } from "node:test";
import assert from "node:assert/strict";
import { firstName, uniqueFirstNames } from "./names";

test("firstName devuelve solo el nombre de pila", () => {
  assert.equal(firstName("Miguel Angel Rodero Mateos"), "Miguel");
  assert.equal(firstName("  Lucía   García "), "Lucía");
  assert.equal(firstName("Pablo"), "Pablo");
  assert.equal(firstName(""), "");
  assert.equal(firstName(null), "");
  assert.equal(firstName(undefined), "");
});

test("uniqueFirstNames deja el nombre de pila cuando no hay repetidos", () => {
  const m = uniqueFirstNames([
    { id: "1", name: "Miguel Rodero" },
    { id: "2", name: "Lucía Rodero" },
  ]);
  assert.equal(m.get("1"), "Miguel");
  assert.equal(m.get("2"), "Lucía");
});

test("uniqueFirstNames distingue a dos miembros con el mismo nombre con la inicial del apellido", () => {
  const m = uniqueFirstNames([
    { id: "1", name: "Miguel Rodero Mateos" },
    { id: "2", name: "Miguel Rodero Pérez" },
    { id: "3", name: "Lucía Rodero" },
  ]);
  assert.equal(m.get("3"), "Lucía");
  assert.equal(m.get("1"), "Miguel M.");
  assert.equal(m.get("2"), "Miguel P.");
});

test("uniqueFirstNames numera si ni siquiera la inicial distingue", () => {
  const m = uniqueFirstNames([
    { id: "1", name: "Ana López" },
    { id: "2", name: "Ana Lara" },
  ]);
  const a = m.get("1")!;
  const b = m.get("2")!;
  assert.notEqual(a.toLowerCase(), b.toLowerCase());
  assert.match(a, /^Ana L\./);
  assert.match(b, /^Ana L\./);
});
