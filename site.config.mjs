/**
 * 站点配置：想改名字、简介、导航、配色，只改这一个文件就够了。
 */
export default {
  // 站点标题与小标语
  title: '凝痕',
  tagline: '飞鸿踏雪',
  description: '人生到处知何似，应似飞鸿踏雪泥。这里记录代码、阅读与生活里留下的痕迹。',
  author: '你的名字',

  // 部署后的域名（生成 RSS 时需要绝对地址）。本地预览随便填。
  siteUrl: 'https://CJYmaster.github.io/blog',

  // 首页顶部的一句话（出自苏轼《和子由渑池怀旧》）
  hero: {
    title: '人生到处知何似，应似飞鸿踏雪泥。',
    lead: '鸿飞东西，雪泥上留下爪痕。这里放我的长文、笔记和一些没头没尾的想法——写下来，就算数。',
  },

  // 顶部导航
  nav: [
    { text: '首页', href: 'index.html', key: 'home' },
    { text: '归档', href: 'archive.html', key: 'archive' },
    { text: '标签', href: 'tags/index.html', key: 'tags' },
    { text: '关于', href: 'about.html', key: 'about' },
  ],

  /*
   * 左侧栏的内容模块（竖排）。
   *
   * sub 是小分类的「后台名单」，只影响左侧栏的默认顺序。
   * 你不用手动维护它 —— 文章里写 sub: 新名字，构建时会自动补进来。
   * 想让某个小分类排在前面，就在这里列出；其余按出现顺序追加。
   *
   * 文章用 front matter 标记归属：
   *   module: web
   *   sub: 前端
   * 不写 module 的文章会归入「未分类」。
   */
  modules: [
    {
      key: 'crypto',
      name: '密码学',
      desc: '对称与公钥密码、哈希、协议与安全边界。',
      subs: [],
    },
    {
      key: 'web',
      name: 'web',
      desc: '前端、后端、工程化，以及这条链路上的各种坑。',
      subs: [],
    },
    {
      key: 'misc',
      name: '琐碎',
      desc: '不成体系的想法、随手记下的小事。',
      subs: [],
    },
  ],

  // 文章没有写 module 时归入的模块名
  defaultModule: '未分类',

  // 首页按月分页：显示最近几个月，其余月份折叠成「更早的文章」
  // 0 = 全部展开；每篇文章都有独立的永久链接 pages/YYYY-MM.html，不受折叠影响
  postsOnHome: 6,

  // 页脚
  footer: {
    icp: '', // 例如 '京ICP备00000000号'
    since: 2026,
  },
};