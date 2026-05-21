import BookingListTable from "@/components/BookingListTable";
import { CalendarCheck } from "@phosphor-icons/react";

export default function BookingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="size-6 text-primary" />
            Danh sách đặt phòng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý tất cả đơn đặt phòng của hệ thống</p>
        </div>
      </div>

      <BookingListTable />
    </div>
  );
}
