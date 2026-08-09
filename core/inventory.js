var cfg = window.APP_CONFIG || {};
var sheets = cfg.sheets || {};
var SCRIPT_URL = sheets.scriptURL || '';
var INVENTORY_CSV_URL = sheets.inventoryCSV || '';
var rows = [];

BillzoAuth.configure({
  getScriptUrl: function() { return SCRIPT_URL; }
});

function initInventory(){
  var biz = (cfg.business && cfg.business.name) ? cfg.business.name : 'Inventory';
  document.getElementById('brandName').textContent = biz + ' - Inventory';
  loadInventory();
}

function setConn(ok, msg){
  var p = document.getElementById('connPill');
  p.className = 'pill ' + (ok ? 'ok' : 'err');
  p.textContent = msg;
}

function toast(msg, type){
  var t = document.getElementById('toast');
  t.className = 'toast ' + (type || 'ok') + ' show';
  t.textContent = msg;
  setTimeout(function(){ t.className = 'toast'; }, 2800);
}

function esc(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function num(v){ var n = parseFloat(String(v||'').replace(/[^0-9.-]/g,'')); return isNaN(n) ? 0 : n; }

function csvSplit(line){
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCSVRows(csv){
  var lines = csv.replace(/\r/g,'').trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  var headers = csvSplit(lines[0]);
  return lines.slice(1).map(function(line, idx){
    var cols = csvSplit(line);
    var obj = { _row: idx + 2 };
    headers.forEach(function(h, i){ obj[String(h).trim()] = (cols[i] || '').trim(); });
    return obj;
  });
}

function fetchByApi(){
  if (!SCRIPT_URL) return Promise.resolve([]);
  return BillzoAuth.authGet({ action: 'inventory' })
    .then(function(d){ return (d && d.rows) ? d.rows : []; });
}

function loadInventory(){
  setConn(false, 'Loading...');
  fetchByApi()
    .then(function(data){
      rows = data || [];
      buildCatFilter();
      renderTable();
      renderSummary();
      setConn(true, 'Connected');
    })
    .catch(function(e){
      rows = [];
      renderTable();
      renderSummary();
      setConn(false, 'Error');
      toast('Could not load inventory: ' + e.message, 'err');
    });
}

function buildCatFilter(){
  var el = document.getElementById('cat');
  var cur = el.value;
  var cats = [];
  rows.forEach(function(r){
    var c = String(r['Category'] || r.category || '').trim();
    if (c && cats.indexOf(c) < 0) cats.push(c);
  });
  el.innerHTML = '<option value="">All Categories</option>' + cats.map(function(c){ return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
  el.value = cur;
}

function rowStockState(r){
  var q = num(r['Stock Qty']);
  var m = num(r['Min Qty']);
  if (q <= 0) return 'out';
  if (q <= m) return 'low';
  return 'ok';
}

function renderSummary(){
  var total = rows.length, low = 0, out = 0, val = 0;
  rows.forEach(function(r){
    var s = rowStockState(r);
    if (s === 'low') low++;
    if (s === 'out') out++;
    val += num(r['Stock Qty']) * num(r['Unit Cost']);
  });
  document.getElementById('sTotal').textContent = total;
  document.getElementById('sLow').textContent = low;
  document.getElementById('sOut').textContent = out;
  document.getElementById('sVal').textContent = 'Rs.' + val.toFixed(2);
}

function filteredRows(){
  var q = (document.getElementById('q').value || '').toLowerCase();
  var c = document.getElementById('cat').value;
  var s = document.getElementById('st').value;
  return rows.filter(function(r){
    var name = String(r['Item Name'] || '').toLowerCase();
    var cat = String(r['Category'] || '').toLowerCase();
    var sup = String(r['Supplier'] || '').toLowerCase();
    if (q && !(name.includes(q) || cat.includes(q) || sup.includes(q))) return false;
    if (c && String(r['Category'] || '') !== c) return false;
    if (s && String(r['Status'] || 'Active') !== s) return false;
    return true;
  });
}

function renderTable(){
  var list = filteredRows();
  var tb = document.getElementById('tb');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="9" style="color:rgba(255,255,255,.45)">No inventory items</td></tr>';
    return;
  }
  tb.innerHTML = list.map(function(r){
    var state = rowStockState(r);
    var bcls = state === 'ok' ? 'ok' : (state === 'low' ? 'low' : 'out');
    var blbl = state === 'ok' ? 'In Stock' : (state === 'low' ? 'Low' : 'Out');
    return '<tr>'
      + '<td><b>' + esc(r['Item Name']) + '</b><br/><small style="color:rgba(255,255,255,.45);font-family:\'DM Mono\',monospace">' + esc(r['Item ID']) + '</small></td>'
      + '<td>' + esc(r['Category']) + '</td>'
      + '<td>' + esc(r['Unit'] || 'Nos') + '</td>'
      + '<td>' + num(r['Stock Qty']).toFixed(2) + '</td>'
      + '<td>' + num(r['Min Qty']).toFixed(2) + '</td>'
      + '<td>Rs.' + num(r['Unit Cost']).toFixed(2) + '</td>'
      + '<td>' + esc(r['Supplier'] || '') + '</td>'
      + '<td><span class="badge ' + bcls + '">' + blbl + '</span></td>'
      + '<td class="actions">'
      + '<button onclick="quickAdjust(\'' + esc(r['Item ID']) + '\',-1)">-1</button>'
      + '<button onclick="quickAdjust(\'' + esc(r['Item ID']) + '\',1)">+1</button>'
      + '<button onclick="openModal(\'' + esc(r['Item ID']) + '\')">Edit</button>'
      + '<button onclick="deleteItem(' + r._row + ',\'' + esc(r['Item ID']) + '\')">Del</button>'
      + '</td>'
      + '</tr>';
  }).join('');
}

function openModal(itemId){
  document.getElementById('mBg').classList.add('open');
  document.getElementById('mTitle').textContent = itemId ? 'Edit Inventory Item' : 'Add Inventory Item';
  if (!itemId) {
    ['fItemId','fName','fCategory','fUnit','fQty','fMin','fCost','fSupplier'].forEach(function(id){ document.getElementById(id).value = ''; });
    document.getElementById('fStatus').value = 'Active';
    return;
  }
  var r = rows.find(function(x){ return String(x['Item ID']) === String(itemId); });
  if (!r) return;
  document.getElementById('fItemId').value = r['Item ID'] || '';
  document.getElementById('fName').value = r['Item Name'] || '';
  document.getElementById('fCategory').value = r['Category'] || '';
  document.getElementById('fUnit').value = r['Unit'] || 'Nos';
  document.getElementById('fQty').value = num(r['Stock Qty']);
  document.getElementById('fMin').value = num(r['Min Qty']);
  document.getElementById('fCost').value = num(r['Unit Cost']);
  document.getElementById('fSupplier').value = r['Supplier'] || '';
  document.getElementById('fStatus').value = r['Status'] || 'Active';
}

function closeModal(){ document.getElementById('mBg').classList.remove('open'); }

function saveItem(){
  var payload = {
    action: 'saveInventoryItem',
    itemId: document.getElementById('fItemId').value.trim(),
    itemName: document.getElementById('fName').value.trim(),
    category: document.getElementById('fCategory').value.trim() || 'General',
    unit: document.getElementById('fUnit').value.trim() || 'Nos',
    stockQty: document.getElementById('fQty').value || '0',
    minQty: document.getElementById('fMin').value || '0',
    unitCost: document.getElementById('fCost').value || '0',
    supplier: document.getElementById('fSupplier').value.trim(),
    status: document.getElementById('fStatus').value
  };
  if (!payload.itemName) { toast('Item name is required', 'err'); return; }
  if (!SCRIPT_URL) { toast('Script URL not found in config.js', 'err'); return; }

  BillzoAuth.authPost(payload).then(function(){
    closeModal();
    toast('Saved. Refreshing...', 'ok');
    setTimeout(loadInventory, 1200);
  }).catch(function(){
    toast('Save failed', 'err');
  });
}

function quickAdjust(itemId, delta){
  if (!SCRIPT_URL) { toast('Script URL not found in config.js', 'err'); return; }
  BillzoAuth.authPost({ action:'adjustInventoryStock', itemId:itemId, delta:delta }).then(function(){
    toast('Stock updated', 'ok');
    setTimeout(loadInventory, 900);
  }).catch(function(){
    toast('Update failed', 'err');
  });
}

function deleteItem(rowIndex, itemId){
  if (!confirm('Delete this item?')) return;
  if (!SCRIPT_URL) { toast('Script URL not found in config.js', 'err'); return; }
  BillzoAuth.authPost({ action:'deleteInventoryItem', rowIndex:rowIndex, itemId:itemId }).then(function(){
    toast('Deleted', 'ok');
    setTimeout(loadInventory, 900);
  }).catch(function(){
    toast('Delete failed', 'err');
  });
}

document.getElementById('mBg').addEventListener('click', function(e){
  if (e.target && e.target.id === 'mBg') closeModal();
});

BillzoAuth.guard({ onReady: initInventory });
