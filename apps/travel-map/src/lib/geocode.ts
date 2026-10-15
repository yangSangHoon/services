import type { LngLat } from "../types";

export type Place = { name: string; country?: string };

// Reverse-geocode via Nominatim. Cached in-memory per session.
const cache = new Map<string, Place>();

const key = ([lng, lat]: LngLat) => `${lng.toFixed(3)},${lat.toFixed(3)}`;

export const reverseGeocode = async (coords: LngLat): Promise<Place | null> => {
  const k = key(coords);
  const hit = cache.get(k);
  if (hit) return hit;
  const [lng, lat] = coords;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lon=${lng}&lat=${lat}&accept-language=ko`;
  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "ko" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.municipality ||
      data.address?.county ||
      data.address?.state ||
      data.display_name?.split(",")[0] ||
      null;
    if (!name) return null;
    const place: Place = { name, country: data.address?.country_code };
    cache.set(k, place);
    return place;
  } catch {
    return null;
  }
};

/**
 * Nominatim's usage policy allows one request per second. Photos are queued as
 * they are uploaded and resolved one at a time so the itinerary table fills in
 * progressively instead of blocking the whole screen.
 */
const RATE_LIMIT_MS = 1100;

type Job = { coords: LngLat; resolve: (p: Place | null) => void };

const queue: Job[] = [];
let draining = false;

const drain = async () => {
  draining = true;
  while (queue.length) {
    const job = queue.shift()!;
    job.resolve(await reverseGeocode(job.coords));
    if (queue.length) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }
  draining = false;
};

export const queueReverseGeocode = (coords: LngLat): Promise<Place | null> => {
  const k = key(coords);
  const hit = cache.get(k);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    queue.push({ coords, resolve });
    if (!draining) void drain();
  });
};
