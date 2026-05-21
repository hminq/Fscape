import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleNotch,
  Envelope,
  MagnifyingGlass,
  Phone,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/StateDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiJson } from "@/lib/apiClient";
import { cdnUrl, cn } from "@/lib/utils";
import defaultUserImg from "@/assets/default_user_img.jpg";

export default function BuildingStaffAssignmentPanel({
  buildingId,
  onUpdated,
  className,
}) {
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(null);

  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!buildingId) return;
    setStaffLoading(true);
    setSectionError("");
    try {
      const res = await apiJson(`/api/users?building_id=${buildingId}&limit=100`);
      const all = res.data?.data || [];
      setStaffList(all.filter((u) => u.role === "BUILDING_MANAGER" || u.role === "STAFF"));
    } catch (err) {
      setStaffList([]);
      setSectionError(err?.message || "Không thể tải danh sách nhân sự.");
    } finally {
      setStaffLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const managers = useMemo(
    () => staffList.filter((u) => u.role === "BUILDING_MANAGER"),
    [staffList],
  );
  const staff = useMemo(
    () => staffList.filter((u) => u.role === "STAFF"),
    [staffList],
  );
  const hasBM = managers.length > 0;

  const openAssign = async (role) => {
    setAssignRole(role);
    setAssignOpen(true);
    setAvailLoading(true);
    setAssignSearch("");
    setSectionError("");
    try {
      const res = await apiJson("/api/users?building_id=none&limit=200");
      const all = res.data?.data || [];
      setAvailableUsers(all.filter((u) => u.role === role && u.is_active));
    } catch (err) {
      setAvailableUsers([]);
      setSectionError(err?.message || "Không thể tải danh sách nhân sự khả dụng.");
    } finally {
      setAvailLoading(false);
    }
  };

  const handleAssign = async (userId) => {
    setAssigning(userId);
    setSectionError("");
    try {
      await apiJson(`/api/users/${userId}/building`, {
        method: "PATCH",
        body: { building_id: buildingId },
      });
      await fetchStaff();
      setAssignOpen(false);
      onUpdated?.();
    } catch (err) {
      setSectionError(err?.message || "Không thể gán nhân sự.");
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveConfirmed = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    setSectionError("");
    try {
      await apiJson(`/api/users/${confirmRemove.id}/building`, {
        method: "PATCH",
        body: { building_id: null },
      });
      await fetchStaff();
      setConfirmRemove(null);
      onUpdated?.();
    } catch (err) {
      setConfirmRemove(null);
      setSectionError(err?.message || "Không thể gỡ nhân sự.");
    } finally {
      setRemoving(false);
    }
  };

  const filteredAvail = useMemo(() => {
    if (!assignSearch.trim()) return availableUsers;
    const q = assignSearch.toLowerCase();
    return availableUsers.filter((u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q),
    );
  }, [availableUsers, assignSearch]);

  const UserRow = ({ user }) => (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={cdnUrl(user.avatar_url) || defaultUserImg}
          alt=""
          className="size-10 rounded-lg object-cover ring-1 ring-border"
          onError={(e) => {
            e.target.src = defaultUserImg;
          }}
        />
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {user.first_name} {user.last_name}
          </span>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {user.email && (
              <span className="flex items-center gap-1">
                <Envelope className="size-3" />
                {user.email}
              </span>
            )}
            {user.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {user.phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-destructive hover:bg-destructive/10"
        onClick={() => setConfirmRemove(user)}
      >
        <UserMinus className="size-4" />
      </Button>
    </div>
  );

  return (
    <>
      <div className={cn("space-y-5", className)}>
        {sectionError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {sectionError}
          </div>
        )}

        {staffLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted-foreground">
            <CircleNotch className="size-4 animate-spin" /> Đang tải nhân sự...
          </div>
        ) : (
          <>
            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Quản lý tòa nhà</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mỗi tòa nhà chỉ được có 1 quản lý.
                  </p>
                </div>
                {!hasBM && (
                  <Button size="sm" className="gap-1.5" onClick={() => openAssign("BUILDING_MANAGER")}>
                    <UserPlus className="size-3.5" /> Thêm quản lý
                  </Button>
                )}
              </div>

              {managers.length === 0 ? (
                <EmptyState icon={ShieldCheck} message="Chưa có quản lý" className="min-h-[18vh]" />
              ) : (
                <div className="space-y-2">
                  {managers.map((u) => <UserRow key={u.id} user={u} />)}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Nhân viên</h2>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => openAssign("STAFF")}>
                  <UserPlus className="size-3.5" /> Thêm nhân viên
                </Button>
              </div>

              {staff.length === 0 ? (
                <EmptyState icon={Users} message="Chưa có nhân viên được gán" className="min-h-[18vh]" />
              ) : (
                <div className="space-y-2">
                  {staff.map((u) => <UserRow key={u.id} user={u} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assignRole === "BUILDING_MANAGER" ? "Chọn quản lý" : "Thêm nhân viên"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email..."
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {availLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <CircleNotch className="size-4 animate-spin" /> Đang tải...
              </div>
            ) : filteredAvail.length === 0 ? (
              <EmptyState
                icon={Users}
                message={`Không tìm thấy ${assignRole === "BUILDING_MANAGER" ? "quản lý" : "nhân viên"} chưa được gán`}
                className="my-4 min-h-[15vh]"
              />
            ) : (
              filteredAvail.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={cdnUrl(u.avatar_url) || defaultUserImg}
                      alt=""
                      className="size-8 rounded-md object-cover ring-1 ring-border"
                      onError={(e) => {
                        e.target.src = defaultUserImg;
                      }}
                    />
                    <div>
                      <span className="text-sm font-medium">{u.first_name} {u.last_name}</span>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    disabled={assigning === u.id}
                    onClick={() => handleAssign(u.id)}
                  >
                    {assigning === u.id ? <CircleNotch className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                    Gán
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmRemove} onOpenChange={(v) => { if (!v) setConfirmRemove(null); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Gỡ nhân sự</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn gỡ{" "}
            <strong className="text-foreground">
              {confirmRemove?.first_name} {confirmRemove?.last_name}
            </strong>{" "}
            khỏi tòa nhà này?
          </p>
          <DialogFooter className="justify-center gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Hủy</Button>
            <Button variant="destructive" disabled={removing} onClick={handleRemoveConfirmed}>
              {removing && <CircleNotch className="mr-1.5 size-4 animate-spin" />}
              Gỡ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
