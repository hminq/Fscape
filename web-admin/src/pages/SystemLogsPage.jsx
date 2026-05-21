import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlass, CircleNotch, CaretLeft, CaretRight, Eye,
  X, Scroll, Code,
} from "@phosphor-icons/react";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";
import { formatDateTime as fmt } from "@/lib/utils";

const ACTION_COLORS = {
  CREATE: "text-chart-3 bg-chart-3/10",
  UPDATE: "text-chart-2 bg-chart-2/10",
  DELETE: "text-destructive bg-destructive/10",
  LOGIN: "text-chart-4 bg-chart-4/10",
  LOGOUT: "text-muted-foreground bg-muted",
  SIGN: "text-chart-1 bg-chart-1/10",
  APPROVE: "text-success bg-success/10",
  REJECT: "text-destructive bg-destructive/10",
  ASSIGN: "text-chart-5 bg-chart-5/10",
};

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "SIGN", "APPROVE", "REJECT", "ASSIGN"];

const ACTION_LABELS = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  SIGN: "Ký",
  APPROVE: "Phê duyệt",
  REJECT: "Từ chối",
  ASSIGN: "Phân công",
};

const ENTITY_TYPE_LABELS = {
  booking: "Đặt phòng",
  contract: "Hợp đồng",
  settlement: "Quyết toán",
  request: "Yêu cầu",
  invoice: "Hóa đơn",
  payment: "Thanh toán",
  room: "Phòng",
  building: "Tòa nhà",
  user: "Người dùng",
  asset: "Tài sản",
  inspection: "Kiểm tra",
  notification: "Thông báo",
};

/* ── Detail Dialog ──────────────────────────── */

function LogDetailDialog({ open, onOpenChange, log }) {
  if (!log) return null;

  const actColor = ACTION_COLORS[log.action] || "text-muted-foreground bg-muted";
  const actionLabel = ACTION_LABELS[log.action] || log.action;
  const entityLabel = ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết nhật ký</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Hành động</span>
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${actColor}`}>
              {actionLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Đối tượng</span>
            <span className="font-medium">{entityLabel}</span>
          </div>
          {log.entity_id && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Entity ID</span>
              <span className="font-mono text-xs truncate max-w-[220px]">{log.entity_id}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Thời gian</span>
            <span>{fmt(log.created_at)}</span>
          </div>
          {log.ip_address && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">IP</span>
              <span className="font-mono text-xs">{log.ip_address}</span>
            </div>
          )}
        </div>

        {log.old_value && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Giá trị cũ</p>
            <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
              {JSON.stringify(log.old_value, null, 2)}
            </pre>
          </div>
        )}

        {log.new_value && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Giá trị mới</p>
            <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
              {JSON.stringify(log.new_value, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ──────────────────────────────── */

export default function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entityTypes, setEntityTypes] = useState([]);

  // Detail
  const [detailLog, setDetailLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, system: "true" });
      if (filterAction !== "all") params.set("action", filterAction);
      if (filterEntity !== "all") params.set("entity_type", filterEntity);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await api.get(`/api/audit-logs?${params}`);
      setLogs(res.data || []);
      setTotalPages(res.total_pages || 1);
      setTotal(res.total || 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/audit-logs/entity-types");
        setEntityTypes(res.data || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const hasFilters = filterAction !== "all" || filterEntity !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setFilterAction("all");
    setFilterEntity("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Nhật ký hệ thống</h1>
        <p className="text-sm text-muted-foreground">Các hành động tự động của hệ thống</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Đối tượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>{ENTITY_TYPE_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} placeholder="Từ"
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-[140px] h-9 text-sm" />
        <Input type="date" value={dateTo} placeholder="Đến"
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-[140px] h-9 text-sm" />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
            <X className="size-3.5" /> Xóa lọc
          </Button>
        )}
      </div>

      {/* Section header + pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 mb-2">
          <p className="text-sm font-medium text-muted-foreground">{total} kết quả</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="size-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <CaretLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <CaretRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingState className="py-20" />
      ) : logs.length === 0 ? (
        <EmptyState icon={Code} message="Không có nhật ký hệ thống nào" />
      ) : (
        <Card className="overflow-hidden py-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] pl-4">Thời gian</TableHead>
                <TableHead className="w-[100px]">Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead className="w-[280px]">Entity ID</TableHead>
                <TableHead className="text-right pr-4 w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const actColor = ACTION_COLORS[log.action] || "text-muted-foreground bg-muted";
                const actionLabel = ACTION_LABELS[log.action] || log.action;
                const entityLabel = ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${actColor}`}>
                        {actionLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{entityLabel}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[280px]">
                      {log.entity_id || "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button size="icon" variant="ghost" className="size-8"
                        title="Chi tiết" onClick={() => setDetailLog(log)}>
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Dialog */}
      <LogDetailDialog
        open={!!detailLog}
        onOpenChange={(v) => !v && setDetailLog(null)}
        log={detailLog}
      />
    </div>
  );
}
