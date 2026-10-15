import type { PhotoMeta } from "../types";

/**
 * Sample trip injected when the user has no photos yet: a cartoon character
 * flies from Korea to Japan (plane leg — countries differ) and then
 * road-trips 오사카 → 교토 → 나라 (car legs — same country, short hops),
 * so both vehicles show up in the route preview and the animation.
 * All images are self-drawn SVG cartoons — no external assets.
 */

const svgToFile = (name: string, svg: string): File =>
  new File([new Blob([svg], { type: "image/svg+xml" })], name, {
    type: "image/svg+xml",
  });

/* — cartoon building blocks ————————————————————————————————— */

/** Cute round-faced traveler, reused across every scene. */
const character = (
  x: number,
  y: number,
  scale: number,
  shirt: string,
  extra = "",
) => `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cx="0" cy="98" rx="34" ry="8" fill="#000" opacity="0.08"/>
    <ellipse cx="0" cy="62" rx="30" ry="34" fill="${shirt}" stroke="#3a2b22" stroke-width="3"/>
    <ellipse cx="-30" cy="58" rx="9" ry="16" fill="${shirt}" stroke="#3a2b22" stroke-width="3" transform="rotate(18 -30 58)"/>
    <ellipse cx="30" cy="58" rx="9" ry="16" fill="${shirt}" stroke="#3a2b22" stroke-width="3" transform="rotate(-18 30 58)"/>
    <ellipse cx="-11" cy="94" rx="8" ry="6" fill="#5b4636"/>
    <ellipse cx="11" cy="94" rx="8" ry="6" fill="#5b4636"/>
    <circle cx="0" cy="0" r="34" fill="#ffe3c4" stroke="#3a2b22" stroke-width="3"/>
    <path d="M-34 -4 A34 34 0 0 1 34 -4 L28 -16 L18 -8 L8 -18 L0 -10 L-8 -18 L-18 -8 L-28 -16 Z" fill="#4a3426"/>
    <circle cx="-11" cy="3" r="4" fill="#2c2320"/>
    <circle cx="11" cy="3" r="4" fill="#2c2320"/>
    <circle cx="-9.6" cy="1.6" r="1.3" fill="#fff"/>
    <circle cx="12.4" cy="1.6" r="1.3" fill="#fff"/>
    <circle cx="-20" cy="12" r="5" fill="#ffb3a0" opacity="0.75"/>
    <circle cx="20" cy="12" r="5" fill="#ffb3a0" opacity="0.75"/>
    <path d="M-7 14 Q0 21 7 14" stroke="#2c2320" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${extra}
  </g>`;

const suitcase = `
  <g transform="translate(46 62)">
    <rect x="-13" y="-2" width="26" height="36" rx="5" fill="#e2574c" stroke="#3a2b22" stroke-width="3"/>
    <path d="M-7 -2 v-7 a7 7 0 0 1 14 0 v7" fill="none" stroke="#3a2b22" stroke-width="3"/>
    <line x1="-13" y1="12" x2="13" y2="12" stroke="#3a2b22" stroke-width="2"/>
  </g>`;

const cloud = (x: number, y: number, s: number) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="#ffffff" opacity="0.9">
    <ellipse cx="0" cy="0" rx="34" ry="16"/>
    <circle cx="-14" cy="-8" r="13"/>
    <circle cx="8" cy="-11" r="16"/>
  </g>`;

const sun = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="34" fill="#ffd76e" stroke="#f2b23c" stroke-width="4"/>`;

/** Polaroid-style frame + sky/ground + caption ribbon around a landmark scene. */
const scene = (opts: {
  skyTop: string;
  skyBottom: string;
  ground: string;
  caption: string;
  body: string;
}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${opts.skyTop}"/>
      <stop offset="1" stop-color="${opts.skyBottom}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#sky)"/>
  <rect y="440" width="800" height="160" fill="${opts.ground}"/>
  ${opts.body}
  <g>
    <rect x="230" y="516" width="340" height="52" rx="26" fill="#ffffff" opacity="0.92"/>
    <text x="400" y="550" text-anchor="middle"
      font-family="system-ui, -apple-system, sans-serif" font-size="26"
      font-weight="700" fill="#3a2b22">${opts.caption}</text>
  </g>
</svg>`;

/* — the five scenes ———————————————————————————————————————— */

const seoulTower = scene({
  skyTop: "#aee3f5",
  skyBottom: "#e8f7fd",
  ground: "#9fd68a",
  caption: "서울 · 남산타워",
  body: `
    ${sun(96, 96)}
    ${cloud(300, 110, 1)} ${cloud(620, 170, 0.8)}
    <ellipse cx="540" cy="470" rx="190" ry="70" fill="#7fbf6b"/>
    <rect x="528" y="240" width="24" height="180" fill="#cfd8dc" stroke="#3a2b22" stroke-width="3"/>
    <ellipse cx="540" cy="250" rx="46" ry="20" fill="#e2574c" stroke="#3a2b22" stroke-width="3"/>
    <ellipse cx="540" cy="228" rx="30" ry="13" fill="#f1f5f7" stroke="#3a2b22" stroke-width="3"/>
    <line x1="540" y1="215" x2="540" y2="150" stroke="#3a2b22" stroke-width="5" stroke-linecap="round"/>
    <circle cx="540" cy="146" r="6" fill="#e2574c"/>
    ${character(250, 350, 1.05, "#5aa9e6")}`,
});

const seoulAirport = scene({
  skyTop: "#9fd0f0",
  skyBottom: "#eaf6fd",
  ground: "#b9c4cc",
  caption: "인천공항 · 출발!",
  body: `
    ${sun(700, 90)}
    ${cloud(180, 120, 0.9)} ${cloud(430, 90, 0.7)}
    <g transform="translate(500 260) rotate(-8)">
      <ellipse cx="0" cy="0" rx="150" ry="38" fill="#f4f7f9" stroke="#3a2b22" stroke-width="4"/>
      <path d="M120 -8 Q166 -30 176 -34 Q170 -6 148 6 Z" fill="#e2574c" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-20 6 L-90 66 L-40 60 L18 22 Z" fill="#d7e3ea" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-6 -12 L-52 -58 L-14 -54 L28 -20 Z" fill="#d7e3ea" stroke="#3a2b22" stroke-width="3"/>
      <circle cx="66" cy="-8" r="9" fill="#7ec6ee" stroke="#3a2b22" stroke-width="2.5"/>
      <circle cx="30" cy="-8" r="9" fill="#7ec6ee" stroke="#3a2b22" stroke-width="2.5"/>
      <circle cx="-6" cy="-8" r="9" fill="#7ec6ee" stroke="#3a2b22" stroke-width="2.5"/>
    </g>
    <path d="M0 470 H800" stroke="#8a959c" stroke-width="5" stroke-dasharray="30 24"/>
    ${character(220, 360, 1.05, "#f2a541", suitcase)}`,
});

const osakaCastle = scene({
  skyTop: "#ffd9a0",
  skyBottom: "#fff2dc",
  ground: "#a8d18d",
  caption: "오사카 · 오사카성",
  body: `
    ${sun(110, 100)}
    ${cloud(360, 90, 0.8)} ${cloud(650, 150, 1)}
    <g transform="translate(540 0)">
      <path d="M-110 440 L-84 330 H84 L110 440 Z" fill="#cfd3c3" stroke="#3a2b22" stroke-width="3"/>
      <rect x="-70" y="286" width="140" height="46" fill="#f6f1e7" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-92 288 Q0 250 92 288 L74 262 H-74 Z" fill="#3f7d5d" stroke="#3a2b22" stroke-width="3"/>
      <rect x="-52" y="222" width="104" height="42" fill="#f6f1e7" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-72 224 Q0 190 72 224 L56 200 H-56 Z" fill="#3f7d5d" stroke="#3a2b22" stroke-width="3"/>
      <rect x="-34" y="168" width="68" height="34" fill="#f6f1e7" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-52 170 Q0 136 52 170 L38 148 H-38 Z" fill="#3f7d5d" stroke="#3a2b22" stroke-width="3"/>
      <path d="M-14 142 Q0 128 14 142" fill="none" stroke="#d9a441" stroke-width="6" stroke-linecap="round"/>
    </g>
    ${character(240, 350, 1.05, "#e2574c")}`,
});

const kyotoTorii = scene({
  skyTop: "#ffc9c2",
  skyBottom: "#fff0e4",
  ground: "#b7d7a8",
  caption: "교토 · 붉은 토리이",
  body: `
    ${sun(690, 100)}
    ${cloud(200, 110, 0.9)} ${cloud(460, 80, 0.7)}
    <g transform="translate(540 0)" stroke="#3a2b22" stroke-width="4">
      <path d="M-140 236 Q0 210 140 236 L140 258 Q0 234 -140 258 Z" fill="#d64541"/>
      <rect x="-150" y="222" width="24" height="16" fill="#2c2320" stroke="none" transform="skewY(-4)"/>
      <rect x="126" y="212" width="24" height="16" fill="#2c2320" stroke="none" transform="skewY(4)"/>
      <rect x="-104" y="292" width="208" height="22" fill="#d64541"/>
      <rect x="-96" y="258" width="20" height="182" fill="#d64541"/>
      <rect x="76" y="258" width="20" height="182" fill="#d64541"/>
      <rect x="-10" y="292" width="20" height="34" fill="#d64541"/>
    </g>
    ${character(250, 350, 1.05, "#7bb069")}`,
});

const naraDeer = scene({
  skyTop: "#cde8c8",
  skyBottom: "#f2fae9",
  ground: "#a3cf8e",
  caption: "나라 · 사슴 친구",
  body: `
    ${sun(104, 96)}
    ${cloud(340, 100, 0.8)} ${cloud(620, 140, 1)}
    <g transform="translate(560 330)" stroke="#3a2b22" stroke-width="3">
      <ellipse cx="0" cy="46" rx="64" ry="40" fill="#c78d5a"/>
      <rect x="-46" y="70" width="13" height="44" rx="6" fill="#b57946"/>
      <rect x="30" y="70" width="13" height="44" rx="6" fill="#b57946"/>
      <circle cx="66" cy="-6" r="30" fill="#c78d5a"/>
      <ellipse cx="88" cy="4" rx="14" ry="10" fill="#e8c49a"/>
      <circle cx="62" cy="-12" r="4" fill="#2c2320" stroke="none"/>
      <path d="M52 -32 L40 -58 M52 -32 L58 -60 M58 -60 L50 -70 M58 -60 L68 -66" fill="none" stroke-linecap="round"/>
      <ellipse cx="40" cy="-28" rx="9" ry="5" fill="#c78d5a" transform="rotate(-30 40 -28)"/>
      <circle cx="-20" cy="30" r="5" fill="#fff" stroke="none"/>
      <circle cx="4" cy="44" r="5" fill="#fff" stroke="none"/>
      <circle cx="-30" cy="56" r="5" fill="#fff" stroke="none"/>
    </g>
    ${character(240, 350, 1.05, "#f2a541")}`,
});

/* — traveler face (rides the plane / the car) ——————————————— */

const travelerFaceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#ffe9b3"/>
  <circle cx="200" cy="212" r="150" fill="#ffe3c4" stroke="#3a2b22" stroke-width="10"/>
  <path d="M50 194 A150 150 0 0 1 350 194 L324 142 L280 176 L236 132 L200 168 L164 132 L120 176 L76 142 Z" fill="#4a3426"/>
  <circle cx="152" cy="226" r="16" fill="#2c2320"/>
  <circle cx="248" cy="226" r="16" fill="#2c2320"/>
  <circle cx="158" cy="220" r="5" fill="#fff"/>
  <circle cx="254" cy="220" r="5" fill="#fff"/>
  <circle cx="116" cy="266" r="20" fill="#ffb3a0" opacity="0.75"/>
  <circle cx="284" cy="266" r="20" fill="#ffb3a0" opacity="0.75"/>
  <path d="M168 276 Q200 306 232 276" stroke="#2c2320" stroke-width="11" fill="none" stroke-linecap="round"/>
</svg>`;

/* — assembly ———————————————————————————————————————————————— */

type SampleSpec = {
  file: string;
  svg: string;
  lat: number;
  lng: number;
  takenAt: string;
  place: string;
  country: string;
};

// 서울(KR) → 오사카(JP)는 국가가 달라 비행기, 오사카 → 교토 → 나라는
// 같은 나라 단거리라 자동차 — legMode()가 두 이동수단을 모두 그리게 된다.
const SAMPLE_SPECS: SampleSpec[] = [
  {
    file: "sample-seoul-tower.svg",
    svg: seoulTower,
    lat: 37.5512,
    lng: 126.9882,
    takenAt: "2026-05-01T09:20:00+09:00",
    place: "서울",
    country: "KR",
  },
  {
    file: "sample-incheon-airport.svg",
    svg: seoulAirport,
    lat: 37.4602,
    lng: 126.4407,
    takenAt: "2026-05-01T12:40:00+09:00",
    place: "인천공항",
    country: "KR",
  },
  {
    file: "sample-osaka-castle.svg",
    svg: osakaCastle,
    lat: 34.6873,
    lng: 135.5262,
    takenAt: "2026-05-01T17:30:00+09:00",
    place: "오사카",
    country: "JP",
  },
  {
    file: "sample-kyoto-torii.svg",
    svg: kyotoTorii,
    lat: 34.9671,
    lng: 135.7727,
    takenAt: "2026-05-02T10:30:00+09:00",
    place: "교토",
    country: "JP",
  },
  {
    file: "sample-nara-deer.svg",
    svg: naraDeer,
    lat: 34.6851,
    lng: 135.843,
    takenAt: "2026-05-03T11:00:00+09:00",
    place: "나라",
    country: "JP",
  },
];

export const createSamplePhotos = (): PhotoMeta[] =>
  SAMPLE_SPECS.map((s) => {
    const file = svgToFile(s.file, s.svg);
    return {
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      lat: s.lat,
      lng: s.lng,
      takenAt: s.takenAt,
      place: s.place,
      country: s.country,
      status: "ok",
      isSample: true,
    };
  });

export const createSampleTraveler = (): PhotoMeta => {
  const file = svgToFile("sample-traveler.svg", travelerFaceSvg);
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
    status: "no-geo",
    isSample: true,
  };
};
