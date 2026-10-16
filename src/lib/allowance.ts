import type { Prisma } from "@prisma/client";

/**
 * La paga de un mes puede llegar por dos caminos y los dos dejan una aportación con nota de «Paga mensual»:
 *  - el reparto manual del presidente en Familia: «Paga mensual AAAA-MM»;
 *  - publicar la cartera del mes: «Paga mensual AAAA-MM · título de la cartera».
 * Todo lo que necesite saber si un miembro ya cobró la paga de un mes debe usar esta regla única,
 * para que un camino no ignore al otro (y no se pague dos veces el mismo mes).
 */
export const allowanceNote = (ym: string) => `Paga mensual ${ym}`;

/** Condición de Prisma: la aportación es la paga del mes `ym`, venga del reparto manual o de una cartera. */
export const allowanceWhere = (ym: string): Prisma.ContributionWhereInput => ({
  OR: [{ note: allowanceNote(ym) }, { note: { startsWith: `${allowanceNote(ym)} · ` } }],
});
