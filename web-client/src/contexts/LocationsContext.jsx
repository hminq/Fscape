import { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

const LocationsContext = createContext(null);

const MAX_LOCATIONS = 5;

export function LocationsProvider({ children }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/locations?is_active=true&limit=${MAX_LOCATIONS}`)
      .then(async (res) => {
        const locs = res.data || [];
        const details = await Promise.all(
          locs.map((loc) =>
            api
              .get(`/api/locations/${loc.id}`)
              .then((r) => r?.data)
              .catch(() => loc)
          )
        );
        const filtered = details.map((loc) => ({
          ...loc,
          buildings: (loc.buildings || []).filter((b) => b.is_active !== false),
        }));
        setLocations(filtered);
      })
      .catch((err) => console.error("Failed to fetch locations:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LocationsContext.Provider value={{ locations, loading }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocations must be used within LocationsProvider");
  return ctx;
}
