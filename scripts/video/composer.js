/* Compositor de vídeos promocionales del Club: dibuja cada fotograma en un canvas a partir de las capturas de los
   recorridos y lo codifica a MP4 (H.264) con WebCodecs + mp4-muxer. Determinista: el fotograma n depende solo de n,
   así que no se pierden fotogramas aunque el navegador vaya lento.
   Formatos (?f=): vertical 1080×1920 (Reels/Stories, por defecto), horizontal 1920×1080 (YouTube, web) y
   cuadrado 1080×1080 (feed). Vídeos (?v=): presi (puesta en marcha del club) e hijos (el primer mes de un hijo). */

const params = new URLSearchParams(location.search);
const FORMATS = { vertical: [1080, 1920], horizontal: [1920, 1080], cuadrado: [1080, 1080] };
const fmt = FORMATS[params.get("f")] ? params.get("f") : "vertical";
const [W, H] = FORMATS[fmt];
const TALL = fmt === "vertical", WIDE = fmt === "horizontal", SQ = fmt === "cuadrado";
const FPS = 30;
const C = { navy: "#0e2138", navy2: "#162e4a", deep: "#08131f", em: "#10b981", emInk: "#047857", emLight: "#34d399", amber: "#e5a016", paper: "#f8fafc", soft: "#d9e2ec", muted: "#9fb0c3", chat: "#e7efe4" };
const JK = '"Plus Jakarta Sans", system-ui, sans-serif';
const IN = '"Inter", system-ui, sans-serif';

const cv = document.getElementById("c");
cv.width = W; cv.height = H;
cv.style.width = `${(W / Math.max(W, H)) * 960}px`; cv.style.height = `${(H / Math.max(W, H)) * 960}px`;
const ctx = cv.getContext("2d");

/* ---------- utilidades ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3); // ease-out cúbica
const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const pick = (tall, wide, sq) => (TALL ? tall : WIDE ? wide : sq);

const imgs = {};
function load(key, src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => { imgs[key] = i; res(); }; i.onerror = () => rej(new Error("No carga " + src)); i.src = src; }); }

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function bg(t) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, C.navy2); g.addColorStop(0.55, C.navy); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // La gráfica de la marca, muy tenue, subiendo despacio (en proporción al formato)
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = C.em; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const pts = [[-0.04, 0.875], [0.13, 0.833], [0.28, 0.859], [0.435, 0.76], [0.59, 0.786], [0.74, 0.677], [0.89, 0.703], [1.06, 0.583]];
  const shift = Math.sin(t * 0.35) * 18;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H + shift) : ctx.moveTo(x * W, y * H + shift))); ctx.stroke();
  ctx.restore();
}

/** Texto con salto de línea a un ancho máximo. Devuelve la altura usada. */
function text(str, x, y, { size = 60, weight = 800, font = JK, color = "#fff", maxW = W - 120, lh = 1.12, align = "left", alpha = 1, track = -0.02 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "top";
  ctx.letterSpacing = `${track * size}px`;
  const lines = wrap(String(str), maxW);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  ctx.restore();
  return lines.length * size * lh;
}
function wrap(str, maxW) {
  const lines = [];
  for (const para of str.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test.replace(/\*/g, "")).width > maxW && line) { lines.push(line); line = word; } else line = test;
      // Palabras más largas que la línea (el enlace en formatos estrechos): se parten por caracteres
      while (ctx.measureText(line.replace(/\*/g, "")).width > maxW && line.length > 1) {
        let n = line.length - 1;
        while (n > 1 && ctx.measureText(line.slice(0, n).replace(/\*/g, "")).width > maxW) n--;
        lines.push(line.slice(0, n)); line = line.slice(n);
      }
    }
    lines.push(line);
  }
  return lines;
}
/** Altura que ocuparía un texto (para centrar bloques en vertical). */
function measure(str, { size = 60, weight = 800, font = JK, maxW = W - 120, lh = 1.12, track = -0.02 } = {}) {
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.letterSpacing = `${track * size}px`;
  const n = wrap(String(str), maxW).length; ctx.restore(); return n * size * lh;
}

/** Píldora de texto (etiqueta de paso). */
function pill(str, x, y, { size = 34, fg = "#fff", bgc = C.emInk, padX = 26, padY = 14 } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px ${IN}`; ctx.letterSpacing = "0px";
  const w = ctx.measureText(str).width + padX * 2, h = size + padY * 2;
  ctx.fillStyle = bgc; rr(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(str, x + padX, y + h / 2 + 1);
  ctx.restore();
  return h;
}

const PHONE_RATIO = 844 / 390;
const phoneHeight = (w) => (w - 40) * PHONE_RATIO + 40;

/** Marco de teléfono con una captura de móvil; `scroll` (0..1) recorre las capturas altas. */
function phone(key, x, y, w, scroll = 0, { pad = 0, bgc = "#fff" } = {}) {
  const im = imgs[key];
  const bezel = Math.round(w / 32), r = Math.round(w / 8.9);
  const sw = w - bezel * 2, sh = sw * PHONE_RATIO;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
  ctx.fillStyle = "#050b14"; rr(x, y, w, sh + bezel * 2, r); ctx.fill();
  ctx.restore();
  ctx.save();
  rr(x + bezel, y + bezel, sw, sh, r - bezel); ctx.clip();
  ctx.fillStyle = bgc; ctx.fillRect(x + bezel, y + bezel, sw, sh);
  if (im) {
    const p = (pad * sw) / 600;
    const iw = sw - p * 2;
    const ih = (im.height * iw) / im.width;
    const travel = Math.max(0, ih - (sh - p * 2));
    ctx.drawImage(im, x + bezel + p, y + bezel + p - travel * scroll, iw, ih);
  }
  ctx.restore();
}

/** Burbuja de chat con el texto apareciendo (proporción `reveal` 0..1). Negritas entre *asteriscos*. */
function chat(msg, from, x, y, w, reveal, k = 1) {
  const shown = msg.slice(0, Math.round(msg.length * clamp(reveal)));
  ctx.save();
  ctx.font = `600 ${30 * k}px ${IN}`; ctx.fillStyle = "#3b4a5c"; ctx.textBaseline = "top";
  ctx.fillText(from, x + 8, y);
  const size = 33 * k, lh = 1.42, padX = 30 * k, padY = 26 * k, top = y + 50 * k;
  ctx.font = `500 ${size}px ${IN}`; ctx.letterSpacing = "0px";
  const lines = wrap(shown, w - padX * 2);
  const bh = lines.length * size * lh + padY * 2 + 26 * k;
  ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#fff"; rr(x, top, w, bh, [28 * k, 28 * k, 28 * k, 6]); ctx.fill();
  ctx.shadowColor = "transparent";
  let bold = false;
  lines.forEach((l, i) => {
    let cx = x + padX;
    const cy = top + padY + i * size * lh;
    for (const part of l.split(/(\*)/)) {
      if (part === "*") { bold = !bold; continue; }
      ctx.font = `${bold ? 700 : 500} ${size}px ${IN}`;
      ctx.fillStyle = /clubdeinversionfamiliar\.com/.test(part) ? "#0a5fb4" : "#0e2138";
      ctx.fillText(part, cx, cy);
      cx += ctx.measureText(part).width;
    }
  });
  ctx.font = `500 ${24 * k}px ${IN}`; ctx.fillStyle = "#7a8796"; ctx.textAlign = "right";
  if (reveal >= 1) ctx.fillText("20:15", x + w - 22 * k, top + bh - 40 * k);
  ctx.restore();
}

function logo(x, y, w, alpha = 1) { const im = imgs.logo; if (!im) return; ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, (im.height * w) / im.width); ctx.restore(); }
const logoH = (w) => (imgs.logo ? (imgs.logo.height * w) / imgs.logo.width : 0);

function stamp() {
  ctx.save();
  ctx.font = `500 ${pick(24, 22, 20)}px ${IN}`; ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.textBaseline = "bottom"; ctx.textAlign = "right";
  ctx.fillText("Datos de ejemplo", W - pick(50, 60, 36), H - pick(46, 36, 28));
  ctx.restore();
}

function ctaButton(cx, y, alpha) {
  const w = pick(800, 760, 700), h = pick(120, 104, 100);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = C.emInk; rr(cx - w / 2, y, w, h, h / 2); ctx.fill();
  ctx.font = `700 ${pick(44, 40, 40)}px ${JK}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("clubdeinversionfamiliar.com", cx, y + h / 2 + 2);
  ctx.restore();
}

/* ---------- maquetas por formato ---------- */
// Escenas con un medio (teléfono o chat): cabecera (etiqueta, título, subtítulo) y el medio.
// Vertical: cabecera arriba y medio debajo. Horizontal y cuadrado: cabecera a la izquierda y medio a la derecha.
function mediaLayout(hasSub, chat = false) {
  if (TALL) return { hx: 70, hy: 150, hw: 940, title: 66, sub: 38, pill: 30, phoneW: 600, phoneX: null, phoneY: hasSub ? 600 : 560, chatX: 70, chatY: 560, chatW: 940, chatH: 860, k: 1 };
  if (WIDE) { const pw = 470; return { hx: 160, hy: null, hw: chat ? 820 : 920, title: 84, sub: 42, pill: 30, phoneW: pw, phoneX: W - pw - 250, phoneY: (H - phoneHeight(pw)) / 2, chatX: 1060, chatY: 110, chatW: 720, chatH: 860, k: 0.92 }; }
  const pw = 420; return { hx: 60, hy: null, hw: 470, title: 52, sub: 30, pill: 24, phoneW: pw, phoneX: W - pw - 60, phoneY: (H - phoneHeight(pw)) / 2, chatX: 560, chatY: 120, chatW: 470, chatH: 840, k: 0.78 };
}

function header(L, { label, title, sub }, t) {
  const a = ease(seg(t, 0, 0.5));
  const pillH = label ? L.pill + 28 + 22 : 0;
  const th = measure(title, { size: L.title, maxW: L.hw });
  const sh = sub ? measure(sub, { size: L.sub, weight: 500, font: IN, maxW: L.hw, lh: 1.3, track: 0 }) + 18 : 0;
  const y0 = L.hy ?? (H - (pillH + th + sh)) / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 26);
  if (label) pill(label, L.hx, y0, { size: L.pill, bgc: "rgba(16,185,129,0.18)", fg: C.emLight });
  text(title, L.hx, y0 + pillH, { size: L.title, maxW: L.hw });
  if (sub) text(sub, L.hx, y0 + pillH + th + 18, { size: L.sub, weight: 500, font: IN, color: C.soft, maxW: L.hw, lh: 1.3, track: 0 });
  ctx.restore();
}

function phoneScene({ label, title, key, scrollFrom = 0, scrollTo = 0, d = 4.2, pad = 0, bgc = "#fff", sub }) {
  return {
    d,
    draw(t) {
      bg(t);
      const L = mediaLayout(!!sub);
      header(L, { label, title, sub }, t);
      const b = ease(seg(t, 0.2, 0.8));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(TALL ? 0 : (1 - b) * 60, TALL ? (1 - b) * 80 : 0);
      const s = scrollFrom + (scrollTo - scrollFrom) * easeIO(seg(t, 1.0, d - 0.4));
      phone(key, L.phoneX ?? (W - L.phoneW) / 2, L.phoneY, L.phoneW, s, { pad, bgc });
      ctx.restore();
      stamp();
    },
  };
}

function chatScene({ label, title, msg, d = 5 }) {
  return {
    d,
    draw(t) {
      bg(t);
      const L = mediaLayout(false, true);
      header(L, { label, title }, t);
      const b = ease(seg(t, 0.2, 0.7));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(TALL ? 0 : (1 - b) * 60, TALL ? (1 - b) * 60 : 0);
      ctx.fillStyle = C.chat; rr(L.chatX, L.chatY, L.chatW, L.chatH, 40 * L.k); ctx.fill();
      chat(msg, "Laura (mamá)", L.chatX + 40 * L.k, L.chatY + 50 * L.k, L.chatW - 80 * L.k, seg(t, 0.7, d - 1.2), L.k);
      ctx.restore();
      stamp();
    },
  };
}

/** Dos frases grandes, la segunda en verde (gancho y remate). */
function twoLines(first, second, { d = 3.2, size1, size2, delay = 0.9, wideW = 1640 } = {}) {
  return {
    d,
    draw(t) {
      bg(t);
      const s1 = size1 ?? pick(104, 132, 84), s2 = size2 ?? s1;
      const maxW = pick(940, wideW, 940);
      const h1 = measure(first, { size: s1, maxW }), h2 = measure(second, { size: s2, maxW });
      const gap = pick(60, 50, 40);
      const y0 = (H - (h1 + gap + h2)) / 2 - pick(60, 0, 0);
      const x = pick(70, 150, 70);
      text(first, x, y0, { size: s1, maxW, alpha: ease(seg(t, 0, 0.5)) });
      text(second, x, y0 + h1 + gap, { size: s2, color: C.emLight, maxW, alpha: ease(seg(t, delay, delay + 0.5)) });
    },
  };
}

/* ---------- vídeo 1: el presidente ---------- */
const STEPS7 = ["La paga", "Invita a tus hijos", "Elige la cartera del mes", "Publica", "Avisa por WhatsApp", "Mientras deciden", "El repaso en familia"];

const PRESI = [
  twoLines("¿Tu hijo va a invertir?", "Que aprenda contigo."),
  { d: 3.6, draw(t) {
    bg(t);
    const lw = pick(760, 820, 640);
    const ty = pick(900, 0, 0);
    const blockH = logoH(lw) + 60 + measure("La paga que enseña a invertir.", { size: pick(78, 84, 66), maxW: pick(900, 1500, 940) }) + 40 + 50;
    const y0 = TALL ? 560 : (H - blockH) / 2;
    logo((W - lw) / 2, y0, lw, ease(seg(t, 0, 0.5)));
    const yT = TALL ? ty : y0 + logoH(lw) + 60;
    const h = text("La paga que enseña a invertir.", W / 2, yT, { size: pick(78, 84, 66), align: "center", maxW: pick(900, 1500, 940), alpha: ease(seg(t, 0.4, 1)) });
    text("Un club de inversión para tu familia", W / 2, yT + h + 40, { size: pick(42, 42, 36), weight: 500, font: IN, color: C.soft, align: "center", maxW: 900, track: 0, alpha: ease(seg(t, 0.8, 1.3)) });
  } },
  { d: 3.8, draw(t) {
    bg(t);
    // Vertical: título arriba y lista debajo. Horizontal: título a la izquierda y lista a la derecha. Cuadrado: compacto.
    const titleSize = pick(96, 100, 72);
    const tx = pick(70, 150, 70), ty = pick(300, (H - measure("Ponlo en marcha\nen 7 pasos", { size: 100, maxW: 840 })) / 2, 70);
    text("Ponlo en marcha\nen 7 pasos", tx, ty, { size: titleSize, maxW: pick(940, 840, 940), alpha: ease(seg(t, 0, 0.5)) });
    const lx = pick(70, 1080, 70), ly = pick(640, 170, 300), step = pick(132, 112, 104), dot = pick(84, 76, 70), fs = pick(50, 46, 42);
    STEPS7.forEach((it, i) => {
      const a = ease(seg(t, 0.5 + i * 0.22, 0.9 + i * 0.22));
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -40, 0);
      const y = ly + i * step;
      ctx.fillStyle = C.emInk; rr(lx, y, dot, dot, dot / 2); ctx.fill();
      ctx.font = `700 ${dot * 0.48}px ${IN}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), lx + dot / 2, y + dot / 2 + 2);
      ctx.restore();
      text(it, lx + dot + 36, ly + i * step + (dot - fs) / 2 - 2, { size: fs, weight: 700, alpha: a });
    });
  } },
  phoneScene({ label: "Paso 1 de 7", title: "Decide la paga", sub: "Poco dinero, pero real.", key: "p01", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.2 }),
  phoneScene({ label: "Paso 2 de 7", title: "Invita a tus hijos", sub: "Cada uno con su cuenta y su porqué.", key: "p02", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.45 }),
  phoneScene({ label: "Paso 3 de 7", title: "Elige la cartera del mes", sub: "Una pregunta para la familia, no un consejo.", key: "p03", d: 4.4, pad: 26, bgc: "#f8fafc" }),
  phoneScene({ label: "Paso 4 de 7", title: "Pon el plazo y publica", sub: "Cada uno recibe su paga para decidir.", key: "p04", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.35 }),
  phoneScene({ label: "Paso 5 de 7", title: "Avisa por WhatsApp", sub: "Su nombre, su importe y el enlace. Tú solo pulsas enviar.", key: "p05", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.2 }),
  phoneScene({ label: "Paso 6 de 7", title: "Mientras deciden", sub: "No les digas qué elegir: pregunta qué han mirado.", key: "p06", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.45 }),
  phoneScene({ label: "Paso 7 de 7", title: "El repaso en familia", sub: "Gana el mejor porqué, no el que más acierta.", key: "p07", d: 4.6, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.35 }),
  twoLines("Acertar es suerte.", "Explicar es aprender.", { d: 3.6, size1: pick(100, 132, 84), delay: 0.8 }),
  { d: 4.4, draw(t) {
    bg(t);
    const lw = pick(700, 620, 560);
    const title = "Crea el club de tu familia", sub = "Solo por invitación: pídesela a una familia que ya esté dentro.";
    const ts = pick(74, 76, 60), ss = pick(40, 38, 34), maxT = pick(940, 1500, 940), maxS = pick(880, 1100, 860);
    const blockH = logoH(lw) + 70 + measure(title, { size: ts, maxW: maxT }) + 40 + measure(sub, { size: ss, weight: 500, font: IN, maxW: maxS, lh: 1.32, track: 0 }) + 70 + pick(120, 104, 100);
    let y = (H - blockH) / 2;
    logo((W - lw) / 2, y, lw, ease(seg(t, 0, 0.5))); y += logoH(lw) + 70;
    y += text(title, W / 2, y, { size: ts, align: "center", maxW: maxT, alpha: ease(seg(t, 0.3, 0.8)) }) + 40;
    y += text(sub, W / 2, y, { size: ss, weight: 500, font: IN, color: C.soft, align: "center", maxW: maxS, lh: 1.32, track: 0, alpha: ease(seg(t, 0.6, 1.1)) }) + 70;
    ctaButton(W / 2, y, ease(seg(t, 1.0, 1.5)));
    stamp();
  } },
];

/* ---------- vídeo 2: el primer mes de un hijo ---------- */
const INVITE = "¡Hola, Pablo! Soy Laura, de Familia Ruiz.\n\nTe invito a entrar en el club de inversión de *Familia Ruiz*: cada mes una lección, una decisión y un porqué, con tu paga y en valores de verdad.\n\nEntra con este enlace: clubdeinversionfamiliar.com/registro";
const NOTICE = "¡Hola, Pablo! La cartera de octubre ya está lista: *Núcleo global de bajo coste*.\n\nTienes 20,00 € para invertir entre 4 opciones, hasta el 26/10.\n\nNo vale elegir al azar: lee la lección, mira la ficha de cada valor y escribe tu porqué.";

const HIJOS = [
  twoLines("Pablo tiene 16 años", "y este mes ha decidido cómo invertir su paga.", { size1: pick(96, 120, 80), size2: pick(74, 84, 60), delay: 0.8, wideW: 1300 }),
  chatScene({ label: "Así empieza", title: "Le llega un WhatsApp de su madre", msg: INVITE, d: 5 }),
  phoneScene({ label: "Entra en un minuto", title: "Primero le cuenta a qué entra", key: "h01a", d: 3.6 }),
  phoneScene({ label: "La bienvenida", title: "Su paga es suya. Decide él.", key: "h02", scrollFrom: 0, scrollTo: 1, d: 4.4 }),
  { d: 4.6, draw(t) {
    bg(t);
    const L = mediaLayout(true);
    header(L, { label: "Pregunta rápida", title: "En el repaso, ¿quién gana?", sub: t > 2.3 ? "Quien mejor explica su decisión." : " " }, t);
    const b = ease(seg(t, 0.2, 0.8));
    ctx.save(); ctx.globalAlpha = b; ctx.translate(TALL ? 0 : (1 - b) * 60, TALL ? (1 - b) * 80 : 0);
    phone(t < 2.3 ? "h03a" : "h03b", L.phoneX ?? (W - L.phoneW) / 2, L.phoneY, L.phoneW, 0);
    ctx.restore();
    stamp();
  } },
  chatScene({ label: "El aviso del mes", title: "La cartera ya está lista", msg: NOTICE, d: 5 }),
  phoneScene({ label: "Su primera misión", title: "20 € por decidir", key: "h05", d: 3.6 }),
  phoneScene({ label: "Paso 1", title: "Elige y reparte", key: "h08a", scrollFrom: 0.15, scrollTo: 0.75, d: 4.2, pad: 18, bgc: "#f8fafc" }),
  phoneScene({ label: "Paso 2", title: "Explica su porqué", key: "h08b", scrollFrom: 0.1, scrollTo: 0.6, d: 4.6, pad: 18, bgc: "#f8fafc" }),
  phoneScene({ label: "Después de enviar", title: "Ve lo que han elegido los demás", key: "h09c", d: 3.8, pad: 26, bgc: "#f8fafc" }),
  phoneScene({ label: "El repaso", title: "Gana el mejor porqué", key: "h10a", d: 3.8, pad: 26, bgc: "#f8fafc" }),
  { d: 4.6, draw(t) {
    bg(t);
    const s = pick(92, 96, 72), maxW = pick(940, 1500, 940);
    const l1 = "Invertir se aprende en casa.", l2 = "Como todo lo importante.";
    const lw = pick(620, 560, 480);
    const h1 = measure(l1, { size: s, maxW }), h2 = measure(l2, { size: s, maxW });
    const blockH = h1 + 30 + h2 + pick(120, 80, 60) + logoH(lw) + pick(80, 60, 50) + pick(120, 104, 100);
    let y = (H - blockH) / 2;
    const cx = W / 2;
    y += text(l1, cx, y, { size: s, maxW, align: "center", alpha: ease(seg(t, 0, 0.5)) }) + 30;
    y += text(l2, cx, y, { size: s, maxW, align: "center", color: C.emLight, alpha: ease(seg(t, 0.6, 1.1)) }) + pick(120, 80, 60);
    logo((W - lw) / 2, y, lw, ease(seg(t, 1.0, 1.5))); y += logoH(lw) + pick(80, 60, 50);
    ctaButton(cx, y, ease(seg(t, 1.3, 1.8)));
    stamp();
  } },
];

/* ---------- motor ---------- */
const VIDEOS = { presi: { scenes: PRESI, stories: false }, hijos: { scenes: HIJOS, stories: true } };
const which = params.get("v") || "presi";
const V = VIDEOS[which];
const FADE = 0.35;
const starts = []; let total = 0;
for (const s of V.scenes) { starts.push(total); total += s.d; }

function storyBars(t) {
  const n = V.scenes.length, gap = 10, x0 = pick(50, 60, 36), w = (W - x0 * 2 - gap * (n - 1)) / n, y = pick(70, 40, 36);
  for (let i = 0; i < n; i++) {
    const p = clamp((t - starts[i]) / V.scenes[i].d);
    ctx.fillStyle = "rgba(255,255,255,0.22)"; rr(x0 + i * (w + gap), y, w, 8, 4); ctx.fill();
    if (p > 0) { ctx.fillStyle = "#fff"; rr(x0 + i * (w + gap), y, w * p, 8, 4); ctx.fill(); }
  }
}

const off = document.createElement("canvas"); off.width = W; off.height = H;
const oc = off.getContext("2d");
function render(t) {
  ctx.clearRect(0, 0, W, H);
  let i = starts.findIndex((s, k) => t >= s && t < s + V.scenes[k].d);
  if (i < 0) i = V.scenes.length - 1;
  const local = t - starts[i];
  // Fundido con la escena anterior al principio de cada escena
  if (i > 0 && local < FADE) {
    const prev = V.scenes[i - 1];
    prev.draw(prev.d - 0.001 + local, prev.d);
    oc.clearRect(0, 0, W, H); oc.drawImage(cv, 0, 0);
    ctx.clearRect(0, 0, W, H);
    V.scenes[i].draw(local, V.scenes[i].d);
    ctx.save(); ctx.globalAlpha = 1 - local / FADE; ctx.drawImage(off, 0, 0); ctx.restore();
  } else {
    V.scenes[i].draw(local, V.scenes[i].d);
  }
  if (V.stories) storyBars(t);
}

async function ready() {
  await Promise.all([
    document.fonts.load(`800 80px ${JK}`), document.fonts.load(`700 40px ${JK}`), document.fonts.load(`500 40px ${IN}`), document.fonts.load(`600 40px ${IN}`), document.fonts.load(`700 40px ${IN}`),
    load("logo", "/brand/logo.svg"),
    ...(which === "presi"
      ? [["p01", "01-paga"], ["p02", "02-hijos"], ["p03", "03-cartera-propuesta"], ["p04", "04-publicar"], ["p05", "05b-avisar-enviar"], ["p06", "06-deciden"], ["p07", "07b-repaso-guia"]].map(([k, f]) => load(k, `/presi/movil/${f}.png`))
      : [["h01a", "01a-registro-arriba"], ["h02", "02-bienvenida-club"], ["h03a", "03a-bienvenida-pregunta-fallo"], ["h03b", "03b-bienvenida-pregunta-acierto"], ["h05", "05-bienvenida-mision"], ["h08a", "08a-decidir-elige"], ["h08b", "08b-decidir-explica"], ["h09c", "09c-decisiones-de-los-demas"], ["h10a", "10a-repaso-guia"]].map(([k, f]) => load(k, `/hijos/${f}.png`))),
  ]);
}

window.preview = async (t) => { await ready(); render(t); return { total, format: fmt, size: [W, H] }; };

window.renderVideo = async () => {
  await ready();
  const { Muxer, ArrayBufferTarget } = Mp4Muxer;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { throw e; } });
  enc.configure({ codec: "avc1.640028", width: W, height: H, bitrate: SQ ? 7_000_000 : 10_000_000, framerate: FPS, avc: { format: "avc" } });
  const frames = Math.round(total * FPS);
  for (let f = 0; f < frames; f++) {
    render(f / FPS);
    const vf = new VideoFrame(cv, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 });
    vf.close();
    while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
  }
  await enc.flush();
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `club-${which}-${fmt}.mp4`;
  document.body.appendChild(a); a.click();
  return { frames, seconds: total, bytes: blob.size, format: fmt };
};
