/*
 * Chore Quest as a kids' tablet's home screen (cl-v42).
 *
 * The Android side (the chore-gate plugin, "ChoreGate") lets only Chore Quest, the Always apps and, once a kid's chores
 * marked "Unlocks games" are approved for the day, the games open; anything else is sent back here. This file:
 *   - tells the plugin who is playing and until when their games are open (sync, called after every redraw),
 *   - draws the kid's Home tab (today's game chores, Lit Town, the games) and the parent's Tablet tab
 *     (lock health, kids on this tablet, apps sorted into Games / Always / Hidden, games today, recently sent back),
 *   - answers the Home button, apps the lock sent back, and the screen waking up (asks who's playing again).
 * It is only switched on inside the kids' Android app when the plugin is there (Gate.on). ES5.
 *
 * Household settings: settings.gateApps = [{p: package, k: 'game' | 'always' | 'hide'}] (apps nobody sorted yet:
 * installed apps are games, Amazon's own apps are hidden, Lit Town is always open).
 * This tablet only (localStorage): cl.tabKids (kids who use it; empty = all), cl.wakeMin (ask who's playing after the
 * screen was off this many minutes; 0 = never), cl.gateOff ('1' = the lock is paused on this tablet).
 */
(function () {
  'use strict';
  var CAP = window.Capacitor;
  var ON = !!(window.CL_APP === 'kids' && CAP && CAP.isPluginAvailable && CAP.isPluginAvailable('ChoreGate') && CAP.nativePromise);
  var UP = !!(window.CL_APP === 'kids' && CAP && CAP.isPluginAvailable && CAP.isPluginAvailable('WebUpdate') && CAP.nativePromise);   /* over-the-air web updates */
  var LIT = 'com.family.littown';                           /* Lit Town as a separate app (the old way; still sorted as Always if it's installed) */
  var LT_PAGE = 'littown/index.html';                        /* Lit Town inside this app: its own section, same save store */
  var READING = [LIT, 'com.teachyourmonstertoread.tmapp'];   /* reading apps: open any time unless a parent says otherwise */
  var KINDS = [['game', 'Game'], ['always', 'Always'], ['hide', 'Hidden']];
  var G = { apps: null, appsAt: 0, loading: false, state: null, sent: '', msg: null, pending: [], html: '', auto: 0, upd: null, updPending: null };

  function C() { return window.CL; }
  function S() { return window.CL.S; }
  function esc(s) { return C().esc(s); }
  function call(method, opts) { return CAP.nativePromise('ChoreGate', method, opts || {}); }
  function upd(method, opts) { return UP ? CAP.nativePromise('WebUpdate', method, opts || {}) : Promise.reject(new Error('no updater')); }
  function kick() { if (window.CL) window.CL.schedule(); }   /* redraw, once app.js is there */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- this tablet ---------- */
  function tabletKids() { try { var a = JSON.parse(lsGet('cl.tabKids') || 'null'); return a && a.length ? a : null; } catch (e) { return null; } }
  function wakeMin() { var n = parseInt(lsGet('cl.wakeMin'), 10); return isNaN(n) ? 5 : n; }
  function paused() { return lsGet('cl.gateOff') === '1'; }
  function kidsHere() { var ids = tabletKids(); return C().kids().filter(function (p) { return !ids || ids.indexOf(p.id) >= 0; }); }

  /* ---------- apps and what they are ---------- */
  function sorted() { var m = {}; (S().settings.gateApps || []).forEach(function (x) { if (x && x.p) m[x.p] = x.k; }); return m; }
  function kindOf(a, m) { var k = (m || sorted())[a.pkg]; if (k) return k; if (READING.indexOf(a.pkg) >= 0) return 'always'; if (a.system || /^com\.google\.android\.|^com\.android\.vending$/.test(a.pkg)) return 'hide'; return 'game'; }   /* Google's own apps (Play Store) start hidden */
  function appFor(pkg) { return (G.apps || []).filter(function (x) { return x.pkg === pkg; })[0] || { pkg: pkg, label: pkg, system: false }; }
  function loadApps(force) {
    if (!ON || G.loading || (G.apps && !force)) return;
    G.loading = true;
    call('listApps', { icon: 96 }).then(function (r) {
      G.loading = false;
      G.apps = (r && r.apps || []).sort(function (a, b) { return String(a.label).localeCompare(String(b.label)); });
      G.appsAt = Date.now();
      G.sent = ''; G.html = ''; kick();
    }, function () { G.loading = false; });
  }
  function refreshState() {
    if (!ON) return;
    call('getState').then(function (st) { G.state = st; G.html = ''; kick(); }, function () {});
    if (UP) upd('getStatus').then(function (u) { G.upd = u; if (u && u.pending) G.updPending = u.pending; G.html = ''; kick(); }, function () {});
  }

  /* ---------- web updates: downloaded in the background, switched in when nobody is playing ---------- */
  function maybeApply() {
    if (!UP || !G.updPending || !C() || S().phase !== 'app') return;
    if (!((!S().me && !S().admin) || document.hidden)) return;   /* nobody picked, or Chore Quest is behind another app / the screen is off */
    var v = G.updPending; G.updPending = null;
    upd('applyUpdate').then(function () { refreshState(); }, function () {});   /* the web view reloads on its own when it applied */
  }
  function checkUpdates(force) {
    var cl = C();
    return upd('check', { force: !!force }).then(function (u) {
      G.upd = u; if (u && u.pending) G.updPending = u.pending; G.html = ''; cl.schedule();
      if (u && u.pending) cl.toast('Downloaded ' + u.pending + '. It switches in when nobody is playing.');
      else if (u && u.lastError) cl.toast('Could not check: ' + u.lastError);
      else cl.toast('Chore Quest is up to date (' + (u && u.running || '') + ').');
    }, function () { cl.toast('Could not check for updates.'); });
  }
  if (UP) {
    try { CAP.addListener('WebUpdate', 'update', function (ev) { G.updPending = ev && ev.version || G.updPending; G.html = ''; kick(); maybeApply(); }); } catch (e) {}
    /* the app's code loaded and drew something: this copy of the web files is good (else the plugin falls back to the built-in copy) */
    var ready = function () { setTimeout(function () { if (window.CL && window.CL.S) upd('webReady').then(null, function () {}); }, 1000); };
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
  }

  /* ---------- bedtime: the pets' night (Setup → Pet night). The tablet sleeps too: no games, no reading apps, no Lit Town ---------- */
  function vacation() { return !!(window.ADV && window.ADV.onVacation && window.ADV.onVacation()); }
  function bedtime() { return !vacation() && window.Pets && window.Pets.night ? window.Pets.night(null) : null; }   /* traveling: no bedtime */
  /* when tonight's (or tomorrow's) night starts, in ms; 0 when nights are off */
  function nextNightStart() {
    var st = S().settings; if (st.nightOff) return 0;
    var hm = String(st.nightStart || '20:00').split(':'), d = new Date(); d.setHours(+hm[0] || 20, +hm[1] || 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  /* ---------- who is playing, and the rules the lock gets ---------- */
  function kid() { var me = S().me, cl = C(); return cl.isPerson(me) && !cl.isAdult(me) ? me : null; }
  function policy() {
    var st = S(), pid = kid(), gs = pid ? C().gateStatus(pid) : null;
    var p = {
      on: !paused(), kid: pid, wakeMin: wakeMin(), alwaysMin: vacation() ? 0 : +st.settings.readMin || 0, gamesMin: vacation() ? 0 : +st.settings.gameMin || 0,
      gamesUntil: gs && gs.open ? gs.until : 0,
      parentUntil: st.admin ? Math.ceil((Date.now() + 25 * 60000) / 300000) * 300000 : 0   /* about half an hour, moved on every 5 minutes */
    };
    if (G.apps) {
      var m = sorted();
      p.always = []; p.games = [];
      G.apps.forEach(function (a) { var k = kindOf(a, m); if (k === 'always') p.always.push(a.pkg); else if (k === 'game') p.games.push(a.pkg); });
      if (bedtime() && !st.admin) { p.always = []; p.gamesUntil = 0; }   /* asleep: nothing opens (a parent still can) */
    }
    return p;
  }
  function sync() {
    if (!ON || !C() || S().phase !== 'app') return;
    if (G.pending.length) { var evs = G.pending; G.pending = []; evs.forEach(onGate); }
    loadApps(false);
    if (!S().me && !S().picking && Date.now() - G.auto > 1500) autoPick();
    var p = policy(), key = JSON.stringify(p);
    if (key === G.sent) return;
    G.sent = key;
    call('setPolicy', p).then(function (st) { G.state = st; }, function () { G.sent = ''; });
  }
  /* a tablet only one kid uses goes straight to them (unless they have a PIN) */
  function autoPick() {
    G.auto = Date.now();
    var ks = kidsHere();
    if (ks.length === 1 && !C().kidPinOf(ks[0].id)) C().chooseMe(ks[0].id);
  }

  /* ---------- the Home button, apps sent back, the screen waking up ---------- */
  function onGate(ev) {
    ev = ev || {};
    if (!C() || S().phase !== 'app') { G.pending.push(ev); return; }
    var cl = C(), st = S();
    G.sent = '';   /* Android may have changed the rules itself (wake clears them): send ours again on the next sync */
    if (ev.kind === 'apps') { loadApps(true); return; }   /* an app was installed or removed */
    if (ev.kind === 'wake') { G.msg = null; cl.repick(); autoPick(); return; }
    if (ev.kind === 'look') { if (window.Pets && (st.me === ev.kid || st.admin)) { cl.stopAll(); cl.setTab('pet'); window.Pets.openCreator(); } return; }   /* "Change my look" in Lit Town */
    if (ev.kind === 'blocked' && ev.pkg) G.msg = { pkg: ev.pkg, label: ev.label || ev.pkg, ts: Date.now(), why: ev.why || (bedtime() && !st.admin ? 'night' : '') };
    if (ev.kind === 'blocked' && ev.pkg === LT_PAGE) G.msg.label = 'Lit Town';
    if (ev.kind === 'blocked') refreshState();
    G.html = '';
    if (cl.isPerson(st.me) || st.admin) { cl.stopAll(); cl.setTab('home'); }
    else cl.go();
    if (ev.kind === 'blocked' && !kid() && !st.admin) cl.toast('Pick your name first.');
  }
  /* ---------- Lit Town inside the app: when its page hands back to this one ---------- */
  function fromLitTown() {
    var st = null, ev = null;
    try { st = JSON.parse(lsGet('cl.ltStart') || 'null'); } catch (e) {}
    try { ev = JSON.parse(lsGet('cl.fromLitTown') || 'null'); } catch (e) {}
    lsSet('cl.ltStart', null); lsSet('cl.fromLitTown', null); lsSet('cl.ltUntil', null);
    if (st && st.at) {
      /* reading time: what Lit Town counted while on screen (cl.ltMs), else the wall clock, never past its "until" or 6 hours */
      var ms = parseInt(lsGet('cl.ltMs'), 10);
      if (isNaN(ms)) ms = Date.now() - st.at;
      if (st.until) ms = Math.min(ms, Math.max(0, st.until - st.at));
      ms = Math.max(0, Math.min(ms, 6 * 3600000));
      lsSet('cl.ltMs', null);
      if (ms > 0) call('addUse', { kind: 'always', ms: ms }).then(refreshState, function () {});
    }
    if (ev && ev.ev && ev.ev.kind && Date.now() - (ev.at || 0) < 600000) onGate(ev.ev);
  }
  function openLitTown(pid) {
    var cl = C(), gs = pid ? cl.gateStatus(pid) : null, mins = gs ? left('always', gs.readMin) : null, nt = bedtime();
    if ((mins === 0 || nt) && !S().admin) { G.msg = { pkg: LT_PAGE, label: 'Lit Town', ts: Date.now(), why: nt ? 'night' : 'time' }; G.html = ''; cl.schedule(); window.scrollTo(0, 0); return; }
    var now = Date.now(), until = mins != null && !S().admin ? now + mins * 60000 : 0, ns = nextNightStart();
    if (ns && !S().admin && (!until || ns < until)) until = ns;   /* Lit Town comes back by bedtime */
    lsSet('cl.ltStart', JSON.stringify({ at: now, kid: pid, until: until }));
    /* cl-v51: every kid's character, for Lit Town to draw (one character for both games; see lt-bridge.js) */
    try {
      var looks = {}, P = window.Pets;
      cl.kids().forEach(function (k) { var d = P && P.doc(k.id), a = d && d.avatar; if (!a) return; looks[k.id] = { name: k.name, look: window.CHAR.look(P.kidAv(a)), have: d.closet || {} }; });
      lsSet('cl.looks', JSON.stringify(looks));
    } catch (e) {}
    lsSet('cl.ltUntil', until ? String(until) : null);
    lsSet('cl.ltMs', null);
    sync();
    window.Gate._nav(LT_PAGE + (pid ? '?kid=' + encodeURIComponent(pid) : ''));
  }
  if (ON) {
    try { CAP.addListener('ChoreGate', 'gate', function (ev) { onGate(ev); }); } catch (e) {}
    setTimeout(fromLitTown, 0);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      refreshState(); G.html = ''; G.sent = '';
      if (Date.now() - G.appsAt > 60000) loadApps(true);
      kick();
    });
    setInterval(function () { if (C()) { sync(); maybeApply(); if (S().tab === 'home' && !document.hidden) C().schedule(); } }, 5000);
    setTimeout(refreshState, 0);
  }

  /* ---------- drawing ---------- */
  function tile(a, locked, extra) {
    var icon = a.icon ? '<img src="' + a.icon + '" alt="">' : '<span class="app-dot">' + esc(String(a.label || '?').charAt(0)) + '</span>';
    return '<button type="button" class="app-tile' + (locked ? ' locked' : '') + '" data-gact="launch" data-pkg="' + esc(a.pkg) + '"' + (extra || '') + '>' + icon +
      '<span class="app-name">' + esc(a.label) + '</span>' + (locked ? '<span class="app-lock" aria-label="locked">&#128274;</span>' : '') + '</button>';
  }
  function chip(r) {
    var ic = r.st === 'ok' ? '&#10003;' : r.st === 'wait' || r.st === 'rep' ? '&#8987;' : '&#9675;';
    var note = r.st === 'ok' ? 'approved' : r.st === 'wait' ? 'waiting for a parent' : r.st === 'rep' ? (r.cant ? 'can’t do it today, waiting for a parent' : 'done already, waiting for a parent') : 'not done yet';
    /* cl-v49: the chore's name is a button that opens it on the Chores tab */
    return '<li class="gc ' + r.st + '"><span class="gc-ic">' + ic + '</span><button type="button" class="gc-go grow" data-gact="go-chore" data-cid="' + esc(r.id) + '"><span>' + esc(r.name) + '</span>' + (r.st === 'ok' ? '' : '<i aria-hidden="true">&rsaquo;</i>') + '</button><small>' + note + '</small>' +
      (r.st === 'todo' ? '<span class="gc-acts"><button class="btn small ghost" type="button" data-gact="done-already" data-cid="' + esc(r.id) + '" title="Someone else did it; a parent will check">Done already</button>' +
        '<button class="btn small ghost" type="button" data-gact="cant-do" data-cid="' + esc(r.id) + '" title="It can’t be done today; a parent will check">Can’t do it</button></span>' : '') + '</li>';
  }
  /* the rows a kid sees: still to do first, then waiting, then "done already", then approved; so an open job is always on top */
  var ORDER = { todo: 0, wait: 1, rep: 2, ok: 3 };
  function chips(rows) {
    var sorted = rows.slice().sort(function (a, b) { return (ORDER[a.st] || 0) - (ORDER[b.st] || 0); });
    return '<ul class="gate-list">' + sorted.map(chip).join('') + '</ul>';
  }
  /* today's minutes, when a parent set a daily limit */
  function left(kind, limitMin) {
    if (!limitMin) return null;
    var u = G.state && G.state.usage || {}, used = Math.round((u[kind] || 0) / 60000);
    return Math.max(0, limitMin - used);
  }
  function timeCard(gs) {
    var r = left('always', gs.readMin), g = left('games', gs.gameMin);
    if (r == null && g == null) return '';
    var row = function (label, mins, total) {
      var pct = Math.min(100, Math.round(100 * (total - mins) / total));
      return '<div class="time-row' + (mins ? '' : ' out') + '"><span class="grow">' + label + ': <b>' + (mins ? mins + ' min left' : 'done for today') + '</b></span><span class="meter" aria-hidden="true"><span style="width:' + pct + '%"></span></span></div>';
    };
    return '<div class="card time-card">' + (r != null ? row('&#128214; Reading time', r, gs.readMin) : '') + (g != null ? row('&#127918; Game time', g, gs.gameMin) : '') + '</div>';
  }
  function gamesCard(gs) {
    var cl = C(), h;
    if (gs.open) {
      h = '<div class="card games-card open"><h2>&#127918; Games are open' + (gs.vacation ? '' : ' until ' + cl.hm(gs.until)) + '</h2>' +
        '<p class="note">' + (gs.vacation ? 'Vacation mode: play anything. Have a good trip!' : gs.override === 'open' ? 'A parent opened them for today.' : 'All your game chores are approved. Have fun!') + '</p>';
    } else if (gs.override === 'closed') {
      h = '<div class="card games-card locked"><h2>&#128274; Games are locked today</h2><p class="note">A parent locked them for today.</p>';
    } else if (gs.late) {
      h = '<div class="card games-card locked"><h2>&#127769; Games are closed for the night</h2><p class="note">They open again tomorrow when your chores are approved.</p>';
    } else {
      h = '<div class="card games-card locked"><h2>&#128274; Games are locked</h2><p class="note">' +
        (gs.early ? 'They can open at ' + cl.hm(gs.hours[0]) + '. ' : '') + (gs.total ? 'Get ' + (gs.total === 1 ? 'this' : 'these') + ' approved to open them (' + gs.done + ' of ' + gs.total + ' done):' : 'No chores are set to unlock games today, so they stay locked. A grown-up can set some up, or open today.') + '</p>';
    }
    if (gs.total && !(gs.open && (gs.override === 'open' || gs.vacation))) h += chips(gs.rows);
    if (gs.later && gs.later.length && !gs.vacation && gs.override !== 'open') h += '<p class="note gate-later">Later today: ' + gs.later.map(function (r) { return esc(r.name) + ' (from ' + cl.hm(r.at) + ')'; }).join(', ') + '. Games lock again then until it’s done.</p>';
    if (!gs.open && gs.total && gs.done < gs.total && gs.override !== 'closed') h += '<div class="wrap"><button type="button" class="btn primary" data-tab="log">Go to my chores</button></div>';
    return h + '</div>';
  }
  function renderKid(pid) {
    var cl = C(), p = cl.person(pid), gs = cl.gateStatus(pid), m = sorted(), apps = G.apps || [];
    var games = [], always = [];
    apps.forEach(function (a) { var k = kindOf(a, m); if (a.pkg === LIT) return; if (k === 'game') games.push(a); else if (k === 'always') always.push(a); });   /* the old separate Lit Town app is never shown: the built-in one is */
    var now = new Date(), msg = G.msg && Date.now() - G.msg.ts < 120000 ? G.msg : null, nt = bedtime(), st = S();
    var h = '<section class="home stack">' +
      '<div class="home-hi"><div class="home-av">' + (window.Pets && window.Pets.miniHtml ? window.Pets.miniHtml(pid) : '') + '</div>' +
      '<div class="grow"><h1>Hi ' + esc(p ? p.name : '') + '!</h1><p class="note">' + now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ' &middot; ' + cl.hm(now.getTime()) + '</p></div>' +
      '<button type="button" class="btn small" data-act="pick">Not you?</button></div>' +
      (msg ? '<div class="banner warn" role="alert">&#128274; <b>' + esc(msg.label) + '</b> ' + (msg.why === 'night' ? 'is asleep, like everything else. Everything wakes up at ' + esc(nt ? nt.wake : 'morning') + '.' : msg.why === 'time' ? 'is done for today: the time for it is used up.' : kindOf(appFor(msg.pkg), m) === 'game' ? 'opens when your game chores are approved.' : 'isn’t allowed on this tablet. Ask a parent.') + '</div>' : '') +
      (nt && !st.admin ? '<div class="card night-card"><h2>&#127769; Everything is asleep</h2><p class="note">Games, reading apps and Lit Town wake up at <b>' + esc(nt.wake) + '</b>. You can still mark a chore done. Good night!</p></div>' +
        '<div class="app-grid"><button type="button" class="app-tile big" data-tab="log"><span class="app-dot cq">&#9733;</span><span class="app-name">My chores</span></button></div></section>' : '') +
      (nt && !st.admin ? '' : gamesCard(gs) + timeCard(gs) +
      '<div class="app-grid">' +
      '<button type="button" class="app-tile big" data-tab="log"><span class="app-dot cq">&#9733;</span><span class="app-name">My chores</span></button>' +
      '<button type="button" class="app-tile big" data-tab="pet"><span class="app-dot pet">&#128062;</span><span class="app-name">My pet</span></button>' +
      '<button type="button" class="app-tile big lit" data-gact="littown"><span class="app-dot lit">&#128214;</span><span class="app-name">Lit Town</span></button>' +
      always.map(function (a) { return tile(a, false); }).join('') + '</div>' +
      '<h2 class="games-h">Games</h2>' +
      (G.apps ? (games.length ? '<div class="app-grid games' + (gs.open ? '' : ' shut') + '">' + games.map(function (a) { return tile(a, !gs.open); }).join('') + '</div>'
        : '<p class="note">No games on this tablet yet.</p>') : '<p class="note">Loading the games...</p>') +
      '</section>');
    return h;
  }
  function updLine() {
    var u = G.upd;
    if (!u) return 'Chore Quest version: checking…';
    var h = 'Chore Quest ' + esc(u.running || '?') + (u.downloaded ? ' (downloaded; built in: ' + esc(u.bundled || '?') + ')' : ' (built in)') + '.';
    if (u.pending) h += ' <b>' + esc(u.pending) + ' is downloaded</b> and switches in when nobody is playing.';
    else if (u.lastError) h += ' Last check: ' + esc(u.lastError) + '.';
    else h += ' Updates install themselves from the website.';
    return h;
  }
  function healthRow(ok, label, fix, warn) { return '<div class="srow hrow ' + (ok ? 'ok' : warn ? 'warn' : 'bad') + '"><span class="h-ic">' + (ok ? '&#10003;' : warn ? '&#8505;' : '&#9888;') + '</span><div class="grow">' + label + '</div>' + (fix || '') + '</div>'; }
  function renderParent() {
    var cl = C(), st = G.state || {}, m = sorted(), here = tabletKids(), all = cl.kids(), wm = wakeMin();
    var gateOk = st.gateEnabled && st.gateRunning;
    var h = '<section class="home stack parent-tab">' +
      '<div class="card stack tight"><h2>This tablet</h2>' +
      (st.isHome ? healthRow(true, 'Chore Quest is the home screen.')
        : st.fireLauncher === 'enabled' ? healthRow(false, 'Amazon’s screen is still the tablet’s home screen (Fire OS 7.3 and later won’t let it be switched off). The lock covers it: Chore Quest comes back whenever it shows, and at start-up.', '', true)
        : healthRow(false, 'Chore Quest isn’t the home screen yet. Run  tablet lock  over USB (see the tablet guide).', '<button class="btn small" type="button" data-gact="settings" data-which="home">Home settings</button>')) +
      healthRow(gateOk, gateOk ? 'The game lock is on.' : st.gateEnabled ? 'The game lock is switched on but not running yet. Restart the tablet if this stays.' : 'The game lock is off, so games and other apps can be opened from anywhere.',
        gateOk ? '' : '<button class="btn small primary" type="button" data-gact="fix">Turn it on</button>') +
      (paused() ? healthRow(false, 'The lock is paused on this tablet: every app opens.', '<button class="btn small primary" type="button" data-gact="pause" data-on="0">Turn the lock back on</button>') : '') +
      '<div class="wrap"><button class="btn" type="button" data-gact="settings" data-which="settings">Open Fire settings</button>' +
      (paused() ? '' : '<button class="btn" type="button" data-gact="pause" data-on="1">Pause the lock on this tablet</button>') +
      '<button class="btn" type="button" data-gact="reload">Check again</button></div>' +
      '<p class="note">While you’re unlocked as a parent, every app opens. Parent mode locks itself after 10 minutes without use in Chore Quest' + (st.model ? '. Tablet: ' + esc(st.model) : '') + '.</p>' +
      (UP ? '<div class="srow hrow ' + (G.upd && G.upd.lastError ? 'warn' : 'ok') + '"><span class="h-ic">' + (G.upd && G.upd.lastError ? '&#8505;' : '&#10003;') + '</span><div class="grow">' + updLine() + '</div><button class="btn small" type="button" data-gact="update">Check for updates</button></div>' : '') +
      '</div>';
    h += '<div class="card stack tight"><h2>Games today</h2><div class="list">' + all.map(function (p) {
      var gs = cl.gateStatus(p.id), ov = gs.override || 'auto';
      return '<div class="srow gate-row ' + cl.pCls(p) + '"><span class="dot"></span><div class="grow"><b>' + esc(p.name) + '</b><div class="note">' + esc(cl.gateLine(gs)) + '</div></div>' +
        '<div class="seg small" role="group">' + [['auto', 'By chores'], ['open', 'Open'], ['closed', 'Locked']].map(function (x) {
          return '<button type="button" data-act="gameDay" data-pid="' + esc(p.id) + '" data-mode="' + x[0] + '" aria-pressed="' + (ov === x[0]) + '">' + x[1] + '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div><p class="note">Pick which chores unlock games in Setup (tick Needed to unlock games on a chore).</p></div>';
    h += '<div class="card stack tight"><h2>Who uses this tablet</h2><div class="checks">' + all.map(function (p) {
      return '<label><input type="checkbox" data-gact="kidHere" data-pid="' + esc(p.id) + '"' + (!here || here.indexOf(p.id) >= 0 ? ' checked' : '') + '>' + esc(p.name) + '</label>';
    }).join('') + '</div>' +
      '<div class="wrap end"><label class="field w-md" for="gWake"><span>Ask “Who’s playing?” when the screen wakes after</span><select id="gWake" data-gact="wake">' + [[0, 'Never'], [1, '1 minute'], [5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes'], [60, '1 hour']].map(function (x) {
        return '<option value="' + x[0] + '"' + (wm === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select></label></div>' +
      '<p class="note">Only the ticked kids show on this tablet’s “Who’s playing?” screen. With one kid ticked (and no PIN), the tablet opens straight to them.</p></div>';
    var apps = G.apps || [];
    h += '<div class="card stack tight"><h2>Apps on this tablet</h2><p class="note"><b>Game</b>: opens once that kid’s game chores are approved. <b>Always</b>: opens any time (Lit Town, a reading app). <b>Hidden</b>: kids can’t open it (Amazon’s apps, Settings, the browser). New apps start as games; Amazon’s own start hidden. This list is shared by every tablet.</p>' +
      (G.apps ? '<div class="list apps-list">' + apps.map(function (a) {
        var k = kindOf(a, m);
        return '<div class="srow app-row"><span class="app-ico">' + (a.icon ? '<img src="' + a.icon + '" alt="">' : '') + '</span><div class="grow">' + esc(a.label) + '<div class="note mono">' + esc(a.pkg) + '</div></div>' +
          '<div class="seg small" role="group" aria-label="' + esc(a.label) + '">' + KINDS.map(function (x) {
            return '<button type="button" data-gact="kind" data-pkg="' + esc(a.pkg) + '" data-kind="' + x[0] + '" aria-pressed="' + (k === x[0]) + '">' + x[1] + '</button>';
          }).join('') + '</div><button class="btn small" type="button" data-gact="launch" data-pkg="' + esc(a.pkg) + '">Open</button></div>';
      }).join('') + '</div>' : '<p class="note">Loading the apps...</p>') +
      '<div class="wrap"><button class="btn" type="button" data-gact="apps">Refresh the list</button></div></div>';
    var bl = (st.blocked || []).filter(function (b) { return b && b.pkg; });
    h += '<div class="card stack tight"><h2>Recently sent back</h2>' + (bl.length ? '<div class="list">' + bl.map(function (b) {
      return '<div class="srow"><div class="grow">' + esc(b.label || b.pkg) + '<div class="note">' + esc(new Date(b.ts).toLocaleString()) + '</div></div>' +
        (kindOf(appFor(b.pkg), m) !== 'always' ? '<button class="btn small" type="button" data-gact="kind" data-pkg="' + esc(b.pkg) + '" data-kind="always">Always allow</button>' : '') + '</div>';
    }).join('') + '</div><div class="wrap"><button class="btn small" type="button" data-gact="clearBlocked">Clear the list</button></div>' : '<p class="note">Nothing yet.</p>') +
      '<p class="note">If a screen the kids need keeps closing (a game’s sign-in, a system message), allow it here.</p></div>';
    return h + '</section>';
  }
  function render(view) {
    if (!ON) { view.innerHTML = ''; return; }
    var st = S(), pid = kid();
    if (!G.state) refreshState();
    var h = st.admin ? renderParent() : pid ? renderKid(pid) : '<p class="note">Pick your name first.</p>';
    if (h !== G.html || !view.querySelector('.home')) { view.innerHTML = h; G.html = h; }
  }

  /* ---------- taps ---------- */
  function setKind(pkg, k) {
    var list = (S().settings.gateApps || []).filter(function (x) { return x && x.p !== pkg; });
    list.push({ p: pkg, k: k });
    return C().saveSettings({ gateApps: list });
  }
  function onClick(e) {
    if (!ON) return false;
    var b = e.target.closest ? e.target.closest('[data-gact]') : null;
    if (!b) return false;
    var a = b.getAttribute('data-gact'), cl = C(), st = S(), pkg = b.getAttribute('data-pkg');
    if (a === 'kidHere' || a === 'wake') return false;   /* handled on change */
    e.preventDefault();
    if (a === 'littown') { openLitTown(kid()); return true; }
    if (a === 'go-chore') { if (b.getAttribute('data-cid')) cl.goChore(b.getAttribute('data-cid')); return true; }
    if (a === 'cant-do') { var pid1 = kid(); if (pid1 && b.getAttribute('data-cid')) cl.reportDone(pid1, b.getAttribute('data-cid'), true).then(function () { cl.toast('Okay. A parent will check, and it won’t count against games once they agree.'); G.html = ''; cl.schedule(); }); return true; }
    if (a === 'done-already') { var pid0 = kid(); if (pid0 && b.getAttribute('data-cid')) cl.reportDone(pid0, b.getAttribute('data-cid')).then(function () { cl.toast('Okay. A parent will check that it’s done.'); G.html = ''; cl.schedule(); }); return true; }
    if (a === 'launch') {
      var pid = kid(), app = appFor(pkg);
      var gs0 = pid ? cl.gateStatus(pid) : null, k = kindOf(app), open = st.admin || k === 'always' || (k === 'game' && gs0 && gs0.open);
      var out = !st.admin && gs0 && ((k === 'always' && left('always', gs0.readMin) === 0) || (k === 'game' && left('games', gs0.gameMin) === 0));
      if (!open || out) { G.msg = { pkg: pkg, label: app.label, ts: Date.now(), why: out ? 'time' : '' }; G.html = ''; cl.schedule(); window.scrollTo(0, 0); return true; }
      var who = pid ? cl.person(pid) : null;
      sync();
      call('launch', { pkg: pkg, extras: who ? { cqKid: who.id, cqKidName: who.name } : {} }).then(function () { G.msg = null; }, function (err) { cl.toast((err && err.message) || 'Could not open that app.', true); });
      return true;
    }
    if (!cl.needAdmin()) return true;
    if (a === 'kind') { setKind(pkg, b.getAttribute('data-kind')).then(function () { G.sent = ''; G.html = ''; cl.toast('Saved for every tablet'); }, cl.fail); }
    else if (a === 'settings') call('openSettings', { which: b.getAttribute('data-which') || 'settings' })['catch'](function (err) { cl.toast((err && err.message) || 'Could not open settings', true); });
    else if (a === 'fix') {
      call('fixGate').then(function (s2) { G.state = s2; G.html = ''; cl.schedule(); cl.toast('The game lock is on.'); }, function () {
        cl.toast('Turn on “Chore Quest game lock” in the Accessibility list that opens now.');
        call('openSettings', { which: 'accessibility' })['catch'](function () {});
      });
    } else if (a === 'pause') { lsSet('cl.gateOff', b.getAttribute('data-on') === '1' ? '1' : null); G.sent = ''; G.html = ''; sync(); cl.schedule(); cl.toast(paused() ? 'The lock is paused on this tablet.' : 'The lock is back on.'); }
    else if (a === 'apps') { G.apps = null; loadApps(true); G.html = ''; cl.schedule(); }
    else if (a === 'update') { cl.toast('Checking…'); checkUpdates(true); }
    else if (a === 'reload') { refreshState(); loadApps(true); }
    else if (a === 'clearBlocked') call('clearBlocked').then(function (s2) { G.state = s2; G.html = ''; cl.schedule(); }, function () {});
    return true;
  }
  document.addEventListener('change', function (e) {
    if (!ON || !e.target || !e.target.getAttribute) return;
    var a = e.target.getAttribute('data-gact');
    if (a !== 'kidHere' && a !== 'wake') return;
    if (!C().needAdmin()) return;
    if (a === 'wake') lsSet('cl.wakeMin', String(parseInt(e.target.value, 10) || 0));
    else {
      var ids = [];
      Array.prototype.forEach.call(document.querySelectorAll('[data-gact="kidHere"]'), function (x) { if (x.checked) ids.push(x.getAttribute('data-pid')); });
      lsSet('cl.tabKids', ids.length && ids.length < C().kids().length ? JSON.stringify(ids) : null);
    }
    G.sent = ''; G.html = ''; sync(); C().toast('Saved on this tablet');
  });
  document.addEventListener('click', function (e) { if (onClick(e)) e.stopPropagation(); }, true);

  window.Gate = { on: ON, up: UP, sync: sync, openLitTown: openLitTown, _fromLitTown: fromLitTown, _nav: function (u) { window.location.href = u; }, render: render, tabletKids: tabletKids, onSubmit: function () { return false; }, _g: G, _policy: policy, _onGate: onGate };
})();
