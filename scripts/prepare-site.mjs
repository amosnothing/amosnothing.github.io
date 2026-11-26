import { readdir, readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.vitepress/content');
const origin = 'https://amosnothing.github.io';
export async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat().sort();
}
export function postRoute(filename, date) {
  const slug = path.basename(filename, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
  return `/${day}-${slug}/`;
}
export function weeklyFileStem(value) {
  const monday = new Date(value);
  if (Number.isNaN(monday.getTime()) || monday.getUTCDay() !== 1) {
    throw new Error('week_start must be a valid Monday');
  }
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-week${String(week).padStart(2, '0')}`;
}
export function convertContent(content, documentRoutes = {}) {
  return content
    .replace(/\{% capture article_url %\}\{% link (.*?) %\}\{% endcapture %\}\s*\n- \[(.*?)\]\(\{\{ article_url \| uri_escape \}\}\)/g,
      (_, target, title) => `- [${title}](${encodeURI(documentRoutes[target] || '/' + target.replace(/\.md$/, '/'))})`)
    .replace(/<details open markdown="block">\s*<summary>本文目录<\/summary>\s*1\. TOC\s*\{:toc\}\s*<\/details>/g, '')
    .replace(/^\{:.*?\}\s*$/gm, '')
    .replace(/<function ([^>]+)>/g, '&lt;function $1&gt;')
    .replace(/(?:\.\.\/)+assets\//g, 'https://amosnothing.github.io/assets/');
}
function page(title, body, extra = {}) {
  return matter.stringify(body, { title, ...extra });
}
async function write(relative, text) {
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text);
}
export function redirectHtml(target) {
  if (!/^\/ai-knowledge-base\/(?:[a-z0-9-]+\/)+$/.test(target)) throw new Error(`Invalid redirect target: ${target}`);
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>页面已迁移</title><link rel="canonical" href="${origin}${target}"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script></head>
<body><main><h1>页面已迁移</h1><p><a href="${target}">前往新页面</a></p></main></body></html>`;
}
const xml = value => String(value).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]);
export async function prepare() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const documentRoutes = { 'ai-knowledge-base/index.md': '/ai-knowledge-base/' };
  const legacyRoutes = {};
  const usedRoutes = new Set(Object.values(documentRoutes));
  for (const filename of (await files(path.join(root, 'ai-knowledge-base'))).filter(f => f.endsWith('.md'))) {
    const relative = path.relative(root, filename);
    if (relative === 'ai-knowledge-base/index.md') continue;
    const source = matter(await readFile(filename, 'utf8'));
    const parent = matter(await readFile(path.join(path.dirname(filename), 'index.md'), 'utf8'));
    const slugs = path.basename(filename) === 'index.md' ? [source.data.slug] : [parent.data.slug, source.data.slug];
    if (slugs.some(slug => typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) throw new Error(`Invalid English slug: ${filename}`);
    const route = `/ai-knowledge-base/${slugs.join('/')}/`;
    if (usedRoutes.has(route)) throw new Error(`Duplicate document route: ${route}`);
    usedRoutes.add(route);
    documentRoutes[relative] = route;
    legacyRoutes['/' + relative.replace(/index\.md$/, '').replace(/\.md$/, '/')] = route;
  }
  const groupTitles = [];
  const groups = [];
  for (const entry of await readdir(path.join(root, 'ai-knowledge-base'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = `ai-knowledge-base/${entry.name}`;
    const index = matter(await readFile(path.join(root, directory, 'index.md'), 'utf8'));
    const items = [];
    const articleLinks = [];
    for (const filename of (await files(path.join(root, directory))).filter(f => f.endsWith('.md') && path.basename(f) !== 'index.md')) {
      const source = matter(await readFile(filename, 'utf8'));
      const relative = path.relative(root, filename);
      const link = documentRoutes[relative];
      items.push({ text: source.data.sidebar_title, link });
      articleLinks.push(`- [${source.data.title}](${link})`);
      await write(link.slice(1) + 'index.md', page(source.data.title, convertContent(source.content, documentRoutes), {
        description: source.data.category, category: source.data.category,
        updated_at: source.data.updated_at, level: source.data.level,
      }));
    }
    const link = documentRoutes[`${directory}/index.md`];
    groups.push({ text: index.data.sidebar_title, link, collapsed: false, items });
    groupTitles.push(index.data.title);
    await write(link.slice(1) + 'index.md', page(index.data.title, convertContent(index.content, documentRoutes) + '\n' + articleLinks.join('\n')));
  }
  const aiIndex = matter(await readFile(path.join(root, 'ai-knowledge-base/index.md'), 'utf8'));
  await write('ai-knowledge-base/index.md', page(aiIndex.data.title, convertContent(aiIndex.content, documentRoutes)));
  const software = [];
  const softwareFiles = (await files(path.join(root, 'ai-software'))).filter(file => file.endsWith('.md'));
  const softwareSources = await Promise.all(softwareFiles
    .filter(file => path.basename(file) !== 'index.md')
    .map(async file => ({ file, source: matter(await readFile(file, 'utf8')) })));
  softwareSources.sort((a, b) => a.source.data.nav_order - b.source.data.nav_order || a.file.localeCompare(b.file));
  const softwareGroups = await Promise.all(softwareFiles
    .filter(file => path.basename(file) === 'index.md' && path.dirname(file) !== path.join(root, 'ai-software'))
    .map(async file => ({ file, source: matter(await readFile(file, 'utf8')) })));
  softwareGroups.sort((a, b) => a.source.data.nav_order - b.source.data.nav_order || a.file.localeCompare(b.file));
  for (const { file, source } of softwareSources) {
    const slug = path.basename(file, '.md');
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(slug)) throw new Error(`Invalid software article filename: ${file}`);
    const link = `/ai-software/${slug}/`;
    if (usedRoutes.has(link)) throw new Error(`Duplicate document route: ${link}`);
    usedRoutes.add(link);
    documentRoutes[path.relative(root, file)] = link;
    await write(link.slice(1) + 'index.md', matter.stringify(source.content, source.data));
  }
  let groupedArticles = 0;
  for (const { file, source } of softwareGroups) {
    const slug = source.data.slug;
    if (typeof slug !== 'string' || !/^[a-z]+(?:-[a-z]+)*$/.test(slug)) throw new Error(`Invalid software group slug: ${file}`);
    const link = `/ai-software/${slug}/`;
    if (usedRoutes.has(link)) throw new Error(`Duplicate document route: ${link}`);
    usedRoutes.add(link);
    documentRoutes[path.relative(root, file)] = link;
    const articles = softwareSources.filter(article => path.dirname(article.file) === path.dirname(file));
    if (!articles.length) throw new Error(`Empty software group: ${file}`);
    const items = articles.map(article => ({ text: article.source.data.sidebar_title, link: documentRoutes[path.relative(root, article.file)] }));
    groupedArticles += articles.length;
    software.push({ text: source.data.sidebar_title, link, collapsed: false, items });
    await write(link.slice(1) + 'index.md', page(source.data.title, source.content + '\n' + articles.map((article, i) => `- [${article.source.data.title}](${items[i].link})`).join('\n')));
  }
  if (groupedArticles !== softwareSources.length) throw new Error('Every software article must belong to a group with index.md');
  const softwareIndex = matter(await readFile(path.join(root, 'ai-software/index.md'), 'utf8'));
  documentRoutes['ai-software/index.md'] = '/ai-software/';
  await write('ai-software/index.md', page(softwareIndex.data.title, softwareIndex.content + '\n' + software.map(group => `### [${group.text}](${group.link})\n\n` + group.items.map(item => `- [${item.text}](${item.link})`).join('\n')).join('\n\n')));
  const weekly = [];
  for (const filename of (await files(path.join(root, 'ai-weekly'))).filter(f => f.endsWith('.md')).reverse()) {
    const name = path.basename(filename, '.md');
    const source = matter(await readFile(filename, 'utf8'));
    if (name !== weeklyFileStem(source.data.week_start)) {
      throw new Error(`Weekly report filename must match its ISO week: ${filename}`);
    }
    // Keep published date-based URLs stable when source filenames change.
    const date = new Date(source.data.week_start).toISOString().slice(0, 10);
    const link = `/ai-weekly/${date}/`;
    weekly.push({ text: source.data.title, link });
    await write(`ai-weekly/${date}/index.md`, matter.stringify(source.content, source.data));
  }
  await write('ai-weekly/index.md', page('AI 资讯周报', '# AI 资讯周报\n\n每个自然周（周一至周日）只维护一个 Markdown 文件，以年份与 ISO 周数命名（如 2026-week48.md）；同周消息追加到原文件。优先收录官方公告与原始研究，逐条提供发布日期、新闻概览及原文链接。\n\n' + weekly.map(item => `- [${item.text}](${item.link})`).join('\n')));
  const posts = [];
  for (const filename of (await files(path.join(root, 'blog'))).filter(f => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(path.basename(f)))) {
    const source = matter(await readFile(filename, 'utf8'));
    if (source.data.published === false) continue;
    const route = postRoute(filename, source.data.date);
    if (posts.some(p => p.link === route)) throw new Error(`Duplicate post URL: ${route}`);
    posts.push({ text: source.data.title, link: route, date: new Date(source.data.date).toISOString(), tags: source.data.tags || [] });
    await write(route.slice(1) + 'index.md', page(source.data.title,
      `# ${source.data.title}\n\n${route.slice(1, 11)}\n\n` + convertContent(source.content)));
  }
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const postList = list => list.map(p => `- ${p.link.slice(1, 11)} · [${p.text}](${p.link})`).join('\n');
  await write('blog/index.md', page('随笔', '# 随笔\n\n' + postList(posts)));
  for (let n = 2; n <= Math.ceil(posts.length / 5); n++) {
    await write(`page${n}/index.md`, page(`随笔 · 第 ${n} 页`, `# 随笔 · 第 ${n} 页\n\n${postList(posts.slice((n - 1) * 5, n * 5))}\n\n[全部随笔](/blog/)`));
  }
  const about = matter(await readFile(path.join(root, 'aboutme.md'), 'utf8'));
  await write('aboutme/index.md', page('关于我', '# 关于我\n\n' + convertContent(about.content)));
  const tags = [...new Set(posts.flatMap(p => p.tags))].sort();
  await write('tags/index.md', page('标签', '# 标签\n\n' + tags.map(tag => `## ${tag}\n\n${postList(posts.filter(p => p.tags.includes(tag)))}`).join('\n\n')));
  await write('index.md', page('AI 知识库', '', {
    layout: 'home',
    hero: { name: 'AI 知识库', text: '理解 AI，学以致用', tagline: '从核心原理到前沿能力，从工作实践到安全边界。面向职场人与学习者的系统化 AI 文档。', actions: [
      { theme: 'brand', text: '开始阅读', link: '/ai-knowledge-base/' },
      { theme: 'alt', text: '浏览随笔', link: '/blog/' },
    ] },
    features: groups.map((g, i) => ({ title: groupTitles[i], details: [
      '理解大语言模型、上下文窗口与大模型幻觉，建立清晰的基础认知。',
      '认识推理模型、多模态与 AI 智能体，把握能力演进。',
      '学习提示词工程、检索增强生成与工作流自动化，连接实际任务。',
      '梳理模型与工具生态，掌握数据安全、隐私与使用边界。',
    ][i], link: g.link, linkText: '进入模块' })),
  }));
  await cp(path.join(root, 'assets'), path.join(output, 'public/assets'), { recursive: true });
  for (const [oldRoute, target] of Object.entries(legacyRoutes)) await write(`public${oldRoute}index.html`, redirectHtml(target));
  await write('public/.nojekyll', '');
  await write('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  await write('public/feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>随笔与 AI 知识库</title><link>${origin}</link><description>技术随笔</description>${posts.map(p => `<item><title>${xml(p.text)}</title><link>${origin}${p.link}</link><guid>${origin}${p.link}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
  await writeFile(path.join(root, '.vitepress/navigation.json'), JSON.stringify({ groups, posts, weekly, software, documentRoutes, legacyRoutes }, null, 2) + '\n');
  console.log(`Prepared ${groups.reduce((n, g) => n + g.items.length, 0)} AI articles and ${posts.length} published posts.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepare();
