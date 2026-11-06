import type { LevelContent } from './types';

/** 레벨 3 — 자바 견습생: 핵심 API */
const content: LevelContent = {
  level: 3,
  lessons: [
    {
      id: 'l3-collections',
      level: 3,
      title: '컬렉션 프레임워크: List · Set · Map',
      summary: 'ArrayList vs LinkedList, HashSet vs TreeSet, 그리고 HashMap 이 키를 찾는 원리',
      blocks: [
        {
          t: 'p',
          text: '컬렉션은 "순서가 있고 중복 허용(List)", "중복 없음(Set)", "키-값 쌍(Map)" 세 갈래입니다. 변수 타입은 인터페이스(List, Set, Map)로 선언하고 구현체(ArrayList, HashSet, HashMap)는 생성할 때만 고르는 것이 관례입니다. 나중에 구현을 바꿔도 사용하는 코드는 그대로입니다.',
        },
        {
          t: 'table',
          head: ['구현체', '내부 구조', '강점', '약점'],
          rows: [
            ['ArrayList', '동적 배열', 'get(i) O(1), 순회가 빠름(메모리 연속)', '중간 삽입/삭제 O(n) — 뒤 원소를 밀고 당김'],
            ['LinkedList', '이중 연결 리스트', '양 끝 삽입/삭제 O(1)', 'get(i) O(n), 노드마다 메모리 추가'],
            ['HashSet / HashMap', '해시 테이블', '추가·조회 평균 O(1)', '순서 보장 없음'],
            ['LinkedHashMap', '해시 + 연결 리스트', '넣은 순서 유지', '약간의 메모리 추가'],
            ['TreeSet / TreeMap', '레드-블랙 트리', '정렬 상태 유지, 범위 검색', '추가·조회 O(log n)'],
          ],
        },
        {
          t: 'p',
          text: 'HashMap.put(key, value)는 key.hashCode()로 몇 번 버킷에 넣을지 정하고, 그 버킷에 이미 다른 키가 있으면(해시 충돌) equals()로 같은 키인지 비교합니다. 같으면 값을 덮어쓰고, 다르면 같은 버킷에 연결해 둡니다(Java 8+는 한 버킷에 8개를 넘으면 트리로 바꿔 최악 O(log n)). get도 같은 순서로 찾습니다. 그래서 키 객체의 hashCode와 equals가 올바르지 않으면 HashMap이 망가집니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `List<Integer> list = new ArrayList<>(List.of(10, 20, 30));
list.remove(1);                    // 인덱스 1 삭제 → [10, 30]
list.remove(Integer.valueOf(10));  // 값 10 삭제   → [30]

Set<String> tree = new TreeSet<>(List.of("banana", "apple", "cherry", "apple"));
System.out.println(tree);          // [apple, banana, cherry] — 정렬 + 중복 제거

Map<String, Integer> count = new HashMap<>();
for (String w : "a b a c a b".split(" ")) {
    count.merge(w, 1, Integer::sum); // 없으면 1, 있으면 +1
}
System.out.println(count.getOrDefault("z", 0)); // 0 — 없는 키는 null 대신 기본값`,
        },
        {
          t: 'list',
          items: [
            'List.of(...), Map.of(...) — 완전 불변. add/remove/set 모두 UnsupportedOperationException',
            'Arrays.asList(...) — 크기 고정. set 은 되지만 add/remove 는 UnsupportedOperationException',
            'HashMap/HashSet 의 순회 순서는 보장되지 않는다 — 순서가 필요하면 LinkedHashMap, 정렬이 필요하면 TreeMap',
            'list.remove(1) 은 인덱스, list.remove(Integer.valueOf(1)) 은 값 — List<Integer> 에서 자주 헷갈린다',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 "일단 ArrayList, HashMap"이 정답인 경우가 대부분입니다. LinkedList는 이론상 삽입이 빠르지만, 삽입 위치까지 가는 탐색이 O(n)이고 캐시 효율이 나빠 실측하면 ArrayList가 이기는 일이 많습니다. 큐/스택이 필요하면 ArrayDeque를 쓰세요.',
        },
      ],
    },
    {
      id: 'l3-equals-compare',
      level: 3,
      title: 'equals/hashCode 계약, 불변 객체, Comparable/Comparator',
      summary: 'HashMap 키가 사라지는 이유, 불변 객체를 만드는 법, 정렬 기준을 정의하는 두 가지 방법',
      blocks: [
        {
          t: 'list',
          items: [
            'equals 가 true 인 두 객체는 hashCode 가 반드시 같아야 한다 (핵심 계약)',
            'hashCode 가 같다고 equals 가 true 일 필요는 없다 (충돌은 허용)',
            'equals 에 쓰는 필드와 hashCode 에 쓰는 필드를 일치시킨다',
            'HashSet/HashMap 에 들어간 뒤에는 그 필드가 바뀌면 안 된다',
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `class User {
    String id;
    User(String id) { this.id = id; }
    @Override public boolean equals(Object o) {
        return o instanceof User u && u.id.equals(id);
    }
    // hashCode 재정의 없음!
}
Set<User> set = new HashSet<>();
set.add(new User("kim"));
set.add(new User("kim"));
System.out.println(set.size()); // 2 — hashCode 가 달라 다른 버킷에 들어가 equals 비교조차 안 함`,
        },
        {
          t: 'p',
          text: '불변 객체는 생성된 뒤 상태가 절대 바뀌지 않는 객체입니다. 여러 스레드가 동시에 읽어도 안전하고, HashMap 키로 써도 hashCode가 변하지 않으며, 메서드에 넘겨도 누가 몰래 바꿀 걱정이 없습니다. String, Integer, LocalDate가 대표적입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public final class Order {                 // 1. 상속으로 가변 자식 만드는 것 차단
    private final String id;               // 2. 모든 필드 private final
    private final List<String> items;

    public Order(String id, List<String> items) {
        this.id = id;
        this.items = List.copyOf(items);   // 3. 가변 입력은 방어적 복사
    }
    public List<String> getItems() { return items; } // 불변 리스트라 그대로 반환 OK
    public Order withItem(String item) {   // 4. setter 대신 새 객체 반환
        List<String> next = new ArrayList<>(items);
        next.add(item);
        return new Order(id, next);
    }
}
// Java 16+ : record Point(int x, int y) {} — 필드 final + equals/hashCode/toString 자동`,
        },
        {
          t: 'p',
          text: '정렬 기준은 두 가지로 정합니다. Comparable은 클래스 스스로 "자연 순서"를 정의(compareTo)하는 것이고, Comparator는 외부에서 상황별 정렬 기준을 만들어 넘기는 것입니다. TreeSet/TreeMap에 넣는 원소는 둘 중 하나가 반드시 있어야 하며, 없으면 넣는 순간 ClassCastException이 납니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `record User(String name, int age) implements Comparable<User> {
    @Override public int compareTo(User o) {
        return Integer.compare(age, o.age);   // 음수: 내가 앞, 0: 같음, 양수: 내가 뒤
    }
}
List<User> users = new ArrayList<>(List.of(new User("bob", 30), new User("al", 25)));
Collections.sort(users);                              // 자연 순서(나이 오름차순)
users.sort(Comparator.comparing(User::name));         // 이름순
users.sort(Comparator.comparing(User::age).reversed()
        .thenComparing(User::name));                  // 나이 내림차순, 같으면 이름순`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: compareTo 를 return this.age - o.age; 로 구현하는 것. 값이 크면 int 오버플로로 부호가 뒤집혀 정렬이 깨집니다. Integer.compare(a, b) 나 Comparator.comparingInt 를 쓰세요.',
        },
      ],
    },
    {
      id: 'l3-generics',
      level: 3,
      title: '제네릭과 와일드카드(PECS)',
      summary: '타입 안정성을 컴파일 시점에 확보하는 제네릭, 그리고 extends/super 와일드카드를 고르는 법',
      blocks: [
        {
          t: 'p',
          text: '제네릭이 없던 시절 List는 Object를 담았기 때문에 꺼낼 때마다 캐스팅해야 했고, 잘못된 타입이 들어가도 실행해 봐야 알았습니다. List<String>처럼 타입 매개변수를 지정하면 컴파일러가 잘못된 add를 막아주고 캐스팅도 필요 없어집니다. 버그를 실행 시점에서 컴파일 시점으로 당겨오는 것이 핵심 가치입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Box<T> {                      // 제네릭 클래스
    private T value;
    void set(T value) { this.value = value; }
    T get() { return value; }
}
static <T extends Comparable<T>> T max(List<T> list) {  // 제네릭 메서드 + 상한
    T best = list.get(0);
    for (T t : list) if (t.compareTo(best) > 0) best = t;
    return best;
}
Box<String> box = new Box<>();
box.set("hello");
String s = box.get();               // 캐스팅 불필요
// box.set(1);                      // 컴파일 에러`,
        },
        {
          t: 'p',
          text: '중요한 함정: Integer가 Number의 자식이어도 List<Integer>는 List<Number>의 자식이 아닙니다(무공변). 만약 허용된다면 List<Number> 변수를 통해 Integer 리스트에 Double을 넣을 수 있게 되기 때문입니다. 이 유연성을 안전하게 얻는 방법이 와일드카드입니다.',
        },
        {
          t: 'table',
          head: ['선언', '받을 수 있는 것', '읽기', '쓰기(add)'],
          rows: [
            ['List<Number>', 'List<Number> 만', 'Number', 'Number 와 그 자식'],
            ['List<? extends Number>', 'List<Integer>, List<Double> ...', 'Number 로 읽기 가능', '불가 (null 만)'],
            ['List<? super Integer>', 'List<Integer>, List<Number>, List<Object>', 'Object 로만', 'Integer 넣기 가능'],
          ],
        },
        {
          t: 'p',
          text: 'PECS = Producer Extends, Consumer Super. 컬렉션이 값을 "꺼내 주는(생산)" 쪽이면 extends, 값을 "받아 넣는(소비)" 쪽이면 super를 씁니다. Collections.copy(List<? super T> dest, List<? extends T> src)가 교과서적인 예입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `static double sum(List<? extends Number> nums) {   // 생산자: 꺼내서 읽기만
    double total = 0;
    for (Number n : nums) total += n.doubleValue();
    return total;
}
static void fillOnes(List<? super Integer> dest) { // 소비자: 넣기만
    for (int i = 0; i < 3; i++) dest.add(1);
}
sum(List.of(1, 2, 3));        // List<Integer> OK
sum(List.of(1.5, 2.5));       // List<Double> OK
List<Number> nums = new ArrayList<>();
fillOnes(nums);               // List<Number> OK
List<Object> objs = new ArrayList<>();
fillOnes(objs);               // List<Object> OK`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 직접 와일드카드를 쓸 일보다 라이브러리 시그니처(예: addAll(Collection<? extends E>))를 읽을 일이 더 많습니다. "읽기만 하는 매개변수면 extends, 넣기만 하면 super, 둘 다면 와일드카드 없이 T" — 이 한 줄이면 충분합니다.',
        },
      ],
    },
    {
      id: 'l3-exceptions',
      level: 3,
      title: '예외 처리: checked/unchecked, try-with-resources, 커스텀 예외',
      summary: '예외의 두 갈래, 자원을 안전하게 닫는 법, finally 의 함정, 의미 있는 커스텀 예외',
      blocks: [
        {
          t: 'p',
          text: 'Throwable 아래에 Error(OutOfMemoryError 등 복구 불가, 잡지 않음)와 Exception이 있습니다. Exception 중 RuntimeException의 자손은 unchecked, 나머지는 checked입니다. checked 예외는 컴파일러가 "잡거나(catch) 던진다고 선언(throws)하라"고 강제합니다.',
        },
        {
          t: 'table',
          head: ['구분', '예', '의미', '처리 강제'],
          rows: [
            ['checked', 'IOException, SQLException', '외부 요인으로 정상 코드에서도 일어날 수 있음', '컴파일러가 강제'],
            ['unchecked', 'NullPointerException, IllegalArgumentException, IndexOutOfBoundsException', '대부분 프로그래밍 실수', '강제 안 함'],
          ],
        },
        {
          t: 'p',
          text: 'try-with-resources는 AutoCloseable을 구현한 자원을 try 괄호 안에서 열면, 블록이 정상 종료되든 예외로 끝나든 자동으로 close()를 호출합니다. finally에서 직접 닫던 옛 방식은 close 자체의 예외나 null 체크 때문에 코드가 길어지고 실수가 잦았습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `String firstLine(Path path) throws IOException {
    try (BufferedReader br = Files.newBufferedReader(path)) {  // 자동 close
        return br.readLine();
    }   // 여러 자원은 ; 로 구분 — 연 순서의 역순으로 닫힌다
}

// finally 는 return 이 있어도 실행된다
static int f() {
    try { return 1; }
    finally { return 2; }   // 최종 반환값을 덮어씀 → 2 (절대 이렇게 쓰지 말 것)
}
static int g() {
    int x = 1;
    try { return x; }       // 반환값 1 이 이 시점에 정해짐
    finally { x = 99; }     // 지역 변수만 바뀜 → 반환은 1
}`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `// 커스텀 예외: 비즈니스 의미 + 원인(cause) 보존
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long orderId) {
        super("주문을 찾을 수 없습니다. id=" + orderId);
    }
}

try {
    callPaymentApi();
} catch (IOException e) {
    throw new PaymentFailedException("결제 API 호출 실패", e); // cause 전달 → 스택트레이스 보존
}`,
        },
        {
          t: 'list',
          items: [
            'catch (Exception e) { } 처럼 예외를 삼키지 말 것 — 최소한 로그를 남기거나 다시 던진다',
            '예외를 감쌀 때는 원인(e)을 생성자에 넘겨야 근본 원인을 추적할 수 있다',
            'finally 안에서 return / throw 하지 말 것 — 원래 예외가 사라진다',
            '구체적인 예외부터 catch — 부모 타입을 먼저 쓰면 아래 catch 는 컴파일 에러',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무(특히 Spring)에선 비즈니스 예외를 RuntimeException 기반 커스텀 예외로 만들고, 전역 예외 처리기(@RestControllerAdvice)에서 HTTP 응답으로 바꾸는 패턴이 표준입니다. checked 예외는 호출 체인 전체에 throws를 퍼뜨리기 때문에, 복구할 수 없는 checked 예외는 unchecked로 감싸서 던집니다.',
        },
      ],
    },
    {
      id: 'l3-wrapper-iterator-enum',
      level: 3,
      title: '래퍼 클래스, Iterator, enum',
      summary: '오토박싱과 Integer 캐시 함정, ConcurrentModificationException, 상수 대신 enum',
      blocks: [
        {
          t: 'p',
          text: '컬렉션과 제네릭은 객체만 다룰 수 있어서 기본형마다 래퍼 클래스(Integer, Long, Double, Boolean ...)가 있습니다. 컴파일러가 int ↔ Integer 변환을 자동으로 해주는데 이를 오토박싱/언박싱이라 합니다. 편리하지만 두 가지 함정이 있습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `Integer a = 127, b = 127;
Integer c = 128, d = 128;
System.out.println(a == b);       // true  — -128~127 은 캐시된 같은 객체
System.out.println(c == d);       // false — 범위 밖은 새 객체
System.out.println(c.equals(d));  // true  — 래퍼끼리는 항상 equals

Map<String, Integer> stock = new HashMap<>();
int n = stock.get("apple");       // NullPointerException — null 을 int 로 언박싱`,
        },
        {
          t: 'list',
          items: [
            'Integer.valueOf(오토박싱이 내부적으로 호출)는 -128~127 을 캐시해 같은 객체를 돌려준다',
            '테스트 데이터가 작은 숫자면 == 비교가 통과하다가 운영의 큰 ID 에서 깨진다',
            'null 인 래퍼를 기본형에 대입하거나 연산하면 NPE — map.get 결과, DB 의 NULL 컬럼 주의',
            '반복문에서 Long sum 처럼 래퍼로 누적하면 매번 박싱 객체가 생겨 느리다',
          ],
        },
        {
          t: 'p',
          text: '향상된 for문은 내부적으로 Iterator를 씁니다. 순회 도중 list.remove()로 컬렉션을 직접 바꾸면 Iterator가 "내가 모르는 변경"(modCount 불일치)을 감지해 ConcurrentModificationException을 던집니다(fail-fast). 순회 중 삭제는 Iterator.remove() 또는 removeIf를 쓰세요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `List<String> names = new ArrayList<>(List.of("a", "b", "c"));

// for (String s : names) if (s.equals("a")) names.remove(s); // CME!

Iterator<String> it = names.iterator();
while (it.hasNext()) {
    if (it.next().equals("a")) it.remove();   // OK — Iterator 를 통한 삭제
}
names.removeIf(s -> s.equals("b"));           // OK — 가장 간결`,
        },
        {
          t: 'p',
          text: 'enum은 정해진 값들의 집합을 타입으로 만든 것입니다. 문자열·정수 상수와 달리 오타나 엉뚱한 값이 컴파일 단계에서 걸러지고, 각 상수가 필드와 메서드를 가질 수 있어 상태별 로직을 enum 안에 모을 수 있습니다. enum 상수는 싱글턴이라 == 로 비교해도 안전합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public enum OrderStatus {
    PENDING("결제 대기"), PAID("결제 완료"), SHIPPED("배송 중"), CANCELED("취소");

    private final String label;
    OrderStatus(String label) { this.label = label; }
    public String label() { return label; }
    public boolean canCancel() { return this == PENDING || this == PAID; }
}
OrderStatus s = OrderStatus.valueOf("PAID"); // 문자열 → enum (없으면 IllegalArgumentException)
System.out.println(s.label() + " " + s.canCancel()); // 결제 완료 true
for (OrderStatus st : OrderStatus.values()) { }    // 모든 상수 순회`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: CME가 "가끔" 안 나서 괜찮다고 착각하는 것. 예를 들어 끝에서 두 번째 원소를 지우면 hasNext()가 바로 false가 되어 예외 없이 끝나지만 마지막 원소는 검사도 안 됩니다. 💡 DB에 enum을 저장할 땐 ordinal(순서 번호)이 아니라 name(문자열)으로 저장하세요 — 상수 순서를 바꾸는 순간 데이터가 뒤섞입니다.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q3-01',
      level: 3,
      type: '개념',
      topic: 'ArrayList vs LinkedList',
      prompt: '인덱스로 임의 위치의 원소를 조회(get(i))하는 일이 대부분인 경우, 더 유리한 구현체와 그 이유는?',
      choices: [
        'LinkedList — 노드가 서로 연결되어 있어 get(i) 가 O(1) 이다',
        'ArrayList — 내부가 배열이라 인덱스로 바로 접근해 get(i) 가 O(1) 이다',
        '둘 다 O(n) 이라 차이가 없다',
        'LinkedList — 원소마다 메모리를 따로 잡아 캐시 효율이 좋다',
      ],
      answer: 1,
      explain:
        'ArrayList는 배열 기반이라 주소 계산만으로 바로 접근합니다. LinkedList는 처음(또는 끝)부터 노드를 따라가야 해서 get(i)가 O(n)이고, 노드가 메모리에 흩어져 있어 캐시 효율도 오히려 나쁩니다.',
    },
    {
      id: 'q3-02',
      level: 3,
      type: '개념',
      topic: 'HashMap 동작 원리',
      prompt: 'HashMap.get(key) 가 값을 찾는 과정으로 옳은 것은?',
      choices: [
        'key.hashCode() 로 버킷 위치를 찾고, 그 버킷 안에서 equals() 로 같은 키를 찾는다',
        '저장된 모든 키를 처음부터 equals() 로 하나씩 비교한다',
        '키를 정렬된 상태로 보관하고 이진 탐색으로 찾는다',
        'key == 저장된키 로 참조가 같은 키만 찾는다',
      ],
      answer: 0,
      explain:
        'HashMap은 hashCode로 버킷을 바로 찾아 평균 O(1)이며, 충돌 시에만 그 버킷 안에서 equals로 비교합니다. 정렬 후 이진 탐색(정확히는 트리 탐색)은 TreeMap의 방식이고, == 가 아니라 equals를 쓰므로 내용이 같은 다른 String 객체로도 조회할 수 있습니다.',
    },
    {
      id: 'q3-03',
      level: 3,
      type: '개념',
      topic: 'checked/unchecked',
      prompt: '다음 중 checked 예외(컴파일러가 처리를 강제하는 예외)는?',
      choices: ['NullPointerException', 'IllegalArgumentException', 'IOException', 'ArrayIndexOutOfBoundsException'],
      answer: 2,
      explain:
        'IOException은 RuntimeException의 자손이 아니므로 checked 예외라 catch 하거나 throws 로 선언해야 합니다. 나머지 셋은 모두 RuntimeException의 자손인 unchecked 예외로, 주로 프로그래밍 실수를 나타냅니다.',
    },
    {
      id: 'q3-04',
      level: 3,
      type: '개념',
      topic: '와일드카드',
      prompt: 'List<? extends Number> nums 매개변수에 대한 설명으로 옳은 것은?',
      choices: [
        'nums.add(1) 처럼 Integer 를 추가할 수 있다',
        'Number 타입으로 꺼내 읽을 수는 있지만, null 외에는 add 할 수 없다',
        'List<Integer> 는 이 매개변수에 넘길 수 없다',
        '원소를 꺼내면 Object 타입으로만 받을 수 있다',
      ],
      answer: 1,
      explain:
        'extends 와일드카드는 실제 리스트가 List<Integer>인지 List<Double>인지 모르므로 안전하게 넣을 수 있는 값이 없지만, 무엇이든 Number임은 보장되어 Number로 읽을 수 있습니다(생산자 = extends). List<Integer>, List<Double> 모두 넘길 수 있고, Object로만 읽히는 건 ? super 쪽입니다.',
    },
    {
      id: 'q3-05',
      level: 3,
      type: '개념',
      topic: '불변 객체',
      prompt: '불변(immutable) 클래스를 만드는 방법으로 틀린 것은?',
      choices: [
        '모든 필드를 private final 로 선언한다',
        'setter 를 두지 않고, 변경이 필요하면 새 객체를 반환한다',
        '생성자로 받은 가변 List 는 복사하지 않고 그대로 필드에 대입해 공유한다',
        '클래스를 final 로 선언해 가변 자식 클래스가 생기지 않게 한다',
      ],
      answer: 2,
      explain:
        '외부에서 받은 가변 List를 그대로 저장하면 호출자가 원본 리스트를 수정해 객체 내부가 바뀝니다. List.copyOf 같은 방어적 복사가 필요합니다. final 필드는 참조 재대입만 막을 뿐 내부 변경은 막지 못한다는 점이 핵심입니다.',
    },
    {
      id: 'q3-06',
      level: 3,
      type: '코드 출력',
      topic: 'Integer 캐시',
      prompt: '출력 결과는?',
      code: `Integer a = 127, b = 127;
Integer c = 128, d = 128;
System.out.println((a == b) + " " + (c == d) + " " + c.equals(d));`,
      choices: ['true true true', 'true false true', 'false false true', 'true false false'],
      answer: 1,
      explain:
        '오토박싱은 Integer.valueOf를 호출하고, -128~127은 캐시된 같은 객체를 돌려주므로 a == b는 true입니다. 128은 캐시 범위 밖이라 매번 새 객체가 만들어져 == 는 false지만, equals는 값을 비교하므로 true입니다.',
    },
    {
      id: 'q3-07',
      level: 3,
      type: '코드 출력',
      topic: 'equals/hashCode',
      prompt: '출력 결과는?',
      code: `class User {
    String id;
    User(String id) { this.id = id; }
    @Override public boolean equals(Object o) {
        return o instanceof User u && u.id.equals(id);
    }
    // hashCode 는 재정의하지 않음
}
// main
Set<User> set = new HashSet<>();
set.add(new User("kim"));
set.add(new User("kim"));
System.out.println(set.size());`,
      choices: ['1', '0', '2', '컴파일 에러'],
      answer: 2,
      explain:
        'hashCode를 재정의하지 않으면 객체마다 다른 기본 hashCode가 나와 두 객체가 서로 다른 버킷에 들어가고, equals 비교 단계까지 가지도 못해 둘 다 저장됩니다. equals와 hashCode는 반드시 함께 재정의해야 합니다.',
    },
    {
      id: 'q3-08',
      level: 3,
      type: '코드 출력',
      topic: 'List.remove',
      prompt: '출력 결과는? ( / 는 줄바꿈)',
      code: `List<Integer> list = new ArrayList<>(List.of(10, 20, 30));
list.remove(1);
System.out.println(list);
list.remove(Integer.valueOf(10));
System.out.println(list);`,
      choices: ['[20, 30] / [30]', '[10, 30] / [10, 30]', '[20, 30] / [20, 30]', '[10, 30] / [30]'],
      answer: 3,
      explain:
        'remove(1)은 int 인자라 remove(int index)가 선택되어 인덱스 1의 20이 삭제됩니다. remove(Integer.valueOf(10))은 remove(Object)가 선택되어 값 10을 찾아 삭제합니다. 값 1을 지운다고 생각하면 [20, 30]을 고르게 됩니다.',
    },
    {
      id: 'q3-09',
      level: 3,
      type: '코드 출력',
      topic: 'finally',
      prompt: '출력 결과는?',
      code: `static int f() {
    try { return 1; }
    finally { return 2; }
}
static int g() {
    int x = 1;
    try { return x; }
    finally { x = 99; }
}
// main
System.out.println(f() + " " + g());`,
      choices: ['1 1', '2 99', '1 99', '2 1'],
      answer: 3,
      explain:
        'finally는 try에서 return해도 실행되며, f()처럼 finally 안의 return은 이전 반환값을 덮어써 2가 됩니다. g()는 return x 시점에 반환값 1이 이미 확정되고, finally에서 바꾸는 x는 지역 변수일 뿐이라 결과는 1입니다.',
    },
    {
      id: 'q3-10',
      level: 3,
      type: '빈칸 채우기',
      topic: 'try-with-resources',
      prompt: '파일을 읽은 뒤 예외가 나더라도 reader 가 자동으로 닫히게 하려 한다. 빈칸에 알맞은 키워드는?',
      code: `String firstLine(Path path) throws IOException {
    ____ (BufferedReader br = Files.newBufferedReader(path)) {
        return br.readLine();
    }
}`,
      choices: ['try', 'using', 'with', 'synchronized'],
      answer: 0,
      explain:
        'try (자원 선언) { } 형태의 try-with-resources는 블록이 끝나면 AutoCloseable 자원의 close()를 자동 호출합니다. using은 C#, with는 Python 문법이고, synchronized는 락을 위한 키워드로 자원을 닫지 않습니다.',
    },
    {
      id: 'q3-11',
      level: 3,
      type: '빈칸 채우기',
      topic: 'PECS',
      prompt: 'List<Integer>, List<Number>, List<Object> 모두에 정수를 넣을 수 있는 메서드를 만들려 한다. 빈칸에 알맞은 것은?',
      code: `static void fillOnes(List<? ____ Integer> dest) {
    for (int i = 0; i < 3; i++) dest.add(1);
}`,
      choices: ['extends', 'implements', 'super', 'Object'],
      answer: 2,
      explain:
        '값을 "넣는" 소비자 매개변수이므로 PECS에 따라 ? super Integer를 씁니다. Integer와 그 상위 타입 리스트를 모두 받을 수 있고 Integer를 넣는 것이 안전합니다. ? extends Integer 는 add가 불가능하고, implements는 와일드카드에 쓸 수 없습니다.',
    },
    {
      id: 'q3-12',
      level: 3,
      type: '빈칸 채우기',
      topic: 'Comparator',
      prompt: '회원 목록을 나이 내림차순으로, 나이가 같으면 이름 오름차순으로 정렬하려 한다. 빈칸에 알맞은 것은?',
      code: `record User(String name, int age) {}

users.sort(Comparator.____(User::age).reversed()
        .thenComparing(User::name));`,
      choices: ['comparing', 'compareTo', 'sorted', 'naturalOrder'],
      answer: 0,
      explain:
        'Comparator.comparing(키 추출 함수)는 그 키로 비교하는 Comparator를 만들고, reversed()와 thenComparing()으로 조합할 수 있습니다. compareTo는 Comparable 인스턴스 메서드, sorted는 Stream 메서드이며, naturalOrder()는 인자를 받지 않습니다.',
    },
    {
      id: 'q3-13',
      level: 3,
      type: '버그 찾기',
      topic: 'ConcurrentModificationException',
      prompt: '"탈퇴" 상태 회원을 목록에서 지우는 코드에서 ConcurrentModificationException 이 발생한다. 원인과 올바른 수정은?',
      code: `List<Member> members = new ArrayList<>(findAll());
for (Member m : members) {
    if (m.isWithdrawn()) {
        members.remove(m);
    }
}`,
      choices: [
        'ArrayList 는 동기화되지 않으므로 Collections.synchronizedList 로 감싼다',
        'Member 에 equals 가 없어서 remove 가 실패한다. equals 를 재정의한다',
        'findAll() 결과가 불변 리스트라서 발생한다. new ArrayList 로 복사한다',
        '향상된 for 의 Iterator 순회 중 리스트를 직접 수정해서 발생한다. members.removeIf(Member::isWithdrawn) 를 쓴다',
      ],
      answer: 3,
      explain:
        '향상된 for는 내부적으로 Iterator를 쓰고, 순회 중 list.remove()로 구조를 바꾸면 Iterator가 변경을 감지해 CME를 던집니다(멀티스레드와 무관). removeIf나 Iterator.remove()를 써야 합니다. 이미 new ArrayList로 복사했으므로 불변 리스트 문제도 아닙니다.',
    },
    {
      id: 'q3-14',
      level: 3,
      type: '버그 찾기',
      topic: '언박싱 NPE',
      prompt: '재고에 등록되지 않은 상품을 조회하면 서버가 NullPointerException 으로 실패한다. 문제가 있는 줄과 원인은?',
      code: `1: Map<String, Integer> stock = new HashMap<>();
2: stock.put("apple", 3);
3: String item = request.getItem();   // "banana"
4: int count = stock.get(item);
5: System.out.println(item + " 재고: " + count);`,
      choices: [
        '4번 줄 — get 이 null 을 반환하고, 그 null 을 int 로 자동 언박싱하다 NPE. getOrDefault(item, 0) 을 쓴다',
        '1번 줄 — HashMap 은 Integer 값을 저장할 수 없다',
        '2번 줄 — 3 이 Integer 로 오토박싱되지 않는다',
        '5번 줄 — 문자열과 int 를 + 로 연결할 수 없다',
      ],
      answer: 0,
      explain:
        '없는 키를 get하면 null이 반환되고, 이를 int 변수에 대입하는 순간 null.intValue()가 호출되는 셈이라 NPE가 납니다. getOrDefault로 기본값을 주거나 Integer로 받아 null 체크해야 합니다. 오토박싱과 문자열 + int 연결은 정상 동작합니다.',
    },
    {
      id: 'q3-15',
      level: 3,
      type: '실무 상황',
      topic: '가변 키',
      prompt:
        '캐시로 HashMap<Member, Profile> 을 쓰는데, Member 의 equals/hashCode 는 email 필드로 구현되어 있다. 회원이 이메일을 변경한 뒤부터 같은 Member 객체로 get 해도 null 이 나온다. 가장 근본적인 해결책은?',
      choices: [
        'HashMap 을 TreeMap 으로 바꾼다',
        'HashMap 대신 ConcurrentHashMap 을 쓴다',
        'get 이 null 이면 map 전체를 순회하며 equals 로 다시 찾는다',
        '변하지 않는 값(예: 회원 id)을 키로 쓰고, 키 객체는 불변으로 유지한다',
      ],
      answer: 3,
      explain:
        '키를 넣은 뒤 hashCode에 쓰이는 필드가 바뀌면, 객체는 옛 해시의 버킷에 남아 있는데 조회는 새 해시의 버킷에서 하므로 찾지 못합니다. 키는 불변이어야 합니다. ConcurrentHashMap은 동시성 문제 해결용이고, TreeMap도 비교 기준 필드가 바뀌면 같은 문제가 생깁니다.',
    },
    {
      id: 'q3-16',
      level: 3,
      type: '실무 상황',
      topic: 'enum',
      prompt:
        '주문 상태를 String 상수("PENDING", "PAID" ...)로 관리하다가 "PIAD" 오타가 DB에 저장되는 사고가 났다. 또 "취소 가능 여부" 판단 로직이 여러 서비스에 흩어져 있다. 가장 적절한 개선은?',
      choices: [
        '상태 값을 int 상수(0, 1, 2 ...)로 바꿔 오타를 없앤다',
        'OrderStatus enum 을 만들고, canCancel() 같은 상태별 로직을 enum 안에 둔다',
        '상태 문자열을 모두 대문자로 변환한 뒤 비교한다',
        '상태 값을 검증하는 정규식을 서비스마다 추가한다',
      ],
      answer: 1,
      explain:
        'enum은 정의된 값 외에는 타입 수준에서 존재할 수 없어 오타가 컴파일 단계에서 걸러지고, 상태별 로직을 enum 메서드로 모을 수 있습니다. int 상수는 여전히 아무 정수나 들어갈 수 있고 의미도 드러나지 않으며, 대문자 변환이나 정규식은 증상 완화일 뿐입니다.',
    },
    {
      id: 'q3-17',
      level: 3,
      type: 'OX',
      topic: 'HashMap 순서',
      prompt: 'HashMap 은 put 한 순서대로 entrySet() 순회 순서가 보장된다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        'HashMap의 순회 순서는 해시 버킷 배치에 따르므로 넣은 순서와 무관하고, 리사이즈 때 바뀔 수도 있습니다. 넣은 순서가 필요하면 LinkedHashMap, 키 정렬 순서가 필요하면 TreeMap을 써야 합니다.',
    },
    {
      id: 'q3-18',
      level: 3,
      type: 'OX',
      topic: 'TreeSet',
      prompt: 'TreeSet 에 넣는 원소는 Comparable 을 구현했거나, TreeSet 생성 시 Comparator 를 제공해야 한다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        'TreeSet은 원소를 정렬 상태로 유지하기 위해 비교가 필요합니다. 둘 다 없으면 원소를 add하는 순간 ClassCastException이 발생합니다. 또한 TreeSet은 equals가 아니라 compareTo(compare) 결과가 0이면 같은 원소로 봅니다.',
    },
  ],
};

export default content;
