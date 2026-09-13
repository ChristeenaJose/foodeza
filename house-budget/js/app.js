(function () {
  var state = {
    months: [],
    entries: [],
    monthId: localStorage.getItem('hb_month') || '',
    tab: 'pending',
    currency: '€',
  };

  var $ = function (id) { return document.getElementById(id); };

  function euros(n) {
    var v = Number(n || 0);
    return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00A0' + state.currency;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
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

  function entriesFor(type) {
    return state.entries.filter(function (row) {
      if (state.monthId && row.monthId !== state.monthId) return false;
      if (type === 'pending') return row.type === 'pending' && !row.received;
      return row.type === type;
    }).sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function monthLabel(id) {
    var m = state.months.find(function (x) { return x.id === id; });
    return m ? (m.name + ' ' + m.year) : 'All months';
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

  function renderTotals(totals) {
    $('sumIncome').textContent = euros(totals.income);
    $('sumExpense').textContent = euros(totals.expense);
    $('sumPending').textContent = euros(totals.pending);
    $('sumBalance').textContent = euros(totals.balance);
  }

  function renderList(type, nodeId) {
    var box = $(nodeId);
    var rows = entriesFor(type);
    if (!rows.length) {
      box.innerHTML = '<div class="empty">No ' + type + ' items yet.</div>';
      return;
    }
    box.innerHTML = rows.map(function (row) {
      var extra = '';
      if (type === 'pending') {
        extra = '<button class="btn btn-sm btn-success" data-receive="' + row.id + '">Payment received</button>';
      }
      extra += '<button class="btn btn-sm btn-outline-secondary" data-del="' + row.id + '">Delete</button>';
      return '<div class="entry-row">' +
        '<div><div class="fw-semibold">' + escapeHtml(row.title) + '</div>' +
        '<div class="small text-muted">' + escapeHtml(row.category || '') +
        (row.date ? ' · ' + escapeHtml(row.date) : '') +
        (row.note ? ' · ' + escapeHtml(row.note) : '') + '</div></div>' +
        '<div class="fw-bold">' + euros(row.amount) + '</div>' +
        '<div class="d-flex gap-2 justify-content-end">' + extra + '</div></div>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  async function reload() {
    var data = await api('list');
    state.months = data.months || [];
    state.entries = data.entries || [];
    state.currency = data.currency || '€';
    document.title = (data.appName || 'House Budget');
    $('appTitle').textContent = data.appName || 'House Budget';
    if (state.monthId && !state.months.some(function (m) { return m.id === state.monthId; })) {
      state.monthId = '';
    }
    renderMonths();
    var totals = data.totals;
    if (state.monthId) {
      totals = {
        income: 0, expense: 0, pending: 0, balance: 0
      };
      entriesFor('income').forEach(function (r) { totals.income += Number(r.amount); });
      entriesFor('expense').forEach(function (r) { totals.expense += Number(r.amount); });
      entriesFor('pending').forEach(function (r) { totals.pending += Number(r.amount); });
      totals.balance = totals.income - totals.expense;
    }
    renderTotals(totals);
    renderList('income', 'incomeList');
    renderList('expense', 'expenseList');
    renderList('pending', 'pendingList');
    $('currentMonthLabel').textContent = monthLabel(state.monthId);
    $('loginScreen').hidden = true;
    $('appScreen').hidden = false;
  }

  async function addEntry(type) {
    var prefix = type;
    await api('add_entry', {
      type: type,
      monthId: state.monthId,
      title: $(prefix + 'Title').value,
      amount: $(prefix + 'Amount').value,
      category: $(prefix + 'Category').value,
      date: $(prefix + 'Date').value || today(),
      note: $(prefix + 'Note').value,
    });
    $(prefix + 'Title').value = '';
    $(prefix + 'Amount').value = '';
    $(prefix + 'Note').value = '';
    await reload();
  }

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
    localStorage.setItem('hb_month', state.monthId);
    reload().catch(function () {});
  });

  $('addMonthBtn').addEventListener('click', async function () {
    var name = $('newMonthName').value.trim();
    var year = $('newMonthYear').value.trim() || String(new Date().getFullYear());
    if (!name) return;
    var res = await api('add_month', { name: name, year: year });
    state.monthId = res.month.id;
    localStorage.setItem('hb_month', state.monthId);
    $('newMonthName').value = '';
    await reload();
  });

  $('addIncomeBtn').addEventListener('click', function () { addEntry('income'); });
  $('addExpenseBtn').addEventListener('click', function () { addEntry('expense'); });
  $('addPendingBtn').addEventListener('click', function () { addEntry('pending'); });

  document.body.addEventListener('click', async function (ev) {
    var rec = ev.target.closest('[data-receive]');
    var del = ev.target.closest('[data-del]');
    try {
      if (rec) {
        await api('receive', { id: rec.getAttribute('data-receive') });
        await reload();
      }
      if (del && confirm('Delete this item?')) {
        await api('delete_entry', { id: del.getAttribute('data-del') });
        await reload();
      }
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
  $('newMonthYear').value = String(new Date().getFullYear());

  reload().catch(function () {});
})();
