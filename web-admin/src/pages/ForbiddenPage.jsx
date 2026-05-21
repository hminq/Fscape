import { useNavigate } from "react-router-dom";
import { ArrowLeft, SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";


export default function ForbiddenPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-8 text-center"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 93%) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Code + message */}
      <p className="text-7xl font-bold tracking-tight text-foreground">403</p>
      <h1 className="mt-3 text-xl font-semibold text-foreground">Truy cập bị từ chối</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Tài khoản của bạn không có quyền truy cập trang này.
        Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full shadow-sm hover:translate-x-[-2px] transition-transform">
          <ArrowLeft className="size-4" />
        </Button>
        <Button onClick={() => { logout(); navigate("/login", { replace: true }); }} className="gap-1.5">
          <SignOut className="size-4" /> Đăng xuất
        </Button>
      </div>
    </div>
  );
}
