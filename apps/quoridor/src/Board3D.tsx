import { Line, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, MathUtils, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { N, goalRow, parseWall, pawnMoves, cardMoves, type Cell, type Orient, type Player } from './game';
import type { BoardProps } from './Board';

/** 보드 좌표(월드 단위). SVG 판과 같은 칸 10, 홈 2.6 — 판 가운데가 원점, 화면 아래쪽이 +z */
const CELL = 10;
const GAP = 2.6;
const S = CELL + GAP;
const SIZE = N * CELL + (N - 1) * GAP;
const HALF = SIZE / 2;
const TOP = 1.2; // 칸 윗면 높이
const WALL_H = 7;
/** 카메라가 판을 내려다보는 각도(수평 기준) — 2.5D 느낌 */
const TILT = MathUtils.degToRad(50);

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 보드 좌표(행·열, 화면 기준) → 월드 x/z */
const at = (v: number) => v * S + CELL / 2 - HALF;

type Palette = Record<'board' | 'cell' | 'p0' | 'p1' | 'ok' | 'bad' | 'fg', string>;

/** 다크 모드도 따라가도록 CSS 변수에서 색을 읽는다 */
function usePalette(): Palette {
  const read = (): Palette => {
    const css = getComputedStyle(document.documentElement);
    const v = (k: string, d: string) => css.getPropertyValue(`--${k}`).trim() || d;
    return { board: v('board', '#a7743f'), cell: v('cell', '#f0d9b0'), p0: v('p0', '#2f6bf0'), p1: v('p1', '#f0702f'), ok: v('ok', '#24a35a'), bad: v('bad', '#e0433b'), fg: v('fg', '#2a2118') };
  };
  const [pal, setPal] = useState(read);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setPal(read());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return pal;
}

const mix = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString();

export default function Board3D(props: BoardProps) {
  const { active, mode } = props;
  return (
    <div className={`board board3d ${active ? 'is-active' : ''} mode-${mode}`} role="img" aria-label="쿼리도 판">
      <Canvas orthographic flat shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ near: 1, far: 1000 }}>
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

function Scene({ state, flip, mode, active, ghost, onCell, onAim }: BoardProps) {
  const pal = usePalette();
  const pressed = useRef(false);
  const { size, camera } = useThree();

  // 판 전체(높이 포함)가 캔버스에 꼭 맞게 확대 비율 계산
  const spanX = SIZE + 2 * GAP + 6;
  const spanY = (SIZE + 2 * GAP) * Math.sin(TILT) + 14 * Math.cos(TILT) + 8;
  const zoom = Math.min(size.width / spanX, size.height / spanY);
  const dist = 200;
  useLayoutEffect(() => {
    camera.position.set(0, Math.sin(TILT) * dist, Math.cos(TILT) * dist);
    camera.zoom = zoom;
    camera.lookAt(0, 2, 2);
    camera.updateProjectionMatrix();
  }, [camera, zoom]);

  const cr = (r: number) => (flip ? N - 1 - r : r);
  const wr = (r: number) => (flip ? N - 2 - r : r);

  // 바닥 평면에 닿은 점 → SVG 판과 같은 (x, y) 좌표
  const point = (e: ThreeEvent<PointerEvent>) => [e.point.x + HALF, e.point.z + HALF] as const;

  const aim = (e: ThreeEvent<PointerEvent>) => {
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

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!active) return;
    e.stopPropagation();
    if (mode === 'wall') {
      pressed.current = true;
      (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
      aim(e);
      return;
    }
    const [x, y] = point(e);
    if (x < -GAP || y < -GAP || x > SIZE + GAP || y > SIZE + GAP) return;
    const vc = Math.min(N - 1, Math.max(0, Math.floor(x / S)));
    const vr = Math.min(N - 1, Math.max(0, Math.floor(y / S)));
    onCell(cr(vr), cr(vc));
  };

  useEffect(() => {
    const up = () => (pressed.current = false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const targets: Cell[] =
    !active || state.winner !== null ? [] : mode === 'move' ? pawnMoves(state) : mode === 'ult' ? cardMoves(state) : [];
  const last = state.last;
  const targetColor = mode === 'ult' ? (state.card?.k === 'back' ? '#7c3aed' : '#ffb703') : pal[`p${state.turn}` as 'p0' | 'p1'];

  const wallPos = (o: Orient, r: number, c: number) => {
    const vr = wr(r);
    const vc = wr(c);
    // 벽은 홈 교차점(오른쪽 아래 모서리)을 중심으로 칸 두 개 길이
    const x = (vc + 1) * S - GAP / 2 - HALF;
    const z = (vr + 1) * S - GAP / 2 - HALF;
    return { x, z, rot: o === 'v' ? Math.PI / 2 : 0 };
  };

  const goalColors = useMemo(
    () => ({ 0: mix(pal.cell, pal.p0, 0.42), 1: mix(pal.cell, pal.p1, 0.42) }) as Record<Player, string>,
    [pal],
  );

  return (
    <>
      <hemisphereLight args={['#fff6e8', '#8a6a48', 1.6]} />
      <directionalLight
        castShadow
        position={[-40, 120, 60]}
        intensity={1.4}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0005}
      />

      {/* 나무 판 */}
      <RoundedBox args={[SIZE + 2 * GAP, 5, SIZE + 2 * GAP]} radius={2} smoothness={3} position={[0, -2.5, 0]} receiveShadow>
        <meshStandardMaterial color={pal.board} roughness={0.75} />
      </RoundedBox>

      {/* 칸 */}
      {Array.from({ length: N * N }, (_, i) => {
        const r = Math.floor(i / N);
        const c = i % N;
        const goal = r === goalRow(0) ? 0 : r === goalRow(1) ? 1 : null;
        return (
          <RoundedBox key={i} args={[CELL, TOP * 2, CELL]} radius={1} smoothness={2} position={[at(cr(c)), 0, at(cr(r))]} receiveShadow>
            <meshStandardMaterial color={goal === null ? pal.cell : goalColors[goal]} roughness={0.85} />
          </RoundedBox>
        );
      })}

      {/* 마지막으로 움직인 칸 */}
      {last?.t === 'move' && <LastCell x={at(cr(last.c))} z={at(cr(last.r))} color={pal.fg} />}

      {/* 갈 수 있는 칸 */}
      {targets.map(([r, c]) => (
        <Target key={`${r}${c}`} x={at(cr(c))} z={at(cr(r))} color={targetColor} pulse={mode === 'ult'} />
      ))}

      {/* 벽 */}
      {state.walls.map((w) => {
        const { o, r, c, p } = parseWall(w);
        const isNew = last?.t === 'wall' && last.o === o && last.r === r && last.c === c;
        const pos = wallPos(o, r, c);
        return <Wall key={w} {...pos} color={mix(p ? pal.p1 : pal.p0, '#000000', p ? 0.12 : 0.18)} drop={isNew} />;
      })}

      {ghost && <GhostWall {...wallPos(ghost.o, ghost.r, ghost.c)} color={ghost.ok ? pal.ok : pal.bad} />}

      {/* 말 */}
      {([0, 1] as Player[]).map((p) => {
        const [r, c] = state.pawns[p];
        return (
          <Pawn
            key={p}
            x={at(cr(c))}
            z={at(cr(r))}
            color={pal[`p${p}` as 'p0' | 'p1']}
            turn={state.turn === p && state.winner === null}
            winner={state.winner === p}
            big={last?.t === 'move' && !!last.ult && state.turn !== p}
          />
        );
      })}

      {/* 누르기·끌기를 받는 투명 바닥 */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, TOP, 0]}
        onPointerDown={down}
        onPointerMove={(e) => pressed.current && aim(e)}
        onPointerUp={() => (pressed.current = false)}
      >
        <planeGeometry args={[SIZE * 4, SIZE * 4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

function LastCell({ x, z, color }: { x: number; z: number; color: string }) {
  const h = CELL / 2 - 0.4;
  const y = TOP + 0.05;
  const pts: [number, number, number][] = [
    [x - h, y, z - h],
    [x + h, y, z - h],
    [x + h, y, z + h],
    [x - h, y, z + h],
    [x - h, y, z - h],
  ];
  return <Line points={pts} color={color} lineWidth={1.5} dashed dashSize={1.4} gapSize={1} transparent opacity={0.3} />;
}

function Target({ x, z, color, pulse }: { x: number; z: number; color: string; pulse: boolean }) {
  const ref = useRef<Mesh>(null);
  const born = useRef(-1);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    if (born.current < 0) born.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - born.current) / 0.25);
    const s = reduced ? 1 : easeOutBack(t);
    m.scale.set(s, 1, s);
    m.position.y = TOP + 0.6 + (reduced ? 0 : Math.sin(clock.elapsedTime * 3 + x + z) * 0.35);
    (m.material as MeshStandardMaterial).opacity = pulse && !reduced ? 0.6 + Math.sin(clock.elapsedTime * 7) * 0.3 : 0.85;
  });
  return (
    <mesh ref={ref} position={[x, TOP + 0.6, z]}>
      <cylinderGeometry args={[2.6, 2.6, 0.8, 28]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.85} />
    </mesh>
  );
}

function Wall({ x, z, rot, color, drop }: { x: number; z: number; rot: number; color: string; drop: boolean }) {
  const ref = useRef<Group>(null);
  const start = useRef(drop && !reduced ? -1 : Infinity);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || start.current === Infinity) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / 0.5);
    g.position.y = (1 - easeOutBounce(t)) * 30;
    if (t === 1) start.current = Infinity;
  });
  return (
    <group ref={ref} position={[x, drop && !reduced ? 30 : 0, z]} rotation-y={rot}>
      <RoundedBox args={[2 * CELL + GAP - 0.4, WALL_H, GAP - 0.5]} radius={0.5} smoothness={2} position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
    </group>
  );
}

function GhostWall({ x, z, rot, color }: { x: number; z: number; rot: number; color: string }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 22);
    g.position.x += (x - g.position.x) * k;
    g.position.z += (z - g.position.z) * k;
    g.rotation.y += (rot - g.rotation.y) * k;
  });
  return (
    <group ref={ref} position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[2 * CELL + GAP - 0.4, WALL_H, GAP - 0.5]} radius={0.5} smoothness={2} position={[0, WALL_H / 2, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.6} depthWrite={false} />
      </RoundedBox>
    </group>
  );
}

function Pawn({ x, z, color, turn, winner, big }: { x: number; z: number; color: string; turn: boolean; winner: boolean; big: boolean }) {
  const body = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const hop = useRef({ fx: x, fz: z, start: -1e9 });
  const prev = useRef({ x, z });

  // 칸이 바뀌면 그 자리에서 깡충 뛰어 새 칸으로
  if (prev.current.x !== x || prev.current.z !== z) {
    const g = body.current;
    hop.current = { fx: g?.position.x ?? prev.current.x, fz: g?.position.z ?? prev.current.z, start: -1 };
    prev.current = { x, z };
  }

  useFrame(({ clock }) => {
    const g = body.current;
    const now = clock.elapsedTime;
    if (g) {
      const h = hop.current;
      if (h.start < 0) h.start = now;
      const dur = big ? 0.55 : 0.38;
      const t = reduced ? 1 : Math.min(1, (now - h.start) / dur);
      const e = easeInOut(t);
      g.position.x = h.fx + (x - h.fx) * e;
      g.position.z = h.fz + (z - h.fz) * e;
      const arc = t < 1 ? Math.sin(Math.PI * t) * (big ? 16 : 7) : 0;
      const bounce = winner && !reduced ? Math.abs(Math.sin(now * 6)) * 4 : 0;
      g.position.y = TOP + arc + bounce;
      const squash = t < 1 ? 1 + Math.sin(Math.PI * t) * 0.08 : 1;
      g.scale.set(1 / squash, squash, 1 / squash);
    }
    const r = ring.current;
    if (r) {
      const p = (now % 1.6) / 1.6;
      r.visible = turn && !reduced;
      r.scale.setScalar(0.8 + p * 0.6);
      (r.material as MeshStandardMaterial).opacity = 0.9 * (1 - p);
      if (g) r.position.set(g.position.x, TOP + 0.15, g.position.z);
    }
  });

  return (
    <>
      <group ref={body} position={[x, TOP, z]}>
        {/* 받침 */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[3.4, 3.8, 1.8, 32]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
        {/* 몸통 */}
        <mesh position={[0, 4.2, 0]} castShadow>
          <cylinderGeometry args={[1.5, 2.9, 5, 32]} />
          <meshStandardMaterial color={color} roughness={0.35} />
        </mesh>
        {/* 머리 */}
        <mesh position={[0, 8.2, 0]} castShadow>
          <sphereGeometry args={[2.4, 32, 24]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[x, TOP + 0.15, z]}>
        <ringGeometry args={[4.2, 4.9, 40]} />
        <meshStandardMaterial color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
function easeOutBounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
