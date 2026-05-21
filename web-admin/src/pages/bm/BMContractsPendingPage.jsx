import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Eye,
  PencilLine,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/Pagination";
import SectionHeader from "@/components/SectionHeader";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import StatusDot from "@/components/StatusDot";
import { CONTRACT_STATUS_MAP } from "@/lib/constants";

const STATUS_MAP = CONTRACT_STATUS_MAP;
const PER_PAGE = 10;
const PENDING_STATUSES = "PENDING_MANAGER_SIGNATURE,PENDING_CUSTOMER_SIGNATURE";

const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "manager", label: "Chờ QL ký", statuses: "PENDING_MANAGER_SIGNATURE" },
  { key: "customer", label: "Chờ KH ký", statuses: "PENDING_CUSTOMER_SIGNATURE" },
];

const fullName = (user) => {
  if (!user) return "-";
  const name = `${user.last_name || ""} ${user.first_name || ""}`.trim();
  return name || user.email || "-";
};

export default function BMContractsPendingPage() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });

      const filter = STATUS_FILTERS.find((item) => item.key === filterKey);
      params.set("status", filter?.statuses || PENDING_STATUSES);

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get(`/api/contracts?${params}`);
      setContracts(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || res.totalPages || 1);
    } catch {
      setError("Không thể tải dữ liệu.");
      setContracts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filterKey, page, search]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    setPage(1);
  }, [filterKey, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Hợp đồng chờ ký</h1>
        <p className="text-sm text-muted-foreground">Các hợp đồng đang chờ khách hàng hoặc quản lý xác nhận và ký</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã HĐ, khách hàng, phòng..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.key}
              size="sm"
              variant={filterKey === filter.key ? "default" : "outline"}
              onClick={() => setFilterKey(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState className="min-h-[30vh]" />
      ) : error ? (
        <div className="py-14 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchPending}>
            Thử lại
          </Button>
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState icon={CheckCircle} message="Không có hợp đồng nào chờ ký" />
      ) : (
        <>
          <SectionHeader icon={Clock} count={total} countUnit="hợp đồng chờ ký">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          </SectionHeader>

          <Card className="overflow-hidden py-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Phòng</TableHead>
                  <TableHead>Hạn ký</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-4 w-24">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract, index) => {
                  const isManagerSign = contract.status === "PENDING_MANAGER_SIGNATURE";
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="pl-4 text-muted-foreground text-xs">
                        {(page - 1) * PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{fullName(contract.customer)}</TableCell>
                      <TableCell>
                        {contract.room?.room_number || "-"}
                        {contract.room?.building?.name && (
                          <span className="text-muted-foreground"> - {contract.room.building.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contract.signature_expires_at ? formatDate(contract.signature_expires_at) : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusDot status={contract.status} statusMap={STATUS_MAP} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {isManagerSign ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/building-manager/contracts/${contract.id}/sign`)}
                          >
                            <PencilLine className="mr-1.5 size-4" />
                            Ký
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => navigate(`/building-manager/contracts/${contract.id}`)}
                          >
                            <Eye className="size-4" />
                          </Button>
                        )}
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
