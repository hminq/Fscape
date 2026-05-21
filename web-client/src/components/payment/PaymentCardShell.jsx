import { PAYMENT_TEXT } from "@/lib/payment";

export default function PaymentCardShell({
  title,
  instruction = PAYMENT_TEXT.qrInstruction,
  children,
}) {
  return (
    <div className="rounded-2xl border border-muted/20 bg-white p-4">
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      <p className="mt-1 text-xs text-secondary">{instruction}</p>
      {children}
    </div>
  );
}
