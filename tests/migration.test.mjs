import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { files, postRoute, convertContent, weeklyFileStem, redirectHtml } from '../scripts/prepare-site.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, '.vitepress/dist');
const navigation = JSON.parse(await readFile(path.join(root, '.vitepress/navigation.json'), 'utf8'));
const renderedDocument = file => {
  const relative = path.relative(root, file);
  const route = navigation.documentRoutes[relative] || '/' + relative.replace(/index\.md$/, '').replace(/\.md$/, '/');
  return route.slice(1) + 'index.html';
};
const read = relative => readFile(path.join(dist, relative), 'utf8');
const exists = async p => { try { await access(p); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

test('legacy post dates retain the original Jekyll Shanghai URLs across midnight', () => {
  assert.equal(postRoute('2024-08-26-diary.md', '2024-08-26T17:00:00Z'), '/2024-08-27-diary/');
  assert.equal(postRoute('2019-03-19-install-cygwin-clion.md', '2019-03-19T11:07:57Z'), '/2019-03-19-install-cygwin-clion/');
});
test('standalone blog sources publish dated posts while keeping drafts unpublished', async () => {
  const matter = (await import('gray-matter')).default;
  assert.equal(await exists(path.join(root, '_posts')), false);
  const archive = await read('blog/index.html');
  const feed = await read('feed.xml');
  const published = [];
  let drafts = 0;
  for (const file of (await files(path.join(root, 'blog'))).filter(file => file.endsWith('.md'))) {
    const { data } = matter(await readFile(file, 'utf8'));
    if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(path.basename(file)) || data.published === false) {
      drafts++;
      assert.ok(!navigation.posts.some(post => post.text === data.title), file);
      continue;
    }
    const link = postRoute(file, data.date);
    published.push(link);
    assert.ok(archive.includes(link), file);
    assert.ok(feed.includes(`https://amosnothing.github.io${link}`), file);
    assert.ok((await read(link.slice(1) + 'index.html')).includes(data.title), file);
  }
  assert.ok(drafts > 0, 'Undated drafts are preserved');
  assert.deepEqual(published.sort(), navigation.posts.map(post => post.link).sort());
});
test('Collection allowlist diary renders code and appears first in the archive', async () => {
  const link = '/2026-11-26-classutils-collection-allowlist/';
  assert.equal(navigation.posts[0].link, link);
  const html = await read(link.slice(1) + 'index.html');
  for (const text of ['问题现象', '原因', '为什么需要白名单', '处理方式', '经验',
    'list_customer_head', 'store_order_seq_prefix_config', 'list_customer_filter',
    'auto_cancel_overtime_unpaid_order_config', 'parseParameter', 'setDefaultParameter']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes('language-java') && html.includes('language-json'));
  assert.ok(html.includes('<strong>允许 <code>List</code>，不会自动允许它的父接口 <code>Collection</code></strong>'));
  assert.ok((await read('tags/index.html')).includes(link));
  assert.ok((await read('sitemap.xml')).includes(link));
});
test('Jekyll links with spaces and TOCs convert to VitePress without losing content', () => {
  const text = '{% capture article_url %}{% link ai-knowledge-base/a b.md %}{% endcapture %}\n- [主题]({{ article_url | uri_escape }})\n<details open markdown="block">\n<summary>本文目录</summary>\n1. TOC\n{:toc}\n</details>\n## 正文';
  const converted = convertContent(text);
  assert.match(converted, /\[主题\]\(\/ai-knowledge-base\/a%20b\/\)/);
  assert.ok(converted.includes('## 正文'));
  assert.ok(!converted.includes('{%') && !converted.includes('{:toc}'));
});
test('all previously published directory routes and utility endpoints remain available', async () => {
  const routes = JSON.parse(await readFile(path.join(root, 'tests/legacy-routes.json'), 'utf8'));
  for (const route of routes) assert.ok(await exists(path.join(dist, decodeURI(route), 'index.html')), route);
  for (const f of ['404.html', 'feed.xml', 'robots.txt', 'sitemap.xml']) assert.ok(await exists(path.join(dist, f)), f);
});
test('11 AI articles render topic-specific sections, evidence labels and verification metadata', async () => {
  const matter = (await import('gray-matter')).default;
  const source = path.join(root, 'ai-knowledge-base');
  const articles = (await files(source)).filter(f => f.endsWith('.md') && !f.endsWith('/index.md'));
  assert.equal(articles.length, 11);
  for (const file of articles) {
    const relative = renderedDocument(file);
    const html = await read(relative);
    assert.ok(html.includes('参考来源') && html.includes('核心摘要'), relative);
    assert.ok(html.includes('VPDoc') && html.includes('本文目录'), relative);
    assert.ok(!html.includes('{:toc}') && !html.includes('{%'), relative);
    const original = await readFile(file, 'utf8');
    const { data, content } = matter(original);
    const headings = [...content.matchAll(/^## (.+)$/gm)].map(match => match[1]);
    assert.ok(headings.length >= 4, `${relative}: explain the topic and include sources`);
    for (const heading of headings) assert.ok(html.includes(heading), `${relative}: ${heading}`);
    assert.ok(data.last_verified_at && data.verification_scope && data.change_summary, relative);
    const verified = new Date(data.last_verified_at).toISOString().slice(0, 10);
    assert.ok(html.includes(`核验日期：${verified}`), relative);
    const generated = matter(await readFile(path.join(root, '.vitepress/content', relative.replace(/\.html$/, '.md')), 'utf8'));
    for (const key of ['last_verified_at', 'verification_scope', 'change_summary']) {
      assert.deepEqual(generated.data[key], data[key], `${relative}: ${key} survives generation`);
    }
    const cited = [...content.matchAll(/\[\[(\d+)\]\]\((https:\/\/[^)]+)\)/g)];
    const references = [...content.matchAll(/^- \[(\d+)\] \[[^\n]+?\]\((https:\/\/[^)]+)\)([^\n]*)/gm)];
    assert.deepEqual(new Map(cited.map(([, n, url]) => [n, url])), new Map(references.map(([, n, url]) => [n, url])), `${relative}: sources support the citation map`);
    for (const [, , , label] of references) {
      assert.match(label, /类型：[^；]+；证据等级：(E[123]|N)；支持：.+/, relative);
    }
    const citations = [...original.matchAll(/\[\[\d+\]\]\((https?:\/\/[^)]+)\)/g)].map(m => m[1]);
    assert.ok(citations.length > 0);
    for (const url of citations) assert.ok(html.includes(url.replaceAll('&', '&amp;')), `${relative}: ${url}`);
  }
});
test('all generated internal page links resolve and no Liquid syntax leaks', async () => {
  for (const file of (await files(dist)).filter(f => f.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    assert.ok(!html.includes('{% capture') && !html.includes('{{ article_url'), file);
    for (const match of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
      const href = match[1];
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/assets/')) continue;
      const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
      const resolved = path.join(dist, pathname, pathname.endsWith('/') ? 'index.html' : '');
      assert.ok(await exists(resolved), `${path.relative(dist, file)} -> ${href}`);
    }
  }
});
test('default theme is unmodified, home cards and static local search ship', async () => {
  assert.equal(await exists(path.join(root, '.vitepress/theme')), false);
  const home = await read('index.html');
  assert.ok(home.includes('VPHero') && home.includes('VPFeatures') && home.includes('理解 AI，学以致用'));
  assert.ok(home.includes('搜索文档'));
  const assets = await files(path.join(dist, 'assets'));
  assert.ok(assets.some(f => f.includes('localSearchIndex')));
  assert.ok((await read('blog/index.html')).includes('2024-08-27-diary'));
});

test('the generated official local-search index finds document topics', async () => {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const require = createRequire(import.meta.resolve('vitepress'));
  const MiniSearch = require('minisearch');
  const asset = (await files(path.join(dist, 'assets'))).find(f => f.includes('@localSearchIndexroot'));
  const data = (await import(pathToFileURL(asset))).default;
  const index = MiniSearch.loadJSON(data, { fields: ['title', 'titles', 'text'], storeFields: ['title', 'titles'] });
  for (const [query, expected] of [['RAG', '/practice/rag/'], ['上下文', '/fundamentals/context-window/'], ['Reasoning', '/frontiers/reasoning-models/'], ['TestGen', '/ai-software/quality-engineering/'], ['NL2Test', '/ai-software/bytedance-testing/'], ['Harness', '/ai-software/agent-harness/']]) {
    assert.ok(index.search(query, { prefix: true, fuzzy: 0.2 }).slice(0, 10).some(r => r.id.includes(expected)), query);
  }
});

test('CI dependency downloads use the public npm registry', async () => {
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  for (const [name, item] of Object.entries(lock.packages)) {
    if (item.resolved) assert.equal(new URL(item.resolved).hostname, 'registry.npmjs.org', name);
  }
});

test('AI document emphasis renders as strong text, including CJK parenthesis boundaries', async () => {
  const articles = [...await files(path.join(root, 'ai-knowledge-base')), ...await files(path.join(root, 'ai-software'))].filter(f => f.endsWith('.md'));
  let terms = 0;
  for (const file of articles) {
    const relative = renderedDocument(file);
    const html = await read(relative);
    const source = await readFile(file, 'utf8');
    for (const [, term] of source.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      const escaped = term.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
      assert.ok(html.includes(`<strong>${escaped}</strong>`), `${relative}: ${term}`);
      terms++;
    }
  }
  assert.ok(terms > 50, 'Verify emphasis across the knowledge base');
});

test('weekly news uses one ISO-week-named file per week and appears in navigation and output', async () => {
  const matter = (await import('gray-matter')).default;
  const reports = (await files(path.join(root, 'ai-weekly'))).filter(f => f.endsWith('.md'));
  const weeks = new Set();
  const archive = await read('ai-weekly/index.html');
  const home = await read('index.html');
  for (const file of reports) {
    const name = path.basename(file, '.md');
    assert.match(name, /^\d{4}-week\d{2}$/);
    assert.ok(!weeks.has(name), `Duplicate weekly report: ${name}`);
    weeks.add(name);
    const source = matter(await readFile(file, 'utf8'));
    assert.equal(weeklyFileStem(source.data.week_start), name);
    const date = new Date(source.data.week_start).toISOString().slice(0, 10);
    assert.equal(new Date(source.data.week_end) - new Date(source.data.week_start), 6 * 86400000);
    assert.ok(new Date(source.data.updated_at) >= new Date(source.data.week_start));
    const link = `/ai-weekly/${date}/`;
    const html = await read(`ai-weekly/${date}/index.html`);
    assert.ok(archive.includes(link) && html.includes('周报归档'), name);
    assert.ok(home.includes('/ai-weekly/'));
    assert.ok(html.includes('新闻概览') && html.includes('原文') && html.includes('参考来源'), name);
    const urls = [...source.content.matchAll(/\[\[\d+\]\]\((https:\/\/[^)]+)\)/g)].map(m => m[1]);
    assert.ok(urls.length > 0, name);
    for (const url of urls) assert.ok(html.includes(url), `${name}: ${url}`);
  }
  const first = await read('ai-weekly/2026-11-23/index.html');
  for (const topic of ['蛋白质设计', 'Claude Ship', 'Working with AI', '量子算法', 'Shirudo', 'RoboTrack', 'Private Inference', 'Install as app', 'SWE-2.1', 'Skills over MCP', 'Niji 8', 'Siren']) assert.ok(first.includes(topic), topic);
  assert.equal((first.match(/<h2 id="_\d+-/g) || []).length, 12);
  assert.ok(first.includes('2026 年 11 月 27 日（北京时间）'));
  const updated = matter(await readFile(path.join(root, 'ai-weekly/2026-week48.md'), 'utf8'));
  assert.equal(new Date(updated.data.updated_at).toISOString().slice(0, 10), '2026-11-27');
  const citations = [...updated.content.matchAll(/\[\[(\d+)\]\]\((https:\/\/[^)]+)\)/g)];
  const references = [...updated.content.matchAll(/^- \[(\d+)\] \[[^\n]+?\]\((https:\/\/[^)]+)\)/gm)];
  assert.deepEqual(new Map(citations.map(([, n, url]) => [n, url])), new Map(references.map(([, n, url]) => [n, url])));
});


test('ISO weekly filenames handle year boundaries and two-digit weeks', () => {
  assert.equal(weeklyFileStem('2026-11-23'), '2026-week48');
  assert.equal(weeklyFileStem('2025-12-29'), '2026-week01');
  assert.equal(weeklyFileStem('2020-12-28'), '2020-week53');
  assert.equal(weeklyFileStem('2021-01-04'), '2021-week01');
  assert.throws(() => weeklyFileStem('2026-11-26'), /Monday/);
  assert.throws(() => weeklyFileStem('invalid'), /Monday/);
});


test('English routes, short sidebar labels and full document headings remain consistent', async () => {
  assert.equal(navigation.groups.length, 4);
  for (const group of navigation.groups) {
    assert.ok(group.text.length <= 6, group.text);
    assert.match(group.link, /^\/ai-knowledge-base\/[a-z-]+\/$/);
    for (const item of group.items) {
      assert.ok(item.text.length <= 10, item.text);
      assert.match(item.link, /^\/ai-knowledge-base\/[a-z-]+\/[a-z-]+\/$/);
    }
  }
  const html = await read('ai-knowledge-base/fundamentals/context-window/index.html');
  assert.ok(html.includes('上下文窗口（Context Window）：AI的短期工作记忆边界'));
  assert.ok(html.includes('href="/ai-knowledge-base/fundamentals/context-window/"'));
  for (const [oldRoute, target] of Object.entries(navigation.legacyRoutes)) {
    const legacy = await read(oldRoute.slice(1) + 'index.html');
    assert.ok(legacy.includes(`rel="canonical" href="https://amosnothing.github.io${target}"`));
    assert.ok(legacy.includes(`content="0;url=${target}"`));
    assert.ok(legacy.includes('location.search + location.hash'));
  }
  const sitemap = await read('sitemap.xml');
  assert.ok(sitemap.includes('/fundamentals/context-window/'));
  for (const route of Object.keys(navigation.legacyRoutes)) assert.ok(!sitemap.includes(encodeURI(route)));
});

test('legacy redirects preserve query and fragment and reject unsafe targets', async () => {
  const { runInNewContext } = await import('node:vm');
  const html = redirectHtml('/ai-knowledge-base/fundamentals/context-window/');
  const script = html.match(/<script>(.*?)<\/script>/s)[1];
  let destination;
  runInNewContext(script, { location: { search: '?from=bookmark', hash: '#section', replace(value) { destination = value; } } });
  assert.equal(destination, '/ai-knowledge-base/fundamentals/context-window/?from=bookmark#section');
  assert.throws(() => redirectHtml('https://example.com/'), /Invalid redirect/);
  assert.throws(() => redirectHtml('/ai-knowledge-base/<script>/'), /Invalid redirect/);
});


test('software engineering articles have sources, standard sections and short English navigation', async () => {
  const matter = (await import('gray-matter')).default;
  const articles = (await files(path.join(root, 'ai-software'))).filter(file => file.endsWith('.md') && !file.endsWith('/index.md'));
  assert.equal(articles.length, 9);
  assert.deepEqual(navigation.software.flatMap(group => group.items.map(item => item.link)), [
    '/ai-software/coding-agents/', '/ai-software/context-and-multi-agent/', '/ai-software/agent-harness/', '/ai-software/image-video-understanding/', '/ai-software/from-request-to-code/', '/ai-software/quality-engineering/', '/ai-software/enterprise-adoption/',
    '/ai-software/alibaba-rd-practice/', '/ai-software/bytedance-testing/',
  ]);
  const index = await read('ai-software/index.html');
  for (const file of articles) {
    const { data, content } = matter(await readFile(file, 'utf8'));
    assert.equal(data.category, 'AI 软件工程');
    assert.equal(data.level, '通识进阶');
    assert.ok(data.updated_at);
    const link = `/ai-software/${path.basename(file, '.md')}/`;
    const item = navigation.software.flatMap(group => group.items).find(item => item.link === link);
    assert.ok(item && item.text.length <= 10, link);
    assert.ok(index.includes(link));
    const html = await read(link.slice(1) + 'index.html');
    for (const section of ['核心摘要', '概念解析与生活类比', '核心价值与应用场景', '最新演进与代表性实践', '常见认知误区与使用边界', '参考来源']) assert.ok(html.includes(section), `${link}: ${section}`);
    assert.ok(html.includes(data.title), link);
    assert.ok(!/^```/m.test(content), 'Articles must not require code');
    const sources = [...content.matchAll(/\[\[(\d+)\]\]\((https:\/\/[^)]+)\)/g)];
    assert.ok(new Set(sources.map(match => match[1])).size >= (data.reviewed_sources ? 1 : 3), link);
    const references = [...content.matchAll(/^- \[(\d+)\] \[[^\n]+?\]\((https:\/\/[^)]+)\)/gm)];
    assert.deepEqual(new Map(sources.map(([, n, url]) => [n, url])), new Map(references.map(([, n, url]) => [n, url])), `Citation/reference mismatch: ${link}`);
    for (const [, , url] of sources) assert.ok(html.includes(url), url);
  }
  assert.ok((await read('index.html')).includes('/ai-software/'));
  assert.ok((await read('sitemap.xml')).includes('/ai-software/enterprise-adoption/'));
});


test('reviewed enterprise cases use dated primary evidence within a six-month window', async () => {
  const matter = (await import('gray-matter')).default;
  const expected = ['enterprise-adoption', 'alibaba-rd-practice', 'bytedance-testing'];
  const allowed = new Set(['blog.qoder.com', 'www.toutiao.com', 'arxiv.org']);
  for (const name of expected) {
    const { data, content } = matter(await readFile(path.join(root, `ai-software/enterprise/${name}.md`), 'utf8'));
    const start = new Date(data.source_window_start);
    const end = new Date(data.source_window_end);
    const earliest = new Date(end);
    earliest.setUTCMonth(earliest.getUTCMonth() - 6);
    assert.ok(Number.isFinite(+start) && Number.isFinite(+end) && start >= earliest && start <= end, name);
    assert.equal(+new Date(data.reviewed_at), +end, name);
    assert.equal(+new Date(data.updated_at), +end, name);
    assert.ok(data.evidence_type && data.reviewed_sources?.length, name);
    const cited = new Set([...content.matchAll(/\[\[\d+\]\]\((https:\/\/[^)]+)\)/g)].map(m => m[1]));
    assert.deepEqual(cited, new Set(data.reviewed_sources.map(s => s.url)), name);
    for (const source of data.reviewed_sources) {
      const date = new Date(source.published_at);
      assert.ok(Number.isFinite(+date) && date >= start && date <= end, `${name}: ${source.url}`);
      assert.ok(source.publisher && allowed.has(new URL(source.url).hostname), source.url);
    }
  }
  const overview = await read('ai-software/enterprise-adoption/index.html');
  for (const stale of ['arxiv.org/abs/2402.09171', 'openai.com/index/rakuten/', 'github-copilots-impact-in-the-enterprise-with-accenture']) assert.ok(!overview.includes(stale), stale);
  assert.ok(overview.includes('暂不新增腾讯案例文章'));
  const bytedance = await read('ai-software/bytedance-testing/index.html');
  for (const qualification of ['允许少量后续修改', '2025 年 3 月', '不代表缺陷检出率']) assert.ok(bytedance.includes(qualification), qualification);
  assert.ok((await read('ai-software/alibaba-rd-practice/index.html')).includes('全流程操作明确以演示呈现'));
});


test('software topics have collapsible groups, group landing pages and stable article URLs', async () => {
  const matter = (await import('gray-matter')).default;
  const expected = [
    ['development', '研发技术', ['coding-agents', 'context-and-multi-agent', 'agent-harness', 'image-video-understanding', 'from-request-to-code']],
    ['testing', '测试质量', ['quality-engineering']],
    ['enterprise', '企业实践', ['enterprise-adoption', 'alibaba-rd-practice', 'bytedance-testing']],
  ];
  assert.equal(navigation.software.length, expected.length);
  const overview = await read('ai-software/index.html');
  for (const [i, [slug, label, articles]] of expected.entries()) {
    const group = navigation.software[i];
    assert.equal(group.text, label);
    assert.equal(group.link, `/ai-software/${slug}/`);
    assert.equal(group.collapsed, false);
    assert.deepEqual(group.items.map(item => item.link), articles.map(name => `/ai-software/${name}/`));
    assert.ok(overview.includes(group.link));
    const landing = await read(`ai-software/${slug}/index.html`);
    for (const name of articles) {
      const file = `ai-software/${slug}/${name}.md`;
      const route = `/ai-software/${name}/`;
      const source = matter(await readFile(path.join(root, file), 'utf8'));
      assert.equal(navigation.documentRoutes[file], route);
      assert.ok(landing.includes(source.data.title) && landing.includes(route));
      const html = await read(route.slice(1) + 'index.html');
      const sections = [...html.matchAll(/<section class="VPSidebarItem level-0([^"]*)"/g)];
      assert.equal(sections.filter(([, classes]) => classes.split(' ').includes('collapsible')).length, 3);
      assert.equal((html.match(/class="VPSidebarItem level-1 is-link/g) || []).length, 10);
      for (const [, title] of expected) assert.ok(html.includes(title));
    }
  }
});


test('AI general-knowledge section is renamed without changing the site brand or URLs', async () => {
  const { default: config } = await import('../.vitepress/config.mjs');
  assert.equal(config.title, 'AI 知识库');
  assert.deepEqual(config.themeConfig.nav.find(item => item.link === '/ai-knowledge-base/'), { text: 'AI 通识', link: '/ai-knowledge-base/' });
  assert.deepEqual(config.themeConfig.sidebar['/ai-knowledge-base/'][0], { text: '通识概览', link: '/ai-knowledge-base/' });
  const overview = await read('ai-knowledge-base/index.html');
  assert.match(overview, /<title>AI 通识 \| AI 知识库<\/title>/);
  assert.match(overview, /<h1[^>]*>AI 通识/);
  assert.ok(overview.includes('通识概览'));
  assert.ok((await read('index.html')).includes('AI 通识'));
});


test('every generated page keeps its referenced local scripts, styles and images', async () => {
  let checked = 0;
  for (const file of (await files(dist)).filter(file => file.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    for (const [, , url] of html.matchAll(/<(script|link|img)\b[^>]*?(?:src|href)="([^"]+)"/g)) {
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const resource = decodeURIComponent(url.split(/[?#]/)[0]);
      assert.ok(await exists(path.join(dist, resource)), `${path.relative(dist, file)} -> ${url}`);
      checked++;
    }
  }
  assert.ok(checked > 100, 'Check resources across rendered pages');
});
