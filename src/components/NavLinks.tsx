"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { num: string; label: string; href: string; note?: string; admin?: boolean };
type Group = { header: string; items: Item[] };

const GROUPS: Group[] = [
  { header: "Aprender", items: [{ num: "01", label: "Inicio", href: "/inicio" }, { num: "02", label: "Academia", href: "/academia" }] },
  {
    header: "Invertir",
    items: [
      { num: "03", label: "Cartera del mes", href: "/cartera" },
      { num: "03", label: "Gestión de carteras", href: "/cartera/gestion", note: "presidente", admin: true },
      { num: "04", label: "Liga de inversión", href: "/inversiones" },
      { num: "05", label: "Operaciones", href: "/operaciones" },
      { num: "06", label: "Acciones", href: "/acciones" },
      { num: "07", label: "ETF", href: "/etf" },
      { num: "08", label: "Cripto", href: "/cripto" },
      { num: "09", label: "Materias primas", href: "/materias-primas" },
    ],
  },
  { header: "Club", items: [{ num: "10", label: "Familia", href: "/familia" }, { num: "11", label: "Invitaciones", href: "/invitaciones", note: "presidente", admin: true }, { num: "12", label: "Comunicaciones", href: "/comunicaciones", note: "presidente", admin: true }] },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Punto parpadeante y etiqueta «Abierta» que avisan de una cartera pendiente de decidir. */
function AlertMark() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="nav-alert-tag">Abierta</span>
      <span className="alert-dot" aria-hidden="true" />
      <span className="sr-only">: hay una cartera del mes abierta pendiente de tu decisión</span>
    </span>
  );
}

/** Navegación lateral de escritorio (dentro de la barra navy). */
export function NavLinks({ isAdmin, alertHref = null }: { isAdmin: boolean; alertHref?: string | null }) {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col px-3 py-1 gap-0.5 flex-1">
      {GROUPS.map((g) => (
        <div key={g.header} className="flex flex-col gap-0.5">
          <div className="nav-header text-[11px] tracking-[0.12em] uppercase font-semibold" style={{ padding: "14px 10px 4px" }}>{g.header}</div>
          {g.items
            .filter((i) => !i.admin || isAdmin)
            .map((i) => (
              <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined} data-active={isActive(path, i.href) ? "true" : "false"} data-alert={alertHref === i.href ? "true" : "false"} className="nav-link flex items-center gap-2.5 w-full text-left text-[14px] no-underline whitespace-nowrap border border-transparent" style={{ padding: "8px 10px" }}>
                <span className="nav-num font-mono text-[11px] w-[20px]">{i.num}</span>
                <span className="flex-1 font-medium">{i.label}</span>
                {alertHref === i.href && <AlertMark />}
                {i.note && <span className="text-[11px] opacity-70">{i.note}</span>}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Cabecera fija para móvil con menú desplegable: enlaces por grupos, usuario, tema y salir.
 * `footer` recibe los controles que necesitan acciones de servidor (botón Salir) desde el layout.
 */
export function MobileNav({ isAdmin, familyName, userName, userMeta, userAvatar, footer, alertHref = null }: { isAdmin: boolean; familyName: string; userName: string; userMeta: string; userAvatar?: React.ReactNode; footer: React.ReactNode; alertHref?: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Se cierra al cambiar de página y con Escape; bloquea el scroll de fondo mientras está abierto.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const current = GROUPS.flatMap((g) => g.items).find((i) => isActive(path, i.href));

  return (
    <>
      <header className="sidebar md:hidden sticky top-0 z-40 flex items-center gap-3" style={{ padding: "10px 12px 10px 16px", minHeight: 60 }}>
        <Link href="/inicio" className="flex items-center gap-2.5 no-underline min-w-0 flex-1" aria-label="Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/isotipo.svg" alt="" width={34} height={34} className="rounded-lg shrink-0" />
          <span className="min-w-0">
            <span className="block font-heading text-[14px] leading-tight font-extrabold truncate">{current?.label ?? "Club de Inversión Familiar"}</span>
            <span className="block text-[11px] opacity-70 truncate">{familyName}</span>
          </span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} className="mobile-menu-btn" aria-label="Abrir el menú" aria-expanded={open} aria-controls="menu-movil">
          <span aria-hidden="true" className="mobile-menu-icon" />
          <span className="text-[12px] font-semibold">Menú</span>
          {alertHref && (
            <>
              <span className="alert-dot menu-alert-dot" aria-hidden="true" />
              <span className="sr-only">: hay una cartera del mes abierta pendiente de tu decisión</span>
            </>
          )}
        </button>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 w-full h-full bg-[rgba(14,33,56,0.55)]" aria-label="Cerrar el menú" onClick={() => setOpen(false)} />
          <div id="menu-movil" className="sidebar mobile-drawer absolute top-0 right-0 bottom-0 flex flex-col">
            <div className="flex items-center justify-between gap-3" style={{ padding: "14px 16px 10px 20px" }}>
              <div className="min-w-0">
                <div className="font-heading text-[15px] font-extrabold leading-tight">Club de Inversión Familiar</div>
                <div className="text-[11px] opacity-70 truncate">{familyName}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-[13px]" aria-label="Cerrar el menú">Cerrar</button>
            </div>
            <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pb-3">
              {GROUPS.map((g) => (
                <div key={g.header} className="flex flex-col gap-0.5">
                  <div className="nav-header text-[11px] tracking-[0.12em] uppercase font-semibold" style={{ padding: "14px 10px 4px" }}>{g.header}</div>
                  {g.items
                    .filter((i) => !i.admin || isAdmin)
                    .map((i) => (
                      <Link key={i.href} href={i.href} aria-current={isActive(path, i.href) ? "page" : undefined} data-active={isActive(path, i.href) ? "true" : "false"} data-alert={alertHref === i.href ? "true" : "false"} className="nav-link flex items-center gap-3 w-full text-left text-[16px] no-underline border border-transparent" style={{ padding: "12px 12px" }}>
                        <span className="nav-num font-mono text-[12px] w-[22px]">{i.num}</span>
                        <span className="flex-1 font-medium">{i.label}</span>
                        {alertHref === i.href && <AlertMark />}
                        {i.note && <span className="text-[11px] opacity-60">{i.note}</span>}
                      </Link>
                    ))}
                </div>
              ))}
            </nav>
            <div className="border-t border-[rgba(248,250,252,0.12)] flex items-center justify-between gap-2" style={{ padding: "14px 16px 18px 20px" }}>
              <Link href="/perfil" className="flex items-center gap-2.5 min-w-0 no-underline" title="Mi perfil y foto">
                {userAvatar}
                <div className="min-w-0">
                  <div className="text-[14px] font-medium truncate">{userName}</div>
                  <div className="text-[11px] opacity-70">{userMeta}</div>
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0">{footer}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
