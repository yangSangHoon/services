import { useCallback, useEffect, useState } from "react";
import type { TripStop } from "../types";
import { formatDate, formatTime } from "../lib/trip";
import { ChevronsLeftIcon, ChevronsRightIcon, MapPinIcon, XIcon } from "./icons";

type Props = {
  stop: TripStop;
  onClose: () => void;
};

export const PhotoModal: React.FC<Props> = ({ stop, onClose }) => {
  const [index, setIndex] = useState(0);
  const total = stop.photos.length;
  const hasMultiple = total > 1;

  const next = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && total > 1) next();
      else if (e.key === "ArrowLeft" && total > 1) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, total]);

  const current = stop.photos[index];

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        style={{ width: "min(720px, 100%)", background: "var(--color-bg)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${stop.name} 사진`}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span
            className="dialog-title"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <MapPinIcon size={15} />
            {stop.name}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            aria-label="닫기"
            title="닫기 (Esc)"
          >
            <XIcon size={15} />
          </button>
        </div>

        {!current ? (
          <p className="dialog-body" style={{ margin: 0 }}>
            이 장소에 붙은 사진이 없어.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {hasMultiple && (
                <button
                  type="button"
                  className="btn btn-icon btn-secondary"
                  onClick={prev}
                  aria-label="이전 사진"
                  title="이전 (←)"
                >
                  <ChevronsLeftIcon size={15} />
                </button>
              )}
              <img
                className="plate"
                src={current.url}
                alt=""
                style={{
                  flex: 1,
                  minWidth: 0,
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "contain",
                  background: "var(--color-surface)",
                }}
              />
              {hasMultiple && (
                <button
                  type="button"
                  className="btn btn-icon btn-secondary"
                  onClick={next}
                  aria-label="다음 사진"
                  title="다음 (→)"
                >
                  <ChevronsRightIcon size={15} />
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span className="text-muted tabular" style={{ fontSize: 11.5 }}>
                {formatDate(current.takenAt)} {formatTime(current.takenAt)}
              </span>
              <span className="text-muted tabular" style={{ fontSize: 11.5 }}>
                {index + 1} / {total}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
