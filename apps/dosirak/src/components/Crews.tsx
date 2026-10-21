import { track } from '@lab/core/track';
import { useEffect, useState } from 'react';
import {
  clearDish,
  createCrew,
  fetchCrew,
  fetchDishes,
  friendlyError,
  joinCrew,
  leaveCrew,
  myCrews,
  previewCrew,
  setDish,
  type Crew,
  type Dish,
  type Profile,
} from '../lib/api';
import { dayLabel, today, weekday, weekDays } from '../lib/format';
import { back, go } from '../lib/route';
import { Feed } from './Feed';

const inviteUrl = (code: string) => `${location.origin}${location.pathname}#/join/${code}`;

/** 도시락 멤버 목록 · 만들기 · 코드로 들어가기 */
export function Crews() {
  const [list, setList] = useState<(Crew & { members: number })[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    myCrews().then(setList).catch(() => setList([]));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('모임 이름을 정해 주세요.');
    setBusy(true);
    try {
      const c = await createCrew(name);
      track('dosirak', 'crew-create');
      go(`#/crew/${c.id}`);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="hero">
        <span className="big-emoji">👥🍱</span>
        <h1>도시락 멤버</h1>
        <p className="muted">
          동료끼리 반찬을 하나씩 넉넉히 싸 오면
          <br />
          <b>매일 반찬 뷔페</b>가 돼요. 누가 뭘 싸 올지 여기서 정해요.
        </p>
      </div>

      {list && list.length > 0 && (
        <section className="crew-list">
          {list.map((c) => (
            <button key={c.id} className="crew-item" onClick={() => go(`#/crew/${c.id}`)}>
              <b>{c.name}</b>
              <span className="muted small">멤버 {c.members}명</span>
              <span className="arrow">→</span>
            </button>
          ))}
        </section>
      )}

      <form className="card-box" onSubmit={create}>
        <h2>새 모임 만들기</h2>
        <div className="row">
          <input className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="예: 마케팅팀 도시락단" />
          <button className="btn primary" disabled={busy}>
            만들기
          </button>
        </div>
      </form>

      <form
        className="card-box"
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().split('/').pop();
          if (c) go(`#/join/${c}`);
        }}
      >
        <h2>초대 코드로 들어가기</h2>
        <div className="row">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="코드 8자리 또는 초대 링크" />
          <button className="btn ghost">입장</button>
        </div>
      </form>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

export function Join({ code }: { code: string }) {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof previewCrew>> | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    previewCrew(code)
      .then((i) => {
        if (i?.joined) go(`#/crew/${i.id}`);
        else setInfo(i);
      })
      .catch(() => setInfo(null));
  }, [code]);

  if (info === undefined) return <p className="muted center">🍱 초대장 여는 중…</p>;
  if (info === null) return <p className="muted center">초대 코드가 맞지 않아요.</p>;
  return (
    <div className="page">
      <div className="hero">
        <span className="big-emoji">💌</span>
        <h1>{info.name}</h1>
        <p className="muted">도시락 멤버 {info.members}명이 기다리고 있어요</p>
      </div>
      <button
        className="btn primary block big"
        onClick={async () => {
          try {
            const id = await joinCrew(code);
            track('dosirak', 'crew-join');
            go(`#/crew/${id}`);
          } catch (err) {
            setError(friendlyError(err));
          }
        }}
      >
        같이 먹을래요 🙋
      </button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

/** 반찬 당번표: 이번 주 월~금, 멤버별로 "내가 싸 올 반찬" */
export function CrewBoard({ id, me, needProfile }: { id: string; me: string | null; needProfile: () => Promise<boolean> }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCrew>> | undefined>(undefined);
  const [week, setWeek] = useState(0);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [edit, setEdit] = useState<string | null>(null);
  const [dish, setDishText] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'board' | 'feed'>('board');
  const days = weekDays(week);

  useEffect(() => {
    fetchCrew(id).then(setData).catch(() => setData(null));
  }, [id]);
  useEffect(() => {
    fetchDishes(id, days[0], days[4]).then(setDishes).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, week]);

  if (data === undefined) return <p className="muted center">🍱 불러오는 중…</p>;
  if (data === null)
    return (
      <div className="page">
        <p className="muted center">멤버가 아니거나 없는 모임이에요.</p>
      </div>
    );
  const { crew, members } = data;
  const people = new Map<string, Profile>(members.map((m) => [m.user_id, m]));

  const invite = async () => {
    const url = inviteUrl(crew.code);
    const text = `🍱 "${crew.name}" 도시락 멤버 할래요? 반찬 하나씩 싸 와서 같이 먹어요!`;
    try {
      if (navigator.share) await navigator.share({ title: '싸왔어? 도시락 멤버', text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
      track('dosirak', 'crew-invite');
    } catch {
      /* 닫음 */
    }
  };

  const openEdit = async (day: string) => {
    if (!(await needProfile())) return;
    const mine = dishes.find((d) => d.day === day && d.user_id === me);
    setDishText(mine?.dish ?? '');
    setNote(mine?.note ?? '');
    setEdit(day);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (dish.trim()) await setDish(id, edit, dish, note);
    else await clearDish(id, edit);
    setDishes(await fetchDishes(id, days[0], days[4]));
    setEdit(null);
    track('dosirak', 'dish');
  };

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => back('#/crew')}>
          ←
        </button>
        <h1>{crew.name}</h1>
      </div>

      <div className="members">
        {members.map((m) => (
          <span key={m.user_id} className="member" title={m.nickname}>
            <span className="av">{m.avatar}</span>
            <small>{m.nickname}</small>
          </span>
        ))}
        <button className="member add" onClick={invite}>
          <span className="av">＋</span>
          <small>{copied ? '복사됨!' : '초대'}</small>
        </button>
      </div>

      <div className="tabs">
        <button className={tab === 'board' ? 'on' : ''} onClick={() => setTab('board')}>
          🗓 반찬 당번
        </button>
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          🍱 우리 도시락
        </button>
      </div>

      {tab === 'board' ? (
        <>
          <div className="week-nav">
            <button className="icon-btn" disabled={week <= 0} onClick={() => setWeek(week - 1)}>
              ‹
            </button>
            <b>{week === 0 ? '이번 주' : week === 1 ? '다음 주' : `${week}주 뒤`}</b>
            <button className="icon-btn" disabled={week >= 3} onClick={() => setWeek(week + 1)}>
              ›
            </button>
          </div>
          <div className="board">
            {days.map((day) => {
              const list = dishes.filter((d) => d.day === day);
              const mine = list.find((d) => d.user_id === me);
              const isToday = day === today();
              return (
                <div key={day} className={`board-day ${isToday ? 'today' : ''}`}>
                  <div className="board-date">
                    <b>{weekday(day)}</b>
                    <small>{dayLabel(day)}</small>
                  </div>
                  <div className="board-dishes">
                    {list.length === 0 && <span className="muted small">아직 아무도 안 정했어요</span>}
                    {list.map((d) => (
                      <span key={d.id} className={`dish ${d.user_id === me ? 'mine' : ''}`}>
                        {people.get(d.user_id)?.avatar ?? '🍙'} {d.dish}
                        {d.note && <small> · {d.note}</small>}
                      </span>
                    ))}
                    {list.length > 1 && <span className="buffet">🎉 반찬 {list.length}가지 뷔페</span>}
                  </div>
                  <button className="chip" onClick={() => openEdit(day)}>
                    {mine ? '수정' : '＋ 나도'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="muted small center-tight">💡 각자 반찬 하나를 멤버 수만큼 넉넉히! 밥은 각자 싸 와요.</p>
          <button
            className="link small"
            onClick={async () => {
              await leaveCrew(id);
              go('#/crew');
            }}
          >
            모임 나가기
          </button>
        </>
      ) : (
        <Feed mode="crew" crew={id} needProfile={needProfile} empty="멤버들이 자랑한 도시락이 여기 모여요." />
      )}

      {edit && (
        <div className="backdrop" onClick={() => setEdit(null)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="grip" />
            <h2>
              {weekday(edit)}요일 ({dayLabel(edit)}) 내가 싸 올 반찬
            </h2>
            <input className="input big" value={dish} maxLength={40} onChange={(e) => setDishText(e.target.value)} placeholder="예: 계란말이 4인분" autoFocus />
            <input className="input" value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택) 예: 견과류 들어감, 매움" />
            <div className="row-btns">
              <button type="button" className="btn ghost" onClick={() => setEdit(null)}>
                취소
              </button>
              <button className="btn primary">{dish.trim() ? '정했어요' : '비우기'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
