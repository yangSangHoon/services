// 찰나 서비스 워커: 오프라인에서도 열리게 + 안드로이드 공유 시트로 받은 사진 전달
const SHELL = 'moments-shell-v2';
const SHARE = 'moments-share';
const base = new URL('./', self.location.href).href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll([base, base + 'manifest.webmanifest', base + 'icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('moments-shell') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(base)) return;

  // 공유 시트: 사진·글을 캐시에 넣어 두고 앱으로 넘긴다
  if (req.method === 'POST' && url.href.startsWith(base + 'share')) {
    e.respondWith(
      (async () => {
        const form = await req.formData();
        const cache = await caches.open(SHARE);
        const text = [form.get('title'), form.get('text'), form.get('url')].filter(Boolean).join('\n');
        if (text) await cache.put(base + '__shared/text', new Response(text));
        const photo = form.get('photo');
        if (photo && typeof photo !== 'string') await cache.put(base + '__shared/photo', new Response(photo, { headers: { 'content-type': photo.type } }));
        return Response.redirect(base + '?shared=1', 303);
      })(),
    );
    return;
  }
  if (req.method !== 'GET') return;

  // 화면(HTML): 네트워크 먼저, 끊기면 캐시
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(base, copy));
          return res;
        })
        .catch(() => caches.match(base)),
    );
    return;
  }

  // 빌드 결과물(해시 파일명)·아이콘: 캐시 먼저
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.includes('/assets/') || /\.(png|webmanifest)$/.test(url.pathname))) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
