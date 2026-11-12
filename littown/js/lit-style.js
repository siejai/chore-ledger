/* Lit Town style lab: one generator that draws every style option from the same rig (ES5).
 * Everything is flat fills and plain strokes: no filters, masks, gradients, clipPaths or SMIL.
 * mode 'class': colours come from CSS variables (what the app would ship)
 * mode 'bake' : colours written into fill/stroke attributes (for previews and old WebViews) */
var LAB = (function () {
  'use strict';
  var INK = '#3B2F45', PAPER = '#FFFDF7', CHEEK = '#FF8FA3', MOUTH = '#7A2E3B', TONGUE = '#FF7A6B', TEAR = '#8FD3FF';
  var RAINBOW = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA'];

  /* ---------- numbers and colours ---------- */
  function n(v) { var r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r); }
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; } return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hex(c) { return '#' + c.map(function (v) { var s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? '0' + s : s; }).join('').toUpperCase(); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function hsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4);
      h /= 6;
    }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    function f(p, q, t) { if (t < 0) { t += 1; } if (t > 1) { t -= 1; } if (t < 1 / 6) { return p + (q - p) * 6 * t; } if (t < 1 / 2) { return q; } if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; } return p; }
    if (!s) { return hex([l * 255, l * 255, l * 255]); }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return hex([f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]);
  }
  function shift(c, dl, ds) { var x = hsl(rgb(c)); return fromHsl(x[0], Math.max(0, Math.min(1, x[1] * ds)), Math.max(0, Math.min(0.96, x[2] + dl))); }
  /** the shade slider: pct -0.5 (half way to black) .. +0.5 (half way to white), same hue */
  function tint(c, pct) {
    if (!pct) { return c.toUpperCase(); }
    /* darker: blend toward a deep warm brown (skin and hair stay natural); lighter: toward white */
    return pct < 0 ? mix(c, '#24161A', -pct) : mix(c, '#FFFFFF', pct);
  }
  /* outline: much darker; shade: a little darker; highlight: lighter, same hue */
  function dk(c) { var l = hsl(rgb(c))[2]; return mix(shift(c, -Math.min(0.24, l * 0.4), 0.8), '#3B2F45', 0.18); }
  function sh(c) { return mix(shift(c, -0.06, 0.95), '#7B5E8C', 0.1); }
  function hi(c) { var l = hsl(rgb(c))[2]; return shift(c, l < 0.3 ? 0.2 : 0.14, 1.08); }

  /* the colour slots a character can be recoloured with */
  var KEYS = ['skin', 'hair', 'dye', 'freckle', 'eye', 'eye2', 'makeup', 'jewel', 'lip', 'paint', 'pattern', 'horn', 'metal', 'glow', 'cape', 'top', 'top2', 'bot', 'bot2', 'shoe', 'acc', 'pet', 'pet2', 'wood', 'wall', 'cloth'];
  var DEFAULT = {
    skin: '#EDB48A', hair: '#5A3825', dye: '#F28DB8', freckle: '#9C5B3F', eye: '#6B4A2F', eye2: '#3D7FD6', makeup: '#B07CE8', jewel: '#F2C14E', lip: '#E0457B',
    paint: '#3DB2C9', pattern: '#B9744C', horn: '#F2E6D0', metal: '#A9B4C2', glow: '#4DE1FF', cape: '#5B3FA8', top: '#3D8BFD', top2: '#FFFDF7', bot: '#2F4C9C', bot2: '#FFD23F',
    shoe: '#E5484D', acc: '#F76CA8', pet: '#E2A15B', pet2: '#FFF1DC', wood: '#C98D5B', wall: '#FFE3C9', cloth: '#9AD3C2'
  };

  /** CSS variables for one character: base colour plus -dk (outline), -sh (soft shade) and -hi (highlight).
   *  Old WebViews have no color-mix(), so the darker/lighter versions are worked out here, once,
   *  when a colour is picked. */
  function vars(c) {
    var out = [], k, v;
    for (k in c) {
      if (!c.hasOwnProperty(k) || KEYS.indexOf(k) < 0) { continue; }
      v = c[k];
      out.push('--' + k + ':' + v, '--' + k + '-dk:' + dk(v), '--' + k + '-sh:' + sh(v), '--' + k + '-hi:' + hi(v));
    }
    return out.join(';');
  }

  function colors(c) {
    var o = {}, k;
    for (k in DEFAULT) { if (DEFAULT.hasOwnProperty(k)) { o[k] = DEFAULT[k]; } }
    if (c) { for (k in c) { if (c.hasOwnProperty(k) && c[k]) { o[k] = c[k]; } } }
    return o;
  }

  /* ---------- painting ---------- */
  var OLW = { self: 2.2, ink: 3.4 };
  function Painter(mode, col, outline) {
    this.mode = mode; this.col = col; this.ol = outline || 'none';
  }
  Painter.prototype.colorOf = function (k) {
    if (k.charAt(0) === '#') { return k; }
    var base = k.replace(/-(dk|sh|hi)$/, ''), v = this.col[base] || '#999999';
    if (/-dk$/.test(k)) { return dk(v); }
    if (/-sh$/.test(k)) { return sh(v); }
    if (/-hi$/.test(k)) { return hi(v); }
    return v;
  };
  /* attribute string for a filled shape; o = gets the outline */
  Painter.prototype.a = function (k, o) {
    var lit = k.charAt(0) === '#', ol = o && this.ol !== 'none';
    if (this.mode === 'bake') {
      var s = 'fill="' + this.colorOf(k) + '"';
      if (ol) { s += ' stroke="' + (this.ol === 'ink' ? INK : dk(this.colorOf(k))) + '" stroke-width="' + OLW[this.ol] + '" stroke-linejoin="round"'; }
      return s;
    }
    if (lit) {
      if (!ol) { return 'fill="' + k + '"'; }
      return 'fill="' + k + '" class="o"' + (this.ol === 'self' ? ' stroke="' + dk(k) + '"' : '');
    }
    return 'class="c-' + k + (ol ? ' o' : '') + '"';
  };

  /* ---------- shapes ---------- */
  function Sh(pt) { this.p = pt; }
  Sh.prototype.path = function (k, d, o, x) { return '<path ' + this.p.a(k, o) + ' d="' + d + '"' + (x ? ' ' + x : '') + '/>'; };
  Sh.prototype.circ = function (k, cx, cy, r, o) { return '<circle ' + this.p.a(k, o) + ' cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '"/>'; };
  Sh.prototype.ell = function (k, cx, cy, rx, ry, o, tr) { return '<ellipse ' + this.p.a(k, o) + ' cx="' + n(cx) + '" cy="' + n(cy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '"' + (tr ? ' transform="' + tr + '"' : '') + '/>'; };
  Sh.prototype.rect = function (k, x, y, w, h, rx, o, tr) { return '<rect ' + this.p.a(k, o) + ' x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) + '"' + (rx ? ' rx="' + n(rx) + '"' : '') + (tr ? ' transform="' + tr + '"' : '') + '/>'; };
  /* a plain stroked line (fixed colour) */
  Sh.prototype.line = function (color, d, w) { return '<path fill="none" stroke="' + color + '" stroke-width="' + n(w) + '" stroke-linecap="round" stroke-linejoin="round" d="' + d + '"/>'; };
  function mirror(s) { return s ? '<g transform="matrix(-1 0 0 1 200 0)">' + s + '</g>' : ''; }
  function grp(s, tr) { return s ? '<g' + (tr ? ' transform="' + tr + '"' : '') + '>' + s + '</g>' : ''; }

  /* path builder: coordinates are written in "reference head" space (head centre 100,92, radius 62)
     and mapped onto the real head, so one hair/face drawing fits every proportion */
  function Map(cx, cy, sx, sy) { this.cx = cx; this.cy = cy; this.sx = sx; this.sy = sy; }
  Map.prototype.x = function (v) { return n(this.cx + (v - 100) * this.sx); };
  Map.prototype.y = function (v) { return n(this.cy + (v - 92) * this.sy); };
  function PB(m) { this.m = m; this.d = ''; }
  PB.prototype.M = function (x, y) { this.d += 'M' + this.m.x(x) + ' ' + this.m.y(y); return this; };
  PB.prototype.L = function (x, y) { this.d += 'L' + this.m.x(x) + ' ' + this.m.y(y); return this; };
  PB.prototype.Q = function (a, b, x, y) { this.d += 'Q' + this.m.x(a) + ' ' + this.m.y(b) + ' ' + this.m.x(x) + ' ' + this.m.y(y); return this; };
  PB.prototype.C = function (a, b, c, d, x, y) { this.d += 'C' + this.m.x(a) + ' ' + this.m.y(b) + ' ' + this.m.x(c) + ' ' + this.m.y(d) + ' ' + this.m.x(x) + ' ' + this.m.y(y); return this; };
  PB.prototype.A = function (r, lg, sw, x, y) { this.d += 'A' + n(r * this.m.sx) + ' ' + n(r * this.m.sy) + ' 0 ' + lg + ' ' + sw + ' ' + this.m.x(x) + ' ' + this.m.y(y); return this; };
  PB.prototype.Z = function () { this.d += 'Z'; return this; };

  /* ---------- the rig ---------- */
  /* proportions: A (also used by B and C, so existing outfits keep fitting) and D */
  var PROP = {
    A: { hr: 62, hry: 62, neck: 0, tw: 64, th: 58, hem: 18, leg: 84, lw: 20, gap: 6, arm: 58, aw: 18, ang: 14, hand: 11, foot: 30, eyeK: 1, ear: 11 },
    D: { hr: 49, hry: 51, neck: 9, tw: 56, th: 70, hem: 16, leg: 104, lw: 17, gap: 6, arm: 76, aw: 15, ang: 9, hand: 9.5, foot: 27, eyeK: 1.22, ear: 9 }
  };
  /* body variants, applied on top of the proportions */
  var BODY = {
    normal: {},
    tall: { th: 1.1, leg: 1.24, arm: 1.16 },
    short: { th: 0.9, leg: 0.8, arm: 0.88, tw: 1.06 },
    young: { hr: 1.04, hry: 1.04, th: 0.8, leg: 0.7, arm: 0.8, tw: 0.92, eyeK: 1.12, lw: 0.95 },
    older: { hr: 0.9, hry: 0.98, th: 1.2, leg: 1.3, arm: 1.22, eyeK: 0.84, tw: 1.02, neck: 1, older: 1 }
  };

  function geom(prop, body) {
    var b = PROP[prop === 'D' ? 'D' : 'A'], mod = (body && typeof body === 'object') ? body : (BODY[body || 'normal'] || {}), g = {}, k;
    for (k in b) { if (b.hasOwnProperty(k)) { g[k] = b[k] * (mod[k] && k !== 'neck' ? mod[k] : 1); } }
    if (mod.older) { g.neck = Math.max(g.neck, 5); g.older = true; }
    if (body === 'young') { g.young = true; }
    var G = 292;
    g.G = G;
    g.hip = G - g.leg;
    g.sh = g.hip - g.th;
    g.hcy = g.sh - g.neck - g.hry + (g.neck ? 3 : 4);
    var top = g.hcy - g.hry * 1.55;                  /* room for puffs and buns */
    var dy = Math.max(0, 6 - top);
    if (dy) { g.G += dy; g.hip += dy; g.sh += dy; g.hcy += dy; }
    g.H = Math.max(300, g.G + 8);
    g.sx = g.hr / 62; g.sy = g.hry / 62;
    g.m = new Map(100, g.hcy, g.sx, g.sy);
    g.x0 = 100 - g.tw / 2; g.x1 = 100 + g.tw / 2;
    g.lcx = 100 - g.gap / 2 - g.lw / 2;            /* left leg centre */
    g.ax = g.x0 + 2; g.ay = g.sh + 8;              /* left shoulder pivot */
    return g;
  }

  /* ---------- traits ---------- */
  var TRAITS = ['prop', 'eyes', 'face', 'hair', 'outline', 'shade', 'limbs', 'outfit'];
  var TRAIT_NAMES = {
    prop: 'Proportions', eyes: 'Eyes', face: 'Nose, mouth & cheeks', hair: 'Hair detail',
    outline: 'Outline', shade: 'Shading', limbs: 'Hands & shoes', outfit: 'Outfit detail'
  };
  function preset(x) {
    var t = {};
    TRAITS.forEach(function (k) { t[k] = x; });
    if (x === 'B') { t.hair = 'A'; t.outline = 'A'; t.shade = 'A'; t.outfit = 'A'; }
    if (x !== 'D') { t.prop = 'A'; }            /* A, B and C share one rig */
    return t;
  }
  function olOf(t) { return t.outline === 'C' ? 'self' : (t.outline === 'D' ? 'ink' : 'none'); }

  /* ---------- hair ---------- */
  function capDx(R, cyc, y) { return Math.sqrt(Math.max(0, R * R - (y - cyc) * (y - cyc))); }

  /* fringe lobes from (xa, ya) to (xb, ya), hanging down to y */
  function fringe(pb, xa, xb, y, yj, count, kind, ya) {
    var i, step = (xb - xa) / count, x, nx, jy, mid;
    for (i = 0; i < count; i++) {
      x = xa + step * i; nx = x + step; mid = (x + nx) / 2;
      jy = (i === count - 1) ? ya : yj;
      if (kind === 'point') {
        pb.Q(x + step * 0.12, yj + (y - yj) * 0.8, mid + step * 0.08, y + 4);
        pb.Q(nx - step * 0.3, yj + (y - yj) * 0.6, nx, jy);
      } else if (kind === 'spike') {
        /* sharp anime strands, alternating a little left and right */
        var tip = mid + step * (i % 2 ? 0.14 : -0.1);
        pb.Q(x + step * 0.22, yj + (y - yj) * 0.55, tip, y + 9);
        pb.Q(nx - step * 0.18, yj + (y - yj) * 0.45, nx, jy);
      } else if (kind === 'sweep') {
        /* every strand points the same way (a side-swept fringe) */
        pb.Q(x + step * 0.25, y + 2, nx - step * 0.12, y + 5);
        pb.Q(nx - step * 0.02, yj + (y - yj) * 0.35, nx, jy);
      } else {
        pb.Q(mid, 2 * y - (i === 0 ? ya : yj) / 2 - jy / 2, nx, jy);
      }
    }
  }

  var STYLES = {
    bob:      { label: 'Bob', side: { yo: 152, xi: 147 }, yt: 104, fy: 77, fyj: 69, lobes: 4 },
    long:     { label: 'Long', side: { yo: 176, xi: 148 }, yt: 102, fy: 74, fyj: 62, lobes: 2, part: 1 },
    puffs:    { label: 'Puffs', yt: 106, fy: 70, fyj: 60, lobes: 3 },
    ponytail: { label: 'Ponytail', yt: 108, fy: 70, fyj: 58, lobes: 3 },
    braids:   { label: 'Braids', side: { yo: 124, xi: 150 }, yt: 104, fy: 66, fyj: 54, lobes: 2, part: 1 },
    curly:    { label: 'Curly', yt: 112, fy: 72, fyj: 64, lobes: 6, curly: 1 },
    /* unlockable: everyday */
    crop:      { label: 'Short crop', yt: 110, fy: 64, fyj: 50, lobes: 3, fr: 'sweep' },
    topknot:   { label: 'Top knot', yt: 108, fy: 44, fyj: 42, lobes: 1, fr: 'line' },
    sidetail:  { label: 'Side ponytail', yt: 108, fy: 70, fyj: 56, lobes: 3, fr: 'sweep' },
    pigtails:  { label: 'Pigtails', yt: 106, fy: 66, fyj: 54, lobes: 2, part: 1 },
    afropuff:  { label: 'Afro puff', yt: 110, fy: 46, fyj: 44, lobes: 1, fr: 'line' },
    wavy:      { label: 'Wavy long', side: { yo: 178, xi: 148, wavy: 1 }, yt: 102, fy: 72, fyj: 60, lobes: 3 },
    /* unlockable: anime */
    twintails: { label: 'Twin tails', yt: 106, fy: 78, fyj: 58, lobes: 5, fr: 'spike' },
    spiky:     { label: 'Spiky', yt: 112, fy: 82, fyj: 56, lobes: 5, fr: 'spike', spikes: 1 },
    hime:      { label: 'Hime cut', side: { yo: 134, xi: 146, flat: 1 }, yt: 102, fy: 76, fyj: 74, lobes: 1, fr: 'blunt' },
    flowing:   { label: 'Long flowing', side: { yo: 188, xi: 148, point: 1 }, yt: 102, fy: 84, fyj: 58, lobes: 4, fr: 'spike' },
    drills:    { label: 'Drill curls', yt: 106, fy: 74, fyj: 58, lobes: 4, fr: 'spike' },
    highbun:   { label: 'High bun', custom: 1 },
    thick:     { label: 'Long & thick', custom: 1 },
    boxbraids: { label: 'Braids with beads', custom: 1 },
    locs:      { label: 'Locs', custom: 1 },
    cornrows:  { label: 'Cornrows', custom: 1 },
    shaved:    { label: 'Shaved', custom: 1 },
    mohawk:    { label: 'Mohawk', custom: 1 },
    fauxhawk:  { label: 'Faux hawk', custom: 1 },
    sideshave: { label: 'Side shave', custom: 1 },
    spacebuns: { label: 'Space buns', custom: 1 },
    flippy:    { label: 'Flipped ends', custom: 1 },
    longcurly: { label: 'Long curls', custom: 1 },
    bunches:   { label: 'Low bunches', yt: 104, fy: 76, fyj: 74, lobes: 1, fr: 'blunt' },
    halfup:    { label: 'Half-up pigtails', side: { yo: 176, xi: 148 }, yt: 102, fy: 74, fyj: 62, lobes: 2, part: 1 },
    peekaboo:  { label: 'Side sweep', custom: 1 },
    crownbraid:{ label: 'Crown braid', custom: 1 },
    shag:      { label: 'Shag', side: { yo: 158, xi: 146, point: 1 }, yt: 104, fy: 80, fyj: 60, lobes: 4 },
    messybob:  { label: 'Messy bob', side: { yo: 150, xi: 146, point: 1 }, yt: 104, fy: 80, fyj: 60, lobes: 5, fr: 'spike' }
  };
  var STYLE_IDS = ['bob', 'long', 'puffs', 'ponytail', 'braids', 'curly'];
  var STYLE_FREE2 = ['highbun', 'thick', 'boxbraids', 'locs', 'cornrows', 'shaved', 'flippy', 'longcurly', 'bunches'];          /* free from the start too */
  var STYLE_UNLOCK = ['crop', 'topknot', 'sidetail', 'pigtails', 'afropuff', 'wavy', 'mohawk', 'fauxhawk', 'sideshave', 'spacebuns', 'halfup', 'peekaboo', 'crownbraid', 'shag', 'twintails', 'spiky', 'hime', 'flowing', 'drills', 'messybob'];
  var STYLE_ANIME = ['twintails', 'spiky', 'hime', 'flowing', 'drills', 'messybob'];

  function hairParts(S, g, st, lvl, rainbow, cut) {
    cut = cut || { lock: 0, fringe: 0, back: 0 };
    if (typeof cut.extra === 'undefined' && hairParts.extra) { cut.extra = hairParts.extra; }
    var CB = cut.back, CL = cut.lock, CF = cut.fringe;
    var m = g.m, full = lvl === 'C' || lvl === 'D', R = full ? 70 : 67, cyc = full ? 89 : 90;
    var o = true, back = '', front = '', over = '', shade = '';
    var HK = 'hair';
    function P() { return new PB(m); }
    var BK = (function () {
      var dx = capDx(R, cyc, 118);
      return P().M(100 - dx, 118).A(R, 1, 1, 100 + dx, 118).Q(160, 126, 150, 122).L(50, 122).Q(40, 126, 100 - dx, 118).Z().d;
    })();

    /* back hair */
    if (st === 'bob') {
      back = S.path(HK, P().M(29, 100).Q(29, 22, 100, 22).Q(171, 22, 171, 100).L(171, 146 - CB).Q(171, 168 - CB, 150, 164 - CB).L(50, 164 - CB).Q(29, 168 - CB, 29, 146 - CB).Z().d, o);
    } else if (st === 'long') {
      back = S.path(HK, P().M(28, 100).Q(28, 21, 100, 21).Q(172, 21, 172, 100).L(174, 226 - CB).Q(174, 240 - CB, 160, 238 - CB).L(40, 238 - CB).Q(26, 240 - CB, 26, 226 - CB).Z().d, o);
    } else if (st === 'puffs') {
      back = S.circ(HK, +m.x(42), +m.y(44), 31 * g.sx * (full ? 1.08 : 1), o) + S.circ(HK, +m.x(158), +m.y(44), 31 * g.sx * (full ? 1.08 : 1), o) + S.path(HK, BK, o);
      if (full) { back += S.path('hair-hi', P().M(24, 40).Q(28, 22, 46, 18).Q(34, 26, 30, 44).Z().d) + S.path('hair-hi', P().M(140, 22).Q(156, 14, 170, 22).Q(156, 20, 146, 28).Z().d); }
    } else if (st === 'ponytail') {
      back = S.path(HK, P().M(134, 44).C(172, 20, 204, 48, 197, 102).C(193, 140 - CB * 0.5, 182 - CB * 0.2, 162 - CB, 164 + CB * 0.15, 182 - CB * 1.15).C(169, 152, 166, 126, 157, 108).C(150, 92, 140, 74, 127, 60).Z().d, o) + S.path(HK, BK, o);
      back += S.rect('acc', +m.x(140), +m.y(40), 18 * g.sx, 10 * g.sy, 4 * g.sx, o, 'rotate(-35 ' + m.x(149) + ' ' + m.y(45) + ')');
      if (full) { back += S.path('hair-hi', P().M(176, 52).Q(190, 74, 186, 108).Q(184, 80, 170, 58).Z().d); }
    } else if (st === 'braids') {
      var bs = '', i;
      for (i = 0; i < 4; i++) { bs += S.ell(HK, +m.x(36), +m.y(124 + i * 21), 12 * g.sx, 13 * g.sy, o); }
      bs += S.rect('acc', +m.x(26), +m.y(203), 20 * g.sx, 8 * g.sy, 3, o) + S.path(HK, P().M(30, 210).L(42, 210).L(44, 226 - CB * 0.4).Q(36, 232 - CB * 0.45, 28, 226 - CB * 0.4).Z().d, o);
      if (full) { for (i = 0; i < 4; i++) { bs += S.path('hair-dk', P().M(26, 124 + i * 21).Q(36, 132 + i * 21, 46, 122 + i * 21).Q(36, 128 + i * 21, 26, 124 + i * 21).Z().d); } }
      back = bs + mirror(bs) + S.path(HK, BK, o);
    } else if (st === 'curly') {
      var pts = [[34, 112], [24, 84], [32, 52], [56, 28], [86, 16], [114, 16], [144, 28], [168, 52], [176, 84], [166, 112]], cs = '';
      pts.forEach(function (p) { cs += S.circ(HK, +m.x(p[0]), +m.y(p[1]), 24 * g.sx, o); });
      cs += S.circ(HK, +m.x(100), +m.y(70), 62 * g.sx);
      back = cs;
    }

    /* back hair for the unlockable styles */
    if (st === 'crop') { back = S.path(HK, BK, o); }
    else if (st === 'topknot') {
      back = S.path(HK, BK, o) + S.circ(HK, +m.x(100), +m.y(14), 21 * g.sx, o) + S.rect('acc', +m.x(86), +m.y(30), 28 * g.sx, 8 * g.sy, 4 * g.sx, o);
      if (full) { back += S.path('hair-hi', P().M(88, 6).Q(96, -2, 108, 0).Q(98, 2, 92, 10).Z().d); }
    } else if (st === 'sidetail') {
      back = S.path(HK, P().M(56, 50).C(18, 56, 4, 106, 14, 156 - CB).C(18, 176 - CB, 26, 186 - CB, 36, 192 - CB * 1.15).C(30, 160 - CB * 0.6, 34, 118, 60, 72).Z().d, o) + S.path(HK, BK, o) +
        S.rect('acc', +m.x(40), +m.y(52), 18 * g.sx, 10 * g.sy, 4 * g.sx, o, 'rotate(28 ' + m.x(49) + ' ' + m.y(57) + ')');
      if (full) { back += S.path('hair-hi', P().M(22, 92).Q(16, 120, 22, 150).Q(24, 120, 30, 96).Z().d); }
    } else if (st === 'pigtails') {
      var pt2 = S.path(HK, P().M(42, 96).C(16, 108, 6, 150, 14, 186 - CB).C(18, 196 - CB, 26, 198 - CB, 30, 194 - CB).C(28, 160 - CB * 0.5, 40, 128, 54, 110).Z().d, o) +
        S.rect('acc', +m.x(30), +m.y(96), 18 * g.sx, 10 * g.sy, 4 * g.sx, o, 'rotate(-20 ' + m.x(39) + ' ' + m.y(101) + ')');
      if (full) { pt2 += S.path('hair-hi', P().M(22, 126).Q(16, 150, 20, 176).Q(24, 150, 30, 128).Z().d); }
      back = pt2 + mirror(pt2) + S.path(HK, BK, o);
    } else if (st === 'afropuff') {
      var pc = '';
      [[100, 12], [80, 16], [120, 16], [70, 30], [130, 30]].forEach(function (q) { pc += S.circ(HK, +m.x(q[0]), +m.y(q[1]), 18 * g.sx, o); });
      back = S.path(HK, BK, o) + pc + S.circ(HK, +m.x(100), +m.y(24), 24 * g.sx) + S.rect('acc', +m.x(80), +m.y(36), 40 * g.sx, 8 * g.sy, 4 * g.sx, o);
      if (full) { back += S.path('hair-hi', P().M(84, 8).Q(92, -2, 106, -2).Q(94, 4, 88, 12).Z().d); }
    } else if (st === 'wavy') {
      back = S.path(HK, P().M(28, 100).Q(28, 21, 100, 21).Q(172, 21, 172, 100).Q(182, 126, 172, 150).Q(162, 174, 174, 198).Q(184, 220, 172, 236 - CB)
        .Q(150, 250 - CB, 128, 238 - CB).Q(100, 252 - CB, 72, 238 - CB).Q(50, 250 - CB, 28, 236 - CB).Q(16, 220, 26, 198).Q(38, 174, 28, 150).Q(18, 126, 28, 100).Z().d, o);
    } else if (st === 'twintails') {
      var tt = S.path(HK, P().M(144, 26).C(184, 20, 200, 82, 194, 150).C(190, 200, 182, 232, 188, 266 - CB).C(172, 238 - CB * 0.6, 168, 204, 170, 164).C(172, 112, 166, 72, 140, 48).Z().d, o) +
        S.rect('acc', +m.x(138), +m.y(24), 20 * g.sx, 12 * g.sy, 5 * g.sx, o, 'rotate(30 ' + m.x(148) + ' ' + m.y(30) + ')');
      if (full) { tt += S.path('hair-hi', P().M(180, 70).Q(192, 110, 186, 160).Q(182, 112, 174, 76).Z().d) + S.path('hair-dk', P().M(178, 150).Q(176, 190, 182, 232 - CB).Q(172, 196, 174, 152).Z().d); }
      back = tt + mirror(tt) + S.path(HK, BK, o);
    } else if (st === 'spiky') {
      var sp = 'M' + m.x(30) + ' ' + m.y(118), a2, i3, R2;
      for (i3 = 0; i3 <= 18; i3++) {
        a2 = (165 + i3 * 210 / 18) * Math.PI / 180; R2 = i3 % 2 ? 88 : 66;
        sp += 'L' + m.x(100 + Math.cos(a2) * R2) + ' ' + m.y(88 + Math.sin(a2) * R2 * 0.92);
      }
      back = S.path(HK, sp + 'L' + m.x(170) + ' ' + m.y(118) + 'Z', o);
    } else if (st === 'hime') {
      back = S.path(HK, P().M(30, 100).Q(30, 21, 100, 21).Q(170, 21, 170, 100).L(166, 226 - CB).Q(166, 234 - CB, 156, 234 - CB).L(44, 234 - CB).Q(34, 234 - CB, 34, 226 - CB).Z().d, o);
    } else if (st === 'flowing') {
      var fz = P().M(26, 100).Q(26, 20, 100, 20).Q(174, 20, 174, 100).L(178, 250 - CB), zx = [166, 150, 134, 116, 100, 84, 66, 50, 34, 22], zi;
      for (zi = 0; zi < zx.length; zi++) { fz.L(zx[zi], (zi % 2 ? 252 : 272) - CB - (zi === zx.length - 1 ? 22 : 0)); }
      back = S.path(HK, fz.Z().d, o);
      if (full) { back += S.path('hair-dk', P().M(160, 150).Q(164, 210, 158, 248 - CB).Q(156, 206, 152, 152).Z().d) + S.path('hair-dk', P().M(40, 150).Q(36, 210, 42, 248 - CB).Q(44, 206, 48, 152).Z().d); }
    } else if (st === 'drills') {
      var dr = '', di, w0;
      for (di = 0; di < 3; di++) {
        w0 = 26 - di * 4; var y0 = 106 + di * 28 - (di === 2 ? CB * 0.4 : 0), cx2 = 30;
        dr += S.path(HK, P().M(cx2 - w0 / 2, y0).Q(cx2 - w0 / 2 - 3, y0 + 22, cx2, y0 + 30).Q(cx2 + w0 / 2 + 3, y0 + 22, cx2 + w0 / 2, y0).Q(cx2, y0 - 6, cx2 - w0 / 2, y0).Z().d, o);
        if (full) { dr += S.path('hair-dk', P().M(cx2 - w0 / 2 + 2, y0 + 8).Q(cx2, y0 + 16, cx2 + w0 / 2 - 1, y0 + 6).Q(cx2, y0 + 12, cx2 - w0 / 2 + 2, y0 + 8).Z().d); }
      }
      dr += S.circ('acc', +m.x(34), +m.y(102), 6 * g.sx, o);
      back = dr + mirror(dr) + S.path(HK, BK, o);
    } else if (st === 'bunches') {
      /* two low bunches that hang in front of the shoulders, under a blunt fringe */
      var bn = S.path(HK, P().M(46, 112).C(20, 122, 10, 168, 20, 204 - CB).C(26, 216 - CB, 38, 214 - CB, 42, 204 - CB).C(38, 172, 46, 140, 60, 124).Z().d, o) +
        S.rect('acc', +m.x(36), +m.y(110), 18 * g.sx, 10 * g.sy, 4 * g.sx, o, 'rotate(-24 ' + m.x(45) + ' ' + m.y(115) + ')');
      if (full) { bn += S.path('hair-hi', P().M(26, 140).Q(20, 166, 26, 192 - CB).Q(28, 166, 34, 142).Z().d) + S.path('hair-dk', P().M(40, 150).Q(36, 176, 38, 200 - CB).Q(42, 176, 46, 152).Z().d); }
      back = bn + mirror(bn) + S.path(HK, BK, o);
    } else if (st === 'halfup') {
      /* long hair down, with two little tails tied up high */
      var tl = S.path(HK, P().M(132, 40).C(144, 8, 176, -2, 190, 18).C(198, 34, 192, 56, 182, 70 - CB * 0.4).C(180, 50, 166, 38, 148, 50).Z().d, o) +
        S.rect('acc', +m.x(126), +m.y(30), 18 * g.sx, 10 * g.sy, 4 * g.sx, o, 'rotate(-30 ' + m.x(135) + ' ' + m.y(35) + ')');
      if (full) { tl += S.path('hair-hi', P().M(154, 14).Q(174, 6, 186, 22).Q(170, 14, 158, 20).Z().d); }
      back = tl + mirror(tl) + S.path(HK, P().M(28, 100).Q(28, 21, 100, 21).Q(172, 21, 172, 100).L(174, 226 - CB).Q(174, 240 - CB, 160, 238 - CB).L(40, 238 - CB).Q(26, 240 - CB, 26, 226 - CB).Z().d, o);
    } else if (st === 'shag') {
      /* layered and fluffy: choppy points that stick out at two levels */
      /* fluffy layers that flick out at two levels */
      back = S.path(HK, P().M(30, 100).Q(26, 20, 100, 18).Q(174, 20, 170, 100).Q(192, 110, 178, 128).Q(196, 146, 178, 162 - CB * 0.5).Q(188, 184 - CB, 160, 176 - CB)
        .Q(150, 190 - CB, 128, 178 - CB).Q(114, 190 - CB, 100, 180 - CB).Q(86, 190 - CB, 72, 178 - CB).Q(50, 190 - CB, 40, 176 - CB).Q(12, 184 - CB, 22, 162 - CB * 0.5)
        .Q(4, 146, 22, 128).Q(8, 110, 30, 100).Z().d, o);
      if (full) { var sg = S.path('hair-dk', P().M(176, 132).Q(184, 146, 172, 158).Q(178, 146, 170, 136).Z().d); back += sg + mirror(sg); }
    } else if (st === 'messybob') {
      var mz = P().M(29, 100).Q(29, 22, 100, 22).Q(171, 22, 171, 100).L(171, 150 - CB), mx2 = [160, 146, 130, 114, 100, 86, 70, 54, 40, 29], mi;
      for (mi = 0; mi < mx2.length; mi++) { mz.L(mx2[mi], (mi % 2 ? 152 : 168) - CB - (mi === mx2.length - 1 ? 18 : 0)); }
      back = S.path(HK, mz.Z().d, o);
    }

    /* custom styles draw their own front */
    if (STYLES[st].custom) {
      var stub = hairParts.stubble == null ? 0.45 : hairParts.stubble;
      var STUB = P().M(39.5, 100).A(61.5, 1, 1, 160.5, 100).L(155, 100).Q(152, 64, 100, 58).Q(48, 64, 45, 100).Z().d;
      function stubble(d2) { return '<g opacity="' + n(stub) + '">' + S.path('hair', d2 || STUB) + '</g>'; }
      var STRANDS = function (key) {
        var sL = S.path(key, P().M(98, 30).Q(66, 34, 56, 70).Q(50, 104, 56, 134 - CL * 0.5).L(64, 134 - CL * 0.5).Q(60, 104, 66, 72).Q(74, 44, 100, 38).Z().d, o);
        return sL + mirror(sL);
      };
      var f2 = '', b2 = back;
      if (st === 'shaved') { f2 = stubble(); b2 = ''; }
      else if (st === 'mohawk') {
        b2 = '';
        f2 = stubble() + S.path(HK, P().M(90, 60).L(80, 30).L(92, 34).L(90, 6).L(102, 24).L(108, 0).L(112, 28).L(122, 20).L(114, 46).L(112, 60).Z().d, o);
        if (full) { f2 += S.path('hair-hi', P().M(94, 52).L(90, 34).L(97, 36).Z().d) + S.path('hair-dk', P().M(106, 58).L(108, 30).L(111, 32).L(109, 58).Z().d); }
      } else if (st === 'fauxhawk') {
        b2 = '';
        f2 = stubble() + S.path(HK, P().M(72, 64).Q(70, 38, 90, 26).L(100, 4).L(106, 22).L(120, 12).L(118, 32).Q(132, 42, 128, 64).Q(100, 54, 72, 64).Z().d, o);
        if (full) { f2 += S.path('hair-hi', P().M(84, 48).Q(86, 32, 98, 22).Q(92, 36, 90, 50).Z().d); }
      } else if (st === 'sideshave') {
        b2 = S.path(HK, P().M(100, 22).Q(172, 22, 172, 100).L(174, 222 - CB).Q(174, 236 - CB, 160, 236 - CB).L(120, 236 - CB).Q(108, 234 - CB, 110, 220 - CB).L(112, 120).Z().d, o);
        f2 = stubble(P().M(38.5, 100).A(63, 0, 1, 96, 29.2).L(96, 36).Q(60, 44, 46, 100).Z().d) +
          S.path(HK, P().M(52, 58).Q(76, 24, 120, 24).Q(168, 30, 168, 100).L(168, 172 - CL).Q(166, 186 - CL, 154, 182 - CL).Q(146, 176 - CL, 146, 160 - CL).L(146, 100).Q(140, 74, 112, 66).Q(84, 62, 66, 76).Q(56, 74, 52, 58).Z().d, o);
        if (full) { f2 += S.path('hair-hi', P().M(80, 36).Q(110, 24, 140, 34).Q(110, 30, 84, 42).Z().d) + S.path('hair-dk', P().M(154, 110).Q(158, 136, 154, 168 - CL).Q(160, 136, 158, 110).Z().d); }
      } else if (st === 'cornrows') {
        b2 = '';
        var bb = ''; var bi; for (bi = 0; bi < 3; bi++) { bb += S.ell(HK, +m.x(70), +m.y(128 + bi * 16), 7 * g.sx, 9 * g.sy, o); }
        b2 = bb + mirror(bb) + S.rect('acc', +m.x(63), +m.y(170), 14 * g.sx, 6 * g.sy, 3, o) + mirror(S.rect('acc', +m.x(63), +m.y(170), 14 * g.sx, 6 * g.sy, 3, o));
        f2 = S.path(HK, P().M(38, 100).A(64, 1, 1, 162, 100).L(155, 100).Q(152, 62, 100, 56).Q(48, 62, 45, 100).Z().d, o);
        /* scalp partings between the rows, then a braid pattern on each row */
        [-30, -15, 0, 15, 30].forEach(function (dx2) {
          var xa = 100 + dx2 * 1.25, xb = 100 + dx2 * 1.9;
          f2 += sline(S, 'skin', 'M' + m.x(xa) + ' ' + m.y(57) + 'Q' + m.x(100 + dx2 * 1.7) + ' ' + m.y(30) + ' ' + m.x(xb) + ' ' + m.y(26), 2.2 * g.sx);
        });
        [-22, -7, 7, 22].forEach(function (dx2) {
          var k3; for (k3 = 0; k3 < 3; k3++) {
            var yy = 52 - k3 * 9, xx = 100 + dx2 * (1.15 + k3 * 0.2);
            f2 += S.line(S.p.colorOf('hair-dk'), 'M' + m.x(xx - 3) + ' ' + m.y(yy) + 'L' + m.x(xx) + ' ' + m.y(yy + 2.6) + 'L' + m.x(xx + 3) + ' ' + m.y(yy), 1.2 * g.sx);
          }
        });
        if (S.p.mode === 'class') { f2 = f2.replace(/stroke="#[0-9A-F]{6}" stroke-width="([\d.]+)" stroke-linecap="round" stroke-linejoin="round" d="M/g, 'class="b-hair-dk" stroke-width="$1" stroke-linecap="round" stroke-linejoin="round" d="M'); }
      } else if (st === 'locs') {
        var lx2 = [34, 48, 62, 138, 152, 166], ld = '', li;
        b2 = S.path(HK, BK, o);
        for (li = 0; li < lx2.length; li++) {
          var x0 = lx2[li], len = (li === 0 || li === 5 ? 120 : 140) - CB, ang = (x0 - 100) * 0.08;
          ld += S.rect(HK, +m.x(x0 - 6), +m.y(70), 12 * g.sx, len * g.sy, 6 * g.sx, o, 'rotate(' + n(ang) + ' ' + m.x(x0) + ' ' + m.y(70) + ')');
          if (full) { ld = ld; }
          if (full) { var bj; for (bj = 1; bj < 4; bj++) { ld += S.rect('hair-dk', +m.x(x0 - 5), +m.y(70 + bj * 32), 10 * g.sx, 2 * g.sy, 1, false, 'rotate(' + n(ang) + ' ' + m.x(x0) + ' ' + m.y(70) + ')'); } }
        }
        b2 += ld;
        f2 = S.path(HK, P().M(34, 104).A(68, 1, 1, 166, 104).L(156, 104).Q(150, 60, 100, 54).Q(50, 60, 44, 104).Z().d, o);
        var fl = S.rect(HK, +m.x(44), +m.y(62), 11 * g.sx, (88 - CL) * g.sy, 5.5 * g.sx, o, 'rotate(6 ' + m.x(49) + ' ' + m.y(62) + ')') + S.rect(HK, +m.x(58), +m.y(52), 11 * g.sx, (40 - CL * 0.3) * g.sy, 5.5 * g.sx, o, 'rotate(10 ' + m.x(63) + ' ' + m.y(52) + ')');
        if (full) { fl += S.rect('hair-dk', +m.x(45), +m.y(90), 9 * g.sx, 2 * g.sy, 1, false, 'rotate(6 ' + m.x(49) + ' ' + m.y(62) + ')') + S.rect('hair-dk', +m.x(45), +m.y(112), 9 * g.sx, 2 * g.sy, 1, false, 'rotate(6 ' + m.x(49) + ' ' + m.y(62) + ')'); }
        f2 += fl + mirror(fl);
      } else if (st === 'highbun') {
        /* a big bun on top, a side-swept fringe and loose strands at the temples */
        b2 = S.path(HK, BK, o) + S.circ(HK, +m.x(102), +m.y(12), 24 * g.sx, o) + S.rect('acc', +m.x(90), +m.y(30), 24 * g.sx, 7 * g.sy, 3.5 * g.sx, o);
        if (full) { b2 += S.path('hair-hi', P().M(88, 6).Q(96, -6, 112, -4).Q(98, 0, 92, 12).Z().d) + S.path('hair-dk', P().M(104, -10).Q(114, 8, 106, 30).Q(110, 8, 100, -10).Z().d); }
        f2 = S.path(HK, P().M(36, 102).A(65, 1, 1, 164, 102).L(159, 102).Q(158, 74, 140, 62).Q(126, 86, 98, 80).Q(72, 76, 58, 88).Q(50, 94, 44, 102).Z().d, o);
        var tL = S.path(HK, P().M(45, 90).Q(40, 116, 46, 138 - CL * 0.5).L(51, 138 - CL * 0.5).Q(47, 116, 51, 92).Z().d, o);
        f2 += tL + mirror(tL);
        if (full) { f2 += S.path('hair-hi', P().M(60, 46).Q(84, 30, 116, 32).Q(88, 38, 66, 54).Z().d) + S.path('hair-dk', P().M(140, 64).Q(128, 80, 104, 80).Q(126, 76, 136, 62).Z().d); }
      } else if (st === 'thick') {
        /* lots of volume: a wide, wavy back and a deep side part */
        b2 = S.path(HK, P().M(100, 12).Q(22, 12, 16, 96).Q(4, 134, 18, 172).Q(6, 200, 24, 226 - CB).Q(48, 248 - CB, 78, 236 - CB).Q(100, 250 - CB, 122, 236 - CB)
          .Q(152, 248 - CB, 176, 226 - CB).Q(194, 200, 182, 172).Q(196, 134, 184, 96).Q(178, 12, 100, 12).Z().d, o);
        if (full) { b2 += S.path('hair-dk', P().M(22, 170).Q(14, 196, 30, 220 - CB).Q(24, 196, 30, 172).Z().d) + S.path('hair-dk', P().M(178, 170).Q(186, 196, 170, 220 - CB).Q(176, 196, 170, 172).Z().d); }
        f2 = S.path(HK, P().M(26, 112).A(74, 1, 1, 174, 112).L(172, 156 - CL).Q(166, 172 - CL, 152, 162 - CL).L(150, 104).Q(146, 66, 120, 56).Q(94, 60, 72, 84).Q(56, 98, 52, 112).L(50, 162 - CL).Q(40, 174 - CL, 30, 158 - CL).Z().d, o);
        if (full) { f2 += S.path('hair-hi', P().M(46, 60).Q(66, 34, 104, 30).Q(72, 42, 54, 66).Z().d) + S.path('hair-dk', P().M(120, 58).Q(100, 64, 84, 82).Q(102, 70, 122, 64).Z().d); }
      } else if (st === 'boxbraids') {
        /* centre part, rows from the part, lots of thin braids; beads go on a layer of their own (drawn once, even with dyes) */
        var beads = '';
        var braid = function (x, y0, len, k4, ang, withBeads) {
          var tr = 'rotate(' + n(ang) + ' ' + m.x(x) + ' ' + m.y(y0) + ')';
          var bd = S.rect(HK, +m.x(x - 2.8), +m.y(y0), 5.6 * g.sx, len * g.sy, 2.8 * g.sx, o, tr);
          if (withBeads) { beads += '<g transform="' + tr + '">' + S.circ(k4 % 2 ? 'acc' : 'jewel', +m.x(x), +m.y(y0 + len - 3), 3.2 * g.sx) + S.circ(PAPER, +m.x(x), +m.y(y0 + len - 9.5), 2.4 * g.sx) + '</g>'; }
          return bd;
        };
        var bk = '', bi2;
        for (bi2 = 0; bi2 < 5; bi2++) { bk += braid(28 + bi2 * 6, 70, 150 - bi2 * 4 - CB * 0.7, bi2, 3 + bi2, false); }
        b2 = S.path(HK, BK, o) + bk + mirror(bk);
        /* front braids: each one starts at the parting, follows the head round and hangs down (an outline stroke, then the braid) */
        var top2 = '', bead2 = '';
        for (bi2 = 0; bi2 < 4; bi2++) {
          var sx4 = 31 + bi2 * 6.4, ey4 = 214 - bi2 * 11 - CL * 0.7, ex4 = sx4 - 2;
          var bd2 = 'M' + m.x(98.5) + ' ' + m.y(29 + bi2 * 4.5) + 'C' + m.x(66 - bi2 * 2) + ' ' + m.y(26 + bi2 * 8) + ' ' + m.x(sx4) + ' ' + m.y(52 + bi2 * 7) + ' ' + m.x(sx4) + ' ' + m.y(104) + 'L' + m.x(ex4) + ' ' + m.y(ey4);
          top2 += sline(S, 'hair-dk', bd2, 8 * g.sx) + sline(S, 'hair', bd2, 5 * g.sx);
          bead2 += S.circ(bi2 % 2 ? 'acc' : 'jewel', +m.x(ex4), +m.y(ey4 - 1), 3.3 * g.sx) + S.circ(PAPER, +m.x(ex4 + 0.1), +m.y(ey4 - 7.6), 2.5 * g.sx);
        }
        f2 = S.path(HK, P().M(35, 104).A(66, 1, 1, 165, 104).L(156, 104).Q(152, 60, 102, 40).L(100, 34).L(98, 40).Q(48, 60, 44, 104).Z().d, o) + top2 + mirror(top2);
        var beadsL = bead2;
        if (hairParts.streaks) { f2 += STRANDS('dye'); }
        return { back: b2, front: f2, over: beadsL + mirror(beadsL), shade: '' };
      } else if (st === 'flippy') {
        /* shoulder length, ends flipped outwards, a choppy side-swept fringe */
        b2 = S.path(HK, P().M(29, 100).Q(29, 22, 100, 22).Q(171, 22, 171, 100).L(170, 138 - CB).Q(176, 152 - CB, 192, 156 - CB).Q(182, 168 - CB, 164, 162 - CB).L(36, 162 - CB).Q(18, 168 - CB, 8, 156 - CB).Q(24, 152 - CB, 30, 138 - CB).Z().d, o);
        f2 = S.path(HK, P().M(36, 104).A(65, 1, 1, 164, 104).L(165, 138 - CL).Q(170, 152 - CL, 186, 156 - CL).Q(170, 164 - CL, 152, 154 - CL).L(150, 104)
          .Q(150, 72, 132, 60).Q(124, 78, 112, 84).Q(110, 74, 104, 70).Q(96, 82, 82, 84).Q(80, 74, 74, 72).Q(62, 82, 54, 92).Q(50, 96, 50, 104)
          .L(48, 154 - CL).Q(30, 164 - CL, 14, 156 - CL).Q(30, 152 - CL, 35, 138 - CL).Z().d, o);
        if (full) {
          f2 += S.path('hair-hi', P().M(58, 50).Q(82, 30, 118, 32).Q(86, 40, 66, 58).Z().d) + S.path('hair-dk', P().M(130, 62).Q(118, 76, 108, 80).Q(120, 72, 126, 60).Z().d);
          var fk = S.path('hair-dk', P().M(42, 112).Q(38, 132, 40, 150 - CL).Q(44, 132, 46, 112).Z().d); f2 += fk + mirror(fk);
        }
      } else if (st === 'longcurly') {
        /* long ringlets: outlined curls round the edge, one unoutlined fill inside */
        var cpts = [[56, 28], [86, 16], [114, 16], [144, 28], [32, 52], [168, 52], [22, 84], [178, 84], [20, 116], [180, 116], [22, 148], [178, 148], [24, 180], [176, 180],
          [30, 210], [56, 214], [82, 216], [118, 216], [144, 214], [170, 210]], ccs = '';
        cpts.forEach(function (p) {
          var yy2 = p[1] > 130 ? p[1] - CB * (p[1] - 130) / 86 : p[1];
          ccs += S.circ(HK, +m.x(p[0]), +m.y(yy2), 21 * g.sx, o);
        });
        b2 = ccs + S.path(HK, P().M(30, 60).Q(100, -6, 170, 60).L(172, 200 - CB).Q(100, 226 - CB, 28, 200 - CB).Z().d);
        if (full) { [[30, 120], [170, 120], [34, 170], [166, 170], [60, 200], [140, 200]].forEach(function (p) { var yy3 = p[1] - (p[1] > 130 ? CB * (p[1] - 130) / 86 : 0); b2 += S.path('hair-dk', P().M(p[0] - 7, yy3).Q(p[0], yy3 - 8, p[0] + 7, yy3).Q(p[0], yy3 - 4, p[0] - 7, yy3).Z().d); }); }
        /* one outlined shape: the cap, ringlet columns down each side, and a hairline of curl lobes */
        var lc = P().M(36, 104).A(65, 1, 1, 164, 104).L(168, 156 - CL).Q(160, 166 - CL, 150, 154 - CL), ln, la, lp = [];
        lc.Q(140, 142 - CL * 0.5, 151, 130 - CL * 0.4).Q(140, 118, 153, 104);
        for (ln = 0; ln <= 6; ln++) { la = ln * Math.PI / 6; lp.push([100 + Math.cos(la) * 53, 100 - Math.sin(la) * 46]); }
        for (ln = 1; ln <= 6; ln++) {
          var pa = lp[ln - 1], pz = lp[ln], cx4 = (pa[0] + pz[0]) / 2, cy4 = (pa[1] + pz[1]) / 2, vx = 100 - cx4, vy = 108 - cy4, vl = Math.sqrt(vx * vx + vy * vy);
          lc.Q(cx4 + vx / vl * 13, cy4 + vy / vl * 13, pz[0], pz[1]);
        }
        lc.Q(60, 118, 49, 130 - CL * 0.4).Q(60, 142 - CL * 0.5, 50, 154 - CL).Q(40, 166 - CL, 32, 156 - CL).Z();
        f2 = S.path(HK, lc.d, o);
        if (full) {
          [[66, 62], [100, 50], [134, 62]].forEach(function (p) { f2 += S.path('hair-hi', P().M(p[0] - 7, p[1] - 4).Q(p[0], p[1] - 11, p[0] + 7, p[1] - 5).Q(p[0], p[1] - 7, p[0] - 7, p[1] - 4).Z().d); });
          var rk = S.path('hair-dk', P().M(42, 120).Q(50, 126, 46, 136).Q(46, 128, 40, 124).Z().d); f2 += rk + mirror(rk);
        }
      } else if (st === 'peekaboo') {
        /* long, with a deep side part and a big sweep over one eye (flip moves it to the other eye) */
        b2 = S.path(HK, P().M(28, 100).Q(28, 21, 100, 21).Q(172, 21, 172, 100).L(174, 226 - CB).Q(174, 240 - CB, 160, 238 - CB).L(40, 238 - CB).Q(26, 240 - CB, 26, 226 - CB).Z().d, o);
        f2 = S.path(HK, P().M(36, 104).A(65, 1, 1, 164, 104).L(166, 176 - CL).Q(160, 188 - CL, 148, 178 - CL).L(148, 104).Q(146, 66, 128, 50)
          .Q(108, 62, 98, 90).Q(90, 108, 74, 116).Q(64, 114, 56, 124).L(54, 178 - CL).Q(44, 188 - CL, 34, 176 - CL).Z().d, o);
        if (full) {
          f2 += S.path('hair-hi', P().M(56, 48).Q(84, 28, 120, 34).Q(88, 38, 64, 56).Z().d) +
            S.path('hair-dk', P().M(118, 56).Q(98, 74, 92, 106).Q(102, 76, 122, 58).Z().d) + S.path('hair-dk', P().M(92, 60).Q(72, 82, 66, 114).Q(78, 84, 96, 62).Z().d) +
            S.path('hair-dk', P().M(156, 112).Q(160, 140, 156, 170 - CL).Q(162, 140, 160, 112).Z().d);
        }
      } else if (st === 'crownbraid') {
        /* a braid wrapped over the top like a headband, a small bun at the back */
        b2 = S.path(HK, BK, o) + S.circ(HK, +m.x(100), +m.y(16), 18 * g.sx, o);
        if (full) { b2 += S.path('hair-hi', P().M(90, 8).Q(98, 0, 108, 2).Q(98, 4, 94, 12).Z().d); }
        f2 = S.path(HK, P().M(37, 104).A(64, 1, 1, 163, 104).L(156, 104).Q(150, 70, 100, 64).Q(50, 70, 44, 104).Z().d, o);
        var bseg = 11, a0 = 192 * Math.PI / 180, a1 = 348 * Math.PI / 180, bj2, rr3 = function (a, r) { return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r * 1.04]; };
        var band = P(), bo = rr3(a0, 67), bi3;
        band.M(bo[0], bo[1]);
        for (bj2 = 1; bj2 <= bseg; bj2++) {
          var am = a0 + (a1 - a0) * (bj2 - 0.5) / bseg, ae = a0 + (a1 - a0) * bj2 / bseg, cm = rr3(am, 71), ce = rr3(ae, 67);
          band.Q(cm[0], cm[1], ce[0], ce[1]);
        }
        bi3 = rr3(a1, 53); band.Q(rr3(a1, 60)[0] + 6, rr3(a1, 60)[1] + 4, bi3[0], bi3[1]);
        for (bj2 = bseg - 1; bj2 >= 0; bj2--) {
          var am2 = a0 + (a1 - a0) * (bj2 + 0.5) / bseg, ae2 = a0 + (a1 - a0) * bj2 / bseg, cm2 = rr3(am2, 50), ce2 = rr3(ae2, 53);
          band.Q(cm2[0], cm2[1], ce2[0], ce2[1]);
        }
        band.Q(rr3(a0, 60)[0] - 6, rr3(a0, 60)[1] + 4, bo[0], bo[1]).Z();
        f2 += S.path(HK, band.d, o);
        var chev = '';
        for (bj2 = 1; bj2 < bseg; bj2++) {
          var ac = a0 + (a1 - a0) * bj2 / bseg, an = a0 + (a1 - a0) * (bj2 + 0.45) / bseg, po = rr3(ac, 66), pc2 = rr3(an, 60), pi2 = rr3(ac, 54);
          chev += 'M' + m.x(po[0]) + ' ' + m.y(po[1]) + 'Q' + m.x((po[0] + pc2[0]) / 2) + ' ' + m.y((po[1] + pc2[1]) / 2 + 1) + ' ' + m.x(pc2[0]) + ' ' + m.y(pc2[1]) +
            'Q' + m.x((pi2[0] + pc2[0]) / 2) + ' ' + m.y((pi2[1] + pc2[1]) / 2 + 1) + ' ' + m.x(pi2[0]) + ' ' + m.y(pi2[1]);
        }
        f2 += sline(S, 'hair-dk', chev, 1.7 * g.sx);
        if (full) { f2 += S.path('hair-hi', P().M(60, 76).Q(80, 66, 100, 66).Q(80, 70, 64, 80).Z().d); }
      } else if (st === 'spacebuns') {
        var bun = S.circ(HK, +m.x(66), +m.y(24), 17 * g.sx, o) + (full ? S.path('hair-hi', P().M(56, 18).Q(60, 10, 70, 10).Q(62, 14, 60, 22).Z().d) : '');
        b2 = bun + mirror(bun) + S.path(HK, BK, o);
        f2 = S.path(HK, P().M(35, 104).A(66, 1, 1, 165, 104).L(156, 104).Q(152, 60, 102, 40).L(100, 34).L(98, 40).Q(48, 60, 44, 104).Z().d, o) + STRANDS(HK);
      }
      if (hairParts.streaks) { f2 += STRANDS('dye'); }
      return { back: b2, front: f2, over: '', shade: '' };
    }

    /* front hair: cap + side locks + fringe */
    var d0 = STYLES[st], d = { yt: d0.yt, fy: Math.max(d0.fyj + 2, d0.fy - CF), fyj: d0.fyj, lobes: d0.lobes, part: d0.part, curly: d0.curly, fr: d0.fr, spikes: d0.spikes,
      side: d0.side ? { yo: d0.side.yo - CL, xi: d0.side.xi, flat: d0.side.flat, point: d0.side.point, wavy: d0.side.wavy } : null };
    var dx = capDx(R, cyc, d.yt), lx = 100 - dx, rx = 100 + dx, pb = P();
    var kind = lvl === 'C' ? 'point' : 'round', lobes = lvl === 'D' ? Math.max(2, d.lobes - 1) : (lvl === 'C' ? d.lobes + 1 : d.lobes);
    if (d.curly) { kind = 'round'; lobes = lvl === 'A' ? 6 : 7; }
    if (d.fr === 'spike' || d.fr === 'sweep') { kind = d.fr; lobes = d.lobes + (lvl === 'C' ? 1 : 0); }
    if (d.spikes) {
      /* spiky crown: the cap is a ring of points */
      pb.M(lx, d.yt);
      var sa0 = Math.atan2(d.yt - cyc, lx - 100), sa1 = Math.atan2(d.yt - cyc, rx - 100) + Math.PI * 2, sk, sN = 11;
      for (sk = 1; sk < sN; sk++) { var aa = sa0 + (sa1 - sa0) * sk / sN, rr2 = sk % 2 ? R + 12 : R + 1; pb.L(100 + Math.cos(aa) * rr2, cyc + Math.sin(aa) * rr2); }
      pb.L(rx, d.yt);
    } else {
      pb.M(lx, d.yt).A(R, 1, 1, rx, d.yt);
    }
    var xi = d.side ? d.side.xi : rx - 4, xL = 200 - xi;
    if (d.side) {
      var yo = d.side.yo;
      if (d.side.wavy) { pb.Q(rx + 8, (d.yt + yo) * 0.33 + 20, rx, (d.yt + yo) / 2).Q(rx - 7, yo - 22, rx, yo); }
      else { pb.L(rx, d.side.flat ? yo + 8 : yo); }
      if (d.side.flat) { pb.L(xi, yo + 8); }
      else if (d.side.point) { pb.L((rx + xi) / 2 + 2, yo + 14).L(xi, yo); }
      else { pb.Q(rx, yo + 10, (rx + xi) / 2, yo + 10).Q(xi, yo + 10, xi, yo); }
      pb.L(xi, 100);
    }
    var f0 = xi - 15, f1 = xL + 15;
    pb.Q(xi - 1, d.fy, f0, d.fyj);
    if (d.fr === 'blunt') { pb.L(f0, d.fy).L(f1, d.fy); }
    else if (d.fr === 'line') { pb.Q(100, d.fy - 6, f1, d.fyj); }
    else if (d.part) {
      /* centre parting: two swoops meeting high in the middle */
      pb.Q(126, d.fy + 2, 104, d.fyj - 26).Q(98, d.fyj - 8, 92, d.fyj - 12);
      if (lvl === 'C') { pb.Q(84, d.fy - 6, 74, d.fy + 4).Q(78, d.fy - 8, f1, d.fyj); }
      else { pb.Q(78, d.fy + 2, f1, d.fyj); }
    } else {
      fringe(pb, f0, f1, d.fy, d.fyj, lobes, kind, d.fyj);
    }
    pb.Q(xL + 1, d.fy, xL, 100);
    if (d.side) {
      var yo2 = d.side.yo;
      if (d.side.flat) { pb.L(xL, yo2 + 8).L(lx, yo2 + 8); }
      else if (d.side.point) { pb.L(xL, yo2).L((lx + xL) / 2 - 2, yo2 + 14).L(lx, yo2); }
      else { pb.L(xL, yo2).Q(xL, yo2 + 10, (lx + xL) / 2, yo2 + 10).Q(lx, yo2 + 10, lx, yo2); }
      if (d.side.wavy) { pb.Q(lx + 7, yo2 - 22, lx, (d.yt + yo2) / 2).Q(lx - 8, (d.yt + yo2) * 0.33 + 20, lx, d.yt); }
    }
    pb.Z();
    front = S.path(HK, pb.d, !d.curly);
    if (st === 'halfup') {
      var tie = S.rect('acc', +m.x(130), +m.y(26), 16 * g.sx, 9 * g.sy, 4 * g.sx, o, 'rotate(-34 ' + m.x(138) + ' ' + m.y(30) + ')');
      front += tie + mirror(tie);
    }
    if (st === 'puffs') {
      front += S.rect('acc', +m.x(50), +m.y(52), 26 * g.sx, 11 * g.sy, 5 * g.sx, o, 'rotate(-48 ' + m.x(63) + ' ' + m.y(57) + ')') +
        S.rect('acc', +m.x(124), +m.y(52), 26 * g.sx, 11 * g.sy, 5 * g.sx, o, 'rotate(48 ' + m.x(137) + ' ' + m.y(57) + ')');
    }
    if (cut.extra === 'ahoge') {
      front += S.path(HK, P().M(97, cyc - R + 3).Q(86, cyc - R - 16, 104, cyc - R - 22).Q(96, cyc - R - 12, 104, cyc - R + 3).Z().d, o);
    } else if (cut.extra === 'bow') {
      var bw = S.path('acc', P().M(128, 36).L(110, 24).Q(104, 36, 110, 48).Z().d, o) + S.path('acc', P().M(128, 36).L(146, 22).Q(154, 36, 146, 50).Z().d, o) + S.circ('acc-dk', +m.x(128), +m.y(36), 5 * g.sx, o);
      front += bw;
    } else if (cut.extra === 'clips') {
      front += S.path('jewel', star(+m.x(136), +m.y(54), 6 * g.sx)) + S.path('jewel', star(+m.x(148), +m.y(66), 5 * g.sx));
    }
    if (st === 'curly' && lvl !== 'A') {
      var cc = '';
      [[62, 46], [86, 34], [114, 32], [138, 44], [100, 52], [74, 64], [128, 62]].forEach(function (p) { cc += S.path(lvl === 'C' ? 'hair-hi' : 'hair-dk', P().M(p[0] - 6, p[1]).Q(p[0], p[1] - 7, p[0] + 6, p[1]).Q(p[0], p[1] - 3.4, p[0] - 6, p[1]).Z().d); });
      front += cc;
    }

    /* shade on the forehead just under the fringe (C) */
    if (lvl === 'C' || lvl === 'D') {
      var s2 = P().M(xi - 2, 100).Q(xi - 2, d.fy + 4, f0, d.fyj + 5);
      if (d.fr === 'blunt') { s2.L(f0, d.fy + 5).L(f1, d.fy + 5); }
      else if (d.fr === 'line') { s2.Q(100, d.fy - 1, f1, d.fyj + 5); }
      else if (d.part) { s2.Q(126, d.fy + 7, 104, d.fyj - 20).Q(98, d.fyj - 4, 92, d.fyj - 7).Q(78, d.fy + 7, f1, d.fyj + 5); }
      else { fringe(s2, f0, f1, d.fy + 5, d.fyj + 5, lobes, kind, d.fyj + 5); }
      s2.Q(xL + 2, d.fy + 4, xL + 2, 100).L(xL + 2, 94).Q(100, d.fyj - 6, xi - 2, 94).Z();
      shade = S.path('skin-sh', s2.d);
    }

    /* highlights and strands */
    if (lvl === 'C') {
      over += S.path('hair-hi', P().M(56, 46).Q(74, 28, 100, 26).Q(78, 34, 62, 52).Z().d) +
        S.path('hair-hi', P().M(108, 26).Q(126, 26, 140, 36).Q(124, 32, 110, 32).Z().d) +
        S.path('hair-hi', P().M(46, 66).Q(48, 58, 54, 54).Q(52, 62, 50, 70).Z().d);
      if (!d.curly) {
        var xs = d.part ? [118, 84] : [];
        if (!d.part) { var i2, st2 = (f1 - f0) / lobes; for (i2 = 1; i2 < lobes; i2++) { xs.push(f0 + st2 * i2); } }
        xs.forEach(function (x) { over += S.path('hair-dk', P().M(x - 1, d.fyj + 2).Q(x - 4, d.fyj - 12, x + 3, d.fyj - 26).Q(x + 1, d.fyj - 12, x + 1.6, d.fyj + 2).Z().d); });
      }
      if (d.side) {
        over += S.path('hair-dk', P().M(xi + 6, 110).Q(xi + 9, 130, xi + 6, d.side.yo + 4).Q(xi + 11, 130, xi + 9, 110).Z().d) +
          S.path('hair-dk', P().M(xL - 6, 110).Q(xL - 9, 130, xL - 6, d.side.yo + 4).Q(xL - 11, 130, xL - 9, 110).Z().d);
      }
    } else if (lvl === 'D') {
      over += S.path('hair-hi', P().M(58, 50).Q(76, 30, 104, 28).Q(80, 40, 66, 58).Z().d);
    }
    if (hairParts.streaks) {
      var sL2 = S.path('dye', P().M(98, cyc - R + 6).Q(70, cyc - R + 10, 60, 64).Q(54, 96, 56, 124 - CL * 0.5).L(64, 124 - CL * 0.5).Q(62, 96, 68, 66).Q(76, cyc - R + 18, 100, cyc - R + 12).Z().d, o);
      over += sL2 + mirror(sL2);
    }
    if (rainbow) {
      /* dyed highlights: thin tapered streaks that follow the hair from the crown to the fringe, and down the side locks */
      var hlN = 5, hw = (f1 - f0) / hlN;
      for (var hi2 = 0; hi2 < hlN; hi2++) {
        var ex2 = f0 + hw * (hi2 + 0.5), sx2 = 100 + (ex2 - 100) * 0.45, sy2 = cyc - R + 9;
        over += S.path('dye', P().M(sx2 - 1, sy2).Q(sx2 + (ex2 - sx2) * 0.3 - 3.4, (sy2 + d.fyj) / 2, ex2 - 1.2, d.fyj + 1).L(ex2 + 1.2, d.fyj + 1).Q(sx2 + (ex2 - sx2) * 0.3 + 3.4, (sy2 + d.fyj) / 2, sx2 + 1, sy2).Z().d);
      }
      if (d.side) {
        [xi + 8, xi + 14].forEach(function (x) {
          var x2 = 200 - x;
          over += S.path('dye', P().M(x, 106).Q(x - 3, 130, x - 1, d.side.yo + 2).L(x + 1.6, d.side.yo + 2).Q(x + 2, 130, x + 2, 106).Z().d) +
            S.path('dye', P().M(x2, 106).Q(x2 + 3, 130, x2 + 1, d.side.yo + 2).L(x2 - 1.6, d.side.yo + 2).Q(x2 - 2, 130, x2 - 2, 106).Z().d);
        });
      }
    }
    return { back: back, front: front, over: over, shade: shade };
  }

  /* ---------- face ---------- */
  var EXPR = ['happy', 'surprised', 'sleepy', 'silly', 'sad', 'determined'];
  var EXPR_LABEL = { happy: 'Happy', surprised: 'Surprised', sleepy: 'Sleepy', silly: 'Silly', sad: 'Sad', determined: 'Determined' };

  /* upper lash line with a little flick at the outer corner (side = which way is "outer") */
  function lash(S, X, Y, s, side) {
    var inX = X - side * 11 * s, tipX = X + side * 14 * s;
    return S.path(INK, 'M' + n(inX) + ' ' + n(Y - 1 * s) + 'Q' + n(X - side * 8 * s) + ' ' + n(Y - 13.5 * s) + ' ' + n(X + side * 2 * s) + ' ' + n(Y - 12.4 * s) +
      'Q' + n(X + side * 10 * s) + ' ' + n(Y - 11.5 * s) + ' ' + n(tipX) + ' ' + n(Y - 8 * s) +
      'Q' + n(X + side * 7 * s) + ' ' + n(Y - 9.4 * s) + ' ' + n(X) + ' ' + n(Y - 10 * s) + 'Q' + n(X - side * 8 * s) + ' ' + n(Y - 9.6 * s) + ' ' + n(inX) + ' ' + n(Y - 1 * s) + 'Z');
  }

  /* one eye at reference position (cx, 100); side -1 = her right (viewer's left) */
  function eye(S, g, lvl, ex, cx, side, wink) {
    var m = g.m, k = g.eyeK, X = +m.x(cx), Y = +m.y(100), s = g.sx * k, out = '';
    var open = ex !== 'sleepy' && !wink;
    if (!open) {
      var w = (lvl === 'A' ? 7 : 9) * s, up = wink ? -1 : 1, lw = lvl === 'D' ? 3.4 : (lvl === 'A' ? 3.2 : 3);
      return S.line(INK, 'M' + n(X - w) + ' ' + n(Y) + 'Q' + n(X) + ' ' + n(Y + up * 6 * s) + ' ' + n(X + w) + ' ' + n(Y), lw * g.sx);
    }
    var big = ex === 'surprised' ? 1.16 : (ex === 'sad' ? 0.92 : 1);
    s *= big;
    if (lvl === 'A') {
      out = S.ell(INK, X, Y, 6 * s, 8 * s);
    } else if (lvl === 'B') {
      out = S.ell('eye', X, Y, 8.5 * s, 10.5 * s) + S.circ(PAPER, X + 2.8 * s, Y - 3.8 * s, 3.2 * s) + S.circ(PAPER, X - 2.6 * s, Y + 4 * s, 1.4 * s);
    } else if (lvl === 'C') {
      out = S.ell(PAPER, X, Y, 9.4 * s, 11 * s) + S.ell('eye', X, Y + 1.2 * s, 7.8 * s, 9 * s) + S.ell(INK, X, Y + 1.8 * s, 4.2 * s, 5 * s) +
        S.circ(PAPER, X + 2.8 * s, Y - 1.4 * s, 2.6 * s) + S.circ(PAPER, X - 2.4 * s, Y + 4.6 * s, 1.1 * s) +
        lash(S, X, Y, s, side);
    } else {
      out = S.ell('eye', X, Y, 9.5 * s, 12.5 * s) + S.ell(INK, X, Y + 1.5 * s, 5 * s, 6.8 * s) +
        S.circ(PAPER, X + 3.2 * s, Y - 4.6 * s, 3.6 * s) + S.circ(PAPER, X - 3.6 * s, Y + 5 * s, 1.6 * s) +
        S.line(INK, 'M' + n(X - 9.5 * s) + ' ' + n(Y - 2 * s) + 'Q' + n(X - 8 * s) + ' ' + n(Y - 13 * s) + ' ' + n(X) + ' ' + n(Y - 12.8 * s) + 'Q' + n(X + 8 * s) + ' ' + n(Y - 13 * s) + ' ' + n(X + 11.5 * s) + ' ' + n(Y - 6.5 * s), 3 * g.sx);
    }
    /* determined: a skin-coloured lid cuts the top of the eye at a slant */
    if (ex === 'determined') {
      var lx0 = X - 13 * s, lx1 = X + 13 * s, inner = side < 0 ? lx1 : lx0;
      out += '<path ' + S.p.a('skin') + ' d="M' + n(lx0) + ' ' + n(Y - 16 * s) + 'L' + n(lx1) + ' ' + n(Y - 16 * s) +
        'L' + n(lx1) + ' ' + n(Y + (inner === lx1 ? -1 : -6) * s) + 'L' + n(lx0) + ' ' + n(Y + (inner === lx0 ? -1 : -6) * s) + 'Z"/>';
    }
    return out;
  }

  function brows(S, g, lvl, ex, browKey) {
    var m = g.m, k = g.eyeK, s = g.sx * k, out = '', i;
    var always = lvl === 'C' || lvl === 'D' || g.older;
    if (!always && ['surprised', 'sad', 'determined'].indexOf(ex) < 0) { return ''; }
    for (i = -1; i <= 1; i += 2) {
      var X = +m.x(100 + 22 * i), Y = +m.y(100) - (lvl === 'A' ? 15 : 18) * s - (ex === 'surprised' ? 6 * s : 0);
      var tilt = ex === 'sad' ? -1 : (ex === 'determined' ? 1 : 0), inner = X - 8 * s * i, outer = X + 8 * s * i;
      var yi = Y + tilt * 4 * s, yo = Y - tilt * 2 * s;
      var w = lvl === 'D' ? 3.8 : (lvl === 'C' ? 3.4 : 3);
      out += S.line(lvl === 'C' ? S.p.colorOf(browKey) : INK, 'M' + n(inner) + ' ' + n(yi) + 'Q' + n(X) + ' ' + n(Math.min(yi, yo) - 3 * s) + ' ' + n(outer) + ' ' + n(yo), w * g.sx);
    }
    if (lvl === 'C' && S.p.mode === 'class') { out = out.replace(/stroke="[^"]+"/g, 'class="b-' + browKey + '"').replace(/class="b-([a-z\-]+)" stroke-width/g, 'class="b-$1" stroke-width'); }
    return out;
  }

  function mouth(S, g, lvl, ex) {
    var m = g.m, X = +m.x(100), Y = +m.y(124), s = g.sx * (g.young ? 1.05 : 1), out = '';
    var lw = (lvl === 'D' ? 4.2 : 3.8) * g.sx;
    var P = function (pts) { return pts; };
    void P;
    if (lvl === 'A') {
      if (ex === 'happy') { return S.path(INK, 'M' + n(X - 13 * s) + ' ' + n(Y - 7 * s) + 'H' + n(X + 13 * s) + 'Q' + n(X + 13 * s) + ' ' + n(Y + 11 * s) + ' ' + n(X) + ' ' + n(Y + 11 * s) + 'Q' + n(X - 13 * s) + ' ' + n(Y + 11 * s) + ' ' + n(X - 13 * s) + ' ' + n(Y - 7 * s) + 'Z') + S.path(TONGUE, 'M' + n(X - 8 * s) + ' ' + n(Y + 6 * s) + 'Q' + n(X) + ' ' + n(Y) + ' ' + n(X + 8 * s) + ' ' + n(Y + 6 * s) + 'Q' + n(X + 4 * s) + ' ' + n(Y + 11 * s) + ' ' + n(X) + ' ' + n(Y + 11 * s) + 'Q' + n(X - 4 * s) + ' ' + n(Y + 11 * s) + ' ' + n(X - 8 * s) + ' ' + n(Y + 6 * s) + 'Z'); }
      if (ex === 'surprised') { return S.ell(INK, X, Y + 2 * s, 6 * s, 7.5 * s); }
      if (ex === 'sleepy') { return S.ell(INK, X, Y + 1 * s, 4 * s, 3.4 * s); }
      if (ex === 'silly') { return S.line(INK, 'M' + n(X - 10 * s) + ' ' + n(Y - 3 * s) + 'Q' + n(X) + ' ' + n(Y + 6 * s) + ' ' + n(X + 10 * s) + ' ' + n(Y - 3 * s), lw) + S.rect(TONGUE, X + 1 * s, Y + 1 * s, 9 * s, 10 * s, 4.5 * s); }
      if (ex === 'sad') { return S.line(INK, 'M' + n(X - 9 * s) + ' ' + n(Y + 5 * s) + 'Q' + n(X) + ' ' + n(Y - 3 * s) + ' ' + n(X + 9 * s) + ' ' + n(Y + 5 * s), lw); }
      return S.line(INK, 'M' + n(X - 9 * s) + ' ' + n(Y + 1 * s) + 'L' + n(X + 9 * s) + ' ' + n(Y - 1 * s), lw);
    }
    var MC = lvl === 'D' ? INK : MOUTH;
    if (ex === 'happy') {
      out = S.path(MC, 'M' + n(X - 14 * s) + ' ' + n(Y - 6 * s) + 'Q' + n(X) + ' ' + n(Y - 2 * s) + ' ' + n(X + 14 * s) + ' ' + n(Y - 6 * s) + 'Q' + n(X + 12 * s) + ' ' + n(Y + 12 * s) + ' ' + n(X) + ' ' + n(Y + 12 * s) + 'Q' + n(X - 12 * s) + ' ' + n(Y + 12 * s) + ' ' + n(X - 14 * s) + ' ' + n(Y - 6 * s) + 'Z') +
        S.path(TONGUE, 'M' + n(X - 8 * s) + ' ' + n(Y + 8 * s) + 'Q' + n(X) + ' ' + n(Y + 2 * s) + ' ' + n(X + 8 * s) + ' ' + n(Y + 8 * s) + 'Q' + n(X) + ' ' + n(Y + 13 * s) + ' ' + n(X - 8 * s) + ' ' + n(Y + 8 * s) + 'Z');
      if (lvl === 'C') { out += S.path(PAPER, 'M' + n(X - 11 * s) + ' ' + n(Y - 4.6 * s) + 'Q' + n(X) + ' ' + n(Y - 1 * s) + ' ' + n(X + 11 * s) + ' ' + n(Y - 4.6 * s) + 'L' + n(X + 10 * s) + ' ' + n(Y - 1 * s) + 'Q' + n(X) + ' ' + n(Y + 2 * s) + ' ' + n(X - 10 * s) + ' ' + n(Y - 1 * s) + 'Z'); }
    } else if (ex === 'surprised') {
      out = S.ell(MC, X, Y + 3 * s, 7 * s, 9 * s) + S.ell(TONGUE, X, Y + 8 * s, 4.6 * s, 3 * s);
    } else if (ex === 'sleepy') {
      out = S.ell(MC, X, Y + 2 * s, 5 * s, 4.4 * s);
    } else if (ex === 'silly') {
      out = S.line(MC, 'M' + n(X - 12 * s) + ' ' + n(Y - 4 * s) + 'Q' + n(X) + ' ' + n(Y + 7 * s) + ' ' + n(X + 12 * s) + ' ' + n(Y - 4 * s), lw) +
        S.path(TONGUE, 'M' + n(X + 0.5 * s) + ' ' + n(Y + 1 * s) + 'L' + n(X + 10.5 * s) + ' ' + n(Y - 0.5 * s) + 'L' + n(X + 11 * s) + ' ' + n(Y + 7 * s) + 'Q' + n(X + 11 * s) + ' ' + n(Y + 13 * s) + ' ' + n(X + 6 * s) + ' ' + n(Y + 13 * s) + 'Q' + n(X + 1 * s) + ' ' + n(Y + 13 * s) + ' ' + n(X + 0.5 * s) + ' ' + n(Y + 7 * s) + 'Z', lvl === 'D') +
        (lvl === 'C' ? S.rect('#E05A4E', X + 5.4 * s, Y + 3 * s, 1.4 * s, 6 * s, 0.7 * s) : '');
    } else if (ex === 'sad') {
      out = S.line(MC, 'M' + n(X - 10 * s) + ' ' + n(Y + 6 * s) + 'Q' + n(X) + ' ' + n(Y - 4 * s) + ' ' + n(X + 10 * s) + ' ' + n(Y + 6 * s), lw);
    } else {
      out = S.line(MC, 'M' + n(X - 10 * s) + ' ' + n(Y + 2 * s) + 'Q' + n(X) + ' ' + n(Y - 1 * s) + ' ' + n(X + 10 * s) + ' ' + n(Y) , lw);
    }
    return out;
  }

  function face(S, g, t, ex, browKey) {
    var lvl = t.face, el = t.eyes, m = g.m, out = '', s = g.sx;
    /* cheeks */
    if (ex !== 'determined' || lvl !== 'A') {
      var cy = +m.y(120), cxL = +m.x(66);
      if (lvl === 'A') { out += S.circ(CHEEK, cxL, cy, 8 * s) + S.circ(CHEEK, 200 - cxL, cy, 8 * s); }
      else {
        var ck = (ex === 'silly' || ex === 'happy') ? '#FF8FA3' : '#FFA3B5';
        var c1 = S.ell(ck, +m.x(64), +m.y(118), 10 * s, 6.5 * s) + (lvl === 'C' ? S.circ(PAPER, +m.x(60), +m.y(116), 1.8 * s) : '') +
          (lvl === 'D' ? S.rect('#E66F8A', +m.x(59), +m.y(116), 2 * s, 5 * s, 1 * s, false, 'rotate(20 ' + m.x(60) + ' ' + m.y(118) + ')') + S.rect('#E66F8A', +m.x(66), +m.y(116), 2 * s, 5 * s, 1 * s, false, 'rotate(20 ' + m.x(67) + ' ' + m.y(118) + ')') : '');
        out += c1 + mirror(c1);
      }
    }
    /* eyes */
    out += eye(S, g, el, ex, 78, -1, false) + eye(S, g, el, ex, 122, 1, ex === 'silly');
    out += brows(S, g, el, ex, browKey);
    /* nose */
    if (lvl === 'B') { out += S.ell('skin-dk', +m.x(100), +m.y(112), 3.4 * s, 2.4 * s); }
    else if (lvl === 'C') { out += S.path('skin-dk', new PB(m).M(96, 110).Q(100, 116.5, 104, 110).Q(100, 113.5, 96, 110).Z().d); }
    else if (lvl === 'D') { out += S.line(INK, 'M' + m.x(97) + ' ' + m.y(111) + 'Q' + m.x(100) + ' ' + m.y(114) + ' ' + m.x(103) + ' ' + m.y(111), 2.6 * s); }
    /* tear */
    if (ex === 'sad' && lvl !== 'A') { out += S.path(TEAR, new PB(m).M(70, 111).Q(66, 119, 70, 121).Q(74, 119, 70, 111).Z().d); }
    /* older: a couple of lash flicks; younger: nothing extra */
    out += mouth(S, g, lvl, ex);
    return out;
  }


  /* ---------- face kit: interchangeable eyes, brows, noses, smiles and cheeks (used with option C) ---------- */
  var KIT = {
    eyes: [['e1', 'Dot'], ['e2', 'Dot + shine'], ['e3', 'Button'], ['e4', 'Bean'], ['e5', 'Lash dot'], ['e6', 'Sleepy lids'],
      ['e7', 'Smiley'], ['e8', 'Almond'], ['e9', 'Big round'], ['e10', 'Lower lashes'], ['e11', 'Sparkle'], ['e12', 'Half-moon']],
    brows: [['b1', 'None'], ['b2', 'Thin arch'], ['b3', 'Straight'], ['b4', 'Short dash'], ['b5', 'Curious'], ['b6', 'Bushy']],
    nose: [['n1', 'None'], ['n2', 'Dot'], ['n3', 'Button'], ['n4', 'Curve'], ['n5', 'Side hook'], ['n6', 'Soft triangle']],
    mouth: [['m1', 'Big grin'], ['m2', 'Small smile'], ['m3', 'Open smile'], ['m4', 'Cat smile'], ['m5', 'Tooth gap'], ['m6', 'Wide smile'], ['m7', 'Smirk'], ['m8', 'Little o']],
    cheeks: [['c1', 'None'], ['c2', 'Circles'], ['c3', 'Ovals'], ['c4', 'Ovals + shine']]
  };
  var KIT_DEFAULT = { eyes: 'e9', brows: 'b2', nose: 'n4', mouth: 'm1', cheeks: 'c4' };

  function P2(x, y) { return n(x) + ' ' + n(y); }

  /* one open eye in the kit style; side = +1 when "outer" is to the right */
  function kitOpen(S, id, X, Y, s, side) {
    var o = '';
    switch (id) {
      case 'e1': return S.ell(INK, X, Y, 5.5 * s, 7 * s);
      case 'e2': return S.ell(INK, X, Y, 7 * s, 9 * s) + S.circ(PAPER, X + side * 2.4 * s, Y - 3.2 * s, 2.4 * s);
      case 'e3': return S.circ(INK, X, Y, 7.4 * s) + S.circ(PAPER, X + side * 2.6 * s, Y - 2.6 * s, 2.8 * s) + S.circ(PAPER, X - side * 2.4 * s, Y + 3 * s, 1.2 * s);
      case 'e4': return S.ell('eye', X, Y, 8.5 * s, 10.5 * s) + S.circ(PAPER, X + side * 2.8 * s, Y - 3.8 * s, 3.2 * s) + S.circ(PAPER, X - side * 2.6 * s, Y + 4 * s, 1.4 * s);
      case 'e5':
        return S.ell(INK, X, Y, 6.5 * s, 8.5 * s) + S.circ(PAPER, X + side * 2.2 * s, Y - 3 * s, 2.3 * s) +
          S.line(INK, 'M' + P2(X + side * 4.6 * s, Y - 6.6 * s) + 'L' + P2(X + side * 9.4 * s, Y - 10.4 * s), 2.4 * s) +
          S.line(INK, 'M' + P2(X + side * 6.2 * s, Y - 3.4 * s) + 'L' + P2(X + side * 11 * s, Y - 5.6 * s), 2.4 * s);
      case 'e6':
        o = S.ell('eye', X, Y, 8 * s, 9.6 * s) + S.ell(INK, X, Y + 1.6 * s, 4.2 * s, 5 * s) + S.circ(PAPER, X + side * 2.4 * s, Y + 0.6 * s, 1.8 * s);
        o += '<path ' + S.p.a('skin') + ' d="M' + P2(X - 10.5 * s, Y - 12 * s) + 'H' + n(X + 10.5 * s) + 'V' + n(Y - 4.6 * s) + 'Q' + P2(X, Y - 3 * s) + ' ' + P2(X - 10.5 * s, Y - 4.6 * s) + 'Z"/>';
        return o + S.line(INK, 'M' + P2(X - 9.4 * s, Y - 4.4 * s) + 'Q' + P2(X, Y - 3.2 * s) + ' ' + P2(X + 9.4 * s, Y - 4.4 * s), 2.4 * s);
      case 'e7': return S.line(INK, 'M' + P2(X - 8 * s, Y + 1.5 * s) + 'Q' + P2(X, Y - 8 * s) + ' ' + P2(X + 8 * s, Y + 1.5 * s), 3.2 * s);
      case 'e8':
        o = S.path(PAPER, 'M' + P2(X - 11 * s, Y) + 'Q' + P2(X, Y - 13 * s) + ' ' + P2(X + 11 * s, Y) + 'Q' + P2(X, Y + 12 * s) + ' ' + P2(X - 11 * s, Y) + 'Z') +
          S.circ('eye', X, Y + 0.3 * s, 5.4 * s) + S.circ(INK, X, Y + 0.6 * s, 2.9 * s) + S.circ(PAPER, X + side * 1.8 * s, Y - 1.8 * s, 1.6 * s);
        return o + S.line(INK, 'M' + P2(X - side * 11.5 * s, Y + 0.6 * s) + 'Q' + P2(X, Y - 13.4 * s) + ' ' + P2(X + side * 11.6 * s, Y - 0.4 * s) + 'L' + P2(X + side * 14.2 * s, Y - 3.6 * s), 2.8 * s);
      case 'e9':
        return S.ell(PAPER, X, Y, 9.4 * s, 11 * s) + S.ell('eye', X, Y + 1.2 * s, 7.8 * s, 9 * s) + S.ell(INK, X, Y + 1.8 * s, 4.2 * s, 5 * s) +
          S.circ(PAPER, X + side * 2.8 * s, Y - 1.4 * s, 2.6 * s) + S.circ(PAPER, X - side * 2.4 * s, Y + 4.6 * s, 1.1 * s) + lash(S, X, Y, s, side);
      case 'e10':
        return kitOpen(S, 'e4', X, Y, s, side) +
          S.line(INK, 'M' + P2(X + side * 3 * s, Y + 10.2 * s) + 'L' + P2(X + side * 4.4 * s, Y + 14 * s), 2.4 * s) +
          S.line(INK, 'M' + P2(X + side * 6.6 * s, Y + 8.4 * s) + 'L' + P2(X + side * 9.4 * s, Y + 11.6 * s), 2.4 * s) +
          S.line(INK, 'M' + P2(X + side * 8.4 * s, Y - 6.4 * s) + 'L' + P2(X + side * 11.6 * s, Y - 9.4 * s), 2.4 * s);
      case 'e11':
        return S.circ(INK, X, Y, 8.2 * s) + S.circ(PAPER, X + side * 2.6 * s, Y - 3 * s, 3.6 * s) + S.circ(PAPER, X - side * 2.8 * s, Y + 3.4 * s, 1.8 * s) + S.circ(PAPER, X + side * 4.4 * s, Y + 2.4 * s, 0.9 * s);
      case 'e12':
        return S.path(INK, 'M' + P2(X - 8 * s, Y + 3 * s) + 'Q' + P2(X - 8 * s, Y - 10 * s) + ' ' + P2(X, Y - 10 * s) + 'Q' + P2(X + 8 * s, Y - 10 * s) + ' ' + P2(X + 8 * s, Y + 3 * s) + 'Q' + P2(X, Y + 5.4 * s) + ' ' + P2(X - 8 * s, Y + 3 * s) + 'Z') +
          S.circ(PAPER, X + side * 2.6 * s, Y - 4 * s, 2.6 * s);
    }
    return '';
  }

  function kitEye(S, g, id, ex, cx, side, wink, k) {
    var m = g.m, X = +m.x(cx), Y = +m.y(100), s = g.sx * g.eyeK, out;
    k = k || {};
    var mk = k.makeup || 'k1', ek = (k.hetero === 'h2' && cx > 100) ? 'eye2' : 'eye', pu = k.pupil || 'p1';
    var pre = '', anime = id.charAt(0) === 'a';
    if (ex === 'sleepy' || wink) {
      var up = wink ? -1 : 1;
      return pre + S.line(INK, 'M' + P2(X - 8 * s, Y) + 'Q' + P2(X, Y + up * 6 * s) + ' ' + P2(X + 8 * s, Y), 3 * g.sx) +
        (anime || mk === 'k2' || mk === 'k4' || mk === 'k7' ? S.line(INK, 'M' + P2(X + side * 8 * s, Y + (wink ? 0 : 0.5) * s) + 'L' + P2(X + side * 12 * s, Y - 3 * s), 2.6 * g.sx) : '');
    }
    /* smiley eyes are closed happy arcs; surprise, sadness and focus open them as buttons */
    if (id === 'e7' && (ex === 'surprised' || ex === 'sad' || ex === 'determined')) { id = 'e3'; }
    s *= ex === 'surprised' ? 1.16 : (ex === 'sad' ? 0.92 : 1);
    if (k.glow === 'g2') { out = glowEye(S, X, Y, s); }
    else if (anime) { out = animeOpen(S, id, X, Y, s, side, ek, pu); }
    else if (PUPIL_EYES.indexOf(id) >= 0) { out = detailedOpen(S, id, X, Y, s, side, ek, pu); }
    else { out = kitOpen(S, id, X, Y, s, side).split("'eye'").join("'eye'"); if (ek === 'eye2') { out = out.replace(/c-eye(?=["\s])/g, 'c-eye2').replace(new RegExp(S.p.colorOf('eye'), 'g'), S.p.colorOf('eye2')); } }
    out = pre + out + makeupOver(S, mk, X, Y, s, side);
    if (ex === 'determined' && id !== 'e7') {
      var lx0 = X - 13 * s, lx1 = X + 13 * s, innerRight = side < 0;
      out += '<path ' + S.p.a('skin') + ' d="M' + P2(lx0, Y - 16 * s) + 'L' + P2(lx1, Y - 16 * s) + 'L' + P2(lx1, Y + (innerRight ? -1 : -6) * s) + 'L' + P2(lx0, Y + (innerRight ? -6 : -1) * s) + 'Z"/>';
    }
    return out;
  }

  function browStroke(S, d, w) {
    if (S.p.mode === 'class') { return '<path fill="none" class="b-hair-dk" stroke-width="' + n(w) + '" stroke-linecap="round" d="' + d + '"/>'; }
    return S.line(S.p.colorOf('hair-dk'), d, w);
  }

  function kitBrows(S, g, id, ex) {
    if (id === 'b1') {
      if (['sad', 'determined', 'surprised'].indexOf(ex) < 0) { return ''; }
      id = 'b4';                                   /* emotions need a brow to read */
    }
    var m = g.m, s = g.sx * g.eyeK, out = '', i;
    for (i = -1; i <= 1; i += 2) {
      var X = +m.x(100 + 22 * i), Y = +m.y(100) - 18 * s - (ex === 'surprised' ? 6 * s : 0);
      if (id === 'b5' && i === 1) { Y -= 4 * s; }
      var tilt = ex === 'sad' ? -1 : (ex === 'determined' ? 1 : 0), inner = X - 8 * s * i, outer = X + 8 * s * i;
      var yi = Y + tilt * 4 * s, yo = Y - tilt * 2 * s;
      if (id === 'b2' || id === 'b5') { out += browStroke(S, 'M' + P2(inner, yi) + 'Q' + P2(X, Math.min(yi, yo) - (id === 'b5' && i === 1 ? 6 : 3) * s) + ' ' + P2(outer, yo), 3.4 * g.sx); }
      else if (id === 'b3') { out += browStroke(S, 'M' + P2(inner, yi) + 'L' + P2(outer, yo), 4.6 * g.sx); }
      else if (id === 'b7') { out += browStroke(S, 'M' + P2(X - 5 * s * i, yi - 1 * s) + 'Q' + P2(X + 1 * s * i, Math.min(yi, yo) - 3.4 * s) + ' ' + P2(X + 7 * s * i, yo + 1 * s), 2.2 * g.sx); }
      else if (id === 'b4') { out += browStroke(S, 'M' + P2(X - 4 * s * i, yi * 0.6 + yo * 0.4) + 'L' + P2(X + 4 * s * i, yo * 0.6 + yi * 0.4), 4.6 * g.sx); }
      else if (id === 'b6') {
        out += S.path('hair-dk', 'M' + P2(inner, yi + 2 * s) + 'Q' + P2(X, Math.min(yi, yo) - 6 * s) + ' ' + P2(outer, yo) + 'Q' + P2(X, Math.min(yi, yo) - 1 * s) + ' ' + P2(inner, yi + 2 * s) + 'Z');
      }
    }
    return out;
  }

  function kitNose(S, g, id) {
    var m = g.m, s = g.sx, pb = function () { return new PB(m); };
    switch (id) {
      case 'n2': return S.ell('skin-dk', +m.x(100), +m.y(112), 3.4 * s, 2.4 * s);
      case 'n3': return S.ell('skin-sh', +m.x(100), +m.y(111), 6.4 * s, 4.6 * s) + S.circ('skin-hi', +m.x(98), +m.y(109.4), 1.6 * s);
      case 'n4': return S.path('skin-dk', pb().M(96, 110).Q(100, 116.5, 104, 110).Q(100, 113.5, 96, 110).Z().d);
      case 'n5': return S.path('skin-dk', pb().M(101, 103).Q(107, 111, 101, 114.5).Q(98.5, 114.5, 98, 113).Q(104, 111, 101, 103).Z().d);
      case 'n7': return S.path('skin-dk', pb().M(101, 109).L(103.2, 113.4).Q(101.4, 114, 99.6, 113.6).L(102, 113).Z().d);
      case 'n6': return S.path('skin-sh', pb().M(100, 105).Q(102, 105, 106, 113).Q(100, 116, 94, 113).Q(98, 105, 100, 105).Z().d);
    }
    return '';
  }

  function kitMouth(S, g, id) {
    var m = g.m, X = +m.x(100), Y = +m.y(124), s = g.sx, w = 3.6 * g.sx;
    switch (id) {
      case 'm1': return mouth(S, g, 'C', 'happy');
      case 'm2': return S.line(MOUTH, 'M' + P2(X - 9 * s, Y - 1 * s) + 'Q' + P2(X, Y + 7 * s) + ' ' + P2(X + 9 * s, Y - 1 * s), w);
      case 'm3': return mouth(S, g, 'B', 'happy');
      case 'm4': return S.line(MOUTH, 'M' + P2(X - 10 * s, Y - 2 * s) + 'Q' + P2(X - 5 * s, Y + 6 * s) + ' ' + P2(X, Y) + 'Q' + P2(X + 5 * s, Y + 6 * s) + ' ' + P2(X + 10 * s, Y - 2 * s), w);
      case 'm5':
        return S.path(MOUTH, 'M' + P2(X - 12 * s, Y - 5 * s) + 'H' + n(X + 12 * s) + 'Q' + P2(X + 11 * s, Y + 11 * s) + ' ' + P2(X, Y + 11 * s) + 'Q' + P2(X - 11 * s, Y + 11 * s) + ' ' + P2(X - 12 * s, Y - 5 * s) + 'Z') +
          S.rect(PAPER, X - 6.4 * s, Y - 5 * s, 5.4 * s, 5 * s, 1.2 * s) + S.rect(PAPER, X + 1 * s, Y - 5 * s, 5.4 * s, 5 * s, 1.2 * s) +
          S.path(TONGUE, 'M' + P2(X - 7 * s, Y + 7 * s) + 'Q' + P2(X, Y + 2 * s) + ' ' + P2(X + 7 * s, Y + 7 * s) + 'Q' + P2(X, Y + 12 * s) + ' ' + P2(X - 7 * s, Y + 7 * s) + 'Z');
      case 'm6':
        return S.path(MOUTH, 'M' + P2(X - 18 * s, Y - 6 * s) + 'Q' + P2(X, Y - 2 * s) + ' ' + P2(X + 18 * s, Y - 6 * s) + 'Q' + P2(X + 14 * s, Y + 10 * s) + ' ' + P2(X, Y + 10 * s) + 'Q' + P2(X - 14 * s, Y + 10 * s) + ' ' + P2(X - 18 * s, Y - 6 * s) + 'Z') +
          S.path(TONGUE, 'M' + P2(X - 9 * s, Y + 6 * s) + 'Q' + P2(X, Y + 1 * s) + ' ' + P2(X + 9 * s, Y + 6 * s) + 'Q' + P2(X, Y + 11 * s) + ' ' + P2(X - 9 * s, Y + 6 * s) + 'Z');
      case 'm7':
        return S.line(MOUTH, 'M' + P2(X - 9 * s, Y + 2 * s) + 'Q' + P2(X + 2 * s, Y + 6 * s) + ' ' + P2(X + 11 * s, Y - 3 * s), w) +
          S.line(MOUTH, 'M' + P2(X + 11.5 * s, Y - 6 * s) + 'Q' + P2(X + 13.5 * s, Y - 3 * s) + ' ' + P2(X + 12.5 * s, Y), 2 * g.sx);
      case 'm8': return S.ell(MOUTH, X, Y + 2 * s, 4 * s, 4.6 * s) + S.ell(TONGUE, X, Y + 4.2 * s, 2.4 * s, 1.6 * s);
      case 'm9': return S.line(MOUTH, 'M' + P2(X - 5 * s, Y) + 'Q' + P2(X - 2.4 * s, Y + 3.6 * s) + ' ' + P2(X, Y + 1 * s) + 'Q' + P2(X + 2.4 * s, Y + 3.6 * s) + ' ' + P2(X + 5 * s, Y), 2.6 * g.sx);
      case 'm10': return S.path(MOUTH, 'M' + P2(X - 7 * s, Y - 2 * s) + 'Q' + P2(X, Y) + ' ' + P2(X + 7 * s, Y - 2 * s) + 'Q' + P2(X + 3 * s, Y + 8 * s) + ' ' + P2(X, Y + 8 * s) + 'Q' + P2(X - 3 * s, Y + 8 * s) + ' ' + P2(X - 7 * s, Y - 2 * s) + 'Z') +
        S.path(TONGUE, 'M' + P2(X - 3.4 * s, Y + 5 * s) + 'Q' + P2(X, Y + 3 * s) + ' ' + P2(X + 3.4 * s, Y + 5 * s) + 'Q' + P2(X, Y + 8 * s) + ' ' + P2(X - 3.4 * s, Y + 5 * s) + 'Z');
      case 'm11': return S.line(MOUTH, 'M' + P2(X - 4 * s, Y + 1 * s) + 'Q' + P2(X, Y + 2.6 * s) + ' ' + P2(X + 4 * s, Y + 1 * s), 2.6 * g.sx);
    }
    return '';
  }

  function kitCheeks(S, g, id, ex) {
    var m = g.m, s = g.sx, c = '';
    var ck = (ex === 'silly' || ex === 'happy') ? '#FF8FA3' : '#FFA3B5';
    if (id === 'c2') { c = S.circ(CHEEK, +m.x(66), +m.y(120), 8 * s); }
    else if (id === 'c3') { c = S.ell(ck, +m.x(64), +m.y(118), 10 * s, 6.5 * s); }
    else if (id === 'c4') { c = S.ell(ck, +m.x(64), +m.y(118), 10 * s, 6.5 * s) + S.circ(PAPER, +m.x(60), +m.y(116), 1.8 * s); }
    else if (id === 'c6' || id === 'c7') {
      c = id === 'c7' ? S.ell('#FFB3C1', +m.x(64), +m.y(118), 11 * s, 5.4 * s) : '';
      var j; for (j = 0; j < 3; j++) { c += S.line('#F2789A', 'M' + P2(+m.x(58 + j * 5), +m.y(121)) + 'L' + P2(+m.x(61 + j * 5), +m.y(115)), 1.6 * s); }
    }
    else if (id === 'c5') { c = S.circ('skin-dk', +m.x(58), +m.y(114), 1.5 * s) + S.circ('skin-dk', +m.x(64), +m.y(117), 1.5 * s) + S.circ('skin-dk', +m.x(60), +m.y(121), 1.5 * s) + S.circ('skin-dk', +m.x(68), +m.y(121), 1.3 * s); }
    return c ? c + mirror(c) : '';
  }


  /* ---------- face kit, part 2: anime set, eye colours, pupils, makeup, jewellery, lipstick ---------- */
  KIT.eyes = KIT.eyes.concat([['a1', 'Anime sparkle'], ['a2', 'Anime round'], ['a3', 'Anime sharp'], ['a4', 'Anime sleepy'], ['a5', 'Anime star'],
    ['a6', 'Anime lashy'], ['a7', 'Anime tall'], ['a8', 'Anime doll'], ['a9', 'Anime calm']]);
  KIT.brows.push(['b7', 'Anime thin']);
  KIT.nose.push(['n7', 'Anime tick']);
  KIT.mouth = KIT.mouth.concat([['m9', 'Anime tiny'], ['m10', 'Anime open'], ['m11', 'Anime line']]);
  KIT.cheeks = KIT.cheeks.concat([['c6', 'Blush lines'], ['c7', 'Anime blush']]);
  KIT.pupil = [['p1', 'Round'], ['p2', 'Heart'], ['p3', 'Star'], ['p4', 'Cat slit'], ['p5', 'Diamond']];
  KIT.makeup = [['k1', 'None'], ['k2', 'Liner wing'], ['k3', 'Shadow'], ['k4', 'Shadow + liner'], ['k5', 'Glitter'], ['k6', 'Lashes+'], ['k7', 'Smoky']];
  KIT.earrings = [['r1', 'None'], ['r2', 'Studs'], ['r3', 'Hoops'], ['r4', 'Stars'], ['r5', 'Drops'], ['r6', 'Hearts']];
  KIT.nosering = [['q1', 'None'], ['q2', 'Side stud'], ['q3', 'Nostril hoop'], ['q4', 'Septum ring']];
  KIT.lip = [['l1', 'None'], ['l2', 'Lipstick']];
  KIT.hetero = [['h1', 'Same colour'], ['h2', 'Two colours']];
  var KIT_EXTRA = { pupil: 'p1', makeup: 'k1', earrings: 'r1', nosering: 'q1', lip: 'l1', hetero: 'h1' };
  var IRIS_EYES = ['e4', 'e6', 'e8', 'e9', 'e10', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'];
  var PUPIL_EYES = ['e6', 'e8', 'e9', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'];

  /* a stroke in a recolourable slot (class mode) or baked colour */
  function sline(S, key, d, w, extra) {
    if (S.p.mode === 'class') { return '<path fill="none" class="s-' + key + '" stroke-width="' + n(w) + '" stroke-linecap="round" stroke-linejoin="round" d="' + d + '"' + (extra || '') + '/>'; }
    return S.line(S.p.colorOf(key), d, w);
  }
  function star(cx, cy, r) {
    var d = '', i, a, rr;
    for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + P2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    return d + 'Z';
  }
  function heart(cx, cy, r) {
    return 'M' + P2(cx, cy + r) + 'C' + P2(cx - r * 1.4, cy) + ' ' + P2(cx - r, cy - r * 1.1) + ' ' + P2(cx, cy - r * 0.35) +
      'C' + P2(cx + r, cy - r * 1.1) + ' ' + P2(cx + r * 1.4, cy) + ' ' + P2(cx, cy + r) + 'Z';
  }
  function pupil(S, shape, X, Y, rx, ry) {
    switch (shape) {
      case 'p2': return S.path(INK, heart(X, Y, ry * 0.95));
      case 'p3': return S.path(INK, star(X, Y, ry * 1.1));
      case 'p4': return S.ell(INK, X, Y, rx * 0.32, ry * 1.15);
      case 'p5': return S.path(INK, 'M' + P2(X, Y - ry * 1.05) + 'L' + P2(X + rx * 0.85, Y) + 'L' + P2(X, Y + ry * 1.05) + 'L' + P2(X - rx * 0.85, Y) + 'Z');
    }
    return S.ell(INK, X, Y, rx, ry);
  }

  /* anime eyes, all with whites: a white shape, a two-tone iris that fits inside it, highlights, then heavy lash lines on top */
  function animeOpen(S, id, X, Y, s, side, ek, pu) {
    function P(dx, dy) { return P2(X + side * dx * s, Y + dy * s); }      /* dx > 0 = towards the outer corner */
    function white(d) { return S.path(PAPER, d); }
    function iris(rx, ry, cy) {
      return S.ell(ek + '-dk', X, Y + cy * s, rx * s, ry * s) + S.ell(ek, X, Y + (cy + ry * 0.28) * s, rx * 0.86 * s, ry * 0.7 * s);
    }
    function shine(big, x, y, rx, ry) { return S.ell(PAPER, X + side * x * s, Y + y * s, rx * s, ry * s); }
    function lashTop(x0, y0, cx, cy, x1, y1, w, wing) {
      /* a thick lash crescent from inner corner (x0,y0) over to the outer corner (x1,y1), with a wing past it */
      return S.path(INK, 'M' + P(x0, y0) + 'Q' + P(cx, cy - w * 0.5) + ' ' + P(x1, y1 - w * 0.4) + 'L' + P(x1 + wing, y1 - wing * 0.7) + 'L' + P(x1 - 0.5, y1 + w * 0.5) +
        'Q' + P(cx, cy + w * 0.5) + ' ' + P(x0, y0 + w * 0.5) + 'Z');
    }
    function tick(x0, y0, x1, y1, w) { return S.line(INK, 'M' + P(x0, y0) + 'L' + P(x1, y1), w * s); }
    var o = '';
    switch (id) {
      case 'a1': /* sparkle: big oval, two-tone iris, three highlights */
        o = white('M' + P(-11, 1) + 'Q' + P(-11, -12) + ' ' + P(0, -12) + 'Q' + P(12, -12) + ' ' + P(12, 1) + 'Q' + P(12, 12) + ' ' + P(0, 12) + 'Q' + P(-11, 12) + ' ' + P(-11, 1) + 'Z');
        o += iris(8.4, 10.6, 1.2) + pupil(S, pu, X, Y + 2.4 * s, 3.8 * s, 5 * s) + shine(1, 3, -4.6, 3.2, 4.2) + shine(0, -3, 6.6, 1.6, 1.6) + shine(0, 3.6, 4.6, 0.9, 0.9);
        return o + lashTop(-12, 0, 0, -13.6, 12.6, -5, 3.6, 3) + tick(4, 12.6, 8.6, 10.4, 1.8);
      case 'a2': /* round */
        o = S.circ(PAPER, X, Y + 0.5 * s, 11.6 * s) + S.circ(ek + '-dk', X, Y + 1.2 * s, 9 * s) + S.circ(ek, X, Y + 3.2 * s, 6.8 * s) + pupil(S, pu, X, Y + 2 * s, 4.2 * s, 4.6 * s) +
          shine(1, 3.4, -3.6, 3.6, 4) + shine(0, -3.6, 5.2, 1.8, 1.8);
        return o + lashTop(-12, -1, 0, -12.6, 12.4, -4, 3.2, 1.8) + tick(-6, 12, 6, 12, 1.6);
      case 'a3': /* sharp: angular white, small iris, sharp outer corner */
        o = white('M' + P(-12, 2) + 'L' + P(-8, -7) + 'Q' + P(1, -9.6) + ' ' + P(10.5, -7) + 'L' + P(13.4, -2.6) + 'Q' + P(8, 8.6) + ' ' + P(-2, 8.4) + 'Q' + P(-9, 7.6) + ' ' + P(-12, 2) + 'Z');
        o += iris(6.2, 7, 0.4) + pupil(S, pu, X, Y + 0.8 * s, 2.6 * s, 3.2 * s) + shine(1, 2.2, -2.8, 1.6, 1.8);
        return o + S.path(INK, 'M' + P(-13, 2.6) + 'L' + P(-8.6, -8.4) + 'Q' + P(1, -11.4) + ' ' + P(11, -8.6) + 'L' + P(16.4, -3.4) + 'L' + P(13.2, -2) + 'L' + P(10, -6) + 'Q' + P(1, -8.6) + ' ' + P(-7.6, -6) + 'L' + P(-11, 2) + 'Z') +
          S.line(INK, 'M' + P(-9, 7.6) + 'Q' + P(2, 10.4) + ' ' + P(9.6, 6), 1.6 * s);
      case 'a4': /* sleepy: half-closed lid over a big iris */
        o = white('M' + P(-11, 0) + 'Q' + P(0, -5) + ' ' + P(12, -1) + 'Q' + P(12, 11) + ' ' + P(0, 11) + 'Q' + P(-11, 11) + ' ' + P(-11, 0) + 'Z');
        o += S.ell(ek + '-dk', X, Y + 4 * s, 7.8 * s, 6.8 * s) + S.ell(ek, X, Y + 5.6 * s, 6.4 * s, 4.6 * s) + pupil(S, pu, X, Y + 4.4 * s, 3.4 * s, 3.6 * s) + shine(0, 2.6, 2.2, 1.8, 1.8);
        return o + S.path(INK, 'M' + P(-12, 0.6) + 'Q' + P(0, -6.4) + ' ' + P(14, -1.8) + 'Q' + P(1, -3.4) + ' ' + P(-12, 2.2) + 'Z');
      case 'a5': /* star highlight */
        o = S.circ(PAPER, X, Y + 0.5 * s, 11.4 * s) + S.circ(ek + '-dk', X, Y + 1.2 * s, 9 * s) + S.circ(ek, X, Y + 3.2 * s, 6.8 * s) + pupil(S, pu, X, Y + 2 * s, 4.2 * s, 4.6 * s);
        o += S.path(PAPER, star(X + side * 3.4 * s, Y - 3.4 * s, 4.4 * s)) + shine(0, -3.6, 5.8, 1.6, 1.6) + shine(0, 4.4, 4.6, 1, 1);
        return o + lashTop(-12, -1, 0, -12.6, 12.4, -4, 3.2, 1.8);
      case 'a6': /* lashy: wide almond, heavy lash with spikes, lower lash ticks */
        o = white('M' + P(-12, 1) + 'Q' + P(-4, -10) + ' ' + P(6, -8.6) + 'Q' + P(12, -6.4) + ' ' + P(13, -1) + 'Q' + P(6, 9.4) + ' ' + P(-3, 9) + 'Q' + P(-10, 8) + ' ' + P(-12, 1) + 'Z');
        o += iris(7.6, 8.4, 0.6) + pupil(S, pu, X, Y + 1.6 * s, 3.4 * s, 4 * s) + shine(1, -2.4, -3.2, 3, 2.2) + shine(0, 3.6, 4.4, 1.2, 1.2);
        o += lashTop(-13, 1, -2, -12.2, 13, -2, 3.6, 3.4) + tick(8.6, -7.4, 11.8, -12.4, 1.8) + tick(11.4, -5, 15.6, -8.4, 1.8) + tick(-10, -6.6, -12.6, -10, 1.4);
        return o + tick(-4, 10.2, -4.6, 12.8, 1.4) + tick(1, 10.4, 1, 13.2, 1.4) + tick(6, 8.8, 7, 11.4, 1.4) + S.line(INK, 'M' + P(-8, 8.6) + 'Q' + P(2, 11) + ' ' + P(11, 5.4), 1.2 * s);
      case 'a7': /* tall: tall white, tall two-tone iris, big highlight, wedge lash at the bottom */
        o = white('M' + P(-9.6, 0) + 'Q' + P(-9.6, -13.6) + ' ' + P(1, -13.6) + 'Q' + P(10.6, -13) + ' ' + P(10.4, 0) + 'Q' + P(10.4, 13.4) + ' ' + P(0, 13.4) + 'Q' + P(-9.6, 13.4) + ' ' + P(-9.6, 0) + 'Z');
        o += iris(7.6, 11.6, 1.2) + pupil(S, pu, X, Y + 2.6 * s, 3 * s, 5.6 * s) + shine(1, -2.8, -5.2, 3.2, 4.6) + shine(0, 3.4, 6.8, 1.6, 1.6);
        o += lashTop(-11.6, -2, -2, -16.2, 11.8, -8.4, 4, 4.4);
        return o + S.path(INK, 'M' + P(4, 13.6) + 'L' + P(12.4, 11.8) + 'L' + P(9.4, 9.4) + 'Z');
      case 'a8': /* doll: very tall oval with a ring, lashes standing up */
        o = S.ell(PAPER, X, Y, 9 * s, 14 * s) + S.ell(ek + '-dk', X, Y + 3 * s, 7 * s, 10 * s) + S.ell(ek, X, Y + 6 * s, 6 * s, 6.6 * s) + pupil(S, pu, X, Y + 4 * s, 2.6 * s, 4.6 * s) +
          shine(1, -1.4, -6.4, 4.4, 4.8) + shine(0, 2.6, 2.6, 1.4, 2);
        o += '<ellipse fill="none" stroke="' + INK + '" stroke-width="' + n(2.2 * s) + '" cx="' + n(X) + '" cy="' + n(Y) + '" rx="' + n(9 * s) + '" ry="' + n(14 * s) + '"/>';
        o += lashTop(-11, -6, 0, -17.4, 11, -7.4, 3.8, 2.4) + tick(6.6, -12.4, 9.6, -15.4, 1.8) + tick(9.4, -9.4, 13.2, -11.2, 1.8);
        return o + tick(5.4, 12.6, 7.4, 15, 1.4);
      case 'a9': /* calm: wide almond, small iris, thin lines */
        o = white('M' + P(-14, 1.4) + 'Q' + P(-4, -8) + ' ' + P(8, -6.6) + 'Q' + P(14, -4) + ' ' + P(15, 2) + 'Q' + P(4, 8.6) + ' ' + P(-6, 7.6) + 'Q' + P(-12, 6) + ' ' + P(-14, 1.4) + 'Z');
        o += iris(5.6, 6.2, 0.4) + pupil(S, pu, X, Y + 1 * s, 2.6 * s, 3 * s) + shine(1, 1.8, -2.4, 1.6, 1.8);
        return o + S.line(INK, 'M' + P(-14.6, 1.6) + 'Q' + P(-4, -9.4) + ' ' + P(9, -7.6) + 'Q' + P(14.6, -5) + ' ' + P(16, 1.4), 2.8 * s) + S.line(INK, 'M' + P(-11, 6.4) + 'Q' + P(3, 9.4) + ' ' + P(14, 3.6), 1.4 * s);
    }
    return '';
  }

  /* eye with a pupil shape (detailed eyes) */
  function detailedOpen(S, id, X, Y, s, side, ek, pu) {
    if (id === 'e9') {
      return S.ell(PAPER, X, Y, 9.4 * s, 11 * s) + S.ell(ek, X, Y + 1.2 * s, 7.8 * s, 9 * s) + pupil(S, pu, X, Y + 1.8 * s, 4.2 * s, 5 * s) +
        S.circ(PAPER, X + side * 2.8 * s, Y - 1.4 * s, 2.6 * s) + S.circ(PAPER, X - side * 2.4 * s, Y + 4.6 * s, 1.1 * s) + lash(S, X, Y, s, side);
    }
    if (id === 'e8') {
      return S.path(PAPER, 'M' + P2(X - 11 * s, Y) + 'Q' + P2(X, Y - 13 * s) + ' ' + P2(X + 11 * s, Y) + 'Q' + P2(X, Y + 12 * s) + ' ' + P2(X - 11 * s, Y) + 'Z') +
        S.circ(ek, X, Y + 0.3 * s, 5.4 * s) + pupil(S, pu, X, Y + 0.6 * s, 2.9 * s, 2.9 * s) + S.circ(PAPER, X + side * 1.8 * s, Y - 1.8 * s, 1.6 * s) +
        S.line(INK, 'M' + P2(X - side * 11.5 * s, Y + 0.6 * s) + 'Q' + P2(X, Y - 13.4 * s) + ' ' + P2(X + side * 11.6 * s, Y - 0.4 * s) + 'L' + P2(X + side * 14.2 * s, Y - 3.6 * s), 2.8 * s);
    }
    /* e6 sleepy lids */
    var o = S.ell(ek, X, Y, 8 * s, 9.6 * s) + pupil(S, pu, X, Y + 1.6 * s, 4.2 * s, 5 * s) + S.circ(PAPER, X + side * 2.4 * s, Y + 0.6 * s, 1.8 * s);
    o += '<path ' + S.p.a('skin') + ' d="M' + P2(X - 10.5 * s, Y - 12 * s) + 'H' + n(X + 10.5 * s) + 'V' + n(Y - 4.6 * s) + 'Q' + P2(X, Y - 3 * s) + ' ' + P2(X - 10.5 * s, Y - 4.6 * s) + 'Z"/>';
    return o + S.line(INK, 'M' + P2(X - 9.4 * s, Y - 4.4 * s) + 'Q' + P2(X, Y - 3.2 * s) + ' ' + P2(X + 9.4 * s, Y - 4.4 * s), 2.4 * s);
  }

  function makeupUnder(S, mk, X, Y, s, side) {
    if (mk === 'k5') { return S.circ('jewel', X + side * 10 * s, Y + 8 * s, 1.3 * s) + S.circ(PAPER, X + side * 13 * s, Y + 4.6 * s, 1.1 * s) + S.circ('jewel', X + side * 7 * s, Y + 11 * s, 0.9 * s) + S.circ('makeup', X + side * 12.6 * s, Y + 9.6 * s, 1 * s); }
    if (mk === 'k7') {
      /* smoky: dark shadow all round the eye, wider at the outer corner */
      return S.path('makeup', 'M' + P2(X - side * 12 * s, Y - 3 * s) + 'Q' + P2(X - side * 6 * s, Y - 21 * s) + ' ' + P2(X + side * 15 * s, Y - 10 * s) +
        'Q' + P2(X + side * 16 * s, Y + 2 * s) + ' ' + P2(X + side * 10 * s, Y + 9 * s) + 'Q' + P2(X, Y + 15 * s) + ' ' + P2(X - side * 9 * s, Y + 7 * s) +
        'Q' + P2(X - side * 13 * s, Y + 3 * s) + ' ' + P2(X - side * 12 * s, Y - 3 * s) + 'Z');
    }
    if (mk !== 'k3' && mk !== 'k4') { return ''; }
    return S.path('makeup', 'M' + P2(X - side * 11 * s, Y - 5 * s) + 'Q' + P2(X - side * 4 * s, Y - 19 * s) + ' ' + P2(X + side * 12.5 * s, Y - 9 * s) +
      'Q' + P2(X + side * 2 * s, Y - 13 * s) + ' ' + P2(X - side * 11 * s, Y - 5 * s) + 'Z');
  }
  function makeupOver(S, mk, X, Y, s, side) {
    if (mk === 'k7') {
      return S.path(INK, 'M' + P2(X + side * 7 * s, Y - 8.5 * s) + 'L' + P2(X + side * 20 * s, Y - 13 * s) + 'L' + P2(X + side * 11 * s, Y - 2.6 * s) + 'Z') +
        S.line(INK, 'M' + P2(X - side * 7 * s, Y + 7.4 * s) + 'Q' + P2(X + side * 1 * s, Y + 10.6 * s) + ' ' + P2(X + side * 10 * s, Y + 5 * s), 1.6 * s);
    }
    if (mk === 'k2' || mk === 'k4') { return S.path(INK, 'M' + P2(X + side * 8 * s, Y - 7.5 * s) + 'L' + P2(X + side * 17 * s, Y - 12 * s) + 'L' + P2(X + side * 11 * s, Y - 4.4 * s) + 'Z'); }
    if (mk === 'k6') {
      return S.line(INK, 'M' + P2(X + side * 6 * s, Y - 10.6 * s) + 'L' + P2(X + side * 8 * s, Y - 15 * s), 2 * s) +
        S.line(INK, 'M' + P2(X + side * 9 * s, Y - 9 * s) + 'L' + P2(X + side * 12.4 * s, Y - 12.6 * s), 2 * s) +
        S.line(INK, 'M' + P2(X + side * 11 * s, Y - 6.4 * s) + 'L' + P2(X + side * 15 * s, Y - 8.4 * s), 2 * s);
    }
    return '';
  }

  /* jewellery: k.jSize scales it (0.5-2), k.earOne = one earring only, k.jFlip = nose piercing / single earring on the other side */
  function scaleAt(mk, x, y, k) { return k === 1 ? mk : '<g transform="matrix(' + n(k) + ' 0 0 ' + n(k) + ' ' + n(x * (1 - k)) + ' ' + n(y * (1 - k)) + ')">' + mk + '</g>'; }
  function earrings(S, g, id, k) {
    if (!id || id === 'r1') { return ''; }
    k = k || {};
    var m = g.m, s = g.sx * 1.35, X = +m.x(39), Y = +m.y(113), o = '', js = k.jSize || 1;
    if (id === 'r2') { o = S.circ('jewel', X, Y, 2.8 * s, true) + S.circ(PAPER, X - 0.8 * s, Y - 0.9 * s, 0.8 * s); }
    else if (id === 'r3') { o = '<circle fill="none" ' + (S.p.mode === 'class' ? 'class="s-jewel"' : 'stroke="' + S.p.colorOf('jewel') + '"') + ' stroke-width="' + n(2.2 * s) + '" cx="' + n(X) + '" cy="' + n(Y + 5.6 * s) + '" r="' + n(6 * s) + '"/>'; }
    else {
      o = sline(S, 'jewel-dk', 'M' + P2(X, Y) + 'L' + P2(X, Y + 5 * s), 1.4 * s) + S.circ('jewel', X, Y, 1.8 * s);
      if (id === 'r4') { o += S.path('jewel', star(X, Y + 9.6 * s, 5 * s)); }
      else if (id === 'r5') { o += S.path('acc', 'M' + P2(X, Y + 4 * s) + 'Q' + P2(X + 5 * s, Y + 10 * s) + ' ' + P2(X, Y + 14 * s) + 'Q' + P2(X - 5 * s, Y + 10 * s) + ' ' + P2(X, Y + 4 * s) + 'Z') + S.circ(PAPER, X - 1.4 * s, Y + 9 * s, 1 * s); }
      else { o += S.path('acc', heart(X, Y + 9.6 * s, 4.4 * s)); }
    }
    o = scaleAt(o, X, Y, js);
    if (k.earOne) { return k.jFlip ? mirror(o) : o; }
    return o + mirror(o);
  }

  /* where each nose's right nostril sits, so piercings land on the nose that is drawn */
  var NOSTRIL = { n1: [103, 113], n2: [103, 112.6], n3: [105, 113], n4: [103.6, 111.8], n5: [102.6, 113.6], n6: [105, 112.8], n7: [102.6, 113.4] };
  var SEPTUM = { n1: [100, 113.4], n2: [100, 114.2], n3: [100, 115], n4: [100, 113.2], n5: [100.4, 114.4], n6: [100, 115], n7: [101.4, 113.8] };
  function noseRing(S, g, id, k) {
    k = k || {};
    var m = g.m, s = g.sx, o = '', an = NOSTRIL[k.nose || KIT_DEFAULT.nose] || NOSTRIL.n1, X = +m.x(an[0]), Y = +m.y(an[1]);
    if (id === 'q2') {
      /* stud on the side of the nose */
      var sx3 = X - 0.6 * s, sy3 = Y - 2.2 * s;
      o = S.circ('jewel', sx3, sy3, 1.8 * s, true) + S.circ(PAPER, sx3 - 0.5 * s, sy3 - 0.6 * s, 0.55 * s);
    } else if (id === 'q4') {
      /* septum ring: a horseshoe under the middle of the nose, a ball on each end */
      var sp = SEPTUM[k.nose || KIT_DEFAULT.nose] || SEPTUM.n1, SX = +m.x(sp[0]), SY = +m.y(sp[1]), r4 = 2.5 * s, cy5 = SY + r4 * 0.25, e0 = -0.35, e1 = Math.PI + 0.35;
      var pA = [SX + Math.cos(e0) * r4, cy5 + Math.sin(e0) * r4], pB = [SX + Math.cos(e1) * r4, cy5 + Math.sin(e1) * r4];
      o = sline(S, 'jewel', 'M' + P2(pA[0], pA[1]) + 'A' + n(r4) + ' ' + n(r4) + ' 0 1 1 ' + P2(pB[0], pB[1]), 1.4 * s) +
        S.circ('jewel', pA[0], pA[1], 1.1 * s) + S.circ('jewel', pB[0], pB[1], 1.1 * s) + S.circ(PAPER, SX + r4 * 0.55, cy5 + r4 * 0.6, 0.4 * s);
      X = SX; Y = SY;
    } else if (id === 'q3') {
      /* a round hoop through the nostril: an almost-closed circle, open where it goes into the nose */
      var r3 = 2.7 * s, cx3 = X + 1.3 * s, cy3 = Y + 1.2 * s, a0 = -2.0, a1 = a0 + Math.PI * 2 - 0.75;
      o = sline(S, 'jewel', 'M' + P2(cx3 + Math.cos(a0) * r3, cy3 + Math.sin(a0) * r3) + 'A' + n(r3) + ' ' + n(r3) + ' 0 1 1 ' + P2(cx3 + Math.cos(a1) * r3, cy3 + Math.sin(a1) * r3), 1.5 * s) +
        S.circ(PAPER, cx3 + r3 * 0.7, cy3 + r3 * 0.35, 0.45 * s);
    }
    if (!o) { return ''; }
    o = scaleAt(o, X, Y, k.jSize || 1);
    return k.jFlip ? mirror(o) : o;
  }

  /* lipstick: a coloured rim under every dark mouth shape, and the mouth line itself in a darker lip shade */
  function lipstick(S, markup) {
    var cls = S.p.mode === 'class', LIP = S.p.colorOf('lip'), LIPDK = S.p.colorOf('lip-dk'), under = '';
    var parts = markup.match(/<(path|ellipse|rect|circle)[^>]*\/>/g) || [];
    parts.forEach(function (el) {
      if (el.indexOf('stroke="' + MOUTH + '"') >= 0) {
        var w = +(/stroke-width="([\d.]+)"/.exec(el) || [0, 3])[1];
        under += el.replace('stroke="' + MOUTH + '"', cls ? 'class="s-lip"' : 'stroke="' + LIP + '"').replace(/stroke-width="[\d.]+"/, 'stroke-width="' + n(w + 3.6) + '"');
      } else if (el.indexOf('fill="' + MOUTH + '"') >= 0) {
        under += el.replace('fill="' + MOUTH + '"', cls ? 'class="c-lip s-lip" stroke-width="3.4" stroke-linejoin="round"' : 'fill="' + LIP + '" stroke="' + LIP + '" stroke-width="3.4" stroke-linejoin="round"');
      }
    });
    var top = markup.split('stroke="' + MOUTH + '"').join(cls ? 'class="s-lip-dk"' : 'stroke="' + LIPDK + '"')
      .split('fill="' + MOUTH + '"').join(cls ? 'class="c-lip-dk"' : 'fill="' + LIPDK + '"');
    return under + top;
  }

  function kitFace(S, g, kit, ex) {
    var k = {}, key;
    for (key in KIT_DEFAULT) { if (KIT_DEFAULT.hasOwnProperty(key)) { k[key] = (kit && kit[key]) || KIT_DEFAULT[key]; } }
    for (key in KIT_EXTRA) { if (KIT_EXTRA.hasOwnProperty(key)) { k[key] = (kit && kit[key]) || KIT_EXTRA[key]; } }
    if (kit) { ['frDensity', 'frTransp', 'jSize', 'jFlip', 'earOne'].forEach(function (q) { if (kit[q] != null) { k[q] = kit[q]; } }); }
    var es = g.sx * g.eyeK, under = makeupUnder(S, k.makeup, +g.m.x(78), +g.m.y(100), es, -1) + makeupUnder(S, k.makeup, +g.m.x(122), +g.m.y(100), es, 1);
    /* order: blush, freckles, eye makeup, then face paint over the makeup, then the eyes on top */
    var out = kitCheeks(S, g, k.cheeks, ex) + freckles(S, g, k.freckles, k.frDensity, k.frTransp) + under + faceDeco(S, g, k);
    if (k.cape === 'w4') { out += eyeMask(S, g); }
    out += kitEye(S, g, k.eyes, ex, 78, -1, false, k) + kitEye(S, g, k.eyes, ex, 122, 1, ex === 'silly', k);
    out += kitBrows(S, g, k.brows, ex);
    out += kitNose(S, g, k.nose) + noseRing(S, g, k.nosering, k);
    if (ex === 'sad') { out += S.path(TEAR, new PB(g.m).M(70, 111).Q(66, 119, 70, 121).Q(74, 119, 70, 111).Z().d); }
    var mo = ex === 'happy' ? kitMouth(S, g, k.mouth) : mouth(S, g, 'C', ex);
    out += k.lip === 'l2' ? lipstick(S, mo) : mo;
    return out;
  }

  /** markup and size of one kit part on its own (both eyes, both cheeks…) */
  function kitPart(kind, id) {
    var g = geom('A'), pt = new Painter('class', colors(), 'none'), S = new Sh(pt), s = '';
    var kk = {}; kk[kind] = id;
    if (KIT_COSTUME[kind]) {
      var plain = character({ t: preset('C'), kit: {} }).bytes, w = character({ t: preset('C'), kit: kk }).bytes;
      return { svg: '', bytes: Math.max(0, w - plain), shapes: 0 };
    }
    if (kind === 'eyes') { s = kitEye(S, g, id, 'happy', 78, -1, false, kk) + kitEye(S, g, id, 'happy', 122, 1, false, kk); }
    else if (kind === 'makeup') {
      var pl = character({ t: preset('C'), kit: {} }).bytes, wm = character({ t: preset('C'), kit: kk }).bytes;
      return { svg: '', bytes: Math.max(0, wm - pl), shapes: 0 };
    }
    else if (kind === 'pupil' || kind === 'hetero') {
      var base = kitEye(S, g, 'e9', 'happy', 78, -1, false, {}) + kitEye(S, g, 'e9', 'happy', 122, 1, false, {});
      s = kitEye(S, g, 'e9', 'happy', 78, -1, false, kk) + kitEye(S, g, 'e9', 'happy', 122, 1, false, kk);
      return { svg: s, bytes: Math.max(0, utf8len(s) - utf8len(base)), shapes: countShapes(s) };
    }
    else if (kind === 'earrings') { s = earrings(S, g, id); }
    else if (kind === 'nosering') { s = noseRing(S, g, id); }
    else if (kind === 'lip') { var mm = kitMouth(S, g, 'm2'); return { svg: '', bytes: id === 'l2' ? utf8len(lipstick(S, mm)) - utf8len(mm) : 0, shapes: 0 }; }
    else if (kind === 'brows') { s = kitBrows(S, g, id, 'happy'); }
    else if (kind === 'nose') { s = kitNose(S, g, id); }
    else if (kind === 'mouth') { s = kitMouth(S, g, id); }
    else if (kind === 'cheeks') { s = kitCheeks(S, g, id, 'happy'); }
    return { svg: s, bytes: utf8len(s), shapes: countShapes(s) };
  }

  /* ---------- body ---------- */
  function torsoPath(g, x0, x1, y0, y1, r) {
    r = r || Math.min(24, (x1 - x0) * 0.36);
    return 'M' + n(x0) + ' ' + n(y0 + r) + 'Q' + n(x0) + ' ' + n(y0) + ' ' + n(x0 + r) + ' ' + n(y0) + 'H' + n(x1 - r) + 'Q' + n(x1) + ' ' + n(y0) + ' ' + n(x1) + ' ' + n(y0 + r) +
      'V' + n(y1 - 8) + 'Q' + n(x1) + ' ' + n(y1) + ' ' + n(x1 - 8) + ' ' + n(y1) + 'H' + n(x0 + 8) + 'Q' + n(x0) + ' ' + n(y1) + ' ' + n(x0) + ' ' + n(y1 - 8) + 'Z';
  }

  /* left arm (mirrored for the right), drawn hanging straight down and then rotated at the shoulder */
  function arm(S, g, t, sleeveKey, sleeveLen, puff, cuffKey) {
    var lv = t.limbs, x = g.ax, y = g.ay - 4, aw = g.aw, L = g.arm, h = g.hand, out = '';
    out += S.rect('skin', x - aw / 2, y, aw, L, aw / 2 - 0.5, true);
    var hy = y + L;
    if (lv === 'A') { out += S.circ('skin', x, hy, h, true); }
    else if (lv === 'B') { out += S.ell('skin', x + h * 0.82, hy - h * 0.12, h * 0.4, h * 0.58, true, 'rotate(-25 ' + n(x + h * 0.82) + ' ' + n(hy - h * 0.12) + ')') + S.circ('skin', x, hy, h, true); }
    else {
      /* a mitten with a thumb on the side towards the body, one closed shape */
      out += S.path('skin', 'M' + n(x - h * 0.85) + ' ' + n(hy - h * 0.55) +
        'C' + n(x - h * 1.08) + ' ' + n(hy + h * 0.4) + ' ' + n(x - h * 0.6) + ' ' + n(hy + h * 1.12) + ' ' + n(x) + ' ' + n(hy + h * 1.12) +
        'C' + n(x + h * 0.58) + ' ' + n(hy + h * 1.12) + ' ' + n(x + h * 0.92) + ' ' + n(hy + h * 0.62) + ' ' + n(x + h * 0.9) + ' ' + n(hy + h * 0.18) +
        'C' + n(x + h * 1.38) + ' ' + n(hy + h * 0.08) + ' ' + n(x + h * 1.42) + ' ' + n(hy - h * 0.58) + ' ' + n(x + h * 0.92) + ' ' + n(hy - h * 0.62) +
        'L' + n(x + h * 0.8) + ' ' + n(hy - h * 0.6) + 'Z', true);
      if (lv === 'C') { out += S.path('skin-sh', 'M' + n(x + h * 0.86) + ' ' + n(hy + h * 0.2) + 'Q' + n(x + h * 0.5) + ' ' + n(hy + h * 0.05) + ' ' + n(x + h * 0.4) + ' ' + n(hy - h * 0.3) + 'Q' + n(x + h * 0.62) + ' ' + n(hy + h * 0.02) + ' ' + n(x + h * 0.86) + ' ' + n(hy + h * 0.2) + 'Z'); }
    }
    if (g.kitx) { out += armExtras(S, g, x, y, aw, L, h, g.kitx); }
    if (sleeveLen) {
      if (puff) { out += S.ell(sleeveKey, x, y + 6, aw * 0.85, aw * 0.75, true); }
      else { out += S.rect(sleeveKey, x - aw / 2 - 2.5, y - 4, aw + 5, sleeveLen, 5, true); }
      if (cuffKey) { out += puff ? S.rect(cuffKey, x - aw * 0.75, y + 14, aw * 1.5, 3.5, 1.7) : S.rect(cuffKey, x - aw / 2 - 2.5, y - 4 + sleeveLen - 5, aw + 5, 5, 2.5); }
    }
    return grp(out, 'rotate(' + n(g.ang) + ' ' + n(x) + ' ' + n(g.ay) + ')');
  }

  function shoe(S, g, t, kind) {
    var lv = t.limbs, x = g.lcx, G = g.G, w = g.foot * (kind === 'flat' ? 0.95 : 1), h = kind === 'flat' ? 11 : 15, out = '';
    var l = x - w / 2 + 1, r = x + w / 2 - 1;
    /* toes point outwards (to the viewer's left on the left foot) */
    out += S.path('shoe', 'M' + n(r) + ' ' + n(G) + 'V' + n(G - h + 4) + 'Q' + n(r) + ' ' + n(G - h) + ' ' + n(x) + ' ' + n(G - h) + 'Q' + n(l - 6) + ' ' + n(G - h) + ' ' + n(l - 8) + ' ' + n(G - 2) + 'Q' + n(l - 8) + ' ' + n(G) + ' ' + n(l - 5) + ' ' + n(G) + 'Z', true);
    if (lv === 'A') { if (kind !== 'flat') { out += S.circ(PAPER, x + 1, G - h + 5, 2.4); } return out; }
    out += S.rect(lv === 'D' ? PAPER : 'shoe-dk', l - 8, G - 3.5, w + 8, 4.5, 2.2, lv === 'D');
    if (kind === 'flat') { out += S.rect(lv === 'C' ? 'shoe-dk' : INK, x - 6, G - h + 1.5, 12, 2.6, 1.3); return out; }
    out += S.circ(PAPER, x + 2, G - h + 5, 2.2);
    if (lv === 'C') { out += S.path('shoe-hi', 'M' + n(l - 4) + ' ' + n(G - 6) + 'Q' + n(l - 3) + ' ' + n(G - h + 3) + ' ' + n(x - 4) + ' ' + n(G - h + 1.5) + 'Q' + n(l + 1) + ' ' + n(G - h + 6) + ' ' + n(l - 1) + ' ' + n(G - 6) + 'Z') + S.rect(PAPER, x - 3, G - h + 8.5, 9, 1.8, 0.9); }
    if (kind === 'sport') { out += S.rect(lv === 'A' ? PAPER : 'bot2', x - 7, G - 8.5, 13, 2.6, 1.3); }
    return out;
  }

  /* outfit pieces */
  var OUTFITS = ['casual', 'fancy', 'sporty'];
  var OUTFIT_LABEL = { casual: 'Casual', fancy: 'Fancy', sporty: 'Sporty' };

  function outfit(S, g, t, which) {
    var lv = t.outfit, x0 = g.x0, x1 = g.x1, sh = g.sh, hip = g.hip, y1 = hip + g.hem, o = {};
    var C = lv === 'C', D = lv === 'D', rich = C || D;
    var lx = g.lcx, lw = g.lw, G = g.G;
    o.legs = '';
    o.bottom = ''; o.top = ''; o.over = ''; o.sleeve = { key: 'top', len: 26, puff: false, cuff: null }; o.shoe = 'sneaker';
    if (which === 'casual') {
      /* jeans */
      var pl = S.rect('bot', lx - lw / 2 - 3, hip - 4, lw + 6, G - hip - 6, 6, true);
      if (C) { pl += S.rect('bot-hi', lx - lw / 2 - 3, G - 18, lw + 6, 6, 3) + S.path('bot-sh', 'M' + n(lx - lw / 2 + 1) + ' ' + n(hip + 14) + 'Q' + n(lx + 1) + ' ' + n(hip + 22) + ' ' + n(lx + lw / 2) + ' ' + n(hip + 16) + 'Q' + n(lx + 1) + ' ' + n(hip + 19) + ' ' + n(lx - lw / 2 + 1) + ' ' + n(hip + 14) + 'Z'); }
      if (D) { pl += S.rect('bot-sh', lx + lw / 2 - 2, hip + 4, 4, G - hip - 16, 2); }
      o.bottom = pl + mirror(pl) + S.rect('bot', x0 + 2, hip - 10, g.tw - 4, 22, 8, true);
      if (C) { o.bottom += S.rect('bot-dk', x0 + 6, hip - 4, 12, 2, 1) + mirror(S.rect('bot-dk', x0 + 6, hip - 4, 12, 2, 1)); }
      /* tee */
      o.top = S.path('top', torsoPath(g, x0, x1, sh, y1), true);
      if (rich) {
        o.top += S.path('top-dk', 'M' + n(100 - 15) + ' ' + n(sh) + 'Q' + n(100) + ' ' + n(sh + 13) + ' ' + n(100 + 15) + ' ' + n(sh) + 'Q' + n(100) + ' ' + n(sh + 7) + ' ' + n(100 - 15) + ' ' + n(sh) + 'Z');
      }
      if (C) {
        o.top += S.rect('top-dk', x0, y1 - 6, g.tw, 6, 3) +
          S.path('top-dk', 'M' + n(x0 + 5) + ' ' + n(hip - 14) + 'Q' + n(x0 + 12) + ' ' + n(hip - 8) + ' ' + n(x0 + 20) + ' ' + n(hip - 10) + 'Q' + n(x0 + 12) + ' ' + n(hip - 11) + ' ' + n(x0 + 5) + ' ' + n(hip - 14) + 'Z') +
          S.path('top-dk', 'M' + n(x1 - 5) + ' ' + n(hip - 22) + 'Q' + n(x1 - 13) + ' ' + n(hip - 15) + ' ' + n(x1 - 22) + ' ' + n(hip - 17) + 'Q' + n(x1 - 13) + ' ' + n(hip - 18) + ' ' + n(x1 - 5) + ' ' + n(hip - 22) + 'Z') +
          S.rect('top-sh', 100 + g.tw * 0.1, sh + (y1 - sh) * 0.3, g.tw * 0.2, g.tw * 0.18, 2) + S.rect('top-dk', 100 + g.tw * 0.1, sh + (y1 - sh) * 0.3, g.tw * 0.2, 2.4, 1.2);
        o.sleeve.cuff = 'top-dk';
      }
      if (D) { o.top += S.rect('top-sh', 100 + g.tw * 0.1, sh + (y1 - sh) * 0.3, g.tw * 0.2, g.tw * 0.18, 2, true); }
    } else if (which === 'fancy') {
      o.shoe = 'flat';
      var flare = g.tw * 0.32, sy0 = hip - 6, sy1 = hip + g.leg * 0.44;
      var skirt = 'M' + n(x0 + 4) + ' ' + n(sy0) + 'H' + n(x1 - 4) + 'L' + n(x1 + flare) + ' ' + n(sy1 - 8) + 'Q' + n(x1 + flare + 1) + ' ' + n(sy1) + ' ' + n(x1 + flare - 8) + ' ' + n(sy1) + 'H' + n(x0 - flare + 8) + 'Q' + n(x0 - flare - 1) + ' ' + n(sy1) + ' ' + n(x0 - flare) + ' ' + n(sy1 - 8) + 'Z';
      o.top = S.path('top', skirt, true) + S.path('top', torsoPath(g, x0 + 2, x1 - 2, sh, hip + 2), true);
      if (rich) {
        var hem = '', i, k = 7, wd = (g.tw + flare * 2 - 4) / k;
        if (C) {
          for (i = 0; i < k; i++) { hem += S.circ('top2', x0 - flare + 2 + wd * (i + 0.5), sy1 - 1, wd / 2); }
          hem += S.rect('top2', x0 - flare + 1, sy1 - 7, g.tw + flare * 2 - 2, 6, 3);
          var pleat = S.path('top-dk', 'M' + n(x0 + 10) + ' ' + n(sy0 + 6) + 'L' + n(x0 - flare * 0.45) + ' ' + n(sy1 - 8) + 'L' + n(x0 - flare * 0.45 + 5) + ' ' + n(sy1 - 8) + 'Z');
          o.top = S.path('top', skirt, true) + hem + pleat + mirror(pleat) +
            S.path('top-dk', 'M100 ' + n(sy0 + 8) + 'L97 ' + n(sy1 - 8) + 'L103 ' + n(sy1 - 8) + 'Z') +
            S.path('top', torsoPath(g, x0 + 2, x1 - 2, sh, hip + 2), true);
        } else {
          o.top += S.rect('top-dk', x0 - flare + 2, sy1 - 7, g.tw + flare * 2 - 4, 4, 2);
        }
        /* waist ribbon and bow */
        o.top += S.rect('acc', x0 + 1, hip - 9, g.tw - 2, 8, 3, D) + S.path('acc', 'M' + n(100) + ' ' + n(hip - 5) + 'L' + n(88) + ' ' + n(hip - 13) + 'Q' + n(85) + ' ' + n(hip - 5) + ' ' + n(88) + ' ' + n(hip + 3) + 'Z', true) +
          S.path('acc', 'M' + n(100) + ' ' + n(hip - 5) + 'L' + n(112) + ' ' + n(hip - 13) + 'Q' + n(115) + ' ' + n(hip - 5) + ' ' + n(112) + ' ' + n(hip + 3) + 'Z', true) + S.circ('acc-dk', 100, hip - 5, 3.4);
        /* round collar */
        var col = S.path(PAPER, 'M' + n(100) + ' ' + n(sh + 1) + 'Q' + n(92) + ' ' + n(sh + 14) + ' ' + n(80) + ' ' + n(sh + 9) + 'Q' + n(80) + ' ' + n(sh + 1) + ' ' + n(86) + ' ' + n(sh - 1) + 'Z', true);
        o.top += col + mirror(col);
      } else {
        o.top += S.rect('top2', x0 + 1, hip - 8, g.tw - 2, 6, 3);
      }
      o.sleeve = { key: 'top', len: 16, puff: true, cuff: C ? 'top2' : null };
    } else {
      /* sporty: jersey, shorts, striped socks */
      var sock = S.rect(PAPER, lx - lw / 2 - 0.5, G - 40, lw + 1, 30, 4, rich) + S.rect('bot2', lx - lw / 2 - 0.5, G - 38, lw + 1, 3.5, 1.5);
      if (rich) { sock += S.rect('top', lx - lw / 2 - 0.5, G - 32, lw + 1, 3.5, 1.5); }
      o.legs = sock + mirror(sock);
      var sl = S.rect('bot', lx - lw / 2 - 4, hip - 4, lw + 8, g.leg * 0.32, 5, true);
      if (rich) { sl += S.rect('bot2', lx - lw / 2 - 4, hip - 2, 3.5, g.leg * 0.32 - 4, 1.5); }
      if (C) { sl += S.rect('bot-dk', lx - lw / 2 - 4, hip - 4 + g.leg * 0.32 - 5, lw + 8, 5, 2.5); }
      o.bottom = sl + mirror(sl) + S.rect('bot', x0 + 2, hip - 10, g.tw - 4, 20, 8, true);
      o.top = S.path('top', torsoPath(g, x0, x1, sh, y1 - 6), true) + S.rect('top2', x0, sh + (y1 - sh) * 0.46, g.tw, 7, 0);
      if (rich) {
        o.top += S.path('top2', 'M' + n(100 - 13) + ' ' + n(sh) + 'L' + n(100) + ' ' + n(sh + 14) + 'L' + n(100 + 13) + ' ' + n(sh) + 'H' + n(100 + 7) + 'L' + n(100) + ' ' + n(sh + 7) + 'L' + n(100 - 7) + ' ' + n(sh) + 'Z');
      }
      if (C) {
        o.top += S.rect('top-dk', x0, y1 - 12, g.tw, 6, 3) + S.circ(PAPER, 100, sh + (y1 - sh) * 0.28, 7) + S.rect('top', 99, sh + (y1 - sh) * 0.28 - 4.5, 2.4, 9, 1.2);
        o.sleeve.cuff = 'top2';
      }
      o.sleeve.len = 22;
    }
    return o;
  }

  /* ---------- mix-and-match clothes (Lit Town's wardrobe in style C) ----------
   * opts.wear = { top, bot, shoes, acc } replaces opts.outfit. Every piece is drawn from the body measurements
   * in g, so it fits every height/width stretch. Colour slots: top/top2, bot/bot2, shoe, acc.
   * Returns the same shape as outfit(): { legs, bottom, top, sleeve, shoe } plus
   *   back (behind the head, e.g. a hood), face (over the face: glasses), head (over the hair: hats, bows) */
  var WEAR = {
    top: ['tee', 'hoodie', 'stripe', 'sweater', 'dress', 'jacket', 'jersey', 'chef'],
    bot: ['pants', 'skirt', 'shorts', 'tutu', 'leggings', 'cargo'],
    shoes: ['sneakers', 'boots', 'sandals', 'rainboots'],
    acc: ['none', 'glasses', 'bow', 'headband', 'chefhat', 'cap', 'beanie', 'flowers']
  };
  var WEAR_LABEL = {
    tee: 'T-shirt', hoodie: 'Hoodie', stripe: 'Stripes', sweater: 'Sweater', dress: 'Dress', jacket: 'Jacket', jersey: 'Jersey', chef: 'Chef jacket',
    pants: 'Jeans', skirt: 'Skirt', shorts: 'Shorts', tutu: 'Tutu', leggings: 'Leggings', cargo: 'Cargo pants',
    sneakers: 'Sneakers', boots: 'Boots', sandals: 'Sandals', rainboots: 'Rain boots',
    none: 'None', glasses: 'Glasses', bow: 'Bow', headband: 'Headband', chefhat: 'Chef hat', cap: 'Cap', beanie: 'Beanie', flowers: 'Flower crown'
  };
  var HATS = { chefhat: 1, cap: 1, beanie: 1 };

  function wearTop(S, g, t, id) {
    var x0 = g.x0, x1 = g.x1, sh = g.sh, hip = g.hip, y1 = hip + g.hem, o = { top: '', back: '', sleeve: { key: 'top', len: 26, puff: false, cuff: 'top-dk' }, dress: false };
    var C = t.outfit === 'C' || t.outfit === 'D', L = g.arm, tw = g.tw;
    var body = S.path('top', torsoPath(g, x0, x1, sh, y1), true);
    var vneck = S.path('top-dk', 'M' + n(85) + ' ' + n(sh) + 'Q100 ' + n(sh + 13) + ' ' + n(115) + ' ' + n(sh) + 'Q100 ' + n(sh + 7) + ' ' + n(85) + ' ' + n(sh) + 'Z');
    var hemBand = S.rect('top-dk', x0, y1 - 6, tw, 6, 3);
    var shade = C ? S.path('top-sh', 'M' + n(x1 - 3) + ' ' + n(sh + 16) + 'Q' + n(x1 - 3) + ' ' + n(y1 - 8) + ' ' + n(x1 - 12) + ' ' + n(y1 - 7) + 'Q' + n(x1 - 9) + ' ' + n(sh + 30) + ' ' + n(x1 - 3) + ' ' + n(sh + 16) + 'Z') : '';
    var i;
    if (id === 'tee' || id === 'stripe') {
      o.top = body;
      if (id === 'stripe') {
        for (i = 0; i < 4; i++) { o.top += S.rect('top2', x0 + 2, sh + 13 + i * ((y1 - sh - 18) / 4), tw - 4, 6.5, 2); }
        o.sleeve.cuff = 'top2';
      }
      o.top += shade + vneck + hemBand;
      if (id === 'tee' && C) { o.top += S.rect('top-sh', 100 + tw * 0.1, sh + (y1 - sh) * 0.3, tw * 0.2, tw * 0.18, 2) + S.rect('top-dk', 100 + tw * 0.1, sh + (y1 - sh) * 0.3, tw * 0.2, 2.4, 1.2); }
    } else if (id === 'hoodie') {
      /* the hood lies on the shoulders behind the head */
      o.back = S.path('top', 'M' + n(100 - tw * 0.72) + ' ' + n(sh + 12) + 'Q' + n(100 - tw * 0.76) + ' ' + n(sh - 16) + ' 100 ' + n(sh - 20) + 'Q' + n(100 + tw * 0.76) + ' ' + n(sh - 16) + ' ' + n(100 + tw * 0.72) + ' ' + n(sh + 12) + 'Q100 ' + n(sh + 2) + ' ' + n(100 - tw * 0.72) + ' ' + n(sh + 12) + 'Z', true) +
        S.path('top-sh', 'M' + n(100 - tw * 0.6) + ' ' + n(sh + 6) + 'Q' + n(100 - tw * 0.62) + ' ' + n(sh - 10) + ' 100 ' + n(sh - 13) + 'Q' + n(100 + tw * 0.62) + ' ' + n(sh - 10) + ' ' + n(100 + tw * 0.6) + ' ' + n(sh + 6) + 'Q100 ' + n(sh) + ' ' + n(100 - tw * 0.6) + ' ' + n(sh + 6) + 'Z');
      o.top = body + shade + S.rect('top-dk', x0, y1 - 8, tw, 8, 4);
      /* kangaroo pocket */
      o.top += S.path('top-sh', 'M' + n(100 - tw * 0.3) + ' ' + n(y1 - 9) + 'L' + n(100 - tw * 0.22) + ' ' + n(hip - 18) + 'H' + n(100 + tw * 0.22) + 'L' + n(100 + tw * 0.3) + ' ' + n(y1 - 9) + 'Z', true);
      /* drawstrings */
      o.top += S.rect('top2', 93, sh + 2, 3, 24, 1.5) + S.rect('top2', 104, sh + 2, 3, 24, 1.5) + S.circ('top2', 94.5, sh + 27, 2.6) + S.circ('top2', 105.5, sh + 27, 2.6);
      o.sleeve = { key: 'top', len: L - 3, puff: false, cuff: 'top-dk' };
    } else if (id === 'sweater') {
      o.top = body + shade;
      /* knit diamonds across the chest */
      for (i = 0; i < 3; i++) {
        var cx = 100 + (i - 1) * tw * 0.27, cy = sh + (y1 - sh) * 0.38;
        o.top += S.path('top2', 'M' + n(cx) + ' ' + n(cy - 6) + 'L' + n(cx + 5) + ' ' + n(cy) + 'L' + n(cx) + ' ' + n(cy + 6) + 'L' + n(cx - 5) + ' ' + n(cy) + 'Z');
      }
      o.top += S.rect('top2', x0 + 2, sh + (y1 - sh) * 0.38 - 1.2, tw - 4, 2.4, 1.2).replace('<rect ', '<rect opacity=".7" ');
      /* ribbed collar and hem */
      o.top += S.path('top2', 'M' + n(84) + ' ' + n(sh - 1) + 'Q100 ' + n(sh + 11) + ' ' + n(116) + ' ' + n(sh - 1) + 'Q100 ' + n(sh + 5) + ' ' + n(84) + ' ' + n(sh - 1) + 'Z', true);
      o.top += S.rect('top2', x0, y1 - 9, tw, 9, 4, true);
      for (i = 1; i < 8; i++) { o.top += S.rect('top2-dk', x0 + i * tw / 8 - 0.6, y1 - 7, 1.2, 5, 0.6); }
      o.sleeve = { key: 'top', len: L - 3, puff: false, cuff: 'top2' };
    } else if (id === 'dress') {
      o.dress = true;
      var flare = tw * 0.3, sy0 = hip - 6, sy1 = hip + g.leg * 0.42;
      var skirt = 'M' + n(x0 + 4) + ' ' + n(sy0) + 'H' + n(x1 - 4) + 'L' + n(x1 + flare) + ' ' + n(sy1 - 8) + 'Q' + n(x1 + flare + 1) + ' ' + n(sy1) + ' ' + n(x1 + flare - 8) + ' ' + n(sy1) + 'H' + n(x0 - flare + 8) + 'Q' + n(x0 - flare - 1) + ' ' + n(sy1) + ' ' + n(x0 - flare) + ' ' + n(sy1 - 8) + 'Z';
      var hem = '', k = 7, wd = (tw + flare * 2 - 4) / k;
      for (i = 0; i < k; i++) { hem += S.circ('top2', x0 - flare + 2 + wd * (i + 0.5), sy1 - 1, wd / 2); }
      hem += S.rect('top2', x0 - flare + 1, sy1 - 7, tw + flare * 2 - 2, 6, 3);
      var pleat = S.path('top-dk', 'M' + n(x0 + 10) + ' ' + n(sy0 + 6) + 'L' + n(x0 - flare * 0.45) + ' ' + n(sy1 - 8) + 'L' + n(x0 - flare * 0.45 + 5) + ' ' + n(sy1 - 8) + 'Z');
      o.top = S.path('top', skirt, true) + hem + pleat + mirror(pleat) + S.path('top-dk', 'M100 ' + n(sy0 + 8) + 'L97 ' + n(sy1 - 8) + 'L103 ' + n(sy1 - 8) + 'Z') +
        S.path('top', torsoPath(g, x0 + 2, x1 - 2, sh, hip + 2), true) + S.rect('top2', x0 + 1, hip - 9, tw - 2, 7, 3);
      var col = S.path(PAPER, 'M100 ' + n(sh + 1) + 'Q92 ' + n(sh + 14) + ' 80 ' + n(sh + 9) + 'Q80 ' + n(sh + 1) + ' 86 ' + n(sh - 1) + 'Z', true);
      o.top += col + mirror(col);
      o.sleeve = { key: 'top', len: 16, puff: true, cuff: 'top2' };
    } else if (id === 'jacket') {
      /* a shirt (top2) under an open jacket (top) */
      o.top = S.path('top2', torsoPath(g, x0 + 8, x1 - 8, sh, y1 - 2), true) + S.path('top2-dk', 'M93 ' + n(sh) + 'Q100 ' + n(sh + 8) + ' 107 ' + n(sh) + 'Z');
      var panel = S.path('top', 'M' + n(x0) + ' ' + n(sh + 22) + 'Q' + n(x0) + ' ' + n(sh) + ' ' + n(x0 + 20) + ' ' + n(sh) + 'H' + n(91) + 'L' + n(95) + ' ' + n(y1) + 'H' + n(x0 + 8) + 'Q' + n(x0) + ' ' + n(y1) + ' ' + n(x0) + ' ' + n(y1 - 8) + 'Z', true);
      var lapel = S.path('top-dk', 'M' + n(91) + ' ' + n(sh) + 'L' + n(84) + ' ' + n(sh + 22) + 'L' + n(93.5) + ' ' + n(sh + 30) + 'Z');
      var pocket = S.rect('top-sh', x0 + 7, hip - 6, 15, 10, 2) + S.rect('top-dk', x0 + 7, hip - 6, 15, 2.4, 1.2);
      o.top += panel + lapel + pocket + mirror(panel + lapel + pocket) + S.circ('top-dk', 89, sh + 40, 2.2) + S.circ('top-dk', 89.5, sh + 54, 2.2);
      o.sleeve = { key: 'top', len: L - 3, puff: false, cuff: 'top-dk' };
    } else if (id === 'jersey') {
      o.top = S.path('top', torsoPath(g, x0, x1, sh, y1 - 6), true) + shade + S.rect('top2', x0, sh + (y1 - sh) * 0.46, tw, 7, 0);
      o.top += S.path('top2', 'M87 ' + n(sh) + 'L100 ' + n(sh + 14) + 'L113 ' + n(sh) + 'H107L100 ' + n(sh + 7) + 'L93 ' + n(sh) + 'Z');
      o.top += S.rect('top-dk', x0, y1 - 12, tw, 6, 3) + S.circ(PAPER, 100, sh + (y1 - sh) * 0.27, 7) + S.rect('top', 99, sh + (y1 - sh) * 0.27 - 4.5, 2.4, 9, 1.2);
      o.sleeve = { key: 'top', len: 22, puff: false, cuff: 'top2' };
    } else if (id === 'chef') {
      /* double-breasted chef's jacket with a neck scarf */
      o.top = body + shade + S.rect('top-dk', x0, y1 - 6, tw, 6, 3);
      for (i = 0; i < 3; i++) { o.top += S.circ('top2', 92, sh + 20 + i * 14, 2.6) + S.circ('top2', 108, sh + 20 + i * 14, 2.6); }
      o.top += S.path('top-dk', 'M100 ' + n(sh + 6) + 'V' + n(y1 - 6)).replace('<path ', '<path stroke-width="1.4" ');
      o.top += S.path('top2', 'M86 ' + n(sh - 1) + 'H114L100 ' + n(sh + 13) + 'Z', true) + S.circ('top2', 100, sh + 2, 4, true);
      o.sleeve = { key: 'top', len: L * 0.7, puff: false, cuff: 'top-dk' };
    }
    return o;
  }

  function wearBot(S, g, t, id) {
    var x0 = g.x0, hip = g.hip, G = g.G, lx = g.lcx, lw = g.lw, tw = g.tw, o = { legs: '', bottom: '' }, C = t.outfit === 'C' || t.outfit === 'D';
    var waist = S.rect('bot', x0 + 2, hip - 10, tw - 4, 22, 8, true), leg, i;
    if (id === 'pants' || id === 'cargo') {
      var wide = id === 'cargo' ? 5 : 3;
      leg = S.rect('bot', lx - lw / 2 - wide, hip - 4, lw + wide * 2, G - hip - 6, 6, true);
      if (id === 'pants') {
        if (C) { leg += S.rect('bot-hi', lx - lw / 2 - wide, G - 18, lw + wide * 2, 6, 3); }
      } else {
        leg += S.rect('bot-sh', lx - lw / 2 - wide + 1, hip + g.leg * 0.32, 11, 14, 2) + S.rect('bot-dk', lx - lw / 2 - wide + 1, hip + g.leg * 0.32, 11, 3, 1.5) +
          S.rect('bot-dk', lx - lw / 2 - wide, G - 16, lw + wide * 2, 4, 2);
      }
      o.bottom = leg + mirror(leg) + waist + S.rect('bot-dk', x0 + 6, hip - 4, 12, 2, 1) + mirror(S.rect('bot-dk', x0 + 6, hip - 4, 12, 2, 1));
    } else if (id === 'leggings') {
      leg = S.rect('bot', lx - lw / 2 - 1, hip - 4, lw + 2, G - hip - 10, lw / 2, true) + S.rect('bot2', lx - lw / 2, hip + 6, 3, G - hip - 26, 1.5);
      o.bottom = leg + mirror(leg) + S.rect('bot', x0 + 4, hip - 10, tw - 8, 20, 8, true) + S.rect('bot2', x0 + 4, hip - 10, tw - 8, 4, 2);
    } else if (id === 'shorts') {
      var sl = g.hem + g.leg * 0.24;
      leg = S.rect('bot', lx - lw / 2 - 4, hip - 4, lw + 8, sl, 5, true) + S.rect('bot2', lx - lw / 2 - 4, hip - 2, 3.5, sl - 4, 1.5);
      if (C) { leg += S.rect('bot-dk', lx - lw / 2 - 4, hip - 4 + sl - 5, lw + 8, 5, 2.5); }
      o.bottom = leg + mirror(leg) + S.rect('bot', x0 + 2, hip - 10, tw - 4, 20, 8, true);
    } else if (id === 'skirt' || id === 'tutu') {
      /* the top's hem sits at hip + g.hem, so the skirt reaches well below it */
      var tutu = id === 'tutu', flare = tw * (tutu ? 0.5 : 0.22), y0 = hip - 8, yb = hip + g.hem + g.leg * (tutu ? 0.2 : 0.26);
      var shape = function (key, f, yy, ol) {
        return S.path(key, 'M' + n(x0 + 3) + ' ' + n(y0) + 'H' + n(g.x1 - 3) + 'L' + n(g.x1 + f) + ' ' + n(yy - 6) + 'Q' + n(g.x1 + f) + ' ' + n(yy) + ' ' + n(g.x1 + f - 6) + ' ' + n(yy) +
          'H' + n(x0 - f + 6) + 'Q' + n(x0 - f) + ' ' + n(yy) + ' ' + n(x0 - f) + ' ' + n(yy - 6) + 'Z', ol);
      };
      if (tutu) {
        /* three frilly layers */
        var layer = function (key, f, yy) {
          var s = shape(key, f, yy - 3, true), k = 8, wd = (g.tw + f * 2) / k;
          for (i = 0; i < k; i++) { s += S.circ(key, x0 - f + wd * (i + 0.5), yy - 3, wd / 2); }
          return s;
        };
        o.bottom = layer('bot', flare, yb) + layer('bot-hi', flare * 0.82, yb - 8) + layer('bot2', flare * 0.64, yb - 16) + S.rect('bot', x0 + 1, y0, tw - 2, 8, 4, true);
      } else {
        o.bottom = shape('bot', flare, yb, true) + S.rect('bot2', x0 - flare + 2, yb - 6, tw + flare * 2 - 4, 4, 2) + S.rect('bot-dk', x0 + 1, y0, tw - 2, 6, 3);
        var fold = S.path('bot-sh', 'M' + n(x0 + 12) + ' ' + n(y0 + 7) + 'L' + n(x0 - flare * 0.4) + ' ' + n(yb - 7) + 'L' + n(x0 - flare * 0.4 + 5) + ' ' + n(yb - 7) + 'Z');
        o.bottom += fold + mirror(fold);
      }
    }
    return o;
  }

  /* shoes (left foot; mirrored for the right). Boots and rain boots have a shaft over the trouser leg. */
  function wearShoe(S, g, t, id) {
    var x = g.lcx, G = g.G, w = g.foot, h = 15, out = '', lw = g.lw;
    var l = x - w / 2 + 1, r = x + w / 2 - 1;
    var foot = function (key, hh) {
      return S.path(key, 'M' + n(r) + ' ' + n(G) + 'V' + n(G - hh + 4) + 'Q' + n(r) + ' ' + n(G - hh) + ' ' + n(x) + ' ' + n(G - hh) + 'Q' + n(l - 6) + ' ' + n(G - hh) + ' ' + n(l - 8) + ' ' + n(G - 2) + 'Q' + n(l - 8) + ' ' + n(G) + ' ' + n(l - 5) + ' ' + n(G) + 'Z', true);
    };
    if (id === 'sandals') {
      out += foot('skin', 12) + S.rect('shoe-dk', l - 8, G - 3.5, w + 8, 4.5, 2.2, true) + S.rect('shoe', l - 5, G - 9, w + 1, 3.6, 1.8) + S.rect('shoe', x - 2, G - 16, 4, 10, 2) + S.circ('shoe-hi', x, G - 9, 2);
      return out;
    }
    if (id === 'boots' || id === 'rainboots') {
      var tall = id === 'rainboots' ? 46 : 34;
      out += S.rect('shoe', x - lw / 2 - 3, G - tall, lw + 6, tall - 6, 4, true);
      out += foot('shoe', h);
      out += S.rect('shoe-dk', l - 8, G - 3.5, w + 8, 4.5, 2.2, true);
      if (id === 'boots') { out += S.rect('shoe-dk', x - lw / 2 - 3, G - tall, lw + 6, 6, 3) + S.circ('shoe-hi', x + lw / 2 - 2, G - tall + 12, 1.8) + S.circ('shoe-hi', x + lw / 2 - 2, G - tall + 20, 1.8); }
      else { out += S.rect('shoe-hi', x - lw / 2, G - tall + 5, 3, tall - 18, 1.5) + S.rect('shoe-dk', x - lw / 2 - 3, G - tall, lw + 6, 4, 2); }
      return out;
    }
    /* sneakers */
    out += foot('shoe', h) + S.rect('shoe-dk', l - 8, G - 3.5, w + 8, 4.5, 2.2) + S.circ(PAPER, x + 2, G - h + 5, 2.2) +
      S.path('shoe-hi', 'M' + n(l - 4) + ' ' + n(G - 6) + 'Q' + n(l - 3) + ' ' + n(G - h + 3) + ' ' + n(x - 4) + ' ' + n(G - h + 1.5) + 'Q' + n(l + 1) + ' ' + n(G - h + 6) + ' ' + n(l - 1) + ' ' + n(G - 6) + 'Z') +
      S.rect(PAPER, x - 3, G - h + 8.5, 9, 1.8, 0.9);
    return out;
  }

  /* accessories: glasses go over the face; the rest over the hair. Drawn in reference-head space (g.m). */
  function wearAcc(S, g, t, id) {
    var m = g.m, o = { face: '', head: '' }, X = function (v) { return +m.x(v); }, Y = function (v) { return +m.y(v); }, k = g.sx, i;
    if (!id || id === 'none') { return o; }
    if (id === 'glasses') {
      var ring = function (cx) {
        var R = 15 * k, r2 = 11.6 * k, cy = Y(101);
        return S.path('acc', 'M' + n(cx - R) + ' ' + n(cy) + 'a' + n(R) + ' ' + n(R) + ' 0 1 0 ' + n(2 * R) + ' 0a' + n(R) + ' ' + n(R) + ' 0 1 0 ' + n(-2 * R) + ' 0Z' +
          'M' + n(cx - r2) + ' ' + n(cy) + 'a' + n(r2) + ' ' + n(r2) + ' 0 1 1 ' + n(2 * r2) + ' 0a' + n(r2) + ' ' + n(r2) + ' 0 1 1 ' + n(-2 * r2) + ' 0Z', false, 'fill-rule="evenodd"');
      };
      o.face = ring(X(78)) + ring(X(122)) + S.rect('acc', X(92), Y(98), X(108) - X(92), 3.2 * k, 1.6) +
        S.rect('acc', X(46), Y(98), X(63) - X(46), 3 * k, 1.5) + S.rect('acc', X(137), Y(98), X(154) - X(137), 3 * k, 1.5) +
        S.rect(PAPER, X(70), Y(91), 5 * k, 2 * k, 1).replace('<rect ', '<rect opacity=".7" ') + S.rect(PAPER, X(114), Y(91), 5 * k, 2 * k, 1).replace('<rect ', '<rect opacity=".7" ');
    } else if (id === 'bow') {
      var bx = X(146), by = Y(40), s = k;
      o.head = S.path('acc', 'M' + n(bx) + ' ' + n(by) + 'L' + n(bx - 20 * s) + ' ' + n(by - 14 * s) + 'Q' + n(bx - 26 * s) + ' ' + n(by) + ' ' + n(bx - 20 * s) + ' ' + n(by + 14 * s) + 'Z', true) +
        S.path('acc', 'M' + n(bx) + ' ' + n(by) + 'L' + n(bx + 20 * s) + ' ' + n(by - 14 * s) + 'Q' + n(bx + 26 * s) + ' ' + n(by) + ' ' + n(bx + 20 * s) + ' ' + n(by + 14 * s) + 'Z', true) +
        S.path('acc-hi', 'M' + n(bx - 6 * s) + ' ' + n(by - 3 * s) + 'L' + n(bx - 17 * s) + ' ' + n(by - 10 * s) + 'Q' + n(bx - 19 * s) + ' ' + n(by - 6 * s) + ' ' + n(bx - 17 * s) + ' ' + n(by - 4 * s) + 'Z') +
        S.circ('acc', bx, by, 5.5 * s, true);
    } else if (id === 'headband') {
      var pb = new PB(m);
      pb.M(33, 92).A(67, 1, 1, 167, 92).L(158, 92).A(58, 1, 0, 42, 92).Z();
      o.head = S.path('acc', pb.d, true) + S.circ('acc-hi', X(70), Y(38), 3.2 * k);
    } else if (id === 'flowers') {
      var pts = [[44, 62], [66, 38], [100, 28], [134, 38], [156, 62]];
      for (i = 0; i < pts.length; i++) {
        var fx = X(pts[i][0]), fy = Y(pts[i][1]), pr = 5.4 * k, a, petals = '';
        for (a = 0; a < 5; a++) { petals += S.circ(i % 2 ? 'acc' : 'acc-hi', fx + Math.cos(a * 1.2566) * pr, fy + Math.sin(a * 1.2566) * pr, pr * 0.95, true); }
        o.head += petals + S.circ('#FFD23F', fx, fy, pr * 0.62);
        if (i < pts.length - 1) { o.head += S.ell('#7BC67E', (fx + X(pts[i + 1][0])) / 2, (fy + Y(pts[i + 1][1])) / 2, 6 * k, 3 * k, false, 'rotate(' + (i < 2 ? -35 : 35) + ' ' + n((fx + X(pts[i + 1][0])) / 2) + ' ' + n((fy + Y(pts[i + 1][1])) / 2) + ')'); }
      }
    } else if (id === 'beanie') {
      var pb2 = new PB(m);
      pb2.M(36, 74).Q(36, 14, 100, 14).Q(164, 14, 164, 74).Z();
      o.head = S.path('acc', pb2.d, true) + S.rect('acc-dk', X(32), Y(64), X(168) - X(32), 16 * k, 7 * k, true);
      for (i = 1; i < 9; i++) { o.head += S.rect('acc', X(32) + i * (X(168) - X(32)) / 9 - 1, Y(67), 2, 10 * k, 1); }
      o.head += S.path('acc-hi', new PB(m).M(56, 46).Q(62, 26, 88, 22).Q(66, 32, 62, 50).Z().d) + S.circ('acc-hi', X(100), Y(8), 10 * k, true);
    } else if (id === 'cap') {
      var pb3 = new PB(m);
      pb3.M(38, 72).Q(38, 18, 100, 18).Q(162, 18, 162, 72).Z();
      o.head = S.path('acc', pb3.d, true) + S.path('acc-dk', new PB(m).M(98, 72).Q(150, 60, 178, 76).Q(182, 84, 172, 84).Q(140, 78, 100, 80).Z().d, true) +
        S.path('acc-sh', new PB(m).M(98, 20).Q(110, 46, 104, 72).L(96, 72).Q(100, 46, 98, 20).Z().d) + S.circ('acc-dk', X(100), Y(18), 4 * k);
    } else if (id === 'chefhat') {
      var by2 = Y(48), top = Math.max(4, Y(-6));
      o.head = S.circ('acc', X(70), (by2 + top) / 2 + 4, 20 * k, true) + S.circ('acc', X(130), (by2 + top) / 2 + 4, 20 * k, true) + S.circ('acc', X(100), top + 18 * k, 24 * k, true) +
        S.rect('acc', X(54), (by2 + top) / 2, X(146) - X(54), by2 - (by2 + top) / 2, 4, true) + S.rect('acc-dk', X(52), by2 - 4, X(148) - X(52), 14 * k, 5, true) +
        S.path('acc-sh', 'M' + n(X(88)) + ' ' + n(by2 - 6) + 'Q' + n(X(92)) + ' ' + n(top + 24) + ' ' + n(X(98)) + ' ' + n(top + 30) + 'Q' + n(X(96)) + ' ' + n(by2 - 20) + ' ' + n(X(94)) + ' ' + n(by2 - 6) + 'Z');
    }
    return o;
  }

  function wear(S, g, t, w) {
    w = w || {};
    var tp = wearTop(S, g, t, w.top || 'tee'), bt = wearBot(S, g, t, w.bot || 'pants'), ac = wearAcc(S, g, t, w.acc || 'none');
    return { legs: bt.legs, bottom: tp.dress && (w.bot === 'skirt' || w.bot === 'tutu') ? '' : bt.bottom, top: tp.top, back: tp.back, sleeve: tp.sleeve,
      shoeId: w.shoes || 'sneakers', face: ac.face, head: ac.head, hat: !!HATS[w.acc] };
  }

  /* ---------- whole character ---------- */
  /**
   * opts: { t: traits, mode: 'class'|'bake', colors: {...}, style: hairstyle, outfit, expr, body, rainbow, sil (silhouette) }
   * returns { svg, inner, w, h, bytes, shapes }
   */

  /* ---------- costume and fantasy set (unlockables): paint, patterns, horns and ears, robot parts, tech, capes, glow ---------- */
  KIT.paint = [['f1', 'None'], ['f2', 'Cheek stripes'], ['f3', 'Cheek star'], ['f4', 'Nose dots'], ['f5', 'Half face'], ['f6', 'Tiger stripes'], ['f7', 'Lightning']];
  KIT.pattern = [['s1', 'None'], ['s2', 'Spots'], ['s3', 'Stripes'], ['s4', 'Scales'], ['s5', 'Swirls'], ['s6', 'Patches']];
  KIT.headx = [['x1', 'None'], ['x2', 'Small horns'], ['x3', 'Big horns'], ['x4', 'Cat ears'], ['x5', 'Bunny ears'], ['x6', 'Antennae']];
  KIT.robot = [['o1', 'None'], ['o2', 'Robot arms'], ['o3', 'Shoulder armour'], ['o4', 'Chest core'], ['o5', 'Full armour']];
  KIT.tech = [['t1', 'None'], ['t2', 'Cheek panels'], ['t3', 'Visor'], ['t4', 'Ear antenna']];
  KIT.cape = [['w1', 'None'], ['w2', 'Cape'], ['w3', 'Hood'], ['w4', 'Eye mask'], ['w5', 'Cape + hood']];
  KIT.glow = [['g1', 'Off'], ['g2', 'Glowing eyes']];
  var KIT_COSTUME = { paint: 'f1', pattern: 's1', headx: 'x1', robot: 'o1', tech: 't1', cape: 'w1', glow: 'g1' };
  for (var _k in KIT_COSTUME) { if (KIT_COSTUME.hasOwnProperty(_k)) { KIT_EXTRA[_k] = KIT_COSTUME[_k]; } }

  function kx(kit) {
    var o = {}, k; for (k in KIT_EXTRA) { if (KIT_EXTRA.hasOwnProperty(k)) { o[k] = (kit && kit[k]) || KIT_EXTRA[k]; } }
    if (kit) { o.jSize = kit.jSize || 1; o.jFlip = !!kit.jFlip; o.earOne = !!kit.earOne; }
    return o;
  }

  /* metal plates, stripes, spots… on one arm (local, hanging straight down; the caller rotates it) */
  function armExtras(S, g, x, y, aw, L, h, k) {
    var o = '', robot = k.robot === 'o2' || k.robot === 'o5';
    if (k.pattern === 's2') { o += S.circ('pattern', x - aw * 0.15, y + L * 0.45, aw * 0.16) + S.circ('pattern', x + aw * 0.2, y + L * 0.7, aw * 0.12); }
    if (k.pattern === 's3') { o += S.rect('pattern', x - aw / 2, y + L * 0.42, aw, 3, 1.5) + S.rect('pattern', x - aw / 2, y + L * 0.62, aw, 3, 1.5) + S.rect('pattern', x - aw / 2, y + L * 0.82, aw, 3, 1.5); }
    if (k.pattern === 's4') { var i; for (i = 0; i < 3; i++) { o += sline(S, 'pattern', 'M' + P2(x - aw * 0.32, y + L * (0.45 + i * 0.17)) + 'Q' + P2(x, y + L * (0.45 + i * 0.17) + 4) + ' ' + P2(x + aw * 0.32, y + L * (0.45 + i * 0.17)), 1.4); } }
    if (k.pattern === 's6') { o += S.path('pattern', 'M' + P2(x - aw / 2 + 1, y + L * 0.5) + 'Q' + P2(x + 2, y + L * 0.46) + ' ' + P2(x + 1, y + L * 0.66) + 'Q' + P2(x - 3, y + L * 0.78) + ' ' + P2(x - aw / 2 + 1, y + L * 0.72) + 'Z'); }
    if (robot) {
      o += S.rect('metal', x - aw / 2 - 0.5, y + 4, aw + 1, L * 0.46, aw / 2 - 1, true) + S.rect('metal', x - aw / 2 - 0.5, y + L * 0.52, aw + 1, L * 0.44, aw / 2 - 1, true);
      o += S.circ('metal-dk', x, y + L * 0.5, aw * 0.42, true) + S.circ('metal-hi', x - aw * 0.12, y + L * 0.48, aw * 0.13);
      o += S.rect('metal-hi', x - aw / 2 + 2.5, y + L * 0.58, 2.4, L * 0.3, 1.2) + S.rect('metal-sh', x - aw / 2 - 0.5, y + L * 0.86, aw + 1, 4, 2);
      o += S.circ('metal', x, y + L, h * 0.98, true) + S.rect('metal-dk', x - h * 0.6, y + L + h * 0.1, h * 1.2, 1.6, 0.8) + S.circ('glow', x, y + L - h * 0.2, h * 0.22);
    }
    return o;
  }

  /* half of the egg-shaped head (the viewer's right side) */
  function halfFace(g) {
    var hx = g.hr - 1, hy = g.hry - 1, cy = g.hcy, d = 'M100 ' + n(cy - hy) + 'C' + P2(100 + hx * 0.6, cy - hy) + ' ' + P2(100 + hx, cy - hy * 0.6) + ' ' + P2(100 + hx, cy) +
      'C' + P2(100 + hx, cy + hy * 0.62) + ' ' + P2(100 + hx * 0.5, cy + hy * 1.02) + ' ' + P2(100, cy + hy * 1.02) + 'Z';
    return d;
  }

  /* paint and patterns on the face (after the head, before the features) */
  function faceDeco(S, g, k) {
    var m = g.m, s = g.sx, o = '', c = '', pb = function () { return new PB(m); };
    switch (k.paint) {
      case 'f2': c = S.rect('paint', +m.x(56), +m.y(117), 14 * s, 3.4 * s, 1.7 * s, false, 'rotate(-14 ' + m.x(63) + ' ' + m.y(118) + ')') + S.rect('paint', +m.x(58), +m.y(124), 12 * s, 3.4 * s, 1.7 * s, false, 'rotate(-14 ' + m.x(64) + ' ' + m.y(125) + ')'); o += c + mirror(c); break;
      case 'f3': o += S.path('paint', star(+m.x(60), +m.y(119), 8 * s)); break;
      case 'f4': [[78, 112], [86, 109], [100, 107], [114, 109], [122, 112]].forEach(function (p) { o += S.circ('paint', +m.x(p[0]), +m.y(p[1]), 1.9 * s); }); break;
      case 'f5': o += S.path('paint', halfFace(g)); break;
      case 'f6':
        c = S.path('paint', pb().M(39, 96).L(60, 100).L(40, 104).Z().d) + S.path('paint', pb().M(42, 114).L(58, 118).L(44, 122).Z().d) + S.path('paint', pb().M(90, 60).L(94, 76).L(98, 60).Z().d);
        o += c + mirror(c); break;
      case 'f7': o += S.path('paint', pb().M(126, 84).L(118, 102).L(125, 102).L(116, 122).L(132, 98).L(125, 98).L(133, 84).Z().d); break;
    }
    switch (k.pattern) {
      case 's2': c = S.circ('pattern', +m.x(54), +m.y(92), 3.4 * s) + S.circ('pattern', +m.x(48), +m.y(104), 2.4 * s) + S.circ('pattern', +m.x(58), +m.y(134), 2.6 * s); o += c + mirror(c); break;
      case 's3': c = S.path('pattern', pb().M(40, 88).Q(52, 90, 58, 96).Q(50, 94, 40, 94).Z().d) + S.path('pattern', pb().M(42, 128).Q(54, 128, 60, 132).Q(52, 134, 44, 133).Z().d); o += c + mirror(c); break;
      case 's4':
        c = '';
        [[46, 90], [54, 90], [50, 97], [44, 132], [52, 133]].forEach(function (p) { c += sline(S, 'pattern', 'M' + m.x(p[0] - 3.4) + ' ' + m.y(p[1]) + 'Q' + m.x(p[0]) + ' ' + m.y(p[1] + 4.4) + ' ' + m.x(p[0] + 3.4) + ' ' + m.y(p[1]), 1.5 * s); });
        o += c + mirror(c); break;
      case 's5': c = sline(S, 'pattern', 'M' + m.x(52) + ' ' + m.y(128) + 'Q' + m.x(46) + ' ' + m.y(120) + ' ' + m.x(54) + ' ' + m.y(116) + 'Q' + m.x(60) + ' ' + m.y(118) + ' ' + m.x(57) + ' ' + m.y(123) + 'Q' + m.x(54) + ' ' + m.y(124) + ' ' + m.x(53) + ' ' + m.y(121), 1.6 * s); o += c + mirror(c); break;
      case 's6': o += S.path('pattern', pb().M(118, 86).Q(134, 80, 146, 92).Q(150, 108, 140, 112).Q(128, 106, 124, 98).Q(116, 96, 118, 86).Z().d) + S.path('pattern', pb().M(60, 132).Q(70, 128, 76, 136).Q(70, 142, 62, 140).Z().d); break;
    }
    return o;
  }

  /* fabric eye mask, under the eyes */
  function eyeMask(S, g) {
    var m = g.m, pb = new PB(m);
    var d = pb.M(46, 96).Q(48, 84, 66, 86).Q(84, 88, 100, 94).Q(116, 88, 134, 86).Q(152, 84, 154, 96).Q(156, 110, 136, 112).Q(116, 112, 100, 104).Q(84, 112, 64, 112).Q(44, 110, 46, 96).Z().d;
    var ties = S.path('cape', new PB(m).M(44, 96).Q(34, 92, 28, 98).Q(34, 100, 44, 102).Z().d, true);
    return S.path('cape', d, true) + ties + mirror(ties);
  }

  /* glowing eye: replaces an open eye */
  function glowEye(S, X, Y, s) {
    return S.ell('glow-dk', X, Y, 10.5 * s, 12 * s) + S.ell('glow', X, Y, 8.6 * s, 10 * s) + S.ell('glow-hi', X, Y, 5.4 * s, 6.6 * s) + S.ell(PAPER, X, Y - 1 * s, 2.6 * s, 3.4 * s);
  }

  /* things on the head that go behind the front hair (animal ears, antenna stalks) or in front (horns, hood rim, tech) */
  function headBehind(S, g, k) {
    var m = g.m, s = g.sx, o = '', c = '', pb = function () { return new PB(m); };
    if (k.headx === 'x4') {
      c = S.path('hair', pb().M(46, 52).L(44, 6).L(84, 30).Z().d, true) + S.path('#FF9AAE', pb().M(52, 44).L(51, 18).L(74, 32).Z().d);
      o += c + mirror(c);
    } else if (k.headx === 'x5') {
      c = S.ell('horn', +m.x(74), +m.y(-6), 11 * s, 34 * g.sy, true, 'rotate(-10 ' + m.x(74) + ' ' + m.y(-6) + ')') + S.ell('#FF9AAE', +m.x(74), +m.y(-4), 5 * s, 24 * g.sy, false, 'rotate(-10 ' + m.x(74) + ' ' + m.y(-4) + ')');
      o += c + mirror(c);
    } else if (k.headx === 'x6') {
      c = sline(S, 'horn-dk', 'M' + m.x(84) + ' ' + m.y(32) + 'Q' + m.x(74) + ' ' + m.y(6) + ' ' + m.x(62) + ' ' + m.y(-6), 2.6 * s) + S.circ('glow', +m.x(62), +m.y(-7), 6 * s, true);
      o += c + mirror(c);
    }
    if (false) {
      o = S.path('cape', pb().M(22, 104).Q(16, 8, 100, 6).Q(184, 8, 178, 104).Q(176, 150, 150, 158).L(50, 158).Q(24, 150, 22, 104).Z().d, true) + o;
    }
    return o;
  }
  function headFront(S, g, k) {
    var m = g.m, s = g.sx, o = '', c = '', pb = function () { return new PB(m); };
    if (k.headx === 'x2') {
      c = S.path('horn', pb().M(64, 40).Q(60, 22, 66, 10).Q(76, 22, 78, 36).Z().d, true) + S.path('horn-sh', pb().M(70, 38).Q(70, 24, 68, 16).Q(74, 26, 76, 36).Z().d);
      o += c + mirror(c);
    } else if (k.headx === 'x3') {
      c = S.path('horn', pb().M(46, 62).Q(20, 50, 22, 22).Q(26, 4, 44, 2).Q(34, 14, 38, 30).Q(44, 46, 62, 48).Z().d, true) +
        S.path('horn-sh', pb().M(30, 26).Q(34, 12, 42, 6).Q(36, 18, 38, 30).Z().d) + S.rect('horn-dk', +m.x(28), +m.y(40), 10 * s, 2.4 * s, 1.2 * s, false, 'rotate(-30 ' + m.x(33) + ' ' + m.y(41) + ')');
      o += c + mirror(c);
    }
    if (k.cape === 'w3' || k.cape === 'w5') {
      o += S.path('cape', pb().M(30, 104).Q(26, 18, 100, 16).Q(174, 18, 170, 104).L(160, 104).Q(160, 34, 100, 32).Q(40, 34, 40, 104).Z().d, true) +
        S.path('cape-sh', pb().M(42, 100).Q(42, 38, 100, 34).Q(56, 44, 50, 100).Z().d);
    }
    if (k.tech === 't2') {
      c = sline(S, 'metal-dk', 'M' + m.x(48) + ' ' + m.y(110) + 'L' + m.x(58) + ' ' + m.y(110) + 'L' + m.x(62) + ' ' + m.y(118) + 'L' + m.x(62) + ' ' + m.y(132), 1.8 * s) + S.circ('metal', +m.x(58), +m.y(110), 2.2 * s, true) + S.circ('metal', +m.x(62), +m.y(132), 2.2 * s, true);
      o += c + mirror(c);
    } else if (k.tech === 't3') {
      o += S.rect('metal', +m.x(36), +m.y(90), 128 * s, 22 * s, 11 * s, true) + S.rect('glow', +m.x(42), +m.y(93), 116 * s, 16 * s, 8 * s).replace('<rect ', '<rect opacity=".82" ') + S.rect('glow-hi', +m.x(48), +m.y(95.5), 40 * s, 3.4 * s, 1.7 * s);
    } else if (k.tech === 't4') {
      o += S.circ('metal', +m.x(160), +m.y(102), 13 * s, true) + S.circ('metal-dk', +m.x(160), +m.y(102), 6 * s) + sline(S, 'metal-dk', 'M' + m.x(166) + ' ' + m.y(94) + 'L' + m.x(176) + ' ' + m.y(66), 2.2 * s) + S.circ('glow', +m.x(176), +m.y(64), 3.6 * s, true);
    }
    return o;
  }

  /* cape behind the body; shoulder armour and chest core over the top */
  function capeBack(S, g, k) {
    var hood = (k.cape === 'w3' || k.cape === 'w5') ? S.path('cape', new PB(g.m).M(22, 104).Q(16, 8, 100, 6).Q(184, 8, 178, 104).Q(176, 150, 150, 158).L(50, 158).Q(24, 150, 22, 104).Z().d, true) : '';
    if (k.cape !== 'w2' && k.cape !== 'w5') { return hood; }
    return capeBody(S, g) + hood;
  }
  function capeBody(S, g) {
    var x0 = g.x0, x1 = g.x1, sh = g.sh, bot = g.G - 18, f = g.tw * 0.5;
    return S.path('cape', 'M' + P2(x0 + 6, sh + 2) + 'H' + n(x1 - 6) + 'L' + P2(x1 + f, bot - 6) + 'Q' + P2(x1 + f, bot + 4) + ' ' + P2(x1 + f - 12, bot) + 'Q' + P2(100, bot + 8) + ' ' + P2(x0 - f + 12, bot) + 'Q' + P2(x0 - f, bot + 4) + ' ' + P2(x0 - f, bot - 6) + 'Z', true) +
      S.path('cape-sh', 'M' + P2(x0 - 2, sh + 30) + 'L' + P2(x0 - f * 0.55, bot - 4) + 'L' + P2(x0 - f * 0.2, bot - 2) + 'Z') + S.path('cape-sh', 'M' + P2(x1 + 2, sh + 30) + 'L' + P2(x1 + f * 0.55, bot - 4) + 'L' + P2(x1 + f * 0.2, bot - 2) + 'Z');
  }
  function bodyFront(S, g, k) {
    var o = '', sh = g.sh, x0 = g.x0, x1 = g.x1;
    if (k.robot === 'o3' || k.robot === 'o5') {
      var pad = S.path('metal', 'M' + P2(x0 - 6, sh + 20) + 'Q' + P2(x0 - 8, sh - 4) + ' ' + P2(x0 + 18, sh - 2) + 'Q' + P2(x0 + 24, sh + 6) + ' ' + P2(x0 + 18, sh + 14) + 'Q' + P2(x0 + 4, sh + 12) + ' ' + P2(x0 - 6, sh + 20) + 'Z', true) +
        S.path('metal-hi', 'M' + P2(x0 - 2, sh + 10) + 'Q' + P2(x0, sh + 1) + ' ' + P2(x0 + 12, sh + 1) + 'Q' + P2(x0 + 2, sh + 4) + ' ' + P2(x0 - 2, sh + 10) + 'Z') + S.circ('metal-dk', x0 + 14, sh + 8, 1.8);
      o += pad + mirror(pad);
    }
    if (k.robot === 'o4' || k.robot === 'o5') {
      var cy = sh + (g.hip - sh) * 0.42;
      o += S.circ('metal', 100, cy, g.tw * 0.17, true) + S.circ('glow', 100, cy, g.tw * 0.12) + S.circ('glow-hi', 100, cy, g.tw * 0.065) + S.circ(PAPER, 98.4, cy - 1.6, g.tw * 0.025);
    }
    if (k.cape === 'w2' || k.cape === 'w5') { o += S.circ('acc', 100, sh + 4, 4.4, true) + S.circ('acc-hi', 99, sh + 3, 1.4); }
    return o;
  }


  /* ---------- hair dye: tips and ombre drawn as the hair shape twice (dye colour underneath, real colour on top, a little shorter) ---------- */
  KIT.hairx = [['hx1', 'None'], ['hx2', 'Ahoge'], ['hx3', 'Big bow'], ['hx4', 'Star clips']];
  KIT_COSTUME.hairx = 'hx1'; KIT_EXTRA.hairx = 'hx1';
  KIT.dye = [['d1', 'None'], ['d2', 'Frosted tips'], ['d3', 'Highlights'], ['d4', 'Dip-dye tips'], ['d5', 'Ombre'], ['d6', 'Face-framing streaks']];
  KIT.ears = [['y1', 'Round'], ['y2', 'Elf'], ['y3', 'Long elf']];
  KIT.freckles = [['z1', 'None'], ['z2', 'Cheeks'], ['z3', 'Nose & cheeks'], ['z4', 'All over']];
  KIT_COSTUME.dye = 'd1'; KIT_COSTUME.ears = 'y1'; KIT_COSTUME.freckles = 'z1';
  KIT_EXTRA.dye = 'd1'; KIT_EXTRA.ears = 'y1'; KIT_EXTRA.freckles = 'z1';
  function recolorHair(mk, key) {
    /* fills take the dye colour; the outline stays the hair's own outline colour ("oh") */
    return mk.replace(/c-hair(-dk|-sh|-hi)?(?=[\s"])/g, function (m0, suf) { return key === 'dye-dk' ? 'c-dye-dk' : 'c-' + key + (suf || ''); }).replace(/class="s-hair"/g, 'class="s-' + key + '"').replace(/ o"/g, ' o oh"');
  }
  function noOutline(mk) { return mk.replace(/ o"/g, '"'); }
  /* how much shorter the top copy is (reference-head units): locks, fringe, back hair */
  var DYE_CUT = { d2: [{ lock: 10, fringe: 4, back: 12 }], d4: [{ lock: 22, fringe: 7, back: 26 }], d5: [{ lock: 13, fringe: 4, back: 16 }, { lock: 28, fringe: 8, back: 34 }] };
  /* pointed ears, drawn over the hair so they poke through it */
  function elfEars(S, g, id) {
    if (!id || id === 'y1') { return ''; }
    var m = g.m, c, pb = function () { return new PB(m); };
    if (id === 'y2') {
      c = S.path('skin', pb().M(46, 94).Q(32, 86, 20, 72).Q(24, 96, 40, 114).Q(50, 110, 46, 94).Z().d, true) + S.path('skin-sh', pb().M(42, 98).Q(32, 90, 26, 82).Q(30, 98, 40, 108).Z().d);
    } else {
      c = S.path('skin', pb().M(47, 92).Q(22, 84, -6, 54).Q(4, 90, 38, 116).Q(52, 110, 47, 92).Z().d, true) + S.path('skin-sh', pb().M(42, 96).Q(20, 84, 4, 66).Q(14, 92, 38, 108).Z().d);
    }
    return c + mirror(c);
  }

  /* freckles: fixed scattered spots per area; amount and see-through come from sliders */
  function rand(seed) { var x = seed; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  var FRECKLE_AREAS = { cheekL: [60, 119, 12, 8, 12, 11], cheekR: [140, 119, 12, 8, 12, 23], nose: [100, 110, 13, 4.5, 9, 37], templeL: [47, 104, 5, 9, 5, 41], templeR: [153, 104, 5, 9, 5, 53], chin: [100, 138, 10, 4, 5, 67], brow: [100, 84, 24, 6, 8, 71] };
  function freckles(S, g, id, density, transp) {
    if (!id || id === 'z1') { return ''; }
    var m = g.m, s = g.sx, areas = ['cheekL', 'cheekR'], o = '';
    if (id === 'z3' || id === 'z4') { areas.push('nose'); }
    if (id === 'z4') { areas = areas.concat(['templeL', 'templeR', 'chin', 'brow']); }
    var dn = density == null ? 0.6 : Math.max(0.1, Math.min(1, density));
    areas.forEach(function (a) {
      var A = FRECKLE_AREAS[a], r = rand(A[5] * 977), cnt = Math.max(1, Math.round(A[4] * dn)), i, ang, rr;
      for (i = 0; i < A[4]; i++) {
        ang = r() * Math.PI * 2; rr = Math.sqrt(r());
        var x = A[0] + Math.cos(ang) * A[2] * rr, y = A[1] + Math.sin(ang) * A[3] * rr, rad = (1 + r() * 0.8) * s;
        if (i < cnt) { o += S.circ('freckle', +m.x(x), +m.y(y), rad); }
      }
    });
    var op = 1 - Math.max(0, Math.min(0.9, transp || 0));
    return '<g' + (op < 1 ? ' opacity="' + n(op) + '"' : '') + '>' + o + '</g>';
  }

  function character(opts) {
    var t = opts.t, g = geom(t.prop, opts.body), col = colors(opts.colors);
    var pt = new Painter(opts.mode || 'class', col, opts.sil ? 'none' : olOf(t)), S = new Sh(pt);
    var ex = opts.expr || 'happy', st = opts.style || 'bob', ofit = opts.wear ? wear(S, g, t, opts.wear) : outfit(S, g, t, opts.outfit || 'casual');
    var dyeId = (opts.kit && opts.kit.dye) || opts.dye || 'd1';
    hairParts.extra = (opts.kit && opts.kit.hairx && opts.kit.hairx !== 'hx1') ? { hx2: 'ahoge', hx3: 'bow', hx4: 'clips' }[opts.kit.hairx] : null;
    hairParts.streaks = dyeId === 'd6';
    hairParts.stubble = opts.kit && opts.kit.stubble != null ? opts.kit.stubble : null;
    var hp, hairBack, hairFront;
    if (opts.noHair) { hp = { back: '', front: '', over: '', shade: '' }; hairBack = ''; hairFront = ''; }
    else if (DYE_CUT[dyeId] && pt.mode === 'class') {
      /* dyed ends: the full hair in the dye colour, then shorter copies on top (ombre adds a darker middle step) */
      var full = hairParts(S, g, st, t.hair, false), cuts = DYE_CUT[dyeId];
      hairBack = recolorHair(full.back, 'dye'); hairFront = recolorHair(full.front, 'dye');
      if (cuts.length > 1) { var mid = hairParts(S, g, st, t.hair, false, cuts[0]); hairBack += noOutline(recolorHair(mid.back, 'dye-dk')); hairFront += noOutline(recolorHair(mid.front, 'dye-dk')); }
      hp = hairParts(S, g, st, t.hair, false, cuts[cuts.length - 1]);
      hairBack += noOutline(hp.back); hairFront += noOutline(hp.front) + hp.over;
    } else {
      hp = hairParts(S, g, st, t.hair, dyeId === 'd3');
      hairBack = hp.back; hairFront = hp.front + hp.over;
    }
    if (opts.kit && opts.kit.hairFlip) { hairBack = mirror(hairBack); hairFront = mirror(hairFront); }
    var out = '', m = g.m;
    var shadeLv = t.shade, K = opts.kit && !opts.sil ? kx(opts.kit) : null;
    g.kitx = K;

    if (K) { out += capeBack(S, g, K); }
    out += hairBack;
    /* legs */
    var leg = S.rect('skin', g.lcx - g.lw / 2, g.hip - 6, g.lw, g.G - g.hip, g.lw / 2, true);
    out += leg + mirror(leg);
    out += ofit.legs + ofit.bottom;
    var sh = ofit.shoeId ? wearShoe(S, g, t, ofit.shoeId) : shoe(S, g, t, ofit.shoe);
    out += sh + mirror(sh);
    var a = arm(S, g, t, ofit.sleeve.key, ofit.sleeve.len, ofit.sleeve.puff, ofit.sleeve.cuff);
    out += a + mirror(a);
    out += ofit.top;
    if (K) { out += bodyFront(S, g, K); }
    if (ofit.back) { out += ofit.back; }
    /* side shade (D): light from the upper left */
    if (shadeLv === 'D') {
      var x1 = g.x1, y0 = g.sh, y1 = g.hip + g.hem;
      out += S.path('top-sh', 'M' + n(x1 - 2) + ' ' + n(y0 + 14) + 'Q' + n(x1 - 2) + ' ' + n(y1 - 4) + ' ' + n(x1 - 10) + ' ' + n(y1 - (ofit.shoe === 'flat' ? 30 : 2)) + 'Q' + n(x1 - 8) + ' ' + n(y0 + 30) + ' ' + n(x1 - 2) + ' ' + n(y0 + 14) + 'Z');
    }
    /* neck */
    if (g.neck) { out += S.rect('skin', 100 - 8 * g.sx, g.sh - g.neck - 6, 16 * g.sx, g.neck + 12, 5, true); }
    /* under-chin shade (C and D) */
    if (shadeLv === 'C' || shadeLv === 'D') {
      out += g.neck ? S.path('skin-sh', 'M' + n(100 - 8 * g.sx) + ' ' + n(g.hcy + g.hry - 6) + 'H' + n(100 + 8 * g.sx) + 'V' + n(g.hcy + g.hry + 4) + 'Q' + n(100) + ' ' + n(g.hcy + g.hry + 1) + ' ' + n(100 - 8 * g.sx) + ' ' + n(g.hcy + g.hry + 4) + 'Z')
        : S.ell('top-sh', 100, g.sh + 3, 26 * g.sx, 7);
    }
    /* head */
    var ear = S.circ('skin', +m.x(40), +m.y(102), g.ear, true) + (t.face === 'C' || t.face === 'D' ? S.circ('skin-dk', +m.x(41), +m.y(102), g.ear * 0.45) : '');
    out += ear + mirror(ear);
    if (t.face === 'C' || t.prop === 'D' || g.older) {
      /* a softer jaw: slightly egg-shaped head */
      var hx = g.hr, hy = g.hry, cy = g.hcy;
      out += S.path('skin', 'M' + n(100 - hx) + ' ' + n(cy) + 'C' + n(100 - hx) + ' ' + n(cy - hy * 1.34) + ' ' + n(100 + hx) + ' ' + n(cy - hy * 1.34) + ' ' + n(100 + hx) + ' ' + n(cy) +
        'C' + n(100 + hx) + ' ' + n(cy + hy * 0.62) + ' ' + n(100 + hx * 0.5) + ' ' + n(cy + hy * 1.02) + ' ' + n(100) + ' ' + n(cy + hy * 1.02) +
        'C' + n(100 - hx * 0.5) + ' ' + n(cy + hy * 1.02) + ' ' + n(100 - hx) + ' ' + n(cy + hy * 0.62) + ' ' + n(100 - hx) + ' ' + n(cy) + 'Z', true);
    } else {
      out += S.ell('skin', 100, g.hcy, g.hr, g.hry, true).replace('<ellipse', g.hr === g.hry ? '<ellipse' : '<ellipse');
    }
    if (shadeLv === 'C') { out += hp.shade; }
    if (!opts.sil) { out += '<g class="f">' + (opts.kit ? kitFace(S, g, opts.kit, ex) : face(S, g, t, ex, 'hair-dk')) + '</g>'; }
    if (ofit.face && !opts.sil) { out += ofit.face; }
    if (K) { out += headBehind(S, g, K); }
    out += hairFront;
    if (K) { out += elfEars(S, g, K.ears) + headFront(S, g, K) + earrings(S, g, K.earrings, K); }
    if (ofit.head) { out += ofit.head; }

    var sw = opts.sil ? '' : '';
    void sw;
    var cls = pt.mode === 'class' ? ' class="rc' + (pt.ol !== 'none' ? ' ol-' + pt.ol : '') + '"' : '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 ' + n(g.H) + '"' + cls + '>' + out + '</svg>';
    return { svg: svg, inner: out, w: 200, h: g.H, g: g, bytes: utf8len(svg), shapes: countShapes(svg), outfitBytes: utf8len(ofit.legs + ofit.bottom + ofit.top) + 2 * utf8len(sh) };
  }

  function utf8len(s) { var b = 0, i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); b += c < 128 ? 1 : (c < 2048 ? 2 : 3); } return b; }
  function countShapes(s) { var m = s.match(/<(path|circle|ellipse|rect|polygon|line)\b/g); return m ? m.length : 0; }

  /* ---------- pet and house items ---------- */
  function dog(opts) {
    var t = opts.t, col = colors(opts.colors), pt = new Painter(opts.mode || 'class', col, olOf(t)), S = new Sh(pt);
    var lv = t.outfit, out = '', o = true;
    var leg = S.rect('pet', 52, 92, 13, 30, 6, o) + S.rect('pet', 78, 92, 13, 30, 6, o);
    out += S.path('pet', 'M146 70Q168 50 162 34Q172 52 156 78Z', o);                               /* tail */
    out += leg + S.rect('pet', 118, 92, 13, 30, 6, o) + S.rect('pet', 140, 92, 13, 30, 6, o);
    out += S.ell('pet', 100, 82, 56, 30, o);
    if (t.shade === 'C' || t.shade === 'D') { out += S.path('pet-dk', 'M60 98Q100 116 146 96Q140 108 100 112Q66 110 60 98Z'); }
    out += S.ell('pet2', 92, 92, 26, 14);
    if (lv === 'C') { out += S.ell('pet-dk', 122, 70, 14, 10); }
    /* head */
    out += S.ell('pet-dk', 36, 50, 12, 24, o, 'rotate(18 36 50)') + S.ell('pet-dk', 84, 50, 12, 24, o, 'rotate(-18 84 50)');
    out += S.circ('pet', 60, 50, 32, o) + S.ell('pet2', 60, 64, 17, 13, o);
    out += S.ell(INK, 60, 56, 6.5, 5);
    if (t.eyes === 'A') { out += S.ell(INK, 48, 44, 4, 5.4) + S.ell(INK, 72, 44, 4, 5.4); }
    else if (t.eyes === 'B') { out += S.ell('eye', 48, 44, 5.4, 6.8) + S.ell('eye', 72, 44, 5.4, 6.8) + S.circ(PAPER, 50, 41.5, 2) + S.circ(PAPER, 74, 41.5, 2); }
    else if (t.eyes === 'C') { out += S.ell(PAPER, 48, 44, 6.4, 7.4) + S.ell(PAPER, 72, 44, 6.4, 7.4) + S.circ(INK, 48, 45, 4.4) + S.circ(INK, 72, 45, 4.4) + S.circ(PAPER, 49.8, 43, 1.7) + S.circ(PAPER, 73.8, 43, 1.7); }
    else { out += S.ell(INK, 48, 44, 6, 7.6) + S.ell(INK, 72, 44, 6, 7.6) + S.circ(PAPER, 50.4, 41, 2.4) + S.circ(PAPER, 74.4, 41, 2.4); }
    out += S.path(TONGUE, 'M56 70Q60 80 64 70Z');
    if (t.face !== 'A') { out += S.ell('#FF9AAE', 36, 58, 5, 3.4) + S.ell('#FF9AAE', 84, 58, 5, 3.4); }
    /* collar */
    out += S.rect('acc', 38, 77, 44, 7, 3.5, o) + S.circ('bot2', 60, 86, 4, o);
    var cls = pt.mode === 'class' ? ' class="rc' + (pt.ol !== 'none' ? ' ol-' + pt.ol : '') + '"' : '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 128"' + cls + '>' + out + '</svg>';
    return { svg: svg, inner: out, w: 180, h: 128, bytes: utf8len(svg), shapes: countShapes(svg) };
  }

  /* furniture: bed, fridge, lamp, shelf. Each returns inner markup in its own box. */
  function items(opts) {
    var t = opts.t, col = colors(opts.colors), pt = new Painter(opts.mode || 'class', col, olOf(t)), S = new Sh(pt);
    /* furniture detail follows the outfit detail; B (plain outfits, nicer faces) gets the small extras too */
    var lv = t.outfit !== 'A' ? t.outfit : (t.eyes === 'A' ? 'A' : 'B'), sd = t.shade, rich = lv === 'C' || lv === 'D', o = true, r = {};
    /* bed 190 x 110 */
    var b = '';
    b += S.rect('wood', 6, 20, 22, 86, 6, o) + S.rect('wood', 164, 50, 18, 56, 6, o);
    b += S.rect(PAPER, 20, 54, 154, 30, 8, o);
    b += S.rect('cloth', 58, 50, 120, 38, 10, o);
    if (rich) { b += S.rect('cloth-dk', 58, 78, 120, 6, 3) + S.rect('cloth-hi', 70, 58, 30, 4, 2) + S.rect('cloth-hi', 108, 58, 52, 4, 2); }
    b += S.rect(PAPER, 28, 40, 40, 20, 10, o);
    if (lv !== 'A') { b += S.rect('acc', 38, 46, 20, 4, 2); }
    b += S.rect('wood', 18, 82, 158, 14, 5, o);
    if (sd === 'C' || sd === 'D') { b += S.rect('wood-dk', 18, 90, 158, 6, 3) + S.rect('wood-dk', 6, 92, 22, 8, 0); }
    if (lv === 'C') { b += S.circ('wood-hi', 17, 30, 4) + S.circ('wood-hi', 173, 60, 3.4); }
    r.bed = { w: 190, h: 110, s: b };
    /* fridge 70 x 140 */
    var f = '';
    f += S.rect('#E9F4FF', 6, 4, 58, 132, 10, o);
    f += S.rect(lv === 'A' ? '#D6E9FB' : '#C7DDF4', 6, 48, 58, 3, 0);
    f += S.rect('#9DB4CF', 52, 18, 5, 20, 2.5, lv !== 'A') + S.rect('#9DB4CF', 52, 60, 5, 28, 2.5, lv !== 'A');
    if (rich) { f += S.rect('#FFFFFF', 12, 10, 6, 30, 3) + S.rect('#FFFFFF', 12, 58, 6, 60, 3); }
    if (lv !== 'A') { f += S.circ('acc', 26, 68, 5) + S.rect('bot2', 30, 80, 12, 9, 2, false, 'rotate(-8 36 84)') + S.rect('#7FB7F0', 14, 96, 12, 12, 2); }
    if (sd === 'C' || sd === 'D') { f += S.rect('#C7DDF4', 52, 50, 12, 82, 0) + S.rect('#B5CDE8', 6, 128, 58, 8, 4); }
    f += S.rect('#9DB4CF', 12, 134, 8, 6, 2) + S.rect('#9DB4CF', 50, 134, 8, 6, 2);
    r.fridge = { w: 70, h: 140, s: f };
    /* lamp 60 x 140 */
    var l = '';
    l += S.ell('wood', 30, 132, 22, 7, o) + S.rect('wood', 27, 44, 6, 88, 3, o);
    l += S.path('#FFE8A3', 'M12 46L18 10H42L48 46Z', o);
    if (rich) { l += S.path('#FFF3C9', 'M18 40L22 14H28L25 40Z') + S.rect('#F5CF6A', 11, 42, 38, 5, 2.5); }
    if (lv !== 'A') { l += S.circ('acc', 42, 58, 3) + S.rect('acc', 41, 46, 2, 12, 1); }
    r.lamp = { w: 60, h: 140, s: l };
    /* bookshelf 90 x 140 */
    var k = '', i, bc = ['#E5484D', '#3D8BFD', '#FFD23F', '#46A758', '#F76CA8', '#8E4EC6'];
    k += S.rect('wood', 4, 4, 82, 132, 6, o);
    k += S.rect('wood-dk', 10, 10, 70, 120, 3);
    k += S.rect('wood', 8, 48, 74, 6, 2) + S.rect('wood', 8, 90, 74, 6, 2);
    var shelves = [48, 90, 128];
    shelves.forEach(function (y, si) {
      var x = 13;
      for (i = 0; i < (lv === 'A' ? 4 : 5); i++) {
        var w = lv === 'A' ? 13 : 10 + ((i + si) % 3) * 2, h = 26 + ((i * 7 + si * 3) % 9);
        if (si === 1 && i === 3 && lv !== 'A') { k += S.rect(bc[(i + si) % 6], x + 4, y - h + 2, w, h - 2, 1.5, rich, 'rotate(14 ' + (x + 4) + ' ' + y + ')'); x += w + 8; continue; }
        k += S.rect(bc[(i + si) % 6], x, y - h, w, h, 1.5, rich);
        if (lv !== 'A') { k += S.rect(PAPER, x + 2, y - h + 5, w - 4, 2.4, 1); }
        x += w + 2;
      }
    });
    if (sd === 'C' || sd === 'D') { k += S.rect('wood-dk', 4, 128, 82, 8, 4); }
    r.shelf = { w: 90, h: 140, s: k };
    r.cls = pt.mode === 'class' ? 'rc' + (pt.ol !== 'none' ? ' ol-' + pt.ol : '') : '';
    return r;
  }

  /* room wall + floor + window, 400 x 250 */
  function room(opts) {
    var t = opts.t, col = colors(opts.colors), pt = new Painter(opts.mode || 'class', col, 'none'), S = new Sh(pt);
    var lv = t.outfit !== 'A' ? t.outfit : (t.eyes === 'A' ? 'A' : 'B'), out = '';
    out += S.rect('wall', 0, 0, 400, 180, 0);
    if (lv !== 'A') { var i; for (i = 0; i < 9; i++) { out += S.rect('wall-dk', 20 + i * 46, 0, 3, 180, 0).replace('<rect ', '<rect opacity=".18" '); } }
    out += S.rect('wood', 0, 176, 400, 74, 0);
    if (lv !== 'A') { for (i = 0; i < 4; i++) { out += S.rect('wood-dk', 0, 192 + i * 16, 400, 2, 0); } }
    out += S.rect(PAPER, 0, 172, 400, 8, 0);
    /* window */
    out += S.rect('wood', 150, 26, 96, 74, 6) + S.rect('#BFE6FF', 157, 33, 82, 60, 3) + S.rect('wood', 195, 33, 6, 60, 0) + S.rect('wood', 157, 60, 82, 5, 0);
    out += S.circ(PAPER, 176, 48, 7) + S.circ(PAPER, 186, 46, 9) + S.circ(PAPER, 196, 49, 6);
    if (lv === 'C' || lv === 'D') { out += S.rect('wood-dk', 146, 98, 104, 6, 3); }
    /* rug */
    out += S.ell('acc', 205, 226, 92, 14) + S.ell('acc-hi', 205, 226, 74, 9);
    return out;
  }

  return {
    character: character, KIT: KIT, KIT_DEFAULT: KIT_DEFAULT, KIT_EXTRA: KIT_EXTRA, KIT_COSTUME: KIT_COSTUME, IRIS_EYES: IRIS_EYES, PUPIL_EYES: PUPIL_EYES, kitPart: kitPart, dog: dog, items: items, room: room, vars: vars, colors: colors, geom: geom,
    preset: preset, TRAITS: TRAITS, TRAIT_NAMES: TRAIT_NAMES, EXPR: EXPR, EXPR_LABEL: EXPR_LABEL,
    WEAR: WEAR, WEAR_LABEL: WEAR_LABEL, STYLES: STYLES, STYLE_IDS: STYLE_IDS, STYLE_FREE2: STYLE_FREE2, STYLE_UNLOCK: STYLE_UNLOCK, STYLE_ANIME: STYLE_ANIME, OUTFITS: OUTFITS, OUTFIT_LABEL: OUTFIT_LABEL, KEYS: KEYS, DEFAULT: DEFAULT,
    RAINBOW: RAINBOW, dk: dk, hi: hi, sh: sh, tint: tint, n: n, utf8len: utf8len, countShapes: countShapes, olOf: olOf, INK: INK,
    PAPER: PAPER, CHEEK: CHEEK, MOUTH: MOUTH, TONGUE: TONGUE, Painter: Painter, Sh: Sh, mirror: mirror
  };
})();
if (typeof module !== 'undefined') { module.exports = LAB; }
