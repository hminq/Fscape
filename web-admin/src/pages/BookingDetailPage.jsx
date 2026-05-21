import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, CircleNotch, CalendarCheck,
  User as UserIcon, Envelope, Phone, House,
  CalendarDots, ClockCountdown, CurrencyDollar,
  FileText, HashStraight, XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/apiClient";
import { formatDate, formatDateTime, cdnUrl } from "@/lib/utils";
import { BOOKING_STATUS_MAP, BILLING_CYCLE_LABELS } from "@/lib/constants";
import defaultUserImg from "@/assets/default_user_img.jpg";

/* ── helpers ───────────────────────────────────────────── */

const fmtVND = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
};

/* ── reusable InfoCell ─────────────────────────────────── */

function InfoCell({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="size-3 text-muted-foreground" />}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold">{value || "—"}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isBM = location.pathname.startsWith("/building-manager");
  const bookingsBasePath = isBM ? "/building-manager/bookings" : "/bookings";
  const roomsBasePath = isBM ? "/building-manager/rooms" : "/rooms";
  const contractsBasePath = isBM ? "/building-manager/contracts" : "/contracts";
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/bookings/${id}`);
        setBooking(res.data || res);
      } catch {
        setError("Không thể tải thông tin đơn đặt phòng.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  /* ── loading ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="animate-spin text-muted-foreground size-8" />
      </div>
    );
  }

  /* ── error ─────────────────────────────────────────── */
  if (error || !booking) {
    return (
        <div className="text-center py-20 space-y-4">
          <p className="text-sm text-destructive">{error || "Không tìm thấy đơn đặt phòng."}</p>
        <Button variant="outline" size="sm" onClick={() => navigate(bookingsBasePath)}>
          Quay lại
        </Button>
      </div>
    );
  }

  /* ── derived data ──────────────────────────────────── */
  const customerName = booking.customer
    ? `${booking.customer.last_name || ""} ${booking.customer.first_name || ""}`.trim()
    : "—";

  const roomLabel = booking.room
    ? `Phòng ${booking.room.room_number || ""}${booking.room.building?.name ? " - " + booking.room.building.name : ""}`
    : "—";

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 pb-16">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          className="mt-0.5 size-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-lg font-bold">{booking.booking_number}</h1>
          </div>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <CalendarCheck className="size-3.5" />
            Đơn đặt phòng
          </p>
        </div>
      </div>

      {/* ── Thông tin đặt phòng ─────────────────────── */}
      <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
        <div className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Thông tin đặt phòng
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCell
              icon={CalendarDots}
              label="Ngày nhận phòng"
              value={formatDate(booking.check_in_date)}
            />
            <InfoCell
              icon={ClockCountdown}
              label="Thời hạn thuê"
              value={booking.duration_months ? `${booking.duration_months} tháng` : "—"}
            />
            <InfoCell
              icon={HashStraight}
              label="Chu kỳ thanh toán"
              value={BILLING_CYCLE_LABELS[booking.billing_cycle] || booking.billing_cycle || "—"}
            />
            <InfoCell
              icon={HashStraight}
              label="Ngày tạo"
              value={formatDateTime(booking.created_at)}
            />
            {booking.expires_at && (
              <InfoCell
                icon={ClockCountdown}
                label="Hết hạn lúc"
                value={formatDateTime(booking.expires_at)}
              />
            )}
          </div>
        </div>

        {/* Status banner */}
        {booking.status === "DEPOSIT_PAID" && (
          <div className="border-t border-success/30 bg-success/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-sm font-semibold text-success">Đã thanh toán cọc</span>
            </div>
            {booking.deposit_paid_at && (
              <span className="text-xs text-success/80">
                Thanh toán lúc: {formatDateTime(booking.deposit_paid_at)}
              </span>
            )}
          </div>
        )}
        {booking.status === "CONVERTED" && (
          <div className="border-t border-success/30 bg-success/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-sm font-semibold text-success">Đã chuyển thành hợp đồng</span>
            </div>
            {booking.converted_at && (
              <span className="text-xs text-success/80">
                Chuyển lúc: {formatDateTime(booking.converted_at)}
              </span>
            )}
          </div>
        )}
        {booking.status === "PENDING" && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Chờ thanh toán cọc</span>
            </div>
            {booking.expires_at && (
              <span className="text-xs text-amber-600/80 dark:text-amber-400/80">
                Hết hạn: {formatDateTime(booking.expires_at)}
              </span>
            )}
          </div>
        )}
        {booking.status === "CANCELLED" && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive" />
            <span className="text-sm font-semibold text-destructive">Đã hủy</span>
          </div>
        )}
      </Card>

      {/* ── Khách hàng & Phòng ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
          <div className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <UserIcon className="size-4 text-primary" /> Khách hàng
            </h2>
            {booking.customer ? (
              <div className="flex items-start gap-3">
                <img
                  src={cdnUrl(booking.customer.avatar_url) || defaultUserImg}
                  alt=""
                  className="size-11 rounded-lg object-cover ring-1 ring-border shrink-0"
                  onError={(e) => { e.target.src = defaultUserImg; }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{customerName}</p>
                  {booking.customer.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Envelope className="size-3" /> {booking.customer.email}
                    </p>
                  )}
                  {booking.customer.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="size-3" /> {booking.customer.phone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có thông tin.</p>
            )}
          </div>
        </Card>

        {/* Room */}
        <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
          <div className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <House className="size-4 text-primary" /> Phòng
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{roomLabel}</p>
              {booking.room?.room_type?.name && (
                <p className="text-xs text-muted-foreground">
                  Loại: {booking.room.room_type.name}
                  {booking.room.room_type.area_sqm && ` - ${booking.room.room_type.area_sqm} m²`}
                </p>
              )}
              <div className="flex items-center gap-3">
                {booking.room?.id && (
                  <Button
                    variant="link" size="sm"
                    className="px-0 h-auto text-xs"
                    onClick={() => navigate(`${roomsBasePath}/${booking.room.id}`)}
                  >
                    Xem chi tiết phòng →
                  </Button>
                )}
                {booking.contract_id && (
                  <Button
                    variant="link" size="sm"
                    className="px-0 h-auto text-xs"
                    onClick={() => navigate(`${contractsBasePath}/${booking.contract_id}`)}
                  >
                    Xem hợp đồng →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Chi phí ─────────────────────────────────── */}
      <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
        <div className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <CurrencyDollar className="size-4 text-primary" /> Chi phí
          </h2>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Giá phòng / tháng</span>
              <span className="font-medium">{fmtVND(booking.room_price_snapshot)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-semibold">Tiền cọc yêu cầu</span>
              <span className="text-lg font-bold">{fmtVND(booking.deposit_amount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Lý do hủy ──────────────────────────────── */}
      {booking.status === "CANCELLED" && (
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <XCircle className="size-4 text-destructive" /> Thông tin hủy
          </h2>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            {booking.cancelled_at && (
              <p className="text-xs text-muted-foreground">
                Thời gian hủy: {formatDateTime(booking.cancelled_at)}
              </p>
            )}
            {booking.cancellation_reason && (
              <p className="text-sm leading-relaxed">{booking.cancellation_reason}</p>
            )}
            {!booking.cancellation_reason && (
              <p className="text-sm text-muted-foreground">Không có lý do.</p>
            )}
          </div>
        </section>
      )}

      {/* ── Ghi chú ─────────────────────────────────── */}
      {booking.notes && (
        <section>
          <h2 className="text-base font-bold mb-3">Ghi chú</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">{booking.notes}</p>
          </div>
        </section>
      )}

      {/* ── Timestamps ──────────────────────────────── */}
      {(booking.created_at || booking.updated_at) && (
        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
          {booking.created_at && <span>Tạo lúc: {formatDateTime(booking.created_at)}</span>}
          {booking.updated_at && <span>Cập nhật: {formatDateTime(booking.updated_at)}</span>}
        </div>
      )}
    </div>
  );
}
