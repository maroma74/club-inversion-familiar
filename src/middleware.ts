import { NextResponse, type NextRequest } from "next/server";
import { isDirectRunHost } from "@/lib/host";

/**
 * Content-Security-Policy con nonce por petición. Next.js lee el nonce de la cabecera CSP de la petición
 * y lo aplica a sus propios scripts; el script del tema en el layout lo recibe por la cabecera x-nonce.
 * Los estilos admiten inline por recharts y los estilos de los componentes; las imágenes externas son
 * los logos de criptomonedas (CoinGecko) y las miniaturas de noticias.
 */
export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (isDirectRunHost(req.headers)) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [
    {
      // Todo salvo los recursos estáticos y las rutas de API (que devuelven JSON)
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|logo.svg|isotipo.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
