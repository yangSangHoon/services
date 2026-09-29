import { ensureSession, isConfigured } from '@lab/core';
import { useEffect, useState } from 'react';

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isConfigured) ensureSession().then((s) => setUserId(s.user.id));
  }, []);

  return (
    <main className="page">
      <div className="hero-emoji">__EMOJI__</div>
      <h1>__TITLE__</h1>
      <p className="muted">__DESC__</p>
      <p className="muted small">{isConfigured ? `접속 중: ${userId?.slice(0, 8) ?? '…'}` : '.env 설정이 필요해요'}</p>
    </main>
  );
}
