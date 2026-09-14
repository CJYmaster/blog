#!/usr/bin/env node
/**
 * 静态博客生成器
 *
 *   node build.mjs            正式构建（忽略 draft: true 的文章）
 *   node build.mjs --drafts   连草稿一起生成
 *
 * 输入：posts/*.md、content/*.md、src/assets/*
 * 输出：dist/
 */

import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderMarkdown, parseFrontMatter, toPlainText, slugify } from './src/markdown.mjs';
import {
  renderHome,
  renderPost,
  renderArchive,
  renderMonthPage,
  renderTags,
  renderTagPage,
  renderPage,
  render404,
  renderFeed,
  yearOf,
} from './src/templates.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, 'posts');
const PAGES_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const OUT_DIR = path.join(ROOT, 'dist');

const includeDrafts = process.argv.includes('--drafts');

/** 每次都重新读配置，配合 serve.mjs 的热重建，改配置也能立刻生效 */
async function loadSite() {
  const mod = await import(`./site.config.mjs?v=${Date.now()}`);
  return mod.default;
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

async function listMarkdown(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => path.join(dir, e.name))
    .sort();
}

async function writeOut(relative, contents) {
  const target = path.join(OUT_DIR, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return target;
}

/** 中文按字计、英文按词计，取一个粗糙但够用的阅读时长 */
function readingMinutes(plainText) {
  const cjk = (plainText.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  const words = (plainText.replace(/[\u3400-\u4dbf\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9_'’-]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 350 + words / 220));
}

function truncate(text, max = 88) {
  const value = text.trim();
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function normalizeDate(value, fallbackFromName) {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (fallbackFromName) return fallbackFromName;
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* 读取文章                                                            */
/* ------------------------------------------------------------------ */

async function loadPosts() {
  const files = await listMarkdown(POSTS_DIR);
  const posts = [];
  const warnings = [];

  for (const file of files) {
    const base = path.basename(file, '.md');
    const raw = await readFile(file, 'utf8');
    const { data, body } = parseFrontMatter(raw);

    const dateFromName = /^(\d{4}-\d{2}-\d{2})/.exec(base)?.[1];
    const date = normalizeDate(data.date, dateFromName);

    if (data.draft === true && !includeDrafts) continue;
    if (!data.title) warnings.push(`${base}.md 缺少 title，已用文件名代替`);
    if (!data.date && !dateFromName) warnings.push(`${base}.md 缺少 date，已用今天代替`);

    const title = data.title ? String(data.title) : base;
    // 文件名里的日期前缀不进 URL，保持短链接
    const slugSource = data.slug ? String(data.slug) : base.replace(/^\d{4}-\d{2}-\d{2}-?/, '') || base;
    const slug = slugify(slugSource);

    const { html, headings } = renderMarkdown(body);
    const plain = toPlainText(body);

    const tags = (Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : []).map((name) => String(name).trim()).filter(Boolean);

    posts.push({
      file: base,
      slug,
      title,
      date,
      summary: data.summary ? String(data.summary) : truncate(plain, 96),
      tags,
      draft: data.draft === true,
      minutes: readingMinutes(plain),
      html,
      headings,
      body,
      url: `posts/${slug}.html`,
    });
  }

  // 日期倒序；同一天按标题稳定排序
  posts.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title, 'zh') : a.date < b.date ? 1 : -1));

  // slug 去重
  const used = new Map();
  for (const post of posts) {
    const count = used.get(post.slug) ?? 0;
    used.set(post.slug, count + 1);
    if (count > 0) {
      post.slug = `${post.slug}-${count + 1}`;
      post.url = `posts/${post.slug}.html`;
      warnings.push(`slug 重复：${post.file}.md 已改为 ${post.slug}`);
    }
  }

  return { posts, warnings };
}

/** 汇总标签，返回 [{ name, slug, count }]，按文章数倒序 */
function collectTags(posts) {
  const map = new Map();
  const slugSeen = new Map();

  for (const post of posts) {
    post.tags = post.tags.map((name) => {
      if (!map.has(name)) {
        let slug = slugify(name);
        const seen = slugSeen.get(slug) ?? 0;
        slugSeen.set(slug, seen + 1);
        if (seen > 0) slug = `${slug}-${seen + 1}`;
        map.set(name, { name, slug, count: 0 });
      }
      const tag = map.get(name);
      tag.count += 1;
      return { name: tag.name, slug: tag.slug };
    });
  }

  return [...map.values()].sort((a, b) => (b.count === a.count ? a.name.localeCompare(b.name, 'zh') : b.count - a.count));
}

/* ------------------------------------------------------------------ */
/* 按月分组                                                            */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function monthKeyOf(date) {
  return String(date).slice(0, 7); // '2026-08'
}

function monthMeta(key) {
  const [year, month] = key.split('-');
  const idx = Number(month) - 1;
  return {
    key,
    year,
    month,
    label: `${year} 年 ${MONTH_NAMES[idx] ?? `${Number(month)} 月`}`,
    url: `pages/${key}.html`,
  };
}

/* ------------------------------------------------------------------ */
/* 构建                                                                */
/* ------------------------------------------------------------------ */

export async function build() {
  const started = Date.now();
  const site = await loadSite();
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const { posts, warnings } = await loadPosts();
  const tagCloud = collectTags(posts);
  const postsByTag = new Map(tagCloud.map((t) => [t.name, []]));
  for (const post of posts) for (const tag of post.tags) postsByTag.get(tag.name)?.push(post);

  // --- 按月分组：posts 已按日期倒序，所以 months 天然是从新到旧 ---
  const months = [];
  const monthIndexOf = new Map();
  for (const post of posts) {
    const key = monthKeyOf(post.date);
    if (!monthIndexOf.has(key)) {
      monthIndexOf.set(key, months.length);
      months.push({ ...monthMeta(key), posts: [] });
    }
    months[monthIndexOf.get(key)].posts.push(post);
  }

  // --- 首页：按月分块，超出上限的旧月份折叠成「更早的文章」 ---
  const monthsOnHome = Number(site.postsOnHome) || 0;
  const homeMonths = monthsOnHome > 0 ? months.slice(0, monthsOnHome) : months;
  const folded = monthsOnHome > 0 ? months.slice(monthsOnHome) : [];
  const blocks = homeMonths.map((m) => ({
    key: m.key,
    heading: { label: m.label, datetime: m.key, href: m.url },
    posts: m.posts,
  }));

  await writeOut(
    'index.html',
    renderHome({
      site,
      prefix: '',
      blocks,
      total: posts.length,
      months,
      newestMonth: months[0]?.key ?? '',
      olderLink: folded.length
        ? {
            url: folded[0].url,
            label: `${folded[0].label} 起 ${folded.reduce((n, m) => n + m.posts.length, 0)} 篇`,
          }
        : null,
    }),
  );

  // 文章页（prefix 用 ../，这样直接双击 dist 里的文件也能打开）
  await Promise.all(
    posts.map((post, index) =>
      writeOut(
        post.url,
        // prev = 更早的一篇，next = 更新的一篇
        renderPost({ site, prefix: '../', post, prev: posts[index + 1], next: posts[index - 1] }),
      ),
    ),
  );

  // --- 归档 + 每个月一个独立页面 ---
  const groups = [];
  for (const month of months) {
    const year = month.year;
    let group = groups.find((g) => g.year === year);
    if (!group) groups.push((group = { year, months: [], count: 0 }));
    group.months.push(month);
    group.count += month.posts.length;
  }
  await writeOut('archive.html', renderArchive({ site, prefix: '', groups, total: posts.length }));

  await Promise.all(
    months.map((month, index) =>
      writeOut(
        month.url,
        renderMonthPage({
          site,
          prefix: '../',
          month,
          posts: month.posts,
          newer: months[index - 1], // 更新的一个月
          older: months[index + 1], // 更早的一个月
        }),
      ),
    ),
  );

  // 标签
  await writeOut('tags/index.html', renderTags({ site, prefix: '../', tagCloud }));
  for (const tag of tagCloud) {
    await writeOut(
      `tags/${tag.slug}.html`,
      renderTagPage({ site, prefix: '../', tag, posts: postsByTag.get(tag.name) }),
    );
  }

  // 独立页面（content/*.md）
  const pageFiles = await listMarkdown(PAGES_DIR);
  const pageKeys = { about: 'about', index: 'about' };
  for (const file of pageFiles) {
    const base = path.basename(file, '.md');
    if (base === 'index') continue;
    const raw = await readFile(file, 'utf8');
    const { data, body } = parseFrontMatter(raw);
    const { html, headings } = renderMarkdown(body);
    const title = data.title ? String(data.title) : base;
    await writeOut(
      `${base}.html`,
      renderPage({
        site,
        prefix: '',
        pageKey: pageKeys[base] ?? '',
        title,
        description: data.summary ? String(data.summary) : '',
        html,
        headings,
      }),
    );
  }

  // 404 与 RSS（RSS 里也带上按月归档页）
  await writeOut('404.html', render404({ site, prefix: '' }));
  await writeOut(
    'feed.xml',
    renderFeed({
      site,
      posts,
      months: months.map((m) => ({
        url: m.url,
        title: `${m.label}的文章`,
        summary: `${m.label}一共写了 ${m.posts.length} 篇。`,
      })),
    }),
  );

  // 静态资源
  const assets = await readdir(ASSETS_DIR, { withFileTypes: true });
  await mkdir(path.join(OUT_DIR, 'assets'), { recursive: true });
  for (const asset of assets) {
    if (!asset.isFile()) continue;
    await copyFile(path.join(ASSETS_DIR, asset.name), path.join(OUT_DIR, 'assets', asset.name));
  }

  // GitHub Pages 默认会拿 Jekyll 处理站点，遇到以 _ 开头的文件或目录会直接拒绝上传。
  // 放一个空的 .nojekyll 就能关掉 Jekyll，让 _ 开头的资源也能正常发布。
  await writeOut('.nojekyll', '');

  const ms = Date.now() - started;
  console.log(
    `\n  ${site.title} 构建完成 → dist/  (${posts.length} 篇文章 · ${months.length} 个月 · ${tagCloud.length} 个标签 · ${ms}ms)\n`,
  );
  for (const warning of warnings) console.log(`  ! ${warning}`);
  if (warnings.length) console.log('');
  // 由 serve.mjs 调用时它自己会打印地址，这里就不重复了
  if (invokedDirectly) console.log(`  预览：npm run dev   然后打开 http://localhost:4321\n`);
}

// 直接运行时才执行构建；被 serve.mjs 导入时只导出 build()
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  build().catch((err) => {
    console.error('\n构建失败：', err);
    process.exit(1);
  });
}
