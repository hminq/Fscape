import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, PaperPlaneTilt, MagnifyingGlass, CircleNotch,
  Checks, Eye, EnvelopeSimple, EnvelopeSimpleOpen,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/utils";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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



const READ_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "read", label: "Đã đọc" },
];

function emitUnreadChanged(count) {
  window.dispatchEvent(new CustomEvent("notifications:unread-changed", { detail: { count } }));
}

/* ── Main Page ──────────────────────────────────────────── */

export default function BMNotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [readFilter, setReadFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [detail, setDetail] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ── fetch notifications ───────────────────────────── */

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: PER_PAGE });
      if (readFilter === "unread") params.set("is_read", "false");
      if (readFilter === "read") params.set("is_read", "true");

      const res = await api.get(`/api/notifications?${params}`);
      setNotifications(res.data || []);
      setTotalPages(res.total_pages || 1);
      setTotal(res.total || 0);
    } catch {
      setError("Không thể tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  }, [page, readFilter]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/api/notifications/unread-count");
      const count = res.count || 0;
      setUnreadCount(count);
      emitUnreadChanged(count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  /* ── actions ───────────────────────────────────────── */

  const markAsRead = async (notifId) => {
    try {
      await api.patch(`/api/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => {
        const next = Math.max(0, c - 1);
        emitUnreadChanged(next);
        return next;
      });
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      emitUnreadChanged(0);
    } catch { /* ignore */ }
    setMarkingAll(false);
  };

  const openDetail = (n) => {
    setDetail(n);
    if (!n.is_read) markAsRead(n.notification_id);
  };

  /* ── filter by search (client-side on current page) ── */

  const q = search.trim().toLowerCase();
  const visible = q
    ? notifications.filter((n) =>
        n.notification?.title?.toLowerCase().includes(q) ||
        n.notification?.content?.toLowerCase().includes(q)
      )
    : notifications;

  /* ── reset page on filter change ───────────────────── */

  useEffect(() => { setPage(1); }, [readFilter]);

  /* ── render ──────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thông báo</h1>
          <p className="text-sm text-muted-foreground">Quản lý thông báo của bạn</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/building-manager/notifications/create")}>
          <PaperPlaneTilt className="size-4" />
          Gửi thông báo
        </Button>
      </div>

      {/* Unread summary */}
      {!loading && !error && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {unreadCount > 0
                    ? <>{unreadCount} thông báo chưa đọc</>
                    : "Không có thông báo chưa đọc"}
                </p>
                <p className="text-xs text-muted-foreground">Tổng cộng {total} thông báo</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2"
                disabled={markingAll} onClick={markAllAsRead}>
                {markingAll
                  ? <CircleNotch className="size-3.5 animate-spin" />
                  : <Checks className="size-3.5" />}
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Filters */}
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
        <div className="flex gap-1.5">
          {READ_FILTERS.map((f) => (
            <Button key={f.key} size="sm"
              variant={readFilter === f.key ? "default" : "outline"}
              onClick={() => setReadFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifications}>Thử lại</Button>
        </div>
      ) : visible.length === 0 ? (
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
                  <TableHead className="w-8" />
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right pr-4 w-16">Xem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((n, idx) => {
                  const notif = n.notification || {};
                  return (
                    <TableRow key={n.id} className={!n.is_read ? "bg-primary/[0.02]" : undefined}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="px-0">
                        {n.is_read
                          ? <EnvelopeSimpleOpen className="size-4 text-muted-foreground/40" />
                          : <EnvelopeSimple className="size-4 text-primary" weight="fill" />}
                      </TableCell>
                      <TableCell className={`max-w-[200px] truncate ${!n.is_read ? "font-semibold" : ""}`}>
                        {notif.title || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {NOTIFICATION_TYPE_LABELS[notif.type] || notif.type || "—"}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {notif.content || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(notif.created_at)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="icon" className="size-8"
                          onClick={() => openDetail(n)}>
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
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              {detail?.notification?.title || "Thông báo"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5 font-medium">
                  {NOTIFICATION_TYPE_LABELS[detail.notification?.type] || detail.notification?.type}
                </span>
                <span>{formatDateTime(detail.notification?.created_at)}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {detail.notification?.content}
                </p>
              </div>
              {detail.read_at && (
                <p className="text-xs text-muted-foreground">
                  Đã đọc lúc {formatDateTime(detail.read_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
