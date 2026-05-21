import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, Eye, CalendarCheck,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import StatusDot from "@/components/StatusDot";
import { BOOKING_STATUS_MAP } from "@/lib/constants";

const PER_PAGE = 10;
const STATUS_MAP = BOOKING_STATUS_MAP;

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "PENDING", label: "Chờ cọc" },
  { key: "DEPOSIT_PAID", label: "Đã cọc" },
  { key: "CONVERTED", label: "Đã chuyển HĐ" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const fmtVND = (v) => {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + " đ";
};

// ── BookingListTable ──────────────────────────────────────────── */

export default function BookingListTable({ buildingId, isBM }) {
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    
    // Construct query parameters
    const params = new URLSearchParams({
      page,
      limit: PER_PAGE,
    });
    
    if (filterKey !== "all") params.set("status", filterKey);
    if (search.trim()) params.set("search", search.trim());
    if (buildingId) params.set("building_id", buildingId);

    api.get(`/api/bookings?${params}`)
      .then((res) => {
        // Handle if API returns { data: [...] } or just an array
        const payload = res.data || {};
        const list = Array.isArray(payload.data) ? payload.data : (Array.isArray(res.data) ? res.data : []);
        setAllBookings(list);
        if (payload.pagination) {
          setTotal(payload.pagination.total);
          setTotalPages(payload.pagination.totalPages);
        } else if (res.total != null) {
          setTotal(res.total);
          setTotalPages(res.totalPages || Math.ceil(res.total / PER_PAGE));
        } else {
          setTotal(list.length);
          setTotalPages(Math.ceil(list.length / PER_PAGE) || 1);
        }
      })
      .catch(() => {
        setAllBookings([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [page, filterKey, search, buildingId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => { setPage(1); }, [filterKey, search, buildingId]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã đặt, người đặt, phòng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button key={f.key} size="sm"
              variant={filterKey === f.key ? "default" : "outline"}
              onClick={() => setFilterKey(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState className="py-16" />
      ) : total === 0 ? (
        <EmptyState icon={CalendarCheck} message="Không tìm thấy đơn đặt phòng nào" />
      ) : (
        <>
          <SectionHeader icon={CalendarCheck} count={total} countUnit="đơn">
            <Pagination page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </SectionHeader>

          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Mã đặt phòng</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Ngày nhận</TableHead>
                  <TableHead className="text-right">Tiền cọc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-4 w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBookings.map((b, idx) => {
                  const customerName = b.customer
                    ? `${b.customer.last_name || ""} ${b.customer.first_name || ""}`.trim() || "-"
                    : "-";
                  
                  return (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`${isBM ? "/building-manager" : ""}/bookings/${b.id}`)}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{b.booking_number}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{customerName}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        Phòng {b.room?.room_number} <span className="text-muted-foreground text-xs block truncate max-w-[150px]">{b.room?.building?.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground font-medium">
                        {formatDate(b.check_in_date)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtVND(b.deposit_amount)}</TableCell>
                      <TableCell><StatusDot status={b.status} statusMap={STATUS_MAP} /></TableCell>
                      <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`${isBM ? "/building-manager" : ""}/bookings/${b.id}`)}>
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

    </div>
  );
}
