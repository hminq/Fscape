import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import AssignStaffDialog from "@/components/AssignStaffDialog";
import RequestDetailView from "@/components/request/RequestDetailView";

export default function BMRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/requests/${id}`);
      setRequest(res.data);
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleStatusAction = async (newStatus) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/requests/${id}/status`, { status: newStatus });
      toast.success(newStatus === "REFUNDED" ? "Đã hoàn tiền thành công" : "Đã đóng yêu cầu thành công");
      setConfirmAction(null);
      fetchRequest();
    } catch (err) {
      toast.error(err?.message || "Thao tác thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RequestDetailView
      request={request}
      loading={loading}
      error={error}
      onRetry={fetchRequest}
      onBack={() => navigate("/building-manager/requests")}
      canAssign={request?.status === "PENDING"}
      onAssign={() => setAssignOpen(true)}
      canResolveReviewed={request?.status === "REVIEWED"}
      confirmAction={confirmAction}
      onConfirmActionChange={setConfirmAction}
      onStatusAction={handleStatusAction}
      actionLoading={actionLoading}
      assignDialog={(
        <AssignStaffDialog
          buildingId={request?.room?.building_id || request?.room?.building?.id}
          requestId={request?.id}
          requestNumber={request?.request_number}
          open={assignOpen}
          onOpenChange={setAssignOpen}
          onAssigned={fetchRequest}
        />
      )}
    />
  );
}
