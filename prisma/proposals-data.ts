/**
 * Las 20 propuestas del club para el repositorio. Texto neutro (sin meses, años ni referencias a periodos), riesgo
 * etiquetado, una nota de «qué investigar» por valor y la lección con la estructura del club: idea, opciones, qué
 * investigar, idea clave y cómo decidir. Todos los valores cotizan en Yahoo Finance y las materias primas están en el
 * catálogo del club. Las pruebas (src/lib/proposals.test.ts) comprueban que cumplen la normativa.
 */
import type { ProposalTheme } from "../src/lib/proposals";

export type SeedOption = { symbol: string; name: string; kind: "STOCK" | "ETF" | "CRYPTO" | "COMMODITY"; note: string };
export type SeedProposal = {
  slug: string;
  title: string;
  theme: ProposalTheme;
  risk: 1 | 2 | 3 | 4 | 5;
  minChoices: number;
  maxChoices: number;
  lesson: string;
  options: SeedOption[];
};

const AVISO = "*Material educativo del club: no es asesoramiento financiero personalizado. Decide según tu perfil de riesgo y no inviertas dinero que puedas necesitar a corto plazo.*";

export const PROPOSALS: SeedProposal[] = [
  // 1 ---------------------------------------------------------------
  {
    slug: "nucleo-global-bajo-coste",
    title: "Núcleo global de bajo coste",
    theme: "Núcleo global",
    risk: 2,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "VWCE.DE", name: "Vanguard FTSE All-World (acumulación)", kind: "ETF", note: "Compara su coste anual (TER) y su número de empresas con el de un fondo MSCI World. ¿Incluye mercados emergentes? ¿Cuánto pesa Estados Unidos en la cartera del fondo?" },
      { symbol: "IWDA.AS", name: "iShares Core MSCI World (acumulación)", kind: "ETF", note: "Solo países desarrollados. Mira el peso de sus diez mayores posiciones y del sector tecnológico, y compáralo con el fondo all-world." },
      { symbol: "SXR8.DE", name: "iShares Core S&P 500 (acumulación)", kind: "ETF", note: "500 grandes empresas de EE. UU. Pregúntate si concentrar todo en un solo país es una ventaja o un riesgo, y qué porcentaje del fondo son las diez mayores." },
      { symbol: "XDWD.DE", name: "Xtrackers MSCI World (acumulación)", kind: "ETF", note: "Replica el mismo índice que el iShares MSCI World con otro gestor. Compara TER, tamaño del fondo y tipo de réplica: ¿qué diferencia real hay entre dos fondos del mismo índice?" },
    ],
    lesson: `## La idea
La base de casi cualquier cartera sensata es un fondo cotizado (ETF) que compre cientos o miles de empresas a la vez y cobre muy poco por hacerlo. Un ETF global te da diversificación inmediata: si una empresa o un país va mal, el resto compensa. No intenta ganar al mercado, intenta **ser el mercado** con el menor coste posible.

## Las opciones
- **VWCE**: miles de empresas de países desarrollados y emergentes en un solo producto.
- **IWDA**: grandes y medianas empresas de países desarrollados.
- **SXR8**: las 500 mayores empresas de EE. UU.
- **XDWD**: el mismo índice que IWDA con otro gestor, útil para comparar costes.

## Qué investigar antes de decidir
1. Abre la ficha de cada fondo: gestora, **TER** (coste anual) y patrimonio. Un TER bajo importa porque se paga todos los años.
2. Mira las diez mayores posiciones y los sectores: ¿cuánto pesa la tecnología?
3. Comprueba si es de **acumulación** (reinvierte los dividendos) o de distribución (los paga).
4. Revisa la Recomendación del Club: un fondo bueno puede estar en mal momento técnico.

> **Idea clave:** diversificar barato es lo único casi gratuito en inversión; las comisiones, en cambio, restan rentabilidad con seguridad.

## Cómo decidir
Elige uno, dos o tres fondos y explica por qué. Piensa en el horizonte: un fondo de renta variable global se plantea a muchos años, no para dinero que vayas a necesitar pronto. Justifica el reparto con datos (coste, composición, riesgo de concentración) y di qué te haría cambiar de idea.

| Opción | Riesgo | Horizonte |
|---|---|---|
| Global todo el mundo | Medio-bajo | Largo plazo |
| Países desarrollados | Medio-bajo | Largo plazo |
| Solo EE. UU. | Medio | Largo plazo |

${AVISO}`,
  },
  // 2 ---------------------------------------------------------------
  {
    slug: "dividendos-de-calidad",
    title: "Dividendos de calidad",
    theme: "Dividendos",
    risk: 2,
    minChoices: 2,
    maxChoices: 4,
    options: [
      { symbol: "KO", name: "Coca-Cola", kind: "STOCK", note: "Mira desde cuándo sube su dividendo, qué porcentaje del beneficio reparte (payout) y cuánto depende de unos pocos mercados y marcas." },
      { symbol: "PEP", name: "PepsiCo", kind: "STOCK", note: "Bebidas y aperitivos. Compara su PER y su dividendo con los de Coca-Cola: ¿qué aporta la división de alimentación?" },
      { symbol: "JNJ", name: "Johnson & Johnson", kind: "STOCK", note: "Salud diversificada. Revisa los litigios abiertos y la dependencia de la división farmacéutica, y cómo ha cambiado su perímetro de negocio." },
      { symbol: "PG", name: "Procter & Gamble", kind: "STOCK", note: "Marcas de consumo diario. Investiga su poder de fijar precios y si ha podido trasladar la inflación a sus clientes." },
      { symbol: "MCD", name: "McDonald's", kind: "STOCK", note: "Gran parte de su beneficio son alquileres y royalties de franquicias. Mira su deuda y qué ocurre con el dividendo si bajan las ventas." },
      { symbol: "VHYL.AS", name: "Vanguard FTSE All-World High Dividend Yield", kind: "ETF", note: "Cesta global de empresas con dividendo alto. Compara su rentabilidad por dividendo y su TER con las de una sola acción y revisa los sectores que más pesan." },
    ],
    lesson: `## La idea
Una acción que reparte dividendo te paga por esperar. Pero un dividendo alto no es siempre bueno: a veces el precio ha caído porque el negocio empeora y el dividendo está en peligro. La clave es buscar empresas con **beneficios estables**, un reparto que puedan sostener y un historial de aumentos.

## Las opciones
- **KO, PEP, PG**: consumo diario, ventas muy estables.
- **JNJ**: salud, negocio defensivo y diversificado.
- **MCD**: franquicias con ingresos recurrentes.
- **VHYL**: una cesta global de dividendos para repartir el riesgo de elegir mal una empresa.

## Qué investigar antes de decidir
1. En la ficha, mira el **dividendo** y el **PER**. Un PER muy bajo con dividendo muy alto es una señal de alarma, no de oportunidad.
2. Calcula el **payout**: qué parte del beneficio se va en dividendos. Si se acerca al 100 %, no hay margen.
3. Comprueba cuántas veces ha subido el dividendo y si alguna vez lo ha recortado.
4. Mira la deuda: pagar dividendo con deuda es insostenible.

> **Idea clave:** el dividendo es la consecuencia de un buen negocio, no el motivo para comprarlo.

## Cómo decidir
Elige entre dos y cuatro opciones y reparte el importe. Explica si prefieres empresas individuales o la cesta, qué dividendo esperas cobrar y qué noticia o dato te haría vender. Recuerda que las acciones estadounidenses cotizan en dólares: el cambio con el euro también cuenta.

${AVISO}`,
  },
  // 3 ---------------------------------------------------------------
  {
    slug: "gigantes-tecnologicos",
    title: "Gigantes tecnológicos",
    theme: "Tecnología",
    risk: 3,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "AAPL", name: "Apple", kind: "STOCK", note: "Mira qué parte de sus ingresos son servicios (más recurrentes) frente a producto, y su dependencia de un solo teléfono." },
      { symbol: "MSFT", name: "Microsoft", kind: "STOCK", note: "Nube, software y juegos. Compara el crecimiento de su división de nube con el resto y revisa su PER frente a su propia historia." },
      { symbol: "GOOGL", name: "Alphabet (Google)", kind: "STOCK", note: "Casi todo el beneficio viene de la publicidad. Investiga la amenaza de la inteligencia artificial a la búsqueda y los procesos regulatorios abiertos." },
      { symbol: "AMZN", name: "Amazon", kind: "STOCK", note: "Comercio y nube. Separa mentalmente los dos negocios: ¿cuál genera el beneficio y cuál el crecimiento?" },
      { symbol: "NVDA", name: "NVIDIA", kind: "STOCK", note: "Chips para inteligencia artificial. Pregúntate qué pasa si sus grandes clientes fabrican sus propios chips y cuánto de la valoración es expectativa." },
      { symbol: "META", name: "Meta Platforms", kind: "STOCK", note: "Redes sociales y publicidad. Mira cuánto gasta en proyectos de futuro y si ese gasto ha dado resultados." },
    ],
    lesson: `## La idea
Un puñado de empresas tecnológicas pesa muchísimo en las bolsas mundiales. Han crecido por tener productos que usa media humanidad, márgenes altos y mucha caja. A cambio, su cotización exige crecer mucho: si defraudan, **caen con fuerza**. Esta cartera sirve para aprender a valorar empresas excelentes sin pagar cualquier precio.

## Las opciones
- **AAPL, MSFT**: tecnología de consumo y de empresa con negocios muy rentables.
- **GOOGL, META**: publicidad digital como motor de beneficios.
- **AMZN**: comercio electrónico y nube.
- **NVDA**: el proveedor de chips de la inteligencia artificial.

## Qué investigar antes de decidir
1. En la ficha de cada una, abre el **PER histórico**: ¿está cara o barata frente a su propia historia?
2. Mira de dónde salen los beneficios: ¿un solo producto o varios?
3. Revisa los riesgos: regulación, competencia y dependencia de pocos clientes.
4. Compara la Recomendación del Club con las noticias de la ficha.

> **Idea clave:** una gran empresa no es automáticamente una gran inversión; importa también el precio que pagas por ella.

## Cómo decidir
Elige una, dos o tres y no las pongas todas a la vez: son valores muy parecidos entre sí y se mueven juntos cuando cambia el ánimo hacia la tecnología. Argumenta tu elección con un dato de negocio, uno de valoración y un riesgo que hayas identificado.

${AVISO}`,
  },
  // 4 ---------------------------------------------------------------
  {
    slug: "inteligencia-artificial-semiconductores",
    title: "Inteligencia artificial y semiconductores",
    theme: "Tecnología",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "NVDA", name: "NVIDIA", kind: "STOCK", note: "Líder en procesadores para inteligencia artificial. Investiga su cuota de mercado, sus márgenes y la concentración de sus ventas en pocos clientes." },
      { symbol: "AVGO", name: "Broadcom", kind: "STOCK", note: "Chips a medida y software. Mira cuánto de su crecimiento depende de acuerdos con grandes tecnológicas y su nivel de deuda." },
      { symbol: "TSM", name: "Taiwan Semiconductor (TSMC)", kind: "STOCK", note: "Fabrica los chips de casi todos. Es clave entender el riesgo geopolítico de su ubicación y sus inversiones en nuevas fábricas." },
      { symbol: "ASML.AS", name: "ASML", kind: "STOCK", note: "Única fabricante de las máquinas de litografía más avanzadas. Revisa su cartera de pedidos y las restricciones de exportación a China." },
      { symbol: "AMD", name: "AMD", kind: "STOCK", note: "Alternativa en procesadores y chips de IA. Compara su cuota y su valoración con las de NVIDIA." },
      { symbol: "QDVE.DE", name: "iShares S&P 500 Tecnología de la Información", kind: "ETF", note: "Cesta de tecnológicas del S&P 500. Mira el peso de las tres mayores posiciones: ¿cuánto se parece a comprar solo tres acciones?" },
    ],
    lesson: `## La idea
Cada aplicación de inteligencia artificial necesita chips, fábricas que los produzcan y máquinas que fabriquen las fábricas. Invertir en **toda la cadena de los semiconductores** es apostar a que la demanda de computación seguirá creciendo. Es un sector con enorme potencial, pero **muy cíclico y volátil**: los precios ya descuentan muchas expectativas.

## Las opciones
- **NVDA, AMD, AVGO**: diseñan los chips.
- **TSM**: los fabrica.
- **ASML**: vende las máquinas imprescindibles para fabricarlos.
- **QDVE**: una cesta de tecnológicas para no depender de una sola empresa.

## Qué investigar antes de decidir
1. Identifica en qué eslabón de la cadena está cada empresa y qué ocurre si los clientes recortan su gasto.
2. En la ficha, mira el **PER histórico** y la volatilidad anualizada: ¿cuánto ha caído cada una en sus peores etapas?
3. Lee sobre riesgos geopolíticos y restricciones de exportación.
4. Compara lo que dice la Recomendación del Club con el sentimiento de las noticias.

> **Idea clave:** en los sectores de moda, el riesgo no es que la tecnología falle, sino pagar por adelantado el éxito de muchos años futuros.

## Cómo decidir
Elige hasta tres. Piensa en cuánto de tu cartera total pondrías aquí: un sector así, por muy prometedor que sea, no debería ser tu única apuesta. Explica qué eslabón crees más protegido de la competencia y qué dato te haría reducir posición.

${AVISO}`,
  },
  // 5 ---------------------------------------------------------------
  {
    slug: "ibex-35-grandes-de-la-bolsa-espanola",
    title: "IBEX 35: los grandes de la bolsa española",
    theme: "España",
    risk: 3,
    minChoices: 2,
    maxChoices: 4,
    options: [
      { symbol: "SAN.MC", name: "Banco Santander", kind: "STOCK", note: "Negocio muy internacional. Mira qué porcentaje del beneficio sale de cada país y cómo le afectan los tipos de interés." },
      { symbol: "ITX.MC", name: "Inditex", kind: "STOCK", note: "Moda de rotación rápida. Investiga sus márgenes, su caja y por qué ha crecido sin endeudarse." },
      { symbol: "IBE.MC", name: "Iberdrola", kind: "STOCK", note: "Energía regulada y renovable. Revisa su deuda, sus inversiones en redes y su dependencia de decisiones regulatorias." },
      { symbol: "BBVA.MC", name: "BBVA", kind: "STOCK", note: "Banca con fuerte presencia en México y Turquía. Pregúntate qué riesgos añade el tipo de cambio de esas monedas." },
      { symbol: "TEF.MC", name: "Telefónica", kind: "STOCK", note: "Telecomunicaciones con mucha deuda. Compara su dividendo con el flujo de caja que genera de verdad." },
      { symbol: "REP.MC", name: "Repsol", kind: "STOCK", note: "Petróleo, gas y refino. Mira cómo se mueve con el precio del crudo y su plan de transición energética." },
      { symbol: "AMS.MC", name: "Amadeus", kind: "STOCK", note: "Tecnología para el sector viajes. Estudia su dependencia del tráfico aéreo y su historial de ingresos recurrentes." },
    ],
    lesson: `## La idea
El IBEX 35 reúne las mayores empresas cotizadas de España. Tiene mucho peso de **banca, energía y telecomunicaciones** y bastante menos de tecnología que otros índices. Conocer sus grandes valores es un buen punto de partida para aprender a leer una bolsa nacional y a ver cuánto negocio de cada empresa depende realmente de España.

## Las opciones
- **SAN, BBVA**: bancos con gran negocio fuera de España.
- **IBE**: energía eléctrica y renovables.
- **ITX**: moda, uno de los grandes éxitos empresariales españoles.
- **TEF**: telecomunicaciones.
- **REP**: energía fósil y refino.
- **AMS**: tecnología para viajes.

## Qué investigar antes de decidir
1. En cada ficha, mira el **dividendo**, el PER y la fecha de próximos resultados.
2. Averigua en qué países gana dinero cada empresa: muchas son más internacionales de lo que parece.
3. Revisa la deuda en las empresas con mucha inversión (energía y telecomunicaciones).
4. Compara la Recomendación del Club entre sectores distintos.

> **Idea clave:** comprar en tu propio país da familiaridad, pero también concentra el riesgo: tu sueldo, tu casa y tu inversión dependen de la misma economía.

## Cómo decidir
Elige entre dos y cuatro valores de sectores distintos. Explica qué aporta cada uno a tu cartera (dividendo, crecimiento, estabilidad) y qué evento haría que cambiases de opinión.

${AVISO}`,
  },
  // 6 ---------------------------------------------------------------
  {
    slug: "banca-espanola-y-tipos-de-interes",
    title: "Banca española y tipos de interés",
    theme: "Sectores",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "SAN.MC", name: "Banco Santander", kind: "STOCK", note: "Gran diversificación geográfica. Compara cuánto beneficio aporta cada región y la sensibilidad de su margen a los tipos." },
      { symbol: "BBVA.MC", name: "BBVA", kind: "STOCK", note: "Muy expuesto a México. Estudia el riesgo de cambio y la calidad de su cartera de préstamos." },
      { symbol: "CABK.MC", name: "CaixaBank", kind: "STOCK", note: "Banca minorista centrada en España. Mira su cuota de hipotecas y su fortaleza de capital." },
      { symbol: "SAB.MC", name: "Banco Sabadell", kind: "STOCK", note: "Banca más pequeña y más sensible al ciclo. Investiga operaciones corporativas pasadas y su rentabilidad sobre el capital." },
      { symbol: "BKT.MC", name: "Bankinter", kind: "STOCK", note: "Banca con fama de gestión prudente. Compara su morosidad y su rentabilidad con las de los grandes bancos." },
      { symbol: "UNI.MC", name: "Unicaja Banco", kind: "STOCK", note: "Banca regional. Revisa su volumen de negocio, su dividendo y su valoración frente al valor en libros." },
    ],
    lesson: `## La idea
Un banco gana dinero con la diferencia entre lo que cobra por prestar y lo que paga por captar depósitos. Cuando los tipos de interés suben, ese margen suele **mejorar**; cuando bajan o aumentan los impagos, empeora. Por eso la banca es un sector que se entiende mejor mirando el ciclo económico que los resultados de un solo periodo.

## Las opciones
- **SAN, BBVA**: bancos grandes e internacionales.
- **CABK**: banca minorista con gran cuota en España.
- **SAB, BKT, UNI**: bancos medianos y más pequeños con perfiles muy distintos.

## Qué investigar antes de decidir
1. Busca el **valor en libros** y compáralo con el precio: la banca suele valorarse por ese múltiplo además del PER.
2. Revisa la **morosidad** y el capital: miden si el banco aguantaría una crisis.
3. Mira el dividendo y la recompra de acciones: ¿es sostenible?
4. Pregúntate qué le pasaría al sector con tipos mucho más bajos.

> **Idea clave:** un banco es un negocio apalancado: las buenas épocas se amplifican, pero las malas también.

## Cómo decidir
Elige entre uno y tres bancos. Explica si buscas más estabilidad (los grandes) o más recorrido (los medianos) y qué indicador vigilarías para saber que tu idea falla. Evita poner los tres en la misma proporción por inercia: justifica cada reparto.

${AVISO}`,
  },
  // 7 ---------------------------------------------------------------
  {
    slug: "energia-limpia-y-redes-electricas",
    title: "Energía limpia y redes eléctricas",
    theme: "Sectores",
    risk: 3,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "IBE.MC", name: "Iberdrola", kind: "STOCK", note: "Renovables y redes. Revisa su plan de inversión, su deuda y qué parte de sus ingresos está regulada." },
      { symbol: "RED.MC", name: "Redeia (Red Eléctrica)", kind: "STOCK", note: "Opera la red de alta tensión en España. Entiende cómo se fija su retribución y cuánto depende de la regulación." },
      { symbol: "ENEL.MI", name: "Enel", kind: "STOCK", note: "Gran eléctrica italiana con mucha presencia en renovables. Compara su dividendo y su deuda con los de Iberdrola." },
      { symbol: "NEE", name: "NextEra Energy", kind: "STOCK", note: "Eléctrica regulada y gran promotora de renovables en EE. UU. Mira cómo le afectan los tipos de interés, por su alta deuda." },
      { symbol: "EDPR.LS", name: "EDP Renováveis", kind: "STOCK", note: "Pura renovable. Es más sensible a los costes de financiación y a los precios de la electricidad." },
      { symbol: "NTGY.MC", name: "Naturgy", kind: "STOCK", note: "Gas y electricidad. Investiga su estructura de accionistas, el dividendo y la dependencia del precio del gas." },
    ],
    lesson: `## La idea
La electrificación (coches eléctricos, centros de datos, calefacción con bomba de calor) exige **más producción y más redes**. Las empresas del sector tienen dos caras: unas ingresos regulados y predecibles, muy parecidos a un bono, y otras el riesgo de proyectos grandes financiados con deuda. Esta cartera sirve para entender cómo los tipos de interés y la regulación dominan a las eléctricas.

## Las opciones
- **RED**: transporte de electricidad, negocio regulado.
- **IBE, ENEL, NEE**: eléctricas integradas con renovables y redes.
- **EDPR**: renovables puras, más sensibles al coste de la deuda.
- **NTGY**: mezcla de gas y electricidad.

## Qué investigar antes de decidir
1. Abre el **dividendo** y la **deuda** de cada una: son empresas intensivas en capital.
2. Averigua qué parte de los ingresos es regulada y qué parte depende del precio de la electricidad.
3. Mira cómo se comportan en las fases de tipos de interés altos: suelen sufrir.
4. Lee las noticias sobre cambios regulatorios y proyectos en marcha.

> **Idea clave:** las eléctricas se comportan como un híbrido entre acción y bono: reparten dividendo, pero reaccionan mucho a los tipos de interés.

## Cómo decidir
Elige una, dos o tres. Explica si buscas estabilidad (redes) o crecimiento (renovables puras) y cómo te afectaría una subida de tipos. Defiende el reparto con la deuda y el dividendo, no solo con la historia de la transición energética.

${AVISO}`,
  },
  // 8 ---------------------------------------------------------------
  {
    slug: "salud-defensiva-y-envejecimiento",
    title: "Salud: negocio defensivo y envejecimiento",
    theme: "Sectores",
    risk: 3,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "JNJ", name: "Johnson & Johnson", kind: "STOCK", note: "Farmacia y tecnología médica. Revisa los litigios pendientes y el efecto de la caducidad de patentes." },
      { symbol: "LLY", name: "Eli Lilly", kind: "STOCK", note: "Muy ligada a fármacos de gran demanda. Pregúntate cuánto de su valoración descuenta ya y qué riesgo hay si la competencia le alcanza." },
      { symbol: "NVO", name: "Novo Nordisk", kind: "STOCK", note: "Diabetes y obesidad. Compara su crecimiento con el de Eli Lilly y estudia el riesgo de concentrar ventas en pocos productos." },
      { symbol: "UNH", name: "UnitedHealth", kind: "STOCK", note: "Seguros y servicios de salud en EE. UU. Revisa el riesgo regulatorio y la evolución de los costes médicos." },
      { symbol: "ABT", name: "Abbott Laboratories", kind: "STOCK", note: "Dispositivos médicos, diagnóstico y nutrición. Es un negocio más diversificado: mira qué división aporta más." },
      { symbol: "MDT", name: "Medtronic", kind: "STOCK", note: "Tecnología médica. Compara su crecimiento y su dividendo con los de las farmacéuticas." },
    ],
    lesson: `## La idea
La demanda de salud no desaparece en las crisis y crece con el envejecimiento de la población. Por eso el sector se considera **defensivo**. Pero dentro de él hay mundos muy distintos: farmacéuticas que dependen de patentes y de fármacos estrella, empresas de dispositivos médicos con ventas más estables y aseguradoras con riesgo regulatorio.

## Las opciones
- **JNJ, ABT, MDT**: grandes diversificadas y estables.
- **LLY, NVO**: farmacéuticas con productos muy demandados y valoración exigente.
- **UNH**: salud como servicio y seguro.

## Qué investigar antes de decidir
1. En cada ficha, mira el **PER histórico**: algunas de estas empresas han cotizado muy por encima de su media.
2. Averigua cuándo caducan las patentes más importantes de cada farmacéutica.
3. Revisa los riesgos políticos: precios de medicamentos y regulación de los seguros.
4. Compara la estabilidad de ingresos entre dispositivos médicos y fármacos.

> **Idea clave:** defensivo no significa sin riesgo: una patente que caduca o una regulación nueva pueden hundir una acción de un sector tranquilo.

## Cómo decidir
Elige una, dos o tres. Explica si buscas estabilidad o crecimiento y cómo mezclarías ambas. Indica qué dato de negocio vigilarías para confirmar tu tesis.

${AVISO}`,
  },
  // 9 ---------------------------------------------------------------
  {
    slug: "consumo-basico-lo-que-se-compra-siempre",
    title: "Consumo básico: lo que se compra siempre",
    theme: "Sectores",
    risk: 2,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "WMT", name: "Walmart", kind: "STOCK", note: "Mayor distribuidor del mundo. Estudia sus márgenes ajustados, su comercio electrónico y su capacidad de ganar cuota cuando el consumidor ahorra." },
      { symbol: "COST", name: "Costco", kind: "STOCK", note: "Vende por suscripción de socios. Observa por qué cotiza con un PER muy alto y qué lo justifica." },
      { symbol: "NESN.SW", name: "Nestlé", kind: "STOCK", note: "Alimentación global, cotiza en francos suizos. Investiga el efecto del tipo de cambio y su capacidad de subir precios." },
      { symbol: "PG", name: "Procter & Gamble", kind: "STOCK", note: "Marcas de higiene y hogar. Compara su crecimiento orgánico con el de sus competidoras." },
      { symbol: "PEP", name: "PepsiCo", kind: "STOCK", note: "Aperitivos y bebidas. Mira el peso de cada división y los costes de materias primas." },
    ],
    lesson: `## La idea
Las familias dejan de viajar o de cambiar de coche en una crisis, pero **siguen comprando comida, detergente y papel higiénico**. Las empresas de consumo básico tienen ventas estables, márgenes previsibles y suelen pagar dividendo. A cambio, crecen despacio y, como todo el mundo las conoce, **rara vez están baratas**.

## Las opciones
- **WMT, COST**: distribuidores que ganan por volumen y eficiencia.
- **NESN, PG, PEP**: fabricantes de marcas que ganan por su poder de fijar precios.

## Qué investigar antes de decidir
1. Compara el **PER** de cada una con su propia historia en la ficha: estas empresas rara vez cotizan baratas.
2. Mira los **márgenes**: un distribuidor gana poco por venta y mucho por volumen; una marca gana más por producto.
3. Estudia cuánto han podido subir precios sin perder clientes.
4. Comprueba el efecto del cambio de divisa en las que no cotizan en euros.

> **Idea clave:** la estabilidad también tiene precio: pagar demasiado por un negocio aburrido puede dar una rentabilidad aburrida.

## Cómo decidir
Elige entre una y tres. Justifica si prefieres un distribuidor o un fabricante de marcas, y explica qué te haría pensar que una de ellas ha dejado de ser tan defensiva como parece.

${AVISO}`,
  },
  // 10 --------------------------------------------------------------
  {
    slug: "lujo-y-marcas-europeas",
    title: "Lujo y marcas europeas",
    theme: "Sectores",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "MC.PA", name: "LVMH", kind: "STOCK", note: "Mayor grupo de lujo. Mira el peso de cada división y su dependencia de los clientes asiáticos." },
      { symbol: "RMS.PA", name: "Hermès", kind: "STOCK", note: "Exclusividad y escasez como estrategia. Investiga por qué cotiza con un PER tan alto y qué haría que dejase de justificarse." },
      { symbol: "RACE", name: "Ferrari", kind: "STOCK", note: "Un lujo con lista de espera. Estudia su política de producción limitada y su transición al coche eléctrico." },
      { symbol: "OR.PA", name: "L'Oréal", kind: "STOCK", note: "Cosmética, un lujo más asequible y recurrente. Compara su estabilidad con la de los grupos de moda." },
      { symbol: "ITX.MC", name: "Inditex", kind: "STOCK", note: "No es lujo, pero comparte el éxito de las marcas. Contrasta su modelo de rotación rápida con el de las marcas exclusivas." },
      { symbol: "KER.PA", name: "Kering", kind: "STOCK", note: "Grupo de lujo con marcas en reposicionamiento. Observa qué ocurre cuando una marca pierde fuerza." },
    ],
    lesson: `## La idea
El lujo vende **marca, escasez y estatus**. Cuando funciona, las empresas tienen márgenes enormes y clientes que no miran el precio. Pero es un sector **cíclico**: depende del ánimo del consumidor de alto poder adquisitivo y de países concretos, y las marcas pueden pasar de moda.

## Las opciones
- **MC, KER**: grandes grupos con muchas marcas.
- **RMS**: la más exclusiva y la más cara.
- **RACE**: lujo industrial con producción limitada.
- **OR**: belleza, el escalón más accesible.
- **ITX**: referencia de moda masiva, para contrastar.

## Qué investigar antes de decidir
1. Compara el **PER histórico** de cada una: las marcas más exclusivas suelen cotizar muy caras.
2. Averigua en qué regiones se vende más y qué ocurre si una se frena.
3. Mira el crecimiento orgánico y los márgenes: miden la fuerza de la marca.
4. Lee qué marcas están creciendo y cuáles han perdido atractivo.

> **Idea clave:** en el lujo, el precio de la acción suele reflejar la perfección: cualquier tropiezo se castiga mucho.

## Cómo decidir
Elige entre una y tres. Decide si prefieres la marca más sólida y cara o una que parezca más barata pero con más incertidumbre, y explica cuánto crees que pesan en tu cartera los ciclos de consumo.

${AVISO}`,
  },
  // 11 --------------------------------------------------------------
  {
    slug: "europa-o-estados-unidos",
    title: "Europa o Estados Unidos: ¿dónde invertir?",
    theme: "Geografía",
    risk: 3,
    minChoices: 1,
    maxChoices: 2,
    options: [
      { symbol: "EXSA.DE", name: "iShares STOXX Europe 600", kind: "ETF", note: "600 empresas europeas de distintos tamaños. Mira los sectores que más pesan (finanzas, industria, salud) y compáralos con los de EE. UU." },
      { symbol: "SMEA.MI", name: "iShares Core MSCI Europe (acumulación)", kind: "ETF", note: "Grandes y medianas empresas europeas, con acumulación. Compara su TER y su composición con la del STOXX 600." },
      { symbol: "SXR8.DE", name: "iShares Core S&P 500 (acumulación)", kind: "ETF", note: "Las 500 mayores empresas de EE. UU. Observa su peso en tecnología y su valoración frente a Europa." },
      { symbol: "SXRV.DE", name: "iShares Nasdaq 100 (acumulación)", kind: "ETF", note: "Las 100 mayores no financieras del Nasdaq, muy tecnológicas. Compara su volatilidad con la del S&P 500." },
    ],
    lesson: `## La idea
Las bolsas de Europa y de Estados Unidos han tenido trayectorias muy distintas. EE. UU. pesa más en tecnología y suele cotizar con **valoraciones más altas**; Europa tiene más banca, industria y consumo y cotiza con descuento. ¿Es el descuento una oportunidad o el castigo por crecer menos? Esta cartera te obliga a decidirlo con datos.

## Las opciones
- **EXSA, SMEA**: dos formas de comprar Europa.
- **SXR8**: el mercado estadounidense amplio.
- **SXRV**: el mercado estadounidense más tecnológico.

## Qué investigar antes de decidir
1. En cada ficha, compara los **sectores** que más pesan y el **TER**.
2. Busca el PER medio de cada región y compáralo con su propia historia.
3. Ten en cuenta el **riesgo de divisa**: los fondos de EE. UU. cotizan en euros, pero las empresas ganan en dólares.
4. Piensa cuánto de tu futuro depende ya de una sola región.

> **Idea clave:** invertir en tu región es cómodo, pero diversificar entre regiones reduce el riesgo de que una mala década lo estropee todo.

## Cómo decidir
Elige una o dos opciones. Puedes combinar una europea y una estadounidense o apostar por una sola; en cualquier caso, argumenta con los sectores, la valoración y el coste, y di qué evidencia te haría cambiar de región.

${AVISO}`,
  },
  // 12 --------------------------------------------------------------
  {
    slug: "emergentes-y-diversificacion-geografica",
    title: "Emergentes y diversificación geográfica",
    theme: "Geografía",
    risk: 4,
    minChoices: 1,
    maxChoices: 2,
    options: [
      { symbol: "IS3N.DE", name: "iShares Core MSCI Emerging Markets IMI (acumulación)", kind: "ETF", note: "Incluye grandes, medianas y pequeñas empresas emergentes. Mira el peso de China, India y Taiwán y de las diez mayores posiciones." },
      { symbol: "VFEM.AS", name: "Vanguard FTSE Emerging Markets (distribución)", kind: "ETF", note: "Otra forma de comprar emergentes, con distribución de dividendos. Compara su composición por países con la del MSCI." },
      { symbol: "TSM", name: "Taiwan Semiconductor (TSMC)", kind: "STOCK", note: "La mayor empresa del índice emergente. Estudia hasta qué punto un fondo emergente depende de una sola compañía." },
    ],
    lesson: `## La idea
Los países emergentes crecen más rápido en población y clase media, pero también ofrecen **más incertidumbre política, monetaria y de gobierno corporativo**. Los fondos emergentes permiten diversificar fuera de las economías desarrolladas, aunque con **mucha volatilidad** y periodos largos sin rentabilidad.

## Las opciones
- **IS3N**: emergentes con empresas de todos los tamaños.
- **VFEM**: la alternativa de otro gestor con otra metodología.
- **TSM**: una empresa concreta que explica gran parte del índice, para ver el efecto de la concentración.

## Qué investigar antes de decidir
1. Compara el reparto por **países** de los dos fondos: pueden ser muy distintos.
2. Mira el peso de las diez mayores empresas: ¿un fondo emergente está realmente diversificado?
3. Entiende el riesgo de **divisa** y de **gobierno corporativo**.
4. Comprueba la volatilidad y las caídas máximas de la ficha.

> **Idea clave:** crecimiento económico no es lo mismo que rentabilidad bursátil: lo que importa es lo que pagas por ese crecimiento.

## Cómo decidir
Elige una o dos. Explica qué peso razonable tendría esta apuesta en una cartera completa y por qué prefieres un fondo amplio a una empresa concreta, o al revés.

${AVISO}`,
  },
  // 13 --------------------------------------------------------------
  {
    slug: "refugio-renta-fija-y-liquidez",
    title: "Refugio: renta fija y liquidez",
    theme: "Refugio",
    risk: 1,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "AGGH.MI", name: "iShares Core Global Aggregate Bond (cobertura a euro)", kind: "ETF", note: "Bonos de muchos países y emisores, con la divisa cubierta. Mira su duración (sensibilidad a los tipos) y su calidad crediticia." },
      { symbol: "VAGF.DE", name: "Vanguard Global Aggregate Bond (cobertura a euro)", kind: "ETF", note: "Alternativa del mismo tipo con otro gestor. Compara TER, composición y duración." },
      { symbol: "XEON.DE", name: "Xtrackers EUR Overnight Rate Swap", kind: "ETF", note: "Replica el tipo de interés a un día: se comporta como liquidez remunerada. Entiende por qué casi no se mueve y qué rentabilidad puede esperarse." },
      { symbol: "4GLD.DE", name: "Xetra-Gold (oro físico)", kind: "ETF", note: "Un título respaldado por oro físico. Compara su comportamiento en crisis con el de los bonos." },
    ],
    lesson: `## La idea
No toda la cartera debe buscar crecimiento. Una parte conviene que **amortigüe las caídas** y esté disponible cuando haga falta. Aquí comparas tres herramientas de refugio: bonos diversificados, liquidez remunerada y oro físico. Ninguna es libre de riesgo, pero cada una protege de un modo distinto.

## Las opciones
- **AGGH, VAGF**: bonos de gobiernos y empresas de todo el mundo.
- **XEON**: liquidez remunerada al tipo de interés a un día.
- **4GLD**: oro físico, que históricamente se ha comportado de forma independiente.

## Qué investigar antes de decidir
1. Busca la **duración** de cada fondo de bonos: si los tipos suben, cuanto mayor es, más puede caer.
2. Entiende qué es el riesgo de crédito y el de divisa, y cómo la cobertura lo reduce.
3. Compara la **volatilidad** y la caída máxima de cada opción en la ficha.
4. Piensa cuándo necesitarías este dinero.

> **Idea clave:** un refugio no sirve para ganar mucho, sirve para dormir tranquilo y no tener que vender lo demás en el peor momento.

## Cómo decidir
Elige entre una y tres opciones. Explica qué función cumple cada una en tu cartera (estabilidad, liquidez o protección) y en qué situación la cambiarías. Recuerda que los bonos también pueden caer cuando suben los tipos.

${AVISO}`,
  },
  // 14 --------------------------------------------------------------
  {
    slug: "oro-y-metales-preciosos",
    title: "Oro y metales preciosos",
    theme: "Materias primas",
    risk: 3,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "GC=F", name: "Oro", kind: "COMMODITY", note: "Es el refugio clásico. Compara su comportamiento con las bolsas y con los tipos de interés reales." },
      { symbol: "SI=F", name: "Plata", kind: "COMMODITY", note: "Mitad refugio, mitad metal industrial. Mira su volatilidad frente a la del oro y el ratio oro/plata." },
      { symbol: "PL=F", name: "Platino", kind: "COMMODITY", note: "Muy ligado a la industria del automóvil. Estudia su oferta, concentrada en pocos países." },
      { symbol: "PA=F", name: "Paladio", kind: "COMMODITY", note: "Depende de los catalizadores de coches de gasolina. Investiga cómo le afecta el coche eléctrico." },
      { symbol: "4GLD.DE", name: "Xetra-Gold (oro físico)", kind: "ETF", note: "La forma sencilla de invertir en oro sin futuros. Compara su coste con el de otras alternativas." },
    ],
    lesson: `## La idea
El oro no paga dividendos ni intereses: su valor es que **conserva poder adquisitivo** y suele subir cuando hay miedo o cuando los tipos reales bajan. La plata, el platino y el paladio son más industriales y mucho más volátiles. Esta propuesta sirve para entender qué mueve cada metal.

## Las opciones
- **GC, 4GLD**: el oro, en forma de futuro o de título respaldado por oro físico.
- **SI**: plata, a medias entre refugio e industria.
- **PL, PA**: metales ligados al automóvil, con oferta muy concentrada.

## Qué investigar antes de decidir
1. En la ficha de cada metal, lee **qué mueve el precio** y quién lo produce.
2. Compara las volatilidades: el oro suele moverse mucho menos que los demás.
3. Recuerda que los precios son de **futuros**: no son un producto para empezar; para invertir de verdad suelen usarse ETC o ETF.
4. Mira cómo se comportó cada uno cuando las bolsas cayeron con fuerza.

> **Idea clave:** el oro protege, pero no produce nada: su rentabilidad depende de que otros estén dispuestos a pagar más por él.

## Cómo decidir
Elige entre una y tres opciones. Explica si buscas protección (oro) o una apuesta más arriesgada (el resto) y qué peso le darías en una cartera completa.

${AVISO}`,
  },
  // 15 --------------------------------------------------------------
  {
    slug: "petroleo-gas-y-ciclo-energetico",
    title: "Petróleo, gas y el ciclo de la energía",
    theme: "Materias primas",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "CL=F", name: "Petróleo WTI", kind: "COMMODITY", note: "Referencia estadounidense. Investiga el papel de los inventarios semanales y las decisiones de los grandes productores." },
      { symbol: "BZ=F", name: "Petróleo Brent", kind: "COMMODITY", note: "Referencia europea. Compara su diferencial con el WTI y qué lo explica." },
      { symbol: "NG=F", name: "Gas natural", kind: "COMMODITY", note: "Extremadamente sensible al clima y al almacenamiento. Mira su estacionalidad y su volatilidad." },
      { symbol: "XOM", name: "ExxonMobil", kind: "STOCK", note: "Petrolera integrada. Compara su beneficio con el precio del crudo y su disciplina de inversión y recompras." },
      { symbol: "CVX", name: "Chevron", kind: "STOCK", note: "Otra gran petrolera integrada. Mira su dividendo, su deuda y su sensibilidad al precio del crudo." },
      { symbol: "REP.MC", name: "Repsol", kind: "STOCK", note: "Petrolera europea con refino y renovables. Observa cómo difiere su negocio del de las estadounidenses." },
    ],
    lesson: `## La idea
La energía es un ciclo: cuando el precio del crudo sube, las petroleras ganan mucho y reparten dividendos; cuando baja, sus beneficios se hunden. Puedes invertir en **la materia prima** (con futuros, muy volátiles) o en **las empresas que la extraen**, que añaden gestión, deuda y dividendos. Esta cartera sirve para ver la diferencia.

## Las opciones
- **CL, BZ**: el precio del petróleo.
- **NG**: el precio del gas natural.
- **XOM, CVX, REP**: grandes petroleras con negocio integrado.

## Qué investigar antes de decidir
1. En la ficha de cada materia prima, lee qué factores mueven su precio: oferta, demanda, geopolítica y dólar.
2. Compara cuánto se mueve la acción de una petrolera frente al precio del crudo.
3. Revisa el **dividendo**, la deuda y la política de recompras de cada empresa.
4. Piensa en la transición energética: ¿cómo afecta al negocio a largo plazo?

> **Idea clave:** invertir en una petrolera no es lo mismo que invertir en petróleo: la gestión y el dividendo cambian el riesgo.

## Cómo decidir
Elige entre una y tres opciones. Argumenta si buscas exposición al precio puro o a una empresa con dividendo, y explica qué te haría salir si el ciclo cambia. Recuerda que los futuros son productos arriesgados y no aptos para principiantes.

${AVISO}`,
  },
  // 16 --------------------------------------------------------------
  {
    slug: "agricolas-del-campo-al-supermercado",
    title: "Agrícolas: del campo al supermercado",
    theme: "Materias primas",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "ZW=F", name: "Trigo", kind: "COMMODITY", note: "Cereal básico. Estudia cómo le afectan las cosechas de los grandes productores, las exportaciones y los conflictos." },
      { symbol: "ZC=F", name: "Maíz", kind: "COMMODITY", note: "Pienso, alimentación y biocombustible. Mira el papel de las previsiones de cosecha de EE. UU." },
      { symbol: "ZS=F", name: "Soja", kind: "COMMODITY", note: "Muy dependiente de las compras de China y de las cosechas de Brasil y EE. UU." },
      { symbol: "KC=F", name: "Café", kind: "COMMODITY", note: "Depende del clima de pocos países. Investiga cómo afectan las heladas y las sequías al precio." },
      { symbol: "SB=F", name: "Azúcar", kind: "COMMODITY", note: "Influido por el monzón y por el etanol brasileño. Relaciona su precio con el del petróleo." },
      { symbol: "CC=F", name: "Cacao", kind: "COMMODITY", note: "Producción concentrada en África occidental. Observa por qué es una de las materias primas más volátiles." },
    ],
    lesson: `## La idea
Los precios agrícolas dependen de **cosechas, clima, política comercial y de lo que gaste la gente en comer**. Tienen estacionalidad y pueden subir o bajar de forma brusca por un episodio de sequía, una helada o una decisión de exportación. Sirven para entender cómo el mundo real alimenta los precios.

## Las opciones
- **ZW, ZC, ZS**: cereales y oleaginosas, la base de la alimentación y los piensos.
- **KC, SB, CC**: productos tropicales con producción concentrada.

## Qué investigar antes de decidir
1. En la ficha, lee **qué mueve el precio** y dónde se produce cada una.
2. Compara su **volatilidad** con la del oro o de las bolsas: es mucho mayor.
3. Mira los gráficos de varios años para identificar la estacionalidad.
4. Recuerda que es el precio de **futuros**: no es adecuado para empezar y exige entender los cambios de contrato.

> **Idea clave:** una materia prima puede tener una buena historia y aun así perder dinero: manda el equilibrio entre oferta y demanda, no la narrativa.

## Cómo decidir
Elige entre una y tres. Explica qué factor real de oferta o de demanda crees que subirá o bajará el precio y cuánto de tu cartera estarías dispuesto a arriesgar en algo tan volátil.

${AVISO}`,
  },
  // 17 --------------------------------------------------------------
  {
    slug: "cobre-y-metales-de-la-electrificacion",
    title: "Cobre y metales de la electrificación",
    theme: "Materias primas",
    risk: 4,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "HG=F", name: "Cobre", kind: "COMMODITY", note: "Termómetro de la economía mundial. Lee la ficha: qué parte de la demanda procede de China y de la electrificación." },
      { symbol: "FCX", name: "Freeport-McMoRan", kind: "STOCK", note: "Gran productora de cobre. Mira su apalancamiento operativo: sus beneficios se mueven mucho más que el precio del metal." },
      { symbol: "BHP", name: "BHP Group", kind: "STOCK", note: "Minera diversificada (hierro, cobre, carbón). Compara su dividendo y su exposición a cada metal." },
      { symbol: "RIO", name: "Rio Tinto", kind: "STOCK", note: "Minera diversificada con peso en mineral de hierro. Estudia su dependencia de China." },
      { symbol: "SCCO", name: "Southern Copper", kind: "STOCK", note: "Productora de cobre con costes bajos y una estructura accionarial muy concentrada. Revisa el riesgo político de sus países." },
    ],
    lesson: `## La idea
Cables, coches eléctricos, redes y energías renovables necesitan **mucho cobre**. A largo plazo la demanda podría crecer, pero la oferta tarda años en reaccionar porque abrir una mina es lento y caro. Eso crea ciclos intensos. Puedes invertir en el metal (futuros) o en las **mineras**, que amplifican los movimientos del precio.

## Las opciones
- **HG**: el precio del cobre.
- **FCX, SCCO**: especializadas en cobre.
- **BHP, RIO**: mineras diversificadas con otros metales.

## Qué investigar antes de decidir
1. Lee en la ficha del cobre qué mueve su precio y qué parte de la demanda es china.
2. Compara cuánto se mueve la acción de cada minera frente al precio del metal.
3. Revisa los **costes de producción** y la deuda: marcan quién resiste una caída del precio.
4. Estudia los riesgos políticos de los países donde operan.

> **Idea clave:** una minera es una apuesta apalancada al precio del metal: sube más cuando acierta, pero cae más cuando falla.

## Cómo decidir
Elige entre una y tres opciones. Explica si prefieres el metal puro, una especialista o una diversificada, y qué precio o dato de demanda te haría cambiar de idea.

${AVISO}`,
  },
  // 18 --------------------------------------------------------------
  {
    slug: "criptomonedas-de-referencia",
    title: "Criptomonedas de referencia",
    theme: "Cripto",
    risk: 5,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "BTC-EUR", name: "Bitcoin", kind: "CRYPTO", note: "La mayor y más antigua. Entiende su oferta limitada y por qué algunos la comparan con el oro. Mira su volatilidad y sus caídas históricas." },
      { symbol: "ETH-EUR", name: "Ethereum", kind: "CRYPTO", note: "Plataforma de aplicaciones y contratos. Averigua qué se construye sobre ella y cómo gana valor la moneda." },
      { symbol: "SOL-EUR", name: "Solana", kind: "CRYPTO", note: "Red rápida y barata, más joven. Investiga sus interrupciones pasadas y la competencia con Ethereum." },
      { symbol: "XRP-EUR", name: "XRP", kind: "CRYPTO", note: "Pensada para pagos entre entidades. Revisa el efecto de las decisiones legales sobre su precio." },
      { symbol: "BNB-EUR", name: "BNB", kind: "CRYPTO", note: "Ligada a un gran mercado de criptomonedas. Pregúntate qué riesgo supone depender de una única empresa." },
      { symbol: "ADA-EUR", name: "Cardano", kind: "CRYPTO", note: "Red con desarrollo académico y lento. Compara su actividad real con la de otras redes." },
    ],
    lesson: `## La idea
Las criptomonedas son activos digitales sin respaldo de un gobierno ni flujos de caja, cuyo precio depende de **la confianza, la adopción y la liquidez**. Pueden multiplicar su valor, pero también **perder la mitad en poco tiempo**. Esta propuesta es para aprender a analizarlas sin dejarse llevar por la euforia: es la de **mayor riesgo** del repositorio.

## Las opciones
- **BTC**: la referencia del mercado.
- **ETH, SOL, ADA**: redes donde se construyen aplicaciones.
- **XRP, BNB**: monedas ligadas a empresas concretas.

## Qué investigar antes de decidir
1. En la ficha, mira el **puesto por capitalización**, el máximo histórico y cuánto cayó desde él.
2. Compara su volatilidad con la de una acción y la de una materia prima.
3. Consulta el **índice de miedo y codicia**: la codicia extrema suele coincidir con techos.
4. Lee qué hace útil a cada red, más allá del precio.

> **Idea clave:** si no puedes explicar por qué una criptomoneda debería tener valor dentro de varios años, estás apostando a que alguien la comprará más cara.

## Cómo decidir
Elige entre una y tres, empezando por las más grandes. Decide cuánto estás dispuesto a perder: aquí es razonable pensar en una **parte pequeña** de la cartera. Explica qué te haría vender y cómo gestionarías una caída fuerte.

${AVISO}`,
  },
  // 19 --------------------------------------------------------------
  {
    slug: "dos-refugios-oro-y-bitcoin",
    title: "Dos refugios: oro y bitcoin",
    theme: "Refugio",
    risk: 4,
    minChoices: 1,
    maxChoices: 2,
    options: [
      { symbol: "GC=F", name: "Oro (futuro)", kind: "COMMODITY", note: "El refugio de siglos. Observa su volatilidad y cómo se ha comportado en las caídas de las bolsas." },
      { symbol: "4GLD.DE", name: "Xetra-Gold (oro físico)", kind: "ETF", note: "El mismo refugio sin futuros. Compara el seguimiento del precio y el coste con el del contrato de futuros." },
      { symbol: "BTC-EUR", name: "Bitcoin", kind: "CRYPTO", note: "El «oro digital» para sus defensores. Mide si de verdad se comporta como refugio o más bien como un activo de riesgo." },
      { symbol: "AGGH.MI", name: "iShares Core Global Aggregate Bond (cobertura a euro)", kind: "ETF", note: "El refugio clásico de bonos, como punto de comparación. Contrasta su estabilidad con la de los otros dos." },
    ],
    lesson: `## La idea
El oro lleva siglos siendo refugio. Bitcoin se presenta como un **«oro digital»**: oferta limitada, sin gobierno detrás. ¿Se comporta igual cuando hay miedo? Esta propuesta no pretende dar la respuesta, sino enseñarte a **comprobarla con datos** y a distinguir un refugio de un activo especulativo.

## Las opciones
- **GC, 4GLD**: oro en dos formas distintas.
- **BTC**: la criptomoneda de referencia.
- **AGGH**: bonos como tercer punto de comparación.

## Qué investigar antes de decidir
1. En las fichas, compara la **volatilidad** y la **caída máxima** de cada activo: un refugio debería caer poco.
2. Mira cómo se movió cada uno cuando las bolsas bajaron con fuerza.
3. Investiga quién compra cada activo y por qué: bancos centrales y joyería frente a inversores y especuladores.
4. Piensa en cuánto sufrirías si el activo cae un 40 %.

> **Idea clave:** un refugio se define por cómo se comporta cuando todo va mal, no por cómo suba cuando todo va bien.

## Cómo decidir
Elige una o dos opciones. Explica qué función das a cada una y por qué crees que se comportaría como protección. Define el límite de pérdida que aceptarías antes de reconsiderar.

${AVISO}`,
  },
  // 20 --------------------------------------------------------------
  {
    slug: "acciones-baratas-frente-a-su-historia",
    title: "Acciones baratas frente a su propia historia (PER)",
    theme: "Valoración",
    risk: 3,
    minChoices: 1,
    maxChoices: 3,
    options: [
      { symbol: "GOOGL", name: "Alphabet (Google)", kind: "STOCK", note: "Abre su PER histórico y compara su valor con su media y su percentil. Entiende por qué el mercado la descuenta o la premia." },
      { symbol: "AMZN", name: "Amazon", kind: "STOCK", note: "Su PER se ve distorsionado por la inversión en crecimiento. Mira cómo ha evolucionado y si el beneficio por acción crece." },
      { symbol: "MSFT", name: "Microsoft", kind: "STOCK", note: "Empresa de calidad que rara vez cotiza barata. Observa en qué zona de su rango histórico se encuentra." },
      { symbol: "AAPL", name: "Apple", kind: "STOCK", note: "Compara su PER con el de su propia historia: ¿el mercado paga más por cada dólar de beneficio que de costumbre?" },
      { symbol: "JNJ", name: "Johnson & Johnson", kind: "STOCK", note: "Un PER bajo con beneficios estables puede ser una oportunidad; con beneficios en caída, una trampa de valor. Comprueba cuál es el caso." },
      { symbol: "KO", name: "Coca-Cola", kind: "STOCK", note: "Negocio muy estable. Mira si su PER actual está por encima o por debajo de lo habitual y qué lo explica." },
    ],
    lesson: `## La idea
El **PER** (precio entre beneficio anual por acción) dice cuántos años de beneficio pagas por la acción. Un PER aislado no significa nada: lo útil es compararlo con **la historia de la propia empresa**. Si es bajo frente a su rango, puede ser una oportunidad; pero si el beneficio está cayendo, puede ser una **trampa de valor**.

## Las opciones
Seis grandes empresas estadounidenses, con datos de beneficios completos para calcular su PER histórico: **GOOGL, AMZN, MSFT, AAPL, JNJ y KO**.

## Qué investigar antes de decidir
1. En la ficha de cada una, abre el panel **PER histórico**: mira el PER actual, la media, el **percentil** y la señal (barata, neutral o cara).
2. Fíjate en si el beneficio anual por acción **crece o cae**: es lo que separa una oportunidad de una trampa.
3. Cambia el periodo (1, 3, 5, 10 años o todo): la conclusión puede depender del rango que elijas.
4. Recuerda que el beneficio es el contable y puede incluir partidas extraordinarias.

> **Idea clave:** barato frente a su historia no es lo mismo que barato de verdad: pregunta siempre por qué lo está y si el beneficio acompaña.

## Cómo decidir
Elige entre una y tres. Para cada una, cita el percentil, la tendencia del beneficio y un riesgo. Si eliges una acción que el indicador marca como cara o neutral, explica qué otra razón tienes para comprarla. Compara tu elección con la señal de la Recomendación del Club.

${AVISO}`,
  },
];
