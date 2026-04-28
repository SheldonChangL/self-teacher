// Pure-SVG charts. Server-renderable, no JS, no dependencies.

export function ActivityBarChart({
  data,
  days = 30,
}: {
  data: { date: string; count: number }[];
  days?: number;
}) {
  // Fill missing days with 0 so the bars line up week-on-week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: { date: string; count: number; label: string }[] = [];
  const map = new Map(data.map((d) => [d.date, d.count]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toLocaleDateString("sv-SE"); // YYYY-MM-DD in local tz
    buckets.push({
      date: iso,
      count: map.get(iso) ?? 0,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const W = 600;
  const H = 100;
  const PAD_L = 24;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barW = innerW / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`近 ${days} 天活動圖`}
    >
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="#fde68a"
        strokeWidth="1"
      />
      <text x="0" y={PAD_T + 6} fontSize="9" fill="#a1a1aa">
        {max}
      </text>
      <text x="0" y={H - PAD_B} fontSize="9" fill="#a1a1aa">
        0
      </text>
      {buckets.map((b, i) => {
        const h = (b.count / max) * innerH;
        const x = PAD_L + i * barW + 1;
        const y = H - PAD_B - h;
        return (
          <g key={b.date}>
            <rect
              x={x}
              y={y}
              width={Math.max(1, barW - 2)}
              height={h}
              fill={b.count > 0 ? "#f59e0b" : "#fef3c7"}
              rx="1"
            >
              <title>{`${b.date}: ${b.count} 堂`}</title>
            </rect>
            {i % 5 === 0 && (
              <text
                x={x + barW / 2 - 1}
                y={H - 4}
                fontSize="8"
                fill="#a1a1aa"
                textAnchor="middle"
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function PieChart({
  slices,
  size = 180,
}: {
  slices: { id: string; label: string; icon: string; count: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((a, b) => a + b.count, 0);
  if (total === 0) return null;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s) => {
          if (s.count === 0) return null;
          const startA = (acc / total) * Math.PI * 2 - Math.PI / 2;
          acc += s.count;
          const endA = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const large = endA - startA > Math.PI ? 1 : 0;
          const x1 = cx + r * Math.cos(startA);
          const y1 = cy + r * Math.sin(startA);
          const x2 = cx + r * Math.cos(endA);
          const y2 = cy + r * Math.sin(endA);
          // For a single slice covering 100%, draw a circle instead.
          const d =
            slices.filter((x) => x.count > 0).length === 1
              ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
              : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          return (
            <path key={s.id} d={d} fill={s.color}>
              <title>{`${s.label}: ${s.count}`}</title>
            </path>
          );
        })}
      </svg>
      <ul className="space-y-1 text-sm">
        {slices.map((s) => {
          if (s.count === 0) return null;
          const pct = Math.round((s.count / total) * 100);
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium text-zinc-700">
                {s.icon} {s.label}
              </span>
              <span className="text-zinc-500">
                {s.count}（{pct}%）
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ScoreLineChart({
  points,
}: {
  points: { date: number; score: number }[];
}) {
  if (points.length === 0) return null;
  const W = 600;
  const H = 140;
  const PAD_L = 28;
  const PAD_R = 10;
  const PAD_T = 12;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = points.length;

  // X coords evenly spaced (we don't need real time scale for short trends)
  const x = (i: number) =>
    n === 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW;
  // Y coords: 0..5 score range
  const y = (s: number) => PAD_T + innerH * (1 - s / 5);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`)
    .join(" ");

  // Trailing average for context
  const avg = points.reduce((a, p) => a + p.score, 0) / n;
  const yAvg = y(avg);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* gridlines */}
      {[1, 2, 3, 4, 5].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#fde68a"
            strokeWidth="0.6"
          />
          <text x={4} y={y(tick) + 3} fontSize="9" fill="#a1a1aa">
            {tick}
          </text>
        </g>
      ))}
      {/* avg dashed line */}
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={yAvg}
        y2={yAvg}
        stroke="#10b981"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text
        x={W - PAD_R - 4}
        y={yAvg - 3}
        fontSize="9"
        fill="#10b981"
        textAnchor="end"
      >
        平均 {avg.toFixed(1)}
      </text>
      {/* score line */}
      <path d={path} fill="none" stroke="#f59e0b" strokeWidth="2" />
      {/* dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.score)}
          r="3.5"
          fill="#f59e0b"
          stroke="#fff"
          strokeWidth="1.5"
        >
          <title>{`${new Date(p.date).toLocaleDateString("zh-TW")}: ${p.score}/5`}</title>
        </circle>
      ))}
      {/* x labels: first and last only */}
      <text
        x={x(0)}
        y={H - 6}
        fontSize="9"
        fill="#a1a1aa"
        textAnchor="middle"
      >
        {new Date(points[0].date).toLocaleDateString("zh-TW", {
          month: "numeric",
          day: "numeric",
        })}
      </text>
      {n > 1 && (
        <text
          x={x(n - 1)}
          y={H - 6}
          fontSize="9"
          fill="#a1a1aa"
          textAnchor="middle"
        >
          {new Date(points[n - 1].date).toLocaleDateString("zh-TW", {
            month: "numeric",
            day: "numeric",
          })}
        </text>
      )}
    </svg>
  );
}

export const SUBJECT_COLORS: Record<string, string> = {
  free: "#f472b6",
  chinese: "#fb923c",
  english: "#60a5fa",
  math: "#a78bfa",
  science: "#34d399",
  social: "#facc15",
};
