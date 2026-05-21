import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ContactDialog from "@/components/ContactDialog";
import fscapeLogo from "@/assets/fscape-logo.svg";

const ROLE_HOME = {
  ADMIN: "/",
  BUILDING_MANAGER: "/building-manager",
};

function Blob({ style }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(60px)",
        opacity: 0.35,
        ...style,
      }}
    />
  );
}

// -- Eye icon for password toggle --
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    let hasError = false;
    const newFieldErrors = { email: "", password: "" };
    
    if (!email.trim()) {
      newFieldErrors.email = "Vui lòng nhập email";
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newFieldErrors.email = "Email không hợp lệ.";
      hasError = true;
    }
    
    if (!password) {
      newFieldErrors.password = "Vui lòng nhập mật khẩu";
      hasError = true;
    }

    setFieldErrors(newFieldErrors);
    if (hasError) return;

    setError("");
    setLoading(true);
    try {
      const data = await apiJson("/api/auth/internal/login", {
        method: "POST",
        withAuth: false,
        body: { email: email.trim(), password },
      });

      const u = data.user ?? {};
      const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();

      login(data.access_token, {
        id: u.id,
        email: u.email ?? email,
        role: u.role,
        name: fullName || u.email || email,
        building_id: u.building_id || null,
      });

      navigate(ROLE_HOME[u.role] ?? "/");
    } catch (err) {
      if (!err.status) {
        setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
      } else if (err.status >= 500) {
        setError("Lỗi hệ thống máy chủ. Vui lòng thử lại sau.");
      } else {
        setError("Tài khoản hoặc mật khẩu không chính xác.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div
        style={{
          flex: "0 0 48%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
          background: "linear-gradient(145deg, #011936 0%, #013a6b 45%, #0a5296 100%)",
        }}
        className="login-left-panel"
      >
        {/* Animated blobs */}
        <Blob style={{ width: 420, height: 420, background: "oklch(0.68 0.18 195)", top: -80, right: -100 }} />
        <Blob style={{ width: 280, height: 280, background: "oklch(0.55 0.20 254)", bottom: 120, left: -60 }} />
        <Blob style={{ width: 200, height: 200, background: "oklch(0.78 0.14 142)", bottom: -40, right: 80 }} />

        {/* Grid dots overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            zIndex: 0,
          }}
        />

        {/* Top: Brand */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src={fscapeLogo} alt="FScape" style={{ width: 46, height: 46, borderRadius: 12 }} />
            <span style={{ color: "white", fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.01em" }}>
              FScape
            </span>
          </div>
        </div>

        {/* Middle: Main copy */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Hệ thống quản lý
          </p>
          <h1
            style={{
              color: "white",
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Quản lý nhà ở
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, oklch(0.78 0.16 195), oklch(0.80 0.14 142))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              chuyên biệt cho sinh viên
            </span>
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              margin: "1.25rem 0 0",
              maxWidth: 360,
            }}
          >
            Nền tảng quản trị tập trung cho hệ thống phòng ở chuyên biệt FScape - phân quyền, thống kê và vận hành theo thời gian thực.
          </p>
        </div>

        {/* Bottom: Stats */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "2rem" }}>
          {[
            { label: "Trường đại học", value: "12+" },
            { label: "Phòng học", value: "320+" },
            { label: "Lượt đặt phòng", value: "5.8K" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ color: "white", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--background)",
          position: "relative",
        }}
      >
        {/* Subtle top-right decoration */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 320,
            height: 320,
            background: "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 92%) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

          {/* Welcome */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--foreground)",
                margin: 0,
              }}
            >
              Đăng nhập
            </h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Chào mừng trở lại! Vui lòng nhập thông tin tài khoản.
            </p>
          </div>

          {/* Form */}
          <form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Email field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Label htmlFor="email" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Địa chỉ email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@fscape.vn"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                style={{ height: 44, borderColor: fieldErrors.email ? "var(--destructive)" : undefined }}
              />
              {fieldErrors.email && (
                <span style={{ color: "var(--destructive)", fontSize: "0.8rem", fontWeight: 500, marginTop: "0.25rem" }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label htmlFor="password" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Mật khẩu
                </Label>
              </div>
              <div style={{ position: "relative" }}>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  style={{
                    height: 44,
                    paddingRight: "2.75rem",
                    borderColor: fieldErrors.password ? "var(--destructive)" : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {fieldErrors.password && (
                <span style={{ color: "var(--destructive)", fontSize: "0.8rem", fontWeight: 500, marginTop: "0.25rem" }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "color-mix(in oklch, var(--destructive), transparent 90%)",
                  border: "1px solid color-mix(in oklch, var(--destructive), transparent 70%)",
                  color: "var(--destructive)",
                  borderRadius: 8,
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46,
                width: "100%",
                background: loading
                  ? "color-mix(in oklch, var(--primary), transparent 40%)"
                  : "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                marginTop: "0.25rem",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading ? (
                <>
                  <svg
                    style={{ animation: "spin 0.8s linear infinite" }}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Đang xử lý…
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            style={{
              marginTop: "2rem",
              color: "var(--muted-foreground)",
              fontSize: "0.82rem",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Gặp sự cố?{" "}
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--primary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: 0,
                textDecoration: "underline",
                textDecorationColor: "transparent",
                transition: "text-decoration-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = "var(--primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = "transparent"; }}
            >
              Liên hệ hỗ trợ
            </button>
          </p>

          <p
            style={{
              marginTop: "2.5rem",
              color: "var(--muted-foreground)",
              fontSize: "0.75rem",
              textAlign: "center",
              opacity: 0.6,
            }}
          >
            © 2026 FScape. Hệ thống dành riêng cho quản trị viên.
          </p>
        </div>
      </div>

      {/* Responsive: hide left panel on small screens */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
        }
      `}</style>

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
