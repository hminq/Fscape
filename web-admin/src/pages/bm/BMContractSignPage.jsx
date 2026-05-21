import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  ArrowCounterClockwise,
  Warning,
  PencilLine as PenLine,
  DownloadSimple,
} from "@phosphor-icons/react";
import { api, apiRequest } from "@/lib/apiClient";
import { formatDate, cdnUrl, cleanContractHtml } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ── constants ──────────────────────────────────────────── */

const CANVAS_SCALE = 2;
const CANVAS_LINE_WIDTH = 2;
const INK_COLOR = "#000000";

/* ── styles applied to rendered contract HTML ───────────── */

const CONTRACT_STYLES = `
  .contract-render img[src*="cloudinary"] {
    transform: scale(3);
    transform-origin: left top;
    margin-bottom: 80px;
  }
  .contract-render img[alt*="Signature"],
  .contract-render img[alt*="signature"] {
    transform: none !important;
    margin-bottom: 0 !important;
  }
`;



/* ── page ───────────────────────────────────────────────── */

export default function BMContractSignPage() {
  const { id: contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  const contractRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  /* ── fetch contract ─────────────────────────────────── */

  useEffect(() => {
    if (!contractId) {
      setError("Thiếu mã hợp đồng.");
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/api/contracts/${contractId}`);
        if (!mounted) return;
        const c = res.data;

        if (c.status === "ACTIVE") {
          setSignSuccess(true);
        } else if (c.status !== "PENDING_MANAGER_SIGNATURE") {
          setError("Hợp đồng này không ở trạng thái chờ BM ký.");
        }

        setContract(c);
      } catch (err) {
        if (mounted) setError(err.message || "Không thể tải hợp đồng.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [contractId]);

  /* ── canvas setup ───────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contract || contract.status !== "PENDING_MANAGER_SIGNATURE" || signSuccess) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * CANVAS_SCALE;
    canvas.height = rect.height * CANVAS_SCALE;
    ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = CANVAS_LINE_WIDTH;
    ctx.strokeStyle = INK_COLOR;

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const touch = e.touches?.[0];
      return {
        x: (touch ? touch.clientX : e.clientX) - r.left,
        y: (touch ? touch.clientY : e.clientY) - r.top,
      };
    };

    const start = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const end = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        setHasSignature(true);
      }
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", end);
    };
  }, [contract, signSuccess]);

  /* ── clear canvas ───────────────────────────────────── */

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  /* ── handle sign ────────────────────────────────────── */

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || !contract || signing) return;

    setSigning(true);
    setError("");
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const fd = new FormData();
      fd.append("file", blob, "manager-signature.png");

      const uploadRes = await apiRequest("/api/upload?type=signature", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Upload chữ ký thất bại.");
      const uploadData = await uploadRes.json();
      const signatureUrl = uploadData.urls[0];

      const res = await api.patch(`/api/contracts/${contract.id}/manager-sign`, {
        signature_url: signatureUrl,
      });

      setContract(res.data);
      setSignSuccess(true);
      setSigning(false);

      setTimeout(() => {
        contractRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err.message || "Ký hợp đồng thất bại.");
      setSigning(false);
    }
  };

  /* ── helpers ────────────────────────────────────────── */


  /* ── loading state ──────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CircleNotch className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  /* ── error state (no contract) ──────────────────────── */

  if (error && !contract) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Warning className="size-12 text-red-500" />
        <p className="text-lg font-semibold">{error}</p>
        <Button variant="outline" onClick={() => navigate(`/building-manager/contracts/${contractId}`)}>
          <ArrowLeft className="mr-1.5 size-4" />
          Quay lại chi tiết
        </Button>
      </div>
    );
  }

  const periodLabel = contract.start_date && contract.end_date
    ? `${formatDate(contract.start_date)} → ${formatDate(contract.end_date)}`
    : contract.start_date
      ? `Từ ${formatDate(contract.start_date)} · Không thời hạn`
      : "—";

  /* ── main render ────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <style>{CONTRACT_STYLES}</style>

      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          onClick={() => navigate("/building-manager/contracts")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Ký hợp đồng</h1>
          <p className="text-sm text-muted-foreground">Xem xét và ký xác nhận hợp đồng</p>
        </div>
      </div>

      {/* Contract info bar - only contract number + period */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">Mã hợp đồng</p>
          <p className="font-semibold">{contract.contract_number}</p>
        </div>
        <div className="flex items-center gap-4">
          {contract.pdf_url && (
            <a
              href={cdnUrl(contract.pdf_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <DownloadSimple className="size-4" />
              Tải PDF
            </a>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Thời hạn</p>
            <p className="font-semibold">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Warning className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Contract HTML content */}
      <div ref={contractRef} className="rounded-xl border bg-white p-8 shadow-sm md:p-12">
        <div
          className="contract-render prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: cleanContractHtml(contract.rendered_content) }}
        />
      </div>

      {/* Signing section */}
      {signSuccess ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-10 text-center">
          <CheckCircle className="size-12 text-green-600" />
          <p className="text-lg font-semibold text-green-800">
            Hợp đồng đã được ký và kích hoạt thành công!
          </p>
          <p className="text-sm text-green-700">
            Cư dân sẽ nhận email xác nhận hợp đồng được kích hoạt.
          </p>
        </div>
      ) : contract.status === "PENDING_MANAGER_SIGNATURE" ? (
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-2">
            <PenLine className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Ký xác nhận hợp đồng</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Vui lòng ký xác nhận trong ô bên dưới để tiếp tục.
          </p>

          {/* Canvas */}
          <div className="relative mt-5">
            <canvas
              ref={canvasRef}
              className="h-48 w-full cursor-crosshair rounded-lg border-2 border-dashed border-gray-300 bg-white touch-none"
            />
            {!hasSignature && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Ký tên tại đây
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={clearCanvas}>
              <ArrowCounterClockwise className="mr-1.5 size-4" />
              Xóa & ký lại
            </Button>
            <button
              type="button"
              disabled={!hasSignature || signing}
              onClick={handleSign}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors ${
                hasSignature && !signing
                  ? "bg-primary hover:bg-primary/90"
                  : "cursor-not-allowed bg-gray-300"
              }`}
            >
              {signing && <CircleNotch className="h-4 w-4 animate-spin" />}
              {signing ? "Đang ký..." : "Xác nhận ký hợp đồng"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
