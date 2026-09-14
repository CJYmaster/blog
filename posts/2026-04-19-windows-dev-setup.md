---
title: 2026 年的 Windows 开发环境：终端、包管理和那些小坑
date: 2026-04-19
tags: [Windows, 工具, Node.js]
summary: WSL 不是唯一答案。这套配置全部跑在原生 Windows 上，启动快、路径不乱、和 Windows 生态和平共处。
---

我在 Windows 上开发了八年，中间有三年完全泡在 WSL 里。今年我把大部分工作迁回了原生 Windows——不是因为 WSL 不好，而是因为我发现**自己 80% 的时间并不需要 Linux**。

这套配置的目标是三个词：**快、稳、不折腾**。

## 一、终端

Windows Terminal + PowerShell 7 已经足够好用了。装完之后要做四件事：

1. 把默认 profile 改成 PowerShell 7，而不是 Windows PowerShell 5.1
2. 字体换成 `Cascadia Code NF`（带 Nerd Font 图标，oh-my-posh 才不会显示方块）
3. 开启 `useAcrylic`，透明度调到 85%，好看且不影响可读性
4. 键位绑定：`ctrl+shift+t` 新标签，`alt+方向键` 切换标签

`$PROFILE` 里我常驻的只有这些：

```powershell
# 让 ls 好看一点
Set-Alias ll Get-ChildItem
function .. { Set-Location .. }
function ... { Set-Location ..\.. }

# git 简写
function gs { git status -sb }
function gd { git diff }
function gl { git log --oneline --graph --decorate -20 }

# 快速跳到项目目录
function ws { Set-Location $env:USERPROFILE\code }
```

**刻意不装 oh-my-posh 的完整主题**。加载一次要 300 毫秒，而一个新开的终端里，我 90% 的时间只敲两条命令。

## 二、包管理

三个工具分工明确：

| 工具 | 用途 | 备注 |
| --- | --- | --- |
| winget | 装 GUI 软件 | 系统自带，`winget upgrade --all` 一键更新 |
| scoop | 装命令行工具 | 不写注册表，卸载干净 |
| pnpm | 管项目依赖 | 硬盘占用只有 npm 的三分之一 |

scoop 的初始化只需要一次：

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop bucket add extras
scoop install git ripgrep fd bat jq delta
```

其中 `ripgrep`（`rg`）和 `fd` 是我用得最多的两个。它们比 `findstr` 和 `dir /s` 快一个数量级，而且默认忽略 `.gitignore`。

## 三、那些小坑

### 路径长度限制

Windows 默认的 260 字符路径限制，在 `node_modules` 嵌套深的时候一定会撞上。开启长路径支持：

```powershell
# 需要管理员权限
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

然后用 `git config --global core.longpaths true` 让 Git 也跟上。

### 换行符

`core.autocrlf` 是个经典陷阱：

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

配合仓库里的 `.gitattributes`：

```text
* text=auto eol=lf
*.png binary
*.bat text eol=crlf
```

**一律用 LF**。这样代码在 Windows、macOS、Linux 上都是同一份字节，不会出现「只有我这里有 diff」的灵异事件。

### 文件名大小写

NTFS 默认不区分大小写，而 Linux 区分。于是 `import './Button'` 在本地跑得好好的，CI 上就找不到文件。

解决办法有两个，我建议两个都做：

- 在 `tsconfig.json` 里打开 `"forceConsistentCasingInFileNames": true`
- 用 ESLint 的 `import/no-unresolved` 配合 `caseSensitive` 选项

### 杀毒软件的实时扫描

Windows Defender 扫描 `node_modules` 会让 `pnpm install` 慢一倍。把项目目录加进排除项：

```powershell
Add-MpPreference -ExclusionPath "C:\Users\you\code"
Add-MpPreference -ExclusionProcess "node.exe"
```

⚠️ 注意：这只在你**信任该目录下的所有代码**时才做。别排除 `Downloads`。

## 什么时候还是该用 WSL

不是所有事情都适合原生 Windows：

- 需要跑 Docker 里的 Linux 容器（虽然有 Windows 容器，但生态差得远）
- 依赖大量 Linux 专用的 C 扩展编译
- 团队统一的 CI 环境是 Ubuntu，需要本地完全对齐

我的做法是**两个都留着**：日常写应用代码在原生 Windows，碰到上面三种情况就 `wsl` 进去。

一条命令的切换，成本几乎为零。

```powershell
function w { wsl -d Ubuntu --cd (Get-Location).Path }
```

## 小结

这套配置换来的最实际的好处，是**启动快**：

- 新开一个终端：不到 400 毫秒
- 一个项目的 `pnpm dev`：3 秒内看到欢迎页
- 文件监听的响应：几乎是即时的（不用跨文件系统边界）

如果你也常年纠结「Windows 到底能不能做开发」，我的答案是能，而且越来越好。前提是**别硬搬 Linux 的习惯**，用 Windows 自己的工具链，反而更顺。
