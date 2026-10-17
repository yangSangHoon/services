import { moodOf } from '../lib/moods';
import type { Entry } from '../lib/store';
import { clock, dateLabel } from '../lib/time';

/** 폴라로이드처럼: 사진 + 손글씨 한 줄 + 감정 스티커 */
export function MomentCard({
  entry,
  photo,
  waiting,
  showDate = true,
  onOpen,
}: {
  entry: Entry;
  photo?: string;
  waiting?: boolean;
  showDate?: boolean;
  onOpen: () => void;
}) {
  const mood = moodOf(entry.mood);
  const d = new Date(entry.happened_at);
  const hasPhoto = Boolean(photo || entry.photo_path);
  return (
    <button className={`card ${hasPhoto ? 'with-photo' : ''}`} onClick={onOpen} style={mood ? ({ '--mood': mood.color } as React.CSSProperties) : undefined}>
      {hasPhoto && <div className="card-photo">{photo ? <img src={photo} alt="" loading="lazy" /> : <span className="ph" />}</div>}
      {mood && (
        <span className="sticker" title={mood.label}>
          {mood.emoji}
        </span>
      )}
      {entry.body ? <p className="card-body">{entry.body}</p> : mood && !hasPhoto ? <p className="card-body faint">{mood.label}</p> : null}
      <span className="card-time">
        {showDate ? `${dateLabel(d)} · ` : ''}
        {clock(d)}
        {waiting && <span className="waiting"> · 기기에만 있음</span>}
      </span>
    </button>
  );
}
