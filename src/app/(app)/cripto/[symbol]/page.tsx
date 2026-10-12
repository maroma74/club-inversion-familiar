import { StockDetail } from "@/components/market/StockDetail";

export default async function CryptoDetailPage({ params, searchParams }: { params: Promise<{ symbol: string }>; searchParams: Promise<{ r?: string }> }) {
  const { symbol } = await params;
  const { r } = await searchParams;
  return <StockDetail symbol={symbol} range={r} kind="CRYPTO" />;
}
