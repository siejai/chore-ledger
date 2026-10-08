/*
 * Crystal Caverns, an adventure at the Adventure Gate (cl-v37): a side-scrolling run through a glowing cave.
 * The kid's pet runs on its own; tap (or hold for a higher jump) to jump. Little arcade tickets float along the way,
 * and crystal blocks pay tickets (or now and then a found item) when the pet jumps into them from below.
 * Bats, slimes, spikes and pits send the pet back to the start (what it already collected stays collected); landing on a
 * slime or a bat from above pops it for a ticket. A run lasts 90 seconds (less if the Adventure Pass is nearly used up).
 * The course goes on as far as the pet can get; it is the same course every time it starts over. ES5.
 */
(function () {
  'use strict';
  var S = null, RAF = window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  var T = 20, VW = 400, VH = 240, ROWS = 12, RUN = 118, GRAV = 980, JUMP = 360, HOLD_GRAV = 470, HOLD_T = 0.24, START = 3;
  function A() { return window.ADV; }
  function C() { return window.CL; }
  function Pz() { return window.Pets; }
  function esc(s) { return C().esc(s); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function secsLeft() { var e = A() && A().exp(); return e ? Math.max(0, Math.floor((e.endsAt - Date.now()) / 1000)) : 0; }

  /* ---------------- the course: chunks laid end to end from a fixed seed ---------------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function build(seed) {
    var R = rng(seed), L = { ground: [], solid: {}, blocks: [], tickets: [], foes: [], spikes: {}, cols: 0 };
    function col(h) { L.ground[L.cols++] = h; }   /* h = row where the ground starts (smaller is higher); 99 = pit */
    function ticket(c, r) { L.tickets.push({ x: c * T + T / 2, y: r * T + T / 2, got: false }); }
    var h = 9;
    function flat(n) { for (var i = 0; i < n; i++) col(h); }
    var CH = {
      flat: function () { var c0 = L.cols; flat(10); for (var i = 3; i < 8; i++) ticket(c0 + i, h - 2); },
      gap: function (d) { var w = 2 + (d > 4 && R() < 0.5 ? 1 : 0); flat(3); var c0 = L.cols; for (var i = 0; i < w; i++) col(99); flat(3);
        for (var j = -1; j <= w; j++) ticket(c0 + j, h - 3 - (j >= 0 && j < w ? 1 : 0)); },
      blocks: function () { var c0 = L.cols; flat(11); [3, 6, 7].forEach(function (i, k) { L.blocks.push({ c: c0 + i, r: h - 4, used: false, bump: 0 }); L.solid[(c0 + i) + ',' + (h - 4)] = 'b'; }); ticket(c0 + 6, h - 6); ticket(c0 + 7, h - 6); },
      slime: function () { var c0 = L.cols; flat(11); L.foes.push({ k: 'slime', x0: (c0 + 4) * T, x1: (c0 + 9) * T, y: h * T, dir: -1 }); ticket(c0 + 2, h - 2); ticket(c0 + 10, h - 2); },
      bat: function () { var c0 = L.cols; flat(11); L.foes.push({ k: 'bat', x0: (c0 + 3) * T, x1: (c0 + 9) * T, y: (h - 4) * T, dir: -1 }); for (var i = 4; i < 9; i += 2) ticket(c0 + i, h - 1); },   /* high enough to run under */
      spikes: function (d) { var c0 = L.cols; flat(9); var w = d > 5 && R() < 0.5 ? 2 : 1; for (var i = 0; i < w; i++) L.spikes[c0 + 4 + i] = true; for (var j = 3; j <= 5 + w; j++) ticket(c0 + j, h - 3 - (j > 3 && j < 5 + w ? 1 : 0)); },
      steps: function () { var c0 = L.cols; flat(3); h = Math.max(6, h - 1); flat(3); ticket(L.cols - 2, h - 2); h = Math.max(6, h - 1); flat(3); ticket(L.cols - 2, h - 2); h = Math.min(9, h + 2); flat(3); },
      ledge: function () { flat(3); var c0 = L.cols; for (var i = 0; i < 9; i++) col(99); for (var k = 2; k < 7; k++) { L.solid[(c0 + k) + ',' + (h - 2)] = 'p'; if (k > 2 && k < 6) ticket(c0 + k, h - 3); } flat(3); }
    };
    flat(START + 6);
    var plan = ['flat', 'blocks', 'gap', 'flat', 'slime', 'blocks'], pool = ['flat', 'gap', 'blocks', 'slime', 'bat', 'spikes', 'steps', 'ledge', 'gap', 'blocks', 'spikes', 'bat'];
    for (var n = 0; n < 60; n++) { var k = n < plan.length ? plan[n] : pool[Math.floor(R() * pool.length)]; CH[k](n); }
    flat(6);
    return L;
  }
  function solidAt(L, c, r) {
    if (c < 0) return true;
    if (r >= ROWS) return false;
    var g = L.ground[c];
    if (g === undefined) return r >= 9;
    if (g !== 99 && r >= g) return true;
    return !!L.solid[c + ',' + r];
  }

  /* ---------------- shell: intro, the run, the results ---------------- */
  function open(pid) { S = { pid: pid, phase: 'intro' }; A().startExpedition(pid, 'caverns'); if (window.World) window.World.unmount(); C().go(); }
  function active() { return !!S; }
  function head() { return '<div class="room-top"><strong>Crystal Caverns</strong><button class="btn small" type="button" data-cact="quit">Leave</button></div>'; }
  function render(view) {
    if (!S) return;
    var st = Pz().state(S.pid), nm = st.pet ? esc(st.pet.name) : 'Your pet';
    if (S.phase === 'intro') {
      var left = secsLeft();
      view.innerHTML = '<section class="cav-shell stack tight">' + head() + '<div class="card cav-intro"><h2>Into the caverns!</h2>' +
        '<p>' + nm + ' runs on its own. <b>Tap</b> to jump, and <b>hold</b> to jump higher.</p><ul class="ic-how"><li>Grab the little arcade tickets.</li>' +
        '<li>Jump up into the glowing crystal blocks: they pay tickets, and sometimes a treasure.</li><li>Bats, slimes, spikes and pits send ' + nm + ' back to the start. Land on a bat or slime from above to pop it.</li></ul>' +
        '<p>A run lasts ' + (left >= 90 ? '90 seconds' : left + ' seconds (your adventure time left)') + '. Get as far as you can!</p>' +
        '<button class="btn primary block" type="button" data-cact="start"' + (left < 15 ? ' disabled' : '') + '>Start the run</button></div></section>';
      return;
    }
    if (S.phase === 'play') {
      if (!view.querySelector('#cavCv')) {
        view.innerHTML = '<section class="cav-shell stack tight">' + head() + '<div class="cav-hud"><span class="cav-clock mono"></span><span class="cav-tix"></span></div>' +
          '<div class="cav-stage"><canvas id="cavCv" class="cav-cv"></canvas><div class="cav-say" hidden></div></div><p class="note cav-tip">Tap anywhere on the cave to jump. Hold for a bigger jump.</p></section>';
        start(view);
      }
      return;
    }
    var r = S.result || { tickets: 0, items: [], far: 0 };
    view.innerHTML = '<section class="cav-shell stack tight"><div class="celebrate-card' + (r.items.length ? ' r-rare' : '') + '" style="position:static;margin:0 auto">' +
      '<h2>Run over!</h2><p>' + nm + ' got as far as <b>' + r.best + ' m</b> into the caverns.' + (r.record ? ' <b>New record!</b>' : r.prev ? ' (Record: ' + r.prev + ' m)' : '') + '</p>' +
      '<p><strong>+' + r.tickets + ' deck ticket' + (r.tickets === 1 ? '' : 's') + '</strong></p>' +
      (r.items.length ? '<p>Found: ' + r.items.map(function (id) { return esc((A().ITEMS[id] || { name: id === 'egg' ? 'a rare egg' : id }).name); }).join(', ') + '</p>' : '') +
      '<div class="wrap" style="justify-content:center">' + (secsLeft() >= 30 ? '<button class="btn primary" type="button" data-cact="again">Run again</button>' : '') +
      '<button class="btn" type="button" data-cact="quit">Back to town</button></div></div></section>';
  }

  /* ---------------- the run ---------------- */
  function start(view) {
    var cv = view.querySelector('#cavCv'), st = Pz().state(S.pid), p = st.pet;
    var G = S.g = { cv: cv, ctx: cv.getContext('2d'), L: build(4242), t: 0, last: 0, left: Math.max(15, Math.min(90, secsLeft())), tickets: 0, items: [], run: true,
      pet: null, cam: 0, hold: false, pops: [], say: '', sayT: 0, best: 0, deaths: 0, petIm: null, root: view };
    respawn(G);
    /* the pet: side view, drawn once into a canvas */
    var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = 96; c.height = 106; try { c.getContext('2d').drawImage(im, 0, 0, 96, 106); G.petIm = c; } catch (e) { G.petIm = im; } };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(Pz().petSvg(p, 'happy', st.flags, { view: 'side', noStink: true }));
    size(G);
    function down(e) { if (!G.run) return; if (e.cancelable) e.preventDefault(); G.hold = true; jump(G); }
    function up() { G.hold = false; }
    cv.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    G.onKey = function (e) { if ((e.keyCode === 32 || e.keyCode === 38 || e.keyCode === 87) && G.run) { e.preventDefault(); if (!G.hold) { G.hold = true; jump(G); } } };
    G.onKeyUp = function (e) { if (e.keyCode === 32 || e.keyCode === 38 || e.keyCode === 87) G.hold = false; };
    window.addEventListener('keydown', G.onKey); window.addEventListener('keyup', G.onKeyUp);
    G.onResize = function () { size(G); }; window.addEventListener('resize', G.onResize);
    G.cleanup = function () { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('keydown', G.onKey); window.removeEventListener('keyup', G.onKeyUp); window.removeEventListener('resize', G.onResize); };
    clearInterval(S.timer); S.timer = setInterval(function () { if (S) A().saveTime(false); }, 30000);
    hud(G); RAF(loop);
  }
  function size(G) {
    var w = G.cv.parentNode.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
    G.cv.style.width = w + 'px'; G.cv.style.height = Math.round(w * VH / VW) + 'px';
    G.cv.width = Math.round(w * dpr); G.cv.height = Math.round(w * VH / VW * dpr); G.k = G.cv.width / VW;
  }
  function respawn(G) {
    G.pet = { x: START * T, y: 9 * T - 26, w: 18, h: 26, vx: RUN, vy: 0, ground: true, jt: 0, sq: 0, flash: 0 };
    G.cam = 0;
    G.L.foes.forEach(function (f) { f.dead = false; f.x = f.x1; f.dir = -1; f.t = 0; });
  }
  function jump(G) {
    var P = G.pet; if (!P || G.over) return;
    if (P.ground || P.coyote > 0) { P.vy = -JUMP; P.ground = false; P.coyote = 0; P.jt = HOLD_T; P.sq = -0.18; }
  }
  function say(G, t, ms) { G.say = t; G.sayT = (ms || 1400) / 1000; var el = G.root.querySelector('.cav-say'); if (el) { el.textContent = t; el.hidden = false; } }
  function hud(G) {
    var r = G.root, s = Math.max(0, Math.ceil(G.left));
    var c = r.querySelector('.cav-clock'); if (c) c.textContent = Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
    var t = r.querySelector('.cav-tix'); if (t) t.innerHTML = '<span class="cav-tk"></span>' + G.tickets + ' ticket' + (G.tickets === 1 ? '' : 's') + (G.items.length ? ' &middot; ' + G.items.length + ' treasure' + (G.items.length === 1 ? '' : 's') : '') + ' &middot; ' + Math.round(G.pet.x / T / 2) + ' m';
    G.shown = s;
  }
  function oops(G, why) {
    G.deaths++; G.why = (G.why || []).concat([why + '@' + Math.round(G.pet.x / T)]); G.best = Math.max(G.best, Math.round(G.pet.x / T / 2));
    G.pops.push({ x: G.pet.x + 8, y: G.pet.y, t: 0, k: 'poof' });
    say(G, why + ' Back to the start!', 1500);
    respawn(G); G.pet.flash = 1.2;
  }
  function reward(G, b) {
    var x = b.c * T + T / 2, y = b.r * T;
    if (G.items.length < 2 && Math.random() < 0.14) {
      var res = A().loot(S.pid, 'chest'), id = res.egg ? 'egg' : res.id;
      G.items.push(id); A().grant(S.pid, res).catch(function () {});
      var name = res.egg ? 'a rare egg' : (A().ITEMS[id] || { name: 'a treasure' }).name;
      G.pops.push({ x: x, y: y - 6, t: 0, k: 'item', id: id }); say(G, 'Treasure! ' + name, 2000);
    } else {
      var n = 1 + Math.floor(Math.random() * 3); G.tickets += n;
      G.pops.push({ x: x, y: y - 6, t: 0, k: 'tix', n: n });
    }
  }
  function step(G, dt) {
    var L = G.L, P = G.pet;
    P.flash = Math.max(0, P.flash - dt); P.sq += (0 - P.sq) * Math.min(1, dt * 10);
    /* gravity, a lighter pull while the jump is held */
    var g = P.vy < 0 && G.hold && P.jt > 0 ? HOLD_GRAV : GRAV; P.jt = Math.max(0, P.jt - dt);
    P.vy = Math.min(P.vy + g * dt, 700);
    if (P.coyote > 0) P.coyote -= dt;
    /* run right; a wall stops it until it jumps */
    var nx = P.x + RUN * dt, c0 = Math.floor(P.y / T), c1 = Math.floor((P.y + P.h - 1) / T), right = Math.floor((nx + P.w) / T), blocked = false;
    for (var r = c0; r <= c1; r++) if (solidAt(L, right, r)) blocked = true;
    if (!blocked) P.x = nx; else P.x = right * T - P.w - 0.01;
    /* vertical */
    var ny = P.y + P.vy * dt, lc = Math.floor(P.x / T), rc = Math.floor((P.x + P.w - 1) / T), was = P.ground;
    P.ground = false;
    if (P.vy >= 0) {
      var foot = Math.floor((ny + P.h) / T), hit = false;
      for (var c = lc; c <= rc; c++) if (solidAt(L, c, foot)) hit = true;
      if (hit && P.y + P.h <= foot * T + 1) { P.y = foot * T - P.h; P.vy = 0; P.ground = true; if (!was) P.sq = 0.16; }
      else P.y = ny;
    } else {
      var top = Math.floor(ny / T), bonk = false;
      for (var cc = lc; cc <= rc; cc++) if (solidAt(L, cc, top)) {
        bonk = true;
        G.L.blocks.forEach(function (b) { if (b.c === cc && b.r === top) { b.bump = 0.2; if (!b.used) { b.used = true; reward(G, b); } } });
      }
      if (bonk) { P.y = (top + 1) * T; P.vy = 0; } else P.y = ny;
    }
    if (was && !P.ground && P.vy >= 0) P.coyote = 0.08;   /* a moment to still jump just after running off an edge */
    /* hazards: pits and spikes */
    if (P.y > ROWS * T + 10) { oops(G, 'Down the pit!'); return; }
    if (P.ground) { for (var sc = lc; sc <= rc; sc++) if (L.spikes[sc] && L.ground[sc] !== 99 && P.y + P.h >= L.ground[sc] * T - 1) { oops(G, 'Ouch, spikes!'); return; } }
    /* tickets */
    L.tickets.forEach(function (t) { if (!t.got && Math.abs(t.x - (P.x + P.w / 2)) < 13 && Math.abs(t.y - (P.y + P.h / 2)) < 16) { t.got = true; G.tickets++; G.pops.push({ x: t.x, y: t.y, t: 0, k: 'tix', n: 1, small: true }); } });
    /* critters */
    for (var i = 0; i < L.foes.length; i++) {
      var f = L.foes[i]; if (f.dead) continue;
      f.t = (f.t || 0) + dt; f.x += f.dir * (f.k === 'bat' ? 34 : 24) * dt;
      if (f.x < f.x0) { f.x = f.x0; f.dir = 1; } if (f.x > f.x1) { f.x = f.x1; f.dir = -1; }
      var fy = f.k === 'bat' ? f.y + Math.sin(f.t * 3) * 12 - 8 : f.y - 14, fw = f.k === 'bat' ? 18 : 18, fh = 14, fx = f.x;
      if (P.x + P.w > fx - fw / 2 && P.x < fx + fw / 2 && P.y + P.h > fy && P.y < fy + fh) {
        if (P.vy > 40 && P.y + P.h - fy < 12) { f.dead = true; P.vy = -280; P.jt = 0.1; G.tickets++; G.pops.push({ x: fx, y: fy, t: 0, k: 'poof' }, { x: fx, y: fy - 8, t: 0, k: 'tix', n: 1 }); }
        else { oops(G, f.k === 'bat' ? 'A bat!' : 'A slime!'); return; }
      }
    }
    G.L.blocks.forEach(function (b) { if (b.bump > 0) b.bump = Math.max(0, b.bump - dt); });
    G.cam = Math.max(0, P.x - 110);
  }
  function loop(ts) {
    var G = S && S.g; if (!G || !G.run) return;
    if (!document.body.contains(G.cv)) { G.run = false; G.cleanup(); return; }
    var dt = G.last ? Math.min(0.033, (ts - G.last) / 1000) : 0.016; G.last = ts; G.t += dt;
    if (!G.over) {
      G.left -= dt; step(G, dt);
      if (Math.ceil(G.left) !== G.shown || G.t % 0.25 < dt) hud(G);
      if (G.left <= 0) { G.left = 0; G.over = true; hud(G); say(G, 'Time’s up!', 3000); setTimeout(function () { end(); }, 1200); }
    }
    if (G.sayT > 0) { G.sayT -= dt; if (G.sayT <= 0) { var el = G.root.querySelector('.cav-say'); if (el) el.hidden = true; } }
    draw(G);
    RAF(loop);
  }

  /* ---------------- drawing ---------------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function ticketShape(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    c.fillStyle = '#ff7a59'; rr(c, -8, -5, 16, 10, 2); c.fill();
    c.fillStyle = '#ffe2d6'; c.beginPath(); c.arc(-8, 0, 2.2, 0, 7); c.arc(8, 0, 2.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1; c.setLineDash && c.setLineDash([2, 1.5]); c.strokeRect(-5, -3, 10, 6); c.setLineDash && c.setLineDash([]);
    c.restore();
  }
  function crystal(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 9 * s); c.lineTo(x + 4 * s, y - 3 * s); c.lineTo(x + 2.5 * s, y + 5 * s); c.lineTo(x - 2.5 * s, y + 5 * s); c.lineTo(x - 4 * s, y - 3 * s); c.closePath(); c.fill(); }
  function draw(G) {
    var c = G.ctx, L = G.L, cam = G.cam, t = G.t;
    c.setTransform(G.k, 0, 0, G.k, 0, 0);
    /* cave backdrop: two slow layers of rock and glowing crystals */
    var bg = c.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#1d1638'); bg.addColorStop(1, '#2c2152'); c.fillStyle = bg; c.fillRect(0, 0, VW, VH);
    c.fillStyle = '#271d48';
    for (var i = -1; i < 9; i++) { var bx = i * 64 - (cam * 0.25) % 64; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + 32, 46 + (i % 3) * 12); c.lineTo(bx + 64, 0); c.fill(); }
    for (var j = -1; j < 8; j++) { var cx = j * 80 - (cam * 0.4) % 80; c.save(); c.globalAlpha = 0.18 + 0.1 * Math.sin(t * 1.6 + j); crystal(c, cx + 30, 120 + (j % 2) * 26, 1.3, j % 2 ? '#7fe7ff' : '#c48cff'); c.restore(); }
    c.save(); c.translate(-Math.round(cam), 0);
    /* ground, ledges and blocks in view */
    var a = Math.max(0, Math.floor(cam / T) - 1), b = Math.min(L.cols + 2, a + Math.ceil(VW / T) + 3);
    for (var col = a; col < b; col++) {
      var g = L.ground[col]; if (g === undefined) g = 9;
      if (g !== 99) {
        var hsh = (col * 2654435761 >>> 0) % 97;
        c.fillStyle = hsh % 2 ? '#4a3c78' : '#463873'; c.fillRect(col * T, g * T, T, (ROWS - g) * T);
        c.fillStyle = 'rgba(20,12,40,.35)'; for (var rw = g + 1; rw < ROWS; rw++) c.fillRect(col * T + ((rw + col) % 2) * 10, rw * T, 1, T);
        c.fillStyle = 'rgba(20,12,40,.25)'; for (var rw2 = g + 1; rw2 < ROWS; rw2++) c.fillRect(col * T, rw2 * T, T, 1);
        c.fillStyle = '#7d6bc4'; c.fillRect(col * T, g * T, T, 4); c.fillStyle = '#5c4b9a'; c.fillRect(col * T, g * T + 4, T, 2);
        if (hsh % 7 === 0) { c.save(); c.globalAlpha = 0.85; crystal(c, col * T + 10, g * T + 22, 0.9, hsh % 2 ? '#7fe7ff' : '#d9a8ff'); c.restore(); }   /* crystals in the rock face */
        if (L.spikes[col]) { c.fillStyle = '#b8f2ff'; for (var s = 0; s < 3; s++) { c.beginPath(); c.moveTo(col * T + s * 7 - 1, g * T); c.lineTo(col * T + s * 7 + 3, g * T - 11); c.lineTo(col * T + s * 7 + 7, g * T); c.fill(); } }
      }
      for (var r = 0; r < ROWS; r++) { var k = L.solid[col + ',' + r]; if (k === 'p') { c.fillStyle = '#5a4a90'; rr(c, col * T, r * T, T, 10, 3); c.fill(); c.fillStyle = '#7d6bc4'; c.fillRect(col * T, r * T, T, 3); } }
    }
    L.blocks.forEach(function (bk) {
      if (bk.c < a || bk.c > b) return;
      var x = bk.c * T, y = bk.r * T - (bk.bump > 0 ? Math.sin(bk.bump / 0.2 * Math.PI) * 5 : 0);
      c.fillStyle = bk.used ? '#5c5470' : '#3a7fa8'; rr(c, x, y, T, T, 4); c.fill();
      c.strokeStyle = bk.used ? '#46405a' : '#9feaff'; c.lineWidth = 1.5; c.stroke();
      if (!bk.used) { c.save(); c.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5 + bk.c); crystal(c, x + T / 2, y + T / 2 + 1, 0.95, '#d9fbff'); c.restore(); }
    });
    /* tickets */
    L.tickets.forEach(function (tk) { if (!tk.got && tk.x > cam - 20 && tk.x < cam + VW + 20) ticketShape(c, tk.x, tk.y + Math.sin(t * 4 + tk.x * 0.05) * 2, 1, Math.sin(t * 3 + tk.x) * 0.15); });
    /* critters */
    L.foes.forEach(function (f) {
      if (f.dead || f.x < cam - 30 || f.x > cam + VW + 30) return;
      if (f.k === 'slime') { var sq = 1 + Math.sin(f.t * 6) * 0.08; c.fillStyle = '#5fd36a'; c.beginPath(); c.ellipse ? c.ellipse(f.x, f.y - 7 * sq, 10 / sq, 7 * sq, 0, Math.PI, 0) : c.arc(f.x, f.y - 7, 9, Math.PI, 0); c.lineTo(f.x + 10, f.y); c.lineTo(f.x - 10, f.y); c.fill(); c.fillStyle = '#123'; c.fillRect(f.x - 5, f.y - 9, 2.5, 3); c.fillRect(f.x + 2, f.y - 9, 2.5, 3); }
      else { var by = f.y + Math.sin(f.t * 3) * 12 - 8 + 7, flap = Math.sin(f.t * 18) * 6; c.fillStyle = '#6a4c9c'; c.beginPath(); c.moveTo(f.x, by); c.lineTo(f.x - 13, by - 4 - flap); c.lineTo(f.x - 6, by + 3); c.lineTo(f.x, by + 1); c.lineTo(f.x + 6, by + 3); c.lineTo(f.x + 13, by - 4 - flap); c.closePath(); c.fill(); c.fillStyle = '#8a6cc4'; c.beginPath(); c.arc(f.x, by, 5, 0, 7); c.fill(); c.fillStyle = '#ffe27a'; c.fillRect(f.x - 3, by - 2, 2, 2); c.fillRect(f.x + 1, by - 2, 2, 2); }
    });
    /* the pet */
    var P = G.pet, run = P.ground ? Math.abs(Math.sin(t * 14)) * 2 : 0, sy = 1 - P.sq, sx = 1 + P.sq * 0.7;
    if (!(P.flash > 0 && Math.floor(t * 12) % 2)) {
      var ph = 44, pw = ph * 96 / 106, px = P.x + P.w / 2, py = P.y + P.h;
      c.save(); c.translate(px, py - run); c.scale(-sx, sy); if (!P.ground) c.rotate(P.vy < 0 ? 0.12 : -0.08);   /* side views face left: flip to run right */
      if (G.petIm) c.drawImage(G.petIm, -pw / 2, -ph, pw, ph); else { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -11, 11, 0, 7); c.fill(); }
      c.restore();
    }
    /* pops: tickets springing out, puffs, found treasure */
    G.pops = G.pops.filter(function (p) { p.t += 1 / 60; return p.t < 1; });
    G.pops.forEach(function (p) {
      var u = p.t;
      c.save(); c.globalAlpha = 1 - u;
      if (p.k === 'tix') { ticketShape(c, p.x, p.y - u * 30, p.small ? 0.8 : 1.1, 0); if (!p.small) { c.fillStyle = '#ffe27a'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText('+' + p.n, p.x + 14, p.y - u * 30 - 6); } }
      else if (p.k === 'poof') { c.fillStyle = 'rgba(255,255,255,.8)'; for (var q = 0; q < 6; q++) { c.beginPath(); c.arc(p.x + Math.cos(q) * u * 18, p.y + Math.sin(q) * u * 18, 4 * (1 - u) + 1, 0, 7); c.fill(); } }
      else if (p.k === 'item') { c.fillStyle = '#ffe27a'; crystal(c, p.x, p.y - u * 34, 1.4, '#ffe27a'); }
      c.restore();
    });
    c.restore();
  }

  /* ---------------- ending ---------------- */
  function pay(n) { if (!S || S.paid || !n) return Promise.resolve(); S.paid = true; return A().addTickets(S.pid, n, 0); }
  function stopRun() { var G = S && S.g; if (G) { G.run = false; if (G.cleanup) G.cleanup(); } clearInterval(S && S.timer); }
  function end() {
    if (!S || !S.g) return;
    var G = S.g; stopRun();
    var best = Math.max(G.best, Math.round(G.pet.x / T / 2)), prev = Number(Pz().doc(S.pid).cavBest) || 0;
    S.result = { tickets: G.tickets, items: G.items.slice(), far: Math.round(G.pet.x / T / 2), best: best, prev: prev, record: best > prev && prev > 0 };
    S.phase = 'done'; S.g = null;
    var ops = best > prev ? [{ t: 'merge', c: 'pets', id: S.pid, d: { cavBest: best } }] : [];   /* farthest ever, kept on the pet */
    pay(G.tickets).then(function () { return ops.length ? DB.commit(ops) : null; }).then(function () { C().go(); }, function (e) { C().fail(e); C().go(); });
  }
  function quit() {
    if (!S) return;
    var n = S.phase === 'play' && S.g ? S.g.tickets : 0;   /* leaving mid-run keeps what was collected */
    stopRun(); pay(n).catch(function () {});
    A().saveTime(true); S = null;
    Pz().G.room = null;
    if (window.World && window.World.W && window.World.W.P) { var P = window.World.W.P; P.y = P.ty = Math.max(1, P.y - 1); }
    C().go();
  }
  document.addEventListener('click', function (e) {
    if (!S) return;
    var b = e.target.closest ? e.target.closest('[data-cact]') : null; if (!b) return;
    var a = b.getAttribute('data-cact');
    if (a === 'quit') quit();
    else if (a === 'start' || a === 'again') { S.phase = 'play'; S.result = null; S.paid = false; C().go(); }
  });
  window.Caverns = { open: open, active: active, render: render, quit: quit, _g: function () { return S && S.g; }, _build: build };
})();
