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
  var GRASS = 0, PATH = 1, TREE = 2, WATER = 3, FLOWER = 4, SOLID = 6, DOOR = 7, SAND = 8, SWIM = 9, VINE = 10, CAVE = 11, ROCK = 12, PIER = 13, EXIT = 14, WET = 15, PALM = 16, DECK = 17, RAIL = 18, POOL = 19, TABLE = 20, CHAIR = 21, COUNTER = 22;
  var ROOF = ['#c2571a', '#127a6e', '#6d3fcf', '#c0306f', '#2956c9', '#55801a', '#b3262a'];
  var HOUSE_SPOTS = [[2, 8], [7, 8], [18, 8], [23, 8], [18, 14], [23, 14], [2, 20], [7, 20], [18, 20], [23, 20]];
  var ABIL = { Fire: ['light'], Water: ['swim'], Leaf: ['climb'], Cosmic: ['light', 'swim', 'climb'] };
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
    set(26, 4, SOLID); set(26, 5, SOLID);
    building('park', 2, 14, 10, 4, 4, { title: 'Park' });
    building('gate', 13, 25, 4, 1, 1, { title: 'Adventure Gate' });
    set(15, 25, DOOR);
    people.slice(0, HOUSE_SPOTS.length).forEach(function (p, i) {
      var s = HOUSE_SPOTS[i];
      building('house', s[0], s[1], 4, 4, 1, { owner: p.id, title: p.name, color: ROOF[C().pIndex(p)] });
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
  function tile(x, y) { return (x < 0 || y < 0 || x >= W.mw || y >= W.mh) ? SOLID : W.map[y][x]; }
  function walk(x, y, allowDoor) {
    var t = tile(x, y);
    if (t === GRASS || t === PATH || t === FLOWER || t === SAND || t === WET || t === PIER || t === CAVE || t === DECK) return true;
    if (t === SWIM) return can('swim');
    if (t === VINE) return can('climb');
    return !!(allowDoor && (t === DOOR || t === EXIT));
  }
  function buildingAt(x, y) { for (var i = 0; i < W.bld.length; i++) { var b = W.bld[i]; if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; } return null; }
  function bfs(sx, sy, tx, ty, allowDoor) {
    if (sx === tx && sy === ty) return [];
    var prev = {}, q = [[sx, sy]], k = function (x, y) { return x + ',' + y; };
    prev[k(sx, sy)] = null;
    while (q.length) {
      var c = q.shift(), dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) {
        var nx = c[0] + dirs[i][0], ny = c[1] + dirs[i][1], key = k(nx, ny);
        if (prev.hasOwnProperty(key)) continue;
        var isTarget = nx === tx && ny === ty;
        if (!walk(nx, ny, allowDoor && isTarget)) continue;
        prev[key] = c;
        if (isTarget) {
          var out = [[nx, ny]], p = c;
          while (p && !(p[0] === sx && p[1] === sy)) { out.unshift(p); p = prev[k(p[0], p[1])]; }
          return out;
        }
        q.push([nx, ny]);
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
    var roof = b.kind === 'bank' ? '#123f36' : b.kind === 'store' ? '#b3262a' : b.color;
    var wall = b.kind === 'bank' ? '#efe6cf' : b.kind === 'store' ? '#fff4e0' : '#f6ecd9';
    g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 4, y + h - 4, w, 6);
    g.fillStyle = wall; g.fillRect(x + 2, y + h * 0.4, w - 4, h * 0.6);
    g.fillStyle = roof; g.beginPath(); g.moveTo(x - 2, y + h * 0.45); g.lineTo(x + 10, y + 4); g.lineTo(x + w - 10, y + 4); g.lineTo(x + w + 2, y + h * 0.45); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 12, y + 8, w - 24, 4);
    if (b.kind === 'store') { for (var s = 0; s < b.w * 2; s++) { g.fillStyle = s % 2 ? '#fff' : '#e45757'; g.fillRect(x + 2 + s * 16, y + h * 0.4, 16, 12); } }
    if (b.kind === 'bank') { g.fillStyle = '#d8ccae'; for (var c = 0; c < 4; c++) g.fillRect(x + 20 + c * (w - 50) / 3, y + h * 0.48, 8, h * 0.48); }
    g.fillStyle = '#a7d8f2';
    var wy = y + h * 0.58;
    if (b.kind === 'house') { g.fillRect(x + 12, wy, 22, 18); g.fillRect(x + w - 34, wy, 22, 18); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + 12, wy, 22, 18); g.strokeRect(x + w - 34, wy, 22, 18); }
    else if (b.kind === 'store') { g.fillRect(x + 12, wy, 50, 26); g.fillRect(x + w - 62, wy, 50, 26); }
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
  function petImage(pid, mood) {
    var st = Pz().state(pid); if (!st.pet) return null;
    var f = st.flags, p = st.pet, key = 'pet|' + pid + '|' + p.sp + p.stage + p.pal + '|' + (p.wear || '') + '|' + (p.dye || '') + '|' + mood + '|' + (f.thin ? 1 : 0) + (f.dirty ? 1 : 0) + (f.tired ? 1 : 0) + (f.pudgy ? 1 : 0);
    return img(key, function () { return Pz().petSvg(p, mood, f); });
  }
  function avatarImage(pid) { var a = Pz().doc(pid).avatar, key = 'av|' + JSON.stringify(a); return img(key, function () { return Pz().avatarSvg(a); }); }
  function itemImage(id) { return img('item|' + id, function () { return A().itemArt(id); }); }
  function eggImage() { return img('egg', function () { return CRE.egg(); }); }

  /* ================= actors ================= */
  function placeAt(sx, sy) {
    W.P = { x: sx, y: sy, tx: sx, ty: sy, fx: sx, fy: sy, moving: false, path: [], face: 1 };
    var px = walk(sx + 1, sy) ? sx + 1 : walk(sx - 1, sy) ? sx - 1 : sx, py = sy;
    if (px === sx) py = walk(sx, sy + 1) ? sy + 1 : sy;
    W.pet = { x: px, y: py, tx: px, ty: py, fx: px, fy: py, moving: false, queue: [], face: -1, mode: 'follow', until: 0, t: 0 };
  }
  function placeAtHome() {
    var home = null;
    W.bld.forEach(function (b) { if (b.kind === 'house' && b.owner === W.pid) home = b; });
    placeAt(home ? home.door.x : 14, home ? home.door.y + 1 : 12);
  }
  function stepTo(a, x, y) { a.fx = a.x; a.fy = a.y; a.tx = x; a.ty = y; a.moving = true; a.prog = 0; if (x !== a.x) a.face = x > a.x ? 1 : -1; }
  function playerTryDir(dir) {
    var d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir]; if (!d) return false;
    var P = W.P, nx = P.x + d[0], ny = P.y + d[1];
    if (d[0]) P.face = d[0];
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
    if (t === EXIT) { leaveRegion(); return; }
    if (W.region === 'beach') pickupShell(P.x, P.y);
    if (W.region === 'ship') dropOff();
    if (W.region === 'town') greetHosts();
    if (P.path.length) { var n = P.path.shift(); playerStep(n[0], n[1]); return; }
    if (W.held) playerTryDir(W.held);
    actionHud();
  }
  function moveActor(a, speed, dt) {
    if (!a.moving) return false;
    var dx = a.tx - a.fx, dy = a.ty - a.fy, prog = (a.prog || 0) + speed * dt;
    if (prog >= 1) { a.x = a.tx; a.y = a.ty; a.moving = false; a.prog = 0; return true; }
    a.prog = prog; a.px = a.fx + dx * prog; a.py = a.fy + dy * prog;
    return false;
  }
  function petSpeedFactor(f) { var s = 1; if (f.tired) s *= 0.45; if (f.pudgy) s *= 0.5; if (f.thin) s *= 0.65; return s; }
  function updatePet(dt, now) {
    var pet = W.pet, st = Pz().state(W.pid), f = st.flags, P = W.P;
    if (!st.pet) return;
    var speed = 4.6 * petSpeedFactor(f);
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
    if (pet.mode === 'nap' || pet.mode === 'eat' || pet.mode === 'dig') return;
    if (pet.moving) { moveActor(pet, speed, dt); return; }
    if (pet.mode === 'dumpster') { if (pet.queue.length) { var n = pet.queue.shift(); stepTo(pet, n[0], n[1]); } return; }
    if (pet.queue.length > 24) { var p2 = bfs(pet.x, pet.y, P.x, P.y) || []; if (p2.length) p2.pop(); pet.queue = p2; }
    var dist = Math.abs(pet.x - P.x) + Math.abs(pet.y - P.y);
    if (pet.queue.length && dist > 1) {
      var q = pet.queue.shift();
      if (q[0] === P.x && q[1] === P.y) return;
      if (Math.abs(q[0] - pet.x) + Math.abs(q[1] - pet.y) !== 1 || !walk(q[0], q[1])) { var fix = bfs(pet.x, pet.y, P.x, P.y); if (fix && fix.length > 1) { fix.pop(); pet.queue = fix.slice(1); q = fix[0]; } else return; }
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
    if (W.region !== 'beach' || !W.obj || W.P.moving) return null;
    var P = W.P, d = objAt(W.obj.digs, P.x, P.y);
    if (d && !d.done) return { kind: 'dig', o: d, label: 'Dig' };
    for (var i = 0; i < W.obj.chests.length; i++) { var c = W.obj.chests[i]; if (!c.open && near(c)) return { kind: 'chest', o: c, label: 'Open' }; }
    if (P.x === W.fishAt.x && P.y === W.fishAt.y) return { kind: 'fish', label: 'Fish' };
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
  function newShip() {
    W.ship = { items: {}, puddles: [], carry: [], done: 0, tickets: 0, next: Date.now() + 3000, mop: null, hintAt: 0, pops: [],
      swim: [0, 1, 2].map(function (i) { return { x: 9 + i * 2.5, y: 12 + (i % 2), ph: Math.random() * 6, c: ['#e45757', '#f2d43a', '#6d3fcf'][i] }; }),
      guests: {} };
    W.slots.forEach(function (s, i) { if (s.kind === 'dine' || (s.kind === 'chair' && i % 2)) W.ship.guests[s.x + ',' + s.y] = GUEST[i % GUEST.length]; });
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
    if (now >= S.next) { spawnTask(false); S.next = now + 3800 + Math.random() * 2600; }
    S.pops = S.pops.filter(function (p) { return now - p.t0 < 1200; });
    W.slots.forEach(function (s) { var key = s.x + ',' + s.y; if (s.back && now >= s.back && !S.items[key]) { s.back = 0; if (s.kind === 'dine' || Math.random() < 0.5) S.guests[key] = GUEST[Math.floor(Math.random() * GUEST.length)]; } });
  }
  function puddleAt(x, y) { var list = W.ship ? W.ship.puddles : []; for (var i = 0; i < list.length; i++) if (list[i].x === x && list[i].y === y) return list[i]; return null; }
  function nearStation(s) { var P = W.P, dx = Math.max(s.x - P.x, 0, P.x - (s.x + s.w - 1)), dy = Math.abs(P.y - s.y); return dx + dy === 1; }
  function shipAction() {
    var S = W.ship, P = W.P; if (!S || P.moving || S.mop) return null;
    var pd = puddleAt(P.x, P.y); if (pd) return { kind: 'mop', o: pd, label: 'Mop' };
    for (var i = 0; i < W.slots.length; i++) {
      var s = W.slots[i];
      if (S.items[s.x + ',' + s.y] && near(s)) return S.carry.length < capacity() ? { kind: 'pick', o: s, label: 'Pick up' } : { kind: 'full', label: 'Full' };
    }
    for (var j = 0; j < W.stations.length; j++) if (W.stations[j].kind === 'prize' && nearStation(W.stations[j])) return { kind: 'prizes', label: 'Prizes' };
    return null;
  }
  function pickUp(s) {
    var S = W.ship, key = s.x + ',' + s.y, it = S.items[key]; if (!it) return;
    S.carry.push(it); delete S.items[key]; s.back = Date.now() + 4000 + Math.random() * 4000;
    var cap = capacity();
    say('Picked up a ' + CARRY_NAME[it] + '. ' + (S.carry.length >= cap ? 'Hands full!' : (cap - S.carry.length) + ' more fit.') + (S.carry.length === 4 ? ' Your pet is carrying one!' : ''), 1600);
    hud(); dropOff();
  }
  function dropOff() {
    var S = W.ship; if (!S || !S.carry.length) return;
    W.stations.forEach(function (st) {
      if (st.kind === 'prize' || !nearStation(st)) return;
      var keep = [], n = 0;
      S.carry.forEach(function (it) { if (it === st.kind) n++; else keep.push(it); });
      if (n) { S.carry = keep; award(n, n + ' ' + CARRY_NAME[st.kind] + (n > 1 ? (st.kind === 'glass' ? 'es' : 's') : '') + ' dropped off!', st.x + Math.floor(st.w / 2), st.y); hud(); }
      else if (Date.now() - S.hintAt > 5000) { S.hintAt = Date.now(); say('Wrong spot! ' + st.title + ' takes ' + CARRY_NAME[st.kind] + (st.kind === 'glass' ? 'es' : 's') + '. Plates go to the Dish station, glasses to the Bar, towels to the Towels cart.', 3500); }
    });
  }
  function startMop(pd) { var S = W.ship; S.mop = { pd: pd, until: Date.now() + 900 }; W.held = null; W.P.path = []; say('Mopping...', 900); actionHud(); }
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
      closePrizes(); A().reveal(res); setTimeout(hud, 80);
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
  function mopDraw(tx, ty) {
    var ctx = W.ctx, a = Math.sin(W.t * 16) * 0.5, cx = tx * T + 26, cy = ty * T + 26;
    ctx.save(); ctx.translate(cx, cy - 24); ctx.rotate(a);
    ctx.fillStyle = '#a8703a'; ctx.fillRect(-1.5, 0, 3, 26); ctx.fillStyle = '#e9e3d6'; rr(ctx, -7, 24, 14, 6, 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx - 10 + i * 8 + Math.sin(W.t * 9 + i) * 3, cy + 2 - ((W.t * 30 + i * 7) % 12), 2, 0, 7); ctx.fill(); }
  }
  function guestDraw(key, s, col) {
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
    var m = region === 'beach' ? buildBeach() : region === 'ship' ? buildShip() : buildTown(C().activePeople().filter(function (p) { return !C().isAdult(p.id); }));
    W.map = m.map; W.mw = m.mw; W.mh = m.mh; W.bld = m.bld;
    W.stations = m.stations || []; W.slots = m.slots || []; W.wet = m.wet || [];
    if (region !== 'ship') W.ship = null;
    W.dumpster = m.dumpster; W.dig = m.dig; W.chests = m.chests || []; W.fishAt = m.fishAt; W.spots = m.spots || [];
    if (!W.bgs[region] || region === 'town') W.bgs[region] = drawBg();
    W.bg = W.bgs[region];
    return m;
  }
  function enterRegion(region) {
    Pz().G.room = null; renderRoom();
    A().startExpedition(W.pid, region);
    var m = load(region);
    placeAt(m.start.x, m.start.y);
    stopFish(); closePrizes();
    if (region === 'ship') { newShip(); say('Welcome aboard! Plates go to the Dish station, glasses to the Bar, towels to the Towels cart. Mop puddles by the pool.', 6000); }
    else { W.ship = null; newSession(); say('Welcome to Sunny Beach! Dig at the X marks, fish off the pier and look for chests.', 4500); }
    hud(); start();
  }
  function leaveRegion(reason) {
    if (W.region === 'town') return;
    var tk = W.region === 'ship' && W.ship ? W.ship.tickets : 0;
    A().saveTime(true);
    stopFish(); closePrizes();
    if (!reason && tk) reason = 'Back in town. You earned ' + tk + ' deck ticket' + (tk === 1 ? '' : 's') + ' on the ship!';
    W.ship = null;
    load('town'); W.key = peopleKey();
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
    if (!W.cv || !document.body.contains(W.cv)) { W.run = false; if (W.region !== 'town') A().saveTime(false); return; }
    var dt = Math.min(0.05, W.last ? (ts - W.last) / 1000 : 0.016); W.last = ts; W.t += dt;
    var now = Date.now(), P = W.P;
    var mopping = W.ship && W.ship.mop;
    if (mopping) { if (now >= W.ship.mop.until) finishMop(); }
    else if (P.moving) { if (moveActor(P, 4.2, dt)) arrived(P); }
    else if (P.path.length) arrived(P);
    else if (W.held) playerTryDir(W.held);
    if (W.region === 'ship' && W.ship) shipTick(now);
    if (W.run) updatePet(dt, now);
    if (W.fish) { var f = W.fish; f.pos += f.dir * f.speed * dt; if (f.pos > 1) { f.pos = 1; f.dir = -1; } if (f.pos < 0) { f.pos = 0; f.dir = 1; } var hk = W.root.querySelector('.fish-hook'); if (hk) hk.style.left = (f.pos * 100) + '%'; }
    if (W.region !== 'town') {
      var e = A().exp();
      if (e && now - e.lastSave > 60000) A().saveTime(false);
      if (!e || now >= e.endsAt) { leaveRegion('Adventure time is up for today. See you next time!'); }
      else if (Math.floor(W.t * 2) !== Math.floor((W.t - dt) * 2)) { timerHud(e); actionHud(); }
    }
    if (W.msgUntil && now > W.msgUntil) { W.msgUntil = 0; W.msg = ''; updateMsg(); }
    draw();
    if (W.run) RAF(tick);
  }
  function pos(a) { return a.moving ? { x: a.px, y: a.py } : { x: a.x, y: a.y }; }
  function draw() {
    var ctx = W.ctx, s = W.scale * W.dpr, vw = W.cw / W.scale, vh = W.ch / W.scale, MW = W.mw, MH = W.mh;
    var pp = pos(W.P), camX = pp.x * T + T / 2 - vw / 2, camY = pp.y * T + T / 2 - vh / 2;
    camX = Math.max(0, Math.min(MW * T - vw, camX)); camY = Math.max(0, Math.min(MH * T - vh, camY));
    if (vw > MW * T) camX = (MW * T - vw) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = W.region === 'beach' ? '#2f8fc4' : W.region === 'ship' ? '#2f7fb8' : '#2f8a4a'; ctx.fillRect(0, 0, W.cv.width, W.cv.height);
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
          sprite(petImage(b.owner, st.mood.key), b.door.x + 2, b.door.y + 1, 48, Math.sin(W.t * 2 + b.x) * 1, -1, 0);
          if (CRE.byId(st.pet.sp).rare) sparkles((b.door.x + 2) * T + 16, (b.door.y + 1) * T - 10, 22, '#ffe27a');
        } });
      });
    } else if (W.region === 'ship' && W.ship) {
      shipDraw(list);
    } else if (W.obj) {
      var lit = can('light');
      W.obj.digs.forEach(function (d) { if (!d.done) list.push({ y: d.y - 0.5, draw: function () { xMark(d.x, d.y); } }); });
      W.obj.shells.forEach(function (sh) { if (!sh.taken) list.push({ y: sh.y - 0.4, draw: function () { var im = itemImage(sh.id); if (im) ctx.drawImage(im, sh.x * T + 7, sh.y * T + 8, 18, 18); sparkles(sh.x * T + 16, sh.y * T + 14, 10, '#fff'); } }); });
      W.obj.chests.forEach(function (c) {
        if (c.need === 'light' && !lit) return;
        list.push({ y: c.y, draw: function () { chest(c.x, c.y, c.open); } });
      });
      list.push({ y: W.fishAt.y - 0.5, draw: function () { if (!W.fish) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Fish here', W.fishAt.x * T + 16, W.fishAt.y * T + 6); } } });
    }
    hostSpots().forEach(function (h) {
      list.push({ y: h.y, draw: function () {
        var im = img('av|' + JSON.stringify(h.avatar), function () { return Pz().avatarSvg(h.avatar); });
        sprite(im, h.x, h.y, 50, Math.sin(W.t * 1.5 + h.x) * 0.8, -1, 0, true);
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var tw = ctx.measureText(h.name).width + 10, cx = h.x * T + 16, cy = h.y * T - 24;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, cx - tw / 2, cy - 8, tw, 16, 5); ctx.fill();
        ctx.fillStyle = '#17211e'; ctx.fillText(h.name, cx, cy);
      } });
    });
    var st = Pz().state(W.pid), pet = W.pet, petPos = pos(pet);
    if (st.pet) {
      var mood = pet.mode === 'nap' ? 'asleep' : pet.mode === 'eat' ? 'eat' : pet.mode === 'dig' ? 'happy' : st.mood.key;
      var dump = pet.mode === 'dumpster' && !pet.moving && W.dig && pet.x === W.dig.x && pet.y === W.dig.y;
      var digging = dump || pet.mode === 'dig';
      list.push({ y: petPos.y, draw: function () {
        var bob = pet.moving ? -Math.abs(Math.sin(W.t * 10)) * 3 : (digging ? Math.sin(W.t * 18) * 2 : Math.sin(W.t * 2) * 1);
        sprite(petImage(W.pid, mood), petPos.x, petPos.y, 54, bob, pet.face, digging ? Math.sin(W.t * 14) * 0.15 : 0);
        if (digging) trash(petPos.x, petPos.y, dump);
        if (pet.mode === 'nap') zzz(petPos.x, petPos.y);
        if (CRE.byId(st.pet.sp).rare) sparkles(petPos.x * T + 16, petPos.y * T - 12, 24, '#ffe27a');
      } });
    }
    list.push({ y: pp.y + 0.01, draw: function () {
      var bob = W.P.moving ? -Math.abs(Math.sin(W.t * 11)) * 3 : 0;
      sprite(avatarImage(W.pid), pp.x, pp.y, 50, bob, W.P.face, 0, true);
      if (W.ship) { carryDraw(pp.x, pp.y, 58, W.ship.carry.slice(0, 3)); if (W.ship.mop) mopDraw(pp.x, pp.y); }
    } });
    if (W.ship && W.ship.carry.length > 3) list.push({ y: petPos.y + 0.02, draw: function () { carryDraw(petPos.x, petPos.y, 50, W.ship.carry.slice(3)); } });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (it) { it.draw(); });
    if (W.region === 'beach') caveDark(pp);
    if (W.ship) popsDraw();
  }
  function caveDark(pp) {
    var ctx = W.ctx, x0 = 19 * T, y0 = 2 * T, w = 5 * T, h = 8 * T, inCave = pp.x >= 19 && pp.x <= 23 && pp.y >= 2 && pp.y <= 9;
    if (can('light')) { ctx.fillStyle = 'rgba(255,170,60,.12)'; ctx.fillRect(x0, y0, w, h); return; }
    ctx.save(); ctx.fillStyle = 'rgba(8,6,12,.93)';
    ctx.beginPath(); ctx.rect(x0, y0, w, 6 * T);
    if (inCave) { ctx.moveTo(pp.x * T + 16 + 36, pp.y * T + 16); ctx.arc(pp.x * T + 16, pp.y * T + 16, 36, 0, Math.PI * 2, true); }
    ctx.fill('evenodd'); ctx.restore();
  }
  function sprite(im, tx, ty, h, bob, face, rot, isAvatar) {
    var ctx = W.ctx, w = isAvatar ? h * 0.75 : h * 0.906;
    var cx = tx * T + T / 2, base = ty * T + T - 2;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse ? ctx.ellipse(cx, base - 2, w * 0.3, 4, 0, 0, 7) : ctx.arc(cx, base - 2, w * 0.3, 0, 7); ctx.fill();
    if (!im) return;
    ctx.save(); ctx.translate(cx, base + bob); if (rot) ctx.rotate(rot); if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
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
    var G = Pz().G;
    if (b.kind === 'house' && b.owner !== W.pid && !Pz().doc(b.owner).avatar && !Pz().doc(b.owner).pet) { say('Nobody is home at ' + b.title + '’s house yet.', 2500); bump(b); return; }
    G.room = { kind: b.kind, owner: b.owner, title: b.kind === 'house' ? (b.owner === W.pid ? 'Your house' : b.title + '’s house') : b.title, door: b.door, tab: 'room' };
    W.held = null; W.P.path = [];
    renderRoom(true);
    W.run = false;
  }
  function bump(b) { var P = W.P, ny = b && b.kind === 'gate' ? P.y - 1 : P.y + 1; if (walk(P.x, ny)) { P.path = []; playerStep(P.x, ny); } }
  function renderRoom(force) {
    var G = Pz().G, el = W.root && W.root.querySelector('#room');
    if (!el) return;
    if (!G.room) { el.hidden = true; el.innerHTML = ''; el.setAttribute('data-game', ''); W.root.className = 'world'; return; }
    var gid = G.game ? String(G.game.id) : '';
    if (!force && gid && el.getAttribute('data-game') === gid) return;
    el.hidden = false;
    el.setAttribute('data-game', gid);
    W.root.className = 'world in-room';
    el.innerHTML = '<div class="room-inner">' + Pz().roomHtml(G.room, W.pid) + '</div>';
    if (G.game) Pz().mountGame();
  }
  function closeRoom() {
    var G = Pz().G, room = G.room, door = room && room.door;
    G.room = null; G.game = null;
    renderRoom();
    if (door && W.P) {
      var P = W.P, oy = room.kind === 'gate' ? door.y - 1 : door.y + 1;
      P.x = P.tx = door.x; P.y = P.ty = oy; P.moving = false; P.path = [];
      var pet = W.pet; if (pet.mode !== 'dumpster') { pet.x = pet.tx = door.x + (walk(door.x + 1, oy) ? 1 : -1); pet.y = pet.ty = oy; pet.moving = false; pet.queue = []; }
    }
    hud(); start();
  }

  /* ================= HUD ================= */
  function hud() {
    var el = W.root && W.root.querySelector('.hud-top'); if (!el) return;
    var st = Pz().state(W.pid), w = st.wallet, p = st.pet;
    if (!p) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="hud-line"><strong>' + C().esc(p.name) + '</strong> <span class="lvl mono">Lv ' + (p.level || 0) + '</span>' +
      (W.region === 'town' ? '<span class="hud-coins">' + Pz().coin('food') + '<b class="mono">' + w.food + '</b>' + Pz().coin('care') + '<b class="mono">' + w.care + '</b></span>' : '<span class="hud-coins hud-timer mono"></span><button type="button" class="btn small leave-btn" data-wact="leave">Leave</button>') + '</div>' +
      '<div class="hud-needs">' + Pz().NEEDS.map(function (x) {
        var v = st.needs[x.k], cls = v >= Pz().GOOD ? 'full' : v < Pz().LOW ? 'low' : '';
        return '<span class="hn ' + cls + '"><small>' + x.label + '</small><span class="bar"><i style="width:' + v + '%"></i></span></span>';
      }).join('') + '</div>' +
      (W.region === 'town' ? '<div class="hud-bag note">Bag: ' + w.meals + ' meal &middot; ' + w.kits + ' bath kit &middot; ' + w.rest + ' tuck-in &middot; ' + w.energy + ' play' +
        (st.doc.egg ? ' &middot; <b class="egg-tag">Rare egg at home!</b>' : '') + (p.final ? ' &middot; <b>Fully grown! Go home.</b>' : p.leveledOn === C().today() ? ' &middot; Leveled up today' : '') + '</div>'
        : W.region === 'ship' && W.ship ? '<div class="hud-bag note">Lido Deck &middot; hands ' + W.ship.carry.length + '/' + capacity() + (W.ship.carry.length ? ' (' + W.ship.carry.join(', ') + ')' : '') + ' &middot; <b>' + A().tickets(W.pid) + '</b> tickets' + (capacity() > 3 ? '' : ' &middot; a healthy pet carries 1 more') + '</div>'
        : '<div class="hud-bag note">Sunny Beach &middot; found ' + ((A().exp() || {}).found || []).length + ' thing' + (((A().exp() || {}).found || []).length === 1 ? '' : 's') + ' so far</div>');
    var fb = W.root.querySelector('.feed-btn');
    if (fb) { fb.hidden = W.region !== 'town'; fb.disabled = w.meals < 1; fb.innerHTML = 'Feed<small>' + w.meals + ' meal</small>'; }
    var mood = W.root.querySelector('.hud-mood');
    if (mood) mood.textContent = W.region !== 'town' ? '' : st.starving ? 'Starving! Buy food at the Store' : st.mood.label;
    if (mood) mood.hidden = !mood.textContent;
    actionHud();
    if (W.region !== 'town' && A().exp()) timerHud(A().exp());
  }
  function actionHud() {
    var b = W.root && W.root.querySelector('.act-btn'); if (!b) return;
    var a = currentAction();
    b.hidden = !a; if (a) b.textContent = a.label;
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
    if (W.region !== 'town') return [];
    var out = [], used = {};
    ['bank', 'store', 'park', 'gate', 'square'].forEach(function (kind) {
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
      var nm = C().pname(W.pid), line = h.kind === 'bank' ? 'Come on in, ' + nm + '! Your account is inside.' : h.kind === 'store' ? 'Hi ' + nm + '! Need a meal or a bath kit?' : h.kind === 'park' ? 'Want to play fetch, ' + nm + '?' : h.kind === 'gate' ? 'Big jobs done, ' + nm + '? Then adventure awaits!' : 'Hi ' + nm + '! How is your pet doing?';
      say(h.name + ': ' + line, 3000);
    });
  }
  function show(view, pid) {
    var key = peopleKey();
    if (W.region === 'town' && (key !== W.key || !W.map)) { load('town'); W.key = key; W.P = null; }
    if (W.pid !== pid || !W.P) { if (W.region !== 'town') { A().saveTime(true); load('town'); W.key = key; } W.pid = pid; placeAtHome(); W.imgs = {}; }
    var root = view.querySelector('#world');
    if (!root) {
      view.innerHTML = '<div class="world" id="world"><canvas class="wcanvas" aria-label="Map. Use the arrows to walk."></canvas>' +
        '<div class="hud-top"></div><div class="wmsg" hidden></div>' +
        '<div class="dpad" aria-label="Walk"><button type="button" data-dir="up" aria-label="Up">&#9650;</button><button type="button" data-dir="left" aria-label="Left">&#9664;</button><button type="button" data-dir="right" aria-label="Right">&#9654;</button><button type="button" data-dir="down" aria-label="Down">&#9660;</button></div>' +
        '<div class="hud-act"><span class="hud-mood"></span><button type="button" class="act-btn" data-wact="act" hidden>Dig</button><button type="button" class="feed-btn" data-pact="feed">Feed</button></div>' +
        '<div class="fishing" hidden></div><div class="fishing prizes" hidden></div>' +
        '<div id="room" class="room-overlay" hidden></div></div>' +
        '<p class="note town-help">Walk with the arrows or tap a spot. Walk into a door to go inside. The Adventure Gate at the bottom of town opens when you have an Adventure Pass.</p>';
      root = view.querySelector('#world');
      W.root = root; W.cv = root.querySelector('canvas'); W.ctx = W.cv.getContext('2d');
      bindInput();
      size();
    } else { W.root = root; }
    hud(); updateMsg(); renderRoom();
    if (Pz().G.room) W.run = false; else start();
  }
  function size() {
    if (!W.cv) return;
    var cw = W.root.clientWidth || 320, vh = window.innerHeight || 640;
    var ch = Math.max(280, Math.min(Math.round(cw * 1.35), vh - 190));
    W.dpr = Math.min(2, window.devicePixelRatio || 1);
    W.cw = cw; W.ch = ch;
    W.cv.style.height = ch + 'px';
    W.cv.width = Math.round(cw * W.dpr); W.cv.height = Math.round(ch * W.dpr);
    W.scale = Math.min(2.2, cw / (10.5 * T));
    W.root.style.height = ch + 'px';
  }
  function unmount() { if (W.region !== 'town') A().saveTime(false); W.run = false; W.root = null; W.cv = null; }
  var bound = false;
  function bindInput() {
    if (bound) return; bound = true;
    function dirBtn(e) { return e.target.closest ? e.target.closest('.dpad [data-dir]') : null; }
    function press(e) { var b = dirBtn(e); if (!b || !W.P) return; if (e.cancelable) e.preventDefault(); W.held = b.getAttribute('data-dir'); W.P.path = []; if (!W.P.moving) playerTryDir(W.held); }
    function release() { W.held = null; }
    document.addEventListener('touchstart', press, { passive: false });
    document.addEventListener('mousedown', press);
    document.addEventListener('touchend', release); document.addEventListener('touchcancel', release); document.addEventListener('mouseup', release);
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
        if (a === 'act') doAction(); else if (a === 'reel') reel(); else if (a === 'stopFish') stopFish(); else if (a === 'leave') leaveRegion(); else if (a === 'prize') buyPrize(wb.getAttribute('data-id')); else if (a === 'closePrizes') closePrizes();
        return;
      }
      if (!W.cv || e.target !== W.cv || !W.cam) return;
      var r = W.cv.getBoundingClientRect(), wx = (e.clientX - r.left) / W.scale + W.cam.x, wy = (e.clientY - r.top) / W.scale + W.cam.y;
      var tx = Math.floor(wx / T), ty = Math.floor(wy / T), P = W.P, b = buildingAt(tx, ty);
      if (b) { tx = b.door.x; ty = b.door.y; }
      var sx = P.moving ? P.tx : P.x, sy = P.moving ? P.ty : P.y, path = bfs(sx, sy, tx, ty, true);
      if (!path && !walk(tx, ty, true)) [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var p2 = bfs(sx, sy, tx + d[0], ty + d[1], false); if (p2 && (!path || p2.length < path.length)) path = p2; });
      if (path) { P.path = path; if (!P.moving) arrived(P); }
    });
    window.addEventListener('resize', function () { if (W.cv && document.body.contains(W.cv)) size(); });
  }
  function petEats() { var pet = W.pet; if (!pet) return; pet.mode = 'eat'; pet.until = Date.now() + 1400; pet.queue = []; say('Yum!', 1500); }
  window.World = { show: show, unmount: unmount, closeRoom: closeRoom, petEats: petEats, enterRegion: enterRegion, leaveRegion: leaveRegion, W: W };
})();
