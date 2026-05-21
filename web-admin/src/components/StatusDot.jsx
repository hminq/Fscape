const FALLBACK = { label: "—", dot: "bg-muted-foreground/30", text: "text-muted-foreground" };

export default function StatusDot({ status, statusMap }) {
  const s = statusMap[status] || { ...FALLBACK, label: status };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`size-2 rounded-full ${s.dot}`} />
      <span className={`${s.text} font-medium`}>{s.label}</span>
    </div>
  );
}
