import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, Eye, Wrench,
  ChatCircleText,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/Pagination";
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
import { api } from "@/lib/apiClient";
import { REQUEST_TYPE_LABELS, REQUEST_TYPES, REQUEST_STATUS_MAP } from "@/lib/constants";
import { formatDate as fmt } from "@/lib/utils";

/* ── constants ──────────────────────────────── */

const STATUS_MAP = REQUEST_STATUS_MAP;

const STATUS_ORDER = ["PENDING", "ASSIGNED", "PRICE_PROPOSED", "APPROVED", "IN_PROGRESS", "DONE", "COMPLETED", "REVIEWED", "REFUNDED", "CANCELLED"];

const TYPE_MAP = REQUEST_TYPE_LABELS;
const TYPES = REQUEST_TYPES;


const fullName = (u) => {
  if (!u) return "—";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—";
};

/* ── Grouped status bar segments (4 groups) ─── */

const STATUS_GROUPS = [
  { key: "waiting", label: "Chờ xử lý", color: "bg-amber-500", statuses: ["pending", "assigned", "price_proposed", "approved"] },
  { key: "processing", label: "Đang xử lý", color: "bg-primary", statuses: ["in_progress"] },
  { key: "done", label: "Hoàn thành", color: "bg-success", statuses: ["done", "completed", "reviewed", "refunded"] },
  { key: "cancelled", label: "Đã hủy", color: "bg-destructive", statuses: ["cancelled"] },
];

const STATUS_FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "waiting", label: "Chờ xử lý", statuses: "PENDING,ASSIGNED,PRICE_PROPOSED,APPROVED" },
  { key: "processing", label: "Đang xử lý", statuses: "IN_PROGRESS" },
  { key: "done", label: "Hoàn thành", statuses: "DONE,COMPLETED,REVIEWED,REFUNDED" },
  { key: "cancelled", label: "Đã hủy", statuses: "CANCELLED" },
];

/* ── Summary ─────────────────────────────────── */

function RequestSummary({ stats, activeFilter }) {
  const byStatus = stats?.by_status || {};
  const total = stats?.total || 0;

  const segments = STATUS_GROUPS.map((g) => {
    const count = g.statuses.reduce((sum, s) => sum + (byStatus[s] || 0), 0);
    return { ...g, count };
  });

  const visibleKeys = activeFilter === "all"
    ? null
    : STATUS_GROUPS.filter((g) => g.key === activeFilter).map((g) => g.key);

  const visibleSegments = visibleKeys
    ? segments.filter((s) => visibleKeys.includes(s.key))
    : segments;

  const barTotal = visibleSegments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-6 p-5 flex-wrap">
        <div className="flex items-center gap-4 min-w-[140px]">
          <div className="size-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <ChatCircleText className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold leading-none tracking-tight">
              {activeFilter === "all" ? total : barTotal}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Yêu cầu</p>
          </div>
        </div>

        <div className="w-px h-14 bg-border shrink-0" />

        <div className="flex-1 min-w-[180px] space-y-2.5">
          <div className="flex items-center text-xs">
            <span className="text-muted-foreground">Trạng thái</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
            {visibleSegments.map((seg) => {
              const pct = barTotal > 0 ? (seg.count / barTotal) * 100 : 0;
              return (
                <div
                  key={seg.key}
                  className={`h-full ${seg.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
            {!stats && (
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-muted-foreground/30" /> Đang chờ dữ liệu...
              </span>
            )}
            {stats && barTotal === 0 && (
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-muted-foreground/30" /> 0 yêu cầu
              </span>
            )}
            {visibleSegments.filter((s) => s.count > 0).map((seg) => (
              <span key={seg.key} className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${seg.color}`} />
                {seg.label} ({seg.count})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────── */

export default function RequestsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    api.get("/api/requests/stats")
      .then((res) => setStats(res.data || res))
      .catch(console.error);
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page });
      if (search.trim()) params.set("search", search.trim());
      const tab = STATUS_FILTER_TABS.find((f) => f.key === filterTab);
      if (tab?.statuses) params.set("status", tab.statuses);
      if (filterType !== "all") params.set("request_type", filterType);

      const res = await api.get(`/api/requests?${params}`);
      setRequests(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterTab, filterType]);

  useEffect(() => { fetchPage(); }, [fetchPage]);
  useEffect(() => { setPage(1); }, [filterTab, filterType, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Yêu cầu</h1>
        <p className="text-sm text-muted-foreground">Quản lý yêu cầu sửa chữa, bảo trì từ cư dân</p>
      </div>

      {/* Summary */}
      <RequestSummary stats={stats} activeFilter={filterTab} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tiêu đề hoặc mã yêu cầu..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_MAP[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {STATUS_FILTER_TABS.map((f) => (
            <Button key={f.key} size="sm"
              variant={filterTab === f.key ? "default" : "outline"}
              onClick={() => setFilterTab(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Pagination header */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm font-medium text-muted-foreground">{total} kết quả</p>
          <Pagination page={page} totalPages={totalPages}
            onPrev={() => setPage(p => p - 1)}
            onNext={() => setPage(p => p + 1)} />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchPage}>Thử lại</Button>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Wrench} message="Không tìm thấy yêu cầu nào" />
      ) : (
        <Card className="overflow-hidden py-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Yêu cầu</TableHead>
                <TableHead className="w-[120px]">Trạng thái</TableHead>
                <TableHead>Cư dân</TableHead>
                <TableHead className="w-[80px]">Phòng</TableHead>
                <TableHead className="w-[100px]">Loại</TableHead>
                <TableHead className="w-[100px]">Ngày tạo</TableHead>
                <TableHead className="text-right pr-4 w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const st = STATUS_MAP[req.status] || {};
                return (
                  <TableRow key={req.id}>
                    <TableCell className="pl-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm truncate max-w-[220px]">{req.title}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{req.request_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`size-2 rounded-full ${st.dot || "bg-muted-foreground"}`} />
                        <span className={`font-medium ${st.text || "text-muted-foreground"}`}>
                          {st.label || req.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{fullName(req.resident)}</TableCell>
                    <TableCell className="text-sm">{req.room?.room_number || "—"}</TableCell>
                    <TableCell className="text-xs">{TYPE_MAP[req.request_type] || req.request_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(req.created_at)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end">
                        <Button size="icon" variant="ghost" className="size-8"
                          title="Chi tiết" onClick={() => navigate(`/requests/${req.id}`)}>
                          <Eye className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

    </div>
  );
}
