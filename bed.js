/*
 * Bedtime Defense: a tower-defense game at the Adventure Gate.
 * Dirty laundry, toys and trash sneak in through the bedroom door and follow the rug toward the bed. Kids put their pets
 * around the room; every pet uses its Mess Defense attack (Defense.ATK), placed by kind:
 *   ranged : on the floor; shoots the mess in range that is closest to the bed (shot, pierce, lob, boomerang, beam, snipe,
 *            homing, rain, 3 at once, chain zap)
 *   rush   : on the floor; pounces on a mess in range (or charges through a line of them) and hops back
 *   wall   : ON the rug; messes have to chew through it
 *   ambush : ON the rug, hidden; springs when a mess steps on it
 *   lure   : on the floor right beside the rug; messes nearby walk to it, even backwards, and get gobbled one at a time
 * Fire + Leaf / Fire + Water / Water + Leaf combos work like Mess Defense. Tap a placed pet to power it up or send it home.
 * The bed has 10 comfy hearts; a mess that climbs in takes one (big ones take more). Chip bags and pizza boxes spill crumbs
 * when they're cleaned up, and the Laundry Pile bursts into socks.
 * Uses Adventure Pass time and pays deck tickets. Shares Mess Defense's art and attack helpers (Defense.kit). ES5, canvas 2D.
 */
(function () {
  'use strict';
  var COLS = 7, ROWS = 9, TEAM = 6, WAVES = 4, HEARTS = 10, ROOM = 10;   /* ROOM: pets that fit in the room at once */
  var RAF = window.requestAnimationFrame ? function (f) { window.requestAnimationFrame(f); } : function (f) { setTimeout(function () { f(Date.now()); }, 16); };
  function C() { return window.CL; }
  function A() { return window.ADV; }
  function Pz() { return window.Pets; }
  function K() { return window.Defense.kit; }
  function esc(s) { return C().esc(s); }
  var D = null;

  /* ---------------- rooms ----------------
   * Path points are in cell units (cell centres are +0.5); the first point is just outside the door, the last is on the bed.
   * The bed takes columns 2-4 of the bottom two rows. Decor squares can't hold pets. */
  var BED = { c0: 2, c1: 4, r0: 7, r1: 8 };
  var MAPS = [
    { name: 'Your room', pts: [[1.5, -0.6], [1.5, 1.5], [5.5, 1.5], [5.5, 3.5], [1.5, 3.5], [1.5, 5.5], [3.5, 5.5], [3.5, 7.2]],
      floor: ['#e9cfa3', '#e2c493'], rug: ['#5f84bd', '#8fb0e0', '#d5e3f7'], blanket: ['#f29bb5', '#f7c1d1'],
      decor: [[0, 0, 'shelf'], [6, 0, 'dresser'], [6, 6, 'toybox'], [5, 7, 'lamp'], [0, 8, 'plant']] },
    { name: 'Bunk room', pts: [[5.5, -0.6], [5.5, 2.5], [1.5, 2.5], [1.5, 4.5], [5.5, 4.5], [5.5, 6.5], [3.5, 6.5], [3.5, 7.2]],
      floor: ['#eed9b3', '#e6cea4'], rug: ['#4f9461', '#86c294', '#d3eed9'], blanket: ['#7cc0f0', '#b3dcf8'],
      decor: [[0, 0, 'shelf'], [6, 0, 'plant'], [0, 5, 'beanbag'], [1, 7, 'lamp'], [6, 8, 'toybox']] },
    { name: 'Attic room', pts: [[-0.6, 1.5], [5.5, 1.5], [5.5, 3.5], [1.5, 3.5], [1.5, 6.5], [3.5, 6.5], [3.5, 7.2]],
      floor: ['#d7b07c', '#cda46e'], rug: ['#7b5fb3', '#ab93db', '#e6dcf7'], blanket: ['#ffcf5a', '#ffe39a'],
      decor: [[6, 0, 'trunk'], [0, 6, 'books'], [6, 5, 'beanbag'], [5, 7, 'lamp'], [0, 8, 'plant']] }
  ];

  /* ---------------- messes ----------------
   * hp, speed (squares a second), hearts (taken from the bed), k (sprite size), tough (damage taken is cut, except
   * rock attacks and pounces), spill (crumbs left behind) */
  var FOES = {
    shirt: { name: 'Dirty T-shirt', hp: 70, speed: 0.62, hearts: 1, k: 0.6, bite: 14 },
    sock: { name: 'Stinky sock', hp: 90, speed: 0.55, hearts: 1, k: 0.58, bite: 16 },
    can: { name: 'Soda can', hp: 80, speed: 0.78, hearts: 1, k: 0.58, bite: 14 },
    car: { name: 'Toy car', hp: 55, speed: 1.12, hearts: 1, k: 0.6, bite: 12 },
    peel: { name: 'Banana peel', hp: 48, speed: 0.95, hearts: 1, k: 0.6, bite: 10 },
    chips: { name: 'Chip bag', hp: 95, speed: 0.55, hearts: 1, k: 0.6, bite: 14, spill: 3 },
    jeans: { name: 'Dirty jeans', hp: 180, speed: 0.42, hearts: 2, k: 0.65, bite: 20 },
    block: { name: 'Toy block', hp: 200, speed: 0.36, hearts: 2, k: 0.6, bite: 22, tough: 0.3 },
    pizza: { name: 'Pizza box', hp: 260, speed: 0.32, hearts: 2, k: 0.67, bite: 24, spill: 2 },
    crumb: { name: 'Crumb', hp: 22, speed: 0.9, hearts: 1, k: 0.41, bite: 8 },
    boss: { name: 'Laundry Pile', hp: 1300, speed: 0.22, hearts: 5, k: 0.79, bite: 50, burst: 3 }
  };
  var PAL = {
    shirt: { main: '#5aa0e0', dark: '#2a5a8f', light: '#cfe6fa', accent: '#ffffff' }, jeans: { main: '#4a6fa8', dark: '#24385e', light: '#a8c0e0', accent: '#e8a33a' },
    block: { main: '#e45757', dark: '#8a2424', light: '#ffe27a', accent: '#ffffff' }, car: { main: '#3a8ed8', dark: '#1f4f86', light: '#bfe6ff', accent: '#ffd23f' },
    chips: { main: '#e8473c', dark: '#8a1e18', light: '#d8dbe2', accent: '#ffd23f' }, can: { main: '#3aaf5a', dark: '#1f6a34', light: '#d8dbe2', accent: '#ffffff' },
    peel: { main: '#f2d43a', dark: '#7a5a1a', light: '#fff4c0', accent: '#6a4a14' }, pizza: { main: '#d8b07a', dark: '#8a6438', light: '#f2c14e', accent: '#c0392b' }
  };
  function pal(type) { return PAL[type] || K().FOE_PAL[type]; }
  function level(pid) { return Number(Pz().doc(pid).bedLevel) || 0; }
  function easyOn() { return D && D.easy != null ? D.easy : Pz().doc(D.pid).defEasy !== false; }

  /* ---------------- path geometry ---------------- */
  function buildPath(M) {
    var P = M.pts.map(function (p) { return { x: p[0], y: p[1] }; }), cum = [0], i;
    for (i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.abs(P[i].x - P[i - 1].x) + Math.abs(P[i].y - P[i - 1].y));
    var path = { P: P, cum: cum, L: cum[cum.length - 1], cells: {}, samples: [] };
    for (var d = 0; d <= path.L; d += 0.1) {
      var q = at(path, d), c = Math.floor(q.x), r = Math.floor(q.y), k = c + ',' + r;
      path.samples.push({ d: d, x: q.x, y: q.y });
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS || isBed(c, r)) continue;
      var off = Math.abs(q.x - c - 0.5) + Math.abs(q.y - r - 0.5);
      if (!path.cells[k] || off < path.cells[k].off) path.cells[k] = { d: d, off: off };
    }
    return path;
  }
  /* position along the path (axis-aligned segments) */
  function at(path, d) {
    var P = path.P, cum = path.cum, i = 1;
    d = Math.max(0, Math.min(path.L, d));
    while (i < P.length - 1 && cum[i] < d) i++;
    var a = P[i - 1], b = P[i], len = cum[i] - cum[i - 1] || 1, u = (d - cum[i - 1]) / len;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
  }
  function nearestOnPath(x, y) {
    var best = null, bd = 1e9;
    D.path.samples.forEach(function (s) { var dd = Math.sqrt((s.x - x) * (s.x - x) + (s.y - y) * (s.y - y)); if (dd < bd) { bd = dd; best = s; } });
    return { d: best ? best.d : 0, dist: bd };
  }
  function isBed(c, r) { return c >= BED.c0 && c <= BED.c1 && r >= BED.r0 && r <= BED.r1; }
  function decorAt(c, r) { var m = MAPS[D.map].decor; for (var i = 0; i < m.length; i++) if (m[i][0] === c && m[i][1] === r) return m[i][2]; return null; }
  function onRug(c, r) { return !!D.path.cells[c + ',' + r]; }

  /* ---------------- team ---------------- */
  function open(pid) {
    var r = K().raised(pid);
    D = { pid: pid, phase: 'team', picks: r.slice(0, TEAM).map(function (x) { return x.key; }), raised: r, help: K().helpers(TEAM, Date.now() % 1000), level: level(pid) };
    A().startExpedition(pid, 'bed');
    if (window.World) window.World.unmount();
    C().go();
  }
  function active() { return !!D; }
  function cost(x, a) { return (x.mine ? 75 : 50) + (a.t === 'wall' ? -10 : a.t === 'ambush' ? -15 : a.t === 'lure' ? 10 : 0) + (a.gen ? -15 : 0); }
  function teamList() {
    var picked = D.raised.filter(function (x) { return D.picks.indexOf(x.key) >= 0; }).slice(0, TEAM);
    return picked.concat(D.help.slice(0, TEAM - picked.length)).map(function (x) {
      var sp = CRE.byId(x.sp) || CRE.SPECIES[0], a = K().atk(sp.id);
      return { sp: x.sp, stage: x.stage, pal: x.pal, name: x.name, power: x.power, mine: x.mine, elem: K().ELEM[sp.type] || 'leaf', type: sp.type, atk: a, cost: cost(x, a), cool: 0, wear: x.wear, dye: x.dye };
    });
  }
  function where(a) { return a.t === 'wall' || a.t === 'ambush' ? 'goes on the rug' : a.t === 'lure' ? 'goes right next to the rug' : 'goes on the floor'; }

  /* ---------------- screens ---------------- */
  function render(view) {
    if (!D) return;
    if (D.phase === 'team') { view.innerHTML = teamHtml(); return; }
    if (D.phase === 'play' && !view.querySelector('#bedCanvas')) mount(view);
    if (D.phase === 'done') view.innerHTML = doneHtml();
  }
  function teamHtml() {
    var M = MAPS[D.level % MAPS.length];
    var h = '<section class="def bed stack tight"><div class="room-top"><strong>Bedtime Defense &middot; Night ' + (D.level + 1) + '</strong><button class="btn small" type="button" data-bact="quit">Leave</button></div>' +
      '<p class="note">Tonight: <b>' + esc(M.name) + '</b>. Dirty laundry, toys and trash are sneaking toward the bed! Pick your team. Pets you raised are stronger than helpers.</p>';
    if (D.raised.length) {
      h += '<h2>Your pets</h2><div class="def-team">' + D.raised.map(function (x) {
        var on = D.picks.indexOf(x.key) >= 0;
        return '<button type="button" class="def-card mine' + (on ? ' on' : '') + '" data-bact="pick" data-k="' + x.key + '" aria-pressed="' + on + '"><span class="def-art">' + K().art(x) + '</span><strong>' + esc(x.name) + '</strong><small>' + esc(CRE.byId(x.sp).type) + ' &middot; power ' + x.power.toFixed(1) + '</small>' + K().cardAtk(x) + '</button>';
      }).join('') + '</div>';
    }
    var fill = teamList().filter(function (x) { return !x.mine; });
    if (fill.length) h += '<h2>Helpers</h2><div class="def-team">' + fill.map(function (x) { return '<div class="def-card"><span class="def-art">' + K().art(x) + '</span><strong>' + esc(x.name) + '</strong><small>' + esc(x.type) + ' &middot; helper</small>' + K().cardAtk(x) + '</div>'; }).join('') + '</div>';
    h += '<div class="card def-combos"><strong>How to play</strong><ul>' +
      '<li>Messes walk along the <b>rug</b> from the door to the bed. Each one that climbs in takes a <b class="c-fire">&hearts;</b>.</li>' +
      '<li>Shooters and pouncers go on the <b>floor</b>. <b>Walls</b> and <b>ambushers</b> go on the rug. <b>Lures</b> go right next to the rug.</li>' +
      '<li>Up to ' + ROOM + ' pets fit in the room. Tap a pet you placed to <b>power it up</b> (twice) or send it home for half its bubbles back.</li>' +
      '<li>Combos work like Mess Defense: <b class="c-fire">Fire</b> + <b class="c-leaf">Leaf</b> coals, <b class="c-fire">Fire</b> + <b class="c-water">Water</b> steam, <b class="c-water">Water</b> + <b class="c-leaf">Leaf</b> mud.</li>' +
      '<li>Chip bags and pizza boxes spill crumbs. Watch out for the Laundry Pile!</li></ul></div>';
    var left = A().exp() ? Math.max(0, Math.round((A().exp().endsAt - Date.now()) / 60000)) : 0;
    h += '<label class="def-easy"><input type="checkbox" id="bedEasy"' + (easyOn() ? ' checked' : '') + '> <span><b>Easy mode</b>: soap bubbles collect themselves</span></label>';
    h += '<button class="btn primary block" type="button" data-bact="start">Start the night (' + left + ' min of adventure time left)</button></section>';
    return h;
  }
  function doneHtml() {
    var r = D.result;
    return '<section class="def bed stack tight"><div class="celebrate-card' + (r.win ? ' r-rare' : '') + '" style="position:static;margin:0 auto">' +
      '<h2>' + (r.win ? 'Sweet dreams! The bed stayed clean.' : r.time ? 'Adventure time is up' : 'The mess got into bed!') + '</h2>' +
      '<p>' + r.kills + ' mess' + (r.kills === 1 ? '' : 'es') + ' cleaned up' + (r.combos ? ', ' + r.combos + ' combo' + (r.combos === 1 ? '' : 's') : '') + (r.win ? ', ' + r.hearts + ' of ' + HEARTS + ' hearts left' : '') + '.</p>' +
      '<p><strong>+' + r.tickets + ' deck ticket' + (r.tickets === 1 ? '' : 's') + '</strong>' + (r.win ? ' &middot; next time is Night ' + (D.level + 2) : '') + '</p>' +
      '<div class="wrap" style="justify-content:center">' + (A().exp() && A().exp().endsAt > Date.now() + 30000 ? '<button class="btn primary" type="button" data-bact="again">Play again</button>' : '') +
      '<button class="btn" type="button" data-bact="quit">Back to town</button></div></div></section>';
  }

  /* ---------------- art ---------------- */
  var imgs = {};
  if (window.C3D) C3D.onReady(function () { imgs = {}; });
  function img(key, svg) {
    var e = imgs[key]; if (e) return e.ok ? e.im : null;
    e = imgs[key] = { im: new Image(), ok: false };
    e.im.onload = function () { e.ok = true; };
    e.im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return null;
  }
  function eyes(y) {
    return '<ellipse cx="40" cy="' + y + '" rx="7" ry="8" fill="#fff" stroke="#2b2233" stroke-width="2"/><ellipse cx="60" cy="' + y + '" rx="7" ry="8" fill="#fff" stroke="#2b2233" stroke-width="2"/><circle cx="37" cy="' + (y + 2) + '" r="3.5" fill="#2b2233"/><circle cx="57" cy="' + (y + 2) + '" r="3.5" fill="#2b2233"/>' +
      '<path d="M31 ' + (y - 10) + ' L46 ' + (y - 5) + ' M69 ' + (y - 10) + ' L54 ' + (y - 5) + '" stroke="#2b2233" stroke-width="4" stroke-linecap="round"/>';
  }
  /* flat stand-ins while the 3D sheets load (or when 3D is off) */
  function foeSvg(type, fr) {
    var p = pal(type), s = '', w = fr ? 3 : -3, ink = 'stroke="#2b2233" stroke-width="3" stroke-linejoin="round"';
    var feet = '<ellipse cx="' + (40 + w) + '" cy="92" rx="8" ry="5" fill="' + (p ? p.dark : '#444') + '"/><ellipse cx="' + (60 - w) + '" cy="92" rx="8" ry="5" fill="' + (p ? p.dark : '#444') + '"/>';
    if (type === 'shirt') s = '<path d="M30 20 L44 14 Q50 22 56 14 L70 20 L90 36 L80 50 L70 44 L70 86 L30 86 L30 44 L20 50 L10 36 Z" fill="' + p.main + '" ' + ink + '/><path d="M30 70 H70 M30 78 H70" stroke="' + p.accent + '" stroke-width="4"/>' + eyes(46) + feet;
    else if (type === 'jeans') s = '<path d="M26 10 H74 L78 90 H56 L50 46 L44 90 H22 Z" fill="' + p.main + '" ' + ink + '/><rect x="26" y="10" width="48" height="9" fill="' + p.dark + '"/>' + eyes(32);
    else if (type === 'block') s = '<rect x="20" y="16" width="60" height="60" rx="8" fill="' + p.main + '" ' + ink + '/>' + eyes(40) + '<path d="M42 62 Q50 56 58 62" stroke="#2b2233" stroke-width="3" fill="none"/>' + feet;
    else if (type === 'car') s = '<rect x="10" y="44" width="80" height="28" rx="10" fill="' + p.main + '" ' + ink + '/><path d="M28 44 L36 24 H66 L74 44 Z" fill="' + p.light + '" ' + ink + '/><circle cx="30" cy="76" r="10" fill="#2b2b33"/><circle cx="72" cy="76" r="10" fill="#2b2b33"/>' + '<g transform="translate(0 -2)">' + eyes(36) + '</g>';
    else if (type === 'chips') s = '<path d="M24 14 L76 14 L80 50 L76 86 L24 86 L20 50 Z" fill="' + p.main + '" ' + ink + '/><ellipse cx="50" cy="66" rx="16" ry="10" fill="' + p.accent + '"/><path d="M24 14 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6" stroke="' + p.light + '" stroke-width="3" fill="none"/>' + eyes(40) + feet;
    else if (type === 'can') s = '<rect x="28" y="12" width="44" height="74" rx="8" fill="' + p.main + '" ' + ink + '/><rect x="28" y="30" width="44" height="8" fill="' + p.accent + '"/><rect x="30" y="10" width="40" height="6" rx="3" fill="' + p.light + '"/>' + eyes(52) + feet;
    else if (type === 'peel') s = '<path d="M50 8 Q60 30 58 52 L82 88 L64 70 L52 92 L48 72 L30 90 L42 52 Q40 30 50 8 Z" fill="' + p.main + '" ' + ink + '/>' + eyes(44);
    else if (type === 'pizza') s = '<rect x="12" y="48" width="76" height="30" rx="4" fill="' + p.main + '" ' + ink + '/><path d="M12 48 L20 ' + (fr ? 22 : 30) + ' L88 ' + (fr ? 22 : 30) + ' L88 48 Z" fill="' + p.main + '" ' + ink + '/>' + '<g transform="translate(0 -16)">' + eyes(40) + '</g>' + feet;
    else return K().foeSvg(type === 'crumb' || type === 'sock' || type === 'boss' ? type : 'dust', fr);
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  }
  function foeSprite(type, fr) { return window.C3D && !C3D.off && C3D.has('foe_' + type) ? C3D.sprite('foe_' + type, fr, pal(type), 'walk') : null; }

  /* ---------------- waves ---------------- */
  function waves(L) {
    var out = [];
    for (var w = 0; w < WAVES; w++) {
      var list = [], t = 1, n = 6 + L + w * 3, hpk = 1 + L * 0.22 + w * 0.08;
      var pool = ['shirt', 'sock', 'can', 'shirt'];
      if (w + L >= 1) pool.push('car', 'peel');
      if (w + L >= 2) pool.push('chips', 'jeans');
      if (w + L >= 3) pool.push('block', 'pizza');
      for (var i = 0; i < n; i++) {
        var type = pool[Math.floor(Math.random() * pool.length)];
        list.push({ t: t, type: type, hpk: hpk });
        if (type === 'car' && Math.random() < 0.5) list.push({ t: t + 0.6, type: 'car', hpk: hpk });
        t += Math.max(0.8, 1.9 - L * 0.08 - w * 0.18) + Math.random() * 0.8;
      }
      if (w === WAVES - 1 && L >= 1) list.push({ t: t + 2, type: 'boss', hpk: hpk * (1 + L * 0.1) });
      out.push(list);
    }
    return out;
  }

  /* ---------------- play ---------------- */
  function start() {
    D.phase = 'play'; D.map = D.level % MAPS.length; D.path = buildPath(MAPS[D.map]);
    D.team = teamList(); D.sel = -1; D.pick = null; D.bubbles = 150 + Math.min(4, D.level) * 25; D.hearts = HEARTS; D.t = 0; D.spd = 1;
    D.W = waves(D.level); D.wave = 0; D.wi = 0; D.wt = 0; D.gap = 10; D.live = false;
    D.defs = []; D.foes = []; D.shots = []; D.fx = []; D.swipes = []; D.booms = []; D.drops = []; D.tiles = {};
    D.easy = easyOn();
    if (window.C3D) ['shirt', 'jeans', 'block', 'car', 'chips', 'can', 'peel', 'pizza', 'sock', 'crumb', 'boss'].forEach(function (k) { if (C3D.has('foe_' + k)) C3D.preload('foe_' + k); });
    D.kills = 0; D.combos = 0; D.nextBubble = 4; D.banner = { text: 'Place your pets!', until: 3 }; D.lastSave = Date.now();
    C().go();
  }
  function mount(view) {
    view.innerHTML = '<section class="def-play bed-play"><div class="def-hud"><span class="def-bub"><i></i><b class="mono" id="bedBub">0</b></span><span class="bed-hearts mono" id="bedHearts"></span><span id="bedWave" class="def-wave"></span><span id="bedTime" class="mono def-time"></span>' +
      '<button class="btn small bed-spd" type="button" data-bact="speed" id="bedSpd" title="Game speed">x1</button><button class="btn small" type="button" data-bact="quit">Leave</button></div>' +
      '<canvas id="bedCanvas" class="def-canvas" aria-label="Bedtime Defense board"></canvas>' +
      '<div class="bed-bar"><span class="grow" id="bedNext"></span><button class="btn primary small" type="button" data-bact="go" id="bedGo" hidden>Start now</button></div>' +
      '<div class="def-cards" id="bedCards"></div><div class="def-tip bed-tip" id="bedTip"></div></section>';
    var cv = view.querySelector('#bedCanvas');
    D.cv = cv; D.ctx = cv.getContext('2d'); D.root = view;
    size(); cardsHtml();
    D.run = true; D.last = 0; RAF(tick);
  }
  function size() {
    var w = Math.min(D.root.clientWidth || 320, 480), cell = Math.floor(w / COLS), dpr = Math.min(2, window.devicePixelRatio || 1);
    D.c = cell; D.PW = cell * COLS; D.PH = cell * ROWS; D.dpr = dpr;
    D.cv.width = D.PW * dpr; D.cv.height = D.PH * dpr; D.cv.style.width = D.PW + 'px'; D.cv.style.height = D.PH + 'px';
    D.bg = null;
  }
  function cardsHtml() {
    var el = D.root.querySelector('#bedCards'); if (!el) return;
    el.innerHTML = D.team.map(function (x, i) {
      return '<button type="button" class="def-slot' + (x.mine ? ' mine' : '') + '" data-bact="card" data-i="' + i + '"><span class="def-slot-art">' + CRE.draw(x.sp, x.stage, x.pal, 'ok', { acc: x.wear || '' }) + '</span><small class="mono">' + x.cost + '</small><i class="def-cool"></i></button>';
    }).join('');
    updateHud();
  }
  function upCost(d) { return d.lvl >= 2 ? 0 : Math.round(d.x.cost * (d.lvl ? 1.3 : 0.9) / 5) * 5; }
  function refund(d) { return Math.floor(d.spent / 2 / 5) * 5; }
  function updateHud() {
    var R = D.root; if (!R) return;
    var btns = R.querySelectorAll('#bedCards .def-slot');
    for (var i = 0; i < btns.length; i++) {
      var x = D.team[i], b = btns[i], ready = x.cool <= 0 && D.bubbles >= x.cost;
      b.className = 'def-slot' + (x.mine ? ' mine' : '') + (D.sel === i ? ' sel' : '') + (ready ? '' : ' wait');
      b.querySelector('.def-cool').style.height = Math.max(0, Math.min(1, x.cool / 3)) * 100 + '%';
    }
    var tip = R.querySelector('#bedTip'), key = '';
    if (tip) {
      var h = '';
      if (D.pick) {
        var d = D.pick, uc = upCost(d);
        h = '<span class="grow"><b>' + esc(d.x.name) + '</b> ' + stars(d.lvl) + '<br><small>' + esc(d.a.n) + ': ' + esc(K().atkLine(d.a)) + '</small></span>' +
          (uc ? '<button class="btn small primary" type="button" data-bact="up"' + (D.bubbles >= uc ? '' : ' disabled') + '>Power up <span class="mono">' + uc + '</span></button>' : '<span class="tag">Max power</span>') +
          '<button class="btn small" type="button" data-bact="home">Send home <span class="mono">+' + refund(d) + '</span></button>';
        key = 'p' + D.defs.indexOf(d) + ':' + d.lvl + ':' + (D.bubbles >= uc);
      } else if (D.sel >= 0) {
        var s = D.team[D.sel];
        h = '<span class="grow"><b>' + esc(s.name) + '</b>: ' + esc(s.atk.n) + ' (' + esc(K().atkLine(s.atk)) + '). <b>' + where(s.atk) + '</b>.</span>';
        key = 's' + D.sel;
      } else { h = '<span class="grow note">Tap a pet card, then a square. Tap a pet in the room to power it up.</span>'; key = 'n'; }
      if (tip.getAttribute('data-k') !== key) { tip.innerHTML = h; tip.setAttribute('data-k', key); }
    }
    var bb = R.querySelector('#bedBub'); if (bb) bb.textContent = D.bubbles;
    var hh = R.querySelector('#bedHearts'); if (hh) hh.innerHTML = '&hearts;' + D.hearts;
    var wv = R.querySelector('#bedWave'); if (wv) wv.textContent = 'Wave ' + (D.wave + 1) + '/' + WAVES;
    var sp = R.querySelector('#bedSpd'); if (sp) sp.textContent = 'x' + D.spd;
    var go = R.querySelector('#bedGo'), nx = R.querySelector('#bedNext'), wait = !D.live && D.gap > 0;
    if (go) { go.hidden = !wait; if (wait) go.textContent = 'Start now +' + Math.max(0, Math.round(D.gap * 2)); }
    if (nx) {
      var left = D.live ? D.W[D.wave].length - D.wi + D.foes.length : 0;
      nx.textContent = (wait ? (D.wave ? 'Wave ' + (D.wave + 1) + ' in ' + Math.ceil(D.gap) + 's' : 'Messes come in ' + Math.ceil(D.gap) + 's') : left + ' mess' + (left === 1 ? '' : 'es') + ' to go') + ' \u00b7 pets ' + D.defs.length + '/' + ROOM;
    }
    var tm = R.querySelector('#bedTime'), e = A().exp();
    if (tm && e) { var left = Math.max(0, Math.round((e.endsAt - Date.now()) / 1000)); tm.textContent = Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60); }
  }
  function stars(n) { var s = ''; for (var i = 0; i < n; i++) s += '&#9733;'; return s ? '<span class="bed-stars">' + s + '</span>' : ''; }

  /* ---------------- input on the board ---------------- */
  function tap(px, py) {
    var c = D.c;
    for (var i = D.drops.length - 1; i >= 0; i--) {
      var b = D.drops[i];
      if (Math.abs(px - b.x * c) < c * 0.45 && Math.abs(py - b.y * c) < c * 0.45) { D.bubbles += b.v; D.drops.splice(i, 1); fxAt('+' + b.v, b.x, b.y, '#3a8ed8'); updateHud(); return; }
    }
    var col = Math.floor(px / c), row = Math.floor(py / c);
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return;
    var here = defAt(col, row);
    if (here) { D.pick = D.pick === here ? null : here; D.sel = -1; updateHud(); return; }
    if (D.sel < 0) { if (D.pick) { D.pick = null; updateHud(); } return; }
    var x = D.team[D.sel], a = x.atk, rug = onRug(col, row);
    if (isBed(col, row)) { toast('That’s the bed! Pick a square on the floor.'); return; }
    if (decorAt(col, row)) { toast('Something’s already there.'); return; }
    if ((a.t === 'wall' || a.t === 'ambush') && !rug) { toast(x.name + ' goes on the rug.'); return; }
    if (a.t !== 'wall' && a.t !== 'ambush' && rug) { toast(x.name + ' goes on the floor, not the rug.'); return; }
    var near = null;
    if (a.t === 'lure') { near = nearestOnPath(col + 0.5, row + 0.5); if (near.dist > 1.15) { toast('Sweet pets go right next to the rug.'); return; } }
    if (D.defs.length >= ROOM) { toast('The room is full! Power up a pet or send one home.'); return; }
    if (x.cool > 0 || D.bubbles < x.cost) { toast(D.bubbles < x.cost ? 'Not enough bubbles yet.' : 'Almost ready…'); return; }
    D.bubbles -= x.cost; x.cool = 3;
    var hp = 80 * x.power * (a.hp || 1);
    D.defs.push({ c: col, r: row, cx: col + 0.5, cy: row + 0.5, px: col + 0.5, py: row + 0.5, x: x, a: a, lvl: 0, pw: x.power, spent: x.cost, hp: hp, max: hp, next: 0.3, kick: 0,
      gen: a.gen || 0, heal: 3, revive: a.revive || 0, rush: null, armed: a.t === 'ambush', rearmT: 0, face: 1, pd: rug ? D.path.cells[col + ',' + row].d : null, sd: near ? near.d : null, chew: 0 });
    D.sel = -1; updateHud();
  }
  function powerUp() {
    var d = D.pick; if (!d) return;
    var uc = upCost(d); if (!uc || D.bubbles < uc) return;
    D.bubbles -= uc; d.spent += uc; d.lvl++; d.pw = d.x.power * [1, 1.35, 1.75][d.lvl];
    var k = d.max; d.max = 80 * d.pw * (d.a.hp || 1); d.hp = Math.min(d.max, d.hp + (d.max - k));
    if (d.a.t === 'ambush' || d.a.t === 'lure') d.rearmT = Math.min(d.rearmT, 1);
    fxAt('Power up!', d.cx, d.cy - 0.3, '#c9a44c'); D.booms.push({ x: d.cx, y: d.cy, t0: D.t, col: '#ffd84a', r: 0.6 });
    updateHud();
  }
  function sendHome() {
    var d = D.pick; if (!d) return;
    D.bubbles += refund(d); D.defs = D.defs.filter(function (o) { return o !== d; }); D.pick = null;
    fxAt('Bye!', d.cx, d.cy - 0.3, '#5a6a66'); updateHud();
  }
  function toast(t) { D.banner = { text: t, until: D.t + 1.8, small: true }; }
  function defAt(c, r) { for (var i = 0; i < D.defs.length; i++) if (D.defs[i].c === c && D.defs[i].r === r) return D.defs[i]; return null; }
  function fxAt(text, x, y, col) { D.fx.push({ text: text, x: x, y: y, col: col, t0: D.t }); }
  function tile(k) { return D.tiles[k] || (D.tiles[k] = { coals: 0, wall: 0, mud: 0 }); }
  function foeKey(f) { var q = at(D.path, f.d); return Math.floor(q.x) + ',' + Math.floor(q.y); }
  function fpos(f) { return at(D.path, f.d); }

  /* ---------------- messes ---------------- */
  function spawn(s, d0) {
    var F = FOES[s.type];
    D.foes.push({ type: s.type, d: d0 == null ? 0 : d0, hp: F.hp * s.hpk, max: F.hp * s.hpk, hpk: s.hpk, slow: 0, stun: 0, burn: 0, burnD: 0, tags: {}, f: Math.random() * 2, face: -1, back: false });
    if (s.type === 'boss') D.banner = { text: 'The Laundry Pile is coming!', until: D.t + 3 };
  }
  /* one attack lands on one mess: damage, effects, then element combos (same rules as Mess Defense) */
  var mixI = 0;
  function hit(foe, elem, dmg, a, power, smash) {
    var F = FOES[foe.type];
    if (a && a.crit && Math.random() < a.crit) { dmg *= 2.5; fxAt('Lucky!', fpos(foe).x, fpos(foe).y - 0.3, '#e8a92b'); }
    if (F.tough && !smash && !(a && a.f === 'rock')) dmg *= 1 - F.tough;
    foe.hp -= dmg;
    if (a) {
      var eff = a.mix ? ['burn', 'slow', 'knock'][mixI = (mixI + 1) % 3] : null;
      if (a.slow || eff === 'slow') foe.slow = Math.max(foe.slow, a.slow || 2);
      if (a.stun) foe.stun = Math.max(foe.stun, a.stun * (foe.type === 'boss' ? 0.4 : 1));
      if (a.burn || eff === 'burn') { foe.burn = Math.max(foe.burn, a.burn || 2); foe.burnD = Math.max(foe.burnD, 4 * (power || 1)); }
      if ((a.knock || eff === 'knock') && foe.type !== 'boss') foe.d = Math.max(0, foe.d - (a.knock || 1) * 0.8);
      if (a.tile) { var tk = foeKey(foe); if (D.path.cells[tk]) tile(tk).mud = Math.max(tile(tk).mud, 4); }
    }
    var now = D.t, tg = foe.tags, fresh = function (k) { return tg[k] && now - tg[k] < 2.5; };
    var others = ['fire', 'water', 'leaf'].filter(function (k) { return k !== elem && fresh(k); });
    var combo = null;
    if (elem === 'rainbow' && others.length) combo = K().pair(others[0], others[0] === 'fire' ? 'leaf' : 'fire');
    else if (elem === 'rainbow') tg[['fire', 'water', 'leaf'][Math.floor(Math.random() * 3)]] = now;
    else if (others.length) combo = K().pair(elem, others[0]);
    else tg[elem] = now;
    if (combo) {
      tg.fire = tg.water = tg.leaf = 0; D.combos++;
      var key = foeKey(foe), q = fpos(foe), onR = !!D.path.cells[key];
      if (combo === 'coals') {
        if (onR) { var tl = tile(key); tl.coals++; if (tl.coals >= 3) { tl.coals = 0; tl.wall = 8; fxAt('FIRE WALL!', q.x, q.y - 0.3, '#ff5a1a'); } else fxAt('Hot coals ' + tl.coals + '/3', q.x, q.y - 0.3, '#e8653c'); }
        else foe.hp -= 15;
      } else if (combo === 'steam') {
        foe.stun = Math.max(foe.stun, 2.2); foe.hp -= 10;
        D.foes.forEach(function (o) { if (o !== foe && Math.abs(o.d - foe.d) < 1.2) o.stun = Math.max(o.stun, 1.2); });
        fxAt('Steam!', q.x, q.y - 0.3, '#9aa4b2');
      } else if (onR) { tile(key).mud = 6; fxAt('Mud!', q.x, q.y - 0.3, '#8a5a34'); }
    }
  }
  function dist(ax, ay, bx, by) { return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)); }
  function rangeOf(d) {
    var a = d.a, r;
    if (a.t === 'rush') r = a.pierce ? 3.4 : 1.6 + (a.r || 3) * 0.25;
    else if (a.t === 'lure') r = 2.3;
    else if (a.k === 'beam') r = 1.3 + (a.r || 1.5) * 0.35;
    else if (a.k === 'snipe') r = 4.2;
    else if (a.k === 'lob') r = 2.9;
    else if (a.k === 'seek' || a.k === 'rain') r = 99;
    else r = 2.6;
    return r + d.lvl * 0.3;
  }
  /* messes within reach, the one closest to the bed first */
  function inRange(x, y, R) {
    return D.foes.filter(function (f) { if (f.hp <= 0 || f.d < 0.3) return false; var q = fpos(f); return dist(x, y, q.x, q.y) <= R; })
      .sort(function (a, b) { return b.d - a.d; });
  }
  function act(d) {
    var a = d.a, x = d.x, dmg = (a.dmg || 0) * d.pw, elem = x.elem, f = a.f, R = rangeOf(d), list = inRange(d.cx, d.cy, R), i;
    if (!list.length) return false;
    var tg = list[0], q = fpos(tg); d.face = q.x >= d.cx ? 1 : -1;
    if (a.t === 'rush') {
      var dx = q.x - d.cx, dy = q.y - d.cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
      d.rush = { out: true, target: tg, hits: [], gx: d.cx + dx / len * R, gy: d.cy + dy / len * R };
      return true;
    }
    var sx = d.cx, sy = d.cy - 0.25;
    var shot = function (target, k, extra) {
      var tq = fpos(target), ddx = tq.x - sx, ddy = tq.y - sy, l = Math.sqrt(ddx * ddx + ddy * ddy) || 1, s = { k: k, x: sx, y: sy, vx: ddx / l, vy: ddy / l, target: target, elem: elem, f: f, dmg: dmg, a: a, power: d.pw, hits: [], life: 3, home: d, R: R };
      for (var e in extra) if (extra.hasOwnProperty(e)) s[e] = extra[e];
      D.shots.push(s);
    };
    if (a.k === 'shot') { for (i = 0; i < (a.shots || 1); i++) shot(tg, 'shot', { delay: i * 0.14 }); return true; }
    if (a.k === 'pierce') { shot(tg, 'line', { left: R + 0.6 }); return true; }
    if (a.k === 'boomer') { shot(tg, 'boomer', { out: Math.min(R, 3), went: 0, back: false }); return true; }
    if (a.k === 'lob') { shot(tg, 'lob', { x0: sx, y0: sy, tx: q.x, ty: q.y, u: 0, dur: 0.6 }); return true; }
    if (a.k === 'multi') { list.slice(0, 3).forEach(function (t2) { shot(t2, 'shot', {}); }); return true; }
    if (a.k === 'beam') {
      (a.sweep ? list.slice(0, 4) : [tg]).forEach(function (fo) { hit(fo, elem, dmg, a, d.pw); var fq = fpos(fo); D.swipes.push({ x0: sx, y0: sy, x1: fq.x, y1: fq.y - 0.1, elem: elem, f: f, t0: D.t, k: 'beam' }); });
      return true;
    }
    if (a.k === 'snipe') {
      var big = list.slice().sort(function (p, r) { return r.hp - p.hp; })[0], bq = fpos(big); hit(big, elem, dmg, a, d.pw);
      D.swipes.push({ x0: sx, y0: sy, x1: bq.x, y1: bq.y - 0.1, elem: elem, f: f, t0: D.t, k: 'beam', thin: true });
      return true;
    }
    if (a.k === 'chain') {
      var done = [tg], cur = tg; hit(tg, elem, dmg, a, d.pw);
      D.swipes.push({ x0: sx, y0: sy, x1: q.x, y1: q.y - 0.1, elem: elem, f: f, t0: D.t, k: 'zap' });
      for (var j = 0; j < 2; j++) {
        var cq = fpos(cur), nx = D.foes.filter(function (o) { return o.hp > 0 && done.indexOf(o) < 0 && dist(cq.x, cq.y, fpos(o).x, fpos(o).y) < 1.7; })[0];
        if (!nx) break;
        var nq = fpos(nx); hit(nx, elem, dmg * 0.7, a, d.pw); done.push(nx);
        D.swipes.push({ x0: cq.x, y0: cq.y - 0.1, x1: nq.x, y1: nq.y - 0.1, elem: elem, f: f, t0: D.t, k: 'zap' }); cur = nx;
      }
      return true;
    }
    if (a.k === 'seek' || a.k === 'rain') {
      var n = a.k === 'rain' ? (a.shots || 3) : 1;
      for (i = 0; i < n; i++) {
        var t3 = a.k === 'rain' ? list[Math.floor(Math.random() * list.length)] : (a.near ? tg : list.slice().sort(function (p, r) { return r.hp - p.hp; })[0]);
        D.shots.push({ k: 'drop', target: t3, x: fpos(t3).x, y: fpos(t3).y, elem: elem, f: f, dmg: dmg, a: a, power: d.pw, t0: D.t, life: 2, drop: a.k === 'rain' ? 0.5 + i * 0.12 : 0.35 });
      }
      return true;
    }
    shot(tg, 'shot', {}); return true;
  }
  function rushStep(d, dt) {
    var R = d.rush, a = d.a, spd = 8 * dt, gx, gy;
    if (R.out) {
      if (a.pierce) { gx = R.gx; gy = R.gy; }
      else if (!R.target || R.target.hp <= 0) { R.out = false; return; }
      else { var q = fpos(R.target); gx = q.x; gy = q.y; }
      var dx = gx - d.px, dy = gy - d.py, l = Math.sqrt(dx * dx + dy * dy);
      d.face = dx >= 0 ? 1 : -1;
      if (l <= spd) { d.px = gx; d.py = gy; } else { d.px += dx / l * spd; d.py += dy / l * spd; }
      if (a.pierce) {
        D.foes.forEach(function (f) { if (f.hp > 0 && R.hits.indexOf(f) < 0) { var fq = fpos(f); if (dist(fq.x, fq.y, d.px, d.py) < 0.5) { R.hits.push(f); hit(f, d.x.elem, a.dmg * d.pw, a, d.pw, true); } } });
        if (l <= spd) R.out = false;
      } else if (l < 0.35) {
        hit(R.target, d.x.elem, a.dmg * d.pw, a, d.pw, true); d.kick = 1; R.out = false;
        D.booms.push({ x: d.px, y: d.py, t0: D.t, col: '#ffffff', r: 0.35 });
      }
    } else {
      var hx = d.cx - d.px, hy = d.cy - d.py, hl = Math.sqrt(hx * hx + hy * hy);
      d.face = hx >= 0 ? 1 : -1;
      if (hl <= spd) { d.px = d.cx; d.py = d.cy; d.rush = null; } else { d.px += hx / hl * spd; d.py += hy / hl * spd; }
    }
  }
  function spring(d, on) {
    var a = d.a, p = d.pw, elem = d.x.elem;
    d.armed = false; d.rearmT = a.rearm || 12; d.kick = 1;
    if (a.a === 'mine') {
      D.foes.forEach(function (f) { if (f.hp > 0 && Math.abs(f.d - d.pd) <= 0.9) hit(f, elem, a.dmg * p, a, p, true); });
      D.booms.push({ x: d.cx, y: d.cy, t0: D.t, col: a.burn ? '#ff7a2a' : '#ffd84a', r: 0.95 }); fxAt('Pop!', d.cx, d.cy - 0.3, '#e8653c');
    } else if (a.a === 'grab') {
      var f = on.sort(function (x, y) { return y.d - x.d; })[0];
      if (f.type === 'boss') hit(f, elem, a.dmg * p * 1.2, a, p, true); else { hit(f, elem, 0, null, p); f.hp = 0; }
      D.booms.push({ x: d.cx, y: d.cy, t0: D.t, col: '#3f7a2f', r: 0.5 }); fxAt(f.type === 'boss' ? 'Chomp!' : 'Gotcha!', d.cx, d.cy - 0.3, '#3f7a2f');
    } else {
      D.foes.forEach(function (f) { if (f.hp > 0 && Math.abs(f.d - d.pd) <= (a.splash || 0.6)) hit(f, elem, a.dmg * p, a, p); });
      D.booms.push({ x: d.cx, y: d.cy, t0: D.t, col: '#9fe3ff', r: 0.75 }); fxAt(a.knock ? 'Riddle me this!' : 'Trapped!', d.cx, d.cy - 0.3, '#2a6aa8');
    }
  }
  function lureOf(f, q) {
    var best = null, bg = 1e9;
    D.defs.forEach(function (d) {
      if (d.a.t !== 'lure' || d.chew > 0) return;
      var g = Math.abs(d.sd - f.d);
      if (g <= 3.5 && dist(d.cx, d.cy, q.x, q.y) <= rangeOf(d) && g < bg) { bg = g; best = d; }
    });
    return best;
  }
  /* a wall standing just ahead of this mess on the rug */
  function wallAhead(f, F) {
    var w = null;
    D.defs.forEach(function (d) { if (d.a.t === 'wall' && d.pd != null) { var g = d.pd - f.d; if (g >= -0.1 && g <= 0.45 + F.k * 0.2 && (!w || d.pd < w.pd)) w = d; } });
    return w;
  }
  function tick(ts) {
    if (!D || !D.run) return;
    if (!D.cv || !document.body.contains(D.cv)) { D.run = false; return; }
    var dt = Math.min(0.05, D.last ? (ts - D.last) / 1000 : 0.016); D.last = ts;
    for (var i = 0; i < D.spd && D && D.run; i++) { D.t += dt; step(dt); }
    if (D && D.run) draw();
    if (D && Math.floor(D.t * 8) !== Math.floor((D.t - dt) * 8)) updateHud();
    if (D && D.run) RAF(tick);
  }
  function startWave() {
    D.live = true; D.gap = 0; D.wi = 0; D.wt = 0;
    D.banner = { text: 'Wave ' + (D.wave + 1) + '!', until: D.t + 2 };
  }
  function step(dt) {
    var e = A().exp();
    if (!e || Date.now() >= e.endsAt) { finish(false, true); return; }
    if (Date.now() - D.lastSave > 60000) { D.lastSave = Date.now(); A().saveTime(false); }
    /* waves: a short break before each one (tap the button to skip it for bonus bubbles) */
    if (!D.live) { D.gap -= dt; if (D.gap <= 0) startWave(); }
    else {
      D.wt += dt;
      var list = D.W[D.wave];
      while (D.wi < list.length && list[D.wi].t <= D.wt) spawn(list[D.wi++]);
      if (D.wi >= list.length && !D.foes.length) {
        if (D.wave >= WAVES - 1) { finish(true); return; }
        D.wave++; D.live = false; D.gap = 9; D.bubbles += 15;
        D.banner = { text: 'Wave cleared! +15', until: D.t + 2.2 };
      }
    }
    D.team.forEach(function (x) { if (x.cool > 0) x.cool -= dt; });
    /* soap bubbles drift up from the floor */
    D.nextBubble -= dt;
    if (D.nextBubble <= 0) { D.nextBubble = 6 + Math.random() * 2.5; D.drops.push({ x: 0.6 + Math.random() * (COLS - 1.2), y: ROWS + 0.2, v: 25, life: 9 }); }
    D.drops.forEach(function (b) { if (!b.still) b.y = Math.max(ROWS * 0.3, b.y - dt * 0.7); b.life -= dt; b.age = (b.age || 0) + dt; });
    if (D.easy) D.drops.forEach(function (b) { if (b.age > 0.8 && b.life > 0) { D.bubbles += b.v; fxAt('+' + b.v, b.x, b.y, '#3a8ed8'); b.life = 0; } });
    D.drops = D.drops.filter(function (b) { return b.life > 0; });
    for (var k in D.tiles) if (D.tiles.hasOwnProperty(k)) { var tl = D.tiles[k]; if (tl.wall > 0) tl.wall -= dt; if (tl.mud > 0) tl.mud -= dt; }
    /* pets */
    D.defs.forEach(function (d) {
      d.kick = Math.max(0, d.kick - dt * 4);
      if (d.rush) { rushStep(d, dt); return; }
      if (d.a.t === 'ambush') {
        if (!d.armed) { d.rearmT -= dt; if (d.rearmT <= 0) { d.armed = true; fxAt('Ready', d.cx, d.cy - 0.3, '#2f9e5b'); } return; }
        var on = D.foes.filter(function (f) { return f.hp > 0 && Math.abs(f.d - d.pd) < 0.35; });
        if (on.length) spring(d, on);
        return;
      }
      if (d.a.t === 'lure') {
        if (d.chew > 0) { d.chew -= dt; if (d.chew <= 0) fxAt('Hungry!', d.cx, d.cy - 0.3, '#e3528f'); return; }
        var atL = D.foes.filter(function (f) { return f.hp > 0 && Math.abs(f.d - d.sd) < 0.2; })[0];
        if (atL) {
          d.chew = (d.a.chew || 7) / (1 + d.lvl * 0.25); d.kick = 1; var lq = fpos(atL); d.face = lq.x >= d.cx ? 1 : -1;
          if (atL.type === 'boss') { hit(atL, d.x.elem, (d.a.dmg || 160) * d.pw, null, d.pw); atL.d = Math.max(0, atL.d - 1); fxAt('Big bite!', d.cx, d.cy - 0.3, '#e3528f'); }
          else { hit(atL, d.x.elem, 0, null, d.pw); atL.hp = 0; atL.eaten = true; fxAt('Yum!', d.cx, d.cy - 0.3, '#e3528f'); }
          D.booms.push({ x: lq.x, y: lq.y, t0: D.t, col: '#ff9cc0', r: 0.55 });
        }
        return;
      }
      if (d.a.gen) { d.gen -= dt; if (d.gen <= 0) { d.gen = d.a.gen; D.drops.push({ x: d.cx, y: d.cy - 0.4, v: 25, life: 8, still: true }); } }
      if (d.a.heal) { d.heal -= dt; if (d.heal <= 0) { d.heal = 3; D.defs.forEach(function (o) { if (o !== d && dist(o.cx, o.cy, d.cx, d.cy) <= 1.6 && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + d.a.heal * d.pw); fxAt('+', o.cx, o.cy - 0.3, '#2f9e5b'); } }); } }
      if (d.a.t === 'wall') return;
      d.next -= dt; if (d.next > 0) return;
      if (act(d)) { d.next = (d.a.every || 1.6) / (1 + d.lvl * 0.12); d.kick = 1; } else d.next = 0.2;
    });
    /* shots */
    D.shots.forEach(function (s) {
      if (s.delay > 0) { s.delay -= dt; return; }
      s.life -= dt; if (s.life <= 0) { s.dead = true; return; }
      var q, sp = 7 * dt;
      if (s.k === 'drop') {
        if (D.t - s.t0 >= s.drop) { if (s.target.hp > 0) hit(s.target, s.elem, s.dmg, s.a, s.power); s.dead = true; }
        else { q = fpos(s.target); s.x = q.x; s.y = q.y; }
        return;
      }
      if (s.k === 'lob') {
        s.u += dt / s.dur; s.x = s.x0 + (s.tx - s.x0) * Math.min(1, s.u); s.y = s.y0 + (s.ty - s.y0) * Math.min(1, s.u);
        if (s.u >= 1) { var sx = s.tx, sy = s.ty; D.foes.forEach(function (f) { if (f.hp > 0) { var fq = fpos(f); if (dist(fq.x, fq.y, sx, sy) <= (s.a.splash || 0.5) + 0.2) hit(f, s.elem, s.dmg, s.a, s.power); } }); s.dead = true; D.booms.push({ x: sx, y: sy, t0: D.t, col: K().FCOL[s.f] || '#fff', r: 0.4 }); }
        return;
      }
      if (s.k === 'shot') {
        if (s.target && s.target.hp > 0) { q = fpos(s.target); var dx = q.x - s.x, dy = q.y - 0.15 - s.y, l = Math.sqrt(dx * dx + dy * dy) || 1; s.vx = dx / l; s.vy = dy / l; if (l < 0.3) { hit(s.target, s.elem, s.dmg, s.a, s.power); s.dead = true; return; } }
        else s.life = Math.min(s.life, 0.25);
        s.x += s.vx * sp; s.y += s.vy * sp; return;
      }
      /* line and boomerang shots go straight and hit everything they touch once (per trip) */
      s.x += s.vx * sp; s.y += s.vy * sp;
      if (s.k === 'line') { s.left -= sp; if (s.left <= 0) s.dead = true; }
      if (s.k === 'boomer') {
        s.went += sp;
        if (!s.back && s.went >= s.out) { s.back = true; s.hits = []; }
        if (s.back) { var hx = s.home.cx - s.x, hy = s.home.cy - 0.25 - s.y, hl = Math.sqrt(hx * hx + hy * hy) || 1; s.vx = hx / hl; s.vy = hy / hl; if (hl < 0.25) s.dead = true; }
      }
      D.foes.forEach(function (f) { if (f.hp > 0 && s.hits.indexOf(f) < 0) { var fq = fpos(f); if (dist(fq.x, fq.y - 0.15, s.x, s.y) < 0.4) { s.hits.push(f); hit(f, s.elem, s.dmg, s.a, s.power); } } });
      if (s.x < -1 || s.y < -1 || s.x > COLS + 1 || s.y > ROWS + 1) s.dead = true;
    });
    D.shots = D.shots.filter(function (s) { return !s.dead; });
    D.swipes = D.swipes.filter(function (w) { return D.t - w.t0 < 0.3; });
    D.booms = D.booms.filter(function (bm) { return D.t - bm.t0 < 0.45; });
    /* messes walk the rug */
    D.foes.forEach(function (f) {
      var F = FOES[f.type], q = fpos(f), key = Math.floor(q.x) + ',' + Math.floor(q.y), tl = D.tiles[key];
      if (tl && tl.wall > 0) f.hp -= 35 * dt;
      if (f.burn > 0) { f.burn -= dt; f.hp -= f.burnD * dt; }
      if (f.stun > 0) { f.stun -= dt; return; }
      if (f.slow > 0) f.slow -= dt;
      var spd = F.speed * (f.slow > 0 ? 0.6 : 1) * (tl && tl.mud > 0 ? 0.35 : 1), lure = lureOf(f, q), w;
      f.back = false;
      if (lure) {
        var dir = lure.sd > f.d ? 1 : -1, gap = Math.abs(lure.sd - f.d);
        if (gap > 0.05) {
          w = dir > 0 ? wallAhead(f, F) : null;
          if (w && w.pd < lure.sd) { w.hp -= F.bite * dt; f.f += dt * 6; }
          else { f.d += dir * Math.min(gap, spd * 1.25 * dt); f.f += dt * 4; f.back = dir < 0; }
          if (Math.random() < dt * 1.2) fxAt('♥', q.x, q.y - 0.5, '#ff6fa8');
        }
      } else {
        w = wallAhead(f, F);
        if (w) {
          w.hp -= F.bite * dt; f.f += dt * 6;
          if (w.a.thorns) f.hp -= w.a.thorns * w.pw * dt;
          if (w.a.slow) f.slow = Math.max(f.slow, w.a.slow);
          if (w.a.knock && f.type !== 'boss' && Math.random() < dt * 0.5) { f.d = Math.max(0, f.d - w.a.knock); fxAt('Boing!', q.x, q.y - 0.3, '#3a8ed8'); }
        } else { f.d += spd * dt; f.f += dt * 4; }
      }
      var dq = at(D.path, f.d), dx = f.back ? -dq.dx : dq.dx;
      if (Math.abs(dx) > 0.3) f.face = dx > 0 ? 1 : -1;
      if (f.d >= D.path.L - 0.05 && f.hp > 0) {
        f.hp = 0; f.inBed = true; D.hearts = Math.max(0, D.hearts - F.hearts);
        fxAt(F.hearts > 1 ? '-' + F.hearts + ' ♥' : '-♥', dq.x, dq.y - 0.4, '#d23a5a');
        D.booms.push({ x: dq.x, y: dq.y, t0: D.t, col: '#d23a5a', r: 0.6 });
        if (D.hearts <= 0) finish(false);
      }
    });
    if (!D.run) return;
    D.defs = D.defs.filter(function (d) {
      if (d.hp > 0) return true;
      if (d.revive > 0) { d.revive--; d.hp = d.max * 0.6; fxAt('Reborn!', d.cx, d.cy - 0.3, '#ff7a2a'); return true; }
      fxAt('Oof!', d.cx, d.cy - 0.3, '#9a4a4a'); if (D.pick === d) D.pick = null; return false;
    });
    var spills = [];
    D.foes = D.foes.filter(function (f) {
      if (f.hp > 0) return true;
      if (f.inBed) return false;
      var F = FOES[f.type], q = fpos(f);
      D.kills++; D.bubbles += 2;
      fxAt(f.eaten ? 'Gobbled!' : 'Clean!', q.x, q.y - 0.3, '#1e8a6a');
      if (Math.random() < 0.25) D.drops.push({ x: q.x, y: q.y, v: 15, life: 7 });
      if (F.spill && !f.eaten) { for (var i = 0; i < F.spill; i++) spills.push({ type: 'crumb', d: Math.max(0, f.d - 0.25 * i), hpk: f.hpk }); fxAt('Crumbs!', q.x, q.y - 0.6, '#a8803a'); }
      if (F.burst) { for (var j = 0; j < F.burst; j++) spills.push({ type: 'sock', d: Math.max(0, f.d - 0.4 * j), hpk: f.hpk }); D.banner = { text: 'The pile burst into socks!', until: D.t + 2.2 }; }
      return false;
    });
    spills.forEach(function (s) { spawn({ type: s.type, hpk: s.hpk }, s.d); });
    D.fx = D.fx.filter(function (x) { return D.t - x.t0 < 1.2; });
  }
  function finish(win, time) {
    if (!D || D.phase !== 'play') return;
    D.run = false; D.phase = 'done';
    var tickets = win ? 10 + Math.round(D.kills / 4) + Math.min(8, D.combos) : Math.floor(D.kills / 5);
    D.result = { win: win, time: !!time, kills: D.kills, combos: D.combos, tickets: tickets, hearts: D.hearts };
    var ops = [{ t: 'merge', c: 'pets', id: D.pid, d: { tickets: DB.inc(tickets), bedBest: Math.max(Number(Pz().doc(D.pid).bedBest) || 0, D.level + (win ? 1 : 0)) } }];
    if (win) ops[0].d.bedLevel = DB.inc(1);
    DB.commit(ops).catch(C().fail);
    A().saveTime(false);
    C().go();
  }
  function quit() {
    if (!D) return;
    D.run = false; A().saveTime(true); D = null;
    var G = Pz().G; G.room = null;
    if (window.World && window.World.W && window.World.W.P) { var P = window.World.W.P; P.y = P.ty = Math.max(1, P.y - 1); }
    C().go();
  }

  /* ---------------- drawing ---------------- */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
  function heart(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.35); g.bezierCurveTo(x - s * 0.9, y - s * 0.35, x - s * 0.35, y - s * 0.95, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.35, y - s * 0.95, x + s * 0.9, y - s * 0.35, x, y + s * 0.35); g.fill(); }
  /* the room itself never changes during a night, so it is painted once */
  function paintRoom() {
    var M = MAPS[D.map], c = D.c, cv = document.createElement('canvas'); cv.width = D.PW * D.dpr; cv.height = D.PH * D.dpr;
    var g = cv.getContext('2d'); g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    /* floorboards */
    var ph = c / 2;
    for (var r = 0; r < ROWS * 2; r++) {
      g.fillStyle = M.floor[r % 2]; g.fillRect(0, r * ph, D.PW, ph);
      g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(0, r * ph, D.PW, 1);
      for (var sx = ((r * 37) % 5) * c * 0.45; sx < D.PW; sx += c * 2.3) g.fillRect(sx, r * ph, 1, ph);
    }
    /* the rug runner */
    var pts = D.path.P;
    g.lineJoin = 'round'; g.lineCap = 'butt';
    [[0.86, M.rug[0]], [0.72, M.rug[1]]].forEach(function (L) {
      g.strokeStyle = L[1]; g.lineWidth = c * L[0]; g.beginPath(); g.moveTo(pts[0].x * c, pts[0].y * c);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x * c, pts[i].y * c); g.stroke();
    });
    g.setLineDash([c * 0.08, c * 0.08]); g.strokeStyle = M.rug[2]; g.lineWidth = Math.max(1.5, c * 0.04);
    [-0.25, 0.25].forEach(function (o) {
      g.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var n1 = segN(pts, Math.max(1, i)), n2 = segN(pts, Math.min(pts.length - 1, i + 1)), mx = n1.x + n2.x, my = n1.y + n2.y, ml = Math.sqrt(mx * mx + my * my) || 1;
        mx /= ml; my /= ml; var k = o / Math.max(0.5, mx * n1.x + my * n1.y), x = (pts[i].x + mx * k) * c, y = (pts[i].y + my * k) * c;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    });
    g.setLineDash([]);
    /* the door the mess sneaks in through */
    var p0 = pts[0];
    g.fillStyle = '#7a4e2a';
    if (p0.y < 0) { g.fillRect(p0.x * c - c * 0.5, 0, c, c * 0.16); g.fillStyle = '#3a2614'; g.fillRect(p0.x * c - c * 0.42, 0, c * 0.84, c * 0.1); }
    else { g.fillRect(0, p0.y * c - c * 0.5, c * 0.16, c); g.fillStyle = '#3a2614'; g.fillRect(0, p0.y * c - c * 0.42, c * 0.1, c * 0.84); }
    /* decor */
    M.decor.forEach(function (dd) { decor(g, dd[2], dd[0] * c, dd[1] * c, c); });
    /* the bed: foot at the top, pillows and headboard at the bottom wall */
    var bx = BED.c0 * c, by = BED.r0 * c, bw = (BED.c1 - BED.c0 + 1) * c, bh = (BED.r1 - BED.r0 + 1) * c;
    g.fillStyle = 'rgba(60,40,20,.18)'; rr(g, bx + c * 0.1, by + c * 0.12, bw - c * 0.14, bh - c * 0.1, c * 0.14); g.fill();
    g.fillStyle = '#a8774a'; rr(g, bx + c * 0.06, by + c * 0.04, bw - c * 0.12, bh - c * 0.04, c * 0.14); g.fill();
    g.fillStyle = '#fbf6ee'; rr(g, bx + c * 0.14, by + c * 0.1, bw - c * 0.28, bh - c * 0.38, c * 0.1); g.fill();
    g.fillStyle = M.blanket[0]; rr(g, bx + c * 0.14, by + c * 0.1, bw - c * 0.28, bh * 0.58, c * 0.1); g.fill();
    g.fillStyle = M.blanket[1];
    for (var qx = 0; qx < 4; qx++) for (var qy = 0; qy < 2; qy++) if ((qx + qy) % 2) g.fillRect(bx + c * 0.14 + qx * (bw - c * 0.28) / 4, by + c * 0.1 + qy * bh * 0.29, (bw - c * 0.28) / 4, bh * 0.29);
    g.fillStyle = '#ffffff'; g.fillRect(bx + c * 0.14, by + c * 0.1 + bh * 0.58 - c * 0.12, bw - c * 0.28, c * 0.14);
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
    rr(g, bx + c * 0.3, by + bh - c * 0.62, bw * 0.36, c * 0.3, c * 0.12); g.fill(); g.stroke();
    rr(g, bx + bw * 0.52, by + bh - c * 0.62, bw * 0.36, c * 0.3, c * 0.12); g.fill(); g.stroke();
    g.fillStyle = '#8a5a34'; rr(g, bx + c * 0.02, by + bh - c * 0.24, bw - c * 0.04, c * 0.24, c * 0.08); g.fill();
    /* a teddy on the pillow */
    var tx = bx + bw * 0.5, ty = by + bh - c * 0.5;
    g.fillStyle = '#b07a4a'; [[-0.12, -0.1], [0.12, -0.1]].forEach(function (e) { g.beginPath(); g.arc(tx + e[0] * c, ty + e[1] * c, c * 0.07, 0, 7); g.fill(); });
    g.beginPath(); g.arc(tx, ty, c * 0.14, 0, 7); g.fill(); g.fillStyle = '#e8c9a0'; g.beginPath(); g.arc(tx, ty + c * 0.04, c * 0.06, 0, 7); g.fill();
    g.fillStyle = '#2b2233'; g.beginPath(); g.arc(tx - c * 0.05, ty - c * 0.03, c * 0.018, 0, 7); g.arc(tx + c * 0.05, ty - c * 0.03, c * 0.018, 0, 7); g.fill();
    return cv;
  }
  /* unit normal of the path segment that ends at point i */
  function segN(pts, i) { var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y, l = Math.sqrt(dx * dx + dy * dy) || 1; return { x: -dy / l, y: dx / l }; }
  function decor(g, kind, x, y, c) {
    var s = c;
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(60,40,20,.15)'; rr(g, s * 0.1, s * 0.16, s * 0.84, s * 0.8, s * 0.1); g.fill();
    if (kind === 'dresser' || kind === 'trunk') {
      g.fillStyle = kind === 'trunk' ? '#6a4a8a' : '#9a6a40'; rr(g, s * 0.06, s * 0.08, s * 0.86, s * 0.82, s * 0.08); g.fill();
      g.fillStyle = kind === 'trunk' ? '#e2c46a' : '#c69a64';
      if (kind === 'trunk') { g.fillRect(s * 0.06, s * 0.38, s * 0.86, s * 0.08); g.fillRect(s * 0.44, s * 0.3, s * 0.1, s * 0.24); }
      else for (var i = 0; i < 3; i++) { g.fillRect(s * 0.14, s * (0.16 + i * 0.25), s * 0.7, s * 0.2); g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(s * 0.49, s * (0.26 + i * 0.25), s * 0.03, 0, 7); g.fill(); g.fillStyle = '#c69a64'; }
    } else if (kind === 'shelf' || kind === 'books') {
      g.fillStyle = '#8a5a34'; rr(g, s * 0.06, s * 0.1, s * 0.86, s * 0.8, s * 0.06); g.fill();
      var cols = ['#e45757', '#3a8ed8', '#f2d43a', '#6fcf8f', '#b58cff', '#ff9a4a'];
      for (var r = 0; r < 2; r++) for (var b = 0; b < 5; b++) { g.fillStyle = cols[(b + r * 2) % cols.length]; g.fillRect(s * (0.14 + b * 0.15), s * (0.16 + r * 0.38), s * 0.12, s * 0.32); }
    } else if (kind === 'plant') {
      g.fillStyle = '#c0683a'; rr(g, s * 0.3, s * 0.5, s * 0.4, s * 0.38, s * 0.06); g.fill();
      g.fillStyle = '#4f9a4a'; [[0.5, 0.36, 0.2], [0.34, 0.42, 0.14], [0.66, 0.42, 0.14], [0.5, 0.2, 0.13]].forEach(function (l) { g.beginPath(); g.arc(s * l[0], s * l[1], s * l[2], 0, 7); g.fill(); });
      g.fillStyle = '#6fbf63'; g.beginPath(); g.arc(s * 0.44, s * 0.3, s * 0.07, 0, 7); g.fill();
    } else if (kind === 'lamp') {
      g.fillStyle = '#9a6a40'; rr(g, s * 0.12, s * 0.14, s * 0.76, s * 0.74, s * 0.08); g.fill();
      g.fillStyle = 'rgba(255,226,122,.35)'; g.beginPath(); g.arc(s * 0.5, s * 0.46, s * 0.42, 0, 7); g.fill();
      g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(s * 0.5, s * 0.46, s * 0.2, 0, 7); g.fill();
      g.strokeStyle = '#c9a44c'; g.lineWidth = 2; g.stroke();
    } else if (kind === 'toybox') {
      g.fillStyle = '#e45757'; rr(g, s * 0.08, s * 0.14, s * 0.84, s * 0.74, s * 0.08); g.fill();
      g.fillStyle = '#ffd23f'; window.Defense.kit.star(g, s * 0.5, s * 0.52, s * 0.2);
      g.fillStyle = '#b3262a'; g.fillRect(s * 0.08, s * 0.14, s * 0.84, s * 0.1);
    } else if (kind === 'beanbag') {
      g.fillStyle = '#9a6ad0'; g.beginPath(); g.ellipse ? g.ellipse(s * 0.5, s * 0.52, s * 0.4, s * 0.36, 0.3, 0, 7) : g.arc(s * 0.5, s * 0.52, s * 0.38, 0, 7); g.fill();
      g.fillStyle = '#b58ce6'; g.beginPath(); g.arc(s * 0.42, s * 0.44, s * 0.16, 0, 7); g.fill();
    }
    g.restore();
  }
  function cx(x) { return x * D.c; }
  function draw() {
    var g = D.ctx, c = D.c, t = D.t, kit = K();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!D.bg) D.bg = paintRoom();
    g.drawImage(D.bg, 0, 0);
    g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    /* rug tiles: mud, coals, fire walls */
    for (var k in D.tiles) if (D.tiles.hasOwnProperty(k)) {
      var tl = D.tiles[k], pp = k.split(','), tx = +pp[0] * c, ty = +pp[1] * c;
      if (tl.mud > 0) { g.globalAlpha = Math.min(1, tl.mud) * 0.85; g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse ? g.ellipse(tx + c / 2, ty + c / 2, c * 0.38, c * 0.3, 0, 0, 7) : g.arc(tx + c / 2, ty + c / 2, c * 0.33, 0, 7); g.fill(); g.globalAlpha = 1; }
      for (var q = 0; q < tl.coals; q++) { g.fillStyle = '#5a1a0e'; g.beginPath(); g.arc(tx + c * (0.3 + q * 0.2), ty + c * 0.7, c * 0.07, 0, 7); g.fill(); g.fillStyle = 'rgba(255,120,40,' + (0.5 + 0.4 * Math.sin(t * 6 + q)) + ')'; g.beginPath(); g.arc(tx + c * (0.3 + q * 0.2), ty + c * 0.68, c * 0.035, 0, 7); g.fill(); }
      if (tl.wall > 0) for (var fl = 0; fl < 3; fl++) kit.flame(g, tx + c * (0.2 + fl * 0.3), ty + c * 0.85, c * 0.3, c * (0.55 + 0.12 * Math.sin(t * 9 + fl)));
    }
    /* where the selected card can go */
    if (D.sel >= 0) {
      var sa = D.team[D.sel].atk, onPath = sa.t === 'wall' || sa.t === 'ambush';
      g.fillStyle = 'rgba(58,170,110,.22)';
      for (var cc = 0; cc < COLS; cc++) for (var r = 0; r < ROWS; r++) {
        if (isBed(cc, r) || decorAt(cc, r) || defAt(cc, r) || onRug(cc, r) !== onPath) continue;
        if (sa.t === 'lure' && nearestOnPath(cc + 0.5, r + 0.5).dist > 1.15) continue;
        g.fillRect(cc * c + 2, r * c + 2, c - 4, c - 4);
      }
    }
    if (D.pick) { var R = Math.min(rangeOf(D.pick), 8); g.fillStyle = 'rgba(255,255,255,.18)'; g.strokeStyle = 'rgba(58,142,216,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(cx(D.pick.cx), cx(D.pick.cy), R * c, 0, 7); g.fill(); g.stroke(); }
    /* pets and messes, back to front */
    var items = [];
    D.defs.forEach(function (d) { items.push({ y: d.py + 0.01, f: function () { drawDef(g, d, c, t); } }); });
    D.foes.forEach(function (f) { var q = fpos(f); items.push({ y: q.y + 0.02, f: function () { drawFoe(g, f, q, c, t); } }); });
    items.sort(function (a, b) { return a.y - b.y; }).forEach(function (it) { it.f(); });
    /* beams and zaps */
    D.swipes.forEach(function (w) {
      var a = 1 - (D.t - w.t0) / 0.3, col = (w.f || w.elem) === 'rainbow' ? 'hsl(' + Math.floor(t * 400 % 360) + ',80%,60%)' : kit.FCOL[w.f] || kit.ECOL[w.elem];
      g.globalAlpha = Math.max(0, a); g.strokeStyle = col; g.lineCap = 'round';
      if (w.k === 'zap') { g.lineWidth = 3; g.beginPath(); g.moveTo(cx(w.x0), cx(w.y0)); g.lineTo((cx(w.x0) + cx(w.x1)) / 2 + 5, (cx(w.y0) + cx(w.y1)) / 2 - 5); g.lineTo(cx(w.x1), cx(w.y1)); g.stroke(); }
      else { g.lineWidth = w.thin ? 2.5 : c * 0.12; g.beginPath(); g.moveTo(cx(w.x0), cx(w.y0)); g.lineTo(cx(w.x1), cx(w.y1)); g.stroke(); }
      g.globalAlpha = 1;
    });
    D.shots.forEach(function (s) {
      if (s.delay > 0) return;
      var x = cx(s.x), y = cx(s.y), f = s.f || s.elem, col = kit.FCOL[f] || kit.ECOL[s.elem];
      if (f === 'rainbow') col = 'hsl(' + Math.floor(t * 400 % 360) + ',80%,60%)';
      if (s.k === 'lob') y -= Math.sin(Math.min(1, s.u) * Math.PI) * c * 0.8;
      if (s.k === 'drop') { var u = Math.min(1, (D.t - s.t0) / s.drop); y = cx(s.y) - c * (1 - u) * 1.4; }
      kit.projectile(g, f, col, x, y, c, t);
    });
    D.booms.forEach(function (bm) {
      var k2 = (D.t - bm.t0) / 0.45, bx = cx(bm.x), by = cx(bm.y), br = bm.r * c;
      g.globalAlpha = Math.max(0, 1 - k2); g.strokeStyle = bm.col; g.lineWidth = c * 0.1 * (1 - k2) + 1;
      g.beginPath(); g.arc(bx, by, br * (0.4 + k2 * 0.8), 0, 7); g.stroke();
      g.fillStyle = bm.col; for (var q2 = 0; q2 < 6; q2++) { var an = q2 * 1.047 + bm.t0; g.beginPath(); g.arc(bx + Math.cos(an) * br * k2, by + Math.sin(an) * br * k2, c * 0.05, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    });
    D.drops.forEach(function (b2) {
      var x = cx(b2.x), y = cx(b2.y) + Math.sin(t * 3 + b2.x * 9) * 3, r2 = c * 0.3;
      g.globalAlpha = b2.life < 2 ? b2.life / 2 : 1;
      g.fillStyle = 'rgba(200,236,255,.6)'; g.strokeStyle = '#6fb8e8'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r2, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r2 * 0.35, y - r2 * 0.35, r2 * 0.2, 0, 7); g.fill();
      g.fillStyle = '#1f5a99'; g.font = 'bold ' + Math.round(c * 0.2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b2.v, x, y + 1);
      g.globalAlpha = 1;
    });
    D.fx.forEach(function (x) {
      var a = (t - x.t0) / 1.2;
      g.globalAlpha = Math.max(0, 1 - a); g.font = 'bold ' + Math.round(c * 0.24) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(x.text, cx(x.x), cx(x.y) - a * c * 0.6); g.fillStyle = x.col; g.fillText(x.text, cx(x.x), cx(x.y) - a * c * 0.6);
    });
    g.globalAlpha = 1;
    if (D.banner && t < D.banner.until) {
      g.font = 'bold ' + Math.round(c * (D.banner.small ? 0.26 : 0.4)) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var tw = Math.min(D.PW - 8, g.measureText(D.banner.text).width + 24);
      g.fillStyle = 'rgba(23,33,30,.82)'; g.fillRect(D.PW / 2 - tw / 2, D.PH * 0.42 - c * 0.32, tw, c * 0.64);
      g.fillStyle = '#fff'; g.fillText(D.banner.text, D.PW / 2, D.PH * 0.42, D.PW - 20);
    }
  }
  function drawDef(g, d, c, t) {
    var kit = K(), frame = d.kick > 0.3 ? 2 : (Math.floor(t * 2 + d.c + d.r) % 8 === 0 ? 4 : 0);
    var im = kit.creImg(d.x, frame, d.face < 0) || kit.creImg(d.x, 0, d.face < 0), w = c * 0.98, h = w * 1.1, x = cx(d.px), by = cx(d.py) + c * 0.42;
    if (d.rush) by -= Math.abs(Math.sin(t * 18)) * c * 0.1;
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse ? g.ellipse(x, by - c * 0.02, c * 0.3, c * 0.09, 0, 0, 7) : g.arc(x, by, c * 0.25, 0, 7); g.fill();
    if (d.a.t === 'ambush') {
      if (d.armed) { g.globalAlpha = 0.55; if (im) g.drawImage(im, x - w * 0.4, by - h * 0.7, w * 0.8, h * 0.8); g.globalAlpha = 1; }
      kit.mound(g, x, by - c * 0.12, c, d.armed ? 0 : d.rearmT / (d.a.rearm || 12));
    } else if (im) g.drawImage(im, x - w / 2, by - h * 0.95, w, h);
    if (d.x.mine) { g.fillStyle = '#ffd84a'; kit.star(g, x - c * 0.36, cx(d.cy) - c * 0.36, c * 0.08); }
    if (d.lvl) { g.fillStyle = '#c9a44c'; for (var i = 0; i < d.lvl; i++) kit.star(g, x - c * 0.08 * (d.lvl - 1) + i * c * 0.16, by + c * 0.02, c * 0.07); }
    if (d.a.t === 'lure') {
      if (d.chew > 0) { g.fillStyle = '#c8874a'; for (var cr = 0; cr < 3; cr++) { g.beginPath(); g.arc(x - c * 0.22 + cr * c * 0.2, by - h * 0.4 - Math.abs(Math.sin(t * 9 + cr)) * c * 0.12, c * 0.035, 0, 7); g.fill(); } }
      else { g.strokeStyle = 'rgba(255,111,168,' + (0.3 + 0.25 * Math.sin(t * 4)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, by - h * 0.4, c * (0.55 + 0.15 * ((t * 0.8) % 1)), 0, 7); g.stroke(); }
    }
    if (d.hp < d.max) kit.bar(g, x, cx(d.cy) - c * 0.5, c * 0.6, d.hp / d.max, '#6fcf8f');
    if (D.pick === d) { g.strokeStyle = '#3a8ed8'; g.lineWidth = 2.5; g.strokeRect(d.c * c + 1.5, d.r * c + 1.5, c - 3, c - 3); }
  }
  function drawFoe(g, f, q, c, t) {
    var F = FOES[f.type], fr = Math.floor(f.f) % 2, x = cx(q.x), foot = cx(q.y) + c * 0.3, s3 = foeSprite(f.type, fr), s = c * F.k * 1.6;
    if (f.d < 0.25) g.globalAlpha = Math.max(0, f.d / 0.25);
    if (f.stun > 0) g.globalAlpha = 0.75;
    g.fillStyle = 'rgba(40,30,20,.16)'; g.beginPath(); g.ellipse ? g.ellipse(x, foot - c * 0.03, c * F.k * 0.6, c * 0.08, 0, 0, 7) : g.arc(x, foot, c * 0.2, 0, 7); g.fill();
    var mirror = f.face > 0;
    if (s3 && s3.canvas) {
      var kk = c * F.k * s3.m.span / s3.T, gx = s3.a.ground[0], gy = s3.a.ground[1];
      if (mirror) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(s3.canvas, -gx * kk, foot - gy * kk, s3.T * kk, s3.T * kk); g.restore(); }
      else g.drawImage(s3.canvas, x - gx * kk, foot - gy * kk, s3.T * kk, s3.T * kk);
    } else if (window.C3D && C3D.has('foe_' + f.type) && !C3D.ready('foe_' + f.type)) { /* still loading */ }
    else {
      var im = img('b|' + f.type + fr, foeSvg(f.type, fr));
      if (im) { if (mirror) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(im, -s / 2, foot - s * 0.95, s, s); g.restore(); } else g.drawImage(im, x - s / 2, foot - s * 0.95, s, s); }
    }
    g.globalAlpha = 1;
    var top = foot - c * F.k * 1.5;
    if (f.stun > 0) { g.fillStyle = 'rgba(230,236,242,.85)'; for (var p2 = 0; p2 < 3; p2++) { g.beginPath(); g.arc(x - c * 0.15 + p2 * c * 0.15, top - (t * 20 % 8), c * 0.06, 0, 7); g.fill(); } }
    if (f.slow > 0) { g.fillStyle = 'rgba(58,154,232,.7)'; g.beginPath(); g.arc(x + c * 0.2, top + c * 0.1, 3, 0, 7); g.fill(); }
    if (f.burn > 0) { g.fillStyle = 'rgba(255,122,42,' + (0.5 + 0.3 * Math.sin(t * 12)) + ')'; g.beginPath(); g.arc(x - c * 0.2, top + c * 0.1, 3.5, 0, 7); g.fill(); }
    var tg = f.tags, dots = [['fire', '#ff7a2a'], ['water', '#3a9ae8'], ['leaf', '#6fae4f']].filter(function (z) { return tg[z[0]] && t - tg[z[0]] < 2.5; });
    dots.forEach(function (z, i) { g.fillStyle = z[1]; g.beginPath(); g.arc(x - c * 0.12 + i * 7, foot + 4, 3, 0, 7); g.fill(); });
    if (f.type === 'sock' || f.type === 'boss') { g.strokeStyle = 'rgba(127,194,65,.8)'; g.lineWidth = 2; g.lineCap = 'round'; var lx = x + c * 0.15, ly = top - ((t * 12) % 6); g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + 4, ly - 5, lx, ly - 10); g.quadraticCurveTo(lx - 4, ly - 15, lx, ly - 20); g.stroke(); }
    if (f.hp < f.max) K().bar(g, x, top - 4, c * Math.min(0.9, F.k * 1.3), Math.max(0, f.hp / f.max), '#e45757');
  }

  /* ---------------- input ---------------- */
  document.addEventListener('click', function (e) {
    if (!D) return;
    var b = e.target.closest ? e.target.closest('[data-bact]') : null;
    if (b) {
      var a = b.getAttribute('data-bact');
      if (a === 'quit') quit();
      else if (a === 'start') start();
      else if (a === 'again') { D.level = level(D.pid); D.help = K().helpers(TEAM, Date.now() % 1000); D.phase = 'team'; C().go(); }
      else if (a === 'pick') {
        var k = b.getAttribute('data-k'), i = D.picks.indexOf(k);
        if (i >= 0) D.picks.splice(i, 1); else if (D.picks.length < TEAM) D.picks.push(k); else C().toast('Your team is full. Tap a pet to take it off.');
        C().go();
      } else if (a === 'card') { var n = +b.getAttribute('data-i'); D.sel = D.sel === n ? -1 : n; D.pick = null; updateHud(); }
      else if (a === 'up') powerUp();
      else if (a === 'home') sendHome();
      else if (a === 'speed') { D.spd = D.spd === 1 ? 2 : 1; updateHud(); }
      else if (a === 'go' && !D.live) { var bonus = Math.max(0, Math.round(D.gap * 2)); D.bubbles += bonus; if (bonus) fxAt('+' + bonus, COLS / 2, 1, '#3a8ed8'); startWave(); updateHud(); }
      return;
    }
    if (D.phase === 'play' && e.target === D.cv) {
      var r = D.cv.getBoundingClientRect();
      tap(e.clientX - r.left, e.clientY - r.top);
    }
  });
  document.addEventListener('change', function (e) {
    if (!D || !e.target || e.target.id !== 'bedEasy') return;
    D.easy = !!e.target.checked;
    DB.commit([{ t: 'merge', c: 'pets', id: D.pid, d: { defEasy: D.easy } }]).catch(C().fail);
  });
  window.addEventListener('resize', function () { if (D && D.phase === 'play' && D.cv && document.body.contains(D.cv)) size(); });

  window.BedDefense = { open: open, active: active, render: render, quit: quit, _state: function () { return D; }, FOES: FOES, MAPS: MAPS };
})();
