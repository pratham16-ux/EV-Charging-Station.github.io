/* Stackly admin dashboard */
(function () {
  'use strict';
  var $ = SD.$, esc = SD.esc, inr = SD.inr, A = SD.getAuth() || {};
  var st = { sQ: '', bF: 'all', bQ: '', cQ: '', rR: '7' };
  var titles = { overview: 'Overview', stations: 'Stations', bookings: 'Bookings', customers: 'Customers', reports: 'Reports', settings: 'Settings' };
  function sum(a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); }
  function byDate(a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }
  function uName(id) { var u = SD.user(id); return u ? u.name : id; }
  function sName(id) { var s = SD.station(id); return s ? s.name : id; }
  function stat(l, v, s) { return '<div class="panel stat"><span class="lab">' + l + '</span><span class="val">' + v + '</span><span class="sub">' + s + '</span></div>'; }
  function done(d) { return d.bookings.filter(function (b) { return b.status === 'Completed'; }); }
  function revSeries(d, range) {
    var dn = done(d), labels = [], vals = [], i;
    if (range === 'm') {
      SD.months(6).forEach(function (m) { labels.push(m.label); vals.push(sum(dn.filter(function (b) { return b.date.slice(0, 7) === m.key; }), function (b) { return b.amount; })); });
    } else {
      var n = +range, dd;
      for (i = n - 1; i >= 0; i--) {
        var key = SD.ago(i); dd = new Date(); dd.setDate(dd.getDate() - i);
        labels.push(n > 7 ? (i % 5 === 0 ? dd.getDate() + ' ' + SD.MON[dd.getMonth()] : '') : dd.getDate() + ' ' + SD.MON[dd.getMonth()]);
        vals.push(sum(dn.filter(function (b) { return b.date === key; }), function (b) { return b.amount; }));
      }
    }
    return { labels: labels, vals: vals };
  }
  function actions(b) {
    if (b.status === 'Pending') return '<button class="btn btn-primary btn-sm" data-st="Confirmed" data-id="' + b.id + '">Approve</button><button class="btn btn-danger btn-sm" data-cancel="' + b.id + '">Reject</button>';
    if (b.status === 'Confirmed') return '<button class="btn btn-primary btn-sm" data-st="Completed" data-id="' + b.id + '">Complete</button><button class="btn btn-danger btn-sm" data-cancel="' + b.id + '">Cancel</button>';
    return '—';
  }

  /* ---------- overview ---------- */
  function overview() {
    var el = $('#view-overview'), d = SD.get(), dn = done(d), pend = d.bookings.filter(function (b) { return b.status === 'Pending'; }).sort(byDate);
    var act = d.bookings.filter(function (b) { return b.status === 'Pending' || b.status === 'Confirmed'; }).length, on = d.stations.filter(function (s) { return s.online; }).length;
    var rs = revSeries(d, '7'), cnt = { Completed: 0, Confirmed: 0, Pending: 0, Cancelled: 0 };
    d.bookings.forEach(function (b) { cnt[b.status]++; });
    var colors = { Completed: '#2DE2B0', Confirmed: '#6AA8FF', Pending: '#F5B94B', Cancelled: '#FF6B7F' };
    var kw = {}; dn.forEach(function (b) { kw[b.stationId] = (kw[b.stationId] || 0) + b.kwh; });
    var top = d.stations.map(function (s) { return { s: s, k: kw[s.id] || 0 }; }).sort(function (a, b) { return b.k - a.k; }).slice(0, 5), mx = Math.max(1, top[0] ? top[0].k : 1);
    el.innerHTML = '<div class="panel hello"><div><h2>Welcome, ' + esc(A.name.split(' ')[0]) + '</h2><p>Admin Login ID: <b style="color:var(--accent)">' + esc(A.id) + '</b> · ' + pend.length + ' booking' + (pend.length === 1 ? '' : 's') + ' awaiting approval</p></div><div class="acts"><button class="btn btn-primary" data-a="addst">' + SD.icon('plus') + ' Add station</button><button class="btn btn-ghost" data-a="bookings">' + SD.icon('calendar') + ' Manage bookings</button><button class="btn btn-ghost" data-a="reports">' + SD.icon('chart') + ' Reports</button></div></div>' +
      '<div class="grid g4">' + stat('Total revenue', inr(sum(dn, function (b) { return b.amount; })), dn.length + ' completed sessions') + stat('Active bookings', act, 'Pending + confirmed') + stat('Stations online', on + ' / ' + d.stations.length, 'Network status') + stat('Customers', d.users.length, d.users.filter(function (u) { return u.blocked; }).length + ' blocked') + '</div>' +
      '<div class="grid g21"><div class="panel"><div class="ph"><div><h3>Revenue · last 7 days</h3><p>From completed sessions</p></div></div><canvas class="cv" id="cvR"></canvas></div>' +
      '<div class="panel"><div class="ph"><h3>Booking status</h3></div><canvas class="cv" id="cvD" style="height:200px"></canvas><div class="legend">' + Object.keys(cnt).map(function (k) { return '<span><i style="background:' + colors[k] + '"></i>' + k + ' ' + cnt[k] + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="grid g2"><div class="panel"><div class="ph"><h3>Pending approvals</h3><button class="btn btn-ghost btn-sm" data-a="bookings">View all</button></div><div class="list">' +
      (pend.length ? pend.slice(0, 4).map(function (b) { return '<div class="li"><div><b>' + b.id + ' · ' + esc(uName(b.userId)) + '</b><br><small>' + esc(sName(b.stationId)) + ' · ' + SD.fd(b.date) + ' ' + b.time + '</small></div><div class="ab">' + actions(b) + '</div></div>'; }).join('') : '<div class="empty">All caught up 🎉</div>') + '</div></div>' +
      '<div class="panel"><div class="ph"><h3>Top stations by energy</h3></div><div class="list">' + top.map(function (t) { return '<div><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:6px"><span>' + esc(t.s.name) + '</span><b>' + t.k + ' kWh</b></div><div class="bar"><i style="width:' + Math.round(t.k / mx * 100) + '%"></i></div></div>'; }).join('') + '</div></div></div>';
    SD.bars($('#cvR'), rs.labels, rs.vals, function (v) { return v >= 1000 ? '₹' + (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : '₹' + Math.round(v); });
    SD.donut($('#cvD'), Object.keys(cnt).map(function (k) { return { label: k, val: cnt[k], color: colors[k] }; }), d.bookings.length);
  }

  /* ---------- stations ---------- */
  function stationForm(s) {
    s = s || { name: '', area: '', type: 'DC Fast', power: '60 kW', bays: 4 };
    return '<div class="field"><label>Station name</label><input class="input" id="fN" maxlength="40" value="' + esc(s.name) + '"></div><div class="field"><label>Area / location</label><input class="input" id="fA" maxlength="40" value="' + esc(s.area) + '"></div>' +
      '<div class="row2"><div class="field"><label>Type</label><select class="input" id="fT">' + ['DC Fast', 'DC Ultra', 'AC'].map(function (t) { return '<option' + (t === s.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Power (kW)</label><input class="input" type="number" id="fP" min="3" max="350" value="' + parseInt(s.power, 10) + '"></div></div><div class="field"><label>Charging bays</label><input class="input" type="number" id="fB" min="1" max="40" value="' + s.bays + '"></div><div class="ferr" id="fE"></div>';
  }
  function readForm(ov) {
    var n = $('#fN', ov).value.trim(), a = $('#fA', ov).value.trim(), p = parseInt($('#fP', ov).value, 10), b = parseInt($('#fB', ov).value, 10), e = $('#fE', ov);
    if (n.length < 3) { e.textContent = 'Enter a station name (3+ characters).'; return null; }
    if (a.length < 3) { e.textContent = 'Enter the area / location.'; return null; }
    if (!p || p < 3 || p > 350) { e.textContent = 'Power must be between 3 and 350 kW.'; return null; }
    if (!b || b < 1 || b > 40) { e.textContent = 'Bays must be between 1 and 40.'; return null; }
    return { name: n, area: a, type: $('#fT', ov).value, power: p + ' kW', bays: b };
  }
  function addStation() {
    SD.modal('Add station', stationForm(), [{ label: 'Cancel' }, {
      label: 'Add station', cls: 'btn-primary', fn: function (ov) {
        var f = readForm(ov); if (!f) return false; var d = SD.get(), n = d.stations.reduce(function (m, s) { return Math.max(m, parseInt(s.id.slice(1), 10)); }, 0) + 1;
        f.id = 'S' + (n < 10 ? '0' + n : n); f.online = true; d.stations.push(f); SD.set(d); SD.toast(f.name + ' added.'); SD.refresh();
      }
    }]);
  }
  function stations() {
    var el = $('#view-stations');
    el.innerHTML = '<div class="panel"><div class="ph"><div><h3>Charging stations</h3><p>Toggle a station online/offline, edit details, or remove it.</p></div><div class="toolbar"><input class="input" id="sQ" placeholder="Search stations…" value="' + esc(st.sQ) + '"><button class="btn btn-primary" id="sA">' + SD.icon('plus') + ' Add station</button></div></div><div class="tw" id="sL"></div></div>';
    $('#sQ').oninput = function () { st.sQ = this.value; stList(); }; $('#sA').onclick = addStation; stList();
  }
  function stList() {
    var d = SD.get(), q = st.sQ.trim().toLowerCase(), l = d.stations.filter(function (s) { return (s.name + ' ' + s.area + ' ' + s.type).toLowerCase().indexOf(q) > -1; });
    $('#sL').innerHTML = l.length ? '<table><thead><tr><th>ID</th><th>Station</th><th>Type</th><th>Power</th><th>Bays</th><th>Status</th><th>Online</th><th>Actions</th></tr></thead><tbody>' + l.map(function (s) {
      return '<tr><td>' + s.id + '</td><td><b>' + esc(s.name) + '</b><br><small style="color:var(--muted)">' + esc(s.area) + '</small></td><td>' + esc(s.type) + '</td><td>' + esc(s.power) + '</td><td>' + s.bays + '</td><td>' + SD.pill(s.online ? 'Online' : 'Offline') + '</td>' +
        '<td><button class="sw ' + (s.online ? 'on' : '') + '" data-tg="' + s.id + '" aria-label="Toggle ' + esc(s.name) + '"></button></td><td><div class="ab"><button class="btn btn-ghost btn-sm" data-ed="' + s.id + '">Edit</button><button class="btn btn-danger btn-sm" data-del="' + s.id + '">Delete</button></div></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty">No stations found.</div>';
  }

  /* ---------- bookings ---------- */
  function bookings() {
    var el = $('#view-bookings'), ts = ['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
    el.innerHTML = '<div class="panel"><div class="ph"><div><h3>All bookings</h3><p>Approve, complete or cancel customer bookings. Cancellations refund the customer wallet.</p></div><div class="toolbar"><input class="input" id="bQ" placeholder="Search ID, customer, station…" value="' + esc(st.bQ) + '"><div class="tabs" id="bT">' + ts.map(function (t) { return '<button data-t="' + t + '" class="' + (st.bF === t ? 'on' : '') + '">' + (t === 'all' ? 'All' : t) + '</button>'; }).join('') + '</div></div></div><div class="tw" id="bL"></div></div>';
    $('#bQ').oninput = function () { st.bQ = this.value; bList(); };
    $('#bT').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; st.bF = b.getAttribute('data-t'); $('#bT').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); bList(); };
    bList();
  }
  function bList() {
    var q = st.bQ.trim().toLowerCase(), l = SD.get().bookings.filter(function (b) { return (st.bF === 'all' || b.status === st.bF) && (b.id + ' ' + uName(b.userId) + ' ' + b.userId + ' ' + sName(b.stationId)).toLowerCase().indexOf(q) > -1; }).sort(function (a, b) { return byDate(b, a); });
    $('#bL').innerHTML = l.length ? '<table><thead><tr><th>ID</th><th>Customer</th><th>Station</th><th>Date & time</th><th>Energy</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + l.slice(0, 60).map(function (b) {
      return '<tr><td>' + b.id + '</td><td>' + esc(uName(b.userId)) + '<br><small style="color:var(--muted)">' + b.userId + '</small></td><td>' + esc(sName(b.stationId)) + '</td><td>' + SD.fd(b.date) + ' · ' + b.time + '</td><td>' + b.kwh + ' kWh</td><td>' + inr(b.amount) + '</td><td>' + SD.pill(b.status) + '</td><td><div class="ab">' + actions(b) + '</div></td></tr>';
    }).join('') + '</tbody></table>' + (l.length > 60 ? '<p class="empty">Showing latest 60 of ' + l.length + ' bookings. Use search to narrow down.</p>' : '') : '<div class="empty">No bookings match.</div>';
  }

  /* ---------- customers ---------- */
  function customers() {
    var el = $('#view-customers');
    el.innerHTML = '<div class="panel"><div class="ph"><div><h3>Customers</h3><p>Block accounts or add wallet credit.</p></div><div class="toolbar"><input class="input" id="cQ" placeholder="Search name, ID, vehicle…" value="' + esc(st.cQ) + '"></div></div><div class="tw" id="cL"></div></div>';
    $('#cQ').oninput = function () { st.cQ = this.value; cList(); }; cList();
  }
  function cList() {
    var d = SD.get(), q = st.cQ.trim().toLowerCase(), l = d.users.filter(function (u) { return (u.id + ' ' + u.name + ' ' + u.vehicle + ' ' + u.email).toLowerCase().indexOf(q) > -1; });
    $('#cL').innerHTML = l.length ? '<table><thead><tr><th>Login ID</th><th>Name</th><th>Contact</th><th>Vehicle</th><th>Wallet</th><th>Bookings</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + l.map(function (u) {
      return '<tr><td>' + u.id + '</td><td><b>' + esc(u.name) + '</b></td><td>' + esc(u.email) + '<br><small style="color:var(--muted)">+91 ' + esc(u.phone) + '</small></td><td>' + esc(u.vehicle) + '</td><td>' + inr(u.wallet) + '</td><td>' + d.bookings.filter(function (b) { return b.userId === u.id; }).length + '</td><td>' + SD.pill(u.blocked ? 'Blocked' : 'Active') + '</td>' +
        '<td><div class="ab"><button class="btn btn-ghost btn-sm" data-cr="' + u.id + '">Add credit</button><button class="btn ' + (u.blocked ? 'btn-primary' : 'btn-danger') + ' btn-sm" data-bl="' + u.id + '">' + (u.blocked ? 'Unblock' : 'Block') + '</button></div></td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty">No customers found.</div>';
  }

  /* ---------- reports ---------- */
  function reports() {
    var el = $('#view-reports'), d = SD.get();
    el.innerHTML = '<div class="grid g3" id="rS"></div><div class="panel"><div class="ph"><div><h3>Revenue trend</h3><p>Completed sessions only</p></div><div class="tabs" id="rT">' + [['7', '7 days'], ['30', '30 days'], ['m', '6 months']].map(function (t) { return '<button data-r="' + t[0] + '" class="' + (st.rR === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div></div><canvas class="cv" id="cvT"></canvas></div>' +
      '<div class="panel"><div class="ph"><div><h3>Export data</h3><p>Download CSV files for accounting or analysis.</p></div></div><div class="acts"><button class="btn btn-ghost" data-ex="bookings">' + SD.icon('download') + ' Bookings CSV</button><button class="btn btn-ghost" data-ex="customers">' + SD.icon('download') + ' Customers CSV</button><button class="btn btn-ghost" data-ex="revenue">' + SD.icon('download') + ' Revenue CSV</button></div></div>';
    var dn = done(d), tot = sum(dn, function (b) { return b.amount; }), kw = sum(dn, function (b) { return b.kwh; });
    $('#rS').innerHTML = stat('Revenue (all time)', inr(tot), dn.length + ' sessions') + stat('Energy delivered', kw + ' kWh', 'Completed sessions') + stat('Avg. session value', inr(dn.length ? tot / dn.length : 0), 'Per completed session');
    function chart() { var s = revSeries(SD.get(), st.rR); SD.line($('#cvT'), s.labels, s.vals, function (v) { return v >= 1000 ? '₹' + (v / 1000).toFixed(1) + 'k' : '₹' + Math.round(v); }); }
    $('#rT').onclick = function (e) { var b = e.target.closest('[data-r]'); if (!b) return; st.rR = b.getAttribute('data-r'); $('#rT').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); chart(); };
    chart();
  }
  function exportCsv(k) {
    var d = SD.get();
    if (k === 'bookings') SD.csv('stackly-bookings.csv', [['ID', 'Login ID', 'Customer', 'Station', 'Date', 'Time', 'kWh', 'Amount (INR)', 'Status']].concat(d.bookings.map(function (b) { return [b.id, b.userId, uName(b.userId), sName(b.stationId), b.date, b.time, b.kwh, b.amount, b.status]; })));
    if (k === 'customers') SD.csv('stackly-customers.csv', [['Login ID', 'Name', 'Email', 'Phone', 'Vehicle', 'Wallet (INR)', 'Status']].concat(d.users.map(function (u) { return [u.id, u.name, u.email, u.phone, u.vehicle, u.wallet, u.blocked ? 'Blocked' : 'Active']; })));
    if (k === 'revenue') { var s = revSeries(d, '30'); SD.csv('stackly-revenue-30d.csv', [['Date', 'Revenue (INR)']].concat(s.vals.map(function (v, i) { return [SD.ago(29 - i), v]; }))); }
  }

  /* ---------- settings ---------- */
  function settings() {
    var el = $('#view-settings'), d = SD.get(), m = d.settings.maintenance;
    el.innerHTML = '<div class="grid g2"><div class="panel"><div class="ph"><h3>Network settings</h3></div><div class="field"><label>Tariff per kWh (₹)</label><input class="input" type="number" id="tT" min="1" max="200" value="' + d.settings.tariff + '"><div class="ferr" id="eT"></div></div>' +
      '<div class="li" style="margin-bottom:16px"><span><b>Maintenance mode</b><br><small>Pauses all new customer bookings.</small></span><button class="sw ' + (m ? 'on' : '') + '" id="tM" aria-label="Toggle maintenance mode"></button></div><button class="btn btn-primary" id="sv">Save settings</button></div>' +
      '<div class="panel"><div class="ph"><h3>Admin account</h3></div><div class="field"><label>Login ID</label><input class="input" value="' + esc(A.id) + '" readonly style="opacity:.75"></div><div class="field"><label>Display name</label><input class="input" id="aN" maxlength="16" value="' + esc(d.admin.name) + '"><div class="ferr" id="eN"></div></div><button class="btn btn-ghost" id="sn" style="margin-bottom:22px">Save name</button>' +
      '<div class="field"><label>Current password</label><input class="input" type="password" id="cP"></div><div class="row2"><div class="field"><label>New password</label><input class="input" type="password" id="nP"></div><div class="field"><label>Confirm</label><input class="input" type="password" id="rP"></div></div><div class="ferr" id="eW" style="margin-bottom:10px"></div><button class="btn btn-ghost" id="pw">Update password</button></div></div>' +
      '<div class="panel"><div class="ph"><div><h3>Demo data</h3><p>Restore all stations, bookings and customers to the original sample data.</p></div><button class="btn btn-danger" id="rs">Reset demo data</button></div></div>';
    var mm = m;
    $('#tM').onclick = function () { mm = !mm; this.classList.toggle('on', mm); };
    $('#sv').onclick = function () {
      var t = parseInt($('#tT').value, 10); if (!t || t < 1 || t > 200) { $('#eT').textContent = 'Enter a tariff between ₹1 and ₹200.'; return; }
      var x = SD.get(); x.settings.tariff = t; x.settings.maintenance = mm; SD.set(x); $('#eT').textContent = ''; SD.toast('Settings saved. Tariff ₹' + t + '/kWh' + (mm ? ', maintenance ON.' : '.'));
    };
    $('#sn').onclick = function () {
      var n = $('#aN').value.trim(); if (!SD.v.name(n)) { $('#eN').textContent = 'Letters only, 2–16 characters.'; return; }
      var x = SD.get(); x.admin.name = n; SD.set(x); A.name = n; try { sessionStorage.setItem('stacklyAuth', JSON.stringify(A)); } catch (e) { } SD.bindUser(); $('#eN').textContent = ''; SD.toast('Display name updated.');
    };
    $('#pw').onclick = function () {
      var x = SD.get(), c = $('#cP').value, n = $('#nP').value, r = $('#rP').value, er = $('#eW');
      if (c !== x.creds.admin.pw) { er.textContent = 'Current password is incorrect.'; return; }
      if (!SD.v.pw(n)) { er.textContent = 'New password needs 6+ characters with a letter and a number.'; return; }
      if (n !== r) { er.textContent = 'Passwords do not match.'; return; }
      x.creds.admin.pw = n; SD.set(x); er.textContent = ''; ['#cP', '#nP', '#rP'].forEach(function (i) { $(i).value = ''; }); SD.toast('Password updated.');
    };
    $('#rs').onclick = function () { SD.confirm('Reset all demo data? Your changes to stations, bookings, customers and passwords will be lost.', 'Reset data', function () { SD.reset(); SD.toast('Demo data restored.'); SD.refresh(); }); };
  }

  /* ---------- global click delegation ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target, g;
    if ((g = t.closest('[data-a]'))) { var k = g.getAttribute('data-a'); if (k === 'addst') addStation(); else SD.show(k); return; }
    if ((g = t.closest('[data-st]'))) { var s = g.getAttribute('data-st'), b = SD.setStatus(g.getAttribute('data-id'), s); SD.toast(b ? b.id + ' marked ' + s.toLowerCase() + '.' : 'Booking not found.', b ? '' : 'warn'); SD.refresh(); return; }
    if ((g = t.closest('[data-cancel]'))) {
      var id = g.getAttribute('data-cancel');
      SD.confirm('Cancel booking ' + id + '? The customer will be refunded to their wallet.', 'Cancel booking', function () { var b = SD.cancelBooking(id, 'admin'); SD.toast(b ? id + ' cancelled. ' + inr(b.amount) + ' refunded.' : 'This booking can no longer be cancelled.', b ? '' : 'warn'); SD.refresh(); }); return;
    }
    if ((g = t.closest('[data-tg]'))) {
      var d = SD.get(), x = d.stations.filter(function (z) { return z.id === g.getAttribute('data-tg'); })[0]; x.online = !x.online; SD.set(d); SD.toast(x.name + ' is now ' + (x.online ? 'online.' : 'offline.')); stList(); return;
    }
    if ((g = t.closest('[data-ed]'))) {
      var sid = g.getAttribute('data-ed'), cur = SD.station(sid);
      SD.modal('Edit station', stationForm(cur), [{ label: 'Cancel' }, { label: 'Save changes', cls: 'btn-primary', fn: function (ov) { var f = readForm(ov); if (!f) return false; var d2 = SD.get(), z = d2.stations.filter(function (q) { return q.id === sid; })[0]; z.name = f.name; z.area = f.area; z.type = f.type; z.power = f.power; z.bays = f.bays; SD.set(d2); SD.toast('Station updated.'); stList(); } }]); return;
    }
    if ((g = t.closest('[data-del]'))) {
      var did = g.getAttribute('data-del'), dd = SD.get(), busy = dd.bookings.some(function (b) { return b.stationId === did && (b.status === 'Pending' || b.status === 'Confirmed'); });
      if (busy) { SD.toast('Cannot delete: this station has active bookings. Cancel or complete them first.', 'warn'); return; }
      SD.confirm('Delete ' + sName(did) + '? This cannot be undone.', 'Delete station', function () { var d3 = SD.get(); d3.stations = d3.stations.filter(function (q) { return q.id !== did; }); SD.set(d3); SD.toast('Station deleted.'); stList(); }); return;
    }
    if ((g = t.closest('[data-bl]'))) {
      var uid = g.getAttribute('data-bl'), u = SD.user(uid), act = u.blocked ? 'Unblock' : 'Block';
      SD.confirm(act + ' ' + u.name + ' (' + uid + ')?' + (u.blocked ? '' : ' They will not be able to sign in.'), act, function () { var d4 = SD.get(), q = d4.users.filter(function (z) { return z.id === uid; })[0]; q.blocked = !q.blocked; SD.set(d4); SD.toast(q.name + (q.blocked ? ' blocked.' : ' unblocked.')); cList(); }, !u.blocked); return;
    }
    if ((g = t.closest('[data-cr]'))) {
      var cid = g.getAttribute('data-cr'), cu = SD.user(cid);
      SD.modal('Add wallet credit', '<p style="color:var(--muted);margin-bottom:12px">' + esc(cu.name) + ' · ' + cid + ' · balance ' + inr(cu.wallet) + '</p><div class="field"><label>Amount (₹)</label><input class="input" type="number" id="crA" min="1" max="50000" value="500"></div><div class="ferr" id="crE"></div>', [{ label: 'Cancel' }, {
        label: 'Add credit', cls: 'btn-primary', fn: function (ov) {
          var a = parseInt($('#crA', ov).value, 10); if (!a || a < 1 || a > 50000) { $('#crE', ov).textContent = 'Enter ₹1 to ₹50,000.'; return false; }
          var d5 = SD.get(), q = d5.users.filter(function (z) { return z.id === cid; })[0]; q.wallet += a; SD.txn(d5, cid, 'credit', a, 'Credit added by Stackly'); SD.notify(d5, cid, inr(a) + ' was added to your wallet by Stackly.'); SD.set(d5); SD.toast(inr(a) + ' added to ' + q.name + '.'); cList();
        }
      }]); return;
    }
    if ((g = t.closest('[data-ex]'))) exportCsv(g.getAttribute('data-ex'));
  });

  SD.init('admin', { overview: overview, stations: stations, bookings: bookings, customers: customers, reports: reports, settings: settings }, titles);
})();