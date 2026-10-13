import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CanvasTexture, Color, MathUtils, SRGBColorSpace, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { MAP } from './map';
import { RES_EMOJI, isCity, owner, pips, type Terrain } from './game';
import type { BoardProps } from './Board';

/**
 * 2.5D 섬 지도 (React Three Fiber). 지도 좌표 (x, y) → 월드 (x, z), 위쪽이 +y.
 * 고르기는 투명 바닥 한 장에서 받아, 누른 곳에서 가장 가까운 후보를 고른다(손가락으로 누르기 쉽게).
 */

const TILT = MathUtils.degToRad(52);
const LAND = 0.28; // 땅 타일 윗면 높이
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Palette = Record<'sea' | 'seaHi' | 'p0' | 'p1' | 'p2' | 'p3' | 'fg', string> & Record<Terrain, string>;

function usePalette(): Palette {
  const read = (): Palette => {
    const css = getComputedStyle(document.documentElement);
    const v = (k: string, d: string) => css.getPropertyValue(`--${k}`).trim() || d;
    return {
      sea: v('sea', '#3d8fc4'),
      seaHi: v('sea-hi', '#63b3e0'),
      p0: v('p0', '#e0453f'),
      p1: v('p1', '#2f6fe0'),
      p2: v('p2', '#f08a1c'),
      p3: v('p3', '#1f9e6a'),
      fg: v('fg', '#26211a'),
      wood: v('t-wood', '#3f8f4a'),
      brick: v('t-brick', '#c8643b'),
      sheep: v('t-sheep', '#9bd06b'),
      wheat: v('t-wheat', '#e8c547'),
      ore: v('t-ore', '#8f99a8'),
      desert: v('t-desert', '#e3d3a6'),
    };
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

const playerColor = (pal: Palette, p: number) => pal[`p${p}` as 'p0'];

/** 숫자 토큰·항구 표지에 쓰는 원형 텍스처 */
function labelTexture(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(64, 64, 60, 0, Math.PI * 2);
  g.fillStyle = '#fdf6e3';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.stroke();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  draw(g);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const FONT = "800 FONT_SIZEpx 'Pretendard Variable', Pretendard, -apple-system, sans-serif";
const font = (px: number) => FONT.replace('FONT_SIZE', String(px));

const tokenTextures = new Map<number, CanvasTexture>();
const tokenTexture = (n: number) => {
  if (!tokenTextures.has(n))
    tokenTextures.set(
      n,
      labelTexture((g) => {
        g.fillStyle = n === 6 || n === 8 ? '#d23a2a' : '#2a2118';
        g.font = font(60);
        g.fillText(String(n), 64, 56);
        g.font = font(34);
        g.fillText('•'.repeat(pips(n)), 64, 96);
      }),
    );
  return tokenTextures.get(n)!;
};
const harborTextures = new Map<string, CanvasTexture>();
const harborTexture = (h: string) => {
  if (!harborTextures.has(h))
    harborTextures.set(
      h,
      labelTexture((g) => {
        g.fillStyle = '#4a3720';
        if (h === 'any') {
          g.font = font(46);
          g.fillText('3:1', 64, 66);
        } else {
          g.font = font(44);
          g.fillText(RES_EMOJI[h as keyof typeof RES_EMOJI], 64, 46);
          g.font = font(34);
          g.fillText('2:1', 64, 94);
        }
      }),
    );
  return harborTextures.get(h)!;
};

/** 타일별로 늘 같은 장식이 나오도록 하는 작은 난수 */
const rand = (seed: number) => {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

export default function Board3D(props: BoardProps) {
  return (
    <div className="board board3d" role="img" aria-label="섬 지도">
      <Canvas orthographic flat shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ near: 0.1, far: 200 }}>
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

function Scene({ state: s, pick, onPick }: BoardProps) {
  const pal = usePalette();
  const { size, camera } = useThree();

  const spanX = 11;
  const spanY = 10.6 * Math.sin(TILT) + 1.4;
  const zoom = Math.min(size.width / spanX, size.height / spanY);
  useLayoutEffect(() => {
    const d = 40;
    camera.position.set(0, Math.sin(TILT) * d, Math.cos(TILT) * d);
    camera.zoom = zoom;
    camera.lookAt(0, 0, 0.15);
    camera.updateProjectionMatrix();
  }, [camera, zoom]);

  // 처음 그릴 땐 이미 있던 건물·길이 떨어지는 애니메이션 없이
  const ready = useRef(false);
  useEffect(() => {
    ready.current = true;
  }, []);

  const lastDice = s.dice ? s.dice[0] + s.dice[1] : 0;

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!pick || pick.ids.length === 0) return;
    e.stopPropagation();
    const x = e.point.x;
    const y = e.point.z;
    const at = (id: number) =>
      pick.kind === 'vertex' ? MAP.vertices[id] : pick.kind === 'edge' ? MAP.edges[id] : MAP.hexes[id];
    let best = -1;
    let bestD = Infinity;
    for (const id of pick.ids) {
      const p = at(id);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    const reach = pick.kind === 'hex' ? 1 : 0.5;
    if (best >= 0 && bestD <= reach) onPick(best);
  };

  return (
    <>
      <hemisphereLight args={['#fffaf0', '#5a6b7a', 1.5]} />
      <directionalLight
        castShadow
        position={[-4, 10, 5]}
        intensity={1.5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.001}
      />

      {/* 바다와 모래 섬 */}
      <mesh position={[0, -0.12, 0]} rotation-y={Math.PI / 6} receiveShadow>
        <cylinderGeometry args={[5.35, 5.45, 0.2, 6]} />
        <meshStandardMaterial color={pal.sea} roughness={0.35} metalness={0.05} />
      </mesh>
      <Waves color={pal.seaHi} />
      <mesh position={[0, 0.02, 0]} rotation-y={Math.PI / 6} receiveShadow>
        <cylinderGeometry args={[4.62, 4.75, 0.12, 6]} />
        <meshStandardMaterial color="#e9d9a8" roughness={0.9} />
      </mesh>

      {/* 항구 */}
      {MAP.harbors.map((e, i) => (
        <Harbor key={e} edge={e} kind={s.harbors[i]} />
      ))}

      {/* 땅 */}
      {MAP.hexes.map((h, i) => (
        <Tile
          key={i}
          i={i}
          x={h.x}
          z={h.y}
          terrain={s.terrain[i]}
          color={pal[s.terrain[i]]}
          num={s.nums[i]}
          hot={!!s.nums[i] && s.nums[i] === lastDice && s.phase.k !== 'setup' ? s.n : 0}
        />
      ))}

      <Robber x={MAP.hexes[s.robber].x + 0.42} z={MAP.hexes[s.robber].y - 0.15} />

      {/* 길 */}
      {s.roads.map((p, e) => (p < 0 ? null : <Road key={e} e={e} color={playerColor(pal, p)} drop={ready.current} />))}

      {/* 건물 */}
      {s.build.map((b, v) =>
        b < 0 ? null : (
          <Building key={`${v}-${isCity(b) ? 'c' : 's'}`} v={v} city={isCity(b)} color={playerColor(pal, owner(b))} drop={ready.current} />
        ),
      )}

      {/* 고를 수 있는 곳 */}
      {pick?.kind === 'vertex' && pick.ids.map((v) => <PickMark key={`v${v}`} x={MAP.vertices[v].x} z={MAP.vertices[v].y} />)}
      {pick?.kind === 'edge' && pick.ids.map((e) => <PickEdge key={`e${e}`} e={e} />)}
      {pick?.kind === 'hex' && pick.ids.map((i) => <PickHex key={`h${i}`} x={MAP.hexes[i].x} z={MAP.hexes[i].y} />)}

      {/* 누르기를 받는 투명 바닥 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, LAND + 0.05, 0]} onPointerDown={down}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

function Waves({ color }: { color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || reduced) return;
    const t = clock.elapsedTime;
    m.scale.setScalar(1 + Math.sin(t * 0.9) * 0.012);
    (m.material as MeshStandardMaterial).opacity = 0.45 + Math.sin(t * 0.9) * 0.1;
  });
  return (
    <mesh ref={ref} position={[0, -0.015, 0]} rotation-y={Math.PI / 6}>
      <cylinderGeometry args={[5.0, 5.0, 0.01, 6]} />
      <meshStandardMaterial color={color} transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

function Tile({ i, x, z, terrain, color, num, hot }: { i: number; x: number; z: number; terrain: Terrain; color: string; num: number; hot: number }) {
  const mat = useRef<MeshStandardMaterial>(null);
  const flash = useRef({ key: 0, start: -1 });
  if (hot && hot !== flash.current.key) flash.current = { key: hot, start: -1 };

  useFrame(({ clock }) => {
    const m = mat.current;
    if (!m) return;
    const f = flash.current;
    if (!f.key || reduced) {
      m.emissiveIntensity = 0;
      return;
    }
    if (f.start < 0) f.start = clock.elapsedTime;
    const t = (clock.elapsedTime - f.start) / 1.4;
    m.emissiveIntensity = t >= 1 ? 0 : Math.sin(Math.min(1, t) * Math.PI * 3) ** 2 * (1 - t) * 0.6;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, LAND / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.97, LAND, 6]} />
        <meshStandardMaterial ref={mat} color={color} emissive="#fff3c4" emissiveIntensity={0} roughness={0.8} flatShading />
      </mesh>
      <Decor i={i} terrain={terrain} />
      {num > 0 && (
        <group position={[0, LAND, 0.22]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.33, 0.08, 32]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.081, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.31, 32]} />
            <meshBasicMaterial map={tokenTexture(num)} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** 지형별 작은 장식 — 숫자 토큰(아래쪽 가운데)을 가리지 않게 위쪽 반에 둔다 */
function Decor({ i, terrain }: { i: number; terrain: Terrain }) {
  const spots = useMemo(() => {
    const r = rand(i + 1);
    const base: [number, number][] = [
      [-0.45, -0.3],
      [0, -0.52],
      [0.45, -0.3],
      [-0.6, 0.15],
      [0.6, 0.15],
    ];
    return base.map(([x, z]) => [x + (r() - 0.5) * 0.12, z + (r() - 0.5) * 0.12, 0.8 + r() * 0.4, r() * Math.PI] as const);
  }, [i]);
  const y = LAND;

  switch (terrain) {
    case 'wood':
      return (
        <>
          {spots.map(([x, z, s], k) => (
            <group key={k} position={[x, y, z]} scale={s}>
              <mesh position={[0, 0.06, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.12, 6]} />
                <meshStandardMaterial color="#6b4a2a" />
              </mesh>
              <mesh position={[0, 0.26, 0]} castShadow>
                <coneGeometry args={[0.17, 0.36, 7]} />
                <meshStandardMaterial color="#2e6b37" flatShading />
              </mesh>
            </group>
          ))}
        </>
      );
    case 'brick':
      return (
        <>
          {spots.slice(0, 4).map(([x, z, s, rot], k) => (
            <group key={k} position={[x, y, z]} rotation-y={rot} scale={s}>
              <mesh position={[0, 0.05, 0]} castShadow>
                <boxGeometry args={[0.24, 0.1, 0.12]} />
                <meshStandardMaterial color="#9e4527" />
              </mesh>
              <mesh position={[0.03, 0.15, 0]} castShadow>
                <boxGeometry args={[0.24, 0.1, 0.12]} />
                <meshStandardMaterial color="#b0532f" />
              </mesh>
            </group>
          ))}
        </>
      );
    case 'sheep':
      return (
        <>
          {spots.slice(0, 3).map(([x, z, s, rot], k) => (
            <group key={k} position={[x, y, z]} rotation-y={rot} scale={s}>
              <mesh position={[0, 0.11, 0]} castShadow>
                <sphereGeometry args={[0.11, 12, 10]} />
                <meshStandardMaterial color="#fbfbf6" roughness={1} />
              </mesh>
              <mesh position={[0.11, 0.13, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#3a3530" />
              </mesh>
            </group>
          ))}
        </>
      );
    case 'wheat':
      return (
        <>
          {spots.map(([x, z, s], k) => (
            <mesh key={k} position={[x, y + 0.12 * s, z]} scale={s} castShadow>
              <cylinderGeometry args={[0.05, 0.09, 0.24, 6]} />
              <meshStandardMaterial color="#c99a1e" flatShading />
            </mesh>
          ))}
        </>
      );
    case 'ore':
      return (
        <>
          {spots.slice(0, 3).map(([x, z, s, rot], k) => (
            <mesh key={k} position={[x, y + 0.12 * s, z]} rotation={[rot, rot * 2, 0]} scale={s} castShadow>
              <dodecahedronGeometry args={[0.2, 0]} />
              <meshStandardMaterial color="#6d7686" flatShading roughness={0.6} />
            </mesh>
          ))}
        </>
      );
    case 'desert':
      return (
        <group position={[0.1, y, -0.15]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
            <meshStandardMaterial color="#5d9a4a" />
          </mesh>
          <mesh position={[0.1, 0.24, 0]} rotation-z={-0.9} castShadow>
            <capsuleGeometry args={[0.04, 0.12, 4, 8]} />
            <meshStandardMaterial color="#5d9a4a" />
          </mesh>
        </group>
      );
  }
}

function Harbor({ edge, kind }: { edge: number; kind: string }) {
  const { x, y, a, b } = MAP.edges[edge];
  const d = Math.hypot(x, y);
  const hx = x + (x / d) * 0.6;
  const hz = y + (y / d) * 0.6;
  return (
    <group>
      {[a, b].map((v) => {
        const V = MAP.vertices[v];
        const dx = V.x - hx;
        const dz = V.y - hz;
        const len = Math.hypot(dx, dz);
        return (
          <mesh key={v} position={[(hx + V.x) / 2, 0.06, (hz + V.y) / 2]} rotation-y={-Math.atan2(dz, dx)} castShadow receiveShadow>
            <boxGeometry args={[len, 0.05, 0.1]} />
            <meshStandardMaterial color="#8a6438" />
          </mesh>
        );
      })}
      <mesh position={[hx, 0.07, hz]} castShadow>
        <cylinderGeometry args={[0.36, 0.38, 0.12, 32]} />
        <meshStandardMaterial color="#7a5a32" />
      </mesh>
      <mesh position={[hx, 0.131, hz]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.33, 32]} />
        <meshBasicMaterial map={harborTexture(kind)} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Robber({ x, z }: { x: number; z: number }) {
  const ref = useRef<Group>(null);
  const hop = useRef({ fx: x, fz: z, start: -1e9 });
  const prev = useRef({ x, z });
  if (prev.current.x !== x || prev.current.z !== z) {
    const g = ref.current;
    hop.current = { fx: g?.position.x ?? prev.current.x, fz: g?.position.z ?? prev.current.z, start: -1 };
    prev.current = { x, z };
  }
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const h = hop.current;
    if (h.start < 0) h.start = clock.elapsedTime;
    const t = reduced ? 1 : Math.min(1, (clock.elapsedTime - h.start) / 0.6);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    g.position.set(h.fx + (x - h.fx) * e, LAND + (t < 1 ? Math.sin(Math.PI * t) * 1.4 : 0), h.fz + (z - h.fz) * e);
  });
  return (
    <group ref={ref} position={[x, LAND, z]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.1, 16]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 0.34, 16]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** 새로 생긴 것만 위에서 떨어뜨린다 */
function useDrop(drop: boolean, from = 1.6, dur = 0.45) {
  const ref = useRef<Group>(null);
  // 처음 그릴 때 값만 쓴다 — 이후 렌더에서 drop 이 바뀌어도 위치를 다시 띄우지 않게
  const [fall] = useState(drop && !reduced);
  const start = useRef(fall ? -1 : Infinity);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || start.current === Infinity) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / dur);
    g.position.y = (1 - easeOutBounce(t)) * from;
    if (t === 1) start.current = Infinity;
  });
  return { ref, y0: fall && start.current !== Infinity ? from : 0 };
}

function Road({ e, color, drop }: { e: number; color: string; drop: boolean }) {
  const { a, b, x, y } = MAP.edges[e];
  const A = MAP.vertices[a];
  const B = MAP.vertices[b];
  const rot = -Math.atan2(B.y - A.y, B.x - A.x);
  const { ref, y0 } = useDrop(drop, 1.2);
  return (
    <group ref={ref} position={[0, y0, 0]}>
      <mesh position={[x, LAND + 0.07, y]} rotation-y={rot} castShadow>
        <boxGeometry args={[0.62, 0.13, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Building({ v, city, color, drop }: { v: number; city: boolean; color: string; drop: boolean }) {
  const { x, y } = MAP.vertices[v];
  const { ref, y0 } = useDrop(drop);
  const roof = useMemo(() => '#' + new Color(color).multiplyScalar(0.72).getHexString(), [color]);
  return (
    <group ref={ref} position={[0, y0, 0]}>
      <group position={[x, LAND, y]} rotation-y={Math.PI / 4 + (v % 2 ? 0.3 : -0.3)}>
        {city ? (
          <>
            <mesh position={[0.06, 0.13, 0]} castShadow>
              <boxGeometry args={[0.42, 0.26, 0.26]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <mesh position={[-0.1, 0.34, 0]} castShadow>
              <boxGeometry args={[0.2, 0.2, 0.24]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <mesh position={[-0.1, 0.52, 0]} rotation-y={Math.PI / 4} castShadow>
              <coneGeometry args={[0.18, 0.18, 4]} />
              <meshStandardMaterial color={roof} flatShading />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[0.24, 0.2, 0.24]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.29, 0]} rotation-y={Math.PI / 4} castShadow>
              <coneGeometry args={[0.2, 0.18, 4]} />
              <meshStandardMaterial color={roof} flatShading />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

function usePulse(speed = 6) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    (m.material as MeshStandardMaterial).opacity = reduced ? 0.9 : 0.6 + Math.sin(clock.elapsedTime * speed) * 0.3;
  });
  return ref;
}

function PickMark({ x, z }: { x: number; z: number }) {
  const ref = usePulse();
  return (
    <mesh ref={ref} position={[x, LAND + 0.1, z]}>
      <sphereGeometry args={[0.13, 16, 12]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} transparent />
    </mesh>
  );
}

function PickEdge({ e }: { e: number }) {
  const { a, b, x, y } = MAP.edges[e];
  const A = MAP.vertices[a];
  const B = MAP.vertices[b];
  const ref = usePulse();
  return (
    <mesh ref={ref} position={[x, LAND + 0.06, y]} rotation-y={-Math.atan2(B.y - A.y, B.x - A.x)}>
      <boxGeometry args={[0.55, 0.08, 0.12]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} transparent />
    </mesh>
  );
}

function PickHex({ x, z }: { x: number; z: number }) {
  const ref = usePulse(4);
  return (
    <mesh ref={ref} position={[x, LAND + 0.02, z]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}>
      <ringGeometry args={[0.78, 0.9, 6]} />
      <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} transparent depthWrite={false} />
    </mesh>
  );
}

function easeOutBounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
