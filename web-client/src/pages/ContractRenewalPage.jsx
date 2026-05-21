import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CircleNotch, ArrowLeft, FileText, ArrowsClockwise, Info, CheckCircle, PencilSimple } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatVnd, formatDateValue, addMonthsToDate, startOfDay } from "@/lib/formatters";
import { toast } from "@/lib/toast";
import { BILLING_CYCLE_LABELS } from "@/lib/constants";

const RENEWAL_MAX_GAP_DAYS = 3;

const BILLING_CYCLES = [
  { value: "CYCLE_1M", label: "Hàng tháng", months: 1 },
  { value: "CYCLE_3M", label: "3 tháng", months: 3 },
  { value: "CYCLE_6M", label: "6 tháng", months: 6 },
  { value: "ALL_IN", label: "Trả trọn gói", months: null },
];

const DURATION_OPTIONS = [
  { value: 6, label: "6 tháng" },
  { value: 12, label: "12 tháng" },
];

const WEEK_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });

function formatFullDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function ContractRenewalContent() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get("contract_id");

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState(null);
  const [billingCycle, setBillingCycle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const formRef = useRef(null);
  const endCalRef = useRef(null);
  const summaryRef = useRef(null);

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      setError("Thiếu mã hợp đồng");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/contracts/${contractId}`);
      const data = res.data || res;

      if (!["ACTIVE", "EXPIRING_SOON"].includes(data.status)) {
        setError("Chỉ có thể gia hạn hợp đồng đang hiệu lực hoặc sắp hết hạn");
        setLoading(false);
        return;
      }

      setContract(data);
      setStartDate(data.end_date);
    } catch (err) {
      setError(err.message || "Không thể tải thông tin hợp đồng");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    fetchContract();
  }, [isLoggedIn, navigate, fetchContract]);

  const oldEndDate = contract?.end_date || "";
  const basePrice = Number(contract?.room?.room_type?.base_price || contract?.base_rent || 0);

  const { minCalDate, maxCalDate, calendarMonth } = useMemo(() => {
    if (!oldEndDate) return { minCalDate: null, maxCalDate: null, calendarMonth: null };
    const [y, m, d] = oldEndDate.split("-").map(Number);
    const min = startOfDay(new Date(y, m - 1, d));
    const max = new Date(min);
    max.setDate(max.getDate() + RENEWAL_MAX_GAP_DAYS);
    return { minCalDate: min, maxCalDate: startOfDay(max), calendarMonth: new Date(y, m - 1, 1) };
  }, [oldEndDate]);

  const availableCycles = useMemo(() => {
    if (!durationMonths) return [];
    return BILLING_CYCLES.filter((c) => c.months === null || c.months <= durationMonths);
  }, [durationMonths]);

  const endDate = useMemo(
    () => (startDate && durationMonths ? addMonthsToDate(startDate, durationMonths) : ""),
    [startDate, durationMonths],
  );

  useEffect(() => {
    if (durationMonths && billingCycle) {
      const stillValid = availableCycles.some((c) => c.value === billingCycle);
      if (!stillValid) setBillingCycle(null);
    }
  }, [durationMonths, billingCycle, availableCycles]);

  useEffect(() => {
    if (startDate && durationMonths && endDate && showCustomForm) {
      setTimeout(() => {
        endCalRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [durationMonths, startDate, endDate, showCustomForm]);

  useEffect(() => {
    if (startDate && durationMonths && billingCycle && showCustomForm) {
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [billingCycle, startDate, durationMonths, showCustomForm]);

  const isReady = startDate && durationMonths && billingCycle;

  const handleKeepOldSettings = () => {
    if (!contract) return;
    setStartDate(contract.end_date);
    setDurationMonths(Number(contract.duration_months));
    setBillingCycle(contract.billing_cycle);
    setShowCustomForm(false);
  };

  const handleShowCustomForm = () => {
    setStartDate("");
    setDurationMonths(null);
    setBillingCycle(null);
    setShowCustomForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!startDate) {
      toast.error("Vui lòng chọn ngày bắt đầu hợp đồng mới.");
      return;
    }
    if (!durationMonths) {
      toast.error("Vui lòng chọn thời hạn hợp đồng.");
      return;
    }
    if (!billingCycle) {
      toast.error("Vui lòng chọn chu kỳ thanh toán.");
      return;
    }
    setSubmitting(true);
    try {
      const body = { duration_months: durationMonths, billing_cycle: billingCycle };
      if (startDate !== oldEndDate) body.start_date = startDate;

      const res = await api.post(`/api/contracts/${contract.id}/renew`, body);
      const newContractId = res.data?.id || res.id;
      toast.success("Yêu cầu gia hạn đã được tạo. Vui lòng ký hợp đồng mới.");
      navigate(`/sign?contract_id=${newContractId}`);
    } catch (err) {
      toast.error(err.message || "Không thể tạo yêu cầu gia hạn");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-semibold text-primary">{error || "Không tìm thấy hợp đồng."}</p>
        <Link
          to="/my-contracts"
          className="rounded-full border border-primary/50 px-6 py-2 text-sm font-semibold text-primary"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const room = contract.room;
  const building = room?.building;

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-10 pb-36 md:px-12">
        {/* Back */}
        <button
          onClick={() => navigate("/my-contracts")}
          className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </button>

        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-secondary">
            Gia hạn hợp đồng
          </p>
          <h1 className="mt-3 text-5xl font-bold uppercase tracking-wide text-primary md:text-6xl font-display">
            {contract.contract_number}
          </h1>
          <p className="mt-3 text-secondary">
            {building?.name} - Phòng {room?.room_number}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl space-y-10">
          {/* Current contract info */}
          <div className="rounded-3xl border border-primary/10 bg-primary/5 p-8">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-primary/50 mb-6">Hợp đồng hiện tại</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xs text-secondary">Mã hợp đồng</p>
                <p className="text-sm font-bold text-primary mt-1">{contract.contract_number}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Phòng</p>
                <p className="text-sm font-bold text-primary mt-1">{building?.name} - {room?.room_number}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Thời hạn</p>
                <p className="text-sm font-bold text-primary mt-1">
                  {formatFullDate(contract.start_date)} - {formatFullDate(contract.end_date)} ({contract.duration_months} tháng)
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary">Chu kỳ thanh toán</p>
                <p className="text-sm font-bold text-primary mt-1">{BILLING_CYCLE_LABELS[contract.billing_cycle] || contract.billing_cycle}</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Giá phòng hiện tại</p>
                <p className="text-sm font-bold text-primary mt-1">{formatVnd(basePrice)}/tháng</p>
              </div>
              <div>
                <p className="text-xs text-secondary">Tiền cọc</p>
                <p className="text-sm font-bold text-primary mt-1">{formatVnd(contract.deposit_original_amount)} (giữ nguyên)</p>
              </div>
            </div>
          </div>

          {/* Keep old settings button */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleKeepOldSettings}
              className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-olive/40 bg-olive/5 px-8 py-3.5 text-sm font-semibold text-olive transition-colors hover:border-olive hover:bg-olive/10"
            >
              <ArrowsClockwise className="size-4" />
              Giữ nguyên như hợp đồng cũ
            </button>

            {!showCustomForm && (
              <button
                type="button"
                onClick={handleShowCustomForm}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                <PencilSimple className="size-3.5" />
                Tùy chỉnh thời hạn và chu kỳ
              </button>
            )}
          </div>

          {/* Custom renewal form */}
          {showCustomForm && (
            <div ref={formRef} className="mx-auto max-w-5xl rounded-3xl border border-muted/20 bg-white p-8 shadow-sm">
              {/* Start date */}
              <h2 className="text-center text-3xl font-bold text-primary">Chọn ngày bắt đầu mới</h2>
              <p className="mt-2 text-center text-secondary">
                Ngày bắt đầu hợp đồng gia hạn
              </p>

              <div className="mt-6 border-t border-muted/15 pt-6">
                <p className="mb-2 text-center text-sm text-secondary">Ngày bắt đầu</p>
                <p className="mb-6 text-center text-2xl font-bold text-olive">
                  {startDate ? formatFullDate(startDate) : "—"}
                </p>

                {calendarMonth && (() => {
                  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                  const startWeekDay = firstDay.getDay();
                  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
                  const cells = [];
                  for (let i = 0; i < startWeekDay; i += 1) cells.push(null);
                  for (let d = 1; d <= daysInMonth; d += 1) {
                    cells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d));
                  }
                  while (cells.length % 7 !== 0) cells.push(null);

                  return (
                    <div className="mx-auto max-w-xs">
                      <p className="mb-4 text-center text-xl font-semibold capitalize text-primary">
                        {MONTH_FORMATTER.format(calendarMonth)}
                      </p>
                      <div className="grid grid-cols-7 gap-2">
                        {WEEK_DAYS.map((day) => (
                          <p key={day} className="text-center text-sm font-semibold text-secondary">{day}</p>
                        ))}
                        {cells.map((date, idx) => {
                          if (!date) return <div key={`empty-${idx}`} className="h-10" />;
                          const dayDate = startOfDay(date);
                          const disabled = dayDate < minCalDate || dayDate > maxCalDate;
                          const value = formatDateValue(dayDate);
                          const selected = startDate === value;
                          return (
                            <div key={value} className="flex items-center justify-center">
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => setStartDate(value)}
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
                })()}

                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-secondary">
                  <Info className="size-3.5 shrink-0" />
                  Tối đa {RENEWAL_MAX_GAP_DAYS} ngày sau ngày kết thúc hợp đồng
                </p>
              </div>

              {/* Duration */}
              <div className="mt-8 border-t border-muted/15 pt-8">
                <p className="mb-3 text-sm font-semibold text-secondary">Thời gian thuê</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setDurationMonths(option.value); setBillingCycle(null); }}
                      className={`h-11 rounded-full text-sm font-semibold transition-colors ${
                        durationMonths === option.value
                          ? "bg-primary text-white"
                          : "bg-primary/5 text-secondary hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* End date calendar + billing cycle */}
              {startDate && durationMonths && endDate && (() => {
                const [ey, em] = endDate.split("-").map(Number);
                const endMonthStart = new Date(ey, em - 1, 1);
                const endDateValue = endDate;

                const firstDay = new Date(endMonthStart.getFullYear(), endMonthStart.getMonth(), 1);
                const startWeekDay = firstDay.getDay();
                const daysInMonth = new Date(endMonthStart.getFullYear(), endMonthStart.getMonth() + 1, 0).getDate();
                const cells = [];
                for (let i = 0; i < startWeekDay; i += 1) cells.push(null);
                for (let d = 1; d <= daysInMonth; d += 1) {
                  cells.push(new Date(endMonthStart.getFullYear(), endMonthStart.getMonth(), d));
                }
                while (cells.length % 7 !== 0) cells.push(null);

                return (
                  <div ref={endCalRef} className="mt-8 border-t border-muted/15 pt-8">
                    <p className="mb-2 text-center text-sm text-secondary">Ngày kết thúc hợp đồng dự kiến</p>
                    <p className="mb-6 text-center text-2xl font-bold text-olive">{formatFullDate(endDate)}</p>

                    <div className="mx-auto max-w-sm">
                      <p className="mb-4 text-center text-xl font-semibold capitalize text-primary">
                        {MONTH_FORMATTER.format(endMonthStart)}
                      </p>
                      <div className="grid grid-cols-7 gap-2">
                        {WEEK_DAYS.map((day) => (
                          <p key={day} className="text-center text-sm font-semibold text-secondary">{day}</p>
                        ))}
                        {cells.map((date, idx) => {
                          if (!date) return <div key={`end-empty-${idx}`} className="h-10" />;
                          const value = formatDateValue(startOfDay(date));
                          const isEndDate = value === endDateValue;
                          return (
                            <div key={value} className="flex items-center justify-center">
                              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                isEndDate
                                  ? "bg-olive text-primary"
                                  : "text-secondary/30"
                              }`}>
                                {date.getDate()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Billing cycle */}
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
                            {BILLING_CYCLE_LABELS[option.value] || option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Summary */}
          {isReady && endDate && (
            <div ref={summaryRef} className="rounded-3xl border border-olive/20 bg-olive/5 p-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="size-5 text-olive" />
                <p className="text-sm font-bold text-olive uppercase tracking-wide">Tóm tắt gia hạn</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-sm">
                <div>
                  <span className="text-secondary">Ngày bắt đầu</span>
                  <p className="font-semibold text-primary mt-0.5">{formatFullDate(startDate)}</p>
                </div>
                <div>
                  <span className="text-secondary">Ngày kết thúc</span>
                  <p className="font-semibold text-primary mt-0.5">{formatFullDate(endDate)}</p>
                </div>
                <div>
                  <span className="text-secondary">Thời hạn</span>
                  <p className="font-semibold text-primary mt-0.5">{durationMonths} tháng</p>
                </div>
                <div>
                  <span className="text-secondary">Chu kỳ thanh toán</span>
                  <p className="font-semibold text-primary mt-0.5">{BILLING_CYCLE_LABELS[billingCycle]}</p>
                </div>
                <div>
                  <span className="text-secondary">Giá phòng</span>
                  <p className="font-semibold text-primary mt-0.5">{formatVnd(basePrice)}/tháng</p>
                </div>
                <div>
                  <span className="text-secondary">Tiền cọc</span>
                  <p className="font-semibold text-primary mt-0.5">Giữ nguyên</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-12">
          <div className="flex items-center gap-4">
            <FileText className="size-5 text-white/60 hidden sm:block" />
            <div>
              <p className="text-sm font-semibold text-white">{contract.contract_number}</p>
              <p className="text-xs text-white/60">
                {building?.name} - Phòng {room?.room_number}
                {durationMonths ? ` · ${durationMonths} tháng` : ""}
                {billingCycle ? ` · ${BILLING_CYCLE_LABELS[billingCycle]}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/my-contracts")}
              className="hidden sm:inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white/80 transition-colors hover:border-white hover:text-white"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!isReady || submitting}
              onClick={handleSubmit}
              className={`inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold transition-colors ${
                isReady && !submitting
                  ? "bg-olive text-primary hover:bg-tea"
                  : "cursor-not-allowed bg-white/20 text-white/50"
              }`}
            >
              {submitting && <CircleNotch className="size-4 animate-spin" />}
              Xác nhận gia hạn
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ContractRenewalPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <ContractRenewalContent />
      </div>
    </LocationsProvider>
  );
}
