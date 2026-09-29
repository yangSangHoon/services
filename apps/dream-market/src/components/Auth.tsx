import { signInAsGuest, signInWithEmail, signUpWithEmail } from '@lab/core';
import { useState } from 'react';
import { joinDreamWorld } from '../lib/api';
import { randomNickname } from '../lib/dreamMeta';
import { friendlyError } from '../lib/format';
import { toast } from '../lib/toast';
import type { Profile } from '../lib/types';

type Mode = 'start' | 'signup' | 'login';

/** 로그인 전 첫 화면: 회원가입 / 로그인 / 게스트 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('start');
  const [loading, setLoading] = useState(false);

  const enterAsGuest = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (err) {
      toast(friendlyError(err), 'error');
      setLoading(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="moon">🌙</div>
      <h1 className="brand-title">꿈사꿈팔</h1>
      <p className="tagline">
        남의 꿈을 사고, 내 꿈을 파는 시장.
        <br />
        <small>진짜 꿨는지는 아무도 몰라요 🤫</small>
      </p>

      <div className="auth-box">
        {mode === 'start' && (
          <>
            <button className="btn-primary btn-lg" onClick={() => setMode('signup')}>
              🎁 가입하고 1억 코인 받기
            </button>
            <button className="btn-ghost btn-lg" onClick={() => setMode('login')}>
              이미 계정이 있어요
            </button>
            <button className="btn-link" onClick={enterAsGuest} disabled={loading}>
              {loading ? '살금살금 입장 중…' : '가입 없이 구경하기'}
              <small>게스트는 무료 꿈만 주고받을 수 있어요</small>
            </button>
          </>
        )}
        {mode === 'signup' && <SignupForm askNickname onBack={() => setMode('start')} />}
        {mode === 'login' && <LoginForm onBack={() => setMode('start')} />}
      </div>
    </main>
  );
}

/** 회원가입 폼. 게스트로 로그인 중이면 그 계정을 정식 회원으로 전환한다 */
export function SignupForm({ askNickname, onBack, onDone }: { askNickname?: boolean; onBack?: () => void; onDone?: () => void }) {
  const [nickname, setNickname] = useState(randomNickname);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { needsEmailConfirm } = await signUpWithEmail(email.trim(), password, askNickname ? { nickname: nickname.trim() } : undefined);
      if (needsEmailConfirm) setSentTo(email.trim());
      else onDone?.();
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo)
    return (
      <div className="auth-sent">
        <div className="big-emoji">📮</div>
        <p>
          <strong>{sentTo}</strong>로 인증 메일을 보냈어요.
          <br />
          메일 속 링크를 누르면 1억 코인이 기다리고 있어요!
        </p>
      </div>
    );

  return (
    <form className="auth-form" onSubmit={submit}>
      {askNickname && (
        <label className="field">
          <span>꿈나라에서 쓸 이름</span>
          <div className="input-row">
            <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} autoComplete="off" />
            <button type="button" className="btn-ghost" onClick={() => setNickname(randomNickname())} title="랜덤 이름">
              🎲
            </button>
          </div>
        </label>
      )}
      <label className="field">
        <span>이메일</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="field">
        <span>비밀번호 (6자 이상)</span>
        <input type="password" value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      </label>
      <button className="btn-primary btn-lg" disabled={loading || (askNickname && !nickname.trim())}>
        {loading ? '꿈나라 주민등록 중…' : '가입하고 1억 받기'}
      </button>
      {onBack && (
        <button type="button" className="btn-link" onClick={onBack}>
          ← 뒤로
        </button>
      )}
    </form>
  );
}

function LoginForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      toast(friendlyError(err), 'error');
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span>이메일</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      <button className="btn-primary btn-lg" disabled={loading}>
        {loading ? '잠드는 중… 💤' : '로그인'}
      </button>
      <button type="button" className="btn-link" onClick={onBack}>
        ← 뒤로
      </button>
    </form>
  );
}

/** 프로필이 없는 계정(게스트 첫 입장 등)의 닉네임 정하기 */
export function NicknameStep({ guest, onDone }: { guest: boolean; onDone: (p: Profile) => void }) {
  const [nickname, setNickname] = useState(randomNickname);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      onDone(await joinDreamWorld(nickname.trim()));
    } catch (err) {
      toast(friendlyError(err), 'error');
      setLoading(false);
    }
  };

  return (
    <main className="onboarding">
      <div className="moon">{guest ? '👀' : '🌙'}</div>
      <h1 className="brand-title">이름을 정해주세요</h1>
      <p className="tagline">{guest ? '게스트는 무료 꿈만 주고받을 수 있어요.' : '꿈나라에서 불릴 이름이에요.'}</p>
      <form className="auth-box auth-form" onSubmit={submit}>
        <div className="input-row">
          <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} autoComplete="off" />
          <button type="button" className="btn-ghost" onClick={() => setNickname(randomNickname())} title="랜덤 이름">
            🎲
          </button>
        </div>
        <button className="btn-primary btn-lg" disabled={loading || !nickname.trim()}>
          {loading ? '잠드는 중… 💤' : '꿈나라 입장하기'}
        </button>
      </form>
    </main>
  );
}
