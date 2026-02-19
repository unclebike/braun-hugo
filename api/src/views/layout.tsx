/** @jsx jsx */
/** @jsxFrag Fragment */
import { html } from 'hono/html';
// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { Fragment, jsx } from 'hono/jsx';

export const Layout = ({ title, children }: { title: string; children: unknown }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <title>{title} - GOATkit Admin</title>
        <link rel="manifest" href="/admin/manifest.webmanifest" />
        <meta name="theme-color" content="#eff1f5" id="theme-color-meta" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          {html`<script>
(function(){
  function autoThemeFromLocalTime() {
    // Heuristic: use Mocha in the evening/night unless user explicitly chose.
    // Assumption: "after 5pm" means 17:00-06:59 local time.
    try {
      var h = new Date().getHours();
      return (h >= 17 || h < 7) ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function syncThemeColorMeta(){
    try {
      var meta = document.getElementById('theme-color-meta');
      if (!meta) return;
      var css = getComputedStyle(document.documentElement);
      var c = String(css.getPropertyValue('--theme-color') || '').trim();
      if (c) {
        meta.setAttribute('content', c);
        return;
      }
      // Fallback for first paint before CSS vars are available.
      var t = document.documentElement.getAttribute('data-theme') || 'light';
      meta.setAttribute('content', t === 'dark' ? '#1e1e2e' : '#eff1f5');
    } catch (e) {}
  }

  // Default to Latte unless user explicitly chose otherwise.
  var s = localStorage.getItem('theme');
  var t = (s === 'dark' || s === 'light') ? s : autoThemeFromLocalTime();
  document.documentElement.setAttribute('data-theme', t);

  // Set a sensible theme-color immediately for browser chrome.
  try {
    var meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1e1e2e' : '#eff1f5');
  } catch (e) {}

  // Styles load immediately after this script; wait a tick so CSS vars are available.
  requestAnimationFrame(syncThemeColorMeta);
  window.__syncThemeColorMeta = syncThemeColorMeta;

  // If user never chose a theme, automatically switch based on local time.
  // Keeps manual override stable once set.
  setInterval(function() {
    try {
      var manual = localStorage.getItem('theme');
      if (manual === 'dark' || manual === 'light') return;
      var next = autoThemeFromLocalTime();
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      if (next !== cur) {
        document.documentElement.setAttribute('data-theme', next);
        syncThemeColorMeta();
        if (typeof window.updateThemeLabels === 'function') window.updateThemeLabels(next);
      }
    } catch (e) {}
  }, 60 * 1000);
})();
</script>
<style data-fodt>
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-100LilBunny.otf') format('opentype');
  font-weight: 100;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-100LilBunnyItalic.otf') format('opentype');
  font-weight: 100;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-200LilMondo.otf') format('opentype');
  font-weight: 200;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-200LilMondoItalic.otf') format('opentype');
  font-weight: 200;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-300LilKahuna.otf') format('opentype');
  font-weight: 300;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-300LilKahunaItalic.otf') format('opentype');
  font-weight: 300;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-400LilDude.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-400LilDudeItalic.otf') format('opentype');
  font-weight: 400;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-500Dudette.otf') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-500DudetteItalic.otf') format('opentype');
  font-weight: 500;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-600Bunny.otf') format('opentype');
  font-weight: 600;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-600BunnyItalic.otf') format('opentype');
  font-weight: 600;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-700Mondo.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-700MondoItalic.otf') format('opentype');
  font-weight: 700;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-800Kahuna.otf') format('opentype');
  font-weight: 800;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-800KahunaItalic.otf') format('opentype');
  font-weight: 800;
  font-style: italic;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-900Dude.otf') format('opentype');
  font-weight: 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-900DudeItalic.otf') format('opentype');
  font-weight: 900;
  font-style: italic;
  font-display: block;
}

* {
  font-family: var(--font-sans) !important;
  font-feature-settings: 'kern' 1;
}

:root {
  /* Font family */
  --font-sans: 'TideSans', system-ui, -apple-system, sans-serif;

  /* Type scale (Major Third: 1.25) */
  --text-xxs: 1.0rem;
  --text-xs: 1.2rem;
  --text-sm: 1.5rem;
  --text-base: 1.8rem;
  --text-md: 2.3rem;
  --text-lg: 2.8rem;

  /* Line heights */
  --lh-tight: 1.1;
  --lh-normal: 1.4;
  --lh-loose: 1.6;

  /* Font weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 600;
  --font-weight-bold: 700;

  --brand: #dc8a78;
  --on-brand: #1e1e2e;
  --bg: #eff1f5;
  --bg-card: #ffffff;
  --bg-sidebar: #e6e9ef;
  --text: #4c4f69;
  --text-secondary: #5c5f78;
  --text-sidebar: #6c6f85;
  --text-sidebar-hover: #4c4f69;
  --text-sidebar-active: #1e66f5;
  --border: #ccd0da;
  --input-bg: #ffffff;
  --surface-0: #ccd0da;
  --surface-1: #bcc0cc;
  --surface-2: #acb0be;
  --destructive: #e64553;
  --destructive-hover: #d20f39;
  --destructive-soft: #fdecee;
  --destructive-border: #ea999f;
  --sidebar-divider: rgba(76, 79, 105, 0.14);
  --sidebar-hover-bg: rgba(76, 79, 105, 0.08);
  --sidebar-active-bg: rgba(30, 102, 245, 0.12);

  --theme-color: #eff1f5;

  /* Badge accents (Catppuccin Latte) */
  --badge-neutral-bg: rgba(188, 192, 204, 0.40);
  --badge-neutral-border: rgba(156, 160, 176, 0.60);
  --badge-neutral-text: var(--text);
  --badge-primary: #1e66f5;
  --badge-primary-bg: rgba(30, 102, 245, 0.16);
  --badge-primary-border: rgba(30, 102, 245, 0.30);
  --badge-secondary: #40a02b;
  --badge-secondary-bg: rgba(64, 160, 43, 0.16);
  --badge-secondary-border: rgba(64, 160, 43, 0.30);
  --badge-destructive: #d20f39;
  --badge-destructive-bg: rgba(210, 15, 57, 0.14);
  --badge-destructive-border: rgba(210, 15, 57, 0.28);

  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}

[data-theme="dark"] {
  --bg: #1e1e2e;
  --bg-card: #313244;
  --bg-sidebar: #11111b;
  --text: #cdd6f4;
  --text-secondary: #a6adc8;
  --text-sidebar: #6c7086;
  --text-sidebar-hover: #bac2de;
  --text-sidebar-active: #cdd6f4;
  --border: #45475a;
  --input-bg: #45475a;
  --surface-0: #313244;
  --surface-1: #45475a;
  --surface-2: #585b70;
  --destructive: #eba0ac;
  --destructive-hover: #f38ba8;
  --destructive-soft: rgba(235, 160, 172, 0.14);
  --destructive-border: #6c7086;
  --sidebar-divider: rgba(255, 255, 255, 0.08);
  --sidebar-hover-bg: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(255, 255, 255, 0.1);

  --theme-color: #1e1e2e;

  /* Badge accents (Catppuccin Mocha) */
  --badge-neutral-bg: rgba(88, 91, 112, 0.42);
  --badge-neutral-border: rgba(147, 153, 178, 0.40);
  --badge-neutral-text: var(--text);
  --badge-primary: #89b4fa;
  --badge-primary-bg: rgba(137, 180, 250, 0.20);
  --badge-primary-border: rgba(137, 180, 250, 0.34);
  --badge-secondary: #a6e3a1;
  --badge-secondary-bg: rgba(166, 227, 161, 0.18);
  --badge-secondary-border: rgba(166, 227, 161, 0.32);
  --badge-destructive: #f38ba8;
  --badge-destructive-bg: rgba(243, 139, 168, 0.18);
  --badge-destructive-border: rgba(243, 139, 168, 0.32);
}

body { opacity: 0; }
body.ready { opacity: 1; transition: opacity .15s; }

html, body {
  background: var(--bg);
}

/* iOS: headers extend under translucent status bar via .page-header padding-top. */

/* Apply Catppuccin variables to Franken/UIkit components in light mode too.
   (Dark mode already has explicit overrides; these base rules bring Latte in line.) */
.uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
.bg-white { background: var(--bg-card) !important; }
.border-b, .border-border { border-color: var(--border) !important; }
.text-muted-foreground { color: var(--text-secondary) !important; }
.uk-input, .uk-select, .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
.uk-table td { color: var(--text) !important; }
.uk-table-divider > :not(:first-child) > tr, .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
.uk-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--badge-neutral-border) !important;
  background: var(--badge-neutral-bg) !important;
  color: var(--badge-neutral-text) !important;
  font-weight: 400 !important;
  letter-spacing: 0em;
}
@media (max-width: 767px) {
  .uk-label { padding: 3px 5px; }
  .uk-label .badge-label { display: none; }
}
.uk-label-primary {
  border-color: var(--badge-primary-border) !important;
  background: var(--badge-primary-bg) !important;
  color: var(--badge-primary) !important;
}
.uk-label-secondary {
  border-color: var(--badge-secondary-border) !important;
  background: var(--badge-secondary-bg) !important;
  color: var(--badge-secondary) !important;
}
.uk-label-destructive {
  border-color: var(--badge-destructive-border) !important;
  background: var(--badge-destructive-bg) !important;
  color: var(--badge-destructive) !important;
}
.uk-btn-default { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; color: var(--on-brand) !important; }
.uk-checkbox, .uk-toggle-switch { background: var(--input-bg) !important; border-color: var(--border) !important; }
.uk-checkbox:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-toggle-switch:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-offcanvas-bar { background: var(--bg-sidebar) !important; }
.uk-form-label { color: var(--text-secondary) !important; }
h2, h3 { color: var(--text) !important; }
p { color: var(--text) !important; }
.uk-nav-header { color: var(--text-secondary) !important; }
.uk-close { color: var(--text) !important; }

[data-theme="dark"] .uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
[data-theme="dark"] .bg-white { background: var(--bg-card) !important; }
[data-theme="dark"] .border-b, [data-theme="dark"] .border-border { border-color: var(--border) !important; }
[data-theme="dark"] .text-muted-foreground { color: var(--text-secondary) !important; }
[data-theme="dark"] .uk-input, [data-theme="dark"] .uk-select, [data-theme="dark"] .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table td { color: var(--text) !important; }
[data-theme="dark"] .uk-table-divider > :not(:first-child) > tr, [data-theme="dark"] .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
[data-theme="dark"] .uk-btn-default { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; color: #1e1e2e !important; }
[data-theme="dark"] .uk-checkbox, [data-theme="dark"] .uk-toggle-switch { background: var(--input-bg) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-checkbox:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
[data-theme="dark"] .uk-toggle-switch:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
[data-theme="dark"] .uk-offcanvas-bar { background: var(--bg-sidebar) !important; }
[data-theme="dark"] .uk-form-label { color: var(--text-secondary) !important; }
[data-theme="dark"] h2, [data-theme="dark"] h3 { color: var(--text) !important; }
[data-theme="dark"] p { color: var(--text) !important; }
[data-theme="dark"] a.uk-link { color: var(--brand) !important; }
[data-theme="dark"] .uk-nav-header { color: var(--text-secondary) !important; }
[data-theme="dark"] .uk-close { color: var(--text) !important; }
</style>`}
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <script src="/admin.js" defer></script>
        <link rel="stylesheet" href="https://unpkg.com/franken-ui@2.1.2/dist/css/core.min.css" />
        <script src="https://unpkg.com/franken-ui@2.1.2/dist/js/core.iife.js"></script>
        <script src="https://cdn.tailwindcss.com/3.4.17"></script>
        {html`<script>tailwind.config = { corePlugins: { preflight: false } };
(function() {
  var fk = document.querySelector('link[href*="franken"]');
  if (!fk) return;
  function fixOrder() {
    document.head.querySelectorAll('style:not([data-fodt])').forEach(function(s) {
      if (fk.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING) {
        document.head.appendChild(s);
      }
    });
  }
  var obs = new MutationObserver(fixOrder);
  obs.observe(document.head, { childList: true });
  document.addEventListener('DOMContentLoaded', function() { fixOrder(); obs.disconnect(); });
})();
</script>`}

        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" />
        <script src="https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.js"></script>
        {html`<style>.leaflet-container img { max-width: none !important; max-height: none !important; }</style>`}
        {html`<script>
function _onRadiusMilesInput() { updateRadius(); }
function _onRadiusLatChange() { updateRadius(); }
function _onRadiusLngChange() { updateRadius(); }

function initMaps() {
  if (typeof L === 'undefined') return;

  var rm = document.getElementById('radius-map');
  if (rm && !rm._mapInit) {
    rm._mapInit = true;
    var lat = parseFloat(rm.dataset.lat) || 44.1628;
    var lng = parseFloat(rm.dataset.lng) || -77.3832;
    var miles = parseFloat(rm.dataset.miles) || 10;
    var map = L.map(rm).setView([lat, lng], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    var circle = L.circle([lat, lng], { radius: miles * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
    if (lat !== 44.1628) map.fitBounds(circle.getBounds().pad(0.1));
    map.on('click', function(e) {
      var latEl = document.getElementById('center-lat');
      var lngEl = document.getElementById('center-lng');
      if (latEl) latEl.value = e.latlng.lat.toFixed(6);
      if (lngEl) lngEl.value = e.latlng.lng.toFixed(6);
      updateRadius();
    });
    window._radiusMap = map;
    window._radiusCircle = circle;
    var milesEl = document.getElementById('radius-miles');
    if (milesEl) milesEl.addEventListener('input', _onRadiusMilesInput);
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (latEl) latEl.addEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.addEventListener('change', _onRadiusLngChange);
    setTimeout(function() { map.invalidateSize(); }, 200);
  }

    var gm = document.getElementById('geofence-map');
    if (gm && !gm._mapInit) {
      gm._mapInit = true;
      var pts = [];
      try { pts = JSON.parse(gm.dataset.points || '[]'); } catch(e) {}

     function normalizePair(a, b) {
       var x = Number(a);
       var y = Number(b);
       if (!isFinite(x) || !isFinite(y)) return [44.1628, -77.3832];
       var ax = Math.abs(x);
       var ay = Math.abs(y);
       if (ax > 90 && ax <= 180 && ay <= 90) return [y, x];
       if (ay > 90 && ay <= 180 && ax <= 90) return [x, y];
       if ((x < 0 && y > 0) || (x > 0 && y < 0)) {
         var lat = x > 0 ? x : y;
         var lng = x < 0 ? x : y;
         if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
       }
       return [x, y];
     }

     function toLL(p) {
       if (Array.isArray(p) && p.length >= 2) return normalizePair(p[0], p[1]);
       if (p && typeof p === 'object') return normalizePair(p.lat, p.lng);
       return [44.1628, -77.3832];
     }

      var center = pts.length > 0 ? toLL(pts[0]) : [44.1628, -77.3832];
      var map = L.map(gm).setView(center, 12);
     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
     var poly = null;

    function syncToHidden() {
      var coords = [];
      if (poly) {
        poly.getLatLngs()[0].forEach(function(ll) { coords.push([ll.lat, ll.lng]); });
      }
      var h = document.getElementById('polygon-json-hidden');
      if (h) {
        h.value = coords.length ? JSON.stringify(coords) : '';
        h.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var c = document.getElementById('gf-count');
      if (c) c.textContent = coords.length + ' pts';
    }

     function enableEdit() {
       if (poly && poly.pm && typeof poly.pm.enable === 'function') {
         poly.pm.enable({ allowSelfIntersection: false });
       }
     }

     function loadExisting() {
       if (pts.length >= 3) {
         poly = L.polygon(pts.map(toLL), { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
         map.fitBounds(poly.getBounds().pad(0.1));
         enableEdit();
         if (poly.pm) {
           poly.on('pm:edit', syncToHidden);
           poly.on('pm:vertexremoved', syncToHidden);
         }
         syncToHidden();
       }
     }
     loadExisting();

     var drawBtn = document.getElementById('gf-draw-btn');

     if (!map.pm) {
       if (drawBtn) {
         drawBtn.textContent = 'Drawing unavailable';
         drawBtn.disabled = true;
       }
     } else {
       map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false });
       map.pm.setGlobalOptions({ pathOptions: { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 } });

       if (drawBtn) drawBtn.addEventListener('click', function() {
         if (poly) { map.removeLayer(poly); poly = null; syncToHidden(); }
         map.pm.enableDraw('Polygon', { snappable: false });
         drawBtn.textContent = 'Drawing...';
         drawBtn.disabled = true;
       });

       map.on('pm:create', function(e) {
         poly = e.layer;
         enableEdit();
         poly.on('pm:edit', syncToHidden);
         poly.on('pm:vertexremoved', syncToHidden);
         syncToHidden();
         if (drawBtn) { drawBtn.textContent = 'Redraw'; drawBtn.disabled = false; }
       });

       map.on('pm:drawend', function() {
         if (drawBtn) { drawBtn.textContent = poly ? 'Redraw' : 'Draw Polygon'; drawBtn.disabled = false; }
       });
     }

    var clearBtn = document.getElementById('clear-geofence-btn');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      if (poly) { map.removeLayer(poly); poly = null; }
      syncToHidden();
      if (drawBtn) { drawBtn.textContent = 'Draw Polygon'; drawBtn.disabled = false; }
    });

    window._geofenceMap = map;
    setTimeout(function() { map.invalidateSize(); }, 200);
  }
}

function updateRadius() {
  var map = window._radiusMap;
  var circle = window._radiusCircle;
  if (!map || !circle) return;
  var la = parseFloat(document.getElementById('center-lat').value) || 44.1628;
  var ln = parseFloat(document.getElementById('center-lng').value) || -77.3832;
  var mi = parseFloat(document.getElementById('radius-miles').value) || 10;
  map.removeLayer(circle);
  var newCircle = L.circle([la, ln], { radius: mi * 1609.34, color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
  window._radiusCircle = newCircle;
  map.setView([la, ln]);
  var rf = document.getElementById('radius-form');
  if (rf) rf.dispatchEvent(new Event('change', { bubbles: true }));
}

document.addEventListener('htmx:beforeCleanupElement', function(e) {
  var el = e.detail.elt;
  if (el.id === 'radius-map' && window._radiusMap) {
    var milesEl = document.getElementById('radius-miles');
    var latEl = document.getElementById('center-lat');
    var lngEl = document.getElementById('center-lng');
    if (milesEl) milesEl.removeEventListener('input', _onRadiusMilesInput);
    if (latEl) latEl.removeEventListener('change', _onRadiusLatChange);
    if (lngEl) lngEl.removeEventListener('change', _onRadiusLngChange);
    window._radiusMap.off();
    window._radiusMap.remove();
    window._radiusMap = null;
    window._radiusCircle = null;
    el._mapInit = false;
  }
  if (el.id === 'geofence-map' && window._geofenceMap) {
    window._geofenceMap.off();
    window._geofenceMap.remove();
    window._geofenceMap = null;
    el._mapInit = false;
  }
});

document.addEventListener('click', function(e) {
  var item = e.target.closest('.address-result');
  if (!item) return;
  var d = item.dataset;
  var prefix = d.prefix || 'addr';
  if (prefix === 'radius') {
    var cLat = document.getElementById('center-lat');
    var cLng = document.getElementById('center-lng');
    if (cLat) cLat.value = d.lat;
    if (cLng) cLng.value = d.lng;
    var rr = document.getElementById('radius-address-results');
    if (rr) rr.innerHTML = '';
    updateRadius();
  } else {
    var ids = {
      'addr-line1': d.line1,
      'addr-city': d.city,
      'addr-state': d.state,
      'addr-postal': d.postal,
      'addr-lat': d.lat,
      'addr-lng': d.lng,
      'address_line_1': d.line1,
      'address_city': d.city,
      'address_state': d.state,
      'address_postal': d.postal,
      'address_lat': d.lat,
      'address_lng': d.lng,
    };
    for (var id in ids) { var el = document.getElementById(id); if (el) el.value = ids[id]; }
    var ar = document.getElementById('address-results');
    if (ar) ar.innerHTML = '';
  }
});

document.addEventListener('htmx:configRequest', function(e) {
  var el = e.detail.elt;
  if (el.id === 'area-type') {
    var tid = window.location.pathname.split('/territories/')[1];
    if (tid) tid = tid.split('/')[0];
    e.detail.path = '/admin/territories/' + tid + '/area-panel/' + el.value;
  }
});

document.addEventListener('htmx:afterSettle', function() {
  setTimeout(initMaps, 100);
});
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

function scrollSmsThreadToBottom(force) {
  var scroller = document.getElementById('sms-history-scroll');
  if (!scroller) return;

  var canScroll = scroller.scrollHeight > (scroller.clientHeight + 12);

  var didInitial = scroller.dataset && scroller.dataset.smsInitialScrollDone === '1';
  if (!didInitial) force = true;

  if (!force) {
    var distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom > 96) return;
  }

  scroller.scrollTop = scroller.scrollHeight;
  if (canScroll && scroller.dataset) scroller.dataset.smsInitialScrollDone = '1';
}

function scrollSmsThreadToBottomSoon(force) {
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      scrollSmsThreadToBottom(force);
    });
  });

  // iOS Safari/PWA can report an intermediate scrollHeight during initial
  // layout/font hydration. Retry a couple times without being aggressive.
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 60);
  setTimeout(function() { scrollSmsThreadToBottom(force); }, 220);
}

function focusSmsComposer() {
  var textarea = document.querySelector('#sms-thread-panel textarea[name="sms_body"]');
  if (!textarea || typeof textarea.focus !== 'function') return;
  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }
  if (typeof textarea.setSelectionRange === 'function') {
    var end = textarea.value ? textarea.value.length : 0;
    textarea.setSelectionRange(end, end);
  }
}

function focusSmsComposerWithRetries() {
  focusSmsComposer();
  setTimeout(focusSmsComposer, 60);
  setTimeout(focusSmsComposer, 180);
}

document.addEventListener('input', function (e) {
  var target = e.target;
  if (!target || !target.id) return;
  if (target.id !== 'tax_amount' && target.id !== 'discount_amount') return;
  var total = document.getElementById('total_amount');
  if (!total) return;
  var subtotal = 0;
  document.querySelectorAll('[data-line-total]').forEach(function(el) {
    subtotal += parseFloat(el.dataset.lineTotal || '0') || 0;
  });
  var tax = parseFloat((document.getElementById('tax_amount') || {}).value || '0') || 0;
  var disc = parseFloat((document.getElementById('discount_amount') || {}).value || '0') || 0;
  total.value = Math.max(0, subtotal + tax - disc).toFixed(2);
});

function flashSmsSendButton() {
  var btn = document.querySelector('#sms-thread-panel [data-sms-send-success="true"]');
  if (!btn) return;
  var originalStyle = btn.getAttribute('style') || '';
  var originalText = btn.textContent || 'Send';
  btn.textContent = 'Sent';
  btn.setAttribute('style', 'min-width:110px;background:#16a34a;border-color:#15803d;color:#fff;');
  setTimeout(function() {
    if (!document.body.contains(btn)) return;
    btn.textContent = originalText;
    btn.setAttribute('style', originalStyle || 'min-width:110px;');
  }, 1200);
}

document.addEventListener('htmx:afterSwap', function(e) {
  var target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  var requestConfig = e.detail && e.detail.requestConfig ? e.detail.requestConfig : null;
  var requestPath = requestConfig && typeof requestConfig.path === 'string' ? requestConfig.path : '';
  var requestElt = requestConfig && requestConfig.elt ? requestConfig.elt : null;
  if (target.id === 'sms-history') {
    scrollSmsThreadToBottomSoon(false);
    return;
  }
  if (target.id === 'sms-thread-panel') {
    scrollSmsThreadToBottomSoon(true);
    var sentFromReplyForm = requestPath.indexOf('/sms-reply') !== -1;
    if (!sentFromReplyForm && requestElt && typeof requestElt.matches === 'function') {
      sentFromReplyForm = requestElt.matches('form[hx-post*="/sms-reply"]');
    }
    if (target.querySelector('[data-sms-send-success="true"]')) {
      requestAnimationFrame(flashSmsSendButton);
    }
    if (target.querySelector('[data-sms-send-result]') || sentFromReplyForm) {
      requestAnimationFrame(focusSmsComposerWithRetries);
    }
    return;
  }
  if (target.id === 'page-content') {
    scrollSmsThreadToBottomSoon(true);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  scrollSmsThreadToBottomSoon(true);
});

document.addEventListener('htmx:beforeRequest', function(e) {
  var oc = document.getElementById('offcanvas-nav');
  if (oc && typeof UIkit !== 'undefined') {
    var inst = UIkit.offcanvas(oc);
    if (inst && inst.isToggled && inst.isToggled()) inst.hide();
  }
});

document.addEventListener('htmx:afterRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (!ind) return;
  if (e.detail.successful) {
    ind.textContent = 'Saved';
    ind.className = 'save-indicator save-ok';
    ind.style.opacity = '1';
    setTimeout(function() { ind.style.opacity = '0'; }, 2000);
    if (el.tagName === 'INPUT' && el.type === 'checkbox') {
      var section = el.closest('section');
      if (section) {
        var count = section.querySelectorAll('input[type=checkbox]:checked').length;
        var badge = section.querySelector('[id$="-count"]');
        if (badge) badge.textContent = count + ' assigned';
      }
    }
  } else {
    ind.textContent = 'Error saving';
    ind.className = 'save-indicator save-err';
    ind.style.opacity = '1';
    if (el.tagName === 'INPUT' && el.type === 'checkbox') el.checked = !el.checked;
  }
});
document.addEventListener('htmx:beforeRequest', function(e) {
  var el = e.detail.elt;
  var ind = null;
  if (el.classList.contains('autosave')) {
    ind = el.querySelector('.save-indicator');
  } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
    var section = el.closest('section');
    if (section) ind = section.querySelector('.save-indicator');
  }
  if (ind) { ind.textContent = 'Saving…'; ind.className = 'save-indicator save-pending'; ind.style.opacity = '1'; }
});

document.addEventListener('htmx:confirm', function(e) {
  var btn = e.detail.elt;
  if (btn.getAttribute('data-confirm') !== 'arm') return;
  if (btn.classList.contains('delete-armed')) return;
  e.preventDefault();
  var orig = btn.textContent;
  btn.textContent = 'Confirm';
  btn.classList.add('delete-armed');
  btn._disarmTimer = setTimeout(function() {
    btn.textContent = orig;
    btn.classList.remove('delete-armed');
  }, 4000);
});

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.delete-armed');
  if (!btn) return;
  if (btn._disarmTimer) clearTimeout(btn._disarmTimer);
});
        </script>`}
        {html`<style>
          *, *::before, *::after { box-sizing: border-box; }

          html {
            font-size: 10px !important;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }

          body {
            font-size: var(--text-base);
            line-height: var(--lh-normal);
            background: var(--bg);
            color: var(--text);
            overscroll-behavior: none;
            -webkit-font-smoothing: antialiased;
          }

          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-sans) !important;
            font-weight: var(--font-weight-bold) !important;
            line-height: var(--lh-tight) !important;
            margin: 0;
            color: var(--text) !important;
          }
          h1 { font-size: var(--text-lg) !important; }
          h2 { font-size: var(--text-md) !important; }
          h3 { font-size: var(--text-sm) !important; }
          h4 { font-size: var(--text-xs) !important; font-weight: var(--font-weight-medium) !important; }
          h5, h6 { font-size: var(--text-xxs) !important; font-weight: var(--font-weight-medium) !important; text-transform: uppercase; letter-spacing: 0.06em; }

          p {
            font-size: var(--text-base);
            line-height: var(--lh-normal);
            color: var(--text) !important;
            margin: 0;
          }

          @layer base {
            input, select, textarea { font-size: var(--text-sm); line-height: var(--lh-normal); }
            button { font-size: var(--text-xs); line-height: var(--lh-tight); }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }

          label, .uk-form-label {
            font-size: var(--text-xxs) !important;
            font-weight: var(--font-weight-medium) !important;
            line-height: var(--lh-normal) !important;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          button, .uk-btn {
            font-weight: var(--font-weight-bold) !important;
            letter-spacing: 0.01em;
          }
          .uk-btn-primary, .uk-btn-default, .uk-btn-secondary {
            font-size: var(--text-xs) !important;
            font-weight: var(--font-weight-bold) !important;
            line-height: var(--lh-tight) !important;
          }
          .mobile-menu-btn {
            font-size: 0 !important;
            line-height: 0 !important;
          }
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          .main-content { -webkit-overflow-scrolling: touch; }
          body { padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }

          .admin-layout { min-height: 100vh; min-height: 100dvh; }

          .desktop-sidebar { display: none; }

          .main-content { flex: 1; padding: 0; min-height: 100vh; min-height: 100dvh; }

          .page-header {
            background: var(--bg-card);
            padding: calc(16px + var(--safe-top)) 32px 16px calc(52px + var(--safe-left));
            border-bottom: 1px solid var(--border);
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 8px 16px;
            position: -webkit-sticky;
            position: sticky;
            top: 0;
            z-index: 50;
          }
          .page-header h2 { font-size: var(--text-sm) !important; line-height: var(--lh-tight) !important; color: var(--text); font-weight: var(--font-weight-bold); letter-spacing: -0.01em; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .page-header-info { grid-column: 1; min-width: 0; }
          .page-header-actions { grid-column: 2; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
          .page-header-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; font-size: var(--text-xs); color: var(--text-secondary); }
          .page-header-meta > span:not(:first-child)::before { content: '·'; margin-right: 6px; opacity: 0.5; }
          .page-header-meta > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
          .page-header--rich { grid-template-rows: auto auto; }
          .page-header--rich .page-header-info { grid-row: 1 / -1; }
          .page-header--rich .page-header-actions { grid-row: 1 / -1; align-self: center; }

          .status-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 16px; height: 16px; }
          .status-icon svg { display: block; width: 14px; height: 14px; }
          .status-icon--neutral { color: var(--text-secondary); }
          .status-icon--primary { color: var(--badge-primary); }
          .status-icon--secondary { color: var(--badge-secondary); }
          .status-icon--destructive { color: var(--badge-destructive); }

          .status-select {
            -webkit-appearance: none;
            appearance: none;
            padding: 2px 22px 2px 10px;
            border-radius: 999px;
            font-size: var(--text-xs);
            font-weight: var(--font-weight-medium);
            letter-spacing: 0.02em;
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 7px center;
            border: 1px solid var(--badge-neutral-border);
            background-color: var(--badge-neutral-bg);
            color: var(--badge-neutral-text);
            transition: border-color 0.15s, background-color 0.15s;
          }
          .status-select:focus { outline: 2px solid var(--brand); outline-offset: 1px; }
          .status-select[data-current="complete"],
          .status-select[data-current="paid"] { border-color: var(--badge-primary-border); background-color: var(--badge-primary-bg); color: var(--badge-primary); }
          .status-select[data-current="in_progress"],
          .status-select[data-current="enroute"],
          .status-select[data-current="pending"] { border-color: var(--badge-secondary-border); background-color: var(--badge-secondary-bg); color: var(--badge-secondary); }
          .status-select[data-current="cancelled"],
          .status-select[data-current="void"] { border-color: var(--badge-destructive-border); background-color: var(--badge-destructive-bg); color: var(--badge-destructive); }

          .danger-card { border-color: var(--destructive-border, var(--border)) !important; }
          .danger-card h3 { color: var(--text-secondary) !important; font-size: var(--text-xs) !important; font-weight: var(--font-weight-medium) !important; }

          .wizard-progress { display: flex; align-items: center; gap: 4px; }
          .wizard-progress-step { width: 28px; height: 4px; border-radius: 2px; background: var(--border); }
          .wizard-progress-step.is-done { background: var(--badge-primary); }
          .wizard-progress-step.is-active { background: var(--brand); }

          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar { display: flex; flex-direction: column; width: 260px; min-width: 260px; background: var(--bg-sidebar); min-height: 100vh; min-height: 100dvh; position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; padding: 24px 0; }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding: calc(20px + var(--safe-top)) 32px 20px 32px; }
          }

          table { width: 100%; border-collapse: collapse; }

          .search-box { position: relative; }
          .search-box input { padding-left: 36px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
          .search-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
          /* Customer create/edit forms don't wrap the input in .search-box, so absolute positioning can land off-screen.
             For those inline address result containers, render results as a normal block list. */
          #address-results .search-results { position: static; border-top: 1px solid var(--border); border-radius: 8px; box-shadow: 0 8px 18px rgba(0,0,0,0.12); }
          .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: var(--text-sm); color: var(--text); }
          .search-item:hover { background: rgba(127,127,127,0.08); }
          .search-item .name { font-weight: var(--font-weight-medium); }
          .search-item .meta { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); color: #1e1e2e; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-medium); font-size: var(--text-sm); flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: var(--text-xs); }

          .save-indicator { font-size: var(--text-xs); font-weight: var(--font-weight-regular); transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: #16a34a; }
          .save-err { color: #dc2626; }
          .save-pending { color: var(--text-secondary); }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: var(--destructive); background: var(--bg-card); border: 1px solid var(--destructive-border); padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: var(--text-xxs) !important; font-weight: var(--font-weight-medium); transition: all 0.15s; }
          .uk-btn-sm { font-size: var(--text-xxs) !important; }
          .delete-btn:hover { background: var(--destructive-soft); border-color: var(--destructive-hover); color: var(--destructive-hover); }
          .delete-btn.delete-armed { background: var(--destructive); color: #fff; border-color: var(--destructive); font-weight: var(--font-weight-medium); }
          .delete-btn.delete-armed:hover { background: var(--destructive-hover); border-color: var(--destructive-hover); }

          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--text);
            cursor: pointer;
            position: fixed;
            top: var(--safe-top);
            left: var(--safe-left);
            height: 48px;
            width: 48px;
            z-index: 100;
          }

          .sidebar-nav { padding: 0 4px; }
          .sidebar-nav .uk-nav-header { color: var(--text-sidebar); font-size: var(--text-xxs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: var(--font-weight-medium); padding: 16px 12px 6px; margin: 0; }
          .sidebar-nav .uk-nav-header:first-child { padding-top: 4px; }
          .sidebar-nav .uk-nav-divider { border-color: var(--sidebar-divider); margin: 8px 12px; }
          .sidebar-nav > li > a { color: var(--text-sidebar); padding: 8px 12px; border-radius: 6px; font-size: var(--text-sm); font-weight: var(--font-weight-regular); transition: all 0.15s; display: block; text-decoration: none; }
          .sidebar-nav > li > a:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .sidebar-nav > li.uk-active > a { color: var(--text-sidebar-active); background: var(--sidebar-active-bg); font-weight: var(--font-weight-medium); }

          .admin-theme-toggle {
            width: 100%;
            border: 0;
            background: transparent;
            color: var(--text-sidebar);
            padding: 8px 12px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: var(--text-sm);
            cursor: pointer;
            text-align: left;
          }
          .admin-theme-toggle:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .admin-theme-toggle .theme-toggle-icon,
          .sidebar-theme-btn .theme-toggle-icon {
            position: relative;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }
          .admin-theme-toggle .moon-or-sun,
          .sidebar-theme-btn .moon-or-sun {
            position: relative;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid currentColor;
            background: currentColor;
            transform: scale(1);
            transition: all 0.45s ease;
            overflow: hidden;
            opacity: 0.85;
          }
          .admin-theme-toggle .moon-or-sun::before,
          .sidebar-theme-btn .moon-or-sun::before {
            content: "";
            position: absolute;
            right: -9px;
            top: -9px;
            height: 24px;
            width: 24px;
            border: 2px solid currentColor;
            border-radius: 50%;
            transform: translate(0, 0);
            opacity: 1;
            transition: transform 0.45s ease;
          }
          .admin-theme-toggle .moon-or-sun::after,
          .sidebar-theme-btn .moon-or-sun::after {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin: -4px 0 0 -4px;
            position: absolute;
            top: 50%;
            left: 50%;
            box-shadow: 0 -23px 0 currentColor, 0 23px 0 currentColor, 23px 0 0 currentColor, -23px 0 0 currentColor, 15px 15px 0 currentColor, -15px 15px 0 currentColor, 15px -15px 0 currentColor, -15px -15px 0 currentColor;
            transform: scale(0);
            transition: all 0.35s ease;
          }
          .admin-theme-toggle .moon-mask,
          .sidebar-theme-btn .moon-mask {
            position: absolute;
            right: -9px;
            top: -8px;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            border: 0;
            background: var(--bg-sidebar);
            transform: translate(0, 0);
            opacity: 1;
            transition: background 0.25s ease, transform 0.45s ease;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun,
          [data-theme="dark"] .sidebar-theme-btn .moon-or-sun {
            transform: scale(0.55);
            overflow: visible;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::before,
          [data-theme="dark"] .sidebar-theme-btn .moon-or-sun::before {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::after,
          [data-theme="dark"] .sidebar-theme-btn .moon-or-sun::after {
            transform: scale(1);
          }
          [data-theme="dark"] .admin-theme-toggle .moon-mask,
          [data-theme="dark"] .sidebar-theme-btn .moon-mask {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          .theme-label { line-height: 1; }
          
          .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 20px; margin-bottom: 24px; }
          .sidebar-logo img { width: 36px; height: 36px; }
          .sidebar-logo span { font-size: var(--text-sm); color: var(--text-sidebar-active); letter-spacing: -0.01em; font-weight: var(--font-weight-medium); flex: 1; }
           .sidebar-theme-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: transparent; color: var(--text-sidebar-active); cursor: pointer; border-radius: 5px; padding: 0; flex-shrink: 0; transition: background .15s, color .15s; opacity: 0.7; }
           .sidebar-theme-btn:hover { background: var(--sidebar-hover-bg); opacity: 1; }
           .sidebar-theme-btn .theme-toggle-icon { transform: scale(0.833); transform-origin: center; }

          /* iOS PWA: give offcanvas enough top room under translucent status bar. */
          #offcanvas-nav .uk-offcanvas-bar {
            padding-top: calc(16px + var(--safe-top));
          }

          @media (max-width: 768px) {
            .page-header { padding: calc(12px + var(--safe-top)) 16px 12px calc(52px + var(--safe-left)); }
            .page-header h2 { font-size: var(--text-sm); }
            .page-header--rich { grid-template-columns: 1fr; }
            .page-header--rich .page-header-actions { grid-column: 1; grid-row: auto; justify-self: start; }
            .page-header-meta > span { max-width: 140px; }
            .page-body { padding: 16px; }
          }

          #sms-thread-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 1200;
            display: none;
            align-items: stretch;
            justify-content: stretch;
            padding: 0;
          }
          #sms-thread-modal-overlay[data-open="true"] { display: flex; }
          #sms-thread-modal-panel {
            width: 100%;
            height: 100%;
            background: var(--bg);
            color: var(--text);
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: calc(12px + var(--safe-top)) calc(12px + var(--safe-right)) 12px calc(12px + var(--safe-left));
            border-bottom: 1px solid var(--border);
            background: var(--bg-card);
          }
          #sms-thread-modal-header h3 { margin: 0; font-size: var(--text-sm) !important; font-weight: var(--font-weight-bold) !important; letter-spacing: -0.01em; line-height: var(--lh-tight) !important; }
          #sms-thread-modal-actions { display: inline-flex; align-items: center; gap: 8px; }
          #sms-thread-modal-open-inbox { text-decoration: none; }
          #sms-thread-modal-content {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            padding: 0;
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-status {
            display: block;
            padding: 12px calc(12px + var(--safe-right)) 0 calc(12px + var(--safe-left));
          }
          #sms-thread-modal-loading {
            display: none;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: rgba(0,0,0,0.02);
            margin-bottom: 12px;
          }
          #sms-thread-modal-loading.htmx-request { display: block; }
          #sms-thread-modal-loading .skel { display: flex; flex-direction: column; gap: 10px; }
          #sms-thread-modal-loading .skel-row { display: flex; align-items: center; gap: 10px; }
          #sms-thread-modal-loading .skel-dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: rgba(0,0,0,0.08);
            flex: 0 0 auto;
          }
          #sms-thread-modal-loading .skel-line {
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.10), rgba(0,0,0,0.06));
            background-size: 240% 100%;
            animation: smsSkel 1.15s ease-in-out infinite;
          }
          #sms-thread-modal-loading .skel-line.w-30 { width: 30%; }
          #sms-thread-modal-loading .skel-line.w-45 { width: 45%; }
          #sms-thread-modal-loading .skel-line.w-70 { width: 70%; }
          #sms-thread-modal-loading .skel-line.w-85 { width: 85%; }
          @keyframes smsSkel {
            0% { background-position: 100% 0; }
            100% { background-position: 0 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            #sms-thread-modal-loading .skel-line { animation: none; background: rgba(0,0,0,0.08); }
          }
          #sms-thread-modal-error {
            display: none;
            padding: 12px;
            border: 1px solid rgba(239,68,68,0.35);
             border-radius: 12px;
             background: rgba(239,68,68,0.08);
             color: #b91c1c;
             font-size: var(--text-xs);
             margin-bottom: 12px;
          }
          #sms-thread-modal-error[data-open="true"] { display: block; }
          #sms-thread-modal-body {
            flex: 1;
            min-height: 0;
            padding: 0;
          }
          #sms-thread-modal-body #sms-thread-panel {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: transparent !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #sms-thread-modal-body #sms-thread-panel.uk-card,
          #sms-thread-modal-body #sms-thread-panel.uk-card-body {
            box-shadow: none !important;
            border: 0 !important;
            background: transparent !important;
          }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-modal-open] { display: none !important; }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-header] { display: none; }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-body] {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-body #sms-thread-panel [data-sms-thread-body] {
            padding: 0 calc(12px + var(--safe-right)) 0 calc(12px + var(--safe-left));
          }
          #sms-thread-modal-body #sms-history-scroll {
            max-height: none !important;
            flex: 1;
            min-height: 0;
            overflow-y: auto !important;
            padding: 10px 0 12px 0 !important;
          }
          #sms-thread-modal-body #sms-thread-panel form {
            margin-left: calc(-1 * (12px + var(--safe-left)));
            margin-right: calc(-1 * (12px + var(--safe-right)));
            padding: 12px calc(12px + var(--safe-right)) calc(16px + var(--safe-bottom)) calc(12px + var(--safe-left));
            border-top: 1px solid var(--border);
            background: var(--bg);
          }
          #sms-thread-modal-body #sms-thread-panel form textarea {
            margin-bottom: 2px;
          }
          #sms-thread-modal-body #sms-thread-panel form [data-sms-counter] {
            padding-bottom: 6px;
          }

          @media (min-width: 768px) {
            #sms-thread-modal-header h3 { font-size: var(--text-sm) !important; }
            #sms-thread-modal-overlay {
              padding: 24px;
              align-items: center;
              justify-content: center;
            }
            #sms-thread-modal-panel {
              max-width: 760px;
              height: min(90vh, 860px);
              border-radius: 16px;
              border: 1px solid var(--border);
              box-shadow: 0 18px 48px rgba(0,0,0,0.22);
              overflow: hidden;
            }
          }
        </style>`}
      </head>
      <body>
        <div id="offcanvas-nav" data-uk-offcanvas="mode: slide; overlay: true">
          <div class="uk-offcanvas-bar" style="background: var(--bg-sidebar); width: 260px;">
            <button class="uk-offcanvas-close" type="button" data-uk-close style="color: var(--text-sidebar-active);"></button>
             <div class="sidebar-logo" style="padding: 0 16px;">
               <img src="/images/uncle-logo.svg" alt="" />
               <span>Uncle Bike</span>
               <button type="button" class="sidebar-theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">
                 <div class="theme-toggle-icon">
                   <div class="moon-or-sun">
                     <div class="moon-mask"></div>
                   </div>
                 </div>
               </button>
             </div>
            <ul class="uk-nav uk-nav-default sidebar-nav" data-uk-nav>
              <li class="uk-nav-header">Overview</li>
              <li><a href="/admin" hx-get="/admin" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Dashboard</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Operations</li>
              <li><a href="/admin/inbox" hx-get="/admin/inbox" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Inbox</a></li>
              <li><a href="/admin/jobs" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Jobs</a></li>
              <li><a href="/admin/customers" hx-get="/admin/customers" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Customers</a></li>
              <li><a href="/admin/recurring" hx-get="/admin/recurring" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Recurring</a></li>
              <li><a href="/admin/invoices" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Invoices</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Setup</li>
              <li><a href="/admin/territories" hx-get="/admin/territories" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Territories</a></li>
              <li><a href="/admin/categories" hx-get="/admin/categories" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Categories</a></li>
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Team</a></li>
              <li><a href="/admin/skills" hx-get="/admin/skills" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Skills</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/sms-settings" hx-get="/admin/sms-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">SMS</a></li>
              <li><a href="/admin/push-settings" hx-get="/admin/push-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Push</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Settings</a></li>
            </ul>
          </div>
        </div>
        <div class="admin-layout">
          <aside class="desktop-sidebar">
            <div class="sidebar-logo">
              <img src="/images/uncle-logo.svg" alt="" />
              <span>Uncle Bike</span>
              <button type="button" class="sidebar-theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">
                <div class="theme-toggle-icon">
                  <div class="moon-or-sun">
                    <div class="moon-mask"></div>
                  </div>
                </div>
              </button>
            </div>
            <ul class="uk-nav uk-nav-default sidebar-nav" data-uk-nav>
              <li class="uk-nav-header">Overview</li>
              <li><a href="/admin" hx-get="/admin" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Dashboard</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Operations</li>
              <li><a href="/admin/inbox" hx-get="/admin/inbox" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Inbox</a></li>
              <li><a href="/admin/jobs" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Jobs</a></li>
              <li><a href="/admin/customers" hx-get="/admin/customers" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Customers</a></li>
              <li><a href="/admin/recurring" hx-get="/admin/recurring" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Recurring</a></li>
              <li><a href="/admin/invoices" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Invoices</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Setup</li>
              <li><a href="/admin/territories" hx-get="/admin/territories" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Territories</a></li>
              <li><a href="/admin/categories" hx-get="/admin/categories" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Categories</a></li>
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Team</a></li>
              <li><a href="/admin/skills" hx-get="/admin/skills" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Skills</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/sms-settings" hx-get="/admin/sms-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">SMS</a></li>
              <li><a href="/admin/push-settings" hx-get="/admin/push-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Push</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Settings</a></li>
            </ul>
          </aside>
          <main class="main-content" id="main-content">
            <button type="button" class="mobile-menu-btn" data-uk-toggle="target: #offcanvas-nav" aria-label="Open menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><title>Menu</title><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div id="page-content">
              {children}
            </div>
          </main>
        </div>

        <div id="sms-thread-modal-overlay" hidden>
          <div id="sms-thread-modal-panel" role="dialog" aria-modal="true" aria-label="SMS conversation">
            <div id="sms-thread-modal-header">
              <h3>Conversation</h3>
              <div id="sms-thread-modal-actions">
                <a id="sms-thread-modal-open-inbox" class="uk-btn uk-btn-default uk-btn-sm" href="/admin/inbox" style="display:none;">Inbox</a>
                <button type="button" class="uk-btn uk-btn-default uk-btn-sm" data-sms-thread-modal-close aria-label="Close conversation">Close</button>
              </div>
            </div>
            <div id="sms-thread-modal-content">
              <div id="sms-thread-modal-status">
                <div id="sms-thread-modal-loading" aria-live="polite" aria-busy="true">
                  <div class="skel">
                    <div class="skel-row"><div class="skel-dot"></div><div class="skel-line w-70"></div></div>
                    <div class="skel-row"><div class="skel-dot"></div><div class="skel-line w-85"></div></div>
                    <div class="skel-row"><div class="skel-dot"></div><div class="skel-line w-45"></div></div>
                  </div>
                </div>
                <div id="sms-thread-modal-error" role="alert"></div>
              </div>
              <div id="sms-thread-modal-body"></div>
            </div>
          </div>
        </div>

        {html`<script>
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeLabels(next);
  if (typeof window.__syncThemeColorMeta === 'function') {
    window.__syncThemeColorMeta();
  }
}
function updateThemeLabels(t) {
  document.querySelectorAll('.theme-label').forEach(function(el) { el.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode'; });
}
updateThemeLabels(document.documentElement.getAttribute('data-theme') || 'light');
window.updateThemeLabels = updateThemeLabels;
requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})});
</script>`}
      </body>
    </html>
  );
};

