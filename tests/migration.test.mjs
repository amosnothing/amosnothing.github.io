import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { files, postRoute, convertContent } from '../scripts/prepare-site.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, '.vitepress/dist');
const read = relative => readFile(path.join(dist, relative), 'utf8');
const exists = async p => { try { await access(p); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

test('legacy post dates retain the original Jekyll Shanghai URLs across midnight', () => {
  assert.equal(postRoute('2024-08-26-diary.md', '2024-08-26T17:00:00Z'), '/2024-08-27-diary/');
  assert.equal(postRoute('2019-03-19-install-cygwin-clion.md', '2019-03-19T11:07:57Z'), '/2019-03-19-install-cygwin-clion/');
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
test('11 AI articles retain sources and five sections, using the official theme and outline', async () => {
  const source = path.join(root, 'ai-knowledge-base');
  const articles = (await files(source)).filter(f => f.endsWith('.md') && !f.endsWith('/index.md'));
  assert.equal(articles.length, 11);
  for (const file of articles) {
    const relative = path.relative(root, file).replace(/\.md$/, '/index.html');
    const html = await read(relative);
    assert.ok(html.includes('参考来源') && html.includes('核心摘要'), relative);
    for (const section of ['概念解析与生活类比', '核心价值与应用场景', '最新演进与代表性实践', '常见认知误区与使用边界']) assert.ok(html.includes(section), `${relative}: ${section}`);
    assert.ok(html.includes('VPDoc') && html.includes('本文目录'), relative);
    assert.ok(!html.includes('{:toc}') && !html.includes('{%'), relative);
    const original = await readFile(file, 'utf8');
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
  for (const [query, expected] of [['RAG', '检索增强生成'], ['上下文', '上下文窗口'], ['Reasoning', '推理模型']]) {
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
  const articles = (await files(path.join(root, 'ai-knowledge-base'))).filter(f => f.endsWith('.md'));
  let terms = 0;
  for (const file of articles) {
    const relative = path.relative(root, file).replace(/\.md$/, file.endsWith('/index.md') ? '.html' : '/index.html');
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

test('weekly news uses one Monday-named file per week and appears in navigation and output', async () => {
  const matter = (await import('gray-matter')).default;
  const reports = (await files(path.join(root, 'ai-weekly'))).filter(f => f.endsWith('.md'));
  const weeks = new Set();
  const archive = await read('ai-weekly/index.html');
  const home = await read('index.html');
  for (const file of reports) {
    const name = path.basename(file, '.md');
    assert.match(name, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(`${name}T00:00:00Z`).getUTCDay(), 1);
    assert.ok(!weeks.has(name), `Duplicate weekly report: ${name}`);
    weeks.add(name);
    const source = matter(await readFile(file, 'utf8'));
    assert.equal(new Date(source.data.week_start).toISOString().slice(0, 10), name);
    assert.equal(new Date(source.data.week_end) - new Date(source.data.week_start), 6 * 86400000);
    assert.ok(new Date(source.data.updated_at) >= new Date(source.data.week_start));
    const link = `/ai-weekly/${name}/`;
    const html = await read(`ai-weekly/${name}/index.html`);
    assert.ok(archive.includes(link) && html.includes('周报归档'), name);
    assert.ok(home.includes('/ai-weekly/'));
    assert.ok(html.includes('新闻概览') && html.includes('原文') && html.includes('参考来源'), name);
    const urls = [...source.content.matchAll(/\[\[\d+\]\]\((https:\/\/[^)]+)\)/g)].map(m => m[1]);
    assert.ok(urls.length > 0, name);
    for (const url of urls) assert.ok(html.includes(url), `${name}: ${url}`);
  }
  const first = await read('ai-weekly/2026-11-23/index.html');
  for (const topic of ['蛋白质设计', 'Claude Ship', 'Working with AI', '量子算法', 'Shirudo', 'RoboTrack']) assert.ok(first.includes(topic), topic);
  assert.equal((first.match(/<h2 id="_[1-6]-/g) || []).length, 6);
});
