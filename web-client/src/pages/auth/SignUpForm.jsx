import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@heroui/react";
import { Lock, Envelope, Eye, EyeSlash, User } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";

const INTERNAL_ROLES = ["ADMIN", "BUILDING_MANAGER", "STAFF"];

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const inputClasses = { inputWrapper: "border-muted/30 hover:border-muted focus-within:border-olive" };

export default function SignUpForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!firstName.trim()) {
      nextErrors.firstName = "Vui lòng nhập họ.";
    }

    if (!lastName.trim()) {
      nextErrors.lastName = "Vui lòng nhập tên.";
    }

    if (!email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Email không hợp lệ.";
    }

    if (password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextFieldErrors = validate();
    setFieldErrors(nextFieldErrors);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setError("");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post("/api/auth/signup", { email: email.trim(), password });

      navigate("/verify-otp", {
        state: {
          email: email.trim(),
          password,
          flow: "signup",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      });
    } catch (err) {
      setError(err.message || "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      const res = await api.post("/api/auth/google", {
        id_token: credentialResponse.credential,
      });

      const accessToken = res?.access_token;
      const user = res?.user;

      if (accessToken) {
        if (INTERNAL_ROLES.includes(user?.role)) {
          setError("Tài khoản nội bộ không được phép đăng nhập tại đây.");
          return;
        }
        login(accessToken, user);
        navigate("/", { replace: true });
      } else {
        navigate("/verify-otp", {
          state: { id_token: credentialResponse.credential, flow: "google" },
        });
      }
    } catch (err) {
      setError(err?.message || "Đăng ký bằng Google thất bại.");
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Họ"
          placeholder="VD: Nguyễn"
          value={firstName}
          onValueChange={(value) => {
            setFirstName(value);
            setFieldErrors((current) => ({ ...current, firstName: "" }));
          }}
          startContent={<User className="size-4 text-muted" />}
          variant="bordered"
          classNames={inputClasses}
          isInvalid={!!fieldErrors.firstName}
          errorMessage={fieldErrors.firstName}
        />
        <Input
          label="Tên"
          placeholder="VD: Văn A"
          value={lastName}
          onValueChange={(value) => {
            setLastName(value);
            setFieldErrors((current) => ({ ...current, lastName: "" }));
          }}
          startContent={<User className="size-4 text-muted" />}
          variant="bordered"
          classNames={inputClasses}
          isInvalid={!!fieldErrors.lastName}
          errorMessage={fieldErrors.lastName}
        />
      </div>
      <Input
        label="Email"
        placeholder="sinhvien@truonghoc.edu.vn"
        type="email"
        value={email}
        onValueChange={(value) => {
          setEmail(value);
          setFieldErrors((current) => ({ ...current, email: "" }));
        }}
        startContent={<Envelope className="size-4 text-muted" />}
        variant="bordered"
        classNames={inputClasses}
        isInvalid={!!fieldErrors.email}
        errorMessage={fieldErrors.email}
      />
      <Input
        label="Mật khẩu"
        placeholder="Tạo mật khẩu"
        type={showPassword ? "text" : "password"}
        value={password}
        onValueChange={(value) => {
          setPassword(value);
          setFieldErrors((current) => ({ ...current, password: "", confirmPassword: "" }));
        }}
        startContent={<Lock className="size-4 text-muted" />}
        endContent={
          <button type="button" className="text-muted hover:text-secondary" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        variant="bordered"
        classNames={inputClasses}
        isInvalid={!!fieldErrors.password}
        errorMessage={fieldErrors.password}
      />
      <Input
        label="Xác nhận mật khẩu"
        placeholder="Xác nhận mật khẩu"
        type={showConfirm ? "text" : "password"}
        value={confirmPassword}
        onValueChange={(value) => {
          setConfirmPassword(value);
          setFieldErrors((current) => ({ ...current, confirmPassword: "" }));
        }}
        startContent={<Lock className="size-4 text-muted" />}
        endContent={
          <button type="button" className="text-muted hover:text-secondary" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        variant="bordered"
        classNames={inputClasses}
        isInvalid={!!fieldErrors.confirmPassword}
        errorMessage={fieldErrors.confirmPassword}
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>
      )}

      <Button
        type="submit"
        radius="lg"
        isLoading={loading}
        className="bg-olive text-primary font-bold text-base h-12 mt-1 shadow-lg shadow-olive/30"
      >
        {loading ? "Đang tạo tài khoản..." : "Tạo Tài Khoản"}
      </Button>

      <div className="flex items-center gap-3 text-muted text-sm">
        <div className="flex-1 h-px bg-muted/20" />
        <span>Hoặc tiếp tục với</span>
        <div className="flex-1 h-px bg-muted/20" />
      </div>

      <div className="relative w-full" style={{ height: 48 }}>
        {/* Custom visual button */}
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition-colors pointer-events-none z-0">
          <GoogleIcon />
        </div>
        {/* Real Google button — invisible but clickable */}
        <div className="absolute inset-0 z-10 overflow-hidden rounded-xl opacity-[0.01] [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_div[role=button]]:!w-full [&_div[role=button]]:!h-full">
          <GoogleLogin
            type="standard"
            theme="outline"
            size="large"
            width={400}
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Không thể đăng ký bằng Google.")}
          />
        </div>
      </div>
    </form>
  );
}
