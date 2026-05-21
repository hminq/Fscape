import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bathtub, Bed, Buildings, CaretLeft, CaretRight, CaretDown, CaretUp, CircleNotch, Door, MapPin, Ruler, SortAscending, Users } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import Footer from "@/components/layout/Footer";
import { LocationsProvider, useLocations } from "@/contexts/LocationsContext";
import { api } from "@/lib/api";
import { formatVnd } from "@/lib/formatters";
import defaultRoomImg from "@/assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "price_asc", label: "Giá: Thấp đến cao" },
  { value: "price_desc", label: "Giá: Cao đến thấp" },
];

const CAPACITY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "1", label: "Một mình" },
  { value: "2", label: "1-2 người" },
  { value: "3", label: "Nhiều hơn" },
];

function FilterDropdown({ options, value, onChange, icon: Icon, placeholder, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeLabel = options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-muted/30 bg-white px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
      >
        {Icon && <Icon className="h-4 w-4" />}
        {activeLabel}
        {open ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} z-20 mt-2 max-h-64 w-48 overflow-y-auto overflow-x-hidden rounded-xl border border-muted/20 bg-white shadow-lg`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                value === option.value
                  ? "bg-primary text-white font-semibold"
                  : "text-secondary hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomsContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { locations, loading: locationsLoading } = useLocations();

  // URL as single source of truth
  const buildingId = searchParams.get("building_id") || "";
  const typeIds = useMemo(
    () => (searchParams.get("room_type_id") || "").split(",").filter(Boolean),
    [searchParams]
  );
  const floorParam = searchParams.get("floor") || "";
  const capacity = Number(searchParams.get("capacity")) || 0;
  const isDiscover = searchParams.get("discover") === "1";
  const sortOrder = searchParams.get("sort") || "price_asc";
  const page = Number(searchParams.get("page")) || 1;

  const [rooms, setRooms] = useState([]);
  const [roomTypeFilters, setRoomTypeFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalRooms, setTotalRooms] = useState(0);

  const allBuildings = useMemo(() => {
    return locations.flatMap((loc) =>
      (loc.buildings || []).map((b) => ({
        ...b,
        locationName: loc.name,
      }))
    );
  }, [locations]);

  const selectedBuilding = allBuildings.find((b) => b.id === buildingId);

  // Group buildings by location for the dropdown
  const buildingsByLocation = useMemo(() => {
    const groups = [];
    for (const loc of locations) {
      if ((loc.buildings || []).length > 0) {
        groups.push({ locationName: loc.name, buildings: loc.buildings });
      }
    }
    return groups;
  }, [locations]);

  // Atomic URL param updater — resets page on filter changes
  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) next.delete(k);
      else next.set(k, String(v));
    });
    if (!("page" in updates)) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  // Fetch paginated rooms from API with full filter/sort state
  useEffect(() => {
    let mounted = true;

    async function fetchRooms() {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({ status: "AVAILABLE", limit: PAGE_SIZE, page });
        if (buildingId) params.set("building_id", buildingId);
        if (typeIds.length > 0) params.set("room_type_id", typeIds.join(","));
        if (floorParam) params.set("floor", floorParam);
        if (capacity > 0) params.set("capacity", String(capacity));
        params.set("sort_by", "price");
        params.set("sort_order", sortOrder === "price_desc" ? "DESC" : "ASC");

        const res = await api.get(`/api/rooms?${params.toString()}`);
        if (!mounted) return;

        const roomList = res?.data || [];
        setRooms(roomList);

        const pagination = res?.pagination || res?.meta;
        if (pagination) {
          const tp = pagination.totalPages || pagination.total_pages || Math.ceil((pagination.total || roomList.length) / PAGE_SIZE);
          setTotalPages(tp);
          setTotalRooms(pagination.total || roomList.length);
        } else {
          setTotalPages(1);
          setTotalRooms(roomList.length);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Không thể tải danh sách phòng.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchRooms();
    return () => {
      mounted = false;
    };
  }, [buildingId, typeIds, floorParam, capacity, sortOrder, page]);

  // Fetch room type counts for sidebar from the filtered dataset, excluding the current room type selection.
  useEffect(() => {
    let mounted = true;

    async function fetchRoomTypeFilters() {
      try {
        const params = new URLSearchParams({ status: "AVAILABLE" });
        if (buildingId) params.set("building_id", buildingId);
        if (floorParam) params.set("floor", floorParam);
        if (capacity > 0) params.set("capacity", String(capacity));

        const res = await api.get(`/api/rooms/facets?${params.toString()}`);
        if (!mounted) return;

        setRoomTypeFilters(res?.data?.room_types || []);
      } catch {
        if (!mounted) return;
        setRoomTypeFilters([]);
      }
    }

    fetchRoomTypeFilters();
    return () => {
      mounted = false;
    };
  }, [buildingId, floorParam, capacity]);

  // Floor options: 1 through building.total_floors
  const totalFloors = selectedBuilding?.total_floors || 0;
  const floorOptions = useMemo(() => {
    const opts = [{ value: "", label: "Tất cả tầng" }];
    for (let i = 1; i <= totalFloors; i++) {
      opts.push({ value: String(i), label: `Tầng ${i}` });
    }
    return opts;
  }, [totalFloors]);

  const handleBuildingChange = (newBuildingId) => {
    updateParams({ building_id: newBuildingId, room_type_id: "", floor: "", capacity: "" });
  };

  const handleToggleType = (typeId) => {
    if (typeId === "all") {
      updateParams({ room_type_id: "" });
      return;
    }
    const hasType = typeIds.includes(typeId);
    const next = hasType ? typeIds.filter((id) => id !== typeId) : [...typeIds, typeId];
    updateParams({ room_type_id: next.join(",") });
  };

  const handleSortChange = (value) => {
    updateParams({ sort: value });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
  };

  const showBuildingOnCards = !buildingId;

  return (
    <div className="min-h-screen bg-white">
      <AppNavbar />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary md:text-4xl">
            {isDiscover ? "Phòng phù hợp với bạn" : "Tất cả phòng"}
          </h1>
          <p className="mt-2 text-secondary">
            {selectedBuilding
              ? <>{totalRooms} phòng khả dụng tại <span className="text-lg font-bold text-primary">{selectedBuilding.name}</span></>
              : `${totalRooms} phòng khả dụng`}
          </p>
        </div>

        {/* Loading locations */}
        {locationsLoading && (
          <div className="flex min-h-[30vh] items-center justify-center">
            <CircleNotch className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Main content */}
        {!locationsLoading && (
          <>
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <CircleNotch className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
                {/* Sidebar filters */}
                <aside className="space-y-6 self-start">
                  {/* Building filter */}
                  <div className="rounded-2xl border border-muted/20 bg-white p-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                      <Buildings className="h-5 w-5 text-olive" />
                      Tòa nhà
                    </h2>
                    <div className="mt-3 max-h-60 space-y-0.5 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => handleBuildingChange("")}
                        className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                          !buildingId
                            ? "bg-primary text-white"
                            : "text-secondary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input type="radio" name="building" checked={!buildingId} onChange={() => {}} className="h-3.5 w-3.5" />
                          Tất cả
                        </span>
                      </button>
                      {buildingsByLocation.map((group) => (
                        <div key={group.locationName}>
                          <p className="mt-2 mb-1 flex items-center gap-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                            <MapPin className="h-3 w-3" />
                            {group.locationName}
                          </p>
                          {group.buildings.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleBuildingChange(b.id)}
                              className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                                buildingId === b.id
                                  ? "bg-primary text-white"
                                  : "text-secondary hover:bg-primary/5 hover:text-primary"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <input type="radio" name="building" checked={buildingId === b.id} onChange={() => {}} className="h-3.5 w-3.5" />
                                {b.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Room type filter */}
                  <div className="rounded-2xl border border-muted/20 bg-white p-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                      <Door className="h-5 w-5 text-olive" />
                      Loại phòng
                    </h2>
                    <div className="mt-3 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleType("all")}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                          typeIds.length === 0
                            ? "bg-primary text-white"
                            : "text-secondary hover:bg-primary/5 hover:text-primary"
                        }`}
                        >
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={typeIds.length === 0} onChange={() => {}} className="h-3.5 w-3.5" />
                          Tất cả
                        </span>
                        <span className="font-semibold">{roomTypeFilters.reduce((sum, type) => sum + type.count, 0)}</span>
                      </button>
                      {roomTypeFilters.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleToggleType(type.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                            typeIds.includes(type.id)
                              ? "bg-primary text-white"
                              : "text-secondary hover:bg-primary/5 hover:text-primary"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={typeIds.includes(type.id)}
                              onChange={() => {}}
                              className="h-3.5 w-3.5"
                            />
                            {type.name}
                          </span>
                          <span className="font-semibold">{type.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capacity filter */}
                  <div className="rounded-2xl border border-muted/20 bg-white p-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                      <Users className="h-5 w-5 text-olive" />
                      Sức chứa
                    </h2>
                    <div className="mt-3 space-y-0.5">
                      {CAPACITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateParams({ capacity: opt.value })}
                          className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                            String(capacity || "") === opt.value
                              ? "bg-primary text-white"
                              : "text-secondary hover:bg-primary/5 hover:text-primary"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input type="radio" name="capacity" checked={String(capacity || "") === opt.value} onChange={() => {}} className="h-3.5 w-3.5" />
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                </aside>

                {/* Room list */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      {buildingId && totalFloors > 0 && (
                        <FilterDropdown
                          options={floorOptions}
                          value={floorParam}
                          onChange={(v) => updateParams({ floor: v })}
                          placeholder="Tất cả tầng"
                          align="left"
                        />
                      )}
                    </div>
                    <FilterDropdown
                      options={SORT_OPTIONS}
                      value={sortOrder}
                      onChange={handleSortChange}
                      icon={SortAscending}
                      placeholder={SORT_OPTIONS[0].label}
                    />
                  </div>

                  {rooms.length === 0 ? (
                    <p className="py-16 text-center text-secondary">Không có phòng nào phù hợp.</p>
                  ) : (
                    rooms.map((room) => {
                      const detailType = room.room_type || {};
                      return (
                        <article
                          key={room.id}
                          className="group grid grid-cols-1 overflow-hidden rounded-2xl border border-muted/20 bg-white md:grid-cols-[200px_1fr]"
                        >
                          <img
                            src={cdnUrl(room.thumbnail_url) || cdnUrl(room.images?.[0]?.image_url) || defaultRoomImg}
                            alt={room.room_type?.name || room.room_number}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = defaultRoomImg;
                            }}
                            className="h-48 w-full object-cover"
                          />

                          <div className="flex flex-col p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-2xl font-bold leading-tight text-primary">{detailType.name || "Phòng"}</h3>
                                <p className="mt-1 text-[15px] font-medium text-secondary">
                                  {room.floor != null && <>Tầng {room.floor} · </>}Phòng {room.room_number}
                                </p>
                                {showBuildingOnCards && room.building?.name && (
                                  <p className="text-sm text-muted">{room.building.name}</p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs text-muted">Giá từ</p>
                                <p className="text-2xl font-bold text-primary">{formatVnd(detailType.base_price)}</p>
                                <p className="text-xs text-secondary">/tháng</p>
                              </div>
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                              <div className="flex flex-wrap items-center gap-4 text-sm text-secondary">
                                <span className="flex items-center gap-1.5">
                                  <Users className="h-4 w-4 text-olive" />
                                  {detailType.capacity_min ?? "N/A"}-{detailType.capacity_max ?? "N/A"} người
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Ruler className="h-4 w-4 text-olive" />
                                  {detailType.area_sqm ?? "N/A"} m²
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Bed className="h-4 w-4 text-olive" />
                                  {detailType.bedrooms ?? "N/A"} phòng ngủ
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Bathtub className="h-4 w-4 text-olive" />
                                  {detailType.bathrooms ?? "N/A"} phòng tắm
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/buildings/${room.building_id || room.building?.id}/rooms/${room.id}`)}
                                className="shrink-0 h-9 rounded-full bg-olive px-5 text-sm font-semibold text-primary transition-colors hover:bg-tea"
                              >
                                Xem thêm
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-muted/30 transition-colors ${
                          page <= 1 ? "cursor-not-allowed text-secondary/30" : "text-secondary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <CaretLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                            p === page
                              ? "bg-primary text-white"
                              : "text-secondary hover:bg-primary/5 hover:text-primary"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-muted/30 transition-colors ${
                          page >= totalPages ? "cursor-not-allowed text-secondary/30" : "text-secondary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        <CaretRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}

export default function RoomsPage() {
  return (
    <LocationsProvider>
      <RoomsContent />
    </LocationsProvider>
  );
}
