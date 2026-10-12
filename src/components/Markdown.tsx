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

/** Inline: **negrita**, *cursiva*, `código`, [texto](url). */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${k++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={key}>{m[3]}</em>);
    else if (m[4]) out.push(<code key={key} className="md-code">{m[4]}</code>);
    else if (m[5]) out.push(<a key={key} href={m[6]} target="_blank" rel="noopener noreferrer">{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={`md ${className}`}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "h": {
            const Tag = (`h${Math.min(b.level + 1, 4)}` as "h2" | "h3" | "h4");
            return <Tag key={key} className={`md-h md-h${b.level}`}>{inline(b.text, key)}</Tag>;
          }
          case "p":
            return <p key={key} className="md-p">{inline(b.text, key)}</p>;
          case "ul":
            return <ul key={key} className="md-ul">{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ul>;
          case "ol":
            return <ol key={key} className="md-ol">{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ol>;
          case "quote":
            return <blockquote key={key} className="md-quote">{b.lines.map((l, j) => <p key={j}>{inline(l, `${key}-${j}`)}</p>)}</blockquote>;
          case "hr":
            return <hr key={key} className="md-hr" />;
          case "table":
            return (
              <div key={key} className="md-table-wrap">
                <table className="table md-table">
                  <thead><tr>{b.headers.map((h, j) => <th key={j} className={j > 0 ? "text-right" : ""}>{inline(h, `${key}-h${j}`)}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>{r.map((c, j) => <td key={j} className={j > 0 ? "text-right tabular-nums" : ""}>{inline(c, `${key}-${ri}-${j}`)}</td>)}</tr>
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
