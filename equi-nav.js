/* ==========================================================================
   EquiStories — header enhancer

   The header itself is PLAIN HTML in every page. This file only adds to it:

     • On the Stable Manager and Shows, it fills the #nav tab row (those pages
       have no nav of their own) and wires Sign out.
     • On the Community Hub it does nothing to #nav — the Hub's own renderNav()
       owns that element and always has.

   If this file fails to load, every page still shows its crest, wordmark,
   tagline, links across the site and tab row. That was not true of the earlier
   version, which generated the whole header and took the navigation down with
   it when the files fell out of sync.
   ========================================================================== */
(function () {
  "use strict";

  var script  = document.currentScript ||
                document.querySelector('script[src*="equi-nav"]');
  var current = (script && script.dataset && script.dataset.app) || "";
  if (current === "hub") return;   // the Hub fills its own #nav

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

  var TABS = [
    { key: "hub",    label: "Community",      href: "index.html"  },
    { key: "stable", label: "Stable Manager", href: "stable.html" },
    { key: "shows",  label: "Shows",          href: "shows.html"  }
  ];

  function fill() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var who = session();

    nav.innerHTML =
      TABS.map(function (t) {
        return '<a class="tab' + (t.key === current ? " active" : "") + '" href="' +
               t.href + '">' + t.label + "</a>";
      }).join("") +
      '<span class="equi-hd__user">' +
        '<span class="small">' + esc(who ? who.userId : "") + "</span>" +
        (who ? '<button class="ghost" id="equiOut">Sign out</button>' : "") +
      "</span>";

    var out = document.getElementById("equiOut");
    if (out) out.onclick = function () {
      try { localStorage.removeItem("equi-lite-bank"); } catch (e) {}
      if (window.EquiAuth && window.EquiAuth.signOut) {
        try { Promise.resolve(window.EquiAuth.signOut()).then(reload, reload); return; } catch (e) {}
      }
      reload();
    };
    function reload() { location.reload(); }
  }

  if (document.getElementById("nav")) fill();
  else document.addEventListener("DOMContentLoaded", fill);

  window.addEventListener("storage", function (e) { if (e.key === "equi-lite-bank") fill(); });
  window.EquiNav = { refresh: fill };
})();
