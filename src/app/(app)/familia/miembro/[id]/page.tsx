import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { eur, fmtDate } from "@/lib/format";
import { formatPhone } from "@/lib/communications";
import { familyOverview } from "@/lib/league";
import { startViewAsMemberAction } from "@/app/actions/view";
import { Avatar } from "@/components/Avatar";
import { ResetLinkButton } from "../../../invitaciones/ResetLinkButton";
import { MemberForm } from "./forms";

export const metadata: Metadata = { title: "Ficha del miembro · Club de Inversión Familiar" };

const fmtDateTime = (d: Date) => d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Ficha de un miembro para el presidente: datos editables, su actividad y «Visualizar como» para ver lo que ve. */
export default async function MiembroPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const m = await prisma.user.findFirst({
    where: { id, familyId: admin.familyId },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, lastLoginAt: true, avatarUpdatedAt: true, welcomedAt: true, _count: { select: { trades: true, journalEntries: true, monthlyDecisions: true } } },
  });
  if (!m) notFound();
  const [overview, lessons] = await Promise.all([
    familyOverview(admin.familyId),
    prisma.lessonProgress.count({ where: { userId: m.id, completedAt: { not: null } } }),
  ]);
  const r = overview.ranking.find((x) => x.userId === m.id);
  const lv = overview.progress.get(m.id);
  const name = firstName(m.name);
  const isMe = m.id === admin.id;

  return (
    <div className="flex flex-col gap-6 max-w-[920px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar id={m.id} name={m.name} updatedAt={m.avatarUpdatedAt} size={64} />
          <div className="min-w-0">
            <h1 className="m-0 truncate">{name}{isMe ? " (tú)" : ""}</h1>
            <p className="m-0 mt-1 text-sm text-neutral-700">{m.role === "ADMIN" ? "Presidente del club" : "Miembro"}{m.status === "PENDING" ? " · pendiente de aprobación" : ""} · en el club desde el {fmtDate(m.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/familia" className="btn-ghost">← Familia</Link>
          {!isMe && m.status === "ACTIVE" && (
            <form action={startViewAsMemberAction}>
              <input type="hidden" name="userId" value={m.id} />
              <button className="btn-primary">Visualizar como {name}</button>
            </form>
          )}
        </div>
      </header>

      {!isMe && m.status === "ACTIVE" && (
        <p className="m-0 text-sm text-neutral-700 max-w-[72ch] [text-wrap:pretty]">«Visualizar como {name}» te enseña el club exactamente como lo ve: su Inicio, su cartera del mes, sus operaciones y su avance en la Academia. Es solo para mirar: mientras estés en su vista no se guarda nada en su nombre.</p>
      )}

      <section className="card card-roomy gap-4" aria-labelledby="ficha-datos">
        <h2 id="ficha-datos" className="m-0 text-[20px]">Datos de {name}</h2>
        <MemberForm id={m.id} name={m.name} email={m.email} phone={m.phone ? formatPhone(m.phone) : ""} />
        {!isMe && (
          <div className="flex flex-wrap items-start justify-between gap-3 pt-3 border-t border-divider">
            <p className="m-0 text-sm text-neutral-700 max-w-[56ch]">¿Ha olvidado la contraseña? Genera un enlace para que elija una nueva (vale una hora). Tú nunca ves ni pones su contraseña.</p>
            <ResetLinkButton userId={m.id} name={name} />
          </div>
        )}
      </section>

      <section className="card card-roomy gap-3" aria-labelledby="ficha-actividad">
        <h2 id="ficha-actividad" className="m-0 text-[20px]">Su actividad</h2>
        <dl className="m-0 grid gap-x-8 gap-y-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}>
          <div><dt className="text-xs text-neutral-700">Último acceso</dt><dd className="m-0 font-medium">{m.lastLoginAt ? fmtDateTime(m.lastLoginAt) : "—"}</dd></div>
          <div><dt className="text-xs text-neutral-700">Móvil</dt><dd className="m-0 font-medium tabular-nums">{m.phone ? formatPhone(m.phone) : "sin móvil"}</dd></div>
          <div><dt className="text-xs text-neutral-700">Nivel</dt><dd className="m-0 font-medium">{lv?.level ?? 1} · {lv?.levelName ?? "Novato"} · {lessons} {lessons === 1 ? "lección" : "lecciones"}</dd></div>
          <div><dt className="text-xs text-neutral-700">Cartera</dt><dd className="m-0 font-medium tabular-nums">{eur(r?.totalValue ?? 0)} <span className="text-neutral-700 font-normal">de {eur(r?.contributed ?? 0)} aportados</span></dd></div>
          <div><dt className="text-xs text-neutral-700">Decisiones del mes</dt><dd className="m-0 font-medium tabular-nums">{m._count.monthlyDecisions}</dd></div>
          <div><dt className="text-xs text-neutral-700">Operaciones · porqués</dt><dd className="m-0 font-medium tabular-nums">{m._count.trades} · {m._count.journalEntries}</dd></div>
        </dl>
        <p className="m-0 text-sm"><Link href="/invitaciones" className="text-accent-700">Cambiar su rol o expulsarle del club, en Invitaciones →</Link></p>
      </section>
    </div>
  );
}
