import { jsx as _jsx, jsxs as _jsxs } from "hono/jsx/jsx-runtime";
import { Layout } from './layout';
export const BrandingPage = ({ primaryColor }) => {
    const initialColor = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#2563eb';
    return (_jsxs(Layout, { title: "Branding", children: [_jsx("div", { class: "page-header", children: _jsx("h2", { children: "Branding" }) }), _jsx("div", { class: "p-8", children: _jsx("div", { class: "uk-card uk-card-body", children: _jsx("section", { id: "branding-settings", children: _jsxs("form", { class: "autosave", "hx-post": "/admin/branding", "hx-swap": "none", "hx-trigger": "input delay:500ms, change", "hx-sync": "this:queue last", children: [_jsxs("div", { class: "flex items-center justify-between mb-4", children: [_jsx("h3", { class: "text-base font-semibold", children: "Widget Appearance" }), _jsx("span", { class: "save-indicator" })] }), _jsxs("div", { class: "grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-end", children: [_jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "widget-primary-color", children: "Widget Primary Colour" }), _jsx("input", { id: "widget-primary-color", name: "primaryColor", type: "color", class: "uk-input", value: initialColor })] }), _jsxs("div", { class: "grid gap-2", children: [_jsx("label", { class: "uk-form-label", for: "widget-primary-color-text", children: "Hex Value" }), _jsx("input", { id: "widget-primary-color-text", type: "text", class: "uk-input", value: initialColor, inputmode: "text", maxlength: 7, pattern: "^#[0-9a-fA-F]{6}$" })] })] }), _jsxs("div", { class: "mt-6 grid gap-3", children: [_jsx("span", { class: "uk-form-label mb-0", children: "Live Preview" }), _jsx("button", { id: "widget-primary-color-preview", type: "button", class: "uk-btn uk-btn-primary", style: `background:${initialColor};border-color:${initialColor};`, children: "Book Now" }), _jsx("p", { class: "text-sm text-muted-foreground mb-0", children: "This is how your booking widget buttons will look." })] })] }) }) }) }), _jsx("script", { children: `
        (function() {
          var colorInput = document.getElementById('widget-primary-color');
          var textInput = document.getElementById('widget-primary-color-text');
          var preview = document.getElementById('widget-primary-color-preview');
          if (!colorInput || !textInput || !preview) return;

          function applyColor(value) {
            preview.style.backgroundColor = value;
            preview.style.borderColor = value;
          }

          function normalizeHex(value) {
            if (!value) return '';
            var normalized = String(value).trim();
            if (normalized[0] !== '#') normalized = '#' + normalized;
            return normalized.slice(0, 7);
          }

          colorInput.addEventListener('input', function() {
            var value = colorInput.value;
            textInput.value = value;
            applyColor(value);
          });

          textInput.addEventListener('input', function() {
            var value = normalizeHex(textInput.value);
            textInput.value = value;
            if (/^#[0-9a-fA-F]{6}$/.test(value)) {
              colorInput.value = value;
              applyColor(value);
            }
          });

          textInput.addEventListener('change', function() {
            if (!/^#[0-9a-fA-F]{6}$/.test(textInput.value)) {
              textInput.value = colorInput.value;
            }
            applyColor(colorInput.value);
          });

          applyColor(colorInput.value);
        })();
      ` })] }));
};
//# sourceMappingURL=branding.js.map