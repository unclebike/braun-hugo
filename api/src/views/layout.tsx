/** @jsx jsx */
/** @jsxFrag Fragment */
import { html } from 'hono/html';
// biome-ignore lint/correctness/noUnusedImports: jsx is used by JSX pragma transform
import { jsx, Fragment } from 'hono/jsx';

export const Layout = ({ title, children }: { title: string; children: unknown }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>{title} - Zenbooker Admin</title>
        {html`<script>
(function(){
  var s = localStorage.getItem('theme');
  var t = s || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
})();
</script>
<style data-fodt>
@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-200LilMondo.otf') format('opentype');
  font-weight: 200;
  font-display: block;
}

@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-500Dudette.otf') format('opentype');
  font-weight: 500;
  font-display: block;
}

@font-face {
  font-family: 'TideSans';
  src: url('/fonts/TideSans-800Kahuna.otf') format('opentype');
  font-weight: 800;
  font-display: block;
}

* {
  font-family: 'TideSans', system-ui, -apple-system, sans-serif !important;
  font-feature-settings: 'kern' 1;
}

:root {
  --brand: #dc8a78;
  --bg: #eff1f5;
  --bg-card: #ffffff;
  --bg-sidebar: #e6e9ef;
  --text: #4c4f69;
  --text-secondary: #6c6f85;
  --text-sidebar: #6c6f85;
  --text-sidebar-hover: #4c4f69;
  --text-sidebar-active: #1e66f5;
  --border: #ccd0da;
  --input-bg: #ffffff;
  --destructive: #e64553;
  --destructive-hover: #d20f39;
  --destructive-soft: #fdecee;
  --destructive-border: #ea999f;
  --sidebar-divider: rgba(76, 79, 105, 0.14);
  --sidebar-hover-bg: rgba(76, 79, 105, 0.08);
  --sidebar-active-bg: rgba(30, 102, 245, 0.12);
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
  --destructive: #eba0ac;
  --destructive-hover: #f38ba8;
  --destructive-soft: rgba(235, 160, 172, 0.14);
  --destructive-border: #6c7086;
  --sidebar-divider: rgba(255, 255, 255, 0.08);
  --sidebar-hover-bg: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(255, 255, 255, 0.1);
}

body { opacity: 0; }
body.ready { opacity: 1; transition: opacity .15s; }

[data-theme="dark"] .uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
[data-theme="dark"] .bg-white { background: var(--bg-card) !important; }
[data-theme="dark"] .border-b, [data-theme="dark"] .border-border { border-color: var(--border) !important; }
[data-theme="dark"] .text-muted-foreground { color: var(--text-secondary) !important; }
[data-theme="dark"] .uk-input, [data-theme="dark"] .uk-select, [data-theme="dark"] .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
[data-theme="dark"] .uk-table td { color: var(--text) !important; }
[data-theme="dark"] .uk-table-divider > :not(:first-child) > tr, [data-theme="dark"] .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
.uk-label { font-weight: 500 !important; }
[data-theme="dark"] .uk-label { background: #585b70 !important; color: var(--text) !important; }
[data-theme="dark"] .uk-label-primary { background: var(--brand) !important; color: #1e1e2e !important; }
[data-theme="dark"] .uk-label-destructive { background: #f38ba8 !important; color: #1e1e2e !important; }
[data-theme="dark"] .uk-label-secondary { background: #a6e3a1 !important; color: #1e1e2e !important; }
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
        <style>{`.leaflet-container img { max-width: none !important; max-height: none !important; }`}</style>
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

function initMapsWhenReady() {
  if (document.body.classList.contains('ready')) {
    initMaps();
  } else {
    requestAnimationFrame(initMapsWhenReady);
  }
}

document.addEventListener('htmx:afterSettle', initMapsWhenReady);
document.addEventListener('DOMContentLoaded', initMapsWhenReady);

function scrollSmsThreadToBottom() {
  var scroller = document.getElementById('sms-history-scroll');
  if (!scroller) return;
  scroller.scrollTop = scroller.scrollHeight;
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

function recalcInvoiceTotal() {
  var lineItems = document.getElementById('line_items_text');
  var tax = document.getElementById('tax_amount');
  var discount = document.getElementById('discount_amount');
  var total = document.getElementById('total_amount');
  if (!lineItems || !total) return;

  var subtotal = 0;
  var lines = String(lineItems.value || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var parts = line.split('|').map(function (part) { return part.trim(); });
    if (parts.length < 3) continue;
    var qty = parseFloat(parts[1] || '0');
    var unit = parseFloat((parts[2] || '0').replace(/[$,]/g, ''));
    if (!isFinite(qty) || qty <= 0 || !isFinite(unit) || unit < 0) continue;
    subtotal += qty * unit;
  }

  var taxValue = tax ? parseFloat(String(tax.value || '0').replace(/[$,]/g, '')) : 0;
  var discountValue = discount ? parseFloat(String(discount.value || '0').replace(/[$,]/g, '')) : 0;
  if (!isFinite(taxValue)) taxValue = 0;
  if (!isFinite(discountValue)) discountValue = 0;

  var next = Math.max(0, subtotal + taxValue - discountValue);
  total.value = next.toFixed(2);
}

document.addEventListener('input', function (e) {
  var target = e.target;
  if (!target || !target.id) return;
  if (target.id === 'line_items_text' || target.id === 'tax_amount' || target.id === 'discount_amount') {
    recalcInvoiceTotal();
  }
});

document.addEventListener('htmx:afterSettle', function () {
  recalcInvoiceTotal();
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

window.openSmsTaskModal = function(config) {
  var existing = document.getElementById('sms-task-modal-overlay');
  if (existing) existing.remove();
  var openedAt = Date.now();

  var overlay = document.createElement('div');
  overlay.id = 'sms-task-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1100;display:flex;align-items:flex-end;justify-content:center;padding:16px;';

  var panel = document.createElement('div');
  panel.id = 'sms-task-modal-panel';
  panel.style.cssText = 'width:100%;max-width:520px;background:var(--bg-card,#fff);border:1px solid var(--border,#ccd0da);border-radius:14px;padding:14px;box-shadow:0 18px 48px rgba(0,0,0,0.22);overflow:auto;';

  var title = document.createElement('div');
  title.textContent = 'Add Task';
  title.style.cssText = 'font-weight:600;font-size:16px;color:var(--text,#1f2937);margin-bottom:10px;';

  var labelTask = document.createElement('label');
  labelTask.textContent = 'Task title';
  labelTask.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var taskInput = document.createElement('input');
  taskInput.type = 'text';
  taskInput.maxLength = 72;
  taskInput.value = (config && config.suggestedTitle ? config.suggestedTitle : '') || '';
  taskInput.placeholder = 'One-line task title';
  taskInput.className = 'uk-input';
  taskInput.style.cssText = 'width:100%;margin-bottom:10px;';

  var labelJob = document.createElement('label');
  labelJob.textContent = 'Task target';
  labelJob.style.cssText = 'display:block;font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--text-secondary,#6b7280);margin-bottom:6px;';

  var jobSelect = document.createElement('select');
  jobSelect.className = 'uk-select';
  jobSelect.style.cssText = 'width:100%;margin-bottom:12px;';

  var options = (config && Array.isArray(config.jobOptions)) ? config.jobOptions : [];
  var selectedId = config && config.selectedJobId ? config.selectedJobId : '';
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].id;
    opt.textContent = options[i].label || options[i].id;
    if (options[i].id === selectedId) opt.selected = true;
    jobSelect.appendChild(opt);
  }

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'uk-btn uk-btn-default uk-btn-sm';
  cancelBtn.textContent = 'Cancel';

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'uk-btn uk-btn-primary uk-btn-sm';
  saveBtn.textContent = 'Add task';

  function applyViewportBounds() {
    var vv = window.visualViewport;
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportTop = vv ? vv.offsetTop : 0;
    var keyboardBottomInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;

    overlay.style.top = viewportTop + 'px';
    overlay.style.bottom = keyboardBottomInset + 'px';
    panel.style.maxHeight = Math.max(220, Math.floor(viewportHeight - 24)) + 'px';
  }

  function onViewportChange() {
    applyViewportBounds();
  }

  function closeModal() {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportChange);
      window.visualViewport.removeEventListener('scroll', onViewportChange);
    }
    window.removeEventListener('orientationchange', onViewportChange);
    overlay.remove();
  }

  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (Date.now() - openedAt < 450) return;
    if (e.target === overlay) closeModal();
  });

  saveBtn.addEventListener('click', function() {
    var t = (taskInput.value || '').replace(/\s+/g, ' ').trim();
    if (!t) {
      taskInput.focus();
      return;
    }
    var j = jobSelect.value || '';
    if (!j) return;
    if (config && typeof config.onSubmit === 'function') {
      config.onSubmit({ taskTitle: t, jobId: j });
    }
    closeModal();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  panel.appendChild(title);
  panel.appendChild(labelTask);
  panel.appendChild(taskInput);
  panel.appendChild(labelJob);
  panel.appendChild(jobSelect);
  panel.appendChild(actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  applyViewportBounds();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
  }
  window.addEventListener('orientationchange', onViewportChange);
  try {
    taskInput.focus({ preventScroll: true });
  } catch {
    taskInput.focus();
  }
  taskInput.select();
};

window.handleSmsTaskBubble = function(btn, triggerEvent) {
  if (!btn || !btn.dataset) return false;

  if (triggerEvent && typeof triggerEvent.type === 'string') {
    var now = Date.now();
    var lastTouch = parseInt(btn.dataset.smsLastTouchAt || '0', 10);
    if (triggerEvent.type === 'touchend') {
      btn.dataset.smsLastTouchAt = String(now);
    } else if (triggerEvent.type === 'click' && lastTouch > 0 && now - lastTouch < 700) {
      return false;
    }
  }

  var optionsRaw = btn.dataset.jobOptions || '[]';
  var jobOptions = [];
  try {
    jobOptions = JSON.parse(optionsRaw);
  } catch {
    jobOptions = [];
  }

  if (!Array.isArray(jobOptions) || jobOptions.length === 0) {
    return false;
  }

  if (typeof htmx === 'undefined' || !btn.dataset.smsTaskUrl) {
    return false;
  }

  window.openSmsTaskModal({
    jobOptions: jobOptions,
    selectedJobId: btn.dataset.selectedJobId || '',
    suggestedTitle: (btn.dataset.taskSuggestedTitle || '').trim(),
    onSubmit: function(values) {
      htmx.ajax('POST', btn.dataset.smsTaskUrl, {
        target: '#sms-thread-panel',
        swap: 'outerHTML',
        values: {
          sms_log_id: btn.dataset.smsLogId || '',
          job_id: values.jobId,
          task_title: values.taskTitle,
        },
      });
    },
  });

  return false;
};

window.prepareSmsTaskFromBubble = window.handleSmsTaskBubble;

function handleSmsTaskBubbleEvent(e) {
  var btn = e.target.closest('[data-sms-task-url]');
  if (!btn) return;
  e.preventDefault();
  if (typeof e.stopPropagation === 'function') e.stopPropagation();
  if (window.handleSmsTaskBubble) {
    window.handleSmsTaskBubble(btn, e);
  }
}

document.addEventListener('touchend', handleSmsTaskBubbleEvent, { passive: false });
document.addEventListener('click', handleSmsTaskBubbleEvent);

document.addEventListener('htmx:afterSwap', function(e) {
  var target = e.detail && e.detail.target ? e.detail.target : null;
  if (!target) return;
  var requestConfig = e.detail && e.detail.requestConfig ? e.detail.requestConfig : null;
  var requestPath = requestConfig && typeof requestConfig.path === 'string' ? requestConfig.path : '';
  var requestElt = requestConfig && requestConfig.elt ? requestConfig.elt : null;
  if (target.id === 'sms-history') {
    requestAnimationFrame(scrollSmsThreadToBottom);
    return;
  }
  if (target.id === 'sms-thread-panel') {
    requestAnimationFrame(scrollSmsThreadToBottom);
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
    requestAnimationFrame(function() {
      requestAnimationFrame(scrollSmsThreadToBottom);
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  requestAnimationFrame(function() {
    requestAnimationFrame(scrollSmsThreadToBottom);
  });
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
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          body { background: var(--bg); color: var(--text); overscroll-behavior: none; -webkit-font-smoothing: antialiased; }

          @layer base {
            input, select, textarea, button { font-size: 16px; }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          .main-content { -webkit-overflow-scrolling: touch; }
          body { padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }

          .admin-layout { min-height: 100vh; min-height: 100dvh; }

          .desktop-sidebar { display: none; }

          .main-content { flex: 1; padding: 0; min-height: 100vh; min-height: 100dvh; }
          .page-header { background: var(--bg-card); padding: 20px 32px 20px 52px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: -webkit-sticky; position: sticky; top: 0; z-index: 50; }
          .page-header h2 { font-size: 22px; color: var(--text); font-weight: 600; letter-spacing: -0.3px; }
          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar { display: flex; flex-direction: column; width: 260px; min-width: 260px; background: var(--bg-sidebar); min-height: 100vh; min-height: 100dvh; position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; padding: 24px 0; }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding-left: 32px; }
          }

          table { width: 100%; border-collapse: collapse; }

          .search-box { position: relative; }
          .search-box input { padding-left: 36px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
          .search-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
          /* Customer create/edit forms don't wrap the input in .search-box, so absolute positioning can land off-screen.
             For those inline address result containers, render results as a normal block list. */
          #address-results .search-results { position: static; border-top: 1px solid var(--border); border-radius: 8px; box-shadow: 0 8px 18px rgba(0,0,0,0.12); }
          .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); }
          .search-item:hover { background: rgba(127,127,127,0.08); }
          .search-item .name { font-weight: 500; }
          .search-item .meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); color: #1e1e2e; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: 13px; }

          .save-indicator { font-size: 12px; font-weight: 500; transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: #16a34a; }
          .save-err { color: #dc2626; }
          .save-pending { color: var(--text-secondary); }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: var(--destructive); background: var(--bg-card); border: 1px solid var(--destructive-border); padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
          .delete-btn:hover { background: var(--destructive-soft); border-color: var(--destructive-hover); color: var(--destructive-hover); }
          .delete-btn.delete-armed { background: var(--destructive); color: #fff; border-color: var(--destructive); font-weight: 600; }
          .delete-btn.delete-armed:hover { background: var(--destructive-hover); border-color: var(--destructive-hover); }

          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--text); padding: 8px; cursor: pointer; position: fixed; top: 12px; left: 12px; z-index: 100; }

          .sidebar-nav { padding: 0 4px; }
          .sidebar-nav .uk-nav-header { color: var(--text-sidebar); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; padding: 16px 12px 6px; margin: 0; }
          .sidebar-nav .uk-nav-header:first-child { padding-top: 4px; }
          .sidebar-nav .uk-nav-divider { border-color: var(--sidebar-divider); margin: 8px 12px; }
          .sidebar-nav > li > a { color: var(--text-sidebar); padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 450; transition: all 0.15s; display: block; text-decoration: none; }
          .sidebar-nav > li > a:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .sidebar-nav > li.uk-active > a { color: var(--text-sidebar-active); background: var(--sidebar-active-bg); font-weight: 500; }

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
            font-size: 14px;
            cursor: pointer;
            text-align: left;
          }
          .admin-theme-toggle:hover { color: var(--text-sidebar-hover); background: var(--sidebar-hover-bg); }
          .admin-theme-toggle .theme-toggle-icon {
            position: relative;
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }
          .admin-theme-toggle .moon-or-sun {
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
          .admin-theme-toggle .moon-or-sun::before {
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
          .admin-theme-toggle .moon-or-sun::after {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin: -4px 0 0 -4px;
            position: absolute;
            top: 50%;
            left: 50%;
            box-shadow: 0 -23px 0 currentColor,
              0 23px 0 currentColor,
              23px 0 0 currentColor,
              -23px 0 0 currentColor,
              15px 15px 0 currentColor,
              -15px 15px 0 currentColor,
              15px -15px 0 currentColor,
              -15px -15px 0 currentColor;
            transform: scale(0);
            transition: all 0.35s ease;
          }
          .admin-theme-toggle .moon-mask {
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
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun {
            transform: scale(0.55);
            overflow: visible;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::before {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          [data-theme="dark"] .admin-theme-toggle .moon-or-sun::after {
            transform: scale(1);
          }
          [data-theme="dark"] .admin-theme-toggle .moon-mask {
            transform: translate(14px, -14px);
            opacity: 0;
          }
          .theme-label { line-height: 1; }

          .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 20px; margin-bottom: 24px; }
          .sidebar-logo img { width: 36px; height: 36px; }
          .sidebar-logo span { font-size: 18px; color: var(--text-sidebar-active); letter-spacing: -0.3px; font-weight: 600; }

          @media (max-width: 768px) {
            .page-header { padding: 14px 16px 14px 52px; gap: 8px; flex-wrap: wrap; }
            .page-header h2 { font-size: 18px; }
            .page-body { padding: 16px; }
          }
        `}</style>
      </head>
      <body>
        <div id="offcanvas-nav" data-uk-offcanvas="mode: slide; overlay: true">
          <div class="uk-offcanvas-bar" style="background: var(--bg-sidebar); width: 260px;">
            <button class="uk-offcanvas-close" type="button" data-uk-close style="color: var(--text-sidebar-active);"></button>
            <div class="sidebar-logo" style="padding: 0 16px;">
              <img src="/images/uncle-logo.svg" alt="" />
              <span>Uncle Bike</span>
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
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Team</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/sms-settings" hx-get="/admin/sms-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">SMS</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Settings</a></li>
              <li class="uk-nav-divider"></li>
              <li>
                <button type="button" class="admin-theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
                  <div class="theme-toggle-icon">
                    <div class="moon-or-sun">
                      <div class="moon-mask"></div>
                    </div>
                  </div>
                  <span class="theme-label"></span>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="admin-layout">
          <aside class="desktop-sidebar">
            <div class="sidebar-logo">
              <img src="/images/uncle-logo.svg" alt="" />
              <span>Uncle Bike</span>
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
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Team</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/sms-settings" hx-get="/admin/sms-settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">SMS</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-swap="outerHTML" hx-push-url="true">Settings</a></li>
              <li class="uk-nav-divider"></li>
              <li>
                <button type="button" class="admin-theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
                  <div class="theme-toggle-icon">
                    <div class="moon-or-sun">
                      <div class="moon-mask"></div>
                    </div>
                  </div>
                  <span class="theme-label"></span>
                </button>
              </li>
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
        {html`<script>
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeLabels(next);
}
function updateThemeLabels(t) {
  document.querySelectorAll('.theme-label').forEach(function(el) { el.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode'; });
}
updateThemeLabels(document.documentElement.getAttribute('data-theme') || 'light');
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  if (!localStorage.getItem('theme')) {
    var t = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    updateThemeLabels(t);
  }
});
requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})});
</script>`}
      </body>
    </html>
  );
};
