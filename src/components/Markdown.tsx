import type { ReactNode } from "react";

/**
 * Renderizador de Markdown sencillo y seguro (sin HTML crudo): títulos, párrafos, negrita, cursiva,
 * código, enlaces, listas, listas numeradas, citas, tablas y separadores. Devuelve elementos React,
 * así que no hay inyección de HTML. Pensado para la lección del mes y textos similares.
 */

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "hr" }
  | { type: "table"; headers: string[]; rows: string[][] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const splitRow = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^\s{0,3}(#{1,4})\s+(.*)$/);
    if (h) {
      blocks.push({ type: "h", level: h[1].length, text: h[2].trim() });
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", lines: q });
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    // Párrafo: líneas consecutivas no vacías que no abren otro bloque
    const p: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s{0,3}#{1,4}\s/.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\s*[-*•]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i]) && !isTableRow(lines[i]) && !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
      p.push(lines[i].trim());
      i++;
    }
    if (p.length) blocks.push({ type: "p", text: p.join(" ") });
  }
  return blocks;
}

const MD_LINE = /^\s*(#{1,4}\s|[-*•]\s|\d+[.)]\s|>|\||(-{3,}|\*{3,}|_{3,})\s*$)/;
const CALLOUT = /^(idea clave|importante|recuerda|ojo|conclusi[oó]n|resumen|regla de oro|pregunta clave|clave|objetivo)\s*[:\-–]\s*(.+)$/i;

/** ¿Parece un título? Línea corta y suelta, sin puntuación de cierre, seguida de contenido. */
function looksLikeHeading(line: string, prevBlank: boolean, nextLine: string | undefined) {
  const t = line.trim();
  if (!prevBlank || !nextLine || !nextLine.trim()) return false;
  if (t.length > 60 || t.split(/\s+/).length > 9) return false;
  if (/[.!?,;…]$/.test(t)) return false;
  if (!/^[A-ZÁÉÍÓÚÑ0-9¿¡]/.test(t)) return false;
  return true;
}

/**
 * Formato automático para texto escrito «a pelo»: convierte líneas sueltas cortas en títulos,
 * frases que empiezan por «Idea clave:», «Importante:», etc. en citas destacadas, párrafos formados
 * solo por preguntas en bloque de reflexión, y respeta todo lo que ya tenga marcas Markdown.
 */
export function autoFormat(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (MD_LINE.test(raw)) {
      out.push(raw);
      continue;
    }
    const prevBlank = i === 0 || !lines[i - 1].trim();
    const nextBlank = i === lines.length - 1 || !lines[i + 1].trim();
    const callout = t.match(CALLOUT);
    if (callout) {
      const label = callout[1].charAt(0).toUpperCase() + callout[1].slice(1).toLowerCase();
      out.push(`> **${label}:** ${callout[2]}`);
      continue;
    }
    if (looksLikeHeading(t, prevBlank, lines[i + 1])) {
      out.push(`## ${t.replace(/:$/, "")}`);
      continue;
    }
    // Párrafo formado solo por preguntas (una o varias): bloque de reflexión
    const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (prevBlank && nextBlank && sentences.length > 0 && sentences.every((s) => /\?$/.test(s)) && t.length <= 240) {
      out.push(`> ${t}`);
      continue;
    }
    out.push(raw);
  }
  return out.join("\n");
}

const NUM = /(?:^|[\s(])(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s?(?:€|%|\$)|\d+(?:,\d+)?\s?(?:€|%|\$))/g;

/** Inline: **negrita**, *cursiva*, `código`, [texto](url); además resalta cifras con € o % y los símbolos indicados. */
function inline(text: string, keyPrefix: string, symbols?: Map<string, string>): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const plain = (s: string) => {
    // Resalta cifras y símbolos dentro del texto plano
    const parts: ReactNode[] = [];
    let idx = 0;
    const tokens: { start: number; end: number; node: ReactNode }[] = [];
    let mm: RegExpExecArray | null;
    NUM.lastIndex = 0;
    while ((mm = NUM.exec(s)) !== null) {
      const start = mm.index + mm[0].length - mm[1].length;
      tokens.push({ start, end: start + mm[1].length, node: <strong key={`${keyPrefix}-n${k++}`} className="md-num">{mm[1]}</strong> });
    }
    if (symbols && symbols.size) {
      const symRe = new RegExp(`\\b(${[...symbols.keys()].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
      while ((mm = symRe.exec(s)) !== null) {
        const start = mm.index;
        if (tokens.some((t) => start < t.end && start + mm![0].length > t.start)) continue;
        const href = symbols.get(mm[1])!;
        tokens.push({ start, end: start + mm[0].length, node: <a key={`${keyPrefix}-s${k++}`} href={href} className="md-symbol">{mm[1]}</a> });
      }
    }
    tokens.sort((a, b) => a.start - b.start);
    for (const t of tokens) {
      if (t.start < idx) continue;
      if (t.start > idx) parts.push(s.slice(idx, t.start));
      parts.push(t.node);
      idx = t.end;
    }
    if (idx < s.length) parts.push(s.slice(idx));
    return parts;
  };
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(...plain(text.slice(last, m.index)));
    const key = `${keyPrefix}-${k++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={key}>{m[3]}</em>);
    else if (m[4]) out.push(<code key={key} className="md-code">{m[4]}</code>);
    else if (m[5]) out.push(<a key={key} href={m[6]} target="_blank" rel="noopener noreferrer">{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...plain(text.slice(last)));
  return out;
}

/**
 * Renderiza el texto con formato. Si `auto` (por defecto), aplica primero el formato automático,
 * así un texto escrito sin marcas también sale con títulos, listas y citas. `symbols` enlaza los
 * símbolos de las opciones del mes a su ficha.
 */
export function Markdown({ text, className = "", auto = true, symbols }: { text: string; className?: string; auto?: boolean; symbols?: { symbol: string; href: string }[] }) {
  const symMap = symbols?.length ? new Map(symbols.map((s) => [s.symbol, s.href])) : undefined;
  const blocks = parseBlocks(auto ? autoFormat(text) : text);
  return (
    <div className={`md ${className}`}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "h": {
            const Tag = (`h${Math.min(b.level + 1, 4)}` as "h2" | "h3" | "h4");
            return <Tag key={key} className={`md-h md-h${b.level}`}>{inline(b.text, key, symMap)}</Tag>;
          }
          case "p":
            return <p key={key} className="md-p">{inline(b.text, key, symMap)}</p>;
          case "ul":
            return <ul key={key} className="md-ul">{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`, symMap)}</li>)}</ul>;
          case "ol":
            return <ol key={key} className="md-ol">{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`, symMap)}</li>)}</ol>;
          case "quote":
            return <blockquote key={key} className="md-quote">{b.lines.map((l, j) => <p key={j}>{inline(l, `${key}-${j}`, symMap)}</p>)}</blockquote>;
          case "hr":
            return <hr key={key} className="md-hr" />;
          case "table":
            return (
              <div key={key} className="md-table-wrap">
                <table className="table md-table">
                  <thead><tr>{b.headers.map((h, j) => <th key={j} className={j > 0 ? "text-right" : ""}>{inline(h, `${key}-h${j}`, symMap)}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>{r.map((c, j) => <td key={j} className={j > 0 ? "text-right tabular-nums" : ""}>{inline(c, `${key}-${ri}-${j}`, symMap)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

/** Plantilla de lección para que el presidente parta de una estructura clara. */
export const LESSON_TEMPLATE = `## Objetivo del mes
Explica en dos o tres frases qué quieres que aprendan con esta cartera y por qué has elegido estas opciones.

## Las opciones
- **OPCIÓN 1**: qué es, cómo gana dinero y qué riesgo tiene.
- **OPCIÓN 2**: qué es, cómo gana dinero y qué riesgo tiene.

## Qué investigar antes de decidir
1. Abre la ficha de cada valor y mira la **Recomendación del Club**.
2. Compara el PER, el dividendo o el TER según el tipo de activo.
3. Lee las noticias de las últimas semanas.

> **Idea clave:** una frase que resuma la lección y que quieras que recuerden.

## Cómo decidir
Explica cómo repartir el importe, qué horizonte dar a la inversión y qué os haría vender. Pide que argumenten con datos, no con intuición.

| Opción | Riesgo | Horizonte |
|---|---|---|
| OPCIÓN 1 | Medio | 5 años |
| OPCIÓN 2 | Bajo | 10 años |
`;
