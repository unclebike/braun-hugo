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

        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css" />
        <script src="https://cdn.jsdelivr.net/npm/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js"></script>
        <script src="/admin.js"></script>
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
