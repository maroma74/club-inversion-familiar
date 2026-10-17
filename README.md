# Club de Inversión (Finanzas Familia)

Liga de inversión familiar orientada a **aprender a invertir**: cada miembro recibe una paga mensual, registra sus compras y ventas (acciones, ETF, fondos y criptomonedas) y explica cada decisión en un diario; la app valora las carteras con cotizaciones en vivo, calcula la rentabilidad y muestra el ranking, estadísticas, noticias y logros. Una Academia de seis niveles con quiz desbloquea cursos y suma puntos de nivel.

## Identidad de marca (pack `club-inversion-familiar-claude-pack`)

- Nombre **Club de Inversión Familiar**, eslogan «Aprende, invierte y crece en familia». Logo horizontal en `public/logo.svg` (pensado para fondo navy), isotipo en `public/isotipo.svg` y favicon en `src/app/icon.svg`.
- Tokens en `src/app/globals.css`: navy `#0E2138` (barra lateral, VENDER, textos), esmeralda `#10B981` (CTA, positivo, COMPRAR), ámbar `#E5A016` (gamificación: medallas, Líder, MANTENER), superficie clara `#F8FAFC`. Modo oscuro nativo: sigue al sistema y se puede forzar con el botón Claro/Oscuro del pie de la barra lateral (`data-theme` + localStorage).
- Tipografías con `next/font`: Plus Jakarta Sans (titulares, 600–800), Inter (cuerpo) y JetBrains Mono (cifras, clase `.tabular-nums` / `.figure`).
- La estructura de pantallas y las clases de componente vienen del handoff anterior (sistema Industry); en esta pasada solo cambian tokens, formas (esquinas redondeadas, botones píldora) y tipografía. La paleta de Tailwind sigue remapeada en `@theme`.
- El pack propone además Supabase, PWA y Shadcn/ui; no se han adoptado: la app sigue con Prisma + SQLite y autenticación propia.

## Carteras mensuales (rol de presidente)

- El rol `ADMIN` se muestra como **Presidente del club**. En `/cartera/gestion` crea la cartera de cada mes: mes, título, lección (texto que acompaña la propuesta), mínimo y máximo de opciones a elegir, fecha límite, importe por miembro (editable) y opciones de inversión (acciones, ETF o cripto, con nota de qué investigar). Mientras haya una cartera abierta a la que a un miembro le quede decidir (importe asignado, sin decisión enviada y plazo vigente), «Cartera del mes» parpadea en el menú con la etiqueta «Abierta» y un punto pulsante; en móvil el punto aparece en el botón Menú. Al enviar su decisión la señal desaparece, y con «reducir movimiento» activado en el sistema se muestra fija.
- Al **publicar**, cada importe se registra como paga (aportación) y los miembros pueden decidir en `/cartera`: leen la lección, analizan cada opción (enlace a su ficha y Recomendación del Club), eligen, reparten su importe, explican cada elección y escriben un argumento general. Al enviar, se compran los activos a precio de mercado (operaciones con entidad «Cartera AAAA-MM») y cada elección queda en el diario.
- Las decisiones de los demás se ven tras enviar la propia (el presidente las ve siempre). El presidente puede cerrar y reabrir la cartera. Modelos `MonthlyPortfolio`, `MonthlyOption`, `MonthlyAllocation`, `MonthlyDecision`, `MonthlyChoice`; lógica en `src/lib/monthly.ts` y `src/app/actions/monthly.ts`.
- **Tareas del presidente** (bloque de Inicio, `src/lib/adminTasks.ts`): solicitudes de entrada sin aprobar, paga del mes sin repartir, mes sin cartera o cartera en borrador, miembros sin importe, plazo vencido sin cerrar, mes siguiente sin preparar y compras hechas fuera del formulario por reconocer; cada aviso lleva a la pantalla donde se resuelve. Debajo, «Tus propuestas en el repositorio» con las veces que se ha usado cada una (en total y por otras familias), y el mismo contador en la tarjeta de compartir de cada cartera.
- **Historial y repaso** (`/cartera/historial`): todas las carteras publicadas o cerradas de la familia quedan archivadas. El repaso de cada una (`/cartera/historial/[id]`) ordena las opciones de mejor a peor por su rendimiento desde la publicación, enseña qué eligió cada miembro, cuánto invirtió y cuánto vale hoy (desde el precio al que compró), el puesto de cada uno y «qué habría dado la mejor opción con el mismo dinero». Para lo que eligieron los miembros, el precio de entonces es el de ejecución guardado en la elección; para lo que nadie eligió, el cierre del día de la publicación (Yahoo) convertido a euros. Las decisiones ajenas se ven con la misma regla que en la cartera del mes (tras decidir, o cuando termina el plazo). Cálculo puro en `src/lib/monthlyReview.ts` (con pruebas); datos en `src/lib/monthlyHistory.ts`.
- **Lección con formato.** El texto de la lección se escribe en el cuadro tal cual; `src/components/Markdown.tsx` le da formato automático (líneas cortas sueltas → títulos, «Idea clave:» / «Importante:» → destacado, párrafos de preguntas → bloque de reflexión, cifras en € o % y símbolos de las opciones resaltados) y además entiende Markdown (`##`, `**`, listas, `>`, tablas, enlaces). El editor tiene modo Editar / Previsualizar, el botón «Dar formato automático» (convierte el texto en Markdown editable) y una plantilla.
- **Vista de miembro.** En la barra superior, el presidente puede pulsar «Previsualizar como miembro» para ver toda la app exactamente como la ven los miembros (sin gestión, invitaciones ni ajustes) y volver con un clic. Se guarda en una cookie de su sesión (`src/app/actions/view.ts`); `getCurrentUser` devuelve `role` MEMBER y `realRole` ADMIN mientras está activa.
- **Repositorio de propuestas** (`/cartera/repositorio`, solo presidentes). Catálogo compartido entre familias para quien no sepa qué proponer: filtros por tema, riesgo, autoría y búsqueda por título o valor; cada tarjeta trae lección, opciones y cuántas pueden elegir los miembros. «Usar esta propuesta» crea el borrador de la cartera del mes elegido (por defecto, el primer mes libre) con el importe por defecto para cada miembro activo y suma un uso. Hay 20 propuestas del club (`prisma/proposals-data.ts`, se cargan con `prisma db seed` por su `slug`, sin duplicar ni perder el contador de usos).
  - **Catálogo propio y propuestas usadas.** Desde el repositorio, «Nueva propuesta» crea una propuesta directamente en el catálogo (título, tema, riesgo, lección, opciones una por línea «SÍMBOLO | qué investigar»; nombre y tipo se completan comprobando que el valor cotiza), sin pasar por una cartera. Cada cartera recuerda la propuesta de la que salió (`MonthlyPortfolio.sourceProposalId`): el repositorio marca «Usada · mes» las que tu familia ya convirtió en cartera y las sugerencias de «Carteras mensuales» no las repiten. Las carteras se pueden preparar en borrador para cualquier mes futuro.
  - **Compras fuera del formulario.** Si un miembro compra a mano un valor de la cartera del mes (por ejemplo porque no tenía importe asignado), la gestión de esa cartera lo muestra en «Compras hechas fuera del formulario» y el presidente puede «Contar como su decisión»: se crea su decisión con esa compra, el porqué de su diario y el precio real pagado, sin mover dinero. También avisa de los miembros activos sin importe asignado.
  - **Compartir.** En el detalle de cada cartera, la casilla «Compartir esta propuesta en el repositorio» publica una copia (título, lección y opciones; nunca importes, decisiones ni miembros), **firmada** («Familia Pérez») o **anónima** (no se expone la familia). Se puede volver a guardar para actualizar la copia y retirar desde la cartera o desde el repositorio. Límite de 30 propuestas por familia.
  - **Normativa del club: texto neutro.** Las propuestas no pueden mencionar meses, años, trimestres, semanas, estaciones ni expresiones como «este mes» o «últimos 12 meses», porque las usan otras familias en otro momento. Además piden título de 3 a 120 caracteres, lección de 200 a 8000, entre 2 y 12 opciones, tema, riesgo (1 a 5) y un mínimo y máximo de elecciones coherentes. La regla vive en `src/lib/proposals.ts` (con pruebas en `src/lib/proposals.test.ts`, incluidas las 20 propuestas del club): el formulario avisa en vivo de lo que hay que corregir y el servidor lo vuelve a comprobar antes de guardar. Modelos `Proposal` y `ProposalOption`; acciones en `src/app/actions/proposals.ts`.

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
cp .env.example .env
npx prisma dev -n clubinversion -d   # PostgreSQL local sin Docker; copia la URL TCP que muestra en .env
npm run db:deploy                    # migraciones + Academia
npm run dev
```

Abre http://localhost:3000. La base de datos es PostgreSQL: en desarrollo la sirve `prisma dev` (una instancia por proyecto, de ahí el nombre `-n clubinversion`) y en producción Cloud SQL. Con `prisma dev`, añade `&connection_limit=1&pgbouncer=true` a la URL TCP para evitar el error `prepared statement "s0" already exists`.

Antes de usarla en serio, cambia `AUTH_SECRET` en `.env` por una cadena larga y aleatoria.

## Seguridad
- En los rankings y en toda la aplicación se muestra solo el **nombre de pila**, sin apellidos (`src/lib/names.ts`). Si dos miembros de una familia se llaman igual, se distinguen con la inicial del último apellido («Miguel R.»).

- Sesión en cookie `__session` (httpOnly, Secure, SameSite=Lax, JWT HS256 firmado con `AUTH_SECRET`, 30 días). El modo «ver como miembro» del presidente viaja dentro de la misma sesión. La sesión lleva la **versión de sesión** del usuario (`User.sessionVersion`): al cambiar o restablecer la contraseña sube y las sesiones antiguas dejan de valer. En producción `AUTH_SECRET` se comprueba al arrancar (`src/instrumentation.ts`): valores cortos o de ejemplo impiden que la revisión arranque.
- **Contraseñas.** Cada miembro la cambia en Perfil (contraseña actual + nueva de 10 a 72 caracteres). Si la olvida, el presidente genera desde Invitaciones un enlace de un solo uso válido una hora (`/restablecer/<token>`, se guarda solo el hash del token); el enlace se envía por correo y también se puede copiar para pasarlo en mano. Acciones en `src/app/actions/password.ts`.
- Límite de intentos de login por conexión, por email y conexión, y por email solo (tabla `AuthAttempt`, compartida entre instancias); también en registro, comprobación de códigos, invitaciones, quiz, subida de foto, compartir y usar propuestas y las rutas `/api/quote` y `/api/symbols`. La IP del cliente se toma del último salto de confianza de `x-forwarded-for` (Firebase Hosting + frontal de Cloud Run), no del primero, que lo escribe el propio cliente; `TRUSTED_PROXY_HOPS` permite ajustarlo. Comparación de hash también cuando el email no existe.
- Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP y CORP) en `next.config.ts` y Content-Security-Policy con nonce por petición en `src/middleware.ts`.
- Todas las acciones de servidor validan con zod (`src/lib/validation.ts`): símbolos, cotas de importes, longitudes, fechas reales de calendario y nombres sin caracteres de control. Las operaciones con dinero (publicar cartera, paga mensual, decisión del miembro) van en transacciones con cerrojo para evitar duplicados.
- **Coherencia del libro de operaciones** (`src/lib/ledger.ts`): no se puede vender lo que no se tenía en esa fecha, ni encoger o borrar una compra de la que después se vendió; una venta solo ingresa lo que realmente se tenía. Las compras de una decisión de la cartera del mes se pueden ajustar al precio, cantidad o comisión reales del bróker, pero no cambian de valor ni se borran (ni sus entradas de diario); las aportaciones ligadas al importe de una cartera o calculadas automáticamente tampoco se editan a mano. Quitar valores de la lista de seguimiento compartida es cosa del presidente. La paga de un mes se registra una sola vez aunque llegue por el reparto manual y por la publicación de la cartera.
- El registro de familias nuevas está **cerrado por defecto**: solo con `ALLOW_FAMILY_SIGNUP=true`. Las invitaciones se envían a un único destinatario y hay un tope de 30 correos por familia cada 24 horas. Los textos del repositorio de propuestas no admiten enlaces externos.
- Las fotos de perfil se comprueban por sus bytes (JPEG, PNG o WebP), por tamaño en bytes y por tamaño en píxeles (máximo 2048 de lado).
- Los errores operativos (proveedor de precios, cambio de divisa, correo, base de datos) se registran como JSON con `severity` (`src/lib/log.ts`) para que Cloud Logging los agrupe; las páginas de error y de «no encontrado» están en español y no muestran detalles técnicos (solo la referencia `digest`).
- En Cloud Run el servicio corre con una cuenta de servicio propia con permisos mínimos (cliente de Cloud SQL y lectura de sus tres secretos), no con la cuenta por defecto del proyecto. La imagen base es Node 22 fijada por digest y el contenedor usa la zona horaria `Europe/Madrid`, de modo que «hoy» y «este mes» coinciden con los de la familia.
- Los precios manuales son por familia y solo los fija el presidente. Los miembros pendientes de aprobación no participan en la liga ni reciben paga.
- Los enlaces de invitación se construyen con `APP_URL`, nunca con cabeceras de la petición. Los códigos se generan con un generador criptográfico.
- **Invitaciones para familias nuevas.** Con el registro público cerrado, el club crece por invitación: en Invitaciones, el presidente elige el tipo «Crear una familia nueva» y quien use ese código funda su propio club (pone el nombre de su familia y entra como presidente), con lo que a su vez puede invitar a su familia y a otras. Máximo 10 invitaciones de este tipo sin usar por familia; la familia nueva se crea en la misma transacción que su presidente. En la base, `Invitation.newFamily`.
- La imagen Docker es «standalone», sin código fuente ni dependencias de desarrollo, y corre como usuario `node`.

## Despliegue en Google Cloud (producción)

URL pública: https://clubdeinversionfamiliar.com (www redirige al dominio raíz). URL directa del servicio: https://club-inversion-790874739436.europe-southwest1.run.app

La app corre en **Cloud Run** (proyecto `clubdeinversionfamiliar`, región `europe-southwest1`, escala a cero) y usa **PostgreSQL en la instancia Cloud SQL de AlquilaFacil** (`alquilafacil-510608:europe-southwest1:alquilafacil-db`, base de datos `clubinversion`, usuario `club_app`) para no pagar una segunda instancia. Credenciales en Secret Manager (`club-database-url`, `club-auth-secret`); la cuenta de servicio de Cloud Run tiene `roles/cloudsql.client` en el proyecto de AlquilaFacil.

Publicar una versión nueva (la CLI necesita `CLOUDSDK_PYTHON` apuntando al Python del SDK en Windows):

```bash
gcloud builds submit --project clubdeinversionfamiliar --region europe-southwest1 --tag europe-southwest1-docker.pkg.dev/clubdeinversionfamiliar/club/app:v2 .
gcloud run deploy club-inversion --project clubdeinversionfamiliar --region europe-southwest1 --image europe-southwest1-docker.pkg.dev/clubdeinversionfamiliar/club/app:v2
```

Si la versión trae migraciones nuevas, aplícalas antes con `npm run db:deploy` apuntando `DATABASE_URL` a la base de datos de producción (por ejemplo a través del Cloud SQL Auth Proxy o autorizando temporalmente tu IP en la instancia). El contenedor solo sirve la app, para que los arranques en frío sean rápidos.

**Dominio propio.** Cloud Run no admite dominios personalizados en `europe-southwest1`, así que el dominio está en **Firebase Hosting** (sitio `clubdeinversionfamiliar`, mismo proyecto, gratis) con una regla que reenvía todas las rutas al servicio de Cloud Run. El DNS está en Cloudflare apuntando a Firebase. La configuración de Hosting no tiene archivos, solo esta regla y cabeceras de caché (`private, no-store` para las páginas e `immutable` para `/_next/static/**`), y se publica por la API de Hosting (versión → FINALIZED → release). Firebase Hosting solo reenvía a Cloud Run la cookie llamada `__session`, por eso la sesión (y el modo «ver como miembro») van en esa única cookie; no hace falta tocarla al publicar versiones nuevas de la app, basta con `gcloud run deploy`.

**La URL directa de Cloud Run no se indexa.** Cuando la petición llega por `*.run.app` en vez de por el dominio del club, el middleware añade `X-Robots-Tag: noindex, nofollow` y `/robots.txt` devuelve `Disallow: /`; por el dominio propio no cambia nada. Se distingue con `x-forwarded-host` (donde Firebase Hosting deja el dominio original) y, sin él, con `Host`; la lógica está en `src/lib/host.ts`, con pruebas.

Variables en Cloud Run: `APP_URL=https://clubdeinversionfamiliar.com`, `ALLOW_FAMILY_SIGNUP=false` (el club es privado: solo se entra con código o invitación), `EMAIL_FROM`; secretos `DATABASE_URL`, `AUTH_SECRET` y `RESEND_API_KEY`.

Ajustes de consumo: `--min-instances 0` (no cuesta nada sin visitas), `--max-instances 2`, 512 MiB y 1 CPU solo durante las peticiones. La imagen vive en Artifact Registry (`club`).

## Contexto macro y analistas (BCE, FRED y Finnhub)

- **Contexto del mercado** (tarjeta de Inicio, `src/components/MacroCard.tsx`): tipo de depósito del BCE, Euríbor a 12 meses e inflación de la zona euro y de España desde el portal de datos del BCE (sin clave), más tipo de la Reserva Federal, bono de EE. UU. a 10 años e inflación de EE. UU. desde FRED si existe `FRED_API_KEY` (clave gratuita). Cada dato lleva una frase que explica qué significa para la familia. Series y lectura de las respuestas en `src/lib/macroData.ts`; descarga en `src/lib/macro.ts`.
- **Qué dicen los analistas** (ficha de cada acción, `src/components/AnalystPanel.tsx`): consenso de recomendaciones, cuántos de los últimos cuatro trimestres el beneficio por acción igualó o superó la previsión y la próxima fecha de resultados, desde Finnhub con `FINNHUB_API_KEY` (cuenta gratuita, 60 peticiones/min). Sin clave, el panel no se muestra; si un dato es de pago para un valor, se omite. Es informativo: no entra en la Recomendación del Club.
- Todas estas respuestas pasan por `ApiCache` (`src/lib/apiCache.ts`): memoria de la instancia más una tabla en la base de datos con la fecha de cada dato, 12 horas de validez, y si el proveedor falla se sirve lo último guardado. Así los arranques en frío de Cloud Run no repiten llamadas y ninguna de estas fuentes puede tirar una página.

## Despliegue en otro sitio

- **Docker Compose** (VPS, Railway, Render, Fly.io, Coolify): `docker compose up -d --build` levanta PostgreSQL y la app; el arranque aplica migraciones y carga la Academia (`npm run start:prod`). Define `AUTH_SECRET` (y opcionalmente `DB_PASSWORD`) en un `.env`.
- **Node sin Docker**: `npm ci && npm run build && DATABASE_URL=postgresql://... AUTH_SECRET=... npm run start:prod`.
- **Vercel / Netlify**: funciona con cualquier PostgreSQL gestionado (Neon, Supabase…) definiendo `DATABASE_URL` y `AUTH_SECRET`; ejecuta `npm run db:deploy` una vez contra esa base de datos.

Variables de entorno: `DATABASE_URL`, `SEC_USER_AGENT` (contacto para la SEC), `PER_WEIGHT` (peso del PER en la recomendación), `AUTH_SECRET` (mínimo 32 caracteres; en producción la app no arranca sin él), `APP_URL` (URL pública para los enlaces de invitación), `ALLOW_FAMILY_SIGNUP` (`false` desactiva la creación de familias nuevas desde el registro; solo se entra con código) y, para enviar invitaciones por correo, `RESEND_API_KEY` y `EMAIL_FROM` (ver `.env.example`). El correo sale por la API de [Resend](https://resend.com) desde un dominio verificado allí (`clubdeinversionfamiliar.com`); sin clave, en desarrollo el correo se imprime en la consola del servidor y en producción el botón avisa de que no está configurado. Los precios se obtienen de Yahoo Finance y CoinGecko, así que el servidor necesita salida a internet. Para traer datos de una instalación anterior: `npm run db:import ruta/export.json`.

## Cómo se usa

1. **Registro.** El padre/madre se registra con «Crear familia» y es administrador. En *Familia* aparece un código de invitación; los hijos se registran con «Tengo un código» y entran en la misma familia.
2. **Familia.** El administrador fija la paga mensual (100 € por defecto), la reparte cada mes con un clic y puede añadir, editar o borrar aportaciones.
3. **Operaciones.** Cada miembro registra sus compras y ventas: activo (buscador de Yahoo Finance), cantidad, precio en EUR/USD/GBP/CHF, comisión, fecha y **entidad** donde se ejecutó la orden. Si una compra supera el efectivo disponible, la diferencia se anota como aportación propia. Las operaciones se pueden editar y borrar. Para activos sin cotización se puede fijar un precio manual.
4. **Liga de inversión.** Ranking por rentabilidad sobre lo aportado, niveles y logros de cada miembro, estadísticas (mejor cartera, mejor valor, mayor posición…), evolución en el tiempo, noticias de los valores de la familia y las carteras de todos.
5. **Acciones.** Índices, lista de seguimiento compartida y análisis técnico por valor (medias móviles, EMA, Bollinger, RSI, MACD, estocástico, ADX, OBV, ATR, Fibonacci, soportes y resistencias).
   - **PER histórico.** En la ficha de cada acción de EE. UU., tres gráficos apilados con el mismo eje de fechas y tooltip sincronizado: precio, BPA de los últimos 12 meses (barras) y PER con la media y la banda entre los percentiles 25 y 75. Selector 1A / 3A / 5A / 10A / Todo, estadísticas (actual, media, mediana, mínimo, máximo, percentil, desviación sobre la media) y una señal: **Barata** (percentil ≤ 25 y BPA creciendo), **Cara** (percentil ≥ 75) o **Neutral**, con aviso de **posible trampa de valor** cuando el PER es bajo pero el BPA cae. En el listado, la columna ordenable «PER vs histórico».
   - La señal entra en la Recomendación del Club como un quinto bloque, «Valoración (PER)», con peso configurable (15 % por defecto); los cuatro bloques técnicos se reescalan para que todo siga sumando 1. Sin datos de PER (ETF, cripto, materias primas, valores no estadounidenses) la recomendación queda exactamente como antes. Cada valor lleva la **Recomendación del Club de inversión** (COMPRAR / MANTENER / VENDER): un motor determinista que puntúa de −2 a +2 los bloques tendencia (30 %), momentum (25 %), volumen (20 %) y volatilidad/estructura (25 %), aplica las reglas de disciplina (no comprar contra la tendencia principal sin giro confirmado, stop por estructura o 1,5–2× ATR, R/B mínimo 1:2, penalización si hay resultados en 10 días, MANTENER por defecto si faltan datos) y produce plan de operación, tesis, riesgos y nivel de confianza. Los datos complementarios (sector, beta, fecha de resultados) salen del perfil de Yahoo Finance y las noticias del buscador de Yahoo; lo que no esté disponible se marca N/D. Se guarda una foto diaria por valor (`ClubRecommendation`) para ver desde cuándo se mantiene cada opinión. `/acciones/ranking` ordena toda la lista y destaca las mejores oportunidades y los valores a reducir. Código en `src/lib/recommend.ts`, `src/lib/club.ts` y `src/lib/fundamentals.ts`.
6. **ETF.** Misma mecánica que Acciones (lista de seguimiento propia, análisis técnico, Recomendación del Club, ranking y noticias) con la ficha del fondo: gestora, categoría, TER, patrimonio, principales posiciones y pesos por sector (perfil de Yahoo Finance). Al añadir un valor, la app detecta si es acción o ETF y lo coloca en la sección que corresponde. Páginas en `src/app/(app)/etf`, componentes compartidos en `src/components/market`.
7. **Cripto.** Igual que Acciones y ETF: lista de seguimiento de la familia con la Recomendación del Club por moneda, ficha con histórico (3 meses a 5 años), análisis técnico completo, noticias y ranking del Club (`/cripto/[símbolo]` y `/cripto/ranking`). Además, top 25 por capitalización en euros, índice de miedo y codicia y la exposición cripto de la familia.
   - El análisis está adaptado al mercado 24/7: el año tiene 365 velas (semana = 7, mes = 30), el volumen de la vela de hoy se proyecta a 24 h y los umbrales de volatilidad son los de una criptomoneda (ATR muy alto a partir del 7 % diario). Los precios de los niveles (entrada, stop, objetivos) usan los decimales que necesite la moneda.
   - La ficha de la moneda (puesto, capitalización, oferta, máximo histórico, categorías, descripción) viene de CoinGecko. El índice de miedo y codicia se añade como contexto y riesgo, nunca cambia la puntuación.
   - Se usa el par en euros de Yahoo Finance (BTC-EUR); si no existe se usa el par en dólares y la ficha lo avisa. Al buscar, los pares en euros salen primero y basta escribir «BTC» en el buscador.

8. **Materias primas.** Misma mecánica que Acciones, ETF y Cripto, sobre un catálogo del club de 19 materias primas agrupadas en metales preciosos, metales industriales, energía, agrícolas y ganadería (`src/lib/commodities.ts`). Lista de seguimiento propia, ficha con histórico, análisis técnico, Recomendación del Club, noticias y ranking (`/materias-primas`, `/materias-primas/[símbolo]`, `/materias-primas/ranking`).
   - Los precios son los de los futuros continuos de Yahoo Finance (`GC=F`, `CL=F`…), en dólares con su equivalente en euros. Yahoo da los agrícolas en centavos y la app los pasa a dólares para que cuadren con las operaciones.
   - Cada ficha explica qué es la materia prima, qué mueve su precio, quién la produce y el tamaño del contrato. Se avisa del salto de precio al cambiar de contrato y de que los futuros no son un producto para empezar (para eso están los ETC y ETF).
   - Noticias: RSS de Investing.com, Expansión (español), OilPrice, Mining.com, Natural Gas Intelligence y CNBC filtrados por materia prima, más Yahoo por nombre. El buscador de la lista acepta el nombre («oro», «petróleo») o el símbolo.

9. **Mi perfil.** Pulsando en tu nombre (abajo del menú) cada miembro sube su foto de perfil. El navegador la recorta en cuadrado (con zoom y desplazamiento) y la reduce a 256×256 antes de subirla; el servidor la valida por sus primeros bytes (solo JPG, PNG o WebP, máximo 150 KB, nada de SVG) y la guarda en la base de datos, en una tabla aparte (`UserAvatar`), sin servicios nuevos. Solo la ven los miembros activos de la misma familia (`/api/avatar/[id]`) y se cachea un día con la fecha de subida en la URL. La foto aparece en el menú, el ranking de la liga, Inicio, Familia e Invitaciones; sin foto se ve la inicial.


## PER histórico: cómo funciona

- **Cálculo** (`src/lib/per.ts`, funciones puras con pruebas): BPA TTM = suma de los 4 últimos trimestres de BPA diluido; PER = precio de cierre / BPA TTM publicado hasta esa fecha. Si el BPA TTM es 0 o negativo, el PER no se pinta. El cuarto trimestre se obtiene restando los tres primeros al dato anual, el BPA se ajusta por los splits que publica Yahoo (el precio ya viene ajustado) y cada BPA solo se usa desde la fecha en que se publicó, para no usar información que el mercado aún no tenía.
- **Datos, a coste cero y sin claves.** BPA trimestral: API pública de la SEC EDGAR (concepto `EarningsPerShareDiluted`; el ticker se traduce a CIK con `company_tickers.json`). La SEC exige un User-Agent con contacto: se toma de `SEC_USER_AGENT` (por defecto `ClubInversionFamiliar/1.0 (club@clubdeinversionfamiliar.com)`; pon un correo que leas). Precios: cierres semanales de Yahoo Finance.
- **Proveedores en cadena** (`src/lib/epsProviders.ts`): primero EDGAR (trimestres de 10+ años, acciones de EE. UU.) y, si no cubre el valor, Yahoo Finance (`fundamentals-timeseries`: BPA anual y de los últimos 12 meses de los últimos 3-4 años, en la divisa de cada empresa), que vale para el IBEX, Europa, Londres (precio en peniques pasado a libras) y para empresas de EE. UU. que no publican el concepto estándar en la SEC (KO). Si la divisa del BPA no coincide con la de cotización (SKM: wones frente a dólares) el PER queda «no disponible» en vez de inventarse. Añadir otro proveedor es implementar `EpsProvider` y registrarlo en `EPS_PROVIDERS`; la caché guarda la serie TTM y su divisa (`EpsCache.ttm`, `EpsCache.currency`).
- **Caché**: tabla `EpsCache` en la base de datos con los trimestres y el resumen de cada valor, refrescada como mucho una vez al día (`PER_CONFIG.cacheHours`); los precios semanales se guardan unas horas en memoria. Nada de llamadas a la SEC en cada carga de página.
- **Configuración** (`src/lib/perConfig.ts`): percentiles de «barata» (25) y «cara» (75), mínimo de puntos, puntuación de cada señal y peso en la recomendación. El peso también se cambia con la variable `PER_WEIGHT` (0 a 0,4; 0 desactiva el bloque).
- **Limitaciones**: el BPA es el contable (GAAP) de la SEC, así que un año con partidas extraordinarias distorsiona el PER (por ejemplo, Microsoft en 2018 por el impuesto de la reforma fiscal de EE. UU.). Compara cada acción solo con su propia historia, no con su sector. Un PER bajo no es una orden de compra.
- **Pruebas**: `npm test` (31 pruebas del cálculo y 5 de la integración con la recomendación, con el ejecutor integrado de Node). `npm run per:check -- MSFT AAPL` calcula el PER con datos reales y lo imprime por año y por periodo: para Microsoft, el PER de los últimos años se mueve sobre todo entre 28 y 38, con extremos de 22 y 41.

## Invitaciones y entrada al club

El administrador gestiona la entrada desde *Invitaciones*: invitaciones personales de un solo uso (con nombre, email opcional, rol y caducidad, compartidas como enlace `/registro?codigo=XXXX`), modo de entrada del código general (directo, con aprobación o desactivado), solicitudes pendientes de aprobar, cambio de rol y expulsión de miembros. Un usuario pendiente ve la pantalla `/pendiente` hasta que se le aprueba.

## Diseño

`docs/brief-claude-design.md` es un brief completo (usuarios, principios, mapa de pantallas con sus datos, inventario de componentes y restricciones técnicas) pensado para entregarlo a Claude Design o a un diseñador. Un sistema de diseño generado en Claude Design se puede traer al repositorio con `/design-sync`.

## Cotizaciones y datos

- Precios e histórico: endpoint público de Yahoo Finance, sin clave. Cripto y bolsa de EE. UU. en tiempo real; bolsas europeas con ~15 min de retraso. Caché de 60 s y refresco automático cada minuto.
- Mercado y ficha de cada criptomoneda: CoinGecko (sin clave). Sentimiento: alternative.me. Noticias cripto: RSS públicos de Cointelegraph, CoinDesk, Decrypt, Bitcoin Magazine y CriptoNoticias (en español) filtrados por moneda, más la búsqueda de noticias de Yahoo Finance por nombre.
- Noticias: buscador de Yahoo Finance por símbolo.
- Las operaciones en divisa distinta del euro guardan el tipo de cambio de cierre del día (`fxRate`); toda la cartera se valora en euros.
- Para sustituir la fuente de precios basta con cambiar `fetchQuote` y `searchSymbols` en `src/lib/prices.ts` (y `src/lib/stocks.ts` para histórico e índices).

## Estructura

- `prisma/schema.prisma` — familias, usuarios, aportaciones, operaciones (con divisa, cambio y entidad), cotizaciones, fotos de cartera y lista de seguimiento.
- `src/lib/portfolio.ts` — valoración de carteras y ranking. `src/lib/league.ts` — estadísticas. `src/lib/badges.ts` — logros y niveles. `src/lib/news.ts` — noticias.
- `src/lib/prices.ts`, `src/lib/stocks.ts`, `src/lib/technical.ts`, `src/lib/crypto.ts` — cotizaciones, histórico, indicadores técnicos y mercado cripto; `src/lib/cryptoProfile.ts` y `src/lib/cryptoNews.ts` — ficha y noticias por moneda; `src/lib/fmtPrice.ts` — decimales de los precios según su magnitud.
- `src/app/(app)/*` — páginas: inversiones (liga), operaciones, acciones, cripto, familia.
