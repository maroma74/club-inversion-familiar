import "server-only";
import { prisma } from "./prisma";

/* Datos para la administración de la web: cifras globales, accesos y actividad por familia.
   Nunca expone operaciones ni importes de nadie: solo recuentos y fechas. */

const DAY = 86_400_000;

export type SiteStats = {
  families: number;
  usersActive: number;
  usersPending: number;
  presidents: number;
  newUsers30: number;
  newFamilies30: number;
  logins7: number;
  logins30: number;
  activeUsers7: number;
  activeUsers30: number;
  familyInvitesPending: number;
  familyInvitesUsed: number;
  loginsByDay: { day: string; count: number }[]; // últimos 30 días, de más antiguo a hoy
};

export async function getSiteStats(now = new Date()): Promise<SiteStats> {
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const [families, usersActive, usersPending, presidents, newUsers30, newFamilies30, logins7, logins30, byUser7, byUser30, familyInvitesPending, familyInvitesUsed, events30] = await Promise.all([
    prisma.family.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "ACTIVE", role: "ADMIN" } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.family.count({ where: { createdAt: { gte: since30 } } }),
    prisma.loginEvent.count({ where: { at: { gte: since7 } } }),
    prisma.loginEvent.count({ where: { at: { gte: since30 } } }),
    prisma.loginEvent.groupBy({ by: ["userId"], where: { at: { gte: since7 } } }),
    prisma.loginEvent.groupBy({ by: ["userId"], where: { at: { gte: since30 } } }),
    prisma.invitation.count({ where: { newFamily: true, usedAt: null, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.invitation.count({ where: { newFamily: true, usedAt: { not: null } } }),
    prisma.loginEvent.findMany({ where: { at: { gte: since30 } }, select: { at: true } }),
  ]);
  const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }); // YYYY-MM-DD en hora de Madrid
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) buckets.set(dayKey(new Date(now.getTime() - i * DAY)), 0);
  for (const e of events30) {
    const k = dayKey(e.at);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return {
    families, usersActive, usersPending, presidents, newUsers30, newFamilies30, logins7, logins30,
    activeUsers7: byUser7.length, activeUsers30: byUser30.length, familyInvitesPending, familyInvitesUsed,
    loginsByDay: [...buckets.entries()].map(([day, count]) => ({ day, count })),
  };
}

export type FamilyActivity = {
  id: string;
  name: string;
  createdAt: Date;
  members: number;
  pending: number;
  presidents: string[];
  lastLoginAt: Date | null;
  logins30: number;
  trades30: number;
  journal30: number;
  decisions30: number;
  portfoliosPublished: number;
  communications: number;
  invitesUsed: number;
  invitesPending: number;
  invitedBy: string | null;
  state: "activa" | "dormida" | "sin-accesos";
};

export async function getFamiliesActivity(now = new Date()): Promise<FamilyActivity[]> {
  const since30 = new Date(now.getTime() - 30 * DAY);
  const [families, logins, trades, journal, decisions, portfolios, invitedBy] = await Promise.all([
    prisma.family.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, createdAt: true,
        users: { select: { id: true, name: true, role: true, status: true, lastLoginAt: true } },
        _count: { select: { communications: true } },
        invitations: { where: { newFamily: true }, select: { usedAt: true, revokedAt: true, expiresAt: true } },
      },
    }),
    prisma.loginEvent.groupBy({ by: ["userId"], where: { at: { gte: since30 } }, _count: { _all: true } }),
    prisma.trade.groupBy({ by: ["userId"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.journalEntry.groupBy({ by: ["userId"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.monthlyDecision.groupBy({ by: ["userId"], where: { submittedAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.monthlyPortfolio.groupBy({ by: ["familyId"], where: { status: { not: "DRAFT" } }, _count: { _all: true } }),
    // Qué familia dio la invitación con la que nació cada club
    prisma.invitation.findMany({ where: { newFamily: true, usedById: { not: null } }, select: { family: { select: { name: true } }, usedBy: { select: { familyId: true } } } }),
  ]);
  const byUser = (rows: { userId: string; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.userId, r._count._all]));
  const lg = byUser(logins), tr = byUser(trades), jo = byUser(journal), de = byUser(decisions);
  const pf = new Map(portfolios.map((p) => [p.familyId, p._count._all]));
  const origin = new Map<string, string>();
  for (const i of invitedBy) if (i.usedBy) origin.set(i.usedBy.familyId, i.family.name);
  const sum = (m: Map<string, number>, ids: string[]) => ids.reduce((a, id) => a + (m.get(id) ?? 0), 0);

  return families
    .map((f): FamilyActivity => {
      const active = f.users.filter((u) => u.status === "ACTIVE");
      const ids = active.map((u) => u.id);
      const lastLoginAt = active.reduce<Date | null>((a, u) => (u.lastLoginAt && (!a || u.lastLoginAt > a) ? u.lastLoginAt : a), null);
      const logins30 = sum(lg, ids);
      const trades30 = sum(tr, ids), journal30 = sum(jo, ids), decisions30 = sum(de, ids);
      const state: FamilyActivity["state"] = logins30 + trades30 + journal30 + decisions30 > 0 ? "activa" : lastLoginAt ? "dormida" : "sin-accesos";
      return {
        id: f.id, name: f.name, createdAt: f.createdAt,
        members: active.length, pending: f.users.length - active.length,
        presidents: active.filter((u) => u.role === "ADMIN").map((u) => u.name),
        lastLoginAt, logins30, trades30, journal30, decisions30,
        portfoliosPublished: pf.get(f.id) ?? 0,
        communications: f._count.communications,
        invitesUsed: f.invitations.filter((i) => i.usedAt).length,
        invitesPending: f.invitations.filter((i) => !i.usedAt && !i.revokedAt && (!i.expiresAt || i.expiresAt > now)).length,
        invitedBy: origin.get(f.id) ?? null,
        state,
      };
    })
    .sort((a, b) => (b.lastLoginAt?.getTime() ?? 0) - (a.lastLoginAt?.getTime() ?? 0) || b.createdAt.getTime() - a.createdAt.getTime());
}

export type SiteUser = {
  id: string; name: string; email: string; familyName: string; role: string; status: string; createdAt: Date;
  lastLoginAt: Date | null; logins: number; familyInvites: number;
  familyInvitePack: number; unlimitedFamilyInvites: boolean; siteAdmin: boolean;
};

/** Usuarios de todas las familias, los últimos en entrar primero; `q` filtra por nombre, email o familia. */
export async function getSiteUsers(q: string, take = 80): Promise<SiteUser[]> {
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { family: { name: { contains: q, mode: "insensitive" as const } } }] } : {};
  const rows = await prisma.user.findMany({
    where,
    orderBy: [{ lastLoginAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take,
    select: {
      id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true,
      familyInvitePack: true, unlimitedFamilyInvites: true, siteAdmin: true,
      family: { select: { name: true } },
      _count: { select: { loginEvents: true, invitationsSent: { where: { newFamily: true } } } },
    },
  });
  return rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, familyName: u.family.name, role: u.role, status: u.status, createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt, logins: u._count.loginEvents, familyInvites: u._count.invitationsSent,
    familyInvitePack: u.familyInvitePack, unlimitedFamilyInvites: u.unlimitedFamilyInvites, siteAdmin: u.siteAdmin,
  }));
}
