import { useRef, type PointerEvent } from 'react';
import { CARDS, N, goalRow, parseWall, stepMoves, cardMoves, type Cell, type Orient, type Player, type State } from './game';

/** 보드 좌표(viewBox 단위). 칸 10, 홈 2.6 */
const CELL = 10;
const GAP = 2.6;
const S = CELL + GAP;
export const SIZE = N * CELL + (N - 1) * GAP;

export type Ghost = { o: Orient; r: number; c: number; ok: boolean } | null;

export type BoardProps = {
  state: State;
  /** 1번 플레이어 시점이면 판을 180° 돌려서 내 말이 아래에 오게 */
  flip: boolean;
  mode: 'move' | 'wall' | 'ult';
  active: boolean;
  ghost: Ghost;
  onCell: (r: number, c: number) => void;
  onAim: (o: Orient, r: number, c: number) => void;
};

export default function Board({ state, flip, mode, active, ghost, onCell, onAim }: BoardProps) {
  const svg = useRef<SVGSVGElement>(null);
  const pressed = useRef(false);

  const cr = (r: number) => (flip ? N - 1 - r : r);
  const wr = (r: number) => (flip ? N - 2 - r : r);

  const point = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * SIZE, ((e.clientY - box.top) / box.height) * SIZE] as const;
  };

  /** 손가락 위치에서 가장 가까운 홈을 골라 벽 자리로 바꾼다 */
  const aim = (e: PointerEvent) => {
    const [x, y] = point(e);
    const near = (v: number) => {
      const i = Math.min(N - 2, Math.max(0, Math.round((v + GAP / 2) / S) - 1));
      return { i, d: Math.abs(v - ((i + 1) * S - GAP / 2)) };
    };
    const row = near(y);
    const col = near(x);
    const o: Orient = row.d <= col.d ? 'h' : 'v';
    onAim(o, wr(row.i), wr(col.i));
  };

  const down = (e: PointerEvent) => {
    if (!active) return;
    if (mode === 'wall') {
      pressed.current = true;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      aim(e);
      return;
    }
    const [x, y] = point(e);
    const vc = Math.min(N - 1, Math.floor(x / S));
    const vr = Math.min(N - 1, Math.floor(y / S));
    onCell(cr(vr), cr(vc));
  };

  const targets: Cell[] =
    !active || state.winner !== null ? [] : mode === 'move' ? stepMoves(state) : mode === 'ult' ? cardMoves(state) : [];
  const last = state.last;

  const wallRect = (o: Orient, r: number, c: number) => {
    const vr = wr(r);
    const vc = wr(c);
    return o === 'h'
      ? { x: vc * S, y: (vr + 1) * S - GAP, width: 2 * CELL + GAP, height: GAP }
      : { x: (vc + 1) * S - GAP, y: vr * S, width: GAP, height: 2 * CELL + GAP };
  };

  return (
    <svg
      ref={svg}
      className={`board ${active ? 'is-active' : ''} mode-${mode}`}
      viewBox={`${-GAP} ${-GAP} ${SIZE + 2 * GAP} ${SIZE + 2 * GAP}`}
      onPointerDown={down}
      onPointerMove={(e) => pressed.current && aim(e)}
      onPointerUp={() => (pressed.current = false)}
      onPointerCancel={() => (pressed.current = false)}
      role="img"
      aria-label="쿼리도 판"
    >
      <rect className="board-bg" x={-GAP} y={-GAP} width={SIZE + 2 * GAP} height={SIZE + 2 * GAP} rx={3} />
      {Array.from({ length: N * N }, (_, i) => {
        const r = Math.floor(i / N);
        const c = i % N;
        const goal = r === goalRow(0) ? 'goal-0' : r === goalRow(1) ? 'goal-1' : '';
        return <rect key={i} className={`cell ${goal}`} x={cr(c) * S} y={cr(r) * S} width={CELL} height={CELL} rx={1.6} />;
      })}

      {last?.t === 'move' && (
        <rect className="last-cell" x={cr(last.c) * S} y={cr(last.r) * S} width={CELL} height={CELL} rx={1.6} />
      )}

      {(state.spots ?? []).map(([r, c]) => (
        <text key={`s${r}${c}`} className="spot" x={cr(c) * S + CELL / 2} y={cr(r) * S + CELL / 2} textAnchor="middle" dominantBaseline="central">
          🎁
        </text>
      ))}

      {targets.map(([r, c]) => (
        <circle key={`${r}${c}`} className={`target p${state.turn} ${mode === 'ult' ? (CARDS[state.card?.k ?? 'jump'].tone === 'bad' ? 'is-curse' : 'is-ult') : ''}`} cx={cr(c) * S + CELL / 2} cy={cr(r) * S + CELL / 2} r={1.9} />
      ))}

      {state.walls.map((w) => {
        const { o, r, c, p } = parseWall(w);
        const isLast = last?.t === 'wall' && last.o === o && last.r === r && last.c === c;
        return <rect key={w} className={`wall p${p} ${isLast ? 'is-new' : ''}`} rx={1} {...wallRect(o, r, c)} />;
      })}

      {ghost && <rect className={`ghost ${ghost.ok ? 'ok' : 'bad'}`} rx={1} {...wallRect(ghost.o, ghost.r, ghost.c)} />}

      {([0, 1] as Player[]).map((p) => {
        const [r, c] = state.pawns[p];
        return (
          <g
            key={p}
            className={`pawn p${p} ${last?.t === 'move' && last.ult && last.r === r && last.c === c ? 'is-ult' : ''} ${state.turn === p && state.winner === null ? 'is-turn' : ''} ${state.winner === p ? 'is-winner' : ''}`}
            style={{ transform: `translate(${cr(c) * S + CELL / 2}px, ${cr(r) * S + CELL / 2}px)` }}
          >
            <circle className="pawn-ring" r={4.6} />
            <circle className="pawn-body" r={3.5} />
          </g>
        );
      })}
    </svg>
  );
}
