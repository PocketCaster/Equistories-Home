// ===========================================================================
// equi-imageupload.js  —  Direct Image Upload (PART 2, build-later feature)
// ---------------------------------------------------------------------------
// NOT WIRED IN YET. This is a self-contained module you can activate once you
// have premium backers. It:
//   1. Compresses a chosen file to WebP (keeps full resolution up to 3000px,
//      80% quality) so a 12 MB PNG becomes ~500 KB before it ever uploads.
//   2. Uploads the compressed blob straight to Firebase Storage (no server).
//   3. Tracks per-user storage against a 5 GB cap in the user's Firestore doc.
//
// To turn it on later:
//   • In Firebase Console → Storage, click "Get started" to create a bucket.
//   • Add this to the pages that need uploads (AFTER equi-core.js):
//         <script type="module" src="equi-imageupload.js?v=1"></script>
//   • Give an <input type="file" accept="image/*"> and, on change, call
//     EquiUpload.handleFileInput(inputEl, userId).then(url => { ... use url ... })
//   • Paste the Storage security rules from PART 3 into Storage → Rules.
// ===========================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Reuse the already-initialised Firebase app if one exists (equi-core.js makes
// it); otherwise you can init here with the same config.
const app = getApps().length ? getApp() : initializeApp(/* same firebaseConfig */);
const storage = getStorage(app);
const db = getFirestore(app);

const FIVE_GB = 5 * 1024 * 1024 * 1024;   // 5,368,709,120 bytes
const MAX_DIM = 3000;                      // longest edge kept, in px
const WEBP_QUALITY = 0.80;                 // 80% visual quality

// ---------------------------------------------------------------------------
// 1) CLIENT-SIDE WEBP COMPRESSION
// Draws the chosen image onto a canvas (downscaled only if bigger than
// MAX_DIM on its longest edge) and exports an image/webp Blob.
// ---------------------------------------------------------------------------
export async function compressToWebP(file, { maxDim = MAX_DIM, quality = WEBP_QUALITY } = {}){
  if(!file || !file.type || !file.type.startsWith('image/')){
    throw new Error('Please choose an image file.');
  }
  const bitmap = await loadBitmap(file);
  let { width, height } = bitmap;

  // Keep the artist's resolution up to maxDim; scale down proportionally if larger.
  const longest = Math.max(width, height);
  if(longest > maxDim){
    const scale = maxDim / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if(bitmap.close) bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('WebP export failed.')), 'image/webp', quality);
  });
  return blob;   // an image/webp Blob, typically a fraction of the original size
}

// createImageBitmap is fastest; fall back to an <img> for older browsers.
async function loadBitmap(file){
  if(window.createImageBitmap){
    try{ return await createImageBitmap(file); }catch(e){/* fall through */}
  }
  const url = URL.createObjectURL(file);
  try{
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    return img;
  } finally { URL.revokeObjectURL(url); }
}

// ---------------------------------------------------------------------------
// 2) + 3) QUOTA CHECK → DIRECT UPLOAD → USAGE INCREMENT
// ---------------------------------------------------------------------------

// Read the user's current usage (0 if the field/doc doesn't exist yet).
async function getUsedBytes(userId){
  try{
    const snap = await getDoc(doc(db, 'users', String(userId)));
    const n = snap.exists() ? Number(snap.data().totalStorageUsedBytes || 0) : 0;
    return Number.isFinite(n) ? n : 0;
  }catch(e){ return 0; }
}

// Atomically add `bytes` to the user's usage counter (creates the field if
// missing). increment() avoids the race where two uploads overwrite each other.
async function addUsedBytes(userId, bytes){
  const uref = doc(db, 'users', String(userId));
  try{
    await updateDoc(uref, { totalStorageUsedBytes: increment(bytes) });
  }catch(e){
    // Doc may not exist yet — create it with the starting value.
    await setDoc(uref, { totalStorageUsedBytes: bytes }, { merge: true });
  }
}

// The full pipeline: compress → check 5 GB cap → upload → record usage.
// Returns the public download URL on success; throws with a friendly message
// if the user is over quota or something fails.
export async function uploadArtwork(file, userId, { onProgress } = {}){
  if(!userId) throw new Error('You must be signed in to upload.');

  if(onProgress) onProgress('Compressing…');
  const blob = await compressToWebP(file);
  const size = blob.size;

  // 5 GB per-user cap (checked against the COMPRESSED size that will be stored).
  const used = await getUsedBytes(userId);
  if(used + size > FIVE_GB){
    const gb = (b) => (b / (1024*1024*1024)).toFixed(2);
    throw new Error(`Storage full: this would use ${gb(used+size)} GB of your 5 GB limit. Free some space and try again.`);
  }

  if(onProgress) onProgress('Uploading…');
  // "Upload and forget": straight to the user's own folder, no server hop.
  const path = `users/${userId}/${Date.now()}-${randomId()}.webp`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: 'image/webp' });
  const url = await getDownloadURL(fileRef);

  // Only count usage AFTER a successful upload.
  await addUsedBytes(userId, size);
  if(onProgress) onProgress('Done');
  return { url, path, bytes: size };
}

// Convenience wrapper for a plain <input type="file"> element.
export async function handleFileInput(inputEl, userId, opts){
  const file = inputEl && inputEl.files && inputEl.files[0];
  if(!file) throw new Error('No file selected.');
  return uploadArtwork(file, userId, opts);
}

function randomId(){ return Math.random().toString(36).slice(2, 10); }

// Expose on window so non-module page code can call it too.
window.EquiUpload = { compressToWebP, uploadArtwork, handleFileInput, getUsedBytes };
