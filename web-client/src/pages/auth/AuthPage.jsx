import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { House, Users, Lock, ArrowLeft } from "@phosphor-icons/react";
import fscapeLogoFull from "../../assets/fscape-logo-full.svg";
import loginImg from "../../assets/login_img.jpg";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

const features = [
  { icon: House, title: "Quản Lý Phòng Dễ Dàng", desc: "Tìm kiếm, đặt phòng và quản lý nhà ở sinh viên mọi lúc, mọi nơi" },
  { icon: Users, title: "Kết Nối Bạn Cùng Phòng", desc: "Trò chuyện với bạn cùng phòng tiềm năng và xây dựng cộng đồng" },
  { icon: Lock, title: "Thanh Toán An Toàn", desc: "Xử lý tiền thuê và tiền đặt cọc an toàn thông qua nền tảng" },
];

const slideLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const slideRight = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: 0.1 },
  },
};

const drawLine = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.8, ease: "easeOut", delay: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.4 + i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function AuthPage({ initialTab = "login" }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary via-primary/95 to-secondary">
      {/* Left Panel */}
      <Motion.div
        className="hidden lg:flex flex-col w-1/2 p-12 xl:p-16 justify-center"
        initial="hidden"
        animate="visible"
        variants={slideLeft}
      >
        <div className="max-w-md mx-auto w-full">
          <Motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold mb-8 transition-colors">
              <ArrowLeft className="size-4" /> Về trang chủ
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <img src={fscapeLogoFull} alt="FScape" className="h-12" />
            </div>
            <p className="text-lg text-tea leading-relaxed">
              Nền tảng hiện đại để quản lý<br />nhà ở sinh viên một cách liền mạch.
            </p>
          </Motion.div>

          <Motion.div
            className="rounded-2xl overflow-hidden shadow-2xl mt-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <img
              src={loginImg}
              alt="Student accommodation"
              className="w-full h-48 object-cover"
            />
          </Motion.div>

          <Motion.div className="flex flex-col gap-3 mt-8" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-olive shrink-0">
                  <f.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </Motion.div>

          <Motion.div className="flex items-center gap-7 flex-wrap mt-8" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <div className="flex items-center">
              <div className="flex -space-x-2.5">
                {["#9FC490", "#82A3A1", "#C0DFA1", "#465362"].map((bg, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold text-white" style={{ background: bg }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-white">10,000+</p>
                <p className="text-[11px] text-white/40">sinh viên đã tham gia</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-amber-400 text-sm">★</span>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-white">4.8/5</p>
                <p className="text-[11px] text-white/40">2,500+ nhận xét</p>
              </div>
            </div>
          </Motion.div>
        </div>
      </Motion.div>

      {/* Center divider */}
      <div className="hidden lg:flex items-center py-16">
        <Motion.div
          className="w-px h-full bg-gradient-to-b from-transparent via-olive/40 to-transparent origin-top"
          initial="hidden"
          animate="visible"
          variants={drawLine}
        />
      </div>

      {/* Right Panel */}
      <Motion.div
        className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-10 xl:p-16"
        initial="hidden"
        animate="visible"
        variants={slideRight}
      >
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <img src={fscapeLogoFull} alt="FScape" className="h-10" />
          </div>

          <Motion.div
            className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          >
            <h2 className="text-center text-2xl font-bold text-primary mb-1">
              {activeTab === "login" ? "Chào mừng trở lại" : activeTab === "signup" ? "Tạo tài khoản mới" : "Quên mật khẩu"}
            </h2>
            <p className="text-center text-sm text-muted mb-6">
              {activeTab === "login"
                ? "Đăng nhập để tiếp tục với FScape"
                : activeTab === "signup"
                ? "Tham gia cộng đồng sinh viên FScape"
                : "Nhập email của bạn để khôi phục mật khẩu"}
            </p>

            {/* Tab switcher */}
            {activeTab !== "forgot" && (
              <div className="flex bg-primary/5 rounded-xl p-1 gap-1 mb-6">
                {[
                  { key: "login", label: "Đăng Nhập" },
                  { key: "signup", label: "Đăng Ký" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key
                        ? "bg-white text-primary shadow-md"
                        : "text-muted hover:text-secondary"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "login" && <LoginForm />}
            {activeTab === "signup" && <SignUpForm />}
            {activeTab === "forgot" && <ForgotPasswordForm />}
          </Motion.div>
        </div>
      </Motion.div>
    </div>
  );
}
