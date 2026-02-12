#!/bin/sh
set -e

hugo --minify

npx pagefind --site public

hugo list drafts | python3 -c "
import csv, sys, urllib.parse
reader = csv.DictReader(sys.stdin)
for row in reader:
    url = row.get('permalink', '')
    if url:
        path = urllib.parse.urlparse(url).path
        if path:
            print(f'{path} /404.html 404')
" >> public/_redirects
