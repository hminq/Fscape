import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChatCircleText,
  Door,
  FileText,
  Lock,
} from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROOM_STATUS_META = {
  OCCUPIED: { label: "Đã thuê", color: "var(--color-chart-4)", tone: "text-chart-4" },
  AVAILABLE: { label: "Còn trống", color: "var(--color-chart-2)", tone: "text-chart-2" },
  LOCKED: { label: "Đã khóa", color: "var(--color-destructive)", tone: "text-destructive" },
};

const REQUEST_STATUS_META = {
  PENDING: { label: "Chờ xử lý", color: "var(--color-chart-1)" },
  ASSIGNED: { label: "Đã phân công", color: "var(--color-chart-3)" },
  PRICE_PROPOSED: { label: "Đã báo giá", color: "var(--color-chart-2)" },
  APPROVED: { label: "Đã duyệt", color: "var(--color-chart-4)" },
  IN_PROGRESS: { label: "Đang xử lý", color: "var(--color-primary)" },
  DONE: { label: "Chờ hoàn tất", color: "var(--color-chart-5)" },
  COMPLETED: { label: "Hoàn tất", color: "var(--color-chart-4)" },
};

function StatCard({ title, value, description, icon }) {
  const IconComponent = icon;

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/8 p-2 text-primary">
          <IconComponent className="size-5" weight="duotone" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusLegendList({ items, metaMap }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((item) => {
        const meta = metaMap[item.status] || {
          label: item.status,
          color: "var(--color-muted-foreground)",
        };

        return (
          <div key={item.status} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="text-xs text-muted-foreground">{meta.label}</span>
            <span className={cn("text-xs font-semibold", meta.tone || "text-foreground")}>
              {Number(item.count || 0).toLocaleString("vi-VN")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleChartTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {Number(payload[0]?.value || 0).toLocaleString("vi-VN")}
        {suffix}
      </p>
    </div>
  );
}

function FloorOccupancyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const current = payload[0];
  const isOccupied = current?.dataKey === "occupied_rooms";
  const toneClass = isOccupied ? "text-chart-4" : "text-chart-2";
  const labelText = isOccupied ? "Đã thuê" : "Còn trống";

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xs font-semibold", toneClass)}>{labelText}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {Number(current?.value || 0).toLocaleString("vi-VN")} phòng
      </p>
    </div>
  );
}

const WATCH_ITEM_META = {
  unpaid: { label: "Chưa thanh toán", color: "var(--color-chart-3)", toneClass: "text-chart-3" },
  overdue: { label: "Quá hạn", color: "var(--color-destructive)", toneClass: "text-destructive" },
};

export default function BuildingManagerHomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/dashboard/building-manager")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || "Không thể tải dữ liệu tổng quan.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const dashboard = data || {};
  const buildingName = dashboard.building?.name || "Tòa nhà được phân công";
  const roomStatusSummary = useMemo(() => dashboard.room_status_summary || [], [dashboard.room_status_summary]);
  const requestStatusSummary = useMemo(() => dashboard.request_status_summary || [], [dashboard.request_status_summary]);
  const floorOccupancy = useMemo(() => dashboard.floor_occupancy || [], [dashboard.floor_occupancy]);
  const contractSummary = dashboard.contract_summary || {};
  const invoiceSummary = dashboard.invoice_summary || {};
  const kpis = dashboard.kpis || {};

  const totalRooms = useMemo(
    () => roomStatusSummary.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [roomStatusSummary],
  );
  const occupiedRooms = Number(kpis.occupied_rooms || 0);
  const availableRooms = Number(kpis.available_rooms || 0);
  const lockedRooms = Number(
    roomStatusSummary.find((item) => item.status === "LOCKED")?.count || 0,
  );
  const activeRequests = Number(kpis.active_requests || 0);
  const expiringContracts = Number(kpis.expiring_contracts || 0);
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  const topStats = useMemo(
    () => [
      {
        title: "Tổng số phòng",
        value: totalRooms.toLocaleString("vi-VN"),
        description: `Tòa nhà hiện có ${occupiedRooms.toLocaleString("vi-VN")} phòng đã thuê.`,
        icon: Door,
      },
      {
        title: "Tỉ lệ lấp đầy",
        value: `${occupancyRate.toFixed(1)}%`,
        description: `${availableRooms.toLocaleString("vi-VN")} phòng còn trống và ${lockedRooms.toLocaleString("vi-VN")} phòng đang khóa.`,
        icon: Lock,
      },
      {
        title: "Yêu cầu đang xử lý",
        value: activeRequests.toLocaleString("vi-VN"),
        description: "Bao gồm yêu cầu chờ xử lý, đã phân công, đã duyệt và đang thực hiện.",
        icon: ChatCircleText,
      },
      {
        title: "Hợp đồng cần theo dõi",
        value: expiringContracts.toLocaleString("vi-VN"),
        description: `${Number(contractSummary.pending_manager_sign || 0).toLocaleString("vi-VN")} hợp đồng đang chờ quản lý ký.`,
        icon: FileText,
      },
    ],
    [
      activeRequests,
      availableRooms,
      contractSummary.pending_manager_sign,
      expiringContracts,
      lockedRooms,
      occupancyRate,
      occupiedRooms,
      totalRooms,
    ],
  );

  const occupancyDonutStyle = useMemo(() => {
    const occupiedPercent = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    const availablePercent = totalRooms > 0 ? (availableRooms / totalRooms) * 100 : 0;
    const lockedPercent = Math.max(0, 100 - occupiedPercent - availablePercent);
    return {
      background: `conic-gradient(
        var(--color-chart-4) 0% ${occupiedPercent}%,
        var(--color-chart-2) ${occupiedPercent}% ${occupiedPercent + availablePercent}%,
        var(--color-destructive) ${occupiedPercent + availablePercent}% ${occupiedPercent + availablePercent + lockedPercent}%,
        var(--color-muted) ${occupiedPercent + availablePercent + lockedPercent}% 100%
      )`,
    };
  }, [availableRooms, occupiedRooms, totalRooms]);

  const floorChartData = useMemo(
    () =>
      floorOccupancy.map((item) => ({
        ...item,
        occupied_rooms: Number(item.occupied_rooms || 0),
        vacant_rooms: Number(item.vacant_rooms || 0),
      })),
    [floorOccupancy],
  );

  const requestChartData = useMemo(
    () =>
      requestStatusSummary
        .filter((item) => Number(item.count || 0) > 0)
        .map((item) => ({
          ...item,
          count: Number(item.count || 0),
          label: REQUEST_STATUS_META[item.status]?.label || item.status,
        })),
    [requestStatusSummary],
  );

  const watchItems = useMemo(
    () => [
      {
        key: "unpaid",
        label: "Hóa đơn chưa thanh toán",
        value: Number(invoiceSummary.unpaid || 0).toLocaleString("vi-VN"),
        toneClass: "text-chart-3",
        rawValue: Number(invoiceSummary.unpaid || 0),
      },
      {
        key: "overdue",
        label: "Hóa đơn quá hạn",
        value: Number(invoiceSummary.overdue || 0).toLocaleString("vi-VN"),
        toneClass: "text-destructive",
        rawValue: Number(invoiceSummary.overdue || 0),
      },
    ],
    [invoiceSummary.overdue, invoiceSummary.unpaid],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Không thể tải dashboard</CardTitle>
          <CardDescription>{error || "Dữ liệu dashboard không hợp lệ hoặc chưa sẵn sàng."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 font-sans">
      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/15 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Bảng điều hành tòa nhà
        </p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{buildingName}</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi vận hành theo phạm vi tòa nhà bạn đang quản lý.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Khai thác phòng</CardTitle>
          <CardDescription>Phân bổ tổng thể và mật độ sử dụng phòng theo từng tầng trong tòa nhà.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="flex h-full flex-col rounded-xl border bg-muted/10 p-5">
              <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative flex size-44 items-center justify-center rounded-full border bg-background">
                <div className="size-[calc(100%-1rem)] rounded-full" style={occupancyDonutStyle} />
                <div className="absolute flex size-28 flex-col items-center justify-center rounded-full border bg-background">
                  <span className="text-3xl font-semibold">{occupancyRate.toFixed(1)}%</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Lấp đầy</span>
                </div>
              </div>
              </div>

              <div className="mt-auto w-full space-y-2 pt-4">
                <div>
                  <h3 className="text-sm font-medium">Tình trạng phòng</h3>
                  <p className="text-xs text-muted-foreground">Tổng số phòng đã thuê, còn trống và đang khóa.</p>
                </div>
                <div className="pt-1">
                  <StatusLegendList items={roomStatusSummary} metaMap={ROOM_STATUS_META} />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/10 p-5">
              <div>
                <h3 className="text-sm font-medium">Mật độ theo tầng</h3>
                <p className="text-xs text-muted-foreground">So sánh số phòng đã thuê và còn trống trên từng tầng.</p>
              </div>
              {floorChartData.length > 0 ? (
                <div className="h-80 rounded-lg border bg-background p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={floorChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        width={40}
                      />
                      <Tooltip
                        shared={false}
                        content={<FloorOccupancyTooltip />}
                        cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
                      />
                      <Bar dataKey="occupied_rooms" name="Đã thuê" stackId="room" radius={[6, 6, 0, 0]} fill="var(--color-chart-4)" />
                      <Bar dataKey="vacant_rooms" name="Còn trống" stackId="room" radius={[6, 6, 0, 0]} fill="var(--color-chart-2)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu phân bổ phòng theo tầng.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-stretch gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="flex h-full flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Tiến độ xử lý yêu cầu</CardTitle>
            <CardDescription>Phân bố các yêu cầu cư dân theo trạng thái xử lý hiện tại.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1">
            {requestChartData.length > 0 ? (
              <div className="h-full min-h-[20rem] w-full rounded-lg border bg-muted/10 p-2.5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestChartData} layout="vertical" margin={{ top: 12, right: 12, left: 24, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      width={110}
                      stroke="var(--color-muted-foreground)"
                      fontSize={12}
                    />
                    <Tooltip content={<SimpleChartTooltip suffix=" yêu cầu" />} cursor={{ fill: "var(--color-muted)", opacity: 0.2 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {requestChartData.map((item) => (
                        <Cell key={item.status} fill={REQUEST_STATUS_META[item.status]?.color || "var(--color-primary)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Chưa có yêu cầu nào trong tòa nhà.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Tình trạng hóa đơn</CardTitle>
            <CardDescription>Tổng hợp các hóa đơn chưa thanh toán và quá hạn trong tòa nhà.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 rounded-lg border bg-muted/10 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={watchItems} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    width={32}
                  />
                  <Tooltip content={<SimpleChartTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.2 }} />
                  <Bar dataKey="rawValue" radius={[6, 6, 0, 0]} barSize={36}>
                    {watchItems.map((item) => (
                      <Cell key={item.key} fill={WATCH_ITEM_META[item.key]?.color || "var(--color-primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {watchItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: WATCH_ITEM_META[item.key]?.color }} />
                    <span className="text-xs text-muted-foreground">{WATCH_ITEM_META[item.key]?.label || item.label}</span>
                  </div>
                  <span className={cn("text-sm font-semibold", item.toneClass)}>{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
