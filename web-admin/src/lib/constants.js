/* ── Role labels ────────────────────────────── */

export const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  BUILDING_MANAGER: "Quản lý tòa nhà",
  STAFF: "Nhân viên",
  RESIDENT: "Cư dân",
  CUSTOMER: "Khách hàng",
};

/* ── Role display (CSS-only, no React components) ───── */

export const ROLE_STYLE_MAP = {
  ADMIN: { color: "text-chart-1 border-chart-1/20 bg-chart-1/5", dot: "bg-chart-1" },
  BUILDING_MANAGER: { color: "text-chart-2 border-chart-2/20 bg-chart-2/5", dot: "bg-chart-2" },
  STAFF: { color: "text-chart-3 border-chart-3/20 bg-chart-3/5", dot: "bg-chart-3" },
  RESIDENT: { color: "text-chart-4 border-chart-4/20 bg-chart-4/5", dot: "bg-chart-4" },
  CUSTOMER: { color: "text-chart-5 border-chart-5/20 bg-chart-5/5", dot: "bg-chart-5" },
};

export const ROLE_ORDER = ["ADMIN", "BUILDING_MANAGER", "STAFF", "RESIDENT", "CUSTOMER"];

/* ── Request type labels ────────────────────── */

export const REQUEST_TYPE_LABELS = {
  REPAIR: "Sửa chữa",
  CLEANING: "Vệ sinh",
  COMPLAINT: "Khiếu nại",
  ASSET_CHANGE: "Đổi tài sản",
  CHECKOUT: "Trả phòng",
  OTHER: "Khác",
};

export const REQUEST_TYPES = Object.keys(REQUEST_TYPE_LABELS);

/* ── Request status ────────────────────────── */

export const REQUEST_STATUS_MAP = {
  PENDING: { label: "Chờ xử lý", dot: "bg-chart-4", text: "text-chart-4" },
  ASSIGNED: { label: "Đã phân công", dot: "bg-chart-2", text: "text-chart-2" },
  PRICE_PROPOSED: { label: "Đã báo giá", dot: "bg-chart-3", text: "text-chart-3" },
  APPROVED: { label: "Đã duyệt", dot: "bg-chart-1", text: "text-chart-1" },
  IN_PROGRESS: { label: "Đang xử lý", dot: "bg-primary", text: "text-primary" },
  DONE: { label: "Hoàn thành", dot: "bg-success", text: "text-success" },
  COMPLETED: { label: "Đã đóng", dot: "bg-muted-foreground/60", text: "text-muted-foreground" },
  REVIEWED: { label: "Đang xem xét", dot: "bg-chart-5", text: "text-chart-5" },
  REFUNDED: { label: "Đã hoàn tiền", dot: "bg-destructive", text: "text-destructive" },
  CANCELLED: { label: "Đã hủy", dot: "bg-destructive/60", text: "text-destructive" },
};

/* ── Contract status ───────────────────────── */

export const CONTRACT_STATUS_MAP = {
  PENDING_CUSTOMER_SIGNATURE: { label: "Chờ KH ký", dot: "bg-chart-2", text: "text-chart-2", badge: "bg-chart-2/15 text-chart-2" },
  PENDING_MANAGER_SIGNATURE: { label: "Chờ QL ký", dot: "bg-chart-4", text: "text-chart-4", badge: "bg-chart-4/15 text-chart-4" },
  PENDING_FIRST_PAYMENT: { label: "Chờ thanh toán", dot: "bg-chart-3", text: "text-chart-3", badge: "bg-chart-3/15 text-chart-3" },
  PENDING_CHECK_IN: { label: "Chờ nhận phòng", dot: "bg-chart-1", text: "text-chart-1", badge: "bg-chart-1/15 text-chart-1" },
  ACTIVE: { label: "Đang hiệu lực", dot: "bg-success", text: "text-success", badge: "bg-success/15 text-success" },
  EXPIRING_SOON: { label: "Sắp hết hạn", dot: "bg-amber-500", text: "text-amber-500", badge: "bg-amber-500/15 text-amber-500" },
  FINISHED: { label: "Đã kết thúc", dot: "bg-primary", text: "text-primary", badge: "bg-primary/15 text-primary" },
  TERMINATED: { label: "Đã chấm dứt", dot: "bg-destructive", text: "text-destructive", badge: "bg-destructive/15 text-destructive" },
};

/* ── Settlement status ─────────────────────── */

export const SETTLEMENT_STATUS_MAP = {
  FINALIZED: { label: "Chờ xử lý", dot: "bg-amber-500", text: "text-amber-500" },
  CLOSED:    { label: "Đã đóng",   dot: "bg-success",   text: "text-success" },
};

/* ── Invoice status ────────────────────────── */

export const INVOICE_STATUS_MAP = {
  UNPAID: { label: "Chưa thanh toán", dot: "bg-amber-500", text: "text-amber-500" },
  PAID: { label: "Đã thanh toán", dot: "bg-success", text: "text-success" },
  OVERDUE: { label: "Quá hạn", dot: "bg-destructive", text: "text-destructive" },
  CANCELLED: { label: "Đã hủy", dot: "bg-primary", text: "text-primary" },
};

/* ── Invoice type labels ───────────────────── */

export const INVOICE_TYPE_LABELS = {
  RENT: "Tiền thuê",
  SERVICE: "Phí dịch vụ",
  SETTLEMENT: "Thanh toán cuối kỳ",
};

export const INVOICE_ITEM_TYPE_LABELS = {
  RENT: "Tiền thuê",
  REQUEST: "Phí dịch vụ",
  PENALTY: "Phí phạt",
  REFUND: "Hoàn tiền",
};

/* ── Billing cycle labels ──────────────────── */

export const BILLING_CYCLE_LABELS = {
  CYCLE_1M: "1 tháng",
  CYCLE_3M: "3 tháng",
  CYCLE_6M: "6 tháng",
  ALL_IN: "Trọn gói",
};

/* ── Room status ──────────────────────────── */

export const ROOM_STATUS_MAP = {
  AVAILABLE: { label: "Còn trống", dot: "bg-success", text: "text-success", bg: "bg-success" },
  OCCUPIED: { label: "Đã thuê", dot: "bg-primary", text: "text-primary", bg: "bg-primary" },
  MAINTENANCE: { label: "Bảo trì", dot: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500" },
  LOCKED: { label: "Đã khóa", dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive" },
};

/* ── Asset status ─────────────────────────── */

export const ASSET_STATUS_MAP = {
  AVAILABLE: { label: "Sẵn sàng", dot: "bg-success", text: "text-success" },
  IN_USE: { label: "Đang sử dụng", dot: "bg-primary", text: "text-primary" },
};

/* ── Asset history action labels ──────────── */

export const ASSET_HISTORY_ACTION_LABELS = {
  INITIAL_CREATE: "Tạo mới",
  CHECK_IN: "Nhận phòng",
  CHECK_OUT: "Trả phòng",
  MOVE: "Di chuyển",
  UPDATE_INFO: "Cập nhật",
};

/* ── Term type labels ────────────────────── */

export const TERM_TYPE_LABELS = {
  FIXED_TERM: "Có thời hạn",
  INDEFINITE: "Không thời hạn",
};

/* ── Inspection type labels ────────────────── */

export const INSPECTION_TYPE_LABELS = {
  CHECK_IN: "Nhận phòng",
  CHECK_OUT: "Trả phòng",
};

/* ── Inspection status ────────────────────── */

export const INSPECTION_STATUS_MAP = {
  NO_DISCREPANCY: { label: "Đầy đủ", dot: "bg-success", text: "text-success" },
  SETTLED: { label: "Đã xử lý", dot: "bg-primary", text: "text-primary" },
  PENDING_SETTLEMENT: { label: "Chờ xử lý", dot: "bg-amber-500", text: "text-amber-500" },
};

/* ── Asset condition ──────────────────────── */

export const ASSET_CONDITION_MAP = {
  GOOD: { label: "Tốt", color: "text-success", bg: "bg-success/15" },
  BROKEN: { label: "Hỏng", color: "text-destructive", bg: "bg-destructive/15" },
};

/* ── Booking status ───────────────────────── */

export const BOOKING_STATUS_MAP = {
  PENDING: { label: "Chờ thanh toán cọc", dot: "bg-amber-500", text: "text-amber-500" },
  DEPOSIT_PAID: { label: "Đã cọc", dot: "bg-chart-2", text: "text-chart-2" },
  CONVERTED: { label: "Đã chuyển HĐ", dot: "bg-success", text: "text-success" },
  CANCELLED: { label: "Đã hủy", dot: "bg-destructive", text: "text-destructive" },
};

/* ── Notification type labels ────────────── */

export const NOTIFICATION_TYPE_LABELS = {
  BM_ANNOUNCEMENT: "Thông báo BM",
  REQUEST_CREATED: "Yêu cầu mới",
  REQUEST_CREATED_SUCCESS: "Tạo yêu cầu thành công",
  REQUEST_ASSIGNED: "Phân công yêu cầu",
  REQUEST_STATUS_CHANGED: "Cập nhật yêu cầu",
  CONTRACT_TERMINATED: "Hợp đồng bị chấm dứt",
  CONTRACT_TERMINATION_INITIATED: "Khởi tạo chấm dứt hợp đồng",
  CHECKOUT_REQUEST_ASSIGNED: "Phân công trả phòng",
  INVOICE: "Hóa đơn",

  // Legacy/compatibility types
  CONTRACT_STATUS_CHANGED: "Cập nhật hợp đồng",
  INVOICE_CREATED: "Hóa đơn mới",
  PAYMENT_RECEIVED: "Thanh toán",
  SYSTEM: "Hệ thống",
};

/* ── Gender labels ───────────────────────── */

export const GENDER_LABELS = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};
