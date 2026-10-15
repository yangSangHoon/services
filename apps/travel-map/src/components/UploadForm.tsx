import { useCallback, useRef, useState } from "react";
import type { PhotoMeta, PhotoStats, TripStop } from "../types";
import { formatCoords, formatTime } from "../lib/trip";
import { RoutePreview } from "./RoutePreview";
import { CarIcon, CropIcon, PlaneIcon, XIcon } from "./icons";

type Props = {
  travelerPhoto: PhotoMeta | null;
  photos: PhotoMeta[];
  stops: TripStop[];
  stats: PhotoStats;
  dayCount: number;
  status: string;
  building: boolean;
  onTravelerSelected: (file: File) => void | Promise<void>;
  onPhotosSelected: (files: File[]) => void | Promise<void>;
  onRemovePhoto: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onEditPhoto: (id: string, patch: Partial<PhotoMeta>) => void;
  onGenerate: () => void | Promise<void>;
};

const isImage = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|heic)$/i.test(f.name);

const statusTag = (p: PhotoMeta) => {
  if (p.isSample) return { cls: "tag tag-neutral", label: "샘플" };
  if (p.status === "ok") return { cls: "tag tag-accent", label: "확인됨" };
  if (p.status === "no-geo") return { cls: "tag tag-neutral", label: "위치 없음" };
  return { cls: "tag tag-neutral", label: "읽기 실패" };
};

/** The traveler's face riding one of the two vehicles, in the mode preview card. */
const VehicleFace: React.FC<{ url: string | null; mode: "plane" | "car" }> = ({
  url,
  mode,
}) => (
  <div style={{ position: "relative", width: 38, height: 38, flex: "none" }}>
    {url ? (
      <img
        className="plate"
        src={url}
        alt=""
        style={{ width: 38, height: 38, borderRadius: 999, borderWidth: 3 }}
      />
    ) : (
      <div
        className="ph plate"
        style={{ width: 38, height: 38, borderRadius: 999, borderWidth: 3 }}
      />
    )}
    <span
      className="vehicle-badge"
      title={mode === "plane" ? "해외 구간 — 비행기" : "국내 구간 — 자동차"}
    >
      {mode === "plane" ? (
        <PlaneIcon size={9} strokeWidth={2.2} />
      ) : (
        <CarIcon size={9} strokeWidth={2.2} />
      )}
    </span>
  </div>
);

/** Click-to-edit table cell — the itinerary is machine-read, so it must be correctable. */
const EditableCell: React.FC<{
  value: string;
  title: string;
  onCommit: (next: string) => void;
  onEditingChange: (editing: boolean) => void;
}> = ({ value, title, onCommit, onEditingChange }) => {
  const [editing, setEditing] = useState(false);

  const stop = useCallback(
    (next: boolean) => {
      setEditing(next);
      onEditingChange(next);
    },
    [onEditingChange],
  );

  if (!editing) {
    return (
      <button
        type="button"
        className="cell-edit"
        title={title}
        onClick={() => stop(true)}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      className="cell-edit"
      autoFocus
      defaultValue={value}
      onBlur={(e) => {
        onCommit(e.currentTarget.value);
        stop(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
    />
  );
};

export const UploadForm: React.FC<Props> = ({
  travelerPhoto,
  photos,
  stops,
  stats,
  dayCount,
  status,
  building,
  onTravelerSelected,
  onPhotosSelected,
  onRemovePhoto,
  onReorder,
  onEditPhoto,
  onGenerate,
}) => {
  const faceInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [faceOver, setFaceOver] = useState(false);
  const [photosOver, setPhotosOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState(false);

  const dropPhotos = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setPhotosOver(false);
      const files = Array.from(e.dataTransfer.files).filter(isImage);
      if (files.length) void onPhotosSelected(files);
    },
    [onPhotosSelected],
  );

  const dropFace = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setFaceOver(false);
      const file = Array.from(e.dataTransfer.files).filter(isImage)[0];
      if (file) void onTravelerSelected(file);
    },
    [onTravelerSelected],
  );

  const commitTime = useCallback(
    (photo: PhotoMeta, raw: string) => {
      const m = /^(\d{1,2})\s*:\s*(\d{1,2})$/.exec(raw.trim());
      if (!m) return;
      const base = photo.takenAt ? new Date(photo.takenAt) : new Date();
      base.setHours(Number(m[1]), Number(m[2]), 0, 0);
      onEditPhoto(photo.id, { takenAt: base.toISOString() });
    },
    [onEditPhoto],
  );

  const canGenerate = stats.withGeo >= 2 && !building;

  return (
    <div className="screen">
      <header className="screen-head">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span className="brand">여행 지도 만들기</span>
          <span className="text-muted" style={{ fontSize: 12.5 }}>
            사진 속 위치·시간으로 경로를 그려줄게
          </span>
        </div>
        <div className="head-stats">
          <span className="text-muted">
            사진 <span style={{ color: "var(--color-text)" }}>{stats.total}</span>
          </span>
          <span className="text-muted">
            경유지{" "}
            <span style={{ color: "var(--color-accent-700)" }}>{stops.length}</span>
          </span>
          <span className="text-muted">{dayCount}일</span>
        </div>
      </header>

      <div className="upload-body">
        {/* ——— 왼쪽: 업로드 두 단계 ——— */}
        <div className="upload-left">
          <section style={{ padding: "26px 28px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <span className="step-no">01</span>
              <h4 style={{ margin: 0, fontSize: 16 }}>여행자 얼굴</h4>
            </div>
            <p
              className="text-muted"
              style={{
                margin: "0 0 16px",
                fontSize: 12,
                lineHeight: 1.6,
                paddingLeft: 22,
              }}
            >
              비행기·자동차에 태울 사진이야. 얼굴만 원형으로 잘라서 얹을게.
            </p>

            <div
              className={"zone face-zone" + (faceOver ? " is-over" : "")}
              onClick={() => faceInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setFaceOver(true);
              }}
              onDragLeave={() => setFaceOver(false)}
              onDrop={dropFace}
            >
              <div style={{ position: "relative", width: 92, height: 92, flex: "none" }}>
                <div
                  className="pip"
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: 999,
                    background: "var(--color-accent)",
                  }}
                />
                {travelerPhoto ? (
                  <img
                    className="plate"
                    src={travelerPhoto.url}
                    alt="여행자 얼굴 미리보기"
                    style={{
                      position: "relative",
                      width: 92,
                      height: 92,
                      borderRadius: 999,
                      borderWidth: 5,
                    }}
                  />
                ) : (
                  <div
                    className="ph plate"
                    style={{
                      position: "relative",
                      width: 92,
                      height: 92,
                      borderRadius: 999,
                      borderWidth: 5,
                    }}
                  />
                )}
              </div>
              <div>
                <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600 }}>
                  {travelerPhoto ? "얼굴 사진 올렸어" : "얼굴 사진 올리기"}
                </p>
                <p
                  className="text-muted"
                  style={{ margin: "0 0 10px", fontSize: 11.5, lineHeight: 1.55 }}
                >
                  정면, 밝은 사진이 잘 나와.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "6px 12px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      faceInputRef.current?.click();
                    }}
                  >
                    바꾸기
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    disabled
                    title="준비 중 — 지금은 가운데를 원형으로 잘라서 써."
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CropIcon size={13} />
                    자르기
                  </button>
                </div>
              </div>
              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onTravelerSelected(f);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            {/* 이동 수단 미리보기 */}
            <div className="vehicle-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <VehicleFace url={travelerPhoto?.url ?? null} mode="plane" />
                <svg
                  viewBox="0 0 84 20"
                  style={{ width: 84, height: 20, flex: "none" }}
                  aria-hidden="true"
                >
                  <path
                    d="M4 15 C 26 14, 32 5, 56 6 S 78 10, 82 4"
                    fill="none"
                    stroke="var(--color-accent-600)"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                    className="dashy"
                  />
                </svg>
                <VehicleFace url={travelerPhoto?.url ?? null} mode="car" />
              </div>
              <p
                className="text-muted"
                style={{ margin: "9px 0 0", fontSize: 11, lineHeight: 1.55 }}
              >
                해외 구간은 비행기에, 국내 구간은 자동차에 얼굴을 태워서 경로를 달려.
              </p>
            </div>
          </section>

          <hr className="hr" style={{ margin: 0 }} />

          <section style={{ padding: "24px 28px 26px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span className="step-no">02</span>
              <h4 style={{ margin: 0, fontSize: 16 }}>여행 사진</h4>
            </div>

            <div
              className={"zone" + (photosOver ? " is-over" : "")}
              style={{ padding: "30px 16px", textAlign: "center", cursor: "pointer" }}
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setPhotosOver(true);
              }}
              onDragLeave={() => setPhotosOver(false)}
              onDrop={dropPhotos}
            >
              <p
                style={{
                  margin: "0 0 5px",
                  fontFamily: "var(--font-heading)",
                  fontSize: 19,
                  fontWeight: 600,
                }}
              >
                여기로 끌어다 놔
              </p>
              <p className="text-muted" style={{ margin: 0, fontSize: 11.5 }}>
                원본 파일 · 여러 장 한꺼번에
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).filter(isImage);
                  if (files.length) void onPhotosSelected(files);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              <div className="count-row">
                <span>위치 정보 있음</span>
                <span className="tabular" style={{ color: "var(--color-accent-700)" }}>
                  {stats.withGeo}장
                </span>
              </div>
              <div className="count-row">
                <span className="text-muted">위치 없음</span>
                <span className="text-muted tabular">{stats.withoutGeo}장</span>
              </div>
              <div className="count-row">
                <span className="text-muted">쓸 수 없는 파일</span>
                <span className="text-muted tabular">{stats.unsupported}장</span>
              </div>
            </div>

            <p
              className="text-muted"
              style={{ margin: "16px 0 0", fontSize: 11.5, lineHeight: 1.6 }}
            >
              카톡·인스타로 받은 사진은 위치가 지워져 있어. 앨범 원본을 올려줘.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 22, fontSize: 15, padding: 12 }}
              disabled={!canGenerate}
              title={
                stats.withGeo < 2 ? "위치 정보가 있는 사진이 2장 이상 필요해." : undefined
              }
              onClick={() => void onGenerate()}
            >
              {building ? "만드는 중…" : "애니메이션 만들기 →"}
            </button>
            {status && (
              <p
                className="text-muted"
                style={{ margin: "10px 0 0", fontSize: 11.5, lineHeight: 1.6 }}
              >
                {status}
              </p>
            )}
          </section>
        </div>

        {/* ——— 오른쪽: 읽어낸 여정 ——— */}
        <div style={{ padding: "26px 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h4 style={{ margin: 0, fontSize: 16 }}>읽어낸 여정</h4>
            <span className="text-muted" style={{ fontSize: 11 }}>
              줄을 끌어서 순서 바꾸기
            </span>
          </div>

          <table className="table trip-table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>사진</th>
                <th style={{ textAlign: "left" }}>시간</th>
                <th style={{ textAlign: "left" }}>장소</th>
                <th style={{ textAlign: "left" }}>좌표</th>
                <th style={{ textAlign: "left" }}>상태</th>
                <th aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {photos.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted" style={{ padding: "26px 8px" }}>
                    아직 사진이 없어. 왼쪽에서 여행 사진을 올리면 여기에 시간순으로 정리돼.
                  </td>
                </tr>
              )}
              {photos.map((p) => {
                const tag = statusTag(p);
                return (
                  <tr
                    key={p.id}
                    className={
                      "row" +
                      (dragId === p.id ? " dragging" : "") +
                      (overId === p.id && dragId !== p.id ? " drop-target" : "")
                    }
                    draggable={!editingCell}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      setOverId(p.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId && dragId !== p.id) onReorder(dragId, p.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                  >
                    <td style={{ width: 52 }}>
                      <img
                        className="plate"
                        src={p.url}
                        alt=""
                        style={{ width: 38, height: 38, borderWidth: 3 }}
                      />
                    </td>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}>
                      <EditableCell
                        value={formatTime(p.takenAt)}
                        title="클릭해서 시각 고치기 (HH:MM)"
                        onCommit={(next) => commitTime(p, next)}
                        onEditingChange={setEditingCell}
                      />
                    </td>
                    <td>
                      <EditableCell
                        value={
                          p.place ?? (p.status === "ok" ? "조회 중…" : "장소 지정하기")
                        }
                        title="클릭해서 장소 이름 고치기"
                        onCommit={(next) =>
                          onEditPhoto(p.id, { place: next.trim() || undefined })
                        }
                        onEditingChange={setEditingCell}
                      />
                    </td>
                    <td className="text-muted tabular" style={{ whiteSpace: "nowrap" }}>
                      {formatCoords(p)}
                    </td>
                    <td>
                      <span className={tag.cls} style={{ fontSize: 10 }}>
                        {tag.label}
                      </span>
                    </td>
                    <td style={{ width: 28 }}>
                      <button
                        type="button"
                        className="thumb-remove"
                        aria-label="이 사진 빼기"
                        title="이 사진 빼기"
                        onClick={() => onRemovePhoto(p.id)}
                      >
                        <XIcon size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid var(--color-divider)",
            }}
          >
            <p className="kicker">움직임 미리보기</p>
            <RoutePreview stops={stops} facePhotoUrl={travelerPhoto?.url ?? null} />
            <p
              className="text-muted"
              style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.6 }}
            >
              {stops.length >= 2
                ? `${stops.map((s) => s.name).join(" → ")} 순으로 네 얼굴이 따라 이동하고, 도착할 때마다 그 장소 사진이 슬라이드로 떠.`
                : "위치 정보가 있는 사진이 2장 이상이면 경로가 그려져."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
