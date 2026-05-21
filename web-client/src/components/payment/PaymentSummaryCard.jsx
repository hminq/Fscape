import { formatVnd } from "@/lib/formatters";

export default function PaymentSummaryCard({
  title,
  subtitle,
  orderCode,
  amount,
  className = "mb-4",
}) {
  return (
    <div className={`${className} rounded-2xl border border-muted/20 bg-white px-4 py-3.5`}>
      <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs leading-relaxed text-secondary/70">{subtitle}</p>
          )}
          {orderCode && (
            <p className="mt-1 text-xs text-secondary/70">
              Mã đơn: <span className="font-mono font-medium text-primary">{orderCode}</span>
            </p>
          )}
        </div>
        {amount != null && (
          <div className="self-center rounded-2xl bg-primary/5 px-3.5 py-2 text-left md:min-w-[152px] md:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary/70">Số tiền</p>
            <p className="mt-1 text-[1.8rem] font-bold leading-none text-primary">{formatVnd(amount)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
