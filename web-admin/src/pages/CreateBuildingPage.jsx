import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, X, Plus, CircleNotch,
  MapPin, Stack as Layers, Image as ImageIcon,
  ArrowLeft, Buildings, CheckCircle, Users,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiJson, apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MapPicker from "@/components/MapPicker";
import BuildingStaffAssignmentPanel from "@/components/BuildingStaffAssignmentPanel";
import { clearCache } from "./BuildingsPage";

/* ── upload helper ─────────────────────────── */

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

/* ── ThumbnailUploader ─────────────────────── */

function ThumbnailUploader({ preview, onSelect, onRemove }) {
  const inputRef = useRef(null);

  return (
    <div className="space-y-1.5">
      <Label>Ảnh đại diện</Label>
      {preview ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border bg-muted group">
          <img src={preview} alt="Thumbnail" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <ImageIcon className="size-8" />
          <span className="text-xs font-medium">Chọn ảnh đại diện</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.type.startsWith("image/")) onSelect(f);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-muted-foreground">JPG, PNG. Tối đa 5MB.</p>
    </div>
  );
}

/* ── GalleryUploader ───────────────────────── */

function GalleryUploader({ images, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const max = 5;

  const addFiles = (files) => {
    const remaining = max - images.length;
    if (remaining <= 0) return;
    const newImgs = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining)
      .map((f) => ({ file: f, url: URL.createObjectURL(f), name: f.name }));
    onChange([...images, ...newImgs]);
  };

  const removeImg = (idx) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-1.5">
      <Label>Thư viện ảnh ({images.length}/{max})</Label>

      {images.length < max && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex items-center justify-center gap-3 h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <Upload className="size-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs font-medium">Kéo thả hoặc <span className="text-primary">chọn ảnh</span></p>
            <p className="text-[11px] text-muted-foreground">Tối đa {max} ảnh</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-5 gap-2 pt-1">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImg(idx)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── FacilityPicker ────────────────────────── */

function FacilityPicker({ selected, onChange }) {
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiJson("/api/facilities?limit=100");
        setFacilities(res.data || res || []);
      } catch {
        /* silent */
      }
    })();
  }, []);

  if (facilities.length === 0) return null;

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-1.5">
      <Label>Tiện ích</Label>
      <div className="flex flex-wrap gap-2">
        {facilities.map((f) => {
          const active = selected.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── CreateBuildingPage ────────────────────── */

export default function CreateBuildingPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [step, setStep] = useState(1);
  const [createdBuilding, setCreatedBuilding] = useState(null);

  const [form, setForm] = useState(() => {
    const defaultState = {
      name: "",
      location_id: "",
      address: "",
      latitude: "",
      longitude: "",
      total_floors: "",
      description: "",
      facilities: [],
    };
    const saved = localStorage.getItem("building_draft");
    if (saved) {
      try {
        return { ...defaultState, ...JSON.parse(saved) };
      } catch {
        /* fallback */
      }
    }
    return defaultState;
  });

  /* thumbnail state */
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);

  /* gallery state */
  const [galleryImages, setGalleryImages] = useState([]);

  const [errors, setErrors] = useState({});

  // Refs for auto-scrolling to errors
  const nameRef = useRef(null);
  const locationRef = useRef(null);
  const addressRef = useRef(null);
  const coordinatesRef = useRef(null);
  const totalFloorsRef = useRef(null);
  const descriptionRef = useRef(null);
  const facilitiesRef = useRef(null);
  const scrollTo = (ref) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    (async () => {
      const [locResult] = await Promise.allSettled([
        apiJson("/api/locations?limit=100&is_active=true"),
      ]);
      if (locResult.status === "fulfilled") setLocations(locResult.value.data || []);
    })();
  }, []);

  useEffect(() => {
    if (Object.keys(form).length > 0) {
      localStorage.setItem("building_draft", JSON.stringify(form));
    }
  }, [form]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const setCoordinates = (lat, lng) => {
    setForm((p) => ({ ...p, latitude: lat, longitude: lng }));
    setErrors((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Tên không được để trống";
    else if (form.name.trim().length > 255) e.name = "Tên phải từ 1–255 ký tự";
    if (!form.location_id) e.location_id = "Vui lòng chọn khu vực";
    if (!form.address.trim()) e.address = "Địa chỉ không được để trống";
    else if (form.address.trim().length > 500) e.address = "Địa chỉ tối đa 500 ký tự";

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (form.latitude === "" || form.latitude == null) e.latitude = "Vĩ độ không được để trống";
    else if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) e.latitude = "Vĩ độ phải từ -90 đến 90";
    if (form.longitude === "" || form.longitude == null) e.longitude = "Kinh độ không được để trống";
    else if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) e.longitude = "Kinh độ phải từ -180 đến 180";

    if (!form.total_floors) e.total_floors = "Số tầng không được để trống";
    else if (!Number.isInteger(Number(form.total_floors)) || Number(form.total_floors) < 1 || Number(form.total_floors) > 99)
      e.total_floors = "Số tầng phải từ 1 đến 99";
    if (form.description.trim().length > 2000) e.description = "Mô tả tối đa 2000 ký tự";
    if (form.facilities.length > 20) e.facilities = "Tối đa 20 tiện ích";
    setErrors(e);
    
    // Auto-scroll to first error - use timeout to ensure render
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        if (e.name) scrollTo(nameRef);
        else if (e.location_id) scrollTo(locationRef);
        else if (e.address) scrollTo(addressRef);
        else if (e.latitude || e.longitude) scrollTo(coordinatesRef);
        else if (e.total_floors) scrollTo(totalFloorsRef);
        else if (e.description) scrollTo(descriptionRef);
        else if (e.facilities) scrollTo(facilitiesRef);
      }, 50);
    }

    return Object.keys(e).length === 0;
  };

  const handleSelectThumb = (file) => {
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const handleRemoveThumb = () => {
    setThumbFile(null);
    setThumbPreview(null);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      /* 1. Upload thumbnail */
      let thumbnail_url = undefined;
      if (thumbFile) {
        const res = await uploadFiles("building_thumbnail", [thumbFile]);
        thumbnail_url = res.urls?.[0] || undefined;
      }

      /* 2. Upload gallery */
      let images = [];
      const galleryFiles = galleryImages.filter((g) => g.file).map((g) => g.file);
      if (galleryFiles.length > 0) {
        const res = await uploadFiles("building_gallery", galleryFiles);
        images = res.urls || [];
      }

      /* 3. Create building */
      const payload = {
        name: form.name.trim(),
        location_id: form.location_id,
        address: form.address.trim(),
        description: form.description.trim() || undefined,
        total_floors: form.total_floors ? Number(form.total_floors) : undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        is_active: true,
        thumbnail_url: thumbnail_url || undefined,
        images: images.length > 0 ? images : undefined,
        facilities: form.facilities.length > 0 ? form.facilities : undefined,
      };

      const res = await apiJson("/api/buildings", { method: "POST", body: payload });
      const building = res.data || res;
      localStorage.removeItem("building_draft");
      clearCache();
      setCreatedBuilding(building);
      setStep(2);
      toast.success(building?.name ? `Đã tạo tòa nhà "${building.name}"` : "Đã tạo tòa nhà thành công");
    } catch (err) {
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        const backendErrors = {};
        err.data.errors.forEach((item) => {
          if (item.path) backendErrors[item.path] = item.msg;
        });
        setErrors((prev) => ({ ...prev, ...backendErrors }));
        setTimeout(() => {
          if (backendErrors.name) scrollTo(nameRef);
          else if (backendErrors.location_id) scrollTo(locationRef);
          else if (backendErrors.address) scrollTo(addressRef);
          else if (backendErrors.latitude || backendErrors.longitude) scrollTo(coordinatesRef);
          else if (backendErrors.total_floors) scrollTo(totalFloorsRef);
          else if (backendErrors.description) scrollTo(descriptionRef);
          else if (backendErrors.facilities) scrollTo(facilitiesRef);
        }, 50);
      } else if (err.status === 409) {
        setErrors((prev) => ({ ...prev, name: err.message || "Tên tòa nhà đã tồn tại" }));
        setTimeout(() => scrollTo(nameRef), 50);
      } else {
        toast.error(err.message || "Đã xảy ra lỗi khi tạo tòa nhà.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 pt-2">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/buildings")}
            className="size-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quay lại danh sách</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Thêm tòa nhà mới</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Điền thông tin để khởi tạo tòa nhà FScape mới.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            {
              index: 1,
              title: "Tạo tòa nhà",
              description: "Nhập thông tin cơ bản và vị trí.",
              icon: Buildings,
            },
            {
              index: 2,
              title: "Thiết lập nhân sự",
              description: "Gán quản lý và nhân viên cho tòa nhà.",
              icon: Users,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = step === item.index;
            const isDone = step > item.index;

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

      {step === 1 ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thông tin cơ bản</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5" ref={nameRef}>
                <Label className={errors.name ? "text-destructive" : ""}>Tên tòa nhà *</Label>
                <Input
                  placeholder="VD: FScape Cầu Giấy"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5" ref={locationRef}>
                <Label className={errors.location_id ? "text-destructive" : ""}>Khu vực *</Label>
                <Select value={form.location_id ? String(form.location_id) : ""} onValueChange={(v) => set("location_id", v)}>
                  <SelectTrigger className={errors.location_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Chọn khu vực" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location_id && <p className="text-[11px] text-destructive">{errors.location_id}</p>}
              </div>
            </div>

            <div className="space-y-1.5" ref={addressRef}>
              <Label className={errors.address ? "text-destructive" : ""}>Địa chỉ *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="VD: 144 Xuân Thủy, Cầu Giấy, Hà Nội"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={cn("pl-9", errors.address && "border-destructive")}
                />
              </div>
              {errors.address && <p className="text-[11px] text-destructive">{errors.address}</p>}
            </div>

            <div className="space-y-1.5" ref={coordinatesRef}>
              <MapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={setCoordinates}
              />
              {(errors.latitude || errors.longitude) && (
                <p className="text-[11px] text-destructive">
                  {errors.latitude || errors.longitude}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5" ref={totalFloorsRef}>
                <Label className={errors.total_floors ? "text-destructive" : ""}>Số tầng *</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="VD: 8"
                    value={form.total_floors}
                    onChange={(e) => set("total_floors", e.target.value)}
                    className={cn("pl-9", errors.total_floors && "border-destructive")}
                  />
                </div>
                {errors.total_floors && <p className="text-[11px] text-destructive">{errors.total_floors}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Vĩ độ</Label>
                <Input value={form.latitude ?? ""} readOnly placeholder="—" className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label>Kinh độ</Label>
                <Input value={form.longitude ?? ""} readOnly placeholder="—" className="bg-muted/50" />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-5" ref={descriptionRef}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Mô tả</h2>
            <Textarea
              placeholder="Giới thiệu về tòa nhà, tiện ích nổi bật, quy định chung..."
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={cn("resize-none", errors.description && "border-destructive")}
            />
            {errors.description && <p className="text-[11px] text-destructive">{errors.description}</p>}
          </section>

          <section className="space-y-5 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hình ảnh</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ThumbnailUploader
                file={thumbFile}
                preview={thumbPreview}
                onSelect={handleSelectThumb}
                onRemove={handleRemoveThumb}
              />
              <GalleryUploader
                images={galleryImages}
                onChange={setGalleryImages}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5" ref={facilitiesRef}>
            <FacilityPicker
              selected={form.facilities}
              onChange={(v) => set("facilities", v)}
            />
            {errors.facilities && <p className="mt-2 text-[11px] text-destructive">{errors.facilities}</p>}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tóm tắt tòa nhà
                </h2>
                <p className="mt-2 text-lg font-semibold text-foreground">{createdBuilding?.name}</p>
              </div>
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Bước 2/2: Thiết lập nhân sự
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Khu vực</p>
                <p className="mt-1 text-sm font-medium">
                  {locations.find((loc) => loc.id === createdBuilding?.location_id)?.name || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Địa chỉ</p>
                <p className="mt-1 text-sm font-medium">{createdBuilding?.address || "—"}</p>
              </div>
            </div>
          </section>

          <BuildingStaffAssignmentPanel
            buildingId={createdBuilding?.id}
            onUpdated={clearCache}
          />
        </div>
      )}

      <div className="fixed bottom-0 left-56 right-0 z-50 flex items-center justify-end gap-3 border-t border-border bg-background/95 p-4 px-8 backdrop-blur-md">
        {step === 1 ? (
          <>
            <Button variant="outline" onClick={() => navigate("/buildings")} disabled={saving} className="bg-background">
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <CircleNotch className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
              Tạo tòa nhà và tiếp tục
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => navigate("/buildings")} className="bg-background">
              Để sau
            </Button>
            <Button onClick={() => navigate("/buildings")}>
              Hoàn tất
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
