import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, Eye, House,
  Stack as Layers, ToggleLeft, ToggleRight, CircleNotch,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { ROOM_STATUS_MAP } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { cdnUrl } from "@/lib/utils";
import defaultRoomImg from "@/assets/default_building_img.jpg";

/* ── constants ──────────────────────────────────────────── */

const FETCH_LIMIT = 999;



const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "AVAILABLE", label: "Còn trống" },
  { key: "OCCUPIED", label: "Đã thuê" },
  { key: "LOCKED", label: "Đã khóa" },
];

/* ── Status Bar (3-segment: available / occupied / locked) ── */

function RoomStatusBar({ available, occupied, locked }) {
  const total = available + occupied + locked;
  const pAvail = total > 0 ? (available / total) * 100 : 0;
  const pOcc = total > 0 ? (occupied / total) * 100 : 0;
  const pLock = total > 0 ? (locked / total) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
        <div className="h-full bg-success transition-all duration-500" style={{ width: `${pAvail}%` }} />
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pOcc}%` }} />
        <div className="h-full bg-destructive transition-all duration-500" style={{ width: `${pLock}%` }} />
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        {total === 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 phòng
          </span>
        )}
        {available > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" /> {Math.round(pAvail)}% Còn trống ({available})
          </span>
        )}
        {occupied > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> {Math.round(pOcc)}% Đã thuê ({occupied})
          </span>
        )}
        {locked > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive" /> {Math.round(pLock)}% Khóa ({locked})
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Room Card ───────────────────────────────────── */

function RoomCard({ room, onView, onToggle }) {
  const s = ROOM_STATUS_MAP[room.status] || ROOM_STATUS_MAP.AVAILABLE;
  const isOccupied = room.status === "OCCUPIED";
  const isLocked = room.status === "LOCKED";
  const imageUrl = cdnUrl(room.images?.[0]?.image_url || room.thumbnail_url) || defaultRoomImg;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md flex flex-row h-[140px] group">
      {/* Image */}
      <div className="w-36 shrink-0 overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={room.room_number}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { e.target.src = defaultRoomImg; }}
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 min-w-0 gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[13px] truncate">Phòng {room.room_number}</h3>
          <span className="flex items-center gap-1 shrink-0">
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            <span className={`text-[10px] font-medium ${s.text}`}>{s.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5 truncate" title={room.room_type?.name}>
            <House className="size-3 shrink-0" /> {room.room_type?.name}
          </span>
        </div>

        {room.room_type?.base_price != null && (
          <p className="text-xs font-medium text-primary">
            {Number(room.room_type.base_price).toLocaleString("vi-VN")} đ/tháng
          </p>
        )}

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
            {isLocked
              ? <ToggleLeft className="size-4 text-muted-foreground" />
              : <ToggleRight className="size-4 text-success" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────── */

export default function BMRoomsPage() {
  const navigate = useNavigate();

  const [allRooms, setAllRooms] = useState([]);
  const [roomStats, setRoomStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Toggle dialog
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [saving, setSaving] = useState(false);

  /* ── fetch rooms + stats (both auto-scoped by API) ── */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, statsRes] = await Promise.all([
        api.get(`/api/rooms?limit=${FETCH_LIMIT}`),
        api.get("/api/rooms/stats"),
      ]);
      setAllRooms(roomsRes.data || []);
      setRoomStats(statsRes.data || statsRes);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── derived data ────────────────────────────────── */

  const stats = roomStats?.by_status || { available: 0, occupied: 0, locked: 0 };

  const filtered = useMemo(() => {
    return allRooms.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !r.room_number?.toLowerCase().includes(q) &&
          !r.room_type?.name?.toLowerCase().includes(q) &&
          !String(r.floor).includes(q)
        ) return false;
      }
      return true;
    });
  }, [allRooms, statusFilter, search]);

  /** Group filtered rooms by floor, sorted ascending */
  const floorGroups = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const f = r.floor ?? 0;
      if (!map[f]) map[f] = [];
      map[f].push(r);
    });
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => a - b)
      .map((floor) => ({ floor, rooms: map[floor] }));
  }, [filtered]);

  /* ── toggle handlers ─────────────────────────────── */

  const handleToggle = (room) => {
    if (room.status === "OCCUPIED") return;
    setToggleError(null);
    setConfirmToggle(room);
  };

  const handleToggleConfirm = async () => {
    if (!confirmToggle) return;
    const newStatus = confirmToggle.status === "LOCKED" ? "AVAILABLE" : "LOCKED";
    setSaving(true);
    setToggleError(null);
    try {
      await api.patch(`/api/rooms/${confirmToggle.id}/status`, { status: newStatus });
      setConfirmToggle(null);
      fetchAll();
    } catch (err) {
      setToggleError(err.message || "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  /* ── render ──────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Phòng</h1>
        <p className="text-sm text-muted-foreground">Quản lý phòng trong tòa nhà của bạn</p>
      </div>

      {/* Stats Card */}
      {!loading && !error && (() => {
        const filterKey = statusFilter === "all" ? null : statusFilter.toLowerCase();
        const filteredStats = filterKey
          ? { available: 0, occupied: 0, locked: 0, [filterKey]: stats[filterKey] || 0 }
          : stats;
        const filteredTotal = filterKey
          ? (stats[filterKey] || 0)
          : (roomStats?.total || allRooms.length);

        return (
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-6 p-5 flex-wrap">
              <div className="flex items-center gap-4 min-w-[140px]">
                <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                  <House className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
                  <p className="text-sm text-muted-foreground mt-1">Phòng</p>
                </div>
              </div>
              <div className="w-px h-14 bg-border shrink-0" />
              <div className="flex-1 min-w-[200px]">
                <RoomStatusBar
                  available={filteredStats.available}
                  occupied={filteredStats.occupied}
                  locked={filteredStats.locked}
                />
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
            placeholder="Tìm theo số phòng, loại phòng, tầng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button key={f.key} size="sm"
              variant={statusFilter === f.key ? "default" : "outline"}
              onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchAll}>Thử lại</Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={House} message="Không tìm thấy phòng nào" />
      ) : (
        <div className="space-y-8">
          {floorGroups.map(({ floor, rooms }) => (
            <div key={floor} className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2.5 text-foreground">
                <Layers className="size-[18px] text-primary" />
                Tầng {floor}
                <span className="text-xs font-bold text-muted-foreground bg-muted/80 px-2.5 py-0.5 rounded-md">
                  {rooms.length} phòng
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((r) => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    onView={(id) => navigate(`/building-manager/rooms/${id}`)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Toggle Dialog */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.status === "LOCKED" ? "Mở khóa phòng" : "Khóa phòng"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.status === "LOCKED"
              ? <>Bạn có chắc muốn <strong className="text-foreground">mở khóa</strong> phòng <strong className="text-foreground">&quot;{confirmToggle?.room_number}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">khóa</strong> phòng <strong className="text-foreground">&quot;{confirmToggle?.room_number}&quot;</strong>?</>}
          </p>
          {toggleError && <p className="text-sm text-destructive">{toggleError}</p>}
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setConfirmToggle(null); setToggleError(null); }} disabled={saving}>Hủy</Button>
            <Button
              variant={confirmToggle?.status === "LOCKED" ? "default" : "destructive"}
              disabled={saving}
              onClick={handleToggleConfirm}
            >
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              {confirmToggle?.status === "LOCKED" ? "Mở khóa" : "Khóa phòng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
