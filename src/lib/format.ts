export const eur = (n: number, digits = 2) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(n)
    .replace("-", "−"); // menos verdadero, igual que en los porcentajes

/** Número con coma decimal y un número fijo de decimales: «12,34». */
export const num = (n: number, digits = 2) => n.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Número con signo explícito y menos verdadero: «+0,45», «−1,20», «0,00». */
export const signed = (n: number, digits = 2) => {
  const rounded = Math.round(n * 10 ** digits) / 10 ** digits;
  return `${rounded > 0 ? "+" : rounded < 0 ? "\u2212" : ""}${num(Math.abs(rounded), digits)}`;
};

/** Porcentaje con signo, coma decimal y menos verdadero: «+12,34 %», «−3,10 %», «0,0 %». */
export const pct = (n: number, digits = 1) => {
  const rounded = Math.round(n * 100 * 10 ** digits) / 10 ** digits;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
};

export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

/** «hoy», «ayer», «hace 3 días»; a partir de dos semanas, la fecha completa. */
export const fmtRelative = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(date)) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 14) return `hace ${days} días`;
  return fmtDate(date);
};

export const monthLabel =(ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1),
  );
};

export const ymOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
