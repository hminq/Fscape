import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignOut, User, ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { cdnUrl } from "@/lib/utils";
import defaultUserImg from "@/assets/default_user_img.jpg";

export default function UserMenu({ profilePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const avatarSrc = user?.avatar_url
    ? `${cdnUrl(user.avatar_url)}?v=${encodeURIComponent(user.avatar_url)}`
    : defaultUserImg;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg transition-opacity hover:opacity-80"
      >
        <img
          src={avatarSrc}
          alt={user?.name}
          className="size-9 rounded-lg object-cover ring-1 ring-border"
          onError={(e) => { e.currentTarget.src = defaultUserImg; }}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-popover shadow-lg">
          {/* User info card */}
          <div className="flex items-center gap-3 px-4 py-4">
            <img
              src={avatarSrc}
              alt={user?.name}
              className="size-11 rounded-lg object-cover shrink-0 ring-1 ring-border"
              onError={(e) => { e.currentTarget.src = defaultUserImg; }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Role info */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>{ROLE_LABELS[user?.role] ?? user?.role}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border p-1">
            <button
              onClick={() => { setOpen(false); navigate(profilePath); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <User className="size-4" />
              Hồ sơ cá nhân
            </button>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <SignOut className="size-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
