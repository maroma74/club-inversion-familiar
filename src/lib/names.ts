/**
 * Nombres para mostrar. En la app y en los rankings solo se ve el nombre de pila, nunca los apellidos.
 * Módulo puro: se puede usar desde servidor y desde componentes de cliente.
 */

/** Primer nombre de un nombre completo: «Miguel Angel Rodero Mateos» → «Miguel». */
export function firstName(full: string | null | undefined): string {
  const t = (full ?? "").trim();
  if (!t) return "";
  return t.split(/\s+/)[0];
}

/**
 * Nombres para mostrar únicos dentro de un grupo (la familia): el nombre de pila y, solo si dos miembros se llaman
 * igual, la inicial del último apellido («Miguel R.»). Los gráficos y las estadísticas usan el nombre como clave,
 * así que no puede repetirse.
 */
export function uniqueFirstNames(users: { id: string; name: string }[]): Map<string, string> {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const u of users) {
    const key = firstName(u.name).toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const list of groups.values()) {
    for (const u of list) {
      const parts = u.name.trim().split(/\s+/);
      let label = firstName(u.name);
      if (list.length > 1 && parts.length > 1) label = `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
      // Si todavía coincide (mismo nombre e inicial), se numera
      let candidate = label;
      for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${label} ${n}`;
      used.add(candidate.toLowerCase());
      out.set(u.id, candidate);
    }
  }
  return out;
}
