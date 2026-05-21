import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  MagnifyingGlass,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusDot from "@/components/StatusDot";
import StatusBar from "@/components/StatusBar";
import { CONTRACT_STATUS_MAP } from "@/lib/constants";

const PER_PAGE = 10;
const STATUS_MAP = CONTRACT_STATUS_MAP;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hiệu lực", statuses: "ACTIVE" },
  { key: "expiring", label: "Sắp hết hạn", statuses: "EXPIRING_SOON" },
  { key: "ended", label: "Đã kết thúc", statuses: "FINISHED,TERMINATED" },
];

const BAR_SEGMENTS = [
  { statusKey: "active", color: "bg-success", label: "Đang hiệu lực" },
  { statusKey: "expiring_soon", color: "bg-amber-500", label: "Sắp hết hạn" },
  { statusKey: "finished", color: "bg-primary", label: "Đã kết thúc" },
  { statusKey: "terminated", color: "bg-destructive", label: "Đã chấm dứt" },
];

const FILTER_STATUS_KEYS = {
  all: null,
  active: ["active"],
  expiring: ["expiring_soon"],
  ended: ["finished", "terminated"],
};

function ContractStatusBar({ byStatus, filter = "all" }) {
  const allowedKeys = FILTER_STATUS_KEYS[filter];
  const segments = BAR_SEGMENTS.map((segment) => {
    const count = byStatus?.[segment.statusKey] || 0;
    const visible = allowedKeys ? allowedKeys.includes(segment.statusKey) : true;
    return { ...segment, count, visible };
  }).filter((segment) => segment.visible);

  const filteredTotal = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="flex-1 min-w-[180px] space-y-2.5">
      <div className="flex items-center text-xs">
        <span className="text-muted-foreground">Trạng thái</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => {
          const pct = filteredTotal > 0 ? (segment.count / filteredTotal) * 100 : 0;
          return (
            <div
              key={segment.statusKey}
              className={`h-full ${segment.color} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        {filteredTotal === 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 hợp đồng
          </span>
        ) : (
          segments.filter((segment) => segment.count > 0).map((segment) => (
            <span key={segment.statusKey} className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${segment.color}`} />
              {segment.label} ({segment.count})
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function ContractSummary({ stats, filter }) {
  const total = stats?.total || 0;
  const byStatus = stats?.by_status || null;
  const allowedKeys = FILTER_STATUS_KEYS[filter];
  const filteredTotal = !byStatus
    ? 0
    : allowedKeys
      ? allowedKeys.reduce((sum, key) => sum + (byStatus[key] || 0), 0)
      : total;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5 flex-wrap">
        <div className="flex min-w-[140px] items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/8">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
            <p className="mt-1 text-sm text-muted-foreground">Hợp đồng</p>
          </div>
        </div>
        <div className="h-14 w-px shrink-0 bg-border" />
        <ContractStatusBar byStatus={byStatus} filter={filter} />
      </div>
    </div>
  );
}

const fullName = (user) => {
  if (!user) return "-";
  const name = `${user.last_name || ""} ${user.first_name || ""}`.trim();
  return name || user.email || "-";
};

export default function BMContractsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signContractId = searchParams.get("sign");
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (signContractId) {
      navigate(`/building-manager/contracts/${signContractId}/sign`, { replace: true });
    }
  }, [signContractId, navigate]);

  useEffect(() => {
    api.get("/api/contracts/stats")
      .then((res) => setStats(res.data || res))
      .catch(() => null)
      .finally(() => setLoadingInit(false));
  }, []);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      const filter = STATUS_FILTERS.find((item) => item.key === filterKey);
      if (filter?.statuses) {
        params.set("status", filter.statuses);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get(`/api/contracts?${params}`);
      setContracts(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || res.totalPages || 1);
    } catch {
      setError("Không thể tải dữ liệu.");
      setContracts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filterKey, page, search]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    setPage(1);
  }, [filterKey, search]);

  if (signContractId) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách hợp đồng</h1>
        <p className="text-sm text-muted-foreground">Quản lý hợp đồng thuê phòng</p>
      </div>

      {!loadingInit && <ContractSummary stats={stats} filter={filterKey} />}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã HĐ, khách hàng, phòng..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.key}
              size="sm"
              variant={filterKey === filter.key ? "default" : "outline"}
              onClick={() => setFilterKey(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loadingInit ? (
        <LoadingState />
      ) : (
        <>
          <SectionHeader icon={FileText} count={total} countUnit="kết quả">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          </SectionHeader>

          {loading ? (
            <LoadingState className="py-16" />
          ) : error ? (
            <div className="py-14 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchContracts}>
                Thử lại
              </Button>
            </div>
          ) : contracts.length === 0 ? (
            <EmptyState icon={FileText} message="Không tìm thấy hợp đồng nào" />
          ) : (
            <Card className="overflow-hidden py-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">#</TableHead>
                    <TableHead>Mã HĐ</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Phòng</TableHead>
                    <TableHead>Thời hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-4 w-20">Xem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract, index) => (
                    <TableRow key={contract.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{fullName(contract.customer)}</TableCell>
                      <TableCell>
                        {contract.room?.room_number || "-"}
                        {contract.room?.building?.name && (
                          <span className="text-muted-foreground"> - {contract.room.building.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                      </TableCell>
                      <TableCell>
                        <StatusDot status={contract.status} statusMap={STATUS_MAP} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => navigate(`/building-manager/contracts/${contract.id}`)}
                        >
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
