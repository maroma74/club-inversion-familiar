import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStep, setupProgress, setupSteps, type SetupFacts } from "./setup";

const fresh: SetupFacts = { allowanceConfirmed: false, members: 0, pendingInvites: 0, portfolio: null, hasClosed: false };

test("un club recién creado empieza por la paga y tiene siete pasos", () => {
  const steps = setupSteps(fresh);
  assert.equal(steps.length, 7);
  const p = setupProgress(steps);
  assert.equal(p.done, 0);
  assert.equal(p.current?.id, "club");
  assert.equal(p.complete, false);
});

test("los pasos avanzan con datos reales: borrador, publicada, avisada y decidida", () => {
  const base = { ...fresh, allowanceConfirmed: true, members: 2 };
  const draft = setupSteps({ ...base, portfolio: { status: "DRAFT", deciders: 3, decided: 0, deadlinePassed: false, notified: false } });
  assert.equal(setupProgress(draft).current?.id, "publicar");
  const published = setupSteps({ ...base, portfolio: { status: "PUBLISHED", deciders: 3, decided: 1, deadlinePassed: false, notified: true } });
  assert.equal(setupProgress(published).current?.id, "deciden");
  const allDecided = setupSteps({ ...base, portfolio: { status: "PUBLISHED", deciders: 3, decided: 3, deadlinePassed: false, notified: true } });
  assert.equal(setupProgress(allDecided).current?.id, "repaso");
  const late = setupSteps({ ...base, portfolio: { status: "PUBLISHED", deciders: 3, decided: 1, deadlinePassed: true, notified: true } });
  assert.equal(setupProgress(late).current?.id, "repaso");
});

test("con el primer repaso hecho el club está en marcha", () => {
  const steps = setupSteps({ ...fresh, allowanceConfirmed: true, members: 1, hasClosed: true, portfolio: { status: "CLOSED", deciders: 2, decided: 2, deadlinePassed: true, notified: false } });
  const p = setupProgress(steps);
  assert.equal(p.complete, true);
  assert.equal(p.done, 7);
});

test("se puede abrir cualquier paso por su nombre o número; si no, el primero pendiente", () => {
  const steps = setupSteps({ ...fresh, allowanceConfirmed: true });
  assert.equal(pickStep(steps, undefined).id, "hijos");
  assert.equal(pickStep(steps, "cartera").id, "cartera");
  assert.equal(pickStep(steps, "5").id, "avisar");
  assert.equal(pickStep(steps, "nada").id, "hijos");
});
