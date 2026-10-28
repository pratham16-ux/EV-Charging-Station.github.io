/* Stackly shared dashboard core: auth, data store, UI helpers, charts */
(function () {
  'use strict';
  var SD = window.SD = {};
  var AK = 'stacklyAuth', DK = 'stacklyDB', VER = 3, mem = null;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  SD.$ = $; SD.$$ = $$;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  SD.MON = MON;
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  SD.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  SD.inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ago(n) { var d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
  SD.today = function () { return ymd(new Date()); };
  SD.ago = ago;
  SD.fd = function (s) { var p = s.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; };
  SD.months = function (n) {
    var out = [], now = new Date();
    for (var i = n - 1; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push({ key: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: MON[d.getMonth()] }); }
    return out;
  };
  SD.rel = function (ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60); if (h < 24) return h + ' hr ago';
    return Math.floor(h / 24) + ' day' + (Math.floor(h / 24) > 1 ? 's' : '') + ' ago';
  };
  SD.initials = function (n) { return String(n || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); };
  SD.pill = function (s) {
    var m = { Pending: 'p-warn', Confirmed: 'p-info', Completed: 'p-ok', Cancelled: 'p-bad', Online: 'p-ok', Offline: 'p-mute', Active: 'p-ok', Blocked: 'p-bad' };
    return '<span class="pill ' + (m[s] || 'p-mute') + '">' + SD.esc(s) + '</span>';
  };
  var ICONS = {
    home: 'M3 11l9-8 9 8M5 10v10h14V10', bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    map: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
    wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
    logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9', bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    menu: 'M3 6h18M3 12h18M3 18h18', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21c0-4 3.5-6 8-6s8 2 8 6M17 3.5a4 4 0 0 1 0 7.5M23 21c0-3-2-5-5-5.7',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
    plus: 'M12 5v14M5 12h14', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
    eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', cart: 'M3 4h3l2.5 11h9L20 7H7'
  };
  SD.icon = function (n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>'; };
  SD.$$('[data-ic]').forEach(function (e) { e.innerHTML = SD.icon(e.getAttribute('data-ic')); });

  /* ---------- data store ---------- */
  function seed() {
    var T = 18, n = 1000, r = 7;
    function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    var stations = [
      { id: 'S01', name: 'Stackly Hub · NH48 Highway', area: 'Nelamangala, Bengaluru', type: 'DC Fast', power: '120 kW', bays: 8, online: true },
      { id: 'S02', name: 'Orbit Mall Charging Plaza', area: 'Whitefield, Bengaluru', type: 'DC Fast', power: '60 kW', bays: 6, online: true },
      { id: 'S03', name: 'Airport Express Terminal', area: 'Devanahalli, Bengaluru', type: 'DC Ultra', power: '150 kW', bays: 10, online: true },
      { id: 'S04', name: 'Central City Superhub', area: 'MG Road, Bengaluru', type: 'DC Fast', power: '90 kW', bays: 12, online: true },
      { id: 'S05', name: 'Green Residency Chargers', area: 'Koramangala, Bengaluru', type: 'AC', power: '22 kW', bays: 4, online: true },
      { id: 'S06', name: 'Depot One Fleet Terminal', area: 'Peenya, Bengaluru', type: 'AC', power: '50 kW', bays: 14, online: false }
    ];
    var users = [
      { id: 'CUST1024', name: 'Arjun Rao', email: 'arjun.rao@stackly.in', phone: '9845012345', vehicle: 'Tata Nexon EV', wallet: 2450, blocked: false, joined: ago(220) },
      { id: 'CUST1025', name: 'Meera Krishnan', email: 'meera.k@example.in', phone: '9886123456', vehicle: 'MG ZS EV', wallet: 1200, blocked: false, joined: ago(180) },
      { id: 'CUST1026', name: 'Sanjay Patel', email: 'sanjay.p@example.in', phone: '9740234567', vehicle: 'Hyundai Kona', wallet: 3100, blocked: false, joined: ago(150) },
      { id: 'CUST1027', name: 'Nisha Verma', email: 'nisha.v@example.in', phone: '9900345678', vehicle: 'Tata Tigor EV', wallet: 560, blocked: false, joined: ago(95) },
      { id: 'CUST1028', name: 'Karthik Iyer', email: 'karthik.i@example.in', phone: '9448456789', vehicle: 'Mahindra XUV400', wallet: 1800, blocked: false, joined: ago(60) },
      { id: 'CUST1029', name: 'Divya Nair', email: 'divya.n@example.in', phone: '9591567890', vehicle: 'BYD Atto 3', wallet: 4200, blocked: false, joined: ago(30) }
    ];
    var bookings = [];
    function add(u, s, d, t, k, st) { bookings.push({ id: 'BK-' + (++n), userId: u, stationId: s, date: d, time: t, kwh: k, amount: k * T, status: st }); }
    [[3, 'S01', 32], [19, 'S02', 24], [34, 'S04', 41], [52, 'S01', 18], [68, 'S05', 36], [90, 'S03', 28], [112, 'S04', 45], [140, 'S02', 22]].forEach(function (x) { add('CUST1024', x[1], ago(x[0]), '10:30', x[2], 'Completed'); });
    add('CUST1024', 'S04', ago(-2), '18:30', 26, 'Confirmed'); add('CUST1024', 'S03', ago(-5), '09:00', 30, 'Pending');
    var sids = ['S01', 'S02', 'S03', 'S04', 'S05'];
    for (var i = 0; i < 46; i++) {
      add(users[1 + Math.floor(rnd() * 5)].id, sids[Math.floor(rnd() * 5)], ago(Math.floor(rnd() * 58)), pad(7 + Math.floor(rnd() * 14)) + ':' + (rnd() > .5 ? '30' : '00'), 10 + Math.floor(rnd() * 40), 'Completed');
    }
    add('CUST1025', 'S02', ago(-1), '11:00', 22, 'Pending'); add('CUST1026', 'S01', ago(-1), '15:30', 35, 'Pending');
    add('CUST1027', 'S05', ago(-3), '20:00', 18, 'Confirmed'); add('CUST1028', 'S04', ago(-4), '08:30', 40, 'Pending');
    add('CUST1029', 'S03', ago(-2), '13:00', 28, 'Confirmed'); add('CUST1026', 'S02', ago(5), '19:00', 20, 'Cancelled');
    var txns = [
      { id: 'T1', userId: 'CUST1024', type: 'credit', amt: 2000, note: 'Wallet top-up · UPI', date: ago(60) },
      { id: 'T2', userId: 'CUST1024', type: 'debit', amt: 576, note: 'Charging · BK-1001', date: ago(3) },
      { id: 'T3', userId: 'CUST1024', type: 'credit', amt: 1500, note: 'Wallet top-up · Card', date: ago(20) },
      { id: 'T4', userId: 'CUST1024', type: 'debit', amt: 432, note: 'Charging · BK-1002', date: ago(19) },
      { id: 'T5', userId: 'CUST1024', type: 'credit', amt: 1000, note: 'Wallet top-up · UPI', date: ago(8) }
    ];
    var pend = bookings.filter(function (b) { return b.status === 'Pending'; }).length;
    var notifs = [
      { id: 'N1', to: 'CUST1024', text: 'Your booking BK-1009 at Central City Superhub is confirmed.', ts: Date.now() - 3600e3, read: false },
      { id: 'N2', to: 'CUST1024', text: 'Wallet top-up of ₹1,000 was successful.', ts: Date.now() - 86400e3 * 2, read: false },
      { id: 'N3', to: 'admin', text: pend + ' bookings are waiting for approval.', ts: Date.now() - 1800e3, read: false },
      { id: 'N4', to: 'admin', text: 'Depot One Fleet Terminal is offline for maintenance.', ts: Date.now() - 86400e3, read: false }
    ];
    return {
      v: VER, settings: { tariff: T, maintenance: false }, stations: stations, users: users, bookings: bookings, txns: txns, notifs: notifs,
      creds: { customer: { id: 'CUST1024', pw: 'Charge@123' }, admin: { id: 'ADMIN01', pw: 'Admin@123' } },
      admin: { name: 'Meghna Kapoor', email: 'meghna@stackly.in' }
    };
  }
  SD.get = function () {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(DK)); } catch (e) { d = null; }
    if (!d) d = mem;
    if (!d || d.v !== VER) { d = seed(); SD.set(d); }
    return d;
  };
  SD.set = function (d) { mem = d; try { localStorage.setItem(DK, JSON.stringify(d)); } catch (e) { } };
  SD.reset = function () { SD.set(seed()); };
  SD.user = function (id) { return SD.get().users.filter(function (u) { return u.id === id; })[0]; };
  SD.station = function (id) { return SD.get().stations.filter(function (s) { return s.id === id; })[0]; };
  SD.notify = function (d, to, text) { d.notifs.unshift({ id: 'N' + Date.now() + Math.floor(Math.random() * 999), to: to, text: text, ts: Date.now(), read: false }); };
  SD.txn = function (d, uid, type, amt, note) { d.txns.unshift({ id: 'T' + Date.now() + Math.floor(Math.random() * 999), userId: uid, type: type, amt: amt, note: note, date: SD.today() }); };
  SD.nextBooking = function (d) { return 'BK-' + (d.bookings.reduce(function (m, b) { return Math.max(m, parseInt(b.id.slice(3), 10)); }, 1000) + 1); };
  /* cancel (refund to wallet). by: 'admin' | 'customer' */
  SD.cancelBooking = function (id, by) {
    var d = SD.get(), b = d.bookings.filter(function (x) { return x.id === id; })[0];
    if (!b || (b.status !== 'Pending' && b.status !== 'Confirmed')) return false;
    b.status = 'Cancelled';
    var u = d.users.filter(function (x) { return x.id === b.userId; })[0];
    if (u) { u.wallet += b.amount; SD.txn(d, u.id, 'credit', b.amount, 'Refund · ' + b.id); }
    if (by === 'admin') SD.notify(d, b.userId, 'Your booking ' + b.id + ' was cancelled by Stackly. ' + SD.inr(b.amount) + ' refunded to your wallet.');
    else SD.notify(d, 'admin', 'Booking ' + b.id + ' cancelled by ' + (u ? u.name : 'customer') + '.');
    SD.set(d); return b;
  };
  SD.setStatus = function (id, status) {
    var d = SD.get(), b = d.bookings.filter(function (x) { return x.id === id; })[0]; if (!b) return false;
    b.status = status;
    SD.notify(d, b.userId, 'Your booking ' + b.id + ' is now ' + status.toLowerCase() + '.');
    SD.set(d); return b;
  };

  /* ---------- validation ---------- */
  SD.v = {
    name: function (s) { return /^[A-Za-z][A-Za-z ]{1,15}$/.test(s.trim()); },
    email: function (s) { return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(s.trim()); },
    phone: function (s) { return /^[6-9]\d{9}$/.test(s.trim()); },
    pw: function (s) { return s.length >= 6 && /[A-Za-z]/.test(s) && /\d/.test(s); }
  };

  /* ---------- auth ---------- */
  SD.getAuth = function () { try { return JSON.parse(sessionStorage.getItem(AK)); } catch (e) { return null; } };
  SD.pages = { customer: 'customer-dashboard.html', admin: 'admin-dashboard.html' };
  /* customer password lives on the user record (sign-ups); the original demo customer keeps it in creds */
  SD.pwOf = function (d, u) { return u && u.pw != null ? u.pw : (u && u.id === d.creds.customer.id ? d.creds.customer.pw : null); };
  SD.setPw = function (d, uid, pw) {
    var u = d.users.filter(function (x) { return x.id === uid; })[0];
    if (u && (u.pw != null || uid !== d.creds.customer.id)) u.pw = pw; else d.creds.customer.pw = pw;
  };
  SD.login = function (role, id, pw) {
    var d = SD.get(), key = String(id).trim().toLowerCase(), bad = { ok: false, msg: 'Invalid login ID or password for this account type.' }, who, name;
    if (role === 'admin') {
      var c = d.creds.admin;
      if (!c || c.id.toLowerCase() !== key || c.pw !== pw) return bad;
      who = c.id; name = d.admin.name;
    } else if (role === 'customer') {
      /* customers can sign in with their Login ID or their email */
      var u = d.users.filter(function (x) { return x.id.toLowerCase() === key || String(x.email || '').toLowerCase() === key; })[0];
      if (!u || SD.pwOf(d, u) !== pw) return bad;
      if (u.blocked) return { ok: false, msg: 'This account is blocked. Please contact Stackly support.' };
      who = u.id; name = u.name;
    } else return bad;
    try { sessionStorage.setItem(AK, JSON.stringify({ id: who, role: role, name: name, at: Date.now() })); } catch (e) { return { ok: false, msg: 'Browser storage is disabled. Please enable it to sign in.' }; }
    return { ok: true, page: SD.pages[role] };
  };
  /* create a new customer account. f = {name,email,phone,vehicle,pw} (already format-validated by the page) */
  SD.register = function (f) {
    try { localStorage.setItem('__stk', '1'); localStorage.removeItem('__stk'); } catch (e) { return { ok: false, msg: 'Browser storage is disabled. Please enable it to create an account.' }; }
    var d = SD.get(), em = f.email.trim().toLowerCase();
    if (d.users.some(function (u) { return String(u.email || '').toLowerCase() === em; })) return { ok: false, field: 'email', msg: 'An account with this email already exists. Try signing in.' };
    if (d.users.some(function (u) { return u.phone === f.phone; })) return { ok: false, field: 'phone', msg: 'This mobile number is already registered.' };
    var n = d.users.reduce(function (m, u) { var x = /^CUST(\d+)$/i.exec(u.id); return x ? Math.max(m, +x[1]) : m; }, 1029) + 1, id = 'CUST' + n;
    d.users.push({ id: id, name: f.name.trim(), email: f.email.trim(), phone: f.phone, vehicle: (f.vehicle || '').trim(), wallet: 0, blocked: false, joined: SD.today(), pw: f.pw });
    SD.notify(d, 'admin', 'New customer ' + f.name.trim() + ' (' + id + ') just registered.');
    SD.notify(d, id, 'Welcome to Stackly, ' + f.name.trim().split(/\s+/)[0] + '! Add money to your wallet to book your first charging slot.');
    SD.set(d);
    return { ok: true, id: id };
  };
  SD.logout = function () { try { sessionStorage.removeItem(AK); } catch (e) { } location.replace('login.html'); };

  /* ---------- UI helpers ---------- */
  SD.toast = function (m, t) {
    var box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var e = document.createElement('div'); e.className = 'toast ' + (t || ''); e.textContent = m; box.appendChild(e);
    setTimeout(function () { e.remove(); }, 3600);
  };
  SD.modal = function (title, html, buttons, onOpen) {
    var ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>' + SD.esc(title) + '</h3><div class="mb">' + html + '</div><div class="mf"></div></div>';
    var mf = $('.mf', ov);
    function close() { ov.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    (buttons || [{ label: 'Close' }]).forEach(function (b) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn ' + (b.cls || 'btn-ghost'); bt.textContent = b.label;
      bt.onclick = function () { if (b.fn && b.fn(ov) === false) return; close(); };
      mf.appendChild(bt);
    });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', esc); document.body.appendChild(ov);
    var f = $('input,select', ov); if (f) setTimeout(function () { f.focus(); }, 50);
    if (onOpen) onOpen(ov);
    return ov;
  };
  SD.confirm = function (msg, label, cb, danger) {
    SD.modal('Please confirm', '<p style="color:var(--muted);margin-bottom:12px">' + SD.esc(msg) + '</p>', [{ label: 'Keep' }, { label: label || 'Yes, continue', cls: danger === false ? 'btn-primary' : 'btn-danger', fn: function () { cb(); } }]);
  };
  SD.download = function (name, text, type) {
    var b = new Blob([text], { type: type || 'text/plain' }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 300);
  };
  SD.csv = function (name, rows) {
    var s = rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    SD.download(name, '\ufeff' + s, 'text/csv;charset=utf-8'); SD.toast('Downloaded ' + name);
  };

  /* ---------- charts (canvas micro-library) ---------- */
  var charts = [];
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function nice(m) { if (m <= 0) return 10; var p = Math.pow(10, Math.floor(Math.log(m) / Math.LN10)), s = p / 2; return Math.ceil(m / s) * s; }
  function draw(c, k) {
    var cv = c.cv, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = w * dpr; cv.height = h * dpr;
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); c.fn(x, w, h, k);
  }
  function reg(cv, fn) {
    charts = charts.filter(function (c) { return document.body.contains(c.cv) && c.cv !== cv; });
    var c = { cv: cv, fn: fn }; charts.push(c);
    var t0 = null;
    (function step(t) { if (!t0) t0 = t; var k = Math.min((t - t0) / 700, 1); k = 1 - Math.pow(1 - k, 3); draw(c, k); if (k < 1) requestAnimationFrame(step); })(performance.now());
  }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { charts.forEach(function (c) { draw(c, 1); }); }, 120); });
  function axes(c, w, h, labels, mx, fmt, L, R, T, B) {
    var pw = w - L - R, ph = h - T - B;
    c.font = '11px Inter,Segoe UI,sans-serif'; c.fillStyle = css('--muted'); c.strokeStyle = css('--line-2'); c.lineWidth = 1; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (var i = 0; i <= 4; i++) { var y = T + ph - ph * i / 4; c.beginPath(); c.moveTo(L, y); c.lineTo(w - R, y); c.stroke(); c.fillText(fmt(mx * i / 4), L - 8, y); }
  }
  SD.line = function (cv, labels, vals, fmt) {
    fmt = fmt || function (v) { return Math.round(v); };
    reg(cv, function (c, w, h, k) {
      var L = 48, R = 14, T = 14, B = 30, pw = w - L - R, ph = h - T - B, mx = nice(Math.max.apply(null, vals.concat([1])));
      axes(c, w, h, labels, mx, fmt, L, R, T, B);
      var n = vals.length, pts = vals.map(function (v, i) { return { x: L + (n > 1 ? pw * i / (n - 1) : pw / 2), y: T + ph - ph * (v / mx) * k }; });
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = css('--muted');
      labels.forEach(function (lb, i) { if (lb) c.fillText(lb, pts[i].x, h - B + 10); });
      var ac = css('--accent'), g = c.createLinearGradient(0, T, 0, T + ph); g.addColorStop(0, 'rgba(45,226,176,.35)'); g.addColorStop(1, 'rgba(45,226,176,0)');
      c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
      c.lineTo(pts[n - 1].x, T + ph); c.lineTo(pts[0].x, T + ph); c.closePath(); c.fillStyle = g; c.fill();
      c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
      c.strokeStyle = ac; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
      if (n <= 12) pts.forEach(function (p) { c.beginPath(); c.arc(p.x, p.y, 4, 0, 6.283); c.fillStyle = css('--surface'); c.fill(); c.strokeStyle = ac; c.lineWidth = 2; c.stroke(); });
    });
  };
  SD.bars = function (cv, labels, vals, fmt) {
    fmt = fmt || function (v) { return Math.round(v); };
    reg(cv, function (c, w, h, k) {
      var L = 52, R = 14, T = 20, B = 30, pw = w - L - R, ph = h - T - B, n = vals.length, mx = nice(Math.max.apply(null, vals.concat([1])));
      axes(c, w, h, labels, mx, fmt, L, R, T, B);
      var slot = pw / n, bw = Math.min(slot * .56, 46);
      vals.forEach(function (v, i) {
        var bh = ph * (v / mx) * k, x = L + slot * i + (slot - bw) / 2, y = T + ph - bh;
        var g = c.createLinearGradient(0, y, 0, T + ph); g.addColorStop(0, css('--accent')); g.addColorStop(1, css('--gold'));
        c.fillStyle = g; c.beginPath(); c.moveTo(x, T + ph); c.lineTo(x, y + 6); c.quadraticCurveTo(x, y, x + 6, y); c.lineTo(x + bw - 6, y); c.quadraticCurveTo(x + bw, y, x + bw, y + 6); c.lineTo(x + bw, T + ph); c.closePath(); c.fill();
        c.fillStyle = css('--muted'); c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(labels[i], x + bw / 2, h - B + 10);
        if (n <= 8 && v > 0 && k > .9) { c.fillStyle = css('--text'); c.textBaseline = 'bottom'; c.fillText(fmt(v), x + bw / 2, y - 4); }
      });
    });
  };
  SD.donut = function (cv, items, center) {
    reg(cv, function (c, w, h, k) {
      var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8, ir = r * .64, tot = items.reduce(function (s, i) { return s + i.val; }, 0), a = -Math.PI / 2;
      if (!tot) { c.beginPath(); c.arc(cx, cy, r, 0, 6.283); c.arc(cx, cy, ir, 6.283, 0, true); c.fillStyle = css('--line-2'); c.fill(); }
      items.forEach(function (it) {
        var da = it.val / tot * 6.283 * k; if (!da) return;
        c.beginPath(); c.arc(cx, cy, r, a, a + da); c.arc(cx, cy, ir, a + da, a, true); c.closePath(); c.fillStyle = it.color; c.fill(); a += da;
      });
      c.fillStyle = css('--text'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 22px Sora,Segoe UI,sans-serif'; c.fillText(center != null ? center : tot, cx, cy - 6);
      c.font = '11px Inter,sans-serif'; c.fillStyle = css('--muted'); c.fillText('total', cx, cy + 14);
    });
  };

  /* ---------- dashboard shell ---------- */
  SD.init = function (role, views, titles) {
    var A = SD.getAuth();
    if (!A || A.role !== role) { location.replace('login.html'); return; }
    if (role === 'customer') { var u0 = SD.user(A.id); if (!u0 || u0.blocked) { SD.logout(); return; } }
    SD.auth = A; var cur = 'overview';
    SD.bindUser = function () {
      var a = SD.getAuth() || A;
      $$('[data-bind=lid]').forEach(function (e) { e.textContent = a.id; });
      $$('[data-bind=name]').forEach(function (e) { e.textContent = a.name; });
      $$('[data-bind=ini]').forEach(function (e) { e.textContent = SD.initials(a.name); });
      $$('[data-bind=time]').forEach(function (e) { e.textContent = 'Signed in ' + new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); });
    };
    SD.bindUser();
    var side = $('.side'), scrim = $('.scrim');
    function closeSide() { side.classList.remove('open'); scrim.classList.remove('show'); }
    $('#burger').onclick = function () { side.classList.add('open'); scrim.classList.add('show'); };
    scrim.onclick = closeSide;
    var tb = $('#themeBtn');
    tb.onclick = function () {
      var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('stacklyTheme', t); } catch (e) { }
      charts.forEach(function (c) { draw(c, 1); });
    };
    /* mobile: theme + sign out live in the sidebar (top-bar copies are hidden by CSS) */
    var sa = document.createElement('div'); sa.className = 'side-actions';
    sa.innerHTML = '<button type="button" class="btn btn-ghost" data-sa="theme">' + SD.icon('sun') + ' Switch theme</button><button type="button" class="btn btn-danger" data-sa="out">' + SD.icon('logout') + ' Sign out</button>';
    side.insertBefore(sa, $('.who', side));
    sa.onclick = function (e) { var b = e.target.closest('[data-sa]'); if (!b) return; if (b.getAttribute('data-sa') === 'theme') tb.click(); else { closeSide(); $('#logoutBtn').click(); } };
    $('#logoutBtn').onclick = function () { SD.confirm('Sign out of ' + SD.getAuth().id + '?', 'Sign out', SD.logout); };
    /* notifications */
    var bell = $('#bellBtn'), drop = $('#bellDrop'), target = role === 'admin' ? 'admin' : A.id;
    function mine() { return SD.get().notifs.filter(function (n) { return n.to === target; }); }
    SD.bell = function () {
      var list = mine(), un = list.filter(function (n) { return !n.read; }).length, dot = $('#bellDot');
      dot.textContent = un; dot.classList.toggle('hide', !un);
      drop.innerHTML = '<div class="ph" style="margin-bottom:8px"><h3 style="font-size:.95rem">Notifications</h3><button class="btn btn-ghost btn-sm" data-ra>Mark all read</button></div>' +
        (list.length ? list.slice(0, 8).map(function (n) { return '<div class="it ' + (n.read ? '' : 'new') + '" data-nid="' + n.id + '">' + SD.esc(n.text) + '<small>' + SD.rel(n.ts) + '</small></div>'; }).join('') : '<div class="empty">No notifications</div>');
    };
    bell.onclick = function (e) { e.stopPropagation(); drop.classList.toggle('hide'); };
    drop.onclick = function (e) {
      e.stopPropagation(); var d = SD.get();
      if (e.target.closest('[data-ra]')) { d.notifs.forEach(function (n) { if (n.to === target) n.read = true; }); SD.set(d); SD.bell(); return; }
      var it = e.target.closest('[data-nid]'); if (it) { d.notifs.forEach(function (n) { if (n.id === it.getAttribute('data-nid')) n.read = true; }); SD.set(d); SD.bell(); }
    };
    document.addEventListener('click', function () { drop.classList.add('hide'); });
    /* navigation */
    function show(n) {
      if (!views[n]) n = 'overview'; cur = n;
      $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'view-' + n); });
      $$('.nav [data-view]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === n); });
      $('#pageTitle').textContent = titles[n] || n;
      try { history.replaceState(null, '', '#' + n); } catch (e) { }
      views[n](); SD.bell(); closeSide(); window.scrollTo(0, 0);
    }
    SD.show = show; SD.refresh = function () { views[cur](); SD.bell(); };
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-view')); }); });
    window.addEventListener('storage', function () { SD.refresh(); });
    show((location.hash || '').slice(1) || 'overview');
  };
})();