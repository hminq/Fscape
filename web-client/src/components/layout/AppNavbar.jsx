import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { useLocations } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import fscapeLogoFull from "../../assets/fscape-logo-full.svg";
import defaultAvatar from "../../assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

function TriangleIcon({ up, className }) {
  return (
    <svg
      viewBox="0 0 10 6"
      className={className}
      style={{
        transform: up ? "rotate(180deg)" : undefined,
        transition: "transform 0.2s ease",
      }}
    >
      <path d="M0 0L5 6L10 0H0Z" fill="currentColor" />
    </svg>
  );
}

export default function AppNavbar() {
  const { locations } = useLocations();
  const { isLoggedIn, user } = useAuth();
  const [openLocId, setOpenLocId] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!openLocId) return;
    function handleClick(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenLocId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openLocId]);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 60;
      setScrolled(isScrolled);
      if (isScrolled) setOpenLocId(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeLoc = locations.find((l) => l.id === openLocId);
  const currentBuildingId = useMemo(() => {
    const match = location.pathname.match(/^\/buildings\/([^/]+)/);
    return match?.[1] || null;
  }, [location.pathname]);

  const currentBuildingName = useMemo(() => {
    if (!currentBuildingId) return "";
    for (const loc of locations) {
      const found = (loc?.buildings || []).find((b) => String(b?.id) === String(currentBuildingId));
      if (found?.name) return found.name;
    }
    return "";
  }, [locations, currentBuildingId]);
  const [heroPassed, setHeroPassed] = useState(location.pathname !== "/");
  const isHomeRoute = location.pathname === "/";

  useEffect(() => {
    if (!isHomeRoute) return;

    const onHeroScroll = () => {
      const threshold = Math.max(window.innerHeight * 0.72, 520);
      setHeroPassed(window.scrollY >= threshold);
    };

    onHeroScroll();
    window.addEventListener("scroll", onHeroScroll, { passive: true });
    window.addEventListener("resize", onHeroScroll);
    return () => {
      window.removeEventListener("scroll", onHeroScroll);
      window.removeEventListener("resize", onHeroScroll);
    };
  }, [isHomeRoute]);

  const isHomeHeroState = isHomeRoute && !heroPassed;

  const handleBuildingSelect = (buildingId) => {
    setOpenLocId(null);
    navigate(`/buildings/${buildingId}`);
  };

  const handleUniversitySelect = (universityId, locationId) => {
    setOpenLocId(null);

    if (location.pathname === "/") {
      navigate(`/?location_id=${locationId}&university_id=${universityId}#discover-section`);
      requestAnimationFrame(() => {
        const section = document.getElementById("discover-section");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      return;
    }

    navigate(`/?location_id=${locationId}&university_id=${universityId}#discover-section`);
  };

  return (
    <div
      ref={navRef}
      className={`${isHomeRoute ? "fixed inset-x-0 top-0" : "sticky top-0"} z-50 transition-all duration-500 ${isHomeHeroState
        ? "pointer-events-none -translate-y-full opacity-0"
        : "pointer-events-auto translate-y-0 opacity-100"
        }`}
    >
      <nav
        className={`transition-all duration-500 ${isHomeHeroState
          ? "bg-transparent text-white"
          : "bg-primary text-white shadow-sm"
          }`}
      >
        <div
          className={`flex items-center border-b px-5 md:px-10 py-3 transition-all duration-500 ${isHomeHeroState ? "border-white/18" : "border-white/8"
            } ${scrolled ? "justify-center" : ""
            }`}
        >
          {/* Left group */}
          <div
            className={`flex items-center gap-6 transition-all duration-500 ${scrolled ? "flex-none" : "flex-1 min-w-0"
              }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <img src={fscapeLogoFull} alt="FScape" className="h-10" />
              {scrolled && currentBuildingName && (
                <>
                  <span className="mx-1 h-5 w-px bg-white/35" />
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/80">
                    {currentBuildingName}
                  </span>
                </>
              )}
            </Link>

            {/* Locations — hidden when scrolled */}
            <div
              className={`hidden lg:flex items-center gap-1 transition-all duration-500 ${scrolled
                ? "opacity-0 max-w-0 overflow-hidden pointer-events-none"
                : "opacity-100 max-w-2xl"
                }`}
            >
              {locations.map((loc) => {
                const isActive = openLocId === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setOpenLocId(isActive ? null : loc.id)}
                    className={`nav-underline flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide px-3 pb-1 pt-0.5 transition-colors whitespace-nowrap ${isActive
                      ? "text-white"
                      : "text-white/75 hover:text-white"
                      }`}
                  >
                    {loc.name}
                    <TriangleIcon
                      up={isActive}
                      className="w-2.5 h-2.5 text-olive"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right group — hidden when scrolled */}
          <div
            className={`flex items-center gap-3 shrink-0 transition-all duration-500 ${scrolled
              ? "opacity-0 max-w-0 overflow-hidden pointer-events-none"
              : "opacity-100 max-w-xs"
              }`}
          >
            {isLoggedIn ? (
              <button
                onClick={() => navigate("/profile")}
                className="outline-none transition-transform hover:scale-105 active:scale-95 shrink-0"
              >
                <img
                  src={cdnUrl(user?.avatar_url) || defaultAvatar}
                  alt="Ảnh đại diện"
                  className="size-10 rounded-full border border-white/60 object-cover shadow-sm bg-white"
                />
              </button>
            ) : (
              <>
                <Button
                  radius="full"
                  className={`${isHomeHeroState
                    ? "bg-white/10 text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/16"
                    : "bg-olive text-primary"
                    } font-semibold text-sm px-6 h-10`}
                  onPress={() => {
                    const section = document.getElementById("discover-section");
                    if (section) {
                      section.scrollIntoView({ behavior: "smooth" });
                    } else {
                      navigate("/");
                    }
                  }}
                >
                  Đặt phòng
                </Button>
                <Button
                  variant="bordered"
                  radius="full"
                  className={`font-semibold text-sm px-6 h-10 ${isHomeHeroState
                    ? "border-white/35 bg-white/6 text-white backdrop-blur-md hover:bg-white/10"
                    : "border-white/60 text-white"
                    }`}
                  onPress={() => navigate("/login")}
                >
                  Đăng nhập
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mega-menu */}
      {activeLoc && (
        <div className={`border-t ${isHomeHeroState
          ? "bg-primary/92 border-white/12 backdrop-blur-xl"
          : "bg-primary border-white/10"
          }`}>
          <div className="max-w-6xl mx-auto px-10 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Buildings */}
              <div className="md:col-span-2">
                <p className="inline-block text-sm font-bold uppercase tracking-wider text-primary bg-olive px-2 py-0.5 mb-5">
                  FSCAPE {activeLoc.name.toUpperCase()}
                </p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 justify-items-start">
                  {(activeLoc.buildings || []).slice(0, 5).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBuildingSelect(b.id)}
                      className="w-fit text-left text-white/75 hover:text-white text-sm transition-colors"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Universities */}
              <div>
                <p className="inline-block text-sm font-bold uppercase tracking-wider text-primary bg-olive px-2 py-0.5 mb-5">
                  TRƯỜNG ĐẠI HỌC TẠI {activeLoc.name.toUpperCase()}
                </p>
                <div className="flex flex-col gap-3">
                  {(activeLoc.universities || []).slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleUniversitySelect(u.id, activeLoc.id)}
                      className="w-fit text-left text-white/75 hover:text-white text-sm transition-colors"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Button
                variant="bordered"
                radius="full"
                className="border-white/60 text-white font-semibold uppercase text-sm px-8 h-10"
                onPress={() => {
                  const firstBuilding = (activeLoc.buildings || [])[0];
                  if (firstBuilding) {
                    setOpenLocId(null);
                    navigate(`/rooms?building_id=${firstBuilding.id}`);
                  }
                }}
              >
                Xem tất cả tại {activeLoc.name}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
