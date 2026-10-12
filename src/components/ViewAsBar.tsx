"use client";

import { usePathname } from "next/navigation";
import { setViewAsAction } from "@/app/actions/view";

/** Barra superior del presidente: alterna entre su vista y la vista exacta de un miembro. */
export function ViewAsBar({ previewAsMember }: { previewAsMember: boolean }) {
  const path = usePathname();
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 text-[13px]"
      style={{
        padding: "8px 14px",
        marginBottom: 20,
        borderRadius: 12,
        border: `1px solid ${previewAsMember ? "#e5a016" : "var(--color-divider)"}`,
        background: previewAsMember ? "var(--color-amber-100)" : "var(--color-surface)",
        color: previewAsMember ? "var(--color-amber-700)" : "var(--color-text-muted)",
      }}
    >
      <span>
        {previewAsMember ? (
          <>
            <b>Vista de miembro.</b> Estás viendo la app tal y como la ven los miembros del club: sin gestión de carteras, invitaciones ni ajustes.
          </>
        ) : (
          <>
            <b>Vista de presidente.</b> Comprueba cómo verán cada página los miembros antes de publicar.
          </>
        )}
      </span>
      <form action={setViewAsAction}>
        <input type="hidden" name="back" value={path} />
        <input type="hidden" name="mode" value={previewAsMember ? "admin" : "member"} />
        <button className={previewAsMember ? "btn-primary text-[12px]" : "btn-secondary text-[12px]"} style={{ padding: "5px 12px" }}>
          {previewAsMember ? "Volver a la vista de presidente" : "Previsualizar como miembro"}
        </button>
      </form>
    </div>
  );
}
