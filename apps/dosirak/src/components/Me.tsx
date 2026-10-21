import { PopNumber } from '@lab/core/motion';
import { track } from '@lab/core/track';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyLog, photoUrl, type Profile } from '../lib/api';
import { parseDay, streak, today, won, ymd } from '../lib/format';
import { go } from '../lib/route';
import { makeShareCard } from '../lib/shareCard';

type Log = Awaited<ReturnType<typeof fetchMyLog>>;

/** 내 도시락: 이번 달 아낀 돈 · 연속 기록 · 달력 · 자랑 카드 */
export function Me({ profile, justSaved, onEdit }: { profile: Profile; justSaved: number | null; onEdit: () => void }) {
  const [log, setLog] = useState<Log | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [making, setMaking] = useState(false);

  useEffect(() => {
    fetchMyLog().then(setLog).catch(() => setLog([]));
  }, []);

  const stats = useMemo(() => {
    const list = log ?? [];
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const inMonth = list.filter((p) => p.eaten_on.startsWith(key));
    const byDay = new Map<string, Log[number]>();
    for (const p of list) if (!byDay.has(p.eaten_on) || (!byDay.get(p.eaten_on)!.photo_path && p.photo_path)) byDay.set(p.eaten_on, p);
    return {
      monthSaved: inMonth.reduce((s, p) => s + p.saved, 0),
      monthCount: inMonth.length,
      total: list.reduce((s, p) => s + p.saved, 0),
      count: list.length,
      streak: streak(new Set(list.map((p) => p.eaten_on))),
      byDay,
      inMonth,
    };
  }, [log, month]);

  const cells = useMemo(() => {
    const first = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  }, [month]);

  const isThisMonth = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();

  const share = async () => {
    setMaking(true);
    try {
      const blob = await makeShareCard({
        profile,
        month,
        saved: stats.monthSaved,
        count: stats.monthCount,
        streak: stats.streak,
        photos: stats.inMonth.flatMap((p) => (p.photo_path ? [photoUrl(p.photo_path)!] : [])).slice(0, 6),
      });
      const file = new File([blob], 'dosirak-report.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: '이번 달 도시락 리포트 🍱 #싸왔어' });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dosirak-report.png';
        a.click();
      }
      track('dosirak', 'share-card');
    } catch {
      /* 공유 취소 */
    } finally {
      setMaking(false);
    }
  };

  return (
    <div className="page me">
      {justSaved !== null && (
        <div className="celebrate">
          <span className="big-emoji">🎉</span>
          <b>싸왔다! {justSaved > 0 ? `오늘 ${won(justSaved)} 아꼈어요` : '오늘도 기록 완료'}</b>
        </div>
      )}

      <div className="me-head">
        <span className="av lg">{profile.avatar}</span>
        <div>
          <b>{profile.nickname}</b>
          <button className="link small" onClick={onEdit}>
            점심값 기준 {won(profile.lunch_price)} · 수정
          </button>
        </div>
      </div>

      <section className="saved-card">
        <span className="label">{isThisMonth ? '이번 달' : `${month.getMonth() + 1}월`} 아낀 점심값</span>
        <div className="saved-num">
          <PopNumber value={stats.monthSaved.toLocaleString('ko-KR')} />
          <small>원</small>
        </div>
        <div className="mini-stats">
          <span>
            🍱 <b>{stats.monthCount}</b>번
          </span>
          <span>
            🔥 연속 <b>{stats.streak}</b>일
          </span>
          <span>
            누적 <b>{won(stats.total)}</b>
          </span>
        </div>
        <button className="btn light block" onClick={share} disabled={making || stats.monthCount === 0}>
          {making ? '카드 만드는 중…' : '📸 이번 달 리포트 자랑하기'}
        </button>
      </section>

      <section className="calendar">
        <div className="cal-head">
          <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            ‹
          </button>
          <b>
            {month.getFullYear()}년 {month.getMonth() + 1}월
          </b>
          <button className="icon-btn" disabled={isThisMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            ›
          </button>
        </div>
        <div className="cal-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <span key={d} className="cal-w">
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const p = stats.byDay.get(day);
            const src = p ? photoUrl(p.photo_path) : null;
            const isToday = day === today();
            return (
              <button key={day} className={`cal-d ${p ? 'has' : ''} ${isToday ? 'today' : ''}`} onClick={() => (p ? go(`#/p/${p.id}`) : isToday && go('#/new'))} disabled={!p && !isToday}>
                {src ? <img src={src} alt="" loading="lazy" /> : p ? <span className="cal-emoji">🍱</span> : null}
                <span className="cal-n">{parseDay(day).getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      {log && log.length === 0 && (
        <p className="muted center">
          아직 기록이 없어요.
          <br />
          내일 도시락 싸 오면 여기에 쌓여요 🍱
        </p>
      )}

      <button className="btn ghost block" onClick={() => go(`#/u/${profile.user_id}`)}>
        내가 자랑한 도시락 보기 →
      </button>
    </div>
  );
}
