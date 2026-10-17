import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchSymbols } from "@/lib/prices";
import { searchCommodities } from "@/lib/commodities";
import { rateLimit } from "@/lib/ratelimit";

/** Búsqueda de símbolos por nombre o ticker (solo miembros activos). Incluye las materias primas del catálogo del club. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const limit = await rateLimit(`api-symbols:${user.id}`, 90, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Demasiadas búsquedas seguidas" }, { status: 429 });
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 1) return NextResponse.json([]);
  // En la sección de materias primas solo se buscan las del catálogo (rápido y sin salir a Yahoo)
  if (params.get("kind") === "COMMODITY") return NextResponse.json(searchCommodities(q));
  const commodities = q.length >= 2 ? searchCommodities(q).slice(0, 5) : [];
  try {
    return NextResponse.json([...commodities, ...(await searchSymbols(q))]);
  } catch {
    return NextResponse.json(commodities);
  }
}
