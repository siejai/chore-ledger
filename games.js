/*
 * Hands-on pet mini-games, drawn on a canvas and played by dragging (mouse or finger). ES5.
 *   toss  (the park)   : a bucket of balls; pull back from your character and let go to throw. Bop your pet on the face 6 times.
 *   seesaw (the park)  : tap as the timing ring closes to push off; good timing sends the pet hopping high. Fill the fun meter.
 *   swing  (the park)  : swipe toward the swing as it stops beside you to push it higher; reach the three stars.
 *   bath  (home)       : drop in a bath bomb, shampoo, scrub off the mud with the sponge or brush, condition, rinse.
 *   sleep (home)       : brush teeth, fluff the pillow, pull up the blanket, turn off the light.
 * Games.mount(kind, host, o) runs one in host. o = { pet, name, petImg(mood) -> svg, kidImg() -> svg, head: {x, y, r} (pet picture
 * coordinates, viewBox -6 -34 212 234), best (see-saw best streak), done(result) }. The caller pays out when done() fires.
 */
(function () {
  'use strict';
  var VW = 400, VH = 300, cur = null, RAF = window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  var PET_VB = { x: -6, y: -34, w: 212, h: 234, gx: 100, gy: 186 }, KID_VB = { w: 120, h: 160, gy: 154 };
  function imgOf(svg) { var im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return im; }
  function ok(im) { return im && im.complete && im.naturalWidth > 0; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  /* ---------- the shared frame: canvas, a step list above it, a tool tray below ---------- */
  function mount(kind, host, o) {
    stop();
    host.innerHTML = '<div class="mg mg-' + kind + '"><div class="mg-steps"></div><div class="mg-stage"><canvas class="mg-cv"></canvas><div class="mg-say" hidden></div></div><div class="mg-tools"></div></div>';
    var g = cur = { kind: kind, host: host, o: o, cv: host.querySelector('canvas'), steps: host.querySelector('.mg-steps'), tools: host.querySelector('.mg-tools'), sayEl: host.querySelector('.mg-say'),
      t: 0, last: 0, run: true, ptr: null, parts: [], pets: {}, sayUntil: 0 };
    g.ctx = g.cv.getContext('2d');
    g.petImg = function (mood) { return g.pets[mood] || (g.pets[mood] = imgOf(o.petImg(mood))); };
    g.kid = o.kidImg ? imgOf(o.kidImg()) : null;
    size(g);
    function at(e) { var r = g.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * VW / r.width, y: (e.clientY - r.top) * VH / r.height }; }
    g.down = function (e) { if (!g.run) return; e.preventDefault(); try { g.cv.setPointerCapture(e.pointerId); } catch (er) {} var p = at(e); g.ptr = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, px: p.x, py: p.y, t0: Date.now() }; if (G[kind].down) G[kind].down(g, p); };
    g.move = function (e) { var q = g.ptr; if (!q || e.pointerId !== q.id) { if (G[kind].hover) G[kind].hover(g, at(e)); return; } e.preventDefault(); var p = at(e); q.px = q.x; q.py = q.y; q.x = p.x; q.y = p.y; if (G[kind].drag) G[kind].drag(g, q); };
    g.up = function (e) { var q = g.ptr; if (!q || e.pointerId !== q.id) return; g.ptr = null; if (G[kind].up) G[kind].up(g, q); };
    g.cv.addEventListener('pointerdown', g.down); g.cv.addEventListener('pointermove', g.move);
    g.cv.addEventListener('pointerup', g.up); g.cv.addEventListener('pointercancel', g.up);
    g.tools.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-tool]') : null; if (b && !b.disabled && G[kind].tool) G[kind].tool(g, b.getAttribute('data-tool')); });
    g.onResize = function () { size(g); }; window.addEventListener('resize', g.onResize);
    G[kind].init(g);
    RAF(loop);
  }
  function size(g) {
    var w = g.cv.parentNode.clientWidth || 340, dpr = Math.min(2, window.devicePixelRatio || 1);
    g.cv.style.width = w + 'px'; g.cv.style.height = Math.round(w * VH / VW) + 'px';
    g.cv.width = Math.round(w * dpr); g.cv.height = Math.round(w * VH / VW * dpr);
    g.k = g.cv.width / VW;
  }
  function loop(ts) {
    var g = cur; if (!g || !g.run) return;
    if (!document.body.contains(g.cv)) { stop(); return; }
    var dt = g.last ? Math.min(0.05, (ts - g.last) / 1000) : 0.016; g.last = ts; g.t += dt;
    G[g.kind].update(g, dt);
    var c = g.ctx; c.setTransform(g.k, 0, 0, g.k, 0, 0); c.clearRect(0, 0, VW, VH);
    G[g.kind].draw(g, c);
    drawParts(g, c, dt);
    if (g.sayUntil && Date.now() > g.sayUntil) { g.sayEl.hidden = true; g.sayUntil = 0; }
    RAF(loop);
  }
  function stop() { var g = cur; if (!g) return; g.run = false; window.removeEventListener('resize', g.onResize); if (g.onKey) window.removeEventListener('keydown', g.onKey); cur = null; }
  function say(g, text, ms) { g.sayEl.textContent = text; g.sayEl.hidden = false; g.sayUntil = Date.now() + (ms || 1600); }
  function finish(g, text) { if (g.over) return; g.over = true; say(g, text, 4000); if (g.kind === 'sleep') sparkle(g, 300, 120, 14, '#fff6c8'); else confetti(g, VW / 2, 120, 40); g.result = g.result || (g.kind === 'seesaw' ? { combo: g.bestCombo, hops: g.hops } : null); setTimeout(function () { if (g === cur || !g.run) { stop(); g.o.done(g.result); } else g.o.done(g.result); }, 1700); }
  /* a list of steps with ticks; the current one is highlighted */
  function stepsUi(g, list, at, hint) {
    g.steps.innerHTML = '<ol>' + list.map(function (s, i) { return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + s + '</li>'; }).join('') + '</ol>' + (hint ? '<p class="mg-hint">' + hint + '</p>' : '');
  }
  function toolsUi(g, list, on, sel) {
    g.tools.innerHTML = list.map(function (t) {
      return '<button type="button" class="mg-tool' + (t[0] === sel ? ' sel' : '') + '" data-tool="' + t[0] + '"' + (on.indexOf(t[0]) >= 0 ? '' : ' disabled') + '>' + toolIcon(t[0]) + '<span>' + t[1] + '</span></button>';
    }).join('');
  }
  function toolIcon(k) {
    var s = {
      bomb: '<circle cx="20" cy="22" r="13" fill="#c48cff"/><circle cx="15" cy="18" r="3" fill="#ffd1f0"/><circle cx="24" cy="26" r="2.5" fill="#8fe3ff"/><circle cx="25" cy="16" r="2" fill="#fff"/>',
      shampoo: '<rect x="11" y="12" width="18" height="24" rx="5" fill="#5ac8f2"/><rect x="15" y="5" width="10" height="8" rx="2" fill="#2f7fb8"/><rect x="14" y="20" width="12" height="7" rx="2" fill="#fff"/>',
      sponge: '<rect x="7" y="13" width="26" height="16" rx="6" fill="#ffd23f"/><circle cx="14" cy="19" r="2" fill="#e8b020"/><circle cx="23" cy="23" r="2.4" fill="#e8b020"/><circle cx="28" cy="17" r="1.6" fill="#e8b020"/>',
      brush: '<rect x="5" y="14" width="22" height="10" rx="4" fill="#8a5a34"/><path d="M8 24 v7 M12 24 v7 M16 24 v7 M20 24 v7 M24 24 v7" stroke="#f2e6c8" stroke-width="2"/><rect x="26" y="16" width="10" height="5" rx="2" fill="#8a5a34"/>',
      cond: '<rect x="11" y="12" width="18" height="24" rx="5" fill="#ff8fb8"/><rect x="15" y="5" width="10" height="8" rx="2" fill="#d94a7a"/><path d="M15 22 l3 3 l6 -6" stroke="#fff" stroke-width="2.5" fill="none"/>',
      shower: '<path d="M8 10 h16 a6 6 0 0 1 6 6 v4" stroke="#9aa4ad" stroke-width="4" fill="none"/><rect x="22" y="20" width="16" height="6" rx="3" fill="#c0ccd6"/><path d="M25 29 v4 M30 29 v5 M35 29 v4" stroke="#5ac8f2" stroke-width="2"/>',
      brushT: '<rect x="4" y="18" width="24" height="5" rx="2.5" fill="#5ac8f2"/><rect x="26" y="13" width="10" height="7" rx="2" fill="#ffffff" stroke="#c0ccd6"/><path d="M28 13 v-3 M31 13 v-3 M34 13 v-3" stroke="#c0ccd6" stroke-width="1.5"/>'
    }[k] || '';
    return '<svg viewBox="0 0 40 40" aria-hidden="true">' + s + '</svg>';
  }
  /* ---------- particles: bubbles, foam, sparkles, stars, feathers, drops, confetti ---------- */
  function part(g, p) { g.parts.push(p); if (g.parts.length > 260) g.parts.shift(); }
  function bubbles(g, x, y, n, col) { for (var i = 0; i < n; i++) part(g, { k: 'bub', x: x + rnd(-8, 8), y: y + rnd(-6, 6), vx: rnd(-14, 14), vy: rnd(-40, -10), r: rnd(2.5, 6), life: rnd(0.7, 1.4), age: 0, col: col || 'rgba(255,255,255,.9)' }); }
  function sparkle(g, x, y, n, col) { for (var i = 0; i < n; i++) part(g, { k: 'spk', x: x + rnd(-14, 14), y: y + rnd(-14, 14), vx: rnd(-20, 20), vy: rnd(-30, 10), r: rnd(3, 6), life: rnd(0.5, 1), age: 0, col: col || '#ffe27a' }); }
  function confetti(g, x, y, n) { var cs = ['#ff5a6e', '#5ac8f2', '#ffd23f', '#8fe36a', '#b58cff']; for (var i = 0; i < n; i++) part(g, { k: 'conf', x: x + rnd(-40, 40), y: y + rnd(-10, 10), vx: rnd(-120, 120), vy: rnd(-220, -60), r: rnd(3, 5), life: rnd(1.2, 2), age: 0, col: cs[i % 5], rot: rnd(0, 6) }); }
  function drawParts(g, c, dt) {
    var keep = [];
    g.parts.forEach(function (p) {
      p.age += dt; if (p.age > p.life) return; keep.push(p);
      var a = 1 - p.age / p.life;
      if (p.k === 'conf' || p.k === 'feather' || p.k === 'drop') p.vy += (p.k === 'feather' ? 30 : p.k === 'drop' ? 500 : 420) * dt;
      if (p.k === 'feather') p.vx *= 0.97;
      p.x += p.vx * dt; p.y += p.vy * dt;
      c.save(); c.globalAlpha = Math.min(1, a * 1.5);
      if (p.k === 'bub') { c.fillStyle = p.col; c.strokeStyle = 'rgba(150,200,230,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.3, 0, 7); c.fill(); }
      else if (p.k === 'spk') { star(c, p.x, p.y, p.r, p.col); }
      else if (p.k === 'conf') { c.translate(p.x, p.y); c.rotate(p.rot + p.age * 6); c.fillStyle = p.col; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); }
      else if (p.k === 'feather') { c.translate(p.x, p.y); c.rotate(Math.sin(p.age * 5) * 0.6); c.fillStyle = '#ffffff'; c.strokeStyle = '#d8d8e8'; c.beginPath(); c.ellipse ? c.ellipse(0, 0, 6, 2.5, 0, 0, 7) : c.arc(0, 0, 4, 0, 7); c.fill(); c.stroke(); }
      else if (p.k === 'drop') { c.fillStyle = '#7fd0f5'; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, 7); c.fill(); }
      else if (p.k === 'txt') { c.fillStyle = p.col; c.font = 'bold ' + p.r + 'px sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#fff'; c.strokeText(p.text, p.x, p.y); c.fillText(p.text, p.x, p.y); }
      else if (p.k === 'zz') { c.fillStyle = '#c9d3ff'; c.font = 'bold ' + p.r + 'px sans-serif'; c.fillText('z', p.x, p.y); }
      c.restore();
    });
    g.parts = keep;
  }
  function star(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function text(g, x, y, t, col, size) { part(g, { k: 'txt', x: x, y: y, vx: 0, vy: -40, r: size || 18, life: 1.1, age: 0, col: col || '#e8453c', text: t }); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function ell(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); if (c.ellipse) c.ellipse(x, y, rx, ry, 0, 0, 7); else { c.save(); c.translate(x, y); c.scale(1, ry / rx); c.arc(0, 0, rx, 0, 7); c.restore(); } c.fill(); }
  /* the pet picture: drawn standing on (gx, gy), h tall; returns where its head is */
  function petBox(g, gx, gy, h) {
    var w = h * PET_VB.w / PET_VB.h, x0 = gx - (PET_VB.gx - PET_VB.x) / PET_VB.w * w, y0 = gy - (PET_VB.gy - PET_VB.y) / PET_VB.h * h, hd = g.o.head || { x: 100, y: 90, r: 44 };
    return { x0: x0, y0: y0, w: w, h: h, hx: x0 + (hd.x - PET_VB.x) / PET_VB.w * w, hy: y0 + (hd.y - PET_VB.y) / PET_VB.h * h, hr: hd.r / PET_VB.h * h };
  }
  function drawPet(g, c, im, b, sx, sy, flip) {
    if (!ok(im)) { ell(c, b.hx, b.hy, b.hr, b.hr, 'rgba(255,255,255,.4)'); return; }
    c.save(); var gx = b.x0 + (PET_VB.gx - PET_VB.x) / PET_VB.w * b.w, gy = b.y0 + (PET_VB.gy - PET_VB.y) / PET_VB.h * b.h;
    c.translate(gx, gy); c.scale((flip ? -1 : 1) * (sx || 1), sy || 1); c.drawImage(im, b.x0 - gx, b.y0 - gy, b.w, b.h); c.restore();
  }
  function shadow(c, x, y, w) { ell(c, x, y, w, w * 0.18, 'rgba(0,0,0,.16)'); }

  var G = {};

  /* =================== Ball toss at the park =================== */
  var GROUND = 266, HAND = { x: 112, y: 214 }, NEED_HITS = 6;
  G.toss = {
    init: function (g) {
      g.balls = []; g.left = 12; g.hits = 0; g.aim = null; g.throwT = -9;
      g.pet = { x: 300, y: 0, vy: 0, tx: 300, next: 1.5, react: 0, mood: 'happy', h: 118, miss: 0 };
      stepsUi(g, ['Press and pull back', 'Let go to throw', 'Bop ' + g.o.name + ' on the face ' + NEED_HITS + ' times'], 0, 'Press anywhere, pull back like a slingshot and let go. The dots show where the ball will fly.');
      g.tools.innerHTML = '<div class="mg-score"><b class="mono" id="mgHits">0</b> of ' + NEED_HITS + ' bops &middot; <span class="mono" id="mgLeft">' + g.left + '</span> balls in the bucket</div>';
    },
    down: function (g, p) { if (g.over || g.left <= 0) return; g.aim = { x0: p.x, y0: p.y, x: p.x, y: p.y }; },
    drag: function (g, q) { if (g.aim) { g.aim.x = q.x; g.aim.y = q.y; } },
    up: function (g, q) {
      var a = g.aim; g.aim = null; if (!a || g.over) return;
      var v = vel(a); if (!v) return;
      g.left--; g.throwT = g.t; document.getElementById('mgLeft') && (document.getElementById('mgLeft').textContent = g.left);
      g.balls.push({ x: HAND.x, y: HAND.y, vx: v.x, vy: v.y, r: 8, hit: false, life: 0, spin: 0, col: ['#e8453c', '#3a8ed8', '#ffd23f', '#3fae6b'][g.left % 4] });
      stepsUi(g, ['Press and pull back', 'Let go to throw', 'Bop ' + g.o.name + ' on the face ' + NEED_HITS + ' times'], 2);
    },
    update: function (g, dt) {
      var P = g.pet, speed = 55 + g.hits * 14;
      /* the pet trots about and hops more as the game goes on */
      P.next -= dt;
      if (P.next <= 0) { P.tx = rnd(230, 360); P.next = rnd(0.9, 2.2) - g.hits * 0.1; if (P.y === 0 && Math.random() < 0.25 + g.hits * 0.08) P.vy = -rnd(160, 230); }
      if (Math.abs(P.tx - P.x) > 2) P.x += (P.tx > P.x ? 1 : -1) * Math.min(speed * dt, Math.abs(P.tx - P.x));
      if (P.y < 0 || P.vy) { P.vy += 700 * dt; P.y = Math.min(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0; }
      if (P.react > 0) P.react -= dt;
      var b0 = petBox(g, P.x, GROUND + P.y, P.h);
      g.balls.forEach(function (b) {
        b.life += dt; b.vy += 620 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += b.vx * dt * 0.08;
        if (b.y > GROUND - b.r + 6) { b.y = GROUND - b.r + 6; b.vy *= -0.45; b.vx *= 0.75; if (Math.abs(b.vy) < 30) b.vy = 0; }
        if (!b.hit && dist(b.x, b.y, b0.hx, b0.hy) < b0.hr * 0.95 + b.r) {
          b.hit = true; g.hits++; P.react = 0.6;
          var nx = (b.x - b0.hx), ny = (b.y - b0.hy), nl = Math.sqrt(nx * nx + ny * ny) || 1; b.vx = Math.abs(b.vx) * -0.5 + nx / nl * 60; b.vy = -Math.abs(b.vy) * 0.4 - 120;
          sparkle(g, b0.hx, b0.hy - b0.hr * 0.4, 8); text(g, b0.hx, b0.hy - b0.hr - 8, ['Bop!', 'Boop!', 'Got me!', 'Hee hee!', 'Again!', 'Yay!'][(g.hits - 1) % 6], '#e8453c', 20);
          var e = document.getElementById('mgHits'); if (e) e.textContent = g.hits;
          P.tx = rnd(230, 360); P.next = rnd(0.6, 1.2);
          if (g.hits >= NEED_HITS) finish(g, 'You bopped ' + g.o.name + ' ' + NEED_HITS + ' times! Great throwing!');
        } else if (!b.hit && b.x > b0.x0 + b0.w * 0.2 && b.x < b0.x0 + b0.w * 0.8 && b.y > b0.hy + b0.hr * 0.6 && b.y < GROUND + P.y) {
          b.hit = true; b.vx = -Math.abs(b.vx) * 0.4; text(g, b.x, b.y - 14, 'Almost!', '#3a8ed8', 15);
        }
      });
      g.balls = g.balls.filter(function (b) { return b.life < 5 && b.x > -30 && b.x < VW + 30 && !(b.vy === 0 && Math.abs(b.vx) < 4 && b.life > 1.2); });
      if (!g.over && g.left <= 0 && !g.balls.length && !g.refill) {
        g.refill = true; say(g, g.o.name + ' brings the balls back!', 1800);
        setTimeout(function () { g.left = 8; g.refill = false; var e = document.getElementById('mgLeft'); if (e) e.textContent = g.left; }, 1500);
      }
    },
    draw: function (g, c) {
      parkBg(g, c);
      /* pet */
      var P = g.pet, b = petBox(g, P.x, GROUND + P.y, P.h), sq = P.react > 0 ? 1 - 0.12 * Math.sin(P.react / 0.6 * Math.PI) : 1;
      shadow(c, P.x, GROUND + 2, 34 * (1 + P.y / 400));
      drawPet(g, c, g.petImg(P.react > 0 ? 'happy' : P.y < 0 ? 'happy' : 'ok'), b, 1 / Math.sqrt(sq), sq);
      /* kid with the bucket */
      ell(c, 30, 274, 22, 5, 'rgba(0,0,0,.15)');
      c.fillStyle = '#5a8bd8'; c.beginPath(); c.moveTo(12, 246); c.lineTo(48, 246); c.lineTo(44, 274); c.lineTo(16, 274); c.closePath(); c.fill();
      c.strokeStyle = '#3c6bb8'; c.lineWidth = 2; c.beginPath(); c.arc(30, 246, 18, Math.PI, 0); c.stroke();
      for (var k = 0; k < Math.min(g.left, 6); k++) ell(c, 18 + (k % 3) * 12, 244 - Math.floor(k / 3) * 7, 6, 6, ['#e8453c', '#3a8ed8', '#ffd23f', '#3fae6b'][k % 4]);
      shadow(c, 78, 274, 26);
      var lean = g.t - g.throwT < 0.3 ? Math.sin((g.t - g.throwT) / 0.3 * Math.PI) * 0.18 : g.aim ? -0.08 : 0;
      if (ok(g.kid)) { c.save(); c.translate(78, 274); c.rotate(lean); var kh = 116, kw = kh * KID_VB.w / KID_VB.h; c.drawImage(g.kid, -kw / 2, -kh * KID_VB.gy / KID_VB.h, kw, kh); c.restore(); }
      /* aiming: the ball in hand, the pull line and the flight dots */
      if (g.aim) {
        var v = vel(g.aim);
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(HAND.x, HAND.y); c.lineTo(HAND.x - (g.aim.x0 - g.aim.x) * 0.35, HAND.y - (g.aim.y0 - g.aim.y) * 0.35); c.stroke(); c.setLineDash([]);
        if (v) { var x = HAND.x, y = HAND.y, vx = v.x, vy = v.y; for (var s = 0; s < 22; s++) { for (var u = 0; u < 3; u++) { vy += 620 * 0.016; x += vx * 0.016; y += vy * 0.016; } if (y > GROUND) break; ell(c, x, y, 2.4, 2.4, 'rgba(255,255,255,' + (0.9 - s * 0.035) + ')'); } }
      }
      if (g.aim || (g.left > 0 && g.t - g.throwT > 0.35 && !g.over)) ballDraw(c, HAND.x, HAND.y, 8, '#e8453c', 0);
      g.balls.forEach(function (b2) { ballDraw(c, b2.x, b2.y, b2.r, b2.col, b2.spin); });
    }
  };
  /* the park: sky, hills, trees, playground behind the fence, grass */
  function parkBg(g, c, bare) {   /* bare: no slide and swings in the back (the swing game has its own) */
    var sky = c.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#8fd0f5'); sky.addColorStop(1, '#dff3ff'); c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
    ell(c, 330, 40, 22, 22, '#fff2a8'); ell(c, 80, 50, 40, 12, 'rgba(255,255,255,.8)'); ell(c, 110, 44, 26, 10, 'rgba(255,255,255,.8)');
    ell(c, 90, 210, 160, 70, '#8fd27a'); ell(c, 330, 215, 170, 70, '#7cc66a');
    [[30, 160], [370, 150], [210, 150]].forEach(function (t) { c.fillStyle = '#8a5a34'; c.fillRect(t[0] - 4, t[1], 8, 30); ell(c, t[0], t[1] - 8, 24, 24, '#3f9a52'); ell(c, t[0] - 8, t[1] - 18, 12, 12, '#56b366'); });
    if (!bare) {
    /* slide and swings in the back */
      c.strokeStyle = '#e8453c'; c.lineWidth = 4; c.beginPath(); c.moveTo(150, 186); c.lineTo(150, 146); c.moveTo(172, 186); c.lineTo(172, 146); c.stroke();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 6; c.beginPath(); c.moveTo(172, 150); c.quadraticCurveTo(205, 170, 222, 188); c.stroke();
      c.strokeStyle = '#6b7a8a'; c.lineWidth = 3; c.beginPath(); c.moveTo(250, 188); c.lineTo(262, 140); c.lineTo(302, 140); c.lineTo(314, 188); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(272, 140); c.lineTo(272 + Math.sin(g.t * 2) * 6, 172); c.moveTo(292, 140); c.lineTo(292 + Math.sin(g.t * 2 + 1) * 6, 172); c.stroke();
      c.fillStyle = '#5a8bd8'; c.fillRect(266 + Math.sin(g.t * 2) * 6, 172, 12, 3); c.fillRect(286 + Math.sin(g.t * 2 + 1) * 6, 172, 12, 3);
    }
    c.fillStyle = '#d8b07a'; for (var fx = 0; fx < VW; fx += 18) c.fillRect(fx, 182, 5, 14); c.fillRect(0, 186, VW, 3);
    var gr = c.createLinearGradient(0, 192, 0, VH); gr.addColorStop(0, '#79c968'); gr.addColorStop(1, '#5aae52'); c.fillStyle = gr; c.fillRect(0, 192, VW, VH - 192);
    c.fillStyle = 'rgba(255,255,255,.18)'; for (var i = 0; i < 18; i++) c.fillRect((i * 47) % VW, 205 + (i * 31) % 80, 3, 7);
  }
  function vel(a) {
    var dx = a.x0 - a.x, dy = a.y0 - a.y, L = Math.sqrt(dx * dx + dy * dy); if (L < 10) return null;
    var k = Math.min(L, 150) / L * 4.6; return { x: dx * k, y: dy * k };
  }
  function ballDraw(c, x, y, r, col, spin) {
    ell(c, x, y, r, r, col); c.save(); c.translate(x, y); c.rotate(spin || 0); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, r * 0.7, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.7, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); c.restore();
    ell(c, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.2, 'rgba(255,255,255,.6)');
  }

  /* =================== See-saw at the park ===================
     Your character sits on the left end, the pet on the right. When the pet lands, your end flies up; as it comes back
     down a ring closes on the spot where it will hit the ground. Tap (or press Space) as the rings meet: a well-timed push
     sends the pet high (Perfect, Great, Good), a miss is just a little hop. Streaks of Great and Perfect hop higher still,
     and stars float where a good hop can reach them. Fill the fun meter to finish. */
  var SS = { PX: 200, PY: 228, L: 160, LS: 132, TH: 10, G: 760, HMAX: 112, GOAL: 30, MAXHOPS: 26 };
  SS.TMAX = Math.asin((GROUND - SS.TH / 2 - SS.PY) / SS.L);
  var GRADES = [[0.06, 'Perfect!', 3, 1.0, '#e8453c'], [0.12, 'Great!', 2, 0.84, '#ff8a1f'], [0.2, 'Good', 1, 0.66, '#3a8ed8']];
  function ssSeat(th, side) { return { x: SS.PX + side * SS.LS * Math.cos(th), y: SS.PY - side * SS.LS * Math.sin(th) - SS.TH / 2 }; }   /* side -1 = your end, 1 = the pet's */
  function ssUi(g) {
    var e = g.tools.querySelector('.mg-meter i'); if (e) e.style.width = Math.min(100, Math.round(g.fun / SS.GOAL * 100)) + '%';
    var f = document.getElementById('mgFun'); if (f) f.textContent = Math.min(g.fun, SS.GOAL);
    var k = document.getElementById('mgCombo'); if (k) k.textContent = g.combo;
  }
  function ssDown(g) {   /* your end starts coming down; how long it takes depends on how hard the pet landed */
    g.ph = 'down'; g.t0 = g.t; g.tap = null;
    g.td = clamp(0.62 + 0.42 * (g.lastPow || 0.6) + rnd(-0.1, 0.1), 0.6, 1.15);
    if (!g.star && g.hops > 0) {   /* low stars need a Good push, middle ones a Great, the top ones a Perfect */
      var r = Math.random(), hs = (r < 0.45 ? 50 : r < 0.8 ? 85 : 110) + rnd(-6, 6);
      g.star = { x: ssSeat(SS.TMAX, 1).x + rnd(-6, 6), y: ssSeat(SS.TMAX, 1).y - 70 - hs, born: g.t };
    }
  }
  function ssTap(g) {
    if (g.over || g.tap) return;
    if (g.ph === 'down') {
      var e = (g.t - g.t0) - g.td;
      if (e < -0.2) { if (g.t - g.t0 > 0.12) { g.tap = { miss: 'Too early!' }; text(g, 70, 236, 'Too early!', '#7a8aa0', 16); } return; }
      g.tap = { e: e };
    } else if (g.ph === 'wait') { g.tap = { e: g.t - g.t0 - g.td }; ssLaunch(g); }
  }
  function ssLaunch(g) {
    var tp = g.tap, gr = null, i;
    if (tp && tp.e !== undefined) for (i = 0; i < GRADES.length; i++) if (Math.abs(tp.e) <= GRADES[i][0]) { gr = GRADES[i]; break; }
    var pow;
    if (gr) {
      g.combo = gr[2] >= 2 ? g.combo + 1 : 0; g.bestCombo = Math.max(g.bestCombo, g.combo);
      pow = Math.min(1.08, gr[3] * (1 + 0.05 * Math.min(g.combo, 5)));
      g.fun += gr[2]; text(g, 72, 232, gr[1] + (g.combo > 1 ? ' x' + g.combo : ''), gr[4], gr[2] === 3 ? 22 : 18);
      if (gr[2] === 3) { sparkle(g, 64, GROUND - 4, 8); g.flip = true; } else g.flip = false;
      g.kidPush = 0.25;
    } else {
      g.combo = 0; pow = 0.32; g.flip = false;
      text(g, 72, 232, tp && tp.miss ? 'Oops!' : 'Too late!', '#7a8aa0', 16);
    }
    g.hops++; g.lastPow = pow; g.ph = 'air'; g.th = SS.TMAX;
    var s = ssSeat(SS.TMAX, 1); g.py = s.y; g.pvy = -Math.sqrt(2 * SS.G * SS.HMAX * pow); g.air0 = g.t; g.airT = 2 * -g.pvy / SS.G;
    stepsUi(g, g.steps0, 2);
    ssUi(g);
  }
  G.seesaw = {
    init: function (g) {
      g.th = -SS.TMAX; g.ph = 'intro'; g.t0 = 0; g.hops = 0; g.fun = 0; g.combo = 0; g.bestCombo = 0; g.lastPow = 0.6; g.kidY = 0; g.kidVy = 0; g.kidPush = 0; g.star = null; g.squash = 0;
      g.steps0 = ['Watch the ring close in', 'Tap as it meets the gold ring', 'Fill the fun meter'];
      stepsUi(g, g.steps0, 0, 'Tap anywhere (or press Space) when the white ring meets the gold one. Great taps in a row send ' + g.o.name + ' higher!');
      g.tools.innerHTML = '<div class="mg-score ss-score"><div class="ss-row"><span>Fun</span><span class="mg-meter"><i style="width:0%"></i></span><span><b class="mono" id="mgFun">0</b>/' + SS.GOAL + '</span></div>' +
        '<div class="ss-sub">Streak <b class="mono" id="mgCombo">0</b>' + (g.o.best ? ' &middot; your best ' + g.o.best : '') + ' &middot; stars give +2</div></div>';
      g.onKey = function (e) { if (e.keyCode === 32 || e.keyCode === 13) { e.preventDefault(); ssTap(g); } };
      window.addEventListener('keydown', g.onKey);
      say(g, 'Get ready...', 1100);
    },
    down: function (g) { ssTap(g); },
    update: function (g, dt) {
      var u;
      if (g.ph === 'intro') { if (g.t > 1.1) { stepsUi(g, g.steps0, 1); ssDown(g); } }
      else if (g.ph === 'down') {
        u = (g.t - g.t0) / g.td;
        if (u >= 1) {
          g.th = SS.TMAX; g.squash = 0.18;
          if (g.tap) ssLaunch(g); else { g.ph = 'wait'; }
        } else g.th = -SS.TMAX + 2 * SS.TMAX * u * u;   /* speeds up as it falls */
      } else if (g.ph === 'wait') {
        if (g.t - g.t0 - g.td > 0.2) ssLaunch(g);
      } else if (g.ph === 'air') {
        g.pvy += SS.G * dt; g.py += g.pvy * dt;
        var top = ssSeat(SS.TMAX, 1).y;
        if (g.star && Math.abs(g.star.x - ssSeat(SS.TMAX, 1).x) < 32 && g.star.y >= g.py - 80 && g.star.y <= g.py - 25) {   /* the pet's head reached the star */
          sparkle(g, g.star.x, g.star.y, 12); text(g, g.star.x, g.star.y - 12, 'Star! +2', '#d4a017', 15); g.fun += 2; g.star = null; ssUi(g);
        }
        if (g.pvy > 0 && g.py >= top) {
          /* landing: the pet's end goes down, yours flies up with a little hop */
          g.ph = 'slam'; g.t0 = g.t; g.py = top; g.squash = 0.22; g.kidVy = -Math.min(170, 60 + 110 * g.lastPow); g.star = g.star && g.t - g.star.born > 6 ? null : g.star;
          if (g.fun >= SS.GOAL) finish(g, 'Wheee! ' + g.o.name + ' loved the see-saw!');
          else if (g.hops >= SS.MAXHOPS) finish(g, g.o.name + ' is all hopped out. What fun!');
        }
      } else if (g.ph === 'slam') {
        u = Math.min(1, (g.t - g.t0) / 0.2);
        g.th = SS.TMAX - 2 * SS.TMAX * (1 - (1 - u) * (1 - u));
        if (u >= 1 && !g.over) { g.th = -SS.TMAX; stepsUi(g, g.steps0, 1); ssDown(g); }
      }
      if (g.kidY < 0 || g.kidVy) { g.kidVy += 900 * dt; g.kidY = Math.min(0, g.kidY + g.kidVy * dt); if (g.kidY === 0) g.kidVy = 0; }
      if (g.squash > 0) g.squash = Math.max(0, g.squash - dt);
      if (g.kidPush > 0) g.kidPush = Math.max(0, g.kidPush - dt);
    },
    draw: function (g, c) {
      parkBg(g, c);
      var th = g.th, P = { x: SS.PX, y: SS.PY };
      /* the stand */
      c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(P.x - 22, GROUND + 2); c.lineTo(P.x, P.y - 2); c.lineTo(P.x + 22, GROUND + 2); c.closePath(); c.fill();
      c.fillStyle = '#922b21'; c.beginPath(); c.arc(P.x, P.y, 6, 0, 7); c.fill();
      shadow(c, P.x, GROUND + 3, 40);
      /* the timing rings, where your end will hit the ground */
      var hit = { x: SS.PX - SS.LS * Math.cos(SS.TMAX), y: GROUND - 1 };
      if (g.ph === 'down' || g.ph === 'wait') {
        var u = (g.t - g.t0) / g.td, rT = 15, r = Math.max(2, rT + 52 * (1 - u));
        c.save(); c.translate(hit.x, hit.y); c.scale(1, 0.42);
        c.lineWidth = 5; c.strokeStyle = '#ffd23f'; c.setLineDash([6, 4]); c.beginPath(); c.arc(0, 0, rT, 0, 7); c.stroke(); c.setLineDash([]);
        c.lineWidth = 4; c.strokeStyle = g.tap ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
        c.restore();
        if (!g.tap && u > 0.55 && u < 1.15) { c.fillStyle = '#ffffff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeText('TAP!', hit.x, hit.y + 26); c.fillText('TAP!', hit.x, hit.y + 26); }
      }
      /* the plank, with handles at both seats */
      c.save(); c.translate(P.x, P.y); c.rotate(-th);
      c.fillStyle = '#e0a458'; rr(c, -SS.L, -SS.TH / 2, SS.L * 2, SS.TH, 4); c.fill();
      c.fillStyle = '#c4883c'; c.fillRect(-SS.L + 4, SS.TH / 2 - 3, SS.L * 2 - 8, 3);
      c.strokeStyle = '#4a5560'; c.lineWidth = 3; c.beginPath(); c.moveTo(-SS.LS + 22, -SS.TH / 2); c.lineTo(-SS.LS + 22, -24); c.lineTo(-SS.LS + 34, -24); c.moveTo(SS.LS - 22, -SS.TH / 2); c.lineTo(SS.LS - 22, -24); c.lineTo(SS.LS - 34, -24); c.stroke();
      c.restore();
      /* you, on the left end */
      var ks = ssSeat(th, -1), kh = 100, kw = kh * KID_VB.w / KID_VB.h, push = g.kidPush > 0 ? Math.sin(g.kidPush / 0.25 * Math.PI) : 0;
      shadow(c, ks.x, GROUND + 2, 20);
      if (ok(g.kid)) { c.save(); c.translate(ks.x, ks.y + g.kidY); c.rotate(-th * 0.6); c.scale(1 + push * 0.08, 1 - push * 0.12); c.drawImage(g.kid, -kw / 2, -kh * KID_VB.gy / KID_VB.h, kw, kh); c.restore(); }
      /* the pet: rides its end, or flies */
      var ps = ssSeat(th, 1), py = g.ph === 'air' ? g.py : ps.y, b = petBox(g, ps.x, py, 80), sq = g.squash > 0 && g.ph !== 'air' ? 1 - 0.5 * g.squash : 1;
      shadow(c, ps.x, GROUND + 2, 28 * clamp(1 - (ps.y - py) / 300, 0.4, 1));
      var mood = g.ph === 'air' ? 'happy' : g.combo > 1 ? 'happy' : 'ok';
      if (g.ph === 'air' && g.flip) {   /* a somersault on a Perfect */
        var fr = clamp((g.t - g.air0) / g.airT, 0, 1), cy = py - b.h * 0.45;
        c.save(); c.translate(ps.x, cy); c.rotate(fr * Math.PI * 2); c.translate(-ps.x, -cy); drawPet(g, c, g.petImg(mood), b, 1, 1); c.restore();
      } else drawPet(g, c, g.petImg(mood), b, 1 / Math.sqrt(sq), sq);
      /* the star to reach */
      if (g.star) { var sy = g.star.y + Math.sin(g.t * 3) * 3; ell(c, g.star.x, sy, 14, 14, 'rgba(255,240,150,.35)'); star(c, g.star.x, sy, 11, '#ffd23f'); }
    }
  };

  /* =================== Swing at the park ===================
     The pet sits on a swing; your character stands behind it on the left. Push by swiping toward the swing (to the right)
     just as it stops beside you and turns back: Perfect, Great and Good pushes swing it higher, too early bumps it and slows
     it down. The swing slowly loses height on its own. Swing high enough to reach all three stars on the far side. */
  var SW = { PX: 200, PY: 40, L: 150, AMAX: 1.32, A0: 0.22, DECAY: 0.015, MAXPUSH: 30, STARS: [0.55, 0.85, 1.15] };
  var PUSHES = [[0.08, 'Perfect!', 0.15, '#e8453c'], [0.16, 'Great!', 0.11, '#ff8a1f'], [0.26, 'Good', 0.07, '#3a8ed8']];
  function swPeriod(A) { return 2.0 + 0.3 * A; }
  function swTheta(g) { return -g.A * Math.cos(g.phi); }   /* 0 = hanging straight down; -A = beside you (left), +A = the far side */
  function swSeat(th) { return { x: SW.PX + SW.L * Math.sin(th), y: SW.PY + SW.L * Math.cos(th) }; }
  function swErr(g) { var k = Math.round(g.phi / (Math.PI * 2)); return { k: k, e: (g.phi - k * Math.PI * 2) / (Math.PI * 2) * swPeriod(g.A) }; }   /* seconds from the nearest stop beside you */
  function swUi(g) {
    var e = g.tools.querySelector('.mg-meter i'); if (e) e.style.width = Math.round(clamp((g.A - SW.A0) / (SW.STARS[2] - SW.A0), 0, 1) * 100) + '%';
    var s = document.getElementById('mgStars'); if (s) s.innerHTML = SW.STARS.map(function (x, i) { return i < g.stars ? '&#9733;' : '&#9734;'; }).join('');
  }
  function swPush(g, dir) {
    if (g.over || g.ph !== 'swing') return;
    var r = swErr(g), i, gr = null;
    if (dir < 0) { say(g, 'Swipe the other way, toward the swing →', 1200); return; }
    if (r.k === g.pushedK) return;   /* one push each time it comes back */
    if (Math.abs(r.e) > 0.6) { text(g, 120, 200, 'Wait for it!', '#7a8aa0', 15); return; }
    g.pushedK = r.k; g.pushes++; g.pushT = g.t;
    for (i = 0; i < PUSHES.length; i++) if (Math.abs(r.e) <= PUSHES[i][0]) { gr = PUSHES[i]; break; }
    var at = swSeat(swTheta(g));
    if (gr) {
      g.A = Math.min(SW.AMAX, g.A + gr[2]); g.streak = gr[0] <= 0.16 ? g.streak + 1 : 0; g.best = Math.max(g.best, g.streak);
      text(g, at.x, at.y - 52, gr[1] + (g.streak > 1 ? ' x' + g.streak : ''), gr[3], gr[0] <= 0.08 ? 22 : 18);
      if (gr[0] <= 0.08) sparkle(g, at.x, at.y - 20, 8);
      for (i = 0; i < 4; i++) part(g, { k: 'txt', x: at.x - 18 - i * 6, y: at.y - 10 + rnd(-8, 8), vx: -60, vy: 0, r: 12, life: 0.4, age: 0, col: '#ffffff', text: '–' });
    } else if (r.e < 0) { g.A = Math.max(0.12, g.A - 0.06); g.streak = 0; text(g, at.x, at.y - 52, 'Too early!', '#7a8aa0', 16); g.bump = 0.3; }
    else { g.streak = 0; text(g, at.x, at.y - 52, 'Too late!', '#7a8aa0', 16); }
    stepsUi(g, g.steps0, 2); swUi(g);
    if (!g.over && g.pushes >= SW.MAXPUSH && g.stars < 3) { g.ph = 'done'; finish(g, g.o.name + ' had a lovely swing!'); }
  }
  G.swing = {
    init: function (g) {
      g.A = SW.A0; g.phi = 0.4; g.ph = 'swing'; g.pushes = 0; g.pushedK = null; g.stars = 0; g.streak = 0; g.best = 0; g.pushT = -9; g.bump = 0;
      g.steps0 = ['Wait for the swing to come back', 'Swipe → as it stops beside you', 'Swing up to all 3 stars'];
      stepsUi(g, g.steps0, 0, 'Push when the swing stops next to you: swipe toward it (or press →). Too early bumps it and slows it down.');
      g.tools.innerHTML = '<div class="mg-score ss-score"><div class="ss-row"><span>Height</span><span class="mg-meter"><i style="width:0%"></i></span><span class="sw-stars" id="mgStars">&#9734;&#9734;&#9734;</span></div>' +
        '<div class="ss-sub">Swipe toward the swing as it stops beside you</div></div>';
      g.onKey = function (e) { if (e.keyCode === 39 || e.keyCode === 32) { e.preventDefault(); swPush(g, 1); } else if (e.keyCode === 37) { e.preventDefault(); swPush(g, -1); } };
      window.addEventListener('keydown', g.onKey);
    },
    drag: function (g, q) {   /* a swipe counts the moment it has moved far enough, not when you let go */
      if (q.used) return;
      var dx = q.x - q.x0, dy = q.y - q.y0;
      if (Math.abs(dx) >= 22 && Math.abs(dx) > Math.abs(dy)) { q.used = true; swPush(g, dx > 0 ? 1 : -1); }
    },
    up: function (g, q) { if (!q.used && dist(q.x, q.y, q.x0, q.y0) < 10 && g.ph === 'swing') say(g, 'Swipe toward the swing \u2192 to push', 1200); },
    update: function (g, dt) {
      if (g.ph === 'done') { g.A = Math.max(0, g.A - 0.25 * dt); }
      else g.A = Math.max(0.1, g.A - SW.DECAY * dt * (g.A > 0.3 ? 1 : 0.3));
      if (g.bump > 0) g.bump -= dt;
      g.phi += Math.PI * 2 / swPeriod(g.A) * dt;
      var th = swTheta(g);
      for (var i = g.stars; i < SW.STARS.length; i++) {
        if (th >= SW.STARS[i]) {
          g.stars = i + 1; var sp = swSeat(SW.STARS[i]);
          sparkle(g, sp.x, sp.y - 30, 14); text(g, sp.x, sp.y - 50, ['Wheee!', 'Higher!', 'Up to the clouds!'][i], '#d4a017', 18); swUi(g);
          if (g.stars === SW.STARS.length && !g.over) { g.ph = 'done'; finish(g, 'Wheee! ' + g.o.name + ' swung all the way up!'); }
        } else break;
      }
      if (!g.cueSeen && g.ph === 'swing') { var r = swErr(g); if (Math.abs(r.e) < 0.4 && r.e < 0) { g.cueSeen = true; stepsUi(g, g.steps0, 1); } }
    },
    draw: function (g, c) {
      parkBg(g, c, true);
      /* the swing set from the side: two A-frame legs (the far one paler) and the end of the top bar */
      c.lineCap = 'round';
      c.strokeStyle = '#8fb0dd'; c.lineWidth = 6; c.beginPath(); c.moveTo(112, GROUND - 4); c.lineTo(SW.PX + 4, SW.PY - 2); c.lineTo(292, GROUND - 4); c.stroke();
      c.strokeStyle = '#3f6fb5'; c.lineWidth = 7; c.beginPath(); c.moveTo(96, GROUND + 3); c.lineTo(SW.PX, SW.PY); c.lineTo(304, GROUND + 3); c.stroke();
      c.lineCap = 'butt'; ell(c, SW.PX, SW.PY, 7, 7, '#2f5a99'); ell(c, SW.PX, SW.PY, 3, 3, '#c9d6ea');
      /* the stars on the far side, at the heights to reach */
      SW.STARS.forEach(function (a, i) {
        var sp = swSeat(a), sy = sp.y - 34 + Math.sin(g.t * 3 + i) * 2;
        if (i < g.stars) star(c, sp.x + 18, sy, 7, 'rgba(255,215,63,.45)');
        else { ell(c, sp.x + 18, sy, 13, 13, 'rgba(255,240,150,.35)'); star(c, sp.x + 18, sy, 10, '#ffd23f'); }
      });
      /* you, behind the swing, arms out for a moment after a push */
      var kx = 132, push = g.t - g.pushT < 0.3 ? Math.sin((g.t - g.pushT) / 0.3 * Math.PI) : 0;
      shadow(c, kx, GROUND + 2, 22);
      if (ok(g.kid)) { var kh = 104, kw = kh * KID_VB.w / KID_VB.h; c.save(); c.translate(kx + push * 8, GROUND + 2); c.rotate(push * 0.16); c.drawImage(g.kid, -kw / 2, -kh * KID_VB.gy / KID_VB.h, kw, kh); c.restore(); }
      /* the cue: a glow by your hands that is brightest when the swing stops beside you */
      var r = swErr(g), cue = g.ph === 'swing' && g.pushedK !== r.k ? clamp(1 - Math.abs(r.e + 0.02) / 0.45, 0, 1) : 0;
      if (cue > 0) {
        c.save(); c.globalAlpha = cue; c.fillStyle = '#ffffff'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.35)';
        c.strokeText('PUSH →', kx + 4, GROUND - 112); c.fillText('PUSH →', kx + 4, GROUND - 112); c.restore();
      }
      /* the swing and the pet on it */
      var th = swTheta(g) + (g.bump > 0 ? Math.sin(g.bump * 40) * 0.03 : 0), s = swSeat(th), px = Math.cos(th), py = -Math.sin(th);   /* (px, py): along the seat */
      shadow(c, s.x, GROUND + 2, 24 * clamp(1 - (GROUND - s.y) / 260, 0.35, 1));
      c.strokeStyle = '#8a8f98'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(SW.PX, SW.PY); c.lineTo(s.x - 18 * px, s.y - 18 * py); c.moveTo(SW.PX, SW.PY); c.lineTo(s.x + 18 * px, s.y + 18 * py); c.stroke();
      var b = petBox(g, 0, 0, 72), mood = g.A > 0.7 || g.t - g.pushT < 0.6 ? 'happy' : 'ok';
      c.save(); c.translate(s.x, s.y - 2); c.rotate(th * 0.85); drawPet(g, c, g.petImg(mood), b); c.restore();
      c.save(); c.translate(s.x, s.y); c.rotate(th); c.fillStyle = '#e8453c'; rr(c, -22, -3, 44, 7, 3); c.fill(); c.restore();
      /* wind lines when it is going fast */
      if (g.A > 0.6) { var sp2 = Math.abs(Math.sin(g.phi)); if (sp2 > 0.6) { c.strokeStyle = 'rgba(255,255,255,' + (sp2 - 0.6) * 1.5 + ')'; c.lineWidth = 2; var dir = Math.sin(g.phi) > 0 ? -1 : 1; for (var w = 0; w < 3; w++) { c.beginPath(); c.moveTo(s.x + dir * (28 + w * 4), s.y - 40 + w * 12); c.lineTo(s.x + dir * (48 + w * 6), s.y - 40 + w * 12); c.stroke(); } } }
    }
  };

  /* =================== Bath =================== */
  var WATER = 196;
  var BATH_STEPS = [['bomb', 'Drop in the bath bomb'], ['shampoo', 'Shampoo the head'], ['scrub', 'Scrub off the mud'], ['cond', 'Rub in conditioner'], ['shower', 'Rinse off the bubbles']];
  G.bath = {
    init: function (g) {
      g.step = 0; g.tool = null; g.prog = 0; g.water = '#8fd0ee'; g.fizz = 0; g.foam = []; g.mud = [];
      /* sit the pet in the tub with its head well above the water */
      var hd = g.o.head || { y: 90 }, H = 205; g.pgy = clamp(112 + (PET_VB.gy - hd.y) / PET_VB.h * H, 200, 300); g.ph = H;
      g.pb = petBox(g, 200, g.pgy, H);
      var b = g.pb;
      for (var i = 0; i < 6; i++) {   /* mud on the head and the top of the body, above the water */
        var a = rnd(0, Math.PI * 2), onHead = i < 3, cx = onHead ? b.hx + Math.cos(a) * b.hr * 0.55 : b.hx + rnd(-b.hr * 0.8, b.hr * 0.8), cy = onHead ? b.hy + Math.sin(a) * b.hr * 0.45 : rnd(b.hy + b.hr * 0.95, WATER - 8);
        g.mud.push({ x: cx, y: cy, r: rnd(10, 15), dirt: 1, seed: rnd(0, 6) });
      }
      bathUi(g);
    },
    tool: function (g, t) { g.tool = t; bathUi(g); },
    down: function (g, p) { g.lock = false; bathUse(g, p, 0); },
    drag: function (g, q) { bathUse(g, q, dist(q.x, q.y, q.px, q.py)); },
    up: function (g) { g.lock = false; },
    hover: function (g, p) { g.hov = p; },
    update: function (g, dt) {
      if (g.fizz > 0) { g.fizz -= dt; for (var i = 0; i < 3; i++) bubbles(g, rnd(90, 310), WATER + rnd(0, 20), 1, ['rgba(255,190,240,.9)', 'rgba(190,230,255,.9)', 'rgba(255,255,200,.9)'][i]); if (g.fizz <= 0) { g.water = '#c9b3f2'; nextStep(g); } }
      if (g.ptr && g.tool === 'shower') for (var k = 0; k < 2; k++) part(g, { k: 'drop', x: g.ptr.x + rnd(-14, 14), y: g.ptr.y + 10, vx: rnd(-10, 10), vy: rnd(40, 90), r: 2, life: 0.5, age: 0 });
    },
    draw: function (g, c) {
      /* tiles, shelf, the tub */
      c.fillStyle = '#cfe6ef'; c.fillRect(0, 0, VW, VH);
      c.strokeStyle = '#bcd8e4'; c.lineWidth = 1; for (var y = 0; y < 190; y += 24) for (var x = (y / 24) % 2 ? -12 : 0; x < VW; x += 24) c.strokeRect(x, y, 24, 24);
      c.fillStyle = '#e8d7c0'; c.fillRect(0, 230, VW, 70);
      c.fillStyle = '#b98a58'; c.fillRect(26, 60, 84, 7); c.fillStyle = '#ff8fb8'; rr(c, 32, 32, 16, 28, 5); c.fill(); c.fillStyle = '#6fc3e8'; rr(c, 56, 38, 14, 22, 4); c.fill(); ell(c, 88, 50, 10, 10, '#ffd23f');
      ell(c, 200, WATER, 168, 22, '#ffffff'); ell(c, 200, WATER + 2, 156, 14, g.water);
      var b = g.pb, bob = Math.sin(g.t * 2) * 1.5, b2 = petBox(g, 200, g.pgy + bob, g.ph);
      drawPet(g, c, g.petImg(g.step >= BATH_STEPS.length ? 'happy' : g.step >= 2 ? 'happy' : 'ok'), b2);
      /* mud, foam and conditioner shine on the pet */
      g.mud.forEach(function (m) { if (m.dirt <= 0) return; c.save(); c.globalAlpha = Math.min(1, m.dirt * 1.1); ell(c, m.x, m.y + bob, m.r, m.r * 0.8, '#7a5230'); ell(c, m.x + m.r * 0.4, m.y + bob - m.r * 0.3, m.r * 0.45, m.r * 0.4, '#8f6038'); c.restore(); });
      g.foam.forEach(function (f) { ell(c, f.x, f.y + bob, f.r, f.r * 0.85, 'rgba(255,255,255,.95)'); ell(c, f.x - f.r * 0.3, f.y + bob - f.r * 0.3, f.r * 0.3, f.r * 0.25, '#e8f6ff'); });
      if (g.shine) { c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(g.t * 5); ell(c, b.hx, b.hy, b.hr * 1.05, b.hr, '#fff6ff'); c.restore(); }
      /* the front of the tub hides the pet below the water */
      c.fillStyle = '#ffffff'; c.strokeStyle = '#b9c6d6'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, WATER); c.quadraticCurveTo(36, 288, 110, 292); c.lineTo(290, 292); c.quadraticCurveTo(364, 288, 368, WATER); c.closePath(); c.fill(); c.stroke();
      [[60, WATER, 14], [96, WATER - 4, 11], [304, WATER - 3, 12], [340, WATER, 15], [200, WATER + 4, 9]].forEach(function (u) { ell(c, u[0], u[1], u[2], u[2], 'rgba(255,255,255,.95)'); });
      /* the duck */
      ell(c, 330, WATER - 10, 12, 9, '#ffd23f'); ell(c, 340, WATER - 20, 7, 7, '#ffd23f'); c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(346, WATER - 21); c.lineTo(354, WATER - 19); c.lineTo(346, WATER - 17); c.fill(); ell(c, 342, WATER - 22, 1.5, 1.5, '#2b2233');
      if (g.dropT != null) { var dt2 = g.t - g.dropT; if (dt2 < 0.5) { var by = 60 + dt2 / 0.5 * (WATER - 60); ell(c, g.dropX, by, 12, 12, '#c48cff'); } }
      toolAt(g, c);
    }
  };
  function bathUi(g) {
    var st = BATH_STEPS[g.step], k = st ? st[0] : '';
    stepsUi(g, BATH_STEPS.map(function (s) { return s[1]; }), g.step, !st ? '' : k === 'bomb' ? 'Pick the bath bomb, then tap the water.' : k === 'shampoo' ? 'Pick the shampoo and rub it on ' + g.o.name + '’s head.' :
      k === 'scrub' ? 'Pick the sponge or the brush and scrub back and forth over the mud.' : k === 'cond' ? 'Pick the conditioner and rub it all over.' : 'Pick the shower and spray away the bubbles.');
    var on = !st ? [] : k === 'scrub' ? ['sponge', 'brush'] : [k];
    if (st && on.indexOf(g.tool) < 0) g.tool = on.length === 1 ? on[0] : g.tool;
    toolsUi(g, [['bomb', 'Bath bomb'], ['shampoo', 'Shampoo'], ['sponge', 'Sponge'], ['brush', 'Brush'], ['cond', 'Conditioner'], ['shower', 'Shower']], on, g.tool);
  }
  function nextStep(g) { g.step++; g.prog = 0; g.lock = true;   /* the next step starts with a fresh touch */ sparkle(g, g.pb.hx, g.pb.hy - g.pb.hr, 6); bathUi(g); if (g.step >= BATH_STEPS.length) { g.shine = true; finish(g, g.o.name + ' is squeaky clean!'); } }
  function bathUse(g, p, d) {
    var st = BATH_STEPS[g.step], b = g.pb; if (!st || g.over || g.lock) return;
    var k = st[0];
    if (k === 'bomb') { if (g.tool !== 'bomb' || g.fizz > 0 || g.dropT != null) return; if (p.y > WATER - 30 && p.x > 40 && p.x < 360) { g.dropT = g.t; g.dropX = p.x; setTimeout(function () { g.fizz = 2.2; bubbles(g, g.dropX, WATER, 14, 'rgba(230,180,255,.95)'); }, 500); } return; }
    if (g.tool !== k && !(k === 'scrub' && (g.tool === 'sponge' || g.tool === 'brush'))) return;
    var onHead = dist(p.x, p.y, b.hx, b.hy) < b.hr * 1.15, onPet = p.x > b.x0 + b.w * 0.15 && p.x < b.x0 + b.w * 0.85 && p.y > b.y0 + b.h * 0.05 && p.y < WATER;
    if (k === 'shampoo' && onHead) { g.prog += d; if (d > 0 && Math.random() < 0.5) { g.foam.push({ x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6), r: rnd(5, 10) }); bubbles(g, p.x, p.y, 1); } if (g.prog > 260) nextStep(g); }
    else if (k === 'scrub' && onPet) {
      var kk = g.tool === 'brush' ? 0.009 : 0.007;
      g.mud.forEach(function (m) { if (m.dirt > 0 && dist(p.x, p.y, m.x, m.y) < m.r + 12) { m.dirt -= d * kk; if (Math.random() < 0.4) bubbles(g, p.x, p.y, 1); if (m.dirt <= 0) { sparkle(g, m.x, m.y, 4, '#ffffff'); g.foam.push({ x: m.x, y: m.y, r: rnd(6, 10) }); } } });
      if (d > 0 && Math.random() < 0.25) g.foam.push({ x: p.x + rnd(-5, 5), y: p.y + rnd(-5, 5), r: rnd(4, 7) });
      if (g.mud.every(function (m) { return m.dirt <= 0; })) nextStep(g);
    } else if (k === 'cond' && onPet) { g.prog += d; if (d > 0 && Math.random() < 0.35) sparkle(g, p.x, p.y, 1, '#ffb0e0'); g.shine = true; if (g.prog > 300) nextStep(g); }
    else if (k === 'shower') {
      var before = g.foam.length; g.foam = g.foam.filter(function (f) { return !(Math.abs(f.x - p.x) < 22 && f.y > p.y); }); g.prog += d * 0.4 + (before - g.foam.length) * 8;
      if (g.prog > 160 && (!g.foam.length || g.prog > 420)) { g.foam = []; nextStep(g); }
    }
  }
  function toolAt(g, c) {
    var p = g.ptr || g.hov; if (!p || !g.tool || g.over) return;
    var x = p.x, y = p.y, wig = g.ptr ? Math.sin(g.t * 30) * 2 : 0;
    c.save(); c.translate(x + wig, y);
    if (g.tool === 'sponge') { c.fillStyle = '#ffd23f'; rr(c, -16, -10, 32, 20, 6); c.fill(); ell(c, -6, -2, 2.5, 2.5, '#e8b020'); ell(c, 6, 4, 3, 3, '#e8b020'); }
    else if (g.tool === 'brush') { c.fillStyle = '#8a5a34'; rr(c, -18, -12, 30, 12, 4); c.fill(); c.fillRect(10, -10, 16, 6); c.strokeStyle = '#f2e6c8'; c.lineWidth = 2; for (var i = -14; i < 12; i += 5) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 7); c.stroke(); } }
    else if (g.tool === 'shampoo' || g.tool === 'cond') { c.rotate(2.6); c.fillStyle = g.tool === 'shampoo' ? '#5ac8f2' : '#ff8fb8'; rr(c, -9, -14, 18, 26, 5); c.fill(); c.fillStyle = g.tool === 'shampoo' ? '#2f7fb8' : '#d94a7a'; c.fillRect(-4, -20, 8, 7); }
    else if (g.tool === 'shower') { c.fillStyle = '#c0ccd6'; rr(c, -14, -6, 28, 10, 4); c.fill(); c.strokeStyle = '#9aa4ad'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, -30); c.stroke(); }
    else if (g.tool === 'bomb') { ell(c, 0, 0, 12, 12, '#c48cff'); ell(c, -4, -3, 3, 3, '#ffd1f0'); ell(c, 4, 4, 2.5, 2.5, '#8fe3ff'); }
    else if (g.tool === 'brushT') { c.rotate(-0.3); c.fillStyle = '#5ac8f2'; rr(c, -26, -3, 30, 6, 3); c.fill(); c.fillStyle = '#fff'; rr(c, 2, -6, 12, 8, 2); c.fill(); }
    c.restore();
  }

  /* =================== Bedtime =================== */
  var BED_STEPS = ['Brush teeth', 'Fluff the pillow', 'Pull up the blanket', 'Turn off the light'];
  var BED = { x: 196, y: 186, w: 186, h: 70 }, PILLOW = { x: 336, y: 178 };
  G.sleep = {
    init: function (g) {
      g.step = 0; g.prog = 0; g.fluff = 0; g.puff = 0; g.blanket = BED.y + BED.h - 30; g.light = true; g.petX = 112; g.inBed = 0; g.tool = 'brushT'; g.dark = 0;
      bedUi(g);
    },
    tool: function (g, t) { g.tool = t; bedUi(g); },
    hover: function (g, p) { g.hov = p; },
    down: function (g, p) {
      if (g.over) return;
      g.lock = false;
      if (g.step === 1 && dist(p.x, p.y, PILLOW.x, PILLOW.y) < 34) { g.fluff++; g.puff = 0.35; for (var i = 0; i < 3; i++) part(g, { k: 'feather', x: PILLOW.x + rnd(-14, 14), y: PILLOW.y - 6, vx: rnd(-50, 50), vy: rnd(-120, -60), r: 3, life: 1.6, age: 0 }); if (g.fluff >= 5) bedNext(g); else say(g, ['Fluff!', 'Puff!', 'Fluffy!', 'One more!'][g.fluff - 1], 700); return; }
      if (g.step === 3 && (dist(p.x, p.y, 44, 150) < 40 || dist(p.x, p.y, 62, 98) < 26)) { g.light = false; for (var k = 0; k < 4; k++) setTimeout(function () { if (cur) part(cur, { k: 'zz', x: BED.x + 70 + rnd(-10, 10), y: BED.y - 30, vx: rnd(-8, 8), vy: -24, r: rnd(12, 18), life: 2, age: 0 }); }, k * 500); bedNext(g); return; }
      bedUse(g, p, 0);
    },
    drag: function (g, q) { bedUse(g, q, dist(q.x, q.y, q.px, q.py)); },
    up: function (g) { g.lock = false; },
    update: function (g, dt) {
      if (g.puff > 0) g.puff -= dt;
      if (g.step >= 2 && g.inBed < 1) g.inBed = Math.min(1, g.inBed + dt * 1.2);
      if (!g.light && g.dark < 1) g.dark = Math.min(1, g.dark + dt * 1.5);
    },
    draw: function (g, c) {
      c.fillStyle = '#5b5f9a'; c.fillRect(0, 0, VW, VH);
      c.fillStyle = '#6a6eab'; for (var x = 0; x < VW; x += 28) c.fillRect(x, 0, 12, 214);
      c.fillStyle = '#7a5a3a'; c.fillRect(0, 214, VW, 86); c.fillStyle = '#6a4c30'; for (var y = 222; y < VH; y += 16) c.fillRect(0, y, VW, 1.5);
      /* window: moon and stars */
      c.fillStyle = '#1c2148'; rr(c, 150, 26, 110, 84, 6); c.fill(); c.strokeStyle = '#c9a44c'; c.lineWidth = 5; c.stroke(); c.fillStyle = '#c9a44c'; c.fillRect(203, 26, 4, 84); c.fillRect(150, 66, 110, 4);
      ell(c, 232, 46, 12, 12, '#fff3b0'); ell(c, 238, 42, 10, 10, '#1c2148');
      [[166, 40], [186, 54], [176, 92], [240, 92], [222, 80]].forEach(function (s, i) { star(c, s[0], s[1], 2.5 + Math.sin(g.t * 3 + i) * 1, '#fff6c8'); });
      /* lamp on the nightstand, with its pull switch */
      c.fillStyle = '#8a5a34'; c.fillRect(20, 168, 50, 46); c.fillStyle = '#6a4424'; c.fillRect(20, 168, 50, 6);
      c.fillStyle = '#c9a44c'; c.fillRect(42, 128, 6, 40); c.fillStyle = g.light ? '#ffe9a8' : '#b8a878'; c.beginPath(); c.moveTo(28, 128); c.lineTo(62, 128); c.lineTo(54, 100); c.lineTo(36, 100); c.closePath(); c.fill();
      c.strokeStyle = '#c9a44c'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(56, 126); c.lineTo(58, 148); c.stroke(); ell(c, 58, 150, 3, 3, '#c9a44c');
      if (g.light) { c.save(); c.globalAlpha = 0.18 + 0.03 * Math.sin(g.t * 3); ell(c, 45, 140, 80, 60, '#fff3b0'); c.restore(); }
      /* bed: frame, mattress, pillow */
      c.fillStyle = '#8a5a34'; c.fillRect(BED.x + BED.w - 10, BED.y - 40, 12, BED.h + 40); c.fillRect(BED.x - 4, BED.y + 10, 10, BED.h - 10);
      c.fillStyle = '#f4f1ea'; rr(c, BED.x, BED.y, BED.w, BED.h - 22, 10); c.fill();
      var ps = 1 + (g.puff > 0 ? Math.sin(g.puff / 0.35 * Math.PI) * 0.18 : 0) + Math.min(g.fluff, 5) * 0.03;
      c.save(); c.translate(PILLOW.x, PILLOW.y); c.scale(ps, ps); c.fillStyle = '#ffffff'; rr(c, -30, -15, 60, 30, 13); c.fill(); c.strokeStyle = '#d8d8e8'; c.lineWidth = 1.5; c.stroke(); c.restore();
      /* the pet: brushing by the bed, then hops in */
      var t = g.inBed, gx = g.petX + (BED.x + 100 - g.petX) * t, gy = 270 - (270 - (BED.y + 34)) * t - Math.sin(t * Math.PI) * 50, h = 130 - 6 * t;
      var b = petBox(g, gx, gy, h); g.pb = b;
      drawPet(g, c, g.petImg(!g.light ? 'asleep' : g.step >= 2 ? 'lazy' : g.step === 0 && g.prog > 0 ? 'happy' : 'ok'), b);
      if (g.step === 0) { c.save(); c.globalAlpha = 0.9; (g.foamT || []).forEach(function (f) { ell(c, f.x, f.y, f.r, f.r, '#ffffff'); }); c.restore(); }
      /* blanket: dragged up from the foot of the bed */
      var col = g.o.color || '#6f93c8';
      c.fillStyle = col; rr(c, BED.x - 4, g.blanket, BED.w + 6, BED.y + BED.h - g.blanket + 4, 8); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)'; for (var q = 0; q < 6; q++) c.fillRect(BED.x + 6 + q * 30, g.blanket + 6, 16, BED.y + BED.h - g.blanket - 6);
      c.fillStyle = '#ffffff'; rr(c, BED.x - 4, g.blanket - 4, BED.w + 6, 10, 5); c.fill();
      if (g.step === 2) { c.fillStyle = 'rgba(255,255,255,.9)'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('⬆', BED.x + BED.w / 2, g.blanket - 10 + Math.sin(g.t * 6) * 3); }
      if (g.step === 1) { c.save(); c.globalAlpha = 0.5 + 0.5 * Math.sin(g.t * 6); c.strokeStyle = '#ffe27a'; c.lineWidth = 3; rr(c, PILLOW.x - 36, PILLOW.y - 20, 72, 40, 15); c.stroke(); c.restore(); }
      if (g.step === 3) { c.save(); c.globalAlpha = 0.5 + 0.5 * Math.sin(g.t * 6); c.strokeStyle = '#ffe27a'; c.lineWidth = 3; c.beginPath(); c.arc(58, 150, 9, 0, 7); c.stroke(); c.restore(); }
      if (g.dark > 0) { c.save(); c.globalAlpha = 0.62 * g.dark; c.fillStyle = '#0a0f2a'; c.fillRect(0, 0, VW, VH); c.restore(); c.save(); c.globalAlpha = 0.5 * g.dark; c.fillStyle = '#c8d4ff'; c.beginPath(); c.moveTo(150, 110); c.lineTo(260, 110); c.lineTo(330, 260); c.lineTo(180, 260); c.closePath(); c.globalAlpha = 0.12 * g.dark; c.fill(); c.restore(); }
      toolAt(g, c);
    }
  };
  function bedUi(g) {
    stepsUi(g, BED_STEPS, g.step, g.step === 0 ? 'Scrub back and forth over ' + g.o.name + '’s mouth with the toothbrush.' : g.step === 1 ? 'Tap the pillow to fluff it up.' : g.step === 2 ? 'Drag the blanket up to ' + g.o.name + '’s chin.' : g.step === 3 ? 'Tap the lamp’s pull switch.' : '');
    g.tools.innerHTML = g.step === 0 ? '<div class="mg-meter"><i style="width:' + Math.min(100, Math.round(g.prog / 3)) + '%"></i></div>' : '';
  }
  function bedNext(g) { g.step++; g.prog = 0; g.tool = null; g.lock = true; if (g.pb) sparkle(g, g.pb.hx, g.pb.hy - g.pb.hr, 5); bedUi(g); if (g.step >= BED_STEPS.length) finish(g, 'Good night, ' + g.o.name + '! Sweet dreams.'); }
  function bedUse(g, p, d) {
    if (g.over || g.lock) return;
    var b = g.pb; if (!b) return;
    if (g.step === 0) {
      var mx = b.hx, my = b.hy + b.hr * 0.45;
      if (dist(p.x, p.y, mx, my) < b.hr * 0.7) {
        g.prog += d; g.foamT = g.foamT || [];
        if (d > 0 && Math.random() < 0.4) { g.foamT.push({ x: mx + rnd(-b.hr * 0.4, b.hr * 0.4), y: my + rnd(-6, 8), r: rnd(3, 6) }); if (g.foamT.length > 24) g.foamT.shift(); bubbles(g, p.x, p.y, 1); }
        var mt = g.tools.querySelector('.mg-meter i'); if (mt) mt.style.width = Math.min(100, Math.round(g.prog / 3)) + '%';
        if (g.prog > 300) { g.foamT = []; sparkle(g, mx, my, 8, '#ffffff'); say(g, 'Sparkly clean teeth!', 1200); bedNext(g); }
      }
    } else if (g.step === 2) {
      var top = b.hy + b.hr * 0.75;
      if (p.y < g.blanket + 40 && p.y > top - 30) g.blanket = clamp(p.y, top, BED.y + BED.h - 30);
      if (g.blanket <= top + 6) { g.blanket = top; say(g, 'Snug as a bug!', 1200); bedNext(g); }
    }
  }

  window.Games = { mount: mount, stop: stop, active: function () { return !!cur; }, _g: function () { return cur; } };
})();
