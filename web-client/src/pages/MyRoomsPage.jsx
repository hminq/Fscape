import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CircleNotch, ArrowLeft, MapPin, Bed, Bathtub, Ruler, Users, CalendarDots } from "@phosphor-icons/react";
import AppNavbar from "@/components/layout/AppNavbar";
import Footer from "@/components/layout/Footer";
import { LocationsProvider } from "@/contexts/LocationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatVnd, formatDisplayDate } from "@/lib/formatters";
import { MY_ROOM_STATUS_LABELS } from "@/lib/constants";
import defaultRoomImg from "@/assets/default_room_img.jpg";
import { cdnUrl } from "@/lib/utils";

const STATUS_LABELS = MY_ROOM_STATUS_LABELS;

function MyRoomsContent() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    const fetchMyRooms = async () => {
      try {
        const res = await api.get("/api/rooms/my");
        setContracts(res.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyRooms();
  }, [isLoggedIn, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <CircleNotch className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="size-4" />
        Quay lại
      </button>

      <h1 className="text-3xl font-bold text-primary mb-2">Phòng của tôi</h1>
      <p className="text-secondary mb-8">Các phòng bạn đang thuê với hợp đồng còn hiệu lực.</p>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {contracts.length === 0 && !error ? (
        <div className="text-center py-20">
          <p className="text-lg text-secondary mb-4">Bạn chưa có phòng nào đang thuê.</p>
          <Link
            to="/rooms"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white"
          >
            Tìm phòng ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.map((contract) => {
            const room = contract.room;
            const building = room?.building;
            const roomType = room?.room_type;
            const statusInfo = STATUS_LABELS[contract.status] || STATUS_LABELS.ACTIVE;

            return (
              <div
                key={contract.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
              >
                {/* Room image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={cdnUrl(room?.thumbnail_url) || defaultRoomImg}
                    alt={`Phòng ${room?.room_number}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                    {statusInfo.text}
                  </span>
                </div>

                {/* Info */}
                <div className="p-5">
                  {/* Title: RoomType - RoomNumber */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-primary">
                      {roomType?.name ? `${roomType.name} - ${room?.room_number}` : `Phòng ${room?.room_number}`}
                    </h3>
                    <p className="text-lg font-bold text-olive whitespace-nowrap">
                      {formatVnd(contract.base_rent)}<span className="text-xs font-normal text-secondary">/tháng</span>
                    </p>
                  </div>

                  {/* Building + floor on same line */}
                  {building && (
                    <p className="flex items-center gap-1 text-sm text-secondary mb-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span>{building.name}</span>
                      {room?.floor != null && <span>· Tầng {room.floor}</span>}
                    </p>
                  )}

                  {/* Room type specs */}
                  {roomType && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-secondary mb-4">
                      {roomType.area_sqm && (
                        <span className="flex items-center gap-1"><Ruler className="size-3" />{roomType.area_sqm}m²</span>
                      )}
                      {roomType.bedrooms && (
                        <span className="flex items-center gap-1"><Bed className="size-3" />{roomType.bedrooms} PN</span>
                      )}
                      {roomType.bathrooms && (
                        <span className="flex items-center gap-1"><Bathtub className="size-3" />{roomType.bathrooms} WC</span>
                      )}
                      {roomType.capacity_max && (
                        <span className="flex items-center gap-1"><Users className="size-3" />Tối đa {roomType.capacity_max}</span>
                      )}
                    </div>
                  )}

                  {/* Contract period */}
                  <div className="flex items-center gap-1.5 text-xs text-secondary border-t border-gray-100 pt-3">
                    <CalendarDots className="size-3.5 text-olive" />
                    <span>
                      {formatDisplayDate(contract.start_date)} — {formatDisplayDate(contract.end_date)}
                    </span>
                    <span className="ml-auto text-[11px] text-secondary/60">
                      {contract.contract_number}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MyRoomsPage() {
  return (
    <LocationsProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <AppNavbar />
        <div className="flex-1">
          <MyRoomsContent />
        </div>
        <Footer />
      </div>
    </LocationsProvider>
  );
}
