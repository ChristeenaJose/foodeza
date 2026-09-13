(function () {
  var state = {
    monthId: localStorage.getItem('erp_month') || '',
    tab: 'pending',
    mod: 'home',
    currency: '€',
    months: [],
    entries: [],
    inventory: [],
    bookings: [],
    menu: [],
    services: [],
    totals: {},
  };

  var $ = function (id) { return document.getElementById(id); };

  function euros(n) {
    return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0' + state.currency;
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  async function api(action, payload) {
    var res;
    if (payload) {
      res = await fetch('api.php', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ action: action }, payload)),
      });
    } else {
      var q = new URLSearchParams({ action: action });
      if (state.monthId) q.set('monthId', state.monthId);
      res = await fetch('api.php?' + q.toString(), { headers: { Accept: 'application/json' } });
    }
    var data = await res.json();
    if (!res.ok || !data.ok) {
      if (data && data.error === 'auth_required') {
        $('loginScreen').hidden = false;
        $('appScreen').hidden = true;
      }
      throw data;
    }
    return data;
  }

  function showMod(mod) {
    state.mod = mod;
    document.querySelectorAll('.nav-mod [data-mod]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mod') === mod);
    });
    document.querySelectorAll('[data-mod-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-mod-panel') !== mod;
    });
  }

  function entriesFor(type) {
    return state.entries.filter(function (row) {
      if (state.monthId && row.monthId !== state.monthId) return false;
      if (type === 'pending') return row.type === 'pending' && !row.received;
      return row.type === type;
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function renderMonths() {
    var sel = $('monthSelect');
    sel.innerHTML = '<option value="">All months</option>';
    state.months.slice().reverse().forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name + ' ' + m.year;
      sel.appendChild(opt);
    });
    sel.value = state.monthId;
  }

  function renderBookkeeping() {
    var totals = { income: 0, expense: 0, pending: 0, balance: 0 };
    entriesFor('income').forEach(function (r) { totals.income += Number(r.amount); });
    entriesFor('expense').forEach(function (r) { totals.expense += Number(r.amount); });
    entriesFor('pending').forEach(function (r) { totals.pending += Number(r.amount); });
    totals.balance = totals.income - totals.expense;
    $('sumIncome').textContent = euros(totals.income);
    $('sumExpense').textContent = euros(totals.expense);
    $('sumPending').textContent = euros(totals.pending);
    $('sumBalance').textContent = euros(totals.balance);
    ['income', 'expense', 'pending'].forEach(function (type) {
      var box = $(type + 'List');
      var rows = entriesFor(type);
      if (!rows.length) {
        box.innerHTML = '<div class="empty">No ' + type + ' items yet.</div>';
        return;
      }
      box.innerHTML = rows.map(function (row) {
        var extra = type === 'pending'
          ? '<button class="btn btn-sm btn-success" data-receive="' + row.id + '">Payment received</button>'
          : '';
        extra += '<button class="btn btn-sm btn-outline-secondary" data-del-entry="' + row.id + '">Delete</button>';
        return '<div class="entry-row"><div><div class="fw-semibold">' + escapeHtml(row.title) + '</div>' +
          '<div class="small text-muted">' + escapeHtml(row.category || '') +
          (row.date ? ' · ' + escapeHtml(row.date) : '') + '</div></div>' +
          '<div class="fw-bold">' + euros(row.amount) + '</div>' +
          '<div class="d-flex gap-2 justify-content-end">' + extra + '</div></div>';
      }).join('');
    });
  }

  function renderInventory() {
    var box = $('invList');
    if (!state.inventory.length) {
      box.innerHTML = '<div class="empty">No stock items yet.</div>';
      return;
    }
    box.innerHTML = state.inventory.map(function (row) {
      var low = Number(row.qty) <= Number(row.minQty || 0);
      return '<div class="entry-row"><div><div class="fw-semibold">' + escapeHtml(row.name) +
        (low ? ' <span class="low">LOW</span>' : '') + '</div>' +
        '<div class="small text-muted">' + Number(row.qty) + ' ' + escapeHtml(row.unit) +
        ' · min ' + Number(row.minQty || 0) + '</div></div>' +
        '<div class="d-flex gap-2">' +
        '<button class="btn btn-sm btn-outline-dark" data-adj="' + row.id + '" data-delta="-1">−</button>' +
        '<button class="btn btn-sm btn-outline-dark" data-adj="' + row.id + '" data-delta="1">+</button>' +
        '</div>' +
        '<button class="btn btn-sm btn-outline-secondary" data-del-inv="' + row.id + '">Delete</button></div>';
    }).join('');
  }

  function renderServicesSelect() {
    var sel = $('bkService');
    var cur = sel.value;
    sel.innerHTML = '<option value="">Service</option>';
    state.services.filter(function (s) { return s.active !== false; }).forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  }

  function renderBookings() {
    var box = $('bkList');
    var rows = state.bookings.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    if (!rows.length) {
      box.innerHTML = '<div class="empty">No bookings yet.</div>';
      return;
    }
    box.innerHTML = rows.map(function (row) {
      var statuses = ['enquiry', 'confirmed', 'done', 'cancelled'];
      var btns = statuses.map(function (st) {
        var cls = row.status === st ? 'btn-danger' : 'btn-outline-secondary';
        return '<button class="btn btn-sm ' + cls + '" data-bk-status="' + row.id + '" data-status="' + st + '">' + st + '</button>';
      }).join(' ');
      return '<div class="entry-row"><div><div class="fw-semibold">' + escapeHtml(row.customer) +
        ' · ' + escapeHtml(row.date) + '</div><div class="small text-muted">' +
        escapeHtml(row.service || '') + (row.guests ? ' · ' + row.guests + ' guests' : '') +
        (row.phone ? ' · ' + escapeHtml(row.phone) : '') +
        (row.note ? ' · ' + escapeHtml(row.note) : '') + '</div></div>' +
        '<div>' + (row.amount ? euros(row.amount) : '') + '</div>' +
        '<div class="d-flex flex-wrap gap-1 justify-content-end">' + btns +
        '<button class="btn btn-sm btn-outline-secondary" data-del-bk="' + row.id + '">Delete</button></div></div>';
    }).join('');
  }

  function renderMenu() {
    var box = $('mnList');
    if (!state.menu.length) {
      box.innerHTML = '<div class="empty">No dishes yet.</div>';
      return;
    }
    box.innerHTML = state.menu.map(function (row) {
      return '<div class="entry-row"><div><div class="fw-semibold">' + escapeHtml(row.name) +
        (row.active === false ? ' <span class="text-muted">(off)</span>' : '') + '</div>' +
        '<div class="small text-muted">' + escapeHtml(row.category) + ' · ' + escapeHtml(row.diet) + '</div></div>' +
        '<div class="fw-bold">' + euros(row.price) + '</div>' +
        '<div class="d-flex gap-2">' +
        '<button class="btn btn-sm btn-outline-dark" data-toggle-mn="' + row.id + '">' +
        (row.active === false ? 'On' : 'Off') + '</button>' +
        '<button class="btn btn-sm btn-outline-secondary" data-del-mn="' + row.id + '">Delete</button></div></div>';
    }).join('');
  }

  function renderServices() {
    var box = $('svList');
    if (!state.services.length) {
      box.innerHTML = '<div class="empty">No services yet.</div>';
      return;
    }
    box.innerHTML = state.services.map(function (row) {
      return '<div class="entry-row"><div><div class="fw-semibold">' + escapeHtml(row.name) +
        (row.active === false ? ' <span class="text-muted">(off)</span>' : '') + '</div>' +
        '<div class="small text-muted">' + escapeHtml(row.description || '') + '</div></div><div></div>' +
        '<div class="d-flex gap-2">' +
        '<button class="btn btn-sm btn-outline-dark" data-toggle-sv="' + row.id + '">' +
        (row.active === false ? 'On' : 'Off') + '</button>' +
        '<button class="btn btn-sm btn-outline-secondary" data-del-sv="' + row.id + '">Delete</button></div></div>';
    }).join('');
  }

  function renderHome() {
    var t = state.totals || {};
    $('homeBalance').textContent = euros(t.balance);
    $('homeStock').textContent = String(t.inventoryCount || 0);
    $('homeLow').textContent = (t.lowStock || 0) + ' low stock';
    $('homeBook').textContent = String(t.openBookings || 0);
    $('homeMenu').textContent = String(t.menuCount || 0);
  }

  async function reload() {
    var data = await api('list');
    state.months = data.months || [];
    state.entries = data.entries || [];
    state.inventory = data.inventory || [];
    state.bookings = data.bookings || [];
    state.menu = data.menu || [];
    state.services = data.services || [];
    state.currency = data.currency || '€';
    state.totals = data.totals || {};
    document.title = data.appName || 'Foodeza ERP';
    if (state.monthId && !state.months.some(function (m) { return m.id === state.monthId; })) state.monthId = '';
    renderMonths();
    renderBookkeeping();
    renderInventory();
    renderServicesSelect();
    renderBookings();
    renderMenu();
    renderServices();
    renderHome();
    $('loginScreen').hidden = true;
    $('appScreen').hidden = false;
  }

  document.querySelectorAll('[data-mod]').forEach(function (el) {
    el.addEventListener('click', function () {
      showMod(el.getAttribute('data-mod'));
    });
  });

  document.querySelectorAll('[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.tab = btn.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('[data-panel]').forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== state.tab;
      });
    });
  });

  $('monthSelect').addEventListener('change', function () {
    state.monthId = this.value;
    localStorage.setItem('erp_month', state.monthId);
    reload().catch(function () {});
  });

  $('addMonthBtn').addEventListener('click', async function () {
    var name = $('newMonthName').value.trim();
    if (!name) return;
    var res = await api('add_month', { name: name, year: $('newMonthYear').value.trim() || String(new Date().getFullYear()) });
    state.monthId = res.month.id;
    localStorage.setItem('erp_month', state.monthId);
    $('newMonthName').value = '';
    await reload();
  });

  async function addEntry(type) {
    await api('add_entry', {
      type: type,
      monthId: state.monthId,
      title: $(type + 'Title').value,
      amount: $(type + 'Amount').value,
      category: $(type + 'Category').value,
      date: $(type + 'Date').value || today(),
      note: $(type + 'Note').value,
    });
    $(type + 'Title').value = '';
    $(type + 'Amount').value = '';
    $(type + 'Note').value = '';
    await reload();
  }

  $('addIncomeBtn').addEventListener('click', function () { addEntry('income'); });
  $('addExpenseBtn').addEventListener('click', function () { addEntry('expense'); });
  $('addPendingBtn').addEventListener('click', function () { addEntry('pending'); });

  $('addInvBtn').addEventListener('click', async function () {
    await api('add_inventory', {
      name: $('invName').value,
      qty: $('invQty').value,
      unit: $('invUnit').value,
      minQty: $('invMin').value,
    });
    $('invName').value = '';
    $('invQty').value = '';
    await reload();
  });

  $('addBkBtn').addEventListener('click', async function () {
    await api('add_booking', {
      customer: $('bkCustomer').value,
      phone: $('bkPhone').value,
      date: $('bkDate').value,
      guests: $('bkGuests').value,
      service: $('bkService').value,
      amount: $('bkAmount').value,
      note: $('bkNote').value,
    });
    $('bkCustomer').value = '';
    $('bkPhone').value = '';
    $('bkGuests').value = '';
    $('bkAmount').value = '';
    $('bkNote').value = '';
    await reload();
  });

  $('addMnBtn').addEventListener('click', async function () {
    await api('add_menu', {
      name: $('mnName').value,
      category: $('mnCat').value,
      price: $('mnPrice').value,
      diet: $('mnDiet').value,
    });
    $('mnName').value = '';
    $('mnPrice').value = '';
    await reload();
  });

  $('addSvBtn').addEventListener('click', async function () {
    await api('add_service', { name: $('svName').value, description: $('svDesc').value });
    $('svName').value = '';
    $('svDesc').value = '';
    await reload();
  });

  document.body.addEventListener('click', async function (ev) {
    var t = ev.target.closest('[data-receive],[data-del-entry],[data-adj],[data-del-inv],[data-bk-status],[data-del-bk],[data-toggle-mn],[data-del-mn],[data-toggle-sv],[data-del-sv]');
    if (!t) return;
    try {
      if (t.hasAttribute('data-receive')) await api('receive', { id: t.getAttribute('data-receive') });
      if (t.hasAttribute('data-del-entry') && confirm('Delete?')) await api('delete_entry', { id: t.getAttribute('data-del-entry') });
      if (t.hasAttribute('data-adj')) await api('adjust_inventory', { id: t.getAttribute('data-adj'), delta: t.getAttribute('data-delta') });
      if (t.hasAttribute('data-del-inv') && confirm('Delete item?')) await api('delete_inventory', { id: t.getAttribute('data-del-inv') });
      if (t.hasAttribute('data-bk-status')) await api('set_booking_status', { id: t.getAttribute('data-bk-status'), status: t.getAttribute('data-status') });
      if (t.hasAttribute('data-del-bk') && confirm('Delete booking?')) await api('delete_booking', { id: t.getAttribute('data-del-bk') });
      if (t.hasAttribute('data-toggle-mn')) await api('toggle_menu', { id: t.getAttribute('data-toggle-mn') });
      if (t.hasAttribute('data-del-mn') && confirm('Delete dish?')) await api('delete_menu', { id: t.getAttribute('data-del-mn') });
      if (t.hasAttribute('data-toggle-sv')) await api('toggle_service', { id: t.getAttribute('data-toggle-sv') });
      if (t.hasAttribute('data-del-sv') && confirm('Delete service?')) await api('delete_service', { id: t.getAttribute('data-del-sv') });
      await reload();
    } catch (e) {
      alert((e && e.error) || 'Could not update.');
    }
  });

  $('loginForm').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    try {
      await api('login', { pin: $('pinInput').value });
      await reload();
    } catch (e) {
      $('loginError').hidden = false;
    }
  });

  $('dateIncome').value = today();
  $('dateExpense').value = today();
  $('datePending').value = today();
  $('bkDate').value = today();
  $('newMonthYear').value = String(new Date().getFullYear());

  reload().catch(function () {});
})();
