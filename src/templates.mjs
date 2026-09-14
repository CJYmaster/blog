import { escapeHtml } from './markdown.mjs';

/* ------------------------------------------------------------------ */
/* 小工具                                                              */
/* ------------------------------------------------------------------ */

/** '2026-08-30' -> '2026 年 8 月 30 日' */
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return String(iso);
  const [, y, mo, d] = m;
  return `${y} 年 ${Number(mo)} 月 ${Number(d)} 日`;
}

/** '2026-08-30' -> '08 / 30'，卡片上的紧凑日期 */
export function formatShort(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[2]}.${m[3]}` : String(iso);
}

export function yearOf(iso) {
  const m = /^(\d{4})/.exec(String(iso));
  return m ? m[1] : '其他';
}

function tagLink(tag, prefix) {
  return `${prefix}tags/${encodeURIComponent(tag.slug)}.html`;
}

function tagsInline(tags, prefix) {
  if (!tags?.length) return '';
  return `<span class="tag-list">${tags
    .map((t) => `<a class="tag" href="${tagLink(t, prefix)}">${escapeHtml(t.name)}</a>`)
    .join('')}</span>`;
}

/* ------------------------------------------------------------------ */
/* 页面骨架                                                            */
/* ------------------------------------------------------------------ */

export function layout({ site, prefix = '', pageKey = '', title, description, content, bodyClass = '', extraHead = '' }) {
  const pageTitle = title ? `${title} · ${site.title}` : `${site.title} · ${site.tagline}`;
  const desc = description || site.description;
  const thisYear = new Date().getFullYear();
  const since = Number(site.footer.since) || thisYear;
  const copyright = since >= thisYear ? `${thisYear}` : `${since}–${thisYear}`;
  const nav = site.nav
    .map((item) => {
      const active = item.key === pageKey ? ' class="is-active"' : '';
      return `<a href="${prefix}${item.href}"${active}>${escapeHtml(item.text)}</a>`;
    })
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="author" content="${escapeHtml(site.author)}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F7F4EB">
<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${prefix}assets/style.css">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="${prefix}feed.xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:site_name" content="${escapeHtml(site.title)}">${extraHead}
</head>
<body class="${bodyClass}">
<div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>

<a class="skip-link" href="#main">跳到正文</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${prefix}index.html" aria-label="${escapeHtml(site.title)} 首页">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <path d="M16 26c0-7 0-10 0-13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/>
          <path d="M16 13c0-3.6-2.9-6.5-6.5-6.5 0 3.6 2.9 6.5 6.5 6.5z" fill="currentColor" opacity=".85"/>
          <path d="M16 17.5c0-3.6 2.9-6.5 6.5-6.5 0 3.6-2.9 6.5-6.5 6.5z" fill="currentColor" opacity=".5"/>
        </svg>
      </span>
      <span class="brand-text">
        <strong>${escapeHtml(site.title)}</strong>
        <em>${escapeHtml(site.tagline)}</em>
      </span>
    </a>
    <nav class="site-nav">${nav}</nav>
  </div>
</header>

<main class="wrap" id="main">
${content}
</main>

<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>© ${copyright} ${escapeHtml(site.author)} · 用 Markdown 写作，用 200 行脚本生成</p>
    <p class="footer-meta"><a href="${prefix}feed.xml">RSS</a>${site.footer.icp ? ` · <span>${escapeHtml(site.footer.icp)}</span>` : ''}</p>
  </div>
</footer>

<script src="${prefix}assets/main.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

export function postCard(post, prefix = '') {
  const tags = post.tags?.length ? ` data-tags="${escapeHtml(post.tags.map((t) => t.name).join(','))}"` : ' data-tags=""';
  return `<article class="post-card"${tags}>
  <a class="post-card-main" href="${prefix}${post.url}">
    <time class="post-card-date" datetime="${post.date}">${formatShort(post.date)}</time>
    <div class="post-card-body">
      <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
      <p class="post-card-summary">${escapeHtml(post.summary)}</p>
      <div class="post-card-meta">
        <span class="dot" aria-hidden="true"></span>
        <span>${formatDate(post.date)}</span>
        <span class="sep" aria-hidden="true">·</span>
        <span>${post.minutes} 分钟</span>
      </div>
    </div>
  </a>
  ${post.tags?.length ? `<div class="post-card-tags">${tagsInline(post.tags, prefix)}</div>` : ''}
</article>`;
}

/**
 * 文章列表的分块展示。
 * blocks：首页按月分块；标签页/单月页就是一个不分标题的块。
 */
export function postList(blocks, prefix = '') {
  const list = blocks.filter((b) => b.posts?.length);
  if (!list.length) return '<p class="empty">这里还什么都没有。</p>';

  return `<div class="post-list">${list
    .map((block) => {
      const head = block.heading
        ? `<h3 class="month-head">
      <time datetime="${block.heading.datetime}">${escapeHtml(block.heading.label)}</time>
      <span>${block.posts.length} 篇</span>
      ${block.heading.href ? `<a class="month-permalink" href="${prefix}${block.heading.href}">单独打开</a>` : ''}
    </h3>`
        : '';
      const cards = block.posts.map((p) => postCard(p, prefix)).join('\n');
      return `  <div class="post-group" data-month="${block.key || ''}">
${head ? `${head}\n` : ''}${cards}
  </div>`;
    })
    .join('\n')}</div>`;
}

export function hero({ site }) {
  return `<section class="hero">
  <p class="hero-eyebrow">${escapeHtml(site.tagline)}</p>
  <h1 class="hero-title">${escapeHtml(site.hero.title)}</h1>
  <p class="hero-lead">${escapeHtml(site.hero.lead)}</p>
</section>`;
}

/* ------------------------------------------------------------------ */
/* 各个页面                                                            */
/* ------------------------------------------------------------------ */

export function renderHome({ site, prefix = '', blocks, total, months, newestMonth, olderLink }) {
  const monthChips = months.length
    ? `<div class="chips month-chips" id="month-chips">
    <button class="chip is-active" data-month="">全部</button>
    ${months
      .map(
        (m) =>
          `<button class="chip" data-month="${m.key}">${escapeHtml(m.label)}<i>${m.posts.length}</i></button>`,
      )
      .join('')}
  </div>`
    : '';

  const toolbar = `<div class="toolbar">
  <label class="search">
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>
    <input type="search" id="search-input" placeholder="搜索标题、摘要或标签…" autocomplete="off" aria-label="搜索文章">
    <kbd>/</kbd>
  </label>
  ${monthChips}
</div>
<p class="result-hint" id="result-hint" hidden></p>`;

  const content = `${hero({ site })}
<section class="section" id="posts">
  <div class="section-head">
    <h2 class="section-title">最近写下的</h2>
    <span class="section-count">${total} 篇 · ${months.length} 个月</span>
  </div>
  ${toolbar}
  <div class="month-bar" id="month-bar" hidden>正在显示 <strong id="month-bar-label"></strong></div>
  ${postList(blocks, prefix)}
  <p class="empty" id="empty-state" hidden>没有找到匹配的文章，换个词试试？</p>
  <p class="older-link" id="older-link"${olderLink ? '' : ' hidden'}>${
    olderLink ? `<a href="${prefix}${olderLink.url}">更早的文章 · ${escapeHtml(olderLink.label)} →</a>` : ''
  }</p>
</section>`;

  return layout({
    site,
    prefix,
    pageKey: 'home',
    content,
    description: site.description,
    extraHead: `\n<meta name="newest-month" content="${newestMonth}">`,
  });
}

export function renderPost({ site, prefix = '', post, prev, next }) {
  const toc = post.headings.length
    ? `<aside class="toc" aria-label="目录">
  <p class="toc-title">目录</p>
  <ul>
    ${post.headings
      .map((h) => `<li class="toc-l${h.level}"><a href="#${h.id}" data-toc="${h.id}">${escapeHtml(h.text)}</a></li>`)
      .join('')}
  </ul>
</aside>`
    : '';

  const navParts = [];
  if (prev) navParts.push(`<a class="postnav-item prev" href="${prefix}${prev.url}"><span>上一篇</span><strong>${escapeHtml(prev.title)}</strong></a>`);
  if (next) navParts.push(`<a class="postnav-item next" href="${prefix}${next.url}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>`);

  const content = `<div class="post-layout">
  <article class="post">
    <header class="post-header">
      <p class="post-kicker">${formatDate(post.date)} · ${post.minutes} 分钟阅读</p>
      <h1 class="post-title">${escapeHtml(post.title)}</h1>
      ${post.summary ? `<p class="post-summary">${escapeHtml(post.summary)}</p>` : ''}
      ${tagsInline(post.tags, prefix)}
    </header>
    <div class="post-content" id="post-content">
${post.html}
    </div>
    <footer class="post-footer">
      ${tagsInline(post.tags, prefix)}
      <a class="back-home" href="${prefix}index.html">← 回到首页</a>
    </footer>
    ${navParts.length ? `<nav class="postnav">${navParts.join('')}</nav>` : ''}
  </article>
  ${toc}
</div>`;

  return layout({
    site,
    prefix,
    pageKey: '',
    title: post.title,
    description: post.summary,
    content,
    bodyClass: 'is-post',
    extraHead: `\n<meta property="og:type" content="article">\n<meta property="article:published_time" content="${post.date}">`,
  });
}

export function renderArchive({ site, prefix = '', groups, total }) {
  const body = groups
    .map(
      (y) => `<section class="archive-year">
  <h2 class="archive-year-title">${y.year}<span>${y.count} 篇</span></h2>
${y.months
  .map(
    (m) => `  <div class="archive-month">
    <h3 class="archive-month-title">
      <a href="${prefix}${m.url}">${escapeHtml(m.label)}</a>
      <span>${m.posts.length} 篇</span>
    </h3>
    <ul class="archive-list">
      ${m.posts
        .map(
          (p) => `<li>
        <time datetime="${p.date}">${formatShort(p.date)}</time>
        <a href="${prefix}${p.url}">${escapeHtml(p.title)}</a>
      </li>`,
        )
        .join('\n      ')}
    </ul>
  </div>`,
  )
  .join('\n')}
</section>`,
    )
    .join('\n');

  const content = `<header class="page-header">
  <h1 class="page-title">归档</h1>
  <p class="page-lead">一共 ${total} 篇，按月倒序。</p>
</header>
${body}`;

  return layout({ site, prefix, pageKey: 'archive', title: '归档', content });
}

/** 单个月份的列表页：pages/2026-08.html */
export function renderMonthPage({ site, prefix = '', month, posts, older, newer }) {
  const navParts = [];
  if (newer) navParts.push(`<a class="monthnav-item next" href="${prefix}${newer.url}"><span>更新的一个月</span><strong>${escapeHtml(newer.label)}</strong></a>`);
  if (older) navParts.push(`<a class="monthnav-item prev" href="${prefix}${older.url}"><span>更早的一个月</span><strong>${escapeHtml(older.label)}</strong></a>`);

  const content = `<header class="page-header">
  <p class="page-eyebrow">按月浏览</p>
  <h1 class="page-title">${escapeHtml(month.label)}</h1>
  <p class="page-lead">这个月写了 ${posts.length} 篇。</p>
</header>
${postList([{ key: month.key, posts }], prefix)}
${
  navParts.length
    ? `<nav class="monthnav">${navParts.join('')}</nav>`
    : ''
}
<p class="page-foot"><a class="back-home" href="${prefix}archive.html">← 全部归档</a></p>`;

  return layout({ site, prefix, pageKey: 'archive', title: month.label, content });
}

export function renderTags({ site, prefix = '', tagCloud }) {
  const content = `<header class="page-header">
  <h1 class="page-title">标签</h1>
  <p class="page-lead">共 ${tagCloud.length} 个标签，点击查看相关文章。</p>
</header>
<div class="tag-cloud">
  ${tagCloud
    .map(
      (t) => `<a class="tag-cloud-item" href="${tagLink(t, prefix)}" style="--size:${t.count}">
    <span class="tag-cloud-name">${escapeHtml(t.name)}</span>
    <span class="tag-cloud-count">${t.count}</span>
  </a>`,
    )
    .join('\n  ')}
</div>`;

  return layout({ site, prefix, pageKey: 'tags', title: '标签', content });
}

export function renderTagPage({ site, prefix = '', tag, posts }) {
  const content = `<header class="page-header">
  <p class="page-eyebrow">标签</p>
  <h1 class="page-title">${escapeHtml(tag.name)}</h1>
  <p class="page-lead">${posts.length} 篇文章</p>
</header>
${postList([{ key: `tag-${tag.slug}`, posts }], prefix)}
<p class="page-foot"><a class="back-home" href="${prefix}tags/index.html">← 全部标签</a></p>`;

  return layout({ site, prefix, pageKey: 'tags', title: `标签：${tag.name}`, content });
}

export function renderPage({ site, prefix = '', pageKey = 'about', title, description, html, headings = [] }) {
  const toc = headings.length
    ? `<aside class="toc" aria-label="目录">
  <p class="toc-title">目录</p>
  <ul>
    ${headings.map((h) => `<li class="toc-l${h.level}"><a href="#${h.id}" data-toc="${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}
  </ul>
</aside>`
    : '';

  const content = `<div class="post-layout">
  <article class="post">
    <header class="post-header">
      <h1 class="post-title">${escapeHtml(title)}</h1>
      ${description ? `<p class="post-summary">${escapeHtml(description)}</p>` : ''}
    </header>
    <div class="post-content">
${html}
    </div>
  </article>
  ${toc}
</div>`;

  return layout({ site, prefix, pageKey, title, description, content });
}

export function render404({ site, prefix = '' }) {
  const content = `<section class="notfound">
  <p class="notfound-code">404</p>
  <h1 class="page-title">这一页大概是走丢了</h1>
  <p class="page-lead">链接可能已经改了名字，或者从来没有存在过。</p>
  <p><a class="back-home" href="${prefix}index.html">← 回到首页</a></p>
</section>`;
  return layout({ site, prefix, title: '页面未找到', content });
}

/* ------------------------------------------------------------------ */
/* RSS                                                                 */
/* ------------------------------------------------------------------ */

export function renderFeed({ site, posts, months = [] }) {
  const base = site.siteUrl.replace(/\/+$/, '');
  const items = posts
    .slice(0, 20)
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${base}/${p.url}</link>
      <guid isPermaLink="true">${base}/${p.url}</guid>
      <pubDate>${new Date(`${p.date}T09:00:00+08:00`).toUTCString()}</pubDate>
      <description>${escapeHtml(p.summary)}</description>
${p.tags.map((t) => `      <category>${escapeHtml(t.name)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n');

  // 按月的归档页也放进 feed，方便用 RSS 阅读器翻旧文
  const monthItems = months
    .map(
      (m) => `    <item>
      <title>${escapeHtml(m.title)}</title>
      <link>${base}/${m.url}</link>
      <guid isPermaLink="false">${base}/${m.url}</guid>
      <description>${escapeHtml(m.summary)}</description>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${base}/</link>
    <description>${escapeHtml(site.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
${monthItems}
  </channel>
</rss>
`;
}
