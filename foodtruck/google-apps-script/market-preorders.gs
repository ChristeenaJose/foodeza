/**
 * Foodeza Market preorders — bind to sheet: weekly market preoder (Form Responses 1)
 *
 * SETUP
 * 1. Open the Google Sheet linked to your form.
 * 2. Ensure column header "Status" exists (or script creates it on first update).
 * 3. Extensions → Apps Script → paste this file → Save.
 * 4. (Optional) Script properties → API_TOKEN = long random string.
 * 5. Deploy → New deployment → Web app → Execute as: Me → Anyone → copy /exec URL.
 * 6. Paste /exec URL into pos-preorders-config.js → writeApiUrl on your website.
 */

var SHEET_NAME = 'Form Responses 1';
var STATUS_VALUES = ['Pending', 'Confirmed', 'Collected'];

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '';
}

function verifyToken_(token) {
  var expected = getToken_();
  if (!expected || expected.length < 16) return true;
  return String(token || '') === expected;
}

function headerKey_(h) {
  return String(h || '').trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_äöüß:]/g, '')
    .replace(/:+$/, '');
}

function findStatusCol_(headers) {
  for (var i = 0; i < headers.length; i++) {
    var k = headerKey_(headers[i]);
    if (k === 'status' || k === 'collected' || k === 'abgeholt') return i;
  }
  return -1;
}

function normalizeStatus_(val) {
  var s = String(val || '').trim().toLowerCase();
  if (s === 'collected' || s === 'abgeholt' || s === 'done') return 'Collected';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'pending' || s === '') return 'Pending';
  for (var i = 0; i < STATUS_VALUES.length; i++) {
    if (STATUS_VALUES[i].toLowerCase() === s) return STATUS_VALUES[i];
  }
  return 'Pending';
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

function formatCell_(val) {
  if (val instanceof Date) return val.toISOString();
  if (val == null) return '';
  return String(val);
}

function parseRow_(headers, row, rowIndex, statusCol) {
  var o = {
    rowIndex: rowIndex,
    name: '',
    timestamp: '',
    chickenBiryani: '',
    total: '',
    status: 'Pending'
  };

  for (var j = 0; j < headers.length; j++) {
    var key = headerKey_(headers[j]);
    var val = formatCell_(row[j]);
    if (!key) continue;
    if (key === 'name') o.name = val;
    else if (key === 'timestamp' || key.indexOf('zeitstempel') === 0) o.timestamp = val;
    else if (key.indexOf('chicken') !== -1 && (key.indexOf('biri') !== -1 || key.indexOf('biry') !== -1)) o.chickenBiryani = val;
    else if (key === 'summe' || key === 'total') o.total = val;
    else if (key === 'status') o.status = normalizeStatus_(val);
  }

  if (statusCol >= 0) {
    o.status = normalizeStatus_(row[statusCol]);
  }
  return o;
}

function rowHasContent_(row) {
  if (!row) return false;
  for (var i = 0; i < row.length; i++) {
    if (String(row[i] || '').trim() !== '') return true;
  }
  return false;
}

function doGet() {
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse({ ok: true, orders: [] });
    }
    var headers = values[0];
    var statusCol = findStatusCol_(headers);
    var orders = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      if (!rowHasContent_(row)) continue;
      orders.push(parseRow_(headers, row, r + 1, statusCol));
    }
    orders.reverse();
    return jsonResponse({ ok: true, orders: orders });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (!verifyToken_(body.token)) {
      return jsonResponse({ ok: false, error: 'unauthorized' });
    }

    var action = String(body.action || '');
    if (action !== 'setStatus' && action !== 'setCollected') {
      return jsonResponse({ ok: false, error: 'unknown_action' });
    }

    var rowIndex = parseInt(body.rowIndex, 10);
    if (!rowIndex || rowIndex < 2) {
      return jsonResponse({ ok: false, error: 'invalid_row' });
    }

    var status;
    if (action === 'setCollected') {
      status = body.collected ? 'Collected' : 'Pending';
    } else {
      status = normalizeStatus_(body.status);
    }

    var sheet = getSheet_();
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var statusCol = findStatusCol_(headers);

    if (statusCol < 0) {
      statusCol = lastCol;
      sheet.getRange(1, statusCol + 1).setValue('Status');
    }

    sheet.getRange(rowIndex, statusCol + 1).setValue(status);
    return jsonResponse({ ok: true, status: status });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
