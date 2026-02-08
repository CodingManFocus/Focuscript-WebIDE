export type Lang = 'plain' | 'kotlin' | 'yaml';

export function escapeHtml(s: string): string {
  return (s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function detectLang(path: string): Lang {
  const p = (path || '').toLowerCase();
  if (p.endsWith('.yml') || p.endsWith('.yaml')) return 'yaml';
  if (p.endsWith('.fs') || p.endsWith('.kt') || p.endsWith('.kts')) return 'kotlin';
  return 'plain';
}

// Very small syntax highlighter (Kotlin-like + YAML) for readability.
// Intentionally dependency-free to keep the IDE "offline-friendly".
const KW = new Set([
  'package','import','class','object','interface','fun','val','var','if','else','when','for','while','do','return','break','continue',
  'try','catch','finally','throw','in','is','as','this','super','typealias','sealed','data','enum','override',
  'public','private','protected','internal','open','abstract','final','companion','inline','noinline','crossinline','reified',
  'suspend','operator','infix','tailrec','vararg','const','lateinit','where','get','set','by','constructor','init',
  // Focuscript DSL-ish entry
  'module','onDisable'
]);

const BUILTIN = new Set(['Int','Long','Double','Float','Boolean','String','Unit','Any','Nothing','List','Map','Set']);

function highlightPlain(text: string): string {
  return escapeHtml(text);
}

function highlightKotlin(text: string): string {
  let i = 0;
  let out = '';

  const n = text.length;
  const isIdStart = (c: string) => /[A-Za-z_]/.test(c);
  const isId = (c: string) => /[A-Za-z0-9_]/.test(c);
  const isDigit = (c: string) => /[0-9]/.test(c);

  while (i < n) {
    const c = text[i];

    // Line comment
    if (c === '/' && text[i + 1] === '/') {
      let j = i + 2;
      while (j < n && text[j] !== '\n') j++;
      out += '<span class="tok-com">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Block comment
    if (c === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      out += '<span class="tok-com">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Triple quoted string """..."""
    if (c === '"' && text[i + 1] === '"' && text[i + 2] === '"') {
      let j = i + 3;
      while (j < n && !(text[j] === '"' && text[j + 1] === '"' && text[j + 2] === '"')) j++;
      j = Math.min(n, j + 3);
      out += '<span class="tok-str">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Normal string
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === '"') { j++; break; }
        j++;
      }
      out += '<span class="tok-str">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Char literal
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === "'") { j++; break; }
        j++;
      }
      out += '<span class="tok-str">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Annotation
    if (c === '@') {
      let j = i + 1;
      while (j < n && isId(text[j])) j++;
      out += '<span class="tok-ann">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Number
    if (isDigit(c)) {
      let j = i + 1;
      while (j < n && /[0-9_]/.test(text[j])) j++;
      if (text[j] === '.' && isDigit(text[j + 1])) {
        j++;
        while (j < n && /[0-9_]/.test(text[j])) j++;
      }
      out += '<span class="tok-num">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      continue;
    }

    // Identifier / keyword
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isId(text[j])) j++;
      const word = text.slice(i, j);
      if (KW.has(word) || word === 'true' || word === 'false' || word === 'null') {
        out += '<span class="tok-kw">' + escapeHtml(word) + '</span>';
      } else if (BUILTIN.has(word) || /^[A-Z]/.test(word)) {
        out += '<span class="tok-type">' + escapeHtml(word) + '</span>';
      } else {
        out += escapeHtml(word);
      }
      i = j;
      continue;
    }

    // Operators / punctuation (minimal)
    if ('{}()[];,.'.includes(c)) {
      out += '<span class="tok-op">' + escapeHtml(c) + '</span>';
      i++;
      continue;
    }

    // Default
    out += escapeHtml(c);
    i++;
  }

  return out;
}

function highlightYaml(text: string): string {
  let i = 0;
  let out = '';
  const n = text.length;

  const isKeyChar = (c: string) => /[A-Za-z0-9_.-]/.test(c);
  const isDigit = (c: string) => /[0-9]/.test(c);

  let atLineStart = true;
  while (i < n) {
    const c = text[i];

    // newline
    if (c === '\n') {
      out += '\n';
      i++;
      atLineStart = true;
      continue;
    }

    // comment
    if (c === '#') {
      let j = i + 1;
      while (j < n && text[j] !== '\n') j++;
      out += '<span class="tok-com">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      atLineStart = false;
      continue;
    }

    // strings
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') { j += 2; continue; }
        if (text[j] === quote) { j++; break; }
        j++;
      }
      out += '<span class="tok-str">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      atLineStart = false;
      continue;
    }

    // key at start:  <key>:
    if (atLineStart) {
      // consume indentation
      let j = i;
      while (j < n && (text[j] === ' ' || text[j] === '\t')) j++;
      out += escapeHtml(text.slice(i, j));
      i = j;

      // optional list marker
      if (text[i] === '-') {
        out += '<span class="tok-op">-</span>';
        i++;
        // spaces after '-'
        let k = i;
        while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
        out += escapeHtml(text.slice(i, k));
        i = k;
      }

      // key token
      let k = i;
      while (k < n && isKeyChar(text[k])) k++;
      if (k > i && text[k] === ':') {
        out += '<span class="tok-key">' + escapeHtml(text.slice(i, k)) + '</span>';
        out += '<span class="tok-op">:</span>';
        i = k + 1;
        atLineStart = false;
        continue;
      }
      // fallthrough
    }

    // numbers
    if (isDigit(c)) {
      let j = i + 1;
      while (j < n && /[0-9_]/.test(text[j])) j++;
      if (text[j] === '.' && isDigit(text[j + 1])) {
        j++;
        while (j < n && /[0-9_]/.test(text[j])) j++;
      }
      out += '<span class="tok-num">' + escapeHtml(text.slice(i, j)) + '</span>';
      i = j;
      atLineStart = false;
      continue;
    }

    // booleans/null
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_-]/.test(text[j])) j++;
      const word = text.slice(i, j);
      if (word === 'true' || word === 'false' || word === 'null') {
        out += '<span class="tok-kw">' + escapeHtml(word) + '</span>';
      } else {
        out += escapeHtml(word);
      }
      i = j;
      atLineStart = false;
      continue;
    }

    out += escapeHtml(c);
    i++;
    atLineStart = false;
  }

  return out;
}

export function highlight(text: string, lang: Lang): string {
  if (lang === 'kotlin') return highlightKotlin(text);
  if (lang === 'yaml') return highlightYaml(text);
  return highlightPlain(text);
}
