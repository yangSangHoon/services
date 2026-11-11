import { PopNumber, usePresence } from '@lab/core/motion';
import '@lab/core/motion.css';
import { track } from '@lab/core/track';
import { useEffect, useMemo, useState } from 'react';
import { audioReady, startAlarm, stopAlarm, unlockAudio } from './alarm';
import { useFamily, type GeoState, type Pos } from './family';
import FamilyMap, { type MapPoint } from './FamilyMap';
import {
  ago,
  bearing,
  closeness,
  codeFromHash,
  distance,
  EMOJIS,
  formatDistance,
  inviteUrl,
  isOnline,
  isValidCode,
  loadFamily,
  loadMe,
  newFamilyCode,
  normalizeCode,
  saveFamily,
  saveMe,
  type Me,
  type Member,
} from './lib';

const STALE_MS = 10 * 60_000;
const WAIT_MS = 12_000;

export default function App() {
  const [me, setMe] = useState<Me | null>(loadMe);
  const [code, setCode] = useState<string | null>(() => {
    const fromHash = codeFromHash();
    const saved = loadFamily();
    // 초대 링크로 들어왔고 이미 프로필이 있으면 바로 그 가족으로
    if (fromHash && isValidCode(fromHash) && loadMe()) {
      saveFamily(fromHash);
      history.replaceState(null, '', location.pathname);
      return fromHash;
    }
    return saved;
  });

  // 첫 터치 때 소리 잠금 해제
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on);
    return () => window.removeEventListener('pointerdown', on);
  }, []);

  if (!me || !code) {
    return (
      <Setup
        me={me}
        onDone={(m, c, joined) => {
          saveMe(m);
          saveFamily(c);
          setMe(m);
          setCode(c);
          history.replaceState(null, '', location.pathname);
          track('phone-finder', joined ? 'join' : 'family');
        }}
      />
    );
  }

  return (
    <Home
      key={code}
      me={me}
      code={code}
      onLeave={() => {
        saveFamily(null);
        setCode(null);
      }}
    />
  );
}

/* ───────────── 처음 설정 ───────────── */

function Setup({ me, onDone }: { me: Me | null; onDone: (me: Me, code: string, joined: boolean) => void }) {
  const invited = codeFromHash();
  const [name, setName] = useState(me?.name ?? '');
  const [emoji, setEmoji] = useState(me?.emoji ?? '📱');
  const [mode, setMode] = useState<'new' | 'join'>(invited ? 'join' : 'new');
  const [joinCode, setJoinCode] = useState(invited ?? '');
  const id = useMemo(() => me?.id ?? crypto.randomUUID(), [me]);

  const trimmed = name.trim();
  const normalized = normalizeCode(joinCode);
  const canGo = trimmed.length > 0 && (mode === 'new' || isValidCode(normalized));

  return (
    <main className="page setup">
      <div className="hero">
        <div className="hero-emoji">📱</div>
        <h1>우리집 폰 찾기</h1>
        <p className="muted">가족 폰을 등록해 두고, 안 보일 때 거리·위치를 확인하고 소리로 찾아요.</p>
      </div>

      <section className="card">
        <label className="label">이 폰은 누구 폰인가요?</label>
        <input className="input" placeholder="예: 엄마, 아빠, 지우" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="emoji-row">
          {EMOJIS.map((e) => (
            <button key={e} className={`emoji-btn ${e === emoji ? 'on' : ''}`} onClick={() => setEmoji(e)} aria-label={e}>
              {e}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="seg">
          <button className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>
            새 가족 만들기
          </button>
          <button className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}>
            가족 코드로 참여
          </button>
        </div>
        {mode === 'join' ? (
          <>
            <input
              className="input code-input"
              placeholder="8자리 가족 코드"
              value={joinCode}
              maxLength={16}
              onChange={(e) => setJoinCode(e.target.value)}
              autoCapitalize="characters"
            />
            <p className="muted small">가족이 보내준 초대 링크를 열면 자동으로 채워져요.</p>
          </>
        ) : (
          <p className="muted small">가족 코드가 만들어져요. 초대 링크를 가족에게 보내 각자 폰에서 열면 등록돼요.</p>
        )}
      </section>

      <button
        className="btn primary big"
        disabled={!canGo}
        onClick={() => onDone({ id, name: trimmed, emoji }, mode === 'new' ? newFamilyCode() : normalized, mode === 'join')}
      >
        {mode === 'new' ? '시작하기' : '가족에 참여하기'}
      </button>
    </main>
  );
}

/* ───────────── 메인 ───────────── */

function Home({ me, code, onLeave }: { me: Me; code: string; onLeave: () => void }) {
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [openId, setOpenId] = useState<string | null>(null);
  const [ringBy, setRingBy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [foundTick, setFoundTick] = useState(0);
  const [now, setNow] = useState(Date.now());

  const fam = useFamily(code, me, {
    onRing: (by) => {
      setRingBy(by);
      startAlarm();
    },
    onStop: () => {
      setRingBy(null);
      stopAlarm();
    },
    onFound: (by) => {
      const who = fam.members[by];
      setToast(`${who ? `${who.emoji} ${who.name} 폰` : '폰'}을 찾았대요! 🎉`);
      setFoundTick((n) => n + 1);
    },
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const others = useMemo(
    () =>
      Object.values(fam.members).sort((a, b) => Number(isOnline(b, now)) - Number(isOnline(a, now)) || (b.at ?? 0) - (a.at ?? 0)),
    [fam.members, now],
  );

  const points: MapPoint[] = [
    ...(fam.pos ? [{ id: me.id, emoji: me.emoji, name: me.name, lat: fam.pos.lat, lng: fam.pos.lng, acc: fam.pos.acc, me: true }] : []),
    ...others
      .filter((m) => m.lat != null && m.lng != null)
      .map((m) => ({ id: m.id, emoji: m.emoji, name: m.name, lat: m.lat!, lng: m.lng!, acc: m.acc, stale: !m.at || now - m.at > STALE_MS })),
  ];

  const open = openId ? fam.members[openId] : null;
  const ringer = ringBy ? fam.members[ringBy] : null;

  return (
    <main className="page home">
      <header className="top">
        <div className="brand">
          <span>📱</span> 우리집 폰 찾기
        </div>
        <button className="chip" onClick={() => setShowInvite(true)}>
          <span className={`dot ${fam.connected ? 'live' : ''}`} /> 가족 초대
        </button>
      </header>

      <MyCard me={me} pos={fam.pos} geo={fam.geo} />

      <div className="seg tabs">
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>
          📋 가족 폰
        </button>
        <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>
          🗺️ 지도
        </button>
      </div>

      {tab === 'list' ? (
        others.length === 0 ? (
          <section className="card empty">
            <div className="empty-emoji">👨‍👩‍👧‍👦</div>
            <p>
              아직 등록된 가족 폰이 없어요.
              <br />
              초대 링크를 보내 가족 폰에서 열어 달라고 하세요.
            </p>
            <button className="btn primary" onClick={() => setShowInvite(true)}>
              초대 링크 보내기
            </button>
          </section>
        ) : (
          <ul className="list">
            {others.map((m) => (
              <MemberRow key={m.id} m={m} pos={fam.pos} now={now} waiting={Boolean(fam.waiting[m.id])} onOpen={() => setOpenId(m.id)} />
            ))}
          </ul>
        )
      ) : (
        <section className="card map-card">
          {points.length ? <FamilyMap points={points} className="map-big" /> : <p className="muted map-empty">아직 위치를 아는 폰이 없어요.</p>}
          <p className="muted small legend">
            <span className="lg me" /> 나 <span className="lg live" /> 가족(최근) <span className="lg stale" /> 10분 넘은 위치 · 원 = 오차 범위
          </p>
        </section>
      )}

      <p className="muted small note">
        💡 웹앱이라 상대 폰에서 이 페이지가 <b>열려 있어야</b> 실시간 위치·소리 울리기가 돼요. 닫혀 있으면 마지막으로 열었던 위치를 보여줘요. 집에서는
        GPS 오차(10~50m)가 커서 거리보다 <b>소리 울리기</b>가 더 정확해요.
      </p>

      <MemberSheet
        m={open}
        me={me}
        pos={fam.pos}
        now={now}
        waitingSince={openId ? fam.waiting[openId] : undefined}
        foundTick={foundTick}
        onClose={() => setOpenId(null)}
        onFind={(ring) => {
          if (!openId) return;
          fam.find(openId, ring);
          track('phone-finder', ring ? 'ring' : 'locate');
        }}
        onStop={() => openId && fam.stopRing(openId)}
        onRemove={() => {
          if (openId) fam.remove(openId);
          setOpenId(null);
        }}
      />

      <InviteSheet open={showInvite} code={code} onClose={() => setShowInvite(false)} onLeave={onLeave} />

      {ringBy && (
        <RingOverlay
          by={ringer}
          onFound={() => {
            stopAlarm();
            setRingBy(null);
            fam.sayFound();
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function MyCard({ me, pos, geo }: { me: Me; pos: Pos | null; geo: GeoState }) {
  const [, force] = useState(0);
  const soundOk = audioReady();
  useEffect(() => {
    const on = () => setTimeout(() => force((n) => n + 1), 50);
    window.addEventListener('pointerdown', on, { once: true });
    return () => window.removeEventListener('pointerdown', on);
  }, []);
  const geoText =
    geo === 'ok' && pos
      ? `내 위치 확인됨 · 오차 ±${Math.round(pos.acc)}m`
      : geo === 'denied'
        ? '위치 권한이 꺼져 있어요 — 브라우저 설정에서 허용해 주세요'
        : geo === 'unavailable'
          ? '위치를 못 잡고 있어요'
          : '내 위치 찾는 중…';
  return (
    <section className="card me-card">
      <div className="avatar">{me.emoji}</div>
      <div className="grow">
        <div className="name">
          {me.name} <span className="muted small">· 이 폰</span>
        </div>
        <div className={`small ${geo === 'denied' ? 'warn' : 'muted'}`}>{geoText}</div>
        <div className="small muted">{soundOk ? '🔔 찾기 대기 중 — 가족이 울리면 소리가 나요' : '🔕 화면을 한 번 터치하면 소리 울리기가 켜져요'}</div>
      </div>
    </section>
  );
}

function distanceInfo(m: Member, pos: Pos | null) {
  if (!pos || m.lat == null || m.lng == null) return null;
  const d = distance(pos, { lat: m.lat, lng: m.lng });
  return { d, c: closeness(d, pos.acc, m.acc), b: bearing(pos, { lat: m.lat, lng: m.lng }) };
}

const CLOSE_LABEL = { here: '바로 근처', near: '가까워요', far: '멀리 있어요' } as const;

function MemberRow({ m, pos, now, waiting, onOpen }: { m: Member; pos: Pos | null; now: number; waiting: boolean; onOpen: () => void }) {
  const online = isOnline(m, now);
  const info = distanceInfo(m, pos);
  return (
    <li>
      <button className="card row" onClick={onOpen}>
        <div className="avatar">
          {m.emoji}
          <span className={`status ${online ? 'live' : ''}`} />
        </div>
        <div className="grow">
          <div className="name">{m.name}</div>
          <div className="small muted">
            {waiting ? '응답 기다리는 중…' : online ? '지금 앱 켜져 있음' : m.at ? `마지막 위치 ${ago(m.at, now)}` : '위치 정보 없음'}
            {m.battery != null && ` · 🔋${m.battery}%`}
          </div>
        </div>
        <div className="dist">
          {info ? (
            <>
              <b className={`c-${info.c}`}>{info.c === 'here' ? '근처' : formatDistance(info.d)}</b>
              <span className="small muted">{CLOSE_LABEL[info.c]}</span>
            </>
          ) : (
            <span className="small muted">—</span>
          )}
        </div>
      </button>
    </li>
  );
}

/* ───────────── 상세 시트 ───────────── */

function useCompass(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const on = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      if (e.webkitCompassHeading != null) setHeading(e.webkitCompassHeading);
      else if (e.absolute && e.alpha != null) setHeading((360 - e.alpha) % 360);
    };
    const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evt, on as EventListener);
    return () => window.removeEventListener(evt, on as EventListener);
  }, [enabled]);
  return heading;
}

async function askCompass() {
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D.requestPermission === 'function') {
    try {
      return (await D.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

function MemberSheet({
  m,
  me,
  pos,
  now,
  waitingSince,
  foundTick,
  onClose,
  onFind,
  onStop,
  onRemove,
}: {
  m: Member | null;
  me: Me;
  pos: Pos | null;
  now: number;
  waitingSince?: number;
  foundTick: number;
  onClose: () => void;
  onFind: (ring: boolean) => void;
  onStop: () => void;
  onRemove: () => void;
}) {
  const phase = usePresence(Boolean(m), '--modal-close-dur');
  const [last, setLast] = useState<Member | null>(m);
  const [compass, setCompass] = useState(false);
  const [ringing, setRinging] = useState(false);
  const heading = useCompass(compass);
  useEffect(() => setRinging(false), [foundTick]);
  useEffect(() => {
    if (m) setLast(m);
    else {
      setRinging(false);
      setCompass(false);
    }
  }, [m]);
  if (!phase.mounted || !last) return null;

  const x = m ?? last;
  const info = distanceInfo(x, pos);
  const online = isOnline(x, now);
  const timedOut = waitingSince != null && now - waitingSince > WAIT_MS;
  const points: MapPoint[] = [
    ...(pos ? [{ id: me.id, emoji: me.emoji, name: me.name, lat: pos.lat, lng: pos.lng, acc: pos.acc, me: true }] : []),
    ...(x.lat != null && x.lng != null ? [{ id: x.id, emoji: x.emoji, name: x.name, lat: x.lat, lng: x.lng, acc: x.acc }] : []),
  ];

  return (
    <div className={`sheet-wrap ${phase.className}`} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${x.name} 폰 찾기`}>
        <div className="grab" />
        <div className="sheet-head">
          <div className="avatar big">
            {x.emoji}
            <span className={`status ${online ? 'live' : ''}`} />
          </div>
          <div className="grow">
            <div className="name big">{x.name}의 폰</div>
            <div className="small muted">
              {online ? '🟢 지금 앱 켜져 있음' : '⚪ 앱 꺼져 있음'}
              {x.at ? ` · 위치 ${ago(x.at, now)}` : ''}
              {x.battery != null && ` · 🔋${x.battery}%`}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={`radar ${info ? `c-${info.c}` : ''} ${waitingSince && !timedOut ? 'pulsing' : ''}`}>
          {info ? (
            <>
              {compass && heading != null && info.c !== 'here' && (
                <div className="arrow" style={{ transform: `rotate(${info.b - heading}deg)` }}>
                  ▲
                </div>
              )}
              <div className="radar-num">
                {info.c === 'here' ? (
                  '바로 근처!'
                ) : (
                  <>
                    <PopNumber value={formatDistance(info.d)} />
                  </>
                )}
              </div>
              <div className="small">
                {info.c === 'here'
                  ? `오차 범위 안이에요 (±${Math.round((pos?.acc ?? 0) + (x.acc ?? 0))}m) — 같은 집 안일 수 있어요. 소리를 울려 보세요!`
                  : `나와의 거리 · 오차 ±${Math.round((pos?.acc ?? 0) + (x.acc ?? 0))}m`}
              </div>
            </>
          ) : (
            <div className="small">{!pos ? '내 위치를 먼저 잡는 중이에요…' : '이 폰의 위치를 아직 몰라요. "위치 요청"을 눌러 보세요.'}</div>
          )}
        </div>

        {waitingSince != null && (
          <p className={`small center ${timedOut ? 'warn' : 'muted'}`}>
            {timedOut ? '응답이 없어요. 그 폰에서 이 앱이 꺼져 있는 것 같아요 — 마지막 위치를 확인해 보세요.' : '📡 그 폰에 신호 보내는 중…'}
          </p>
        )}

        <div className="actions">
          <button className="btn" onClick={() => onFind(false)}>
            📍 위치 요청
          </button>
          {ringing ? (
            <button
              className="btn danger"
              onClick={() => {
                onStop();
                setRinging(false);
              }}
            >
              🔕 소리 끄기
            </button>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                onFind(true);
                setRinging(true);
              }}
            >
              🔔 소리 울리기
            </button>
          )}
        </div>

        {info && info.c !== 'here' && !compass && (
          <button
            className="link"
            onClick={async () => {
              if (await askCompass()) setCompass(true);
            }}
          >
            🧭 나침반으로 방향 보기
          </button>
        )}

        {points.length > 0 && <FamilyMap points={points} focus={x.id} className="map-small" />}

        <button className="link danger-text" onClick={onRemove}>
          목록에서 빼기
        </button>
      </div>
    </div>
  );
}

/* ───────────── 초대 ───────────── */

function InviteSheet({ open, code, onClose, onLeave }: { open: boolean; code: string; onClose: () => void; onLeave: () => void }) {
  const phase = usePresence(open, '--modal-close-dur');
  const [copied, setCopied] = useState(false);
  if (!phase.mounted) return null;
  const url = inviteUrl(code);

  const share = async () => {
    track('phone-finder', 'invite');
    const text = '우리 가족 폰 찾기에 등록해 줘! 링크 열고 이름만 넣으면 돼요 📱';
    if (navigator.share) {
      try {
        await navigator.share({ title: '우리집 폰 찾기', text, url });
        return;
      } catch {
        /* 취소 */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 복사 실패 */
    }
  };

  return (
    <div className={`sheet-wrap ${phase.className}`} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="가족 초대">
        <div className="grab" />
        <h2>가족 초대</h2>
        <p className="muted small">가족 폰에서 이 링크를 열고 이름만 넣으면 서로 찾을 수 있어요. 코드는 가족끼리만 공유하세요.</p>
        <div className="code-box">{code.replace(/(.{4})/g, '$1 ').trim()}</div>
        <button className="btn primary big" onClick={share}>
          {copied ? '링크 복사됨 ✓' : '초대 링크 보내기'}
        </button>
        <button
          className="link danger-text"
          onClick={() => {
            onClose();
            onLeave();
          }}
        >
          이 가족에서 나가기 (다른 코드로 참여)
        </button>
      </div>
    </div>
  );
}

/* ───────────── 울리는 중 ───────────── */

function RingOverlay({ by, onFound }: { by: Member | null; onFound: () => void }) {
  return (
    <div className="ring" onClick={onFound}>
      <div className="ring-emoji">📢</div>
      <div className="ring-title">여기 있어요!</div>
      <div className="ring-sub">{by ? `${by.emoji} ${by.name}님이 이 폰을 찾고 있어요` : '가족이 이 폰을 찾고 있어요'}</div>
      <button className="btn ring-btn">찾았어요 👋</button>
    </div>
  );
}
