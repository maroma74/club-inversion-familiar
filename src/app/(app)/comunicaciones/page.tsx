import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { eur, fmtDate } from "@/lib/format";
import { firstName, uniqueFirstNames } from "@/lib/names";
import { monthLabelLong } from "@/lib/monthly";
import { appUrl } from "@/lib/appUrl";
import { formatPhone, renderMessage, type MessageVars } from "@/lib/communications";
import type { Recipient } from "@/app/actions/communications";
import { ComposeForm, CopyText, WhatsAppSendButton, type PortfolioOption } from "./forms";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function ComunicacionesPage({ searchParams }: { searchParams: Promise<{ cartera?: string; c?: string }> }) {
  const admin = await requireAdmin();
  const { cartera, c: selectedId } = await searchParams;
  const [portfolios, members, history] = await Promise.all([
    prisma.monthlyPortfolio.findMany({ where: { familyId: admin.familyId, status: { in: ["PUBLISHED", "CLOSED"] } }, orderBy: { month: "desc" }, take: 8, include: { options: { select: { id: true } }, allocations: { select: { userId: true, amount: true } } } }),
    prisma.user.findMany({ where: { familyId: admin.familyId, status: "ACTIVE", id: { not: admin.id } }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.communication.findMany({ where: { familyId: admin.familyId }, orderBy: { createdAt: "desc" }, take: 12, include: { createdBy: { select: { name: true } } } }),
  ]);
  const names = uniqueFirstNames(members);
  const sample = members[0];
  const options: PortfolioOption[] = portfolios.map((p) => ({
    id: p.id,
    label: `${cap(monthLabelLong(p.month))} · ${p.title}`,
    status: p.status,
    preview: {
      nombre: sample ? (names.get(sample.id) ?? firstName(sample.name)) : "Lucía",
      presidente: firstName(admin.name),
      familia: admin.family.name,
      mes: monthLabelLong(p.month),
      titulo: p.title,
      importe: eur(sample ? (p.allocations.find((a) => a.userId === sample.id)?.amount ?? 0) : admin.family.monthlyAllowance),
      opciones: p.options.length,
      minimo: p.minChoices,
      maximo: p.maxChoices,
      plazo: p.deadline ? `hasta el ${fmtDate(p.deadline)}` : "",
      enlace: p.status === "PUBLISHED" ? `${appUrl()}/cartera` : `${appUrl()}/cartera/historial/${p.id}`,
    } satisfies MessageVars,
  }));
  const initialPortfolioId = options.find((o) => o.id === cartera)?.id ?? options.find((o) => o.status === "PUBLISHED")?.id ?? options[0]?.id ?? "";
  const selected = history.find((h) => h.id === selectedId) ?? history[0] ?? null;
  const withoutPhone = members.filter((m) => !m.phone);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="card-kicker text-[11px]">Presidente del club</div>
        <h1 className="mt-1 mb-1">Comunicaciones</h1>
        <p className="m-0 text-neutral-700 max-w-[70ch] [text-wrap:pretty]">Avisa a la familia por WhatsApp cuando la cartera del mes está lista. El mensaje sale personalizado para cada miembro (su nombre, su importe, el plazo) y con el enlace directo a la cartera. Se abre WhatsApp con el texto ya escrito: tú solo pulsas enviar. Cada aviso queda guardado aquí.</p>
      </header>

      <section className="card card-snug gap-2">
        <div className="card-kicker">Destinatarios</div>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => <span key={m.id} className={`tag ${m.phone ? "tag-accent" : "tag-neutral"}`} title={m.phone ? formatPhone(m.phone) : "Sin teléfono"}>{names.get(m.id) ?? firstName(m.name)}{m.phone ? "" : " · sin teléfono"}</span>)}
          {members.length === 0 && <span className="text-sm text-neutral-700">Todavía no hay otros miembros activos.</span>}
        </div>
        {withoutPhone.length > 0 && <p className="m-0 text-sm text-neutral-700">{withoutPhone.map((m) => names.get(m.id) ?? firstName(m.name)).join(", ")} {withoutPhone.length === 1 ? "no ha puesto" : "no han puesto"} su móvil en «Mi perfil». Mientras tanto podrás copiarles el texto y pasárselo a mano.</p>}
      </section>

      {options.length === 0 ? (
        <section className="card card-snug gap-2">
          <p className="m-0 text-sm text-neutral-700">No hay ninguna cartera publicada que anunciar. Publica la cartera del mes y vuelve aquí.</p>
          <div><Link href="/cartera/gestion" className="btn-primary">Gestión de carteras</Link></div>
        </section>
      ) : (
        <section className="card blueprint gap-3" style={{ padding: 24 }}>
          <div className="card-kicker">Nuevo aviso: la cartera del mes está lista</div>
          <ComposeForm portfolios={options} initialPortfolioId={initialPortfolioId} />
        </section>
      )}

      {selected && (
        <section className="card blueprint gap-3" style={{ padding: 24, borderColor: "var(--color-accent)" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="card-kicker">Enviar · {selected.subject}</div>
            <span className="text-xs text-neutral-700">preparado el {fmtDate(selected.createdAt)} por {firstName(selected.createdBy.name)}</span>
          </div>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Miembro</th><th>Teléfono</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {(selected.recipients as unknown as Recipient[]).map((r) => (
                <tr key={r.userId}>
                  <td className="font-medium">{r.name}</td>
                  <td className="tabular-nums whitespace-nowrap">{r.phone ? formatPhone(r.phone) : <span className="text-neutral-700">sin teléfono</span>}</td>
                  <td className="text-sm">{r.openedAt ? <span className="tag tag-accent">Enviado</span> : <span className="tag tag-neutral">Pendiente</span>}</td>
                  <td className="text-right">
                    <span className="inline-flex flex-wrap items-center justify-end gap-2">
                      {r.phone && <WhatsAppSendButton communicationId={selected.id} userId={r.userId} phone={r.phone} text={r.text} openedAt={r.openedAt} />}
                      <CopyText text={r.text} label="Copiar texto" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent-700 font-medium">Mensaje para el grupo de la familia (sin personalizar)</summary>
            <div className="mt-2 flex flex-col gap-2">
              <pre className="m-0 whitespace-pre-wrap rounded-lg border border-divider px-4 py-3 text-sm font-sans" style={{ background: "var(--color-surface-2)" }}>{groupText(selected.body, options.find((o) => o.id === selected.portfolioId)?.preview, admin.family.name)}</pre>
              <div><CopyText text={groupText(selected.body, options.find((o) => o.id === selected.portfolioId)?.preview, admin.family.name)} label="Copiar para el grupo" /></div>
            </div>
          </details>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="m-0">Avisos enviados</h3>
        {history.length === 0 ? (
          <p className="m-0 text-sm text-neutral-700">Todavía no has enviado ningún aviso.</p>
        ) : (
          <div className="card card-table"><div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Fecha</th><th>Aviso</th><th className="text-right">Enviados</th><th /></tr></thead>
            <tbody>
              {history.map((h) => {
                const rs = h.recipients as unknown as Recipient[];
                const sent = rs.filter((r) => r.openedAt).length;
                return (
                  <tr key={h.id} className={h.id === selected?.id ? "font-medium" : ""}>
                    <td className="whitespace-nowrap">{fmtDate(h.createdAt)}</td>
                    <td>{h.subject}</td>
                    <td className="text-right tabular-nums">{sent} / {rs.length}</td>
                    <td className="text-right"><Link href={`/comunicaciones?c=${h.id}`} className="btn-ghost text-xs">{h.id === selected?.id ? "Seleccionado" : "Ver y enviar"}</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div></div>
        )}
      </section>
    </div>
  );
}

/** Versión para el grupo: sin nombre ni importe de nadie en concreto. */
function groupText(template: string, preview: MessageVars | undefined, familyName: string): string {
  if (!preview) return template;
  return renderMessage(template, { ...preview, nombre: "familia", importe: "tu paga de este mes", familia: familyName });
}
