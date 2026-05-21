import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, apiJson, apiRequest } from "@/lib/apiClient";
import { cdnUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, FloppyDisk, Eye, EyeSlash, ArrowLeft, Camera, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import defaultUserImg from "@/assets/default_user_img.jpg";

const NAME_REGEX = /^[\p{L}\s]+$/u;
const PHONE_REGEX = /^[0-9+ ]{8,20}$/;
const PROFILE_FIELD_LABELS = {
  first_name: "Họ",
  last_name: "Tên",
  phone: "Số điện thoại",
  avatar_url: "Ảnh đại diện",
};

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const buildAuthUser = (profileUser) => {
    const nextUser = profileUser || {};
    const fullName = [nextUser.first_name, nextUser.last_name].filter(Boolean).join(" ").trim();
    return {
      ...user,
      ...nextUser,
      name: fullName || nextUser.email || user?.email,
    };
  };

  // Profile form
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  // Password form
  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.get("/api/user-profile/me");
        setForm({
          first_name: data.data?.first_name || "",
          last_name: data.data?.last_name || "",
          phone: data.data?.phone || "",
          avatar_url: data.data?.avatar_url || "",
        });
      } catch {
        setProfileMsg({ type: "error", text: "Không thể tải thông tin hồ sơ" });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Save profile
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg(null);
    const validationErrors = validateProfileForm(form);
    setProfileErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const data = await apiJson("/api/user-profile/me", {
        method: "PUT",
        body: {
          first_name: form.first_name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          avatar_url: form.avatar_url || undefined,
        },
      });

      // Sync updated name to AuthContext + localStorage
      const u = data.data ?? {};
      login(token, buildAuthUser(u));
      setProfileErrors({});
      setForm((prev) => ({
        ...prev,
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        phone: u.phone || "",
        avatar_url: u.avatar_url || "",
      }));

      setProfileMsg({ type: "success", text: "Cập nhật hồ sơ thành công" });
    } catch (err) {
      const backendErrors = mapBackendProfileErrors(err);
      if (Object.keys(backendErrors).length > 0) {
        setProfileErrors(backendErrors);
      }
      setProfileMsg({ type: "error", text: err?.message || "Cập nhật thất bại" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      setProfileMsg({ type: "error", text: "Vui lòng chọn file ảnh hợp lệ" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: "error", text: "Ảnh không được vượt quá 5MB" });
      return;
    }

    setProfileMsg(null);
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const uploadRes = await apiRequest("/api/upload?type=avatar", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.message || "Upload ảnh thất bại");
      }
      const uploadedData = await uploadRes.json();
      const avatarUrl = uploadedData?.urls?.[0];
      if (!avatarUrl) throw new Error("Không nhận được URL ảnh sau khi upload");

      const data = await apiJson("/api/user-profile/me", {
        method: "PUT",
        body: { avatar_url: avatarUrl },
      });

      const u = data.data ?? {};
      login(token, buildAuthUser({ ...u, avatar_url: u.avatar_url || avatarUrl }));
      setForm((prev) => ({ ...prev, avatar_url: u.avatar_url || avatarUrl }));
      setProfileMsg({ type: "success", text: "Cập nhật ảnh đại diện thành công" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err?.message || "Cập nhật ảnh đại diện thất bại" });
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Change password
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.new_password.length < 8) {
      setPwMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự" });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: "error", text: "Mật khẩu xác nhận không khớp" });
      return;
    }

    setPwSaving(true);
    try {
      await apiJson("/api/auth/internal/change-password", {
        method: "POST",
        body: {
          old_password: pwForm.old_password,
          new_password: pwForm.new_password,
        },
      });
      setPwMsg({ type: "success", text: "Đổi mật khẩu thành công" });
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err?.message || "Đổi mật khẩu thất bại" });
    } finally {
      setPwSaving(false);
    }
  }

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handlePwChange(field, value) {
    setPwForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hồ sơ cá nhân</h1>
          <p className="text-sm text-muted-foreground">
            {user?.email} &middot; {ROLE_LABELS[user?.role] ?? user?.role}
          </p>
        </div>
      </div>

      {/* ── Avatar Section ── */}
      <div className="rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
          <Camera className="size-5 text-primary" weight="duotone" />
          <h2 className="text-sm font-semibold">Ảnh đại diện</h2>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={cdnUrl(form.avatar_url) || defaultUserImg}
              alt="Avatar"
              className="size-16 rounded-full border object-cover"
              onError={(e) => { e.target.src = defaultUserImg; }}
            />
            <div>
              <p className="text-sm font-medium text-foreground">Ảnh hồ sơ</p>
              <p className="text-xs text-muted-foreground">PNG/JPG/JPEG, tối đa 5MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button variant="outline" asChild disabled={uploadingAvatar}>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                {uploadingAvatar ? (
                  <>
                    <CircleNotch className="size-4 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />
                    Tải ảnh mới
                  </>
                )}
              </label>
            </Button>
          </div>
        </div>
        {profileErrors.avatar_url && (
          <div className="px-6 pb-4">
            <p className="text-xs text-destructive">{profileErrors.avatar_url}</p>
          </div>
        )}
      </div>

      {/* Profile message */}
      {profileMsg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            profileMsg.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {profileMsg.text}
        </div>
      )}

      {/* ── Profile Info Section ── */}
      <form onSubmit={handleSaveProfile} className="rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
          <User className="size-5 text-primary" weight="duotone" />
          <h2 className="text-sm font-semibold">Thông tin cơ bản</h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className={profileErrors.first_name ? "text-destructive" : ""}>Họ</Label>
              <Input
                id="first_name"
                placeholder="Nguyễn"
                value={form.first_name}
                onChange={(e) => handleFormChange("first_name", e.target.value)}
                className={profileErrors.first_name ? "border-destructive focus-visible:ring-destructive/20" : ""}
              />
              {profileErrors.first_name && <p className="text-xs text-destructive">{profileErrors.first_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className={profileErrors.last_name ? "text-destructive" : ""}>Tên</Label>
              <Input
                id="last_name"
                placeholder="Văn A"
                value={form.last_name}
                onChange={(e) => handleFormChange("last_name", e.target.value)}
                className={profileErrors.last_name ? "border-destructive focus-visible:ring-destructive/20" : ""}
              />
              {profileErrors.last_name && <p className="text-xs text-destructive">{profileErrors.last_name}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className={profileErrors.phone ? "text-destructive" : ""}>Số điện thoại</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0901234567"
              value={form.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              className={profileErrors.phone ? "border-destructive focus-visible:ring-destructive/20" : ""}
            />
            {profileErrors.phone && <p className="text-xs text-destructive">{profileErrors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted/50" />
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <FloppyDisk className="size-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      {/* ── Change Password Section ── */}
      <form onSubmit={handleChangePassword} className="rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-4">
          <Lock className="size-5 text-primary" weight="duotone" />
          <h2 className="text-sm font-semibold">Đổi mật khẩu</h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Old password */}
          <div className="space-y-1.5">
            <Label htmlFor="old_password">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                id="old_password"
                type={showOld ? "text" : "password"}
                placeholder="••••••••"
                value={pwForm.old_password}
                onChange={(e) => handlePwChange("old_password", e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showOld ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new_password">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNew ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự, có ký tự đặc biệt"
                value={pwForm.new_password}
                onChange={(e) => handlePwChange("new_password", e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={pwForm.confirm_password}
                onChange={(e) => handlePwChange("confirm_password", e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Password message */}
          {pwMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                pwMsg.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {pwMsg.text}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-3">
          <button
            type="submit"
            disabled={pwSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Lock className="size-4" />
            {pwSaving ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}

function validateProfileForm(form) {
  const errors = {};
  const firstName = form.first_name.trim();
  const lastName = form.last_name.trim();
  const phone = form.phone.trim();

  if (firstName) {
    if (firstName.length > 100) errors.first_name = "Họ tối đa 100 ký tự";
    else if (!NAME_REGEX.test(firstName)) errors.first_name = "Họ chỉ được chứa chữ cái và khoảng trắng";
  }
  if (lastName) {
    if (lastName.length > 100) errors.last_name = "Tên tối đa 100 ký tự";
    else if (!NAME_REGEX.test(lastName)) errors.last_name = "Tên chỉ được chứa chữ cái và khoảng trắng";
  }
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.phone = "Số điện thoại không hợp lệ";
  }

  return errors;
}

function mapBackendProfileErrors(err) {
  const apiErrors = err?.data?.errors;
  if (!Array.isArray(apiErrors) || apiErrors.length === 0) return {};
  const mapped = {};

  for (const item of apiErrors) {
    const path = item?.path;
    const msg = item?.msg;
    if (!path || !msg) continue;
    if (PROFILE_FIELD_LABELS[path] && !mapped[path]) {
      mapped[path] = msg;
    }
  }

  return mapped;
}
