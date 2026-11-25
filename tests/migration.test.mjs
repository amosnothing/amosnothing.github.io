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
