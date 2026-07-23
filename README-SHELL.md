# EquiStories — unified site (stage 1: shared look & nav)

## Layout

```
Equistories-Home/
├── index.html              Community Hub
├── stable.html             Stable Manager   (was Equistories-stable-manager)
├── shows.html              Shows            (was equistories-shows)
├── style/
│   └── equi-shell.css      One palette, one typeface, top-bar styles
└── core/
    └── equi-nav.js         The shared top bar
```

Each page now carries exactly two extra lines in `<head>`:

```html
<link rel="stylesheet" href="style/equi-shell.css" />
<script src="core/equi-nav.js" data-app="stable" defer></script>
```

…and one mount point as the first thing in `<body>`:

```html
<div id="equi-nav"></div>
```

`data-app` is `hub`, `stable`, or `shows` — it just marks which tab is current.

## What changed inside the pages

Almost nothing, deliberately. The hand-written "← Community Hub | Shows" bars in
the Stable Manager and Shows are gone, replaced by the shared bar. No other
markup was touched.

The shared stylesheet does **not** restyle your components. It sets the colour
variables and the typeface, and adds `.equi-`-prefixed classes for the top bar
only. Everything else still comes from each page's own `<style>` block.

### Why your existing colours keep working

The three apps had grown different names for the same colours — the Manager says
`--accent`, Shows says `--amber`, the Hub says `--accent`/`--honey`. Rather than
find-and-replace across ~16,000 lines, `equi-shell.css` defines one canonical
palette and **aliases every historical name onto it**. Existing `var(--amber)`
and `var(--accent)` keep working untouched.

The canonical values are the Manager/Shows ones, which were already byte-identical
to each other. **The Hub is the only page whose colours actually shift** — it was
a few shades off (`#1a130c` vs `#1b1410` background, `#d29a3e` vs `#c98a3a`
accent). That's the visible part of "homogenised."

Typography standardises on the Hub's Lora + Cinzel, so the Manager and Shows pick
up proper webfonts instead of falling back to Palatino/Georgia.

### Why the stylesheet wins from `<head>`

The Stable Manager's `<style>` block sits down in the `<body>`, so a normal
`<head>` link would lose the cascade. The shared file uses `html:root` and
`html body` — one notch more specific than the `:root` / `body` the apps declare
— so it wins wherever it's loaded. That's why every page can use one ordinary
`<link>`.

## Badges

The bar can show a count on any tab:

```js
EquiNav.setBadge('hub', 3);     // 3 unread messages
EquiNav.setBadge('stable', 0);  // clear
```

Already wired: unread Messages on the Hub, unclaimed show results on the Stable
Manager.

## Deploying — read this before you push

**Your existing links will break unless you handle this.** Show invite links are
built from the *current* path:

```js
location.origin + location.pathname + "?show=" + show.id
```

So every invite already shared in Discord points at
`pocketcaster.github.io/equistories-shows/?show=…`. Moving Shows to
`Equistories-Home/shows.html` changes that path, and old links 404.

Keep the two old repos alive with a redirect stub as their `index.html`:

```html
<!doctype html><meta charset="utf-8">
<title>Moved</title>
<script>
  location.replace("https://pocketcaster.github.io/Equistories-Home/shows.html"
                   + location.search + location.hash);
</script>
<p>This page has moved. <a href="https://pocketcaster.github.io/Equistories-Home/shows.html">Continue →</a></p>
```

`location.search` is what carries `?show=…` through, so old invites keep working.
Do the same in the stable-manager repo pointing at `stable.html`.

Nothing else needs to change: all three pages were already on the same origin
(`pocketcaster.github.io`), which is why the shared `equi-lite-bank` session and
`localStorage` already work across them. Moving them into one repo doesn't alter
that — it just shortens the paths.

## Suggested order from here

1. **This stage** — shared look and nav. Cosmetic, low risk, reversible.
2. **Shared core** — one `EquiDB` / `EquiAuth` in `core/equi-db.js`, deleted from
   all three pages. This is the stage that kills the seam bugs (the Firestore
   drift, the `listByField` that existed in one app and not another).
3. **Shared domain tables** — `ART_EXP`, `BONUS_EXP`, `DISCIPLINES`, stat tiers,
   `calcLitExp`. These are currently duplicated with a comment asking you to keep
   them in step by hand.
4. **Shared record shapes** — comp records, artLog entries, the claim envelope.

Do them one at a time, with all three pages live in between. Version the shared
files (`equi-core-2.js`) or pin a commit if you want to roll one page back
without touching the others.
