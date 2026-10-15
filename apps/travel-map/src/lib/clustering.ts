import type { LngLat, PhotoMeta, TripStop } from "../types";

const toRad = (d: number) => (d * Math.PI) / 180;
export const haversineKm = ([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// The most frequent non-empty value, or undefined.
const mode = (values: (string | undefined)[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
};

/**
 * Cluster consecutive photos that lie within `distanceKm` of the running
 * centroid into a single stop. The caller owns the ordering — photos arrive
 * sorted by capture time but the user can drag rows to re-order them, and that
 * order is the route.
 */
export const clusterPhotos = (
  photos: PhotoMeta[],
  distanceKm = 8,
): TripStop[] => {
  const geotagged = photos.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  );
  if (geotagged.length === 0) return [];

  type Cluster = { photos: PhotoMeta[]; sumLng: number; sumLat: number };
  const clusters: Cluster[] = [];
  for (const p of geotagged) {
    const cur = clusters[clusters.length - 1];
    if (!cur) {
      clusters.push({ photos: [p], sumLng: p.lng!, sumLat: p.lat! });
      continue;
    }
    const centroid: LngLat = [
      cur.sumLng / cur.photos.length,
      cur.sumLat / cur.photos.length,
    ];
    if (haversineKm(centroid, [p.lng!, p.lat!]) < distanceKm) {
      cur.photos.push(p);
      cur.sumLng += p.lng!;
      cur.sumLat += p.lat!;
    } else {
      clusters.push({ photos: [p], sumLng: p.lng!, sumLat: p.lat! });
    }
  }

  return clusters.map((c, i) => ({
    name: mode(c.photos.map((p) => p.place)) ?? `장소 ${i + 1}`,
    coords: [c.sumLng / c.photos.length, c.sumLat / c.photos.length],
    country: mode(c.photos.map((p) => p.country)),
    photos: c.photos,
  }));
};

export type MapView = { center: LngLat; zoom: number };

// Simple bounding-box → center/zoom fit for a 16:9 viewport with padding.
export const fitMapView = (
  coords: LngLat[],
  viewportW = 1280,
  viewportH = 720,
  paddingRatio = 0.15,
): MapView => {
  if (coords.length === 0) return { center: [0, 20], zoom: 2 };
  if (coords.length === 1) return { center: coords[0], zoom: 8 };
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const center: LngLat = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  const spanLng = Math.max(0.005, maxLng - minLng);
  const spanLat = Math.max(0.005, maxLat - minLat);
  const usableW = viewportW * (1 - paddingRatio * 2);
  const usableH = viewportH * (1 - paddingRatio * 2);
  const zoomW = Math.log2((usableW * 360) / (512 * spanLng * 111.32));
  const zoomH = Math.log2((usableH * 360) / (512 * spanLat * 111.32));
  let zoom = Math.min(zoomW, zoomH) + Math.log2(111.32); // rough mercator correction
  if (!Number.isFinite(zoom)) zoom = 5;
  zoom = Math.max(2, Math.min(zoom, 14));
  return { center, zoom: Number(zoom.toFixed(2)) };
};
