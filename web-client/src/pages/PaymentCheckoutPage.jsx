import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CircleNotch, ArrowLeft, CreditCard, Receipt, Clock } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import PaymentCardShell from "@/components/payment/PaymentCardShell";
import PaymentSummaryCard from "@/components/payment/PaymentSummaryCard";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { buildPaymentCancelUrl, buildPaymentSuccessUrl, PAYMENT_TEXT } from "@/lib/payment";
import { toast } from "@/lib/toast";
import { usePayOSEmbeddedCheckout } from "@/hooks/usePayOSEmbeddedCheckout";
import { usePaymentCountdown } from "@/hooks/usePaymentCountdown";

function PaymentCheckoutContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const type = searchParams.get("type"); // "booking" or "invoice"
  const bookingId = searchParams.get("booking_id");
  const invoiceId = searchParams.get("invoice_id");
  const expiresAt = searchParams.get("expires_at"); // ISO date from booking

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Create payment link on mount
  useEffect(() => {
    if (!token) return;

    async function createPayment() {
      try {
        setLoading(true);
        setError("");

        let res;
        if (type === "booking" && bookingId) {
          res = await api.post("/api/payment/create-booking-payos", { booking_id: bookingId });
        } else if (type === "invoice" && invoiceId) {
          res = await api.post("/api/payment/create-invoice-payos", { invoice_id: invoiceId });
        } else {
          throw new Error("Thiếu thông tin thanh toán.");
        }

        const payload = res?.data ?? res;
        const url = payload?.checkout_url;
        if (!url) throw new Error(PAYMENT_TEXT.missingCheckoutUrl);

        setCheckoutUrl(url);
        setPaymentInfo({
          type,
          amount: payload?.amount,
          orderCode: payload?.order_code,
          description: type === "booking" ? "Đặt cọc phòng" : "Thanh toán hóa đơn",
        });
      } catch (err) {
        setError(err.message || "Không thể tạo thanh toán.");
      } finally {
        setLoading(false);
      }
    }

    createPayment();
  }, [token, type, bookingId, invoiceId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <CircleNotch className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-secondary">Đang khởi tạo thanh toán...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <p className="mt-2 text-sm text-red-500">Vui lòng thử lại hoặc quay lại trang trước.</p>
        </div>
        <Link
          to={type === "invoice" ? "/my-invoices" : "/my-bookings"}
          className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to={type === "invoice" ? "/my-invoices" : "/my-bookings"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {type === "invoice" ? "Quay lại hóa đơn" : "Quay lại đặt phòng"}
      </Link>

      <h1 className="text-3xl font-bold text-primary">
        {type === "invoice" ? "Thanh toán hóa đơn" : "Đặt cọc phòng"}
      </h1>

      {checkoutUrl && (
        <EmbeddedCheckout
          checkoutUrl={checkoutUrl}
          navigate={navigate}
          type={type}
          expiresAt={expiresAt}
          paymentInfo={paymentInfo}
        />
      )}
    </section>
  );
}

function EmbeddedCheckout({ checkoutUrl, navigate, type, expiresAt, paymentInfo }) {
  const isBooking = type === "booking";

  usePayOSEmbeddedCheckout({
    checkoutUrl,
    elementId: "payos-checkout-standalone",
    onSuccess: () => {
      navigate(buildPaymentSuccessUrl({ type }));
    },
    onCancel: () => {
      navigate(buildPaymentCancelUrl({ type }));
    },
  });

  const { isUrgent, timeDisplay } = usePaymentCountdown({
    expiresAt,
    defaultSeconds: isBooking ? 3600 : 86400,
    onExpire: () => {
      toast.warning("Giao dịch đã hết hạn.");
      navigate(type === "invoice" ? "/my-invoices" : "/my-bookings");
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
          {isBooking ? "Đơn đặt cọc sẽ hết hạn sau" : "Hóa đơn sẽ hết hạn sau"}
        </span>
        <span className={`rounded-lg px-3 py-1 font-mono text-xl font-bold tabular-nums tracking-wider ${isUrgent ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"}`}>
          {timeDisplay}
        </span>
      </div>

      {/* Payment info summary */}
      {paymentInfo && (
        <PaymentSummaryCard
          title={paymentInfo.description}
          orderCode={paymentInfo.orderCode}
          amount={paymentInfo.amount}
        />
      )}

      <PaymentCardShell title={isBooking ? "Thanh toán tiền cọc" : "Thanh toán hóa đơn"}>
        <div id="payos-checkout-standalone" className="payos-embed-container mt-4" />
      </PaymentCardShell>
    </div>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <PaymentCheckoutContent />
      </div>
    </LocationsProvider>
  );
}
