/**
 * 섬 지도 기하. 반지름 2짜리 육각 격자(타일 19개)의 꼭짓점 54개, 변 72개, 항구 9곳을 만든다.
 * 모든 판이 같은 모양이라 한 번만 계산해 두고, 판마다 다른 건(자원·숫자·항구 종류) state 에 둔다.
 *
 * 좌표는 꼭짓점이 위로 향한(pointy-top) 육각형, 한 변 길이 1.
 */

export type Hex = { q: number; r: number; x: number; y: number; v: number[]; e: number[]; adj: number[] };
export type Vertex = { x: number; y: number; hexes: number[]; adj: number[]; edges: number[] };
export type Edge = { a: number; b: number; x: number; y: number; hexes: number[] };

const SQ3 = Math.sqrt(3);

function build() {
  const hexes: Hex[] = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) > 2) continue;
      hexes.push({ q, r, x: SQ3 * (q + r / 2), y: 1.5 * r, v: [], e: [], adj: [] });
    }
  }

  const vertices: Vertex[] = [];
  const vKey = new Map<string, number>();
  const edges: Edge[] = [];
  const eKey = new Map<string, number>();

  hexes.forEach((h, hi) => {
    for (let i = 0; i < 6; i++) {
      const ang = ((60 * i - 90) * Math.PI) / 180;
      const x = h.x + Math.cos(ang);
      const y = h.y + Math.sin(ang);
      const k = `${Math.round(x * 100)},${Math.round(y * 100)}`;
      let id = vKey.get(k);
      if (id === undefined) {
        id = vertices.length;
        vKey.set(k, id);
        vertices.push({ x, y, hexes: [], adj: [], edges: [] });
      }
      vertices[id].hexes.push(hi);
      h.v.push(id);
    }
    for (let i = 0; i < 6; i++) {
      const a = h.v[i];
      const b = h.v[(i + 1) % 6];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      let id = eKey.get(k);
      if (id === undefined) {
        id = edges.length;
        eKey.set(k, id);
        edges.push({
          a: Math.min(a, b),
          b: Math.max(a, b),
          x: (vertices[a].x + vertices[b].x) / 2,
          y: (vertices[a].y + vertices[b].y) / 2,
          hexes: [],
        });
        vertices[a].adj.push(b);
        vertices[b].adj.push(a);
        vertices[a].edges.push(id);
        vertices[b].edges.push(id);
      }
      edges[id].hexes.push(hi);
      h.e.push(id);
    }
  });

  hexes.forEach((h, i) => {
    h.adj = hexes.flatMap((o, j) => (j !== i && Math.hypot(o.x - h.x, o.y - h.y) < SQ3 + 0.01 ? [j] : []));
  });

  // 해안 변 30개를 시계 방향으로 돌며 3·3·4 간격으로 항구 9곳
  const coast = edges
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.hexes.length === 1)
    .sort((m, n) => Math.atan2(m.e.y, m.e.x) - Math.atan2(n.e.y, n.e.x))
    .map(({ i }) => i);
  const harbors = [0, 3, 7, 10, 13, 17, 20, 23, 27].map((k) => coast[k]);

  return { hexes, vertices, edges, harbors };
}

export const MAP = build();
