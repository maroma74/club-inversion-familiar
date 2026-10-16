/**
 * Formato de precios con decimales según la magnitud: una acción de 40 € necesita 2 decimales,
 * pero Dogecoin (0,0761 €) o Shiba Inu (0,000006 €) quedarían en 0,08 o 0,00 con dos.
 */
export const priceDecimals = (n: number) => {
  const a = Math.abs(n);
  return a >= 1 ? 2 : a >= 0.01 ? 4 : 6;
};

/** Precio como texto con los decimales adecuados a su magnitud. */
export const fp = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: priceDecimals(n), maximumFractionDigits: priceDecimals(n) });

/** Redondea un nivel de precio (entrada, stop, objetivo) sin destruir las monedas de céntimos. */
export const rp = (n: number) => Number(n.toFixed(priceDecimals(n)));
