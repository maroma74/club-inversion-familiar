import { test } from "node:test";
import assert from "node:assert/strict";
import { invitationWhatsAppText, whatsappShareLink } from "./invitationMessages";

test("el texto de WhatsApp lleva remitente, enlace, código y caducidad, y distingue familia nueva de miembro", () => {
  const link = "https://clubdeinversionfamiliar.com/registro?codigo=H7K2PX9Q";
  const nueva = invitationWhatsAppText({ inviteeName: "Ana", inviterName: "Marta", familyName: "Familia García", newFamily: true, link, code: "H7K2PX9Q", expiresAt: new Date(2026, 9, 31) });
  assert.match(nueva, /^¡Hola, Ana! Soy Marta, de Familia García\./);
  assert.ok(nueva.includes("crear el club de inversión de tu familia"));
  assert.ok(nueva.includes(`Crea tu club con este enlace: ${link}`));
  assert.ok(nueva.includes("Código: H7K2PX9Q · caduca el 31/10/2026"));
  const miembro = invitationWhatsAppText({ inviteeName: null, inviterName: "Marta", familyName: "Familia García", newFamily: false, link, code: "ABCD1234", expiresAt: null });
  assert.match(miembro, /^¡Hola! Soy Marta/);
  assert.ok(miembro.includes("entrar en el club de inversión de *Familia García*"));
  assert.ok(miembro.endsWith("Código: ABCD1234"));
});

test("el enlace de WhatsApp apunta al móvil si lo hay y, si no, deja elegir el contacto", () => {
  assert.equal(whatsappShareLink("+34612345678", "hola").startsWith("https://wa.me/34612345678?text=hola"), true);
  assert.equal(whatsappShareLink(null, "hola y adiós"), "https://wa.me/?text=hola%20y%20adi%C3%B3s");
});
