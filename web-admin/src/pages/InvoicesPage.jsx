import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt, MagnifyingGlass, Eye,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusDot from "@/components/StatusDot";
import { INVOICE_STATUS_MAP, INVOICE_TYPE_LABELS } from "@/lib/constants";

/* ── constants ──────────────────────────────────────────── */

const PER_PAGE = 10;

const STATUS_MAP = INVOICE_STATUS_MAP;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "unpaid", label: "Chưa thanh toán", statuses: "UNPAID" },
  { key: "paid", label: "Đã thanh toán", statuses: "PAID" },
  { key: "overdue", label: "Quá hạn", statuses: "OVERDUE" },
  { key: "cancelled", label: "Đã hủy", statuses: "CANCELLED" },
];

const BAR_SEGMENTS = [
  { statusKey: "unpaid", color: "bg-amber-500", label: "Chưa thanh toán" },
  { statusKey: "paid", color: "bg-success", label: "Đã thanh toán" },
  { statusKey: "overdue", color: "bg-destructive", label: "Quá hạn" },
  { statusKey: "cancelled", color: "bg-primary", label: "Đã hủy" },
];

const FILTER_STATUS_KEYS = {
  all: null,
  unpaid: ["unpaid"],
  paid: ["paid"],
  overdue: ["overdue"],
  cancelled: ["cancelled"],
};

const TYPE_MAP = INVOICE_TYPE_LABELS;

const fmtVND = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
};

/* ── InvoiceStatusBar ───────────────────────────────────── */

function InvoiceStatusBar({ byStatus, filter = "all" }) {
  const hasData = byStatus != null;
  const allowedKeys = FILTER_STATUS_KEYS[filter];

  const segments = BAR_SEGMENTS.map((seg) => {
    const count = byStatus?.[seg.statusKey] || 0;
    const visible = allowedKeys ? allowedKeys.includes(seg.statusKey) : true;
    return { ...seg, count, visible };
  }).filter((s) => s.visible);

  const filteredTotal = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex-1 min-w-[180px] space-y-2.5">
      <div className="flex items-center text-xs">
        <span className="text-muted-foreground">Trạng thái</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
        {segments.map((seg) => {
          const pct = filteredTotal > 0 ? (seg.count / filteredTotal) * 100 : 0;
          return (
            <div
              key={seg.statusKey}
              className={`h-full ${seg.color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        {!hasData && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> Đang chờ dữ liệu...
          </span>
        )}
        {hasData && filteredTotal === 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 hóa đơn
          </span>
        )}
        {segments.filter((s) => s.count > 0).map((seg) => (
          <span key={seg.statusKey} className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${seg.color}`} />
            {seg.label} ({seg.count})
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── InvoiceSummary ─────────────────────────────────────── */

function InvoiceSummary({ stats, filter }) {
  const total = stats?.total || 0;
  const byStatus = stats?.by_status || null;

  const allowedKeys = FILTER_STATUS_KEYS[filter];
  const filteredTotal = !byStatus
    ? 0
    : allowedKeys
      ? allowedKeys.reduce((sum, k) => sum + (byStatus[k] || 0), 0)
      : total;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5 flex-wrap">
        <div className="flex items-center gap-4 min-w-[140px]">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <Receipt className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
            <p className="text-sm text-muted-foreground mt-1">Hóa đơn</p>
          </div>
        </div>
        <div className="w-px h-14 bg-border shrink-0" />
        <InvoiceStatusBar byStatus={byStatus} filter={filter} />
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */

export default function InvoicesPage() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingInit, setLoadingInit] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [filterType, setFilterType] = useState("__all__");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: PER_PAGE });
    const f = STATUS_FILTERS.find((sf) => sf.key === filterKey);
    if (f?.statuses) params.set("status", f.statuses);
    if (filterType && filterType !== "__all__") params.set("invoice_type", filterType);
    if (search.trim()) params.set("search", search.trim());

    api.get(`/api/invoices?${params}`)
      .then((res) => {
        setInvoices(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || res.totalPages || 1);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [page, filterKey, filterType, search]);

  useEffect(() => {
    api.get("/api/invoices/stats")
      .then((res) => setStats(res.data || res))
      .catch(console.error)
      .finally(() => setLoadingInit(false));
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setPage(1); }, [filterKey, filterType, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Hóa đơn</h1>
        <p className="text-sm text-muted-foreground">Quản lý tất cả hóa đơn thuê phòng và dịch vụ</p>
      </div>

      {/* Summary */}
      <InvoiceSummary stats={stats} filter={filterKey} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã hóa đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Tất cả loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả loại</SelectItem>
            <SelectItem value="RENT">Tiền thuê</SelectItem>
            <SelectItem value="SERVICE">Phí dịch vụ</SelectItem>
            <SelectItem value="SETTLEMENT">Thanh toán cuối kỳ</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button key={f.key} size="sm"
              variant={filterKey === f.key ? "default" : "outline"}
              onClick={() => setFilterKey(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loadingInit ? (
        <LoadingState />
      ) : (
        <>
          <SectionHeader icon={Receipt} count={total} countUnit="kết quả">
            <Pagination page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)} />
          </SectionHeader>

          {loading ? (
            <LoadingState className="py-16" />
          ) : invoices.length === 0 ? (
            <EmptyState icon={Receipt} message="Không tìm thấy hóa đơn nào" />
          ) : (
            <Card className="overflow-hidden py-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10 pl-4">#</TableHead>
                    <TableHead>Mã hóa đơn</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Kỳ thanh toán</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-4 w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv, idx) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{TYPE_MAP[inv.invoice_type] || inv.invoice_type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inv.billing_period_start)} → {formatDate(inv.billing_period_end)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtVND(inv.total_amount)}</TableCell>
                      <TableCell><StatusDot status={inv.status} statusMap={STATUS_MAP} /></TableCell>
                      <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

    </div>
  );
}
