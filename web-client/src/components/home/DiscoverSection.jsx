import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MagnifyingGlass, CheckCircle, ArrowRight, GraduationCap, Buildings, NavigationArrow, Clock } from "@phosphor-icons/react";
import { useLocations } from "@/contexts/LocationsContext";
import { findNearestBuilding } from "@/lib/geo";
import { CircleNotch } from "@phosphor-icons/react";
import { Map as MapView, MapMarker, MarkerContent, MapRoute, MapControls } from "@/components/ui/map";
import { api } from "@/lib/api";

const CAPACITY_OPTIONS = [
  { label: "Một mình", value: 1 },
  { label: "1-2 người", value: 2 },
  { label: "Nhiều hơn", value: 3 },
];

export default function DiscoverSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locations, loading } = useLocations();

  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [dismissedPrefill, setDismissedPrefill] = useState(false);
  const [selectedCapacity, setSelectedCapacity] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);

  const allUniversities = useMemo(() => {
    return locations.flatMap((loc) =>
      (loc.universities || []).map((u) => ({
        ...u,
        locationId: loc.id,
        locationName: loc.name,
      }))
    );
  }, [locations]);

  const allBuildings = useMemo(() => {
    return locations.flatMap((loc) => loc.buildings || []);
  }, [locations]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return allUniversities.filter((u) => u.name.toLowerCase().includes(q));
  }, [searchQuery, allUniversities]);

  const prefilledUniversity = useMemo(() => {
    if (loading || locations.length === 0 || dismissedPrefill) return null;

    const params = new URLSearchParams(location.search);
    const locationId = params.get("location_id");
    const universityId = params.get("university_id");

    if (!locationId || !universityId) return null;

    const matchedLocation = locations.find((loc) => String(loc.id) === String(locationId));
    if (!matchedLocation) return null;

    const matchedUniversity = (matchedLocation.universities || []).find(
      (uni) => String(uni.id) === String(universityId)
    );

    if (!matchedUniversity) return null;

    return {
      ...matchedUniversity,
      locationId: matchedLocation.id,
      locationName: matchedLocation.name,
    };
  }, [location.search, loading, locations, dismissedPrefill]);

  const effectiveSelectedUniversity = selectedUniversity || prefilledUniversity;

  const nearestBuilding = useMemo(() => {
    if (!effectiveSelectedUniversity) return null;
    return findNearestBuilding(effectiveSelectedUniversity, allBuildings);
  }, [effectiveSelectedUniversity, allBuildings]);

  const [distance, setDistance] = useState(null);

  useEffect(() => {
    const uni = effectiveSelectedUniversity;
    const bld = nearestBuilding;
    if (!uni?.latitude || !uni?.longitude || !bld?.latitude || !bld?.longitude) return;

    let cancelled = false;
    api
      .get(`/api/utils/distance?lat1=${uni.latitude}&lng1=${uni.longitude}&lat2=${bld.latitude}&lng2=${bld.longitude}`)
      .then((res) => {
        if (!cancelled) setDistance(res);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [effectiveSelectedUniversity, nearestBuilding]);

  const activeLocation = locations[activeLocationIndex];
  const tabUniversities = activeLocation?.universities || [];

  const handleSelectUniversity = (uni) => {
    setDismissedPrefill(true);
    setSelectedUniversity(uni);
    setSearchQuery("");
  };

  const handleClearUniversity = () => {
    setDismissedPrefill(true);
    setSelectedUniversity(null);
    setSelectedCapacity(null);
    setDistance(null);
  };

  const handleSubmit = () => {
    if (!effectiveSelectedUniversity || !selectedCapacity) return;
    const params = new URLSearchParams();
    if (nearestBuilding) params.set("building_id", nearestBuilding.id);
    params.set("capacity", String(selectedCapacity));
    params.set("discover", "1");
    navigate(`/rooms?${params.toString()}`);
  };

  const handleSearchSubmit = () => {
    if (searchResults?.length === 1) {
      handleSelectUniversity(searchResults[0]);
    }
  };

  useEffect(() => {
    if (location.hash === "#discover-section") {
      requestAnimationFrame(() => {
        const section = document.getElementById("discover-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, [location.hash]);

  if (loading) {
    return (
      <section id="discover-section" className="bg-white py-16">
        <div className="flex items-center justify-center">
          <CircleNotch className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  return (
    <section id="discover-section" className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6 md:px-12">

        {/* ── Question 1: University ── */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">
            BẠN ĐANG HỌC Ở ĐÂU?
          </h2>

          {/* Search bar — centered */}
          <div className="mx-auto mt-6 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={effectiveSelectedUniversity ? effectiveSelectedUniversity.name : searchQuery}
                onChange={(e) => {
                  if (effectiveSelectedUniversity) handleClearUniversity();
                  setSearchQuery(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder="Nhập tên trường để tìm phòng phù hợp nhất..."
                className={`w-full rounded-full border py-3 pl-10 pr-4 text-sm outline-none transition-colors ${
                  effectiveSelectedUniversity
                    ? "border-olive bg-olive/5 font-semibold text-primary"
                    : "border-muted/30 bg-white text-secondary focus:border-primary"
                }`}
              />
              {effectiveSelectedUniversity && (
                <CheckCircle className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" weight="fill" />
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="shrink-0 rounded-full bg-olive px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-tea"
            >
              TÌM PHÒNG
            </button>
          </div>
        </div>

        {/* Location tabs + university list (hidden when university selected) */}
        {!effectiveSelectedUniversity && (
          <div className="mt-10">
            {searchResults ? (
              <div>
                <p className="mb-4 text-sm text-muted">
                  {searchResults.length} kết quả cho &ldquo;{searchQuery}&rdquo;
                </p>
                {searchResults.length === 0 ? (
                  <p className="py-8 text-center text-secondary">Không tìm thấy trường đại học nào.</p>
                ) : (
                  <ul className="space-y-1">
                    {searchResults.map((uni) => (
                      <li key={uni.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectUniversity(uni)}
                          className="w-full rounded-lg px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5"
                        >
                          <span className="font-semibold text-primary">{uni.name}</span>
                          <span className="ml-2 text-muted">— {uni.locationName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1 border-b border-muted/20">
                  {locations.map((loc, i) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setActiveLocationIndex(i)}
                      className={`relative px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${
                        i === activeLocationIndex
                          ? "text-primary"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      {loc.name}
                      {i === activeLocationIndex && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-olive" />
                      )}
                    </button>
                  ))}
                </div>

                <ul className="mt-4 space-y-1">
                  {tabUniversities.length === 0 ? (
                    <li className="py-8 text-center text-secondary">Chưa có trường đại học nào.</li>
                  ) : (
                    tabUniversities.map((uni) => (
                      <li key={uni.id}>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectUniversity({
                              ...uni,
                              locationId: activeLocation.id,
                              locationName: activeLocation.name,
                            })
                          }
                          className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                        >
                          {uni.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Nearest building + map (shown when university selected) ── */}
        {effectiveSelectedUniversity && nearestBuilding && (
          <>
            <div className="my-12 border-t border-muted/15" />

            <div className="text-center">
              <p className="text-sm text-muted">Tòa nhà gần nhất với trường của bạn</p>
              <h2 className="mt-1 text-2xl font-bold text-primary md:text-3xl">
                {nearestBuilding.name}
              </h2>
              {distance && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-olive/10 px-3 py-1 text-sm font-semibold text-olive">
                    <NavigationArrow className="h-3.5 w-3.5" weight="fill" />
                    {distance.distance_km} km
                  </span>
                  {distance.duration_min != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      <Clock className="h-3.5 w-3.5" weight="fill" />
                      ~{distance.duration_min} phút
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Map */}
            {nearestBuilding.latitude && nearestBuilding.longitude &&
             effectiveSelectedUniversity?.latitude && effectiveSelectedUniversity?.longitude && (
             <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-muted/20">
                <MapView
                  center={[
                    (Number(effectiveSelectedUniversity.longitude) + Number(nearestBuilding.longitude)) / 2,
                    (Number(effectiveSelectedUniversity.latitude) + Number(nearestBuilding.latitude)) / 2,
                  ]}
                  zoom={13}
                  className="h-[280px] w-full"
                  theme="light"
                >
                  <MapMarker
                    longitude={Number(effectiveSelectedUniversity.longitude)}
                    latitude={Number(effectiveSelectedUniversity.latitude)}
                  >
                    <MarkerContent>
                      <div className="flex items-center justify-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg">
                          <GraduationCap className="h-4 w-4 text-white" weight="fill" />
                        </span>
                      </div>
                    </MarkerContent>
                  </MapMarker>

                  <MapMarker
                    longitude={Number(nearestBuilding.longitude)}
                    latitude={Number(nearestBuilding.latitude)}
                  >
                    <MarkerContent>
                      <div className="flex items-center justify-center">
                        <span className="absolute h-8 w-8 animate-ping rounded-full bg-olive/30" />
                        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-olive shadow-lg">
                          <Buildings className="h-4 w-4 text-primary" weight="fill" />
                        </span>
                      </div>
                    </MarkerContent>
                  </MapMarker>

                  <MapRoute
                    coordinates={[
                      [Number(effectiveSelectedUniversity.longitude), Number(effectiveSelectedUniversity.latitude)],
                      [Number(nearestBuilding.longitude), Number(nearestBuilding.latitude)],
                    ]}
                    color="#9FC490"
                    width={3}
                    dashArray={[6, 4]}
                    interactive={false}
                  />
                  <MapControls position="bottom-right" showZoom />
                </MapView>

                <div className="flex items-center justify-between gap-4 border-t border-muted/15 bg-white px-5 py-3">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                      <GraduationCap className="h-3 w-3 text-white" weight="fill" />
                    </span>
                    <span className="font-medium">{effectiveSelectedUniversity.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-olive">
                      <Buildings className="h-3 w-3 text-primary" weight="fill" />
                    </span>
                    <span className="font-medium">{nearestBuilding.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Question 2: Capacity ── */}
            <div className="my-12 border-t border-muted/15" />

            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary md:text-3xl">
                BẠN Ở MẤY NGƯỜI?
              </h2>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {CAPACITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedCapacity(opt.value)}
                    className={`rounded-full border-2 px-8 py-3 text-sm font-bold transition-all ${
                      selectedCapacity === opt.value
                        ? "border-olive bg-olive text-primary"
                        : "border-primary/20 bg-white text-primary hover:border-olive hover:bg-olive/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Submit button ── */}
            <div className={`mt-10 text-center transition-all duration-500 ${
              selectedCapacity ? "opacity-100" : "pointer-events-none opacity-0"
            }`}>
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-10 py-4 text-base font-bold text-white transition-colors hover:bg-primary/90"
              >
                Tìm phòng phù hợp với bạn
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}

        {/* ── Blurred capacity placeholder (when no university selected) ── */}
        {!effectiveSelectedUniversity && (
          <>
            <div className="my-12 border-t border-muted/15" />
            <div className="pointer-events-none text-center opacity-30 blur-[2px]">
              <h2 className="text-2xl font-bold text-primary md:text-3xl">
                BẠN Ở MẤY NGƯỜI?
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {CAPACITY_OPTIONS.map((opt) => (
                  <span
                    key={opt.value}
                    className="rounded-full border-2 border-primary/20 bg-white px-8 py-3 text-sm font-bold text-primary"
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
