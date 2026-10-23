import { test } from "node:test";
import assert from "node:assert/strict";
import { isActionRequest } from "./actionRequest";

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

test("una acción de servidor se reconoce con o sin JavaScript", () => {
  assert.equal(isActionRequest(h({ "next-action": "abc123" })), true);
  assert.equal(isActionRequest(h({ "content-type": "multipart/form-data; boundary=----x" })), true);
  assert.equal(isActionRequest(h({ "content-type": "Application/X-WWW-Form-URLEncoded" })), true);
});

test("una página o un JSON no cuentan como acción", () => {
  assert.equal(isActionRequest(h({})), false);
  assert.equal(isActionRequest(h({ accept: "text/html" })), false);
  assert.equal(isActionRequest(h({ "content-type": "application/json" })), false);
  assert.equal(isActionRequest(h({ "content-type": "text/plain" })), false);
});
