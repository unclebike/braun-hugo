/* --- Named handlers for proper cleanup --- */
function _onRadiusMilesInput() { updateRadius(); }
function _onRadiusLatChange() { updateRadius(); }
function _onRadiusLngChange() { updateRadius(); }

/* --- iOS focus + scroll stabilization --- */
var _focusScrollTimer = null;

function isIOSDevice() {
  var ua = navigator.userAgent || '';
  var touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || touchMac;
}

function isTextEntryElement(el) {
  if (!el) return false;
  var tag = (el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  var type = String(el.type || 'text').toLowerCase();
  var allow = {
    text: true,
    search: true,
    email: true,
    tel: true,
    url: true,
    password: true,
    number: true,
    date: true,
    time: true,
    'datetime-local': true,
    month: true,
    week: true,
  };
  return Boolean(allow[type]);
}

function getScrollableAncestor(el) {
  var node = el ? el.parentElement : null;
  while (node && node !== document.body && node !== document.documentElement) {
    var style = window.getComputedStyle(node);
    var canScrollY = /(auto|scroll)/.test(style.overflowY || '') && node.scrollHeight > node.clientHeight;
    if (canScrollY) return node;
    node = node.parentElement;
  }
  return null;
}

function centerFocusedField(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return;
  var scrollParent = getScrollableAncestor(el);
  if (scrollParent) {
    var parentRect = scrollParent.getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    var nextTop = scrollParent.scrollTop + (rect.top - parentRect.top) - (parentRect.height / 2) + (rect.height / 2);
    scrollParent.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    return;
  }
  try {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  } catch {
    el.scrollIntoView();
  }
}

function scheduleFocusCentering(el, delayMs) {
  if (_focusScrollTimer) clearTimeout(_focusScrollTimer);
  _focusScrollTimer = setTimeout(function() {
    centerFocusedField(el);
    _focusScrollTimer = null;
  }, delayMs);
}

function setAttrIfMissing(el, key, value) {
  if (!el || !key || value == null) return;
  if (el.hasAttribute(key) && String(el.getAttribute(key) || '').trim() !== '') return;
  el.setAttribute(key, value);
}

function inferInputHints(el) {
  if (!el || !el.tagName) return;
  var tag = el.tagName.toUpperCase();
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
  var type = String(el.getAttribute('type') || 'text').toLowerCase();
  if (type === 'hidden' || type === 'checkbox' || type === 'radio' || type === 'file' || type === 'button' || type === 'submit') return;

  var id = String(el.getAttribute('id') || '').toLowerCase();
  var name = String(el.getAttribute('name') || '').toLowerCase();
  var key = (name || id).replace(/-/g, '_');

  if (type === 'email' || key.indexOf('email') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'email');
    setAttrIfMissing(el, 'inputmode', 'email');
    setAttrIfMissing(el, 'autocapitalize', 'off');
    setAttrIfMissing(el, 'spellcheck', 'false');
  }

  if (type === 'tel' || key.indexOf('phone') !== -1 || key.indexOf('mobile') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'tel');
    setAttrIfMissing(el, 'inputmode', 'tel');
    setAttrIfMissing(el, 'autocapitalize', 'off');
    setAttrIfMissing(el, 'spellcheck', 'false');
  }

  if (key === 'first_name') setAttrIfMissing(el, 'autocomplete', 'given-name');
  if (key === 'last_name') setAttrIfMissing(el, 'autocomplete', 'family-name');

  if (key.indexOf('address_line1') !== -1 || key.indexOf('address_line_1') !== -1 || key.indexOf('street') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'address-line1');
  }
  if (key.indexOf('address_line2') !== -1 || key.indexOf('address_line_2') !== -1 || key.indexOf('apt') !== -1 || key.indexOf('suite') !== -1 || key.indexOf('unit') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'address-line2');
  }
  if (key.indexOf('address_city') !== -1 || key === 'city') setAttrIfMissing(el, 'autocomplete', 'address-level2');
  if (key.indexOf('address_state') !== -1 || key.indexOf('province') !== -1 || key === 'state') setAttrIfMissing(el, 'autocomplete', 'address-level1');
  if (key.indexOf('country') !== -1) setAttrIfMissing(el, 'autocomplete', 'country-name');

  if (key.indexOf('postal') !== -1 || key.indexOf('zip') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'postal-code');
    setAttrIfMissing(el, 'autocapitalize', 'characters');
  }

  if (key === 'q' || key.indexOf('search') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'off');
    setAttrIfMissing(el, 'inputmode', 'search');
    setAttrIfMissing(el, 'autocapitalize', 'off');
    setAttrIfMissing(el, 'spellcheck', 'false');
  }

  if (type === 'number') {
    var step = String(el.getAttribute('step') || '').trim();
    var mode = step && step !== '1' && step !== '0' ? 'decimal' : 'numeric';
    setAttrIfMissing(el, 'inputmode', mode);
  }

  if (type === 'password' || key.indexOf('token') !== -1 || key.indexOf('secret') !== -1) {
    setAttrIfMissing(el, 'autocomplete', 'off');
    setAttrIfMissing(el, 'autocapitalize', 'off');
    setAttrIfMissing(el, 'spellcheck', 'false');
  }
}

function applyFormInputHints(scope) {
  var root = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
  var fields = root.querySelectorAll('input, textarea, select');
  for (var i = 0; i < fields.length; i++) {
    inferInputHints(fields[i]);
  }
}

document.addEventListener('focusin', function(e) {
  var target = e.target;
  if (!isIOSDevice() || !isTextEntryElement(target)) return;
  scheduleFocusCentering(target, 90);
}, true);

document.addEventListener('focusout', function() {
  if (_focusScrollTimer) {
    clearTimeout(_focusScrollTimer);
    _focusScrollTimer = null;
  }
}, true);

document.addEventListener('invalid', function(e) {
  var target = e.target;
  if (!target || !isTextEntryElement(target)) return;
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
  if (isIOSDevice()) scheduleFocusCentering(target, 120);
}, true);

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

       // Unambiguous: one value is clearly longitude (> 90).
       if (ax > 90 && ax <= 180 && ay <= 90) return [y, x];
       if (ay > 90 && ay <= 180 && ax <= 90) return [x, y];

       // Common case for our territories (CA/US): lat > 0, lng < 0.
       if ((x < 0 && y > 0) || (x > 0 && y < 0)) {
         var lat = x > 0 ? x : y;
         var lng = x < 0 ? x : y;
         if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return [lat, lng];
       }

       // Default: assume [lat, lng] (what Leaflet emits when we save).
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

function setGpsButtonState(btn, label, disabled) {
  if (!btn) return;
  if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent || 'Use Current Location';
  btn.disabled = !!disabled;
  if (label) btn.textContent = label;
  if (disabled) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}

function renderAddressMessage(resultsSelector, message) {
  var resultsEl = document.querySelector(resultsSelector || '#address-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div class="search-results"><div class="search-item text-muted-foreground">' + message + '</div></div>';
}

function reverseLookupCurrentLocation(lat, lng, inputSelector, resultsSelector) {
  var url = '/admin/api/address/reverse?lat=' + encodeURIComponent(String(lat)) + '&lng=' + encodeURIComponent(String(lng));
  return fetch(url, { headers: { 'HX-Request': 'true' } })
    .then(function(response) {
      if (!response.ok) throw new Error('Lookup failed');
      return response.text();
    })
    .then(function(html) {
      var resultsEl = document.querySelector(resultsSelector || '#address-results');
      if (!resultsEl) return;
      resultsEl.innerHTML = html;
      var first = resultsEl.querySelector('.address-result');
      var input = document.querySelector(inputSelector || '#addr-line1');
      if (first && input) {
        var line1 = first.getAttribute('data-line1') || '';
        if (line1) input.value = line1;
      }
    });
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-address-gps-btn]');
  if (!btn) return;
  e.preventDefault();

  var inputSelector = btn.getAttribute('data-address-input') || '#addr-line1';
  var resultsSelector = btn.getAttribute('data-address-results') || '#address-results';
  var latSelector = btn.getAttribute('data-address-lat') || '#addr-lat';
  var lngSelector = btn.getAttribute('data-address-lng') || '#addr-lng';
  var latEl = document.querySelector(latSelector);
  var lngEl = document.querySelector(lngSelector);

  if (!navigator.geolocation) {
    renderAddressMessage(resultsSelector, 'Geolocation is not supported on this device.');
    return;
  }

  setGpsButtonState(btn, 'Locating...', true);
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos && pos.coords ? pos.coords.latitude : null;
      var lng = pos && pos.coords ? pos.coords.longitude : null;
      if (lat == null || lng == null) {
        renderAddressMessage(resultsSelector, 'Could not read your location.');
        setGpsButtonState(btn, btn.dataset.defaultText, false);
        return;
      }
      if (latEl) latEl.value = String(lat);
      if (lngEl) lngEl.value = String(lng);

      setGpsButtonState(btn, 'Finding nearby addresses...', true);
      reverseLookupCurrentLocation(lat, lng, inputSelector, resultsSelector)
        .catch(function() {
          renderAddressMessage(resultsSelector, 'Unable to look up nearby addresses.');
        })
        .finally(function() {
          setGpsButtonState(btn, btn.dataset.defaultText, false);
        });
    },
    function(err) {
      var code = err && typeof err.code === 'number' ? err.code : 0;
      if (code === 1) renderAddressMessage(resultsSelector, 'Location permission denied. Allow location access and try again.');
      else if (code === 2) renderAddressMessage(resultsSelector, 'Location unavailable right now.');
      else if (code === 3) renderAddressMessage(resultsSelector, 'Location request timed out. Try again.');
      else renderAddressMessage(resultsSelector, 'Could not get your current location.');
      setGpsButtonState(btn, btn.dataset.defaultText, false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});

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
    var ids = {
      'addr-line1': d.line1,
      'wizard-address': d.line1,
      'address_line1': d.line1,
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

document.addEventListener('htmx:afterSettle', function() { setTimeout(initMaps, 50); });
document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); });

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

var _smsThreadModalRestore = null;
var _smsThreadModalPrevOverflow = null;

function isSmsThreadModalOpen() {
  var overlay = document.getElementById('sms-thread-modal-overlay');
  return !!(overlay && overlay.getAttribute('data-open') === 'true' && !overlay.hidden);
}

function lockBodyScrollForModal() {
  if (_smsThreadModalPrevOverflow) return;
  _smsThreadModalPrevOverflow = {
    bodyOverflow: document.body.style.overflow || '',
    htmlOverflow: document.documentElement.style.overflow || '',
  };
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function unlockBodyScrollForModal() {
  if (!_smsThreadModalPrevOverflow) return;
  document.body.style.overflow = _smsThreadModalPrevOverflow.bodyOverflow;
  document.documentElement.style.overflow = _smsThreadModalPrevOverflow.htmlOverflow;
  _smsThreadModalPrevOverflow = null;
}

function setSmsThreadModalTitle(text) {
  var overlay = document.getElementById('sms-thread-modal-overlay');
  if (!overlay) return;
  var titleEl = overlay.querySelector('#sms-thread-modal-header h3');
  if (!titleEl) return;
  titleEl.textContent = text || 'Conversation';
}

function syncSmsThreadModalTitleFromContent() {
  var overlay = document.getElementById('sms-thread-modal-overlay');
  if (!overlay) return;
  var phoneEl = overlay.querySelector('#sms-thread-modal-content [data-sms-thread-phone]');
  if (!phoneEl) return;
  var t = String(phoneEl.textContent || '').trim();
  if (t) setSmsThreadModalTitle(t);
}

function openSmsThreadModalOverlay() {
  var overlay = document.getElementById('sms-thread-modal-overlay');
  if (!overlay) return false;
  overlay.hidden = false;
  overlay.setAttribute('data-open', 'true');
  overlay.style.display = 'flex';
  lockBodyScrollForModal();
  return true;
}

function closeSmsThreadModalOverlay() {
  var overlay = document.getElementById('sms-thread-modal-overlay');
  if (!overlay) return;
  var content = document.getElementById('sms-thread-modal-content');
  var restored = false;

  if (_smsThreadModalRestore && _smsThreadModalRestore.panel && _smsThreadModalRestore.placeholder) {
    try {
      if (document.body.contains(_smsThreadModalRestore.placeholder)) {
        _smsThreadModalRestore.placeholder.parentNode.insertBefore(_smsThreadModalRestore.panel, _smsThreadModalRestore.placeholder);
        _smsThreadModalRestore.placeholder.remove();
        restored = true;
      }
    } catch {
    }
    _smsThreadModalRestore = null;
    if (!restored && content) {
      content.innerHTML = '';
    }
  } else if (content) {
    content.innerHTML = '';
  }

  overlay.setAttribute('data-open', 'false');
  overlay.style.display = 'none';
  overlay.hidden = true;
  unlockBodyScrollForModal();
}

function moveSmsThreadPanelIntoModal(panelEl) {
  var content = document.getElementById('sms-thread-modal-content');
  var placeholder = null;
  if (!panelEl || !content) return;
  if (panelEl.closest && panelEl.closest('#sms-thread-modal-content')) return;
  if (_smsThreadModalRestore) return;

  placeholder = document.createElement('div');
  placeholder.setAttribute('data-sms-thread-modal-placeholder', '1');
  panelEl.parentNode.insertBefore(placeholder, panelEl);

  _smsThreadModalRestore = { panel: panelEl, placeholder: placeholder };
  content.innerHTML = '';
  content.appendChild(panelEl);

  syncSmsThreadModalTitleFromContent();
  requestAnimationFrame(scrollSmsThreadToBottom);
  requestAnimationFrame(focusSmsComposerWithRetries);
}

document.addEventListener('click', function(e) {
  var target = e && e.target ? e.target : null;
  var closeBtn = target && target.closest ? target.closest('[data-sms-thread-modal-close]') : null;
  var overlay = target && target.id === 'sms-thread-modal-overlay' ? target : null;
  if (closeBtn) {
    e.preventDefault();
    closeSmsThreadModalOverlay();
    return;
  }
  if (overlay && isSmsThreadModalOpen()) {
    closeSmsThreadModalOverlay();
    return;
  }
}, true);

document.addEventListener('keydown', function(e) {
  if (!e || e.key !== 'Escape') return;
  if (!isSmsThreadModalOpen()) return;
  closeSmsThreadModalOverlay();
});

document.addEventListener('click', function(e) {
  var target = e && e.target ? e.target : null;
  var opener = target && target.closest ? target.closest('[data-sms-thread-modal-open]') : null;
  var mode = opener ? String(opener.getAttribute('data-sms-thread-modal-open') || '').trim() : '';
  var panelEl = null;
  var content = document.getElementById('sms-thread-modal-content');
  if (!opener) return;
  e.preventDefault();
  e.stopPropagation();
  if (!openSmsThreadModalOverlay()) return;

  if (mode === 'move') {
    panelEl = opener.closest('#sms-thread-panel') || document.getElementById('sms-thread-panel');
    if (panelEl) {
      setSmsThreadModalTitle('Conversation');
      moveSmsThreadPanelIntoModal(panelEl);
    }
    return;
  }

  setSmsThreadModalTitle('Conversation');
  if (content) {
    content.innerHTML = '<div class="text-sm text-muted-foreground" style="padding:12px;">Loading conversation…</div>';
  }
}, true);

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
  if (target.id === 'sms-thread-modal-content') {
    requestAnimationFrame(scrollSmsThreadToBottom);
    requestAnimationFrame(syncSmsThreadModalTitleFromContent);
    requestAnimationFrame(focusSmsComposerWithRetries);
    return;
  }
  if (target.id === 'page-content') {
    if (isSmsThreadModalOpen()) {
      closeSmsThreadModalOverlay();
    }
    requestAnimationFrame(function() {
      requestAnimationFrame(scrollSmsThreadToBottom);
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  requestAnimationFrame(function() {
    requestAnimationFrame(scrollSmsThreadToBottom);
  });
  applyFormInputHints(document);
});

document.addEventListener('htmx:afterSwap', function(e) {
  var target = e && e.detail ? e.detail.target : null;
  applyFormInputHints(target || document);
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

(document.readyState === 'loading' 
  ? document.addEventListener('DOMContentLoaded', function() { setTimeout(initMaps, 100); })
  : setTimeout(initMaps, 100)
);

function toggleTheme() {
  var c = document.documentElement.getAttribute('data-theme');
  var next = c === 'dark' ? 'light' : 'dark';
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
