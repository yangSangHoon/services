import { useEffect, useState } from 'react';
import { Cafe } from './components/Cafe';
import { ExamHall } from './components/ExamHall';
import { Home } from './components/Home';
import { Dock, Hud, Toasts } from './components/Hud';
import { MentorDialog } from './components/Mentor';
import { Office } from './components/Office';
import { Onboarding } from './components/Onboarding';
import { Reward } from './components/Reward';
import { Roadmap } from './components/Roadmap';
import { Shop } from './components/Shop';
import { StudyRoom } from './components/StudyRoom';
import { World } from './components/World';
import type { RoomId } from './data/world';
import { checkIn, useSave } from './store';
import { sfx } from './sound';

export default function App() {
  const save = useSave();
  const [room, setRoom] = useState<RoomId | null>(null);
  const [mentor, setMentor] = useState(false);

  useEffect(() => {
    if (save.name) checkIn();
  }, [save.name]);

  // Esc 로 방 나가기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMentor(false);
        setRoom(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const open = (r: RoomId) => {
    sfx('open');
    setMentor(false);
    setRoom(r);
  };
  const close = () => setRoom(null);

  return (
    <div className="app">
      <Hud save={save} onOpen={open} />
      <World save={save} active={!room && !mentor && !!save.name} onEnter={setRoom} onMentor={() => setMentor(true)} />
      <Dock save={save} onOpen={open} />

      {room === 'study' && <StudyRoom save={save} onClose={close} />}
      {room === 'exam' && <ExamHall save={save} onClose={close} goReward={() => setRoom('reward')} />}
      {room === 'office' && <Office save={save} onClose={close} />}
      {room === 'cafe' && <Cafe save={save} onClose={close} />}
      {room === 'roadmap' && <Roadmap save={save} onClose={close} />}
      {room === 'reward' && <Reward save={save} onClose={close} />}
      {room === 'shop' && <Shop save={save} onClose={close} />}
      {room === 'home' && <Home save={save} onClose={close} />}
      {mentor && <MentorDialog save={save} onGo={open} onClose={() => setMentor(false)} />}
      {!save.name && <Onboarding />}
      <Toasts />
    </div>
  );
}
