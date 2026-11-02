/* --- 6. STRICT ADMIN VERIFICATION & LOGIN (PART 2) --- */
function verifyAdminAccess(user) {
  if (!user || !user.email) return false;
  const ADMIN_EMAIL = "mehtaprem362@gmail.com";
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

onAuthStateChanged(auth, async user => {
  if (user) {
    const isRealAdmin = verifyAdminAccess(user);
    if (!isRealAdmin) {
      stopListeners();
      await signOut(auth);
      $('#app')?.classList.add('hidden');
      $('#login')?.classList.remove('hidden');
      if ($('#pinErr')) $('#pinErr').textContent = 'Access Denied! Yeh account Admin nahi hai.';
      return;
    }
    if ($('#pinErr')) $('#pinErr').textContent = '';
    $('#login')?.classList.add('hidden');
    $('#app')?.classList.remove('hidden');
    if (location.hash === '#lst-pending') {
      V = 'lst'; F = 'pending';
    }
    startListeners();
    render();
  } else {
    stopListeners();
    $('#app')?.classList.add('hidden');
    $('#login')?.classList.remove('hidden');
  }
});

async function handleLogin() {
  const emailInput = $('#admEmail');
  const passInput = $('#admPass');
  const errEl = $('#pinErr');
  
  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passInput ? passInput.value : '';
  
  if (!email || !pass) {
    if (errEl) errEl.textContent = 'Admin Email aur Password dono daalein';
    return;
  }
  if (errEl) errEl.textContent = 'Authenticating securely...';
  
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const isRealAdmin = verifyAdminAccess(cred.user);
    if (!isRealAdmin) {
      await signOut(auth);
      if (errEl) errEl.textContent = 'Access Denied! Yeh account Admin nahi hai.';
      return;
    }
    if (errEl) errEl.textContent = '';
    $('#login')?.classList.add('hidden');
    $('#app')?.classList.remove('hidden');
    history.replaceState({ tab: 'dash', flt: 'all', modalOpen: false }, '', '#dash');
    startListeners();
    render();
  } catch (err) {
    console.error("Login Error:", err);
    if (errEl) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errEl.textContent = 'Galat Email ya Password hai.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errEl.textContent = 'Error: Firebase Console mein yeh domain Authorized nahi hai!';
      } else {
        errEl.textContent = 'Error: ' + (err.message || 'Login fail ho gaya');
      }
    }
  }
}

// Safe Button & Enter Key Binding
function bindLoginEvents() {
  const enterBtn = $('#enter');
  const passField = $('#admPass');
  
  if (enterBtn) {
    enterBtn.onclick = handleLogin;
  }
  if (passField) {
    passField.onkeydown = e => { 
      if (e.key === 'Enter') handleLogin(); 
    };
  }
}

// Turant aur DOM load hone par dono jagah bind karein
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindLoginEvents);
} else {
  bindLoginEvents();
}

setTimeout(bindLoginEvents, 400);

const R = document.documentElement;
document.addEventListener('click', async e => {
  const zoomTarget = e.target.closest('[data-zoom]');
  if (zoomTarget) {
    const validSrc = safeImgSrc(zoomTarget.dataset.zoom);
    if (validSrc) {
      $('#zoomImg').src = validSrc;
      $('#imgZoomModal').classList.add('open');
      pushAdminState('#zoom');
    }
    return;
  }

  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;

  try {
    if (a === 'reqNotif') {
      requestAdminNotifPermission();
    }
    else if (a === 'tab') {
      V = t.dataset.v;
      if (t.dataset.f) F = t.dataset.f;
      pushAdminState(`#${V}-${F}`);
      window.scrollTo({ top: 0 });
      render();
    }
    else if (a === 'flt') {
      F = t.dataset.f;
      pushAdminState(`#lst-${F}`);
      render();
    }
    else if (a === 'approve') {
      await updateDoc(doc(db, "listings", id), { status: 'approved' });
      addLog('Approved listing');
      toast('Listing Approved! User App mein live ho gayi ✓');
    }
    else if (a === 'reject') {
      await updateDoc(doc(db, "listings", id), { status: 'rejected' });
      addLog('Rejected listing');
      toast('Listing Rejected');
    }
    else if (a === 'del') {
      if (confirm('Kya aap is listing ko hamesha ke liye delete karna chahte hain?')) {
        await deleteDoc(doc(db, "listings", id));
        addLog('Deleted listing');
        toast('Listing delete ho gayi');
      }
    }
    else if (a === 'uver') {
      const u = D.users.find(x => x.id === id);
      if (u) await updateDoc(doc(db, "users", id), { ver: !u.ver });
    }
    else if (a === 'ublk') {
      const u = D.users.find(x => x.id === id);
      if (u) await updateDoc(doc(db, "users", id), { blk: !u.blk });
    }
    else if (a === 'tog') {
      const o = t.dataset.g === 'ads' ? D.ads[t.dataset.k] : D.set;
      const k = t.dataset.g === 'ads' ? 'on' : t.dataset.k;
      o[k] = !o[k];
      await setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set }, { merge: true });
      toast('Setting live update ho gayi');
    }
    else if (a === 'adsave') {
      await setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set }, { merge: true });
      toast('Ad settings User App par live ho gayi!');
    }
    else if (a === 'pal') R.dataset.pal = t.dataset.p;
    else if (a === 'mode') {
      const c = R.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
      R.dataset.theme = c === 'dark' ? 'light' : 'dark';
    }
    else if (a === 'openAdd') {
      $('#nL').innerHTML = LOCS.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
      $('#nO').innerHTML = (D.users.length ? D.users : INITIAL_USERS).map(u => `<option value="${esc(u.phone)}" data-name="${esc(u.name)}">${esc(u.name)} (${esc(u.phone)})</option>`).join('');
      $('#nErr').textContent = '';
      $('#modal').classList.add('open');
      pushAdminState('#add-listing');
    }
    else if (a === 'closeAdd') {
      $('#modal').classList.remove('open');
      if (location.hash === '#add-listing') history.back();
    }
    else if (a === 'saveAdd') {
      const T = $('#nT').value.trim(), P = $('#nP').value.trim();
      if (!T || !P) { $('#nErr').textContent = 'Title aur price zaroor bharein'; return; }
      const selOpt = $('#nO').selectedOptions[0];
      const ownerPhone = $('#nO').value || '9812300001';
      const ownerName = selOpt ? selOpt.dataset.name : 'Admin';
      const type = $('#nTy').value;

      await addDoc(collection(db, "listings"), {
        title: T.slice(0, 100),
        type,
        loc: $('#nL').value,
        price: P.slice(0, 25),
        numPrice: parseNumericPrice(P),
        u: type === 'Plot' ? '' : '/mo',
        ownerName,
        ownerPhone,
        ownerUid: auth.currentUser ? auth.currentUser.uid : 'admin',
        photos: [],
        consentGiven: true,
        tags: ['Verified', type, $('#nL').value],
        d: `${T} available in ${$('#nL').value}, Patna.`,
        status: 'approved',
        ago: 'Aaj',
        createdAt: Date.now()
      });
      addLog('Nayi listing: ' + T);
      $('#nT').value = $('#nP').value = '';
      $('#modal').classList.remove('open');
      V = 'lst'; F = 'all';
      toast('Listing jud gayi aur User App par live hai!');
    }
    else if (a === 'logout') {
      stopListeners();
      await signOut(auth);
      $('#app').classList.add('hidden');
      $('#login').classList.remove('hidden');
      $('#admEmail').value = $('#admPass').value = '';
    }
  } catch (err) {
    toast('Action failed: Permission ya network check karein');
  }
});

let settingsTimer = null;
document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    Q = e.target.value;
    $('#rows').innerHTML = rows();
  } else if (e.target.dataset.in) {
    const [g, k] = e.target.dataset.in.split('.');
    g === 'ads' ? D.ads[k].code = e.target.value : D.set[k] = e.target.value;
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => {
      setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set }, { merge: true }).catch(() => {});
    }, 500);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
