import { MAP } from './map';
import { RES_EMOJI, isCity, owner, pips, type State } from './game';

export const COLORS = ['var(--p0)', 'var(--p1)', 'var(--p2)', 'var(--p3)'];

const TERRAIN_EMOJI = { ...RES_EMOJI, desert: '🏜️' };
const HARBOR_LABEL = (h: string) => (h === 'any' ? '3:1' : `${RES_EMOJI[h as keyof typeof RES_EMOJI]}2:1`);

export type Pick = { kind: 'vertex'; ids: number[] } | { kind: 'edge'; ids: number[] } | { kind: 'hex'; ids: number[] } | null;

type Props = {
  state: State;
  pick: Pick;
  onPick: (id: number) => void;
};

const hexPoints = (x: number, y: number, r = 1) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 90) * Math.PI) / 180;
    return `${(x + Math.cos(a) * r).toFixed(3)},${(y + Math.sin(a) * r).toFixed(3)}`;
  }).join(' ');

/** 바다 쪽으로 밀어낸 항구 위치 */
const harborPos = (e: number) => {
  const { x, y } = MAP.edges[e];
  const d = Math.hypot(x, y);
  return { x: x + (x / d) * 0.55, y: y + (y / d) * 0.55 };
};

export default function Board({ state: s, pick, onPick }: Props) {
  const lastDice = s.dice ? s.dice[0] + s.dice[1] : 0;

  return (
    <svg className="board" viewBox="-5.3 -5 10.6 10" role="img" aria-label="섬 지도">
      <defs>
        <radialGradient id="sea" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--sea-hi)" />
          <stop offset="100%" stopColor="var(--sea)" />
        </radialGradient>
      </defs>
      <polygon className="island-shadow" points={hexPoints(0, 0, 5.15)} transform="rotate(30)" fill="url(#sea)" />

      {/* 항구 */}
      {MAP.harbors.map((e, i) => {
        const { a, b } = MAP.edges[e];
        const h = harborPos(e);
        return (
          <g key={e} className="harbor">
            {[a, b].map((v) => (
              <line key={v} x1={h.x} y1={h.y} x2={MAP.vertices[v].x} y2={MAP.vertices[v].y} />
            ))}
            <circle cx={h.x} cy={h.y} r={0.36} />
            <text x={h.x} y={h.y + 0.1} className="harbor-text">
              {HARBOR_LABEL(s.harbors[i])}
            </text>
          </g>
        );
      })}

      {/* 땅 */}
      {MAP.hexes.map((h, i) => {
        const t = s.terrain[i];
        const n = s.nums[i];
        const hot = n && n === lastDice && s.phase.k !== 'setup';
        return (
          <g key={i} className={`hex t-${t} ${hot ? 'is-hot' : ''}`}>
            <polygon points={hexPoints(h.x, h.y, 0.97)} />
            <text x={h.x} y={h.y - 0.38} className="hex-emoji">
              {TERRAIN_EMOJI[t]}
            </text>
            {n > 0 && (
              <g className={`token ${n === 6 || n === 8 ? 'is-red' : ''}`}>
                <circle cx={h.x} cy={h.y + 0.28} r={0.34} />
                <text x={h.x} y={h.y + 0.36}>
                  {n}
                </text>
                <text x={h.x} y={h.y + 0.53} className="pips">
                  {'•'.repeat(pips(n))}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 도적 */}
      <g className="robber" style={{ transform: `translate(${MAP.hexes[s.robber].x + 0.45}px, ${MAP.hexes[s.robber].y - 0.1}px)` }}>
        <ellipse cx={0} cy={0.28} rx={0.2} ry={0.07} className="robber-shadow" />
        <path d="M-0.14 0.28 L-0.1 -0.05 A0.13 0.13 0 1 1 0.1 -0.05 L0.14 0.28 Z" />
      </g>

      {/* 길 */}
      {s.roads.map((p, e) => {
        if (p < 0) return null;
        const { a, b } = MAP.edges[e];
        const A = MAP.vertices[a];
        const B = MAP.vertices[b];
        const k = 0.18;
        return (
          <g key={e} className="road">
            <line
              className="road-outline"
              x1={A.x + (B.x - A.x) * k}
              y1={A.y + (B.y - A.y) * k}
              x2={B.x - (B.x - A.x) * k}
              y2={B.y - (B.y - A.y) * k}
            />
            <line
              x1={A.x + (B.x - A.x) * k}
              y1={A.y + (B.y - A.y) * k}
              x2={B.x - (B.x - A.x) * k}
              y2={B.y - (B.y - A.y) * k}
              stroke={COLORS[p]}
            />
          </g>
        );
      })}

      {/* 건물 */}
      {s.build.map((b, v) => {
        if (b < 0) return null;
        const { x, y } = MAP.vertices[v];
        return (
          <g key={v} className="building" transform={`translate(${x} ${y})`}>
            {isCity(b) ? (
              <path d="M-0.3 0.2 V-0.08 L-0.15 -0.22 L0 -0.08 V-0.02 H0.3 V0.2 Z" fill={COLORS[owner(b)]} />
            ) : (
              <path d="M-0.18 0.16 V-0.05 L0 -0.22 L0.18 -0.05 V0.16 Z" fill={COLORS[owner(b)]} />
            )}
          </g>
        );
      })}

      {/* 고를 수 있는 곳 */}
      {pick?.kind === 'hex' &&
        pick.ids.map((i) => (
          <polygon key={i} className="pick-hex" points={hexPoints(MAP.hexes[i].x, MAP.hexes[i].y, 0.9)} onClick={() => onPick(i)} />
        ))}
      {pick?.kind === 'edge' &&
        pick.ids.map((e) => {
          const { a, b } = MAP.edges[e];
          const A = MAP.vertices[a];
          const B = MAP.vertices[b];
          return (
            <g key={e} className="pick-edge" onClick={() => onPick(e)}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="pick-hit" />
              <line x1={A.x + (B.x - A.x) * 0.2} y1={A.y + (B.y - A.y) * 0.2} x2={B.x - (B.x - A.x) * 0.2} y2={B.y - (B.y - A.y) * 0.2} className="pick-mark" />
            </g>
          );
        })}
      {pick?.kind === 'vertex' &&
        pick.ids.map((v) => (
          <g key={v} className="pick-vertex" onClick={() => onPick(v)}>
            <circle cx={MAP.vertices[v].x} cy={MAP.vertices[v].y} r={0.32} className="pick-hit" />
            <circle cx={MAP.vertices[v].x} cy={MAP.vertices[v].y} r={0.13} className="pick-mark" />
          </g>
        ))}
    </svg>
  );
}
