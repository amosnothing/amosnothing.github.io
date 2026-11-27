# VitePress 官方默认主题

本站使用 VitePress 1.6.4 稳定版的官方默认主题。没有 `.vitepress/theme`、自定义 CSS 或 Vue 组件。首页使用官方 `home`、`hero`、`features` 配置；导航、页内目录、深浅色切换和本地搜索使用官方功能。中文搜索使用上游默认分词；部分中文短词可能无法单独匹配，可尝试完整词语或英文术语。

## 内容维护

- 使用默认主题原生的“最后更新”页脚，日期按 `zh-CN`、`Asia/Shanghai` 显示。由于展示文档由构建脚本生成，通过官方 `transformPageData` 钩子将已有 `updated_at` 映射为原生 `lastUpdated` 数据；不以构建时间代替文章更新时间。不新增创建时间或标签组件。
- AI 文档仍以 `ai-knowledge-base/` 为唯一内容来源，目录和文章文件名保留。模块和文章通过 `slug` 设置稳定的英文网址，`sidebar_title` 设置简短菜单名称；正文和页面标题仍使用完整 `title`。
- AI 通识按主题组织章节，不强制五段式或逐篇复述产品新闻。基础原理优先引用方法与实验来源；产品示例集中到生态篇，资讯放周报。
- 通识参考来源须标明类型、证据等级和支持范围；E1 研究、E2 实现与实践、E3 产品声明、N 规范的含义见通识首页。等级不代表同行评审状态、独立复现或通用效果；法规说明与法律文本区分使用。
- 各篇通识分别维护 `updated_at`、`last_verified_at`、`verification_scope` 和 `change_summary`；正文显示核验日期及范围，生成页面保留这些元数据。只在完成相应核验后更新日期，产品、法规变化时针对性复查。逐篇历史记录留在 `CONTENT_REVIEW.md` 和 Git 中，不在对外正文加入补稿过程。
- 旧中文网址输出静态跳转页，保留查询参数和页内锚点；无 JavaScript 时仍有自动跳转与可点击链接。导航、目录、搜索与站点地图使用英文新网址。跳转页不参与搜索或站点地图。
- 随笔统一放在独立的 `blog/` 目录，保留原有分类子目录（如 `diary/`）；不再使用 `_posts/`。已发布随笔以 `YYYY-MM-DD-英文标题.md` 命名，并包含 `title`、`date`、`tags` 元数据；未使用日期文件名的稿件保持未发布。迁移只调整源码位置，已发布文章网址保持不变。
- `scripts/prepare-site.mjs` 在构建前生成 `.vitepress/content/` 与导航数据，不要手工编辑生成目录。原始文档不被改写。
- 转换原 Jekyll 链接与目录语法；页内目录由 VitePress 默认主题生成。
- 兼容既有文章 URL、`aboutme/`、`tags/`、`page2/` 至 `page4/` 和 RSS 地址。随笔日期按原 Jekyll 的 UTC 元数据及 Asia/Shanghai 站点时区生成。
- 已移除不参与构建的 Jekyll 主题归档、Ruby 依赖配置、旧评论配置、旧主题 CSS/JS、主题截图与更新日志；历史版本可通过 Git 记录追溯。RSS 由构建脚本生成，不再维护根目录旧模板。原文章仍使用的链接转换逻辑与旧网址兼容测试保留。
- `assets/img/` 保留站点图标和历史图片。实际展示使用 VitePress 官方主题构建的资源；回归检查会验证页面引用的本地脚本、样式和图片均存在。

## AI 软件工程专题

`ai-software/` 按 `development/`（研发技术）、`testing/`（测试质量）、`enterprise/`（企业实践）组织专题。每组的 `index.md` 使用 `slug`、`sidebar_title` 和 `nav_order` 设置分组网址、短标题与顺序；官方侧栏分组可折叠，默认展开。文章英文文件名仍决定 `/ai-software/<文件名>/` 稳定网址，移动源码目录不会改变已发布文章链接，文件名不得跨组重名。文章的 `sidebar_title` 设置简短菜单，`nav_order` 控制组内顺序。分组导读、总览目录与导航由构建脚本生成，不手动编辑生成目录。新增文章需保留通识文档结构、更新日期与可核验来源，并区分历史案例、当前产品状态和编者建议。

企业案例总览与具名企业案例使用 `reviewed_at`、`source_window_start`、`source_window_end` 和 `reviewed_sources` 记录审核窗口及来源日期。来源以原始发布时间判断，窗口最多六个月；每个已审来源须在正文引用并列于参考来源中。只收录与软件研发、测试直接相关的团队原文或研究，注明部署、实验或演示属性，不用会议预告、招聘或第三方泛文补足企业名单。历史基础研究仍可用于原理专题，不冒充近期案例。

## AI 资讯周报

`ai-weekly/` 每个自然周只有一个 Markdown 文件，以北京时间所属周的 ISO 周所属年份与两位周数命名，例如 `2026-week48.md`。文档包含 `title`、`week_start`、`week_end` 和 `updated_at` 元数据。后续补充本周消息时更新同一文件；新一周才新建文件。跨年时使用 ISO 周所属年份，例如 2025-12-29 属于 `2026-week01`。线上网址仍使用 `week_start` 的日期，保留既有链接。

每条新闻写明原始发布日期、概览、阅读提示和可核验来源。未结束的周报注明收录截止日；优先采用官方来源，区分研究结果、测试版与已上线功能。构建脚本自动生成归档页面、侧栏和搜索索引，按周倒序展示。本功能没有设置定时自动采集任务。

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
