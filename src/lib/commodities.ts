/**
 * Catálogo de materias primas que sigue el club. Los precios salen de los futuros continuos de Yahoo Finance
 * (símbolos terminados en «=F»). Cada ficha explica qué es, quién la produce y qué mueve su precio.
 * Módulo de datos puro: se puede importar tanto desde servidor como desde componentes de cliente.
 */

export type CommodityGroup = "Metales preciosos" | "Metales industriales" | "Energía" | "Agrícolas" | "Ganadería";

export type Commodity = {
  symbol: string; // símbolo del futuro continuo en Yahoo Finance
  name: string;
  group: CommodityGroup;
  unit: string; // en qué se cotiza
  exchange: string; // mercado donde cotiza el futuro
  contract: string; // tamaño del contrato
  description: string;
  drivers: string[]; // qué mueve el precio
  producers: string; // principales productores
  keywords: string[]; // palabras para reconocer sus noticias
  newsQuery: string; // búsqueda de noticias en Yahoo (en inglés)
};

export const COMMODITIES: Commodity[] = [
  {
    symbol: "GC=F", name: "Oro", group: "Metales preciosos", unit: "USD por onza troy", exchange: "COMEX", contract: "100 onzas troy",
    description: "Metal precioso que se usa como reserva de valor y refugio cuando hay incertidumbre. Los bancos centrales son grandes compradores y la joyería y la inversión (lingotes, ETC) completan la demanda.",
    drivers: ["Tipos de interés reales: cuando bajan, el oro suele subir porque no paga intereses", "Fortaleza del dólar: un dólar débil lo favorece", "Miedo en los mercados y tensiones geopolíticas", "Compras de los bancos centrales y demanda de joyería e inversión"],
    producers: "China, Australia, Rusia, Canadá y EE. UU.", keywords: ["gold", "oro", "bullion", "xau"], newsQuery: "gold",
  },
  {
    symbol: "SI=F", name: "Plata", group: "Metales preciosos", unit: "USD por onza troy", exchange: "COMEX", contract: "5.000 onzas troy",
    description: "Metal precioso y a la vez industrial: más de la mitad de su demanda viene de la industria (electrónica, paneles solares, vehículos eléctricos). Por eso se mueve como el oro pero con más volatilidad.",
    drivers: ["Demanda industrial y fotovoltaica", "Ratio oro/plata: cuando está muy alto, la plata suele recuperar terreno", "Dólar y tipos de interés, igual que el oro", "Producción minera, que casi siempre es subproducto de otros metales"],
    producers: "México, China, Perú y Polonia.", keywords: ["silver", "plata"], newsQuery: "silver",
  },
  {
    symbol: "PL=F", name: "Platino", group: "Metales preciosos", unit: "USD por onza troy", exchange: "NYMEX", contract: "50 onzas troy",
    description: "Se usa sobre todo en los catalizadores de los coches diésel, en joyería y en tecnologías del hidrógeno. Es un mercado pequeño, con una oferta muy concentrada, y por eso es volátil.",
    drivers: ["Ventas de coches y normativa de emisiones", "Interrupciones en las minas de Sudáfrica (energía eléctrica, huelgas)", "Demanda de joyería en China", "Desarrollo del hidrógeno verde"],
    producers: "Sudáfrica (más del 70 %) y Rusia.", keywords: ["platinum", "platino"], newsQuery: "platinum",
  },
  {
    symbol: "PA=F", name: "Paladio", group: "Metales preciosos", unit: "USD por onza troy", exchange: "NYMEX", contract: "100 onzas troy",
    description: "Metal de los catalizadores de los coches de gasolina. Su demanda depende casi por completo de la industria del automóvil, y la electrificación amenaza su futuro a largo plazo.",
    drivers: ["Producción de coches de gasolina e híbridos", "Sanciones o cortes de suministro desde Rusia", "Sustitución por platino cuando es más barato", "Avance del coche eléctrico, que no lo necesita"],
    producers: "Rusia y Sudáfrica.", keywords: ["palladium", "paladio"], newsQuery: "palladium",
  },
  {
    symbol: "HG=F", name: "Cobre", group: "Metales industriales", unit: "USD por libra", exchange: "COMEX", contract: "25.000 libras",
    description: "El «doctor Cobre»: se usa en construcción, cables, electrodomésticos y coches, así que su precio es un termómetro de la economía mundial. La transición energética (redes eléctricas, coches eléctricos, renovables) añade demanda.",
    drivers: ["Economía de China, que consume cerca de la mitad del cobre mundial", "Transición energética y electrificación", "Inventarios en las bolsas de metales", "Huelgas y cierres de minas en Chile y Perú"],
    producers: "Chile, Perú, R. D. del Congo y China.", keywords: ["copper", "cobre"], newsQuery: "copper",
  },
  {
    symbol: "CL=F", name: "Petróleo WTI", group: "Energía", unit: "USD por barril", exchange: "NYMEX", contract: "1.000 barriles",
    description: "Crudo de referencia de EE. UU. Es la materia prima más negociada del mundo y condiciona el precio de la gasolina, el transporte y buena parte de la inflación.",
    drivers: ["Decisiones de la OPEP+ sobre producción", "Inventarios semanales de crudo de EE. UU.", "Crecimiento económico y demanda de China", "Tensiones en Oriente Medio y sanciones", "Fortaleza del dólar"],
    producers: "EE. UU., Arabia Saudí, Rusia, Canadá e Irak.", keywords: ["crude", "oil", "wti", "petróleo", "petroleo", "opec", "opep"], newsQuery: "crude oil",
  },
  {
    symbol: "BZ=F", name: "Petróleo Brent", group: "Energía", unit: "USD por barril", exchange: "ICE / NYMEX", contract: "1.000 barriles",
    description: "Crudo de referencia de Europa y de la mayor parte del comercio mundial. Suele cotizar algo por encima del WTI. Yahoo ofrece el contrato de vencimiento más próximo.",
    drivers: ["Decisiones de la OPEP+ sobre producción", "Demanda de Europa y Asia", "Tensiones en Oriente Medio y rutas marítimas", "Sanciones al petróleo ruso e iraní", "Fortaleza del dólar"],
    producers: "Mar del Norte, Arabia Saudí, Rusia, Irak y Emiratos.", keywords: ["brent", "crude", "oil", "petróleo", "petroleo", "opec", "opep"], newsQuery: "brent crude",
  },
  {
    symbol: "NG=F", name: "Gas natural", group: "Energía", unit: "USD por millón de BTU", exchange: "NYMEX", contract: "10.000 millones de BTU",
    description: "Combustible para calefacción, generación eléctrica e industria. El contrato es el de EE. UU. (Henry Hub) y es de las materias primas más volátiles porque el clima y el almacenamiento mandan.",
    drivers: ["Clima: inviernos fríos y veranos calurosos disparan la demanda", "Gas almacenado: informe semanal de inventarios de EE. UU.", "Exportaciones de gas natural licuado (GNL) a Europa y Asia", "Producción de gas de esquisto"],
    producers: "EE. UU., Rusia, Irán, Catar y China.", keywords: ["natural gas", "gas natural", "lng", "gnl", "henry hub"], newsQuery: "natural gas",
  },
  {
    symbol: "HO=F", name: "Gasóleo", group: "Energía", unit: "USD por galón", exchange: "NYMEX", contract: "42.000 galones",
    description: "Derivado del petróleo para calefacción y transporte (diésel). Su precio sigue al crudo pero añade el efecto del margen de refino y del frío.",
    drivers: ["Precio del crudo", "Inventarios de destilados y capacidad de refino", "Temperatura del invierno", "Demanda de transporte por carretera y marítimo"],
    producers: "Refinerías de EE. UU., Europa, Rusia e India.", keywords: ["heating oil", "diesel", "gasóleo", "gasoleo", "distillate"], newsQuery: "heating oil",
  },
  {
    symbol: "RB=F", name: "Gasolina", group: "Energía", unit: "USD por galón", exchange: "NYMEX", contract: "42.000 galones",
    description: "Gasolina RBOB de EE. UU. Sube en primavera y verano con la temporada de viajes y refleja los márgenes de las refinerías además del crudo.",
    drivers: ["Precio del crudo", "Temporada de conducción de verano", "Paradas o incidentes en refinerías", "Inventarios de gasolina de EE. UU."],
    producers: "Refinerías de EE. UU. (golfo de México).", keywords: ["gasoline", "gasolina", "rbob"], newsQuery: "gasoline",
  },
  {
    symbol: "ZW=F", name: "Trigo", group: "Agrícolas", unit: "USD por bushel", exchange: "CBOT", contract: "5.000 bushels",
    description: "Cereal básico de la alimentación mundial. Cotiza el trigo blando de Chicago. Su precio reacciona a las cosechas, al clima y a la guerra o los aranceles que afectan a las exportaciones.",
    drivers: ["Cosechas en Rusia, UE, EE. UU., Canadá y Ucrania", "Clima: sequías, heladas e inundaciones", "Exportaciones, aranceles y conflictos en el mar Negro", "Fortaleza del dólar"],
    producers: "China, India, Rusia, EE. UU. y la UE.", keywords: ["wheat", "trigo"], newsQuery: "wheat",
  },
  {
    symbol: "ZC=F", name: "Maíz", group: "Agrícolas", unit: "USD por bushel", exchange: "CBOT", contract: "5.000 bushels",
    description: "Se usa en piensos, alimentación y etanol. EE. UU. es el mayor productor y exportador, así que sus informes de cosecha mueven el mercado.",
    drivers: ["Clima en el Medio Oeste de EE. UU.", "Informes mensuales del Departamento de Agricultura (USDA)", "Demanda de etanol y de piensos", "Exportaciones a México, China y Japón"],
    producers: "EE. UU., China, Brasil y Argentina.", keywords: ["corn", "maíz", "maiz"], newsQuery: "corn",
  },
  {
    symbol: "ZS=F", name: "Soja", group: "Agrícolas", unit: "USD por bushel", exchange: "CBOT", contract: "5.000 bushels",
    description: "Base de piensos (harina) y aceites vegetales. China compra más de la mitad de la soja que se comercia en el mundo, por lo que la relación comercial con China pesa mucho.",
    drivers: ["Compras de China", "Cosechas en Brasil, EE. UU. y Argentina", "Precio del aceite de soja y de la harina", "Clima en las zonas de cultivo"],
    producers: "Brasil, EE. UU. y Argentina.", keywords: ["soybean", "soybeans", "soy", "soja"], newsQuery: "soybeans",
  },
  {
    symbol: "KC=F", name: "Café", group: "Agrícolas", unit: "USD por libra", exchange: "ICE (EE. UU.)", contract: "37.500 libras",
    description: "Cotiza el café arábica. Es muy sensible al clima de unos pocos países productores: una helada en Brasil puede mover el precio en días.",
    drivers: ["Clima en Brasil y Colombia: heladas y sequías", "Existencias certificadas en los almacenes", "Real brasileño frente al dólar", "Demanda de consumo y tostadores"],
    producers: "Brasil, Vietnam, Colombia y Etiopía.", keywords: ["coffee", "café", "cafe", "arabica"], newsQuery: "coffee",
  },
  {
    symbol: "SB=F", name: "Azúcar", group: "Agrícolas", unit: "USD por libra", exchange: "ICE (EE. UU.)", contract: "112.000 libras",
    description: "Cotiza el azúcar crudo nº 11. Brasil puede destinar la caña a azúcar o a etanol, así que el precio del petróleo también influye.",
    drivers: ["Monzón y cosecha en India", "Cosecha de caña en Brasil", "Precio del petróleo, por el etanol", "Reservas y exportaciones de Tailandia"],
    producers: "Brasil, India, UE y Tailandia.", keywords: ["sugar", "azúcar", "azucar"], newsQuery: "sugar",
  },
  {
    symbol: "CC=F", name: "Cacao", group: "Agrícolas", unit: "USD por tonelada", exchange: "ICE (EE. UU.)", contract: "10 toneladas",
    description: "Materia prima del chocolate. Más de la mitad de la oferta sale de Costa de Marfil y Ghana, por lo que el clima y las enfermedades del cacaotero allí provocan movimientos muy bruscos.",
    drivers: ["Clima y enfermedades de la planta en África occidental", "Molienda: demanda de la industria del chocolate", "Existencias en los puertos", "Políticas de precios de Costa de Marfil y Ghana"],
    producers: "Costa de Marfil, Ghana, Ecuador e Indonesia.", keywords: ["cocoa", "cacao", "chocolate"], newsQuery: "cocoa",
  },
  {
    symbol: "LE=F", name: "Ganado vacuno", group: "Ganadería", unit: "USD por libra", exchange: "CME", contract: "40.000 libras",
    description: "Ganado vacuno listo para sacrificio. Depende del tamaño de la cabaña de EE. UU., del coste del pienso y de la demanda de carne.",
    drivers: ["Tamaño de la cabaña en EE. UU.", "Precio del maíz (pienso)", "Demanda de carne y exportaciones", "Sequías, que obligan a reducir rebaños"],
    producers: "EE. UU., Brasil, China y UE.", keywords: ["live cattle", "cattle", "beef", "vacuno", "ganado vacuno"], newsQuery: "cattle",
  },
  {
    symbol: "GF=F", name: "Ganado de engorde", group: "Ganadería", unit: "USD por libra", exchange: "CME", contract: "50.000 libras",
    description: "Terneros jóvenes que se engordan antes de su venta. Es más sensible al precio del maíz que el ganado vacuno ya terminado.",
    drivers: ["Precio del maíz y del pienso", "Precio del ganado vacuno terminado", "Disponibilidad de pastos y clima", "Importaciones de terneros desde México"],
    producers: "EE. UU. (Texas, Kansas, Nebraska).", keywords: ["feeder cattle", "cattle", "terneros"], newsQuery: "feeder cattle",
  },
  {
    symbol: "HE=F", name: "Cerdo magro", group: "Ganadería", unit: "USD por libra", exchange: "CME", contract: "40.000 libras",
    description: "Cerdo para carne. Su precio sigue la demanda de los consumidores, las exportaciones (México, China, Japón) y el coste del pienso.",
    drivers: ["Exportaciones a México, China y Japón", "Precio del maíz y de la soja (pienso)", "Enfermedades porcinas", "Estacionalidad: más demanda en verano"],
    producers: "China, UE y EE. UU.", keywords: ["lean hog", "hogs", "pork", "cerdo", "porcino"], newsQuery: "hogs",
  },
];

export const COMMODITY_GROUPS: CommodityGroup[] = ["Metales preciosos", "Metales industriales", "Energía", "Agrícolas", "Ganadería"];

/** Selección que se ofrece al empezar con la lista vacía. */
export const DEFAULT_COMMODITY_WATCHLIST = ["GC=F", "SI=F", "PL=F", "HG=F", "CL=F", "BZ=F", "NG=F", "ZW=F", "ZC=F", "ZS=F", "KC=F", "CC=F"].map((s) => {
  const c = COMMODITIES.find((x) => x.symbol === s)!;
  return { symbol: c.symbol, name: c.name };
});

const BY_SYMBOL = new Map(COMMODITIES.map((c) => [c.symbol, c]));

export const isCommodity = (symbol: string) => BY_SYMBOL.has(symbol.toUpperCase());
export const findCommodity = (symbol: string): Commodity | null => BY_SYMBOL.get(symbol.toUpperCase()) ?? null;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Materias primas cuyo nombre, símbolo, grupo o palabras clave contienen el texto buscado. */
export function searchCommodities(q: string): { symbol: string; name: string; exchange: string; type: string }[] {
  const t = norm(q);
  if (t.length < 1) return [];
  return COMMODITIES.filter((c) => [c.symbol, c.name, c.group, ...c.keywords].some((k) => norm(k).includes(t))).map((c) => ({ symbol: c.symbol, name: c.name, exchange: c.group, type: "FUTURE" }));
}

/** Resuelve lo que escribió el usuario («oro», «gc=f», «petroleo») a una materia prima del catálogo. */
export function matchCommodity(text: string): Commodity | null {
  const t = norm(text);
  if (!t) return null;
  return COMMODITIES.find((c) => norm(c.symbol) === t || norm(c.name) === t) ?? COMMODITIES.find((c) => c.keywords.some((k) => norm(k) === t)) ?? searchCommodities(t).map((h) => BY_SYMBOL.get(h.symbol)!)[0] ?? null;
}
