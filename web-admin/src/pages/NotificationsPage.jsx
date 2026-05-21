import { useState, useEffect, useCallback } from "react";
import {
  Bell, MagnifyingGlass, CircleNotch, Eye,
  User, Users as UsersIcon, Clock,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import { NOTIFICATION_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/* ── constants ──────────────────────────────────────────── */

const PER_PAGE = 10;

const TYPE_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "REQUEST_CREATED", label: "Yêu cầu mới" },
  { key: "REQUEST_CREATED_SUCCESS", label: "Tạo yêu cầu thành công" },
  { key: "REQUEST_ASSIGNED", label: "Phân công yêu cầu" },
  { key: "REQUEST_STATUS_CHANGED", label: "Yêu cầu" },
  { key: "CONTRACT_TERMINATED", label: "Hợp đồng bị chấm dứt" },
  { key: "CONTRACT_TERMINATION_INITIATED", label: "Khởi tạo chấm dứt hợp đồng" },
  { key: "CHECKOUT_REQUEST_ASSIGNED", label: "Phân công trả phòng" },
  { key: "INVOICE", label: "Hóa đơn" },
  { key: "SYSTEM", label: "Hệ thống" },
];

const TARGET_TYPE_LABELS = {
  BUILDING: "Tòa nhà",
  ROOM: "Phòng",
  USER: "Người dùng",
  REQUEST: "Yêu cầu",
};

/* ── Detail Dialog ─────────────────────────────────────── */

function NotificationDetailDialog({ open, onOpenChange, notification }) {
  if (!notification) return null;
  const n = notification;
  const creatorName = n.creator
    ? `${n.creator.last_name || ""} ${n.creator.first_name || ""}`.trim() || "Người dùng chưa cập nhật tên"
    : "-";
  const recipientCount = n.recipients?.length || 0;
  const readCount = n.recipients?.filter((r) => r.is_read).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            {n.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 font-medium">
              {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDateTime(n.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2 text-sm">
            <User className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Người gửi:</span>
            <span className="font-medium">{creatorName}</span>
            {n.creator?.role && (
              <span className="text-xs text-muted-foreground">
                ({ROLE_LABELS[n.creator.role] || n.creator.role})
              </span>
            )}
          </div>

          {/* Recipients summary */}
          <div className="flex items-center gap-2 text-sm">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Người nhận:</span>
            <span className="font-medium">{recipientCount} người</span>
            <span className="text-xs text-muted-foreground">
              ({readCount} đã đọc)
            </span>
          </div>

          {/* Target info */}
          {n.target_type && (
            <div className="flex items-center gap-2 text-sm">
              <Bell className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Đối tượng:</span>
              <span className="font-medium">
                {TARGET_TYPE_LABELS[n.target_type] || n.target_type}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ──────────────────────────────────────────── */

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [detail, setDetail] = useState(null);

  /* ── debounce search ───────────────────────────────── */

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── fetch ─────────────────────────────────────────── */

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: PER_PAGE });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());

      const res = await api.get(`/api/notifications/all?${params}`);
      setNotifications(res.data || []);
      setTotalPages(res.total_pages || res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, searchDebounced]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* ── reset page on filter change ───────────────────── */

  useEffect(() => { setPage(1); }, [typeFilter, searchDebounced]);

  /* ── render ────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
        <p className="text-sm text-muted-foreground">Tất cả thông báo trong hệ thống</p>
      </div>

      {/* Stats card */}
      {!loading && !error && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Tổng cộng {total} thông báo</p>
              <p className="text-xs text-muted-foreground">Bao gồm tất cả tòa nhà và hệ thống</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tiêu đề, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="min-w-[220px]">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Lọc theo loại thông báo" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>Thử lại</Button>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} message="Không có thông báo nào" />
      ) : (
        <>
          <SectionHeader icon={Bell} count={total} countUnit="thông báo">
            <Pagination page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </SectionHeader>

          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người gửi</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right pr-4 w-16">Xem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n, idx) => {
                  const creatorName = n.creator
                    ? `${n.creator.last_name || ""} ${n.creator.first_name || ""}`.trim() || "Người dùng chưa cập nhật tên"
                    : "-";
                  const recipientCount = n.recipients?.length || 0;

                  return (
                    <TableRow key={n.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {n.title || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                          {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {creatorName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <UsersIcon className="size-3.5" />
                          {recipientCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(n.created_at)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="icon" className="size-8"
                          onClick={() => setDetail(n)}>
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

      {/* Detail dialog */}
      <NotificationDetailDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        notification={detail}
      />
    </div>
  );
}
