---
name: Club de Inversión Familiar
description: Aprende, invierte y crece en familia.
colors:
  navy: "#0e2138"
  navy-card: "#162e4a"
  navy-deep: "#0a1829"
  emerald: "#10b981"
  emerald-deep: "#059669"
  emerald-ink: "#047857"
  emerald-light: "#34d399"
  emerald-wash: "#d1fae5"
  amber: "#e5a016"
  amber-ink: "#a5700c"
  amber-wash: "#fef3c7"
  paper: "#f8fafc"
  surface: "#ffffff"
  surface-2: "#f1f5f9"
  muted: "#64748b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans Variable, Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.1em"
  figure:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace"
    fontSize: "clamp(24px, 8vw, 36px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-ink}"
    textColor: "{colors.surface}"
    typography: "{typography.title}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "#065f46"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  button-ghost:
    textColor: "{colors.emerald-ink}"
    rounded: "{rounded.full}"
    padding: "8px 6px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.navy}"
    rounded: "{rounded.md}"
    padding: "7px 12px"
    height: "38px"
  tag-accent:
    backgroundColor: "{colors.emerald-wash}"
    textColor: "{colors.emerald-ink}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  tag-gold:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  sidebar:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
---

# Design System: Club de Inversión Familiar

## Overview

**Creative North Star: "La Sala de Mandos Familiar"**

Un panel de control donde toda la familia ve de un vistazo cómo van sus carteras. La estructura es seria y ordenada (barra lateral navy, cifras en monoespaciada, tablas limpias) pero el trato es amable: formas redondeadas, píldoras, sombras suaves. Es un lugar para aprender, no un terminal de bróker, así que nada grita ni apremia.

El esmeralda guía la acción y lo positivo; el ámbar queda reservado a la gamificación (logros, líder, avisos de la cartera del mes). El resto es navy y neutros fríos. La interfaz sigue al sistema en claro/oscuro y se puede forzar con el conmutador del pie de la barra lateral.

**Key Characteristics:**
- Redondeado y amable: botones, etiquetas y selectores en píldora; tarjetas a 12px.
- Cifras siempre en JetBrains Mono con números tabulares.
- Un acento de acción (esmeralda) y un acento de juego (ámbar); no se mezclan roles.
- Profundidad ligera: bordes finos y sombras suaves teñidas de navy.
- Móvil y escritorio con el mismo peso; objetivos táctiles de 42–44px en móvil.

## Colors

Paleta navy sobrio con esmeralda de acción y ámbar de logros; neutros fríos azulados.

### Primary
- **Esmeralda del Club** (#10b981): acción principal, estado activo, barras de progreso, foco. Con degradado a `#059669` en el botón primario.
- **Esmeralda Tinta** (#047857): texto y enlaces sobre fondo claro; kickers.
- **Esmeralda Luz** (#34d399): hover y detalles sobre navy.
- **Esmeralda Lavado** (#d1fae5): fondo de etiquetas de acento y hover del botón fantasma.

### Secondary
- **Ámbar de Logros** (#e5a016): medallas, líder, etiqueta «Abierta» y pulso de aviso. Solo gamificación y atención.
- **Ámbar Tinta** (#a5700c) y **Ámbar Lavado** (#fef3c7): texto y fondo de etiquetas doradas.

### Neutral
- **Navy del Club** (#0e2138): barra lateral, texto, tarjetas de cita, fondo del modo oscuro.
- **Navy Tarjeta** (#162e4a): superficie en modo oscuro.
- **Papel Frío** (#f8fafc): fondo de página en modo claro.
- **Blanco Superficie** (#ffffff) y **Gris Hielo** (#f1f5f9): tarjetas y hover de filas.
- **Gris Pizarra** (#64748b): texto secundario.

### Named Rules
**The Text-On-Green Rule.** El esmeralda #10b981 no admite texto blanco (2,5:1). Los fondos verdes con texto (botón primario, selector activo, nivel actual) usan #047857 o más oscuro.

**The Two Accents Rule.** Esmeralda significa «hacer / va bien»; ámbar significa «juego / mira esto». Nunca se intercambian ni se usan juntos como decoración.

**The Tailwind Remap Rule.** La paleta de Tailwind (slate, indigo, green, red, amber) está remapeada en `@theme` a esta marca. `indigo` es esmeralda y `red` son neutros; usa los tokens de marca, no los nombres de Tailwind como fuente de verdad.

## Typography

**Display Font:** Plus Jakarta Sans (con system-ui)
**Body Font:** Inter (con system-ui)
**Label/Mono Font:** JetBrains Mono (cifras)

**Character:** Jakarta aporta calidez y personalidad en titulares; Inter mantiene el cuerpo neutro y legible; JetBrains Mono da precisión a los números.

### Hierarchy
- **Display** (800, 36px, 1.15): título de página (h1); en móvil `clamp(26px, 7.5vw, 34px)`.
- **Headline** (700, 28px, 1.15): títulos de sección (h2).
- **Title** (700, 17–22px, 1.2): títulos de tarjeta y diálogo.
- **Body** (400, 15px, 1.55): texto general; 16px en lecciones (`.md`) con ancho cómodo.
- **Compact** (400–500, 14px) y **Caption** (400, 12px): datos secundarios y notas; no usar 13px.
- **Label** (600, 11px, 0.1em, mayúsculas): kickers y cabeceras de tabla.
- **Figure** (700, JetBrains Mono, `clamp(24px, 8vw, 36px)`): grandes cifras de rentabilidad.

### Named Rules
**The Mono Numbers Rule.** Todo importe, porcentaje y cotización va en JetBrains Mono con `tabular-nums`, alineado a la derecha en tablas.

## Layout

App de escritorio con barra lateral fija de 232 px (tres grupos numerados: Aprender, Invertir, Club) y contenido fluido con relleno `clamp(16px, 4vw, 48px)`. En móvil (< 768px) la barra pasa a un menú desplegable de ancho `min(86vw, 340px)` y el relleno baja a 16px. Las rejillas dejan que las tablas desplacen dentro de su contenedor, nunca la página entera.

Ritmo de espaciado basado en 6/8/16/20px. Tarjetas con 20px (16px en móvil) y huecos de 7–12px.

## Elevation & Depth

Híbrido ligero: borde fino de 1px (`rgba(14,33,56,0.12)`) más sombra suave teñida de navy. En modo oscuro se sustituye por superficies navy más claras y sombras más densas.

### Shadow Vocabulary
- **Reposo** (`box-shadow: 0 1px 2px rgba(14,33,56,0.06)`): tarjetas y celdas.
- **Media** (`box-shadow: 0 4px 14px rgba(14,33,56,0.08)`): elementos destacados.
- **Elevada** (`box-shadow: 0 16px 40px rgba(14,33,56,0.18)`): diálogos.
- **Resplandor de acción** (`box-shadow: 0 4px 12px rgba(16,185,129,0.3)`): solo botón primario.

### Named Rules
**The Soft Lift Rule.** Las sombras son suaves y teñidas de navy; nunca negras duras. La elevación grande solo para diálogos.

## Shapes

Lenguaje redondeado: **píldora (999px)** para botones, etiquetas, selector segmentado y barras; **12px** para tarjetas y celdas; **10px** para campos y elementos del menú; **16px** para diálogos; círculo completo para avatares y medallas.

## Components

### Buttons
- **Shape:** píldora (999px), Jakarta 700 14px.
- **Primary:** degradado esmeralda profundo (#047857 → #065f46), texto blanco (contraste ≥ 5,5:1), resplandor suave; hover oscurece a #065f46 → #064e3b y active a #064e3b.
- **Secondary:** superficie blanca con borde fino; hover gris hielo.
- **Ghost:** texto esmeralda tinta sin borde; hover lavado esmeralda.
- **Disabled:** opacidad 0.45.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** superficie blanca (navy tarjeta en oscuro), borde fino, sombra de reposo.
- **Internal Padding:** 20px (16px móvil).
- **Cita (`.md-quote`):** fondo navy, borde izquierdo esmeralda de 4px, texto en Jakarta.

### Inputs / Fields
- **Style:** borde fino, 10px de radio, mínimo 38px (44px en móvil con 16px para evitar el zoom de iOS).
- **Focus:** borde esmeralda y halo de 3px esmeralda al 18%.

### Navigation
Barra lateral navy; enlaces con 10px de radio; activo con fondo esmeralda al 18% y borde esmeralda al 50%; números de sección en esmeralda luz. En móvil, botón «Menú» de 44px con punto de aviso.

### Tags
Píldoras de 11px: acento (lavado esmeralda), neutra, contorno, tinta (navy) y dorada (ámbar).

### Aviso de cartera abierta (signature)
Punto ámbar pulsante, etiqueta «Abierta» que parpadea y brillo ámbar en el enlace. Con reducir movimiento se muestra fijo.

## Do's and Don'ts

### Do:
- **Do** usar esmeralda para acción y estados positivos, y ámbar solo para gamificación y avisos.
- **Do** poner cifras en JetBrains Mono con números tabulares.
- **Do** mantener botones y etiquetas en píldora y tarjetas a 12px.
- **Do** respetar `prefers-reduced-motion` en cualquier animación nueva.
- **Do** usar 16px en campos de móvil y 42–44px de alto táctil.

### Don't:
- **Don't** mezclar los dos acentos como decoración ni usar ámbar para acciones.
- **Don't** usar nombres de Tailwind (`indigo`, `red`) como si fueran su color original: están remapeados.
- **Don't** usar sombras negras duras ni elevaciones grandes fuera de diálogos.
- **Don't** usar emojis en la interfaz.
