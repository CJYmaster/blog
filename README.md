# 凝痕 · 极简个人博客

一个**零依赖**的静态博客：文章用 Markdown 写，构建脚本（约 200 行 Node.js）把它们变成静态 HTML。
没有框架、没有 `node_modules`、没有后台，只有纯文本和一点点卡其色配苔绿。

```
posts/*.md  ──build.mjs──▶  dist/*.html  ──▶  任意静态托管
```

## 快速开始

需要 Node.js 18 或更高版本（不需要 `npm install`，因为没有依赖）。

```bash
node build.mjs        # 构建，输出到 dist/
node serve.mjs        # 构建 + 起本地预览 http://localhost:4321
node serve.mjs --watch   # 预览并监听文件改动，自动重建
```

也可以直接用 npm script：

```bash
npm run build
npm run dev      # = node serve.mjs --watch
```

生成好的 `dist/index.html` 也可以直接双击打开——所有链接都是相对路径，不依赖服务器。

## 写一篇新文章

在 `posts/` 里新建一个 `.md` 文件即可，文件名建议以日期开头：

```
posts/2026-09-20-my-new-post.md
```

文件内容：

```markdown
---
title: 文章标题
date: 2026-09-20
module: web
sub: 工程化
tags: [随笔, 工具]
summary: 一句话摘要，会显示在首页卡片和 RSS 里。
draft: false
---

正文从这里开始，正常写 Markdown 就行。
```

头部字段说明：

| 字段 | 必填 | 说明 |
| --- | :---: | --- |
| `title` | 是 | 文章标题；不填则用文件名 |
| `date` | 建议 | `YYYY-MM-DD`；不填会用文件名里的日期，再不行用今天 |
| `module` | 否 | 内容模块（左侧栏的那一竖列），不写归入「未分类」 |
| `sub` | 否 | 模块内的小分类，会出现在模块页顶部的筛选条里 |
| `tags` | 否 | `[a, b]`、`a, b`、或 YAML 的 `- a` 列表都可以 |
| `summary` | 否 | 不填则自动截取正文前 96 个字 |
| `draft` | 否 | `true` 时构建会跳过（加 `--drafts` 可强制生成） |
| `slug` | 否 | 自定义 URL，默认取文件名去掉日期前缀 |

文件名里的日期前缀**不会**进入 URL：`2026-09-20-my-new-post.md` → `posts/my-new-post.html`。

新建文章后重新 `npm run build` 即可。`npm run dev` 模式下会自动重建，刷新浏览器就能看到。

## 支持的 Markdown 语法

| 语法 | 写法 | 备注 |
| --- | --- | --- |
| 标题 | `## 二级` ~ `###### 六级` | h2/h3 会自动生成目录与锚点 |
| 强调 | `**粗体**`、`*斜体*`、`~~删除线~~` | |
| 行内代码 | `` `code` ``、`` `` `含反引号` `` `` | |
| 代码块 | ` ```js ` … ` ``` ` | 右上角有复制按钮，带语言标签 |
| 列表 | `-`、`*`、`1.` | 支持任意缩进宽度的嵌套 |
| 引用 | `> 内容` | 可多段，内部可继续用其他语法 |
| 表格 | `\| a \| b \|` + `\| --- \|` | 支持 `:---:` 对齐 |
| 链接 / 图片 | `[文字](url)`、`![alt](url)` | 外链自动加 `target="_blank"` |
| 分割线 | `---` 或 `***` | |
| 硬换行 | 行尾两个空格 | |

不支持（也暂时不打算支持）：内联 HTML、脚注、数学公式、任务列表。

## 目录结构

```
.
├── .github/workflows/deploy.yml   # 推送到 main 自动发布到 GitHub Pages
├── build.mjs            # 构建脚本：读 Markdown → 写 dist/
├── serve.mjs            # 本地预览服务器（含 --watch 热重建）
├── site.config.mjs      # ★ 站点配置：站名、简介、导航、域名
├── posts/               # 文章，一篇一个 .md
├── content/             # 独立页面，如 about.md → dist/about.html
├── src/
│   ├── markdown.mjs     # 自己写的 Markdown 解析器
│   ├── templates.mjs    # 页面模板（首页/文章/月度页/归档/标签/404/RSS）
│   └── assets/          # style.css、main.js、favicon.svg
└── dist/                # 构建产物（已在 .gitignore 中）
```

## 生成的页面

| 文件 | 内容 |
| --- | --- |
| `index.html` | 首页：站点介绍 + 模块导航 + 按月分组的文章列表 |
| `modules/<模块>.html` | 模块页：小分类筛选条 → 按月分组，结构与首页一致 |
| `posts/<slug>.html` | 文章页：大纲目录、上一篇/下一篇、复制代码、阅读进度 |
| `pages/<YYYY-MM>.html` | 每个月的独立列表页（如 `pages/2026-08.html`），有稳定的永久链接 |
| `archive.html` | 归档：按年 → 按月，月份标题可点进月度页 |
| `tags/index.html`、`tags/<tag>.html` | 标签总览与标签页 |
| `about.html` | 来自 `content/about.md` |
| `feed.xml` | RSS 2.0（最近 20 篇文章 + 各月份归档页） |
| `404.html` | 404 页面（静态托管平台可指向它） |

`content/` 下的每个 `.md` 都会生成一个同名页面，所以想加「友链」「现在」这类页面，放个 Markdown 文件就行。

## 内容模块（左侧栏）

站点按**内容模块**分块，宽屏下模块竖排在页面左侧，窄屏自动折叠成顶部横向导航。

```
┌─────────┬──────────────────────────────┐
│ 模块     │   ★ 小分类筛选条              │
│  全部  3 │   [全部] [工程化] [随笔]      │
│  web   1 │                              │
│  琐碎  2 │   2026 年九月                 │
│         │     · 一篇文章                │
│         │   2026 年八月                 │
│         │     · 另一篇文章              │
└─────────┴──────────────────────────────┘
```

- **模块**：一篇文章属于一个模块，用 `module: web` 标记
- **小分类**：模块内再细分，用 `sub: 工程化` 标记；模块页顶部出现筛选 chip，可单选也可点「全部」
- 点左侧模块进入 `modules/<模块>.html`，页面结构与首页一致（小分类 → 月份 → 文章）

### 加一个新模块

**不需要改配置**，在文章里写就行：

```markdown
---
title: 分组密码的几种模式
module: 密码学
sub: 对称加密
---
```

构建时模块会自动出现在左侧栏。构建日志里会提示一次「模块不在 modules 中，已自动加入」。

如果想**控制顺序或加一句描述**，再编辑 `site.config.mjs`：

```js
modules: [
  { key: 'crypto', name: '密码学', desc: '对称与公钥密码、哈希、协议。', subs: [] },
  { key: 'web',    name: 'web',    desc: '前端、后端、工程化。',        subs: [] },
  { key: 'misc',   name: '琐碎',   desc: '不成体系的想法。',            subs: [] },
],
```

`subs` 是小分类的「后台名单」，只影响模块页里 chips 的**排列顺序**；不列也会按实际出现情况自动收集。想让你常用的小分类排在前面，就在这里列出来。

**没有文章的空模块不会出现在左侧栏**（点了也是空的），所以你可以先把模块名写进配置，等有内容了它自动出现。

### 用 Obsidian 写笔记

`posts/` 可以直接当作 Obsidian 的 vault 打开，front matter 两种写法都支持：

```markdown
tags: [随笔, 写作]      # 行内写法
tags:                   # Obsidian 默认的块状写法
  - 随笔
  - 写作
```

`.obsidian/` 工作区目录已加入 `.gitignore`，不会提交到仓库。

## 按月分页

文章按自然月分组，**每个月都会生成一个独立页面**，所以任何月份都有固定链接：

```
dist/pages/2026-08.html   ← 2026 年 8 月的全部文章
dist/pages/2026-07.html
```

三个地方可以进入这些页面：

1. **首页列表**：按月份分组，每组有「2026 年八月 · 1 篇」的月份标题，悬停时右侧出现「单独打开」
2. **首页筛选条**：点月份 chip 就地筛选当前列表（纯前端，不跳转），此时「更早的文章」按钮会收起
3. **归档页**：`archive.html` 按年 → 按月展开，月份标题可点击

首页一次展开多少个月由配置决定：

```js
postsOnHome: 6,   // 只展开最近 6 个月，更早的折叠成「更早的文章 →」按钮
                  // 填 0 则全部展开
```

**折叠只影响首页**：所有月份页和每篇文章的永久链接始终会生成，RSS 与搜索引擎都不受影响。月度页底部还有「更新的一个月 / 更早的一个月」翻页导航。

## 改配置

打开 `site.config.mjs`，改这几项：

```js
export default {
  title: '凝痕',
  tagline: '代码、阅读与生活',
  author: '你的名字',
  siteUrl: 'https://example.com',   // ← 部署后改成真实域名，RSS 用得到
  hero: { title: '…', lead: '…' },
  nav: [ /* 导航项 */ ],
  postsOnHome: 6,                    // 首页展开最近几个月，0 = 全部
  footer: { icp: '', since: 2026 },
};
```

配色在 `src/assets/style.css` 顶部的 `:root` 里，改这一组变量就能换掉整体气质：

```css
--paper: #f7f4eb;    /* 纸色（浅卡其） */
--moss: #6e8f68;     /* 主色（苔绿） */
--ink: #2c312c;      /* 正文墨色 */
```

## 部署

构建产物是纯静态文件，任何地方都能放：

```bash
npm run build     # 然后把 dist/ 整个目录传上去
```

- **Vercel / Netlify**：构建命令 `node build.mjs`，发布目录 `dist`
- **自己的服务器**：`dist/` 丢进 Nginx 目录，指向 `index.html`，404 页面设为 `404.html`
- **GitHub Pages**：见下一节

记得把 `site.config.mjs` 里的 `siteUrl` 换成真实域名，否则 RSS 里的链接是 `example.com`。

### GitHub Pages（已配好自动部署）

仓库里已经带了 `.github/workflows/deploy.yml`：**推送到 `main` 就会自动构建并发布**，本机不用手动构建，`dist/` 也不需要进仓库。

首次配置只要三步：

1. 在 GitHub 上建一个**公开**仓库（免费账户只有公开仓库能发布 Pages），把本地代码推上去：

   ```bash
   git init
   git add .
   git commit -m "初始化博客"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
   ⚠️ 这一步最关键：留在默认的 `Deploy from a branch`，GitHub 会拿仓库根目录当 Jekyll 站点构建，结果是空白页或 404。

3. 改 `site.config.mjs` 里的 `siteUrl` 为最终地址，再 push 一次：

   ```js
   siteUrl: 'https://你的用户名.github.io/仓库名',
   ```

之后每次写笔记只需：

```bash
git add . && git commit -m "新笔记：xxx" && git push
```

约一分钟后在 **Actions** 标签页看到绿勾，站点即更新。构建失败时点进那次运行看日志，最常见的原因是 Markdown 头部的 YAML 写坏了（比如 `tags: [a, b` 少了 `]`）。

> 构建脚本会顺手在 `dist/` 里生成一个空的 `.nojekyll`。GitHub Pages 默认用 Jekyll 处理站点，遇到以 `_` 开头的文件或目录会拒绝上传；有了这个文件就关掉了限制，以后你放 `_cover.jpg` 这类资源也不会出问题。

> 站点地址形如 `用户名.github.io/仓库名/`，多了一层子路径。本项目所有链接都是相对路径，所以无需任何改动即可正常工作；但如果之后绑定了自定义域名（站点搬到根目录），记得同步修改 `siteUrl`，去掉仓库名那一段。

## 一点设计说明

- **所有链接都是相对路径**，所以站点放在子目录（比如 `example.com/blog/`）也能直接用
- **先转义再解析**，正文里写 `<script>` 只会显示成文本，不会被执行
- **链接协议白名单**，`javascript:` 这类地址会被替换成 `#`
- **脚本只做增强**：关掉 JavaScript，页面照样能读，只是少了搜索和复制按钮

## 常见问题

**改了 `site.config.mjs` 要重启预览吗？**
不用。`build.mjs` 每次都重新读配置，`--watch` 模式下保存即生效。

**首页按月分页会不会让旧文章消失？**
不会。折叠只作用于首页那一个列表；`pages/<年月>.html`、`posts/<slug>.html`、`archive.html`、`feed.xml` 里始终包含全部文章。用旧博客迁移过来时，每篇文章的永久链接也不会变。

**文章很多会不会很慢？**
不会。这个博客的构建是先把所有文章读进内存再一次写完，几百篇也在一百毫秒量级。真到几千篇再考虑增量构建。

**能加评论吗？**
加评论就意味着要引第三方脚本或自建服务，和「零依赖」冲突。现在的做法是留邮箱，让读者写信。

## 许可

代码随意使用（MIT）。文章内容归作者所有。
