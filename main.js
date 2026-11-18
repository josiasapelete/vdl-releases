// Détecte le système du visiteur et relie les boutons aux fichiers de la dernière version GitHub.

(() => {
  const cfg = window.VDL_CONFIG || {};
  const releasesPage = `https://github.com/${cfg.repo}/releases/latest`;
  const $ = (sel) => document.querySelector(sel);

  // ---------------------------------------------------------------- système du visiteur
  function detectOS() {
    const ua = navigator.userAgent;
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) return "ios";
    if (/mac/i.test(platform) || /macintosh/i.test(ua)) return "mac";
    if (/win/i.test(platform) || /windows/i.test(ua)) return "windows";
    return "other";
  }

  const LABELS = {
    windows: "Télécharger pour Windows",
    android: "Télécharger pour Android",
    mac: "Bientôt sur Mac",
    ios: "Pas encore disponible sur iPhone",
    other: "Télécharger VDL",
  };
  const MAIN_ASSET = { windows: "setup", android: "apk" };

  const os = detectOS();
  const card = document.querySelector(`.platform[data-os="${os}"]`);
  if (card) card.classList.add("current");

  // Windows : le Microsoft Store est conseillé (sans alerte SmartScreen, mises à jour automatiques)
  const viaStore = os === "windows" && !!cfg.msStore;
  if (viaStore) LABELS.windows = "Installer depuis le Microsoft Store";
  $("#main-label").textContent = LABELS[os];
  if (os === "mac" || os === "ios") $("#main-dl").classList.add("disabled");
  if (viaStore) {
    $("#main-dl").target = "_blank";
    $("#main-dl").rel = "noopener";
  }

  // Sous le bouton Store : pourquoi il est conseillé, et l'installeur classique en second choix
  function storeMeta(setup, version) {
    const meta = $("#main-meta");
    meta.textContent = [version && `Version ${version}`, "Recommandé : sans alerte de Windows, mises à jour automatiques · "]
      .filter(Boolean).join(" · ");
    const a = document.createElement("a");
    a.href = cfg.licenseApi ? `${cfg.licenseApi}/dl/setup` : setup ? setup.url : releasesPage;
    a.textContent = "ou télécharger l'installeur" + (setup ? ` (${(setup.size / 1048576).toFixed(0)} Mo)` : "");
    meta.append(a);
  }
  if (viaStore) storeMeta(null, "");

  if (cfg.contact) $("#contact-link").href = `mailto:${cfg.contact}`;

  // ---------------------------------------------------------------- tarifs (carte/PayPal ou Mobile Money)
  const showPrices = (pay) => {
    document.querySelectorAll(".pay-toggle button").forEach((b) => b.classList.toggle("on", b.dataset.pay === pay));
    document.querySelectorAll(".price-row").forEach((row) => {
      const plan = row.dataset.plan;
      const price = pay === "mm" ? row.dataset.xof : row.dataset.card;
      row.classList.toggle("hidden", !price);
      const amount = row.querySelector(".amount");
      amount.textContent = price || "";
      // Carte : équivalent en dollars indicatif pour les visiteurs hors zone FCFA
      if (pay === "card" && row.dataset.usd) amount.insertAdjacentHTML("beforeend", ` <small class="approx">${row.dataset.usd}</small>`);
      const buy = row.querySelector(".buy");
      const link = pay === "mm"
        ? (cfg.licenseApi ? `${cfg.licenseApi}/buy/mobile?plan=${encodeURIComponent(plan)}` : "")
        // Sans lien Lemon Squeezy : carte (GeniusPay) ou PayPal (XPAYE), prix Mobile Money majoré
        : (cfg.checkout || {})[plan] || (cfg.licenseApi ? `${cfg.licenseApi}/buy/mobile?plan=${encodeURIComponent(plan)}&intl=1` : "");
      buy.href = link || "#tarifs";
      buy.classList.toggle("disabled", !link);
      buy.textContent = link ? "Acheter" : "Bientôt";
    });
  };
  document.querySelectorAll(".pay-toggle button").forEach((b) => b.addEventListener("click", () => showPrices(b.dataset.pay)));
  // Afrique de l'Ouest et centrale (fuseau horaire) : Mobile Money proposé d'abord
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  showPrices(/^Africa\/(Lome|Abidjan|Porto-Novo|Dakar|Ouagadougou|Bamako|Niamey|Conakry|Douala|Libreville|Brazzaville|Kinshasa|Lagos|Accra)$/.test(tz) ? "mm" : "card");

  // ---------------------------------------------------------------- liens de téléchargement
  const PATTERNS = {
    setup: /^VDL-Setup.*\.exe$/i,
    portable: /^VDL-Portable.*\.zip$/i,
    apk: /android-arm64-v8a\.apk$/i,          // la grande majorité des téléphones
    apk_universal: /android-universal\.apk$/i, // tous les téléphones (plus lourd)
    dmg: /\.dmg$/i,
  };

  // Lien direct servi par le serveur de licences (/dl/apk…) : le téléchargement démarre sans passer par GitHub,
  // même si l'API de GitHub ne répond pas (limite de requêtes) ; sinon le fichier de la version trouvée.
  const direct = (key, a) => (cfg.licenseApi ? `${cfg.licenseApi}/dl/${key}` : a ? a.url : releasesPage);

  function setLinks(assets) {
    for (const link of document.querySelectorAll("[data-asset]")) {
      const a = assets[link.dataset.asset];
      link.href = direct(link.dataset.asset, a);
      if (a) link.title = `${a.name} · ${(a.size / 1048576).toFixed(0)} Mo`;
    }
    for (const link of document.querySelectorAll("[data-store]")) if (cfg.msStore) link.href = cfg.msStore;
    const main = MAIN_ASSET[os];
    if (viaStore) {
      $("#main-dl").href = cfg.msStore;
    } else if (main) {
      $("#main-dl").href = direct(main, assets[main]);
    } else if (os === "other") {
      $("#main-dl").href = "#telecharger";
    }
  }

  setLinks({}); // liens directs tout de suite ; GitHub ne sert ensuite qu'à afficher la version et la taille

  fetch(`https://api.github.com/repos/${cfg.repo}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => {
      const assets = {};
      for (const a of rel.assets || []) {
        for (const [key, re] of Object.entries(PATTERNS)) {
          if (re.test(a.name) && !assets[key]) {
            assets[key] = { url: a.browser_download_url, name: a.name, size: a.size };
          }
        }
      }
      setLinks(assets);
      const version = (rel.tag_name || "").replace(/^v/, "");
      const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString("fr-FR") : "";
      const main = assets[MAIN_ASSET[os]];
      if (viaStore) storeMeta(assets.setup, version);
      else $("#main-meta").textContent = [
        version && `Version ${version}`,
        main && `${(main.size / 1048576).toFixed(0)} Mo`,
        date && `publiée le ${date}`,
      ].filter(Boolean).join(" · ") || $("#main-meta").textContent;
      $("#version-footer").textContent = version ? `version ${version}` : "";
    })
    .catch(() => { /* hors ligne ou pas encore de version : les liens mènent à la page GitHub */ });

  // ---------------------------------------------------------------- carrousel 3D des captures Android
  // Avance seulement au geste (flèches, points, clavier, glisser, clic sur une capture voisine) : jamais tout seul.
  const carousel = $("#phones-carousel");
  if (carousel) {
    const slides = [...carousel.querySelectorAll(".phone")];
    const controls = carousel.querySelector(".carousel-controls");
    const dots = carousel.querySelector(".car-dots");
    const n = slides.length;
    let active = 0;
    let swiped = false;
    carousel.classList.add("is-3d");
    controls.hidden = false;
    slides.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Capture ${i + 1} sur ${n} : ${s.querySelector("figcaption").textContent}`);
      b.addEventListener("click", () => go(i));
      dots.append(b);
      s.addEventListener("click", () => { if (!swiped) go(i); });
    });
    const layout = () => {
      const narrow = window.matchMedia("(max-width: 700px)").matches;
      slides.forEach((s, i) => {
        let d = i - active;
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        const a = Math.abs(d);
        const shown = a <= (narrow ? 1 : 2);
        s.style.transform = `translateX(calc(${d} * var(--step))) translateZ(${-a * 140}px) rotateY(${-Math.sign(d) * Math.min(a, 1) * 38}deg)`;
        s.style.zIndex = String(10 - a);
        s.style.opacity = shown ? (a === 2 ? ".5" : "1") : "0";
        s.style.pointerEvents = shown ? "" : "none";
        s.classList.toggle("is-active", a === 0);
        s.setAttribute("aria-hidden", a === 0 ? "false" : "true");
      });
      [...dots.children].forEach((b, i) => b.setAttribute("aria-current", String(i === active)));
    };
    const go = (i) => { active = (i + n) % n; layout(); };
    controls.querySelectorAll(".car-btn").forEach((b) => b.addEventListener("click", () => go(active + Number(b.dataset.dir))));
    carousel.tabIndex = 0;
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { go(active - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { go(active + 1); e.preventDefault(); }
    });
    let startX = null;
    carousel.addEventListener("pointerdown", (e) => { startX = e.clientX; swiped = false; });
    carousel.addEventListener("pointerup", (e) => {
      if (startX !== null && Math.abs(e.clientX - startX) > 40) { swiped = true; go(active + (e.clientX < startX ? 1 : -1)); }
      startX = null;
    });
    window.addEventListener("resize", layout);
    layout();
  }

  // Autres systèmes sous le bouton principal
  const others = Object.keys(MAIN_ASSET).filter((k) => k !== os);
  $("#others").innerHTML = others.length
    ? "Aussi pour " + others.map((k) => `<a href="#telecharger">${k === "windows" ? "Windows" : "Android"}</a>`).join(" et ")
    : "";
})();
