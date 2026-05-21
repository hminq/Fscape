/**
 * SVG donut chart for status/category breakdowns.
 *
 * @param {{ key: string, stroke: string, count: number }[]} entries
 * @param {number} [size=76]
 */
export default function StatusDonut({ entries, size = 76 }) {
  const filled = entries.filter((e) => e.count > 0);
  const total = filled.reduce((s, e) => s + e.count, 0);
  const r = 36;
  const circ = 2 * Math.PI * r;

  const lengths = filled.map((e) => (total > 0 ? (e.count / total) * circ : 0));
  const segs = filled.map((e, i) => ({
    ...e,
    len: lengths[i],
    offset: circ - lengths.slice(0, i).reduce((s, l) => s + l, 0),
  }));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        {segs.map((s) => (
          <circle key={s.key} cx="50" cy="50" r={r} fill="none" strokeWidth="10"
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={s.offset}
            className={`${s.stroke} transition-all duration-500`} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold leading-none">{total}</span>
      </div>
    </div>
  );
}
