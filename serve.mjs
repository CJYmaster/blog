#!/usr/bin/env node
/**
 * 本地预览服务器（零依赖）
 *
 *   node serve.mjs                构建一次并启动 http://localhost:4321
 *   node serve.mjs --watch        监听 posts/ content/ src/，改动后自动重建
 *   node serve.mjs --port=8080    换端口
 *   node serve.mjs --drafts       连草稿一起预览
 *   node serve.mjs --open         启动后用默认浏览器打开
 *
 * 只做两件事：静态托管 dist/，以及（可选）在文件变化时重新构建。
 */

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, 'dist');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const withEq = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=')[1];
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('-')) return argv[idx + 1];
  return fallback;
};

const PORT = Number(value('port', 4321));
const WATCH = flag('watch');
const OPEN = flag('open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const safe = path.normalize(decoded).replace(/^([/\\])+/, '');
  const base = path.join(OUT_DIR, safe);

  // 防目录穿越
  if (!base.startsWith(OUT_DIR)) return null;

  const candidates = [base, `${base}.html`, path.join(base, 'index.html')];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* 继续试下一个 */
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const file = await resolveFile(urlPath);

  if (!file) {
    const notFound = path.join(OUT_DIR, '404.html');
    try {
      const body = await stat(notFound).then(() => createReadStream(notFound));
      res.writeHead(404, { 'Content-Type': MIME['.html'] });
      body.pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
    return;
  }

  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
});

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // stdio 用 ignore，避免在受限沙箱里因管道被拒
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

await build().catch((err) => {
  console.error('首次构建失败：', err);
  process.exit(1);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`  预览地址：${url}${WATCH ? '   （监听文件变化，自动重建）' : ''}`);
  if (OPEN) openBrowser(url);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`\n  端口 ${PORT} 已被占用，换一个：node serve.mjs --port=4322\n`);
  else console.error(err);
  process.exit(1);
});

/* ------------------------------------------------------------------ */
/* 可选：文件变化自动重建                                              */
/* ------------------------------------------------------------------ */

if (WATCH) {
  let timer = null;
  let building = false;
  let dirty = false;

  const rebuild = async () => {
    if (building) {
      dirty = true;
      return;
    }
    building = true;
    try {
      await build();
    } catch (err) {
      console.error('  重建失败：', errorMessage(err));
    } finally {
      building = false;
      if (dirty) {
        dirty = false;
        rebuild();
      }
    }
  };

  try {
    const { watch } = await import('node:fs');
    watch(ROOT, { recursive: true }, (_event, filename) => {
      const name = String(filename || '');
      if (!name || name.startsWith('dist') || name.startsWith('node_modules') || name.startsWith('.git')) return;
      clearTimeout(timer);
      timer = setTimeout(rebuild, 120);
    });
    console.log('  正在监听 posts/、content/、src/ 与配置文件的改动…\n');
  } catch (err) {
    console.warn('  当前平台不支持递归监听，已跳过 watch：', errorMessage(err));
  }
}
