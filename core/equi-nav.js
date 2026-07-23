/* ==========================================================================
   EquiStories — shared top navigation
   Drop into any page with:

     <script src="core/equi-nav.js" data-app="stable" defer></script>

   data-app is one of: hub | stable | shows   (marks the current page)

   Mounts itself into <div id="equi-nav"></div> if that exists, otherwise
   injects itself as the first element of <body>. Reads the signed-in member
   from the shared `equi-lite-bank` session that all three apps already use, so
   it shows the same name everywhere with no extra wiring.
   ========================================================================== */
(function () {
  "use strict";

  var PAGES = [
    { key: "hub",    label: "Community",      href: "index.html"  },
    { key: "stable", label: "Stable Manager", href: "stable.html" },
    { key: "shows",  label: "Shows",          href: "shows.html"  }
  ];

  var script  = document.currentScript ||
                document.querySelector('script[src*="equi-nav"]');
  var current = (script && script.dataset && script.dataset.app) || "";
  var base    = (script && script.dataset && script.dataset.base) || "";

  // Badge counts, set by the apps (e.g. unread messages, unclaimed results).
  var badges = {};

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

  function render() {
    if (!document.body) return;
    var who = session();
    var links = PAGES.map(function (p) {
      var isHere = p.key === current;
      var n = badges[p.key];
      var badge = n ? '<span class="equi-topbar__badge">' + esc(n) + "</span>" : "";
      return '<a class="equi-topbar__link" href="' + esc(base + p.href) + '"' +
             (isHere ? ' aria-current="page"' : "") + ">" + esc(p.label) + badge + "</a>";
    }).join("");

    host().innerHTML =
      '<nav class="equi-topbar" aria-label="EquiStories">' +
        '<a class="equi-topbar__brand" href="' + esc(base + "index.html") + '">EquiStories</a>' +
        links +
        '<span class="equi-topbar__spacer"></span>' +
        (who ? '<span class="equi-topbar__who">' + esc(who.userId) + "</span>" : "") +
      "</nav>";
  }

  window.EquiNav = {
    // EquiNav.setBadge('shows', 3) — pass 0 or null to clear.
    setBadge: function (key, n) {
      if (n) badges[key] = n; else delete badges[key];
      render();
    },
    refresh: render,
    current: function () { return current; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // The session is shared across the whole origin, so a sign-in or sign-out in
  // another tab should update the bar here too.
  window.addEventListener("storage", function (e) {
    if (e.key === "equi-lite-bank") render();
  });
})();
