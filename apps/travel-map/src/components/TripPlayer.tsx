import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { LngLat, PhotoMeta, Trip } from "../types";
import { bearing, buildSvgPaths, partialCoords } from "../lib/route";
import {
  arrivalTime,
  buildTimeline,
  computeDays,
  countDays,
  formatClock,
  formatCoords,
  formatDate,
  formatDateFull,
  formatTime,
  positionAt,
  totalKm,
} from "../lib/trip";
import { PhotoModal } from "./PhotoModal";
import {
  ArrowLeftIcon,
  CarIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DownloadIcon,
  MusicIcon,
  PauseIcon,
  PencilIcon,
  PlaneIcon,
  PlayIcon,
  Share2Icon,
} from "./icons";

type Props = {
  trip: Trip;
  travelerPhotoUrl: string | null;
  photos: PhotoMeta[];
  memos: Record<string, string>;
  onMemoChange: (stopName: string, text: string) => void;
  onBack: () => void;
};

// OpenFreeMap Positron: 도시 이름과 옅은 도로만 있는 조용한 밝은 지도.
// CARTO 래스터 타일은 이제 API 키가 없으면 "API KEY REQUIRED" 타일을 주므로, 키 없이 쓰는 OpenFreeMap 으로 바꿨다.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

// 벡터 타일은 워커가 그린다. maplibre 는 워커 파일을 자기 옆에서 찾는데 Vite 번들에선 못 찾아서 직접 알려준다.
maplibregl.setWorkerUrl(workerUrl);

const STORAGE_KEY = "travel-map.player-position";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const TripPlayer: React.FC<Props> = ({
  trip,
  travelerPhotoUrl,
  photos,
  memos,
  onMemoChange,
  onBack,
}) => {
  const { stops, mapCenter, mapZoom } = trip;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Bumped on every camera change so the overlay re-projects with the map.
  const [camera, setCamera] = useState(0);

  const timeline = useMemo(() => buildTimeline(stops), [stops]);
  const days = useMemo(() => computeDays(stops), [stops]);
  const signature = useMemo(() => stops.map((s) => s.name).join("→"), [stops]);

  const reduced = useMemo(prefersReducedMotion, []);
  const [t, setT] = useState(() => (reduced ? timeline.duration : 0));
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [editingMemo, setEditingMemo] = useState(false);
  const [modalStop, setModalStop] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  // Restore the playhead across reloads (same trip only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { signature: string; t: number };
      if (saved.signature === signature && saved.t > 0) {
        setT(Math.min(saved.t, timeline.duration));
        setPlaying(false);
      }
    } catch {
      // Corrupt or unavailable storage — start from the top.
    }
  }, [signature, timeline.duration]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, t }));
    } catch {
      // Private mode / quota — playback still works, it just won't resume.
    }
  }, [signature, t]);

  // Map instance, created once for the player's lifetime.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const instance = new maplibregl.Map({
      container: el,
      style: MAP_STYLE,
      center: mapCenter,
      zoom: mapZoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    instance.on("load", () => setMap(instance));
    instance.on("move", () => setCamera((v) => v + 1));

    // Measure eagerly — the overlay can only project once a size is known, and
    // a zero-sized observation must never clobber a good one.
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
      instance.resize();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      instance.remove();
    };
    // mapCenter/mapZoom are fixed for a given trip — see App's generate().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame the whole route once the map exists and its box is measured —
  // fitMapView's estimate is based on a 16:9 viewport, the stage is not.
  useEffect(() => {
    if (!map || size.w === 0 || size.h === 0) return;
    // Sync the transform to the measured box first, or the camera is fitted to
    // a stale size and the newly exposed strip never requests its tiles.
    map.resize();
    const bounds = stops.reduce(
      (b, s) => b.extend(s.coords),
      new maplibregl.LngLatBounds(stops[0].coords, stops[0].coords),
    );
    map.fitBounds(bounds, {
      padding: { top: 52, bottom: 48, left: 64, right: 64 },
      animate: false,
      maxZoom: 12,
    });
  }, [map, size.w, size.h, stops]);

  // Playback clock.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + dt * speed;
        if (next >= timeline.duration) {
          setPlaying(false);
          return timeline.duration;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, timeline.duration]);

  const pos = positionAt(timeline, t);
  const activeStop = stops[Math.min(pos.activeStopIndex, stops.length - 1)];
  const currentLeg = timeline.legs[pos.legIndex];

  const seek = useCallback(
    (next: number) => {
      setT(Math.max(0, Math.min(timeline.duration, next)));
    },
    [timeline.duration],
  );

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && t >= timeline.duration) setT(0);
      return !p;
    });
  }, [t, timeline.duration]);

  const jumpStop = useCallback(
    (delta: number) => {
      const target = Math.max(
        0,
        Math.min(stops.length - 1, pos.activeStopIndex + delta),
      );
      seek(arrivalTime(timeline, target));
      setPlaying(false);
    },
    [pos.activeStopIndex, seek, stops.length, timeline],
  );

  // Scrubbing: pointer capture on the track so drags keep tracking outside it.
  const scrubTo = useCallback(
    (clientX: number) => {
      const el = scrubRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      seek(ratio * timeline.duration);
    },
    [seek, timeline.duration],
  );

  const onScrubDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setPlaying(false);
      scrubTo(e.clientX);
    },
    [scrubTo],
  );

  const onScrubMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      scrubTo(e.clientX);
    },
    [scrubTo],
  );

  /* — video recording (screen capture) ——————————————————————— */

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordStreamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      window.alert(
        "이 브라우저는 화면 캡처를 지원하지 않아. 최신 Chrome/Edge에서 시도해봐.",
      );
      return;
    }
    // Region Capture (CropTarget) is Chromium-only. Without it we'd end up
    // recording the whole tab, which is exactly what the user is trying to
    // avoid — so refuse rather than silently degrade.
    const CropTargetCtor = (window as unknown as { CropTarget?: { fromElement(el: Element): Promise<unknown> } }).CropTarget;
    if (!CropTargetCtor || !stageRef.current) {
      window.alert(
        "이 브라우저는 영역 캡처(Region Capture)를 지원하지 않아. Chrome/Edge 최신판에서 시도해봐.",
      );
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        // Chromium hints: put the current tab at the top of the picker so the
        // user just clicks "Share" without hunting for it.
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        systemAudio: "exclude",
      } as MediaStreamConstraints);
    } catch {
      // User cancelled the picker or denied permission.
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    const trackWithCrop = videoTrack as MediaStreamTrack & {
      cropTo?: (target: unknown) => Promise<void>;
    };
    if (!trackWithCrop.cropTo) {
      // Picked something other than a tab (window/screen) — cropping only works
      // on tab captures, so bail out cleanly rather than record the full source.
      stream.getTracks().forEach((t) => t.stop());
      window.alert(
        "탭을 선택해야 애니메이션 영역만 잘라서 녹화할 수 있어. 다시 시도하고 '이 탭'을 골라줘.",
      );
      return;
    }
    try {
      const target = await CropTargetCtor.fromElement(stageRef.current);
      await trackWithCrop.cropTo(target);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      window.alert("영역 크롭에 실패했어. 다시 시도해줘.");
      return;
    }

    // Pick a codec the browser will actually record — webm/vp9 is broadly
    // supported; fall back to whatever the browser defaults to.
    const preferred = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = preferred.find((m) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
    );
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined,
    );

    recordChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      recordChunksRef.current = [];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const first = stops[0]?.name ?? "trip";
      const last = stops[stops.length - 1]?.name ?? "";
      a.download = `${first}-${last}-${new Date().toISOString().slice(0, 10)}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    // If the user stops sharing via the browser's own toolbar, tear down cleanly.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      stopRecording();
      setPlaying(false);
    });

    recorderRef.current = recorder;
    recordStreamRef.current = stream;
    recorder.start(1000);
    setRecording(true);
    setT(0);
    setPlaying(true);
  }, [recording, stopRecording, stops]);

  // Auto-stop when playback reaches the end during a recording.
  useEffect(() => {
    if (!recording) return;
    if (t >= timeline.duration) stopRecording();
  }, [recording, t, timeline.duration, stopRecording]);

  // Release resources if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* — geometry —————————————————————————————————————————————— */

  const ready = Boolean(map) && size.w > 0 && size.h > 0;
  const project = useCallback(
    (c: LngLat) => {
      void camera; // re-project whenever the camera moved
      const p = map!.project(c);
      return { x: p.x, y: p.y };
    },
    [map, camera],
  );
  const jumpThreshold = size.w * 0.6;

  const fullRoutePaths = ready
    ? timeline.legs.flatMap((leg) =>
        buildSvgPaths(leg.coords, project, jumpThreshold),
      )
    : [];

  const travelled = ready
    ? timeline.legs
        .slice(0, pos.legIndex)
        .flatMap((leg) => buildSvgPaths(leg.coords, project, jumpThreshold))
    : [];
  const partial =
    ready && currentLeg && (pos.moving || pos.progress >= 1)
      ? partialCoords(currentLeg.coords, pos.progress)
      : [];
  const partialPaths =
    ready && partial.length >= 2
      ? buildSvgPaths(partial, project, jumpThreshold)
      : [];

  const markerCoord: LngLat | null = !ready
    ? null
    : partial.length
      ? partial[partial.length - 1]
      : (activeStop?.coords ?? stops[0].coords);
  const markerPixel = markerCoord ? project(markerCoord) : null;
  const headingDeg =
    pos.moving && currentLeg && markerCoord
      ? bearing(markerCoord, currentLeg.to.coords)
      : 0;
  const mode = currentLeg?.mode ?? "plane";

  const stopPixels = ready ? stops.map((s) => project(s.coords)) : [];

  /* — header facts ——————————————————————————————————————————— */

  const times = photos
    .map((p) => p.takenAt)
    .filter((v): v is string => Boolean(v))
    .sort();
  const dayCount = countDays(photos);
  const km = Math.round(totalKm(stops));
  const activeDay = [...days]
    .reverse()
    .find((d) => d.stopIndex <= pos.activeStopIndex);

  const railPhoto = activeStop?.photos[0];
  const memo = activeStop ? (memos[activeStop.name] ?? "") : "";

  return (
    <div className="screen">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12.5 }}
            onClick={onBack}
          >
            <ArrowLeftIcon size={13} />
            사진 고치기
          </button>
          <span
            style={{
              width: 1,
              height: 16,
              background: "var(--color-divider)",
              alignSelf: "center",
            }}
          />
          <span className="brand">
            {stops[0]?.name} · {stops[stops.length - 1]?.name} {dayCount}일
          </span>
          {times.length > 0 && (
            <span className="text-muted tabular" style={{ fontSize: 11 }}>
              {formatDateFull(times[0])} – {formatDate(times[times.length - 1])}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
            disabled
            title="준비 중"
          >
            <MusicIcon size={13} />
            음악 고르기
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
            }}
            title="이 페이지 주소를 복사해"
          >
            <Share2Icon size={13} />
            링크 공유
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 12.5 }}
            onClick={() => {
              void startRecording();
            }}
            title={
              recording
                ? "녹화 중지 — 파일이 자동으로 저장돼."
                : "화면 캡처로 영상을 녹화해서 webm으로 저장해."
            }
          >
            <DownloadIcon size={13} />
            {recording ? "녹화 중지" : "영상 내려받기"}
          </button>
        </div>
      </header>

      <div className="player-body">
        {/* ——— 왼쪽: 지도 무대 + 재생 컨트롤 ——— */}
        <div style={{ padding: "24px 28px 20px" }}>
          <div ref={stageRef} className="stage">
            <div ref={containerRef} className="map-canvas" />
            <div className="map-grid" />

            {ready && (
              <svg width={size.w} height={size.h} className="stage-overlay">
                {fullRoutePaths.map((d, i) => (
                  <path
                    key={`f-${i}`}
                    d={d}
                    fill="none"
                    stroke="color-mix(in srgb, var(--color-text) 16%, transparent)"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                  />
                ))}
                {[...travelled, ...partialPaths].map((d, i) => (
                  <path
                    key={`t-${i}`}
                    d={d}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                ))}
                {stopPixels.map((p, i) => (
                  <circle
                    key={`s-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={5}
                    fill="var(--color-bg)"
                    stroke="var(--color-accent-700)"
                    strokeWidth={1.4}
                  />
                ))}
              </svg>
            )}

            {ready &&
              stopPixels.map((p, i) => (
                <span
                  key={`lbl-${i}`}
                  className="stop-label"
                  style={{ left: p.x, top: p.y + 9 }}
                >
                  {stops[i].name}
                </span>
              ))}

            {markerPixel && (
              <div
                className="marker"
                style={{ left: markerPixel.x, top: markerPixel.y }}
              >
                <div
                  className="pip"
                  style={{
                    position: "absolute",
                    inset: -5,
                    borderRadius: 999,
                    background: "var(--color-accent)",
                  }}
                />
                {travelerPhotoUrl ? (
                  <img
                    className="plate"
                    src={travelerPhotoUrl}
                    alt=""
                    style={{
                      position: "relative",
                      top: -6,
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      borderWidth: 4,
                    }}
                  />
                ) : (
                  <div
                    className="ph plate"
                    style={{
                      position: "relative",
                      top: -6,
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      borderWidth: 4,
                    }}
                  />
                )}
                <span className="marker-vehicle">
                  {mode === "plane" ? (
                    <span
                      style={{
                        display: "block",
                        transform: `rotate(${headingDeg - 45}deg)`,
                      }}
                    >
                      <PlaneIcon size={17} />
                    </span>
                  ) : (
                    <CarIcon size={17} />
                  )}
                </span>
              </div>
            )}

            <div
              style={{
                position: "absolute",
                left: 16,
                top: 14,
                display: "flex",
                gap: 6,
              }}
            >
              {activeDay && (
                <span className="tag tag-accent" style={{ fontSize: 10 }}>
                  DAY {Number(activeDay.n)}
                </span>
              )}
              <span className="tag tag-outline" style={{ fontSize: 10 }}>
                {pos.moving && currentLeg
                  ? `${currentLeg.from.name} → ${currentLeg.to.name}`
                  : activeStop?.name}
              </span>
            </div>

            <div
              className="tabular"
              style={{
                position: "absolute",
                right: 14,
                bottom: 12,
                fontFamily: "var(--font-heading)",
                fontSize: 11,
                letterSpacing: ".1em",
                color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
              }}
            >
              {km} KM · {dayCount} DAYS
            </div>
          </div>

          {/* 재생 컨트롤 */}
          <div className="controls">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-icon btn-secondary"
                onClick={() => jumpStop(-1)}
                aria-label="이전 경유지"
                title="이전 경유지"
              >
                <ChevronsLeftIcon size={15} />
              </button>
              <button
                type="button"
                className="btn btn-icon btn-primary"
                onClick={togglePlay}
                aria-label={playing ? "일시정지" : "재생"}
                title={playing ? "일시정지" : "재생"}
              >
                {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
              </button>
              <button
                type="button"
                className="btn btn-icon btn-secondary"
                onClick={() => jumpStop(1)}
                aria-label="다음 경유지"
                title="다음 경유지"
              >
                <ChevronsRightIcon size={15} />
              </button>
            </div>

            <span
              className="text-muted tabular"
              style={{ fontSize: 11.5, flex: "none" }}
            >
              {formatClock(t)} / {formatClock(timeline.duration)}
            </span>

            <div style={{ flex: 1 }}>
              <div
                ref={scrubRef}
                className="scrub"
                role="slider"
                tabIndex={0}
                aria-label="재생 위치"
                aria-valuemin={0}
                aria-valuemax={Math.round(timeline.duration)}
                aria-valuenow={Math.round(t)}
                onPointerDown={onScrubDown}
                onPointerMove={onScrubMove}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") seek(t + 1);
                  if (e.key === "ArrowLeft") seek(t - 1);
                }}
              >
                <div
                  className="scrub-fill"
                  style={{ width: `${(t / timeline.duration) * 100}%` }}
                />
                <div
                  className="scrub-handle"
                  style={{ left: `${(t / timeline.duration) * 100}%` }}
                />
              </div>

              <div className="strip" style={{ overflowX: "auto" }}>
                {stops.map((stop, stopIndex) =>
                  stop.photos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="tick-btn"
                      style={{ minWidth: 54 }}
                      aria-current={stopIndex === pos.activeStopIndex}
                      title={`${formatTime(p.takenAt)} ${stop.name}로 건너뛰기`}
                      onClick={() => {
                        seek(arrivalTime(timeline, stopIndex));
                        setPlaying(false);
                      }}
                    >
                      <img className="plate" src={p.url} alt="" />
                      <p className="tick-cap text-muted">
                        {formatTime(p.takenAt)} {stop.name}
                      </p>
                    </button>
                  )),
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flex: "none" }}>
              <span className="seg">
                {([1, 2] as const).map((s) => (
                  <label key={s} className="seg-opt">
                    <input
                      type="radio"
                      name="speed"
                      checked={speed === s}
                      onChange={() => setSpeed(s)}
                    />
                    {s}×
                  </label>
                ))}
              </span>
            </div>
          </div>
        </div>

        {/* ——— 오른쪽 레일 ——— */}
        <aside className="rail">
          <div>
            <p className="kicker kicker-accent">지금 지나는 곳</p>
            {railPhoto ? (
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
                title="이 장소의 사진 전부 보기"
                onClick={() => setModalStop(pos.activeStopIndex)}
              >
                <img
                  key={railPhoto.id}
                  className="plate rise"
                  src={railPhoto.url}
                  alt={activeStop?.name}
                  style={{ width: "100%", aspectRatio: "4 / 5" }}
                />
              </button>
            ) : (
              <div
                className="ph plate"
                style={{ width: "100%", aspectRatio: "4 / 5" }}
              />
            )}
            <p
              style={{
                margin: "10px 0 2px",
                fontFamily: "var(--font-heading)",
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {activeStop?.name}
            </p>
            <p className="text-muted tabular" style={{ margin: 0, fontSize: 11.5 }}>
              {formatDate(railPhoto?.takenAt)} {formatTime(railPhoto?.takenAt)} ·{" "}
              {formatCoords({
                lat: activeStop?.coords[1],
                lng: activeStop?.coords[0],
              })}
            </p>

            {editingMemo ? (
              <input
                className="input"
                autoFocus
                defaultValue={memo}
                placeholder="한 줄 남기기"
                style={{ marginTop: 10 }}
                onBlur={(e) => {
                  if (activeStop) onMemoChange(activeStop.name, e.currentTarget.value);
                  setEditingMemo(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.currentTarget.value = memo;
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "color-mix(in srgb, var(--color-text) 72%, transparent)",
                }}
              >
                {memo || "한 줄 적어두면 슬라이드에 같이 나와."}{" "}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12.5, padding: "0 4px" }}
                  onClick={() => setEditingMemo(true)}
                >
                  <PencilIcon size={12} />
                  {memo ? "고치기" : "쓰기"}
                </button>
              </p>
            )}
          </div>

          <hr className="hr" style={{ margin: 0 }} />

          <div>
            <p className="kicker">하루씩 건너뛰기</p>
            {days.map((d) => (
              <button
                key={d.n}
                type="button"
                className="row day-row"
                onClick={() => {
                  seek(arrivalTime(timeline, d.stopIndex));
                  setPlaying(false);
                }}
              >
                <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span
                    className="tabular"
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 12,
                      color: "var(--color-accent-700)",
                    }}
                  >
                    {d.n}
                  </span>
                  <span style={{ fontSize: 13 }}>{d.label}</span>
                </span>
                <span className="text-muted tabular" style={{ fontSize: 11 }}>
                  {d.count}장
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {modalStop != null && stops[modalStop] && (
        <PhotoModal stop={stops[modalStop]} onClose={() => setModalStop(null)} />
      )}
    </div>
  );
};
