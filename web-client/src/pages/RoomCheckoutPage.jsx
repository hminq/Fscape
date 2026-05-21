import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CircleNotch } from "@phosphor-icons/react";
import { toast } from "@/lib/toast";
import AppNavbar from "@/components/layout/AppNavbar";
import PaymentCardShell from "@/components/payment/PaymentCardShell";
import PaymentSummaryCard from "@/components/payment/PaymentSummaryCard";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { api } from "@/lib/api";
import { formatVnd, formatDisplayDate } from "@/lib/formatters";
import { buildPaymentCancelUrl, buildPaymentSuccessUrl, PAYMENT_TEXT } from "@/lib/payment";
import { useAuth } from "@/contexts/AuthContext";
import { BILLING_CYCLE_LABELS, GENDER_LABELS } from "@/lib/constants";
import { usePayOSEmbeddedCheckout } from "@/hooks/usePayOSEmbeddedCheckout";
import { usePaymentCountdown } from "@/hooks/usePaymentCountdown";
import defaultRoomImg from "@/assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Thông tin đặt phòng" },
  { id: 2, label: "Điều khoản" },
  { id: 3, label: "Thanh toán" },
];

function RoomCheckoutContent() {
  const { buildingId, roomId } = useParams();
  const [searchParams] = useSearchParams();
  const Navigate = useNavigate();
  const checkInDate = searchParams.get("check_in_date") || "";
  const rentalTerm = searchParams.get("term") || "";
  const billingCycle = searchParams.get("billing_cycle") || "";
  const { token, user: authUser } = useAuth();

  const [room, setRoom] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [bookingExpiresAt, setBookingExpiresAt] = useState(null);
  const [form, setForm] = useState(() => {
    const u = authUser || {};
    return {
      email: u.email || "",
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      gender: u.gender || "",
      dateOfBirth: "",
      permanentAddress: u.permanent_address || "",
      emergencyContactName: u.emergency_contact_name || "",
      emergencyContactPhone: u.emergency_contact_phone || "",
    };
  });

  useEffect(() => {
    if (token) return;
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
  }, [token]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        // Fetch room + profile in parallel
        const [roomRes, profileRes] = await Promise.all([
          api.get(`/api/rooms/${roomId}`),
          api.get("/api/user-profile/me").catch(() => null),
        ]);

        if (!mounted) return;

        const roomData = roomRes?.data || null;
        if (!roomData) {
          setError("Không tìm thấy thông tin phòng.");
          return;
        }
        setRoom(roomData);

        // Pre-fill form with profile data
        const profile = profileRes?.data?.profile;
        if (profile) {
          setForm((prev) => ({
            ...prev,
            gender: profile.gender || prev.gender,
            dateOfBirth: profile.date_of_birth || prev.dateOfBirth,
            permanentAddress: profile.permanent_address || prev.permanentAddress,
            emergencyContactName: profile.emergency_contact_name || prev.emergencyContactName,
            emergencyContactPhone: profile.emergency_contact_phone || prev.emergencyContactPhone,
          }));
        }

        const typeId = roomData?.room_type?.id;
        if (!typeId) {
          setRoomType(roomData.room_type || null);
          return;
        }

        try {
          const typeRes = await api.get(`/api/room-types/${typeId}`);
          if (!mounted) return;
          setRoomType(typeRes?.data || roomData.room_type || null);
        } catch {
          if (!mounted) return;
          setRoomType(roomData.room_type || null);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Không thể tải thông tin đặt phòng.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  const roomImage = useMemo(
    () => cdnUrl(room?.thumbnail_url) || cdnUrl(room?.images?.[0]?.image_url) || defaultRoomImg,
    [room]
  );



  const termLabel = rentalTerm ? `${rentalTerm} tháng` : "-";
  const billingCycleLabel = BILLING_CYCLE_LABELS[billingCycle] || "-";
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({});
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.email) newErrors.email = "Email là bắt buộc";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Email không hợp lệ";
    if (!form.firstName) newErrors.firstName = "Tên là bắt buộc";
    if (!form.lastName) newErrors.lastName = "Họ là bắt buộc";
    if (!form.gender) newErrors.gender = "Vui lòng chọn giới tính";
    if (!form.dateOfBirth) newErrors.dateOfBirth = "Ngày sinh là bắt buộc";
    else if (new Date(`${form.dateOfBirth}T00:00:00`) >= todayStart) newErrors.dateOfBirth = "Ngày sinh phải là ngày trong quá khứ";
    if (!form.permanentAddress) newErrors.permanentAddress = "Địa chỉ là bắt buộc";
    if (!form.emergencyContactName) newErrors.emergencyContactName = "Tên liên hệ khẩn cấp là bắt buộc";
    if (!form.emergencyContactPhone) newErrors.emergencyContactPhone = "SĐT khẩn cấp là bắt buộc";
    else if (!/^\d{10,11}$/.test(form.emergencyContactPhone)) newErrors.emergencyContactPhone = "SĐT phải từ 10-11 số";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!agreed) {
        toast.warning("Bạn cần đồng ý với điều khoản để tiếp tục.");
        return;
      }

      try {
        setSubmitting(true);
        setPaymentError("");

        const res = await api.post("/api/bookings", {
          room_id: roomId,
          check_in_date: checkInDate,
          duration_months: Number(rentalTerm),
          billing_cycle: billingCycle,
          customer_info: {
            gender: form.gender,
            date_of_birth: form.dateOfBirth,
            permanent_address: form.permanentAddress,
            emergency_contact_name: form.emergencyContactName,
            emergency_contact_phone: form.emergencyContactPhone,
          },
        });

        const payload = res?.data ?? res;
        const url = payload?.checkout_url;
        if (!url) {
          throw new Error(PAYMENT_TEXT.missingCheckoutUrl);
        }

        setCheckoutUrl(url);
        setBookingExpiresAt(payload?.expires_at);
        setStep(3);
      } catch (err) {
        const message = err.message || "Không thể khởi tạo thanh toán.";
        setPaymentError(message);
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CircleNotch className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-semibold text-primary">{error || "Đã có lỗi xảy ra."}</p>
        <Link
          to={`/buildings/${buildingId}/rooms/${roomId}/booking`}
          className="rounded-full border border-primary/50 px-6 py-2 text-sm font-semibold text-primary"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-10 md:px-12">
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_380px]">
        <div>
          <div className="mb-6 flex items-center gap-3">
            {STEPS.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className={`h-8 min-w-8 rounded-full px-3 text-center text-sm font-semibold leading-8 ${item.id <= step ? "bg-primary text-white" : "bg-primary/10 text-secondary"
                    }`}
                >
                  {item.id}
                </div>
                <p className={`text-sm font-semibold ${item.id <= step ? "text-primary" : "text-secondary"}`}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <h1 className="text-5xl font-bold uppercase text-primary">Hoàn tất đặt phòng</h1>

          {step === 1 && (
            <div className="mt-8 rounded-3xl border border-muted/20 bg-white p-6">
              <h2 className="text-2xl font-bold text-primary">Bước 1: Điền thông tin</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-secondary ml-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    readOnly
                    aria-readonly="true"
                    className="h-11 cursor-not-allowed rounded-xl border border-muted/20 bg-muted/20 px-4 text-sm text-primary outline-none"
                  />
                  {errors.email && (
                    <span className="text-[10px] text-red-500 ml-1 font-medium">{errors.email}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-secondary ml-1">
                    Giới tính
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, gender: e.target.value }));
                      if (errors.gender) setErrors((prev) => ({ ...prev, gender: "" }));
                    }}
                    className={`h-11 rounded-xl border px-4 text-sm text-primary outline-none focus:border-olive bg-white ${errors.gender ? "border-red-500" : "border-muted/30"}`}
                  >
                    <option value="">Chọn giới tính</option>
                    {["MALE", "FEMALE", "OTHER"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === "MALE" ? "Nam" : opt === "FEMALE" ? "Nữ" : "Khác"}
                      </option>
                    ))}
                  </select>
                  {errors.gender && (
                    <span className="text-[10px] text-red-500 ml-1 font-medium">{errors.gender}</span>
                  )}
                </div>
                {[
                  { key: "firstName", label: "Họ", type: "text" },
                  { key: "lastName", label: "Tên", type: "text" },
                  { key: "dateOfBirth", label: "Ngày sinh", type: "date" },
                  { key: "permanentAddress", label: "Địa chỉ thường trú", type: "text" },
                  { key: "emergencyContactName", label: "Tên liên hệ khẩn cấp", type: "text" },
                  { key: "emergencyContactPhone", label: "SĐT khẩn cấp", type: "text" },
                ].map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider ml-1">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={form[field.key]}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, [field.key]: e.target.value }));
                          if (errors[field.key]) setErrors(prev => ({ ...prev, [field.key]: "" }));
                        }}
                        className={`h-11 rounded-xl border px-4 text-sm text-primary outline-none focus:border-olive bg-white ${errors[field.key] ? "border-red-500" : "border-muted/30"}`}
                      >
                        <option value="">Chọn {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt === "MALE" ? "Nam" : opt === "FEMALE" ? "Nữ" : "Khác"}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.label}
                        value={form[field.key]}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, [field.key]: e.target.value }));
                          if (errors[field.key]) setErrors(prev => ({ ...prev, [field.key]: "" }));
                        }}
                        className={`h-11 rounded-xl border px-4 text-sm text-primary outline-none focus:border-olive ${errors[field.key] ? "border-red-500" : "border-muted/30"}`}
                      />
                    )}
                    {errors[field.key] && (
                      <span className="text-[10px] text-red-500 ml-1 font-medium">{errors[field.key]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 rounded-3xl border border-muted/20 bg-white p-6">
              <h2 className="text-2xl font-bold text-primary">Bước 2: Điều khoản</h2>

              {paymentError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {paymentError}
                </div>
              )}

              <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-2xl border border-muted/20 bg-primary/[0.02] p-5 text-sm leading-relaxed text-secondary space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Điều khoản và Điều kiện sử dụng hệ thống Fscape</p>
                <p className="text-xs text-secondary/70">Vui lòng đọc kỹ các điều khoản này trước khi sử dụng hệ thống.</p>

                <div className="space-y-2.5 text-xs text-secondary/90">
                  <p><strong className="text-primary">1. Phạm vi áp dụng</strong></p>
                  <p>1.1. Các Điều khoản Sử dụng này áp dụng cho toàn bộ nội dung của hệ thống quản lý lưu trú sinh viên Fscape (bao gồm website và ứng dụng di động). 1.2. Việc sử dụng Hệ thống bao gồm: truy cập, duyệt tin, đăng ký tài khoản hoặc thực hiện các giao dịch đặt phòng. 1.3. Bằng việc sử dụng Fscape, bạn xác nhận chấp nhận các Điều khoản này. Nếu không đồng ý, bạn phải ngừng sử dụng Hệ thống ngay lập tức.</p>

                  <p><strong className="text-primary">2. Các chính sách bổ sung</strong></p>
                  <p>2.1. Chính sách Bảo mật: Quy định cách chúng tôi xử lý dữ liệu cá nhân bạn cung cấp (bao gồm thông tin đăng ký, CCCD/Hộ chiếu cho hợp đồng). 2.2. Điều khoản Đặt phòng & Hợp đồng: Nếu bạn thực hiện đặt phòng hoặc ký hợp đồng, các điều khoản cụ thể về tiền cọc, thanh toán và nội quy nhà trọ sẽ được áp dụng bổ sung.</p>

                  <p><strong className="text-primary">3. Thông tin về chúng tôi</strong></p>
                  <p>Hệ thống Fscape được vận hành bởi Đội ngũ Quản lý Fscape (Fscape Management Team). Mọi thông tin hỗ trợ vui lòng liên hệ qua email: support@fscape.vn.</p>

                  <p><strong className="text-primary">4. Đăng ký và bảo mật tài khoản</strong></p>
                  <p>4.1. Mỗi tài khoản được đăng ký chỉ dành cho một người dùng duy nhất. 4.2. Bạn có trách nhiệm bảo mật thông tin đăng nhập (Email, Mật khẩu, mã OTP). Fscape không chịu trách nhiệm cho bất kỳ tổn thất nào phát sinh do bạn tiết lộ thông tin tài khoản cho bên thứ ba. 4.3. Chúng tôi có quyền vô hiệu hóa tài khoản nếu phát hiện hành vi vi phạm điều khoản hoặc nghi ngờ có hoạt động gian lận.</p>

                  <p><strong className="text-primary">5. Quyền sở hữu trí tuệ</strong></p>
                  <p>5.1. Fscape và các đối tác sở hữu toàn bộ bản quyền hình ảnh, giao diện, logo và mã nguồn trên Hệ thống. 5.2. Khi bạn tải lên hình ảnh (qua dịch vụ Cloudinary tích hợp trong hệ thống) như ảnh phòng, ảnh hồ sơ hoặc yêu cầu sửa chữa, bạn cấp quyền cho Fscape sử dụng các hình ảnh này cho mục đích quản lý vận hành và hiển thị thông tin lưu trú.</p>

                  <p><strong className="text-primary">6. Tuyên bố miễn trừ trách nhiệm (AI & LLM)</strong></p>
                  <p>6.1. Các phản hồi được tạo ra bởi trí tuệ nhân tạo (AI) trên Fscape chỉ mang tính chất tham khảo. Bạn không nên coi đó là lời khuyên pháp lý hoặc tài chính chính xác tuyệt đối. 6.2. Mặc dù chúng tôi nỗ lực cập nhật dữ liệu, Fscape không cam kết thông tin về giá phòng, tiện ích hoặc khoảng cách đến các trường đại học là chính xác 100% tại mọi thời điểm. Bạn cần xác nhận lại thông tin trong Hợp đồng chính thức.</p>

                  <p><strong className="text-primary">7. Giới hạn trách nhiệm</strong></p>
                  <p>7.1. Fscape không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ: sự gián đoạn dịch vụ do bảo trì hệ thống hoặc lỗi đường truyền internet; thông tin sai lệch do người dùng khác cung cấp trên diễn đàn/bảng tin; các mất mát dữ liệu do virus hoặc tấn công mạng từ bên ngoài. 7.2. Đối với người dùng là Sinh viên (Resident), Fscape cung cấp nền tảng để kết nối và quản lý lưu trú cá nhân, không chịu trách nhiệm cho các giao dịch dân sự bên ngoài phạm vi hệ thống.</p>

                  <p><strong className="text-primary">8. Chính sách sử dụng hợp lệ</strong></p>
                  <p>8.1. Hành vi cấm: đăng tải nội dung độc hại, vi phạm pháp luật Việt Nam, xúc phạm danh dự người khác; cố tình phá hoại hệ thống (hack, spam request, làm quá tải server); sử dụng hình ảnh giả mạo hoặc không có bản quyền để đăng tin. 8.2. Bảng tin nội bộ: Người dùng phải sử dụng ngôn từ văn minh. Chúng tôi có quyền xóa bất kỳ bài đăng nào vi phạm tiêu chuẩn cộng đồng mà không cần báo trước.</p>

                  <p><strong className="text-primary">9. Quy trình quản lý cư dân</strong></p>
                  <p>Bằng cách sử dụng Fscape, bạn đồng ý tuân thủ quy trình điện tử bao gồm: (1) Giai đoạn Tìm kiếm — tra cứu vị trí, tiện ích và hình ảnh tòa nhà; (2) Giai đoạn Đặt phòng — đặt giữ chỗ và thanh toán tiền cọc trong thời gian quy định; (3) Giai đoạn Hợp đồng — thực hiện ký hợp đồng điện tử và nhận bàn giao phòng; (4) Giai đoạn Lưu trú — nhận hóa đơn điện tử hàng tháng và gửi yêu cầu sửa chữa qua ứng dụng.</p>

                  <p><strong className="text-primary">10. Điều khoản liên lạc và marketing</strong></p>
                  <p>Bằng việc hoàn tất đăng ký cư dân, bạn đồng ý nhận các thông báo từ Fscape bao gồm: thông báo vận hành (hóa đơn tiền điện/nước, nhắc hẹn thanh toán, thông báo sửa chữa tòa nhà) và thông báo tiếp thị (các chương trình ưu đãi, sự kiện dành cho sinh viên — bạn có thể hủy đăng ký bất cứ lúc nào).</p>

                  <p><strong className="text-primary">11. Luật pháp và thẩm quyền</strong></p>
                  <p>Các Điều khoản Sử dụng này được điều chỉnh và giải thích theo Pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh sẽ được giải quyết tại Tòa án có thẩm quyền tại Việt Nam.</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <a
                  href="https://res.cloudinary.com/dz0rxiivc/raw/upload/v1774116931/term_du0gb9.docx"
                  download
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Tải điều khoản đầy đủ (.docx)
                </a>
              </div>

              <label className="mt-5 flex items-center gap-2 text-primary">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                Tôi đồng ý với điều khoản và điều kiện
              </label>
            </div>
          )}

          {step === 3 && checkoutUrl && (
            <PayOSEmbeddedCheckout
              checkoutUrl={checkoutUrl}
              navigate={Navigate}
              expiresAt={bookingExpiresAt}
              depositAmount={roomType?.base_price || room?.room_type?.base_price}
              roomName={roomType?.name || "Phòng"}
              roomNumber={room.room_number}
              buildingName={room.building?.name}
            />
          )}

          {step < 3 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    navigate(`/buildings/${buildingId}/rooms/${roomId}`);
                    return;
                  }
                  setStep((prev) => Math.max(1, prev - 1));
                }}
                className={`h-11 rounded-full px-6 text-sm font-semibold ${step === 1
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-primary/10 text-primary"
                  }`}
              >
                {step === 1 ? "Hủy" : "Quay lại"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting || (step === 2 && !agreed)}
                className={`h-11 rounded-full px-6 text-sm font-semibold flex items-center gap-2 transition-all ${submitting || (step === 2 && !agreed)
                  ? "bg-muted/30 text-secondary/50 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
                  }`}
              >
                {submitting && <CircleNotch className="h-4 w-4 animate-spin" />}
                {step === 2 ? "Thanh toán tiền cọc" : "Tiếp tục"}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <aside className="h-fit rounded-3xl border border-muted/20 bg-white p-4">
            <img
              src={roomImage}
              alt={roomType?.name || room.room_number}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultRoomImg;
              }}
              className="h-56 w-full rounded-2xl object-cover"
            />
            <h3 className="mt-4 text-3xl font-bold text-primary">{roomType?.name || "Phòng"}</h3>
            <p className="text-secondary">
              {room.room_number ? `Phòng ${room.room_number}` : "Phòng"} · {room.building?.name}
            </p>
            <div className="mt-4 space-y-2 text-sm text-secondary">
              <p>
                <span className="font-semibold text-primary">Giá phòng:</span>{" "}
                {formatVnd(roomType?.base_price || room?.room_type?.base_price)}/tháng
              </p>
              <p>
                <span className="font-semibold text-primary">Ngày nhận phòng:</span> {formatDisplayDate(checkInDate)}
              </p>
              <p>
                <span className="font-semibold text-primary">Thời gian thuê:</span> {termLabel}
              </p>
              <p>
                <span className="font-semibold text-primary">Chu kỳ thanh toán:</span> {billingCycleLabel}
              </p>
            </div>
          </aside>

          {step >= 2 && (
            <aside className="h-fit rounded-3xl border border-muted/20 bg-white p-5">
              <h4 className="text-xl font-bold text-primary">Thông tin khách hàng</h4>
              <div className="mt-3 space-y-2 text-sm text-secondary">
                <p>
                  <span className="font-semibold text-primary">Email:</span> {form.email || "-"}
                </p>
                <p>
                  <span className="font-semibold text-primary">Họ tên:</span>{" "}
                  {[form.firstName, form.lastName].filter(Boolean).join(" ") || "-"}
                </p>
                <p>
                  <span className="font-semibold text-primary">Giới tính:</span>{" "}
                  {GENDER_LABELS[form.gender] || "-"}
                </p>
                <p>
                  <span className="font-semibold text-primary">Ngày sinh:</span> {form.dateOfBirth || "-"}
                </p>
                <p>
                  <span className="font-semibold text-primary">Địa chỉ:</span> {form.permanentAddress || "-"}
                </p>
                <p>
                  <span className="font-semibold text-primary">Liên hệ khẩn cấp:</span>{" "}
                  {form.emergencyContactName || "-"} ({form.emergencyContactPhone || "-"})
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section >
  );
}

function PayOSEmbeddedCheckout({ checkoutUrl, navigate, expiresAt, depositAmount, roomName, roomNumber, buildingName }) {
  usePayOSEmbeddedCheckout({
    checkoutUrl,
    elementId: "payos-checkout",
    onSuccess: () => {
      navigate(buildPaymentSuccessUrl());
    },
    onCancel: () => {
      navigate(buildPaymentCancelUrl());
    },
  });

  const { totalMinutes, seconds, isUrgent } = usePaymentCountdown({
    expiresAt,
    defaultSeconds: 3600,
    onExpire: () => {
      navigate(buildPaymentCancelUrl());
    },
  });

  return (
    <div className="mx-auto mt-6 max-w-md">
      {/* Timer banner */}
      <div className={`mb-4 flex items-center justify-center gap-3 rounded-2xl py-3 transition-colors ${isUrgent ? "bg-red-50" : "bg-primary/5"}`}>
        <svg className={`h-5 w-5 ${isUrgent ? "animate-pulse text-red-500" : "text-primary"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
        </svg>
        <span className={`text-sm ${isUrgent ? "text-red-500" : "text-secondary"}`}>
          Đơn đặt cọc sẽ hết hạn sau
        </span>
        <span className={`rounded-lg px-3 py-1 font-mono text-xl font-bold tabular-nums tracking-wider ${isUrgent ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
          {String(totalMinutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      <PaymentSummaryCard
        title="Đặt cọc phòng"
        subtitle={`${roomName} · Phòng ${roomNumber} · ${buildingName}`}
        amount={depositAmount}
      />

      <PaymentCardShell title="Thanh toán tiền cọc">
        <div id="payos-checkout" className="payos-embed-container mt-4" />
      </PaymentCardShell>
    </div>
  );
}

export default function RoomCheckoutPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <RoomCheckoutContent />
      </div>
    </LocationsProvider>
  );
}
