import { defineConfig } from 'vitepress';
import navigation from './navigation.json' with { type: 'json' };

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 知识库',
  description: '面向职场人与学习者的 AI 原理、前沿能力、应用实践与安全合规文档。',
  srcDir: './.vitepress/content',
  cleanUrls: false,
  lastUpdated: true,
  transformPageData(pageData) {
    const { updated_at, lastUpdated } = pageData.frontmatter;
    if (!updated_at || lastUpdated === false) return;
    const timestamp = new Date(updated_at).getTime();
    if (!Number.isFinite(timestamp)) throw new Error(`Invalid updated_at: ${pageData.relativePath}`);
    pageData.lastUpdated = timestamp;
  },
  sitemap: { hostname: 'https://amosnothing.github.io' },
  head: [['link', { rel: 'icon', href: '/assets/img/favicon.ico' }]],
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'AI 通识', link: '/ai-knowledge-base/', activeMatch: '^/ai-knowledge-base/' },
      { text: 'AI 软件工程', link: '/ai-software/', activeMatch: '^/ai-software/' },
      { text: 'AI 资讯周报', link: '/ai-weekly/', activeMatch: '^/ai-weekly/' },
      { text: '随笔', link: '/blog/', activeMatch: '^/(?:blog/|tags/|page\\d+/|\\d{4}-\\d{2}-\\d{2}-[^/]+/)' },
      { text: '关于我', link: '/aboutme/' },
    ],
    sidebar: {
      '/ai-knowledge-base/': [{ text: '通识概览', link: '/ai-knowledge-base/' }, ...navigation.groups],
      '/ai-software/': [{ text: '专题概览', link: '/ai-software/' }, ...navigation.software],
      '/ai-weekly/': [{ text: '周报归档', link: '/ai-weekly/' }, ...navigation.weekly],
      '/blog/': [{ text: '全部随笔', link: '/blog/' }, ...navigation.posts.map(({ text, link }) => ({ text, link }))],
      ...Object.fromEntries(navigation.posts.map(p => [p.link, [{ text: '全部随笔', link: '/blog/' }]])),
    },
    outline: { level: [2, 3], label: '本文目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'medium', timeZone: 'Asia/Shanghai', forceLocale: true },
    },
    sidebarMenuLabel: '目录', returnToTopLabel: '返回顶部', darkModeSwitchLabel: '外观',
    socialLinks: [{ icon: 'github', link: 'https://github.com/amosnothing/amosnothing.github.io' }],
    search: { provider: 'local', options: { locales: { root: { translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
      modal: { noResultsText: '没有找到相关结果', resetButtonTitle: '清空搜索', displayDetails: '显示详情', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } },
    } } } } },
    footer: { message: '以原始来源核查事实，以实际任务检验理解。', copyright: 'AI 知识库 · 技术随笔' },
  },
});
