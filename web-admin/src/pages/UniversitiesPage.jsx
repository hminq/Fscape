import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, MagnifyingGlass, PencilSimple, Trash, MapPin, GraduationCap,
  ToggleLeft, ToggleRight, CircleNotch, Eye, Buildings, FloppyDisk,
  CaretLeft, CaretRight, CheckCircle
} from "@phosphor-icons/react";
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
import { api, apiJson } from "@/lib/apiClient";
import MapPicker from "@/components/MapPicker";
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";


/* ── helpers ───────────────────────────────── */

const STATUS = {
  true: { label: "Hoạt động" },
  false: { label: "Vô hiệu hóa" },
};

const EMPTY_FORM = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  location_id: "",
};

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

/* ── Summary ────────────────────────────────── */

function UniSummary({ total, active, inactive }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5">
        <div className="flex items-center gap-4 flex-1">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <GraduationCap className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Trường đại học</p>
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

/* ── Detail Dialog ──────────────────────────── */

function UniDetailDialog({ open, onOpenChange, uniId, onEdit, onDelete }) {
  const [uni, setUni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uniId || !open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiJson(`/api/universities/${uniId}`);
        if (!cancelled) setUni(res.data || res);
      } catch {
        if (!cancelled) setError("Không thể tải thông tin.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uniId, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !uni ? (
          <div className="text-center py-10">
            <p className="text-sm text-destructive">{error || "Không tìm thấy."}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                {uni.name}
                <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className={`size-2 rounded-full ${uni.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <span className={uni.is_active ? "text-success" : "text-muted-foreground"}>
                    {uni.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Khu vực</p>
                  <p className="text-sm font-medium mt-0.5">{uni.location?.name || "—"}</p>
                </div>
                {uni.address && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Địa chỉ</p>
                    <p className="text-sm font-medium mt-0.5 flex items-start gap-1.5">
                      <MapPin className="size-3.5 mt-0.5 shrink-0 text-primary" />
                      {uni.address}
                    </p>
                  </div>
                )}
              </div>

              {/* Map */}
              {uni.latitude && uni.longitude && (
                <div className="h-[180px] rounded-lg overflow-hidden border border-border">
                  <Map center={[Number(uni.longitude), Number(uni.latitude)]} zoom={14}>
                    <MapMarker latitude={Number(uni.latitude)} longitude={Number(uni.longitude)}>
                      <MarkerContent>
                        <div className="flex items-center justify-center -translate-y-1/2">
                          <span className="absolute size-6 animate-ping rounded-full bg-primary/30" />
                          <span className="relative flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg">
                            <MapPin className="size-3 text-white" weight="fill" />
                          </span>
                        </div>
                      </MarkerContent>
                    </MapMarker>
                  </Map>
                </div>
              )}

              {/* Nearby buildings - compact, max 3 */}
              {(() => {
                const buildings = uni.nearby_buildings || [];
                const shown = buildings.slice(0, 3);
                const extra = buildings.length - 3;
                return (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Buildings className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">Tòa nhà lân cận</span>
                      <span className="text-xs text-muted-foreground">({buildings.length})</span>
                    </div>
                    {buildings.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Chưa có tòa nhà nào.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {shown.map((b) => (
                          <div key={b.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate">{b.name}</span>
                            <span className={`size-2 rounded-full shrink-0 ${b.is_active !== false ? "bg-success" : "bg-muted-foreground/30"}`} />
                          </div>
                        ))}
                        {extra > 0 && (
                          <p className="text-xs text-muted-foreground pt-0.5">+{extra} tòa nhà khác</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="destructive" size="sm"
                className="gap-1.5"
                onClick={() => onDelete(uni)}
              >
                <Trash className="size-3.5" /> Xóa
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => onEdit(uni)}>
                <PencilSimple className="size-3.5" /> Chỉnh sửa
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Create / Edit Dialog ───────────────────── */

function UniFormDialog({ open, onOpenChange, mode, initialData, locations, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      const saved = localStorage.getItem("fscape_uni_draft");
      if (saved) {
        try {
          setForm(JSON.parse(saved));
        } catch {
          setForm(EMPTY_FORM);
        }
      } else {
        setForm(EMPTY_FORM);
      }
    } else {
      setForm(initialData || EMPTY_FORM);
    }
    setErrors({});
  }, [open, mode, initialData]);

  // Auto-save draft only in create mode
  useEffect(() => {
    if (open && mode === "create" && form !== EMPTY_FORM) {
      localStorage.setItem("fscape_uni_draft", JSON.stringify(form));
    }
  }, [form, open, mode]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k] || errors.root) setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Tên trường là bắt buộc";
    if (!form.location_id) e.location_id = "Vui lòng chọn khu vực";
    if (form.address?.trim()) {
       if (!/(?=.*\d)(?=.*[\p{L}])(?:.*,){2,}/u.test(form.address)) {
          e.address = "Địa chỉ cần đầy đủ (Số nhà, Đường/Phường, Quận/Huyện, Tỉnh/TP)";
       } else if (!form.latitude || !form.longitude) {
          e.address = "Vui lòng tìm kiếm địa chỉ hợp lệ trên bản đồ";
       }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    try {
      const body = {
        name: form.name.trim(),
        address: form.address?.trim() || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        location_id: form.location_id,
      };

      if (mode === "create") {
        await apiJson("/api/universities", { method: "POST", body });
        localStorage.removeItem("fscape_uni_draft");
        toast.success(`Đã thêm trường "${body.name}"`);
        window.dispatchEvent(new CustomEvent("uni-created"));
      } else {
        await apiJson(`/api/universities/${initialData.id}`, { method: "PUT", body });
        toast.success("Cập nhật trường thành công");
        window.dispatchEvent(new CustomEvent("uni-updated", { detail: { id: initialData.id, updates: body } }));
      }
      onSaved();
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Thêm trường đại học" : "Chỉnh sửa trường"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={errors.name ? "text-destructive" : ""}>Tên trường *</Label>
              <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)}
                placeholder="VD: Đại học Bách Khoa"
                className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-[10px] text-destructive font-medium">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={errors.location_id ? "text-destructive" : ""}>Khu vực *</Label>
              <Select value={form.location_id || ""} onValueChange={(v) => set("location_id", v)}>
                <SelectTrigger className={errors.location_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Chọn khu vực" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_id && <p className="text-[10px] text-destructive font-medium">{errors.location_id}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={errors.address ? "text-destructive" : ""}>Địa chỉ</Label>
            <Input 
              value={form.address || ""} 
              onChange={(e) => {
                set("address", e.target.value);
                setForm(p => ({ ...p, latitude: "", longitude: "" }));
              }}
              placeholder="VD: 268 Lý Thường Kiệt, Q.10, TP.HCM" 
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && <p className="text-[10px] text-destructive font-medium leading-tight">{errors.address}</p>}
          </div>

          <MapPicker
            latitude={form.latitude}
            longitude={form.longitude}
            address={form.address}
            onChange={(lat, lng) => {
              set("latitude", lat);
              setForm((p) => ({ ...p, longitude: lng }));
            }}
            onError={(msg) => setErrors(p => ({ ...p, address: msg }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vĩ độ</Label>
              <Input value={form.latitude ?? ""} readOnly placeholder="—" className="bg-muted/30 cursor-default" />
            </div>
            <div className="space-y-1.5">
              <Label>Kinh độ</Label>
              <Input value={form.longitude ?? ""} readOnly placeholder="—" className="bg-muted/30 cursor-default" />
            </div>
          </div>

          {errors.root && (
            <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2.5 rounded-lg border border-destructive/10 text-center">
              {errors.root}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : (mode === 'create' ? <Plus className="size-4 mr-1.5" /> : <FloppyDisk className="size-4 mr-1.5" />)}
              {mode === "create" ? "Thêm trường" : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Location Section ───────────────────────── */

const PER_SECTION = 8;

function LocationSection({ name, universities, onView, onToggle }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(universities.length / PER_SECTION);
  const visible = universities.slice(page * PER_SECTION, (page + 1) * PER_SECTION);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <MapPin className="size-3.5 text-primary" />
          </div>
          <h2 className="text-[15px] font-semibold">{name}</h2>
          <span className="text-sm font-medium text-muted-foreground">{universities.length} kết quả</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{page + 1}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="size-8" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                <CaretLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>
                <CaretRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {universities.length === 0 ? (
        <EmptyState icon={GraduationCap} message="Không tìm thấy trường nào" />
      ) : (
        <Card className="overflow-hidden py-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Tên trường</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right pr-4 w-24">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((uni, idx) => {
              const st = STATUS[uni.is_active] || STATUS["true"];
              return (
                <TableRow key={uni.id}>
                  <TableCell className="pl-4 text-muted-foreground text-xs">
                    {page * PER_SECTION + idx + 1}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{uni.name}</span>
                    {uni.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" /> {uni.address}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`size-2 rounded-full ${uni.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                      <span className={uni.is_active ? "text-success font-medium" : "text-muted-foreground"}>
                        {st.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8"
                        title={uni.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                        onClick={() => onToggle(uni)}>
                        {uni.is_active
                          ? <ToggleRight className="size-5 text-success" />
                          : <ToggleLeft className="size-5 text-muted-foreground" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => onView(uni)}>
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      )}
    </section>
  );
}

/* ── Main Page ─────────────────────────────── */

export default function UniversitiesPage() {
  const [allUnis, setAllUnis] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  const [formDialog, setFormDialog] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson("/api/locations?limit=100&is_active=true");
        setLocations(res.data || []);
      } catch { /* silent */ }
    })();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson("/api/universities?limit=200");
      setAllUnis(res.data || []);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handleUpdate = (e) => {
      const { id, updates } = e.detail;
      setAllUnis((prev) => prev.map(u => {
        if (String(u.id) !== String(id)) return u;
        const loc = locations.find(l => String(l.id) === String(updates.location_id));
        return { ...u, ...updates, location: loc || u.location };
      }));
    };
    const handleDelete = (e) => {
      const { id } = e.detail;
      setAllUnis((prev) => prev.filter(u => String(u.id) !== String(id)));
    };
    const handleCreate = () => fetchAll();

    window.addEventListener("uni-updated", handleUpdate);
    window.addEventListener("uni-deleted", handleDelete);
    window.addEventListener("uni-created", handleCreate);

    return () => {
      window.removeEventListener("uni-updated", handleUpdate);
      window.removeEventListener("uni-deleted", handleDelete);
      window.removeEventListener("uni-created", handleCreate);
    };
  }, [fetchAll, locations]);

  const filtered = useMemo(() => allUnis.filter((u) => {
    if (filterActive === "active" && !u.is_active) return false;
    if (filterActive === "inactive" && u.is_active) return false;
    if (filterLocation !== "all" && u.location_id !== filterLocation) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!u.name?.toLowerCase().includes(q) && !u.address?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [allUnis, filterActive, filterLocation, search]);

  const locationGroups = useMemo(() => {
    const grouped = filtered.reduce((acc, u) => {
      const locName = u.location?.name || "Chưa phân khu vực";
      const locId = u.location_id || "_none";
      if (!acc[locId]) acc[locId] = { name: locName, unis: [] };
      acc[locId].unis.push(u);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([, a], [, b]) => a.name.localeCompare(b.name, "vi"));
  }, [filtered]);

  const totalCount = allUnis.length;
  const activeCount = allUnis.filter((u) => u.is_active).length;

  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiJson(`/api/universities/${confirmDel.id}`, { method: "DELETE" });
      toast.success(`Đã xóa trường "${confirmDel.name}"`);
      setConfirmDel(null);
      window.dispatchEvent(new CustomEvent("uni-deleted", { detail: { id: confirmDel.id } }));
    } catch (err) {
      toast.error(err.message || "Không thể xóa.");
    } finally {
      setSaving(false);
    }
  };

  const [toggleError, setToggleError] = useState(null);

  const handleToggle = async () => {
    setSaving(true);
    setToggleError(null);
    const updates = { is_active: !confirmToggle.is_active };
    try {
      await api.patch(`/api/universities/${confirmToggle.id}/status`, updates);
      toast.success(confirmToggle.is_active ? "Đã vô hiệu hóa trường" : "Đã kích hoạt trường");
      setConfirmToggle(null);
      window.dispatchEvent(new CustomEvent("uni-updated", { detail: { id: confirmToggle.id, updates } }));
    } catch (err) {
      setToggleError(err.message || "Không thể cập nhật.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đại học</h1>
          <p className="text-sm text-muted-foreground">Quản lý các trường đại học đối tác của FScape</p>
        </div>
        <Button className="gap-1.5" onClick={() => setFormDialog({ mode: "create" })}>
          <Plus className="size-4" /> Thêm trường
        </Button>
      </div>

      {/* Summary */}
      <UniSummary total={totalCount} active={activeCount} inactive={totalCount - activeCount} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm trường..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Khu vực" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khu vực</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả" },
            { key: "active", label: "Hoạt động" },
            { key: "inactive", label: "Không hoạt động" },
          ].map((f) => (
            <Button key={f.key} size="sm"
              variant={filterActive === f.key ? "default" : "outline"}
              onClick={() => setFilterActive(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List grouped by location */}
      <div>
        {loading ? (
          <LoadingState className="py-20" />
        ) : error ? (
          <div className="py-14 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAll}>Thử lại</Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={GraduationCap} message="Không tìm thấy trường nào" />
        ) : (
          <div className="space-y-8">
            {locationGroups.map(([locId, group]) => (
              <LocationSection
                key={locId}
                name={group.name}
                universities={group.unis}
                onView={(u) => setDetailId(u.id)}
                onToggle={setConfirmToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <UniDetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        uniId={detailId}
        onEdit={(u) => { setDetailId(null); setFormDialog({ mode: "edit", data: u }); }}
        onDelete={(u) => { setDetailId(null); setConfirmDel(u); }}
      />

      {/* Create / Edit dialog */}
      {formDialog && (
        <UniFormDialog
          open={!!formDialog}
          onOpenChange={(v) => !v && setFormDialog(null)}
          mode={formDialog.mode}
          initialData={formDialog.data}
          locations={locations}
          onSaved={() => { setFormDialog(null); fetchAll(); }}
        />
      )}

      {/* Confirm toggle */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.is_active ? "Vô hiệu hóa trường" : "Kích hoạt trường"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.is_active
              ? <>Bạn có chắc muốn <strong className="text-foreground">vô hiệu hóa</strong> trường <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">kích hoạt</strong> trường <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>}
          </p>
          {toggleError && (
            <p className="text-sm text-destructive">{toggleError}</p>
          )}
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setConfirmToggle(null); setToggleError(null); }}>Hủy</Button>
            <Button
              variant={confirmToggle?.is_active ? "destructive" : "default"}
              disabled={saving} onClick={handleToggle}>
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              {confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Xóa trường đại học</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa trường <strong className="text-foreground">&quot;{confirmDel?.name}&quot;</strong>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Hủy</Button>
            <Button variant="destructive" disabled={saving} onClick={handleDelete}>
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
