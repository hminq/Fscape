import { useState, useEffect, useCallback } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, WifiHigh, ToggleLeft, ToggleRight, CaretUp, CaretDown, CaretUpDown, CircleNotch, Eye, CaretLeft, CaretRight, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
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

/* ── Summary ───────────────────────────────── */

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

function FacilitySummary({ total, active, inactive }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5">
        <div className="flex items-center gap-4 flex-1">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <WifiHigh className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Tiện ích</p>
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

/* ── Detail Dialog (view / edit / delete) ── */

function FacilityDetailDialog({ open, onOpenChange, facility, onSave, onDelete, saving }) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && facility) {
      setEditing(false);
      setConfirmDel(false);
    }
  }, [open, facility]);

  const startEdit = () => {
    setForm({
      name: facility.name || "",
      is_active: String(facility.is_active ?? true),
    });
    setErrors({});
    setEditing(true);
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k] || errors.root) setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = true;
    else if (form.name.trim().length > 100) e.name = "Tên tiện ích phải từ 1–100 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      await onSave(facility.id, { name: form.name.trim(), is_active: form.is_active === "true" });
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi khi cập nhật." });
    }
  };

  if (!facility) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa tiện ích</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Tên tiện ích *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-[11px] text-destructive">
                    {errors.name === true ? "Vui lòng nhập tên tiện ích" : errors.name}
                  </p>
                )}
                {errors.root && (
                  <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10">{errors.root}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={form.is_active} onValueChange={(v) => set('is_active', v)}>
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
          <>
            <DialogHeader>
              <DialogTitle>Xóa tiện ích</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center py-2">
              Bạn có chắc muốn xóa tiện ích{" "}
              <strong className="text-foreground">&quot;{facility.name}&quot;</strong>?{" "}
              Hành động này không thể hoàn tác.
            </p>
            <DialogFooter className="justify-center gap-2 sm:justify-center">
              <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
              <Button variant="destructive" disabled={saving} onClick={() => onDelete(facility.id)}>
                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                Xóa
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                {facility.name}
                <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className={`size-2 rounded-full ${facility.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <span className={facility.is_active ? "text-success" : "text-muted-foreground"}>
                    {facility.is_active ? "Hoạt động" : INACTIVE_LABEL}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tạo</p>
                <p className="text-sm font-medium mt-0.5">{fmt(facility.created_at)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cập nhật</p>
                <p className="text-sm font-medium mt-0.5">{fmt(facility.updated_at)}</p>
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

function FacilityCreateDialog({ open, onOpenChange, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("fscape_facility_draft");
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
      localStorage.setItem("fscape_facility_draft", JSON.stringify(form));
    }
  }, [form]);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Vui lòng nhập tên tiện ích";
    else if (form.name.trim().length > 100) e.name = "Tên tiện ích phải từ 1–100 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = () => {
    localStorage.setItem("fscape_facility_draft", JSON.stringify(form));
    toast.success("Đã lưu bản nháp");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      await onSave({ name: form.name.trim(), is_active: true });
      localStorage.removeItem("fscape_facility_draft");
      setForm(EMPTY_FORM);
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi khi tạo tiện ích." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm tiện ích mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className={errors.name ? "text-destructive" : ""}>Tên tiện ích *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }));
                if (errors.name || errors.root) setErrors({});
              }}
              placeholder="VD: Wifi, Phòng gym, Bãi xe..."
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
              Thêm tiện ích
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ─────────────────────────────── */

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState([]);
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
  const [detailItem, setDetailItem] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [error, setError] = useState(null);
  const [toggleError, setToggleError] = useState(null);

  // Summary stats (unfiltered)
  const [statsTotal, setStatsTotal] = useState(0);
  const [statsActive, setStatsActive] = useState(0);

  const limit = 10;

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, activeRes] = await Promise.all([
        api.get("/api/facilities?limit=1"),
        api.get("/api/facilities?limit=1&is_active=true"),
      ]);
      setStatsTotal(allRes.total || 0);
      setStatsActive(activeRes.total || 0);
    } catch { /* silent */ }
  }, []);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search.trim()) params.set("search", search.trim());
      if (filterActive === "active") params.set("is_active", "true");
      if (filterActive === "inactive") params.set("is_active", "false");

      const res = await api.get(`/api/facilities?${params}`);
      setFacilities(res.data || []);
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
  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);
  useEffect(() => { setPage(1); }, [search, filterActive]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const { id, updates } = e.detail;
      setFacilities((prev) => {
        const item = prev.find(x => String(x.id) === String(id));
        if (!item) return prev;
        
        const updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
        
        // If updating status, checking if it still matches the filter
        if (updates.is_active !== undefined) {
           const shouldRemove = (filterActive === 'active' && !updates.is_active) || (filterActive === 'inactive' && updates.is_active);
           if (shouldRemove) {
              setTotal(p => Math.max(0, p - 1));
              return prev.filter(x => String(x.id) !== String(id));
           }
        }
        
        return prev.map(x => String(x.id) === String(id) ? updatedItem : x);
      });
      fetchStats();
    };

    const handleDelete = (e) => {
      const { id } = e.detail;
      setFacilities((prev) => {
        const next = prev.filter(x => String(x.id) !== String(id));
        if (next.length !== prev.length) setTotal(p => Math.max(0, p - 1));
        return next;
      });
      fetchStats();
    };

    const handleCreate = () => {
      fetchFacilities();
      fetchStats();
    };

    window.addEventListener("facility-updated", handleUpdate);
    window.addEventListener("facility-deleted", handleDelete);
    window.addEventListener("facility-created", handleCreate);

    return () => {
      window.removeEventListener("facility-updated", handleUpdate);
      window.removeEventListener("facility-deleted", handleDelete);
      window.removeEventListener("facility-created", handleCreate);
    };
  }, [fetchFacilities, fetchStats, filterActive]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...facilities].sort((a, b) => {
    if (!sortField) return 0;
    const diff = new Date(a[sortField]) - new Date(b[sortField]);
    return sortDir === "asc" ? diff : -diff;
  });

  const refresh = () => { fetchFacilities(); fetchStats(); };

  /* ─ CRUD ─ */
  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await api.post("/api/facilities", data);
      toast.success(`Đã thêm tiện ích "${data.name}"`);
      setShowCreate(false);
      window.dispatchEvent(new CustomEvent("facility-created"));
    } catch (err) {
      throw err; // Let the form catch it for inline display
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    try {
      await api.put(`/api/facilities/${id}`, data);
      toast.success("Cập nhật tiện ích thành công");
      setDetailItem(null);
      window.dispatchEvent(new CustomEvent("facility-updated", { detail: { id, updates: data } }));
    } catch (err) {
      throw err; // Let the form catch it for inline display
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await api.delete(`/api/facilities/${id}`);
      toast.success("Đã xóa tiện ích");
      setDetailItem(null);
      window.dispatchEvent(new CustomEvent("facility-deleted", { detail: { id } }));
    } catch (err) {
      toast.error(err.message || "Không thể xóa tiện ích. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConfirm = async () => {
    setSaving(true);
    setToggleError(null);
    const updates = { name: confirmToggle.name, is_active: !confirmToggle.is_active };
    try {
      await api.put(`/api/facilities/${confirmToggle.id}`, updates);
      toast.success(confirmToggle.is_active ? "Đã vô hiệu hóa tiện ích" : "Đã kích hoạt tiện ích");
      setConfirmToggle(null);
      window.dispatchEvent(new CustomEvent("facility-updated", { detail: { id: confirmToggle.id, updates } }));
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
          <h1 className="text-2xl font-bold tracking-tight">Tiện ích</h1>
          <p className="text-sm text-muted-foreground">Quản lý các tiện ích tòa nhà của FScape</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> Thêm tiện ích
        </Button>
      </div>

      {/* Summary */}
      <FacilitySummary total={statsTotal} active={statsActive} inactive={statsTotal - statsActive} />

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tiện ích..."
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

      {/* Pagination + count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{total} kết quả</p>
        {totalPages > 1 && (
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
        )}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState className="py-20" />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchFacilities}>
            Thử lại
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={WifiHigh} message="Không tìm thấy tiện ích nào" />
      ) : (
      <Card className="overflow-hidden py-0 gap-0">
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 pl-4">#</TableHead>
                  <TableHead>Tên tiện ích</TableHead>
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
                  {sorted.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`size-2 rounded-full ${item.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                          <span className={item.is_active ? "text-success font-medium" : "text-muted-foreground"}>
                            {item.is_active ? "Hoạt động" : INACTIVE_LABEL}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(item.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(item.updated_at)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon" variant="ghost"
                            className={`size-8 ${item.is_active ? "text-success hover:text-success/80" : "text-muted-foreground"}`}
                            title={item.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                            onClick={() => setConfirmToggle(item)}
                          >
                            {item.is_active
                              ? <ToggleRight className="size-5" />
                              : <ToggleLeft className="size-5" />}
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="size-8"
                            title="Chi tiết"
                            onClick={() => setDetailItem(item)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </>
      </Card>
      )}

      {/* Detail / Edit / Delete dialog */}
      <FacilityDetailDialog
        open={!!detailItem}
        onOpenChange={(v) => !v && setDetailItem(null)}
        facility={detailItem}
        onSave={handleUpdate}
        onDelete={handleDelete}
        saving={saving}
      />

      {/* Create dialog */}
      <FacilityCreateDialog
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
              {confirmToggle?.is_active ? "Vô hiệu hóa tiện ích" : "Kích hoạt tiện ích"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.is_active
              ? <>Bạn có chắc muốn <strong className="text-foreground">vô hiệu hóa</strong> tiện ích <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">kích hoạt</strong> tiện ích <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
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
