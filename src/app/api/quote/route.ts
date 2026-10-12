import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { fetchQuote } from "@/lib/prices";

/** Cotización actual de un símbolo en su divisa nativa (para prellenar el formulario de operación). */
export async function GET(req: Request) {
  if (!(await getSessionUserId())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!symbol) return NextResponse.json({ error: "Falta el símbolo" }, { status: 400 });
  try {
    const q = await fetchQuote(symbol);
    const currency = q.currency === "GBp" ? "GBP" : q.currency;
    const price = q.currency === "GBp" ? q.price / 100 : q.price;
    return NextResponse.json({ symbol: q.symbol, name: q.name, price, currency, priceEur: q.priceEur });
  } catch {
    return NextResponse.json({ error: "Sin cotización" }, { status: 404 });
  }
}
