---
title: "Message Uncle Bike"
date: "2025-03-30T21:59:18.000Z"
draft: false
tags:
description: ""
menu:
  main:
    name: "Contact"
    weight: 5
---

<div class="kg-card kg-callout-card kg-callout-card-white"><div class="kg-callout-emoji">📬</div><div class="kg-callout-text">We check our messages Monday to Friday. We respond to messages in under 24 hours. Thanks for reaching out. </div></div>

<script src="/js/forms.js"></script>
<form id="contact-form" accept-charset="utf-8" onsubmit="return submitContactForm(event)">
<fieldset>
<label for="first-name">First Name</label>
<input type="text" name="first-name" id="first-name" placeholder="e.g. John" required>
<label for="last-name">Last Name</label>
<input type="text" name="last-name" id="last-name" placeholder="e.g. Doe" required>
<label for="cell-number">Cell Number</label>
<input type="text" name="cell-number" id="cell-number" placeholder="e.g. 123-456-7890" required>
<label for="email-address">Email</label>
<input type="email" name="email" id="email-address" placeholder="email@example.com" required>
<label for="postal-code">Postal Code</label>
<input type="text" name="postal-code" id="postal-code" placeholder="e.g. A1B 2C3" required>
<label for="reason">Reason for reaching out</label>
<select name="reason" id="reason" required>
<option value="">Select a reason</option>
<option value="bike fitting">Bike Fitting</option>
<option value="repair">Repair Request</option>
<option value="inquiry">General Question</option>
<option value="other">Other</option>
</select>
<label for="message">Leave a message</label>
<textarea rows="9" name="message" id="message" placeholder="Your message…" required></textarea>
</fieldset>
<div id="contact-status" style="display:none; margin-bottom: 12px; padding: 12px; border-radius: 6px;"></div>
<input type="submit" class="button button-primary" value="Send" id="contact-submit">
</form>
