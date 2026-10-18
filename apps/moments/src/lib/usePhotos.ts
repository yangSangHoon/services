import { useEffect, useState } from 'react';
import { signPhotos } from './sync';

/** 사진 경로 목록 → 서명 URL. 새 경로가 생길 때만 다시 받는다 */
export function usePhotoUrls(paths: (string | null)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.filter(Boolean).join('|');
  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length) return;
    let alive = true;
    signPhotos(list).then((u) => alive && setUrls((prev) => ({ ...prev, ...u })));
    return () => {
      alive = false;
    };
  }, [key]);
  return urls;
}
