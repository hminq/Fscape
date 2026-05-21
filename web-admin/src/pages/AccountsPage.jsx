import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, MagnifyingGlass, Users, CircleNotch, Envelope, Phone,
  ToggleLeft, ToggleRight, ShieldCheck, UserGear as UserCog, UserCheck,
  CaretLeft, CaretRight, Eye, Copy, Check, CheckCircle,
  Buildings, Key, ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { ROLE_LABELS, ROLE_STYLE_MAP, ROLE_ORDER } from "@/lib/constants";
import { LoadingState, EmptyState } from "@/components/StateDisplay";
import CreateAccountDialog from "@/components/CreateAccountDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, apiJson } from "@/lib/apiClient";
import defaultUserImg from "@/assets/default_user_img.jpg";
import StatusBar from "@/components/StatusBar";
import { formatDate as fmt, cdnUrl } from "@/lib/utils";

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";

const ROLE_ICON_MAP = {
  ADMIN: ShieldCheck,
  BUILDING_MANAGER: UserCog,
  STAFF: UserCheck,
  RESIDENT: Users,
  CUSTOMER: Users,
};

const ROLE_MAP = Object.fromEntries(
  ROLE_ORDER.map((key) => [
    key,
    { label: ROLE_LABELS[key], ...ROLE_STYLE_MAP[key], icon: ROLE_ICON_MAP[key] },
  ])
);

const RESETTABLE_ROLES = new Set(["BUILDING_MANAGER", "STAFF"]);

const STATUS = {
  true: { label: "Hoạt động" },
  false: { label: "Vô hiệu hóa" },
};

/* ── Role Donut (chart-1..5 colors) ───────── */

const ROLE_CHART = [
  { key: "ADMIN", label: "Admin", stroke: "stroke-chart-1", dot: "bg-chart-1" },
  { key: "BUILDING_MANAGER", label: "Quản lý", stroke: "stroke-chart-2", dot: "bg-chart-2" },
  { key: "STAFF", label: "Nhân viên", stroke: "stroke-chart-3", dot: "bg-chart-3" },
  { key: "RESIDENT", label: "Cư dân", stroke: "stroke-chart-4", dot: "bg-chart-4" },
  { key: "CUSTOMER", label: "Khách hàng", stroke: "stroke-chart-5", dot: "bg-chart-5" },
];

function RoleDonut({ counts, size = 80 }) {
  const entries = ROLE_CHART.map((r) => ({ ...r, count: counts[r.key] || 0 })).filter((r) => r.count > 0);
  const total = entries.reduce((s, r) => s + r.count, 0);
  const r = 36;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segs = entries.map((e) => {
    const len = total > 0 ? (e.count / total) * circ : 0;
    const seg = { ...e, len, offset: circ - acc };
    acc += len;
    return seg;
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        {segs.map((s) => (
          <circle key={s.key} cx="50" cy="50" r={r} fill="none" strokeWidth="10"
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={s.offset}
            className={`${s.stroke} transition-all duration-500`} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold leading-none">{total}</span>
      </div>
    </div>
  );
}

/* ── Summary Card (unified) ──────────────── */

function AccountSummary({ active, inactive, roleCounts, filterActive }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-8 flex-wrap">
        {/* Role donut + horizontal legend */}
        <div className="flex items-center gap-5">
          <RoleDonut counts={roleCounts} size={76} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {ROLE_CHART.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${r.dot} shrink-0`} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{r.label}</span>
                <span className="text-xs font-semibold">{roleCounts[r.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-px h-12 bg-border shrink-0" />

        <StatusBar active={active} inactive={inactive} filter={filterActive} label="tài khoản" />
      </div>
    </div>
  );
}

/* ── Account Detail Dialog ────────────────── */

function AccountDetailDialog({ open, onOpenChange, account }) {
  const [buildingName, setBuildingName] = useState(null);

  useEffect(() => {
    if (!open || !account?.building_id) { setBuildingName(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson(`/api/buildings/${account.building_id}`);
        if (!cancelled) setBuildingName((res.data || res)?.name || null);
      } catch {
        if (!cancelled) setBuildingName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open, account?.building_id]);

  if (!account) return null;
  const roleMeta = ROLE_MAP[account.role] || {};
  const RoleIcon = roleMeta.icon || Users;
  const name = fullName(account);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chi tiết tài khoản</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 pb-2">
          <img
            src={cdnUrl(account.avatar_url) || defaultUserImg}
            alt={name}
            className="size-20 rounded-full object-cover ring-2 ring-border"
          />
          <div className="text-center">
            <p className="text-lg font-semibold">{name}</p>
            <div className={`inline-flex items-center gap-1.5 mt-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleMeta.color}`}>
              <RoleIcon className="size-3" />
              {roleMeta.label || account.role}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2"><Envelope className="size-3.5" /> Email</span>
            <span className="font-medium">{account.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2"><Phone className="size-3.5" /> Điện thoại</span>
            <span className="font-medium">{account.phone || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2"><ShieldCheck className="size-3.5" /> Trạng thái</span>
            <span className={`flex items-center gap-1.5 font-medium ${account.is_active ? "text-success" : "text-muted-foreground"}`}>
              <span className={`size-2 rounded-full ${account.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
              {account.is_active ? "Hoạt động" : "Vô hiệu hóa"}
            </span>
          </div>
          {account.building_id && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Buildings className="size-3.5" /> Tòa nhà</span>
              <span className="font-medium truncate max-w-[180px]">{buildingName || "—"}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2"><Users className="size-3.5" /> Ngày tạo</span>
            <span className="font-medium">{fmt(account.created_at)}</span>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ── Role Section (self-fetching, server-side pagination) ── */

const PER_SECTION = 10;

function RoleSection({ role, search, filterActive, onToggle, onView, onReset, refreshKey }) {
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const roleMeta = ROLE_MAP[role] || {};
  const Icon = roleMeta.icon || Users;

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role, page, limit: PER_SECTION });
      if (search.trim()) params.set("search", search.trim());
      if (filterActive === "active") params.set("is_active", "true");
      if (filterActive === "inactive") params.set("is_active", "false");
      const res = await apiJson(`/api/users?${params}`);
      const body = res.data || res;
      setAccounts(body.data || []);
      setTotalPages(body.total_pages || body.totalPages || 1);
      setTotal(body.total || 0);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [role, page, search, filterActive]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts, refreshKey]);

  useEffect(() => {
    const handleUserUpdate = (e) => {
      const { id, is_active } = e.detail;
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, is_active } : a)));
    };
    window.addEventListener("account-updated", handleUserUpdate);
    return () => window.removeEventListener("account-updated", handleUserUpdate);
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => { setPage(1); }, [search, filterActive]);

  if (!loading && total === 0 && !search && filterActive === "all") return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <Icon className="size-3.5 text-primary" />
          </div>
          <h2 className="text-[15px] font-semibold">{roleMeta.label || role}</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {loading ? <CircleNotch className="size-3.5 animate-spin inline" /> : `${total} kết quả`}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="size-8" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <CaretLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-8" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <CaretRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState className="py-10" />
      ) : accounts.length === 0 ? (
        <EmptyState icon={Icon} message={`Không tìm thấy ${roleMeta.label?.toLowerCase() || role} nào`} />
      ) : (
      <Card className="overflow-hidden py-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4">#</TableHead>
              <TableHead>Thông tin</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right pr-4 w-24">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((acc, idx) => {
              const st = STATUS[acc.is_active] || STATUS["true"];
              return (
                <TableRow key={acc.id}>
                  <TableCell className="pl-4 text-muted-foreground text-xs">
                    {(page - 1) * PER_SECTION + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{fullName(acc)}</span>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Envelope className="size-3" /> {acc.email}</span>
                        {acc.phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {acc.phone}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`size-2 rounded-full ${acc.is_active ? "bg-success" : "bg-muted-foreground/30"}`} />
                      <span className={acc.is_active ? "text-success font-medium" : "text-muted-foreground"}>
                        {st.label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(acc.created_at)}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {acc.role !== "ADMIN" && (
                        <Button size="icon" variant="ghost" className="size-8"
                          title={acc.is_active ? "Tắt hoạt động" : "Bật hoạt động"}
                          onClick={() => onToggle(acc)}>
                          {acc.is_active
                            ? <ToggleRight className="size-5 text-success" />
                            : <ToggleLeft className="size-5 text-muted-foreground" />}
                        </Button>
                      )}
                      {RESETTABLE_ROLES.has(acc.role) && (
                        <Button size="icon" variant="ghost" className="size-8"
                          title="Đặt lại mật khẩu"
                          onClick={() => onReset(acc)}>
                          <Key className="size-4 text-warning" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="size-8"
                        title="Chi tiết"
                        onClick={() => onView(acc)}>
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      )}
    </section>
  );
}

/* ── Main Page ─────────────────────────────── */

export default function AccountsPage() {
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null);
  const [detailAcc, setDetailAcc] = useState(null);

  const [stats, setStats] = useState(null);

  // Bump to trigger all RoleSections to re-fetch
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => { setRefreshKey((k) => k + 1); }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiJson("/api/users/stats");
      setStats(res.data || null);
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);

  const totalCount = stats?.total ?? 0;
  const activeCount = stats?.active ?? 0;
  const roleCounts = useMemo(() => {
    const base = { ADMIN: 0, BUILDING_MANAGER: 0, STAFF: 0, RESIDENT: 0, CUSTOMER: 0 };
    if (stats?.by_role) {
      for (const { role, count } of stats.by_role) base[role] = count;
    }
    return base;
  }, [stats]);

  /* actions */
  const [toggleError, setToggleError] = useState(null);

  const handleToggle = async () => {
    setSaving(true);
    setToggleError(null);
    try {
      await api.patch(`/api/users/${confirmToggle.id}/status`, { is_active: !confirmToggle.is_active });
      
      // Thông báo cho các RoleSection cập nhật trạng thái local
      window.dispatchEvent(new CustomEvent("account-updated", { 
        detail: { id: confirmToggle.id, is_active: !confirmToggle.is_active } 
      }));

      setConfirmToggle(null);
      fetchStats(); // Chỉ load lại thống kê ở trên đầu
    } catch (err) {
      setToggleError(err.message || "Không thể cập nhật.");
    } finally {
      setSaving(false);
    }
  };

  // Debounce search to avoid firing API calls on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  /* Reset password logic */
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetCopied, setResetCopied] = useState(false);

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      const res = await apiJson(`/api/users/${confirmReset.id}/reset-password`, { method: "POST" });
      setResetResult(res.data || res);
    } catch (err) {
      toast.error(err.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setResetting(false);
    }
  };

  const handleCopyReset = () => {
    navigator.clipboard.writeText(resetResult?.new_password || "");
    setResetCopied(true);
    setTimeout(() => setResetCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tài khoản</h1>
          <p className="text-sm text-muted-foreground">Phân quyền và quản lý nhân sự trong hệ thống</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> Tạo tài khoản
        </Button>
      </div>

      {/* Summary */}
      <AccountSummary
        active={activeCount}
        inactive={totalCount - activeCount}
        roleCounts={roleCounts}
        filterActive={filterActive}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm tài khoản..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả" },
            { key: "active", label: "Hoạt động" },
            { key: "inactive", label: "Không hoạt động" },
          ].map((f) => (
            <Button key={f.key} size="sm"
              variant={filterActive === f.key ? "default" : "outline"}
              onClick={() => setFilterActive(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List - one section per role */}
      <div className="space-y-8">
        {ROLE_ORDER.map((role) => (
          <RoleSection
            key={role}
            role={role}
            search={debouncedSearch}
            filterActive={filterActive}
            onToggle={setConfirmToggle}
            onView={setDetailAcc}
            onReset={setConfirmReset}
            refreshKey={refreshKey}
          />
        ))}
      </div>

      {/* Create dialog */}
      <CreateAccountDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSaved={refresh}
      />

      {/* Detail dialog */}
      <AccountDetailDialog
        open={!!detailAcc}
        onOpenChange={(v) => !v && setDetailAcc(null)}
        account={detailAcc}
      />

      {/* Confirm toggle */}
      <Dialog open={!!confirmToggle} onOpenChange={(v) => { if (!v) { setConfirmToggle(null); setToggleError(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{confirmToggle?.is_active ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmToggle?.is_active
              ? <>Bạn có chắc muốn <strong className="text-foreground">vô hiệu hóa</strong> tài khoản <strong className="text-foreground">&quot;{confirmToggle && fullName(confirmToggle)}&quot;</strong>?</>
              : <>Bạn có chắc muốn <strong className="text-foreground">kích hoạt</strong> tài khoản <strong className="text-foreground">&quot;{confirmToggle && fullName(confirmToggle)}&quot;</strong>?</>}
          </p>
          {toggleError && (
            <p className="text-sm text-destructive">{toggleError}</p>
          )}
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => { setConfirmToggle(null); setToggleError(null); }}>Hủy</Button>
            <Button
              variant={confirmToggle?.is_active ? "destructive" : "default"}
              disabled={saving} onClick={handleToggle}>
              {saving && <CircleNotch className="size-4 animate-spin mr-1.5" />}
              {confirmToggle?.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirm reset password */}
      <Dialog open={!!confirmReset} onOpenChange={(v) => { if (!v) { setConfirmReset(null); setResetResult(null); } }}>
        <DialogContent className={resetResult ? "max-w-sm text-center" : "max-w-md"}>
          {!resetResult ? (
            <>
              <DialogHeader>
                <DialogTitle>Đặt lại mật khẩu</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-3 text-center">
                <div className="inline-flex size-12 rounded-full bg-warning/10 items-center justify-center mb-2">
                  <Key className="size-6 text-warning" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Bạn có chắc muốn đặt lại mật khẩu cho tài khoản <br />
                  <strong className="text-foreground text-base">&quot;{confirmReset && fullName(confirmReset)}&quot;</strong>?
                </p>
                <p className="text-xs text-muted-foreground font-medium p-2 bg-muted/50 rounded-lg border border-border">
                  Mật khẩu mới sẽ được tạo tự động và hiển thị ngay sau khi bạn xác nhận.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:justify-center">
                <Button variant="outline" onClick={() => setConfirmReset(null)}>Hủy</Button>
                <Button disabled={resetting} onClick={handleResetPassword}>
                  {resetting && <CircleNotch className="size-4 animate-spin mr-1.5" />}
                  Xác nhận đặt lại
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="size-14 rounded-full bg-warning/10 flex items-center justify-center">
                  <ArrowCounterClockwise className="size-7 text-warning" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Đặt lại mật khẩu thành công</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fullName(confirmReset)} - {confirmReset.email}
                  </p>
                </div>

                <div className="w-full rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-left">
                  <p className="text-xs text-muted-foreground text-center">Mật khẩu mới của người dùng:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono font-semibold tracking-wider text-center select-all">
                      {resetResult.new_password}
                    </code>
                    <Button size="icon" variant="outline" className="shrink-0 size-9" onClick={handleCopyReset}>
                      {resetCopied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-center">
                <Button onClick={() => { setConfirmReset(null); setResetResult(null); }}>Đóng</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
