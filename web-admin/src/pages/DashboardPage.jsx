import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Calendar,
  CalendarBlank,
  CurrencyDollar,
  Door,
  Lock,
  TrendDown,
  TrendUp,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CURRENCY_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/8 p-2 text-primary">
          <Icon className="size-5" weight="duotone" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {CURRENCY_FORMATTER.format(Number(payload[0]?.value || 0))}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/dashboard")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const dashboard = data || {};
  const totalRooms = Number(dashboard.total_rooms || 0);
  const occupiedRooms = Number(dashboard.occupied_rooms || 0);
  const recentRevenue = Number(dashboard.recent_revenue || 0);
  const monthlyRevenue = dashboard.monthly_revenue || [];
  const revenueTrend = dashboard.revenue_trend || {};
  const monthlyBookings = dashboard.monthly_bookings || [];
  const bookingTrend = dashboard.booking_trend || {};
  const roomTypeBookingDistribution = dashboard.room_type_booking_distribution || [];
  const topBookedRoomType = dashboard.top_booked_room_type || null;
  const employeeStats = dashboard.employee_stats || { total: 0, active: 0, inactive: 0 };
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  const topStats = useMemo(
    () => [
      {
        title: "Tổng số phòng",
        value: totalRooms.toLocaleString("vi-VN"),
        description: "Tổng số phòng hiện có trên toàn hệ thống.",
        icon: Door,
      },
      {
        title: "Phòng đang thuê",
        value: occupiedRooms.toLocaleString("vi-VN"),
        description: `${vacantRooms.toLocaleString("vi-VN")} phòng còn trống.`,
        icon: Lock,
      },
      {
        title: "Nhân sự nội bộ",
        value: employeeStats.active.toLocaleString("vi-VN"),
        description: `${employeeStats.active.toLocaleString("vi-VN")} nhân sự đang hoạt động trong hệ thống.`,
        icon: Briefcase,
      },
      {
        title: "Doanh thu 30 ngày",
        value: CURRENCY_FORMATTER.format(recentRevenue),
        description: "Tổng từ các giao dịch thanh toán thành công gần đây.",
        icon: CurrencyDollar,
      },
    ],
    [employeeStats.active, employeeStats.inactive, employeeStats.total, occupiedRooms, recentRevenue, totalRooms, vacantRooms],
  );
  const chartRevenueData = useMemo(
    () =>
      monthlyRevenue.map((item) => ({
        ...item,
        short_amount: Number(item.amount || 0),
      })),
    [monthlyRevenue],
  );
  const chartBookingData = useMemo(
    () =>
      monthlyBookings.map((item) => ({
        ...item,
        booking_count: Number(item.count || 0),
      })),
    [monthlyBookings],
  );
  const chartRoomTypeBookingData = useMemo(
    () =>
      roomTypeBookingDistribution
        .map((item) => ({
          ...item,
          booking_count: Number(item.booking_count || 0),
        }))
        .sort((a, b) => b.booking_count - a.booking_count),
    [roomTypeBookingDistribution],
  );

  const occupancyDonutStyle = useMemo(() => {
    const occupiedPercent = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    return {
      background: `conic-gradient(var(--color-chart-4) 0% ${occupiedPercent}%, var(--color-chart-2) ${occupiedPercent}% 100%)`,
    };
  }, [occupiedRooms, totalRooms]);

  const revenueTrendMeta = useMemo(() => {
    const direction = revenueTrend.direction || "flat";
    if (direction === "up") {
      return {
        icon: TrendUp,
        title: "Doanh thu đang tăng",
        classes: "border-green-200 bg-green-50 text-green-700",
        description: `Tăng ${revenueTrend.percent_change || 0}% so với ${revenueTrend.previous_month_label || "tháng trước"}.`,
      };
    }

    if (direction === "down") {
      return {
        icon: TrendDown,
        title: "Doanh thu đang giảm",
        classes: "border-red-200 bg-red-50 text-red-700",
        description: `Giảm ${revenueTrend.percent_change || 0}% so với ${revenueTrend.previous_month_label || "tháng trước"}.`,
      };
    }

    return {
      icon: Calendar,
      title: "Doanh thu ổn định",
      classes: "border-chart-2/20 bg-chart-2/8 text-chart-2",
      description: "Doanh thu tháng này chưa có biến động đáng kể.",
    };
  }, [revenueTrend]);
  const TrendIcon = revenueTrendMeta.icon;
  const bookingTrendMeta = useMemo(() => {
    const direction = bookingTrend.direction || "flat";
    if (direction === "up") {
      return {
        icon: TrendUp,
        title: "Lượng đặt phòng đang tăng",
        classes: "border-green-200 bg-green-50 text-green-700",
        description: `Tăng ${bookingTrend.percent_change || 0}% so với ${bookingTrend.previous_month_label || "tháng trước"}.`,
      };
    }

    if (direction === "down") {
      return {
        icon: TrendDown,
        title: "Lượng đặt phòng đang giảm",
        classes: "border-red-200 bg-red-50 text-red-700",
        description: `Giảm ${bookingTrend.percent_change || 0}% so với ${bookingTrend.previous_month_label || "tháng trước"}.`,
      };
    }

    return {
      icon: Calendar,
      title: "Lượng đặt phòng ổn định",
      classes: "border-chart-2/20 bg-chart-2/8 text-chart-2",
      description: "Số lượng đặt phòng tháng này chưa có biến động đáng kể.",
    };
  }, [bookingTrend]);
  const BookingTrendIcon = bookingTrendMeta.icon;

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

  if (!data) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Không thể tải dashboard</CardTitle>
          <CardDescription>
            API không phản hồi hoặc dữ liệu không hợp lệ. Kiểm tra lại server rồi tải lại trang.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 font-sans">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan vận hành, doanh thu và tình trạng khai thác phòng cho khu vực quản trị.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tình trạng phòng</CardTitle>
            <CardDescription>Phân bổ số phòng đang thuê và còn trống.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-6">
              <div className="flex justify-center">
                <div className="relative flex size-44 items-center justify-center rounded-full border bg-muted/20">
                  <div className="size-[calc(100%-1rem)] rounded-full" style={occupancyDonutStyle} />
                  <div className="absolute flex size-28 flex-col items-center justify-center rounded-full border bg-background">
                    <span className="text-3xl font-semibold">{occupancyRate.toFixed(1)}%</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Lấp đầy</span>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-xl space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-chart-4/20 bg-chart-4/8 p-4">
                    <p className="text-sm text-muted-foreground">Đã thuê</p>
                    <p className="mt-1 text-2xl font-semibold text-chart-4">{occupiedRooms.toLocaleString("vi-VN")}</p>
                  </div>
                  <div className="rounded-lg border border-chart-2/20 bg-chart-2/8 p-4">
                    <p className="text-sm text-muted-foreground">Còn trống</p>
                    <p className="mt-1 text-2xl font-semibold text-chart-2">{vacantRooms.toLocaleString("vi-VN")}</p>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo tháng</CardTitle>
            <CardDescription>Biến động doanh thu trong 6 tháng gần nhất.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartRevenueData.length > 0 ? (
                <div className="h-72 rounded-lg border bg-muted/10 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartRevenueData}
                      margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
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
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        stroke="var(--color-muted-foreground)"
                        fontSize={12}
                        width={88}
                        tickFormatter={(value) => `${Math.round(value / 1000000)}tr`}
                      />
                      <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "var(--color-border)", strokeDasharray: "4 4" }} />
                      <Area
                        type="monotone"
                        dataKey="short_amount"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        fill="url(#revenueFill)"
                        activeDot={{ r: 4, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu doanh thu theo tháng.
                </div>
              )}

              {chartRevenueData.length > 0 && (
                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div className={cn("rounded-lg border p-4", revenueTrendMeta.classes)}>
                    <div className="flex items-center gap-2">
                      <TrendIcon className="size-4" weight="duotone" />
                      <p className="text-sm font-medium">{revenueTrendMeta.title}</p>
                    </div>
                    <p className="mt-2 text-base font-semibold">{revenueTrendMeta.description}</p>
                  </div>
                  <div className="rounded-lg border border-primary/15 bg-primary/6 p-4">
                    <div className="flex items-center gap-2 text-primary">
                      <CalendarBlank className="size-4" weight="duotone" />
                      <p className="text-sm font-medium">Tháng hiện tại</p>
                    </div>
                    <p className="mt-2 text-base font-semibold">
                      {CURRENCY_FORMATTER.format(Number(revenueTrend.current_month_amount || 0))}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      So với {revenueTrend.previous_month_label || "tháng trước"}:{" "}
                      {CURRENCY_FORMATTER.format(Number(revenueTrend.previous_month_amount || 0))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Phân tích đặt phòng</CardTitle>
                <CardDescription>
                  Theo dõi xu hướng đặt phòng và loại phòng được chọn nhiều nhất.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <CalendarBlank className="size-3.5" weight="duotone" />
                {chartBookingData.length} tháng
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Đặt phòng theo tháng</h3>
                  <p className="text-xs text-muted-foreground">Nhu cầu đặt phòng trong 6 tháng gần nhất.</p>
                </div>
                {chartBookingData.length > 0 ? (
                  <div className="h-72 rounded-lg border bg-muted/10 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartBookingData}
                        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      >
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
                          width={48}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
                                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                  {Number(payload[0]?.value || 0)} lượt đặt
                                </p>
                              </div>
                            );
                          }}
                          cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
                        />
                        <Bar
                          dataKey="booking_count"
                          radius={[6, 6, 0, 0]}
                          fill="var(--color-chart-3)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Chưa có dữ liệu đặt phòng theo tháng.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Đặt phòng theo loại phòng</h3>
                  <p className="text-xs text-muted-foreground">Cho biết loại phòng nào đang được chọn nhiều nhất.</p>
                </div>
                {chartRoomTypeBookingData.length > 0 ? (
                  <div className="h-72 rounded-lg border bg-muted/10 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartRoomTypeBookingData}
                        layout="vertical"
                        margin={{ top: 12, right: 12, left: 20, bottom: 0 }}
                      >
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
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={110}
                          stroke="var(--color-muted-foreground)"
                          fontSize={12}
                          tickFormatter={(value) => value.length > 16 ? `${value.slice(0, 16)}...` : value}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
                                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">
                                  {Number(payload[0]?.value || 0)} lượt đặt
                                </p>
                              </div>
                            );
                          }}
                          cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                        />
                        <Bar dataKey="booking_count" radius={[0, 6, 6, 0]}>
                          {chartRoomTypeBookingData.map((entry, index) => (
                            <Cell
                              key={entry.room_type_id || entry.name}
                              fill={index === 0 ? "var(--color-primary)" : "var(--color-chart-2)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Chưa có dữ liệu đặt phòng theo loại phòng.
                  </div>
                )}
              </div>
            </div>

            {(chartBookingData.length > 0 || chartRoomTypeBookingData.length > 0) && (
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div className={cn("rounded-lg border p-4", bookingTrendMeta.classes)}>
                  <div className="flex items-center gap-2">
                    <BookingTrendIcon className="size-4" weight="duotone" />
                    <p className="text-sm font-medium">{bookingTrendMeta.title}</p>
                  </div>
                  <p className="mt-2 text-base font-semibold">{bookingTrendMeta.description}</p>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/6 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarBlank className="size-4" weight="duotone" />
                    <p className="text-sm font-medium">Loại đặt nhiều nhất</p>
                  </div>
                  <p className="mt-2 text-base font-semibold">
                    {topBookedRoomType?.name || "Chưa có dữ liệu"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topBookedRoomType ? `${topBookedRoomType.booking_count} lượt đặt` : "Không có dữ liệu đặt phòng để thống kê."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
