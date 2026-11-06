/**
 * 브라우저 안 SQLite(sql.js) — 실무실 SQL 미션 채점과 놀이터.
 * wasm(약 650KB)은 실무실에 처음 들어갈 때만 내려받는다.
 */
import type { Database, SqlJsStatic, SqlValue } from 'sql.js';
import seed from './sql/seed.sql?raw';

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm-browser.wasm?url')]).then(
      ([mod, wasm]) => mod.default({ locateFile: () => wasm.default }),
    );
    sqlPromise.catch(() => (sqlPromise = null));
  }
  return sqlPromise;
}

export async function freshDb(): Promise<Database> {
  const SQL = await getSql();
  const db = new SQL.Database();
  db.run(seed);
  return db;
}

export interface QueryResult {
  columns: string[];
  rows: SqlValue[][];
}

/** 여러 문장이면 마지막 SELECT 결과를 보여준다 */
export function runQuery(db: Database, sql: string): QueryResult {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] };
}

export interface Grade {
  ok: boolean;
  reason?: string;
  user?: QueryResult;
  expected: QueryResult;
  error?: string;
}

const norm = (v: SqlValue) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : String(v);
const rowKey = (r: SqlValue[]) => JSON.stringify(r.map(norm));

export async function grade(userSql: string, answerSql: string, orderMatters: boolean): Promise<Grade> {
  const expDb = await freshDb();
  const expected = runQuery(expDb, answerSql);
  expDb.close();
  const db = await freshDb();
  try {
    const user = runQuery(db, userSql);
    if (!user.columns.length) return { ok: false, expected, user, reason: '결과 표가 없어요. SELECT 문을 작성했는지 확인하세요.' };
    if (user.columns.length !== expected.columns.length)
      return { ok: false, expected, user, reason: `컬럼 수가 달라요 (요구 ${expected.columns.length}개 / 내 결과 ${user.columns.length}개)` };
    if (user.rows.length !== expected.rows.length)
      return { ok: false, expected, user, reason: `행 수가 달라요 (요구 ${expected.rows.length}행 / 내 결과 ${user.rows.length}행)` };
    const u = user.rows.map(rowKey);
    const e = expected.rows.map(rowKey);
    const sameSet = [...u].sort().join('\n') === [...e].sort().join('\n');
    if (!sameSet) return { ok: false, expected, user, reason: '값이 달라요. 조건·컬럼 순서·계산식을 다시 확인해 보세요.' };
    if (orderMatters && u.join('\n') !== e.join('\n'))
      return { ok: false, expected, user, reason: '값은 맞는데 정렬 순서가 달라요. ORDER BY 를 확인하세요.' };
    return { ok: true, expected, user };
  } catch (err) {
    return { ok: false, expected, error: err instanceof Error ? err.message : String(err) };
  } finally {
    db.close();
  }
}

/** 실습 DB 스키마 안내 (화면 표시용) */
export const SCHEMA: { table: string; desc: string; cols: string }[] = [
  { table: 'departments', desc: '부서', cols: 'id, name, floor' },
  { table: 'employees', desc: '직원', cols: 'id, name, dept_id, position, salary(만원), hire_date, manager_id' },
  { table: 'projects', desc: '프로젝트', cols: 'id, name, dept_id, budget(만원), status' },
  { table: 'assignments', desc: '프로젝트 배정', cols: 'emp_id, project_id, role, hours' },
  { table: 'customers', desc: '고객사', cols: 'id, name, city, grade, joined_at' },
  { table: 'orders', desc: '주문', cols: 'id, customer_id, amount(원), status, ordered_at' },
];
