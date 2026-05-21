const R = 6371; // Earth radius in km

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestBuilding(university, buildings) {
  if (!university?.latitude || !university?.longitude || !buildings?.length) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const b of buildings) {
    if (!b.latitude || !b.longitude) continue;
    const dist = haversineDistance(university.latitude, university.longitude, b.latitude, b.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = b;
    }
  }

  return nearest;
}
