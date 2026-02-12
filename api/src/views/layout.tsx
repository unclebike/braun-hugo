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
        {html`<style data-fodt>body{opacity:0}body.ready{opacity:1;transition:opacity .1s}</style>`}
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
        {html`<script>
/* --- Named handlers for proper cleanup --- */
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
    function toLL(p) { return Array.isArray(p) ? p : [p.lat, p.lng]; }
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
      if (h) h.value = coords.length ? JSON.stringify(coords) : '';
      var c = document.getElementById('gf-count');
      if (c) c.textContent = coords.length + ' pts';
    }

    function enableEdit() {
      if (poly) poly.pm.enable({ allowSelfIntersection: false });
    }

    function loadExisting() {
      if (pts.length >= 3) {
        poly = L.polygon(pts.map(toLL), { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 }).addTo(map);
        map.fitBounds(poly.getBounds().pad(0.1));
        enableEdit();
        poly.on('pm:edit', syncToHidden);
        poly.on('pm:vertexremoved', syncToHidden);
        syncToHidden();
      }
    }
    loadExisting();

    map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false });
    map.pm.setGlobalOptions({ pathOptions: { color: '#0f3460', fillColor: '#0f3460', fillOpacity: 0.12 } });

    var drawBtn = document.getElementById('gf-draw-btn');
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
}

document.addEventListener('htmx:beforeCleanupElement', function(e) {
  var el = e.detail.elt;
  if (el.id === 'radius-map' && window._radiusMap) {
    /* Remove named input listeners to prevent leaks */
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
    var ids = { 'addr-line1': d.line1, 'addr-city': d.city, 'addr-state': d.state, 'addr-postal': d.postal, 'addr-lat': d.lat, 'addr-lng': d.lng };
    for (var id in ids) { var el = document.getElementById(id); if (el) el.value = ids[id]; }
    var ar = document.getElementById('address-results');
    if (ar) ar.innerHTML = '';
  }
});

document.addEventListener('htmx:afterSettle', function() { setTimeout(initMaps, 50); });
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

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
        </script>`}
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; overscroll-behavior: none; -webkit-font-smoothing: antialiased; }

          @layer base {
            input, select, textarea, button { font-size: 16px; }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }
          /* Custom arrow only for selects NOT styled by Franken UI */
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          /* Safari: disable tap delay + double-tap zoom on interactive elements */
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          /* Safari: smooth momentum scrolling */
          .main-content { -webkit-overflow-scrolling: touch; }
          /* Safari: safe area for notch/home indicator */
          body { padding-env: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }

          .admin-layout { min-height: 100vh; min-height: 100dvh; }

          .desktop-sidebar { display: none; }

          .main-content { flex: 1; padding: 0; min-height: 100vh; min-height: 100dvh; }
          .page-header { background: white; padding: 20px 32px 20px 52px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; position: -webkit-sticky; position: sticky; top: 0; z-index: 50; }
          .page-header h2 { font-size: 22px; color: #1a1a2e; font-weight: 600; letter-spacing: -0.3px; }
          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar { display: flex; flex-direction: column; width: 260px; min-width: 260px; background: #1a1a2e; min-height: 100vh; min-height: 100dvh; position: sticky; top: 0; height: 100vh; height: 100dvh; overflow-y: auto; padding: 24px 0; }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding-left: 32px; }
          }

          table { width: 100%; border-collapse: collapse; }

          .search-box { position: relative; }
          .search-box input { padding-left: 36px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 12px center; }
          .search-results { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
          .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
          .search-item:hover { background: #f5f7ff; }
          .search-item .name { font-weight: 500; }
          .search-item .meta { font-size: 12px; color: #888; margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #0f3460; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: 13px; }

          .save-indicator { font-size: 12px; font-weight: 500; transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: #16a34a; }
          .save-err { color: #dc2626; }
          .save-pending { color: #888; }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: #dc2626; background: none; border: 1px solid #fca5a5; padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
          .delete-btn:hover { background: #fef2f2; border-color: #dc2626; }

          .mobile-menu-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; color: #1a1a2e; padding: 8px; cursor: pointer; position: fixed; top: 12px; left: 12px; z-index: 100; }

          /* --- Sidebar nav dark theme --- */
          .sidebar-nav { padding: 0 4px; }
          .sidebar-nav .uk-nav-header { color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; padding: 16px 12px 6px; margin: 0; }
          .sidebar-nav .uk-nav-header:first-child { padding-top: 4px; }
          .sidebar-nav .uk-nav-divider { border-color: rgba(255,255,255,0.08); margin: 8px 12px; }
          .sidebar-nav > li > a { color: #8a8fa8; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 450; transition: all 0.15s; display: block; text-decoration: none; }
          .sidebar-nav > li > a:hover { color: #e0e0e0; background: rgba(255,255,255,0.06); }
          .sidebar-nav > li.uk-active > a { color: #fff; background: rgba(255,255,255,0.1); font-weight: 500; }

          @media (max-width: 768px) {
            .page-header { padding: 14px 16px 14px 52px; gap: 8px; flex-wrap: wrap; }
            .page-header h2 { font-size: 18px; }
            .page-body { padding: 16px; }
          }
        `}</style>
      </head>
      <body>
        <div id="offcanvas-nav" data-uk-offcanvas="mode: slide; overlay: true">
          <div class="uk-offcanvas-bar" style="background: #1a1a2e; width: 260px;">
            <button class="uk-offcanvas-close" type="button" data-uk-close style="color: white;"></button>
            <h1 style="font-size: 18px; margin-bottom: 24px; color: #eee; padding: 0 16px; letter-spacing: -0.3px;">Uncle Bike</h1>
            <ul class="uk-nav uk-nav-default sidebar-nav" data-uk-nav>
              <li class="uk-nav-header">Overview</li>
              <li><a href="/admin" hx-get="/admin" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Dashboard</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Operations</li>
              <li><a href="/admin/inbox" hx-get="/admin/inbox" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Inbox</a></li>
              <li><a href="/admin/jobs" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Jobs</a></li>
              <li><a href="/admin/customers" hx-get="/admin/customers" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Customers</a></li>
              <li><a href="/admin/recurring" hx-get="/admin/recurring" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Recurring</a></li>
              <li><a href="/admin/invoices" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Invoices</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Setup</li>
              <li><a href="/admin/territories" hx-get="/admin/territories" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Territories</a></li>
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Team</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Settings</a></li>
            </ul>
          </div>
        </div>
        <div class="admin-layout">
          <aside class="desktop-sidebar">
            <h1 style="font-size: 18px; margin-bottom: 24px; color: #eee; padding: 0 20px; letter-spacing: -0.3px;">Uncle Bike</h1>
            <ul class="uk-nav uk-nav-default sidebar-nav" data-uk-nav>
              <li class="uk-nav-header">Overview</li>
              <li><a href="/admin" hx-get="/admin" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Dashboard</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Operations</li>
              <li><a href="/admin/inbox" hx-get="/admin/inbox" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Inbox</a></li>
              <li><a href="/admin/jobs" hx-get="/admin/jobs" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Jobs</a></li>
              <li><a href="/admin/customers" hx-get="/admin/customers" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Customers</a></li>
              <li><a href="/admin/recurring" hx-get="/admin/recurring" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Recurring</a></li>
              <li><a href="/admin/invoices" hx-get="/admin/invoices" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Invoices</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Setup</li>
              <li><a href="/admin/territories" hx-get="/admin/territories" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Territories</a></li>
              <li><a href="/admin/services" hx-get="/admin/services" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Services</a></li>
              <li><a href="/admin/team" hx-get="/admin/team" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Team</a></li>
              <li class="uk-nav-divider"></li>
              <li class="uk-nav-header">Config</li>
              <li><a href="/admin/branding" hx-get="/admin/branding" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Branding</a></li>
              <li><a href="/admin/coupons" hx-get="/admin/coupons" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Coupons</a></li>
              <li><a href="/admin/webhooks" hx-get="/admin/webhooks" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Webhooks</a></li>
              <li><a href="/admin/settings" hx-get="/admin/settings" hx-target="#page-content" hx-select="#page-content" hx-push-url="true">Settings</a></li>
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
        {html`<script>requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})})</script>`}
      </body>
    </html>
  );
};
