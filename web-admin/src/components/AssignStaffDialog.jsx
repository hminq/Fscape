import { useEffect, useState } from "react";
import { CircleNotch, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AssignStaffDialog({
  buildingId,
  requestId,
  requestNumber,
  open,
  onOpenChange,
  onAssigned,
}) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !buildingId) return;
    setSelectedStaffId("");
    setError(null);
    setLoading(true);
    api.get(`/api/buildings/${buildingId}/staffs`)
      .then((res) => setStaffList(Array.isArray(res) ? res : res.data || []))
      .catch((err) => {
        setStaffList([]);
        setError(err?.message || "Không thể tải danh sách nhân viên.");
      })
      .finally(() => setLoading(false));
  }, [open, buildingId]);

  const handleAssign = async () => {
    if (!selectedStaffId) {
      setError("Vui lòng chọn nhân viên.");
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      await api.patch(`/api/requests/${requestId}/assign`, {
        assigned_staff_id: selectedStaffId,
      });
      toast.success("Phân công nhân viên thành công");
      onOpenChange(false);
      onAssigned?.();
    } catch (err) {
      setError(err?.message || "Phân công thất bại. Vui lòng thử lại.");
    } finally {
      setAssigning(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phân công nhân viên</DialogTitle>
          <DialogDescription>
            Chọn nhân viên xử lý cho yêu cầu{" "}
            <span className="font-semibold text-foreground">{requestNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nhân viên xử lý</label>
              {staffList.length === 0 ? (
                <p className="text-sm text-destructive">Không có nhân viên nào trong tòa nhà.</p>
              ) : (
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
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
              )}
              {selectedStaff && (
                <p className="text-xs text-muted-foreground">
                  SĐT: {selectedStaff.phone || "Chưa cập nhật"}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assigning}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={assigning || staffList.length === 0} className="gap-1.5">
            {assigning && <CircleNotch className="size-4 animate-spin" />}
            <UserPlus className="size-4" />
            Xác nhận phân công
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
