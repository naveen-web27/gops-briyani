/**
 * ═══════════════════════════════════════════════════════════════
 *  BILLING — Google Apps Script
 *
 *  EXACT SHEET COLUMN ORDER (A → M):
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
 *  M: Pay Mode        ← new
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

// Must match your exact sheet columns A→M in order
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
  "Pay Mode"       // M — new column you added
];

/* ══════════════════════════════════════════
   GET — Read orders (used for bill number)
══════════════════════════════════════════ */
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    var sheet  = getSheet();

    if (action === "orders") {
      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return jsonOut({ status: "ok", rows: [] });
      var headers = data[0];
      var rows = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[String(h).trim()] = row[i] !== undefined ? row[i] : ""; });
        return obj;
      });
      return jsonOut({ status: "ok", rows: rows });
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
    var sheet = getSheet();

    // Auto-add header row if sheet is completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      styleHeader(sheet);
    }

    var now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // ⚠️ ROW ORDER MUST MATCH SHEET COLUMNS A → M EXACTLY
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
      body.payMode      || "UPI"        // M: Pay Mode
    ];

    sheet.appendRow(row);

    // Optional: color row by customer type (green=walk-in, blue=online)
    var lastRow = sheet.getLastRow();
    var color = (body.customerType === "Online") ? "#e3f2fd" : "#e8f5e9";
    sheet.getRange(lastRow, 1, 1, HEADERS.length).setBackground(color);

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
  }
  return sheet;
}

function styleHeader(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#180900")
    .setFontColor("#c9922a")
    .setFontWeight("bold")
    .setFontSize(10);
  sheet.setFrozenRows(1);

  // Column widths A→M
  [150, 80, 120, 300, 80, 100, 80, 80, 70, 100, 110, 180, 90]
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
    payMode:      "Cash"
  })}});
  Logger.log("Walk-in test:", result.getContent());
}

function test_saveOnline() {
  var result = doPost({ postData: { contents: JSON.stringify({
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
    payMode:      "UPI"
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