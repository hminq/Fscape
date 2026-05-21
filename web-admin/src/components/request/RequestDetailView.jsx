import {
  ArrowLeft,
  CircleNotch,
  User,
  MapPin,
  Wrench,
  Clock,
  Chat as MessageSquare,
  Image as ImageIcon,
  UserPlus,
  ArrowCounterClockwise,
  CheckCircle,
} from "@phosphor-icons/react";
import { formatDate, formatDateTime, cdnUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import StatusDot from "@/components/StatusDot";
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_MAP, ROLE_LABELS } from "@/lib/constants";

const STATUS_MAP = REQUEST_STATUS_MAP;

function InfoCell({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="size-3 text-muted-foreground" />}
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-semibold">{value || "-"}</p>
    </div>
  );
}

export default function RequestDetailView({
  request,
  loading,
  error,
  onRetry,
  onBack,
  backLabel = "Quay lại",
  canAssign = false,
  onAssign,
  canResolveReviewed = false,
  confirmAction,
  onConfirmActionChange,
  onStatusAction,
  actionLoading = false,
  assignDialog = null,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircleNotch className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl py-14 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 py-14 text-center">
        <p className="text-sm text-destructive">Không tìm thấy yêu cầu.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    );
  }

  const attachments = (request.images || []).filter((image) => image.image_type === "ATTACHMENT");
  const completionImages = (request.images || []).filter((image) => image.image_type === "COMPLETION");
  const residentName = request.resident
    ? `${request.resident.last_name || ""} ${request.resident.first_name || ""}`.trim() || request.resident.email || "-"
    : "-";
  const staffName = request.staff
    ? `${request.staff.last_name || ""} ${request.staff.first_name || ""}`.trim() || request.staff.phone || "-"
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1">
          <div className="mb-0.5 flex items-center gap-2.5">
            <h1 className="text-lg font-bold">{request.request_number}</h1>
            <StatusDot status={request.status} statusMap={STATUS_MAP} />
          </div>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Wrench className="size-3.5" /> {request.title}
          </p>
        </div>
      </div>

      {(canAssign || canResolveReviewed) && (
        <div className="flex items-center gap-2 border-b border-border pb-4">
          {canAssign && (
            <Button className="gap-1.5" onClick={onAssign}>
              <UserPlus className="size-4" />
              Phân công nhân viên
            </Button>
          )}
          {canResolveReviewed && (
            <>
              <Button variant="destructive" className="gap-1.5" onClick={() => onConfirmActionChange("REFUNDED")}>
                <ArrowCounterClockwise className="size-4" />
                Hoàn tiền
              </Button>
              <Button className="gap-1.5" onClick={() => onConfirmActionChange("COMPLETED")}>
                <CheckCircle className="size-4" />
                Đóng yêu cầu
              </Button>
            </>
          )}
        </div>
      )}

      <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
        <div className="p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Wrench className="size-4 text-primary" /> Thông tin yêu cầu
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <InfoCell label="Loại" value={REQUEST_TYPE_LABELS[request.request_type] || request.request_type} />
            <InfoCell label="Ngày tạo" value={formatDate(request.created_at)} />
            <InfoCell
              label="Giá dịch vụ"
              value={request.request_price ? `${Number(request.request_price).toLocaleString("vi-VN")} ₫` : "Chưa báo giá"}
            />
            {request.completed_at && <InfoCell label="Ngày hoàn thành" value={formatDate(request.completed_at)} />}
            {request.feedback_rating && (
              <InfoCell label="Đánh giá" value={"★".repeat(request.feedback_rating) + "☆".repeat(5 - request.feedback_rating)} />
            )}
          </div>
          {request.description && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mô tả</p>
              <p className="text-sm leading-relaxed">{request.description}</p>
            </div>
          )}
          {request.completion_note && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ghi chú hoàn thành</p>
              <p className="text-sm leading-relaxed">{request.completion_note}</p>
            </div>
          )}
          {request.feedback_comment && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nhận xét</p>
              <p className="text-sm leading-relaxed">{request.feedback_comment}</p>
            </div>
          )}
          {request.report_reason && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-3.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lý do báo cáo</p>
              <p className="text-sm leading-relaxed">{request.report_reason}</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-4 text-primary" /> Phòng
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">
                {request.room?.room_number}
                {request.room?.building?.name ? ` - ${request.room.building.name}` : ""}
              </p>
              {request.room?.floor && <p className="text-xs text-muted-foreground">Tầng: {request.room.floor}</p>}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <User className="size-4 text-primary" /> Cư dân
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{residentName}</p>
              {request.resident?.email && <p className="text-xs text-muted-foreground">{request.resident.email}</p>}
              {request.resident?.phone && <p className="text-xs text-muted-foreground">SĐT: {request.resident.phone}</p>}
            </div>
          </div>
        </Card>
      </div>

      {request.staff && (
        <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Wrench className="size-4 text-primary" /> Nhân viên xử lý
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{staffName}</p>
              {request.staff.phone && <p className="text-xs text-muted-foreground">SĐT: {request.staff.phone}</p>}
            </div>
          </div>
        </Card>
      )}

      {attachments.length > 0 && (
        <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <ImageIcon className="size-4 text-primary" /> Ảnh từ cư dân ({attachments.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {attachments.map((image) => (
                <a
                  key={image.id}
                  href={cdnUrl(image.image_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-80"
                >
                  <img src={cdnUrl(image.image_url)} alt="" className="size-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        </Card>
      )}

      {completionImages.length > 0 && (
        <Card className="overflow-hidden border-border py-0 shadow-sm gap-0">
          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <ImageIcon className="size-4 text-success" /> Ảnh hoàn thành - nhân viên ({completionImages.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {completionImages.map((image) => (
                <a
                  key={image.id}
                  href={cdnUrl(image.image_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-80"
                >
                  <img src={cdnUrl(image.image_url)} alt="" className="size-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        </Card>
      )}

      {request.status_history && request.status_history.length > 0 && (
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-sm font-semibold">Lịch sử trạng thái</span>
          </div>
          <div className="relative ml-3">
            {[...request.status_history]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((history, index, arr) => {
                const status = STATUS_MAP[history.to_status] || {
                  dot: "bg-muted-foreground/30",
                  text: "text-muted-foreground",
                  label: history.to_status,
                };
                const isLast = index === arr.length - 1;

                return (
                  <div key={history.id} className="relative pb-5 pl-6 last:pb-0">
                    {!isLast && <div className="absolute left-[4.5px] top-3 bottom-0 w-px bg-border" />}
                    <div className={`absolute left-0 top-[5px] size-2.5 rounded-full ring-2 ring-background ${status.dot}`} />
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm font-medium ${status.text}`}>{status.label}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(history.created_at)}</span>
                    </div>
                    {history.modifier && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        bởi {history.modifier.last_name} {history.modifier.first_name} (
                        {ROLE_LABELS[history.modifier.role] ?? history.modifier.role})
                      </p>
                    )}
                    {history.reason && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground/70">
                        <MessageSquare className="mt-0.5 size-3 shrink-0" />
                        {history.reason}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {assignDialog}

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && onConfirmActionChange(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận thao tác</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn {confirmAction === "REFUNDED" ? "hoàn tiền" : "đóng"} yêu cầu{" "}
              <span className="font-semibold text-foreground">{request.request_number}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onConfirmActionChange(null)} disabled={actionLoading}>
              Hủy
            </Button>
            <Button
              variant={confirmAction === "REFUNDED" ? "destructive" : "default"}
              onClick={() => onStatusAction(confirmAction)}
              disabled={actionLoading}
            >
              {actionLoading && <CircleNotch className="mr-1.5 size-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
