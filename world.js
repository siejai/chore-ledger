/*
 * The walkable world: a top-down 2D map drawn on a canvas. Two regions so far: the town and Sunny Beach.
 * You walk with the arrow pad (or tap a spot / a building), your pet follows you, and doors open indoor screens (js/pets.js).
 * Pet behaviour comes from its needs: tired pets walk slowly and nap, unexercised pets are slow and pudgy,
 * starving pets with no food in the bag wander off to dig in the dumpster.
 * At the beach, pet types unlock places: Water pets swim to the island, Leaf pets climb vines, Fire pets light the cave.
 * On the cruise ship you clean the Lido Deck for deck tickets: plates to the dish station, glasses to the bar,
 * towels to the towel cart, and puddles by the pool get mopped. A healthy pet carries one extra thing.
 * ES5, canvas 2D only.
 */
(function () {
  'use strict';
  var T = 32;
  var GRASS = 0, PATH = 1, TREE = 2, WATER = 3, FLOWER = 4, SOLID = 6, DOOR = 7, SAND = 8, SWIM = 9, VINE = 10, CAVE = 11, ROCK = 12, PIER = 13, EXIT = 14, WET = 15, PALM = 16, DECK = 17, RAIL = 18, POOL = 19, TABLE = 20, CHAIR = 21, COUNTER = 22, WALL = 23, FURN = 24, FLOOR = 25, TILEF = 26;
  var ROOF = ['#c2571a', '#127a6e', '#6d3fcf', '#c0306f', '#2956c9', '#55801a', '#b3262a'];
  var HOUSE_SPOTS = [[2, 8], [7, 8], [18, 8], [23, 8], [18, 14], [23, 14], [2, 20], [23, 20]];   /* 7,20 is the Pet Café, 17,20 the clothes shop */
  var ABIL = { Fire: ['light'], Water: ['swim'], Leaf: ['climb'], Cosmic: ['light', 'swim', 'climb'], Mythic: ['light', 'swim', 'climb'] };
  var W = { pid: null, region: 'town', map: null, mw: 30, mh: 26, key: '', bld: [], bg: null, bgs: {}, cv: null, ctx: null, root: null, run: false, last: 0, t: 0,
    P: null, pet: null, held: null, imgs: {}, msg: '', msgUntil: 0, scale: 1, cw: 0, ch: 0, dpr: 1, obj: null, fish: null };
  var RAF = window.requestAnimationFrame ? function (f) { window.requestAnimationFrame(f); } : function (f) { setTimeout(function () { f(Date.now()); }, 16); };
  function C() { return window.CL; }
  function Pz() { return window.Pets; }
  function A() { return window.ADV; }
  function can(ab) { var st = Pz().state(W.pid); if (!st.pet) return false; var sp = CRE.byId(st.pet.sp); return (ABIL[sp && sp.type] || []).indexOf(ab) >= 0; }

  /* ================= maps ================= */
  function grid(w, h, v) { var m = []; for (var y = 0; y < h; y++) { m.push([]); for (var x = 0; x < w; x++) m[y].push(v); } return m; }
  function buildTown(people) {
    var MW = 30, MH = 26, m = grid(MW, MH, GRASS), x, y;
    function set(x, y, v) { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y][x] = v; }
    function rect(x0, y0, w, h, v) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) set(xx, yy, v); }
    for (x = 0; x < MW; x++) { set(x, 0, TREE); set(x, MH - 1, TREE); }
    for (y = 0; y < MH; y++) { set(0, y, TREE); set(MW - 1, y, TREE); }
    [6, 12, 18, 24].forEach(function (yy) { rect(1, yy, MW - 2, 1, PATH); });
    rect(14, 1, 2, MH - 2, PATH);
    var bld = [];
    function building(kind, x0, y0, w, h, dx, extra) {
      rect(x0, y0, w, h, SOLID);
      var b = { kind: kind, x: x0, y: y0, w: w, h: h, door: { x: x0 + dx, y: y0 + h - 1 } };
      for (var k in extra) b[k] = extra[k];
      set(b.door.x, b.door.y, DOOR);
      bld.push(b);
      return b;
    }
    building('bank', 3, 1, 6, 5, 3, { title: C().bankName() });
    building('store', 20, 1, 6, 5, 2, { title: 'Store' });
    building('prizes', 16, 1, 3, 4, 1, { title: 'Prize Shop' });
    set(26, 4, SOLID); set(26, 5, SOLID);
    building('park', 2, 14, 10, 4, 4, { title: 'Park' });
    building('gate', 13, 25, 4, 1, 1, { title: 'Adventure Gate' });
    building('cafe', 7, 20, 5, 4, 2, { title: 'Pet Café' });
    building('clothes', 17, 20, 5, 4, 2, { title: 'Clothes Shop' });
    set(15, 25, DOOR);
    people.slice(0, HOUSE_SPOTS.length).forEach(function (p, i) {
      var s = HOUSE_SPOTS[i];
      building('house', s[0], s[1], 4, 4, 1, { owner: p.id, title: p.name, color: C().pColor(p) || ROOF[C().pIndex(p)] });
    });
    rect(10, 1, 3, 4, WATER);
    [[17, 2], [18, 3], [27, 2], [12, 9], [12, 10], [27, 9], [27, 15], [12, 21], [12, 22], [27, 21], [16, 9], [16, 21], [9, 15]].forEach(function (t) { if (m[t[1]][t[0]] === GRASS) set(t[0], t[1], TREE); });
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (y = 1; y < MH - 1; y++) for (x = 1; x < MW - 1; x++) if (m[y][x] === GRASS && rnd() < 0.07) set(x, y, FLOWER);
    return { map: m, mw: MW, mh: MH, bld: bld, dumpster: { x: 26, y: 4 }, dig: { x: 26, y: 6 } };
  }
  function buildBeach() {
    var MW = 26, MH = 22, m = grid(MW, MH, SAND), x, y;
    function set(x, y, v) { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y][x] = v; }
    function rect(x0, y0, w, h, v) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) set(xx, yy, v); }
    for (x = 0; x < MW; x++) set(x, 0, PALM);
    for (y = 0; y < MH; y++) { set(0, y, PALM); set(MW - 1, y, ROCK); }
    rect(1, 14, MW - 2, 2, WET);
    rect(1, 16, MW - 2, MH - 16, WATER);
    // pier and fishing spot
    rect(12, 14, 1, 6, PIER);
    // island reached by swimming
    rect(20, 18, 4, 3, SAND); rect(21, 16, 1, 2, SWIM);
    // cliff plateau reached by vines
    rect(5, 1, 1, 5, ROCK); rect(12, 1, 1, 5, ROCK); rect(6, 5, 6, 1, ROCK); set(8, 5, VINE);
    // cave in the cliff on the right
    rect(18, 1, 7, 9, ROCK); rect(19, 2, 5, 6, CAVE); set(21, 8, CAVE); set(21, 9, CAVE);
    // palms and tide pools
    [[2, 4], [3, 8], [1, 11], [4, 12], [15, 3], [16, 7], [10, 9], [14, 11]].forEach(function (t) { set(t[0], t[1], PALM); });
    [[6, 11], [7, 11], [17, 12]].forEach(function (t) { set(t[0], t[1], WATER); });
    set(1, 2, EXIT);
    var chests = [{ x: 9, y: 2, need: 'climb', hint: 'A chest up on the cliff. A Leaf pet could climb the vines.' },
      { x: 22, y: 19, need: 'swim', hint: 'A chest on the little island. A Water pet could swim you there.' },
      { x: 23, y: 3, need: 'light', hint: 'It is too dark to see. A Fire pet could light up the cave.' }];
    var spots = [];
    for (y = 2; y < 14; y++) for (x = 2; x < 17; x++) if (m[y][x] === SAND && !(x < 13 && y < 6)) spots.push([x, y]);
    return { map: m, mw: MW, mh: MH, bld: [], chests: chests, fishAt: { x: 12, y: 19 }, spots: spots, start: { x: 2, y: 2 } };
  }
  function buildShip() {
    var MW = 26, MH = 22, m = grid(MW, MH, DECK), x, y;
    function set(x, y, v) { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y][x] = v; }
    function rect(x0, y0, w, h, v) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) set(xx, yy, v); }
    for (y = 0; y < MH; y++) { set(0, y, WATER); set(MW - 1, y, WATER); set(1, y, RAIL); set(MW - 2, y, RAIL); }
    for (x = 1; x < MW - 1; x++) { set(x, 0, RAIL); set(x, MH - 1, RAIL); }
    var st = [];
    function station(kind, x0, y0, w, title) { rect(x0, y0, w, 1, COUNTER); st.push({ kind: kind, x: x0, y: y0, w: w, title: title }); }
    station('plate', 3, 1, 5, 'Dish station');
    station('glass', 16, 1, 7, 'Bar');
    station('towel', 19, 18, 4, 'Towels');
    station('prize', 2, 15, 2, 'Prizes');
    rect(8, 11, 8, 4, POOL);
    var slots = [];
    [[4, 4], [8, 4], [12, 4], [4, 7], [8, 7], [12, 7]].forEach(function (t) { set(t[0], t[1], TABLE); slots.push({ x: t[0], y: t[1], kind: 'dine' }); });
    [[17, 4], [21, 4], [19, 7], [4, 12], [20, 12]].forEach(function (t) { set(t[0], t[1], TABLE); slots.push({ x: t[0], y: t[1], kind: 'drink' }); });
    [4, 6, 8, 10, 12, 14, 16].forEach(function (cx) { set(cx, 18, CHAIR); slots.push({ x: cx, y: 18, kind: 'chair' }); });
    var wet = [];
    for (x = 7; x <= 16; x++) { wet.push([x, 10]); wet.push([x, 15]); }
    for (y = 11; y <= 14; y++) { wet.push([7, y]); wet.push([16, y]); }
    set(1, 10, EXIT);
    return { map: m, mw: MW, mh: MH, bld: [], stations: st, slots: slots, wet: wet, start: { x: 2, y: 10 } };
  }
  /* ---- inside a house: walk around, use the bed, tub, wardrobe and bookshelf; grown pets wander about ----
   *   y0-1 back wall (window, mirror, pictures)   x0 and x10 side walls   y10 bottom wall with the door at x5
   *   bed 1-2 x 2-4 · nightstand 3,2 · wardrobe 5-6,2 · bookshelf 7,2 · tub 8-9 x 2-3 on bathroom tiles · plant 9,4
   *   kitchen: fridge 1,6 and table 2-3,7 (feed your pet there) · toy chest 9,8 · rare egg nest 9,6 · pet cushion and bowls 1-2,9 · rug */
  function buildHome(owner) {
    var MW = 11, MH = 11, m = grid(MW, MH, FLOOR), x, y, furn = [];
    function set(x, y, v) { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y][x] = v; }
    for (x = 0; x < MW; x++) { set(x, 0, WALL); set(x, 1, WALL); set(x, MH - 1, WALL); }
    for (y = 0; y < MH; y++) { set(0, y, WALL); set(MW - 1, y, WALL); }
    for (y = 2; y <= 4; y++) for (x = 8; x <= 9; x++) set(x, y, TILEF);
    function piece(kind, x0, y0, w, h, extra) { var f = { kind: kind, x: x0, y: y0, w: w, h: h }; for (var k in extra) f[k] = extra[k]; for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) set(xx, yy, FURN); furn.push(f); return f; }
    piece('bed', 1, 2, 2, 3); piece('stand', 3, 2, 1, 1); piece('wardrobe', 5, 2, 2, 1); piece('shelf', 7, 2, 1, 1); piece('tub', 8, 2, 2, 2);
    piece('fridge', 1, 6, 1, 1); piece('table', 2, 7, 2, 1); piece('plant', 9, 4, 1, 1); piece('toys', 9, 8, 1, 1);
    if (Pz().doc(owner).egg) piece('egg', 9, 6, 1, 1);
    furn.push({ kind: 'mirror', x: 4, y: 1, w: 1, h: 1, wall: true });
    set(5, MH - 1, EXIT);
    return { map: m, mw: MW, mh: MH, bld: [], furn: furn, start: { x: 5, y: MH - 2 } };
  }
  function tile(x, y) { return (x < 0 || y < 0 || x >= W.mw || y >= W.mh) ? SOLID : W.map[y][x]; }
  function walk(x, y, allowDoor) {
    var t = tile(x, y);
    if (t === GRASS || t === PATH || t === FLOWER || t === SAND || t === WET || t === PIER || t === CAVE || t === DECK || t === FLOOR || t === TILEF) return true;
    if (t === SWIM) return can('swim');
    if (t === VINE) return can('climb');
    return !!(allowDoor && (t === DOOR || t === EXIT));
  }
  function buildingAt(x, y) { for (var i = 0; i < W.bld.length; i++) { var b = W.bld[i]; if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; } return null; }
  /* shortest walk on the grid, 8 ways: diagonal steps cost 1.41, may not cut a corner, and doors are entered straight on.
     Returns the steps after the start (target included), [] if already there, or null. okFn replaces walk() for special maps. */
  var DIRS8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  function bfs(sx, sy, tx, ty, allowDoor, okFn) {
    if (sx === tx && sy === ty) return [];
    var K = function (x, y) { return y * 4096 + x; }, dist = {}, prev = {}, open = [[0, sx, sy]];
    function ok(x, y, isT) { return okFn ? okFn(x, y) : walk(x, y, allowDoor && isT); }
    dist[K(sx, sy)] = 0;
    while (open.length) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      var c = open.splice(bi, 1)[0], cx = c[1], cy = c[2];
      if (c[0] > dist[K(cx, cy)] + 1e-9) continue;
      if (cx === tx && cy === ty) {
        var out = [], k = K(tx, ty), p = [tx, ty];
        while (p && !(p[0] === sx && p[1] === sy)) { out.unshift(p); p = prev[K(p[0], p[1])]; }
        return out;
      }
      for (var d = 0; d < 8; d++) {
        var dx = DIRS8[d][0], dy = DIRS8[d][1], nx = cx + dx, ny = cy + dy, isT = nx === tx && ny === ty;
        if (!ok(nx, ny, isT)) continue;
        if (dx && dy) {
          if (!ok(cx + dx, cy, false) || !ok(cx, cy + dy, false)) continue;
          var tt = tile(nx, ny); if (tt === DOOR || tt === EXIT) continue;
        }
        var nd = c[0] + DIRS8[d][2], nk = K(nx, ny);
        if (dist[nk] == null || nd < dist[nk] - 1e-9) { dist[nk] = nd; prev[nk] = [cx, cy]; open.push([nd, nx, ny]); }
      }
    }
    return null;
  }


  /* ================= drawing helpers ================= */
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
  function fitText(ctx, text, maxW, size, weight) { var s = size; ctx.font = weight + ' ' + s + 'px sans-serif'; while (ctx.measureText(text).width > maxW && s > 8) { s--; ctx.font = weight + ' ' + s + 'px sans-serif'; } }
  function star(g, cx, cy, R, r) { g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; if (i) g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath(); g.fill(); }
  function palm(g, cx, cy) {
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 2, cy + 16); g.quadraticCurveTo(cx + 4, cy + 2, cx, cy - 8); g.stroke();
    g.fillStyle = '#2f9a4f';
    [[-16, -6], [16, -6], [-12, -16], [12, -16], [0, -20]].forEach(function (f) { g.beginPath(); g.ellipse ? g.ellipse(cx + f[0] / 2, cy - 8 + f[1] / 2, 12, 4, Math.atan2(f[1], f[0]), 0, 7) : g.arc(cx + f[0] / 2, cy - 8, 8, 0, 7); g.fill(); });
  }
  function tree(g, cx, cy) {
    g.fillStyle = '#7a4f2a'; g.fillRect(cx - 3, cy + 6, 6, 10);
    g.fillStyle = '#2f8a4a'; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill();
    g.fillStyle = '#3fa65c'; g.beginPath(); g.arc(cx - 4, cy - 4, 8, 0, 7); g.fill();
  }
  function drawBg() {
    var cv = document.createElement('canvas'); cv.width = W.mw * T; cv.height = W.mh * T;
    var g = cv.getContext('2d'), x, y, seed = 3;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (y = 0; y < W.mh; y++) for (x = 0; x < W.mw; x++) {
      var t = W.map[y][x], px = x * T, py = y * T;
      if (W.region === 'ship') { shipTile(g, t, x, y, px, py, rnd); continue; }
      if (W.region === 'home') { homeTile(g, t, x, y, px, py); continue; }
      if (W.region === 'beach') { g.fillStyle = (x + y) % 2 ? '#f3dfa6' : '#f1dba0'; g.fillRect(px, py, T, T); g.fillStyle = '#e4cc8e'; g.fillRect(px + rnd() * 28, py + rnd() * 28, 3, 2); }
      else {
        g.fillStyle = (x + y) % 2 ? '#8fd16f' : '#94d574'; g.fillRect(px, py, T, T);
        if (t === GRASS || t === FLOWER || t === TREE) { g.fillStyle = '#7dbf5e'; for (var i = 0; i < 3; i++) { var gx = px + rnd() * 28 + 2, gy = py + rnd() * 26 + 4; g.fillRect(gx, gy, 2, 5); g.fillRect(gx + 3, gy + 1, 2, 4); } }
      }
      if (t === PATH || t === DOOR) { g.fillStyle = '#e8d3a2'; g.fillRect(px, py, T, T); g.fillStyle = '#dcc48f'; g.fillRect(px + rnd() * 24, py + rnd() * 24, 5, 3); }
      if (t === WET) { g.fillStyle = '#e2c68a'; g.fillRect(px, py, T, T); }
      if (t === WATER || t === SWIM) {
        g.fillStyle = W.region === 'beach' ? (y > 17 ? '#2f8fc4' : '#48aede') : '#5bb8e8'; g.fillRect(px, py, T, T);
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 6 + rnd() * 8, py + 12); g.quadraticCurveTo(px + 14, py + 7, px + 22, py + 12); g.stroke();
        if (t === SWIM) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.setLineDash && g.setLineDash([4, 4]); g.strokeRect(px + 3, py + 3, T - 6, T - 6); g.setLineDash && g.setLineDash([]); }
      }
      if (t === FLOWER) { var cols = ['#ff7aa8', '#ffd84a', '#ffffff', '#b58cff']; for (var f = 0; f < 3; f++) { g.fillStyle = cols[Math.floor(rnd() * 4)]; g.beginPath(); g.arc(px + 6 + rnd() * 20, py + 6 + rnd() * 20, 3, 0, 7); g.fill(); } }
      if (t === ROCK || t === VINE) {
        g.fillStyle = '#9a9189'; g.fillRect(px, py, T, T); g.fillStyle = '#857c74'; g.fillRect(px + 2, py + 18, 14, 10); g.fillRect(px + 18, py + 4, 12, 10);
        if (t === VINE) { g.strokeStyle = '#3f9a3a'; g.lineWidth = 3; for (var v = 0; v < 3; v++) { g.beginPath(); g.moveTo(px + 6 + v * 9, py); g.quadraticCurveTo(px + 10 + v * 9, py + 16, px + 6 + v * 9, py + T); g.stroke(); } g.fillStyle = '#5fb043'; g.fillRect(px + 4, py + 10, 5, 4); g.fillRect(px + 20, py + 20, 5, 4); }
      }
      if (t === CAVE) { g.fillStyle = '#5a524c'; g.fillRect(px, py, T, T); g.fillStyle = '#4a433e'; g.fillRect(px + rnd() * 24, py + rnd() * 24, 6, 4); }
      if (t === PIER) { g.fillStyle = '#b07d4f'; g.fillRect(px + 2, py, T - 4, T); g.strokeStyle = '#7a5230'; g.lineWidth = 1.5; for (var pl = 0; pl < 4; pl++) { g.beginPath(); g.moveTo(px + 2, py + pl * 8); g.lineTo(px + T - 2, py + pl * 8); g.stroke(); } }
      if (t === EXIT) { g.fillStyle = '#e8d3a2'; g.fillRect(px, py, T, T); }
    }
    if (W.region === 'ship') { shipDecor(g); return cv; }
    if (W.region === 'home') { homeDecor(g); return cv; }
    if (W.region === 'town') {
      g.strokeStyle = '#3c8fbf'; g.lineWidth = 3; rr(g, 10 * T, 1 * T, 3 * T, 4 * T, 10); g.stroke();
      for (y = 0; y < W.mh; y++) for (x = 0; x < W.mw; x++) if (W.map[y][x] === TREE) tree(g, x * T + 16, y * T + 14);
      var dx = W.dumpster.x * T, dy = W.dumpster.y * T;
      g.fillStyle = '#2e6b4a'; rr(g, dx + 2, dy + 14, 28, 40, 4); g.fill();
      g.fillStyle = '#244f38'; g.fillRect(dx, dy + 10, 32, 8); g.fillStyle = '#9ab'; g.fillRect(dx + 6, dy + 30, 20, 3);
      W.bld.forEach(function (b) { drawBuilding(g, b); });
    } else {
      for (y = 0; y < W.mh; y++) for (x = 0; x < W.mw; x++) if (W.map[y][x] === PALM) palm(g, x * T + 16, y * T + 14);
      // cave mouth
      g.fillStyle = '#2b2622'; g.beginPath(); g.arc(21 * T + 16, 9 * T + 14, 15, Math.PI, 0); g.fill();
      // signs
      sign(g, { kind: 'beach', title: 'To town', x: 1, y: 1, w: 3, h: 1 }, '#fff8e8', '#3a2a1a');
      g.fillStyle = '#8a5a2b'; g.fillRect(12 * T + 4, 19 * T + 26, 24, 4);
    }
    return cv;
  }
  function shipTile(g, t, x, y, px, py, rnd) {
    if (t === WATER) {
      g.fillStyle = '#2f7fb8'; g.fillRect(px, py, T, T);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 4 + rnd() * 10, py + 10 + rnd() * 12); g.quadraticCurveTo(px + 14, py + 6, px + 24, py + 14); g.stroke();
      return;
    }
    g.fillStyle = y % 2 ? '#c99a62' : '#c49460'; g.fillRect(px, py, T, T);
    g.fillStyle = '#b3824f'; g.fillRect(px, py + T - 2, T, 2); g.fillRect(px + ((x * 13 + y * 7) % 24), py, 2, T - 2);
    if (t === RAIL) {
      g.fillStyle = '#f7f7f2'; g.fillRect(px, py, T, T);
      g.fillStyle = '#2a4a8f';
      if (y === 0 || y === W.mh - 1) g.fillRect(px, py + 13, T, 6);
      if (x === 1 || x === W.mw - 2) g.fillRect(px + 13, py, 6, T);
    }
    if (t === POOL) {
      g.fillStyle = '#5fc6ea'; g.fillRect(px, py, T, T);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 4 + rnd() * 10, py + 16); g.quadraticCurveTo(px + 14, py + 11, px + 24, py + 16); g.stroke();
    }
    if (t === EXIT) { g.fillStyle = '#8a8580'; g.fillRect(px, py + 4, T, T - 8); g.fillStyle = '#6f6a65'; for (var i = 0; i < 4; i++) g.fillRect(px + i * 8, py + 4, 2, T - 8); }
  }
  function shipDecor(g) {
    // pool edge
    g.strokeStyle = '#e9f6fb'; g.lineWidth = 5; g.strokeRect(8 * T - 2, 11 * T - 2, 8 * T + 4, 4 * T + 4);
    g.fillStyle = '#c0c8cc'; g.fillRect(15 * T + 18, 11 * T + 4, 3, 22); g.fillRect(15 * T + 26, 11 * T + 4, 3, 22);
    W.stations.forEach(function (s) {
      var x = s.x * T, y = s.y * T, w = s.w * T;
      var top = { plate: '#c9d2d8', glass: '#8a5a2b', towel: '#3a8ed8', prize: '#c9a44c' }[s.kind], face = { plate: '#9aa6ad', glass: '#6b4424', towel: '#2a6aa8', prize: '#9a7a2c' }[s.kind];
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 3, y + T - 2, w, 5);
      g.fillStyle = face; g.fillRect(x + 1, y + 12, w - 2, T - 12);
      g.fillStyle = top; rr(g, x, y + 2, w, 14, 3); g.fill();
      if (s.kind === 'plate') { for (var i = 0; i < s.w; i++) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + i * T + 16, y + 9, 5, 0, 7); g.fill(); } }
      if (s.kind === 'glass') { var cols = ['#6fcf8f', '#e45757', '#f2d43a', '#7fc8ff']; for (var j = 0; j < s.w * 2; j++) { g.fillStyle = cols[j % 4]; g.fillRect(x + 6 + j * 16, y - 6, 5, 12); } }
      if (s.kind === 'towel') { var tc = ['#fff', '#7fc8ff', '#fff', '#ffb0c8']; for (var k = 0; k < s.w; k++) { g.fillStyle = tc[k % 4]; rr(g, x + k * T + 5, y + 1, 22, 10, 3); g.fill(); } }
      var label = s.title.toUpperCase();
      fitText(g, label, w - 8, 11, 'bold');
      var tw = g.measureText(label).width + 10, sx = x + (w - tw) / 2, sy = y + 16;
      g.fillStyle = s.kind === 'prize' ? '#fff4d0' : '#fff'; rr(g, sx, sy, tw, 14, 3); g.fill();
      g.fillStyle = '#17211e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, x + w / 2, sy + 7.5);
    });
    W.slots.forEach(function (s) {
      var cx = s.x * T + 16, cy = s.y * T + 16;
      if (s.kind === 'chair') {
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(s.x * T + 7, s.y * T + 4, 20, 28);
        g.fillStyle = '#fafafa'; rr(g, s.x * T + 5, s.y * T + 1, 22, 29, 4); g.fill();
        g.strokeStyle = '#c9c2b6'; g.lineWidth = 1; for (var l = 0; l < 5; l++) { g.beginPath(); g.moveTo(s.x * T + 7, s.y * T + 6 + l * 5); g.lineTo(s.x * T + 25, s.y * T + 6 + l * 5); g.stroke(); }
        g.fillStyle = '#e9e3d6'; rr(g, s.x * T + 5, s.y * T + 1, 22, 8, 3); g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.arc(cx + 2, cy + 3, 13, 0, 7); g.fill();
        if (s.kind === 'dine') { g.fillStyle = '#8a5a2b'; g.fillRect(cx - 20, cy - 5, 5, 10); g.fillRect(cx + 15, cy - 5, 5, 10); }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 12, 0, 7); g.fill();
        g.strokeStyle = s.kind === 'dine' ? '#e45757' : '#3a8ed8'; g.lineWidth = 2; g.stroke();
      }
    });
    // life rings on the rails and the gangway sign
    [[1, 5], [1, 16], [24, 4], [24, 11], [24, 17]].forEach(function (r) { var cx = r[0] * T + 16, cy = r[1] * T + 16; g.lineWidth = 5; g.strokeStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.stroke(); g.strokeStyle = '#e8553c'; for (var q = 0; q < 4; q++) { g.beginPath(); g.arc(cx, cy, 9, q * Math.PI / 2, q * Math.PI / 2 + 0.7); g.stroke(); } });
    sign(g, { kind: 'beach', title: 'To town', x: 1, y: 8.6, w: 3, h: 1 }, '#fff8e8', '#3a2a1a');
  }
  function homeColors() { var p = C().person(W.homeOwner); var c = (p && C().pColor(p)) || '#6f93c8'; return { accent: c, wall: mix(c, '#fff8ee', 0.8), wall2: mix(c, '#fff8ee', 0.7) }; }
  function mix(a, b, k) {
    function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    var x = rgb(a), y = rgb(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(x[i] * (1 - k) + y[i] * k); }).join(',') + ')';
  }
  function homeTile(g, t, x, y, px, py) {
    var hc = homeColors();
    if (t === WALL || t === EXIT) {
      if (y <= 1 && x > 0 && x < W.mw - 1) {   /* back wall: wallpaper with stripes, skirting board */
        g.fillStyle = hc.wall; g.fillRect(px, py, T, T);
        g.fillStyle = hc.wall2; for (var s = 0; s < 4; s++) g.fillRect(px + s * 8 + 2, py, 3, T);
        if (y === 1) { g.fillStyle = '#b98a58'; g.fillRect(px, py + T - 6, T, 6); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(px, py + T - 1, T, 1); }
        return;
      }
      if (t === EXIT) { g.fillStyle = '#c99a62'; g.fillRect(px, py, T, T); g.fillStyle = '#7a4f2a'; rr(g, px + 3, py + 2, T - 6, T - 2, 4); g.fill(); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(px + T - 9, py + 16, 2, 0, 7); g.fill(); return; }
      g.fillStyle = '#5a4234'; g.fillRect(px, py, T, T); g.fillStyle = '#6e5444'; g.fillRect(px + (x === 0 ? T - 6 : 0), py, 6, T);
      if (y === W.mh - 1) { g.fillStyle = '#6e5444'; g.fillRect(px, py, T, 6); }
      return;
    }
    if (t === TILEF || (t === FURN && x >= 8 && y <= 4 && y >= 2)) {   /* bathroom tiles */
      g.fillStyle = (x + y) % 2 ? '#e4f1f6' : '#d3e8f0'; g.fillRect(px, py, T, T); g.strokeStyle = '#bcd6e0'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); return;
    }
    g.fillStyle = y % 2 ? '#d9ac78' : '#d4a672'; g.fillRect(px, py, T, T);   /* floorboards */
    g.fillStyle = '#c29260'; g.fillRect(px, py + T - 1, T, 1); g.fillRect(px + ((x * 11 + y * 7) % 26) + 3, py, 1, T - 1);
  }
  function homeDecor(g) {
    var hc = homeColors(), owner = W.homeOwner, d = Pz().doc(owner);
    /* rug */
    g.fillStyle = hc.accent; g.globalAlpha = 0.85; rr(g, 4 * T + 6, 5 * T + 4, 4 * T - 12, 3 * T - 8, 18); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.setLineDash && g.setLineDash([5, 4]); rr(g, 4 * T + 12, 5 * T + 10, 4 * T - 24, 3 * T - 20, 14); g.stroke(); g.setLineDash && g.setLineDash([]);
    /* kitchen floor tiles under the fridge and table */
    for (var ky = 6; ky <= 8; ky++) for (var kx = 1; kx <= 3; kx++) if (!(kx === 1 && ky === 8)) { g.fillStyle = (kx + ky) % 2 ? '#f4efe4' : '#e3d6bf'; g.fillRect(kx * T, ky * T, T, T); }
    /* doormat and pet cushion */
    g.fillStyle = '#8a6a44'; rr(g, 5 * T + 3, 9 * T + 8, T - 6, T - 12, 4); g.fill();
    g.fillStyle = '#e8a9b9'; g.beginPath(); g.ellipse ? g.ellipse(1 * T + 16, 9 * T + 17, 14, 10, 0, 0, 7) : g.arc(1 * T + 16, 9 * T + 17, 12, 0, 7); g.fill();
    g.fillStyle = '#f6cdd8'; g.beginPath(); g.ellipse ? g.ellipse(1 * T + 16, 9 * T + 16, 9, 6, 0, 0, 7) : g.arc(1 * T + 16, 9 * T + 16, 7, 0, 7); g.fill();
    /* food and water bowls */
    [['#3a8ed8', '#c58a4a'], ['#e45757', '#7fc8ff']].forEach(function (c, i) { var bx = 2 * T + 9 + i * 14, by = 9 * T + 20; g.fillStyle = c[0]; g.beginPath(); g.ellipse ? g.ellipse(bx, by, 7, 4.5, 0, 0, 7) : g.arc(bx, by, 6, 0, 7); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.ellipse ? g.ellipse(bx, by - 1, 5, 2.5, 0, 0, 7) : g.arc(bx, by, 4, 0, 7); g.fill(); });
    /* window above the bed, pictures, mirror */
    var wx = 1 * T + 10, wy = 4;
    g.fillStyle = '#7a5a3a'; rr(g, wx - 3, wy - 3, 50, 42, 4); g.fill(); g.fillStyle = '#bfe6ff'; g.fillRect(wx, wy, 44, 36); g.fillStyle = '#fff'; g.fillRect(wx + 20, wy, 4, 36); g.fillRect(wx, wy + 16, 44, 4);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(wx + 10, wy + 9, 4, 0, 7); g.arc(wx + 14, wy + 8, 5, 0, 7); g.fill();
    g.fillStyle = hc.accent; g.fillRect(wx - 6, wy - 4, 8, 44); g.fillRect(wx + 42, wy - 4, 8, 44);
    var mx = 4 * T + 6, my = 8; g.fillStyle = '#c9a44c'; rr(g, mx - 2, my - 2, 24, 44, 11); g.fill(); g.fillStyle = '#dff1fb'; rr(g, mx + 1, my + 1, 18, 38, 9); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(mx + 5, my + 6, 3, 18);
    g.fillStyle = '#7a5a3a'; g.fillRect(8 * T + 6, 10, 26, 20); g.fillStyle = '#ffe27a'; g.fillRect(8 * T + 9, 13, 20, 14); g.fillStyle = '#e45757'; g.beginPath(); g.arc(8 * T + 19, 20, 4, 0, 7); g.fill();
    W.furn.forEach(function (f) { furniture(g, f, hc, d); });
  }
  function furniture(g, f, hc, d) {
    var x = f.x * T, y = f.y * T, w = f.w * T, h = f.h * T;
    g.fillStyle = 'rgba(60,40,20,.18)'; if (!f.wall) { rr(g, x + 3, y + 5, w - 2, h - 2, 6); g.fill(); }
    if (f.kind === 'bed') {
      g.fillStyle = '#8a5a34'; rr(g, x + 1, y - 10, w - 2, 22, 6); g.fill();                         /* headboard */
      g.fillStyle = '#a8774a'; rr(g, x + 2, y + 4, w - 4, h - 6, 6); g.fill();                         /* frame */
      g.fillStyle = '#fbf6ee'; rr(g, x + 6, y + 6, w - 12, h - 14, 5); g.fill();                       /* sheet */
      g.fillStyle = '#ffffff'; rr(g, x + 10, y + 8, w - 20, 16, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 1; g.stroke();   /* pillow */
      g.fillStyle = hc.accent; rr(g, x + 6, y + 30, w - 12, h - 38, 5); g.fill();                     /* quilt */
      g.fillStyle = 'rgba(255,255,255,.28)'; for (var q = 0; q < 3; q++) for (var r = 0; r < 2; r++) if ((q + r) % 2) g.fillRect(x + 6 + r * (w - 12) / 2, y + 30 + q * (h - 38) / 3, (w - 12) / 2, (h - 38) / 3);
      g.fillStyle = '#ffffff'; g.fillRect(x + 6, y + 30, w - 12, 5);
    } else if (f.kind === 'stand') {
      g.fillStyle = '#9a6a40'; rr(g, x + 4, y + 6, w - 8, h - 8, 4); g.fill(); g.fillStyle = '#7a5230'; g.fillRect(x + 8, y + 18, w - 16, 2);
      g.fillStyle = 'rgba(255,226,122,.35)'; g.beginPath(); g.arc(x + 16, y + 2, 15, 0, 7); g.fill();
      g.fillStyle = '#ffe27a'; g.beginPath(); g.moveTo(x + 9, y + 6); g.lineTo(x + 23, y + 6); g.lineTo(x + 20, y - 6); g.lineTo(x + 12, y - 6); g.closePath(); g.fill();
    } else if (f.kind === 'wardrobe') {
      g.fillStyle = '#9a6a40'; rr(g, x + 2, y - 26, w - 4, h + 22, 5); g.fill();
      g.fillStyle = '#b07d4f'; rr(g, x + 6, y - 22, w / 2 - 8, h + 14, 3); g.fill(); rr(g, x + w / 2 + 2, y - 22, w / 2 - 8, h + 14, 3); g.fill();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(x + w / 2 - 5, y - 4, 2.2, 0, 7); g.arc(x + w / 2 + 5, y - 4, 2.2, 0, 7); g.fill();
      g.fillStyle = hc.accent; g.fillRect(x + 2, y - 30, w - 4, 6);
    } else if (f.kind === 'shelf') {
      g.fillStyle = '#8a5a34'; rr(g, x + 2, y - 24, w - 4, h + 20, 3); g.fill();
      var bc = ['#e45757', '#3a8ed8', '#f2d43a', '#6fcf8f', '#b58cff', '#ff9a4a'];
      for (var row = 0; row < 3; row++) for (var b = 0; b < 4; b++) { g.fillStyle = bc[(b + row * 2) % 6]; g.fillRect(x + 5 + b * 6, y - 20 + row * 14, 5, 11); }
    } else if (f.kind === 'tub') {
      g.fillStyle = '#c0ccd6'; g.fillRect(x + 6, y + h - 6, 6, 6); g.fillRect(x + w - 12, y + h - 6, 6, 6);   /* feet */
      g.fillStyle = '#ffffff'; rr(g, x + 2, y + 2, w - 4, h - 8, 18); g.fill(); g.strokeStyle = '#b9c6d6'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#9fd8f2'; rr(g, x + 8, y + 8, w - 16, h - 20, 13); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; [[18, 16, 6], [28, 13, 5], [40, 18, 6], [48, 12, 4]].forEach(function (s) { g.beginPath(); g.arc(x + s[0], y + s[1], s[2], 0, 7); g.fill(); });
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 44, y + 30, 5, 0, 7); g.fill(); g.beginPath(); g.arc(x + 48, y + 26, 3.5, 0, 7); g.fill(); g.fillStyle = '#ff8a2a'; g.fillRect(x + 50, y + 25, 4, 2);
      g.fillStyle = '#c0ccd6'; g.fillRect(x + w / 2 - 3, y - 6, 6, 10); g.beginPath(); g.arc(x + w / 2, y - 6, 5, 0, 7); g.fill();   /* tap */
    } else if (f.kind === 'fridge') {
      g.fillStyle = '#dfe7ee'; rr(g, x + 3, y - 26, w - 6, h + 22, 5); g.fill(); g.strokeStyle = '#a9b8c6'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#c9d5e0'; g.fillRect(x + 3, y - 8, w - 6, 2);
      g.fillStyle = '#8a9aaa'; g.fillRect(x + w - 10, y - 20, 3, 9); g.fillRect(x + w - 10, y - 2, 3, 10);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 11, y - 17, 3, 0, 7); g.fill(); g.fillStyle = '#e45757'; g.fillRect(x + 8, y + 2, 6, 6);   /* magnets: a star and a drawing */
    } else if (f.kind === 'table') {
      [[x + 14, y - 2], [x + w - 14, y - 2]].forEach(function (c) { g.fillStyle = '#8a5a34'; rr(g, c[0] - 9, c[1] - 8, 18, 10, 3); g.fill(); });           /* chairs behind */
      g.fillStyle = '#b07d4f'; rr(g, x + 2, y + 4, w - 4, h - 8, 6); g.fill(); g.fillStyle = '#c99a62'; rr(g, x + 4, y + 6, w - 8, h - 14, 5); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse ? g.ellipse(x + 18, y + 14, 8, 5, 0, 0, 7) : g.arc(x + 18, y + 14, 6, 0, 7); g.fill();
      g.fillStyle = '#e8a33a'; g.beginPath(); g.arc(x + 18, y + 13, 3, 0, 7); g.fill();
      g.fillStyle = '#7fc8ff'; g.fillRect(x + w - 24, y + 8, 6, 9);
    } else if (f.kind === 'plant') {
      g.fillStyle = '#c0683a'; rr(g, x + 9, y + 14, 14, 14, 3); g.fill();
      g.fillStyle = '#4f9a4a'; [[16, 8, 9], [10, 12, 6], [22, 12, 6], [16, 2, 6]].forEach(function (l) { g.beginPath(); g.arc(x + l[0], y + l[1], l[2], 0, 7); g.fill(); });
    } else if (f.kind === 'toys') {
      g.fillStyle = '#e45757'; rr(g, x + 3, y + 8, w - 6, h - 10, 4); g.fill(); g.fillStyle = '#b3262a'; g.fillRect(x + 3, y + 8, w - 6, 5);
      g.fillStyle = '#ffd23f'; star(g, x + 16, y + 21, 6, 2.6);
    } else if (f.kind === 'egg') {
      g.fillStyle = '#c9a46a'; g.beginPath(); g.ellipse ? g.ellipse(x + 16, y + 24, 14, 7, 0, 0, 7) : g.arc(x + 16, y + 24, 12, 0, 7); g.fill();
      g.fillStyle = '#b08850'; for (var n = 0; n < 6; n++) g.fillRect(x + 4 + n * 4, y + 20 + (n % 2) * 3, 5, 2);
    }
  }
  function drawBuilding(g, b) {
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, dX = b.door.x * T, dY = b.door.y * T;
    if (b.kind === 'gate') {
      g.fillStyle = '#e8d3a2'; g.fillRect(x + T, y, 2 * T, T);
      g.fillStyle = '#8a8580'; g.fillRect(x + 6, y - 30, 20, 60); g.fillRect(x + w - 26, y - 30, 20, 60);
      g.fillStyle = '#6b4a2a'; g.fillRect(x + 4, y - 40, w - 8, 16);
      g.fillStyle = '#f2c14e'; fitText(g, 'ADVENTURE', w - 20, 12, 'bold'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ADVENTURE', x + w / 2, y - 31);
      return;
    }
    if (b.kind === 'park') {
      g.fillStyle = '#a6de84'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#8a6a44'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      for (var i = 0; i < b.w; i++) { g.fillStyle = '#8a6a44'; g.fillRect(x + i * T + 14, y, 4, 8); g.fillRect(x + i * T + 14, y + h - 8, 4, 8); }
      g.fillStyle = '#e8d3a2'; g.fillRect(dX + 2, dY, T - 4, T);
      g.fillStyle = '#e45757'; g.fillRect(x + 30, y + 30, 8, 60); g.fillStyle = '#f2d43a'; g.beginPath(); g.moveTo(x + 38, y + 34); g.lineTo(x + 90, y + 96); g.lineTo(x + 80, y + 100); g.lineTo(x + 34, y + 44); g.fill();
      g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 200, y + 30); g.lineTo(x + 230, y + 30); g.moveTo(x + 204, y + 30); g.lineTo(x + 204, y + 70); g.moveTo(x + 226, y + 30); g.lineTo(x + 226, y + 70); g.stroke();
      g.fillStyle = '#3a8ed8'; g.beginPath(); g.arc(x + 270, y + 90, 8, 0, 7); g.fill();
      sign(g, b, '#6b4a2a', '#fff');
      return;
    }
    var roof = b.kind === 'bank' ? '#123f36' : b.kind === 'store' ? '#b3262a' : b.kind === 'prizes' ? '#6d3fcf' : b.kind === 'cafe' ? '#1f8f6a' : b.kind === 'clothes' ? '#d9488f' : b.color;
    var wall = b.kind === 'bank' ? '#efe6cf' : b.kind === 'store' ? '#fff4e0' : b.kind === 'prizes' ? '#fff6d8' : b.kind === 'cafe' ? '#fff8ec' : b.kind === 'clothes' ? '#fff0f6' : '#f6ecd9';
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 4, y + h - 4, w, 6);
    g.fillStyle = wall; g.fillRect(x + 2, y + h * 0.4, w - 4, h * 0.6);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - 2, y + h * 0.45); g.lineTo(x + 10, y + 4); g.lineTo(x + w - 10, y + 4); g.lineTo(x + w + 2, y + h * 0.45); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 12, y + 8, w - 24, 4);
    if (b.kind === 'store') { for (var s = 0; s < b.w * 2; s++) { g.fillStyle = s % 2 ? '#fff' : '#e45757'; g.fillRect(x + 2 + s * 16, y + h * 0.4, 16, 12); } }
    if (b.kind === 'cafe') { for (var s2 = 0; s2 < b.w * 2; s2++) { g.fillStyle = s2 % 2 ? '#fff' : '#2fae7a'; g.beginPath(); g.moveTo(x + 2 + s2 * 16, y + h * 0.4); g.lineTo(x + 18 + s2 * 16, y + h * 0.4); g.lineTo(x + 18 + s2 * 16, y + h * 0.4 + 10); g.quadraticCurveTo(x + 10 + s2 * 16, y + h * 0.4 + 16, x + 2 + s2 * 16, y + h * 0.4 + 10); g.fill(); } }
    if (b.kind === 'bank') { g.fillStyle = '#d8ccae'; for (var c = 0; c < 4; c++) g.fillRect(x + 20 + c * (w - 50) / 3, y + h * 0.48, 8, h * 0.48); }
    g.fillStyle = '#a7d8f2';
    var wy = y + h * 0.58;
    if (b.kind === 'house') { g.fillRect(x + 12, wy, 22, 18); g.fillRect(x + w - 34, wy, 22, 18); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + 12, wy, 22, 18); g.strokeRect(x + w - 34, wy, 22, 18); }
    else if (b.kind === 'store') { g.fillRect(x + 12, wy, 50, 26); g.fillRect(x + w - 62, wy, 50, 26); }
    else if (b.kind === 'clothes') {   /* shop windows with a dress and a shirt on display */
      g.fillRect(x + 10, wy, 40, 28); g.fillRect(x + w - 50, wy, 40, 28);
      g.fillStyle = '#7a5fd6'; g.beginPath(); g.moveTo(x + 26, wy + 6); g.lineTo(x + 34, wy + 6); g.lineTo(x + 40, wy + 26); g.lineTo(x + 20, wy + 26); g.closePath(); g.fill();
      g.fillStyle = '#ffd23f'; g.fillRect(x + w - 38, wy + 8, 16, 14); g.fillRect(x + w - 42, wy + 8, 24, 5);
      g.strokeStyle = '#d9488f'; g.lineWidth = 2; g.strokeRect(x + 10, wy, 40, 28); g.strokeRect(x + w - 50, wy, 40, 28);
    }
    else if (b.kind === 'cafe') { g.fillRect(x + 10, wy, 40, 26); g.fillRect(x + w - 50, wy, 40, 26); g.fillStyle = '#c0683a'; [[x + 30, wy + 22], [x + w - 30, wy + 22]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], 6, Math.PI, 0); g.fill(); }); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 30, wy + 14, 3, 0, 7); g.arc(x + w - 30, wy + 14, 3, 0, 7); g.fill(); }
    g.fillStyle = '#7a4f2a'; rr(g, dX + 6, dY + 4, T - 12, T - 4, 6); g.fill();
    g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(dX + T - 11, dY + 18, 2, 0, 7); g.fill();
    sign(g, b, b.kind === 'bank' ? '#c9a44c' : '#fff8e8', b.kind === 'bank' ? '#123f36' : '#3a2a1a');
  }
  function sign(g, b, bgc, fg) {
    var label = b.kind === 'house' || b.kind === 'beach' ? b.title : b.title.toUpperCase();
    var x = b.x * T, y = b.y * T, w = b.w * T;
    fitText(g, label, w - 22, 13, 'bold');
    var tw = g.measureText(label).width + 12, sx = x + (w - tw) / 2, sy = b.kind === 'park' ? y - 6 : b.kind === 'beach' ? y + 4 : y + b.h * T * 0.24;
    g.fillStyle = bgc; rr(g, sx, sy, tw, 18, 4); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(label, x + w / 2, sy + 9.5);
  }

  /* ================= sprites ================= */
  function img(key, svgFn) {
    var e = W.imgs[key];
    if (e) return e.ok ? e.img : null;
    e = W.imgs[key] = { img: new Image(), ok: false };
    e.img.onload = function () { e.ok = true; };
    e.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgFn());
    return null;
  }
  /* animation frames: blink now and then, tail swings, wings flap (faster while walking) */
  function petFrame(mood, seed, moving) {
    if (mood === 'asleep' || mood === 'eat') return { b: 0, t: 0, w: 1 };
    var t = W.t + seed;
    return { b: (t % 3.8) < 0.14 ? 1 : 0, t: [0, 7, 0, -7][Math.floor(t * (moving ? 6 : 3)) % 4], w: [1, 0.9][Math.floor(t * (moving ? 8 : 2.5)) % 2] };
  }
  var petLast = {};
  if (window.C3D) C3D.onReady(function () { for (var k in W.imgs) if ((k.indexOf('pet|') === 0 || k.indexOf('av|') === 0) && W.imgs.hasOwnProperty(k)) delete W.imgs[k]; petLast = {}; });
  /* 3D pets have front, side and back views: walking down shows the face, up shows the back, sideways the profile */
  function is3d(p) { return !!(window.C3D && !C3D.off && p && C3D.has(p.sp)); }
  function petView(p, dir) { return !is3d(p) ? '' : dir === 'up' ? 'back' : dir === 'side' ? 'side' : 'front'; }
  function petImage(pid, mood, moving, dir, a) {
    var st = Pz().state(pid); if (!st.pet) return null;
    var f = st.flags, p = st.pet, fr = petFrame(mood, pid.length * 0.7, moving), view = petView(p, dir), lf = legFrame(p, a, mood);
    if (view) { fr.t = 0; fr.w = 1; }
    var base = 'pet|' + pid + '|' + p.sp + p.stage + p.pal + '|' + (p.wear || '') + '|' + (p.dye || '') + '|' + mood + '|' + (f.thin ? 1 : 0) + (f.dirty ? 1 : 0) + (f.tired ? 1 : 0) + (f.pudgy ? 1 : 0) + '|' + view;
    var im = img(base + '|' + fr.b + fr.t + fr.w + '|' + (lf == null ? '' : lf), function () { return Pz().petSvg(p, mood, f, { blink: !!fr.b, tailRot: fr.t, wingFlap: fr.w === 1 ? 0 : fr.w, view: view || undefined, noStink: true, frame: lf }); });
    if (im) { petLast[base] = im; return im; }
    return petLast[base] || null;
  }
  /* real leg frames (rendered in Blender) for pets that walk: which frame to show now, or null for the still picture.
     One stride per square walked, so the feet keep time with the ground. */
  /* 3D pets that walk never get their picture cut up (that bent faces): leg frames when there are any, else it rides as one piece */
  function hasLegs(p) { return !!(p && is3d(p) && petGait(p) === 'walk'); }
  function legFrame(p, a, mood) {
    if (!a || !a.moving || mood === 'asleep' || !hasLegs(p) || !C3D.walks || !C3D.walks(p.sp, p.stage || 0)) return null;
    if (!C3D.walkReady(p.sp)) { C3D.preloadWalk(p.sp); return null; }
    var n = C3D.walkFrames(p.sp), u = a.gait || 0;
    return Math.floor(((u % 1) + 1) % 1 * n) % n;
  }
  function people3d() { return !!(window.C3D && C3D.hasPeople && C3D.hasPeople()); }
  function actorView(dir) { return !people3d() ? '' : dir === 'up' ? 'back' : dir === 'side' ? 'side' : 'front'; }
  function avatarImage(pid, view) { var a = Pz().doc(pid).avatar, key = 'av|' + JSON.stringify(a) + '|' + (view || ''); return img(key, function () { return Pz().avatarSvg(a, false, view ? { view: view } : null); }); }
  function avatarPx(av) { var hh = window.CHAR.heightOf ? window.CHAR.heightOf(av) : { h: (av && av.height) || 'small', s: 1 }; return Math.round(54 * ((window.CHAR.HEIGHT_PX || {})[hh.h] || 1) * hh.s); }
  function itemImage(id) { return img('item|' + id, function () { return A().itemArt(id); }); }
  function eggImage() { return img('egg', function () { return CRE.egg(); }); }

  /* ================= actors ================= */
  function placeAt(sx, sy) {
    W.P = { x: sx, y: sy, tx: sx, ty: sy, fx: sx, fy: sy, moving: false, path: [], face: 1 };
    var px = walk(sx + 1, sy) ? sx + 1 : walk(sx - 1, sy) ? sx - 1 : sx, py = sy;
    if (px === sx) py = walk(sx, sy + 1) ? sy + 1 : sy;
    W.pet = { x: px, y: py, tx: px, ty: py, fx: px, fy: py, moving: false, queue: [], face: -1, dir: 'down', mode: 'follow', until: 0, t: 0 };
  }
  function placeAtHome() {
    var home = null;
    W.bld.forEach(function (b) { if (b.kind === 'house' && b.owner === W.pid) home = b; });
    placeAt(home ? home.door.x : 14, home ? home.door.y + 1 : 12);
  }
  function stepTo(a, x, y) { a.fx = a.x; a.fy = a.y; a.tx = x; a.ty = y; a.moving = true; a.prog = 0; if (x !== a.x) a.face = x > a.x ? 1 : -1; a.dir = x !== a.x ? 'side' : y !== a.y ? (y > a.y ? 'down' : 'up') : (a.dir || 'down'); }
  function playerTryDir(dir) {
    var d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; if (!d) return false;
    var P = W.P, nx = P.x + d[0], ny = P.y + d[1];
    if (d[0]) P.face = d[0];
    P.dir = d[1] > 0 ? 'down' : d[1] < 0 ? 'up' : 'side';
    if (!walk(nx, ny, true)) { blocked(nx, ny); return false; }
    playerStep(nx, ny); return true;
  }
  var lastBlock = 0;
  function blocked(x, y) {
    if (Date.now() - lastBlock < 2500) return;
    var t = tile(x, y); lastBlock = Date.now();
    if (t === SWIM) say('The water is too deep. A Water pet could swim you across.', 3000);
    else if (t === VINE) say('Vines grow up the cliff. A Leaf pet could climb them.', 3000);
    else if (t === POOL) say('No swimming while you are on duty!', 2000);
  }
  function playerStep(nx, ny) {
    var P = W.P; W.pet.queue.push([P.x, P.y]); stepTo(P, nx, ny);
    var t = tile(nx, ny);
    if (t === SWIM) say('Your pet swims you across the water!', 1800);
    if (t === VINE) say('Your pet climbs the vines!', 1800);
  }
  function arrived(P) {
    var t = tile(P.x, P.y);
    if (t === DOOR) { var b = buildingAt(P.x, P.y); if (b) { openRoom(b); return; } }
    if (t === EXIT) { if (W.region === 'home') leaveHome(); else leaveRegion(); return; }
    if (W.region === 'beach') pickupShell(P.x, P.y);
    if (W.region === 'ship') dropOff();
    if (W.region === 'town') greetHosts();
    if (P.path.length) { var n = P.path.shift(); playerStep(n[0], n[1]); return; }
    if (W.held) playerTryDir(W.held);
    if (P.onArrive) { var oa = P.onArrive; P.onArrive = null; if (oa.x !== P.x) P.face = oa.x > P.x ? 1 : -1; if (currentAction()) { actionHud(); doAction(); return; } }
    actionHud();
  }
  function moveActor(a, speed, dt) {
    if (!a.moving) return false;
    var dx = a.tx - a.fx, dy = a.ty - a.fy, len = Math.sqrt(dx * dx + dy * dy) || 1, prog = (a.prog || 0) + speed * dt / len;
    a.gait = (a.gait || 0) + Math.min(speed * dt, (1 - (a.prog || 0)) * len);
    if (prog >= 1) { a.x = a.tx; a.y = a.ty; a.moving = false; a.prog = 0; a.gait = Math.round(a.gait); return true; }
    a.prog = prog; a.px = a.fx + dx * prog; a.py = a.fy + dy * prog;
    return false;
  }
  function petSpeedFactor(f) { var s = 1; if (f.tired) s *= 0.45; if (f.pudgy) s *= 0.5; if (f.thin) s *= 0.65; return s; }
  /* after a tuck-in the pet sleeps in its bed at home for 5 minutes: it's in the bed when you're home, and not with you anywhere else */
  function bedTime() { return Pz().asleep ? Pz().asleep(W.pid) : 0; }
  /* night (cl-v30): the town goes dark, shops and other houses close, pets sleep at home (in bed if tucked in, else under it) */
  function nightInfo() { return Pz().night ? Pz().night(W.pid) : null; }
  function hideInfo() { return Pz().hiding ? Pz().hiding(W.pid) : null; }
  var PET_PLACES = { park: 1, cafe: 1, gate: 1 };
  function nmOf() { var st = Pz().state(W.pid); return st.pet ? st.pet.name : 'Your pet'; }
  function nightCheck() {
    var nt = nightInfo(), on = !!nt, G = Pz().G;
    if (on) {
      if (away()) { leaveRegion('It’s ' + nt.sleep + '. Adventures are over until morning!'); return; }
      if (G.room && !G.room.walk) { G.game = null; closeRoom(); }
      else if (G.room && G.room.walk && W.homeOwner !== W.pid) leaveHome();
      else if (G.game) { G.game = null; closeRoom(); }
    }
    var hd = hideInfo();
    if (hd && !on) {
      if (away()) { leaveRegion(nmOf() + ' is hiding under your bed. Adventures will have to wait.'); return; }
      if (G.room && !G.room.walk && PET_PLACES[G.room.kind]) { G.game = null; closeRoom(); }
      else if (G.game) { G.game = null; closeRoom(); }
    }
    if (W.hideWas !== undefined && !!hd !== W.hideWas) { say(hd ? nmOf() + ' ran home and is hiding under your bed after a terrible bedtime.' : nmOf() + ' came out from under the bed!', 4000); hud(); }
    W.hideWas = !!hd;
    if (W.nightWas !== undefined && on !== W.nightWas) {
      var st = Pz().state(W.pid), nm = st.pet ? st.pet.name : 'Your pet';
      say(on ? 'It’s ' + nt.sleep + '! The town is closed and ' + nm + (nt.tucked ? ' is asleep in bed.' : ' crawled under the bed to sleep.') : 'Good morning! The town is open.', 4000);
      hud();
    }
    W.nightWas = on;
  }
  function updatePet(dt, now) {
    var pet = W.pet, st = Pz().state(W.pid), f = st.flags, P = W.P;
    if (!st.pet) return;
    if (bedTime() && !away()) {
      var inMyHouse = W.region === 'home' && W.homeOwner === W.pid;
      if (pet.mode !== 'bed') { pet.mode = 'bed'; pet.queue = []; pet.moving = false; }
      pet.atBed = inMyHouse;
      if (inMyHouse) { pet.x = pet.tx = pet.fx = 1; pet.y = pet.ty = pet.fy = 3; }
      return;
    }
    if (pet.mode === 'bed') {   /* awake again: hop out of bed, or come running back to you */
      pet.mode = 'follow'; pet.atBed = false;
      var wx = W.region === 'home' && W.homeOwner === W.pid ? 3 : (walk(P.x + 1, P.y) ? P.x + 1 : walk(P.x - 1, P.y) ? P.x - 1 : P.x), wy = W.region === 'home' && W.homeOwner === W.pid ? 3 : P.y;
      pet.x = pet.tx = pet.fx = wx; pet.y = pet.ty = pet.fy = wy; pet.queue = [];
      say(st.pet.name + ' woke up and is ready to go!', 2500);
    }
    var speed = 4.4 * petSpeedFactor(f);
    if (W.region === 'town') {
      if (st.starving && pet.mode !== 'dumpster' && pet.mode !== 'eat') {
        pet.mode = 'dumpster'; pet.queue = bfs(pet.x, pet.y, W.dig.x, W.dig.y) || [];
        say(st.pet.name + ' is starving and went digging in the dumpster!', 5000);
      }
      if (pet.mode === 'dumpster' && !st.starving) { pet.mode = 'follow'; pet.queue = bfs(pet.x, pet.y, P.x, P.y) || []; if (pet.queue.length) pet.queue.pop(); }
      if (pet.mode === 'dumpster') speed = Math.max(speed, 2);
    }
    if (pet.mode === 'nap' && now > pet.until) { pet.mode = 'follow'; var back = bfs(pet.x, pet.y, P.x, P.y) || []; if (back.length) back.pop(); pet.queue = back; }
    if ((pet.mode === 'eat' || pet.mode === 'dig') && now > pet.until) pet.mode = 'follow';
    if (pet.mode === 'follow' && f.tired && !pet.moving && Math.random() < dt * 0.025) {
      pet.mode = 'nap'; pet.until = now + 5000 + Math.random() * 4000;
      say(st.pet.name + ' fell asleep. It needs more sleep!', 3500);
    }
    if (pet.mode === 'meal') {   /* walking to its bowls, then eating */
      if (pet.moving) { moveActor(pet, speed, dt); return; }
      if (pet.queue.length) { var mq = pet.queue.shift(); stepTo(pet, mq[0], mq[1]); return; }
      pet.mode = 'eat'; pet.until = now + 1800; pet.dir = 'down'; say('Yum!', 1500); return;
    }
    if (pet.mode === 'nap' || pet.mode === 'eat' || pet.mode === 'dig') return;
    if (pet.moving) { moveActor(pet, speed, dt); return; }
    if (pet.mode === 'dumpster') { if (pet.queue.length) { var n = pet.queue.shift(); stepTo(pet, n[0], n[1]); } return; }
    if (pet.queue.length > 24) { var p2 = bfs(pet.x, pet.y, P.x, P.y) || []; if (p2.length) p2.pop(); pet.queue = p2; }
    /* follows right behind you, Pokemon style: as you step off a square it steps onto it */
    var px = P.moving ? P.tx : P.x, py = P.moving ? P.ty : P.y, dist = Math.max(Math.abs(pet.x - px), Math.abs(pet.y - py));
    if (!pet.queue.length && dist > 2) { var cu = bfs(pet.x, pet.y, px, py) || []; if (cu.length > 1) { cu.pop(); pet.queue = cu; } }
    if (pet.queue.length && dist > 1) {
      var q = pet.queue.shift();
      if (q[0] === px && q[1] === py) { pet.queue.unshift(q); return; }
      var qdx = q[0] - pet.x, qdy = q[1] - pet.y;
      if (Math.max(Math.abs(qdx), Math.abs(qdy)) !== 1 || !walk(q[0], q[1]) || (qdx && qdy && (!walk(pet.x + qdx, pet.y) || !walk(pet.x, pet.y + qdy)))) {
        var fix = bfs(pet.x, pet.y, px, py); if (fix && fix.length > 1) { fix.pop(); pet.queue = fix.slice(1); q = fix[0]; } else return;
      }
      stepTo(pet, q[0], q[1]);
    } else if (dist <= 1) pet.queue = [];
  }
  function say(text, ms) { W.msg = text; W.msgUntil = Date.now() + (ms || 3000); updateMsg(); }

  /* ================= beach objects ================= */
  function newSession() {
    var e = A().exp(); if (!e) return;
    var spots = W.spots.slice(), digs = [], shells = [];
    function take() { var i = Math.floor(Math.random() * spots.length); return spots.splice(i, 1)[0]; }
    for (var i = 0; i < 7 && spots.length; i++) { var s = take(); digs.push({ x: s[0], y: s[1], done: false }); }
    for (var j = 0; j < 6 && spots.length; j++) { var h = take(); shells.push({ x: h[0], y: h[1], id: ['scallop', 'sanddollar', 'scallop', 'conch', 'starfish'][Math.floor(Math.random() * 5)], taken: false }); }
    W.obj = { digs: digs, shells: shells, chests: W.chests.map(function (c) { return { x: c.x, y: c.y, need: c.need, hint: c.hint, open: false }; }) };
  }
  function objAt(list, x, y) { for (var i = 0; i < list.length; i++) if (list[i].x === x && list[i].y === y) return list[i]; return null; }
  function near(o) { var P = W.P; return Math.abs(o.x - P.x) + Math.abs(o.y - P.y) <= 1; }
  function currentAction() {
    if (W.region === 'ship') return shipAction();
    if (W.region === 'home') return homeAction();
    if (W.region !== 'beach' || !W.obj || W.P.moving) return null;
    var P = W.P, d = objAt(W.obj.digs, P.x, P.y);
    if (!d || d.done) { d = null; for (var k = 0; k < W.obj.digs.length; k++) if (!W.obj.digs[k].done && near8(W.obj.digs[k])) { d = W.obj.digs[k]; break; } }   /* on the X or next to it */
    if (d && !d.done) return { kind: 'dig', o: d, label: 'Dig' };
    for (var i = 0; i < W.obj.chests.length; i++) { var c = W.obj.chests[i]; if (!c.open && near8(c)) return { kind: 'chest', o: c, label: 'Open' }; }
    if (P.x === W.fishAt.x && P.y === W.fishAt.y) return { kind: 'fish', o: W.fishAt, label: 'Fish' };
    return null;
  }
  function pickupShell(x, y) {
    var s = objAt(W.obj ? W.obj.shells : [], x, y);
    if (!s || s.taken) return;
    s.taken = true;
    A().grant(W.pid, { id: s.id }).then(function () { say('Found a ' + A().ITEMS[s.id].name.toLowerCase() + '!', 2000); }, C().fail);
  }
  function doAction() {
    var a = currentAction(); if (!a) return;
    if (W.region === 'home') { homeDo(a); actionHud(); return; }
    if (a.kind === 'dig') {
      a.o.done = true; W.pet.mode = 'dig'; W.pet.until = Date.now() + 1300;
      say('Digging...', 1300);
      setTimeout(function () { var res = A().loot(W.pid, 'dig'); A().grant(W.pid, res).then(function () { A().reveal(res); }, C().fail); }, 1300);
    } else if (a.kind === 'chest') {
      if (!can(a.o.need) && a.o.need !== 'swim' && a.o.need !== 'climb') { say(a.o.hint, 3500); return; }
      a.o.open = true;
      var res = A().loot(W.pid, 'chest'); A().grant(W.pid, res).then(function () { A().reveal(res); }, C().fail);
    } else if (a.kind === 'fish') startFishing();
    else if (a.kind === 'mop') startMop(a.o);
    else if (a.kind === 'pick') pickUp(a.o);
    else if (a.kind === 'prizes') openPrizes();
    else if (a.kind === 'full') say('Your hands are full! Plates go to the Dish station, glasses to the Bar, towels to the Towels cart.', 3000);
    actionHud();
  }
  /* fishing: a marker slides back and forth, tap Reel when it is inside the green zone */
  function startFishing() {
    if (W.fish) return;
    var el = W.root.querySelector('.fishing');
    W.fish = { pos: 0, dir: 1, zone: 0.25 + Math.random() * 0.5, width: 0.18, tries: 3, speed: 0.9 + Math.random() * 0.6 };
    el.hidden = false; drawFish();
  }
  function drawFish() {
    var f = W.fish, el = W.root && W.root.querySelector('.fishing'); if (!f || !el) return;
    el.innerHTML = '<div class="fish-t">Tap Reel when the hook is in the green! ' + f.tries + ' tr' + (f.tries === 1 ? 'y' : 'ies') + ' left</div>' +
      '<div class="fish-bar"><span class="fish-zone" style="left:' + (f.zone * 100) + '%;width:' + (f.width * 100) + '%"></span><span class="fish-hook" style="left:' + (f.pos * 100) + '%"></span></div>' +
      '<div class="wrap"><button type="button" class="btn primary" data-wact="reel">Reel!</button><button type="button" class="btn" data-wact="stopFish">Stop</button></div>';
  }
  function reel() {
    var f = W.fish; if (!f) return;
    if (f.pos >= f.zone && f.pos <= f.zone + f.width) {
      stopFish();
      var res = A().loot(W.pid, 'fish'); A().grant(W.pid, res).then(function () { A().reveal(res); }, C().fail);
      return;
    }
    f.tries--;
    if (f.tries <= 0) { stopFish(); say('It got away! Try again.', 2000); }
    else drawFish();
  }
  function stopFish() { W.fish = null; var el = W.root && W.root.querySelector('.fishing'); if (el) { el.hidden = true; el.innerHTML = ''; } }

  /* ================= cruise ship: the Lido Deck clean-up ================= */
  var CARRY_NAME = { plate: 'plate', glass: 'glass', towel: 'towel' };
  var GUEST = ['#f1c7a3', '#d9a47a', '#a8744f', '#6f4a33', '#f5d6c0'];
  /* passengers are random grown-ups and kids built with the character creator's pieces */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function randomPassenger() {
    var AV = window.CHAR && window.CHAR.AV, adult = Math.random() < 0.5;
    if (!AV) return null;
    var n = function (k) { return Math.floor(Math.random() * AV[k].length); };
    return { skin: n('skin'), hairColor: n('hairColor'), topColor: n('topColor'), eyes: pick(['round', 'round', 'happy']),
      hair: pick(adult ? ['short', 'long', 'ponytail', 'curly', 'bun', 'wavy', 'bald', 'spiky', 'longcurly', 'bob'] : ['short', 'spiky', 'long', 'ponytail', 'curly', 'buns', 'bun', 'longcurly', 'bob', 'pigtails']),
      top: pick(adult ? ['tee', 'tee', 'hoodie', 'dress', 'suit'] : ['tee', 'tee', 'hoodie', 'dress']),
      acc: pick(['none', 'none', 'none', 'cap', 'glasses', 'bow']), face: adult ? pick(['none', 'none', 'none', 'beard', 'shortbeard', 'mustache', 'stubble']) : 'none',
      height: adult ? 'tall' : pick(['tiny', 'small', 'small', 'medium']), build: pick(['slim', 'medium', 'large']),
      bangs: pick(['none', 'none', 'none', 'straight', 'curly']), tendrils: pick(['none', 'none', 'none', 'none', 'straight', 'curly']),
      pantsColor: n('pantsColor'), topPat: pick(['solid', 'solid', 'solid', 'solid', 'dots', 'stripes', 'plaid', 'stars', 'hearts', 'camo']), pantsPat: pick(['solid', 'solid', 'solid', 'solid', 'solid', 'plaid', 'camo', 'stripes']) };
  }
  /* a small cast of passengers made once per trip and reused: every new face costs a picture build, which made the deck stutter */
  function passenger() {
    var S = W.ship; if (!S) return randomPassenger();
    if (!S.pool) { S.pool = []; for (var i = 0; i < 8; i++) { var av = randomPassenger(); if (av) S.pool.push(av); } }
    return S.pool.length ? pick(S.pool) : null;
  }
  function dropPassengers(S) {   /* leaving the ship: forget their pictures so they don't pile up in memory */
    if (!S || !S.pool) return;
    S.pool.forEach(function (av) { var k = 'av|' + JSON.stringify(av) + '|'; ['', 'front', 'side', 'back'].forEach(function (v) { delete W.imgs[k + v]; }); });
  }
  function deckOk(x, y) { var t = tile(x, y); return t === DECK || t === WET || t === PATH; }
  function passengerImage(av, view) { return img('av|' + JSON.stringify(av) + '|' + (view || ''), function () { return window.CHAR.drawAvatar(av, null, view ? { view: view } : null); }); }
  function newShip() {
    W.ship = { items: {}, puddles: [], carry: [], done: 0, tickets: 0, next: Date.now() + 3000, mop: null, hintAt: 0, pops: [],
      swim: [0, 1, 2].map(function (i) { return { x: 9 + i * 2.5, y: 12 + (i % 2), ph: Math.random() * 6, c: ['#e45757', '#f2d43a', '#6d3fcf'][i] }; }),
      guests: {}, walkers: [] };
    passenger(); var v0 = people3d() ? 'front' : ''; W.ship.pool.forEach(function (av) { passengerImage(av, v0); });   /* start loading their pictures now */
    W.slots.forEach(function (s, i) { if (s.kind === 'dine' || (s.kind === 'chair' && i % 2)) W.ship.guests[s.x + ',' + s.y] = passenger() || GUEST[i % GUEST.length]; });
    var spots = []; for (var yy = 0; yy < W.mh; yy++) for (var xx = 0; xx < W.mw; xx++) if (deckOk(xx, yy)) spots.push([xx, yy]);
    for (var k = 0; k < 3 && spots.length; k++) { var sp0 = pick(spots), av = W.ship.pool[k] || null; if (av) W.ship.walkers.push({ x: sp0[0], y: sp0[1], tx: sp0[0], ty: sp0[1], fx: sp0[0], fy: sp0[1], moving: false, path: [], face: 1, dir: 'down', av: av, wait: 1 + k * 2, goal: null }); }
    for (var i = 0; i < 6; i++) spawnTask(true);
  }
  function capacity() { var st = Pz().state(W.pid), f = st.flags || {}; return st.pet && !f.thin && !f.dirty && !f.tired && !f.pudgy ? 4 : 3; }
  function outstanding() { var n = W.ship.puddles.length; for (var k in W.ship.items) if (W.ship.items.hasOwnProperty(k)) n++; return n; }
  function spawnTask(quiet) {
    var S = W.ship; if (outstanding() >= 9) return;
    var kinds = { plate: 34, glass: 30, towel: 20, puddle: S.puddles.length < 3 ? 16 : 0 }, r = Math.random() * (kinds.plate + kinds.glass + kinds.towel + kinds.puddle), kind;
    for (kind in kinds) { r -= kinds[kind]; if (r <= 0) break; }
    if (kind === 'puddle') {
      var free = W.wet.filter(function (w) { return !puddleAt(w[0], w[1]) && !(W.P && W.P.x === w[0] && W.P.y === w[1]); });
      if (!free.length) return;
      var w = free[Math.floor(Math.random() * free.length)];
      S.puddles.push({ x: w[0], y: w[1], born: Date.now() });
      if (!quiet) pop(w[0], w[1], 'Splash!', '#2f7fb8');
      return;
    }
    var want = kind === 'plate' ? ['dine'] : kind === 'glass' ? ['drink', 'dine'] : ['chair'];
    var open = W.slots.filter(function (s) { return want.indexOf(s.kind) >= 0 && !S.items[s.x + ',' + s.y] && (!s.back || s.back < Date.now()); });
    if (!open.length) return;
    var s = open[Math.floor(Math.random() * open.length)], key = s.x + ',' + s.y;
    S.items[key] = kind;
    delete S.guests[key];
  }
  function shipTick(now) {
    var S = W.ship;
    if (now >= S.next) { spawnTask(false); S.next = now + 6500 + Math.random() * 3500; }
    S.pops = S.pops.filter(function (p) { return now - p.t0 < 1200; });
    W.slots.forEach(function (s) { var key = s.x + ',' + s.y; if (s.back && now >= s.back && !S.items[key]) { s.back = 0; if (s.kind === 'dine' || Math.random() < 0.5) S.guests[key] = passenger() || GUEST[Math.floor(Math.random() * GUEST.length)]; } });
  }
  function puddleAt(x, y) { var list = W.ship ? W.ship.puddles : []; for (var i = 0; i < list.length; i++) if (list[i].x === x && list[i].y === y) return list[i]; return null; }
  /* on adventures, anything in the 8 squares around the kid counts as next to them (diagonals too) */
  function near8(o) { var P = W.P; return Math.max(Math.abs(o.x - P.x), Math.abs(o.y - P.y)) <= 1; }
  function puddleNear() { var P = W.P, on = puddleAt(P.x, P.y); if (on) return on; var list = W.ship ? W.ship.puddles : []; for (var i = 0; i < list.length; i++) if (near8(list[i])) return list[i]; return null; }
  function nearStation(s) { var P = W.P, dx = Math.max(s.x - P.x, 0, P.x - (s.x + s.w - 1)), dy = Math.abs(P.y - s.y); return Math.max(dx, dy) === 1; }
  function shipAction() {
    var S = W.ship, P = W.P; if (!S || P.moving || S.mop) return null;
    var pd = puddleNear(); if (pd) return { kind: 'mop', o: pd, label: 'Mop' };
    for (var i = 0; i < W.slots.length; i++) {
      var s = W.slots[i];
      if (S.items[s.x + ',' + s.y] && near8(s)) return S.carry.length < capacity() ? { kind: 'pick', o: s, label: 'Pick up' } : { kind: 'full', o: s, label: 'Hands full' };
    }
    for (var j = 0; j < W.stations.length; j++) { var ps = W.stations[j]; if (ps.kind === 'prize' && nearStation(ps)) return { kind: 'prizes', o: { x: ps.x + (ps.w - 1) / 2, y: ps.y }, label: 'Prizes' }; }
    return null;
  }
  function pickUp(s) {
    var S = W.ship, key = s.x + ',' + s.y, it = S.items[key]; if (!it) return;
    S.carry.push(it); delete S.items[key]; s.back = Date.now() + 4000 + Math.random() * 4000;
    var cap = capacity();
    say('Picked up a ' + CARRY_NAME[it] + '. ' + (S.carry.length >= cap ? 'Hands full!' : (cap - S.carry.length) + ' more fit.') + (S.carry.length === 4 ? ' Your pet is carrying one!' : ''), 1600);
    hud(); dropOff();
  }
  /* stopping next to a job does it by itself, a few times a second and one at a time:
     on the ship drop-offs, puddles and pick-ups; at the beach digging an X */
  /* Opening a chest, fishing and the prize desk stay a tap: their button pops up right above them (see actionHud). */
  var AUTO = ['dig', 'mop', 'pick'];
  function advAuto(now) {
    var P = W.P; if (!P || P.moving || P.path.length || W.held || (W.steer && W.steer.moved) || now < (W.autoAt || 0)) return;
    W.autoAt = now + 250;
    if (Pz().G.room || W.fish || overlayOn() || openPanel()) return;
    if (W.region === 'ship') {
      var S = W.ship; if (!S || S.mop) return;
      dropOff(true);
      var a = shipAction(); if (a && AUTO.indexOf(a.kind) >= 0) { W.autoAt = now + 450; doAction(); }
    } else if (W.region === 'beach' && W.obj) {
      if (W.pet.mode === 'dig' && now <= W.pet.until) return;   /* one hole at a time */
      var b = currentAction(); if (b && b.kind === 'dig') { W.autoAt = now + 1500; doAction(); }
    }
  }
  function openPanel() { var el = W.root && W.root.querySelector('.prizes'); return !!(el && !el.hidden) || !!document.querySelector('.celebrate'); }
  function dropOff(quiet) {
    var S = W.ship; if (!S || !S.carry.length) return;
    W.stations.forEach(function (st) {
      if (st.kind === 'prize' || !nearStation(st)) return;
      var keep = [], n = 0;
      S.carry.forEach(function (it) { if (it === st.kind) n++; else keep.push(it); });
      if (n) { S.carry = keep; award(n, n + ' ' + CARRY_NAME[st.kind] + (n > 1 ? (st.kind === 'glass' ? 'es' : 's') : '') + ' dropped off!', st.x + Math.floor(st.w / 2), st.y); hud(); }
      else if (!quiet && Date.now() - S.hintAt > 5000) { S.hintAt = Date.now(); say('Wrong spot! ' + st.title + ' takes ' + CARRY_NAME[st.kind] + (st.kind === 'glass' ? 'es' : 's') + '. Plates go to the Dish station, glasses to the Bar, towels to the Towels cart.', 3500); }
    });
  }
  function startMop(pd) { var S = W.ship; S.mop = { pd: pd, until: Date.now() + 900 }; W.held = null; W.P.path = []; if (pd.x !== W.P.x) W.P.face = pd.x > W.P.x ? 1 : -1; say('Mopping...', 900); actionHud(); }
  function finishMop() {
    var S = W.ship, pd = S.mop.pd; S.mop = null;
    S.puddles = S.puddles.filter(function (p) { return p !== pd; });
    award(1, 'Squeaky clean!', pd.x, pd.y);
    actionHud();
  }
  function award(n, text, x, y) {
    var S = W.ship, before = S.done; S.done += n;
    var bonus = Math.floor(S.done / 10) - Math.floor(before / 10), t = n + bonus * 5;
    S.tickets += t;
    pop(x, y, '+' + t, '#c9941a');
    say(text + ' +' + t + ' ticket' + (t === 1 ? '' : 's') + (bonus ? '. Captain’s bonus for ' + (Math.floor(S.done / 10) * 10) + ' jobs!' : ''), bonus ? 3000 : 1600);
    A().addTickets(W.pid, t, n).then(function () { setTimeout(hud, 80); }, C().fail);
    if (bonus) { var r = A().deckBonus(W.pid); if (r) A().grant(W.pid, r).then(function () { A().reveal(r); }, C().fail); }
  }
  function pop(x, y, text, col) { W.ship.pops.push({ x: x, y: y, text: text, col: col, t0: Date.now() }); }
  function openPrizes() {
    var el = W.root && W.root.querySelector('.prizes'); if (!el) return;
    el.innerHTML = A().prizesHtml(W.pid); el.hidden = false;
  }
  function closePrizes() { var el = W.root && W.root.querySelector('.prizes'); if (el) { el.hidden = true; el.innerHTML = ''; } }
  function buyPrize(id) {
    A().buyPrize(W.pid, id).then(function (res) {
      closePrizes(); A().reveal(res); setTimeout(function () { hud(); if (Pz().G.room && Pz().G.room.kind === 'prizes') renderRoom(true); }, 120);
    }, C().fail);
  }
  function itemDraw(kind, cx, cy, sc) {
    var ctx = W.ctx; sc = sc || 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    if (kind === 'plate') {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9aa6ad'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.stroke();
      ctx.fillStyle = '#c9793a'; ctx.fillRect(-3, -2, 4, 3); ctx.fillStyle = '#7fc15a'; ctx.fillRect(1, 0, 3, 2);
    } else if (kind === 'glass') {
      ctx.fillStyle = 'rgba(200,235,255,.9)'; ctx.strokeStyle = '#5a8fb0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.lineTo(3, 7); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f29b38'; ctx.fillRect(-3, 0, 6, 5); ctx.fillStyle = '#e45757'; ctx.fillRect(2, -12, 1.5, 8);
    } else if (kind === 'towel') {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7fa8c8'; ctx.lineWidth = 1; rr(ctx, -9, -6, 18, 12, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a8ed8'; ctx.fillRect(-9, -2, 18, 2); ctx.fillRect(-9, 2, 18, 1.5);
    }
    ctx.restore();
  }
  function carryDraw(tx, ty, h, list) {
    list.forEach(function (it, i) { itemDraw(it, tx * T + 16 + (i - (list.length - 1) / 2) * 13, ty * T + T - h - 6 - (i % 2) * 3, 0.9); });
  }
  function mopDraw(tx, ty, pd) {
    var ctx = W.ctx, a = Math.sin(W.t * 16) * 0.5, cx = tx * T + 26, cy = ty * T + 26;
    if (pd && (pd.x !== tx || pd.y !== ty)) { cx = pd.x * T + 16 - (pd.x - tx) * 6; cy = pd.y * T + 22 - (pd.y - ty) * 6; }   /* reaching over to the next square */
    ctx.save(); ctx.translate(cx, cy - 24); ctx.rotate(a);
    ctx.fillStyle = '#a8703a'; ctx.fillRect(-1.5, 0, 3, 26); ctx.fillStyle = '#e9e3d6'; rr(ctx, -7, 24, 14, 6, 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 10 + i * 8 + Math.sin(W.t * 9 + i) * 3, cy + 2 - ((W.t * 30 + i * 7) % 12), 2, 0, 7); ctx.fill(); }
  }
  function guestDraw(key, s, col) {
    if (col && typeof col === 'object') {
      var v = people3d() ? 'front' : '', im = passengerImage(col, v), h = Math.round(46 * ((window.CHAR.HEIGHT_PX || {})[col.height] || 1) * (s.kind === 'chair' ? 0.8 : 0.92));
      if (s.kind === 'chair') sprite(im, s.x, s.y - 0.35, h, 0, 1, 0, true);
      else { sprite(im, s.x - 0.7, s.y + 0.05, h, Math.sin(W.t * 3 + s.x) * 0.6, 1, 0, true); if (s.kind === 'dine') { var c2 = W.ctx, cx2 = s.x * T + 16, cy2 = s.y * T + 16; c2.fillStyle = '#fff'; c2.beginPath(); c2.arc(cx2 - 3, cy2, 5, 0, 7); c2.fill(); c2.fillStyle = '#c9793a'; c2.fillRect(cx2 - 5, cy2 - 2, 4, 3); } }
      return;
    }
    var ctx = W.ctx, cx = s.x * T + 16, cy = s.y * T + 16, i = (s.x * 7 + s.y) % 5, shirt = ['#e45757', '#3a8ed8', '#f2d43a', '#6fcf8f', '#b58cff'][i];
    if (s.kind === 'chair') {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, s.y * T + 8, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = shirt; rr(ctx, cx - 7, s.y * T + 13, 14, 12, 4); ctx.fill();
      ctx.fillStyle = '#2b2233'; ctx.fillRect(cx - 5, s.y * T + 6, 10, 2.5);
      return;
    }
    var gx = cx - 22, bob = Math.sin(W.t * 3 + s.x) * 1;
    ctx.fillStyle = shirt; rr(ctx, gx - 6, cy - 4 + bob, 12, 14, 4); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(gx, cy - 9 + bob, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(gx, cy - 12 + bob, 5.5, Math.PI, 0); ctx.fill();
    if (s.kind === 'dine') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - 3, cy, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#c9793a'; ctx.fillRect(cx - 5, cy - 2, 4, 3); }
  }
  /* walking passengers stroll the deck and leave a mess where they stop: a plate, a glass, a towel or a wet puddle */
  function walkersStep(dt) {
    var S = W.ship; if (!S || !S.walkers) return;
    S.walkers.forEach(function (w) {
      if (w.moving) { moveActor(w, 2.0, dt); return; }
      if (w.path.length) { var n = w.path.shift(); if (deckOk(n[0], n[1]) && !(W.P.x === n[0] && W.P.y === n[1])) stepTo(w, n[0], n[1]); else w.path = []; return; }
      if (w.goal) {
        var g = w.goal; w.goal = null; w.wait = 2 + Math.random() * 3; w.dir = 'down';
        if (outstanding() < 9) {
          if (g.slot) { var key = g.slot.x + ',' + g.slot.y; if (!S.items[key]) { S.items[key] = g.kind; delete S.guests[key]; pop(g.slot.x, g.slot.y, 'Oops!', '#c0561c'); } }
          else if (!puddleAt(w.x, w.y)) { S.puddles.push({ x: w.x, y: w.y, born: Date.now() }); pop(w.x, w.y, 'Drip!', '#2f7fb8'); }
        }
        return;
      }
      if ((w.wait -= dt) > 0) return;
      var r = Math.random(), target = null, goal = null;
      if (r < 0.75) {
        var want = pick([['dine'], ['drink', 'dine'], ['chair']]), kind = want[0] === 'chair' ? 'towel' : want[0] === 'drink' ? 'glass' : 'plate';
        var open = W.slots.filter(function (s) { return want.indexOf(s.kind) >= 0 && !S.items[s.x + ',' + s.y]; });
        if (open.length) {
          var sl = pick(open), adj = [[sl.x, sl.y + 1], [sl.x, sl.y - 1], [sl.x - 1, sl.y], [sl.x + 1, sl.y]].filter(function (p) { return deckOk(p[0], p[1]); });
          if (adj.length) { target = pick(adj); goal = { slot: sl, kind: kind }; }
        }
      } else {
        var wet = W.wet.filter(function (p) { return deckOk(p[0], p[1]); });
        if (wet.length) { target = pick(wet); goal = { wet: true }; }
      }
      if (!target) { w.wait = 2; return; }
      var path = bfs(w.x, w.y, target[0], target[1], false, deckOk);
      if (!path || !path.length) { w.wait = 1.5; return; }
      w.path = path.slice(0, 40); w.goal = goal;
    });
  }
  function shipDraw(list) {
    var S = W.ship, ctx = W.ctx;
    S.swim.forEach(function (sw) {
      list.push({ y: 10.5, draw: function () {
        var x = (sw.x + Math.sin(W.t * 0.5 + sw.ph) * 1.8) * T + 16, y = (sw.y + Math.cos(W.t * 0.4 + sw.ph) * 0.6) * T + 16 + Math.sin(W.t * 3 + sw.ph) * 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse ? ctx.ellipse(x, y + 5, 11, 4, 0, 0, 7) : ctx.arc(x, y + 5, 10, 0, 7); ctx.stroke();
        ctx.fillStyle = '#e9b48a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
        ctx.fillStyle = sw.c; ctx.beginPath(); ctx.arc(x, y - 1, 6, Math.PI, 0); ctx.fill();
      } });
    });
    W.slots.forEach(function (s) {
      var key = s.x + ',' + s.y, it = S.items[key], g = S.guests[key];
      if (g && !it) list.push({ y: s.y - 0.1, draw: function () { guestDraw(key, s, g); } });
      if (it) list.push({ y: s.y + 0.05, draw: function () {
        var cx = s.x * T + 16, cy = s.y * T + (s.kind === 'chair' ? 18 : 14);
        itemDraw(it, cx, cy, s.kind === 'chair' ? 1.2 : 1);
        sparkles(cx, cy - 4, 10, '#fff');
      } });
    });
    (S.walkers || []).forEach(function (w) {
      var wp = pos(w);
      list.push({ y: wp.y + 0.005, draw: function () {
        var p3 = people3d(), v = p3 ? (w.dir === 'up' ? 'back' : w.dir === 'side' ? 'side' : 'front') : '', h = Math.round(54 * ((window.CHAR.HEIGHT_PX || {})[w.av.height] || 1) * 0.92);
        var im = passengerImage(w.av, v);
        actor(im, wp.x, wp.y, h, { face: v ? (v === 'side' ? -w.face : 1) : w.face, gait: 'stride', a: w, view: v || (w.dir === 'side' ? 'side' : 'front'), isAvatar: true, seed: w.fx });
      } });
    });
    S.puddles.forEach(function (p) {
      list.push({ y: p.y - 0.6, draw: function () {
        var cx = p.x * T + 16, cy = p.y * T + 18, w = 1 + Math.sin(W.t * 2 + p.x) * 0.05;
        ctx.fillStyle = 'rgba(95,198,234,.75)'; ctx.beginPath(); ctx.ellipse ? ctx.ellipse(cx, cy, 13 * w, 7, 0, 0, 7) : ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(cx - 6, cy - 3, 5, 2);
      } });
    });
  }
  function popsDraw() {
    var ctx = W.ctx, now = Date.now();
    W.ship.pops.forEach(function (p) {
      var a = (now - p.t0) / 1200;
      ctx.globalAlpha = 1 - a; ctx.fillStyle = p.col; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeText(p.text, p.x * T + 16, p.y * T - 4 - a * 26); ctx.fillText(p.text, p.x * T + 16, p.y * T - 4 - a * 26);
    });
    ctx.globalAlpha = 1;
  }

  /* ================= regions ================= */
  function load(region) {
    W.region = region;
    var m = region === 'beach' ? buildBeach() : region === 'ship' ? buildShip() : region === 'home' ? buildHome(W.homeOwner) : buildTown(C().activePeople().filter(function (p) { return !C().isAdult(p.id); }));
    W.map = m.map; W.mw = m.mw; W.mh = m.mh; W.bld = m.bld;
    W.stations = m.stations || []; W.slots = m.slots || []; W.wet = m.wet || []; W.furn = m.furn || [];
    if (region !== 'ship') W.ship = null;
    W.dumpster = m.dumpster; W.dig = m.dig; W.chests = m.chests || []; W.fishAt = m.fishAt; W.spots = m.spots || [];
    if (!W.bgs[region] || region === 'town' || region === 'home') W.bgs[region] = drawBg();
    W.bg = W.bgs[region];
    return m;
  }
  function enterRegion(region) {
    Pz().G.room = null; renderRoom();
    if (bedTime() && Pz().wake) Pz().wake(W.pid);   /* adventures wake the pet up: it comes along */
    A().startExpedition(W.pid, region);
    var m = load(region);
    placeAt(m.start.x, m.start.y);
    stopFish(); closePrizes();
    size();
    if (region === 'ship') { newShip(); say('Welcome aboard! Plates go to the Dish station, glasses to the Bar, towels to the Towels cart. Mop puddles by the pool.', 6000); }
    else { W.ship = null; newSession(); say('Welcome to Sunny Beach! Dig at the X marks, fish off the pier and look for chests.', 4500); }
    hud(); start();
  }
  function leaveRegion(reason) {
    if (W.region === 'town') return;
    if (W.region === 'home') { leaveHome(); return; }
    var tk = W.region === 'ship' && W.ship ? W.ship.tickets : 0;
    dropPassengers(W.ship);
    A().saveTime(true);
    stopFish(); closePrizes();
    if (!reason && tk) reason = 'Back in town. You earned ' + tk + ' deck ticket' + (tk === 1 ? '' : 's') + ' on the ship!';
    W.ship = null;
    load('town'); W.key = peopleKey(); size();
    var gate = null; W.bld.forEach(function (b) { if (b.kind === 'gate') gate = b; });
    placeAt(gate.door.x, gate.door.y - 1);
    W.obj = null;
    say(reason || 'Back in town. Check your house to try on what you found!', 3500);
    hud(); start();
  }

  /* ================= loop ================= */
  function start() { if (!W.run && W.cv) { W.run = true; W.last = 0; RAF(tick); } }
  function tick(ts) {
    if (!W.run) return;
    if (!W.cv || !document.body.contains(W.cv)) { W.run = false; if (away()) A().saveTime(false); return; }
    var dt = Math.min(0.05, W.last ? (ts - W.last) / 1000 : 0.016); W.last = ts; W.t += dt;
    var now = Date.now(), P = W.P;
    var mopping = W.ship && W.ship.mop;
    if (mopping) { if (now >= W.ship.mop.until) finishMop(); }
    else if (P.moving) { if (moveActor(P, 4.2, dt)) arrived(P); }
    else if (P.path.length) arrived(P);
    else if (W.held) playerTryDir(W.held);
    if (W.steer && Math.floor(W.t * 6) !== Math.floor((W.t - dt) * 6)) steerHeld();
    if (W.region === 'ship' && W.ship) { shipTick(now); walkersStep(dt); }
    if (away()) advAuto(now);
    if (W.region === 'home') residentsStep(dt);
    if (Math.floor(W.t) !== Math.floor(W.t - dt)) nightCheck();
    if (W.run) updatePet(dt, now);
    if (W.fish) { var f = W.fish; f.pos += f.dir * f.speed * dt; if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; } var hk = W.root.querySelector('.fish-hook'); if (hk) hk.style.left = (f.pos * 100) + '%'; }
    if (away()) {
      var e = A().exp();
      if (e && now - e.lastSave > 60000) A().saveTime(false);
      if (!e || now >= e.endsAt) { leaveRegion('Adventure time is up for today. See you next time!'); }
      else if (Math.floor(W.t * 2) !== Math.floor((W.t - dt) * 2)) { timerHud(e); actionHud(); }
    }
    if (W.msgUntil && now > W.msgUntil) { W.msgUntil = 0; W.msg = ''; updateMsg(); }
    if (!W.cv || !W.ctx) return;   /* something above closed the map (the mirror opens the creator) */
    draw();
    if (W.run) RAF(tick);
  }
  function pos(a) { return a.moving ? { x: a.px, y: a.py } : { x: a.x, y: a.y }; }
  function draw() {
    /* the house shrinks a little if needed so the whole room fits under the stats panel */
    W.scale = W.region === 'home' && W.baseScale ? Math.max(0.6, Math.min(W.baseScale, (W.ch - (W.hudH || 100) - 6) / (W.mh * T))) : (W.baseScale || W.scale);
    var ctx = W.ctx, s = W.scale * W.dpr, vw = W.cw / W.scale, vh = W.ch / W.scale, MW = W.mw, MH = W.mh;
    var pp = pos(W.P), camX = pp.x * T + T / 2 - vw / 2, camY = pp.y * T + T / 2 - vh / 2;
    camX = Math.max(0, Math.min(MW * T - vw, camX)); camY = Math.max(0, Math.min(MH * T - vh, camY));
    if (vw > MW * T) camX = (MW * T - vw) / 2;
    if (W.region === 'home') { var top = (W.hudH || 100) / W.scale; camY = Math.max(-top, Math.min(MH * T - vh + 8, pp.y * T + T / 2 - vh / 2)); if (MH * T + top <= vh) camY = -top; }
    else if (vh > MH * T) camY = (MH * T - vh) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = W.region === 'beach' ? '#2f8fc4' : W.region === 'ship' ? '#2f7fb8' : W.region === 'home' ? '#3b2c22' : '#2f8a4a'; ctx.fillRect(0, 0, W.cv.width, W.cv.height);
    ctx.setTransform(s, 0, 0, s, -camX * s, -camY * s);
    ctx.drawImage(W.bg, 0, 0);
    W.cam = { x: camX, y: camY };
    var list = [];
    if (W.region === 'town') {
      W.bld.forEach(function (b) {
        if (b.kind !== 'house') return;
        var d = Pz().doc(b.owner);
        if (d.egg) list.push({ y: b.y, draw: function () { sparkles(b.x * T + b.w * T / 2, b.y * T + 20, 40, '#ffd84a'); } });
        if (b.owner === W.pid) return;
        var st = Pz().state(b.owner); if (!st.pet) return;
        list.push({ y: b.door.y + 1, draw: function () {
          actor(petImage(b.owner, st.mood.key, false, 'down'), b.door.x + 2, b.door.y + 1, 48, { face: is3d(st.pet) ? 1 : -1, gait: petGait(st.pet), seed: b.x, view: 'front', stink: st.flags && st.flags.dirty });
          if (CRE.byId(st.pet.sp).rare) sparkles((b.door.x + 2) * T + 16, (b.door.y + 1) * T - 10, 22, '#ffe27a');
        } });
      });
    } else if (W.region === 'home') {
      (W.residents || []).forEach(function (r) {
        var rp = pos(r);
        list.push({ y: rp.y, draw: function () {
          var pv = petView(r.p, r.dir);
          actor(residentImage(r), rp.x, rp.y, r.p.current ? 52 : 46, { face: pv ? (pv === 'side' ? -r.face : 1) : r.face, gait: petGait(r.p), a: r, view: pv || (r.dir === 'side' ? 'side' : 'front'), seed: r.fx * 3 + r.fy, low: petLow(r.p), wings: petWings(r.p), legs3d: hasLegs(r.p) });
          if (CRE.byId(r.p.sp) && CRE.byId(r.p.sp).rare) sparkles(rp.x * T + 16, rp.y * T - 10, 20, '#ffe27a');
        } });
      });
      W.furn.forEach(function (f) { if (f.kind === 'egg') list.push({ y: f.y + 0.3, draw: function () { var im = eggImage(); if (im) W.ctx.drawImage(fastIm(im, 24, 24), f.x * T + 4, f.y * T - 4 + Math.sin(W.t * 2) * 1.5, 24, 24); sparkles(f.x * T + 16, f.y * T + 6, 14, '#ffe27a'); } }); });
      A().toysIn(W.homeOwner).slice(0, 4).forEach(function (id, i) {
        var tx = [8, 7, 8, 7][i], ty = [9, 9, 8, 8][i];
        list.push({ y: ty - 0.5, draw: function () { var im = itemImage(id); if (im) W.ctx.drawImage(fastIm(im, 20, 20), tx * T + 6, ty * T + 8, 20, 20); } });
      });
    } else if (W.region === 'ship' && W.ship) {
      shipDraw(list);
    } else if (W.obj) {
      var lit = can('light');
      W.obj.digs.forEach(function (d) { if (!d.done) list.push({ y: d.y - 0.5, draw: function () { xMark(d.x, d.y); } }); });
      W.obj.shells.forEach(function (sh) { if (!sh.taken) list.push({ y: sh.y - 0.4, draw: function () { var im = itemImage(sh.id); if (im) ctx.drawImage(fastIm(im, 18, 18), sh.x * T + 7, sh.y * T + 8, 18, 18); sparkles(sh.x * T + 16, sh.y * T + 14, 10, '#fff'); } }); });
      W.obj.chests.forEach(function (c) {
        if (c.need === 'light' && !lit) return;
        list.push({ y: c.y, draw: function () { chest(c.x, c.y, c.open); } });
      });
      list.push({ y: W.fishAt.y - 0.5, draw: function () { if (!W.fish) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Fish here', W.fishAt.x * T + 16, W.fishAt.y * T + 6); } } });
    }
    hostSpots().forEach(function (h) {
      list.push({ y: h.y, draw: function () {
        var hv = actorView('down'), im = img('av|' + JSON.stringify(h.avatar) + '|' + hv, function () { return Pz().avatarSvg(h.avatar, true, hv ? { view: hv } : null); });
        actor(im, h.x, h.y, avatarPx(h.avatar), { face: hv ? 1 : -1, gait: 'stride', seed: h.x, view: hv || 'front', isAvatar: true });
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var tw = ctx.measureText(h.name).width + 10, cx = h.x * T + 16, cy = h.y * T + T - 2 - avatarPx(h.avatar) - 6;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, cx - tw / 2, cy - 8, tw, 16, 5); ctx.fill();
        ctx.fillStyle = '#17211e'; ctx.fillText(h.name, cx, cy);
      } });
    });
    var st = Pz().state(W.pid), pet = W.pet, petPos = pos(pet);
    if (st.pet) {
      var mood = pet.mode === 'nap' ? 'asleep' : pet.mode === 'eat' ? 'eat' : pet.mode === 'dig' ? 'happy' : st.mood.key;
      var dump = pet.mode === 'dumpster' && !pet.moving && W.dig && pet.x === W.dig.x && pet.y === W.dig.y;
      var digging = dump || pet.mode === 'dig';
      if (pet.mode === 'bed') {
        if (pet.atBed) { var hid = !!hideInfo(), ub = !hid && nightInfo() && nightInfo().under; list.push({ y: hid || ub ? 5.6 : 4.6, draw: function () { if (hid) petHiding(); else if (ub) petUnderBed(); else petInBed(st); } }); }
      } else list.push({ y: petPos.y, draw: function () {
        var pv = petView(st.pet, pet.dir);
        actor(petImage(W.pid, mood, pet.moving, pet.dir, pet), petPos.x, petPos.y, 54, { face: pv ? (pv === 'side' ? -pet.face : 1) : pet.face, gait: mood === 'asleep' ? 'still' : petGait(st.pet), a: pet, view: pv || (pet.dir === 'side' ? 'side' : 'front'),
          bob: digging ? Math.sin(W.t * 18) * 2 : 0, rot: digging ? Math.sin(W.t * 14) * 0.15 : 0, stink: st.flags && st.flags.dirty, seed: 0.3, low: petLow(st.pet), wings: petWings(st.pet), legs3d: hasLegs(st.pet) });
        if (digging) trash(petPos.x, petPos.y, dump);
        if (pet.mode === 'nap') zzz(petPos.x, petPos.y);
        if (CRE.byId(st.pet.sp).rare) sparkles(petPos.x * T + 16, petPos.y * T - 12, 24, '#ffe27a');
      } });
    }
    list.push({ y: pp.y + 0.01, draw: function () {
      var av = actorView(W.P.dir);
      actor(avatarImage(W.pid, av), pp.x, pp.y, avatarPx(Pz().kidAv(Pz().doc(W.pid).avatar)), { face: av ? (av === 'side' ? -W.P.face : 1) : W.P.face, gait: 'stride', a: W.P, view: av || (W.P.dir === 'side' ? 'side' : 'front'), isAvatar: true });
      if (W.ship) { carryDraw(pp.x, pp.y, 58, W.ship.carry.slice(0, 3)); if (W.ship.mop) mopDraw(pp.x, pp.y, W.ship.mop.pd); }
    } });
    if (W.ship && W.ship.carry.length > 3) list.push({ y: petPos.y + 0.02, draw: function () { carryDraw(petPos.x, petPos.y, 50, W.ship.carry.slice(3)); } });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) { it.draw(); });
    if (W.region === 'beach') caveDark(pp);
    if ((W.region === 'town' || W.region === 'home') && nightInfo()) nightDark(pp);
    if (W.ship) popsDraw();
    if (W.floatAt) placeFloat();
  }
  function caveDark(pp) {
    var ctx = W.ctx, x0 = 19 * T, y0 = 2 * T, w = 5 * T, h = 8 * T, inCave = pp.x >= 19 && pp.x <= 23 && pp.y >= 2 && pp.y <= 9;
    if (can('light')) { ctx.fillStyle = 'rgba(255,170,60,.12)'; ctx.fillRect(x0, y0, w, h); return; }
    ctx.save(); ctx.fillStyle = 'rgba(8,6,12,.93)';
    ctx.beginPath(); ctx.rect(x0, y0, w, 6 * T);
    if (inCave) { ctx.moveTo(pp.x * T + 16 + 36, pp.y * T + 16); ctx.arc(pp.x * T + 16, pp.y * T + 16, 36, 0, Math.PI * 2, true); }
    ctx.fill('evenodd'); ctx.restore();
  }
  /* ---------------- gaits ----------------
   * Pets that walk on legs have real walk frames rendered in Blender (c3d-<id>-walk.webp: legs swing and bend, head and
   * body hold still so the face never moves); the picture just rides up a little at each passing step. Everything else is
   * one still picture per view, so walking is made by moving parts of that picture:
   *   walk   : (only while a pet's leg frames are loading) the picture rides up and down as one piece
   *   stride : people (and two-legged pets): left/right feet step facing you; from the side the legs are drawn
   *            twice, swung forward and back like scissors
   *   hop    : squash, spring up, stretch, land (no legs, blobs, chicks, bunnies, frogs, grasshoppers)
   *   flutter: a floaty hop (little wings that can't carry it yet)
   *   fly    : hovers over its shadow, bobbing with each wing beat and leaning into the flight
   *   waddle : rocks from foot to foot (penguins)
   *   slide  : stretches and glides (snails)
   * The phase comes from distance walked (a.gait, in squares), so feet keep time with the ground. */
  function petGait(p) {
    var sp = CRE.byId(p.sp) || {}, st = p.stage || 0, id = sp.id, ws = sp.wingSize;
    if (id === 'waddles') return 'waddle';
    if (sp.pattern === 'snail') return 'slide';
    if (sp.goo || sp.shape || sp.blob || id === 'bunny' || id === 'hopsy' || id === 'tadlet') return 'hop';
    if (sp.wings && st >= (sp.wingsFrom || 0) && ws && ws[st] < 1) return 'flutter';
    if (sp.family === 'bug' && sp.wings) return 'fly';
    if (id === 'flitter') return 'fly';
    if (sp.family === 'bird' || id === 'phoenix') return st ? 'fly' : 'hop';
    if (sp.wings && st >= Math.max(1, sp.wingsFrom || 0)) return 'fly';
    return 'walk';
  }
  /* a crisp copy of the picture at the size it is drawn, so parts of it can be cut out and moved */
  function raster(im, w, h) {
    var k = Math.max(1, Math.min(5, (W.scale || 1) * (W.dpr || 1))), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k)), key = cw + 'x' + ch;
    var c = im._r || (im._r = {}); if (c[key]) return c[key];
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    try { cv.getContext('2d').drawImage(im, 0, 0, cw, ch); } catch (e) { return null; }
    return (c[key] = cv);
  }
  /* pictures made from SVG are turned into a canvas once at screen size: drawing SVG every frame is slow on phones and tablets */
  function fastIm(im, w, h) { return im && !im.getContext && im.complete !== false ? raster(im, w, h) || im : im; }
  var LEG = { walk: 0.24, stride: 0.27, lowWalk: 0.15 };
  function actor(im, tx, ty, h, o) {
    var ctx = W.ctx, w = o.isAvatar ? h * 0.75 : h * 0.906, cx = tx * T + T / 2, base = ty * T + T - 2, a = o.a || {}, t = W.t + (o.seed || 0);
    var moving = !!a.moving, u = a.gait || 0, g = o.gait || 'walk', side = o.view === 'side';
    var lift = 0, sx = 1, sy = 1, tilt = 0, shadow = 1, legs = null, legLift = 0, shear = 0;
    var breathe = Math.sin(t * 2.4) * 0.012;
    if (g === 'still') { sy = 1 + breathe * 0.6; }
    else if (g === 'fly') {
      lift = -h * (0.2 + 0.035 * Math.sin(t * 2.3)) - Math.abs(Math.sin(t * (moving ? 15 : 9))) * h * 0.025;
      if (moving) tilt = side ? 0.12 : Math.sin(u * Math.PI) * 0.05;
      if (!side) sx = 1 + Math.sin(t * (moving ? 15 : 9)) * 0.025;
      shadow = 0.6;
    } else if (g === 'hop' || g === 'flutter') {
      var p = u - Math.floor(u), air = moving ? Math.sin(Math.PI * p) : 0, contact = moving ? Math.max(0, 1 - Math.min(p, 1 - p) / 0.16) : 0;
      lift = -air * h * (g === 'flutter' ? 0.24 : 0.17);
      sy = moving ? 1 - 0.14 * contact + 0.07 * air * (1 - contact) : 1 + breathe * 1.5; sx = 1 / Math.sqrt(sy);
      if (g === 'flutter' && moving) tilt = side ? -0.08 * air : 0;
      shadow = 1 - air * 0.35;
    } else if (g === 'waddle') {
      var ph = Math.sin(u * Math.PI * 2);
      tilt = moving ? ph * 0.15 : Math.sin(t * 1.6) * 0.02; lift = moving ? -Math.abs(ph) * h * 0.025 : 0; sy = 1 + breathe;
    } else if (g === 'slide') {
      var ph2 = Math.sin(u * Math.PI * 2);
      if (moving) { if (side) { sx = 1 + 0.08 * ph2; sy = 1 - 0.04 * ph2; } else { sy = 1 + 0.05 * ph2; sx = 1 - 0.03 * ph2; } } else sy = 1 + breathe;
    } else {
      /* walk and stride: two steps per square */
      var s = Math.sin(u * Math.PI * 2);
      sy = 1 + breathe;
      if (moving && o.legs3d) lift = -Math.abs(Math.cos(u * Math.PI * 2)) * h * 0.022;   /* the legs move in the picture itself; the body rides up at each passing step */
      else if (moving) {
        lift = -Math.abs(s) * h * 0.03;
        tilt = side ? s * 0.03 : s * 0.045;
        legs = g === 'stride' && side ? 'scissor' : 'halves';
        legLift = h * (g === 'stride' ? 0.045 : 0.06); shear = s * 0.5;
      }
    }
    var bob = o.bob || 0, fb = base + bob;
    /* shadow on the ground */
    ctx.fillStyle = 'rgba(0,0,0,' + (0.18 * Math.min(1, shadow + 0.15)).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse ? ctx.ellipse(cx, base - 2, w * 0.3 * shadow, 4 * shadow, 0, 0, 7) : ctx.arc(cx, base - 2, w * 0.3 * shadow, 0, 7); ctx.fill();
    if (!im) return;
    var r = legs ? raster(im, w, h) : null;
    ctx.save(); ctx.translate(cx, fb + lift); if (tilt) ctx.rotate(tilt); if (o.rot) ctx.rotate(o.rot); ctx.scale((o.face < 0 ? -1 : 1) * sx, sy);
    var flap = o.wings && g === 'fly' ? Math.sin(t * (moving ? 17 : 11)) : null;
    function wing(sd, far) {
      ctx.save(); ctx.fillStyle = far ? o.wings.line : o.wings.fill; ctx.strokeStyle = o.wings.line; ctx.lineWidth = 1.4;
      if (side) { ctx.translate(-w * 0.05, -h * 0.5); ctx.rotate(-0.25 - flap * 0.75 - (far ? 0.25 : 0)); ctx.beginPath(); ctx.ellipse(-w * 0.16, -h * 0.06, w * 0.23, h * 0.085, 0.5, 0, 7); }
      else { ctx.translate(sd * w * 0.12, -h * 0.5); ctx.rotate(sd * (-0.35 - flap * 0.6)); ctx.beginPath(); ctx.ellipse(sd * w * 0.2, 0, w * 0.22, h * 0.085, 0, 0, 7); }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.wings.tip; ctx.globalAlpha = 0.7; ctx.beginPath();
      if (side) ctx.ellipse(-w * 0.3, -h * 0.1, w * 0.07, h * 0.04, 0.5, 0, 7); else ctx.ellipse(sd * w * 0.34, 0, w * 0.06, h * 0.045, 0, 0, 7);
      ctx.fill(); ctx.restore();
    }
    if (flap !== null && ctx.ellipse) { if (side) wing(1, true); else { wing(-1); wing(1); } }
    if (!r) ctx.drawImage(fastIm(im, w, h), -w / 2, -h, w, h);
    else {
      var k = r.width / w, band = h * (o.gait === 'walk' && isLow(o) ? LEG.lowWalk : g === 'stride' ? LEG.stride : LEG.walk), top = h - band, bk = Math.round(top * k);
      ctx.drawImage(r, 0, 0, r.width, bk, -w / 2, -h, w, bk / k);                                     /* body */
      var s2 = Math.sin(u * Math.PI * 2), la = Math.max(0, s2) * legLift, lb = Math.max(0, -s2) * legLift, half = Math.round(r.width / 2);
      if (legs === 'halves') {
        ctx.drawImage(r, 0, bk, half, r.height - bk, -w / 2, -band - la, half / k, (r.height - bk) / k);
        ctx.drawImage(r, half, bk, r.width - half, r.height - bk, -w / 2 + half / k, -band - lb, (r.width - half) / k, (r.height - bk) / k);
      } else {
        /* scissor steps: back leg swings one way, front leg the other, pivoting at the hips */
        [-1, 1].forEach(function (d) {
          ctx.save(); ctx.translate(0, -band); ctx.transform(1, 0, d * shear * 0.9, 1, 0, 0);
          ctx.drawImage(r, 0, bk, r.width, r.height - bk, -w / 2, -(d > 0 ? la : lb) * 0.5, w, (r.height - bk) / k);
          ctx.restore();
        });
      }
    }
    if (flap !== null && side && ctx.ellipse) wing(1, false);
    ctx.restore();
    if (o.stink) stinkFx(cx, fb + lift - h * 0.8, w, t);
  }
  function isLow(o) { return !!o.low; }
  function petLow(p) { var sp = CRE.byId(p.sp) || {}; return !!(sp.low || sp.id === 'tadlet' || sp.id === 'axolittle'); }
  /* stink lines curl up and fade, and a couple of flies buzz around */
  function stinkFx(cx, y, w, t) {
    var ctx = W.ctx; ctx.save(); ctx.strokeStyle = '#7fc241'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var p = (t * 0.6 + i / 3) % 1, x = cx + (i - 1) * w * 0.34 + Math.sin(t * 2 + i * 2) * 2, yy = y + 8 - p * 20, sw = 3 + 1.6 * Math.sin(t * 7 + i * 1.7);
      ctx.globalAlpha = 0.9 * Math.sin(Math.PI * p);
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + sw, yy - 4, x, yy - 8); ctx.quadraticCurveTo(x - sw, yy - 12, x, yy - 16); ctx.stroke();
    }
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#2b2233';
    for (var f = 0; f < 2; f++) { var fa = t * (5 + f * 1.3) + f * 3; ctx.beginPath(); ctx.arc(cx + Math.cos(fa) * w * 0.42, y + 14 + Math.sin(fa * 1.7) * 7, 1.3, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function sprite(im, tx, ty, h, bob, face, rot, isAvatar) {
    var ctx = W.ctx, w = isAvatar ? h * 0.75 : h * 0.906;
    var cx = tx * T + T / 2, base = ty * T + T - 2;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse ? ctx.ellipse(cx, base - 2, w * 0.3, 4, 0, 0, 7) : ctx.arc(cx, base - 2, w * 0.3, 0, 7); ctx.fill();
    if (!im) return;
    ctx.save(); ctx.translate(cx, base + bob); if (rot) ctx.rotate(rot); if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(fastIm(im, w, h), -w / 2, -h, w, h);
    ctx.restore();
  }
  function petInBed(st) {
    var ctx = W.ctx, b = null; (W.furn || []).forEach(function (f) { if (f.kind === 'bed') b = f; }); if (!b) return;
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, hc = homeColors(), im = petImage(W.pid, 'asleep', false, 'down');
    if (im) ctx.drawImage(fastIm(im, 44, 48), x + w / 2 - 22, y + 2 + Math.sin(W.t * 1.6) * 0.8, 44, 48);
    ctx.fillStyle = hc.accent; rr(ctx, x + 6, y + 34, w - 12, h - 42, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; for (var q = 0; q < 3; q++) for (var r = 0; r < 2; r++) if ((q + r) % 2) ctx.fillRect(x + 6 + r * (w - 12) / 2, y + 34 + q * (h - 42) / 3, (w - 12) / 2, (h - 42) / 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 34, w - 12, 5);
    zzz(b.x + 0.6, b.y + 0.9);
  }
  /* not tucked in: it sleeps under the bed, just its back end sticking out */
  function petUnderBed() {
    var ctx = W.ctx, b = null; (W.furn || []).forEach(function (f) { if (f.kind === 'bed') b = f; }); if (!b) return;
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, im = petImage(W.pid, 'asleep', false, 'down');
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x + 4, y + h - 8, w - 8, 12, 5); ctx.fill();
    if (im) { ctx.save(); ctx.beginPath(); ctx.rect(x - 6, y + h - 2, w + 12, 40); ctx.clip(); ctx.drawImage(fastIm(im, 38, 42), x + w / 2 - 19, y + h - 24 + Math.sin(W.t * 1.6) * 0.8, 38, 42); ctx.restore(); }
    ctx.fillStyle = '#8a5a34'; rr(ctx, x + 2, y + h - 8, w - 4, 8, 3); ctx.fill();
    zzz(b.x + 1.3, b.y + b.h + 0.1);
  }
  /* hiding after a terrible bedtime: just two eyes in the dark under the bed, and a stink cloud drifting out */
  function petHiding() {
    var ctx = W.ctx, b = null; (W.furn || []).forEach(function (f) { if (f.kind === 'bed') b = f; }); if (!b) return;
    var x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T, cx = x + w / 2, ey = y + h + 3, t = W.t;
    ctx.fillStyle = 'rgba(10,8,18,.85)'; rr(ctx, x + 2, y + h - 10, w - 4, 20, 8); ctx.fill();
    var blink = (t % 4.2) > 4.05, look = Math.sin(t * 0.9) * 1.6;
    [-7, 7].forEach(function (dx) {
      if (blink) { ctx.strokeStyle = '#f4f0d8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx + dx - 4, ey); ctx.lineTo(cx + dx + 4, ey); ctx.stroke(); return; }
      ctx.fillStyle = '#f4f0d8'; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(cx + dx, ey, 4.2, 3.2, 0, 0, 7); else ctx.arc(cx + dx, ey, 3.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.arc(cx + dx + look, ey + 0.4, 1.8, 0, 7); ctx.fill();
    });
    stinkFx(cx - 10, y + h - 6, 40, t); stinkFx(cx + 14, y + h - 2, 34, t + 1.3);
    ctx.fillStyle = '#8a5a34'; rr(ctx, x + 2, y + h - 12, w - 4, 6, 3); ctx.fill();
  }
  /* night: dark all round, a little light where you stand, and CLOSED signs on the shop doors */
  function nightDark(pp) {
    var ctx = W.ctx, vw = W.cw / W.scale, vh = W.ch / W.scale, cx = pp.x * T + 16, cy = pp.y * T + 8;
    var gr = ctx.createRadialGradient(cx, cy, 18, cx, cy, W.region === 'home' ? 190 : 150);
    gr.addColorStop(0, 'rgba(12,16,48,0.3)'); gr.addColorStop(0.45, 'rgba(10,12,40,0.62)'); gr.addColorStop(1, W.region === 'home' ? 'rgba(6,8,30,0.8)' : 'rgba(4,6,24,0.86)');
    ctx.fillStyle = gr; ctx.fillRect(W.cam.x - 40, W.cam.y - 40, vw + 80, vh + 80);
    if (W.region === 'town') W.bld.forEach(function (b) {
      if (b.kind === 'house' || !b.door) return;
      var x = b.door.x * T + 16, y = b.door.y * T - 4;
      ctx.fillStyle = '#7a1f22'; rr(ctx, x - 20, y - 8, 40, 14, 4); ctx.fill();
      ctx.fillStyle = '#ffe6c8'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CLOSED', x, y - 1);
    });
    else if (W.region === 'home') { var lg = ctx.createRadialGradient(3 * T + 16, 2 * T, 4, 3 * T + 16, 2 * T, 44); lg.addColorStop(0, 'rgba(255,214,120,.35)'); lg.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = lg; ctx.fillRect(3 * T - 40, 2 * T - 44, 112, 88); }
  }
  function sparkles(cx, cy, rad, col) {
    var ctx = W.ctx; ctx.fillStyle = col;
    for (var i = 0; i < 3; i++) {
      var a = W.t * 1.5 + i * 2.1, tw = 0.5 + 0.5 * Math.sin(W.t * 4 + i);
      ctx.globalAlpha = 0.4 + 0.6 * tw; star(ctx, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.5, 3 + tw * 3, 1.3 + tw);
    }
    ctx.globalAlpha = 1;
  }
  function xMark(x, y) {
    var ctx = W.ctx, px = x * T + 16, py = y * T + 18;
    ctx.strokeStyle = '#b3262a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - 7, py - 7); ctx.lineTo(px + 7, py + 7); ctx.moveTo(px + 7, py - 7); ctx.lineTo(px - 7, py + 7); ctx.stroke();
  }
  function chest(x, y, open) {
    var ctx = W.ctx, px = x * T + 4, py = y * T + 8;
    ctx.fillStyle = '#8a5a2b'; rr(ctx, px, py + 8, 24, 16, 3); ctx.fill();
    ctx.fillStyle = open ? '#5a3a1a' : '#a8703a'; rr(ctx, px, open ? py - 2 : py + 2, 24, 9, 3); ctx.fill();
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(px + 10, py + 8, 4, 6);
    if (!open) sparkles(px + 12, py + 6, 16, '#ffe27a');
  }
  function zzz(tx, ty) { var ctx = W.ctx, x = tx * T + T - 2, y = ty * T - 30 - (W.t * 10 % 10); ctx.fillStyle = '#6b7fd6'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('z', x, y); ctx.font = 'bold 10px sans-serif'; ctx.fillText('z', x + 8, y - 10); }
  function trash(tx, ty, dump) {
    var ctx = W.ctx, cols = dump ? ['#7a5a3a', '#b0b0a0', '#e8453c', '#6fbf4f'] : ['#e4cc8e', '#f3dfa6', '#d9bf82', '#e4cc8e'];
    for (var i = 0; i < 4; i++) { var ph = (W.t * 2 + i * 0.25) % 1, x = tx * T + 16 + Math.sin(i * 2.1) * 20 * ph, y = ty * T - 6 - Math.sin(ph * Math.PI) * 26; ctx.fillStyle = cols[i]; ctx.fillRect(x, y, 5, 4); }
  }

  /* ================= rooms ================= */
  function openRoom(b) {
    var G = Pz().G, nt = nightInfo();
    var hd = hideInfo();
    if (hd && PET_PLACES[b.kind]) { say(nmOf() + ' is hiding under your bed after a terrible bedtime, so no ' + (b.kind === 'park' ? 'park' : b.kind === 'cafe' ? 'café' : 'adventures') + ' until ' + hd.back + '.', 3500); bump(b); return; }
    if (nt && !(b.kind === 'house' && b.owner === W.pid)) {
      say(b.kind === 'house' ? 'Everyone at ' + b.title + '’s house is asleep.' : (b.title || 'It') + ' is closed for the night. It opens at ' + nt.wake + '.', 3000); bump(b); return;
    }
    if (b.kind === 'house' && b.owner !== W.pid && !Pz().doc(b.owner).avatar && !Pz().doc(b.owner).pet) { say('Nobody is home at ' + b.title + '’s house yet.', 2500); bump(b); return; }
    if (b.kind === 'house') { enterHome(b); return; }
    G.room = { kind: b.kind, owner: b.owner, title: b.title, door: b.door, tab: 'room' };
    W.held = null; W.P.path = [];
    renderRoom(true);
    W.run = false;
  }
  /* ---- the walk-around house ---- */
  function enterHome(b) {
    var G = Pz().G, mine = b.owner === W.pid, d = Pz().doc(b.owner), st = Pz().state(W.pid);
    G.room = { kind: 'house', owner: b.owner, title: mine ? 'Your house' : b.title + '’s house', door: b.door, tab: 'room', walk: true, panel: null };
    G.game = null; W.held = null;
    W.townDoor = b.door; W.homeOwner = b.owner;
    var m = load('home');
    placeAt(m.start.x, m.start.y); W.P.dir = 'up';
    residents();
    say(mine ? (st.pet && st.pet.final ? st.pet.name + ' is fully grown! Tap Move in.' : 'Home sweet home! Walk to the tub for a bath or the bed to tuck in.') : 'Welcome to ' + b.title + '’s house!' + (d.house && d.house.length ? ' Their grown pets live here.' : ''), 3500);
    renderRoom(); hud(); start();
  }
  function leaveHome() {
    var G = Pz().G, door = W.townDoor;
    G.room = null; G.game = null; renderRoom(); closeCard();
    W.residents = []; load('town'); W.key = peopleKey();
    if (door) placeAt(door.x, door.y + 1); else placeAtHome();
    hud(); start();
  }
  /* grown pets that moved in (and, at a friend's house, their pet) wander about */
  function resKey() { var d = Pz().doc(W.homeOwner); return (d.house || []).length + '|' + (d.pet ? d.pet.sp + (d.pet.stage || 0) : ''); }
  function residents() {
    W.resKey = resKey();
    var owner = W.homeOwner, d = Pz().doc(owner), list = (d.house || []).slice(-6).map(function (x) { return { sp: x.sp, stage: 2, pal: x.pal || 0, name: x.name, retired: x.retired }; });
    if (owner !== W.pid && d.pet) list.unshift({ sp: d.pet.sp, stage: d.pet.stage || 0, pal: d.pet.pal || 0, name: d.pet.name, wear: d.pet.wear, dye: d.pet.dye, current: true });
    var free = [];
    for (var y = 3; y < W.mh - 2; y++) for (var x = 2; x < W.mw - 2; x++) if (walk(x, y) && !(x === W.P.x && y === W.P.y) && !(x === W.pet.x && y === W.pet.y)) free.push([x, y]);
    W.residents = list.map(function (p, i) {
      var s = free.splice(Math.floor(Math.random() * free.length), 1)[0] || [3 + i, 6];
      return { p: p, x: s[0], y: s[1], tx: s[0], ty: s[1], fx: s[0], fy: s[1], moving: false, face: Math.random() < 0.5 ? 1 : -1, dir: 'down', wait: 0.5 + Math.random() * 3 };
    });
  }
  function taken(x, y, me) {
    if ((W.P.x === x && W.P.y === y) || (W.P.tx === x && W.P.ty === y)) return true;
    if (W.pet && ((W.pet.x === x && W.pet.y === y) || (W.pet.tx === x && W.pet.ty === y))) return true;
    return (W.residents || []).some(function (r) { return r !== me && ((r.x === x && r.y === y) || (r.tx === x && r.ty === y)); });
  }
  function residentsStep(dt) {
    (W.residents || []).forEach(function (r) {
      if (r.moving) { moveActor(r, 2.4, dt); return; }
      r.wait -= dt; if (r.wait > 0) return;
      r.wait = 1.2 + Math.random() * 3.5;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < 4; i++) { var nx = r.x + dirs[i][0], ny = r.y + dirs[i][1]; if (walk(nx, ny) && !taken(nx, ny, r)) { stepTo(r, nx, ny); break; } }
    });
  }
  function residentImage(r) {
    var p = r.p, v = petView(p, r.dir), lf = v ? legFrame(p, r, 'happy') : null, key = 'res|' + p.sp + p.stage + p.pal + '|' + (p.wear || '') + (p.dye || '') + '|' + v;
    var im = img(key + '|' + (lf == null ? '' : lf), function () { return Pz().petSvg(p, 'happy', {}, { view: v || undefined, noStink: true, frame: lf }); });
    if (im) { petLast[key] = im; return im; }
    return petLast[key] || null;
  }
  /* what the action button does next to each piece of furniture */
  function homeAction() {
    var P = W.P, mine = W.homeOwner === W.pid, st = Pz().state(W.pid), f = null;
    if (P.moving) return null;
    if (mine && st.pet && st.pet.final) return { kind: 'final', label: 'Move ' + st.pet.name + ' in', o: W.pet };
    /* several pieces can be next to you (the mirror sits between the nightstand and the wardrobe): the one you tapped wins,
       then any piece that does something (a nightstand used to hide the mirror) */
    var aim = W.aim, best = null, first = null;
    (W.furn || []).forEach(function (o) {
      var dx = Math.max(o.x - P.x, 0, P.x - (o.x + o.w - 1)), dy = Math.max(o.y - P.y, 0, P.y - (o.y + o.h - 1));
      if (dx + dy !== 1) return;
      var a = furnAct(o, mine, st); if (!a) return;
      a.o = o;   /* its button floats over this piece */
      if (aim && aim.x >= o.x && aim.x < o.x + o.w && aim.y >= o.y && aim.y < o.y + o.h) best = a;
      else if (!first) first = a;
    });
    return best || first;
  }
  function furnAct(f, mine, st) {
    if (f.kind === 'egg') return { kind: 'egg', label: 'Look at the egg' };
    if (!mine) return null;
    if (hideInfo()) { if (f.kind === 'bed') return { kind: 'sleep', label: 'Hiding' }; if (f.kind === 'fridge' || f.kind === 'table' || f.kind === 'tub' || f.kind === 'toys') return null; }
    if (nightInfo()) { if (f.kind === 'bed') return { kind: 'sleep', label: 'Shh, asleep' }; if (f.kind === 'fridge' || f.kind === 'table' || f.kind === 'tub' || f.kind === 'toys') return null; }
    if (f.kind === 'fridge' || f.kind === 'table') return st.pet ? { kind: 'feed', label: 'Feed ' + st.pet.name } : null;
    return { bed: { kind: 'sleep', label: 'Tuck in' }, tub: { kind: 'bath', label: 'Bath' }, wardrobe: { kind: 'wardrobe', label: 'Wardrobe' }, shelf: { kind: 'book', label: 'Collection' }, mirror: { kind: 'look', label: 'Change my look' }, toys: { kind: 'toys', label: 'Toys' } }[f.kind] || null;
  }
  function homeDo(a) {
    var G = Pz().G, st = Pz().state(W.pid), w = st.wallet, nm = st.pet ? st.pet.name : 'your pet', nt = nightInfo();
    var hd = hideInfo();
    if (hd && (a.kind === 'feed' || a.kind === 'sleep' || a.kind === 'bath' || a.kind === 'toys' || a.kind === 'final')) {
      say(nm + ' is hiding under the bed after a terrible bedtime and won’t come out until ' + hd.back + '. Have a better bedtime tonight!', 4000); return;
    }
    if (nt && (a.kind === 'feed' || a.kind === 'sleep' || a.kind === 'bath' || a.kind === 'toys' || a.kind === 'final')) {
      say(nt.under ? 'Shh! ' + nm + ' is asleep under the bed. Tuck it in before ' + nt.sleep + ' tomorrow so it sleeps in bed.' : 'Shh! ' + nm + ' is fast asleep. Pets wake up at ' + nt.wake + '.', 3500); return;
    }
    if (a.kind === 'feed') {
      if (!w.meals) { say('The fridge is empty. Buy meals at the Store, or take ' + nm + ' to the Pet Café.', 3500); return; }
      if (!(window.Games && Pz().startFeed)) { Pz().feed(W.pid).then(function () { petMeal(2, 8); hud(); }, function () {}); return; }
      if (!Pz().startFeed(W.pid)) return;   /* the meal close-up opens below */
    }
    else if (a.kind === 'sleep') {
      var bt = bedTime(); if (bt) { say('Shh! ' + nm + ' is sleeping. ' + Math.max(1, Math.ceil((bt - Date.now()) / 60000)) + ' more minute' + (bt - Date.now() > 60000 ? 's' : '') + '.', 3000); return; }
      if (!w.rest) { say('No tuck-ins left' + (w.restPart ? ' (' + w.restPart + '% toward the next)' : '') + '. Chores tagged tuck-in earn them, or buy toothpaste at the Store.', 3000); return; } G.game = { kind: 'sleep', mood: 'lazy', id: Date.now() }; }
    else if (a.kind === 'bath') { if (!w.kits) { say('No bath kits. Buy one at the Store, then come back for a bath.', 3000); return; } G.game = { kind: 'bath', mood: 'ok', id: Date.now() }; }
    else if (a.kind === 'wardrobe' || a.kind === 'book' || a.kind === 'final') { G.room.panel = a.kind; }
    else if (a.kind === 'look') { G.creator = true; G.dirtyAvatar = null; unmount(); C().go(); return; }
    else if (a.kind === 'toys') { var n = A().toysIn(W.pid).length; say(n ? nm + ' loves the toys you found: ' + n + ' so far!' : 'Toys you find on adventures go in the toy box.', 3000); return; }
    else if (a.kind === 'egg') { say(W.homeOwner === W.pid ? 'Your rare egg! It hatches when ' + nm + ' is fully grown and moves in.' : 'A rare egg, found on an adventure when the whole house was clean.', 3500); return; }
    W.held = null; W.P.path = []; renderRoom(true); W.run = false;
  }
  function bump(b) { var P = W.P, ny = b && b.kind === 'gate' ? P.y - 1 : P.y + 1; if (walk(P.x, ny)) { P.path = []; playerStep(P.x, ny); } }
  function renderRoom(force) {
    var G = Pz().G, el = W.root && W.root.querySelector('#room');
    if (!el) return;
    if (!overlayOn()) { el.hidden = true; el.innerHTML = ''; el.setAttribute('data-game', ''); W.root.className = 'world' + (away() ? ' adv' : ''); return; }
    var gid = G.game ? String(G.game.id) : '';
    if (!force && gid && el.getAttribute('data-game') === gid) return;
    el.hidden = false;
    el.setAttribute('data-game', gid);
    W.root.className = 'world in-room' + (away() ? ' adv' : '');
    el.innerHTML = '<div class="room-inner">' + Pz().roomHtml(G.room, W.pid) + '</div>';
    if (G.game) Pz().mountGame();
  }
  /* the DOM room covers the map for shops, and in the walk-around house only for a mini-game or a panel */
  function overlayOn() { var G = Pz().G; return !!(G.room && (!G.room.walk || G.game || G.room.panel)); }
  function closeRoom() {
    var G = Pz().G, room = G.room, door = room && room.door;
    if (room && room.walk) { room.panel = null; G.game = null; if (room.kind === 'meal') G.room = null; renderRoom(); hud(); start(); return; }
    G.room = null; G.game = null;
    renderRoom();
    if (door && W.P) {
      var P = W.P, oy = room.kind === 'gate' ? door.y - 1 : door.y + 1;
      P.x = P.tx = door.x; P.y = P.ty = oy; P.moving = false; P.path = [];
      var pet = W.pet; if (pet.mode !== 'dumpster') { pet.x = pet.tx = door.x + (walk(door.x + 1, oy) ? 1 : -1); pet.y = pet.ty = oy; pet.moving = false; pet.queue = []; }
    }
    unstick(); hud(); start();
  }

  /* ================= HUD ================= */
  function hud() {
    var el = W.root && W.root.querySelector('.hud-top'); if (!el) return;
    var st = Pz().state(W.pid), w = st.wallet, p = st.pet;
    if (!p) { el.innerHTML = ''; return; }
    setTimeout(function () { if (el.offsetHeight) W.hudH = el.offsetHeight + 10; }, 0);
    if (W.root.classList) { if (away()) W.root.classList.add('adv'); else W.root.classList.remove('adv'); }
    if (away()) {   /* adventures get one slim line (no need bars, no help text) so more of the game shows */
      var found = ((A().exp() || {}).found || []).length;
      el.innerHTML = '<div class="hud-line"><span class="hud-adv">' + (W.region === 'ship' && W.ship ? '<b>Lido Deck</b> &middot; hands ' + W.ship.carry.length + '/' + capacity() + (W.ship.carry.length ? ' (' + W.ship.carry.join(', ') + ')' : '') + ' &middot; <b>' + A().tickets(W.pid) + '</b> tickets'
        : '<b>Sunny Beach</b> &middot; found ' + found + ' thing' + (found === 1 ? '' : 's')) + '</span>' +
        '<span class="hud-coins hud-timer mono"></span><button type="button" class="btn small leave-btn" data-wact="leave">Leave</button></div>';
    } else
    el.innerHTML = '<div class="hud-line"><strong>' + C().esc(p.name) + '</strong> <span class="lvl mono">Lv ' + (p.level || 0) + '</span>' +
      (!away() ? '<span class="hud-coins">' + Pz().coin('food') + '<b class="mono">' + w.food + '</b>' + Pz().coin('care') + '<b class="mono">' + w.care + '</b>' + Pz().coin('pts') + '<b class="mono">' + w.pts + '</b></span>' : '<span class="hud-coins hud-timer mono"></span><button type="button" class="btn small leave-btn" data-wact="leave">Leave</button>') + '</div>' +
      '<div class="hud-needs">' + Pz().NEEDS.map(function (x) {
        var v = st.needs[x.k], cls = v >= Pz().GOOD ? 'full' : v < Pz().LOW ? 'low' : '';
        return '<span class="hn ' + cls + '"><small>' + x.label + '</small><span class="bar"><i style="width:' + v + '%"></i></span></span>';
      }).join('') + '</div>' +
      (!away() && hideInfo() ? '<div class="hud-bag note"><b>' + C().esc(p.name) + ' is hiding</b> under your bed after a terrible bedtime. No playing with it until ' + hideInfo().back + '.</div>'
        : !away() && nightInfo() ? '<div class="hud-bag note"><b>Night time.</b> ' + C().esc(p.name) + ' is asleep ' + (nightInfo().tucked ? 'in bed' : 'under the bed') + ' until ' + nightInfo().wake + '. Shops are closed.</div>'
        : !away() ? '<div class="hud-bag note">Bag: ' + w.meals + ' meal &middot; ' + w.kits + ' bath kit &middot; ' + w.rest + ' tuck-in' + Pz().partBar(w, 'rest') + ' &middot; ' + w.energy + ' play' + Pz().partBar(w, 'energy') + (w.balls ? ' &middot; ' + w.balls + ' ball' + (w.balls > 1 ? 's' : '') : '') +
        (st.doc.egg ? ' &middot; <b class="egg-tag">Rare egg at home!</b>' : '') + (bedTime() ? ' &middot; <b>' + C().esc(p.name) + ' is asleep at home</b>' : '') + (p.final ? ' &middot; <b>Fully grown! Go home.</b>' : p.leveledOn === C().today() ? ' &middot; Leveled up today' : '') + '</div>'
        : W.region === 'ship' && W.ship ? '<div class="hud-bag note">Lido Deck &middot; hands ' + W.ship.carry.length + '/' + capacity() + (W.ship.carry.length ? ' (' + W.ship.carry.join(', ') + ')' : '') + ' &middot; <b>' + A().tickets(W.pid) + '</b> tickets' + (capacity() > 3 ? '' : ' &middot; a healthy pet carries 1 more') + '</div>'
        : '<div class="hud-bag note">Sunny Beach &middot; found ' + ((A().exp() || {}).found || []).length + ' thing' + (((A().exp() || {}).found || []).length === 1 ? '' : 's') + ' so far</div>');
    var fb = W.root.querySelector('.feed-btn');
    if (fb) { fb.hidden = away() || !!nightInfo() || !!hideInfo(); fb.disabled = w.meals < 1; fb.innerHTML = 'Feed<small>' + w.meals + ' meal</small>'; }
    var mood = W.root.querySelector('.hud-mood');
    if (mood) mood.textContent = away() ? '' : hideInfo() ? 'Hiding' : nightInfo() ? 'Asleep' : st.starving ? 'Starving! Buy food at the Store' : st.mood.label;
    if (mood) mood.hidden = !mood.textContent;
    actionHud();
    if (away() && A().exp()) timerHud(A().exp());
  }
  function actionHud() {
    var b = W.root && W.root.querySelector('.act-btn'); if (!b) return;
    var a = currentAction(), fl = W.root.querySelector('.float-act');
    if (fl && (away() || W.region === 'home') && (!a || a.o)) {   /* the button floats right by the thing it works on (chest, fishing spot, desk, bed, tub, wardrobe...) */
      var show = !!(a && AUTO.indexOf(a.kind) < 0 && !W.fish);
      if (W.region === 'home' && a) show = true;   /* nothing happens by itself in the house */
      var info = a && (a.kind === 'full' || /^(Hiding|Shh, asleep)$/.test(a.label));   /* labels, not real actions */
      b.hidden = true; fl.hidden = !show; W.floatAt = show ? a.o : null;
      if (show) { if (fl.textContent !== a.label) fl.textContent = a.label; fl.className = 'float-act' + (info ? ' muted' : '') + (fl.classList && fl.classList.contains('below') ? ' below' : ''); placeFloat(); }
      return;
    }
    if (fl) { fl.hidden = true; W.floatAt = null; }
    b.hidden = !a; if (a) b.textContent = a.label;
  }
  function placeFloat() {
    var fl = W.floatAt && W.root && W.root.querySelector('.float-act'); if (!fl || !W.cam) return;
    if (W.P && (W.P.moving || W.P.path.length)) { fl.hidden = true; W.floatAt = null; return; }   /* walking off: it comes back where the kid stops */
    /* above the thing, or below it when the kid stands on the square above (so the button never covers the kid) */
    var o = W.floatAt, op = pos(o), ow = o.w || 1, oh = o.h || 1;
    var below = W.P && W.P.y < op.y, x = ((op.x + (ow - 1) / 2 + 0.5) * T - W.cam.x) * W.scale, y = ((below ? op.y + oh : op.y) * T + (below ? 2 : -4) - W.cam.y) * W.scale;
    if (!below) y = Math.max(y, (W.hudH || 50) + 46);   /* never under the top bar */
    if (fl.classList) { if (below) fl.classList.add('below'); else fl.classList.remove('below'); }
    fl.style.left = Math.round(x) + 'px'; fl.style.top = Math.round(y) + 'px';
  }
  function timerHud(e) {
    var el = W.root && W.root.querySelector('.hud-timer'); if (!el) return;
    var left = Math.max(0, Math.round((e.endsAt - Date.now()) / 1000)), m = Math.floor(left / 60), s = left % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s + ' left';
  }
  function updateMsg() { var el = W.root && W.root.querySelector('.wmsg'); if (el) { el.textContent = W.msg; el.hidden = !W.msg; } }

  /* ================= mount ================= */
  function peopleKey() { return C().activePeople().map(function (p) { return p.id + ':' + p.name + ':' + p.order + ':' + (C().isAdult(p.id) ? 1 : 0); }).join('|') + '|' + C().bankName(); }
  /* grown-ups standing at their spot in town */
  function hostSpots() {
    if (W.region !== 'town' || nightInfo()) return [];
    var out = [], used = {};
    ['bank', 'store', 'prizes', 'park', 'gate', 'square'].forEach(function (kind) {
      Pz().hosts(kind).forEach(function (h, i) {
        var b = null; W.bld.forEach(function (x) { if (x.kind === kind) b = x; });
        var x, y;
        if (kind === 'square') { x = 16 + i; y = 13; }
        else if (!b) return;
        else if (kind === 'gate') { x = b.x + b.w + i; y = b.y - 1; }
        else { x = b.door.x + 1 + i; y = b.door.y + 1; }
        if (used[x + ',' + y]) return; used[x + ',' + y] = 1;
        out.push({ id: h.id, name: h.name, avatar: h.avatar, kind: kind, x: x, y: y });
      });
    });
    return out;
  }
  var greeted = {};
  function greetHosts() {
    var P = W.P;
    hostSpots().forEach(function (h) {
      if (Math.abs(h.x - P.x) + Math.abs(h.y - P.y) > 1 || Date.now() - (greeted[h.id] || 0) < 30000) return;
      greeted[h.id] = Date.now();
      var nm = C().pname(W.pid), line = h.kind === 'bank' ? 'Come on in, ' + nm + '! Your account is inside.' : h.kind === 'store' ? 'Hi ' + nm + '! Need a meal or a bath kit?' : h.kind === 'prizes' ? 'Got tickets, ' + nm + '? Come see the prizes!' : h.kind === 'park' ? 'Want to play fetch, ' + nm + '?' : h.kind === 'gate' ? 'Big jobs done, ' + nm + '? Then adventure awaits!' : 'Hi ' + nm + '! How is your pet doing?';
      say(h.name + ': ' + line, 3000);
    });
  }
  function show(view, pid) {
    var key = peopleKey();
    if (W.region === 'town' && (key !== W.key || !W.map)) { load('town'); W.key = key; W.P = null; }
    if (W.pid !== pid || !W.P) { if (W.region !== 'town') { if (away()) A().saveTime(true); Pz().G.room = null; load('town'); W.key = key; } W.pid = pid; placeAtHome(); W.imgs = {}; }
    var root = view.querySelector('#world');
    if (!root) {
      view.innerHTML = '<div class="world" id="world"><canvas class="wcanvas" aria-label="Map. Use the arrows to walk."></canvas>' +
        '<div class="hud-top"></div><div class="wmsg" hidden></div>' +
        '<div class="hud-act"><span class="hud-mood"></span><button type="button" class="act-btn" data-wact="act" hidden>Dig</button><button type="button" class="feed-btn" data-pact="feed">Feed</button></div>' +
        '<button type="button" class="float-act" data-wact="act" hidden></button>' +
        '<div class="fishing" hidden></div><div class="fishing prizes" hidden></div>' +
        '<div class="pcard-wrap" data-wact="closeCard" hidden></div><div id="room" class="room-overlay" hidden></div></div>' +
        '<p class="note town-help">Tap where you want to go, or hold and drag to keep walking. Tap a door to go in, tap furniture to use it, and tap a pet to see how it’s doing. The Adventure Gate at the bottom of town opens when you have an Adventure Pass.</p>';
      root = view.querySelector('#world');
      W.root = root; W.cv = root.querySelector('canvas'); W.ctx = W.cv.getContext('2d');
      bindInput();
      size();
    } else { W.root = root; if (!W.cv) { W.cv = root.querySelector('canvas'); W.ctx = W.cv.getContext('2d'); } }
    if (W.region === 'home' && !Pz().G.room) {   /* back in the house after moving a grown pet in (it now wanders here) or a trip to the creator */
      var mine = W.homeOwner === W.pid, who = C().person(W.homeOwner);
      Pz().G.room = { kind: 'house', owner: W.homeOwner, title: mine ? 'Your house' : (who ? who.name : '') + '’s house', door: W.townDoor, tab: 'room', walk: true, panel: null };
      residents();
    } else if (W.region === 'home' && W.resKey !== resKey()) residents();
    hud(); updateMsg(); renderRoom();
    if (nightInfo() && (overlayOn() || away() || (W.region === 'home' && W.homeOwner !== W.pid))) { nightCheck(); return; }
    if (hideInfo() && (away() || (Pz().G.room && !Pz().G.room.walk && PET_PLACES[Pz().G.room.kind]) || Pz().G.game)) { nightCheck(); return; }
    if (overlayOn()) W.run = false; else { unstick(); start(); }
  }
  function size() {
    if (!W.cv) return;
    var cw = W.root.clientWidth || 320, vh = window.innerHeight || 640;
    var ch = Math.max(280, Math.min(Math.round(cw * (away() ? 1.75 : 1.35)), vh - 190));   /* adventures have no help text below, so the map gets that room */
    W.dpr = Math.min(2, window.devicePixelRatio || 1);
    W.cw = cw; W.ch = ch;
    W.cv.style.height = ch + 'px';
    W.cv.width = Math.round(cw * W.dpr); W.cv.height = Math.round(ch * W.dpr);
    W.baseScale = W.scale = Math.min(2.2, cw / (10.5 * T));
    W.root.style.height = ch + 'px';
  }
  function away() { return W.region === 'beach' || W.region === 'ship'; }
  function unmount() { if (away()) A().saveTime(false); W.run = false; W.root = null; W.cv = null; W.ctx = null; }
  var bound = false;
  function bindInput() {
    if (bound) return; bound = true;
    /* tap where to go; hold and drag to steer (the target follows your finger, and keeps going while the map scrolls) */
    function at(e) { var r = W.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / W.scale + W.cam.x, y: (e.clientY - r.top) / W.scale + W.cam.y }; }
    document.addEventListener('pointerdown', function (e) {
      if (W.cv && e.target === W.cv && W.P && !W.run && !overlayOn()) { unstick(); start(); }   /* never leave a tap on an open map unanswered */
      if (!W.cv || e.target !== W.cv || !W.cam || !W.P || !W.run) return;
      if (e.cancelable) e.preventDefault();
      try { W.cv.setPointerCapture(e.pointerId); } catch (er) {}
      var w = at(e);
      W.steer = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: false, pet: petAt(w.x, w.y), last: 0, tile: '' };
      if (!W.steer.pet) steerTo(w.x, w.y, false);
    });
    document.addEventListener('pointermove', function (e) {
      var s = W.steer; if (!s || e.pointerId !== s.id || !W.cv) return;
      s.cx = e.clientX; s.cy = e.clientY;
      if (Math.abs(e.clientX - s.x0) + Math.abs(e.clientY - s.y0) > 12) { s.moved = true; s.pet = null; }
      if (s.moved) { var w = at(e); steerTo(w.x, w.y, false); }
    });
    function lift(e) {
      var s = W.steer; if (!s || e.pointerId !== s.id) return;
      W.steer = null;
      if (!W.cv || !W.cam || s.moved || Date.now() - s.t0 > 500) return;
      var w = at(e);
      if (s.pet) openCard(s.pet); else steerTo(w.x, w.y, true);
    }
    document.addEventListener('pointerup', lift); document.addEventListener('pointercancel', function (e) { if (W.steer && e.pointerId === W.steer.id) W.steer = null; });
    document.addEventListener('keydown', function (e) {
      if (!W.run || !W.P) return;
      if ((e.keyCode === 32 || e.keyCode === 13) && currentAction()) { e.preventDefault(); doAction(); return; }
      var k = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 65: 'left', 87: 'up', 68: 'right', 83: 'down' }[e.keyCode];
      if (!k || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName)) return;
      e.preventDefault(); W.held = k; W.P.path = []; if (!W.P.moving) playerTryDir(k);
    });
    document.addEventListener('keyup', function () { W.held = null; });
    document.addEventListener('click', function (e) {
      var wb = e.target.closest ? e.target.closest('[data-wact]') : null;
      if (wb && W.root && W.root.contains(wb)) {
        var a = wb.getAttribute('data-wact');
        if (a === 'closeCard') { if (wb === e.target || !wb.classList.contains('pcard-wrap')) closeCard(); return; }
        if (a === 'act') doAction(); else if (a === 'reel') reel(); else if (a === 'stopFish') stopFish(); else if (a === 'leave') leaveRegion(); else if (a === 'prize') buyPrize(wb.getAttribute('data-id')); else if (a === 'closePrizes') closePrizes();
        return;
      }
    });
    window.addEventListener('resize', function () { if (W.cv && document.body.contains(W.cv)) size(); });
  }
  /* walk to a map point. A building takes you to its door; furniture, stations, chests and such take you next to them,
     and a tap (not a drag) uses them when you get there */
  /* if a walker ends up on a square it can't stand on (or the map changed under it), move it to the nearest one it can */
  function unstick() {
    var moved = false;
    [W.P, W.pet].forEach(function (a) {
      if (!a || !W.map || walk(a.x, a.y, true)) return;
      moved = true;
      var best = null, bd = 1e9;
      for (var y = 0; y < W.mh; y++) for (var x = 0; x < W.mw; x++) if (walk(x, y)) { var d = Math.abs(x - a.x) + Math.abs(y - a.y); if (d < bd) { bd = d; best = [x, y]; } }
      if (best) { a.x = a.tx = a.fx = best[0]; a.y = a.ty = a.fy = best[1]; a.moving = false; if (a.path) a.path = []; if (a.queue) a.queue = []; }
    });
    if (moved) { W.steer = null; W.held = null; }
  }
  function steerTo(wx, wy, tap) {
    var tx = Math.floor(wx / T), ty = Math.floor(wy / T), P = W.P, b = buildingAt(tx, ty), key = tx + ',' + ty;
    if (W.steer && !tap) { if (W.steer.tile === key && Date.now() - W.steer.last < 600) return; W.steer.tile = key; W.steer.last = Date.now(); }
    if (b) { tx = b.door.x; ty = b.door.y; }
    var sx = P.moving ? P.tx : P.x, sy = P.moving ? P.ty : P.y, path = bfs(sx, sy, tx, ty, true), thing = false;
    if (!path && !walk(tx, ty, true)) {
      /* something you can't stand on: stand beside the whole piece (a tub or a counter is more than one square) */
      thing = true;
      var fp = footprint(tx, ty), cand = [];
      for (var yy = fp.y - 1; yy <= fp.y + fp.h; yy++) for (var xx = fp.x - 1; xx <= fp.x + fp.w; xx++) {
        var side = (xx === fp.x - 1 || xx === fp.x + fp.w) !== (yy === fp.y - 1 || yy === fp.y + fp.h);   /* edge squares, not corners */
        if (side && walk(xx, yy)) cand.push([xx, yy]);
      }
      cand.forEach(function (c) { var p2 = (sx === c[0] && sy === c[1]) ? [] : bfs(sx, sy, c[0], c[1], false); if (p2 && (!path || p2.length < path.length)) path = p2; });
    }
    if (!path) return;
    W.aim = tap ? { x: tx, y: ty } : null;
    P.path = path; P.onArrive = tap && (thing || objAt(W.obj ? W.obj.digs : [], tx, ty) || (W.fishAt && W.fishAt.x === tx && W.fishAt.y === ty)) ? { x: tx, y: ty } : null;
    if (!P.moving) arrived(P);
  }
  function footprint(x, y) {
    var hit = null;
    (W.furn || []).concat(W.stations || []).forEach(function (f) { var w = f.w || 1, h = f.h || 1; if (!hit && x >= f.x && x < f.x + w && y >= f.y && y < f.y + h) hit = { x: f.x, y: f.y, w: w, h: h }; });
    return hit || { x: x, y: y, w: 1, h: 1 };
  }
  function steerHeld() {
    var s = W.steer; if (!s || s.pet || !W.cv || !W.cam) return;
    var r = W.cv.getBoundingClientRect(); steerTo((s.cx - r.left) / W.scale + W.cam.x, (s.cy - r.top) / W.scale + W.cam.y, false);
  }
  /* tap a pet to see its card */
  function petAt(wx, wy) {
    var c = [], st = Pz().state(W.pid);
    if (st.pet && W.pet && !(W.pet.mode === 'bed' && !W.pet.atBed)) c.push({ a: pos(W.pet), h: 54, o: { owner: W.pid }, fly: petGait(st.pet) === 'fly' });
    if (W.region === 'home') (W.residents || []).forEach(function (r) { c.push({ a: pos(r), h: r.p.current ? 52 : 46, o: r.p.current ? { owner: W.homeOwner } : { owner: W.homeOwner, grown: r.p }, fly: petGait(r.p) === 'fly' }); });
    if (W.region === 'town') W.bld.forEach(function (b) { if (b.kind === 'house' && b.owner !== W.pid && Pz().doc(b.owner).pet) c.push({ a: { x: b.door.x + 2, y: b.door.y + 1 }, h: 48, o: { owner: b.owner } }); });
    /* a door, building or piece of furniture behind a pet wins over the top of the pet that overlaps it */
    var tx = Math.floor(wx / T), ty = Math.floor(wy / T), behind = buildingAt(tx, ty) || !walk(tx, ty, false);
    for (var i = 0; i < c.length; i++) {
      var k = c[i], cx = k.a.x * T + 16, base = k.a.y * T + T - 2, top = base - k.h * 0.95 - (k.fly ? k.h * 0.26 : 0);
      if (behind && ty < Math.floor(k.a.y + 0.5)) continue;
      if (Math.abs(wx - cx) < k.h * 0.4 && wy <= base + 3 && wy >= top) return k.o;
    }
    return null;
  }
  function openCard(o) { var el = W.root && W.root.querySelector('.pcard-wrap'); if (!el) return; el.innerHTML = Pz().petCardHtml(o); el.hidden = !el.innerHTML; W.held = null; }
  function closeCard() { var el = W.root && W.root.querySelector('.pcard-wrap'); if (el) { el.hidden = true; el.innerHTML = ''; } }
  /* birds flap real wings when they fly (their 3D wings are folded) */
  function petWings(p) {
    var sp = CRE.byId(p.sp) || {}; if (!(sp.family === 'bird' || sp.id === 'phoenix') || sp.id === 'waddles' || !p.stage) return null;
    var pal = (sp.palettes || [])[p.pal || 0] || {}, dp = p.dye && A() ? A().dyePal(p.dye) : null; if (dp) pal = dp;
    return { fill: pal.main || '#e45757', line: pal.dark || '#7a2a2a', tip: pal.accent || pal.light || '#ffffff' };
  }
  function petMeal(x, y) { var pet = W.pet; if (!pet) return; var q = bfs(pet.x, pet.y, x, y) || []; if (taken(x, y, null) && !(pet.x === x && pet.y === y)) q = []; pet.queue = q; pet.mode = 'meal'; }
  function petEats() { var pet = W.pet; if (!pet) return; pet.mode = 'eat'; pet.until = Date.now() + 1400; pet.queue = []; say('Yum!', 1500); }
  window.World = { show: show, unmount: unmount, closeRoom: closeRoom, petEats: petEats, enterRegion: enterRegion, leaveRegion: leaveRegion, W: W };
})();
