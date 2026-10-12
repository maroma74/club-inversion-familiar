import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchQuote } from "@/lib/prices";
import { symbolSchema } from "@/lib/validation";

/** Cotización actual de un símbolo en su divisa nativa (para prellenar el formulario de operación). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = symbolSchema.safeParse(new URL(req.url).searchParams.get("symbol") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Símbolo no válido" }, { status: 400 });
  try {
    const q = await fetchQuote(parsed.data);
    const currency = q.currency === "GBp" ? "GBP" : q.currency;
    const price = q.currency === "GBp" ? q.price / 100 : q.price;
    return NextResponse.json({ symbol: q.symbol, name: q.name, price, currency, priceEur: q.priceEur });
  } catch {
    return NextResponse.json({ error: "Sin cotización" }, { status: 404 });
  }
}
