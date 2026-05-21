import BuildingStaffAssignmentPanel from "@/components/BuildingStaffAssignmentPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BuildingStaffDialog({
  open,
  onOpenChange,
  buildingId,
  buildingName,
  onUpdated,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <div className="border-b border-border px-5 py-4">
          <div>
            <DialogTitle className="text-lg">Nhân sự</DialogTitle>
            <DialogDescription className="mt-1">
              {buildingName ? `Quản lý nhân sự của ${buildingName}` : "Quản lý nhân sự tòa nhà"}
            </DialogDescription>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-5 py-4">
          <BuildingStaffAssignmentPanel
            buildingId={buildingId}
            onUpdated={onUpdated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
