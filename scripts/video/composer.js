/* Compositor de vídeos promocionales del Club: dibuja cada fotograma en un canvas de 1080×1920 a partir de las
   capturas de los recorridos y lo codifica a MP4 (H.264) con WebCodecs + mp4-muxer. Determinista: el fotograma n
   depende solo de n, así que no se pierden fotogramas aunque el navegador vaya lento. */

const W = 1080, H = 1920, FPS = 30;
const C = { navy: "#0e2138", navy2: "#162e4a", deep: "#08131f", em: "#10b981", emInk: "#047857", emLight: "#34d399", amber: "#e5a016", paper: "#f8fafc", soft: "#d9e2ec", muted: "#9fb0c3", chat: "#e7efe4" };
const JK = '"Plus Jakarta Sans", system-ui, sans-serif';
const IN = '"Inter", system-ui, sans-serif';

const cv = document.getElementById("c");
const ctx = cv.getContext("2d");

/* ---------- utilidades ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3); // ease-out cúbica
const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const seg = (t, a, b) => clamp((t - a) / (b - a));

const imgs = {};
function load(key, src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => { imgs[key] = i; res(); }; i.onerror = () => rej(new Error("No carga " + src)); i.src = src; }); }

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function bg(t) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, C.navy2); g.addColorStop(0.55, C.navy); g.addColorStop(1, C.deep);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // La gráfica de la marca, muy tenue, subiendo despacio
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = C.em; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const pts = [[-40, 1680], [140, 1600], [300, 1650], [470, 1460], [640, 1510], [800, 1300], [960, 1350], [1140, 1120]];
  const shift = Math.sin(t * 0.35) * 18;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + shift) : ctx.moveTo(x, y + shift))); ctx.stroke();
  ctx.restore();
}

/** Texto con salto de línea a un ancho máximo. Devuelve la altura usada. */
function text(str, x, y, { size = 60, weight = 800, font = JK, color = "#fff", maxW = W - 120, lh = 1.12, align = "left", alpha = 1, track = -0.02 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "top";
  ctx.letterSpacing = `${track * size}px`;
  const lines = [];
  for (const para of String(str).split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh));
  ctx.restore();
  return lines.length * size * lh;
}

/** Píldora de texto (etiqueta de paso). */
function pill(str, x, y, { size = 34, fg = "#fff", bgc = C.emInk, padX = 26, padY = 14 } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px ${IN}`; ctx.letterSpacing = "0px";
  const w = ctx.measureText(str).width + padX * 2, h = size + padY * 2;
  ctx.fillStyle = bgc; rr(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(str, x + padX, y + h / 2 + 1);
  ctx.restore();
  return w;
}

/** Recorte de una captura de escritorio dentro de una «pantalla» redondeada, con zoom lento. */
function screen(key, crop, x, y, w, t, dur, { radius = 28, zoom = 0.05 } = {}) {
  const im = imgs[key];
  const [sx, sy, sw, sh] = crop;
  const h = (w * sh) / sw;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#fff"; rr(x, y, w, h, radius); ctx.fill();
  ctx.restore();
  ctx.save();
  rr(x, y, w, h, radius); ctx.clip();
  const z = 1 + zoom * easeIO(t / dur);
  const zw = sw / z, zh = sh / z;
  ctx.drawImage(im, sx + (sw - zw) / 2, sy + (sh - zh) / 2, zw, zh, x, y, w, h);
  ctx.restore();
  return h;
}

/** Marco de teléfono con una captura de móvil; `scroll` (0..1) recorre las capturas altas. */
function phone(key, x, y, w, scroll = 0, { viewRatio = 844 / 390, pad = 0, bgc = "#fff" } = {}) {
  const im = imgs[key];
  const bezel = 20, r = 72;
  const sw = w - bezel * 2, sh = sw * viewRatio;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
  ctx.fillStyle = "#050b14"; rr(x, y, w, sh + bezel * 2, r); ctx.fill();
  ctx.restore();
  ctx.save();
  rr(x + bezel, y + bezel, sw, sh, r - bezel); ctx.clip();
  ctx.fillStyle = bgc; ctx.fillRect(x + bezel, y + bezel, sw, sh);
  if (im) {
    const iw = sw - pad * 2;
    const ih = (im.height * iw) / im.width;
    const travel = Math.max(0, ih - (sh - pad * 2));
    ctx.drawImage(im, x + bezel + pad, y + bezel + pad - travel * scroll, iw, ih);
  }
  ctx.restore();
  return sh + bezel * 2;
}

/** Burbuja de chat con el texto apareciendo (proporción `reveal` 0..1). Negritas entre *asteriscos*. */
function chat(msg, from, x, y, w, reveal) {
  const shown = msg.slice(0, Math.round(msg.length * clamp(reveal)));
  ctx.save();
  ctx.font = `600 30px ${IN}`; ctx.fillStyle = "#3b4a5c"; ctx.textBaseline = "top";
  ctx.fillText(from, x + 8, y);
  ctx.restore();
  // medir líneas
  ctx.save();
  const size = 33, lh = 1.42, padX = 30, padY = 26, maxW = w - padX * 2;
  ctx.font = `500 ${size}px ${IN}`; ctx.letterSpacing = "0px"; ctx.textBaseline = "top";
  const lines = [];
  for (const para of shown.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test.replace(/\*/g, "")).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  const bh = lines.length * size * lh + padY * 2 + 26;
  ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#fff"; rr(x, y + 50, w, bh, [28, 28, 28, 6]); ctx.fill();
  ctx.shadowColor = "transparent";
  let bold = false;
  lines.forEach((l, i) => {
    let cx = x + padX;
    const cy = y + 50 + padY + i * size * lh;
    for (const part of l.split(/(\*)/)) {
      if (part === "*") { bold = !bold; continue; }
      ctx.font = `${bold ? 700 : 500} ${size}px ${IN}`;
      ctx.fillStyle = /clubdeinversionfamiliar\.com/.test(part) ? "#0a5fb4" : "#0e2138";
      ctx.fillText(part, cx, cy);
      cx += ctx.measureText(part).width;
    }
  });
  ctx.font = `500 24px ${IN}`; ctx.fillStyle = "#7a8796"; ctx.textAlign = "right";
  ctx.fillText(reveal >= 1 ? "20:15" : "", x + w - 22, y + 50 + bh - 40);
  ctx.restore();
  return bh + 50;
}

function logo(x, y, w, alpha = 1) { const im = imgs.logo; if (!im) return; ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, (im.height * w) / im.width); ctx.restore(); }

function stamp() {
  ctx.save();
  ctx.font = `500 24px ${IN}`; ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.textBaseline = "bottom"; ctx.textAlign = "right";
  ctx.fillText("Datos de ejemplo", W - 50, H - 46);
  ctx.restore();
}

/* ---------- escenas ---------- */
// Cada escena: { d: duración en s, draw(t) } con t = segundos desde el inicio de la escena.

function stepScene({ n, title, why, key, crop, w = 1000 }) {
  return {
    d: 4.6,
    draw(t, d) {
      bg(t);
      const a = ease(seg(t, 0, 0.5));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 30);
      pill(`Paso ${n} de 7`, 60, 190);
      text(title, 60, 290, { size: 74, maxW: 960 });
      ctx.restore();
      const b = ease(seg(t, 0.25, 0.9));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(0, (1 - b) * 60);
      const sh = screen(key, crop, (W - w) / 2, 520, w, t, d);
      ctx.restore();
      const c = ease(seg(t, 0.9, 1.5));
      text(why, 60, 520 + Math.min(sh, 1000) + 70, { size: 42, weight: 500, font: IN, color: C.soft, maxW: 960, lh: 1.34, alpha: c, track: 0 });
      stamp();
    },
  };
}

function phoneScene({ label, title, key, scrollFrom = 0, scrollTo = 0, d = 4.2, pad = 0, bgc = "#fff", sub }) {
  return {
    d,
    draw(t) {
      bg(t);
      const a = ease(seg(t, 0, 0.5));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 26);
      if (label) pill(label, 70, 150, { size: 30, bgc: "rgba(16,185,129,0.18)", fg: C.emLight });
      const th = text(title, 70, label ? 236 : 170, { size: 66, maxW: 940 });
      if (sub) text(sub, 70, (label ? 236 : 170) + th + 18, { size: 38, weight: 500, font: IN, color: C.soft, maxW: 940, lh: 1.3, track: 0 });
      ctx.restore();
      const b = ease(seg(t, 0.2, 0.8));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(0, (1 - b) * 80);
      const s = scrollFrom + (scrollTo - scrollFrom) * easeIO(seg(t, 1.0, d - 0.4));
      phone(key, (W - 600) / 2, sub ? 600 : 560, 600, s, { pad, bgc });
      ctx.restore();
      stamp();
    },
  };
}

/* ---------- vídeo 1: el presidente ---------- */
const PRESI = [
  { d: 3.2, draw(t) {
    bg(t);
    text("¿Tu hijo va a invertir?", 70, 640, { size: 104, maxW: 940, alpha: ease(seg(t, 0, 0.5)) });
    text("Que aprenda contigo.", 70, 920, { size: 104, color: C.emLight, maxW: 940, alpha: ease(seg(t, 0.9, 1.4)) });
  } },
  { d: 3.6, draw(t) {
    bg(t);
    const a = ease(seg(t, 0, 0.5));
    logo((W - 760) / 2, 560, 760, a);
    text("La paga que enseña a invertir.", W / 2, 900, { size: 78, align: "center", maxW: 900, alpha: ease(seg(t, 0.4, 1)) });
    text("Un club de inversión para tu familia", W / 2, 1110, { size: 42, weight: 500, font: IN, color: C.soft, align: "center", maxW: 900, track: 0, alpha: ease(seg(t, 0.8, 1.3)) });
  } },
  { d: 3.8, draw(t) {
    bg(t);
    text("Ponlo en marcha\nen 7 pasos", 70, 300, { size: 96, maxW: 940, alpha: ease(seg(t, 0, 0.5)) });
    const items = ["La paga", "Invita a tus hijos", "Elige la cartera del mes", "Publica", "Avisa por WhatsApp", "Mientras deciden", "El repaso en familia"];
    items.forEach((it, i) => {
      const a = ease(seg(t, 0.5 + i * 0.22, 0.9 + i * 0.22));
      ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -40, 0);
      const y = 640 + i * 132;
      ctx.fillStyle = C.emInk; rr(70, y, 84, 84, 42); ctx.fill();
      ctx.font = `700 40px ${IN}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), 112, y + 44);
      ctx.restore();
      text(it, 190, 640 + i * 132 + 14, { size: 50, weight: 700, alpha: a });
    });
  } },
  phoneScene({ label: "Paso 1 de 7", title: "Decide la paga", sub: "Poco dinero, pero real.", key: "p01", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.2 }),
  phoneScene({ label: "Paso 2 de 7", title: "Invita a tus hijos", sub: "Cada uno con su cuenta y su porqué.", key: "p02", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.45 }),
  phoneScene({ label: "Paso 3 de 7", title: "Elige la cartera del mes", sub: "Una pregunta para la familia, no un consejo.", key: "p03", d: 4.4, pad: 26, bgc: "#f8fafc" }),
  phoneScene({ label: "Paso 4 de 7", title: "Pon el plazo y publica", sub: "Cada uno recibe su paga para decidir.", key: "p04", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.35 }),
  phoneScene({ label: "Paso 5 de 7", title: "Avisa por WhatsApp", sub: "Su nombre, su importe y el enlace. Tú solo pulsas enviar.", key: "p05", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.2 }),
  phoneScene({ label: "Paso 6 de 7", title: "Mientras deciden", sub: "No les digas qué elegir: pregunta qué han mirado.", key: "p06", d: 4.4, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.45 }),
  phoneScene({ label: "Paso 7 de 7", title: "El repaso en familia", sub: "Gana el mejor porqué, no el que más acierta.", key: "p07", d: 4.6, pad: 18, bgc: "#f8fafc", scrollFrom: 0, scrollTo: 0.35 }),
  { d: 3.6, draw(t) {
    bg(t);
    text("Acertar es suerte.", 70, 620, { size: 100, maxW: 940, alpha: ease(seg(t, 0, 0.5)) });
    text("Explicar es aprender.", 70, 860, { size: 100, color: C.emLight, maxW: 940, alpha: ease(seg(t, 0.8, 1.3)) });
  } },
  { d: 4.4, draw(t) {
    bg(t);
    const a = ease(seg(t, 0, 0.5));
    logo((W - 700) / 2, 470, 700, a);
    text("Crea el club de tu familia", W / 2, 800, { size: 74, align: "center", maxW: 940, alpha: ease(seg(t, 0.3, 0.8)) });
    text("Solo por invitación: pídesela a una familia que ya esté dentro.", W / 2, 1010, { size: 40, weight: 500, font: IN, color: C.soft, align: "center", maxW: 880, lh: 1.32, track: 0, alpha: ease(seg(t, 0.6, 1.1)) });
    ctx.save(); ctx.globalAlpha = ease(seg(t, 1.0, 1.5));
    ctx.fillStyle = C.emInk; rr(140, 1240, 800, 120, 60); ctx.fill();
    ctx.font = `700 44px ${JK}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("clubdeinversionfamiliar.com", W / 2, 1302);
    ctx.restore();
    stamp();
  } },
];

/* ---------- vídeo 2: el primer mes de un hijo ---------- */
const INVITE = "¡Hola, Pablo! Soy Laura, de Familia Ruiz.\n\nTe invito a entrar en el club de inversión de *Familia Ruiz*: cada mes una lección, una decisión y un porqué, con tu paga y en valores de verdad.\n\nEntra con este enlace: clubdeinversionfamiliar.com/registro";
const NOTICE = "¡Hola, Pablo! La cartera de octubre ya está lista: *Núcleo global de bajo coste*.\n\nTienes 20,00 € para invertir entre 4 opciones, hasta el 26/10.\n\nNo vale elegir al azar: lee la lección, mira la ficha de cada valor y escribe tu porqué.";

function chatScene({ label, title, msg, d = 5 }) {
  return {
    d,
    draw(t) {
      bg(t);
      const a = ease(seg(t, 0, 0.5));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 26);
      pill(label, 70, 150, { size: 30, bgc: "rgba(16,185,129,0.18)", fg: C.emLight });
      text(title, 70, 236, { size: 66, maxW: 940 });
      ctx.restore();
      const b = ease(seg(t, 0.2, 0.7));
      ctx.save(); ctx.globalAlpha = b; ctx.translate(0, (1 - b) * 60);
      ctx.fillStyle = C.chat; rr(70, 560, 940, 860, 40); ctx.fill();
      chat(msg, "Laura (mamá)", 110, 610, 860, seg(t, 0.7, d - 1.2));
      ctx.restore();
      stamp();
    },
  };
}

const HIJOS = [
  { d: 3.2, draw(t) {
    bg(t);
    text("Pablo tiene 16 años", 70, 640, { size: 96, maxW: 940, alpha: ease(seg(t, 0, 0.5)) });
    text("y este mes ha decidido\ncómo invertir su paga.", 70, 900, { size: 74, color: C.emLight, maxW: 940, alpha: ease(seg(t, 0.8, 1.3)) });
  } },
  chatScene({ label: "Así empieza", title: "Le llega un WhatsApp de su madre", msg: INVITE, d: 5 }),
  phoneScene({ label: "Entra en un minuto", title: "Primero le cuenta a qué entra", key: "h01a", d: 3.6 }),
  phoneScene({ label: "La bienvenida", title: "Su paga es suya. Decide él.", key: "h02", scrollFrom: 0, scrollTo: 1, d: 4.4 }),
  { d: 4.6, draw(t) {
    bg(t);
    const a = ease(seg(t, 0, 0.5));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 26);
    pill("Pregunta rápida", 70, 150, { size: 30, bgc: "rgba(16,185,129,0.18)", fg: C.emLight });
    text("En el repaso, ¿quién gana?", 70, 236, { size: 66, maxW: 940 });
    ctx.restore();
    const b = ease(seg(t, 0.2, 0.8));
    ctx.save(); ctx.globalAlpha = b; ctx.translate(0, (1 - b) * 80);
    phone(t < 2.3 ? "h03a" : "h03b", (W - 640) / 2, 560, 640, 0);
    ctx.restore();
    if (t > 2.3) text("Quien mejor explica su decisión.", 70, 430, { size: 44, weight: 700, font: IN, color: C.emLight, maxW: 940, alpha: ease(seg(t, 2.3, 2.8)), track: 0 });
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
    const a = ease(seg(t, 0, 0.5));
    text("Invertir se aprende en casa.", 70, 520, { size: 92, maxW: 940, alpha: a });
    text("Como todo lo importante.", 70, 760, { size: 92, color: C.emLight, maxW: 940, alpha: ease(seg(t, 0.6, 1.1)) });
    logo((W - 620) / 2, 1080, 620, ease(seg(t, 1.0, 1.5)));
    ctx.save(); ctx.globalAlpha = ease(seg(t, 1.3, 1.8));
    ctx.fillStyle = C.emInk; rr(140, 1340, 800, 120, 60); ctx.fill();
    ctx.font = `700 44px ${JK}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("clubdeinversionfamiliar.com", W / 2, 1402);
    ctx.restore();
    stamp();
  } },
];

/* ---------- motor ---------- */
const VIDEOS = { presi: { scenes: PRESI, stories: false }, hijos: { scenes: HIJOS, stories: true } };
const which = new URLSearchParams(location.search).get("v") || "presi";
const V = VIDEOS[which];
const FADE = 0.35;
const starts = []; let total = 0;
for (const s of V.scenes) { starts.push(total); total += s.d; }

function storyBars(t) {
  const n = V.scenes.length, gap = 10, x0 = 50, w = (W - x0 * 2 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const p = clamp((t - starts[i]) / V.scenes[i].d);
    ctx.fillStyle = "rgba(255,255,255,0.22)"; rr(x0 + i * (w + gap), 70, w, 8, 4); ctx.fill();
    if (p > 0) { ctx.fillStyle = "#fff"; rr(x0 + i * (w + gap), 70, w * p, 8, 4); ctx.fill(); }
  }
}

function render(t) {
  ctx.clearRect(0, 0, W, H);
  let i = starts.findIndex((s, k) => t >= s && t < s + V.scenes[k].d);
  if (i < 0) i = V.scenes.length - 1;
  const local = t - starts[i];
  V.scenes[i].draw(local, V.scenes[i].d);
  // Fundido con la escena anterior al principio de cada escena
  if (i > 0 && local < FADE) {
    const prev = V.scenes[i - 1];
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const oc = off.getContext("2d");
    const saved = ctx.getImageData(0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    prev.draw(prev.d - 0.001 + local, prev.d);
    oc.drawImage(cv, 0, 0);
    ctx.putImageData(saved, 0, 0);
    ctx.save(); ctx.globalAlpha = 1 - local / FADE; ctx.drawImage(off, 0, 0); ctx.restore();
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

window.preview = async (t) => { await ready(); render(t); return { total }; };

window.renderVideo = async () => {
  await ready();
  const { Muxer, ArrayBufferTarget } = Mp4Muxer;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { throw e; } });
  enc.configure({ codec: "avc1.640028", width: W, height: H, bitrate: 10_000_000, framerate: FPS, avc: { format: "avc" } });
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
  a.download = `club-${which}.mp4`;
  document.body.appendChild(a); a.click();
  return { frames, seconds: total, bytes: blob.size };
};
