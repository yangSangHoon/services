import type { LevelContent } from './types';

const content: LevelContent = {
  level: 10,
  lessons: [
    {
      id: 'l10-patterns',
      level: 10,
      title: '실무 디자인 패턴',
      summary: '전략, 템플릿 메서드, 팩토리, 싱글톤 함정, 옵저버, 데코레이터, 프록시',
      blocks: [
        {
          t: 'p',
          text: '디자인 패턴은 외우는 목록이 아니라 "변하는 것과 변하지 않는 것을 분리하는" 검증된 방법입니다. 스프링 자체가 패턴의 집합이라, 패턴을 알면 프레임워크 동작(트랜잭션 프록시, 이벤트, 빈 생성)이 이해되고 면접 설명도 쉬워집니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// 전략 패턴: 할인 정책(변하는 알고리즘)을 인터페이스로 분리하고 합성으로 주입
public interface DiscountPolicy {
    int discount(int price);
}
public class RateDiscount implements DiscountPolicy {
    public int discount(int price) { return price * 10 / 100; }
}
public class FixedDiscount implements DiscountPolicy {
    public int discount(int price) { return 1000; }
}

public class OrderService {
    private final DiscountPolicy policy;              // if-else 대신 주입된 전략에 위임
    public OrderService(DiscountPolicy policy) { this.policy = policy; }
    public int finalPrice(int price) { return price - policy.discount(price); }
}`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `// 템플릿 메서드 패턴: 알고리즘 골격은 부모가 고정, 일부 단계만 자식이 상속으로 구현
public abstract class ReportExporter {
    public final void export() {          // 골격 (final 로 순서 고정)
        var data = load();
        var body = format(data);          // 변하는 단계
        write(body);
    }
    protected abstract String format(List<Row> data);
    // load(), write() 는 공통 구현
}`,
        },
        {
          t: 'table',
          head: ['패턴', '핵심 아이디어', '스프링/자바 예'],
          rows: [
            ['전략', '알고리즘을 인터페이스로 분리, 합성(위임)으로 교체', 'Comparator, 여러 구현 빈 주입'],
            ['템플릿 메서드', '골격은 부모, 세부 단계는 상속으로', 'JdbcTemplate 의 콜백 이전 형태, AbstractController'],
            ['팩토리', '객체 생성 로직을 한 곳에 캡슐화', 'BeanFactory, LocalDate.of()'],
            ['옵저버', '상태 변화를 구독자들에게 통지, 발행자는 구독자를 모름', 'ApplicationEventPublisher + @EventListener'],
            ['데코레이터', '같은 인터페이스로 감싸 기능을 덧붙임', 'BufferedInputStream(new FileInputStream(...))'],
            ['프록시', '같은 인터페이스로 감싸 접근을 제어(지연 로딩, 트랜잭션, 캐시)', '@Transactional, JPA 지연 로딩 프록시'],
          ],
        },
        {
          t: 'p',
          text: '싱글톤 패턴은 전역 상태를 만들기 쉬워 테스트가 어렵고(mock 교체 불가), 직접 구현하면 지연 초기화의 스레드 안전성 문제가 생깁니다. 스프링 빈은 컨테이너가 싱글톤으로 관리해 주지만, 그렇다고 빈에 요청별 상태를 담는 필드를 두면 모든 요청이 그 필드를 공유하게 됩니다. 싱글톤 빈은 반드시 무상태(stateless)로 설계하세요.',
        },
        {
          t: 'p',
          text: '스프링 AOP 프록시는 빈을 감싼 프록시 객체가 외부 호출을 가로채 트랜잭션 등을 적용합니다. 따라서 같은 클래스 안에서 this.method() 로 호출하면 프록시를 거치지 않아 @Transactional, @Cacheable, @Async 가 적용되지 않습니다(self-invocation 문제).',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 패턴을 위해 패턴을 쓰는 것. 구현이 하나뿐이고 바뀔 계획도 없는데 인터페이스·팩토리·전략을 겹겹이 만들면 읽기만 어려워집니다. 변경이 실제로 두 번째 일어날 때 추상화해도 늦지 않습니다.',
        },
      ],
    },
    {
      id: 'l10-architecture',
      level: 10,
      title: '아키텍처와 DDD 기초',
      summary: '레이어드 vs 헥사고날, 의존성 방향, 애그리거트, 바운디드 컨텍스트',
      blocks: [
        {
          t: 'p',
          text: '레이어드 아키텍처(Controller → Service → Repository)는 단순하고 익숙해서 대부분의 프로젝트 출발점입니다. 하지만 도메인 로직이 JPA 엔티티·외부 API 클라이언트 같은 기술 세부사항에 직접 의존하기 쉬워, 기술을 바꾸거나 도메인만 테스트하기 어려워지는 문제가 있습니다.',
        },
        {
          t: 'p',
          text: '헥사고날(포트와 어댑터) 아키텍처는 도메인을 중심에 두고, 도메인이 필요한 기능을 "포트(인터페이스)"로 정의합니다. DB·메시지 큐·외부 API 는 그 포트를 구현하는 "어댑터"입니다. 의존성 방향이 항상 바깥(어댑터) → 안(도메인)이라 도메인은 어떤 기술에도 의존하지 않습니다.',
        },
        {
          t: 'code',
          lang: 'text',
          code: `order/
├── domain/                 # 순수 자바: Order, OrderLine, 도메인 규칙
├── application/
│   ├── port/in/            # PlaceOrderUseCase (들어오는 포트)
│   ├── port/out/           # LoadOrderPort, PaymentPort (나가는 포트, 인터페이스)
│   └── service/            # PlaceOrderService implements PlaceOrderUseCase
└── adapter/
    ├── in/web/             # OrderController → UseCase 호출
    └── out/
        ├── persistence/    # OrderJpaAdapter implements LoadOrderPort
        └── payment/        # TossPaymentAdapter implements PaymentPort`,
        },
        {
          t: 'table',
          head: ['구분', '레이어드', '헥사고날'],
          rows: [
            ['의존 방향', '위 → 아래 (Service 가 Repository 구현에 의존하기 쉬움)', '바깥 → 안 (어댑터가 도메인 포트에 의존)'],
            ['장점', '단순, 학습 비용 낮음, 빠른 개발', '기술 교체·도메인 단위 테스트 쉬움'],
            ['단점', '도메인이 기술에 오염되기 쉬움', '클래스·매핑 코드 증가, 작은 서비스엔 과함'],
          ],
        },
        {
          t: 'p',
          text: 'DDD(도메인 주도 설계)의 애그리거트는 "함께 일관성을 지켜야 하는 객체 묶음"입니다. 외부는 애그리거트 루트를 통해서만 내부를 변경할 수 있고, 하나의 트랜잭션은 원칙적으로 하나의 애그리거트만 수정합니다. 다른 애그리거트는 객체 참조가 아니라 ID 로 참조합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public class Order {                      // 애그리거트 루트
    private Long id;
    private Long memberId;                   // 다른 애그리거트(Member)는 ID 로 참조
    private final List<OrderLine> lines = new ArrayList<>();
    private OrderStatus status;

    public void addLine(Long productId, int qty, int price) {
        if (status != OrderStatus.CREATED) throw new IllegalStateException("수정 불가 상태");
        lines.add(new OrderLine(productId, qty, price));   // 내부 객체는 루트를 통해서만 변경
    }
    public int totalPrice() { return lines.stream().mapToInt(OrderLine::amount).sum(); }
}`,
        },
        {
          t: 'list',
          items: [
            '바운디드 컨텍스트: 같은 단어가 같은 의미로 쓰이는 경계. "상품"은 카탈로그 컨텍스트에선 설명·이미지, 재고 컨텍스트에선 수량, 정산 컨텍스트에선 가격·수수료',
            '컨텍스트마다 자기 모델을 따로 가진다 — 모든 걸 담은 거대한 Product 엔티티 하나를 공유하지 않는다',
            '바운디드 컨텍스트는 MSA 로 나눌 때 서비스 경계의 좋은 후보가 된다',
            '유비쿼터스 언어: 기획자와 개발자가 같은 용어를 쓰고, 그 용어가 코드의 클래스·메서드 이름이 된다',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 처음부터 완벽한 헥사고날을 도입하기보다, 레이어드 구조에서 "도메인 로직은 엔티티/도메인 객체에, 외부 시스템 호출은 인터페이스 뒤로" 두 가지만 지켜도 나중에 구조를 바꾸기 훨씬 쉬워집니다.',
        },
      ],
    },
    {
      id: 'l10-distributed',
      level: 10,
      title: 'MSA와 분산 트랜잭션',
      summary: '모놀리스 vs MSA 트레이드오프, 2PC 한계, SAGA, Outbox 패턴, API 게이트웨이',
      blocks: [
        {
          t: 'p',
          text: 'MSA 는 "더 좋은 아키텍처"가 아니라 "조직과 배포의 독립성을 얻는 대신 분산 시스템의 복잡도를 지불하는" 선택입니다. 서비스 간 호출은 네트워크를 타므로 실패·지연이 일상이 되고, 하나의 DB 트랜잭션으로 묶던 일을 여러 서비스에 걸쳐 맞춰야 합니다.',
        },
        {
          t: 'table',
          head: ['구분', '모놀리스', 'MSA'],
          rows: [
            ['배포', '한 번에 전체 배포', '서비스별 독립 배포'],
            ['확장', '전체를 통째로 복제', '부하 큰 서비스만 확장'],
            ['트랜잭션', 'DB 트랜잭션 하나로 간단', '분산 트랜잭션(SAGA 등) 필요'],
            ['장애', '한 버그가 전체를 죽일 수 있음', '격리 가능하지만 연쇄 장애·네트워크 실패 대응 필요'],
            ['운영 비용', '낮음', '모니터링·분산 추적·배포 파이프라인 등 높음'],
            ['어울리는 상황', '초기 제품, 소규모 팀', '여러 팀이 독립적으로 빠르게 배포해야 하는 큰 조직'],
          ],
        },
        {
          t: 'p',
          text: '2PC(2단계 커밋)는 코디네이터가 모든 참여자에게 "준비됐나?"를 묻고 모두 OK 일 때 커밋시키는 방식입니다. 하지만 모든 참여자가 응답할 때까지 락을 잡고 기다려야 해 느리고, 코디네이터가 중간에 죽으면 참여자들이 결정을 기다리며 블로킹되며, Kafka·외부 API 처럼 XA 를 지원하지 않는 시스템은 참여시킬 수 없습니다.',
        },
        {
          t: 'p',
          text: 'SAGA 는 긴 트랜잭션을 각 서비스의 로컬 트랜잭션들의 순서로 나누고, 중간에 실패하면 이미 완료된 단계를 되돌리는 "보상 트랜잭션"을 역순으로 실행합니다. 원자성 대신 최종적 일관성(eventual consistency)을 받아들이는 방식입니다.',
        },
        {
          t: 'code',
          lang: 'text',
          code: `[주문 SAGA]
1. 주문 생성 (PENDING)         ← 보상: 주문 취소
2. 결제 승인                   ← 보상: 결제 취소(환불)
3. 재고 차감                   ← 보상: 재고 복원
4. 주문 확정 (CONFIRMED)

3번 재고 부족으로 실패 → 2번 보상(환불) → 1번 보상(주문 취소)

- 코레오그래피: 각 서비스가 이벤트를 듣고 다음 행동을 스스로 결정 (중앙 없음, 흐름 파악 어려움)
- 오케스트레이션: 오케스트레이터가 각 단계를 명령 (흐름이 한 곳에 보임, 오케스트레이터 복잡도 증가)`,
        },
        {
          t: 'p',
          text: '"DB 저장 + 메시지 발행"은 원자적이지 않습니다. DB 커밋 후 Kafka 발행이 실패하면 이벤트가 유실되고, 발행 후 DB 롤백되면 존재하지 않는 주문의 이벤트가 나갑니다. Transactional Outbox 패턴은 이벤트를 같은 DB 트랜잭션으로 outbox 테이블에 함께 저장하고, 별도 릴레이(폴링 또는 CDC)가 이를 읽어 발행합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Transactional
public void placeOrder(PlaceOrderCommand cmd) {
    Order order = orderRepository.save(Order.create(cmd));
    outboxRepository.save(new OutboxEvent(           // 같은 트랜잭션 → 둘 다 저장되거나 둘 다 롤백
            "OrderPlaced", order.getId(), toJson(order)));
}

// 별도 스케줄러/CDC(Debezium 등)가 outbox 를 읽어 Kafka 로 발행 후 sent 표시
// 발행 후 표시 전에 죽으면 재발행 → at-least-once → 컨슈머는 멱등해야 한다`,
        },
        {
          t: 'list',
          items: [
            'API 게이트웨이: 클라이언트의 단일 진입점. 라우팅, 인증·인가, rate limiting, 로깅, CORS 등 공통 관심사를 처리',
            '게이트웨이에 비즈니스 로직을 넣지 않는다 — 모든 팀이 의존하는 병목이 된다',
            '게이트웨이 자체가 단일 장애 지점이 되지 않도록 다중화한다',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 작은 팀이 초기부터 MSA 로 시작하기보다, 모듈 경계를 명확히 나눈 "모듈러 모놀리스"로 시작해 실제로 독립 배포·확장이 필요한 부분만 떼어내는 경우가 많습니다. 경계를 잘못 나눈 MSA 는 "분산된 모놀리스"가 되어 둘의 단점만 갖게 됩니다.',
        },
      ],
    },
    {
      id: 'l10-resilience',
      level: 10,
      title: '장애 대응 설계와 포스트모템',
      summary: '타임아웃, 재시도+지수 백오프+jitter, 서킷 브레이커, 벌크헤드, 우아한 성능 저하, 포스트모템 문화',
      blocks: [
        {
          t: 'p',
          text: '분산 시스템에서 장애는 "언제" 나느냐의 문제입니다. 가장 무서운 것은 외부 의존성 하나가 느려졌을 때 그걸 기다리는 스레드·커넥션이 쌓여 내 서비스까지 죽고, 그게 다시 나를 호출하는 서비스로 번지는 연쇄 장애입니다. 아래 패턴들은 장애를 "격리하고 빨리 실패하게" 만드는 도구입니다.',
        },
        {
          t: 'table',
          head: ['패턴', '하는 일', '없으면'],
          rows: [
            ['타임아웃', '응답을 무한정 기다리지 않음 (connect/read 각각)', '느린 의존성 하나에 스레드가 전부 묶임'],
            ['재시도 + 지수 백오프 + jitter', '일시적 실패를 간격을 늘려가며 재시도, 랜덤 지연으로 동시 재시도 분산', '즉시 재시도가 장애 중인 서버에 트래픽 폭탄(retry storm)'],
            ['서킷 브레이커', '실패율이 임계치를 넘으면 회로를 열어 호출 자체를 즉시 차단, 일정 시간 후 half-open 으로 시험 호출', '죽은 서비스를 계속 두드리며 자원 낭비'],
            ['벌크헤드', '의존성별로 스레드 풀/커넥션을 분리해 한쪽 고갈이 다른 쪽에 번지지 않게', '추천 API 장애로 결제까지 멈춤'],
            ['우아한 성능 저하(fallback)', '부가 기능 실패 시 기본값·캐시 값으로 핵심 기능은 유지', '추천 영역 하나 때문에 상품 페이지 전체 에러'],
          ],
        },
        {
          t: 'code',
          lang: 'yaml',
          code: `resilience4j:
  circuitbreaker:
    instances:
      recommendApi:
        sliding-window-size: 50
        failure-rate-threshold: 50          # 실패율 50% 이상이면 OPEN
        slow-call-duration-threshold: 2s    # 2초 넘는 호출도 "느린 호출"로 집계
        slow-call-rate-threshold: 50
        wait-duration-in-open-state: 30s    # 30초 후 HALF_OPEN 으로 시험
  retry:
    instances:
      recommendApi:
        max-attempts: 3
        wait-duration: 200ms
        enable-exponential-backoff: true    # 200ms → 400ms → 800ms ...
        enable-randomized-wait: true        # jitter`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `@CircuitBreaker(name = "recommendApi", fallbackMethod = "fallback")
public List<Product> recommend(Long userId) {
    return recommendClient.get(userId);      // HTTP 클라이언트에도 타임아웃 설정 필수
}

private List<Product> fallback(Long userId, Throwable t) {
    return bestSellerCache.get();            // 개인화 대신 인기 상품으로 대체
}`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 멱등하지 않은 요청(결제, 주문 생성)을 무조건 재시도하는 것. 타임아웃이 났어도 상대 서버에서는 처리됐을 수 있어 중복 결제가 됩니다. 재시도는 멱등한 요청이나 멱등 키를 지원하는 API 에만, 그리고 4xx(클라이언트 오류)는 재시도하지 않습니다.',
        },
        {
          t: 'p',
          text: '포스트모템(장애 회고)은 장애 후 타임라인, 영향 범위, 근본 원인, 재발 방지 액션을 정리하는 문서입니다. 핵심은 "비난 없는(blameless)" 문화입니다. 사람의 실수를 탓하면 다음부터 사람들이 정보를 숨기고, 실수를 가능하게 만든 시스템의 허점은 그대로 남습니다.',
        },
        {
          t: 'list',
          items: [
            '타임라인: 감지 시각, 대응 단계, 복구 시각 (감지까지 걸린 시간 MTTD, 복구까지 걸린 시간 MTTR)',
            '영향: 영향받은 사용자 수, 실패 요청 수, 매출 손실',
            '근본 원인: "왜?"를 반복해 시스템 차원의 원인까지 (5 Whys)',
            '액션 아이템: 담당자와 기한이 있는 구체적 조치 (알람 추가, 타임아웃 설정, 배포 가드레일 등)',
          ],
        },
      ],
    },
    {
      id: 'l10-scale',
      level: 10,
      title: '확장성, CAP, 시스템 설계 면접',
      summary: '수평/수직 확장, 무상태 서버, 읽기 복제본, 샤딩, CAP 정리, 설계 면접 접근법',
      blocks: [
        {
          t: 'p',
          text: '수직 확장(Scale-up)은 서버 사양을 올리는 것으로 간단하지만 한계와 비용 급증, 단일 장애 지점 문제가 있습니다. 수평 확장(Scale-out)은 서버 대수를 늘리는 것으로 사실상 무한히 확장 가능하지만, 서버가 상태를 갖지 않아야(stateless) 로드밸런서가 아무 서버에나 요청을 보낼 수 있습니다.',
        },
        {
          t: 'list',
          items: [
            '무상태 서버: 세션은 Redis 같은 외부 저장소나 토큰으로, 업로드 파일은 S3 같은 오브젝트 스토리지로, 로컬 메모리에 요청 간 상태를 두지 않는다',
            '읽기 복제본(Read Replica): 쓰기는 Primary, 읽기는 Replica 로 분산. 단, 복제 지연(replication lag) 때문에 방금 쓴 데이터가 Replica 에 아직 없을 수 있다',
            '샤딩: 데이터를 키(예: user_id) 기준으로 여러 DB 에 나눠 저장해 쓰기까지 분산. 샤드 간 조인·트랜잭션이 어렵고, 샤드 키를 잘못 고르면 특정 샤드에 부하 집중(hot spot)',
            '캐시·CDN: 가장 싼 확장. 정적 리소스는 CDN, 반복 조회는 캐시',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 회원가입 직후 "내 정보" 조회를 읽기 복제본으로 보내 "가입했는데 회원이 없다"는 오류를 만드는 것. 방금 쓴 데이터를 바로 읽어야 하는 흐름은 Primary 에서 읽도록(read-your-writes) 라우팅하세요.',
        },
        {
          t: 'p',
          text: 'CAP 정리: 분산 시스템은 네트워크 분할(Partition)이 발생했을 때 일관성(Consistency: 모든 노드가 같은 최신 데이터)과 가용성(Availability: 모든 요청에 응답) 중 하나를 포기해야 합니다. 네트워크 분할은 피할 수 없으므로 현실적인 질문은 "분할 시 CP 냐 AP 냐"입니다.',
        },
        {
          t: 'table',
          head: ['선택', '분할 시 동작', '어울리는 데이터'],
          rows: [
            ['CP', '최신성을 보장할 수 없으면 에러/대기로 응답 거부', '계좌 잔액, 재고, 결제'],
            ['AP', '오래된 값이라도 응답, 나중에 맞춤(최종 일관성)', '좋아요 수, 피드, 조회수'],
          ],
        },
        {
          t: 'code',
          lang: 'text',
          code: `[시스템 설계 면접 접근 순서 — 예: "URL 단축 서비스를 설계하세요"]
1. 요구사항 명확화 (질문하기)
   - 기능: 단축 생성, 리다이렉트, 만료? 커스텀 URL? 통계?
   - 비기능: DAU, 초당 요청 수, 읽기:쓰기 비율(예: 100:1), 지연 목표, 가용성
2. 규모 추정: QPS, 저장 용량(5년치), 대역폭
3. 고수준 설계: 클라이언트 → LB → API 서버 → 캐시 → DB, API 정의
4. 상세 설계: 키 생성 방식(Base62, ID 생성기), DB 선택과 스키마, 캐시 전략
5. 병목·장애 지점과 트레이드오프: 핫 키, 샤딩, 복제, 모니터링`,
        },
        {
          t: 'tip',
          text: '💡 실무와 면접 모두에서 정답보다 "트레이드오프를 말할 수 있는가"가 중요합니다. "Redis 를 쓰겠습니다"가 아니라 "읽기가 쓰기의 100배라 캐시 효과가 크고, 단축 URL 은 거의 바뀌지 않아 무효화 부담이 적으니 캐시를 두겠습니다. 대신 캐시 장애 시 DB 로 몰리는 부하는 ~로 대비합니다"처럼 근거를 붙이세요.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q10-01',
      level: 10,
      type: '개념',
      topic: '전략 패턴',
      prompt:
        '할인 계산 메서드가 if (grade == VIP) ... else if (grade == GOLD) ... 로 계속 늘어나고, 새 할인 정책이 생길 때마다 이 메서드를 수정해야 합니다. 정책을 인터페이스로 분리하고 구현체를 주입받아 교체하도록 바꾸려 할 때 가장 적합한 패턴은?',
      choices: ['싱글톤 패턴', '전략 패턴', '옵저버 패턴', '템플릿 메서드 패턴'],
      answer: 1,
      explain:
        '전략 패턴은 변하는 알고리즘(할인 정책)을 인터페이스로 분리하고 합성으로 주입해, 새 정책 추가 시 기존 코드를 수정하지 않게 합니다(OCP). 템플릿 메서드는 골격이 고정된 알고리즘의 일부 단계를 상속으로 바꾸는 패턴이라 이 요구와는 거리가 있습니다.',
    },
    {
      id: 'q10-02',
      level: 10,
      type: 'OX',
      topic: '템플릿 메서드 vs 전략',
      prompt: '템플릿 메서드 패턴은 상속을 이용해, 전략 패턴은 합성(위임)을 이용해 변하는 부분을 분리한다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        '템플릿 메서드는 부모 클래스가 골격을 정하고 자식 클래스가 추상 메서드를 오버라이드(상속)하며, 전략 패턴은 전략 객체를 필드로 가지고 위임(합성)합니다. 합성 쪽이 런타임 교체와 테스트가 더 유연하다는 것이 일반적인 평가입니다.',
    },
    {
      id: 'q10-03',
      level: 10,
      type: '버그 찾기',
      topic: '싱글톤 빈 상태',
      prompt: '운영에서 간헐적으로 "A 사용자에게 B 사용자의 주문 내역이 보인다"는 신고가 들어왔습니다. 원인은?',
      code: `@Service
public class MyOrderService {
    private Long currentUserId;

    public List<Order> myOrders(Long userId) {
        this.currentUserId = userId;
        audit();
        return orderRepository.findByUserId(currentUserId);
    }
    private void audit() { /* 로그 기록 */ }
}`,
      choices: [
        'findByUserId 쿼리 메서드 이름이 잘못되어서',
        'audit() 가 private 이라 호출되지 않아서',
        '싱글톤 빈의 필드 currentUserId 를 모든 요청 스레드가 공유해, 동시 요청이 서로의 값을 덮어써서',
        'Long 대신 long 을 써야 해서',
      ],
      answer: 2,
      explain:
        '스프링 빈은 기본 싱글톤이라 인스턴스 필드는 모든 요청이 공유합니다. A 요청이 값을 쓴 직후 B 요청이 덮어쓰면 A 가 B 의 주문을 조회하게 됩니다. 요청별 값은 필드가 아닌 지역 변수·매개변수로 다뤄 빈을 무상태로 유지해야 합니다.',
    },
    {
      id: 'q10-04',
      level: 10,
      type: '코드 출력',
      topic: '데코레이터 패턴',
      prompt: '다음 코드의 출력은?',
      code: `interface Msg { String text(); }

class Plain implements Msg {
    public String text() { return "hi"; }
}
class Star implements Msg {
    private final Msg inner;
    Star(Msg inner) { this.inner = inner; }
    public String text() { return "*" + inner.text() + "*"; }
}
class Bracket implements Msg {
    private final Msg inner;
    Bracket(Msg inner) { this.inner = inner; }
    public String text() { return "[" + inner.text() + "]"; }
}

System.out.println(new Bracket(new Star(new Plain())).text());`,
      choices: ['*[hi]*', '[hi]', '*hi*', '[*hi*]'],
      answer: 3,
      explain:
        '가장 바깥 Bracket 이 안쪽 Star 의 결과를 감싸고, Star 는 다시 Plain 의 결과를 감쌉니다. 안쪽부터 "hi" → "*hi*" → "[*hi*]" 가 됩니다. 이처럼 같은 인터페이스로 감싸 기능을 겹겹이 덧붙이는 것이 데코레이터 패턴입니다.',
    },
    {
      id: 'q10-05',
      level: 10,
      type: '버그 찾기',
      topic: '프록시와 self-invocation',
      prompt: 'placeOrder 중 예외가 나도 saveOrder 에서 저장한 주문이 롤백되지 않습니다. 가장 유력한 원인은?',
      code: `@Service
public class OrderService {
    public void placeOrder(OrderCommand cmd) {
        validate(cmd);
        this.saveOrder(cmd);
    }

    @Transactional
    public void saveOrder(OrderCommand cmd) {
        orderRepository.save(new Order(cmd));
        paymentClient.pay(cmd);   // 여기서 예외 발생
    }
}`,
      choices: [
        '같은 클래스 내부에서 this.saveOrder() 로 호출해 프록시를 거치지 않으므로 @Transactional 이 적용되지 않아서',
        '@Transactional 은 public 메서드에 붙일 수 없어서',
        'paymentClient 가 던지는 예외가 Checked Exception 이어야만 롤백되어서',
        'orderRepository.save 는 트랜잭션과 무관하게 항상 즉시 커밋되어서',
      ],
      answer: 0,
      explain:
        '스프링의 @Transactional 은 프록시가 외부 호출을 가로채 적용하므로, 내부 this 호출은 트랜잭션 없이 실행됩니다. 기본 롤백 대상은 오히려 RuntimeException(Unchecked)이며, @Transactional 은 public 메서드에 붙이는 것이 정상입니다. 해결은 placeOrder 에 트랜잭션을 걸거나 별도 빈으로 분리하는 것입니다.',
    },
    {
      id: 'q10-06',
      level: 10,
      type: '개념',
      topic: '헥사고날 아키텍처',
      prompt: '헥사고날(포트와 어댑터) 아키텍처에 대한 설명으로 옳은 것은?',
      choices: [
        '도메인 계층이 JPA Repository 구현체를 직접 import 해 사용한다',
        'Controller, Service, Repository 를 한 클래스로 합쳐 계층을 없앤다',
        '도메인/애플리케이션이 필요한 기능을 포트(인터페이스)로 정의하고, DB·외부 API 어댑터가 그 포트를 구현해 의존성이 바깥에서 안쪽으로 향한다',
        '어댑터가 바뀌면 도메인 코드도 반드시 함께 수정해야 한다',
      ],
      answer: 2,
      explain:
        '헥사고날의 핵심은 의존성 역전으로, 도메인은 포트 인터페이스만 알고 기술 구현(어댑터)은 바깥에 둡니다. 그래서 DB나 외부 API 를 바꿔도 도메인 코드는 그대로이고, 도메인을 기술 없이 단위 테스트할 수 있습니다.',
    },
    {
      id: 'q10-07',
      level: 10,
      type: '개념',
      topic: '애그리거트',
      prompt: 'DDD 의 애그리거트에 대한 설명으로 옳은 것은?',
      choices: [
        '성능을 위해 다른 애그리거트의 내부 엔티티를 직접 수정해도 된다',
        '외부에서는 애그리거트 루트를 통해서만 내부를 변경하며, 다른 애그리거트는 보통 ID 로 참조한다',
        '하나의 트랜잭션에서 가능한 한 많은 애그리거트를 함께 수정하는 것이 원칙이다',
        '애그리거트는 DB 테이블 하나와 항상 1:1 로 대응한다',
      ],
      answer: 1,
      explain:
        '애그리거트는 일관성 경계이므로 루트가 내부 불변식(규칙)을 지키도록 모든 변경을 통제합니다. 원칙적으로 한 트랜잭션은 한 애그리거트만 수정하고, 애그리거트 간에는 ID 참조로 결합을 낮춥니다. 테이블과의 대응은 설계에 따라 여러 테이블일 수 있습니다.',
    },
    {
      id: 'q10-08',
      level: 10,
      type: '실무 상황',
      topic: '모놀리스 vs MSA',
      prompt:
        '백엔드 개발자 4명인 초기 스타트업이 신규 서비스를 시작하며 "확장성을 위해 처음부터 회원·주문·결제·알림을 각각 마이크로서비스로 만들자"는 의견이 나왔습니다. 아직 요구사항이 자주 바뀌는 단계입니다. 가장 합리적인 판단은?',
      choices: [
        '대기업들이 MSA 를 쓰므로 처음부터 MSA 로 간다',
        '서비스 하나당 개발자 한 명씩 배정해 각자 DB 를 만든다',
        '모놀리스는 확장이 불가능하므로 선택지가 아니다',
        '모듈 경계를 명확히 나눈 모듈러 모놀리스로 시작하고, 독립 배포·확장이 실제로 필요해진 부분만 분리한다',
      ],
      answer: 3,
      explain:
        '소규모 팀에서 MSA 는 분산 트랜잭션·배포 파이프라인·모니터링 등 운영 비용이 이점보다 크고, 요구사항이 자주 바뀌면 서비스 경계를 잘못 나누기 쉽습니다. 모놀리스도 무상태로 만들면 수평 확장이 가능하므로 "확장 불가"는 틀린 말입니다.',
    },
    {
      id: 'q10-09',
      level: 10,
      type: '개념',
      topic: '2PC 한계',
      prompt: 'MSA 환경에서 2PC(2단계 커밋)를 잘 쓰지 않는 이유로 가장 적절한 것은?',
      choices: [
        '모든 참여자의 응답을 락을 잡은 채 기다려야 해 느리고, 코디네이터 장애 시 참여자가 블로킹되며, Kafka 같은 많은 시스템이 참여할 수 없어서',
        '2PC 는 데이터 일관성을 전혀 보장하지 못해서',
        '2PC 는 단일 DB 에서만 동작하는 기능이라서',
        '2PC 는 최종적 일관성만 제공해서',
      ],
      answer: 0,
      explain:
        '2PC 는 강한 일관성을 제공하지만 그 대가로 가용성과 성능을 희생하고, XA 를 지원하지 않는 메시지 브로커·외부 API 는 참여시킬 수 없습니다. 그래서 MSA 에서는 최종적 일관성을 받아들이는 SAGA 를 주로 씁니다. 최종적 일관성은 2PC 가 아니라 SAGA 의 특징입니다.',
    },
    {
      id: 'q10-10',
      level: 10,
      type: '실무 상황',
      topic: 'Outbox 패턴',
      prompt:
        '주문 서비스가 주문을 DB 에 커밋한 직후 Kafka 에 OrderPlaced 이벤트를 발행합니다. Kafka 일시 장애로 발행이 실패하면서, 주문은 있는데 배송 서비스는 주문을 모르는 불일치가 생겼습니다. 가장 적절한 해결책은?',
      choices: [
        '이벤트를 먼저 발행하고 그다음 DB 에 커밋한다',
        '발행 실패 시 로그만 남기고 운영자가 수동으로 재발행한다',
        '주문 저장과 같은 DB 트랜잭션으로 outbox 테이블에 이벤트를 저장하고, 별도 릴레이가 outbox 를 읽어 Kafka 로 발행한다',
        '배송 서비스가 주문 서비스 DB 를 직접 조회하게 한다',
      ],
      answer: 2,
      explain:
        'Outbox 패턴은 "주문 저장"과 "이벤트 기록"을 하나의 로컬 트랜잭션으로 묶어 원자성을 확보하고, 발행은 재시도 가능한 별도 과정으로 분리합니다. 순서를 바꾸면 발행 후 DB 롤백 시 유령 이벤트가 생기고, 다른 서비스 DB 직접 조회는 서비스 간 강결합을 만듭니다.',
    },
    {
      id: 'q10-11',
      level: 10,
      type: '빈칸 채우기',
      topic: 'SAGA',
      prompt: 'SAGA 패턴에서 재고 차감 단계가 실패하면, 이미 완료된 결제·주문 생성 단계를 되돌리기 위해 각 단계에 대응하는 ______ 트랜잭션을 역순으로 실행한다. 빈칸에 알맞은 것은?',
      choices: ['중첩(nested)', '보상(compensating)', '읽기 전용(read-only)', '분산 락(distributed lock)'],
      answer: 1,
      explain:
        'SAGA 는 DB 롤백처럼 자동으로 되돌릴 수 없으므로, 결제 취소·주문 취소처럼 앞 단계의 효과를 의미적으로 상쇄하는 보상 트랜잭션을 직접 정의해야 합니다. 중첩 트랜잭션이나 분산 락은 서비스 경계를 넘는 되돌리기를 제공하지 않습니다.',
    },
    {
      id: 'q10-12',
      level: 10,
      type: '실무 상황',
      topic: '서킷 브레이커',
      prompt:
        '상품 상세 페이지가 외부 추천 API 를 동기 호출합니다. 추천 API 가 응답을 30초씩 끌기 시작하자 우리 서버의 요청 스레드가 모두 대기 상태가 되어, 추천과 무관한 결제 API 까지 응답하지 못했습니다. 가장 적절한 개선 조합은?',
      choices: [
        '톰캣 최대 스레드 수를 2000 으로 늘린다',
        '추천 API 호출 실패 시 즉시 3번 재시도한다',
        '추천 API 응답을 기다리는 시간을 무제한으로 둔다',
        '짧은 타임아웃 + 서킷 브레이커로 빠르게 실패시키고, 실패 시 인기 상품 목록으로 fallback 하며, 추천 호출용 스레드 풀을 분리(벌크헤드)한다',
      ],
      answer: 3,
      explain:
        '느린 의존성이 자원을 고갈시키는 연쇄 장애이므로 타임아웃으로 대기를 끊고, 서킷 브레이커로 장애 중인 API 호출을 차단하며, 벌크헤드로 격리하고, fallback 으로 핵심 기능을 유지해야 합니다. 스레드 증설은 고갈 시점을 늦출 뿐이고, 즉시 재시도는 장애 중인 서버 부하를 키웁니다.',
    },
    {
      id: 'q10-13',
      level: 10,
      type: '빈칸 채우기',
      topic: '재시도 백오프',
      prompt: '수천 개의 클라이언트가 같은 순간 실패한 뒤 모두 정확히 1초, 2초, 4초 후에 재시도해 서버에 주기적인 트래픽 폭증이 생겼습니다. 지수 백오프에 ______ 를 추가해 재시도 시점을 무작위로 분산해야 합니다. 빈칸은?',
      choices: ['벌크헤드(bulkhead)', '샤딩(sharding)', '지터(jitter)', '폴백(fallback)'],
      answer: 2,
      explain:
        'jitter 는 백오프 대기 시간에 무작위 값을 섞어 클라이언트들의 재시도 시점이 한꺼번에 몰리지 않게 합니다. 벌크헤드는 자원 격리, 폴백은 실패 시 대체 응답으로 재시도 타이밍 분산과는 다른 개념입니다.',
    },
    {
      id: 'q10-14',
      level: 10,
      type: '개념',
      topic: '벌크헤드',
      prompt: '벌크헤드(Bulkhead) 패턴의 목적으로 가장 적절한 것은?',
      choices: [
        '의존성별로 스레드 풀·커넥션 같은 자원을 분리해, 한 의존성의 장애가 다른 기능의 자원까지 고갈시키지 않게 격리한다',
        '실패한 요청을 지수적으로 간격을 늘려 재시도한다',
        '실패율이 높아지면 호출을 차단하고 일정 시간 후 다시 시도한다',
        '데이터를 키 기준으로 여러 DB 에 나눠 저장한다',
      ],
      answer: 0,
      explain:
        '벌크헤드는 배의 격벽처럼 자원을 칸막이로 나눠 한 칸이 침수돼도 배 전체가 가라앉지 않게 하는 패턴입니다. 지수 재시도는 백오프, 실패율 기반 차단은 서킷 브레이커, 데이터 분산 저장은 샤딩입니다.',
    },
    {
      id: 'q10-15',
      level: 10,
      type: '실무 상황',
      topic: '무상태 서버',
      prompt:
        '트래픽 증가로 서버를 1대에서 4대로 늘리고 로드밸런서를 붙였더니, 사용자들이 "페이지를 이동할 때마다 로그인이 풀린다"고 합니다. 세션은 각 서버의 톰캣 메모리에 저장하고 있습니다. 확장성을 고려한 가장 적절한 해결책은?',
      choices: [
        '서버를 다시 1대로 줄이고 사양을 높인다',
        '세션 타임아웃을 24시간으로 늘린다',
        '모든 서버의 시간을 NTP 로 동기화한다',
        '세션을 Redis 같은 외부 저장소로 옮기거나 토큰 기반 인증으로 바꿔 서버를 무상태로 만든다',
      ],
      answer: 3,
      explain:
        '로드밸런서가 요청을 다른 서버로 보내면 그 서버 메모리엔 세션이 없어 로그인이 풀립니다. 상태를 외부로 빼 서버를 무상태로 만들면 몇 대로 늘려도 어느 서버든 요청을 처리할 수 있습니다. 스케일업으로 되돌리는 것은 확장 한계와 단일 장애 지점 문제를 다시 만듭니다.',
    },
    {
      id: 'q10-16',
      level: 10,
      type: '개념',
      topic: 'CAP',
      prompt: 'CAP 정리에 대한 설명으로 옳은 것은?',
      choices: [
        '좋은 분산 DB 는 일관성, 가용성, 분할 내성을 항상 모두 만족한다',
        '네트워크 분할이 발생하면 일관성과 가용성 중 하나를 포기해야 하며, 계좌 잔액처럼 정확성이 중요한 데이터는 보통 일관성을 택한다',
        'CAP 의 C 는 RDB 트랜잭션 ACID 의 C 와 완전히 같은 의미다',
        '네트워크 분할은 드물기 때문에 분산 시스템 설계에서 고려하지 않아도 된다',
      ],
      answer: 1,
      explain:
        '네트워크 분할은 분산 시스템에서 피할 수 없으므로, 분할 시 응답을 거부하더라도 정확성을 지키는 CP 와 오래된 값이라도 응답하는 AP 중에서 데이터 성격에 맞게 고릅니다. CAP 의 C 는 "모든 노드가 최신 값을 보는" 선형화 가능성에 가깝고, ACID 의 C(제약조건 유지)와는 다른 개념입니다.',
    },
    {
      id: 'q10-17',
      level: 10,
      type: '실무 상황',
      topic: '시스템 설계 면접',
      prompt: '면접관이 "대규모 URL 단축 서비스를 설계해 보세요"라고 했습니다. 가장 먼저 해야 할 일로 적절한 것은?',
      choices: [
        '예상 사용자 수, 읽기/쓰기 비율, 만료·커스텀 URL 필요 여부 등 기능·비기능 요구사항을 질문해 범위를 명확히 한다',
        '바로 Kafka, Redis, Kubernetes 를 포함한 최종 아키텍처 다이어그램을 그린다',
        'Base62 인코딩 함수의 코드를 먼저 작성한다',
        '사용할 DB 를 MySQL 로 정하고 테이블 DDL 부터 작성한다',
      ],
      answer: 0,
      explain:
        '시스템 설계는 요구사항과 규모에 따라 정답이 달라지므로, 먼저 질문으로 범위와 제약을 확정한 뒤 규모 추정 → 고수준 설계 → 상세 설계 → 트레이드오프 순서로 진행합니다. 요구사항 없이 기술부터 나열하면 근거 없는 과잉 설계로 평가됩니다.',
    },
    {
      id: 'q10-18',
      level: 10,
      type: 'OX',
      topic: '포스트모템',
      prompt: '포스트모템(장애 회고)의 주된 목적은 장애를 일으킨 책임자를 찾아 재발하지 않도록 징계하는 것이다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        '포스트모템은 비난 없는(blameless) 문화를 전제로, 실수를 가능하게 만든 시스템의 허점을 찾아 재발 방지 액션을 만드는 것이 목적입니다. 개인을 탓하면 사람들이 정보를 숨기게 되어 진짜 원인을 찾기 어려워집니다.',
    },
  ],
};

export default content;
