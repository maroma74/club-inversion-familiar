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

test("lee el tamaño en píxeles de PNG, JPEG y WebP y rechaza imágenes desmesuradas", async () => {
  const { checkAvatar, imageDimensions, MAX_AVATAR_SIDE } = await import("./avatar");
  const png = (w: number, h: number) => {
    const b = new Uint8Array(33);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(b.buffer).setUint32(16, w); new DataView(b.buffer).setUint32(20, h);
    return b;
  };
  assert.deepEqual(imageDimensions(png(256, 256), "image/png"), { width: 256, height: 256 });
  assert.deepEqual(checkAvatar(png(256, 256)), { mime: "image/png" });
  assert.ok("error" in checkAvatar(png(50000, 50000)));
  assert.ok("error" in checkAvatar(png(MAX_AVATAR_SIDE + 1, 10)));

  // JPEG: APP0 de 16 bytes y después un SOF0 con alto 300 y ancho 200
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0), 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x00, 0xc8, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(imageDimensions(jpeg, "image/jpeg"), { width: 200, height: 300 });

  // WebP extendido (VP8X): ancho−1 y alto−1 en 24 bits little-endian a partir del byte 24
  const webp = new Uint8Array(30);
  webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, 0xff, 0x00, 0x00, 0x7f, 0x00, 0x00]);
  assert.deepEqual(imageDimensions(webp, "image/webp"), { width: 256, height: 128 });

  // Cabecera truncada: no se acepta
  assert.ok("error" in checkAvatar(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
});
