import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft, FloppyDisk, CircleNotch, Eye, Code, FileText,
    BracketsCurly as Variable, Star, Plus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";

/* ── Predefined Variables ──────────────────── */

const VARIABLES = [
    { key: "customer_name", label: "Tên khách thuê" },
    { key: "customer_phone", label: "SĐT khách thuê" },
    { key: "customer_email", label: "Email khách thuê" },
    { key: "customer_date_of_birth", label: "Ngày sinh" },
    { key: "customer_gender", label: "Giới tính" },
    { key: "customer_permanent_address", label: "Địa chỉ thường trú" },
    { key: "customer_emergency_contact_name", label: "Tên liên hệ khẩn cấp" },
    { key: "customer_emergency_contact_phone", label: "SĐT liên hệ khẩn cấp" },
    { key: "manager_name", label: "Tên quản lý" },
    { key: "building_name", label: "Tên tòa nhà" },
    { key: "building_address", label: "Địa chỉ tòa nhà" },
    { key: "room_number", label: "Số phòng" },
    { key: "room_type", label: "Loại phòng" },
    { key: "base_rent", label: "Giá thuê" },
    { key: "deposit_amount", label: "Tiền cọc" },
    { key: "billing_cycle", label: "Chu kỳ thanh toán (MONTHLY / SEMI_ANNUALLY)" },
    { key: "term_type", label: "Loại hợp đồng (FIXED_TERM / INDEFINITE)" },
    { key: "start_date", label: "Ngày bắt đầu" },
    { key: "end_date", label: "Ngày kết thúc (chỉ FIXED_TERM)" },
    { key: "contract_number", label: "Số hợp đồng" },
    { key: "customer_signature", label: "Chữ ký khách thuê (ảnh)" },
    { key: "manager_signature", label: "Chữ ký quản lý (ảnh)" },
];

/* ── Main Page ─────────────────────────────── */

export default function ContractTemplateEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const textareaRef = useRef(null);
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState("code"); // "code" | "preview"
    const [msgDialog, setMsgDialog] = useState(null);

    const [form, setForm] = useState({
        name: "",
        version: "1.0",
        content: DEFAULT_HTML,
        is_active: true,
        is_default: false,
    });
    const [errors, setErrors] = useState({});

    /* fetch existing if editing */
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/api/contract-templates/${id}`).then((res) => {
            const t = res.data;
            setForm({
                name: t.name || "",
                version: t.version || "1.0",
                content: t.content || "",
                is_active: t.is_active ?? true,
                is_default: t.is_default ?? false,
            });
        }).catch((err) => {
            setMsgDialog({ title: "Lỗi", message: err.message || "Không tìm thấy mẫu." });
        }).finally(() => setLoading(false));
    }, [id]);

    /* extract variables from content */
    const usedVars = useCallback(() => {
        const matches = form.content.match(/\{\{(\w+)\}\}/g) || [];
        return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
    }, [form.content]);

    const handleChange = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const insertVariable = (key) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const tag = `{{${key}}}`;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = form.content.slice(0, start);
        const after = form.content.slice(end);
        const newContent = before + tag + after;
        handleChange("content", newContent);
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = ta.selectionEnd = start + tag.length;
        }, 0);
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Tên mẫu là bắt buộc";
        if (!form.version.trim()) e.version = "Phiên bản là bắt buộc";
        if (!form.content.trim()) e.content = "Nội dung HTML là bắt buộc";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                version: form.version.trim(),
                content: form.content,
                variables: usedVars(),
                is_active: form.is_active,
                is_default: form.is_default,
            };
            if (isEdit) {
                await api.put(`/api/contract-templates/${id}`, payload);
            } else {
                await api.post("/api/contract-templates", payload);
            }
            setMsgDialog({
                title: "Thành công",
                message: isEdit ? "Đã cập nhật mẫu hợp đồng." : "Đã tạo mẫu hợp đồng mới.",
                onClose: () => navigate("/contracts/templates"),
            });
        } catch (err) {
            setMsgDialog({ title: "Lỗi", message: err.message || "Đã xảy ra lỗi." });
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <CircleNotch className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate("/contracts/templates")}
                        className="rounded-full shadow-sm hover:translate-x-[-2px] transition-transform">
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isEdit ? "Chỉnh sửa mẫu" : "Tạo mẫu hợp đồng mới"}
                        </h1>
                        <p className="text-sm text-muted-foreground">Soạn nội dung HTML với các biến mẫu</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2 px-5 shadow-md shadow-primary/20">
                    {saving ? <CircleNotch className="size-4 animate-spin" /> : isEdit ? <FloppyDisk className="size-4" /> : <Plus className="size-4" />}
                    {isEdit ? "Lưu thay đổi" : "Tạo mẫu"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                {/* Left: form + editor */}
                <div className="space-y-5">
                    {/* Meta fields */}
                    <Card className="shadow-sm border-border/60">
                        <CardContent className="pt-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Tên mẫu *</Label>
                                    <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                                        placeholder="VD: Hợp đồng thuê phòng KTX"
                                        className={errors.name ? "border-destructive" : ""} />
                                    {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Phiên bản *</Label>
                                    <Input value={form.version} onChange={(e) => handleChange("version", e.target.value)}
                                        placeholder="VD: 1.0"
                                        className={errors.version ? "border-destructive" : ""} />
                                    {errors.version && <p className="text-[11px] text-destructive">{errors.version}</p>}
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)}
                                        className="size-4 rounded accent-primary" />
                                    Hoạt động
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={form.is_default} onChange={(e) => handleChange("is_default", e.target.checked)}
                                        className="size-4 rounded accent-primary" />
                                    Mặc định
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* HTML Editor */}
                    <Card className="shadow-sm border-border/60">
                        <CardHeader className="pb-0 pt-3 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="size-4 text-primary" /> Nội dung HTML
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Button size="sm" variant={tab === "code" ? "default" : "outline"} className="gap-1.5 h-7 text-xs"
                                        onClick={() => setTab("code")}>
                                        <Code className="size-3" /> Mã nguồn
                                    </Button>
                                    <Button size="sm" variant={tab === "preview" ? "default" : "outline"} className="gap-1.5 h-7 text-xs"
                                        onClick={() => setTab("preview")}>
                                        <Eye className="size-3" /> Xem trước
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-3 pb-4 px-4">
                            {tab === "code" ? (
                                <textarea
                                    ref={textareaRef}
                                    value={form.content}
                                    onChange={(e) => handleChange("content", e.target.value)}
                                    className={`w-full min-h-[450px] font-mono text-[13px] leading-relaxed p-4 rounded-lg border bg-muted/30 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.content ? "border-destructive" : "border-border/60"}`}
                                    spellCheck={false}
                                    placeholder="<h1>HỢP ĐỒNG THUÊ PHÒNG</h1>&#10;&#10;<p>Bên A: {{manager_name}}</p>&#10;<p>Bên B: {{tenant_name}}</p>..."
                                />
                            ) : (
                                <div className="w-full min-h-[450px] rounded-lg border border-border/60 bg-white p-6 overflow-y-auto">
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: form.content }} />
                                </div>
                            )}
                            {errors.content && <p className="text-[11px] text-destructive mt-1">{errors.content}</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: variables panel */}
                <div className="space-y-5">
                    <Card className="shadow-sm border-border/60 sticky top-4">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Variable className="size-4 text-primary" /> Biến mẫu
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">Nhấn để chèn vào vị trí con trỏ</p>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1 max-h-[60vh] overflow-y-auto">
                            {VARIABLES.map((v) => {
                                const isUsed = form.content.includes(`{{${v.key}}}`);
                                return (
                                    <button
                                        key={v.key}
                                        type="button"
                                        onClick={() => insertVariable(v.key)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-primary/5 flex items-center justify-between gap-1.5 overflow-hidden ${isUsed ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:border-border/50"}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span className="font-mono text-[11px] text-primary break-all leading-tight">{`{{${v.key}}}`}</span>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.label}</p>
                                        </div>
                                        {isUsed && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Message dialog */}
            <Dialog open={!!msgDialog} onOpenChange={(v) => { if (!v) { msgDialog?.onClose?.(); setMsgDialog(null); } }}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader><DialogTitle>{msgDialog?.title || "Thông báo"}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">{msgDialog?.message}</p>
                    <DialogFooter className="justify-center">
                        <Button onClick={() => { msgDialog?.onClose?.(); setMsgDialog(null); }}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ── Default HTML template ─────────────────── */

const DEFAULT_HTML = `<div style="font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px;">
  <h1 style="text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 5px;">
    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  </h1>
  <p style="text-align: center; font-size: 14px; margin-bottom: 30px;">
    Độc lập - Tự do - Hạnh phúc
  </p>

  <h2 style="text-align: center; font-size: 18px; margin-bottom: 30px;">
    HỢP ĐỒNG THUÊ PHÒNG<br/>
    Số: {{contract_number}}
  </h2>

  <p>Hôm nay, ngày {{start_date}}, tại {{building_address}}, chúng tôi gồm:</p>

  <h3 style="margin-top: 20px;">BÊN A (Bên cho thuê):</h3>
  <p>Họ và tên: <strong>{{manager_name}}</strong></p>
  <p>Đại diện tòa nhà: <strong>{{building_name}}</strong></p>

  <h3 style="margin-top: 20px;">BÊN B (Bên thuê):</h3>
  <p>Họ và tên: <strong>{{customer_name}}</strong></p>
  <p>Ngày sinh: {{customer_date_of_birth}}</p>
  <p>Giới tính: {{customer_gender}}</p>
  <p>Số điện thoại: {{customer_phone}}</p>
  <p>Email: {{customer_email}}</p>
  <p>Địa chỉ thường trú: {{customer_permanent_address}}</p>
  <p>Liên hệ khẩn cấp: {{customer_emergency_contact_name}} - {{customer_emergency_contact_phone}}</p>

  <h3 style="margin-top: 20px;">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h3>
  <p>Bên A đồng ý cho Bên B thuê phòng <strong>{{room_number}}</strong> (loại: {{room_type}}) tại tòa nhà {{building_name}}.</p>

  <h3>ĐIỀU 2: LOẠI HỢP ĐỒNG VÀ THỜI HẠN</h3>
  <p>Loại hợp đồng: <strong>{{term_type}}</strong></p>
  <p>Từ ngày <strong>{{start_date}}</strong> đến ngày <strong>{{end_date}}</strong>.</p>

  <h3>ĐIỀU 3: GIÁ THUÊ VÀ THANH TOÁN</h3>
  <p>Giá thuê hàng tháng: <strong>{{base_rent}}</strong> VNĐ/tháng.</p>
  <p>Tiền đặt cọc: <strong>{{deposit_amount}}</strong> VNĐ.</p>

  <div style="display: flex; justify-content: space-between; margin-top: 60px;">
    <div style="text-align: center;">
      <p><strong>BÊN A</strong></p>
      <p style="margin-top: 60px;">{{manager_signature}}</p>
      <p>{{manager_name}}</p>
    </div>
    <div style="text-align: center;">
      <p><strong>BÊN B</strong></p>
      <p style="margin-top: 60px;">{{customer_signature}}</p>
      <p>{{customer_name}}</p>
    </div>
  </div>
</div>`;
