import type { LevelContent } from './types';

/** 레벨 2 — 입문 개발자: 객체지향 */
const content: LevelContent = {
  level: 2,
  lessons: [
    {
      id: 'l2-class-object',
      level: 2,
      title: '클래스, 객체, 생성자, this',
      summary: '클래스는 설계도, 객체는 실체 — 생성자는 객체를 "올바른 상태"로 태어나게 하는 장치',
      blocks: [
        {
          t: 'p',
          text: '클래스는 데이터(필드)와 그 데이터를 다루는 동작(메서드)을 묶은 설계도이고, new 로 만든 실체가 객체(인스턴스)입니다. 같은 클래스로 만든 객체들은 구조는 같지만 각자 자기 필드 값을 따로 가집니다.',
        },
        {
          t: 'p',
          text: '생성자는 객체가 만들어지는 순간 실행되어 필드를 초기화합니다. 핵심은 "객체가 처음부터 유효한 상태로 존재하게 하는 것"입니다. 필수 값을 생성자 매개변수로 강제하면 이름 없는 회원 같은 반쪽짜리 객체가 생길 틈이 없습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public class Member {
    private final String email;   // 필수
    private String nickname;      // 선택

    public Member(String email, String nickname) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email 은 필수");
        }
        this.email = email;       // this.필드 = 매개변수 (이름이 같을 때 구분)
        this.nickname = nickname;
    }

    public Member(String email) {
        this(email, "익명");      // 다른 생성자 호출 — 반드시 첫 줄
    }
}

Member m1 = new Member("a@x.com", "자바왕");
Member m2 = new Member("b@x.com");   // nickname = "익명"`,
        },
        {
          t: 'list',
          items: [
            '생성자를 하나도 안 만들면 컴파일러가 매개변수 없는 기본 생성자를 넣어준다',
            '생성자를 하나라도 직접 만들면 기본 생성자는 자동으로 생기지 않는다',
            'this — 지금 메서드를 실행 중인 "그 객체" 자신을 가리키는 참조',
            'this(...) — 같은 클래스의 다른 생성자 호출, 생성자 첫 줄에서만 가능',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 매개변수 이름과 필드 이름이 같은데 this 를 빼고 email = email; 이라고 쓰면, 매개변수에 자기 자신을 대입할 뿐 필드는 null로 남습니다. 컴파일 에러도 안 나서 찾기 어렵습니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 매개변수가 많아지면(4~5개 이상) 생성자 대신 빌더 패턴이나 정적 팩토리 메서드(Member.of(...))를 써서 가독성과 검증을 챙깁니다.',
        },
      ],
    },
    {
      id: 'l2-encapsulation-static',
      level: 2,
      title: '접근제어자, 캡슐화, static',
      summary: '필드를 숨기고 의미 있는 메서드만 열어두는 이유, 그리고 클래스에 하나뿐인 static',
      blocks: [
        {
          t: 'table',
          head: ['접근제어자', '같은 클래스', '같은 패키지', '다른 패키지의 자식', '전체'],
          rows: [
            ['private', 'O', 'X', 'X', 'X'],
            ['(default, 생략)', 'O', 'O', 'X', 'X'],
            ['protected', 'O', 'O', 'O', 'X'],
            ['public', 'O', 'O', 'O', 'O'],
          ],
        },
        {
          t: 'p',
          text: '캡슐화는 "필드를 private 으로 숨긴다"가 끝이 아닙니다. 객체의 상태를 바꾸는 규칙(검증, 불변식)을 객체 안에 가두는 것이 목적입니다. 모든 필드에 getter/setter를 기계적으로 열면 public 필드와 다를 게 없습니다. 상태 변경은 의미 있는 행동 메서드로 표현하세요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public class Account {
    private long balance;          // 외부에서 직접 못 건드림

    public void withdraw(long amount) {
        if (amount <= 0) throw new IllegalArgumentException("금액 오류");
        if (amount > balance) throw new IllegalStateException("잔액 부족");
        balance -= amount;         // 규칙을 통과해야만 바뀐다
    }

    public long getBalance() { return balance; }
    // setBalance(long) 는 일부러 만들지 않는다
}`,
        },
        {
          t: 'p',
          text: 'static 멤버는 객체가 아니라 클래스에 속합니다. 클래스가 로딩될 때 하나만 만들어지고 모든 인스턴스가 공유합니다. 그래서 static 메서드 안에는 "어떤 객체"라는 개념(this)이 없어 인스턴스 필드에 직접 접근할 수 없습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Counter {
    static int total = 0;  // 클래스에 하나 — 모두 공유
    int mine = 0;          // 객체마다 하나

    Counter() { total++; mine++; }

    static void printTotal() {
        System.out.println(total);   // OK
        // System.out.println(mine); // 컴파일 에러: 누구의 mine?
    }
}
new Counter(); new Counter(); Counter c3 = new Counter();
System.out.println(Counter.total + " " + c3.mine); // 3 1`,
        },
        {
          t: 'list',
          items: [
            'static 에 어울리는 것: 상수(static final), 상태 없는 유틸 메서드(Math.max), 팩토리 메서드',
            'static 에 어울리지 않는 것: 요청·사용자별로 달라지는 값 — 모든 스레드가 공유하게 된다',
            'static 메서드는 오버라이딩되지 않는다(숨겨질 뿐) — 다형성이 필요하면 인스턴스 메서드로',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 웹 서버에서 static 필드에 "현재 로그인 사용자" 같은 값을 저장하는 것. 동시에 들어온 다른 사용자의 요청이 그 값을 덮어써서 개인정보가 섞이는 사고로 이어집니다.',
        },
      ],
    },
    {
      id: 'l2-inheritance-polymorphism',
      level: 2,
      title: '상속, 오버라이딩, 다형성',
      summary: 'super, 생성자 호출 순서, 오버라이딩 vs 오버로딩, 업캐스팅·다운캐스팅·instanceof',
      blocks: [
        {
          t: 'p',
          text: '상속(extends)은 부모의 필드와 메서드를 물려받아 확장합니다. 자식 생성자는 항상 부모 생성자를 먼저 호출합니다. 첫 줄에 super(...) 를 안 쓰면 컴파일러가 super() 를 넣는데, 부모에 기본 생성자가 없으면 컴파일 에러가 납니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Animal {
    String name = "animal";
    Animal() { System.out.print("A"); }
    void sound() { System.out.println("..."); }
    static void info() { System.out.println("Animal.info"); }
}
class Dog extends Animal {
    String name = "dog";             // 필드는 "숨김"일 뿐 오버라이딩 아님
    Dog() { System.out.print("D"); } // 암묵적 super() 가 먼저 실행
    @Override void sound() { System.out.println("멍멍"); }
    static void info() { System.out.println("Dog.info"); } // 숨김
    void fetch() { System.out.println("공 가져오기"); }
}

Animal a = new Dog();   // 출력: AD   (부모 생성자 → 자식 생성자)
a.sound();              // 멍멍        (실제 객체 Dog 의 메서드 — 다형성)
System.out.println(a.name); // animal (필드는 변수 타입 기준)
a.info();               // Animal.info (static 도 변수 타입 기준)
// a.fetch();           // 컴파일 에러: Animal 타입엔 fetch 가 없다`,
        },
        {
          t: 'table',
          head: ['', '오버라이딩(Overriding)', '오버로딩(Overloading)'],
          rows: [
            ['관계', '부모-자식 사이', '같은 클래스(또는 상속 포함) 안'],
            ['시그니처', '이름·매개변수 동일', '이름 같고 매개변수 다름'],
            ['결정 시점', '실행 시점, 실제 객체 타입 (동적 바인딩)', '컴파일 시점, 변수의 선언 타입'],
            ['제약', '접근 범위를 좁힐 수 없음, 반환형은 같거나 하위 타입', '반환형만 다른 건 불가'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `class Printer {
    void print(Object o) { System.out.println("Object"); }
    void print(String s) { System.out.println("String"); }
}
Object o = "hi";
new Printer().print(o);    // Object — 오버로딩은 선언 타입(Object)으로 고른다
new Printer().print("hi"); // String`,
        },
        {
          t: 'p',
          text: '다형성은 "부모 타입 변수 하나로 여러 자식 객체를 다루되, 호출되는 메서드는 실제 객체의 것"이라는 성질입니다. 업캐스팅(자식 → 부모)은 자동이지만 부모 타입으로 보이는 기능만 쓸 수 있습니다. 자식 기능이 꼭 필요하면 다운캐스팅해야 하는데, 실제 객체가 그 타입이 아니면 ClassCastException이 납니다. 그래서 instanceof 로 확인합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `Animal a = getAnimal();       // Dog 일 수도, Cat 일 수도
if (a instanceof Dog d) {     // Java 16+ 패턴 매칭: 검사 + 캐스팅 + 변수 선언
    d.fetch();
}
// 옛날 방식: if (a instanceof Dog) { ((Dog) a).fetch(); }`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 instanceof 분기가 여기저기 늘어나면 설계 신호입니다. "타입을 물어보고 행동을 고르는" 대신 그 행동을 부모 타입의 메서드로 올리고 각 자식이 오버라이딩하게 하세요. @Override 는 꼭 붙이세요 — 오타로 오버로딩이 되는 실수를 컴파일러가 잡아줍니다.',
        },
      ],
    },
    {
      id: 'l2-abstract-interface-final',
      level: 2,
      title: '추상 클래스, 인터페이스, final',
      summary: '"무엇이다(is-a) + 공통 구현"은 추상 클래스, "무엇을 할 수 있다(can-do)"는 인터페이스',
      blocks: [
        {
          t: 'p',
          text: '추상 클래스는 일부 메서드를 구현 없이(abstract) 남겨둔 미완성 클래스로, 직접 new 할 수 없습니다. 필드와 생성자를 가질 수 있어 자식들이 공통 상태와 초기화 로직을 공유할 때 씁니다. 클래스는 하나만 상속할 수 있습니다.',
        },
        {
          t: 'p',
          text: '인터페이스는 "이 기능을 제공한다"는 계약입니다. 인스턴스 필드는 없고(상수만), 한 클래스가 여러 인터페이스를 구현(implements)할 수 있습니다. Java 8부터 default 메서드로 구현을 넣을 수 있게 되었는데, 이미 많은 구현체가 있는 인터페이스에 메서드를 추가해도 기존 코드가 깨지지 않게 하려는 목적이었습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `interface Greeter {
    String name();                         // 추상 메서드 (public abstract 생략)
    default String greet() {               // 구현을 가진 default 메서드
        return "안녕하세요, " + name();
    }
    static Greeter of(String n) { return () -> n; } // static 메서드도 가능
}

abstract class Shape {
    private final String label;            // 상태(필드) 가능
    protected Shape(String label) { this.label = label; } // 생성자 가능
    abstract double area();                // 자식이 구현
    public String describe() { return label + ": " + area(); }
}

class Circle extends Shape implements Comparable<Circle> {
    private final double r;
    Circle(double r) { super("원"); this.r = r; }
    @Override double area() { return Math.PI * r * r; }
    @Override public int compareTo(Circle o) { return Double.compare(r, o.r); }
}`,
        },
        {
          t: 'table',
          head: ['', '추상 클래스', '인터페이스'],
          rows: [
            ['다중 상속/구현', '불가 (extends 하나)', '가능 (implements 여러 개)'],
            ['필드', '인스턴스 필드 가능', 'public static final 상수만'],
            ['생성자', '있음', '없음'],
            ['구현 메서드', '자유롭게', 'default / static / private 메서드'],
            ['언제', '공통 상태·구현을 가진 같은 계열', '서로 무관한 클래스에 능력 부여, 역할 분리'],
          ],
        },
        {
          t: 'list',
          items: [
            'final 클래스 — 상속 불가 (예: String)',
            'final 메서드 — 오버라이딩 불가',
            'final 변수 — 한 번만 대입 가능. 참조형이면 "다른 객체로 바꿀 수 없을" 뿐, 객체 내부는 바뀔 수 있다',
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `final List<String> names = new ArrayList<>();
names.add("kim");             // OK — 객체 내부 변경
// names = new ArrayList<>(); // 컴파일 에러 — 참조 재대입 불가`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 "인터페이스 먼저"가 기본입니다. 서비스 계층이 구체 클래스 대신 인터페이스에 의존하면 테스트에서 가짜 구현으로 바꿔 끼우기 쉽습니다. 추상 클래스는 템플릿 메서드처럼 공통 흐름을 강제하고 싶을 때 꺼내세요.',
        },
      ],
    },
    {
      id: 'l2-object-solid',
      level: 2,
      title: 'Object 클래스와 SOLID 맛보기',
      summary: 'toString / equals / hashCode 를 왜 재정의하는지, 그리고 좋은 객체지향 설계의 5원칙',
      blocks: [
        {
          t: 'p',
          text: '모든 클래스는 java.lang.Object 를 상속합니다. 기본 toString()은 "클래스명@해시값"이라 로그에서 쓸모가 없고, 기본 equals()는 == 와 똑같이 "같은 객체인가"만 봅니다. 값으로 비교해야 하는 객체(회원 이메일, 좌표 등)라면 equals를 재정의해야 합니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public class Point {
    private final int x, y;
    public Point(int x, int y) { this.x = x; this.y = y; }

    @Override
    public boolean equals(Object o) {           // 매개변수는 반드시 Object
        if (this == o) return true;
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() { return java.util.Objects.hash(x, y); }

    @Override
    public String toString() { return "Point(" + x + ", " + y + ")"; }
}`,
        },
        {
          t: 'list',
          items: [
            'equals 를 재정의하면 hashCode 도 반드시 재정의 — equals가 같은 두 객체는 hashCode도 같아야 HashMap/HashSet이 제대로 동작한다',
            'equals(Point p) 처럼 매개변수 타입을 바꾸면 오버라이딩이 아니라 오버로딩 — List.contains 등은 여전히 Object.equals를 부른다',
            '@Override 를 붙이면 위 실수를 컴파일러가 잡아준다',
            'Java 16+ record 를 쓰면 equals/hashCode/toString 이 자동 생성된다',
          ],
        },
        {
          t: 'table',
          head: ['원칙', '한 줄 요약', '위반 신호'],
          rows: [
            ['S — 단일 책임', '클래스는 변경 이유가 하나여야 한다', 'UserService 가 메일 발송·엑셀 출력까지 함'],
            ['O — 개방-폐쇄', '확장에는 열려 있고 수정에는 닫혀 있다', '새 결제수단마다 if-else 를 추가'],
            ['L — 리스코프 치환', '자식은 부모 자리에 넣어도 동작이 깨지지 않아야 한다', '자식이 부모 메서드에서 예외만 던짐'],
            ['I — 인터페이스 분리', '쓰지 않는 메서드에 의존하지 않게 작게 나눈다', '구현체마다 빈 메서드가 수두룩'],
            ['D — 의존 역전', '구체 클래스가 아니라 추상(인터페이스)에 의존한다', '서비스가 new MySqlRepository() 를 직접 생성'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `// OCP 위반: 결제 수단이 늘 때마다 이 메서드를 고쳐야 한다
if (type.equals("CARD")) { /* 카드 결제 */ }
else if (type.equals("KAKAO")) { /* 카카오 결제 */ }

// OCP 준수: 새 결제 수단 = 새 클래스 추가, 기존 코드는 그대로
interface PaymentMethod { void pay(long amount); }
class CardPayment implements PaymentMethod { public void pay(long amount) { } }
class KakaoPayment implements PaymentMethod { public void pay(long amount) { } }

class OrderService {
    private final PaymentMethod payment;              // DIP: 추상에 의존
    OrderService(PaymentMethod payment) { this.payment = payment; }
    void order(long amount) { payment.pay(amount); }  // 다형성으로 분기
}`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 SOLID를 외우기보다 "이 요구사항이 바뀌면 몇 군데를 고쳐야 하지?"를 자문해 보세요. 한 군데라면 설계가 건강한 것이고, 여러 클래스의 if-else를 뒤져야 한다면 다형성으로 옮길 때입니다.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q2-01',
      level: 2,
      type: '개념',
      topic: '접근제어자',
      prompt: '같은 패키지의 클래스와 "다른 패키지의 자식 클래스"에서는 접근할 수 있지만, 그 외 다른 패키지에서는 접근할 수 없게 하는 접근제어자는?',
      choices: ['private', '(default, 생략)', 'protected', 'public'],
      answer: 2,
      explain:
        'protected는 같은 패키지 + 다른 패키지의 자식 클래스까지 허용합니다. default(생략)는 같은 패키지에서만 접근할 수 있어 다른 패키지의 자식은 접근하지 못하고, public은 모든 곳에서 접근 가능합니다.',
    },
    {
      id: 'q2-02',
      level: 2,
      type: '개념',
      topic: 'static',
      prompt: 'static 필드에 대한 설명으로 옳은 것은?',
      choices: [
        '객체를 생성할 때마다 새로 만들어져 객체별로 다른 값을 가진다',
        '클래스에 하나만 존재하고 그 클래스의 모든 인스턴스가 공유한다',
        'static 메서드 안에서 this.필드명 으로 접근할 수 있다',
        '인스턴스를 하나 이상 생성한 후에만 접근할 수 있다',
      ],
      answer: 1,
      explain:
        'static 필드는 클래스 로딩 시 하나만 만들어져 모든 인스턴스가 공유하며, 객체 없이 클래스명.필드 로 접근합니다. static 메서드에는 특정 객체가 없으므로 this를 쓸 수 없습니다.',
    },
    {
      id: 'q2-03',
      level: 2,
      type: '코드 출력',
      topic: '생성자 순서·오버라이딩',
      prompt: '출력 결과는? ( / 는 줄바꿈)',
      code: `class Animal {
    Animal() { System.out.print("A"); }
    void sound() { System.out.println("..."); }
}
class Dog extends Animal {
    Dog() { System.out.print("D"); }
    @Override void sound() { System.out.println("멍멍"); }
}
// main
Animal a = new Dog();
System.out.println();
a.sound();`,
      choices: ['D / 멍멍', 'AD / 멍멍', 'AD / ...', 'DA / 멍멍'],
      answer: 1,
      explain:
        '자식 생성자는 첫 줄에서 암묵적으로 super()를 호출하므로 부모 생성자의 A가 먼저, 그다음 D가 출력됩니다. 오버라이딩된 메서드는 변수 타입(Animal)이 아니라 실제 객체(Dog) 기준으로 호출되어 "멍멍"이 나옵니다.',
    },
    {
      id: 'q2-04',
      level: 2,
      type: '코드 출력',
      topic: '필드 숨김·static',
      prompt: '출력 결과는? ( / 는 줄바꿈)',
      code: `class Animal {
    String name = "animal";
    static void info() { System.out.println("Animal.info"); }
}
class Dog extends Animal {
    String name = "dog";
    static void info() { System.out.println("Dog.info"); }
}
// main
Animal a = new Dog();
System.out.println(a.name);
a.info();`,
      choices: ['dog / Dog.info', 'animal / Dog.info', 'dog / Animal.info', 'animal / Animal.info'],
      answer: 3,
      explain:
        '다형성(동적 바인딩)은 인스턴스 메서드에만 적용됩니다. 필드와 static 메서드는 오버라이딩이 아니라 "숨김"이라 변수의 선언 타입(Animal) 기준으로 결정되므로 animal 과 Animal.info 가 출력됩니다.',
    },
    {
      id: 'q2-05',
      level: 2,
      type: '코드 출력',
      topic: '오버로딩',
      prompt: '출력 결과는? ( / 는 줄바꿈)',
      code: `class Printer {
    void print(Object o) { System.out.println("Object"); }
    void print(String s) { System.out.println("String"); }
}
// main
Printer p = new Printer();
Object o = "hi";
p.print(o);
p.print("hi");`,
      choices: ['String / String', 'Object / Object', 'Object / String', '컴파일 에러 (모호한 호출)'],
      answer: 2,
      explain:
        '오버로딩은 컴파일 시점에 인자의 "선언 타입"으로 메서드를 고릅니다. o 는 실제로 String이지만 선언 타입이 Object라 print(Object)가, 리터럴 "hi"는 String이라 더 구체적인 print(String)이 선택됩니다. 실제 객체로 고르는 건 오버라이딩입니다.',
    },
    {
      id: 'q2-06',
      level: 2,
      type: '코드 출력',
      topic: 'static',
      prompt: '출력 결과는?',
      code: `class Counter {
    static int total = 0;
    int mine = 0;
    Counter() { total++; mine++; }
}
// main
new Counter();
new Counter();
Counter c3 = new Counter();
System.out.println(Counter.total + " " + c3.mine);`,
      choices: ['3 1', '3 3', '1 1', '1 3'],
      answer: 0,
      explain:
        'total은 static이라 세 객체가 하나를 공유해 3이 됩니다. mine은 객체마다 따로 있어 c3의 mine은 자기 생성자에서 한 번 증가한 1입니다.',
    },
    {
      id: 'q2-07',
      level: 2,
      type: '개념',
      topic: '오버라이딩 vs 오버로딩',
      prompt: '오버라이딩(Overriding)에 대한 설명으로 옳은 것은?',
      choices: [
        '메서드 이름과 매개변수가 같고 반환형만 int → long 처럼 다르게 바꾸면 오버라이딩이다',
        '부모의 public 메서드를 자식에서 protected 로 좁혀 오버라이딩할 수 있다',
        '어떤 메서드가 호출될지는 컴파일 시점에 변수의 선언 타입으로 결정된다',
        '시그니처가 같아야 하며, 실행 시점에 실제 객체의 타입으로 호출될 메서드가 결정된다',
      ],
      answer: 3,
      explain:
        '오버라이딩은 실행 시점의 실제 객체 타입으로 메서드를 고르는 동적 바인딩입니다. 반환형은 같거나 하위 타입이어야 해서 int → long 은 컴파일 에러이고, 접근 범위는 넓힐 수만 있습니다. 선언 타입으로 고르는 건 오버로딩입니다.',
    },
    {
      id: 'q2-08',
      level: 2,
      type: '개념',
      topic: '추상 클래스 vs 인터페이스',
      prompt: '인터페이스 대신 추상 클래스를 선택하는 것이 더 적절한 상황은?',
      choices: [
        '한 클래스가 여러 타입의 역할을 동시에 가져야 할 때',
        '하위 클래스들이 공통 필드(상태)와 생성자 초기화 로직을 공유해야 할 때',
        '구현을 가진 메서드를 하나라도 넣고 싶을 때',
        '서로 관련 없는 클래스들에 "비교 가능" 같은 능력을 부여할 때',
      ],
      answer: 1,
      explain:
        '인스턴스 필드와 생성자는 추상 클래스만 가질 수 있으므로 공통 상태·초기화가 필요하면 추상 클래스가 맞습니다. 구현 메서드는 인터페이스도 default 메서드로 가질 수 있고, 다중 역할이나 무관한 클래스에 능력을 부여하는 건 인터페이스의 영역입니다.',
    },
    {
      id: 'q2-09',
      level: 2,
      type: '개념',
      topic: 'final',
      prompt: 'final 에 대한 설명으로 틀린 것은?',
      choices: [
        'final 클래스는 상속할 수 없다',
        'final 메서드는 자식 클래스에서 오버라이딩할 수 없다',
        'final List<String> list 로 선언하면 list.add(...) 로 원소를 추가할 수 없다',
        'final 지역 변수는 한 번만 값을 대입할 수 있다',
      ],
      answer: 2,
      explain:
        'final 참조 변수는 "다른 객체로 재대입"만 막을 뿐, 가리키는 객체의 내부 상태 변경은 막지 않습니다. 그래서 list.add() 는 정상 동작합니다. 내용까지 고정하려면 List.of() 같은 불변 컬렉션을 써야 합니다.',
    },
    {
      id: 'q2-10',
      level: 2,
      type: '빈칸 채우기',
      topic: 'super',
      prompt: 'Employee 에는 기본 생성자가 없다. Manager 가 컴파일되도록 빈칸을 채우면?',
      code: `class Employee {
    String name;
    Employee(String name) { this.name = name; }
}
class Manager extends Employee {
    int teamSize;
    Manager(String name, int teamSize) {
        ____;
        this.teamSize = teamSize;
    }
}`,
      choices: ['super(name)', 'this(name)', 'Employee(name)', 'super.name = name'],
      answer: 0,
      explain:
        '부모에 기본 생성자가 없으면 자식 생성자 첫 줄에서 super(name)으로 부모 생성자를 직접 호출해야 합니다. super.name = name 만 쓰면 컴파일러가 super()를 자동으로 넣으려다 실패하고, this(name)은 Manager에 그런 생성자가 없어 에러입니다.',
    },
    {
      id: 'q2-11',
      level: 2,
      type: '빈칸 채우기',
      topic: 'instanceof',
      prompt: 'Java 17 패턴 매칭으로 타입 검사와 캐스팅을 한 번에 하려 한다. 빈칸에 알맞은 것은?',
      code: `Animal a = getAnimal();
if (a ____) {
    d.fetch();   // Dog 에만 있는 메서드
}`,
      choices: ['is Dog d', '== (Dog) d', 'instanceof (Dog) d', 'instanceof Dog d'],
      answer: 3,
      explain:
        'a instanceof Dog d 는 a가 Dog이면 true를 반환하고 동시에 Dog 타입 변수 d를 선언해 줍니다(Java 16+). is 는 Kotlin 문법이고, 캐스트 괄호를 넣는 형태는 자바 문법이 아닙니다.',
    },
    {
      id: 'q2-12',
      level: 2,
      type: '빈칸 채우기',
      topic: 'default 메서드',
      prompt: '기존 구현체들을 고치지 않고 인터페이스에 구현이 있는 메서드를 추가하려 한다. 빈칸에 알맞은 키워드는?',
      code: `interface Greeter {
    String name();
    ____ String greet() {
        return "안녕하세요, " + name();
    }
}`,
      choices: ['static', 'abstract', 'default', 'final'],
      answer: 2,
      explain:
        'default 메서드는 구현을 가진 인스턴스 메서드라 추상 메서드 name()을 호출할 수 있고, 구현체가 오버라이딩할 수도 있습니다. static 메서드는 인스턴스가 없어 name()을 호출할 수 없고, abstract는 본문을 가질 수 없으며, 인터페이스 메서드에는 final을 붙일 수 없습니다.',
    },
    {
      id: 'q2-13',
      level: 2,
      type: '버그 찾기',
      topic: '다운캐스팅',
      prompt: '컴파일은 되지만 실행하면 예외가 난다. 문제와 올바른 해결책은?',
      code: `1: Animal a = new Cat();
2: a.sound();
3: Dog d = (Dog) a;
4: d.fetch();`,
      choices: [
        '3번 줄 — 실제 객체가 Cat이라 ClassCastException. if (a instanceof Dog d) 로 확인 후 사용한다',
        '1번 줄 — 자식 객체를 부모 타입 변수에 담을 수 없다. Cat a = new Cat() 으로 바꾼다',
        '2번 줄 — Animal 타입으로는 sound()를 호출할 수 없다. 먼저 캐스팅한다',
        '4번 줄 — d 가 null 이라 NullPointerException. null 체크를 추가한다',
      ],
      answer: 0,
      explain:
        '업캐스팅(1번 줄)은 항상 안전하고, 부모에 정의된 sound()도 호출 가능합니다. 다운캐스팅은 컴파일러가 허용하지만 실제 객체가 Cat이라 실행 시 ClassCastException이 나며, 캐스팅 결과가 null이 되는 게 아닙니다. instanceof 로 확인한 뒤 캐스팅해야 합니다.',
    },
    {
      id: 'q2-14',
      level: 2,
      type: '버그 찾기',
      topic: 'equals',
      prompt: '마지막 줄이 true 를 기대했는데 false 가 출력된다. 원인은?',
      code: `class Point {
    int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    public boolean equals(Point p) {
        return p.x == x && p.y == y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}
List<Point> list = new ArrayList<>();
list.add(new Point(1, 2));
System.out.println(list.contains(new Point(1, 2)));`,
      choices: [
        'hashCode 를 Objects.hash 로 구현해서 매번 다른 값이 나온다',
        'ArrayList 는 contains 시 equals 가 아니라 == 로 비교한다',
        'x, y 가 private 이 아니라서 equals 가 무시된다',
        'equals 의 매개변수가 Object 가 아니라 Point 라서 오버라이딩이 아닌 오버로딩이 되었다',
      ],
      answer: 3,
      explain:
        'List.contains 는 Object.equals(Object)를 호출하는데, equals(Point)는 별개의 오버로딩 메서드라 호출되지 않고 기본 equals(참조 비교)가 쓰입니다. @Override 를 붙였다면 컴파일러가 바로 잡아냈을 실수입니다. Objects.hash 는 같은 입력에 항상 같은 값을 줍니다.',
    },
    {
      id: 'q2-15',
      level: 2,
      type: '실무 상황',
      topic: 'OCP·다형성',
      prompt:
        '결제 코드가 if (type.equals("CARD")) {...} else if (type.equals("KAKAO")) {...} 형태이고, 새 결제 수단이 생길 때마다 이 분기를 여러 서비스에서 고치고 있다. 가장 적절한 리팩터링 방향은?',
      choices: [
        'PaymentMethod 인터페이스를 만들고 결제 수단별 구현 클래스로 나눠, 서비스는 인터페이스의 pay()만 호출한다',
        'if-else 를 switch 문으로 바꿔 가독성을 높인다',
        '결제 타입 문자열을 static final 상수로 모아 오타를 줄인다',
        '모든 결제 로직을 하나의 PaymentUtil static 클래스로 합친다',
      ],
      answer: 0,
      explain:
        '타입별 행동을 다형성으로 옮기면 새 결제 수단은 "새 클래스 추가"만으로 끝나 기존 코드를 수정하지 않습니다(OCP). switch나 상수화는 가독성 개선일 뿐 분기를 고쳐야 하는 구조는 그대로이고, static 유틸로 합치면 교체·테스트가 더 어려워집니다.',
    },
    {
      id: 'q2-16',
      level: 2,
      type: '실무 상황',
      topic: '캡슐화',
      prompt:
        '계좌 클래스의 balance 가 public 이라 여러 곳에서 account.balance -= amount; 로 직접 차감하고 있고, 가끔 잔액이 음수가 되는 버그가 난다. 가장 좋은 개선은?',
      choices: [
        'balance 를 private 으로 바꾸고 getBalance()/setBalance() 를 추가한다',
        'balance 를 private 으로 바꾸고, 검증을 포함한 withdraw(amount) 메서드로만 차감하게 한다',
        '차감하는 모든 곳에 if (balance >= amount) 검사를 추가한다',
        'balance 를 final 로 선언해 변경을 막는다',
      ],
      answer: 1,
      explain:
        '캡슐화의 목적은 상태 변경 규칙을 객체 안에 가두는 것입니다. 단순 setter는 외부에서 아무 값이나 넣을 수 있어 public 필드와 다를 바 없고, 호출부마다 검사를 넣으면 한 곳만 빠져도 버그가 재발합니다. final은 잔액 변경 자체를 불가능하게 만듭니다.',
    },
    {
      id: 'q2-17',
      level: 2,
      type: 'OX',
      topic: 'equals/hashCode',
      prompt: 'equals() 를 재정의했다면 hashCode() 도 함께 재정의해야 HashMap 이나 HashSet 에서 올바르게 동작한다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        'equals가 true인 두 객체는 hashCode도 같아야 한다는 것이 Object의 계약입니다. hashCode를 재정의하지 않으면 같은 값의 객체가 서로 다른 버킷에 들어가 HashSet에 중복 저장되거나 HashMap에서 찾지 못합니다.',
    },
    {
      id: 'q2-18',
      level: 2,
      type: 'OX',
      topic: '업캐스팅',
      prompt: 'Animal a = new Dog(); 처럼 업캐스팅한 변수 a 로도 Dog 에만 정의된 fetch() 메서드를 바로 호출할 수 있다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        '호출할 수 있는 메서드 목록은 변수의 선언 타입(Animal)으로 컴파일 시점에 정해집니다. Animal에 없는 fetch()는 컴파일 에러이므로 instanceof 확인 후 다운캐스팅해야 합니다. 다만 Animal에도 있는 메서드를 Dog가 오버라이딩했다면 Dog 버전이 실행됩니다.',
    },
  ],
};

export default content;
