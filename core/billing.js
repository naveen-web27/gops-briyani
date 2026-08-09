/* ── Billzo: read URLs & PIN from config.js ── */
var _cfg      = window.APP_CONFIG || {};
var _bil      = _cfg.billing  || {};
var _sh       = _cfg.sheets   || {};
var STAFF_PIN  = _bil.staffPin  || '1234';
var SHEET_URL  = _sh.menuCSV   || '';
var ORDERS_URL = _sh.scriptURL || '';

BillzoAuth.configure({
  getScriptUrl: function() { return ORDERS_URL; }
});

/* ══════════════════════════════════════════
   PIN SECURITY — commented out for now.
   To re-enable:
   1. Uncomment the PIN HTML block above.
   2. Uncomment this JS block.
   3. Remove the boot() call at the bottom.
══════════════════════════════════════════
var pinEntry = '';
function pinPress(n) {
  if (pinEntry.length >= 4) return;
  pinEntry += n;
  document.getElementById('d' + (pinEntry.length - 1)).classList.add('filled');
  if (pinEntry.length === 4) setTimeout(checkPin, 130);
}
function pinDel() {
  if (!pinEntry.length) return;
  pinEntry = pinEntry.slice(0, -1);
  document.getElementById('d' + pinEntry.length).classList.remove('filled');
  document.getElementById('pinError').textContent = '';
}
function checkPin() {
  if (pinEntry === STAFF_PIN) {
    document.getElementById('pin-screen').style.display = 'none';
    document.getElementById('app').classList.add('open');
    boot();
  } else {
    var dots = document.querySelectorAll('.pin-dot');
    dots.forEach(function(d) { d.classList.add('shake'); d.style.background = '#ef5350'; d.style.borderColor = '#ef5350'; });
    document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
    setTimeout(function() {
      pinEntry = '';
      dots.forEach(function(d) { d.classList.remove('shake', 'filled'); d.style.background = ''; d.style.borderColor = ''; });
    }, 650);
  }
}
document.addEventListener('keydown', function(e) {
  if (document.getElementById('pin-screen').style.display === 'none') return;
  if (e.key >= '0' && e.key <= '9') pinPress(e.key);
  if (e.key === 'Backspace') pinDel();
});
function lockScreen() {
  pinEntry = '';
  document.querySelectorAll('.pin-dot').forEach(function(d) { d.classList.remove('filled'); d.style.background = ''; d.style.borderColor = ''; });
  document.getElementById('pinError').textContent = '';
  document.getElementById('pin-screen').style.display = 'flex';
  document.getElementById('app').classList.remove('open');
}
══════════════════════════════════════════ */

/* ── TABS ── */
var currentTab = 'bill';
function isMobile() { return window.innerWidth < 768; }

function switchTab(tab) {
  currentTab = tab;
  var pp = document.getElementById('panelProducts'), pb = document.getElementById('panelBill');
  var tp = document.getElementById('tabProducts'), tb = document.getElementById('tabBill');
  if (tab === 'products') {
    pp.classList.remove('hidden'); pb.classList.add('hidden');
    tp.classList.add('on'); tb.classList.remove('on');
    updateCartBar();
  } else {
    pp.classList.add('hidden'); pb.classList.remove('hidden');
    tp.classList.remove('on'); tb.classList.add('on');
    document.getElementById('mCartBtn').classList.add('hidden');
  }
}

window.addEventListener('resize', function() {
  if (!isMobile()) {
    document.getElementById('panelProducts').classList.remove('hidden');
    document.getElementById('panelBill').classList.remove('hidden');
  }
});

/* ── APP STATE ── */
var allProducts = [], cart = [], activeCategory = 'All', billNo = 1;
var allOrdersCache = [];
var heldBillsCache = [];
var currentOrderId = '';
var quickResults = [];
var quickActiveIndex = -1;

function makeOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

function parseBillNoNum(txt) {
  var m = String(txt || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function setNextBillNoFromRows(rows) {
  var maxNo = 0;
  (rows || []).forEach(function(r) {
    var v = parseBillNoNum(r['Bill No'] || r.OrderNo || '');
    if (v > maxNo) maxNo = v;
  });
  billNo = Math.max(1, maxNo + 1);
  setDate();
}

function beginNewBill() {
  currentOrderId = makeOrderId();
  setDate();
}

function fetchOrdersRows() {
  if (!ORDERS_URL) return Promise.resolve([]);
  return BillzoAuth.authGet({ action: 'orders' })
    .then(function(data) { return (data && data.rows) ? data.rows : []; })
    .catch(function() { return []; });
}

function normalizeStatus(s) {
  return String(s || '').trim().toLowerCase();
}

function refreshOpenBillsCount() {
  var count = heldBillsCache.length;
  document.getElementById('openBillsBtn').textContent = 'Open Bills (' + count + ')';
}

function parseAmount(s) {
  var n = parseFloat(String(s || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseGstRate(gstText) {
  var m = String(gstText || '').match(/GST\s*(\d+(?:\.\d+)?)%/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseDiscount(row) {
  var txt = String((row && row.Discount) || '--').trim();
  var val = parseAmount(txt);
  return { value: val, type: 'flat' };
}

function buildItemsSummary() {
  return cart.map(function(i) {
    return i.name + ' x' + i.qty + ' (' + (i.price * i.qty).toFixed(2) + ')';
  }).join(' | ');
}

function parseItemsSummary(itemsSummary) {
  var out = [];
  String(itemsSummary || '').split(' | ').forEach(function(part) {
    var p = part.trim();
    if (!p) return;
    var m = p.match(/^(.*) x(\d+) \((\d+(?:\.\d+)?)\)$/);
    if (m) {
      var name = m[1].trim();
      var qty = parseInt(m[2], 10) || 1;
      var lineTotal = parseFloat(m[3]) || 0;
      var unit = qty > 0 ? lineTotal / qty : lineTotal;
      out.push({ name: name, price: unit, cat: 'Held', qty: qty });
    }
  });
  return out;
}

function getTotals() {
  var sub = cart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var gst = parseFloat(document.getElementById('gstRate').value) || 0;
  var gstAmt = sub * gst / 100;
  var dv = parseFloat(document.getElementById('discountVal').value) || 0;
  var dtype = document.getElementById('discountType').value;
  var discAmt = dtype === 'pct' ? ((sub + gstAmt) * dv / 100) : Math.min(dv, sub + gstAmt);
  var total = Math.max(0, sub + gstAmt - discAmt);
  return { sub: sub, gst: gst, gstAmt: gstAmt, dv: dv, dtype: dtype, discAmt: discAmt, total: total };
}

function resetBillInputs() {
  document.getElementById('custInput').value = '';
  document.getElementById('custPhone').value = '';
  document.getElementById('custAddress').value = '';
  document.getElementById('tableNo').value = '';
  document.getElementById('custType').selectedIndex = 0;
  document.getElementById('payMode').selectedIndex = 0;
  document.getElementById('discountVal').value = '0';
}

function resetCurrentBillAfterSave() {
  cart = [];
  billNo += 1;
  beginNewBill();
  resetBillInputs();
  renderBill();
  renderProducts();
  updateCartBar();
  updateSummary();
}

function boot() {
  /* ── Apply Billzo config to page ── */
  var _bcfg = window.APP_CONFIG || {};
  var _bbiz = _bcfg.business || {};
  var _bbil = _bcfg.billing  || {};

  // Set shop / business name
  var shopName = _bbiz.name || 'My Shop';
  document.getElementById('shopInput').value   = shopName;
  document.getElementById('billShop').textContent = shopName;

  // Build Customer Type dropdown from config
  var custTypes = _bbil.customerTypes || ['Walk-in', 'Online'];
  var custIcons = { 'Walk-in':'🚶', 'Online':'🌐', 'Takeaway':'🥡', 'Delivery':'🛵', 'Home Delivery':'🏠', 'Pre-order':'📅', 'Dine-in':'🍽️' };
  document.getElementById('custType').innerHTML = custTypes.map(function(t) {
    return '<option value="' + t + '" style="background:var(--dark)">' + (custIcons[t] || '') + ' ' + t + '</option>';
  }).join('');

  // Build Pay Mode dropdown from config
  var payModes = _bbil.payModes || ['Cash', 'UPI', 'Card'];
  var payIcons = { 'Cash':'💵', 'UPI':'💸', 'Card':'💳', 'GPay':'G', 'PhonePe':'📱', 'Other':'🏦' };
  document.getElementById('payMode').innerHTML = payModes.map(function(m) {
    return '<option value="' + m + '" style="background:var(--dark)">' + (payIcons[m] || '') + ' ' + m + '</option>';
  }).join('');

  // Set default GST rate
  if (_bbil.gstDefault !== undefined) {
    document.getElementById('gstRate').value = _bbil.gstDefault;
  }

  document.getElementById('app').classList.add('open');
  beginNewBill();
  loadSheet();
  if (isMobile()) switchTab('bill');
  fetchOrdersRows().then(function(rows) {
    allOrdersCache = rows;
    heldBillsCache = rows.filter(function(r) {
      var st = normalizeStatus(r.Status);
      return st === 'held' || st === 'open';
    });
    setNextBillNoFromRows(rows);
    refreshOpenBillsCount();
  });
}

function setDate() {
  var d = new Date();
  document.getElementById('billDate').textContent = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('billNum').textContent = 'Bill #' + String(billNo).padStart(4, '0');
}

function setPill(type, txt) {
  var p = document.getElementById('statusPill');
  p.className = 'status-pill ' + type;
  p.textContent = txt;
}

function syncShop() {
  document.getElementById('billShop').textContent = document.getElementById('shopInput').value || 'My Shop';
}

function setProductsFromRows(rows) {
  if (!rows || !rows.length) {
    setPill('err', 'EMPTY');
    allProducts = [];
    return;
  }

  allProducts = rows.map(function(row) {
    return {
      name: String(row.Name || row.name || '').trim(),
      price: parseFloat(String(row.Price || row.price || '0').replace(/[^0-9.]/g, '')),
      cat: String(row.Category || row.category || 'General').trim() || 'General',
      available: String(row.Available || row.available || 'Yes').trim().toLowerCase()
    };
  }).filter(function(item) {
    return item.name && !isNaN(item.price) && item.price >= 0 && item.available !== 'no';
  });

  buildCats();
  renderProducts();
  setPill('ok', allProducts.length + ' ITEMS');
}

/* ── SHEET LOAD ── */
function loadSheet() {
  setPill('loading', 'LOADING');
  BillzoAuth.authGet({ action: 'menu' })
    .then(function(data) {
      if (!data || data.status !== 'ok') throw new Error((data && data.message) || 'Menu load failed');
      setProductsFromRows(data.rows || []);
    })
    .catch(function() {
      if (!SHEET_URL) throw new Error('Menu sheet not configured');
      return fetch(SHEET_URL)
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(parseCSV);
    })
    .catch(function(e) {
      setPill('err', 'ERROR');
      var quick = document.getElementById('quickList');
      quick.classList.add('show');
      quick.innerHTML = '<div class="hold-empty">Could not load menu. ' + e.message + '</div>';
    });
}

function reloadSheet() {
  var btn = document.getElementById('reloadBtn');
  btn.classList.add('spinning');
  allProducts = []; cart = [];
  renderProducts(); renderBill(); updateCartBar();
  setPill('loading', 'LOADING');
  BillzoAuth.authGet({ action: 'menu' })
    .then(function(data) {
      if (!data || data.status !== 'ok') throw new Error((data && data.message) || 'Menu load failed');
      setProductsFromRows(data.rows || []);
      btn.classList.remove('spinning');
    })
    .catch(function() {
      if (!SHEET_URL) throw new Error('Menu sheet not configured');
      return fetch(SHEET_URL)
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function(t) { parseCSV(t); btn.classList.remove('spinning'); });
    })
    .catch(function(e) {
      setPill('err', 'ERROR');
      btn.classList.remove('spinning');
      var quick = document.getElementById('quickList');
      quick.classList.add('show');
      quick.innerHTML = '<div class="hold-empty">' + e.message + '</div>';
    });
}

function parseCSV(csv) {
  var rows = csv.replace(/\r/g, '').trim().split('\n').filter(Boolean);
  if (rows.length < 2) { setPill('err', 'EMPTY'); return; }
  var headers = csvSplit(rows[0]).map(function(h) { return h.toLowerCase().replace(/"/g, '').trim(); });
  var ni = findCol(headers, ['name', 'dish', 'item', 'product', 'particulars']);
  var pi = findCol(headers, ['price', 'rate', 'cost', 'amount', 'mrp']);
  var ci = findCol(headers, ['category', 'cat', 'type', 'group', 'section']);
  var ai = headers.indexOf('available');
  if (ni < 0 || pi < 0) { setPill('err', 'BAD COLS'); return; }
  allProducts = [];
  for (var i = 1; i < rows.length; i++) {
    var cols = csvSplit(rows[i]);
    var name = clean(cols[ni] || '');
    var price = parseFloat((cols[pi] || '0').replace(/[^0-9.]/g, ''));
    var cat = ci >= 0 ? clean(cols[ci] || '') || 'General' : 'General';
    var avail = ai >= 0 ? (cols[ai] || 'yes').toLowerCase() : 'yes';
    if (name && !isNaN(price) && price >= 0 && avail !== 'no')
      allProducts.push({ name: name, price: price, cat: cat });
  }
  buildCats(); renderProducts();
  setPill('ok', allProducts.length + ' ITEMS');
}

function findCol(h, kws) {
  for (var k = 0; k < kws.length; k++) {
    var i = h.findIndex(function(x) { return x.includes(kws[k]); });
    if (i >= 0) return i;
  }
  return -1;
}
function clean(s) { return s.replace(/^"|"$/g, '').trim(); }
function csvSplit(line) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') { q = !q; }
    else if (c === ',' && !q) { out.push(clean(cur)); cur = ''; }
    else cur += c;
  }
  out.push(clean(cur));
  return out;
}

/* ── CATEGORIES ── */
function buildCats() {
  var bar = document.getElementById('catBar');
  if (!bar) return;
  var cats = ['All'].concat([...new Set(allProducts.map(function(p) { return p.cat; }).filter(function(c) {
    return String(c || '').trim();
  }))]).sort(function(a, b) {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return String(a).localeCompare(String(b));
  });
  bar.innerHTML = cats.map(function(c) {
    return '<button class="cbtn ' + (c === activeCategory ? 'on' : '') + '" onclick="setCat(\'' + c + '\')">' + c + '</button>';
  }).join('');
}
function setCat(c) { activeCategory = c; buildCats(); renderProducts(); }

function closeQuickList() {
  quickResults = [];
  quickActiveIndex = -1;
  var box = document.getElementById('quickList');
  if (box) {
    box.classList.remove('show');
    box.innerHTML = '';
  }
}

document.addEventListener('click', function(e) {
  var wrap = document.querySelector('.quick-add-wrap');
  var box = document.getElementById('quickList');
  if (!wrap || !box) return;
  if (!wrap.contains(e.target) && box.classList.contains('show')) {
    closeQuickList();
  }
});

/* ── RENDER PRODUCTS ── */
function renderProducts() {
  var q = (document.getElementById('searchInput').value || '').toLowerCase();
  var hasCategory = activeCategory && activeCategory !== 'All';

  if (!q && !hasCategory) {
    closeQuickList();
    return;
  }

  function matchesCategory(p) {
    return !hasCategory || String(p.cat || '').toLowerCase() === String(activeCategory || '').toLowerCase();
  }

  function matchesQuery(p) {
    return !q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
  }

  quickResults = allProducts.filter(function(p) {
    return matchesCategory(p) && matchesQuery(p);
  }).slice(0, 12);

  quickActiveIndex = quickResults.length ? Math.min(quickActiveIndex, quickResults.length - 1) : -1;
  var box = document.getElementById('quickList');
  if (!quickResults.length) {
    box.classList.add('show');
    box.innerHTML = '<div class="hold-empty">No dish found</div>';
    return;
  }

  box.classList.add('show');
  box.innerHTML = quickResults.map(function(p, i) {
    return '<div class="quick-item ' + (i === quickActiveIndex ? 'on' : '') + '" onclick="pickQuick(' + i + ')">'
      + '<div><div class="n">' + p.name + '</div><div class="c">' + p.cat + '</div></div>'
      + '<div class="p">₹' + p.price.toFixed(2) + '</div>'
      + '</div>';
  }).join('');
}

function handleQuickKey(e) {
  if (e.key === 'Escape') {
    closeQuickList();
    return;
  }
  if (!quickResults.length && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    renderProducts();
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!quickResults.length) return;
    quickActiveIndex = (quickActiveIndex + 1) % quickResults.length;
    renderProducts();
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!quickResults.length) return;
    quickActiveIndex = quickActiveIndex <= 0 ? quickResults.length - 1 : quickActiveIndex - 1;
    renderProducts();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    addSelectedQuickItem();
  }
}

function handleQuickQtyKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addSelectedQuickItem();
  }
}

function pickQuick(i) {
  quickActiveIndex = i;
  addSelectedQuickItem();
}

function addSelectedQuickItem() {
  var qv = parseInt(document.getElementById('quickQty').value, 10);
  var qty = isNaN(qv) || qv < 1 ? 1 : qv;
  var searchVal = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  if (!quickResults.length) {
    if (!searchVal) return;
    var exact = allProducts.find(function(p){ return p.name.toLowerCase() === searchVal; });
    if (!exact) return;
    addItem(allProducts.indexOf(exact), qty);
  } else {
    var idx = quickActiveIndex >= 0 ? quickActiveIndex : 0;
    var sel = quickResults[idx];
    var pi = allProducts.indexOf(sel);
    if (pi < 0) return;
    addItem(pi, qty);
  }

  document.getElementById('searchInput').value = '';
  document.getElementById('quickQty').value = '1';
  if (activeCategory && activeCategory !== 'All') {
    renderProducts();
  } else {
    closeQuickList();
  }
  document.getElementById('searchInput').focus();
}

/* ── CART ── */
function addItem(idx, qty) {
  var p = allProducts[idx];
  var addQty = qty || 1;
  var ex = cart.find(function(i) { return i.name === p.name; });
  if (ex) ex.qty += addQty; else cart.push({ name: p.name, price: p.price, cat: p.cat, qty: addQty });
  renderProducts(); renderBill(); updateCartBar();
}

function changeQty(i, d) {
  cart[i].qty += d;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  renderProducts(); renderBill(); updateCartBar();
}

function removeItem(i) {
  cart.splice(i, 1);
  renderProducts(); renderBill(); updateCartBar();
}

function addCustomItem() {
  var name = document.getElementById('customName').value.trim();
  var price = parseFloat(document.getElementById('customPrice').value);
  if (!name) { document.getElementById('customName').focus(); return; }
  if (isNaN(price) || price < 0) { document.getElementById('customPrice').focus(); return; }
  var ex = cart.find(function(i) { return i.name === name; });
  if (ex) ex.qty++; else cart.push({ name: name, price: price, cat: 'Custom', qty: 1 });
  document.getElementById('customName').value = '';
  document.getElementById('customPrice').value = '';
  renderBill(); updateCartBar();
  if (isMobile()) switchTab('bill');
}

document.getElementById('customName').addEventListener('keydown', function(e) { if (e.key === 'Enter') addCustomItem(); });
document.getElementById('customPrice').addEventListener('keydown', function(e) { if (e.key === 'Enter') addCustomItem(); });

function updateCartBar() {
  var total = cart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var count = cart.reduce(function(s, i) { return s + i.qty; }, 0);
  var badge = document.getElementById('cartBadge');
  var mcBtn = document.getElementById('mCartBtn');
  if (count > 0) {
    badge.textContent = count; badge.classList.add('show');
    document.getElementById('mCartCount').textContent = count + ' item' + (count > 1 ? 's' : '');
    document.getElementById('mCartTotal').innerHTML = '&#8377;' + total.toFixed(2);
    if (isMobile() && currentTab === 'products') mcBtn.classList.remove('hidden');
    else mcBtn.classList.add('hidden');
  } else {
    badge.classList.remove('show');
    mcBtn.classList.add('hidden');
  }
}

/* ── BILL RENDER ── */
function renderBill() {
  var el = document.getElementById('lineItems');
  var leftEl = document.getElementById('leftLineItems');
  if (!cart.length) {
    var emptyHtml = '<div class="bill-empty"><div style="font-size:2.2rem;margin-bottom:10px">&#127869;&#65039;</div><p>Use Add Item search to add dishes quickly</p></div>';
    el.innerHTML = emptyHtml;
    if (leftEl) leftEl.innerHTML = '<div class="left-empty">Add dishes from quick search to see bill items here</div>';
    updateSummary(); return;
  }
  var itemsHtml = cart.map(function(item, i) {
    return '<div class="bli">'
      + '<div><div class="bli-name">' + item.name + '</div><div class="bli-cat">' + item.cat + ' &middot; &#8377;' + item.price.toFixed(2) + ' each</div></div>'
      + '<div class="qctrl"><button onclick="changeQty(' + i + ',-1)">&#8722;</button><span>' + item.qty + '</span><button onclick="changeQty(' + i + ',+1)">+</button></div>'
      + '<div class="bli-price">&#8377;' + (item.price * item.qty).toFixed(2) + '</div>'
      + '<button class="bli-del" onclick="removeItem(' + i + ')">&#10005;</button>'
      + '</div>';
  }).join('');
  el.innerHTML = itemsHtml;
  if (leftEl) leftEl.innerHTML = itemsHtml;
  updateSummary();
}

function updateSummary() {
  var sub = cart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var gst = parseFloat(document.getElementById('gstRate').value) || 0;
  var gstAmt = sub * gst / 100;
  var dv = parseFloat(document.getElementById('discountVal').value) || 0;
  var dtype = document.getElementById('discountType').value;
  var discAmt = dtype === 'pct' ? ((sub + gstAmt) * dv / 100) : Math.min(dv, sub + gstAmt);
  var total = Math.max(0, sub + gstAmt - discAmt);
  document.getElementById('subVal').innerHTML  = '&#8377;' + sub.toFixed(2);
  document.getElementById('gstLbl').textContent = 'GST (' + gst + '%)';
  document.getElementById('gstVal').innerHTML  = '&#8377;' + gstAmt.toFixed(2);
  var discRow = document.querySelector('.srow.sdiscount');
  if (discAmt > 0) {
    document.getElementById('discLbl').textContent = dtype === 'pct' ? 'Discount (' + dv + '%)' : 'Discount';
    document.getElementById('discAmt').innerHTML = '-&#8377;' + discAmt.toFixed(2);
    discRow.style.display = 'flex';
  } else {
    discRow.style.display = 'none';
  }
  document.getElementById('totalVal').innerHTML = '&#8377;' + total.toFixed(2);
  var pm = document.getElementById('payMode');
  if (pm) document.getElementById('payModeDisplay').textContent = pm.options[pm.selectedIndex].text;
}

/* ── TOAST ── */
function showToast(msg, isErr) {
  var t = document.getElementById('toast');
  t.innerHTML = msg;
  t.className = 'toast' + (isErr ? ' err' : '') + ' show';
  setTimeout(function() { t.className = 'toast' + (isErr ? ' err' : ''); }, 3200);
}

function openHeldBillsModal() {
  document.getElementById('heldBillsModal').classList.add('open');
  refreshHeldBills();
}

function closeHeldBillsModal() {
  document.getElementById('heldBillsModal').classList.remove('open');
}

document.getElementById('heldBillsModal').addEventListener('click', function(e) {
  if (e.target && e.target.id === 'heldBillsModal') closeHeldBillsModal();
});

function refreshHeldBills() {
  fetchOrdersRows().then(function(rows) {
    allOrdersCache = rows;
    heldBillsCache = rows.filter(function(r) {
      var st = normalizeStatus(r.Status);
      return st === 'held' || st === 'open';
    });
    setNextBillNoFromRows(rows);
    refreshOpenBillsCount();
    renderHeldBillsList();
  });
}

function renderHeldBillsList() {
  var q = (document.getElementById('heldSearch').value || '').toLowerCase().trim();
  var list = heldBillsCache.filter(function(r) {
    if (!q) return true;
    var bill = String(r['Bill No'] || '').toLowerCase();
    var cust = String(r.Customer || '').toLowerCase();
    var phone = String(r.Phone || '').toLowerCase();
    var tableNo = String(r['Table No'] || '').toLowerCase();
    return bill.includes(q) || cust.includes(q) || phone.includes(q) || tableNo.includes(q);
  });

  var box = document.getElementById('heldBillsList');
  if (!list.length) {
    box.innerHTML = '<div class="hold-empty">No held/open bills found</div>';
    return;
  }

  box.innerHTML = list.map(function(r, idx) {
    var bill = r['Bill No'] || 'Bill';
    var cust = r.Customer || 'Walk-in';
    var tableNo = r['Table No'] && r['Table No'] !== '--' ? r['Table No'] : 'NA';
    var phone = r.Phone && r.Phone !== '--' ? r.Phone : 'NA';
    var tot = parseAmount(r.Total).toFixed(2);
    var st = r.Status || 'Held';
    return '<div class="hold-card">'
      + '<div class="hold-meta">'
      + '<div class="hold-bill">' + bill + '<span class="hold-status">' + st + '</span></div>'
      + '<div>Customer: ' + cust + ' | Table: ' + tableNo + ' | Phone: ' + phone + '</div>'
      + '<div>Total: ₹' + tot + '</div>'
      + '</div>'
      + '<button class="hold-resume" onclick="resumeHeldBill(' + idx + ')">Resume</button>'
      + '</div>';
  }).join('');
}

function resumeHeldBill(idx) {
  var q = (document.getElementById('heldSearch').value || '').toLowerCase().trim();
  var filtered = heldBillsCache.filter(function(r) {
    if (!q) return true;
    var bill = String(r['Bill No'] || '').toLowerCase();
    var cust = String(r.Customer || '').toLowerCase();
    var phone = String(r.Phone || '').toLowerCase();
    var tableNo = String(r['Table No'] || '').toLowerCase();
    return bill.includes(q) || cust.includes(q) || phone.includes(q) || tableNo.includes(q);
  });
  var row = filtered[idx];
  if (!row) return;

  var bnum = parseBillNoNum(row['Bill No'] || '');
  if (bnum > 0) billNo = bnum;
  currentOrderId = row['Order ID'] || makeOrderId();
  setDate();
  document.getElementById('billNum').textContent = row['Bill No'] || ('Bill #' + String(billNo).padStart(4, '0'));

  cart = parseItemsSummary(row.Items || '');
  document.getElementById('custInput').value = row.Customer && row.Customer !== 'Walk-in' ? row.Customer : '';
  document.getElementById('custPhone').value = row.Phone && row.Phone !== '--' ? row.Phone : '';
  document.getElementById('custAddress').value = row.Address && row.Address !== '--' ? row.Address : '';
  document.getElementById('tableNo').value = row['Table No'] && row['Table No'] !== '--' ? row['Table No'] : '';

  var ct = document.getElementById('custType');
  var pm = document.getElementById('payMode');
  for (var i = 0; i < ct.options.length; i++) if (ct.options[i].value === (row['Customer Type'] || row.customerType)) ct.selectedIndex = i;
  for (var j = 0; j < pm.options.length; j++) if (pm.options[j].value === (row['Pay Mode'] || row.payMode)) pm.selectedIndex = j;

  document.getElementById('gstRate').value = parseGstRate(row.GST || row.gst || '--');
  var d = parseDiscount(row);
  document.getElementById('discountType').value = d.type;
  document.getElementById('discountVal').value = d.value;

  renderBill();
  renderProducts();
  updateCartBar();
  updateSummary();
  closeHeldBillsModal();
  if (isMobile()) switchTab('bill');
  showToast('Resumed ' + (row['Bill No'] || 'bill'));
}

/* ── CLOSE ORDER ── */
function closeOrder() {
  saveOrder('Closed');
}

function holdOrder() {
  saveOrder('Open');
}

function saveOrder(status) {
  if (!cart.length) { showToast('Add items to the bill first!', true); return; }

  var closeBtn = document.getElementById('closeOrderBtn');
  var holdBtn = document.getElementById('holdOrderBtn');
  var t = getTotals();
  var itemsSummary = buildItemsSummary();

  var payload = {
    action:       'upsertOrder',
    orderId:      currentOrderId || makeOrderId(),
    billNo:       document.getElementById('billNum').textContent,
    customer:     document.getElementById('custInput').value.trim() || 'Walk-in',
    items:        itemsSummary,
    subtotal:     t.sub.toFixed(2),
    gst:          t.gst > 0 ? 'GST ' + t.gst + '% = ' + t.gstAmt.toFixed(2) : '--',
    discount:     t.discAmt > 0 ? t.discAmt.toFixed(2) : '--',
    total:        t.total.toFixed(2),
    status:       status,
    customerType: (function(){ var ct=document.getElementById('custType'); return ct ? ct.value : 'Walk-in'; })(),
    phone:        document.getElementById('custPhone') ? (document.getElementById('custPhone').value.trim() || '--') : '--',
    address:      document.getElementById('custAddress') ? (document.getElementById('custAddress').value.trim() || '--') : '--',
    payMode:      (function(){ var pm=document.getElementById('payMode'); return pm ? pm.value : 'UPI'; })(),
    tableNo:      document.getElementById('tableNo') ? (document.getElementById('tableNo').value.trim() || '--') : '--'
  };

  if (!ORDERS_URL) {
    showToast('No ORDERS_URL set!', true);
    console.log('Order payload (not sent):', payload);
    return;
  }

  closeBtn.classList.add('sending');
  holdBtn.classList.add('sending');
  closeBtn.textContent = 'Saving...';
  holdBtn.textContent = 'Saving...';

  BillzoAuth.authPost(payload)
    .then(function() {
      var modeTxt = status === 'Closed' ? 'closed' : 'held as open';
      showToast('✓ ' + payload.billNo + ' ' + modeTxt + '!');
      resetCurrentBillAfterSave();
      refreshHeldBills();
    })
    .catch(function() { showToast('Could not save. Check connection.', true); })
    .finally(function() {
      closeBtn.classList.remove('sending');
      holdBtn.classList.remove('sending');
      closeBtn.innerHTML = '&#10003; Close';
      holdBtn.innerHTML = '⏸ Hold';
    });
}

/* ── CLEAR & PRINT ── */
function clearBill() {
  if (!cart.length) return;
  if (confirm('Clear all items?')) {
    cart = [];
    renderBill(); renderProducts(); updateCartBar();
  }
}

function printBill() {
  if (!cart.length) { alert('Add items first!'); return; }
  var custTypeEl = document.getElementById('custType');
  var custType = custTypeEl ? custTypeEl.value : 'Walk-in';
  var custName = (document.getElementById('custInput').value || '').trim();

  var meta = custType;
  if (custName) meta += ' | Customer: ' + custName;
  document.getElementById('printCustomerMeta').innerHTML = meta;

  var printDishHtml = cart.map(function(item) {
    return '<div class="print-d-row">'
      + '<div><div class="n">' + item.name + '</div><div class="m">' + item.qty + ' × ₹' + item.price.toFixed(2) + '</div></div>'
      + '<div class="a">₹' + (item.price * item.qty).toFixed(2) + '</div>'
      + '</div>';
  }).join('');
  document.getElementById('printDishList').innerHTML = printDishHtml;

  // Keep print items synced even if the UI is currently on the products tab.
  renderBill();
  var rightItems = document.getElementById('lineItems');
  var leftItems = document.getElementById('leftLineItems');
  if (rightItems && leftItems && !rightItems.querySelector('.bli') && leftItems.querySelector('.bli')) {
    rightItems.innerHTML = leftItems.innerHTML;
  }

  document.getElementById('panelBill').classList.remove('hidden');
  syncShop(); window.print();
  if (isMobile() && currentTab !== 'bill') document.getElementById('panelBill').classList.add('hidden');
}

function lockScreen() {
  BillzoAuth.logout();
}

/* ── BUILD BILL TEXT ── */
function buildBillText() {
  var shop     = document.getElementById('billShop').textContent;
  var billNum  = document.getElementById('billNum').textContent;
  var billDate = document.getElementById('billDate').textContent;
  var cust     = document.getElementById('custInput').value.trim() || 'Walk-in';
  var phone    = document.getElementById('custPhone').value.trim();
  var address  = document.getElementById('custAddress').value.trim();
  var tableNo  = document.getElementById('tableNo').value.trim();
  var ct       = document.getElementById('custType');
  var custType = ct ? ct.value : 'Walk-in';
  var pm       = document.getElementById('payMode');
  var payMode  = pm ? pm.options[pm.selectedIndex].text : 'UPI';
  var sub      = cart.reduce(function(s,i){return s+i.price*i.qty;},0);
  var gst      = parseFloat(document.getElementById('gstRate').value)||0;
  var gstAmt   = sub*gst/100;
  var dv       = parseFloat(document.getElementById('discountVal').value)||0;
  var dtype    = document.getElementById('discountType').value;
  var discAmt  = dtype==='pct'?((sub+gstAmt)*dv/100):Math.min(dv,sub+gstAmt);
  var total    = Math.max(0,sub+gstAmt-discAmt);

  var msg = '🍽️ *' + shop + '*\n';
  msg += '🧾 *' + billNum + '*  |  📅 ' + billDate + '\n';
  msg += (custType === 'Online' ? '🌐 Online Order' : '🚶 Walk-in') + '\n';
  msg += '👤 ' + cust;
  if (phone) msg += '  |  📱 +91 ' + phone;
  if (tableNo) msg += '  |  🍽️ Table ' + tableNo;
  if (address) msg += '\n📍 ' + address;
  msg += '\n💳 Payment: *' + payMode + '*\n';
  msg += '\n━━━━━━━━━━━━━━━\n';
  cart.forEach(function(it){
    msg += '• ' + it.name + '\n  ' + it.qty + ' × ₹' + it.price.toFixed(2) + ' = *₹' + (it.price*it.qty).toFixed(2) + '*\n';
  });
  msg += '━━━━━━━━━━━━━━━\n';
  msg += 'Subtotal: ₹' + sub.toFixed(2) + '\n';
  if (gstAmt>0) msg += 'GST (' + gst + '%): ₹' + gstAmt.toFixed(2) + '\n';
  if (discAmt>0) msg += '🎁 Discount: − ₹' + discAmt.toFixed(2) + '\n';
  msg += '\n*💰 TOTAL: ₹' + total.toFixed(2) + '*\n';
  msg += '\n🙏 Thank you, ' + cust + '!\n';
  msg += '_(Bill image attached separately)_';
  return msg;
}

/* ── CAPTURE BILL AS IMAGE ── */
function captureBill(filename) {
  return new Promise(function(resolve, reject) {
    var panel = document.getElementById('panelBill');
    // show panel temporarily if hidden (mobile)
    var wasHidden = panel.classList.contains('hidden');
    if (wasHidden) panel.classList.remove('hidden');
    html2canvas(panel, {
      backgroundColor: '#ffffff',
      scale: 2.5,
      useCORS: true,
      logging: false,
      ignoreElements: function(el){ return el.classList && el.classList.contains('actions'); }
    }).then(function(canvas){
      if (wasHidden) panel.classList.add('hidden');
      canvas.toBlob(function(blob){
        var url  = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
        resolve();
      }, 'image/png');
    }).catch(function(e){ if(wasHidden) panel.classList.add('hidden'); reject(e); });
  });
}

/* ── DOWNLOAD IMAGE ONLY ── */
function downloadBillImg() {
  if (!cart.length) { showToast('Add items first!', true); return; }
  var num = document.getElementById('billNum').textContent.replace('Bill #','').trim();
  showToast('⏳ Generating image...');
  captureBill('Bill_' + num + '.png')
    .then(function(){ showToast('✅ Bill image downloaded!'); })
    .catch(function(){ showToast('❌ Could not generate image', true); });
}

/* ── SEND WHATSAPP BILL + AUTO DOWNLOAD IMAGE ── */
function sendWaBill() {
  if (!cart.length) { showToast('Add items first!', true); return; }
  var phone = document.getElementById('custPhone').value.trim();
  var num   = document.getElementById('billNum').textContent.replace('Bill #','').trim();
  var msg   = buildBillText();
  var target = phone && phone.length === 10
    ? 'https://wa.me/91' + phone + '?text=' + encodeURIComponent(msg)
    : 'https://wa.me/?text=' + encodeURIComponent(msg);

  var btn = document.getElementById('waBillBtn');
  var txt = document.getElementById('waBtnTxt');
  btn.disabled = true; txt.textContent = '⏳ Saving...';

  captureBill('Bill_' + num + '.png')
    .then(function(){
      txt.textContent = '📲 Opening...';
      setTimeout(function(){
        window.open(target, '_blank');
        btn.disabled = false; txt.textContent = 'WhatsApp';
        showToast('📥 Image saved · WhatsApp opened!');
      }, 700);
    })
    .catch(function(){
      window.open(target, '_blank');
      btn.disabled = false; txt.textContent = 'WhatsApp';
      showToast('⚠️ Image failed · Text bill sent');
    });
}

/* ── BOOT (auth protected) ── */
BillzoAuth.guard({ onReady: boot });
</script>
