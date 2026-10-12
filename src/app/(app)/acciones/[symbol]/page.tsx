import { StockDetail } from "@/components/market/StockDetail";

export default async function StockPage({ params, searchParams }: { params: Promise<{ symbol: string }>; searchParams: Promise<{ r?: string; per?: string }> }) {
  const { symbol } = await params;
  const { r, per } = await searchParams;
  return <StockDetail symbol={symbol} range={r} kind="STOCK" perRange={per} />;
}
