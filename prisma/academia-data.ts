/**
 * Contenido de la Academia: seis cursos (uno por nivel de la liga) con lecciones cortas y quiz de tres preguntas.
 * Se carga con `npm run db:seed` (idempotente: actualiza por slug).
 */

export type LessonBody = {
  intro: string[];
  keyIdea: string;
  table?: { headers: string[]; rows: string[][]; caption: string };
  outro: string[];
  apply: string;
};

export type LessonSeed = {
  slug: string;
  title: string;
  minutes: number;
  body: LessonBody;
  questions: { text: string; options: string[]; correctIndex: number; feedback: string }[];
};

export type CourseSeed = { slug: string; level: number; title: string; description: string; lessons: LessonSeed[] };

export const COURSES: CourseSeed[] = [
  {
    slug: "fundamentos",
    level: 1,
    title: "Fundamentos",
    description: "Ahorro, inflación, interés compuesto y la relación entre riesgo y rentabilidad.",
    lessons: [
      {
        slug: "ahorrar-antes-de-invertir",
        title: "Ahorrar antes de invertir",
        minutes: 5,
        body: {
          intro: [
            "Invertir es poner a trabajar dinero que no vas a necesitar durante años. Por eso lo primero no es elegir una acción, sino separar el dinero que puedes inmovilizar del que no.",
            "La regla práctica del club: antes de invertir, ten un colchón para imprevistos (para un adulto, de tres a seis meses de gastos; para ti, lo que te permita no tener que vender nunca con prisas). Lo que invirtas tiene que poder estar quieto al menos cinco años.",
          ],
          keyIdea: "Solo se invierte el dinero que no vas a necesitar. Vender con prisas es la forma más fácil de perder.",
          outro: [
            "La paga mensual del club cumple esa condición: es dinero pensado para invertir y para aprender. Cada euro que entra en la cartera debería tener una razón y un plazo.",
          ],
          apply: "Mira tu efectivo disponible en Operaciones. ¿Tienes alguna compra pendiente de explicar en el diario? Escribe primero por qué, y después el plazo que le das.",
        },
        questions: [
          { text: "¿Qué dinero es el adecuado para invertir?", options: ["El que no vas a necesitar en varios años", "Todo lo que tengas en la cuenta", "El que necesitarás el mes que viene"], correctIndex: 0, feedback: "Invertir exige poder esperar. Si puedes verte obligado a vender, ese dinero no es para invertir." },
          { text: "¿Para qué sirve el colchón de emergencia?", options: ["Para comprar más cuando la bolsa cae", "Para no tener que vender inversiones con prisas", "Para pagar menos comisiones"], correctIndex: 1, feedback: "El colchón evita las ventas forzadas, que suelen llegar en el peor momento." },
          { text: "¿Cuál es un plazo mínimo razonable para una inversión en acciones?", options: ["Tres meses", "Un año", "Cinco años"], correctIndex: 2, feedback: "A cinco años o más, la probabilidad de acabar en pérdidas con una cartera diversificada baja mucho." },
        ],
      },
      {
        slug: "la-inflacion",
        title: "La inflación",
        minutes: 5,
        body: {
          intro: [
            "La inflación es la subida general de los precios. Si los precios suben un 3 % al año, con los mismos euros compras cada año un 3 % menos. El dinero parado en una cuenta no pierde euros, pero sí pierde valor.",
            "Por eso «no hacer nada» también es una decisión con coste. Con un 3 % de inflación, 1.000 € guardados diez años compran lo que hoy compran unos 740 €.",
          ],
          keyIdea: "El dinero quieto no está a salvo: la inflación lo encoge en silencio.",
          table: {
            headers: ["Inflación anual", "1.000 € hoy valen, en 10 años", "en 20 años"],
            rows: [["2 %", "820 €", "673 €"], ["3 %", "744 €", "554 €"], ["5 %", "614 €", "377 €"]],
            caption: "Poder de compra de 1.000 € guardados sin rentabilidad.",
          },
          outro: [
            "Invertir no es solo intentar ganar: es, como mínimo, intentar que el dinero mantenga lo que vale. La rentabilidad que importa es la real, es decir, descontada la inflación.",
          ],
          apply: "Busca el dato de inflación del último año en España. Compara ese número con la rentabilidad de tu cartera en la Liga.",
        },
        questions: [
          { text: "Si la inflación es del 3 % y tu cuenta no da nada, al cabo de un año tu dinero…", options: ["Vale lo mismo", "Compra un 3 % menos", "Compra un 3 % más"], correctIndex: 1, feedback: "Los euros son los mismos, pero compran menos: has perdido poder de compra." },
          { text: "¿Qué es la rentabilidad real?", options: ["La rentabilidad sin comisiones", "La rentabilidad descontando la inflación", "La rentabilidad del mejor año"], correctIndex: 1, feedback: "Real = nominal − inflación. Es la que mide si realmente te enriqueces." },
          { text: "Guardar el dinero sin invertir es…", options: ["Una decisión sin coste", "Una decisión con coste si hay inflación", "Siempre lo más rentable"], correctIndex: 1, feedback: "No invertir también es decidir, y con inflación tiene un coste cada año." },
        ],
      },
      {
        slug: "riesgo-y-rentabilidad",
        title: "Riesgo y rentabilidad",
        minutes: 6,
        body: {
          intro: [
            "No existe rentabilidad sin riesgo. Cuanto más puede subir una inversión, más puede caer. Las acciones han dado históricamente más que los bonos, y los bonos más que el efectivo, precisamente porque obligan a aguantar caídas.",
            "El riesgo que importa no es que el precio se mueva, sino que te obligue a vender en el peor momento o que la empresa desaparezca. Una caída del 30 % en un ETF mundial es normal cada pocos años; en una sola empresa pequeña puede ser definitiva.",
          ],
          keyIdea: "Pregunta siempre qué puedes perder antes de preguntar cuánto puedes ganar.",
          outro: [
            "Si alguien te promete mucha rentabilidad «sin riesgo», o no entiende lo que vende o te está engañando. En el club, el riesgo se mide con la volatilidad y con el tamaño de la posición, que verás en el Nivel 6.",
          ],
          apply: "Mira la caída máxima de tus activos en su ficha de análisis. ¿Aguantarías una caída así sin vender?",
        },
        questions: [
          { text: "¿Qué relación hay entre riesgo y rentabilidad esperada?", options: ["Ninguna", "A más rentabilidad esperada, más riesgo", "A más riesgo, menos rentabilidad"], correctIndex: 1, feedback: "El mercado paga más a quien acepta más incertidumbre. No hay atajos." },
          { text: "Una caída del 30 % en un ETF mundial es…", options: ["Algo que ocurre cada pocos años", "Imposible", "Señal de que el ETF está roto"], correctIndex: 0, feedback: "Las caídas fuertes forman parte del camino. Lo raro sería que no ocurrieran." },
          { text: "Te ofrecen un 20 % anual «garantizado». ¿Qué piensas?", options: ["Que es una gran oportunidad", "Que es sospechoso: no existe rentabilidad alta sin riesgo", "Que hay que invertir rápido"], correctIndex: 1, feedback: "Rentabilidad alta garantizada es la frase favorita de las estafas." },
        ],
      },
      {
        slug: "el-interes-compuesto",
        title: "El interés compuesto",
        minutes: 6,
        body: {
          intro: [
            "Cuando inviertes, lo que ganas un año también genera ganancias el año siguiente. Es el interés sobre el interés. Al principio apenas se nota; con el tiempo pasa a ser la mayor parte del resultado.",
            "El ejemplo: 100 € al mes —la paga del club— con una rentabilidad media del 6 % anual. No es una promesa; es una media histórica razonable para una cartera global de acciones, con años buenos y años muy malos.",
          ],
          keyIdea: "El tiempo pesa más que el importe. Empezar diez años antes vale más que aportar el doble.",
          table: {
            headers: ["Plazo", "Aportado", "Valor final", "Generado por intereses"],
            rows: [["10 años", "12.000 €", "16.388 €", "27 %"], ["20 años", "24.000 €", "46.204 €", "48 %"], ["30 años", "36.000 €", "100.452 €", "64 %"]],
            caption: "100 € al mes, 6 % anual capitalizado mensualmente, sin comisiones ni impuestos.",
          },
          outro: [
            "Por eso las comisiones importan tanto: un 1,5 % anual no se come el 1,5 % del resultado, sino una parte creciente de los intereses que habrían generado intereses. Lo verás en el Nivel 3, al comparar el TER de los ETF.",
          ],
          apply: "Mira tu posición más antigua. ¿Cuánto valdría si la mantuvieras 20 años al 6 %? Anótalo en el diario: dentro de un año lo comparamos con la realidad.",
        },
        questions: [
          { text: "Inviertes 100 € al mes al 6 % anual durante 30 años. ¿Cuánto has aportado tú?", options: ["36.000 €", "100.452 €", "64.452 €"], correctIndex: 0, feedback: "Aportas 100 × 12 × 30 = 36.000 €. Los otros 64.452 € los genera el interés compuesto." },
          { text: "¿Qué hace crecer más el resultado final?", options: ["Empezar antes", "Acertar el mes perfecto para comprar", "Revisar la cartera a diario"], correctIndex: 0, feedback: "El tiempo es la variable que más multiplica. Acertar el momento es casi imposible y apenas cambia el resultado a 30 años." },
          { text: "Una comisión anual del 1,5 % frente a una del 0,2 %…", options: ["Apenas importa a largo plazo", "Se come una parte creciente de los intereses", "Solo afecta cuando vendes"], correctIndex: 1, feedback: "La comisión se cobra cada año sobre todo el capital, así que también frena el interés compuesto." },
        ],
      },
      {
        slug: "tu-horizonte-temporal",
        title: "Tu horizonte temporal",
        minutes: 5,
        body: {
          intro: [
            "El horizonte temporal es cuánto tiempo puedes dejar el dinero invertido. Es la pregunta que decide casi todo lo demás: qué comprar, cuánto riesgo aceptar y cómo reaccionar a las caídas.",
            "A un año, la bolsa es casi una moneda al aire. A diez, una cartera global ha acabado en positivo en la inmensa mayoría de los periodos históricos. El mismo activo es arriesgado o razonable según el plazo.",
          ],
          keyIdea: "Tu plazo es tu mejor protección. Decide el horizonte antes de decidir el activo.",
          outro: [
            "En el club, cada entrada del diario pide un plazo: «reviso en 2031» es una decisión; «vendo si baja» sin más, no lo es. Las ventas por nervios casi siempre coinciden con los peores momentos.",
          ],
          apply: "Escribe en el diario el horizonte de cada posición de tu cartera. Si alguna no tiene plazo, pregúntate por qué la compraste.",
        },
        questions: [
          { text: "¿Qué decide el horizonte temporal?", options: ["Solo el momento de vender", "Qué comprar, cuánto riesgo aceptar y cómo reaccionar a las caídas", "Nada importante"], correctIndex: 1, feedback: "El plazo condiciona toda la estrategia." },
          { text: "A diez años, una cartera global de acciones…", options: ["Ha acabado en positivo casi siempre", "Es una moneda al aire", "Siempre pierde"], correctIndex: 0, feedback: "El tiempo diluye la mala suerte: a largo plazo pesa el crecimiento de las empresas." },
          { text: "¿Cuál de estas frases del diario está bien planteada?", options: ["«Vendo si baja»", "«Aporto cada mes y reviso en 2031»", "«Compro porque está de moda»"], correctIndex: 1, feedback: "Un plazo y una regla de revisión; eso es un plan." },
        ],
      },
      {
        slug: "quiz-final",
        title: "Quiz final",
        minutes: 4,
        body: {
          intro: [
            "Has visto las cinco ideas que sostienen todo lo demás: invertir solo lo que no necesitas, que la inflación encoge el dinero parado, que no hay rentabilidad sin riesgo, que el tiempo multiplica gracias al interés compuesto y que el horizonte decide la estrategia.",
            "Este quiz final repasa el curso. Al superarlo se desbloquea el Nivel 2, Productos, donde aprenderás qué compras de verdad cuando compras una acción, un ETF o una criptomoneda.",
          ],
          keyIdea: "Un inversor con fundamentos claros aguanta las caídas; uno sin ellos vende en el peor momento.",
          outro: ["Puedes repetir el quiz las veces que quieras. Lo importante no es acertar a la primera, sino que las ideas se queden."],
          apply: "Revisa tu cartera en la Liga con estas cinco ideas en la cabeza. ¿Qué cambiarías?",
        },
        questions: [
          { text: "La mejor forma de reducir el riesgo de vender en el peor momento es…", options: ["Tener un colchón y un plazo largo", "Mirar el precio cada hora", "Invertir todo de golpe"], correctIndex: 0, feedback: "Colchón y plazo: con eso no te verás obligado a vender." },
          { text: "¿Qué protege mejor contra la inflación a largo plazo?", options: ["El dinero en la cuenta corriente", "Una cartera invertida con rentabilidad real positiva", "Guardar billetes en casa"], correctIndex: 1, feedback: "Solo una inversión que rinda por encima de la inflación mantiene o aumenta el poder de compra." },
          { text: "El interés compuesto crece más cuanto…", options: ["Más tiempo pasa", "Más veces compras y vendes", "Más comisiones pagas"], correctIndex: 0, feedback: "Tiempo y bajas comisiones: la combinación que más multiplica." },
        ],
      },
    ],
  },
  {
    slug: "productos",
    level: 2,
    title: "Productos",
    description: "Qué compras de verdad cuando compras una acción, un ETF, un fondo o una criptomoneda.",
    lessons: [
      {
        slug: "acciones",
        title: "Acciones",
        minutes: 6,
        body: {
          intro: [
            "Una acción es un trozo de una empresa. Si compras una acción de Inditex, eres propietario de una parte minúscula de todas sus tiendas, sus marcas y sus beneficios. Ganas de dos formas: si la empresa reparte beneficios (dividendo) y si otros están dispuestos a pagar más por tu trozo (subida del precio).",
            "El precio de una acción se mueve cada día por oferta y demanda, pero a largo plazo sigue a los beneficios de la empresa. Una empresa que gana cada vez más dinero acaba valiendo más; una que pierde, menos.",
          ],
          keyIdea: "Comprar una acción es comprar un trozo de negocio, no un número que sube y baja.",
          outro: [
            "Riesgo específico: una sola empresa puede ir mal por motivos propios (un mal producto, una multa, un competidor). Por eso, con una sola acción puedes perderlo todo; con cincuenta, prácticamente no.",
          ],
          apply: "Abre la ficha de una acción que tengas y lee la descripción de la empresa. ¿Sabrías explicar en una frase cómo gana dinero?",
        },
        questions: [
          { text: "¿Qué compras al comprar una acción?", options: ["Un préstamo a la empresa", "Una parte de la propiedad de la empresa", "Un derecho a devolver el dinero"], correctIndex: 1, feedback: "Eres socio, con sus beneficios y sus riesgos." },
          { text: "A largo plazo, el precio de una acción sigue a…", options: ["Las noticias del día", "Los beneficios de la empresa", "El número de accionistas"], correctIndex: 1, feedback: "El ruido es diario; el valor lo marcan los beneficios." },
          { text: "¿Qué es el riesgo específico?", options: ["El riesgo de que la bolsa entera caiga", "El riesgo propio de una empresa concreta", "El riesgo de las comisiones"], correctIndex: 1, feedback: "Se reduce diversificando: muchas empresas distintas." },
        ],
      },
      {
        slug: "etf",
        title: "ETF",
        minutes: 6,
        body: {
          intro: [
            "Un ETF (fondo cotizado) es una cesta con cientos o miles de acciones que se compra y se vende en bolsa como si fuera una sola acción. Un ETF «mundo» tiene unas 1.500 empresas de 25 países; con 100 € eres socio de todas.",
            "La mayoría son indexados: no intentan acertar, copian un índice (el MSCI World, el S&P 500) a un coste muy bajo. El dato clave es el TER, la comisión anual: 0,20 % es barato; 1,5 % es caro y, como viste en el Nivel 1, se nota mucho a largo plazo.",
          ],
          keyIdea: "Un ETF mundial barato es la forma más sencilla de tener diversificación con una sola compra.",
          table: {
            headers: ["ETF", "Qué contiene", "TER aproximado"],
            rows: [["MSCI World", "≈1.500 empresas de países desarrollados", "0,20 %"], ["FTSE All-World", "≈3.600 empresas, incluye emergentes", "0,22 %"], ["S&P 500", "500 grandes empresas de EE. UU.", "0,07 %"]],
            caption: "Ejemplos de ETF indexados; comprueba el TER en la ficha de cada uno.",
          },
          outro: ["Acumulación (Acc) reinvierte los dividendos; distribución (Dist) te los paga. Para una paga que se reinvierte cada mes, la versión de acumulación suele ser más cómoda y fiscalmente eficiente."],
          apply: "En la sección ETF, abre uno mundial y mira sus diez principales posiciones y su TER. ¿Cuánto pesa la tecnología?",
        },
        questions: [
          { text: "¿Qué es un ETF indexado?", options: ["Un fondo que intenta batir al mercado", "Un fondo que copia un índice con bajo coste", "Una acción de una empresa tecnológica"], correctIndex: 1, feedback: "Copiar el índice es barato y, a largo plazo, difícil de batir." },
          { text: "¿Qué mide el TER?", options: ["La rentabilidad del fondo", "La comisión anual del fondo", "El número de empresas que contiene"], correctIndex: 1, feedback: "Es el coste anual total; cuanto más bajo, mejor." },
          { text: "Un ETF «Acc»…", options: ["Reinvierte los dividendos", "Te paga los dividendos", "No tiene dividendos"], correctIndex: 0, feedback: "Acumulación reinvierte; distribución reparte." },
        ],
      },
      {
        slug: "fondos",
        title: "Fondos",
        minutes: 5,
        body: {
          intro: [
            "Un fondo de inversión tradicional se parece a un ETF (una cesta gestionada por una gestora), pero no cotiza en bolsa: se compra y se vende a través del banco o de una plataforma al valor liquidativo del día.",
            "Los hay indexados (baratos) y de gestión activa (un gestor elige qué comprar, con comisiones del 1 % al 2 %). Los datos muestran que la mayoría de los fondos activos no baten a su índice a diez años, sobre todo por las comisiones.",
          ],
          keyIdea: "Pagar más comisión no compra más rentabilidad; casi siempre compra menos.",
          outro: ["Ventaja fiscal en España: puedes traspasar dinero entre fondos sin pagar impuestos por las ganancias hasta que vendes definitivamente. Un ETF no tiene esa ventaja. En el club puedes registrar fondos con precio manual."],
          apply: "Si tienes un fondo en el banco familiar, busca su TER. Compáralo con el ETF mundial de la lista.",
        },
        questions: [
          { text: "¿En qué se diferencia un fondo tradicional de un ETF?", options: ["El fondo no cotiza en bolsa; se compra al valor del día", "El fondo siempre es más barato", "No hay diferencia"], correctIndex: 0, feedback: "El ETF cotiza en tiempo real; el fondo se suscribe al valor liquidativo diario." },
          { text: "¿Qué suele pasar con los fondos de gestión activa a largo plazo?", options: ["La mayoría bate al índice", "La mayoría no bate al índice, sobre todo por comisiones", "Todos lo baten"], correctIndex: 1, feedback: "Las comisiones altas son una losa año tras año." },
          { text: "¿Qué ventaja fiscal tienen los fondos en España?", options: ["No pagan impuestos nunca", "Permiten traspasos entre fondos sin tributar hasta la venta final", "Los dividendos están exentos"], correctIndex: 1, feedback: "El traspaso difiere el impuesto; se paga al reembolsar." },
        ],
      },
      {
        slug: "cripto",
        title: "Cripto",
        minutes: 6,
        body: {
          intro: [
            "Una criptomoneda es un activo digital que vive en una red descentralizada. A diferencia de una acción, no hay una empresa detrás que genere beneficios: su valor depende de cuánta gente la quiera usar o tener. Bitcoin es el caso más conocido y el único con más de quince años de historia.",
            "Eso hace que sea mucho más volátil: caídas del 50 % al 80 % han ocurrido varias veces. Puede tener sentido una parte pequeña de la cartera (muchos inversores hablan de un 1 % a un 5 %), nunca el grueso.",
          ],
          keyIdea: "Cripto es la parte más especulativa de la cartera: que sea pequeña y que entiendas qué compras.",
          outro: ["Cuidado con las monedas pequeñas que «suben mucho esta semana»: ese es exactamente el patrón de las que después desaparecen. La ficha Cripto del club muestra la capitalización: cuanto menor, más riesgo."],
          apply: "Mira el índice de miedo y codicia en la sección Cripto. ¿Qué crees que hace la mayoría cuando marca «codicia extrema»?",
        },
        questions: [
          { text: "¿Qué diferencia principal hay entre una acción y una criptomoneda?", options: ["La cripto genera beneficios como empresa", "Detrás de la cripto no hay una empresa con beneficios", "Son lo mismo"], correctIndex: 1, feedback: "Sin beneficios detrás, su valor depende del uso y la demanda." },
          { text: "¿Qué peso razonable suele darse a la cripto en una cartera?", options: ["La mayor parte", "Una parte pequeña (1 % a 5 %)", "Nada nunca"], correctIndex: 1, feedback: "Pequeña: su volatilidad puede ser extrema." },
          { text: "Una moneda pequeña que ha subido un 200 % en una semana…", options: ["Es una compra segura", "Es el patrón típico de las que luego desaparecen", "Seguirá subiendo seguro"], correctIndex: 1, feedback: "Las subidas verticales de monedas pequeñas suelen terminar mal." },
        ],
      },
    ],
  },
  {
    slug: "construir-una-cartera",
    level: 3,
    title: "Construir una cartera",
    description: "Diversificación, costes (TER y comisiones), aportaciones periódicas y rebalanceo.",
    lessons: [
      {
        slug: "diversificar",
        title: "Diversificar",
        minutes: 6,
        body: {
          intro: [
            "Diversificar es no depender de una sola empresa, sector o país. No reduce el riesgo del mercado entero (si todo cae, tu cartera cae), pero elimina el riesgo de que una sola apuesta te arruine.",
            "La estadística «Más diversificado» de la Liga cuenta activos distintos, pero diez acciones tecnológicas de EE. UU. no están diversificadas: se mueven juntas. Un ETF mundial sí lo está, porque mezcla sectores y países.",
          ],
          keyIdea: "Diversificar es la única ventaja gratis que da el mercado: aprovéchala.",
          outro: ["Un esquema sencillo para el club: un ETF mundial como base (la mayor parte), unas pocas acciones que entiendas y, si quieres, una pizca de cripto. Cada posición individual, por debajo del 10 % o 15 %."],
          apply: "Calcula qué porcentaje de tu cartera es tu mayor posición. Si supera el 25 %, escribe en el diario cómo lo vas a corregir.",
        },
        questions: [
          { text: "¿Qué riesgo elimina la diversificación?", options: ["El riesgo de que todo el mercado caiga", "El riesgo de que una sola apuesta te arruine", "Todos los riesgos"], correctIndex: 1, feedback: "El riesgo de mercado se queda; el específico desaparece." },
          { text: "Diez acciones tecnológicas estadounidenses…", options: ["Están bien diversificadas", "Se mueven juntas: poca diversificación real", "Son más seguras que un ETF mundial"], correctIndex: 1, feedback: "Mismo sector y país: diversificación aparente, no real." },
          { text: "Un peso razonable para una posición individual es…", options: ["Menos del 10-15 %", "El 50 %", "Da igual"], correctIndex: 0, feedback: "Así ninguna empresa decide tu resultado." },
        ],
      },
      {
        slug: "costes",
        title: "Costes",
        minutes: 6,
        body: {
          intro: [
            "Hay tres costes que pagas aunque no los veas: la comisión del producto (TER), la comisión del bróker por cada operación y el diferencial entre el precio de compra y el de venta. Los tres restan rentabilidad cada año, y el interés compuesto los amplifica.",
            "Con 100 € al mes, una comisión de 1 € por operación es un 1 % de entrada: ya empiezas perdiendo. Por eso muchos brókeres modernos ofrecen planes de aportación periódica sin comisión.",
          ],
          keyIdea: "La rentabilidad es incierta; los costes son seguros. Recorta lo seguro.",
          table: {
            headers: ["Escenario", "TER", "Valor a 30 años (100 €/mes, 6 % bruto)"],
            rows: [["ETF indexado", "0,20 %", "≈ 96.700 €"], ["Fondo activo", "1,50 %", "≈ 76.300 €"], ["Diferencia", "", "≈ 20.400 €"]],
            caption: "La comisión anual se lleva una quinta parte del resultado final.",
          },
          outro: ["En el club, registra siempre la comisión de cada operación: la estadística «Más operaciones» muestra las comisiones pagadas, y la rentabilidad las descuenta."],
          apply: "Suma las comisiones de tus operaciones en Operaciones. ¿Qué porcentaje de lo aportado representan?",
        },
        questions: [
          { text: "¿Cuáles son los tres costes de invertir?", options: ["TER, comisión del bróker y diferencial compra-venta", "Solo la comisión del bróker", "Impuestos, inflación y suerte"], correctIndex: 0, feedback: "Tres fugas silenciosas que conviene vigilar." },
          { text: "Una comisión de 1 € en una compra de 100 € es…", options: ["Irrelevante", "Un 1 % perdido antes de empezar", "Una ganancia"], correctIndex: 1, feedback: "Parece poco, pero cada mes y con el compuesto, pesa." },
          { text: "¿Por qué los costes importan más que la rentabilidad esperada?", options: ["Porque los costes son seguros y la rentabilidad no", "Porque son más grandes", "No importan"], correctIndex: 0, feedback: "Lo seguro se puede controlar; lo incierto, no." },
        ],
      },
      {
        slug: "aportar-cada-mes",
        title: "Aportar cada mes",
        minutes: 5,
        body: {
          intro: [
            "Aportar una cantidad fija cada mes (en inglés, dollar cost averaging) tiene dos ventajas: no necesitas acertar el momento y, de forma automática, compras más participaciones cuando el precio está bajo y menos cuando está alto.",
            "La paga del club es exactamente eso: 100 € cada mes, pase lo que pase. El error más común es esperar «a que baje» para entrar: el dinero se queda parado y el mercado, a largo plazo, sube más veces de las que baja.",
          ],
          keyIdea: "El mejor momento para invertir es cuando tienes el dinero; el segundo mejor, cada mes.",
          outro: ["Una aportación periódica convierte la volatilidad en aliada: las caídas son rebajas para la siguiente compra. Eso solo funciona si no te saltas aportaciones justo cuando da miedo."],
          apply: "Mira en Familia si has invertido la paga de este mes. Si está en efectivo, decide hoy a qué la destinas y escríbelo en el diario.",
        },
        questions: [
          { text: "Aportar una cantidad fija cada mes hace que…", options: ["Compres más cuando el precio está bajo y menos cuando está alto", "Compres siempre en el peor momento", "Pagues más impuestos"], correctIndex: 0, feedback: "El importe fijo compra más unidades baratas: promedia el precio." },
          { text: "¿Cuál es el error más común con las aportaciones?", options: ["Aportar demasiado", "Esperar «a que baje» y dejar el dinero parado", "Aportar en varios ETF"], correctIndex: 1, feedback: "Esperar el momento perfecto suele costar más que entrar hoy." },
          { text: "Cuando el mercado cae, una aportación periódica…", options: ["Debe suspenderse", "Compra más barato: es una ventaja", "Es ilegal"], correctIndex: 1, feedback: "Las caídas son rebajas para quien sigue aportando." },
        ],
      },
      {
        slug: "rebalancear",
        title: "Rebalancear",
        minutes: 5,
        body: {
          intro: [
            "Con el tiempo, lo que sube ocupa cada vez más cartera. Si decidiste 80 % ETF mundial y 20 % acciones y las acciones suben mucho, puedes acabar con 60/40 sin haber decidido nada. Rebalancear es volver a los pesos que elegiste.",
            "Se hace vendiendo lo que ha crecido demasiado y comprando lo que se ha quedado atrás, o, más sencillo y sin impuestos, dirigiendo las nuevas aportaciones a lo que pesa menos.",
          ],
          keyIdea: "Rebalancear obliga a vender caro y comprar barato sin tener que adivinar nada.",
          outro: ["Con qué frecuencia: una vez al año, o cuando un peso se desvíe más de 5 puntos del objetivo. Más a menudo solo añade comisiones."],
          apply: "Anota en el diario los pesos objetivo de tu cartera (por ejemplo, 70 % ETF, 25 % acciones, 5 % cripto). Compáralos con los reales en Operaciones.",
        },
        questions: [
          { text: "¿Qué es rebalancear?", options: ["Vender todo y empezar de cero", "Volver a los pesos de cartera que decidiste", "Comprar lo que más ha subido"], correctIndex: 1, feedback: "Es mantener la estrategia a pesar de los movimientos del mercado." },
          { text: "La forma más sencilla de rebalancear sin pagar impuestos es…", options: ["Vender la mitad de todo", "Dirigir las nuevas aportaciones a lo que pesa menos", "No hacer nada"], correctIndex: 1, feedback: "Las aportaciones nuevas corrigen los pesos sin vender." },
          { text: "¿Con qué frecuencia conviene rebalancear?", options: ["Cada semana", "Una vez al año o cuando un peso se desvíe mucho", "Nunca"], correctIndex: 1, feedback: "Más frecuencia solo suma comisiones y nervios." },
        ],
      },
    ],
  },
  {
    slug: "analizar-empresas",
    level: 4,
    title: "Analizar empresas",
    description: "Leer resultados, PER, dividendos y deuda sin ahogarse en el informe anual.",
    lessons: [
      {
        slug: "cuenta-de-resultados",
        title: "Cuenta de resultados",
        minutes: 6,
        body: {
          intro: [
            "La cuenta de resultados cuenta, en tres líneas, cómo le ha ido a una empresa en un periodo: ingresos (lo que vende), beneficio operativo (lo que queda tras pagar lo que cuesta vender) y beneficio neto (lo que queda tras intereses e impuestos).",
            "Lo que importa no es un número aislado sino su evolución: ¿crecen los ingresos año tras año? ¿El margen (beneficio dividido entre ingresos) se mantiene o se estrecha? Una empresa que vende más pero gana menos tiene un problema.",
          ],
          keyIdea: "Mira la tendencia de ingresos y márgenes, no el titular de un trimestre.",
          outro: ["Las empresas publican resultados cada tres meses. La ficha de cada acción del club muestra la fecha de los próximos; el precio suele moverse mucho ese día, en cualquier dirección."],
          apply: "Busca los últimos resultados de una empresa que tengas en cartera. ¿Crecen los ingresos? ¿Y el beneficio?",
        },
        questions: [
          { text: "¿Qué es el margen de una empresa?", options: ["El beneficio dividido entre los ingresos", "El número de empleados", "El precio de la acción"], correctIndex: 0, feedback: "El margen dice cuánto de cada euro vendido se convierte en beneficio." },
          { text: "Una empresa vende más pero gana menos. ¿Qué indica?", options: ["Que todo va bien", "Que sus márgenes se estrechan: posible problema", "Que va a subir seguro"], correctIndex: 1, feedback: "Crecer sin beneficio no crea valor." },
          { text: "¿Qué conviene mirar en una cuenta de resultados?", options: ["Un solo trimestre", "La tendencia de varios años", "Solo el beneficio neto"], correctIndex: 1, feedback: "Un trimestre puede ser ruido; la tendencia cuenta la historia." },
        ],
      },
      {
        slug: "per",
        title: "PER",
        minutes: 6,
        body: {
          intro: [
            "El PER (precio entre beneficio por acción) dice cuántos años de beneficio actual estás pagando por la empresa. Un PER de 15 significa que pagas 15 veces lo que gana al año; a beneficio constante, tardarías 15 años en recuperar la inversión.",
            "Un PER alto (30, 40) no es necesariamente caro: el mercado espera que el beneficio crezca mucho. Un PER bajo (6, 8) no es necesariamente barato: puede que el mercado espere que caiga. Compara siempre con empresas del mismo sector y con la historia de la propia empresa.",
          ],
          keyIdea: "El PER es un termómetro de expectativas: dice cuánto crecimiento ya está pagado en el precio.",
          table: {
            headers: ["PER", "Lectura habitual", "Ejemplo de sector"],
            rows: [["6–10", "Bajo: negocio maduro o en duda", "Banca, energía"], ["12–20", "Medio: crecimiento moderado", "Consumo, industria"], ["25+", "Alto: mucho crecimiento esperado", "Tecnología"]],
            caption: "Orientativo; cada sector tiene su rango normal.",
          },
          outro: ["La ficha de cada acción del club muestra el PER actual y el estimado (sobre el beneficio previsto). Si el estimado es mucho menor, el mercado espera que el beneficio crezca."],
          apply: "Compara el PER de dos empresas del mismo sector de tu lista de seguimiento. ¿Cuál tiene más crecimiento pagado en el precio?",
        },
        questions: [
          { text: "Un PER de 20 significa que…", options: ["Pagas 20 veces el beneficio anual", "La acción vale 20 €", "La empresa tiene 20 años"], correctIndex: 0, feedback: "A beneficio constante, 20 años para recuperar lo pagado." },
          { text: "Un PER muy alto suele indicar que…", options: ["La acción es una ganga", "El mercado espera mucho crecimiento", "La empresa no gana dinero"], correctIndex: 1, feedback: "Las expectativas altas ya están en el precio: hay que cumplirlas." },
          { text: "¿Con qué conviene comparar el PER?", options: ["Con el de cualquier empresa", "Con el de su sector y su propia historia", "Con el precio de la acción"], correctIndex: 1, feedback: "Cada sector tiene su rango normal." },
        ],
      },
      {
        slug: "dividendos",
        title: "Dividendos",
        minutes: 5,
        body: {
          intro: [
            "El dividendo es la parte del beneficio que la empresa reparte a los accionistas. La rentabilidad por dividendo es el dividendo anual dividido entre el precio: 3 % significa que por cada 100 € en acciones recibes 3 € al año.",
            "No es dinero gratis: el día que se paga, la acción baja ese mismo importe. Lo que importa es si el dividendo es sostenible (que no reparta más de lo que gana) y si crece con los años.",
          ],
          keyIdea: "Un dividendo alto que la empresa no puede pagar es una trampa; uno moderado que crece cada año, un tesoro.",
          outro: ["Cuidado con rentabilidades por dividendo muy altas (8 %, 10 %): a menudo es porque el precio se ha desplomado y el mercado espera un recorte. Fiscalmente, los dividendos tributan cada año; la acumulación en ETF, solo al vender."],
          apply: "Mira la rentabilidad por dividendo de las acciones de tu lista. ¿Alguna supera el 6 %? Investiga por qué.",
        },
        questions: [
          { text: "Una rentabilidad por dividendo del 3 % significa…", options: ["Que la acción sube un 3 % al año", "Que recibes 3 € al año por cada 100 € invertidos", "Que la empresa crece un 3 %"], correctIndex: 1, feedback: "Es el dividendo anual sobre el precio actual." },
          { text: "El día que se paga el dividendo, la acción…", options: ["Sube ese importe", "Baja ese importe", "No cambia"], correctIndex: 1, feedback: "El dinero sale de la empresa: el precio lo descuenta." },
          { text: "Una rentabilidad por dividendo del 10 % suele ser…", options: ["Una oportunidad segura", "Una señal de alarma: posible recorte", "Lo normal"], correctIndex: 1, feedback: "Normalmente indica un precio hundido y un dividendo en peligro." },
        ],
      },
      {
        slug: "deuda",
        title: "Deuda",
        minutes: 5,
        body: {
          intro: [
            "Las empresas se financian con dinero de los accionistas y con deuda. Algo de deuda es normal y barata; demasiada convierte un bache en una quiebra, porque los intereses hay que pagarlos aunque las ventas caigan.",
            "Una medida sencilla: deuda neta entre beneficio operativo (EBITDA). Por debajo de 2 es cómodo; por encima de 4, la empresa depende de que todo salga bien. Los sectores con ingresos muy estables (eléctricas, autopistas) soportan más deuda que los cíclicos.",
          ],
          keyIdea: "La deuda no mata en los años buenos; mata en los malos. Mírala antes de que lleguen.",
          outro: ["Cuando los tipos de interés suben, las empresas muy endeudadas sufren el doble: pagan más intereses y el mercado les exige más. Es el riesgo que la Recomendación del Club no ve, porque solo mira precio y volumen."],
          apply: "Busca la deuda neta y el EBITDA de una empresa de tu cartera. Calcula la ratio y anótala en el diario.",
        },
        questions: [
          { text: "¿Por qué es peligrosa la deuda excesiva?", options: ["Porque los intereses se pagan aunque las ventas caigan", "Porque la deuda siempre es mala", "Porque sube el PER"], correctIndex: 0, feedback: "La deuda convierte un mal año en una crisis." },
          { text: "Una ratio deuda neta / EBITDA de 5 es…", options: ["Cómoda", "Elevada: la empresa depende de que todo vaya bien", "Imposible"], correctIndex: 1, feedback: "Por encima de 4, poco margen para sorpresas." },
          { text: "¿Qué empresas soportan mejor la deuda?", options: ["Las de ingresos muy estables", "Las cíclicas", "Las que no tienen beneficios"], correctIndex: 0, feedback: "Ingresos previsibles permiten pagar intereses con tranquilidad." },
        ],
      },
    ],
  },
  {
    slug: "analisis-tecnico",
    level: 5,
    title: "Análisis técnico",
    description: "Medias móviles, RSI, MACD, soportes y resistencias: los bloques de la Recomendación del Club.",
    lessons: [
      {
        slug: "tendencia-y-medias",
        title: "Tendencia y medias",
        minutes: 7,
        body: {
          intro: [
            "El análisis técnico no mira la empresa, mira el precio: parte de la idea de que todo lo que se sabe ya está en la cotización y que los precios se mueven en tendencias. Una media móvil es el precio medio de las últimas N sesiones; suaviza el ruido y muestra la dirección.",
            "Las tres que usa el club: 20 sesiones (un mes, corto plazo), 50 (un trimestre, medio) y 200 (un año, tendencia de fondo). Precio por encima de la de 200 = tendencia alcista de fondo. Cuando la de 50 cruza por encima de la de 200 se llama cruce dorado; al revés, cruce de la muerte.",
          ],
          keyIdea: "Primero la tendencia de fondo (media de 200); después, todo lo demás. No compres contra ella sin una señal de giro clara.",
          outro: ["El ADX mide la fuerza de la tendencia, no su dirección: por encima de 25 hay tendencia; por debajo de 20, el precio va de lado y las medias dan señales falsas. Es el bloque «Tendencia» (30 %) de la Recomendación del Club."],
          apply: "Abre la ficha de una acción y mira dónde está el precio respecto a la media de 200. ¿Coincide con lo que dice el bloque Tendencia?",
        },
        questions: [
          { text: "¿Qué indica que el precio esté por encima de la media de 200 sesiones?", options: ["Tendencia de fondo alcista", "Sobrecompra", "Que va a caer"], correctIndex: 0, feedback: "La media de 200 es el termómetro del largo plazo." },
          { text: "¿Qué es un cruce dorado?", options: ["La media de 50 cruza por encima de la de 200", "El precio toca un máximo", "El RSI supera 70"], correctIndex: 0, feedback: "Señal clásica de cambio a tendencia alcista." },
          { text: "Un ADX por debajo de 20 indica…", options: ["Tendencia fuerte", "Mercado lateral: las medias dan señales poco fiables", "Caída inminente"], correctIndex: 1, feedback: "Sin tendencia, las señales de medias fallan mucho." },
        ],
      },
      {
        slug: "rsi-y-momentum",
        title: "RSI y momentum",
        minutes: 7,
        body: {
          intro: [
            "El momentum mide la velocidad del movimiento. El RSI (0 a 100) compara las subidas con las bajadas de los últimos 14 días: por encima de 70 el precio ha subido muy rápido (sobrecompra, probable pausa); por debajo de 30 ha caído muy rápido (sobreventa, probable rebote). Entre 40 y 60, neutral.",
            "El MACD resta dos medias exponenciales (12 y 26 sesiones) y la compara con su propia media (señal, 9 sesiones). Cuando el MACD cruza por encima de la señal, el impulso gira al alza; por debajo, a la baja. El histograma muestra la distancia entre ambas.",
          ],
          keyIdea: "El RSI dice si el movimiento se ha pasado de revoluciones; el MACD, si el impulso está cambiando de dirección.",
          outro: ["Una divergencia (el precio hace un máximo nuevo pero el RSI no) avisa de que la subida pierde fuerza. El estocástico funciona como el RSI, pero es más rápido. Juntos forman el bloque «Momentum» (25 %)."],
          apply: "Busca en tu lista una acción con RSI por encima de 65. ¿Qué dice la ficha sobre su momentum?",
        },
        questions: [
          { text: "Un RSI de 78 indica…", options: ["Sobrecompra: el precio ha subido muy rápido", "Sobreventa", "Tendencia bajista"], correctIndex: 0, feedback: "Por encima de 70, cuidado con perseguir el precio." },
          { text: "El MACD cruza por encima de su línea de señal. ¿Qué significa?", options: ["El impulso gira al alza", "El impulso gira a la baja", "Nada"], correctIndex: 0, feedback: "Es la señal alcista clásica del MACD." },
          { text: "¿Qué es una divergencia bajista?", options: ["El precio hace máximos nuevos y el RSI no", "El precio y el RSI suben juntos", "El RSI está en 50"], correctIndex: 0, feedback: "La subida continúa pero con menos fuerza: aviso." },
        ],
      },
      {
        slug: "volumen",
        title: "Volumen",
        minutes: 5,
        body: {
          intro: [
            "El volumen es cuántas acciones cambian de manos cada día. Confirma o desmiente el movimiento del precio: una subida con mucho volumen tiene respaldo; una subida con poco volumen es sospechosa. Las rupturas de resistencias con volumen superior a 1,5 veces la media son las más fiables.",
            "El OBV (On Balance Volume) acumula el volumen de los días de subida y resta el de los de bajada. Si el precio sube y el OBV no, hay distribución: alguien grande está vendiendo en la subida.",
          ],
          keyIdea: "El precio dice qué pasa; el volumen dice cuánta gente lo respalda.",
          outro: ["Es el bloque «Volumen» (20 %) de la Recomendación del Club. En ETF muy líquidos el volumen es menos informativo; en acciones pequeñas, decisivo."],
          apply: "Mira el volumen de tu acción favorita en el gráfico. ¿Los días de subida tienen más volumen que los de bajada?",
        },
        questions: [
          { text: "Una subida con volumen muy bajo es…", options: ["Muy fiable", "Sospechosa: poco respaldo", "Imposible"], correctIndex: 1, feedback: "Sin volumen, la subida puede deshacerse con facilidad." },
          { text: "¿Qué es una ruptura con volumen?", options: ["Superar una resistencia con volumen muy superior a la media", "Que el precio caiga a cero", "Un error de datos"], correctIndex: 0, feedback: "Las rupturas con volumen son las que suelen continuar." },
          { text: "El precio sube pero el OBV baja. Eso sugiere…", options: ["Acumulación", "Distribución: se vende en la subida", "Nada"], correctIndex: 1, feedback: "Divergencia precio-volumen: aviso de debilidad." },
        ],
      },
      {
        slug: "soportes-y-resistencias",
        title: "Soportes y resistencias",
        minutes: 6,
        body: {
          intro: [
            "Un soporte es un nivel donde el precio ha dejado de caer y ha rebotado varias veces; una resistencia, donde ha dejado de subir. No son magia: son precios donde mucha gente compró o vendió y donde volverá a actuar. Cuando una resistencia se rompe, suele convertirse en soporte.",
            "Las bandas de Bollinger dibujan un canal alrededor de la media de 20 sesiones (dos desviaciones típicas): el precio rara vez sale de él. Cuando el canal se estrecha mucho (squeeze), suele venir un movimiento fuerte.",
          ],
          keyIdea: "Los soportes y resistencias son el mapa: dicen dónde poner el stop y dónde esperar el objetivo.",
          outro: ["El ATR mide cuánto se mueve el precio en un día típico. El club lo usa para el stop (1,5 a 2 veces el ATR) y para descartar objetivos demasiado cercanos. Todo esto es el bloque «Volatilidad y estructura» (25 %)."],
          apply: "En la ficha de una acción, localiza el soporte y la resistencia. ¿A qué distancia está el precio de cada uno?",
        },
        questions: [
          { text: "¿Qué es un soporte?", options: ["Un nivel donde el precio ha rebotado al alza varias veces", "El precio máximo del año", "La media de 200 sesiones"], correctIndex: 0, feedback: "Donde los compradores han aparecido antes, suelen volver." },
          { text: "Cuando una resistencia se rompe al alza…", options: ["Suele convertirse en soporte", "Desaparece para siempre", "El precio vuelve siempre abajo"], correctIndex: 0, feedback: "Cambio de papel: la antigua resistencia frena ahora las caídas." },
          { text: "Un squeeze de Bollinger anticipa…", options: ["Un movimiento fuerte, en cualquier dirección", "Una caída segura", "Una subida segura"], correctIndex: 0, feedback: "La calma extrema precede a la tormenta; la dirección no se sabe." },
        ],
      },
    ],
  },
  {
    slug: "disciplina-y-riesgo",
    level: 6,
    title: "Disciplina y riesgo",
    description: "Stop loss, ratio riesgo/beneficio, tamaño de posición y los sesgos que nos hacen perder.",
    lessons: [
      {
        slug: "stop-loss",
        title: "Stop loss",
        minutes: 6,
        body: {
          intro: [
            "Un stop loss es el precio al que reconoces que te has equivocado y vendes. Se decide antes de comprar, nunca después, porque después el precio ya te está hablando al oído. Debe apoyarse en la estructura (justo debajo de un soporte) o en la volatilidad (1,5 a 2 veces el ATR), no en un porcentaje al azar.",
            "Un stop demasiado ajustado salta con el ruido diario; uno demasiado amplio deja perder demasiado. Si el stop que necesita el gráfico supone perder más de lo que aceptas, la solución no es subir el stop, sino comprar menos.",
          ],
          keyIdea: "El stop no se discute cuando llega: se decide antes y se respeta.",
          outro: ["Con una cartera a largo plazo de ETF indexados el stop tiene poco sentido: las caídas son el precio del billete. El stop es para posiciones tácticas en acciones individuales o cripto."],
          apply: "Para cada acción individual que tengas, escribe en el diario el precio al que venderías. Compáralo con el stop de la Recomendación del Club.",
        },
        questions: [
          { text: "¿Cuándo se decide el stop loss?", options: ["Antes de comprar", "Cuando el precio empieza a caer", "Nunca"], correctIndex: 0, feedback: "Decidido en frío, se respeta mejor." },
          { text: "¿Dónde debe apoyarse un stop?", options: ["En un porcentaje redondo cualquiera", "En un soporte o en un múltiplo del ATR", "En lo que te gustaría perder"], correctIndex: 1, feedback: "La estructura y la volatilidad del valor marcan el stop razonable." },
          { text: "El stop que necesita el gráfico supone perder más de lo que aceptas. ¿Qué haces?", options: ["Subes el stop", "Compras menos cantidad", "No pones stop"], correctIndex: 1, feedback: "El tamaño de la posición se adapta al stop, no al revés." },
        ],
      },
      {
        slug: "riesgo-beneficio",
        title: "Riesgo/beneficio",
        minutes: 5,
        body: {
          intro: [
            "El ratio riesgo/beneficio compara lo que puedes perder (distancia hasta el stop) con lo que esperas ganar (distancia hasta el objetivo). Si arriesgas 1 € para ganar 2 €, el ratio es 1:2. Con 1:2, puedes equivocarte la mitad de las veces y aun así ganar dinero.",
            "Por eso la Recomendación del Club no da COMPRAR si el ratio hasta el primer objetivo es menor de 1:2: aunque todo lo demás sea perfecto, la apuesta no compensa. Mejor esperar un retroceso a la zona de entrada, que mejora el ratio sin cambiar la tesis.",
          ],
          keyIdea: "No necesitas acertar siempre; necesitas que tus aciertos paguen más de lo que cuestan tus errores.",
          table: {
            headers: ["Ratio", "Aciertos necesarios para no perder", "Lectura"],
            rows: [["1:1", "50 %", "Moneda al aire"], ["1:2", "34 %", "Mínimo del club"], ["1:3", "25 %", "Excelente si la tesis es sólida"]],
            caption: "Porcentaje de aciertos a partir del cual la estrategia gana dinero.",
          },
          outro: ["Un buen ratio con una tesis mala sigue siendo una mala operación. El ratio es un filtro, no una razón para comprar."],
          apply: "Mira el ratio riesgo/beneficio de tres valores en el Ranking del Club. ¿Cuántos pasan de 1:2?",
        },
        questions: [
          { text: "Arriesgas 2 € para ganar 6 €. ¿Qué ratio es?", options: ["1:3", "1:2", "3:1"], correctIndex: 0, feedback: "Riesgo 1, beneficio 3." },
          { text: "Con un ratio 1:2, ¿qué porcentaje de aciertos necesitas para no perder?", options: ["Más del 50 %", "Alrededor del 34 %", "El 100 %"], correctIndex: 1, feedback: "Un acierto compensa dos fallos." },
          { text: "El ratio es excelente pero la tesis es floja. ¿Qué haces?", options: ["Compras: el ratio manda", "No compras: el ratio es un filtro, no una razón", "Compras el doble"], correctIndex: 1, feedback: "Primero la tesis; el ratio solo dice si compensa." },
        ],
      },
      {
        slug: "tamano-de-posicion",
        title: "Tamaño de posición",
        minutes: 6,
        body: {
          intro: [
            "Cuánto compras importa más que qué compras. La regla clásica: no arriesgar en una sola operación más del 1 % o 2 % de la cartera. «Arriesgar» es lo que perderías si salta el stop, no lo que inviertes.",
            "Ejemplo con una cartera de 1.000 €: aceptas perder 20 € (2 %). Si el stop está un 10 % por debajo del precio, la posición máxima es 200 €. Si el stop tiene que estar un 20 % por debajo (acción muy volátil), la posición máxima baja a 100 €.",
          ],
          keyIdea: "La volatilidad decide el tamaño: cuanto más se mueve un activo, menos cantidad te puedes permitir.",
          outro: ["Esto explica por qué la cripto debe ser pequeña: con un ATR del 4 % diario, cualquier stop razonable queda lejos y la posición tiene que ser mínima para que el riesgo encaje."],
          apply: "Calcula el riesgo de tu mayor posición: tamaño × distancia al stop. ¿Supera el 2 % de tu cartera?",
        },
        questions: [
          { text: "¿Qué significa «arriesgar» el 2 % de la cartera?", options: ["Invertir el 2 %", "Que si salta el stop pierdes el 2 %", "Ganar el 2 %"], correctIndex: 1, feedback: "El riesgo es la pérdida si te equivocas, no el importe invertido." },
          { text: "Cartera de 1.000 €, riesgo aceptado 20 €, stop al 10 %. Posición máxima:", options: ["200 €", "100 €", "1.000 €"], correctIndex: 0, feedback: "20 € de riesgo / 10 % de distancia = 200 € de posición." },
          { text: "Cuanto más volátil es un activo…", options: ["Más cantidad puedes comprar", "Menos cantidad te puedes permitir", "Da igual"], correctIndex: 1, feedback: "El stop queda más lejos, así que la posición debe ser menor." },
        ],
      },
      {
        slug: "sesgos",
        title: "Sesgos",
        minutes: 7,
        body: {
          intro: [
            "El mayor riesgo de tu cartera eres tú. Aversión a la pérdida: duele el doble perder 10 € que ganar 10 €, así que mantienes las posiciones perdedoras «hasta recuperar» y vendes las ganadoras demasiado pronto. Efecto rebaño: compras lo que todo el mundo compra, justo cuando ya ha subido.",
            "Sesgo de confirmación: solo lees lo que apoya tu idea. Exceso de confianza: tras dos aciertos crees que sabes, y aumentas el tamaño justo antes del error. Anclaje: te aferras al precio al que compraste, que al mercado le da exactamente igual.",
          ],
          keyIdea: "No puedes eliminar los sesgos, pero sí ponerles reglas delante: el diario, el stop y el tamaño fijo.",
          outro: ["El diario del club existe por esto. Escribir el porqué antes de comprar y la condición de venta convierte una emoción en una decisión que se puede revisar. Dentro de un año, lee tus entradas: ahí están tus sesgos, uno por uno."],
          apply: "Lee tus tres últimas entradas del diario. ¿Cuál de estos sesgos reconoces en alguna?",
        },
        questions: [
          { text: "¿Qué es la aversión a la pérdida?", options: ["Perder duele más de lo que alegra ganar lo mismo", "Odiar las acciones", "Preferir los bonos"], correctIndex: 0, feedback: "Por eso aguantamos lo que pierde y vendemos pronto lo que gana." },
          { text: "¿Qué es el anclaje?", options: ["Aferrarse al precio de compra, que al mercado no le importa", "Poner un stop", "Diversificar"], correctIndex: 0, feedback: "Tu precio de compra es historia; el mercado solo mira el futuro." },
          { text: "¿Cuál es la mejor defensa contra los sesgos?", options: ["Ser más listo", "Reglas escritas antes de decidir: diario, stop y tamaño", "Operar más rápido"], correctIndex: 1, feedback: "Las reglas en frío ganan a la intuición en caliente." },
        ],
      },
    ],
  },
];
