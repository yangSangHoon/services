import type { LevelContent } from './types';

const content: LevelContent = {
  level: 6,
  lessons: [
    // ─────────────────────────────────────────────
    {
      id: 'l6-ioc-di',
      level: 6,
      title: 'IoC 와 DI — 생성자 주입이 정답인 이유',
      summary: '객체를 내가 만들지 않고 컨테이너가 만들어 꽂아준다',
      blocks: [
        {
          t: 'p',
          text: 'IoC(Inversion of Control, 제어의 역전)는 "객체 생성과 연결의 주도권을 내 코드가 아니라 프레임워크가 갖는다"는 뜻입니다. 스프링 컨테이너(ApplicationContext)가 객체(빈)를 만들고, 필요한 의존 객체를 넣어주는데(DI, Dependency Injection) 이 덕분에 클래스는 구체 구현이 아닌 인터페이스에만 의존할 수 있어요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// ❌ 직접 생성: 구현을 바꾸려면 코드 수정, 테스트에서 가짜로 바꾸기 어려움
public class OrderService {
    private final PaymentClient client = new KakaoPayClient();
}

// ✅ 생성자 주입: 무엇이 들어올지는 컨테이너(또는 테스트)가 결정
@Service
public class OrderService {
    private final PaymentClient client;

    public OrderService(PaymentClient client) { // 생성자가 1개면 @Autowired 생략 가능
        this.client = client;
    }
}`,
        },
        {
          t: 'table',
          head: ['주입 방식', '불변(final)', '테스트', '비고'],
          rows: [
            ['생성자 주입', '가능', 'new 로 바로 생성해 가짜 객체 전달', '스프링 공식 권장'],
            ['수정자(setter) 주입', '불가', '가능하지만 누락 위험', '선택적 의존성에만'],
            ['필드 주입 (@Autowired 필드)', '불가', '스프링 없이는 주입 불가 (리플렉션 필요)', '테스트 코드 외엔 지양'],
          ],
        },
        {
          t: 'list',
          items: [
            'final 로 선언 가능 → 한 번 주입되면 바뀌지 않음(불변), 누락 시 컴파일 에러',
            '스프링 없이 순수 자바 단위 테스트에서 new OrderService(fakeClient) 로 생성 가능',
            '순환 참조(A↔B)를 애플리케이션 시작 시점에 바로 발견 (Boot 2.6+ 는 순환 참조를 기본 금지)',
            '생성자 파라미터가 너무 많아지면 "이 클래스 책임이 너무 많다"는 신호가 된다',
          ],
        },
        {
          t: 'p',
          text: '같은 타입의 빈이 여러 개면 스프링은 어떤 걸 넣을지 몰라 NoUniqueBeanDefinitionException 을 냅니다. 이때는 @Primary 로 기본 구현을 지정하거나, @Qualifier("이름") 으로 콕 집어 주입합니다. List<PaymentClient> 로 받으면 해당 타입 빈 전부를 주입받을 수도 있어요.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 Lombok 의 @RequiredArgsConstructor 를 붙여 final 필드용 생성자를 자동 생성하는 방식이 가장 흔합니다. 면접에서 "왜 생성자 주입인가?"를 물으면 불변성, 테스트 용이성, 순환 참조 조기 발견, 누락 방지 네 가지를 말하면 됩니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l6-bean-scope',
      level: 6,
      title: 'Bean 등록과 스코프',
      summary: '컴포넌트 스캔 vs @Configuration/@Bean, 싱글톤 빈에 상태를 두면 안 되는 이유',
      blocks: [
        {
          t: 'p',
          text: '빈을 등록하는 방법은 두 가지입니다. ① 컴포넌트 스캔: @Component(및 이를 포함한 @Service, @Repository, @Controller)가 붙은 클래스를 자동으로 찾아 등록. ② 수동 등록: @Configuration 클래스 안에 @Bean 메서드를 만들어 반환 객체를 등록. 내가 만든 클래스는 보통 ①, 외부 라이브러리 객체나 설정이 복잡한 객체는 ②를 씁니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@SpringBootApplication   // = @Configuration + @EnableAutoConfiguration + @ComponentScan
public class App { }      // 이 클래스의 패키지와 그 하위 패키지만 스캔한다!

@Configuration
public class ClientConfig {
    @Bean
    public RestClient paymentRestClient() {   // 메서드 이름이 빈 이름
        return RestClient.builder().baseUrl("https://pay.example.com").build();
    }
}`,
        },
        {
          t: 'p',
          text: '@Configuration 클래스는 CGLIB 프록시로 감싸집니다. 그래서 @Bean 메서드끼리 서로 호출해도 매번 new 가 되는 게 아니라 컨테이너에 이미 있는 싱글톤 빈을 돌려줘요. @Configuration 없이 @Bean 만 쓰면(lite 모드) 이 보장이 없어 같은 메서드를 호출할 때마다 새 객체가 생깁니다.',
        },
        {
          t: 'table',
          head: ['스코프', '인스턴스', '용도'],
          rows: [
            ['singleton (기본값)', '컨테이너당 1개, 모든 요청·스레드가 공유', '서비스, 리포지토리 등 대부분'],
            ['prototype', '조회(주입)할 때마다 새로 생성', '상태를 가져야 하는 특수 객체'],
            ['request', 'HTTP 요청마다 1개', '요청 단위 정보 보관'],
            ['session', 'HTTP 세션마다 1개', '사용자 세션 단위 정보'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Service
public class PriceService {
    private int total;                        // ❌ 싱글톤의 공유 필드 = 모든 요청이 같이 씀

    public int calc(List<Item> items) {
        total = 0;
        for (Item i : items) total += i.price();
        return total;                         // 동시 요청 시 다른 사용자 금액이 섞일 수 있다
    }
}
// ✅ 해결: total 을 지역 변수로. 싱글톤 빈은 "무상태(stateless)"로 설계`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: 싱글톤 빈의 필드에 요청별 값을 저장하는 것. 웹 서버는 여러 스레드가 동시에 같은 빈 인스턴스를 쓰기 때문에 로컬에선 멀쩡하다가 운영 트래픽에서 "다른 사람 데이터가 보이는" 사고가 납니다. 빈 필드에는 final 로 주입받은 의존성만 두세요.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l6-aop',
      level: 6,
      title: 'AOP — 프록시와 self-invocation 함정',
      summary: '공통 관심사를 분리하는 AOP 는 프록시로 동작한다. 그래서 내부 호출엔 안 먹힌다',
      blocks: [
        {
          t: 'p',
          text: 'AOP(관점 지향 프로그래밍)는 로깅, 트랜잭션, 실행 시간 측정, 권한 체크처럼 여러 곳에 반복되는 "부가 기능"을 핵심 로직에서 떼어내는 기법입니다. @Transactional, @Async, @Cacheable 모두 스프링 AOP 로 구현되어 있어요.',
        },
        {
          t: 'table',
          head: ['용어', '의미'],
          rows: [
            ['Aspect', '부가 기능 모듈 (Advice + Pointcut)'],
            ['Advice', '실제 부가 기능 코드 (@Around, @Before, @AfterReturning ...)'],
            ['Pointcut', '어디에 적용할지 고르는 표현식'],
            ['JoinPoint', '적용 가능한 지점 — 스프링 AOP 에선 "메서드 실행"만'],
            ['Proxy', '원본 빈 대신 등록되어 호출을 가로채는 대리 객체'],
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Aspect
@Component
public class TimeAspect {
    @Around("@annotation(com.shop.LogTime)")
    public Object log(ProceedingJoinPoint jp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return jp.proceed();          // 실제 메서드 실행
        } finally {
            log.info("{} {}ms", jp.getSignature(), System.currentTimeMillis() - start);
        }
    }
}`,
        },
        {
          t: 'p',
          text: '스프링 AOP 는 런타임 프록시 방식입니다. 컨테이너는 원본 객체 대신 프록시를 빈으로 등록하고, 다른 빈이 주입받는 것도 프록시예요. 호출이 프록시를 "거쳐야" 부가 기능이 실행됩니다. 스프링 부트는 기본으로 CGLIB(클래스 상속 기반) 프록시를 쓰고, 그래서 final 클래스/메서드나 private 메서드에는 적용되지 않습니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@Service
public class ReportService {
    public void outer() {
        inner();          // = this.inner() → 프록시가 아닌 원본 객체의 메서드 직접 호출
    }

    @LogTime
    public void inner() { ... }   // outer() 를 통해 부르면 어드바이스가 실행되지 않는다!
}`,
        },
        {
          t: 'list',
          items: [
            'self-invocation(같은 클래스 내부 호출)은 프록시를 우회 → AOP 미적용',
            '해결 1(권장): 해당 메서드를 별도 빈(클래스)으로 분리해 주입받아 호출',
            '해결 2: 자기 자신을 주입받거나 AopContext 사용 — 구조가 꼬이므로 지양',
            'private·final 메서드는 CGLIB 가 오버라이드할 수 없어 AOP 미적용',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: "애너테이션을 붙였는데 왜 동작을 안 하지?" 의 9할은 내부 호출입니다. @Transactional, @Async, @Cacheable 이 안 먹을 때 가장 먼저 "이 메서드를 다른 빈에서 프록시를 통해 호출하고 있나?"를 확인하세요.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l6-mvc',
      level: 6,
      title: 'Spring MVC 요청 흐름과 REST 컨트롤러',
      summary: 'DispatcherServlet 부터 JSON 응답까지, 그리고 상태코드를 제대로 돌려주는 법',
      blocks: [
        {
          t: 'p',
          text: '모든 HTTP 요청은 먼저 DispatcherServlet(프론트 컨트롤러)이 받습니다. DispatcherServlet 이 HandlerMapping 으로 "어느 컨트롤러 메서드가 처리할지" 찾고, HandlerAdapter 로 그 메서드를 호출해요. @RestController 의 반환 객체는 HttpMessageConverter(Jackson)가 JSON 으로 바꿔 응답 바디에 씁니다.',
        },
        {
          t: 'list',
          items: [
            '1. 클라이언트 요청 → DispatcherServlet',
            '2. HandlerMapping: URL·HTTP 메서드로 처리할 핸들러(컨트롤러 메서드) 조회',
            '3. HandlerAdapter: 파라미터 바인딩(@PathVariable, @RequestBody → 메시지 컨버터) 후 메서드 호출',
            '4. 반환값 처리: @ResponseBody/@RestController 면 HttpMessageConverter 가 JSON 변환, 아니면 ViewResolver 로 뷰 렌더링',
            '5. 예외가 나면 HandlerExceptionResolver(@ExceptionHandler 등)가 처리',
          ],
        },
        {
          t: 'code',
          lang: 'java',
          code: `@RestController                    // = @Controller + @ResponseBody
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/{id}")                                  // GET /api/users/7
    public UserResponse get(@PathVariable Long id) {
        return userService.get(id);
    }

    @GetMapping                                           // GET /api/users?keyword=kim&page=0
    public List<UserResponse> search(@RequestParam String keyword,
                                     @RequestParam(defaultValue = "0") int page) {
        return userService.search(keyword, page);
    }

    @PostMapping                                          // POST /api/users  (JSON 바디)
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest req) {
        UserResponse saved = userService.create(req);
        return ResponseEntity.created(URI.create("/api/users/" + saved.id())).body(saved); // 201
    }
}`,
        },
        {
          t: 'table',
          head: ['애너테이션', '값의 출처', '예'],
          rows: [
            ['@PathVariable', 'URL 경로의 {변수}', '/users/{id}'],
            ['@RequestParam', '쿼리 스트링·폼 파라미터 (기본 required=true)', '?keyword=kim'],
            ['@RequestBody', 'HTTP 바디(JSON) → 객체 (메시지 컨버터)', 'POST/PUT 바디'],
            ['@ModelAttribute', '여러 요청 파라미터 → 객체 (생략 시 기본)', '검색 조건 폼'],
          ],
        },
        {
          t: 'code',
          lang: 'http',
          code: `POST /api/users HTTP/1.1
Content-Type: application/json

{"name": "kim", "email": "kim@example.com"}

HTTP/1.1 201 Created
Location: /api/users/7
Content-Type: application/json

{"id": 7, "name": "kim", "email": "kim@example.com"}`,
        },
        {
          t: 'table',
          head: ['상태코드', '의미', '언제'],
          rows: [
            ['200 OK', '성공', '조회·수정 성공'],
            ['201 Created', '생성됨', 'POST 로 리소스 생성 (Location 헤더)'],
            ['204 No Content', '성공, 바디 없음', '삭제 성공'],
            ['400 Bad Request', '요청이 잘못됨', '검증 실패, 필수 파라미터 누락, JSON 파싱 실패'],
            ['401 Unauthorized', '인증 안 됨', '로그인 안 함 / 토큰 만료'],
            ['403 Forbidden', '권한 없음', '로그인은 했지만 접근 권한 없음'],
            ['404 Not Found', '리소스 없음', '없는 id 조회'],
            ['409 Conflict', '상태 충돌', '중복 가입, 동시 수정 충돌'],
            ['500 Internal Server Error', '서버 오류', '처리 안 된 예외'],
          ],
        },
        {
          t: 'tip',
          text: '💡 실무에선 엔티티를 컨트롤러에서 그대로 반환하지 않고 요청/응답 DTO(record 추천)를 따로 둡니다. 엔티티를 그대로 내보내면 내부 필드가 노출되고, 양방향 연관관계에서 JSON 무한 순환이 생기고, 엔티티를 바꿀 때 API 스펙까지 깨집니다.',
        },
      ],
    },
    // ─────────────────────────────────────────────
    {
      id: 'l6-valid-exception-config',
      level: 6,
      title: '검증 · 예외 처리 · 설정 · 자동설정',
      summary: '@Valid, @RestControllerAdvice, application.yml 과 프로파일, Spring Boot 자동설정',
      blocks: [
        {
          t: 'p',
          text: '요청 값 검증은 Bean Validation 을 씁니다(spring-boot-starter-validation). DTO 필드에 @NotBlank, @Email 같은 제약을 달고 컨트롤러 파라미터에 @Valid 를 붙이면, 메서드 실행 전에 검증해서 실패 시 MethodArgumentNotValidException 을 던지고 기본적으로 400 Bad Request 가 응답됩니다. @Valid 를 빠뜨리면 제약 애너테이션은 아무 일도 하지 않아요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `public record CreateUserRequest(
        @NotBlank String name,               // null, "", "  " 모두 실패
        @Email @NotBlank String email,
        @Min(14) int age
) {}

@PostMapping
public UserResponse create(@Valid @RequestBody CreateUserRequest req) { ... }`,
        },
        {
          t: 'p',
          text: '예외 처리는 컨트롤러마다 try-catch 를 쓰지 않고 @RestControllerAdvice(= @ControllerAdvice + @ResponseBody) 클래스에 @ExceptionHandler 를 모아 전역으로 처리합니다. 예외 종류별로 상태코드와 일관된 에러 응답 형식을 정해두는 게 핵심이에요.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("USER_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().get(0).getDefaultMessage();
        return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_INPUT", msg));
    }
}`,
        },
        {
          t: 'p',
          text: '설정은 application.yml 에 둡니다. 환경별 값은 application-{profile}.yml 로 나누고 spring.profiles.active 로 활성화하면, 공통 파일(application.yml)을 먼저 읽고 프로파일 파일의 같은 키가 덮어씁니다. 운영 비밀번호 같은 값은 파일에 커밋하지 말고 환경 변수로 주입하세요.',
        },
        {
          t: 'code',
          lang: 'yaml',
          code: `# application.yml (공통)
server:
  port: 8080
spring:
  datasource:
    url: jdbc:h2:mem:testdb

---
# application-prod.yml (운영) — 실행 시: java -jar app.jar --spring.profiles.active=prod
server:
  port: 80
spring:
  datasource:
    url: jdbc:mysql://prod-db:3306/shop`,
        },
        {
          t: 'p',
          text: 'Spring Boot 자동설정(@EnableAutoConfiguration)은 "클래스패스에 어떤 라이브러리가 있고, 어떤 설정값이 있고, 사용자가 직접 등록한 빈이 있는지"를 조건(@ConditionalOnClass, @ConditionalOnMissingBean 등)으로 보고 필요한 빈을 대신 등록해줍니다. 예를 들어 spring-boot-starter-data-jpa 를 넣으면 DataSource, EntityManagerFactory, 트랜잭션 매니저가 자동으로 구성돼요. 직접 같은 타입 빈을 등록하면 자동설정은 물러납니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: JPA 스타터만 추가하고 DB 설정을 안 해서 "Failed to configure a DataSource: url attribute is not specified" 로 앱이 안 뜨는 것. 자동설정이 DataSource 를 만들려는데 URL 이 없고 내장 DB(H2)도 클래스패스에 없어서 생기는 에러입니다. spring.datasource.url 을 설정하거나 H2 의존성을 추가하세요. 디버깅할 땐 --debug 로 실행하면 어떤 자동설정이 적용/제외됐는지 리포트가 나옵니다.',
        },
      ],
    },
  ],

  questions: [
    {
      id: 'q6-01',
      level: 6,
      type: '개념',
      topic: '생성자 주입',
      prompt: '스프링이 필드 주입보다 생성자 주입을 권장하는 이유로 옳지 않은 것은?',
      choices: [
        '의존성을 final 로 선언해 불변으로 만들 수 있다',
        '리플렉션을 쓰지 않으므로 필드 주입보다 런타임 메서드 호출 속도가 크게 빨라진다',
        '스프링 컨테이너 없이도 new 로 객체를 만들어 단위 테스트하기 쉽다',
        '순환 참조를 애플리케이션 시작 시점에 발견할 수 있다',
      ],
      answer: 1,
      explain:
        '생성자 주입의 장점은 불변성, 테스트 용이성, 순환 참조 조기 발견, 의존성 누락 방지입니다. 주입은 애플리케이션 시작 시 한 번 일어날 뿐이라 런타임 메서드 호출 속도와는 관계가 없어요. 그래서 "성능이 크게 빨라진다"는 근거 없는 설명입니다.',
    },
    {
      id: 'q6-02',
      level: 6,
      type: '개념',
      topic: '빈 스코프',
      prompt: '스프링 빈의 기본 스코프와 그 특징으로 옳은 것은?',
      choices: [
        'prototype — 주입될 때마다 새 인스턴스가 만들어진다',
        'request — HTTP 요청마다 새 인스턴스가 만들어진다',
        'singleton — 스레드마다 하나씩 인스턴스가 만들어진다',
        'singleton — 컨테이너에 하나만 만들어져 모든 요청(스레드)이 같은 인스턴스를 공유한다',
      ],
      answer: 3,
      explain:
        '스프링 빈의 기본 스코프는 singleton 이며, 컨테이너당 인스턴스 하나를 모든 스레드가 공유합니다. 그래서 싱글톤 빈은 상태(가변 필드)를 갖지 않게 설계해야 해요. "스레드마다 하나"는 ThreadLocal 의 개념이지 singleton 스코프가 아닙니다.',
    },
    {
      id: 'q6-03',
      level: 6,
      type: '실무 상황',
      topic: '싱글톤 상태 공유',
      prompt:
        '주문 금액 계산 API 를 배포했더니, 트래픽이 몰리는 시간에만 "다른 사용자의 금액이 내 화면에 찍혔다"는 CS 가 들어옵니다. 로컬 테스트에선 재현되지 않습니다. 가장 유력한 원인은?',
      code: `@Service
public class PriceService {
    private int total;

    public int calc(List<Item> items) {
        total = 0;
        for (Item i : items) total += i.price();
        return total;
    }
}`,
      choices: [
        '싱글톤 빈의 필드 total 을 여러 요청 스레드가 동시에 공유해서 값이 섞인다',
        '@Service 대신 @Component 를 써야 한다',
        'List<Item> 이 불변 리스트라 계산 중 순서가 바뀐다',
        'int 대신 Integer 를 써야 null 안전하다',
      ],
      answer: 0,
      explain:
        'PriceService 는 싱글톤이라 모든 요청 스레드가 같은 total 필드를 씁니다. 동시 요청이 오면 한 스레드가 계산 중인 값을 다른 스레드가 덮어써 금액이 섞여요. total 을 메서드의 지역 변수로 바꾸면 해결되며, @Service 와 @Component 는 등록 방식상 차이가 없습니다.',
    },
    {
      id: 'q6-04',
      level: 6,
      type: '코드 출력',
      topic: '@Configuration',
      prompt: '다음 설정에서 a.getRepo() == b.getRepo() 의 결과는?',
      code: `@Configuration
public class AppConfig {
    @Bean public Repo repo() { return new Repo(); }
    @Bean public ServiceA a() { return new ServiceA(repo()); }
    @Bean public ServiceB b() { return new ServiceB(repo()); }
}`,
      choices: [
        'false — repo() 를 두 번 호출했으니 Repo 가 2개 만들어진다',
        '컴파일 에러 — @Bean 메서드끼리 직접 호출할 수 없다',
        'true — @Configuration 클래스는 CGLIB 프록시라 repo() 호출 시 컨테이너의 싱글톤 빈을 돌려준다',
        '실행할 때마다 다르다',
      ],
      answer: 2,
      explain:
        '@Configuration 클래스는 CGLIB 로 프록시가 만들어져, @Bean 메서드를 호출하면 이미 등록된 빈이 있으면 그걸 반환합니다. 그래서 Repo 는 1개이고 결과는 true 예요. @Configuration 없이 @Bean 만 쓰는 lite 모드라면 false 가 됩니다.',
    },
    {
      id: 'q6-05',
      level: 6,
      type: '개념',
      topic: 'AOP 프록시',
      prompt: '스프링 AOP 의 동작 방식으로 옳은 것은?',
      choices: [
        '런타임에 원본 빈 대신 프록시 객체를 빈으로 등록하고, 프록시가 메서드 호출을 가로채 부가 기능을 실행한다',
        '컴파일 시점에 바이트코드를 수정해 모든 메서드에 부가 기능을 끼워 넣는다',
        '필드 접근, 생성자 호출 등 모든 지점에 적용할 수 있다',
        'private 메서드에도 프록시가 적용된다',
      ],
      answer: 0,
      explain:
        '스프링 AOP 는 런타임 프록시 기반이라 호출이 프록시를 거쳐야 어드바이스가 실행되고, 조인 포인트는 "메서드 실행"으로 한정됩니다. 컴파일 시점 위빙이나 필드 접근 조인 포인트는 AspectJ 의 기능이에요. private 메서드는 프록시가 오버라이드할 수 없어 적용되지 않습니다.',
    },
    {
      id: 'q6-06',
      level: 6,
      type: '버그 찾기',
      topic: 'self-invocation',
      prompt: 'export() 를 호출했는데 build() 에 붙인 @LogTime 실행 시간 로그가 찍히지 않습니다. 원인은? (TimeAspect 는 정상 등록되어 있음)',
      code: `@Service
public class ReportService {
    public void export() {
        build();
    }

    @LogTime
    public void build() { /* ... */ }
}`,
      choices: [
        '@LogTime 은 public 메서드에 붙일 수 없다',
        '@Service 빈에는 AOP 가 적용되지 않는다',
        'build() 가 void 라서 @Around 가 반환값을 처리하지 못한다',
        'build() 를 같은 객체 내부에서 this 로 호출해 프록시를 거치지 않았다',
      ],
      answer: 3,
      explain:
        '스프링 AOP 는 프록시를 통해 들어온 호출에만 적용됩니다. export() 안의 build() 는 this.build() 로 원본 객체를 직접 부르기 때문에 어드바이스가 실행되지 않아요. build() 를 별도 빈으로 분리해 주입받아 호출하는 것이 정석적인 해결책입니다.',
    },
    {
      id: 'q6-07',
      level: 6,
      type: '개념',
      topic: 'DispatcherServlet',
      prompt: '@RestController 메서드가 반환한 UserResponse 객체를 JSON 문자열로 바꿔 응답 바디에 쓰는 것은?',
      choices: [
        'ViewResolver',
        'HttpMessageConverter (Jackson 기반)',
        'HandlerMapping',
        'DispatcherServlet 이 toString() 을 호출한다',
      ],
      answer: 1,
      explain:
        '@ResponseBody(@RestController 포함)의 반환값은 HttpMessageConverter 가 처리하며, JSON 은 Jackson 기반 컨버터가 직렬화합니다. ViewResolver 는 뷰 이름을 템플릿으로 바꿀 때 쓰이고, HandlerMapping 은 어떤 메서드가 요청을 처리할지 찾는 역할이에요.',
    },
    {
      id: 'q6-08',
      level: 6,
      type: '빈칸 채우기',
      topic: '@PathVariable',
      prompt: 'GET /users/7 요청에서 7 을 id 로 받으려고 합니다. 빈칸에 들어갈 애너테이션은?',
      code: `@GetMapping("/users/{id}")
public UserResponse get(@____ Long id) {
    return userService.get(id);
}`,
      choices: ['RequestParam', 'RequestBody', 'PathVariable', 'ModelAttribute'],
      answer: 2,
      explain:
        'URL 경로의 {id} 부분은 @PathVariable 로 받습니다. @RequestParam 은 ?id=7 같은 쿼리 스트링 값을, @RequestBody 는 HTTP 바디(JSON)를 객체로 받을 때 써요.',
    },
    {
      id: 'q6-09',
      level: 6,
      type: '빈칸 채우기',
      topic: '@RequestBody',
      prompt: 'JSON 바디로 회원 가입 요청을 받으려 합니다. 빈칸에 들어갈 애너테이션은?',
      code: `@PostMapping("/users")
public ResponseEntity<UserResponse> create(@Valid @____ CreateUserRequest req) {
    ...
}`,
      choices: ['RequestBody', 'ResponseBody', 'RequestParam', 'PathVariable'],
      answer: 0,
      explain:
        'HTTP 바디의 JSON 을 객체로 변환(역직렬화)하려면 @RequestBody 가 필요합니다. 생략하면 @ModelAttribute 처럼 요청 파라미터로 바인딩을 시도해 JSON 필드가 채워지지 않아요. @ResponseBody 는 반환값을 응답 바디로 쓸 때 쓰는 애너테이션입니다.',
    },
    {
      id: 'q6-10',
      level: 6,
      type: '코드 출력',
      topic: 'ResponseEntity',
      prompt: '다음 메서드가 정상 처리되면 클라이언트가 받는 HTTP 상태코드는?',
      code: `@PostMapping("/users")
public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest req) {
    UserResponse saved = userService.create(req);
    return ResponseEntity
            .created(URI.create("/users/" + saved.id()))
            .body(saved);
}`,
      choices: ['200 OK', '204 No Content', '202 Accepted', '201 Created (Location 헤더 포함)'],
      answer: 3,
      explain:
        'ResponseEntity.created(uri) 는 201 Created 상태와 Location 헤더를 설정합니다. 리소스 생성 성공에는 201 이 REST 관례에 맞아요. 204 는 바디가 없는 성공(주로 삭제)에, 202 는 비동기로 접수만 했을 때 씁니다.',
    },
    {
      id: 'q6-11',
      level: 6,
      type: '버그 찾기',
      topic: '@Valid',
      prompt: 'DTO 에 @NotBlank 를 달았는데 name 이 빈 문자열("")인 요청도 그대로 저장됩니다. spring-boot-starter-validation 은 추가되어 있습니다. 원인은?',
      code: `public record CreateUserRequest(@NotBlank String name, @Email String email) {}

@PostMapping("/users")
public UserResponse create(@RequestBody CreateUserRequest req) {
    return userService.create(req);
}`,
      choices: [
        'record 에는 Bean Validation 애너테이션을 쓸 수 없다',
        '컨트롤러 파라미터에 @Valid(또는 @Validated)가 없어 검증이 실행되지 않는다',
        '@NotBlank 는 null 만 막고 빈 문자열은 허용한다',
        '@RequestBody 대신 @RequestParam 을 써야 검증된다',
      ],
      answer: 1,
      explain:
        '제약 애너테이션은 선언일 뿐이고, 컨트롤러 파라미터에 @Valid 를 붙여야 실제 검증이 실행됩니다. @NotBlank 는 null, 빈 문자열, 공백 문자열을 모두 거부하며(빈 문자열을 허용하는 건 @NotNull), record 컴포넌트에도 정상적으로 사용할 수 있어요.',
    },
    {
      id: 'q6-12',
      level: 6,
      type: '코드 출력',
      topic: '@RequestParam',
      prompt: '아래 컨트롤러에 GET /search 요청(쿼리 스트링 없음)을 보내면? (별도 예외 처리 없음)',
      code: `@GetMapping("/search")
public List<ItemResponse> search(@RequestParam String keyword) {
    return itemService.search(keyword);
}`,
      choices: [
        '200 OK — keyword 에 null 이 들어가 전체 목록 반환',
        '200 OK — keyword 에 빈 문자열이 들어감',
        '400 Bad Request — 필수 파라미터 누락',
        '404 Not Found — 매핑되는 핸들러가 없음',
      ],
      answer: 2,
      explain:
        '@RequestParam 은 기본이 required = true 라서 값이 없으면 MissingServletRequestParameterException 이 발생하고 400 Bad Request 가 응답됩니다. 선택값으로 만들려면 required = false 나 defaultValue 를 지정하세요. URL 경로는 매핑되므로 404 가 아닙니다.',
    },
    {
      id: 'q6-13',
      level: 6,
      type: '개념',
      topic: '@RestControllerAdvice',
      prompt: '@RestControllerAdvice 에 대한 설명으로 옳은 것은?',
      choices: [
        '컨트롤러 메서드 실행 전에 요청 바디를 검증하는 필터다',
        '각 컨트롤러 클래스 안에서만 동작하는 지역 예외 처리기다',
        'HTTP 요청을 가장 먼저 받는 프론트 컨트롤러다',
        '@ControllerAdvice + @ResponseBody 로, 여러 컨트롤러에서 발생한 예외를 @ExceptionHandler 로 전역 처리하고 응답을 바디(JSON)로 쓴다',
      ],
      answer: 3,
      explain:
        '@RestControllerAdvice 는 @ControllerAdvice 에 @ResponseBody 를 더한 것으로, 전역 예외 처리와 일관된 JSON 에러 응답을 만드는 데 씁니다. 컨트롤러 클래스 안에 @ExceptionHandler 를 두면 그 컨트롤러에만 적용되는 지역 처리가 돼요. 요청을 가장 먼저 받는 건 DispatcherServlet 입니다.',
    },
    {
      id: 'q6-14',
      level: 6,
      type: '실무 상황',
      topic: '프로파일',
      prompt:
        '운영 서버에 배포했더니 애플리케이션이 운영 MySQL 이 아닌 jdbc:h2:mem:testdb 로 붙었습니다. application.yml(H2 설정)과 application-prod.yml(MySQL 설정)은 둘 다 jar 안에 정상적으로 들어 있습니다. 가장 유력한 원인은?',
      choices: [
        '실행 시 spring.profiles.active=prod 를 지정하지 않아 공통 설정(application.yml)만 적용됐다',
        'application-prod.yml 이 application.yml 보다 우선순위가 낮다',
        'yml 파일은 운영 환경에서 읽히지 않으므로 properties 로 바꿔야 한다',
        'MySQL 드라이버는 자동설정이 지원되지 않는다',
      ],
      answer: 0,
      explain:
        '프로파일별 파일은 해당 프로파일이 활성화되어야 읽힙니다. --spring.profiles.active=prod(또는 SPRING_PROFILES_ACTIVE 환경 변수)가 빠지면 application.yml 만 적용돼요. 활성화되면 프로파일 파일의 값이 공통 파일을 덮어쓰므로 우선순위가 낮다는 설명도 틀립니다.',
    },
    {
      id: 'q6-15',
      level: 6,
      type: '실무 상황',
      topic: '자동설정',
      prompt:
        'build.gradle 에 spring-boot-starter-data-jpa 만 추가했더니 애플리케이션이 "Failed to configure a DataSource: \'url\' attribute is not specified and no embedded datasource could be configured." 로 뜨지 않습니다. 이유와 조치로 옳은 것은?',
      choices: [
        'JPA 를 쓰려면 @EnableJpa 를 메인 클래스에 반드시 붙여야 한다',
        '@Entity 클래스가 하나도 없어서 발생한다 — 엔티티를 추가한다',
        '자동설정이 DataSource 를 구성하려 했지만 URL 설정도, 내장 DB(H2 등) 의존성도 없다 — spring.datasource.url 을 설정하거나 H2 를 추가한다',
        '스타터 버전이 Spring Boot 버전과 달라서다 — 버전을 직접 명시한다',
      ],
      answer: 2,
      explain:
        'JPA 스타터가 클래스패스에 있으면 자동설정이 DataSource 를 만들려고 하는데, 접속 URL 도 없고 대체할 내장 DB 도 없으면 이 에러가 납니다. spring.datasource.url 등을 설정하거나 H2 의존성을 추가하면 해결돼요. 엔티티가 없어도 이 에러와는 무관하고, @EnableJpa 같은 필수 애너테이션은 없습니다.',
    },
    {
      id: 'q6-16',
      level: 6,
      type: 'OX',
      topic: '컴포넌트 스캔',
      prompt: '@Component 가 붙은 클래스는 패키지 위치와 상관없이 항상 스프링 빈으로 등록된다. (@SpringBootApplication 기본 설정 기준)',
      choices: ['O', 'X'],
      answer: 1,
      explain:
        '@SpringBootApplication 의 @ComponentScan 은 기본적으로 그 클래스가 있는 패키지와 하위 패키지만 스캔합니다. 메인 클래스보다 바깥 패키지에 둔 @Component 는 등록되지 않아 "빈을 찾을 수 없다" 에러가 나요. 그래서 메인 클래스는 최상위 패키지에 둡니다.',
    },
    {
      id: 'q6-17',
      level: 6,
      type: 'OX',
      topic: '@RestController',
      prompt: '@RestController 는 @Controller 와 @ResponseBody 를 합친 애너테이션이다.',
      choices: ['O', 'X'],
      answer: 0,
      explain:
        '@RestController 는 @Controller 에 @ResponseBody 가 메타 애너테이션으로 붙어 있어, 모든 메서드의 반환값이 뷰 이름이 아니라 응답 바디(주로 JSON)로 쓰입니다. 그래서 메서드마다 @ResponseBody 를 붙일 필요가 없어요.',
    },
    {
      id: 'q6-18',
      level: 6,
      type: '개념',
      topic: 'HTTP 상태코드',
      prompt: '로그인은 정상적으로 한 일반 사용자가 관리자 전용 API 를 호출했습니다. 가장 적절한 응답 상태코드는?',
      choices: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '400 Bad Request'],
      answer: 1,
      explain:
        '401 은 "인증이 안 됨(누군지 모름)", 403 은 "인증은 됐지만 권한이 없음"입니다. 이 경우 사용자가 누군지는 알지만 권한이 없으므로 403 이 맞아요. 이름 때문에 401 을 고르기 쉽지만 401 은 로그인 안 함·토큰 만료 상황에 씁니다.',
    },
  ],
};

export default content;
