var UB_API = 'https://api.unclebike.xyz/v1/messages/submit';

function showStatus(el, text, success) {
  el.textContent = text;
  el.style.display = 'block';
  el.style.background = success ? '#f0fdf4' : '#fef2f2';
  el.style.color = success ? '#166534' : '#991b1b';
}

function submitContactForm(e) {
  e.preventDefault();
  var form = document.getElementById('contact-form');
  var btn = document.getElementById('contact-submit');
  var status = document.getElementById('contact-status');
  btn.disabled = true;
  btn.value = 'Sending\u2026';
  status.style.display = 'none';

  var payload = {
    source: 'contact',
    first_name: form.querySelector('#first-name').value.trim(),
    last_name: form.querySelector('#last-name').value.trim(),
    email: form.querySelector('#email-address').value.trim(),
    phone: form.querySelector('#cell-number').value.trim(),
    postal_code: form.querySelector('#postal-code').value.trim(),
    reason: form.querySelector('#reason').value,
    body: form.querySelector('#message').value.trim()
  };

  fetch(UB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) {
    if (!r.ok) throw new Error('Failed');
    showStatus(status, '\u2713 Message sent! We\'ll get back to you within 24 hours.', true);
    form.reset();
  }).catch(function() {
    showStatus(status, 'Something went wrong. Please try again or email us directly.', false);
  }).finally(function() {
    btn.disabled = false;
    btn.value = 'Send';
  });
  return false;
}

function submitRegForm(e) {
  e.preventDefault();
  var btn = document.getElementById('reg-submit');
  var status = document.getElementById('reg-status');
  btn.disabled = true;
  btn.value = 'Sending\u2026';
  status.style.display = 'none';

  var payload = {
    source: 'registration',
    first_name: document.getElementById('reg-first-name').value.trim(),
    last_name: document.getElementById('reg-last-name').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    phone: document.getElementById('reg-phone').value.trim(),
    postal_code: document.getElementById('reg-postal').value.trim(),
    metadata: {
      street_address: document.getElementById('reg-street').value.trim(),
      apt_suite: document.getElementById('reg-apt').value.trim(),
      city: document.getElementById('reg-city').value.trim(),
      province: document.getElementById('reg-province').value.trim(),
      country: document.getElementById('reg-country').value,
      company: document.getElementById('reg-company').value.trim(),
      other: document.getElementById('reg-other').value.trim()
    }
  };

  fetch(UB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) {
    if (!r.ok) throw new Error('Failed');
    showStatus(status, '\u2713 Registration received! We\'ll be in touch shortly to set up your profile.', true);
    document.getElementById('reg-form').reset();
  }).catch(function() {
    showStatus(status, 'Something went wrong. Please try again or email us directly.', false);
  }).finally(function() {
    btn.disabled = false;
    btn.value = 'Send';
  });
  return false;
}

function submitNewsletter(e) {
  e.preventDefault();
  var btn = document.getElementById('nl-submit');
  var status = document.getElementById('nl-status');
  var msg = document.getElementById('nl-msg');
  var emailEl = document.getElementById('nl-email');
  btn.disabled = true;
  btn.textContent = 'Subscribing\u2026';

  fetch(UB_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'newsletter', email: emailEl.value.trim() })
  }).then(function(r) {
    if (!r.ok) throw new Error('Failed');
    msg.textContent = '\u2713 You\'re subscribed! Thanks for signing up.';
    msg.style.color = '';
    status.style.display = 'block';
    emailEl.value = '';
  }).catch(function() {
    msg.textContent = 'Something went wrong. Please try again.';
    msg.style.color = '#991b1b';
    status.style.display = 'block';
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  });
  return false;
}
