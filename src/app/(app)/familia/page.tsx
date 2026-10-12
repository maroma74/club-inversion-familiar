import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { firstName } from "@/lib/names";
import { familyOverview } from "@/lib/league";
import { eur, fmtDate, ymOf } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { AllowanceForm, ContributionForm, PayAllowanceForm } from "./forms";
import { ContributionList } from "./ContributionList";

export default async function FamiliaPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const thisMonth = ymOf(new Date());
  const [members, contributions, overview, paidThisMonth] = await Promise.all([
    prisma.user.findMany({ where: { familyId: user.familyId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true, avatarUpdatedAt: true } }),
    prisma.contribution.findMany({ where: { user: { familyId: user.familyId } }, orderBy: { date: "desc" }, take: 40, include: { user: { select: { name: true } } } }),
    familyOverview(user.familyId),
    prisma.contribution.count({ where: { user: { familyId: user.familyId, status: "ACTIVE" }, note: `Paga mensual ${thisMonth}` } }),
  ]);
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date());
  const allPaid = members.length > 0 && paidThisMonth >= members.length;
  const total = user.family.monthlyAllowance * members.length;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="card-kicker text-[11px]">Familia</div>
        <h1 className="mt-1 mb-1">{user.family.name}</h1>
        <p className="m-0 text-neutral-700 max-w-[62ch]">{members.length} {members.length === 1 ? "miembro" : "miembros"}. La paga se reparte el primer día de cada mes.</p>
      </header>

      <section className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        <div className="card blueprint gap-2" style={{ padding: 20 }}>
          <div className="card-kicker">Paga mensual</div>
          <div className="figure text-[44px]">{eur(user.family.monthlyAllowance, 0)}</div>
          <div className="text-[13px] text-neutral-700">por persona · {eur(total, 0)} al mes en total</div>
          {isAdmin && <AllowanceForm current={user.family.monthlyAllowance} />}
        </div>
        <div className="card blueprint gap-2" style={{ padding: 20 }}>
          <div className="card-kicker capitalize">Paga de {monthName}</div>
          <div className="font-heading text-[28px] leading-[1.1]">{allPaid ? "Repartida" : paidThisMonth > 0 ? `Parcial (${paidThisMonth} de ${members.length})` : "Pendiente"}</div>
          <div className="text-[13px] text-neutral-700">{allPaid ? `${eur(user.family.monthlyAllowance)} a cada miembro.` : isAdmin ? "Aún no se ha repartido a todos este mes." : "El presidente aún no la ha repartido."}</div>
          {isAdmin && !allPaid && <PayAllowanceForm defaultMonth={thisMonth} amountLabel={eur(total, 0)} />}
        </div>
        {isAdmin && (
          <div className="card blueprint gap-2" style={{ padding: 20 }}>
            <div className="card-kicker">Código de invitación</div>
            <div className="font-heading text-[30px] tracking-[0.06em]">{user.family.joinMode === "INVITE_ONLY" ? "—" : user.family.inviteCode}</div>
            <div className="text-[13px] text-neutral-700">{user.family.joinMode === "INVITE_ONLY" ? "Solo se entra con invitación personal." : "Para registrarse con «Tengo un código»."}</div>
            <div className="flex gap-2 flex-wrap">
              {user.family.joinMode !== "INVITE_ONLY" && <CopyButton text={user.family.inviteCode} label="Copiar" />}
              <Link href="/invitaciones" className="btn-ghost text-[13px]">Gestionar invitaciones</Link>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0">Miembros</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Rol</th><th className="text-right">Aportado</th><th className="text-right">Valor</th><th>Formación</th><th>Alta</th></tr></thead>
            <tbody>
              {members.map((m) => {
                const r = overview.ranking.find((x) => x.userId === m.id);
                const p = overview.progress.get(m.id);
                return (
                  <tr key={m.id}>
                    <td className="font-medium"><div className="flex items-center gap-2.5"><Avatar id={m.id} name={m.name} updatedAt={m.avatarUpdatedAt} size={32} /><div>{firstName(m.name)}{m.id === user.id ? " (tú)" : ""}<div className="text-xs text-neutral-600 font-normal">{m.email}</div></div></div></td>
                    <td><span className="tag tag-neutral">{m.role === "ADMIN" ? "Presidente del club" : "Miembro"}</span></td>
                    <td className="text-right tabular-nums">{eur(r?.contributed ?? 0)}</td>
                    <td className="text-right tabular-nums">{eur(r?.totalValue ?? 0)}</td>
                    <td>Nivel {p?.level ?? 1} · {p?.lessonsPassed ?? 0} lecciones</td>
                    <td className="text-neutral-700">{fmtDate(m.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="card blueprint gap-2 max-w-[560px]" style={{ padding: 20 }}>
          <div className="card-kicker">Aportación manual</div>
          <p className="m-0 text-[13px] text-neutral-700">Regalos, extras o correcciones (importe negativo para retirar).</p>
          <ContributionForm members={members.map((m) => ({ id: m.id, name: firstName(m.name) }))} />
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h3 className="m-0">Aportaciones</h3>
        <div className="overflow-x-auto">
          <ContributionList isAdmin={isAdmin} rows={contributions.map((c) => ({ id: c.id, date: c.date.toISOString().slice(0, 10), userName: firstName(c.user.name), note: c.note, amount: c.amount }))} />
        </div>
      </section>
    </div>
  );
}
