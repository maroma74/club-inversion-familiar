"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { num: string; label: string; href: string; note?: string; admin?: boolean };
type Group = { header: string; items: Item[] };

const GROUPS: Group[] = [
  { header: "Aprender", items: [{ num: "01", label: "Inicio", href: "/inicio" }, { num: "02", label: "Academia", href: "/academia" }] },
  {
    header: "Invertir",
    items: [
      { num: "03", label: "Cartera del mes", href: "/cartera" },
      { num: "04", label: "Liga de inversión", href: "/inversiones" },
      { num: "05", label: "Operaciones", href: "/operaciones" },
      { num: "06", label: "Acciones", href: "/acciones" },
      { num: "07", label: "ETF", href: "/etf" },
      { num: "08", label: "Cripto", href: "/cripto" },
    ],
  },
  { header: "Club", items: [{ num: "09", label: "Familia", href: "/familia" }, { num: "10", label: "Invitaciones", href: "/invitaciones", note: "presidente", admin: true }] },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col md:px-3 md:py-1 md:gap-0.5 flex-1 overflow-x-auto">
      {GROUPS.map((g) => (
        <div key={g.header} className="flex md:flex-col md:gap-0.5 shrink-0">
          <div className="nav-header hidden md:block text-[10px] tracking-[0.12em] uppercase font-semibold" style={{ padding: "14px 10px 4px" }}>{g.header}</div>
          {g.items
            .filter((i) => !i.admin || isAdmin)
            .map((i) => {
              const on = path === i.href || path.startsWith(i.href + "/");
              return (
                <Link key={i.href} href={i.href} data-active={on ? "true" : "false"} className="nav-link flex items-center gap-2.5 w-full text-left text-[14px] no-underline whitespace-nowrap border border-transparent" style={{ padding: "8px 10px" }}>
                  <span className="nav-num font-mono text-[11px] w-[20px]">{i.num}</span>
                  <span className="flex-1 font-medium">{i.label}</span>
                  {i.note && <span className="text-[10px] opacity-60">{i.note}</span>}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
