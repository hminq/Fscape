import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleNotch } from "@phosphor-icons/react";
import BuildingStaffDialog from "@/components/BuildingStaffDialog";
import { apiJson } from "@/lib/apiClient";

export default function BuildingStaffPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiJson(`/api/buildings/${id}`);
        setBuilding(res.data || res);
      } catch {
        setBuilding(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <CircleNotch className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <BuildingStaffDialog
      open
      onOpenChange={(open) => {
        if (!open) navigate("/buildings");
      }}
      buildingId={id}
      buildingName={building?.name}
    />
  );
}
