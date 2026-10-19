// Servidor estático mínimo para componer los vídeos promocionales en el navegador (localhost = contexto seguro
// para WebCodecs). Sirve esta carpeta y, bajo /hijos/, /presi/ y /brand/, las capturas de los recorridos y el logo;
// bajo /videos/, los MP4 ya generados (para revisarlos).
// Uso: node scripts/video/serve.mjs, abre en Chrome http://localhost:4317/?v=presi (o ?v=hijos) con &f=vertical,
// horizontal o cuadrado, y ejecuta renderVideo() en la consola: descarga el MP4. preview(segundos) pinta un fotograma.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const roots = {
  "/hijos/": "C:/dev/FinanzasFamilia/docs/marketing/onboarding-hijos/",
  "/presi/": "C:/dev/FinanzasFamilia/docs/marketing/onboarding-presidente/",
  "/brand/": "C:/dev/FinanzasFamilia/public/",
  "/videos/": path.resolve(here, "../../docs/marketing/videos/"),
};
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".mp4": "video/mp4" };

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = null;
  for (const [prefix, dir] of Object.entries(roots)) if (url.startsWith(prefix)) file = path.join(dir, url.slice(prefix.length));
  if (!file) file = path.join(here, url === "/" ? "index.html" : url);
  // Solo dentro de las carpetas permitidas
  const allowed = [here, ...Object.values(roots)].some((d) => path.resolve(file).startsWith(path.resolve(d)));
  if (!allowed || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("no"); return; }
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(4317, "127.0.0.1", () => console.log("http://localhost:4317"));
