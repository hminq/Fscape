import { useEffect, useState } from "react";
import { CircleNotch, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACTIVE_STATUSES = ["ACTIVE", "EXPIRING_SOON"];

export default function TerminateContractDialog({
  contract,
  open,
  onOpenChange,
  onTerminated,
}) {
  const [reason, setReason] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isActive = ACTIVE_STATUSES.includes(contract?.status);
  const buildingId = contract?.room?.building?.id;

  // Fetch staff list when dialog opens for active contracts
  useEffect(() => {
    if (!open || !isActive || !buildingId) return;
    setSelectedStaffId("");
    setReason("");
    setError(null);
    setStaffLoading(true);
    api.get(`/api/buildings/${buildingId}/staffs`)
      .then((res) => setStaffList(Array.isArray(res) ? res : res.data || []))
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));
  }, [open, isActive, buildingId]);

  // Reset form when dialog opens for pending contracts
  useEffect(() => {
    if (!open) return;
    if (!isActive) {
      setReason("");
      setSelectedStaffId("");
      setError(null);
    }
  }, [open, isActive]);

  const handleTerminate = async () => {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do chấm dứt.");
      return;
    }
    if (isActive && !selectedStaffId) {
      setError("Vui lòng chọn nhân viên thực hiện checkout.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = { termination_reason: reason.trim() };
      if (isActive) body.assigned_staff_id = selectedStaffId;

      const res = await api.patch(`/api/contracts/${contract.id}/terminate`, body);
      toast.success(res.message || "Đã chấm dứt hợp đồng thành công");
      onOpenChange(false);
      onTerminated?.();
    } catch (err) {
      setError(err?.message || "Không thể chấm dứt hợp đồng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Warning className="size-5" /> Chấm dứt hợp đồng
          </DialogTitle>
          <DialogDescription>
            Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contract info summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hợp đồng</p>
            <p className="text-sm font-semibold">{contract?.contract_number}</p>
            <p className="text-xs text-muted-foreground">
              {contract?.room?.room_number}
              {contract?.room?.building?.name ? ` - ${contract.room.building.name}` : ""}
            </p>
          </div>

          {/* Termination reason */}
          <div className="space-y-2">
            <Label htmlFor="termination-reason">
              Lý do chấm dứt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="termination-reason"
              placeholder="Nhập lý do chấm dứt hợp đồng..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={submitting}
            />
            <p className="text-[11px] text-muted-foreground text-right">{reason.length}/1000</p>
          </div>

          {/* Staff selection - only for active contracts */}
          {isActive && (
            <div className="space-y-2">
              <Label>
                Nhân viên thực hiện checkout <span className="text-destructive">*</span>
              </Label>
              {staffLoading ? (
                <div className="flex items-center justify-center py-4">
                  <CircleNotch className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : staffList.length === 0 ? (
                <p className="text-sm text-destructive">Không có nhân viên nào trong tòa nhà.</p>
              ) : (
                <>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId} disabled={submitting}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn nhân viên..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.last_name} {s.first_name} - {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStaff && (
                    <p className="text-xs text-muted-foreground">
                      SĐT: {selectedStaff.phone || "Chưa cập nhật"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleTerminate}
            disabled={submitting || (isActive && staffList.length === 0)}
            className="gap-2"
          >
            {submitting && <CircleNotch className="size-4 animate-spin" />}
            {isActive ? "Tạo yêu cầu checkout" : "Chấm dứt ngay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
