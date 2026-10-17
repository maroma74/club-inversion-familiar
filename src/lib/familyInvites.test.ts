import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILY_INVITE_LIMIT, familyInviteSlots, isLiveInvitation, noSlotsMessage } from "./familyInvites";

const now = new Date("2026-10-17T12:00:00Z");
const used = { usedAt: new Date("2026-09-01"), revokedAt: null, expiresAt: null };
const pending = { usedAt: null, revokedAt: null, expiresAt: new Date("2026-11-01") };
const expired = { usedAt: null, revokedAt: null, expiresAt: new Date("2026-10-01") };
const revoked = { usedAt: null, revokedAt: new Date("2026-10-02"), expiresAt: null };

test("el límite son cinco familias y cuentan las usadas y las pendientes vivas", () => {
  assert.equal(FAMILY_INVITE_LIMIT, 5);
  assert.deepEqual(familyInviteSlots([], now), { limit: 5, used: 0, pending: 0, free: 5 });
  assert.deepEqual(familyInviteSlots([used, used, pending, expired, revoked], now), { limit: 5, used: 2, pending: 1, free: 2 });
});

test("una invitación caducada o anulada libera el hueco; una usada lo ocupa para siempre", () => {
  assert.equal(isLiveInvitation(pending, now), true);
  assert.equal(isLiveInvitation(expired, now), false);
  assert.equal(isLiveInvitation(revoked, now), false);
  assert.equal(isLiveInvitation(used, now), false);
  assert.equal(familyInviteSlots([used, used, used, used, used, expired], now).free, 0);
  assert.equal(familyInviteSlots([used, used, used, used, pending], now).free, 0);
  assert.equal(familyInviteSlots([used, used, used, used, expired], now).free, 1);
});

test("el aviso distingue entre cinco familias fundadas y pendientes que se pueden anular", () => {
  assert.match(noSlotsMessage(familyInviteSlots([used, used, used, used, used], now)), /ya han fundado su club/);
  assert.match(noSlotsMessage(familyInviteSlots([used, used, pending, pending, pending], now)), /Anula una pendiente/);
});
