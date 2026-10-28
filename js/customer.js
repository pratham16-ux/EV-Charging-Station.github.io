/* Stackly customer dashboard */
(function () {
  'use strict';
  var $ = SD.$, esc = SD.esc, inr = SD.inr, A = SD.getAuth() || {};
  var st = { sQ: '', sT: 'all', bF: 'all', hQ: '', hM: 'all' };
  var titles = { overview: 'Overview', stations: 'Find Stations', bookings: 'My Bookings', history: 'Charging History', wallet: 'Wallet', profile: 'My Profile' };
  function me() { return SD.user(A.id) || {}; }
  function mine() { return SD.get().bookings.filter(function (b) { return b.userId === A.id; }); }
  function stName(id) { var s = SD.station(id); return s ? s.name : id; }
  function sum(a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); }
  function byDate(a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }
  function maint() { return SD.get().settings.maintenance; }
  function banner() { return maint() ? '<div class="banner">⚠ Network maintenance is in progress. New bookings are temporarily paused.</div>' : ''; }

  /* ---------- booking modal ---------- */
  function openBook(sid) {
    var d = SD.get();
    if (d.settings.maintenance) { SD.toast('Bookings are paused during network maintenance.', 'warn'); return; }
    var on = d.stations.filter(function (s) { return s.online; });
    if (!on.length) { SD.toast('No stations are online right now.', 'warn'); return; }
    var nw = new Date(), hh = nw.getHours() + 1, dDef = SD.today(), tDef = ('0' + hh).slice(-2) + ':00';
    if (hh > 22) { var tm = new Date(); tm.setDate(tm.getDate() + 1); dDef = tm.getFullYear() + '-' + ('0' + (tm.getMonth() + 1)).slice(-2) + '-' + ('0' + tm.getDate()).slice(-2); tDef = '09:00'; }
    var html = '<div class="field"><label>Station</label><select class="input" id="bkS">' + on.map(function (s) { return '<option value="' + s.id + '"' + (s.id === sid ? ' selected' : '') + '>' + esc(s.name) + ' · ' + esc(s.power) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row2"><div class="field"><label>Date</label><input type="date" class="input" id="bkD" min="' + SD.today() + '" value="' + dDef + '"></div><div class="field"><label>Time</label><input type="time" class="input" id="bkT" value="' + tDef + '"></div></div>' +
      '<div class="field"><label>Energy needed (kWh)</label><input type="number" class="input" id="bkK" min="5" max="80" step="1" value="20"></div>' +
      '<div class="li"><span>Estimated cost<br><small id="bkR"></small></span><b id="bkC"></b></div><div class="ferr" id="bkE" style="margin-top:8px"></div>';
    SD.modal('Book a charging slot', html, [{ label: 'Cancel' }, {
      label: 'Pay & confirm', cls: 'btn-primary', fn: function (ov) {
        var err = $('#bkE', ov), d2 = SD.get(), u = d2.users.filter(function (x) { return x.id === A.id; })[0];
        var s = d2.stations.filter(function (x) { return x.id === $('#bkS', ov).value; })[0], date = $('#bkD', ov).value, time = $('#bkT', ov).value, kwh = parseInt($('#bkK', ov).value, 10);
        var now = new Date(), nowT = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
        function bad(m) { err.textContent = m; return false; }
        if (d2.settings.maintenance) return bad('Bookings are paused during maintenance.');
        if (!s || !s.online) return bad('This station is offline. Please pick another.');
        if (!date || date < SD.today()) return bad('Please choose today or a future date.');
        if (!time) return bad('Please choose a time.');
        if (date === SD.today() && time < nowT) return bad('That time has already passed today.');
        if (!kwh || kwh < 5 || kwh > 80) return bad('Energy must be between 5 and 80 kWh.');
        var cost = kwh * d2.settings.tariff;
        if (u.wallet < cost) return bad('Wallet balance ' + inr(u.wallet) + ' is not enough. Add money first.');
        var id = SD.nextBooking(d2);
        d2.bookings.push({ id: id, userId: A.id, stationId: s.id, date: date, time: time, kwh: kwh, amount: cost, status: 'Pending' });
        u.wallet -= cost; SD.txn(d2, A.id, 'debit', cost, 'Charging · ' + id);
        SD.notify(d2, 'admin', 'New booking ' + id + ' from ' + u.name + ' at ' + s.name + '.');
        SD.notify(d2, A.id, 'Booking ' + id + ' placed. Waiting for confirmation.');
        SD.set(d2); SD.toast('Booking ' + id + ' placed. ' + inr(cost) + ' deducted.'); SD.refresh();
      }
    }], function (ov) {
      function upd() { var k = parseInt($('#bkK', ov).value, 10) || 0, t = SD.get().settings.tariff; $('#bkC', ov).textContent = inr(k * t); $('#bkR', ov).textContent = k + ' kWh × ₹' + t + '/kWh · Wallet ' + inr(me().wallet); }
      $('#bkK', ov).oninput = upd; upd();
    });
  }

  /* ---------- overview ---------- */
  function overview() {
    var el = $('#view-overview'), u = me(), bs = mine(), done = bs.filter(function (b) { return b.status === 'Completed'; });
    var up = bs.filter(function (b) { return b.status === 'Pending' || b.status === 'Confirmed'; }).sort(byDate);
    var ms = SD.months(6), vals = ms.map(function (m) { return sum(done.filter(function (b) { return b.date.slice(0, 7) === m.key; }), function (b) { return b.kwh; }); });
    var tx = SD.get().txns.filter(function (t) { return t.userId === A.id; }).slice(0, 4);
    var h = new Date().getHours(), gr = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    el.innerHTML = banner() +
      '<div class="panel hello"><div><h2>' + gr + ', ' + esc(u.name.split(' ')[0]) + ' 👋</h2><p>Login ID: <b style="color:var(--accent)">' + esc(A.id) + '</b> · ' + esc(u.vehicle || 'No vehicle added') + '</p></div>' +
      '<div class="acts"><button class="btn btn-primary" data-a="book">' + SD.icon('plus') + ' Book a slot</button><button class="btn btn-ghost" data-a="topup">' + SD.icon('wallet') + ' Add money</button><button class="btn btn-ghost" data-a="stations">' + SD.icon('map') + ' Find stations</button></div></div>' +
      '<div class="grid g4">' +
      stat('Wallet balance', inr(u.wallet), 'Available to spend') + stat('Sessions completed', done.length, 'All time') + stat('Energy used', sum(done, function (b) { return b.kwh; }) + ' kWh', 'All time') + stat('Total spent', inr(sum(done, function (b) { return b.amount; })), 'On completed sessions') + '</div>' +
      '<div class="grid g21"><div class="panel"><div class="ph"><div><h3>Energy used</h3><p>kWh charged per month · last 6 months</p></div></div><canvas class="cv" id="cvE"></canvas></div>' +
      '<div class="panel"><div class="ph"><h3>Upcoming bookings</h3><button class="btn btn-ghost btn-sm" data-a="bookings">View all</button></div><div class="list">' +
      (up.length ? up.slice(0, 4).map(function (b) { return '<div class="li"><div><b>' + esc(stName(b.stationId)) + '</b><br><small>' + SD.fd(b.date) + ' · ' + b.time + ' · ' + b.kwh + ' kWh</small></div><div class="ab">' + SD.pill(b.status) + '<button class="btn btn-danger btn-sm" data-cancel="' + b.id + '">Cancel</button></div></div>'; }).join('') : '<div class="empty">No upcoming bookings.<br>Book your next slot!</div>') + '</div></div></div>' +
      '<div class="panel"><div class="ph"><h3>Recent wallet activity</h3><button class="btn btn-ghost btn-sm" data-a="wallet">Open wallet</button></div><div class="list">' +
      (tx.length ? tx.map(function (t) { return '<div class="li"><div>' + esc(t.note) + '<br><small>' + SD.fd(t.date) + '</small></div><b style="color:' + (t.type === 'credit' ? 'var(--accent)' : 'var(--danger)') + '">' + (t.type === 'credit' ? '+' : '−') + inr(t.amt) + '</b></div>'; }).join('') : '<div class="empty">No activity yet.</div>') + '</div></div>';
    SD.line($('#cvE'), ms.map(function (m) { return m.label; }), vals, function (v) { return Math.round(v) + ''; });
  }
  function stat(l, v, s) { return '<div class="panel stat"><span class="lab">' + l + '</span><span class="val">' + v + '</span><span class="sub">' + s + '</span></div>'; }

  /* ---------- stations ---------- */
  function stations() {
    var el = $('#view-stations');
    el.innerHTML = banner() + '<div class="panel"><div class="ph"><div><h3>Find a charger</h3><p>Search the Stackly network and book a slot instantly.</p></div><div class="toolbar"><input class="input" id="sQ" placeholder="Search name or area…" value="' + esc(st.sQ) + '"><div class="tabs" id="sT">' +
      [['all', 'All'], ['DC', 'DC Fast'], ['AC', 'AC'], ['on', 'Online']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (st.sT === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div></div><div class="cards" id="sL"></div></div>';
    $('#sQ').oninput = function () { st.sQ = this.value; stList(); };
    $('#sT').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; st.sT = b.getAttribute('data-t'); $('#sT').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); stList(); };
    $('#sL').onclick = function (e) {
      var b = e.target.closest('[data-book]'); if (b) return openBook(b.getAttribute('data-book'));
      var m = e.target.closest('[data-map]'); if (m) { var s = SD.station(m.getAttribute('data-map')); window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.area), '_blank', 'noopener'); }
    };
    stList();
  }
  function stList() {
    var d = SD.get(), q = st.sQ.trim().toLowerCase(), list = d.stations.filter(function (s) {
      var tOK = st.sT === 'all' || (st.sT === 'on' ? s.online : s.type.indexOf(st.sT) === 0);
      return tOK && (s.name + ' ' + s.area).toLowerCase().indexOf(q) > -1;
    });
    $('#sL').innerHTML = list.length ? list.map(function (s) {
      var off = !s.online;
      return '<div class="scard"><div class="sart ' + (off ? 'off' : '') + '">' + SD.icon('bolt') + '</div><div class="bd"><div style="display:flex;justify-content:space-between;gap:8px"><h4>' + esc(s.name) + '</h4>' + SD.pill(off ? 'Offline' : 'Online') + '</div>' +
        '<div class="meta">' + esc(s.area) + '</div><div class="meta">' + esc(s.type) + ' · ' + esc(s.power) + ' · ' + s.bays + ' bays</div><div class="meta">₹' + d.settings.tariff + ' per kWh</div>' +
        '<div class="ft"><button class="btn btn-ghost btn-sm" data-map="' + s.id + '">' + SD.icon('map') + ' Directions</button><button class="btn btn-primary btn-sm" data-book="' + s.id + '"' + (off || d.settings.maintenance ? ' disabled' : '') + '>Book slot</button></div></div></div>';
    }).join('') : '<div class="empty" style="grid-column:1/-1">No stations match your search.</div>';
  }

  /* ---------- bookings ---------- */
  function bookings() {
    var el = $('#view-bookings'), ts = ['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
    el.innerHTML = banner() + '<div class="panel"><div class="ph"><div><h3>My bookings</h3><p>Cancel an active booking to get a full wallet refund.</p></div><div class="toolbar"><div class="tabs" id="bT">' +
      ts.map(function (t) { return '<button data-t="' + t + '" class="' + (st.bF === t ? 'on' : '') + '">' + (t === 'all' ? 'All' : t) + '</button>'; }).join('') + '</div><button class="btn btn-primary" id="nb">' + SD.icon('plus') + ' New booking</button></div></div><div class="tw" id="bL"></div></div>';
    $('#nb').onclick = function () { openBook(); };
    $('#bT').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; st.bF = b.getAttribute('data-t'); $('#bT').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); bList(); };
    bList();
  }
  function bList() {
    var l = mine().filter(function (b) { return st.bF === 'all' || b.status === st.bF; }).sort(function (a, b) { return byDate(b, a); });
    $('#bL').innerHTML = l.length ? '<table><thead><tr><th>ID</th><th>Station</th><th>Date & time</th><th>Energy</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>' + l.map(function (b) {
      var act = b.status === 'Pending' || b.status === 'Confirmed';
      return '<tr><td>' + b.id + '</td><td>' + esc(stName(b.stationId)) + '</td><td>' + SD.fd(b.date) + ' · ' + b.time + '</td><td>' + b.kwh + ' kWh</td><td>' + inr(b.amount) + '</td><td>' + SD.pill(b.status) + '</td><td>' + (act ? '<button class="btn btn-danger btn-sm" data-cancel="' + b.id + '">Cancel</button>' : '—') + '</td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty">No bookings in this view.</div>';
  }

  /* ---------- history ---------- */
  function history() {
    var el = $('#view-history'), ms = SD.months(6);
    el.innerHTML = '<div class="panel"><div class="ph"><div><h3>Charging history</h3><p id="hSum"></p></div><div class="toolbar"><input class="input" id="hQ" placeholder="Search station or ID…" value="' + esc(st.hQ) + '"><select class="input" id="hM" style="min-width:140px;flex:0 1 150px"><option value="all">All months</option>' +
      ms.map(function (m) { return '<option value="' + m.key + '"' + (st.hM === m.key ? ' selected' : '') + '>' + m.label + ' ' + m.key.slice(0, 4) + '</option>'; }).join('') + '</select><button class="btn btn-ghost" id="hX">' + SD.icon('download') + ' Export CSV</button></div></div><div class="tw" id="hL"></div></div>';
    $('#hQ').oninput = function () { st.hQ = this.value; hList(); };
    $('#hM').onchange = function () { st.hM = this.value; hList(); };
    $('#hX').onclick = function () {
      var l = hRows(); if (!l.length) return SD.toast('Nothing to export for this filter.', 'warn');
      SD.csv('stackly-charging-history.csv', [['Booking ID', 'Station', 'Date', 'Time', 'Energy (kWh)', 'Amount (INR)']].concat(l.map(function (b) { return [b.id, stName(b.stationId), b.date, b.time, b.kwh, b.amount]; })));
    };
    $('#hL').onclick = function (e) { var b = e.target.closest('[data-inv]'); if (b) invoice(b.getAttribute('data-inv')); };
    hList();
  }
  function hRows() {
    var q = st.hQ.trim().toLowerCase();
    return mine().filter(function (b) { return b.status === 'Completed' && (st.hM === 'all' || b.date.slice(0, 7) === st.hM) && (b.id + ' ' + stName(b.stationId)).toLowerCase().indexOf(q) > -1; }).sort(function (a, b) { return byDate(b, a); });
  }
  function hList() {
    var l = hRows(); $('#hSum').textContent = l.length + ' sessions · ' + sum(l, function (b) { return b.kwh; }) + ' kWh · ' + inr(sum(l, function (b) { return b.amount; }));
    $('#hL').innerHTML = l.length ? '<table><thead><tr><th>ID</th><th>Station</th><th>Date</th><th>Energy</th><th>Amount</th><th>Invoice</th></tr></thead><tbody>' + l.map(function (b) {
      return '<tr><td>' + b.id + '</td><td>' + esc(stName(b.stationId)) + '</td><td>' + SD.fd(b.date) + ' · ' + b.time + '</td><td>' + b.kwh + ' kWh</td><td>' + inr(b.amount) + '</td><td><button class="btn btn-ghost btn-sm" data-inv="' + b.id + '">' + SD.icon('eye') + ' View</button></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty">No completed sessions found.</div>';
  }
  function invoice(id) {
    var b = mine().filter(function (x) { return x.id === id; })[0]; if (!b) return; var u = me();
    var rows = [['Invoice', 'INV-' + b.id.slice(3)], ['Login ID', A.id], ['Customer', u.name], ['Vehicle', u.vehicle || '—'], ['Station', stName(b.stationId)], ['Date', SD.fd(b.date) + ' · ' + b.time], ['Energy', b.kwh + ' kWh'], ['Rate', '₹' + (b.amount / b.kwh) + ' / kWh'], ['Total paid', inr(b.amount)]];
    SD.modal('Charging receipt', '<div class="list">' + rows.map(function (r) { return '<div class="li"><small>' + r[0] + '</small><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>', [{ label: 'Close' }, {
      label: 'Download', cls: 'btn-primary', fn: function () { SD.download('invoice-' + b.id + '.txt', 'STACKLY — CHARGING RECEIPT\r\n\r\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\r\n') + '\r\n\r\nThank you for charging with Stackly.', 'text/plain'); SD.toast('Receipt downloaded.'); return false; }
    }]);
  }

  /* ---------- wallet ---------- */
  var topAmt = 1000;
  function wallet() {
    var el = $('#view-wallet'), u = me();
    el.innerHTML = '<div class="grid g2"><div class="panel"><div class="ph"><h3>Wallet balance</h3></div><div class="bal">' + inr(u.wallet) + '</div><p style="color:var(--muted);margin:6px 0 18px;font-size:.85rem">Used automatically when you book a charging slot.</p>' +
      '<div class="amts" id="wA">' + [500, 1000, 2000, 5000].map(function (a) { return '<button data-amt="' + a + '" class="' + (topAmt === a ? 'on' : '') + '">₹' + a.toLocaleString('en-IN') + '</button>'; }).join('') + '</div>' +
      '<div class="row2"><div class="field"><label>Amount (₹)</label><input class="input" type="number" id="wC" min="100" max="50000" value="' + topAmt + '"></div><div class="field"><label>Payment method</label><select class="input" id="wM"><option>UPI</option><option>Debit / Credit card</option><option>Net banking</option></select></div></div>' +
      '<div class="ferr" id="wE"></div><button class="btn btn-primary" id="wB">' + SD.icon('plus') + ' Add money</button><p style="color:var(--muted);font-size:.75rem;margin-top:10px">Demo payment — no real money is charged.</p></div>' +
      '<div class="panel"><div class="ph"><h3>Transactions</h3><button class="btn btn-ghost btn-sm" id="wX">' + SD.icon('download') + ' CSV</button></div><div class="tw" id="wL"></div></div></div>';
    function tx() { return SD.get().txns.filter(function (t) { return t.userId === A.id; }); }
    $('#wL').innerHTML = tx().length ? '<table><thead><tr><th>Date</th><th>Details</th><th>Amount</th></tr></thead><tbody>' + tx().slice(0, 12).map(function (t) { return '<tr><td>' + SD.fd(t.date) + '</td><td>' + esc(t.note) + '</td><td style="color:' + (t.type === 'credit' ? 'var(--accent)' : 'var(--danger)') + ';font-weight:600">' + (t.type === 'credit' ? '+' : '−') + inr(t.amt) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">No transactions yet.</div>';
    $('#wA').onclick = function (e) { var b = e.target.closest('[data-amt]'); if (!b) return; topAmt = +b.getAttribute('data-amt'); $('#wC').value = topAmt; $('#wA').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); };
    $('#wC').oninput = function () { topAmt = parseInt(this.value, 10) || 0; $('#wA').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-amt') === topAmt); }); };
    $('#wB').onclick = function () {
      var a = parseInt($('#wC').value, 10), err = $('#wE');
      if (!a || a < 100 || a > 50000) { err.textContent = 'Enter an amount between ₹100 and ₹50,000.'; return; }
      var d = SD.get(), usr = d.users.filter(function (x) { return x.id === A.id; })[0]; usr.wallet += a;
      SD.txn(d, A.id, 'credit', a, 'Wallet top-up · ' + $('#wM').value.split(' ')[0]); SD.notify(d, A.id, 'Wallet top-up of ' + inr(a) + ' was successful.'); SD.set(d);
      SD.toast(inr(a) + ' added to your wallet.'); SD.refresh();
    };
    $('#wX').onclick = function () { var t = tx(); if (!t.length) return SD.toast('No transactions to export.', 'warn'); SD.csv('stackly-wallet.csv', [['Date', 'Details', 'Type', 'Amount (INR)']].concat(t.map(function (x) { return [x.date, x.note, x.type, x.amt]; }))); };
  }

  /* ---------- profile ---------- */
  function profile() {
    var el = $('#view-profile'), u = me();
    el.innerHTML = '<div class="grid g2"><div class="panel"><div class="ph"><h3>Personal details</h3>' + SD.pill('Active') + '</div>' +
      '<div class="field"><label>Login ID</label><input class="input" value="' + esc(A.id) + '" readonly style="opacity:.75"></div>' +
      '<div class="field"><label>Full name</label><input class="input" id="pN" maxlength="16" value="' + esc(u.name) + '"><div class="ferr" id="eN"></div></div>' +
      '<div class="field"><label>Email</label><input class="input" id="pE" type="email" value="' + esc(u.email) + '"><div class="ferr" id="eE"></div></div>' +
      '<div class="row2"><div class="field"><label>Mobile</label><input class="input" id="pP" inputmode="numeric" maxlength="10" value="' + esc(u.phone) + '"><div class="ferr" id="eP"></div></div><div class="field"><label>Vehicle</label><input class="input" id="pV" maxlength="30" value="' + esc(u.vehicle || '') + '"></div></div>' +
      '<button class="btn btn-primary" id="pS">Save changes</button></div>' +
      '<div class="panel"><div class="ph"><h3>Change password</h3></div><div class="field"><label>Current password</label><div class="pw"><input class="input" type="password" id="cP"></div></div><div class="field"><label>New password</label><div class="pw"><input class="input" type="password" id="nP"></div></div><div class="field"><label>Confirm new password</label><div class="pw"><input class="input" type="password" id="rP"></div></div><div class="ferr" id="eW" style="margin-bottom:10px"></div><button class="btn btn-primary" id="pW">Update password</button><p style="color:var(--muted);font-size:.78rem;margin-top:10px">At least 6 characters with a letter and a number.</p></div></div>';
    $('#pP').oninput = function () { this.value = this.value.replace(/\D/g, ''); };
    $('#pS').onclick = function () {
      var n = $('#pN').value.trim(), e = $('#pE').value.trim(), p = $('#pP').value.trim(), ok = true;
      function f(id, c, m) { $(id).textContent = c ? '' : m; if (!c) ok = false; }
      f('#eN', SD.v.name(n), 'Letters only, 2–16 characters.'); f('#eE', SD.v.email(e), 'Enter a valid email address.'); f('#eP', SD.v.phone(p), 'Enter a 10-digit mobile starting with 6–9.');
      if (!ok) return;
      var d = SD.get();
      if (d.users.some(function (x) { return x.id !== A.id && String(x.email || '').toLowerCase() === e.toLowerCase(); })) { $('#eE').textContent = 'This email is used by another account.'; return; }
      var usr = d.users.filter(function (x) { return x.id === A.id; })[0]; usr.name = n; usr.email = e; usr.phone = p; usr.vehicle = $('#pV').value.trim(); SD.set(d);
      A.name = n; try { sessionStorage.setItem('stacklyAuth', JSON.stringify(A)); } catch (x) { } SD.bindUser(); SD.toast('Profile updated.');
    };
    $('#pW').onclick = function () {
      var d = SD.get(), c = $('#cP').value, n = $('#nP').value, r = $('#rP').value, er = $('#eW');
      if (c !== SD.pwOf(d, SD.user(A.id))) { er.textContent = 'Current password is incorrect.'; return; }
      if (!SD.v.pw(n)) { er.textContent = 'New password needs 6+ characters with a letter and a number.'; return; }
      if (n !== r) { er.textContent = 'Passwords do not match.'; return; }
      SD.setPw(d, A.id, n); SD.set(d); er.textContent = ''; ['#cP', '#nP', '#rP'].forEach(function (i) { $(i).value = ''; }); SD.toast('Password updated.');
    };
  }

  /* ---------- global click delegation ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-a]'), c = e.target.closest('[data-cancel]');
    if (a) { var k = a.getAttribute('data-a'); if (k === 'book') openBook(); else SD.show(k); }
    if (c) {
      var id = c.getAttribute('data-cancel');
      SD.confirm('Cancel booking ' + id + '? The amount will be refunded to your wallet.', 'Cancel booking', function () {
        var b = SD.cancelBooking(id, 'customer'); if (b) SD.toast('Booking cancelled. ' + inr(b.amount) + ' refunded.'); else SD.toast('This booking can no longer be cancelled.', 'warn'); SD.refresh();
      });
    }
  });

  SD.init('customer', { overview: overview, stations: stations, bookings: bookings, history: history, wallet: wallet, profile: profile }, titles);
})();