import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Input } from "@heroui/react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const INTERNAL_ROLES = ["ADMIN", "BUILDING_MANAGER", "STAFF"];
const OTP_REGEX = /^[0-9]{6}$/;

export default function VerifyOtp() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const flow = location.state?.flow || "google";
    const idToken = location.state?.id_token;
    const signupEmail = location.state?.email;
    const signupPassword = location.state?.password;
    const signupFirstName = location.state?.first_name;
    const signupLastName = location.state?.last_name;

    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const validateOtp = (value) => {
        if (!value.trim()) return "Vui lòng nhập mã OTP.";
        if (!OTP_REGEX.test(value.trim())) return "OTP phải gồm đúng 6 chữ số.";
        return "";
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const normalizedOtp = otp.trim();
        const nextOtpError = validateOtp(normalizedOtp);
        setOtpError(nextOtpError);
        setError("");

        if (nextOtpError) {
            return;
        }

        setLoading(true);

        try {
            let res;

            if (flow === "signup") {
                res = await api.post("/api/auth/signup/verify", {
                    email: signupEmail,
                    password: signupPassword,
                    otp: normalizedOtp,
                    first_name: signupFirstName,
                    last_name: signupLastName,
                });

                // verifySignup returns user object (no access_token)
                // Auto-login after signup by calling appLogin
                const loginRes = await api.post("/api/auth/login", {
                    email: signupEmail,
                    password: signupPassword,
                });

                login(loginRes.access_token, loginRes.user);
                navigate("/", { replace: true });
                return;
            }

            // Google flow
            res = await api.post("/api/auth/google/verify", {
                id_token: idToken,
                otp: normalizedOtp,
            });

            const accessToken = res?.access_token;
            const user = res?.user;

            if (!accessToken) {
                throw new Error("Xác minh thất bại. Vui lòng thử lại.");
            }

            if (INTERNAL_ROLES.includes(user?.role)) {
                setError("Tài khoản nội bộ không được phép đăng nhập tại đây.");
                return;
            }

            login(accessToken, user);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err?.message || "Xác minh thất bại.");
        } finally {
            setLoading(false);
        }
    };

    const title = flow === "signup" ? "Xác minh Email" : "Xác minh OTP";
    const description = flow === "signup"
        ? `Chúng tôi đã gửi mã OTP tới ${signupEmail}.`
        : "Chúng tôi đã gửi mã OTP tới email của bạn.";

    return (
        <div className="flex justify-center items-center min-h-screen bg-muted/10">
            <form
                onSubmit={handleVerify}
                className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4"
            >
                <h2 className="text-xl font-bold text-center">{title}</h2>

                <p className="text-sm text-center text-muted">
                    {description}
                </p>

                <Input
                    label="Mã OTP"
                    placeholder="Nhập mã OTP"
                    value={otp}
                    onValueChange={(value) => {
                        setOtp(value);
                        if (otpError) {
                            setOtpError(validateOtp(value));
                        }
                    }}
                    variant="bordered"
                    isRequired
                    isInvalid={!!otpError}
                    errorMessage={otpError}
                />

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    isLoading={loading}
                    radius="lg"
                    className="bg-olive text-white font-semibold h-11"
                >
                    {loading ? "Đang xác minh..." : "Xác minh OTP"}
                </Button>
            </form>
        </div>
    );
}
