import type { LevelContent } from './types';

const content: LevelContent = {
  level: 9,
  lessons: [
    {
      id: 'l9-jvm-gc',
      level: 9,
      title: 'JVM 메모리와 GC',
      summary: 'Heap·Stack·Metaspace 구조, 세대별 가설, Minor/Major GC, G1·ZGC, Stop-the-world',
      blocks: [
        {
          t: 'p',
          text: '"서버가 가끔 멈칫한다", "메모리가 계속 오른다" 같은 문제를 풀려면 JVM이 메모리를 어떻게 나눠 쓰고 GC가 언제 애플리케이션을 멈추는지 알아야 합니다. 시니어와 주니어를 가르는 대표적인 지식입니다.',
        },
        {
          t: 'table',
          head: ['영역', '저장하는 것', '공유', '부족할 때'],
          rows: [
            ['Heap', 'new 로 만든 객체, 배열', '모든 스레드 공유, GC 대상', 'OutOfMemoryError: Java heap space'],
            ['Stack', '메서드 프레임: 지역 변수, 매개변수, 참조값', '스레드마다 따로', 'StackOverflowError (깊은 재귀)'],
            ['Metaspace', '클래스 메타데이터(Java 8+, 네이티브 메모리)', '공유', 'OutOfMemoryError: Metaspace'],
            ['PC Register / Native Stack', '실행 위치, 네이티브 메서드', '스레드마다', '-'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `void order() {
    int qty = 3;                    // Stack: 기본형 값 자체
    Order o = new Order(qty);       // 객체는 Heap, 참조 변수 o 는 Stack
    process(o);                     // 새 Stack 프레임이 쌓임
}                                   // 메서드 종료 → 프레임 제거, Order 는 참조가 없으면 GC 대상`,
        },
        {
          t: 'p',
          text: 'GC는 "약한 세대별 가설(Weak Generational Hypothesis)"에 기반합니다: 대부분의 객체는 금방 쓸모없어지고, 오래된 객체가 새 객체를 참조하는 일은 드물다. 그래서 Heap을 Young(Eden + Survivor)과 Old 영역으로 나눠, 자주 죽는 Young만 자주 빠르게 청소합니다.',
        },
        {
          t: 'list',
          items: [
            'Minor GC: Young 영역 청소. 자주 일어나고 보통 짧지만, 이것도 Stop-the-world 다',
            '살아남은 객체는 Survivor 를 오가며 나이가 쌓이고, 임계값을 넘으면 Old 로 승격(promotion)',
            'Major/Full GC: Old(또는 전체 Heap) 청소. 대상이 크고 오래 걸려 긴 멈춤의 주범',
            'Stop-the-world(STW): GC 작업 중 애플리케이션 스레드를 모두 멈추는 것. 이 시간이 응답 지연으로 직결됨',
          ],
        },
        {
          t: 'table',
          head: ['GC', '특징', '용도'],
          rows: [
            ['Parallel GC', '처리량(throughput) 우선, 멀티스레드로 STW 동안 몰아서 처리', '배치 작업'],
            ['G1 GC', 'Heap을 Region 단위로 나눠 목표 멈춤 시간(-XX:MaxGCPauseMillis) 내로 조절, Java 9+ 기본', '대부분의 서버'],
            ['ZGC', '대부분 작업을 애플리케이션과 동시 수행, 멈춤이 보통 1ms 미만 수준, 대용량 Heap', '저지연이 중요한 서비스'],
          ],
        },
        {
          t: 'code',
          lang: 'text',
          code: `# 자주 쓰는 JVM 옵션
java -Xms4g -Xmx4g \\
     -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \\
     -Xlog:gc*:file=/var/log/app/gc.log:time,uptime \\
     -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/app/ \\
     -jar app.jar`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 서버의 -Xms 와 -Xmx 를 같게 두어 Heap 크기 조정 비용을 없애고, GC 로그와 HeapDumpOnOutOfMemoryError 는 항상 켜 둡니다. 장애는 재현이 어려워서 "그때의 증거"가 없으면 원인을 못 찾습니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 컨테이너 메모리 제한(예: 4GB)과 -Xmx 를 똑같이 4g 로 주는 것. JVM은 Heap 외에도 Metaspace, 스레드 스택, Direct Buffer 등 네이티브 메모리를 쓰므로 컨테이너가 OOM Kill 됩니다. Heap 은 보통 제한의 60~75% 정도로 잡습니다.',
        },
      ],
    },
    {
      id: 'l9-troubleshoot',
      level: 9,
      title: '장애 분석: 누수·덤프·모니터링',
      summary: 'OOM과 메모리 누수 원인, 힙 덤프·스레드 덤프 읽기, APM·메트릭·p99 지연',
      blocks: [
        {
          t: 'p',
          text: 'Java에도 메모리 누수가 있습니다. GC는 "더 이상 참조되지 않는" 객체만 치우기 때문에, 쓰지 않는데 어딘가에서 참조가 계속 남아 있으면 영원히 회수되지 않습니다. 증상은 GC 직후 Heap 사용량의 바닥선이 계단식으로 계속 올라가다 결국 OOM이 나는 것입니다.',
        },
        {
          t: 'list',
          items: [
            'static 컬렉션(Map/List)에 계속 put 만 하고 지우지 않는 "캐시"',
            'ThreadLocal 을 스레드 풀에서 쓰고 remove() 하지 않음 → 스레드가 재사용되며 값이 계속 남음',
            '리스너·콜백 등록 후 해제하지 않음',
            '크기 제한 없는 큐에 생산 속도 > 소비 속도로 쌓임',
            '대용량 조회를 페이징 없이 한 번에 List 로 로딩 (누수는 아니지만 대표적 OOM 원인)',
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `public class UserContext {
    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();

    public static void set(User u) { CURRENT.set(u); }
    public static User get() { return CURRENT.get(); }
    public static void clear() { CURRENT.remove(); }   // 반드시 finally 에서 호출
}

// 필터/인터셉터
try {
    UserContext.set(user);
    chain.doFilter(req, res);
} finally {
    UserContext.clear();   // 안 지우면 다음 요청이 남의 사용자 정보를 볼 수도 있다
}`,
        },
        {
          t: 'code',
          lang: 'text',
          code: `# 힙 덤프: 어떤 객체가 메모리를 차지하는지 (분석: Eclipse MAT, VisualVM)
jmap -dump:live,format=b,file=heap.hprof <pid>
jcmd <pid> GC.heap_dump heap.hprof

# 스레드 덤프: 지금 각 스레드가 무엇을 하는지 (수 초 간격으로 2~3번 떠서 비교)
jstack <pid> > thread1.txt
jcmd <pid> Thread.print

"http-nio-8080-exec-17" #45 waiting on condition
   java.lang.Thread.State: TIMED_WAITING (parking)
     at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:...)`,
        },
        {
          t: 'table',
          head: ['증상', '확인할 것', '흔한 원인'],
          rows: [
            ['CPU 100%', '스레드 덤프에서 RUNNABLE 로 같은 위치에 있는 스레드', '무한 루프, 과도한 GC, 정규식 폭주'],
            ['CPU 낮은데 응답 없음', '스레드 덤프에서 WAITING/BLOCKED 스레드가 기다리는 대상', '커넥션 풀 고갈, 외부 API 지연, 데드락'],
            ['메모리 계속 증가 후 OOM', '힙 덤프의 Dominator Tree, 가장 많이 점유한 객체', '컬렉션 누수, ThreadLocal, 대용량 로딩'],
            ['주기적 멈칫', 'GC 로그의 pause 시간', 'Old 영역 포화로 Full GC 빈발'],
          ],
        },
        {
          t: 'p',
          text: '모니터링은 평균만 보면 안 됩니다. 평균 응답 50ms여도 100명 중 1명은 3초를 기다릴 수 있습니다. p99(99번째 백분위수)는 "가장 느린 1%를 제외한 최대 지연"으로, 실제 사용자 체감과 장애 징후를 훨씬 잘 보여 줍니다. 한 화면이 API를 여러 번 호출하면 사용자가 꼬리 지연을 만날 확률은 더 커집니다.',
        },
        {
          t: 'list',
          items: [
            '메트릭(Micrometer + Prometheus + Grafana): 요청 수, 에러율, 지연 p50/p95/p99, JVM Heap·GC·스레드, 커넥션 풀 사용량',
            'APM(Pinpoint, Datadog, New Relic 등): 요청 하나가 어떤 메서드·SQL·외부 호출에서 시간을 썼는지 트랜잭션 단위 추적',
            '분산 추적: traceId 로 여러 서비스를 거친 요청을 한 줄로 연결',
            '알람은 증상(에러율, p99) 기준으로, 원인 지표는 대시보드에서 분석용으로',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 장애 중 서버를 바로 재시작하기 전에 스레드 덤프(가능하면 힙 덤프도)를 먼저 떠 둡니다. 재시작하면 증상은 사라지지만 원인 증거도 함께 사라져 같은 장애가 반복됩니다. 단, 힙 덤프는 수 GB 크기에 STW 를 유발하니 트래픽을 뺀 인스턴스에서 뜨는 것이 안전합니다.',
        },
      ],
    },
    {
      id: 'l9-concurrency',
      level: 9,
      title: '동시성 심화',
      summary: 'race condition, 데드락 4조건, Atomic·ConcurrentHashMap, 스레드 풀 크기 정하기',
      blocks: [
        {
          t: 'p',
          text: '웹 서버는 요청마다 다른 스레드가 같은 객체(싱글톤 빈, 캐시)를 동시에 다룹니다. race condition 은 여러 스레드가 공유 상태를 "읽고-계산하고-쓰는" 사이에 끼어들어 결과가 실행 순서에 따라 달라지는 문제입니다. count++ 도 읽기·더하기·쓰기 세 단계라 원자적이지 않습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Counter {
    private int count = 0;
    void unsafe() { count++; }                       // 갱신 유실 발생

    private final AtomicInteger atomic = new AtomicInteger();
    void safe() { atomic.incrementAndGet(); }        // CAS 기반, 락 없이 원자적
}

// 동시에 여러 스레드가 집계하는 Map
ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge(url, 1, Integer::sum);                    // 원자적 "없으면 1, 있으면 +1"

// 잘못된 예: get 과 put 사이에 다른 스레드가 끼어들 수 있음 (check-then-act)
Integer v = hits.get(url);
hits.put(url, v == null ? 1 : v + 1);`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: ConcurrentHashMap 을 쓰면 무조건 안전하다고 믿는 것. 개별 메서드 호출은 원자적이지만 get 후 put 처럼 여러 호출을 조합하면 여전히 race condition 입니다. merge, compute, putIfAbsent 같은 원자적 복합 연산을 쓰세요.',
        },
        {
          t: 'p',
          text: '데드락은 두 개 이상의 스레드가 서로 상대가 가진 자원을 기다리며 영원히 멈추는 상태입니다. 아래 4가지 조건이 "모두" 성립해야 발생하므로, 하나만 깨면 예방할 수 있습니다. 실무에서 가장 쉬운 방법은 락 획득 순서를 항상 같게 정해 순환 대기를 없애는 것입니다.',
        },
        {
          t: 'table',
          head: ['데드락 조건', '의미', '깨는 방법 예'],
          rows: [
            ['상호 배제', '자원을 한 번에 한 스레드만 사용', '공유 가능한 자원/불변 객체 사용'],
            ['점유와 대기', '자원을 쥔 채 다른 자원을 기다림', '필요한 자원을 한 번에 획득'],
            ['비선점', '남이 가진 자원을 강제로 뺏을 수 없음', 'tryLock(timeout) 실패 시 가진 락 반납'],
            ['순환 대기', 'A→B, B→A 처럼 대기가 원을 이룸', '락 획득 순서를 전역적으로 고정(예: 계좌 id 오름차순)'],
          ],
        },
        {
          t: 'p',
          text: '스레드 풀 크기는 작업 성격에 따라 정합니다. CPU 바운드 작업은 코어 수(+1) 정도가 적당하고, 그 이상은 컨텍스트 스위칭 비용만 늘어납니다. I/O 바운드 작업은 대기 시간 동안 다른 스레드가 CPU를 쓸 수 있으니 더 크게 잡습니다. 대략적인 공식: 스레드 수 ≈ 코어 수 × (1 + 대기시간 / 계산시간).',
        },
        {
          t: 'code',
          lang: 'java',
          code: `ExecutorService pool = new ThreadPoolExecutor(
        16, 16,                                   // core, max
        0L, TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<>(1000),           // 큐는 반드시 크기 제한
        new ThreadPoolExecutor.CallerRunsPolicy() // 포화 시 호출 스레드가 직접 실행 → 자연스러운 속도 조절
);`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 Executors.newFixedThreadPool 이 내부적으로 크기 제한 없는 LinkedBlockingQueue 를 쓴다는 점에 주의합니다. 처리보다 유입이 빠르면 작업이 무한히 쌓여 OOM 이 납니다. 큐 크기와 거절 정책을 직접 정하세요. Java 21+ 에서 I/O 위주 작업이라면 가상 스레드(virtual thread)도 선택지입니다.',
        },
      ],
    },
    {
      id: 'l9-cache-db',
      level: 9,
      title: '캐시와 DB 성능',
      summary: '로컬 캐시 vs Redis, 캐시 무효화·Stampede·TTL, 인덱스 설계, 실행계획, HikariCP',
      blocks: [
        {
          t: 'p',
          text: '캐시는 "느린 원본(DB, 외부 API)을 빠른 저장소에 복사해 두는 것"입니다. 대신 원본과 사본이 달라질 수 있다는 일관성 문제를 떠안습니다. 그래서 캐시 설계의 핵심 질문은 "얼마나 오래된 데이터까지 허용되는가?"입니다.',
        },
        {
          t: 'table',
          head: ['구분', '로컬 캐시 (Caffeine)', '분산 캐시 (Redis)'],
          rows: [
            ['속도', '매우 빠름(네트워크 없음)', '네트워크 왕복 필요(보통 1ms 내외)'],
            ['서버 간 일관성', '서버마다 다른 값일 수 있음', '모든 서버가 같은 값'],
            ['용량', 'JVM Heap 일부 → GC 부담', '별도 서버 메모리'],
            ['적합한 데이터', '잘 안 바뀌는 설정·코드 테이블', '세션, 랭킹, 여러 서버가 공유해야 하는 값'],
          ],
        },
        {
          t: 'list',
          items: [
            'Cache-Aside: 캐시 조회 → 없으면 DB 조회 후 캐시에 저장. 가장 흔한 패턴',
            '무효화: 데이터 변경 시 캐시를 "갱신"보다 "삭제"하는 편이 동시성 문제에 안전한 경우가 많다',
            'TTL: 무효화를 놓쳐도 결국 맞춰지도록 만료 시간을 항상 둔다',
            'Cache Stampede(Thundering Herd): 인기 키가 만료되는 순간 수많은 요청이 동시에 DB로 몰리는 현상',
            'Stampede 대책: 한 요청만 재계산하도록 락(분산 락/single flight), 만료 전 미리 갱신, TTL 에 랜덤 jitter 를 더해 동시 만료 방지',
          ],
        },
        {
          t: 'p',
          text: '인덱스는 조회를 빠르게 하지만 쓰기(INSERT/UPDATE/DELETE)마다 인덱스도 갱신해야 해서 쓰기 비용과 저장 공간이 늘어납니다. 복합 인덱스 (a, b) 는 a 로 먼저 정렬되고 같은 a 안에서 b 로 정렬된 구조라, 선두 컬럼 a 조건 없이 b 만으로 검색하면 인덱스를 효율적으로 타기 어렵습니다.',
        },
        {
          t: 'code',
          lang: 'sql',
          code: `CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);

-- 인덱스 잘 탐: 선두 컬럼 등치 + 다음 컬럼 범위/정렬
EXPLAIN SELECT * FROM orders
WHERE user_id = 42 AND created_at >= '2026-11-01'
ORDER BY created_at DESC;

-- 인덱스 효율 저하: 선두 컬럼 없음 / 컬럼에 함수 적용
SELECT * FROM orders WHERE created_at >= '2026-11-01';
SELECT * FROM orders WHERE DATE(created_at) = '2026-11-01';`,
        },
        {
          t: 'p',
          text: 'EXPLAIN 으로 실행계획을 보면 MySQL 기준 type 컬럼이 ALL 이면 풀 테이블 스캔, ref/range 면 인덱스 사용, rows 는 읽을 것으로 예상되는 행 수입니다. Extra 에 Using filesort 나 Using temporary 가 보이면 정렬·임시 테이블 비용을 의심합니다.',
        },
        {
          t: 'code',
          lang: 'yaml',
          code: `spring:
  datasource:
    hikari:
      maximum-pool-size: 20        # 무작정 키우면 DB 가 감당 못 함 (서버 수 × 풀 크기 ≤ DB 허용치)
      connection-timeout: 3000     # 커넥션 얻기 대기 한도(ms). 초과 시 예외 → 빠른 실패
      max-lifetime: 1800000        # DB/네트워크 장비의 연결 종료 시간보다 짧게
      leak-detection-threshold: 10000  # 커넥션을 오래 쥐고 있는 코드 탐지`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: @Transactional 메서드 안에서 느린 외부 API 를 호출하는 것. 트랜잭션 동안 DB 커넥션을 쥐고 있기 때문에 외부 API 가 느려지면 커넥션 풀이 금방 고갈되고, 외부 장애가 DB를 쓰는 모든 기능의 장애로 번집니다. 외부 호출은 트랜잭션 밖으로 빼세요.',
        },
      ],
    },
    {
      id: 'l9-messaging',
      level: 9,
      title: '비동기와 메시지 큐',
      summary: 'Kafka 기본 구조, 전달 보장(at-most/at-least/exactly-once), 멱등 컨슈머',
      blocks: [
        {
          t: 'p',
          text: '주문 완료 후 알림 발송·포인트 적립·통계 집계를 모두 동기로 처리하면, 그중 하나만 느려져도 주문 API 전체가 느려집니다. 메시지 큐는 "주문 완료" 이벤트만 발행하고 후속 작업은 각 컨슈머가 비동기로 처리하게 해, 서비스 간 결합과 장애 전파를 줄이고 트래픽 폭주를 완충합니다.',
        },
        {
          t: 'list',
          items: [
            'Topic: 메시지 분류 단위 (예: order-completed)',
            'Partition: 토픽을 나눈 단위. 파티션 안에서만 순서가 보장되며, 같은 key 의 메시지는 같은 파티션으로 간다',
            'Consumer Group: 같은 그룹의 컨슈머들이 파티션을 나눠 처리. 파티션 수보다 컨슈머가 많으면 남는 컨슈머는 논다',
            'Offset: 컨슈머 그룹이 파티션의 어디까지 처리했는지 나타내는 위치',
          ],
        },
        {
          t: 'table',
          head: ['전달 보장', '의미', '대가'],
          rows: [
            ['at-most-once', '최대 한 번, 유실 가능', '처리 전에 offset 커밋'],
            ['at-least-once', '최소 한 번, 중복 가능', '처리 후 offset 커밋. 실무 기본값'],
            ['exactly-once', '정확히 한 번', 'Kafka 트랜잭션 등 범위·비용 제약 큼, 외부 DB 까지 포함하긴 어려움'],
          ],
        },
        {
          t: 'p',
          text: 'at-least-once 에서는 컨슈머가 처리 직후 offset 커밋 전에 죽거나 리밸런싱이 일어나면 같은 메시지를 다시 받습니다. 따라서 컨슈머는 같은 메시지를 두 번 처리해도 결과가 같도록 "멱등"하게 만들어야 합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@KafkaListener(topics = "order-completed", groupId = "point-service")
@Transactional
public void handle(OrderCompletedEvent event) {
    // 이벤트 고유 id 로 처리 이력을 남긴다 (event_id 에 UNIQUE 제약)
    if (processedEventRepository.existsById(event.eventId())) {
        return;                                       // 이미 처리한 메시지 → 무시
    }
    pointService.add(event.userId(), event.amount() / 100);
    processedEventRepository.save(new ProcessedEvent(event.eventId()));
}`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 처리에 계속 실패하는 메시지(잘못된 데이터 등)가 파티션을 막지 않도록, 몇 번 재시도 후 DLQ(Dead Letter Queue) 토픽으로 보내고 알람을 겁니다. 그리고 컨슈머 lag(쌓인 미처리 메시지 수)를 핵심 지표로 모니터링합니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: "Kafka 니까 순서가 보장된다"고 믿는 것. 순서는 파티션 안에서만 보장됩니다. 같은 주문의 이벤트 순서가 중요하면 orderId 를 메시지 key 로 지정해 같은 파티션으로 보내야 합니다.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q9-01',
      level: 9,
      type: '개념',
      topic: 'JVM 메모리',
      prompt: '메서드 안에서 Order o = new Order(); 를 실행했을 때, Order 객체와 참조 변수 o 가 저장되는 위치로 옳은 것은?',
      choices: [
        'Order 객체는 Heap, 참조 변수 o 는 해당 스레드의 Stack',
        'Order 객체와 o 모두 Stack',
        'Order 객체는 Metaspace, o 는 Heap',
        'Order 객체와 o 모두 Heap',
      ],
      answer: 0,
      explain:
        'new 로 생성한 객체는 모든 스레드가 공유하는 Heap 에, 지역 변수(참조값)는 메서드 프레임이 있는 스레드별 Stack 에 저장됩니다. Metaspace 는 객체가 아니라 클래스 메타데이터를 저장하는 영역입니다.',
    },
    {
      id: 'q9-02',
      level: 9,
      type: '개념',
      topic: '세대별 GC',
      prompt: 'Heap 을 Young 과 Old 영역으로 나누는 세대별 GC 의 근거가 되는 가설은?',
      choices: [
        '대부분의 객체는 오래 살아남으므로 Old 영역을 크게 잡아야 한다',
        '큰 객체일수록 먼저 회수해야 효율적이다',
        '대부분의 객체는 생성 후 금방 접근 불가능해진다',
        '모든 객체는 비슷한 수명을 가지므로 한 번에 청소하는 것이 효율적이다',
      ],
      answer: 2,
      explain:
        '약한 세대별 가설은 "대부분의 객체는 금방 죽는다"는 관찰입니다. 그래서 새 객체가 모이는 Young 영역만 자주, 빠르게 청소하면 적은 비용으로 많은 메모리를 회수할 수 있습니다.',
    },
    {
      id: 'q9-03',
      level: 9,
      type: 'OX',
      topic: 'Stop-the-world',
      prompt: 'Minor GC(Young 영역 GC) 도 Stop-the-world 를 발생시킨다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        'Minor GC 도 애플리케이션 스레드를 멈추고 수행됩니다. 다만 대상이 작고 살아남는 객체가 적어 보통 매우 짧을 뿐입니다. 긴 멈춤의 주범은 Old 영역까지 청소하는 Major/Full GC 입니다.',
    },
    {
      id: 'q9-04',
      level: 9,
      type: '실무 상황',
      topic: '메모리 누수',
      prompt:
        'API 서버가 배포 후 3~4일이 지나면 OutOfMemoryError: Java heap space 로 죽습니다. 모니터링을 보면 GC 직후의 Heap 사용량 바닥선이 날마다 계단식으로 올라갑니다. 가장 적절한 다음 행동은?',
      choices: [
        '-Xmx 를 두 배로 늘리고 상황을 지켜본다',
        'GC 를 ZGC 로 바꾼다',
        '매일 새벽에 서버를 자동 재시작하는 스크립트를 만든다',
        'HeapDumpOnOutOfMemoryError 로 받은 힙 덤프를 MAT 로 분석해 회수되지 않고 쌓이는 객체와 그 참조 경로를 찾는다',
      ],
      answer: 3,
      explain:
        'GC 후에도 바닥선이 오른다는 것은 참조가 남아 회수되지 않는 메모리 누수 신호이므로, 힙 덤프로 무엇이 누가 잡고 있는지 찾아야 합니다. Heap 증설·GC 변경·주기적 재시작은 OOM 시점을 늦출 뿐 원인을 해결하지 못합니다.',
    },
    {
      id: 'q9-05',
      level: 9,
      type: '버그 찾기',
      topic: '메모리 누수',
      prompt: '다음 코드가 운영에서 메모리 누수를 일으킨 원인은?',
      code: `@Service
public class PriceService {
    private static final Map<String, BigDecimal> CACHE = new HashMap<>();

    public BigDecimal price(String productId, String couponCode, long requestTime) {
        String key = productId + ":" + couponCode + ":" + requestTime;
        return CACHE.computeIfAbsent(key, k -> calculate(productId, couponCode));
    }
}`,
      choices: [
        'BigDecimal 은 GC 대상이 아니어서',
        'static Map 에 요청 시각까지 포함된 키로 계속 저장되어, 재사용되지 않는 항목이 제거되지 않고 무한히 쌓여서',
        'computeIfAbsent 는 같은 키를 여러 번 저장해서',
        '@Service 빈은 싱글톤이 아니라서 Map 이 여러 개 생겨서',
      ],
      answer: 1,
      explain:
        'requestTime 이 키에 들어가 매 요청마다 새 키가 생기고, 크기 제한·만료가 없는 static Map 이 이를 영원히 참조하므로 GC 가 회수할 수 없습니다. 캐시는 Caffeine 처럼 최대 크기와 TTL 이 있는 구현을 써야 합니다(덤으로 HashMap 은 동시 접근에도 안전하지 않습니다).',
    },
    {
      id: 'q9-06',
      level: 9,
      type: '실무 상황',
      topic: '스레드 덤프 분석',
      prompt:
        '트래픽 피크 시간에 API 응답이 멈췄는데 CPU 사용률은 10% 로 낮습니다. 스레드 덤프를 떠 보니 톰캣 요청 스레드 200개 대부분이 HikariPool.getConnection 에서 TIMED_WAITING 상태입니다. 가장 유력한 원인은?',
      choices: [
        'CPU 코어가 부족해서 스레드가 실행되지 못하고 있다',
        'Young 영역이 너무 작아 Minor GC 가 자주 일어난다',
        'DB 커넥션 풀이 고갈되었다 — 커넥션을 오래 쥐는 느린 쿼리나 트랜잭션 안의 외부 호출을 찾아야 한다',
        '스레드 간 데드락이 발생해 CPU 가 무한 루프를 돌고 있다',
      ],
      answer: 2,
      explain:
        '대부분의 스레드가 커넥션을 기다리는 중이므로 풀이 고갈된 상태이고, CPU 가 낮은 것도 "일하지 않고 기다리는" 상황과 일치합니다. 원인은 커넥션을 오래 점유하는 코드이므로 커넥션을 쥔 스레드가 무엇을 하는지 찾아야 합니다. 무한 루프라면 CPU 가 높아야 합니다.',
    },
    {
      id: 'q9-07',
      level: 9,
      type: '개념',
      topic: '데드락',
      prompt: '데드락이 발생하기 위한 4가지 필요조건에 해당하지 않는 것은?',
      choices: ['상호 배제(Mutual Exclusion)', '점유와 대기(Hold and Wait)', '순환 대기(Circular Wait)', '기아 상태(Starvation)'],
      answer: 3,
      explain:
        '데드락의 4조건은 상호 배제, 점유와 대기, 비선점, 순환 대기입니다. 기아 상태는 특정 스레드가 우선순위 등의 이유로 계속 자원을 얻지 못하는 별개의 문제입니다.',
    },
    {
      id: 'q9-08',
      level: 9,
      type: '코드 출력',
      topic: 'Atomic',
      prompt: '다음 코드의 출력은?',
      code: `AtomicInteger count = new AtomicInteger();
Runnable task = () -> {
    for (int i = 0; i < 10_000; i++) count.incrementAndGet();
};
Thread t1 = new Thread(task);
Thread t2 = new Thread(task);
t1.start(); t2.start();
t1.join();  t2.join();
System.out.println(count.get());`,
      choices: ['10000', '20000', '20000 이하의 값 (실행마다 다름)', '0'],
      answer: 1,
      explain:
        'incrementAndGet 은 CAS 로 원자적으로 증가하므로 갱신이 유실되지 않고, join 으로 두 스레드 종료를 기다린 뒤 출력하므로 항상 20000 입니다. 일반 int 에 count++ 를 했다면 갱신 유실로 20000 이하의 값이 나올 수 있습니다.',
    },
    {
      id: 'q9-09',
      level: 9,
      type: '버그 찾기',
      topic: 'race condition',
      prompt: '다음 싱글톤 빈의 재고 차감 로직은 동시 요청이 몰리면 재고가 음수가 되거나 차감이 누락됩니다. 원인은?',
      code: `@Service
public class StockService {
    private int stock = 100;

    public boolean decrease() {
        if (stock > 0) {
            stock--;
            return true;
        }
        return false;
    }
}`,
      choices: [
        '여러 요청 스레드가 공유 필드 stock 을 동기화 없이 확인 후 변경(check-then-act)해서',
        'int 대신 long 을 써야 해서',
        '@Service 대신 @Component 를 써야 해서',
        'return 문이 두 개라서',
      ],
      answer: 0,
      explain:
        '스프링 빈은 기본 싱글톤이라 모든 요청 스레드가 같은 stock 을 공유합니다. 두 스레드가 동시에 stock > 0 을 통과하거나 stock-- 의 읽기·쓰기 사이에 끼어들면 결과가 어긋납니다. 실무에선 재고 같은 값은 DB 의 원자적 UPDATE(조건부 차감)나 락으로 처리합니다.',
    },
    {
      id: 'q9-10',
      level: 9,
      type: '빈칸 채우기',
      topic: 'ConcurrentHashMap',
      prompt: '여러 스레드가 URL 별 조회수를 집계합니다. "없으면 1, 있으면 기존 값 + 1" 을 원자적으로 처리하려면 빈칸에 들어갈 메서드는?',
      code: `ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();
hits.______(url, 1, Integer::sum);`,
      choices: ['put', 'putIfAbsent', 'merge', 'replace'],
      answer: 2,
      explain:
        'merge(key, value, remappingFunction) 는 키가 없으면 value 를 넣고, 있으면 기존 값과 value 를 함수로 합친 결과를 원자적으로 저장합니다. put 은 덮어쓰기만 하고, putIfAbsent 는 없을 때만 넣을 뿐 증가시키지 않습니다.',
    },
    {
      id: 'q9-11',
      level: 9,
      type: '개념',
      topic: '스레드 풀 크기',
      prompt: '8코어 서버에서 이미지 리사이징처럼 CPU 계산만 하는(I/O 대기가 거의 없는) 작업용 스레드 풀 크기로 가장 적절한 것은?',
      choices: ['1개', '8~9개 정도 (코어 수 근처)', '200개', '작업 수만큼 무제한'],
      answer: 1,
      explain:
        'CPU 바운드 작업은 동시에 실제로 실행될 수 있는 수가 코어 수로 제한되므로 코어 수(+1) 정도가 적당합니다. 그 이상은 컨텍스트 스위칭과 메모리 비용만 늘립니다. 반대로 I/O 대기가 긴 작업이라면 더 큰 풀이 유리합니다.',
    },
    {
      id: 'q9-12',
      level: 9,
      type: '실무 상황',
      topic: 'Cache Stampede',
      prompt:
        '메인 페이지 랭킹 데이터를 Redis 에 TTL 10분으로 캐시하고 있습니다. 10분마다 캐시가 만료되는 순간 DB CPU 가 100% 로 치솟고 일부 요청이 타임아웃됩니다. 가장 적절한 대책은?',
      choices: [
        'TTL 을 10초로 줄여 캐시를 더 자주 갱신한다',
        '캐시를 제거하고 DB 를 스케일업한다',
        'Redis 를 로컬 캐시로 바꾼다',
        '만료 시 한 요청만 DB 를 조회해 캐시를 갱신하도록 락을 걸고(나머지는 기존 값 사용/대기), 만료 전에 미리 갱신한다',
      ],
      answer: 3,
      explain:
        '인기 키 만료 순간 모든 요청이 동시에 DB 로 가는 Cache Stampede 이므로, 재계산을 한 번만 하도록 막거나 만료 전에 미리 갱신해야 합니다. TTL 을 줄이면 Stampede 가 더 자주 발생하고, 로컬 캐시로 바꾸면 서버마다 따로 만료되어 DB 부하가 서버 수만큼 생깁니다.',
    },
    {
      id: 'q9-13',
      level: 9,
      type: '개념',
      topic: '로컬 캐시 vs Redis',
      prompt: '서버 10대에 로컬 캐시(Caffeine)로 상품 가격을 캐시했을 때 생기는 대표적인 문제는?',
      choices: [
        '가격이 변경돼도 서버마다 캐시 만료 시점이 달라, 같은 상품이 요청한 서버에 따라 다른 가격으로 보일 수 있다',
        '로컬 캐시는 네트워크 왕복이 필요해 Redis 보다 느리다',
        '로컬 캐시는 TTL 을 설정할 수 없다',
        '로컬 캐시는 JVM 과 별도 프로세스라 장애 시 함께 죽지 않는다',
      ],
      answer: 0,
      explain:
        '로컬 캐시는 서버마다 독립적이라 변경 시 모든 서버의 캐시를 동시에 무효화하기 어렵고, 서버 간 값 불일치가 생깁니다. 로컬 캐시는 네트워크가 없어 오히려 더 빠르고, TTL 설정도 가능하며, JVM Heap 안에 있는 캐시입니다.',
    },
    {
      id: 'q9-14',
      level: 9,
      type: '개념',
      topic: '복합 인덱스',
      prompt: 'orders 테이블에 복합 인덱스 (user_id, created_at) 가 있습니다. 이 인덱스를 가장 효율적으로 활용하지 못하는 쿼리는?',
      code: `-- (A) WHERE user_id = 42
-- (B) WHERE user_id = 42 AND created_at >= '2026-11-01'
-- (C) WHERE created_at >= '2026-11-01'
-- (D) WHERE user_id = 42 ORDER BY created_at DESC`,
      codeLang: 'sql',
      choices: ['(A)', '(B)', '(C)', '(D)'],
      answer: 2,
      explain:
        '복합 인덱스는 선두 컬럼(user_id) 기준으로 먼저 정렬되어 있어, 선두 컬럼 조건 없이 created_at 만으로는 범위를 좁힐 수 없습니다. (A), (B), (D) 는 선두 컬럼으로 범위를 찾고 그 안의 created_at 정렬까지 활용할 수 있습니다.',
    },
    {
      id: 'q9-15',
      level: 9,
      type: '빈칸 채우기',
      topic: '실행계획',
      prompt: 'MySQL 에서 쿼리가 인덱스를 사용하는지, 몇 행을 읽을 것으로 예상되는지 확인하려면 쿼리 앞에 무엇을 붙여야 할까요?',
      code: `______ SELECT * FROM orders WHERE user_id = 42;`,
      codeLang: 'sql',
      choices: ['DESCRIBE TABLE', 'ANALYZE INDEX', 'SHOW PLAN', 'EXPLAIN'],
      answer: 3,
      explain:
        'EXPLAIN 은 옵티마이저가 선택한 실행계획(type, key, rows, Extra 등)을 보여 줍니다. 결과에서 type 이 ALL 이면 풀 스캔, key 에 인덱스 이름이 있으면 인덱스를 사용한 것입니다. 나머지 보기는 이 용도의 MySQL 문법이 아닙니다.',
    },
    {
      id: 'q9-16',
      level: 9,
      type: '실무 상황',
      topic: '멱등 컨슈머',
      prompt:
        '주문 완료 이벤트를 받아 포인트를 적립하는 Kafka 컨슈머가, 배포로 인한 리밸런싱 직후 일부 고객에게 포인트를 두 번 적립했습니다. 가장 적절한 대책은?',
      choices: [
        'Kafka 대신 HTTP 동기 호출로 바꾼다',
        '이벤트 고유 id 를 처리 이력 테이블(UNIQUE 제약)에 기록하고, 이미 처리한 id 면 건너뛰도록 컨슈머를 멱등하게 만든다',
        'offset 을 메시지 처리 전에 커밋하도록 바꾼다',
        '컨슈머를 파티션 수보다 많이 띄운다',
      ],
      answer: 1,
      explain:
        'at-least-once 환경에서 재전달은 정상 동작이므로, 컨슈머가 중복 메시지를 안전하게 무시하도록 멱등성을 확보해야 합니다. 처리 전에 offset 을 커밋하면 중복 대신 유실(at-most-once)이 생기고, 컨슈머를 늘리는 것은 중복과 무관합니다.',
    },
    {
      id: 'q9-17',
      level: 9,
      type: '실무 상황',
      topic: 'p99 지연',
      prompt:
        '대시보드상 평균 응답시간은 80ms 로 안정적인데, 고객센터에 "가끔 결제 화면이 몇 초씩 멈춘다"는 문의가 계속 들어옵니다. 먼저 확인해야 할 지표로 가장 적절한 것은?',
      choices: [
        '분당 요청 수(RPS)',
        '서버의 평균 CPU 사용률',
        '응답시간의 p99 같은 꼬리 지연(tail latency)과 해당 느린 요청의 APM 트레이스',
        '하루 전체 요청의 최소 응답시간',
      ],
      answer: 2,
      explain:
        '평균은 소수의 매우 느린 요청을 가려 버립니다. p99 를 보면 "가끔 느린" 요청이 실제로 얼마나 느린지 드러나고, APM 트레이스로 그 요청이 어디(SQL, 외부 API, GC)에서 시간을 썼는지 추적할 수 있습니다.',
    },
    {
      id: 'q9-18',
      level: 9,
      type: 'OX',
      topic: 'ZGC',
      prompt: 'ZGC 를 사용하면 GC 로 인한 Stop-the-world 가 완전히 0 이 된다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        'ZGC 는 대부분의 작업을 애플리케이션과 동시에 수행해 멈춤을 매우 짧게(보통 1ms 미만 수준) 줄이지만, 루트 스캔 등 짧은 STW 구간은 여전히 존재합니다. "아주 짧다"와 "없다"는 다릅니다.',
    },
  ],
};

export default content;
