/* ── Contract status labels ─────────────────── */

export const CONTRACT_STATUS_LABELS = {
  PENDING_CUSTOMER_SIGNATURE: "Chờ bạn ký",
  PENDING_MANAGER_SIGNATURE: "Chờ quản lý ký",
  PENDING_FIRST_PAYMENT: "Chờ thanh toán kỳ đầu",
  PENDING_CHECK_IN: "Chờ nhận phòng",
  ACTIVE: "Đang hiệu lực",
  EXPIRING_SOON: "Sắp hết hạn",
  FINISHED: "Đã kết thúc",
  TERMINATED: "Đã chấm dứt",
};

/* ── My Rooms status labels ────────────────── */

export const MY_ROOM_STATUS_LABELS = {
  PENDING_CHECK_IN: { text: "Chờ nhận phòng", className: "bg-cyan-100 text-cyan-700" },
  ACTIVE: { text: "Đang thuê", className: "bg-green-100 text-green-700" },
  EXPIRING_SOON: { text: "Sắp hết hạn", className: "bg-amber-100 text-amber-700" },
};

/* ── Billing cycle labels ──────────────────── */

export const BILLING_CYCLE_LABELS = {
  CYCLE_1M: "Hàng tháng",
  CYCLE_3M: "3 tháng",
  CYCLE_6M: "6 tháng",
  ALL_IN: "Trả trọn gói",
};

/* ── Gender labels ─────────────────────────── */

export const GENDER_LABELS = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};
