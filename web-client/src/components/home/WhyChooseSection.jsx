import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { motion as Motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import whyChooseImg from "../../assets/why_choose_fscape_img.jpg";

export default function WhyChooseSection() {
  const navigate = useNavigate();
  return (
    <section className="relative h-[100vh] min-h-[700px]">
      {/* Background image */}
      <div className="sticky top-0 h-screen overflow-hidden">
        <img
          src={whyChooseImg}
          alt="Tòa nhà FScape"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12">
            <Motion.div
              className="max-w-xl"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-200px" }}
              transition={{ duration: 0.7 }}
            >
              {/* Title block */}
              <div className="bg-primary inline-block px-6 py-4 mb-0">
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                  Tại sao chọn
                  <br />
                  <span className="font-display text-tea tracking-wider">
                    FSCAPE
                  </span>
                  ?
                </h2>
              </div>

              {/* Subtitle */}
              <div className="bg-tea px-6 py-3">
                <p className="text-primary text-sm md:text-base font-bold uppercase tracking-wide">
                  Nhà ở sinh viên đáng tin cậy nhất Việt Nam, xây dựng vì sự
                  thoải mái, kết nối và cộng đồng.
                </p>
              </div>

              {/* Description card */}
              <div className="bg-white px-6 py-6">
                <p className="text-secondary text-sm md:text-base leading-relaxed">
                  Tại FScape, chúng tôi giúp cuộc sống sinh viên trở nên đơn
                  giản và đầy cảm hứng. Tận hưởng phòng đầy đủ nội thất, bao
                  gồm mọi hóa đơn, Wi-Fi tốc độ cao và vị trí gần trường đại
                  học. Tham gia cộng đồng sôi động với các sự kiện xã hội,
                  không gian học tập và hỗ trợ 24/7.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <Button
                    radius="full"
                    size="lg"
                    endContent={<ArrowRight className="w-4 h-4" />}
                    className="bg-olive text-primary font-bold text-sm px-8 h-11"
                    onPress={() => {
                      const el = document.getElementById("discover-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Tìm phòng phù hợp
                  </Button>
                  <Button
                    variant="bordered"
                    radius="full"
                    size="lg"
                    className="border-primary text-primary font-semibold text-sm px-8 h-11 hover:bg-primary hover:text-white transition-colors"
                    onPress={() => navigate("/rooms")}
                  >
                    Đặt phòng ngay
                  </Button>
                </div>
              </div>
            </Motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
