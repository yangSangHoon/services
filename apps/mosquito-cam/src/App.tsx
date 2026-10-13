import { PopNumber, usePresence } from '@lab/core/motion';
import { useEffect, useRef, useState } from 'react';
import { closeSession, Engine, openSession, type Recording, type Session } from './engine';
import { MODES, type Mode } from './mosquito';

const MAX_SEC = 60;
const IN_APP = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) return <Intro onStart={setSession} />;
  return (
    <Camera
      session={session}
      onExit={() => {
        closeSession(session);
        setSession(null);
      }}
    />
  );
}

// ───────── 첫 화면

function Intro({ onStart }: { onStart: (s: Session) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inApp = IN_APP.test(navigator.userAgent);
  const kakao = /KAKAOTALK/i.test(navigator.userAgent);
  const supported = Boolean(navigator.mediaDevices?.getUserMedia) && 'MediaRecorder' in window;

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      onStart(await openSession());
    } catch (e) {
      const name = (e as Error).name;
      setError(
        name === 'NotAllowedError'
          ? '카메라·마이크 권한이 막혀 있어요. 주소창의 설정에서 허용한 뒤 다시 눌러주세요.'
          : name === 'NotFoundError'
            ? '카메라를 찾지 못했어요.'
            : '카메라를 켜지 못했어요. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="intro">
      <div className="sky" aria-hidden>
        <span className="flyer">🦟</span>
      </div>
      <h1>
        앵앵 몰카
        <small>자는 사람 귓가에 모기 소리를, 반응은 영상으로</small>
      </h1>

      <ol className="steps">
        <li>
          <b>1</b> 카메라를 켜면 화면에 모기가 날아다녀요
        </li>
        <li>
          <b>2</b> 스피커에서 진짜 같은 앵~ 소리가 나요
        </li>
        <li>
          <b>3</b> 반응을 찍고, 모기는 톡 쳐서 잡아요
        </li>
      </ol>

      {inApp && (
        <div className="notice">
          카카오톡·인스타 같은 앱 안의 브라우저에서는 카메라가 안 될 수 있어요.
          {kakao ? (
            <a className="notice-btn" href={`kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`}>
              기본 브라우저로 열기
            </a>
          ) : (
            <span> 오른쪽 위 메뉴에서 ‘다른 브라우저로 열기’를 눌러주세요.</span>
          )}
        </div>
      )}

      {supported ? (
        <button className="cta" onClick={start} disabled={busy}>
          {busy ? '카메라 켜는 중…' : '🎥 카메라 켜기'}
        </button>
      ) : (
        <p className="notice">이 브라우저는 카메라 녹화를 지원하지 않아요. 최신 Safari나 Chrome에서 열어주세요.</p>
      )}
      {error && <p className="error">{error}</p>}

      <p className="fine">
        영상은 내 기기 안에서만 만들어지고 어디에도 올라가지 않아요.
        <br />
        무음 모드에서는 소리가 작을 수 있어요. 운전 중인 사람에겐 하지 마세요 🙏
      </p>
    </main>
  );
}

// ───────── 촬영 화면

type Result = Recording & { url: string; kills: number };

function Camera({ session, onExit }: { session: Session; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [mode, setMode] = useState<Mode>('ear');
  const [buzzOn, setBuzzOn] = useState(true);
  const [kills, setKills] = useState(0);
  const killsRef = useRef(0);
  killsRef.current = kills;
  const [recStart, setRecStart] = useState<{ at: number; kills: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [hint, setHint] = useState(true);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const engine = new Engine(canvasRef.current!, videoRef.current!, session);
    engine.onKill = () => setKills((k) => k + 1);
    engineRef.current = engine;
    return () => engine.dispose();
  }, [session]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.mode = mode;
    e.buzzOn = buzzOn;
    e.muted = Boolean(result);
  }, [mode, buzzOn, result]);

  const stop = async () => {
    const e = engineRef.current!;
    if (!e.recording || !recStart) return;
    const rec = await e.stopRecording();
    setResult({ ...rec, url: URL.createObjectURL(rec.blob), kills: killsRef.current - recStart.kills });
    setRecStart(null);
  };

  useEffect(() => {
    if (!recStart) return;
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - recStart.at) / 1000);
      setElapsed(sec);
      if (sec >= MAX_SEC) void stop();
    }, 250);
    return () => clearInterval(id);
    // stop 은 매 렌더 새로 만들어지지만 recStart 기준으로만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recStart]);

  const record = () => {
    const e = engineRef.current!;
    if (e.recording) return void stop();
    e.startRecording();
    setElapsed(0);
    setRecStart({ at: Date.now(), kills });
    setHint(false);
  };

  const flip = async () => {
    setFlipping(true);
    try {
      await engineRef.current!.flip();
    } finally {
      setFlipping(false);
    }
  };

  const retake = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  };

  const recording = Boolean(recStart);

  return (
    <main className="cam">
      <video ref={videoRef} className="src-video" playsInline muted autoPlay />
      <canvas ref={canvasRef} onPointerDown={(e) => engineRef.current?.tap(e.clientX, e.clientY)} />

      <div className="cam-top">
        <button className="icon-btn" onClick={onExit} aria-label="끝내기" disabled={recording}>
          ✕
        </button>
        <div className="cam-status">
          {recording ? (
            <span className="rec-pill">
              <i /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          ) : (
            kills > 0 && (
              <span className="kill-pill">
                🖐️ 잡은 모기 <PopNumber value={kills} />
              </span>
            )
          )}
        </div>
        <div className="cam-actions">
          <button
            className="icon-btn"
            onClick={() => setBuzzOn((v) => !v)}
            aria-label={buzzOn ? '모기 소리 끄기' : '모기 소리 켜기'}
          >
            {buzzOn ? '🔊' : '🔇'}
          </button>
          <button className="icon-btn" onClick={flip} disabled={flipping} aria-label="카메라 전환">
            🔄
          </button>
        </div>
      </div>

      {hint && <p className="hint">화면 속 모기를 톡 치면 잡혀요 🖐️</p>}

      <div className="cam-bottom">
        <div className="modes" role="radiogroup" aria-label="모기 움직임">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              className={`mode ${mode === m ? 'is-on' : ''}`}
              onClick={() => setMode(m)}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>
        <button
          className={`rec-btn ${recording ? 'is-rec' : ''}`}
          onClick={record}
          aria-label={recording ? '녹화 멈추기' : '녹화 시작'}
        >
          <span />
        </button>
      </div>

      <ResultSheet result={result} onRetake={retake} />
    </main>
  );
}

// ───────── 결과

function ResultSheet({ result, onRetake }: { result: Result | null; onRetake: () => void }) {
  const sheet = usePresence(Boolean(result));
  const last = useRef(result);
  if (result) last.current = result;
  const r = last.current;
  if (!sheet.mounted || !r) return null;

  const fileName = `aengaeng-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.${r.ext}`;
  const file = new File([r.blob], fileName, { type: r.blob.type });
  const canShare = Boolean(navigator.canShare?.({ files: [file] }));

  const share = async () => {
    try {
      await navigator.share({ files: [file], title: '앵앵 몰카' });
    } catch {
      /* 공유 취소 */
    }
  };

  return (
    <div className={`sheet-wrap ${sheet.className}`}>
      <section className="sheet" role="dialog" aria-label="찍은 영상">
        <video src={r.url} className="preview" controls autoPlay playsInline loop />
        {r.kills > 0 && <p className="sheet-kills">이번 영상에서 모기 {r.kills}마리 잡았어요 🖐️</p>}
        <div className="sheet-actions">
          {canShare ? (
            <button className="cta" onClick={share}>
              📤 공유·저장
            </button>
          ) : (
            <a className="cta" href={r.url} download={fileName}>
              ⬇️ 영상 저장
            </a>
          )}
          <button className="ghost" onClick={onRetake}>
            다시 찍기
          </button>
        </div>
        <p className="tip">
          <b>참고로</b> 휴대폰 ‘모기 퇴치 소리’ 앱은 효과가 입증되지 않았어요. 실험에서 물림을 막지 못했고, 오히려 늘었다는
          연구도 있어요. 진짜로 막으려면 기피제(디트·이카리딘)와 모기장, 방충망이 확실해요.
        </p>
      </section>
    </div>
  );
}
