/** Staff login gate for all pages under foodtruck/pos/ (registers, preorders, online orders). */
(function () {
  var CFG = window.POS_AUTH_CONFIG || {};
  var STORAGE_KEY = 'foodeza_pos_session';

  function expectedHash() {
    return String(CFG.passwordHash || '').trim().toLowerCase();
  }

  function isAuthed() {
    try {
      var hash = expectedHash();
      if (!hash) return false;

      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.hash === hash) return true;
      }

      // One-time migration from older tab-only sessions
      var legacy = sessionStorage.getItem(STORAGE_KEY);
      if (legacy) {
        try {
          var s = JSON.parse(legacy);
          if (s && (!s.exp || s.exp > Date.now())) {
            setAuthed();
            sessionStorage.removeItem(STORAGE_KEY);
            return true;
          }
        } catch (e) { /* ignore */ }
        sessionStorage.removeItem(STORAGE_KEY);
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  function setAuthed() {
    var hash = expectedHash();
    if (!hash) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, hash: hash }));
  }

  function clearAuthed() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function sha256(text) {
    if (!window.crypto || !crypto.subtle) {
      return Promise.reject(new Error('Secure login requires HTTPS'));
    }
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  window.POS_AUTH = {
    hashPassword: sha256,
    logout: function () {
      clearAuthed();
      location.reload();
    },
  };

  function injectLogout() {
    var topbar = document.querySelector('.pos-topbar .d-flex.gap-2');
    if (!topbar || document.getElementById('pos-logout-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'pos-logout-btn';
    btn.className = 'btn btn-sm btn-outline-light';
    btn.innerHTML = '<i class="fas fa-right-from-bracket me-1"></i>Logout';
    btn.addEventListener('click', function () {
      window.POS_AUTH.logout();
    });
    topbar.insertBefore(btn, topbar.firstChild);
  }

  function showLoginGate() {
    document.body.classList.add('pos-auth-locked');

    var gate = document.createElement('div');
    gate.id = 'pos-auth-gate';
    gate.className = 'pos-auth-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.innerHTML =
      '<div class="pos-auth-card">' +
      '<div class="pos-auth-logo"><i class="fas fa-cash-register"></i></div>' +
      '<h1 class="pos-auth-title">Foodeza POS</h1>' +
      '<p class="pos-auth-sub">Staff login required</p>' +
      '<form id="pos-auth-form" autocomplete="off">' +
      '<label class="pos-auth-label" for="pos-auth-password">Password</label>' +
      '<input id="pos-auth-password" type="password" class="pos-auth-input" autocomplete="current-password" required autofocus>' +
      '<p id="pos-auth-error" class="pos-auth-error" hidden>Incorrect password</p>' +
      '<button type="submit" class="pos-auth-submit">Sign in</button>' +
      '</form>' +
      '</div>';
    document.body.appendChild(gate);

    var form = document.getElementById('pos-auth-form');
    var input = document.getElementById('pos-auth-password');
    var err = document.getElementById('pos-auth-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var pwd = (input.value || '').trim();
      if (!pwd) return;

      sha256(pwd).then(function (hash) {
        if (hash === expectedHash()) {
          setAuthed();
          gate.remove();
          document.body.classList.remove('pos-auth-locked');
          injectLogout();
          input.value = '';
          return;
        }
        err.hidden = false;
        input.select();
      }).catch(function () {
        err.textContent = 'Login unavailable — use HTTPS';
        err.hidden = false;
      });
    });
  }

  if (isAuthed()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectLogout);
    } else {
      injectLogout();
    }
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showLoginGate);
  } else {
    showLoginGate();
  }
})();
