import type {
  LngLat,
  PhotoMeta,
  PhotoStats,
  TravelMode,
  TripDay,
  TripStop,
} from "../types";
import { haversineKm } from "./clustering";
import { greatCircleCoords } from "./route";

/* — formatting ————————————————————————————————————————————————— */

const pad2 = (n: number) => String(n).padStart(2, "0");

export const formatTime = (iso?: string) => {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const formatDate = (iso?: string) => {
  if (!iso) return "--.--";
  const d = new Date(iso);
  return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
};

export const formatDateFull = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
};

export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

export const formatCoords = (p: { lat?: number; lng?: number }) =>
  p.lat == null || p.lng == null
    ? "—"
    : `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`;

/** Local calendar day key, so photos group the way the traveler experienced them. */
export const dayKey = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/* — derived model ——————————————————————————————————————————————— */

export const computeStats = (photos: PhotoMeta[]): PhotoStats => ({
  total: photos.length,
  withGeo: photos.filter((p) => p.status === "ok").length,
  withoutGeo: photos.filter((p) => p.status === "no-geo").length,
  unsupported: photos.filter((p) => p.status === "unsupported").length,
});

/** Trip length in calendar days, counting only days that have photos. */
export const countDays = (photos: PhotoMeta[]) =>
  new Set(photos.filter((p) => p.takenAt).map((p) => dayKey(p.takenAt))).size;

/**
 * One entry per calendar day the traveler shot photos on — a day is a day even
 * when it was spent inside a single stop. Each day jumps to the first stop it
 * touches.
 */
export const computeDays = (stops: TripStop[]): TripDay[] => {
  const order: string[] = [];
  const buckets = new Map<string, { stopIndexes: number[]; photos: number }>();
  stops.forEach((stop, index) => {
    for (const photo of stop.photos) {
      const k = dayKey(photo.takenAt) || "_";
      let bucket = buckets.get(k);
      if (!bucket) {
        bucket = { stopIndexes: [], photos: 0 };
        buckets.set(k, bucket);
        order.push(k);
      }
      bucket.photos += 1;
      if (!bucket.stopIndexes.includes(index)) bucket.stopIndexes.push(index);
    }
  });
  return order.map((k, i) => {
    const bucket = buckets.get(k)!;
    const first = stops[bucket.stopIndexes[0]];
    const last = stops[bucket.stopIndexes[bucket.stopIndexes.length - 1]];
    return {
      n: pad2(i + 1),
      label: first === last ? first.name : `${first.name} → ${last.name}`,
      count: bucket.photos,
      stopIndex: bucket.stopIndexes[0],
    };
  });
};

/** Different country, or a hop too long to drive, means the face rides a plane. */
const PLANE_KM = 400;
export const legMode = (from: TripStop, to: TripStop): TravelMode => {
  if (from.country && to.country && from.country !== to.country) return "plane";
  return haversineKm(from.coords, to.coords) > PLANE_KM ? "plane" : "car";
};

export const totalKm = (stops: TripStop[]) =>
  stops
    .slice(0, -1)
    .reduce((sum, s, i) => sum + haversineKm(s.coords, stops[i + 1].coords), 0);

/* — playback timeline ————————————————————————————————————————— */

export type Leg = {
  fromIndex: number;
  toIndex: number;
  from: TripStop;
  to: TripStop;
  coords: LngLat[];
  mode: TravelMode;
  km: number;
  startSec: number; // when the traveler leaves `from`
  travelSec: number;
  dwellSec: number; // pause at `to` while its photo is on the rail
};

export type Timeline = {
  legs: Leg[];
  duration: number;
  introSec: number;
};

const INTRO_SEC = 1.2;
const DWELL_SEC = 1.6;
const MIN_TRAVEL_SEC = 1.6;
const MAX_TRAVEL_SEC = 4.4;

export const buildTimeline = (stops: TripStop[]): Timeline => {
  const pairs = stops.slice(0, -1).map((from, i) => ({
    from,
    to: stops[i + 1],
    fromIndex: i,
    toIndex: i + 1,
    km: haversineKm(from.coords, stops[i + 1].coords),
  }));
  const maxKm = Math.max(1, ...pairs.map((p) => p.km));

  let cursor = INTRO_SEC;
  const legs: Leg[] = pairs.map((p) => {
    const travelSec = Math.min(
      MAX_TRAVEL_SEC,
      MIN_TRAVEL_SEC + (MAX_TRAVEL_SEC - MIN_TRAVEL_SEC) * (p.km / maxKm),
    );
    const leg: Leg = {
      ...p,
      coords: greatCircleCoords(p.from.coords, p.to.coords),
      mode: legMode(p.from, p.to),
      startSec: cursor,
      travelSec,
      dwellSec: DWELL_SEC,
    };
    cursor += travelSec + DWELL_SEC;
    return leg;
  });

  return { legs, duration: Math.max(cursor, INTRO_SEC), introSec: INTRO_SEC };
};

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export type PlayPosition = {
  legIndex: number;
  /** Eased 0–1 progress along `legIndex`. */
  progress: number;
  /** Last stop actually reached — what the right rail shows. */
  activeStopIndex: number;
  moving: boolean;
  done: boolean;
};

export const positionAt = (timeline: Timeline, t: number): PlayPosition => {
  const { legs, duration } = timeline;
  if (legs.length === 0) {
    return {
      legIndex: 0,
      progress: 0,
      activeStopIndex: 0,
      moving: false,
      done: true,
    };
  }
  if (t >= duration) {
    return {
      legIndex: legs.length - 1,
      progress: 1,
      activeStopIndex: legs.length,
      moving: false,
      done: true,
    };
  }
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    if (t < leg.startSec) break; // still in the intro hold on stop 0
    if (t < leg.startSec + leg.travelSec) {
      return {
        legIndex: i,
        progress: easeInOut((t - leg.startSec) / leg.travelSec),
        activeStopIndex: leg.fromIndex,
        moving: true,
        done: false,
      };
    }
    if (t < leg.startSec + leg.travelSec + leg.dwellSec) {
      return {
        legIndex: i,
        progress: 1,
        activeStopIndex: leg.toIndex,
        moving: false,
        done: false,
      };
    }
  }
  return {
    legIndex: 0,
    progress: 0,
    activeStopIndex: 0,
    moving: false,
    done: false,
  };
};

/** When the traveler reaches `stopIndex` — the seek target for jumps. */
export const arrivalTime = (timeline: Timeline, stopIndex: number) => {
  if (stopIndex <= 0) return 0;
  const leg = timeline.legs[stopIndex - 1];
  if (!leg) return timeline.duration;
  return leg.startSec + leg.travelSec;
};

/* — schematic projection (the “움직임 미리보기” mini map) ————————— */

export type Point = { x: number; y: number };

const mercatorY = (lat: number) => {
  const clamped = Math.max(-85, Math.min(85, lat));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
};

/** Position of each value within the sorted order of the set, as 0–1. */
const ranks = (values: number[]): number[] => {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map((e) => e.i);
  const out = new Array<number>(values.length).fill(0);
  const last = Math.max(1, values.length - 1);
  order.forEach((originalIndex, position) => {
    out[originalIndex] = position / last;
  });
  return out;
};

/**
 * Fit coordinates into a schematic box. Each axis is normalised independently
 * and then blended toward evenly-spaced rank positions: one long-haul flight
 * plus a cluster of city stops would otherwise pile every local stop into a few
 * pixels. This preview is a diagram of the route's shape, not a survey map.
 */
export const projectToBox = (
  coords: LngLat[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  spread = 0.55,
): Point[] => {
  if (coords.length === 0) return [];
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => mercatorY(c[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mix = (trueNorm: number, rank: number) =>
    (1 - spread) * trueNorm + spread * rank;

  return coords.map((_, i) => ({
    x: padX + mix((xs[i] - minX) / spanX, rx[i]) * (width - padX * 2),
    // SVG y grows downward; north should sit at the top.
    y: height - padY - mix((ys[i] - minY) / spanY, ry[i]) * (height - padY * 2),
  }));
};

/** Catmull-Rom through the points, emitted as a cubic bezier path. */
export const smoothPath = (points: Point[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d +=
      ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)},` +
      ` ${c2.x.toFixed(1)} ${c2.y.toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};
