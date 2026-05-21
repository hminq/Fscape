import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { motion as Motion } from "framer-motion";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { useLocations } from "@/contexts/LocationsContext";
import defaultBuildingImg from "@/assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

export default function LocationsSection() {
  const { locations, loading } = useLocations();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const activeLocation = locations[activeIndex];
  const buildings = activeLocation?.buildings || [];

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: "smooth" });
    }
  };

  return (
    <section id="hero-locations-section" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Heading */}
        <Motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary leading-tight tracking-tight">
            Phòng sẵn sàng
            <br />
            tại mọi thành phố lớn
          </h2>
          <p className="text-secondary text-base md:text-lg mt-4 max-w-lg mx-auto">
            Chúng tôi giúp việc chuyển đến trở nên đơn giản, an toàn và dễ
            dàng.
          </p>
        </Motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <CircleNotch className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : locations.length === 0 ? (
          <p className="text-center text-secondary py-20">
            Chưa có địa điểm nào.
          </p>
        ) : (
          <>
            {/* Location tabs + scroll arrow */}
            <Motion.div
              className="flex items-center justify-between mb-8"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-1 bg-primary/5 rounded-full p-1">
                {locations.map((loc, i) => (
                  <button
                    key={loc.id}
                    onClick={() => setActiveIndex(i)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${i === activeIndex
                        ? "bg-olive text-primary shadow-md"
                        : "text-secondary hover:text-primary"
                      }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>

              <button
                onClick={scrollRight}
                className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-tea hover:bg-olive text-primary transition-colors shadow-md"
                aria-label="Cuộn sang phải"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </Motion.div>

            {/* Scrollable cards */}
            {buildings.length === 0 ? (
              <p className="text-center text-secondary py-16">
                Chưa có toà nhà nào tại {activeLocation.name}.
              </p>
            ) : (
              <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
              >
                {buildings.map((building, i) => (
                  <Motion.div
                    key={building.id}
                    className="snap-start shrink-0 w-[280px] md:w-[320px] lg:w-[360px] group"
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <div
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/buildings/${building.id}`)}
                    >
                      <img
                        src={cdnUrl(building.thumbnail_url) || defaultBuildingImg}
                        alt={building.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = defaultBuildingImg;
                        }}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute bottom-0 left-0 right-0 bg-primary px-5 pt-4 pb-4 transition-all duration-300">
                        <p className="leading-tight">
                          <span className="font-display text-xl md:text-2xl text-tea tracking-wider">
                            FSCAPE
                          </span>
                          <span className="text-lg md:text-xl font-bold text-white ml-1.5">
                            {building.name.toUpperCase()}
                          </span>
                        </p>

                        {building.address && (
                          <p className="text-white/60 text-sm mt-1.5 line-clamp-1">
                            {building.address}
                          </p>
                        )}

                        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
                          <div className="overflow-hidden">
                            <div
                              className="flex gap-3 pt-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="bordered"
                                radius="full"
                                size="sm"
                                className="border-white/60 text-white font-semibold text-xs px-5 h-9 hover:bg-white hover:text-primary"
                                onPress={() => navigate(`/buildings/${building.id}`)}
                              >
                                Khám phá
                              </Button>
                              <Button
                                radius="full"
                                size="sm"
                                className="bg-olive text-primary font-semibold text-xs px-5 h-9 hover:bg-tea"
                                onPress={() => navigate(`/rooms?building_id=${building.id}`)}
                              >
                                Đặt phòng
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Motion.div>
                ))}
              </div>
            )}

          </>
        )}
      </div>
    </section>
  );
}
