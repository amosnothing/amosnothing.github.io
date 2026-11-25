# VitePress 官方默认主题

本站使用 VitePress 1.6.4 稳定版的官方默认主题。没有 `.vitepress/theme`、自定义 CSS 或 Vue 组件。首页使用官方 `home`、`hero`、`features` 配置；导航、页内目录、深浅色切换和本地搜索使用官方功能。中文搜索使用上游默认分词；部分中文短词可能无法单独匹配，可尝试完整词语或英文术语。

## 内容维护

- AI 文档仍以 `ai-knowledge-base/` 为唯一内容来源，目录和文章文件名保留。
- 已发布随笔仍以 `_posts/` 中日期文件名的 Markdown 为来源；未使用日期文件名的稿件保持未发布。
- `scripts/prepare-site.mjs` 在构建前生成 `.vitepress/content/` 与导航数据，不要手工编辑生成目录。原始文档不被改写。
- 转换原 Jekyll 链接与目录语法；页内目录由 VitePress 默认主题生成。
- 兼容既有文章 URL、`aboutme/`、`tags/`、`page2/` 至 `page4/` 和 RSS 地址。随笔日期按原 Jekyll 的 UTC 元数据及 Asia/Shanghai 站点时区生成。
- 原 Jekyll 配置、首页、标签页、依赖和测试保存在 `_legacy/jekyll/`；Beautiful Jekyll 模板仍保存在原归档中，仅供追溯，不参加构建。

## 本地运行与验证

需要 Node.js 22：

```sh
npm ci
npm run docs:dev
npm run docs:build
npm test
npm run docs:preview
```

VitePress 是静态站点生成器；`gray-matter` 用于解析现有 Markdown 的 YAML 元数据。提交 `package-lock.json` 固定依赖。VitePress 1.6.4 的默认 Vite 5 依赖存在开发服务器安全公告，因此以 npm overrides 固定为已修复的 Vite 6.4.6；不涉及主题改动，构建与回归检查必须保持通过。

## GitHub Pages

在仓库 Settings → Pages 中选择 GitHub Actions 为发布来源。`.github/workflows/ci.yml` 在 main 推送后安装依赖、构建、执行回归检查，再发布 `.vitepress/dist`。Pull request 只验证，不发布。

官方文档：

- https://vitepress.dev/reference/default-theme-home-page
- https://vitepress.dev/reference/default-theme-config
- https://vitepress.dev/guide/deploy

升级前需重新检查构建、旧链接、搜索、桌面及移动端。历史文章的外部图片或链接可能因原站点变化而失效；迁移不保证外部资源可用。
