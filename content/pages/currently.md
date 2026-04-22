---
title: "What Uncle Bike is up to right now"
date: "2026-04-22T00:00:00.000Z"
draft: false
description: "Uncle Bike is out delivering the Tyendinaga Township cycling wayfinding project — 74 signs across five colour-coded loops, funded by the Ontario Trillium Foundation."
---

<p class="currently-lead">Uncle Bike hasn't gone anywhere — he's just out doing cycling work of a different shape for a little while. Here's what's on the road.</p>

## The Tyendinaga Cycling Wayfinding Project

Tyendinaga Township is getting a purpose-built cycling wayfinding network: **74 signs across five colour-coded loop routes**, from a quick 14 km spin to a full-day 49 km ride through some of the quietest roads in the Bay of Quinte region. Every intersection is signed. Every turn is confirmed. Pick a colour and ride.

It's one of the first dedicated cycling wayfinding networks in the region — cycling tourism infrastructure built for real riders who want to explore without needing an app or a local guide. No data connection. No charged battery. Just signs, roads, and your bike.

### The five loops

<div class="currently-map-trigger">
  <button type="button" id="ub-map-open" class="button button-primary">
    <span aria-hidden="true">🗺️</span> Open the interactive wayfinding map
  </button>
</div>

<div id="ub-map-overlay" role="dialog" aria-modal="true" aria-label="Tyendinaga wayfinding map" class="currently-map-overlay">
  <div class="currently-map-card">
    <button type="button" id="ub-map-close" aria-label="Close map" class="currently-map-close">&times;</button>
    <iframe
      id="ub-map-iframe"
      title="Tyendinaga cycling wayfinding interactive map"
      loading="lazy"
      class="currently-map-iframe"
      allowfullscreen></iframe>
  </div>
</div>

<style>
  .currently-lead {
    font-size: clamp(1.6rem, 1.3rem + 0.6vw, 1.9rem);
    line-height: 1.5;
    color: var(--secondary-text-color);
    text-wrap: pretty;
  }

  .currently-map-trigger {
    margin: 2.4rem 0;
  }

  .currently-funder {
    font-size: 1.3rem;
    color: var(--tertiary-text-color);
    line-height: 1.6;
    margin-top: 3rem;
  }

  .currently-map-overlay {
    position: fixed;
    inset: 0;
    z-index: 10010;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 2vh 2vw;
    background: color-mix(in oklch, var(--background-base, #000) 82%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .currently-map-overlay.is-active { display: flex; }

  .currently-map-card {
    position: relative;
    width: 100%;
    height: 100%;
    max-width: 1400px;
    background: var(--background-color);
    border-radius: var(--radii-large, 14px);
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }

  .currently-map-iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  .currently-map-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 2;
    width: 4.4rem;
    height: 4.4rem;
    border-radius: 50%;
    border: 0;
    background: color-mix(in oklch, var(--background-base, #000) 75%, transparent);
    color: var(--primary-text-color);
    font-size: 2.8rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: background-color .15s ease;
  }
  .currently-map-close:hover,
  .currently-map-close:focus-visible {
    background: color-mix(in oklch, var(--brand-color) 40%, var(--background-base, #000));
  }
</style>

<script>
(function () {
  var openBtn = document.getElementById('ub-map-open');
  var overlay = document.getElementById('ub-map-overlay');
  var closeBtn = document.getElementById('ub-map-close');
  var iframe = document.getElementById('ub-map-iframe');
  var SRC = 'https://boq.bike/tyendinaga-project/wayfinding_map';
  function open() {
    if (!iframe.src) iframe.src = SRC;
    overlay.classList.add('is-active');
    document.body.classList.add('ub-modal-open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('is-active');
    document.body.classList.remove('ub-modal-open');
    document.body.style.overflow = '';
  }
  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-active')) close();
  });
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

<p class="currently-funder">This project is funded by an Ontario Trillium Foundation Seed Grant and delivered through Explore Hastings County in partnership with Tyendinaga Township. The Ontario Trillium Foundation is an agency of the Government of Ontario.</p>
