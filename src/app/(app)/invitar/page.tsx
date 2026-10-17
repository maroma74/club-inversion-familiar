import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";
import { fmtDate } from "@/lib/format";
import { firstName } from "@/lib/names";
import { formatPhone } from "@/lib/communications";
import { loadInviteCapacity } from "@/lib/inviteCapacity";
import { invitationWhatsAppText } from "@/lib/invitationMessages";
import { revokeFamilyInvitationAction } from "@/app/actions/familyInvites";
import { CopyButton } from "@/components/CopyButton";
import { InviteWhatsApp } from "@/components/InviteWhatsApp";
import { FamilyInviteForm, SendFamilyInviteForm } from "./forms";

type Status = "pendiente" | "usada" | "caducada" | "anulada";

/** Invitar a otras familias: disponible para cualquier miembro con capacidad (las cinco del club, un paquete o sin límite). */
export default async function InvitarPage() {
  const user = await requireUser();
  const [cap, mine, family] = await Promise.all([
    loadInviteCapacity(user),
    prisma.invitation.findMany({ where: { createdById: user.id, newFamily: true }, orderBy: { createdAt: "desc" }, include: { usedBy: { select: { name: true, family: { select: { name: true } } } } } }),
    prisma.family.findUniqueOrThrow({ where: { id: user.familyId }, select: { name: true } }),
  ]);
  const origin = appUrl();
  const linkFor = (code: string) => `${origin}/registro?codigo=${code}`;
  const statusOf = (i: (typeof mine)[number]): Status => (i.usedAt ? "usada" : i.revokedAt ? "anulada" : i.expiresAt && i.expiresAt.getTime() < Date.now() ? "caducada" : "pendiente");
  const canInvite = cap.source !== "none";
  const founded = mine.filter((i) => i.usedAt).length;

  const summary = cap.unlimited
    ? "No tienes límite: puedes invitar a todas las familias que quieras."
    : cap.available === 0
      ? user.role === "ADMIN"
        ? "No te queda ninguna: las cinco del club están usadas o pendientes."
        : "Ahora mismo no tienes ninguna. Las cinco invitaciones del club las gestiona el presidente: pídele que invite a la familia que quieras proponer."
      : `Te quedan ${cap.available} ${cap.available === 1 ? "invitación" : "invitaciones"}${cap.pool ? ` (${cap.pool.free} de las cinco del club${cap.pack.granted ? ` y ${cap.pack.free} de tu paquete` : ""})` : " de tu paquete"}.`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="card-kicker text-[11px]">Club</div>
        <h1 className="mt-1 mb-1">Invitar a otras familias</h1>
        <p className="m-0 text-neutral-700 max-w-[70ch] [text-wrap:pretty]">El Club crece de familia en familia. Quien reciba tu invitación funda su propio club, lo preside y recibe a su vez cinco invitaciones. Puedes mandarla por WhatsApp con el texto ya escrito, por correo, o copiar el enlace.</p>
      </header>

      <section className="card card-roomy gap-2" style={{ background: "var(--brand-navy)", color: "#f8fafc", borderColor: "transparent" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[20px]" style={{ color: "#ffffff" }}>{cap.unlimited ? "Invitaciones sin límite" : `${cap.available} ${cap.available === 1 ? "invitación disponible" : "invitaciones disponibles"}`}</h2>
          <span className="text-sm tabular-nums" style={{ color: "rgba(248,250,252,0.75)" }}>{founded} {founded === 1 ? "club fundado" : "clubes fundados"} con tus invitaciones</span>
        </div>
        <p className="m-0 text-sm max-w-[70ch]" style={{ color: "rgba(248,250,252,0.82)" }}>{summary}{user.role === "ADMIN" && <> Las cinco del club se ven con detalle en <Link href="/invitaciones#familias" style={{ color: "#34d399" }}>Invitaciones</Link>.</>}</p>
      </section>

      <section className="card gap-3">
        <h3 className="m-0">Nueva invitación para una familia</h3>
        <FamilyInviteForm disabled={!canInvite} />
      </section>

      <section className="card card-table">
        <div className="px-2 py-2 font-semibold">Mis invitaciones a familias ({mine.length})</div>
        {mine.length === 0 ? (
          <p className="px-2 pb-2 m-0 text-sm text-neutral-700">Todavía no has invitado a ninguna familia.</p>
        ) : (
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Para</th><th>Código</th><th>Estado</th><th className="hidden md:table-cell">Caduca</th><th /></tr></thead>
            <tbody>
              {mine.map((i) => {
                const st = statusOf(i);
                const text = invitationWhatsAppText({ inviteeName: i.name ? firstName(i.name) : null, inviterName: firstName(user.name), familyName: family.name, newFamily: true, link: linkFor(i.code), code: i.code, expiresAt: i.expiresAt });
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="font-medium">{i.name ?? "Sin nombre"}</div>
                      <div className="text-xs text-neutral-700">{[i.email, i.phone ? formatPhone(i.phone) : null, i.note].filter(Boolean).join(" · ") || "cualquier email"}{i.fromPack ? (cap.unlimited ? " · no cuenta entre las cinco del club" : " · de tu paquete") : " · una de las cinco del club"}</div>
                    </td>
                    <td className="font-mono tracking-wider">{i.code}</td>
                    <td>
                      <span className={`tag ${st === "usada" ? "tag-accent" : st === "pendiente" ? "tag-gold" : "tag-neutral"}`}>{st}</span>
                      {st === "usada" && <div className="text-xs text-neutral-700">{i.usedBy?.family.name} · {firstName(i.usedBy?.name)} · {i.usedAt ? fmtDate(i.usedAt) : ""}</div>}
                      {st === "pendiente" && (i.sentAt || i.sharedAt) && <div className="text-xs text-neutral-700">{i.sharedAt ? `WhatsApp el ${fmtDate(i.sharedAt)}` : ""}{i.sharedAt && i.sentAt ? " · " : ""}{i.sentAt ? `correo el ${fmtDate(i.sentAt)}` : ""}</div>}
                    </td>
                    <td className="text-neutral-700 hidden md:table-cell">{i.expiresAt ? fmtDate(i.expiresAt) : "nunca"}</td>
                    <td className="text-right whitespace-nowrap">
                      {st === "pendiente" && (
                        <span className="inline-flex flex-wrap items-center justify-end gap-2">
                          <InviteWhatsApp id={i.id} phone={i.phone} sharedAt={i.sharedAt?.toISOString() ?? null} text={text} />
                          <SendFamilyInviteForm id={i.id} email={i.email} resend={Boolean(i.sentAt)} />
                          <CopyButton text={linkFor(i.code)} label="Copiar enlace" />
                          <form action={revokeFamilyInvitationAction} className="inline"><input type="hidden" name="id" value={i.id} /><button className="btn-ghost text-xs">Anular</button></form>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
