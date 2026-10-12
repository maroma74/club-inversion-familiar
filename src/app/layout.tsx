import type { Metadata } from "next";
import { headers } from "next/headers";
// Tipografías de la marca servidas desde la propia app (sin depender de Google Fonts al compilar ni al navegar).
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club de Inversión Familiar",
  description: "Aprende, invierte y crece en familia: paga mensual, carteras propuestas, liga de rentabilidad, academia y diario de inversión",
};

// Aplica el tema guardado antes de pintar para evitar parpadeos; sin preferencia, sigue al sistema.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t;}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce de la Content-Security-Policy generado en middleware.ts para este único script inline
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
