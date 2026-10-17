/**
 * Familia sintética para capturas de marketing (SOLO base de datos local). Crea «Familia García»: Marta
 * (presidenta), Jorge y tres hijos (Lucía 17, Hugo 20, Carla 23) con meses de actividad: pagas, compras con
 * su porqué, carteras del mes decididas, lecciones superadas, fotos diarias para la gráfica y un aviso enviado.
 * Uso: npx tsx scripts/seed-demo.ts   (contraseña de todos: la de DEMO_PASSWORD o «Demo-Garcia-2026-x»)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Garcia-2026-x";
const d = (s: string) => new Date(s + "T12:00:00");

async function main() {
  if (process.env.NODE_ENV === "production" || /cloudsql|34\.175/.test(process.env.DATABASE_URL ?? "")) throw new Error("Solo para la base de datos local");
  const old = await prisma.family.findFirst({ where: { name: "Familia García" } });
  if (old) await prisma.family.delete({ where: { id: old.id } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const family = await prisma.family.create({ data: { name: "Familia García", inviteCode: "GARCIA26", monthlyAllowance: 50 } });
  const mk = (name: string, email: string, role: string, phone: string, createdAt: string) => prisma.user.create({ data: { familyId: family.id, name, email, passwordHash, role, status: "ACTIVE", phone, createdAt: d(createdAt) } });
  const marta = await mk("Marta García", "marta@demo.local", "ADMIN", "+34600111222", "2026-05-02");
  const jorge = await mk("Jorge Martín", "jorge@demo.local", "MEMBER", "+34600111333", "2026-05-02");
  const lucia = await mk("Lucía Martín", "lucia@demo.local", "MEMBER", "+34600111444", "2026-05-03");
  const hugo = await mk("Hugo Martín", "hugo@demo.local", "MEMBER", "+34600111555", "2026-05-03");
  const carla = await mk("Carla Martín", "carla@demo.local", "MEMBER", "+34600111666", "2026-05-03");
  const all = [marta, jorge, lucia, hugo, carla];

  // Paga mensual de junio a octubre a todos
  for (const u of all) for (const m of ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]) {
    await prisma.contribution.create({ data: { userId: u.id, date: d(`${m}-01`), amount: 50, note: `Paga mensual ${m}` } });
  }
  // Un regalo de cumpleaños para Lucía
  await prisma.contribution.create({ data: { userId: lucia.id, date: d("2026-08-14"), amount: 100, note: "Regalo de cumpleaños de los abuelos" } });

  type T = { u: typeof marta; date: string; symbol: string; name: string; side?: "BUY" | "SELL"; qty: number; price: number; currency?: string; fx?: number; broker: string; why: string; exit?: string };
  const trades: T[] = [
    { u: lucia, date: "2026-06-03", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.3, price: 158.4, broker: "Trade Republic", why: "Con 50 € no puedo elegir empresas una a una; este ETF compra 3.600 a la vez y el TER es del 0,22 %.", exit: "Si cambio de objetivo y necesito el dinero antes de 5 años." },
    { u: lucia, date: "2026-07-02", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.31, price: 160.1, broker: "Trade Republic", why: "Sigo el plan: cada mes la misma cantidad, suba o baje. Así compro más barato cuando cae.", exit: "Nunca por una caída; solo si cambia mi objetivo." },
    { u: lucia, date: "2026-08-17", symbol: "AAPL", name: "Apple Inc.", qty: 0.5, price: 228.3, currency: "USD", fx: 0.86, broker: "Trade Republic", why: "El dinero del cumple lo pongo en una empresa que entiendo: uso su móvil, sé cómo gana dinero y tiene caja para aguantar.", exit: "Si el iPhone dejara de ser su mayor negocio o el PER se va por encima de 40." },
    { u: lucia, date: "2026-09-04", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.29, price: 166.7, broker: "Trade Republic", why: "Mes tres del plan. La lección de diversificación lo dejó claro: la base de mi cartera es el mundo entero.", exit: "No vender." },
    { u: hugo, date: "2026-06-05", symbol: "BTC-EUR", name: "Bitcoin EUR", qty: 0.00078, price: 61200, broker: "Revolut", why: "Quiero entender qué es antes de opinar. Pongo solo una parte de la paga porque puede caer un 30 % en un mes.", exit: "Si cae más del 40 % desde mi compra, reviso si sigo entendiendo por qué lo tengo." },
    { u: hugo, date: "2026-07-07", symbol: "NVDA", name: "NVIDIA Corporation", qty: 0.25, price: 138.2, currency: "USD", fx: 0.86, broker: "Revolut", why: "Las empresas de IA necesitan sus chips; tiene el 80 % del mercado. Es cara (PER alto), por eso solo 30 €.", exit: "Si aparece un competidor serio o el crecimiento de ventas baja del 20 %." },
    { u: hugo, date: "2026-08-04", symbol: "SAN.MC", name: "Banco Santander, S.A.", qty: 4, price: 6.95, broker: "Revolut", why: "Con los tipos altos los bancos ganan más y este paga dividendo. Cíclico: lo sé, por eso es la mitad.", exit: "Si el BCE baja los tipos por debajo del 2 % durante un año." },
    { u: hugo, date: "2026-09-08", symbol: "SAN.MC", name: "Banco Santander, S.A.", qty: 3, price: 7.42, broker: "Revolut", why: "Promedio: sigue barato frente a su historia (percentil 30 del PER) y el beneficio por acción crece.", exit: "Si la morosidad sube dos trimestres seguidos." },
    { u: carla, date: "2026-06-02", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.2, price: 158.1, broker: "Degiro", why: "Base indexada mundial: lo que menos tengo que vigilar.", exit: "No vender." },
    { u: carla, date: "2026-06-02", symbol: "KO", name: "The Coca-Cola Company", qty: 0.3, price: 62.4, currency: "USD", fx: 0.86, broker: "Degiro", why: "Negocio que se entiende en diez segundos, dividendo creciente 60 años seguidos y poca deuda.", exit: "Si recorta el dividendo." },
    { u: carla, date: "2026-07-01", symbol: "ITX.MC", name: "Industria de Diseño Textil, S.A.", qty: 0.6, price: 45.8, broker: "Degiro", why: "Compro en Zara, sé cómo funciona su logística y tiene caja neta. El PER está en la mitad de su historia.", exit: "Si las ventas comparables caen dos trimestres seguidos." },
    { u: carla, date: "2026-08-03", symbol: "MSFT", name: "Microsoft Corporation", qty: 0.1, price: 415.5, currency: "USD", fx: 0.86, broker: "Degiro", why: "Suscripciones que las empresas no pueden cancelar y nube creciendo al 30 %. Pago calidad.", exit: "Si Azure crece menos del 15 %." },
    { u: carla, date: "2026-09-02", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.2, price: 166.9, broker: "Degiro", why: "Aportación periódica al ETF: disciplina.", exit: "No vender." },
    { u: carla, date: "2026-09-16", symbol: "ITX.MC", name: "Industria de Diseño Textil, S.A.", side: "SELL", qty: 0.3, price: 51.9, broker: "Degiro", why: "Vendo la mitad: ha subido un 13 % y quiero realizar parte del beneficio para la cartera de octubre.", exit: "" },
    { u: jorge, date: "2026-06-04", symbol: "IBE.MC", name: "Iberdrola, S.A.", qty: 3, price: 14.6, broker: "Bankinter", why: "Eléctrica regulada con dividendo: tranquila. Para aprender con los chicos sin sustos.", exit: "Si el dividendo baja." },
    { u: jorge, date: "2026-08-05", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.3, price: 163.2, broker: "Bankinter", why: "Lo que me enseñó Lucía en la cena: un ETF mundial y a dormir tranquilo.", exit: "No vender." },
    { u: marta, date: "2026-06-04", symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", qty: 0.3, price: 158.6, broker: "Trade Republic", why: "Doy ejemplo: base indexada antes de ninguna apuesta.", exit: "No vender." },
    { u: marta, date: "2026-07-06", symbol: "AMS.MC", name: "Amadeus IT Group, S.A.", qty: 0.8, price: 62.3, broker: "Trade Republic", why: "Cada billete de avión del mundo pasa por su sistema. Márgenes altos y poca deuda.", exit: "Si pierde una de las tres grandes alianzas aéreas." },
  ];
  const tradeIds = new Map<string, string>();
  for (const t of trades) {
    const tr = await prisma.trade.create({ data: { userId: t.u.id, date: d(t.date), symbol: t.symbol, name: t.name, side: t.side ?? "BUY", quantity: t.qty, price: t.price, currency: t.currency ?? "EUR", fxRate: t.fx ?? 1, fees: t.broker === "Degiro" ? 1 : 0, broker: t.broker, createdAt: d(t.date) } });
    tradeIds.set(`${t.u.id}|${t.date}|${t.symbol}`, tr.id);
    await prisma.journalEntry.create({ data: { userId: t.u.id, tradeId: tr.id, symbol: t.symbol, side: t.side ?? "BUY", why: t.why, exitCondition: t.exit || null, createdAt: d(t.date) } });
  }
  await prisma.journalEntry.create({ data: { userId: hugo.id, symbol: "—", side: "NOTE", why: "Lección aprendida: cuando bitcoin cayó un 12 % en una semana me entraron ganas de vender. No lo hice porque mi porqué seguía siendo el mismo. Dos semanas después había recuperado.", createdAt: d("2026-08-22") } });
  await prisma.journalEntry.create({ data: { userId: lucia.id, symbol: "—", side: "NOTE", why: "He terminado el curso de productos. Lo que más me ha sorprendido: la diferencia de comisiones entre un fondo activo y un ETF indexado a 30 años es media cartera.", createdAt: d("2026-09-20") } });

  // Academia: lecciones superadas
  const lessons = await prisma.lesson.findMany({ orderBy: [{ course: { level: "asc" } }, { order: "asc" }], select: { id: true } });
  const passed = (u: typeof marta, n: number, start: string) => Promise.all(lessons.slice(0, n).map((l, i) => prisma.lessonProgress.create({ data: { userId: u.id, lessonId: l.id, score: 3, attempts: i % 4 === 0 ? 2 : 1, completedAt: new Date(d(start).getTime() + i * 3 * 86400000) } })));
  await passed(carla, 14, "2026-05-10");
  await passed(lucia, 9, "2026-05-12");
  await passed(marta, 7, "2026-05-15");
  await passed(hugo, 5, "2026-06-01");
  await passed(jorge, 3, "2026-06-20");

  // Carteras del mes: julio y septiembre cerradas con decisiones; octubre publicada con plazo
  const sept = await prisma.monthlyPortfolio.create({
    data: {
      familyId: family.id, month: "2026-09", title: "Tecnología o consumo: ¿quién gana a diez años?", status: "CLOSED", minChoices: 1, maxChoices: 2, deadline: d("2026-09-14"), createdById: marta.id, publishedAt: d("2026-09-01"), closedAt: d("2026-09-20"),
      lesson: "## Objetivo del mes\nComparar dos formas de ganar dinero: empresas que crecen rápido (tecnología) y empresas que venden lo mismo cada día (consumo). Las dos pueden ser buenas; lo que cambia es el precio que pagas y el riesgo.\n\n## Las opciones\nMSFT · **Microsoft**: nube y suscripciones. GOOGL · **Alphabet**: buscador y YouTube. KO · **Coca-Cola**: dividendo creciente. PG · **Procter & Gamble**: lo que hay en tu baño.\n\nIdea clave: pagar caro por una gran empresa también puede salir mal; pagar barato por una mediocre, casi siempre.\n\n## Cómo decidir\nElige una o dos y argumenta con el PER histórico y el crecimiento del beneficio.",
      options: { create: [{ symbol: "MSFT", name: "Microsoft Corporation", kind: "STOCK", note: "Crecimiento de Azure y PER frente a su historia", order: 0 }, { symbol: "GOOGL", name: "Alphabet Inc.", kind: "STOCK", note: "¿Le afecta la IA al buscador?", order: 1 }, { symbol: "KO", name: "The Coca-Cola Company", kind: "STOCK", note: "Dividendo y deuda", order: 2 }, { symbol: "PG", name: "Procter & Gamble", kind: "STOCK", note: "Márgenes y marcas", order: 3 }] },
      allocations: { create: all.map((u) => ({ userId: u.id, amount: 50 })) },
    },
    include: { options: true },
  });
  const opt = (p: { options: { id: string; symbol: string }[] }, s: string) => p.options.find((o) => o.symbol === s)!.id;
  const decide = async (p: typeof sept, u: typeof marta, when: string, argument: string, picks: { symbol: string; amount: number; price: number; why: string }[]) => {
    const dec = await prisma.monthlyDecision.create({ data: { portfolioId: p.id, userId: u.id, argument, submittedAt: d(when) } });
    for (const pk of picks) {
      const tr = await prisma.trade.create({ data: { userId: u.id, date: d(when), symbol: pk.symbol, name: p.options.find((o) => o.symbol === pk.symbol)!.symbol, side: "BUY", quantity: pk.amount / pk.price, price: pk.price, currency: "EUR", fxRate: 1, fees: 0, broker: `Cartera ${p.month}`, createdAt: d(when) } });
      const je = await prisma.journalEntry.create({ data: { userId: u.id, tradeId: tr.id, symbol: pk.symbol, side: "BUY", why: pk.why, createdAt: d(when) } });
      await prisma.monthlyChoice.create({ data: { decisionId: dec.id, optionId: opt(p, pk.symbol), amount: pk.amount, why: pk.why, tradeId: tr.id, journalEntryId: je.id, price: pk.price, quantity: pk.amount / pk.price } });
    }
  };
  await decide(sept, carla, "2026-09-03", "Reparto entre crecimiento y consumo: Microsoft por la nube y Coca-Cola por el dividendo. Si una va mal, la otra aguanta.", [{ symbol: "MSFT", amount: 30, price: 448.2, why: "Azure crece al 30 % y el PER está en la mitad de su historia." }, { symbol: "KO", amount: 20, price: 59.1, why: "Dividendo creciente desde hace 60 años." }]);
  await decide(sept, lucia, "2026-09-05", "Todo a Google: lo uso todos los días y el PER está en el percentil 10 de su historia, que es lo que explica la lección del PER.", [{ symbol: "GOOGL", amount: 50, price: 171.6, why: "Barata frente a su historia y el beneficio crece un 20 %." }]);
  await decide(sept, hugo, "2026-09-07", "Microsoft: la IA va a necesitar nube y ellos la tienen. Acepto pagar un PER alto por calidad.", [{ symbol: "MSFT", amount: 50, price: 452.9, why: "Suscripciones que no se cancelan + nube." }]);
  await decide(sept, jorge, "2026-09-10", "Consumo: lo que se compra siempre. Prefiero dormir tranquilo.", [{ symbol: "PG", amount: 25, price: 148.3, why: "Marcas que están en todas las casas." }, { symbol: "KO", amount: 25, price: 59.6, why: "Dividendo." }]);
  await decide(sept, marta, "2026-09-02", "Mitad y mitad para dar ejemplo de diversificar incluso dentro de una propuesta.", [{ symbol: "GOOGL", amount: 25, price: 170.2, why: "Percentil bajo del PER histórico." }, { symbol: "PG", amount: 25, price: 147.9, why: "Estabilidad." }]);

  const oct = await prisma.monthlyPortfolio.create({
    data: {
      familyId: family.id, month: "2026-10", title: "Banca española frente a un ETF mundial", status: "PUBLISHED", minChoices: 1, maxChoices: 2, deadline: d("2026-10-25"), createdById: marta.id, publishedAt: d("2026-10-01"),
      lesson: "## Objetivo del mes\nEste mes comparamos **dos formas de invertir la paga**: una acción concreta de un sector cíclico (la banca) y un ETF que compra el mundo entero.\n\n## Las opciones\nSAN.MC · **Banco Santander**: gana con los tipos de interés altos; es cíclica. BBVA.MC · **BBVA**: mucha exposición a México. VWCE.DE · **Vanguard FTSE All-World**: 3.600 empresas de todo el mundo con un TER del 0,22 %.\n\n## Qué investigar antes de decidir\nAbre la ficha de cada valor y mira la Recomendación del Club. Compara el PER y el dividendo de los bancos con el TER y las diez mayores posiciones del ETF.\n\nIdea clave: diversificar es la única ventaja gratis que da el mercado. Una apuesta concreta solo tiene sentido si entiendes cómo gana dinero.\n\n## Cómo decidir\nPuedes elegir una o dos opciones y repartir tus 50 € como quieras. Argumenta con datos, no con intuición, y escribe qué te haría vender.",
      options: { create: [{ symbol: "SAN.MC", name: "Banco Santander, S.A.", kind: "STOCK", note: "PER histórico, dividendo y morosidad", order: 0 }, { symbol: "BBVA.MC", name: "Banco Bilbao Vizcaya Argentaria, S.A.", kind: "STOCK", note: "Exposición a México y Turquía", order: 1 }, { symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF", kind: "ETF", note: "TER y diez mayores posiciones", order: 2 }] },
      allocations: { create: all.map((u) => ({ userId: u.id, amount: 50 })) },
    },
    include: { options: true },
  });
  await decide(oct, carla, "2026-10-03", "ETF para la base y un banco como apuesta argumentada: Santander está en el percentil 30 de su PER histórico y el beneficio por acción crece.", [{ symbol: "VWCE.DE", amount: 30, price: 168.9, why: "Diversificación a coste mínimo." }, { symbol: "SAN.MC", amount: 20, price: 7.9, why: "Barata frente a su historia y con dividendo." }]);
  await decide(oct, lucia, "2026-10-06", "Aplico la lección: la base diversificada y barata no depende de un sector. Los bancos los dejo para cuando entienda mejor cómo ganan dinero.", [{ symbol: "VWCE.DE", amount: 50, price: 169.4, why: "3.600 empresas por 0,22 % al año." }]);
  await decide(oct, hugo, "2026-10-09", "Doblo en Santander: ya la tenía, sigo creyendo en la tesis de tipos altos y añado el ETF para no ir a una sola carta.", [{ symbol: "SAN.MC", amount: 30, price: 8.05, why: "Tipos altos, dividendo del 5 %." }, { symbol: "VWCE.DE", amount: 20, price: 169.1, why: "Base." }]);

  // Fotos diarias para la gráfica de evolución: 100 días con un paseo suave por miembro
  const today = new Date();
  const seeds: Record<string, { start: number; drift: number; vol: number }> = { [carla.id]: { start: 300, drift: 0.0012, vol: 0.011 }, [lucia.id]: { start: 350, drift: 0.0009, vol: 0.008 }, [hugo.id]: { start: 250, drift: 0.0006, vol: 0.022 }, [jorge.id]: { start: 250, drift: 0.0004, vol: 0.006 }, [marta.id]: { start: 250, drift: 0.0007, vol: 0.008 } };
  let rnd = 42;
  const rand = () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return rnd / 2147483648 - 0.5; };
  for (const u of all) {
    const s = seeds[u.id];
    let value = s.start;
    for (let i = 100; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
      const invested = s.start + Math.max(0, Math.floor((100 - i) / 30)) * 50;
      value = Math.max(invested * 0.85, value * (1 + s.drift + rand() * s.vol * 2)) + (i % 30 === 0 && i < 100 ? 50 : 0);
      await prisma.portfolioSnapshot.create({ data: { userId: u.id, date, value: Math.round(value * 100) / 100, invested } });
    }
  }

  // Propuesta compartida por la familia y aviso de octubre enviado
  await prisma.proposal.create({ data: { source: "FAMILY", familyId: family.id, signed: true, title: "Tecnología o consumo: ¿quién gana a diez años?", theme: "Sectores", risk: 3, lesson: sept.lesson.replace(/Este mes|este mes/g, "En esta propuesta"), minChoices: 1, maxChoices: 2, uses: 4, options: { create: sept.options.map((o, i) => ({ symbol: o.symbol, name: o.name, kind: o.kind, note: o.note, order: i })) } } });
  const recipients = [jorge, lucia, hugo, carla].map((u) => ({ userId: u.id, name: u.name.split(" ")[0], phone: u.phone, text: `¡Hola, ${u.name.split(" ")[0]}! La cartera de octubre de 2026 ya está lista: *Banca española frente a un ETF mundial*.\n\nTienes 50,00 € para invertir entre 3 opciones (elige de 1 a 2), hasta el 25/10/2026.\n\nEntra aquí y decide: https://clubdeinversionfamiliar.com/cartera`, openedAt: u.id === jorge.id ? null : d("2026-10-01").toISOString() }));
  await prisma.communication.create({ data: { familyId: family.id, createdById: marta.id, portfolioId: oct.id, subject: "Cartera de octubre de 2026 lista: Banca española frente a un ETF mundial", body: "plantilla del club", recipients, createdAt: d("2026-10-01") } });

  console.log(`Familia García creada. Entra con marta@demo.local (presidenta), lucia@demo.local, hugo@demo.local, carla@demo.local o jorge@demo.local y la contraseña ${PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
