(() => {
  "use strict";

  const WA_NUMBER = "233245361761";
  const PRODUCTS = window.KS_PRODUCTS;
  const CATS = window.KS_CATEGORIES;
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const catLabel = Object.fromEntries(CATS.map(c => [c.id, c.label]));

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = n => "₵" + n.toLocaleString("en-GH");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const metalLabel = m => (m === "silver" ? "Silver" : "Gold");
  const metalOptions = p => (p.metal === "both" ? ["gold", "silver"] : [p.metal]);
  const waLink = text => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  // ---------- Persistent state ----------
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode */ } }
  };
  // Drop anything that no longer exists in the catalogue.
  let cart = store.get("ks-cart", []).filter(l => byId[l.id]);
  let wish = store.get("ks-wish", []).filter(id => byId[id]);

  const state = { cat: "all", metal: "all", q: "", sort: "featured" };

  // ---------- Toast ----------
  const toastEl = $("#toast");
  let toastTimer;
  function toast(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }
  toastEl.addEventListener("click", e => {
    if (e.target.matches("[data-open-cart]")) { toastEl.classList.remove("show"); openPanel("cart"); }
  });

  // ---------- Badges ----------
  function updateBadges() {
    const set = (name, n) => {
      const b = $(`[data-count="${name}"]`);
      const changed = b.textContent !== String(n);
      b.textContent = n;
      b.hidden = n === 0;
      if (changed && n) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    };
    set("cart", cart.reduce((s, l) => s + l.qty, 0));
    set("wish", wish.length);
  }

  // ---------- Categories ----------
  function renderCategories() {
    $("#cat-cards").innerHTML = CATS.filter(c => c.id !== "all").map(c => {
      const n = PRODUCTS.filter(p => p.category === c.id).length;
      return `<button class="cat reveal" data-cat="${c.id}">
        <img loading="lazy" src="${c.img}" alt="">
        <span>${esc(c.label)}<small>${n} piece${n === 1 ? "" : "s"}</small></span>
      </button>`;
    }).join("");

    $("#chips").innerHTML = CATS.map(c => {
      const n = c.id === "all" ? PRODUCTS.length : PRODUCTS.filter(p => p.category === c.id).length;
      return `<button class="chip${c.id === state.cat ? " is-active" : ""}" role="tab" aria-selected="${c.id === state.cat}" data-chip="${c.id}">${esc(c.label)}<span class="n">${n}</span></button>`;
    }).join("");
  }

  function setCategory(cat, scroll) {
    state.cat = cat;
    $$("[data-chip]").forEach(b => {
      const on = b.dataset.chip === cat;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on);
    });
    renderGrid();
    if (scroll) $("#shop").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- Product grid ----------
  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = PRODUCTS.filter(p =>
      (state.cat === "all" || p.category === state.cat) &&
      (state.metal === "all" || p.metal === state.metal || p.metal === "both") &&
      (!q || `${p.name} ${p.desc} ${catLabel[p.category]} ${p.metal}`.toLowerCase().includes(q))
    );
    if (state.sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    if (state.sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  const heart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
  const dots = p => `<span class="dots">${metalOptions(p).map(m => `<i class="dot dot--${m}" title="${metalLabel(m)}"></i>`).join("")}</span>`;

  function renderGrid() {
    const list = filtered();
    $("#grid").innerHTML = list.map((p, i) => {
      const on = wish.includes(p.id);
      return `<article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms">
        <div class="card__media">
          <button class="card__img" data-view="${p.id}" aria-label="View ${esc(p.name)}">
            <img loading="lazy" src="${p.img}" alt="${esc(p.name)}">
            ${p.tag ? `<span class="card__tag">${esc(p.tag)}</span>` : ""}
          </button>
          <button class="card__wish${on ? " is-on" : ""}" data-wish="${p.id}" aria-pressed="${on}" aria-label="${on ? "Remove from" : "Save to"} wishlist">${heart}</button>
          <button class="card__quick" data-add="${p.id}">Add to bag</button>
        </div>
        <div class="card__body">
          <div>
            <h3 class="card__name">${esc(p.name)}</h3>
            <div class="card__meta">${esc(catLabel[p.category])}${dots(p)}</div>
          </div>
          <span class="card__price">${money(p.price)}</span>
        </div>
      </article>`;
    }).join("");
    $("#empty").hidden = list.length > 0;
    $("#result-count").textContent = `Showing ${list.length} of ${PRODUCTS.length} pieces`;
  }

  // ---------- Cart ----------
  function addToCart(id, metal, qty = 1) {
    const p = byId[id];
    metal = metal || metalOptions(p)[0];
    const line = cart.find(l => l.id === id && l.metal === metal);
    if (line) line.qty += qty; else cart.push({ id, metal, qty });
    saveCart();
    toast(`<span>Added <strong>${esc(p.name)}</strong> to your bag</span><button data-open-cart>View bag</button>`);
  }
  function saveCart() { store.set("ks-cart", cart); renderCart(); updateBadges(); }

  function renderCart() {
    const body = $("#cart-items");
    $("#cart-foot").hidden = cart.length === 0;
    if (!cart.length) {
      body.innerHTML = `<div class="drawer-empty"><h3>Your bag is empty</h3><p>Find something that makes you shine.</p><a href="#shop" class="btn btn--dark" data-close>Start shopping</a></div>`;
      return;
    }
    body.innerHTML = cart.map((l, i) => {
      const p = byId[l.id];
      return `<div class="line">
        <img src="${p.img}" alt="">
        <div>
          <h3>${esc(p.name)}</h3>
          <div class="muted">${metalLabel(l.metal)} · ${money(p.price)}</div>
          <div class="line__qty">
            <button data-line="${i}" data-d="-1" aria-label="Decrease quantity">−</button>
            <span>${l.qty}</span>
            <button data-line="${i}" data-d="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="line__side">
          <strong>${money(p.price * l.qty)}</strong>
          <button class="line__rm" data-rm="${i}">Remove</button>
        </div>
      </div>`;
    }).join("");
    $("#cart-total").textContent = money(cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0));
  }

  $("#cart-items").addEventListener("click", e => {
    const d = e.target.closest("[data-d]");
    const rm = e.target.closest("[data-rm]");
    if (d) {
      const l = cart[+d.dataset.line];
      l.qty += +d.dataset.d;
      if (l.qty < 1) cart.splice(+d.dataset.line, 1);
      saveCart();
    } else if (rm) {
      cart.splice(+rm.dataset.rm, 1);
      saveCart();
    }
  });

  $("#checkout").addEventListener("click", () => {
    const lines = cart.map(l => {
      const p = byId[l.id];
      return `• ${l.qty} × ${p.name} (${metalLabel(l.metal)}) — ${money(p.price * l.qty)}`;
    });
    const total = cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    const note = $("#cart-note").value.trim();
    const msg = [
      "Hi KS Jewels! ✨ I'd like to order:",
      "",
      ...lines,
      "",
      `Subtotal: ${money(total)}`,
      note ? `\nNote: ${note}` : "",
      "",
      "Please confirm availability and delivery. Thank you!"
    ].join("\n").replace(/\n{3,}/g, "\n\n");
    window.open(waLink(msg), "_blank", "noopener");
  });

  // ---------- Wishlist ----------
  function toggleWish(id) {
    const i = wish.indexOf(id);
    if (i > -1) wish.splice(i, 1); else wish.push(id);
    store.set("ks-wish", wish);
    const on = i === -1;
    $$(`[data-wish="${id}"]`).forEach(b => {
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", `${on ? "Remove from" : "Save to"} wishlist`);
    });
    if (modalId === id) $("#pm-wish").classList.toggle("is-on", on);
    if (on) toast(`<span>Saved <strong>${esc(byId[id].name)}</strong> to your wishlist</span>`);
    renderWish();
    updateBadges();
  }

  function renderWish() {
    const body = $("#wish-items");
    if (!wish.length) {
      body.innerHTML = `<div class="drawer-empty"><h3>No favourites yet</h3><p>Tap the heart on any piece to save it here.</p><a href="#shop" class="btn btn--dark" data-close>Browse pieces</a></div>`;
      return;
    }
    body.innerHTML = wish.map(id => {
      const p = byId[id];
      return `<div class="line">
        <img src="${p.img}" alt="">
        <div><h3>${esc(p.name)}</h3><div class="muted">${money(p.price)}</div></div>
        <div class="line__side">
          <button class="line__add" data-add="${p.id}">Add to bag</button>
          <button class="line__rm" data-wish="${p.id}">Remove</button>
        </div>
      </div>`;
    }).join("");
  }

  // ---------- Panels / overlays ----------
  const scrim = $(".scrim");
  let openEl = null;
  let lastFocus = null;

  function openPanel(name) {
    closeAll(true);
    toastEl.classList.remove("show");
    const el = name === "search" ? $("#search-overlay") : name === "product" ? $("#product-modal") : name === "lightbox" ? $("#lightbox") : $("#" + name);
    lastFocus = document.activeElement;
    openEl = el;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("show"));
    document.body.classList.add("locked");
    const focusTarget = name === "search" ? $("#quick-search") : el.querySelector("[data-close]") || el;
    setTimeout(() => focusTarget.focus(), 60);
  }

  function closeAll(silent) {
    if (!openEl) return;
    openEl.classList.remove("open");
    openEl.setAttribute("aria-hidden", "true");
    if (openEl.id === "lightbox") setTimeout(() => { $("#lightbox-stage").innerHTML = ""; }, 300);
    openEl = null;
    scrim.classList.remove("show");
    setTimeout(() => { if (!openEl) scrim.hidden = true; }, 300);
    document.body.classList.remove("locked");
    if (!silent && lastFocus) lastFocus.focus();
  }

  scrim.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAll();
    if (e.key === "/" && !openEl && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault(); openPanel("search");
    }
  });
  // Close when clicking outside a modal card / lightbox media.
  $("#product-modal").addEventListener("click", e => { if (e.target.id === "product-modal") closeAll(); });
  $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox" || e.target.id === "lightbox-stage") closeAll(); });

  // ---------- Product modal ----------
  let modalId = null;
  let modalQty = 1;
  let modalMetal = "gold";

  function openProduct(id) {
    const p = byId[id];
    modalId = id; modalQty = 1; modalMetal = metalOptions(p)[0];
    $("#pm-img").src = p.img;
    $("#pm-img").alt = p.name;
    $(".modal__img").classList.remove("zoom");
    $("#pm-cat").textContent = catLabel[p.category];
    $("#pm-title").textContent = p.name;
    $("#pm-price").textContent = money(p.price);
    $("#pm-desc").textContent = p.desc;
    $("#pm-qty").textContent = 1;
    $("#pm-metal").innerHTML = metalOptions(p).map(m =>
      `<button class="${m === modalMetal ? "is-active" : ""}" data-metal-pick="${m}"><i class="dot dot--${m}"></i>${metalLabel(m)}</button>`).join("");
    $("#pm-wish").classList.toggle("is-on", wish.includes(id));
    updateModalWa();
    openPanel("product");
  }
  function updateModalWa() {
    const p = byId[modalId];
    $("#pm-wa").href = waLink(`Hi KS Jewels! I'm interested in the ${p.name} (${metalLabel(modalMetal)}, ${money(p.price)}). Is it available?`);
  }

  $("#product-modal").addEventListener("click", e => {
    const q = e.target.closest("[data-qty]");
    const m = e.target.closest("[data-metal-pick]");
    if (q) { modalQty = Math.max(1, Math.min(20, modalQty + +q.dataset.qty)); $("#pm-qty").textContent = modalQty; }
    if (m) {
      modalMetal = m.dataset.metalPick;
      $$("[data-metal-pick]").forEach(b => b.classList.toggle("is-active", b === m));
      updateModalWa();
    }
  });
  $(".modal__img").addEventListener("click", e => e.currentTarget.classList.toggle("zoom"));
  $(".modal__img").addEventListener("mousemove", e => {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.querySelector("img").style.transformOrigin =
      `${((e.clientX - box.left) / box.width) * 100}% ${((e.clientY - box.top) / box.height) * 100}%`;
  });
  $("#pm-add").addEventListener("click", () => { addToCart(modalId, modalMetal, modalQty); closeAll(); });
  $("#pm-wish").addEventListener("click", () => toggleWish(modalId));

  // ---------- Quick search overlay ----------
  function renderQuick(q) {
    q = q.trim().toLowerCase();
    const res = q ? PRODUCTS.filter(p => `${p.name} ${p.desc} ${catLabel[p.category]}`.toLowerCase().includes(q)) : PRODUCTS.filter(p => p.tag);
    $("#quick-results").innerHTML =
      `<p class="qr-hint">${q ? `${res.length} result${res.length === 1 ? "" : "s"}` : "Popular right now"}</p>` +
      res.slice(0, 12).map(p => `<button class="qr" data-view="${p.id}"><img src="${p.img}" alt=""><span>${esc(p.name)}</span><small>${money(p.price)}</small></button>`).join("");
  }
  $("#quick-search").addEventListener("input", e => renderQuick(e.target.value));
  $("#quick-search").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      state.q = e.target.value; $("#search").value = state.q;
      closeAll(true);
      setCategory("all", true);
    }
  });

  // ---------- Global click delegation ----------
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-view],[data-add],[data-wish],[data-open],[data-close],[data-cat],[data-chip],[data-metal],[data-full],.reel");
    if (!t) return;
    if (t.dataset.view) { openProduct(t.dataset.view); return; }
    if (t.dataset.add) { addToCart(t.dataset.add); return; }
    if (t.dataset.wish) { toggleWish(t.dataset.wish); return; }
    if (t.dataset.open) { openPanel(t.dataset.open); if (t.dataset.open === "search") renderQuick($("#quick-search").value); return; }
    if (t.hasAttribute("data-close")) { closeAll(t.tagName === "A"); return; }
    if (t.dataset.cat) { setCategory(t.dataset.cat, true); return; }
    if (t.dataset.chip) { setCategory(t.dataset.chip); return; }
    if (t.dataset.metal) {
      state.metal = t.dataset.metal;
      $$("[data-metal]").forEach(b => b.classList.toggle("is-active", b === t));
      renderGrid(); return;
    }
    if (t.dataset.full) { showMedia(`<img src="${t.dataset.full}" alt="${esc(t.querySelector("img").alt)}">`); return; }
    if (t.classList.contains("reel")) {
      showMedia(`<video src="${t.dataset.video}" autoplay controls playsinline loop></video>`);
    }
  });

  function showMedia(html) {
    $("#lightbox-stage").innerHTML = html;
    openPanel("lightbox");
  }

  // ---------- Shop controls ----------
  let searchTimer;
  $("#search").addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120);
  });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });
  $("#reset").addEventListener("click", () => {
    Object.assign(state, { cat: "all", metal: "all", q: "", sort: "featured" });
    $("#search").value = ""; $("#sort").value = "featured";
    $$("[data-metal]").forEach(b => b.classList.toggle("is-active", b.dataset.metal === "all"));
    setCategory("all");
  });

  // ---------- Reels: preview on hover / when in view ----------
  const canHover = matchMedia("(hover: hover)").matches;
  $$(".reel").forEach(r => {
    const v = r.querySelector("video");
    const play = () => { v.play().then(() => r.classList.add("playing")).catch(() => {}); };
    const stop = () => { v.pause(); r.classList.remove("playing"); };
    if (canHover) { r.addEventListener("mouseenter", play); r.addEventListener("mouseleave", stop); }
  });
  if (!canHover && "IntersectionObserver" in window) {
    // On touch devices, autoplay the reel previews while they're on screen.
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const r = en.target, v = r.querySelector("video");
      if (en.isIntersecting) v.play().then(() => r.classList.add("playing")).catch(() => {});
      else { v.pause(); r.classList.remove("playing"); }
    }), { threshold: .6 });
    $$(".reel").forEach(r => io.observe(r));
  }

  // ---------- Header / nav ----------
  const header = $(".header");
  const menuBtn = $(".menu-toggle");
  addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 10), { passive: true });
  menuBtn.addEventListener("click", () => {
    const open = $("#mobile-nav").classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  $$("#mobile-nav a").forEach(a => a.addEventListener("click", () => {
    $("#mobile-nav").classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false");
  }));

  // Highlight the nav link for the section in view.
  if ("IntersectionObserver" in window) {
    const links = $$(".nav a");
    const spy = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    ["collections", "shop", "reels", "lookbook", "visit"].forEach(id => spy.observe(document.getElementById(id)));
  }

  // ---------- Reveal on scroll ----------
  function initReveal() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: .12 });
    els.forEach(el => io.observe(el));
  }

  // ---------- Init ----------
  $("#year").textContent = new Date().getFullYear();
  renderCategories();
  renderGrid();
  renderCart();
  renderWish();
  updateBadges();
  initReveal();
})();
