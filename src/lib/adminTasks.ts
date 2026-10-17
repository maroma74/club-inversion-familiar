import "server-only";
import { prisma } from "./prisma";
import { allowanceWhere } from "./allowance";
import { findUnlinkedTrades, getPortfolioFull, isDeadlinePassed, monthLabelLong } from "./monthly";
import { currentMonthYm } from "./validation";
import { firstName } from "./names";

export type AdminTask = {
  id: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  tone: "warn" | "info";
};

export type SharedProposalUse = { id: string; title: string; uses: number; byOthers: number; signed: boolean };

const nextMonthYm = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Tareas pendientes del presidente, calculadas al vuelo: paga del mes, cartera del mes, miembros sin importe o
 * sin aprobar, plazos vencidos y compras hechas fuera del formulario que conviene reconocer.
 */
export async function getAdminTasks(familyId: string): Promise<AdminTask[]> {
  const tasks: AdminTask[] = [];
  const ym = currentMonthYm();
  const next = nextMonthYm(ym);
  const [y, m] = ym.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const [family, pending, portfolios] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: familyId }, select: { monthlyAllowance: true, users: { where: { status: "ACTIVE" }, select: { id: true, name: true } } } }),
    prisma.user.findMany({ where: { familyId, status: "PENDING" }, select: { name: true } }),
    prisma.monthlyPortfolio.findMany({ where: { familyId }, orderBy: { month: "desc" }, take: 6, select: { id: true, month: true, status: true, title: true, deadline: true, publishedAt: true, allocations: { select: { userId: true, amount: true } }, decisions: { select: { userId: true } } } }),
  ]);
  const members = family.users;

  // 1. Solicitudes de entrada sin aprobar
  if (pending.length > 0) {
    tasks.push({ id: "pending", tone: "warn", title: `${pending.length} ${pending.length === 1 ? "solicitud" : "solicitudes"} de entrada`, text: `${pending.map((u) => firstName(u.name)).join(", ")} ${pending.length === 1 ? "espera" : "esperan"} tu aprobación para entrar en el club.`, href: "/invitaciones", cta: "Revisar" });
  }

  // 2. Paga del mes: miembros activos que aún no la han cobrado (por reparto manual o por la cartera publicada)
  if (family.monthlyAllowance > 0 && members.length > 0) {
    const paid = await prisma.contribution.findMany({ where: { userId: { in: members.map((u) => u.id) }, date: { gte: monthStart, lt: monthEnd }, ...allowanceWhere(ym) }, select: { userId: true } });
    const paidIds = new Set(paid.map((c) => c.userId));
    const unpaid = members.filter((u) => !paidIds.has(u.id));
    const current = portfolios.find((p) => p.month === ym);
    // Si la cartera del mes está en borrador la paga llegará al publicarla: no se duplica el aviso
    if (unpaid.length > 0 && !(current && current.status === "DRAFT")) {
      tasks.push({ id: "allowance", tone: "warn", title: `Paga de ${monthLabelLong(ym)} sin repartir`, text: `${unpaid.map((u) => firstName(u.name)).join(", ")} todavía no ${unpaid.length === 1 ? "tiene" : "tienen"} la paga de este mes. Se reparte desde Familia, o llega sola al publicar la cartera del mes.`, href: "/familia#paga", cta: "Repartir la paga" });
    }
  }

  // 3. Cartera del mes actual y del siguiente
  const current = portfolios.find((p) => p.month === ym);
  if (!current) {
    tasks.push({ id: "portfolio-current", tone: "warn", title: `Sin cartera para ${monthLabelLong(ym)}`, text: "Los miembros no tienen nada que decidir este mes. Usa una propuesta del repositorio o crea la cartera desde cero.", href: "/cartera/gestion", cta: "Preparar la cartera" });
  } else if (current.status === "DRAFT") {
    const missing = members.filter((u) => !current.allocations.some((a) => a.userId === u.id && a.amount > 0));
    tasks.push({ id: "portfolio-draft", tone: "warn", title: `La cartera de ${monthLabelLong(ym)} sigue en borrador`, text: `«${current.title}» no está publicada: los miembros no pueden decidir ni reciben la paga.${missing.length ? ` Además ${missing.map((u) => firstName(u.name)).join(", ")} no ${missing.length === 1 ? "tiene" : "tienen"} importe asignado.` : ""}`, href: `/cartera/gestion/${current.id}`, cta: "Revisar y publicar" });
  } else if (current.status === "PUBLISHED") {
    const missing = members.filter((u) => !current.allocations.some((a) => a.userId === u.id && a.amount > 0));
    if (missing.length) {
      tasks.push({ id: "portfolio-alloc", tone: "warn", title: "Miembros sin importe en la cartera del mes", text: `${missing.map((u) => firstName(u.name)).join(", ")} no ${missing.length === 1 ? "puede" : "pueden"} decidir en «${current.title}» porque no ${missing.length === 1 ? "tiene" : "tienen"} importe asignado.`, href: `/cartera/gestion/${current.id}`, cta: "Asignar importe" });
    }
    if (isDeadlinePassed(current)) {
      tasks.push({ id: "portfolio-close", tone: "info", title: `El plazo de «${current.title}» ha terminado`, text: `${current.decisions.length} de ${current.allocations.filter((a) => a.amount > 0).length} decidieron. Ciérrala para archivarla en el historial.`, href: `/cartera/gestion/${current.id}`, cta: "Cerrar la cartera" });
    } else if (current.deadline) {
      const days = Math.ceil((current.deadline.getTime() - Date.now()) / 86_400_000);
      const undecided = current.allocations.filter((a) => a.amount > 0 && !current.decisions.some((d) => d.userId === a.userId));
      if (days <= 3 && undecided.length) tasks.push({ id: "portfolio-deadline", tone: "info", title: `Quedan ${days <= 0 ? "horas" : `${days} ${days === 1 ? "día" : "días"}`} para decidir`, text: `${undecided.map((a) => firstName(members.find((u) => u.id === a.userId)?.name ?? "")).filter(Boolean).join(", ")} aún no ${undecided.length === 1 ? "ha" : "han"} decidido en «${current.title}».`, href: "/cartera", cta: "Ver la cartera" });
    }
  }
  if (!portfolios.some((p) => p.month === next)) {
    tasks.push({ id: "portfolio-next", tone: "info", title: `Prepara ${monthLabelLong(next)}`, text: "Todavía no hay borrador para el mes que viene. Las propuestas sugeridas del repositorio te lo dejan hecho en un clic.", href: "/cartera/gestion", cta: "Ver propuestas" });
  }

  // 4. Compras hechas fuera del formulario en las carteras recientes (publicadas o cerradas)
  const recent = portfolios.filter((p) => p.status !== "DRAFT").slice(0, 3);
  for (const r of recent) {
    const full = await getPortfolioFull(r.id, familyId);
    if (!full) continue;
    const unlinked = await findUnlinkedTrades(full);
    if (unlinked.length) {
      const who = [...new Set(unlinked.map((t) => firstName(t.userName)))];
      tasks.push({ id: `unlinked-${r.id}`, tone: "warn", title: `${unlinked.length} ${unlinked.length === 1 ? "compra" : "compras"} fuera del formulario en ${monthLabelLong(r.month)}`, text: `${who.join(", ")} ${who.length === 1 ? "compró" : "compraron"} valores de «${r.title}» a mano. Si cuentan como su decisión, reconócelas para que salgan en el club y en el repaso.`, href: `/cartera/gestion/${r.id}`, cta: "Reconocer compras" });
    }
  }

  return tasks;
}

/** Propuestas de la familia en el repositorio y cuántas veces se han usado (en total y por otras familias). */
export async function getSharedProposalUses(familyId: string): Promise<SharedProposalUse[]> {
  const rows = await prisma.proposal.findMany({
    where: { familyId, source: "FAMILY" },
    orderBy: [{ uses: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, uses: true, signed: true, _count: { select: { portfolios: { where: { familyId: { not: familyId } } } } } },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, uses: r.uses, byOthers: r._count.portfolios, signed: r.signed }));
}
