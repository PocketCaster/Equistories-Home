// ============================================
// EquiStories — SHARED constants
// Loaded before any page-specific script. Plain (non-module) so every page's
// existing code can keep referencing these as bare globals — no rewrite of
// call sites needed, just delete the duplicated local copies.
//
// USAGE: <script src="equi-constants.js"></script>  (load early, before
// equi-bank.js and any page script that references these)
//
// BUILD MARKER: FRAME-LOCK-v3 — if you Ctrl+F this file (view-source, or the
// raw file URL) and don't find "FRAME-LOCK-v3", the live copy is stale and
// needs re-uploading.
// ============================================

// FOUNDER-LEVEL ADMIN — a permanent, code-level fallback so the site can
// never be locked out of its own admin tools (e.g. if the siteAdmins
// collection is ever empty or misconfigured). Everyday admin management now
// happens through the Admin page instead — see __adminCache/loadAdminCache
// below. Add/remove people there; only touch this array to change who has
// unremovable founder access.
const ADMIN_MEMBERS = ["PocketCaster"];
// userId -> true, for admins granted dynamically via the Admin page (the
// `siteAdmins` Firestore collection — one doc per admin, keyed by their own
// userId, existence-only). Populated once per page load by loadAdminCache().
const __adminCache = {};
async function loadAdminCache(DB){
  try{
    const recs = await DB.listAll('siteAdmins');
    recs.forEach(r=>{
      const uid = r.__owner || r.__id || r.userId;
      if(uid) __adminCache[uid] = true;
    });
  }catch(e){ /* siteAdmins store may not exist yet — that's fine */ }
}
function isAdminMember(uid){ return !!uid && (ADMIN_MEMBERS.includes(uid) || !!__adminCache[uid]); }
// Grant/revoke a dynamic admin. Only ever called from the Admin page, which
// already gates the button to isAdminMember(me) — but the real enforcement
// is server-side, in firestore.rules (siteAdmins create/delete requires
// isForumAdmin()), so a non-admin calling these directly still gets denied.
async function grantAdmin(DB, targetUid){
  await DB.put('siteAdmins', targetUid, targetUid, { grantedAt: new Date().toISOString() });
  __adminCache[targetUid] = true;
}
async function revokeAdmin(DB, targetUid){
  await DB.remove('siteAdmins', targetUid);
  delete __adminCache[targetUid];
}

// Your live Railway bank server's base URL (no trailing slash).
const RAILWAY_URL = "https://equistories-bank-server-production.up.railway.app"; // <-- set this once, here, for the whole site

const STATS = ["stamina","strength","scope","speed","handiness","boldness","balance","gaits","harmony"];
const STAT_LABELS = {
  stamina:"Stamina", strength:"Strength", scope:"Scope", speed:"Speed",
  handiness:"Handiness", boldness:"Boldness", balance:"Balance", gaits:"Gaits", harmony:"Harmony"
};

// The shared bank-session helper — reads the same localStorage key every
// page already uses. Kept here (not equi-core.js) since it's synchronous
// and has no Firebase dependency.
function equiSession(){
  try{
    const raw = localStorage.getItem("equi-lite-bank");
    if(!raw) return null;
    const b = JSON.parse(raw);
    return (b && b.linked && b.userId) ? b : null;
  }catch(e){ return null; }
}

// ============================================
// PORTRAIT FRAMES — moved here from the Hub so Stable Manager (horse/rider
// profile customization) can offer the exact same frame picker instead of
// a second, possibly-drifting copy. One list, one renderer, everywhere.
// ============================================

// The original CSS-drawn frames (styled via .equi-frame--<name> in
// equi-shell.css) plus floral/starburst (emoji-corner, standalone CSS
// below) plus the new PNG-overlay frames (real artwork, see
// EQUI_IMAGE_FRAMES below this list).
const EQUI_FRAMES = [
  ["none","No frame"], ["brass","Brass"], ["rope","Rope"], ["ribbon","Ribbon"],
  ["rosette","Rosette"], ["plaque","Plaque"], ["moss","Moss"], ["plum","Plum"],
  ["vignette","Vignette"], ["polaroid","Polaroid"],
  ["floral","Blush Circle"], ["starburst","Starburst"],
  ["ink-circle","Ink Circle"], ["scalloped-circle","Scalloped Circle"],
  ["scribble-circle","Scribble Circle"], ["scissor-circle","Scissor-cut Circle"],
  ["ornate-gold","Ornate Gold"], ["corner-brackets","Corner Brackets"],
  ["rose-corners","Rose Corners"], ["gold-key","Gold Key Pattern"],
  ["bracket-plaque","Bracket Plaque"],
];

// The 9 new PNG-overlay frames are a premium perk — everything else
// (including Blush Circle/Starburst) stays free. Admins get every frame,
// same as gearStatCap's Infinity case.
const PREMIUM_FRAMES = ["ink-circle","scalloped-circle","scribble-circle","scissor-circle",
  "ornate-gold","corner-brackets","rose-corners","gold-key","bracket-plaque"];
function isPremiumFrame(name){ return PREMIUM_FRAMES.includes(name); }
function frameAllowed(name, uid){ return !isPremiumFrame(name) || isAdminMember(uid) || isPremiumMember(uid); }
// Builds the <option> list for a frame <select>, shared by every profile
// editor (player/horse/rider) so they can't drift out of sync. Premium
// frames are simply left out of the list for non-premium, non-admin
// members — not shown as a disabled "locked" option, just not offered.
// Exception: if that profile's CURRENT frame is a premium one (e.g. they
// had premium before and lost it), it stays in the list so it doesn't
// silently disappear/reset the moment they open the editor.
function frameOptionsHtml(current, uid){
  const allowed = isAdminMember(uid) || isPremiumMember(uid);
  return EQUI_FRAMES
    .filter(f => allowed || !isPremiumFrame(f[0]) || f[0] === (current||'none'))
    .map(f=>{
      const sel = (current||'none')===f[0] ? ' selected' : '';
      return `<option value="${f[0]}"${sel}>${f[1]}</option>`;
    }).join('');
}

// New PNG-overlay frames: real artwork layered on top of the portrait.
// `inset` was measured per-image from each PNG's own transparency (how far
// in from each edge the actual "hole" starts), so the photo sits flush
// against the art instead of floating in the middle with a gap or spilling
// out past the frame's edge. `shape` picks how the photo underneath gets
// clipped: circle/square border-radius, a custom clip-path traced from the
// art's silhouette (ornate-gold's arch), or a rotated square sized to the
// measured corner marks (corner-brackets).
//
// IMAGES: upload the 9 files from equi-frame-images.zip into a /frames
// folder next to this script (same level as equi-constants.js). If your
// repo structure is different, update FRAME_IMAGE_BASE below to match.
const FRAME_IMAGE_BASE = "frames/";
const EQUI_IMAGE_FRAMES = {
  "ink-circle": { src: FRAME_IMAGE_BASE+"frame-ink-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"circle(45% at 50% 50%)" },
  "scalloped-circle": { src: FRAME_IMAGE_BASE+"frame-scalloped-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"circle(48.55% at 50% 50%)" },
  "scribble-circle": { src: FRAME_IMAGE_BASE+"frame-scribble-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"circle(45% at 50% 50%)" },
  "scissor-circle": { src: FRAME_IMAGE_BASE+"frame-scissor-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"circle(49.15% at 50% 50%)" },
  "rose-corners":     { src: FRAME_IMAGE_BASE+"frame-rose-corners.png",     shape:"square", ar:1.549, inset:{top:1,    left:1,    right:1,    bottom:1} },
  "gold-key": { src: FRAME_IMAGE_BASE+"frame-gold-key.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(5.67% 0.90%, 5.67% 4.49%, 12.56% 2.36%, 12.67% 5.28%, 9.89% 5.62%, 9.67% 10.79%, 4.33% 13.15%, 2.22% 10.00%, 4.78% 9.89%, 4.89% 5.84%, 0.89% 5.62%, 0.89% 94.38%, 4.89% 94.16%, 4.78% 90.11%, 2.22% 89.89%, 3.33% 86.85%, 9.67% 89.10%, 9.89% 94.38%, 12.67% 94.72%, 12.56% 97.64%, 5.89% 95.28%, 6.89% 99.10%, 94.22% 99.10%, 94.11% 95.28%, 88.22% 97.64%, 87.22% 95.51%, 90.00% 94.38%, 90.11% 89.33%, 97.78% 87.08%, 97.89% 89.78%, 95.22% 90.00%, 95.22% 94.38%, 99.11% 94.38%, 99.11% 5.51%, 95.22% 5.51%, 95.22% 9.89%, 97.89% 10.22%, 95.56% 13.15%, 90.11% 10.67%, 90.00% 5.62%, 87.22% 4.49%, 89.11% 2.25%, 94.22% 4.49%, 94.22% 0.90%)" },
  "bracket-plaque": { src: FRAME_IMAGE_BASE+"frame-bracket-plaque.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(83.20% 8.67%, 54.87% 7.56%, 49.94% 3.00%, 45.02% 7.56%, 18.03% 7.89%, 14.89% 10.78%, 14.11% 14.44%, 8.73% 16.89%, 7.61% 45.00%, 3.02% 50.00%, 7.61% 54.89%, 7.95% 81.67%, 10.53% 84.56%, 14.22% 85.56%, 16.46% 91.11%, 44.90% 92.33%, 49.94% 96.89%, 54.87% 92.33%, 81.86% 92.00%, 84.77% 89.44%, 85.67% 85.33%, 91.15% 82.78%, 92.27% 54.56%, 96.86% 49.78%, 93.39% 47.33%, 92.16% 44.33%, 92.05% 18.56%, 89.92% 15.56%, 85.67% 14.22%)" },
  // Ornate Gold: the photo is clipped to a polygon traced from the actual
  // arch/scrollwork silhouette instead of a plain rounded rectangle.
  "ornate-gold": { src: FRAME_IMAGE_BASE+"frame-ornate-gold.png", shape:"clip", ar:0.658, inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(46.45% 1.22%, 33.28% 3.00%, 18.24% 7.56%, 12.84% 13.33%, 5.74% 13.11%, 8.45% 17.89%, 2.20% 23.22%, 4.39% 25.89%, 4.39% 74.00%, 2.20% 76.67%, 8.45% 82.00%, 5.74% 86.78%, 13.85% 87.00%, 18.24% 92.33%, 36.49% 97.56%, 53.21% 98.67%, 70.27% 95.89%, 82.26% 92.00%, 86.49% 86.78%, 93.92% 86.67%, 91.39% 82.00%, 97.64% 76.67%, 95.44% 74.11%, 95.44% 25.89%, 97.64% 23.22%, 91.39% 17.89%, 93.92% 13.22%, 85.98% 12.89%, 81.59% 7.56%, 62.67% 2.22%)" },
  // Corner Brackets: the 4 marks sit almost exactly equidistant from
  // center, ~7.6° off the axis-aligned corners — so it's one plain square,
  // rotated, not a corner-clipped octagon.
  "corner-brackets": { src: FRAME_IMAGE_BASE+"frame-corner-brackets.png", shape:"rotated-square", size:88.5, rotate:-7.64 },
};

function frameClass(name){
  // Blush Circle/starburst are fully self-contained (plain border or emoji
  // corners, no image) — they deliberately do NOT include the shared "equi-frame" base class,
  // since that class fights with their circular shape/border. Standalone
  // class = zero chance of conflicting with anything else on the site.
  if(name==='floral' || name==='starburst') return 'equi-frame-standalone equi-frame-standalone--' + name;
  const ok = EQUI_FRAMES.some(f=>f[0]===name);
  return "equi-frame equi-frame--" + (ok ? name : "none");
}
// Wrap an image in the member's chosen frame — handles CSS-drawn frames,
// floral/starburst, AND the new PNG-overlay frames.
function framedImg(url, frame, size, caption){
  // size can be a plain number (treated as px, the common case — message
  // avatars, dropdown previews) OR a CSS length/expression string like
  // "min(300px,55vw)" for a large hero portrait that needs to shrink on
  // narrow screens. `px` stays numeric (with a safe fallback) purely for
  // the placeholder-icon font-size math below; `dim` is what actually
  // goes into width/height.
  const px = typeof size === 'number' ? size : 160;
  const dim = typeof size === 'number' ? `${size}px` : (size || '160px');
  const imgFrame = EQUI_IMAGE_FRAMES[frame];
  if(imgFrame){
    const cap = caption ? ` data-caption="${__esc(caption)}"` : '';
    // Frames whose PNG isn't square carry an `ar` (width/height). Size the
    // container to that ratio — fitting inside the requested `size` box — so
    // the frame art renders at its true proportions instead of being stretched
    // to a square. Square frames (no `ar`) are unchanged.
    const ar = imgFrame.ar || 1;
    const fw = ar >= 1 ? dim : `calc(${dim} * ${ar})`;
    const fh = ar >= 1 ? `calc(${dim} / ${ar})` : dim;
    let avatarStyle;
    if(imgFrame.shape === 'rotated-square'){
      const off = (100 - imgFrame.size) / 2;
      avatarStyle = `top:${off}%;left:${off}%;right:${off}%;bottom:${off}%;transform:rotate(${imgFrame.rotate}deg);`;
    } else {
      const i = imgFrame.inset;
      const radius = imgFrame.shape === 'circle' ? '50%' : imgFrame.shape === 'clip' ? '4%' : '10%';
      const clip = imgFrame.clipPath ? `clip-path:${imgFrame.clipPath};` : '';
      avatarStyle = `top:${i.top}%;left:${i.left}%;right:${i.right}%;bottom:${i.bottom}%;border-radius:${radius};${clip}`;
    }
    const inner = url
      ? `<img src="${__esc(url)}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" style="width:100%;height:100%;object-fit:cover;display:block;" />`
      : `<div style="width:100%;height:100%;background:var(--deep);display:flex;align-items:center;justify-content:center;font-size:${px*0.35}px;">&#128100;</div>`;
    return `<div class="equi-frame-img" style="position:relative;width:${fw};height:${fh};"${cap}>
      <div class="equi-frame-img__avatar" style="position:absolute;overflow:hidden;box-sizing:border-box;${avatarStyle}">${inner}</div>
      <img class="equi-frame-img__art" src="${__esc(imgFrame.src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;" />
    </div>`;
  }
  if(!url) return `<div class="${frameClass(frame)}" style="width:${dim};height:${dim};">
      <div style="width:100%;height:100%;border-radius:inherit;background:var(--deep);display:flex;align-items:center;justify-content:center;font-size:2.6em;">&#128100;</div></div>`;
  return `<div class="${frameClass(frame)}" style="width:${dim};height:${dim};"${caption?` data-caption="${__esc(caption)}"`:''}>
    <img src="${__esc(url)}" referrerpolicy="no-referrer" alt="" onerror="this.style.visibility='hidden'" /></div>`;
}
// esc() is defined per-page under different names (esc/escAttr/__esc) — this
// gives framedImg() one that always exists, regardless of which page it runs on.
function __esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Standalone CSS for Blush Circle (plain pastel border, no emoji) and
// Starburst (emoji corners) — injected here instead of duplicated in each
// page's <style> block, so there's one definition to update instead of two
// silently drifting apart.
(function injectFrameCSS(){
  const css = `
  .equi-frame-standalone--floral{
    display:inline-block; position:relative; border-radius:50%; overflow:visible;
    border:3px solid #e8a8c0; box-shadow:0 0 0 2px var(--panel,#1a130c);
    box-sizing:border-box;
  }
  .equi-frame-standalone--floral img,
  .equi-frame-standalone--floral > div{ width:100%; height:100%; border-radius:50%; display:block; object-fit:cover; }
  .equi-frame-standalone--starburst{
    display:inline-block; position:relative; border-radius:50%; overflow:visible;
    border:3px dashed #c9a84c; box-shadow:0 0 0 2px var(--panel,#1a130c);
    box-sizing:border-box;
  }
  .equi-frame-standalone--starburst img,
  .equi-frame-standalone--starburst > div{ width:100%; height:100%; border-radius:50%; display:block; object-fit:cover; }
  .equi-frame-standalone--starburst::before{
    content:"✦"; position:absolute; top:-10px; right:-4px; font-size:1.1em; color:#e8c766;
  }
  .equi-frame-standalone--starburst::after{
    content:"✧"; position:absolute; bottom:-8px; left:-6px; font-size:1em; color:#e8c766;
  }`;
  const tag = document.createElement('style');
  tag.id = 'equi-frame-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
})();

// ============================================
// PREMIUM STATUS — moved here from the Hub so Stable Manager (horse/rider
// profile customization) can use the exact same check instead of a second,
// possibly-drifting copy. One list, one cache, everywhere.
// ============================================
const PREMIUM_MEMBERS = ["PocketCaster"];
const __premiumCache = {};   // userId -> premiumUntil (ms)
async function loadPremiumCache(DB){
  try{
    const recs = await DB.listAll('premiumMembers');
    recs.forEach(r=>{
      const uid = r.__owner || r.__id || (r.userId);
      const until = Number(r.premiumUntil)||0;
      if(uid) __premiumCache[uid] = until;
    });
  }catch(e){ /* premium store may not exist yet — that's fine */ }
}
function hasActiveStoredPremium(uid){
  const until = __premiumCache[uid];
  return !!until && until > Date.now();
}
function isPremiumMember(uid){ return !!uid && (PREMIUM_MEMBERS.includes(uid) || isAdminMember(uid) || hasActiveStoredPremium(uid)); }
// Per-stat gear cap: regular +2, premium +3, admin unlimited.
function gearStatCap(uid){ return isAdminMember(uid) ? Infinity : (isPremiumMember(uid) ? 3 : 2); }
// The premium crest (gold horseshoe) as an inline SVG, sized to ~1em so it
// scales with whatever text it sits beside. Defined once here and reused by
// the name badge AND the premium status lines, so there's only ever one place
// the premium mark is drawn.
function premiumCrestSvg(){
  return `<svg viewBox="-38 -38 76 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:1.4em;height:1.4em;vertical-align:-.32em;"><path d="M-19.5,27.8 A34 34 0 1 1 19.5,27.8 L12.6,18 A22 22 0 1 0 -12.6,18 Z" fill="#CDA94E" stroke="#8a6a24" stroke-width="2" stroke-linejoin="round"/><circle cx="-26.3" cy="9.6" r="2" fill="#6E541C"/><circle cx="-24.2" cy="-14" r="2" fill="#6E541C"/><circle cx="0" cy="-28" r="2" fill="#6E541C"/><circle cx="24.2" cy="-14" r="2" fill="#6E541C"/><circle cx="26.3" cy="9.6" r="2" fill="#6E541C"/><path d="M0,4 L1.5,8 L5.7,8.2 L2.4,10.8 L3.5,14.9 L0,12.5 L-3.5,14.9 L-2.4,10.8 L-5.7,8.2 L-1.5,8 Z" fill="#F0DA96" stroke="#8a6a24" stroke-width="0.8"/></svg>`;
}
// The premium crest shown beside a premium member's name.
function premiumBadge(uid){
  if(!isPremiumMember(uid)) return "";
  return ` <span title="Premium member" style="margin-left:.18em;">${premiumCrestSvg()}</span>`;
}
// A proper gold pill badge for site admins — always dark text on a bright
// gold-shine background, so contrast can't accidentally regress the way the
// plain ".tag" (muted text, meant for low-key labels) did on the profile
// header. One definition, used everywhere "admin" needs to show up.
function adminBadge(uid){
  if(!isAdminMember(uid)) return "";
  return ` <span title="Site admin" style="display:inline-flex;align-items:center;gap:4px;font-size:.66em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:20px;background:var(--gold-shine, linear-gradient(135deg,#e8c97a,#c9a84c));color:#241a14;box-shadow:0 1px 3px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.4);vertical-align:middle;line-height:1.6;">Admin</span>`;
}

// ============================================
// CSS/HTML SANITIZERS — used anywhere a member (premium or not) can style
// or write markup for their own page: player profiles, and now horse/rider
// profiles too. Their CSS/HTML is sanitized so nothing can run script or
// break out of their own card.
// ============================================
function sanitizeShopCss(css){
  css = String(css||"");
  if(/<\/?\s*style/i.test(css)) return "";
  // @import is a data-exfil / external-fetch vector in general, BUT font
  // imports from Google Fonts are safe (they load fonts, can't run script), so
  // we allow ONLY those and strip any other @import.
  css = css.replace(/@import\s+url\(\s*['"]?(https:\/\/fonts\.googleapis\.com\/[^)'"]*)['"]?\s*\)\s*;?/gi,
                    (m,u)=>`@import url('${u}');`);
  css = css.replace(/@import(?!\s+url\(\s*['"]?https:\/\/fonts\.googleapis\.com\/)[^;]*;?/gi, "");
  css = css.replace(/url\(\s*['"]?\s*javascript:[^)]*\)/gi, "url()");
  css = css.replace(/expression\s*\(/gi, "(");
  css = css.replace(/-moz-binding[^;]*;?/gi, "");
  css = css.replace(/behavior\s*:[^;]*;?/gi, "");
  return css;
}
function sanitizeShopHtml(html){
  html = String(html||"");
  html = html.replace(/<\s*(script|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, "");
  html = html.replace(/<\s*\/\s*(script|iframe|object|embed|link|meta|base|form)\s*>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '$1="#"');
  return html;
}


// ============================================================
//  BADGE SYSTEM  — paste this at the very BOTTOM of equi-constants.js
//  (just before the end of the file; it needs nothing above it).
//  Shared by every page, same as ADMIN_MEMBERS / PREMIUM_MEMBERS.
// ============================================================

// Founding backers — permanent. Unlike the crown (which is premium and
// turns off if someone lapses), the backer badge is a forever thank-you:
// once someone's ID is in this list, they keep the badge even if they
// later cancel. Add early supporters' User IDs here.
const BACKER_MEMBERS = ["PocketCaster"];

// The catalog of hand-granted badges: the backer badge plus any community
// event badges. To hand a badge out, drop the player's User ID into that
// badge's `holders` list. To add a NEW event badge, copy one of the event
// blocks and give it a unique key (the part before the colon).
const BADGE_CATALOG = {
  backer: {
    name: "Founding Backer",
    icon: "\u{1F3F5}\u{FE0F}",              // 🏵️ rosette
    desc: "Supported EquiStories in its earliest days. Thank you!",
    holders: BACKER_MEMBERS
  },

  // ---- Community event badges ----------------------------------
  // Example event badge. Add IDs to `holders` as people earn it.
  "event-halloween-2026": {
    name: "Spooky Season 2026",
    icon: "\u{1F383}",                       // 🎃
    desc: "Took part in the Halloween 2026 community event.",
    holders: []          // e.g. ["SomeRider", "AnotherRider"]
  },
  // Copy the block above to add more events, e.g. "event-winter-2026".
};

// Tiny self-contained escaper so this block depends on nothing else.
function __badgeEsc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Inline name badge (shows next to a name like the crown does).
function backerBadge(uid){
  if(!uid || !BACKER_MEMBERS.includes(uid)) return "";
  return ` <span title="Founding Backer" style="display:inline-block;font-size:.9em;vertical-align:baseline;">\u{1F3F5}\u{FE0F}</span>`;
}

// Which catalog badges (backer + events) does this user hold?
function catalogBadgesForUser(uid){
  if(!uid) return [];
  return Object.keys(BADGE_CATALOG)
    .filter(k => (BADGE_CATALOG[k].holders || []).includes(uid))
    .map(k => ({ id:k, ...BADGE_CATALOG[k] }));
}

// Given a member's points and an association's ranks, return the highest
// rank they've reached (used so the association badge shows their rank
// emoji/colour, not just a generic club icon).
function assocRankFor(points, ranks){
  const list = Array.isArray(ranks)
    ? ranks.slice().sort((a,b)=>(a.threshold||0)-(b.threshold||0))
    : [];
  let cur = list[0] || { name:'Member', emoji:'\u{1F40E}', color:'#8a6820' };
  for(const r of list){ if((points||0) >= (r.threshold||0)) cur = r; }
  return cur;
}

// Builds the whole "Badge Case" card for a profile. Returns '' when the
// member has no badges (and it isn't their own profile), so empty cases
// never clutter other people's pages. All reads are best-effort: if the
// association lookups fail, the profile still renders fine.
async function badgeCaseCardHtml(DB, uid, isSelf){
  const badges = [];

  // 1) Catalog badges — backer + community events (manual holder lists).
  catalogBadgesForUser(uid).forEach(b=>{
    badges.push({ icon:b.icon, image:b.image, title:b.name, desc:b.desc, color:'#c9a84c' });
  });

  // 2) Association badges — one per club the member belongs to, showing
  //    their current rank inside that club.
  try{
    const memberships = await DB.listByOwner('associationMembers', uid) || [];
    for(const m of memberships){
      const assocId = m.associationId || String(m.__id||'').split('_')[0];
      if(!assocId) continue;
      let a = null;
      try{ a = await DB.get('associations', assocId); }catch(e){}
      if(!a) continue;
      const rank = assocRankFor(m.points, a.ranks);
      badges.push({
        icon:  rank.emoji || '\u{1F397}\u{FE0F}',    // 🎗️ fallback
        image: rank.image || '',
        title: (a.name || 'Association') + ' \u2014 ' + (rank.name || 'Member'),
        desc:  'Member of ' + (a.name || 'this association') + '.',
        color: rank.color || '#8a6820'
      });
    }
  }catch(e){ /* best-effort — never break the profile over a badge */ }

  if(!badges.length){
    if(!isSelf) return '';
    return `<div class="card">
      <h3 style="margin-top:0;">Badge Case</h3>
      <div class="small muted">No badges yet \u2014 earn them by backing EquiStories,
      joining an association, or taking part in a community event.</div>
    </div>`;
  }

  const chips = badges.map(b=>`
    <div title="${__badgeEsc((b.title||'') + (b.desc ? ' \u2014 '+b.desc : ''))}"
         style="display:flex;flex-direction:column;align-items:center;gap:4px;width:64px;">
      <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;display:flex;align-items:center;
                  justify-content:center;font-size:1.5em;background:var(--deep,#2a2015);
                  border:2px solid ${b.color||'#c9a84c'};box-shadow:0 1px 4px rgba(0,0,0,.35);">${b.image ? `<img src="${__badgeEsc(b.image)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='\u{1F396}\u{FE0F}'">` : (b.icon||'\u{1F396}\u{FE0F}')}</div>
      <div style="font-size:.62em;line-height:1.1;text-align:center;color:var(--dim,#8a7860);
                  max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${__badgeEsc(b.title||'')}</div>
    </div>`).join('');

  return `<div class="card">
    <h3 style="margin-top:0;">Badge Case <span class="small muted">(${badges.length})</span></h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">${chips}</div>
  </div>`;
}
