import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { searchSymbols } from "@/lib/prices";

export async function GET(req: Request) {
  if (!(await getSessionUserId())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json([]);
  try {
    return NextResponse.json(await searchSymbols(q));
  } catch {
    return NextResponse.json([]);
  }
}
