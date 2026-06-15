/** Preise hier zentral pflegen — Cent-basierte Beträge = gerundete Euro */
    window.FOODEZA_MENU = window.FOODEZA_MENU || [];

    var POS_MENU_GROUP_ORDER = window.POS_MENU_GROUP_ORDER || [];
    var POS_CATEGORY_ORDER = window.POS_CATEGORY_ORDER || {};

    function formatMoney(cents) {
      var n = cents / 100;
      var s = n.toFixed(2);
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return parts.join(',');
    }

    function parseMoneyToCents(str) {
      if (typeof str !== 'string' && typeof str !== 'number') return 0;
      var t = ('' + str).trim().replace(/\s+/g, '').replace(',', '.');
      var v = parseFloat(t);
      if (isNaN(v) || v < 0) return 0;
      return Math.round(v * 100);
    }

    var state = { lines: [] };
    /** Wenn false: nur Artikel mit active !== false im Raster */
    var posMenuShowInactive = false;
    /** Aktives Menü: Corporate Lunch | Markt & Events */
    var posActiveMenuGroup = (window.POS_PAGE && window.POS_PAGE.menuGroup) || POS_MENU_GROUP_ORDER[0];

    function nextId() { return 'L' + Date.now() + Math.random().toString(36).slice(2, 7); }

    function euros(c) { return formatMoney(c) + '\u00A0€'; }

    /** Thumbnails: foodtruck/pos/images/{file}.png */
    var POS_IMAGE_FILES = {
      tea: 'chai',
      c65: 'c65',
      mojito: 'mojito',
      samosa: 'samosa',
      snackteller: 'snackteller',
      biriyani_group: 'biriyani',
    };

    function menuImageSrc(productId) {
      var file = POS_IMAGE_FILES[productId] || productId;
      return 'images/' + file + '.png';
    }

    function appendCategorySection(parent, cat, items, tmpl) {
      var node = tmpl.content.cloneNode(true);
      var sec = node.querySelector('.pos-category-section');
      sec.querySelector('h3').textContent = cat;
      var row = sec.querySelector('.pos-product-row');
      items.forEach(function (p) {
        var col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-xl-3';
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pos-product-btn w-100 h-100' + (p.active === false ? ' pos-product-inactive' : '');
        b.dataset.id = p.id;
        var imgSrc = menuImageSrc(p.id);
        b.innerHTML =
          '<span class="pos-product-thumb-wrap">' +
          '<img class="pos-product-thumb" src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" decoding="async">' +
          '</span>' +
          '<div class="fw-semibold small lh-sm">' + escapeHtml(p.name) + '</div>' +
          '<div class="text-danger small mt-1 fw-semibold">' + euros(p.priceCents) + '</div>';
        var imgEl = b.querySelector('.pos-product-thumb');
        if (imgEl) {
          imgEl.onerror = function () {
            this.style.display = 'none';
            var ptw = b.querySelector('.pos-product-thumb-wrap');
            if (ptw) {
              ptw.style.minHeight = '2rem';
              ptw.style.background = '#eee';
            }
          };
        }
        col.appendChild(b);
        row.appendChild(col);
      });
      parent.appendChild(node);
    }

    function rebuildCategories(filter) {
      var root = document.getElementById('pos-categories');
      var tmpl = document.getElementById('pos-tpl-category');
      root.innerHTML = '';
      var f = (filter || '').toLowerCase().trim();

      var grouped = {};
      window.FOODEZA_MENU.forEach(function (p) {
        if (!posMenuShowInactive && p.active === false) return;
        var g = p.menuGroup || 'Sonstiges';
        if (g !== posActiveMenuGroup) return;
        var searchHay = (p.name + ' ' + p.category + ' ' + g).toLowerCase();
        if (f && searchHay.indexOf(f) === -1) return;
        if (!grouped[g]) grouped[g] = {};
        if (!grouped[g][p.category]) grouped[g][p.category] = [];
        grouped[g][p.category].push(p);
      });

      var groupName = posActiveMenuGroup;
      var cats = grouped[groupName];
      if (cats) {
        var wrap = document.createElement('div');
        wrap.className = 'pos-menu-group';
        var catOrder = POS_CATEGORY_ORDER[groupName] || Object.keys(cats);
        catOrder.forEach(function (cat) {
          var items = cats[cat];
          if (!items || !items.length) return;
          appendCategorySection(wrap, cat, items, tmpl);
        });
        Object.keys(cats).forEach(function (cat) {
          if (catOrder.indexOf(cat) !== -1) return;
          appendCategorySection(wrap, cat, cats[cat], tmpl);
        });
        if (wrap.children.length) root.appendChild(wrap);
      }
    }

    function escapeHtml(s) {
      if (s == null) return '';
      s = String(s);
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function findMenuProduct(productId) {
      var menu = window.FOODEZA_MENU || [];
      for (var i = 0; i < menu.length; i++) {
        if (menu[i].id === productId) return menu[i];
      }
      return null;
    }

    function addLine(productId, custom) {
      if (custom) {
        state.lines.push({
          lineId: nextId(),
          customId: true,
          name: custom.name,
          unitCents: custom.unitCents,
          qty: 1
        });
      } else {
        var p = findMenuProduct(productId);
        if (!p) return;
        var ex = null;
        for (var j = 0; j < state.lines.length; j++) {
          if (!state.lines[j].customId && state.lines[j].productId === productId) {
            ex = state.lines[j];
            break;
          }
        }
        if (ex) {
          ex.qty += 1;
        } else {
          state.lines.push({
            lineId: nextId(),
            productId: productId,
            name: p.name,
            unitCents: p.priceCents,
            qty: 1
          });
        }
      }
      renderCart();
    }

    function lineSubtotal(l) { return l.unitCents * l.qty; }

    function subtotalCents() {
      return state.lines.reduce(function (s, l) { return s + lineSubtotal(l); }, 0);
    }

    function discountPct() {
      var el = document.getElementById('pos-discount-pct');
      var v = parseFloat(el.value);
      if (isNaN(v) || v < 0) return 0;
      return Math.min(100, v);
    }

    function totalCents() {
      var sub = subtotalCents();
      var d = discountPct() / 100;
      return Math.round(sub * (1 - d));
    }

    function syncPaymentMethodUI() {
      var cardEl = document.getElementById('pos-pay-method-card');
      if (!cardEl) return;
      var card = cardEl.checked;
      var hasCart = state.lines.length > 0;
      var showCash = hasCart && !card;
      var tenderWrap = document.getElementById('pos-tender-wrap');
      var tenderInp = document.getElementById('pos-tender-received');
      if (tenderWrap) tenderWrap.classList.toggle('d-none', !showCash);
      document.querySelectorAll('.pos-tender-quick').forEach(function (b) {
        b.disabled = !showCash;
      });
      if (tenderInp) tenderInp.disabled = !showCash;
    }

    function setChangeBoxState(stateName) {
      var box = document.getElementById('pos-change-box');
      if (!box) return;
      box.className = 'pos-change-box';
      if (stateName) box.classList.add('pos-change-box--' + stateName);
    }

    function renderCart() {
      var wrap = document.getElementById('pos-lines');
      var discountInput = document.getElementById('pos-discount-pct');
      var tplRoot = document.getElementById('pos-tpl-line');
      if (!wrap || !discountInput || !tplRoot || !tplRoot.content) {
        return;
      }
      discountInput.disabled = state.lines.length === 0;
      document.getElementById('pos-clear-all').disabled = state.lines.length === 0;
      document.getElementById('pos-complete-sale').disabled = state.lines.length === 0;
      document.getElementById('pos-print-draft').disabled = state.lines.length === 0;
      syncPaymentMethodUI();

      var tenderEl = document.getElementById('pos-tender-received');
      if (!state.lines.length) {
        wrap.innerHTML = '<p class="text-muted small mb-0 py-5 text-center">Cart is empty.</p>';
        document.getElementById('pos-subtotal').innerHTML = '0,00&nbsp;€';
        document.getElementById('pos-total').innerHTML = '0,00&nbsp;€';
        if (tenderEl) {
          tenderEl.value = '';
          tenderEl.disabled = true;
        }
        updateChangeDisplay();
        return;
      }

      wrap.innerHTML = '';
      state.lines.forEach(function (l) {
        var frag = document.importNode(tplRoot.content, true);
        var root = frag.querySelector('.pos-line');
        if (!root) return;
        var nm = frag.querySelector('.pos-line-name');
        var ea = frag.querySelector('.pos-line-each');
        var tl = frag.querySelector('.pos-line-total');
        var qtyEl = frag.querySelector('.pos-qty');
        var btnMinus = frag.querySelector('.pos-minus');
        var btnPlus = frag.querySelector('.pos-plus');
        var btnRm = frag.querySelector('.pos-remove');
        if (!nm || !ea || !tl || !qtyEl || !btnMinus || !btnPlus || !btnRm) return;

        root.dataset.lineId = l.lineId;
        nm.textContent = l.name || '';
        var uc = typeof l.unitCents === 'number' ? l.unitCents : 0;
        var q = typeof l.qty === 'number' ? l.qty : 0;
        ea.textContent = euros(uc) + ' × ' + q;
        tl.textContent = euros(uc * q);
        qtyEl.textContent = String(q);

        btnMinus.onclick = function () { changeQty(l.lineId, -1); };
        btnPlus.onclick = function () { changeQty(l.lineId, 1); };
        btnRm.onclick = function () { removeLine(l.lineId); };

        wrap.appendChild(root);
      });

      document.getElementById('pos-subtotal').textContent = euros(subtotalCents());
      document.getElementById('pos-total').textContent = euros(totalCents());
      updateChangeDisplay();
    }

    function tenderReceivedCents() {
      var raw = document.getElementById('pos-tender-received').value.trim();
      if (!raw) return null;
      return parseMoneyToCents(raw);
    }

    function updateChangeDisplay() {
      var valEl = document.getElementById('pos-change-value');
      if (!valEl) return;
      if (!state.lines.length) {
        valEl.textContent = '—';
        setChangeBoxState('');
        return;
      }
      if (document.getElementById('pos-pay-method-card').checked) {
        setChangeBoxState('');
        return;
      }
      var total = totalCents();
      var tender = tenderReceivedCents();
      if (tender === null) {
        valEl.textContent = '—';
        setChangeBoxState('hint');
        return;
      }
      if (tender < total) {
        var need = total - tender;
        valEl.textContent = '−' + euros(need);
        setChangeBoxState('short');
        return;
      }
      var change = tender - total;
      valEl.textContent = euros(change);
      setChangeBoxState('ok');
    }

    function changeQty(lineId, delta) {
      var l = null;
      for (var i = 0; i < state.lines.length; i++) {
        if (state.lines[i].lineId === lineId) {
          l = state.lines[i];
          break;
        }
      }
      if (!l) return;
      l.qty += delta;
      if (l.qty < 1) removeLine(lineId);
      else renderCart();
    }

    function removeLine(lineId) {
      state.lines = state.lines.filter(function (x) { return x.lineId !== lineId; });
      renderCart();
    }

    function clearAll() {
      state.lines = [];
      document.getElementById('pos-discount-pct').value = '0';
      document.getElementById('pos-tender-received').value = '';
      var rb = document.getElementById('pos-pay-method-bar');
      if (rb) rb.checked = true;
      renderCart();
    }

    function completeCheckout() {
      if (!state.lines.length) return;
      var bar = document.getElementById('pos-pay-method-bar').checked;
      if (bar) {
        var tot = totalCents();
        var tender = tenderReceivedCents();
        var cashExtra = {};
        if (tender != null) {
          if (tender < tot) {
            alert('Not enough cash: customer pays ' + euros(tender) + ', total due ' + euros(tot) + '.');
            return;
          }
          cashExtra = { tenderCents: tender, changeCents: tender - tot };
        }
        appendOrderRecord('Cash', cashExtra);
        logCompletedSale();
        clearAll();
      } else {
        appendOrderRecord('Card', {});
        logCompletedSale();
        clearAll();
      }
    }

    function buildReceiptHtml(paymentLabel, cashExtra) {
      cashExtra = cashExtra || {};
      var now = new Date();
      var lines = state.lines.map(function (l) {
        return '<tr><td>' + escapeHtml(l.name) + '</td><td class="txt-r">' + l.qty + '×</td><td class="txt-r">' + euros(lineSubtotal(l)) + '</td></tr>';
      }).join('');
      var sub = subtotalCents();
      var tot = totalCents();
      var disc = discountPct();
      var discLine = disc > 0 && sub !== tot
        ? '<tr><td colspan="2">Discount ' + disc + '%</td><td class="txt-r">−' + euros(sub - tot) + '</td></tr>'
        : '';
      var cashLines = '';
      if (cashExtra.tenderCents != null && cashExtra.changeCents != null) {
        cashLines =
          '<tr><td colspan="2">Tender</td><td class="txt-r">' + euros(cashExtra.tenderCents) + '</td></tr>' +
          '<tr><td colspan="2"><strong>Change</strong></td><td class="txt-r"><strong>' + euros(cashExtra.changeCents) + '</strong></td></tr>';
      }
      return (
        '<div class="rcp">' +
        '<h1 style="font-size:13px;margin:0 0 6px;text-align:center">FOODEZA</h1>' +
        '<div style="text-align:center;font-size:11px;margin-bottom:12px">' + escapeHtml(now.toLocaleString('en-GB')) + '</div>' +
        '<style>.rcp table{width:100%;border-collapse:collapse;font-size:12px}.rcp td{padding:4px 0;vertical-align:top}.rcp .txt-r{text-align:right;white-space:nowrap}.rcp hr{border:none;border-top:1px dashed #000;margin:8px 0}</style>' +
        '<table><tbody>' + lines + '</tbody></table>' +
        '<hr><table style="font-size:12px;width:100%">' +
        '<tr><td>Subtotal</td><td colspan="2" class="txt-r">' + euros(sub) + '</td></tr>' + discLine +
        '<tr><td colspan="2"><strong>Total due</strong></td><td class="txt-r"><strong>' + euros(tot) + '</strong></td></tr>' +
        cashLines +
        '<tr><td colspan="3"><strong>Payment:</strong> ' + escapeHtml(paymentLabel || '—') + '</td></tr>' +
        '</table>' +
        '<p style="font-size:10px;margin-top:16px;text-align:center">Thank you!</p>' +
        '</div>'
      );
    }

    function printReceipt(html, options) {
      options = options || {};
      var host = document.getElementById('pos-receipt-print');
      host.classList.remove('d-none');
      host.innerHTML = html;
      function cleanup() {
        host.classList.add('d-none');
        host.innerHTML = '';
        window.removeEventListener('afterprint', cleanup);
        if (options.clearAfter) clearAll();
      }
      window.addEventListener('afterprint', cleanup);
      window.print();
    }

    function refreshSessionFooter() {
      var day = new Date().toISOString().slice(0, 10);
      var footer = document.getElementById('pos-session-footer');
      if (!footer) return;
      try {
        var log = JSON.parse(sessionStorage.getItem('foodeza_pos_log') || 'null');
        var todayStr = '';
        if (log && log.day === day) {
          todayStr = 'Today: ' + euros(log.totalCents) + ' · ' + log.count + ' sale(s). ';
        }
        var n = readAllOrders().length;
        footer.textContent =
          todayStr +
          'Saved total: ' + n + ' order(s). Export via menu "Export summary".';
      } catch (e) {
        footer.textContent = '';
      }
    }

    function logCompletedSale() {
      var tot = totalCents();
      var day = new Date().toISOString().slice(0, 10);
      try {
        var log = JSON.parse(sessionStorage.getItem('foodeza_pos_log') || 'null');
        if (!log || log.day !== day) log = { day: day, totalCents: 0, count: 0 };
        log.totalCents += tot;
        log.count += 1;
        sessionStorage.setItem('foodeza_pos_log', JSON.stringify(log));
      } catch (e) { }
      refreshSessionFooter();
    }

    /** One logical file: newline-delimited JSON (JSON Lines), single localStorage key */
    var ORDERS_JSONL_KEY = 'foodeza_pos_orders_jsonl';
    var LEGACY_JOURNAL_KEY = 'foodeza_pos_journal_v1';

    function migrateLegacyJournalToJsonl() {
      var legacyRaw = localStorage.getItem(LEGACY_JOURNAL_KEY);
      if (!legacyRaw) return;
      try {
        var obj = JSON.parse(legacyRaw);
        var batch = [];
        Object.keys(obj).sort().forEach(function (day) {
          (obj[day] || []).forEach(function (txn) {
            batch.push(JSON.stringify(txn));
          });
        });
        if (!batch.length) {
          localStorage.removeItem(LEGACY_JOURNAL_KEY);
          return;
        }
        var prev = localStorage.getItem(ORDERS_JSONL_KEY) || '';
        var chunk = batch.join('\n');
        localStorage.setItem(ORDERS_JSONL_KEY, prev ? prev + '\n' + chunk : chunk);
        localStorage.removeItem(LEGACY_JOURNAL_KEY);
      } catch (e) { }
    }

    function linesToItemsSummary(lines) {
      return lines.map(function (l) {
        return l.qty + 'x ' + l.name;
      }).join(' | ');
    }

    function appendOrderRecord(paymentLabel, cashExtra) {
      cashExtra = cashExtra || {};
      var linesSnap = state.lines.map(function (l) {
        return { name: l.name, qty: l.qty, unitCents: l.unitCents };
      });
      var txn = {
        id: 'ord-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        ts: Date.now(),
        payment: paymentLabel,
        paymentMethod: (paymentLabel === 'Cash' || paymentLabel === 'Bar') ? 'cash' : 'card',
        lines: linesSnap,
        itemsSummary: linesToItemsSummary(linesSnap),
        subtotalCents: subtotalCents(),
        discountPct: discountPct(),
        totalCents: totalCents(),
        tenderCents: cashExtra.tenderCents != null ? cashExtra.tenderCents : null,
        changeCents: cashExtra.changeCents != null ? cashExtra.changeCents : null
      };
      try {
        var prev = localStorage.getItem(ORDERS_JSONL_KEY) || '';
        var line = JSON.stringify(txn);
        localStorage.setItem(ORDERS_JSONL_KEY, prev ? prev + '\n' + line : line);
      } catch (e) {
        alert('Storage full or blocked: could not save order.');
      }
      return txn;
    }

    function readAllOrders() {
      var raw = localStorage.getItem(ORDERS_JSONL_KEY) || '';
      if (!raw.trim()) return [];
      var out = [];
      raw.split('\n').forEach(function (row) {
        row = row.trim();
        if (!row) return;
        try {
          out.push(JSON.parse(row));
        } catch (err) { }
      });
      return out;
    }

    function ordersForDay(dayYmd) {
      return readAllOrders().filter(function (txn) {
        return new Date(txn.ts).toISOString().slice(0, 10) === dayYmd;
      });
    }

    function csvEscapeCell(val) {
      var s = val == null ? '' : String(val);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    function centsToDecimalDot(c) {
      if (c == null || c === '') return '';
      return (c / 100).toFixed(2);
    }

    function buildSummaryPayload() {
      var orders = readAllOrders();
      var sum = orders.reduce(function (s, o) {
        return s + (o.totalCents || 0);
      }, 0);
      var barSum = orders.filter(function (o) {
        return o.paymentMethod === 'cash' || o.payment === 'Bar' || o.payment === 'Cash';
      }).reduce(function (s, o) {
        return s + (o.totalCents || 0);
      }, 0);
      var cardSum = orders.filter(function (o) {
        return o.paymentMethod === 'card' || o.payment === 'Karte' || o.payment === 'Card';
      }).reduce(function (s, o) {
        return s + (o.totalCents || 0);
      }, 0);
      return {
        title: 'Foodeza POS — Full order summary',
        exportedAt: new Date().toISOString(),
        orderCount: orders.length,
        sumTotalCents: sum,
        sumTotalEUR: centsToDecimalDot(sum),
        sumBarEUR: centsToDecimalDot(barSum),
        sumCardEUR: centsToDecimalDot(cardSum),
        orders: orders
      };
    }

    function downloadSummaryJson() {
      var payload = buildSummaryPayload();
      if (!payload.orderCount) {
        alert('No saved orders.');
        return;
      }
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      triggerDownload(blob, 'Foodeza-POS-summary.json');
    }

    function downloadSummaryCsv() {
      var orders = readAllOrders();
      if (!orders.length) {
        alert('No saved orders.');
        return;
      }
      var headers = [
        'Order ID',
        'DateTime (ISO)',
        'Items',
        'Subtotal EUR',
        'Discount %',
        'Total EUR',
        'Payment',
        'Payment code',
        'Tender EUR',
        'Change EUR'
      ];
      var rows = [headers.join(',')];
      orders.forEach(function (o) {
        var items = o.itemsSummary || linesToItemsSummary(o.lines || []);
        var row = [
          csvEscapeCell(o.id),
          csvEscapeCell(new Date(o.ts).toISOString()),
          csvEscapeCell(items),
          csvEscapeCell(centsToDecimalDot(o.subtotalCents)),
          csvEscapeCell(o.discountPct != null ? o.discountPct : 0),
          csvEscapeCell(centsToDecimalDot(o.totalCents)),
          csvEscapeCell(o.payment || ''),
          csvEscapeCell(o.paymentMethod || ''),
          csvEscapeCell(o.tenderCents != null ? centsToDecimalDot(o.tenderCents) : ''),
          csvEscapeCell(o.changeCents != null ? centsToDecimalDot(o.changeCents) : '')
        ];
        rows.push(row.join(','));
      });
      var blob = new Blob([rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
      triggerDownload(blob, 'Foodeza-POS-summary.csv');
    }

    function downloadSummaryTxt() {
      var p = buildSummaryPayload();
      if (!p.orderCount) {
        alert('No saved orders.');
        return;
      }
      var lines = [];
      lines.push('FOODEZA POS — FULL SUMMARY');
      lines.push('Exported: ' + new Date(p.exportedAt).toLocaleString('en-GB'));
      lines.push('Order count: ' + p.orderCount);
      lines.push('Grand total: ' + formatMoney(p.sumTotalCents) + ' EUR');
      lines.push('');
      lines.push('Cash total: ' + p.sumBarEUR.replace('.', ',') + ' EUR');
      lines.push('Card total: ' + p.sumCardEUR.replace('.', ',') + ' EUR');
      lines.push('');
      p.orders.forEach(function (o, i) {
        lines.push('--- Order ' + (i + 1) + ' ---');
        lines.push('ID: ' + o.id);
        lines.push('Time: ' + new Date(o.ts).toLocaleString('en-GB'));
        lines.push('Items: ' + (o.itemsSummary || linesToItemsSummary(o.lines || [])));
        lines.push('Subtotal: ' + formatMoney(o.subtotalCents) + ' EUR');
        if (o.discountPct) lines.push('Discount: ' + o.discountPct + ' %');
        lines.push('Total due: ' + formatMoney(o.totalCents) + ' EUR');
        lines.push('Payment: ' + (o.payment || o.paymentMethod || ''));
        if (o.tenderCents != null) lines.push('Tender: ' + formatMoney(o.tenderCents) + ' EUR');
        if (o.changeCents != null) lines.push('Change: ' + formatMoney(o.changeCents) + ' EUR');
        lines.push('');
      });
      var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      triggerDownload(blob, 'Foodeza-POS-summary.txt');
    }

    function triggerDownload(blob, filename) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 2000);
    }

    /** Download one file containing every stored order (full detail per line). */
    function downloadAllOrdersJsonl() {
      var raw = localStorage.getItem(ORDERS_JSONL_KEY) || '';
      if (!raw.trim()) {
        alert('No orders saved yet.');
        return;
      }
      triggerDownload(new Blob([raw.trim() + '\n'], { type: 'application/x-ndjson;charset=utf-8' }), 'Foodeza-POS-all-orders.jsonl');
    }

    function pdfMoneyPlain(cents) {
      return formatMoney(cents) + ' EUR';
    }

    /**
     * Builds PDF of all completed sales for one calendar day (local ISO date).
     * Triggers browser download — cannot silently overwrite an existing file path.
     */
    function exportJournalPdf(dayOpt) {
      var day = dayOpt || new Date().toISOString().slice(0, 10);
      var list = ordersForDay(day);
      var PdfCtor = window.jspdf && window.jspdf.jsPDF;
      if (!PdfCtor) {
        alert('PDF library not loaded (check network/CDN).');
        return;
      }
      if (!list.length) {
        alert('No sales for ' + day + ' in local journal. Complete a cash or card sale first.');
        return;
      }

      var doc = new PdfCtor({ unit: 'mm', format: 'a4' });
      var margin = 14;
      var pageW = doc.internal.pageSize.getWidth();
      var rightX = pageW - margin;
      var y = 16;
      var lh = 5;

      function needSpace(mm) {
        if (y + mm > 278) {
          doc.addPage();
          y = 16;
        }
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Foodeza POS Journal', margin, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Date: ' + day + '    Sales: ' + list.length, margin, y);
      y += 10;

      var daySum = 0;
      list.forEach(function (txn, idx) {
        needSpace(28);
        doc.setFont('helvetica', 'bold');
        doc.text('Receipt ' + (idx + 1) + ' - ' + new Date(txn.ts).toLocaleString('en-GB'), margin, y);
        y += lh + 2;
        doc.setFont('helvetica', 'normal');

        txn.lines.forEach(function (line) {
          needSpace(lh * 2);
          var itemSum = line.unitCents * line.qty;
          var label = line.qty + ' x ' + String(line.name).replace(/\s+/g, ' ');
          var wrapped = doc.splitTextToSize(label, pageW - margin * 2 - 38);
          wrapped.forEach(function (chunk, wi) {
            needSpace(lh);
            doc.text(chunk, margin + 4, y);
            if (wi === wrapped.length - 1) {
              doc.text(pdfMoneyPlain(itemSum), rightX, y, { align: 'right' });
            }
            y += lh;
          });
        });

        if (txn.discountPct > 0 && txn.subtotalCents !== txn.totalCents) {
          needSpace(lh + 2);
          doc.text('Discount ' + txn.discountPct + ' %', margin + 4, y);
          doc.text('-' + pdfMoneyPlain(txn.subtotalCents - txn.totalCents), rightX, y, { align: 'right' });
          y += lh;
        }

        needSpace(lh + 2);
        doc.setFont('helvetica', 'bold');
        doc.text('Total', margin + 4, y);
        doc.text(pdfMoneyPlain(txn.totalCents), rightX, y, { align: 'right' });
        y += lh;
        doc.setFont('helvetica', 'normal');
        doc.text('Payment: ' + String(txn.payment), margin + 4, y);
        y += lh;
        if (txn.tenderCents != null && txn.changeCents != null) {
          doc.text(
            'Tender: ' + pdfMoneyPlain(txn.tenderCents) + '    Change: ' + pdfMoneyPlain(txn.changeCents),
            margin + 4,
            y
          );
          y += lh;
        }
        y += 4;
        doc.setDrawColor(200);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
        daySum += txn.totalCents;
      });

      needSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Day total', margin, y);
      doc.text(pdfMoneyPlain(daySum), rightX, y, { align: 'right' });
      y += lh + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        'All days raw data: export "Raw JSON Lines (.jsonl)". This PDF is for ' + day + ' only.',
        margin,
        y,
        { maxWidth: pageW - margin * 2 }
      );

      doc.save('Foodeza-POS-journal-' + day + '.pdf');
    }

    function tickClock() {
      // document.getElementById('pos-clock').textContent = new Date().toLocaleString('de-DE');
    }

    document.getElementById('pos-search').addEventListener('input', function () {
      rebuildCategories(this.value);
    });

    document.getElementById('pos-toggle-inactive').addEventListener('click', function () {
      posMenuShowInactive = !posMenuShowInactive;
      this.setAttribute('aria-pressed', posMenuShowInactive ? 'true' : 'false');
      this.classList.toggle('btn-secondary', posMenuShowInactive);
      this.classList.toggle('text-white', posMenuShowInactive);
      this.classList.toggle('btn-outline-secondary', !posMenuShowInactive);
      this.innerHTML = posMenuShowInactive
        ? '<i class="fas fa-eye me-1"></i>Active menu only'
        : '<i class="fas fa-eye-slash me-1"></i>Inactive menu';
      rebuildCategories(document.getElementById('pos-search').value || '');
    });

    document.getElementById('pos-categories').addEventListener('click', function (e) {
      var btn = e.target.closest('.pos-product-btn');
      if (!btn || !btn.dataset.id) return;
      addLine(btn.dataset.id);
    });

    document.getElementById('pos-clear-all').onclick = clearAll;

    document.getElementById('pos-discount-pct').addEventListener('change', renderCart);
    document.getElementById('pos-discount-pct').addEventListener('input', renderCart);

    document.getElementById('pos-tender-received').addEventListener('input', updateChangeDisplay);
    document.getElementById('pos-tender-received').addEventListener('change', updateChangeDisplay);

    document.getElementById('pos-pay-method-bar').addEventListener('change', function () {
      syncPaymentMethodUI();
      updateChangeDisplay();
    });
    document.getElementById('pos-pay-method-card').addEventListener('change', function () {
      syncPaymentMethodUI();
      updateChangeDisplay();
    });

    document.getElementById('pos-complete-sale').onclick = completeCheckout;

    document.querySelectorAll('.pos-tender-quick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!state.lines.length) return;
        var mode = btn.getAttribute('data-tender');
        var inp = document.getElementById('pos-tender-received');
        if (mode === 'clear') {
          inp.value = '';
          updateChangeDisplay();
          return;
        }
        if (mode === 'exact') {
          inp.value = formatMoney(totalCents());
          updateChangeDisplay();
          return;
        }
        var bill = parseInt(mode, 10);
        if (!isNaN(bill)) inp.value = formatMoney(bill * 100);
        updateChangeDisplay();
      });
    });

    document.getElementById('pos-btn-journal-pdf').onclick = function () {
      exportJournalPdf();
    };

    document.getElementById('pos-btn-summary-json').onclick = downloadSummaryJson;
    document.getElementById('pos-btn-summary-csv').onclick = downloadSummaryCsv;
    document.getElementById('pos-btn-summary-txt').onclick = downloadSummaryTxt;
    document.getElementById('pos-btn-export-jsonl').onclick = downloadAllOrdersJsonl;

    document.getElementById('pos-print-draft').onclick = function () {
      if (!state.lines.length) return;
      printReceipt(buildReceiptHtml('Draft'), { clearAfter: false });
    };

    document.getElementById('pos-btn-custom').onclick = function () {
      document.getElementById('pos-custom-label').value = '';
      document.getElementById('pos-custom-amount').value = '';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('pos-modal-custom')).show();
    };

    document.getElementById('pos-custom-add').onclick = function () {
      var label = document.getElementById('pos-custom-label').value.trim() || 'Custom';
      var amt = parseMoneyToCents(document.getElementById('pos-custom-amount').value);
      if (amt <= 0) return;
      addLine(null, {
        name: label,
        unitCents: amt
      });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('pos-modal-custom')).hide();
      renderCart();
    };


    if (window.POS_PAGE && window.POS_PAGE.title) {
      document.title = window.POS_PAGE.title;
      var brand = document.getElementById('pos-brand-title');
      if (brand) brand.textContent = window.POS_PAGE.brand || window.POS_PAGE.menuGroup;
    }
    migrateLegacyJournalToJsonl();
    rebuildCategories('');
    renderCart();
    refreshSessionFooter();
    // tickClock();
    // setInterval(tickClock, 1000);

    function renderOrdersModal() {
      var host = document.getElementById('pos-orders-list');
      if (!host) return;
      var orders = readAllOrders();
      if (!orders.length) {
        host.innerHTML = '<div class="text-muted small py-3 text-center">No orders saved yet.</div>';
        return;
      }
      orders.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      host.innerHTML = '';
      orders.slice(0, 200).forEach(function (o) {
        var dt = o.ts ? new Date(o.ts).toLocaleString('en-GB') : '';
        var items = o.itemsSummary || linesToItemsSummary(o.lines || []);
        var row = document.createElement('div');
        row.className = 'list-group-item';
        row.innerHTML =
          '<div class="d-flex justify-content-between align-items-start gap-3">' +
          '<div class="min-w-0">' +
          '<div class="fw-semibold small">#' + escapeHtml(o.id || '') + ' · ' + escapeHtml(dt) + '</div>' +
          '<div class="text-muted small text-truncate">' + escapeHtml(items) + '</div>' +
          '</div>' +
          '<div class="text-end flex-shrink-0">' +
          '<div class="fw-bold small text-danger">' + euros(o.totalCents || 0) + '</div>' +
          '<div class="text-muted small">' + escapeHtml(o.payment || '') + '</div>' +
          '</div>' +
          '</div>';
        host.appendChild(row);
      });
    }

    document.getElementById('pos-btn-view-orders').onclick = function () {
      renderOrdersModal();
      bootstrap.Modal.getOrCreateInstance(document.getElementById('pos-modal-orders')).show();
    };
    document.getElementById('pos-orders-refresh').onclick = renderOrdersModal;
    document.getElementById('pos-orders-download-csv').onclick = downloadSummaryCsv;
    document.getElementById('pos-orders-download-json').onclick = downloadSummaryJson;
    document.getElementById('pos-orders-download-jsonl').onclick = downloadAllOrdersJsonl;
    document.getElementById('pos-orders-clear').onclick = function () {
      if (!confirm('Delete all locally saved orders?')) return;
      try { localStorage.removeItem(ORDERS_JSONL_KEY); } catch (e) { }
      refreshSessionFooter();
      renderOrdersModal();
    };