/* ==========================================================================
   EquiStories — shared banner + navigation
   Renders the same header on every page: the crest, a tagline, and the
   cross-app tabs.

     <script src="core/equi-nav.js"
             data-app="stable"
             data-tagline="Your horses, riders, training and shows."
             defer></script>

   data-app is one of: hub | stable | shows
   data-tagline is optional; each page gets a sensible default below.

   Mounts into <div id="equi-nav"></div>, or as the first child of <body>.

   NOTE ON PAGE NAVS: this is the SITE nav (which app you're in). Each page
   keeps its own section nav underneath — the Hub's #nav tab bar, the tracker's
   .tabs. They're deliberately two levels and shouldn't be merged.
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
      var badge = n ? '<span class="equi-hd__badge">' + esc(n) + "</span>" : "";
      return '<a class="equi-hd__tab" href="' + esc(base + p.href) + '"' +
             (isHere ? ' aria-current="page"' : "") + ">" + esc(p.label) + badge + "</a>";
    }).join("");

    host().innerHTML =
      '<header class="equi-hd">' +
        '<div class="equi-hd__top">' +
          '<a class="equi-hd__brand" href="' + esc(base + "index.html") + '" aria-label="EquiStories home">' +
            '<img class="equi-hd__logo" src="' + esc(base + "assets/equistories-logo.png") +
                 '" alt="EquiStories" width="642" height="507" />' +
          "</a>" +
          '<div class="equi-hd__meta">' +
            '<p class="equi-hd__tagline">' + esc(tagline) + "</p>" +
            (who
              ? '<p class="equi-hd__who">Signed in as <b>' + esc(who.userId) + "</b></p>"
              : '<p class="equi-hd__who">Not signed in</p>') +
          "</div>" +
        "</div>" +
        '<nav class="equi-hd__nav" aria-label="EquiStories sections">' + links + "</nav>" +
      "</header>";
  }

  window.EquiNav = {
    setBadge: function (key, n) { if (n) badges[key] = n; else delete badges[key]; render(); },
    refresh: render,
    current: function () { return current; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.addEventListener("storage", function (e) {
    if (e.key === "equi-lite-bank") render();
  });
})();
