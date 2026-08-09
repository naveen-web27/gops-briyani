/* ── Billzo: read URLs & PINs from config.js ── */
var _cfg = window.APP_CONFIG || {};
const ADMIN_PIN      = localStorage.getItem('admin_pin')        || (_cfg.admin  && _cfg.admin.pin)         || '1234';
let SCRIPT_URL       = localStorage.getItem('admin_script_url') || (_cfg.sheets && _cfg.sheets.scriptURL)  || '';
const MENU_CSV_URL   = (_cfg.sheets && _cfg.sheets.menuCSV)    || '';
const ORDERS_CSV_URL = (_cfg.sheets && _cfg.sheets.ordersCSV)  || '';
const INVENTORY_CSV_URL = (_cfg.sheets && _cfg.sheets.inventoryCSV) || '';

BillzoAuth.configure({
  getScriptUrl: function() { return SCRIPT_URL; }
});

/* Apply business name from config */
(function() {
  var biz = _cfg.business || {};
  var name = biz.name || 'Admin';
  var logoEl = document.getElementById('admin-top-logo');
  if (logoEl) logoEl.innerHTML = '🍽️ ' + name + ' <span>Admin</span>';
  var pinSubEl = document.getElementById('pin-sub-brand');
  if (pinSubEl) pinSubEl.textContent = name + ' Management';
})();

/* ═══ STATE ═══ */
let allMenu   = [];  // raw rows from sheet
let allOrders = [];  // raw rows from sheet
let allInventory = []; // raw rows from inventory sheet
let menuSortKey = '', menuSortAsc = true;
let ordSortKey  = '', ordSortAsc  = false;
let activeFilter = 'today';
let analyticsPeriod = '7d';
let pendingDeleteRow = -1;

/* ═══════════════════════════════════════════════
   PIN
═══════════════════════════════════════════════ */
let pinBuf = '';
function pinPress(d){
  if(pinBuf.length>=4) return;
  pinBuf += d;
  for(let i=0;i<4;i++) document.getElementById('pd'+i).classList.toggle('filled', i<pinBuf.length);
  if(pinBuf.length===4){
    const storedPin = localStorage.getItem('admin_pin')||'1234';
    if(pinBuf===storedPin){
      document.getElementById('pin-screen').style.display='none';
      document.getElementById('admin').classList.add('open');
      document.getElementById('script-url-input').value = SCRIPT_URL;
      document.getElementById('settings-url').value = SCRIPT_URL;
      document.getElementById('dash-date').textContent = 'Today — ' + new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
      initDates();
      document.getElementById('script-url-input').value = SCRIPT_URL;
      document.getElementById('settings-url').value = SCRIPT_URL;
      refreshAll();
    } else {
      document.getElementById('pin-err').textContent='Incorrect PIN';
      document.querySelectorAll('.pin-dot').forEach(d=>{ d.style.animation='none'; setTimeout(()=>{d.style.animation='';},10); d.classList.add('shake'); setTimeout(()=>d.classList.remove('shake'),400); });
      pinBuf=''; setTimeout(()=>{ for(let i=0;i<4;i++) document.getElementById('pd'+i).classList.remove('filled'); document.getElementById('pin-err').textContent=''; },600);
    }
  }
}
function pinDel(){ if(pinBuf.length){ pinBuf=pinBuf.slice(0,-1); for(let i=0;i<4;i++) document.getElementById('pd'+i).classList.toggle('filled',i<pinBuf.length); } }
function lockAdmin(){ BillzoAuth.logout(); }
function changePin(){
  const np = document.getElementById('new-pin').value.trim();
  if(!/^\d{4}$/.test(np)){ toast('PIN must be exactly 4 digits','err'); return; }
  localStorage.setItem('admin_pin',np); toast('PIN updated! Use it next time you log in.','ok');
  document.getElementById('new-pin').value='';
}

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
function showPage(p){
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('nav-'+p).classList.add('active');
  if(window.innerWidth<=680) document.getElementById('sidebar').classList.remove('open');
  if(p==='analytics') renderAnalytics();
}
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); }

/* ═══════════════════════════════════════════════
   SCRIPT URL
═══════════════════════════════════════════════ */
function saveScriptUrl(){
  SCRIPT_URL = document.getElementById('script-url-input').value.trim();
  document.getElementById('settings-url').value = SCRIPT_URL;
  localStorage.setItem('admin_script_url', SCRIPT_URL);
  if(SCRIPT_URL){ toast('URL saved! Loading data…','ok'); refreshAll(); }
  else toast('Please paste a valid URL','err');
}
function saveFromSettings(){
  SCRIPT_URL = document.getElementById('settings-url').value.trim();
  document.getElementById('script-url-input').value = SCRIPT_URL;
  localStorage.setItem('admin_script_url', SCRIPT_URL);
  if(SCRIPT_URL){ toast('URL saved! Loading data…','ok'); refreshAll(); }
  else toast('Please paste a valid URL','err');
}
function markUnsaved(){}

/* ═══════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════ */
function setConnStatus(type, msg){
  const el = document.getElementById('conn-status');
  el.className = 'top-status ' + type;
  el.textContent = msg;
}

/* ══ READ: fetch CSV (no CORS, works on GitHub Pages) ══ */
function fetchCSV(url){
  return fetch(url + '&t=' + Date.now())
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
    .then(parseCSVtoRows);
}

function parseCSVtoRows(csv){
  var lines = csv.replace(/\r/g,'').trim().split('\n').filter(Boolean);
  if(lines.length < 2) return [];
  var headers = csvSplit(lines[0]);
  return lines.slice(1).map(function(line, i){
    var cols = csvSplit(line);
    var obj = { _row: i + 2 };
    headers.forEach(function(h, j){ obj[h.trim()] = (cols[j]||'').trim(); });
    return obj;
  }).filter(function(r){ return Object.values(r).some(function(v){ return typeof v === 'string' && v.length > 0; }); });
}

function csvSplit(line){
  var result = [], cur = '', inQ = false;
  for(var i = 0; i < line.length; i++){
    var c = line[i];
    if(c === '"'){ inQ = !inQ; }
    else if(c === ',' && !inQ){ result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

/* ══ WRITE: Apps Script POST no-cors (same as billing.html) ══ */
function apiPost(payload){
  return BillzoAuth.authPost(payload);
}

function refreshAll(){
  setConnStatus('loading','Loading…');
  Promise.all([loadMenu(), loadOrders(), loadInventory()])
    .then(function(){ setConnStatus('ok','✓ Connected'); })
    .catch(function(e){
      console.error(e);
      setConnStatus('err','Connection error');
      toast('Could not load sheet. Check CSV URLs are published.','err');
    });
}

/* ═══════════════════════════════════════════════
   MENU LOAD & RENDER
═══════════════════════════════════════════════ */
function loadMenu(){
  return BillzoAuth.authGet({ action: 'menu' }).then(function(data){
    allMenu = (data && data.rows) ? data.rows : [];
    buildMenuCatFilter();
    updateCatSuggestions();
    renderMenuTable();
    updateDashMenuStats();
  });
}

function buildMenuCatFilter(){
  const sel = document.getElementById('menu-cat-filter');
  const current = sel.value;
  const cats = [...new Set(allMenu.map(r=>r.Category).filter(Boolean))];
  sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c=>`<option value="${c}"${current===c?' selected':''}>${c}</option>`).join('');
  // Dish filter for orders
  const dsel = document.getElementById('ord-dish-filter');
  const dcurrent = dsel.value;
  dsel.innerHTML = '<option value="">All Dishes</option>' + allMenu.map(r=>`<option value="${esc(r.Name)}"${dcurrent===r.Name?' selected':''}>${r.Name}</option>`).join('');
}

function updateCatSuggestions(){
  const dl = document.getElementById('cat-suggestions');
  const cats = [...new Set(allMenu.map(r=>r.Category).filter(Boolean))];
  dl.innerHTML = cats.map(c=>`<option value="${c}"></option>`).join('');
}

function renderMenuTable(){
  const search  = (document.getElementById('menu-search').value||'').toLowerCase();
  const catF    = document.getElementById('menu-cat-filter').value;
  const typeF   = document.getElementById('menu-type-filter').value;
  let rows = allMenu.filter(r=>{
    if(catF  && r.Category !== catF)  return false;
    if(typeF && r.Type     !== typeF)  return false;
    if(search && !`${r.Name} ${r.Category} ${r.Description}`.toLowerCase().includes(search)) return false;
    return true;
  });
  if(menuSortKey){ rows.sort((a,b)=>{ let av=a[menuSortKey]||'', bv=b[menuSortKey]||''; if(menuSortKey==='Price'){av=+av;bv=+bv;} return menuSortAsc ? (av>bv?1:-1) : (av<bv?1:-1); }); }
  const tbody = document.getElementById('menu-tbl-body');
  if(!rows.length){ tbody.innerHTML='<tr class="loading-row"><td colspan="10">No dishes found</td></tr>'; document.getElementById('menu-count').textContent='0 dishes'; return; }
  tbody.innerHTML = rows.map((r,i)=>{
    const badgePill = r.Badge ? `<span class="pill ${r.Badge==='Bestseller'?'pill-best':r.Badge==='New'?'pill-new':'pill-chef'}">${r.Badge}</span>` : '—';
    const imgPreview = r.ImageURL ? `<img src="${esc(r.ImageURL)}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;display:block" onerror="this.style.display='none'"/>` : '<span style="color:rgba(255,255,255,.2);font-size:.8rem">No image</span>';
    return `<tr>
      <td style="color:rgba(255,255,255,.3);font-size:.72rem">${r._row}</td>
      <td><span style="font-size:.72rem;color:rgba(255,255,255,.4)">${esc(r.Category)}</span></td>
      <td style="font-weight:600;color:#fff;max-width:160px">${esc(r.Name)}</td>
      <td style="max-width:180px;color:rgba(255,255,255,.4);font-size:.78rem">${esc(r.Description||'')}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--gold2)">₹${r.Price}</td>
      <td><span class="pill ${r.Type==='Veg'?'pill-veg':'pill-nonveg'}">${r.Type}</span></td>
      <td>${badgePill}</td>
      <td><span class="pill ${r.Available==='Yes'?'pill-yes':'pill-no'}">${r.Available}</span></td>
      <td>${imgPreview}</td>
      <td style="white-space:nowrap;display:flex;gap:5px;align-items:center">
        <button class="act-btn act-edit" onclick="openEditDish(${r._row})">✏️ Edit</button>
        <button class="act-btn act-tog" onclick="toggleAvail(${r._row},'${r.Available}')">${r.Available==='Yes'?'🚫 Sold Out':'✅ Enable'}</button>
        <button class="act-btn act-del" onclick="openDelete(${r._row},'${esc(r.Name)}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('menu-count').textContent = rows.length + ' dish' + (rows.length!==1?'es':'');
}

function sortMenu(key){ if(menuSortKey===key) menuSortAsc=!menuSortAsc; else { menuSortKey=key; menuSortAsc=true; } renderMenuTable(); }

/* ── ADD DISH ── */
function openAddDish(){
  clearDishModal();
  document.getElementById('modal-title').textContent = 'Add New Dish';
  document.getElementById('edit-row-idx').value = '';
  document.getElementById('modal-save-btn').textContent = '+ Add Dish';
  document.getElementById('dish-modal').classList.add('open');
}

function openEditDish(rowIdx){
  const r = allMenu.find(m=>m._row===rowIdx);
  if(!r) return;
  clearDishModal();
  document.getElementById('modal-title').textContent = 'Edit Dish';
  document.getElementById('edit-row-idx').value = rowIdx;
  document.getElementById('f-category').value = r.Category||'';
  document.getElementById('f-name').value = r.Name||'';
  document.getElementById('f-desc').value = r.Description||'';
  document.getElementById('f-price').value = r.Price||'';
  document.getElementById('f-type').value = r.Type||'Veg';
  document.getElementById('f-image').value = r.ImageURL||'';
  document.getElementById('f-badge').value = r.Badge||'';
  document.getElementById('f-avail').value = r.Available||'Yes';
  document.getElementById('modal-save-btn').textContent = '💾 Save Changes';
  document.getElementById('dish-modal').classList.add('open');
}

function clearDishModal(){
  ['f-category','f-name','f-desc','f-price','f-image'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-type').value='Veg';
  document.getElementById('f-badge').value='';
  document.getElementById('f-avail').value='Yes';
}
function closeModal(){ document.getElementById('dish-modal').classList.remove('open'); }

function saveDish(){
  const name = document.getElementById('f-name').value.trim();
  const cat  = document.getElementById('f-category').value.trim();
  const price= document.getElementById('f-price').value.trim();
  if(!name||!cat||!price){ toast('Name, Category and Price are required','err'); return; }
  const rowIdx = document.getElementById('edit-row-idx').value;
  const payload = {
    action:      rowIdx ? 'editDish' : 'addDish',
    rowIndex:    rowIdx ? +rowIdx : undefined,
    Category:    cat, Name: name,
    Description: document.getElementById('f-desc').value.trim(),
    Price:       price,
    Type:        document.getElementById('f-type').value,
    ImageURL:    document.getElementById('f-image').value.trim(),
    Badge:       document.getElementById('f-badge').value,
    Available:   document.getElementById('f-avail').value,
  };
  const btn = document.getElementById('modal-save-btn');
  btn.disabled=true; btn.textContent='Saving…';
  apiPost(payload).then(function(){
    closeModal();
    toast(rowIdx ? 'Saved! Refreshing…' : 'Dish added! Refreshing…', 'ok');
    setTimeout(function(){ loadMenu(); }, 2500);
  }).catch(function(e){
    toast('Error: ' + e.message, 'err');
  }).finally(function(){ btn.disabled=false; btn.textContent=rowIdx?'💾 Save Changes':'+ Add Dish'; });
}

/* ── TOGGLE AVAILABILITY ── */
function toggleAvail(rowIdx, current){
  const newVal = current==='Yes' ? 'No' : 'Yes';
  const item = allMenu.find(m=>m._row===rowIdx);
  if(item) item.Available = newVal;
  renderMenuTable(); updateDashMenuStats();
  toast(newVal==='Yes' ? '✅ Enabled — saving…' : '🚫 Sold Out — saving…', 'info');
  apiPost({ action:'editField', rowIndex:rowIdx, field:'Available', value:newVal }).then(function(){
    setTimeout(function(){ loadMenu().then(function(){ toast(newVal==='Yes' ? 'Dish enabled ✅' : 'Marked sold out 🚫','ok'); }); }, 2500);
  }).catch(function(e){
    if(item) item.Available = current;
    renderMenuTable();
    toast('Error: '+e.message,'err');
  });
}

/* ── DELETE ── */
function openDelete(rowIdx, name){
  pendingDeleteRow = rowIdx;
  document.getElementById('del-dish-name').textContent = name;
  document.getElementById('del-modal').classList.add('open');
}
function closeDelModal(){ document.getElementById('del-modal').classList.remove('open'); pendingDeleteRow=-1; }
function confirmDelete(){
  if(pendingDeleteRow<0) return;
  const row = pendingDeleteRow;
  closeDelModal();
  allMenu = allMenu.filter(m=>m._row!==row);
  renderMenuTable();
  toast('Deleting…','info');
  apiPost({ action:'deleteDish', rowIndex:row }).then(function(){
    toast('Dish deleted ✓','ok');
    setTimeout(function(){ loadMenu(); }, 2500);
  }).catch(function(e){ toast('Error: '+e.message,'err'); loadMenu(); });
}

/* ── EXPORT MENU CSV ── */
function exportMenuCSV(){
  const headers = ['Category','Name','Description','Price','Type','ImageURL','Badge','Available'];
  const rows = [headers, ...allMenu.map(r=>headers.map(h=>r[h]||''))];
  downloadCSV(rows, 'menu-export.csv');
}

/* ═══════════════════════════════════════════════
   ORDERS
═══════════════════════════════════════════════ */

/* Handles: 609, "609", "609.00", "Rs.609.00", "Rs. 609.00" */
function getTotal(r){
  var raw = String(r.Total || r.total || '0');
  // Extract the last number in the string: handles "Rs.609.00", "609.00", "609"
  var m = raw.match(/(\d+\.?\d*)(?!.*\d)/);
  return m ? parseFloat(m[1]) : 0;
}

/* Handles ISO "2026-03-11T..." and locale "11/03/2026, 11:18" and "11 Mar 2026, 11:18 AM" */
function toDateStr(ts){
  if(!ts) return '';
  var s = String(ts).trim();
  // ISO format: 2026-03-11T...
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  // en-IN locale: "11/3/2026, 11:18:35 am" or "11/03/2026, 11:18:35"
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return m[3] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[1]).slice(-2);
  // fallback: try JS Date parse
  var d = new Date(s);
  if(!isNaN(d)) return d.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
  return '';
}

function loadOrders(){
  return BillzoAuth.authGet({ action: 'orders' }).then(function(data){
    allOrders = (data && data.rows) ? data.rows : [];
    renderOrdersTable();
    renderDashOrders();
    updateDashOrderStats();
  });
}

function initDates(){
  const today = todayStr();
  document.getElementById('ord-from').value = today;
  document.getElementById('ord-to').value   = today;
}

function todayStr(){
  // IST timezone — sheet timestamps are saved in IST
  return new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
}
function dateStr(d){ return d.toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'}); }

function setDateFilter(type, btn){
  activeFilter = type;
  if(btn){ document.querySelectorAll('.dfl').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
  const today = new Date(), td = todayStr();
  if(type==='today'){ document.getElementById('ord-from').value=td; document.getElementById('ord-to').value=td; }
  else if(type==='yesterday'){ const y=new Date(today); y.setDate(y.getDate()-1); const ys=dateStr(y); document.getElementById('ord-from').value=ys; document.getElementById('ord-to').value=ys; }
  else if(type==='week'){ const w=new Date(today); w.setDate(w.getDate()-6); document.getElementById('ord-from').value=dateStr(w); document.getElementById('ord-to').value=td; }
  else if(type==='month'){ const m=new Date(today.getFullYear(),today.getMonth(),1); document.getElementById('ord-from').value=dateStr(m); document.getElementById('ord-to').value=td; }
  else if(type==='all'){ document.getElementById('ord-from').value='2020-01-01'; document.getElementById('ord-to').value=td; }
  renderOrdersTable();
}

function getFilteredOrders(){
  const from   = document.getElementById('ord-from').value;
  const to     = document.getElementById('ord-to').value;
  const search = (document.getElementById('ord-search').value||'').toLowerCase();
  const dish   = document.getElementById('ord-dish-filter').value;
  return allOrders.filter(r=>{
    const dstr = toDateStr(r.Timestamp);
    if(from && dstr < from) return false;
    if(to   && dstr > to)   return false;
    const billNo = r['Bill No'] || r.OrderNo || '';
    if(search && !`${billNo} ${r.Customer||''} ${r.Items||''}`.toLowerCase().includes(search)) return false;
    if(dish  && !(r.Items||'').includes(dish)) return false;
    return true;
  });
}

function renderOrdersTable(){
  let rows = getFilteredOrders();
  if(ordSortKey){ rows.sort((a,b)=>{ let av=a[ordSortKey]||'',bv=b[ordSortKey]||''; return ordSortAsc?(av>bv?1:-1):(av<bv?1:-1); }); }
  const tbody = document.getElementById('orders-tbl-body');
  if(!rows.length){ tbody.innerHTML='<tr class="loading-row"><td colspan="9">No orders for this period</td></tr>'; }
  else {
    tbody.innerHTML = rows.map(r=>{
      const total   = getTotal(r);
      const billNo  = r['Bill No'] || r.OrderNo || '—';
      const statusCls = r.Status==='Closed'?'pill-yes':r.Status==='Pending'?'pill-chef':'pill-new';
      return `<tr>
        <td style="font-family:'DM Mono',monospace;color:var(--gold2);font-size:.8rem">${esc(billNo)}</td>
        <td style="font-size:.78rem;white-space:nowrap;color:rgba(255,255,255,.6)">${fmtDate(r.Timestamp)}</td>
        <td style="font-weight:500">${esc(r.Customer||'Walk-in')}</td>
        <td style="max-width:200px;font-size:.75rem;color:rgba(255,255,255,.5)">${esc(r.Items||'')}</td>
        <td style="font-size:.78rem;color:rgba(255,255,255,.5)">${r.Subtotal||'—'}</td>
        <td style="font-size:.78rem;color:rgba(255,255,255,.4)">${r.GST||'—'}</td>
        <td style="font-size:.78rem;color:#f87171">${r.Discount&&r.Discount!=='--'?r.Discount:'—'}</td>
        <td style="font-family:'Playfair Display',serif;font-weight:700;color:var(--gold)">₹${total.toFixed(0)}</td>
        <td><span class="pill ${statusCls}">${r.Status||'—'}</span></td>
      </tr>`;
    }).join('');
  }
  const totals = rows.reduce((s,r)=>{ s.rev+=getTotal(r); s.cnt++; return s; },{rev:0,cnt:0});
  document.getElementById('ord-total-rev').textContent = '₹' + totals.rev.toFixed(0);
  document.getElementById('ord-count').textContent     = totals.cnt;
  document.getElementById('ord-avg').textContent       = totals.cnt ? '₹'+(totals.rev/totals.cnt).toFixed(0) : '₹0';
  document.getElementById('orders-showing').textContent = `Showing ${rows.length} of ${allOrders.length} orders`;
}

function sortOrders(key){ if(ordSortKey===key) ordSortAsc=!ordSortAsc; else{ordSortKey=key;ordSortAsc=false;} renderOrdersTable(); }

function renderDashOrders(){
  const recent = [...allOrders].sort((a,b)=> toDateStr(b.Timestamp) >= toDateStr(a.Timestamp) ? 1 : -1).slice(0,8);
  const tbody = document.getElementById('dash-orders-body');
  if(!recent.length){ tbody.innerHTML='<tr class="loading-row"><td colspan="5">No orders yet</td></tr>'; return; }
  tbody.innerHTML = recent.map(r=>{
    const billNo = r['Bill No'] || r.OrderNo || '—';
    return `<tr>
      <td style="font-family:'DM Mono',monospace;color:var(--gold2);font-size:.8rem">${esc(billNo)}</td>
      <td style="font-size:.78rem;color:rgba(255,255,255,.5)">${fmtDate(r.Timestamp)}</td>
      <td>${esc(r.Customer||'Walk-in')}</td>
      <td style="max-width:180px;font-size:.75rem;color:rgba(255,255,255,.4)">${esc(r.Items||'')}</td>
      <td style="font-family:'Playfair Display',serif;color:var(--gold);font-weight:700">₹${getTotal(r).toFixed(0)}</td>
    </tr>`;
  }).join('');
}

function updateDashOrderStats(){
  const td = todayStr();
  const todayOrds = allOrders.filter(r=> toDateStr(r.Timestamp) === td);
  const monthOrds = allOrders.filter(r=> toDateStr(r.Timestamp).slice(0,7) === td.slice(0,7));
  const todayRev  = todayOrds.reduce((s,r)=>s+getTotal(r), 0);
  const monthRev  = monthOrds.reduce((s,r)=>s+getTotal(r), 0);
  const totalRev  = allOrders.reduce((s,r)=>s+getTotal(r), 0);
  // Debug: log first order total to console
  document.getElementById('d-today-rev').textContent    = '₹'+todayRev.toFixed(0);
  document.getElementById('d-today-orders').textContent = todayOrds.length+' orders today';
  document.getElementById('d-month-rev').textContent    = '₹'+monthRev.toFixed(0);
  document.getElementById('d-month-orders').textContent = monthOrds.length+' orders this month';
  document.getElementById('d-total-orders').textContent = allOrders.length;
  document.getElementById('d-avg-order').textContent    = allOrders.length?'Avg: ₹'+(totalRev/allOrders.length).toFixed(0)+' / order':'No orders yet';
}

function updateDashMenuStats(){
  const avail = allMenu.filter(r=>r.Available==='Yes').length;
  document.getElementById('d-menu-count').textContent = allMenu.length;
  document.getElementById('d-menu-avail').textContent = avail + ' available';
}

function exportOrdersCSV(){
  const rows = getFilteredOrders();
  const headers = ['OrderNo','Timestamp','Customer','Items','Subtotal','GST','Discount','Total','Status'];
  downloadCSV([headers, ...rows.map(r=>headers.map(h=>r[h]||''))], 'orders-export.csv');
}

/* ═══════════════════════════════════════════════
   INVENTORY
═══════════════════════════════════════════════ */
function toNum(v){
  var n = parseFloat(String(v || '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function loadInventory(){
  if (!SCRIPT_URL) {
    allInventory = [];
    buildInventoryFilters();
    renderInventoryTable();
    return Promise.resolve();
  }

  return BillzoAuth.authGet({ action: 'inventory' })
    .then(function(d){
      allInventory = (d && d.rows) ? d.rows : [];
      buildInventoryFilters();
      renderInventoryTable();
    })
    .catch(function(){
      allInventory = [];
      buildInventoryFilters();
      renderInventoryTable();
    });
}

function buildInventoryFilters(){
  var sel = document.getElementById('inv-cat-filter');
  if (!sel) return;
  var current = sel.value;
  var cats = [...new Set(allInventory.map(function(r){ return r['Category'] || ''; }).filter(Boolean))];
  sel.innerHTML = '<option value="">All Categories</option>' + cats.map(function(c){
    return '<option value="' + esc(c) + '"' + (current === c ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
}

function inventoryState(r){
  var q = toNum(r['Stock Qty']);
  var m = toNum(r['Min Qty']);
  if (q <= 0) return 'out';
  if (q <= m) return 'low';
  return 'ok';
}

function getFilteredInventory(){
  var q = (document.getElementById('inv-search').value || '').toLowerCase();
  var c = document.getElementById('inv-cat-filter').value;
  var st = document.getElementById('inv-status-filter').value;
  return allInventory.filter(function(r){
    var txt = ((r['Item Name'] || '') + ' ' + (r['Category'] || '') + ' ' + (r['Supplier'] || '')).toLowerCase();
    if (q && !txt.includes(q)) return false;
    if (c && (r['Category'] || '') !== c) return false;
    if (st && inventoryState(r) !== st) return false;
    return true;
  });
}

function renderInventoryTable(){
  var body = document.getElementById('inventory-tbl-body');
  if (!body) return;

  var rows = getFilteredInventory();
  if (!rows.length){
    body.innerHTML = '<tr class="loading-row"><td colspan="10">No inventory data found</td></tr>';
  } else {
    body.innerHTML = rows.map(function(r){
      var st = inventoryState(r);
      var badge = st === 'ok'
        ? '<span class="pill pill-yes">In Stock</span>'
        : (st === 'low' ? '<span class="pill pill-best">Low Stock</span>' : '<span class="pill pill-chef">Out Of Stock</span>');
      return '<tr>'
        + '<td style="font-family:\'DM Mono\',monospace;color:var(--gold2)">' + esc(r['Item ID'] || '') + '</td>'
        + '<td style="font-weight:600;color:#fff">' + esc(r['Item Name'] || '') + '</td>'
        + '<td>' + esc(r['Category'] || '') + '</td>'
        + '<td>' + esc(r['Unit'] || '') + '</td>'
        + '<td>' + toNum(r['Stock Qty']).toFixed(2) + '</td>'
        + '<td>' + toNum(r['Min Qty']).toFixed(2) + '</td>'
        + '<td>₹' + toNum(r['Unit Cost']).toFixed(2) + '</td>'
        + '<td>' + esc(r['Supplier'] || '') + '</td>'
        + '<td>' + badge + '</td>'
        + '<td style="font-size:.76rem;color:rgba(255,255,255,.45)">' + esc(r['Last Updated'] || '') + '</td>'
        + '</tr>';
    }).join('');
  }

  var low = rows.filter(function(r){ return inventoryState(r) === 'low'; }).length;
  var out = rows.filter(function(r){ return inventoryState(r) === 'out'; }).length;
  var value = rows.reduce(function(s, r){ return s + toNum(r['Stock Qty']) * toNum(r['Unit Cost']); }, 0);

  document.getElementById('inv-total').textContent = rows.length;
  document.getElementById('inv-low').textContent = low;
  document.getElementById('inv-out').textContent = out;
  document.getElementById('inventory-showing').textContent = 'Showing ' + rows.length + ' of ' + allInventory.length + ' items';
  document.getElementById('inventory-value').textContent = 'Inventory Value: ₹' + value.toFixed(2);
}

function exportInventoryCSV(){
  const rows = getFilteredInventory();
  const headers = ['Item ID','Item Name','Category','Unit','Stock Qty','Min Qty','Unit Cost','Supplier','Status','Last Updated'];
  downloadCSV([headers, ...rows.map(function(r){ return headers.map(function(h){ return r[h] || ''; }); })], 'inventory-export.csv');
}

/* ═══════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════ */
function setAnalyticsPeriod(p, btn){
  analyticsPeriod = p;
  document.querySelectorAll('#page-analytics .dfl').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  renderAnalytics();
}

function getAnalyticsOrders(){
  const now = new Date(), td = todayStr();
  let from;
  if(analyticsPeriod==='7d'){ const d=new Date(now); d.setDate(d.getDate()-6); from=dateStr(d); }
  else if(analyticsPeriod==='30d'){ const d=new Date(now); d.setDate(d.getDate()-29); from=dateStr(d); }
  else if(analyticsPeriod==='6m'){ const d=new Date(now); d.setMonth(d.getMonth()-5); d.setDate(1); from=dateStr(d); }
  else from='2020-01-01';
  return allOrders.filter(r=>{ const ds=toDateStr(r.Timestamp); return ds>=from && ds<=td; });
}

function renderAnalytics(){
  const orders = getAnalyticsOrders();
  const totalRev = orders.reduce((s,r)=>s+getTotal(r), 0);
  document.getElementById('an-rev').textContent  = '₹'+totalRev.toFixed(0);
  document.getElementById('an-ords').textContent = orders.length;

  const byDay = {};
  orders.forEach(r=>{
    const d = toDateStr(r.Timestamp);
    if(!d) return;
    byDay[d] = byDay[d]||{rev:0,cnt:0};
    byDay[d].rev += getTotal(r);
    byDay[d].cnt++;
  });
  const dayKeys = Object.keys(byDay).sort();
  const dayRevs = dayKeys.map(d=>byDay[d].rev);
  const dayCnts = dayKeys.map(d=>byDay[d].cnt);
  const avgDay  = dayKeys.length ? totalRev/dayKeys.length : 0;
  const bestDay = Math.max(...dayRevs,0);
  document.getElementById('an-avg-day').textContent = '₹'+avgDay.toFixed(0);
  document.getElementById('an-best').textContent    = '₹'+bestDay.toFixed(0);

  // Revenue bar chart
  renderBarChart('rev-chart', dayKeys, dayRevs, d=>shortDate(d), v=>'₹'+v.toFixed(0), false);
  // Orders bar chart
  renderBarChart('ord-chart', dayKeys, dayCnts, d=>shortDate(d), v=>v+'', true);

  // Top dishes
  const dishCount = {};
  orders.forEach(r=>{
    (r.Items||'').split('|').forEach(seg=>{
      const m = seg.trim().match(/^(.+?) x(\d+)/);
      if(m){ const name=m[1].trim(); dishCount[name]=(dishCount[name]||0)+parseInt(m[2]); }
    });
  });
  const topDishes = Object.entries(dishCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxD = topDishes[0]?topDishes[0][1]:1;
  document.getElementById('top-dishes-chart').innerHTML = topDishes.length
    ? topDishes.map(([name,cnt])=>`<div class="hbar-row">
        <div class="hbar-name" title="${esc(name)}">${esc(name)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${(cnt/maxD*100).toFixed(1)}%"></div></div>
        <div class="hbar-count">${cnt} sold</div>
      </div>`).join('')
    : '<div style="color:rgba(255,255,255,.25);font-size:.85rem;padding:16px 0">No order data yet</div>';

  // Revenue by category
  const catRev = {};
  orders.forEach(r=>{
    (r.Items||'').split('|').forEach(seg=>{
      const m = seg.trim().match(/^(.+?) x\d+ \(Rs\.([\d.]+)\)/);
      if(m){
        const dishName=m[1].trim();
        const val=parseFloat(m[2])||0;
        const menuItem = allMenu.find(mi=>mi.Name===dishName);
        const cat = menuItem?menuItem.Category:'Other';
        catRev[cat]=(catRev[cat]||0)+val;
      }
    });
  });
  const catEntries = Object.entries(catRev).sort((a,b)=>b[1]-a[1]);
  const maxC = catEntries[0]?catEntries[0][1]:1;
  document.getElementById('cat-chart').innerHTML = catEntries.length
    ? catEntries.map(([cat,rev])=>`<div class="hbar-row">
        <div class="hbar-name">${esc(cat)}</div>
        <div class="hbar-track"><div class="hbar-fill red" style="width:${(rev/maxC*100).toFixed(1)}%"></div></div>
        <div class="hbar-count">₹${rev.toFixed(0)}</div>
      </div>`).join('')
    : '<div style="color:rgba(255,255,255,.25);font-size:.85rem;padding:16px 0">No order data yet</div>';
}

function renderBarChart(elId, labels, values, labelFmt, valFmt, isBlue){
  const el = document.getElementById(elId);
  if(!values.length){ el.innerHTML='<div style="color:rgba(255,255,255,.2);font-size:.82rem;padding:20px 0">No data for this period</div>'; return; }
  const max = Math.max(...values,1);
  // show last 10 only to avoid clutter
  const show = 10;
  const sl = labels.slice(-show), sv = values.slice(-show);
  el.innerHTML = sv.map((v,i)=>{
    const pct = (v/max*100).toFixed(1);
    return `<div class="bar-wrap">
      <div class="bar-val">${valFmt(v)}</div>
      <div class="bar-inner"><div class="bar${isBlue?' red':''}" style="height:${pct}%"></div></div>
      <div class="bar-lbl">${labelFmt(sl[i])}</div>
    </div>`;
  }).join('');
}

function shortDate(d){
  if(!d) return '';
  const p = d.split('-');
  return p[2]+'/'+p[1];
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmtDate(ts){
  if(!ts) return '—';
  try {
    var s = String(ts).trim();
    var d;

    // Format from Apps Script: "21/3/2026, 10:30:00 am" or "21/03/2026, 10:30:00"
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
    if(m){
      var day=parseInt(m[1]), mon=parseInt(m[2])-1, yr=parseInt(m[3]);
      var hr=parseInt(m[4]), min=parseInt(m[5]);
      var ampm = m[7] ? m[7].toLowerCase() : '';
      if(ampm==='pm' && hr!==12) hr+=12;
      if(ampm==='am' && hr===12) hr=0;
      d = new Date(yr, mon, day, hr, min);
    }
    // ISO format: "2026-03-21T10:30:00"
    else if(/^\d{4}-\d{2}-\d{2}/.test(s)){
      d = new Date(s);
    }
    // Last resort
    else {
      d = new Date(s);
    }

    if(isNaN(d)) return s.slice(0,16);
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})
      + ' ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  } catch(e){ return String(ts).slice(0,16); }
}

function downloadCSV(rows, filename){
  const csv = rows.map(r=>r.map(c=>'"'+String(c||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

function toast(msg, type){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast '+(type||'ok')+' show';
  setTimeout(()=>el.classList.remove('show'),3500);
}

/* keyboard PIN */
document.addEventListener('keydown',e=>{
  if(document.getElementById('pin-screen').style.display==='none') return;
  if(e.key>='0'&&e.key<='9') pinPress(e.key);
  if(e.key==='Backspace') pinDel();
});

function startAdminApp(){
  document.getElementById('pin-screen').style.display='none';
  document.getElementById('admin').classList.add('open');
  document.getElementById('script-url-input').value = SCRIPT_URL;
  document.getElementById('settings-url').value = SCRIPT_URL;
  document.getElementById('dash-date').textContent = 'Today — ' + new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  initDates();
  refreshAll();
}

BillzoAuth.guard({ onReady: startAdminApp });
</script>
