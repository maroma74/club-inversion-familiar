/**
 * Libro de posiciones: reproduce las operaciones en orden cronológico y detecta ventas de lo que no se tenía.
 * Módulo puro (sin base de datos ni precios) para poder validar una operación antes de guardarla y probarlo.
 */

export type LedgerTrade = { symbol: string; side: string; quantity: number; date: Date; createdAt?: Date | null };

/** Orden de reproducción: por fecha y, dentro del mismo día, por orden de registro (lo nuevo, al final). */
export function sortTrades<T extends LedgerTrade>(trades: T[]): T[] {
  return [...trades].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
}

export type Oversell = { symbol: string; date: Date; held: number; wanted: number };

/**
 * Primera venta que supera lo que se tenía en ese momento, o null si el historial es coherente.
 * Un historial coherente nunca deja una posición en negativo en ninguna fecha.
 */
export function firstOversell(trades: LedgerTrade[]): Oversell | null {
  const held = new Map<string, number>();
  for (const t of sortTrades(trades)) {
    const sym = t.symbol.toUpperCase();
    const have = held.get(sym) ?? 0;
    if (t.side === "SELL") {
      if (t.quantity > have + 1e-9) return { symbol: sym, date: t.date, held: have, wanted: t.quantity };
      held.set(sym, have - t.quantity);
    } else {
      held.set(sym, have + t.quantity);
    }
  }
  return null;
}
