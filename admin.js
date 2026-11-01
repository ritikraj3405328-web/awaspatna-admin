const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ic = (n, c = '') => `<svg class="ic ${c}"><use href="#i-${n}"/></svg>`;
const KEY = 'ap_admin_demo';

function seed() {
  const U = (id, name, phone, ver, blk) => ({ id, name, phone, ver, blk });
  const L = (id, title, type, loc, price, uid, status) => ({ id, title, type, loc, price, uid, status });
  return {
    nid: 7,
    users: [
      U(1, 'Ramesh Kumar', '9812300001', true, false),
      U(2, 'Sunita Devi', '9934500002', true, false),
      U(3, 'Amit Singh', '9771100003', false, false),
      U(4, 'Pooja Verma', '9608800004', false, false),
      U(5, 'Vikash Raj', '9199900005', true, true)
    ],
    listings: [
      L(1, 'Furnished Single Room', 'Room', 'Kankarbagh', '₹4,200/mo', 1, 'approved'),
      L(2, 'Premium 2 BHK, 3rd Floor', 'Flat', 'Boring Road', '₹14,500/mo', 2, 'approved'),
      L(3, '1,200 sq ft Residential Plot', 'Plot', 'Rajendra Nagar', '₹48 Lakh', 3, 'pending'),
      L(4, 'Boys PG with Meals', 'Room', 'Boring Road', '₹5,500/mo', 4, 'pending'),
      L(5, 'Ground-floor Shop 300 sq ft', 'Commercial', 'Patliputra', '₹32,000/mo', 1, 'pending'),
      L(6, '1 BHK Semi-Furnished', 'Flat', 'Bailey Road', '₹9,000/mo', 5, 'rejected')
    ],
    ads: { home: { on: false, code: '' }, feed: { on: false, code: '' } },
    set: { name: 'AwasPatna', wa: '', free: true, maint: false },
    log: ['Admin panel taiyar hai']
  };
}

let D;
try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
D = D || seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
const log = m => { D.log.unshift(m); D.log = D.log.slice(0, 6); save(); };

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.style.opacity = 1;
  t.style.transform = 'translate(-50%,-8px)';
  clearTimeout(toast.x);
  toast.x = setTimeout(() => {
    t.style.opacity = 0;
    t.style.transform = 'translate(-50%,0)';
  }, 2000);
}

const uname = id => (D.users.find(u => u.id === id) || { name: '—' }).name;
const stc = { approved: ['ok', 'Approved'], pending: ['wt', 'Pending'], rejected: ['no', 'Rejected'] };
let V = 'dash', F = 'all', Q = '';
const TABS = [
  ['dash', 'grid', 'Dashboard'],
  ['lst', 'list', 'Listings'],
  ['usr', 'users', 'Users'],
  ['adv', 'ad', 'Ads'],
  ['stg', 'gear', 'Settings']
];

/* --- HISTORY & BACK BUTTON ROUTER FOR ADMIN --- */
function pushAdminState(hash = '') {
  const modalOpen = $('#modal').classList.contains('open');
  history.pushState({ tab: V, flt: F, modalOpen }, '', hash || `#${V}-${F}`);
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

/* --- VIEWS --- */
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
  <div class="cd p-4 mt-4 row"><div class="flex justify-between items-end"><h3 class="hd font-bold">Is hafte ki listings</h3><span class="text-xs font-bold" style="color:var(--mut)">Demo data</span></div>
  <svg viewBox="0 0 280 110" class="w-full mt-3"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--b)"/><stop offset="1" stop-color="var(--a)"/></linearGradient></defs>${bars.map((v, i) => `<rect x="${10 + i * 38}" y="${88 - v / mx * 78}" width="24" height="${v / mx * 78}" rx="8" fill="url(#bg)" opacity="${i === 5 ? 1 : .55}"/><text x="${22 + i * 38}" y="105" text-anchor="middle" font-size="9" font-weight="700" fill="var(--mut)">${dn[i]}</text>`).join('')}</svg></div>
  <div class="cd p-4 mt-4 row"><h3 class="hd font-bold mb-2">Recent activity</h3>${D.log.map(m => `<div class="flex items-center gap-2.5 py-2 text-[13px] font-semibold" style="border-top:1px solid var(--line)"><span class="w-2 h-2 rounded-full grad"></span>${m}</div>`).join('')}</div>`;
}

function rows() {
  const q = Q.toLowerCase();
  const L = D.listings.filter(l => (F === 'all' || l.status === F) && (!q || (l.title + l.loc + l.type + uname(l.uid)).toLowerCase().includes(q)));
  if (!L.length) return `<div class="cd p-8 text-center text-sm font-bold" style="color:var(--mut)">Koi listing nahi mili</div>`;
  return L.map((l, i) => {
    const u = D.users.find(x => x.id === l.uid) || {}, [c, t] = stc[l.status];
    return `<div class="cd p-4 mb-3 row" style="animation-delay:${i * 40}ms">
    <div class="flex justify-between gap-3"><div class="min-w-0"><b class="hd text-[15px] leading-snug block">${l.title}</b><div class="text-xs font-semibold mt-1" style="color:var(--mut)">${l.type} · ${l.loc} · <span style="color:var(--a)">${l.price}</span></div><div class="text-xs font-bold mt-1 flex items-center gap-1">${uname(l.uid)}${u.ver ? `<span style="color:var(--a)">${ic('shield', '!w-3.5 !h-3.5')}</span>` : ''}${u.blk ? '<span class="text-red-500">· Blocked</span>' : ''}</div></div><span class="st ${c} self-start">${t}</span></div>
    <div class="flex flex-wrap gap-2 mt-3">${l.status !== 'approved' ? `<button data-a="approve" data-id="${l.id}" class="ab ok">${ic('check', '!w-4 !h-4')}Approve</button>` : ''}${l.status !== 'rejected' ? `<button data-a="reject" data-id="${l.id}" class="ab wt">${ic('x', '!w-4 !h-4')}Reject</button>` : ''}<button data-a="del" data-id="${l.id}" class="ab no">${ic('trash', '!w-4 !h-4')}Delete</button></div></div>`;
  }).join('');
}

function lst() {
  return `<div class="flex gap-2 items-center"><div class="cd flex-1 flex items-center gap-2 px-3 h-12" style="border-radius:16px"><span style="color:var(--a)">${ic('search')}</span><input id="q" value="${Q}" placeholder="Title, area ya owner…" class="bg-transparent outline-none flex-1 min-w-0 text-sm font-semibold"></div><button data-a="openAdd" class="grad w-12 h-12 rounded-2xl grid place-items-center active:scale-90 transition" aria-label="Add">${ic('plus')}</button></div>
  <div class="noscroll flex gap-2 overflow-x-auto py-3 -mx-4 px-4">${[['all', 'Sab'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([k, l]) => `<button data-a="flt" data-f="${k}" class="chip ${F === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="rows">${rows()}</div>`;
}

function usr() {
  return D.users.map((u, i) => `<div class="cd p-4 mb-3 row" style="animation-delay:${i * 40}ms"><div class="flex items-center gap-3"><span class="grad w-11 h-11 rounded-2xl grid place-items-center hd font-extrabold">${u.name[0]}</span><div class="flex-1 min-w-0"><b class="flex items-center gap-1">${u.name}${u.ver ? `<span style="color:var(--a)">${ic('shield', '!w-4 !h-4')}</span>` : ''}</b><div class="text-xs font-semibold" style="color:var(--mut)">+91 ${u.phone} · ${D.listings.filter(l => l.uid === u.id).length} listings</div></div><span class="st ${u.blk ? 'no' : 'ok'}">${u.blk ? 'Blocked' : 'Active'}</span></div>
  <div class="flex gap-2 mt-3"><button data-a="uver" data-id="${u.id}" class="ab soft">${ic('shield', '!w-4 !h-4')}${u.ver ? 'Unverify' : 'Verify owner'}</button><button data-a="ublk" data-id="${u.id}" class="ab ${u.blk ? 'ok' : 'no'}">${ic('block', '!w-4 !h-4')}${u.blk ? 'Unblock' : 'Block'}</button></div></div>`).join('');
}

function adv() {
  return [['home', 'Home Banner (320×100)'], ['feed', 'Feed Banner (between listings)']].map(([k, l]) => `<div class="cd p-4 mb-3 row"><div class="flex items-center justify-between"><div><b class="hd">${l}</b><div class="text-xs font-semibold" style="color:var(--mut)">Adsterra / Google AdSense</div></div><button data-a="tog" data-g="ads" data-k="${k}" class="sw ${D.ads[k].on ? 'on' : ''}" aria-label="Toggle"></button></div>
  <textarea data-in="ads.${k}" class="fld mt-3" placeholder="Yahan ad code paste karein…">${D.ads[k].code}</textarea><button data-a="adsave" class="ab grad mt-3 !h-10 w-full justify-center">Save karein</button></div>`).join('') + `<p class="text-xs font-semibold px-1" style="color:var(--mut)">Tip: ad code ko app ke Ad Space wale block mein lagana hota hai.</p>`;
}

function stg() {
  const sw = (g, k, l, on) => `<div class="flex items-center justify-between py-3" style="border-top:1px solid var(--line)"><b class="text-sm">${l}</b><button data-a="tog" data-g="${g}" data-k="${k}" class="sw ${on ? 'on' : ''}" aria-label="${l}"></button></div>`;
  return `<div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">App settings</h3><input data-in="set.name" value="${D.set.name}" class="fld mb-2.5" placeholder="App ka naam"><input data-in="set.wa" value="${D.set.wa}" class="fld" inputmode="numeric" placeholder="Support WhatsApp number">${sw('set', 'free', 'Free listing allowed', D.set.free)}${sw('set', 'maint', 'Maintenance mode', D.set.maint)}</div>
  <div class="cd p-4 mb-3 row"><h3 class="hd font-bold mb-3">Panel ka look</h3><div class="flex gap-3">${[['royal', '#4f46e5,#9333ea'], ['coral', '#f43f5e,#fb923c'], ['ocean', '#0891b2,#2563eb'], ['amber', '#d97706,#be123c']].map(([k, c]) => `<button data-a="pal" data-p="${k}" class="w-10 h-10 rounded-full" style="background:linear-gradient(135deg,${c})" aria-label="${k}"></button>`).join('')}</div><button data-a="mode" class="ab soft mt-3 !h-10 w-full justify-center">Light / Dark badlein</button></div>
  <button data-a="reset" class="ab no !h-11 w-full justify-center">Demo data reset karein</button>`;
}

function render() {
  $('#view').innerHTML = { dash, lst, usr, adv, stg }[V]();
  $('#tabs').innerHTML = TABS.map(([k, i, l]) => `<button data-a="tab" data-v="${k}" class="${V === k ? 'on' : ''} flex flex-col items-center gap-1">${ic(i)}${l}</button>`).join('');
  $('#pendN').textContent = D.listings.filter(l => l.status === 'pending').length;
}

const R = document.documentElement;
function login() {
  if ($('#pin').value === '1234') {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    history.replaceState({ tab: 'dash', flt: 'all', modalOpen: false }, '', '#dash');
    render();
  } else {
    $('#pinErr').textContent = 'Galat PIN, dobara koshish karein';
  }
}
$('#enter').onclick = login;
$('#pin').onkeydown = e => { if (e.key === 'Enter') login(); };

const setL = (id, s, m) => {
  const l = D.listings.find(x => x.id === id);
  if (l) { l.status = s; log(m + ': ' + l.title); save(); render(); toast(m); }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (!t) return;
  const a = t.dataset.a, id = +t.dataset.id;
  if (a === 'tab') {
    const nextV = t.dataset.v;
    const nextF = t.dataset.f || F;
    if (V !== nextV || F !== nextF) {
      V = nextV;
      if (t.dataset.f) F = t.dataset.f;
      pushAdminState(`#${V}`);
      window.scrollTo({ top: 0 });
      render();
    }
  }
  else if (a === 'flt') {
    F = t.dataset.f;
    pushAdminState(`#lst-${F}`);
    render();
  }
  else if (a === 'approve') setL(id, 'approved', 'Approved');
  else if (a === 'reject') setL(id, 'rejected', 'Rejected');
  else if (a === 'del') {
    const l = D.listings.find(x => x.id === id);
    D.listings = D.listings.filter(x => x.id !== id);
    log('Deleted: ' + l.title);
    save();
    render();
    toast('Listing delete ho gayi');
  }
  else if (a === 'uver') {
    const u = D.users.find(x => x.id === id);
    u.ver = !u.ver;
    log((u.ver ? 'Verified: ' : 'Unverified: ') + u.name);
    save();
    render();
  }
  else if (a === 'ublk') {
    const u = D.users.find(x => x.id === id);
    u.blk = !u.blk;
    log((u.blk ? 'Blocked: ' : 'Unblocked: ') + u.name);
    save();
    render();
  }
  else if (a === 'tog') {
    const o = t.dataset.g === 'ads' ? D.ads[t.dataset.k] : D.set;
    const k = t.dataset.g === 'ads' ? 'on' : t.dataset.k;
    o[k] = !o[k];
    save();
    render();
  }
  else if (a === 'adsave') { log('Ad code save hua'); save(); toast('Ad settings save ho gayi'); }
  else if (a === 'pal') R.dataset.pal = t.dataset.p;
  else if (a === 'mode') {
    const c = R.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    R.dataset.theme = c === 'dark' ? 'light' : 'dark';
  }
  else if (a === 'reset') { D = seed(); save(); render(); toast('Demo data reset ho gaya'); }
  else if (a === 'openAdd') {
    $('#nO').innerHTML = D.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
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
    D.listings.unshift({ id: D.nid++, title: T, type: $('#nTy').value, loc: $('#nL').value, price: P, uid: +$('#nO').value, status: 'approved' });
    log('Nayi listing: ' + T);
    save();
    $('#nT').value = $('#nP').value = '';
    $('#modal').classList.remove('open');
    V = 'lst';
    F = 'all';
    pushAdminState('#lst-all');
    render();
    toast('Listing jud gayi');
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
    save();
  }
});

$('#modal').onclick = e => {
  if (e.target.id === 'modal') {
    $('#modal').classList.remove('open');
    if (location.hash === '#add-listing') history.back();
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
