import Link from "next/link";
import { requireSiteAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { firstName } from "@/lib/names";
import { getFamiliesActivity, getSiteStats, getSiteUsers } from "@/lib/siteAdmin";
import { aiConfigured, getAiModel } from "@/lib/ai";
import { aiModelName } from "@/lib/aiModels";
import { AiCheckForm, AiModelForm, PackForm } from "./forms";

const fmtDateTime = (d: Date) => d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const STATE: Record<"activa" | "dormida" | "sin-accesos", { label: string; cls: string }> = {
  activa: { label: "Activa", cls: "tag-accent" },
  dormida: { label: "Sin actividad 30 días", cls: "tag-gold" },
  "sin-accesos": { label: "Sin accesos registrados", cls: "tag-neutral" },
};

function Cell({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-[0.08em] uppercase text-neutral-700">{label}</div>
      <div className="figure text-[26px]">{value}</div>
      {hint && <div className="text-xs text-neutral-700">{hint}</div>}
    </div>
  );
}

/** Administración de la web: cifras globales, accesos, actividad por familia y paquetes de invitaciones. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireSiteAdmin();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 60);
  const [stats, families, users, aiModel] = await Promise.all([getSiteStats(), getFamiliesActivity(), getSiteUsers(query), getAiModel()]);
  const maxDay = Math.max(1, ...stats.loginsByDay.map((d) => d.count));
  const activeFamilies = families.filter((f) => f.state === "activa").length;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <div className="card-kicker text-[11px]">Administración de la web</div>
        <h1 className="mt-1 mb-1">Todas las familias</h1>
        <p className="m-0 text-neutral-700 max-w-[70ch] [text-wrap:pretty]">Cifras del sitio, accesos y actividad por familia, y paquetes de invitaciones. Solo recuentos y fechas: aquí no se ven operaciones ni importes de nadie. Los accesos se registran desde el 17 de octubre de 2026.</p>
      </header>

      <section className="cellgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }} aria-label="Cifras del sitio">
        <Cell label="Familias" value={stats.families} hint={`${activeFamilies} activas · ${stats.newFamilies30} nuevas en 30 días`} />
        <Cell label="Usuarios" value={stats.usersActive} hint={`${stats.presidents} presidentes · ${stats.usersPending} pendientes · ${stats.newUsers30} nuevos en 30 días`} />
        <Cell label="Accesos 7 días" value={stats.logins7} hint={`${stats.activeUsers7} usuarios distintos`} />
        <Cell label="Accesos 30 días" value={stats.logins30} hint={`${stats.activeUsers30} usuarios distintos`} />
        <Cell label="Invitaciones a familias" value={stats.familyInvitesUsed} hint={`clubes fundados · ${stats.familyInvitesPending} pendientes`} />
      </section>

      <section className="card gap-2" aria-labelledby="accesos-dia">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="accesos-dia" className="m-0">Accesos por día</h3>
          <span className="text-xs text-neutral-700">últimos 30 días · hora de Madrid</span>
        </div>
        <ol className="m-0 p-0 list-none flex items-end gap-[3px] h-[96px]" aria-label="Accesos por día">
          {stats.loginsByDay.map((d) => (
            <li key={d.day} className="flex-1 min-w-0 flex flex-col justify-end h-full" title={`${d.day}: ${d.count} ${d.count === 1 ? "acceso" : "accesos"}`}>
              <span className="sr-only">{d.day}: {d.count}</span>
              <span aria-hidden="true" className="block rounded-t-[3px]" style={{ height: `${Math.max(d.count ? 6 : 2, Math.round((d.count / maxDay) * 100))}%`, background: d.count ? "linear-gradient(180deg, #34d399, #047857)" : "var(--color-neutral-300)" }} />
            </li>
          ))}
        </ol>
        <div className="flex justify-between text-[11px] text-neutral-700 tabular-nums"><span>{stats.loginsByDay[0]?.day}</span><span>{stats.loginsByDay.at(-1)?.day}</span></div>
      </section>

      <section className="card gap-2" aria-labelledby="ia-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="ia-title" className="m-0">Análisis con IA (Claude)</h3>
          {aiConfigured() ? <span className="tag tag-accent">Clave configurada</span> : <span className="tag tag-gold">Falta la clave</span>}
        </div>
        <p className="m-0 text-sm text-neutral-700 max-w-[80ch] [text-wrap:pretty]">
          {aiConfigured()
            ? `La clave está en el servidor y no se muestra en ningún sitio. Ahora se usa ${aiModelName(aiModel)}; la prueba comprueba la clave y ese modelo sin gastar tokens.`
            : "Añade ANTHROPIC_API_KEY al servidor (en local, en .env; en producción, en Secret Manager) para activar los análisis con IA. Puedes elegir ya el modelo."}
        </p>
        <AiModelForm current={aiModel} />
        {aiConfigured() && <AiCheckForm />}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="familias-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="familias-title" className="m-0">Actividad por familia</h3>
          <span className="text-xs text-neutral-700">recuentos de los últimos 30 días</span>
        </div>
        <div className="card card-table"><div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Familia</th><th>Miembros</th><th>Último acceso</th><th className="num">Accesos</th><th className="num">Operaciones</th><th className="num">Diario</th><th className="num">Decisiones</th><th className="num">Carteras</th><th className="num">Avisos</th><th>Invitó a</th><th>Estado</th></tr></thead>
          <tbody>
            {families.map((f) => (
              <tr key={f.id}>
                <td>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-neutral-700">desde {fmtDate(f.createdAt)}{f.invitedBy ? ` · invitada por ${f.invitedBy}` : ""}</div>
                </td>
                <td>
                  <div className="tabular-nums">{f.members}{f.pending ? ` (+${f.pending} pend.)` : ""}</div>
                  <div className="text-xs text-neutral-700">{f.presidents.length ? `preside ${f.presidents.map(firstName).join(", ")}` : "sin presidente"}</div>
                </td>
                <td className="whitespace-nowrap text-sm">{f.lastLoginAt ? fmtDateTime(f.lastLoginAt) : <span className="text-neutral-700">—</span>}</td>
                <td className="num">{f.logins30}</td>
                <td className="num">{f.trades30}</td>
                <td className="num">{f.journal30}</td>
                <td className="num">{f.decisions30}</td>
                <td className="num">{f.portfoliosPublished}</td>
                <td className="num">{f.communications}</td>
                <td className="tabular-nums whitespace-nowrap text-sm">{f.invitesUsed} {f.invitesUsed === 1 ? "club" : "clubes"}{f.invitesPending ? ` · ${f.invitesPending} pend.` : ""}</td>
                <td><span className={`tag ${STATE[f.state].cls}`}>{STATE[f.state].label}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="usuarios-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="usuarios-title" className="m-0">Usuarios y paquetes de invitaciones</h3>
          <form className="flex items-center gap-2" role="search">
            <input name="q" defaultValue={query} className="input py-1 text-sm w-60" placeholder="Nombre, email o familia" aria-label="Buscar usuarios" />
            <button className="btn-secondary py-1 text-xs">Buscar</button>
            {query && <Link href="/admin" className="btn-ghost text-xs">Quitar filtro</Link>}
          </form>
        </div>
        <p className="m-0 text-sm text-neutral-700 max-w-[80ch] [text-wrap:pretty]">El paquete son invitaciones para familias nuevas además de las cinco del club (un miembro solo puede invitar con paquete). «Sin límite» ignora cualquier recuento. «Administra la web» da acceso a esta pantalla.</p>
        <div className="card card-table"><div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Usuario</th><th>Familia</th><th>Último acceso</th><th className="num">Accesos</th><th className="num">Familias invitadas</th><th>Paquete de invitaciones</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="font-medium">{u.name}{u.id === me.id ? " (tú)" : ""}{u.siteAdmin && <span className="tag tag-ink ml-2">web</span>}</div>
                  <div className="text-xs text-neutral-700">{u.email} · {u.role === "ADMIN" ? "presidente" : "miembro"}{u.status === "PENDING" ? " · pendiente" : ""} · alta {fmtDate(u.createdAt)}</div>
                </td>
                <td>{u.familyName}</td>
                <td className="whitespace-nowrap text-sm">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : <span className="text-neutral-700">—</span>}</td>
                <td className="num">{u.logins}</td>
                <td className="num">{u.familyInvites}</td>
                <td><PackForm userId={u.id} pack={u.familyInvitePack} unlimited={u.unlimitedFamilyInvites} siteAdmin={u.siteAdmin} isMe={u.id === me.id} /></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="text-sm text-neutral-700">Ningún usuario coincide con «{query}».</td></tr>}
          </tbody>
        </table></div></div>
        {users.length >= 80 && <p className="m-0 text-xs text-neutral-700">Se muestran los 80 usuarios con acceso más reciente; usa el buscador para encontrar otros.</p>}
      </section>
    </div>
  );
}
