import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhotoMeta, Trip } from "./types";
import { readPhotoMeta } from "./lib/exif";
import { clusterPhotos, fitMapView } from "./lib/clustering";
import { queueReverseGeocode } from "./lib/geocode";
import { computeStats, countDays } from "./lib/trip";
import { loadSnapshot, saveSnapshot } from "./lib/storage";
import { createSamplePhotos, createSampleTraveler } from "./lib/samples";
import { UploadForm } from "./components/UploadForm";
import { TripPlayer } from "./components/TripPlayer";

const byTime = (a: PhotoMeta, b: PhotoMeta) =>
  (a.takenAt ?? "").localeCompare(b.takenAt ?? "");

export const App: React.FC = () => {
  const [travelerPhoto, setTravelerPhoto] = useState<PhotoMeta | null>(null);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [status, setStatus] = useState("");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [building, setBuilding] = useState(false);
  const [memos, setMemos] = useState<Record<string, string>>({});
  // Blocks the save effect from clobbering IDB with an empty state before
  // the initial load completes.
  const [hydrated, setHydrated] = useState(false);

  // Once the user drags a row, their order is the route — stop re-sorting by time.
  const manualOrder = useRef(false);

  useEffect(() => {
    void loadSnapshot().then((snap) => {
      if (snap && (snap.photos.length > 0 || snap.traveler)) {
        setTravelerPhoto(snap.traveler);
        setPhotos(snap.photos);
        setMemos(snap.memos);
        manualOrder.current = snap.manualOrder;
      } else {
        // First visit (or everything was cleared): seed a cartoon demo trip
        // 서울 → 오사카(비행기) → 교토 → 나라(자동차) so the whole flow is
        // visible before any upload. Real uploads replace the samples.
        setTravelerPhoto(createSampleTraveler());
        setPhotos(createSamplePhotos());
        setStatus(
          "샘플 여행(캐릭터 이미지)을 미리 넣어놨어 — 서울에서 비행기로 오사카에 간 뒤 자동차로 교토·나라를 도는 동선이야. 내 사진을 올리면 샘플은 자동으로 빠져.",
        );
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      // Samples are regenerated on demand — persisting them would make the
      // demo look like the user's own data after a reload.
      void saveSnapshot({
        traveler: travelerPhoto?.isSample ? null : travelerPhoto,
        photos: photos.filter((p) => !p.isSample),
        memos,
        manualOrder: manualOrder.current,
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [hydrated, travelerPhoto, photos, memos]);

  const stats = useMemo(() => computeStats(photos), [photos]);
  const stops = useMemo(() => clusterPhotos(photos, 8), [photos]);
  const dayCount = useMemo(() => countDays(photos), [photos]);

  const addPhotos = useCallback(async (files: File[]) => {
    setStatus(`사진 읽는 중… (${files.length}장)`);
    const metas: PhotoMeta[] = [];
    for (const f of files) metas.push(await readPhotoMeta(f));
    metas.sort(byTime);

    setPhotos((prev) => {
      // The first real upload retires the cartoon demo photos.
      const kept = prev.filter((p) => !p.isSample);
      const next = [...kept, ...metas];
      return manualOrder.current ? next : next.sort(byTime);
    });
    const geotagged = metas.filter((m) => m.status === "ok").length;
    setStatus(
      geotagged === metas.length
        ? `${metas.length}장 추가했어. 장소 이름을 찾는 중…`
        : `${metas.length}장 추가 · 위치 있는 사진 ${geotagged}장`,
    );

    // Resolve place names in the background; the itinerary table fills in as
    // answers arrive (Nominatim allows ~1 request per second).
    for (const meta of metas) {
      if (meta.status !== "ok") continue;
      void queueReverseGeocode([meta.lng!, meta.lat!]).then((place) => {
        if (!place) return;
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === meta.id && !p.place
              ? { ...p, place: place.name, country: place.country }
              : p,
          ),
        );
      });
    }
  }, []);

  const setTraveler = useCallback(async (file: File) => {
    const meta = await readPhotoMeta(file);
    setTravelerPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return meta;
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const reorderPhotos = useCallback((draggedId: string, targetId: string) => {
    manualOrder.current = true;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === draggedId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const editPhoto = useCallback((id: string, patch: Partial<PhotoMeta>) => {
    setPhotos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      return "takenAt" in patch && !manualOrder.current
        ? next.sort(byTime)
        : next;
    });
  }, []);

  const generate = useCallback(() => {
    if (stops.length < 2) {
      setStatus("위치 정보가 있는 사진이 2장 이상 필요해. 앨범 원본을 올려줘.");
      return;
    }
    setBuilding(true);
    const view = fitMapView(stops.map((s) => s.coords));
    setTrip({ stops, mapCenter: view.center, mapZoom: view.zoom });
    setStatus(`경로: ${stops.map((s) => s.name).join(" → ")}`);
    setBuilding(false);
  }, [stops]);

  const setMemo = useCallback((stopName: string, text: string) => {
    setMemos((prev) => ({ ...prev, [stopName]: text }));
  }, []);

  return (
    <div className="shell">
      {trip ? (
        <TripPlayer
          trip={trip}
          travelerPhotoUrl={travelerPhoto?.url ?? null}
          photos={photos}
          memos={memos}
          onMemoChange={setMemo}
          onBack={() => setTrip(null)}
        />
      ) : (
        <UploadForm
          travelerPhoto={travelerPhoto}
          photos={photos}
          stops={stops}
          stats={stats}
          dayCount={dayCount}
          status={status}
          building={building}
          onTravelerSelected={setTraveler}
          onPhotosSelected={addPhotos}
          onRemovePhoto={removePhoto}
          onReorder={reorderPhotos}
          onEditPhoto={editPhoto}
          onGenerate={generate}
        />
      )}
    </div>
  );
};
