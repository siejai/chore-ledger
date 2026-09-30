/*
 * Chore Ledger with a family bank and a pet game. ES5 so it runs in any Android WebView, Kindle Silk and desktop browsers.
 * Two entry points share this file: index.html (family app, CL_MODE 'family') and bank.html (parent app, CL_MODE 'bank').
 * Each device also remembers its role (localStorage cl.role): 'kids' for shared devices, 'parent' for a grown-up's own phone.
 * On a parent's phone index.html opens as the parent app too, so it does not matter which link was saved.
 * No family data is built in: the first run shows a setup screen, or loads a private family file.
 * Data lives behind window.DB (js/store.js). The pet game is js/pets.js + js/creatures.js.
 */
(function () {
  'use strict';

  /* ================= utilities ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function trim(s) { return String(s || '').replace(/^\s+|\s+$/g, ''); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function parseD(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
  function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 86400000); }
  function weekStart(s) { var d = parseD(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dstr(d); }
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmtDate(s) { try { return parseD(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return s; } }
  function fmtShort(ts) { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts), h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ':' + pad(m) + (h < 12 ? ' am' : ' pm');
  }
  function n0(n) { n = Math.round(Number(n) || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function money(c) {
    c = Math.round(Number(c) || 0);
    var s = (Math.abs(c) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (c < 0 ? '-$' : '$') + s;
  }
  function signed(c) { return (c > 0 ? '+' : '') + money(c); }
  function parseMoney(v) {
    v = String(v || '').replace(/[$,\s]/g, '');
    if (v === '') return 0;
    if (!/^\d*(\.\d{0,2})?$/.test(v) || v === '.') return NaN;
    return Math.round(parseFloat(v) * 100);
  }
  function dollars(c) { return (Number(c || 0) / 100).toFixed(2); }
  function rateLabel(r) { r = Number(r) || 0; return r ? (Math.round(r * 100) / 100) + '¢ per point' : 'not set'; }
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  };
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (s.hasOwnProperty(k)) t[k] = s[k]; } return t; }
  function find(arr, fn) { for (var i = 0; i < arr.length; i++) if (fn(arr[i])) return arr[i]; return null; }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function opt(v, label, cur) { return '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>'; }

  /* SHA-256 in plain JS so every device hashes PINs the same way. */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = '', words = [], bitLen = ascii.length * 8;
    var hash = [], k = [], pc = 0, isComp = {}, i, j;
    for (var cand = 2; pc < 64; cand++) {
      if (!isComp[cand]) {
        for (i = 0; i < 313; i += cand) isComp[i] = cand;
        hash[pc] = (mp(cand, 0.5) * maxWord) | 0;
        k[pc++] = (mp(cand, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }

  /* ================= state ================= */
  var ROLE = LS.get('cl.role');
  var MODE = window.CL_MODE === 'bank' || ROLE === 'parent' ? 'bank' : 'family';
  function setRole(role) {
    LS.set('cl.role', role);
    if (role === 'kids') { LS.set('cl.keep', null); if (window.CL_MODE === 'bank') { location.href = 'index.html'; return; } }
    location.reload();
  }
  /* "keep me unlocked" on a parent's own phone: {id, until} */
  function keepInfo() { try { var k = JSON.parse(LS.get('cl.keep') || 'null'); return k && k.until > Date.now() ? k : null; } catch (e) { return null; } }
  var KEEP_DAYS = 30;
  var LIVE_DAYS = 45, IDLE_PICK_MS = 5 * 60 * 1000, UNDO_MS = 4500;
  var DEFAULTS = {
    bankName: 'Family Bank', requireApproval: true, catOrder: [], centsPerPoint: 1, petEvolve1Cents: 500, petEvolve2Cents: 1500,
    dadPid: '', allowanceCents: 0, allowanceDay: 5, allowanceLast: '', parents: [], foodCoins: 10, mealPrice: 10, careCoins: 10, kitPrice: 10
  };
  var S = {
    phase: 'boot', err: '', ready: {},
    people: [], chores: [], entries: [], txns: [], reqs: [], pets: {}, settings: assign({}, DEFAULTS), settingsDoc: null,
    me: MODE === 'bank' ? '@parent' : null, lastMe: LS.get('cl.me'), picking: false, lastActive: Date.now(),
    admin: false, parent: null, adminOpen: MODE === 'bank', adminTimer: 0, fails: 0, lockUntil: 0,
    tab: LS.get(MODE === 'bank' ? 'cl.ptab' : 'cl.tab') || (MODE === 'bank' ? 'approvals' : 'log'), keepTried: false,
    sel: null, date: today(), dateAuto: true, q: '', cat: 'all', sort: 'cat', quest: null,
    hist: { pid: 'all', range: '7', status: 'all' }, older: null,
    apMode: LS.get('cl.apmode') || 'chore', apClosed: {}, queue: [],
    bankPid: null, bankForm: null, allTx: null,
    edit: null, cq: '', showArchived: false, armed: null, dirty: false,
    wiz: { people: [], starter: true, imported: null }
  };
  var root = $('#app'), view = document.createElement('div');
  var raf = 0;
  function schedule() { if (!raf) raf = window.requestAnimationFrame ? window.requestAnimationFrame(render) : setTimeout(render, 16); }
  function go() {
    var a = document.activeElement;
    if (a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) a.blur();
    S.dirty = false; schedule();
  }
  var toastT = 0;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = 'toast' + (err ? ' err' : ''); }, err ? 4200 : 2400);
  }
  function fail(e) {
    var c = e && (e.code || '');
    if (/permission/.test(c)) toast('This sign-in is not allowed to change that.', true);
    else if (/not-found/.test(c)) toast('That item no longer exists. Refresh and try again.', true);
    else if (/unavailable|network/.test(c)) toast('No connection. Changes will sync when you are back online.', true);
    else toast('Could not save. Try again.', true);
    if (window.console) console.warn(e);
  }
  function confirmTap(key, fn) {
    if (S.armed === key) { S.armed = null; fn(); schedule(); return; }
    S.armed = key;
    setTimeout(function () { if (S.armed === key) { S.armed = null; schedule(); } }, 4000);
    schedule();
  }
  function bankName() { return S.settings.bankName || DEFAULTS.bankName; }

  /* ================= derived data ================= */
  function activePeople() { return S.people.filter(function (p) { return p.active !== false; }); }
  function person(id) { return find(S.people, function (p) { return p.id === id; }); }
  function pIndex(p) { return p ? ((typeof p.order === 'number' ? p.order : 0) % 7) : 0; }
  function pname(id) { var p = person(id); return p ? p.name : 'Unknown'; }
  function isPerson(id) { return !!person(id); }
  function isDad(id) { return !!id && id === S.settings.dadPid; }
  /* grown-ups have a bank account and chores but no pet: the allowance account, plus anyone marked adult in Setup */
  function isAdult(id) { if (!id) return false; if (isDad(id)) return true; var p = person(id); return !!(p && p.adult); }
  function kids() { return activePeople().filter(function (p) { return !isAdult(p.id); }); }
  function catName(c) { return c.cat || 'Other'; }
  function catList(chores) {
    var present = [];
    chores.forEach(function (c) { var n = catName(c); if (present.indexOf(n) < 0) present.push(n); });
    var out = (S.settings.catOrder || []).filter(function (n) { return present.indexOf(n) >= 0; });
    present.filter(function (n) { return out.indexOf(n) < 0 && n !== 'Other'; }).sort().forEach(function (n) { out.push(n); });
    if (present.indexOf('Other') >= 0) out.push('Other');
    return out;
  }
  /* What a chore gives the pet: 'food' (food coins), 'clean' (care coins), 'rest' (tuck-ins), 'energy' (play time) or '' (nothing). */
  function needOf(c) {
    if (c.need === 'none') return '';
    if (c.need) return c.need;
    var n = (c.name || '').toLowerCase();
    if (/shower|bathe|teeth|hair|ears cleaned|nails? clipped|fingernail|toenail/.test(n)) return 'clean';
    if (catName(c) === 'Bedtime') return 'rest';
    if (/jumping|push ?ups|burpee|outside|exercise|karate|walk|run |bike|swim/.test(n)) return 'energy';
    if (catName(c) === 'Health & Fitness') return 'energy';
    if (/^eat /.test(n)) return '';
    if (catName(c) === 'Meals & Kitchen' || /dish|sweep|dining|counter|kitchen|cook|dinner|breakfast|lunch|grocer|compost|wipe.*table/.test(n)) return 'food';
    return '';
  }
  var NEED_LABEL = { '': 'Nothing', none: 'Nothing', food: 'Food coins', clean: 'Care coins', rest: 'Tuck-in', energy: 'Play time' };
  function queuedIds() {
    var m = {};
    S.queue.forEach(function (q) { q.entries.forEach(function (e) { m[e.id] = q.status; }); });
    return m;
  }
  function derive() {
    var t = today(), wk = weekStart(t), tot = {}, pend = 0, qd = queuedIds();
    function T(id) { return tot[id] || (tot[id] = { today: 0, week: 0, pend: 0, unpaid: 0, pendN: 0 }); }
    S.entries.forEach(function (e) {
      var x = T(e.pid);
      if (e.status === 'approved') {
        if (e.date === t) x.today += e.pts;
        if (e.date >= wk) x.week += e.pts;
        if (!e.paid) x.unpaid += e.pts;
      } else if (e.status === 'pending' && !qd[e.id]) { x.pend += e.pts; x.pendN++; pend++; }
    });
    var reqPend = S.reqs.filter(function (r) { return r.status === 'pending'; });
    return { t: t, wk: wk, T: T, pendCount: pend, reqPend: reqPend };
  }
  function tagFor(s) {
    return s === 'approved' ? '<span class="tag ok">Approved</span>' : s === 'rejected' ? '<span class="tag no">Rejected</span>' : '<span class="tag pend">Waiting</span>';
  }
  function logTarget() { return S.admin ? S.sel : (isPerson(S.me) ? S.me : null); }
  function parentName(id) { var p = find(S.settings.parents || [], function (x) { return x.id === id; }); return p ? p.name : ''; }

  /* ================= writes ================= */
  function petGrantOps(e, sign) {
    var st = S.settings, d = {}, need = e.need || '';
    if (need === 'food') d.coinsFood = DB.inc(sign * (Number(st.foodCoins) || 10));
    else if (need === 'clean') d.coinsCare = DB.inc(sign * (Number(st.careCoins) || 10));
    else if (need === 'rest') d.tokRest = DB.inc(sign);
    else if (need === 'energy') d.tokEnergy = DB.inc(sign);
    else return [];
    return [{ t: 'merge', c: 'pets', id: e.pid, d: d }];
  }
  function txOps(pid, cents, kind, memo, extra) {
    return [
      { t: 'set', c: 'txns', id: DB.newId('txns'), d: assign({ pid: pid, cents: cents, kind: kind, memo: memo || '', ts: Date.now(), date: today(), by: S.parent ? S.parent.id : '' }, extra || {}) },
      { t: 'update', c: 'people', id: pid, d: { balance: DB.inc(cents) } }
    ];
  }
  function bountyOps(e) {
    if (!(e.bountyCents > 0) || e.bountyPaid) return [];
    return txOps(e.pid, e.bountyCents, 'bounty', 'Bounty: ' + e.name + (e.share && e.share < 100 ? ' (' + e.share + '% share)' : ''));
  }
  function bankTx(pid, cents, kind, memo, extraOps) { return DB.commit(txOps(pid, cents, kind, memo).concat(extraOps || [])); }
  function autoApprove() { return S.admin || S.settings.requireApproval === false; }
  function newEntry(pid, date, chore, extra) {
    return assign({ pid: pid, cid: chore.id, name: chore.name, pts: chore.pts, cat: chore.cat || '', need: needOf(chore), date: date, ts: Date.now(), status: 'pending', paid: false, by: S.me || '' }, extra || {});
  }
  function saveEntries(list) {
    var ops = [], auto = autoApprove();
    list.forEach(function (e) {
      if (auto) {
        e.status = 'approved'; e.decidedTs = Date.now(); e.decidedBy = S.parent ? S.parent.id : '';
        ops = ops.concat(petGrantOps(e, 1), bountyOps(e));
        if (e.bountyCents > 0) e.bountyPaid = true;
      }
      ops.unshift({ t: 'set', c: 'entries', id: DB.newId('entries'), d: e });
    });
    return DB.commit(ops);
  }
  function addEntry(pid, date, chore) { return saveEntries([newEntry(pid, date, chore)]).catch(fail); }
  function addQuest(chore, shares, date) {
    var qid = DB.newId('entries'), pids = Object.keys(shares).filter(function (k) { return shares[k] > 0; });
    var bounty = Number(chore.bountyCents) || 0, list = [], given = 0, biggest = null;
    pids.forEach(function (pid) {
      var sh = shares[pid], cents = Math.floor(bounty * sh / 100);
      given += cents;
      var e = newEntry(pid, date, chore, { questId: qid, share: sh, pts: Math.max(1, Math.round(chore.pts * sh / 100)), bountyCents: cents, bountyPaid: false });
      if (!biggest || sh > biggest.share) biggest = e;
      list.push(e);
    });
    if (biggest) biggest.bountyCents += bounty - given;
    return saveEntries(list);
  }
  function removeEntry(e) {
    if (e.paid) { toast('Already paid on a payday. Use a withdrawal in the bank to take it back.', true); return; }
    if (e.bountyPaid) { toast('The bounty was already paid. Use a withdrawal in the bank to take it back.', true); return; }
    var ops = [{ t: 'delete', c: 'entries', id: e.id }];
    if (e.status === 'approved') ops = ops.concat(petGrantOps(e, -1));
    return DB.commit(ops).catch(fail);
  }
  function setStatus(list, status) {
    var now = Date.now(), by = S.parent ? S.parent.id : '', ops = [];
    list.forEach(function (e) {
      if (e.status === status) return;
      var d = { status: status, decidedTs: now, decidedBy: by };
      if (status === 'approved') {
        ops = ops.concat(petGrantOps(e, 1), bountyOps(e));
        if (e.bountyCents > 0 && !e.bountyPaid) d.bountyPaid = true;
      } else if (e.status === 'approved') ops = ops.concat(petGrantOps(e, -1));
      ops.unshift({ t: 'update', c: 'entries', id: e.id, d: d });
    });
    return ops.length ? DB.commit(ops) : Promise.resolve();
  }
  function saveSettings(p) {
    if (S.settingsDoc) return DB.commit([{ t: 'update', c: 'meta', id: 'settings', d: p }]);
    return DB.commit([{ t: 'set', c: 'meta', id: 'settings', d: assign({}, S.settings, p) }]);
  }
  /* Weekly allowance: deposits for each allowance day since the last one paid (up to 8), when a parent unlocks. */
  function lastAllowanceDay(day) { var d = parseD(today()); while (d.getDay() !== day) d.setDate(d.getDate() - 1); return dstr(d); }
  function runAllowance() {
    var st = S.settings, day = Number(st.allowanceDay);
    if (!st.dadPid || !isPerson(st.dadPid) || !(st.allowanceCents > 0) || !(day >= 0 && day <= 6)) return;
    var due = lastAllowanceDay(day);
    if (!st.allowanceLast) { saveSettings({ allowanceLast: due }).catch(function () {}); return; }
    if (st.allowanceLast >= due) return;
    var ops = [], d = addDays(st.allowanceLast, 7), n = 0;
    while (d <= due && n < 8) { ops = ops.concat(txOps(st.dadPid, st.allowanceCents, 'allowance', 'Weekly allowance (' + fmtDate(d) + ')')); d = addDays(d, 7); n++; }
    ops.push({ t: 'update', c: 'meta', id: 'settings', d: { allowanceLast: due } });
    DB.commit(ops).then(function () { toast(money(st.allowanceCents * n) + ' weekly allowance deposited to ' + pname(st.dadPid)); }, fail);
  }

  /* ================= approval queue (swipe + undo) ================= */
  function queueDecision(units, status, label) {
    var entries = [];
    units.forEach(function (u) { entries = entries.concat(u.entries); });
    if (!entries.length) return;
    var q = { id: Date.now() + Math.random(), entries: entries, status: status, label: label || (units.length + ' item' + (units.length > 1 ? 's' : '')) };
    q.timer = setTimeout(function () { commitQueued(q); }, UNDO_MS);
    S.queue.push(q);
    go();
  }
  function commitQueued(q) {
    clearTimeout(q.timer);
    var i = S.queue.indexOf(q); if (i < 0) return;
    S.queue.splice(i, 1);
    setStatus(q.entries, q.status).then(schedule, function (e) { fail(e); schedule(); });
  }
  function flushQueue() { S.queue.slice().forEach(commitQueued); }
  function undoLast() {
    var q = S.queue.pop(); if (!q) return;
    clearTimeout(q.timer); toast('Undone'); go();
  }

  /* ================= parent mode ================= */
  function touchAdmin() {
    S.lastActive = Date.now();
    if (!S.admin) return;
    clearTimeout(S.adminTimer);
    if (MODE === 'bank' && keepInfo()) return;
    S.adminTimer = setTimeout(function () { setAdmin(null); toast('Parent mode locked after 10 minutes'); }, 10 * 60 * 1000);
  }
  function setAdmin(parent) {
    if (!parent) flushQueue();
    S.admin = !!parent; S.parent = parent; clearTimeout(S.adminTimer);
    S.adminOpen = MODE === 'bank' && !parent;
    if (parent) {
      touchAdmin();
      if (!S.sel || !isPerson(S.sel)) S.sel = isPerson(S.me) ? S.me : (kids()[0] || activePeople()[0] || {}).id;
      runAllowance();
    } else { S.edit = null; S.bankForm = null; S.quest = null; S.avEditFor = null; }
    go();
  }
  function needAdmin() {
    if (S.admin) return true;
    toast('A parent needs to unlock that.', true);
    openAdmin();
    return false;
  }
  function openAdmin() { S.adminOpen = true; S.picking = false; schedule(); setTimeout(function () { var i = $('#pin'); if (i) i.focus(); }, 80); }
  function pinPanel() {
    if (!S.adminOpen || S.admin || S.phase !== 'app') return '';
    var cancel = MODE === 'bank' ? '' : '<button class="btn" type="button" data-act="adminClose">Cancel</button>';
    return '<form class="apanel" data-form="pin" data-mode="unlock"><h2>' + (MODE === 'bank' ? esc(bankName()) + ' is locked' : 'Parent unlock') + '</h2>' +
      '<div class="wrap end"><label class="field w-sm" for="pin"><span>Parent PIN</span><input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn primary" type="submit">Unlock</button>' + cancel + '</div>' +
      (MODE === 'bank' ? '<div class="checks"><label><input type="checkbox" id="pinKeep" checked>Keep me unlocked on this phone for ' + KEEP_DAYS + ' days</label></div>' : '') + '</form>';
  }
  function pinTaken(pin, exceptId) {
    return (S.settings.parents || []).some(function (p) { return p.id !== exceptId && sha256(p.salt + ':' + pin) === p.hash; });
  }
  function makeParent(name, pin) { var salt = DB.newId('meta'); return { id: DB.newId('meta'), name: name, salt: salt, hash: sha256(salt + ':' + pin) }; }
  function submitPin(mode, pin, pin2, name, done) {
    if (!/^\d{4,8}$/.test(pin)) { toast('Use 4 to 8 digits.', true); return; }
    var parents = (S.settings.parents || []).slice();
    if (mode === 'add' || mode === 'change') {
      if (pin !== pin2) { toast('The two PINs do not match.', true); return; }
      if (pinTaken(pin, mode === 'change' ? S.parent.id : null)) { toast('That PIN is already used by another parent. Pick a different one.', true); return; }
      if (mode === 'change') {
        var salt = DB.newId('meta');
        parents = parents.map(function (p) { return p.id === S.parent.id ? assign({}, p, { salt: salt, hash: sha256(salt + ':' + pin) }) : p; });
      } else { name = trim(name) || 'Parent ' + (parents.length + 1); parents.push(makeParent(name, pin)); }
      saveSettings({ parents: parents }).then(function () { toast(mode === 'add' ? name + ' can now unlock with their PIN' : 'PIN changed'); if (done) done(); }, fail);
      return;
    }
    if (Date.now() < S.lockUntil) { toast('Too many tries. Wait a moment.', true); return; }
    var hit = find(parents, function (p) { return sha256(p.salt + ':' + pin) === p.hash; });
    if (hit) {
      S.fails = 0;
      var kp = $('#pinKeep');
      if (MODE === 'bank') LS.set('cl.keep', kp && kp.checked ? JSON.stringify({ id: hit.id, until: Date.now() + KEEP_DAYS * 864e5 }) : null);
      setAdmin({ id: hit.id, name: hit.name }); toast('Hi ' + hit.name + '. ' + (MODE === 'bank' ? 'Unlocked.' : 'Parent mode is on.'));
    }
    else {
      S.fails++;
      if (S.fails >= 5) { S.lockUntil = Date.now() + 30000; S.fails = 0; toast('Too many wrong PINs. Try again in 30 seconds.', true); }
      else toast('Wrong PIN.', true);
      var i = $('#pin'); if (i) { i.value = ''; i.focus(); }
    }
  }

  /* ================= render ================= */
  function tabsFor() {
    if (MODE === 'bank') return [['approvals', 'Approvals'], ['bank', 'Accounts'], ['log', 'Chores'], ['pet', 'Pets'], ['history', 'History'], ['setup', 'Setup']];
    if (S.admin) return [['log', 'Chores'], ['pet', 'Pets'], ['approvals', 'Approvals'], ['bank', 'Bank'], ['history', 'History'], ['setup', 'Setup']];
    if (isAdult(S.me)) return [['log', 'Chores'], ['history', 'History']];
    return [['log', 'Chores'], ['pet', 'My Pet'], ['history', 'History']];
  }
  function header(D) {
    var p = person(S.me);
    var who = p ? '<span class="dot p' + pIndex(p) + '"></span>' + esc(p.name) : (S.me === '@parent' ? 'Parent' : 'Who?');
    var showTabs = S.phase === 'app' && !(MODE === 'bank' && !S.admin) && !S.picking && !!S.me;
    var tabs = tabsFor().map(function (t) {
      var badge = '';
      if (t[0] === 'approvals' && D && D.pendCount) badge = '<span class="badge">' + D.pendCount + '</span>';
      if (t[0] === 'bank' && D && D.reqPend.length && S.admin) badge = '<span class="badge">' + D.reqPend.length + '</span>';
      return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + badge + '</button>';
    }).join('');
    var title = MODE === 'bank' ? '<h1 class="bod-title">' + esc(bankName()) + '</h1>' : '<h1>Chore Ledger</h1>';
    var right = S.phase !== 'app' || (MODE === 'family' && !ROLE) ? '' : MODE === 'bank'
      ? (S.admin ? '<span class="modeflag">' + esc(S.parent.name) + '</span><button class="btn small" type="button" data-act="adminToggle">Lock</button>' : '')
      : '<button class="who-btn" type="button" data-act="pick">' + who + '</button>' +
        '<button class="btn small" type="button" data-act="adminToggle">' + (S.admin ? 'Lock' : 'Parent') + '</button>';
    return '<header class="top' + (S.admin ? ' admin' : '') + (MODE === 'bank' ? ' bod' : '') + '"><div class="brand">' + title + '<div class="right row-flex">' + right + '</div></div>' +
      (DB.mode === 'demo' ? '<div class="demo">Demo mode: saved on this device only</div>' : '') +
      (showTabs ? '<nav class="tabs' + (tabsFor().length > 4 ? ' many' : '') + '" role="tablist" aria-label="Sections">' + tabs + '</nav>' : '') + '</header>';
  }
  var lastShell = '';
  function render() {
    raf = 0;
    var ae = document.activeElement;
    var typing = ae && view.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.type !== 'search' && ae.type !== 'file';
    if (typing && (S.phase === 'app' || S.phase === 'wizard')) { S.dirty = true; return; }
    S.dirty = false;
    if (S.phase === 'boot') { root.innerHTML = '<p class="note" style="margin-top:40px;text-align:center">Loading...</p>'; lastShell = ''; return; }
    if (S.phase === 'error') { root.innerHTML = '<div class="banner" style="margin-top:24px"><strong>Could not start.</strong><br>' + esc(S.err) + '</div>'; lastShell = ''; return; }
    if (S.phase === 'login') { renderLogin(); lastShell = ''; return; }
    if (!allReady()) { root.innerHTML = '<p class="note" style="margin-top:40px;text-align:center">Loading household data...</p>'; lastShell = ''; return; }
    if (!S.settingsDoc) S.phase = 'wizard'; else if (S.phase === 'wizard') S.phase = 'app';
    if (S.phase === 'app' && MODE === 'bank' && !S.admin && !S.keepTried) {
      S.keepTried = true;
      var kp = keepInfo(), hitK = kp && find(S.settings.parents || [], function (p) { return p.id === kp.id; });
      if (hitK) { S.admin = true; S.parent = { id: hitK.id, name: hitK.name }; S.adminOpen = false; if (!S.sel) S.sel = (kids()[0] || activePeople()[0] || {}).id; runAllowance(); }
    }
    var D = S.phase === 'app' ? derive() : null;
    var tabs = tabsFor().map(function (t) { return t[0]; });
    if (tabs.indexOf(S.tab) < 0) S.tab = tabs[0];
    var shell = header(D) + pinPanel();
    if (shell !== lastShell || !document.getElementById('view')) {
      root.innerHTML = shell + '<main id="view"></main><div id="undoBar"></div>';
      lastShell = shell;
      view = $('#view');
    }
    renderUndoBar();
    if (S.phase === 'wizard') { view.setAttribute('data-view', 'wizard'); renderWizard(); return; }
    if (MODE === 'bank' && !S.admin) {
      view.setAttribute('data-view', 'locked');
      view.innerHTML = '<div class="stack"><p class="note">This is the parent app. Enter a parent PIN to open it.</p>' +
        '<div class="card stack tight"><h2>Is this a kid’s device?</h2><p class="note">Switch it to the kids’ app with the pet game. A parent can switch it back in Setup.</p>' +
        '<div class="wrap"><button class="btn" type="button" data-act="roleKids">Use the kids’ app here</button></div></div></div>';
      return;
    }
    if (MODE === 'family' && !ROLE) { view.setAttribute('data-view', 'role'); renderRoleChoice(); return; }
    if (MODE === 'family' && (S.picking || !(isPerson(S.me) || S.me === '@parent'))) { view.setAttribute('data-view', 'pick'); renderPicker(); return; }
    if (view.getAttribute('data-view') !== S.tab) { view.innerHTML = ''; view.setAttribute('data-view', S.tab); }
    if (S.tab === 'log') renderLog(D);
    else if (S.tab === 'pet') { if (window.Pets) window.Pets.render(view, D); else view.innerHTML = '<p class="note">The pet game did not load.</p>'; }
    else if (S.tab === 'approvals') renderApprovals(D);
    else if (S.tab === 'bank') renderBank(D);
    else if (S.tab === 'history') renderHistory(D);
    else renderSetup(D);
  }
  function allReady() { var r = S.ready; return r.people && r.chores && r.entries && r.txns && r.reqs && r.settings && r.pets && r.adv; }
  function renderUndoBar() {
    var el = $('#undoBar'); if (!el) return;
    var q = S.queue[S.queue.length - 1];
    if (!q) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'undo-bar';
    el.innerHTML = '<span class="grow">' + (q.status === 'approved' ? 'Approved ' : 'Denied ') + esc(q.label) + (S.queue.length > 1 ? ' (+' + (S.queue.length - 1) + ' more)' : '') + '</span>' +
      '<button class="btn small" type="button" data-act="undo">Undo</button>';
  }

  /* ----- login (Firebase mode) ----- */
  function renderLogin() {
    root.innerHTML = '<div class="picker"><h1>' + (MODE === 'bank' ? 'Family bank' : 'Chore Ledger') + '</h1><p class="note" style="margin:6px 0 16px">Sign in once on this device with the household account.</p>' +
      '<form data-form="login" class="stack tight"><label class="field" for="lgEmail"><span>Household email</span><input id="lgEmail" type="email" autocomplete="username"></label>' +
      '<label class="field" for="lgPw"><span>Password</span><input id="lgPw" type="password" autocomplete="current-password"></label>' +
      '<button class="btn primary block" type="submit">Sign in</button></form></div>';
  }

  /* ----- first-run setup ----- */
  function renderWizard() {
    var w = S.wiz, imp = w.imported;
    var h = '<div class="picker wide stack"><div><h2>Set up your household</h2><p class="note">This runs once. Everything can be changed later in Setup.</p></div>' +
      '<form class="card stack tight" data-form="wizard">' +
      '<label class="field" for="wzBank"><span>Name of the family bank</span><input type="text" id="wzBank" maxlength="30" placeholder="Family Bank" value="' + esc(imp && imp.bankName || '') + '"></label>' +
      '<div class="wrap end"><label class="field w-md" for="wzName"><span>Your name (parent)</span><input type="text" id="wzName" maxlength="24" placeholder="Dad"></label>' +
      '<label class="field w-sm" for="wzPin"><span>Parent PIN</span><input type="password" id="wzPin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="wzPin2"><span>Repeat PIN</span><input type="password" id="wzPin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label></div>' +
      '<p class="note">Each parent gets their own 4 to 8 digit PIN. Add the other parent in Setup afterwards.</p>';
    if (imp) {
      h += '<div class="banner info">Loaded <strong>' + imp.people.length + ' people</strong> and <strong>' + imp.chores.length + ' chores</strong> from the family file. <button class="btn small" type="button" data-act="wzClearImport">Use the form instead</button></div>';
    } else {
      h += '<fieldset><legend>Family members who do chores (you can include yourself)</legend>' +
        (w.people.length ? '<div class="wrap">' + w.people.map(function (n, i) { return '<span class="chip">' + esc(n) + '<button type="button" class="x" data-act="wzDel" data-i="' + i + '" aria-label="Remove ' + esc(n) + '">&times;</button></span>'; }).join('') + '</div>' : '') +
        '<div class="wrap end" style="margin-top:6px"><div class="field w-md"><input type="text" id="wzPerson" maxlength="30" placeholder="Name" aria-label="Family member name"></div><button class="btn" type="button" data-act="wzAdd">Add</button>' +
        '<button class="btn small" type="button" data-act="wzSample">Use a sample family</button></div></fieldset>' +
        '<fieldset><legend>Chores</legend><div class="checks" style="display:block">' +
        '<label><input type="radio" name="wzStarter" value="1"' + (w.starter ? ' checked' : '') + '>Start with the starter list (' + ((window.CL_STARTER || []).length) + ' chores, everyone assigned)</label><br>' +
        '<label><input type="radio" name="wzStarter" value="0"' + (w.starter ? '' : ' checked') + '>Start with no chores</label></div></fieldset>';
    }
    h += '<fieldset><legend>What is this device?</legend><div class="checks" style="display:block">' +
      '<label><input type="radio" name="wzRole" value="parent"' + (MODE === 'bank' ? ' checked' : '') + '>My own phone: open the parent app (approvals, bank, setup) here</label><br>' +
      '<label><input type="radio" name="wzRole" value="kids"' + (MODE === 'bank' ? '' : ' checked') + '>A shared family device: open the kids’ app (chores and pet game) here</label></div></fieldset>';
    h += '<button class="btn primary block" type="submit">Create household</button></form>' +
      '<div class="card stack tight"><h2>Have a family file?</h2><p class="note">A family file holds your people, chores and who does what. It is private to you and not part of the app.</p>' +
      '<input type="file" id="wzFile" accept=".json,application/json"></div></div>';
    view.innerHTML = h;
  }
  function wizAddPerson() {
    var i = $('#wzPerson'), n = trim(i && i.value);
    if (!n) return;
    if (S.wiz.people.indexOf(n) < 0) S.wiz.people.push(n);
    i.value = ''; renderWizard(); var ni = $('#wzPerson'); if (ni) ni.focus();
  }
  function wizCreate() {
    var name = trim(val('wzName')) || 'Parent', pin = val('wzPin'), pin2 = val('wzPin2'), bank = trim(val('wzBank')) || 'Family Bank';
    if (!/^\d{4,8}$/.test(pin)) { toast('Use 4 to 8 digits for the PIN.', true); return; }
    if (pin !== pin2) { toast('The two PINs do not match.', true); return; }
    var imp = S.wiz.imported, ops = [], parent = makeParent(name, pin), st;
    var starterEl = $$('input[name=wzStarter]').filter(function (x) { return x.checked; })[0];
    if (imp) {
      imp.people.forEach(function (p, i) { ops.push({ t: 'set', c: 'people', id: p.id, d: { name: p.name, order: typeof p.order === 'number' ? p.order : i, active: p.active !== false, balance: 0 } }); });
      imp.chores.forEach(function (c, i) { var d = assign({}, c); delete d.id; if (typeof d.order !== 'number') d.order = i; if (d.active === undefined) d.active = true; ops.push({ t: 'set', c: 'chores', id: c.id || DB.newId('chores'), d: d }); });
      st = assign({}, DEFAULTS, imp.settings || {});
    } else {
      if (!S.wiz.people.length) { toast('Add at least one family member.', true); return; }
      var ids = [];
      S.wiz.people.forEach(function (n, i) {
        var id = slug(n), k = 1; while (ids.indexOf(id) >= 0) id = slug(n) + '-' + (++k);
        ids.push(id);
        ops.push({ t: 'set', c: 'people', id: id, d: { name: n, order: i, active: true, balance: 0 } });
      });
      if (starterEl && starterEl.value === '1') (window.CL_STARTER || []).forEach(function (c, i) {
        ops.push({ t: 'set', c: 'chores', id: 'c' + (1000 + i), d: { name: c.name, pts: c.pts, cat: c.cat, need: c.need || '', who: ids.slice(), order: i, active: true, bountyCents: c.bountyCents || 0, major: !!c.major, majorEach: !!c.majorEach, majorDays: c.majorDays || [] } });
      });
      st = assign({}, DEFAULTS, { catOrder: window.CL_STARTER_CATS || [] });
    }
    st.bankName = bank; st.parents = [parent]; st.seeded = Date.now();
    if (st.dadPid) st.allowanceLast = lastAllowanceDay(Number(st.allowanceDay));
    ops.push({ t: 'set', c: 'meta', id: 'settings', d: st });
    var roleEl = $$('input[name=wzRole]').filter(function (x) { return x.checked; })[0], role = roleEl ? roleEl.value : 'kids';
    DB.commit(ops).then(function () {
      LS.set('cl.role', role); ROLE = role;
      if (role === 'parent') LS.set('cl.keep', JSON.stringify({ id: parent.id, until: Date.now() + KEEP_DAYS * 864e5 }));
      if ((role === 'parent') !== (MODE === 'bank')) { if (role === 'kids' && window.CL_MODE === 'bank') location.href = 'index.html'; else location.reload(); return; }
      S.wiz = { people: [], starter: true, imported: null }; S.phase = 'app';
      S.me = '@parent'; setAdmin({ id: parent.id, name: parent.name }); S.tab = 'setup';
      toast('Household created. Parent mode is on.');
    }, fail);
  }
  function wizImport(file) {
    if (!file || !window.FileReader) { toast('This browser cannot read files.', true); return; }
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !d.people || !d.people.length || !d.chores) throw new Error('bad');
        S.wiz.imported = d; renderWizard(); toast('Family file loaded. Add your parent name and PIN, then create.');
      } catch (e) { toast('That file is not a Chore Ledger family file.', true); }
    };
    r.readAsText(file);
  }
  function exportFamily() {
    var st = S.settings, data = {
      app: 'chore-ledger', version: 1, bankName: st.bankName,
      settings: { catOrder: st.catOrder, centsPerPoint: st.centsPerPoint, petEvolve1Cents: st.petEvolve1Cents, petEvolve2Cents: st.petEvolve2Cents, dadPid: st.dadPid, allowanceCents: st.allowanceCents, allowanceDay: st.allowanceDay, requireApproval: st.requireApproval },
      people: S.people.map(function (p) { return { id: p.id, name: p.name, order: p.order, active: p.active !== false }; }),
      chores: S.chores.map(function (c) { var o = assign({}, c); return o; })
    };
    try {
      var a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 1));
      a.download = 'family-file-' + today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { toast('This browser cannot download files.', true); }
  }

  /* ----- one-time device question on a new device ----- */
  function renderRoleChoice() {
    view.innerHTML = '<div class="picker stack"><div><h2>Who uses this device?</h2><p class="note">This is asked once. A parent can change it later in Setup.</p></div>' +
      '<button type="button" class="role-btn" data-act="roleKids"><strong>Kids</strong><small>Shared devices. Each kid picks their name, logs chores and plays the pet game.</small></button>' +
      '<button type="button" class="role-btn" data-act="roleParent"><strong>A parent</strong><small>Your own phone. Opens the parent app: approvals, bank accounts, chores for anyone and setup. Locked with your PIN.</small></button></div>';
  }

  /* ----- profile picker (every time the app opens, since devices are shared) ----- */
  function renderPicker() {
    var ps = activePeople();
    view.innerHTML = '<div class="picker"><h2>Who is using the app?</h2>' +
      ps.map(function (p) {
        var pet = window.Pets ? window.Pets.miniHtml(p.id) : '';
        return '<button type="button" class="chip pick p' + pIndex(p) + (p.id === S.lastMe ? ' last' : '') + '" data-act="choose" data-pid="' + esc(p.id) + '">' + (pet || '<span class="dot"></span>') + '<span class="grow">' + esc(p.name) + '</span></button>';
      }).join('') +
      '<button type="button" class="chip pick" data-act="choose" data-pid="@parent"><span class="dot"></span><span class="grow">Parent</span></button>' +
      '<p class="note" style="margin-top:10px">Pick your name each time. The app comes back here after 5 minutes without use.</p></div>';
  }

  /* ----- Chores (log) ----- */
  function renderLog(D) {
    var pid = logTarget();
    if (!pid) {
      view.innerHTML = '<div class="banner info">Unlock parent mode to log chores for anyone, or tap the name button at the top to pick a person.' +
        '<div style="margin-top:10px"><button class="btn primary" type="button" data-act="adminOpen">Parent unlock</button></div></div>';
      return;
    }
    if (!$('#logList')) {
      view.innerHTML = '<section class="stack">' +
        '<div id="chips" class="wrap"></div>' +
        '<div class="wrap end"><label class="field w-md" for="date"><span>Date</span><input type="date" id="date"></label>' +
        '<button class="btn" id="todayBtn" data-act="today" type="button">Today</button></div>' +
        '<div class="head-line" id="logHead"></div>' +
        '<p class="note" id="logNote"></p>' +
        '<div id="passBox"></div>' +
        '<div id="questBox"></div>' +
        '<div class="cats" id="cats"></div>' +
        '<div class="wrap"><div class="field w-lg"><input type="search" id="q" placeholder="Search chores" aria-label="Search chores"></div>' +
        '<div class="field w-md"><select id="sort" aria-label="Sort chores"><option value="cat">By category</option><option value="routine">Routine order</option><option value="used">Most used</option><option value="points">Most points</option><option value="name">A to Z</option></select></div></div>' +
        '<ul class="list" id="logList"></ul></section>';
      $('#q').value = S.q; $('#sort').value = S.sort;
    }
    $('#chips').innerHTML = S.admin ? activePeople().map(function (p) {
      var x = D.T(p.id);
      return '<button type="button" class="chip p' + pIndex(p) + '" data-act="sel" data-pid="' + esc(p.id) + '" aria-pressed="' + (p.id === pid) + '"><span class="dot"></span>' + esc(p.name) +
        (x.pendN ? '<b title="waiting for approval">' + x.pendN + '</b>' : '') + '</button>';
    }).join('') : '';
    $('#chips').hidden = !S.admin;
    var di = $('#date'); if (di && document.activeElement !== di) di.value = S.date;
    $('#todayBtn').hidden = S.date === D.t;
    var req = S.settings.requireApproval !== false;
    $('#logNote').textContent = !req ? 'Approved chores feed your pet.' : (S.admin ? 'Parent mode: chores you log are approved right away.' : 'Chores count and feed your pet once a parent approves them.');
    var mine = S.entries.filter(function (e) { return e.pid === pid && e.date === S.date; });
    var ok = 0, pe = 0;
    mine.forEach(function (e) { if (e.status === 'approved') ok += e.pts; else if (e.status === 'pending') pe += e.pts; });
    $('#logHead').innerHTML = '<strong>' + esc(pname(pid)) + '</strong> &middot; <span class="mono">' + n0(ok) + '</span> pts approved' +
      (pe ? ', <span class="mono">' + n0(pe) + '</span> waiting' : '') + ' ' + (S.date === D.t ? 'today' : 'on ' + esc(fmtDate(S.date))) +
      (S.date !== D.t ? '<span class="pill">Past date</span>' : '');
    renderQuestBox();
    renderPassBox(pid);
    updateLogList(pid);
  }
  function renderPassBox(pid) {
    var box = $('#passBox'); if (!box || !window.ADV) return;
    if (isAdult(pid)) { box.innerHTML = ''; return; }
    var p = ADV.passInfo(pid), hs = p.house, vac = p.vacation;
    if (!hs.total && !vac) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="passline' + (p.has ? ' ok' : '') + (hs.clean ? ' shine' : '') + '">' +
      (vac ? '<strong>Vacation mode.</strong> Travel chores only, and adventures are open all day.' :
        (p.has ? '<strong>' + (p.golden ? 'Golden Adventure Pass!' : 'Adventure Pass earned!') + '</strong> ' + p.left + ' minutes today.' :
          '<strong>Adventure Pass:</strong> ' + p.done + ' of ' + p.need + ' big jobs approved.') +
        ' <span class="note">House clean: ' + hs.done + '/' + hs.total + (hs.clean ? ', rare egg hunting is on!' : '') + '</span>') + '</div>';
  }
  function renderQuestBox() {
    var box = $('#questBox'); if (!box) return;
    var q = S.quest, c = q && find(S.chores, function (x) { return x.id === q.cid; });
    if (!c) { box.innerHTML = ''; return; }
    var total = 0; Object.keys(q.shares).forEach(function (k) { total += q.shares[k]; });
    var ps = activePeople().filter(function (p) { return (c.who || []).indexOf(p.id) >= 0 || q.shares[p.id]; });
    box.innerHTML = '<div class="card attn"><h2>Bounty: ' + esc(c.name) + '</h2>' +
      '<p class="note">' + money(c.bountyCents) + ' plus ' + c.pts + ' pts. If others helped, split it by how much of the work each person did.</p>' +
      '<div class="list">' + ps.map(function (p) {
        var v = q.shares[p.id] || 0;
        return '<div class="row' + (v ? ' done' : '') + '"><span class="dot p' + pIndex(p) + '" style="margin-right:8px"></span><div class="rname">' + esc(p.name) +
          (v ? '<div class="meta note">' + money(Math.floor(c.bountyCents * v / 100)) + '</div>' : '') + '</div>' +
          '<div class="step"><button type="button" data-act="qshare" data-pid="' + esc(p.id) + '" data-d="-10"' + (v ? '' : ' disabled') + ' aria-label="Less for ' + esc(p.name) + '">&minus;</button>' +
          '<span class="n" style="min-width:48px">' + v + '%</span><button type="button" class="plus" data-act="qshare" data-pid="' + esc(p.id) + '" data-d="10"' + (total >= 100 ? ' disabled' : '') + ' aria-label="More for ' + esc(p.name) + '">+</button></div></div>';
      }).join('') + '</div>' +
      '<p class="mono' + (total === 100 ? '' : ' warn-text') + '" style="margin:0">Total ' + total + '%' + (total === 100 ? '' : ' (needs to be 100%)') + '</p>' +
      '<div class="wrap"><button class="btn primary" type="button" data-act="qsave"' + (total === 100 ? '' : ' disabled') + '>Log it</button><button class="btn" type="button" data-act="qcancel">Cancel</button></div></div>';
  }
  function rowHtml(c, x) {
    var n = x ? x.a + x.p : 0, tags = '';
    if (c.bountyCents > 0) tags += '<span class="tag bounty">' + money(c.bountyCents) + ' bounty</span>';
    if (c.major && window.ADV && ADV.bigJobsToday().indexOf(c) >= 0) tags += '<span class="tag big">Big job</span>';
    if (x) {
      if (x.p) tags += '<span class="tag pend">' + x.p + ' waiting</span>';
      if (x.a) tags += '<span class="tag ok">' + x.a + ' approved</span>';
      if (x.r) tags += '<span class="tag no">' + x.r + ' rejected</span>';
    }
    return '<li class="row' + (n ? ' done' : '') + '"><div class="rname">' + esc(c.name) + (tags ? '<div class="meta">' + tags + '</div>' : '') + '</div>' +
      '<span class="pts mono">+' + c.pts + '</span>' +
      '<div class="step"><button type="button" data-act="dec" data-cid="' + esc(c.id) + '" aria-label="Remove one: ' + esc(c.name) + '"' + (x && (x.p || (S.admin && x.a)) ? '' : ' disabled') + '>&minus;</button>' +
      '<span class="n' + (n ? '' : ' zero') + '">' + n + '</span>' +
      '<button type="button" class="plus" data-act="inc" data-cid="' + esc(c.id) + '" aria-label="Log: ' + esc(c.name) + '">+</button></div></li>';
  }
  function updateLogList(pid) {
    var ul = $('#logList'); if (!ul) return;
    pid = pid || logTarget();
    var cnt = {}, used = {};
    S.entries.forEach(function (e) {
      if (e.pid !== pid) return;
      if (e.status !== 'rejected') used[e.cid] = (used[e.cid] || 0) + 1;
      if (e.date === S.date) {
        var x = cnt[e.cid] || (cnt[e.cid] = { a: 0, p: 0, r: 0 });
        if (e.status === 'approved') x.a++; else if (e.status === 'pending') x.p++; else x.r++;
      }
    });
    var vac = window.ADV && ADV.onVacation() && S.chores.some(function (c) { return c.travel && c.active !== false; });
    var mine = S.chores.filter(function (c) { return c.active !== false && (c.who || []).indexOf(pid) >= 0 && (!vac || c.travel); });
    var cats = catList(mine);
    if (S.cat !== 'all' && S.cat !== '$' && cats.indexOf(S.cat) < 0) S.cat = 'all';
    var per = {}; mine.forEach(function (c) { var n = catName(c); per[n] = (per[n] || 0) + 1; });
    var bounties = mine.filter(function (c) { return c.bountyCents > 0; }).length;
    $('#cats').innerHTML = cats.length > 1 || bounties ? ('<button type="button" class="cat" data-act="cat" data-cat="all" aria-pressed="' + (S.cat === 'all') + '">All<small>' + mine.length + '</small></button>' +
      (bounties ? '<button type="button" class="cat" data-act="cat" data-cat="$" aria-pressed="' + (S.cat === '$') + '">Bounties<small>' + bounties + '</small></button>' : '') +
      cats.map(function (n) { return '<button type="button" class="cat" data-act="cat" data-cat="' + esc(n) + '" aria-pressed="' + (S.cat === n) + '">' + esc(n) + '<small>' + per[n] + '</small></button>'; }).join('')) : '';
    var list = mine.slice();
    if (S.cat === '$') list = list.filter(function (c) { return c.bountyCents > 0; });
    else if (S.cat !== 'all') list = list.filter(function (c) { return catName(c) === S.cat; });
    var q = trim(S.q).toLowerCase();
    if (q) list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || catName(c).toLowerCase().indexOf(q) >= 0; });
    if (!mine.length) { ul.innerHTML = '<li class="empty">No chores are assigned to ' + esc(pname(pid)) + ' yet. A parent can add them in Setup.</li>'; return; }
    if (!list.length) { ul.innerHTML = '<li class="empty">No chores match.</li>'; return; }
    function ord(c) { return typeof c.order === 'number' ? c.order : 0; }
    if (S.sort === 'points') list.sort(function (a, b) { return b.pts - a.pts || ord(a) - ord(b); });
    else if (S.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (S.sort === 'used') list.sort(function (a, b) { return (used[b.id] || 0) - (used[a.id] || 0) || ord(a) - ord(b); });
    else list.sort(function (a, b) { return ord(a) - ord(b); });
    if (!(S.sort === 'cat' && S.cat === 'all')) { ul.innerHTML = list.map(function (c) { return rowHtml(c, cnt[c.id]); }).join(''); return; }
    var html = '';
    catList(list).forEach(function (n) {
      var items = list.filter(function (c) { return catName(c) === n; });
      var done = items.filter(function (c) { var x = cnt[c.id]; return x && x.a + x.p > 0; }).length;
      html += '<li class="grp"><span>' + esc(n) + '</span><span class="mono">' + done + ' / ' + items.length + '</span></li>' +
        items.map(function (c) { return rowHtml(c, cnt[c.id]); }).join('');
    });
    ul.innerHTML = html;
  }

  /* ----- Approvals: swipe right to approve, left to deny, grouped by chore or by person ----- */
  function pendingUnits() {
    var qd = queuedIds(), units = [], qmap = {};
    S.entries.forEach(function (e) {
      if (e.status !== 'pending' || qd[e.id]) return;
      if (e.questId) {
        if (!qmap[e.questId]) { qmap[e.questId] = { key: 'q' + e.questId, quest: true, entries: [], cid: e.cid, name: e.name, date: e.date, ts: e.ts }; units.push(qmap[e.questId]); }
        qmap[e.questId].entries.push(e);
      } else units.push({ key: 'e' + e.id, quest: false, entries: [e], cid: e.cid, name: e.name, date: e.date, ts: e.ts, pid: e.pid });
    });
    units.forEach(function (u) {
      u.pts = 0; u.cents = 0;
      u.entries.forEach(function (e) { u.pts += e.pts; u.cents += e.bountyCents || 0; });
      if (u.quest) u.entries.sort(function (a, b) { return b.share - a.share; });
    });
    units.sort(function (a, b) { return a.ts - b.ts; });
    return units;
  }
  function unitWho(u) { return u.entries.map(function (e) { return pname(e.pid) + (u.quest ? ' ' + e.share + '%' : ''); }).join(', '); }
  function groupUnits(units, mode) {
    var groups = [], gmap = {};
    units.forEach(function (u) {
      var k, title;
      if (mode === 'chore') { k = (u.quest ? 'Q:' : 'C:') + u.cid; title = u.name + (u.quest ? ' (shared)' : ''); }
      else if (u.quest) { k = 'P:@quests'; title = 'Shared bounties'; }
      else { k = 'P:' + u.pid; title = pname(u.pid); }
      if (!gmap[k]) { gmap[k] = { key: k, title: title, units: [], pts: 0, cents: 0, pid: mode === 'person' && !u.quest ? u.pid : null, cid: u.cid }; groups.push(gmap[k]); }
      gmap[k].units.push(u); gmap[k].pts += u.pts; gmap[k].cents += u.cents;
    });
    if (mode === 'chore') {
      var order = catList(S.chores);
      groups.sort(function (a, b) {
        var ca = find(S.chores, function (c) { return c.id === a.cid; }) || {}, cb = find(S.chores, function (c) { return c.id === b.cid; }) || {};
        return (order.indexOf(catName(ca)) - order.indexOf(catName(cb))) || ((ca.order || 0) - (cb.order || 0));
      });
    } else groups.sort(function (a, b) { return a.pid ? (b.pid ? pIndex(person(a.pid)) - pIndex(person(b.pid)) : -1) : 1; });
    return groups;
  }
  function renderApprovals(D) {
    var units = pendingUnits(), mode = S.apMode, t = D.t;
    var h = '<section class="stack approvals"><div class="wrap end"><div class="seg" role="group" aria-label="Group by">' +
      '<button type="button" data-act="apMode" data-m="chore" aria-pressed="' + (mode === 'chore') + '">By chore</button>' +
      '<button type="button" data-act="apMode" data-m="person" aria-pressed="' + (mode === 'person') + '">By person</button></div></div>';
    if (!S.admin) { view.innerHTML = h + locked('Approving') + '</section>'; return; }
    if (!units.length) { view.innerHTML = h + '<p class="note">Nothing is waiting for approval.</p>' + (window.ADV ? ADV.passesAdminHtml() : '') + '</section>'; return; }
    h += '<p class="note swipe-hint">Swipe right to approve, left to deny. Undo appears at the bottom.</p>';
    h += groupUnits(units, mode).map(function (g) {
      var open = !S.apClosed[g.key], n = g.units.length, p = g.pid ? person(g.pid) : null;
      if (n === 1) return '<div class="agrp single"><div class="list">' + swipeRow(g.units[0], 'full', t) + '</div></div>';
      var names = uniq(g.units.map(function (u) { return mode === 'chore' ? unitWho(u) : u.name; }));
      var sum = names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) + ' more' : '');
      var head = '<div class="agrp-head"><div class="grow"><div class="agrp-title">' + (p ? '<span class="dot p' + pIndex(p) + '"></span> ' : '') + esc(g.title) + '</div>' +
        '<div class="note">' + n + ' waiting &middot; ' + n0(g.pts) + ' pts' + (g.cents ? ' &middot; ' + money(g.cents) + ' bounty' : '') + '</div>' +
        (open ? '' : '<div class="note agrp-sum">' + esc(sum) + '</div>') + '</div>' +
        '<div class="agrp-btns"><button class="btn small primary" type="button" data-act="apGroup" data-key="' + esc(g.key) + '">Approve ' + (n > 1 ? 'all ' + n : '') + '</button>' +
        '<button class="btn small" type="button" data-act="apToggle" data-key="' + esc(g.key) + '" aria-expanded="' + open + '">' + (open ? 'Hide' : 'Show') + '</button></div></div>';
      var body = !open ? '' : '<div class="list">' + g.units.map(function (u) { return swipeRow(u, mode, t); }).join('') + '</div>';
      return '<div class="agrp">' + head + body + '</div>';
    }).join('');
    h += '<div class="ap-foot"><button class="btn primary block" type="button" data-act="apRest">Approve remaining (' + units.length + ')</button></div>';
    if (window.ADV) h += ADV.passesAdminHtml();
    view.innerHTML = h + '</section>';
  }
  function swipeRow(u, mode, t) {
    var who = unitWho(u), label, sub;
    var up = !u.quest ? person(u.entries[0].pid) : null;
    if (mode === 'full') { label = u.name; sub = who + ' &middot; '; }
    else { label = mode === 'chore' ? who : u.name + (u.quest ? ' (' + who + ')' : ''); sub = ''; }
    return '<div class="swipe-wrap"><div class="swipe-bg"><span class="ok">Approve</span><span class="no">Deny</span></div>' +
      '<div class="hrow swipe' + (up ? ' p' + pIndex(up) : '') + '" data-key="' + esc(u.key) + '">' + (up && mode !== 'person' ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(label) +
      '<small>' + (mode === 'full' ? esc(who) + ' &middot; ' : '') + (u.date === t ? 'Today' : esc(fmtDate(u.date))) + ' ' + esc(fmtTime(u.ts)) + (u.cents ? ' &middot; ' + money(u.cents) + ' bounty' : '') + '</small></div>' +
      '<span class="amt plus">+' + u.pts + '</span>' +
      '<span class="ap-btns"><button class="btn small ok-btn" type="button" data-act="apUnit" data-key="' + esc(u.key) + '" aria-label="Approve">&#10003;</button><button class="btn small danger" type="button" data-act="rjUnit" data-key="' + esc(u.key) + '" aria-label="Deny">&#10005;</button></span></div></div>';
  }
  function unitsFor(key) {
    var units = pendingUnits();
    if (key.charAt(0) === 'q' || key.charAt(0) === 'e') return units.filter(function (u) { return u.key === key; });
    var kind = key.slice(0, 2), rest = key.slice(2);
    return units.filter(function (u) {
      if (kind === 'C:') return !u.quest && u.cid === rest;
      if (kind === 'Q:') return u.quest && u.cid === rest;
      if (rest === '@quests') return u.quest;
      return !u.quest && u.pid === rest;
    });
  }
  function unitLabel(units) {
    if (units.length !== 1) return units.length + ' chores';
    var u = units[0]; return u.name + ' (' + unitWho(u) + ')';
  }
  function decide(key, status) {
    var units = unitsFor(key);
    if (units.length) queueDecision(units, status, unitLabel(units));
  }
  /* swipe gesture, touch and mouse */
  var drag = null, suppressClick = false;
  function pt(e) { var t = e.touches && e.touches[0] || e.changedTouches && e.changedTouches[0] || e; return { x: t.clientX, y: t.clientY }; }
  function swipeStart(e) {
    var el = e.target.closest ? e.target.closest('.swipe') : null;
    if (!el || (e.target.closest('button'))) return;
    var p = pt(e); drag = { el: el, x0: p.x, y0: p.y, dx: 0, on: false };
  }
  function swipeMove(e) {
    if (!drag) return;
    var p = pt(e), dx = p.x - drag.x0, dy = p.y - drag.y0;
    if (!drag.on) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) drag.on = true;
      else if (Math.abs(dy) > 12) { drag = null; return; } else return;
    }
    if (e.cancelable) e.preventDefault();
    drag.dx = dx;
    drag.el.style.webkitTransform = drag.el.style.transform = 'translateX(' + dx + 'px)';
    drag.el.parentNode.className = 'swipe-wrap ' + (dx > 0 ? 'go-ok' : 'go-no');
  }
  function swipeEnd() {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.on) return;
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 50);
    var w = d.el.offsetWidth || 300;
    if (Math.abs(d.dx) > w * 0.28) {
      var dir = d.dx > 0 ? 1 : -1;
      d.el.style.transition = 'transform .15s';
      d.el.style.webkitTransform = d.el.style.transform = 'translateX(' + (dir * w) + 'px)';
      setTimeout(function () { decide(d.el.getAttribute('data-key'), dir > 0 ? 'approved' : 'rejected'); }, 150);
    } else {
      d.el.style.transition = 'transform .15s';
      d.el.style.webkitTransform = d.el.style.transform = '';
      setTimeout(function () { d.el.style.transition = ''; if (d.el.parentNode) d.el.parentNode.className = 'swipe-wrap'; }, 160);
    }
  }
  document.addEventListener('touchstart', swipeStart, false);
  document.addEventListener('touchmove', swipeMove, { passive: false });
  document.addEventListener('touchend', swipeEnd, false);
  document.addEventListener('touchcancel', function () { if (drag) { drag.dx = 0; swipeEnd(); } }, false);
  document.addEventListener('mousedown', swipeStart, false);
  document.addEventListener('mousemove', function (e) { if (drag) swipeMove(e); }, false);
  document.addEventListener('mouseup', swipeEnd, false);

  /* ----- Bank ----- */
  var KIND = { chores: 'Chore earnings', deposit: 'Deposit', withdraw: 'Spent', purchase: 'Purchase', pet: 'Pet reward', bounty: 'Bounty', allowance: 'Allowance', transfer: 'Transfer', adjust: 'Adjustment' };
  function acctMeta(p, D) {
    var x = D.T(p.id), bits = [], rate = Number(S.settings.centsPerPoint) || 0;
    if (isDad(p.id)) bits.push('Allowance account');
    if (rate && x.unpaid) bits.push(signed(Math.round(x.unpaid * rate)) + ' next payday');
    var rq = D.reqPend.filter(function (r) { return r.pid === p.id; }).length;
    if (rq) bits.push(rq + ' request' + (rq > 1 ? 's' : '') + ' waiting');
    return bits.join(' &middot; ');
  }
  function renderBank(D) {
    if (!S.admin) {
      if (isPerson(S.me)) { S.bankPid = S.me; view.innerHTML = accountHtml(D, S.me, false); return; }
      view.innerHTML = locked('The bank'); return;
    }
    if (S.bankPid && isPerson(S.bankPid)) { view.innerHTML = accountHtml(D, S.bankPid, true); return; }
    S.bankPid = null;
    var ps = activePeople().slice().sort(function (a, b) { return isDad(a.id) ? -1 : isDad(b.id) ? 1 : 0; });
    var total = 0; kids().forEach(function (p) { total += Number(p.balance) || 0; });
    var rate = Number(S.settings.centsPerPoint) || 0, dad = person(S.settings.dadPid);
    var h = '<section class="stack"><div class="bank-head"><div class="bank-name">' + esc(bankName()) + '</div>' +
      (dad ? '<div class="bank-sub">' + esc(dad.name) + '’s account</div><div class="bank-big">' + money(dad.balance) + '</div><div class="bank-sub">Everyone else holds ' + money(total) + '</div>'
        : '<div class="bank-sub">Held across ' + ps.length + ' accounts</div><div class="bank-big">' + money(total) + '</div>') + '</div>';
    if (dad && S.settings.allowanceCents > 0) {
      var next = addDays(lastAllowanceDay(Number(S.settings.allowanceDay)), 7);
      h += '<p class="note">Next weekly deposit: ' + money(S.settings.allowanceCents) + ' on ' + esc(fmtDate(next)) + '.</p>';
    }
    var unpaidPts = 0, unpaidPeople = 0;
    ps.forEach(function (p) { var u = D.T(p.id).unpaid; if (u) { unpaidPts += u; unpaidPeople++; } });
    var cents = Math.round(unpaidPts * rate);
    h += '<div class="card' + (cents ? ' attn' : '') + '"><h2>Payday</h2>' +
      (rate ? '<p class="note">Approved chore points not paid yet, at ' + esc(rateLabel(rate)) + '.</p>' +
        '<div class="row-flex"><span class="big-num grow">' + money(cents) + '</span><span class="note">' + n0(unpaidPts) + ' pts, ' + unpaidPeople + (unpaidPeople === 1 ? ' person' : ' people') + '</span></div>' +
        '<button class="btn ' + (S.armed === 'payday' ? 'danger' : 'primary') + '" type="button" data-act="payday"' + (unpaidPts ? '' : ' disabled') + '>' + (S.armed === 'payday' ? 'Tap again to pay ' + money(cents) : 'Pay chore earnings') + '</button>'
        : '<p class="note">Set how much a point is worth in settings to pay chore earnings.</p>') + '</div>';
    if (D.reqPend.length) h += '<div><h2>Purchase requests</h2>' + reqList(D.reqPend, true) + '</div>';
    h += '<div><h2>Accounts</h2><ul class="accts">' + ps.map(function (p) {
      var b = Number(p.balance) || 0, meta = acctMeta(p, D);
      return '<li><button type="button" class="acct p' + pIndex(p) + '" data-act="acct" data-pid="' + esc(p.id) + '"><span class="dot"></span><span class="nm">' + esc(p.name) + (meta ? '<small>' + meta + '</small>' : '') + '</span>' +
        '<span class="bal' + (b < 0 ? ' neg' : '') + '">' + money(b) + '</span><span class="chev">&rsaquo;</span></button></li>';
    }).join('') + '</ul></div>';
    var recent = S.txns.slice(0, 15);
    h += '<div><h2>Recent activity</h2>' + (recent.length ? '<div class="list ledger">' + recent.map(function (t) { return txRow(t, true); }).join('') + '</div>' : '<p class="note">No money has moved yet.</p>') + '</div>';
    view.innerHTML = h + '</section>';
  }
  function txRow(t, showName) {
    var p = person(t.pid), by = t.by ? parentName(t.by) : '';
    return '<div class="hrow p' + pIndex(p) + '">' + (showName ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(t.memo || KIND[t.kind] || 'Transaction') +
      '<small>' + (showName ? esc(pname(t.pid)) + ' &middot; ' : '') + esc(KIND[t.kind] || '') + ' &middot; ' + esc(fmtShort(t.ts)) + (by && S.admin ? ' &middot; ' + esc(by) : '') + '</small></div>' +
      '<span class="amt ' + (t.cents >= 0 ? 'plus' : 'minus') + '">' + signed(t.cents) + '</span></div>';
  }
  function reqList(list, showName) {
    return '<div class="list">' + list.map(function (r) {
      var p = person(r.pid), owner = r.pid === S.me;
      var stamp = r.status === 'approved' ? '<span class="stamp ok">Approved</span>' : r.status === 'denied' ? '<span class="stamp no">Not this time</span>' : '<span class="stamp pend">Waiting</span>';
      var acts = '';
      if (r.status === 'pending') {
        if (S.admin) {
          var short = (Number(p && p.balance) || 0) < r.cents;
          acts = '<span class="ap-btns"><button class="btn small ' + (S.armed === 'rq' + r.id ? 'danger' : 'primary') + '" type="button" data-act="reqApprove" data-id="' + esc(r.id) + '">' +
            (S.armed === 'rq' + r.id ? 'Approve anyway' : 'Approve') + '</button><button class="btn small" type="button" data-act="reqDeny" data-id="' + esc(r.id) + '">Deny</button></span>' +
            (short ? '<small class="note fullrow">Balance is ' + money(p ? p.balance : 0) + '. Approving goes below zero.</small>' : '');
        } else if (owner) acts = '<button class="btn small" type="button" data-act="reqCancel" data-id="' + esc(r.id) + '">Cancel</button>';
      }
      return '<div class="hrow p' + pIndex(p) + '">' + (showName ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(r.item) +
        '<small>' + (showName ? esc(pname(r.pid)) + ' &middot; ' : '') + esc(fmtShort(r.ts)) + (r.note ? ' &middot; ' + esc(r.note) : '') + '</small></div>' +
        '<span class="amt minus">' + money(r.cents) + '</span>' + stamp + acts + '</div>';
    }).join('') + '</div>';
  }
  /* One account. Kids see it inside the pet game's bank (manage=false); parents reach it from Accounts. */
  function accountHtml(D, pid, manage) {
    var p = person(pid), b = Number(p.balance) || 0, own = pid === S.me;
    var rate = Number(S.settings.centsPerPoint) || 0, unpaid = D.T(pid).unpaid;
    var h = '<section class="stack">' + (manage ? '<div><button class="btn small" type="button" data-act="bankHome">&lsaquo; All accounts</button></div>' : '') +
      '<div class="bank-head"><div class="bank-name">' + esc(bankName()) + '</div><div class="bank-sub">' + esc(p.name) + '’s account</div>' +
      '<div class="bank-big">' + money(b) + '<small>available</small></div>' +
      (rate && unpaid ? '<div class="bank-sub">' + signed(Math.round(unpaid * rate)) + ' coming on the next payday</div>' : '') + '</div>';
    var btns = '', f = S.bankForm;
    if (own && !manage) btns += '<button class="btn' + (f === 'request' ? ' primary' : '') + '" type="button" data-act="bform" data-f="request">Ask to buy something</button>';
    if (manage) {
      btns += '<button class="btn' + (f === 'deposit' ? ' primary' : '') + '" type="button" data-act="bform" data-f="deposit">Deposit</button>' +
        '<button class="btn' + (f === 'withdraw' ? ' primary' : '') + '" type="button" data-act="bform" data-f="withdraw">' + (isDad(pid) ? 'Spend' : 'Withdraw') + '</button>' +
        '<button class="btn' + (f === 'transfer' ? ' primary' : '') + '" type="button" data-act="bform" data-f="transfer">Transfer</button>';
    }
    if (btns) h += '<div class="wrap">' + btns + '</div>';
    if (f === 'request' && own && !manage) {
      h += '<form class="card" data-form="request"><h2>Purchase request</h2>' +
        '<label class="field" for="rqItem"><span>What do you want to buy?</span><input type="text" id="rqItem" maxlength="80" placeholder="Lego set, book, game..."></label>' +
        '<div class="wrap end"><label class="field w-sm" for="rqAmt"><span>Price ($)</span><input type="text" id="rqAmt" inputmode="decimal" placeholder="0.00"></label>' +
        '<label class="field w-lg" for="rqNote"><span>Note (optional)</span><input type="text" id="rqNote" maxlength="120" placeholder="Where to buy it, why you want it"></label></div>' +
        '<div class="wrap"><button class="btn primary" type="submit">Send request</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div>' +
        '<p class="note">A parent will approve or deny it. Approved requests come out of your balance.</p></form>';
    } else if (manage && (f === 'deposit' || f === 'withdraw')) {
      var spend = f === 'withdraw' && isDad(pid);
      h += '<form class="card" data-form="money" data-kind="' + f + '"><h2>' + (f === 'deposit' ? 'Deposit' : spend ? 'Record spending' : 'Withdrawal') + '</h2>' +
        '<div class="wrap end"><label class="field w-sm" for="mAmt"><span>Amount ($)</span><input type="text" id="mAmt" inputmode="decimal" placeholder="0.00"></label>' +
        '<label class="field w-lg" for="mMemo"><span>' + (spend ? 'What was it for?' : 'Memo') + '</span><input type="text" id="mMemo" maxlength="80" placeholder="' + (f === 'deposit' ? 'Birthday money, correction...' : spend ? 'Groceries, gas, lunch...' : 'Cash out, correction...') + '"></label></div>' +
        '<div class="wrap"><button class="btn primary" type="submit">' + (f === 'deposit' ? 'Deposit' : spend ? 'Record' : 'Withdraw') + '</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div></form>';
    } else if (manage && f === 'transfer') {
      var others = activePeople().filter(function (x) { return x.id !== pid; });
      h += '<form class="card" data-form="transfer"><h2>Transfer from ' + esc(p.name) + '</h2>' +
        '<div class="wrap end"><label class="field w-md" for="tTo"><span>To</span><select id="tTo">' + others.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field w-sm" for="tAmt"><span>Amount ($)</span><input type="text" id="tAmt" inputmode="decimal" placeholder="0.00"></label></div>' +
        '<label class="field" for="tMemo"><span>Memo (optional)</span><input type="text" id="tMemo" maxlength="80" placeholder="Spending money, reward..."></label>' +
        '<div class="wrap"><button class="btn primary" type="submit">Transfer</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div></form>';
    }
    var reqs = S.reqs.filter(function (r) { return r.pid === pid; });
    var open = reqs.filter(function (r) { return r.status === 'pending'; });
    var closed = reqs.filter(function (r) { return r.status !== 'pending'; }).slice(0, 5);
    if (open.length || closed.length) h += '<div><h2>Requests</h2>' + reqList(open.concat(closed), false) + '</div>';
    var tx = S.allTx && S.allTx.pid === pid ? S.allTx.list : S.txns.filter(function (t) { return t.pid === pid; });
    h += '<div><h2>Transactions</h2>' + (tx.length ? '<div class="list ledger">' + tx.map(function (t) { return txRow(t, false); }).join('') + '</div>'
      : '<p class="note">No transactions yet.</p>') +
      (!(S.allTx && S.allTx.pid === pid) && tx.length >= 10 ? '<div style="margin-top:10px"><button class="btn small" type="button" data-act="allTx" data-pid="' + esc(pid) + '">Show all transactions</button></div>' : '') + '</div>';
    return h + '</section>';
  }
  function payday() {
    var rate = Number(S.settings.centsPerPoint) || 0;
    if (!rate) { toast('Set how much a point is worth first.', true); return; }
    DB.query({ c: 'entries', where: [['status', '==', 'approved'], ['paid', '==', false]] }).then(function (list) {
      var by = {}, ops = [], paidN = 0, total = 0;
      list.forEach(function (e) { if (!isPerson(e.pid)) return; (by[e.pid] = by[e.pid] || []).push(e); });
      Object.keys(by).forEach(function (pid) {
        var es = by[pid], pts = 0;
        es.forEach(function (e) { pts += e.pts; });
        var cents = Math.round(pts * rate);
        es.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        var span = es[0].date === es[es.length - 1].date ? fmtDate(es[0].date) : fmtDate(es[0].date) + ' to ' + fmtDate(es[es.length - 1].date);
        var t = txOps(pid, cents, 'chores', 'Chores ' + span + ': ' + es.length + ' done, ' + n0(pts) + ' pts', { pts: pts });
        ops = ops.concat(t);
        es.forEach(function (e) { ops.push({ t: 'update', c: 'entries', id: e.id, d: { paid: true, paidTx: t[0].id } }); });
        paidN++; total += cents;
      });
      if (!ops.length) { toast('Nothing to pay.'); return; }
      return DB.commit(ops).then(function () { toast('Paid ' + money(total) + ' to ' + paidN + (paidN > 1 ? ' people' : ' person')); });
    }).catch(fail);
  }

  /* ----- History ----- */
  function histRows() {
    var f = S.hist, t = today(), cut = '';
    if (f.range === '7') cut = addDays(t, -6); else if (f.range === '30') cut = addDays(t, -29); else if (f.range === 'month') cut = t.slice(0, 8) + '01';
    var src = S.entries.concat(f.range === 'all' && S.older ? S.older : []);
    var mineOnly = !S.admin && isPerson(S.me);
    return src.filter(function (e) {
      if (mineOnly && e.pid !== S.me) return false;
      return (f.pid === 'all' || e.pid === f.pid) && (!cut || e.date >= cut) && (f.status === 'all' || e.status === f.status);
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; });
  }
  function renderHistory() {
    var rows = histRows(), f = S.hist;
    var html = '<section><h2>Chore history</h2><div class="wrap end">' +
      (S.admin ? '<label class="field w-md" for="hPid"><span>Person</span><select id="hPid" data-hist="pid">' + opt('all', 'Everyone', f.pid) +
        S.people.map(function (p) { return opt(esc(p.id), esc(p.name) + (p.active === false ? ' (archived)' : ''), f.pid); }).join('') + '</select></label>' : '') +
      '<label class="field w-md" for="hRange"><span>Period</span><select id="hRange" data-hist="range">' + opt('7', 'Last 7 days', f.range) + opt('30', 'Last 30 days', f.range) + opt('month', 'This month', f.range) + opt('all', 'Everything', f.range) + '</select></label>' +
      '<label class="field w-md" for="hStatus"><span>Status</span><select id="hStatus" data-hist="status">' + opt('all', 'All', f.status) + opt('pending', 'Waiting', f.status) + opt('approved', 'Approved', f.status) + opt('rejected', 'Rejected', f.status) + '</select></label>' +
      (S.admin ? '<button class="btn" type="button" data-act="csv"' + (rows.length ? '' : ' disabled') + '>Download CSV</button>' : '') + '</div>';
    if (f.range === 'all' && !S.older) html += '<p class="note" style="margin-top:10px">Showing the last ' + LIVE_DAYS + ' days. <button class="btn small" type="button" data-act="older">Load older history</button></p>';
    if (!rows.length) html += '<p class="note" style="margin-top:14px">Nothing logged for this selection yet.</p>';
    else {
      var groups = [], cur = null;
      rows.forEach(function (r) {
        if (!cur || cur.date !== r.date) { cur = { date: r.date, rows: [], sum: 0 }; groups.push(cur); }
        cur.rows.push(r); if (r.status === 'approved') cur.sum += r.pts;
      });
      html += groups.map(function (g) {
        return '<div><div class="day"><span>' + esc(fmtDate(g.date)) + '</span><span class="mono">' + n0(g.sum) + ' pts approved</span></div><div class="list">' +
          g.rows.map(function (r) {
            var p = person(r.pid), key = 'rm' + r.id, acts = '', by = r.decidedBy ? parentName(r.decidedBy) : '';
            var canRm = !r.paid && !r.bountyPaid && (r.status === 'pending' || S.admin);
            if (S.admin && r.status === 'rejected') acts += '<button class="btn small" type="button" data-act="reopen" data-id="' + esc(r.id) + '">Reopen</button>';
            if (canRm) acts += '<button class="btn small' + (S.armed === key ? ' danger' : '') + '" type="button" data-act="rm" data-id="' + esc(r.id) + '">' + (S.armed === key ? 'Confirm remove' : 'Remove') + '</button>';
            return '<div class="hrow p' + pIndex(p) + (r.status === 'rejected' ? ' rej' : '') + '"><span class="dot"></span><div class="desc">' + esc(r.name) + (r.questId ? ' (' + r.share + '%)' : '') +
              '<small>' + esc(pname(r.pid)) + ' &middot; ' + esc(fmtTime(r.ts)) + (by && r.status !== 'pending' ? ' &middot; ' + (r.status === 'approved' ? 'approved' : 'denied') + ' by ' + esc(by) : '') +
              (r.bountyCents ? ' &middot; ' + money(r.bountyCents) + ' bounty' : '') + (r.paid ? ' &middot; paid' : '') + '</small></div>' + tagFor(r.status) +
              '<span class="amt plus">+' + r.pts + '</span>' + acts + '</div>';
          }).join('') + '</div></div>';
      }).join('');
    }
    view.innerHTML = html + '</section>';
  }
  function downloadCsv() {
    var rows = histRows();
    function q(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var csv = ['date,person,chore,category,points,status,decided_by,bounty,paid'].concat(rows.map(function (r) {
      return [r.date, pname(r.pid), r.name, r.cat, r.pts, r.status, parentName(r.decidedBy), r.bountyCents ? dollars(r.bountyCents) : '', r.paid ? 'yes' : 'no'].map(q).join(',');
    })).join('\n');
    try {
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'chore-history-' + today() + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { toast('This browser cannot download files.', true); }
  }

  /* ----- Setup ----- */
  function locked(what) {
    return '<div class="banner info"><strong>' + what + ' is for parents.</strong>' +
      '<div style="margin-top:10px"><button class="btn primary" type="button" data-act="adminOpen">Parent unlock</button></div></div>';
  }
  function renderSetup() {
    var dev = '<section class="stack tight"><h2>This device</h2><p class="note">' + (DB.mode === 'firebase' && DB.user ? 'Signed in as ' + esc(DB.user.email) : 'Demo mode: data stays in this browser.') + '</p>' +
      '<div class="wrap">' + (DB.mode === 'firebase' ? '<button class="btn' + (S.armed === 'signout' ? ' danger' : '') + '" type="button" data-act="signout">' + (S.armed === 'signout' ? 'Tap again to sign out' : 'Sign out of this device') + '</button>' : '') +
      (S.admin ? '<button class="btn" type="button" data-act="exportFamily">Download family file</button>' : '') +
      (DB.mode === 'demo' ? '<button class="btn danger" type="button" data-act="resetDemo">' + (S.armed === 'resetDemo' ? 'Tap again to erase demo data' : 'Erase demo data') + '</button>' : '') + '</div>' +
      (S.admin ? '<p class="note">The family file is a backup of your people, chores and settings. It can set up the app again from scratch.</p>' : '') +
      (S.admin ? '<div class="wrap">' + (MODE === 'bank' ? '<button class="btn" type="button" data-act="roleKids">Switch this device to the kids’ app</button>' + (keepInfo() ? '<button class="btn" type="button" data-act="unkeep">Ask for my PIN every time</button>' : '')
        : '<button class="btn" type="button" data-act="roleParent">Make this my parent phone</button>') + '</div>' +
        '<p class="note">' + (MODE === 'bank' ? 'This device opens the parent app.' + (keepInfo() ? ' It stays unlocked until you tap Lock.' : ' It locks after 10 minutes without use.') : 'This device opens the kids’ app. Parents can still tap Parent at the top to approve things here.') + '</p>' : '') + '</section>';
    if (!S.admin) { view.innerHTML = '<div class="stack">' + locked('Setup') + dev + '</div>'; return; }
    if (S.avEditFor && window.Pets) { view.innerHTML = window.Pets.adultCreatorHtml(S.avEditFor); return; }
    var st = S.settings, act = activePeople(), h = '<div class="stack" style="margin-bottom:10px">';
    if (S.parent && window.Pets) {
      var md = window.Pets.doc(S.parent.id), spot = md.spot || '';
      h += '<section class="card stack tight you-card"><h2>You in town</h2><div class="you-row"><div class="you-av">' + (md.avatar ? window.CHAR.drawAvatar(window.Pets.adultAv(md.avatar)) : '<span class="note">No character yet</span>') + '</div>' +
        '<div class="grow stack tight"><p class="note">Grown-ups get a character but no pet, and are always drawn tall so the kids can spot an approver. Pick where you hang out and the kids will find you there.</p>' +
        '<button class="btn primary" type="button" data-act="adultAv">' + (md.avatar ? 'Change my look' : 'Design my character') + '</button></div></div>' +
        (md.avatar ? '<div class="seg town spots" role="group" aria-label="Where you hang out">' + window.Pets.SPOTS.map(function (sp) {
          var label = sp[0] === 'bank' ? bankName() : sp[1];
          return '<button type="button" data-act="adultSpot" data-spot="' + sp[0] + '" aria-pressed="' + (spot === sp[0]) + '">' + esc(label) + '</button>';
        }).join('') + '</div>' : '') + '</section>';
    }
    h += '<form class="stack tight" data-form="money2"><h2>Money</h2>' +
      '<label class="field" for="bname"><span>Bank name</span><input type="text" id="bname" maxlength="30" value="' + esc(bankName()) + '"></label>' +
      '<div class="checks"><label><input type="checkbox" id="reqAppr"' + (st.requireApproval !== false ? ' checked' : '') + '>Chores need parent approval before they count</label></div>' +
      '<div class="wrap end"><label class="field w-md" for="rate"><span>Cents per chore point</span><input type="text" id="rate" inputmode="decimal" value="' + esc(st.centsPerPoint || 0) + '"></label>' +
      '<label class="field w-md" for="evo1"><span>First evolution pays ($)</span><input type="text" id="evo1" inputmode="decimal" value="' + dollars(st.petEvolve1Cents) + '"></label>' +
      '<label class="field w-md" for="evo2"><span>Final evolution pays ($)</span><input type="text" id="evo2" inputmode="decimal" value="' + dollars(st.petEvolve2Cents) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-md" for="dad"><span>Weekly allowance goes to</span><select id="dad"><option value="">Nobody</option>' + act.map(function (p) { return opt(esc(p.id), esc(p.name), st.dadPid); }).join('') + '</select></label>' +
      '<label class="field w-sm" for="allow"><span>Amount ($)</span><input type="text" id="allow" inputmode="decimal" value="' + dollars(st.allowanceCents) + '"></label>' +
      '<label class="field w-md" for="aday"><span>Every</span><select id="aday">' + DAYS.map(function (d, i) { return opt(String(i), d, String(st.allowanceDay)); }).join('') + '</select></label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="fcoins"><span>Food coins per kitchen chore</span><input type="number" id="fcoins" min="1" step="1" value="' + (st.foodCoins || 10) + '"></label>' +
      '<label class="field w-sm" for="mprice"><span>Meal price</span><input type="number" id="mprice" min="1" step="1" value="' + (st.mealPrice || 10) + '"></label>' +
      '<label class="field w-sm" for="ccoins"><span>Care coins per self-care chore</span><input type="number" id="ccoins" min="1" step="1" value="' + (st.careCoins || 10) + '"></label>' +
      '<label class="field w-sm" for="kprice"><span>Bath kit price</span><input type="number" id="kprice" min="1" step="1" value="' + (st.kitPrice || 10) + '"></label></div>' +
      '<p class="note">A pet eats about two meals a day, so with equal numbers it takes about two kitchen chores a day to keep it fed. Coin purses hold two purchases and the bag holds one, so coins cannot be saved up for long.</p>' +
      '<button class="btn primary" type="submit">Save</button>' +
      '<p class="note">At 1 cent per point, a 10-point chore pays $0.10 on payday. The weekly allowance lands the first time a parent unlocks on or after that day. The allowance account is hidden from the kids.</p></form>';
    var ac = window.ADV ? ADV.cfg() : {}, vac = ac.vacation || {};
    h += '<form class="stack tight" data-form="advset"><h2>Adventures and vacation</h2>' +
      '<div class="wrap end"><label class="field w-sm" for="aJobs"><span>Big jobs for a pass</span><input type="number" id="aJobs" min="1" step="1" value="' + ac.passBigJobs + '"></label>' +
      '<label class="field w-sm" for="aMin"><span>Pass minutes</span><input type="number" id="aMin" min="5" step="5" value="' + ac.passMinutes + '"></label>' +
      '<label class="field w-sm" for="aGold"><span>Golden pass minutes</span><input type="number" id="aGold" min="5" step="5" value="' + ac.goldenMinutes + '"></label>' +
      '<label class="field w-sm" for="aEarly"><span>Golden if done by</span><input type="time" id="aEarly" value="' + esc(ac.earlyBy) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="aWd1"><span>Weekday hours from</span><input type="time" id="aWd1" value="' + esc(ac.advWeekday[0]) + '"></label>' +
      '<label class="field w-sm" for="aWd2"><span>to</span><input type="time" id="aWd2" value="' + esc(ac.advWeekday[1]) + '"></label>' +
      '<label class="field w-sm" for="aWe1"><span>Weekend hours from</span><input type="time" id="aWe1" value="' + esc(ac.advWeekend[0]) + '"></label>' +
      '<label class="field w-sm" for="aWe2"><span>to</span><input type="time" id="aWe2" value="' + esc(ac.advWeekend[1]) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-md" for="vFrom"><span>Vacation from</span><input type="date" id="vFrom" value="' + esc(vac.from || '') + '"></label>' +
      '<label class="field w-md" for="vTo"><span>Vacation to</span><input type="date" id="vTo" value="' + esc(vac.to || '') + '"></label>' +
      '<label class="field w-sm" for="vMin"><span>Minutes a day on vacation</span><input type="number" id="vMin" min="5" step="5" value="' + ac.vacMinutes + '"></label></div>' +
      '<div class="checks"><label><input type="checkbox" id="vAuto"' + (ac.vacAutoPass ? ' checked' : '') + '>On vacation, passes are automatic (no approvals needed in the car)</label></div>' +
      '<div class="wrap"><button class="btn primary" type="submit">Save</button>' + (S.chores.some(function (c) { return c.travel; }) ? '' : '<button class="btn" type="button" data-act="addTravel">Add travel chores</button>') + '</div>' +
      '<p class="note">Mark big jobs in the chore editor. A kid earns a pass when their big jobs are approved; when every big job in the house is done, everyone gets a pass and can find a rare egg. During vacation the chore list shows only travel chores, pets get hungry and dirty half as fast and never starve.</p></form>';
    var parents = st.parents || [];
    h += '<section class="stack tight"><h2>Parents</h2><div class="list">' + parents.map(function (p) {
      var me = S.parent && p.id === S.parent.id;
      return '<div class="srow"><div class="grow">' + esc(p.name) + (me ? ' <small>(you)</small>' : '') + '</div>' +
        (!me ? '<button class="btn small' + (S.armed === 'rmp' + p.id ? ' danger' : '') + '" type="button" data-act="rmParent" data-id="' + esc(p.id) + '">' + (S.armed === 'rmp' + p.id ? 'Tap again to remove' : 'Remove') + '</button>' : '') + '</div>';
    }).join('') + '</div>' +
      '<form class="wrap end" data-form="addparent"><label class="field w-md" for="apName"><span>Add a parent</span><input type="text" id="apName" maxlength="24" placeholder="Mom"></label>' +
      '<label class="field w-sm" for="apPin"><span>Their PIN</span><input type="password" id="apPin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="apPin2"><span>Repeat</span><input type="password" id="apPin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn" type="submit">Add</button></form>' +
      '<form class="wrap end" data-form="newpin"><label class="field w-sm" for="npin"><span>My new PIN</span><input type="password" id="npin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="npin2"><span>Repeat</span><input type="password" id="npin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn" type="submit">Change my PIN</button></form>' +
      '<p class="note">Each parent unlocks with their own PIN, and the history shows who approved what. On shared devices parent mode locks after 10 minutes without use.</p></section>';
    h += '<section class="stack tight"><h2>People</h2><div class="list">' + S.people.map(function (p) {
      var off = p.active === false;
      return '<div class="srow' + (off ? ' off' : '') + ' p' + pIndex(p) + '"><span class="dot"></span><label class="field grow" for="pn_' + esc(p.id) + '"><span>' + (off ? 'Archived' : 'Name') + '</span>' +
        '<input type="text" id="pn_' + esc(p.id) + '" data-act="rename" data-pid="' + esc(p.id) + '" value="' + esc(p.name) + '" maxlength="40"></label>' +
        (isDad(p.id) ? '<span class="tag plain">Grown-up</span>' : '<button class="btn small" type="button" data-act="toggleAdult" data-pid="' + esc(p.id) + '" aria-pressed="' + !!p.adult + '">' + (p.adult ? 'Grown-up' : 'Kid') + '</button>') +
        '<button class="btn small" type="button" data-act="togglePerson" data-pid="' + esc(p.id) + '">' + (off ? 'Restore' : 'Archive') + '</button></div>';
    }).join('') + '</div>' +
      '<form class="wrap end" data-form="person"><label class="field w-md" for="newName"><span>Add a person</span><input type="text" id="newName" maxlength="40"></label>' +
      '<label class="field w-md" for="copyFrom"><span>Give them the chores of</span><select id="copyFrom"><option value="">Nobody yet</option>' + act.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn primary" type="submit">Add</button></form><p class="note">Tap Kid or Grown-up to switch. Grown-ups keep their bank account and chores but have no pet or house in the game.</p></section>';
    h += '<section class="stack tight"><h2>Chores</h2><div class="wrap"><div class="field w-lg"><input type="search" id="cq" placeholder="Search chores" aria-label="Search chores" value="' + esc(S.cq) + '"></div>' +
      '<button class="btn primary" type="button" data-act="newChore">Add chore</button><span class="checks"><label><input type="checkbox" id="showArch" data-act="showArch"' + (S.showArchived ? ' checked' : '') + '>Show archived</label></span></div>' +
      '<p class="note">In the pet game, kitchen chores earn food coins, self-care earns care coins for soap and shampoo, bedtime chores earn tuck-ins and exercise earns play time.</p>' +
      '<ul class="list" id="choreList"></ul></section>';
    var cats = catList(S.chores).filter(function (n) { return n !== 'Other'; });
    h += '<section class="stack tight"><h2>Categories</h2><div class="list">' + (cats.length ? cats.map(function (n, i) {
      return '<div class="srow"><label class="field grow" for="cn_' + i + '"><span>' + S.chores.filter(function (c) { return catName(c) === n; }).length + ' chores</span><input type="text" id="cn_' + i + '" data-act="renameCat" data-old="' + esc(n) + '" value="' + esc(n) + '" maxlength="40"></label>' +
        '<button class="btn small" type="button" data-act="catMove" data-dir="-1" data-cat="' + esc(n) + '"' + (i ? '' : ' disabled') + '>Up</button>' +
        '<button class="btn small" type="button" data-act="catMove" data-dir="1" data-cat="' + esc(n) + '"' + (i < cats.length - 1 ? '' : ' disabled') + '>Down</button></div>';
    }).join('') : '<div class="empty">No categories yet.</div>') + '</div></section>';
    view.innerHTML = h + dev + '</div>';
    updateChoreList();
  }
  function updateChoreList() {
    var el = $('#choreList'); if (!el) return;
    var act = activePeople(), q = trim(S.cq).toLowerCase();
    var list = S.chores.filter(function (c) { return (S.showArchived || c.active !== false) && (!q || c.name.toLowerCase().indexOf(q) >= 0 || catName(c).toLowerCase().indexOf(q) >= 0); });
    list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var html = S.edit === 'new' ? choreEditor(null, act) : '';
    catList(list).forEach(function (n) {
      var items = list.filter(function (c) { return catName(c) === n; });
      html += '<li class="grp"><span>' + esc(n) + '</span><span class="mono">' + items.length + '</span></li>';
      items.forEach(function (c) {
        if (S.edit === c.id) { html += choreEditor(c, act); return; }
        var who = (c.who || []).map(pname), nd = needOf(c);
        html += '<li class="srow' + (c.active === false ? ' off' : '') + '"><div class="grow">' + esc(c.name) + (c.active === false ? ' (archived)' : '') +
          (nd ? ' <span class="tag plain">' + NEED_LABEL[nd] + '</span>' : '') + (c.bountyCents > 0 ? ' <span class="tag bounty">' + money(c.bountyCents) + '</span>' : '') +
          (c.major ? ' <span class="tag big">Big job' + (c.majorEach ? ', everyone' : '') + '</span>' : '') + (c.travel ? ' <span class="tag plain">Travel</span>' : '') +
          '<br><small>' + (who.length ? esc(who.join(', ')) : 'Nobody assigned') + '</small></div>' +
          '<span class="pts mono">+' + c.pts + '</span><button class="btn small" type="button" data-act="editChore" data-cid="' + esc(c.id) + '">Edit</button></li>';
      });
    });
    el.innerHTML = html || '<li class="empty">No chores match.</li>';
  }
  function choreEditor(c, act) {
    var who = c ? (c.who || []) : act.map(function (p) { return p.id; }), nd = c ? needOf(c) : '';
    var cats = catList(S.chores).filter(function (n) { return n !== 'Other'; });
    return '<li><form class="editor" data-form="chore" data-cid="' + (c ? esc(c.id) : '') + '">' +
      '<label class="field" for="ceName"><span>Chore</span><input type="text" id="ceName" maxlength="120" value="' + (c ? esc(c.name) : '') + '"></label>' +
      '<div class="wrap end"><label class="field w-lg" for="ceCat"><span>Category</span><input type="text" id="ceCat" maxlength="40" list="catlist" value="' + (c && c.cat ? esc(c.cat) : '') + '"></label>' +
      '<label class="field w-sm" for="cePts"><span>Points</span><input type="number" id="cePts" min="1" step="1" inputmode="numeric" value="' + (c ? c.pts : 4) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-md" for="ceNeed"><span>In the pet game it gives</span><select id="ceNeed">' + ['food', 'clean', 'rest', 'energy', 'none'].map(function (k) { return opt(k, NEED_LABEL[k], nd || 'none'); }).join('') + '</select></label>' +
      '<label class="field w-sm" for="ceBounty"><span>Bounty ($)</span><input type="text" id="ceBounty" inputmode="decimal" placeholder="0.00" value="' + (c && c.bountyCents ? dollars(c.bountyCents) : '') + '"></label></div>' +
      '<datalist id="catlist">' + cats.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<fieldset><legend>Who can do it</legend><div class="checks">' + act.map(function (p) {
        return '<label><input type="checkbox" name="who" value="' + esc(p.id) + '"' + (who.indexOf(p.id) >= 0 ? ' checked' : '') + '>' + esc(p.name) + '</label>';
      }).join('') + '</div></fieldset>' +
      '<div class="checks"><label><input type="checkbox" id="ceMajor"' + (c && c.major ? ' checked' : '') + '>Big job (counts toward Adventure Passes)</label>' +
      '<label><input type="checkbox" id="ceEach"' + (c && c.majorEach ? ' checked' : '') + '>Everyone assigned must do it</label>' +
      '<label><input type="checkbox" id="ceTravel"' + (c && c.travel ? ' checked' : '') + '>Travel chore (shown in vacation mode)</label></div>' +
      '<fieldset><legend>Big job on these days (none checked means every day)</legend><div class="checks">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (dl, i) {
        return '<label><input type="checkbox" name="mday" value="' + i + '"' + (c && c.majorDays && c.majorDays.indexOf(i) >= 0 ? ' checked' : '') + '>' + dl + '</label>';
      }).join('') + '</div></fieldset>' +
      '<p class="note">A bounty pays money when approved. People who do it together choose how to split it.</p>' +
      '<div class="wrap"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-act="cancelEdit">Cancel</button>' +
      (c ? '<button class="btn ' + (c.active === false ? '' : 'danger') + '" type="button" data-act="toggleChore" data-cid="' + esc(c.id) + '">' + (c.active === false ? 'Restore' : 'Archive') + '</button>' : '') + '</div></form></li>';
  }
  var TRAVEL = [
    ['Pack your own bag', 10, 'none', true], ['Unpack and put your clothes away', 10, 'none', false], ['Keep your seat area tidy', 4, 'none', true],
    ['Help carry bags', 4, 'none', false], ['Clean up after a meal', 4, 'food', true], ['Help set or clear the table', 4, 'food', false],
    ['Brush teeth in the morning', 4, 'clean', false], ['Brush teeth before bed', 4, 'clean', false], ['Shower', 4, 'clean', false], ['Put on sunscreen', 4, 'clean', false],
    ['In bed on time', 10, 'rest', false], ['Swim, hike or go for a walk', 4, 'energy', false], ['Kind to everyone all day', 10, 'none', false], ['Try a new food', 4, 'none', false]
  ];
  function addTravelChores() {
    var ids = kids().map(function (p) { return p.id; }), base = S.chores.reduce(function (m, c) { return Math.max(m, c.order || 0); }, 0);
    var ops = TRAVEL.map(function (t, i) { return { t: 'set', c: 'chores', id: 'travel-' + i, d: { name: t[0], pts: t[1], need: t[2], major: t[3], majorEach: false, majorDays: [], travel: true, cat: 'Travel', who: ids.slice(), active: true, order: base + 1 + i, bountyCents: 0 } }; });
    DB.commit(ops).then(function () { toast('Added ' + ops.length + ' travel chores'); }, fail);
  }
  function renameCat(oldN, newN) {
    newN = trim(newN);
    if (!newN || newN === oldN) { schedule(); return; }
    var order = uniq(catList(S.chores).filter(function (n) { return n !== 'Other'; }).map(function (n) { return n === oldN ? newN : n; }));
    var ops = S.chores.filter(function (c) { return catName(c) === oldN; }).map(function (c) { return { t: 'update', c: 'chores', id: c.id, d: { cat: newN } }; });
    DB.commit(ops).then(function () { return saveSettings({ catOrder: order }); }).then(function () { toast('Category renamed'); }, fail);
  }

  /* ================= events ================= */
  function entry(id) { return find(S.entries, function (e) { return e.id === id; }); }
  function onClick(e) {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    if (window.Pets && window.Pets.onClick(e)) return;
    var tabBtn = e.target.closest ? e.target.closest('[data-tab]') : null;
    if (tabBtn) {
      flushQueue();
      S.tab = tabBtn.getAttribute('data-tab'); LS.set(MODE === 'bank' ? 'cl.ptab' : 'cl.tab', S.tab);
      S.edit = null; S.bankForm = null; S.bankPid = null; S.picking = false; S.quest = null; S.avEditFor = null;
      if (window.Pets) window.Pets.reset();
      go(); return;
    }
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || (b.tagName === 'INPUT' && b.type !== 'button')) return;
    var a = b.getAttribute('data-act'), d = function (k) { return b.getAttribute('data-' + k); };
    var list, c, pid, en;
    switch (a) {
      case 'adminToggle': if (S.admin) { if (MODE === 'bank') LS.set('cl.keep', null); setAdmin(null); toast(MODE === 'bank' ? 'Locked' : 'Parent mode locked'); } else if (S.adminOpen && MODE !== 'bank') { S.adminOpen = false; schedule(); } else openAdmin(); break;
      case 'adminOpen': openAdmin(); break;
      case 'roleKids': setRole('kids'); break;
      case 'adultAv': if (!needAdmin()) break; S.avEditFor = S.parent.id; if (window.Pets) window.Pets.G.dirtyAvatar = null; go(); window.scrollTo(0, 0); break;
      case 'adultSpot': if (!needAdmin()) break; DB.commit([{ t: 'merge', c: 'pets', id: S.parent.id, d: { spot: d('spot'), adult: true } }]).then(function () { toast(d('spot') ? 'The kids will find you there.' : 'You are off the map.'); }, fail); break;
      case 'toggleAdult': if (!needAdmin()) break; var tp = person(d('pid')); if (tp) DB.commit([{ t: 'update', c: 'people', id: tp.id, d: { adult: !tp.adult } }]).then(function () { toast(tp.name + (tp.adult ? ' is a kid again.' : ' is now a grown-up (no pet).')); }, fail); break;
      case 'roleParent': if (S.phase === 'app' && S.settingsDoc && ROLE && !S.admin) { needAdmin(); break; } setRole('parent'); break;
      case 'unkeep': LS.set('cl.keep', null); toast('The app will ask for your PIN again.'); touchAdmin(); go(); break;
      case 'adminClose': S.adminOpen = false; schedule(); break;
      case 'pick': S.picking = true; S.adminOpen = false; if (S.admin) setAdmin(null); schedule(); break;
      case 'choose':
        S.me = d('pid'); S.lastMe = S.me; LS.set('cl.me', S.me); S.picking = false; S.bankPid = null; S.quest = null;
        if (window.Pets) window.Pets.reset();
        if (S.me === '@parent') { if (!S.admin) openAdmin(); } else if (S.admin) setAdmin(null);
        S.tab = S.me === '@parent' ? S.tab : 'log'; go(); break;
      case 'sel': S.sel = d('pid'); S.quest = null; schedule(); break;
      case 'cat': S.cat = d('cat'); updateLogList(); break;
      case 'today': S.date = today(); S.dateAuto = true; schedule(); break;
      case 'inc':
        c = find(S.chores, function (x) { return x.id === d('cid'); }); pid = logTarget();
        if (!c || !pid) break;
        if (c.bountyCents > 0) {
          var sh = {}; sh[pid] = 100; S.quest = { cid: c.id, shares: sh };
          renderQuestBox();
          var qb = $('#questBox'); if (qb && qb.scrollIntoView) qb.scrollIntoView();
        } else addEntry(pid, S.date, c);
        break;
      case 'qshare':
        if (!S.quest) break;
        var cur = S.quest.shares[d('pid')] || 0, tot = 0;
        Object.keys(S.quest.shares).forEach(function (k) { tot += S.quest.shares[k]; });
        var nv = Math.max(0, Math.min(100, cur + Number(d('d'))));
        if (nv > cur && tot >= 100) break;
        S.quest.shares[d('pid')] = nv; renderQuestBox();
        break;
      case 'qsave':
        c = S.quest && find(S.chores, function (x) { return x.id === S.quest.cid; });
        if (c) addQuest(c, S.quest.shares, S.date).then(function () { S.quest = null; toast('Bounty logged'); schedule(); }, fail);
        break;
      case 'qcancel': S.quest = null; renderQuestBox(); break;
      case 'dec':
        pid = logTarget();
        list = S.entries.filter(function (x) { return x.pid === pid && x.date === S.date && x.cid === d('cid') && !x.paid && !x.bountyPaid && (x.status === 'pending' || (S.admin && x.status === 'approved')); });
        list.sort(function (x, y) { return y.ts - x.ts; });
        if (!list[0]) { toast('Approved chores can only be removed by a parent.', true); break; }
        if (list[0].questId) {
          var qid = list[0].questId, ops = [];
          S.entries.forEach(function (x) { if (x.questId === qid) { ops.push({ t: 'delete', c: 'entries', id: x.id }); if (x.status === 'approved') ops = ops.concat(petGrantOps(x, -1)); } });
          DB.commit(ops).catch(fail);
        } else removeEntry(list[0]);
        break;
      case 'apMode': S.apMode = d('m'); LS.set('cl.apmode', S.apMode); go(); break;
      case 'apToggle': S.apClosed[d('key')] = !S.apClosed[d('key')]; go(); break;
      case 'apGroup': case 'apUnit': if (needAdmin()) decide(d('key'), 'approved'); break;
      case 'rjUnit': if (needAdmin()) decide(d('key'), 'rejected'); break;
      case 'apRest':
        if (!needAdmin()) break;
        var rest = pendingUnits(); if (rest.length) queueDecision(rest, 'approved', 'the remaining ' + rest.length);
        break;
      case 'undo': undoLast(); break;
      case 'grantPass': if (needAdmin()) ADV.grantPass(d('pid'), 30).then(function () { toast('Added 30 adventure minutes for ' + pname(d('pid'))); }, fail); break;
      case 'addTravel': if (needAdmin()) addTravelChores(); break;
      case 'reopen':
        if (!needAdmin()) break;
        en = entry(d('id')); if (en) setStatus([en], 'pending').then(function () { toast('Moved back to waiting'); }, fail);
        break;
      case 'rm':
        en = entry(d('id'));
        if (!en) break;
        if (en.status !== 'pending' && !needAdmin()) break;
        confirmTap('rm' + en.id, function () { removeEntry(en); });
        break;
      case 'older':
        DB.query({ c: 'entries', where: [['date', '<', addDays(today(), -LIVE_DAYS)]], orderBy: ['date', 'desc'], limit: 1000 })
          .then(function (l) { S.older = l; go(); }, fail);
        break;
      case 'csv': downloadCsv(); break;
      /* bank */
      case 'acct': S.bankPid = d('pid'); S.bankForm = null; S.allTx = null; go(); break;
      case 'bankHome': S.bankPid = null; S.bankForm = null; go(); break;
      case 'bform':
        var f = d('f') || null;
        if ((f === 'deposit' || f === 'withdraw' || f === 'transfer') && !needAdmin()) break;
        S.bankForm = S.bankForm === f ? null : f; go();
        setTimeout(function () { var i = $('#rqItem') || $('#mAmt') || $('#tAmt'); if (i) i.focus(); }, 80);
        break;
      case 'allTx':
        var ap = d('pid');
        DB.query({ c: 'txns', where: [['pid', '==', ap]] }).then(function (l) { l.sort(function (x, y) { return y.ts - x.ts; }); S.allTx = { pid: ap, list: l }; go(); }, fail);
        break;
      case 'payday': if (needAdmin()) confirmTap('payday', payday); break;
      case 'reqApprove':
        if (!needAdmin()) break;
        var r = find(S.reqs, function (x) { return x.id === d('id'); });
        if (!r || r.status !== 'pending') break;
        var bal = Number((person(r.pid) || {}).balance) || 0;
        if (bal < r.cents && S.armed !== 'rq' + r.id) { S.armed = 'rq' + r.id; schedule(); break; }
        S.armed = null;
        bankTx(r.pid, -r.cents, 'purchase', r.item, [{ t: 'update', c: 'requests', id: r.id, d: { status: 'approved', decidedTs: Date.now(), decidedBy: S.parent.id } }])
          .then(function () { toast('Approved. ' + money(r.cents) + ' taken from ' + pname(r.pid) + '.'); }, fail);
        break;
      case 'reqDeny':
        if (!needAdmin()) break;
        DB.commit([{ t: 'update', c: 'requests', id: d('id'), d: { status: 'denied', decidedTs: Date.now(), decidedBy: S.parent.id } }]).then(function () { toast('Request denied'); }, fail);
        break;
      case 'reqCancel':
        DB.commit([{ t: 'delete', c: 'requests', id: d('id') }]).then(function () { toast('Request cancelled'); }, fail);
        break;
      /* setup */
      case 'togglePerson':
        if (!needAdmin()) break;
        var p = person(d('pid')); if (p) DB.commit([{ t: 'update', c: 'people', id: p.id, d: { active: p.active === false } }]).catch(fail);
        break;
      case 'rmParent':
        if (!needAdmin()) break;
        var rid = d('id');
        confirmTap('rmp' + rid, function () { saveSettings({ parents: (S.settings.parents || []).filter(function (x) { return x.id !== rid; }) }).then(function () { toast('Parent removed'); }, fail); });
        break;
      case 'newChore': S.edit = 'new'; go(); break;
      case 'editChore': S.edit = d('cid'); go(); break;
      case 'cancelEdit': S.edit = null; go(); break;
      case 'toggleChore':
        var ch = find(S.chores, function (x) { return x.id === d('cid'); });
        if (ch) DB.commit([{ t: 'update', c: 'chores', id: ch.id, d: { active: ch.active === false } }]).then(function () { S.edit = null; go(); }, fail);
        break;
      case 'catMove':
        var order = catList(S.chores).filter(function (x) { return x !== 'Other'; });
        var i = order.indexOf(d('cat')), j = i + Number(d('dir'));
        if (i < 0 || j < 0 || j >= order.length) break;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        saveSettings({ catOrder: order }).catch(fail);
        break;
      case 'exportFamily': exportFamily(); break;
      case 'signout': confirmTap('signout', function () { DB.logout().then(function () { location.reload(); }); }); break;
      case 'resetDemo': confirmTap('resetDemo', function () { DB.resetDemo(); LS.set('cl.me', null); location.reload(); }); break;
      /* wizard */
      case 'wzAdd': wizAddPerson(); break;
      case 'wzDel': S.wiz.people.splice(Number(d('i')), 1); renderWizard(); break;
      case 'wzSample': S.wiz.people = ['Alex', 'Sam', 'Riley']; renderWizard(); break;
      case 'wzClearImport': S.wiz.imported = null; renderWizard(); break;
    }
  }
  function onChange(e) {
    var t = e.target, a = t.getAttribute('data-act');
    if (t.id === 'date') { if (t.value) { S.date = t.value; S.dateAuto = t.value === today(); schedule(); } }
    else if (t.id === 'sort') { S.sort = t.value; updateLogList(); }
    else if (t.id === 'wzFile') wizImport(t.files && t.files[0]);
    else if (t.name === 'wzStarter') S.wiz.starter = t.value === '1';
    else if (t.getAttribute('data-hist')) { S.hist[t.getAttribute('data-hist')] = t.value; go(); }
    else if (a === 'showArch') { S.showArchived = t.checked; updateChoreList(); }
    else if (a === 'rename') {
      var nm = trim(t.value);
      if (nm && needAdmin()) DB.commit([{ t: 'update', c: 'people', id: t.getAttribute('data-pid'), d: { name: nm } }]).catch(fail);
      else schedule();
    }
    else if (a === 'renameCat') { if (needAdmin()) renameCat(t.getAttribute('data-old'), t.value); else schedule(); }
  }
  function onInput(e) {
    var t = e.target;
    if (t.id === 'q') { S.q = t.value; updateLogList(); }
    else if (t.id === 'cq') { S.cq = t.value; updateChoreList(); }
  }
  function onKey(e) { if (e.keyCode === 13 && e.target.id === 'wzPerson') { e.preventDefault(); wizAddPerson(); } }
  function onSubmit(e) {
    e.preventDefault();
    var f = e.target, kind = f.getAttribute('data-form');
    if (window.Pets && window.Pets.onSubmit(f, kind)) return;
    if (kind === 'login') {
      var em = val('lgEmail'), pw = val('lgPw');
      if (!em || !pw) { toast('Enter the email and password.', true); return; }
      DB.login(em, pw).then(function () { startApp(); }, function (err) {
        toast(/password|user-not-found|invalid/.test(err && err.code || '') ? 'Email or password is wrong.' : 'Could not sign in: ' + (err && err.message || 'unknown error'), true);
      });
      return;
    }
    if (kind === 'wizard') { var wp = $('#wzPerson'); if (wp && trim(wp.value)) wizAddPerson(); wizCreate(); return; }
    if (kind === 'pin') { submitPin('unlock', val('pin')); return; }
    if (kind === 'request') {
      var pid = S.bankPid, item = trim(val('rqItem')), cents = parseMoney(val('rqAmt'));
      if (!item) { toast('Say what you want to buy.', true); return; }
      if (!(cents > 0)) { toast('Enter a price like 12.99', true); return; }
      DB.commit([{ t: 'set', c: 'requests', id: DB.newId('requests'), d: { pid: pid, item: item, cents: cents, note: trim(val('rqNote')), status: 'pending', ts: Date.now(), by: S.me } }])
        .then(function () { S.bankForm = null; toast('Request sent'); go(); }, fail);
      return;
    }
    if (!needAdmin()) return;
    if (kind === 'newpin') submitPin('change', val('npin'), val('npin2'), '', function () { f.reset(); });
    else if (kind === 'addparent') submitPin('add', val('apPin'), val('apPin2'), val('apName'), function () { f.reset(); });
    else if (kind === 'money') {
      var k = f.getAttribute('data-kind'), amt = parseMoney(val('mAmt'));
      if (!(amt > 0)) { toast('Enter an amount like 5.00', true); return; }
      bankTx(S.bankPid, k === 'deposit' ? amt : -amt, k, trim(val('mMemo')) || (k === 'deposit' ? 'Deposit' : isDad(S.bankPid) ? 'Spending' : 'Withdrawal'))
        .then(function () { S.bankForm = null; toast((k === 'deposit' ? 'Deposited ' : 'Recorded ') + money(amt)); go(); }, fail);
    } else if (kind === 'transfer') {
      var to = val('tTo'), tAmt = parseMoney(val('tAmt')), memo = trim(val('tMemo')), from = S.bankPid;
      if (!to || !(tAmt > 0)) { toast('Pick who gets it and an amount.', true); return; }
      var tops = txOps(from, -tAmt, 'transfer', 'To ' + pname(to) + (memo ? ': ' + memo : '')).concat(txOps(to, tAmt, 'transfer', 'From ' + pname(from) + (memo ? ': ' + memo : '')));
      DB.commit(tops).then(function () { S.bankForm = null; toast('Sent ' + money(tAmt) + ' to ' + pname(to)); go(); }, fail);
    } else if (kind === 'person') {
      var name = trim(val('newName')); if (!name) return;
      var copy = val('copyFrom'), id = slug(name), n = 1;
      while (person(id)) id = slug(name) + '-' + (++n);
      var order = S.people.reduce(function (m, p) { return Math.max(m, typeof p.order === 'number' ? p.order : 0); }, -1) + 1;
      var pops = [{ t: 'set', c: 'people', id: id, d: { name: name, order: order, active: true, balance: 0 } }];
      if (copy) S.chores.forEach(function (c) { if ((c.who || []).indexOf(copy) >= 0) pops.push({ t: 'update', c: 'chores', id: c.id, d: { who: c.who.concat([id]) } }); });
      DB.commit(pops).then(function () { toast(name + ' added'); f.reset(); }, fail);
    } else if (kind === 'chore') {
      var cid = f.getAttribute('data-cid'), cname = trim(val('ceName')), pts = Math.round(Number(val('cePts'))), cat = trim(val('ceCat'));
      var bounty = parseMoney(val('ceBounty')), need = val('ceNeed');
      if (!cname || !(pts > 0)) { toast('Enter a name and a point value.', true); return; }
      if (isNaN(bounty)) { toast('Enter the bounty like 5.00, or leave it empty.', true); return; }
      var who = $$('input[name=who]', f).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      var mdays = $$('input[name=mday]', f).filter(function (x) { return x.checked; }).map(function (x) { return Number(x.value); });
      var data = { name: cname, pts: pts, who: who, cat: cat, need: need, bountyCents: bounty, major: $('#ceMajor').checked, majorEach: $('#ceEach').checked, majorDays: mdays, travel: $('#ceTravel').checked };
      var op = cid ? { t: 'update', c: 'chores', id: cid, d: data }
        : { t: 'set', c: 'chores', id: DB.newId('chores'), d: assign(data, { active: true, order: S.chores.reduce(function (m, c) { return Math.max(m, c.order || 0); }, 0) + 1 }) };
      var eff = catList(S.chores).filter(function (x) { return x !== 'Other'; });
      DB.commit([op]).then(function () {
        S.edit = null; toast('Chore saved'); go();
        if (cat && eff.indexOf(cat) < 0) return saveSettings({ catOrder: eff.concat([cat]) });
      }).catch(fail);
    } else if (kind === 'advset') {
      var from = val('vFrom'), to = val('vTo');
      if ((from && !to) || (!from && to) || (from && to && from > to)) { toast('Pick both vacation dates, with the start first.', true); return; }
      saveSettings({ passBigJobs: Math.max(1, Math.round(Number(val('aJobs')) || 2)), passMinutes: Math.max(5, Number(val('aMin')) || 30), goldenMinutes: Math.max(5, Number(val('aGold')) || 45),
        earlyBy: val('aEarly') || '10:00', advWeekday: [val('aWd1') || '16:00', val('aWd2') || '19:00'], advWeekend: [val('aWe1') || '09:00', val('aWe2') || '19:00'],
        vacation: { from: from, to: to }, vacMinutes: Math.max(5, Number(val('vMin')) || 60), vacAutoPass: $('#vAuto').checked }).then(function () { toast('Saved'); go(); }, fail);
    } else if (kind === 'money2') {
      var rate = parseFloat(val('rate')), e1 = parseMoney(val('evo1')), e2 = parseMoney(val('evo2')), al = parseMoney(val('allow'));
      if (!(rate >= 0) || isNaN(e1) || isNaN(e2) || isNaN(al)) { toast('Check the numbers: use amounts like 5.00', true); return; }
      var p2 = { foodCoins: Math.max(1, Math.round(Number(val('fcoins')) || 10)), mealPrice: Math.max(1, Math.round(Number(val('mprice')) || 10)), careCoins: Math.max(1, Math.round(Number(val('ccoins')) || 10)), kitPrice: Math.max(1, Math.round(Number(val('kprice')) || 10)), bankName: trim(val('bname')) || 'Family Bank', requireApproval: $('#reqAppr').checked, centsPerPoint: rate, petEvolve1Cents: e1, petEvolve2Cents: e2, dadPid: val('dad'), allowanceCents: al, allowanceDay: Number(val('aday')) };
      if (p2.dadPid !== S.settings.dadPid || p2.allowanceDay !== Number(S.settings.allowanceDay) || !S.settings.allowanceLast) p2.allowanceLast = lastAllowanceDay(p2.allowanceDay);
      saveSettings(p2).then(function () { toast('Saved'); go(); }, fail);
    }
  }
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('focusout', function () { if (S.dirty) setTimeout(schedule, 300); });
  document.addEventListener('click', touchAdmin, true);
  document.addEventListener('keydown', touchAdmin, true);
  document.addEventListener('touchstart', function () { S.lastActive = Date.now(); }, true);
  /* Shared devices: back to the profile picker after 5 idle minutes. */
  function maybeRepick() {
    if (MODE !== 'family' || S.phase !== 'app' || S.picking || !S.me) return;
    if (Date.now() - S.lastActive > IDLE_PICK_MS) {
      S.me = null; S.quest = null; if (S.admin) setAdmin(null);
      if (window.Pets) window.Pets.reset();
      schedule();
    }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushQueue(); else maybeRepick(); });
  window.addEventListener('pagehide', flushQueue);

  /* ================= data ================= */
  function watch(name, spec, apply) {
    DB.watch(spec, function (res) { apply(res); S.ready[name] = true; schedule(); });
  }
  function startApp() {
    S.phase = 'app'; schedule();
    watch('people', { c: 'people' }, function (a) { a.sort(function (x, y) { return (x.order || 0) - (y.order || 0); }); S.people = a; });
    watch('chores', { c: 'chores' }, function (a) { S.chores = a; });
    watch('entries', { c: 'entries', where: [['date', '>=', addDays(today(), -LIVE_DAYS)]] }, function (a) { S.entries = a; });
    watch('txns', { c: 'txns', orderBy: ['ts', 'desc'], limit: 300 }, function (a) { S.txns = a; });
    watch('reqs', { c: 'requests', orderBy: ['ts', 'desc'], limit: 150 }, function (a) { S.reqs = a; });
    watch('pets', { c: 'pets' }, function (a) { var m = {}; a.forEach(function (p) { m[p.id] = p; }); S.pets = m; });
    watch('settings', { c: 'meta', id: 'settings' }, function (d) { S.settingsDoc = d; S.settings = assign({}, DEFAULTS, d || {}); });
    watch('adv', { c: 'adv', id: today() }, function (d) { S.adv = d || {}; });
    setInterval(function () {
      if (S.dateAuto && S.date !== today()) { S.date = today(); schedule(); }
      maybeRepick();
    }, 30000);
  }
  DB.onError = function (err) {
    var c = err && err.code || '';
    toast(/permission/.test(c) ? 'This sign-in does not have access to the household data.' : 'Lost contact with the database. Retrying...', true);
  };
  DB.onAuthChange = function () { if (DB.needsLogin()) { S.phase = 'login'; schedule(); } };

  /* Shared helpers for the pet game (js/pets.js). */
  window.CL = {
    S: S, schedule: schedule, go: go, toast: toast, fail: fail, esc: esc, money: money, today: today, addDays: addDays, daysBetween: daysBetween,
    fmtDate: fmtDate, person: person, pname: pname, pIndex: pIndex, isPerson: isPerson, isDad: isDad, isAdult: isAdult, kids: kids, activePeople: activePeople,
    txOps: txOps, accountHtml: accountHtml, needAdmin: needAdmin, logTarget: logTarget, confirmTap: confirmTap, bankName: bankName
  };

  DB.start(window.CL_CONFIG).then(function () {
    if (DB.needsLogin()) { S.phase = 'login'; schedule(); return; }
    startApp();
  }, function (e) { S.phase = 'error'; S.err = (e && e.message) || 'Unknown error'; schedule(); });
  schedule();

  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.CL_CONFIG && window.CL_CONFIG.offline !== false) {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }
})();
