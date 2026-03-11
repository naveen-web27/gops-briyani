/**
 * ═══════════════════════════════════════════════════════════════
 *  RESTAURANT — Google Apps Script (FULL VERSION)
 *  Handles: Menu CRUD + Orders Save + Admin Read
 * ═══════════════════════════════════════════════════════════════
 *
 *  SETUP:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Paste this entire file (replace all existing code)
 *  3. Save (Ctrl+S)
 *  4. Deploy → New Deployment
 *     - Type:           Web App
 *     - Execute as:     Me
 *     - Who can access: Anyone
 *  5. Click Deploy → Copy the Web App URL
 *  6. Paste into:
 *       • admin.html   → sidebar "Apps Script URL" field
 *       • index.html   → CONFIG.sheetCSV  (use the CSV publish URL for menu)
 *       • billing.html → ORDERS_URL
 *
 *  REQUIRED SHEET TABS:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ Tab: "Menu"                                             │
 *  │ A: Category  B: Name  C: Description  D: Price          │
 *  │ E: Type      F: ImageURL  G: Badge    H: Available      │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ Tab: "Orders"                                           │
 *  │ A: OrderNo  B: Timestamp  C: Customer  D: Items         │
 *  │ E: Subtotal  F: GST  G: Discount  H: Total  I: Status   │
 *  ├─────────────────────────────────────────────────────────┤
 *  │ Tab: "Reservations" (auto-created)                      │
 *  │ A: Timestamp  B: Name  C: Phone  D: Date                │
 *  │ E: Guests  F: Message  G: Status                        │
 *  └─────────────────────────────────────────────────────────┘
 */

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const MENU_HEADERS  = ['Category','Name','Description','Price','Type','ImageURL','Badge','Available'];
const ORDER_HEADERS = ['Timestamp','Bill No','Customer','Items','Subtotal','GST','Discount','Total','Status'];
const RES_HEADERS   = ['Timestamp','Name','Phone','Date','Guests','Message','Status'];

/* ═══════════════════════════════════════════════
   CORS HEADERS
═══════════════════════════════════════════════ */
function corsHeaders(){
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════════════════════════════════════
   SHEET HELPERS
═══════════════════════════════════════════════ */
function getOrCreateSheet(name, headers){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh   = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1,1,1,headers.length)
      .setFontWeight('bold')
      .setBackground('#180900')
      .setFontColor('#c9922a');
    sh.setFrozenRows(1);
  }
  return sh;
}

function sheetToJSON(sheet, headers){
  const data   = sheet.getDataRange().getValues();
  if(data.length < 2) return [];
  const hRow = data[0].map(h=>String(h).trim());
  return data.slice(1).map((row, i)=>{
    const obj = { _row: i + 2 }; // 1-indexed sheet row (row 1 = header)
    headers.forEach(h=>{
      const colIdx = hRow.indexOf(h);
      obj[h] = colIdx>=0 ? String(row[colIdx]||'').trim() : '';
    });
    return obj;
  }).filter(r=> r[headers[1]] || r[headers[0]]); // skip truly empty rows
}

function getColIndex(sheet, header){
  const row = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  return row.findIndex(h=>String(h).trim()===header);
}

/* ═══════════════════════════════════════════════
   GET — Read data (admin dashboard)
═══════════════════════════════════════════════ */
function doGet(e){
  try {
    const action   = (e.parameter && e.parameter.action)   || '';
    const callback = (e.parameter && e.parameter.callback) || '';
    const ss       = SpreadsheetApp.getActiveSpreadsheet();
    let result;

    if(action === 'menu'){
      const sh   = getOrCreateSheet('cusine', MENU_HEADERS);
      const rows = sheetToJSON(sh, MENU_HEADERS);
      result = { status:'ok', rows };
    }
    else if(action === 'orders'){
      const sh   = getOrCreateSheet('Orders', ORDER_HEADERS);
      const rows = sheetToJSON(sh, ORDER_HEADERS);
      result = { status:'ok', rows };
    }
    else if(action === 'reservations'){
      const sh   = getOrCreateSheet('Reservations', RES_HEADERS);
      const rows = sheetToJSON(sh, RES_HEADERS);
      result = { status:'ok', rows };
    }
    else {
      result = { status:'ok', message:'Spice Garden API ready', actions:['menu','orders','reservations'] };
    }

    // JSONP support — required for GitHub Pages (avoids CORS)
    if(callback){
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(result);

  } catch(err){
    return jsonResponse({ status:'error', message: err.message });
  }
}

/* ═══════════════════════════════════════════════
   POST — Write data (CRUD + save order)
═══════════════════════════════════════════════ */
function doPost(e){
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || '';
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    /* ── ADD DISH ── */
    if(action === 'addDish'){
      const sh = getOrCreateSheet('cusine', MENU_HEADERS);
      sh.appendRow(MENU_HEADERS.map(h => body[h] || ''));
      return jsonResponse({ status:'ok', message:'Dish added' });
    }

    /* ── EDIT DISH (full row) ── */
    if(action === 'editDish'){
      const sh  = getOrCreateSheet('cusine', MENU_HEADERS);
      const row = parseInt(body.rowIndex);
      if(!row || row < 2) throw new Error('Invalid row index');
      const hRow = sh.getRange(1,1,1,MENU_HEADERS.length).getValues()[0].map(h=>String(h).trim());
      MENU_HEADERS.forEach(h=>{
        const col = hRow.indexOf(h);
        if(col>=0 && body[h] !== undefined){
          sh.getRange(row, col+1).setValue(body[h]);
        }
      });
      return jsonResponse({ status:'ok', message:'Dish updated' });
    }

    /* ── EDIT SINGLE FIELD (toggle available etc.) ── */
    if(action === 'editField'){
      const sh  = getOrCreateSheet('cusine', MENU_HEADERS);
      const row = parseInt(body.rowIndex);
      if(!row || row < 2) throw new Error('Invalid row index');
      const col = getColIndex(sh, body.field);
      if(col < 0) throw new Error('Field not found: ' + body.field);
      sh.getRange(row, col+1).setValue(body.value);
      return jsonResponse({ status:'ok', message:'Field updated' });
    }

    /* ── DELETE DISH ── */
    if(action === 'deleteDish'){
      const sh  = getOrCreateSheet('cusine', MENU_HEADERS);
      const row = parseInt(body.rowIndex);
      if(!row || row < 2) throw new Error('Invalid row index');
      sh.deleteRow(row);
      return jsonResponse({ status:'ok', message:'Dish deleted' });
    }

    /* ── SAVE ORDER (from billing.html) ── */
    if(action === 'saveOrder' || (!action && body.billNo)){
      const sh = getOrCreateSheet('Orders', ORDER_HEADERS);
      const lastRow = sh.getLastRow();
      const billNo  = body.billNo || ('BILL-' + String(lastRow).padStart(4,'0'));
      // Column order matches sheet: Timestamp | Bill No | Customer | Items | Subtotal | GST | Discount | Total | Status
      sh.appendRow([
        body.timestamp ? new Date(body.timestamp).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) : new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),
        billNo,
        body.customer  || 'Walk-in',
        body.items     || '',
        body.subtotal  || '',
        body.gst       || '',
        body.discount  || '--',
        body.total     || '',
        body.status    || 'Closed'
      ]);
      return jsonResponse({ status:'ok', billNo, message:'Order saved' });
    }

    /* ── SAVE RESERVATION (from index.html) ── */
    if(action === 'saveReservation' || body.name && body.phone && !body.billNo){
      const sh = getOrCreateSheet('Reservations', RES_HEADERS);
      sh.appendRow([
        new Date(body.timestamp||Date.now()).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),
        body.name    || '',
        body.phone   || '',
        body.date    || '',
        body.guests  || '',
        body.message || '',
        'Pending'
      ]);
      return jsonResponse({ status:'ok', message:'Reservation saved' });
    }

    return jsonResponse({ status:'error', message:'Unknown action: ' + action });

  } catch(err){
    return jsonResponse({ status:'error', message: err.message });
  }
}

/* ═══════════════════════════════════════════════
   TEST FUNCTIONS — run these manually in editor
   to verify everything works before going live
═══════════════════════════════════════════════ */

function test_addDish(){
  const result = doPost({ postData:{ contents: JSON.stringify({
    action:'addDish',
    Category:'Biryani', Name:'Test Biryani', Description:'Test dish',
    Price:'299', Type:'NonVeg', ImageURL:'', Badge:'New', Available:'Yes'
  })}});
  Logger.log('addDish:', result.getContent());
}

function test_getMenu(){
  const result = doGet({ parameter:{ action:'menu' } });
  const data   = JSON.parse(result.getContent());
  Logger.log('Menu rows:', data.rows.length);
  if(data.rows.length) Logger.log('First dish:', JSON.stringify(data.rows[0]));
}

function test_saveOrder(){
  const result = doPost({ postData:{ contents: JSON.stringify({
    action:    'saveOrder',
    billNo:    'ORD-TEST',
    timestamp: new Date().toISOString(),
    customer:  'Test Customer',
    items:     'Chicken Biryani x2 (Rs.760.00) | Lassi x1 (Rs.100.00)',
    subtotal:  'Rs.860.00',
    gst:       'GST 5% = Rs.43.00',
    discount:  '--',
    total:     'Rs.903.00',
    status:    'Closed'
  })}});
  Logger.log('saveOrder:', result.getContent());
}

function test_getOrders(){
  const result = doGet({ parameter:{ action:'orders' } });
  const data   = JSON.parse(result.getContent());
  Logger.log('Orders:', data.rows.length);
}

function test_deleteLastDish(){
  // Gets menu, deletes last row - CAREFUL!
  const sh  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu');
  const last = sh ? sh.getLastRow() : 0;
  Logger.log('Last row in Menu:', last, '— run test_getMenu first to confirm before deleting');
}

function setupSheets(){
  // Call this once to create all required sheet tabs with headers
  getOrCreateSheet('cusine',         MENU_HEADERS);
  getOrCreateSheet('Orders',       ORDER_HEADERS);
  getOrCreateSheet('Reservations', RES_HEADERS);
  Logger.log('All sheets created/verified ✓');
}