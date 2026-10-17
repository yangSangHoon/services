/** 한 번 탭으로 고르는 감정. 글 없이 감정만 남겨도 된다 */
export const MOODS = [
  { key: 'lol', emoji: '😂', label: '빵 터짐', color: '#ffd76a' },
  { key: 'happy', emoji: '🥰', label: '행복', color: '#ffb3c1' },
  { key: 'moved', emoji: '🥹', label: '뭉클', color: '#c9b8ff' },
  { key: 'thanks', emoji: '🙏', label: '고마움', color: '#b8e3c6' },
  { key: 'wow', emoji: '😮', label: '놀람', color: '#9fd8f5' },
  { key: 'sad', emoji: '😢', label: '슬픔', color: '#a9bce0' },
  { key: 'upset', emoji: '😤', label: '속상', color: '#f5b08c' },
] as const;

export type MoodKey = (typeof MOODS)[number]['key'];
export const moodOf = (key: string | null | undefined) => MOODS.find((m) => m.key === key) ?? null;
