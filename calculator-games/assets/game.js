/* Shared question generator + sounds */
const Q = {
  easy:   () => mk(1, 10, ['+','-']),
  medium: () => mk(2, 20, ['+','-','×']),
  hard:   () => mk(5, 50, ['+','-','×','÷']),
  tables: () => {
    const a = rnd(2,12), b = rnd(2,12);
    return { text:`${a} × ${b}`, ans: a*b };
  }
};
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function mk(min,max,ops){
  const op = ops[rnd(0, ops.length-1)];
  let a = rnd(min,max), b = rnd(min,max), ans;
  if(op==='+') ans = a+b;
  else if(op==='-'){ if(b>a)[a,b]=[b,a]; ans = a-b; }
  else if(op==='×'){ a=rnd(2,12); b=rnd(2,12); ans=a*b; }
  else { ans=rnd(2,12); b=rnd(2,12); a=ans*b; } // ÷ keeps integer
  return { text:`${a} ${op} ${b}`, ans };
}

/* Simple beep using Web Audio */
let _ac;
function beep(freq=600, ms=120){
  try{
    _ac = _ac || new (window.AudioContext||window.webkitAudioContext)();
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.frequency.value = freq; o.type='square';
    o.connect(g); g.connect(_ac.destination);
    g.gain.setValueAtTime(.15,_ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,_ac.currentTime+ms/1000);
    o.start(); o.stop(_ac.currentTime+ms/1000);
  }catch(e){}
}
const ok = ()=>beep(880,140);
const bad = ()=>beep(180,200);
const win = ()=>{ beep(660,120); setTimeout(()=>beep(880,120),130); setTimeout(()=>beep(1100,200),260); };

/* Auth guard for game pages */
(function(){
  if(sessionStorage.getItem('bma_auth') !== '1'){
    location.href = '../index.html';
  }
})();

/* ===== Leaderboard Store (sessionStorage) =====
   Resets when browser tab closes. Refresh keeps it.
   Each entry: { game, name, score, detail, ts } */
const LB_KEY = 'bma_leaderboard';
function lbAll(){
  try { return JSON.parse(sessionStorage.getItem(LB_KEY)) || []; }
  catch(e){ return []; }
}
function lbAdd(entry){
  const list = lbAll();
  list.push({ ...entry, ts: Date.now() });
  sessionStorage.setItem(LB_KEY, JSON.stringify(list));
}
function lbClear(){ sessionStorage.removeItem(LB_KEY); }

/* ===== On-screen Numpad =====
   buildNumpad(containerEl, onEnter(value), opts)
   Renders touch buttons. Updates a target display.
*/
function buildNumpad(container, onEnter, opts={}){
  const accent = opts.accent || '#ffd700';
  const label  = opts.label  || 'Enter';
  container.innerHTML = `
    <div class="np-display" data-display>0</div>
    <div class="np-grid">
      ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="np-btn" data-k="${n}">${n}</button>`).join('')}
      <button class="np-btn np-clr" data-k="C">C</button>
      <button class="np-btn" data-k="0">0</button>
      <button class="np-btn np-back" data-k="B">⌫</button>
    </div>
    <button class="np-enter" data-k="E" style="background:${accent}">${label}</button>
  `;
  const disp = container.querySelector('[data-display]');
  let val = '';
  function render(){ disp.textContent = val === '' ? '0' : val; }
  container.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const k = b.dataset.k;
      if(k==='C') val='';
      else if(k==='B') val = val.slice(0,-1);
      else if(k==='E'){
        if(val==='') return;
        const v = parseInt(val);
        const keep = onEnter(v); // if returns 'keep' don't clear
        if(keep !== 'keep') val='';
      } else {
        if(val.length<6) val += k;
      }
      render();
    });
  });
  render();
  return {
    clear(){ val=''; render(); },
    set(v){ val=String(v); render(); },
    get(){ return val; }
  };
}
