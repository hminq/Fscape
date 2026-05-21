import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus, MagnifyingGlass, PencilSimple, Trash, MapPin, Eye,
  ArrowLeft, Stack as Layers, CircleNotch,
  ImageSquare as ImagePlus, X, CaretLeft, CaretRight,
  User as UserIcon,
  ToggleLeft, ToggleRight, FloppyDisk, Users, CheckCircle, Buildings
} from "@phosphor-icons/react";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import CreateAccountDialog from "@/components/CreateAccountDialog";
import BuildingStaffDialog from "@/components/BuildingStaffDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, apiJson, apiRequest } from "@/lib/apiClient";
import { cn, cdnUrl } from "@/lib/utils";
import MapPicker from "@/components/MapPicker";
import defaultBuildingImg from "@/assets/default_building_img.jpg";
import StatusBar from "@/components/StatusBar";

/* ── global cache for buildings ────────────── */
const buildingsCache = new Map();
const statsCache = { data: null, timestamp: 0 };
const CACHE_TTL = 60000; // 1 minute

function getBuildingsCache(key) {
  const item = buildingsCache.get(key);
  if (!item || Date.now() - item.timestamp > CACHE_TTL) return null;
  return item.data;
}

function setBuildingsCache(key, data) {
  buildingsCache.set(key, { data, timestamp: Date.now() });
}

export function clearCache() {
  buildingsCache.clear();
  statsCache.data = null;
  statsCache.timestamp = 0;
}

export function removeBuildingFromCache(id) {
  // Update all list entries in buildingsCache
  for (const [key, value] of buildingsCache.entries()) {
    // value is { data: { data: [], totalPages, total }, timestamp }
    const body = value.data;
    if (body && Array.isArray(body.data)) {
      const updatedList = body.data.filter(b => String(b.id) !== String(id));
      if (updatedList.length !== body.data.length) {
        buildingsCache.set(key, { 
          ...value, 
          data: {
            ...body,
            data: updatedList,
            total: Math.max(0, body.total - 1)
          },
          timestamp: Date.now() 
        });
      }
    }
  }
  // Also clear stats since total count changed
  statsCache.data = null;
}

export function updateBuildingInCache(id, updates) {
  // Update all list entries in buildingsCache
  for (const [key, value] of buildingsCache.entries()) {
    const body = value.data;
    if (body && Array.isArray(body.data)) {
      const idx = body.data.findIndex(b => String(b.id) === String(id));
      if (idx !== -1) {
        const newData = [...body.data];
        const updatedItem = { ...newData[idx], ...updates };
        newData[idx] = updatedItem;
        
        const params = new URLSearchParams(key);
        const activeFilter = params.get("is_active");
        let finalData = newData;
        let finalTotal = body.total;

        // Xử lý logic lọc sau khi cập nhật status
        if (activeFilter === "true" && updatedItem.is_active === false) {
           finalData = newData.filter(b => String(b.id) !== String(id));
           finalTotal = Math.max(0, body.total - 1);
        } else if (activeFilter === "false" && updatedItem.is_active === true) {
           finalData = newData.filter(b => String(b.id) !== String(id));
           finalTotal = Math.max(0, body.total - 1);
        }

        buildingsCache.set(key, { 
          ...value, 
          data: { ...body, data: finalData, total: finalTotal },
          timestamp: Date.now() 
        });
      }
    }
  }
}

/* ── helpers ───────────────────────────────── */

const thumb = (b) => cdnUrl(b.thumbnail_url) || defaultBuildingImg;

const PER_SECTION = 6;

async function uploadFiles(category, files) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await apiRequest(`/api/upload?type=${category}`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload thất bại");
  }
  return res.json();
}

/* ── Location Donut ─────────────────────────── */

const CHART_COLORS = [
  { stroke: "stroke-chart-1", dot: "bg-chart-1" },
  { stroke: "stroke-chart-2", dot: "bg-chart-2" },
  { stroke: "stroke-chart-3", dot: "bg-chart-3" },
  { stroke: "stroke-chart-4", dot: "bg-chart-4" },
  { stroke: "stroke-chart-5", dot: "bg-chart-5" },
];

function LocationDonut({ locationCounts, size = 76 }) {
  const entries = locationCounts.filter((l) => l.count > 0);
  const total = entries.reduce((s, l) => s + l.count, 0);
  const r = 36;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segs = entries.map((e, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const len = total > 0 ? (e.count / total) * circ : 0;
    const seg = { ...e, ...color, len, offset: circ - acc };
    acc += len;
    return seg;
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        {segs.map((s) => (
          <circle key={s.name} cx="50" cy="50" r={r} fill="none" strokeWidth="10"
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

/* ── BuildingSummary ───────────────────────── */

function BuildingSummary({ active, inactive, locationCounts, filterActive }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-8 flex-wrap">
        {/* Left - location donut + legend */}
        <div className="flex items-center gap-5">
          <LocationDonut locationCounts={locationCounts} size={76} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {locationCounts.map((l, i) => (
              <div key={l.name} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${CHART_COLORS[i % CHART_COLORS.length].dot} shrink-0`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{l.name}</span>
                <span className="text-xs font-semibold">{l.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-px h-12 bg-border shrink-0" />

        <StatusBar active={active} inactive={inactive} filter={filterActive} label="tòa nhà" />
      </div>
    </div>
  );
}

/* ── BuildingCard ──────────────────────────── */

function BuildingCard({ building, onView, onToggle, onStaff }) {
  return (
    <Card className="overflow-hidden py-0 gap-0 transition-shadow hover:shadow-lg group">
      <div className="h-48 overflow-hidden bg-muted relative">
        <img
          src={thumb(building)}
          alt={building.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { e.target.src = defaultBuildingImg; }}
        />
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-[15px] truncate">{building.name}</h3>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className={`size-2 rounded-full ${building.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
            <span className={`text-[11px] font-medium ${building.is_active ? "text-success" : "text-muted-foreground"}`}>
              {building.is_active ? "Hoạt động" : "Vô hiệu hóa"}
            </span>
          </span>
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
          <MapPin className="size-3 shrink-0 mt-0.5" /> {building.address}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(building.total_floors ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="size-3" /> {building.total_floors} tầng
            </span>
          )}
          {building.facilities?.length > 0 && (
            <span>{building.facilities.length} tiện ích</span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1.5 h-9" onClick={() => onView(building)}>
            <Eye className="size-3.5" /> Chi tiết
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-9" onClick={() => onStaff(building)}>
            <Users className="size-3.5" /> Nhân sự
          </Button>
          <Button
            size="icon" variant="ghost" className="size-9"
            title={building.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
            onClick={() => onToggle(building)}
          >
            {building.is_active
              ? <ToggleRight className="size-5 text-success" />
              : <ToggleLeft className="size-5 text-muted-foreground" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── BuildingDetail ────────────────────────── */

function BuildingDetail({ buildingId, onBack, locations, onDeleteSuccess, onUpdateSuccess, onOpenStaff }) {
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [facilityIds, setFacilityIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const thumbInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showAddManager, setShowAddManager] = useState(false);
  const [Managers, setManagers] = useState([]);

  // Refs for auto-scrolling to errors
  const nameRef = useRef(null);
  const locationRef = useRef(null);
  const addressRef = useRef(null);
  const totalFloorsRef = useRef(null);

  const scrollTo = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const fetchManagers = useCallback(async () => {
    try {
      const res = await apiJson("/api/users/available-managers");
      setManagers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const fetchBuilding = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson(`/api/buildings/${buildingId}`);
      setBuilding(res.data || res);
    } catch {
      setError("Không thể tải thông tin tòa nhà.");
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    fetchBuilding();
  }, [fetchBuilding]);

  const startEditing = () => {
    if (!building) return;
    setForm({
      name: building.name || "",
      location_id: building.location_id || "",
      address: building.address || "",
      description: building.description || "",
      total_floors: building.total_floors ?? "",
      latitude: building.latitude ?? "",
      longitude: building.longitude ?? "",
      manager_id: building.manager_id || "",
    });
    setThumbFile(null);
    setThumbPreview(cdnUrl(building.thumbnail_url) || null);
    setGalleryImages(
      (building.images || []).map((img) => ({
        url: cdnUrl(img.image_url || img.url || img),
        existing: true,
      }))
    );
    setFacilityIds((building.facilities || []).map((f) => f.id || f));
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const setFormField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Tên tòa nhà là bắt buộc";
    if (!form.location_id) e.location_id = "Vui lòng chọn khu vực";
    if (!form.address?.trim()) e.address = "Địa chỉ là bắt buộc";
    if (!form.total_floors) e.total_floors = "Số tầng là bắt buộc";
    else if (Number(form.total_floors) < 1 || Number(form.total_floors) > 99)
      e.total_floors = "Số tầng phải từ 1 đến 99";
    setErrors(e);
    
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        if (e.name) scrollTo(nameRef);
        else if (e.location_id) scrollTo(locationRef);
        else if (e.address) scrollTo(addressRef);
        else if (e.total_floors) scrollTo(totalFloorsRef);
      }, 50);
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      /* Upload new thumbnail if changed */
      let thumbnail_url = thumbPreview;
      if (thumbFile) {
        const res = await uploadFiles("building_thumbnail", [thumbFile]);
        thumbnail_url = res.urls?.[0] || null;
      }

      /* Upload new gallery images */
      const existingUrls = galleryImages.filter((g) => g.existing).map((g) => g.url);
      const newFiles = galleryImages.filter((g) => g.file).map((g) => g.file);
      let galleryUrls = existingUrls;
      if (newFiles.length > 0) {
        const res = await uploadFiles("building_gallery", newFiles);
        const uploaded = res.urls || [];
        galleryUrls = [...existingUrls, ...uploaded];
      }

      const payload = {
        name: form.name.trim(),
        location_id: form.location_id,
        address: form.address.trim(),
        description: form.description?.trim() || undefined,
        total_floors: form.total_floors ? Number(form.total_floors) : undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        thumbnail_url: thumbnail_url || undefined,
        images: galleryUrls.length > 0 ? galleryUrls : undefined,
        facilities: facilityIds,
        manager_id: form.manager_id || undefined,
      };

      await apiJson(`/api/buildings/${building.id}`, { method: "PUT", body: payload });
      
      const updates = { 
        name: payload.name, 
        address: payload.address, 
        thumbnail_url: payload.thumbnail_url,
        total_floors: payload.total_floors
      };
      updateBuildingInCache(building.id, updates);
      window.dispatchEvent(new CustomEvent("building-updated", { detail: { id: building.id, updates } }));

      setIsEditing(false);
      fetchBuilding();
      toast.success("Cập nhật tòa nhà thành công");
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (err) {
      toast.error(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiJson(`/api/buildings/${buildingId}`, { method: "DELETE" });
      removeBuildingFromCache(buildingId); // Surgically remove from cache
      window.dispatchEvent(new CustomEvent("building-deleted", { detail: { id: buildingId } }));
      toast.success("Xóa tòa nhà thành công");
      onDeleteSuccess();
    } catch (err) {
      toast.error(err.message || "Không thể xóa tòa nhà. Vui lòng thử lại.");
    } finally {
      setSaving(false);
      setConfirmDel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircleNotch className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !building) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm text-destructive">{error || "Không tìm thấy tòa nhà."}</p>
        <Button variant="outline" size="sm" onClick={onBack}>Quay lại</Button>
      </div>
    );
  }

  const gallery = (building.images?.length ? building.images : [null])
    .map((img) => cdnUrl(img?.image_url || img?.url || img) || defaultBuildingImg);

  const infoItems = [
    { label: "Khu vực", value: building.location?.name },
    { label: "Địa chỉ", value: building.address },
    ...(building.total_floors > 0 ? [{ label: "Số tầng", value: `${building.total_floors} tầng` }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 size-8 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                {isEditing ? `Chỉnh sửa: ${building.name}` : building.name}
              </h1>
              {!isEditing && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold bg-muted/50 px-2 py-0.5 rounded-full border border-border">
                  <span className={`size-2 rounded-full ${building.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <span className={building.is_active ? "text-success" : "text-muted-foreground"}>
                    {building.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                  </span>
                </span>
              )}
            </div>
            {!isEditing && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2 h-8 px-3" onClick={() => onOpenStaff?.(building)}>
                  <Users className="size-4" /> Nhân sự
                </Button>
                <Button variant="outline" size="sm" className="gap-2 h-8 px-3" onClick={startEditing}>
                  <PencilSimple className="size-4" /> Chỉnh sửa
                </Button>
                <Button variant="destructive" size="sm" className="gap-2 h-8 px-3" onClick={() => setConfirmDel(true)}>
                  <Trash className="size-4" /> Xóa
                </Button>
              </div>
            )}
          </div>
          {!isEditing && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <MapPin className="size-3.5" /> {building.address}
            </p>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Thông tin cơ bản */}
          <Card className="gap-4 p-4 shadow-none border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thông tin cơ bản</h2>
            
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5" ref={nameRef}>
                <Label className={errors.name ? "text-destructive" : ""}>Tên tòa nhà *</Label>
                <Input value={form.name || ""} 
                  onChange={(e) => setFormField("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5" ref={locationRef}>
                <Label className={errors.location_id ? "text-destructive" : ""}>Khu vực *</Label>
                <Select value={form.location_id ? String(form.location_id) : ""} 
                  onValueChange={(v) => setFormField("location_id", v)}>
                  <SelectTrigger className={errors.location_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Chọn khu vực" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location_id && <p className="text-[11px] text-destructive">{errors.location_id}</p>}
              </div>

              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-muted-foreground">Người quản lý</Label>
                <div className="flex min-h-11 flex-col justify-center gap-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
                   <p className="text-sm font-medium leading-none">
                      {building.manager ? `${building.manager.first_name} ${building.manager.last_name}` : "Chưa có quản lý"}
                   </p>
                   <p className="text-[11px] text-muted-foreground italic">
                      {building.manager?.email || ""}
                   </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5" ref={addressRef}>
              <Label className={errors.address ? "text-destructive" : ""}>Địa chỉ *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={form.address || ""}
                  onChange={(e) => setFormField("address", e.target.value)}
                  className={cn("pl-9", errors.address && "border-destructive")} />
              </div>
              {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
            </div>

            <MapPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => {
                setFormField("latitude", lat);
                setFormField("longitude", lng);
              }}
            />

            <div className="grid grid-cols-1 gap-3 border-t border-border/50 pt-3 md:grid-cols-3">
              <div className="space-y-1.5" ref={totalFloorsRef}>
                <Label className={errors.total_floors ? "text-destructive" : ""}>Số tầng</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input type="number" min="1" max="99" value={form.total_floors || ""}
                    onChange={(e) => setFormField("total_floors", e.target.value)}
                    className={cn("pl-9", errors.total_floors && "border-destructive")} />
                </div>
                {errors.total_floors && <p className="text-[11px] text-destructive">{errors.total_floors}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Vĩ độ</Label>
                <Input value={form.latitude ?? ""} readOnly className="bg-muted/50 border-dashed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Kinh độ</Label>
                <Input value={form.longitude ?? ""} readOnly className="bg-muted/50 border-dashed" />
              </div>
            </div>
          </Card>

          {/* Mô tả */}
          <Card className="gap-2.5 p-4 shadow-none border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mô tả</h2>
            <Textarea rows={3} value={form.description || ""}
              onChange={(e) => setFormField("description", e.target.value)}
              placeholder="Mô tả tòa nhà..."
              className="resize-none focus-visible:ring-1" />
          </Card>

          {/* Hình ảnh */}
          <Card className="gap-4 p-4 shadow-none border-border font-medium">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-foreground">Hình ảnh</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Thumbnail */}
              <div className="space-y-1.5">
                <Label>Ảnh đại diện</Label>
                {thumbPreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted group ring-1 ring-border/50 shadow-sm">
                    <img src={thumbPreview} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                    <button type="button"
                      onClick={() => { setThumbFile(null); setThumbPreview(null); }}
                      className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => thumbInputRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all hover:bg-primary/5 group">
                    <ImagePlus className="size-8 transition-transform group-hover:scale-110" />
                    <span className="text-xs font-semibold">Chọn ảnh đại diện</span>
                  </button>
                )}
                <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
                    e.target.value = "";
                  }} />
              </div>

              {/* Gallery */}
              <div className="space-y-1.5">
                <Label>Thư viện ảnh ({galleryImages.length}/5)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {galleryImages.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted ring-1 ring-border/30">
                      <img src={img.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <button type="button"
                        onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {galleryImages.length < 5 && (
                    <button type="button" onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all hover:bg-primary/5">
                      <Plus className="size-5" />
                      <span className="text-[10px] uppercase font-bold">Thêm ảnh</span>
                    </button>
                  )}
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const max = 5 - galleryImages.length;
                    const newImgs = files.slice(0, max).map(f => ({ file: f, url: URL.createObjectURL(f) }));
                    setGalleryImages(prev => [...prev, ...newImgs]);
                    e.target.value = "";
                  }} />
              </div>
            </div>
          </Card>

          {/* Tiện ích */}
          <Card className="p-4 border-border shadow-none">
            <EditFacilityPicker selectedIds={facilityIds} onChange={setFacilityIds} />
          </Card>

          {/* Footer Actions */}
          <div className="bg-background/95 backdrop-blur-sm border-t border-border p-4 fixed bottom-0 right-0 left-0 md:left-64 flex items-center justify-end gap-3 z-50 px-8 shadow-lg transition-transform animate-in slide-in-from-bottom duration-300">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving} className="h-10 px-6">Hủy</Button>
            <Button onClick={handleSubmit} disabled={saving} className="h-10 px-8 bg-primary shadow-md hover:shadow-lg transition-all active:scale-95">
              {saving ? <CircleNotch className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
              Lưu thay đổi
            </Button>
          </div>

          <CreateAccountDialog
            open={showAddManager}
            onOpenChange={setShowAddManager}
            onSaved={() => {
              fetchManagers();
              setShowAddManager(false);
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main info card - thumbnail only */}
          <Card className="overflow-hidden py-0 gap-0">
            <div className="flex flex-col md:flex-row">
              <div className="relative md:w-64 shrink-0 bg-muted h-48 md:h-auto md:min-h-48 overflow-hidden">
                <img
                  src={thumb(building)}
                  alt={building.name}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  onError={(e) => { e.target.src = defaultBuildingImg; }}
                />
              </div>
              <div className="flex-1 p-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {infoItems.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {building.description && (
                  <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border leading-relaxed">
                    {building.description}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Gallery - equal size grid */}
          {gallery.length > 0 && (
            <section>
              <h2 className="text-base font-bold mb-3">Hình ảnh ({gallery.length})</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {gallery.map((src, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      onError={(e) => { e.target.src = defaultBuildingImg; }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Facilities */}
          {building.facilities?.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4">Tiện ích</h2>
              <div className="flex flex-wrap gap-2">
                {building.facilities.map((f) => (
                  <span
                    key={f.id}
                    className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${f.BuildingFacility?.is_active !== false
                      ? "border-success/30 text-success bg-success/5"
                      : "border-border text-muted-foreground bg-muted/50"
                      }`}
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* Sticky Action Panel (Only shows when editing) */}
      {isEditing && (
        <div className="fixed bottom-0 right-0 left-56 bg-background/95 backdrop-blur-md border-t border-border p-4 flex items-center justify-end gap-3 z-50 px-8">
          <Button variant="outline" onClick={cancelEditing} disabled={saving} className="bg-background">Hủy</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : <FloppyDisk className="size-4 mr-1.5" />}
            Lưu thay đổi
          </Button>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Xóa tòa nhà</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa tòa nhà{" "}
            <strong className="text-foreground">&quot;{building?.name}&quot;</strong>?{" "}
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
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

/* ── EditFacilityPicker ─────────────────────── */

function EditFacilityPicker({ selectedIds, onChange }) {
  const [allFacilities, setAllFacilities] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson("/api/facilities?limit=100");
        setAllFacilities(res.data || res || []);
      } catch { /* silent */ }
    })();
  }, []);

  if (allFacilities.length === 0) return null;

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const selected = allFacilities.filter((f) => selectedIds.includes(f.id));
  const available = allFacilities.filter((f) => !selectedIds.includes(f.id));

  return (
    <div className="space-y-3">
      <Label>Tiện ích</Label>
      {selected.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">Đã chọn</p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((f) => (
              <button key={f.id} type="button" onClick={() => toggle(f.id)}
                className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                {f.name} <X className="size-3 inline ml-1 -mt-px" />
              </button>
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">Chưa chọn</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((f) => (
              <button key={f.id} type="button" onClick={() => toggle(f.id)}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── LocationSection (self-fetching, server-side paging) ── */

function LocationSection({ locId, name, search, filterActive, onView, onToggle, onStaff, refreshKey }) {
  const [buildings, setBuildings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBuildings = useCallback(async (isBumping = false) => {
    const params = new URLSearchParams({ location_id: locId, page, limit: PER_SECTION });
    if (search.trim()) params.set("search", search.trim());
    if (filterActive === "active") params.set("is_active", "true");
    if (filterActive === "inactive") params.set("is_active", "false");
    const key = params.toString();

    const cached = getBuildingsCache(key);
    if (cached && !isBumping) {
      setBuildings(cached.data);
      setTotalPages(cached.totalPages);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiJson(`/api/buildings?${params}`);
      const body = {
        data: res.data || [],
        totalPages: res.totalPages || 1,
        total: res.total || 0
      };
      setBuildings(body.data);
      setTotalPages(body.totalPages);
      setTotal(body.total);
      setBuildingsCache(key, body);
    } catch {
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, [locId, page, search, filterActive]);

  useEffect(() => { 
    fetchBuildings(refreshKey > 0); 
  }, [fetchBuildings, refreshKey]);
  useEffect(() => {
    const handleUpdate = (e) => {
      const { id, updates } = e.detail;
      setBuildings((prev) => {
        const item = prev.find(b => String(b.id) === String(id));
        if (!item) return prev;
        
        const updatedItem = { ...item, ...updates };
        const activeFilter = filterActive === "active" ? "true" : filterActive === "inactive" ? "false" : null;

        if (activeFilter !== null && (
            (activeFilter === "true" && updatedItem.is_active === false) ||
            (activeFilter === "false" && updatedItem.is_active === true)
        )) {
          setTotal(p => Math.max(0, p - 1));
          return prev.filter(b => String(b.id) !== String(id));
        }
        return prev.map(b => String(b.id) === String(id) ? updatedItem : b);
      });
    };
    const handleDelete = (e) => {
      const { id } = e.detail;
      setBuildings((prev) => {
        const next = prev.filter(b => String(b.id) !== String(id));
        if (next.length !== prev.length) setTotal(p => Math.max(0, p - 1));
        return next;
      });
    };
    window.addEventListener("building-updated", handleUpdate);
    window.addEventListener("building-deleted", handleDelete);
    return () => {
      window.removeEventListener("building-updated", handleUpdate);
      window.removeEventListener("building-deleted", handleDelete);
    };
  }, [locId, page, search, filterActive]);

  useEffect(() => { setPage(1); }, [search, filterActive]);

  useEffect(() => { setPage(1); }, [search, filterActive]);

  const showPaging = totalPages > 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/8 flex items-center justify-center">
            <MapPin className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight">{name}</h2>
            <p className="text-sm font-medium text-muted-foreground">
              {loading ? "Đang tải..." : `${total} kết quả`}
            </p>
          </div>
        </div>

        {showPaging && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="size-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <CaretLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <CaretRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState className="py-12" />
      ) : buildings.length === 0 ? (
        <EmptyState icon={Buildings} message="Không tìm thấy tòa nhà nào" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {buildings.map((b) => (
            <BuildingCard
              key={b.id}
              building={b}
              onView={onView}
              onToggle={onToggle}
              onStaff={onStaff}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── BuildingsPage ─────────────────────────── */

export default function BuildingsPage() {
  const navigate = useNavigate();

  /* refresh coordination */
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => { setRefreshKey((k) => k + 1); }, []);

  /* locations list (for filter dropdown + section rendering) */
  const [locations, setLocations] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson("/api/locations?limit=100&is_active=true");
        setLocations(res.data || []);
      } catch { /* silent */ }
    })();
  }, []);

  /* stats from /api/buildings/stats */
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, by_location: [] });
  const fetchStats = useCallback(async (isBumping = false) => {
    if (statsCache.data && !isBumping && Date.now() - statsCache.timestamp < CACHE_TTL) {
      setStats(statsCache.data);
      return;
    }
    try {
      const res = await apiJson("/api/buildings/stats");
      const data = res.data || { total: 0, active: 0, inactive: 0, by_location: [] };
      setStats(data);
      statsCache.data = data;
      statsCache.timestamp = Date.now();
    } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchStats(refreshKey > 0); }, [fetchStats, refreshKey]);

  const locationCounts = useMemo(
    () => stats.by_location.map(({ name, count }) => ({ name, count })),
    [stats.by_location]
  );

  /* filters */
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  /* which locations to render sections for - driven by stats (locations that have buildings) */
  const visibleLocations = useMemo(() => {
    const locs = stats.by_location.map((l) => ({ id: l.location_id, name: l.name }));
    if (filterLocation !== "all") return locs.filter((l) => l.id === filterLocation);
    return locs;
  }, [stats.by_location, filterLocation]);

  /* dialogs */
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [staffDialogBuilding, setStaffDialogBuilding] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggleError, setToggleError] = useState(null);

  const handleToggleConfirm = async () => {
    setSaving(true);
    setToggleError(null);
    try {
      await api.patch(`/api/buildings/${confirmToggle.id}/status`, { is_active: !confirmToggle.is_active });
      const updates = { is_active: !confirmToggle.is_active };
      updateBuildingInCache(confirmToggle.id, updates);
      window.dispatchEvent(new CustomEvent("building-updated", { detail: { id: confirmToggle.id, updates } }));
      
      setConfirmToggle(null);
      fetchStats(); // Update header stats independently 
    } catch (err) {
      setToggleError(err.message || "Không thể cập nhật trạng thái.");
    } finally {
      setSaving(false);
    }
  };

  if (selectedId) {
    return (
      <>
        <BuildingDetail
          buildingId={selectedId}
          onBack={() => setSelectedId(null)}
          locations={locations}
          onDeleteSuccess={() => {
            setSelectedId(null);
            // fetchStats(); // Update statistics
          }}
          onUpdateSuccess={() => {
            refresh();
          }}
          onOpenStaff={(building) => setStaffDialogBuilding(building)}
        />
        <BuildingStaffDialog
          open={!!staffDialogBuilding}
          onOpenChange={(open) => {
            if (!open) setStaffDialogBuilding(null);
          }}
          buildingId={staffDialogBuilding?.id}
          buildingName={staffDialogBuilding?.name}
          onUpdated={refresh}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tòa nhà</h1>
          <p className="text-sm text-muted-foreground">Quản lý tất cả các tòa nhà FScape</p>
        </div>
        <Button className="gap-1.5" onClick={() => navigate("/buildings/create")}>
          <Plus className="size-4" /> Thêm tòa nhà
        </Button>
      </div>

      {/* Summary */}
      <BuildingSummary active={stats.active} inactive={stats.inactive} locationCounts={locationCounts} filterActive={filterActive} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tòa nhà..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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

      {/* Building list - one LocationSection per visible location */}
      <div className="space-y-10">
        {visibleLocations.map((loc) => (
          <LocationSection
            key={loc.id}
            locId={loc.id}
            name={loc.name}
            search={debouncedSearch}
            filterActive={filterActive}
            onView={(b) => setSelectedId(b.id)}
            onToggle={setConfirmToggle}
            onStaff={(b) => setStaffDialogBuilding(b)}
            refreshKey={refreshKey}
          />
        ))}
      </div>

      <BuildingStaffDialog
        open={!!staffDialogBuilding}
        onOpenChange={(open) => {
          if (!open) setStaffDialogBuilding(null);
        }}
        buildingId={staffDialogBuilding?.id}
        buildingName={staffDialogBuilding?.name}
        onUpdated={refresh}
      />

      {/* Confirm Toggle */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.is_active ? "Vô hiệu hóa tòa nhà" : "Kích hoạt tòa nhà"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.is_active
              ? <>Bạn có chắc muốn <strong className="text-foreground">vô hiệu hóa</strong> tòa nhà <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">kích hoạt</strong> tòa nhà <strong className="text-foreground">&quot;{confirmToggle?.name}&quot;</strong>?</>
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
