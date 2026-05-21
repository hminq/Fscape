import { useAuth } from "@/contexts/AuthContext";
import BookingListTable from "@/components/BookingListTable";
import { CalendarCheck } from "@phosphor-icons/react";

export default function BMBookingsPage() {
  const { user } = useAuth();
  const buildingId = user?.building_id || user?.building?.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="size-6 text-primary" />
            Danh sách đặt phòng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý đơn đặt phòng trong tòa nhà của bạn</p>
        </div>
      </div>

      <BookingListTable buildingId={buildingId} isBM={true} />
    </div>
  );
}
