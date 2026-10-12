"use client";

import { useEffect, useState } from "react";

/** Alterna modo claro/oscuro y lo recuerda en el navegador. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* sin almacenamiento */
    }
    setTheme(next);
  }
  return (
    <button type="button" onClick={toggle} className="btn-ghost text-[12px]" title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} aria-label="Cambiar tema">
      {theme === "dark" ? "Claro" : "Oscuro"}
    </button>
  );
}
