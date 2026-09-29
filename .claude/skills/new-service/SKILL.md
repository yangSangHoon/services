---
name: new-service
description: Idea Lab 모노레포에 새 서비스(앱)를 만들어 GitHub Pages 하위 path로 배포한다. 사용자가 "이런 서비스 만들어줘", "아이디어 있는데 사이트로 만들어줘", "새 앱 추가", "서비스 하나 더", "/new-service" 처럼 새 아이디어를 웹 서비스로 만들고 싶어 할 때 사용. 기존 앱 수정에는 쓰지 않는다.
---

# 새 서비스 만들기

하나의 저장소(`apps/<slug>`)와 하나의 Supabase 프로젝트(테이블 접두사로 분리)에 새 앱을 추가하고 `https://yangsanghoon.github.io/services/<slug>/` 로 배포한다. 저장소 규칙은 루트 `CLAUDE.md`를 먼저 읽는다.

## 1. 아이디어 정리 (짧게)

- 필수 기능만 뽑는다. 사용자가 "간단하게/재미로"라고 하면 로그인·설정·관리자 화면 같은 부가 기능은 빼고, 대신 UX의 재미(애니메이션, 피드백, 카피)에 투자한다.
- 판단이 정말 갈리는 부분만 질문하고, 나머지는 합리적 기본값으로 정한 뒤 무엇을 가정했는지 알려준다.
- slug(kebab-case, 영문), 제목, 이모지, 한 줄 설명을 정한다. `apps/`에 같은 slug가 없는지 확인.

## 2. 스캐폴딩

```bash
npm run new -- <slug> --title "제목" --emoji "🎈" --desc "한 줄 설명"
```

생성물: `apps/<slug>/`(React+Vite 템플릿, `src/db.ts`에 접두사 헬퍼), `supabase/migrations/<ts>_<prefix>.sql`.

## 3. DB 설계 → 마이그레이션 작성

생성된 마이그레이션 파일에 스키마를 작성한다. DB가 필요 없는 앱이면 파일을 지우고 건너뛴다.

- 모든 이름에 `<prefix>` (예: `lunch_roulette_`). 정책 이름에도.
- `enable row level security` 필수. 기본은 `select`만 정책으로 열고, 쓰기는 소유자 조건(`auth.uid()`) 정책 또는 `security definer set search_path = public` RPC로.
- 재화/포인트/수량 등 무결성이 중요한 값: 테이블 `insert/update/delete`를 `revoke`하고 RPC에서 `for update` 락 + 조건부 update로 원자적으로 처리. RPC는 `anon`에서 `revoke execute`, `authenticated`에 `grant`.
- 회원 전용 혜택(코인 지급 등)은 RPC에서 `coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)`로 게스트를 막는다.
- 에러는 `raise exception 'UPPER_SNAKE_CODE'`로 던지고 클라이언트에서 코드→친절한 문구로 매핑.
- 참고 구현: `supabase/migrations/20260929000000_dream_market.sql`

## 4. 마이그레이션 적용

1. `supabase/.temp/project-ref` 가 있으면(CLI 링크됨) `npx supabase db push`.
2. 아니면 사용자에게 SQL Editor(https://supabase.com/dashboard/project/sugayrefionpkzkzdgss/sql/new)에 해당 파일 내용을 붙여넣고 실행해 달라고 요청한다. 파일 경로를 알려주고, 사용자가 실행했다고 하면 다음으로 확인:

```bash
curl -s "https://sugayrefionpkzkzdgss.supabase.co/rest/v1/<prefix><table>?select=*&limit=1" \
  -H "apikey: $(grep VITE_SUPABASE_ANON_KEY .env | cut -d= -f2)"
```

`PGRST205`(테이블 없음)이면 아직 적용 안 된 것. `[]` 또는 행이 오면 성공.

## 5. 구현

- `@lab/core`의 `supabase`, `useSession`, `isGuest`, `signUpWithEmail`/`signInWithEmail`/`signInAsGuest`, `isConfigured` 사용. 로그인 UI는 `apps/dream-market/src/components/Auth.tsx` 참고(회원가입·로그인·게스트). 테이블/RPC는 `src/db.ts`의 `table()`, `rpc()` 헬퍼로 접근(접두사 자동).
- 라우팅이 필요하면 `HashRouter`. 페이지가 적으면 상태 기반 탭으로 충분.
- localStorage 키, Realtime 채널 이름에 slug를 붙인다.
- RLS 때문에 다른 사용자에게 안 보이게 된 행의 변화는 `postgres_changes`로 전달되지 않는다. 실시간 알림이 필요하면 broadcast 채널을 쓴다(참고: `apps/dream-market/src/lib/realtime.ts`).
- 스타일은 `:root` CSS 변수(디자인 토큰)로 정의해서 나중에 디자인 교체가 쉽게. 모바일 폭(좌우 16px)에서 가로 스크롤 없게.
- 앱 전용 라이브러리는 `npm i <pkg> -w apps/<slug>`.

## 5-1. 공유 미리보기 (카카오톡 · 페이스북)

- 템플릿 `index.html`에 OG 태그(제목·설명·이미지)가 이미 들어 있다. 제목/설명 문구는 서비스에 맞게 다듬는다.
- 스캐폴딩 때 기본 `public/og.png`(1200×630)가 생성된다. 서비스 분위기에 맞게 `apps/<slug>/og.html`(1200×630 고정 크기 HTML)을 만들어 꾸미고 `npm run og <slug>`로 다시 렌더링한다. 참고: `apps/dream-market/og.html`
- 생성된 og.png를 Read로 열어 눈으로 확인한다.

## 6. 검증

- `npm run build:app <slug>` 통과(타입체크 포함).
- `npm run dev <slug>` 띄워서 브라우저로 핵심 플로우를 실제로 한 번 돌려본다(가능하면). DB 쓰기가 있는 앱은 마이그레이션 적용 후 확인.

## 7. 배포

- `git add apps/<slug> supabase/migrations package-lock.json` 후 커밋, `main`에 push. (push 전 사용자에게 확인)
- GitHub Actions `Deploy to GitHub Pages` 완료 확인: `gh run watch` 또는 `gh run list --limit 1`.
- 카카오톡은 미리보기를 캐시하므로, 문구·이미지를 바꿨다면 https://developers.kakao.com/tool/clear/og 에서 URL 캐시 초기화를 안내한다(페이스북: https://developers.facebook.com/tools/debug/).
- 사용자에게 `https://yangsanghoon.github.io/services/<slug>/` 링크와, 적용이 필요한 마이그레이션이 남아있다면 그 사실을 알려준다.
