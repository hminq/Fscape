import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ArrowLeft, PencilSimple, Trash, MapPin, Stack as Layers, House,
    Envelope, Phone, CircleNotch, CurrencyDollar, Users, ArrowsOutSimple,
    FileText, CalendarDots, ClipboardText, User as UserIcon,
    Cube
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/apiClient";
import { formatDate as fmtDate, cdnUrl } from "@/lib/utils";
import { ROOM_STATUS_MAP, CONTRACT_STATUS_MAP, BOOKING_STATUS_MAP, REQUEST_STATUS_MAP } from "@/lib/constants";
import ModelViewer from "@/components/ModelViewer";
import defaultRoomImg from "@/assets/default_building_img.jpg";
import defaultUserImg from "@/assets/default_user_img.jpg";
import { is3DFile } from "@/lib/modelViewer";



const STATUS_CFG = Object.fromEntries(
  Object.entries(ROOM_STATUS_MAP).map(([k, v]) => [k, { label: v.label, bg: v.bg || v.dot, text: v.text }])
);

const CONTRACT_STATUS_LABEL = Object.fromEntries(
  Object.entries(CONTRACT_STATUS_MAP).map(([k, v]) => [k, v.label])
);
const BOOKING_STATUS_LABEL = Object.fromEntries(
  Object.entries(BOOKING_STATUS_MAP).map(([k, v]) => [k, v.label])
);
const REQUEST_STATUS_LABEL = Object.fromEntries(
  Object.entries(REQUEST_STATUS_MAP).map(([k, v]) => [k, v.label])
);

const fmtPrice = (p) => p ? parseFloat(p).toLocaleString("vi-VN") : "—";

export default function RoomDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmDel, setConfirmDel] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/rooms/${id}`);
                setRoom(res.data || res);
            } catch (err) {
                console.error(err);
                setError("Không thể tải thông tin phòng.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/api/rooms/${room.id}`);
            navigate("/rooms");
        } catch (err) {
            toast.error(err.message || "Xóa thất bại");
        } finally {
            setSaving(false);
            setConfirmDel(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <CircleNotch className="animate-spin text-muted-foreground size-8" />
        </div>
    );

    if (error || !room) return (
        <div className="text-center py-20 space-y-4">
            <p className="text-sm text-destructive">{error || "Không tìm thấy thông tin phòng."}</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/rooms")}>Quay lại</Button>
        </div>
    );

    const statusKey = room.status?.toUpperCase() || "AVAILABLE";
    const statusCfg = STATUS_CFG[statusKey] || STATUS_CFG.AVAILABLE;

    // API returns images as array of strings (image_url strings)
    const thumbnail = cdnUrl(room.thumbnail_url)
        || cdnUrl(Array.isArray(room.images) && typeof room.images[0] === 'string' ? room.images[0] : room.images?.[0]?.image_url)
        || defaultRoomImg;

    const gallery = Array.isArray(room.images) && room.images.length > 0
        ? room.images.map(img => cdnUrl(typeof img === 'string' ? img : img?.image_url))
        : [];

    const infoItems = [
        { label: "Tòa nhà", value: room.building?.name },
        { label: "Tầng", value: room.floor != null ? `Tầng ${room.floor}` : null },
        { label: "Loại phòng", value: room.room_type?.name },
        { label: "Giá thuê", value: room.room_type?.base_price != null ? `${fmtPrice(room.room_type.base_price)} đ/tháng` : null },
        { label: "Diện tích", value: room.room_type?.area_sqm != null ? `${room.room_type.area_sqm} m²` : null },
        { label: "Sức chứa", value: room.room_type?.capacity != null ? `${room.room_type.capacity} người` : null },
    ].filter(i => i.value != null);

    const hasActiveContract = (room.resident_contracts || []).some(c =>
        ['ACTIVE', 'EXPIRING_SOON', 'PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE'].includes(c.status)
    );
    const hasActiveBooking = (room.resident_bookings || []).some(b =>
        ['PENDING', 'DEPOSIT_PAID'].includes(b.status)
    );
    const isLocked = hasActiveContract || hasActiveBooking || room.status === 'OCCUPIED';

    return (
        <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header */}
            <div className="flex items-start gap-3">
                <button
                    onClick={() => navigate("/rooms")}
                    className="mt-0.5 size-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                >
                    <ArrowLeft className="size-4" />
                </button>
                <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                        <h1 className="text-lg font-bold">Phòng {room.room_number}</h1>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <span className={`size-2 rounded-full ${statusCfg.bg}`} />
                            <span className={statusCfg.text}>{statusCfg.label}</span>
                        </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {room.building?.name}
                        {room.floor != null && (
                            <><span className="text-muted-foreground/40 mx-0.5">·</span><Layers className="size-3.5" /> Tầng {room.floor}</>
                        )}
                    </p>
                </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => navigate(`/rooms/${id}/edit`)}
                        disabled={isLocked}>
                        <PencilSimple className="size-4" /> Chỉnh sửa
                    </Button>
                    {isLocked && (
                        <span className="text-xs text-amber-600 font-medium">
                            Phòng đang được sử dụng - không thể chỉnh sửa
                        </span>
                    )}
                </div>
                <Button variant="destructive" className="gap-2" onClick={() => setConfirmDel(true)} disabled={isLocked}>
                    <Trash className="size-4" /> Xóa phòng
                </Button>
            </div>

            {/* General Info Card */}
            <Card className="overflow-hidden border-border shadow-sm py-0 gap-0">
                <div className="flex flex-col md:flex-row">
                    <div className="md:w-64 shrink-0 bg-muted h-48 md:h-auto overflow-hidden">
                        <img
                            src={thumbnail}
                            alt={`Phòng ${room.room_number}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = defaultRoomImg; }}
                        />
                    </div>
                    <div className="flex-1 p-5">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {infoItems.map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                                    <p className="text-sm font-medium mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>
                        {room.room_type?.description && (
                            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border leading-relaxed">
                                {room.room_type.description}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Gallery - right after the main info card */}
            {gallery.length > 0 && (
                <section>
                    <h2 className="text-base font-bold mb-3">Hình ảnh ({gallery.length})</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {gallery.map((src, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                                <img
                                    src={src}
                                    alt=""
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                    onError={(e) => { e.target.src = defaultRoomImg; }}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 3D Model Viewer */}
            {room.image_3d_url && (
                <section>
                    <h2 className="text-base font-bold mb-3">Mô hình 3D</h2>
                    {is3DFile(room.image_3d_url) ? (
                        <ModelViewer url={cdnUrl(room.image_3d_url)} />
                    ) : (
                        <div className="rounded-xl border border-border bg-muted p-4 flex items-center gap-3">
                            <Cube className="size-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">File 3D</p>
                                <a href={cdnUrl(room.image_3d_url)} target="_blank" rel="noreferrer"
                                    className="text-xs text-primary underline">
                                    {room.image_3d_url.split('/').pop()}
                                </a>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Blueprint */}
            {room.blueprint_url && (
                <section>
                    <h2 className="text-base font-bold mb-3">Bản vẽ</h2>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <img src={cdnUrl(room.blueprint_url)} alt="Blueprint"
                            className="w-full h-48 object-cover"
                            onError={e => e.target.src = defaultRoomImg} />
                    </div>
                </section>
            )}

            {/* Current Resident */}
            <section>
                <h2 className="text-base font-bold mb-3">Người thuê hiện tại</h2>
                {room.current_resident ? (
                    <div className="flex items-center rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-3">
                            <img
                                src={cdnUrl(room.current_resident.avatar_url) || defaultUserImg}
                                alt=""
                                className="size-10 rounded-lg object-cover ring-1 ring-border"
                                onError={e => { e.target.src = defaultUserImg; }}
                            />
                            <div>
                                <span className="font-semibold text-sm">
                                    {room.current_resident.first_name} {room.current_resident.last_name}
                                </span>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1"><Envelope className="size-3" />{room.current_resident.email}</span>
                                    {room.current_resident.phone && (
                                        <span className="flex items-center gap-1"><Phone className="size-3" />{room.current_resident.phone}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground py-3">Chưa có người thuê.</p>
                )}
            </section>

            {/* Resident Contracts */}
            {Array.isArray(room.resident_contracts) && (
                <section>
                    <h2 className="text-base font-bold mb-3">Hợp đồng ({room.resident_contracts.length})</h2>
                    {room.resident_contracts.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Chưa có hợp đồng.</p>
                    ) : (
                        <div className="space-y-2">
                            {room.resident_contracts.map(c => (
                                <div key={c.id} className="flex items-center rounded-xl border border-border bg-card p-3 gap-3">
                                    <FileText className="size-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold">{c.contract_number}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmtDate(c.start_date)} → {fmtDate(c.end_date)} · {c.term_type}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-medium">{CONTRACT_STATUS_LABEL[c.status] || c.status}</p>
                                        <p className="text-xs text-muted-foreground">{fmtPrice(c.base_rent)} đ/th</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Resident Bookings */}
            {Array.isArray(room.resident_bookings) && (
                <section>
                    <h2 className="text-base font-bold mb-3">Đặt phòng ({room.resident_bookings.length})</h2>
                    {room.resident_bookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Chưa có đặt phòng.</p>
                    ) : (
                        <div className="space-y-2">
                            {room.resident_bookings.map(b => (
                                <div key={b.id} className="flex items-center rounded-xl border border-border bg-card p-3 gap-3">
                                    <CalendarDots className="size-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold">{b.booking_number}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Nhận phòng: {fmtDate(b.check_in_date)} · Hết hạn: {fmtDate(b.expires_at)}
                                        </p>
                                    </div>
                                    <p className="text-xs font-medium shrink-0">{BOOKING_STATUS_LABEL[b.status] || b.status}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Resident Requests */}
            {Array.isArray(room.resident_requests) && (
                <section>
                    <h2 className="text-base font-bold mb-3">Yêu cầu ({room.resident_requests.length})</h2>
                    {room.resident_requests.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Chưa có yêu cầu.</p>
                    ) : (
                        <div className="space-y-2">
                            {room.resident_requests.map(r => (
                                <div key={r.id} className="flex items-center rounded-xl border border-border bg-card p-3 gap-3">
                                    <ClipboardText className="size-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{r.title || r.request_number}</p>
                                        <p className="text-xs text-muted-foreground">{r.request_type} · {fmtDate(r.created_at)}</p>
                                    </div>
                                    <p className="text-xs font-medium shrink-0">{REQUEST_STATUS_LABEL[r.status] || r.status}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Confirm Delete */}
            <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle>Xóa phòng</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Bạn có chắc chắn muốn xóa phòng <strong className="text-foreground">&quot;{room.room_number}&quot;</strong>? Dữ liệu không thể khôi phục.
                    </p>
                    <DialogFooter className="justify-center gap-2 sm:justify-center">
                        <Button variant="outline" onClick={() => setConfirmDel(false)} disabled={saving}>Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={saving} className="gap-2">
                            {saving && <CircleNotch className="size-4 animate-spin" />}
                            Xóa phòng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
