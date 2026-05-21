import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bathtub, Bed, CircleNotch, MapPin, Ruler, Users, NavigationArrow, Crosshair, WarningCircle } from "@phosphor-icons/react";
import { Map as MapView, MapMarker, MarkerContent, MapControls, MapRoute } from "@/components/ui/map";
import AppNavbar from "@/components/layout/AppNavbar";
import Footer from "@/components/layout/Footer";
import { LocationsProvider, useLocations } from "@/contexts/LocationsContext";
import { api } from "@/lib/api";
import { formatVnd } from "@/lib/formatters";
import defaultBuildingImg from "@/assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

const DETAIL_TABS = [
  { label: "Thông tin", sectionId: "building-info" },
  { label: "Tiện ích", sectionId: "building-facilities" },
  { label: "Phòng", sectionId: "building-rooms" },
];

function BuildingHero({ building, activeTab, onTabChange }) {
  const heroImage = useMemo(() => {
    const galleryImage = (building.images || []).find((item) => item?.image_url)?.image_url;
    return cdnUrl(building.thumbnail_url) || cdnUrl(galleryImage) || defaultBuildingImg;
  }, [building]);

  return (
    <section className="relative min-h-[72vh] overflow-hidden bg-primary">
      <img
        src={heroImage}
        alt={building.name}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = defaultBuildingImg;
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/45 to-black/25" />

      <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl items-end px-6 pb-24 md:px-12">
        <div className="max-w-4xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
            Địa điểm / {building.location?.name || "Chưa xác định"}
          </p>

          <h1 className="leading-[0.9] uppercase">
            <span className="inline-block bg-tea px-3 py-1 font-display text-4xl tracking-[0.08em] text-primary md:text-5xl">
              Fscape
            </span>
            <span className="mt-3 block text-5xl font-bold text-white md:text-7xl">{building.name}</span>
          </h1>

          <p className="mt-5 flex items-center gap-2 text-base text-white/90 md:text-2xl">
            <MapPin className="h-4 w-4 md:h-5 md:w-5" />
            {building.address || "Đang cập nhật địa chỉ"}
          </p>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/20 bg-primary/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            Chi tiết tòa nhà
          </p>

          <div className="flex items-center gap-6 md:gap-10">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => onTabChange(tab.label)}
                className={`nav-underline nav-underline-olive pb-1 text-sm font-medium transition-colors md:text-base ${
                  activeTab === tab.label
                    ? "nav-underline-active text-tea"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildingDetailContent() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { locations, loading: locationsLoading } = useLocations();
  const [building, setBuilding] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypeDetails, setRoomTypeDetails] = useState({});
  const [activeRoomTypeId, setActiveRoomTypeId] = useState("");
  const [activeTab, setActiveTab] = useState("Thông tin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sectionRefs = useRef({});
  const roomTypeScrollRef = useRef(null);
  const roomShowcaseScrollRef = useRef(null);
  const roomTypeTabRefs = useRef({});
  const roomSlideRefs = useRef({});
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const roomTypeTabs = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      const type = roomTypeDetails[room.room_type?.id] || room.room_type;
      if (!type?.id || map.has(type.id)) return;
      map.set(type.id, { id: type.id, name: type.name || "Loại phòng" });
    });
    return Array.from(map.values());
  }, [rooms, roomTypeDetails]);

  const displayedRooms = useMemo(() => {
    if (!activeRoomTypeId) return rooms;
    return rooms.filter((room) => room.room_type?.id === activeRoomTypeId);
  }, [rooms, activeRoomTypeId]);

  const roomSlides = useMemo(
    () =>
      roomTypeTabs
        .map((tab) => {
          const room = rooms.find((item) => item.room_type?.id === tab.id);
          const roomType = roomTypeDetails[tab.id] || room?.room_type || null;
          if (!room || !roomType) return null;
          return { tab, room, roomType };
        })
        .filter(Boolean),
    [roomTypeTabs, rooms, roomTypeDetails]
  );

  const activeRoomIndex = Math.max(
    0,
    roomSlides.findIndex((slide) => slide.tab.id === activeRoomTypeId)
  );

  const featuredRoom = roomSlides[activeRoomIndex]?.room || displayedRooms[0];
  const handleTabChange = (tabLabel) => {
    setActiveTab(tabLabel);
    const target = sectionRefs.current[tabLabel];
    if (!target) return;

    const offset = 140;
    const nextY = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: nextY, behavior: "smooth" });
  };

  useEffect(() => {
    if (locationsLoading) {
      setLoading(true);
      return;
    }

    let mounted = true;

    function findBuildingInLocations(sourceLocations) {
      for (const loc of sourceLocations || []) {
        const matched = (loc.buildings || []).find((b) => b.id === buildingId);
        if (matched) {
          return { ...matched, location: matched.location || { id: loc.id, name: loc.name } };
        }
      }
      return null;
    }

    async function fetchBuilding() {
      try {
        setLoading(true);
        setError("");
        const fromContext = findBuildingInLocations(locations);
        if (fromContext) {
          if (mounted) setBuilding(fromContext);
          return;
        }

        const listRes = await api.get("/api/locations?is_active=true&limit=100");
        const locs = listRes?.data || [];
        const detailLocations = await Promise.all(
          locs.map((loc) =>
            api
              .get(`/api/locations/${loc.id}`)
              .then((res) => res.data)
              .catch(() => null)
          )
        );

        if (!mounted) return;
        const validLocations = detailLocations.filter(Boolean);
        const fromFallback = findBuildingInLocations(validLocations);

        if (!fromFallback) {
          setError("Không tìm thấy tòa nhà.");
          return;
        }

        setBuilding(fromFallback);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Không thể tải chi tiết tòa nhà.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchBuilding();
    return () => {
      mounted = false;
    };
  }, [buildingId, locations, locationsLoading]);

  useEffect(() => {
    let mounted = true;

    async function fetchFacilities() {
      try {
        const res = await api.get(`/api/buildings/${buildingId}`);
        if (!mounted) return;

        const facilityList = (res?.data?.facilities || []).filter((item) => {
          const relationActive = item?.BuildingFacility?.is_active;
          const facilityActive = item?.is_active;
          return (relationActive ?? true) && (facilityActive ?? true);
        });

        setFacilities(facilityList);
      } catch {
        if (!mounted) return;
        setFacilities([]);
      }
    }

    fetchFacilities();
    return () => {
      mounted = false;
    };
  }, [buildingId]);

  useEffect(() => {
    let mounted = true;

    async function fetchRooms() {
      try {
        const res = await api.get(`/api/rooms?building_id=${buildingId}&status=AVAILABLE&limit=50`);
        if (!mounted) return;
        const roomList = res?.data || [];
        const uniqueTypeIds = [...new Set(roomList.map((room) => room.room_type?.id).filter(Boolean))];
        setRooms(roomList);
        setActiveRoomTypeId((prev) => {
          if (prev && uniqueTypeIds.includes(prev)) return prev;
          if (uniqueTypeIds.length === 0) return "";
          return uniqueTypeIds[Math.floor(uniqueTypeIds.length / 2)];
        });

        if (uniqueTypeIds.length === 0) {
          setRoomTypeDetails({});
          return;
        }

        const detailEntries = await Promise.all(
          uniqueTypeIds.map(async (id) => {
            try {
              const detailRes = await api.get(`/api/room-types/${id}`);
              return [id, detailRes?.data || null];
            } catch {
              return [id, null];
            }
          })
        );

        if (!mounted) return;
        const detailMap = detailEntries.reduce((acc, [id, data]) => {
          if (data) acc[id] = data;
          return acc;
        }, {});
        setRoomTypeDetails(detailMap);
      } catch {
        if (!mounted) return;
        setRooms([]);
        setRoomTypeDetails({});
        setActiveRoomTypeId("");
      }
    }

    fetchRooms();
    return () => {
      mounted = false;
    };
  }, [buildingId]);

  useEffect(() => {
    if (!building) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const found = DETAIL_TABS.find((tab) => tab.sectionId === visible.target.id);
        if (found) setActiveTab(found.label);
      },
      { threshold: [0.35, 0.6], rootMargin: "-100px 0px -45% 0px" }
    );

    DETAIL_TABS.forEach((tab) => {
      const node = sectionRefs.current[tab.label];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [building]);

  useEffect(() => {
    if (!activeRoomTypeId) return;

    const centerToActive = (smooth) => {
      const activeTabEl = roomTypeTabRefs.current[activeRoomTypeId];
      const activeSlideEl = roomSlideRefs.current[activeRoomTypeId];
      const behavior = smooth ? "smooth" : "instant";

      if (activeTabEl) {
        activeTabEl.scrollIntoView({ inline: "center", block: "nearest", behavior });
      }
      if (activeSlideEl) {
        activeSlideEl.scrollIntoView({ inline: "center", block: "nearest", behavior });
      }
    };

    // Double-rAF ensures layout is fully resolved after state changes
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => centerToActive(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [activeRoomTypeId, roomSlides.length]);

  const handleLocateUser = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Trình duyệt này không hỗ trợ định vị.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
        };
        setUserLocation(coords);
        setLocating(false);

        const map = mapRef.current;
        const buildingLng = Number(building?.longitude);
        const buildingLat = Number(building?.latitude);
        if (map && Number.isFinite(buildingLng) && Number.isFinite(buildingLat)) {
          map.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 16,
            duration: 1000,
          });
        }
      },
      () => {
        setLocating(false);
        setLocationError("Không thể lấy vị trí hiện tại.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <div className="min-h-screen bg-primary">
      <AppNavbar />

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <CircleNotch className="h-10 w-10 animate-spin text-white" />
        </div>
      ) : error || !building ? (
        <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-xl font-semibold text-white">{error || "Đã có lỗi xảy ra."}</p>
          <Link
            to="/"
            className="rounded-full border border-white/60 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-primary"
          >
            Quay về trang chủ
          </Link>
        </div>
      ) : (
        <>
          <BuildingHero building={building} activeTab={activeTab} onTabChange={handleTabChange} />
          <section className="bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16">
              <section
                id="building-info"
                ref={(node) => {
                  sectionRefs.current["Thông tin"] = node;
                }}
                className="scroll-mt-36"
              >
                <div className="flex items-center gap-4 pb-3">
                  <h2 className="text-3xl font-bold text-secondary md:text-4xl">Thông tin</h2>
                  <span className="h-px flex-1 bg-muted/30" />
                </div>

                <div className={`mt-6 grid grid-cols-1 gap-8 ${building.latitude && building.longitude ? "lg:grid-cols-[1fr_360px]" : ""}`}>
                  <div className="grid grid-cols-1 gap-4 text-base text-secondary md:grid-cols-2 md:text-lg self-start">
                    <p>
                      <span className="font-semibold text-primary">Tòa nhà:</span> {building.name}
                    </p>
                    <p>
                      <span className="font-semibold text-primary">Khu vực:</span>{" "}
                      {building.location?.name || "Đang cập nhật"}
                    </p>
                    <p className="md:col-span-2">
                      <span className="font-semibold text-primary">Địa chỉ:</span>{" "}
                      {building.address || "Đang cập nhật"}
                    </p>
                    {building.description && (
                      <p className="md:col-span-2 leading-relaxed">
                        <span className="font-semibold text-primary">Mô tả:</span>{" "}
                        {building.description}
                      </p>
                    )}
                    <div className="md:col-span-2 flex flex-col items-start gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleLocateUser}
                        disabled={locating}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {locating ? (
                          <CircleNotch className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crosshair className="h-4 w-4" />
                        )}
                        {userLocation ? "Cập nhật vị trí của tôi" : "Xem vị trí của tôi"}
                      </button>

                      {locationError && (
                        <p className="flex items-center gap-2 text-sm text-red-600">
                          <WarningCircle className="h-4 w-4 shrink-0" />
                          {locationError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Map */}
                  {building.latitude && building.longitude && (
                    <div className="aspect-square overflow-hidden rounded-2xl border border-muted/20">
                      <MapView
                        ref={mapRef}
                        center={[Number(building.longitude), Number(building.latitude)]}
                        zoom={15}
                        className="h-full w-full"
                        theme="light"
                      >
                        <MapMarker
                          longitude={Number(building.longitude)}
                          latitude={Number(building.latitude)}
                        >
                          <MarkerContent>
                            <div className="flex items-center justify-center">
                              <span className="absolute h-8 w-8 animate-ping rounded-full bg-olive/30" />
                              <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-olive shadow-lg">
                                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                              </span>
                            </div>
                          </MarkerContent>
                        </MapMarker>

                        {userLocation && (
                          <>
                            <MapMarker
                              longitude={userLocation.longitude}
                              latitude={userLocation.latitude}
                            >
                              <MarkerContent>
                                <div className="flex items-center justify-center">
                                  <span className="absolute h-8 w-8 rounded-full bg-white/25" />
                                  <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white shadow-lg">
                                    <NavigationArrow className="h-3 w-3 text-primary" weight="fill" />
                                  </span>
                                </div>
                              </MarkerContent>
                            </MapMarker>

                            <MapRoute
                              coordinates={[
                                [Number(building.longitude), Number(building.latitude)],
                                [userLocation.longitude, userLocation.latitude],
                              ]}
                              color="#011936"
                              width={3}
                              opacity={0.6}
                              dashArray={[2, 2]}
                              interactive={false}
                            />
                          </>
                        )}

                        <MapControls position="bottom-right" showZoom />
                      </MapView>
                    </div>
                  )}
                </div>
              </section>

              <section
                id="building-facilities"
                ref={(node) => {
                  sectionRefs.current["Tiện ích"] = node;
                }}
                className="scroll-mt-36 mt-14 pt-14"
              >
                <div className="flex items-center gap-4 pb-3">
                  <h2 className="text-3xl font-bold text-secondary md:text-4xl">Tiện ích</h2>
                  <span className="h-px flex-1 bg-muted/30" />
                </div>
                {facilities.length === 0 ? (
                  <p className="mt-4 text-base leading-relaxed text-secondary md:text-lg">
                    Hiện chưa có tiện ích cho tòa nhà này.
                  </p>
                ) : (
                  <ul className="mt-6 grid grid-cols-1 gap-x-16 gap-y-6 md:grid-cols-2">
                    {facilities.map((facility) => (
                      <li key={facility.id} className="relative pl-5">
                        <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-olive" />
                        <p className="text-base font-semibold text-primary">{facility.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                id="building-rooms"
                ref={(node) => {
                  sectionRefs.current["Phòng"] = node;
                }}
                className="scroll-mt-36 mt-14 pt-14"
              >
                <div className="flex items-center gap-4 pb-3">
                  <h2 className="text-3xl font-bold text-secondary md:text-4xl">Phòng</h2>
                  <span className="h-px flex-1 bg-muted/30" />
                </div>
                {rooms.length === 0 ? (
                  <p className="mt-4 text-base leading-relaxed text-secondary md:text-lg">
                    Hiện chưa có phòng cho tòa nhà này.
                  </p>
                ) : (
                  <div className="mt-6">
                    <div
                      ref={roomTypeScrollRef}
                      className="mx-auto max-w-[860px] overflow-x-auto pb-1 scrollbar-hide rounded-full bg-primary/5 px-1 py-1 snap-x snap-mandatory"
                    >
                      <div className="mx-auto flex w-max items-center gap-0.5">
                        {roomTypeTabs.map((roomType) => (
                          <button
                            key={roomType.id}
                            ref={(node) => {
                              roomTypeTabRefs.current[roomType.id] = node;
                            }}
                            type="button"
                            onClick={() => setActiveRoomTypeId(roomType.id)}
                            className={`shrink-0 snap-center rounded-full px-3.5 py-1.5 text-sm font-medium text-center transition-colors ${
                              activeRoomTypeId === roomType.id
                                ? "bg-primary text-white"
                                : "text-secondary hover:text-primary"
                            }`}
                          >
                            {roomType.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {featuredRoom ? (
                      <div
                        ref={roomShowcaseScrollRef}
                        className="mt-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                      >
                        <div className="flex w-max items-stretch gap-5 px-[8vw] md:px-[10vw]">
                          {roomSlides.map((slide) => (
                            <article
                              key={slide.tab.id}
                              ref={(node) => {
                                roomSlideRefs.current[slide.tab.id] = node;
                              }}
                              className="relative w-[78vw] min-w-[760px] max-w-[980px] shrink-0 snap-center pb-10"
                            >
                              <div className="relative overflow-hidden rounded-3xl">
                                <img
                                  src={
                                    cdnUrl(slide.room.thumbnail_url) ||
                                    cdnUrl(slide.room.images?.[0]?.image_url) ||
                                    defaultBuildingImg
                                  }
                                  alt={slide.roomType?.name || slide.room.room_number}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = defaultBuildingImg;
                                  }}
                                  className="h-[520px] w-full object-cover"
                                />
                              </div>

                              <div className="absolute bottom-0 right-6 max-w-lg rounded-2xl border border-muted/20 bg-white/95 px-6 py-5 backdrop-blur-sm">
                                <div className="flex items-start justify-between gap-6">
                                  <div>
                                    <p className="text-2xl font-bold leading-tight text-primary">
                                      {slide.roomType?.name || "Phòng tiêu chuẩn"}
                                    </p>
                                    <p className="mt-0.5 text-sm text-secondary">{building.name}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted">Giá từ</p>
                                    <p className="text-2xl font-bold text-primary">
                                      {formatVnd(slide.roomType?.base_price || slide.room.room_type?.base_price)}
                                      <span className="text-xs font-medium text-secondary">/tháng</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 text-sm text-secondary">
                                    <span className="flex items-center gap-1.5">
                                      <Users className="h-4 w-4 text-olive" />
                                      {slide.roomType?.capacity_min ?? "N/A"}-{slide.roomType?.capacity_max ?? "N/A"} người
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Bathtub className="h-4 w-4 text-olive" />
                                      {slide.roomType?.bathrooms ?? "N/A"} WC
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Ruler className="h-4 w-4 text-olive" />
                                      {slide.roomType?.area_sqm ?? "N/A"} m²
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/rooms?building_id=${buildingId}&room_type_id=${slide.tab.id}`
                                      )
                                    }
                                    className="shrink-0 h-10 rounded-full bg-olive px-6 text-sm font-semibold text-primary transition-colors hover:bg-tea"
                                  >
                                    Xem phòng
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            </div>
          </section>
        </>
      )}
      <Footer />
    </div>
  );
}

export default function BuildingDetailPage() {
  return (
    <LocationsProvider>
      <BuildingDetailContent />
    </LocationsProvider>
  );
}
