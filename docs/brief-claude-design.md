# Brief de diseño · Finanzas Familia (liga de inversión familiar)

Documento pensado para entregarlo a **Claude Design** (claude.ai/design) o a cualquier diseñador. Describe qué es la aplicación, quién la usa, qué pantallas tiene, qué datos muestra cada una y qué restricciones técnicas hay, para que el diseño resultante se pueda llevar al código sin sorpresas.

## 1. Qué es

Una aplicación web privada para una familia que juega a invertir. Cada miembro recibe una paga mensual (100 € por defecto) y registra sus compras y ventas de acciones, ETF y criptomonedas. La app valora las carteras con cotizaciones en vivo, calcula la rentabilidad sobre lo aportado y convierte todo en una liga: ranking, estadísticas, logros, noticias de los valores de la familia y una "Recomendación del Club de inversión" (COMPRAR / MANTENER / VENDER) para cada acción y ETF, con análisis técnico completo.

No hay dinero real dentro de la app: es un registro y un juego educativo. No es una app bancaria.

## 2. Usuarios y tono

- **El padre/madre (administrador)**: crea la familia, reparte la paga, invita a los hijos, aprueba entradas, gestiona miembros. Quiere ver de un vistazo cómo va cada uno y enseñar a invertir con disciplina.
- **Los hijos (miembros)**: registran operaciones, miran su cartera, compiten por el ranking y los logros, consultan el análisis de un valor antes de comprar. Edad adolescente a joven adulto; usan sobre todo el móvil.
- **Tono**: cercano, claro y un poco lúdico (medallas, niveles, logros), pero serio con los números. Idioma: español de España. Formato de moneda: `1.234,56 €`; fechas `12/10/2026`.

## 3. Principios de diseño que pedimos

1. **Mobile first**, pero con un escritorio cómodo (tablas anchas con muchas columnas numéricas).
2. **Los números mandan**: tabulares, alineados a la derecha, verde para positivo y rojo para negativo, siempre con signo.
3. **Jerarquía clara entre juego y análisis**: la liga (ranking, logros, estadísticas) puede ser más visual y festiva; el análisis técnico y las fichas de recomendación deben parecer una herramienta profesional.
4. **Densidad media**: tarjetas con bordes suaves, tablas limpias, sin adornos que roben espacio a los datos.
5. **Estados vacíos cuidados**: una familia recién creada no tiene operaciones ni lista de seguimiento; cada pantalla necesita su estado vacío con la acción siguiente.
6. **Accesibilidad**: contraste AA, no depender solo del color (acompañar con signo o icono), objetivos táctiles de 44 px.

## 4. Estado visual actual (para que se pueda mejorar o sustituir)

- Fondo `#f8fafc`, texto `#0f172a`, tarjetas blancas con borde `#e2e8f0` y radio 12 px, sombra sutil.
- Color primario índigo `#4f46e5`; verde `#16a34a` y rojo `#dc2626` para variaciones; ámbar `#f59e0b` para MANTENER y avisos.
- Tipografía del sistema (Segoe UI / system-ui). Sin logotipo: solo el nombre "Finanzas Familia" con un emoji 💶.
- Navegación lateral fija en escritorio (240 px) y barra horizontal con scroll en móvil.
- Etiquetas de acción: COMPRAR (verde relleno), MANTENER (ámbar relleno), VENDER (rojo relleno).
- Emojis como iconos (🏆 🧾 📈 🧩 ₿ 👪 ✉️). Se agradece una propuesta de iconografía coherente.

## 5. Mapa de pantallas

Rutas y contenido real de cada una. Los nombres entre comillas son los textos actuales.

### 5.1 Acceso
- **/login**: email, contraseña, enlace a registro.
- **/registro**: dos modos, "Tengo un código" (código de invitación personal o código general de la familia) y "Crear familia". Si se llega con `?codigo=XXXX` se muestra una tarjeta de previsualización: para quién es la invitación, familia, si será administrador, si quedará pendiente de aprobación. Campos: nombre, email, contraseña.
- **/pendiente**: pantalla de espera "Solicitud pendiente" con botones Salir y Retirar solicitud.

### 5.2 🏆 Liga de inversión (`/inversiones`) — pantalla de inicio
- Cabecera: título, "Paga mensual: 100 € por persona", botón "Actualizar" con "Precios actualizados hace N s", botón "+ Operar".
- **Tarjetas de ranking** (una por miembro, la del usuario resaltada): medalla 🥇🥈🥉, nombre, etiqueta "Líder", rentabilidad grande (+1,75 %), valor y aportado, ganancia y efectivo, nivel ("Nivel 3 · Inversor"), barra de progreso de puntos y fila de iconos de logros.
- **Estadísticas de la liga**: rejilla de tarjetas con icono, etiqueta en mayúsculas, dato grande, "quién" y detalle. Ejemplos: Patrimonio de la liga, Mejor cartera, Farolillo rojo, Mayor ganancia en euros, Mejor valor, Peor valor, Mayor posición, Valor más popular, Más activo, Más diversificado, Más conservador, Mejor racha (30 días).
- **Evolución de la rentabilidad**: gráfico de líneas, una por miembro, eje Y en %.
- **Noticias de vuestros valores**: lista de titulares con fuente, antigüedad y símbolo.
- **Logros**: por miembro, rejilla de 12 insignias (icono, nombre, descripción); las no conseguidas con candado y atenuadas. Niveles: Novato, Aprendiz, Inversor, Estratega, Experto, Leyenda (30 puntos por nivel, 10 por logro).
- **Cartera de cada miembro**: tabla Activo · Uds. · Precio (con "medio" debajo) · Valor · Rent., etiqueta "cripto" cuando aplica, fila de efectivo.

### 5.3 🧾 Operaciones (`/operaciones`)
- Cuatro KPI: Valor de mi cartera, Rentabilidad, Efectivo disponible, Beneficio realizado.
- **Mis posiciones**: tabla Activo (con entidad/bróker) · Uds. · Precio · Coste medio · Invertido · Valor · Resultado (€ y %) · acciones "Análisis" y "Operar".
- **Registrar operación**: selector Comprar/Vender, buscador de activo con desplegable de resultados (símbolo, nombre, bolsa), al elegir uno se muestra "Cotiza en USD: 340,93 USD ≈ 304,96 €", cantidad, precio con selector de divisa (EUR/USD/GBP/CHF), comisión, fecha, entidad (bróker) con autocompletado. Aviso: si la compra supera el efectivo, la diferencia se anota como "aportación propia".
- **Mis operaciones**: tabla Fecha · Operación (etiqueta Compra/Venta, símbolo, entidad) · Precio · Importe en € y $ · Editar/Borrar. Al editar, la fila se convierte en formulario en línea.
- Bloques secundarios: "Aportaciones propias" (botón recalcular) y "Precio manual" (símbolo + precio).

### 5.4 📈 Acciones (`/acciones`) y 🧩 ETF (`/etf`) — misma plantilla
- Seis tarjetas de índices (IBEX 35, Euro Stoxx 50, DAX, S&P 500, Nasdaq, Dow Jones) con precio y variación del día.
- **Lista de seguimiento de la familia**: cabecera con contador, botón "Ranking del Club" y buscador "Seguir". Tabla: Valor (nombre, símbolo, bolsa, etiqueta "en cartera") · Precio (con equivalente en € si cotiza en otra divisa) · Hoy · **Club de inversión** (etiqueta COMPRAR/MANTENER/VENDER + puntuación, icono 📅 si hay resultados en 10 días) · 1 sem. · 1 mes · mini gráfica del último mes · Rango 52 semanas (barra con punto) · Mercado (Abierto/Cerrado) · Operar / Quitar.
- Banner cuando la lista está vacía con botón "Añadir 15 sugeridos".

### 5.5 Detalle de valor (`/acciones/SAN.MC`, `/etf/VWCE.DE`)
- Cabecera: nombre, símbolo y bolsa, botones ← volver, Ranking del Club, Operar.
- KPI: último precio con variación vs. cierre anterior; "Lectura técnica global" (🟢 Alcista / ⚪ Neutral / 🔴 Bajista con recuento de señales); 1 mes y YTD; 1 año y 1 semana.
- **Ficha "Recomendación del Club de inversión"** (la pieza más importante del producto):
  - Cabecera: `[SAN.MC] – Banco Santander, S.A. | Precio: 12,21 EUR | Fecha datos: 2026-10-12`; sector, beta, próximos resultados (o gestora y TER si es un fondo); botón "Copiar informe".
  - Línea de veredicto: etiqueta grande COMPRAR/MANTENER/VENDER, sesgo ("sesgo alcista / vigilar entrada"), Confianza (Alta/Media/Baja), Horizonte, "desde fecha (antes X)".
  - Tabla de bloques: Tendencia (30 %), Momentum (25 %), Volumen (20 %), Volatilidad/Estructura (25 %) con puntuación de −2 a +2 y lectura clave; fila Total ponderado con las reglas aplicadas.
  - Plan de operación (zona de entrada, stop loss con justificación, objetivo 1 y 2, ratio riesgo/beneficio, señal de invalidación); Tesis en 3 líneas; Riesgos principales.
  - "La empresa" (capitalización, PER, dividendo, empleados, país, web, descripción) o "El fondo" (gestora, categoría, TER, patrimonio, 10 principales posiciones, barras por sector).
  - "Qué dicen las noticias": tono global (favorable/desfavorable/neutral) y titulares con ▲ ▼ • y temas.
  - Historial de recomendaciones y aviso legal al pie.
- **Gráfico**: selector 3 m / 6 m / 1 a / 2 a / 5 a; panel de precio con medias 20/50/200, bandas de Bollinger sombreadas y líneas de soporte (verde) y resistencia (rojo); panel de volumen; panel RSI con líneas 30/70; panel MACD con histograma.
- **Señales**: lista de tarjetas con 🟢🔴⚪, título y explicación en una frase.
- **Niveles e indicadores**: tabla de dos columnas con unas 20 filas (resistencia, soporte, máximos/mínimos 52 semanas, medias, EMA, RSI, MACD, estocástico, ADX, Bollinger, ATR, volatilidad, máxima caída, volumen, OBV, Fibonacci, rentabilidades).
- Bloque "Cómo leerlo" con explicación de cada indicador.

### 5.6 Ranking del Club (`/acciones/ranking`, `/etf/ranking`)
- Dos tarjetas arriba: "Mejores oportunidades de compra" (verde) y "Reducir o salir" (rojo), cada una con etiqueta, ticker, puntuación, sesgo y plan resumido.
- Tabla completa: # · Ticker · Recomendación · Puntuación · desglose de bloques · Confianza · R/B · Desde · Resultados (o TER). Botón "Copiar resumen".

### 5.7 ₿ Cripto (`/cripto`)
- Cuatro KPI: Cripto de la familia (y % del patrimonio), Resultado en cripto, Bitcoin (precio y 24 h), Miedo y codicia (valor 0-100 con barra degradada rojo→amarillo→verde).
- Posiciones cripto de la familia: por miembro y por activo.
- Mercado top 25: # · Moneda (logo, nombre, símbolo, etiqueta "en cartera") · Precio · 24 h · 7 d · mini gráfica 7 días · Capitalización · Desde máximo · botón Operar.

### 5.8 👪 Familia (`/familia`)
- Tabla de miembros (nombre, email, rol, operaciones, aportado). Tarjeta "Entrada de nuevos miembros" con botón a Invitaciones y código general.
- Solo administrador: Paga mensual (importe), Repartir la paga del mes (selector de mes), Aportación manual (miembro, importe, fecha, nota).
- Historial de aportaciones con edición en línea y borrado.

### 5.9 ✉️ Invitaciones (`/invitaciones`, solo administrador)
- Banner ámbar de "Solicitudes pendientes de aprobación" con Aprobar / Rechazar.
- Formulario "Nueva invitación personal": nombre, email, rol, caducidad en días, nota.
- "Modo de entrada": tres opciones (Entrada directa / Con aprobación / Solo invitación personal).
- "Código general": código grande en monoespaciada, Copiar enlace, Regenerar código.
- Tabla de invitaciones: Para · Código · Estado (pendiente/usada/caducada/anulada) · Rol · Caduca · Creada · acciones (Copiar enlace, Anular, Reactivar, Borrar).
- Tabla de miembros con selector de rol y "Expulsar" con confirmación.

## 6. Inventario de componentes a diseñar

- Navegación lateral / barra móvil con usuario y rol; estado activo.
- Tarjeta KPI (etiqueta, dato grande, pista, tono bueno/malo/neutral).
- Tarjeta de miembro en el ranking (medalla, rentabilidad, nivel, progreso, logros).
- Tarjeta de estadística (icono, etiqueta, dato, quién, detalle).
- Insignia de logro (conseguida / bloqueada).
- Etiqueta de acción COMPRAR / MANTENER / VENDER (tamaño normal y pequeño) y etiquetas de estado (en cartera, cripto, pendiente, usada…).
- Tablas numéricas densas con filas expandibles a formulario (edición en línea).
- Formularios: inputs, select, radio, date, number con divisa, buscador con desplegable de resultados, datalist de entidades.
- Botones primario / secundario / peligro, botón con confirmación, botón "Copiar" con estado "✓ Copiado".
- Gráficos: líneas (evolución), compuesto de precio + bandas + volumen + RSI + MACD, mini gráficas (sparkline), barras horizontales de sectores, barra de miedo y codicia, barra de rango 52 semanas.
- Banners de aviso (ámbar) y de error (rojo), estados vacíos, pantalla de espera.
- Ficha "Recomendación del Club" como bloque destacado con borde índigo.

## 7. Restricciones técnicas

- Next.js 15 (App Router) + React 19 + **Tailwind CSS 4**: los estilos se expresan como clases utilitarias; un sistema de tokens (colores, radios, tipografías, espaciados) en variables CSS se integra bien en `src/app/globals.css`.
- Gráficos con **Recharts**: colores y grosores configurables, pero la geometría es la de la librería.
- Sin backend de imágenes: iconos como SVG en línea o una librería (p. ej. Lucide).
- Los textos son largos en algunos sitios (explicaciones de señales, tesis): dejar espacio para dos o tres líneas.
- Debe funcionar en modo claro; el modo oscuro es deseable pero no obligatorio.

## 8. Cómo usar este brief con Claude Design

1. Entra en **claude.ai/design** y crea un proyecto nuevo (por ejemplo "Finanzas Familia").
2. Adjunta este archivo (`docs/brief-claude-design.md`) y, si quieres, capturas de las pantallas actuales (abre la app en http://localhost:3005 y haz capturas de Liga, Operaciones, Acciones, detalle de un valor y Cripto).
3. Pide primero el **sistema de diseño** (paleta, tipografía, espaciado, botones, etiquetas, tarjetas, tablas) y después las **pantallas** en el orden del apartado 5, empezando por la Liga, el detalle de valor y Operaciones, que son las tres más usadas.
4. Pide siempre versión móvil y escritorio de cada pantalla, y los estados vacíos.
5. Cuando Claude Design genere un sistema de diseño, se puede traer de vuelta al proyecto con el comando `/design-sync` de Claude Code, que sincroniza la librería de componentes con la carpeta `src/components`. Las pantallas se trasladan después al código a partir de las capturas y especificaciones.

## 9. Preguntas abiertas para el diseñador

- ¿Logotipo y nombre definitivos? (Hoy "Finanzas Familia"; el usuario habla de "Club de inversión".)
- ¿Una paleta más "club" (verde bosque, dorado, azul marino) o mantener el índigo actual?
- ¿Cómo mostrar al jugador que va último sin que resulte humillante para un adolescente?
- ¿Ficha de recomendación como tarjeta larga (actual) o como panel lateral/modal desde la tabla?
