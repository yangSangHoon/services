-- 가상의 회사 '자바커피 주식회사' DB (SQLite)
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  floor INTEGER NOT NULL
);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id),
  position TEXT NOT NULL,
  salary INTEGER NOT NULL,
  hire_date TEXT NOT NULL,
  manager_id INTEGER REFERENCES employees(id)
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  dept_id INTEGER REFERENCES departments(id),
  budget INTEGER NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE assignments (
  emp_id INTEGER REFERENCES employees(id),
  project_id INTEGER REFERENCES projects(id),
  role TEXT NOT NULL,
  hours INTEGER NOT NULL,
  PRIMARY KEY (emp_id, project_id)
);
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  grade TEXT NOT NULL,
  joined_at TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  ordered_at TEXT NOT NULL
);

INSERT INTO departments VALUES
 (1,'개발팀',5),(2,'기획팀',4),(3,'디자인팀',4),(4,'인사팀',3),(5,'영업팀',2),(6,'데이터팀',5);

INSERT INTO employees VALUES
 (1,'김대표',NULL,'CEO',15000,'2015-03-02',NULL),
 (2,'이개발',1,'팀장',9000,'2016-07-01',1),
 (3,'박자바',1,'시니어',7200,'2018-02-12',2),
 (4,'최스프링',1,'주니어',4800,'2022-01-03',3),
 (5,'정쿼리',1,'주니어',4600,'2023-03-02',3),
 (6,'한기획',2,'팀장',8200,'2017-05-15',1),
 (7,'윤플랜',2,'매니저',5600,'2020-09-01',6),
 (8,'강디자',3,'팀장',7800,'2017-11-20',1),
 (9,'조픽셀',3,'디자이너',5100,'2021-04-05',8),
 (10,'임인사',4,'팀장',7000,'2016-01-11',1),
 (11,'오영업',5,'팀장',8000,'2016-09-19',1),
 (12,'서세일',5,'매니저',5300,'2021-08-23',11),
 (13,'문데이터',6,'팀장',8800,'2019-06-10',1),
 (14,'배분석',6,'분석가',6100,'2021-02-01',13),
 (15,'신입생',1,'인턴',3000,'2024-07-01',3),
 (16,'홍길동',NULL,'계약직',3500,'2024-09-02',NULL);

INSERT INTO projects VALUES
 (1,'주문 시스템 개편',1,50000,'진행중'),
 (2,'모바일 앱 리뉴얼',3,30000,'진행중'),
 (3,'추천 알고리즘',6,40000,'완료'),
 (4,'사내 메신저',1,15000,'보류'),
 (5,'신규 요금제 기획',2,8000,'완료'),
 (6,'영업 CRM',5,20000,'진행중');

INSERT INTO assignments VALUES
 (2,1,'PM',120),(3,1,'개발',300),(4,1,'개발',280),(5,1,'개발',150),
 (9,2,'디자인',200),(8,2,'리뷰',40),(4,2,'개발',90),
 (13,3,'PM',80),(14,3,'분석',260),(5,3,'개발',60),
 (3,4,'개발',50),
 (6,5,'PM',100),(7,5,'기획',180),
 (11,6,'PM',70),(12,6,'영업',150),(3,6,'개발',110);

INSERT INTO customers VALUES
 (1,'스타트업A','서울','VIP','2022-01-10'),
 (2,'카페B','부산','일반','2022-05-21'),
 (3,'학원C','서울','일반','2023-02-14'),
 (4,'병원D','대전','VIP','2021-11-30'),
 (5,'쇼핑몰E','서울','골드','2023-07-07'),
 (6,'식당F','광주','일반','2024-01-03'),
 (7,'공방G','부산','골드','2024-03-18');

INSERT INTO orders VALUES
 (1,1,120000,'완료','2024-01-05'),
 (2,1,80000,'완료','2024-02-11'),
 (3,2,15000,'완료','2024-02-15'),
 (4,3,42000,'취소','2024-03-01'),
 (5,4,300000,'완료','2024-03-09'),
 (6,5,56000,'완료','2024-03-22'),
 (7,5,73000,'배송중','2024-04-02'),
 (8,1,25000,'완료','2024-04-15'),
 (9,4,150000,'완료','2024-05-01'),
 (10,7,33000,'완료','2024-05-19'),
 (11,2,27000,'취소','2024-06-03'),
 (12,5,99000,'완료','2024-06-20'),
 (13,4,45000,'배송중','2024-07-01');
-- customers 6(식당F) 은 주문이 없다 (LEFT JOIN 연습용)
-- employees 16(홍길동) 은 부서가 없다 (NULL / OUTER JOIN 연습용)
