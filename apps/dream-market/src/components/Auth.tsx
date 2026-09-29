import { signInAsGuest, signInWithEmail, signUpWithEmail } from '@lab/core';
import { useState } from 'react';
import { randomNickname } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { BackIcon, Stars } from './Backdrops';

type View = 'landing' | 'auth' | 'nick';
export type AuthMode = 'signup' | 'login';

/** 로그인 전: 첫 화면 → 회원가입/로그인 또는 게스트 닉네임 */
export function AuthScreen() {
  const [view, setView] = useState<View>('landing');
  const [mode, setMode] = useState<AuthMode>('signup');

  if (view === 'auth') return <AuthPage mode={mode} onMode={setMode} onBack={() => setView('landing')} />;
  if (view === 'nick')
    return (
      <div className="app">
        <NickPage onBack={() => setView('landing')} onSubmit={(nickname) => signInAsGuest({ nickname }).then(() => undefined)} />
      </div>
    );

  const go = (m: AuthMode) => {
    setMode(m);
    setView('auth');
  };

  return (
    <main className="dawn">
      <Stars />
      <div className="cloud" style={{ left: -60, bottom: '18%', width: 260, height: 90 }} />
      <div className="cloud" style={{ right: -40, bottom: '8%', width: 220, height: 74, opacity: 0.9, animationDuration: '15s', animationDirection: 'reverse' }} />
      <div className="landing">
        <div className="landing-top">
          <span className="chip-glass">✦ 오늘 밤 장 열림</span>
          <span style={{ opacity: 0.9 }}>Dream Market</span>
        </div>
        <div className="landing-hero">
          <div className="moon" />
          <h1 className="logo">꿈사꿈팔</h1>
          <div>
            <p style={{ fontSize: 17 }}>남의 꿈을 사고, 내 꿈을 파는 시장.</p>
            <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
              진짜 꿨는지는 아무도 몰라요 🤫
            </p>
          </div>
        </div>
        <div className="landing-actions">
          <button className="btn btn-butter" onClick={() => go('signup')}>
            🎁 가입하고 1억 코인 받기
          </button>
          <button className="btn btn-glass" onClick={() => go('login')}>
            이미 계정이 있어요
          </button>
          <button className="btn-text" onClick={() => setView('nick')}>
            <u>가입 없이 구경하기</u>
            <small>게스트는 무료 꿈만 주고받을 수 있어요</small>
          </button>
        </div>
      </div>
    </main>
  );
}

interface AuthPageProps {
  mode: AuthMode;
  onMode: (m: AuthMode) => void;
  onBack: () => void;
  /** 게스트 → 회원 전환 중이면 true (닉네임은 이미 있음) */
  upgrading?: boolean;
  onDone?: () => void;
}

/** 회원가입 / 로그인 */
export function AuthPage({ mode, onMode, onBack, upgrading, onDone }: AuthPageProps) {
  const [nickname, setNickname] = useState(randomNickname);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signup = mode === 'signup';
  const askNickname = signup && !upgrading;

  const switchMode = (m: AuthMode) => {
    setError('');
    onMode(m);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (askNickname && !nickname.trim()) return setError('닉네임을 정해주세요. 🎲를 눌러도 돼요.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('이메일 모양이 조금 이상해요.');
    if (password.length < 6) return setError('비밀번호는 6자 이상이에요.');
    setError('');
    setLoading(true);
    try {
      if (signup) {
        const { needsEmailConfirm } = await signUpWithEmail(email.trim(), password, askNickname ? { nickname: nickname.trim() } : undefined);
        if (needsEmailConfirm) return setSentTo(email.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onDone?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <form className="page" onSubmit={submit} noValidate>
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <div className="page-head">
          <div className="emoji">{signup ? '🎁' : '🌙'}</div>
          <h1>{signup ? '꿈 시장 입주하기' : '다시 오셨군요'}</h1>
          <p>{signup ? '가입하면 첫 계시로 1억 코인을 드려요.' : '잠든 사이 코인이 늘진 않았어요.'}</p>
        </div>

        {sentTo ? (
          <p className="form-card sent">
            <span className="emoji">📮</span>
            <strong>{sentTo}</strong>로 인증 메일을 보냈어요.
            <br />
            메일 속 링크를 누르면 1억 코인이 기다리고 있어요!
          </p>
        ) : (
          <>
            {!upgrading && (
              <div className="seg lav">
                <button type="button" className={signup ? 'on' : ''} onClick={() => switchMode('signup')}>
                  회원가입
                </button>
                <button type="button" className={signup ? '' : 'on'} onClick={() => switchMode('login')}>
                  로그인
                </button>
              </div>
            )}
            <div className="form-card">
              {askNickname && (
                <label className="field">
                  닉네임
                  <div className="row">
                    <input className="input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder="시장에서 불릴 이름" autoComplete="off" />
                    <button type="button" className="btn-dice" onClick={() => setNickname(randomNickname())}>
                      🎲 랜덤
                    </button>
                  </div>
                </label>
              )}
              <label className="field">
                이메일
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dream@example.com" autoComplete="email" />
              </label>
              <label className="field">
                비밀번호
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                />
              </label>
              {error && <p className="err">{error}</p>}
            </div>
            <button className="btn btn-butter btn-block" disabled={loading}>
              {loading ? '꿈나라 문 여는 중…' : signup ? '가입하고 1억 코인 받기' : '로그인'}
            </button>
            {upgrading && <p className="carry-note">지금까지 게스트로 주고받은 꿈은 그대로 이어져요 💜</p>}
          </>
        )}
      </form>
    </div>
  );
}

/** 게스트 입장(또는 프로필이 없는 계정)의 닉네임 정하기 */
export function NickPage({ onBack, onSubmit }: { onBack?: () => void; onSubmit: (nickname: string) => Promise<void> }) {
  const [nickname, setNickname] = useState(randomNickname);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return setError('이름이 있어야 시장에 들어갈 수 있어요.');
    setLoading(true);
    try {
      await onSubmit(nickname.trim());
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  return (
    <form className="page" onSubmit={submit}>
      {onBack && (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
      )}
      <div className="page-head">
        <div className="emoji">🪪</div>
        <h1>이름부터 정해요</h1>
        <p>시장에서 이 이름으로 불려요. 나중에 가입해도 그대로 이어져요.</p>
      </div>
      <div className="pass">
        <span className="pass-label">✦ 꿈 시장 임시 출입증</span>
        <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" autoComplete="off" />
        <button type="button" onClick={() => setNickname(randomNickname())}>
          🎲 다른 이름 굴리기
        </button>
      </div>
      {error && <p className="err">{error}</p>}
      <button className="btn btn-lav btn-block" disabled={loading}>
        {loading ? '출입증 발급 중…' : '이 이름으로 구경하기'}
      </button>
    </form>
  );
}
