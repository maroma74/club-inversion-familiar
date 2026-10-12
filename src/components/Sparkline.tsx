/** Mini gráfica de línea renderizada en el servidor (SVG puro, sin JavaScript). */
export function Sparkline({ data, width = 110, height = 32, positive }: { data: number[]; width?: number; height?: number; positive?: boolean }) {
  if (data.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`);
  const up = positive ?? data[data.length - 1] >= data[0];
  const color = up ? "#10b981" : "#94a3b8";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
