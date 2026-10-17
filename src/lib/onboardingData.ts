import "server-only";
import { prisma } from "./prisma";
import { onboardingProgress, onboardingSteps } from "./onboarding";

/** Carga los datos de los primeros pasos de un usuario y devuelve los pasos con su progreso. */
export async function loadOnboarding(user: { id: string; familyId: string; role: string; phone: string | null; avatarUpdatedAt: Date | null }) {
  const isAdmin = user.role === "ADMIN";
  const [lessonsPassed, journalEntries, decisions, trades, admin] = await Promise.all([
    prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } }),
    prisma.journalEntry.count({ where: { userId: user.id } }),
    prisma.monthlyDecision.count({ where: { userId: user.id } }),
    prisma.trade.count({ where: { userId: user.id } }),
    isAdmin
      ? Promise.all([
          prisma.user.count({ where: { familyId: user.familyId, status: "ACTIVE", id: { not: user.id } } }),
          prisma.invitation.count({ where: { familyId: user.familyId, newFamily: false, usedAt: null, revokedAt: null } }),
          prisma.contribution.count({ where: { user: { familyId: user.familyId } } }),
          prisma.monthlyPortfolio.count({ where: { familyId: user.familyId, status: { not: "DRAFT" } } }),
          prisma.communication.count({ where: { familyId: user.familyId } }),
          prisma.invitation.count({ where: { familyId: user.familyId, newFamily: true } }),
        ])
      : null,
  ]);
  const [otherMembers, pendingMemberInvites, contributions, publishedPortfolios, communications, familyInvites] = admin ?? [0, 0, 0, 0, 0, 0];
  const steps = onboardingSteps({
    isAdmin,
    hasProfile: Boolean(user.phone || user.avatarUpdatedAt),
    lessonsPassed, journalEntries, decisions, trades,
    otherMembers, pendingMemberInvites, contributions, publishedPortfolios, communications, familyInvites,
  });
  return { steps, ...onboardingProgress(steps) };
}
