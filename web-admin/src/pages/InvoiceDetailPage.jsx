import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CircleNotch, Receipt,
  User as UserIcon, Envelope, Phone, House,
  CalendarDots, ClockCountdown, CurrencyDollar,
  FileText, HashStraight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/apiClient";
import { formatDate, formatDateTime, cdnUrl } from "@/lib/utils";
import {
  INVOICE_TYPE_LABELS, INVOICE_ITEM_TYPE_LABELS,
} from "@/lib/constants";
import defaultUserImg from "@/assets/default_user_img.jpg";

/* ── helpers ───────────────────────────────────────────── */

const TYPE_MAP = INVOICE_TYPE_LABELS;
const ITEM_TYPE_MAP = INVOICE_ITEM_TYPE_LABELS;

const fmtVND = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
};

/* ── reusable InfoCell (same pattern as ContractDetailPage) */

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

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/invoices/${id}`);
        setInvoice(res.data || res);
      } catch {
        setError("Không thể tải thông tin hóa đơn.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  /* ── loading state ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="animate-spin text-muted-foreground size-8" />
      </div>
    );
  }

  /* ── error state ───────────────────────────────────── */
  if (error || !invoice) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-sm text-destructive">{error || "Không tìm thấy hóa đơn."}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/invoices")}>
          Quay lại
        </Button>
      </div>
    );
  }

  /* ── derived data ──────────────────────────────────── */
  const customerName = invoice.contract?.customer
    ? `${invoice.contract.customer.last_name || ""} ${invoice.contract.customer.first_name || ""}`.trim()
    : "—";

  const roomLabel = invoice.contract?.room
    ? `${invoice.contract.room.room_number || ""}${invoice.contract.room.building?.name ? " - " + invoice.contract.room.building.name : ""}`
    : "—";

  const items = invoice.items || [];

  const hasRent = Number(invoice.room_rent) > 0;
  const hasService = Number(invoice.request_fees) > 0;
  const hasPenalty = Number(invoice.penalty_fees) > 0;
  const hasDiscount = Number(invoice.discount_amount) > 0;
  const hasRefund = Number(invoice.refund_amount) > 0;

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 pb-16">
      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/invoices")}
          className="mt-0.5 size-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-lg font-bold">{invoice.invoice_number}</h1>
          </div>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <Receipt className="size-3.5" />
            {TYPE_MAP[invoice.invoice_type] || invoice.invoice_type}
          </p>
        </div>
      </div>

      {/* ── Thông tin hóa đơn ───────────────────────── */}
      <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
        <div className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Thông tin hóa đơn
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCell
              icon={CalendarDots}
              label="Kỳ thanh toán"
              value={`${formatDate(invoice.billing_period_start)} → ${formatDate(invoice.billing_period_end)}`}
            />
            <InfoCell
              icon={ClockCountdown}
              label="Hạn thanh toán"
              value={formatDate(invoice.due_date)}
            />
            <InfoCell
              icon={HashStraight}
              label="Ngày tạo"
              value={formatDateTime(invoice.created_at)}
            />
          </div>
        </div>

        {/* Status banner - visually distinct inside the card */}
        {invoice.status === "PAID" && (
          <div className="border-t border-success/30 bg-success/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-sm font-semibold text-success">Đã thanh toán</span>
            </div>
            {invoice.paid_at && (
              <span className="text-xs text-success/80">
                Thanh toán lúc: {formatDateTime(invoice.paid_at)}
              </span>
            )}
          </div>
        )}
        {invoice.status === "OVERDUE" && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-destructive" />
              <span className="text-sm font-semibold text-destructive">Quá hạn thanh toán</span>
            </div>
            <span className="text-xs text-destructive/80">
              Hạn: {formatDate(invoice.due_date)}
            </span>
          </div>
        )}
        {invoice.status === "UNPAID" && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Chưa thanh toán</span>
            </div>
            <span className="text-xs text-amber-600/80 dark:text-amber-400/80">
              Hạn: {formatDate(invoice.due_date)}
            </span>
          </div>
        )}
        {invoice.status === "CANCELLED" && (
          <div className="border-t border-primary/30 bg-primary/10 px-5 py-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-sm font-semibold text-primary">Đã hủy</span>
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
            {invoice.contract?.customer ? (
              <div className="flex items-start gap-3">
                <img
                  src={cdnUrl(invoice.contract.customer.avatar_url) || defaultUserImg}
                  alt=""
                  className="size-11 rounded-lg object-cover ring-1 ring-border shrink-0"
                  onError={(e) => { e.target.src = defaultUserImg; }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{customerName}</p>
                  {invoice.contract.customer.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Envelope className="size-3" /> {invoice.contract.customer.email}
                    </p>
                  )}
                  {invoice.contract.customer.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="size-3" /> {invoice.contract.customer.phone}
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
              {invoice.contract?.contract_number && (
                <p className="text-xs text-muted-foreground">
                  HĐ: {invoice.contract.contract_number}
                </p>
              )}
              <div className="flex items-center gap-3">
                {invoice.contract?.room?.id && (
                  <Button
                    variant="link" size="sm"
                    className="px-0 h-auto text-xs"
                    onClick={() => navigate(`/rooms/${invoice.contract.room.id}`)}
                  >
                    Xem chi tiết phòng →
                  </Button>
                )}
                {invoice.contract?.id && (
                  <Button
                    variant="link" size="sm"
                    className="px-0 h-auto text-xs"
                    onClick={() => navigate(`/contracts/${invoice.contract.id}`)}
                  >
                    Xem hợp đồng →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tổng hợp chi phí ────────────────────────── */}
      <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
        <div className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <CurrencyDollar className="size-4 text-primary" /> Tổng hợp chi phí
          </h2>
          <div className="space-y-2.5">
            {hasRent && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiền thuê</span>
                <span className="font-medium">{fmtVND(invoice.room_rent)}</span>
              </div>
            )}
            {hasService && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phí dịch vụ</span>
                <span className="font-medium">{fmtVND(invoice.request_fees)}</span>
              </div>
            )}
            {hasPenalty && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phí phạt</span>
                <span className="font-medium">{fmtVND(invoice.penalty_fees)}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Giảm giá</span>
                <span className="font-medium text-success">-{fmtVND(invoice.discount_amount)}</span>
              </div>
            )}
            {hasRefund && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hoàn tiền</span>
                <span className="font-medium text-success">-{fmtVND(invoice.refund_amount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-semibold">Tổng cộng</span>
              <span className="text-lg font-bold">{fmtVND(invoice.total_amount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Chi tiết mục (line items) ───────────────── */}
      {items.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-3">Chi tiết ({items.length} mục)</h2>
          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-center w-20">SL</TableHead>
                  <TableHead className="text-right w-32">Đơn giá</TableHead>
                  <TableHead className="text-right pr-4 w-32">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 text-muted-foreground text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {ITEM_TYPE_MAP[item.item_type] || item.item_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {item.quantity ?? 1}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {fmtVND(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right pr-4 font-medium text-sm">
                      {fmtVND(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* ── Ghi chú ─────────────────────────────────── */}
      {invoice.notes && (
        <section>
          <h2 className="text-base font-bold mb-3">Ghi chú</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">{invoice.notes}</p>
          </div>
        </section>
      )}

      {/* ── Timestamps ──────────────────────────────── */}
      {(invoice.created_at || invoice.updated_at) && (
        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
          {invoice.created_at && <span>Tạo lúc: {formatDateTime(invoice.created_at)}</span>}
          {invoice.updated_at && <span>Cập nhật: {formatDateTime(invoice.updated_at)}</span>}
        </div>
      )}
    </div>
  );
}
