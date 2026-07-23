/* ==========================================================================
   EquiStories — shared site header
   The SAME header on every page: the crest, the gold EquiStories wordmark, the
   tagline, and a tab row with your name and Sign out on the right.

     <script src="core/equi-nav.js" data-app="stable" defer></script>

   data-app is one of: hub | stable | shows

   HOW THE TAB ROW IS FILLED
   -------------------------
   The header always renders <nav id="nav">, which is the element the Community
   Hub's own renderNav() already writes into. So on the Hub, the Hub keeps full
   control of its tabs exactly as before — this file just gives it a nicer frame.
   On the Stable Manager and Shows, which have no such nav, this file fills the
   row with links across the site plus the same name / Sign out block, so the
   three headers are identical rather than merely similar.
   ========================================================================== */
(function () {
  "use strict";

  var PAGES = [
    { key: "hub",    label: "Community",      href: "index.html"  },
    { key: "stable", label: "Stable Manager", href: "stable.html" },
    { key: "shows",  label: "Shows",          href: "shows.html"  }
  ];

  var TAGLINES = {
    hub:    "An art-driven horse roleplay community \u2014 draw, train, compete, breed.",
    stable: "Your horses, riders, training, shows and inventory.",
    shows:  "Host a show, judge the entries, or enter one of your own."
  };

  var script  = document.currentScript ||
                document.querySelector('script[src*="equi-nav"]');
  var ds      = (script && script.dataset) || {};
  var current = ds.app || "";
  var base    = ds.base || "";
  var tagline = ds.tagline || TAGLINES[current] || TAGLINES.hub;
  var isHub   = current === "hub";

  function session() {
    try {
      var raw = localStorage.getItem("equi-lite-bank");
      if (!raw) return null;
      var b = JSON.parse(raw);
      return (b && b.linked && b.userId) ? b : null;
    } catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function host() {
    var mount = document.getElementById("equi-nav");
    if (mount) return mount;
    mount = document.createElement("div");
    mount.id = "equi-nav";
    if (document.body.firstChild) document.body.insertBefore(mount, document.body.firstChild);
    else document.body.appendChild(mount);
    return mount;
  }

  // The name + Sign out block that sits at the right-hand end of the tab row.
  function userBlock(who) {
    return '<span class="equi-hd__user">' +
             '<span class="small">' + esc(who ? who.userId : "") + "</span>" +
             (who ? '<button class="ghost" id="equiOut">Sign out</button>' : "") +
           "</span>";
  }

  function fillTabsForApp() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var who = session();
    nav.innerHTML = PAGES.map(function (p) {
      return '<a class="tab' + (p.key === current ? " active" : "") + '" href="' +
             esc(base + p.href) + '">' + esc(p.label) + "</a>";
    }).join("") + userBlock(who);

    var out = document.getElementById("equiOut");
    if (out) out.onclick = async function () {
      try { localStorage.removeItem("equi-lite-bank"); } catch (e) {}
      if (window.EquiAuth && window.EquiAuth.signOut) { try { await window.EquiAuth.signOut(); } catch (e) {} }
      location.reload();
    };
  }

  function render() {
    if (!document.body) return;

    host().innerHTML =
      '<header class="equi-hd">' +
        '<div class="equi-hd__wrap">' +
          '<div class="equi-hd__brand">' +
            '<a href="' + esc(base + "index.html") + '" aria-label="EquiStories home">' +
              '<img class="equi-hd__logo" src="' + esc(base + "assets/equistories-logo.png") +
                   '" alt="" width="642" height="507" />' +
            "</a>" +
            "<div>" +
              '<h1 class="equi-hd__title">EquiStories</h1>' +
              '<p class="equi-hd__tagline">' + esc(tagline) + "</p>" +
            "</div>" +
          "</div>" +
          '<nav id="nav" class="equi-hd__nav"></nav>' +
        "</div>" +
      "</header>";

    // On the Hub, its own renderNav() owns #nav — don't fight it.
    if (!isHub) fillTabsForApp();
    else if (typeof window.renderNav === "function") { try { window.renderNav(); } catch (e) {} }
  }

  window.EquiNav = { refresh: render, current: function () { return current; } };

  // This script is placed in the body, immediately after its mount and BEFORE
  // each page's own inline script — so render now rather than waiting for
  // DOMContentLoaded, which would fire too late for the Hub's renderNav() to
  // find #nav.
  if (document.body) render();
  else document.addEventListener("DOMContentLoaded", render);

  window.addEventListener("storage", function (e) {
    if (e.key === "equi-lite-bank") render();
  });
})();
