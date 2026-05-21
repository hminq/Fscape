import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scales,
  MagnifyingGlass,
  Eye,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StatusDot from "@/components/StatusDot";
import { SETTLEMENT_STATUS_MAP } from "@/lib/constants";

/* ── constants ──────────────────────────────────────────── */

const PER_PAGE = 10;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả", value: "" },
  { key: "finalized", label: "Chờ xử lý", value: "FINALIZED" },
  { key: "closed", label: "Đã đóng", value: "CLOSED" },
];

/** Format VND currency */
const fmtVND = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + " ₫";
};

/* ── main component ─────────────────────────────────────── */

export default function SettlementsPage() {
  const navigate = useNavigate();

  const [settlements, setSettlements] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  /* ── fetch settlements (server-side pagination) ────────── */

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusValue = STATUS_FILTERS.find((f) => f.key === filterStatus)?.value || "";
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PER_PAGE),
      });
      if (statusValue) params.set("status", statusValue);
      if (search.trim()) params.set("search", search.trim());

      const res = await api.get(`/api/settlements?${params.toString()}`);
      setSettlements(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, search]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  // Reset page when filter/search changes
  const handleFilterChange = (key) => {
    setFilterStatus(key);
    setPage(1);
  };
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  /* ── render ────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Quyết toán</h1>
        <p className="text-sm text-muted-foreground">Quản lý quyết toán khi cư dân trả phòng</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã hợp đồng..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button key={f.key} size="sm"
              variant={filterStatus === f.key ? "default" : "outline"}
              onClick={() => handleFilterChange(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchSettlements}>Thử lại</Button>
        </div>
      ) : settlements.length === 0 ? (
        <EmptyState icon={Scales} message="Không tìm thấy quyết toán nào" />
      ) : (
        <>
          <SectionHeader icon={Scales} count={total} countUnit="kết quả">
            <Pagination page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </SectionHeader>

          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Hợp đồng</TableHead>
                  <TableHead>Cư dân</TableHead>
                  <TableHead className="text-right">Phạt</TableHead>
                  <TableHead className="text-right">Hoàn trả / Thu thêm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right pr-4 w-20">Xem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s, idx) => {
                  const refund = Number(s.amount_refund_to_resident || 0);
                  const due = Number(s.amount_due_from_resident || 0);

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.contract?.contract_number || "—"}
                      </TableCell>
                      <TableCell>
                        {s.resident?.last_name} {s.resident?.first_name}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmtVND(s.total_penalty_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {refund > 0 ? (
                          <span className="text-success">Hoàn {fmtVND(refund)}</span>
                        ) : due > 0 ? (
                          <span className="text-destructive">Thu {fmtVND(due)}</span>
                        ) : (
                          <span className="text-muted-foreground">0 ₫</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusDot status={s.status} statusMap={SETTLEMENT_STATUS_MAP} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(s.finalized_at)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => navigate(`/contracts/${s.contract?.id}?scrollTo=settlement`)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
