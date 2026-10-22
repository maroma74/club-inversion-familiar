import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_MODELS, DEFAULT_AI_MODEL, aiModelName, isAiModel } from "./aiModels";

test("el modelo por defecto es Claude Opus 5.5 y está en la lista", () => {
  assert.equal(DEFAULT_AI_MODEL, "claude-opus-5-5");
  assert.ok(isAiModel(DEFAULT_AI_MODEL));
});

test("solo se aceptan modelos de la lista, sin repetidos", () => {
  assert.equal(new Set(AI_MODELS.map((m) => m.id)).size, AI_MODELS.length);
  for (const m of AI_MODELS) assert.ok(isAiModel(m.id));
  for (const bad of ["", "gpt-5", "claude-opus-5-5 ", "CLAUDE-OPUS-5-5", null, undefined, 42]) assert.equal(isAiModel(bad), false);
});

test("el nombre legible cae al id si el modelo no está en la lista", () => {
  assert.equal(aiModelName("claude-sonnet-5-5"), "Claude Sonnet 5.5");
  assert.equal(aiModelName("claude-desconocido"), "claude-desconocido");
});
