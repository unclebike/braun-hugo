export const BOOKING_WIDGET_JS = `(function() {
  'use strict';

  var WIDGET_VERSION = '2.0.0';

  function GOATkitWidget(config) {
    this.apiUrl = config.apiUrl || '';
    this.apiKey = config.apiKey || '';
    this.containerId = config.containerId || 'goatkit-widget';
    this.primaryColor = config.primaryColor || '#2563eb';
    this.fontFamily = config.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    this.onComplete = config.onComplete || function() {};
    this.onError = config.onError || function() {};
    this.onStepChange = config.onStepChange || function() {};

    this.state = {
      currentStep: 'zip',
      stepHistory: ['zip'],
      postalCode: '',
      territory: null,
      categories: [],
      selectedCategory: null,
      services: [],
      selectedService: null,
      serviceDetail: null,
      modifierSelections: {},
      timeslots: [],
      selectedDate: null,
      selectedTimeslot: null,
      dateWindowStart: 0,
      address: { line1: '', line2: '', city: '', province: '', postalCode: '' },
      contact: { firstName: '', lastName: '', email: '', phone: '' },
      loading: false,
      error: null,
      summaryExpanded: false,
      smsConsent: false,
      jobId: null
    };

    this._acTimer = null;
    this._acAbort = null;
    this._prevStep = null;
    this.init();
  }

  GOATkitWidget.prototype.init = function() {
    this.injectStyles();
    this.render();
  };

  // ═══════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.injectStyles = function() {
    if (document.getElementById('zbw-styles')) return;
    var s = document.createElement('style');
    s.id = 'zbw-styles';
    s.textContent = this.getCSS();
    document.head.appendChild(s);
  };

  GOATkitWidget.prototype.getCSS = function() {
    var p = this.primaryColor;
    var f = this.fontFamily;
    return [
      ':root{--zbw-p:' + p + ';--zbw-pl:' + p + '14;--zbw-f:' + f + '}',

      '.zbw-root{font-family:var(--zbw-f);color:#1a1a1a;line-height:1.5;box-sizing:border-box;-webkit-font-smoothing:antialiased}',
      '.zbw-root *,.zbw-root *::before,.zbw-root *::after{box-sizing:inherit}',

      '.zbw-layout{display:flex;flex-direction:column;gap:0;max-width:860px;margin:0 auto}',
      '@media(min-width:768px){.zbw-layout{flex-direction:row;gap:24px}}',

      '.zbw-main{flex:1;min-width:0}',
      '.zbw-sidebar{display:none}',
      '@media(min-width:768px){.zbw-sidebar{display:block;width:280px;flex-shrink:0}}',

      '.zbw-mobile-summary{display:block;margin-bottom:16px}',
      '@media(min-width:768px){.zbw-mobile-summary{display:none}}',
      '.zbw-mobile-summary-btn{width:100%;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-family:var(--zbw-f);font-size:14px;color:#475569}',
      '.zbw-mobile-summary-btn strong{color:#1a1a1a}',

      '.zbw-progress{margin-bottom:24px}',
      '.zbw-progress-bar{height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden}',
      '.zbw-progress-fill{height:100%;background:var(--zbw-p);border-radius:2px;transition:width .4s ease}',
      '.zbw-progress-text{font-size:12px;color:#94a3b8;margin-top:6px}',

      '.zbw-step{animation:zbw-fadeIn .25s ease}',
      '@keyframes zbw-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',

      '.zbw-step-title{font-size:22px;font-weight:700;margin:0 0 4px;color:#0f172a}',
      '.zbw-step-desc{font-size:14px;color:#64748b;margin:0 0 20px}',

      '.zbw-card{padding:16px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s ease;background:#fff}',
      '.zbw-card:hover{border-color:' + p + '66;box-shadow:0 2px 8px rgba(0,0,0,.06)}',
      '.zbw-card.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-card-title{font-weight:600;font-size:15px;margin-bottom:2px}',
      '.zbw-card-desc{font-size:13px;color:#64748b;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.zbw-card-meta{display:flex;justify-content:space-between;align-items:center;font-size:14px}',
      '.zbw-card-price{font-weight:700;color:var(--zbw-p)}',
      '.zbw-card-duration{color:#94a3b8;font-size:13px}',
      '.zbw-cards{display:grid;gap:10px;margin-bottom:16px}',

      '.zbw-modifier-card{padding:20px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .15s ease;background:#fff;text-align:center}',
      '.zbw-modifier-card:hover{border-color:' + p + '66}',
      '.zbw-modifier-card.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-modifier-name{font-weight:600;font-size:16px;margin-bottom:4px}',
      '.zbw-modifier-desc{font-size:13px;color:#64748b;margin-bottom:8px}',
      '.zbw-modifier-price{font-weight:700;color:var(--zbw-p);font-size:15px}',

      '.zbw-date-chips{display:flex;align-items:center;gap:6px;margin-bottom:16px;overflow:hidden}',
      '.zbw-date-chip{flex-shrink:0;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;transition:all .15s;background:#fff;min-width:64px}',
      '.zbw-date-chip:hover{border-color:' + p + '66}',
      '.zbw-date-chip.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-date-chip.empty{opacity:.4;pointer-events:none}',
      '.zbw-date-day{font-size:12px;color:#64748b;font-weight:400}',
      '.zbw-date-num{font-size:15px;font-weight:700;margin-top:2px}',
      '.zbw-date-nav{width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;color:#475569;transition:all .15s}',
      '.zbw-date-nav:hover{background:#f1f5f9}',
      '.zbw-date-nav:disabled{opacity:.3;cursor:not-allowed}',

      '.zbw-timeslots{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:16px;max-height:280px;overflow-y:auto}',
      '.zbw-timeslot{padding:12px 8px;border:2px solid #e2e8f0;border-radius:8px;text-align:center;cursor:pointer;transition:all .15s;background:#fff}',
      '.zbw-timeslot:hover{border-color:' + p + '66}',
      '.zbw-timeslot.selected{border-color:var(--zbw-p);background:' + p + '08}',
      '.zbw-timeslot-time{font-weight:600;font-size:14px}',
      '.zbw-timeslot-price{font-size:12px;color:#64748b;margin-top:2px}',

      '.zbw-form-group{margin-bottom:14px}',
      '.zbw-form-group label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}',
'.zbw-input{width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:16px;font-family:var(--zbw-f);color:#1a1a1a;background:#fff;transition:border-color .15s,box-shadow .15s;outline:none}',
      '.zbw-input:focus{border-color:var(--zbw-p);box-shadow:0 0 0 3px ' + p + '1a}',
      '.zbw-input::placeholder{color:#9ca3af}',
      '.zbw-input-error{border-color:#ef4444}',
      'select.zbw-input{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width=\\'10\\' height=\\'6\\' viewBox=\\'0 0 10 6\\' fill=\\'none\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cpath d=\\'M1 1L5 5L9 1\\' stroke=\\'%236b7280\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px}',
      '.zbw-ac-wrap{position:relative}',
      '.zbw-ac-list{position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #d1d5db;border-top:none;border-radius:0 0 8px 8px;z-index:100;max-height:240px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.1)}',
      '.zbw-ac-list:empty{display:none}',
      '.zbw-ac-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s}',
      '.zbw-ac-item:last-child{border-bottom:none}',
      '.zbw-ac-item:hover{background:#f8fafc}',
      '.zbw-ac-main{font-size:14px;font-weight:600;color:#1a1a1a}',
      '.zbw-ac-sub{font-size:12px;color:#64748b;margin-top:1px}',
      '.zbw-row{display:flex;gap:12px}',
      '.zbw-row .zbw-form-group{flex:1}',

      '.zbw-btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 24px;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:var(--zbw-f);cursor:pointer;transition:all .15s;width:100%}',
      '.zbw-btn-primary{background:var(--zbw-p);color:#fff}',
      '.zbw-btn-primary:hover{opacity:.92}',
      '.zbw-btn-primary:disabled{background:#cbd5e1;cursor:not-allowed}',
      '.zbw-btn-secondary{background:#f1f5f9;color:#475569;margin-top:8px}',
      '.zbw-btn-secondary:hover{background:#e2e8f0}',
      '.zbw-btn-back{background:none;border:none;color:#64748b;font-size:14px;font-weight:400;cursor:pointer;padding:8px 0;font-family:var(--zbw-f);display:inline-flex;align-items:center;gap:4px}',
      '.zbw-btn-back:hover{color:#1a1a1a}',

      '.zbw-error{background:#fef2f2;color:#dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;border:1px solid #fecaca}',

      '.zbw-summary-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;position:sticky;top:24px}',
      '.zbw-summary-title{font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}',
      '.zbw-summary-service{font-size:16px;font-weight:700;margin-bottom:12px;color:#0f172a}',
      '.zbw-summary-item{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;color:#475569}',
      '.zbw-summary-item.mod{color:#64748b}',
      '.zbw-summary-divider{border:none;border-top:1px solid #e2e8f0;margin:10px 0}',
      '.zbw-summary-total{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f172a}',
      '.zbw-summary-detail{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;margin-bottom:6px}',
      '.zbw-summary-detail svg{flex-shrink:0}',

      '.zbw-success{text-align:center;padding:32px 16px}',
      '.zbw-success-icon{width:56px;height:56px;border-radius:50%;background:#dcfce7;margin:0 auto 16px;display:flex;align-items:center;justify-content:center}',
      '.zbw-success-icon svg{color:#16a34a}',
      '.zbw-success h2{font-size:22px;margin:0 0 8px}',
      '.zbw-success p{color:#64748b;font-size:14px;margin:4px 0}',

      '.zbw-skeleton{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:zbw-shimmer 1.5s infinite;border-radius:8px}',
      '@keyframes zbw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
      '.zbw-skeleton-card{height:80px;margin-bottom:10px}',
      '.zbw-skeleton-text{height:14px;margin-bottom:8px;width:60%}',
      '.zbw-skeleton-chip{height:56px;width:64px;border-radius:10px;flex-shrink:0}',

      '[data-theme="dark"] .zbw-root{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-step-title{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-step-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-card{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-card:hover{border-color:' + p + '88;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
      '[data-theme="dark"] .zbw-card.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-card-title{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-card-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-card-duration{color:#6c7086}',
      '[data-theme="dark"] .zbw-modifier-card{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-modifier-card:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-modifier-card.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-modifier-name{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-modifier-desc{color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-chip{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-date-chip:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-date-chip.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-date-day{color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-num{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-date-nav{background:#1e1e2e;border-color:#313244;color:#a6adc8}',
      '[data-theme="dark"] .zbw-date-nav:hover{background:#313244}',
      '[data-theme="dark"] .zbw-timeslot{background:#1e1e2e;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-timeslot:hover{border-color:' + p + '88}',
      '[data-theme="dark"] .zbw-timeslot.selected{border-color:var(--zbw-p);background:' + p + '18}',
      '[data-theme="dark"] .zbw-timeslot-time{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-timeslot-price{color:#a6adc8}',
      '[data-theme="dark"] .zbw-input{background:#181825;border-color:#313244;color:#cdd6f4}',
      '[data-theme="dark"] .zbw-input:focus{border-color:var(--zbw-p);box-shadow:0 0 0 3px ' + p + '33}',
      '[data-theme="dark"] .zbw-input::placeholder{color:#6c7086}',
      '[data-theme="dark"] .zbw-form-group label{color:#bac2de}',
      '[data-theme="dark"] .zbw-btn-secondary{background:#313244;color:#bac2de}',
      '[data-theme="dark"] .zbw-btn-secondary:hover{background:#45475a}',
      '[data-theme="dark"] .zbw-btn-back{color:#a6adc8}',
      '[data-theme="dark"] .zbw-btn-back:hover{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-btn-primary:disabled{background:#45475a;color:#6c7086}',
      '[data-theme="dark"] .zbw-error{background:#45475a;color:#f38ba8;border-color:#f38ba866}',
      '[data-theme="dark"] .zbw-progress-bar{background:#313244}',
      '[data-theme="dark"] .zbw-progress-text{color:#6c7086}',
      '[data-theme="dark"] .zbw-summary-panel{background:#181825;border-color:#313244}',
      '[data-theme="dark"] .zbw-summary-title{color:#6c7086}',
      '[data-theme="dark"] .zbw-summary-service{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-summary-item{color:#a6adc8}',
      '[data-theme="dark"] .zbw-summary-divider{border-color:#313244}',
      '[data-theme="dark"] .zbw-summary-total{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-summary-detail{color:#a6adc8}',
      '[data-theme="dark"] .zbw-mobile-summary-btn{background:#181825;border-color:#313244;color:#a6adc8}',
      '[data-theme="dark"] .zbw-mobile-summary-btn strong{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-success h2{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-success p{color:#a6adc8}',
      '[data-theme="dark"] .zbw-ac-list{background:#1e1e2e;border-color:#313244;box-shadow:0 4px 12px rgba(0,0,0,.4)}',
      '[data-theme="dark"] .zbw-ac-item{border-bottom-color:#313244}',
      '[data-theme="dark"] .zbw-ac-item:hover{background:#313244}',
      '[data-theme="dark"] .zbw-ac-main{color:#cdd6f4}',
      '[data-theme="dark"] .zbw-ac-sub{color:#a6adc8}',
      '[data-theme="dark"] .zbw-skeleton{background:linear-gradient(90deg,#313244 25%,#45475a 50%,#313244 75%);background-size:200% 100%}'
    ].join('\\n');
  };

  // ═══════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.formatPrice = function(cents) {
    if (cents == null) return '--';
    var dollars = Math.abs(cents) / 100;
    var sign = cents < 0 ? '-' : '';
    return sign + '\\$' + dollars.toFixed(dollars % 1 === 0 ? 0 : 2);
  };

  GOATkitWidget.prototype.formatPriceDelta = function(cents) {
    if (!cents) return 'Included';
    return '+\\$' + (Math.abs(cents) / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  };

  GOATkitWidget.prototype.formatTime = function(time24) {
    var parts = time24.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + m + ' ' + ampm;
  };

  GOATkitWidget.prototype.formatDate = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric' });
  };

  GOATkitWidget.prototype.formatDateShort = function(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    return {
      day: d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { timeZone: 'America/Toronto', month: 'short', day: 'numeric' })
    };
  };

  GOATkitWidget.prototype.formatDuration = function(mins) {
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return m ? h + ' hr ' + m + ' min' : h + ' hr';
  };

  GOATkitWidget.prototype.validatePostalCode = function(code) {
    return /^[A-Za-z]\\d[A-Za-z]\\s?\\d[A-Za-z]\\d$/.test(code.trim());
  };

  GOATkitWidget.prototype.normalizePostalCode = function(code) {
    var clean = code.replace(/\\s/g, '').toUpperCase();
    if (clean.length === 6) return clean.substring(0, 3) + ' ' + clean.substring(3);
    return clean;
  };

  // ═══════════════════════════════════════
  // STATE & NAVIGATION
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.computeSteps = function() {
    var steps = ['zip'];

    if (this.state.categories.length > 1) {
      steps.push('categories');
    }

    steps.push('services');

    if (this.state.serviceDetail && this.state.serviceDetail.modifiers) {
      for (var i = 0; i < this.state.serviceDetail.modifiers.length; i++) {
        steps.push('modifier_' + i);
      }
    }

    steps.push('datetime');
    steps.push('address');
    steps.push('contact');
    steps.push('success');

    return steps;
  };

  GOATkitWidget.prototype.getStepIndex = function() {
    var steps = this.computeSteps();
    var idx = steps.indexOf(this.state.currentStep);
    return idx >= 0 ? idx : 0;
  };

  GOATkitWidget.prototype.getProgressPercent = function() {
    var steps = this.computeSteps();
    var total = steps.length - 1;
    if (total <= 0) return 0;
    var idx = steps.indexOf(this.state.currentStep);
    if (this.state.currentStep === 'success') return 100;
    return Math.round((idx / (total - 1)) * 100);
  };

  GOATkitWidget.prototype.goToStep = function(stepId) {
    this.state.currentStep = stepId;
    this.state.stepHistory.push(stepId);
    this.state.error = null;
    this.onStepChange(stepId, this.getStepIndex());
    this.render();
  };

  GOATkitWidget.prototype.goBack = function() {
    if (this.state.stepHistory.length <= 1) return;
    this.state.stepHistory.pop();
    this.state.currentStep = this.state.stepHistory[this.state.stepHistory.length - 1];
    this.state.error = null;
    this.render();
  };

  GOATkitWidget.prototype.getRunningTotal = function() {
    var svc = this.state.selectedService;
    if (!svc) return 0;
    var total = svc.base_price_cents || 0;

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          total += (mod.price_adjustment_cents || 0);
        }
      }
    }

    if (this.state.selectedTimeslot && this.state.selectedTimeslot.price) {
      var priceDiff = this.state.selectedTimeslot.price - (svc.base_price_cents || 0);
      if (priceDiff !== 0) total += priceDiff;
    }

    return total;
  };

  GOATkitWidget.prototype.getEffectiveDuration = function() {
    var svc = this.state.selectedService;
    if (!svc) return 0;
    var dur = svc.base_duration_minutes || 0;

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          dur += (mod.duration_adjustment_minutes || 0);
        }
      }
    }
    return dur;
  };

  // ═══════════════════════════════════════
  // API
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.fetchApi = function(endpoint, options) {
    var self = this;
    var headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = 'Bearer ' + this.apiKey;

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 30000) : null;

    var fetchOpts = Object.assign({}, options || {}, { headers: headers });
    if (controller) fetchOpts.signal = controller.signal;

    return fetch(this.apiUrl + endpoint, fetchOpts)
      .then(function(res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) {
          return res.json().catch(function() { return { message: 'Request failed' }; }).then(function(err) {
            var msg = err.message || (typeof err.error === 'string' ? err.error : null) || 'Request failed';
            throw new Error(msg);
          });
        }
        return res.json();
      })
      .catch(function(err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Request timed out');
        throw err;
      });
  };

  // ═══════════════════════════════════════
  // RENDER CORE
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.render = function() {
    var el = document.getElementById(this.containerId);
    if (!el) return;

    if (this.state.currentStep === 'address' && document.getElementById('zbw-addr1')) {
      this.readAddressFromDOM();
    }
    if (this.state.currentStep === 'contact' && document.getElementById('zbw-fname')) {
      var fn = document.getElementById('zbw-fname');
      var ln = document.getElementById('zbw-lname');
      var em = document.getElementById('zbw-email');
      var ph = document.getElementById('zbw-phone');
      if (fn) this.state.contact.firstName = fn.value;
      if (ln) this.state.contact.lastName = ln.value;
      if (em) this.state.contact.email = em.value;
      if (ph) this.state.contact.phone = ph.value;
    }

    var step = this.state.currentStep;
    var isSuccess = step === 'success';

    var html = '<div class="zbw-root">';

    if (!isSuccess) {
      html += this.renderProgress();
    }

    html += '<div class="zbw-layout">';
    html += '<div class="zbw-main">';

    if (!isSuccess && this.state.selectedService) {
      html += this.renderMobileSummary();
    }

    html += this.renderCurrentStep();
    html += '</div>';

    if (!isSuccess && this.state.selectedService) {
      html += '<div class="zbw-sidebar">' + this.renderSidebar() + '</div>';
    }

    html += '</div></div>';

    el.innerHTML = html;

    var _stepChanged = (this.state.currentStep !== this._prevStep);
    this._prevStep = this.state.currentStep;
    if (!_stepChanged) {
      var _s = el.querySelector('.zbw-step');
      if (_s) _s.style.animation = 'none';
    }

    this.attachEvents();
  };

  GOATkitWidget.prototype.renderProgress = function() {
    var pct = this.getProgressPercent();
    var steps = this.computeSteps().filter(function(s) { return s !== 'success'; });
    var idx = this.getStepIndex();
    var stepNum = Math.min(idx + 1, steps.length);

    return '<div class="zbw-progress">' +
      '<div class="zbw-progress-bar"><div class="zbw-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="zbw-progress-text">Step ' + stepNum + ' of ' + steps.length + '</div>' +
      '</div>';
  };

  GOATkitWidget.prototype.renderSidebar = function() {
    var svc = this.state.selectedService;
    if (!svc) return '';

    var html = '<div class="zbw-summary-panel">';
    html += '<div class="zbw-summary-title">Order Summary</div>';
    html += '<div class="zbw-summary-service">' + this.esc(svc.name) + '</div>';

    html += '<div class="zbw-summary-item"><span>Base price</span><span>' + this.formatPrice(svc.base_price_cents) + '</span></div>';

    var detail = this.state.serviceDetail;
    if (detail && detail.modifiers) {
      for (var i = 0; i < detail.modifiers.length; i++) {
        var mod = detail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) {
          html += '<div class="zbw-summary-item mod"><span>' + this.esc(mod.name) + '</span><span>' + this.formatPriceDelta(mod.price_adjustment_cents) + '</span></div>';
        }
      }
    }

    if (this.state.selectedTimeslot) {
      var ts = this.state.selectedTimeslot;
      html += '<hr class="zbw-summary-divider">';
      html += '<div class="zbw-summary-detail">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        this.formatDate(ts.date) + ' at ' + this.formatTime(ts.start_time) +
        '</div>';
    }

    if (this.state.address.line1) {
      html += '<div class="zbw-summary-detail">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
        this.esc(this.state.address.line1) +
        '</div>';
    }

    html += '<hr class="zbw-summary-divider">';
    html += '<div class="zbw-summary-item"><span>Duration</span><span>' + this.formatDuration(this.getEffectiveDuration()) + '</span></div>';
    html += '<div class="zbw-summary-total"><span>Total</span><span>' + this.formatPrice(this.getRunningTotal()) + '</span></div>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.renderMobileSummary = function() {
    var total = this.formatPrice(this.getRunningTotal());
    return '<div class="zbw-mobile-summary">' +
      '<button class="zbw-mobile-summary-btn" data-action="toggleSummary">' +
      '<span>View Summary</span><strong>' + total + '</strong>' +
      '</button>' +
      (this.state.summaryExpanded ? '<div style="margin-top:8px">' + this.renderSidebar() + '</div>' : '') +
      '</div>';
  };

  GOATkitWidget.prototype.renderBackButton = function() {
    return '<button class="zbw-btn-back" data-action="back">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
      'Back</button>';
  };

  GOATkitWidget.prototype.esc = function(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };

  // ═══════════════════════════════════════
  // STEP ROUTER
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderCurrentStep = function() {
    var step = this.state.currentStep;
    if (step === 'zip') return this.renderZipStep();
    if (step === 'categories') return this.renderCategoriesStep();
    if (step === 'services') return this.renderServicesStep();
    if (step.indexOf('modifier_') === 0) {
      var idx = parseInt(step.split('_')[1], 10);
      return this.renderModifierStep(idx);
    }
    if (step === 'datetime') return this.renderDateTimeStep();
    if (step === 'address') return this.renderAddressStep();
    if (step === 'contact') return this.renderContactStep();
    if (step === 'success') return this.renderSuccessStep();
    return '';
  };

  // ═══════════════════════════════════════
  // STEP 1: ZIP CODE
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderZipStep = function() {
    var html = '<div class="zbw-step">';
    html += '<h2 class="zbw-step-title">Book Online</h2>';
    html += '<p class="zbw-step-desc">Enter your postal code to check availability in your area.</p>';

    if (this.state.error) {
      html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';
    }

    html += '<div class="zbw-form-group">';
    html += '<label for="zbw-postal">Postal Code</label>';
    html += '<input type="text" id="zbw-postal" class="zbw-input" maxlength="7" placeholder="K8N 1A1" autocomplete="postal-code" autocapitalize="characters" value="' + this.esc(this.state.postalCode) + '" />';
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="checkZip"' + (this.state.loading ? ' disabled' : '') + '>';
    html += this.state.loading ? 'Checking...' : 'Check Availability';
    html += '</button>';

    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleCheckZip = function() {
    var input = document.getElementById('zbw-postal');
    var code = input ? input.value.trim() : '';

    if (!code) {
      this.state.error = 'Please enter a postal code.';
      this.render();
      return;
    }

    if (!this.validatePostalCode(code)) {
      this.state.error = 'Please enter a valid Canadian postal code (e.g. K8N 1A1).';
      this.render();
      return;
    }

    var normalized = this.normalizePostalCode(code);
    this.state.postalCode = normalized;
    this.state.address.postalCode = normalized;
    this.state.loading = true;
    this.state.error = null;
    this.render();

    var self = this;

    this.fetchApi('/v1/scheduling/service_area_check?postal_code=' + encodeURIComponent(normalized))
      .then(function(result) {
        if (result.within_service_area && result.territory) {
          self.state.territory = result.territory;

          if (result.resolved_city) self.state.address.city = result.resolved_city;
          if (result.resolved_province) self.state.address.province = result.resolved_province;
          if (result.resolved_lat && result.resolved_lng) {
            self.state.postalLat = result.resolved_lat;
            self.state.postalLng = result.resolved_lng;
          }

          return self.loadServices();
        } else {
          self.state.loading = false;
          self.state.error = 'Sorry, we don\\u2019t currently service this area.';
          self.render();
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message || 'Something went wrong. Please try again.';
        self.render();
        self.onError(err);
      });
  };

  GOATkitWidget.prototype.loadServices = function() {
    var self = this;
    var tid = this.state.territory.id;

    return this.fetchApi('/v1/services?territory_id=' + tid + '&active=true')
      .then(function(result) {
        var services = result.services || result || [];
        self.state.services = services;

        var catMap = {};
        for (var i = 0; i < services.length; i++) {
          var s = services[i];
          if (s.category_id && s.category_name) {
            catMap[s.category_id] = s.category_name;
          }
        }
        var cats = [];
        for (var cid in catMap) {
          cats.push({ id: cid, name: catMap[cid] });
        }
        self.state.categories = cats;

        self.state.loading = false;

        if (cats.length > 1) {
          self.goToStep('categories');
        } else {
          if (cats.length === 1) {
            self.state.selectedCategory = cats[0].id;
          }
          self.goToStep('services');
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
        self.onError(err);
      });
  };

  // ═══════════════════════════════════════
  // STEP 2: CATEGORIES (conditional)
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderCategoriesStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">What do you need?</h2>';
    html += '<p class="zbw-step-desc">Select a category to view available services.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-cards">';
    for (var i = 0; i < this.state.categories.length; i++) {
      var cat = this.state.categories[i];
      var sel = this.state.selectedCategory === cat.id ? ' selected' : '';
      html += '<div class="zbw-card' + sel + '" data-action="selectCategory" data-id="' + cat.id + '">';
      html += '<div class="zbw-card-title">' + this.esc(cat.name) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmCategory"' + (!this.state.selectedCategory ? ' disabled' : '') + '>Continue</button>';
    html += '</div>';
    return html;
  };

  // ═══════════════════════════════════════
  // STEP 3: SERVICES
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderServicesStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Select a Service</h2>';
    html += '<p class="zbw-step-desc">Choose from our available services.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    if (this.state.loading) {
      html += '<div class="zbw-cards">';
      for (var k = 0; k < 3; k++) html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '</div>';
      html += '</div>';
      return html;
    }

    var filtered = this.state.services;
    if (this.state.selectedCategory) {
      filtered = filtered.filter(function(s) { return s.category_id === this.state.selectedCategory; }.bind(this));
    }

    html += '<div class="zbw-cards">';
    for (var i = 0; i < filtered.length; i++) {
      var svc = filtered[i];
      var sel = this.state.selectedService && this.state.selectedService.id === svc.id ? ' selected' : '';
      html += '<div class="zbw-card' + sel + '" data-action="selectService" data-id="' + svc.id + '">';
      html += '<div class="zbw-card-title">' + this.esc(svc.name) + '</div>';
      if (svc.description) html += '<div class="zbw-card-desc">' + this.esc(svc.description) + '</div>';
      html += '<div class="zbw-card-meta">';
      html += '<span class="zbw-card-price">' + this.formatPrice(svc.base_price_cents) + '</span>';
      html += '<span class="zbw-card-duration">' + this.formatDuration(svc.base_duration_minutes) + '</span>';
      html += '</div></div>';
    }
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmService"' + (!this.state.selectedService ? ' disabled' : '') + '>' + (this.state.loading ? 'Loading...' : 'Continue') + '</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleSelectService = function(serviceId) {
    var svc = this.state.services.find(function(s) { return s.id === serviceId; });
    if (!svc) return;
    var hadService = !!this.state.selectedService;
    this.state.selectedService = svc;
    this.state.modifierSelections = {};
    this.state.timeslots = [];
    this.state.selectedTimeslot = null;
    this.state.selectedDate = null;
    if (!hadService) {
      this.render();
    } else {
      this._toggleCards('selectService', serviceId, 'confirmService');
      this._refreshSidebar();
    }
  };

  GOATkitWidget.prototype.handleConfirmService = function() {
    if (!this.state.selectedService) return;
    var self = this;
    this.state.loading = true;
    this.render();

    this.fetchApi('/v1/services/' + this.state.selectedService.id)
      .then(function(detail) {
        self.state.serviceDetail = detail;
        self.state.loading = false;

        var modifiers = detail.modifiers || [];
        if (modifiers.length > 0) {
          self.goToStep('modifier_0');
        } else {
          self.goToStep('datetime');
        }
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
      });
  };

  // ═══════════════════════════════════════
  // STEP 4: MODIFIERS (1 per screen)
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderModifierStep = function(index) {
    var detail = this.state.serviceDetail;
    if (!detail || !detail.modifiers || !detail.modifiers[index]) return '';

    var mod = detail.modifiers[index];
    var isSelected = !!this.state.modifierSelections[mod.id];

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">' + this.esc(mod.name) + '</h2>';
    if (mod.description) html += '<p class="zbw-step-desc">' + this.esc(mod.description) + '</p>';

    html += '<div class="zbw-modifier-card' + (isSelected ? ' selected' : '') + '" data-action="toggleModifier" data-id="' + mod.id + '">';
    html += '<div class="zbw-modifier-name">' + this.esc(mod.name) + '</div>';
    html += '<div class="zbw-modifier-price">' + this.formatPriceDelta(mod.price_adjustment_cents) + '</div>';
    if (mod.duration_adjustment_minutes) {
      html += '<div style="font-size:13px;color:#64748b;margin-top:4px">+' + mod.duration_adjustment_minutes + ' min</div>';
    }
    html += '</div>';

    var nextStep;
    if (index + 1 < detail.modifiers.length) {
      nextStep = 'modifier_' + (index + 1);
    } else {
      nextStep = 'datetime';
    }

    if (mod.is_required && !isSelected) {
      html += '<button class="zbw-btn zbw-btn-primary" disabled>Select to continue</button>';
    } else {
      html += '<button class="zbw-btn zbw-btn-primary" data-action="nextModifier" data-next="' + nextStep + '">Continue</button>';
    }

    if (!mod.is_required && !isSelected) {
      html += '<button class="zbw-btn zbw-btn-secondary" data-action="nextModifier" data-next="' + nextStep + '">Skip</button>';
    }

    html += '</div>';
    return html;
  };

  // ═══════════════════════════════════════
  // STEP 5: DATE & TIME
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderDateTimeStep = function() {
    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Choose a Time</h2>';
    html += '<p class="zbw-step-desc">Select your preferred appointment date and time.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    if (this.state.loading) {
      html += '<div class="zbw-date-chips">';
      for (var k = 0; k < 5; k++) html += '<div class="zbw-skeleton zbw-skeleton-chip"></div>';
      html += '</div>';
      html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '<div class="zbw-skeleton zbw-skeleton-card"></div>';
      html += '</div>';
      return html;
    }

    if (this.state.timeslots.length === 0) {
      this.loadTimeslots();
      html += '<div style="text-align:center;padding:40px;color:#64748b">Loading available times...</div>';
      html += '</div>';
      return html;
    }

    var allDates = [];
    var byDate = {};
    for (var i = 0; i < this.state.timeslots.length; i++) {
      var t = this.state.timeslots[i];
      if (!t.available) continue;
      if (!byDate[t.date]) { byDate[t.date] = []; allDates.push(t.date); }
      byDate[t.date].push(t);
    }
    allDates.sort();

    var ws = this.state.dateWindowStart;
    var visibleDates = allDates.slice(ws, ws + 7);
    var selectedDate = this.state.selectedDate || (visibleDates.length > 0 ? visibleDates[0] : null);

    html += '<div class="zbw-date-chips">';
    html += '<button class="zbw-date-nav" data-action="dateNav" data-dir="-1"' + (ws <= 0 ? ' disabled' : '') + '>&lsaquo;</button>';

    for (var d = 0; d < visibleDates.length; d++) {
      var ds = this.formatDateShort(visibleDates[d]);
      var dsel = visibleDates[d] === selectedDate ? ' selected' : '';
      html += '<div class="zbw-date-chip' + dsel + '" data-action="selectDate" data-date="' + visibleDates[d] + '">';
      html += '<div class="zbw-date-day">' + ds.day + '</div>';
      html += '<div class="zbw-date-num">' + ds.date + '</div>';
      html += '</div>';
    }

    html += '<button class="zbw-date-nav" data-action="dateNav" data-dir="1"' + (ws + 7 >= allDates.length ? ' disabled' : '') + '>&rsaquo;</button>';
    html += '</div>';

    var slots = byDate[selectedDate] || [];
    if (slots.length === 0) {
      html += '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:14px">No availability on this date.</div>';
    } else {
      html += '<div class="zbw-timeslots">';
      for (var s = 0; s < slots.length; s++) {
        var sl = slots[s];
        var ssel = this.state.selectedTimeslot && this.state.selectedTimeslot.date === sl.date && this.state.selectedTimeslot.start_time === sl.start_time ? ' selected' : '';
        html += '<div class="zbw-timeslot' + ssel + '" data-action="selectTimeslot" data-date="' + sl.date + '" data-time="' + sl.start_time + '" data-price="' + (sl.price || 0) + '">';
        html += '<div class="zbw-timeslot-time">' + this.formatTime(sl.start_time) + '</div>';
        if (sl.price) html += '<div class="zbw-timeslot-price">' + this.formatPrice(sl.price) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmDatetime"' + (!this.state.selectedTimeslot ? ' disabled' : '') + '>Continue</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.loadTimeslots = function() {
    var self = this;
    self.state.loading = true;
    self.render();

    var today = new Date();
    var dateFrom = today.toISOString().split('T')[0];
    var end = new Date(today);
    end.setDate(end.getDate() + 14);
    var dateTo = end.toISOString().split('T')[0];
    var dur = this.getEffectiveDuration();

    var params = 'territory_id=' + this.state.territory.id +
      '&date_from=' + dateFrom +
      '&date_to=' + dateTo +
      '&duration_minutes=' + dur +
      '&service_id=' + this.state.selectedService.id;

    this.fetchApi('/v1/scheduling/timeslots?' + params)
      .then(function(result) {
        self.state.timeslots = result.timeslots || [];
        self.state.loading = false;
        self.state.selectedDate = null;
        self.state.selectedTimeslot = null;
        self.state.dateWindowStart = 0;
        self.render();
      })
      .catch(function(err) {
        self.state.loading = false;
        self.state.error = err.message;
        self.render();
      });
  };

  // ═══════════════════════════════════════
  // STEP 6: ADDRESS
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderAddressStep = function() {
    var a = this.state.address;
    var provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Service Address</h2>';
    html += '<p class="zbw-step-desc">Where should we come?</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-form-group zbw-ac-wrap"><label>Street Address *</label><input type="text" class="zbw-input" id="zbw-addr1" autocomplete="address-line1" value="' + this.esc(a.line1) + '" placeholder="Start typing your address..." /><div id="zbw-ac-list" class="zbw-ac-list"></div></div>';
    html += '<div class="zbw-form-group"><label>Apt / Unit</label><input type="text" class="zbw-input" id="zbw-addr2" autocomplete="address-line2" value="' + this.esc(a.line2) + '" /></div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>City *</label><input type="text" class="zbw-input" id="zbw-city" autocomplete="address-level2" value="' + this.esc(a.city) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Province *</label><input type="text" class="zbw-input" id="zbw-prov" autocomplete="address-level1" value="' + this.esc(a.province) + '" placeholder="ON" /></div>';
    html += '</div>';

    html += '<div class="zbw-form-group"><label>Postal Code *</label><input type="text" class="zbw-input" id="zbw-postal2" maxlength="7" autocomplete="postal-code" autocapitalize="characters" value="' + this.esc(a.postalCode) + '" /></div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="confirmAddress">Continue</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.readAddressFromDOM = function() {
    var line1 = (document.getElementById('zbw-addr1') || {}).value;
    var line2 = (document.getElementById('zbw-addr2') || {}).value;
    var city = (document.getElementById('zbw-city') || {}).value;
    var prov = (document.getElementById('zbw-prov') || {}).value;
    var postal = (document.getElementById('zbw-postal2') || {}).value;
    if (line1 !== undefined) this.state.address.line1 = line1.trim();
    if (line2 !== undefined) this.state.address.line2 = line2.trim();
    if (city !== undefined) this.state.address.city = city.trim();
    if (prov !== undefined) {
      var provMap = {'alberta':'AB','british columbia':'BC','manitoba':'MB','new brunswick':'NB','newfoundland and labrador':'NL','nova scotia':'NS','northwest territories':'NT','nunavut':'NU','ontario':'ON','prince edward island':'PE','quebec':'QC','saskatchewan':'SK','yukon':'YT'};
      var normalized = provMap[prov.toLowerCase().trim()] || prov.trim();
      this.state.address.province = normalized.length <= 2 ? normalized.toUpperCase() : normalized;
    }
    if (postal !== undefined) this.state.address.postalCode = postal.trim();
  };

  GOATkitWidget.prototype.handleConfirmAddress = function() {
    this.readAddressFromDOM();
    var a = this.state.address;

    if (!a.line1 || !a.city || !a.province || !a.postalCode) {
      this.state.error = 'Please fill in all required fields.';
      this.render();
      return;
    }
    this.goToStep('contact');
  };

  // ═══════════════════════════════════════
  // STEP 7: CONTACT + BOOK
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderContactStep = function() {
    var c = this.state.contact;

    var html = '<div class="zbw-step">';
    html += this.renderBackButton();
    html += '<h2 class="zbw-step-title">Almost Done!</h2>';
    html += '<p class="zbw-step-desc">Enter your contact info to complete your booking.</p>';

    if (this.state.error) html += '<div class="zbw-error">' + this.esc(this.state.error) + '</div>';

    html += '<div class="zbw-row">';
    html += '<div class="zbw-form-group"><label>First Name *</label><input type="text" class="zbw-input" id="zbw-fname" autocomplete="given-name" value="' + this.esc(c.firstName) + '" /></div>';
    html += '<div class="zbw-form-group"><label>Last Name *</label><input type="text" class="zbw-input" id="zbw-lname" autocomplete="family-name" value="' + this.esc(c.lastName) + '" /></div>';
    html += '</div>';
    html += '<div class="zbw-form-group"><label>Email *</label><input type="email" class="zbw-input" id="zbw-email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" value="' + this.esc(c.email) + '" placeholder="you@example.com" /></div>';
    html += '<div class="zbw-form-group"><label>Phone *</label><input type="tel" class="zbw-input" id="zbw-phone" autocomplete="tel" inputmode="tel" value="' + this.esc(c.phone) + '" placeholder="(555) 123-4567" /></div>';

    html += '<div class="zbw-form-group" style="margin-top:8px;">';
    html += '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;line-height:1.4;">';
    html += '<input type="checkbox" id="zbw-sms-consent"' + (this.state.smsConsent ? ' checked' : '') + ' style="margin-top:2px;flex-shrink:0;" />';
    html += '<span style="color:#666;">I agree to receive SMS updates about my booking (appointment reminders, status changes). Msg & data rates may apply. Reply STOP to opt out.</span>';
    html += '</label>';
    html += '</div>';

    html += '<button class="zbw-btn zbw-btn-primary" data-action="submitBooking"' + (this.state.loading ? ' disabled' : '') + '>' + (this.state.loading ? 'Booking...' : 'Book Now') + '</button>';
    html += '</div>';
    return html;
  };

  GOATkitWidget.prototype.handleSubmitBooking = function() {
    if (this.state.submitting) return;

    var fn = (document.getElementById('zbw-fname') || {}).value || '';
    var ln = (document.getElementById('zbw-lname') || {}).value || '';
    var em = (document.getElementById('zbw-email') || {}).value || '';
    var ph = (document.getElementById('zbw-phone') || {}).value || '';
    var smsEl = document.getElementById('zbw-sms-consent');
    var smsConsent = smsEl ? smsEl.checked : false;
    this.state.smsConsent = smsConsent;

    this.state.contact = { firstName: fn.trim(), lastName: ln.trim(), email: em.trim(), phone: ph.trim() };

    if (!fn.trim() || !ln.trim() || !em.trim() || !ph.trim()) {
      this.state.error = 'Please fill in all required fields.';
      this.render();
      return;
    }

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em.trim())) {
      this.state.error = 'Please enter a valid email address.';
      this.render();
      return;
    }

    this.state.loading = true;
    this.state.submitting = true;
    this.state.error = null;
    this.render();

    var self = this;
    var svc = this.state.selectedService;
    var ts = this.state.selectedTimeslot;
    var a = this.state.address;

    if (!svc || !ts || !ts.date) {
      this.state.loading = false;
      this.state.error = 'Please go back and select a service and time.';
      this.render();
      return;
    }
    if (!a.line1 || !a.city) {
      this.state.loading = false;
      this.state.error = 'Please go back and fill in your address.';
      this.render();
      return;
    }

    var selectedModIds = [];
    if (this.state.serviceDetail && this.state.serviceDetail.modifiers) {
      for (var i = 0; i < this.state.serviceDetail.modifiers.length; i++) {
        var mod = this.state.serviceDetail.modifiers[i];
        if (this.state.modifierSelections[mod.id]) selectedModIds.push(mod.id);
      }
    }

    this.fetchApi('/v1/bookings/create', {
      method: 'POST',
      body: JSON.stringify({
        first_name: fn.trim(),
        last_name: ln.trim(),
        email: em.trim(),
        phone: ph.trim() || null,
        sms_consent: smsConsent,
        address_line1: a.line1,
        address_line2: a.line2 || null,
        city: a.city,
        province: a.province,
        postal_code: a.postalCode,
        territory_id: self.state.territory.id,
        service_id: svc.id,
        scheduled_date: ts.date,
        scheduled_start_time: ts.start_time,
        duration_minutes: self.getEffectiveDuration(),
        selected_modifiers: selectedModIds,
        lat: a.lat || undefined,
        lng: a.lng || undefined
      })
    })
    .then(function(job) {
      self.state.jobId = job.id;
      self.state.loading = false;
      self.goToStep('success');
      self.onComplete({ jobId: job.id, service: svc.name, date: ts.date, time: ts.start_time });
    })
    .catch(function(err) {
      self.state.loading = false;
      self.state.submitting = false;
      self.state.error = err.message || 'Booking failed. Please try again.';
      self.render();
      self.onError(err);
    });
  };

  // ═══════════════════════════════════════
  // STEP 8: SUCCESS
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.renderSuccessStep = function() {
    var ts = this.state.selectedTimeslot;
    var svc = this.state.selectedService;
    var html = '<div class="zbw-success">';
    html += '<div class="zbw-success-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></div>';
    html += '<h2>Booking Confirmed!</h2>';
    html += '<p>Your appointment has been scheduled.</p>';
    if (svc) html += '<p style="font-weight:600;margin-top:12px">' + this.esc(svc.name) + '</p>';
    if (ts) html += '<p>' + this.formatDate(ts.date) + ' at ' + this.formatTime(ts.start_time) + '</p>';
    html += '<p style="color:#94a3b8;font-size:13px;margin-top:16px">Booking ID: ' + (this.state.jobId || '') + '</p>';
    if (this.state.contact.email) {
      html += '<p style="color:#64748b;font-size:13px">Confirmation sent to ' + this.esc(this.state.contact.email) + '</p>';
    }
    html += '</div>';
    return html;
  };

  // ═══════════════════════════════════════
  // TARGETED DOM UPDATES (no full re-render)
  // ═══════════════════════════════════════

  GOATkitWidget.prototype._toggleCards = function(action, selectedId, confirmAction) {
    var el = document.getElementById(this.containerId);
    if (!el) return;
    var cards = el.querySelectorAll('[data-action="' + action + '"]');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-id') === selectedId) cards[i].classList.add('selected');
      else cards[i].classList.remove('selected');
    }
    if (confirmAction) {
      var btn = el.querySelector('[data-action="' + confirmAction + '"]');
      if (btn) btn.disabled = !selectedId;
    }
  };

  GOATkitWidget.prototype._refreshSidebar = function() {
    var el = document.getElementById(this.containerId);
    if (!el) return;
    var sidebar = el.querySelector('.zbw-sidebar');
    if (sidebar) sidebar.innerHTML = this.renderSidebar();
    var mBtn = el.querySelector('.zbw-mobile-summary-btn strong');
    if (mBtn) mBtn.textContent = this.formatPrice(this.getRunningTotal());
  };

  GOATkitWidget.prototype._renderSlotsForDate = function(date) {
    var byDate = {};
    for (var i = 0; i < this.state.timeslots.length; i++) {
      var t = this.state.timeslots[i];
      if (!t.available) continue;
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    }
    var slots = byDate[date] || [];
    if (slots.length === 0) return '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:14px">No availability on this date.</div>';
    var html = '<div class="zbw-timeslots">';
    for (var s = 0; s < slots.length; s++) {
      var sl = slots[s];
      html += '<div class="zbw-timeslot" data-action="selectTimeslot" data-date="' + sl.date + '" data-time="' + sl.start_time + '" data-price="' + (sl.price || 0) + '">';
      html += '<div class="zbw-timeslot-time">' + this.formatTime(sl.start_time) + '</div>';
      if (sl.price) html += '<div class="zbw-timeslot-price">' + this.formatPrice(sl.price) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  };

  // ═══════════════════════════════════════
  // EVENT HANDLING
  // ═══════════════════════════════════════

  GOATkitWidget.prototype.attachEvents = function() {
    var self = this;
    var container = document.getElementById(this.containerId);
    if (!container) return;

    container.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');

      switch (action) {
        case 'checkZip': self.handleCheckZip(); break;
        case 'back': self.goBack(); break;
        case 'toggleSummary':
          self.state.summaryExpanded = !self.state.summaryExpanded;
          var sumContent = container.querySelector('.zbw-mobile-summary > div:last-child');
          if (self.state.summaryExpanded && !sumContent) {
            var wrap = container.querySelector('.zbw-mobile-summary');
            if (wrap) { var d = document.createElement('div'); d.style.marginTop = '8px'; d.innerHTML = self.renderSidebar(); wrap.appendChild(d); }
          } else if (!self.state.summaryExpanded && sumContent) {
            sumContent.remove();
          }
          break;
        case 'selectCategory':
          self.state.selectedCategory = target.getAttribute('data-id');
          self.state.selectedService = null;
          self.state.serviceDetail = null;
          self.state.modifierSelections = {};
          self._toggleCards('selectCategory', self.state.selectedCategory, 'confirmCategory');
          break;
        case 'confirmCategory':
          if (self.state.selectedCategory) self.goToStep('services');
          break;
        case 'selectService':
          self.handleSelectService(target.getAttribute('data-id'));
          break;
        case 'confirmService':
          self.handleConfirmService();
          break;
        case 'toggleModifier':
          var mid = target.getAttribute('data-id');
          self.state.modifierSelections[mid] = !self.state.modifierSelections[mid];
          self.render();
          break;
        case 'nextModifier':
          var next = target.getAttribute('data-next');
          self.goToStep(next);
          break;
        case 'dateNav':
          var dir = parseInt(target.getAttribute('data-dir'), 10);
          self.state.dateWindowStart = Math.max(0, self.state.dateWindowStart + dir * 7);
          self.render();
          break;
        case 'selectDate':
          self.state.selectedDate = target.getAttribute('data-date');
          self.state.selectedTimeslot = null;
          var allChips = container.querySelectorAll('[data-action="selectDate"]');
          for (var ci = 0; ci < allChips.length; ci++) {
            if (allChips[ci].getAttribute('data-date') === self.state.selectedDate) allChips[ci].classList.add('selected');
            else allChips[ci].classList.remove('selected');
          }
          var slotsContainer = container.querySelector('.zbw-timeslots') || container.querySelector('[style*="text-align:center"]');
          if (slotsContainer) {
            var wrap = slotsContainer.parentNode;
            var confirmBtn = container.querySelector('[data-action="confirmDatetime"]');
            slotsContainer.outerHTML = self._renderSlotsForDate(self.state.selectedDate);
            if (confirmBtn) confirmBtn.disabled = true;
          }
          break;
        case 'selectTimeslot':
          self.state.selectedTimeslot = {
            date: target.getAttribute('data-date'),
            start_time: target.getAttribute('data-time'),
            price: parseInt(target.getAttribute('data-price'), 10) || 0
          };
          var allSlots = container.querySelectorAll('[data-action="selectTimeslot"]');
          for (var si = 0; si < allSlots.length; si++) {
            if (allSlots[si] === target) allSlots[si].classList.add('selected');
            else allSlots[si].classList.remove('selected');
          }
          var dtBtn = container.querySelector('[data-action="confirmDatetime"]');
          if (dtBtn) dtBtn.disabled = false;
          self._refreshSidebar();
          break;
        case 'confirmDatetime':
          if (self.state.selectedTimeslot) self.goToStep('address');
          break;
        case 'confirmAddress':
          self.handleConfirmAddress();
          break;
        case 'submitBooking':
          self.handleSubmitBooking();
          break;
      }
    });

    var postalInput = container.querySelector('#zbw-postal');
    if (postalInput) {
      postalInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') self.handleCheckZip();
      });
      postalInput.focus();
    }

     var addrInput = container.querySelector('#zbw-addr1');
     if (addrInput) {
        addrInput.addEventListener('input', function() {
          var q = addrInput.value.trim();
          clearTimeout(self._acTimer);
          if (self._acAbort) { self._acAbort.abort(); self._acAbort = null; }
          var list = document.getElementById('zbw-ac-list');
          if (q.length < 3) { if (list) list.innerHTML = ''; return; }
          self._acTimer = setTimeout(function() {
            var ctrl = new AbortController();
            self._acAbort = ctrl;
            var prox = (self.state.postalLng && self.state.postalLat) ? self.state.postalLng + ',' + self.state.postalLat : 'ip';
            var base = String(self.apiUrl || '').replace(/[/]+$/, '');
            var endpoint = base + '/widget/address/search?q=' + encodeURIComponent(q) + '&proximity=' + encodeURIComponent(prox);
            fetch(endpoint, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } })
              .then(function(r) {
                if (!r.ok) throw new Error('Address lookup failed');
                return r.json();
              })
              .then(function(data) {
                self._acAbort = null;
                if (!list) return;
                var features = Array.isArray(data.features) ? data.features : [];
                if (!features.length) { list.innerHTML = ''; return; }
                list.innerHTML = features.map(function(f, i) {
                  var p = f.properties;
                  var ctx = p.context || {};
                  return '<div class="zbw-ac-item" data-ac-idx="' + i + '">' +
                    '<div class="zbw-ac-main">' + (p.name || '') + '</div>' +
                    '<div class="zbw-ac-sub">' + (ctx.place ? ctx.place.name + ', ' : '') + (ctx.region ? ctx.region.region_code + ' ' : '') + (ctx.postcode ? ctx.postcode.name : '') + '</div>' +
                    '</div>';
                }).join('');
                self._acFeatures = features;
              })
              .catch(function(err) {
                self._acAbort = null;
                if (err && err.name === 'AbortError') return;
                if (list) {
                  list.innerHTML = '<div class="zbw-ac-item" style="pointer-events:none;opacity:.8;"><div class="zbw-ac-main">Address autocomplete unavailable</div><div class="zbw-ac-sub">Please try again in a moment.</div></div>';
                }
              });
          }, 300);
        });

      addrInput.addEventListener('blur', function() {
        setTimeout(function() {
          var list = document.getElementById('zbw-ac-list');
          if (list) list.innerHTML = '';
        }, 200);
      });

      container.addEventListener('click', function(e) {
        var item = e.target.closest('.zbw-ac-item');
        if (!item || !self._acFeatures) return;
        var idx = parseInt(item.getAttribute('data-ac-idx'), 10);
        var f = self._acFeatures[idx];
        if (!f) return;
        var p = f.properties;
        var ctx = p.context || {};
        var addr1 = document.getElementById('zbw-addr1');
        var city = document.getElementById('zbw-city');
        var prov = document.getElementById('zbw-prov');
        var postal = document.getElementById('zbw-postal2');
        if (addr1) addr1.value = p.name || '';
        if (city) city.value = ctx.place ? ctx.place.name : '';
        if (prov) prov.value = ctx.region ? ctx.region.region_code : '';
        if (postal) postal.value = ctx.postcode ? ctx.postcode.name : '';
        if (f.geometry && f.geometry.coordinates) {
          self.state.address.lat = f.geometry.coordinates[1];
          self.state.address.lng = f.geometry.coordinates[0];
        }
        self.readAddressFromDOM();
        var list = document.getElementById('zbw-ac-list');
        if (list) list.innerHTML = '';
      });
    }
  };

  // ═══════════════════════════════════════
  // EXPOSE
  // ═══════════════════════════════════════

  window.GOATkitWidget = GOATkitWidget;

  if (typeof window.GOATkitConfig !== 'undefined') {
    window.goatkitInstance = new GOATkitWidget(window.GOATkitConfig);
  }
})();`;

export const BOOKING_WIDGET_POPUP = `(function() {
  var API_URL = 'https://api.unclebike.xyz';
  var PRIMARY_COLOR = '#2563eb';
  var loaded = false;
  var overlay = null;

  function getConfig() {
    return window.GOATkitPopupConfig || {};
  }

  function createOverlay() {
    if (overlay) return overlay;
    var cfg = getConfig();
    var apiUrl = cfg.apiUrl || API_URL;
    var color = cfg.primaryColor || PRIMARY_COLOR;

    overlay = document.createElement('div');
    overlay.id = 'zbw-popup-overlay';
    overlay.innerHTML = '<div id="zbw-popup-backdrop"></div>' +
      '<div id="zbw-popup-container">' +
        '<button id="zbw-popup-close" aria-label="Close">&times;</button>' +
        '<div id="zbw-popup-widget"></div>' +
      '</div>';

    var style = document.createElement('style');
    style.textContent = '#zbw-popup-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center}' +
      '#zbw-popup-overlay.zbw-open{display:flex}' +
      '#zbw-popup-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)}' +
      '#zbw-popup-container{position:relative;width:94vw;max-width:900px;max-height:min(90dvh,calc(100dvh - 24px));background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.2);overflow-y:auto;padding:24px;z-index:1}' +
      '#zbw-popup-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:28px;cursor:pointer;color:#64748b;z-index:2;line-height:1;padding:4px 8px;border-radius:8px;transition:background .15s}' +
      '#zbw-popup-close:hover{background:#f1f5f9;color:#0f172a}' +
      '@media(max-width:640px){#zbw-popup-container{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;padding:calc(16px + env(safe-area-inset-top,0px)) calc(12px + env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) calc(12px + env(safe-area-inset-left,0px))}}' +
      '[data-theme="dark"] #zbw-popup-backdrop{background:rgba(17,17,27,.7)}' +
      '[data-theme="dark"] #zbw-popup-container{background:#1e1e2e;box-shadow:0 24px 64px rgba(0,0,0,.5)}' +
      '[data-theme="dark"] #zbw-popup-close{color:#a6adc8}' +
      '[data-theme="dark"] #zbw-popup-close:hover{background:#313244;color:#cdd6f4}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    overlay.querySelector('#zbw-popup-backdrop').addEventListener('click', closePopup);
    overlay.querySelector('#zbw-popup-close').addEventListener('click', closePopup);

    if (!loaded) {
      window.GOATkitConfig = {
        apiUrl: apiUrl,
        containerId: 'zbw-popup-widget',
        primaryColor: color,
        onComplete: function(booking) {
          if (cfg.onComplete) cfg.onComplete(booking);
          setTimeout(closePopup, 2500);
        },
        onError: function(err) { if (cfg.onError) cfg.onError(err); },
        onStepChange: function(step, idx) { if (cfg.onStepChange) cfg.onStepChange(step, idx); }
      };
      var s = document.createElement('script');
      s.src = apiUrl + '/widget/booking-widget.js';
      document.body.appendChild(s);
      loaded = true;
    }

    return overlay;
  }

  function syncPopupViewport() {
    if (!overlay) return;
    var vv = window.visualViewport;
    var viewportHeight = vv ? vv.height : window.innerHeight;
    var viewportTop = vv ? vv.offsetTop : 0;
    var keyboardBottomInset = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
    overlay.style.top = viewportTop + 'px';
    overlay.style.bottom = keyboardBottomInset + 'px';
    var container = overlay.querySelector('#zbw-popup-container');
    if (container) {
      var h = Math.max(260, Math.floor(viewportHeight - 24));
      container.style.maxHeight = h + 'px';
    }
  }

  function openPopup() {
    var el = createOverlay();
    el.classList.add('zbw-open');
    document.body.style.overflow = 'hidden';
    syncPopupViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncPopupViewport);
      window.visualViewport.addEventListener('scroll', syncPopupViewport);
    }
    window.addEventListener('orientationchange', syncPopupViewport);

    if (window.goatkitInstance) {
      window.goatkitInstance.state.currentStep = 'zip';
      window.goatkitInstance.state.stepHistory = ['zip'];
      window.goatkitInstance.state.error = null;
      window.goatkitInstance.state.loading = false;
      window.goatkitInstance.state.submitting = false;
      window.goatkitInstance.render();
    }
  }

  function closePopup() {
    if (overlay) {
      overlay.classList.remove('zbw-open');
      document.body.style.overflow = '';
      overlay.style.top = '';
      overlay.style.bottom = '';
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncPopupViewport);
        window.visualViewport.removeEventListener('scroll', syncPopupViewport);
      }
      window.removeEventListener('orientationchange', syncPopupViewport);
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePopup();
  });

  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-zbw-open], .zbw-book-btn');
    if (el) { e.preventDefault(); openPopup(); }
  });

  window.GOATkitPopup = { open: openPopup, close: closePopup };

  var cfg = getConfig();
  if (cfg.floatingButton !== false) {
    var ready = function() {
      var btn = document.createElement('button');
      btn.id = 'zbw-floating-btn';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + (cfg.floatingButtonText || 'Book Now');
      var color = cfg.primaryColor || PRIMARY_COLOR;
      var s = document.createElement('style');
      s.textContent = '#zbw-floating-btn{position:fixed;bottom:24px;right:24px;z-index:9999;background:' + color + ';color:#fff;border:none;padding:14px 24px;border-radius:50px;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);transition:transform .15s,box-shadow .15s}' +
        '#zbw-floating-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.25)}' +
        '#zbw-floating-btn svg{flex-shrink:0}' +
        '@media(max-width:640px){#zbw-floating-btn{bottom:16px;right:16px;padding:12px 20px;font-size:14px}}' +
        '[data-theme="dark"] #zbw-floating-btn{box-shadow:0 4px 16px rgba(0,0,0,.4)}' +
        '[data-theme="dark"] #zbw-floating-btn:hover{box-shadow:0 6px 24px rgba(0,0,0,.5)}';
      document.head.appendChild(s);
      document.body.appendChild(btn);
      btn.addEventListener('click', openPopup);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
  }
})();`;

export const BOOKING_WIDGET_DEMO = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
  <title>Booking Widget Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
    .demo-header { text-align: center; margin-bottom: 32px; }
    .demo-header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
    .demo-header p { color: #64748b; font-size: 15px; }
    #goatkit-widget { width: 100%; max-width: 900px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 32px; }
    .demo-code { max-width: 900px; width: 100%; margin-top: 40px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
    .demo-code h3 { font-size: 16px; margin-bottom: 12px; color: #0f172a; }
    .demo-code pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="demo-header">
    <h1>Booking Widget</h1>
    <p>Embeddable booking widget for your website</p>
  </div>

  <div id="goatkit-widget"></div>

  <div class="demo-code">
    <h3>Embed on Your Site</h3>
    <pre><code>&lt;div id="goatkit-widget"&gt;&lt;/div&gt;

&lt;script&gt;
  window.GOATkitConfig = {
    apiUrl: 'https://api.unclebike.xyz',
    containerId: 'goatkit-widget',
    primaryColor: '#2563eb',
    onComplete: function(booking) {
      console.log('Booked:', booking);
    }
  };
&lt;/script&gt;
&lt;script src="https://api.unclebike.xyz/widget/booking-widget.js"&gt;&lt;/script&gt;</code></pre>
  </div>

  <script>
    window.GOATkitConfig = {
      apiUrl: window.location.origin,
      containerId: 'goatkit-widget',
      primaryColor: '#2563eb',
      onComplete: function(booking) {
        console.log('Booking completed:', booking);
      },
      onError: function(error) {
        console.error('Booking error:', error);
      },
      onStepChange: function(step, index) {
        console.log('Step:', step, 'Index:', index);
      }
    };
  </script>
  <script src="/widget/booking-widget.js"></script>
</body>
</html>`;
