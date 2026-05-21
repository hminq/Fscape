import { useState, useEffect, useCallback } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, MapPin, ToggleLeft, ToggleRight, CaretUp, CaretDown, CaretUpDown, CircleNotch, Eye, Buildings, CaretLeft, CaretRight, CheckCircle } from "@phosphor-icons/react";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate as fmt } from "@/lib/utils";

const EMPTY_FORM = { name: "", is_active: "true" };
const INACTIVE_LABEL = "Vô hiệu hóa";

/* ── DonutChart ─────────────────────────────── */

function DonutChart({ active, inactive, size = 72 }) {
  const total = active + inactive;
  const pct = total > 0 ? (active / total) * 100 : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="stroke-success transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold leading-none">{total > 0 ? Math.round(pct) : 0}%</span>
      </div>
    </div>
  );
}

function LocationSummary({ total, active, inactive }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5">
        <div className="flex items-center gap-4 flex-1">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <MapPin className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Khu vực</p>
          </div>
        </div>
        <div className="w-px h-14 bg-border shrink-0" />
        <div className="flex items-center gap-4">
          <DonutChart active={active} inactive={inactive} size={64} />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success shrink-0" />
              <span className="text-xs text-muted-foreground">Hoạt động</span>
              <span className="text-xs font-semibold ml-auto pl-2">{active}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-xs text-muted-foreground">Vô hiệu hóa</span>
              <span className="text-xs font-semibold ml-auto pl-2">{inactive}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <CaretUpDown className="size-3.5 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <CaretUp className="size-3.5 ml-1 text-primary" />
    : <CaretDown className="size-3.5 ml-1 text-primary" />;
}

/* ── Location Detail Dialog (view / edit / delete) ── */

function LocationDetailDialog({ open, onOpenChange, location, onSave, onDelete, saving }) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (open && location) {
      setEditing(false);
      setConfirmDel(false);
      setDetail(null);
      setLoadingDetail(true);
      api.get(`/api/locations/${location.id}`)
        .then((res) => setDetail(res.data ?? res))
        .catch(() => setDetail(null))
        .finally(() => setLoadingDetail(false));
    }
  }, [open, location]);

  const buildings = detail?.buildings || [];
  const loc = detail || location;

  const startEdit = () => {
    setForm({
      name: loc.name || "",
      is_active: String(loc.is_active ?? true),
    });
    setErrors({});
    setEditing(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = true;
    else if (form.name.trim().length > 100) e.name = "Tên khu vực phải từ 1–100 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      await onSave(location.id, { name: form.name.trim(), is_active: form.is_active === "true" });
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi khi cập nhật." });
    }
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {editing ? (
          /* ─── Edit mode ─── */
          <>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa khu vực</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Tên khu vực *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-[11px] text-destructive">
                    {errors.name === true ? "Vui lòng nhập tên khu vực" : errors.name}
                  </p>
                )}
                {errors.root && (
                  <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10">{errors.root}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={form.is_active} onValueChange={(v) => setForm((p) => ({ ...p, is_active: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Hoạt động</SelectItem>
                    <SelectItem value="false">{INACTIVE_LABEL}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : confirmDel ? (
          /* ─── Delete confirm ─── */
          <>
            <DialogHeader>
              <DialogTitle>Xóa khu vực</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center py-2">
              Bạn có chắc muốn xóa khu vực{" "}
              <strong className="text-foreground">&quot;{loc.name}&quot;</strong>?{" "}
              Hành động này không thể hoàn tác.
            </p>
            <DialogFooter className="justify-center gap-2 sm:justify-center">
              <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
              <Button variant="destructive" disabled={saving} onClick={() => onDelete(location.id)}>
                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                Xóa
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* ─── View mode ─── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                {loc.name}
                <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className={`size-2 rounded-full ${loc.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <span className={loc.is_active ? "text-success" : "text-muted-foreground"}>
                    {loc.is_active ? "Hoạt động" : INACTIVE_LABEL}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tạo</p>
                  <p className="text-sm font-medium mt-0.5">{fmt(loc.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cập nhật</p>
                  <p className="text-sm font-medium mt-0.5">{fmt(loc.updated_at)}</p>
                </div>
              </div>

              {/* Buildings */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Buildings className="size-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">Tòa nhà</span>
                  <span className="text-xs text-muted-foreground">({buildings.length})</span>
                </div>
                {loadingDetail ? (
                  <div className="flex justify-center py-3">
                    <CircleNotch className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : buildings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Chưa có tòa nhà nào.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {buildings.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{b.name}</span>
                        <span className={`size-2 rounded-full ${b.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="destructive" size="sm"
                className="gap-1.5"
                onClick={() => setConfirmDel(true)}
              >
                <Trash className="size-3.5" /> Xóa
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

function LocationCreateDialog({ open, onOpenChange, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("fscape_location_draft");
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch {
        setForm(EMPTY_FORM);
      }
    }
  }, []);

  // Sync draft to storage
  useEffect(() => {
    if (form !== EMPTY_FORM) {
      localStorage.setItem("fscape_location_draft", JSON.stringify(form));
    }
  }, [form]);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Vui lòng nhập tên khu vực";
    else if (form.name.trim().length > 100) e.name = "Tên khu vực phải từ 1–100 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = () => {
    localStorage.setItem("fscape_location_draft", JSON.stringify(form));
    toast.success("Đã lưu bản nháp khu vực");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      await onSave({ name: form.name.trim(), is_active: true });
      localStorage.removeItem("fscape_location_draft");
      setForm(EMPTY_FORM);
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi khi tạo khu vực." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm khu vực mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className={errors.name ? "text-destructive" : ""}>Tên khu vực *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }));
                if (errors.name || errors.root) setErrors({});
              }}
              placeholder="VD: Thủ Đức, Quận 10..."
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name}</p>
            )}
            {errors.root && (
              <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10">{errors.root}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
              Thêm khu vực
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ─────────────────────────────── */

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [showCreate, setShowCreate] = useState(false);
  const [detailLoc, setDetailLoc] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [error, setError] = useState(null);

  const limit = 10;

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search.trim()) params.set("search", search.trim());
      if (filterActive === "active") params.set("is_active", "true");
      if (filterActive === "inactive") params.set("is_active", "false");


      const res = await api.get(`/api/locations?${params}`);
      setLocations(res.data || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.total_pages || res.totalPages || 1);
    } catch {
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActive]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);
  useEffect(() => { setPage(1); }, [search, filterActive]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const { id, updates } = e.detail;
      setLocations((prev) => {
         const item = prev.find(x => String(x.id) === String(id));
         if (!item) return prev;
         const updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
         
         if (updates.is_active !== undefined) {
            const shouldRemove = (filterActive === 'active' && !updates.is_active) || (filterActive === 'inactive' && updates.is_active);
            if (shouldRemove) {
               setTotal(p => Math.max(0, p - 1));
               return prev.filter(x => String(x.id) !== String(id));
            }
         }
         return prev.map(x => String(x.id) === String(id) ? updatedItem : x);
      });
    };
    const handleDelete = (e) => {
       const { id } = e.detail;
       setLocations((prev) => {
          const next = prev.filter(x => String(x.id) !== String(id));
          if (next.length !== prev.length) setTotal(p => Math.max(0, p - 1));
          return next;
       });
    };
    const handleCreate = () => fetchLocations();

    window.addEventListener("location-updated", handleUpdate);
    window.addEventListener("location-deleted", handleDelete);
    window.addEventListener("location-created", handleCreate);
    return () => {
      window.removeEventListener("location-updated", handleUpdate);
      window.removeEventListener("location-deleted", handleDelete);
      window.removeEventListener("location-created", handleCreate);
    };
  }, [fetchLocations, filterActive]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...locations].sort((a, b) => {
    if (!sortField) return 0;
    const diff = new Date(a[sortField]) - new Date(b[sortField]);
    return sortDir === "asc" ? diff : -diff;
  });

  const activeCount = locations.filter((l) => l.is_active).length;



  /* ─ CRUD ─ */
  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await api.post("/api/locations", data);
      toast.success(`Đã thêm khu vực "${data.name}"`);
      setShowCreate(false);
      window.dispatchEvent(new CustomEvent("location-created"));
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    try {
      await api.put(`/api/locations/${id}`, data);
      toast.success("Cập nhật khu vực thành công");
      setDetailLoc(null);
      window.dispatchEvent(new CustomEvent("location-updated", { detail: { id, updates: data } }));
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await api.delete(`/api/locations/${id}`);
      toast.success("Đã xóa khu vực");
      setDetailLoc(null);
      window.dispatchEvent(new CustomEvent("location-deleted", { detail: { id } }));
    } catch (err) {
      toast.error(err.message || "Không thể xóa khu vực. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const [toggleError, setToggleError] = useState(null);

  const handleToggleConfirm = async () => {
    setSaving(true);
    setToggleError(null);
    const updates = { is_active: !confirmToggle.is_active };
    try {
      await api.patch(`/api/locations/${confirmToggle.id}/status`, updates);
      toast.success(confirmToggle.is_active ? "Đã vô hiệu hóa khu vực" : "Đã kích hoạt khu vực");
      setConfirmToggle(null);
      window.dispatchEvent(new CustomEvent("location-updated", { detail: { id: confirmToggle.id, updates } }));
    } catch (err) {
      setToggleError(err.message || "Không thể cập nhật trạng thái.");
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Khu vực</h1>
          <p className="text-sm text-muted-foreground">Quản lý các khu vực hoạt động của FScape</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> Thêm khu vực
        </Button>
      </div>

      {/* Summary */}
      <LocationSummary total={total} active={activeCount} inactive={total - activeCount} />

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm khu vực..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả" },
            { key: "active", label: "Hoạt động" },
            { key: "inactive", label: INACTIVE_LABEL },
          ].map((fl) => (
            <Button
              key={fl.key}
              size="sm"
              variant={filterActive === fl.key ? "default" : "outline"}
              onClick={() => setFilterActive(fl.key)}
            >
              {fl.label}
            </Button>
          ))}
        </div>

      </div>

      {/* Table */}
      {loading ? (
        <LoadingState className="py-20" />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchLocations}>
            Thử lại
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={MapPin} message="Không tìm thấy khu vực nào" />
      ) : (
        <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4">#</TableHead>
                  <TableHead>Tên khu vực</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("created_at")}
                  >
                    <span className="inline-flex items-center">
                      Ngày tạo
                      <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("updated_at")}
                  >
                    <span className="inline-flex items-center">
                      Cập nhật
                      <SortIcon field="updated_at" sortField={sortField} sortDir={sortDir} />
                    </span>
                  </TableHead>
                  <TableHead className="text-right pr-4">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {sorted.map((loc, idx) => (
                    <TableRow key={loc.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{loc.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`size-2 rounded-full ${loc.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                          <span className={loc.is_active ? "text-success font-medium" : "text-muted-foreground"}>
                            {loc.is_active ? "Hoạt động" : INACTIVE_LABEL}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(loc.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(loc.updated_at)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon" variant="ghost"
                            className={`size-8 ${loc.is_active ? "text-success hover:text-success/80" : "text-muted-foreground"}`}
                            title={loc.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                            onClick={() => setConfirmToggle(loc)}
                          >
                            {loc.is_active
                              ? <ToggleRight className="size-5" />
                              : <ToggleLeft className="size-5" />}
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="size-8"
                            title="Chi tiết"
                            onClick={() => setDetailLoc(loc)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2 mb-2 px-4">
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
        </Card>
      )}

      {/* Detail / Edit / Delete dialog */}
      <LocationDetailDialog
        open={!!detailLoc}
        onOpenChange={(v) => !v && setDetailLoc(null)}
        location={detailLoc}
        onSave={handleUpdate}
        onDelete={handleDelete}
        saving={saving}
      />

      {/* Create dialog */}
      <LocationCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={handleCreate}
        saving={saving}
      />

      {/* Confirm toggle */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.is_active ? "Vô hiệu hóa khu vực" : "Kích hoạt khu vực"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.is_active
              ? <>Bạn có chắc muốn <strong className="text-foreground">vô hiệu hóa</strong> khu vực <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">kích hoạt</strong> khu vực <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
            }
          </p>
          {toggleError && (
            <p className="text-sm text-destructive">{toggleError}</p>
          )}
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setConfirmToggle(null); setToggleError(null); }}>Hủy</Button>
            <Button
              variant={confirmToggle?.is_active ? "destructive" : "default"}
              disabled={saving}
              onClick={handleToggleConfirm}
            >
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              {confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
