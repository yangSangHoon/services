import { authErrorMessage, isGuest, signInWithEmail, signOut, signUpWithEmail, useSession } from '@lab/core';
import { track } from '@lab/core/track';
import { useState } from 'react';
import { isInApp, isIOS, isStandalone, useInstallPrompt } from '../lib/install';
import type { Profile } from '../lib/social';

const APP_URL = 'https://yangsanghoon.github.io/services/moments/';

export function Settings({
  profile,
  onProfile,
  onClose,
  waiting,
  syncError,
  onRetry,
}: {
  profile: Profile | null;
  onProfile: () => void;
  onClose: () => void;
  waiting: number;
  syncError: string;
  onRetry: () => void;
}) {
  const { session } = useSession();
  const install = useInstallPrompt();
  const [copied, setCopied] = useState(false);
  const ios = isIOS();

  const copy = async () => {
    await navigator.clipboard.writeText(APP_URL).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h2>⚡ 1초 만에 여는 법</h2>
        {isInApp() && <p className="warn">지금은 카카오톡/인스타 안의 브라우저예요. 오른쪽 위 ⋮ 에서 <b>다른 브라우저로 열기</b>를 눌러야 홈 화면에 둘 수 있어요.</p>}

        {isStandalone() ? (
          <p className="ok">✅ 홈 화면 앱으로 쓰고 있어요. 아이콘 누르면 바로 쓰는 화면이에요.</p>
        ) : install ? (
          <button
            className="btn primary block"
            onClick={async () => {
              if (await install()) track('moments', 'install');
            }}
          >
            📲 홈 화면에 앱으로 설치
          </button>
        ) : (
          <ol className="steps">
            {ios ? (
              <>
                <li>
                  Safari 아래쪽 <b>공유 버튼(□↑)</b> 누르기
                </li>
                <li>
                  <b>홈 화면에 추가</b> → 추가
                </li>
              </>
            ) : (
              <>
                <li>
                  브라우저 메뉴 <b>⋮</b> 누르기
                </li>
                <li>
                  <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>
                </li>
              </>
            )}
          </ol>
        )}

        {ios ? (
          <details className="tip" open>
            <summary>🔥 더 빠르게: 아이폰 뒷면 두 번 톡톡</summary>
            <ol className="steps">
              <li>
                <b>단축어</b> 앱 → ＋ → <b>URL 열기</b> 동작 추가, 아래 주소 붙여넣기
              </li>
              <li>
                <b>설정 → 손쉬운 사용 → 터치 → 뒷면 탭 → 이중 탭</b>에서 그 단축어 선택
              </li>
              <li>이제 폰 뒤를 두 번 두드리면 바로 쓰는 화면. (액션 버튼이 있는 아이폰이면 액션 버튼에 연결해도 돼요)</li>
            </ol>
            <button className="url" onClick={copy}>
              {copied ? '복사했어요 ✓' : APP_URL}
            </button>
          </details>
        ) : (
          <details className="tip" open>
            <summary>🔥 사진에서 바로 보내기</summary>
            <p>앱으로 설치하면 갤러리에서 사진 <b>공유 → 찰나</b>를 고를 수 있어요. 사진이 붙은 채로 쓰는 화면이 열려요.</p>
          </details>
        )}

        <h2>🌏 공개 프로필</h2>
        <button className="profile-row" onClick={onProfile}>
          <span className="avatar">{profile?.avatar ?? '＋'}</span>
          <span>
            <b>{profile?.nickname ?? '프로필 만들기'}</b>
            <small className="muted">{profile ? '내 프로필 · 구독자 보기' : '공개 찰나를 쓰거나 구독하려면'}</small>
          </span>
          <span className="arrow">→</span>
        </button>

        <h2>☁️ 내 기록</h2>
        <Account />
        {waiting > 0 && (
          <p className="muted small">
            기기에만 있는 순간 {waiting}개 · 인터넷이 연결되면 자동으로 올라가요{' '}
            <button className="link" onClick={onRetry}>
              지금 올리기
            </button>
          </p>
        )}
        {syncError && <p className="warn small">업로드가 막혔어요 ({syncError}). 잠시 후 다시 시도해 주세요.</p>}
        {session && !isGuest(session) && (
          <button className="link small" onClick={() => signOut()}>
            로그아웃
          </button>
        )}
        <button className="btn ghost block" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

/** 게스트 → 이메일 연결(기록 그대로 유지). 다른 기기에서는 로그인 */
function Account() {
  const { session } = useSession();
  const [mode, setMode] = useState<'link' | 'login' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const guest = !session || isGuest(session);

  if (!guest) return <p className="ok">✅ {session.user.email} 계정에 안전하게 보관 중. 다른 기기에서도 같은 계정으로 로그인하면 보여요.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('이메일 모양이 조금 이상해요.');
    if (password.length < 6) return setError('비밀번호는 6자 이상이에요.');
    setBusy(true);
    setError('');
    try {
      if (mode === 'link') {
        const { needsEmailConfirm } = await signUpWithEmail(email.trim(), password);
        if (needsEmailConfirm) setError('메일함의 인증 링크를 눌러 주세요.');
        else track('moments', 'link-account');
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(authErrorMessage(err) ?? '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account">
      <p>
        지금은 <b>이 기기에서만</b> 열리는 기록장이에요. 폰을 바꾸거나 브라우저 기록을 지우면 못 찾을 수 있어요.
      </p>
      {!mode ? (
        <div className="row-btns">
          <button className="btn primary" onClick={() => setMode('link')}>
            이메일 연결하기
          </button>
          <button className="btn ghost" onClick={() => setMode('login')}>
            이미 계정 있어요
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" autoComplete="email" />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 6자 이상"
            autoComplete={mode === 'link' ? 'new-password' : 'current-password'}
          />
          {error && <p className="warn small">{error}</p>}
          {mode === 'login' && <p className="muted small">로그인하면 그 계정의 기록이 보여요. 지금 게스트로 남긴 기록은 이 기기의 게스트 계정에 남아요.</p>}
          <div className="row-btns">
            <button type="button" className="btn ghost" onClick={() => setMode(null)}>
              취소
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? '…' : mode === 'link' ? '연결하고 지키기' : '로그인'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
