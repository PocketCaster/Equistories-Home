// ============================================
// EquiStories — SHARED Railway bank helper
// Load AFTER equi-constants.js (needs RAILWAY_URL).
//
// USAGE: <script src="equi-bank.js"></script>
// ============================================

async function railwayCall(path, { method='POST', idToken=null, body=null } = {}){
  try{
    const headers = { 'Content-Type': 'application/json' };
    if(idToken) headers['Authorization'] = 'Bearer ' + idToken;
    const opts = { method, headers };
    if(body) opts.body = JSON.stringify(body);
    const res = await fetch(RAILWAY_URL + path, opts);
    return await res.json();
  }catch(e){
    return { success:false, error:"Couldn't reach the bank server." };
  }
}

// Ask the bank for a token whose uid IS our bank userId, then adopt it.
// Without this, Firestore rules can't tell who owns what. Shared across
// every page since the flow is identical everywhere.
async function upgradeToOwnerSession(){
  try{
    if(!window.EquiAuth || !window.EquiAuth.user) return false;
    const idToken = await window.EquiAuth.token();
    if(!idToken) return false;
    const r = await railwayCall('/getFirestoreToken', { idToken, body:{} });
    if(r?.success && r.token){
      const ok = await window.EquiAuth.upgradeToOwner(r.token);
      if(ok) console.log('[EquiBank] signed in to Firestore as owner:', r.userId);
      return ok;
    }
    console.warn('[EquiBank] owner token unavailable:', r?.error||'unknown');
  }catch(e){ console.error('[EquiBank] upgrade error:', e); }
  return false;
}
