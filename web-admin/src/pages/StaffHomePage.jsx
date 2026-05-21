export default function StaffHomePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-8 text-center"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 93%) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <p className="text-sm font-medium text-muted-foreground mb-2">Bạn đang đăng nhập với vai trò</p>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">STAFF</h1>
    </div>
  );
}

