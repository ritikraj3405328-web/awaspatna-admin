import { 
  db, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, getDocs 
} from "./firebase-config.js";

const $ = s => document.querySelector(s);
const ic = (n, c = '') => `<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;

const INITIAL_USERS = [
  { id: '9812300001', name: 'Ramesh Kumar', phone: '9812300001', ver: true, blk: false },
  { id: '9934500002', name: 'Sunita Devi', phone: '9934500002', ver: true, blk: false },
  { id: '9771100003', name: 'Amit Singh', phone: '9771100003', ver: false, blk: false },
  { id: '9608800004', name: 'Pooja Verma', phone: '9608800004', ver: false, blk: false }
];

const INITIAL_LISTINGS = [
  { title: 'Furnished Single Room + Attached Bath', type: 'Room', loc: 'Kankarbagh', price: '₹4,200', u: '/mo', ownerName: 'Ramesh Kumar', ownerPhone: '9812300001', status: 'approved', tags: ['Furnished', 'WiFi', '24×7 Water'], d: 'Ground floor room, students aur working professionals ke liye ideal.', ago: 'Aaj', createdAt: Date.now() - 40000 },
  { title: 'Premium 2 BHK, 3rd Floor', type: 'Flat', loc: 'Boring Road', price: '₹14,500', u: '/mo', ownerName: 'Sunita Devi', ownerPhone: '9934500002', status: 'approved', tags: ['2 BHK', 'Lift', 'Parking'], d: 'Modular kitchen, power backup aur gated society. Family preferred.', ago: 'Aaj', createdAt: Date.now() - 30000 },
  { title: '1,200 sq ft Residential Plot', type: 'Plot', loc: 'Rajendra Nagar', price: '₹48 Lakh', u: '', ownerName: 'Amit Singh', ownerPhone: '9771100003', status: 'pending', tags: ['East Facing', 'Corner', 'Ready Registry'], d: '20 ft road, clear title aur registry ke liye taiyar.', ago: 'Kal', createdAt: Date.now() - 20000 },
  { title: 'Boys PG with Meals', type: 'Room', loc: 'Boring Road', price: '₹5,500', u: '/mo', ownerName: 'Pooja Verma', ownerPhone: '9608800004', status: 'pending', tags: ['Double Sharing', 'Meals', 'CCTV'], d: 'Daily cleaning aur coaching hubs ke bilkul paas.', ago: 'Kal', createdAt: Date.now() - 10000 }
];

let D = {
  users: [],
  listings: [],
  ads: { home: { on: false, code: '' }, feed: { on: false, code: '' } },
  set: { name: 'AwasPatna', wa: '', free: true, maint: false, pin: '1234' },
  log: ['Firebase Real-Time Sync Active ✓']
};

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.opacity = 1;
  t.style.transform = 'translate(-50%,-8px)';
  clearTimeout(toast.x);
  toast.x = setTimeout(() => {
    t.style.opacity = 0;
    t.style.transform = 'translate(-50%,0)';
  }, 2200);
}

const addLog = m => {
  D.log.unshift(m);
  D.log = D.log.slice(0, 6);
  setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set, log: D.log }, { merge: true }).catch(() => {});
};

/* --- 1. SEED INITIAL DATA IF FIRESTORE IS EMPTY --- */
async function ensureSeedData() {
  try {
    const snap = await getDocs(collection(db, "listings"));
    if (snap.empty) {
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, "users", u.id), u);
      }
      for (const l of INITIAL_LISTINGS) {
        await addDoc(collection(db, "listings"), l);
      }
      await setDoc(doc(db, "settings", "config"), { ads: D.ads, set: D.set, log: D.log });
      toast('Initial Patna data Firebase mein load ho gaya!');
    }
  } catch (e) {
    toast('Firebase config check karein');
  }
}

/* --- 2. REAL-TIME FIRESTORE LISTENERS --- */
function startListeners() {
  onSnapshot(collection(db, "listings"), snap => {
    const arr = [];
    snap.forEach(dc => arr.push({ id: dc.id, ...dc.data() }));
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    D.listings = arr;
    render();
  });

  onSnapshot(collection(db, "users"), snap => {
    const arr = [];
    snap.forEach(dc => arr.push({ id: dc.id, ...dc.data() }));
    D.users = arr;
    render();
  });

  onSnapshot(doc(db, "settings", "config"), snap => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.ads) D.ads = data.ads;
      if (data.set) D.set = { ...D.set, ...data.set };
      if (data.log) D.log = data.log;
      render();
    }
  });
}

/* --- 3. HISTORY & BACK BUTTON ROUTER --- */
let V = 'dash', F = 'all', Q = '';
const TABS = [
  ['dash', 'grid', 'Dashboard'],
  ['lst', 'list', 'Listings'],
  ['usr', 'users', 'Users'],
  ['adv', 'ad', 'Ads'],
  ['stg', 'gear', 'Settings']
];
const stc = { approved: ['ok', 'Approved'], pending: ['wt', 'Pending'], rejected: ['no', 'Rejected'] };

function pushAdminState(hash = '') {
  history.pushState({ tab: V, flt: F, modalOpen: $('#modal').classList.contains('open') }, '', hash || `#${V}-${F}`);
}

window.addEventListener('popstate', e => {
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

/* --- 4. RENDER VIEWS --- */
function dash() {
  const n = s => D.listings.filter(l => l.status === s).length;
  const st = [
    ['Total Listings', D.listings.length, 'list', 1],
    ['Pending', n('pending'), 'ad', 0],
    ['Verified Owners', D.users.filter(u => u.ver).length, 'shield', 0],
    ['Total Users', D.users.length, 'users', 0]
  ];
  const bars = [3, 5, 2, 6, 4, 7, 5], mx = 7, dn = ['Sa', 'Ra', 'So', 'Ma', 'Bu', 'Gu', 'Sh'];
  return `<div class="grid grid-cols-2 gap-3">${st.map(([l, v, i, g]) => `<div class="${g ? 'grad' : 'cd'} p-4 row" style="border-radius:22px"><span class="${g ? 'bg-white/25' : 'soft'} w-10 h-10 rounded-2xl grid place-items-center">${ic(i)}</span><div class="hd font-extrabold text-3xl mt-3">${v}</div><div class="text-xs font-bold ${g ? 'opacity-85' : ''}" style="${g ? '' : 'color:var(--mut)'}">${l}</div></div>`).join('')}</div>
  <div class="cd p-4 mt-4 row"><div class="flex justify-between items-end"><h3 class="hd font-bold">Live Firebase Status</h3><span class="text-xs font-bold text-green-600">● Connected</span></div>
  <svg viewBox="0 0 280 110" class="w-full mt-3"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--b)"/><stop offset="1" stop-color="var(--a)"/></linearGradient></defs>${bars.map((v, i) => `<rect x="${10 + i * 38}" y="${88 - v / mx * 78}" width="24" height="${v / mx * 78}" rx="8" fill="url(#bg)" opacity="${i === 5 ? 1 : .55}"/><text x="${22 + i * 38}" y="105" text-anchor="middle" font-size="9" font-weight="700" fill="var(--mut)">${dn[i]}</text>`).join('')}</svg></div>
  <div class="cd p-4 mt-4 row"><h3 class="hd font-bold mb-2">Recent activity</h3>${D.log.map(m => `<div class="flex items-center gap-2.5 py-2 text-[13px] font-semibold" style="border-top:1px solid var(--line)"><span class="w-2 h-2 rounded-full grad"></span>${m}</div>`).join('')}</div>`;
}

function rows() {
  const q = Q.toLowerCase();
  const L = D.listings.filter(l => (F === 'all' || l.status === F) && (!q || (l.title + l.loc + l.type + (l.ownerName || '') + (l.ownerPhone || '')).toLowerCase().includes(q)));
  if (!L.length) return `<div class="cd p-8 text-center text-sm font-bold" style="color:var(--mut)">Koi listing nahi mili</div>`;
  return L.map((l, i) => {
    const [c, t] = stc[l.status] || stc.pending;
    return `<div class="cd p-4 mb-3 row" style="animation-delay:${i * 40}ms">
    <div class="flex justify-between gap-3"><div class="min-w-0"><b class="hd text-[15px] leading-snug block">${l.title}</b><div class="text-xs font-semibold mt-1" style="color:var(--mut)">${l.type} · ${l.loc} · <span style="color:var(--a)">${l.price}</span></div><div class="text-xs font-bold mt-1 flex items-center gap-1">${l.ownerName || 'Owner'} (${l.ownerPhone || '—'}) <span style="color:var(--a)">${ic('shield', '!w-3.5 !h-3.5')}</span></div></div><span class="st ${c} self-start">${t}</span></div>
    <div class="flex flex-wrap gap-2 mt-3">${l.status !== 'approved' ? `<button data-a="approve" data-id="${l.id}" class="ab ok">${ic('check', '!w-4 !h-4')}Approve</button>` : ''}${l.status !== 'rejected' ? `<button data-a="reject" data-id="${l.id}" class="ab wt">${ic('x', '!w-4 !h-4')}Reject</button>` : ''}<button data-a="del" data-id="${l.id}" class="ab no">${ic('trash', '!w-4 !h-4')}Delete</button></div></div>`;
  }).join('');
}

function lst() {
  return `<div class="flex gap-2 items-center"><div class="cd flex-1 flex items-center gap-2 px-3 h-12" style="border-radius:16px"><span style="color:var(--a)">${ic('search')}</span><input id="q" value="${Q}" placeholder="Title, area ya owner…" class="bg-transparent outline-none flex-1 min-w-0 text-sm font-semibold"></div><button data-a="openAdd" class="grad w-12 h-12 rounded-2xl grid place-items-center active:scale-90 transition" aria-label="Add">${ic('plus')}</button></div>
  <div class="noscroll flex gap-2 overflow-x-auto py-3 -mx-4 px-4">${[['all', 'Sab'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-a="flt" data-f="${k}" class="chip ${F === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="rows">${rows()}</div>`;
}

function usr() {
  if (!D.users.length) return `<div class="cd p-8 text-center text-sm font-bold" style="color:var(--mut)">Koi user nahi mila</div>`;
  return D.users.map((u, i) => `<div class="cd p-4 mb-3 row" style="animation-delay:${i * 40}ms"><div class="flex items-center gap-3"><span class="grad w-11 h-11 rounded-2xl grid place-items-center hd font-extrabold">${(u.name || 'U')[0]}</span><div class="flex-1 min-w-0"><b class="flex items-center gap-1">${u.name}${u.ver ? `<span style="color:var(--a)">${ic('shield', '!w-4 !h-4')}</span>` : ''}</b><div class="text-xs font-semibold" style="color:var(--mut)">+91 ${u.phone}</div></div><span class="st ${u.blk ? 'no' : 'ok'}">${u.blk ? 'Blocked' : 'Active'}</span></div>
  <div class="flex gap-2 mt-3"><button data-a="uver" data-id="${u.id}" class="ab soft">${ic('shield', '!w-4 !h-4')}${u.ver ? 'Unverify' : 'Verify owner'}</button><button data-a="ublk" data-id="${u.id}" class="ab ${u.blk ? 'ok' : 'no'}">${ic('block', '!w-4 !h-4')}${u.blk ? 'Unblock' : 'Block'}</button></div></div>`).join('');
}

function adv() {
  return [['home', 'Home Banner (320×100)'], ['feed', 'Feed Banner (between listings)']].map(([k, l]) => `<div class="cd p-4 mb-3 row"><div class="flex items-center justify-between"><div><b class="hd">${l}</b><div class="text-xs font-semibold" style="color:var(--mut)">Adsterra / Google AdSense</div></div><button data-a="tog" data-g="ads" data-k="${k}" class="sw ${D.ads[k]?.on ? 'on' : ''}" aria-label="Toggle"></button></div>
  <textarea data-in="ads.${k}" class="fld mt-3" placeholder="Yahan ad code paste karein…">${D.ads[k]?.code || ''}</textarea><button data-a="adsave" class="ab grad mt-3 !h-10 w-full justify-center">Save & Publish to User App</button></div>`).join('');
}

function stg() {
  const sw = (g, k, l, on) => `<div class="flex items-center justify-between py-3" style="border-top:1px solid var(--line)"><b class="text-sm">${l}</b><button data-a="tog" data-g="${g}" data-k="${k}" class="sw ${on ? 'on' : ''}" aria-label="${l}"></button></div>`;
  return `<div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">App settings (Live Sync)</h3><input data-in="set.name" value="${D.set.name}" class="fld mb-2.5" placeholder="App ka naam"><input data-in="set.wa" value="${D.set.wa}" class="fld" inputmode="numeric" placeholder="Support WhatsApp number">${sw('set', 'free', 'Free listing allowed', D.set.free)}${sw('set', 'maint', 'Maintenance mode', D.set.maint)}</div>
  <div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">Panel ka look</h3><div class="flex gap-3">${[['royal', '#4f46e5,#9333ea'], ['coral', '#f43f5e,#fb923c'], ['ocean', '#0891b2,#2563eb'], ['amber', '#d97706,#be123c']].map(([k, c]) => `<button data-a="pal" data-p="${k}" class="w-10 h-10 rounded-full" style="background:linear-gradient(135deg,${c})" aria-label="${k}"></button>`).join('')}</div><button data-a="mode" class="ab soft mt-3 !h-10 w-full justify-center">Light / Dark badlein</button></div>
  <button data-a="seed" class="ab soft !h-11 w-full justify-center">Demo Data Firebase mein load karein</button>`;
}

function render() {
  if ($('#app').classList.contains('hidden')) return;
  $('#view').innerHTML = { dash, lst, usr, adv, stg }[V]();
  $('#tabs').innerHTML = TABS.map(([k, i, l]) => `<button data-a="tab" data-v="${k}" class="${V === k ? 'on' : ''} flex flex-col items-center gap-1">${ic(i)}${l}</button>`).join('');
  $('#pendN').textContent = D.listings.filter(l => l.status === 'pending').length;
}

/* --- 5. ADMIN LOGIN & ACTIONS --- */
const R = document.documentElement;
function login() {
  if ($('#pin').value === (D.set.pin || '1234')) {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    history.replaceState({ tab: 'dash', flt: 'all', modalOpen: false }, '', '#dash');
    ensureSeedData();
    startListeners();
    render();
  } else {
    $('#pinErr').textContent = 'Galat PIN, dobara koshish karein';
  }
}
$('#enter').onclick = login;
$('#pin').onkeydown = e => { if (e.key === 'Enter') login(); };

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;

  if (a === 'tab') {
    V = t.dataset.v;
    if (t.dataset.f) F = t.dataset.f;
    pushAdminState(`#${V}`);
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
    await deleteDoc(doc(db, "listings", id));
    addLog('Deleted listing');
    toast('Listing delete ho gayi');
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
  else if (a === 'seed') ensureSeedData();
  else if (a === 'openAdd') {
    $('#nO').innerHTML = (D.users.length ? D.users : INITIAL_USERS).map(u => `<option value="${u.phone}" data-name="${u.name}">${u.name} (${u.phone})</option>`).join('');
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
      title: T,
      type,
      loc: $('#nL').value,
      price: P,
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
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
    $('#pin').value = '';
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
