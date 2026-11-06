import type { LevelContent } from './types';

/** 레벨 1 — Java 지망생: 기초 문법 */
const content: LevelContent = {
  level: 1,
  lessons: [
    {
      id: 'l1-jvm-basics',
      level: 1,
      title: 'JDK · JRE · JVM 과 main 메서드',
      summary: '자바 코드가 어떻게 컴파일되고 실행되는지, 그리고 왜 "한 번 작성해 어디서나 실행"이 가능한지',
      blocks: [
        {
          t: 'p',
          text: '자바 소스(.java)는 바로 실행되지 않습니다. javac 컴파일러가 소스를 바이트코드(.class)로 바꾸고, 그 바이트코드를 JVM(Java Virtual Machine)이 읽어서 실행합니다. OS마다 다른 건 JVM 쪽이고, 바이트코드는 어디서나 같습니다. 그래서 Windows에서 만든 .class 파일을 리눅스 서버의 JVM이 그대로 실행할 수 있습니다.',
        },
        {
          t: 'table',
          head: ['구성', '들어 있는 것', '언제 필요한가'],
          rows: [
            ['JVM', '바이트코드 실행기, GC, JIT 컴파일러', '자바 프로그램을 "실행"하는 엔진'],
            ['JRE', 'JVM + 표준 라이브러리(java.lang, java.util ...)', '실행만 할 때 (Java 11부터 별도 배포는 사라짐)'],
            ['JDK', 'JRE + 개발 도구(javac, jar, jdb, jshell ...)', '개발할 때 — 개발자는 항상 JDK를 설치'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `// Hello.java — 파일 이름과 public 클래스 이름이 같아야 한다
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
// $ javac Hello.java   → Hello.class (바이트코드) 생성
// $ java Hello         → JVM이 Hello.class 의 main 을 실행
// (Java 11+) $ java Hello.java 로 컴파일+실행을 한 번에 할 수도 있다`,
        },
        {
          t: 'p',
          text: 'main 메서드의 모양에는 이유가 있습니다. JVM은 객체를 만들기 전에 프로그램을 시작해야 하므로 static이어야 하고, 외부(JVM)에서 호출하므로 public, 돌려줄 곳이 없으니 void, 명령행 인자를 받기 위해 String[] args를 받습니다.',
        },
        {
          t: 'list',
          items: [
            'public — JVM이 클래스 밖에서 호출할 수 있어야 한다',
            'static — 객체 생성 없이 클래스 이름만으로 호출된다',
            'void — 종료 코드는 System.exit(n)으로 따로 전달한다',
            'String[] args — java Hello a b 로 실행하면 args = {"a", "b"}',
          ],
        },
        {
          t: 'p',
          text: 'JVM은 처음엔 바이트코드를 한 줄씩 해석(인터프리트)하다가, 자주 실행되는 코드(hot spot)를 JIT 컴파일러가 기계어로 바꿔 캐시합니다. "자바는 느리다"는 말이 옛날 얘기가 된 이유입니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 "이 서버는 JDK 몇 버전으로 돌아가요?"를 꼭 확인합니다. 컴파일한 버전보다 낮은 JVM에서 실행하면 UnsupportedClassVersionError가 납니다. java -version 으로 실행 환경을, 빌드 설정(Gradle toolchain 등)으로 컴파일 버전을 맞추세요.',
        },
      ],
    },
    {
      id: 'l1-types-casting',
      level: 1,
      title: '변수, 기본형 8종, 형변환',
      summary: '기본형의 크기와 범위, 묵시적/명시적 형변환, 정수 나눗셈과 오버플로 함정',
      blocks: [
        {
          t: 'p',
          text: '자바의 타입은 기본형(primitive) 8종과 그 외 모든 참조형(reference)으로 나뉩니다. 기본형 변수는 값 자체를 담고, 참조형 변수는 객체가 있는 위치(참조)를 담습니다. String도 배열도 참조형입니다.',
        },
        {
          t: 'table',
          head: ['타입', '크기', '범위/비고'],
          rows: [
            ['byte', '1바이트', '-128 ~ 127'],
            ['short', '2바이트', '-32,768 ~ 32,767'],
            ['int', '4바이트', '약 ±21억 (정수 리터럴의 기본 타입)'],
            ['long', '8바이트', '리터럴 뒤에 L — 10_000_000_000L'],
            ['float', '4바이트', '리터럴 뒤에 f — 3.14f'],
            ['double', '8바이트', '실수 리터럴의 기본 타입'],
            ['char', '2바이트', '유니코드 한 글자, 0 ~ 65,535 (부호 없음)'],
            ['boolean', '-', 'true / false 만 (0/1 로 변환 불가)'],
          ],
        },
        {
          t: 'p',
          text: '작은 타입 → 큰 타입은 값 손실이 없으니 자동(묵시적)으로 변환됩니다. 큰 타입 → 작은 타입은 값이 잘릴 수 있으므로 개발자가 (int)처럼 명시해야 합니다. 컴파일러가 "책임은 네가 져라"라고 요구하는 셈입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `int i = 100;
long l = i;             // 묵시적: int → long (손실 없음)
double d = i;           // 묵시적: int → double
int back = (int) 3.99;  // 명시적: 소수점 버림 → 3 (반올림 아님!)
byte b = (byte) 130;    // 범위 초과 → -126 (비트가 잘림)

int a = 7, c = 2;
System.out.println(a / c);          // 3   ← 정수 / 정수 = 정수
System.out.println((double) a / c); // 3.5 ← 하나를 먼저 double로
System.out.println((double) (a / c)); // 3.0 ← 이미 3이 된 뒤 변환

int max = Integer.MAX_VALUE;
System.out.println(max + 1);        // -2147483648 (오버플로, 예외 없음)`,
        },
        {
          t: 'list',
          items: [
            '정수끼리의 연산 결과는 정수 — 나눗셈의 소수점은 그냥 버려진다',
            '연산 전에 캐스팅해야 의미가 있다: (double) a / c 와 (double) (a / c) 는 다르다',
            'int 오버플로는 예외 없이 조용히 음수로 넘어간다 — 큰 수는 long, 검출이 필요하면 Math.addExact',
            'byte/short/char 끼리 연산하면 결과는 int — byte x = b1 + b2; 는 컴파일 에러',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: double avg = sum / count; 처럼 정수 변수를 나눈 뒤 double에 담으면 이미 소수점이 버려진 값이 들어갑니다. 평균·비율 계산 버그의 단골 원인입니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 돈 계산에 double을 쓰지 않습니다. 0.1 + 0.2 가 0.30000000000000004 가 되는 부동소수점 오차 때문입니다. 금액은 long(원 단위 정수)이나 BigDecimal을 씁니다.',
        },
      ],
    },
    {
      id: 'l1-operators-control',
      level: 1,
      title: '연산자, 조건문, 반복문',
      summary: '증감 연산자, 단락 평가, 삼항 연산자, switch(화살표 포함), break/continue/라벨',
      blocks: [
        {
          t: 'p',
          text: 'i++ 와 ++i 는 둘 다 i를 1 늘리지만, "식의 값"이 다릅니다. 후위(i++)는 증가 전 값을, 전위(++i)는 증가 후 값을 식의 결과로 돌려줍니다. 한 줄에 섞어 쓰면 읽기 어려우므로 실무에선 단독 문장으로만 씁니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `int i = 5;
int a = i++;   // a = 5, i = 6
int b = ++i;   // i = 7, b = 7

// 단락 평가(short-circuit): 왼쪽만으로 결과가 정해지면 오른쪽은 실행하지 않는다
String name = null;
if (name != null && name.length() > 3) { }  // NPE 안 남
// & 를 쓰면 양쪽을 모두 평가 → name.length() 에서 NPE

int score = 85;
String result = score >= 60 ? "합격" : "불합격";  // 삼항 연산자`,
        },
        {
          t: 'p',
          text: '전통적인 switch는 case에 break가 없으면 아래 case로 계속 실행이 흘러갑니다(fall-through). 의도한 경우가 거의 없어서 버그가 잘 납니다. Java 14부터 정식 도입된 화살표(->) switch는 fall-through가 없고, 식(expression)으로 써서 값을 바로 돌려받을 수 있습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// 전통 switch — break 를 빼먹으면 아래로 흘러간다
switch (grade) {
    case 'A': System.out.print("우수 "); break;
    case 'B': System.out.print("보통 "); break;
    default:  System.out.print("노력 ");
}

// 화살표 switch 식 — fall-through 없음, 여러 값은 콤마로
String type = switch (day) {
    case "SAT", "SUN" -> "주말";
    default -> "평일";
};

// 블록에서 값을 돌려줄 땐 yield
int len = switch (day) {
    case "MON" -> 3;
    default -> {
        int n = day.length();
        yield n;
    }
};`,
        },
        {
          t: 'code',
          lang: 'java',
          code: `// break 는 반복문 탈출, continue 는 이번 회차만 건너뛰기
// 라벨을 붙이면 바깥 반복문까지 한 번에 제어할 수 있다
outer:
for (int r = 0; r < 3; r++) {
    for (int c = 0; c < 3; c++) {
        if (c == 1) continue outer; // 바깥 for 의 다음 회차로
        if (r == 2) break outer;    // 두 반복문 모두 탈출
        System.out.println(r + "," + c);
    }
}
// 출력: 0,0  1,0`,
        },
        {
          t: 'table',
          head: ['반복문', '언제 쓰나'],
          rows: [
            ['for (초기; 조건; 증감)', '횟수가 정해진 반복, 인덱스가 필요할 때'],
            ['for (T x : 배열/컬렉션)', '모든 원소를 순서대로 읽기만 할 때 (향상된 for)'],
            ['while (조건)', '반복 횟수를 미리 모를 때 (입력, 큐 처리)'],
            ['do { } while (조건)', '최소 한 번은 실행해야 할 때'],
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 전통 switch에서 break를 빼먹어 다음 case까지 실행되는 버그. 새 코드라면 화살표 switch를 쓰면 이 실수 자체가 불가능합니다.',
        },
      ],
    },
    {
      id: 'l1-arrays-strings',
      level: 1,
      title: '배열과 String',
      summary: '배열 인덱스 범위, String 불변성, == 와 equals, StringBuilder 를 쓰는 이유',
      blocks: [
        {
          t: 'p',
          text: '배열은 같은 타입 값을 연속으로 담는 고정 길이 객체입니다. 인덱스는 0부터 length - 1 까지이고, 범위를 벗어나면 ArrayIndexOutOfBoundsException이 납니다. 길이는 메서드가 아니라 필드라서 arr.length (괄호 없음)로 읽습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `int[] scores = {90, 80, 70};
int[] empty = new int[3];          // 기본값 0으로 채워짐 (객체 배열은 null)
for (int i = 0; i < scores.length; i++) {  // < 이지 <= 가 아니다
    System.out.println(scores[i]);
}
System.out.println(java.util.Arrays.toString(scores)); // [90, 80, 70]`,
        },
        {
          t: 'p',
          text: 'String은 불변(immutable) 객체입니다. toUpperCase(), replace(), concat() 같은 메서드는 원본을 바꾸지 않고 "새 String"을 돌려줍니다. 결과를 변수에 다시 담지 않으면 아무 일도 일어나지 않은 것처럼 보입니다. 불변이기 때문에 여러 곳에서 안전하게 공유할 수 있고, 같은 리터럴을 String Pool에서 재사용할 수 있습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `String s = "java";
s.toUpperCase();            // 결과를 버림 → s 는 여전히 "java"
s = s.toUpperCase();        // 이렇게 다시 담아야 "JAVA"

String a = "hi";            // String Pool 의 "hi"
String b = "hi";            // 같은 Pool 객체 재사용
String c = new String("hi"); // 힙에 새 객체
System.out.println(a == b);       // true  (같은 객체)
System.out.println(a == c);       // false (다른 객체)
System.out.println(a.equals(c));  // true  (내용 비교)`,
        },
        {
          t: 'table',
          head: ['비교', '== ', 'equals()'],
          rows: [
            ['무엇을 비교?', '참조(같은 객체인가)', '내용(같은 문자들인가)'],
            ['기본형', '값 비교 — 정상', '사용 불가'],
            ['String', '우연히 맞을 때도 있어 더 위험', '항상 이걸 사용'],
          ],
        },
        {
          t: 'p',
          text: 'String이 불변이라서 반복문 안에서 += 로 이어 붙이면 매번 새 객체가 만들어지고 이전 내용이 복사됩니다(O(n²)). 가변 버퍼인 StringBuilder는 내부 배열에 append 하므로 훨씬 빠릅니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) {
    sb.append(i).append(",");
}
String csv = sb.toString();  // "0,1,2,3,4,"`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 문자열을 == 로 비교. 리터럴끼리는 Pool 덕분에 true가 나와 테스트는 통과하지만, 사용자 입력·DB·API에서 온 문자열은 새 객체라 false가 됩니다. 💡 null 가능성이 있으면 "Y".equals(input) 처럼 상수를 앞에 두면 NPE도 피할 수 있습니다.',
        },
      ],
    },
    {
      id: 'l1-methods-value',
      level: 1,
      title: '메서드와 값 전달(call by value)',
      summary: '자바는 항상 값을 복사해 전달한다 — 참조형이면 "참조값"이 복사될 뿐',
      blocks: [
        {
          t: 'p',
          text: '메서드는 입력(매개변수)을 받아 일을 하고 결과(반환값)를 돌려주는 코드 묶음입니다. 이름이 같아도 매개변수 목록이 다르면 여러 개 정의할 수 있습니다(오버로딩). 반환 타입만 다른 건 오버로딩이 아닙니다.',
        },
        {
          t: 'p',
          text: '자바의 인자 전달은 언제나 call by value입니다. 기본형이면 값이 복사되고, 참조형이면 "참조값(주소)"이 복사됩니다. 그래서 메서드 안에서 그 참조를 따라가 객체 내부를 바꾸면 호출자도 바뀐 걸 보지만, 매개변수에 새 객체를 대입해도 호출자의 변수는 그대로입니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `static void change(int n, int[] arr, StringBuilder sb) {
    n = 100;                       // 복사본만 바뀜
    arr[0] = 100;                  // 같은 배열 객체를 수정 → 호출자도 보임
    sb.append("!");                // 같은 객체를 수정 → 호출자도 보임
    sb = new StringBuilder("new"); // 매개변수만 다른 객체를 가리킴
}

public static void main(String[] args) {
    int n = 1;
    int[] arr = {1, 2};
    StringBuilder sb = new StringBuilder("hi");
    change(n, arr, sb);
    System.out.println(n + " " + arr[0] + " " + sb); // 1 100 hi!
}`,
        },
        {
          t: 'table',
          head: ['메서드 안에서 한 일', '호출자에게 보이나?'],
          rows: [
            ['기본형 매개변수에 새 값 대입', '아니오'],
            ['참조형 매개변수가 가리키는 객체의 내부 수정', '예'],
            ['참조형 매개변수에 새 객체 대입', '아니오'],
            ['String 매개변수에 += (새 String 생성)', '아니오 — 불변이라 결국 재대입'],
          ],
        },
        {
          t: 'list',
          items: [
            '면접 단골: "자바는 call by reference를 지원하나요?" → 아니요, 항상 call by value이며 참조형은 참조값이 복사됩니다',
            'swap(a, b) 같은 메서드로 호출자의 두 변수를 맞바꿀 수 없다',
            '메서드가 넘겨받은 객체를 몰래 수정하면 호출자가 놀란다 — 수정한다면 이름과 문서로 드러내자',
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 매개변수로 받은 리스트·객체를 메서드 안에서 수정하는 "부수 효과"가 디버깅을 어렵게 만드는 주범입니다. 가능하면 입력은 건드리지 말고 새 결과를 만들어 반환하세요.',
        },
      ],
    },
  ],
  questions: [
    {
      id: 'q1-01',
      level: 1,
      type: '개념',
      topic: 'JDK/JRE/JVM',
      prompt: '소스 코드(.java)를 바이트코드(.class)로 바꾸는 컴파일러 javac 가 포함된 것은?',
      choices: ['JVM', 'JRE', 'JDK', 'JIT'],
      answer: 2,
      explain:
        'javac 같은 개발 도구는 JDK에만 들어 있습니다. JRE는 JVM과 표준 라이브러리로 "실행"만 담당하고, JIT은 JVM 안에서 실행 중인 바이트코드를 기계어로 바꾸는 컴파일러라 소스를 다루지 않습니다.',
    },
    {
      id: 'q1-02',
      level: 1,
      type: '개념',
      topic: '바이트코드',
      prompt: '자바 프로그램을 OS마다 다시 컴파일하지 않아도 실행할 수 있는 가장 직접적인 이유는?',
      choices: [
        'OS가 자바 소스 코드를 직접 해석하기 때문',
        '컴파일 결과인 바이트코드를 각 OS용 JVM이 실행하기 때문',
        'JIT 컴파일러가 실행 시 소스 코드를 다시 컴파일하기 때문',
        '자바 표준 라이브러리가 모든 OS에 미리 설치되어 있기 때문',
      ],
      answer: 1,
      explain:
        'javac가 만든 바이트코드는 플랫폼 독립적이고, OS별 차이는 JVM이 흡수합니다. JIT은 소스가 아니라 바이트코드를 기계어로 바꾸며, OS가 자바 소스를 직접 읽는 일은 없습니다.',
    },
    {
      id: 'q1-03',
      level: 1,
      type: '개념',
      topic: '기본형',
      prompt: '다음 중 자바의 기본형(primitive type)이 아닌 것은?',
      choices: ['String', 'long', 'char', 'boolean'],
      answer: 0,
      explain:
        'String은 java.lang.String 클래스, 즉 참조형입니다. 기본형은 byte, short, int, long, float, double, char, boolean 8종뿐입니다. 자주 쓰여서 기본형처럼 느껴지지만 null을 담을 수 있다는 점이 참조형이라는 증거입니다.',
    },
    {
      id: 'q1-04',
      level: 1,
      type: '코드 출력',
      topic: '정수 나눗셈',
      prompt: '출력 결과는?',
      code: `int a = 7, b = 2;
double d = a / b;
System.out.println(d + " " + (double) a / b);`,
      choices: ['3.5 3.5', '3.0 3.5', '3 3.5', '3.0 3.0'],
      answer: 1,
      explain:
        'a / b 는 정수 나눗셈이라 3이 되고, 그 뒤 double로 바뀌어 3.0이 됩니다. (double) a / b 는 캐스트가 나눗셈보다 먼저 적용되어 7.0 / 2 = 3.5입니다. d는 double이므로 "3"이 아니라 "3.0"으로 출력됩니다.',
    },
    {
      id: 'q1-05',
      level: 1,
      type: '코드 출력',
      topic: '오버플로',
      prompt: '출력 결과는?',
      code: `int max = Integer.MAX_VALUE; // 2147483647
System.out.println(max + 1);`,
      choices: ['2147483648', '컴파일 에러', '-2147483648', 'ArithmeticException 발생'],
      answer: 2,
      explain:
        'int 범위를 넘으면 예외 없이 비트가 넘쳐 최솟값 -2147483648로 돌아갑니다(오버플로). 자바는 정수 오버플로에 예외를 던지지 않으며, 검출이 필요하면 Math.addExact를 써야 ArithmeticException이 납니다.',
    },
    {
      id: 'q1-06',
      level: 1,
      type: '코드 출력',
      topic: '증감 연산자',
      prompt: '출력 결과는?',
      code: `int i = 5;
int j = i++ + ++i;
System.out.println(i + " " + j);`,
      choices: ['7 12', '6 11', '7 11', '6 12'],
      answer: 0,
      explain:
        'i++ 는 현재 값 5를 내놓고 i를 6으로 만듭니다. 이어서 ++i 는 i를 7로 올린 뒤 7을 내놓으므로 j = 5 + 7 = 12, i는 최종 7입니다. "7 11"은 두 번째 항도 증가 전 값(6)으로 착각한 경우입니다.',
    },
    {
      id: 'q1-07',
      level: 1,
      type: '개념',
      topic: '단락 평가',
      prompt: '다음 코드는 예외 없이 false 를 출력한다. 그 이유로 옳은 것은?',
      code: `int z = 0;
boolean r = (z != 0) && (10 / z > 1);
System.out.println(r);`,
      choices: [
        '정수를 0으로 나누면 Infinity가 되어 비교 결과가 false라서',
        'JVM이 0으로 나누는 예외를 자동으로 무시해서',
        '컴파일러가 최적화로 오른쪽 식을 삭제해서',
        '&& 는 왼쪽이 false면 오른쪽 식을 평가하지 않아서',
      ],
      answer: 3,
      explain:
        '&& 는 단락 평가로 왼쪽이 false면 결과가 확정되므로 10 / z 를 아예 실행하지 않습니다. 정수 0 나눗셈은 Infinity가 아니라 ArithmeticException이 나며(Infinity는 실수 나눗셈), & 를 썼다면 실제로 예외가 발생합니다.',
    },
    {
      id: 'q1-08',
      level: 1,
      type: '버그 찾기',
      topic: 'switch',
      prompt: "grade 가 'A' 일 때 \"우수\"만 출력되길 기대했지만 \"우수 보통 노력\"이 출력됐다. 원인은?",
      code: `switch (grade) {
    case 'A': System.out.print("우수 ");
    case 'B': System.out.print("보통 ");
    default:  System.out.print("노력 ");
}`,
      choices: [
        'char 는 switch 에 쓸 수 없어서 모든 case가 실행된다',
        '각 case 끝에 break 가 없어 아래 case로 실행이 흘러간다(fall-through)',
        'default 가 맨 마지막에 있어서 항상 실행된다',
        "case 'A' 가 'a' 와도 일치해서 중복 실행된다",
      ],
      answer: 1,
      explain:
        '전통 switch는 일치한 case부터 break를 만날 때까지 아래로 계속 실행합니다. default는 위치와 무관하게 일치하는 case가 없을 때만 선택되지만, fall-through로 흘러오면 실행됩니다. 화살표(->) switch를 쓰면 이 문제가 원천 차단됩니다.',
    },
    {
      id: 'q1-09',
      level: 1,
      type: '코드 출력',
      topic: 'String 비교',
      prompt: '출력 결과는? (한 줄씩 순서대로)',
      code: `String a = "hi";
String b = "hi";
String c = new String("hi");
System.out.println(a == b);
System.out.println(a == c);
System.out.println(a.equals(c));`,
      choices: ['true / false / true', 'true / true / true', 'false / false / true', 'true / false / false'],
      answer: 0,
      explain:
        '같은 리터럴 "hi"는 String Pool의 한 객체를 공유하므로 a == b 는 true입니다. new String은 힙에 새 객체를 만들어 참조가 달라 a == c 는 false지만, equals는 내용을 비교하므로 true입니다.',
    },
    {
      id: 'q1-10',
      level: 1,
      type: '코드 출력',
      topic: 'call by value',
      prompt: '출력 결과는?',
      code: `static void change(int n, int[] arr, StringBuilder sb) {
    n = 100;
    arr[0] = 100;
    sb.append("!");
    sb = new StringBuilder("new");
}
public static void main(String[] args) {
    int n = 1;
    int[] arr = {1, 2};
    StringBuilder sb = new StringBuilder("hi");
    change(n, arr, sb);
    System.out.println(n + " " + arr[0] + " " + sb);
}`,
      choices: ['100 100 new', '1 1 hi', '1 100 hi!', '1 100 new'],
      answer: 2,
      explain:
        'n은 값이 복사되어 원본이 그대로 1입니다. arr와 sb는 참조값이 복사되어 같은 객체를 수정하므로 100과 "hi!"가 보이지만, sb = new ... 는 매개변수만 다른 객체를 가리키게 할 뿐 호출자의 sb에는 영향이 없습니다.',
    },
    {
      id: 'q1-11',
      level: 1,
      type: '빈칸 채우기',
      topic: 'StringBuilder',
      prompt: '0부터 9999까지의 숫자를 효율적으로 이어 붙이려 한다. 빈칸에 알맞은 것은?',
      code: `StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    ____;
}
String result = sb.toString();`,
      choices: ['sb.append(i)', 'sb = sb + i', 'sb.concat(i)', 'sb.add(i)'],
      answer: 0,
      explain:
        'StringBuilder는 append로 내부 버퍼에 이어 붙입니다. sb + i 는 String 연결이 되어 StringBuilder 변수에 대입할 수 없고, concat은 String의 메서드, add는 컬렉션의 메서드라 StringBuilder에는 없습니다.',
    },
    {
      id: 'q1-12',
      level: 1,
      type: '빈칸 채우기',
      topic: '화살표 switch',
      prompt: 'Java 17 switch 식이다. 빈칸에 들어갈 것은?',
      code: `String type = switch (day) {
    case "SAT", "SUN" ____ "주말";
    default -> "평일";
};`,
      choices: [':', '->', '=>', 'yield'],
      answer: 1,
      explain:
        '화살표 switch는 case 값 -> 결과 형태이며 fall-through가 없습니다. => 는 자바 문법이 아니고(JS/C# 람다 표기), yield는 블록 { } 안에서 값을 돌려줄 때 쓰는 키워드입니다. 같은 switch 안에서 : 와 -> 를 섞어 쓸 수도 없습니다.',
    },
    {
      id: 'q1-13',
      level: 1,
      type: '빈칸 채우기',
      topic: '라벨 break',
      prompt: '2차원 배열에서 target 을 찾으면 두 반복문을 한 번에 빠져나오려 한다. 빈칸에 알맞은 것은?',
      code: `outer:
for (int r = 0; r < grid.length; r++) {
    for (int c = 0; c < grid[r].length; c++) {
        if (grid[r][c] == target) {
            found = true;
            ____ outer;
        }
    }
}`,
      choices: ['continue', 'return', 'break', 'goto'],
      answer: 2,
      explain:
        'break 라벨 은 라벨이 붙은 바깥 반복문까지 탈출합니다. continue outer 는 바깥 반복문의 다음 회차로 넘어가 탐색을 계속하고, return은 라벨을 받지 않으며 메서드 자체를 끝냅니다. goto는 예약어지만 자바에서 쓸 수 없습니다.',
    },
    {
      id: 'q1-14',
      level: 1,
      type: '버그 찾기',
      topic: '배열',
      prompt: '실행하면 예외가 발생한다. 문제가 있는 줄과 원인은?',
      code: `1: int[] scores = {90, 80, 70};
2: int sum = 0;
3: for (int i = 0; i <= scores.length; i++) {
4:     sum += scores[i];
5: }
6: System.out.println(sum / scores.length);`,
      choices: [
        '1번 줄 — 배열은 new int[3] 으로만 만들 수 있다',
        '6번 줄 — 정수 나눗셈이라 예외가 발생한다',
        '3번 줄 — length 는 메서드이므로 length() 로 써야 한다',
        '3번 줄 — <= 때문에 i 가 3이 되어 4번 줄에서 ArrayIndexOutOfBoundsException',
      ],
      answer: 3,
      explain:
        '인덱스는 0 ~ length-1 이므로 i < scores.length 여야 합니다. 배열의 length는 필드라 괄호가 없고(String은 length() 메서드), 정수 나눗셈은 소수점만 버릴 뿐 예외를 내지 않습니다. 배열 리터럴 {90, 80, 70} 도 올바른 문법입니다.',
    },
    {
      id: 'q1-15',
      level: 1,
      type: '실무 상황',
      topic: 'String 비교',
      prompt:
        '"동의 여부" API 파라미터 agree 를 if (agree == "Y") 로 검사했더니, 로컬 단위 테스트(리터럴 \"Y\" 전달)는 통과했는데 운영에서는 항상 동의 안 함으로 처리된다. 가장 좋은 수정은? (agree 는 null 일 수도 있다)',
      choices: [
        'agree.equals("Y") 로 바꾼다',
        'agree == "Y" || agree == "y" 로 바꾼다',
        'agree.intern() == "Y" 로 바꾼다',
        '"Y".equals(agree) 로 바꾼다',
      ],
      answer: 3,
      explain:
        '== 는 참조 비교라 리터럴끼리(Pool 공유)는 true지만 HTTP 요청에서 만들어진 문자열은 새 객체라 false입니다. agree.equals("Y") 도 내용 비교는 맞지만 agree가 null이면 NPE가 나므로, 상수를 앞에 둔 "Y".equals(agree) 가 가장 안전합니다. intern()은 동작은 하지만 의도가 불분명한 우회책입니다.',
    },
    {
      id: 'q1-16',
      level: 1,
      type: 'OX',
      topic: 'call by value',
      prompt: '자바에서 객체를 메서드 인자로 넘기면 call by reference 로 동작하므로, 메서드 안에서 매개변수에 new 로 새 객체를 대입하면 호출자의 변수도 새 객체를 가리킨다.',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        '자바는 항상 call by value이며, 참조형은 "참조값"이 복사될 뿐입니다. 매개변수에 새 객체를 대입하면 복사본만 바뀌고 호출자의 변수는 원래 객체를 그대로 가리킵니다. 다만 객체 내부를 수정하면 같은 객체이므로 호출자도 변경을 봅니다.',
    },
    {
      id: 'q1-17',
      level: 1,
      type: 'OX',
      topic: '정수 나눗셈',
      prompt: 'int 변수끼리 계산한 7 / 2 의 결과는 3 이다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        '정수끼리의 나눗셈 결과는 정수이고, 소수점 아래는 반올림 없이 버려집니다. 3.5를 얻으려면 (double) 7 / 2 처럼 나누기 전에 한쪽을 실수로 바꿔야 합니다.',
    },
    {
      id: 'q1-18',
      level: 1,
      type: '개념',
      topic: '형변환',
      prompt: '다음 중 캐스트 연산자 없이 대입해도 컴파일되는(묵시적 형변환) 경우는?',
      choices: [
        'double d = 3.5; int i = d;',
        'long l = 10L; short s = l;',
        'int n = 65; char ch = n;',
        'int n = 10; double d = n;',
      ],
      answer: 3,
      explain:
        '작은 범위 → 큰 범위(int → double)는 손실이 없어 자동 변환됩니다. double → int, long → short 는 값이 잘릴 수 있어 명시적 캐스트가 필요하고, int → char 도 범위가 달라(char는 부호 없음) 변수일 때는 (char) 캐스트가 필요합니다.',
    },
  ],
};

export default content;
