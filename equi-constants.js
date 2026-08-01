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
  "ink-circle": { src: FRAME_IMAGE_BASE+"frame-ink-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(90.58% 50.28%, 87.70% 53.19%, 87.64% 56.11%, 87.25% 59.02%, 86.67% 61.90%, 86.00% 64.78%, 84.60% 67.42%, 83.34% 70.09%, 81.80% 72.62%, 80.10% 75.04%, 78.14% 77.27%, 76.31% 79.59%, 73.83% 81.32%, 71.12% 82.69%, 68.56% 84.13%, 66.01% 85.48%, 63.32% 86.56%, 60.65% 87.55%, 57.94% 88.37%, 55.24% 89.11%, 52.41% 89.35%, 49.61% 89.40%, 46.98% 90.16%, 44.17% 89.31%, 41.51% 89.39%, 38.85% 89.20%, 36.28% 88.40%, 33.78% 87.55%, 31.35% 86.67%, 29.04% 85.53%, 26.89% 84.16%, 24.82% 82.77%, 22.76% 81.46%, 20.80% 80.03%, 18.96% 78.49%, 17.09% 77.01%, 15.48% 75.27%, 13.66% 73.73%, 11.76% 72.20%, 11.19% 69.73%, 8.43% 68.62%, 7.56% 66.35%, 6.54% 64.19%, 10.16% 60.50%, 11.10% 58.10%, 11.08% 56.09%, 3.87% 55.04%, 12.06% 52.14%, 12.46% 50.28%, 14.25% 48.57%, 5.70% 45.76%, 15.06% 45.23%, 14.90% 43.44%, 6.98% 39.03%, 17.34% 40.67%, 17.94% 39.13%, 18.85% 37.73%, 17.16% 34.66%, 18.00% 32.97%, 18.97% 31.31%, 19.98% 29.62%, 21.74% 28.65%, 22.91% 27.01%, 23.95% 25.06%, 25.42% 23.53%, 27.07% 22.18%, 28.80% 20.82%, 30.57% 19.35%, 32.46% 17.87%, 34.48% 16.39%, 36.85% 16.35%, 39.01% 13.69%, 41.51% 15.28%, 43.99% 13.92%, 46.81% 11.62%, 49.52% 11.60%, 52.65% 10.36%, 56.02% 9.25%, 58.83% 10.14%, 60.91% 12.51%, 64.54% 11.98%, 66.20% 14.81%, 68.63% 16.34%, 70.05% 19.04%, 71.46% 21.53%, 77.18% 20.25%, 78.33% 23.16%, 80.29% 25.41%, 80.20% 28.84%, 81.78% 31.21%, 85.88% 32.64%, 87.32% 35.35%, 86.34% 38.75%, 88.50% 41.31%, 89.93% 44.16%, 90.48% 47.20%)" },
  "scalloped-circle": { src: FRAME_IMAGE_BASE+"frame-scalloped-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(97.34% 49.93%, 97.12% 53.03%, 96.82% 56.11%, 96.32% 59.16%, 95.61% 62.17%, 94.72% 65.14%, 93.52% 67.99%, 92.35% 70.85%, 90.89% 73.58%, 89.25% 76.21%, 87.45% 78.72%, 85.49% 81.12%, 83.45% 83.45%, 81.12% 85.49%, 78.72% 87.45%, 76.21% 89.26%, 73.58% 90.89%, 70.85% 92.35%, 67.99% 93.52%, 65.14% 94.72%, 62.17% 95.61%, 59.16% 96.32%, 56.11% 96.82%, 53.03% 97.12%, 49.93% 97.34%, 46.84% 97.12%, 43.76% 96.82%, 40.71% 96.32%, 37.69% 95.61%, 34.73% 94.72%, 31.88% 93.52%, 29.02% 92.35%, 26.29% 90.89%, 23.66% 89.26%, 21.14% 87.45%, 18.75% 85.49%, 16.49% 83.37%, 14.46% 81.04%, 12.42% 78.72%, 10.61% 76.21%, 8.98% 73.58%, 7.52% 70.85%, 6.24% 68.03%, 5.15% 65.14%, 4.25% 62.17%, 3.55% 59.16%, 3.05% 56.11%, 2.74% 53.03%, 2.64% 49.93%, 2.74% 46.84%, 3.05% 43.76%, 3.55% 40.71%, 4.25% 37.69%, 5.15% 34.73%, 6.24% 31.84%, 7.52% 29.02%, 8.98% 26.29%, 10.61% 23.66%, 12.42% 21.15%, 14.46% 18.83%, 16.49% 16.49%, 18.83% 14.46%, 21.14% 12.42%, 23.66% 10.61%, 26.29% 8.98%, 29.02% 7.52%, 31.84% 6.24%, 34.73% 5.15%, 37.69% 4.25%, 40.71% 3.55%, 43.76% 3.05%, 46.84% 2.74%, 49.93% 2.64%, 53.03% 2.74%, 56.11% 3.05%, 59.16% 3.55%, 62.17% 4.25%, 65.14% 5.15%, 68.03% 6.24%, 70.85% 7.52%, 73.58% 8.98%, 76.21% 10.61%, 78.72% 12.42%, 81.04% 14.46%, 83.37% 16.49%, 85.49% 18.75%, 87.45% 21.15%, 89.25% 23.66%, 90.89% 26.29%, 92.35% 29.02%, 93.73% 31.79%, 94.72% 34.73%, 95.61% 37.69%, 96.32% 40.71%, 96.82% 43.76%, 97.12% 46.84%)" },
  "scribble-circle": { src: FRAME_IMAGE_BASE+"frame-scribble-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(90.95% 48.07%, 90.98% 50.71%, 91.06% 53.38%, 91.07% 56.10%, 90.79% 58.81%, 90.23% 61.48%, 89.49% 64.12%, 87.78% 66.32%, 86.15% 68.48%, 84.49% 70.56%, 82.72% 72.50%, 80.92% 74.38%, 79.09% 76.21%, 77.22% 77.99%, 75.32% 79.73%, 73.24% 81.25%, 71.12% 82.73%, 68.96% 84.17%, 66.65% 85.36%, 64.30% 86.50%, 61.81% 87.28%, 59.29% 87.99%, 56.75% 88.65%, 54.15% 89.14%, 51.51% 89.23%, 48.84% 89.59%, 46.19% 89.32%, 43.49% 89.21%, 40.75% 89.03%, 38.12% 88.33%, 35.44% 87.66%, 32.84% 86.71%, 30.29% 85.58%, 28.05% 83.89%, 26.08% 81.89%, 24.33% 79.69%, 22.52% 77.65%, 20.85% 75.50%, 19.34% 73.26%, 17.88% 71.00%, 16.58% 68.65%, 15.34% 66.27%, 14.25% 63.82%, 13.21% 61.33%, 12.23% 58.81%, 11.41% 56.21%, 10.64% 53.56%, 10.38% 50.82%, 10.51% 48.07%, 10.93% 45.35%, 11.52% 42.70%, 12.17% 40.08%, 12.98% 37.53%, 13.95% 35.06%, 15.17% 32.71%, 16.53% 30.47%, 17.93% 28.28%, 19.36% 26.15%, 21.01% 24.19%, 22.61% 22.20%, 24.33% 20.33%, 26.24% 18.66%, 28.11% 16.95%, 30.09% 15.36%, 32.12% 13.80%, 34.26% 12.38%, 36.50% 11.09%, 38.80% 9.85%, 41.19% 8.75%, 43.64% 7.70%, 46.19% 6.81%, 48.84% 6.43%, 51.51% 6.35%, 54.20% 6.21%, 56.91% 6.25%, 59.66% 6.26%, 62.41% 6.56%, 65.15% 7.06%, 67.88% 7.74%, 70.58% 8.61%, 72.68% 10.66%, 75.15% 11.96%, 77.42% 13.62%, 79.50% 15.51%, 80.66% 18.33%, 82.09% 20.71%, 83.51% 23.01%, 84.95% 25.27%, 86.25% 27.60%, 87.39% 30.02%, 88.05% 32.62%, 88.76% 35.17%, 89.40% 37.71%, 89.87% 40.28%, 90.29% 42.86%, 90.65% 45.45%)" },
  "scissor-circle": { src: FRAME_IMAGE_BASE+"frame-scissor-circle.png", shape:"clip", inset:{top:0,left:0,right:0,bottom:0}, clipPath:"polygon(98.40% 50.07%, 99.90% 53.32%, 98.35% 56.40%, 97.47% 59.46%, 99.86% 63.35%, 96.42% 65.73%, 94.84% 68.52%, 99.85% 74.51%, 99.86% 78.68%, 90.37% 76.86%, 99.91% 88.13%, 99.91% 93.57%, 84.28% 84.08%, 82.30% 86.60%, 88.49% 99.87%, 77.04% 90.16%, 74.54% 92.15%, 74.79% 99.84%, 68.68% 94.62%, 65.76% 95.84%, 63.56% 99.86%, 59.59% 97.24%, 56.51% 98.00%, 53.46% 99.91%, 50.19% 98.41%, 47.03% 98.18%, 43.62% 99.83%, 40.73% 97.48%, 37.68% 96.64%, 33.22% 99.93%, 31.41% 95.30%, 28.81% 93.31%, 21.39% 99.84%, 16.81% 99.90%, 20.77% 88.32%, 6.42% 99.86%, 0.28% 99.86%, 13.85% 81.86%, 11.45% 79.72%, 0.03% 83.50%, 8.22% 74.24%, 6.62% 71.51%, -0.06% 70.84%, 4.19% 65.65%, 3.38% 62.58%, -0.00% 60.03%, 2.15% 56.38%, 1.84% 53.24%, 0.00% 50.07%, 1.71% 46.91%, 2.15% 43.77%, -0.00% 40.12%, 3.15% 37.50%, 4.19% 34.50%, 8.85% 32.99%, 9.17% 29.90%, 8.87% 26.28%, 12.98% 25.28%, 15.18% 23.28%, 0.00% 6.17%, 0.02% 0.03%, 18.16% 13.64%, 20.46% 11.43%, 16.61% -0.06%, 25.90% 8.11%, 28.65% 6.50%, 29.37% -0.05%, 34.57% 4.19%, 37.65% 3.39%, 40.20% 0.01%, 43.86% 2.15%, 47.01% 1.72%, 50.19% 0.01%, 53.37% 1.60%, 56.50% 2.27%, 60.17% 0.01%, 62.92% 2.67%, 65.72% 4.42%, 71.00% -0.05%, 74.95% -0.02%, 74.42% 8.21%, 83.77% -0.06%, 88.72% -0.01%, 82.05% 13.83%, 84.54% 15.81%, 99.91% 6.58%, 88.53% 20.72%, 90.48% 23.22%, 99.86% 21.47%, 93.42% 28.81%, 94.84% 31.62%, 99.93% 33.23%, 96.87% 37.60%, 97.47% 40.69%, 99.82% 43.56%, 98.42% 46.92%)" },
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
