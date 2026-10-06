(() => {
  const catalogEl = document.getElementById("catalog");
  const emptyEl = document.getElementById("empty");
  const statsEl = document.getElementById("stats");
  const qEl = document.getElementById("q");
  const catChips = document.getElementById("cat-chips");
  const priceChips = document.getElementById("price-chips");
  const resetBtn = document.getElementById("reset");

  let entries = [];
  let activeCat = "All";
  let activePrice = "All";

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const score = (n) => (n == null ? "—" : String(n));

  function buildChips(el, values, active, onPick) {
    el.innerHTML = "";
    ["All", ...values].forEach((v) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = v;
      b.setAttribute("aria-pressed", String(v === active));
      b.addEventListener("click", () => onPick(v));
      el.appendChild(b);
    });
  }

  function carouselHtml(shots, title) {
    if (!shots || !shots.length) {
      return `<div class="carousel" aria-label="No screenshot"><div class="ph">No screenshot</div></div>`;
    }
    const imgs = shots
      .map(
        (src, i) =>
          `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)} screenshot ${i + 1}" loading="lazy" decoding="async" ${i === 0 ? "" : 'hidden'} data-i="${i}" />`
      )
      .join("");
    const nav =
      shots.length > 1
        ? `<div class="nav">
            <button type="button" data-dir="-1" aria-label="Previous screenshot">‹</button>
            <button type="button" data-dir="1" aria-label="Next screenshot">›</button>
          </div>
          <div class="dots">${shots
            .map((_, i) => `<button type="button" class="dot" data-dot="${i}" aria-label="Screenshot ${i + 1}" ${i === 0 ? 'aria-current="true"' : ""}></button>`)
            .join("")}</div>`
        : "";
    return `<div class="carousel" data-count="${shots.length}" data-idx="0">${imgs}${nav}</div>`;
  }

  function rowHtml(e) {
    const link = e.url
      ? `<a class="btn primary" href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">Open link</a>`
      : `<span class="btn" aria-disabled="true">No link</span>`;
    const what = e.what ? `<p class="what">${escapeHtml(e.what)}</p>` : "";
    return `<article class="row" data-id="${escapeHtml(e.id)}">
      ${carouselHtml(e.screenshots, e.title)}
      <div class="meta">
        <div class="title-row">
          <h2>${escapeHtml(e.title)}</h2>
          <span class="badge">${escapeHtml(e.category)}</span>
        </div>
        <div class="price">${escapeHtml(e.price || "Price unknown")}</div>
        <div class="scores" aria-label="Scores">
          <div class="score"><span>Stylization</span><b>${score(e.stylization)}</b></div>
          <div class="score"><span>Painterly</span><b>${score(e.painterly)}</b></div>
          <div class="score"><span>Mobile</span><b>${score(e.mobile)}</b></div>
        </div>
        ${what}
        <div class="actions">${link}</div>
      </div>
    </article>`;
  }

  function filtered() {
    const q = (qEl.value || "").trim().toLowerCase();
    return entries.filter((e) => {
      if (activeCat !== "All" && e.category !== activeCat) return false;
      if (activePrice !== "All" && e.priceBucket !== activePrice) return false;
      if (!q) return true;
      const hay = [e.title, e.category, e.price, e.where, e.what, e.section]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  function render() {
    const list = filtered();
    const withImg = list.filter((e) => e.screenshots && e.screenshots.length).length;
    statsEl.textContent = `${list.length} shown · ${withImg} with images · ${entries.length} total`;
    catalogEl.setAttribute("aria-busy", "false");
    if (!list.length) {
      catalogEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    catalogEl.innerHTML = list.map(rowHtml).join("");
  }

  catalogEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    const car = btn.closest(".carousel");
    if (!car) return;
    const imgs = [...car.querySelectorAll("img")];
    if (imgs.length < 2) return;
    let idx = Number(car.dataset.idx || 0);
    if (btn.dataset.dir) idx = (idx + Number(btn.dataset.dir) + imgs.length) % imgs.length;
    if (btn.dataset.dot != null) idx = Number(btn.dataset.dot);
    car.dataset.idx = String(idx);
    imgs.forEach((img, i) => {
      img.hidden = i !== idx;
    });
    car.querySelectorAll(".dot").forEach((d, i) => {
      if (i === idx) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  });

  qEl.addEventListener("input", () => render());
  resetBtn.addEventListener("click", () => {
    activeCat = "All";
    activePrice = "All";
    qEl.value = "";
    initChips();
    render();
  });

  let cats = [];
  let prices = [];

  function initChips() {
    buildChips(catChips, cats, activeCat, (v) => {
      activeCat = v;
      initChips();
      render();
    });
    buildChips(priceChips, prices, activePrice, (v) => {
      activePrice = v;
      initChips();
      render();
    });
  }

  fetch("./catalog.json")
    .then((r) => {
      if (!r.ok) throw new Error("catalog.json " + r.status);
      return r.json();
    })
    .then((data) => {
      entries = data.entries || [];
      cats = [...new Set(entries.map((e) => e.category).filter(Boolean))].sort();
      const preferred = ["Free", "Paid", "Free / Paid", "Other", "Unknown"];
      const present = new Set(entries.map((e) => e.priceBucket));
      prices = preferred.filter((p) => present.has(p));
      initChips();
      render();
    })
    .catch((err) => {
      statsEl.textContent = "Failed to load catalog";
      catalogEl.innerHTML = `<p style="color:#fca5a5">Could not load catalog.json (${escapeHtml(err.message)}).</p>`;
    });
})();
