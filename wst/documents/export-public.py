from pathlib import Path
import hashlib
import json
import re
import fitz

ROOT = Path('/work')
IP = re.compile(r'(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])')
LOCAL = re.compile(r'/(?:Users|home)/[^\s<>]+')
records = []
for source, output, title in [
    ('handoff-private.pdf', 'frozen-handoff-r5.pdf', 'Frozen Projection Handoff R5'),
    ('diagrams-private.pdf', 'frozen-signal-flow-r5.pdf', 'Frozen Signal Flow R5'),
]:
    original = fitz.open(ROOT / source)
    original_toc = original.get_toc()
    removed = 0
    removed_local = 0
    for page in original:
        text = page.get_text()
        for address in set(IP.findall(text)):
            for box in page.search_for(address):
                page.add_redact_annot(box, text='Private LAN', fontsize=6,
                                      fill=(1, 1, 1), text_color=(.2, .3, .4))
                removed += 1
        for local in set(LOCAL.findall(text)):
            for box in page.search_for(local):
                page.add_redact_annot(box, text='Private source', fontsize=6,
                                      fill=(1, 1, 1), text_color=(.2, .3, .4))
                removed_local += 1
        page.apply_redactions(images=0, graphics=0)
        for link in page.get_links():
            uri = link.get('uri', '')
            if uri.startswith(('file:', 'http://192.', 'http://10.', 'http://172.')):
                page.delete_link(link)
    original.set_metadata({'title': title + ' | Public reference',
                           'author': 'Dave Robertson',
                           'subject': 'November 14, 2026 evidence reconciliation. Field acceptance pending.'})
    original.save(ROOT / output, garbage=4, deflate=True, no_new_id=True)
    public = fitz.open(ROOT / output)
    text = '\n'.join(page.get_text() for page in public)
    assert not IP.search(text), 'IP left in public text'
    assert not LOCAL.search(text), 'Local path left in public text'
    assert public.get_toc() == original_toc, 'Bookmarks changed'
    assert [[link.get('kind'), link.get('page'), link.get('to'), link.get('uri')] for page in public for link in page.get_links()] == [[link.get('kind'), link.get('page'), link.get('to'), link.get('uri')] for page in fitz.open(ROOT/source) for link in page.get_links()], 'Link targets changed'
    assert public.embfile_count() == 0, 'Unexpected embedded files'
    for page in public:
        for link in page.get_links():
            assert not link.get('uri', '').startswith('file:'), 'Local URI left'
    for index in ([0, 7, 9, 10, 16, 17] if len(public) == 18 else [0, 3, 4]):
        public[index].get_pixmap(matrix=fitz.Matrix(1, 1)).save(ROOT / f'{output}-{index+1}.png')
    records.append({'file': output, 'sourceSha256': hashlib.sha256((ROOT/source).read_bytes()).hexdigest(),
                    'publicSha256': hashlib.sha256((ROOT/output).read_bytes()).hexdigest(),
                    'pages': len(public), 'addressesOmitted': removed, 'localPathsOmitted': removed_local,
                    'bookmarks': len(public.get_toc()),
                    'internalLinks': sum(link['kind'] in (fitz.LINK_GOTO, fitz.LINK_NAMED) for page in public for link in page.get_links())})
(ROOT / 'public-export-verification.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps(records, indent=2))
