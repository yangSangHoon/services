import { useEffect, useState } from 'react';
import { getProfile, type Profile } from '../lib/api';
import { back } from '../lib/route';
import { Feed } from './Feed';

export function UserPage({ id, needProfile }: { id: string; needProfile: () => Promise<boolean> }) {
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  useEffect(() => {
    getProfile(id).then(setP).catch(() => setP(null));
  }, [id]);
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => back()}>
          ←
        </button>
        {p && (
          <div className="author">
            <span className="av lg">{p.avatar}</span>
            <b className="big">{p.nickname}</b>
          </div>
        )}
      </div>
      {p === null && <p className="muted center">사용자를 찾을 수 없어요.</p>}
      {p && <Feed mode="user" user={id} needProfile={needProfile} empty="자랑한 도시락이 아직 없어요." />}
    </div>
  );
}
