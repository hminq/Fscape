import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus, CircleNotch, Package, Buildings, Stack as Layers, Money as Banknote,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";

/* ── Main Page ─────────────────────────────── */

export default function CreateAssetPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [msgDialog, setMsgDialog] = useState(null);

    const [form, setForm] = useState({
        name: "",
        buildingId: "",
        assetTypeId: "",
        quantity: "1",
        price: "",
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [bRes, atRes] = await Promise.all([
                    api.get("/api/buildings?limit=100"),
                    api.get("/api/asset-types?limit=100&is_active=true"),
                ]);
                setBuildings(bRes.data || []);
                setAssetTypes(atRes.data || []);
            } catch (err) {
                console.error("Error fetching resources:", err);
            }
        };
        fetchResources();
    }, []);

    const handleChange = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Vui lòng nhập tên tài sản";
        if (!form.buildingId) e.buildingId = "Vui lòng chọn tòa nhà";
        const qty = Number(form.quantity);
        if (!qty || qty < 1 || qty > 100) e.quantity = "Số lượng phải từ 1 đến 100";
        if (form.price && Number(form.price) < 0) e.price = "Giá phải >= 0";
        return e;
    };

    const handleSave = async () => {
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                building_id: form.buildingId,
                asset_type_id: form.assetTypeId || undefined,
                quantity: Number(form.quantity),
                price: form.price ? Number(form.price) : undefined,
            };

            const res = await api.post("/api/assets/batch", payload);

            setMsgDialog({
                title: "Thành công",
                message: `Đã tạo ${res.count} tài sản thành công. Mỗi tài sản đã được gán mã QR riêng (FSCAPE-AST-...).`,
                onClose: () => navigate("/assets"),
            });
        } catch (err) {
            setMsgDialog({ title: "Lỗi", message: err.message || "Đã xảy ra lỗi khi tạo tài sản." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="mt-2">
                <h1 className="text-2xl font-bold tracking-tight">Thêm tài sản hàng loạt</h1>
                <p className="text-sm text-muted-foreground">Tạo nhiều tài sản cùng loại, hệ thống tự sinh mã QR</p>
            </div>

            {/* Form */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="bg-muted/30 pb-3 border-b border-border/40">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Package className="size-4 text-primary" /> Thông tin tài sản
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label>Tên tài sản *</Label>
                        <Input
                            placeholder="VD: Giường tầng, Điều hòa Panasonic..."
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                    </div>

                    {/* Building */}
                    <div className="space-y-1.5">
                        <Label>Tòa nhà *</Label>
                        <Select value={form.buildingId || undefined} onValueChange={(v) => handleChange("buildingId", v)}>
                            <SelectTrigger className={errors.buildingId ? "border-destructive" : ""}>
                                <div className="flex items-center gap-2">
                                    <Buildings className="size-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Chọn tòa nhà" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {errors.buildingId && <p className="text-[11px] text-destructive">{errors.buildingId}</p>}
                    </div>

                    {/* Asset Type */}
                    <div className="space-y-1.5">
                        <Label>Loại tài sản</Label>
                        <Select value={form.assetTypeId || undefined} onValueChange={(v) => handleChange("assetTypeId", v)}>
                            <SelectTrigger>
                                <div className="flex items-center gap-2">
                                    <Layers className="size-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Chọn loại tài sản (tùy chọn)" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {assetTypes.map(at => <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quantity + Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Số lượng *</Label>
                            <Input
                                type="number" min="1" max="100"
                                value={form.quantity}
                                onChange={(e) => handleChange("quantity", e.target.value)}
                                className={errors.quantity ? "border-destructive" : ""}
                            />
                            {errors.quantity && <p className="text-[11px] text-destructive">{errors.quantity}</p>}
                            <p className="text-[11px] text-muted-foreground">Tối đa 100 tài sản mỗi lần</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Giá mua (₫)</Label>
                            <div className="relative">
                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                    type="number" min="0" step="1000"
                                    placeholder="0"
                                    value={form.price}
                                    onChange={(e) => handleChange("price", e.target.value)}
                                    className={`pl-9 ${errors.price ? "border-destructive" : ""}`}
                                />
                            </div>
                            {errors.price && <p className="text-[11px] text-destructive">{errors.price}</p>}
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                        <p className="text-xs text-primary font-medium mb-1">Lưu ý</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Mỗi tài sản sẽ được gán một mã QR duy nhất (FSCAPE-AST-...)</li>
                            <li>• Trạng thái mặc định: <strong>AVAILABLE</strong></li>
                            <li>• Sau khi tạo, bạn có thể gán tài sản vào phòng cụ thể từ trang quản lý</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => navigate("/assets")} disabled={saving}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2 px-6 shadow-md shadow-primary/20">
                    {saving ? <CircleNotch className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Tạo {form.quantity > 1 ? `${form.quantity} tài sản` : "tài sản"}
                </Button>
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
