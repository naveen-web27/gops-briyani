/*
 * ═══════════════════════════════════════════════════════════════════
 *  BIRYANI CORE — app.js
 *  Shared frontend engine for all restaurant sites.
 *
 *  Hosted at:  https://YOUR_GITHUB.github.io/biryani-core/app.js
 *
 *  Per-client setup (in the client's own repo):
 *    1. config.js   — loaded BEFORE this file, sets window.APP_CONFIG
 *    2. images/     — logo.png, hero1/2/3.jpg, about-main/float.jpg
 *    3. index.html  — 10 lines, just loads config.js + this file
 *
 *  To update ALL clients: edit this file, push → done.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════
   1. BUILD CONFIG FROM window.APP_CONFIG
   (config.js must run before this file)
═══════════════════════════════════════════════ */
(function () {
  var _c  = window.APP_CONFIG || {};
  var _b  = _c.business   || {};
  var _a  = _c.about      || {};
  var _sh = _c.sheets     || {};
  var _sl = _c.heroSlides || [];

  window.CONFIG = {
    name:       _b.name       || 'My Restaurant',
    tagline:    _b.tagline    || 'Serving with love.',
    since:      _b.since      || '2020',
    phone:      _b.phone      || '',
    email:      _b.email      || '',
    orderLink:  _b.orderLink  || '#',
    award:      _b.award      || '',
    hoursShort: _b.hoursShort || '11 AM – 11 PM Daily',
    hoursLong:  _b.hoursLong  || '11 AM – 11 PM Daily',

    slide0Em:   (_sl[0] && _sl[0].h1Em)   || _b.name || 'Restaurant',
    slide0Rest: (_sl[0] && _sl[0].h1Rest) || '',
    slide0Tag:  (_sl[0] && _sl[0].tag)    || '',
    slide0P:    (_sl[0] && _sl[0].p)      || '',
    slide1Em:   (_sl[1] && _sl[1].h1Em)   || 'Feed',
    slide1Rest: (_sl[1] && _sl[1].h1Rest) || ' Your Crowd',
    slide1Tag:  (_sl[1] && _sl[1].tag)    || 'Catering Available',
    slide1P:    (_sl[1] && _sl[1].p)      || 'Bulk orders & catering for every occasion.',
    slide2Em:   (_sl[2] && _sl[2].h1Em)   || 'Fresh',
    slide2Rest: (_sl[2] && _sl[2].h1Rest) || ' Every Day',
    slide2Tag:  (_sl[2] && _sl[2].tag)    || 'Open Daily',
    slide2P:    (_sl[2] && _sl[2].p)      || 'Cooked fresh, served hot.',

    abYears: _a.years || '5+',
    abTitle: _a.title || 'Quality, Taste & Value',
    abP1:    _a.p1    || 'We have been serving our community with authentic flavours.',
    abP2:    _a.p2    || 'Every dish cooked with care.',
    stats:   _a.stats || [
      { n: '5+',  l: 'Years Old' },
      { n: '1',   l: 'Outlet'   },
      { n: '10K+',l: 'Guests'   },
    ],

    whyUs: _c.whyUs || [
      { ic: '🍲', title: 'Authentic Recipes', desc: 'Recipes passed down through generations' },
      { ic: '🌿', title: 'Fresh Ingredients', desc: 'Sourced fresh every morning'             },
      { ic: '👨‍🍳', title: 'Expert Chefs',   desc: 'Years of culinary experience'            },
      { ic: '🏅', title: 'Loved by Many',    desc: 'Thousands of happy customers'             },
    ],

    events: _c.events || [
      { title: 'Catering Services', desc: 'We bring our food to your event.',  emoji: '🍽️', btn: 'Enquire Now', href: '#contact' },
      { title: 'Bulk Orders',       desc: 'Special pricing for large orders.', emoji: '📦', btn: 'Call Now',    href: '#contact' },
    ],

    outlets: _c.outlets || [
      { name: 'Main Branch', address: 'Contact us for address', phone: '', map: '#' },
    ],

    testimonials: _c.testimonials || [
      { name: 'Happy Customer', date: '2025', stars: 5, review: 'Amazing food and great service!' },
    ],

    socials: _c.social  || {},
    theme:   _c.theme   || {},
    sheetCSV: _sh.menuCSV || '',
    formURL:  _c.formURL  || '',
  };
})();

var CONFIG = window.CONFIG;

/* ═══════════════════════════════════════════════
   2. DEMO MENU — shown when no Sheet connected
═══════════════════════════════════════════════ */
var DEMO = (window.APP_CONFIG && window.APP_CONFIG.demoMenu) || [
  { Category: 'Biryani', Name: 'Chicken Biryani',  Description: 'Slow-cooked on dum with whole spices', Price: '180', Type: 'NonVeg', ImageURL: '', Badge: 'Bestseller', Available: 'Yes' },
  { Category: 'Biryani', Name: 'Mutton Biryani',   Description: 'Tender mutton in aged basmati rice',   Price: '220', Type: 'NonVeg', ImageURL: '', Badge: '',           Available: 'Yes' },
  { Category: 'Biryani', Name: 'Veg Biryani',      Description: 'Seasonal vegetables in saffron rice',  Price: '130', Type: 'Veg',    ImageURL: '', Badge: 'New',        Available: 'Yes' },
  { Category: 'Drinks',  Name: 'Mango Lassi',      Description: 'Chilled yogurt with fresh mango',      Price: '60',  Type: 'Veg',    ImageURL: '', Badge: 'Bestseller', Available: 'Yes' },
  { Category: 'Drinks',  Name: 'Buttermilk',       Description: 'Fresh spiced buttermilk',              Price: '25',  Type: 'Veg',    ImageURL: '', Badge: '',           Available: 'Yes' },
];

/* ═══════════════════════════════════════════════
   3. INJECT FULL PAGE HTML
   Edit HTML structure here → all clients update.
═══════════════════════════════════════════════ */
function injectHTML() {
  document.title = CONFIG.name;
  document.body.innerHTML = `

    <!-- ════ TOP BAR ════ -->
    <div id="topbar">
      <div class="tb-inner">
        <div class="tb-left">
          📞 <a id="tb-phone" href="#">-</a>
          &nbsp;·&nbsp;
          ✉️ <a id="tb-email" href="#">-</a>
        </div>
        <div class="tb-socials" id="tb-soc"></div>
      </div>
    </div>

    <!-- ════ NAV ════ -->
    <nav id="nav">
      <div class="nav-wrap">
        <a href="#" class="nav-logo">
          <img src="images/logo.png" alt="Logo" id="logo-img" onerror="this.style.display='none'"/>
          <div class="nav-logo-txt">
            <span id="nav-since">Since 2020</span>
            <strong id="nav-name">Restaurant</strong>
          </div>
        </a>
        <ul class="nav-links">
          <li><a href="#">Home</a></li>
          <li><a href="#menu">Menu</a></li>
          <li class="has-drop">
            <a href="#about">About</a>
            <div class="nav-drop">
              <a href="#about">Our Story</a>
              <a href="#about">Who We Are</a>
            </div>
          </li>
          <li class="has-drop">
            <a href="#events">Events</a>
            <div class="nav-drop">
              <a href="#events">Catering</a>
              <a href="#events">Party Halls</a>
            </div>
          </li>
          <li><a href="#outlets">Outlets</a></li>
          <li><a href="#contact">Contact</a></li>
          <li><a href="#" id="nav-order" class="nav-order-btn">🛵 Order Online</a></li>
        </ul>
        <button class="hamburger" id="ham" onclick="toggleNav()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>

    <!-- ════ MOBILE NAV ════ -->
    <nav class="mobile-nav" id="mob-nav">
      <a href="#" onclick="closeNav()">Home</a>
      <div class="mob-section">Menu &amp; About</div>
      <a href="#menu" onclick="closeNav()">Menu</a>
      <a href="#about" onclick="closeNav()">Our Story</a>
      <div class="mob-section">Events</div>
      <a href="#events" onclick="closeNav()">Catering</a>
      <a href="#events" onclick="closeNav()">Party Halls</a>
      <div class="mob-section">Find Us</div>
      <a href="#outlets" onclick="closeNav()">Our Outlets</a>
      <a href="#contact" onclick="closeNav()">Contact Us</a>
      <a href="#" id="mob-order" class="mob-order" onclick="closeNav()">🛵 Order Online</a>
    </nav>

    <!-- ════ HERO SLIDER ════ -->
    <section id="hero">
      <div class="slides-wrap" id="slides">
        <div class="slide act">
          <div class="slide-bg" style="background-image:url('images/hero1.jpg'),linear-gradient(135deg,#1a0500 0%,#8b1a1a 100%)"></div>
          <div class="slide-ov"></div>
          <div class="slide-body">
            <div class="slide-inner">
              <span class="tag slide-tag" id="s0tag"></span>
              <h1>Welcome to <em id="s0em"></em></h1>
              <p id="s0p"></p>
              <div class="slide-btns">
                <a href="#menu" class="btn btn-gold">Explore Menu</a>
                <a href="#contact" class="btn btn-outline">Reserve Table</a>
              </div>
            </div>
          </div>
        </div>
        <div class="slide">
          <div class="slide-bg" style="background-image:url('images/hero2.jpg'),linear-gradient(135deg,#2a0500 0%,#1a0900 100%)"></div>
          <div class="slide-ov"></div>
          <div class="slide-body">
            <div class="slide-inner">
              <span class="tag slide-tag" id="s1tag"></span>
              <h1><em id="s1em"></em><span id="s1rest"></span></h1>
              <p id="s1p"></p>
              <div class="slide-btns">
                <a href="#menu" class="btn btn-gold">View Menu</a>
                <a href="#about" class="btn btn-outline">Our Story</a>
              </div>
            </div>
          </div>
        </div>
        <div class="slide">
          <div class="slide-bg" style="background-image:url('images/hero3.jpg'),linear-gradient(135deg,#0a0500 0%,#1a0900 100%)"></div>
          <div class="slide-ov"></div>
          <div class="slide-body">
            <div class="slide-inner">
              <span class="tag slide-tag" id="s2tag"></span>
              <h1><em id="s2em"></em><span id="s2rest"></span></h1>
              <p id="s2p"></p>
              <div class="slide-btns">
                <a href="#events" class="btn btn-gold">Book Event</a>
                <a href="#outlets" class="btn btn-outline">Find Outlets</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button class="slide-ctrl prev-btn" onclick="prevSlide()">&#8592;</button>
      <button class="slide-ctrl next-btn" onclick="nextSlide()">&#8594;</button>
      <div class="slide-dots" id="sdots"></div>
    </section>

    <!-- ════ RIBBON ════ -->
    <div class="ribbon">
      <div class="ribbon-inner">
        <div class="rib-item"><span class="rib-icon">🕐</span><div><span class="rib-lbl">Open Hours</span><span class="rib-val" id="rib-h">-</span></div></div>
        <div class="rib-item"><span class="rib-icon">📍</span><div><span class="rib-lbl">Outlets</span><span class="rib-val" id="rib-o">-</span></div></div>
        <div class="rib-item"><span class="rib-icon">📞</span><div><span class="rib-lbl">Call Us</span><span class="rib-val" id="rib-p">-</span></div></div>
        <div class="rib-item"><span class="rib-icon">🏆</span><div><span class="rib-lbl">Recognition</span><span class="rib-val" id="rib-a">-</span></div></div>
      </div>
    </div>

    <!-- ════ ABOUT ════ -->
    <section id="about">
      <div class="container">
        <div class="about-grid">
          <div class="about-imgs rev">
            <img src="images/about-main.jpg" alt="Restaurant" class="about-main-img"
              onerror="this.style.display='none';document.getElementById('ab-ph').style.display='flex'"/>
            <div class="about-main-ph" id="ab-ph">🍛</div>
            <img src="images/about-float.jpg" alt="Kitchen" class="about-float-img"
              onerror="this.style.display='none'"/>
            <div class="about-badge">
              <span class="n" id="ab-yr">5+</span>
              <span class="l">Years of<br/>Excellence</span>
            </div>
          </div>
          <div class="about-text rev rev-d2">
            <span class="tag">Our Story</span>
            <h2 id="ab-title">Quality, Taste &amp; Value</h2>
            <div class="gold-bar"></div>
            <p id="ab-p1"></p>
            <p id="ab-p2"></p>
            <div class="about-stats">
              <div class="stat"><span class="n" id="st1n">-</span><span class="l" id="st1l">-</span></div>
              <div class="stat"><span class="n" id="st2n">-</span><span class="l" id="st2l">-</span></div>
              <div class="stat"><span class="n" id="st3n">-</span><span class="l" id="st3l">-</span></div>
            </div>
            <a href="#menu" class="btn btn-red">Explore Our Menu</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ WHY US ════ -->
    <section class="why">
      <div class="container">
        <div class="rev" style="text-align:center">
          <span class="tag">Why Choose Us</span>
          <h2>Our Promise to You</h2>
          <div class="gold-bar c"></div>
        </div>
        <div class="why-grid" id="why-grid"></div>
      </div>
    </section>

    <!-- ════ MENU ════ -->
    <section id="menu">
      <div class="container">
        <div class="menu-hdr rev">
          <span class="tag">What We Serve</span>
          <h2>Our Signature Menu</h2>
          <div class="gold-bar c"></div>
          <p id="menu-sub">Live from our Google Sheet — add or edit dishes anytime</p>
        </div>
        <div class="sheet-status demo" id="sheet-status">
          <span class="dot"></span>
          <span id="sheet-status-txt">Connecting to Google Sheet…</span>
        </div>
        <div id="menu-area">
          <div class="menu-loading" id="menu-loading">
            <div class="spinner"></div>
            <p>Loading menu…</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ EVENTS ════ -->
    <section id="events">
      <div class="container">
        <div class="rev" style="text-align:center">
          <span class="tag">Celebrations &amp; Catering</span>
          <h2>Host Your Next Event With Us</h2>
          <div class="gold-bar c"></div>
          <p style="max-width:500px;margin:.4rem auto 0">Premium venues and full-service catering for every occasion.</p>
        </div>
        <div class="events-grid rev" id="events-grid"></div>
      </div>
    </section>

    <!-- ════ OUTLETS ════ -->
    <section id="outlets">
      <div class="container">
        <div class="rev" style="text-align:center">
          <span class="tag" style="color:var(--gold2)">Find Us</span>
          <h2 style="color:#fff">Our Outlets</h2>
          <div class="gold-bar c"></div>
        </div>
        <div class="outlets-grid rev" id="outlets-grid"></div>
      </div>
    </section>

    <!-- ════ TESTIMONIALS ════ -->
    <section id="testi">
      <div class="container">
        <div class="rev" style="text-align:center">
          <span class="tag">Guest Reviews</span>
          <h2>What Our Guests Say</h2>
          <div class="gold-bar c"></div>
        </div>
        <div class="testi-grid rev" id="testi-grid"></div>
      </div>
    </section>

    <!-- ════ CONTACT ════ -->
    <section id="contact">
      <div class="container">
        <div class="contact-grid">
          <div class="rev">
            <span class="tag">Reach Us</span>
            <h2>Visit or Reserve a Table</h2>
            <div class="gold-bar"></div>
            <div id="c-details"></div>
          </div>
          <div class="rev rev-d2">
            <div class="res-form">
              <h3>Book a Table</h3>
              <p style="margin-bottom:1rem;font-size:.88rem">We'll confirm your reservation shortly.</p>
              <div class="f-row">
                <div class="f-g"><label>Your Name</label><input type="text" id="fn" placeholder="Your Name"/></div>
                <div class="f-g"><label>Phone</label><input type="tel" id="fp" placeholder="+91 98765 43210"/></div>
              </div>
              <div class="f-row">
                <div class="f-g"><label>Date</label><input type="date" id="fd"/></div>
                <div class="f-g"><label>Guests</label>
                  <select id="fg">
                    <option>1 person</option>
                    <option>2 people</option>
                    <option selected>4 people</option>
                    <option>6 people</option>
                    <option>8+ people</option>
                  </select>
                </div>
              </div>
              <div class="f-g">
                <label>Special Request</label>
                <textarea id="fm" placeholder="Anniversary, dietary needs…"></textarea>
              </div>
              <button class="btn btn-red"
                style="width:100%;justify-content:center;padding:1rem"
                onclick="submitRes()">✓ Confirm Reservation</button>
              <div class="form-ok" id="form-ok">✅ Thank you! We'll confirm your table soon.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════ FOOTER ════ -->
    <footer>
      <div class="container">
        <div class="foot-top">
          <div class="foot-brand">
            <strong id="ft-name">Restaurant</strong>
            <p id="ft-tag">Serving with love.</p>
            <div class="foot-socs" id="ft-soc"></div>
          </div>
          <div class="foot-col">
            <h4>Navigate</h4>
            <ul>
              <li><a href="#">Home</a></li>
              <li><a href="#menu">Menu</a></li>
              <li><a href="#about">Our Story</a></li>
              <li><a href="#events">Events</a></li>
              <li><a href="#outlets">Outlets</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div class="foot-col">
            <h4>Hours</h4>
            <p id="ft-hrs"></p>
          </div>
          <div class="foot-col">
            <h4>Contact</h4>
            <p id="ft-ct"></p>
          </div>
        </div>
        <div class="foot-bottom">
          <span id="ft-copy">© 2025 Restaurant</span>
          <span>Designed with ♥</span>
        </div>
      </div>
    </footer>

    <!-- Floating order button -->
    <a href="#" class="float-order" id="float-order" title="Order Online">🛵</a>

  `;
}

/* ═══════════════════════════════════════════════
   4. BOOT — populates all dynamic content
═══════════════════════════════════════════════ */
function boot() {
  /* topbar */
  var tbp = document.getElementById('tb-phone');
  tbp.textContent = CONFIG.phone;
  tbp.href = 'tel:' + CONFIG.phone;
  var tbe = document.getElementById('tb-email');
  tbe.textContent = CONFIG.email;
  tbe.href = 'mailto:' + CONFIG.email;
  buildSocials('tb-soc', true);

  /* nav */
  document.getElementById('nav-name').textContent  = CONFIG.name;
  document.getElementById('nav-since').textContent = 'Since ' + CONFIG.since;
  document.getElementById('nav-order').href = CONFIG.orderLink;
  document.getElementById('mob-order').href = CONFIG.orderLink;

  /* hero — all 3 slides from config */
  document.getElementById('s0tag').textContent  = CONFIG.slide0Tag;
  document.getElementById('s0em').textContent   = CONFIG.slide0Em;
  document.getElementById('s0p').textContent    = CONFIG.slide0P;
  document.getElementById('s1tag').textContent  = CONFIG.slide1Tag;
  document.getElementById('s1em').textContent   = CONFIG.slide1Em;
  document.getElementById('s1rest').textContent = CONFIG.slide1Rest;
  document.getElementById('s1p').textContent    = CONFIG.slide1P;
  document.getElementById('s2tag').textContent  = CONFIG.slide2Tag;
  document.getElementById('s2em').textContent   = CONFIG.slide2Em;
  document.getElementById('s2rest').textContent = CONFIG.slide2Rest;
  document.getElementById('s2p').textContent    = CONFIG.slide2P;

  /* ribbon */
  document.getElementById('rib-h').textContent = CONFIG.hoursShort;
  document.getElementById('rib-o').textContent = CONFIG.outlets.length + ' Location' + (CONFIG.outlets.length !== 1 ? 's' : '');
  document.getElementById('rib-p').textContent = CONFIG.phone;
  document.getElementById('rib-a').textContent = CONFIG.award;

  /* about */
  document.getElementById('ab-yr').textContent    = CONFIG.abYears;
  document.getElementById('ab-title').textContent = CONFIG.abTitle;
  document.getElementById('ab-p1').textContent    = CONFIG.abP1;
  document.getElementById('ab-p2').textContent    = CONFIG.abP2;
  CONFIG.stats.forEach(function (s, i) {
    document.getElementById('st' + (i + 1) + 'n').textContent = s.n;
    document.getElementById('st' + (i + 1) + 'l').textContent = s.l;
  });

  /* why us */
  var wg = document.getElementById('why-grid');
  CONFIG.whyUs.forEach(function (w, i) {
    var d = document.createElement('div');
    d.className = 'why-card rev rev-d' + Math.min(i, 3);
    d.innerHTML = '<div class="ic">' + w.ic + '</div><h3>' + w.title + '</h3><p>' + w.desc + '</p>';
    wg.appendChild(d);
  });

  /* events */
  var eg = document.getElementById('events-grid');
  CONFIG.events.forEach(function (ev) {
    var hasImg = ev.image && ev.image.length > 0;
    eg.innerHTML +=
      '<div class="ev-card">'
      + '<div class="ev-bg" style="background-image:url(\'' + (ev.image || '') + '\')"></div>'
      + '<div class="ev-ph"' + (hasImg ? ' style="display:none"' : '') + '>' + ev.emoji + '</div>'
      + '<div class="ev-ov"></div>'
      + '<div class="ev-body">'
      + '<h3>' + ev.title + '</h3>'
      + '<p>' + ev.desc + '</p>'
      + '<a href="' + ev.href + '" class="btn btn-gold">' + ev.btn + '</a>'
      + '</div></div>';
  });

  /* outlets */
  var og = document.getElementById('outlets-grid');
  CONFIG.outlets.forEach(function (o) {
    og.innerHTML +=
      '<div class="out-card rev">'
      + '<h3>📍 ' + o.name + '</h3>'
      + '<div class="out-row"><span class="ic">🏠</span><p>' + o.address.replace(/\n/g, '<br>') + '</p></div>'
      + '<div class="out-row"><span class="ic">📞</span><a href="tel:' + o.phone + '">' + o.phone + '</a></div>'
      + '<div class="out-row"><span class="ic">🗺️</span><a href="' + o.map + '" target="_blank" rel="noopener">Get Directions ↗</a></div>'
      + '</div>';
  });

  /* testimonials */
  var tg = document.getElementById('testi-grid');
  CONFIG.testimonials.forEach(function (t) {
    tg.innerHTML +=
      '<div class="t-card rev">'
      + '<div class="stars">' + '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars) + '</div>'
      + '<p>"' + t.review + '"</p>'
      + '<div class="t-auth">'
      + '<div class="t-av">' + t.name[0] + '</div>'
      + '<div><div class="t-name">' + t.name + '</div><div class="t-date">' + t.date + '</div></div>'
      + '</div></div>';
  });

  /* contact */
  document.getElementById('c-details').innerHTML =
    '<div class="c-row"><div class="c-ic">📍</div><div><span class="c-lbl">Main Outlet</span><span class="c-val">' + CONFIG.outlets[0].address.replace(/\n/g, '<br>') + '</span></div></div>'
    + '<div class="c-row"><div class="c-ic">📞</div><div><span class="c-lbl">Phone</span><span class="c-val"><a href="tel:' + CONFIG.phone + '">' + CONFIG.phone + '</a></span></div></div>'
    + '<div class="c-row"><div class="c-ic">✉️</div><div><span class="c-lbl">Email</span><span class="c-val"><a href="mailto:' + CONFIG.email + '">' + CONFIG.email + '</a></span></div></div>'
    + '<div class="c-row"><div class="c-ic">🕐</div><div><span class="c-lbl">Hours</span><span class="c-val">' + CONFIG.hoursLong.replace(/\n/g, '<br>') + '</span></div></div>';

  /* footer */
  document.getElementById('ft-name').textContent = CONFIG.name;
  document.getElementById('ft-tag').textContent  = CONFIG.tagline;
  document.getElementById('ft-hrs').innerHTML    = CONFIG.hoursLong.replace(/\n/g, '<br>');
  document.getElementById('ft-ct').innerHTML     = CONFIG.phone + '<br>' + CONFIG.email;
  document.getElementById('ft-copy').textContent = '© ' + new Date().getFullYear() + ' ' + CONFIG.name + '. All rights reserved.';
  buildSocials('ft-soc', false);

  /* float order */
  document.getElementById('float-order').href = CONFIG.orderLink;

  /* slider */
  buildDots(3);
  sTimer = setInterval(nextSlide, 5000);

  /* menu */
  loadMenu();
}

/* ═══════════════════════════════════════════════
   5. SOCIALS
═══════════════════════════════════════════════ */
function buildSocials(elId, small) {
  var el = document.getElementById(elId);
  if (!el) return;
  var icons = { instagram: '📷', facebook: '📘', whatsapp: '💬', youtube: '▶️', zomato: '🍽️', swiggy: '🛵' };
  Object.entries(CONFIG.socials).forEach(function ([k, v]) {
    if (!v) return;
    var a = document.createElement('a');
    a.href = v;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = small ? '' : 'f-soc';
    a.setAttribute('aria-label', k);
    a.innerHTML = icons[k] || '🔗';
    el.appendChild(a);
  });
}

/* ═══════════════════════════════════════════════
   6. MENU — Google Sheets CSV loader
═══════════════════════════════════════════════ */
async function loadMenu() {
  if (!CONFIG.sheetCSV) {
    setStatus('demo', '⚠️ Demo mode — set sheets.menuCSV in config.js to go live');
    renderMenu(DEMO);
    return;
  }

  setStatus('demo', '⏳ Connecting to Google Sheet…');

  try {
    var res = await fetch(CONFIG.sheetCSV);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var csv  = await res.text();
    var rows = parseCSV(csv);
    if (!rows.length) throw new Error('Sheet empty or wrong column headers');
    setStatus('live', '✅ Live — ' + rows.length + ' dishes loaded');
    renderMenu(rows);
  } catch (err) {
    console.error('Sheet load error:', err);
    setStatus('err', '⚠️ Sheet error (' + err.message + ') — showing demo menu');
    renderMenu(DEMO);
  }
}

function setStatus(type, msg) {
  var el = document.getElementById('sheet-status');
  if (!el) return;
  el.className = 'sheet-status ' + type;
  document.getElementById('sheet-status-txt').textContent = msg;
}

function parseCSV(text) {
  var lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];
  var headers = splitCSVLine(lines[0]);
  return lines.slice(1)
    .map(function (line) {
      var vals = splitCSVLine(line);
      var obj  = {};
      headers.forEach(function (h, i) { obj[h.trim()] = (vals[i] || '').trim(); });
      return obj;
    })
    .filter(function (r) { return r.Name && r.Name.length > 0; });
}

function splitCSVLine(line) {
  var vals = [], cur = '', inQ = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"')            { inQ = !inQ; }
    else if (c === ',' && !inQ) { vals.push(cur.replace(/^"|"$/g, '')); cur = ''; }
    else                      { cur += c; }
  }
  vals.push(cur.replace(/^"|"$/g, ''));
  return vals;
}

function renderMenu(items) {
  var area = document.getElementById('menu-area');
  var cats = [...new Set(items.map(function (r) { return r.Category; }).filter(Boolean))];

  var html = '<div class="cat-tabs">';
  cats.forEach(function (c, i) {
    html += '<button class="cat-tab' + (i === 0 ? ' on' : '') + '" onclick="filterCat(\'' + c + '\',this)">' + c + '</button>';
  });
  html += '</div><div class="menu-grid" id="m-grid">';

  items.forEach(function (item) {
    var avail    = (item.Available || 'yes').toLowerCase() !== 'no';
    var isVeg    = (item.Type || 'Veg').toLowerCase() === 'veg';
    var hasImg   = item.ImageURL && item.ImageURL.trim().length > 0;
    var badgeCls = item.Badge === 'Bestseller' ? 'badge-best' :
                   item.Badge === 'New'         ? 'badge-new'  : 'badge-chef';

    var imgHTML = hasImg
      ? '<div class="m-img-wrap"><img src="' + item.ImageURL + '" alt="' + item.Name + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"/><div class="m-img-ph" style="display:none">' + (isVeg ? '🥗' : '🍗') + '</div></div>'
      : '<div class="m-img-wrap"><div class="m-img-ph">' + (isVeg ? '🥗' : '🍗') + '</div></div>';

    html +=
      '<div class="m-card' + (avail ? '' : ' unavail') + '" data-cat="' + item.Category + '">'
      + (item.Badge ? '<div class="m-badge ' + badgeCls + '">' + item.Badge + '</div>' : '')
      + imgHTML
      + '<div class="m-body">'
      + '<div class="m-type"><span class="' + (isVeg ? 'dot-v' : 'dot-nv') + '">●</span> ' + (item.Type || 'Veg') + '</div>'
      + '<h3>' + item.Name + '</h3>'
      + '<p>' + (item.Description || '') + '</p>'
      + '<div class="m-price">₹ ' + item.Price + '</div>'
      + '</div></div>';
  });

  html += '</div>';
  area.innerHTML = html;
  reObserve();
}

function filterCat(cat, btn) {
  document.querySelectorAll('.cat-tab').forEach(function (b) { b.classList.remove('on'); });
  btn.classList.add('on');
  document.querySelectorAll('.m-card').forEach(function (c) {
    c.style.display = c.dataset.cat === cat ? '' : 'none';
  });
}

/* ═══════════════════════════════════════════════
   7. SLIDER
═══════════════════════════════════════════════ */
var sIdx = 0, sTotal = 3, sTimer;

function buildDots(n) {
  var el = document.getElementById('sdots');
  if (!el) return;
  for (var i = 0; i < n; i++) {
    (function (idx) {
      var b = document.createElement('button');
      b.className = 'sdot' + (idx === 0 ? ' act' : '');
      b.setAttribute('aria-label', 'Slide ' + (idx + 1));
      b.onclick = function () { goSlide(idx); };
      el.appendChild(b);
    })(i);
  }
}

function goSlide(n) {
  document.querySelectorAll('.slide').forEach(function (s, i) { s.classList.toggle('act', i === n); });
  document.querySelectorAll('.sdot').forEach(function (d, i)  { d.classList.toggle('act', i === n); });
  var sw = document.getElementById('slides');
  if (sw) sw.style.transform = 'translateX(-' + (n * 100) + '%)';
  sIdx = n;
}

function nextSlide() { goSlide((sIdx + 1) % sTotal); resetTimer(); }
function prevSlide() { goSlide((sIdx - 1 + sTotal) % sTotal); resetTimer(); }
function resetTimer() { clearInterval(sTimer); sTimer = setInterval(nextSlide, 5000); }

/* ═══════════════════════════════════════════════
   8. MOBILE NAV
═══════════════════════════════════════════════ */
function toggleNav() {
  document.getElementById('mob-nav').classList.toggle('open');
  document.getElementById('ham').classList.toggle('open');
}
function closeNav() {
  document.getElementById('mob-nav').classList.remove('open');
  document.getElementById('ham').classList.remove('open');
}

/* ═══════════════════════════════════════════════
   9. SCROLL REVEAL
═══════════════════════════════════════════════ */
function reObserve() {
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.rev:not(.in)').forEach(function (el) { obs.observe(el); });
}

/* ═══════════════════════════════════════════════
   10. RESERVATION FORM
═══════════════════════════════════════════════ */
async function submitRes() {
  var name  = document.getElementById('fn').value.trim();
  var phone = document.getElementById('fp').value.trim();
  var date  = document.getElementById('fd').value;

  if (!name || !phone || !date) {
    alert('Please fill Name, Phone and Date.');
    return;
  }

  var data = {
    name:      name,
    phone:     phone,
    date:      date,
    guests:    document.getElementById('fg').value,
    message:   document.getElementById('fm').value,
    timestamp: new Date().toISOString(),
  };

  if (CONFIG.formURL) {
    await fetch(CONFIG.formURL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }).catch(function () {});
  }

  document.getElementById('form-ok').style.display = 'block';
  ['fn', 'fp', 'fd', 'fm'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
}

/* ═══════════════════════════════════════════════
   INIT  (runs once on page load)
═══════════════════════════════════════════════ */
injectHTML();   // 1. write all HTML to <body>
boot();         // 2. fill in client data, start slider, load menu
reObserve();    // 3. watch all .rev elements for scroll animation
