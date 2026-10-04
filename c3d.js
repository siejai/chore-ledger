/*
 * Pre-rendered 3D creatures. Each species has one sheet (c3d-<id>.webp) of recolourable passes made in Blender
 * (see art/c3d.py) and an entry in C3D_META (c3dmeta.js) with the face anchors for every stage and view.
 * C3D.sprite(id, stage, palette, view) recolours the right tile with the palette and returns
 * { url, T, a: anchors, m: stage meta } or null while the sheet is still loading. ES5.
 *   views: 'front', 'side' (faces left), 'back' -> toon tiles for town; 'three' -> soft clay 3/4 for close-ups.
 */
(function () {
  'use strict';
  var META = window.C3D_META || {}, K = 0.7;
  var IMG = {}, STATE = {}, CACHE = {}, waiters = [], ncache = 0;
  var S2L = [], L2S = [];
  for (var i = 0; i < 256; i++) { var c = i / 255; S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  for (var j = 0; j <= 4096; j++) { var l = j / 4096; L2S[j] = Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)); }
  function enc(v) { return v <= 0 ? 0 : v >= 1 ? 255 : L2S[(v * 4096) | 0]; }
  function hexLin(h) { var n = parseInt(String(h).slice(1), 16); return [S2L[(n >> 16) & 255], S2L[(n >> 8) & 255], S2L[n & 255]]; }
  function notify() { var w = waiters.slice(); for (var k = 0; k < w.length; k++) try { w[k](); } catch (e) {} }
  function load(id) {
    if (STATE[id]) return;
    STATE[id] = 'loading';
    var im = new Image();
    im.onload = function () { IMG[id] = im; STATE[id] = 'ready'; notify(); };
    im.onerror = function () { STATE[id] = 'failed'; };
    im.src = 'c3d-' + id + '.webp';
  }
  /* walk cycle: c3d-<id>-walk.webp holds 4 frames (legs posed in Blender, head and body still) per walking stage x
     town view; META[id].walk = { n, st: [stages], v: cache stamp }. Loaded only when a pet of that kind walks. */
  var WIMG = {}, WSTATE = {};
  function wload(id) {
    if (WSTATE[id]) return;
    WSTATE[id] = 'loading';
    var im = new Image(), v = META[id].walk.v;
    im.onload = function () { WIMG[id] = im; WSTATE[id] = 'ready'; notify(); };
    im.onerror = function () { WSTATE[id] = 'failed'; };
    im.src = 'c3d-' + id + '-walk.webp' + (v ? '?v=' + v : '');
  }
  function walkRow(id, st, view) {
    var m = META[id], w = m && m.walk; if (!w || view === 'three' || WSTATE[id] === 'failed') return -1;
    var si = w.st.indexOf(st), vi = m.tv.indexOf(view || 'front');
    return si < 0 || vi < 0 ? -1 : si * m.tv.length + vi;
  }
  var work = null;
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  /* recolour one packed block (3 sub-tiles side by side: weights, accent/shade/line, fixed colours) into a w x h canvas.
     Clothes carry 2 more sub-tiles of fabric pattern masks (dots, stripes, plaid | stars, hearts, camo): opt = { n: 5, pat: 0..5, ink: '#hex' }
     moves that much of the cloth colour over to the pattern ink. */
  function recolour(im, sx, sy, w, h, pal, into, dx, dy, opt) {
    var n = (opt && opt.n) || 3, pat = opt && opt.pat >= 0 && n > 3 + ((opt.pat / 3) | 0) ? opt.pat : -1;
    if (!work || work.width < n * w || work.height < h) work = canvas(Math.max(n * w, work ? work.width : 0), Math.max(h, work ? work.height : 0));
    var wx = work.getContext('2d');
    wx.clearRect(0, 0, n * w, h);
    wx.drawImage(im, sx, sy, n * w, h, 0, 0, n * w, h);
    var src = wx.getImageData(0, 0, n * w, h).data, W3 = n * w * 4;
    var po = pat >= 0 ? (3 + ((pat / 3) | 0)) * w * 4 + (pat % 3) : 0, P = pat >= 0 ? hexLin(opt.ink) : null, kk = opt && opt.k ? opt.k : 1;
    var tmp = canvas(w, h), tx = tmp.getContext('2d'), od = tx.createImageData(w, h), d = od.data;
    var M = hexLin(pal.main), D = hexLin(pal.dark), L = hexLin(pal.light), A = hexLin(pal.accent);
    var dn = parseInt(String(pal.dark).slice(1), 16);
    var LC = [S2L[Math.round(((dn >> 16) & 255) * 0.42)], S2L[Math.round(((dn >> 8) & 255) * 0.42)], S2L[Math.round((dn & 255) * 0.42)]];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var a = y * W3 + x * 4, b = a + w * 4, f = b + w * 4, o = (y * w + x) * 4;
        var wm = src[a] / 255, wd = src[a + 1] / 255, wl = src[a + 2] / 255, wa = src[b] / 255, ln = src[b + 2] / 255, fa = src[f + 3] / 255;
        var cov = wm + wd + wl + wa;
        if (cov + fa + ln < 0.004) { d[o + 3] = 0; continue; }
        var sh = S2L[src[b + 1]] / K, r = 0, g = 0, bl = 0, wp = 0;
        if (pat >= 0) { wp = src[a + po] / 255 * kk; if (wp > wm) wp = wm; wm -= wp; }
        if (cov > 0) {
          r = (wm * M[0] + wd * D[0] + wl * L[0] + wa * A[0]) * sh;
          g = (wm * M[1] + wd * D[1] + wl * L[1] + wa * A[1]) * sh;
          bl = (wm * M[2] + wd * D[2] + wl * L[2] + wa * A[2]) * sh;
          if (wp > 0) { r += wp * P[0] * sh; g += wp * P[1] * sh; bl += wp * P[2] * sh; }
        }
        if (fa > 0) { r += S2L[src[f]] * fa; g += S2L[src[f + 1]] * fa; bl += S2L[src[f + 2]] * fa; }
        var al = cov + fa; if (al > 1) al = 1;
        if (ln > 0) { r = r * (1 - ln) + LC[0] * ln; g = g * (1 - ln) + LC[1] * ln; bl = bl * (1 - ln) + LC[2] * ln; al = al * (1 - ln) + ln; }
        if (al <= 0) { d[o + 3] = 0; continue; }
        d[o] = enc(r / al); d[o + 1] = enc(g / al); d[o + 2] = enc(bl / al); d[o + 3] = Math.round(al * 255);
      }
    }
    tx.putImageData(od, 0, 0);
    into.getContext('2d').drawImage(tmp, dx || 0, dy || 0);
    return into;
  }
  function compose(id, st, pal, view, frame) {
    var m = META[id], T, x0, y0, im = IMG[id];
    if (frame != null) { T = m.toon; im = WIMG[id]; x0 = (frame % m.walk.n) * 3 * T; y0 = walkRow(id, st, view) * T; }
    else if (view === 'three') { T = m.clay; x0 = 0; y0 = m.clayY + st * T; }
    else { T = m.toon; var vi = m.tv.indexOf(view); if (vi < 0) vi = 0; x0 = vi * 3 * T; y0 = st * T; }
    var out = recolour(im, x0, y0, T, T, pal, canvas(T, T), 0, 0);
    var url = '';
    try { url = out.toDataURL('image/png'); } catch (e) { url = ''; }
    return { url: url, T: T, a: m.stages[st].v[view], m: m.stages[st], canvas: out };
  }
  function sprite(id, st, pal, view, frame) {
    if (!META[id] || !pal) return null;
    st = Math.max(0, Math.min(2, st || 0)); view = view || 'three';
    if (frame != null) {   /* a walk frame, or null while its sheet loads (callers fall back to the still picture) */
      if (walkRow(id, st, view) < 0) return null;
      if (WSTATE[id] !== 'ready') { wload(id); return null; }
    } else if (STATE[id] !== 'ready') { load(id); return null; }
    var key = id + '|' + st + '|' + view + '|' + pal.main + pal.dark + pal.light + pal.accent + (frame != null ? '|w' + frame : '');
    var hit = CACHE[key];
    if (hit) return hit;
    if (ncache > 160) { CACHE = {}; ncache = 0; }
    hit = CACHE[key] = compose(id, st, pal, view, frame); ncache++;
    return hit.url ? hit : null;
  }
  /* ---------- people: stacked layers (body, top, beard, hair, hat), each recoloured with its own colour ---------- */
  var PM = window.P3D_META || null, PIMG = {}, PSTATE = {}, PCACHE = {}, npc = 0;
  var PATS = (PM && PM.pats) || ['dots', 'stripes', 'plaid', 'stars', 'hearts', 'camo'], HPATS = (PM && PM.hpats) || ['streaks', 'sides', 'tips'];
  function mix(a, b, t) {
    var x = parseInt(String(a).slice(1), 16), y = parseInt(String(b).slice(1), 16), o = '#';
    for (var k = 16; k >= 0; k -= 8) { var v = Math.round(((x >> k) & 255) * (1 - t) + ((y >> k) & 255) * t); o += (v < 16 ? '0' : '') + v.toString(16); }
    return o;
  }
  /* the creator's spin angles live in their own sheets (people-<layer>-spin.webp) so town and cards never load them */
  function sheetOf(layer, view) { return PM && PM.spin && PM.spin.indexOf(view) >= 0 ? layer + '-spin' : layer; }
  function pload(sheet) {
    if (PSTATE[sheet]) return;
    PSTATE[sheet] = 'loading';
    var im = new Image();
    im.onload = function () { PIMG[sheet] = im; PSTATE[sheet] = 'ready'; notify(); };
    im.onerror = function () { PSTATE[sheet] = 'failed'; };
    im.src = 'people-' + sheet + '.webp' + (PM.ver && PM.ver[sheet] ? '?v=' + PM.ver[sheet] : '');
  }
  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    function c(v) { v = Math.max(0, Math.min(255, v)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + c(r) + c(g) + c(b);
  }
  function person(spec, view) {
    /* spec: { h: small|medium|tall, b: slim|medium|large, top, hair, face, acc, skin, hairColor, topColor, pants (bool), bottom (pants|shorts|skirt), pantsColor,
       topPat, topInk, pantsPat, pantsInk } (colours as hex, patterns by name, 'solid' = none) */
    if (!PM || C3D.off) return null;
    var hasPants = !!(PM.layers && PM.layers.pants), hasFr = !!(PM.layers && PM.layers.fringe) && !!(spec.bangs || spec.tendrils);
    view = view || 'three';
    if (PM.spin && PM.spin.indexOf(view) >= 0 && !(PM.T && PM.T.spin)) view = 'three';
    var hasShoes = !!(PM.layers && PM.layers.shoes);
    /* Clothes Shop outfits live in their own sheet (people-topx), loaded only when someone wears one */
    var TL = PM.layers && PM.layers.topx && PM.layers.topx[spec.h + '.' + spec.b + '.' + spec.top] ? 'topx' : 'top';
    var need = ['body', TL, 'hair', 'face', 'acc'].concat(hasPants ? ['pants'] : []).concat(hasFr ? ['fringe'] : []).concat(hasShoes ? ['shoes'] : []), i;
    for (i = 0; i < need.length; i++) need[i] = sheetOf(need[i], view);
    for (i = 0; i < need.length; i++) { if (PSTATE[need[i]] === 'failed') return null; }
    var ready = true;
    for (i = 0; i < need.length; i++) if (PSTATE[need[i]] !== 'ready') { pload(need[i]); ready = false; }
    if (!ready) return false;
    var key = [spec.h, spec.b, spec.top, spec.hair, spec.face, spec.acc, spec.skin, spec.hairColor, spec.topColor, view,
      spec.pants, spec.bottom, spec.pantsColor, spec.shoes, spec.shoeColor, spec.topPat, spec.topInk, spec.pantsPat, spec.pantsInk, spec.hairFx, spec.hair2, spec.bangs, spec.tendrils].join('|');
    if (PCACHE[key]) return PCACHE[key];
    var T = view === 'three' ? PM.T.clay : PM.spin && PM.spin.indexOf(view) >= 0 ? PM.T.spin : PM.T.toon, out = canvas(T, T);
    var skin = { main: spec.skin, dark: shade(spec.skin, -38), light: shade(spec.skin, 28), accent: '#ff9aa8' };
    var top = { main: spec.topColor, dark: shade(spec.topColor, -48), light: '#f6f3ec', accent: '#ffffff' };
    var hair = { main: spec.hairColor, dark: shade(spec.hairColor, -34), light: shade(spec.hairColor, 40), accent: spec.hairColor };
    var pc = spec.pantsColor || '#3b4a6b', pants = { main: pc, dark: shade(pc, -40), light: shade(pc, 30), accent: '#ffffff' };
    function po(name, ink) { return { n: 5, pat: PATS.indexOf(name || 'solid'), ink: ink || '#ffffff' }; }
    var hb = spec.h + '.' + spec.b, parts = [['body', hb, skin]];
    var pk = hb + (spec.bottom && spec.bottom !== 'pants' ? '.' + spec.bottom : '');   // shorts / skirt sit under their own keys
    if (hasPants && !PM.layers.pants[pk]) pk = hb;
    if (hasPants && spec.pants !== false) parts.push(['pants', pk, pants, po(spec.pantsPat, spec.pantsInk)]);
    if (hasShoes) {   /* shoes are their own layer (the body has none): style + colour */
      var sk = hb + '.' + (spec.shoes || 'sneakers'); if (!PM.layers.shoes[sk]) sk = hb + '.sneakers';
      var sc = spec.shoeColor || '#2b2233';
      parts.push(['shoes', sk, { main: sc, dark: shade(sc, -40), light: shade(sc, 45), accent: '#ffffff' }]);
    }
    /* hair 2nd colour: masks in the hair sheet; a beard with grey sides goes salt-and-pepper */
    /* strength: grey at the sides and highlights are blended in softly rather than painted solid */
    var hfx = spec.hairFx ? { n: 4, pat: HPATS.indexOf(spec.hairFx), ink: spec.hair2 || '#8f8e93', k: { sides: 0.35, streaks: 0.6, tips: 0.9 }[spec.hairFx] || 1 } : null;
    var bm = hfx && spec.hairFx === 'sides' ? mix(spec.hairColor, spec.hair2, 0.18) : null;
    var beard = bm ? { main: bm, dark: shade(bm, -34), light: shade(bm, 40), accent: spec.hairColor } : hair;
    parts.push([TL, hb + '.' + spec.top, top, po(spec.topPat, spec.topInk)], ['face', spec.h + '.' + spec.face, beard], ['hair', spec.h + '.' + spec.hair, hair, hfx]);
    if (hasFr && spec.tendrils) parts.push(['fringe', spec.h + '.tendrils_' + spec.tendrils, hair, hfx ? { n: 4, pat: hfx.pat, ink: hfx.ink, k: hfx.k } : null]);
    if (hasFr && spec.bangs) parts.push(['fringe', spec.h + '.bangs_' + spec.bangs, hair, hfx ? { n: 4, pat: hfx.pat, ink: hfx.ink, k: hfx.k } : null]);
    parts.push(['acc', spec.h + '.' + spec.acc, top]);
    var SUB = PM.sub || {};
    for (i = 0; i < parts.length; i++) {
      var L = PM.layers[parts[i][0]], e = L && L[parts[i][1]], r = e && e[view], op = parts[i][3] || null, ns = SUB[parts[i][0]] || 3;
      if (!r) continue;
      if (op) op.n = ns; else if (ns !== 3) op = { n: ns, pat: -1 };
      recolour(PIMG[sheetOf(parts[i][0], view)], r[0], r[1], r[2], r[3], parts[i][2], out, r[4], r[5], op);
    }
    var url = ''; try { url = out.toDataURL('image/png'); } catch (e2) { url = ''; }
    if (!url) return null;
    if (npc > 120) { PCACHE = {}; npc = 0; }
    npc++;
    var H = PM.h[spec.h];
    var anc = H.anchors[spec.b][view] || H.anchors[spec.b].three;
    return (PCACHE[key] = { url: url, T: T, a: anc, er: H.er, span: H.span });
  }
  window.C3D = {
    person: person,
    hasPeople: function () { return !!PM && !C3D.off && PSTATE.body !== 'failed'; },
    hasHeight: function (h) { return !!(PM && PM.h && PM.h[h]); },
    /* turning a character round: front, 3/4, side, back 3/4, back, then the same mirrored */
    spinFrames: function () {
      return PM && PM.spin && PM.T && PM.T.spin ? [['c0', 0], ['three', 0], ['c90', 0], ['c150', 0], ['c180', 0], ['c150', 1], ['c90', 1], ['three', 1]] : [['three', 0]];
    },
    preloadSpin: function () { if (PM && PM.spin) for (var L in PM.layers) if (PM.layers.hasOwnProperty(L) && L !== 'topx') pload(L + '-spin'); },   /* outfits load when worn */
    has: function (id) { return !!META[id] && STATE[id] !== 'failed'; },
    ready: function (id) { return STATE[id] === 'ready'; },
    preload: function (id) { if (META[id]) load(id); },
    sprite: sprite,
    /* real leg frames for this stage? (true even while the sheet is still loading) */
    walks: function (id, st) { return !C3D.off && walkRow(id, st || 0, 'front') >= 0; },
    walkFrames: function (id) { return META[id] && META[id].walk ? META[id].walk.n : 0; },
    walkReady: function (id) { return WSTATE[id] === 'ready'; },
    preloadWalk: function (id) { if (META[id] && META[id].walk) wload(id); },
    onReady: function (fn) { waiters.push(fn); },
    off: false
  };
})();
