"""Inspect real prerendered model pages and sitemap after npm run build.

Every reference tent has one canonical model page at /parts/north-face-<model>.
The older /poles/tents/<model> guide URLs must redirect there and stay out of
the sitemap so the two never compete in search."""
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1s = 0
        self.canonicals = []
        self.jsonld = []
        self.in_json = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h1': self.h1s += 1
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'script' and a.get('type') == 'application/ld+json': self.in_json = True
    def handle_endtag(self, tag):
        if tag == 'script': self.in_json = False
    def handle_data(self, data):
        if self.in_json: self.jsonld.append(json.loads(data))

root = Path(__file__).resolve().parents[1]
origin = os.environ.get('NEXT_PUBLIC_SITE_URL', 'https://basecampsurplus.com').rstrip('/')
refs = json.loads((root / 'content/tent-reference.json').read_text())['tents']
def slug(v):
    return re.sub(r'[^a-z0-9]+', '-', v.lower()).strip('-')

pages = [(slug(t['model'].removeprefix('The North Face ')), slug(t['model'].removeprefix('The '))) for t in refs]
assert len({p for _, p in pages}) == len(pages), 'Duplicate model URL'
sitemap = ET.fromstring((root / '.next/server/app/sitemap.xml.body').read_text())
urls = [n.text for n in sitemap.findall('{*}url/{*}loc')]
assert len(set(urls)) == len(urls), 'Duplicate sitemap URL'
assert not any('?' in url for url in urls), 'Search/filter URL in sitemap'
assert not any('/poles/tents/' in url for url in urls), 'Legacy guide URL in sitemap'
for legacy, parts in pages:
    meta = json.loads((root / f'.next/server/app/poles/tents/{legacy}.meta').read_text())
    assert meta.get('status') in (307, 308) and f'/parts/{parts}' in json.dumps(meta), (legacy, 'Legacy guide must redirect to its parts page', meta)
    parser = Page()
    html = (root / f'.next/server/app/parts/{parts}.html').read_text()
    parser.feed(html)
    expected = f'{origin}/parts/{parts}'
    assert parser.h1s == 1, (parts, 'Expected one h1')
    assert parser.canonicals == [expected], (parts, parser.canonicals)
    assert expected in urls, (parts, 'Missing from sitemap')
    assert parser.jsonld, (parts, 'Missing structured data')
    nodes = [node for group in parser.jsonld for node in (group if isinstance(group, list) else [group])]
    assert any(n.get('@type') == 'BreadcrumbList' for n in nodes), parts
    assert not any(n.get('@type') == 'Product' for n in nodes), 'Model page must not claim to be an available product'
print(f'PASS: {len(pages)} model pages render with unique self-canonicals, one h1, breadcrumbs and sitemap coverage; legacy guide URLs redirect.')
