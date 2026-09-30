---
title: Markdown 语法样例
date: 2026-07-18
module: web安全
sub: 工具与技巧
tags:
  - Markdown
  - 写作
summary: 一篇用来演示本站支持的全部 Markdown 语法的样例笔记。写新文章时可以照着这里改。
---

这是一篇**样例笔记**，用来演示本站支持的 Markdown 语法。写新文章时，可以直接复制这个文件，把内容换成你自己的。

## 标题

用 `#` 到 `######` 表示一到六级标题。`##` 和 `###` 会自动出现在右侧目录里。

### 三级标题会长这样

#### 四级标题

## 文字样式

这是普通段落。可以写 **加粗**、*斜体*、~~删除线~~，同一段里混用没问题。

需要强制换行时，在行尾敲两个空格。  
这一行就会另起一行，但仍属于同一段。

## 列表

无序列表：

- 第一项
- 第二项
  - 嵌套的子项（缩进两格）
  - 另一个子项
- 第三项

有序列表：

1. 第一步
2. 第二步
3. 第三步

带说明的列表（缩进对齐后会被并入上一项）：

- 漏洞等级
  Low → Medium → High → Impossible
  这行是上一条的续行说明。

## 代码

行内代码用反引号，比如 `npm run build`、`parseFrontMatter()`。

代码块标明语言后，右上角会出现复制按钮：

```js
export function parseFrontMatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };
  return { data: match[1], body: raw.slice(match[0].length) };
}
```

```shell
git clone https://github.com/digininja/DVWA.git
cd DVWA
docker compose up -d
```

## 引用

> 引用用于摘录原文或强调观点。
>
> 可以有多段，内部也能用 **加粗** 和 `行内代码`。

## 表格

| 语法 | 写法 | 说明 |
| --- | :---: | ---: |
| 标题 | `## 标题` | 二到六级 |
| 加粗 | `**文字**` | |
| 链接 | `[文字](url)` | 外链自动新窗口打开 |

表格支持对齐：`:---` 左对齐、`:---:` 居中、`---:` 右对齐。

## 链接与分割线

普通链接：[GitHub](https://github.com/)，外部链接会自动在新标签页打开。

下面是分割线：

---

## 图片

标准写法：

```markdown
![说明文字](图片/示例.png)
```

如果使用 Obsidian，也可以直接写 wiki 语法：

```markdown
![[示例.png]]
```

两种写法都支持。图片放在 `posts/` 下的任意子目录都行，构建时会自动按文件名找到并复制。

## 写作提示

1. **头部信息**：`title`、`date`、`module`、`sub` 决定文章出现在哪个模块与月份
2. **摘要**：不写 `summary` 时，会自动截取正文前 96 个字
3. **草稿**：加一行 `draft: true`，构建时会跳过这篇
4. **标签**：`tags` 支持 `[a, b]`、`a, b` 和 `- a` 三种写法

写完在项目目录运行 `npm run dev`，浏览器里就能看到效果。
