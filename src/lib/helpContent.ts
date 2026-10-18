/**
 * Contenido de la ayuda: qué hace cada parte de la web y cómo se usa. Texto plano en español, agrupado por temas,
 * para que la página de ayuda lo pinte y el buscador lo filtre. Al añadir una función, añade aquí su explicación.
 */

export type HelpAudience = "todos" | "presidente";

export type HelpSection = {
  id: string;
  title: string;
  audience: HelpAudience;
  summary: string;
  points: string[];
  href?: string;
  cta?: string;
};

export type HelpGroup = { id: string; title: string; intro: string; sections: HelpSection[] };

export const HOW_IT_WORKS: { title: string; text: string }[] = [
  { title: "El presidente publica la cartera del mes", text: "Una lección corta y entre dos y cuatro opciones (acciones, ETF, cripto o materias primas). Al publicarla, cada miembro recibe su paga para ese mes." },
  { title: "La familia recibe el aviso", text: "Un WhatsApp personalizado con el nombre de cada uno, su importe, el plazo y el enlace directo a la cartera." },
  { title: "Cada miembro investiga, decide y explica", text: "Mira la ficha de cada opción, reparte su importe y escribe por qué. Sin porqué no hay decisión." },
  { title: "Se compra en vuestro bróker y se anota aquí", text: "El Club no mueve dinero: el adulto titular compra en su bróker y la operación queda registrada con su razón." },
  { title: "Liga, logros y repaso", text: "La liga compara la rentabilidad sobre lo aportado; al cerrar la cartera, el repaso enseña qué eligió cada uno y cómo le fue." },
];

export const HELP: HelpGroup[] = [
  {
    id: "aprender",
    title: "Aprender",
    intro: "Lo que ves al entrar y la formación.",
    sections: [
      {
        id: "inicio", title: "Inicio", audience: "todos", href: "/inicio", cta: "Ir a Inicio",
        summary: "Tu resumen del día: el siguiente paso, tu aprendizaje, tu cartera y lo último del diario de la familia.",
        points: [
          "«Tu siguiente paso» propone una sola acción, por prioridad: decidir en la cartera del mes si te toca, explicar una compra que aún no tiene porqué o seguir con la siguiente lección.",
          "«Tu cartera» muestra la rentabilidad sobre lo que has aportado, el valor, el efectivo y tu puesto en la liga. Pulsa «¿Qué significa cada dato?» para la explicación.",
          "El botón «Escribir en el diario» guarda una nota o el porqué de una compra o venta.",
          "Si eres presidente, verás además tus tareas pendientes (paga sin repartir, cartera sin publicar, plazos, avisos) y cuántas familias usan tus propuestas.",
        ],
      },
      {
        id: "academia", title: "Academia", audience: "todos", href: "/academia", cta: "Ir a la Academia",
        summary: "Seis niveles de formación, del ahorro al análisis técnico. Cada lección dura menos de diez minutos y termina con un quiz.",
        points: [
          "Niveles: Novato (fundamentos), Aprendiz (productos), Inversor (construir una cartera), Estratega (analizar empresas), Experto (análisis técnico) y Leyenda (disciplina y riesgo).",
          "Una lección se supera acertando todas las preguntas del quiz; puedes repetirla las veces que quieras. Al completar un curso se desbloquea el siguiente.",
          "Cada lección superada suma 10 puntos y cada logro otros 10; cada 30 puntos subes de nivel. El nivel aparece junto a tu nombre.",
          "Abajo verás el progreso de toda la familia: nivel, lecciones, acierto en los quiz y entradas de diario.",
        ],
      },
    ],
  },
  {
    id: "invertir",
    title: "Invertir",
    intro: "La cartera del mes, la liga, tus operaciones y la información de mercado.",
    sections: [
      {
        id: "cartera", title: "Cartera del mes", audience: "todos", href: "/cartera", cta: "Ir a la cartera del mes",
        summary: "La propuesta del mes: la lección del presidente, las opciones entre las que elegir y tu decisión.",
        points: [
          "Si la cartera está abierta y tienes importe, verás «Tu decisión está pendiente» y cuántos días quedan. En el menú, el punto ámbar parpadeante te lo recuerda.",
          "Para decidir: elige entre el mínimo y el máximo de opciones que marque el presidente, reparte tu importe entre ellas y escribe tu porqué (y, si quieres, qué te haría vender).",
          "Tus decisiones quedan registradas como compras en Operaciones y como entradas en tu diario. Las compras se hacen después en el bróker de la familia.",
          "Las decisiones de los demás se ven cuando envías la tuya, para que nadie copie.",
          "En «Historial» están todas las carteras anteriores con su repaso.",
        ],
      },
      {
        id: "historial", title: "Historial y repaso", audience: "todos", href: "/cartera/historial", cta: "Ver el historial",
        summary: "Cada cartera cerrada queda archivada con un repaso: qué ha pasado desde entonces y qué eligió cada uno.",
        points: [
          "Las opciones aparecen ordenadas de mejor a peor desde la publicación, con quién eligió cada una.",
          "Para cada miembro: qué compró, a qué precio, cuánto vale hoy, su porqué entre comillas y cuánto habría dado la mejor opción.",
          "La idea no es lamentarse, sino comprobar si el porqué de cada decisión sigue teniendo sentido.",
        ],
      },
      {
        id: "liga", title: "Liga de inversión", audience: "todos", href: "/inversiones", cta: "Ver la liga",
        summary: "El ranking de la familia por rentabilidad sobre lo aportado, con niveles, puntos y logros.",
        points: [
          "La rentabilidad se calcula sobre lo que cada uno ha aportado (paga y aportaciones), así compiten igual quien entró antes y quien entró después.",
          "Cada tarjeta muestra valor, aportado, ganancia, efectivo sin invertir, nivel, puntos, logros y lecciones.",
          "Hay 27 logros: desde la primera operación o el primer porqué hasta mantener una posición un año, completar la Academia o liderar la liga.",
          "Debajo, las estadísticas del club: patrimonio total, mejor cartera, mayor ganancia, mejor y peor valor, el más popular y el más activo.",
        ],
      },
      {
        id: "operaciones", title: "Operaciones", audience: "todos", href: "/operaciones", cta: "Ir a Operaciones",
        summary: "Tu cartera real: posiciones, registro de compras y ventas, y aportaciones.",
        points: [
          "Arriba: valor de tu cartera, rentabilidad, efectivo disponible y beneficio realizado por ventas.",
          "«Registrar operación»: busca el activo por nombre o símbolo (AAPL, SAN.MC, VWCE.DE, BTC-EUR…), indica cantidad, precio, divisa, comisión, fecha y bróker. Si compras en dólares, se convierte a euros con el cambio de ese día.",
          "Si una compra supera tu efectivo, la diferencia se anota como «aportación propia» automáticamente.",
          "Las compras de la cartera del mes llevan la etiqueta «Decisión del mes»; puedes corregir su precio y cantidad si en el bróker salió distinto.",
          "No se puede vender más de lo que tienes en esa fecha: el registro lo comprueba.",
        ],
      },
      {
        id: "mercados", title: "Acciones, ETF, Cripto y Materias primas", audience: "todos", href: "/acciones", cta: "Ver acciones",
        summary: "Listas de valores con precio, variación y la lectura del Club, y una ficha completa de cada uno.",
        points: [
          "Cada lista tiene los valores que sigue la familia más los que alguien tiene en cartera. Puedes añadir valores con el buscador.",
          "La columna «Club de inversión» muestra la lectura técnica de −2 a +2 con su barra; «PER vs histórico» indica si la acción está barata o cara frente a su propia historia.",
          "La etiqueta ámbar «Resultados en N d» avisa de que la empresa presenta resultados en menos de diez días: el precio puede moverse mucho.",
          "«Ranking del Club» ordena todos los valores de la lista por su puntuación.",
          "Los precios vienen de Yahoo Finance y CoinGecko, con hasta 15 minutos de retraso.",
        ],
      },
      {
        id: "ficha", title: "La ficha de un valor", audience: "todos", href: "/acciones", cta: "Abrir una ficha",
        summary: "Todo lo necesario para decidir con datos: precio, rentabilidades, lectura del Club, PER, dividendos, analistas y noticias.",
        points: [
          "Lectura del Club: una puntuación de −2 (vender) a +2 (comprar) que combina tendencia, momentum, volumen, volatilidad y valoración. Entre −0,3 y +0,3 es neutral; el sesgo (▲ alcista o ▼ bajista) indica hacia dónde se inclina.",
          "Cada bloque tiene su botón «¿Qué mide?» con la explicación. Es una lectura automática para aprender, nunca una orden de compra o venta.",
          "PER histórico: el PER de hoy comparado con el de los últimos años (percentil). Un percentil bajo significa que cotiza barata frente a su historia; uno alto, cara. Cuidado con la «posible trampa de valor».",
          "También verás dividendos, la opinión media de los analistas, el próximo día de resultados y el contexto macro (tipos del BCE, inflación).",
          "«Escribir mi razón» guarda tu porqué en el diario; «Operar, tras explicarlo» te lleva a registrar la operación.",
        ],
      },
    ],
  },
  {
    id: "club",
    title: "Club",
    intro: "La familia, el perfil y cómo crece el Club.",
    sections: [
      {
        id: "familia", title: "Familia y paga", audience: "todos", href: "/familia", cta: "Ir a Familia",
        summary: "Quiénes sois, la paga mensual y las aportaciones de cada uno.",
        points: [
          "La paga es el importe que cada miembro invierte al mes. El presidente la fija y se reparte sola al publicar la cartera del mes, o a mano desde aquí.",
          "Las aportaciones son el dinero que entra en la cartera de cada uno: paga, regalos o extras. Un importe negativo retira dinero.",
          "Todo el mundo ve las aportaciones de la familia; solo el presidente puede registrarlas.",
        ],
      },
      {
        id: "perfil", title: "Mi perfil", audience: "todos", href: "/perfil", cta: "Ir a mi perfil",
        summary: "Tu foto, tu móvil para los avisos por WhatsApp y tu contraseña.",
        points: [
          "La foto aparece en la liga, el diario y la familia.",
          "El móvil solo se usa para que el presidente te mande el aviso de la cartera del mes por WhatsApp. Nadie fuera de tu familia lo ve.",
          "Para cambiar la contraseña necesitas la actual. Si la olvidas, pide al presidente un enlace para elegir una nueva (vale una hora).",
          "El botón «Oscuro / Claro» del pie del menú cambia el tema de toda la web.",
        ],
      },
      {
        id: "invitar", title: "Invitar a otras familias", audience: "todos", href: "/invitar", cta: "Invitar a una familia",
        summary: "El Club solo crece por invitación: cada familia puede invitar a cinco familias más.",
        points: [
          "Quien recibe una invitación de familia funda su propio club, lo preside y recibe a su vez cinco invitaciones.",
          "Las cinco invitaciones son del club y las gestiona el presidente.",
          "Al crearla puedes poner el nombre, el móvil y el email. Con email, el correo sale al momento; con móvil, «Enviar por WhatsApp» abre el chat con el mensaje ya escrito. También puedes copiar el enlace.",
          "Una invitación usada ocupa su hueco para siempre; una pendiente se libera si la anulas o caduca.",
        ],
      },
    ],
  },
  {
    id: "presidente",
    title: "Para el presidente",
    intro: "Herramientas para poner en marcha y llevar el club. Solo las ve quien preside.",
    sections: [
      {
        id: "gestion", title: "Gestión de carteras", audience: "presidente", href: "/cartera/gestion", cta: "Ir a Gestión de carteras",
        summary: "Crear, publicar, cerrar y reabrir las carteras del mes, y preparar las de los meses siguientes.",
        points: [
          "Si es tu primera vez, el asistente «Poner en marcha el club» (en Ayuda y en Inicio) te lleva paso a paso: paga, invitaciones, cartera, publicación, aviso y repaso.",
          "Crea una cartera desde cero o con «Usar» en una propuesta sugerida del repositorio: queda en borrador hasta que la publiques.",
          "En el borrador escribes la lección (con vista previa), añades las opciones (busca por nombre o símbolo), fijas el mínimo y el máximo a elegir, el plazo y el importe de cada miembro.",
          "Al publicar se reparte la paga y los miembros pueden decidir. Solo se publica la del mes actual o la del siguiente.",
          "«Plazo y estado»: amplía el plazo (+3, +7 días o sin fecha), ciérrala ya o reábrela hasta una fecha nueva. Reabrir no cambia las decisiones enviadas ni la paga.",
          "Si alguien compró un valor de la cartera a mano en Operaciones, aparece en «Compras hechas fuera del formulario» para que lo reconozcas como su decisión.",
          "«Previsualizar como miembro», en la barra superior, enseña cada página tal como la ve un miembro.",
        ],
      },
      {
        id: "repositorio", title: "Repositorio de propuestas", audience: "presidente", href: "/cartera/repositorio", cta: "Ver el repositorio",
        summary: "Carteras del mes listas para usar: las del Club y las que comparten otras familias.",
        points: [
          "Cada propuesta trae su lección y sus opciones; al usarla se crea el borrador del mes que elijas y puedes adaptarla.",
          "Comparte las tuyas (firmadas o anónimas) desde la gestión de una cartera publicada, o crea una nueva con «Nueva propuesta».",
          "Verás cuántas veces se ha usado cada propuesta y cuántas por otras familias. Las que ya has usado aparecen marcadas.",
        ],
      },
      {
        id: "comunicaciones", title: "Comunicaciones por WhatsApp", audience: "presidente", href: "/comunicaciones", cta: "Ir a Comunicaciones",
        summary: "El aviso de que la cartera del mes está lista, personalizado para cada miembro y con el enlace directo.",
        points: [
          "Elige la cartera y ajusta la plantilla. Los marcadores {nombre}, {importe}, {plazo}, {enlace}… se rellenan solos para cada uno; a la derecha ves cómo lo recibirá.",
          "«Preparar el aviso» crea un mensaje para cada miembro. «Enviar por WhatsApp» abre WhatsApp con el texto escrito: tú solo pulsas enviar.",
          "Para quien no tenga móvil en su perfil, «Copiar texto». También hay una versión sin personalizar para el grupo de la familia.",
          "Cada aviso queda guardado con quién lo ha recibido.",
        ],
      },
      {
        id: "invitaciones", title: "Invitaciones y miembros", audience: "presidente", href: "/invitaciones", cta: "Ir a Invitaciones",
        summary: "Quién entra en el club: invitaciones personales, el código general, solicitudes y roles.",
        points: [
          "Invitación personal: un código de un solo uso, como miembro o como presidente. Puedes limitarla a un email y fijar su caducidad.",
          "Código general de la familia, con tres modos: entrada directa, con tu aprobación o desactivado (solo invitación personal).",
          "Aquí apruebas solicitudes, cambias el rol de cada miembro (siempre queda al menos un presidente), generas enlaces para cambiar la contraseña y, si hace falta, expulsas a alguien.",
          "El panel «Tus cinco invitaciones para otras familias» enseña los cinco huecos y qué familia entró con cada uno.",
        ],
      },
    ],
  },
];

export const GLOSSARY: { term: string; text: string }[] = [
  { term: "Acción", text: "Una parte pequeña de una empresa. Si a la empresa le va bien, la acción suele subir y a veces reparte dividendos." },
  { term: "ETF", text: "Un fondo que cotiza en bolsa y compra muchas empresas a la vez (por ejemplo, todo el mundo o todo un país). Diversifica con una sola compra." },
  { term: "TER", text: "Lo que cobra un ETF o fondo al año, en porcentaje. Un 0,22 % significa 22 céntimos por cada 100 € invertidos." },
  { term: "PER", text: "Precio entre beneficio: cuántos años de beneficios estás pagando por la acción. Se compara mejor con la historia de la propia empresa que con otras." },
  { term: "Dividendo", text: "La parte del beneficio que la empresa reparte a sus accionistas." },
  { term: "Rentabilidad sobre lo aportado", text: "Cuánto ha ganado o perdido tu cartera respecto a todo el dinero que has metido. Es la medida de la liga." },
  { term: "Diversificar", text: "Repartir el dinero entre varios activos para que un mal resultado no lo arruine todo." },
  { term: "Tendencia", text: "Hacia dónde va el precio en el medio plazo. El Club la mide con medias móviles (por ejemplo, la de 200 sesiones)." },
  { term: "Momentum", text: "La fuerza del movimiento reciente. El Club usa el RSI y el MACD." },
  { term: "Volatilidad", text: "Cuánto se mueve el precio. Más volatilidad, más riesgo y más sustos." },
  { term: "Sesgo", text: "Hacia dónde se inclina la lectura del Club cuando no llega a «comprar» o «vender»: ▲ alcista o ▼ bajista." },
  { term: "Aportación propia", text: "Dinero que pones tú además de la paga. Se anota solo cuando una compra supera tu efectivo." },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "¿El Club compra o vende por mí?", a: "No. El Club no custodia dinero ni ejecuta órdenes: se compra en el bróker de la familia y se anota aquí con su porqué." },
  { q: "¿La lectura del Club es una recomendación?", a: "No. Es una lectura automática y educativa de los datos para aprender a mirar. La decisión y el porqué son siempre tuyos." },
  { q: "No puedo decidir en la cartera del mes", a: "Puede que no tengas importe asignado, que el plazo haya terminado o que la cartera esté cerrada. Avisa al presidente: puede asignarte importe, ampliar el plazo o reabrirla." },
  { q: "Compré fuera del formulario y no sale como decisión", a: "El presidente lo verá en la gestión de la cartera, en «Compras hechas fuera del formulario», y puede reconocerla como tu decisión." },
  { q: "He olvidado la contraseña", a: "Pide al presidente un enlace para elegir una contraseña nueva (en Invitaciones, junto a tu nombre). Vale una hora." },
  { q: "¿Quién ve mis datos?", a: "Solo tu familia. Entre familias solo se comparten las propuestas del repositorio que cada presidente decide compartir." },
  { q: "¿Por qué el precio no coincide con mi bróker?", a: "Los precios llegan con hasta 15 minutos de retraso y los de otras divisas se convierten a euros con el cambio del momento. Puedes editar el precio de tus operaciones." },
];

export function audienceLabel(a: HelpAudience): string | null {
  return a === "presidente" ? "Presidente" : null;
}
