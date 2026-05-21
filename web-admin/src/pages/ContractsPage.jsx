import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusDot from "@/components/StatusDot";
import { CONTRACT_STATUS_MAP } from "@/lib/constants";

/* ── constants ──────────────────────────────────────────── */

const PER_PAGE = 10;

const STATUS_MAP = CONTRACT_STATUS_MAP;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ ký", statuses: "PENDING_CUSTOMER_SIGNATURE,PENDING_MANAGER_SIGNATURE" },
  { key: "active", label: "Đang hiệu lực", statuses: "ACTIVE" },
  { key: "expiring", label: "Sắp hết hạn", statuses: "EXPIRING_SOON" },
  { key: "ended", label: "Đã kết thúc", statuses: "FINISHED,TERMINATED" },
];

const BAR_SEGMENTS = [
  { statusKey: "pending_customer_signature", color: "bg-chart-2", label: "Chờ KH ký" },
  { statusKey: "pending_manager_signature", color: "bg-chart-4", label: "Chờ QL ký" },
  { statusKey: "active", color: "bg-success", label: "Đang hiệu lực" },
  { statusKey: "expiring_soon", color: "bg-amber-500", label: "Sắp hết hạn" },
  { statusKey: "finished", color: "bg-primary", label: "Đã kết thúc" },
  { statusKey: "terminated", color: "bg-destructive", label: "Đã chấm dứt" },
];

/* Map filter key → which lowercase status keys to show in bar */
const FILTER_STATUS_KEYS = {
  all: null,
  pending: ["pending_customer_signature", "pending_manager_signature"],
  active: ["active"],
  expiring: ["expiring_soon"],
  ended: ["finished", "terminated"],
};

/* ── ContractStatusBar ──────────────────────────────────── */

function ContractStatusBar({ byStatus, total = 0, filter = "all" }) {
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
            <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 hợp đồng
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

/* ── ContractSummary ────────────────────────────────────── */

function ContractSummary({ stats, filter }) {
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
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">{filteredTotal}</p>
            <p className="text-sm text-muted-foreground mt-1">Hợp đồng</p>
          </div>
        </div>
        <div className="w-px h-14 bg-border shrink-0" />
        <ContractStatusBar byStatus={byStatus} total={total} filter={filter} />
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */

export default function ContractsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingInit, setLoadingInit] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [buildingId, setBuildingId] = useState("__all__");
  const [page, setPage] = useState(1);

  /* ── fetch helpers ─────────────────────────────────────── */

  const fetchStats = useCallback(() => {
    api.get("/api/contracts/stats")
      .then((res) => setStats(res.data || res))
      .catch(console.error);
  }, []);

  const fetchContracts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: PER_PAGE });
    const f = STATUS_FILTERS.find((sf) => sf.key === filterKey);
    if (f?.statuses) params.set("status", f.statuses);
    if (buildingId && buildingId !== "__all__") params.set("building_id", buildingId);
    if (search.trim()) params.set("search", search.trim());

    api.get(`/api/contracts?${params}`)
      .then((res) => {
        setContracts(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || res.totalPages || 1);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [page, filterKey, buildingId, search]);

  /* ── init ───────────────────────────────────────────────── */

  useEffect(() => {
    Promise.all([
      api.get("/api/contracts/stats"),
      api.get("/api/buildings?limit=100"),
    ]).then(([sRes, bRes]) => {
      setStats(sRes.data || sRes);
      setBuildings(bRes.data || bRes);
    }).catch(console.error)
      .finally(() => setLoadingInit(false));
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);
  useEffect(() => { setPage(1); }, [filterKey, buildingId, search]);


  /* ── render ──────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Hợp đồng</h1>
        <p className="text-sm text-muted-foreground">Quản lý tất cả hợp đồng thuê phòng</p>
      </div>

      {/* Summary */}
      <ContractSummary stats={stats} filter={filterKey} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã HĐ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={buildingId} onValueChange={setBuildingId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả tòa nhà" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả tòa nhà</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
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
          <SectionHeader icon={FileText} count={total} countUnit="kết quả">
            <Pagination page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)} />
          </SectionHeader>

          {loading ? (
            <LoadingState className="py-16" />
          ) : contracts.length === 0 ? (
            <EmptyState icon={FileText} message="Không tìm thấy hợp đồng nào" />
          ) : (
            <Card className="overflow-hidden py-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
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
                  {contracts.map((c, idx) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/contracts/${c.id}`)}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{c.contract_number}</TableCell>
                      <TableCell>{c.customer?.last_name} {c.customer?.first_name}</TableCell>
                      <TableCell>
                        {c.room?.room_number}
                        {c.room?.building?.name && (
                          <span className="text-muted-foreground"> - {c.room.building.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.start_date)} → {formatDate(c.end_date)}
                      </TableCell>
                      <TableCell><StatusDot status={c.status} statusMap={STATUS_MAP} /></TableCell>
                      <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/contracts/${c.id}`)}>
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
