// ============================================
// EquiStories — SHARED Firestore data layer + auth
// One copy, loaded by every page (Hub, Stable Manager, Shows, Admin) instead
// of each page carrying its own pasted copy. Fix a bug once, it's fixed
// everywhere — this is "Stage 2: shared core" from README-SHELL.md.
//
// Docs are stored as { owner, id, json, updatedAt } everywhere except a
// couple of fields deliberately hoisted OUT of the json blob so Firestore
// RULES and QUERIES can see them (breeds' staffUids, messages' `to`,
// reservations' `reservedFor`) — see putBreed()/putWithField() below.
//
// USAGE: <script type="module" src="equi-core.js"></script>
// Must load AFTER the tiny inline snippet that creates window.__equiDBReady
// (that part stays inline in each page's <head> since it must run
// synchronously before this deferred module does — see equi-shell doc).
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword,
         signOut as fbSignOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJfBnY0sDc6W_yzzrpm8NKkNZv1cu7jMU",
  authDomain: "equistories-rpg.firebaseapp.com",
  projectId: "equistories-rpg",
  storageBucket: "equistories-rpg.firebasestorage.app",
  messagingSenderId: "801283742596",
  appId: "1:801283742596:web:370951947bf862efcfdbd1"
};

let db=null, authOk=false, auth=null;

// ---------------------------------------------------------------------------
// READ COST CONTROL
// The big Firestore-read source on this site is full-collection reads
// (listAll/listAllFlat) that re-run on navigation — e.g. loading every horse
// and profile to render the Members directory. We cache each collection's
// result briefly so repeated views reuse it instead of re-reading. Any write
// to a collection clears its cache so the writer immediately sees fresh data;
// cross-user staleness is bounded by LIST_TTL_MS.
// (Note: Firestore's persistentLocalCache below does NOT reduce online reads
// for one-time getDocs on its own — this in-memory cache is what actually cuts
// the read count.)
const __listCache = new Map();      // col -> { at, data }
const LIST_TTL_MS = 45000;          // 45s
function __cacheGet(col){
  const e = __listCache.get(col);
  if(e && (Date.now() - e.at) < LIST_TTL_MS) return e.data;
  return null;
}
function __cacheSet(col, data){ __listCache.set(col, { at: Date.now(), data }); }
function __cacheClear(col){ if(col){ __listCache.delete('all:'+col); __listCache.delete('flat:'+col); } else __listCache.clear(); }
// Return a deep copy so callers can freely mutate results without corrupting
// the cached copy (cost is local CPU, not a Firestore read).
function __clone(arr){ try{ return JSON.parse(JSON.stringify(arr)); }catch(e){ return arr; } }

const ready = (async()=>{
  try{
    const app = initializeApp(firebaseConfig);
    // Persistent (IndexedDB) cache: mainly gives offline resilience and lets
    // the SDK dedupe some work across tabs. Falls back to the default store if
    // the browser blocks IndexedDB (private mode, etc).
    try{
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    }catch(e){
      console.warn('[EquiDB] persistent cache unavailable, using default store:', e.code||e);
      db = getFirestore(app);
    }
    auth = getAuth(app);
    // Wait for Firebase to restore any existing session before deciding who
    // the user is — otherwise a refresh briefly looks like a signed-out visitor.
    await new Promise(res=>{ const un=onAuthStateChanged(auth, ()=>{ un(); res(); }); });
    if(!auth.currentUser){
      try { await signInAnonymously(auth); } catch(e){ console.warn('[EquiDB] anon auth off:', e.code||e); }
    }
    authOk = !!auth.currentUser;
    return true;
  }catch(e){ console.error('[EquiDB] init failed:', e); db=null; return false; }
})();

const friendlyAuth = e => ({
  'auth/invalid-email':"That email address doesn't look right.",
  'auth/user-not-found':'No account found with that email.',
  'auth/wrong-password':'Incorrect password.',
  'auth/invalid-credential':'Incorrect email or password.',
  'auth/email-already-in-use':'That email already has an account — sign in instead.',
  'auth/weak-password':'Password must be at least 6 characters.',
  'auth/too-many-requests':'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed':'Network problem — check your connection.',
}[e && e.code] || (e && e.message) || 'Something went wrong.');

window.EquiAuth = {
  ready,
  get user(){ return auth && auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null; },
  get uid(){ return auth && auth.currentUser ? auth.currentUser.uid : null; },
  get email(){ const u=this.user; return u ? u.email : ''; },
  async token(){ const u=this.user; if(!u) return null; try{ return await u.getIdToken(); }catch(e){ return null; } },
  async signIn(email,password){
    try{ const c=await signInWithEmailAndPassword(auth,email,password); return {success:true,user:c.user}; }
    catch(e){ return {success:false,error:friendlyAuth(e)}; }
  },
  async signUp(email,password){
    try{ const c=await createUserWithEmailAndPassword(auth,email,password); return {success:true,user:c.user}; }
    catch(e){ return {success:false,error:friendlyAuth(e)}; }
  },
  async resetPassword(email){
    try{ await sendPasswordResetEmail(auth,email); return {success:true}; }
    catch(e){ return {success:false,error:friendlyAuth(e)}; }
  },
  async changePassword(newPassword){
    try{ await updatePassword(auth.currentUser, newPassword); return {success:true}; }
    catch(e){ return {success:false,error:friendlyAuth(e)}; }
  },
  // Swap the random email-account session for one whose uid IS the bank userId.
  // After this, Firestore rules can trust request.auth.uid as the true owner.
  async upgradeToOwner(customToken){
    try{ await signInWithCustomToken(auth, customToken); return true; }
    catch(e){ console.error('[EquiAuth] owner upgrade failed:', e.code||e); return false; }
  },
  async signOut(){
    try{ await fbSignOut(auth); }catch(e){}
    try{ await signInAnonymously(auth); }catch(e){}   // keep writes working pre-migration
  },
};

window.EquiDB = {
  // Any write can be rejected if the Firestore session isn't yet signed in as
  // the bank-owner uid the rules expect. Rather than make every caller on every
  // page remember to upgrade first, we recover HERE: on a permission-denied,
  // upgrade the owner session once and retry the write a single time. This is
  // what makes friend accepts, association joins/posts, etc. reliable no matter
  // when they're clicked. A second failure (or any non-permission error) throws
  // as normal, so genuine "you can't write this" errors aren't masked.
  async _ownerRetry(op){
    try{ return await op(); }
    catch(e){
      const denied = e && (e.code === 'permission-denied' || e.code === 'firestore/permission-denied');
      if(denied && typeof window.upgradeToOwnerSession === 'function'){
        try{ await window.upgradeToOwnerSession(); }catch(_){}
        return await op();
      }
      throw e;
    }
  },
  ready,
  get available(){ return !!db; },
  get authed(){ return authOk; },

  async put(col,id,owner,obj){
    if(!db) return false;
    const rec = { owner:String(owner), id:String(id),
      json:JSON.stringify(obj), updatedAt:new Date().toISOString() };
    await this._ownerRetry(()=> setDoc(doc(db,col,String(id)), rec));
    __cacheClear(col);
    return true;
  },

  // Breeds need their staff list readable by Firestore RULES (which can't parse
  // the json string), so we mirror it as a flat top-level array. Same envelope
  // otherwise — reads still come back through get()/listAll() unchanged.
  async putBreed(id, owner, obj){
    if(!db) return false;
    const staffUids = Array.isArray(obj.staff) ? obj.staff.map(String) : [];
    const rec = { owner:String(owner), id:String(id),
      json:JSON.stringify(obj), staffUids, updatedAt:new Date().toISOString() };
    await this._ownerRetry(()=> setDoc(doc(db,'breeds',String(id)), rec));
    __cacheClear('breeds');
    return true;
  },

  // Like put(), but keeps one field OUTSIDE the json blob so security rules and
  // queries can see it. Firestore can't read inside the blob — a private message
  // needs `to` hoisted here so a rule can restrict reads to the recipient; a
  // breeding reservation needs `reservedFor` the same way.
  async putWithField(col,id,owner,obj,field,value){
    if(!db) return false;
    const rec={ owner:String(owner), id:String(id),
      json:JSON.stringify(obj), updatedAt:new Date().toISOString() };
    rec[field]=String(value);
    await this._ownerRetry(()=> setDoc(doc(db,col,String(id)), rec));
    __cacheClear(col);
    return true;
  },

  async get(col,id){
    if(!db) return null;
    const s=await getDoc(doc(db,col,String(id)));
    if(!s.exists()) return null;
    try{ return JSON.parse(s.data().json); }catch(e){ return null; }
  },

  async remove(col,id){ if(!db) return false; await this._ownerRetry(()=> deleteDoc(doc(db,col,String(id)))); __cacheClear(col); return true; },

  // Indexed lookup on any hoisted field, e.g. every reservation set aside for me.
  async listByField(col,field,value){
    if(!db) return [];
    const snap=await getDocs(query(collection(db,col), where(field,'==',String(value))));
    const out=[]; snap.forEach(d=>{ try{ const o=JSON.parse(d.data().json); o.__owner=d.data().owner; o.__id=d.id; out.push(o); }catch(e){} });
    return out;
  },

  async listByOwner(col,owner){
    if(!db) return [];
    const snap=await getDocs(query(collection(db,col), where('owner','==',String(owner))));
    const out=[]; snap.forEach(d=>{ try{ out.push(JSON.parse(d.data().json)); }catch(e){} });
    return out;
  },

  // Whole-collection reads (every member, every show, every custom breed).
  // Fine for small-to-medium collections; avoid on horses/riders at scale.
  async listAll(col){
    if(!db) return [];
    const cached = __cacheGet('all:'+col);
    if(cached) return __clone(cached);
    const snap=await getDocs(collection(db,col));
    const out=[];
    snap.forEach(d=>{ try{ const v=JSON.parse(d.data().json); v.__owner=d.data().owner; v.__id=d.id; out.push(v); }catch(e){} });
    __cacheSet('all:'+col, out);
    return __clone(out);
  },

  // Like listAll(), but for the OTHER collection shape used on this site —
  // flat documents with real fields (bankAccounts, businesses, items,
  // legacyAccounts, linkedAccounts, notifications, etc — everything the
  // Railway bank server writes directly, without the owner/id/json
  // envelope). Returns each doc's actual fields plus its id.
  // Like listAllFlat() but for a SUBcollection (e.g. forumThreads/{id}/replies).
  async listSub(parentCol, parentId, subCol){
    if(!db) return [];
    const snap = await getDocs(collection(db, parentCol, String(parentId), subCol));
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
  },
  // Cheap server-side count of a subcollection (one read, doesn't fetch the
  // docs). Used so forum reply counts stay accurate without relying on a
  // stored counter that non-owners can't write.
  async countSub(parentCol, parentId, subCol){
    if(!db) return 0;
    try{
      const { getCountFromServer } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getCountFromServer(collection(db, parentCol, String(parentId), subCol));
      return snap.data().count;
    }catch(e){
      try{ const s = await getDocs(collection(db, parentCol, String(parentId), subCol)); return s.size; }catch(_){ return 0; }
    }
  },

  // Auto-ID create in a subcollection. Returns the new doc's id, or null.
  async addSub(parentCol, parentId, subCol, data){
    if(!db) return null;
    const { addDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const ref = await this._ownerRetry(()=> addDoc(collection(db, parentCol, String(parentId), subCol), data));
    // A subcollection write (e.g. a new forum reply) changes what derived views
    // of the PARENT show — reply counts, last-post, thread ordering. Drop the
    // parent's cached listAll so the next board render re-reads fresh instead of
    // serving a stale copy for up to LIST_TTL_MS.
    __cacheClear(parentCol);
    return ref.id;
  },

  // Merge-update one doc in a subcollection (edits, reactions, etc).
  async updateSub(parentCol, parentId, subCol, docId, fields){
    if(!db) return false;
    await this._ownerRetry(()=> setDoc(doc(db, parentCol, String(parentId), subCol, String(docId)), fields, { merge: true }));
    __cacheClear(parentCol);
    return true;
  },

  async deleteSub(parentCol, parentId, subCol, docId){
    if(!db) return false;
    await this._ownerRetry(()=> deleteDoc(doc(db, parentCol, String(parentId), subCol, String(docId))));
    __cacheClear(parentCol);
    return true;
  },

  async listAllFlat(col){
    if(!db) return [];
    const cached = __cacheGet('flat:'+col);
    if(cached) return __clone(cached);
    const snap = await getDocs(collection(db, col));
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    __cacheSet('flat:'+col, out);
    return __clone(out);
  },

  // Write to a flat-schema doc (see listAllFlat above). merge:true by
  // default so a partial update doesn't wipe fields you didn't pass.
  async setFlat(col, id, fields){
    if(!db) return false;
    await this._ownerRetry(()=> setDoc(doc(db, col, String(id)), fields, { merge: true }));
    __cacheClear(col);
    return true;
  },

  // Raw rows including hoisted fields, for diagnostics — listAll() only
  // returns the parsed json, which hides the very fields a query matches on.
  async listAllRaw(col){
    if(!db) return [];
    const snap = await getDocs(collection(db, col));
    const out=[];
    snap.forEach(d=>{
      const raw=d.data()||{};
      let body={}; try{ body=JSON.parse(raw.json||"{}"); }catch(e){}
      out.push({docId:d.id, owner:raw.owner, reservedFor:raw.reservedFor, body});
    });
    return out;
  },

  // Bulk write for one-time migrations (batched = far fewer round trips).
  async putMany(col, owner, items){
    if(!db) return 0;
    let done=0;
    for(let i=0;i<items.length;i+=400){
      const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const batch = writeBatch(db);
      items.slice(i,i+400).forEach(it=>{
        batch.set(doc(db,col,String(it.id)), { owner:String(owner), id:String(it.id),
          json:JSON.stringify(it), updatedAt:new Date().toISOString() });
      });
      await batch.commit();
      done += Math.min(400, items.length-i);
    }
    __cacheClear(col);
    return done;
  },

  // Force-refresh the read cache (all collections, or one). Call after an
  // out-of-band change you want reflected immediately.
  clearListCache(col){ __cacheClear(col||null); },
};

ready.then(v=>{ try{ window.__equiDBResolve(v); }catch(e){} })
     .catch(()=>{ try{ window.__equiDBResolve(false); }catch(e){} });
