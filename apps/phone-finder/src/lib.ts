/** 저장소·거리 계산·포맷 같은 순수 도우미 */

export type Me = { id: string; name: string; emoji: string };

export type Member = {
  id: string;
  name: string;
  emoji: string;
  lat?: number;
  lng?: number;
  /** 위치 정확도(m) */
  acc?: number;
  battery?: number;
  /** 위치를 잰 시각(ms) */
  at?: number;
  /** 마지막으로 신호가 온 시각(ms) — 접속 표시용 */
  seen?: number;
};

const ME_KEY = 'phone-finder:me';
const FAMILY_KEY = 'phone-finder:family';
const membersKey = (code: string) => `phone-finder:members:${code}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패해도 진행 */
  }
}

export const loadMe = () => read<Me>(ME_KEY);
export const saveMe = (me: Me) => write(ME_KEY, me);
export const loadFamily = () => read<string>(FAMILY_KEY);
export const saveFamily = (code: string | null) => write(FAMILY_KEY, code);
export const loadMembers = (code: string) => read<Record<string, Member>>(membersKey(code)) ?? {};
export const saveMembers = (code: string, m: Record<string, Member>) => write(membersKey(code), m);

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 8자리 */
export function newFamilyCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isValidCode = (s: string) => /^[A-Z0-9]{8,16}$/.test(s);

export const inviteUrl = (code: string) => `${location.origin}${location.pathname}#f=${code}`;
export const codeFromHash = () => {
  const m = location.hash.match(/f=([A-Za-z0-9]+)/);
  return m ? normalizeCode(m[1]) : null;
};

type LatLng = { lat: number; lng: number };
const rad = (d: number) => (d * Math.PI) / 180;

/** 두 지점 사이 거리(m) — haversine */
export function distance(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** a 에서 b 를 바라보는 방위각(북=0°, 시계방향) */
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)}m`;
  if (m < 10000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m / 1000)}km`;
}

export function ago(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return '방금';
  if (s < 60) return `${s}초 전`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

export type Closeness = 'here' | 'near' | 'far';

/**
 * GPS 는 실내에서 10~50m 씩 흔들린다. 둘의 오차 범위가 겹치면 "같은 집 안일 수 있음"으로 본다.
 */
export function closeness(d: number, accA = 30, accB = 30): Closeness {
  const fuzz = Math.max(25, accA + accB);
  if (d <= fuzz) return 'here';
  if (d <= 300) return 'near';
  return 'far';
}

export const ONLINE_MS = 30_000;
export const isOnline = (m: Member, now = Date.now()) => Boolean(m.seen && now - m.seen < ONLINE_MS);

export const EMOJIS = ['📱', '👨', '👩', '👦', '👧', '👴', '👵', '🧑', '👶', '🐶', '🐱', '⭐', '🌷', '🍀', '🦊', '🐻'];
