import type { LevelContent } from './types';

const content: LevelContent = {
  level: 7,
  lessons: [
    // ─────────────────────────────────────────────
    {
      id: 'l7-persistence-context',
      level: 7,
      title: 'JPA 와 영속성 컨텍스트',
      summary: 'ORM 의 핵심 — 1차 캐시, 변경 감지, 쓰기 지연, 그리고 Spring Data JPA',
      blocks: [
        {
          t: 'p',
          text: 'JPA 는 자바 ORM(Object-Relational Mapping) 표준이고 Hibernate 가 대표 구현체입니다. 객체와 테이블을 매핑해두면 SQL 을 직접 쓰지 않아도 객체를 저장·조회·수정할 수 있어요. 객체 세계(상속, 참조, 컬렉션)와 관계형 DB(테이블, 외래키, 조인)의 차이(패러다임 불일치)를 JPA 가 대신 메워줍니다.',
        },
        {
          t: 'p',
          text: '영속성 컨텍스트는 "엔티티를 관리하는 1차 저장소"입니다. 스프링에선 보통 트랜잭션 하나당 영속성 컨텍스트 하나가 생기고, 그 안에서 조회·저장한 엔티티는 "영속(managed)" 상태가 되어 아래 세 가지 기능의 대상이 됩니다.',
        },
        {
          t: 'table',
          head: ['기능', '동작', '효과'],
          rows: [
            ['1차 캐시', '같은 트랜잭션에서 같은 id 를 다시 조회하면 DB 대신 캐시에서 반환', 'SELECT 감소, 같은 id 는 항상 같은 인스턴스(==)'],
            ['변경 감지 (dirty checking)', 'flush 시점에 최초 상태(스냅샷)와 비교해 바뀐 엔티티의 UPDATE 생성', 'save() 호출 없이 setter 만으로 수정 반영'],
            ['쓰기 지연', 'INSERT/UPDATE SQL 을 모아뒀다가 flush(보통 커밋 직전)에 전송', '배치 전송 가능, 트랜잭션 단위로 묶임'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Transactional
public void changeName(Long id, String newName) {
    Member m1 = em.find(Member.class, id);  // SELECT 실행 → 1차 캐시에 저장
    Member m2 = em.find(Member.class, id);  // SELECT 없음 → 캐시에서 반환
    System.out.println(m1 == m2);           // true

    m1.setName(newName);                    // UPDATE 를 직접 호출하지 않는다
}   // 커밋 직전 flush → 스냅샷과 비교 → UPDATE member SET name=? WHERE id=?`,
        },
        {
          t: 'list',
          items: [
            '비영속(new): new 로 만들기만 한 객체 — JPA 와 무관',
            '영속(managed): persist 하거나 조회한 객체 — 변경 감지 대상',
            '준영속(detached): 트랜잭션이 끝났거나 detach 된 객체 — 고쳐도 DB 반영 안 됨',
            '삭제(removed): remove 된 객체 — flush 시 DELETE',
          ],
        },
        {
          t: 'p',
          text: 'Spring Data JPA 는 JpaRepository<엔티티, ID> 인터페이스만 선언하면 구현체를 자동으로 만들어줍니다. save, findById, findAll, delete 같은 기본 메서드가 제공되고, 메서드 이름 규칙(쿼리 메서드)으로 JPQL 을 자동 생성하며, 복잡한 쿼리는 @Query 로 직접 씁니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
    List<Member> findByNameAndAgeGreaterThan(String name, int age);
    List<Member> findByTeamNameOrderByAgeDesc(String teamName);   // 연관 필드 + 정렬
    boolean existsByEmail(String email);
    Page<Member> findByAge(int age, Pageable pageable);           // 페이징

    @Query("select m from Member m where m.name like concat('%', :kw, '%')")
    List<Member> search(@Param("kw") String keyword);
}`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 트랜잭션 밖(또는 끝난 뒤)에서 엔티티를 수정하고 반영되길 기대하는 것. 준영속 엔티티는 변경 감지가 안 됩니다. 수정 로직은 @Transactional 서비스 메서드 안에서 "조회 → 수정"으로 처리하세요. 또 기본 키 전략이 IDENTITY 면 id 를 얻기 위해 persist 시점에 INSERT 가 바로 나가므로 쓰기 지연이 적용되지 않습니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l7-mapping',
      level: 7,
      title: '연관관계 매핑과 로딩 전략',
      summary: '@ManyToOne/@OneToMany, 연관관계의 주인과 mappedBy, 지연 로딩 vs 즉시 로딩',
      blocks: [
        {
          t: 'p',
          text: '테이블은 외래키 하나로 양쪽을 조인하지만, 객체는 참조가 방향을 가집니다. Member → Team(@ManyToOne)만 있으면 단방향, Team → List<Member>(@OneToMany)까지 있으면 양방향이에요. 양방향일 때는 둘 중 "외래키를 실제로 관리할 쪽"을 정해야 하는데, 이게 연관관계의 주인입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Entity
public class Member {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)     // 연관관계의 주인 (외래키 보유)
    @JoinColumn(name = "team_id")
    private Team team;
}

@Entity
public class Team {
    @Id @GeneratedValue
    private Long id;

    @OneToMany(mappedBy = "team")          // 주인이 아님 — 읽기 전용 거울
    private List<Member> members = new ArrayList<>();

    public void addMember(Member m) {      // 연관관계 편의 메서드: 양쪽을 같이 세팅
        members.add(m);
        m.setTeam(this);
    }
}`,
        },
        {
          t: 'list',
          items: [
            '주인 = 외래키가 있는 테이블에 매핑되는 쪽 = 보통 @ManyToOne 쪽 (N 쪽)',
            '주인만 외래키를 INSERT/UPDATE 한다. mappedBy 쪽 컬렉션에 add 만 하면 DB 에 반영되지 않는다',
            'mappedBy 값은 주인 엔티티에 있는 필드 이름 ("team")',
            '객체 상태 일관성을 위해 양쪽 모두 세팅하는 편의 메서드를 둔다',
          ],
        },
        {
          t: 'table',
          head: ['애너테이션', '기본 fetch', '권장'],
          rows: [
            ['@ManyToOne', 'EAGER (즉시)', 'LAZY 로 바꾼다'],
            ['@OneToOne', 'EAGER (즉시)', 'LAZY 로 바꾼다'],
            ['@OneToMany', 'LAZY (지연)', 'LAZY 유지'],
            ['@ManyToMany', 'LAZY (지연)', '실무에선 중간 엔티티로 풀어서 사용'],
          ],
        },
        {
          t: 'p',
          text: '지연 로딩(LAZY)은 연관 엔티티 자리에 프록시를 넣어두고, 실제로 그 객체의 필드에 접근하는 순간 SELECT 를 날립니다. 즉시 로딩(EAGER)은 엔티티를 가져올 때 연관 엔티티도 함께 가져오는데, JPQL 로 목록을 조회하면 먼저 목록만 가져온 뒤 각 행마다 연관 엔티티를 추가로 조회해 N+1 이 생기기 쉽고, 어떤 SQL 이 나갈지 예측하기 어렵습니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 모든 연관관계를 LAZY 로 두고, 함께 필요한 화면에서만 fetch join 으로 한 번에 가져오는 것이 기본 전략입니다. LAZY 프록시는 영속성 컨텍스트가 살아 있을 때만 초기화할 수 있어서, 트랜잭션이 끝난 뒤 접근하면 LazyInitializationException 이 나요(open-in-view 를 끈 경우).',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l7-n-plus-one',
      level: 7,
      title: 'N+1 문제와 해결법',
      summary: '쿼리 1번으로 N개를 가져왔더니 연관 데이터 조회가 N번 더 — fetch join, @EntityGraph, batch size',
      blocks: [
        {
          t: 'p',
          text: 'N+1 문제는 "목록 조회 쿼리 1번 + 각 행의 연관 엔티티 조회 N번"이 나가는 현상입니다. 주문 100건을 조회하고 각 주문의 회원 이름을 출력하면, 지연 로딩된 회원 프록시가 하나씩 초기화되면서 SELECT 가 100번 더 나가요. 개발 DB 엔 데이터가 적어 모르다가 운영에서 목록 API 가 느려지며 발견되는 대표적인 성능 문제입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `List<Order> orders = orderRepository.findAll();     // SELECT * FROM orders  (1번)
for (Order o : orders) {
    System.out.println(o.getMember().getName());      // 회원마다 SELECT (N번)
}
// 로그: select ... from orders
//       select ... from member where id=?   ← 이게 N번 반복`,
        },
        {
          t: 'p',
          text: 'EAGER 로 바꾸는 건 해결책이 아닙니다. JPQL(findAll 포함)은 작성된 쿼리를 그대로 SQL 로 바꾼 뒤, 결과 엔티티의 EAGER 연관을 채우려고 추가 쿼리를 날리기 때문에 N+1 은 그대로예요. 필요한 곳에서 "이번엔 같이 가져와"라고 명시하는 게 정답입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public interface OrderRepository extends JpaRepository<Order, Long> {

    // ① fetch join: JPQL 로 조인해서 한 번에 가져온다
    @Query("select o from Order o join fetch o.member")
    List<Order> findAllWithMember();

    // ② @EntityGraph: 쿼리 메서드에 fetch join 효과를 선언적으로
    @EntityGraph(attributePaths = {"member"})
    List<Order> findByStatus(OrderStatus status);
}`,
        },
        {
          t: 'code',
          lang: 'yaml',
          code: `# ③ batch size: 지연 로딩 시 IN 절로 묶어서 조회 (N번 → N/100번)
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 100
# select ... from member where id in (?, ?, ?, ... )`,
        },
        {
          t: 'table',
          head: ['해결책', '방식', '장점', '주의'],
          rows: [
            ['fetch join', 'JPQL join fetch', '쿼리 1번, 가장 확실', '컬렉션 fetch join + 페이징 시 메모리 페이징 위험'],
            ['@EntityGraph', 'attributePaths 로 함께 로딩', '쿼리 메서드에 간편 적용', '내부적으로 left outer join'],
            ['batch size', '연관 조회를 IN 절로 묶음', '컬렉션 + 페이징에도 안전', '쿼리가 1번이 아니라 몇 번으로 줄어듦'],
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: @OneToMany 컬렉션을 fetch join 하면서 페이징(Pageable)까지 거는 것. 조인으로 행이 뻥튀기되기 때문에 Hibernate 는 경고(firstResult/maxResults specified with collection fetch; applying in memory)를 남기고 전체를 메모리에 올려 페이징합니다. 데이터가 많으면 OOM 이에요. ToOne 관계만 fetch join 하고, 컬렉션은 batch size 로 해결하세요.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l7-transactional',
      level: 7,
      title: '@Transactional 제대로 쓰기',
      summary: '전파(REQUIRED/REQUIRES_NEW), readOnly, 롤백 규칙, 그리고 프록시라서 안 먹는 경우',
      blocks: [
        {
          t: 'p',
          text: '트랜잭션은 "모두 성공하거나 모두 실패"하는 작업 단위입니다(ACID). 스프링의 @Transactional 은 AOP 프록시가 메서드 시작 시 트랜잭션을 열고, 정상 종료면 커밋, 예외면 롤백합니다. 보통 서비스 계층 메서드에 붙여요.',
        },
        {
          t: 'table',
          head: ['전파(propagation)', '기존 트랜잭션이 있으면', '없으면'],
          rows: [
            ['REQUIRED (기본값)', '그 트랜잭션에 참여 (하나의 물리 트랜잭션)', '새로 시작'],
            ['REQUIRES_NEW', '기존 것을 잠시 보류하고 새 트랜잭션 시작 (독립 커밋/롤백)', '새로 시작'],
            ['SUPPORTS', '참여', '트랜잭션 없이 실행'],
            ['MANDATORY', '참여', '예외 발생'],
          ],
        },
        {
          t: 'p',
          text: 'REQUIRED 로 참여한 내부 메서드에서 런타임 예외가 나면, 바깥에서 그 예외를 catch 하더라도 트랜잭션 전체가 롤백 전용(rollback-only)으로 표시되어 결국 커밋 시 UnexpectedRollbackException 이 납니다. "실패해도 이건 남겨야 한다"(실패 이력, 알림 로그)는 작업은 별도 빈의 REQUIRES_NEW 메서드로 분리하세요.',
        },
        {
          t: 'list',
          items: [
            '기본 롤백 대상: RuntimeException(unchecked) 과 Error',
            'checked 예외(Exception, IOException 등)는 기본적으로 롤백되지 않고 커밋된다!',
            'checked 예외에도 롤백하려면 @Transactional(rollbackFor = Exception.class)',
            '예외를 catch 해서 삼켜버리면 프록시는 정상 종료로 보고 커밋한다',
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final FailureLogService failureLogService;   // 별도 빈

    @Transactional(rollbackFor = Exception.class)
    public void order(OrderRequest req) throws Exception {
        try {
            orderRepository.save(Order.from(req));
            payment.pay(req);                         // checked 예외 가능
        } catch (PaymentException e) {
            failureLogService.save(req, e);           // REQUIRES_NEW → 롤백돼도 남음
            throw e;
        }
    }

    @Transactional(readOnly = true)                   // 조회 전용
    public List<OrderResponse> list() { ... }
}

@Service
class FailureLogService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(OrderRequest req, Exception e) { ... }
}`,
        },
        {
          t: 'p',
          text: 'readOnly = true 는 Hibernate 의 flush 모드를 MANUAL 로 바꿔 변경 감지(스냅샷 비교)와 flush 를 생략합니다. 그래서 조회 성능이 좋아지고, 실수로 엔티티를 수정해도 UPDATE 가 나가지 않아요. 레플리카 DB 라우팅의 기준으로도 많이 씁니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: @Transactional 이 "안 먹는" 경우 세 가지. ① 같은 클래스 안에서 this.method() 로 내부 호출(self-invocation) — 프록시를 거치지 않음 ② private 메서드에 붙임 — 프록시가 가로챌 수 없음 ③ 예외를 catch 하고 다시 던지지 않음 — 정상 종료로 보고 커밋. 셋 다 "프록시 기반"이라는 한 가지 원리에서 나옵니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l7-isolation-lock',
      level: 7,
      title: '격리 수준과 락',
      summary: 'dirty read · non-repeatable read · phantom read, 그리고 낙관적 락 vs 비관적 락',
      blocks: [
        {
          t: 'p',
          text: '여러 트랜잭션이 동시에 같은 데이터를 다룰 때 생기는 문제를 얼마나 막을지 정하는 게 격리 수준(isolation level)입니다. 격리 수준이 높을수록 정합성은 좋아지지만 동시 처리 성능은 떨어져요.',
        },
        {
          t: 'table',
          head: ['이상 현상', '내용'],
          rows: [
            ['Dirty Read', '다른 트랜잭션이 아직 커밋하지 않은 값을 읽음 (그 트랜잭션이 롤백하면 없는 값을 본 셈)'],
            ['Non-Repeatable Read', '같은 행을 두 번 읽었는데 그 사이 다른 트랜잭션이 수정·커밋해 값이 달라짐'],
            ['Phantom Read', '같은 조건으로 두 번 조회했는데 그 사이 다른 트랜잭션의 INSERT/DELETE 로 행 개수가 달라짐'],
          ],
        },
        {
          t: 'table',
          head: ['격리 수준', 'Dirty Read', 'Non-Repeatable Read', 'Phantom Read'],
          rows: [
            ['READ UNCOMMITTED', '발생', '발생', '발생'],
            ['READ COMMITTED (Oracle·PostgreSQL 기본)', '방지', '발생', '발생'],
            ['REPEATABLE READ (MySQL InnoDB 기본)', '방지', '방지', '표준상 발생 (InnoDB 는 MVCC·넥스트키 락으로 대부분 방지)'],
            ['SERIALIZABLE', '방지', '방지', '방지'],
          ],
        },
        {
          t: 'p',
          text: '격리 수준만으로 막지 못하는 대표 문제가 "갱신 손실(lost update)"입니다. 두 트랜잭션이 재고 10을 동시에 읽고 각자 9로 저장하면 하나가 사라져요. 이걸 막는 방법이 락입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// 낙관적 락: 충돌이 드물다고 가정, 버전으로 커밋 시점에 검사
@Entity
public class Product {
    @Id private Long id;
    private int stock;
    @Version private Long version;   // UPDATE ... SET stock=?, version=version+1 WHERE id=? AND version=?
}   // 수정된 행이 0개면 ObjectOptimisticLockingFailureException → 재시도 또는 사용자에게 알림

// 비관적 락: 충돌이 잦다고 가정, 읽을 때부터 DB 행 락 (SELECT ... FOR UPDATE)
public interface ProductRepository extends JpaRepository<Product, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}`,
        },
        {
          t: 'table',
          head: ['구분', '낙관적 락 (@Version)', '비관적 락 (FOR UPDATE)'],
          rows: [
            ['가정', '충돌이 드물다', '충돌이 잦다'],
            ['시점', '커밋(UPDATE) 시점에 버전 비교', '조회 시점에 행 잠금'],
            ['충돌 시', '예외 발생 → 애플리케이션이 재시도/안내', '다른 트랜잭션은 락 해제까지 대기'],
            ['적합한 예', '게시글 수정, 회원 정보 수정', '선착순 재고 차감, 좌석 예약, 포인트 차감'],
            ['주의', '충돌 많으면 재시도 폭증', '데드락·대기 시간 증가, 트랜잭션 안에서만 의미'],
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 재고 차감 같은 동시성 문제를 synchronized 로 막으려는 코드를 자주 봅니다. 서버가 여러 대면 JVM 락은 다른 서버를 막지 못하고, 한 서버 안에서도 메서드가 끝난(락 해제) 뒤에 트랜잭션이 커밋되므로 틈이 생겨요. DB 락(비관적/낙관적)이나 "UPDATE product SET stock = stock - 1 WHERE id = ? AND stock > 0" 같은 원자적 업데이트를 쓰세요.',
        },
      ],
    },
  ],

  questions: [
    {
      id: 'q7-01',
      level: 7,
      type: '코드 출력',
      topic: '1차 캐시',
      prompt: '다음 메서드를 실행했을 때 member 테이블 SELECT 횟수와 출력 결과는? (id=1 회원은 DB 에 존재)',
      code: `@Transactional
public void test() {
    Member a = em.find(Member.class, 1L);
    Member b = em.find(Member.class, 1L);
    System.out.println(a == b);
}`,
      choices: ['SELECT 1번, true', 'SELECT 2번, true', 'SELECT 2번, false', 'SELECT 1번, false'],
      answer: 0,
      explain:
        '첫 find 에서 SELECT 후 엔티티가 1차 캐시에 저장되고, 같은 트랜잭션의 두 번째 find 는 캐시에서 같은 인스턴스를 돌려줍니다. 그래서 SELECT 는 1번, a == b 는 true 예요. 영속성 컨텍스트는 같은 id 에 대해 동일성(==)을 보장합니다.',
    },
    {
      id: 'q7-02',
      level: 7,
      type: '코드 출력',
      topic: '변경 감지',
      prompt: '다음 코드에서 save() 를 호출하지 않았습니다. 메서드가 정상 종료되면 어떻게 될까요?',
      code: `@Transactional
public void rename(Long id, String name) {
    Member m = memberRepository.findById(id).orElseThrow();
    m.changeName(name);
}`,
      choices: [
        'save() 를 호출하지 않았으므로 DB 에는 아무 변화가 없다',
        'changeName() 을 호출하는 즉시 UPDATE 가 실행된다',
        '트랜잭션 커밋 직전 flush 에서 변경 감지로 UPDATE 가 실행된다',
        '영속 엔티티를 수정하면 예외가 발생한다',
      ],
      answer: 2,
      explain:
        '조회한 엔티티는 영속 상태라, 커밋 직전 flush 때 처음 조회 시점의 스냅샷과 비교해 바뀐 필드의 UPDATE 를 자동으로 만듭니다(변경 감지). setter 호출 즉시 SQL 이 나가는 게 아니라 쓰기 지연으로 flush 시점에 전송돼요. 그래서 영속 엔티티 수정에는 save() 가 필요 없습니다.',
    },
    {
      id: 'q7-03',
      level: 7,
      type: '개념',
      topic: '쓰기 지연',
      prompt: 'SEQUENCE 전략 엔티티 3개를 한 트랜잭션에서 em.persist() 했습니다. INSERT SQL 이 DB 로 전송되는 시점으로 옳은 것은? (중간에 JPQL 실행·수동 flush 없음)',
      choices: [
        'persist() 를 호출할 때마다 즉시 한 건씩',
        '트랜잭션 커밋 직전 flush 시점에 모아서',
        '애플리케이션이 종료될 때',
        '다음 트랜잭션이 시작될 때',
      ],
      answer: 1,
      explain:
        '영속성 컨텍스트는 INSERT 를 쓰기 지연 저장소에 모아뒀다가 flush(보통 커밋 직전)에 한꺼번에 보냅니다. 단, IDENTITY 전략은 DB 가 id 를 만들어줘야 해서 persist 시점에 바로 INSERT 가 나가는 예외가 있어요. 그래서 문제에서 SEQUENCE 전략을 전제로 했습니다.',
    },
    {
      id: 'q7-04',
      level: 7,
      type: '개념',
      topic: '연관관계의 주인',
      prompt: 'Member(@ManyToOne team) 와 Team(@OneToMany(mappedBy = "team") members) 양방향 관계에서 연관관계의 주인에 대한 설명으로 옳은 것은?',
      choices: [
        'Team 이 1 쪽이므로 주인이며, members 컬렉션 변경이 외래키에 반영된다',
        '양쪽 모두 주인이며, 어느 쪽을 수정해도 외래키가 바뀐다',
        'mappedBy 를 선언한 쪽이 주인이다',
        '외래키(team_id)를 가진 테이블에 매핑되는 Member.team 이 주인이며, 이쪽 값만 외래키에 반영된다',
      ],
      answer: 3,
      explain:
        '연관관계의 주인은 외래키를 실제로 관리하는 쪽으로, 외래키가 있는 테이블(member)에 매핑된 @ManyToOne 필드입니다. mappedBy 는 "나는 주인이 아니고 저쪽 필드에 매핑되어 있다"는 표시예요. 따라서 Team.members 만 수정하면 외래키는 바뀌지 않습니다.',
    },
    {
      id: 'q7-05',
      level: 7,
      type: '버그 찾기',
      topic: 'mappedBy',
      prompt: '회원을 팀에 추가했는데 DB 의 member.team_id 가 null 로 저장됩니다. 원인은?',
      code: `@Transactional
public void join(Long teamId, String name) {
    Team team = teamRepository.findById(teamId).orElseThrow();
    Member member = new Member(name);
    team.getMembers().add(member);   // Team.members 는 @OneToMany(mappedBy = "team")
    memberRepository.save(member);
}`,
      choices: [
        'memberRepository.save 를 team 추가보다 먼저 호출해야 한다',
        '연관관계의 주인인 member.team 을 세팅하지 않고, 주인이 아닌 컬렉션에만 추가했다',
        'Team 을 다시 save 하지 않아서 변경 감지가 안 됐다',
        '@OneToMany 는 기본이 LAZY 라서 컬렉션에 add 할 수 없다',
      ],
      answer: 1,
      explain:
        'mappedBy 쪽 컬렉션은 읽기 전용이라 여기에만 add 해도 외래키는 바뀌지 않습니다. 주인인 member.setTeam(team) 을 호출해야 team_id 가 저장되며, 보통 양쪽을 함께 세팅하는 편의 메서드를 만들어요. team 을 save 하거나 순서를 바꿔도 주인을 세팅하지 않으면 그대로 null 입니다.',
    },
    {
      id: 'q7-06',
      level: 7,
      type: '빈칸 채우기',
      topic: 'mappedBy',
      prompt: 'Team 쪽에서 Member.team 필드를 기준으로 양방향 관계를 맺으려 합니다. 빈칸에 들어갈 속성은?',
      code: `@OneToMany(____ = "team")
private List<Member> members = new ArrayList<>();`,
      choices: ['mappedBy', 'joinColumn', 'targetEntity', 'referencedColumnName'],
      answer: 0,
      explain:
        'mappedBy 에 주인 엔티티의 필드 이름("team")을 적어 이 컬렉션이 주인이 아님을 선언합니다. @JoinColumn 은 외래키 컬럼을 지정하는 별도 애너테이션으로 주인 쪽(@ManyToOne)에 붙여요. referencedColumnName 은 @JoinColumn 의 속성입니다.',
    },
    {
      id: 'q7-07',
      level: 7,
      type: '개념',
      topic: '로딩 전략',
      prompt: 'JPA 에서 @ManyToOne 의 기본 fetch 전략과 실무 권장 설정으로 옳은 것은?',
      choices: [
        '기본 LAZY, 실무에서도 그대로 둔다',
        '기본 LAZY, 실무에서는 EAGER 로 바꾼다',
        '기본 EAGER, 실무에서는 LAZY 로 바꾸고 필요할 때 fetch join 한다',
        '기본 EAGER, 실무에서도 그대로 둔다',
      ],
      answer: 2,
      explain:
        'JPA 표준에서 @ManyToOne·@OneToOne 은 기본 EAGER, @OneToMany·@ManyToMany 는 기본 LAZY 입니다. EAGER 는 예상치 못한 조인과 N+1 을 만들기 쉬워서 실무에선 전부 LAZY 로 두고, 함께 필요한 곳에서만 fetch join 이나 @EntityGraph 를 써요.',
    },
    {
      id: 'q7-08',
      level: 7,
      type: '실무 상황',
      topic: 'N+1',
      prompt:
        '운영에서 주문 목록 API 가 갑자기 느려졌습니다. SQL 로그를 보니 "select ... from orders" 1번 뒤에 "select ... from member where id=?" 가 100번 찍혀 있습니다. 코드는 orderRepository.findAll() 후 각 주문의 order.getMember().getName() 을 DTO 로 옮깁니다. 원인과 해결로 가장 적절한 것은?',
      choices: [
        'DB 인덱스 누락 — member.id 에 인덱스를 추가한다',
        '커넥션 풀 부족 — HikariCP maximumPoolSize 를 늘린다',
        '지연 로딩 문제 — Order.member 를 EAGER 로 바꾼다',
        'N+1 문제 — fetch join(또는 @EntityGraph)으로 주문과 회원을 한 번에 조회한다',
      ],
      answer: 3,
      explain:
        '목록 1번 + 각 주문의 회원 프록시 초기화 N번이 나가는 전형적인 N+1 입니다. join fetch 나 @EntityGraph(attributePaths = "member") 로 한 번에 가져오면 쿼리가 1번이 돼요. EAGER 로 바꿔도 findAll(JPQL) 결과마다 추가 조회가 나가 N+1 이 해결되지 않고, id 는 PK 라 이미 인덱스가 있습니다.',
    },
    {
      id: 'q7-09',
      level: 7,
      type: '코드 출력',
      topic: '롤백 규칙',
      prompt: '다음 메서드가 실행되면 저장한 주문은 어떻게 될까요? (스프링 기본 설정)',
      code: `@Transactional
public void order(Order order) throws Exception {
    orderRepository.save(order);
    throw new Exception("재고 부족");   // checked 예외
}`,
      choices: [
        '예외가 발생했으므로 롤백되어 주문이 저장되지 않는다',
        'save 가 즉시 커밋되었으므로 저장된다',
        '컴파일 에러 — @Transactional 메서드는 checked 예외를 던질 수 없다',
        'checked 예외는 기본 롤백 대상이 아니라서 커밋되어 주문이 저장된다',
      ],
      answer: 3,
      explain:
        '스프링 @Transactional 은 기본적으로 RuntimeException 과 Error 에서만 롤백하고, checked 예외는 커밋합니다. 그래서 예외가 호출자에게 전달되면서도 주문은 저장돼요. checked 예외에서도 롤백하려면 rollbackFor = Exception.class 를 지정해야 합니다.',
    },
    {
      id: 'q7-10',
      level: 7,
      type: '빈칸 채우기',
      topic: '롤백 규칙',
      prompt: 'checked 예외(Exception)가 발생해도 롤백되도록 하려 합니다. 빈칸에 들어갈 속성은?',
      code: `@Transactional(____ = Exception.class)
public void transfer(Long from, Long to, long amount) throws Exception { ... }`,
      choices: ['noRollbackFor', 'rollbackFor', 'rollbackOn', 'propagation'],
      answer: 1,
      explain:
        'rollbackFor 에 지정한 예외 타입(과 그 하위 타입)이 발생하면 롤백합니다. noRollbackFor 는 반대로 롤백하지 않을 예외를 지정해요. rollbackOn 은 jakarta.transaction.Transactional 의 속성이지 스프링 @Transactional 의 속성이 아닙니다.',
    },
    {
      id: 'q7-11',
      level: 7,
      type: '버그 찾기',
      topic: '@Transactional 프록시',
      prompt: 'register() 를 호출했을 때 saveAll 중간에 RuntimeException 이 나도 앞서 저장된 데이터가 롤백되지 않습니다. 원인은? (register 를 부르는 쪽엔 트랜잭션 없음)',
      code: `@Service
public class MemberService {
    public void register(List<Member> members) {
        saveAll(members);
    }

    @Transactional
    public void saveAll(List<Member> members) {
        for (Member m : members) memberRepository.save(m);
    }
}`,
      choices: [
        '같은 클래스 내부 호출(this.saveAll)이라 프록시를 거치지 않아 @Transactional 이 적용되지 않았다',
        'RuntimeException 은 기본 롤백 대상이 아니다',
        'save() 는 호출 즉시 커밋되므로 원래 롤백할 수 없다',
        '@Transactional 은 반환 타입이 void 인 메서드에는 적용되지 않는다',
      ],
      answer: 0,
      explain:
        '@Transactional 은 프록시가 호출을 가로채야 동작합니다. 외부에서 register() 를 부르면 트랜잭션이 없는 메서드이고, 그 안의 saveAll() 은 this 로 원본을 직접 호출해 트랜잭션이 시작되지 않아요. 그래서 각 save 가 자체 트랜잭션으로 커밋됩니다. RuntimeException 은 기본 롤백 대상이 맞습니다.',
    },
    {
      id: 'q7-12',
      level: 7,
      type: '실무 상황',
      topic: '전파 REQUIRES_NEW',
      prompt:
        '결제 실패 시 주문 트랜잭션은 롤백하되, "결제 실패 이력"은 반드시 DB 에 남겨야 합니다. 그런데 지금은 이력도 함께 롤백되어 사라집니다. 가장 적절한 방법은?',
      choices: [
        '이력 저장 메서드를 같은 OrderService 안에 두고 @Transactional(propagation = REQUIRES_NEW) 를 붙인다',
        '주문 메서드의 @Transactional 을 제거한다',
        '이력 저장 로직을 별도 빈으로 분리하고 그 메서드에 @Transactional(propagation = Propagation.REQUIRES_NEW) 를 붙인다',
        '이력 저장 메서드에 @Transactional(readOnly = true) 를 붙인다',
      ],
      answer: 2,
      explain:
        'REQUIRES_NEW 는 기존 트랜잭션을 보류하고 독립된 새 트랜잭션에서 커밋하므로, 바깥 주문이 롤백돼도 이력은 남습니다. 단, 같은 클래스 안에서 부르면 self-invocation 으로 프록시를 거치지 않아 전파 설정이 무시되니 반드시 별도 빈으로 분리해야 해요. 주문의 @Transactional 을 없애면 주문의 원자성이 깨집니다.',
    },
    {
      id: 'q7-13',
      level: 7,
      type: '개념',
      topic: '이상 현상',
      prompt: '트랜잭션 A 가 잔액을 조회해 10000 을 읽었고, 그 사이 트랜잭션 B 가 같은 행을 5000 으로 수정하고 커밋했습니다. A 가 같은 행을 다시 조회하니 5000 이 나왔습니다. 이 현상은?',
      choices: ['Non-Repeatable Read', 'Dirty Read', 'Phantom Read', 'Lost Update'],
      answer: 0,
      explain:
        '한 트랜잭션 안에서 같은 행을 다시 읽었는데 다른 트랜잭션의 커밋된 수정 때문에 값이 달라진 것은 Non-Repeatable Read 입니다. Dirty Read 는 커밋되지 않은 값을 읽는 것이고, Phantom Read 는 같은 조건 조회에서 행의 개수가 달라지는 현상이에요.',
    },
    {
      id: 'q7-14',
      level: 7,
      type: '개념',
      topic: '낙관적 락',
      prompt: '엔티티에 @Version 필드를 둔 낙관적 락에 대한 설명으로 옳은 것은?',
      choices: [
        '조회 시 SELECT ... FOR UPDATE 로 행을 잠가 다른 트랜잭션을 대기시킨다',
        '충돌이 발생하면 DB 가 자동으로 재시도해 결국 성공시킨다',
        '격리 수준을 SERIALIZABLE 로 올리는 것과 같은 효과다',
        'UPDATE 시 WHERE 절에 version 을 비교해, 그 사이 다른 트랜잭션이 수정했으면 예외(OptimisticLockException 계열)를 발생시킨다',
      ],
      answer: 3,
      explain:
        '낙관적 락은 DB 락을 잡지 않고, 수정 시 "UPDATE ... WHERE id=? AND version=?" 로 버전을 비교해 수정된 행이 없으면 예외를 던집니다. 재시도는 애플리케이션이 직접 해야 해요. SELECT ... FOR UPDATE 로 미리 잠그는 것은 비관적 락입니다.',
    },
    {
      id: 'q7-15',
      level: 7,
      type: '실무 상황',
      topic: '비관적 락',
      prompt:
        '선착순 100개 한정 상품 이벤트에서 동시 주문이 몰려 재고가 음수가 되거나 판매 수량이 100을 넘었습니다. 서버는 3대이고, 짧은 시간에 같은 상품 행에 충돌이 집중됩니다. 가장 적절한 해결책은?',
      choices: [
        '재고 차감 서비스 메서드에 synchronized 를 붙인다',
        '재고 조회 시 @Lock(PESSIMISTIC_WRITE)(SELECT ... FOR UPDATE)로 행을 잠그고 차감한다',
        '@Transactional(readOnly = true) 를 붙여 재고가 함부로 수정되지 않게 한다',
        '격리 수준을 READ UNCOMMITTED 로 낮춰 최신 값을 빨리 읽게 한다',
      ],
      answer: 1,
      explain:
        '충돌이 잦고 정합성이 중요한 재고 차감에는 DB 행을 잠그는 비관적 락이 적합합니다(원자적 UPDATE 쿼리도 좋은 대안). synchronized 는 한 JVM 안에서만 동작해 서버 3대를 막지 못하고, 락 해제 후 커밋되는 틈도 있어요. READ UNCOMMITTED 는 오히려 dirty read 까지 허용합니다.',
    },
    {
      id: 'q7-16',
      level: 7,
      type: '빈칸 채우기',
      topic: '쿼리 메서드',
      prompt: '팀 이름으로 회원을 찾고 나이 내림차순으로 정렬하는 Spring Data JPA 쿼리 메서드를 만들려 합니다. 빈칸에 들어갈 키워드는?',
      code: `List<Member> findByTeamName____AgeDesc(String teamName);`,
      choices: ['SortBy', 'Order', 'OrderBy', 'Desc'],
      answer: 2,
      explain:
        '쿼리 메서드에서 정렬은 OrderBy + 속성명 + Asc/Desc 형식으로 씁니다. 그래서 findByTeamNameOrderByAgeDesc 가 되고, "where team.name = ? order by age desc" 가 생성돼요. SortBy 는 지원되는 키워드가 아닙니다.',
    },
    {
      id: 'q7-17',
      level: 7,
      type: 'OX',
      topic: 'readOnly',
      prompt: '@Transactional(readOnly = true) 메서드 안에서 조회한 엔티티의 필드를 수정하면, 커밋 시 변경 감지로 UPDATE 가 실행된다. (Spring Boot 3 + Hibernate 기준)',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        'readOnly = true 이면 스프링이 Hibernate 세션의 flush 모드를 MANUAL 로 설정해 변경 감지와 flush 를 하지 않습니다. 그래서 엔티티를 수정해도 UPDATE 가 나가지 않아요. 이 덕분에 스냅샷 비교 비용이 줄어 조회 성능도 좋아집니다.',
    },
    {
      id: 'q7-18',
      level: 7,
      type: 'OX',
      topic: 'fetch join 페이징',
      prompt: '@OneToMany 컬렉션을 fetch join 하면서 페이징을 적용하면, Hibernate 가 DB 가 아닌 메모리에서 페이징을 수행할 수 있어 데이터가 많을 때 위험하다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        '컬렉션 fetch join 은 조인으로 행 수가 늘어나 DB 수준 페이징이 의미가 없어지므로, Hibernate 는 경고를 남기고 전체 결과를 메모리에 올려 페이징합니다. 데이터가 많으면 OOM 위험이 있어요. ToOne 만 fetch join 하고 컬렉션은 default_batch_fetch_size 로 해결하는 게 정석입니다.',
    },
  ],
};

export default content;
