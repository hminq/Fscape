import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import { LocationsProvider } from "@/contexts/LocationsContext";

function PaymentResultContent() {
  const [searchParams] = useSearchParams();

  const payosCode = searchParams.get("code");
  const payosStatus = searchParams.get("status");
  const cancel = searchParams.get("cancel");

  const isSuccess = payosCode === "00" && payosStatus === "PAID";
  const isCancelled = cancel === "true" || payosStatus === "CANCELLED";

  const paymentType = searchParams.get("type") || "";
  const isInvoicePayment = paymentType === "invoice";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      {isSuccess ? (
        <>
          <CheckCircle className="h-20 w-20 text-olive" strokeWidth={1.5} />
          <h1 className="mt-6 text-4xl font-bold text-primary">Thanh toán thành công</h1>
          <p className="mt-3 text-secondary">
            {isInvoicePayment
              ? "Hóa đơn của bạn đã được thanh toán thành công."
              : "Đặt cọc của bạn đã được ghi nhận. Hợp đồng sẽ được gửi qua email để bạn ký xác nhận."}
          </p>
        </>
      ) : (
        <>
          <XCircle className="h-20 w-20 text-red-500" strokeWidth={1.5} />
          <h1 className="mt-6 text-4xl font-bold text-primary">
            {isCancelled ? "Đã hủy thanh toán" : "Thanh toán thất bại"}
          </h1>
          <p className="mt-3 text-secondary">
            {isCancelled
              ? "Bạn đã hủy giao dịch. Bạn có thể thử lại bất cứ lúc nào."
              : "Giao dịch không thành công. Vui lòng thử lại."}
          </p>
        </>
      )}

      <div className="mt-8 flex items-center gap-3">
        <Link
          to="/"
          className="h-11 rounded-full bg-primary/10 px-6 text-sm font-semibold leading-[2.75rem] text-primary"
        >
          Trang chủ
        </Link>
        {isInvoicePayment ? (
          <Link
            to="/my-invoices"
            className="h-11 rounded-full bg-primary px-6 text-sm font-semibold leading-[2.75rem] text-white"
          >
            Xem hóa đơn
          </Link>
        ) : (
          <Link
            to="/my-bookings"
            className="h-11 rounded-full bg-primary px-6 text-sm font-semibold leading-[2.75rem] text-white"
          >
            Đơn đặt phòng của tôi
          </Link>
        )}
      </div>
    </section>
  );
}

export default function PaymentResultPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white">
        <AppNavbar />
        <PaymentResultContent />
      </div>
    </LocationsProvider>
  );
}
