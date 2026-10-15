import * as turf from "@turf/turf";
import type { LngLat } from "../types";

export const greatCircleCoords = (from: LngLat, to: LngLat): LngLat[] => {
  const route = turf.greatCircle(from, to, { npoints: 96 });
  if (route.geometry.type === "LineString") {
    return route.geometry.coordinates as LngLat[];
  }
  // Antimeridian split → pick the longest continuous segment.
  const longest = route.geometry.coordinates.reduce((best, seg) =>
    seg.length > best.length ? seg : best,
  );
  return longest as LngLat[];
};

// Slice a coordinate list by fractional progress [0, 1] and return the resulting
// coordinates including a final interpolated point at the progress boundary.
export const partialCoords = (coords: LngLat[], progress: number): LngLat[] => {
  if (progress <= 0) return [coords[0]];
  if (progress >= 1) return coords;
  const total = (coords.length - 1) * progress;
  const whole = Math.floor(total);
  const frac = total - whole;
  const out = coords.slice(0, whole + 1);
  if (whole < coords.length - 1 && frac > 0) {
    const a = coords[whole];
    const b = coords[whole + 1];
    out.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
  }
  return out;
};

// Convert an [lng,lat] coord array into SVG path strings, splitting when the
// projected line jumps across the map (antimeridian).
export const buildSvgPaths = (
  coords: LngLat[],
  project: (c: LngLat) => { x: number; y: number },
  jumpThresholdPx: number,
): string[] => {
  if (coords.length < 2) return [];
  const paths: string[] = [];
  let current = "";
  let prev: { x: number; y: number } | null = null;
  for (const c of coords) {
    const p = project(c);
    if (!prev) {
      current = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    } else if (Math.abs(p.x - prev.x) > jumpThresholdPx) {
      if (current) paths.push(current);
      current = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    } else {
      current += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    prev = { x: p.x, y: p.y };
  }
  if (current) paths.push(current);
  return paths;
};

export const bearing = (from: LngLat, to: LngLat) => turf.bearing(from, to);
