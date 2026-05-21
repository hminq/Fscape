import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  MagnifyingGlass,
  ClipboardText,
  CheckCircle,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import AssignStaffDialog from "@/components/AssignStaffDialog";
import { REQUEST_TYPE_LABELS } from "@/lib/constants";

const PER_PAGE = 10;

const fullName = (user) => {
  if (!user) return "-";
  const name = `${user.last_name || ""} ${user.first_name || ""}`.trim();
  return name || user.email || "-";
};

export default function BMRequestAssignPage() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: "PENDING",
        page: String(page),
        limit: String(PER_PAGE),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get(`/api/requests?${params}`);
      setPendingRequests(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openAssignDialog = (request) => {
    setSelectedRequest(request);
    setAssignOpen(true);
  };

  const handleAssigned = () => {
    setAssignOpen(false);
    setSelectedRequest(null);
    if (pendingRequests.length === 1 && page > 1) {
      setPage((current) => current - 1);
      return;
    }
    fetchData();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Phân công yêu cầu</h1>
        <p className="text-sm text-muted-foreground">Gán nhân viên xử lý cho các yêu cầu đang chờ</p>
      </div>

      {!loading && !error && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-6">
            <div className="size-12 rounded-xl bg-chart-4/10 flex items-center justify-center">
              <ClipboardText className="size-6 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">yêu cầu đang chờ phân công</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo mã, tiêu đề, cư dân, phòng..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      ) : pendingRequests.length === 0 ? (
        <EmptyState icon={CheckCircle} message="Không có yêu cầu nào đang chờ phân công" />
      ) : (
        <>
          <SectionHeader icon={ClipboardText} count={total} countUnit="kết quả">
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
                  <TableHead className="text-right pr-4 w-28">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request, index) => (
                  <TableRow key={request.id}>
                    <TableCell className="pl-4 text-muted-foreground text-xs">
                      {(page - 1) * PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{request.request_number}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{request.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.room?.room_number || "-"}</TableCell>
                    <TableCell>{fullName(request.resident)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button size="sm" variant="default" className="gap-1.5" onClick={() => openAssignDialog(request)}>
                        <UserPlus className="size-3.5" />
                        Phân công
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <AssignStaffDialog
        buildingId={user.building_id}
        requestId={selectedRequest?.id}
        requestNumber={selectedRequest?.request_number}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={handleAssigned}
      />
    </div>
  );
}
