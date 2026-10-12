import { test } from "node:test";
import assert from "node:assert/strict";
import { sniffImageMime } from "./avatar";

const bytes = (...n: number[]) => new Uint8Array(n);

test("reconoce JPEG, PNG y WebP por sus primeros bytes", () => {
  assert.equal(sniffImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0)), "image/jpeg");
  assert.equal(sniffImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "image/png");
  assert.equal(sniffImageMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)), "image/webp");
});

test("rechaza SVG, GIF, texto y datos vacíos o truncados", () => {
  assert.equal(sniffImageMime(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
  assert.equal(sniffImageMime(new TextEncoder().encode("GIF89a....")), null);
  assert.equal(sniffImageMime(new TextEncoder().encode("hola")), null);
  assert.equal(sniffImageMime(new Uint8Array(0)), null);
  assert.equal(sniffImageMime(bytes(0xff, 0xd8)), null);
  // RIFF que no es WebP (p. ej. un WAV)
  assert.equal(sniffImageMime(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)), null);
});
