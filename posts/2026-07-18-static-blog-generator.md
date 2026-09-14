---
title: 用两百行 Node.js 写一个静态博客生成器
date: 2026-07-18
tags: [Node.js, 工具, 教程]
summary: 不装任何依赖，从零实现 front matter、Markdown 解析、列表嵌套和模板渲染。拆开来看，静态站点生成器没那么神秘。
---

市面上的静态站点生成器很多，但大多数时候，我们需要的功能只是：**把 Markdown 变成 HTML，再套一层模板**。这件事用两百行 Node.js 就能做完，而且不用装任何依赖。

下面是我这个博客的核心实现，拆成四块讲。

## 第一步：解析 front matter

文章头部用 `---` 包一段元信息，这是 Jekyll 定下的惯例，简单好用：

```markdown
---
title: 一篇文章
date: 2026-07-18
tags: [Node.js, 教程]
---
正文从这里开始。
```

解析就是一个正则加一次循环：

```js
export function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, body: text };

  const data = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (/^\[[\s\S]*\]$/.test(value)) {
      value = value.slice(1, -1).split(',').map((s) => s.trim());
    }
    data[key] = value;
  }
  return { data, body: text.slice(match[0].length) };
}
```

注意 `indexOf(':')` 而不是 `split(':')`——摘要里出现冒号是常事，只切第一个就够了。

## 第二步：Markdown 解析的关键在「行内」和「块级」

所有 Markdown 解析器都在处理同一个问题：**哪些语法作用于一整块，哪些语法只作用在一行之内**。

块级先扫一遍：围栏代码块、标题、列表、引用、表格、分割线，剩下的都是段落。行内再扫一遍：粗体、斜体、链接、行内代码。

顺序至关重要。**行内代码必须最先抽出来**，否则 `` `a * b` `` 里的星号会被当成斜体：

```js
function inline(text) {
  const codes = [];
  let out = escapeHtml(text);

  // 先抽出代码，用占位符顶替
  out = out.replace(/`([^`\n]+)`/g, (_m, code) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // …链接、斜体、删除线

  // 最后还原
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
}
```

另一个细节是**先转义再解析**。如果先解析再转义，正文里写 `<script>` 就真的会变成脚本标签。

## 第三步：嵌套列表

这是最容易写错的部分。我的做法是先把列表行拍平成 `{ level, ordered, text }`：

```js
const RE_LIST = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;
```

缩进每多两格，层级加一。然后用一个**栈**把扁平数组还原成树：

```js
const root = { children: [] };
const stack = [root];

for (const item of items) {
  stack.length = Math.min(stack.length, item.level + 1);
  const node = { ...item, children: [] };
  stack[stack.length - 1].children.push(node);
  stack.push(node);
}
```

`stack.length = Math.min(...)` 这一行是整个算法的核心：

- 遇到 **更深** 的条目，栈保留，新节点挂到栈顶节点下面
- 遇到 **同级** 或 **更浅** 的条目，先弹栈，再挂到新的栈顶

渲染时按 `ordered` 分组，连续的无序条目合成一个 `<ul>`，有序的合成 `<ol>`：

```js
function renderNodes(nodes) {
  let html = '';
  let i = 0;
  while (i < nodes.length) {
    const ordered = nodes[i].ordered;
    const group = [];
    while (i < nodes.length && nodes[i].ordered === ordered) group.push(nodes[i++]);
    const tag = ordered ? 'ol' : 'ul';
    const lis = group.map((n) => `<li>${inline(n.text)}${
      n.children.length ? renderNodes(n.children) : ''
    }</li>`).join('');
    html += `<${tag}>${lis}</${tag}>`;
  }
  return html;
}
```

## 第四步：模板就是字符串拼接

不用模板引擎。现代 JavaScript 的模板字符串已经够用了，还自带转义意识：

```js
export function layout({ site, content, prefix = '' }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(site.title)}</title>
  <link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>${content}</body>
</html>`;
}
```

这里的 `prefix` 值得说一下：首页是 `prefix = ''`，文章页在 `posts/` 目录里，`prefix = '../'`。

**用相对路径而不是绝对路径**，生成出来的站点既能挂在服务器上，也能直接双击打开看，不需要起一个本地服务器。调试的时候省事很多。

## 目录结构

最后整站长这样：

```text
.
├── build.mjs            # 构建脚本
├── serve.mjs            # 本地预览（含热重建）
├── site.config.mjs      # 站点配置
├── posts/               # 文章，一个 .md 一个文件
│   └── 2026-07-18-xxx.md
├── content/             # 独立页面，如「关于」
└── src/
    ├── markdown.mjs     # 解析器
    ├── templates.mjs    # 模板
    └── assets/          # css / js / 图标
```

构建一次不到 50 毫秒，改完按一下 `npm run build`，完事。

## 要不要自己写

诚实地说：**如果你只是想尽快开始写作，用现成的工具**。Astro、Hugo、Eleventy 都比这两百行强大得多。

但如果你和我一样，觉得「造一个刚好够用的轮子」这件事本身让人愉快，那非常推荐试一次。你会顺便弄明白：

1. Markdown 到底是怎么解析的
2. 模板引擎在替你做什么
3. 为什么有的生成器构建那么慢

写完这两百行之后，再用别的工具，感觉是不一样的。
