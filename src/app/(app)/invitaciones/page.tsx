import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { firstName } from "@/lib/names";
import { appUrl } from "@/lib/appUrl";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { approveMemberAction, deleteInvitationAction, removeMemberAction, renewInvitationAction, revokeInvitationAction, setMemberRoleAction } from "@/app/actions/invitations";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { InvitationForm, JoinModeForm, RegenerateCodeForm, SendInvitationForm } from "./forms";

type Status = "pendiente" | "usada" | "caducada" | "anulada";
const STATUS_STYLE: Record<Status, string> = { pendiente: "bg-amber-100 text-amber-700", usada: "bg-green-100 text-green-700", caducada: "bg-slate-100 text-slate-500", anulada: "bg-red-100 text-red-700" };

export default async function InvitacionesPage() {
  const admin = await requireAdmin();
  const origin = appUrl();
  const [family, invitations, members] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: admin.familyId } }),
    prisma.invitation.findMany({ where: { familyId: admin.familyId }, orderBy: { createdAt: "desc" }, include: { usedBy: { select: { name: true } }, createdBy: { select: { name: true } } } }),
    prisma.user.findMany({ where: { familyId: admin.familyId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, avatarUpdatedAt: true, _count: { select: { trades: true } } } }),
  ]);
  const pendingMembers = members.filter((m) => m.status === "PENDING");
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  const activeAdmins = activeMembers.filter((m) => m.role === "ADMIN").length;
  const statusOf = (i: (typeof invitations)[number]): Status => (i.usedAt ? "usada" : i.revokedAt ? "anulada" : i.expiresAt && i.expiresAt.getTime() < Date.now() ? "caducada" : "pendiente");
  const linkFor = (code: string) => `${origin}/registro?codigo=${code}`;
  const generalLink = linkFor(family.inviteCode);

  return (
    <>
      <PageHeader kicker="Club" title="Invitaciones" subtitle="Controla quién entra en el club: invitaciones personales, modo de entrada con el código general, solicitudes pendientes y miembros." />

      {pendingMembers.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/40 mb-6">
          <h2 className="font-semibold mb-2">Solicitudes pendientes de aprobación ({pendingMembers.length})</h2>
          <ul className="divide-y divide-amber-100">
            {pendingMembers.map((m) => (
              <li key={m.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div><b>{firstName(m.name)}</b> <span className="text-slate-500">{m.email}</span> <span className="text-xs text-slate-400">· solicitó el {fmtDate(m.createdAt)}</span></div>
                <div className="flex gap-2">
                  <form action={approveMemberAction}><input type="hidden" name="userId" value={m.id} /><button className="btn-primary py-1 text-xs">Aprobar</button></form>
                  <form action={removeMemberAction}><input type="hidden" name="userId" value={m.id} /><ConfirmButton className="btn-danger py-1 text-xs" message={`¿Rechazar la solicitud de ${firstName(m.name)}? Se borrará su cuenta.`}>Rechazar</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-1">Nueva invitación personal</h2>
          <p className="text-xs text-slate-500 mb-3">Código de un solo uso. Si indicas el email, solo podrá usarse con ese email. Después puedes enviarla por correo desde la lista o copiar el enlace para compartirlo por WhatsApp.</p>
          <InvitationForm />
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-1">Modo de entrada</h2>
            <p className="text-xs text-slate-500 mb-3">Qué pasa cuando alguien usa el código general de la familia.</p>
            <JoinModeForm current={family.joinMode} />
          </div>
          <div className="card">
            <h2 className="font-semibold mb-1">Código general</h2>
            <div className="text-2xl font-mono font-bold tracking-widest text-center bg-slate-50 rounded-lg py-2 border border-dashed border-slate-300 mb-2">{family.inviteCode}</div>
            <div className="flex flex-wrap gap-2 items-center">
              <CopyButton text={generalLink} label="Copiar enlace" />
              <RegenerateCodeForm />
            </div>
            {family.joinMode === "INVITE_ONLY" && <p className="text-xs text-amber-700 mt-2">Desactivado: solo se entra con invitación personal.</p>}
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold">Invitaciones enviadas ({invitations.length})</div>
        {invitations.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Todavía no has creado ninguna invitación personal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Para</th>
                  <th className="text-left px-2 py-2 font-medium">Código</th>
                  <th className="text-left px-2 py-2 font-medium">Estado</th>
                  <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Rol</th>
                  <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Caduca</th>
                  <th className="text-left px-2 py-2 font-medium hidden lg:table-cell">Creada</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => {
                  const st = statusOf(i);
                  return (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="px-5 py-2">
                        <div className="font-medium">{i.name ? firstName(i.name) : "Sin nombre"}</div>
                        <div className="text-xs text-slate-400">{i.email ?? "cualquier email"}{i.note ? ` · ${i.note}` : ""}</div>
                      </td>
                      <td className="px-2 py-2 font-mono tracking-wider">{i.code}</td>
                      <td className="px-2 py-2">
                        <span className={`badge ${STATUS_STYLE[st]}`}>{st}</span>
                        {st === "usada" && <div className="text-xs text-slate-400">{firstName(i.usedBy?.name)} · {i.usedAt ? fmtDate(i.usedAt) : ""}</div>}
                        {i.sentAt && st !== "usada" && <div className="text-xs text-slate-400">correo enviado el {fmtDate(i.sentAt)}{i.sentTo && i.sentTo !== i.email ? ` a ${i.sentTo}` : ""}</div>}
                      </td>
                      <td className="px-2 py-2 hidden md:table-cell">{i.role === "ADMIN" ? "Presidente del club" : "Miembro"}</td>
                      <td className="px-2 py-2 text-slate-500 hidden md:table-cell">{i.expiresAt ? fmtDate(i.expiresAt) : "nunca"}</td>
                      <td className="px-2 py-2 text-slate-500 hidden lg:table-cell">{fmtDate(i.createdAt)} · {firstName(i.createdBy.name)}</td>
                      <td className="px-5 py-2 text-right whitespace-nowrap">
                        {st === "pendiente" && (
                          <>
                            <span className="inline-block mr-2"><SendInvitationForm id={i.id} email={i.email} resend={Boolean(i.sentAt)} /></span>
                            <span className="inline-block mr-2"><CopyButton text={linkFor(i.code)} label="Copiar enlace" /></span>
                            <form action={revokeInvitationAction} className="inline"><input type="hidden" name="id" value={i.id} /><button className="text-xs text-slate-400 hover:text-red-600 mr-2">Anular</button></form>
                          </>
                        )}
                        {(st === "anulada" || st === "caducada") && (
                          <form action={renewInvitationAction} className="inline"><input type="hidden" name="id" value={i.id} /><button className="text-xs text-indigo-600 hover:underline mr-2">Reactivar 14 días</button></form>
                        )}
                        {st !== "usada" && (
                          <form action={deleteInvitationAction} className="inline"><input type="hidden" name="id" value={i.id} /><button className="text-xs text-slate-400 hover:text-red-600">Borrar</button></form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold">Miembros del club ({activeMembers.length})</div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-xs text-slate-500 bg-slate-50">
            <tr><th className="text-left px-5 py-2 font-medium">Nombre</th><th className="text-left px-2 py-2 font-medium">Rol</th><th className="text-right px-2 py-2 font-medium hidden md:table-cell">Operaciones</th><th className="text-left px-2 py-2 font-medium hidden md:table-cell">Alta</th><th className="px-5 py-2" /></tr>
          </thead>
          <tbody>
            {activeMembers.map((m) => {
              const isMe = m.id === admin.id;
              const lastAdmin = m.role === "ADMIN" && activeAdmins <= 1;
              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-5 py-2"><div className="flex items-center gap-2.5"><Avatar id={m.id} name={m.name} updatedAt={m.avatarUpdatedAt} size={32} /><div><div className="font-medium">{firstName(m.name)}{isMe ? " (tú)" : ""}</div><div className="text-xs text-slate-400">{m.email}</div></div></div></td>
                  <td className="px-2 py-2">
                    <form action={setMemberRoleAction} className="inline-flex items-center gap-1">
                      <input type="hidden" name="userId" value={m.id} />
                      <select name="role" defaultValue={m.role} className="input py-1 text-xs w-auto" disabled={lastAdmin}>
                        <option value="MEMBER">Miembro</option>
                        <option value="ADMIN">Presidente del club</option>
                      </select>
                      {!lastAdmin && <button className="text-xs text-indigo-600 hover:underline">Guardar</button>}
                    </form>
                    {lastAdmin && <div className="text-[11px] text-slate-400">Único presidente</div>}
                  </td>
                  <td className="px-2 py-2 text-right hidden md:table-cell">{m._count.trades}</td>
                  <td className="px-2 py-2 text-slate-500 hidden md:table-cell">{fmtDate(m.createdAt)}</td>
                  <td className="px-5 py-2 text-right">
                    {!isMe && !lastAdmin && (
                      <form action={removeMemberAction} className="inline"><input type="hidden" name="userId" value={m.id} /><ConfirmButton className="text-xs text-slate-400 hover:text-red-600" message={`¿Expulsar a ${firstName(m.name)} del club? Se borrarán su cuenta, sus operaciones y sus aportaciones. Esta acción no se puede deshacer.`}>Expulsar</ConfirmButton></form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
