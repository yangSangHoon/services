import { useRef, useState } from 'react';

/**
 * 네이버 블로그 붙여넣기 실험.
 * 질문: HTML(사진 주소 + 글)을 복사해 붙여넣으면 네이버가 사진을 자기 서버(pstatic.net)로 옮겨 저장하는가?
 * 옮긴다면 → 블로그가 곧 사진 저장소. 우리 서버는 임시 보관만 하면 된다.
 */
const PHOTOS = [
  { file: 'photo-1.jpg', text: '새벽에 일어나서 바다 보러 나갔다. 해가 올라오는데 둘 다 말이 없었다.' },
  { file: 'photo-2.jpg', text: '점심은 시장 국수. 아내가 국물 한 숟갈 먹고 "여기 또 오자"고 했다.' },
  { file: 'photo-3.jpg', text: '밤 산책. 오늘 사진 정리 끝, 폰에서는 지워도 된다.' },
];
const TITLE = '붙여넣기 테스트 · 10월의 어느 하루';

const abs = (f: string) => new URL(f, location.href).href;

function buildHtml() {
  const body = PHOTOS.map((p) => `<p><img src="${abs(p.file)}" alt="" width="1200" height="900"></p><p>${p.text}</p><p><br></p>`).join('');
  return `<h2>${TITLE}</h2>${body}<p>— 찰나에서 정리함</p>`;
}
const buildText = () => [TITLE, '', ...PHOTOS.map((p) => p.text)].join('\n');

type Result = { ok: boolean; msg: string } | null;

export default function App() {
  const article = useRef<HTMLElement>(null);
  const [status, setStatus] = useState('');
  const [url, setUrl] = useState('');

  const copyHtml = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([buildHtml()], { type: 'text/html' }),
          'text/plain': new Blob([buildText()], { type: 'text/plain' }),
        }),
      ]);
      setStatus('✅ 복사됨 (방법 A). 네이버 블로그 글쓰기에 붙여넣어 주세요.');
    } catch {
      copySelection('A 실패 → 선택 복사로 대신했어요');
    }
  };

  const copySelection = (prefix = '✅ 복사됨 (방법 B)') => {
    const el = article.current!;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    const ok = document.execCommand('copy');
    setStatus(ok ? `${prefix}. 붙여넣어 주세요.` : '자동 복사가 막혔어요. 지금 선택된 부분을 길게 눌러 "복사"를 눌러 주세요.');
  };

  const copyImage = async () => {
    try {
      const png = await toPng(abs(PHOTOS[0].file));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      setStatus('✅ 사진 1장을 이미지로 복사했어요 (방법 C). 붙여넣어 주세요.');
    } catch {
      setStatus('이 브라우저는 이미지 복사를 지원하지 않아요. PC 크롬으로 해 주세요.');
    }
  };

  const result: Result = !url.trim()
    ? null
    : /pstatic\.net|naver\.(com|net)|phinf/.test(url)
      ? { ok: true, msg: '네이버 서버 주소예요 → 네이버가 사진을 옮겨 저장했어요. 우리 서버 사진을 지워도 블로그는 안전!' }
      : /github\.io/.test(url)
        ? { ok: false, msg: '우리 서버 주소 그대로예요 → 우리가 사진을 지우면 블로그 사진이 깨져요.' }
        : { ok: false, msg: '처음 보는 주소예요. 이 주소를 그대로 알려주세요.' };

  return (
    <main className="page">
      <h1>📋 블로그 붙여넣기 테스트</h1>
      <p className="muted">
        사진+글을 복사해서 네이버 블로그에 붙여넣으면, 네이버가 사진을 <b>자기 서버로 옮겨 저장하는지</b> 확인하는 실험이에요.
      </p>

      <ol className="steps">
        <li>
          <b>PC 크롬</b>에서 이 페이지를 열면 결과 확인이 쉬워요 (모바일도 가능)
        </li>
        <li>아래 버튼으로 복사</li>
        <li>
          네이버 블로그 → <b>글쓰기</b> → 본문에 붙여넣기 (Ctrl+V)
        </li>
        <li>
          <b>발행 말고 임시 "저장"</b>만
        </li>
        <li>붙여넣어진 사진 우클릭 → <b>이미지 주소 복사</b> → 맨 아래 칸에 붙여넣기</li>
      </ol>

      <div className="btns">
        <button className="primary" onClick={copyHtml}>
          A. 글+사진 한 번에 복사
        </button>
        <button onClick={() => copySelection()}>B. 선택해서 복사</button>
        <button onClick={copyImage}>C. 사진 1장만 이미지로 복사</button>
      </div>
      {status && <p className="status">{status}</p>}

      <article ref={article} className="preview">
        <h2>{TITLE}</h2>
        {PHOTOS.map((p) => (
          <div key={p.file}>
            <img src={abs(p.file)} alt="" width={1200} height={900} />
            <p>{p.text}</p>
          </div>
        ))}
        <p>— 찰나에서 정리함</p>
      </article>

      <section className="check">
        <h2>🔍 결과 확인</h2>
        <label>
          블로그에 붙은 사진의 이미지 주소
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </label>
        {result && <p className={`verdict ${result.ok ? 'ok' : 'bad'}`}>{result.ok ? '🎉 ' : '⚠️ '}{result.msg}</p>}
        <p className="muted small">
          모바일 앱이라 주소 확인이 어려우면, 임시저장한 글을 PC에서 열어 확인해 주세요. 결과(A/B/C 각각 사진이 붙었는지, 주소가 어디인지)를 알려주시면 다음 단계를 정할게요.
        </p>
      </section>
    </main>
  );
}

async function toPng(src: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG'))), 'image/png'));
}
