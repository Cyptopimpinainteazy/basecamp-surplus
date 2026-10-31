"""Inspect real prerendered guide HTML and sitemap after npm run build (no database required)."""
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
slugs = [re.sub(r'[^a-z0-9]+', '-', t['model'].removeprefix('The North Face ').lower()).strip('-') for t in refs]
assert len(set(slugs)) == len(slugs), 'Duplicate model URL'
sitemap = ET.fromstring((root / '.next/server/app/sitemap.xml.body').read_text())
urls = [n.text for n in sitemap.findall('{*}url/{*}loc')]
assert len(set(urls)) == len(urls), 'Duplicate sitemap URL'
assert not any('?' in url for url in urls), 'Search/filter URL in sitemap'
for slug in slugs:
    parser = Page()
    html = (root / f'.next/server/app/poles/tents/{slug}.html').read_text()
    parser.feed(html)
    expected = f'{origin}/poles/tents/{slug}'
    assert parser.h1s == 1, (slug, 'Expected one h1')
    assert parser.canonicals == [expected], (slug, parser.canonicals)
    assert expected in urls, (slug, 'Missing from sitemap')
    assert parser.jsonld, (slug, 'Missing structured data')
    nodes = [node for group in parser.jsonld for node in (group if isinstance(group, list) else [group])]
    assert any(n.get('@type') == 'BreadcrumbList' for n in nodes), slug
    assert not any(n.get('@type') == 'Product' for n in nodes), 'Reference guide must not claim to be an available product'
    assert 'Reference, not a fit guarantee.' in html, slug
print(f'PASS: {len(slugs)} rendered model guides; unique self-canonicals, h1s, breadcrumbs and sitemap coverage.')
