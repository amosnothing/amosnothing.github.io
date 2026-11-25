"""Check generated documentation, navigation, table access, and legacy blog output."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import sys


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links = []
        self.ids = set()
        self.headings = []
        self.tables = 0
        self.scroll_regions = 0
        self.language = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.links.append(attrs.get('href', ''))
        if tag == 'h1':
            self.headings.append(attrs)
        if tag == 'html':
            self.language = attrs.get('lang')
        if tag == 'table':
            self.tables += 1
        if 'table-wrapper' in attrs.get('class', '').split():
            assert attrs.get('tabindex') == '0', 'Tables must be keyboard-scrollable'
            assert attrs.get('role') == 'region' and attrs.get('aria-label')
            self.scroll_regions += 1


def check(site):
    assert site.is_dir(), f'Build the site first: {site}'
    source = Path(__file__).resolve().parents[1]
    articles = sorted((source / 'ai-knowledge-base').glob('*/*.md'))
    articles = [p for p in articles if p.name != 'index.md']
    assert len(articles) == 11
    for article in articles:
        relative = article.relative_to(source)
        rendered = site / relative.with_suffix('') / 'index.html'
        html = rendered.read_text()
        doc = Document(html)
        assert doc.language == 'zh-CN', relative
        assert len(doc.headings) == 1, relative
        assert 'site-nav' in doc.ids and 'search-input' in doc.ids, relative
        assert 'markdown-toc' in doc.ids, relative
        toc = [url for url in doc.links if url.startswith('#') and url[1:] in doc.ids]
        assert len(set(toc)) >= 5, relative
        assert doc.tables == doc.scroll_regions, relative
        assert '/ai-knowledge-base/' in doc.links, relative
        assert '<meta name="text-scale" content="scale">' in html, relative
        assert 'beautifuljekyll.css' not in html, relative
        assert '核心摘要' in html and '参考来源' in html, relative
        for href in doc.links:
            url = urlsplit(href)
            if url.scheme or url.netloc or not url.path.startswith('/ai-knowledge-base/'):
                continue
            dest = site / unquote(url.path.lstrip('/'))
            if url.path.endswith('/'):
                dest /= 'index.html'
            assert dest.is_file(), (relative, href)
    groups = sorted((source / 'ai-knowledge-base').glob('*/index.md'))
    assert len(groups) == 4
    for group in groups:
        html = (site / group.relative_to(source).parent / 'index.html').read_text()
        assert 'nav-list' in html
    home = (site / 'index.html').read_text()
    assert 'AI 知识库' in home and 'post-list' in home
    assert (site / 'page2/index.html').is_file(), 'Blog pagination must remain available'
    assert (site / '2024-08-27-diary/index.html').is_file(), 'Existing diary URL must remain available'
    search = json.loads((site / 'assets/js/search-data.json').read_text())
    for article in articles:
        title = next(line.removeprefix('title: ') for line in article.read_text().splitlines() if line.startswith('title: '))
        assert any(title in str(entry) for entry in search.values()), title
    print('PASS: 11 articles, 4 module pages, TOCs, links, search data, keyboard tables, blog and pagination')


if __name__ == '__main__':
    check(Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve())
