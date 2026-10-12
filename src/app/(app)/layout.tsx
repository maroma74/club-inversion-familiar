import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromPoints, POINTS_PER_BADGE, POINTS_PER_LESSON } from "@/lib/academy";
import { roleLabel } from "@/lib/monthly";
import { logoutAction } from "@/app/actions/auth";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lessonsPassed = await prisma.lessonProgress.count({ where: { userId: user.id, completedAt: { not: null } } });
  const lv = levelFromPoints(user.badgeCount * POINTS_PER_BADGE + lessonsPassed * POINTS_PER_LESSON);

  return (
    <div className="min-h-screen flex flex-wrap">
      <aside className="sidebar flex-[1_0_100%] md:flex-[0_0_248px] md:min-w-[220px] flex flex-col md:min-h-screen">
        <Link href="/inicio" className="flex items-center gap-3 no-underline" style={{ padding: "18px 20px 14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isotipo.svg" alt="" width={40} height={40} className="rounded-xl shrink-0" />
          <div className="min-w-0">
            <div className="font-heading text-[16px] leading-[1.15] font-extrabold">Club de Inversión Familiar</div>
            <div className="text-[11px] opacity-70 truncate">{user.family.name}</div>
          </div>
        </Link>
        <NavLinks isAdmin={user.role === "ADMIN"} />
        <div className="hidden md:flex items-center justify-between gap-2 border-t border-[rgba(248,250,252,0.12)]" style={{ padding: "14px 20px" }}>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate">{user.name}</div>
            <div className="text-[11px] opacity-70">{roleLabel(user.role)} · Nivel {lv.level}</div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="btn-ghost text-[12px]">Salir</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-[1_1_640px] min-w-0 max-w-[1240px]" style={{ padding: "32px clamp(16px, 4vw, 48px) 64px" }}>{children}</main>
    </div>
  );
}
