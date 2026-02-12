---
title: "Register a New Customer Profile:"
date: "2025-03-30T22:49:18.000Z"
draft: false
tags:

description: ""
---

<div class="kg-card kg-callout-card kg-callout-card-accent"><div class="kg-callout-emoji">🤩</div><div class="kg-callout-text">Welcome to Uncle Bike! Thanks for confirming your account. We just need a few more details to create your customer profile in our booking system and plan your next repair. We'll be in touch as soon as your submission is complete. Thanks again!</div></div>

<script src="/js/forms.js"></script>
<form id="reg-form" accept-charset="utf-8" onsubmit="return submitRegForm(event)">
<fieldset>
<label for="reg-first-name">First Name</label>
<input type="text" id="reg-first-name" placeholder="Enter your first name" required>
<label for="reg-last-name">Last Name</label>
<input type="text" id="reg-last-name" placeholder="Enter your last name" required>
<label for="reg-email">Email Address</label>
<input type="email" id="reg-email" placeholder="Enter your email" required>
<label for="reg-phone">Phone Number</label>
<input type="text" id="reg-phone" placeholder="Enter your phone number" required>
<label for="reg-country">Country</label>
<select id="reg-country" required>
<option value="canada">Canada</option>
</select>
<label for="reg-street">Street Address</label>
<input type="text" id="reg-street" placeholder="Enter your street address" required>
<label for="reg-apt">Apt./Suite</label>
<input type="text" id="reg-apt" placeholder="Apt or suite number">
<label for="reg-city">City</label>
<input type="text" id="reg-city" placeholder="Enter your city" required>
<label for="reg-province">Province</label>
<input type="text" id="reg-province" placeholder="Enter your province" required>
<label for="reg-postal">Postal Code</label>
<input type="text" id="reg-postal" placeholder="Enter your postal code" required>
<label for="reg-other">Other</label>
<input type="text" id="reg-other" placeholder="Anything else?">
<label for="reg-company">Company</label>
<input type="text" id="reg-company" placeholder="Company name (optional)">
</fieldset>
<div id="reg-status" style="display:none; margin-bottom: 12px; padding: 12px; border-radius: 6px;"></div>
<input type="submit" class="button button-primary" value="Send" id="reg-submit">
</form>
