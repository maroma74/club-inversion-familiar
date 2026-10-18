import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { firstName } from "@/lib/names";
import { familyOverview } from "@/lib/league";
import { allowanceWhere } from "@/lib/allowance";
import { eur, ymOf } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { AllowanceForm, ContributionForm, FamilyNameEditor, PayAllowanceForm } from "./forms";
import { ContributionList } from "./ContributionList";

const lessonsText = (n: number) => `${n} ${n === 1 ? "lección" : "lecciones"}`;

export default async function FamiliaPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const thisMonth = ymOf(new Date());
  const [members, contributions, overview, paidThisMonth, emails] = await Promise.all([
    prisma.user.findMany({ where: { familyId: user.familyId, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true, createdAt: true, avatarUpdatedAt: true } }),
    prisma.contribution.findMany({ where: { user: { familyId: user.familyId } }, orderBy: { date: "desc" }, take: 40, include: { user: { select: { name: true } } } }),
    familyOverview(user.familyId),
    // Miembros que ya tienen la paga de este mes, por reparto manual o porque se publicó una cartera.
    prisma.contribution.findMany({ where: { user: { familyId: user.familyId, status: "ACTIVE" }, ...allowanceWhere(thisMonth) }, distinct: ["userId"], select: { userId: true } }).then((rows) => rows.length),
    // Los correos solo se piden (y se muestran) al presidente: el resto de la familia ve nombres de pila.
    isAdmin ? prisma.user.findMany({ where: { familyId: user.familyId, status: "ACTIVE" }, select: { id: true, email: true } }) : Promise.resolve(null),
  ]);
  const emailOf = new Map((emails ?? []).map((e) => [e.id, e.email]));
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date());
  const allPaid = members.length > 0 && paidThisMonth >= members.length;
  const total = user.family.monthlyAllowance * members.length;

  return (
    <div className="flex flex-col gap-7">
      <header>
        {isAdmin ? <FamilyNameEditor name={user.family.name} /> : <div className="card-kicker">{user.family.name}</div>}
        <h1 className="mt-1 mb-1">Nuestra familia</h1>
        <p className="m-0 text-neutral-700 max-w-[62ch]">{members.length} {members.length === 1 ? "miembro" : "miembros"} aprendiendo a invertir juntos. El presidente reparte la paga cada mes.</p>
      </header>

      <section aria-labelledby="miembros" className="flex flex-col gap-3">
        <h2 id="miembros" className="m-0 text-xl">Quiénes somos</h2>
        <ul className="m-0 p-0 list-none grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" }}>
          {members.map((m) => {
            const r = overview.ranking.find((x) => x.userId === m.id);
            const p = overview.progress.get(m.id);
            return (
              <li key={m.id} className="card card-snug gap-2" style={{ borderColor: m.id === user.id ? "var(--color-accent)" : "var(--color-divider)" }}>
                <div className="flex items-center gap-3">
                  <Avatar id={m.id} name={m.name} updatedAt={m.avatarUpdatedAt} size={56} />
                  <div className="min-w-0">
                    <div className="font-heading text-lg leading-tight truncate">{firstName(m.name)}{m.id === user.id ? " (tú)" : ""}</div>
                    <span className="tag tag-neutral mt-1">{m.role === "ADMIN" ? "Presidente del club" : "Miembro"}</span>
                  </div>
                </div>
                <div className="text-sm">Nivel {p?.level ?? 1} · {p?.levelName ?? "Novato"} · {lessonsText(p?.lessonsPassed ?? 0)}</div>
                <div className="text-xs text-neutral-700 tabular-nums">Aportado {eur(r?.contributed ?? 0)} · valor {eur(r?.totalValue ?? 0)}</div>
                {isAdmin && emailOf.get(m.id) && <div className="text-xs text-neutral-700 truncate">{emailOf.get(m.id)}</div>}
                {isAdmin && <div className="pt-1"><Link href={`/familia/miembro/${m.id}`} className="btn-secondary py-1 text-xs">{m.id === user.id ? "Ver mi ficha" : `Ficha de ${firstName(m.name)}`}</Link></div>}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="paga" className="flex flex-col gap-3">
        <h2 id="paga" className="m-0 text-xl">La paga</h2>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
          <div className="card gap-2">
            <div className="card-kicker">Paga mensual</div>
            <div className="figure text-[40px]">{eur(user.family.monthlyAllowance, 0)}</div>
            <div className="text-sm text-neutral-700">por persona · {eur(total, 0)} al mes en total</div>
            {isAdmin && <AllowanceForm current={user.family.monthlyAllowance} />}
          </div>
          <div className="card gap-2">
            <div className="card-kicker">Paga de {monthName}</div>
            <div className="font-heading text-[28px] leading-[1.1]">{allPaid ? "Repartida" : paidThisMonth > 0 ? `Parcial (${paidThisMonth} de ${members.length})` : "Pendiente"}</div>
            <div className="text-sm text-neutral-700">{allPaid ? `${eur(user.family.monthlyAllowance)} a cada miembro.` : isAdmin ? "Aún no se ha repartido a todos este mes." : "El presidente aún no la ha repartido."}</div>
            {isAdmin && !allPaid && <PayAllowanceForm defaultMonth={thisMonth} allowance={user.family.monthlyAllowance} memberCount={members.length} />}
          </div>
        </div>
      </section>

      {isAdmin && (
        <details className="card gap-3">
          <summary className="cursor-pointer font-heading text-lg">Gestión del club <span className="text-sm font-normal text-neutral-700">· solo presidente</span></summary>
          <div className="grid gap-5 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
            <div className="flex flex-col gap-2">
              <div className="card-kicker">Código de invitación</div>
              <div className="font-mono text-2xl tracking-[0.12em]">{user.family.joinMode === "INVITE_ONLY" ? "Sin código" : user.family.inviteCode}</div>
              <div className="text-sm text-neutral-700">{user.family.joinMode === "INVITE_ONLY" ? "Solo se entra con invitación personal." : "Para registrarse con «Tengo un código»."}</div>
              <div className="flex gap-2 flex-wrap">
                {user.family.joinMode !== "INVITE_ONLY" && <CopyButton text={user.family.inviteCode} label="Copiar" />}
                <Link href="/invitaciones" className="btn-ghost">Gestionar invitaciones</Link>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="card-kicker">Aportación manual</div>
              <p className="m-0 text-sm text-neutral-700">Para regalos, extras o correcciones. Un importe negativo retira dinero.</p>
              <ContributionForm members={members.map((m) => ({ id: m.id, name: firstName(m.name) }))} />
            </div>
          </div>
        </details>
      )}

      <section aria-labelledby="aportaciones" className="flex flex-col gap-2.5">
        <h2 id="aportaciones" className="m-0 text-xl">Aportaciones</h2>
        <ContributionList isAdmin={isAdmin} rows={contributions.map((c) => ({ id: c.id, date: c.date.toISOString().slice(0, 10), userName: firstName(c.user.name), note: c.note, amount: c.amount }))} />
        {contributions.length >= 40 && <p className="m-0 text-sm text-neutral-700">Se muestran las últimas 40 aportaciones.</p>}
      </section>
    </div>
  );
}
