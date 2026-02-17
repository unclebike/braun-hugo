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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="theme-color" content="#1e66f5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Uncle Bike Admin" />
        <meta name="application-name" content="Uncle Bike Admin" />
        <link rel="manifest" href="/admin.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/admin-apple-touch-icon-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/admin-icon-192.png" />
        <title>{title} - Zenbooker Admin</title>
        {html`<script>
(function(){
  var root = document.documentElement;
  var vv = window.visualViewport;

  function setKeyboardAwareViewportVars(){
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportOffsetTop = vv ? vv.offsetTop : 0;
    var keyboardInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
    root.style.setProperty('--vvh', viewportHeight + 'px');
    root.style.setProperty('--vv-top', viewportOffsetTop + 'px');
    root.style.setProperty('--vk-bottom', keyboardInset + 'px');
  }

  setKeyboardAwareViewportVars();
  window.addEventListener('resize', setKeyboardAwareViewportVars, { passive: true });
  window.addEventListener('orientationchange', setKeyboardAwareViewportVars);
  window.addEventListener('pageshow', setKeyboardAwareViewportVars);
  if (vv) {
    vv.addEventListener('resize', setKeyboardAwareViewportVars);
    vv.addEventListener('scroll', setKeyboardAwareViewportVars);
  }
})();
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
  /* Catppuccin Latte */
  --ctp-rosewater: #dc8a78;
  --ctp-flamingo: #dd7878;
  --ctp-pink: #ea76cb;
  --ctp-mauve: #8839ef;
  --ctp-red: #d20f39;
  --ctp-maroon: #e64553;
  --ctp-peach: #fe640b;
  --ctp-yellow: #df8e1d;
  --ctp-green: #40a02b;
  --ctp-teal: #179299;
  --ctp-sky: #04a5e5;
  --ctp-sapphire: #209fb5;
  --ctp-blue: #1e66f5;
  --ctp-lavender: #7287fd;
  --ctp-text: #4c4f69;
  --ctp-subtext1: #5c5f77;
  --ctp-subtext0: #6c6f85;
  --ctp-overlay2: #7c7f93;
  --ctp-overlay1: #8c8fa1;
  --ctp-overlay0: #9ca0b0;
  --ctp-surface2: #acb0be;
  --ctp-surface1: #bcc0cc;
  --ctp-surface0: #ccd0da;
  --ctp-base: #eff1f5;
  --ctp-mantle: #e6e9ef;
  --ctp-crust: #dce0e8;

  --brand: var(--ctp-blue);
  --bg: var(--ctp-base);
  --bg-card: var(--ctp-mantle);
  --bg-sidebar: var(--ctp-crust);
  --text: var(--ctp-text);
  --text-secondary: var(--ctp-subtext1);
  --text-sidebar: var(--ctp-subtext0);
  --text-sidebar-hover: var(--ctp-text);
  --text-sidebar-active: var(--ctp-lavender);
  --border: var(--ctp-surface1);
  --input-bg: var(--ctp-surface0);
  --destructive: var(--ctp-red);
  --destructive-hover: var(--ctp-maroon);
  --destructive-soft: rgba(210, 15, 57, 0.14);
  --destructive-border: var(--ctp-surface2);
  --sidebar-divider: rgba(76, 79, 105, 0.14);
  --sidebar-hover-bg: rgba(76, 79, 105, 0.08);
  --sidebar-active-bg: rgba(30, 102, 245, 0.18);
  --accent-fg: var(--ctp-base);
  --success: var(--ctp-green);
  --error: var(--ctp-red);
  --field-icon: var(--ctp-overlay1);
  --search-item-hover-bg: rgba(30, 102, 245, 0.08);
  --elevation-lg: 0 8px 24px rgba(76, 79, 105, 0.2);
  --elevation-md: 0 8px 18px rgba(76, 79, 105, 0.16);
}

[data-theme="dark"] {
  /* Catppuccin Mocha */
  --ctp-rosewater: #f5e0dc;
  --ctp-flamingo: #f2cdcd;
  --ctp-pink: #f5c2e7;
  --ctp-mauve: #cba6f7;
  --ctp-red: #f38ba8;
  --ctp-maroon: #eba0ac;
  --ctp-peach: #fab387;
  --ctp-yellow: #f9e2af;
  --ctp-green: #a6e3a1;
  --ctp-teal: #94e2d5;
  --ctp-sky: #89dceb;
  --ctp-sapphire: #74c7ec;
  --ctp-blue: #89b4fa;
  --ctp-lavender: #b4befe;
  --ctp-text: #cdd6f4;
  --ctp-subtext1: #bac2de;
  --ctp-subtext0: #a6adc8;
  --ctp-overlay2: #9399b2;
  --ctp-overlay1: #7f849c;
  --ctp-overlay0: #6c7086;
  --ctp-surface2: #585b70;
  --ctp-surface1: #45475a;
  --ctp-surface0: #313244;
  --ctp-base: #1e1e2e;
  --ctp-mantle: #181825;
  --ctp-crust: #11111b;

  --brand: var(--ctp-blue);
  --bg: var(--ctp-base);
  --bg-card: var(--ctp-surface0);
  --bg-sidebar: var(--ctp-crust);
  --text: var(--ctp-text);
  --text-secondary: var(--ctp-subtext0);
  --text-sidebar: var(--ctp-overlay0);
  --text-sidebar-hover: var(--ctp-subtext1);
  --text-sidebar-active: var(--ctp-text);
  --border: var(--ctp-surface1);
  --input-bg: var(--ctp-surface1);
  --destructive: var(--ctp-maroon);
  --destructive-hover: var(--ctp-red);
  --destructive-soft: rgba(235, 160, 172, 0.14);
  --destructive-border: var(--ctp-overlay0);
  --sidebar-divider: rgba(255, 255, 255, 0.08);
  --sidebar-hover-bg: rgba(255, 255, 255, 0.06);
  --sidebar-active-bg: rgba(255, 255, 255, 0.1);
  --accent-fg: var(--ctp-base);
  --success: var(--ctp-green);
  --error: var(--ctp-red);
  --field-icon: var(--ctp-overlay1);
  --search-item-hover-bg: rgba(166, 173, 200, 0.14);
  --elevation-lg: 0 8px 24px rgba(17, 17, 27, 0.5);
  --elevation-md: 0 8px 18px rgba(17, 17, 27, 0.44);
}

body { opacity: 0; }
body.ready { opacity: 1; transition: opacity .15s; }

.uk-card { background: var(--bg-card) !important; border-color: var(--border) !important; color: var(--text) !important; }
.bg-white { background: var(--bg-card) !important; }
.border-b, .border-border { border-color: var(--border) !important; }
.text-muted-foreground { color: var(--text-secondary) !important; }
.uk-input, .uk-select, .uk-textarea { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-table th { color: var(--text-secondary) !important; border-color: var(--border) !important; }
.uk-table td { color: var(--text) !important; }
.uk-table-divider > :not(:first-child) > tr, .uk-table-divider > tr:not(:first-child) { border-color: var(--border) !important; }
.uk-label { font-weight: 500 !important; }
.uk-label { background: var(--ctp-surface2) !important; color: var(--text) !important; }
.uk-label-primary { background: var(--brand) !important; color: var(--accent-fg) !important; }
.uk-label-destructive { background: var(--destructive) !important; color: var(--accent-fg) !important; }
.uk-label-secondary { background: var(--ctp-green) !important; color: var(--accent-fg) !important; }
.uk-btn-default { background: var(--input-bg) !important; color: var(--text) !important; border-color: var(--border) !important; }
.uk-btn-primary { background: var(--brand) !important; border-color: var(--brand) !important; color: var(--accent-fg) !important; }
.uk-checkbox, .uk-toggle-switch { background: var(--input-bg) !important; border-color: var(--border) !important; }
.uk-checkbox:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-toggle-switch:checked { background-color: var(--brand) !important; border-color: var(--brand) !important; }
.uk-offcanvas-bar { background: var(--bg-sidebar) !important; }
.uk-form-label { color: var(--text-secondary) !important; }
h2, h3 { color: var(--text) !important; }
p { color: var(--text) !important; }
a.uk-link { color: var(--brand) !important; }
.uk-nav-header { color: var(--text-secondary) !important; }
.uk-close { color: var(--text) !important; }
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
          :root {
            --safe-top: env(safe-area-inset-top, 0px);
            --safe-right: env(safe-area-inset-right, 0px);
            --safe-bottom: env(safe-area-inset-bottom, 0px);
            --safe-left: env(safe-area-inset-left, 0px);
            --vvh: 100dvh;
            --vv-top: 0px;
            --vk-bottom: 0px;
          }

          html { height: 100%; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
          body { min-height: 100%; margin: 0; background: var(--bg); color: var(--text); overscroll-behavior: none; -webkit-font-smoothing: antialiased; }

          @layer base {
            input, select, textarea, button { font-size: 16px; }
            input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; }
          }
          select:not(.uk-select) { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='currentColor' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
          a, button, input, select, textarea, label, [role="switch"], [hx-post], [hx-get], [hx-delete] { touch-action: manipulation; }
          .main-content { -webkit-overflow-scrolling: touch; }

          .admin-layout {
            min-height: 100dvh;
            min-height: var(--vvh, 100dvh);
            padding-left: var(--safe-left);
            padding-right: var(--safe-right);
          }


          .desktop-sidebar { display: none; }

          .main-content {
            flex: 1;
            padding: 0;
            min-height: 100dvh;
            min-height: var(--vvh, 100dvh);
          }
          #page-content { min-height: calc(var(--vvh, 100dvh) - var(--vv-top)); padding-bottom: var(--safe-bottom); }
          .page-header { background: var(--bg-card); padding: 20px 32px 20px 52px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: -webkit-sticky; position: sticky; top: 0; z-index: 50; }
          .page-header h2 { font-size: 22px; color: var(--text); font-weight: 600; letter-spacing: -0.3px; }
          .page-body { padding: 28px 32px; }

          @media (min-width: 1024px) {
            .admin-layout { display: flex; }
            .desktop-sidebar {
              display: flex;
              flex-direction: column;
              width: 260px;
              min-width: 260px;
              background: var(--bg-sidebar);
              min-height: var(--vvh, 100dvh);
              position: sticky;
              top: 0;
              height: var(--vvh, 100dvh);
              overflow-y: auto;
              padding: calc(24px + var(--safe-top)) 0 calc(24px + var(--safe-bottom));
            }
            .mobile-menu-btn { display: none !important; }
            .page-header { padding-left: 32px; }
          }

          table { width: 100%; border-collapse: collapse; }

          .search-box { position: relative; }
          .search-box::before {
            content: "";
            position: absolute;
            left: 12px;
            top: 50%;
            width: 16px;
            height: 16px;
            transform: translateY(-50%);
            pointer-events: none;
            background: var(--field-icon);
            -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='black' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E") no-repeat center / contain;
            mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='black' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z'/%3E%3C/svg%3E") no-repeat center / contain;
          }
          .search-box input { padding-left: 36px; }
          .search-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; max-height: 240px; overflow-y: auto; z-index: 100; box-shadow: var(--elevation-lg); }
          /* Customer create/edit forms don't wrap the input in .search-box, so absolute positioning can land off-screen.
             For those inline address result containers, render results as a normal block list. */
          #address-results .search-results { position: static; border-top: 1px solid var(--border); border-radius: 8px; box-shadow: var(--elevation-md); }
          .search-item { padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text); }
          .search-item:hover { background: var(--search-item-hover-bg); }
          .search-item .name { font-weight: 500; }
          .search-item .meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }

          .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--brand); color: var(--accent-fg); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; }
          .avatar-sm { width: 32px; height: 32px; font-size: 13px; }

          .save-indicator { font-size: 12px; font-weight: 500; transition: opacity 0.3s; opacity: 0; margin-left: 8px; }
          .save-ok { color: var(--success); }
          .save-err { color: var(--error); }
          .save-pending { color: var(--text-secondary); }
          .autosave .save-indicator, #territory-services .save-indicator, #territory-providers .save-indicator { display: inline-block; }

          .delete-btn { color: var(--destructive); background: var(--bg-card); border: 1px solid var(--destructive-border); padding: 6px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
          .delete-btn:hover { background: var(--destructive-soft); border-color: var(--destructive-hover); color: var(--destructive-hover); }
          .delete-btn.delete-armed { background: var(--destructive); color: var(--accent-fg); border-color: var(--destructive); font-weight: 600; }
          .delete-btn.delete-armed:hover { background: var(--destructive-hover); border-color: var(--destructive-hover); }

          .mobile-menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--text);
            padding: 8px;
            cursor: pointer;
            position: fixed;
            top: calc(12px + var(--safe-top));
            left: calc(12px + var(--safe-left));
            z-index: 100;
          }

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
            .page-header {
              padding: calc(14px + var(--safe-top)) calc(16px + var(--safe-right)) 14px calc(52px + var(--safe-left));
              gap: 8px;
              flex-wrap: wrap;
            }
            .page-header h2 { font-size: 18px; }
            .page-body { padding: 16px calc(16px + var(--safe-right)) calc(16px + var(--safe-bottom)) calc(16px + var(--safe-left)); }
          }

          #sms-thread-modal-overlay {
            position: fixed;
            top: var(--vv-top, 0px);
            left: 0;
            right: 0;
            bottom: var(--vk-bottom, 0px);
            background: rgba(0, 0, 0, 0.55);
            z-index: 1090;
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
          #sms-thread-modal-header h3 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -0.2px; line-height: 1.2; }
          #sms-thread-modal-actions { display: inline-flex; align-items: center; gap: 8px; }
          #sms-thread-modal-open-inbox { text-decoration: none; }
          #sms-thread-modal-content {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            padding: 12px;
            display: flex;
            flex-direction: column;
          }
          #sms-thread-modal-status {
            display: block;
            padding: 0;
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
            font-size: 13px;
            margin-bottom: 12px;
          }
          #sms-thread-modal-error[data-open="true"] { display: block; }
          #sms-thread-modal-body {
            flex: 1;
            min-height: 0;
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
          #sms-thread-modal-body #sms-history-scroll {
            max-height: none !important;
            flex: 1;
            min-height: 0;
            overflow-y: auto !important;
          }
          #sms-thread-modal-body #sms-thread-panel form {
            padding-bottom: calc(16px + var(--safe-bottom));
          }
          #sms-thread-modal-body #sms-thread-panel form textarea {
            margin-bottom: 2px;
          }
          #sms-thread-modal-body #sms-thread-panel form [data-sms-counter] {
            padding-bottom: 6px;
          }

          @media (min-width: 768px) {
            #sms-thread-modal-header h3 { font-size: 16px; }
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
              box-shadow: var(--elevation-lg);
              overflow: hidden;
            }
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
                  <div class="skel" aria-hidden="true">
                    <div class="skel-row"><span class="skel-dot"></span><span class="skel-line w-45"></span></div>
                    <div class="skel-row"><span class="skel-dot"></span><span class="skel-line w-70"></span></div>
                    <div class="skel-row"><span class="skel-dot"></span><span class="skel-line w-85"></span></div>
                    <div class="skel-row"><span class="skel-dot"></span><span class="skel-line w-30"></span></div>
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
  updateThemeColor();
}
function updateThemeLabels(t) {
  document.querySelectorAll('.theme-label').forEach(function(el) { el.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode'; });
}
function updateThemeColor() {
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  var color = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
  if (color) meta.setAttribute('content', color);
}
updateThemeLabels(document.documentElement.getAttribute('data-theme') || 'light');
updateThemeColor();

(function() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' }).catch(function() {});
  });
})();

(function() {
  if (!navigator.storage || !navigator.storage.persisted || !navigator.storage.persist) return;
  var requestPersist = function() {
    navigator.storage.persisted().then(function(isPersistent) {
      if (isPersistent) return;
      var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      if (standalone) {
        navigator.storage.persist().catch(function() {});
      }
    }).catch(function() {});
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(requestPersist, { timeout: 2500 });
  } else {
    setTimeout(requestPersist, 1200);
  }
})();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
  if (!localStorage.getItem('theme')) {
    var t = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    updateThemeLabels(t);
    updateThemeColor();
  }
});
requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add('ready')})});
</script>`}
      </body>
    </html>
  );
};
