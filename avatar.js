/* Character art: the kids' chibi avatars and the professor. CHAR.drawAvatar(avatar) returns an SVG (viewBox 0 0 120 160). ES5. */
(function () {
  'use strict';
  var PROF = 'Professor Pennywhistle';
  /* ================= avatar (character creator) ================= */
  var AV = {
    skin: ['#ffe0c7', '#f5c9a3', '#e0a878', '#c68652', '#9a5f35', '#6b3f22'],
    /* colours are saved by index, so new ones go on the end; ORDER sets how the creator lays them out */
    hairColor: ['#2b1d16', '#5a3a22', '#a0652d', '#e0b35a', '#f2e1a8', '#c2442e', '#141317', '#43281a', '#8f8e93', '#dcdad5'],
    hairFx: ['none', 'streaks', 'sides', 'tips'],
    bangs: ['none', 'straight', 'curly'], tendrils: ['none', 'straight', 'curly'],   // own layer over any hairstyle   // hair 2nd colour: highlights, grey at the sides, ombre tips
    hair: ['short', 'spiky', 'long', 'ponytail', 'curly', 'buns', 'bun', 'wavy', 'longcurly', 'bob', 'pigtails', 'bald'],
    eyes: ['round', 'happy', 'wink'],
    top: ['tee', 'hoodie', 'dress', 'suit', 'apron'],
    face: ['none', 'shortbeard', 'beard', 'mustache', 'stubble'],
    height: ['small', 'medium', 'tall'],
    build: ['slim', 'medium', 'large'],
    topColor: ['#e45757', '#f29b38', '#f2d43a', '#4fb65f', '#3a8ed8', '#7a5fd6', '#e36fae', '#3b4252', '#7d1f3a', '#6b7a2a', '#1f8f8a', '#c4198f'],
    pantsColor: ['#3b4a6b', '#6f8fb8', '#253055', '#26262b', '#8a8f98', '#eeeae2', '#c8b48a', '#6b4a2e', '#6b7a2a', '#7d1f3a', '#c0392b', '#e88aa8', '#7a5fd6', '#1f8f8a', '#4f9a5a'],
    pattern: ['solid', 'dots', 'stripes', 'plaid', 'stars', 'hearts', 'camo'],
    acc: ['none', 'glasses', 'cap', 'bow', 'headband', 'visor']
  };
  var ORDER = {
    hairColor: [6, 0, 7, 1, 2, 5, 3, 4, 8, 9],                 // black, espresso, dark brown, brown, light brown, red, blonde, platinum, grey, silver
    topColor: [0, 8, 1, 2, 9, 3, 10, 4, 5, 11, 6, 7]           // red, burgundy, orange, yellow, olive, green, teal, blue, purple, magenta, pink, slate
  };
  function hair2Default(fx) { return AV.hairColor[fx === 'sides' ? 8 : fx === 'streaks' ? 3 : 4]; }
  /* pattern ink: white on darker cloth, a deep shade on light cloth; plaid and camo use a deep shade of the cloth itself */
  function patInk(hex, pat) {
    var n = parseInt(hex.slice(1), 16), lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    if (pat === 'plaid' || pat === 'camo') return shade(hex, lum > 120 ? -80 : -60);
    return lum > 170 ? shade(hex, -110) : '#ffffff';
  }
  var AV_LABEL = { hair: { short: 'Short', spiky: 'Messy', bob: 'Bob', pigtails: 'Pigtails & rat-tail', long: 'Long', ponytail: 'Ponytail', curly: 'Curly', buns: 'Two buns', bun: 'Top bun', wavy: 'Long & wavy', longcurly: 'Long & curly', bald: 'Bald' },
    eyes: { round: 'Round', happy: 'Happy', wink: 'Wink' }, top: { tee: 'T-shirt', hoodie: 'Hoodie', dress: 'Dress', suit: 'Suit', apron: 'Apron' },
    height: { small: 'Small', medium: 'Medium', tall: 'Tall' },
    build: { slim: 'Slim', medium: 'Medium', large: 'Large' },
    face: { none: 'None', shortbeard: 'Short beard', beard: 'Full beard', mustache: 'Mustache', stubble: 'Stubble' },
    acc: { none: 'None', glasses: 'Glasses', cap: 'Cap', bow: 'Bow', headband: 'Headband', visor: 'Visor' },
    hairFx: { none: 'None', streaks: 'Highlights', sides: 'Gray sides', tips: 'Tips' },
    bangs: { none: 'None', straight: 'Straight', curly: 'Curly' }, tendrils: { none: 'None', straight: 'Straight', curly: 'Curly' },
    pattern: { solid: 'Plain', dots: 'Polka dots', stripes: 'Stripes', plaid: 'Plaid', stars: 'Stars', hearts: 'Hearts', camo: 'Camo' } };
  function randAvatar() {
    function r(n) { return Math.floor(Math.random() * n); }
    return { skin: r(AV.skin.length), hair: AV.hair[r(6)], hairColor: r(AV.hairColor.length), eyes: 'round', top: AV.top[r(3)], topColor: r(AV.topColor.length), acc: 'none', face: 'none', height: 'small',
      pantsColor: r(AV.pantsColor.length), topPat: Math.random() < 0.3 ? AV.pattern[1 + r(AV.pattern.length - 1)] : 'solid', pantsPat: 'solid' };
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    function c(v) { v = Math.max(0, Math.min(255, v)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + c(r) + c(g) + c(b);
  }
  /* Art styles: chibi (default), sticker (bold ink outlines), soft (flat, no outlines), trainer (taller, handheld-RPG proportions).
     'pixel' draws the chibi art and the page pixelates it (see pixelate below). */
  var STYLES = ['chibi', 'sticker', 'soft', 'pixel'];
  var STYLE_LABEL = { chibi: 'Chibi', sticker: 'Sticker', soft: 'Soft', pixel: 'Pixel' };
  /* Height (handheld-RPG "trainer" proportions): small for kids, tall for grown-ups. Town sprites also scale with it. */
  var HEIGHT_T = { small: { body: 1.1, head: 0.86, cy: 44.5 }, medium: { body: 1.16, head: 0.8, cy: 41 }, tall: { body: 1.22, head: 0.74, cy: 38 } };
  var BUILD_X = { slim: 0.86, medium: 1, large: 1.15 };
  var HEIGHT_PX = { small: 0.8, medium: 0.95, tall: 1.14 };
  /* ---------- 3D characters (c3d.js people layers) with the face drawn live at the anchors ---------- */
  var TOT3 = { small: 1.86, medium: 2.04, tall: 2.28 }, U3UID = 0;
  function draw3d(a, opts) {
    if (!window.C3D || !C3D.hasPeople || !C3D.hasPeople() || (opts && opts.flat)) return null;
    var h = a.height || 'small', view = (opts && opts.view) || 'three';
    var hairK = a.hair === 'bald' ? 'none' : (a.hair || 'short');
    var faceK = a.face === 'shortbeard' || a.face === 'beard' || a.face === 'mustache' ? a.face : 'none';
    var accK = a.acc === 'cap' || a.acc === 'bow' || a.acc === 'headband' || a.acc === 'visor' ? a.acc : 'none';
    var skin = AV.skin[a.skin] || AV.skin[0], hc = AV.hairColor[a.hairColor] || AV.hairColor[0], tc = AV.topColor[a.topColor] || AV.topColor[0];
    var pc = AV.pantsColor[a.pantsColor] || AV.pantsColor[0], tp = a.topPat || 'solid', pp = a.pantsPat || 'solid';
    var fx = a.hairFx && a.hairFx !== 'none' ? a.hairFx : '', hc2 = fx ? AV.hairColor[a.hair2] || hair2Default(fx) : '';
    var p = C3D.person({ h: h, b: a.build || 'medium', top: a.top || 'tee', hair: hairK, face: faceK, acc: accK, skin: skin, hairColor: hc, topColor: tc,
      pants: a.top !== 'dress', pantsColor: pc, topPat: tp, topInk: patInk(tc, tp), pantsPat: pp, pantsInk: patInk(pc, pp), hairFx: fx, hair2: hc2,
      bangs: a.hair === 'bald' || !a.bangs || a.bangs === 'none' ? '' : a.bangs, tendrils: a.hair === 'bald' || !a.tendrils || a.tendrils === 'none' ? '' : a.tendrils }, view);
    if (p === null) return null;
    if (p === false) return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character"><ellipse cx="60" cy="154" rx="26" ry="5" fill="rgba(0,0,0,.12)"/></svg>';
    var A = p.a, T = p.T, gx = A.ground[0], gy = A.ground[1], k = (148 / TOT3[h]) * p.span / T;
    function X(px) { return 60 + (px - gx) * k; }
    function Y(py) { return 154 + (py - gy) * k; }
    function f1(n) { return Math.round(n * 10) / 10; }
    var hr = A.head[2] * k, ink = '#2b2233', hd = shade(hc, -25), id = 'av3' + (++U3UID);
    function pt(n) { var v = A[n]; if (!v || !v[4]) return null; return { x: X(v[0]), y: Y(v[1]), sx: 0.38 + 0.62 * v[2], sy: v[3], d: v[5] < 0 ? -1 : 1 }; }
    function sq(q, inner) { return '<g transform="translate(' + f1(q.x) + ' ' + f1(q.y) + ') scale(' + f1(q.sx * 100) / 100 + ' ' + f1(q.sy * 100) / 100 + ') translate(' + f1(-q.x) + ' ' + f1(-q.y) + ')">' + inner + '</g>'; }
    var e0 = pt('eye0'), e1 = pt('eye1'), m = pt('mouth'), c0 = pt('cheek0'), c1 = pt('cheek1');
    var rx = p.er[0] * hr * 1.05, ry = p.er[1] * hr * 1.05, s = '<ellipse cx="60" cy="154" rx="' + f1(hr * 0.75) + '" ry="5" fill="rgba(0,0,0,.14)"/>';
    s += '<image x="' + f1(X(0)) + '" y="' + f1(Y(0)) + '" width="' + f1(T * k) + '" height="' + f1(T * k) + '" preserveAspectRatio="none" xlink:href="' + p.url + '"/>';
    var face = '';
    /* blush sits a little in from the cheek anchor (so it stays on the face when the head is turned) and hides under a beard */
    if (faceK !== 'beard' && faceK !== 'shortbeard') [c0, c1].forEach(function (c) {
      if (!c) return;
      if (m) { c.x += (m.x - c.x) * 0.3; c.y += (m.y - c.y) * 0.12; }
      if (c.sx < 0.6) return;
      face += sq(c, '<ellipse cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" rx="' + f1(hr * 0.15) + '" ry="' + f1(hr * 0.09) + '" fill="#ff8fa3" opacity=".5"/>');
    });
    if (a.face === 'stubble' && m) face += sq(m, '<ellipse cx="' + f1(m.x) + '" cy="' + f1(m.y + hr * 0.06) + '" rx="' + f1(hr * 0.6) + '" ry="' + f1(hr * 0.28) + '" fill="' + hc + '" opacity=".28"/>');
    if (m) {
      var mw = hr * 0.16, beard = faceK !== 'none';
      face += sq(m, '<path d="M' + f1(m.x - mw) + ' ' + f1(m.y) + ' Q' + f1(m.x) + ' ' + f1(m.y + hr * 0.13) + ' ' + f1(m.x + mw) + ' ' + f1(m.y) + '" fill="none" stroke="' + (beard ? '#f6e9e0' : ink) + '" stroke-width="2" stroke-linecap="round"/>');
    }
    [e0, e1].forEach(function (e, i) {
      if (!e) return;
      var x = e.x, y = e.y, g = '';
      g += '<path d="M' + f1(x - rx * 1.1) + ' ' + f1(y - ry * 1.55) + ' Q' + f1(x) + ' ' + f1(y - ry * 2.05) + ' ' + f1(x + rx * 1.1) + ' ' + f1(y - ry * 1.55) + '" fill="none" stroke="' + (a.hair === 'bald' ? shade(hc, -10) : hd) + '" stroke-width="2.2" stroke-linecap="round"/>';
      var closed = a.eyes === 'happy' || (a.eyes === 'wink' && e.d > 0) || (opts && opts.blink);
      if (closed) g += '<path d="M' + f1(x - rx) + ' ' + f1(y + ry * 0.3) + ' Q' + f1(x) + ' ' + f1(y - ry * 1.1) + ' ' + f1(x + rx) + ' ' + f1(y + ry * 0.3) + '" fill="none" stroke="' + ink + '" stroke-width="2.8" stroke-linecap="round"/>';
      else g += '<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="' + ink + '"/><circle cx="' + f1(x - rx * 0.35) + '" cy="' + f1(y - ry * 0.38) + '" r="' + f1(rx * 0.4) + '" fill="#fff"/><circle cx="' + f1(x + rx * 0.35) + '" cy="' + f1(y + ry * 0.4) + '" r="' + f1(rx * 0.2) + '" fill="#fff"/>';
      if (a.acc === 'glasses') g += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(rx * 1.65) + '" fill="#fff" fill-opacity=".18" stroke="' + ink + '" stroke-width="2"/>';
      face += sq(e, g);
    });
    if (a.acc === 'glasses' && e0 && e1) face += '<path d="M' + f1(e0.x + rx * 1.65 * e0.sx) + ' ' + f1(e0.y) + ' L' + f1(e1.x - rx * 1.65 * e1.sx) + ' ' + f1(e1.y) + '" stroke="' + ink + '" stroke-width="2"/>';
    s += '<g class="av-face">' + face + '</g>';
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Character" class="av3d">' + s + '</svg>';
  }
  function drawAvatar(a, style, opts) {
    a = a || randAvatar();
    var d3 = draw3d(a, opts || {});
    if (d3) return d3;
    style = style || (window.CHAR && window.CHAR.style) || 'chibi';
    var skin = AV.skin[a.skin] || AV.skin[0], hc = AV.hairColor[a.hairColor] || AV.hairColor[0], tc = AV.topColor[a.topColor] || AV.topColor[0];
    var sd = shade(skin, -30), hd = shade(hc, -25), td = shade(tc, -40), ink = '#2b2233', s = '';
    var pc0 = AV.pantsColor[a.pantsColor] || AV.pantsColor[0], uid = 'avp' + (++U3UID), defs = '';
    var tPat = svgPat(uid + 't', a.topPat, patInk(tc, a.topPat)), pPat = svgPat(uid + 'p', a.pantsPat, patInk(pc0, a.pantsPat));
    defs = tPat.def + pPat.def;
    s += '<ellipse cx="60" cy="154" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>';
    var iShadow = s.length;
    // back hair
    if (a.hair === 'long') s += '<path d="M26 50 L26 104 L94 104 L94 50 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair === 'wavy') s += '<path d="M27 48 Q21 62 26 74 Q21 82 27 90 Q33 97 40 92 L80 92 Q87 97 93 90 Q99 82 94 74 Q99 62 93 48 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair === 'bob') s += '<path d="M26 54 L26 88 L94 88 L94 54 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair === 'pigtails') s += '<path d="M28 44 Q12 50 14 74 Q16 82 20 84 Q22 68 30 56 Z M92 44 Q108 50 106 74 Q104 82 100 84 Q98 68 90 56 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair === 'longcurly') [[30, 60, 10], [28, 74, 10], [30, 88, 10], [34, 100, 9], [90, 60, 10], [92, 74, 10], [90, 88, 10], [86, 100, 9], [42, 102, 9], [78, 102, 9], [60, 100, 10]].forEach(function (c) {
      s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>';
    });
    if (a.hair === 'ponytail') s += '<path d="M88 40 Q112 50 104 86 Q100 70 88 64 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/>';
    var iBack = s.length;
    // legs and shoes
    var pants = pc0, pantsD = shade(pc0, -30), shoe = '#2b2233';
    if (a.top === 'dress') s += '<path d="M47 126 h9 v20 h-9 Z M64 126 h9 v20 h-9 Z" fill="' + skin + '" stroke="' + sd + '" stroke-width="2" stroke-linejoin="round"/>';
    else s += '<path d="M43 118 h16 l-1 29 h-13 Z M61 118 h16 l-2 29 h-13 Z" fill="' + pants + '" stroke="' + pantsD + '" stroke-width="2" stroke-linejoin="round"/>' +
      (pPat.fill ? '<path d="M43 118 h16 l-1 29 h-13 Z M61 118 h16 l-2 29 h-13 Z" fill="' + pPat.fill + '"/>' : '') + '<path d="M60 120 v8" stroke="' + pantsD + '" stroke-width="2"/>';
    [[51, -1], [69, 1]].forEach(function (f) {
      var x = f[0];
      s += '<path d="M' + (x - 9) + ' 151 Q' + (x - 10) + ' 142 ' + (x - 2) + ' 142 L' + (x + 3) + ' 142 Q' + (x + 10) + ' 143 ' + (x + 10) + ' 150 Z" fill="' + shoe + '" transform="translate(' + (f[1] * 1) + ' 0)"/>';
      s += '<path d="M' + (x - 8) + ' 151 H' + (x + 10) + '" stroke="#f4f1ea" stroke-width="2" stroke-linecap="round"/><circle cx="' + (x + 2) + '" cy="145" r="1.6" fill="#fff" opacity=".35"/>';
    });
    // arms: drawn behind the body, starting inside the shoulder so they always connect
    var bare = a.top === 'tee' || a.top === 'apron' || a.top === 'dress';
    [[44, 90, 36, 102, 31, 116], [76, 90, 84, 102, 89, 116]].forEach(function (m) {
      var d = 'M' + m[0] + ' ' + m[1] + ' Q' + m[2] + ' ' + m[3] + ' ' + m[4] + ' ' + m[5];
      if (bare) {
        s += '<path d="' + d + '" fill="none" stroke="' + sd + '" stroke-width="12" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>';
        var sx = m[0] + (m[2] - m[0]) * 0.55, sy = m[1] + (m[3] - m[1]) * 0.55;
        s += '<path d="M' + m[0] + ' ' + m[1] + ' L' + sx + ' ' + sy + '" fill="none" stroke="' + td + '" stroke-width="15" stroke-linecap="round"/><path d="M' + m[0] + ' ' + m[1] + ' L' + sx + ' ' + sy + '" fill="none" stroke="' + tc + '" stroke-width="11" stroke-linecap="round"/>';
      } else {
        s += '<path d="' + d + '" fill="none" stroke="' + td + '" stroke-width="14" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + tc + '" stroke-width="10" stroke-linecap="round"/>';
        if (a.top === 'suit') s += '<circle cx="' + m[4] + '" cy="' + (m[5] - 3) + '" r="5.5" fill="#fafafa"/>';
      }
      s += '<circle cx="' + m[4] + '" cy="' + (m[5] + 2) + '" r="5.5" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/>';
    });
    // body
    var torso = a.top === 'dress' ? 'M44 83 Q60 78 76 83 Q84 86 84 95 Q83 100 79 105 L89 134 Q60 141 31 134 L41 105 Q37 100 36 95 Q36 86 44 83 Z' : 'M44 83 Q60 78 76 83 Q84 86 85 96 Q81 108 83 122 Q60 128 37 122 Q39 108 35 96 Q36 86 44 83 Z';
    s += '<path d="' + torso + '" fill="' + tc + '" stroke="' + td + '" stroke-width="2.2" stroke-linejoin="round"/>';
    if (tPat.fill) s += '<path d="' + torso + '" fill="' + tPat.fill + '"/>';
    s += '<path d="' + (a.top === 'dress' ? 'M74 84 Q84 86 85 96 L93 132 Q86 135 78 136 Q80 106 74 84 Z' : 'M74 84 Q84 86 85 96 L83 122 Q78 124 72 125 Q77 104 74 84 Z') + '" fill="#000" opacity=".1"/>';
    s += '<path d="M44 86 Q52 83 58 83" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".3"/>';
    if (a.top === 'dress') s += '<path d="M41 104 Q60 109 79 104" fill="none" stroke="' + td + '" stroke-width="4" stroke-linecap="round"/>';
    if (a.top === 'hoodie') s += '<path d="M46 84 Q60 100 74 84" fill="' + shade(tc, -18) + '" stroke="' + td + '" stroke-width="2"/><path d="M55 92 v10 M65 92 v10" stroke="#f4f1ea" stroke-width="2" stroke-linecap="round"/><path d="M46 106 h28 l-3 12 h-22 Z" fill="' + shade(tc, -18) + '" stroke="' + td + '" stroke-width="1.8" stroke-linejoin="round"/>';
    if (a.top === 'tee' || a.top === 'apron') s += '<path d="M52 82 Q60 90 68 82" fill="' + skin + '" stroke="' + td + '" stroke-width="2"/>';
    if (a.top === 'suit') s += '<path d="M50 82 L60 104 L70 82 Z" fill="#fafafa"/><path d="M57 86 L63 86 L64 110 L60 115 L56 110 Z" fill="' + td + '"/><path d="M47 83 L58 104 L50 110 Z M73 83 L62 104 L70 110 Z" fill="' + shade(tc, -22) + '" stroke="' + td + '" stroke-width="1.5" stroke-linejoin="round"/><circle cx="55" cy="116" r="1.6" fill="' + td + '"/><circle cx="65" cy="116" r="1.6" fill="' + td + '"/>';
    if (a.top === 'apron') s += '<path d="M46 94 L74 94 L78 125 Q60 130 42 125 Z" fill="#f7f3ea" stroke="#cfc6b4" stroke-width="1.6" stroke-linejoin="round"/><path d="M49 94 L52 83 M71 94 L68 83" stroke="#cfc6b4" stroke-width="2"/><rect x="53" y="104" width="14" height="9" rx="2" fill="none" stroke="#cfc6b4" stroke-width="1.5"/>';
    // neck
    s += '<path d="M53 74 h14 v9 q-7 3 -14 0 Z" fill="' + skin + '"/><path d="M53 80 q7 4 14 0" fill="none" stroke="' + sd + '" stroke-width="2" opacity=".6"/>';
    var iBody = s.length;
    // head
    s += '<circle cx="29" cy="58" r="6" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/><circle cx="91" cy="58" r="6" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/>';
    s += '<circle cx="60" cy="54" r="32" fill="' + skin + '" stroke="' + sd + '" stroke-width="2.2"/>';
    // front hair
    var front = {
      short: 'M28 56 Q26 20 60 20 Q94 20 92 56 Q88 40 74 36 Q66 44 52 38 Q38 42 28 56 Z',
      spiky: 'M27 60 Q22 40 32 30 Q36 18 50 20 Q56 12 66 17 Q78 14 85 25 Q96 33 93 60 Q90 47 84 43 Q85 51 78 52 Q74 42 67 41 Q66 49 58 47 Q55 40 47 43 Q45 51 38 50 Q38 44 34 46 Q30 51 27 60 Z',
      bob: 'M26 64 L26 36 Q30 20 60 20 Q90 20 94 36 L94 64 L89 64 L89 44 L31 44 L31 64 Z',
      pigtails: 'M28 56 Q26 20 60 20 Q94 20 92 56 Q84 36 60 34 Q36 36 28 56 Z',
      long: 'M26 64 L26 36 Q30 20 60 20 Q90 20 94 36 L94 64 L88 64 L88 34 L32 34 L32 64 Z',
      ponytail: 'M28 56 Q26 20 60 20 Q94 20 92 56 Q80 36 60 36 Q40 36 28 56 Z',
      curly: '',
      buns: 'M28 56 Q26 22 60 22 Q94 22 92 56 Q84 38 60 38 Q36 38 28 56 Z',
      bun: 'M28 56 Q26 22 60 22 Q94 22 92 56 Q84 38 60 38 Q36 38 28 56 Z',
      longcurly: '',
      wavy: 'M27 62 Q21 44 32 30 Q44 16 62 19 Q80 17 90 30 Q99 44 93 62 Q88 72 95 84 Q97 95 87 95 Q82 92 86 84 Q90 74 86 60 Q84 44 72 36 Q64 45 48 40 Q38 44 34 60 Q30 74 34 84 Q38 92 33 95 Q23 95 25 84 Q32 72 27 62 Z',
      bald: 'M28 62 Q26 50 31 42 Q33 52 35 62 Z M92 62 Q94 50 89 42 Q87 52 85 62 Z'
    };
    if (a.hair === 'curly' || a.hair === 'longcurly') {
      [[32, 44, 10], [40, 30, 11], [54, 23, 11], [68, 23, 11], [81, 30, 11], [89, 44, 10], [60, 34, 8], [46, 38, 8], [74, 38, 8]].forEach(function (c) {
        s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>';
      });
    } else s += '<path d="' + front[a.hair || 'short'] + '" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair !== 'bald') {
      if (a.bangs === 'straight') s += '<path d="M33 44 L87 44 L87 32 Q60 20 33 32 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
      if (a.bangs === 'curly') [36, 45, 54, 63, 72, 81].forEach(function (x, i) { s += '<circle cx="' + x + '" cy="' + (38 + (i % 2) * 3) + '" r="6.5" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>'; });
      if (a.tendrils === 'straight') s += '<path d="M31 48 Q34 64 30 82 M89 48 Q86 64 90 82" fill="none" stroke="' + hc + '" stroke-width="3.5" stroke-linecap="round"/>';
      if (a.tendrils === 'curly') [[31, 52], [29, 59], [32, 66], [29, 73], [31, 80], [89, 52], [91, 59], [88, 66], [91, 73], [89, 80]].forEach(function (c) { s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="3.6" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.2"/>'; });
    }
    var fx2 = a.hairFx && a.hairFx !== 'none' && a.hair !== 'bald' ? a.hairFx : '', h2 = fx2 ? AV.hairColor[a.hair2] || hair2Default(fx2) : '';
    if (fx2 === 'sides') s += '<path d="M27 58 Q26 46 31 40 Q33 50 34 60 Z M93 58 Q94 46 89 40 Q87 50 86 60 Z" fill="' + h2 + '" opacity=".9"/>';
    if (fx2 === 'streaks') s += '<path d="M42 24 Q38 34 36 46 M54 21 Q51 30 50 38 M68 21 Q71 30 72 38 M80 26 Q84 36 86 46" fill="none" stroke="' + h2 + '" stroke-width="3" stroke-linecap="round" opacity=".85"/>';
    if (a.hair === 'wavy') s += '<path d="M40 29 Q46 35 43 43 M58 22 Q64 28 61 35 M78 26 Q85 33 82 42 M29 68 Q33 76 28 86 M91 68 Q87 76 92 86" fill="none" stroke="' + hd + '" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>';
    if (a.hair === 'bun') s += '<circle cx="60" cy="15" r="11" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/><path d="M52 12 Q60 8 68 12 M53 18 Q60 14 67 18" fill="none" stroke="' + hd + '" stroke-width="1.5" stroke-linecap="round" opacity=".7"/><path d="M51 24 Q60 28 69 24" fill="none" stroke="' + tc + '" stroke-width="4" stroke-linecap="round"/>';
    if (a.hair === 'buns') s += '<circle cx="34" cy="24" r="10" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/><circle cx="86" cy="24" r="10" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/>';
    // hair shine
    if (a.hair !== 'bald' && a.hair !== 'curly' && a.hair !== 'longcurly') s += '<path d="M40 28 Q48 22 58 22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".28"/>';
    if (a.hair === 'bald') s += '<path d="M44 30 Q52 24 62 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>';
    // face
    var brow = a.hair === 'bald' ? shade(hc, -10) : hd;
    s += '<path d="M41 49 Q47 45 53 48 M67 48 Q73 45 79 49" fill="none" stroke="' + brow + '" stroke-width="2.4" stroke-linecap="round"/>';
    if (a.eyes === 'happy') s += '<path d="M42 60 Q48 52 54 60 M66 60 Q72 52 78 60" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    else if (a.eyes === 'wink') s += '<ellipse cx="48" cy="59" rx="5" ry="6.2" fill="' + ink + '"/><circle cx="46.2" cy="56.6" r="2" fill="#fff"/><circle cx="49.8" cy="61.6" r="1" fill="#fff"/><path d="M66 60 Q72 54 78 60" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    else s += '<ellipse cx="48" cy="59" rx="5" ry="6.2" fill="' + ink + '"/><ellipse cx="72" cy="59" rx="5" ry="6.2" fill="' + ink + '"/><circle cx="46.2" cy="56.6" r="2" fill="#fff"/><circle cx="70.2" cy="56.6" r="2" fill="#fff"/><circle cx="49.8" cy="61.6" r="1" fill="#fff"/><circle cx="73.8" cy="61.6" r="1" fill="#fff"/>';
    s += '<path d="M58.3 65.5 Q60 67.5 61.7 65.5" fill="none" stroke="' + sd + '" stroke-width="1.8" stroke-linecap="round"/>';
    s += '<ellipse cx="40" cy="69" rx="5" ry="3" fill="#ff8fa3" opacity=".5"/><ellipse cx="80" cy="69" rx="5" ry="3" fill="#ff8fa3" opacity=".5"/>';
    if (a.face === 'stubble') s += '<path d="M32 66 Q34 88 60 90 Q86 88 88 66 Q80 80 60 80 Q40 80 32 66 Z" fill="' + hc + '" opacity=".28"/>';
    if (a.face === 'beard') s += '<path d="M29 58 Q28 94 60 97 Q92 94 91 58 Q86 74 74 77 Q60 82 46 77 Q34 74 29 58 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.face === 'shortbeard') s += '<path d="M30 60 Q30 86 60 89 Q90 86 90 60 Q86 72 75 76 Q60 80 45 76 Q34 72 30 60 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.face === 'beard' || a.face === 'mustache' || a.face === 'shortbeard') s += '<path d="M45 71 Q52 64 60 69 Q68 64 75 71 Q68 75 60 72 Q52 75 45 71 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>';
    s += '<path d="M53 ' + (a.face && a.face !== 'none' && a.face !== 'stubble' ? 76 : 72) + ' Q60 ' + (a.face && a.face !== 'none' && a.face !== 'stubble' ? 81 : 78) + ' 67 ' + (a.face && a.face !== 'none' && a.face !== 'stubble' ? 76 : 72) + '" fill="none" stroke="' + (a.face === 'beard' || a.face === 'shortbeard' ? '#fff' : ink) + '" stroke-width="2.5" stroke-linecap="round"/>';
    // accessories
    if (a.acc === 'glasses') s += '<circle cx="48" cy="59" r="8" fill="none" stroke="' + ink + '" stroke-width="2.2"/><circle cx="72" cy="59" r="8" fill="none" stroke="' + ink + '" stroke-width="2.2"/><path d="M56 59 L64 59" stroke="' + ink + '" stroke-width="2.2"/>';
    if (a.acc === 'cap') s += '<path d="M28 44 Q30 16 60 16 Q90 16 92 44 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="2"/><path d="M60 40 Q88 38 104 44 Q90 48 60 46 Z" fill="' + td + '"/>';
    if (a.acc === 'bow') s += '<path d="M70 22 L84 14 L84 32 Z M70 22 L56 14 L56 32 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="1.5" transform="translate(8 0)"/><circle cx="78" cy="23" r="4" fill="' + td + '"/>';
    if (a.acc === 'visor') s += '<path d="M29 40 Q60 26 91 40" fill="none" stroke="#2f7a4a" stroke-width="4"/><path d="M34 40 Q60 30 86 40 Q78 52 60 52 Q42 52 34 40 Z" fill="#3fa65c" fill-opacity=".75" stroke="#2f7a4a" stroke-width="2"/>';
    if (a.acc === 'headband') s += '<path d="M29 42 Q60 14 91 42" fill="none" stroke="' + tc + '" stroke-width="6" stroke-linecap="round"/>';
    var outline = [sd, td, hd, pantsD, '#cfc6b4', '#2f7a4a', brow, shade(tc, -40)];
    function restyle(str) {
      if (style === 'sticker') {
        str = str.replace(/stroke="(#[0-9a-f]{6})"/gi, function (m, c) { return outline.indexOf(c.toLowerCase()) >= 0 ? 'stroke="' + ink + '"' : m; });
        str = str.replace(/stroke-width="([\d.]+)"/g, function (m, w) { w = Number(w); return w < 5 ? 'stroke-width="' + (w * 1.6).toFixed(1) + '"' : m; });
      }
      if (style === 'soft') {
        str = str.replace(/<(path|circle|ellipse|rect)\b[^>]*>/g, function (el) {
          if (/fill="none"/.test(el)) { var m = el.match(/stroke="(#[0-9a-f]{6})"/i), w = el.match(/stroke-width="([\d.]+)"/); return m && outline.indexOf(m[1].toLowerCase()) >= 0 && w && Number(w[1]) >= 10 ? '' : el; }
          return el.replace(/ stroke="[^"]*"/, '').replace(/ stroke-width="[^"]*"/, '');
        });
      }
      return str;
    }
    var shadowPart = s.slice(0, iShadow), back = restyle(s.slice(iShadow, iBack)), body = restyle(s.slice(iBack, iBody)), head = restyle(s.slice(iBody));
    var headT = '', bodyT = '';
    var ht = HEIGHT_T[a.height] || HEIGHT_T.small;
    var bx = BUILD_X[a.build] || 1;
    if (ht) { bodyT = ' transform="translate(60 152) scale(' + bx + ' ' + ht.body + ') translate(-60 -152)"'; headT = ' transform="translate(60 ' + ht.cy + ') scale(' + ht.head + ') translate(-60 -54)"'; }
    var inner = (defs ? '<defs>' + defs + '</defs>' : '') + shadowPart + '<g' + headT + '>' + back + '</g><g' + bodyT + '>' + body + '</g><g' + headT + '>' + head + '</g>';
    if (style === 'sticker') inner = '<defs><filter id="stk" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/><feFlood flood-color="#ffffff"/><feComposite in2="d" operator="in" result="w"/><feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#stk)">' + inner + '</g>';
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character"' + (style === 'pixel' ? ' data-pixel="1"' : '') + '>' + inner + '</svg>';
  }

  /* flat-art fabric patterns (used only when the 3D sheets can't load) */
  function svgPat(id, pat, inkc) {
    var t = { dots: [8, '<circle cx="4" cy="4" r="1.7"/>'], stripes: [6, '<rect x="0" y="0" width="6" height="2.6"/>'],
      plaid: [9, '<rect x="0" y="0" width="9" height="2.2" opacity=".55"/><rect x="0" y="0" width="2.2" height="9" opacity=".55"/>'],
      stars: [10, '<path d="M5 1.2 L6.1 4 L9 4.1 L6.7 5.9 L7.5 8.8 L5 7.1 L2.5 8.8 L3.3 5.9 L1 4.1 L3.9 4 Z"/>'],
      hearts: [10, '<path d="M5 8.4 C1.5 6 1.2 3.4 3 2.6 C4 2.2 4.7 2.8 5 3.4 C5.3 2.8 6 2.2 7 2.6 C8.8 3.4 8.5 6 5 8.4 Z"/>'],
      camo: [18, '<path d="M2 3 Q6 0 9 4 Q11 8 6 8 Q1 8 2 3 Z M11 11 Q15 9 17 13 Q16 17 12 16 Q9 14 11 11 Z" opacity=".6"/><path d="M12 2 Q16 1 16 5 Q13 7 11 5 Z M1 12 Q5 11 6 15 Q3 18 1 15 Z"/>'] }[pat];
    if (!t) return { def: '', fill: '' };
    return { def: '<pattern id="' + id + '" width="' + t[0] + '" height="' + t[0] + '" patternUnits="userSpaceOnUse"><g fill="' + inkc + '">' + t[1] + '</g></pattern>', fill: 'url(#' + id + ')' };
  }
  function professorSvg() {
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + PROF + '">' +
      '<ellipse cx="60" cy="154" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>' +
      '<path d="M34 86 Q60 76 86 86 L94 148 L26 148 Z" fill="#f4f4f0" stroke="#b9b9b0" stroke-width="2"/>' +
      '<path d="M52 84 L60 108 L68 84" fill="#5a7bd6"/><path d="M60 86 L56 128 M60 86 L64 128" stroke="#b9b9b0" stroke-width="2"/>' +
      '<rect x="68" y="108" width="12" height="16" rx="2" fill="#dfe6f5" stroke="#b9b9b0"/>' +
      '<circle cx="60" cy="54" r="30" fill="#f1c9a5" stroke="#d09a72" stroke-width="2"/>' +
      '<path d="M30 50 Q28 26 44 30 Q46 20 60 24 Q74 20 76 30 Q92 26 90 50 Q84 38 76 40 Q70 32 60 36 Q50 32 44 40 Q36 38 30 50 Z" fill="#e9e9ee" stroke="#b8b8c4" stroke-width="2"/>' +
      '<circle cx="48" cy="56" r="8" fill="#fff" fill-opacity=".4" stroke="#5a4a3a" stroke-width="2.4"/><circle cx="72" cy="56" r="8" fill="#fff" fill-opacity=".4" stroke="#5a4a3a" stroke-width="2.4"/><path d="M56 56 L64 56" stroke="#5a4a3a" stroke-width="2.4"/>' +
      '<circle cx="48" cy="57" r="3" fill="#2b2233"/><circle cx="72" cy="57" r="3" fill="#2b2233"/>' +
      '<path d="M44 72 Q52 66 60 70 Q68 66 76 72 Q68 78 60 74 Q52 78 44 72 Z" fill="#e9e9ee" stroke="#b8b8c4" stroke-width="1.5"/>' +
      '<ellipse cx="38" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/><ellipse cx="82" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/></svg>';
  }
  window.CHAR = { hair2Default: hair2Default, HEIGHT_PX: HEIGHT_PX, STYLES: STYLES, STYLE_LABEL: STYLE_LABEL, style: 'chibi', AV: AV, AV_LABEL: AV_LABEL, ORDER: ORDER, patInk: patInk, randAvatar: randAvatar, drawAvatar: drawAvatar, professorSvg: professorSvg, PROF: PROF };
})();
