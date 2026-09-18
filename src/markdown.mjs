/**
 * 极简 Markdown 解析器（零依赖，约 200 行）
 *
 * 支持：标题、段落、粗体 / 斜体 / 删除线、行内代码、围栏代码块、
 *      有序与无序列表（可嵌套）、引用、表格、分割线、链接、图片、硬换行。
 * 不支持：HTML 内联、脚注、数学公式、任务列表（够用就好）。
 */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/** 过滤危险协议，避免正文里的链接变成 javascript: 执行入口 */
function safeUrl(url) {
  const value = String(url).trim();
  if (/^\s*(javascript|vbscript|data):/i.test(value)) return '#';
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return `mailto:${value}`;
  return value;
}

/** 生成标题锚点：保留中英文与数字 */
export function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return base || 'section';
}

/** 去掉行内标记，用于摘要与目录文字 */
function stripInline(text) {
  return String(text)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}

/* ------------------------------------------------------------------ */
/* 行内解析                                                            */
/* ------------------------------------------------------------------ */

function inline(text) {
  const codes = [];
  // 先转义，再解析，保证正文里的 HTML 只能当文本显示
  let out = escapeHtml(text);

  // 行内代码优先抽出，避免内部的 * _ 被当成强调
  // 支持 `` `code` `` 这种用多个反引号包裹、内部含反引号的写法
  out = out.replace(/(`+)([\s\S]*?)\1/g, (_m, _ticks, raw) => {
    // CommonMark 规定：首尾各有一个空格时去掉一层
    const code = /^ [\s\S]* $/.test(raw) ? raw.slice(1, -1) : raw;
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  // 图片
  out = out.replace(
    /!\[([^\]]*)\]\(((?:[^()\s]|\([^()]*\))+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt, src, title) => {
      const t = title ? ` title="${title}"` : '';
      return `<img src="${safeUrl(src)}" alt="${alt}"${t} loading="lazy">`;
    },
  );

  // 链接（URL 允许一层括号，例如 wiki 链接）
  out = out.replace(
    /\[([^\]]+)\]\(((?:[^()\s]|\([^()]*\))+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, label, href, title) => {
      const t = title ? ` title="${title}"` : '';
      const external = /^https?:\/\//i.test(href);
      const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${safeUrl(href)}"${t}${rel}>${label}</a>`;
    },
  );

  // 加粗 / 斜体 / 删除线
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  out = out.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');

  // 行尾两个空格 = 硬换行
  out = out.replace(/ {2,}\n/g, '<br>\n');

  // 还原行内代码
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
  return out;
}

/* ------------------------------------------------------------------ */
/* 块级解析                                                            */
/* ------------------------------------------------------------------ */

const RE_FENCE = /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^ {0,3}([-*_])\s*(?:\1\s*){2,}$/;
const RE_QUOTE = /^ {0,3}>\s?/;
const RE_LIST = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const RE_TABLE_SEP = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function isBlockStart(lines, i) {
  const line = lines[i];
  if (RE_FENCE.test(line) || RE_HEADING.test(line) || RE_HR.test(line) || RE_QUOTE.test(line)) return true;
  if (RE_LIST.test(line)) return true;
  if (line.includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) return true;
  return false;
}

/** 解析一段行数组，返回 HTML。blockquote 会递归调用。 */
function parseBlocks(lines, headings, seen) {
  const out = [];
  const n = lines.length;
  let i = 0;

  while (i < n) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // --- 围栏代码块 ---
    const fence = RE_FENCE.exec(line);
    if (fence) {
      const close = fence[1][0] === '`' ? /^\s*`{3,}\s*$/ : /^\s*~{3,}\s*$/;
      const lang = fence[2] || '';
      const buf = [];
      i++;
      while (i < n && !close.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // 吃掉结束围栏（若缺失则自然越界）
      const label = lang ? `<figcaption class="code-lang">${escapeHtml(lang)}</figcaption>` : '';
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<figure class="code-block">${label}<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre></figure>`);
      continue;
    }

    // --- 标题 ---
    const heading = RE_HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const plain = stripInline(text);
      const id = uniqueId(slugify(plain), seen);
      if (level === 2 || level === 3) headings.push({ level, text: plain, id });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // --- 分割线 ---
    if (RE_HR.test(line)) { out.push('<hr>'); i++; continue; }

    // --- 引用 ---
    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < n && RE_QUOTE.test(lines[i])) { buf.push(lines[i].replace(RE_QUOTE, '')); i++; }
      out.push(`<blockquote>${parseBlocks(buf, headings, seen)}</blockquote>`);
      continue;
    }

    // --- 表格 ---
    if (line.includes('|') && i + 1 < n && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map((cell) => {
        const t = cell.trim();
        const left = t.startsWith(':');
        const right = t.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return '';
      });
      i += 2;
      const rows = [];
      while (i < n && lines[i].trim() && lines[i].includes('|')) { rows.push(splitRow(lines[i])); i++; }
      const head = header
        .map((cell, idx) => `<th${alignAttr(aligns[idx])}>${inline(cell)}</th>`)
        .join('');
      const body = rows
        .map((row) => `<tr>${header.map((_c, idx) => `<td${alignAttr(aligns[idx])}>${inline(row[idx] ?? '')}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }

    // --- 列表 ---
    if (RE_LIST.test(line)) {
      const buf = [];
      while (i < n) {
        const cur = lines[i];
        if (RE_LIST.test(cur) || /^\s+\S/.test(cur)) { buf.push(cur); i++; continue; }
        if (!cur.trim()) {
          let k = i + 1;
          while (k < n && !lines[k].trim()) k++;
          if (k < n && (RE_LIST.test(lines[k]) || /^\s+\S/.test(lines[k]))) { buf.push(''); i++; continue; }
        }
        break;
      }
      out.push(renderList(buf));
      continue;
    }

    // --- 段落 ---
    const buf = [];
    while (i < n && lines[i].trim() && !isBlockStart(lines, i)) { buf.push(lines[i]); i++; }
    if (!buf.length) { buf.push(lines[i]); i++; } // 兜底，避免死循环
    out.push(`<p>${inline(buf.join('\n'))}</p>`);
  }

  return out.join('\n');
}

function alignAttr(align) {
  return align ? ` style="text-align:${align}"` : '';
}

function splitRow(row) {
  return row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function uniqueId(id, seen) {
  const count = seen.get(id) ?? 0;
  seen.set(id, count + 1);
  return count === 0 ? id : `${id}-${count + 1}`;
}

/** 把列表行整理成嵌套结构，再渲染 */
function renderList(buf) {
  const items = [];
  // 缩进层级栈：不假设「两格一层」，2 格、3 格还是 4 格都能正确识别
  const levels = [];

  for (const raw of buf) {
    const m = RE_LIST.exec(raw);
    if (m) {
      const indent = m[1].replace(/\t/g, '    ').length;
      let idx = levels.findIndex((v) => indent <= v);
      if (idx === -1) {
        levels.push(indent);
        idx = levels.length - 1;
      } else {
        levels.length = idx + 1;
        levels[idx] = indent;
      }
      items.push({ level: idx, ordered: /\d/.test(m[2]), text: m[3].trim() });
    } else if (items.length) {
      // 续行：并到上一条，普通换行视作空格
      const extra = raw.trim();
      if (extra) items[items.length - 1].text += ` ${extra}`;
    }
  }
  if (!items.length) return '';

  // 用「栈」还原层级：stack[d] 是第 d 层的最近一个节点
  const root = { children: [] };
  const stack = [root];
  for (const it of items) {
    stack.length = Math.min(stack.length, it.level + 1);
    const parent = stack[stack.length - 1];
    const node = { ordered: it.ordered, text: it.text, children: [] };
    parent.children.push(node);
    stack.push(node);
  }
  return renderNodes(root.children);
}

function renderNodes(nodes) {
  let html = '';
  let i = 0;
  while (i < nodes.length) {
    const ordered = nodes[i].ordered;
    const group = [];
    while (i < nodes.length && nodes[i].ordered === ordered) group.push(nodes[i++]);
    const tag = ordered ? 'ol' : 'ul';
    const lis = group
      .map((node) => {
        const nested = node.children.length ? renderNodes(node.children) : '';
        return `<li>${inline(node.text)}${nested}</li>`;
      })
      .join('');
    html += `<${tag}>${lis}</${tag}>`;
  }
  return html;
}

/* ------------------------------------------------------------------ */
/* front matter + 入口                                                 */
/* ------------------------------------------------------------------ */

function unquote(value) {
  const m = /^(['"])([\s\S]*)\1$/.exec(value.trim());
  return m ? m[2] : value;
}

/** 这些键即使用逗号写法也要解析成数组 */
const LIST_KEYS = new Set(['tags', 'keywords', 'categories']);

/**
 * 解析 --- 包裹的头部信息。
 *
 * 同时支持这几种写法，方便直接用 Obsidian / Typora 写：
 *
 *   tags: [随笔, 写作]          # 行内数组
 *   tags: 随笔, 写作            # 逗号分隔
 *   tags:                       # YAML 块状列表（Obsidian 的默认写法）
 *     - 随笔
 *     - 写作
 *   tags:
 *     - 随笔
 *
 * 另外还支持 `key:` 后面直接换行的多行字符串（用 | 或 > 标记），
 * 主要是为了摘要能写长一点。
 */
export function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  const lines = match[1].split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (!key || /^\s/.test(line)) continue; // 缩进行属于上一个键，跳过
    let value = line.slice(idx + 1).trim();

    // --- 块状列表：key: 后面跟若干 "- xxx" ---
    if (value === '') {
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (!next.trim()) {
          j++;
          continue;
        }
        const item = /^\s+-\s*(.*)$/.exec(next);
        if (!item) break;
        const v = unquote(item[1].trim());
        if (v !== '') items.push(v);
        j++;
      }
      if (items.length) {
        data[key] = items;
        i = j - 1;
        continue;
      }
      data[key] = '';
      continue;
    }

    // --- 行内数组：[a, b] ---
    if (/^\[[\s\S]*\]$/.test(value)) {
      data[key] = value
        .slice(1, -1)
        .split(/[,，]/)
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
      continue;
    }

    // --- 列表型键的逗号写法：tags: a, b ---
    if (LIST_KEYS.has(key)) {
      data[key] = value.split(/[,，]/).map((s) => unquote(s.trim())).filter(Boolean);
      continue;
    }

    // --- 普通标量 ---
    value = unquote(value);
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    data[key] = value;
  }

  return { data, body: text.slice(match[0].length) };
}

/** 解析正文，返回 { html, headings } */
export function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const headings = [];
  const seen = new Map();
  const html = parseBlocks(lines, headings, seen);
  return { html, headings };
}

/** 从正文提取纯文本，用于摘要和字数统计 */
export function toPlainText(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[>\s]*/gm, '')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
