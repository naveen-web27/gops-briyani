/**
 * ═══════════════════════════════════════════════════════════════
 *  BILLING — Google Apps Script
 *
 *  EXACT SHEET COLUMN ORDER (A → O):
 *  A: Timestamp
 *  B: Bill No
 *  C: Customer
 *  D: Items
 *  E: Subtotal
 *  F: GST
 *  G: Discount
 *  H: Total
 *  I: Status
 *  J: Customer Type   ← new
 *  K: Phone           ← new
 *  L: Address         ← new
 *  M: Pay Mode
 *  N: Order ID        ← used for hold/resume updates
 *  O: Table No        ← optional table number
 *
 *  SETUP:
 *  1. Extensions → Apps Script → Paste this → Save (Ctrl+S)
 *  2. Deploy → New Deployment
 *       Type: Web App | Execute as: Me | Who can access: Anyone
 *  3. Copy the Web App URL
 *  4. Paste into billing.html → var ORDERS_URL = "..."
 * ═══════════════════════════════════════════════════════════════
 */

var SHEET_NAME = "Orders";
var MENU_SHEET_NAME = "Menu";
var INVENTORY_SHEET_NAME = "Inventory";
var SESSION_SHEET_NAME = "Sessions";

var AUTH_CLIENTS = {
  gops_briyani: {
    password: "change-gops-password",
    sessionMs: 24 * 60 * 60 * 1000
  },
  bakery_demo: {
    password: "change-bakery-password",
    sessionMs: 24 * 60 * 60 * 1000
  }
};

// Must match your exact sheet columns A→O in order
var HEADERS = [
  "Timestamp",     // A — already exists
  "Bill No",       // B — already exists
  "Customer",      // C — already exists
  "Items",         // D — already exists
  "Subtotal",      // E — already exists
  "GST",           // F — already exists
  "Discount",      // G — already exists
  "Total",         // H — already exists
  "Status",        // I — already exists
  "Customer Type", // J — new column you added
  "Phone",         // K — new column you added
  "Address",       // L — new column you added
  "Pay Mode",      // M
  "Order ID",      // N
  "Table No"       // O
];

var INVENTORY_HEADERS = [
  "Item ID",
  "Item Name",
  "Category",
  "Unit",
  "Stock Qty",
  "Min Qty",
  "Unit Cost",
  "Supplier",
  "Status",
  "Last Updated"
];

var MENU_HEADERS = [
  "Category",
  "Name",
  "Description",
  "Price",
  "Type",
  "ImageURL",
  "Badge",
  "Available"
];

var SESSION_HEADERS = [
  "Client",
  "Token Hash",
  "Created At",
  "Expires At",
  "Status"
];

/* ══════════════════════════════════════════
   GET — Read orders (used for bill number)
══════════════════════════════════════════ */
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";

    if (action === "login") {
      return loginClient(e);
    }
    if (action === "validateSession") {
      return validateSessionRequest(e);
    }
    if (action === "logout") {
      return logoutClient(e);
    }

    var auth = requireAuth((e.parameter && e.parameter.client) || "", (e.parameter && e.parameter.token) || "");
    if (!auth.ok) return authError(auth.message);

    if (action === "menu") {
      return rowsOut(getMenuSheet(), MENU_HEADERS);
    }

    var sheet  = getSheet();

    if (action === "orders") {
      return rowsOut(sheet, HEADERS);
    }

    if (action === "inventory") {
      return rowsOut(getInventorySheet(), INVENTORY_HEADERS);
    }

    return jsonOut({ status: "ok", message: "Billing API ready" });

  } catch(err) {
    return jsonOut({ status: "error", message: err.message });
  }
}

/* ══════════════════════════════════════════
   POST — Save one bill row to sheet
══════════════════════════════════════════ */
function doPost(e) {
  try {
    var body  = JSON.parse(e.postData.contents);
    var auth = requireAuth(body.client || "", body.token || "");
    if (!auth.ok) return authError(auth.message);
    var sheet = getSheet();

    ensureHeaders(sheet);

    var action = body.action || "";
    if (action === "upsertOrder") {
      return upsertOrder(sheet, body);
    }
    if (action === "addDish") {
      return addDish(getMenuSheet(), body);
    }
    if (action === "editDish") {
      return editDish(getMenuSheet(), body);
    }
    if (action === "editField") {
      return editDishField(getMenuSheet(), body);
    }
    if (action === "deleteDish") {
      return deleteDish(getMenuSheet(), body);
    }
    if (action === "saveInventoryItem") {
      return saveInventoryItem(getInventorySheet(), body);
    }
    if (action === "deleteInventoryItem") {
      return deleteInventoryItem(getInventorySheet(), body);
    }
    if (action === "adjustInventoryStock") {
      return adjustInventoryStock(getInventorySheet(), body);
    }

    var now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Fallback append mode for backward compatibility
    var row = [
      now,                              // A: Timestamp
      body.billNo       || "",          // B: Bill No
      body.customer     || "Walk-in",   // C: Customer
      body.items        || "",          // D: Items
      body.subtotal     || "0",         // E: Subtotal
      body.gst          || "--",        // F: GST
      body.discount     || "--",        // G: Discount
      body.total        || "0",         // H: Total
      body.status       || "Closed",    // I: Status
      body.customerType || "Walk-in",   // J: Customer Type
      body.phone        || "--",        // K: Phone
      body.address      || "--",        // L: Address
      body.payMode      || "UPI",       // M: Pay Mode
      body.orderId      || genOrderId(), // N: Order ID
      body.tableNo      || "--"         // O: Table No
    ];

    sheet.appendRow(row);

    var lastRow = sheet.getLastRow();
    colorizeOrderRow(sheet, lastRow, body.status || "Closed", body.customerType || "Walk-in");

    return jsonOut({ status: "ok", message: "Saved", billNo: body.billNo });

  } catch(err) {
    return jsonOut({ status: "error", message: err.message });
  }
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */

function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    styleHeader(sheet);
  } else {
    ensureHeaders(sheet);
  }
  return sheet;
}

function getMenuSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MENU_SHEET_NAME);
  if (!sheet) throw new Error('Menu sheet "' + MENU_SHEET_NAME + '" not found');
  ensureMenuHeaders(sheet);
  return sheet;
}

function getInventorySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INVENTORY_SHEET_NAME);
    sheet.appendRow(INVENTORY_HEADERS);
    styleInventoryHeader(sheet);
  } else {
    ensureInventoryHeaders(sheet);
  }
  return sheet;
}

function getSessionSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SESSION_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SESSION_SHEET_NAME);
    sheet.appendRow(SESSION_HEADERS);
    styleSessionHeader(sheet);
  } else {
    ensureSessionHeaders(sheet);
  }
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    styleHeader(sheet);
    return;
  }

  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var changed = false;

  for (var i = 0; i < HEADERS.length; i++) {
    if (!String(current[i] || "").trim()) {
      sheet.getRange(1, i + 1).setValue(HEADERS[i]);
      changed = true;
    }
  }

  if (changed) {
    styleHeader(sheet);
  }
}

function ensureInventoryHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(INVENTORY_HEADERS);
    styleInventoryHeader(sheet);
    return;
  }

  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var changed = false;
  for (var i = 0; i < INVENTORY_HEADERS.length; i++) {
    if (!String(current[i] || "").trim()) {
      sheet.getRange(1, i + 1).setValue(INVENTORY_HEADERS[i]);
      changed = true;
    }
  }
  if (changed) styleInventoryHeader(sheet);
}

function ensureMenuHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(MENU_HEADERS);
    styleMenuHeader(sheet);
    return;
  }
  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var changed = false;
  for (var i = 0; i < MENU_HEADERS.length; i++) {
    if (!String(current[i] || "").trim()) {
      sheet.getRange(1, i + 1).setValue(MENU_HEADERS[i]);
      changed = true;
    }
  }
  if (changed) styleMenuHeader(sheet);
}

function ensureSessionHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SESSION_HEADERS);
    styleSessionHeader(sheet);
    return;
  }
  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var changed = false;
  for (var i = 0; i < SESSION_HEADERS.length; i++) {
    if (!String(current[i] || "").trim()) {
      sheet.getRange(1, i + 1).setValue(SESSION_HEADERS[i]);
      changed = true;
    }
  }
  if (changed) styleSessionHeader(sheet);
}

function rowsOut(sheet, expectedHeaders) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOut({ status: "ok", rows: [] });
  var headers = data[0];
  var rows = data.slice(1).map(function(row, idx) {
    var obj = {};
    headers.forEach(function(h, i) { obj[String(h).trim()] = row[i] !== undefined ? row[i] : ""; });
    obj._row = idx + 2;
    return obj;
  }).filter(function(row) {
    return expectedHeaders.some(function(h) { return String(row[h] || '').trim(); });
  });
  return jsonOut({ status: "ok", rows: rows });
}

function clientConfig(client) {
  return AUTH_CLIENTS[String(client || '').trim()] || null;
}

function loginClient(e) {
  var client = (e.parameter && e.parameter.client) || '';
  var password = (e.parameter && e.parameter.password) || '';
  var cfg = clientConfig(client);
  if (!cfg) return authError('Unknown client');
  if (!password || password !== cfg.password) return authError('Invalid password');

  cleanupExpiredSessions();
  var token = Utilities.getUuid() + Utilities.getUuid();
  var expiresAt = Date.now() + (cfg.sessionMs || (24 * 60 * 60 * 1000));
  var sheet = getSessionSheet();
  sheet.appendRow([
    client,
    hashToken(token),
    new Date().toISOString(),
    new Date(expiresAt).toISOString(),
    'active'
  ]);
  return jsonOut({ status: 'ok', token: token, expiresAt: expiresAt });
}

function validateSessionRequest(e) {
  var client = (e.parameter && e.parameter.client) || '';
  var token = (e.parameter && e.parameter.token) || '';
  var auth = requireAuth(client, token);
  if (!auth.ok) return authError(auth.message);
  return jsonOut({ status: 'ok', valid: true });
}

function logoutClient(e) {
  var client = (e.parameter && e.parameter.client) || '';
  var token = (e.parameter && e.parameter.token) || '';
  revokeSession(client, token);
  return jsonOut({ status: 'ok', loggedOut: true });
}

function requireAuth(client, token) {
  if (!client || !token) return { ok: false, message: 'Login required' };
  var cfg = clientConfig(client);
  if (!cfg) return { ok: false, message: 'Unknown client' };
  cleanupExpiredSessions();

  var sheet = getSessionSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, message: 'Session not found' };

  var tokenHash = hashToken(token);
  var data = sheet.getRange(2, 1, lastRow - 1, SESSION_HEADERS.length).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    var rowClient = String(data[i][0] || '').trim();
    var rowHash = String(data[i][1] || '').trim();
    var expires = new Date(String(data[i][3] || '')).getTime();
    var status = String(data[i][4] || '').trim().toLowerCase();
    if (rowClient === client && rowHash === tokenHash && status === 'active' && expires > Date.now()) {
      return { ok: true };
    }
  }
  return { ok: false, message: 'Session expired' };
}

function revokeSession(client, token) {
  if (!client || !token) return;
  var sheet = getSessionSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var tokenHash = hashToken(token);
  var data = sheet.getRange(2, 1, lastRow - 1, SESSION_HEADERS.length).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0] || '').trim() === client && String(data[i][1] || '').trim() === tokenHash) {
      sheet.getRange(i + 2, 5).setValue('revoked');
      return;
    }
  }
}

function cleanupExpiredSessions() {
  var sheet = getSessionSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, SESSION_HEADERS.length).getValues();
  var now = Date.now();
  for (var i = data.length - 1; i >= 0; i--) {
    var expires = new Date(String(data[i][3] || '')).getTime();
    var status = String(data[i][4] || '').trim().toLowerCase();
    if ((expires && expires <= now) || status === 'revoked') {
      sheet.deleteRow(i + 2);
    }
  }
}

function hashToken(token) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''));
  var out = [];
  for (var i = 0; i < bytes.length; i++) {
    var v = bytes[i];
    if (v < 0) v += 256;
    out.push((v < 16 ? '0' : '') + v.toString(16));
  }
  return out.join('');
}

function authError(message) {
  return jsonOut({ status: 'error', code: 'AUTH_REQUIRED', message: message || 'Unauthorized' });
}

function inventoryNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function cleanNum(v, fallback) {
  var n = parseFloat(String(v || "").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? fallback : n;
}

function saveInventoryItem(sheet, body) {
  ensureInventoryHeaders(sheet);

  var itemId = String(body.itemId || "").trim() || ("ITM-" + Utilities.getUuid().slice(0, 8));
  var name = String(body.itemName || "").trim();
  if (!name) return jsonOut({ status: "error", message: "Item name is required" });

  var row = [
    itemId,
    name,
    String(body.category || "General").trim(),
    String(body.unit || "Nos").trim(),
    cleanNum(body.stockQty, 0),
    cleanNum(body.minQty, 0),
    cleanNum(body.unitCost, 0),
    String(body.supplier || "").trim(),
    String(body.status || "Active").trim(),
    inventoryNow()
  ];

  var lastRow = sheet.getLastRow();
  var targetRow = 0;
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0] || "").trim() === itemId) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, INVENTORY_HEADERS.length).setValues([row]);
    return jsonOut({ status: "ok", mode: "updated", itemId: itemId });
  }

  sheet.appendRow(row);
  return jsonOut({ status: "ok", mode: "created", itemId: itemId });
}

function deleteInventoryItem(sheet, body) {
  ensureInventoryHeaders(sheet);
  var rowIndex = parseInt(body.rowIndex, 10);
  var itemId = String(body.itemId || "").trim();
  var lastRow = sheet.getLastRow();

  if (!isNaN(rowIndex) && rowIndex >= 2 && rowIndex <= lastRow) {
    sheet.deleteRow(rowIndex);
    return jsonOut({ status: "ok", message: "Deleted", rowIndex: rowIndex });
  }

  if (!itemId) return jsonOut({ status: "error", message: "rowIndex or itemId required" });

  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0] || "").trim() === itemId) {
        sheet.deleteRow(i + 2);
        return jsonOut({ status: "ok", message: "Deleted", itemId: itemId });
      }
    }
  }

  return jsonOut({ status: "error", message: "Item not found" });
}

function adjustInventoryStock(sheet, body) {
  ensureInventoryHeaders(sheet);
  var itemId = String(body.itemId || "").trim();
  var delta = cleanNum(body.delta, 0);
  if (!itemId) return jsonOut({ status: "error", message: "itemId required" });

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOut({ status: "error", message: "No inventory data" });

  var data = sheet.getRange(2, 1, lastRow - 1, INVENTORY_HEADERS.length).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0] || "").trim() === itemId) {
      var stock = cleanNum(data[i][4], 0) + delta;
      if (stock < 0) stock = 0;
      sheet.getRange(i + 2, 5).setValue(stock);
      sheet.getRange(i + 2, 10).setValue(inventoryNow());
      return jsonOut({ status: "ok", itemId: itemId, stockQty: stock });
    }
  }

  return jsonOut({ status: "error", message: "Item not found" });
}

function menuRowFromBody(body) {
  return [
    String(body.Category || body.category || '').trim(),
    String(body.Name || body.name || '').trim(),
    String(body.Description || body.description || '').trim(),
    String(body.Price || body.price || '0').trim(),
    String(body.Type || body.type || 'Veg').trim(),
    String(body.ImageURL || body.imageUrl || '').trim(),
    String(body.Badge || body.badge || '').trim(),
    String(body.Available || body.available || 'Yes').trim()
  ];
}

function addDish(sheet, body) {
  ensureMenuHeaders(sheet);
  var row = menuRowFromBody(body);
  if (!row[0] || !row[1] || !row[3]) return jsonOut({ status: 'error', message: 'Category, Name and Price are required' });
  sheet.appendRow(row);
  return jsonOut({ status: 'ok', mode: 'created' });
}

function editDish(sheet, body) {
  ensureMenuHeaders(sheet);
  var rowIndex = parseInt(body.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) return jsonOut({ status: 'error', message: 'Valid rowIndex required' });
  var row = menuRowFromBody(body);
  if (!row[0] || !row[1] || !row[3]) return jsonOut({ status: 'error', message: 'Category, Name and Price are required' });
  sheet.getRange(rowIndex, 1, 1, MENU_HEADERS.length).setValues([row]);
  return jsonOut({ status: 'ok', mode: 'updated', rowIndex: rowIndex });
}

function editDishField(sheet, body) {
  ensureMenuHeaders(sheet);
  var rowIndex = parseInt(body.rowIndex, 10);
  var field = String(body.field || '').trim();
  var colIndex = MENU_HEADERS.indexOf(field) + 1;
  if (isNaN(rowIndex) || rowIndex < 2 || !colIndex) return jsonOut({ status: 'error', message: 'Valid rowIndex and field required' });
  sheet.getRange(rowIndex, colIndex).setValue(body.value === undefined ? '' : body.value);
  return jsonOut({ status: 'ok', rowIndex: rowIndex, field: field });
}

function deleteDish(sheet, body) {
  ensureMenuHeaders(sheet);
  var rowIndex = parseInt(body.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) return jsonOut({ status: 'error', message: 'Valid rowIndex required' });
  sheet.deleteRow(rowIndex);
  return jsonOut({ status: 'ok', rowIndex: rowIndex });
}

function upsertOrder(sheet, body) {
  var now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  var status = (body.status || "Held").toString();

  var row = [
    now,
    body.billNo       || "",
    body.customer     || "Walk-in",
    body.items        || "",
    body.subtotal     || "0",
    body.gst          || "--",
    body.discount     || "--",
    body.total        || "0",
    status,
    body.customerType || "Walk-in",
    body.phone        || "--",
    body.address      || "--",
    body.payMode      || "UPI",
    body.orderId      || genOrderId(),
    body.tableNo      || "--"
  ];

  var idCol = HEADERS.indexOf("Order ID") + 1;
  var billCol = HEADERS.indexOf("Bill No") + 1;
  var lastRow = sheet.getLastRow();
  var targetRow = 0;

  if (lastRow > 1) {
    var idToFind = String(body.orderId || "").trim();
    var billToFind = String(body.billNo || "").trim();

    if (idToFind) {
      var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0] || "").trim() === idToFind) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (!targetRow && billToFind) {
      var bills = sheet.getRange(2, billCol, lastRow - 1, 1).getValues();
      for (var j = bills.length - 1; j >= 0; j--) {
        if (String(bills[j][0] || "").trim() === billToFind) {
          targetRow = j + 2;
          break;
        }
      }
    }
  }

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([row]);
    colorizeOrderRow(sheet, targetRow, status, body.customerType || "Walk-in");
    return jsonOut({ status: "ok", mode: "updated", billNo: row[1], orderId: row[13] });
  }

  sheet.appendRow(row);
  var newRow = sheet.getLastRow();
  colorizeOrderRow(sheet, newRow, status, body.customerType || "Walk-in");
  return jsonOut({ status: "ok", mode: "created", billNo: row[1], orderId: row[13] });
}

function colorizeOrderRow(sheet, rowNum, status, customerType) {
  var st = String(status || "").toLowerCase();
  var color = "#f3f4f6";

  if (st === "closed") {
    color = "#e8f5e9";
  } else if (st === "held" || st === "open") {
    color = "#fff8e1";
  } else if (String(customerType || "") === "Online") {
    color = "#e3f2fd";
  }

  sheet.getRange(rowNum, 1, 1, HEADERS.length).setBackground(color);
}

function genOrderId() {
  return "ORD-" + Utilities.getUuid();
}

function styleHeader(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#180900")
    .setFontColor("#c9922a")
    .setFontWeight("bold")
    .setFontSize(10);
  sheet.setFrozenRows(1);

  // Column widths A→O
  [150, 90, 130, 300, 80, 100, 80, 90, 80, 110, 110, 180, 95, 210, 90]
    .forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
}

function styleInventoryHeader(sheet) {
  sheet.getRange(1, 1, 1, INVENTORY_HEADERS.length)
    .setBackground("#180900")
    .setFontColor("#c9922a")
    .setFontWeight("bold")
    .setFontSize(10);
  sheet.setFrozenRows(1);

  [130, 220, 140, 90, 90, 90, 100, 180, 90, 160]
    .forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
}

function styleMenuHeader(sheet) {
  sheet.getRange(1, 1, 1, MENU_HEADERS.length)
    .setBackground('#180900')
    .setFontColor('#c9922a')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setFrozenRows(1);

  [140, 220, 260, 90, 90, 220, 110, 90]
    .forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
}

function styleSessionHeader(sheet) {
  sheet.getRange(1, 1, 1, SESSION_HEADERS.length)
    .setBackground('#180900')
    .setFontColor('#c9922a')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setFrozenRows(1);

  [140, 330, 180, 180, 100]
    .forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════
   TEST — run these in Apps Script editor
   to verify data saves correctly
══════════════════════════════════════════ */

function test_saveWalkIn() {
  var result = doPost({ postData: { contents: JSON.stringify({
    action:       "upsertOrder",
    billNo:       "Bill #0001",
    customer:     "Kavitha",
    items:        "Health Mix x2 (360.00) | ABC Malt x1 (200.00)",
    subtotal:     "560.00",
    gst:          "GST 5% = 28.00",
    discount:     "--",
    total:        "588.00",
    status:       "Closed",
    customerType: "Walk-in",
    phone:        "9876543210",
    address:      "--",
    payMode:      "Cash",
    orderId:      "ORD-TEST-1",
    tableNo:      "T1"
  })}});
  Logger.log("Walk-in test:", result.getContent());
}

function test_saveOnline() {
  var result = doPost({ postData: { contents: JSON.stringify({
    action:       "upsertOrder",
    billNo:       "Bill #0002",
    customer:     "Meena S.",
    items:        "Rose Face Pack x1 (170.00)",
    subtotal:     "170.00",
    gst:          "--",
    discount:     "--",
    total:        "170.00",
    status:       "Closed",
    customerType: "Online",
    phone:        "9123456780",
    address:      "12, Anna Nagar, Erode",
    payMode:      "UPI",
    orderId:      "ORD-TEST-2",
    tableNo:      "--"
  })}});
  Logger.log("Online test:", result.getContent());
}

function test_getOrders() {
  var result = doGet({ parameter: { action: "orders" } });
  var data   = JSON.parse(result.getContent());
  Logger.log("Total rows:", data.rows.length);
  if (data.rows.length) {
    var last = data.rows[data.rows.length - 1];
    Logger.log("Last row — Customer:", last["Customer"], "| Phone:", last["Phone"], "| Pay Mode:", last["Pay Mode"]);
  }
}