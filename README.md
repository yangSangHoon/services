# 🧪 Idea Lab

아이디어로 가볍게 만들어 보는 서비스 모음. 앱마다 `https://yangsanghoon.github.io/services/<slug>/` 로 배포됩니다.

| 앱 | 설명 |
| --- | --- |
| [🌙 꿈사꿈팔](https://yangsanghoon.github.io/services/dream-market/) | 내 꿈을 팔고 남의 꿈을 사는 시장 |
| [🥢 찰떡궁합](https://yangsanghoon.github.io/services/food-match/) | 이거랑 이거, 같이 먹어도 돼? 음식 궁합과 속설 판별 |
| [🦟 앵앵 몰카](https://yangsanghoon.github.io/services/mosquito-cam/) | 화면엔 모기가 날고 스피커에선 앵~ 소리, 반응을 영상으로 찍어 공유 |
| [🧱 쿼리도 한판](https://yangsanghoon.github.io/services/quoridor/) | 벽 세워서 길 막기! 한 폰으로 둘이서, 또는 링크로 친구와 온라인 1:1 |

## 방문 통계

[📊 /services/stats/](https://yangsanghoon.github.io/services/stats/) — 앱별 순방문자·유입 경로·앱 안 이벤트 대시보드(관리자만, 목록에는 안 보임).

- 앱은 `main.tsx` 에서 `track('<slug>')` 한 줄로 방문을 남긴다(템플릿에 포함). 앱 안 이벤트는 `track('<slug>', 'share')` 처럼.
- 데이터: `lab_visits` 테이블 + `lab_track` / `lab_stats` RPC (`supabase/migrations/20261013030000_lab_stats.sql`).
- 관리자 등록: `insert into public.lab_admins (user_id) select id from auth.users where email = '<이메일>';`

## 시작하기

```bash
npm install
cp .env.example .env   # Supabase URL / publishable key
npm run dev dream-market
```

## 새 서비스 추가

Claude Code에서 "○○ 서비스 만들어줘"라고 하면 `new-service` 스킬이 아래 과정을 진행합니다.

```bash
npm run new -- <slug> --title "이름" --emoji "🎈" --desc "한 줄 설명"
# supabase/migrations/<ts>_<prefix>.sql 작성 → Supabase SQL Editor에서 실행
npm run dev <slug>
git push   # main에 push하면 자동 배포
```

규칙은 [CLAUDE.md](./CLAUDE.md) 참고.

## 최초 1회 설정

1. GitHub 저장소 Settings → Pages → Source: **GitHub Actions**
2. Supabase → [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/sugayrefionpkzkzdgss/auth/providers) → **Allow anonymous sign-ins** 켜기(게스트용), **Confirm email** 끄기(기본 메일 발송은 팀원 주소로만 가서 일반 사용자가 인증 메일을 못 받음)
3. 각 앱의 `supabase/migrations/*.sql`을 SQL Editor에서 실행
