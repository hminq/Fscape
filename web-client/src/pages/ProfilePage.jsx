import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import {
  Camera,
  CircleNotch,
  ArrowLeft,
  User,
  IdentificationCard,
  Phone,
  CalendarDots,
  MapPinLine,
  UsersThree,
  Bed,
  Receipt,
  FileText,
  HouseLine,
  SignOut,
} from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import Footer from "@/components/layout/Footer";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import defaultAvatar from "../assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

const GENDER_OPTIONS = [
  { key: "MALE", label: "Nam" },
  { key: "FEMALE", label: "Nữ" },
  { key: "OTHER", label: "Khác" },
];
const PHONE_REGEX = /^[0-9+ ]{8,20}$/;
const NAME_REGEX = /^[\p{L}\s]+$/u;
const FIELD_NAME_MAP = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  gender: "gender",
  date_of_birth: "dateOfBirth",
  permanent_address: "permanentAddress",
  emergency_contact_name: "emergencyContactName",
  emergency_contact_phone: "emergencyContactPhone",
};
const PROFILE_NAV_LINKS = [
  { label: "Hồ sơ của tôi", path: "/profile", icon: IdentificationCard },
  { label: "Phòng của tôi", path: "/my-rooms", icon: HouseLine },
  { label: "Đơn đặt phòng", path: "/my-bookings", icon: Bed },
  { label: "Hóa đơn", path: "/my-invoices", icon: Receipt },
  { label: "Hợp đồng", path: "/my-contracts", icon: FileText },
];

function ProfileContent() {
  const navigate = useNavigate();
  const { user, login, logout, token, isLoggedIn } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/user-profile/me");
        const data = res.data;
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || "");
        const p = data.profile;
        if (p) {
          setGender(p.gender || "");
          setDateOfBirth(p.date_of_birth || "");
          setPermanentAddress(p.permanent_address || "");
          setEmergencyContactName(p.emergency_contact_name || "");
          setEmergencyContactPhone(p.emergency_contact_phone || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isLoggedIn]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.upload("/api/upload?type=avatar", formData);
      const url = uploadRes.urls[0];
      setAvatarUrl(url);

      const updateRes = await api.put("/api/user-profile/me", { avatar_url: url });
      setProfile(updateRes.data);
      login(token, { ...user, ...updateRes.data });
      setSuccess("Cập nhật ảnh đại diện thành công");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedPermanentAddress = permanentAddress.trim();
    const trimmedEmergencyContactName = emergencyContactName.trim();
    const trimmedEmergencyContactPhone = emergencyContactPhone.trim();

    if (trimmedFirstName && !NAME_REGEX.test(trimmedFirstName)) {
      newErrors.firstName = "Tên chỉ được chứa chữ cái và khoảng trắng";
    }
    if (trimmedLastName && !NAME_REGEX.test(trimmedLastName)) {
      newErrors.lastName = "Họ chỉ được chứa chữ cái và khoảng trắng";
    }
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }
    if (dateOfBirth && new Date(dateOfBirth) >= new Date(new Date().toDateString())) {
      newErrors.dateOfBirth = "Ngày sinh phải là ngày trong quá khứ";
    }
    if (trimmedPermanentAddress.length > 500) {
      newErrors.permanentAddress = "Địa chỉ thường trú tối đa 500 ký tự";
    }
    if (trimmedEmergencyContactName && !NAME_REGEX.test(trimmedEmergencyContactName)) {
      newErrors.emergencyContactName = "Tên liên hệ chỉ được chứa chữ cái và khoảng trắng";
    }
    if (trimmedEmergencyContactName.length > 255) {
      newErrors.emergencyContactName = "Tên liên hệ khẩn cấp tối đa 255 ký tự";
    }
    if (trimmedEmergencyContactPhone && !PHONE_REGEX.test(trimmedEmergencyContactPhone)) {
      newErrors.emergencyContactPhone = "SĐT khẩn cấp không hợp lệ";
    }

    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError("");
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        phone: trimmedPhone,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        permanent_address: trimmedPermanentAddress || null,
        emergency_contact_name: trimmedEmergencyContactName || null,
        emergency_contact_phone: trimmedEmergencyContactPhone || null,
      };
      const res = await api.put("/api/user-profile/me", payload);
      setProfile(res.data);
      login(token, { ...user, ...res.data });
      setFormErrors({});
      setSuccess("Cập nhật hồ sơ thành công");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        const backendErrors = {};
        for (const item of err.errors) {
          const key = FIELD_NAME_MAP[item.path];
          if (key && !backendErrors[key]) {
            backendErrors[key] = item.msg;
          }
        }
        if (Object.keys(backendErrors).length > 0) {
          setFormErrors(backendErrors);
        }
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.03] to-white">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </button>

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Hồ sơ của tôi</h1>
            <p className="mt-1 text-sm text-secondary">Quản lý thông tin tài khoản và hồ sơ cá nhân</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  <img
                    src={cdnUrl(avatarUrl) || defaultAvatar}
                    alt="Avatar"
                    className="size-32 rounded-full border-2 border-primary/20 object-cover bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading ? (
                      <CircleNotch className="size-6 text-white animate-spin" />
                    ) : (
                      <Camera className="size-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <p className="mt-4 text-lg font-semibold text-primary">
                  {[lastName, firstName].filter(Boolean).join(" ").trim() || "Chưa cập nhật tên"}
                </p>
                <p className="text-sm text-secondary break-all">{profile?.email}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 text-sm font-medium text-olive hover:underline"
                >
                  {uploading ? "Đang tải lên..." : "Thay đổi ảnh đại diện"}
                </button>
              </div>

              <div className="mt-8 border-t border-primary/10 pt-6">
                <p className="mb-3 text-sm font-semibold text-primary">Truy cập nhanh</p>
                <div className="space-y-2">
                  {PROFILE_NAV_LINKS.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === "/profile";
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-primary text-white"
                            : "text-secondary hover:bg-primary/6 hover:text-primary"
                        }`}
                      >
                        <Icon className="size-4.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 border-t border-primary/10 pt-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <SignOut className="size-4.5" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <IdentificationCard className="size-4.5" />
                </div>
                <h2 className="text-lg font-bold text-primary">Thông tin tài khoản</h2>
              </div>

              <div className="space-y-5">
                <Input
                  label="Email"
                  value={profile?.email || ""}
                  variant="bordered"
                  isDisabled
                  classNames={{ label: "text-secondary" }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Họ"
                    placeholder="Nguyễn"
                    value={lastName}
                    onValueChange={(value) => {
                      setLastName(value);
                      clearFieldError("lastName");
                    }}
                    variant="bordered"
                    isInvalid={Boolean(formErrors.lastName)}
                    errorMessage={formErrors.lastName}
                    classNames={{ label: "text-secondary" }}
                    startContent={<User className="size-4 text-muted" />}
                  />
                  <Input
                    label="Tên"
                    placeholder="Văn A"
                    value={firstName}
                    onValueChange={(value) => {
                      setFirstName(value);
                      clearFieldError("firstName");
                    }}
                    variant="bordered"
                    isInvalid={Boolean(formErrors.firstName)}
                    errorMessage={formErrors.firstName}
                    classNames={{ label: "text-secondary" }}
                    startContent={<User className="size-4 text-muted" />}
                  />
                </div>
                <Input
                  label="Số điện thoại"
                  placeholder="0912 345 678"
                  value={phone}
                  onValueChange={(value) => {
                    setPhone(value);
                    clearFieldError("phone");
                  }}
                  variant="bordered"
                  isInvalid={Boolean(formErrors.phone)}
                  errorMessage={formErrors.phone}
                  classNames={{ label: "text-secondary" }}
                  startContent={<Phone className="size-4 text-muted" />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <CalendarDots className="size-4.5" />
                </div>
                <h2 className="text-lg font-bold text-primary">Thông tin cá nhân</h2>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Select
                    label="Giới tính"
                    placeholder="Chọn giới tính"
                    selectedKeys={gender ? [gender] : []}
                    onSelectionChange={(keys) => {
                      setGender([...keys][0] || "");
                      clearFieldError("gender");
                    }}
                    variant="bordered"
                    isInvalid={Boolean(formErrors.gender)}
                    errorMessage={formErrors.gender}
                    classNames={{ label: "text-secondary" }}
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g.key}>{g.label}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Ngày sinh"
                    type="date"
                    value={dateOfBirth}
                    onValueChange={(value) => {
                      setDateOfBirth(value);
                      clearFieldError("dateOfBirth");
                    }}
                    variant="bordered"
                    isInvalid={Boolean(formErrors.dateOfBirth)}
                    errorMessage={formErrors.dateOfBirth}
                    classNames={{ label: "text-secondary" }}
                  />
                </div>
                <Input
                  label="Địa chỉ thường trú"
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  value={permanentAddress}
                  onValueChange={(value) => {
                    setPermanentAddress(value);
                    clearFieldError("permanentAddress");
                  }}
                  variant="bordered"
                  isInvalid={Boolean(formErrors.permanentAddress)}
                  errorMessage={formErrors.permanentAddress}
                  classNames={{ label: "text-secondary" }}
                  startContent={<MapPinLine className="size-4 text-muted" />}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/8 text-primary">
                  <UsersThree className="size-4.5" />
                </div>
                <h2 className="text-lg font-bold text-primary">Liên hệ khẩn cấp</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Họ tên người liên hệ"
                  placeholder="Nguyễn Văn B"
                  value={emergencyContactName}
                  onValueChange={(value) => {
                    setEmergencyContactName(value);
                    clearFieldError("emergencyContactName");
                  }}
                  variant="bordered"
                  isInvalid={Boolean(formErrors.emergencyContactName)}
                  errorMessage={formErrors.emergencyContactName}
                  classNames={{ label: "text-secondary" }}
                  startContent={<User className="size-4 text-muted" />}
                />
                <Input
                  label="Số điện thoại"
                  placeholder="0987 654 321"
                  value={emergencyContactPhone}
                  onValueChange={(value) => {
                    setEmergencyContactPhone(value);
                    clearFieldError("emergencyContactPhone");
                  }}
                  variant="bordered"
                  isInvalid={Boolean(formErrors.emergencyContactPhone)}
                  errorMessage={formErrors.emergencyContactPhone}
                  classNames={{ label: "text-secondary" }}
                  startContent={<Phone className="size-4 text-muted" />}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                radius="full"
                isLoading={saving}
                className="bg-primary text-white font-semibold px-8 h-11"
              >
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <AppNavbar />
        <div className="flex-1">
          <ProfileContent />
        </div>
        <Footer />
      </div>
    </LocationsProvider>
  );
}
