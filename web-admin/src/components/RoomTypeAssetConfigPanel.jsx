import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleNotch, FloppyDisk, Package, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_ASSET_TYPES = 20;

function normalizeItems(items = []) {
  return items
    .filter((item) => item.asset_type_id)
    .map((item) => ({
      asset_type_id: item.asset_type_id,
      quantity: Number(item.quantity) || 1,
    }))
    .sort((a, b) => a.asset_type_id.localeCompare(b.asset_type_id));
}

export default function RoomTypeAssetConfigPanel({
  roomTypeId,
  roomTypeName,
  mode = "page",
  onRegisterSubmit,
  onDirtyChange,
  onSavingChange,
  onUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [initialItems, setInitialItems] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [error, setError] = useState(null);
  const isDialog = mode === "dialog";

  const normalizedItems = useMemo(() => normalizeItems(items), [items]);
  const isDirty = JSON.stringify(normalizedItems) !== JSON.stringify(initialItems);

  const fetchAssets = useCallback(async () => {
    if (!roomTypeId) return;
    setLoading(true);
    setError(null);
    try {
      const [typesRes, assignedRes] = await Promise.all([
        api.get("/api/asset-types?limit=500"),
        api.get(`/api/room-types/${roomTypeId}/assets`),
      ]);

      setAssetTypes(typesRes.data || []);

      const currentItems = (assignedRes.data || []).map((item) => ({
        asset_type_id: item.asset_type?.id || item.asset_type_id || "",
        quantity: item.quantity || 1,
      }));

      setItems(currentItems);
      setInitialItems(normalizeItems(currentItems));
    } catch {
      setError("Không thể tải cấu hình loại tài sản.");
    } finally {
      setLoading(false);
    }
  }, [roomTypeId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  const validateBeforeSave = useCallback(() => {
    if (items.length > MAX_ASSET_TYPES) {
      return "Tối đa chỉ được gán 20 loại tài sản cho một loại phòng.";
    }

    const seen = new Set();
    for (const item of items) {
      if (!item.asset_type_id) {
        return "Vui lòng chọn đầy đủ loại tài sản.";
      }
      if (seen.has(item.asset_type_id)) {
        return "Mỗi loại tài sản chỉ nên xuất hiện một lần.";
      }
      seen.add(item.asset_type_id);
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        return "Số lượng phải là số nguyên lớn hơn hoặc bằng 1.";
      }
    }

    return null;
  }, [items]);

  const handleSave = useCallback(async () => {
    const validationMessage = validateBeforeSave();
    if (validationMessage) {
      setError(validationMessage);
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/room-types/${roomTypeId}/assets`, normalizedItems);
      setInitialItems(normalizedItems);
      toast.success("Đã cập nhật cấu hình loại tài sản");
      onUpdated?.();
      return true;
    } catch (err) {
      setError(err.data?.message || err.message || "Đã xảy ra lỗi.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [normalizedItems, onUpdated, roomTypeId, validateBeforeSave]);

  useEffect(() => {
    onRegisterSubmit?.(handleSave);
    return () => onRegisterSubmit?.(null);
  }, [handleSave, onRegisterSubmit]);

  const addItem = () => {
    if (items.length >= MAX_ASSET_TYPES) return;
    setItems((prev) => [...prev, { asset_type_id: "", quantity: 1 }]);
    setError(null);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setError(null);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
    setError(null);
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        isDialog && "flex max-h-[75vh] min-h-0 flex-col p-4"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Cấu hình loại tài sản
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thiết lập định mức loại tài sản mặc định cho{mode === "dialog" ? "" : " loại phòng"}{" "}
            <span className="font-medium text-foreground">{roomTypeName || "này"}</span>.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          {items.length}/{MAX_ASSET_TYPES}
        </span>
      </div>

      <div className={cn("mt-5 space-y-4", isDialog && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        {loading ? (
          <div className="flex justify-center py-10">
            <CircleNotch className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package className="size-5" />
                </div>
                <p className="mt-3 text-sm font-medium">Chưa có loại tài sản nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const selectedIds = items
                    .map((currentItem, currentIndex) =>
                      currentIndex === index ? null : currentItem.asset_type_id
                    )
                    .filter(Boolean);

                  return (
                    <div
                      key={`${item.asset_type_id || "new"}-${index}`}
                      className={cn(
                        "rounded-xl border border-border bg-muted/20 p-4",
                        isDialog
                          ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_112px_44px] md:items-end"
                          : "grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_40px] md:items-end"
                      )}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <Label>Loại tài sản</Label>
                        <Select
                          value={item.asset_type_id}
                          onValueChange={(value) => updateItem(index, "asset_type_id", value)}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue placeholder="Chọn loại tài sản" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-60">
                            {assetTypes.map((assetType) => (
                              <SelectItem
                                key={assetType.id}
                                value={assetType.id}
                                disabled={selectedIds.includes(assetType.id)}
                              >
                                {assetType.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="min-w-0 space-y-1.5">
                        <Label>Số lượng</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          className="w-full"
                          onChange={(event) =>
                            updateItem(index, "quantity", Number.parseInt(event.target.value, 10) || 1)
                          }
                        />
                      </div>

                      <div className={cn("flex items-end", isDialog && "md:justify-center")}>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {items.length < MAX_ASSET_TYPES && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={addItem}
              >
                <Plus className="size-4" />
                Thêm loại tài sản
              </Button>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {mode === "dialog" && (
          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="button"
              disabled={loading || saving}
              onClick={handleSave}
              className={cn(!isDirty && "opacity-80")}
            >
              {saving ? <CircleNotch className="mr-1.5 size-4 animate-spin" /> : <FloppyDisk className="mr-1.5 size-4" />}
              Lưu định mức
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
