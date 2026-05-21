import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlass,
  Package,
  QrCode,
  Eye,
  Door,
  CircleNotch,
  DownloadSimple,
  Printer,
  Clock,
  Buildings,
  Stack as Layers,
  Warehouse,
  CaretDown,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import { ASSET_STATUS_MAP, ASSET_HISTORY_ACTION_LABELS } from "@/lib/constants";

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
import Pagination from "@/components/Pagination";
import { LoadingState, EmptyState } from "@/components/StateDisplay";

const STATUS_MAP = ASSET_STATUS_MAP;
const ACTION_LABELS = ASSET_HISTORY_ACTION_LABELS;
const PAGE_LIMIT = 10;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "AVAILABLE", label: "Sẵn sàng" },
  { key: "IN_USE", label: "Đang sử dụng" },
];

const getFloorLabel = (floorKey) => floorKey === "storage" ? "Kho" : `Tầng ${floorKey}`;

function AssetStatusBar({ byStatus, total = 0, filter = "all" }) {
  const available = filter === "all"
    ? (byStatus?.available || 0)
    : filter === "AVAILABLE"
      ? (byStatus?.available || 0)
      : 0;
  const inUse = filter === "all"
    ? (byStatus?.in_use || 0)
    : filter === "IN_USE"
      ? (byStatus?.in_use || 0)
      : 0;
  const filteredTotal = filter === "all"
    ? total
    : filter === "AVAILABLE"
      ? (byStatus?.available || 0)
      : (byStatus?.in_use || 0);

  const pAvail = filteredTotal > 0 ? Math.max(available > 0 ? 1 : 0, Math.round((available / filteredTotal) * 100)) : 0;
  const pInUse = filteredTotal > 0 ? Math.max(inUse > 0 ? 1 : 0, Math.round((inUse / filteredTotal) * 100)) : 0;

  return (
    <div className="flex-1 min-w-[180px] space-y-2.5">
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-success transition-all duration-500" style={{ width: `${pAvail}%` }} />
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pInUse}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        {filteredTotal === 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 tài sản
          </span>
        )}
        {available > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" /> {pAvail}% Sẵn sàng
          </span>
        )}
        {inUse > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> {pInUse}% Đang sử dụng
          </span>
        )}
      </div>
    </div>
  );
}

function AssetSummary({ stats, filterStatus }) {
  const total = stats?.total || 0;
  const byStatus = stats?.by_status || null;
  const filteredTotal = !byStatus
    ? 0
    : filterStatus === "all"
      ? total
      : filterStatus === "AVAILABLE"
        ? (byStatus.available || 0)
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
              <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onDetail(asset.id)}>
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
                    <span className="flex items-center gap-1">
                      <Door className="size-3" /> {asset.room.room_number}
                    </span>
                  ) : "Kho"}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-primary hover:bg-primary/10"
                      title="Xem QR"
                      onClick={() => onQR(asset)}
                    >
                      <QrCode className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="Chi tiết"
                      onClick={() => onDetail(asset.id)}
                    >
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
  const currentPage = Math.min(page, totalPages);
  const pagedAssets = stack.assets.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((v) => !v)}
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
          <div className="flex items-center justify-end px-4 py-3 border-t bg-muted/10">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))}
            />
          </div>
        </>
      )}
    </div>
  );
}

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
  const currentStoragePage = Math.min(storagePage, totalStoragePages);
  const pagedStorageStacks = storageStacks.slice((currentStoragePage - 1) * storagePerPage, currentStoragePage * storagePerPage);

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
        <div className="flex items-center gap-3 shrink-0">
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
                    <div className="flex items-center justify-end">
                      <Pagination
                        page={currentStoragePage}
                        totalPages={totalStoragePages}
                        onPrev={() => setStoragePage((p) => Math.max(1, Math.min(p, totalStoragePages) - 1))}
                        onNext={() => setStoragePage((p) => Math.min(totalStoragePages, Math.min(p, totalStoragePages) + 1))}
                      />
                    </div>
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

function AssetDetailDialog({ open, onOpenChange, assetId }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/assets/${id}`);
      setAsset(res.data || res);
    } catch {
      setAsset(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && assetId) fetchDetail(assetId);
    return () => setAsset(null);
  }, [open, assetId, fetchDetail]);

  if (!open) return null;

  const st = asset ? (STATUS_MAP[asset.status] || STATUS_MAP.AVAILABLE) : null;
  const histories = asset?.histories || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {loading || !asset ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                {asset.name}
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  st.text === "text-success"
                    ? "bg-success/15 text-success"
                    : "bg-primary/15 text-primary"
                }`}>
                  {st.label}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Door className="size-3.5 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Phòng</p>
                  </div>
                  <p className="text-sm font-semibold">{asset.room ? `Phòng ${asset.room.room_number}` : "Kho"}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <QrCode className="size-3.5 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Mã QR</p>
                  </div>
                  <p className="text-sm font-semibold font-mono truncate">{asset.qr_code || "-"}</p>
                </div>
              </div>

              {asset.notes && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú</p>
                  <p className="text-sm mt-0.5">{asset.notes}</p>
                </div>
              )}

              {histories.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Lịch sử</span>
                  </div>
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />
                    {histories.map((h) => {
                      const toSt = STATUS_MAP[h.to_status];
                      return (
                        <div key={h.id} className="relative">
                          <div className={`absolute -left-5 top-1.5 size-2.5 rounded-full ring-2 ring-background ${toSt?.dot || "bg-muted-foreground"}`} />
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium text-xs">
                              {ACTION_LABELS[h.action] || h.action}
                            </span>
                            {h.from_status && h.to_status && h.from_status !== h.to_status && (
                              <span className="text-xs text-muted-foreground">
                                {STATUS_MAP[h.from_status]?.label || h.from_status} → {toSt?.label || h.to_status}
                              </span>
                            )}
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span>
                          </div>
                          {h.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">{h.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BMAssetsPage() {
  const [stats, setStats] = useState(null);
  const [assetGroups, setAssetGroups] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [detailAssetId, setDetailAssetId] = useState(null);
  const [qrAsset, setQrAsset] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get("/api/assets/stats");
      setStats(res.data || res);
    } catch {
      setStats({ total: 0, by_status: { available: 0, in_use: 0 } });
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const params = new URLSearchParams({
        grouped: "true",
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await api.get(`/api/assets?${params.toString()}`);
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
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchStats();
      fetchAssets();
    };
    window.addEventListener("asset-created", handleRefresh);
    window.addEventListener("asset-updated", handleRefresh);
    window.addEventListener("asset-deleted", handleRefresh);
    return () => {
      window.removeEventListener("asset-created", handleRefresh);
      window.removeEventListener("asset-updated", handleRefresh);
      window.removeEventListener("asset-deleted", handleRefresh);
    };
  }, [fetchAssets, fetchStats]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setFilterStatus(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Tài sản</h1>
        <p className="text-sm text-muted-foreground">Theo dõi trang thiết bị trong tòa nhà của bạn</p>
      </div>

      {loadingSummary ? (
        <LoadingState className="py-10" />
      ) : (
        <AssetSummary stats={stats} filterStatus={filterStatus} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã QR, phòng..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filterStatus === f.key ? "default" : "outline"}
              onClick={() => handleStatusChange(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loadingAssets ? (
        <LoadingState className="py-20" />
      ) : assetGroups.length === 0 ? (
        <EmptyState icon={Package} message="Không tìm thấy tài sản nào" />
      ) : (
        <div className="space-y-8">
          {assetGroups.map((building) => (
            <BuildingAssetSection
              key={building.building_id || building.id}
              building={building}
              onDetail={setDetailAssetId}
              onQR={setQrAsset}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>

      <AssetDetailDialog
        open={!!detailAssetId}
        onOpenChange={(v) => !v && setDetailAssetId(null)}
        assetId={detailAssetId}
      />

      <QRDialog
        open={!!qrAsset}
        onOpenChange={(v) => !v && setQrAsset(null)}
        asset={qrAsset}
      />
    </div>
  );
}
