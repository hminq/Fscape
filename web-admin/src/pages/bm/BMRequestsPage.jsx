import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass,
  Eye,
  ChatCircleText,
} from "@phosphor-icons/react";
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
import { api } from "@/lib/apiClient";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_MAP } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import StatusDonut from "@/components/StatusDonut";
import StatusBar from "@/components/StatusBar";
import StatusDot from "@/components/StatusDot";

const STATUS_MAP = REQUEST_STATUS_MAP;
const PER_PAGE = 10;

const STATUS_CHART = [
  { key: "PENDING", stroke: "stroke-chart-4", dot: "bg-chart-4" },
  { key: "ASSIGNED", stroke: "stroke-chart-2", dot: "bg-chart-2" },
  { key: "IN_PROGRESS", stroke: "stroke-primary", dot: "bg-primary" },
  { key: "DONE", stroke: "stroke-success", dot: "bg-success" },
  { key: "COMPLETED", stroke: "stroke-muted-foreground/60", dot: "bg-muted-foreground/60" },
  { key: "CANCELLED", stroke: "stroke-destructive/60", dot: "bg-destructive/60" },
];

const ACTIVE_STATUSES = ["PENDING", "ASSIGNED", "PRICE_PROPOSED", "APPROVED", "IN_PROGRESS"];

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang xử lý", statuses: ACTIVE_STATUSES.join(",") },
  { key: "done", label: "Hoàn thành", statuses: "DONE,COMPLETED" },
  { key: "other", label: "Khác", statuses: "REVIEWED,REFUNDED,CANCELLED" },
];

function normalizeStatusCounts(stats) {
  const byStatus = stats?.by_status || {};
  return STATUS_CHART.reduce((acc, item) => {
    acc[item.key] = byStatus[item.key.toLowerCase()] || 0;
    return acc;
  }, {});
}

function RequestSummary({ stats }) {
  const statusCounts = useMemo(() => normalizeStatusCounts(stats), [stats]);
  const activeCount = ACTIVE_STATUSES.reduce((sum, key) => sum + (statusCounts[key] || 0), 0);
  const totalCount = stats?.total || 0;
  const donutEntries = STATUS_CHART.map((item) => ({
    ...item,
    count: statusCounts[item.key] || 0,
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-8 flex-wrap">
        <div className="flex items-center gap-5">
          <StatusDonut entries={donutEntries} size={76} />
          <div className="grid grid-cols-3 gap-x-6 gap-y-1.5">
            {STATUS_CHART.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${item.dot} shrink-0`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {STATUS_MAP[item.key]?.label}
                </span>
                <span className="text-xs font-semibold">{statusCounts[item.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-px h-12 bg-border shrink-0" />

        <StatusBar active={activeCount} inactive={totalCount - activeCount} filter="all" label="yêu cầu" />
      </div>
    </div>
  );
}

const fullName = (user) => {
  if (!user) return "-";
  const name = `${user.last_name || ""} ${user.first_name || ""}`.trim();
  return name || user.email || "-";
};

export default function BMRequestsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    api.get("/api/requests/stats")
      .then((res) => setStats(res.data || res))
      .catch(() => null);
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PER_PAGE),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const statusFilter = STATUS_FILTERS.find((item) => item.key === filterStatus);
      if (statusFilter?.statuses) {
        params.set("status", statusFilter.statuses);
      }

      const res = await api.get(`/api/requests?${params}`);
      setRequests(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page, search]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Danh sách yêu cầu</h1>
        <p className="text-sm text-muted-foreground">Quản lý yêu cầu bảo trì và dịch vụ</p>
      </div>

      <RequestSummary stats={stats} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã, tiêu đề, cư dân, phòng..."
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
              variant={filterStatus === filter.key ? "default" : "outline"}
              onClick={() => setFilterStatus(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchPage}>
            Thử lại
          </Button>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={ChatCircleText} message="Không tìm thấy yêu cầu nào" />
      ) : (
        <>
          <SectionHeader icon={ChatCircleText} count={total} countUnit="kết quả">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          </SectionHeader>

          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Mã yêu cầu</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Cư dân</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-4 w-20">Xem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request, index) => (
                  <TableRow key={request.id}>
                    <TableCell className="pl-4 text-muted-foreground text-xs">
                      {(page - 1) * PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{request.request_number}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{request.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                    </TableCell>
                    <TableCell>{request.room?.room_number || "-"}</TableCell>
                    <TableCell>{fullName(request.resident)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusDot status={request.status} statusMap={STATUS_MAP} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => navigate(`/building-manager/requests/${request.id}`)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
