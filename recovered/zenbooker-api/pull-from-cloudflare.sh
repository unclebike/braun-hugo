#!/bin/sh
set -eu

# Downloads the currently deployed Worker bundle and config from Cloudflare.
#
# Required env vars:
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ACCOUNT_ID
#
# This script cannot export secret VALUES; it only captures secret names.

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "Missing CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID" >&2
  exit 2
fi

SCRIPT_NAME="zenbooker-api"
OUT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

curl -sS -D "$TMP_DIR/headers.txt" -o "$TMP_DIR/body.bin" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME"

python3 - <<'PY'
import os, re
from email import policy
from email.parser import BytesParser

tmp_dir = os.environ['TMP_DIR']
out_dir = os.environ['OUT_DIR']

headers_path = os.path.join(tmp_dir, 'headers.txt')
body_path = os.path.join(tmp_dir, 'body.bin')

with open(headers_path, 'rb') as f:
  headers = f.read().decode('utf-8', 'replace')

m = re.search(r'content-type:\s*multipart/form-data;\s*boundary=([A-Za-z0-9]+)', headers, re.IGNORECASE)
if not m:
  raise SystemExit('Could not find multipart boundary in response headers')

boundary = m.group(1)

with open(body_path, 'rb') as f:
  body = f.read()

raw = (f'Content-Type: multipart/form-data; boundary={boundary}\r\nMIME-Version: 1.0\r\n\r\n').encode() + body
msg = BytesParser(policy=policy.default).parsebytes(raw)

index = None
for part in msg.iter_parts():
  fn = part.get_filename() or ''
  if fn == 'index.js':
    index = part.get_payload(decode=True) or b''
    break

if index is None:
  raise SystemExit('index.js not found in multipart payload')

out_path = os.path.join(out_dir, 'index.js')
with open(out_path, 'wb') as f:
  f.write(index)

print(f'Wrote {len(index)} bytes to {out_path}')
PY

curl -sS -o "$OUT_DIR/cloudflare-settings.full.json" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/settings"

curl -sS -o "$OUT_DIR/cloudflare-routes.full.json" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/routes"

echo "Wrote $OUT_DIR/cloudflare-settings.full.json"
echo "Wrote $OUT_DIR/cloudflare-routes.full.json"
