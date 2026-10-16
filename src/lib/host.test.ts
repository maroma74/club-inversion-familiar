import { test } from "node:test";
import assert from "node:assert/strict";
import { isDirectRunHost } from "./host";

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

test("la URL directa de Cloud Run se detecta por Host", () => {
  assert.equal(isDirectRunHost(h({ host: "club-inversion-790874739436.europe-southwest1.run.app" })), true);
  assert.equal(isDirectRunHost(h({ host: "Club-Inversion-1.EUROPE-SOUTHWEST1.RUN.APP:443" })), true);
});

test("el dominio del club no se marca, ni siquiera si Host es el de Cloud Run", () => {
  assert.equal(isDirectRunHost(h({ host: "clubdeinversionfamiliar.com" })), false);
  assert.equal(isDirectRunHost(h({ host: "club-inversion-1.europe-southwest1.run.app", "x-forwarded-host": "clubdeinversionfamiliar.com" })), false);
  assert.equal(isDirectRunHost(h({ host: "localhost:3005" })), false);
  assert.equal(isDirectRunHost(h({})), false);
});

test("un dominio que solo contiene run.app no cuenta", () => {
  assert.equal(isDirectRunHost(h({ host: "run.app.evil.com" })), false);
  assert.equal(isDirectRunHost(h({ "x-forwarded-host": "a.run.app, clubdeinversionfamiliar.com" })), true);
});
