import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchSymbols } from "@/lib/prices";

/** Búsqueda de símbolos por nombre o ticker (solo miembros activos). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 1) return NextResponse.json([]);
  try {
    return NextResponse.json(await searchSymbols(q));
  } catch {
    return NextResponse.json([]);
  }
}
