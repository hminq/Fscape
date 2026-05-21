import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { motion as Motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowRight, Buildings, List, MapPinLine, X } from "@phosphor-icons/react";
import { useLocations } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { cdnUrl } from "@/lib/utils";
import fscapeLogoFull from "../../assets/fscape-logo-full.svg";
import defaultAvatar from "../../assets/default_room_img.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

const HERO_VIDEO_KEY = "videos/video.mp4";
const heroVideoSrc = import.meta.env.DEV ? "/video.mp4" : cdnUrl(HERO_VIDEO_KEY) || "/video.mp4";

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

export default function HeroSection() {
  const videoRef = useRef(null);
  const heroRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const { locations } = useLocations();
  const { isLoggedIn, user } = useAuth();
  const [openLocId, setOpenLocId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const activeLoc = locations.find((item) => item.id === openLocId);
  const heroLocations = useMemo(() => locations.slice(0, 4), [locations]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const playVideo = async () => {
      try {
        await videoElement.play();
      } catch {
        // Browser autoplay restrictions will fall back to the poster frame.
      }
    };

    playVideo();
  }, []);

  useEffect(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        document.body.classList.toggle("home-hero-active", entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(heroElement);
    return () => {
      observer.disconnect();
      document.body.classList.remove("home-hero-active");
    };
  }, []);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleBuildingSelect = (buildingId) => {
    setOpenLocId(null);
    setMobileMenuOpen(false);
    navigate(`/buildings/${buildingId}`);
  };

  const handleUniversitySelect = (universityId, locationId) => {
    setOpenLocId(null);
    setMobileMenuOpen(false);
    navigate(`/?location_id=${locationId}&university_id=${universityId}#discover-section`);

    requestAnimationFrame(() => {
      const section = document.getElementById("discover-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  return (
    <section ref={heroRef} className="relative min-h-[92vh] overflow-hidden bg-primary">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"}`}
          onLoadedData={() => setVideoReady(true)}
        >
          <source src={heroVideoSrc} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,25,54,0.72)_0%,rgba(1,25,54,0.42)_36%,rgba(1,25,54,0.12)_68%,rgba(1,25,54,0.3)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_72%,rgba(159,196,144,0.12),transparent_38%),radial-gradient(circle_at_76%_18%,rgba(192,223,161,0.08),transparent_28%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-white/4" />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pt-5 md:px-12 md:pt-6">
        <div className="rounded-full border border-white/16 bg-white/[0.05] px-4 py-3 shadow-[0_20px_60px_rgba(1,25,54,0.18)] backdrop-blur-lg">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="shrink-0">
              <img src={fscapeLogoFull} alt="FScape" className="h-10 md:h-11" />
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {heroLocations.map((loc) => {
                const isActive = openLocId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setOpenLocId(isActive ? null : loc.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/72 hover:text-white"
                      }`}
                  >
                    {loc.name}
                    <TriangleIcon up={isActive} className="h-2.5 w-2.5 text-tea" />
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="outline-none transition-transform hover:scale-105 active:scale-95"
                >
                  <img
                    src={cdnUrl(user?.avatar_url) || defaultAvatar}
                    alt="Ảnh đại diện"
                    className="size-10 rounded-full border border-white/60 bg-white object-cover shadow-sm"
                  />
                </button>
              ) : (
                <Button
                  variant="bordered"
                  radius="full"
                  className="h-10 border-white/28 bg-white/[0.06] px-6 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/10"
                  onPress={() => navigate("/login")}
                >
                  Đăng nhập
                </Button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex size-11 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] text-white backdrop-blur-md lg:hidden"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 space-y-4 border-t border-white/14 pt-4 lg:hidden">
              <div className="grid gap-2">
                {heroLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setOpenLocId(openLocId === loc.id ? null : loc.id)}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.14em] text-white/80"
                  >
                    {loc.name}
                    <TriangleIcon up={openLocId === loc.id} className="h-2.5 w-2.5 text-tea" />
                  </button>
                ))}
              </div>
              <Button
                radius="full"
                className="h-11 w-full bg-white/[0.08] text-sm font-semibold text-white ring-1 ring-white/24 backdrop-blur-md"
                onPress={() => scrollToSection("discover-section")}
              >
                Đặt phòng ngay
              </Button>
            </div>
          )}

        </div>

        {activeLoc && (
          <div className="mt-4 rounded-[28px] border border-white/12 bg-primary/44 p-5 shadow-[0_24px_72px_rgba(1,25,54,0.24)] backdrop-blur-lg">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <p className="mb-4 inline-block bg-olive px-2.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  Cơ sở tại {activeLoc.name}
                </p>
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {(activeLoc.buildings || []).slice(0, 6).map((building) => (
                    <button
                      key={building.id}
                      type="button"
                      onClick={() => handleBuildingSelect(building.id)}
                      className="w-fit text-left text-sm text-white/78 transition-colors hover:text-white"
                    >
                      {building.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-4 inline-block bg-olive px-2.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  Trường đại học
                </p>
                <div className="flex flex-col gap-3">
                  {(activeLoc.universities || []).slice(0, 5).map((university) => (
                    <button
                      key={university.id}
                      type="button"
                      onClick={() => handleUniversitySelect(university.id, activeLoc.id)}
                      className="w-fit text-left text-sm text-white/78 transition-colors hover:text-white"
                    >
                      {university.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 flex min-h-[92vh] items-end pb-14 md:pb-18">
        <div className="mx-auto flex w-full max-w-7xl items-end px-6 pt-32 md:px-12 md:pt-36">
          <div className="max-w-2xl">
            <Motion.p
              className="mb-4 text-sm font-semibold uppercase tracking-[0.32em] text-tea/95"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              Không gian sống cho sinh viên hiện đại
            </Motion.p>

            <Motion.h1
              className="mb-5 text-5xl font-bold leading-[0.95] text-white md:text-7xl"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
            >
              Nơi mọi trải nghiệm
              <br />
              sinh viên bắt đầu
            </Motion.h1>

            <Motion.p
              className="mb-8 max-w-xl text-base leading-7 text-white/78 md:text-lg"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
            >
              Tìm phòng gần trường với trải nghiệm thuê ở rõ ràng, thuận tiện và
              đúng nhu cầu sinh viên.
            </Motion.p>

            <Motion.div
              className="flex flex-col gap-3 sm:flex-row"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
            >
              <Button
                radius="full"
                size="lg"
                endContent={<ArrowRight className="w-5 h-5" />}
                className="h-12 bg-olive/88 px-9 text-base font-bold text-primary shadow-[0_18px_42px_rgba(1,25,54,0.22)] backdrop-blur-md"
                onPress={() => {
                  const section = document.getElementById("discover-section");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Khám phá phòng
              </Button>
              <Button
                radius="full"
                size="lg"
                variant="bordered"
                className="h-12 border-white/24 bg-white/[0.06] px-9 text-base font-semibold text-white backdrop-blur-md hover:bg-white/10"
                onPress={() => {
                  const section = document.getElementById("hero-locations-section");
                  if (section) section.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Xem tòa nhà
              </Button>
            </Motion.div>

            <Motion.div
              className="mt-10 grid max-w-xl grid-cols-1 gap-3 border-t border-white/16 pt-5 text-white/78 sm:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={4}
            >
              <div className="flex items-center gap-2.5 text-sm">
                <MapPinLine className="h-5 w-5 text-tea" />
                Gần trường
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Buildings className="h-5 w-5 text-tea" />
                Tòa nhà chọn lọc
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <ArrowDown className="h-5 w-5 text-tea" />
                Xem thêm bên dưới
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
