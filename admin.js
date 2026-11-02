/* --- 6. STRICT ADMIN VERIFICATION & LOGIN --- */
function verifyAdminAccess(user) {
  if (!user || !user.email) return false;
  const ADMIN_EMAIL = "mehtaprem362@gmail.com";
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

onAuthStateChanged(auth, async user => {
  if (user) {
    const isRealAdmin = await verifyAdminAccess(user);
    if (!isRealAdmin) {
      stopListeners();
      await signOut(auth);
      $('#app').classList.add('hidden');
      $('#login').classList.remove('hidden');
      $('#pinErr').textContent = 'Access Denied! Yeh account Admin nahi hai.';
      return;
    }
    $('#pinErr').textContent = '';
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    if (location.hash === '#lst-pending') {
      V = 'lst'; F = 'pending';
    }
    startListeners();
    render();
  } else {
    stopListeners();
    $('#app').classList.add('hidden');
    $('#login').classList.remove('hidden');
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
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const isRealAdmin = await verifyAdminAccess(cred.user);
    if (!isRealAdmin) {
      await signOut(auth);
      $('#pinErr').textContent = 'Access Denied! Yeh account Admin nahi hai.';
      return;
    }
    $('#pinErr').textContent = '';
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    history.replaceState({ tab: 'dash', flt: 'all', modalOpen: false }, '', '#dash');
    startListeners();
    render();
  } catch (err) {
    console.error("Login Error:", err);
    // Yahan exact error dikhega taaki pata chale ki issue password ka hai ya domain ka
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      $('#pinErr').textContent = 'Galat Email ya Password hai.';
    } else if (err.code === 'auth/unauthorized-domain') {
      $('#pinErr').textContent = 'Error: Firebase Console mein yeh domain Authorized nahi hai!';
    } else {
      $('#pinErr').textContent = 'Error: ' + (err.message || 'Login fail ho gaya');
    }
  }
}
