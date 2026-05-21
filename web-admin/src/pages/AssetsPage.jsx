import { useState, useEffect, useCallback } from "react";
import {
  Plus, MagnifyingGlass, Package, Trash, CircleNotch, PencilSimple, QrCode,
  Buildings, DownloadSimple, Printer, FloppyDisk,
  Door, Eye, CheckCircle, Stack as Layers, Warehouse, CaretDown, CaretLeft, CaretRight
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
import { Textarea } from "@/components/ui/textarea";
import { apiJson, api } from "@/lib/apiClient";
import { formatDate as fmt } from "@/lib/utils";
import { ASSET_STATUS_MAP } from "@/lib/constants";

const STATUS_MAP = ASSET_STATUS_MAP;

const getFloorLabel = (floorKey) => (floorKey === "storage" ? "Kho" : `Tầng ${floorKey}`);

/* ── Status Bar (straight bar, filter-reactive) ── */

function AssetStatusBar({ byStatus, total = 0, filter = "all" }) {
  const hasData = byStatus != null;
  const available = filter === "all" ? (byStatus?.available || 0) : filter === "AVAILABLE" ? (byStatus?.available || 0) : 0;
  const inUse = filter === "all" ? (byStatus?.in_use || 0) : filter === "IN_USE" ? (byStatus?.in_use || 0) : 0;
  const filteredTotal = filter === "all" ? total : filter === "AVAILABLE" ? (byStatus?.available || 0) : (byStatus?.in_use || 0);

  const pAvailRaw = filteredTotal > 0 ? (available / filteredTotal) * 100 : 0;
  const pInUseRaw = filteredTotal > 0 ? (inUse / filteredTotal) * 100 : 0;
  const pAvail = available > 0 ? Math.max(1, Math.round(pAvailRaw)) : 0;
  const pInUse = inUse > 0 ? Math.max(1, Math.round(pInUseRaw)) : 0;

  return (
    <div className="flex-1 min-w-[180px] space-y-2.5">
      <div className="flex items-center text-xs">
        <span className="text-muted-foreground">Trạng thái</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-success transition-all duration-500" style={{ width: `${pAvail}%` }} />
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pInUse}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        {!hasData && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30" /> Đang chờ dữ liệu...</span>}
        {hasData && filteredTotal === 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 tài sản</span>}
        {available > 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" /> {Math.round(pAvail)}% Sẵn sàng ({available})</span>}
        {inUse > 0 && <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary" /> {Math.round(pInUse)}% Đang sử dụng ({inUse})</span>}
      </div>
    </div>
  );
}

function AssetSummary({ stats, filterStatus }) {
  const total = stats?.total || 0;
  const byStatus = stats?.by_status || null;
  const filteredTotal = !byStatus ? 0
    : filterStatus === "all" ? total
      : filterStatus === "AVAILABLE" ? (byStatus.available || 0)
        : (byStatus.in_use || 0);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5 flex-wrap">
        <div className="flex items-center gap-4 min-w-[140px]">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <Package className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
            <p className="text-sm text-muted-foreground mt-1">Tài sản</p>
          </div>
        </div>
        <div className="w-px h-14 bg-border shrink-0" />
        <AssetStatusBar byStatus={byStatus} total={total} filter={filterStatus} />
      </div>
    </div>
  );
}

function AssetRowTable({ assets, onDetail, onQR }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-10 pl-4">#</TableHead>
            <TableHead>Tài sản</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead className="text-right pr-4 w-24">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, idx) => {
            const st = STATUS_MAP[asset.status] || STATUS_MAP.AVAILABLE;
            return (
              <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onDetail(asset)}>
                <TableCell className="pl-4 text-muted-foreground text-xs">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm">{asset.name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full ${st.dot}`} />
                    <span className={`font-medium ${st.text}`}>{st.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {asset.room ? (
                    <span className="flex items-center gap-1"><Door className="size-3" /> {asset.room.room_number}</span>
                  ) : "Kho"}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="size-8 text-primary hover:bg-primary/10"
                      title="Xem QR" onClick={() => onQR(asset)}>
                      <QrCode className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8"
                      title="Chi tiết" onClick={() => onDetail(asset)}>
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StorageStackCard({ stack, onDetail, onQR }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const totalPages = Math.max(1, Math.ceil(stack.assets.length / perPage));
  const pagedAssets = stack.assets.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => {
          setOpen((v) => !v);
          if (page > totalPages) setPage(1);
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
            <Package className="size-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate">{stack.asset_type_name}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full">
            {stack.count}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{open ? "Ẩn" : "Xem"}</span>
          <CaretDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <>
          <AssetRowTable assets={pagedAssets} onDetail={onDetail} onQR={onQR} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                {page}/{totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-lg"
                  disabled={page <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPage((p) => p - 1);
                  }}
                >
                  <CaretLeft className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-lg"
                  disabled={page >= totalPages}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPage((p) => p + 1);
                  }}
                >
                  <CaretRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── QR Code Dialog ────────────────────────── */

function QRDialog({ open, onOpenChange, asset }) {
  if (!asset) return null;
  const qrData = asset.qr_code || `FSCAPE_ASSET_${asset.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Mã QR Tài sản</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="bg-white p-4 rounded-xl border-4 border-muted shadow-inner">
            <img src={qrUrl} alt="QR Code" className="size-48" />
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{asset.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{qrData}</p>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.open(qrUrl)}>
            <DownloadSimple className="size-4" /> Tải về
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> In mã
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Asset Detail Dialog (view / edit / delete) ── */

function AssetDetailDialog({ open, onOpenChange, asset, buildings, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setEditing(false); setConfirmDel(false); }
  }, [open]);

  const canChangeBuilding = !asset?.current_room_id && asset?.status !== "IN_USE";

  const startEdit = () => {
    setForm({
      name: asset.name || "",
      building_id: asset.building_id || "",
      notes: asset.notes || "",
    });
    setErrors({});
    setEditing(true);
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name?.trim()) errs.name = "Vui lòng nhập tên tài sản";
    if (!form.building_id) errs.building_id = "Vui lòng chọn tòa nhà";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setErrors({});
    try {
      const body = {
        name: form.name.trim(),
        building_id: form.building_id,
        notes: form.notes?.trim() || undefined,
      };
      await apiJson(`/api/assets/${asset.id}`, {
        method: "PUT",
        body,
      });
      toast.success("Cập nhật tài sản thành công");
      window.dispatchEvent(new CustomEvent("asset-updated", { detail: { id: asset.id, updates: body } }));
      onSaved();
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi khi cập nhật." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiJson(`/api/assets/${asset.id}`, { method: "DELETE" });
      toast.success("Đã xóa tài sản");
      window.dispatchEvent(new CustomEvent("asset-deleted", { detail: { id: asset.id } }));
      onDeleted();
    } catch (err) {
      toast.error(err.message || "Không thể xóa.");
    } finally {
      setSaving(false);
    }
  };

  if (!asset) return null;
  const st = STATUS_MAP[asset.status] || STATUS_MAP.AVAILABLE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa tài sản</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 pt-1 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label className={errors.name ? "text-destructive" : ""}>Tên tài sản *</Label>
                <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-[10px] text-destructive font-medium">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={errors.building_id ? "text-destructive" : ""}>Tòa nhà *</Label>
                  <Select
                    value={form.building_id || undefined}
                    onValueChange={(v) => set("building_id", v)}
                    disabled={!canChangeBuilding}
                  >
                    <SelectTrigger className={errors.building_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Chọn tòa nhà" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.building_id && <p className="text-[10px] text-destructive font-medium">{errors.building_id}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {canChangeBuilding
                      ? "Chỉ đổi tòa nhà khi tài sản đang ở kho. Tài sản sẽ được giữ tại kho của tòa nhà mới."
                      : "Chỉ có thể đổi tòa nhà khi tài sản đang ở kho và không ở trạng thái đang sử dụng."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Phòng</Label>
                  <Input value={asset.room ? `Phòng ${asset.room.room_number}` : "Kho"} disabled />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Ghi chú</Label>
                <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
              </div>

              {errors.root && (
                <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10 text-center">
                  {errors.root}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Hủy</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : <FloppyDisk className="size-4 mr-1.5" />}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : confirmDel ? (
          <>
            <DialogHeader>
              <DialogTitle>Xóa tài sản</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground text-center py-2">
              Bạn có chắc muốn xóa tài sản{" "}
              <strong className="text-foreground">&quot;{asset.name}&quot;</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <DialogFooter className="justify-center gap-2">
              <Button variant="outline" onClick={() => setConfirmDel(false)}>Hủy</Button>
              <Button variant="destructive" disabled={saving} onClick={handleDelete}>
                {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                Xóa
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                {asset.name}
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.text === "text-success"
                  ? "bg-success/15 text-success"
                  : "bg-primary/15 text-primary"
                  }`}>
                  {st.label}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Buildings className="size-3.5 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Tòa nhà</p>
                  </div>
                  <p className="text-sm font-semibold">{asset.building?.name || "—"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Door className="size-3.5 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Phòng</p>
                  </div>
                  <p className="text-sm font-semibold">{asset.room ? `Phòng ${asset.room.room_number}` : "Kho"}</p>
                </div>
              </div>

              {asset.notes && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú</p>
                  <p className="text-sm mt-0.5">{asset.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày tạo</p>
                  <p className="text-sm font-medium mt-0.5">{fmt(asset.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cập nhật</p>
                  <p className="text-sm font-medium mt-0.5">{fmt(asset.updated_at)}</p>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                variant="outline" size="sm"
                className="text-destructive hover:bg-destructive/10 gap-1.5"
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

/* ── Batch Create Dialog ───────────────────── */

function BatchCreateDialog({ open, onOpenChange, buildings, onSaved }) {
  const [assetTypes, setAssetTypes] = useState([]);
  const [assetTypeSearch, setAssetTypeSearch] = useState("");
  const [form, setForm] = useState({ asset_type_id: "", building_id: "", quantity: "1" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAssetTypeSearch("");
    setForm({ asset_type_id: "", building_id: "", quantity: "1" });
    setErrors({});
    setResult(null);
    apiJson("/api/asset-types?limit=100&is_active=true").then((res) => {
      setAssetTypes(res.data || []);
    }).catch(() => { });
  }, [open]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const selectedType = assetTypes.find((t) => t.id === form.asset_type_id);
  const filteredAssetTypes = assetTypes.filter((type) =>
    type.name?.toLowerCase().includes(assetTypeSearch.trim().toLowerCase())
  );

  const validate = () => {
    const e = {};
    if (!form.asset_type_id) e.asset_type_id = "Vui lòng chọn loại tài sản";
    if (!form.building_id) e.building_id = "Vui lòng chọn tòa nhà";
    const qty = Number(form.quantity);
    if (!qty || qty < 1 || qty > 100) e.quantity = "Số lượng từ 1–100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setErrors({});
    try {
      const body = {
        name: selectedType?.name || "Asset",
        building_id: form.building_id,
        asset_type_id: form.asset_type_id,
        quantity: Number(form.quantity),
      };
      const res = await apiJson("/api/assets/batch", { method: "POST", body });
      toast.success(`Đã tạo thành công ${res.count} tài sản`);
      window.dispatchEvent(new CustomEvent("asset-created"));
      setResult(res);
    } catch (err) {
      setErrors({ root: err.message || "Đã xảy ra lỗi." });
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{result.error ? "Lỗi" : "Thành công"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {result.error || `Đã tạo ${result.count} tài sản "${selectedType?.name}".`}
          </p>
          <DialogFooter className="justify-center">
            <Button onClick={() => { onOpenChange(false); if (!result.error) onSaved(); }}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm tài sản hàng loạt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Loại tài sản *</Label>
            <Input
              value={assetTypeSearch}
              onChange={(e) => setAssetTypeSearch(e.target.value)}
              placeholder="Tìm loại tài sản..."
            />
            <Select value={form.asset_type_id || undefined} onValueChange={(v) => set("asset_type_id", v)}>
              <SelectTrigger className={errors.asset_type_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Chọn loại tài sản" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72 w-[var(--radix-select-trigger-width)]">
                {filteredAssetTypes.map((at) => (
                  <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                ))}
                {filteredAssetTypes.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Không tìm thấy loại tài sản phù hợp
                  </div>
                )}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-[11px] text-muted-foreground">
                {selectedType.default_price ? Number(selectedType.default_price).toLocaleString("vi-VN") + " ₫" : "—"}
              </p>
            )}
            {errors.asset_type_id && <p className="text-[10px] text-destructive font-medium">{errors.asset_type_id}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className={errors.building_id ? "text-destructive" : ""}>Tòa nhà *</Label>
            <Select value={form.building_id || undefined} onValueChange={(v) => set("building_id", v)}>
              <SelectTrigger className={errors.building_id ? "border-destructive" : ""}>
                <SelectValue placeholder="Chọn tòa nhà" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.building_id || b.id} value={b.building_id || b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.building_id && <p className="text-[10px] text-destructive font-medium">{errors.building_id}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className={errors.quantity ? "text-destructive" : ""}>Số lượng *</Label>
            <Input
              type="number"
              min="1"
              max="100"
              className={`max-w-[180px] ${errors.quantity ? "border-destructive" : ""}`}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
            {errors.quantity && <p className="text-[10px] text-destructive font-medium">{errors.quantity}</p>}
          </div>

          {errors.root && (
            <p className="text-[11px] text-destructive font-medium bg-destructive/5 p-2 rounded-lg border border-destructive/10 text-center">
              {errors.root}
            </p>
          )}

          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-xs text-muted-foreground">
            <p>• Tên tài sản lấy từ loại tài sản đã chọn</p>
            <p>• Mỗi tài sản được gán mã QR duy nhất (FSCAPE-AST-...)</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? <CircleNotch className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Tạo {Number(form.quantity) > 1 ? `${form.quantity} tài sản` : "tài sản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Per-building asset section grouped by floor ── */

function RoomAssetSection({ room, onDetail, onQR }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <Door className="size-3.5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Phòng {room.room_number}</h4>
            <p className="text-[11px] text-muted-foreground">{room.assets.length} tài sản</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-muted-foreground">{open ? "Ẩn" : "Xem"}</span>
          <CaretDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && <AssetRowTable assets={room.assets} onDetail={onDetail} onQR={onQR} />}
    </div>
  );
}

function BuildingAssetSection({ building, onDetail, onQR }) {
  const [open, setOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [storagePage, setStoragePage] = useState(1);
  const storagePerPage = 10;

  const storageStacks = building.floors.find((floor) => floor.floor_key === "storage")?.storage_stacks || [];
  const totalStoragePages = Math.max(1, Math.ceil(storageStacks.length / storagePerPage));
  const pagedStorageStacks = storageStacks.slice((storagePage - 1) * storagePerPage, storagePage * storagePerPage);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Buildings className="size-[18px] shrink-0 text-primary" />
          <h2 className="truncate text-lg font-bold text-foreground">{building.name}</h2>
          <span className="rounded-md bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            {building.total_assets} tài sản
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {building.storage_total > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {building.storage_total} tài sản trong kho
            </span>
          )}
          <span className="text-xs font-medium text-muted-foreground">{open ? "Ẩn" : "Xem"}</span>
          <CaretDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          {building.floors.map((floor) => (
            floor.floor_key === "storage" ? (
              <div key="storage" className="space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setStorageOpen((value) => !value)}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Warehouse className="size-4 text-primary" />
                    Kho
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">{storageOpen ? "Ẩn" : "Xem"}</span>
                    <CaretDown className={`size-4 text-muted-foreground transition-transform ${storageOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {storageOpen && (
                  <>
                    <div className="grid gap-3">
                      {pagedStorageStacks.map((stack) => (
                        <StorageStackCard
                          key={stack.asset_type_id}
                          stack={stack}
                          onDetail={onDetail}
                          onQR={onQR}
                        />
                      ))}
                    </div>
                    {totalStoragePages > 1 && (
                      <div className="flex items-center justify-end gap-3 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {storagePage}/{totalStoragePages}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-lg"
                            disabled={storagePage <= 1}
                            onClick={() => setStoragePage((p) => p - 1)}
                          >
                            <CaretLeft className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 rounded-lg"
                            disabled={storagePage >= totalStoragePages}
                            onClick={() => setStoragePage((p) => p + 1)}
                          >
                            <CaretRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div key={floor.floor_key} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Layers className="size-4 text-primary" />
                  {getFloorLabel(floor.floor_key)}
                </div>
                <div className="space-y-3">
                  {floor.rooms.map((room) => (
                    <RoomAssetSection
                      key={room.room_id}
                      room={room}
                      onDetail={onDetail}
                      onQR={onQR}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Main Page ─────────────────────────────── */

export default function AssetsPage() {
  const [buildings, setBuildings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetGroups, setAssetGroups] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_LIMIT = 4;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [detailAsset, setDetailAsset] = useState(null);
  const [qrAsset, setQrAsset] = useState(null);

  const fetchStats = () => {
    api.get("/api/assets/stats")
      .then(res => setStats(res.data || res))
      .catch(console.error);
  };

  const fetchAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const params = new URLSearchParams({
        grouped: "true",
        page,
        limit: PAGE_LIMIT,
      });
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await api.get(`/api/assets?${params}`);
      setAssetGroups(res.data || []);
      setTotalPages(res.total_pages || res.totalPages || 1);
    } catch {
      setAssetGroups([]);
      setTotalPages(1);
    } finally {
      setLoadingAssets(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    Promise.all([
      api.get("/api/buildings?limit=1000"),
      api.get("/api/assets/stats"),
    ]).then(([bRes, sRes]) => {
      setBuildings(bRes.data || bRes);
      setStats(sRes.data || sRes);
    }).catch(console.error)
      .finally(() => setLoadingInit(false));
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    const handleAssetChange = () => fetchAssets();
    window.addEventListener("asset-created", handleAssetChange);
    window.addEventListener("asset-updated", handleAssetChange);
    window.addEventListener("asset-deleted", handleAssetChange);
    return () => {
      window.removeEventListener("asset-created", handleAssetChange);
      window.removeEventListener("asset-updated", handleAssetChange);
      window.removeEventListener("asset-deleted", handleAssetChange);
    };
  }, [fetchAssets]);

  const handleSaved = () => {
    setDetailAsset(null);
    fetchStats();
  };

  const handleDeleted = () => {
    setDetailAsset(null);
    fetchStats();
  };

  const handleBatchCreated = () => {
    fetchStats();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài sản</h1>
          <p className="text-sm text-muted-foreground">Theo dõi trang thiết bị và cơ sở vật chất</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> Thêm tài sản
        </Button>
      </div>

      {/* Summary */}
      <AssetSummary stats={stats} filterStatus={filterStatus} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tài sản..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả" },
            { key: "AVAILABLE", label: "Sẵn sàng" },
            { key: "IN_USE", label: "Đang sử dụng" },
          ].map((f) => (
            <Button key={f.key} size="sm"
              variant={filterStatus === f.key ? "default" : "outline"}
              onClick={() => { setFilterStatus(f.key); setPage(1); }}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content - per-building sections */}
      {loadingInit || loadingAssets ? (
        <LoadingState className="py-20" />
      ) : assetGroups.length === 0 ? (
        <EmptyState icon={Buildings} message="Không tìm thấy tòa nhà nào" />
      ) : (
        <div className="space-y-8">
          {assetGroups.map((b) => (
            <BuildingAssetSection
              key={b.building_id || b.id}
              building={b}
              onDetail={setDetailAsset}
              onQR={setQrAsset}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Batch create dialog */}
      <BatchCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        buildings={buildings}
        onSaved={handleBatchCreated}
      />

      {/* Detail dialog */}
      <AssetDetailDialog
        open={!!detailAsset}
        onOpenChange={(v) => !v && setDetailAsset(null)}
        asset={detailAsset}
        buildings={buildings}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      {/* QR dialog */}
      <QRDialog
        open={!!qrAsset}
        onOpenChange={(v) => !v && setQrAsset(null)}
        asset={qrAsset}
      />
    </div>
  );
}
