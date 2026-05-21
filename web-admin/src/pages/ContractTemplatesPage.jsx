import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
    Plus, MagnifyingGlass, CircleNotch, FileText, Eye, CaretLeft, CaretRight,
    Star, Trash, PencilSimple, ToggleLeft, ToggleRight,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";
import { formatDate as fmt, cleanContractHtml } from "@/lib/utils";
import Pagination from "@/components/Pagination";
import { LoadingState, EmptyState } from "@/components/StateDisplay";

/* ── Summary Card ──────────────────────────── */

function TemplateSummary({ total, active, defaults }) {
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;

    return (
        <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-6 p-5 flex-wrap">
                <div className="flex items-center gap-4 flex-1 min-w-[140px]">
                    <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <FileText className="size-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold leading-none tracking-tight">{total}</p>
                        <p className="text-sm text-muted-foreground mt-1">Mẫu hợp đồng</p>
                    </div>
                </div>
                <div className="w-px h-14 bg-border shrink-0" />
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-success shrink-0" />
                        <span className="text-xs text-muted-foreground">Hoạt động</span>
                        <span className="text-xs font-semibold ml-auto pl-4">{active} ({pct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-chart-4 shrink-0" />
                        <span className="text-xs text-muted-foreground">Mặc định</span>
                        <span className="text-xs font-semibold ml-auto pl-4">{defaults}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Detail Dialog ─────────────────────────── */

function TemplateDetailDialog({ open, onOpenChange, template, onEdit, onToggle, onDelete }) {
    const [confirmDel, setConfirmDel] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) setConfirmDel(false); }, [open]);

    if (!template) return null;

    const handleToggle = async () => {
        setSaving(true);
        try {
            await api.put(`/api/contract-templates/${template.id}`, { is_active: !template.is_active });
            onToggle();
        } catch (err) {
            toast.error(err.message || "Lỗi");
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/api/contract-templates/${template.id}`);
            onDelete();
        } catch (err) {
            toast.error(err.message || "Lỗi");
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl">
                {confirmDel ? (
                    <>
                        <DialogHeader><DialogTitle>Vô hiệu hóa mẫu</DialogTitle></DialogHeader>
                        <p className="text-sm text-muted-foreground text-center py-2">
                            Bạn có chắc muốn vô hiệu hóa mẫu <strong className="text-foreground">&quot;{template.name}&quot;</strong>?
                        </p>
                        <DialogFooter className="justify-center gap-2">
                            <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
                            <Button variant="destructive" disabled={saving} onClick={handleDelete}>
                                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                                Vô hiệu hóa
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5">
                                {template.name}
                                {template.is_default && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-chart-4/15 text-chart-4">Mặc định</span>
                                )}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${template.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                                    {template.is_active ? "Hoạt động" : "Vô hiệu"}
                                </span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                                    <p className="text-[11px] text-muted-foreground mb-1">Phiên bản</p>
                                    <p className="text-sm font-semibold">{template.version}</p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                                    <p className="text-[11px] text-muted-foreground mb-1">Ngày tạo</p>
                                    <p className="text-sm font-semibold">{fmt(template.created_at)}</p>
                                </div>
                            </div>

                            {/* HTML preview */}
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Xem trước</p>
                                <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border/50 bg-white p-4">
                                    <div className="prose prose-sm max-w-none contract-render" dangerouslySetInnerHTML={{ __html: cleanContractHtml(template.content) }} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={() => setConfirmDel(true)}>
                                <Trash className="size-3.5" /> Vô hiệu hóa
                            </Button>
                            <Button size="sm" className="gap-1.5" onClick={() => onEdit(template)}>
                                <PencilSimple className="size-3.5" /> Chỉnh sửa
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ── Main Page ─────────────────────────────── */

const PER_PAGE = 10;

export default function ContractTemplatesPage() {
    const navigate = useNavigate();
    const [all, setAll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState("all");
    const [page, setPage] = useState(0);
    const [detailTpl, setDetailTpl] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/api/contract-templates?limit=200");
            setAll(res.data || []);
        } catch {
            setError("Không thể tải dữ liệu.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => all.filter((t) => {
        if (filterActive === "active" && !t.is_active) return false;
        if (filterActive === "inactive" && t.is_active) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            if (!t.name?.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [all, filterActive, search]);

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const visible = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    const activeCount = all.filter((t) => t.is_active).length;
    const defaultCount = all.filter((t) => t.is_default).length;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mẫu hợp đồng</h1>
                    <p className="text-sm text-muted-foreground">Quản lý các mẫu hợp đồng cho thuê</p>
                </div>
                <Button className="gap-1.5" onClick={() => navigate("/contracts/templates/create")}>
                    <Plus className="size-4" /> Tạo mẫu mới
                </Button>
            </div>

            {/* Summary */}
            <TemplateSummary total={all.length} active={activeCount} defaults={defaultCount} />

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm mẫu..." value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
                </div>
                <div className="flex gap-1.5">
                    {[
                        { key: "all", label: "Tất cả" },
                        { key: "active", label: "Hoạt động" },
                        { key: "inactive", label: "Vô hiệu" },
                    ].map((f) => (
                        <Button key={f.key} size="sm"
                            variant={filterActive === f.key ? "default" : "outline"}
                            onClick={() => { setFilterActive(f.key); setPage(0); }}>
                            {f.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <LoadingState />
            ) : error ? (
                <div className="py-14 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={fetchAll}>Thử lại</Button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={FileText} message="Không tìm thấy mẫu nào" />
            ) : (
                <>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-2 mb-2">
                            <p className="text-sm font-medium text-muted-foreground">{filtered.length} kết quả</p>
                            <Pagination page={page + 1} totalPages={totalPages}
                              onPrev={() => setPage(p => Math.max(0, p - 1))}
                              onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))} />
                        </div>
                    )}

                    <Card className="overflow-hidden py-0 gap-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-10 pl-4">#</TableHead>
                                    <TableHead>Tên mẫu</TableHead>
                                    <TableHead>Phiên bản</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="text-right pr-4 w-20">Xem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((t, idx) => (
                                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailTpl(t)}>
                                        <TableCell className="pl-4 text-muted-foreground text-xs">{page * PER_PAGE + idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{t.name}</span>
                                                {t.is_default && <Star className="size-3.5 text-chart-4 fill-chart-4" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground font-mono">{t.version}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`size-2 rounded-full ${t.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                                                <span className={`font-medium ${t.is_active ? "text-success" : "text-muted-foreground"}`}>
                                                    {t.is_active ? "Hoạt động" : "Vô hiệu"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{fmt(t.created_at)}</TableCell>
                                        <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button size="icon" variant="ghost" className="size-8" title="Chi tiết"
                                                onClick={() => setDetailTpl(t)}>
                                                <Eye className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                </>
            )}

            {/* Detail dialog */}
            <TemplateDetailDialog
                open={!!detailTpl}
                onOpenChange={(v) => !v && setDetailTpl(null)}
                template={detailTpl}
                onEdit={(t) => { setDetailTpl(null); navigate(`/contracts/templates/${t.id}/edit`); }}
                onToggle={() => { setDetailTpl(null); fetchAll(); }}
                onDelete={() => { setDetailTpl(null); fetchAll(); }}
            />
        </div>
    );
}
