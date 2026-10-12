export const eur = (n: number, digits = 2) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

export const pct = (n: number, digits = 1) =>
  `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)} %`;

export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1),
  );
};

export const ymOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
