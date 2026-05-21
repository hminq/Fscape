import { useState, useEffect, useCallback } from "react";
import {
    Plus, MagnifyingGlass, PencilSimple, Trash, Package, ToggleLeft, ToggleRight,
    CaretUp, CaretDown, CaretUpDown, CircleNotch, Eye, Money as Banknote,
    CaretLeft, CaretRight, CheckCircle
} from "@phosphor-icons/react";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";
import { formatDate as fmt } from "@/lib/utils";

const fmtPrice = (v) => {
    if (v == null || v === "") return "—";
    return Number(v).toLocaleString("vi-VN") + " ₫";
};

const EMPTY_FORM = {
    name: "",
    description: "",
    default_price: "",
};

function SortIcon({ field, sortField, sortDir }) {
    if (sortField !== field) return <CaretUpDown className="size-3.5 ml-1 opacity-40" />;
    return sortDir === "asc"
        ? <CaretUp className="size-3.5 ml-1 text-primary" />
        : <CaretDown className="size-3.5 ml-1 text-primary" />;
}

/* ── Status Bar (inline, filter-reactive) ──── */

function AssetTypeStatusBar({ byStatus, total = 0, filter = "all" }) {
    const hasData = byStatus != null;
    const active = filter === "all" ? (byStatus?.active || 0) : filter === "active" ? (byStatus?.active || 0) : 0;
    const inactive = filter === "all" ? (byStatus?.inactive || 0) : filter === "inactive" ? (byStatus?.inactive || 0) : 0;
    const filteredTotal = filter === "all" ? total : filter === "active" ? (byStatus?.active || 0) : (byStatus?.inactive || 0);

    const pActive = filteredTotal > 0 ? (active / filteredTotal) * 100 : 0;
    const pInactive = filteredTotal > 0 ? (inactive / filteredTotal) * 100 : 0;

    const filterLabel = filter === "active" ? "hoạt động" : filter === "inactive" ? "vô hiệu" : null;

    return (
        <div className="flex-1 min-w-[180px] space-y-2.5">
            <div className="flex items-center text-xs">
                <span className="text-muted-foreground">Trạng thái</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${pActive}%` }} />
                <div className="h-full bg-muted-foreground/40 transition-all duration-500" style={{ width: `${pInactive}%` }} />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                {!hasData && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30" /> Đang chờ dữ liệu...</span>}
                {hasData && filteredTotal === 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 loại tài sản {filterLabel}</span>}
                {active > 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" /> {Math.round(pActive)}% hoạt động ({active})</span>}
                {inactive > 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30" /> {Math.round(pInactive)}% vô hiệu ({inactive})</span>}
            </div>
        </div>
    );
}

function AssetTypeSummary({ stats, filterActive }) {
    const total = stats?.total || 0;
    const byStatus = stats?.by_status || null;
    const filteredTotal = filterActive === "all" ? total
        : filterActive === "active" ? (byStatus?.active || 0)
            : (byStatus?.inactive || 0);

    return (
        <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-6 p-5">
                <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Package className="size-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
                        <p className="text-sm text-muted-foreground mt-1">Loại tài sản</p>
                    </div>
                </div>
                <div className="w-px h-14 bg-border shrink-0" />
                <AssetTypeStatusBar byStatus={byStatus} total={total} filter={filterActive} />
            </div>
        </div>
    );
}

/* ── Shared form fields ────────────────────── */

function AssetTypeFormFields({ form, setForm, errors, setErrors }) {
    const set = (key) => (e) => {
        setForm((p) => ({ ...p, [key]: e.target.value }));
        if (setErrors && (errors[key] || errors.root)) {
            setErrors(p => {
                const n = { ...p };
                delete n[key];
                delete n.root;
                return n;
            });
        }
    };

    return (
        <>
            <div className="space-y-1.5">
                <Label className={errors.name ? "text-destructive" : ""}>Tên loại tài sản *</Label>
                <Input
                    value={form.name}
                    onChange={set("name")}
                    placeholder="VD: Giường, Bàn, Tủ..."
                    className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-[11px] text-destructive">Vui lòng nhập tên</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Mô tả</Label>
                <Textarea
                    value={form.description}
                    onChange={set("description")}
                    placeholder="Mô tả ngắn gọn..."
                    rows={2}
                />
            </div>

            <div className="space-y-1.5">
                <Label className={errors.default_price ? "text-destructive" : ""}>Giá mặc định (₫)</Label>
                <Input
                    type="number" min="0" step="1000"
                    value={form.default_price}
                    onChange={set("default_price")}
                    placeholder="0"
                    className={errors.default_price ? "border-destructive" : ""}
                />
                {errors.default_price && <p className="text-[11px] text-destructive">{errors.default_price}</p>}
            </div>
        </>
    );
}

function validateForm(form) {
    const e = {};
    if (!form.name?.trim()) e.name = "Vui lòng nhập tên loại tài sản";
    if (form.default_price !== "" && Number(form.default_price) < 0) e.default_price = "Giá phải từ 0 trở lên";
    return e;
}

function formToPayload(form) {
    return {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        default_price: form.default_price !== "" ? Number(form.default_price) : 0,
    };
}

/* ── Detail Dialog (view / edit) ── */

function AssetTypeDetailDialog({ open, onOpenChange, assetType, onSave, onDelete, saving }) {
    const [editing, setEditing] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) { setEditing(false); setConfirmDel(false); }
    }, [open]);

    const startEdit = () => {
        setForm({
            name: assetType.name || "",
            description: assetType.description || "",
            default_price: assetType.default_price ?? "",
        });
        setErrors({});
        setEditing(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validateForm(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setErrors({});
        try {
            await onSave(assetType.id, formToPayload(form));
            setEditing(false);
        } catch (err) {
            setErrors({ root: err.message || "Đã xảy ra lỗi khi cập nhật." });
        }
    };

    if (!assetType) return null;
    const at = assetType;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                {editing ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Chỉnh sửa loại tài sản</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                            <AssetTypeFormFields form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                            {errors.root && (
                                <p className="text-[11px] text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10 text-center">
                                    {errors.root}
                                </p>
                            )}

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : <CheckCircle className="size-4 mr-1.5" />}
                                    Lưu thay đổi
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : confirmDel ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Xóa loại tài sản</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 text-center space-y-2">
                             <p className="text-sm text-muted-foreground">
                                Bạn có chắc muốn xóa vĩnh viễn loại tài sản{" "}
                                <strong className="text-foreground">&quot;{at.name}&quot;</strong>?
                            </p>
                            <p className="text-[11px] text-destructive bg-destructive/5 p-2 rounded border border-destructive/10">
                                Lưu ý: Chỉ có thể xóa nếu không có tài sản nào đang sử dụng loại này.
                            </p>
                        </div>
                        <DialogFooter className="justify-center gap-2">
                            <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
                            <Button variant="destructive" disabled={saving} onClick={() => onDelete(at.id)}>
                                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                                Xác nhận xóa
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5">
                                {at.name}
                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${at.is_active
                                    ? "bg-success/15 text-success"
                                    : "bg-muted text-muted-foreground"
                                    }`}>
                                    {at.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                                </span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {at.description && (
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mô tả</p>
                                    <p className="text-sm mt-0.5">{at.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Banknote className="size-3.5 text-muted-foreground" />
                                        <p className="text-[11px] text-muted-foreground">Giá mặc định</p>
                                    </div>
                                    <p className="text-sm font-semibold">{fmtPrice(at.default_price)}</p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Package className="size-3.5 text-muted-foreground" />
                                        <p className="text-[11px] text-muted-foreground">Trạng thái</p>
                                    </div>
                                    <p className="text-sm font-semibold">{at.is_active ? "Hoạt động" : "Vô hiệu hóa"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tạo</p>
                                    <p className="text-sm font-medium mt-0.5">{fmt(at.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cập nhật</p>
                                    <p className="text-sm font-medium mt-0.5">{fmt(at.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button
                                variant="outline" size="sm"
                                className="text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={() => setConfirmDel(true)}
                            >
                                <Trash className="size-3.5" /> Xóa loại tài sản
                            </Button>
                            <Button size="sm" className="gap-1.5" onClick={startEdit}>
                                <PencilSimple className="size-3.5" /> Chỉnh sửa
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ── Create Dialog ─────────────────────────── */

function AssetTypeCreateDialog({ open, onOpenChange, onSave, saving }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    // Load draft on mount
    useEffect(() => {
        const saved = localStorage.getItem("fscape_assettype_draft");
        if (saved) {
            try { setForm(JSON.parse(saved)); } catch { setForm(EMPTY_FORM); }
        }
    }, []);

    // Sync draft to storage
    useEffect(() => {
        if (form !== EMPTY_FORM) {
            localStorage.setItem("fscape_assettype_draft", JSON.stringify(form));
        }
    }, [form]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validateForm(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setErrors({});
        try {
            await onSave(formToPayload(form));
            localStorage.removeItem("fscape_assettype_draft");
            setForm(EMPTY_FORM);
            onOpenChange(false);
        } catch (err) {
            setErrors({ root: err.message || "Đã xảy ra lỗi khi thêm mới." });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Thêm loại tài sản mới</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                    <AssetTypeFormFields form={form} setForm={setForm} errors={errors} setErrors={setErrors} />

                    {errors.root && (
                        <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10 text-center">
                            {errors.root}
                        </p>
                    )}

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button type="submit" disabled={saving} className="gap-1.5">
                            {saving ? <CircleNotch className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            Thêm loại tài sản
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ── Main Page ─────────────────────────────── */

export default function AssetTypesPage() {
    const [types, setTypes] = useState([]);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState("all");
    const [sortField, setSortField] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const [showCreate, setShowCreate] = useState(false);
    const [detailType, setDetailType] = useState(null);
    const [confirmToggle, setConfirmToggle] = useState(null);
    const [error, setError] = useState(null);
    const [msgDialog, setMsgDialog] = useState(null);

    const limit = 10;

    const fetchStats = () => {
        api.get("/api/asset-types/stats")
            .then(res => setStats(res.data || res))
            .catch(console.error);
    };

    const fetchTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page, limit });
            if (search.trim()) params.set("search", search.trim());
            if (filterActive === "active") params.set("is_active", "true");
            if (filterActive === "inactive") params.set("is_active", "false");

            const res = await api.get(`/api/asset-types?${params}`);
            setTypes(res.data || []);
            setTotal(res.total || 0);
            setPage(res.page || 1);
            setTotalPages(res.total_pages || res.totalPages || 1);
        } catch {
            setError("Không thể tải dữ liệu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [page, search, filterActive]);

    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { fetchTypes(); }, [fetchTypes]);
    useEffect(() => { setPage(1); }, [search, filterActive]);

    useEffect(() => {
        const handleUpdate = (e) => {
            const { id, updates } = e.detail;
            setTypes((prev) => {
                const updated = prev.map(t => String(t.id) === String(id) ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
                if (filterActive === "all") return updated;
                const filtered = updated.filter(t => {
                    if (filterActive === "active") return t.is_active;
                    if (filterActive === "inactive") return !t.is_active;
                    return true;
                });
                if (filtered.length !== updated.length) setTotal(p => Math.max(0, p - 1));
                return filtered;
            });
            fetchStats();
        };
        const handleCreate = () => fetchTypes();
        const handleDelete = (e) => {
            const { id } = e.detail;
            setTypes((prev) => {
                const next = prev.filter(t => String(t.id) !== String(id));
                if (next.length !== prev.length) setTotal(p => Math.max(0, p - 1));
                return next;
            });
            fetchStats();
        };

        window.addEventListener("asset-type-updated", handleUpdate);
        window.addEventListener("asset-type-created", handleCreate);
        window.addEventListener("asset-type-deleted", handleDelete);
        return () => {
            window.removeEventListener("asset-type-updated", handleUpdate);
            window.removeEventListener("asset-type-created", handleCreate);
            window.removeEventListener("asset-type-deleted", handleDelete);
        };
    }, [fetchTypes]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    const sorted = [...types].sort((a, b) => {
        if (!sortField) return 0;
        if (sortField === "default_price") return sortDir === "asc" ? Number(a.default_price) - Number(b.default_price) : Number(b.default_price) - Number(a.default_price);
        const diff = new Date(a[sortField]) - new Date(b[sortField]);
        return sortDir === "asc" ? diff : -diff;
    });

    const handleCreate = async (data) => {
        setSaving(true);
        try {
            await api.post("/api/asset-types", data);
            toast.success(`Đã thêm loại tài sản "${data.name}"`);
            window.dispatchEvent(new CustomEvent("asset-type-created"));
            fetchStats();
        } catch (err) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id, data) => {
        setSaving(true);
        try {
            await api.put(`/api/asset-types/${id}`, data);
            toast.success("Cập nhật loại tài sản thành công");
            window.dispatchEvent(new CustomEvent("asset-type-updated", { detail: { id, updates: data } }));
            fetchStats();
        } catch (err) {
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setSaving(true);
        try {
            await api.delete(`/api/asset-types/${id}`);
            toast.success("Đã xóa loại tài sản");
            window.dispatchEvent(new CustomEvent("asset-type-deleted", { detail: { id } }));
            setDetailType(null);
            fetchStats();
        } catch (err) {
            toast.error(err.message || "Không thể vô hiệu hóa.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleConfirm = async () => {
        setSaving(true);
        const updates = { is_active: !confirmToggle.is_active };
        try {
            await api.put(`/api/asset-types/${confirmToggle.id}`, updates);
            toast.success(confirmToggle.is_active ? "Đã vô hiệu hóa loại tài sản" : "Đã kích hoạt loại tài sản");
            window.dispatchEvent(new CustomEvent("asset-type-updated", { detail: { id: confirmToggle.id, updates } }));
            setConfirmToggle(null);
            fetchStats();
        } catch (err) {
            toast.error(err.message || "Không thể cập nhật.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Loại tài sản</h1>
                    <p className="text-sm text-muted-foreground">Quản lý danh mục loại tài sản FScape</p>
                </div>
                <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
                    <Plus className="size-4" /> Thêm loại tài sản
                </Button>
            </div>

            {/* Summary */}
            <AssetTypeSummary stats={stats} filterActive={filterActive} />

            {/* Search + filter */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[280px]">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm theo tên loại tài sản..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-1.5">
                    {["all", "active", "inactive"].map((k) => (
                        <Button
                            key={k}
                            size="sm"
                            variant={filterActive === k ? "default" : "outline"}
                            onClick={() => setFilterActive(k)}
                        >
                            {k === "all" ? "Tất cả" : k === "active" ? "Hoạt động" : "Vô hiệu hóa"}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Pagination Header */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-medium text-muted-foreground">{total} kết quả</p>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{page}/{totalPages}</span>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="size-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <CaretLeft className="size-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                <CaretRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <LoadingState className="py-20" />
            ) : error ? (
                <div className="py-14 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={fetchTypes}>
                        Thử lại
                    </Button>
                </div>
            ) : sorted.length === 0 ? (
                <EmptyState icon={Package} message="Không tìm thấy loại tài sản nào" />
            ) : (
            <Card className="overflow-hidden py-0 gap-0">
                <Table>
                    <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-12 pl-4">#</TableHead>
                                    <TableHead>Loại tài sản</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("default_price")}>
                                        <span className="inline-flex items-center">Giá mặc định <SortIcon field="default_price" sortField={sortField} sortDir={sortDir} /></span>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                                        <span className="inline-flex items-center">Ngày tạo <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} /></span>
                                    </TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right pr-4">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((t, idx) => (
                                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDetailType(t)}>
                                            <TableCell className="pl-4 text-muted-foreground text-xs">{(page - 1) * limit + idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-[14px]">{t.name}</span>
                                                    <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[260px]">{t.description || "Chưa có mô tả"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-semibold">{fmtPrice(t.default_price)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">{fmt(t.created_at)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className={`size-2 rounded-full ${t.is_active ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted-foreground/30"}`} />
                                                    <span className={t.is_active ? "text-success font-medium" : "text-muted-foreground"}>
                                                        {t.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-4">
                                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setConfirmToggle(t)}>
                                                        {t.is_active ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setDetailType(t)}>
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
            </Card>
            )}

            <AssetTypeDetailDialog open={!!detailType} onOpenChange={(v) => !v && setDetailType(null)} assetType={detailType} onSave={handleUpdate} onDelete={handleDelete} saving={saving} />
            <AssetTypeCreateDialog open={showCreate} onOpenChange={setShowCreate} onSave={handleCreate} saving={saving} />

            {/* Toggle confirm */}
            <Dialog open={!!confirmToggle} onOpenChange={(v) => !v && setConfirmToggle(null)}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader><DialogTitle>{confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"} loại tài sản</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Bạn có chắc muốn {confirmToggle?.is_active ? "vô hiệu hóa" : "kích hoạt"} loại tài sản <strong>&quot;{confirmToggle?.name}&quot;</strong>?</p>
                    <DialogFooter className="justify-center gap-2">
                        <Button variant="outline" onClick={() => setConfirmToggle(null)}>Hủy</Button>
                        <Button variant={confirmToggle?.is_active ? "destructive" : "outline"} className={!confirmToggle?.is_active ? "bg-success text-white border-none" : ""} disabled={saving} onClick={handleToggleConfirm}>
                            {saving && <CircleNotch className="size-4 animate-spin mr-1" />}
                            {confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Message dialog */}
            <Dialog open={!!msgDialog} onOpenChange={(v) => { if (!v) setMsgDialog(null); }}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader><DialogTitle>{msgDialog?.title || "Thông báo"}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">{msgDialog?.message}</p>
                    <DialogFooter className="justify-center">
                        <Button onClick={() => setMsgDialog(null)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
