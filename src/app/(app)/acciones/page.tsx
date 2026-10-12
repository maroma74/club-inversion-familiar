import { MarketList } from "@/components/market/MarketList";

export default async function AccionesPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  return <MarketList kind="STOCK" sort={orden} />;
}
