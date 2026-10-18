"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { stopViewAsMemberAction } from "@/app/actions/view";

/**
 * Barra fija mientras el presidente ve el club como otro miembro: deja claro de quién es la vista, que es solo
 * lectura y cómo volver. Si se intentó guardar algo, lo dice (la acción se bloqueó en el servidor).
 */
export function ViewingAsBar({ memberName, memberId }: { memberName: string; memberId: string }) {
  const path = usePathname();
  const blocked = useSearchParams().get("solo-lectura") === "1";
  return (
    <div role="status" className="viewing-as" data-blocked={blocked ? "true" : "false"}>
      <span className="min-w-0 [text-wrap:pretty]">
        {blocked ? (
          <><b>No se ha guardado nada.</b> Estás viendo el club como {memberName}: es solo para mirar.</>
        ) : (
          <><b>Estás viendo el club como {memberName}.</b> Ves exactamente lo que ve en <span className="whitespace-nowrap">{path}</span>. Es solo lectura.</>
        )}
      </span>
      <form action={stopViewAsMemberAction}>
        <input type="hidden" name="back" value={`/familia/miembro/${memberId}`} />
        <button className="btn-primary text-[13px]" style={{ padding: "6px 14px" }}>Volver a mi vista</button>
      </form>
    </div>
  );
}
