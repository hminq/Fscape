import { useState, useEffect } from "react";
import { Lightning, Play, CircleNotch, CheckCircle, XCircle, Clock } from "@phosphor-icons/react";
import { LoadingState } from "@/components/StateDisplay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const JOB_DESCRIPTIONS = {
  bookingExpiry: {
    label: "Booking Expiry",
    desc: "Huy booking qua 1h chua thanh toan, mo khoa phong",
    schedule: "Moi 5 phut",
  },
  contractSignatureExpiry: {
    label: "Contract Signature Expiry",
    desc: "Cham dut hop dong qua 24h chua ky",
    schedule: "Moi 15 phut",
  },
  signingReminder: {
    label: "Signing Reminder",
    desc: "Gui email nhac ky hop dong (6h va 1h truoc deadline)",
    schedule: "Moi 15 phut",
  },
  firstRentExpiry: {
    label: "First Rent Expiry",
    desc: "Huy hop dong chua thanh toan tien thue dau tien",
    schedule: "Moi 15 phut",
  },
  firstRentReminder: {
    label: "First Rent Reminder",
    desc: "Nhac thanh toan tien thue dau tien (1 ngay + ngay den han)",
    schedule: "Hang ngay 8:00",
  },
  checkInExpiry: {
    label: "Check-in Expiry",
    desc: "Xu ly hop dong qua han check-in (3-10 ngay)",
    schedule: "Moi 15 phut",
  },
  contractExpiringSoon: {
    label: "Contract Expiring Soon",
    desc: "Chuyen trang thai ACTIVE -> EXPIRING_SOON -> FINISHED",
    schedule: "Hang ngay 3:00",
  },
  invoiceGeneration: {
    label: "Invoice Generation",
    desc: "Tao hoa don RENT va SERVICE tu dong",
    schedule: "Hang ngay 2:00",
  },
  invoiceOverdue: {
    label: "Invoice Overdue",
    desc: "Danh dau hoa don qua han, gui thong bao cho cu dan va quan ly",
    schedule: "Hang ngay 6:00",
  },
};

export default function TriggerJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [results, setResults] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/admin/jobs");
        setJobs(res.data || []);
      } catch {
        toast.error("Khong the tai danh sach job");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const triggerJob = async (jobName) => {
    setRunning((prev) => ({ ...prev, [jobName]: true }));
    setResults((prev) => ({ ...prev, [jobName]: null }));

    try {
      const res = await api.post(`/api/admin/jobs/${jobName}/trigger`);
      setResults((prev) => ({
        ...prev,
        [jobName]: {
          status: "SUCCESS",
          duration: res.data?.duration_ms,
          time: new Date().toLocaleTimeString("vi-VN"),
        },
      }));
      toast.success(`${jobName} - thanh cong (${res.data?.duration_ms}ms)`);
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [jobName]: {
          status: "FAILED",
          error: err.message,
          time: new Date().toLocaleTimeString("vi-VN"),
        },
      }));
      toast.error(`${jobName} - that bai: ${err.message}`);
    } finally {
      setRunning((prev) => ({ ...prev, [jobName]: false }));
    }
  };

  const triggerAll = async () => {
    for (const job of jobs) {
      await triggerJob(job.name);
    }
  };

  if (loading) return <LoadingState className="py-32" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trigger Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Chay thu cac cron job thu cong - chi danh cho dev/testing
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={triggerAll}
          disabled={Object.values(running).some(Boolean)}
        >
          <Lightning className="size-4" weight="fill" />
          Chay tat ca
        </Button>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => {
          const meta = JOB_DESCRIPTIONS[job.name] || {};
          const isRunning = running[job.name];
          const result = results[job.name];

          return (
            <Card key={job.name} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {meta.label || job.name}
                  </span>
                  {meta.schedule && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {meta.schedule}
                    </span>
                  )}
                </div>
                {meta.desc && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {meta.desc}
                  </p>
                )}
                {result && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    {result.status === "SUCCESS" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="size-3.5" weight="fill" />
                        Thanh cong ({result.duration}ms)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <XCircle className="size-3.5" weight="fill" />
                        That bai: {result.error}
                      </span>
                    )}
                    <span className="text-muted-foreground">{result.time}</span>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                disabled={isRunning}
                onClick={() => triggerJob(job.name)}
              >
                {isRunning ? (
                  <CircleNotch className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" weight="fill" />
                )}
                {isRunning ? "Dang chay..." : "Chay"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
