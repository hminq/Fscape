import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, CircleNotch, ArrowCounterClockwise, Warning } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";
import fscapeLogoFull from "@/assets/fscape-logo-full.svg";
import { cleanContractHtml } from "@/lib/utils";

const STATUS_LABELS = CONTRACT_STATUS_LABELS;

const CANVAS_SCALE = 2;
const CANVAS_LINE_WIDTH = 2;
const INK_COLOR = "#000000";

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

function ContractSigningPage() {
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get("contract_id")
    || searchParams.get("contractId")
    || searchParams.get("contract");
  const { token } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [justSigned, setJustSigned] = useState(false);

  const isViewOnly = signed && !justSigned;

  const canvasRef = useRef(null);
  const contractRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnTo=${returnTo}`;
    }
  }, [token]);

  // Fetch contract
  useEffect(() => {
    if (!contractId || !token) {
      if (!contractId) setError("Link ký hợp đồng không hợp lệ.");
      setLoading(false);
      return;
    }

    let mounted = true;
    async function fetchContract() {
      try {
        const res = await api.get(`/api/contracts/${contractId}`);
        if (!mounted) return;

        const c = res.data;
        if (c.status !== "PENDING_CUSTOMER_SIGNATURE") {
          setSigned(true);
        }

        setContract(c);
      } catch (err) {
        if (mounted) setError(err.message || "Không thể tải hợp đồng.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchContract();
    return () => { mounted = false; };
  }, [contractId, token]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      const clientX = touch ? touch.clientX : e.clientX;
      const clientY = touch ? touch.clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
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
  }, [contract, signed]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || !contractId) return;

    setSigning(true);
    setError("");
    try {
      // 1. Convert canvas to PNG blob and upload
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const formData = new FormData();
      formData.append("file", blob, "signature.png");

      const uploadRes = await api.upload("/api/upload?type=signature", formData);
      const signatureUrl = uploadRes.urls[0];

      // 2. Sign contract
      const res = await api.patch(`/api/contracts/${contractId}/sign`, {
        signature_url: signatureUrl,
      });

      setContract(res.data);
      setSigned(true);
      setJustSigned(true);

      // Scroll to contract so user sees their signature in the document
      setTimeout(() => {
        contractRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(err.message || "Ký hợp đồng thất bại.");
    } finally {
      setSigning(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <CircleNotch className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Error state (no contract at all)
  if (error && !contract) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <Warning className="h-12 w-12 text-red-500" />
        <p className="text-lg font-semibold text-primary">{error}</p>
        <p className="text-sm text-secondary">
          Vui lòng kiểm tra lại link trong email hoặc liên hệ quản lý tòa nhà.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{CONTRACT_STYLES}</style>
      {/* Header */}
      <header className="bg-primary">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-3">
          <Link to="/" className="transition-opacity hover:opacity-70">
            <img
              src={fscapeLogoFull}
              alt="FScape"
              className="h-10"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link
          to="/my-contracts"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Link>
        {/* Contract info bar */}
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs text-secondary">Mã hợp đồng</p>
            <p className="font-semibold text-primary">{contract.contract_number}</p>
          </div>
          <div>
            <p className="text-xs text-secondary">Phòng</p>
            <p className="font-semibold text-primary">
              {contract.room?.room_number} — {contract.room?.building?.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary">Trạng thái</p>
            <p className={`font-semibold ${
              contract.status === "PENDING_CUSTOMER_SIGNATURE" ? "text-amber-600"
                : contract.status === "ACTIVE" || contract.status === "EXPIRING_SOON" ? "text-green-600"
                : contract.status === "TERMINATED" ? "text-red-600"
                : "text-primary"
            }`}>
              {STATUS_LABELS[contract.status] || contract.status}
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Contract content */}
        <div ref={contractRef} className="rounded-xl bg-white p-6 shadow-sm md:p-10">
          <div
            className="contract-render prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: cleanContractHtml(contract.rendered_content) }}
          />
        </div>

        {/* Signing section */}
        {signed && !isViewOnly ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl bg-green-50 p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="text-lg font-semibold text-green-800">
              Hợp đồng đã được ký thành công!
            </p>
            <p className="text-sm text-green-700">
              Quản lý tòa nhà sẽ xác nhận và ký hợp đồng. Bạn sẽ nhận email thông báo khi hợp đồng được kích hoạt.
            </p>
          </div>
        ) : !signed ? (
          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary">Ký tên của bạn</h2>
            <p className="mt-1 text-sm text-secondary">
              Vui lòng ký xác nhận trong ô bên dưới để tiếp tục.
            </p>

            <div className="relative mt-4">
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

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={clearCanvas}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-100"
              >
                <ArrowCounterClockwise className="h-4 w-4" />
                Xóa & ký lại
              </button>
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
      </main>
    </div>
  );
}

export default ContractSigningPage;
