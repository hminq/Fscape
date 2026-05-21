import { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, MagnifyingGlass, PencilSimple, Trash, House, ToggleLeft, ToggleRight,
    CaretUp, CaretDown, CaretUpDown, CircleNotch, Eye,
    Bed, Bathtub, ArrowsOutSimple, Users, Money as Banknote, CaretLeft, CaretRight,
    ArrowLeft, CheckCircle, Package,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
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
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/apiClient";
import { cn, formatDate as fmt } from "@/lib/utils";
import RoomTypeAssetConfigPanel from "@/components/RoomTypeAssetConfigPanel";

const fmtPrice = (v) => {
    if (v == null || v === "") return "—";
    return Number(v).toLocaleString("vi-VN") + " ₫";
};

const EMPTY_FORM = {
    name: "",
    description: "",
    base_price: "",
    capacity_min: "1",
    capacity_max: "1",
    bedrooms: "0",
    bathrooms: "0",
    area_sqm: "",
    is_active: "true",
};

const ROOM_TYPE_DRAFT_KEY = "room_type_draft";

function loadDraftForm() {
    const legacyDraft = localStorage.getItem("fscape_roomtype_draft");
    const savedDraft = localStorage.getItem(ROOM_TYPE_DRAFT_KEY) || legacyDraft;

    if (!savedDraft) return { ...EMPTY_FORM };

    try {
        return { ...EMPTY_FORM, ...JSON.parse(savedDraft) };
    } catch {
        return { ...EMPTY_FORM };
    }
}

function clearDraftForm() {
    localStorage.removeItem(ROOM_TYPE_DRAFT_KEY);
    localStorage.removeItem("fscape_roomtype_draft");
}

function SortIcon({ field, sortField, sortDir }) {
    if (sortField !== field) return <CaretUpDown className="size-3.5 ml-1 opacity-40" />;
    return sortDir === "asc"
        ? <CaretUp className="size-3.5 ml-1 text-primary" />
        : <CaretDown className="size-3.5 ml-1 text-primary" />;
}

/* ── Donut Summary (inline, filter-reactive) ──── */

function RoomTypeStatusDonut({ active = 0, inactive = 0, total = 0, size = 72 }) {
    const segments = [
        { count: active, color: "var(--color-success)" },
        { count: inactive, color: "var(--color-muted-foreground)" },
    ].filter((segment) => segment.count > 0);

    const r = 36;
    const stroke = 10;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
                {segments.map((segment, index) => {
                    const length = total > 0 ? (segment.count / total) * circ : 0;
                    const dashOffset = -offset;
                    offset += length;
                    return (
                        <circle
                            key={index}
                            cx="50"
                            cy="50"
                            r={r}
                            fill="none"
                            strokeWidth={stroke}
                            stroke={segment.color}
                            strokeDasharray={`${length} ${circ - length}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold leading-none">{total > 0 ? total : 0}</span>
            </div>
        </div>
    );
}

function RoomTypeStatusSummary({ byStatus, total = 0, filter = "all" }) {
    const hasData = byStatus != null;
    const active = filter === "all" ? (byStatus?.active || 0) : filter === "active" ? (byStatus?.active || 0) : 0;
    const inactive = filter === "all" ? (byStatus?.inactive || 0) : filter === "inactive" ? (byStatus?.inactive || 0) : 0;
    const filteredTotal = filter === "all" ? total : filter === "active" ? (byStatus?.active || 0) : (byStatus?.inactive || 0);
    const pActive = filteredTotal > 0 ? Math.round((active / filteredTotal) * 100) : 0;
    const pInactive = filteredTotal > 0 ? Math.round((inactive / filteredTotal) * 100) : 0;
    const filterLabel = filter === "active" ? "hoạt động" : filter === "inactive" ? "vô hiệu hóa" : null;

    return (
        <div className="flex items-center gap-4">
            <div className="space-y-2">
                {!hasData && <div className="text-xs text-muted-foreground">Đang chờ dữ liệu...</div>}
                {hasData && filteredTotal === 0 && (
                    <div className="text-xs text-muted-foreground">0 loại phòng {filterLabel}</div>
                )}
                {active > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-success shrink-0" />
                        <span className="text-xs text-muted-foreground">{pActive}% hoạt động</span>
                    </div>
                )}
                {inactive > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-muted-foreground/40 shrink-0" />
                        <span className="text-xs text-muted-foreground">{pInactive}% vô hiệu hóa</span>
                    </div>
                )}
            </div>
            <RoomTypeStatusDonut active={active} inactive={inactive} total={filteredTotal} size={64} />
        </div>
    );
}

function RoomTypeSummary({ stats, filterActive }) {
    const total = stats?.total || 0;
    const byStatus = stats?.by_status || {};
    const filteredTotal = filterActive === "all" ? total
        : filterActive === "active" ? (byStatus.active || 0)
            : (byStatus.inactive || 0);

    return (
        <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-6 p-5">
                <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <House className="size-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
                        <p className="text-sm text-muted-foreground mt-1">Loại phòng</p>
                    </div>
                </div>
                <div className="w-px h-14 bg-border shrink-0" />
                <div className="ml-auto">
                    <RoomTypeStatusSummary byStatus={byStatus} total={total} filter={filterActive} />
                </div>
            </div>
        </div>
    );
}

/* ── Shared form fields ────────────────────── */

function RoomTypeFormFields({ form, setForm, errors, setErrors, hideStatus = false }) {
    const set = (key) => (e) => {
        setForm((p) => ({ ...p, [key]: e.target.value }));
        if (setErrors && (errors[key] || errors.root)) {
            setErrors((p) => {
                const newErrs = { ...p };
                delete newErrs[key];
                delete newErrs.root;
                return newErrs;
            });
        }
    };

    return (
        <>
            <div className="space-y-1.5">
                <Label className={errors.name ? "text-destructive" : ""}>Tên loại phòng *</Label>
                <Input
                    value={form.name}
                    onChange={set("name")}
                    placeholder="VD: Phòng đơn, Studio..."
                    className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className={errors.description ? "text-destructive" : ""}>Mô tả</Label>
                <Textarea
                    value={form.description}
                    onChange={set("description")}
                    placeholder="Mô tả ngắn gọn về loại phòng này..."
                    rows={2}
                    className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && <p className="text-[11px] text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className={errors.base_price ? "text-destructive" : ""}>Giá cơ bản (₫) *</Label>
                <Input
                    type="number" min="0" step="1000"
                    value={form.base_price}
                    onChange={set("base_price")}
                    placeholder="0"
                    className={errors.base_price ? "border-destructive" : ""}
                />
                {errors.base_price && <p className="text-[11px] text-destructive">{errors.base_price}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className={errors.capacity_min ? "text-destructive" : ""}>Sức chứa tối thiểu *</Label>
                    <Input
                        type="number" min="1"
                        value={form.capacity_min}
                        onChange={set("capacity_min")}
                        className={errors.capacity_min ? "border-destructive" : ""}
                    />
                    {errors.capacity_min && <p className="text-[11px] text-destructive">{errors.capacity_min}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className={errors.capacity_max ? "text-destructive" : ""}>Sức chứa tối đa *</Label>
                    <Input
                        type="number" min="1"
                        value={form.capacity_max}
                        onChange={set("capacity_max")}
                        className={errors.capacity_max ? "border-destructive" : ""}
                    />
                    {errors.capacity_max && <p className="text-[11px] text-destructive">{errors.capacity_max}</p>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <Label className={errors.bedrooms ? "text-destructive" : ""}>Phòng ngủ</Label>
                    <Input type="number" min="0" value={form.bedrooms} onChange={set("bedrooms")} className={errors.bedrooms ? "border-destructive" : ""} />
                    {errors.bedrooms && <p className="text-[11px] text-destructive">{errors.bedrooms}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className={errors.bathrooms ? "text-destructive" : ""}>Phòng tắm</Label>
                    <Input type="number" min="0" value={form.bathrooms} onChange={set("bathrooms")} className={errors.bathrooms ? "border-destructive" : ""} />
                    {errors.bathrooms && <p className="text-[11px] text-destructive">{errors.bathrooms}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className={errors.area_sqm ? "text-destructive" : ""}>Diện tích (m²)</Label>
                    <Input type="number" min="0" step="0.1" value={form.area_sqm} onChange={set("area_sqm")} placeholder="0" className={errors.area_sqm ? "border-destructive" : ""} />
                    {errors.area_sqm && <p className="text-[11px] text-destructive">{errors.area_sqm}</p>}
                </div>
            </div>

            {!hideStatus && (
                <div className="space-y-1.5">
                    <Label>Trạng thái</Label>
                    <Select value={form.is_active} onValueChange={(v) => {
                        setForm((p) => ({ ...p, is_active: v }));
                        if (setErrors) setErrors({});
                    }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">Hoạt động</SelectItem>
            <SelectItem value="false">Vô hiệu hóa</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </>
    );
}

function validateForm(form) {
    const e = {};
    const name = form.name?.trim() || "";
    const description = form.description?.trim() || "";
    const basePrice = Number(form.base_price);
    const capacityMin = Number(form.capacity_min);
    const capacityMax = Number(form.capacity_max);
    const bedrooms = form.bedrooms === "" ? undefined : Number(form.bedrooms);
    const bathrooms = form.bathrooms === "" ? undefined : Number(form.bathrooms);
    const areaSqm = form.area_sqm === "" ? undefined : Number(form.area_sqm);

    if (!name) e.name = "Tên không được để trống";
    else if (name.length > 100) e.name = "Tên phải từ 1–100 ký tự";

    if (description.length > 2000) e.description = "Mô tả tối đa 2000 ký tự";

    if (form.base_price === "" || form.base_price == null) e.base_price = "Giá cơ bản không được để trống";
    else if (Number.isNaN(basePrice) || basePrice < 0 || basePrice > 500000000) {
        e.base_price = "Giá cơ bản phải từ 0 đến 500.000.000";
    }

    if (form.capacity_min === "" || form.capacity_min == null) e.capacity_min = "Sức chứa tối thiểu không được để trống";
    else if (!Number.isInteger(capacityMin) || capacityMin < 1 || capacityMin > 10) {
        e.capacity_min = "Sức chứa tối thiểu phải từ 1 đến 10";
    }

    if (form.capacity_max === "" || form.capacity_max == null) e.capacity_max = "Sức chứa tối đa không được để trống";
    else if (!Number.isInteger(capacityMax) || capacityMax < 1 || capacityMax > 10) {
        e.capacity_max = "Sức chứa tối đa phải từ 1 đến 10";
    } else if (!e.capacity_min && capacityMax < capacityMin) {
        e.capacity_max = "Sức chứa tối đa phải lớn hơn hoặc bằng sức chứa tối thiểu";
    }

    if (bedrooms !== undefined && (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 10)) {
        e.bedrooms = "Số phòng ngủ phải từ 0 đến 10";
    }

    if (bathrooms !== undefined && (!Number.isInteger(bathrooms) || bathrooms < 0 || bathrooms > 10)) {
        e.bathrooms = "Số phòng tắm phải từ 0 đến 10";
    }

    if (areaSqm !== undefined && (Number.isNaN(areaSqm) || areaSqm < 0 || areaSqm > 1000)) {
        e.area_sqm = "Diện tích phải từ 0 đến 1000 m²";
    }

    return e;
}

function formToPayload(form) {
    return {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        base_price: Number(form.base_price),
        capacity_min: Number(form.capacity_min),
        capacity_max: Number(form.capacity_max),
        bedrooms: form.bedrooms === "" ? undefined : Number(form.bedrooms),
        bathrooms: form.bathrooms === "" ? undefined : Number(form.bathrooms),
        area_sqm: form.area_sqm === "" ? undefined : Number(form.area_sqm),
        is_active: form.is_active === "true",
    };
}

/* ── RoomType Detail Dialog (view / edit / delete) ── */

function RoomTypeDetailDialog({ open, onOpenChange, roomType, onSave, onDelete, onManageAssets, saving }) {
    const [editing, setEditing] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [form, setForm] = useState(null);
    const [errors, setErrors] = useState({});

    const startEdit = () => {
        setForm({
            name: roomType.name || "",
            description: roomType.description || "",
            base_price: roomType.base_price ?? "",
            capacity_min: String(roomType.capacity_min ?? 1),
            capacity_max: String(roomType.capacity_max ?? 1),
            bedrooms: String(roomType.bedrooms ?? 1),
            bathrooms: String(roomType.bathrooms ?? 1),
            area_sqm: roomType.area_sqm ?? "",
            is_active: String(roomType.is_active ?? true),
        });
        setErrors({});
        setEditing(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validateForm(form);
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;
        onSave(roomType.id, formToPayload(form));
    };

    if (!roomType) return null;

    const rt = roomType;
    const handleDialogOpenChange = (nextOpen) => {
        if (!nextOpen) {
            setEditing(false);
            setConfirmDel(false);
        }
        onOpenChange(nextOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="max-w-lg">
                {editing ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Chỉnh sửa loại phòng</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-3 pt-1 max-h-[70vh] overflow-y-auto pr-1">
                            <RoomTypeFormFields form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                            {errors.root && (
                                <p className="text-[11px] text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                                    {errors.root}
                                </p>
                            )}
                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                                <Button type="submit" disabled={saving}>
                                    {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                                    Lưu thay đổi
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                ) : confirmDel ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Xóa loại phòng</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground text-center py-2">
                            Bạn có chắc muốn xóa loại phòng{" "}
                            <strong className="text-foreground">&quot;{rt.name}&quot;</strong>?
                        </p>
                        <DialogFooter className="justify-center gap-2">
                            <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
                            <Button variant="destructive" disabled={saving} onClick={() => onDelete(rt.id)}>
                                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                               Xóa loại phòng
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5">
                                {rt.name}
                                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${rt.is_active
                                    ? "bg-success/15 text-success"
                                    : "bg-muted text-muted-foreground"
                                    }`}>
                                    {rt.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                                </span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {rt.description && (
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mô tả</p>
                                    <p className="text-sm mt-0.5">{rt.description}</p>
                                </div>
                            )}

                            {/* Specs grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: Banknote, label: "Giá cơ bản", value: fmtPrice(rt.base_price) },
                                    { icon: Users, label: "Sức chứa", value: `${rt.capacity_min}–${rt.capacity_max} người` },
                                    { icon: ArrowsOutSimple, label: "Diện tích", value: rt.area_sqm != null ? `${rt.area_sqm} m²` : "—" },
                                    { icon: Bed, label: "Phòng ngủ", value: rt.bedrooms ?? "—" },
                                    { icon: Bathtub, label: "Phòng tắm", value: rt.bathrooms ?? "—" },
                                ].map((item) => {
                                    const iconNode = <item.icon className="size-3.5 text-muted-foreground" />;

                                    return (
                                    <div key={item.label} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {iconNode}
                                            <p className="text-[11px] text-muted-foreground">{item.label}</p>
                                        </div>
                                        <p className="text-sm font-semibold">{item.value}</p>
                                    </div>
                                )})}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tạo</p>
                                    <p className="text-sm font-medium mt-0.5">{fmt(rt.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cập nhật</p>
                                    <p className="text-sm font-medium mt-0.5">{fmt(rt.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button
                                variant="destructive" size="sm"
                                className="gap-1.5"
                                onClick={() => setConfirmDel(true)}
                            >
                                <Trash className="size-3.5" /> Xóa loại phòng
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={onManageAssets}>
                                    Tài sản
                                </Button>
                                <Button size="sm" className="gap-1.5" onClick={startEdit}>
                                    <PencilSimple className="size-3.5" /> Chỉnh sửa
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ── Asset Assignment Dialog ─────────────────── */

function AssetAssignmentDialog({ open, onOpenChange, roomType, onUpdated }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Định mức tài sản - {roomType?.name}</DialogTitle>
                </DialogHeader>
                {open && roomType ? (
                    <RoomTypeAssetConfigPanel
                        roomTypeId={roomType.id}
                        roomTypeName={roomType.name}
                        mode="dialog"
                        onUpdated={onUpdated}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function mapCreateErrors(err) {
    const mapped = {};

    if (err?.data?.errors && Array.isArray(err.data.errors)) {
        err.data.errors.forEach((item) => {
            if (!item.path) return;
            if (item.path === "capacity_min" || item.path === "capacity_max") {
                mapped[item.path] = item.msg;
                return;
            }
            mapped[item.path] = item.msg;
        });
        return mapped;
    }

    if (err?.status === 409) {
        mapped.name = err.message || "Tên loại phòng đã tồn tại";
        return mapped;
    }

    if (err?.message?.includes("Sức chứa")) {
        mapped.capacity_max = err.message;
        return mapped;
    }

    mapped.root = err?.message || "Đã xảy ra lỗi.";
    return mapped;
}

/* ── Main Page ─────────────────────────────── */

export default function RoomTypesPage() {
    const [types, setTypes] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);

    const [search, setSearch] = useState("");
    const [filterActive, setFilterActive] = useState("all");
    const [sortField, setSortField] = useState(null);
    const [sortDir, setSortDir] = useState("asc");

    const [showCreateFlow, setShowCreateFlow] = useState(false);
    const [createStep, setCreateStep] = useState(1);
    const [createForm, setCreateForm] = useState(loadDraftForm);
    const [createErrors, setCreateErrors] = useState({});
    const [createdRoomType, setCreatedRoomType] = useState(null);
    const [assetConfigDirty, setAssetConfigDirty] = useState(false);
    const [assetConfigSaving, setAssetConfigSaving] = useState(false);
    const [detailType, setDetailType] = useState(null);
    const [showAssetDialog, setShowAssetDialog] = useState(false);
    const [confirmToggle, setConfirmToggle] = useState(null);
    const [error, setError] = useState(null);
    const saveAssetConfigRef = useRef(null);

    const limit = 10;

    const fetchStats = useCallback(() => {
        api.get("/api/room-types/stats")
            .then(res => setStats(res.data || res))
            .catch(console.error);
    }, []);

    const fetchTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page, limit });
            if (search.trim()) params.set("search", search.trim());
            if (filterActive === "active") params.set("is_active", "true");
            if (filterActive === "inactive") params.set("is_active", "false");

            const res = await api.get(`/api/room-types?${params}`);
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

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchTypes(); }, [fetchTypes]);
    useEffect(() => { setPage(1); }, [search, filterActive]);
    useEffect(() => {
        if (!showCreateFlow || createStep !== 1) return;
        localStorage.setItem(ROOM_TYPE_DRAFT_KEY, JSON.stringify(createForm));
    }, [createForm, createStep, showCreateFlow]);

    // Event listeners for real-time updates
    useEffect(() => {
        const onCreated = () => { fetchTypes(); fetchStats(); };
        const onUpdated = (e) => {
            const { id, updates } = e.detail;
            setTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            
            // If status changed and we are filtering, remove from view and decrement total
            if (updates.is_active !== undefined && filterActive !== "all") {
                const isNowInactive = updates.is_active === false || updates.is_active === "false";
                const isNowActive = updates.is_active === true || updates.is_active === "true";
                
                if ((filterActive === "active" && isNowInactive) || (filterActive === "inactive" && isNowActive)) {
                    setTypes(prev => prev.filter(t => t.id !== id));
                    setTotal(p => Math.max(0, p - 1));
                }
            }
            fetchStats();
        };
        const onDeleted = (e) => {
            const { id } = e.detail;
            setTypes(prev => prev.filter(t => t.id !== id));
            setTotal(p => Math.max(0, p - 1));
            fetchStats();
        };

        window.addEventListener("room-type-created", onCreated);
        window.addEventListener("room-type-updated", onUpdated);
        window.addEventListener("room-type-deleted", onDeleted);
        return () => {
            window.removeEventListener("room-type-created", onCreated);
            window.removeEventListener("room-type-updated", onUpdated);
            window.removeEventListener("room-type-deleted", onDeleted);
        };
    }, [fetchStats, fetchTypes, filterActive]);

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
        if (sortField === "base_price") return sortDir === "asc" ? Number(a.base_price) - Number(b.base_price) : Number(b.base_price) - Number(a.base_price);
        const diff = new Date(a[sortField]) - new Date(b[sortField]);
        return sortDir === "asc" ? diff : -diff;
    });

    const resetCreateFlow = useCallback(({ keepDraft = true } = {}) => {
        setShowCreateFlow(false);
        setCreateStep(1);
        setCreateErrors({});
        setCreatedRoomType(null);
        setAssetConfigDirty(false);
        setAssetConfigSaving(false);
        saveAssetConfigRef.current = null;
        setCreateForm(keepDraft ? loadDraftForm() : { ...EMPTY_FORM });
        if (!keepDraft) clearDraftForm();
    }, []);

    const startCreateFlow = () => {
        setCreateForm(loadDraftForm());
        setCreateErrors({});
        setCreatedRoomType(null);
        setCreateStep(1);
        saveAssetConfigRef.current = null;
        setShowCreateFlow(true);
    };

    const handleCreateContinue = async () => {
        const errs = validateForm(createForm);
        setCreateErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            const res = await api.post("/api/room-types", { ...formToPayload(createForm), is_active: true });
            const roomType = res.data || res;
            setCreatedRoomType(roomType);
            setCreateStep(2);
            setCreateErrors({});
            clearDraftForm();
            window.dispatchEvent(new CustomEvent("room-type-created"));
            toast.success(roomType?.name ? `Đã tạo loại phòng "${roomType.name}"` : "Đã tạo loại phòng thành công");
        } catch (err) {
            const mappedErrors = mapCreateErrors(err);
            if (mappedErrors.root) toast.error(mappedErrors.root);
            setCreateErrors(mappedErrors);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id, data) => {
        setSaving(true);
        try {
            await api.put(`/api/room-types/${id}`, data);
            toast.success("Cập nhật loại phòng thành công");
            setDetailType(null);
            window.dispatchEvent(new CustomEvent("room-type-updated", { detail: { id, updates: data } }));
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Đã xảy ra lỗi.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setSaving(true);
        try {
            await api.delete(`/api/room-types/${id}`);
            toast.success("Đã xóa loại phòng");
            setDetailType(null);
            window.dispatchEvent(new CustomEvent("room-type-deleted", { detail: { id } }));
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Không thể xóa.");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleConfirm = async () => {
        setSaving(true);
        const updates = { is_active: !confirmToggle.is_active };
        try {
            await api.put(`/api/room-types/${confirmToggle.id}`, updates);
            toast.success(confirmToggle.is_active ? "Đã vô hiệu hóa loại phòng" : "Đã kích hoạt loại phòng");
            setConfirmToggle(null);
            window.dispatchEvent(new CustomEvent("room-type-updated", { detail: { id: confirmToggle.id, updates } }));
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Không thể cập nhật.");
        } finally {
            setSaving(false);
        }
    };

    const handleFinishCreateFlow = async () => {
        if (assetConfigDirty && saveAssetConfigRef.current) {
            const didSave = await saveAssetConfigRef.current();
            if (!didSave) return;
        }

        resetCreateFlow({ keepDraft: false });
    };

    const handleSkipAssetConfig = () => {
        resetCreateFlow({ keepDraft: false });
    };

    return (
        <div className={cn("mx-auto max-w-5xl space-y-6", showCreateFlow && "pb-24")}>
            {showCreateFlow ? (
                <>
                    <div className="pt-2">
                        <div className="mb-3 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => resetCreateFlow({ keepDraft: createStep === 1 })}
                                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
                            >
                                <ArrowLeft className="size-4" />
                            </button>
                            <p className="text-sm font-medium text-muted-foreground">Quay lại danh sách</p>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Thêm loại phòng mới</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Tạo loại phòng trước, sau đó cấu hình loại tài sản mặc định trên cùng màn hình.
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {[
                                {
                                    index: 1,
                                    title: "Thông tin loại phòng",
                                    description: "Nhập thông tin cơ bản và sức chứa.",
                                    icon: House,
                                },
                                {
                                    index: 2,
                                    title: "Cấu hình loại tài sản",
                                    description: "Thiết lập định mức tài sản mặc định.",
                                    icon: Package,
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isActive = createStep === item.index;
                                const isDone = createStep > item.index;

                                return (
                                    <div
                                        key={item.index}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                                            isDone
                                                ? "border-success/25 bg-success/5"
                                                : isActive
                                                    ? "border-primary/30 bg-primary/5"
                                                    : "border-border bg-card",
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-full border",
                                                isDone
                                                    ? "border-success/20 bg-success text-success-foreground"
                                                    : isActive
                                                        ? "border-primary/30 bg-primary/10 text-primary"
                                                        : "border-border bg-muted text-muted-foreground",
                                            )}
                                        >
                                            {isDone ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Bước {item.index}/2
                                            </p>
                                            <p className="text-sm font-semibold">{item.title}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {createStep === 1 ? (
                        <section className="rounded-xl border border-border bg-card p-5">
                            <div className="mb-5">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Thông tin loại phòng
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Thiết lập thông tin cơ bản trước khi cấu hình loại tài sản mặc định.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <RoomTypeFormFields
                                    form={createForm}
                                    setForm={setCreateForm}
                                    errors={createErrors}
                                    setErrors={setCreateErrors}
                                    hideStatus
                                />
                                {createErrors.root && (
                                    <div className="rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                        {createErrors.root}
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <div className="space-y-6">
                            <section className="rounded-xl border border-border bg-card p-5">
                                <div>
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        Tóm tắt loại phòng
                                    </h2>
                                    <p className="mt-2 text-lg font-semibold">{createdRoomType?.name}</p>
                                </div>

                                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Giá cơ bản
                                        </p>
                                        <p className="mt-1 text-sm font-medium">{fmtPrice(createdRoomType?.base_price)}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Sức chứa
                                        </p>
                                        <p className="mt-1 text-sm font-medium">
                                            {createdRoomType?.capacity_min}–{createdRoomType?.capacity_max} người
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Diện tích
                                        </p>
                                        <p className="mt-1 text-sm font-medium">
                                            {createdRoomType?.area_sqm != null ? `${createdRoomType.area_sqm} m²` : "—"}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <RoomTypeAssetConfigPanel
                                roomTypeId={createdRoomType?.id}
                                roomTypeName={createdRoomType?.name}
                                onRegisterSubmit={(handler) => {
                                    saveAssetConfigRef.current = handler;
                                }}
                                onDirtyChange={setAssetConfigDirty}
                                onSavingChange={setAssetConfigSaving}
                                onUpdated={() => {
                                    fetchTypes();
                                    fetchStats();
                                }}
                            />
                        </div>
                    )}

                    <div className="fixed bottom-0 left-56 right-0 z-50 flex items-center justify-end gap-3 border-t border-border bg-background/95 p-4 px-8 backdrop-blur-md">
                        {createStep === 1 ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => resetCreateFlow({ keepDraft: true })}
                                    disabled={saving}
                                    className="bg-background"
                                >
                                    Hủy
                                </Button>
                                <Button onClick={handleCreateContinue} disabled={saving}>
                                    {saving ? <CircleNotch className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
                                    Tạo loại phòng và tiếp tục
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSkipAssetConfig}
                                    disabled={assetConfigSaving}
                                    className="bg-background"
                                >
                                    Để sau
                                </Button>
                                <Button onClick={handleFinishCreateFlow} disabled={assetConfigSaving}>
                                    {assetConfigSaving && <CircleNotch className="mr-1.5 size-4 animate-spin" />}
                                    Hoàn tất
                                </Button>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Loại phòng</h1>
                            <p className="text-sm text-muted-foreground">Quản lý các loại cấu trúc phòng FScape</p>
                        </div>
                        <Button className="gap-1.5" onClick={startCreateFlow}>
                            <Plus className="size-4" /> Thêm loại phòng
                        </Button>
                    </div>

                    <RoomTypeSummary stats={stats} filterActive={filterActive} />

                    <div className="flex items-center gap-3 flex-wrap mt-2">
                        <div className="relative flex-1 min-w-[200px]">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên loại phòng..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-1.5">
                            {[
                                { key: "all", label: "Tất cả" },
                                { key: "active", label: "Hoạt động" },
                                { key: "inactive", label: "Vô hiệu hóa" },
                            ].map((f) => (
                                <Button
                                    key={f.key}
                                    size="sm"
                                    variant={filterActive === f.key ? "default" : "outline"}
                                    onClick={() => setFilterActive(f.key)}
                                >
                                    {f.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-sm font-medium text-muted-foreground">{total} kết quả</p>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{page}/{totalPages}</span>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline" className="size-8" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                                        <CaretLeft className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                                        <CaretRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

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
                        <EmptyState icon={Bed} message="Không tìm thấy loại phòng nào" />
                    ) : (
                        <Card className="overflow-hidden py-0 gap-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-12 pl-4">#</TableHead>
                                        <TableHead>Loại phòng</TableHead>
                                        <TableHead className="cursor-pointer" onClick={() => handleSort("base_price")}>
                                            <span className="inline-flex items-center">Giá <SortIcon field="base_price" sortField={sortField} sortDir={sortDir} /></span>
                                        </TableHead>
                                        <TableHead>Thông số</TableHead>
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
                                                    <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]">{t.description || "Chưa có mô tả"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-semibold">{fmtPrice(t.base_price)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1" title="Sức chứa">
                                                        <Users className="size-3.5" />{t.capacity_min}–{t.capacity_max}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1" title="Phòng ngủ">
                                                        <Bed className="size-3.5" />{t.bedrooms}
                                                    </span>
                                                    {t.area_sqm != null && (
                                                        <span className="inline-flex items-center gap-1" title="Diện tích">
                                                            <ArrowsOutSimple className="size-3.5" />{t.area_sqm}m²
                                                        </span>
                                                    )}
                                                </div>
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
                </>
            )}

            <RoomTypeDetailDialog
                open={!!detailType && !showAssetDialog}
                onOpenChange={(v) => !v && setDetailType(null)}
                roomType={detailType}
                onSave={handleUpdate}
                onDelete={handleDelete}
                onManageAssets={() => setShowAssetDialog(true)}
                saving={saving}
            />

            <AssetAssignmentDialog
                open={showAssetDialog}
                onOpenChange={setShowAssetDialog}
                roomType={detailType}
                onUpdated={() => {
                    fetchTypes();
                    fetchStats();
                }}
            />

            <Dialog open={!!confirmToggle} onOpenChange={(v) => !v && setConfirmToggle(null)}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader><DialogTitle>{confirmToggle?.is_active ? "Vô hiệu hóa loại phòng" : "Kích hoạt loại phòng"}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Bạn có chắc muốn {confirmToggle?.is_active ? "vô hiệu hóa" : "kích hoạt"} loại phòng <strong>&quot;{confirmToggle?.name}&quot;</strong>?</p>
                    <DialogFooter className="justify-center gap-2">
                        <Button variant="outline" onClick={() => setConfirmToggle(null)}>Hủy</Button>
                        <Button variant={confirmToggle?.is_active ? "destructive" : "outline"} className={!confirmToggle?.is_active ? "bg-success text-white border-none" : ""} disabled={saving} onClick={handleToggleConfirm}>
                            {saving && <CircleNotch className="size-4 animate-spin mr-1" />}
                            {confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
