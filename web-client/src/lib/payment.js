export function buildPaymentSuccessUrl({ type } = {}) {
  const typeQuery = type === "invoice" ? "&type=invoice" : "";
  return `/payment/result?code=00&status=PAID${typeQuery}`;
}

export function buildPaymentCancelUrl({ type, cancel = true } = {}) {
  const cancelQuery = cancel ? "&cancel=true" : "";
  const typeQuery = type === "invoice" ? "&type=invoice" : "";
  return `/payment/result?code=01&status=CANCELLED${cancelQuery}${typeQuery}`;
}

export const PAYMENT_TEXT = {
  missingCheckoutUrl: "Không nhận được liên kết thanh toán từ máy chủ.",
  qrInstruction: "Quét mã QR bằng ứng dụng ngân hàng để hoàn tất.",
};
