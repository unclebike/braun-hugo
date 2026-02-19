import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "hono/jsx/jsx-runtime";
import { Layout } from './layout';
const BADGE_STATUSES = new Set([
    'created',
    'assigned',
    'enroute',
    'in_progress',
    'complete',
    'cancelled',
    'pending',
    'sent',
    'paid',
    'void',
    'active',
    'inactive',
    'manager',
    'provider',
    'zip',
    'radius',
    'geofence',
    'weekly',
    'biweekly',
    'monthly',
    'new',
    'read',
    'replied',
    'archived',
    'contact',
    'newsletter',
    'registration',
]);
const isBadgeStatus = (value) => typeof value === 'string' && BADGE_STATUSES.has(value.toLowerCase());
const isEmptyValue = (value) => value === null || value === undefined || value === '' || value === '-';
const mobilePriorityScore = (label) => {
    const l = label.toLowerCase();
    if (/(amount|price|total|value)/.test(l))
        return 100;
    if (/(status|active|state)/.test(l))
        return 95;
    if (/(date|time|booked|created|due)/.test(l))
        return 90;
    if (/(service|frequency|duration|territory|area|type|role)/.test(l))
        return 80;
    if (/(phone|email|from|subject|event)/.test(l))
        return 70;
    return 40;
};
const stringifyValue = (value) => {
    if (typeof value === 'string' || typeof value === 'number')
        return String(value);
    if (typeof value === 'boolean')
        return value ? 'Yes' : 'No';
    return '';
};
const inferFormHints = (field) => {
    const hints = {};
    const n = field.name.toLowerCase();
    const t = (field.type || 'text').toLowerCase();
    if (n === 'first_name')
        hints.autocomplete = 'given-name';
    if (n === 'last_name')
        hints.autocomplete = 'family-name';
    if (t === 'email' || n.includes('email')) {
        hints.autocomplete = hints.autocomplete || 'email';
        hints.inputmode = 'email';
        hints.autocapitalize = 'off';
        hints.spellcheck = 'false';
    }
    if (t === 'tel' || n.includes('phone') || n.includes('mobile')) {
        hints.autocomplete = hints.autocomplete || 'tel';
        hints.inputmode = 'tel';
        hints.autocapitalize = 'off';
        hints.spellcheck = 'false';
    }
    if (n.includes('postal')) {
        hints.autocomplete = 'postal-code';
        hints.autocapitalize = 'characters';
    }
    if (n === 'address_line_1')
        hints.autocomplete = 'address-line1';
    if (n === 'address_line_2')
        hints.autocomplete = 'address-line2';
    if (n === 'address_city')
        hints.autocomplete = 'address-level2';
    if (n === 'address_state')
        hints.autocomplete = 'address-level1';
    if (n.includes('country'))
        hints.autocomplete = 'country-name';
    if (t === 'number') {
        const isDecimal = field.step !== undefined && Number(field.step) !== 1;
        hints.inputmode = isDecimal ? 'decimal' : 'numeric';
    }
    if (n.includes('search') || n === 'q') {
        hints.autocomplete = 'off';
        hints.inputmode = 'search';
    }
    return hints;
};
const TableView = ({ title, columns, rows, createUrl, extraActions, detailUrlPrefix, deleteUrlPrefix, rawIds }) => (_jsxs(Layout, { title: title, children: [_jsxs("div", { class: "page-header", children: [_jsx("h2", { children: title }), _jsxs("div", { class: "page-header-actions", children: [(extraActions || []).map((action) => (_jsx("a", { href: action.url, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": action.url, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: action.label }, action.url))), createUrl && _jsx("a", { href: createUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "+ Create New" })] })] }), _jsx("div", { class: "p-8", children: _jsx("div", { class: "uk-card uk-card-body", children: _jsx("section", { children: rows.length === 0 ? (_jsxs("div", { class: "text-center py-12 text-muted-foreground", children: [_jsxs("p", { class: "mb-4 text-sm", children: ["No ", title.toLowerCase(), " found."] }), createUrl && _jsx("a", { href: createUrl, class: "uk-btn uk-btn-default", "hx-get": createUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Create your first" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { class: "grid gap-3 md:hidden", children: rows.map((row, i) => {
                                    const displayId = typeof row.id === 'string' ? row.id : '';
                                    const actualId = rawIds ? rawIds[i] : displayId;
                                    const values = Object.values(row);
                                    const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
                                    const entries = values.map((value, index) => ({
                                        index,
                                        label: columns[index] || 'Field',
                                        value,
                                    }));
                                    const primary = entries[0];
                                    const statusEntry = entries.find((entry, index) => index > 0 && isBadgeStatus(entry.value));
                                    const compactMeta = entries
                                        .filter((entry) => entry.index !== 0 && entry !== statusEntry && !isEmptyValue(entry.value))
                                        .sort((a, b) => mobilePriorityScore(b.label) - mobilePriorityScore(a.label))
                                        .slice(0, 2);
                                    return (_jsxs("article", { class: "border border-border rounded-lg p-3", style: "background:var(--bg-card);", children: [_jsxs("div", { class: "flex items-start justify-between gap-3", children: [_jsx("div", { class: "min-w-0 flex-1", children: detailUrl ? (_jsx("a", { href: detailUrl, "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "uk-link font-semibold leading-snug block truncate", style: "color:var(--text);", "data-uk-tooltip": typeof primary?.value === 'string' && primary.value.length === 8 ? `title: ${actualId}` : undefined, children: primary?.value })) : (_jsx("p", { class: "font-semibold leading-snug truncate", children: primary?.value })) }), statusEntry && (_jsx("span", { class: "shrink-0", style: "margin-top:1px;", children: _jsx(StatusBadge, { status: String(statusEntry.value).toLowerCase() }) }))] }), compactMeta.length > 0 && (_jsx("div", { class: "grid grid-cols-2 gap-2 mt-2", children: compactMeta.map((entry) => (_jsxs("div", { class: "min-w-0", children: [_jsx("p", { class: "text-[10px] uppercase tracking-wide text-muted-foreground truncate", children: entry.label }), _jsx("p", { class: "text-xs font-medium truncate", children: stringifyValue(entry.value) || '-' })] }, entry.index))) })), !statusEntry && isBadgeStatus(primary?.value) && (_jsx("div", { class: "mt-2", children: _jsx(StatusBadge, { status: String(primary.value).toLowerCase() }) })), compactMeta.length === 0 && entries[1] && !isEmptyValue(entries[1].value) && (_jsxs("p", { class: "text-xs text-muted-foreground mt-2 truncate", children: [entries[1].label, ": ", stringifyValue(entries[1].value)] })), _jsxs("div", { class: "flex items-center justify-between gap-2 mt-3", children: [detailUrl && (_jsx("a", { href: detailUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "View" })), deleteUrlPrefix && (_jsx("button", { type: "button", class: "delete-btn", "data-confirm": "arm", "hx-post": `${deleteUrlPrefix}/${actualId}/delete`, "hx-target": "closest article", "hx-swap": "delete swap:300ms", children: "Delete" }))] })] }, i));
                                }) }), _jsx("div", { class: "uk-overflow-auto hidden md:block", children: _jsxs("table", { class: "uk-table uk-table-divider uk-table-hover uk-table-sm w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { class: "border-b border-border", children: [columns.map((col) => _jsx("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", children: col }, col)), _jsx("th", { class: "text-left py-3 px-4 font-medium text-muted-foreground", style: "width: 100px;", children: "Actions" })] }) }), _jsx("tbody", { children: rows.map((row, i) => {
                                                const displayId = typeof row.id === 'string' ? row.id : '';
                                                const actualId = rawIds ? rawIds[i] : displayId;
                                                const values = Object.values(row);
                                                const detailUrl = detailUrlPrefix ? `${detailUrlPrefix}/${actualId}` : null;
                                                return (_jsxs("tr", { class: "border-b border-border hover:bg-muted/50 transition-colors", style: detailUrl ? 'cursor: pointer;' : '', children: [values.map((val, j) => (_jsx("td", { class: "py-3 px-4", children: j === 0 && detailUrl ? (_jsx("a", { href: detailUrl, "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", class: "uk-link font-medium text-primary hover:underline", "data-uk-tooltip": typeof val === 'string' && val.length === 8 ? `title: ${actualId}` : undefined, children: val })) : (isBadgeStatus(val) ? _jsx(StatusBadge, { status: val.toLowerCase() }) : val) }, j))), _jsx("td", { class: "py-3 px-4", children: _jsxs("div", { class: "flex items-center gap-2", children: [detailUrl && (_jsx("a", { href: detailUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": detailUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "View" })), deleteUrlPrefix && (_jsx("button", { type: "button", class: "delete-btn", "data-confirm": "arm", "hx-post": `${deleteUrlPrefix}/${actualId}/delete`, "hx-target": "closest tr", "hx-swap": "delete swap:300ms", children: "Delete" }))] }) })] }, i));
                                            }) })] }) })] })) }) }) })] }));
const renderField = (field) => {
    if (field.readonly) {
        return (_jsx("p", { class: "text-sm py-2 px-3 bg-muted/50 rounded-md", children: String(field.value || '-') }));
    }
    const baseProps = {
        id: field.name,
        name: field.name,
        required: field.required,
        placeholder: field.placeholder,
        ...inferFormHints(field),
        ...(field.attrs || {}),
    };
    switch (field.type) {
        case 'textarea':
            return (_jsx("textarea", { ...baseProps, rows: 4, class: "uk-textarea", children: field.value || '' }));
        case 'select':
            return (_jsxs("select", { ...baseProps, class: "uk-select", children: [_jsx("option", { value: "", children: "Select..." }), (field.options || []).map(opt => (_jsx("option", { value: opt.value, selected: field.value === opt.value, children: opt.label }, opt.value)))] }));
        case 'checkbox':
            return (_jsxs("div", { class: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: field.name, name: field.name, checked: Boolean(field.value), class: "uk-checkbox" }), _jsx("label", { for: field.name, class: "text-sm", children: field.label })] }));
        case 'number':
            return (_jsx("input", { type: "number", ...baseProps, value: field.value ?? '', min: field.min, max: field.max, step: field.step || 1, class: "uk-input" }));
        case 'hidden':
            return _jsx("input", { type: "hidden", ...baseProps, value: field.value ?? '' });
        default:
            return (_jsx("input", { type: field.type || 'text', ...baseProps, value: field.value ?? '', class: "uk-input" }));
    }
};
const FormView = ({ title, fields, submitUrl, cancelUrl, isEdit, deleteUrl, error }) => (_jsxs(Layout, { title: title, children: [_jsx("div", { class: "page-header", children: _jsx("h2", { children: title }) }), _jsx("div", { class: "p-8", children: _jsx("div", { class: "uk-card uk-card-body", style: "max-width: 720px;", children: _jsx("section", { children: _jsxs("form", { class: "form", "hx-post": submitUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": cancelUrl, children: [error && (_jsx("div", { class: "mb-4 rounded-md border px-3 py-2 text-sm", style: "border-color: #fecaca; background: #fff1f2; color: #b91c1c;", children: error })), _jsx("div", { class: "grid gap-4 sm:grid-cols-2", children: fields.map((field) => {
                                    if (field.type === 'hidden') {
                                        return _jsx("div", { children: renderField(field) }, field.name);
                                    }
                                    if (field.type === 'checkbox') {
                                        const isChecked = Boolean(field.value);
                                        return (_jsxs("label", { class: "uk-form-label flex items-center gap-2 cursor-pointer sm:col-span-2", children: [_jsx("input", { type: "checkbox", name: field.name, checked: isChecked, role: "switch", "aria-checked": isChecked ? 'true' : 'false', class: "uk-toggle-switch uk-toggle-switch-primary" }), field.label] }, field.name));
                                    }
                                    const wide = field.type === 'textarea' || field.type === 'select';
                                    return (_jsxs("div", { class: `grid gap-2${wide ? ' sm:col-span-2' : ''}`, children: [_jsxs("label", { for: field.name, class: "uk-form-label", children: [field.label, field.required && ' *'] }), renderField(field), field.name === 'address_line_1' && (_jsx("div", { id: "address-results", class: "mt-2", style: "position: relative;" }))] }, field.name));
                                }) }), _jsxs("div", { class: "flex items-center gap-3 mt-6 sm:col-span-2", children: [_jsx("button", { type: "submit", class: "uk-btn uk-btn-primary", children: isEdit ? 'Update' : 'Create' }), _jsx("a", { href: cancelUrl, class: "uk-btn uk-btn-default", "hx-get": cancelUrl, "hx-target": "#page-content", "hx-push-url": "true", children: "Cancel" }), deleteUrl && (_jsx("button", { type: "button", class: "delete-btn", "data-confirm": "arm", "hx-post": deleteUrl, style: "margin-left: auto;", children: "Delete" }))] })] }) }) }) })] }));
const DetailView = ({ title, subtitle, fields, editUrl, backUrl, actions }) => (_jsxs(Layout, { title: title, children: [_jsxs("div", { class: "page-header", children: [_jsxs("div", { class: "page-header-info", children: [_jsx("h2", { children: title }), subtitle && _jsx("p", { class: "text-sm text-muted-foreground", style: "margin:2px 0 0;", children: subtitle })] }), _jsxs("div", { class: "page-header-actions", children: [editUrl && (_jsx("a", { href: editUrl, class: "uk-btn uk-btn-primary uk-btn-sm", "hx-get": editUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Edit" })), _jsx("a", { href: backUrl, class: "uk-btn uk-btn-default uk-btn-sm", "hx-get": backUrl, "hx-target": "#page-content", "hx-select": "#page-content", "hx-push-url": "true", children: "Back" })] })] }), _jsxs("div", { class: "p-4 md:p-8", children: [_jsx("div", { class: "uk-card uk-card-body", style: "max-width: 800px;", children: _jsx("div", { class: "grid gap-3", children: fields.map(f => (_jsxs("div", { class: "flex items-start justify-between gap-3 rounded-md px-2.5 py-1.5", style: "background:var(--surface-elevated, var(--input-bg));", children: [_jsx("span", { class: "text-xs uppercase tracking-wide text-muted-foreground", children: f.label }), _jsx("p", { class: "text-sm font-medium text-right", children: f.value || '-' })] }, f.label))) }) }), actions && actions.length > 0 && (_jsxs("div", { class: "uk-card uk-card-body danger-card", style: "max-width: 800px; margin-top: 24px;", children: [_jsx("h3", { class: "text-sm font-semibold text-muted-foreground mb-3", children: "Actions" }), _jsx("div", { class: "flex flex-wrap gap-2", children: actions.map(action => {
                                const variantClass = action.variant === 'primary' ? 'uk-btn-primary' : action.variant === 'danger' ? 'delete-btn' : 'uk-btn-default';
                                const isDelete = action.variant === 'danger';
                                return (_jsx("button", { type: "button", class: isDelete ? 'delete-btn' : `uk-btn ${variantClass} uk-btn-sm`, "hx-post": action.url, "hx-target": "#page-content", "data-confirm": isDelete ? 'arm' : undefined, children: action.label }, action.label));
                            }) })] }))] })] }));
const STATUS_ICON_MAP = {
    created: { cls: 'status-icon--neutral', label: 'Created' },
    assigned: { cls: 'status-icon--neutral', label: 'Assigned' },
    enroute: { cls: 'status-icon--secondary', label: 'En route' },
    in_progress: { cls: 'status-icon--secondary', label: 'In progress' },
    complete: { cls: 'status-icon--primary', label: 'Complete' },
    cancelled: { cls: 'status-icon--destructive', label: 'Cancelled' },
    pending: { cls: 'status-icon--secondary', label: 'Pending' },
    sent: { cls: 'status-icon--neutral', label: 'Sent' },
    paid: { cls: 'status-icon--primary', label: 'Paid' },
    void: { cls: 'status-icon--destructive', label: 'Void' },
    new: { cls: 'status-icon--destructive', label: 'New' },
    read: { cls: 'status-icon--secondary', label: 'Read' },
    replied: { cls: 'status-icon--primary', label: 'Replied' },
    archived: { cls: 'status-icon--neutral', label: 'Archived' },
    active: { cls: 'status-icon--primary', label: 'Active' },
    inactive: { cls: 'status-icon--secondary', label: 'Inactive' },
};
const svgProps = { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
const StatusIconSvg = ({ status }) => {
    switch (status) {
        case 'created':
            return _jsx("svg", { ...svgProps, children: _jsx("circle", { cx: "12", cy: "12", r: "9" }) });
        case 'assigned':
            return _jsxs("svg", { ...svgProps, children: [_jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" }), _jsx("path", { d: "m16 11 2 2 4-4" })] });
        case 'enroute':
            return _jsx("svg", { ...svgProps, children: _jsx("path", { d: "M5 12h14m-7-7 7 7-7 7" }) });
        case 'in_progress':
            return _jsx("svg", { ...svgProps, children: _jsx("polygon", { points: "6 3 20 12 6 21 6 3" }) });
        case 'complete':
        case 'paid':
            return _jsxs("svg", { ...svgProps, children: [_jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), _jsx("path", { d: "m22 4-10 10.01-3-3" })] });
        case 'cancelled':
            return _jsxs("svg", { ...svgProps, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m15 9-6 6m0-6 6 6" })] });
        case 'pending':
            return _jsxs("svg", { ...svgProps, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M12 6v6l4 2" })] });
        case 'sent':
            return _jsxs("svg", { ...svgProps, children: [_jsx("path", { d: "m22 2-7 20-4-9-9-4z" }), _jsx("path", { d: "M22 2 11 13" })] });
        case 'void':
            return _jsxs("svg", { ...svgProps, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "m4.93 4.93 14.14 14.14" })] });
        case 'new':
            return _jsx("svg", { ...svgProps, fill: "currentColor", stroke: "none", children: _jsx("circle", { cx: "12", cy: "12", r: "5" }) });
        case 'read':
            return _jsx("svg", { ...svgProps, children: _jsx("path", { d: "M20 6 9 17l-5-5" }) });
        case 'replied':
            return _jsxs("svg", { ...svgProps, children: [_jsx("path", { d: "m9 17-5-5 5-5" }), _jsx("path", { d: "M20 18v-2a4 4 0 0 0-4-4H4" })] });
        case 'archived':
            return _jsxs("svg", { ...svgProps, children: [_jsx("rect", { x: "2", y: "3", width: "20", height: "5", rx: "1" }), _jsx("path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }), _jsx("path", { d: "M10 12h4" })] });
        case 'active':
            return _jsx("svg", { ...svgProps, children: _jsx("path", { d: "M20 6 9 17l-5-5" }) });
        case 'inactive':
            return _jsx("svg", { ...svgProps, children: _jsx("path", { d: "M18 6 6 18M6 6l12 12" }) });
        default:
            return _jsx("svg", { ...svgProps, children: _jsx("circle", { cx: "12", cy: "12", r: "9" }) });
    }
};
const StatusIcon = ({ status }) => {
    const s = status.toLowerCase();
    const info = STATUS_ICON_MAP[s] || { cls: 'status-icon--neutral', label: s.replace('_', ' ') };
    return (_jsx("span", { class: `status-icon ${info.cls}`, title: info.label, "aria-label": info.label, children: _jsx(StatusIconSvg, { status: s }) }));
};
const BADGE_CLASS_MAP = {
    created: 'uk-label',
    assigned: 'uk-label',
    enroute: 'uk-label uk-label-secondary',
    in_progress: 'uk-label uk-label-secondary',
    complete: 'uk-label uk-label-primary',
    cancelled: 'uk-label uk-label-destructive',
    pending: 'uk-label uk-label-secondary',
    sent: 'uk-label',
    paid: 'uk-label uk-label-primary',
    void: 'uk-label uk-label-destructive',
    active: 'uk-label uk-label-primary',
    inactive: 'uk-label uk-label-secondary',
    manager: 'uk-label',
    provider: 'uk-label uk-label-secondary',
    zip: 'uk-label',
    radius: 'uk-label uk-label-secondary',
    geofence: 'uk-label uk-label-secondary',
    weekly: 'uk-label',
    biweekly: 'uk-label uk-label-secondary',
    monthly: 'uk-label uk-label-primary',
    new: 'uk-label uk-label-destructive',
    read: 'uk-label uk-label-secondary',
    replied: 'uk-label uk-label-primary',
    archived: 'uk-label',
    contact: 'uk-label uk-label-primary',
    newsletter: 'uk-label uk-label-secondary',
    registration: 'uk-label',
};
const StatusBadge = ({ status }) => {
    const s = status.toLowerCase();
    const hasIcon = s in STATUS_ICON_MAP;
    const label = s.replace('_', ' ');
    return (_jsxs("span", { class: BADGE_CLASS_MAP[s] || 'uk-label', children: [hasIcon && _jsx(StatusIconSvg, { status: s }), label] }));
};
export { TableView, FormView, DetailView, StatusBadge, StatusIcon };
//# sourceMappingURL=components.js.map