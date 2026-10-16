# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Familias que aprenden a invertir juntas: presidente del club (rol ADMIN, normalmente un adulto que gestiona), padres y miembros más jóvenes. Uso repartido a partes iguales entre móvil y ordenador: consultar la cartera y registrar decisiones desde cualquier dispositivo, y analizar con calma desde el escritorio.

## Product Purpose
Club de Inversión Familiar (nombre interno: Finanzas Familia) es una liga de inversión familiar orientada a aprender, no a ganar dinero real. Cada miembro recibe una paga mensual, registra compras y ventas (acciones, ETF, fondos, cripto, materias primas) y explica cada decisión en un diario. La app valora las carteras con cotizaciones en vivo, calcula rentabilidad y muestra ranking, estadísticas, noticias y logros. Éxito: que cada miembro entienda por qué invierte y mejore su criterio con el tiempo.

## Positioning
Aprender jugando en familia: liga con paga mensual, carteras mensuales propuestas por el presidente con una lección, diario de decisiones obligatorio («el porqué» y qué haría vender), Academia de seis niveles con quiz y logros. Una app de brokers no enseña, y una app educativa no tiene cartera familiar viva.

## Operating Context
- Carteras mensuales: el presidente publica opciones y una lección; cada miembro reparte su importe, argumenta y envía; las decisiones ajenas se ven tras enviar la propia.
- Cotizaciones en vivo y precios manuales por familia (solo presidente).
- Rol presidente con modo «Previsualizar como miembro».
- Miembros pendientes de aprobación no participan en la liga.
- En toda la app se muestra solo el nombre de pila.

## Capabilities and Constraints
- Next.js 15, React 19, Tailwind 4, Prisma con PostgreSQL, autenticación propia (sesión en cookie).
- Secciones: Inicio, Academia, Acciones, ETF, Cripto, Materias primas, Inversiones, Operaciones, Cartera del mes, Familia, Invitaciones, Perfil.
- Modo claro y oscuro, siguiendo el sistema, con conmutador manual.
- Reducir movimiento del sistema debe respetarse.
- Idioma de la interfaz: español.

## Brand Commitments
Marca existente (Club de Inversión Familiar, eslogan «Aprende, invierte y crece en familia», logo e isotipo en `public/`, navy/esmeralda/ámbar) pero el usuario la declara **no vinculante**: libertad total, incluido rediseñarla si mejora el producto.

## Evidence on Hand
Contenido real: 26 lecciones de Academia en `prisma/academia-data.ts`, copy de interfaz en `src/`, brief previo en `docs/brief-claude-design.md`. No hay testimonios, clientes ni métricas; no inventarlos.

## Product Principles
1. Aprender antes que ganar: cada pantalla refuerza el porqué de una decisión, no la urgencia de operar.
2. Apta para todas las edades de la familia: lenguaje claro, sin tono de apuestas ni presión.
3. Cifras legibles de un vistazo, también en móvil.
4. Gamificación al servicio del aprendizaje (niveles, logros), nunca de la especulación.
5. Familiar y cercana, sin perder la seriedad de manejar dinero.

## Accessibility & Inclusion
Sin estándar formal exigido. Buenas prácticas por defecto: contraste suficiente, modo oscuro, objetivos táctiles cómodos, respetar reducir movimiento.
