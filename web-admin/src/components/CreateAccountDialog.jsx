import { useState, useEffect } from "react";
import {
  Plus, CircleNotch, CheckCircle, Check, Copy,
} from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiJson } from "@/lib/apiClient";

function fullName(p) {
  if (!p) return "";
  return `${p.first_name} ${p.last_name}`.trim();
}

export default function CreateAccountDialog({ open, onOpenChange, onSaved, forceRole }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const defaultRole = forceRole || "BUILDING_MANAGER";

  useEffect(() => {
    if (open && !result) {
      const saved = localStorage.getItem("account_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setForm(p => ({ role: defaultRole, ...p, ...parsed }));
        } catch {
          setForm(p => ({ ...p, role: defaultRole }));
        }
      } else {
        setForm(p => ({ ...p, role: defaultRole }));
      }
    }
    // Reset when closing after success
    if (!open && result) {
      setResult(null);
      setErrors({});
      setForm({ role: defaultRole });
    }
  }, [open, result, defaultRole]);

  useEffect(() => {
    if (!result && Object.keys(form).length > 0 && !forceRole) {
      localStorage.setItem("account_draft", JSON.stringify(form));
    }
  }, [form, result, forceRole]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name?.trim()) e.first_name = "Vui lòng nhập họ";
    if (!form.last_name?.trim()) e.last_name = "Vui lòng nhập tên";
    if (!form.email?.trim()) {
      e.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Email không đúng định dạng";
    }
    if (!form.phone?.trim()) {
      e.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{8,15}$/.test(form.phone.trim())) {
      e.phone = "Số điện thoại phải gồm 8–15 chữ số";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await apiJson("/api/users", {
        method: "POST",
        body: {
          first_name: form.first_name.trim(),
          last_name: form.last_name?.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone?.trim() || undefined,
          role: form.role,
        },
      });
      const data = res.data ?? res;
      setResult(data);
      if (!forceRole) localStorage.removeItem("account_draft");
    } catch (err) {
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        const backendErrors = { submit: err.data.message };
        err.data.errors.forEach((e) => {
          if (e.path) backendErrors[e.path] = e.msg;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ submit: err.message || "Đã xảy ra lỗi" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.generated_password || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (result) onSaved(result);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-sm text-center font-sans">
          <DialogHeader className="sr-only">
            <DialogTitle>Tạo tài khoản thành công</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="size-7 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Tạo tài khoản thành công</p>
              <p className="text-sm text-muted-foreground mt-1">
                {fullName(result)} - {result.email}
              </p>
            </div>
            <div className="w-full rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs text-muted-foreground text-center">Mật khẩu được tạo tự động:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono font-semibold tracking-wider text-center select-all">
                  {result.generated_password}
                </code>
                <Button size="icon" variant="outline" className="shrink-0 size-9" onClick={handleCopy}>
                  {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleClose}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo tài khoản mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Họ *</Label>
              <Input
                value={form.first_name || ""}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="VD: Nguyễn"
                className={errors.first_name ? "border-destructive ring-destructive/20 focus-visible:ring-destructive/20" : ""}
              />
              {errors.first_name && <p className="text-xs text-destructive mt-1.5 font-medium">{errors.first_name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tên *</Label>
              <Input
                value={form.last_name || ""}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="VD: Văn A"
                className={errors.last_name ? "border-destructive ring-destructive/20 focus-visible:ring-destructive/20" : ""}
              />
              {errors.last_name && <p className="text-xs text-destructive mt-1.5 font-medium">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
                className={errors.email ? "border-destructive ring-destructive/20 focus-visible:ring-destructive/20" : ""}
              />
              {errors.email && <p className="text-xs text-destructive mt-1.5 font-medium">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại *</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="09xx xxx xxx"
                className={errors.phone ? "border-destructive ring-destructive/20 focus-visible:ring-destructive/20" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1.5 font-medium">{errors.phone}</p>}
            </div>
          </div>

          {!forceRole && (
            <div className="space-y-1.5">
              <Label>Vai trò *</Label>
              <Select value={form.role || "BUILDING_MANAGER"} onValueChange={(v) => set("role", v)}>
                <SelectTrigger className={errors.role ? "border-destructive ring-destructive/20" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUILDING_MANAGER">Quản lý tòa nhà</SelectItem>
                  <SelectItem value="STAFF">Nhân viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">* Mật khẩu sẽ được hệ thống tự động tạo.</p>

          {errors.submit && (
            <p className="text-xs text-destructive bg-destructive/5 p-2.5 rounded-lg border border-destructive/10 font-medium">
              {errors.submit}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <CircleNotch className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
