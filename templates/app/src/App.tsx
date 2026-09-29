import { isConfigured, isGuest, signInAsGuest, signOut, useSession } from '@lab/core';

/**
 * 인증은 @lab/core 공용 기능을 쓴다 (모든 앱이 계정을 공유).
 * - 회원: signUpWithEmail / signInWithEmail   - 게스트: signInAsGuest (익명)
 * 참고 구현: apps/dream-market/src/components/Auth.tsx
 */
export default function App() {
  const { session, loading } = useSession();

  return (
    <main className="page">
      <div className="hero-emoji">__EMOJI__</div>
      <h1>__TITLE__</h1>
      <p className="muted">__DESC__</p>
      {!isConfigured ? (
        <p className="muted small">.env 설정이 필요해요</p>
      ) : loading ? null : session ? (
        <p className="muted small">
          {isGuest(session) ? '게스트' : session.user.email} · <button onClick={() => signOut()}>나가기</button>
        </p>
      ) : (
        <button onClick={() => signInAsGuest()}>게스트로 시작</button>
      )}
    </main>
  );
}
