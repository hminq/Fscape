import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CircleNotch, ArrowLeft, MapPin, CalendarDots, FileText, DownloadSimple, Eye, PenNib, MagnifyingGlass, FunnelSimple, CaretDown, CaretUp, SortAscending, CaretLeft, CaretRight, HourglassMedium, Clock, ArrowsClockwise } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import Footer from "@/components/layout/Footer";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatDisplayDate } from "@/lib/formatters";
import { cdnUrl } from "@/lib/utils";

const STATUS_CONFIG = {
  DRAFT: { text: "Bản nháp", className: "bg-gray-100 text-gray-600" },
  PENDING_CUSTOMER_SIGNATURE: { text: "Chờ bạn ký", className: "bg-olive/15 text-olive" },
  PENDING_MANAGER_SIGNATURE: { text: "Chờ quản lý ký", className: "bg-blue-100 text-blue-700" },
  PENDING_FIRST_PAYMENT: { text: "Chờ thanh toán kỳ đầu", className: "bg-primary/10 text-primary" },
  PENDING_CHECK_IN: { text: "Chờ nhận phòng", className: "bg-teal-100 text-teal-700" },
  ACTIVE: { text: "Đang hiệu lực", className: "bg-green-100 text-green-700" },
  EXPIRING_SOON: { text: "Sắp hết hạn", className: "bg-olive/15 text-olive" },
  FINISHED: { text: "Đã kết thúc", className: "bg-gray-100 text-gray-600" },
  TERMINATED: { text: "Đã chấm dứt", className: "bg-red-100 text-red-600" },
};

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "action_needed", label: "Cần xử lý" },
  { value: "ACTIVE", label: "Đang hiệu lực" },
  { value: "EXPIRING_SOON", label: "Sắp hết hạn" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "TERMINATED", label: "Đã chấm dứt" },
];

const SORT_OPTIONS = [
  { value: "created_at:DESC", label: "Mới nhất" },
  { value: "created_at:ASC", label: "Cũ nhất" },
  { value: "start_date:ASC", label: "Bắt đầu gần nhất" },
  { value: "start_date:DESC", label: "Bắt đầu xa nhất" },
  { value: "end_date:ASC", label: "Kết thúc gần nhất" },
  { value: "end_date:DESC", label: "Kết thúc xa nhất" },
];

function FilterDropdown({ options, value, onChange, icon: Icon, placeholder, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeLabel = options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-muted/30 bg-white px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:border-primary hover:text-primary"
      >
        {Icon && <Icon className="h-4 w-4" />}
        {activeLabel}
        {open ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} z-20 mt-2 max-h-64 w-48 overflow-y-auto overflow-x-hidden rounded-xl border border-muted/20 bg-white shadow-lg`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                value === option.value
                  ? "bg-primary text-white font-semibold"
                  : "text-secondary hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MyContractsContent() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters & sort
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortValue, setSortValue] = useState("created_at:DESC");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, sortValue]);

  const fetchContracts = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      setError("");
      const [sort_by, sort_order] = sortValue.split(":");
      const params = new URLSearchParams({ page, limit, sort_by, sort_order });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await api.get(`/api/contracts/my?${params}`);
      setContracts(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, page, sortValue, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    fetchContracts();
  }, [isLoggedIn, navigate, fetchContracts]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setSortValue("created_at:DESC");
    setPage(1);
  };

  const hasFilters = debouncedSearch || statusFilter !== "all";

  if (loading && contracts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="size-4" />
        Quay lại
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Hợp đồng của tôi</h1>
          <p className="text-secondary text-sm">
            {total > 0
              ? `${total} hợp đồng`
              : "Xem và quản lý các hợp đồng thuê phòng."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {total === 0 && !hasFilters && !error ? (
        <div className="text-center py-20">
          <p className="text-lg text-secondary mb-4">Bạn chưa có hợp đồng nào.</p>
          <Link
            to="/rooms"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white"
          >
            Tìm phòng ngay
          </Link>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="relative flex-1">
              <MagnifyingGlass className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-secondary/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã hợp đồng..."
                className="w-full rounded-full border border-muted/30 bg-white py-2 pl-10 pr-4 text-sm text-primary outline-none transition-colors placeholder:text-secondary/40 focus:border-primary hover:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
                icon={FunnelSimple}
                placeholder="Tất cả"
                align="right"
              />
              <FilterDropdown
                options={SORT_OPTIONS}
                value={sortValue}
                onChange={setSortValue}
                icon={SortAscending}
                placeholder="Sắp xếp"
                align="right"
              />
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <CircleNotch className="size-6 animate-spin text-primary" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-secondary">Không tìm thấy hợp đồng phù hợp.</p>
              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="mt-3 text-sm font-medium text-primary hover:underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {contracts.map((c) => (
                  <ContractRow key={c.id} contract={c} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded-full border border-muted/30 px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CaretLeft className="size-4" />
                    Trước
                  </button>
                  <span className="px-3 text-sm text-secondary">
                    Trang <span className="font-semibold text-primary">{page}</span> / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded-full border border-muted/30 px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sau
                    <CaretRight className="size-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function ContractRow({ contract }) {
  const room = contract.room;
  const building = room?.building;
  const statusInfo = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT;
  const isTerminal = contract.status === "FINISHED" || contract.status === "TERMINATED";
  const needsSign = contract.status === "PENDING_CUSTOMER_SIGNATURE";
  const waitingManager = contract.status === "PENDING_MANAGER_SIGNATURE";
  const canRenew = contract.status === "ACTIVE" || contract.status === "EXPIRING_SOON";

  return (
    <div className={`flex flex-col sm:flex-row gap-4 rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md ${
      isTerminal
        ? "border-gray-100 opacity-70"
        : needsSign
          ? "border-olive/30 bg-olive/5"
          : "border-gray-200"
    }`}>
      {/* Icon */}
      <div className="hidden sm:flex items-center">
        <FileText className="size-5 text-olive shrink-0" />
      </div>

      {/* Contract info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-primary truncate">
          {contract.contract_number}
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary mt-1">
          {building && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {building.name} - {room?.room_number}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDots className="size-3" />
            {formatDisplayDate(contract.start_date)} — {formatDisplayDate(contract.end_date)}
          </span>
        </div>

        <span className={`inline-flex mt-2 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.className}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 shrink-0 sm:ml-auto flex-wrap">
        <Link
          to={`/sign?contract_id=${contract.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-secondary hover:bg-gray-50 transition-colors"
        >
          <Eye className="size-4" />
          Xem
        </Link>
        {needsSign && (
          <Link
            to={`/sign?contract_id=${contract.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-olive px-3 py-2 text-sm font-medium text-white hover:bg-olive/90 transition-colors"
          >
            <PenNib className="size-4" />
            Ký hợp đồng
          </Link>
        )}
        {waitingManager && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600">
            <HourglassMedium className="size-4" />
            Chờ quản lý ký
          </span>
        )}
        {canRenew && (
          <Link
            to={`/renew?contract_id=${contract.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-olive px-3 py-2 text-sm font-medium text-white hover:bg-olive/90 transition-colors"
          >
            <ArrowsClockwise className="size-4" />
            Gia hạn
          </Link>
        )}
        {contract.pdf_url && (
          <a
            href={cdnUrl(contract.pdf_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <DownloadSimple className="size-4" />
            Tải PDF
          </a>
        )}
      </div>
    </div>
  );
}

export default function MyContractsPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <AppNavbar />
        <div className="flex-1">
          <MyContractsContent />
        </div>
        <Footer />
      </div>
    </LocationsProvider>
  );
}
