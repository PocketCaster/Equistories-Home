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
  "ink-circle":       { src: FRAME_IMAGE_BASE+"frame-ink-circle.png",       shape:"circle", inset:{top:15.73,left:17.4, right:12.93,bottom:12.03} },
  "scalloped-circle": { src: FRAME_IMAGE_BASE+"frame-scalloped-circle.png", shape:"circle", inset:{top:3.61, left:3.61, right:3.72, bottom:3.72} },
  "scribble-circle":  { src: FRAME_IMAGE_BASE+"frame-scribble-circle.png",  shape:"circle", inset:{top:9.32, left:12.46,right:10.1, bottom:12.06} },
  "scissor-circle":   { src: FRAME_IMAGE_BASE+"frame-scissor-circle.png",   shape:"circle", inset:{top:2.22, left:2.35, right:2.6,  bottom:2.59} },
  "rose-corners":     { src: FRAME_IMAGE_BASE+"frame-rose-corners.png",     shape:"square", inset:{top:1,    left:1,    right:1,    bottom:1} },
  "gold-key":         { src: FRAME_IMAGE_BASE+"frame-gold-key.png",         shape:"square", inset:{top:0.83, left:0.82, right:0.82, bottom:0.83} },
  "bracket-plaque":   { src: FRAME_IMAGE_BASE+"frame-bracket-plaque.png",   shape:"square", inset:{top:10.44,left:10.52,right:10.89,bottom:11.12} },
  // Ornate Gold: the photo is clipped to a polygon traced from the actual
  // arch/scrollwork silhouette instead of a plain rounded rectangle.
  "ornate-gold": { src: FRAME_IMAGE_BASE+"frame-ornate-gold.png", shape:"clip",
    clipPath: "polygon(48.38% 1.21%, 34.28% 2.86%, 28.21% 4.51%, 23.75% 6.16%, 22.47% 7.82%, 22.43% 9.47%, 15.86% 11.13%, 14.04% 12.78%, 9.4% 14.44%, 8.35% 16.09%, 8.43% 17.74%, 7.43% 19.39%, 4.25% 21.05%, 5.77% 22.71%, 6.76% 24.36%, 4.33% 26.01%, 4.33% 27.66%, 4.33% 29.31%, 4.33% 30.98%, 4.33% 32.63%, 4.33% 34.28%, 4.33% 35.93%, 4.33% 37.58%, 4.33% 39.23%, 4.33% 40.9%, 4.33% 42.55%, 4.33% 44.2%, 4.33% 45.85%, 4.33% 47.5%, 4.33% 49.16%, 4.33% 50.82%, 4.33% 52.47%, 4.33% 54.12%, 4.33% 55.77%, 4.33% 57.43%, 4.33% 59.08%, 4.33% 60.74%, 4.33% 62.39%, 4.33% 64.04%, 4.33% 65.7%, 4.33% 67.35%, 4.33% 69.0%, 4.33% 70.66%, 4.33% 72.31%, 4.33% 73.97%, 6.74% 75.62%, 5.8% 77.27%, 4.23% 78.92%, 7.43% 80.58%, 8.41% 82.24%, 8.35% 83.89%, 9.48% 85.54%, 14.02% 87.19%, 15.86% 88.84%, 22.43% 90.51%, 22.49% 92.16%, 23.71% 93.81%, 28.17% 95.46%, 34.23% 97.11%, 48.29% 98.78%, 51.7% 98.78%, 65.75% 97.11%, 71.81% 95.46%, 76.25% 93.81%, 77.49% 92.16%, 77.55% 90.51%, 84.12% 88.84%, 85.96% 87.19%, 90.5% 85.54%, 91.63% 83.89%, 91.55% 82.24%, 92.55% 80.58%, 95.75% 78.92%, 94.16% 77.27%, 93.24% 75.62%, 95.65% 73.97%, 95.65% 72.31%, 95.65% 70.66%, 95.65% 69.0%, 95.65% 67.35%, 95.65% 65.7%, 95.65% 64.04%, 95.65% 62.39%, 95.63% 60.74%, 95.63% 59.08%, 95.63% 57.43%, 95.63% 55.77%, 95.63% 54.12%, 95.63% 52.47%, 95.63% 50.82%, 95.63% 49.16%, 95.63% 47.5%, 95.63% 45.85%, 95.63% 44.2%, 95.63% 42.55%, 95.63% 40.9%, 95.63% 39.23%, 95.65% 37.58%, 95.65% 35.93%, 95.65% 34.28%, 95.65% 32.63%, 95.65% 30.98%, 95.65% 29.31%, 95.65% 27.66%, 95.65% 26.01%, 93.22% 24.36%, 94.22% 22.71%, 95.73% 21.05%, 92.53% 19.39%, 91.55% 17.74%, 91.63% 16.09%, 90.56% 14.44%, 85.92% 12.78%, 84.1% 11.13%, 77.53% 9.47%, 77.51% 7.82%, 76.23% 6.16%, 71.77% 4.51%, 65.7% 2.86%, 51.58% 1.21%)",
    inset:{top:0,left:0,right:0,bottom:0} },
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
    return `<div class="equi-frame-img" style="position:relative;width:${dim};height:${dim};"${cap}>
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
  .equi-frame-standalone--floral > div{ width:100%; height:100%; border-radius:50%; display:block; }
  .equi-frame-standalone--starburst{
    display:inline-block; position:relative; border-radius:50%; overflow:visible;
    border:3px dashed #c9a84c; box-shadow:0 0 0 2px var(--panel,#1a130c);
    box-sizing:border-box;
  }
  .equi-frame-standalone--starburst img,
  .equi-frame-standalone--starburst > div{ width:100%; height:100%; border-radius:50%; display:block; }
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
function isPremiumMember(uid){ return !!uid && (PREMIUM_MEMBERS.includes(uid) || hasActiveStoredPremium(uid)); }
// Per-stat gear cap: regular +2, premium +3, admin unlimited.
function gearStatCap(uid){ return isAdminMember(uid) ? Infinity : (isPremiumMember(uid) ? 3 : 2); }
// A small crown badge shown beside premium members' names.
function premiumBadge(uid){
  if(!isPremiumMember(uid)) return "";
  return ` <span title="Premium member" style="display:inline-block;font-size:.85em;color:var(--equi-brass-light);vertical-align:baseline;">&#128081;</span>`;
}
// A proper gold pill badge for site admins — always dark text on a bright
// gold-shine background, so contrast can't accidentally regress the way the
// plain ".tag" (muted text, meant for low-key labels) did on the profile
// header. One definition, used everywhere "admin" needs to show up.
function adminBadge(uid){
  if(!isAdminMember(uid)) return "";
  return ` <span title="Site admin" style="display:inline-flex;align-items:center;gap:4px;font-size:.72em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:var(--gold-shine, linear-gradient(135deg,#e8c97a,#c9a84c));color:#241a14;box-shadow:0 1px 3px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.4);vertical-align:middle;line-height:1.6;">Admin</span>`;
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
