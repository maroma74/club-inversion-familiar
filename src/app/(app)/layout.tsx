import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/names";
import { prisma } from "@/lib/prisma";
import { levelFromPoints, POINTS_PER_BADGE, POINTS_PER_LESSON } from "@/lib/academy";
import { isDeadlinePassed, roleLabel } from "@/lib/monthly";
import { logoutAction } from "@/app/actions/auth";
import { MobileNav, NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewAsBar } from "@/components/ViewAsBar";
import { Avatar } from "@/components/Avatar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lessonsPassed = await prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } });
  const lv = levelFromPoints(user.badgeCount * POINTS_PER_BADGE + lessonsPassed * POINTS_PER_LESSON);

  // Señal parpadeante en «Cartera del mes»: hay una cartera abierta y a este usuario todavía le queda decidir
  // (tiene importe asignado, no ha enviado su decisión y el plazo no ha terminado).
  const open = await prisma.monthlyPortfolio.findFirst({
    where: { familyId: user.familyId, status: "PUBLISHED" },
    orderBy: { month: "desc" },
    select: { deadline: true, allocations: { where: { userId: user.id }, select: { amount: true } }, decisions: { where: { userId: user.id }, select: { id: true } } },
  });
  const pendingDecision = !!open && !isDeadlinePassed(open) && (open.allocations[0]?.amount ?? 0) > 0 && open.decisions.length === 0;
  const alertHref = pendingDecision ? "/cartera" : null;

  const userMeta = `${roleLabel(user.role)} · Nivel ${lv.level}`;
  const logout = (
    <form action={logoutAction}>
      <button className="btn-ghost text-[12px]">Salir</button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <MobileNav
        isAdmin={user.role === "ADMIN"}
        isSiteAdmin={user.siteAdmin}
        alertHref={alertHref}
        familyName={user.family.name}
        userName={firstName(user.name)}
        userAvatar={<Avatar id={user.id} name={user.name} updatedAt={user.avatarUpdatedAt} size={36} />}
        userMeta={userMeta}
        footer={
          <>
            <ThemeToggle />
            {logout}
          </>
        }
      />
      <aside className="sidebar hidden md:flex md:flex-[0_0_248px] md:min-w-[220px] flex-col md:sticky md:top-0 md:h-screen md:self-start">
        <Link href="/inicio" className="flex items-center gap-3 no-underline" style={{ padding: "18px 20px 14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isotipo.svg" alt="" width={40} height={40} className="rounded-xl shrink-0" />
          <div className="min-w-0">
            <div className="font-heading text-[16px] leading-[1.15] font-extrabold">Club de Inversión Familiar</div>
            <div className="text-[11px] opacity-70 truncate">{user.family.name}</div>
          </div>
        </Link>
        <NavLinks isAdmin={user.role === "ADMIN"} isSiteAdmin={user.siteAdmin} alertHref={alertHref} />
        {/* Pie: nombre y nivel en su propia fila (ancho completo) y los botones debajo, para que el nombre no se recorte */}
        <div className="flex flex-col gap-2 border-t border-[rgba(248,250,252,0.12)]" style={{ padding: "12px 20px 14px" }}>
          <Link href="/perfil" className="flex items-center gap-2.5 min-w-0 no-underline" title="Mi perfil y foto">
            <Avatar id={user.id} name={user.name} updatedAt={user.avatarUpdatedAt} size={36} />
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate">{firstName(user.name)}</div>
              <div className="text-[11px] opacity-70 truncate">{userMeta}</div>
            </div>
          </Link>
          <div className="flex items-center gap-1 pl-[46px]">
            <ThemeToggle />
            {logout}
          </div>
        </div>
      </aside>
      <main id="contenido" tabIndex={-1} className="app-main flex-1 min-w-0 max-w-[1240px] outline-none">
        {user.realRole === "ADMIN" && <ViewAsBar previewAsMember={user.previewAsMember} />}
        {children}
      </main>
    </div>
  );
}
