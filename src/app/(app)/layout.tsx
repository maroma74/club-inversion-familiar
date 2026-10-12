import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromPoints, POINTS_PER_BADGE, POINTS_PER_LESSON } from "@/lib/academy";
import { roleLabel } from "@/lib/monthly";
import { logoutAction } from "@/app/actions/auth";
import { MobileNav, NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewAsBar } from "@/components/ViewAsBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lessonsPassed = await prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } });
  const lv = levelFromPoints(user.badgeCount * POINTS_PER_BADGE + lessonsPassed * POINTS_PER_LESSON);

  const userMeta = `${roleLabel(user.role)} · Nivel ${lv.level}`;
  const logout = (
    <form action={logoutAction}>
      <button className="btn-ghost text-[12px]">Salir</button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <MobileNav
        isAdmin={user.role === "ADMIN"}
        familyName={user.family.name}
        userName={user.name}
        userMeta={userMeta}
        footer={
          <>
            <ThemeToggle />
            {logout}
          </>
        }
      />
      <aside className="sidebar hidden md:flex md:flex-[0_0_248px] md:min-w-[220px] flex-col md:min-h-screen md:sticky md:top-0 md:max-h-screen">
        <Link href="/inicio" className="flex items-center gap-3 no-underline" style={{ padding: "18px 20px 14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isotipo.svg" alt="" width={40} height={40} className="rounded-xl shrink-0" />
          <div className="min-w-0">
            <div className="font-heading text-[16px] leading-[1.15] font-extrabold">Club de Inversión Familiar</div>
            <div className="text-[11px] opacity-70 truncate">{user.family.name}</div>
          </div>
        </Link>
        <NavLinks isAdmin={user.role === "ADMIN"} />
        <div className="flex items-center justify-between gap-2 border-t border-[rgba(248,250,252,0.12)]" style={{ padding: "14px 20px" }}>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate">{user.name}</div>
            <div className="text-[11px] opacity-70">{userMeta}</div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {logout}
          </div>
        </div>
      </aside>
      <main className="app-main flex-1 min-w-0 max-w-[1240px]">
        {user.realRole === "ADMIN" && <ViewAsBar previewAsMember={user.previewAsMember} />}
        {children}
      </main>
    </div>
  );
}
