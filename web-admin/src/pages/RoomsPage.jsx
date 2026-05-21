import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, MagnifyingGlass, Eye, MapPin, Stack as Layers, House,
  CaretLeft, CaretRight, CircleNotch, ToggleLeft, ToggleRight
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cdnUrl } from "@/lib/utils";
import defaultRoomImg from "@/assets/default_building_img.jpg";

/* ── Donut Summary ───────────────────────────────── */

function RoomStatusDonut({ byStatus, total = 0, size = 72 }) {
  const available = byStatus?.available || 0;
  const occupied = byStatus?.occupied || 0;
  const locked = byStatus?.locked || 0;
  const segments = [
    { count: available, color: "var(--color-success)" },
    { count: occupied, color: "var(--color-primary)" },
    { count: locked, color: "var(--color-destructive)" },
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

function RoomSummary({ byStatus, total = 0 }) {
  const hasData = byStatus != null;
  const available = byStatus?.available || 0;
  const occupied = byStatus?.occupied || 0;
  const locked = byStatus?.locked || 0;
  const pAvail = total > 0 ? Math.round((available / total) * 100) : 0;
  const pOcc = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const pLock = total > 0 ? Math.round((locked / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="space-y-2">
        {!hasData && (
          <div className="text-xs text-muted-foreground">Đang chờ dữ liệu...</div>
        )}
        {hasData && total === 0 && (
          <div className="text-xs text-muted-foreground">0 phòng</div>
        )}
        {available > 0 && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success shrink-0" />
            <span className="text-xs text-muted-foreground">{pAvail}% Còn trống</span>
          </div>
        )}
        {occupied > 0 && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary shrink-0" />
            <span className="text-xs text-muted-foreground">{pOcc}% Đã thuê</span>
          </div>
        )}
        {locked > 0 && (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive shrink-0" />
            <span className="text-xs text-muted-foreground">{pLock}% Khóa</span>
          </div>
        )}
      </div>
      <RoomStatusDonut byStatus={byStatus} total={total} size={64} />
    </div>
  );
}

/* ── Room Card ───────────────────────────────────── */

function RoomCard({ room, onView, onToggle }) {
  const isAvailable = room.status === 'AVAILABLE';
  const isOccupied = room.status === 'OCCUPIED';
  const isLocked = room.status === 'LOCKED';

  const statusBg = isAvailable ? "bg-success"
    : isOccupied ? "bg-primary"
      : "bg-destructive";

  const statusText = isAvailable ? "text-success"
    : isOccupied ? "text-primary"
      : "text-destructive";

  const statusLabel = isAvailable ? "Còn trống"
    : isOccupied ? "Đã thuê"
      : "Đã khóa";

  const imageUrl = cdnUrl(room.images?.[0]?.image_url || room.thumbnail_url || room.images?.[0]) || defaultRoomImg;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md flex flex-row h-[140px] group">
      {/* Image - left side, fixed width */}
      <div className="w-36 shrink-0 overflow-hidden bg-muted">
        <img src={imageUrl} alt={room.room_number} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={e => e.target.src = defaultRoomImg} />
      </div>

      {/* Info - right side */}
      <div className="p-3 flex flex-col flex-1 min-w-0 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[13px] truncate">Phòng {room.room_number}</h3>
          <span className="flex items-center gap-1 shrink-0">
            <span className={`size-1.5 rounded-full ${statusBg}`} />
            <span className={`text-[10px] font-medium ${statusText}`}>{statusLabel}</span>
          </span>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1 leading-none truncate">
          <MapPin className="size-3 shrink-0" /> {room.building?.name || "—"}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5"><Layers className="size-3" /> Tầng {room.floor}</span>
          <span className="flex items-center gap-0.5 truncate" title={room.room_type?.name}><House className="size-3 shrink-0" /> {room.room_type?.name}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <Button size="sm" className="flex-1 h-7 text-[11px] gap-1" onClick={() => onView(room.id)}>
            <Eye className="size-3" /> Chi tiết
          </Button>
          <Button
            size="icon" variant="ghost" className="size-7 shrink-0"
            onClick={() => onToggle(room)}
            title={isLocked ? "Mở khóa" : "Khóa phòng"}
            disabled={isOccupied}
          >
            {isLocked ? <ToggleLeft className="size-4 text-muted-foreground" /> : <ToggleRight className="size-4 text-success" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Per-building room section with independent pagination ── */

const SECTION_LIMIT = 9;

function BuildingRoomSection({ building, search, statusFilter, onToggle, onView, refreshKey }) {
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: SECTION_LIMIT,
        building_id: building.id,
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter.toUpperCase());

      const res = await api.get(`/api/rooms?${params}`);
      setRooms(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || res.totalPages || 1);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [building.id, page, search, statusFilter, refreshKey]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Listen for room status updates - update local state without re-fetching
  useEffect(() => {
    const onStatusUpdated = (e) => {
      const { id, newStatus, statusFilter: sf } = e.detail;
      setRooms(prev => {
        const updated = prev.map(r => r.id === id ? { ...r, status: newStatus } : r);
        // If we are filtering by status and this room no longer matches, remove it
        if (sf && sf !== "all" && newStatus.toLowerCase() !== sf) {
          return updated.filter(r => r.id !== id);
        }
        return updated;
      });
    };

    window.addEventListener("room-status-updated", onStatusUpdated);
    return () => window.removeEventListener("room-status-updated", onStatusUpdated);
  }, []);

  if (!loading && rooms.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold flex items-center gap-2.5 text-foreground">
          <MapPin className="size-[18px] text-primary" />
          {building.name}
          <span className="text-xs font-bold text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-md">
            {total} phòng
          </span>
        </h2>

        {totalPages > 1 && (
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] text-muted-foreground">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" className="h-8 w-8 p-0 rounded-lg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <CaretLeft className="size-3.5" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0 rounded-lg" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <CaretRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState className="py-10" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              onView={onView}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────── */

export default function RoomsPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [roomStats, setRoomStats] = useState(null);
  const [loadingInit, setLoadingInit] = useState(true);

  // Filters
  const [buildingId, setBuildingId] = useState("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Confirm toggle dialog state
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Bumped after toggle to trigger section re-fetches (kept for future use)
  const [refreshKey] = useState(0);

  // 1. Fetch buildings + stats on mount
  const fetchStats = () => {
    api.get("/api/rooms/stats")
      .then(res => setRoomStats(res.data || res))
      .catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      api.get("/api/buildings?limit=100"),
      api.get("/api/rooms/stats"),
    ]).then(([bRes, sRes]) => {
      setBuildings(bRes.data || bRes);
      setRoomStats(sRes.data || sRes);
    }).catch(console.error)
      .finally(() => setLoadingInit(false));
  }, []);

  // Which buildings to show sections for
  const visibleBuildings = buildingId === "all"
    ? buildings
    : buildings.filter(b => b.id === buildingId);

  // Toggle handlers
  const handleToggle = (room) => {
    if (room.status === 'OCCUPIED') return;
    setToggleError(null);
    setConfirmToggle(room);
  };

  const handleToggleConfirm = async () => {
    if (!confirmToggle) return;
    const newStatus = confirmToggle.status === 'LOCKED' ? 'AVAILABLE' : 'LOCKED';
    setSaving(true);
    setToggleError(null);
    try {
      await api.patch(`/api/rooms/${confirmToggle.id}/status`, { status: newStatus });
      const label = newStatus === 'LOCKED' ? 'Đã khóa phòng' : 'Đã mở khóa phòng';
      toast.success(`${label} "${confirmToggle.room_number}"`);
      // Dispatch event to update room in each section without full re-fetch
      window.dispatchEvent(new CustomEvent("room-status-updated", {
        detail: { id: confirmToggle.id, newStatus, statusFilter: filter }
      }));
      // Update stats in background
      fetchStats();
      setConfirmToggle(null);
    } catch (err) {
      setToggleError(err.response?.data?.message || err.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header and Add Button */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phòng</h1>
          <p className="text-sm text-muted-foreground">Quản lý tất cả các phòng cho thuê FScape</p>
        </div>
        <Button className="gap-1.5" onClick={() => navigate("/rooms/create")}>
          <Plus className="size-4" /> Thêm phòng mới
        </Button>
      </div>

      {/* Stats Card */}
      {(() => {
        const allStatus = roomStats?.by_status || null;
        const allTotal = roomStats?.total || 0;
        const filteredStatus = allStatus == null ? null
          : filter === "all" ? allStatus
            : { [filter]: allStatus[filter] || 0 };
        const filteredTotal = filter === "all"
          ? allTotal
          : (allStatus?.[filter] || 0);
        return (
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-6 p-5 flex-wrap">
              {/* Left: Icon + Total */}
              <div className="flex items-center gap-4 min-w-[140px]">
                <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <House className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
                  <p className="text-sm text-muted-foreground mt-1">Phòng</p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-14 bg-border shrink-0" />

              {/* Right: Donut Summary */}
              <div className="ml-auto min-w-[200px]">
                <RoomSummary byStatus={filteredStatus} total={filteredTotal} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm phòng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={buildingId} onValueChange={(v) => setBuildingId(v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Tất cả tòa nhà" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tòa nhà</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả" },
            { key: "available", label: "Còn trống" },
            { key: "occupied", label: "Đã thuê" },
            { key: "locked", label: "Đã khóa" }
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content - per-building sections */}
      {loadingInit ? (
        <LoadingState className="py-24" />
      ) : visibleBuildings.length === 0 ? (
        <EmptyState icon={House} message="Không tìm thấy tòa nhà nào" />
      ) : (
        <div className="space-y-10 mt-2">
          {visibleBuildings.map((b) => (
            <BuildingRoomSection
              key={b.id}
              building={b}
              search={search}
              statusFilter={filter}
              onToggle={handleToggle}
              onView={(id) => navigate(`/rooms/${id}`)}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}

      {/* Confirm Toggle Dialog */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.status === 'LOCKED' ? "Mở khóa phòng" : "Khóa phòng"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.status === 'LOCKED'
              ? <>Bạn có chắc muốn <strong className="text-foreground">mở khóa</strong> phòng <strong className="text-foreground">&quot;{confirmToggle?.room_number}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">khóa</strong> phòng <strong className="text-foreground">&quot;{confirmToggle?.room_number}&quot;</strong>?</>
            }
          </p>
          {toggleError && <p className="text-sm text-destructive">{toggleError}</p>}
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setConfirmToggle(null); setToggleError(null); }} disabled={saving}>Hủy</Button>
            <Button
              variant={confirmToggle?.status === 'LOCKED' ? "default" : "destructive"}
              disabled={saving}
              onClick={handleToggleConfirm}
            >
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              {confirmToggle?.status === 'LOCKED' ? "Mở khóa" : "Khóa phòng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
