import type { LevelContent } from './types';

const content: LevelContent = {
  level: 8,
  lessons: [
    {
      id: 'l8-http',
      level: 8,
      title: 'HTTP 제대로 알기',
      summary: '메서드의 멱등성, 상태코드 구분, 헤더, 쿠키·세션·JWT 인증 방식',
      blocks: [
        {
          t: 'p',
          text: '백엔드 개발자는 하루 종일 HTTP 요청을 받고 응답합니다. 메서드와 상태코드를 "대충" 쓰면 클라이언트·게이트웨이·캐시·모니터링이 모두 잘못 동작합니다. 예를 들어 실패를 200으로 내려주면 에러율 알람이 울리지 않고, 재시도해도 되는 요청인지 판단할 수 없습니다.',
        },
        {
          t: 'p',
          text: '멱등성(idempotency)이란 같은 요청을 1번 보내든 N번 보내든 서버 상태가 같다는 성질입니다. 네트워크 타임아웃 후 "재시도해도 안전한가?"를 결정하는 핵심 기준입니다. 안전(safe) 메서드는 서버 상태를 바꾸지 않는 메서드(GET, HEAD, OPTIONS)입니다.',
        },
        {
          t: 'table',
          head: ['메서드', '용도', '안전', '멱등'],
          rows: [
            ['GET', '조회', 'O', 'O'],
            ['POST', '생성·처리 요청', 'X', 'X'],
            ['PUT', '전체 교체(없으면 생성)', 'X', 'O'],
            ['PATCH', '부분 수정', 'X', '보장 안 됨'],
            ['DELETE', '삭제', 'X', 'O'],
          ],
        },
        {
          t: 'table',
          head: ['상태코드', '의미', '대표 예시'],
          rows: [
            ['200 / 201 / 204', '성공 / 생성됨 / 본문 없음', '201은 Location 헤더와 함께'],
            ['400', '요청 형식·값이 잘못됨', '필수 필드 누락, 검증 실패'],
            ['401', '인증 안 됨(누구인지 모름)', '토큰 없음·만료'],
            ['403', '인증됐지만 권한 없음', '일반 사용자가 관리자 API 호출'],
            ['404 / 409', '자원 없음 / 상태 충돌', '중복 가입, 이미 취소된 주문'],
            ['500 / 502 / 503 / 504', '서버 오류 / 게이트웨이 오류 / 일시 불가 / 게이트웨이 타임아웃', '4xx는 클라이언트 탓, 5xx는 서버 탓'],
          ],
        },
        {
          t: 'code',
          lang: 'http',
          code: `POST /api/payments HTTP/1.1
Host: api.shop.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Idempotency-Key: 7f3a9c2e-order-1001

{"orderId": 1001, "amount": 39000}

HTTP/1.1 201 Created
Location: /api/payments/555
Content-Type: application/json`,
        },
        {
          t: 'p',
          text: '인증 상태 유지 방식은 크게 세션과 토큰(JWT)입니다. 세션은 서버(또는 Redis)가 상태를 들고 브라우저는 JSESSIONID 쿠키만 보냅니다. JWT는 서명된 토큰 자체에 사용자 정보를 담아 서버가 상태를 저장하지 않아도 되지만, 발급 후 강제로 무효화하기 어렵습니다.',
        },
        {
          t: 'table',
          head: ['구분', '세션', 'JWT'],
          rows: [
            ['상태 저장', '서버(세션 저장소)', '클라이언트(토큰)'],
            ['수평 확장', '세션 공유 저장소 필요', '서명 검증만 하면 됨'],
            ['강제 로그아웃', '세션 삭제로 즉시 가능', '만료 전까지 어려움(블랙리스트 필요)'],
            ['주의점', '세션 고정 공격, 저장소 장애', 'payload는 암호화가 아닌 Base64URL 인코딩'],
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 쿠키에 HttpOnly(JS 접근 차단, XSS 완화), Secure(HTTPS에서만 전송), SameSite(CSRF 완화)를 기본으로 붙입니다. JWT는 Access Token 수명을 짧게(예: 15~30분) 두고 Refresh Token으로 재발급하는 구조가 일반적입니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 모든 응답을 200으로 내리고 body에 {"success": false}를 넣는 것. 모니터링·로드밸런서·클라이언트 재시도 로직이 상태코드를 기준으로 움직이므로 실패는 반드시 4xx/5xx로 표현하세요.',
        },
      ],
    },
    {
      id: 'l8-rest',
      level: 8,
      title: 'REST API 설계',
      summary: '자원 중심 URI, 페이지네이션(offset vs cursor), 버전 관리, 에러 응답 형식',
      blocks: [
        {
          t: 'p',
          text: 'REST API의 핵심은 "URI는 자원(명사)을, 행위는 HTTP 메서드로" 표현하는 것입니다. 일관된 규칙이 있으면 프론트엔드·다른 팀이 문서를 덜 보고도 API를 예측할 수 있습니다.',
        },
        {
          t: 'code',
          lang: 'text',
          code: `# 좋은 예 — 복수형 명사, 계층 관계, 소문자 + 하이픈
GET    /users/42/orders          # 42번 사용자의 주문 목록
POST   /orders                   # 주문 생성
PATCH  /orders/1001              # 주문 일부 수정
DELETE /orders/1001              # 주문 삭제
POST   /orders/1001/cancel       # 상태 전이 같은 행위는 하위 자원으로 표현하기도 함

# 나쁜 예 — 동사 URI, 메서드와 의미 불일치
GET    /getUserOrders?id=42
POST   /deleteOrder
GET    /orders/1001/delete`,
        },
        {
          t: 'p',
          text: '목록 API는 반드시 페이지네이션을 둡니다. offset 방식(LIMIT 20 OFFSET 10000)은 구현이 쉽지만, DB가 앞의 10000건을 읽고 버려야 해서 뒤 페이지로 갈수록 느려지고, 조회 도중 데이터가 추가되면 중복·누락이 생깁니다. 커서(키셋) 방식은 "마지막으로 본 id 이후"를 인덱스로 바로 찾아 깊은 페이지도 빠릅니다.',
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- offset: 페이지 번호 점프 가능, 깊어질수록 느림
SELECT * FROM orders ORDER BY id DESC LIMIT 20 OFFSET 10000;

-- cursor(keyset): 무한 스크롤에 적합, 인덱스 범위 탐색
SELECT * FROM orders WHERE id < :lastSeenId ORDER BY id DESC LIMIT 20;`,
        },
        {
          t: 'table',
          head: ['버전 관리 방식', '예시', '특징'],
          rows: [
            ['URI 경로', '/api/v1/orders', '가장 흔함, 눈에 잘 보이고 라우팅 쉬움'],
            ['헤더', 'Accept: application/vnd.shop.v2+json', 'URI는 깔끔하지만 테스트·디버깅이 번거로움'],
            ['쿼리 파라미터', '/orders?version=2', '간단하지만 캐시·라우팅 규칙이 지저분해짐'],
          ],
        },
        {
          t: 'code',
          lang: 'http',
          code: `HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "code": "ORDER_ALREADY_CANCELED",
  "message": "이미 취소된 주문입니다.",
  "traceId": "a1b2c3d4"
}`,
        },
        {
          t: 'list',
          items: [
            '필드 추가는 하위 호환, 필드 삭제·이름 변경·타입 변경은 호환 깨짐(Breaking change) → 새 버전 필요',
            '에러 응답은 기계가 읽을 code + 사람이 읽을 message + 추적용 traceId 를 일관된 형식으로',
            '목록 응답에는 다음 페이지 정보(nextCursor, hasNext)를 포함',
            '날짜는 ISO-8601(2026-11-06T10:00:00+09:00), 금액은 부동소수점 대신 정수(원 단위)나 문자열 decimal',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 이미 외부에 공개된 API의 응답 필드를 지우는 순간 앱 구버전 사용자가 장애를 겪습니다. 필드는 "추가만" 하고, 제거는 deprecated 표시 → 사용량 모니터링 → 공지 후 제거 순서로 진행합니다.',
        },
      ],
    },
    {
      id: 'l8-git',
      level: 8,
      title: 'Git 협업',
      summary: '브랜치 전략, merge vs rebase, revert vs reset, 충돌 해결, 커밋 메시지',
      blocks: [
        {
          t: 'p',
          text: '혼자 쓰는 Git과 팀에서 쓰는 Git은 다릅니다. 팀에서는 "남의 히스토리를 망가뜨리지 않는 것"이 최우선 규칙입니다. 대부분의 사고는 공유 브랜치에서 히스토리를 다시 쓰는(rebase, reset 후 force push) 작업에서 나옵니다.',
        },
        {
          t: 'table',
          head: ['브랜치 전략', '방식', '어울리는 팀'],
          rows: [
            ['Git Flow', 'main/develop/feature/release/hotfix 분리', '정해진 주기로 릴리스하는 제품(앱 등)'],
            ['GitHub Flow', 'main + 짧은 feature 브랜치 + PR', '자주 배포하는 웹 서비스'],
            ['Trunk-based', 'main에 하루 단위로 작게 통합, 미완성 기능은 feature flag', 'CI/CD가 성숙한 팀'],
          ],
        },
        {
          t: 'p',
          text: 'merge는 두 브랜치를 합치는 merge commit을 만들어 히스토리를 있는 그대로 보존합니다. rebase는 내 커밋들을 대상 브랜치 끝으로 "다시 적용"해 일직선 히스토리를 만들지만, 커밋 해시가 새로 바뀝니다. 그래서 이미 push해서 다른 사람이 받아 간 브랜치를 rebase하면 서로의 히스토리가 갈라집니다.',
        },
        {
          t: 'code',
          lang: 'text',
          code: `# 내 로컬 feature 브랜치를 최신 main 위로 정리 (아직 혼자 쓰는 브랜치일 때)
git fetch origin
git rebase origin/main

# 충돌 발생 시: 파일 수정 → add → 계속
git status
git add src/main/java/OrderService.java
git rebase --continue      # 포기하려면 git rebase --abort

# 이미 main에 배포된 잘못된 커밋 되돌리기 — 되돌리는 "새 커밋"을 만든다
git revert a1b2c3d
git push origin main`,
        },
        {
          t: 'table',
          head: ['명령', '동작', '공유 브랜치에서'],
          rows: [
            ['git revert <커밋>', '변경을 취소하는 새 커밋 생성, 히스토리 보존', '안전'],
            ['git reset --soft <커밋>', 'HEAD만 이동, 변경은 staged로 남음', '로컬 정리용'],
            ['git reset --hard <커밋>', 'HEAD·인덱스·작업 디렉터리 모두 되돌림, 변경 삭제', 'push 후엔 force push 필요 → 위험'],
          ],
        },
        {
          t: 'code',
          lang: 'text',
          code: `feat(order): 주문 취소 시 쿠폰 복원 로직 추가

- 취소 상태 전이 시 사용한 쿠폰을 AVAILABLE 로 되돌린다
- 부분 취소는 다음 이슈에서 처리

Refs: SHOP-1234`,
        },
        {
          t: 'list',
          items: [
            '커밋 메시지 제목은 "무엇을", 본문은 "왜"를 쓴다 (Conventional Commits: feat, fix, refactor, test, docs, chore)',
            '하나의 커밋 = 하나의 논리적 변경. 리팩터링과 기능 변경을 섞지 않는다',
            '충돌은 양쪽 의도를 이해하고 해결한다. 모르면 상대 작성자에게 물어본다',
            'force push가 꼭 필요하면 git push --force-with-lease 로 남의 커밋 덮어쓰기를 방지',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: main 에서 잘못된 커밋을 지우려고 reset --hard 후 force push. 이미 그 커밋을 받은 동료와 CI 히스토리가 꼬이고, 배포 이력 추적도 끊깁니다. 공유 브랜치는 무조건 revert 입니다.',
        },
      ],
    },
    {
      id: 'l8-test',
      level: 8,
      title: '테스트 코드 작성',
      summary: 'JUnit5, given-when-then, Mockito mock/stub/verify, 단위·통합 테스트, 스프링 테스트 슬라이스',
      blocks: [
        {
          t: 'p',
          text: '테스트 코드는 "지금 맞는지"보다 "나중에 고쳐도 안 깨지는지"를 보장하는 안전망입니다. 테스트가 있어야 리팩터링을 두려움 없이 할 수 있고, 테스트 자체가 사용 예시 문서 역할도 합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock OrderRepository orderRepository;
    @Mock PaymentClient paymentClient;
    @InjectMocks OrderService orderService;

    @Test
    @DisplayName("결제 성공 시 주문 상태가 PAID 가 된다")
    void pay_success() {
        // given
        Order order = new Order(1L, 39000);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));   // stub
        when(paymentClient.pay(1L, 39000)).thenReturn(true);

        // when
        orderService.pay(1L);

        // then
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        verify(paymentClient, times(1)).pay(1L, 39000);                    // 호출 검증
    }

    @Test
    void pay_notFound() {
        when(orderRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(OrderNotFoundException.class, () -> orderService.pay(99L));
    }
}`,
        },
        {
          t: 'table',
          head: ['용어', '의미', 'Mockito'],
          rows: [
            ['Mock', '가짜 객체. 기본적으로 아무 일도 안 하고 기본값(0, null, 빈 컬렉션, false) 반환', 'mock(), @Mock'],
            ['Stub', '특정 호출에 정해진 값을 돌려주도록 설정', 'when(...).thenReturn(...) / thenThrow(...)'],
            ['Verify', '특정 메서드가 몇 번, 어떤 인자로 호출됐는지 검증', 'verify(mock, times(1)).method(...)'],
            ['Spy', '실제 객체를 감싸 일부만 stub', 'spy(), @Spy'],
          ],
        },
        {
          t: 'p',
          text: '단위 테스트는 클래스 하나를 외부 의존성(DB, 네트워크) 없이 빠르게 검증합니다. 통합 테스트는 실제 DB·스프링 컨텍스트를 띄워 여러 컴포넌트가 함께 잘 동작하는지 봅니다. 단위 테스트를 많이, 통합 테스트는 핵심 흐름 위주로 두는 "테스트 피라미드"가 기본 전략입니다.',
        },
        {
          t: 'table',
          head: ['어노테이션', '로드 범위', '용도'],
          rows: [
            ['(없음) + Mockito', '스프링 없음', '서비스·도메인 로직 단위 테스트, 가장 빠름'],
            ['@WebMvcTest', 'Controller, ControllerAdvice, Filter 등 웹 레이어만', '요청 매핑·검증·응답 형식 테스트, 서비스는 mock 빈으로 대체'],
            ['@DataJpaTest', 'JPA Repository, DataSource', '쿼리·매핑 테스트, 기본적으로 각 테스트 후 롤백'],
            ['@SpringBootTest', '전체 애플리케이션 컨텍스트', '통합 테스트, 가장 느림'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean OrderService orderService;   // Boot 3.4+ (이전 버전은 @MockBean)

    @Test
    void 주문_조회() throws Exception {
        when(orderService.find(1L)).thenReturn(new OrderResponse(1L, "PAID"));

        mockMvc.perform(get("/orders/1"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.status").value("PAID"));
    }
}`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: @Mock 을 붙여놓고 @ExtendWith(MockitoExtension.class) 를 빼먹어 mock 이 null 인 채로 NullPointerException 이 나는 것. 또 모든 테스트를 @SpringBootTest 로 작성하면 테스트 한 번에 수십 초가 걸려 아무도 테스트를 돌리지 않게 됩니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 "구현"이 아니라 "행위"를 검증하세요. private 메서드 호출 순서까지 verify 하면 리팩터링할 때마다 테스트가 깨집니다. 외부로 나가는 중요한 부수효과(결제 호출, 메시지 발행)만 verify 하는 것이 좋습니다.',
        },
      ],
    },
    {
      id: 'l8-ops',
      level: 8,
      title: '빌드·로깅·리뷰·배포',
      summary: 'Gradle 의존성 구성, SLF4J 로깅과 마스킹, 코드 리뷰 매너, CI/CD, Docker 기초',
      blocks: [
        {
          t: 'p',
          text: 'Gradle은 의존성을 "언제 필요한가"에 따라 구성(configuration)으로 나눕니다. 잘못 고르면 운영 jar에 테스트 라이브러리가 들어가거나, 다른 모듈에 불필요한 의존성이 새어 나갑니다.',
        },
        {
          t: 'code',
          lang: 'text',
          code: `// build.gradle (Groovy DSL)
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'   // 컴파일 + 런타임
    compileOnly 'org.projectlombok:lombok'                              // 컴파일 시에만
    annotationProcessor 'org.projectlombok:lombok'
    runtimeOnly 'com.mysql:mysql-connector-j'                           // 실행 시에만 (JDBC 드라이버)
    testImplementation 'org.springframework.boot:spring-boot-starter-test'  // 테스트에서만
}

./gradlew clean build      # 컴파일 + 테스트 + jar 생성
./gradlew dependencies     # 의존성 트리 확인 (버전 충돌 추적)`,
        },
        {
          t: 'p',
          text: 'System.out.println 은 운영 코드에서 쓰지 않습니다. 레벨로 출력 여부를 조절할 수 없고, 파일 롤링·포맷(시간, 스레드, traceId)·비동기 출력을 지원하지 않으며, 동기 I/O로 성능을 떨어뜨립니다. SLF4J(API) + Logback(구현) 조합이 스프링 부트 기본입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Slf4j
@Service
public class OrderService {
    public void pay(Long orderId, String cardNo) {
        log.debug("결제 시작 orderId={}", orderId);              // {} 플레이스홀더: 레벨이 꺼져 있으면 문자열 생성 비용 없음
        log.info("결제 요청 orderId={}, card={}", orderId, mask(cardNo));
        try {
            // ...
        } catch (PaymentException e) {
            log.error("결제 실패 orderId={}", orderId, e);       // 마지막 인자로 예외 → 스택트레이스 출력
        }
    }
}`,
        },
        {
          t: 'table',
          head: ['레벨', '언제'],
          rows: [
            ['ERROR', '즉시 대응이 필요한 실패 (알람 대상)'],
            ['WARN', '당장 실패는 아니지만 주의 필요 (재시도 성공, 임계치 근접)'],
            ['INFO', '주요 비즈니스 이벤트 (주문 생성, 배치 시작/종료)'],
            ['DEBUG / TRACE', '개발·장애 분석용 상세 정보, 운영에선 보통 꺼둠'],
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 비밀번호, 카드번호, 주민번호, 토큰을 로그에 그대로 남기는 것. 로그는 많은 사람이 보고 오래 보관되는 곳이라 개인정보 유출 사고의 단골 원인입니다. 마스킹(1234-****-****-5678)하거나 아예 남기지 마세요.',
        },
        {
          t: 'list',
          items: [
            '코드 리뷰는 "사람"이 아니라 "코드"를 이야기한다: "왜 이렇게 했어요?" 대신 "이 경우 null 이 들어오면 어떻게 될까요?"',
            '중요도를 표시한다: 필수 수정(must) vs 제안(nit, optional)',
            'PR은 작게(수백 줄 이내), 설명에 "무엇을, 왜, 어떻게 테스트했는지"를 쓴다',
            'CI: push/PR마다 빌드·테스트·정적 분석 자동 실행 → 실패하면 merge 금지',
            'CD: main merge 후 이미지 빌드 → 스테이징 → 운영 자동/승인 배포, 롤백 경로를 항상 준비',
          ],
        },
        {
          t: 'code',
          lang: 'text',
          code: `# Dockerfile — 빌드된 jar를 실행하는 최소 이미지
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY build/libs/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

docker build -t shop-api:1.0.0 .
docker run -d -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod shop-api:1.0.0`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 컨테이너를 "언제든 지워지고 새로 뜨는 것"으로 다룹니다. 컨테이너 내부 파일시스템은 재생성 시 사라지므로 업로드 파일·영구 데이터는 볼륨이나 S3 같은 외부 스토리지에, 설정은 환경변수로 주입합니다. 이미지 태그도 latest 대신 버전·커밋 해시로 고정해야 롤백이 쉽습니다.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q8-01',
      level: 8,
      type: '개념',
      topic: 'HTTP 멱등성',
      prompt: '다음 HTTP 메서드 중 멱등(idempotent)하지 않은 것은?',
      choices: ['GET', 'PUT', 'DELETE', 'POST'],
      answer: 3,
      explain:
        'POST는 호출할 때마다 새 자원을 만들 수 있어 멱등이 아닙니다(같은 주문 요청 두 번 = 주문 두 건). DELETE는 두 번째 호출이 404를 돌려줄 수 있어도 "삭제된 상태"라는 서버 상태는 같으므로 멱등입니다.',
    },
    {
      id: 'q8-02',
      level: 8,
      type: '개념',
      topic: 'HTTP 상태코드',
      prompt: '로그인은 정상적으로 되어 유효한 토큰을 보냈지만, 일반 사용자가 관리자 전용 API를 호출했습니다. 가장 적절한 응답 상태코드는?',
      choices: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found'],
      answer: 2,
      explain:
        '누구인지는 확인됐지만(인증 성공) 권한이 없으므로 403입니다. 401은 토큰이 없거나 만료되어 "누구인지 모르는" 인증 실패 상황에 씁니다.',
    },
    {
      id: 'q8-03',
      level: 8,
      type: '실무 상황',
      topic: '중복 결제 방지',
      prompt:
        '모바일 앱에서 POST /payments 호출이 타임아웃되자 앱이 자동 재시도했고, 실제로는 첫 요청도 서버에서 처리되어 고객이 두 번 결제됐습니다. 재발 방지책으로 가장 적절한 것은?',
      choices: [
        '클라이언트가 요청마다 고유한 Idempotency-Key 헤더를 보내고, 서버는 같은 키의 요청은 처음 결과를 그대로 반환한다',
        '결제 API를 POST 대신 GET 으로 바꿔 멱등하게 만든다',
        '앱의 재시도를 없애고 사용자가 직접 다시 누르게 한다',
        '서버 타임아웃을 늘려서 타임아웃이 아예 발생하지 않게 한다',
      ],
      answer: 0,
      explain:
        '멱등 키로 "같은 요청"을 서버가 식별하면 재시도가 몇 번 와도 결제는 한 번만 일어납니다. 메서드 이름만 GET으로 바꾼다고 동작이 멱등해지지 않고, 사용자가 다시 누르거나 타임아웃이 늘어나도 중복 요청 가능성은 남습니다.',
    },
    {
      id: 'q8-04',
      level: 8,
      type: '개념',
      topic: 'JWT',
      prompt: 'JWT에 대한 설명으로 옳은 것은?',
      choices: [
        'JWT payload는 서버 비밀키로 암호화되므로 비밀번호를 넣어도 안전하다',
        'payload는 Base64URL 인코딩일 뿐이라 누구나 디코딩해 읽을 수 있으므로 민감정보를 넣으면 안 된다',
        'JWT는 서버가 세션 저장소에 저장해 두어야 검증할 수 있다',
        '발급된 JWT는 서버에서 언제든 즉시 무효화할 수 있다는 것이 세션 대비 장점이다',
      ],
      answer: 1,
      explain:
        '일반적인 JWT(JWS)는 서명으로 "위변조"만 막을 뿐 내용은 누구나 읽을 수 있습니다. 서버 저장 없이 서명만으로 검증하는 것이 장점이고, 대신 만료 전 강제 무효화가 어렵다는 것이 단점입니다.',
    },
    {
      id: 'q8-05',
      level: 8,
      type: 'OX',
      topic: 'PUT 멱등성',
      prompt: 'PUT /users/42 로 같은 본문을 3번 보냈을 때, 서버 상태는 1번 보냈을 때와 같아야 한다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        'PUT은 자원을 본문 내용으로 "전체 교체"하므로 몇 번을 보내도 결과 상태가 같습니다. 이 성질 덕분에 타임아웃 후 PUT은 안전하게 재시도할 수 있습니다.',
    },
    {
      id: 'q8-06',
      level: 8,
      type: '개념',
      topic: 'REST URI 설계',
      prompt: '"42번 사용자의 주문 목록 조회" API로 REST 관례에 가장 잘 맞는 것은?',
      choices: ['GET /getOrders?userId=42', 'POST /users/42/orders/list', 'GET /users/42/orders', 'GET /user/42/getOrderList'],
      answer: 2,
      explain:
        'URI는 복수형 명사로 자원과 계층을 표현하고, "조회"라는 행위는 GET 메서드로 나타냅니다. 동사(get, list)를 URI에 넣거나 조회에 POST를 쓰는 것은 REST 관례에 어긋납니다.',
    },
    {
      id: 'q8-07',
      level: 8,
      type: '실무 상황',
      topic: '페이지네이션',
      prompt:
        '피드 목록 API를 LIMIT 20 OFFSET n 으로 구현했더니, 사용자가 스크롤을 깊게 내릴수록 응답이 수 초까지 느려지고 새 글이 올라오면 같은 글이 중복으로 보인다는 제보가 들어왔습니다. 가장 적절한 개선은?',
      choices: [
        '페이지 크기를 20에서 200으로 늘려 요청 횟수를 줄인다',
        '전체 목록을 한 번에 내려주고 클라이언트에서 잘라 보여준다',
        'OFFSET 쿼리 결과를 캐시에 저장한다',
        '마지막으로 본 id를 커서로 받아 WHERE id < :cursor ORDER BY id DESC LIMIT 20 으로 조회한다',
      ],
      answer: 3,
      explain:
        '커서(키셋) 방식은 인덱스로 시작 지점을 바로 찾아 깊은 페이지도 일정하게 빠르고, 기준이 "id 이후"라 새 글이 추가돼도 중복·누락이 없습니다. 페이지 크기를 키우거나 캐시하는 것은 OFFSET의 근본 문제(앞부분을 읽고 버림, 위치 밀림)를 해결하지 못합니다.',
    },
    {
      id: 'q8-08',
      level: 8,
      type: '개념',
      topic: 'merge vs rebase',
      prompt: '이미 원격에 push 되어 동료들이 함께 쓰는 브랜치를 rebase 하면 안 되는 가장 큰 이유는?',
      choices: [
        'rebase 는 충돌이 나면 해결할 방법이 없기 때문에',
        'rebase 는 커밋을 새로 만들어 해시가 바뀌므로, 기존 커밋을 가진 동료의 히스토리와 갈라지기 때문에',
        'rebase 는 merge 보다 코드 변경 내용을 일부 잃어버리기 때문에',
        'rebase 하면 커밋 메시지가 모두 삭제되기 때문에',
      ],
      answer: 1,
      explain:
        'rebase는 커밋을 다른 베이스 위에 재적용하며 새 해시의 커밋을 만듭니다. 공유 브랜치에서 이를 force push 하면 동료의 로컬 커밋과 원격이 서로 다른 히스토리가 되어 중복 커밋·충돌이 발생합니다. 충돌은 rebase 중에도 해결할 수 있고, 내용이나 메시지가 사라지지는 않습니다.',
    },
    {
      id: 'q8-09',
      level: 8,
      type: '실무 상황',
      topic: 'revert vs reset',
      prompt: '어제 main 에 merge 되어 운영에 배포된 커밋 a1b2c3d 가 버그를 일으키고 있습니다. 팀원 여럿이 이미 main 을 pull 받은 상태입니다. 가장 안전한 되돌리기 방법은?',
      choices: [
        'git revert a1b2c3d 로 되돌리는 커밋을 만들어 push 한다',
        'git reset --hard a1b2c3d~1 후 git push --force 한다',
        'git rebase -i 로 해당 커밋을 drop 하고 force push 한다',
        '로컬에서 파일을 직접 수정하고 커밋 메시지 없이 push 한다',
      ],
      answer: 0,
      explain:
        'revert는 변경을 취소하는 "새 커밋"을 추가하므로 히스토리를 다시 쓰지 않아 공유 브랜치에서 안전하고, 배포 이력도 남습니다. reset이나 rebase 후 force push 는 이미 pull 받은 팀원의 히스토리를 깨뜨립니다.',
    },
    {
      id: 'q8-10',
      level: 8,
      type: '빈칸 채우기',
      topic: 'Mockito stub',
      prompt: 'repository 가 1번 사용자를 반환하도록 stub 하려 합니다. 빈칸에 들어갈 메서드는?',
      code: `when(userRepository.findById(1L)).______(Optional.of(user));`,
      choices: ['doReturn', 'verify', 'thenReturn', 'willAnswer'],
      answer: 2,
      explain:
        'when(호출).thenReturn(값) 이 Mockito의 기본 stub 문법입니다. verify 는 호출 여부를 검증하는 메서드이고, doReturn 은 doReturn(값).when(mock).메서드() 형태로 쓰는 다른 문법입니다.',
    },
    {
      id: 'q8-11',
      level: 8,
      type: '버그 찾기',
      topic: 'Mockito 설정',
      prompt: '다음 테스트를 실행하면 orderService.pay() 내부에서 NullPointerException 이 납니다. 원인은?',
      code: `class OrderServiceTest {
    @Mock OrderRepository orderRepository;
    @InjectMocks OrderService orderService;

    @Test
    void pay() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(new Order(1L, 1000)));
        orderService.pay(1L);
    }
}`,
      choices: [
        '@Test 메서드가 public 이 아니라서',
        'Optional.of 대신 Optional.ofNullable 을 써야 해서',
        '@InjectMocks 는 생성자 주입을 지원하지 않아서',
        '@ExtendWith(MockitoExtension.class) 가 없어 @Mock/@InjectMocks 가 초기화되지 않아서',
      ],
      answer: 3,
      explain:
        'JUnit5에서 @Mock 어노테이션이 동작하려면 MockitoExtension 이 필드를 초기화해야 합니다. 없으면 필드가 null 로 남아 NPE가 납니다. JUnit5 테스트 메서드는 public 이 아니어도 되고, @InjectMocks 는 생성자 주입도 지원합니다.',
    },
    {
      id: 'q8-12',
      level: 8,
      type: '개념',
      topic: '스프링 테스트 슬라이스',
      prompt: '@WebMvcTest(OrderController.class) 에 대한 설명으로 옳은 것은?',
      choices: [
        '전체 애플리케이션 컨텍스트와 실제 DB까지 띄우는 통합 테스트다',
        '웹 레이어(Controller 등)만 로드하므로 컨트롤러가 의존하는 Service 는 mock 빈으로 등록해야 한다',
        'Repository 쿼리를 검증하기 위한 테스트 어노테이션이다',
        '실제 톰캣 서버를 랜덤 포트로 띄워 HTTP 요청을 보낸다',
      ],
      answer: 1,
      explain:
        '@WebMvcTest 는 MVC 관련 빈만 로드하는 슬라이스 테스트라 Service 빈이 없으므로 @MockitoBean(구버전 @MockBean)으로 대체해야 합니다. 전체 컨텍스트는 @SpringBootTest, Repository 테스트는 @DataJpaTest 의 역할이고, MockMvc 는 실제 서버 없이 동작합니다.',
    },
    {
      id: 'q8-13',
      level: 8,
      type: '코드 출력',
      topic: 'Mock 기본값',
      prompt: '다음 코드의 출력은? (stub 은 하나도 하지 않았다)',
      code: `List<String> list = mock(List.class);
list.add("a");
System.out.println(list.size() + " " + list.get(0));`,
      choices: ['1 a', '0 a', '0 null', 'NullPointerException 발생'],
      answer: 2,
      explain:
        'mock 객체는 stub 되지 않은 메서드에서 실제 로직을 실행하지 않고 기본값(int는 0, 객체는 null)을 반환합니다. add("a") 도 실제로 저장하지 않으므로 size()는 0, get(0)은 null 입니다. 실제 동작이 필요하면 spy 를 써야 합니다.',
    },
    {
      id: 'q8-14',
      level: 8,
      type: '버그 찾기',
      topic: '로깅 보안',
      prompt: '로그인 실패 원인을 추적하려고 다음 로그를 추가했습니다. 가장 심각한 문제는?',
      code: `log.info("로그인 시도 email=" + email + ", password=" + password);`,
      choices: [
        '비밀번호가 평문으로 로그에 남아 로그를 볼 수 있는 모든 사람에게 노출된다',
        'info 대신 warn 레벨을 써야 한다',
        '이메일을 대문자로 변환하지 않았다',
        '로그 메시지가 한국어라서 인코딩이 깨진다',
      ],
      answer: 0,
      explain:
        '로그는 여러 시스템·사람이 접근하고 오래 보관되므로 비밀번호·토큰·카드번호를 남기면 그대로 유출 사고가 됩니다. 추가로 문자열 + 연결 대신 {} 플레이스홀더를 쓰는 것이 좋지만, 보안 문제가 훨씬 심각합니다.',
    },
    {
      id: 'q8-15',
      level: 8,
      type: '빈칸 채우기',
      topic: 'SLF4J',
      prompt: 'SLF4J 에서 로그 레벨이 꺼져 있을 때 문자열 생성 비용을 줄이는 파라미터 바인딩 문법으로, 빈칸에 들어갈 것은?',
      code: `log.debug("주문 처리 orderId=___, userId=___", orderId, userId);`,
      choices: ['%s', '{}', '?', '#{}'],
      answer: 1,
      explain:
        'SLF4J 는 {} 플레이스홀더를 쓰며, 해당 레벨이 활성화된 경우에만 인자를 문자열로 합칩니다. %s 는 String.format 문법, ? 는 JDBC PreparedStatement 문법입니다.',
    },
    {
      id: 'q8-16',
      level: 8,
      type: '실무 상황',
      topic: 'Gradle 의존성',
      prompt: '코드에서는 JDBC 표준 인터페이스만 사용하고, MySQL 드라이버 클래스는 애플리케이션 실행 시에만 필요합니다. build.gradle 에 드라이버를 추가할 가장 적절한 구성은?',
      choices: ['compileOnly', 'testImplementation', 'annotationProcessor', 'runtimeOnly'],
      answer: 3,
      explain:
        'runtimeOnly 는 컴파일 클래스패스에는 넣지 않고 실행 시에만 포함해, 코드가 드라이버 구현에 직접 의존하는 실수를 막아 줍니다. compileOnly 는 반대로 컴파일 시에만 있고 실행 시엔 빠지므로(예: Lombok) 드라이버를 못 찾게 됩니다.',
    },
    {
      id: 'q8-17',
      level: 8,
      type: '실무 상황',
      topic: 'Docker',
      prompt: '새 버전 배포로 컨테이너를 교체했더니, 사용자들이 그동안 업로드한 프로필 이미지가 모두 사라졌습니다. 이미지는 컨테이너 내부 /app/uploads 에 저장하고 있었습니다. 근본 원인과 해결로 옳은 것은?',
      choices: [
        'Dockerfile 의 EXPOSE 포트가 잘못되어 파일이 전송되지 않았다 → 포트를 수정한다',
        'JVM 힙 메모리가 부족했다 → -Xmx 를 늘린다',
        '컨테이너 파일시스템은 컨테이너를 새로 만들면 사라진다 → 볼륨이나 S3 같은 외부 스토리지에 저장한다',
        '이미지 태그를 latest 로 쓰지 않아서 → 항상 latest 태그로 배포한다',
      ],
      answer: 2,
      explain:
        '컨테이너의 쓰기 계층은 컨테이너 수명과 함께 사라지므로 영구 데이터는 볼륨이나 외부 스토리지에 둬야 합니다. EXPOSE 나 힙 크기와는 무관하며, 오히려 latest 태그는 어떤 버전이 떠 있는지 모호해져 피해야 합니다.',
    },
    {
      id: 'q8-18',
      level: 8,
      type: 'OX',
      topic: 'Git 협업',
      prompt: '여러 명이 함께 쓰는 main 브랜치에서 잘못된 커밋을 없앨 때는 git reset --hard 후 git push --force 하는 것이 권장되는 방법이다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        '공유 브랜치의 히스토리를 다시 쓰면 이미 pull 받은 팀원들의 히스토리와 충돌하고 배포 이력도 사라집니다. 공유 브랜치에서는 git revert 로 되돌리는 커밋을 추가하는 것이 원칙입니다.',
    },
  ],
};

export default content;
