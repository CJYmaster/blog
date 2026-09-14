/**
 * 站点配置：想改名字、简介、导航、配色，只改这一个文件就够了。
 */
export default {
  // 站点标题与小标语
  title: '苔痕集',
  tagline: '代码、阅读与生活',
  description: '一个安静的个人博客，记录代码、阅读与生活里值得留下的东西。',
  author: '你的名字',

  // 部署后的域名（生成 RSS 时需要绝对地址）。本地预览随便填。
  siteUrl: 'https://CJYmaster.github.io/blog',

  // 首页顶部的一句话
  hero: {
    title: '苔痕上阶绿，草色入帘青。',
    lead: '这里放我的长文、笔记和一些没头没尾的想法。慢慢写，慢慢长。',
  },

  // 顶部导航
  nav: [
    { text: '首页', href: 'index.html', key: 'home' },
    { text: '归档', href: 'archive.html', key: 'archive' },
    { text: '标签', href: 'tags/index.html', key: 'tags' },
    { text: '关于', href: 'about.html', key: 'about' },
  ],

  // 首页按月分页：显示最近几个月，其余月份折叠成「更早的文章」
  // 0 = 全部展开；每篇文章都有独立的永久链接 pages/YYYY-MM.html，不受折叠影响
  postsOnHome: 6,

  // 页脚
  footer: {
    icp: '', // 例如 '京ICP备00000000号'
    since: 2026,
  },
};