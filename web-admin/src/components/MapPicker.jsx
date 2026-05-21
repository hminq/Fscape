import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Link } from "@phosphor-icons/react";
import { Map, useMap, MapMarker, MarkerContent, MapControls } from "@/components/ui/map";
import { Input } from "@/components/ui/input";
import { cn, parseGoogleMapsUrl } from "@/lib/utils";

const VIETNAM_CENTER = [106.66, 16.05];
const DEFAULT_ZOOM = 5;
const PLACED_ZOOM = 15;

/**
 * Renderless child that attaches a click listener to the map instance.
 * Uses a ref to avoid re-registering on every onChange identity change.
 */
function MapClickListener({ onChange }) {
  const { map, isLoaded } = useMap();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handler = (e) => {
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
    };

    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, isLoaded]);

  return null;
}

/**
 * Interactive map picker for selecting lat/lng coordinates.
 *
 * @param {number|string} latitude
 * @param {number|string} longitude
 * @param {(lat: number, lng: number) => void} onChange
 * @param {string} className
 */
export default function MapPicker({ latitude, longitude, onChange, className }) {
  const [gmapUrl, setGmapUrl] = useState("");
  const [parseError, setParseError] = useState(false);

  const hasCoords =
    latitude !== "" && latitude != null && longitude !== "" && longitude != null &&
    !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  const lat = hasCoords ? Number(latitude) : null;
  const lng = hasCoords ? Number(longitude) : null;

  const center = hasCoords ? [lng, lat] : VIETNAM_CENTER;
  const zoom = hasCoords ? PLACED_ZOOM : DEFAULT_ZOOM;

  const handleDragEnd = useCallback(
    ({ lat: newLat, lng: newLng }) => {
      onChange(newLat, newLng);
    },
    [onChange],
  );

  const handlePaste = (value) => {
    setGmapUrl(value);
    setParseError(false);
    if (!value.trim()) return;

    const result = parseGoogleMapsUrl(value);
    if (result) {
      onChange(result.lat, result.lng);
      setGmapUrl("");
    } else {
      setParseError(true);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={gmapUrl}
          onChange={(e) => handlePaste(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData("text"));
          }}
          placeholder="Link Google Maps"
          className={cn("pl-9 text-xs h-9", parseError && "border-destructive")}
        />
      </div>
      {parseError && (
        <p className="text-[11px] text-destructive">Không thể đọc tọa độ từ link này.</p>
      )}
      <div className="h-[200px] rounded-lg overflow-hidden border border-border">
        <Map center={center} zoom={zoom}>
          <MapClickListener onChange={onChange} />
          <MapControls position="bottom-right" showZoom />
          {hasCoords && (
            <MapMarker
              latitude={lat}
              longitude={lng}
              draggable
              onDragEnd={handleDragEnd}
            >
              <MarkerContent>
                <div className="flex items-center justify-center -translate-y-1/2">
                  <span className="absolute size-6 animate-ping rounded-full bg-primary/30" />
                  <span className="relative flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg">
                    <MapPin className="size-3 text-white" weight="fill" />
                  </span>
                </div>
              </MarkerContent>
            </MapMarker>
          )}
        </Map>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Bấm vào bản đồ hoặc dán link Google Maps để chọn vị trí
      </p>
    </div>
  );
}
