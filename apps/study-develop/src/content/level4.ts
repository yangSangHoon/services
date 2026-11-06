import type { LevelContent } from './types';

/**
 * 레벨 4 — 데이터 탐험가: SQL과 DB 기초
 * 예제는 실습 DB(seed.sql, '자바커피 주식회사')의 테이블을 사용한다.
 */
const content: LevelContent = {
  level: 4,
  lessons: [
    // ───────────────────────── 레슨 1 ─────────────────────────
    {
      id: 'l4-rdb-select',
      level: 4,
      title: '관계형 DB와 SELECT 기본기',
      summary: '테이블·PK·FK 개념과 SELECT / WHERE / ORDER BY / LIMIT 로 원하는 행 꺼내기',
      blocks: [
        {
          t: 'p',
          text: '관계형 데이터베이스(RDB)는 데이터를 행(row)과 열(column)로 이루어진 테이블에 저장하고, 테이블끼리는 "키"로 관계를 맺습니다. 우리 회사 \'자바커피 주식회사\' DB에는 departments(부서), employees(직원), projects(프로젝트), assignments(배정), customers(고객), orders(주문) 테이블이 있습니다.',
        },
        {
          t: 'table',
          head: ['용어', '뜻', '자바커피 DB 예시'],
          rows: [
            ['PK (기본 키)', '행을 유일하게 식별하는 값. NULL·중복 불가', 'employees.id'],
            ['FK (외래 키)', '다른 테이블의 PK 를 가리키는 값', 'employees.dept_id → departments.id'],
            ['복합 키', '두 개 이상 컬럼을 묶은 PK', 'assignments (emp_id, project_id)'],
            ['NULL', '값이 "없음/모름". 0 이나 빈 문자열과 다르다', '부서 없는 홍길동의 dept_id'],
          ],
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- 개발팀(dept_id = 1) 직원의 이름과 연봉을 연봉 높은 순으로 3명만
SELECT name, salary
FROM employees
WHERE dept_id = 1
ORDER BY salary DESC
LIMIT 3;`,
        },
        {
          t: 'list',
          items: [
            'SELECT: 가져올 컬럼 (SELECT * 는 전부)',
            'FROM: 대상 테이블',
            "WHERE: 행 필터 — =, <>, >, BETWEEN a AND b, IN (...), LIKE '김%', IS NULL",
            'ORDER BY: 정렬 (ASC 기본, DESC 내림차순). 여러 개면 앞 기준이 같을 때 다음 기준 적용',
            'LIMIT n (OFFSET m): 앞에서 n 개만 (m 개 건너뛰고)',
          ],
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- 서울 또는 부산 고객 중 VIP·골드 등급만
SELECT name, city, grade
FROM customers
WHERE city IN ('서울', '부산')
  AND grade <> '일반'
ORDER BY joined_at;`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 SELECT * 를 지양합니다. 필요 없는 컬럼까지 네트워크로 보내고, 나중에 컬럼이 추가되면 애플리케이션 매핑이 깨질 수 있어요. 필요한 컬럼만 명시하세요.',
        },
        {
          t: 'tip',
          text: "⚠️ 자주 하는 실수: ORDER BY 없이 LIMIT 만 쓰면 '아무' n 개가 나옵니다. DB 는 정렬을 요구받지 않으면 행 순서를 보장하지 않아요.",
        },
      ],
    },

    // ───────────────────────── 레슨 2 ─────────────────────────
    {
      id: 'l4-aggregate-groupby',
      level: 4,
      title: '집계 함수, GROUP BY 와 HAVING',
      summary: 'COUNT·SUM·AVG 로 요약하고, WHERE 와 HAVING 의 차이를 SQL 실행 순서로 이해하기',
      blocks: [
        {
          t: 'p',
          text: '집계 함수(COUNT, SUM, AVG, MAX, MIN)는 여러 행을 하나의 값으로 요약합니다. GROUP BY 를 붙이면 "그룹마다" 하나의 요약 행이 나옵니다.',
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- 부서별 인원 수와 평균 연봉 (평균 연봉 6000 초과 부서만)
SELECT dept_id, COUNT(*) AS cnt, ROUND(AVG(salary)) AS avg_salary
FROM employees
WHERE dept_id IS NOT NULL      -- ① 행을 먼저 거른다
GROUP BY dept_id               -- ② 남은 행을 묶는다
HAVING AVG(salary) > 6000      -- ③ 묶은 그룹을 거른다
ORDER BY avg_salary DESC;      -- ④ 정렬`,
        },
        {
          t: 'p',
          text: 'SQL 은 작성 순서와 실행 순서가 다릅니다. 이 순서를 알면 "왜 WHERE 에 집계 함수를 못 쓰는지", "왜 ORDER BY 에서는 SELECT 별칭을 쓸 수 있는지"가 한 번에 이해됩니다.',
        },
        {
          t: 'table',
          head: ['실행 순서', '절', '하는 일'],
          rows: [
            ['1', 'FROM / JOIN', '대상 테이블 준비'],
            ['2', 'WHERE', '개별 행 필터 (집계 함수 사용 불가)'],
            ['3', 'GROUP BY', '그룹으로 묶기'],
            ['4', 'HAVING', '그룹 필터 (집계 함수 사용 가능)'],
            ['5', 'SELECT', '컬럼 계산·별칭 부여'],
            ['6', 'ORDER BY', '정렬 (SELECT 별칭 사용 가능)'],
            ['7', 'LIMIT', '개수 자르기'],
          ],
        },
        {
          t: 'list',
          items: [
            'WHERE: "어떤 행을 계산에 넣을까?" — 예: 완료된 주문만',
            'HAVING: "어떤 그룹을 결과에 남길까?" — 예: 합계 10만 원 이상인 고객만',
            'GROUP BY 를 쓰면 SELECT 에는 그룹 기준 컬럼과 집계 함수만 두는 것이 원칙',
          ],
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: WHERE SUM(amount) > 100000 처럼 WHERE 에 집계 함수를 쓰면 에러입니다. WHERE 는 GROUP BY 보다 먼저 실행되어 아직 그룹이 없거든요. 그룹 조건은 HAVING 으로!',
        },
        {
          t: 'tip',
          text: '💡 실무에선 HAVING 에 넣을 수 있는 조건이라도 행 단위 조건이면 WHERE 로 옮기세요. 미리 행을 줄여야 묶고 계산할 양이 줄어 빠릅니다.',
        },
      ],
    },

    // ───────────────────────── 레슨 3 ─────────────────────────
    {
      id: 'l4-join-subquery-null',
      level: 4,
      title: 'JOIN, 서브쿼리, 그리고 NULL',
      summary: 'INNER/LEFT/셀프 조인과 서브쿼리, NULL 이 만드는 함정(IS NULL, COUNT, COALESCE)',
      blocks: [
        {
          t: 'p',
          text: 'JOIN 은 FK 로 연결된 테이블을 옆으로 붙입니다. INNER JOIN 은 양쪽에 짝이 있는 행만, LEFT JOIN 은 왼쪽 테이블의 모든 행을 남기고 짝이 없으면 오른쪽 컬럼을 NULL 로 채웁니다.',
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- INNER JOIN: 부서 없는 직원(김대표, 홍길동)은 빠진다 → 14행
SELECT e.name, d.name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- LEFT JOIN: 주문 없는 고객(식당F)도 남는다
SELECT c.name, COUNT(o.id) AS order_cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;`,
        },
        {
          t: 'code',
          lang: 'sql',
          code: `-- 셀프 조인: 같은 테이블을 별칭 두 개로 → 직원과 상사
SELECT e.name AS 직원, m.name AS 상사
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- 서브쿼리: 전사 평균보다 많이 받는 직원
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`,
        },
        {
          t: 'table',
          head: ['상황', '틀린 방법', '올바른 방법'],
          rows: [
            ['NULL 인 행 찾기', 'WHERE dept_id = NULL (항상 0행)', 'WHERE dept_id IS NULL'],
            ['행 개수 세기', 'COUNT(dept_id) — NULL 제외', 'COUNT(*) — 모든 행'],
            ['LEFT JOIN 후 짝 개수', 'COUNT(*) — 짝 없어도 1', 'COUNT(o.id) — 짝 없으면 0'],
            ['NULL 을 기본값으로', '애플리케이션에서 if 처리', "COALESCE(dept_id, 0), COALESCE(SUM(x), 0)"],
          ],
        },
        {
          t: 'p',
          text: 'NULL 은 "모르는 값"이라 어떤 값과 = 로 비교해도 참이 아닌 UNKNOWN 이 됩니다. NULL = NULL 도 참이 아닙니다. 그래서 반드시 IS NULL / IS NOT NULL 로 비교해야 합니다.',
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: LEFT JOIN 을 해놓고 WHERE o.status = \'완료\' 를 걸면, 주문 없는 고객(오른쪽이 NULL)이 WHERE 에서 걸러져 결국 INNER JOIN 과 같아집니다. 오른쪽 테이블 조건은 ON 절에 넣으세요: LEFT JOIN orders o ON o.customer_id = c.id AND o.status = \'완료\'',
        },
        {
          t: 'tip',
          text: '💡 실무에선 1:N 테이블 여러 개를 한 번에 JOIN 해서 SUM/COUNT 하면 행이 곱해져 숫자가 부풀어요(조인 팬아웃). 지표별로 먼저 집계한 뒤 조인하거나 서브쿼리로 따로 계산하세요.',
        },
      ],
    },

    // ───────────────────────── 레슨 4 ─────────────────────────
    {
      id: 'l4-dml-index-tx',
      level: 4,
      title: '데이터 변경, 인덱스, 트랜잭션',
      summary: 'INSERT/UPDATE/DELETE, B-Tree 인덱스가 안 타는 경우, ACID 와 COMMIT/ROLLBACK',
      blocks: [
        {
          t: 'code',
          lang: 'sql',
          code: `INSERT INTO customers (id, name, city, grade, joined_at)
VALUES (8, '서점H', '인천', '일반', '2024-10-01');

UPDATE employees SET salary = salary + 300 WHERE id = 4;  -- 최스프링만 인상

DELETE FROM orders WHERE status = '취소';`,
        },
        {
          t: 'tip',
          text: '⚠️ 자주 하는 실수: UPDATE employees SET salary = 0; — WHERE 를 빼먹으면 전 직원 연봉이 0 이 됩니다. 실행 전 같은 WHERE 로 SELECT 해서 대상 행 수를 먼저 확인하고, 트랜잭션 안에서 실행하는 습관을 들이세요.',
        },
        {
          t: 'p',
          text: '인덱스는 책 뒤의 "찾아보기"처럼, 컬럼 값을 정렬된 구조(대부분 B-Tree)로 따로 저장해 전체 테이블을 훑지 않고(Full Scan) 원하는 행을 빠르게 찾게 해줍니다. 대신 INSERT/UPDATE/DELETE 때마다 인덱스도 갱신해야 하므로 쓰기는 느려지고 저장 공간도 더 듭니다.',
        },
        {
          t: 'code',
          lang: 'sql',
          code: `CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_emp_dept_salary ON employees (dept_id, salary); -- 복합 인덱스`,
        },
        {
          t: 'table',
          head: ['인덱스를 못 타는 대표 패턴', '이유 / 대안'],
          rows: [
            ["WHERE name LIKE '%커피'", '앞부분이 정해지지 않아 정렬된 트리를 탈 수 없음 → \'커피%\' 는 OK'],
            ["WHERE SUBSTR(hire_date, 1, 4) = '2021'", "컬럼을 함수로 가공 → hire_date >= '2021-01-01' AND hire_date < '2022-01-01'"],
            ['WHERE salary * 12 > 60000', '컬럼에 연산 → salary > 5000 으로 바꿔 쓰기'],
            ['복합 인덱스 (dept_id, salary) 에서 WHERE salary > 5000 만', '선두 컬럼(dept_id) 조건이 없음'],
            ['카디널리티 낮은 컬럼 (성별, Y/N)', '걸러지는 양이 적어 옵티마이저가 Full Scan 선택'],
          ],
        },
        {
          t: 'p',
          text: '트랜잭션은 "모두 성공하거나 모두 실패해야 하는" 작업 묶음입니다. 계좌 이체에서 출금만 되고 입금이 실패하면 안 되죠. BEGIN 으로 시작해 COMMIT 으로 확정하거나 ROLLBACK 으로 되돌립니다.',
        },
        {
          t: 'table',
          head: ['ACID', '의미'],
          rows: [
            ['Atomicity (원자성)', '전부 반영 또는 전부 취소 — 중간 상태 없음'],
            ['Consistency (일관성)', '제약 조건(PK, FK, NOT NULL 등)을 항상 만족'],
            ['Isolation (격리성)', '동시에 실행되는 트랜잭션이 서로 간섭하지 않음'],
            ['Durability (지속성)', 'COMMIT 된 데이터는 장애가 나도 유지'],
          ],
        },
        {
          t: 'code',
          lang: 'sql',
          code: `BEGIN;
UPDATE employees SET salary = salary - 500 WHERE id = 3;
UPDATE employees SET salary = salary + 500 WHERE id = 4;
-- 문제가 생기면 ROLLBACK; 둘 다 취소
COMMIT;`,
        },
        {
          t: 'tip',
          text: '💡 실무에선 Spring 의 @Transactional 이 이 BEGIN/COMMIT/ROLLBACK 을 대신 해줍니다. 기본적으로 RuntimeException 이 나면 롤백되고, 체크 예외는 롤백되지 않는다는 점을 기억하세요.',
        },
      ],
    },

    // ───────────────────────── 레슨 5 ─────────────────────────
    {
      id: 'l4-normalization-jdbc',
      level: 4,
      title: '정규화 맛보기와 JDBC·SQL Injection',
      summary: '1~3NF 로 중복을 없애는 법, 자바에서 PreparedStatement 로 안전하게 SQL 실행하기',
      blocks: [
        {
          t: 'p',
          text: '정규화는 데이터 중복을 줄여 "한 곳만 고치면 되는" 구조로 테이블을 나누는 과정입니다. 중복이 있으면 수정할 때 일부만 바뀌는 갱신 이상(anomaly)이 생깁니다.',
        },
        {
          t: 'table',
          head: ['정규형', '규칙', '위반 예'],
          rows: [
            ['1NF', '모든 컬럼 값이 원자값(하나의 값)', "projects 컬럼에 '주문 시스템,사내 메신저' 처럼 여러 값"],
            ['2NF', '1NF + 복합 키의 일부에만 종속된 컬럼 없음', 'assignments(emp_id, project_id) 에 직원 이름(emp_id 에만 종속)'],
            ['3NF', '2NF + 키가 아닌 컬럼에 종속된 컬럼 없음(이행 종속 제거)', 'employees 에 dept_id 와 함께 부서명·층(dept_id 에 종속)'],
          ],
        },
        {
          t: 'p',
          text: '자바커피 DB 가 부서명을 employees 에 넣지 않고 departments 로 분리해 dept_id(FK)로만 연결한 것이 바로 3NF 의 예입니다. 부서명이 바뀌어도 departments 한 행만 고치면 됩니다.',
        },
        {
          t: 'tip',
          text: '💡 실무에선 조회 성능 때문에 일부러 중복을 허용하는 반정규화(denormalization)도 합니다. 단, "정규화를 알고 깨는 것"과 "몰라서 중복된 것"은 완전히 다릅니다.',
        },
        {
          t: 'p',
          text: 'JDBC 는 자바에서 DB 에 SQL 을 보내는 표준 API 입니다. 사용자 입력을 SQL 문자열에 그대로 이어 붙이면 SQL Injection 공격에 뚫립니다.',
        },
        {
          t: 'code',
          lang: 'java',
          code: `// ❌ 위험: 입력이  ' OR '1'='1  이면 모든 고객이 조회된다
String sql = "SELECT * FROM customers WHERE name = '" + name + "'";
Statement st = conn.createStatement();
ResultSet rs = st.executeQuery(sql);

// ✅ 안전: ? 자리표시자 + 바인딩
String sql2 = "SELECT id, name, grade FROM customers WHERE name = ?";
try (PreparedStatement ps = conn.prepareStatement(sql2)) {
    ps.setString(1, name);              // 1번째 ? 에 값 바인딩 (1부터 시작!)
    try (ResultSet rs2 = ps.executeQuery()) {
        while (rs2.next()) {
            System.out.println(rs2.getString("name"));
        }
    }
}`,
        },
        {
          t: 'list',
          items: [
            'PreparedStatement 는 SQL 구조와 값을 분리해서 보내므로, 값 안의 따옴표가 SQL 문법으로 해석되지 않음',
            '같은 SQL 을 재사용하면 DB 가 실행 계획을 캐시할 수 있어 성능에도 유리',
            '바인딩 인덱스는 0 이 아니라 1 부터 시작',
            'try-with-resources 로 Connection/Statement/ResultSet 을 반드시 닫기 (커넥션 누수 방지)',
            '테이블명·컬럼명·ORDER BY 방향은 ? 로 바인딩할 수 없음 → 화이트리스트로 검증',
          ],
        },
        {
          t: 'tip',
          text: "⚠️ 자주 하는 실수: MyBatis 에서 #{name} 대신 '$' 기호로 시작하는 문자열 치환(예: ORDER BY 에 쓰는 치환 문법)을 사용자 입력에 쓰면 PreparedStatement 를 써도 Injection 이 그대로 열립니다. 치환 문법은 화이트리스트 검증된 값에만!",
        },
      ],
    },
  ],

  questions: [
    // ───────── SQL (7) ─────────
    {
      id: 'q4-01',
      level: 4,
      type: 'SQL',
      topic: 'COUNT와 NULL',
      prompt: '자바커피 DB(직원 16명, 그중 2명은 dept_id 가 NULL)에서 아래 쿼리의 결과는?',
      code: `SELECT COUNT(*), COUNT(dept_id)
FROM employees;`,
      codeLang: 'sql',
      choices: ['16 | 16', '14 | 14', '16 | 14', '14 | 16'],
      answer: 2,
      explain:
        'COUNT(*) 는 NULL 여부와 상관없이 행 수를 세므로 16, COUNT(dept_id) 는 dept_id 가 NULL 인 김대표·홍길동을 빼고 세므로 14입니다. "컬럼을 지정한 COUNT 는 NULL 을 세지 않는다"가 핵심입니다.',
    },
    {
      id: 'q4-02',
      level: 4,
      type: '실무 상황',
      topic: 'SQL Injection',
      prompt:
        "보안 점검에서 고객 검색 API 에 이름으로 ' OR '1'='1 을 넣었더니 전체 고객 목록이 반환됐다는 리포트가 왔습니다. 코드는 아래와 같습니다. 가장 올바른 조치는?",
      code: `String sql = "SELECT id, name, grade FROM customers WHERE name = '" + name + "'";
ResultSet rs = conn.createStatement().executeQuery(sql);`,
      codeLang: 'java',
      choices: [
        'PreparedStatement 로 바꾸고 WHERE name = ? 에 ps.setString(1, name) 으로 바인딩한다',
        "name 에서 작은따옴표(')만 replace 로 지운다",
        '프론트엔드에서 특수문자 입력을 막는다',
        'DB 계정 비밀번호를 더 복잡하게 바꾼다',
      ],
      answer: 0,
      explain:
        '문자열 이어붙이기로 만든 SQL 은 입력값이 SQL 문법의 일부로 해석되어 조건이 OR 1=1 로 바뀝니다. PreparedStatement 는 SQL 구조와 값을 분리해 전달하므로 입력이 항상 "값"으로만 취급됩니다. 따옴표 제거나 프론트 검증은 우회가 쉬워 근본 대책이 아닙니다.',
    },
    {
      id: 'q4-03',
      level: 4,
      type: 'SQL',
      topic: 'LEFT JOIN과 COUNT',
      prompt: "식당F 는 주문이 한 건도 없는 고객입니다. 아래 쿼리에서 식당F 행의 cnt 값은?",
      code: `SELECT c.name, COUNT(*) AS cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;`,
      codeLang: 'sql',
      choices: ['0', '1', 'NULL', '식당F 는 결과에 나오지 않는다'],
      answer: 1,
      explain:
        'LEFT JOIN 은 짝이 없는 식당F 를 오른쪽 컬럼이 NULL 인 행 1개로 남깁니다. COUNT(*) 는 그 행도 세므로 1이 됩니다. 주문 건수를 제대로 세려면 COUNT(o.id) 를 써야 NULL 이 제외되어 0이 나옵니다.',
    },
    {
      id: 'q4-04',
      level: 4,
      type: 'SQL',
      topic: 'IS NULL',
      prompt: '부서가 배정되지 않은 직원(dept_id 가 NULL)을 올바르게 조회하는 쿼리는?',
      choices: [
        'SELECT name FROM employees WHERE dept_id = NULL;',
        "SELECT name FROM employees WHERE dept_id = '';",
        'SELECT name FROM employees WHERE dept_id = 0;',
        'SELECT name FROM employees WHERE dept_id IS NULL;',
      ],
      answer: 3,
      explain:
        'NULL 은 "알 수 없는 값"이라 = NULL 비교는 참이 아닌 UNKNOWN 이 되어 항상 0행입니다. 빈 문자열이나 0 은 NULL 과 다른 값이므로 IS NULL 만이 정답입니다.',
    },
    {
      id: 'q4-05',
      level: 4,
      type: 'SQL',
      topic: 'GROUP BY / HAVING',
      prompt: '고객 도시 분포는 서울 3, 부산 2, 대전 1, 광주 1 입니다. 아래 쿼리 결과의 행 수는?',
      code: `SELECT city, COUNT(*)
FROM customers
GROUP BY city
HAVING COUNT(*) >= 2;`,
      codeLang: 'sql',
      choices: ['1행', '4행', '2행', '7행'],
      answer: 2,
      explain:
        'GROUP BY city 로 도시마다 한 그룹(4개)이 만들어지고, HAVING COUNT(*) >= 2 가 그룹을 걸러 서울(3)·부산(2) 두 행만 남습니다. 행이 아닌 그룹을 거르는 것이 HAVING 입니다.',
    },
    {
      id: 'q4-06',
      level: 4,
      type: 'SQL',
      topic: 'LEFT JOIN 행 수',
      prompt: '고객 7명, 주문 13건이고 모든 주문은 존재하는 고객의 것입니다. 주문이 없는 고객은 식당F 1명뿐일 때, 아래 쿼리 결과는?',
      code: `SELECT COUNT(*)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;`,
      codeLang: 'sql',
      choices: ['7', '14', '13', '20'],
      answer: 1,
      explain:
        '주문이 있는 고객은 주문 수만큼 행이 생겨 13행, 주문이 없는 식당F 는 NULL 로 채워진 1행이 추가되어 총 14행입니다. INNER JOIN 이었다면 식당F 가 빠져 13행이 됩니다.',
    },
    {
      id: 'q4-07',
      level: 4,
      type: 'SQL',
      topic: '서브쿼리 IN',
      prompt:
        'VIP 고객은 스타트업A(주문 120000, 80000, 25000)와 병원D(주문 300000, 150000, 45000)입니다. 아래 쿼리의 결과는?',
      code: `SELECT SUM(amount)
FROM orders
WHERE customer_id IN (
  SELECT id FROM customers WHERE grade = 'VIP'
);`,
      codeLang: 'sql',
      choices: ['720000', '450000', '225000', '에러 — IN 안에는 서브쿼리를 쓸 수 없다'],
      answer: 0,
      explain:
        '서브쿼리가 VIP 고객 id 목록(1, 4)을 돌려주고, 바깥 쿼리는 그 고객들의 주문을 모두 더합니다. 상태 조건이 없으므로 배송중 주문까지 포함해 225000 + 495000 = 720000 입니다.',
    },

    // ───────── 개념 (5) ─────────
    {
      id: 'q4-08',
      level: 4,
      type: '개념',
      topic: 'SQL 실행 순서',
      prompt: 'SELECT 문의 논리적 실행 순서로 올바른 것은?',
      choices: [
        'SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY',
        'FROM → WHERE → SELECT → GROUP BY → HAVING → ORDER BY',
        'FROM → GROUP BY → WHERE → HAVING → SELECT → ORDER BY',
        'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
      ],
      answer: 3,
      explain:
        '테이블을 준비(FROM)하고 행을 거른(WHERE) 뒤 묶고(GROUP BY) 그룹을 거르고(HAVING), 그다음에 SELECT 로 컬럼을 계산해 마지막에 정렬합니다. 그래서 WHERE 에선 집계 함수와 SELECT 별칭을 못 쓰고, ORDER BY 에선 별칭을 쓸 수 있습니다.',
    },
    {
      id: 'q4-09',
      level: 4,
      type: '개념',
      topic: 'PK와 FK',
      prompt: 'employees.dept_id 가 departments.id 를 참조하는 외래 키(FK)일 때 옳은 설명은?',
      choices: [
        'dept_id 는 employees 안에서 중복될 수 없다',
        'dept_id 에는 departments.id 에 존재하는 값(또는 NULL)만 들어갈 수 있다',
        'FK 를 걸면 자동으로 dept_id 에 PK 제약도 생긴다',
        'departments 의 행은 참조 여부와 상관없이 언제든 삭제할 수 있다',
      ],
      answer: 1,
      explain:
        'FK 는 참조 무결성 제약으로, 부모 테이블에 없는 값을 넣지 못하게 막습니다(NULL 은 허용 가능). 여러 직원이 같은 부서에 속하므로 FK 값은 중복될 수 있고, 참조 중인 부모 행은 기본적으로 삭제가 막힙니다.',
    },
    {
      id: 'q4-10',
      level: 4,
      type: '개념',
      topic: '인덱스',
      prompt: 'orders.ordered_at 에 B-Tree 인덱스가 있을 때, 인덱스를 효율적으로 사용하기 어려운 조건은?',
      choices: [
        "WHERE ordered_at >= '2024-03-01'",
        "WHERE ordered_at BETWEEN '2024-03-01' AND '2024-03-31'",
        "WHERE SUBSTR(ordered_at, 1, 7) = '2024-03'",
        "WHERE ordered_at = '2024-03-09'",
      ],
      answer: 2,
      explain:
        '인덱스는 컬럼의 원래 값으로 정렬되어 있어서 컬럼을 함수로 가공하면 정렬 순서를 활용할 수 없습니다. 같은 의미라도 범위 조건(>= \'2024-03-01\' AND < \'2024-04-01\')으로 바꿔 쓰면 인덱스를 탈 수 있습니다.',
    },
    {
      id: 'q4-11',
      level: 4,
      type: '개념',
      topic: '트랜잭션 ACID',
      prompt: '계좌 이체 중 출금 UPDATE 는 성공했는데 입금 UPDATE 에서 오류가 나, 출금까지 함께 취소되었습니다. ACID 중 어떤 성질 덕분일까요?',
      choices: ['원자성 (Atomicity)', '일관성 (Consistency)', '격리성 (Isolation)', '지속성 (Durability)'],
      answer: 0,
      explain:
        '원자성은 트랜잭션 안의 작업이 "전부 반영되거나 전부 취소"되어 중간 상태가 남지 않음을 보장합니다. 격리성은 동시 실행 트랜잭션 간 간섭, 지속성은 COMMIT 후 장애에도 데이터가 유지되는 성질입니다.',
    },
    {
      id: 'q4-12',
      level: 4,
      type: '개념',
      topic: '정규화',
      prompt: 'employees 테이블에 dept_id 와 함께 dept_name, dept_floor 컬럼을 추가로 저장했습니다. 이 설계가 위반하는 정규형과 문제점은?',
      choices: [
        '1NF — 한 컬럼에 여러 값이 들어간다',
        '2NF — 복합 키의 일부에만 종속된다',
        'BCNF — 후보 키가 여러 개다',
        '3NF — 부서명이 dept_id 에 이행 종속되어 부서명 변경 시 여러 행을 고쳐야 한다',
      ],
      answer: 3,
      explain:
        'employees 의 키는 id 인데 dept_name 은 id 가 아니라 dept_id 에 종속됩니다(id → dept_id → dept_name, 이행 종속). 그래서 부서명이 바뀌면 해당 부서 직원 행을 전부 고쳐야 하고 일부만 바뀌는 갱신 이상이 생깁니다. departments 로 분리하는 것이 3NF 입니다.',
    },

    // ───────── 빈칸 채우기 (2) ─────────
    {
      id: 'q4-13',
      level: 4,
      type: '빈칸 채우기',
      topic: 'HAVING',
      prompt: '완료 매출 합계가 100000 이상인 고객만 보려고 합니다. 빈칸에 들어갈 키워드는?',
      code: `SELECT customer_id, SUM(amount)
FROM orders
WHERE status = '완료'
GROUP BY customer_id
_____ SUM(amount) >= 100000;`,
      codeLang: 'sql',
      choices: ['WHERE', 'HAVING', 'AND', 'FILTER'],
      answer: 1,
      explain:
        '집계 결과(그룹)에 대한 조건은 GROUP BY 다음 HAVING 으로 씁니다. WHERE 는 이미 위에서 쓰였고, 집계 함수를 담을 수도 없습니다.',
    },
    {
      id: 'q4-14',
      level: 4,
      type: '빈칸 채우기',
      topic: 'PreparedStatement',
      prompt: '고객 이름으로 안전하게 조회하는 JDBC 코드입니다. 빈칸에 들어갈 코드로 알맞은 것은?',
      code: `String sql = "SELECT id, grade FROM customers WHERE name = ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    _______________;
    ResultSet rs = ps.executeQuery();
    // ...
}`,
      codeLang: 'java',
      choices: ['ps.setString(0, name)', 'ps.setParameter("name", name)', 'ps.setString(1, name)', 'sql = sql.replace("?", name)'],
      answer: 2,
      explain:
        'JDBC 의 바인딩 인덱스는 1부터 시작하므로 첫 번째 ? 에는 setString(1, name) 을 씁니다. 0 을 쓰면 SQLException 이 나고, 문자열 replace 로 넣으면 결국 문자열 이어붙이기라 SQL Injection 에 다시 노출됩니다.',
    },

    // ───────── 버그 찾기 (2) ─────────
    {
      id: 'q4-15',
      level: 4,
      type: '버그 찾기',
      topic: 'WHERE와 집계 함수',
      prompt: '전사 평균보다 연봉이 높은 직원을 찾으려는 쿼리가 에러를 냅니다. 원인과 해결책으로 옳은 것은?',
      code: `SELECT name, salary
FROM employees
WHERE salary > AVG(salary);`,
      codeLang: 'sql',
      choices: [
        'WHERE 는 GROUP BY 보다 먼저 실행돼 집계 함수를 쓸 수 없다 → (SELECT AVG(salary) FROM employees) 서브쿼리로 비교',
        'AVG 는 정수 컬럼에 쓸 수 없다 → CAST 후 사용',
        'ORDER BY 가 없어서 에러 → ORDER BY salary 추가',
        'WHERE 를 HAVING 으로만 바꾸면 원하는 결과가 나온다',
      ],
      answer: 0,
      explain:
        'WHERE 는 개별 행을 거르는 단계라 아직 그룹·집계가 존재하지 않아 AVG 를 쓸 수 없습니다. 전사 평균을 스칼라 서브쿼리로 먼저 구해 비교해야 합니다. GROUP BY 없이 HAVING 으로만 바꾸면 의미가 전혀 다른 쿼리가 됩니다.',
    },
    {
      id: 'q4-16',
      level: 4,
      type: '버그 찾기',
      topic: 'LEFT JOIN과 WHERE',
      prompt:
        '"모든 고객과 각 고객의 완료 주문 건수(없으면 0)"를 뽑으려 했는데 식당F(주문 없음)와 학원C(취소 주문만 있음)가 결과에서 사라졌습니다. 원인은?',
      code: `SELECT c.name, COUNT(o.id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = '완료'
GROUP BY c.id, c.name;`,
      codeLang: 'sql',
      choices: [
        'COUNT(o.id) 대신 COUNT(*) 를 써야 한다',
        'GROUP BY 에 c.name 이 들어가서 그룹이 합쳐졌다',
        'LEFT JOIN 은 주문이 없는 고객을 원래 포함하지 않는다',
        "WHERE o.status = '완료' 가 오른쪽이 NULL 인 행까지 걸러 INNER JOIN 처럼 동작했다 → 조건을 ON 절로 옮겨야 한다",
      ],
      answer: 3,
      explain:
        "LEFT JOIN 으로 살린 행도 o.status 가 NULL(또는 '취소')이면 WHERE 에서 탈락합니다. 오른쪽 테이블 조건을 ON o.customer_id = c.id AND o.status = '완료' 로 옮기면 고객은 모두 남고 완료 주문만 세어져 0건 고객도 0으로 나옵니다.",
    },

    // ───────── 실무 상황 (2) ─────────
    {
      id: 'q4-17',
      level: 4,
      type: '실무 상황',
      topic: 'WHERE 없는 UPDATE',
      prompt:
        '운영 DB 에서 최스프링(id=4)의 연봉만 고치려다 실수로 UPDATE employees SET salary = 5000; 을 실행해 "16 rows affected" 가 떴습니다. 다행히 BEGIN 으로 트랜잭션을 열어 둔 상태이고 아직 COMMIT 은 안 했습니다. 가장 먼저 할 일은?',
      choices: [
        'ROLLBACK 을 실행해 트랜잭션 안의 변경을 모두 되돌린다',
        'COMMIT 한 뒤 백업에서 복구한다',
        '다른 직원들 연봉을 기억나는 대로 UPDATE 로 다시 넣는다',
        '세션 창을 닫으면 자동으로 COMMIT 되니 그대로 둔다',
      ],
      answer: 0,
      explain:
        'COMMIT 전이라면 ROLLBACK 한 번으로 트랜잭션 시작 시점으로 되돌릴 수 있습니다. COMMIT 해버리면 백업·로그 복구라는 훨씬 큰 작업이 됩니다. 그래서 운영 DB 변경은 "BEGIN → 대상 SELECT 확인 → UPDATE → 영향 행 수 확인 → COMMIT" 순서를 지키는 게 실무 습관입니다.',
    },
    {
      id: 'q4-18',
      level: 4,
      type: 'OX',
      topic: '인덱스와 LIKE',
      prompt: "customers.name 에 B-Tree 인덱스가 있으면 WHERE name LIKE '%카페' 조건도 인덱스를 타서 빠르게 검색된다.",
      choices: ['O', 'X'],
      answer: 1,
      explain:
        "B-Tree 인덱스는 값의 앞부분부터 정렬되어 있어 '카페%' 처럼 앞이 고정된 검색만 범위 탐색이 가능합니다. '%카페' 는 앞부분을 모르므로 결국 전체를 훑게 되며, 이런 검색이 필요하면 전문 검색(Full-Text) 인덱스 등을 고려합니다.",
    },
  ],
};

export default content;
