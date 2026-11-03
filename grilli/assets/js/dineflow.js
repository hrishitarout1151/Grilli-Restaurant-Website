/* DineFlow client: talks to the Express API, runs the cart, auth state, menu loading and form handlers.
   The original script.js (slider, navbar, preloader) is untouched except for the reservation submit. */
(function () {
  'use strict';

  // Served by the Express server (any port): same origin. Opened from a file or Live Server: call the backend on 5050.
   var BASE = (location.protocol === 'file:' || location.port === '5500' || location.port === '5501')
    ? 'http://localhost:5050' : '';
  var CUR = '$';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var money = function (n) { return CUR + Number(n || 0).toFixed(2); };
  var fmtDate = function (iso) {
    var d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  var fmtDateTime = function (iso) {
    var d = new Date(iso);
    return isNaN(d) ? iso : fmtDate(iso) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  /* ---------- session ---------- */
  var session = {
    token: function () { return localStorage.getItem('df_token'); },
    user: function () { try { return JSON.parse(localStorage.getItem('df_user')); } catch (e) { return null; } },
    set: function (token, user) { localStorage.setItem('df_token', token); localStorage.setItem('df_user', JSON.stringify(user)); },
    clear: function () { localStorage.removeItem('df_token'); localStorage.removeItem('df_user'); }
  };

  /* ---------- api ---------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (session.token()) headers.Authorization = 'Bearer ' + session.token();
    return fetch(BASE + '/api' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          if (res.status === 401 && session.token()) session.clear();
          var e = new Error(data.error || 'Request failed');
          e.status = res.status;
          throw e;
        }
        return data;
      });
    }, function () {
      throw new Error('Cannot reach the server. Start it with: npm start');
    });
  }

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  function toast(msg, isErr) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'df-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isErr);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ---------- cart ---------- */
  var cart = {
    get: function () { try { return JSON.parse(localStorage.getItem('df_cart')) || []; } catch (e) { return []; } },
    save: function (c) { localStorage.setItem('df_cart', JSON.stringify(c)); document.dispatchEvent(new Event('dfcart')); },
    add: function (item) {
      var c = cart.get();
      var f = c.find(function (x) { return x.id === item.id; });
      if (f) f.qty = Math.min(20, f.qty + 1);
      else c.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 });
      cart.save(c);
    },
    setQty: function (id, qty) {
      var c = cart.get();
      var f = c.find(function (x) { return x.id === id; });
      if (!f) return;
      if (qty < 1) c = c.filter(function (x) { return x.id !== id; });
      else f.qty = Math.min(20, qty);
      cart.save(c);
    },
    remove: function (id) { cart.save(cart.get().filter(function (x) { return x.id !== id; })); },
    clear: function () { cart.save([]); },
    count: function () { return cart.get().reduce(function (s, x) { return s + x.qty; }, 0); },
    subtotal: function () { return cart.get().reduce(function (s, x) { return s + x.price * x.qty; }, 0); }
  };

  /* ---------- floating cart button ---------- */
  function mountCartButton() {
    if (document.body.dataset.noCartBtn !== undefined) return;
    var a = document.createElement('a');
    a.href = 'cart.html';
    a.className = 'df-cart-btn';
    a.setAttribute('aria-label', 'Open cart');
    a.innerHTML = '<ion-icon name="cart-outline" aria-hidden="true"></ion-icon><span>Cart</span><span class="df-cart-count">0</span>';
    document.body.appendChild(a);
    var upd = function () { a.querySelector('.df-cart-count').textContent = cart.count(); };
    document.addEventListener('dfcart', upd);
    window.addEventListener('storage', upd);
    upd();
  }

  /* ---------- nav link on the home page ---------- */
  function mountNavLink() {
    var list = document.querySelector('.navbar-list');
    if (!list) return;
    var u = session.user();
    var href = u ? (u.role === 'admin' ? 'admin.html' : 'account.html') : 'login.html';
    var label = u ? (u.role === 'admin' ? 'Admin' : 'My Account') : 'Login';
    var li = document.createElement('li');
    li.className = 'navbar-item';
    li.innerHTML = '<a href="' + href + '" class="navbar-link hover-underline"><div class="separator"></div><span class="span">' + label + '</span></a>';
    list.appendChild(li);
  }

  /* ---------- menu ---------- */
  var allItems = [];
  var activeCat = 'All';
  var query = '';

  function qtyOf(id) {
    var f = cart.get().find(function (x) { return x.id === id; });
    return f ? f.qty : 0;
  }

  // "Add to cart" turns into  [-]  2 added  [+]  once the dish is in the cart
  function ctlHTML(id) {
    var q = qtyOf(id);
    if (!q) {
      return '<button type="button" class="df-add" data-add="' + esc(id) + '"><ion-icon name="add-circle-outline" aria-hidden="true"></ion-icon>Add to cart</button>';
    }
    return '<div class="df-step"><button type="button" data-dec="' + esc(id) + '" aria-label="Remove one">&minus;</button>' +
      '<span class="df-step-n" aria-live="polite">' + q + ' added</span>' +
      '<button type="button" data-inc="' + esc(id) + '" aria-label="Add one more">+</button></div>';
  }

  function syncControls() {
    document.querySelectorAll('[data-ctl]').forEach(function (el) { el.innerHTML = ctlHTML(el.dataset.ctl); });
  }

  function cardHTML(i) {
    var img = i.image || './assets/images/menu-1.png';
    var badge = i.badge ? '<span class="badge label-1">' + esc(i.badge) + '</span>' : '';
    return '<li><div class="menu-card hover:card">' +
      '<figure class="card-banner img-holder" style="--width: 100; --height: 100;">' +
      '<img src="' + esc(img) + '" width="100" height="100" loading="lazy" alt="' + esc(i.name) + '" class="img-cover"></figure>' +
      '<div><div class="title-wrapper"><h3 class="title-3"><a href="#reservation" class="card-title">' + esc(i.name) + '</a></h3>' +
      badge + '<span class="span title-2">' + money(i.price) + '</span></div>' +
      '<p class="card-text label-1">' + esc(i.description) + '</p>' +
      '<div class="df-ctl" data-ctl="' + esc(i.id) + '">' + ctlHTML(i.id) + '</div>' +
      '</div></div></li>';
  }

  function renderMenu() {
    var ul = document.querySelector('#menu .grid-list');
    if (!ul) return;
    var s = query.toLowerCase();
    var items = allItems.filter(function (i) {
      return (activeCat === 'All' || i.category === activeCat) &&
        (!s || (i.name + ' ' + (i.description || '')).toLowerCase().indexOf(s) !== -1);
    });
    ul.innerHTML = items.length ? items.map(cardHTML).join('') : '<li class="df-empty">No dishes match your search.</li>';
  }

  function loadMenu() {
    var ul = document.querySelector('#menu .grid-list');
    if (!ul) return;
    api('/menu').then(function (d) {
      allItems = d.items;
      if (!allItems.length) return; // keep the static menu if the database is empty

      var cats = ['All'];
      allItems.forEach(function (i) { if (cats.indexOf(i.category) === -1) cats.push(i.category); });
      var tools = document.createElement('div');
      tools.className = 'df-menu-tools';
      tools.innerHTML = '<input type="search" class="df-search" placeholder="Search dishes" aria-label="Search dishes">' +
        cats.map(function (c, k) { return '<button type="button" class="df-chip' + (k === 0 ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
      ul.parentNode.insertBefore(tools, ul);

      tools.addEventListener('input', function (e) {
        if (e.target.classList.contains('df-search')) { query = e.target.value; renderMenu(); }
      });
      tools.addEventListener('click', function (e) {
        var b = e.target.closest('.df-chip');
        if (!b) return;
        activeCat = b.dataset.cat;
        tools.querySelectorAll('.df-chip').forEach(function (x) { x.classList.toggle('active', x === b); });
        renderMenu();
      });
      ul.addEventListener('click', function (e) {
        var b = e.target.closest('[data-add], [data-inc], [data-dec]');
        if (!b) return;
        var id = b.dataset.add || b.dataset.inc || b.dataset.dec;
        var item = allItems.find(function (x) { return x.id === id; });
        if (!item) return;
        if (b.dataset.dec) { cart.setQty(id, qtyOf(id) - 1); return; }
        if (qtyOf(id) >= 20) { toast('Maximum 20 of one dish per order', true); return; }
        var first = qtyOf(id) === 0;
        cart.add(item);
        if (first) toast(item.name + ' added to cart');
      });
      document.addEventListener('dfcart', syncControls);
      window.addEventListener('storage', syncControls);
      renderMenu();
    }).catch(function () { /* backend offline: the original static menu stays as it is */ });
  }

  /* ---------- forms on the home page ---------- */
  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = 'df-msg ' + (ok ? 'ok' : 'err');
  }

  function guestsFrom(value) { return parseInt(String(value), 10) || 1; }

  function reserve(form) {
    var data = new FormData(form);
    var timeSel = form.querySelector('select[name="time"]');
    var btn = form.querySelector('button[type="submit"]');
    var msg = form.querySelector('.df-msg');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'df-msg';
      msg.setAttribute('role', 'status');
      form.insertBefore(msg, btn);
    }
    btn.disabled = true;
    api('/reservations', {
      method: 'POST',
      body: {
        name: data.get('name'),
        phone: data.get('phone'),
        guests: guestsFrom(data.get('person')),
        date: data.get('reservation-date'),
        time: timeSel ? timeSel.options[timeSel.selectedIndex].textContent.replace(/\s*:\s*/g, ':').replace(/\s+/g, ' ').trim() : data.get('time'),
        message: data.get('message')
      }
    }).then(function (d) {
      setMsg(msg, 'Table requested. Booking no. ' + d.reservation.bookingNo + ' - we will confirm shortly.', true);
      form.reset();
      toast('Reservation received: ' + d.reservation.bookingNo);
    }).catch(function (e) {
      setMsg(msg, e.message, false);
    }).then(function () { btn.disabled = false; });
  }

  function mountForms() {
    var u = session.user();
    var rf = document.querySelector('.reservation-form form');
    if (rf && u) {
      if (rf.elements.name && !rf.elements.name.value) rf.elements.name.value = u.name || '';
      if (rf.elements.phone && !rf.elements.phone.value) rf.elements.phone.value = u.phone || '';
    }

    var cf = document.getElementById('df-contact-form');
    if (cf) {
      cf.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = cf.querySelector('.df-msg');
        var btn = cf.querySelector('button');
        btn.disabled = true;
        api('/contact', {
          method: 'POST',
          body: { name: cf.elements.cname.value, email: cf.elements.cemail.value, message: cf.elements.cmessage.value }
        }).then(function () {
          setMsg(msg, 'Message sent. We will get back to you soon.', true);
          cf.reset();
        }).catch(function (err) { setMsg(msg, err.message, false); })
          .then(function () { btn.disabled = false; });
      });
    }

    var sub = document.querySelector('form input[name="email_address"]');
    if (sub) {
      var sf = sub.closest('form');
      sf.addEventListener('submit', function (e) {
        e.preventDefault();
        api('/contact/subscribe', { method: 'POST', body: { email: sub.value } })
          .then(function () { toast('Subscribed. Thank you!'); sf.reset(); })
          .catch(function (err) { toast(err.message, true); });
      });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    mountCartButton();
    mountNavLink();
    mountForms();
    loadMenu();
  }

  window.DineFlow = {
    api: api, session: session, cart: cart, toast: toast, esc: esc, money: money,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, reserve: reserve, boot: boot, BASE: BASE
  };

  if (document.body && document.body.dataset.dfManual === undefined) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
