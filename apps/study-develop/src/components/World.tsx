import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { levelMeta, MAX_LEVEL } from '../data/levels';
import { itemById } from '../data/shop';
import {
  buildGrid, COLS, DECOR, doorOf, findPath, MENTOR, PLACES, ROWS, SIGN, START, WANDERERS, type RoomId,
} from '../data/world';
import { setPos, today, type Save } from '../store';
import { sfx } from '../sound';
import { Avatar } from './Avatar';

type P = { x: number; y: number };

interface Props {
  save: Save;
  active: boolean;
  onEnter: (room: RoomId) => void;
  onMentor: () => void;
}

const STEP_MS = 130;

export function World({ save, active, onEnter, onMentor }: Props) {
  const grid = useMemo(buildGrid, []);
  const initial = grid[save.pos.y]?.[save.pos.x] ? save.pos : START;
  const [pos, setPosState] = useState<P>(initial);
  const [pet, setPet] = useState<P>(initial);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [target, setTarget] = useState<P | null>(null);
  const [walkers, setWalkers] = useState(() => WANDERERS.map((w) => ({ ...w })));
  const [bubble, setBubble] = useState<{ id: string; text: string } | null>(null);
  const [tile, setTile] = useState(48);
  const [view, setView] = useState({ w: 360, h: 600 });
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const path = useRef<P[]>([]);
  const posRef = useRef(pos);
  const afterArrive = useRef<null | (() => void)>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // 뷰포트 크기 → 타일 크기
  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setView({ w, h });
      setTile(w < 520 ? 40 : w < 900 ? 46 : 52);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** 한 칸 이동. 문에 닿으면 입장 */
  const stepTo = (n: P) => {
    const cur = posRef.current;
    if (n.x !== cur.x) setFacing(n.x > cur.x ? 1 : -1);
    setPet(cur);
    posRef.current = n;
    setPosState(n);
    sfx('step');
    const place = PLACES.find((p) => {
      const d = doorOf(p);
      return d.x === n.x && d.y === n.y;
    });
    if (place) {
      path.current = [];
      setTarget(null);
      afterArrive.current = null;
      // 나올 때는 문 아래 칸에 서 있게
      const out = { x: n.x, y: n.y + 1 };
      setTimeout(() => {
        posRef.current = out;
        setPosState(out);
        setPet(n);
        setPos(out.x, out.y);
        sfx('open');
        onEnter(place.id);
      }, STEP_MS);
      return;
    }
    setPos(n.x, n.y);
  };

  // 경로 따라 걷기
  useEffect(() => {
    const t = setInterval(() => {
      if (!activeRef.current) return;
      const next = path.current.shift();
      if (next) {
        stepTo(next);
        if (!path.current.length) {
          setTarget(null);
          const cb = afterArrive.current;
          afterArrive.current = null;
          cb?.();
        }
      }
    }, STEP_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 키보드
  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const d: Record<string, P> = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
      };
      const dir = d[e.key];
      if (dir) {
        e.preventDefault();
        const now = performance.now();
        if (now - last < STEP_MS - 10) return;
        last = now;
        path.current = [];
        setTarget(null);
        const cur = posRef.current;
        const n = { x: cur.x + dir.x, y: cur.y + dir.y };
        if (n.x === MENTOR.x && n.y === MENTOR.y) return onMentor();
        if (grid[n.y]?.[n.x]) stepTo(n);
        else {
          // 건물 벽에 부딪히면 그 건물 문으로 안내
          const p = PLACES.find((pl) => n.x >= pl.x && n.x < pl.x + pl.w && n.y >= pl.y && n.y < pl.y + pl.h);
          if (p) walkTo(doorOf(p));
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && near(posRef.current, MENTOR)) {
        e.preventDefault();
        onMentor();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 돌아다니는 학생들
  useEffect(() => {
    const t = setInterval(() => {
      setWalkers((ws) =>
        ws.map((w) => {
          if (Math.random() < 0.55) return w;
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
          const nx = w.x + dx;
          const ny = w.y + dy;
          const isDoor = PLACES.some((p) => doorOf(p).x === nx && doorOf(p).y === ny);
          if (!grid[ny]?.[nx] || isDoor) return w;
          return { ...w, x: nx, y: ny };
        }),
      );
    }, 900);
    const b = setInterval(() => {
      const w = WANDERERS[Math.floor(Math.random() * WANDERERS.length)];
      setBubble({ id: w.id, text: w.lines[Math.floor(Math.random() * w.lines.length)] });
    }, 5200);
    return () => {
      clearInterval(t);
      clearInterval(b);
    };
  }, [grid]);

  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 3000);
    return () => clearTimeout(t);
  }, [bubble]);

  function walkTo(to: P, then?: () => void) {
    const p = findPath(grid, posRef.current, to);
    if (!p) return;
    if (!p.length) {
      then?.();
      return;
    }
    path.current = p;
    afterArrive.current = then ?? null;
    setTarget(to);
  }

  const onTap = (e: React.PointerEvent) => {
    if (!active || !worldRef.current) return;
    const r = worldRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / tile);
    const y = Math.floor((e.clientY - r.top) / tile);
    const place = PLACES.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (place) return walkTo(doorOf(place));
    if (Math.abs(x - MENTOR.x) + Math.abs(y - MENTOR.y) <= 0 || (x === MENTOR.x && y === MENTOR.y - 1)) {
      if (near(posRef.current, MENTOR)) return onMentor();
      const spot = [[0, 1], [1, 0], [-1, 0], [0, -1]]
        .map(([dx, dy]) => ({ x: MENTOR.x + dx, y: MENTOR.y + dy }))
        .filter((s) => grid[s.y][s.x])
        .sort((a, b) => dist(a, posRef.current) - dist(b, posRef.current))[0];
      return walkTo(spot, onMentor);
    }
    const w = walkers.find((wk) => wk.x === x && wk.y === y);
    if (w) setBubble({ id: w.id, text: w.lines[Math.floor(Math.random() * w.lines.length)] });
    if (x === SIGN.x && y === SIGN.y) setBubble({ id: 'sign', text: SIGN.text });
    if (grid[y]?.[x]) walkTo({ x, y });
  };

  // 카메라: 플레이어 중심, 맵 밖은 안 보이게
  const worldW = COLS * tile;
  const worldH = ROWS * tile;
  const cam = (center: number, size: number, world: number) =>
    world <= size ? (size - world) / 2 : Math.min(0, Math.max(size - world, size / 2 - center));
  const camX = cam(pos.x * tile + tile / 2, view.w, worldW);
  const camY = cam(pos.y * tile + tile / 2, view.h, worldH);

  const petEmoji = save.equipped.pet ? itemById(save.equipped.pet)?.emoji : undefined;
  const at = (p: P) => ({ transform: `translate(${p.x * tile}px, ${p.y * tile}px)`, width: tile, height: tile });
  const ready = save.level < MAX_LEVEL && save.xp >= levelMeta(save.level).xpToExam;

  return (
    <div className="viewport" ref={viewRef}>
      <div
        className="world"
        ref={worldRef}
        onPointerDown={onTap}
        style={{ width: worldW, height: worldH, transform: `translate(${camX}px, ${camY}px)`, ['--tile' as string]: `${tile}px` }}
      >
        <div className="road road-h" style={{ top: 4 * tile, height: 3 * tile, left: tile, width: worldW - 2 * tile }} />
        <div className="road road-h" style={{ top: 10 * tile, height: 3 * tile, left: tile, width: worldW - 2 * tile }} />
        {Array.from({ length: COLS }).map((_, x) => (
          <span key={`t${x}`} className="border-tree" style={at({ x, y: 0 })}>🌲</span>
        ))}
        {Array.from({ length: COLS }).map((_, x) => (
          <span key={`b${x}`} className="border-tree" style={at({ x, y: ROWS - 1 })}>🌳</span>
        ))}
        {Array.from({ length: ROWS - 2 }).map((_, i) => (
          <span key={`l${i}`} className="border-tree" style={at({ x: 0, y: i + 1 })}>🌲</span>
        ))}
        {Array.from({ length: ROWS - 2 }).map((_, i) => (
          <span key={`r${i}`} className="border-tree" style={at({ x: COLS - 1, y: i + 1 })}>🌲</span>
        ))}

        {PLACES.map((p) => {
          const d = doorOf(p);
          const badge =
            (p.id === 'reward' && save.pendingRewards.length > 0) ||
            (p.id === 'exam' && ready) ||
            (p.id === 'cafe' && save.dailyDone !== today());
          return (
            <div key={p.id}>
              <div
                className={`building b-${p.id}`}
                style={{ left: p.x * tile, top: p.y * tile, width: p.w * tile, height: p.h * tile, ['--c' as string]: p.color }}
              >
                <span className="building-emoji">{p.emoji}</span>
                <span className="building-name">{p.name}</span>
                <span className="building-desc">{p.desc}</span>
                {badge && <span className="building-badge">!</span>}
              </div>
              <span className="door" style={at(d)}>🚪</span>
            </div>
          );
        })}

        {DECOR.map((d, i) => (
          <span key={i} className="decor" style={at(d)}>{d.emoji}</span>
        ))}

        <div className="npc mentor" style={at(MENTOR)}>
          <span className="npc-name">{MENTOR.name}</span>
          <span className="npc-body">{MENTOR.emoji}</span>
          <span className="npc-talk">💬</span>
        </div>

        {walkers.map((w) => (
          <div key={w.id} className="npc walker" style={at(w)}>
            <span className="npc-name">{w.name}</span>
            <span className="npc-body">{w.emoji}</span>
            {bubble?.id === w.id && <span className="bubble">{bubble.text}</span>}
          </div>
        ))}
        {bubble?.id === 'sign' && (
          <div className="npc" style={at(SIGN)}>
            <span className="bubble wide">{SIGN.text}</span>
          </div>
        )}

        {target && <span className="target" style={at(target)} />}
        {petEmoji && (
          <span className="pet" style={at(pet)}>{petEmoji}</span>
        )}
        <div className="player" style={at(pos)}>
          <span className="npc-name me">{save.name || '나'} · Lv.{Math.min(save.level, 10)}</span>
          <span className={`player-body ${facing < 0 ? 'flip' : ''}`}>
            <Avatar save={save} />
          </span>
        </div>
      </div>
    </div>
  );
}

const near = (a: P, b: P) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const dist = (a: P, b: P) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
