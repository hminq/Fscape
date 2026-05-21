/**
 * Reusable status bar component for summary panels.
 * Displays a progress bar that adapts based on the current filter.
 *
 * Props:
 *   active   - count of active items
 *   inactive - count of inactive items
 *   filter   - "all" | "active" | "inactive"
 *   label    - entity label for count mode, e.g. "tòa nhà" or "tài khoản"
 */
export default function StatusBar({ active, inactive, filter, label = "" }) {
    const total = active + inactive;
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

    const barPct = filter === "active" ? 100 : filter === "inactive" ? 0 : activePct;
    const barColor = filter === "inactive" ? "bg-muted-foreground/40" : "bg-success";

    return (
        <div className="flex-1 min-w-[180px] space-y-2.5">
            <div className="flex items-center text-xs">
                <span className="text-muted-foreground">Trạng thái</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${barPct}%` }}
                />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                {filter === "all" ? (
                    <>
                        <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-success" /> {activePct}% hoạt động
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> {100 - activePct}% vô hiệu
                        </span>
                    </>
                ) : filter === "active" ? (
                    <span className="flex items-center gap-1.5 font-medium text-success">
                        <span className="size-1.5 rounded-full bg-success" /> {active} {label} đang hoạt động
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-muted-foreground/30" /> {inactive} {label} vô hiệu hóa
                    </span>
                )}
            </div>
        </div>
    );
}
