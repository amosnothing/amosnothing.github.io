# 官方主题维护

本站直接使用 [Just the Docs 官方主题](https://just-the-docs.github.io/just-the-docs/)，固定版本 `v0.12.0`。主题布局、字体、宽度、颜色、表格和搜索代码均使用上游原版，不添加本地 CSS、JavaScript 或主题模板覆盖。

## 配置与内容

- `_config.yml` 使用 `remote_theme` 加载官方主题，仅配置站点信息、导航、搜索开关和文档布局范围。
- 默认布局仅应用于 `ai-knowledge-base` 文档目录，避免 CSS 等资源被包成 HTML。
- 模块和文章使用官方 `parent`、`grand_parent`、`nav_order` 建立导航。
- 文章使用[官方页内目录写法](https://just-the-docs.github.io/just-the-docs/docs/navigation/in-page/)生成可折叠目录。
- `index.html` 是普通首页内容列表，使用官方 `default` 布局；原随笔分页与链接保留。
- 搜索使用官方 Lunr 实现，不额外增加中文分词。中文检索效果受上游默认分词能力限制。
- 旧 Beautiful Jekyll 模板保存在 `_legacy/beautiful-jekyll/`，已排除构建，不会覆盖官方主题。

## 本地运行

使用 Ruby 3.3 和 Bundler：

```sh
bundle install
bundle exec jekyll serve
```

验证命令：

```sh
bundle exec jekyll build --future --strict_front_matter
python3 tests/check_docs.py _site
node tests/check_search.cjs _site
```

CI 同时验证 Jekyll 3.10.0 和 4.4.1。可用 `JEKYLL_VERSION=3.10.0` 选择兼容版本，并在切换版本后重新执行 `bundle install`。`rake` 是远程主题声明的运行依赖，需显式保留。

## GitHub Pages

保留现有 Pages 发布来源。当前工作流进行构建与回归检查，不新增发布渠道；使用分支发布时由 GitHub Pages 构建远程主题。升级主题版本前，应检查官方变更说明并重新构建、预览。
