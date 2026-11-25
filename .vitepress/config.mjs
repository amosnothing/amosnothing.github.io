import { defineConfig } from 'vitepress';
import navigation from './navigation.json' with { type: 'json' };

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 知识库',
  description: '面向职场人与学习者的 AI 原理、前沿能力、应用实践与安全合规文档。',
  srcDir: './.vitepress/content',
  cleanUrls: false,
  sitemap: { hostname: 'https://amosnothing.github.io' },
  head: [['link', { rel: 'icon', href: '/assets/img/favicon.ico' }]],
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'AI 知识库', link: '/ai-knowledge-base/' },
      { text: '随笔', link: '/blog/' },
      { text: '关于我', link: '/aboutme/' },
    ],
    sidebar: {
      '/ai-knowledge-base/': [{ text: '知识库概览', link: '/ai-knowledge-base/' }, ...navigation.groups],
      '/blog/': [{ text: '全部随笔', link: '/blog/' }, ...navigation.posts.map(({ text, link }) => ({ text, link }))],
      ...Object.fromEntries(navigation.posts.map(p => [p.link, [{ text: '全部随笔', link: '/blog/' }]])),
    },
    outline: { level: [2, 3], label: '本文目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    sidebarMenuLabel: '目录', returnToTopLabel: '返回顶部', darkModeSwitchLabel: '外观',
    socialLinks: [{ icon: 'github', link: 'https://github.com/amosnothing/amosnothing.github.io' }],
    search: { provider: 'local', options: { locales: { root: { translations: {
      button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
      modal: { noResultsText: '没有找到相关结果', resetButtonTitle: '清空搜索', displayDetails: '显示详情', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } },
    } } } } },
    footer: { message: '以原始来源核查事实，以实际任务检验理解。', copyright: 'AI 知识库 · 技术随笔' },
  },
});
