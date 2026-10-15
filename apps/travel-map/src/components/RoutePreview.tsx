import { useMemo } from "react";
import type { TripStop } from "../types";
import { projectToBox, smoothPath } from "../lib/trip";

type Props = {
  stops: TripStop[];
  facePhotoUrl: string | null;
};

const W = 620;
const H = 150;

/**
 * The “움직임 미리보기” diagram: a schematic of the route the animation will
 * follow, redrawn whenever photos are added or re-ordered.
 */
export const RoutePreview: React.FC<Props> = ({ stops, facePhotoUrl }) => {
  const points = useMemo(
    () => projectToBox(stops.map((s) => s.coords), W, H, 42, 26),
    [stops],
  );
  const d = useMemo(() => smoothPath(points), [points]);

  const markerIndex = Math.max(0, Math.floor((points.length - 1) / 2));
  const marker = points[markerIndex];

  return (
    <div
      style={{
        position: "relative",
        height: H,
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--color-surface)",
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        role="img"
        aria-label={
          stops.length
            ? `경로 미리보기: ${stops.map((s) => s.name).join(" → ")}`
            : "경로 미리보기"
        }
      >
        <g stroke="color-mix(in srgb, var(--color-text) 8%, transparent)" strokeWidth={1}>
          <path d="M0 40h620M0 78h620M0 116h620M120 0v150M260 0v150M400 0v150M520 0v150" />
        </g>

        {points.length >= 2 && (
          <path
            key={d}
            d={d}
            pathLength={1400}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray={1400}
            className="drawn"
          />
        )}

        <g fill="var(--color-bg)" stroke="var(--color-accent-700)" strokeWidth={1.3}>
          {points.map((p, i) => (
            <circle key={`c-${i}`} cx={p.x} cy={p.y} r={4} />
          ))}
        </g>

        <g
          fontFamily="var(--font-body)"
          fontSize={9}
          fill="color-mix(in srgb, var(--color-text) 55%, transparent)"
        >
          {points.map((p, i) => (
            <text
              key={`t-${i}`}
              x={p.x}
              y={i % 2 === 0 ? p.y + 15 : p.y - 9}
              textAnchor="middle"
            >
              {stops[i].name}
            </text>
          ))}
        </g>
      </svg>

      {marker && (
        <div
          style={{
            position: "absolute",
            left: `${(marker.x / W) * 100}%`,
            top: `${(marker.y / H) * 100}%`,
            width: 38,
            height: 38,
            marginLeft: -19,
            marginTop: -19,
          }}
        >
          {facePhotoUrl ? (
            <img
              className="plate"
              src={facePhotoUrl}
              alt=""
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                borderWidth: 3,
              }}
            />
          ) : (
            <div
              className="ph plate"
              style={{ width: 38, height: 38, borderRadius: 999, borderWidth: 3 }}
            />
          )}
        </div>
      )}

      {stops.length === 0 && (
        <p
          className="text-muted"
          style={{
            position: "absolute",
            inset: 0,
            margin: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          사진을 올리면 여기에 경로가 그려져.
        </p>
      )}
    </div>
  );
};
