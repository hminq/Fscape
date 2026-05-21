import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Envelope, Lock, Ticket, ArrowLeft, Eye, EyeSlash } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

const inputClasses = { inputWrapper: "border-muted/30 hover:border-muted focus-within:border-olive" };
const OTP_REGEX = /^[0-9]{6}$/;

export default function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    otp: "",
    newPassword: "",
  });

  const validateResetForm = () => {
    const nextErrors = {
      otp: "",
      newPassword: "",
    };

    if (!otp.trim()) {
      nextErrors.otp = "Vui lòng nhập mã OTP.";
    } else if (!OTP_REGEX.test(otp.trim())) {
      nextErrors.otp = "OTP phải gồm đúng 6 chữ số.";
    }

    if (newPassword.length < 6) {
      nextErrors.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự.";
    }

    return nextErrors;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setMessage(res.message || "Đã gửi mã OTP đến email");
      setStep(2);
    } catch (err) {
      setError(err.message || "Yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const nextFieldErrors = validateResetForm();
    setFieldErrors(nextFieldErrors);
    setError("");
    setMessage("");

    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password", { email, otp: otp.trim(), new_password: newPassword });
      setMessage(res.message || "Đã cập nhật mật khẩu");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {step === 1 ? (
        <Link 
          to="/login"
          className="flex items-center gap-2 text-sm text-muted hover:text-olive w-fit mb-2 transition-colors"
        >
          <ArrowLeft className="size-4" /> 
          Quay lại đăng nhập
        </Link>
      ) : (
        <button 
          type="button" 
          onClick={() => setStep(1)} 
          className="flex items-center gap-2 text-sm text-muted hover:text-olive w-fit mb-2 transition-colors"
        >
          <ArrowLeft className="size-4" /> 
          Quay lại nhập email
        </button>
      )}

      {message && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>
      )}

      {step === 1 ? (
        <form className="flex flex-col gap-4" onSubmit={handleRequestOtp}>
          <Input
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onValueChange={setEmail}
            startContent={<Envelope className="size-4 text-muted" />}
            variant="bordered"
            classNames={inputClasses}
            isRequired
          />
          <Button
            type="submit"
            radius="lg"
            isLoading={loading}
            className="bg-olive text-primary font-bold text-base h-12 mt-2 shadow-lg shadow-olive/30 hover:shadow-olive/50"
          >
            {loading ? "Đang gửi OTP..." : "Gửi OTP"}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleResetPassword}>
          <Input
            label="Mã OTP"
            placeholder="Nhập mã OTP"
            value={otp}
            onValueChange={(value) => {
              setOtp(value);
              setFieldErrors((current) => ({ ...current, otp: "" }));
            }}
            startContent={<Ticket className="size-4 text-muted" />}
            variant="bordered"
            classNames={inputClasses}
            isRequired
            isInvalid={!!fieldErrors.otp}
            errorMessage={fieldErrors.otp}
          />
          <Input
            label="Mật khẩu mới"
            placeholder="Nhập mật khẩu mới"
            value={newPassword}
            onValueChange={(value) => {
              setNewPassword(value);
              setFieldErrors((current) => ({ ...current, newPassword: "" }));
            }}
            type={showPassword ? "text" : "password"}
            startContent={<Lock className="size-4 text-muted" />}
            endContent={
              <button type="button" className="text-muted hover:text-secondary" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            variant="bordered"
            classNames={inputClasses}
            isRequired
            isInvalid={!!fieldErrors.newPassword}
            errorMessage={fieldErrors.newPassword}
          />
          <Button
            type="submit"
            radius="lg"
            isLoading={loading}
            className="bg-olive text-primary font-bold text-base h-12 mt-2 shadow-lg shadow-olive/30 hover:shadow-olive/50"
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </Button>
        </form>
      )}
    </div>
  );
}
