import { test } from "node:test";
import assert from "node:assert/strict";
import { onboardingProgress, onboardingSteps, type OnboardingFacts } from "./onboarding";

const blank: OnboardingFacts = { isAdmin: false, hasProfile: false, lessonsPassed: 0, journalEntries: 0, decisions: 0, trades: 0, otherMembers: 0, pendingMemberInvites: 0, contributions: 0, publishedPortfolios: 0, communications: 0, familyInvites: 0 };

test("un miembro nuevo tiene cuatro pasos y el primero pendiente es el perfil", () => {
  const steps = onboardingSteps(blank);
  assert.deepEqual(steps.map((s) => s.id), ["profile", "lesson", "decide", "why"]);
  const p = onboardingProgress(steps);
  assert.equal(p.done, 0);
  assert.equal(p.next?.id, "profile");
});

test("los pasos se marcan con datos reales y una compra cuenta como decisión", () => {
  const p = onboardingProgress(onboardingSteps({ ...blank, hasProfile: true, lessonsPassed: 2, trades: 1, journalEntries: 1 }));
  assert.equal(p.complete, true);
});

test("el presidente empieza por poner en marcha el club; decidir aparece cuando ya hay cartera publicada", () => {
  const before = onboardingSteps({ ...blank, isAdmin: true });
  assert.equal(before[0].id, "invite-family");
  assert.ok(!before.some((s) => s.id === "decide"));
  const after = onboardingSteps({ ...blank, isAdmin: true, otherMembers: 3, contributions: 4, publishedPortfolios: 1 });
  assert.ok(after.some((s) => s.id === "decide"));
  assert.equal(onboardingProgress(after).next?.id, "notify");
});
