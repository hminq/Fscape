import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, CircleNotch, FileText, DownloadSimple, FilePdf,
  User as UserIcon, Envelope, House, CalendarDots,
  CurrencyDollar, ClockCountdown, PencilSimple,
  PencilLine as PenLine, ClipboardText, CaretDown, CaretUp,
  BellRinging, Scales, Prohibit, CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { formatDate, formatDateTime, cdnUrl, cleanContractHtml } from "@/lib/utils";
import { CONTRACT_STATUS_MAP, BILLING_CYCLE_LABELS, INSPECTION_STATUS_MAP, ASSET_CONDITION_MAP, SETTLEMENT_STATUS_MAP } from "@/lib/constants";
import TerminateContractDialog from "@/components/TerminateContractDialog";
import defaultUserImg from "@/assets/default_user_img.jpg";

/* ── helpers ───────────────────────────────────────────── */

const STATUS_MAP = CONTRACT_STATUS_MAP;
const BILLING_CYCLE_LABEL = BILLING_CYCLE_LABELS;

const fmtVND = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
};


const CONTRACT_STYLES = `
  .contract-render img[src*="cloudinary"] {
    transform: scale(3);
    transform-origin: left top;
    margin-bottom: 80px;
  }
  .contract-render img[alt*="Signature"],
  .contract-render img[alt*="signature"] {
    transform: none !important;
    margin-bottom: 0 !important;
  }
`;

/** Map status → reminder config (only statuses that support manual reminders) */
const REMINDER_CONFIG = {
  PENDING_CUSTOMER_SIGNATURE: { type: "SIGN", label: "Nhắc ký hợp đồng", desc: "Nhắc khách hàng ký hợp đồng" },
  PENDING_FIRST_PAYMENT:      { type: "PAY_FIRST_RENT", label: "Nhắc thanh toán", desc: "Nhắc khách hàng thanh toán tiền phòng kỳ đầu" },
  PENDING_CHECK_IN:           { type: "CHECK_IN", label: "Nhắc nhận phòng", desc: "Nhắc khách hàng nhận phòng" },
  EXPIRING_SOON:              { type: "EXPIRING", label: "Nhắc gia hạn", desc: "Nhắc khách hàng gia hạn hợp đồng" },
};

/** Map status → banner color classes */
const STATUS_BANNER_COLORS = {
  ACTIVE:                     { border: "border-success/30",     bg: "bg-success/10",     dot: "bg-success",     text: "text-success" },
  FINISHED:                   { border: "border-primary/30",     bg: "bg-primary/10",     dot: "bg-primary",     text: "text-primary" },
  EXPIRING_SOON:              { border: "border-amber-500/30",   bg: "bg-amber-500/10",   dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400" },
  PENDING_CUSTOMER_SIGNATURE: { border: "border-chart-2/30",     bg: "bg-chart-2/10",     dot: "bg-chart-2",     text: "text-chart-2" },
  PENDING_MANAGER_SIGNATURE:  { border: "border-chart-4/30",     bg: "bg-chart-4/10",     dot: "bg-chart-4",     text: "text-chart-4" },
  PENDING_FIRST_PAYMENT:      { border: "border-chart-3/30",     bg: "bg-chart-3/10",     dot: "bg-chart-3",     text: "text-chart-3" },
  PENDING_CHECK_IN:           { border: "border-chart-1/30",     bg: "bg-chart-1/10",     dot: "bg-chart-1",     text: "text-chart-1" },
  TERMINATED:                 { border: "border-destructive/30", bg: "bg-destructive/10", dot: "bg-destructive", text: "text-destructive" },
};

/* ── reusable components ───────────────────────────────── */

function InfoCell({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="size-3 text-muted-foreground" />}
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-semibold">{value || "—"}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SignatureCard({ label, signedAt, signatureUrl, name }) {
  const signed = !!signedAt;
  return (
    <div className={`rounded-xl border p-4 ${signed ? "border-success/30 bg-success/5" : "border-border bg-muted/20"}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${signed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {signed ? "Đã ký" : "Chưa ký"}
        </span>
      </div>
      {name && <p className="text-sm font-semibold mb-1">{name}</p>}
      {signed && (
        <p className="text-xs text-muted-foreground">
          Ký lúc: {formatDateTime(signedAt)}
        </p>
      )}
      {signatureUrl && (
        <div className="mt-2 rounded-lg border border-border bg-card p-2">
          <img src={signatureUrl} alt="Chữ ký" className="max-h-16 mx-auto object-contain" />
        </div>
      )}
    </div>
  );
}

function InspectionCard({ inspection }) {
  const [expanded, setExpanded] = useState(false);
  const isCheckOut = inspection.type === "CHECK_OUT";
  const st = INSPECTION_STATUS_MAP[inspection.status];
  const performerName = inspection.performer
    ? `${inspection.performer.last_name || ""} ${inspection.performer.first_name || ""}`.trim()
    : "—";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          {st && (
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Người thực hiện: <span className="font-medium text-foreground">{performerName}</span>
            {" · "}{formatDateTime(inspection.created_at)}
          </p>
          {isCheckOut && Number(inspection.penalty_total) > 0 && (
            <p className="text-xs text-destructive font-medium">
              Phạt: {fmtVND(inspection.penalty_total)}
            </p>
          )}
        </div>
        {inspection.items?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 size-8 rounded-lg border border-border bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            {expanded ? <CaretUp className="size-4" /> : <CaretDown className="size-4" />}
          </button>
        )}
      </div>

      {expanded && inspection.items?.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {inspection.items.map((item) => {
            const cond = ASSET_CONDITION_MAP[item.condition];
            return (
              <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{item.asset?.name || item.qr_code}</span>
                  {item.asset?.asset_type?.name && (
                    <span className="text-muted-foreground ml-1.5">({item.asset.asset_type.name})</span>
                  )}
                  {item.note && <span className="text-muted-foreground ml-1.5">— {item.note}</span>}
                </div>
                {cond && (
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cond.bg} ${cond.color}`}>
                    {cond.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default function BMContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [inspLoading, setInspLoading] = useState(false);
  const [settlement, setSettlement] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [closeSettlementOpen, setCloseSettlementOpen] = useState(false);
  const [closeSettlementLoading, setCloseSettlementLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const settlementRef = useRef(null);

  const fetchContract = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/contracts/${id}`);
      setContract(res.data || res);
    } catch {
      setError("Không thể tải thông tin hợp đồng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [id]);

  useEffect(() => {
    if (!contract?.room?.id || !contract?.id) return;
    const fetchInspections = async () => {
      setInspLoading(true);
      try {
        const res = await api.get(`/api/inspections?room_id=${contract.room.id}&contract_id=${contract.id}`);
        setInspections(res.data || res || []);
      } catch {
        /* silent - inspections are supplementary */
      } finally {
        setInspLoading(false);
      }
    };
    fetchInspections();
  }, [contract?.room?.id, contract?.id]);

  useEffect(() => {
    if (!id || !contract?.status) return;
    if (contract.status !== "FINISHED") {
      setSettlement(null);
      setSettlementLoading(false);
      return;
    }
    const fetchSettlement = async () => {
      setSettlementLoading(true);
      try {
        const res = await api.get(`/api/settlements/contract/${id}`);
        setSettlement(res.data || null);
      } catch {
        /* silent - settlement may not exist yet */
      } finally {
        setSettlementLoading(false);
      }
    };
    fetchSettlement();
  }, [id, contract?.status]);

  useEffect(() => {
    if (!settlementLoading && settlement && searchParams.get("scrollTo") === "settlement") {
      setTimeout(() => {
        settlementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [settlementLoading, settlement, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="animate-spin text-muted-foreground size-8" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-sm text-destructive">{error || "Không tìm thấy hợp đồng."}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/building-manager/contracts")}>Quay lại</Button>
      </div>
    );
  }

  const st = STATUS_MAP[contract.status] || STATUS_MAP.ACTIVE;
  const bannerColors = STATUS_BANNER_COLORS[contract.status];
  const isPendingManagerSign = contract.status === "PENDING_MANAGER_SIGNATURE";
  const reminderCfg = REMINDER_CONFIG[contract.status];
  const canTerminate = !["TERMINATED", "FINISHED"].includes(contract.status);

  const customerName = contract.customer
    ? `${contract.customer.last_name || ""} ${contract.customer.first_name || ""}`.trim()
    : "—";

  const managerName = contract.manager
    ? `${contract.manager.last_name || ""} ${contract.manager.first_name || ""}`.trim()
    : null;

  const roomLabel = contract.room
    ? `${contract.room.room_number || ""}${contract.room.building?.name ? " - " + contract.room.building.name : ""}`
    : "—";

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 pb-16">
      <style>{CONTRACT_STYLES}</style>

      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/building-manager/contracts")}
          className="mt-0.5 size-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-lg font-bold">{contract.contract_number}</h1>
          </div>
          <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-3.5" /> Hợp đồng thuê phòng
            {contract.renewed_from_contract_id && (
              <span className="text-[11px] text-muted-foreground/70 ml-1">(Gia hạn)</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          {contract.rendered_content && (
            <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <FilePdf className="size-4" /> Xem hợp đồng
            </Button>
          )}
          {contract.pdf_url && (
            <Button className="gap-2" asChild>
              <a href={cdnUrl(contract.pdf_url)} target="_blank" rel="noopener noreferrer">
                <DownloadSimple className="size-4" /> Tải PDF
              </a>
            </Button>
          )}
          {reminderCfg && (
            <Button variant="outline" className="gap-2" onClick={() => setReminderOpen(true)}>
              <BellRinging className="size-4" /> {reminderCfg.label}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canTerminate && (
            <Button variant="destructive" className="gap-2" onClick={() => setTerminateOpen(true)}>
              <Prohibit className="size-4" /> Chấm dứt
            </Button>
          )}
          {isPendingManagerSign && (
            <Button className="gap-2" onClick={() => navigate(`/building-manager/contracts/${contract.id}/sign`)}>
              <PenLine className="size-4" /> Ký hợp đồng
            </Button>
          )}
        </div>
      </div>

      {/* Contract Info Card */}
      <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
        <div className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Thông tin hợp đồng
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoCell icon={CalendarDots} label="Ngày bắt đầu" value={formatDate(contract.start_date)} />
            <InfoCell icon={CalendarDots} label="Ngày kết thúc" value={formatDate(contract.end_date)} />
            <InfoCell icon={ClockCountdown} label="Thời hạn" value={contract.duration_months ? `${contract.duration_months} tháng` : "—"} />
            <InfoCell icon={CurrencyDollar} label="Tiền thuê" value={fmtVND(contract.base_rent)} />
            <InfoCell icon={CurrencyDollar} label="Tiền cọc" value={fmtVND(contract.deposit_amount)} />
            <InfoCell icon={PencilSimple} label="Chu kỳ thanh toán" value={BILLING_CYCLE_LABEL[contract.billing_cycle] || contract.billing_cycle || "—"} />
          </div>
        </div>

        {/* Status banner */}
        {bannerColors && (
          <div className={`border-t ${bannerColors.border} ${bannerColors.bg} px-5 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${bannerColors.dot}`} />
              <span className={`text-sm font-semibold ${bannerColors.text}`}>{st.label}</span>
            </div>
            {contract.status === "EXPIRING_SOON" && contract.end_date && (
              <span className="text-xs text-amber-600/80 dark:text-amber-400/80">
                Kết thúc: {formatDate(contract.end_date)}
              </span>
            )}
            {contract.signature_expires_at && (contract.status === "PENDING_CUSTOMER_SIGNATURE" || contract.status === "PENDING_MANAGER_SIGNATURE") && (
              <span className={`text-xs ${bannerColors.text} opacity-80`}>
                Hạn ký: {formatDateTime(contract.signature_expires_at)}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Customer & Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
          <div className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <UserIcon className="size-4 text-primary" /> Khách hàng
            </h2>
            {contract.customer ? (
              <div className="flex items-start gap-3">
                <img
                  src={cdnUrl(contract.customer.avatar_url) || defaultUserImg}
                  alt=""
                  className="size-11 rounded-lg object-cover ring-1 ring-border shrink-0"
                  onError={(e) => { e.target.src = defaultUserImg; }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{customerName}</p>
                  {contract.customer.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Envelope className="size-3" /> {contract.customer.email}
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
              {contract.room?.room_type?.name && (
                <p className="text-xs text-muted-foreground">Loại: {contract.room.room_type.name}</p>
              )}
              {contract.room?.id && (
                <Button variant="link" size="sm" className="px-0 h-auto text-xs" onClick={() => navigate(`/building-manager/rooms/${contract.room.id}`)}>
                  Xem chi tiết phòng →
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Signatures */}
      <section>
        <h2 className="text-base font-bold mb-3">Chữ ký</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SignatureCard
            label="Chữ ký khách hàng"
            signedAt={contract.customer_signed_at}
            signatureUrl={cdnUrl(contract.customer_signature_url)}
            name={customerName}
          />
          <SignatureCard
            label="Chữ ký quản lý"
            signedAt={contract.manager_signed_at}
            signatureUrl={cdnUrl(contract.manager_signature_url)}
            name={managerName}
          />
        </div>
      </section>

      {/* Inspections */}
      <section>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <ClipboardText className="size-4 text-primary" /> Kiểm tra tài sản
        </h2>
        {inspLoading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="animate-spin text-muted-foreground size-5" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nhận phòng (Check-in)</p>
              {inspections.find((i) => i.type === "CHECK_IN") ? (
                <InspectionCard inspection={inspections.find((i) => i.type === "CHECK_IN")} />
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Chưa thực hiện</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trả phòng (Check-out)</p>
              {inspections.find((i) => i.type === "CHECK_OUT") ? (
                <InspectionCard inspection={inspections.find((i) => i.type === "CHECK_OUT")} />
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Chưa thực hiện</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Settlement */}
      <section ref={settlementRef}>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Scales className="size-4 text-primary" /> Quyết toán
        </h2>
        {settlementLoading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="animate-spin text-muted-foreground size-5" />
          </div>
        ) : settlement ? (
          <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
            <div className="p-5 space-y-4">
              {/* Status + date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${SETTLEMENT_STATUS_MAP[settlement.status]?.dot || "bg-muted"}`} />
                  <span className={`text-sm font-semibold ${SETTLEMENT_STATUS_MAP[settlement.status]?.text || ""}`}>
                    {SETTLEMENT_STATUS_MAP[settlement.status]?.label || settlement.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(settlement.finalized_at)}
                  </span>
                  {settlement.status === "FINALIZED" && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setCloseSettlementOpen(true)}>
                      <CheckCircle className="size-4" /> Đóng quyết toán
                    </Button>
                  )}
                </div>
              </div>

              {/* Amount summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoCell icon={CurrencyDollar} label="Tiền cọc ban đầu" value={fmtVND(settlement.deposit_original_amount)} />
                <InfoCell icon={CurrencyDollar} label="Tổng phạt" value={fmtVND(settlement.total_penalty_amount)} />
                <InfoCell icon={CurrencyDollar} label="Phí dịch vụ chưa TT" value={fmtVND(settlement.total_unbilled_service_amount)} />
                {Number(settlement.amount_refund_to_resident) > 0 ? (
                  <InfoCell icon={CurrencyDollar} label="Hoàn trả cư dân" value={
                    <span className="text-success">{fmtVND(settlement.amount_refund_to_resident)}</span>
                  } />
                ) : Number(settlement.amount_due_from_resident) > 0 ? (
                  <InfoCell icon={CurrencyDollar} label="Cư dân phải trả" value={
                    <span className="text-destructive">{fmtVND(settlement.amount_due_from_resident)}</span>
                  } />
                ) : (
                  <InfoCell icon={CurrencyDollar} label="Kết quả" value="Không cần trao đổi" />
                )}
              </div>

              {/* Settlement items */}
              {settlement.items?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chi tiết khoản mục</p>
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {settlement.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium">{item.description}</span>
                          <span className="text-muted-foreground ml-2">
                            ({item.item_type === "ASSET_PENALTY" ? "Phạt tài sản"
                              : item.item_type === "UNBILLED_SERVICE" ? "Phí dịch vụ"
                              : item.item_type === "DEPOSIT_OFFSET" ? "Khấu trừ cọc"
                              : item.item_type})
                          </span>
                        </div>
                        <span className={`shrink-0 font-semibold tabular-nums ${Number(item.amount) < 0 ? "text-success" : "text-foreground"}`}>
                          {fmtVND(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closed info */}
              {settlement.closed_at && (
                <p className="text-xs text-muted-foreground">
                  Đóng lúc: {formatDateTime(settlement.closed_at)}
                </p>
              )}
            </div>
          </Card>
        ) : (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Chưa có quyết toán</p>
          </div>
        )}
      </section>

      {/* Notes */}
      {contract.notes && (
        <section>
          <h2 className="text-base font-bold mb-3">Ghi chú</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed">{contract.notes}</p>
          </div>
        </section>
      )}

      {/* Timestamps */}
      {(contract.created_at || contract.updated_at) && (
        <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border">
          {contract.created_at && <span>Tạo lúc: {formatDateTime(contract.created_at)}</span>}
          {contract.updated_at && <span>Cập nhật: {formatDateTime(contract.updated_at)}</span>}
        </div>
      )}

      {/* Contract preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Xem hợp đồng - {contract.contract_number}</DialogTitle>
          </DialogHeader>
          <div
            className="contract-render flex-1 overflow-y-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanContractHtml(contract.rendered_content) }}
          />
        </DialogContent>
      </Dialog>

      {/* Send reminder dialog */}
      {reminderCfg && (
        <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gửi nhắc nhở</DialogTitle>
              <DialogDescription>{reminderCfg.desc}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Người nhận</p>
                <p className="text-sm font-semibold">{customerName}</p>
                {contract.customer?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Envelope className="size-3" /> {contract.customer.email}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hợp đồng</p>
                <p className="text-sm font-semibold">{contract.contract_number}</p>
                <p className="text-xs text-muted-foreground">{roomLabel}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReminderOpen(false)} disabled={reminderLoading}>
                Hủy
              </Button>
              <Button
                className="gap-2"
                disabled={reminderLoading}
                onClick={async () => {
                  setReminderLoading(true);
                  try {
                    const res = await api.post(`/api/contracts/${id}/send-reminder`, {
                      reminder_type: reminderCfg.type,
                    });
                    toast.success(res.message || "Đã gửi email nhắc nhở thành công");
                    setReminderOpen(false);
                  } catch (err) {
                    toast.error(err?.message || "Không thể gửi email nhắc nhở");
                  } finally {
                    setReminderLoading(false);
                  }
                }}
              >
                {reminderLoading && <CircleNotch className="size-4 animate-spin" />}
                Gửi nhắc nhở
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Close settlement dialog */}
      {settlement && (
        <Dialog open={closeSettlementOpen} onOpenChange={setCloseSettlementOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Xác nhận đóng quyết toán</DialogTitle>
              <DialogDescription>
                Hành động này đánh dấu việc thu/chi bù trừ tiền nong với khách hàng đã được hoàn tất ở ngoài thực tế. Bạn có chắc chắn muốn đóng quyết toán này không? Quá trình này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setCloseSettlementOpen(false)} disabled={closeSettlementLoading}>
                Hủy
              </Button>
              <Button
                className="gap-2"
                disabled={closeSettlementLoading}
                onClick={async () => {
                  setCloseSettlementLoading(true);
                  try {
                    await api.patch(`/api/settlements/${settlement.id}/close`);
                    toast.success("Đã đóng quyết toán thành công.");
                    setCloseSettlementOpen(false);
                    // refresh settlement inline
                    const res = await api.get(`/api/settlements/contract/${id}`);
                    setSettlement(res.data);
                  } catch (err) {
                    toast.error(err?.message || "Không thể đóng quyết toán. Vui lòng thử lại.");
                  } finally {
                    setCloseSettlementLoading(false);
                  }
                }}
              >
                {closeSettlementLoading && <CircleNotch className="size-4 animate-spin" />}
                Xác nhận đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Terminate contract dialog */}
      {canTerminate && (
        <TerminateContractDialog
          contract={contract}
          open={terminateOpen}
          onOpenChange={setTerminateOpen}
          onTerminated={fetchContract}
        />
      )}
    </div>
  );
}
