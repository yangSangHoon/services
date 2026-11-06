import type { SqlMission } from './types';

/**
 * 실무실 SQL 미션 — seed.sql('자바커피 주식회사' DB) 위에서 사용자 SQL 과 answer 를 둘 다 실행해
 * 결과 행 집합을 비교한다. 컬럼 이름은 무시, 컬럼 순서·값은 비교, orderMatters=false 면 행 순서 무시.
 */
export const sqlMissions: SqlMission[] = [
  // ───────────── 레벨 4: SELECT / WHERE / ORDER BY / 집계 / GROUP BY / 기본 JOIN ─────────────
  {
    id: 'sql-01',
    level: 4,
    title: '개발팀 연봉 명단',
    story: '인사팀 임인사 팀장님: "연봉 협상 시즌이에요. 개발팀(부서 번호 1) 직원들 연봉 좀 뽑아주세요."',
    prompt:
      'employees 테이블에서 dept_id 가 1 인 직원의 이름(name), 직급(position), 연봉(salary)을 이 순서로 출력하세요. 연봉이 높은 순으로 정렬합니다.',
    answer: 'SELECT name, position, salary FROM employees WHERE dept_id = 1 ORDER BY salary DESC;',
    orderMatters: true,
    hints: [
      '조건은 WHERE, 정렬은 ORDER BY 로 씁니다.',
      'WHERE dept_id = 1 로 개발팀만 남기세요.',
      'ORDER BY salary DESC — DESC 를 빼면 낮은 순이 됩니다.',
    ],
    explain:
      'SELECT 뒤에 필요한 컬럼만 순서대로 나열하고, WHERE 로 개발팀 행만 남긴 뒤 ORDER BY salary DESC 로 높은 연봉부터 정렬합니다. SELECT * 대신 필요한 컬럼만 고르는 습관이 실무에서도 중요합니다.',
  },
  {
    id: 'sql-02',
    level: 4,
    title: '서울 고객 리스트',
    story: '영업팀 서세일 매니저님: "다음 주 서울 출장 가요. 서울 고객사 목록을 오래된 고객부터 정리해 주세요."',
    prompt:
      'customers 테이블에서 city 가 \'서울\' 인 고객의 이름(name), 등급(grade), 가입일(joined_at)을 이 순서로 출력하세요. 가입일이 빠른(오래된) 순으로 정렬합니다.',
    answer: "SELECT name, grade, joined_at FROM customers WHERE city = '서울' ORDER BY joined_at ASC;",
    orderMatters: true,
    hints: [
      '문자열 비교는 작은따옴표로 감쌉니다: city = \'서울\'',
      '날짜가 \'YYYY-MM-DD\' 텍스트라 문자열 정렬만으로도 날짜 순이 됩니다.',
      "SELECT name, grade, joined_at FROM customers WHERE city = '서울' ORDER BY joined_at",
    ],
    explain:
      "WHERE city = '서울' 로 필터링하고 ORDER BY joined_at(기본 ASC)으로 오래된 순 정렬합니다. 날짜를 'YYYY-MM-DD' 형식 문자열로 저장하면 사전순 정렬이 곧 날짜순이라는 점도 기억해 두세요.",
  },
  {
    id: 'sql-03',
    level: 4,
    title: '연봉 TOP 3',
    story: '대표님: "우리 회사에서 연봉 제일 많이 받는 세 사람이 누구죠?"',
    prompt:
      'employees 에서 연봉이 가장 높은 3명의 이름(name), 연봉(salary)을 이 순서로 출력하세요. 연봉 높은 순으로 정렬합니다.',
    answer: 'SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3;',
    orderMatters: true,
    hints: ['먼저 정렬하고 앞에서 몇 개만 자르면 됩니다.', 'ORDER BY salary DESC 다음에 LIMIT 3 을 붙이세요.'],
    explain:
      'ORDER BY salary DESC 로 내림차순 정렬한 뒤 LIMIT 3 으로 상위 3행만 가져옵니다. LIMIT 는 ORDER BY 이후에 적용되므로 정렬 없이 LIMIT 만 쓰면 "아무 3명"이 나올 수 있습니다.',
  },
  {
    id: 'sql-04',
    level: 4,
    title: '상반기 완료 주문',
    story: '재무팀: "2024년 상반기에 완료된 주문만 금액 큰 순으로 보여주세요. 취소·배송중은 빼고요."',
    prompt:
      'orders 에서 status 가 \'완료\' 이고 ordered_at 이 \'2024-01-01\' 이상 \'2024-06-30\' 이하인 주문의 주문번호(id), 금액(amount), 주문일(ordered_at)을 이 순서로 출력하세요. 금액이 큰 순으로 정렬합니다.',
    answer:
      "SELECT id, amount, ordered_at FROM orders WHERE status = '완료' AND ordered_at BETWEEN '2024-01-01' AND '2024-06-30' ORDER BY amount DESC;",
    orderMatters: true,
    hints: [
      '조건이 두 개면 AND 로 연결합니다.',
      "기간 조건은 BETWEEN '2024-01-01' AND '2024-06-30' 처럼 쓸 수 있어요 (양 끝 포함).",
      'ORDER BY amount DESC',
    ],
    explain:
      "status = '완료' AND 날짜 범위(BETWEEN 은 양 끝을 포함)로 두 조건을 모두 만족하는 행만 남기고 금액 내림차순 정렬합니다. 7월 주문(13번)과 배송중·취소 주문이 빠지는지 확인해 보세요.",
  },
  {
    id: 'sql-05',
    level: 4,
    title: '완료 매출 한 줄 요약',
    story: '재무팀: "완료된 주문이 몇 건이고 총 매출이 얼마인지 딱 한 줄로요."',
    prompt: "orders 에서 status 가 '완료' 인 주문의 건수, 금액 합계를 이 순서로 한 행으로 출력하세요.",
    answer: "SELECT COUNT(*), SUM(amount) FROM orders WHERE status = '완료';",
    orderMatters: false,
    hints: ['집계 함수 COUNT 와 SUM 을 함께 씁니다.', "WHERE status = '완료' 로 먼저 거른 뒤 집계하세요."],
    explain:
      'GROUP BY 없이 집계 함수를 쓰면 WHERE 를 통과한 전체 행이 하나의 그룹이 되어 결과가 한 행으로 나옵니다. 실행 순서상 WHERE 가 집계보다 먼저라서 완료 주문만 세고 더합니다.',
  },
  {
    id: 'sql-06',
    level: 4,
    title: '부서 번호별 인원과 최고 연봉',
    story: '인사팀: "부서마다 몇 명이고 제일 많이 받는 사람 연봉은 얼마인지 알려주세요. 부서 없는 사람은 빼고요."',
    prompt:
      'employees 에서 dept_id 가 NULL 이 아닌 직원만 대상으로, 부서 번호(dept_id), 직원 수, 최고 연봉을 이 순서로 출력하세요. 부서 번호 오름차순으로 정렬합니다.',
    answer:
      'SELECT dept_id, COUNT(*), MAX(salary) FROM employees WHERE dept_id IS NOT NULL GROUP BY dept_id ORDER BY dept_id;',
    orderMatters: true,
    hints: [
      '"부서마다" 라는 말이 나오면 GROUP BY 를 떠올리세요.',
      'NULL 비교는 = 가 아니라 IS NOT NULL 입니다.',
      'SELECT dept_id, COUNT(*), MAX(salary) FROM employees WHERE ... GROUP BY dept_id ORDER BY dept_id',
    ],
    explain:
      'WHERE dept_id IS NOT NULL 로 부서 없는 직원(김대표, 홍길동)을 먼저 제외하고, GROUP BY dept_id 로 부서별 묶음을 만든 뒤 COUNT(*)·MAX(salary) 로 집계합니다. NULL 을 거르지 않으면 dept_id 가 NULL 인 그룹이 하나 더 생깁니다.',
  },
  {
    id: 'sql-07',
    level: 4,
    title: '주문 상태별 현황',
    story: 'CS팀: "주문 상태별로 몇 건이고 금액이 얼마나 되는지 현황판에 띄우고 싶어요."',
    prompt:
      'orders 를 상태(status)별로 묶어 상태, 주문 건수, 금액 합계를 이 순서로 출력하세요. 금액 합계가 큰 순으로 정렬합니다.',
    answer: 'SELECT status, COUNT(*), SUM(amount) FROM orders GROUP BY status ORDER BY SUM(amount) DESC;',
    orderMatters: true,
    hints: ['GROUP BY status', 'ORDER BY 에 집계 함수(SUM(amount))나 별칭을 쓸 수 있어요.'],
    explain:
      'GROUP BY status 로 완료/배송중/취소 세 그룹을 만들고 각 그룹의 건수·합계를 구합니다. ORDER BY 는 SELECT 이후에 실행되므로 집계 결과(또는 SELECT 에서 붙인 별칭)로 정렬할 수 있습니다.',
  },
  {
    id: 'sql-08',
    level: 4,
    title: '직원과 부서명 연결',
    story: '신입 온보딩 담당: "직원 이름 옆에 부서 번호 말고 부서 이름이 보이게 해주세요."',
    prompt:
      'employees 와 departments 를 INNER JOIN 해서 직원 이름, 부서 이름을 이 순서로 출력하세요. 부서가 없는 직원은 나오지 않아도 됩니다. 직원 id 오름차순으로 정렬합니다.',
    answer: 'SELECT e.name, d.name FROM employees e JOIN departments d ON e.dept_id = d.id ORDER BY e.id;',
    orderMatters: true,
    hints: [
      'FROM employees e JOIN departments d ON ... 형태로 씁니다.',
      '연결 조건은 e.dept_id = d.id 입니다.',
      '두 테이블 모두 name 컬럼이 있으니 e.name, d.name 처럼 별칭을 붙이세요.',
    ],
    explain:
      'INNER JOIN 은 ON 조건(e.dept_id = d.id)을 만족하는 짝이 있는 행만 남깁니다. dept_id 가 NULL 인 김대표·홍길동은 짝이 없어 결과에서 빠집니다. 같은 이름의 컬럼이 두 테이블에 있으면 반드시 테이블 별칭으로 구분해야 합니다.',
  },

  // ───────────── 레벨 5 ─────────────
  {
    id: 'sql-09',
    level: 5,
    title: '진행중 프로젝트 담당 부서',
    story: '기획팀 한기획 팀장님: "지금 진행중인 프로젝트가 어느 부서 담당인지, 예산은 얼마인지 보고서에 넣을게요."',
    prompt:
      "projects 와 departments 를 조인해 status 가 '진행중' 인 프로젝트의 프로젝트명, 담당 부서명, 예산(budget)을 이 순서로 출력하세요. 예산이 큰 순으로 정렬합니다.",
    answer:
      "SELECT p.name, d.name, p.budget FROM projects p JOIN departments d ON p.dept_id = d.id WHERE p.status = '진행중' ORDER BY p.budget DESC;",
    orderMatters: true,
    hints: [
      'JOIN 과 WHERE 를 함께 쓸 수 있습니다. 순서는 FROM → JOIN → WHERE → ORDER BY.',
      "ON p.dept_id = d.id, WHERE p.status = '진행중'",
    ],
    explain:
      "JOIN 으로 부서명을 붙이고 WHERE p.status = '진행중' 으로 걸러낸 뒤 예산 내림차순 정렬합니다. 조인과 필터, 정렬을 한 쿼리에 조합하는 가장 흔한 실무 패턴입니다.",
  },
  {
    id: 'sql-10',
    level: 5,
    title: '2021년 입사 동기 찾기',
    story: '사내 동호회 총무: "2021년 입사 동기 모임을 만들려고요. 2021년에 입사한 사람 알려주세요."',
    prompt:
      "employees 에서 hire_date 가 2021년(2021-01-01 ~ 2021-12-31)인 직원의 이름, 입사일(hire_date)을 이 순서로 출력하세요. 입사일 빠른 순으로 정렬합니다.",
    answer: "SELECT name, hire_date FROM employees WHERE hire_date LIKE '2021-%' ORDER BY hire_date;",
    orderMatters: true,
    hints: [
      "LIKE '2021-%' 는 '2021-' 로 시작하는 문자열을 찾습니다.",
      "BETWEEN '2021-01-01' AND '2021-12-31' 로도 풀 수 있어요.",
    ],
    explain:
      "LIKE '2021-%' 의 % 는 '0개 이상의 아무 문자'를 뜻해 2021년으로 시작하는 날짜를 모두 찾습니다. 다만 실무에서 날짜가 DATE 타입이면 범위 조건(>= '2021-01-01' AND < '2022-01-01')이 인덱스를 타기 쉬워 더 권장됩니다.",
  },

  // ───────────── 레벨 6 ─────────────
  {
    id: 'sql-11',
    level: 6,
    title: '직원별 프로젝트 투입 현황',
    story: 'PMO: "누가 프로젝트를 몇 개나 맡고 있고 총 몇 시간 투입됐는지 보고 싶어요. 과부하 걸린 사람 찾으려고요."',
    prompt:
      'employees 와 assignments 를 조인해 직원 이름, 참여 프로젝트 수, 총 투입 시간(hours 합계)을 이 순서로 출력하세요. 총 투입 시간이 많은 순으로 정렬합니다. 프로젝트가 없는 직원은 나오지 않아도 됩니다.',
    answer:
      'SELECT e.name, COUNT(*), SUM(a.hours) FROM employees e JOIN assignments a ON a.emp_id = e.id GROUP BY e.id, e.name ORDER BY SUM(a.hours) DESC;',
    orderMatters: true,
    hints: [
      'JOIN 한 결과를 직원 단위로 GROUP BY 하면 됩니다.',
      '동명이인 대비로 GROUP BY e.id, e.name 처럼 PK 를 함께 묶는 습관을 들이세요.',
      'ORDER BY SUM(a.hours) DESC',
    ],
    explain:
      'JOIN 으로 직원-배정 행을 만든 뒤 직원별로 GROUP BY 해서 배정 행 수(=프로젝트 수)와 시간 합계를 집계합니다. 박자바가 3개 프로젝트, 460시간으로 가장 바쁩니다.',
  },
  {
    id: 'sql-12',
    level: 6,
    title: '프로젝트별 투입 인원',
    story: 'CTO: "프로젝트마다 몇 명이 붙어 있고 총 몇 시간 들었는지 정리해 주세요."',
    prompt:
      'projects 와 assignments 를 조인해 프로젝트명, 투입 인원 수, 총 투입 시간을 이 순서로 출력하세요. 총 투입 시간이 많은 순, 같으면 프로젝트 id 오름차순으로 정렬합니다.',
    answer:
      'SELECT p.name, COUNT(a.emp_id), SUM(a.hours) FROM projects p JOIN assignments a ON a.project_id = p.id GROUP BY p.id, p.name ORDER BY SUM(a.hours) DESC, p.id;',
    orderMatters: true,
    hints: [
      '이번엔 프로젝트 단위로 GROUP BY 합니다.',
      '모바일 앱 리뉴얼과 영업 CRM 은 시간이 같아요. 동점이면 두 번째 정렬 기준이 필요합니다.',
      'GROUP BY p.id, p.name ... ORDER BY SUM(a.hours) DESC, p.id',
    ],
    explain:
      '조인 결과를 프로젝트별로 묶어 인원 수와 시간 합계를 구합니다. 같은 데이터라도 "무엇 기준으로 묶느냐(GROUP BY)"에 따라 전혀 다른 리포트가 된다는 점이 핵심입니다.',
  },

  // ───────────── 레벨 7: LEFT JOIN + NULL / HAVING / 서브쿼리 / 셀프 조인 ─────────────
  {
    id: 'sql-13',
    level: 7,
    title: '놀고 있는(?) 직원 찾기',
    story: 'PMO: "프로젝트에 한 번도 배정 안 된 사람이 누군지 알아야 다음 프로젝트 인력 배치를 하죠."',
    prompt:
      'assignments 에 한 건도 없는 직원의 id, 이름을 이 순서로 출력하세요. 직원 id 오름차순으로 정렬합니다.',
    answer:
      'SELECT e.id, e.name FROM employees e LEFT JOIN assignments a ON a.emp_id = e.id WHERE a.emp_id IS NULL ORDER BY e.id;',
    orderMatters: true,
    hints: [
      'INNER JOIN 은 짝이 없는 행을 버립니다. 짝 없는 행을 살리려면 LEFT JOIN.',
      'LEFT JOIN 후 짝이 없으면 오른쪽 테이블 컬럼이 NULL 로 채워집니다.',
      'WHERE a.emp_id IS NULL',
    ],
    explain:
      'LEFT JOIN 은 왼쪽(employees)의 모든 행을 남기고, 짝이 없는 행은 오른쪽 컬럼을 NULL 로 채웁니다. 그 NULL 을 WHERE a.emp_id IS NULL 로 골라내면 "배정 기록이 없는 직원"이 됩니다. NOT EXISTS 서브쿼리로도 같은 결과를 낼 수 있습니다.',
  },
  {
    id: 'sql-14',
    level: 7,
    title: 'VIP 후보 고객',
    story: '영업팀 오영업 팀장님: "완료 매출이 10만원 이상인 고객만 뽑아주세요. VIP 승급 대상 검토하려고요."',
    prompt:
      "customers 와 orders 를 조인해 status 가 '완료' 인 주문만 대상으로, 고객별 완료 매출 합계가 100000 이상인 고객의 이름, 완료 매출 합계를 이 순서로 출력하세요. 합계가 큰 순으로 정렬합니다.",
    answer:
      "SELECT c.name, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = '완료' GROUP BY c.id, c.name HAVING SUM(o.amount) >= 100000 ORDER BY SUM(o.amount) DESC;",
    orderMatters: true,
    hints: [
      '행 단위 조건(완료 주문)은 WHERE, 그룹 단위 조건(합계 10만 이상)은 HAVING.',
      'WHERE 에는 SUM() 같은 집계 함수를 쓸 수 없어요. 실행 순서상 WHERE 가 GROUP BY 보다 먼저니까요.',
      "... WHERE o.status = '완료' GROUP BY c.id, c.name HAVING SUM(o.amount) >= 100000",
    ],
    explain:
      'WHERE 로 완료 주문 행만 남기고 → GROUP BY 로 고객별로 묶고 → HAVING 으로 합계 조건을 만족하는 그룹만 남깁니다. "개별 행을 거르면 WHERE, 묶은 결과를 거르면 HAVING" 이 핵심입니다.',
  },
  {
    id: 'sql-15',
    level: 7,
    title: '평균보다 많이 받는 사람',
    story: '인사팀: "전사 평균 연봉보다 많이 받는 직원 명단이 필요해요. 평균값을 손으로 넣지 말고 쿼리로요."',
    prompt:
      'employees 전체 평균 연봉보다 연봉이 높은 직원의 이름, 연봉을 이 순서로 출력하세요. 연봉 높은 순으로 정렬합니다.',
    answer:
      'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;',
    orderMatters: true,
    hints: [
      'WHERE salary > AVG(salary) 는 에러입니다. WHERE 에선 집계 함수를 못 써요.',
      '평균을 구하는 쿼리를 괄호로 감싸 값처럼 쓸 수 있어요 — 스칼라 서브쿼리.',
      'WHERE salary > (SELECT AVG(salary) FROM employees)',
    ],
    explain:
      '괄호 안 서브쿼리가 먼저 전사 평균(6812.5)을 한 값으로 계산하고, 바깥 쿼리가 그 값과 각 행을 비교합니다. 평균을 하드코딩하면 데이터가 바뀔 때마다 틀린 리포트가 되므로 서브쿼리로 동적으로 구하는 것이 정석입니다.',
  },
  {
    id: 'sql-16',
    level: 7,
    title: '조직도: 직원과 상사',
    story: '인사팀: "조직도 그리려는데, 직원마다 직속 상사 이름이 필요해요."',
    prompt:
      'employees 를 셀프 조인해 직원 이름, 상사 이름을 이 순서로 출력하세요. 상사(manager_id)가 없는 직원은 제외합니다. 직원 id 오름차순으로 정렬합니다.',
    answer:
      'SELECT e.name, m.name FROM employees e JOIN employees m ON e.manager_id = m.id ORDER BY e.id;',
    orderMatters: true,
    hints: [
      '같은 테이블을 두 번 쓰되 별칭을 다르게(e: 직원, m: 상사) 붙이면 됩니다.',
      '연결 조건: 직원의 manager_id = 상사의 id',
      'SELECT e.name, m.name FROM employees e JOIN employees m ON e.manager_id = m.id',
    ],
    explain:
      '셀프 조인은 같은 테이블을 서로 다른 별칭으로 두 번 불러 "다른 역할의 테이블"처럼 조인하는 기법입니다. INNER JOIN 이라 manager_id 가 NULL 인 김대표·홍길동은 자연스럽게 빠집니다. 상사 없는 직원도 보여야 한다면 LEFT JOIN 을 쓰면 됩니다.',
  },

  // ───────────── 레벨 8 ─────────────
  {
    id: 'sql-17',
    level: 8,
    title: '주문 0건 고객까지 포함한 리포트',
    story: '마케팅팀: "주문 안 한 고객도 리마인드 메일 보내야 하니까 0건인 고객도 빠짐없이 주문 건수를 보여주세요."',
    prompt:
      '모든 고객의 이름, 주문 건수(주문이 없으면 0)를 이 순서로 출력하세요. 주문 건수가 많은 순, 같으면 고객 id 오름차순으로 정렬합니다.',
    answer:
      'SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name ORDER BY COUNT(o.id) DESC, c.id ASC;',
    orderMatters: true,
    hints: [
      '주문이 없는 고객도 살리려면 LEFT JOIN 입니다.',
      'COUNT(*) 는 NULL 로 채워진 행도 1로 셉니다. COUNT(o.id) 는 NULL 을 세지 않아요.',
      'ORDER BY COUNT(o.id) DESC, c.id — SELECT 에 없는 컬럼으로도 정렬할 수 있어요.',
    ],
    explain:
      'LEFT JOIN 하면 식당F 는 주문 컬럼이 NULL 인 행 1개로 남습니다. 이때 COUNT(*) 를 쓰면 1로 잘못 세지고, COUNT(o.id) 를 써야 NULL 을 빼고 0이 됩니다. LEFT JOIN + COUNT(*) 는 실무에서 정말 자주 나오는 버그입니다.',
  },
  {
    id: 'sql-18',
    level: 8,
    title: '평균 연봉이 높은 부서',
    story: '경영지원실: "부서 평균 연봉이 전사 평균보다 높은 부서가 어디죠? 보상 정책 검토 자료예요."',
    prompt:
      'employees 와 departments 를 조인해 부서별 평균 연봉이 전사 평균 연봉(부서 없는 직원 포함 전체 employees 평균)보다 높은 부서의 부서명, 평균 연봉(ROUND 로 정수 반올림)을 이 순서로 출력하세요. 평균 연봉 높은 순으로 정렬합니다.',
    answer:
      'SELECT d.name, ROUND(AVG(e.salary)) FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY d.id, d.name HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees) ORDER BY AVG(e.salary) DESC;',
    orderMatters: true,
    hints: [
      '부서별 평균은 GROUP BY + AVG, 그 결과를 거르는 건 HAVING.',
      'HAVING 안에서도 스칼라 서브쿼리를 쓸 수 있어요.',
      'HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees)',
    ],
    explain:
      'GROUP BY 로 부서별 평균을 만들고, HAVING 에서 서브쿼리로 구한 전사 평균(6812.5)과 비교합니다. 기획팀(6900)·인사팀(7000)·데이터팀(7450)이 남습니다. 비교는 반올림 전 AVG 값으로 하고 출력만 ROUND 하는 것이 정확합니다.',
  },

  // ───────────── 레벨 9: 윈도 함수 ─────────────
  {
    id: 'sql-19',
    level: 9,
    title: '부서 내 연봉 순위',
    story: '인사팀: "부서 안에서 각자 연봉이 몇 등인지 보여주세요. 전체 순위 말고 부서별 순위요!"',
    prompt:
      '부서가 있는 직원만 대상으로 부서명, 직원 이름, 연봉, 부서 내 연봉 순위(높은 연봉이 1위, RANK 사용)를 이 순서로 출력하세요. 부서 id 오름차순, 같은 부서 안에서는 순위 오름차순으로 정렬합니다.',
    answer:
      'SELECT d.name, e.name, e.salary, RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk FROM employees e JOIN departments d ON e.dept_id = d.id ORDER BY d.id, rnk;',
    orderMatters: true,
    hints: [
      'GROUP BY 는 행을 하나로 합쳐버립니다. 행은 그대로 두고 순위만 붙이려면 윈도 함수!',
      'RANK() OVER (PARTITION BY ... ORDER BY ...) — PARTITION BY 가 "부서별"을 담당합니다.',
      'RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk ... ORDER BY d.id, rnk',
    ],
    explain:
      'RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) 는 부서별로 구간을 나눈 뒤 각 구간 안에서 연봉 내림차순 순위를 매깁니다. GROUP BY 와 달리 행 수가 줄지 않는 것이 윈도 함수의 특징이며, 동점 처리 방식에 따라 RANK(1,1,3) / DENSE_RANK(1,1,2) / ROW_NUMBER(1,2,3)를 골라 씁니다.',
  },

  // ───────────── 레벨 10: 복합 리포트 ─────────────
  {
    id: 'sql-20',
    level: 10,
    title: '부서 종합 리포트',
    story:
      '대표님: "다음 주 경영회의 자료예요. 부서마다 인원, 진행중 프로젝트 수, 소속 직원들의 총 프로젝트 투입 시간을 한 표로 보여주세요. 숫자 없는 부서도 0으로 빠짐없이!"',
    prompt:
      "모든 부서(departments 6개)에 대해 부서명, 소속 직원 수, 그 부서 담당 프로젝트 중 status 가 '진행중' 인 프로젝트 수, 소속 직원들의 assignments.hours 총합(없으면 0)을 이 순서로 출력하세요. 총 투입 시간이 많은 순, 같으면 부서 id 오름차순으로 정렬합니다.",
    answer: `SELECT d.name,
       (SELECT COUNT(*) FROM employees e WHERE e.dept_id = d.id) AS emp_cnt,
       (SELECT COUNT(*) FROM projects p WHERE p.dept_id = d.id AND p.status = '진행중') AS active_cnt,
       COALESCE((SELECT SUM(a.hours) FROM assignments a JOIN employees e ON e.id = a.emp_id WHERE e.dept_id = d.id), 0) AS total_hours
FROM departments d
ORDER BY total_hours DESC, d.id;`,
    orderMatters: true,
    hints: [
      'employees·projects·assignments 를 한 번에 JOIN 하면 행이 곱해져(fan-out) 숫자가 부풀어요.',
      '지표마다 따로 계산하세요 — SELECT 절의 상관 서브쿼리나, 미리 집계한 서브쿼리를 LEFT JOIN 하는 방식.',
      '투입 시간이 없는 부서(인사팀)는 SUM 이 NULL 이므로 COALESCE(..., 0) 으로 0 처리합니다.',
    ],
    explain:
      '세 지표의 기준 테이블이 서로 달라서 한꺼번에 JOIN 하면 1:N 관계가 겹쳐 COUNT·SUM 이 뻥튀기됩니다. 그래서 부서마다 지표를 상관 서브쿼리로 따로 계산하고, 투입 기록이 없는 부서는 COALESCE 로 0을 채웠습니다. 실무 리포트 쿼리에서 "조인 팬아웃"은 가장 흔한 숫자 오류 원인입니다.',
  },
];
