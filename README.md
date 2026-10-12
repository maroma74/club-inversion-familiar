# Club de Inversión (Finanzas Familia)

Liga de inversión familiar orientada a **aprender a invertir**: cada miembro recibe una paga mensual, registra sus compras y ventas (acciones, ETF, fondos y criptomonedas) y explica cada decisión en un diario; la app valora las carteras con cotizaciones en vivo, calcula la rentabilidad y muestra el ranking, estadísticas, noticias y logros. Una Academia de seis niveles con quiz desbloquea cursos y suma puntos de nivel.

## Identidad de marca (pack `club-inversion-familiar-claude-pack`)

- Nombre **Club de Inversión Familiar**, eslogan «Aprende, invierte y crece en familia». Logo horizontal en `public/logo.svg` (pensado para fondo navy), isotipo en `public/isotipo.svg` y favicon en `src/app/icon.svg`.
- Tokens en `src/app/globals.css`: navy `#0E2138` (barra lateral, VENDER, textos), esmeralda `#10B981` (CTA, positivo, COMPRAR), ámbar `#E5A016` (gamificación: medallas, Líder, MANTENER), superficie clara `#F8FAFC`. Modo oscuro nativo: sigue al sistema y se puede forzar con el botón Claro/Oscuro del pie de la barra lateral (`data-theme` + localStorage).
- Tipografías con `next/font`: Plus Jakarta Sans (titulares, 600–800), Inter (cuerpo) y JetBrains Mono (cifras, clase `.tabular-nums` / `.figure`).
- La estructura de pantallas y las clases de componente vienen del handoff anterior (sistema Industry); en esta pasada solo cambian tokens, formas (esquinas redondeadas, botones píldora) y tipografía. La paleta de Tailwind sigue remapeada en `@theme`.
- El pack propone además Supabase, PWA y Shadcn/ui; no se han adoptado: la app sigue con Prisma + SQLite y autenticación propia.

## Carteras mensuales (rol de presidente)

- El rol `ADMIN` se muestra como **Presidente del club**. En `/cartera/gestion` crea la cartera de cada mes: mes, título, lección (texto que acompaña la propuesta), mínimo y máximo de opciones a elegir, fecha límite, importe por miembro (editable) y opciones de inversión (acciones, ETF o cripto, con nota de qué investigar).
- Al **publicar**, cada importe se registra como paga (aportación) y los miembros pueden decidir en `/cartera`: leen la lección, analizan cada opción (enlace a su ficha y Recomendación del Club), eligen, reparten su importe, explican cada elección y escriben un argumento general. Al enviar, se compran los activos a precio de mercado (operaciones con entidad «Cartera AAAA-MM») y cada elección queda en el diario.
- Las decisiones de los demás se ven tras enviar la propia (el presidente las ve siempre). El presidente puede cerrar y reabrir la cartera. Modelos `MonthlyPortfolio`, `MonthlyOption`, `MonthlyAllocation`, `MonthlyDecision`, `MonthlyChoice`; lógica en `src/lib/monthly.ts` y `src/app/actions/monthly.ts`.

## Diseño (sistema «Industry», handoff de Claude Design)

- Tokens y clases de componente en `src/app/globals.css`: fondo `#f2f2f3`, texto `#1d1f20`, un solo acento `#5980a6` con rampa 100–900, esquinas rectas, tarjetas `.card.blueprint` con marcas de registro, botones `.btn-primary/secondary/ghost`, `.tag`, `.table`, `.input`, `.radio`, `.seg`, `.dialog`, `.cellgrid`, `.bar`, `.figure`. Positivo = acento 700; negativo = color de texto con signo «−». Sin emojis.
- Tipografías Barlow (cuerpo) y Barlow Condensed (titulares y cifras) cargadas con `next/font`.
- La paleta de Tailwind (indigo/green/red/slate/amber) está remapeada en `@theme` a la rampa Industry, de modo que las clases utilitarias existentes adoptan el sistema sin reescribirlas.
- Shell: barra lateral de 232 px con tres grupos numerados (Aprender, Invertir, Club) y pie con rol y nivel.

## Academia y diario

- **Academia** (`/academia`): seis cursos, uno por nivel (Fundamentos, Productos, Construir una cartera, Analizar empresas, Análisis técnico, Disciplina y riesgo), 26 lecciones con quiz de tres preguntas. Se supera una lección con todas correctas (+10 puntos); un curso se desbloquea al completar el anterior. Contenido en `prisma/academia-data.ts`, carga con `npm run db:seed`.
- **Niveles**: puntos = logros × 10 + lecciones superadas × 10; 30 puntos por nivel (Novato → Leyenda). El ranking de la liga sigue siendo solo por rentabilidad.
- **Diario de inversión**: cada entrada guarda activo, operación, el porqué y qué haría vender. Una compra sin entrada aparece como «pendiente» en Inicio. Diálogo global `DiaryDialog`, acciones en `src/app/actions/journal.ts`.
- **Inicio** (`/inicio`): siguiente lección, tira de niveles, resumen de la cartera, diario de la familia y liga del mes.

## Puesta en marcha

```bash
npm install
npx prisma migrate dev
npm run dev
```

Abre http://localhost:3000. La base de datos es un archivo SQLite en `prisma/dev.db` (no necesita Docker ni servidor).

Antes de usarla en serio, cambia `AUTH_SECRET` en `.env` por una cadena larga y aleatoria.

## Cómo se usa

1. **Registro.** El padre/madre se registra con «Crear familia» y es administrador. En *Familia* aparece un código de invitación; los hijos se registran con «Tengo un código» y entran en la misma familia.
2. **Familia.** El administrador fija la paga mensual (100 € por defecto), la reparte cada mes con un clic y puede añadir, editar o borrar aportaciones.
3. **Operaciones.** Cada miembro registra sus compras y ventas: activo (buscador de Yahoo Finance), cantidad, precio en EUR/USD/GBP/CHF, comisión, fecha y **entidad** donde se ejecutó la orden. Si una compra supera el efectivo disponible, la diferencia se anota como aportación propia. Las operaciones se pueden editar y borrar. Para activos sin cotización se puede fijar un precio manual.
4. **Liga de inversión.** Ranking por rentabilidad sobre lo aportado, niveles y logros de cada miembro, estadísticas (mejor cartera, mejor valor, mayor posición…), evolución en el tiempo, noticias de los valores de la familia y las carteras de todos.
5. **Acciones.** Índices, lista de seguimiento compartida y análisis técnico por valor (medias móviles, EMA, Bollinger, RSI, MACD, estocástico, ADX, OBV, ATR, Fibonacci, soportes y resistencias). Cada valor lleva la **Recomendación del Club de inversión** (COMPRAR / MANTENER / VENDER): un motor determinista que puntúa de −2 a +2 los bloques tendencia (30 %), momentum (25 %), volumen (20 %) y volatilidad/estructura (25 %), aplica las reglas de disciplina (no comprar contra la tendencia principal sin giro confirmado, stop por estructura o 1,5–2× ATR, R/B mínimo 1:2, penalización si hay resultados en 10 días, MANTENER por defecto si faltan datos) y produce plan de operación, tesis, riesgos y nivel de confianza. Los datos complementarios (sector, beta, fecha de resultados) salen del perfil de Yahoo Finance y las noticias del buscador de Yahoo; lo que no esté disponible se marca N/D. Se guarda una foto diaria por valor (`ClubRecommendation`) para ver desde cuándo se mantiene cada opinión. `/acciones/ranking` ordena toda la lista y destaca las mejores oportunidades y los valores a reducir. Código en `src/lib/recommend.ts`, `src/lib/club.ts` y `src/lib/fundamentals.ts`.
6. **ETF.** Misma mecánica que Acciones (lista de seguimiento propia, análisis técnico, Recomendación del Club, ranking y noticias) con la ficha del fondo: gestora, categoría, TER, patrimonio, principales posiciones y pesos por sector (perfil de Yahoo Finance). Al añadir un valor, la app detecta si es acción o ETF y lo coloca en la sección que corresponde. Páginas en `src/app/(app)/etf`, componentes compartidos en `src/components/market`.
7. **Cripto.** Top 25 por capitalización en euros, índice de miedo y codicia y la exposición cripto de la familia.

## Invitaciones y entrada al club

El administrador gestiona la entrada desde *Invitaciones*: invitaciones personales de un solo uso (con nombre, email opcional, rol y caducidad, compartidas como enlace `/registro?codigo=XXXX`), modo de entrada del código general (directo, con aprobación o desactivado), solicitudes pendientes de aprobar, cambio de rol y expulsión de miembros. Un usuario pendiente ve la pantalla `/pendiente` hasta que se le aprueba.

## Diseño

`docs/brief-claude-design.md` es un brief completo (usuarios, principios, mapa de pantallas con sus datos, inventario de componentes y restricciones técnicas) pensado para entregarlo a Claude Design o a un diseñador. Un sistema de diseño generado en Claude Design se puede traer al repositorio con `/design-sync`.

## Cotizaciones y datos

- Precios e histórico: endpoint público de Yahoo Finance, sin clave. Cripto y bolsa de EE. UU. en tiempo real; bolsas europeas con ~15 min de retraso. Caché de 60 s y refresco automático cada minuto.
- Mercado cripto: CoinGecko (sin clave). Sentimiento: alternative.me.
- Noticias: buscador de Yahoo Finance por símbolo.
- Las operaciones en divisa distinta del euro guardan el tipo de cambio de cierre del día (`fxRate`); toda la cartera se valora en euros.
- Para sustituir la fuente de precios basta con cambiar `fetchQuote` y `searchSymbols` en `src/lib/prices.ts` (y `src/lib/stocks.ts` para histórico e índices).

## Estructura

- `prisma/schema.prisma` — familias, usuarios, aportaciones, operaciones (con divisa, cambio y entidad), cotizaciones, fotos de cartera y lista de seguimiento.
- `src/lib/portfolio.ts` — valoración de carteras y ranking. `src/lib/league.ts` — estadísticas. `src/lib/badges.ts` — logros y niveles. `src/lib/news.ts` — noticias.
- `src/lib/prices.ts`, `src/lib/stocks.ts`, `src/lib/technical.ts`, `src/lib/crypto.ts` — cotizaciones, histórico, indicadores técnicos y mercado cripto.
- `src/app/(app)/*` — páginas: inversiones (liga), operaciones, acciones, cripto, familia.
