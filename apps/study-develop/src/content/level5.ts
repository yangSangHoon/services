import type { LevelContent } from './types';

const content: LevelContent = {
  level: 5,
  lessons: [
    // ─────────────────────────────────────────────
    {
      id: 'l5-lambda',
      level: 5,
      title: '람다와 함수형 인터페이스',
      summary: '추상 메서드 1개짜리 인터페이스를 한 줄로 구현하는 문법, 그리고 메서드 참조',
      blocks: [
        {
          t: 'p',
          text: '람다(lambda)는 "이름 없는 함수"를 값처럼 넘기는 문법입니다. 자바는 함수를 1급 객체로 다루지 않기 때문에, 람다는 사실 "추상 메서드가 딱 1개인 인터페이스(함수형 인터페이스)"의 구현 객체를 짧게 만드는 문법이에요. 그래서 람다가 들어갈 자리에는 항상 함수형 인터페이스 타입이 있어야 합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// Java 7 까지: 익명 클래스
Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.length() - b.length();
    }
});

// Java 8+: 람다 — 파라미터 타입·return·중괄호 생략 가능
names.sort((a, b) -> a.length() - b.length());`,
        },
        {
          t: 'p',
          text: '@FunctionalInterface 를 붙이면 추상 메서드가 1개가 아닐 때 컴파일 에러를 내줍니다. default·static 메서드는 몇 개가 있어도 괜찮아요(추상 메서드가 아니니까). java.util.function 패키지에 자주 쓰는 모양이 미리 정의되어 있으니 직접 만들기 전에 먼저 찾아보세요.',
        },
        {
          t: 'table',
          head: ['인터페이스', '추상 메서드', '모양', '예시'],
          rows: [
            ['Function<T, R>', 'R apply(T t)', 'T → R (변환)', 'String::length'],
            ['Predicate<T>', 'boolean test(T t)', 'T → boolean (조건)', 's -> s.isEmpty()'],
            ['Supplier<T>', 'T get()', '() → T (생성/공급)', '() -> new ArrayList<>()'],
            ['Consumer<T>', 'void accept(T t)', 'T → void (소비)', 'System.out::println'],
            ['BiFunction<T, U, R>', 'R apply(T t, U u)', '(T, U) → R', '(a, b) -> a + b'],
            ['UnaryOperator<T>', 'T apply(T t)', 'T → T', 'String::trim'],
          ],
        },
        {
          t: 'p',
          text: '메서드 참조(::)는 "이미 있는 메서드를 그대로 호출만 하는 람다"를 더 짧게 쓰는 표기입니다. 4가지 형태가 있어요.',
        },
        {
          t: 'table',
          head: ['종류', '메서드 참조', '같은 람다'],
          rows: [
            ['정적 메서드', 'Integer::parseInt', 's -> Integer.parseInt(s)'],
            ['특정 객체의 인스턴스 메서드', 'System.out::println', 'x -> System.out.println(x)'],
            ['임의 객체의 인스턴스 메서드', 'String::toUpperCase', 's -> s.toUpperCase()'],
            ['생성자', 'ArrayList::new', '() -> new ArrayList<>()'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `int base = 10;
Function<Integer, Integer> add = x -> x + base; // OK: base 는 effectively final
// base = 20;  // 이 줄이 있으면 위 람다가 컴파일 에러!

Predicate<String> notEmpty = s -> !s.isEmpty();
Predicate<String> longWord = notEmpty.and(s -> s.length() > 5); // 조합 가능`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 람다 안에서 바깥 지역 변수를 바꾸려는 것. 람다가 캡처하는 지역 변수는 final 이거나 사실상 final(effectively final)이어야 합니다. 합계를 구하려고 바깥 int 변수를 람다 안에서 ++ 하지 말고, sum()/reduce() 같은 스트림 연산을 쓰세요.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l5-stream',
      level: 5,
      title: 'Stream API',
      summary: '중간 연산은 게으르고, 최종 연산이 방아쇠 — map/filter/flatMap/reduce/collect',
      blocks: [
        {
          t: 'p',
          text: 'Stream 은 컬렉션 데이터를 "무엇을 할지" 선언적으로 처리하는 파이프라인입니다. 소스(컬렉션 등) → 중간 연산 0개 이상 → 최종 연산 1개 구조이고, 원본 컬렉션은 바뀌지 않습니다. 스트림은 일회용이라 최종 연산을 한 번 실행하면 다시 쓸 수 없어요(IllegalStateException).',
        },
        {
          t: 'table',
          head: ['구분', '반환', '대표 연산', '특징'],
          rows: [
            ['중간 연산', 'Stream', 'filter, map, flatMap, sorted, distinct, limit, peek', '호출해도 바로 실행되지 않음 (지연)'],
            ['최종 연산', 'Stream 이 아닌 값', 'collect, forEach, reduce, count, findFirst, anyMatch', '호출되는 순간 파이프라인 전체가 실행됨'],
          ],
        },
        {
          t: 'p',
          text: '지연 평가(lazy evaluation): 최종 연산이 없으면 filter 안의 코드는 한 번도 실행되지 않습니다. 또 스트림은 "단계별로 전체를 돌고 다음 단계"가 아니라 "요소 하나씩 파이프라인 끝까지" 세로로 흘려보냅니다. 그래서 findFirst·anyMatch·limit 같은 쇼트서킷 연산은 답이 나오는 즉시 나머지 요소를 처리하지 않아요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `List<String> names = List.of("kim", "lee", "park", "choi");

List<String> result = names.stream()
        .filter(n -> n.length() >= 4)   // "park", "choi"
        .map(String::toUpperCase)        // "PARK", "CHOI"
        .sorted()
        .toList();                       // Java 16+: 불변 리스트

int total = List.of(1, 2, 3, 4).stream()
        .reduce(0, Integer::sum);        // 10 (초기값, 누적 함수)

// flatMap: 중첩 구조를 한 겹으로 펼친다
List<List<String>> orders = List.of(List.of("펜", "노트"), List.of("컵"));
List<String> items = orders.stream()
        .flatMap(List::stream)           // Stream<List<String>> → Stream<String>
        .toList();                       // [펜, 노트, 컵]`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `record Emp(String name, String dept, int salary) {}

// 부서별 그룹핑 → Map<String, List<Emp>>
Map<String, List<Emp>> byDept = emps.stream()
        .collect(Collectors.groupingBy(Emp::dept));

// 부서별 인원 수 → Map<String, Long>
Map<String, Long> countByDept = emps.stream()
        .collect(Collectors.groupingBy(Emp::dept, Collectors.counting()));

// 이름 이어붙이기 → "kim, lee, park"
String joined = emps.stream().map(Emp::name)
        .collect(Collectors.joining(", "));

// toMap: 키가 중복되면 IllegalStateException! → 병합 함수로 해결
Map<String, Integer> maxSalaryByDept = emps.stream()
        .collect(Collectors.toMap(Emp::dept, Emp::salary, Math::max));`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: Collectors.toMap(keyFn, valueFn) 은 키가 겹치면 "Duplicate key" IllegalStateException 을 던집니다. 테스트 데이터에선 안 겹치다가 운영에서 터지는 대표 버그예요. 키가 겹칠 수 있으면 세 번째 인자로 병합 함수 (a, b) -> a 등을 꼭 넣으세요.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 스트림 안에서 외부 리스트에 add 하거나 필드를 바꾸는 "부수 효과"를 피합니다. 결과는 collect/toList 로 받으세요. 또 parallelStream 은 공용 ForkJoinPool 을 쓰므로 웹 서버에서 무심코 쓰면 다른 요청까지 느려질 수 있어요.',
        },
        {
          t: 'list',
          items: [
            '최종 연산이 없으면 아무 일도 일어나지 않는다 (지연 평가)',
            '요소는 하나씩 파이프라인을 끝까지 통과한다 → 쇼트서킷 가능',
            'map 은 1:1 변환, flatMap 은 1:N 을 펼쳐서 하나의 스트림으로',
            'groupingBy(분류함수, 다운스트림) — counting(), summingInt(), mapping() 과 조합',
            '스트림은 재사용 불가, 원본 컬렉션은 변하지 않음',
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l5-optional',
      level: 5,
      title: 'Optional 올바르게 쓰기',
      summary: '"없을 수도 있음"을 반환 타입으로 알리는 도구 — orElse vs orElseGet, get() 금지',
      blocks: [
        {
          t: 'p',
          text: 'Optional<T> 은 "값이 없을 수도 있다"는 사실을 메서드의 반환 타입으로 드러내기 위해 만들어졌습니다. findById 가 null 을 돌려주면 호출자가 null 체크를 잊기 쉽지만, Optional 을 돌려주면 "꺼내기 전에 없을 때를 처리하라"고 타입이 강제합니다. 즉 Optional 은 주로 "반환 타입"용이에요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `Optional<String> a = Optional.of("hi");        // null 넣으면 NPE
Optional<String> b = Optional.ofNullable(maybe); // null 이면 empty
Optional<String> c = Optional.empty();

String name = userRepository.findById(id)
        .map(User::getName)                       // 있으면 변환
        .orElseThrow(() -> new UserNotFoundException(id)); // 없으면 예외`,
        },
        {
          t: 'table',
          head: ['메서드', '언제', '주의'],
          rows: [
            ['orElse(값)', '기본값이 이미 만들어진 상수일 때', '인자가 Optional 이 비어 있든 말든 항상 먼저 평가됨'],
            ['orElseGet(Supplier)', '기본값 생성 비용이 크거나 부수 효과가 있을 때', '비어 있을 때만 Supplier 가 호출됨'],
            ['orElseThrow(Supplier)', '없으면 비즈니스 예외로 처리할 때', '인자 없는 orElseThrow() 는 NoSuchElementException'],
            ['map / filter / flatMap', '값이 있을 때만 변환·검사', 'flatMap 은 Optional 을 반환하는 함수용'],
            ['ifPresent / ifPresentOrElse', '값이 있을 때 동작 실행', '값을 꺼내서 if 로 검사하는 것보다 깔끔'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `// orElse 의 인자는 "메서드 호출 전에" 평가된다
User u1 = repo.findByEmail(email)
        .orElse(repo.save(new User(email)));      // ❌ 회원이 있어도 save 실행!

User u2 = repo.findByEmail(email)
        .orElseGet(() -> repo.save(new User(email))); // ✅ 없을 때만 save`,
        },
        {
          t: 'list',
          items: [
            '❌ opt.get() 남용 — 비어 있으면 NoSuchElementException. null 체크를 안 하는 것과 다를 게 없다',
            '❌ if (opt.isPresent()) { opt.get() } — 그냥 null 체크를 길게 쓴 것. map/orElse 계열로 바꾸자',
            '❌ 필드·메서드 파라미터·컬렉션 원소에 Optional — 직렬화 불가, 호출부만 복잡해짐',
            '❌ Optional<List<T>> — 빈 리스트를 반환하면 된다',
            '❌ Optional 변수에 null 대입 — Optional 자체가 null 이면 의미가 없다',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 "orElse(메서드호출())" 패턴을 코드 리뷰에서 꼭 확인합니다. 단순 상수(orElse("익명"))면 괜찮지만, DB 조회·저장·외부 API 호출이 인자로 들어가 있으면 값이 있어도 매번 실행돼 성능 문제나 중복 데이터가 생깁니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l5-modern-syntax',
      level: 5,
      title: '모던 문법: record · sealed · var · 텍스트 블록 · switch',
      summary: 'Java 10~17 에서 추가된, 코드를 짧고 안전하게 만드는 문법들',
      blocks: [
        {
          t: 'p',
          text: 'record(Java 16 정식)는 "데이터를 담기만 하는 불변 클래스"를 한 줄로 만듭니다. 컴포넌트마다 private final 필드, 같은 이름의 접근자(name(), getName() 아님), 생성자, equals/hashCode/toString 이 자동 생성돼요. DTO, 값 객체에 딱 맞습니다. 다른 클래스를 상속할 수 없고(이미 java.lang.Record 를 상속), 인터페이스 구현은 가능합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public record Money(long amount, String currency) {
    public Money {                         // compact 생성자: 검증용
        if (amount < 0) throw new IllegalArgumentException("음수 불가");
    }
    public Money plus(Money o) { return new Money(amount + o.amount, currency); }
}

Money m = new Money(1000, "KRW");
m.amount();                 // 1000  (getAmount() 아님)
m.equals(new Money(1000, "KRW")); // true — 값 기반 비교`,
        },
        {
          t: 'p',
          text: 'sealed(Java 17 정식)는 "이 타입을 상속/구현할 수 있는 클래스를 내가 정한 목록으로 제한"합니다. permits 에 나열된 하위 타입은 final, sealed, non-sealed 중 하나를 반드시 선언해야 해요. 도메인의 경우의 수를 컴파일러가 알게 되어, 결제수단·도형처럼 종류가 정해진 모델에 유용합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public sealed interface Payment permits Card, Cash {}
public record Card(String number) implements Payment {}   // record 는 암묵적 final
public record Cash(long amount) implements Payment {}

// instanceof 패턴 매칭 (Java 16 정식): 검사 + 캐스팅을 한 번에
if (payment instanceof Card c) {
    System.out.println(c.number());
}`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `var list = new ArrayList<String>();  // 지역 변수 타입 추론 (Java 10)

// 향상된 switch (Java 14 정식): 화살표, 여러 라벨, 값 반환, fall-through 없음
String type = switch (day) {
    case SATURDAY, SUNDAY -> "주말";
    case MONDAY -> {
        String s = "월요병";
        yield s;                        // 블록에서 값 반환은 yield
    }
    default -> "평일";
};

// 텍스트 블록 (Java 15 정식): 여러 줄 문자열
String json = """
        {
          "name": "kim",
          "age": 20
        }
        """;`,
        },
        {
          t: 'table',
          head: ['문법', '정식 버전', '핵심'],
          rows: [
            ['var', 'Java 10', '지역 변수 전용 (필드·파라미터·반환 타입 불가), 초기화 필수'],
            ['switch 식 (->, yield)', 'Java 14', '값을 반환하는 식, break 불필요, fall-through 없음'],
            ['텍스트 블록 """', 'Java 15', 'SQL·JSON 을 이스케이프 없이 여러 줄로'],
            ['record', 'Java 16', '불변 데이터 클래스, 접근자는 name()'],
            ['instanceof 패턴 매칭', 'Java 16', 'if (o instanceof String s) 로 캐스팅 생략'],
            ['sealed / permits', 'Java 17', '상속 가능한 하위 타입을 제한'],
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: "switch 패턴 매칭(case Card c ->)"을 Java 17 에서 그냥 쓰려는 것. Java 17 에선 preview 기능이라 --enable-preview 가 필요하고, 정식 기능은 Java 21 부터입니다. 또 var 는 타입이 오른쪽에서 명확히 보일 때만 쓰세요. var result = service.process(); 처럼 타입이 안 보이면 오히려 읽기 어렵습니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l5-concurrency',
      level: 5,
      title: '동시성 기초',
      summary: 'Thread/Runnable, 경쟁 조건, synchronized vs volatile, ExecutorService, CompletableFuture',
      blocks: [
        {
          t: 'p',
          text: '스레드는 하나의 프로세스 안에서 동시에 실행되는 작업 흐름입니다. 할 일은 Runnable(반환값 없음) 또는 Callable(반환값·예외 있음)로 정의하고 Thread 에 넘겨 start() 합니다. run() 을 직접 부르면 새 스레드가 아니라 현재 스레드에서 그냥 메서드가 실행될 뿐이에요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `Runnable task = () -> System.out.println(Thread.currentThread().getName());
Thread t = new Thread(task);
t.start();   // ✅ 새 스레드에서 실행
t.join();    // 끝날 때까지 기다림
// t.run();  // ❌ 현재 스레드에서 실행됨 (동시성 없음)`,
        },
        {
          t: 'p',
          text: '여러 스레드가 같은 변수를 동시에 고치면 경쟁 조건(race condition)이 생깁니다. count++ 은 "읽기 → 1 더하기 → 쓰기" 세 단계라서, 두 스레드가 같은 값을 읽고 각자 써버리면 증가 하나가 사라져요. 해결책은 synchronized 로 한 번에 한 스레드만 들어가게 하거나, AtomicInteger 처럼 원자적 연산을 쓰는 것입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Counter {
    private int count = 0;
    public synchronized void increment() { count++; } // 상호 배제 + 가시성
    public synchronized int get() { return count; }
}

AtomicInteger atomic = new AtomicInteger();
atomic.incrementAndGet();  // CAS 기반 원자적 증가, 락 없음

class Worker {
    private volatile boolean running = true;  // 다른 스레드의 변경이 바로 보이게
    public void stop() { running = false; }
    public void loop() { while (running) { /* work */ } }
}`,
        },
        {
          t: 'table',
          head: ['도구', '가시성', '원자성(count++)', '용도'],
          rows: [
            ['synchronized', '보장', '보장', '임계 영역 보호 (락)'],
            ['volatile', '보장', '보장 안 함', '플래그처럼 한 스레드가 쓰고 여럿이 읽는 값'],
            ['AtomicInteger 등', '보장', '보장', '카운터·누적값 (락 없이 CAS)'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `ExecutorService pool = Executors.newFixedThreadPool(4); // 스레드 재사용
Future<Integer> f = pool.submit(() -> heavyCalc());       // Callable
Integer r = f.get();                                      // 결과 대기
pool.shutdown();                                          // 꼭 종료!

// CompletableFuture: 비동기 작업을 조합
CompletableFuture<String> user  = CompletableFuture.supplyAsync(() -> userApi.get(id), pool);
CompletableFuture<String> point = CompletableFuture.supplyAsync(() -> pointApi.get(id), pool);
String merged = user.thenCombine(point, (u, p) -> u + ":" + p).join(); // 두 작업 동시 진행`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 스레드를 new Thread 로 직접 만들지 않고 스레드 풀(ExecutorService, Spring 이라면 ThreadPoolTaskExecutor)을 애플리케이션에 하나 만들어 재사용합니다. 요청마다 풀을 만들고 shutdown 을 안 하면 스레드가 계속 쌓여 결국 "unable to create native thread" 로 서버가 죽어요. CompletableFuture.supplyAsync 도 실행기를 안 넘기면 공용 ForkJoinPool 을 쓰므로 블로킹 I/O 작업엔 전용 풀을 넘기세요.',
        },
      ],
    },
  ],

  questions: [
    {
      id: 'q5-01',
      level: 5,
      type: '개념',
      topic: '함수형 인터페이스',
      prompt: '@FunctionalInterface 를 붙일 수 있는(컴파일 에러가 나지 않는) 인터페이스의 조건으로 옳은 것은?',
      choices: [
        '메서드가 정확히 1개만 선언되어 있어야 한다 (default 메서드도 불가)',
        '추상 메서드가 1개 이상이면 된다',
        '추상 메서드가 정확히 1개여야 하며, default·static 메서드는 여러 개 있어도 된다',
        '반드시 java.util.function 패키지에 있어야 한다',
      ],
      answer: 2,
      explain:
        '함수형 인터페이스의 조건은 "추상 메서드가 딱 1개"입니다. default·static 메서드는 구현이 있는 메서드라 개수에 포함되지 않아요. Predicate 도 and/or/negate 같은 default 메서드를 여러 개 갖고 있지만 함수형 인터페이스입니다.',
    },
    {
      id: 'q5-02',
      level: 5,
      type: '개념',
      topic: '메서드 참조',
      prompt: 'Function<String, String> f = String::toUpperCase; 와 같은 의미의 람다는?',
      choices: [
        's -> s.toUpperCase()',
        '() -> String.toUpperCase()',
        's -> String.toUpperCase(s)',
        '(s, t) -> s.toUpperCase(t)',
      ],
      answer: 0,
      explain:
        'String::toUpperCase 는 "임의 객체의 인스턴스 메서드 참조"로, 첫 번째 파라미터가 메서드를 호출하는 객체가 됩니다. 그래서 s -> s.toUpperCase() 와 같아요. toUpperCase 는 static 메서드가 아니므로 String.toUpperCase(s) 형태는 존재하지 않습니다.',
    },
    {
      id: 'q5-03',
      level: 5,
      type: '코드 출력',
      topic: '지연 평가',
      prompt: '다음 코드의 출력은?',
      code: `List<Integer> list = List.of(1, 2, 3);
list.stream()
    .filter(n -> {
        System.out.print("F" + n + " ");
        return n > 1;
    });
System.out.print("END");`,
      choices: ['F1 F2 F3 END', 'F2 F3 END', 'END F1 F2 F3', 'END'],
      answer: 3,
      explain:
        'filter 는 중간 연산이라 최종 연산(collect, forEach, toList 등)이 호출되기 전까지는 실행되지 않습니다. 이 코드엔 최종 연산이 없으므로 람다가 한 번도 호출되지 않고 "END" 만 출력돼요. "F1 F2 F3 END" 를 골랐다면 지연 평가를 다시 확인하세요.',
    },
    {
      id: 'q5-04',
      level: 5,
      type: '코드 출력',
      topic: '쇼트서킷',
      prompt: '다음 코드의 출력은?',
      code: `Stream.of(1, 2, 3, 4)
    .filter(n -> { System.out.print("f" + n + " "); return n % 2 == 0; })
    .map(n -> { System.out.print("m" + n + " "); return n * 10; })
    .findFirst();`,
      choices: ['f1 f2 f3 f4 m2 m4 ', 'f1 f2 m2 ', 'f1 m1 f2 m2 ', 'f1 f2 f3 f4 m2 '],
      answer: 1,
      explain:
        '스트림은 요소 하나씩 파이프라인 끝까지 흘려보냅니다. 1 은 filter 에서 탈락, 2 는 filter 통과 후 map 까지 가고, findFirst 가 결과를 얻는 즉시 나머지(3, 4)는 처리하지 않아요. "단계별로 전체를 다 돌고 다음 단계로 간다"고 생각하면 첫 번째 보기를 고르게 됩니다.',
    },
    {
      id: 'q5-05',
      level: 5,
      type: '버그 찾기',
      topic: 'toMap 중복 키',
      prompt: '사용자 이름 → 이름 길이 Map 을 만드는 코드가 운영 데이터에서 예외를 던졌습니다. 원인과 해결로 옳은 것은?',
      code: `List<String> names = List.of("kim", "lee", "kim");
Map<String, Integer> m = names.stream()
    .collect(Collectors.toMap(n -> n, String::length));`,
      choices: [
        'List.of 는 불변이라 stream() 호출 시 UnsupportedOperationException — new ArrayList 로 감싼다',
        'String::length 가 int 를 반환해 ClassCastException — mapToObj 를 써야 한다',
        '키 "kim" 이 중복되어 IllegalStateException — toMap 에 병합 함수 (a, b) -> a 를 추가한다',
        '결과 Map 이 null 이라 NullPointerException — Optional 로 감싼다',
      ],
      answer: 2,
      explain:
        'Collectors.toMap(키, 값) 은 같은 키가 두 번 나오면 "Duplicate key" IllegalStateException 을 던집니다. 세 번째 인자로 병합 함수를 주면 해결돼요. 불변 리스트도 stream() 으로 읽는 건 문제없고, int 는 Integer 로 자동 박싱됩니다.',
    },
    {
      id: 'q5-06',
      level: 5,
      type: '빈칸 채우기',
      topic: 'groupingBy',
      prompt: '부서별 인원 수 Map<String, Long> 을 만들려고 합니다. 빈칸에 들어갈 것은?',
      code: `Map<String, Long> countByDept = emps.stream()
    .collect(Collectors.groupingBy(Emp::dept, Collectors.____()));`,
      choices: ['counting', 'count', 'size', 'summingLong'],
      answer: 0,
      explain:
        'groupingBy 의 두 번째 인자(다운스트림 컬렉터)로 Collectors.counting() 을 주면 그룹별 개수를 Long 으로 셉니다. count() 는 Stream 의 최종 연산이지 Collectors 메서드가 아니고, summingLong 은 합계를 구할 값 추출 함수를 인자로 받아야 해요.',
    },
    {
      id: 'q5-07',
      level: 5,
      type: '코드 출력',
      topic: 'orElse vs orElseGet',
      prompt: '다음 코드의 출력은?',
      code: `static String create() {
    System.out.print("create ");
    return "new";
}

Optional<String> opt = Optional.of("hi");
String a = opt.orElse(create());
String b = opt.orElseGet(() -> create());
System.out.print(a + " " + b);`,
      choices: ['hi hi', 'create create hi hi', 'create new new', 'create hi hi'],
      answer: 3,
      explain:
        'orElse(create()) 는 자바가 메서드 인자를 먼저 평가하므로, Optional 에 값이 있어도 create() 가 실행되어 "create " 가 출력됩니다. 반면 orElseGet 의 Supplier 는 비어 있을 때만 호출돼요. 반환값은 둘 다 Optional 안의 "hi" 입니다.',
    },
    {
      id: 'q5-08',
      level: 5,
      type: '개념',
      topic: 'Optional 사용법',
      prompt: 'Optional 사용법으로 가장 바람직한 것은?',
      choices: [
        'DTO 필드를 Optional<String> nickname 으로 선언해 null 을 피한다',
        'return repo.findById(id).orElseThrow(() -> new UserNotFoundException(id));',
        'if (opt.isPresent()) { return opt.get(); } return null;',
        '목록 조회 메서드의 반환 타입을 Optional<List<User>> 로 한다',
      ],
      answer: 1,
      explain:
        'Optional 은 반환 타입으로 "없을 수 있음"을 알리고, 꺼낼 때 orElseThrow/orElseGet/map 으로 없을 때를 처리하는 게 정석입니다. 필드에 쓰는 것은 직렬화·설계상 권장되지 않고, isPresent+get 후 null 반환은 Optional 을 쓸 이유를 없앱니다. 목록은 Optional 대신 빈 리스트를 반환하면 돼요.',
    },
    {
      id: 'q5-09',
      level: 5,
      type: '개념',
      topic: 'record',
      prompt: 'public record User(String name, int age) {} 에 대한 설명으로 옳은 것은?',
      choices: [
        '필드는 private final 이고, 접근자는 name(), age() 형태로 자동 생성된다',
        '접근자는 getName(), getAge() 형태로 자동 생성된다',
        'setter 도 자동 생성되므로 값을 바꿀 수 있다',
        '다른 클래스를 extends 로 상속할 수 있다',
      ],
      answer: 0,
      explain:
        'record 는 불변 데이터 클래스로 private final 필드, 컴포넌트 이름 그대로의 접근자(name()), 생성자, equals/hashCode/toString 이 생성됩니다. setter 는 없고, 이미 java.lang.Record 를 상속하므로 다른 클래스를 extends 할 수 없어요(인터페이스 구현은 가능).',
    },
    {
      id: 'q5-10',
      level: 5,
      type: '빈칸 채우기',
      topic: 'sealed',
      prompt: 'Shape 를 구현할 수 있는 타입을 Circle, Square 로 제한하려고 합니다. 빈칸에 들어갈 키워드는?',
      code: `public sealed interface Shape ____ Circle, Square {}`,
      choices: ['extends', 'allows', 'permits', 'implements'],
      answer: 2,
      explain:
        'sealed 타입은 permits 뒤에 허용할 하위 타입을 나열합니다(Java 17 정식). 나열된 하위 타입은 final, sealed, non-sealed 중 하나를 선언해야 해요. allows 라는 키워드는 없습니다.',
    },
    {
      id: 'q5-11',
      level: 5,
      type: '코드 출력',
      topic: 'switch 식',
      prompt: '다음 코드의 출력은? (Java 17)',
      code: `int day = 3;
String type = switch (day) {
    case 1, 7 -> "주말";
    case 2, 3, 4, 5, 6 -> {
        String s = "평일";
        yield s + day;
    }
    default -> "?";
};
System.out.println(type);`,
      choices: ['평일', '평일?', '컴파일 에러 (break 누락)', '평일3'],
      answer: 3,
      explain:
        '화살표(->) 형식의 switch 식은 fall-through 가 없어 break 가 필요 없고, 블록에서 값을 돌려줄 때는 yield 를 씁니다. day 가 3 이므로 "평일" + 3 = "평일3" 이 됩니다. default 로 흘러 내려가지 않아요.',
    },
    {
      id: 'q5-12',
      level: 5,
      type: 'OX',
      topic: 'var',
      prompt: 'var 는 지역 변수뿐 아니라 클래스의 필드와 메서드 파라미터 타입에도 사용할 수 있다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        'var 는 초기화가 있는 지역 변수(및 for 문 변수, 람다 파라미터)에만 쓸 수 있습니다. 필드, 메서드 파라미터, 반환 타입에는 쓸 수 없어요. 컴파일 시점에 타입이 결정되므로 동적 타입이 되는 것도 아닙니다.',
    },
    {
      id: 'q5-13',
      level: 5,
      type: '개념',
      topic: 'volatile',
      prompt: 'volatile 키워드에 대한 설명으로 옳은 것은?',
      choices: [
        'volatile int count; 로 선언하면 여러 스레드의 count++ 도 안전하다',
        '변수 값의 가시성(다른 스레드가 최신 값을 봄)은 보장하지만, count++ 같은 복합 연산의 원자성은 보장하지 않는다',
        'synchronized 와 완전히 같은 효과지만 더 빠르다',
        '변수를 상수로 만들어 값을 바꿀 수 없게 한다',
      ],
      answer: 1,
      explain:
        'volatile 은 변수를 메인 메모리 기준으로 읽고 써서 다른 스레드의 변경이 보이게(가시성) 해줍니다. 하지만 count++ 은 읽기·더하기·쓰기 세 단계라 중간에 다른 스레드가 끼어들 수 있어요. 원자성이 필요하면 synchronized 나 AtomicInteger 를 써야 합니다.',
    },
    {
      id: 'q5-14',
      level: 5,
      type: '버그 찾기',
      topic: '경쟁 조건',
      prompt: '아래 코드를 실행하면 기대값 20000 보다 작은 값이 자주 출력됩니다. 원인과 해결로 옳은 것은?',
      code: `class Counter {
    int count = 0;
    void increment() { count++; }
}

Counter c = new Counter();
Runnable r = () -> { for (int i = 0; i < 10000; i++) c.increment(); };
Thread t1 = new Thread(r);
Thread t2 = new Thread(r);
t1.start(); t2.start();
t1.join(); t2.join();
System.out.println(c.count);`,
      choices: [
        'count++ 가 원자적이지 않아 증가가 유실된다 — increment 에 synchronized 를 붙이거나 AtomicInteger 를 쓴다',
        'join() 을 호출하지 않아 출력 시점에 스레드가 안 끝났다 — sleep 을 추가한다',
        'start() 대신 run() 을 호출해야 정확히 실행된다',
        'int 범위를 넘어 오버플로가 났다 — long 으로 바꾼다',
      ],
      answer: 0,
      explain:
        '두 스레드가 같은 count 를 동시에 읽고 각자 +1 해서 쓰면 증가 하나가 사라지는 경쟁 조건입니다. synchronized 나 AtomicInteger.incrementAndGet() 으로 원자성을 보장해야 해요. join() 은 이미 호출하고 있고, run() 을 부르면 동시성 자체가 없어질 뿐 근본 해결이 아닙니다.',
    },
    {
      id: 'q5-15',
      level: 5,
      type: '실무 상황',
      topic: 'ExecutorService',
      prompt:
        '운영 서버가 며칠마다 "java.lang.OutOfMemoryError: unable to create native thread" 로 죽습니다. 코드를 보니 API 요청이 올 때마다 Executors.newFixedThreadPool(10) 을 새로 만들어 작업을 제출하고, shutdown() 은 호출하지 않습니다. 가장 적절한 조치는?',
      choices: [
        '스레드 풀 크기를 10 에서 100 으로 늘린다',
        'JVM 힙 메모리(-Xmx)를 2배로 늘린다',
        '스레드 풀을 애플리케이션에서 하나만 만들어(예: 스프링 빈) 재사용하고, 종료 시 shutdown 한다',
        'newFixedThreadPool 대신 매번 new Thread().start() 로 바꾼다',
      ],
      answer: 2,
      explain:
        '요청마다 풀을 만들고 shutdown 하지 않으면 풀의 스레드가 정리되지 않고 계속 쌓여 OS 스레드 한도에 도달합니다. 풀은 공용으로 하나 만들어 재사용하는 게 정석이에요. 풀 크기나 힙을 늘리는 건 증상만 늦출 뿐이고, 스레드는 힙이 아닌 네이티브 메모리를 씁니다.',
    },
    {
      id: 'q5-16',
      level: 5,
      type: '실무 상황',
      topic: 'Optional orElse 함정',
      prompt:
        '소셜 로그인 코드에서 "이미 가입한 회원이 로그인할 때마다 unique 제약 위반 에러"가 납니다. 원인은?',
      code: `User user = userRepository.findByEmail(email)
        .orElse(userRepository.save(new User(email)));`,
      choices: [
        'findByEmail 이 Optional 을 반환해서 트랜잭션이 끝나버렸다',
        'User 의 equals/hashCode 를 재정의하지 않았다',
        'Optional 은 JPA 엔티티를 담을 수 없다',
        'orElse 의 인자는 Optional 에 값이 있어도 항상 먼저 실행되므로 매번 save 가 호출된다 — orElseGet 으로 바꾼다',
      ],
      answer: 3,
      explain:
        '자바는 메서드를 호출하기 전에 인자를 평가하므로, orElse(save(...)) 는 회원이 있어도 save 를 실행해 같은 이메일로 insert 를 시도합니다. orElseGet(() -> save(...)) 로 바꾸면 비어 있을 때만 실행돼요. Optional 은 엔티티를 담는 데 아무 문제가 없습니다.',
    },
    {
      id: 'q5-17',
      level: 5,
      type: '실무 상황',
      topic: 'CompletableFuture',
      prompt:
        '상품 상세 API 가 서로 독립적인 외부 API 두 개(재고 1초, 리뷰 1초)를 순서대로 호출해 응답에 2초가 걸립니다. 응답 시간을 약 1초로 줄이는 가장 적절한 방법은?',
      choices: [
        '두 호출을 하나의 synchronized 메서드로 묶는다',
        'CompletableFuture.supplyAsync 로 두 호출을 동시에 시작하고 thenCombine(또는 둘 다 join)으로 결과를 합친다',
        '두 호출 결과를 Optional 로 감싸 지연 평가되게 한다',
        '리스트에 담아 stream().map(호출) 로 바꾼다',
      ],
      answer: 1,
      explain:
        '두 작업이 서로 의존하지 않으므로 supplyAsync 로 병렬 실행하고 thenCombine/join 으로 합치면 전체 시간이 가장 느린 쪽(약 1초)에 맞춰집니다. synchronized 는 오히려 직렬화하고, 일반 stream() 은 순차 실행이라 시간이 줄지 않아요. 실무에선 블로킹 I/O 용 전용 Executor 를 함께 넘기는 게 좋습니다.',
    },
    {
      id: 'q5-18',
      level: 5,
      type: 'OX',
      topic: '스트림 재사용',
      prompt: '한 번 최종 연산(예: count())을 실행한 Stream 객체에 다시 최종 연산을 호출하면 IllegalStateException 이 발생한다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        '스트림은 일회용이라 최종 연산 후에는 닫힌 상태가 되고, 다시 연산하면 "stream has already been operated upon or closed" IllegalStateException 이 납니다. 다시 처리해야 하면 원본 컬렉션에서 stream() 을 새로 만들거나 Supplier<Stream<T>> 를 쓰세요.',
    },
  ],
};

export default content;
