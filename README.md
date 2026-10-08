# KS Jewels — website

A fast, mobile-first static storefront for **KS Jewels** (Accra, Ghana · [@ksj_ewels](https://instagram.com/ksj_ewels)).

**Live site:** https://japheth-l.github.io/ks-jewels/

## Features
- Hero with a looping showroom video, plus category cards and a marquee
- Shop with category chips, gold/silver filter, live search and sorting
- Product quick-view with gold/silver choice, quantity and click-to-zoom
- Bag and wishlist, saved in the browser
- **WhatsApp checkout**: the bag becomes a ready-to-send order message to 024 536 1761
- Reels (hover or tap to play), a lookbook lightbox, FAQ/care guide and a floating WhatsApp button
- Accessible: keyboard friendly (`/` opens search, `Esc` closes overlays), respects reduced motion

## Editing products & prices
Everything lives in [`js/products.js`](js/products.js): name, category, metal (`gold` / `silver` / `both`), price in cedis, photo and description.

> Ring prices (₵70–₵95) come from Instagram. **All other prices are placeholders.** Confirm them with the shop before launch.

Photos are in `assets/img/`, and videos with their poster frames are in `assets/video/`.

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy
GitHub Pages serves the `gh-pages` branch. To publish changes from `main`:
```bash
git push origin main:gh-pages
```
