# 站点主题维护

本站使用 [Just the Docs](https://just-the-docs.github.io/just-the-docs/)，远程主题固定为 `v0.12.0`。

## 本地预览与检查

使用 Ruby 3.3 和 Bundler：

```sh
bundle install
bundle exec jekyll serve
```

验证命令与 CI 一致：

```sh
bundle exec jekyll build --future --strict_front_matter
python3 tests/check_docs.py _site
node tests/check_search.cjs _site
```

## 运行依赖

新增的 `jekyll-remote-theme` 用于加载 GitHub Pages 远程主题；`jekyll-include-cache` 和 `jekyll-seo-tag` 分别提供新主题模板直接调用的缓存 include 与 SEO 标签。保留现有分页、站点地图和 GFM Markdown 支持，不增加前端运行库。

## GitHub Pages

`remote_theme` 和标准插件适配现有 GitHub Pages 分支构建，不新增后端服务。CI 负责构建和回归检查，不改变仓库的 Pages 发布来源，也不自动创建新的部署渠道。若现有仓库以 Actions 为发布来源，应继续使用对应的发布工作流。

## 内容与导航

- 原有 `_posts`、文章网址和分页保留；随笔文章不逐篇进入知识库侧栏。
- AI 文档保留原目录和文件名。根目录页 `nav_order: 1`；模块页以 `parent: AI 知识库` 建立层级；文章用 `parent`、`grand_parent`、`nav_order` 排序。
- 文章开头的 `details` 与 `{:toc}` 生成页内目录；`kramdown.toc_levels` 控制深度。
- 新文档应保留标准 Front Matter，并添加导航元数据与目录块。
- 中文搜索按汉字分词；自定义 Lunr hook 保留汉字，英文继续使用主题搜索。

## 布局与样式

- `_layouts_docs`、`_includes_docs` 是当前自定义模板目录。
- 原 `_layouts`、`_includes` 及 Beautiful Jekyll 的文件保留但不参与当前布局加载，以免覆盖远程主题的同名模板。
- `_sass/custom/setup.scss` 控制中文字体与正文宽度，`custom.scss` 控制行距、目录和表格溢出。
- 远程主题需要 GitHub 构建时下载。升级主题前应更新固定版本，运行全部检查并复核桌面、窄屏和搜索。
