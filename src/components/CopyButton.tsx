"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar informe" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary py-1 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* portapapeles no disponible */
        }
      }}
    >
      {done ? "✓ Copiado" : label}
    </button>
  );
}
