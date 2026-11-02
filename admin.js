import { 
  db, auth, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, getDocs,
  signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "./firebase-config.js";

const $ = s => document.querySelector(s);
const ic = (n, c = '') => `<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;

const esc = str => String(str ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

const LOCS = [
  'Boring Road', 'Kankarbagh', 'Rajendra Nagar', 'Patliputra', 'Bailey Road', 
  'Danapur', 'Kumhrar', 'Ashok Rajpath', 'Fraser Road', 'Exhibition Road', 
  'Gandhi Maidan', 'Anisabad', 'Phulwari Sharif', 'Digha', 'Rajiv Nagar', 
  'Keshri Nagar', 'Ashiana Nagar', 'Rukanpura', 'Saguna More', 'Gola Road', 
  'RPS More', 'Khajpura', 'Jagdeo Path', 'Raja Bazar', 'Punaichak', 
  'Shivpuri', 'Patel Nagar', 'Shastri Nagar', 'Gardanibagh', 'Mithapur', 
  'Sipara', 'Beur', 'ByPass Road', 'Zero Mile', 'Bazar Samiti', 
  'Musallahpur Hat', 'Bhikhna Pahari', 'Mahendru', 'Sultanganj', 'Agamkuan', 
  'Gulzarbagh', 'Patna City', 'Didarganj', 'Fatuha', 'Khagaul', 'Neora', 'Bihta'
];

const INITIAL_USERS = [
  { id: '9812300001', name: 'Ramesh Kumar', phone: '9812300001', ver: true, blk: false },
  { id: '9934500002', name: 'Sunita Devi', phone: '9934500002', ver: true, blk: false }
];

let D = {
  users: [],
  listings: [],
  ads: { home: { on: false, code: '' }, feed: { on: false, code: '' } },
  set: { name: 'AwasPatna', wa: '', free: true, maint: false },
  log: ['Firebase Secure Admin Active ✓']
};

let knownPendingIds = new Set();
let firstAdminLoadDone = false;

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.opacity = 1;
  t.style.transform = 'translate(-50%,-8px)';
  clearTimeout(toast.x);
  toast.x = setTimeout(() => {
    t.style.opacity = 0;
    t.style.transform = 'translate(-50%,0)';
  }, 2600);
}

/* --- 1. 7-SECOND INSTALL POPUP & HEADER INSTALL BUTTON --- */
let deferredInstallPrompt = null;
const installPopup = $('#installPopup');

// Auto-hide install popup after exactly 7 seconds (7000ms)
const popupTimer = setTimeout(() => {
  if (installPopup) {
    installPopup.style.opacity = '0';
    installPopup.style.pointerEvents = 'none';
    setTimeout(() => installPopup.classList.add('hidden'), 300);
  }
}, 7000);

$('#popupCloseBtn').onclick = () => {
  clearTimeout(popupTimer);
  installPopup.classList.add('hidden');
};

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

async function triggerAppInstall() {
  installPopup?.classList.add('hidden');
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') toast('App Install Ho Raha Hai ✓');
    deferredInstallPrompt = null;
  } else {
    toast('Chrome ke 3-dot menu (⋮) par tap karke "Add to Home screen / Install App" chunein');
  }
}

$('#topInstallBtn').onclick = triggerAppInstall;
$('#popupInstallBtn').onclick = triggerAppInstall;

/* --- 2. ADMIN APPROVAL NOTIFICATION & SOUND ENGINE --- */
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

async function requestAdminNotifPermission() {
  if (!('Notification' in window)) {
    toast('Browser notification support nahi karta');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    $('#notifDot')?.classList.replace('bg-yellow-300', 'bg-green-400');
    toast('Approval Notifications ON ho gayi ✓');
    sendAdminNotification('Admin Alerts Chalu Hain ✓', 'Jab bhi koi customer nayi listing daalega, aapko turant notification milega.');
  } else {
    toast('Kripya browser settings mein Notification Allow karein');
  }
}

async function sendAdminNotification(title, body) {
  playAlertBeep();
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
      reg.showNotification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2345/2345338.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2345/2345338.png',
        vibrate: [300, 120, 300],
        tag: 'admin-approval-' + Date.now()
      });
    } else {
      new Notification(title, { body });
    }
  } catch (e) {}
}

$('#admNotifBtn').onclick = requestAdminNotifPermission;
if ('Notification' in window && Notification.permission === 'granted') {
  $('#notifDot')?.classList.replace('bg-yellow-300', 'bg-green-400');
}

const addLog = m => {
  D.log.unshift(m);
  D.log = D.log.slice(0, 8);
  setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set, log: D.log }, { merge: true }).catch(() => {});
};

/* --- 3. REAL-TIME FIRESTORE LISTENERS (DETECTS NEW PENDING LISTINGS) --- */
let listenersStarted = false;
function startListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  onSnapshot(collection(db, "listings"), snap => {
    const arr = [];
    snap.forEach(dc => {
      const data = dc.data();
      const item = { id: dc.id, ...data };
      arr.push(item);

      // Check if a brand-new PENDING listing arrived for approval
      if (data.status === 'pending') {
        if (firstAdminLoadDone && !knownPendingIds.has(dc.id)) {
          const alertTitle = `🔔 Approval Chahiye: ${data.type || 'Room'} in ${data.loc || 'Patna'}`;
          const alertBody = `${data.title} (${data.price}) · Owner: ${data.ownerName || ''} (+91 ${data.ownerPhone || ''})`;
          sendAdminNotification(alertTitle, alertBody);
          toast(`🔔 Nayi Pending Listing: ${data.title}`);
        }
        knownPendingIds.add(dc.id);
      }
    });
    firstAdminLoadDone = true;
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    D.listings = arr;
    render();
  }, () => {});

  onSnapshot(collection(db, "users"), snap => {
    const arr = [];
    snap.forEach(dc => arr.push({ id: dc.id, ...dc.data() }));
    D.users = arr;
    render();
  }, () => {});

  onSnapshot(doc(db, "settings", "config"), snap => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.ads) D.ads = data.ads;
      if (data.set) D.set = { ...D.set, ...data.set };
      if (data.log) D.log = data.log;
      render();
    }
  }, () => {});
}

/* --- 4. BACK BUTTON ROUTER --- */
let V = 'dash', F = 'all', Q = '';
const TABS = [
  ['dash', 'grid', 'Dashboard'],
  ['lst', 'list', 'Listings'],
  ['usr', 'users', 'Users'],
  ['adv', 'ad', 'Ads'],
  ['stg', 'gear', 'Settings']
];
const stc = { approved: ['ok', 'Approved'], pending: ['wt', 'Pending Approval'], rejected: ['no', 'Rejected'] };

function pushAdminState(hash = '') {
  history.pushState({ tab: V, flt: F, modalOpen: $('#modal').classList.contains('open') }, '', hash || `#${V}-${F}`);
}

window.addEventListener('popstate', e => {
  if ($('#imgZoomModal').classList.contains('open')) {
    $('#imgZoomModal').classList.remove('open');
    return;
  }
  if ($('#modal').classList.contains('open')) {
    $('#modal').classList.remove('open');
    return;
  }
  const st = e.state || { tab: 'dash', flt: 'all' };
  V = st.tab || 'dash';
  F = st.flt || 'all';
  window.scrollTo({ top: 0 });
  render();
});

/* --- 5. VIEWS (WITH CLIENT IMAGES & FULL DETAILS IN LISTINGS) --- */
function dash() {
  const pendCount = D.listings.filter(l => l.status === 'pending').length;
  const st = [
    ['Total Listings', D.listings.length, 'list', 1],
    ['Pending Approval', pendCount, 'ad', 0],
    ['Verified Owners', D.users.filter(u => u.ver).length, 'shield', 0],
    ['Total Users', D.users.length, 'users', 0]
  ];
  const notifGranted = ('Notification' in window && Notification.permission === 'granted');

  return `
  ${!notifGranted ? `
    <div class="cd p-3.5 mb-3.5 flex items-center justify-between gap-2" style="border:1.5px dashed var(--a)">
      <div class="text-xs font-bold">🔔 Nayi listing aane par phone alert paayein</div>
      <button data-a="reqNotif" class="ab grad shrink-0">Allow Alerts</button>
    </div>` : ''}
  ${pendCount > 0 ? `
    <div class="cd p-4 mb-4 flex items-center justify-between gap-3" style="background:#fef3c7;color:#92400e;border-color:#fde68a">
      <div>
        <div class="hd font-extrabold text-sm">⚠️ ${pendCount} Listing Approval Ke Liye Ruki Hai!</div>
        <div class="text-xs font-semibold">Photo aur details dekh kar approve karein</div>
      </div>
      <button data-a="tab" data-v="lst" data-f="pending" class="ab" style="background:#d97706;color:#fff">Dekhein →</button>
    </div>` : ''}
  <div class="grid grid-cols-2 gap-3">${st.map(([l, v, i, g]) => `<div class="${g ? 'grad' : 'cd'} p-4 row" style="border-radius:22px"><span class="${g ? 'bg-white/25' : 'soft'} w-10 h-10 rounded-2xl grid place-items-center">${ic(i)}</span><div class="hd font-extrabold text-3xl mt-3">${v}</div><div class="text-xs font-bold ${g ? 'opacity-85' : ''}" style="${g ? '' : 'color:var(--mut)'}">${l}</div></div>`).join('')}</div>
  <div class="cd p-4 mt-4 row"><h3 class="hd font-bold mb-2">Recent activity</h3>${D.log.map(m => `<div class="flex items-center gap-2.5 py-2 text-[13px] font-semibold" style="border-top:1px solid var(--line)"><span class="w-2 h-2 rounded-full grad"></span>${esc(m)}</div>`).join('')}</div>`;
}

function rows() {
  const q = Q.toLowerCase();
  const L = D.listings.filter(l => (F === 'all' || l.status === F) && (!q || (l.title + l.loc + l.type + (l.ownerName || '') + (l.ownerPhone || '') + (l.d || '')).toLowerCase().includes(q)));
  if (!L.length) return `<div class="cd p-8 text-center text-sm font-bold" style="color:var(--mut)">Is filter mein koi listing nahi mili</div>`;

  return L.map((l, i) => {
    const [c, t] = stc[l.status] || stc.pending;
    const photos = Array.isArray(l.photos) ? l.photos.filter(Boolean) : [];
    const tags = Array.isArray(l.tags) ? l.tags : [];
    const cleanPh = String(l.ownerPhone || '').replace(/\D/g, '').slice(-10);

    // Client uploaded photos preview (Tap to zoom full screen)
    const photoBlock = photos.length > 0 ? `
      <div class="mt-3">
        <div class="text-[10.5px] font-extrabold mb-1.5" style="color:var(--mut)">CLIENT UPLOADED PHOTOS (${photos.length}) · Tap to Zoom:</div>
        <div class="grid ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2">
          ${photos.map((src, idx) => `
            <div class="relative rounded-2xl overflow-hidden border cursor-pointer" style="aspect-ratio:16/10;border-color:var(--line)">
              <img src="${esc(src)}" data-zoom="${esc(src)}" class="w-full h-full object-cover" alt="Photo ${idx + 1}">
              <span class="absolute bottom-1.5 right-2 bg-black/65 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Photo ${idx + 1} 🔍</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="mt-2.5 p-2.5 rounded-xl text-xs font-bold text-center" style="background:var(--bg);color:var(--mut)">
        ⚠️ Client ne koi real photo upload nahi ki hai (Default Graphic)
      </div>
    `;

    return `<div class="cd p-4 mb-4 row" style="animation-delay:${i * 40}ms;border:${l.status === 'pending' ? '2px solid #f59e0b' : '1px solid var(--line)'}">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <span class="st ${c} inline-block mb-1.5">${t}</span>
          <b class="hd text-[16px] leading-snug block">${esc(l.title)}</b>
          <div class="text-xs font-extrabold mt-1" style="color:var(--a)">
            ${esc(l.type || 'Room')} · 📍 ${esc(l.loc || 'Patna')} · ${esc(l.price)}${esc(l.u || '')}
          </div>
        </div>
      </div>

      ${photoBlock}

      <!-- FULL DESCRIPTION & TAGS -->
      <div class="mt-3 p-3 rounded-2xl text-xs leading-relaxed" style="background:var(--bg)">
        <div class="font-bold mb-1" style="color:var(--tx)">Pura Details / Description:</div>
        <p style="color:var(--mut)">${esc(l.d || 'Koi description nahi likha gaya hai.')}</p>
        ${tags.length ? `<div class="flex flex-wrap gap-1.5 mt-2">${tags.map(tg => `<span class="px-2 py-0.5 rounded-full text-[10.5px] font-bold soft">${esc(tg)}</span>`).join('')}</div>` : ''}
      </div>

      <!-- OWNER INFO & DIRECT CONTACT -->
      <div class="mt-2.5 flex items-center justify-between text-xs font-bold px-1">
        <span>👤 Owner: ${esc(l.ownerName || 'User')}</span>
        ${cleanPh ? `<a href="tel:+91${esc(cleanPh)}" class="underline" style="color:var(--a)">📞 +91 ${esc(cleanPh)}</a>` : ''}
      </div>

      <!-- ADMIN ACTION BUTTONS -->
      <div class="flex flex-wrap gap-2 mt-3.5 pt-3" style="border-top:1px solid var(--line)">
        ${l.status !== 'approved' ? `<button data-a="approve" data-id="${esc(l.id)}" class="ab ok flex-1 justify-center !h-10">${ic('check', '!w-4 !h-4')}Approve & Live</button>` : ''}
        ${l.status !== 'rejected' ? `<button data-a="reject" data-id="${esc(l.id)}" class="ab wt flex-1 justify-center !h-10">${ic('x', '!w-4 !h-4')}Reject</button>` : ''}
        <button data-a="del" data-id="${esc(l.id)}" class="ab no justify-center !h-10 px-3">${ic('trash', '!w-4 !h-4')}Delete</button>
      </div>
    </div>`;
  }).join('');
}

function lst() {
  return `<div class="flex gap-2 items-center"><div class="cd flex-1 flex items-center gap-2 px-3 h-12" style="border-radius:16px"><span style="color:var(--a)">${ic('search')}</span><input id="q" value="${esc(Q)}" placeholder="Title, area ya owner phone…" class="bg-transparent outline-none flex-1 min-w-0 text-sm font-semibold" style="user-select:text"></div><button data-a="openAdd" class="grad w-12 h-12 rounded-2xl grid place-items-center active:scale-90 transition" aria-label="Add">${ic('plus')}</button></div>
  <div class="noscroll flex gap-2 overflow-x-auto py-3 -mx-4 px-4">${[['all', 'Sab (' + D.listings.length + ')'], ['pending', 'Pending (' + D.listings.filter(x => x.status === 'pending').length + ')'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-a="flt" data-f="${k}" class="chip ${F === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="rows">${rows()}</div>`;
}

function usr() {
  if (!D.users.length) return `<div class="cd p-8 text-center text-sm font-bold" style="color:var(--mut)">Koi user nahi mila</div>`;
  return D.users.map((u, i) => `<div class="cd p-4 mb-3 row" style="animation-delay:${i * 40}ms"><div class="flex items-center gap-3"><span class="grad w-11 h-11 rounded-2xl grid place-items-center hd font-extrabold">${esc((u.name || 'U')[0])}</span><div class="flex-1 min-w-0"><b class="flex items-center gap-1">${esc(u.name)}${u.ver ? `<span style="color:var(--a)">${ic('shield', '!w-4 !h-4')}</span>` : ''}</b><div class="text-xs font-semibold" style="color:var(--mut)">+91 ${esc(u.phone)}</div></div><span class="st ${u.blk ? 'no' : 'ok'}">${u.blk ? 'Blocked' : 'Active'}</span></div>
  <div class="flex gap-2 mt-3"><button data-a="uver" data-id="${esc(u.id)}" class="ab soft">${ic('shield', '!w-4 !h-4')}${u.ver ? 'Unverify' : 'Verify owner'}</button><button data-a="ublk" data-id="${esc(u.id)}" class="ab ${u.blk ? 'ok' : 'no'}">${ic('block', '!w-4 !h-4')}${u.blk ? 'Unblock' : 'Block'}</button></div></div>`).join('');
}

function adv() {
  return [['home', 'Home Banner (320×100)'], ['feed', 'Feed Banner (between listings)']].map(([k, l]) => `<div class="cd p-4 mb-3 row"><div class="flex items-center justify-between"><div><b class="hd">${esc(l)}</b><div class="text-xs font-semibold" style="color:var(--mut)">Adsterra / Google AdSense</div></div><button data-a="tog" data-g="ads" data-k="${esc(k)}" class="sw ${D.ads[k]?.on ? 'on' : ''}" aria-label="Toggle"></button></div>
  <textarea data-in="ads.${esc(k)}" class="fld mt-3" placeholder="Yahan ad code paste karein…" style="user-select:text">${esc(D.ads[k]?.code || '')}</textarea><button data-a="adsave" class="ab grad mt-3 !h-10 w-full justify-center">Save & Publish to User App</button></div>`).join('');
}

function stg() {
  const sw = (g, k, l, on) => `<div class="flex items-center justify-between py-3" style="border-top:1px solid var(--line)"><b class="text-sm">${esc(l)}</b><button data-a="tog" data-g="${esc(g)}" data-k="${esc(k)}" class="sw ${on ? 'on' : ''}" aria-label="${esc(l)}"></button></div>`;
  return `<div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">App settings (Live Sync)</h3><input data-in="set.name" value="${esc(D.set.name)}" class="fld mb-2.5" placeholder="App ka naam" style="user-select:text"><input data-in="set.wa" value="${esc(D.set.wa)}" class="fld" inputmode="numeric" placeholder="Support WhatsApp number" style="user-select:text">${sw('set', 'free', 'Free listing allowed', D.set.free)}${sw('set', 'maint', 'Maintenance mode', D.set.maint)}</div>
  <div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">Panel ka look</h3><div class="flex gap-3">${[['royal', '#4f46e5,#9333ea'], ['coral', '#f43f5e,#fb923c'], ['ocean', '#0891b2,#2563eb'], ['amber', '#d97706,#be123c']].map(([k, c]) => `<button data-a="pal" data-p="${esc(k)}" class="w-10 h-10 rounded-full" style="background:linear-gradient(135deg,${c})" aria-label="${esc(k)}"></button>`).join('')}</div><button data-a="mode" class="ab soft mt-3 !h-10 w-full justify-center">Light / Dark badlein</button></div>`;
}

function render() {
  if ($('#app').classList.contains('hidden')) return;
  $('#view').innerHTML = { dash, lst, usr, adv, stg }[V]();
  $('#tabs').innerHTML = TABS.map(([k, i, l]) => `<button data-a="tab" data-v="${esc(k)}" class="${V === k ? 'on' : ''} flex flex-col items-center gap-1">${ic(i)}${esc(l)}</button>`).join('');
  $('#pendN').textContent = D.listings.filter(l => l.status === 'pending').length;
}

/* --- 6. AUTO-LOGIN & ACTIONS --- */
onAuthStateChanged(auth, user => {
  if (user) {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    if (location.hash === '#lst-pending') {
      V = 'lst'; F = 'pending';
    }
    startListeners();
    render();
  }
});

async function login() {
  const email = $('#admEmail').value.trim();
  const pass = $('#admPass').value;
  if (!email || !pass) {
    $('#pinErr').textContent = 'Admin Email aur Password dono daalein';
    return;
  }
  $('#pinErr').textContent = 'Authenticating securely...';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    $('#pinErr').textContent = '';
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    history.replaceState({ tab: 'dash', flt: 'all', modalOpen: false }, '', '#dash');
    startListeners();
    render();
  } catch (err) {
    $('#pinErr').textContent = 'Access Denied! Galat Email ya Password.';
  }
}
$('#enter').onclick = login;
$('#admPass').onkeydown = e => { if (e.key === 'Enter') login(); };

const R = document.documentElement;
document.addEventListener('click', async e => {
  // Image Zoom Handler
  const zoomTarget = e.target.closest('[data-zoom]');
  if (zoomTarget) {
    $('#zoomImg').src = zoomTarget.dataset.zoom;
    $('#imgZoomModal').classList.add('open');
    pushAdminState('#zoom');
    return;
  }

  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;

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
      u: type === 'Plot' ? '' : '/mo',
      ownerName,
      ownerPhone,
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
    await signOut(auth);
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
    $('#admEmail').value = $('#admPass').value = '';
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') { Q = e.target.value; $('#rows').innerHTML = rows(); }
  else if (e.target.dataset.in) {
    const [g, k] = e.target.dataset.in.split('.');
    g === 'ads' ? D.ads[k].code = e.target.value : D.set[k] = e.target.value;
    setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set }, { merge: true }).catch(() => {});
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
