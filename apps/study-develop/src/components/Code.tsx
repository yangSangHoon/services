import type { ReactNode } from 'react';
import type { CodeLang } from '../content/types';

const JAVA_KW =
  /\b(abstract|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|null|package|private|protected|public|record|return|sealed|short|static|super|switch|synchronized|this|throw|throws|try|var|void|volatile|while|true|false|yield|permits)\b/;
const SQL_KW =
  /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|EXISTS|BETWEEN|LIKE|UNION|ALL|BEGIN|COMMIT|ROLLBACK|OVER|PARTITION|RANK|ROW_NUMBER|DENSE_RANK|COALESCE|ROUND|WITH)\b/i;

/** 아주 가벼운 하이라이터 — 문자열·주석·키워드·숫자·애노테이션만 */
function highlight(code: string, lang: CodeLang): ReactNode[] {
  if (lang !== 'java' && lang !== 'sql') return [code];
  const kw = lang === 'java' ? JAVA_KW : SQL_KW;
  const re =
    lang === 'java'
      ? /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'|@\w+|\b\d+(?:\.\d+)?[LlFfDd]?\b|\b[A-Za-z_]\w*\b)/g
      : /(--[^\n]*|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const t = m[0];
    let cls = '';
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('--')) cls = 'tk-com';
    else if (t.startsWith('"') || t.startsWith("'")) cls = 'tk-str';
    else if (t.startsWith('@')) cls = 'tk-ann';
    else if (/^\d/.test(t)) cls = 'tk-num';
    else if (kw.test(t) && new RegExp(`^${kw.source}$`, kw.flags).test(t)) cls = 'tk-kw';
    else if (lang === 'java' && /^[A-Z]/.test(t)) cls = 'tk-type';
    out.push(cls ? <span key={i++} className={cls}>{t}</span> : t);
    last = m.index + t.length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function Code({ code, lang = 'java' }: { code: string; lang?: CodeLang }) {
  return (
    <pre className={`code lang-${lang}`}>
      <span className="code-lang">{lang}</span>
      <code>{highlight(code.replace(/^\n+|\s+$/g, ''), lang)}</code>
    </pre>
  );
}

/** 문단 안의 `인라인 코드` 를 <code> 로 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i} className="inline">{p.slice(1, -1)}</code>
        ) : p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          p
        ),
      )}
    </>
  );
}
