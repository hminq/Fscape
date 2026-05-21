import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleNotch } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { api } from "@/lib/api";
import { formatVnd, formatDateValue, formatDisplayDate, startOfDay, addMonthsToDate } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

const WEEK_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });

function RoomBookingContent() {
  const { buildingId, roomId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [room, setRoom] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [checkInDate, setCheckInDate] = useState("");
  const [rentalMonths, setRentalMonths] = useState(null);
  const [billingCycle, setBillingCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 3);
    return startOfDay(d);
  }, [today]);
  const maxDate = useMemo(() => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + 7);
    return d;
  }, [minDate]);
  const calendarMonths = useMemo(() => {
    const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const secondMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return [firstMonth, secondMonth];
  }, [today]);

  useEffect(() => {
    let mounted = true;

    async function fetchRoom() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/api/rooms/${roomId}`);
        if (!mounted) return;
        const roomData = res?.data || null;
        if (!roomData) {
          setError("Không tìm thấy thông tin phòng.");
          return;
        }
        setRoom(roomData);

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

    fetchRoom();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  const BILLING_CYCLES = useMemo(() => [
    { value: "CYCLE_1M", label: "Hàng tháng", months: 1 },
    { value: "CYCLE_3M", label: "3 tháng", months: 3 },
    { value: "CYCLE_6M", label: "6 tháng", months: 6 },
    { value: "ALL_IN", label: "Trả trọn gói", months: null },
  ], []);

  const availableCycles = useMemo(() => {
    if (!rentalMonths) return [];
    return BILLING_CYCLES.filter((c) => c.months === null || c.months <= rentalMonths);
  }, [rentalMonths, BILLING_CYCLES]);

  const billingCycleLabel = useMemo(() => {
    if (!billingCycle) return null;
    return BILLING_CYCLES.find((c) => c.value === billingCycle)?.label || null;
  }, [billingCycle, BILLING_CYCLES]);

  const isReadyToDeposit = Boolean(checkInDate && rentalMonths && billingCycle && room && roomType);
  const rentalLabel = rentalMonths ? `${rentalMonths} tháng` : "-";
  const basePrice = Number(roomType?.base_price || room?.room_type?.base_price || 0);
  const endDate = useMemo(() => addMonthsToDate(checkInDate, rentalMonths), [checkInDate, rentalMonths]);

  useEffect(() => {
    if (checkInDate && rentalMonths && endDate) {
      const el = document.getElementById("end-date-calendar");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [rentalMonths, checkInDate, endDate]);
  const moveOutDateLabel = useMemo(() => {
    if (!rentalMonths) return "-";
    return formatDisplayDate(endDate);
  }, [rentalMonths, endDate]);


  const handleProceedDeposit = () => {
    if (!isReadyToDeposit) return;

    const target = `/buildings/${buildingId}/rooms/${roomId}/checkout?check_in_date=${checkInDate}&term=${rentalMonths}&billing_cycle=${billingCycle}`;
    if (!token) {
      navigate(`/login?returnTo=${encodeURIComponent(target)}`);
      return;
    }

    navigate(target);
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
          to={`/buildings/${buildingId}/rooms/${roomId}`}
          className="rounded-full border border-primary/50 px-6 py-2 text-sm font-semibold text-primary"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-10 pb-36 md:px-12">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-secondary">
            {roomType?.name || "Loại phòng"} - {room.room_number ? `Phòng ${room.room_number}` : "Phòng"}
          </p>
          <h1 className="mt-3 text-6xl font-bold uppercase tracking-wide text-primary md:text-7xl">
            {room.room_number ? `Đặt phòng ${room.room_number}` : "Đặt phòng"}
          </h1>
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-3xl border border-muted/20 bg-white p-8 shadow-sm">
          <h2 className="text-center text-3xl font-bold text-primary">Chọn ngày nhận phòng</h2>
          <p className="mt-2 text-center text-secondary">
            Nhận phòng từ 3 đến 10 ngày kể từ hôm nay
          </p>

          <div className="mt-6 border-t border-muted/15 pt-6">
            <p className="mb-2 text-center text-sm text-secondary">
              Ngày nhận phòng
            </p>
            <p className="mb-6 text-center text-2xl font-bold text-olive">
              {checkInDate ? formatDisplayDate(checkInDate) : "—"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {calendarMonths.map((monthStart) => {
              const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
              const startWeekDay = firstDay.getDay();
              const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
              const cells = [];

              for (let i = 0; i < startWeekDay; i += 1) cells.push(null);
              for (let d = 1; d <= daysInMonth; d += 1) {
                cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
              }
              while (cells.length % 7 !== 0) cells.push(null);

              return (
                <div key={monthStart.toISOString()}>
                  <p className="mb-4 text-center text-xl font-semibold capitalize text-primary">
                    {MONTH_FORMATTER.format(monthStart)}
                  </p>
                  <div className="grid grid-cols-7 gap-2">
                    {WEEK_DAYS.map((day) => (
                      <p key={day} className="text-center text-sm font-semibold text-secondary">
                        {day}
                      </p>
                    ))}

                    {cells.map((date, idx) => {
                      if (!date) {
                        return <div key={`empty-${idx}`} className="h-10" />;
                      }

                      const dayDate = startOfDay(date);
                      const disabled = dayDate < minDate || dayDate > maxDate;
                      const value = formatDateValue(dayDate);
                      const selected = checkInDate === value;

                      return (
                        <div key={value} className="flex items-center justify-center">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setCheckInDate(value)}
                            className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                              selected
                                ? "bg-olive text-primary"
                                : disabled
                                  ? "cursor-not-allowed text-secondary/30"
                                  : "text-secondary hover:bg-primary/5 hover:text-primary"
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold text-secondary">Thời gian thuê</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { value: 6, label: "6 tháng" },
                { value: 12, label: "12 tháng" },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    setRentalMonths(option.value);
                    setBillingCycle(null);
                  }}
                  className={`h-11 rounded-full text-sm font-semibold transition-colors ${
                    rentalMonths === option.value
                      ? "bg-primary text-white"
                      : "bg-primary/5 text-secondary hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* End-date calendar preview */}
          {checkInDate && rentalMonths && endDate && (() => {
            const [ey, em, ed] = endDate.split("-").map(Number);
            const endDateObj = new Date(ey, em - 1, ed);
            const endMonthStart = new Date(ey, em - 1, 1);
            const prevMonthStart = new Date(ey, em - 2, 1);
            const endCalendarMonths = [prevMonthStart, endMonthStart];

            return (
              <div id="end-date-calendar" className="mt-8 border-t border-muted/15 pt-8">
                <p className="mb-2 text-center text-sm text-secondary">
                  Ngày kết thúc hợp đồng dự kiến
                </p>
                <p className="mb-6 text-center text-2xl font-bold text-olive">
                  {formatDisplayDate(endDate)}
                </p>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {endCalendarMonths.map((monthStart) => {
                    const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
                    const startWeekDay = firstDay.getDay();
                    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
                    const cells = [];

                    for (let i = 0; i < startWeekDay; i += 1) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d += 1) {
                      cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
                    }
                    while (cells.length % 7 !== 0) cells.push(null);

                    return (
                      <div key={monthStart.toISOString()}>
                        <p className="mb-4 text-center text-xl font-semibold capitalize text-primary">
                          {MONTH_FORMATTER.format(monthStart)}
                        </p>
                        <div className="grid grid-cols-7 gap-2">
                          {WEEK_DAYS.map((day) => (
                            <p key={day} className="text-center text-sm font-semibold text-secondary">
                              {day}
                            </p>
                          ))}

                          {cells.map((date, idx) => {
                            if (!date) {
                              return <div key={`end-empty-${idx}`} className="h-10" />;
                            }

                            const isEndDate =
                              date.getFullYear() === endDateObj.getFullYear() &&
                              date.getMonth() === endDateObj.getMonth() &&
                              date.getDate() === endDateObj.getDate();

                            return (
                              <div key={`end-${formatDateValue(date)}`} className="flex items-center justify-center">
                                <span
                                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                    isEndDate
                                      ? "bg-olive text-primary"
                                      : "text-secondary/40"
                                  }`}
                                >
                                  {date.getDate()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {rentalMonths && (
            <div className="mt-8 border-t border-muted/15 pt-8">
              <p className="mb-3 text-sm font-semibold text-secondary">Chu kỳ thanh toán</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {availableCycles.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBillingCycle(option.value)}
                    className={`h-11 rounded-full text-sm font-semibold transition-colors ${
                      billingCycle === option.value
                        ? "bg-primary text-white"
                        : "bg-primary/5 text-secondary hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center md:px-12">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Loại phòng</p>
            <p className="text-lg font-semibold text-white">{roomType?.name || "-"}</p>
            <p className="text-sm text-white/70">
              {room.room_number ? `Phòng ${room.room_number}` : "-"} · {room.building?.name || "-"}
            </p>
            {basePrice > 0 && (
              <p className="text-sm font-semibold text-olive">{formatVnd(basePrice)}/tháng</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Ngày nhận phòng</p>
            <p className="text-lg font-semibold text-white">{formatDisplayDate(checkInDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Thời gian thuê</p>
            <p className="text-lg font-semibold text-white">{rentalLabel}</p>
            {billingCycleLabel && (
              <p className="text-sm text-white/70">Chu kỳ: {billingCycleLabel}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Ngày trả phòng</p>
            <p className="text-lg font-semibold text-white">{moveOutDateLabel}</p>
          </div>
          <button
            type="button"
            disabled={!isReadyToDeposit}
            onClick={handleProceedDeposit}
            className={`h-12 rounded-full px-8 text-sm font-semibold transition-colors ${
              isReadyToDeposit
                ? "bg-olive text-primary hover:bg-tea"
                : "cursor-not-allowed bg-white/20 text-white/50"
            }`}
          >
            Đóng cọc
          </button>
        </div>
      </div>
    </>
  );
}

export default function RoomBookingPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <RoomBookingContent />
      </div>
    </LocationsProvider>
  );
}
