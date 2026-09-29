# 🧪 Idea Lab

아이디어로 가볍게 만들어 보는 서비스 모음. 앱마다 `https://yangsanghoon.github.io/services/<slug>/` 로 배포됩니다.

| 앱 | 설명 |
| --- | --- |
| [🌙 꿈사꿈팔](https://yangsanghoon.github.io/services/dream-market/) | 내 꿈을 팔고 남의 꿈을 사는 시장 |

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
