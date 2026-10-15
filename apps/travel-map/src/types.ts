export type LngLat = [number, number];

/** `ok` = geotagged, `no-geo` = readable but no GPS, `unsupported` = unreadable file. */
export type PhotoStatus = "ok" | "no-geo" | "unsupported";

export type PhotoMeta = {
  id: string; // unique id (crypto.randomUUID)
  file: File;
  url: string; // object URL for preview & display
  lat?: number;
  lng?: number;
  takenAt?: string; // ISO
  place?: string; // reverse-geocoded (or hand-corrected) place name
  country?: string; // ISO country code, decides plane vs. car per leg
  status: PhotoStatus;
  /** Built-in cartoon demo photo — swapped out when real photos arrive, never persisted. */
  isSample?: boolean;
};

export type TripStop = {
  name: string;
  coords: LngLat;
  country?: string;
  photos: PhotoMeta[];
};

export type Trip = {
  stops: TripStop[];
  mapCenter: LngLat;
  mapZoom: number;
};

/** How the traveler covers a leg — same country and short hop = car. */
export type TravelMode = "plane" | "car";

export type PhotoStats = {
  total: number;
  withGeo: number;
  withoutGeo: number;
  unsupported: number;
};

export type TripDay = {
  n: string; // "01"
  label: string; // "인천 → 오사카"
  count: number; // photos taken that day
  stopIndex: number; // first stop of the day — the jump target
};
