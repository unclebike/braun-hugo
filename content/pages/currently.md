---
title: "What Uncle Bike is up to right now"
date: "2026-04-22T00:00:00.000Z"
draft: false
description: "Uncle Bike is out delivering the Tyendinaga Township cycling wayfinding project — 74 signs across five colour-coded loops, funded by the Ontario Trillium Foundation."
---

<p class="lead" style="font-size:1.8rem;line-height:1.5;color:var(--secondary-text-color);">Uncle Bike hasn't gone anywhere — he's just out doing cycling work of a different shape for a little while. Here's what's on the road.</p>

## The Tyendinaga Cycling Wayfinding Project

Tyendinaga Township is getting a purpose-built cycling wayfinding network: **74 signs across five colour-coded loop routes**, from a quick 14 km spin to a full-day 49 km ride through some of the quietest roads in the Bay of Quinte region. Every intersection is signed. Every turn is confirmed. Pick a colour and ride.

It's one of the first dedicated cycling wayfinding networks in the region — cycling tourism infrastructure built for real riders who want to explore without needing an app or a local guide. No data connection. No charged battery. Just signs, roads, and your bike.

### The five loops

<div style="margin:2.4rem 0;">
  <button type="button" id="ub-map-open" style="display:inline-flex;align-items:center;gap:0.8rem;padding:1.2rem 1.8rem;background:#228B22;color:#fff;border:0;border-radius:10px;font-family:inherit;font-size:1.6rem;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(34,139,34,0.3);">
    🗺️ Open the interactive wayfinding map
  </button>
</div>

<div id="ub-map-overlay" role="dialog" aria-modal="true" aria-label="Tyendinaga wayfinding map" style="display:none;position:fixed;inset:0;z-index:10010;background:rgba(17,17,27,0.85);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:2vh 2vw;">
  <div style="position:relative;width:100%;height:100%;max-width:1400px;background:#000;border-radius:14px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.5);">
    <button type="button" id="ub-map-close" aria-label="Close map" style="position:absolute;top:1rem;right:1rem;z-index:2;width:4.4rem;height:4.4rem;border-radius:50%;border:0;background:rgba(0,0,0,0.7);color:#fff;font-size:2.8rem;line-height:1;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3);">&times;</button>
    <iframe
      id="ub-map-iframe"
      title="Tyendinaga cycling wayfinding interactive map"
      loading="lazy"
      style="width:100%;height:100%;border:0;display:block;"
      allowfullscreen></iframe>
  </div>
</div>

<script>
(function() {
  var openBtn = document.getElementById('ub-map-open');
  var overlay = document.getElementById('ub-map-overlay');
  var closeBtn = document.getElementById('ub-map-close');
  var iframe = document.getElementById('ub-map-iframe');
  var SRC = 'https://boq.bike/tyendinaga-project/wayfinding_map';
  function open() {
    if (!iframe.src) iframe.src = SRC;
    overlay.style.display = 'flex';
    document.body.classList.add('ub-modal-open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.style.display = 'none';
    document.body.classList.remove('ub-modal-open');
    document.body.style.overflow = '';
  }
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && overlay.style.display === 'flex') close(); });
})();
</script>

| Route | Distance | Feel |
|---|---|---|
| Lonsdale Station | 13.7 km | Easy, welcoming |
| Weese | 20.5 km | Comfortable morning |
| Lonsdale | 27.6 km | Explore the network |
| Power | 30.2 km | Go deeper |
| Naphan | 48.7 km | The full commitment |

Warmer colours on the map for easy rides, cooler colours for longer ones. You can read the commitment level right off the sign.

### By the numbers

- **74** signs across the township
- **5** colour-coded loop routes
- **140+ km** of signed cycling roads
- **15** different township roads covered
- Every route a loop — no out-and-backs, no guessing how to get home

---

## What this means for Uncle Bike clients

While this project is in the ground, I'm **not booking new fitting or service clients**. I'll be back in the shop with open booking as soon as the signs are up and the network is live.

**If we've worked together before**, I'd still love to hear from you — tap the sticker in the corner of any page for my text line, or click any "Book" button on the site and we'll connect there.

**If you're new to Uncle Bike**, poke around, and drop your email into the "notify me" form and I'll let you know the moment bookings reopen. Thanks for waiting.

---

<p style="font-size:1.3rem;color:var(--tertiary-text-color);line-height:1.6;margin-top:3rem;">This project is funded by an Ontario Trillium Foundation Seed Grant and delivered through Explore Hastings County in partnership with Tyendinaga Township. The Ontario Trillium Foundation is an agency of the Government of Ontario.</p>
