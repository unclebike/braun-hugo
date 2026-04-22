#!/bin/sh
set -e

# Theme CSS: compile assets/css/screen.css @imports into assets/built/screen.css.
# Ghost-style pipeline (postcss-easy-import + autoprefixer + cssnano). Installs
# theme deps on first run or when package-lock changes.
(
  cd themes/braun-hugo
  npm install --no-audit --no-fund
  npm run css
)

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
