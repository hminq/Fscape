import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Envelope, Phone, ShieldCheck, Lock, CircleNotch, Plus, Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiJson } from "@/lib/apiClient";

function FormSection({ title, children }) {
    return (
        <Card className="shadow-sm overflow-hidden border-border/60">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/40">
                <CardTitle className="text-base font-bold">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {children}
            </CardContent>
        </Card>
    );
}

export default function CreateAccountPage() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "BUILDING_MANAGER",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (fieldErrors[k]) {
            setFieldErrors((prev) => {
                const updated = { ...prev };
                delete updated[k];
                return updated;
            });
        }
    };

    const handleSave = async () => {
        const errors = {};
        if (!form.first_name.trim()) errors.first_name = "Vui lòng nhập họ";
        if (!form.last_name.trim()) errors.last_name = "Vui lòng nhập tên";
        if (!form.email.trim()) {
            errors.email = "Vui lòng nhập email";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = "Email không đúng định dạng";
        }
        if (!form.phone.trim()) {
            errors.phone = "Vui lòng nhập số điện thoại";
        } else if (!/^[0-9]{8,15}$/.test(form.phone.trim())) {
            errors.phone = "Số điện thoại phải gồm 8–15 chữ số";
        }
        if (!form.password) errors.password = "Vui lòng nhập mật khẩu";
        if (form.password && form.password.length < 6) errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
        if (!form.confirmPassword) errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
        if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
            errors.confirmPassword = "Mật khẩu xác nhận không khớp";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors({ ...errors, main: "Vui lòng điền đầy đủ các thông tin bắt buộc." });
            return;
        }

        setSaving(true);
        try {
            await apiJson("/api/admin/users", {
                method: "POST",
                body: {
                    first_name: form.first_name.trim(),
                    last_name: form.last_name?.trim() || undefined,
                    email: form.email.trim(),
                    phone: form.phone?.trim() || undefined,
                    role: form.role,
                    password: form.password,
                },
            });
            navigate("/accounts");
        } catch (err) {
            setFieldErrors({ general: err.message || "Đã xảy ra lỗi khi tạo tài khoản." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-16">
            {/* Top Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản mới</h1>
                <p className="text-sm text-muted-foreground">Thêm thành viên quản trị mới cho hệ thống FScape.</p>
            </div>

            {fieldErrors.general && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-destructive text-white p-1 rounded-full">
                        <Plus className="size-3 rotate-45" />
                    </div>
                    <span className="font-semibold">{fieldErrors.general}</span>
                </div>
            )}

            <div className="space-y-6">
                <FormSection title="Thông tin cá nhân">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Họ *</Label>
                            <Input
                                placeholder="VD: Nguyễn"
                                value={form.first_name}
                                onChange={(e) => handleChange("first_name", e.target.value)}
                                className={fieldErrors.first_name ? "border-destructive animate-shake" : ""}
                            />
                            {fieldErrors.first_name && <p className="text-xs text-destructive font-medium">{fieldErrors.first_name}</p>}
                        </div>
                        <div className="space-y-1.5">
                             <Label>Tên *</Label>
                            <Input
                                placeholder="VD: Văn A"
                                value={form.last_name}
                                onChange={(e) => handleChange("last_name", e.target.value)}
                                className={fieldErrors.last_name ? "border-destructive animate-shake" : ""}
                            />
                            {fieldErrors.last_name && <p className="text-xs text-destructive font-medium">{fieldErrors.last_name}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                placeholder="email@example.com"
                                value={form.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                className={fieldErrors.email ? "border-destructive animate-shake" : ""}
                            />
                            {fieldErrors.email && <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>}
                        </div>
                         <div className="space-y-1.5">
                            <Label>Số điện thoại *</Label>
                            <Input
                                placeholder="09xx xxx xxx"
                                value={form.phone}
                                onChange={(e) => handleChange("phone", e.target.value)}
                                className={fieldErrors.phone ? "border-destructive animate-shake" : ""}
                            />
                            {fieldErrors.phone && <p className="text-xs text-destructive font-medium">{fieldErrors.phone}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Vai trò *</Label>
                            <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BUILDING_MANAGER">Quản lý tòa nhà</SelectItem>
                                    <SelectItem value="STAFF">Nhân viên</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Bảo mật">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Mật khẩu *</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => handleChange("password", e.target.value)}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                                </Button>
                            </div>
                            {fieldErrors.password && <p className="text-xs text-destructive font-medium">{fieldErrors.password}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Xác nhận mật khẩu *</Label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={form.confirmPassword}
                                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
                                </Button>
                            </div>
                            {fieldErrors.confirmPassword && <p className="text-xs text-destructive font-medium">{fieldErrors.confirmPassword}</p>}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 italic">
                        Lưu ý: Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ số và ký tự đặc biệt để đảm bảo tính an toàn.
                    </p>
                    {fieldErrors.general && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                             <CircleNotch className="size-4" />
                             {fieldErrors.general}
                        </div>
                    )}
                </FormSection>

                <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/accounts")}
                        disabled={saving}
                        className="text-muted-foreground font-medium"
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                    >
                        {saving ? <CircleNotch className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                        Xác nhận tạo tài khoản
                    </Button>
                </div>
            </div>
        </div>
    );
}
