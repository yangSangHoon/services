import exifr from "exifr";
import type { PhotoMeta } from "../types";

export const readPhotoMeta = async (file: File): Promise<PhotoMeta> => {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = URL.createObjectURL(file);
  const meta: PhotoMeta = { id, file, url, status: "no-geo" };
  try {
    const gps = await exifr.gps(file);
    const parsed = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    if (gps) {
      meta.lat = gps.latitude;
      meta.lng = gps.longitude;
      meta.status = "ok";
    }
    const t = parsed?.DateTimeOriginal || parsed?.CreateDate;
    if (t) meta.takenAt = new Date(t).toISOString();
  } catch {
    // The file could not be parsed at all — keep it in the list, flagged, so
    // the user can see which upload went wrong.
    meta.status = "unsupported";
  }
  return meta;
};
