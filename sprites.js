/*
 * SPR: the 2D sprite engine (cl-v49). Every pet and every person is drawn from flat vector shapes on a small rig
 * that can turn to face any direction, with dark outlines and big glossy eyes. ES5, no dependencies.
 *
 * A sprite is a handful of soft solids (head, body, legs, tail, ears...) placed in the creature's own space
 * (f forward, s sideways, u up), turned by the yaw (0 faces the viewer, 90 faces right, 180 faces away, 270 left),
 * squashed by the camera tilt and painted back to front. Each solid ("item") is painted twice: first its
 * silhouette in ink, a little fat, then its colours on top: that is the outline. Faces sit on the head and slide
 * round it as it turns.
 */
(function () {
  'use strict';
  var CX = 100, GY = 186, K = 0.36, UID = 0, INK = '#2e2238';
  function f1(n) { return Math.round(n * 10) / 10; }
  function hex(n) { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length < 2 ? '0' + s : s; }
  function rgb(h) { h = String(h).slice(1); if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return '#' + hex(A[0] + (B[0] - A[0]) * t) + hex(A[1] + (B[1] - A[1]) * t) + hex(A[2] + (B[2] - A[2]) * t); }
  function dk(h, t) { return mix(h, '#2a1a3a', t == null ? 0.22 : t); }   /* shade leans to plum, not black: keeps colours clean */
  function lt(h, t) { return mix(h, '#ffffff', t == null ? 0.3 : t); }
  function lum(h) { var c = rgb(h); return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255; }

  function view(yaw) { var a = (yaw || 0) * Math.PI / 180; return { s: Math.sin(a), c: Math.cos(a), yaw: (((yaw || 0) % 360) + 360) % 360 }; }
  /* creature space -> screen. d is depth toward the viewer (bigger = nearer = painted later and a little lower). */
  function P(v, f, s, u) { var d = f * v.c - s * v.s; return { x: CX + f * v.s + s * v.c, y: GY - u + d * K, d: d }; }

  function ell(x, y, rx, ry, fill, extra) { return '<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + f1(Math.max(0.1, rx)) + '" ry="' + f1(Math.max(0.1, ry)) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function line(d, col, w, extra) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + f1(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>'; }
  /* a path from numbers and letters: D('M', x, y, 'Q', ...) */
  function D() { var s = '', i, a; for (i = 0; i < arguments.length; i++) { a = arguments[i]; s += typeof a === 'number' ? f1(a) + ' ' : a; } return s; }
  /* the lower crescent of an ellipse: the one shade tone */
  function crescent(x, y, rx, ry, k, fill, op) {
    return path('M' + f1(x - rx) + ' ' + f1(y) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 0 0 ' + f1(x + rx) + ' ' + f1(y) + 'A' + f1(rx) + ' ' + f1(ry * k) + ' 0 0 1 ' + f1(x - rx) + ' ' + f1(y) + 'Z', fill, ' opacity="' + (op || 0.5) + '"');
  }
  /* a solid (rf long, rs wide, ru tall) seen from the view: its flat silhouette */
  function blob(v, c, r) {
    var rx = Math.sqrt(r[0] * v.s * r[0] * v.s + r[1] * v.c * r[1] * v.c), rd = Math.sqrt(r[0] * v.c * r[0] * v.c + r[1] * v.s * r[1] * v.s);
    var p = P(v, c[0], c[1], c[2]);
    return { x: p.x, y: p.y, d: p.d, rx: rx, ry: Math.sqrt(r[2] * r[2] + K * rd * K * rd) };
  }
  /* a point on a ball's surface at angle a (round it) and p (up it); n says how much it faces the viewer */
  function onBall(v, c, r, a, p, out) {
    var A = a * Math.PI / 180, B = p * Math.PI / 180, cb = Math.cos(B), k = out || 1;
    var f = Math.cos(A) * cb, s = Math.sin(A) * cb, u = Math.sin(B);
    var q = P(v, c[0] + r * k * f, c[1] + r * k * s, c[2] + r * k * u);
    q.n = f * v.c - s * v.s;                       /* facing: 1 straight at the viewer, 0 on the rim, <0 hidden */
    q.w = Math.max(0.28, Math.abs(Math.cos(A + Math.atan2(v.s, v.c))));   /* how wide a flat feature there looks */
    return q;
  }

  /* ---- an item: one solid. Shapes added with e/p/r/l belong to its silhouette; x adds details that do not.
     The whole sprite gets ONE ink outline round the outside (every silhouette painted fat, in ink, underneath). Inside,
     a part that overlaps another is set off by a thin line in a darker tone of its own colour, never in ink. ---- */
  var TONE = 0.42;                    /* inner lines: this fraction of the outline's width */
  function Item(d, ow, bb) { this.d = d; this.sil = ''; this.til = ''; this.s = ''; this.ow = ow; this.bb = bb; this.tone = ''; }
  Item.prototype.mark = function (x, y, r) {
    var b = this.bb; if (!b) return; r = r || 0;
    if (x - r < b.x0) b.x0 = x - r; if (x + r > b.x1) b.x1 = x + r; if (y - r < b.y0) b.y0 = y - r; if (y + r > b.y1) b.y1 = y + r;
  };
  Item.prototype.geo = function (g, fill) { this.sil += g + '/>'; this.til += g + '/>'; this.s += g + ' fill="' + fill + '"/>'; if (!this.tone && fill.charAt(0) === '#') this.tone = fill; return this; };
  Item.prototype.e = function (x, y, rx, ry, fill, tr) {
    if (!this.loc) { this.mark(x, y - ry); this.mark(x - rx, y); this.mark(x + rx, y + ry); }
    return this.geo('<ellipse cx="' + f1(x) + '" cy="' + f1(y) + '" rx="' + f1(Math.max(0.1, rx)) + '" ry="' + f1(Math.max(0.1, ry)) + '"' + (tr ? ' transform="' + tr + '"' : ''), fill);
  };
  /* a rounded rectangle, centred on x, y */
  Item.prototype.r = function (x, y, w, h, r, fill) {
    if (!this.loc) { this.mark(x - w / 2, y - h / 2); this.mark(x + w / 2, y + h / 2); }
    return this.geo('<rect x="' + f1(x - w / 2) + '" y="' + f1(y - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="' + f1(Math.min(r, w / 2, h / 2)) + '"', fill);
  };
  Item.prototype.p = function (d, fill) { return this.geo('<path d="' + d + '"', fill); };
  /* a stroked line (a leg, a stalk): w wide in col */
  Item.prototype.l = function (d, w, col) {
    this.sil += '<path d="' + d + '" fill="none" stroke-width="' + f1(w + this.ow * 2) + '"/>';
    this.til += '<path d="' + d + '" fill="none" stroke-width="' + f1(w + this.ow * 2 * TONE) + '"/>';
    this.s += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + f1(w) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    if (!this.tone && col.charAt(0) === '#') this.tone = col;
    return this;
  };
  /* part of the outline only (a muzzle that pokes past the head) */
  Item.prototype.o = function (g) { this.sil += g; return this; };
  Item.prototype.x = function (svg) { this.s += svg; return this; };
  Item.prototype.g = function (tr) { var o = '<g transform="' + tr + '">'; this.sil += o; this.til += o; this.s += o; this.loc = (this.loc || 0) + 1; return this; };
  Item.prototype.end = function () { this.sil += '</g>'; this.til += '</g>'; this.s += '</g>'; this.loc--; return this; };
  function paint(items) {
    var ow = items.length ? items[0].ow : 0, ink = '', s = '', i, I, t;
    for (i = 0; i < items.length; i++) items[i].n = i;
    items.sort(function (a, b) { return a.d - b.d || a.n - b.n; });
    for (i = 0; i < items.length; i++) {
      I = items[i]; ink += I.sil;
      if (ow && I.til && I.tone && !I.flat) { t = dk(I.tone, 0.36); s += '<g fill="' + t + '" stroke="' + t + '" stroke-width="' + f1(ow * 2 * TONE) + '" stroke-linejoin="round" stroke-linecap="round">' + I.til + '</g>'; }
      s += I.s;
    }
    return (ow && ink ? '<g fill="' + INK + '" stroke="' + INK + '" stroke-width="' + f1(ow * 2) + '" stroke-linejoin="round" stroke-linecap="round">' + ink + '</g>' : '') + s;
  }

  window.SPR = { CX: CX, GY: GY, K: K, INK: INK, f1: f1, mix: mix, dk: dk, lt: lt, lum: lum, view: view, P: P, ell: ell, path: path, line: line, D: D, crescent: crescent, blob: blob, onBall: onBall, Item: Item, paint: paint, uid: function () { return 'sp' + (++UID); } };
})();
/*
 * SPR.creature(B, opts): draws one creature from a build B (see build.js) with the SPR rig. ES5.
 * opts: yaw, t (seconds: idle motion), walk (0..1), phase (0..1 through the walk cycle), mood, flags {tired, pudgy, thin,
 *       dirty}, blink, acc (worn accessory), k (overall scale), ow (outline width in picture units), noStink, bb (an
 *       object that collects the bounding box). Returns { svg, head: {x, y, r}, mouth: {x, y} } in picture units.
 */
(function () {
  'use strict';
  var S = window.SPR, f1 = S.f1, P = S.P, ell = S.ell, path = S.path, line = S.line, D = S.D, dk = S.dk, lt = S.lt, mix = S.mix, INK = S.INK;
  var TAU = Math.PI * 2, RAD = Math.PI / 180, CX = S.CX, GY = S.GY, K = S.K;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function star(cx, cy, R, r) { var p = [], i, a, q; for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; q = i % 2 ? r : R; p.push(f1(cx + Math.cos(a) * q) + ' ' + f1(cy + Math.sin(a) * q)); } return 'M' + p.join('L') + 'Z'; }
  function flameD(x, y, r, fk, lean) {
    return D('M', x - r * 0.62, y, 'C', x - r * 0.8, y - r * 0.8, x - r * 0.15 + lean, y - r * 0.9, x + lean, y - r * 1.75 * fk, 'C', x + r * 0.35 + lean, y - r * 0.95, x + r * 0.85, y - r * 0.7, x + r * 0.62, y, 'Q', x, y + r * 0.55, x - r * 0.62, y, 'Z');
  }
  var FIRE = ['#ff7a2f', '#ffc247', '#fff3c4'];

  function creature(B, o) {
    o = o || {};
    var c = B.c, v = S.view(o.yaw || 0), t = o.t || 0, wk = o.walk || 0, mood = o.mood || 'ok', fl = o.flags || {};
    var asleep = mood === 'asleep', lying = (asleep || mood === 'lazy') && !B.noLie, eat = mood === 'eat', happy = mood === 'happy', calm = mood === 'ok' || happy;
    var grump = mood === 'hungry' || mood === 'grubby' || ((fl.pudgy || fl.thin || fl.dirty) && calm);
    var half = !asleep && !eat && (mood === 'sleepy' || mood === 'lazy' || fl.tired), shut = asleep || !!o.blink;
    var droop = (grump || half || asleep) ? 1 : 0;
    var plan = B.plan || 'quad', sc = B.sc || 1, KG = o.k || 1, OW = (o.ow == null ? 3.4 : o.ow) / (sc * KG);
    var id = S.uid(), items = [], BB = o.bb || null;
    function it(d) { var i = new S.Item(d, OW, BB); items.push(i); return i; }
    var darkFur = S.lum(c.body) < 0.36;

    /* ---- motion and proportions ---- */
    var ph = (o.phase != null ? o.phase : t * (B.pace || 2)) * TAU, sw = Math.sin(ph), breathe = Math.sin(t * 2.1) * (asleep ? 1.1 : 0.5);
    var bob = wk * Math.abs(Math.sin(ph)) * 1.6;
    var bwK = fl.pudgy ? 1.24 : fl.thin ? 0.8 : 1, bhK = fl.pudgy ? 1.06 : fl.thin ? 0.95 : 1;
    var bl = B.bl || 0, bw = (B.bw || 0) * bwK, bh = (B.bh || 0) * bhK + breathe * 0.35, lw = B.lw || 5, leg = (B.leg || 0) * (lying ? 0.15 : 1);
    var bodyU = leg + bh * (B.bodyK || 0.82) + bob, hr = B.hr, bodyCol = c.bodyc || dk(c.body, 0.09);
    var wag = Math.sin(t * (happy ? 9 : 3.2)) * (happy ? 0.5 : 0.22) * (asleep ? 0 : 1) + (o.wag || 0);
    var flap = o.flap == null ? Math.sin(t * 9) : o.flap;      /* wings: -1 down .. 1 up */

    /* ---- legs ---- */
    if (plan === 'quad' && (B.nlegs == null || B.nlegs === 4)) {
      var LF = bl * 0.56, LS = bw * 0.64, A = Math.min(bl * 0.5, 13) * wk;
      [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].forEach(function (L) {
        var swing = A * sw * L[2], lift = wk * Math.max(0, Math.cos(ph) * L[2]) * B.leg * 0.3;
        var hip = P(v, LF * L[0], LS * L[1], leg + bh * 0.3), foot = P(v, LF * L[0] + swing + (lying ? L[0] * bl * 0.3 : 0), LS * L[1] * (lying ? 1.25 : 1), lift);
        var far = (-L[1] * v.s) + (L[0] * v.c) * 0.35 < -0.2, I = it(foot.d - 0.2), pw = far ? dk(c.paw, 0.14) : c.paw;
        I.l(D('M', hip.x, hip.y, 'L', foot.x, foot.y - lw * 0.6), lw * 1.7, far ? dk(c.leg, 0.16) : c.leg);
        I.e(foot.x, foot.y - lw * 0.6, lw * 1.2, lw * 0.82, pw);
        if (v.c > 0.3 && !far && L[0] > 0) I.x(line(D('M', foot.x - lw * 0.38, foot.y - lw * 0.2, 'l', 0, -lw * 0.5, 'M', foot.x + lw * 0.38, foot.y - lw * 0.2, 'l', 0, -lw * 0.5), dk(pw, 0.3), 1.2, ' opacity=".7"'));
      });
    } else if (B.nlegs === 6) {
      [-1, 1].forEach(function (sd) { [0.62, 0, -0.62].forEach(function (k, i) {
        var g2 = ((i + (sd > 0 ? 0 : 1)) % 2) ? 1 : -1, swing = bl * 0.3 * wk * sw * g2, lift = wk * Math.max(0, Math.cos(ph) * g2) * 3;
        var hip = P(v, bl * k * 0.7, sd * bw * 0.7, leg + bh * 0.4), knee = P(v, bl * k * 0.95 + swing * 0.5, sd * (bw + 6), leg + bh * 0.62 + lift), foot = P(v, bl * k * 1.1 + swing, sd * (bw + 10), lift);
        it(foot.d - 0.3).x(line(D('M', hip.x, hip.y, 'L', knee.x, knee.y, 'L', foot.x, foot.y), c.legInk || INK, lw));
      }); });
    } else if (B.nlegs === 2) {
      [-1, 1].forEach(function (sd) {
        var swing = Math.min(bl * 0.6, 9) * wk * sw * sd, lift = wk * Math.max(0, Math.cos(ph) * sd) * B.leg * 0.4, ls = bw * (B.legS || 0.42);
        var hip = P(v, 0, sd * ls, leg + bh * 0.3), foot = P(v, swing, sd * ls, lift), toe = P(v, swing + lw * 2.4, sd * ls, lift), I = it(foot.d - 0.2);
        I.l(D('M', hip.x, hip.y, 'L', foot.x, foot.y - 1.5), lw, c.foot);
        I.e((foot.x + toe.x) / 2, (foot.y + toe.y) / 2 - lw * 0.5, Math.abs(toe.x - foot.x) / 2 + lw * 0.9, lw * 0.8, c.foot);
      });
    }

    /* ---- a ring round the body at f0: only the part that faces the viewer. For stripes, bands and shell lines. ---- */
    function ring(f0, col, w, a0, a1, grow) {
      var pts = [], i, n = 14, k = Math.sqrt(Math.max(0, 1 - (f0 / bl) * (f0 / bl))) * (grow || 1);
      for (i = 0; i <= n; i++) {
        var a = (a0 + (a1 - a0) * i / n) * RAD, cs = Math.cos(a), sn = Math.sin(a);
        if ((f0 / bl) * v.c - k * cs * v.s + k * sn * 0.35 < -0.1) { if (pts.length > 1) break; pts = []; continue; }
        var q = P(v, (B.bf || 0) + f0, bw * k * cs, bodyU + bh * k * sn); pts.push(f1(q.x) + ' ' + f1(q.y));
      }
      return pts.length > 1 ? line('M' + pts.join('L'), col, w) : '';
    }
    /* a spot on the body: along (-1..1), round (degrees from the top, + is the creature's left), size */
    function spot(m, col, op) {
      var a = m[1] * RAD, q = P(v, (B.bf || 0) + bl * m[0], bw * 0.92 * Math.sin(a), bodyU + bh * 0.8 * Math.cos(a));
      if (Math.sin(a) * -v.s * 0.9 + 0.55 + m[0] * v.c * 0.4 < 0.1) return '';
      return ell(q.x, q.y, m[2] * (0.6 + 0.4 * Math.abs(v.s)), m[2] * 0.8, col, op ? ' opacity="' + op + '"' : '');
    }

    /* ---- body ---- */
    var Bq = null;
    if (plan !== 'blob' && plan !== 'obj') {
      Bq = S.blob(v, [B.bf || 0, 0, bodyU], [bl, bw, bh]);
      var BI = it(Bq.d), bs = '';
      if (B.shell) {                      /* a snail's house rides on its back: part of the body's outline */
        var sh = B.shell, sq = P(v, -bl * 0.18, 0, bodyU + bh * 0.3 + sh.r * 0.8);
        BI.e(sq.x, sq.y, sh.r * (0.72 + 0.28 * Math.abs(v.s)), sh.r, sh.col);
        var sx = Math.max(0.3, Math.abs(v.s)) * (v.s < 0 ? -1 : 1), sr = sh.r;
        BI.x('<g transform="translate(' + f1(sq.x) + ' ' + f1(sq.y) + ') scale(' + f1(sx) + ' 1)">' + line(D('M', sr * 0.05, sr * 0.05, 'a', sr * 0.16, sr * 0.16, 0, 1, 1, sr * 0.22, sr * 0.1, 'a', sr * 0.42, sr * 0.42, 0, 1, 1, -sr * 0.62, -sr * 0.3, 'a', sr * 0.72, sr * 0.72, 0, 0, 1, sr * 1.0, -sr * 0.42), sh.line, 2.6) +
          ell(-sr * 0.4, -sr * 0.5, sr * 0.2, sr * 0.11, '#fff', ' opacity=".4" transform="rotate(-30 ' + f1(-sr * 0.4) + ' ' + f1(-sr * 0.5) + ')"') + '</g>');
      }
      BI.e(Bq.x, Bq.y, Bq.rx, Bq.ry, bodyCol);
      bs = '<clipPath id="' + id + 'b"><ellipse cx="' + f1(Bq.x) + '" cy="' + f1(Bq.y) + '" rx="' + f1(Bq.rx) + '" ry="' + f1(Bq.ry) + '"/></clipPath><g clip-path="url(#' + id + 'b)">';
      if (c.belly && B.belly !== 0 && v.c > -0.25) {
        var chest = P(v, (B.bf || 0) + bl * 0.7, 0, bodyU - bh * 0.25), bk = B.bellyK || 1;
        bs += ell(chest.x, chest.y + Bq.ry * 0.25 * (2 - bk), Bq.rx * (0.45 + 0.4 * Math.abs(v.c)) * bk, Bq.ry * 0.78 * bk, c.belly);
      }
      var PT = B.pattern || {};
      if (PT.type === 'spots') (PT.list || []).forEach(function (m) { bs += spot(m, PT.col || c.dark, 0.9); });
      else if (PT.type === 'stripes') [-0.55, -0.12, 0.32].forEach(function (k) { bs += ring(bl * k, PT.col || c.dark, PT.w || 3.4, 28, 152); });
      else if (PT.type === 'bee') [-0.5, 0.05].forEach(function (k) { bs += ring(bl * k, PT.col || INK, PT.w || 6.5, -30, 210); });
      else if (PT.type === 'segments') [-0.6, -0.25, 0.1, 0.45].forEach(function (k) { bs += ring(bl * k, PT.col || c.dark, 2.2, -10, 190); });
      else if (PT.type === 'shell') {              /* ladybirds and beetles: a seam down the back, spots or a shine */
        var pts = [], i2, q2; for (i2 = 0; i2 <= 8; i2++) { var kk = -0.98 + 1.96 * i2 / 8; q2 = P(v, bl * kk, 0, bodyU + bh * Math.sqrt(Math.max(0, 1 - kk * kk))); pts.push(f1(q2.x) + ' ' + f1(q2.y)); }
        bs += line('M' + pts.join('L'), PT.line || INK, 2.2);
        (PT.list || []).forEach(function (m) { bs += spot(m, PT.col || INK); });
        if (PT.shine) { var hq = P(v, bl * 0.25, bw * 0.45 * (v.s > 0 ? -1 : 1), bodyU + bh * 0.72); bs += ell(hq.x, hq.y, bl * 0.2, bh * 0.1, '#fff', ' opacity=".4"'); }
      } else if (PT.type === 'chevrons' && v.c > 0.1) { for (var cv = 0; cv < 3; cv++) [-1, 1].forEach(function (d) { var q = P(v, bl * 0.95, d * bw * 0.26, bodyU - bh * (0.1 + cv * 0.24)); bs += line(D('M', q.x - 3.4 * v.c, q.y - 2, 'L', q.x, q.y + 2, 'L', q.x + 3.4 * v.c, q.y - 2), PT.col || c.dark, 1.8, ' opacity=".6"'); });
      } else if (PT.type === 'scales' && v.c > 0.1) { for (var sv = 0; sv < 3; sv++) { var q3 = P(v, bl * 0.95, 0, bodyU - bh * (0.05 + sv * 0.26)); bs += line(D('M', q3.x - bw * 0.36 * v.c, q3.y, 'Q', q3.x, q3.y + 4.5, q3.x + bw * 0.36 * v.c, q3.y), PT.col || c.dark, 1.8, ' opacity=".5"'); } }
      if (fl.dirty) [[0.5, 60, 5.5], [-0.35, -50, 6.5], [-0.1, 20, 4.5]].forEach(function (m) {
        var q = P(v, bl * m[0], bw * Math.sin(m[1] * RAD), bodyU + bh * 0.3);
        bs += ell(q.x, q.y, m[2] * 1.25, m[2], '#7b5236') + ell(q.x + m[2] * 0.9, q.y - m[2] * 0.7, m[2] * 0.4, m[2] * 0.35, '#7b5236');
      });
      if (fl.thin && Math.abs(v.s) > 0.3) for (var rb = 0; rb < 3; rb++) bs += ring(bl * (-0.3 + rb * 0.3), dk(c.body, 0.35), 1.6, 40, 140);
      bs += S.crescent(Bq.x, Bq.y, Bq.rx, Bq.ry, 0.6, dk(c.body, 0.32), 0.5) + '</g>';
      BI.x(bs);
      if (B.ridge) {                      /* a row of leaves or spikes down the back */
        var RI = it(Bq.d + 0.05), rn = B.ridge.n || 4;
        for (var ri = 0; ri < rn; ri++) {
          var rk = 0.55 - 1.25 * ri / Math.max(1, rn - 1), rq = P(v, bl * rk, 0, bodyU + bh * Math.sqrt(Math.max(0, 1 - rk * rk)) * 0.96), rh = B.ridge.h * (1 - 0.12 * ri), rw = B.ridge.w * (0.45 + 0.55 * Math.abs(v.s));
          RI.p(D('M', rq.x - rw, rq.y + 1.5, 'Q', rq.x - rw * 0.8 - v.s * rh * 0.3, rq.y - rh * 0.7, rq.x - v.s * rh * 0.45, rq.y - rh, 'Q', rq.x + rw * 0.9, rq.y - rh * 0.5, rq.x + rw, rq.y + 1.5, 'Z'), ri % 2 ? dk(B.ridge.col, 0.14) : B.ridge.col);
        }
      }
    }

    /* ---- chains of balls: tails, abdomens, manes ---- */
    function chain(base, T, fan, I) {
      var n = T.n || Math.max(3, Math.min(13, Math.round(T.len / Math.max(2.2, T.r * 0.62)))), up = (T.up == null ? 55 : T.up) * (grump && !T.stiff ? 0.45 : 1) * RAD;
      var f = base[0], s = base[1], u = base[2], ds = T.len / n, last = null, cf = Math.cos(fan || 0), sf = Math.sin(fan || 0);
      for (var i = 0; i <= n; i++) {
        var k = i / n, a = up + (T.curl || 0) * k, r;
        if (i > 0) { f -= ds * Math.cos(a) * (lying && !T.stiff ? -0.5 : 1); u += ds * Math.sin(a) * cf * (lying && !T.stiff ? 0.25 : 1); s += ds * (Math.sin(a) * sf + (lying && !T.stiff ? 0.85 : 0)); }
        switch (T.shape) {
          case 'bushy': r = T.r * (0.55 + 1.1 * Math.sin(Math.PI * Math.min(1, k * 0.9 + 0.12))); break;
          case 'ball': r = T.r; break;
          case 'taper': r = T.r * (1 - 0.72 * k); break;
          case 'paddle': r = T.r * (0.6 + 0.9 * Math.sin(Math.PI * Math.min(1, k * 0.8 + 0.1))); break;
          case 'bulb': r = T.r * (0.5 + 0.7 * Math.sin(Math.PI * Math.min(1, k * 0.85 + 0.15))); break;
          default: r = T.r * (1 - 0.3 * k);
        }
        var q = P(v, f, s + (T.stiff ? 0 : wag * T.len * k * 1.1), u), tip = T.tip && k >= (T.tipAt == null ? 0.72 : T.tipAt);
        var col = tip ? T.tip : (T.band && i % 2 ? T.band : (T.col || bodyCol));
        I.e(q.x, q.y, r, r * (T.flat || 0.94), col);
        if (T.rings && i > 0 && i < n && i % 2 === 0) I.x(ell(q.x, q.y, r * 0.5, r * 0.94, T.rings, ' opacity=".8"'));
        last = { q: q, r: r };
      }
      return last;
    }
    function tailAt(T, I, fan) {
      var base = [(B.bf || 0) - bl * (T.at == null ? 0.86 : T.at), 0, bodyU + bh * (T.atU == null ? 0.15 : T.atU)], e;
      if (T.type === 'glow') { var gq = P(v, base[0] - T.r * 0.4, 0, base[2]); I.x(ell(gq.x, gq.y, T.r * 2.1, T.r * 1.9, T.col, ' opacity="' + f1(0.28 + 0.12 * Math.sin(t * 3)) + '"')); }
      e = chain(base, T, fan, I);
      if (!e) return;
      var q = e.q, r = e.r, back = -v.s;                 /* which way "behind the creature" points on screen */
      if (T.flame) I.p(flameD(q.x, q.y - r * 0.4, r * 1.5, 1 + Math.sin(t * 9) * 0.08, Math.sin(t * 5) * r * 0.27), T.flame[0]).x(path(flameD(q.x, q.y - r * 0.4, r * 0.93, 1, 0), T.flame[1]) + path(flameD(q.x, q.y - r * 0.4, r * 0.45, 1, 0), T.flame[2] || '#fff7d6'));
      if (T.tuft) I.e(q.x, q.y - T.tuft * 0.3, T.tuft * 0.85, T.tuft, T.tuftCol || c.dark);
      if (T.arrow) I.p(D('M', q.x - T.arrow * 0.8, q.y + T.arrow * 0.35, 'L', q.x + back * T.arrow * 0.35, q.y - T.arrow * 1.25, 'L', q.x + T.arrow * 0.8, q.y + T.arrow * 0.35, 'Q', q.x, q.y + T.arrow * 0.9, q.x - T.arrow * 0.8, q.y + T.arrow * 0.35, 'Z'), T.arrowCol || c.accent);
      if (T.sting) I.p(D('M', q.x - r * 0.5, q.y - r * 0.35, 'L', q.x + back * T.sting + (back === 0 ? 0 : 0), q.y + (Math.abs(back) < 0.3 ? -T.sting * 0.2 : 0), 'L', q.x + r * 0.5, q.y + r * 0.35, 'Z'), INK);
      if (T.snake) {                                     /* the chimera's tail is a snake with opinions */
        I.e(q.x, q.y - r * 0.2, r * 1.9, r * 1.55, T.col);
        var sdx = Math.abs(v.s) > 0.3 ? back * -1 : 1;
        I.x(ell(q.x + sdx * r * 0.7, q.y - r * 0.7, 1.7, 1.9, INK) + (Math.abs(v.s) > 0.3 ? '' : ell(q.x - r * 0.7, q.y - r * 0.7, 1.7, 1.9, INK)) + line(D('M', q.x + sdx * r * 1.7, q.y, 'l', sdx * 5, -1.5, 'm', -sdx * 5, 1.5, 'l', sdx * 5, 2), '#e0455a', 1.5));
      }
      if (T.fanTip) { I.mark(q.x + back * T.fanTip, q.y, T.fanTip * 0.5); [-1, 0, 1].forEach(function (d) { I.p(D('M', q.x, q.y, 'Q', q.x + back * T.fanTip * 0.6 + d * T.fanTip * 0.2, q.y - T.fanTip * 0.6 + d * d * 2, q.x + back * T.fanTip + d * T.fanTip * 0.42 * (0.3 + 0.7 * Math.abs(v.c)), q.y - T.fanTip * 0.25 + Math.abs(d) * 3, 'Q', q.x + back * T.fanTip * 0.5 + d * T.fanTip * 0.3, q.y + T.fanTip * 0.25, q.x, q.y, 'Z'), d ? T.tip || c.accent : lt(T.tip || c.accent, 0.25)); }); }
    }
    (B.tails || []).forEach(function (T) {
      var n = T.count || 1, base = P(v, (B.bf || 0) - bl * 0.86 - T.len * 0.4, 0, bodyU + bh * 0.3);
      for (var i = 0; i < n; i++) { var fan = n === 1 ? 0 : (-1 + 2 * i / (n - 1)) * (T.spread || 50) * RAD, I = it(base.d - 0.1 - Math.abs(fan) * 0.02 + (T.dz || 0)); tailAt(T, I, fan); }
    });

    /* ---- wings: flat shapes in their own plane (root, span and chord vectors), so they turn with the creature ---- */
    function wing(Wg, sd) {
      var th = ((Wg.rest == null ? 38 : Wg.rest) + flap * (Wg.swing == null ? 22 : Wg.swing)) * RAD, sp = Wg.span, sweep = Wg.sweep == null ? 0.42 : Wg.sweep;
      var R = [(B.bf || 0) + bl * (Wg.at == null ? 0.1 : Wg.at), sd * bw * (Wg.atS == null ? 0.55 : Wg.atS), bodyU + bh * (Wg.atU == null ? 0.55 : Wg.atU)];
      var d1 = [-sweep, sd * Math.cos(th) * 0.92, Math.sin(th) * 0.92], d2 = [0.6, -sd * Math.sin(th) * 0.5, Math.cos(th) * 0.5];   /* span, and the chord square to it: a wing shows its full face from the front and its profile from the side */
      function W(a, b) { return P(v, R[0] + sp * (a * d1[0] + b * d2[0]), R[1] + sp * (a * d1[1] + b * d2[1]), R[2] + sp * (a * d1[2] + b * d2[2])); }
      function wp(cmds) { var s = '', i, j, q; for (i = 0; i < cmds.length; i++) { s += cmds[i][0]; for (j = 1; j < cmds[i].length; j += 2) { q = W(cmds[i][j], cmds[i][j + 1]); s += f1(q.x) + ' ' + f1(q.y) + ' '; } } return s; }
      var mid = W(0.55, 0), I = it(mid.d + (Wg.dz || 0)), far = sd * -v.s < -0.25, col = far ? dk(Wg.col, 0.12) : Wg.col, col2 = Wg.col2 || lt(Wg.col, 0.3), tipq = W(1.05, 0.2);
      [[1.12, 0.74], [0.6, 0.92], [1.12, 0.05], [0.82, -0.62], [0.3, -0.3]].forEach(function (m) { var mq0 = W(m[0], m[1]); I.mark(mq0.x, mq0.y, 2); if (BB && mq0.y < BB.y0) BB.y0 = mq0.y; });
      switch (Wg.type) {
        case 'bug':
          I.p(wp([['M', 0, 0.05], ['C', 0.25, 0.42, 0.85, 0.42, 1.05, 0.12], ['C', 1.1, -0.1, 0.5, -0.2, 0, -0.05], ['Z']]), col);
          I.p(wp([['M', 0, -0.05], ['C', 0.3, -0.05, 0.75, -0.2, 0.82, -0.38], ['C', 0.6, -0.5, 0.2, -0.36, 0, -0.12], ['Z']]), col);
          I.x(line(wp([['M', 0.06, 0.04], ['L', 0.95, 0.14], ['M', 0.4, 0.08], ['L', 0.66, 0.3], ['M', 0.62, 0.1], ['L', 0.86, -0.02]]), Wg.line || '#7fa8c8', 1.1, ' opacity=".8"'));
          break;
        case 'butterfly':
          I.p(wp([['M', 0, 0.02], ['C', 0.1, 0.75, 0.85, 0.95, 1.08, 0.5], ['C', 1.2, 0.2, 0.7, -0.02, 0, -0.04], ['Z']]), col);
          I.p(wp([['M', 0, -0.02], ['C', 0.55, 0.02, 0.92, -0.25, 0.8, -0.62], ['C', 0.55, -0.82, 0.12, -0.5, 0, -0.1], ['Z']]), Wg.col3 || dk(Wg.col, 0.16));
          I.x(path(wp([['M', 0.5, 0.42], ['C', 0.55, 0.62, 0.86, 0.62, 0.86, 0.42], ['C', 0.82, 0.28, 0.56, 0.26, 0.5, 0.42], ['Z']]), col2) + path(wp([['M', 0.42, -0.3], ['C', 0.46, -0.18, 0.66, -0.2, 0.64, -0.34], ['C', 0.6, -0.46, 0.44, -0.44, 0.42, -0.3], ['Z']]), col2) +
            line(wp([['M', 0.04, 0.02], ['C', 0.3, 0.3, 0.6, 0.5, 0.95, 0.5]]), dk(Wg.col, 0.3), 1.2, ' opacity=".5"'));
          break;
        case 'bat':
          I.p(wp([['M', 0, 0.06], ['L', 0.95, 0.72], ['L', 1.1, 0.02], ['Q', 0.95, 0.1, 0.84, -0.12], ['Q', 0.66, 0.02, 0.54, -0.22], ['Q', 0.32, -0.06, 0.2, -0.3], ['Q', 0.1, -0.12, 0, -0.1], ['Z']]), col);
          I.x(line(wp([['M', 0.02, 0.05], ['L', 0.95, 0.72], ['M', 0.42, 0.34], ['L', 0.84, -0.12], ['M', 0.25, 0.22], ['L', 0.54, -0.22]]), Wg.line || c.dark, 1.8));
          break;
        case 'leaf':
          I.p(wp([['M', 0, 0], ['C', 0.2, 0.55, 0.8, 0.55, 1.1, 0.12], ['C', 0.8, -0.32, 0.25, -0.3, 0, 0], ['Z']]), col);
          I.x(line(wp([['M', 0.05, 0.01], ['L', 1.0, 0.11], ['M', 0.35, 0.05], ['L', 0.55, 0.3], ['M', 0.6, 0.08], ['L', 0.78, 0.27], ['M', 0.4, 0.04], ['L', 0.55, -0.14]]), Wg.line || dk(Wg.col, 0.3), 1.3, ' opacity=".7"'));
          break;
        case 'star':
          I.p(wp([['M', 0, 0.05], ['C', 0.3, 0.7, 0.75, 0.8, 1.1, 0.45], ['Q', 0.86, 0.36, 0.98, 0.1], ['Q', 0.7, 0.1, 0.72, -0.2], ['Q', 0.4, -0.08, 0, -0.08], ['Z']]), col);
          I.x(line(wp([['M', 0.3, 0.2], ['Q', 0.6, 0.45, 0.92, 0.4]]), Wg.col2 || c.accent, 2));
          break;
        default:    /* feather, fire */
          I.p(wp([['M', 0, 0.06], ['C', 0.3, 0.8, 0.8, 0.95, 1.18, 0.7], ['Q', 0.98, 0.5, 1.08, 0.3], ['Q', 0.82, 0.24, 0.9, 0.0], ['Q', 0.62, 0.0, 0.62, -0.26], ['Q', 0.3, -0.12, 0, -0.1], ['Z']]), col);
          I.x(line(wp([['M', 0.3, 0.32], ['Q', 0.65, 0.58, 1.0, 0.6], ['M', 0.3, 0.1], ['Q', 0.56, 0.2, 0.82, 0.14]]), Wg.line || dk(Wg.col, 0.3), 1.8, ' opacity=".7"'));
          if (Wg.type === 'fire') { var fq = W(1.12, 0.68); I.p(flameD(fq.x, fq.y + 2, sp * 0.18, 1 + Math.sin(t * 9) * 0.1, Math.sin(t * 5) * 2), Wg.col2 || c.accent); }
      }
    }
    (B.wings || []).forEach(function (Wg) {
      if (Wg.type === 'folded' && o.fly) { var FW = { type: 'feather', span: bh * 1.7, col: Wg.col, line: dk(Wg.col, 0.3), rest: 14, swing: 44, at: 0, atS: 0.9, atU: 0.45, sweep: 0.3 }; wing(FW, -1); wing(FW, 1); }
      else if (Wg.type === 'folded' || Wg.type === 'flipper') {         /* a bird's wing lies along its side */
        [-1, 1].forEach(function (sd) {
          var lift = Wg.type === 'flipper' ? (wk ? sw * sd * 0.5 : Math.sin(t * 2) * 0.1) : 0;
          var q = S.blob(v, [(B.bf || 0) - bl * 0.12, sd * bw * (0.92 + Math.abs(lift) * 0.5), bodyU + bh * (0.05 + lift * 0.3)], [bl * (Wg.len || 0.62), 2.2, bh * (Wg.h || 0.6)]);
          var I = it(q.d + sd * -v.s * 0.5), far = sd * -v.s < -0.25;
          I.e(q.x, q.y, Math.max(2.4, q.rx), q.ry, far ? dk(Wg.col, 0.14) : Wg.col);
          if (Math.abs(v.s) > 0.4 && !far) I.x(line(D('M', q.x - q.rx * 0.5 * (v.s > 0 ? 1 : -1), q.y + q.ry * 0.25, 'q', (v.s > 0 ? -1 : 1) * 3, 4, 0, 8, 'M', q.x - q.rx * 0.15 * (v.s > 0 ? 1 : -1), q.y + q.ry * 0.35, 'q', (v.s > 0 ? -1 : 1) * 3, 4, 0, 7), '#fff', 1.4, ' opacity=".45"'));
        });
      } else { wing(Wg, -1); wing(Wg, 1); }
    });

    /* ================= heads ================= */
    var info = { head: null, mouth: null }, topY = 1e9;
    function head(HC, r, hi) {
      var H = P(v, HC[0], HC[1], HC[2]), hx = r * (B.hw || 1.12) * (fl.pudgy ? 1.04 : 1), hy = r * (B.hh || 0.96), I = it(H.d), hk = r / B.hr;
      function onH(a, p, out) { return S.onBall(v, HC, r, a, p, (out || 1) * 0.84); }
      /* ears (and things beside them) turn only about half as far as the face: a cartoonist's cheat that keeps both ears in view and the same size */
      var yy = v.yaw > 180 ? v.yaw - 360 : v.yaw, ve = S.view(Math.abs(yy) <= 90 ? yy * 0.5 : 180 + (yy - (yy > 0 ? 180 : -180)) * 0.5), Hc = P(ve, HC[0], HC[1], HC[2]);
      function onE(a, p, out) { var q = S.onBall(ve, HC, r, a, p, (out || 1) * 0.84); q.x += H.x - Hc.x; q.y += H.y - Hc.y; return q; }
      var front = v.c > 0.15, E = B.ears || { type: 'none' };
      if (H.y - hy < topY) topY = H.y - hy;

      /* --- mane behind the head --- */
      var MN = B.mane;
      if (MN && MN.type === 'lion') {
        var mq = P(v, HC[0] - r * 0.34, HC[1], HC[2]), MI = it(mq.d - 0.05), mn = 11;
        for (var mi = 0; mi < mn; mi++) { var ma = mi / mn * TAU, mp = P(v, HC[0] - r * 0.34, HC[1] + Math.cos(ma) * r * (0.88 + 0.14 * MN.k), HC[2] + Math.sin(ma) * r * (0.84 + 0.14 * MN.k) - r * 0.06); MI.e(mp.x, mp.y, r * 0.34 * MN.k, r * 0.34 * MN.k, mi % 2 ? dk(MN.col, 0.1) : MN.col); }
      } else if (MN && MN.type === 'unicorn') {
        var UI = it(P(v, HC[0] - r * 0.7, HC[1], HC[2]).d + 0.02), un = 6;
        for (var ui = 0; ui <= un; ui++) { var uk = ui / un, up2 = P(v, HC[0] + r * (0.25 - 1.2 * Math.sin(uk * 1.5)), HC[1] + Math.sin(t * 2 + uk * 3) * 1.2, HC[2] + r * (1.0 - 1.9 * uk * uk)); UI.e(up2.x, up2.y, r * (0.3 + 0.1 * Math.sin(uk * Math.PI)) * MN.k, r * 0.3 * MN.k, ui % 2 ? (MN.col2 || lt(MN.col, 0.3)) : MN.col); }
      }
      if (B.nemes) {                     /* the sphinx's headdress: a hood behind, flaps down both sides */
        var NQ = P(v, HC[0] - r * 0.2, HC[1], HC[2] + r * 0.1), NI = it(NQ.d - 0.1), nw = hx * 1.12;
        NI.p(D('M', NQ.x - nw, NQ.y + r * 1.05, 'L', NQ.x - nw * 0.98, NQ.y - r * 0.3, 'Q', NQ.x - nw * 0.9, NQ.y - r * 1.2, NQ.x, NQ.y - r * 1.22, 'Q', NQ.x + nw * 0.9, NQ.y - r * 1.2, NQ.x + nw * 0.98, NQ.y - r * 0.3, 'L', NQ.x + nw, NQ.y + r * 1.05, 'Q', NQ.x, NQ.y + r * 1.25, NQ.x - nw, NQ.y + r * 1.05, 'Z'), B.nemes.col);
        var ns = ''; [-0.75, -0.45, 0.45, 0.75].forEach(function (k) { ns += line(D('M', NQ.x + nw * k, NQ.y - r * (1.0 - Math.abs(k) * 0.35), 'L', NQ.x + nw * k * 1.08, NQ.y + r * 1.02), B.nemes.stripe, 3.2); });
        if (!front) [-0.15, 0.15].forEach(function (k) { ns += line(D('M', NQ.x + nw * k, NQ.y - r * 1.15, 'L', NQ.x + nw * k * 1.2, NQ.y + r * 1.1), B.nemes.stripe, 3.2); });
        NI.x(ns);
      }

      /* --- ears that stand behind the head outline --- */
      function earShape(sd, q, fn) {
        var wf = (E.type === 'point' ? 0.8 : 0.7) + (E.type === 'point' ? 0.2 : 0.3) * Math.abs(ve.c);
        var rot = sd * ((droop ? (E.droop == null ? 22 : E.droop) : 0) + (E.tilt == null ? 10 : E.tilt)) * (0.45 + 0.55 * Math.abs(ve.c)) + (asleep ? sd * 16 : 0) + (E.lean || 0) * -v.s;
        var far = sd * -v.s < -0.6;
        I.g('translate(' + f1(q.x) + ' ' + f1(q.y) + ') rotate(' + f1(rot) + ')');
        fn(E.w * wf * hk, E.h * hk * (droop ? 0.92 : 1), far ? dk(E.col || c.body, 0.14) : (E.col || c.body), far);
        I.end(); I.mark(q.x + Math.sin(rot * RAD) * E.h * hk, q.y - E.h * hk * 0.95, E.w * hk * 0.6);
        if (q.y - E.h * hk < topY) topY = q.y - E.h * hk;
      }
      if (E.type === 'point' || E.type === 'long' || E.type === 'round' || E.type === 'fold' || E.type === 'fin') [-1, 1].forEach(function (sd) {
        earShape(sd, onE(sd * (E.a || 38), E.p == null ? 52 : E.p, 0.92), function (w, h, col) {
          var inner = E.inner === 0 ? null : (E.inner || c.inner);
          if (E.type === 'point') {
            var kx = E.sharp ? 0.5 : 0.7, ky = E.sharp ? 0.6 : 0.7;
            I.p(D('M', -w, 0, 'Q', -w * kx, -h * ky, 0, -h, 'Q', w * kx, -h * ky, w, 0, 'Z'), col);
            if (v.c > -0.2 && inner) I.x(path(D('M', -w * 0.55, 0, 'Q', -w * 0.35, -h * 0.5, 0, -h * 0.72, 'Q', w * 0.35, -h * 0.5, w * 0.55, 0, 'Z'), inner));
            if (E.tip) I.x(path(D('M', -w * 0.36, -h * 0.7, 'Q', -w * 0.2, -h * 0.9, 0, -h, 'Q', w * 0.2, -h * 0.9, w * 0.36, -h * 0.7, 'Q', 0, -h * 0.6, -w * 0.36, -h * 0.7, 'Z'), E.tip));
            if (E.tuft) I.p(D('M', -w * 0.14, -h * 0.94, 'L', sd * w * 0.3, -h * (1 + E.tuft), 'L', w * 0.14, -h * 0.94, 'Z'), E.tip || c.dark);
          } else if (E.type === 'long') {
            I.p(D('M', -w, 0, 'L', -w, -h + w, 'A', w, w, 0, 0, 1, w, -h + w, 'L', w, 0, 'Z'), col);
            if (front && inner) I.x('<rect x="' + f1(-w * 0.5) + '" y="' + f1(-h + w * 0.6) + '" width="' + f1(w) + '" height="' + f1(h - w * 0.4) + '" rx="' + f1(w * 0.5) + '" fill="' + inner + '"/>');
          } else if (E.type === 'round') {
            I.e(0, -h * 0.5, w, h * 0.62, col);
            if (front && inner) I.x(ell(0, -h * 0.45, w * 0.55, h * 0.36, inner));
          } else if (E.type === 'fold') {
            I.p(D('M', -w, 0, 'Q', -w * 1.0, -h * 0.95, 0, -h * 0.8, 'Q', w * 0.9, -h * 0.7, w * 0.95, 0, 'Z'), col);
            if (front) I.x(line(D('M', -w * 0.7, -h * 0.25, 'Q', 0, -h * 0.62, w * 0.72, -h * 0.2), dk(c.body, 0.3), 1.5, ' opacity=".7"'));
          } else if (E.type === 'fin') {
            I.p(D('M', -w * 0.5, 0, 'L', -sd * w * 0.2 - w * 0.2, -h, 'L', 0, -h * 0.55, 'L', sd * w * 0.9, -h * 0.9, 'L', sd * w * 0.45, -h * 0.28, 'L', sd * w * 1.1, -h * 0.05, 'L', w * 0.5, h * 0.1, 'Z'), E.col || c.accent);
          }
        });
      });
      if (E.type === 'antennae' || E.type === 'stalks' || E.type === 'feathery') [-1, 1].forEach(function (sd) {
        var b0 = onH(sd * 24, 62, 0.95), len = E.h * hk, tip = P(v, HC[0] + r * 0.42, HC[1] + sd * r * (E.out || 0.62), HC[2] + r * 0.78 + len), mid = P(v, HC[0] + r * 0.12, HC[1] + sd * r * 0.28, HC[2] + r * 0.82 + len * 0.75);
        var d = D('M', b0.x, b0.y, 'Q', mid.x, mid.y, tip.x, tip.y);
        if (E.type === 'stalks') I.l(d, E.w || 4.5, c.body); else I.x(line(d, E.col || INK, E.w || 2.2));
        if (E.type === 'feathery') { for (var k = 1; k <= 4; k++) { var u = k / 5, fx = b0.x + (tip.x - b0.x) * u, fy = b0.y + (tip.y - b0.y) * u - Math.sin(u * Math.PI) * 2; I.x(line(D('M', fx - 4.2, fy + 1.5, 'L', fx, fy, 'L', fx + 4.2, fy + 1.5), E.col || INK, 1.5)); } }
        else I.e(tip.x, tip.y, E.ball || 3.4, E.ball || 3.4, E.tip || c.accent);
        I.mark(tip.x, tip.y, 4); if (tip.y - 4 < topY) topY = tip.y - 4;
      });
      if (E.type === 'gills') [-1, 1].forEach(function (sd) {
        var dirx = sd * (v.c >= 0 ? 1 : -1) * (0.4 + 0.6 * Math.abs(v.c));
        [[38, -32], [10, 0], [-18, 30]].forEach(function (gp) {
          var q = onH(sd * 86, gp[0], 0.9), L = E.h * hk, ex = q.x + dirx * Math.cos(gp[1] * RAD) * L, ey = q.y + Math.sin(gp[1] * RAD) * L - 1, gd = D('M', q.x, q.y, 'Q', (q.x + ex) / 2, q.y - 3 + Math.sin(t * 2) * 1, ex, ey);
          I.l(gd, 4.2, E.col || c.accent);
          for (var k = 1; k <= 3; k++) I.x(line(D('M', q.x + (ex - q.x) * k / 3.4, q.y + (ey - q.y) * k / 3.4 - 1, 'l', dirx * 1.5, -4), lt(E.col || c.accent, 0.25), 1.8));
          I.mark(ex, ey, 3);
        });
      });
      if (E.type === 'bumps') [-1, 1].forEach(function (sd) { var q = onH(sd * (E.a || 34), E.p || 56, 1.08); I.e(q.x, q.y, r * 0.34 * Math.max(0.7, q.w), r * 0.34, c.body); if (q.y - r * 0.34 < topY) topY = q.y - r * 0.34; });

      /* --- cheek fluff widens the outline --- */
      if (B.fluff) [-1, 1].forEach(function (sd) {
        var q = P(v, HC[0], HC[1] + sd * r * 0.9, HC[2] - r * 0.34), g = B.fluff * hk, w = g * (0.5 + 0.5 * Math.abs(v.c)) * (v.c >= 0 ? 1 : -1) * sd;
        I.p(D('M', q.x - w * 0.3, q.y - g * 0.8, 'Q', q.x + w * 0.75, q.y - g * 0.45, q.x + w * 0.95, q.y + g * 0.35, 'Q', q.x + w * 0.5, q.y + g * 0.3, q.x + w * 0.35, q.y + g * 0.85, 'Q', q.x - w * 0.1, q.y + g * 0.75, q.x - w * 0.3, q.y + g * 0.95, 'Q', q.x - w * 0.7, q.y, q.x - w * 0.3, q.y - g * 0.8, 'Z'), c.fluff || c.body);
      });
      if (B.shag) {                       /* a shaggy coat: scallops round the head */
        for (var sg = 0; sg < 9; sg++) { var sa = (sg / 8) * Math.PI * 1.5 - Math.PI * 0.25, sx2 = H.x + Math.cos(sa) * hx * 0.94, sy2 = H.y + Math.sin(sa) * hy * 0.94; I.e(sx2, sy2, B.shag * hk, B.shag * hk, c.fluff || c.body); }
      }

      /* --- the muzzle: its outline belongs to the head when it faces us --- */
      var M = B.muzzle || { type: 'none' }, mo = (M.out || 1) * (1 + (M.type === 'snout' ? 0.42 : 0.34) * Math.abs(v.s)), mq2 = onH(0, M.p == null ? -32 : M.p, mo);
      var mrx = r * (M.r || 0.3) * (0.72 + 0.28 * mq2.w) * (M.wide || 1), mry = r * (M.r || 0.3) * 0.72, mFront = mq2.n >= -0.05;
      var solidMz = M.type === 'bump' || M.type === 'snout';
      if (solidMz && mFront) I.o('<ellipse cx="' + f1(mq2.x) + '" cy="' + f1(mq2.y) + '" rx="' + f1(mrx) + '" ry="' + f1(mry) + '"/>');

      /* --- the head itself, and everything painted on it --- */
      var bare = !!B.faceOnly;            /* object creatures: the face sits straight on the thing itself */
      if (!bare) I.e(H.x, H.y, hx, hy, c.body);
      var hs = bare ? '<g>' : '<clipPath id="' + id + 'h' + hi + '"><ellipse cx="' + f1(H.x) + '" cy="' + f1(H.y) + '" rx="' + f1(hx) + '" ry="' + f1(hy) + '"/></clipPath><g clip-path="url(#' + id + 'h' + hi + ')">';
      var MK = B.marks || {}, EY = B.eyes || {}, ea = EY.a || 30, ep = EY.p == null ? 2 : EY.p, es0 = r * (EY.size || 0.44), eout = EY.out || 1;
      if (MK.cap) { var cq = onH(0, 80); hs += ell(cq.x, cq.y + hy * 0.08, hx * 1.1, hy * 0.62, MK.cap); }          /* a dark cap over the top of the head */
      if (MK.mask) { var mk = onH(0, -30); if (mk.n > -0.3) hs += ell(mk.x, mk.y + hy * 0.1, hx * (0.5 + 0.35 * mk.w), hy * 0.62, MK.mask); }
      if (MK.blaze) { var bq = onH(0, 30); if (bq.n > 0) hs += ell(bq.x, bq.y, hx * 0.2 * bq.w, hy * 0.7, MK.blaze); }
      if (MK.browdots) [-1, 1].forEach(function (sd) { var q = onH(sd * (ea - 6), ep + 30); if (q.n > 0.1) hs += ell(q.x, q.y, r * 0.11 * q.w, r * 0.08, MK.browdots); });
      if (MK.owldisc) [-1, 1].forEach(function (sd) { var q = onH(sd * ea, ep, eout); if (q.n > 0.02) hs += ell(q.x, q.y, es0 * 1.25 * Math.max(0.62, q.w), es0 * 1.35, MK.owldisc); });
      if (MK.patch) { var pq = onH(ea, ep); if (pq.n > 0.02) hs += ell(pq.x, pq.y, es0 * 1.15 * Math.max(0.62, pq.w), es0 * 1.25, MK.patch); }
      if (MK.beakmask) { var kq = onH(0, -18); if (kq.n > -0.2) hs += ell(kq.x, kq.y, r * 0.52 * (0.6 + 0.4 * kq.w), r * 0.36, MK.beakmask); }
      if (MK.forehead) [-15, 0, 15].forEach(function (a) { var q1 = onH(a, 66), q0 = onH(a * 0.8, 42); if (q0.n > 0.1) hs += line(D('M', q1.x, q1.y, 'L', q0.x, q0.y), MK.forehead, 2.6, ' opacity=".85"'); });
      if (MK.cheeks) [-1, 1].forEach(function (sd) { [10, -4].forEach(function (pp) { var q1 = onH(sd * 88, pp + 3), q0 = onH(sd * 66, pp); if (q0.n > 0.05) hs += line(D('M', q1.x, q1.y, 'L', q0.x, q0.y), MK.cheeks, 2.6, ' opacity=".85"'); }); });
      (B.hspots || []).forEach(function (m) { var q = onH(m[0], m[1]); if (q.n > 0.05) hs += ell(q.x, q.y, m[2] * q.w * hk, m[2] * 0.8 * hk, B.hspotCol || c.dark, ' opacity=".9"'); });
      if (fl.dirty) { var dq = onH(48, -18), dq2 = onH(-30, 40); if (dq.n > 0.1) hs += ell(dq.x, dq.y, 6 * dq.w, 4.4, '#7b5236'); if (dq2.n > 0.1) hs += ell(dq2.x, dq2.y, 5 * dq2.w, 3.6, '#7b5236'); }
      if (!fl.thin && !fl.dirty) [-1, 1].forEach(function (sd) { var q = onH(sd * (EY.blushA || 50), EY.blushP == null ? -22 : EY.blushP); if (q.n > 0.12) hs += ell(q.x, q.y, r * 0.17 * q.w, r * 0.1, c.blush, ' opacity=".75"'); });
      if (!bare) hs += S.crescent(H.x, H.y, hx, hy, 0.7, dk(c.body, 0.3), 0.36) + ell(H.x - hx * 0.38, H.y - hy * 0.56, hx * 0.3, hy * 0.13, '#fff', ' opacity=".2" transform="rotate(-24 ' + f1(H.x - hx * 0.38) + ' ' + f1(H.y - hy * 0.56) + ')"');
      if (MK.tears) [-1, 1].forEach(function (sd) { var q1 = onH(sd * (ea - 9), ep - 14), q0 = onH(sd * 15, -40); if (q1.n > 0.1) hs += line(D('M', q1.x, q1.y, 'Q', q1.x, (q1.y + q0.y) / 2 + 2, q0.x, q0.y), INK, 2.2); });

      /* eyes: big and glossy */
      var eyes = '';
      if (!B.bangs || !front) [-1, 1].forEach(function (sd) {
        var q = onH(sd * ea, ep, eout);
        if (q.n < 0.02) return;
        var rx = es0 * 0.62 * Math.max(0.62, q.w), ry = es0 * 0.78, x = q.x, y = q.y, ink = c.eye, lw2 = Math.max(1.9, r * 0.085), s = '';
        if (shut) s = line(D('M', x - rx, y, 'Q', x, y + ry * 0.75, x + rx, y), darkFur ? c.light : ink, lw2);
        else if (eat) s = line(D('M', x - rx, y + ry * 0.3, 'Q', x, y - ry * 0.95, x + rx, y + ry * 0.3), darkFur ? c.light : ink, lw2 * 1.1);
        else {
          if (darkFur) s += ell(x, y, rx + 1, ry + 1, mix(c.body, c.light, 0.5));
          s += ell(x, y, rx, ry, ink);
          if (EY.style !== 'bead') {
            s += ell(x, y + ry * 0.2, rx * 0.8, ry * 0.7, c.iris) + ell(x, y + ry * 0.5, rx * 0.56, ry * 0.3, lt(c.iris, 0.45), ' opacity=".9"');
            s += EY.style === 'cat' ? ell(x, y + ry * 0.02, rx * 0.26, ry * 0.6, ink) : ell(x, y + ry * 0.04, rx * 0.5, ry * 0.5, ink);
          }
          s += ell(x - rx * 0.3, y - ry * 0.4, rx * (happy ? 0.46 : 0.4), ry * (happy ? 0.34 : 0.3), '#fff') + ell(x + rx * 0.34, y + ry * 0.4, rx * 0.19, ry * 0.15, '#fff', ' opacity=".9"');
          if (happy) s += path(star(x + rx * 0.5, y - ry * 0.46, rx * 0.26, rx * 0.1), '#fff');
          if (half) s += ell(x, y - ry * 0.9, rx * 1.4, ry * 0.86, MK.lid || c.body) + line(D('M', x - rx * 1.02, y - ry * 0.18, 'Q', x, y - ry * 0.02, x + rx * 1.02, y - ry * 0.18), ink, 1.5);
          if (grump) s += line(D('M', x - sd * rx * 1.15, y - ry * 1.3, 'L', x + sd * rx * 0.9, y - ry * 0.92), darkFur ? c.light : dk(c.body, 0.5), 2.2);
          if (fl.tired) s += line(D('M', x - rx * 0.9, y + ry + 2, 'Q', x, y + ry + 5.5, x + rx * 0.9, y + ry + 2), '#7b5aa6', 1.8, ' opacity=".7"');
          if (MK.kohl) s += line(D('M', x + sd * rx * 0.8 * (v.c >= 0 ? 1 : -1), y - ry * 0.1, 'l', sd * (v.c >= 0 ? 1 : -1) * rx * 0.9, -ry * 0.35), INK, 2);
          if (MK.lash) s += line(D('M', x + sd * rx * 0.7, y - ry * 0.8, 'l', sd * rx * 0.55, -ry * 0.4), INK, 1.6);
        }
        eyes += s;
      });
      hs += '<g class="cre-eyes">' + eyes + '</g></g>';
      I.x(hs);
      if (hi === 0) info.head = { x: H.x, y: H.y, r: r };

      /* --- nose and mouth --- */
      var MI2 = it(H.d + (mFront ? 0.6 : -0.6)), ms = '', nq, mw, my, mx;
      var mstate = eat ? 'open' : mood === 'hungry' ? 'drool' : grump ? 'frown' : (half || asleep) ? 'flat' : happy ? 'grin' : 'smile';
      function lips(x, y, w, sy) {
        var s = '', k = sy || 1;
        if (mstate === 'frown') s = line(D('M', x - w, y + 3.2 * k, 'Q', x, y, x + w, y + 3.2 * k), c.eye, 1.7);
        else if (mstate === 'open' || mstate === 'drool') s = ell(x, y + 3 * k, w * (mstate === 'open' ? 0.8 : 0.6), (mstate === 'open' ? 4 : 2.8) * k, c.mouth) + (mstate === 'drool' ? path(D('M', x + w * 0.4, y + 4.5 * k, 'q', 2.2, 5, 0, 7, 'q', -2.2, -2, 0, -7, 'Z'), '#9ad6ff') : '');
        else if (mstate === 'flat') s = line(D('M', x - w * 0.6, y + 2 * k, 'Q', x, y + 3 * k, x + w * 0.6, y + 2 * k), c.eye, 1.7);
        else s = (mstate === 'grin' ? path(D('M', x - w * 0.62, y + 1.6 * k, 'Q', x, y + 9 * k, x + w * 0.62, y + 1.6 * k, 'Z'), c.mouth) + ell(x, y + 5.2 * k, w * 0.3, 1.7 * k, '#ff9db0') : '') +
          line(D('M', x - w, y, 'Q', x - w * 0.5, y + 3.6 * k, x, y + 0.6, 'Q', x + w * 0.5, y + 3.6 * k, x + w, y), c.eye, 1.7);
        return s;
      }
      if (M.type === 'beak') {
        var bc = onH(0, M.p == null ? -16 : M.p, 1), tipq = P(v, HC[0] + r * (0.84 + (M.len || 0.5)), HC[1], HC[2] - r * (M.drop == null ? 0.38 : M.drop)), brx = r * (M.r || 0.22) * (0.5 + 0.5 * bc.w), bry = r * (M.r || 0.22) * 0.82, open = mstate === 'open' || mstate === 'drool' || mstate === 'grin';
        if (bc.n > -0.35) {
          MI2.d = H.d + (bc.n >= -0.05 ? 0.6 : -0.6);
          if (open) MI2.p(D('M', bc.x - brx * 0.8, bc.y + bry * 0.3, 'L', tipq.x, tipq.y + bry * 1.0, 'L', bc.x + brx * 0.8, bc.y + bry * 0.3, 'Z'), dk(M.col, 0.2));
          MI2.e(bc.x, bc.y, brx, bry, M.col);
          MI2.p(D('M', bc.x - brx, bc.y, 'L', bc.x, bc.y - bry, 'L', tipq.x, tipq.y, 'L', bc.x, bc.y + bry, 'Z'), M.col).p(D('M', bc.x + brx, bc.y, 'L', bc.x, bc.y - bry, 'L', tipq.x, tipq.y, 'L', bc.x, bc.y + bry, 'Z'), M.col);
          MI2.x(ell(bc.x - brx * 0.25, bc.y - bry * 0.35, brx * 0.3, bry * 0.22, '#fff', ' opacity=".5"'));
          if (M.hook) MI2.x(line(D('M', tipq.x, tipq.y, 'q', -v.s * 1.5, 3, -v.s * 3.5, 3.4), dk(M.col, 0.35), 1.6));
        }
        if (hi === 0) info.mouth = { x: tipq.x, y: tipq.y };
      } else if (M.type === 'wide' || M.type === 'goofy') {
        var pts = [], wa = M.w || 40, wp2 = M.p == null ? -30 : M.p, smile = mstate === 'frown' ? -1 : mstate === 'flat' ? 0.2 : mstate === 'grin' ? 1.5 : 1;
        for (var wi = -4; wi <= 4; wi++) { var wq = onH(wa * wi / 4, wp2 + (1 - (wi * wi) / 16) * -9 * smile + 4, 1.01); if (wq.n > 0.06) pts.push(f1(wq.x) + ' ' + f1(wq.y)); }
        var cq2 = onH(0, wp2 - 5, 1.01);
        if (pts.length > 1) {
          if (mstate === 'open' || mstate === 'drool' || (M.type === 'goofy' && mstate !== 'frown' && mstate !== 'flat')) ms += path('M' + pts.join('L') + 'Q' + f1(cq2.x) + ' ' + f1(cq2.y + r * (mstate === 'open' ? 0.5 : 0.36)) + ' ' + pts[0] + 'Z', c.mouth) + (cq2.n > 0.3 ? ell(cq2.x + 2 * cq2.w, cq2.y + r * 0.13, r * 0.11 * cq2.w, r * 0.07, '#ff9db0') : '');
          ms += line('M' + pts.join('L'), c.eye, 1.9);
          if (mstate === 'drool' && cq2.n > 0.2) ms += path(D('M', cq2.x + 4, cq2.y + 5, 'q', 2.2, 5, 0, 7, 'q', -2.2, -2, 0, -7, 'Z'), '#9ad6ff');
        }
        if (M.nostrils !== 0) [-1, 1].forEach(function (sd) { var nq2 = onH(sd * 7, wp2 + 13, 1.01); if (nq2.n > 0.15) ms += ell(nq2.x, nq2.y, 1.1, 1.3, c.eye, ' opacity=".7"'); });
        MI2.x(ms);
        if (hi === 0) info.mouth = { x: cq2.x, y: cq2.y };
      } else {
        if (solidMz) { if (mFront) MI2.x(ell(mq2.x, mq2.y, mrx, mry, M.col || c.belly) + S.crescent(mq2.x, mq2.y, mrx, mry, 0.75, dk(M.col || c.belly, 0.3), 0.45)); else MI2.e(mq2.x, mq2.y, mrx, mry, M.col || c.belly); }
        var np = (M.p == null ? -32 : M.p) + (solidMz ? 13 : 10), nk = M.type === 'snout' ? 1.5 : 1;
        nq = onH(0, np, solidMz ? mo + (M.r || 0.3) * 0.42 : 1.02);
        if (nq.n > -0.1 || solidMz) ms += ell(nq.x, nq.y, r * 0.1 * nk * (0.6 + 0.4 * nq.w), r * 0.07 * nk, M.nose || c.nose) + ell(nq.x - r * 0.03 * nk, nq.y - r * 0.025 * nk, r * 0.035 * nk, r * 0.02 * nk, '#fff', ' opacity=".6"');
        mw = r * (M.type === 'snout' ? 0.17 : 0.13) * nq.w; my = nq.y + r * 0.1 * (M.type === 'snout' ? 1.25 : 1); mx = nq.x;
        if (mq2.n > 0.2) {
          ms += lips(mx, my, mw);
          if (M.type === 'snout' && mstate === 'grin') ms += path(D('M', mx - mw * 0.5, my + 3.4, 'Q', mx, my + 12, mx + mw * 0.5, my + 3.4, 'Z'), '#ff8fa3');
          if (MK.fangs && mstate !== 'open' && mstate !== 'drool') [-1, 1].forEach(function (sd) { ms += path(D('M', mx + sd * mw * 0.45, my + 1.2, 'l', sd * 1.6, 4.6, 'l', sd * 1.6, -4.4, 'Z'), '#fff'); });
          if (MK.whiskers) [-1, 1].forEach(function (sd) { [4, -5].forEach(function (pp) { var q0 = onH(sd * 40, np - 2 + pp * 0.5, 1.0), q1 = S.onBall(v, HC, r, sd * 60, np - 2 + pp * 1.5, 1.1); if (q0.n > 0.3) ms += line(D('M', q0.x, q0.y, 'L', q1.x, q1.y), MK.whiskers, 1, ' opacity=".55"'); }); });
        }
        MI2.x(ms);
        if (hi === 0) info.mouth = { x: mx, y: my + 2 };
      }

      /* --- ears and hair that hang in front --- */
      if (E.type === 'flop' || E.type === 'poof') [-1, 1].forEach(function (sd) {
        var q = onH(sd * (E.a || 80), E.p == null ? 36 : E.p, 1.08), far = sd * -v.s < -0.25, FI = it(H.d + (far ? -0.4 : 0.7));
        var out = sd * (v.c >= 0 ? 1 : -1) * Math.abs(v.c), w = E.w * hk, h = E.h * hk, hw = w * (0.62 + 0.38 * Math.abs(v.s)), col = far ? dk(E.col || c.dark, 0.15) : (E.col || c.dark), dx = out * w * 0.9;
        var swingE = wk ? Math.sin(ph * 2 + sd) * 4 : 0;
        FI.g('translate(' + f1(q.x) + ' ' + f1(q.y) + ') rotate(' + f1((droop ? out * -6 : 0) + swingE) + ')');
        if (E.type === 'flop') FI.p(D('M', -hw * 0.7, -w * 0.3, 'C', -hw * 1.25 + dx * 0.5, h * 0.3, -hw * 1.05 + dx, h * 0.96, dx, h, 'C', hw * 1.05 + dx, h * 0.96, hw * 1.25 + dx * 0.5, h * 0.3, hw * 0.7, -w * 0.3, 'Q', 0, -w * 0.95, -hw * 0.7, -w * 0.3, 'Z'), col);
        else { var nb = E.n || 3; for (var b = 0; b < nb; b++) FI.e(dx * (0.3 + 0.5 * b / nb), h * b / nb, hw * 1.05, hw, col); }
        FI.end(); FI.mark(q.x + dx, q.y + h, hw);
      });
      if (B.bangs && front) {                           /* a mop of hair right over the eyes */
        var BG = it(H.d + 0.75), bq2 = onH(0, 30), by2 = bq2.y + r * 0.26, bw2 = hx * (0.55 + 0.45 * bq2.w);
        BG.p(D('M', bq2.x - bw2, by2 - r * 0.15, 'Q', bq2.x - bw2 * 1.02, H.y - hy * 1.04, bq2.x, H.y - hy * 1.08, 'Q', bq2.x + bw2 * 1.02, H.y - hy * 1.04, bq2.x + bw2, by2 - r * 0.15, 'Q', bq2.x + bw2 * 0.8, by2 + 5, bq2.x + bw2 * 0.55, by2, 'Q', bq2.x + bw2 * 0.3, by2 + 7, bq2.x, by2 + 1, 'Q', bq2.x - bw2 * 0.3, by2 + 7, bq2.x - bw2 * 0.55, by2, 'Q', bq2.x - bw2 * 0.8, by2 + 5, bq2.x - bw2, by2 - r * 0.15, 'Z'), B.bangs);
      }

      /* --- things worn on top: crests, horns, gems --- */
      (B.tops || []).forEach(function (X) { top(X, HC, r, H, hx, hy, onH, hk); });
      if (o.acc && hi === 0) wear(o.acc, HC, r, H, hx, hy, onH, ea, ep, es0, eout);
      return H;
    }

    function top(X, HC, r, H, hx, hy, onH, hk) {
      var q = onH(X.a || 0, X.p == null ? 62 : X.p, X.out || 1), front = v.c > 0.15, I, z = (X.r || 3) * hk, back = -v.s;
      function emblem(fn) {           /* a flat badge on the forehead: narrows as the head turns */
        if (q.n < 0.05) return;
        I = it(H.d + 0.8); I.g('translate(' + f1(q.x) + ' ' + f1(q.y) + ') scale(' + f1(0.5 + 0.5 * q.w) + ' 1)'); fn(I); I.end();
      }
      function note(y) { if (y < topY) topY = y; if (BB) { if (y < BB.y0) BB.y0 = y; } }
      switch (X.type) {
        case 'gem': emblem(function (I) { I.x(ell(0, 0, z * 2.1, z * 1.9, X.col, ' opacity="' + f1(0.25 + 0.12 * Math.sin(t * 3)) + '"')); I.p(D('M', 0, -z * 1.3, 'L', z, 0, 'L', 0, z * 1.3, 'L', -z, 0, 'Z'), X.col); I.x(path(D('M', 0, -z * 1.3, 'L', z, 0, 'L', 0, -z * 0.1, 'Z'), '#fff', ' opacity=".5"')); }); break;
        case 'drop': emblem(function (I) { I.p(D('M', 0, -z * 1.5, 'Q', z * 1.25, z * 0.2, 0, z * 1.05, 'Q', -z * 1.25, z * 0.2, 0, -z * 1.5, 'Z'), X.col); I.x(ell(-z * 0.3, z * 0.1, z * 0.25, z * 0.35, '#fff', ' opacity=".6"')); }); break;
        case 'moon': emblem(function (I) { I.p(D('M', -z * 0.3, -z * 1.2, 'A', z * 1.2, z * 1.2, 0, 1, 0, -z * 0.3, z * 1.2, 'A', z * 0.9, z * 0.9, 0, 1, 1, -z * 0.3, -z * 1.2, 'Z'), X.col); }); break;
        case 'snowflake': emblem(function (I) { var s = ''; [0, 60, 120].forEach(function (a) { var ca = Math.cos(a * RAD) * z * 1.4, sa = Math.sin(a * RAD) * z * 1.4; s += line(D('M', -ca, -sa, 'L', ca, sa), X.col, 2.2); }); I.x(s + ell(0, 0, z * 0.4, z * 0.4, '#fff')); }); break;
        case 'bolt': I = it(H.d + 0.8); I.p(D('M', q.x + z * 0.3, q.y - z * 3.4, 'L', q.x - z * 1.3, q.y - z * 1.1, 'L', q.x - z * 0.2, q.y - z * 1.1, 'L', q.x - z * 0.8, q.y + z * 0.9, 'L', q.x + z * 1.4, q.y - z * 1.9, 'L', q.x + z * 0.3, q.y - z * 1.9, 'Z'), X.col); note(q.y - z * 3.4); break;
        case 'star': I = it(H.d + 0.8); I.x(ell(q.x, q.y - z * 0.6, z * 2, z * 2, X.col, ' opacity=".28"')); I.p(star(q.x, q.y - z * 0.6, z * 1.6, z * 0.72), X.col); note(q.y - z * 2.3); break;
        case 'flame': I = it(H.d + 0.5); I.p(flameD(q.x, q.y + z * 0.3, z, 1 + Math.sin(t * 9) * 0.08, Math.sin(t * 5) * z * 0.18 + back * z * 0.25), X.col[0]).x('<g class="cre-flicker">' + path(flameD(q.x, q.y + z * 0.3, z * 0.62, 1, back * z * 0.1), X.col[1]) + path(flameD(q.x, q.y + z * 0.3, z * 0.3, 1, 0), X.col[2] || '#fff7d6') + '</g>'); note(q.y - z * 1.8); break;
        case 'bubble': I = it(H.d + 0.9); (X.list || [[0, -8, 5]]).forEach(function (b, i) { var by = q.y + b[1] * hk - Math.sin(t * 1.4 + i) * 1.5, bx = q.x + b[0] * hk; I.x(ell(bx, by, b[2], b[2], '#e6f7ff', ' stroke="' + (X.col || '#7fbfe8') + '" stroke-width="1.6" opacity=".92"') + ell(bx - b[2] * 0.35, by - b[2] * 0.35, b[2] * 0.3, b[2] * 0.25, '#fff')); note(by - b[2]); }); break;
        case 'sprout': {
          var sway = Math.sin(t * 1.7) * 4 + (wk ? sw * 5 : 0), hgt = X.h * hk * (droop ? 0.75 : 1), lw2 = X.leaf * hk * (0.55 + 0.45 * Math.abs(v.c)), lh = X.leaf * hk * 0.5, tx = q.x + sway * 0.4, ty = q.y - hgt;
          I = it(H.d + 0.3); I.l(D('M', q.x, q.y + 2, 'Q', q.x, q.y - hgt * 0.5, tx, ty), X.sw || 2.6, X.stem);
          [-1, 1].forEach(function (sd) { I.g('translate(' + f1(tx) + ' ' + f1(ty) + ') rotate(' + f1(sd * (droop ? 62 : 28) + sway) + ')'); I.p(D('M', 0, 0, 'C', sd * lw2 * 0.5, -lh * 1.5, sd * lw2 * 1.2, -lh * 1.3, sd * lw2 * 1.25, -lh * 0.2, 'C', sd * lw2 * 0.9, lh * 0.6, sd * lw2 * 0.3, lh * 0.5, 0, 0, 'Z'), sd < 0 ? dk(X.col, 0.12) : X.col); I.end(); });
          if (X.bloom && (happy || eat || X.bloom === 'always')) { for (var k2 = 0; k2 < 5; k2++) { var an = k2 / 5 * TAU + t * 0.4; I.e(tx + Math.cos(an) * X.leaf * hk * 0.34, ty - 2 + Math.sin(an) * X.leaf * hk * 0.3, X.leaf * hk * 0.27, X.leaf * hk * 0.25, X.petal || '#ff9ec4'); } I.x(ell(tx, ty - 2, X.leaf * hk * 0.2, X.leaf * hk * 0.19, '#ffd95a')); }
          note(ty - lh * 1.6); break;
        }
        case 'flower': {      /* tucked behind one ear */
          var fq = onH(X.a == null ? 52 : X.a, X.p == null ? 50 : X.p, 1.02); I = it(H.d + (fq.n > -0.1 ? 0.85 : -0.85));
          for (var k3 = 0; k3 < 5; k3++) { var a3 = k3 / 5 * TAU - Math.PI / 2; I.e(fq.x + Math.cos(a3) * z * (0.5 + 0.5 * fq.w), fq.y + Math.sin(a3) * z, z * 0.82, z * 0.82, X.col); }
          I.x(ell(fq.x, fq.y, z * 0.62, z * 0.62, X.mid || '#ffe27a')); note(fq.y - z * 2); break;
        }
        case 'pom': I = it(H.d + 0.4); I.e(q.x, q.y - z * 0.5, z * 1.15, z, X.col).e(q.x - z * 0.8, q.y + z * 0.1, z * 0.7, z * 0.62, X.col).e(q.x + z * 0.8, q.y + z * 0.1, z * 0.7, z * 0.62, X.col); note(q.y - z * 1.5); break;
        case 'tuft': I = it(H.d + 0.4); I.p(D('M', q.x - z * 1.5, q.y + z * 0.8, 'L', q.x - z * 1.2, q.y - z * 1.2, 'L', q.x - z * 0.3, q.y - z * 0.1, 'L', q.x + z * 0.2, q.y - z * 1.9, 'L', q.x + z * 0.8, q.y - z * 0.1, 'L', q.x + z * 1.6, q.y - z * 1.0, 'L', q.x + z * 1.6, q.y + z * 0.8, 'Z'), X.col); note(q.y - z * 1.9); break;
        case 'crestfeather': {   /* a swept-back crest (cardinals) or a few head feathers (griffins) */
          var n4 = X.n || 1; I = it(H.d + 0.35);
          for (var k4 = 0; k4 < n4; k4++) { var off = (k4 - (n4 - 1) / 2) * z * 0.9, hh = z * (2.6 - Math.abs(k4 - (n4 - 1) / 2) * 0.5), lean = back * hh * 0.55 + off * 0.5 * Math.abs(v.c); I.p(D('M', q.x + off * Math.abs(v.c) - z * 0.7, q.y + z * 0.6, 'Q', q.x + off - z * 0.9 + lean * 0.3, q.y - hh * 0.6, q.x + off + lean, q.y - hh, 'Q', q.x + off + z * 0.9 + lean * 0.2, q.y - hh * 0.4, q.x + off * Math.abs(v.c) + z * 0.7, q.y + z * 0.6, 'Z'), k4 % 2 ? (X.col2 || X.col) : X.col); }
          note(q.y - z * 2.6); break;
        }
        case 'plumes': [-1, 1].forEach(function (sd) { var pq = onH(sd * 34, 34, 1.0); if (pq.n < 0.05) return; var dir = sd * (v.c >= 0 ? 1 : -1), PI2 = it(H.d + 0.85); PI2.p(D('M', pq.x - dir * z * 0.6, pq.y, 'Q', pq.x + dir * z * 1.4 * pq.w, pq.y - z * 0.5, pq.x + dir * z * 3.2 * pq.w, pq.y - z * 2.2, 'Q', pq.x + dir * z * 1.8 * pq.w, pq.y + z * 0.5, pq.x - dir * z * 0.6, pq.y + z * 0.8, 'Z'), X.col); }); break;
        case 'bobble': { var bx = q.x + z * 1.6, by3 = q.y - X.h * hk + Math.sin(t * 2.2) * 1.5; I = it(H.d + 0.4); I.l(D('M', q.x, q.y + 2, 'Q', q.x - z, q.y - X.h * hk * 0.6, bx, by3), 2.2, X.stem || c.dark); I.e(bx, by3, z, z, X.col).x(ell(bx - z * 0.3, by3 - z * 0.3, z * 0.3, z * 0.25, '#fff', ' opacity=".8"')); note(by3 - z); break; }
        case 'horn': {      /* one spiral horn, on the forehead */
          var hq = onH(0, 58, 1), hh2 = X.h * hk, hw = z * (0.7 + 0.3 * hq.w), fx = v.s * hh2 * 0.3 * (v.c > -0.3 ? 1 : -0.4);
          I = it(H.d + (hq.n > -0.2 ? 0.82 : -0.82)); I.p(D('M', hq.x - hw, hq.y + 1, 'L', hq.x + fx, hq.y - hh2, 'L', hq.x + hw, hq.y + 1, 'Z'), X.col);
          var hsx = ''; for (var k5 = 1; k5 <= 3; k5++) { var u5 = k5 / 4; hsx += line(D('M', hq.x - hw * (1 - u5) + fx * u5, hq.y - hh2 * u5 + 2, 'L', hq.x + hw * (1 - u5) + fx * u5, hq.y - hh2 * u5 - 1.5), X.line || '#c79a2e', 1.4); } I.x(hsx); note(hq.y - hh2); break;
        }
        case 'horns': case 'goat': [-1, 1].forEach(function (sd) {
          var h2 = onH(sd * (X.a2 || 32), X.p == null ? 62 : X.p, 0.95), w2 = z * (0.55 + 0.45 * Math.abs(v.c)), hh3 = X.h * hk, far = sd * -v.s < -0.25, col = far ? dk(X.col, 0.12) : X.col, dir = sd * (v.c >= 0 ? 1 : -1) * (0.3 + 0.7 * Math.abs(v.c));
          var HI = it(H.d + (X.type === 'goat' ? (far ? -0.3 : 0.4) : -0.3));
          if (X.type === 'goat') HI.l(D('M', h2.x, h2.y, 'C', h2.x + dir * hh3 * 0.5 + back * hh3 * 0.4, h2.y - hh3 * 1.0, h2.x + dir * hh3 * 1.15 + back * hh3 * 0.9, h2.y - hh3 * 0.2, h2.x + dir * hh3 * 0.8 + back * hh3 * 0.75, h2.y + hh3 * 0.42), z * 1.5, col);
          else HI.p(D('M', h2.x - w2, h2.y + 1, 'Q', h2.x - w2 * 0.3 + back * hh3 * 0.1, h2.y - hh3 * 0.7, h2.x + dir * w2 * 0.9 + back * hh3 * 0.35, h2.y - hh3, 'Q', h2.x + w2 * 0.8 + back * hh3 * 0.1, h2.y - hh3 * 0.45, h2.x + w2, h2.y + 1, 'Z'), col);
          note(h2.y - hh3);
        }); break;
        case 'rhino': { var rq = onH(0, 8, 1.0), rh = X.h * hk, fwd = v.s * rh * 0.45; I = it(H.d + (rq.n > -0.1 ? 0.9 : -0.9)); I.p(D('M', rq.x - z * (0.6 + 0.4 * rq.w), rq.y + z * 0.5, 'Q', rq.x - z * 0.4 + fwd * 0.4, rq.y - rh * 0.6, rq.x + fwd + z * 0.5, rq.y - rh, 'Q', rq.x + z * 0.6 + fwd * 0.3, rq.y - rh * 0.3, rq.x + z * (0.6 + 0.4 * rq.w), rq.y + z * 0.5, 'Z'), X.col); note(rq.y - rh); break; }
        case 'leaf': { I = it(H.d + 0.35); var lh2 = X.h * hk, lw3 = z * (0.5 + 0.5 * Math.abs(v.c)); I.p(D('M', q.x, q.y + 1, 'C', q.x - lw3 * 1.6, q.y - lh2 * 0.4, q.x - lw3 * 0.9 + back * 2, q.y - lh2 * 0.95, q.x + back * 3, q.y - lh2, 'C', q.x + lw3 * 0.9 + back * 2, q.y - lh2 * 0.95, q.x + lw3 * 1.6, q.y - lh2 * 0.4, q.x, q.y + 1, 'Z'), X.col).x(line(D('M', q.x, q.y, 'L', q.x + back * 2.4, q.y - lh2 * 0.82), dk(X.col, 0.3), 1.3)); note(q.y - lh2); break; }
        case 'cherry': I = it(H.d + 0.5); I.x(line(D('M', q.x, q.y - z, 'q', 2, -z * 1.4, 6, -z * 1.9), '#5a8a2a', 1.8)); I.e(q.x, q.y - z * 0.5, z, z, X.col || '#e2283c').x(ell(q.x - z * 0.35, q.y - z * 0.85, z * 0.28, z * 0.2, '#fff', ' opacity=".7"')); note(q.y - z * 3); break;
        case 'uraeus': emblem(function (I) { I.p(D('M', 0, z * 1.2, 'q', -z * 1.6, -z * 1.6, 0, -z * 3, 'q', z * 1.6, z * 1.4, 0, z * 3, 'Z'), X.col); }); break;
      }
    }

    /* ---- accessories from the prize shop ---- */
    function wear(acc, HC, r, H, hx, hy, onH, ea, ep, es0, eout) {
      var T = P(v, HC[0], HC[1], HC[2] + r * 0.8), I, br = r * 1.2, top2 = T.y;
      function hatNote(y) { if (y < topY) topY = y; if (BB && y < BB.y0) BB.y0 = y; }
      if (acc === 'strawhat') {
        I = it(H.d + 0.95); I.e(T.x, T.y + 2, br, br * 0.36, '#e9c46a');
        I.p(D('M', T.x - r * 0.62, T.y + 1, 'Q', T.x - r * 0.6, T.y - r * 0.72, T.x, T.y - r * 0.75, 'Q', T.x + r * 0.6, T.y - r * 0.72, T.x + r * 0.62, T.y + 1, 'Q', T.x, T.y + r * 0.2, T.x - r * 0.62, T.y + 1, 'Z'), '#f2d27a');
        I.x(line(D('M', T.x - r * 0.6, T.y - 4, 'Q', T.x, T.y + r * 0.1, T.x + r * 0.6, T.y - 4), '#e45757', 4.5)); hatNote(T.y - r * 0.8);
      } else if (acc === 'sailor') {
        I = it(H.d + 0.95); I.p(D('M', T.x - r * 0.7, T.y + 2, 'Q', T.x - r * 0.75, T.y - r * 0.62, T.x, T.y - r * 0.66, 'Q', T.x + r * 0.75, T.y - r * 0.62, T.x + r * 0.7, T.y + 2, 'Q', T.x, T.y + r * 0.22, T.x - r * 0.7, T.y + 2, 'Z'), '#ffffff');
        I.x(line(D('M', T.x - r * 0.68, T.y - 1, 'Q', T.x, T.y + r * 0.2, T.x + r * 0.68, T.y - 1), '#2a4a8f', 5)); hatNote(T.y - r * 0.7);
      } else if (acc === 'captain') {
        I = it(H.d + 0.95); I.p(D('M', T.x - r * 0.72, T.y, 'Q', T.x - r * 0.95, T.y - r * 0.6, T.x, T.y - r * 0.7, 'Q', T.x + r * 0.95, T.y - r * 0.6, T.x + r * 0.72, T.y, 'Q', T.x, T.y + r * 0.2, T.x - r * 0.72, T.y, 'Z'), '#1f2f5c');
        if (v.c > -0.2) { var vx = T.x + v.s * r * 0.5; I.p(D('M', vx - r * 0.6 * (0.4 + 0.6 * v.c), T.y + 1, 'Q', vx, T.y + r * 0.42, vx + r * 0.6 * (0.4 + 0.6 * v.c), T.y + 1, 'Q', vx, T.y + r * 0.12, vx - r * 0.6 * (0.4 + 0.6 * v.c), T.y + 1, 'Z'), '#0f1a38').x(path(star(T.x + v.s * r * 0.55, T.y - r * 0.3, 5.5 * (0.5 + 0.5 * v.c), 2.3 * (0.5 + 0.5 * v.c)), '#ffd84a')); }
        hatNote(T.y - r * 0.75);
      } else if (acc === 'crown') {
        I = it(H.d + 0.95); var cw = r * 0.6, ch = r * 0.5;
        I.p(D('M', T.x - cw, T.y + 2, 'L', T.x - cw * 1.12, T.y - ch, 'L', T.x - cw * 0.5, T.y - ch * 0.45, 'L', T.x, T.y - ch * 1.25, 'L', T.x + cw * 0.5, T.y - ch * 0.45, 'L', T.x + cw * 1.12, T.y - ch, 'L', T.x + cw, T.y + 2, 'Q', T.x, T.y + r * 0.2, T.x - cw, T.y + 2, 'Z'), '#f2c14e');
        I.x(ell(T.x - cw * 1.12, T.y - ch, 2.6, 2.6, '#fbf6ee') + ell(T.x, T.y - ch * 1.25, 2.8, 2.8, '#fbf6ee') + ell(T.x + cw * 1.12, T.y - ch, 2.6, 2.6, '#fbf6ee') + ell(T.x + v.s * cw * 0.8, T.y - 1, 3.2 * Math.max(0.4, Math.abs(v.c)), 3.2, '#e45757')); hatNote(T.y - ch * 1.4);
      } else if (acc === 'sunglasses') {
        var G = it(H.d + 0.9), pts = [];
        [-1, 1].forEach(function (sd) { var q = onH(sd * ea, ep, eout * 1.02); if (q.n < 0.02) return; var rx = es0 * 0.86 * Math.max(0.6, q.w), ry = es0 * 0.74; G.e(q.x, q.y, rx, ry, '#1e2430').x(line(D('M', q.x - rx * 0.5, q.y - ry * 0.4, 'l', rx * 0.5, 0), '#8aa4c8', 1.6, ' opacity=".8"')); pts.push(q); });
        if (pts.length === 2) G.x(line(D('M', pts[0].x, pts[0].y - 2, 'L', pts[1].x, pts[1].y - 2), '#1e2430', 2.4));
      } else if (acc === 'lei' || acc === 'bandana') {
        var NC = [HC[0] * 0.55, HC[1], HC[2] - r * 0.86], rr = r * 0.74;
        if (acc === 'lei') for (var i = 0; i < 8; i++) {
          var a = i / 8 * TAU + 0.39, q = P(v, NC[0] + Math.cos(a) * rr, NC[1] + Math.sin(a) * rr, NC[2] - Math.cos(a) * r * 0.16), FL = it(H.d + (q.d > P(v, NC[0], NC[1], NC[2]).d ? 0.72 : -0.72)), col = ['#ff7aa8', '#ffd84a', '#ff9f4a', '#c59cff'][i % 4];
          for (var k = 0; k < 5; k++) { var b = k * 1.2566; FL.e(q.x + Math.cos(b) * 2.8, q.y + Math.sin(b) * 2.8, 2.6, 2.6, col); }
          FL.x(ell(q.x, q.y, 1.7, 1.7, '#fff6c9'));
        } else {
          var fq = P(v, NC[0] + rr * 1.05, NC[1], NC[2] - r * 0.1), BI2 = it(H.d + (v.c > -0.15 ? 0.7 : -0.7)), bw3 = rr * (0.45 + 0.55 * Math.abs(v.c));
          BI2.p(D('M', fq.x - bw3, fq.y - 3, 'Q', fq.x, fq.y + 3, fq.x + bw3, fq.y - 3, 'L', fq.x + v.s * 3, fq.y + r * 0.5, 'Z'), '#e45757').x(ell(fq.x - bw3 * 0.3, fq.y + 3, 1.3, 1.3, '#fff') + ell(fq.x + bw3 * 0.35, fq.y + 4, 1.3, 1.3, '#fff'));
        }
      }
    }

    /* ---- where the head goes ---- */
    var nod = lying ? -hr * 0.55 : wk * Math.sin(ph * 2 + 1) * 0.8 - (grump ? 1.5 : 0), HC, Hmain;
    if (plan === 'blob') HC = [0, 0, hr * (B.hh || 0.96) * 0.98 + (B.foot || 0) + bob + breathe * 0.3 - (lying ? hr * 0.08 : 0)];
    else if (plan === 'obj') HC = [0, 0, B.faceU];
    else HC = [(B.bf || 0) + B.hf + (lying ? bl * 0.25 : 0), 0, leg + bh * (B.neckK || 1.45) + hr * 0.74 + nod + bob * 0.6 + (B.hu || 0)];

    if (plan === 'blob') {                     /* a round creature: all head, two feet, two little arms */
      [-1, 1].forEach(function (sd) {
        var step = wk * sw * sd * 4, fq = P(v, step, sd * hr * 0.42, 0), I = it(fq.d - 0.3), aq = P(v, 0, sd * hr * 1.06, HC[2] - hr * 0.2 + (happy ? 4 : 0));
        I.e(fq.x, fq.y - (B.foot || 5) * 0.6, (B.foot || 5) * 1.5, (B.foot || 5) * 0.8, c.paw);
        if (Math.abs(v.c) > 0.2) it(aq.d).e(aq.x, aq.y, 4.6, 3.6, c.body, 'rotate(' + (sd * (v.c >= 0 ? 1 : -1) * (happy ? 40 : -25)) + ' ' + f1(aq.x) + ' ' + f1(aq.y) + ')');
      });
    }
    if (plan === 'obj') B.obj(objApi());
    else if (B.heads === 3) {
      [-1, 1].forEach(function (sd) { head([HC[0] - 4, sd * hr * 0.98, HC[2] - hr * 0.2 + Math.sin(t * 1.5 + sd) * 0.6], hr * 0.74, sd < 0 ? 1 : 2); });
      Hmain = head(HC, hr * 0.86, 0);
    } else Hmain = head(HC, hr, 0);

    /* neck ruffs and collars sit between head and body */
    if (B.ruff && plan !== 'obj') {
      var RF = B.ruff, Rq = P(v, HC[0] * 0.75, 0, HC[2] - hr * 0.8), RI2 = it(P(v, HC[0], 0, HC[2]).d - 0.25), n5 = RF.n || 5, rw = hr * 0.74 * (0.75 + 0.25 * Math.abs(v.c));
      for (var r5 = 0; r5 < n5; r5++) { var u5 = n5 > 1 ? r5 / (n5 - 1) - 0.5 : 0; RI2.e(Rq.x + u5 * rw * 2, Rq.y + (0.25 - u5 * u5) * RF.r * 1.6, RF.r, RF.r * 0.95, r5 % 2 ? RF.col2 || RF.col : RF.col); }
    }
    if (B.collar && plan !== 'obj') { var CQ = P(v, HC[0] * 0.6, 0, HC[2] - hr * 0.84), CI = it(CQ.d + 0.3); CI.e(CQ.x, CQ.y, hr * 0.8 * (0.8 + 0.2 * Math.abs(v.c)), hr * 0.2, B.collar); CI.x(ell(CQ.x + v.s * hr * 0.6, CQ.y + 3, 2.4, 2.8, '#d8d8d8')); }

    /* ---- object creatures draw themselves through a small API ---- */
    function objApi() {
      return { v: v, t: t, it: it, P: P, c: c, mood: mood, fl: fl, wide: bwK, bob: bob, face: function (U, r, dz) { HC = [0, 0, U]; hr = r; return head(HC, r, 0); }, head: head, flame: flameD, star: star, happy: happy, lying: lying, wk: wk, ph: ph, mark: function (y, dx) { if (y < topY) topY = y; if (BB) { if (y < BB.y0) BB.y0 = y; if (dx) { if (CX - dx < BB.x0) BB.x0 = CX - dx; if (CX + dx > BB.x1) BB.x1 = CX + dx; } } }, top: function (X, U, r) { var hc = [0, 0, U]; top(X, hc, r, P(v, 0, 0, U), r, r, function (a, p, out) { return S.onBall(v, hc, r, a, p, (out || 1) * 0.84); }, 1); } };
    }

    /* ---- paint ---- */
    var k = sc * KG, out = '', wrapT = 'translate(' + CX + ' ' + GY + ') scale(' + f1(k * 100) / 100 + ') translate(' + (-CX) + ' ' + (-GY) + ')';
    var shW = (Bq ? Bq.rx * 1.08 + 4 : hr * 0.9) * (B.shadowK || 1);
    if (o.shadow !== false) out += ell(CX, GY + 1, shW * k, (5.5 + shW * 0.07) * Math.min(1.6, k), '#1c2440', ' opacity=".16"');
    out += '<g class="cre-breathe"><g transform="' + wrapT + '"' + (fl.thin ? ' filter="url(#' + id + 'f)"' : '') + '>' + (fl.thin ? '<filter id="' + id + 'f"><feColorMatrix type="saturate" values="0.45"/></filter>' : '') + S.paint(items) + '</g></g>';

    /* ---- conditions float above (in picture units) ---- */
    function PX(x) { return CX + (x - CX) * k; } function PY(y) { return GY + (y - GY) * k; }
    var ty2 = PY(topY), hw2 = hr * 1.1 * k;
    if (asleep || mood === 'sleepy') out += zzz(PX(P(v, HC[0], 0, 0).x) + hw2 * 0.7, ty2 + 14, t, asleep ? 1 : 0.8);
    if (fl.dirty && !o.noStink) out += stink(CX, ty2 + 8, t, shW * k);
    if (mood === 'hungry' && Bq) out += rumble(CX - (Bq.rx + 5) * k * (v.s >= 0 ? 1 : -1), PY(GY - bodyU), t, v.s >= 0 ? -1 : 1);
    if (mood === 'lazy') out += line(D('M', CX - shW * k - 8, GY - 14, 'l', -9, -2, 'M', CX - shW * k - 8, GY - 6, 'l', -10, 1), '#9aa4b2', 2.4);
    if (info.head) info.head = { x: PX(info.head.x), y: PY(info.head.y), r: info.head.r * k };
    if (info.mouth) info.mouth = { x: PX(info.mouth.x), y: PY(info.mouth.y) };
    return { svg: out, head: info.head, mouth: info.mouth, top: ty2 };
  }

  function zzz(x, y, t, k) {
    var s = '';
    for (var i = 0; i < 3; i++) { var u = ((t * 0.45 + i / 3 + 0.2) % 1), sz = (9 + u * 9) * k; s += '<text x="' + f1(x + u * 18) + '" y="' + f1(y - u * 26) + '" font-size="' + f1(sz) + '" font-weight="800" font-family="system-ui,sans-serif" fill="#7c8cf0" stroke="#fff" stroke-width=".8" paint-order="stroke" opacity="' + f1(1 - u * 0.8) + '">z</text>'; }
    return s;
  }
  /* green stink lines that curl, drift up and fade on a loop (SVG animation, so they move wherever the picture is shown) */
  function stink(x, y, t, w) {
    var s = '', col = '#7fc241';
    [[w * 0.75, 4, 0], [w * 1.05, -18, 0.6], [-w * 0.9, -4, 1.2]].forEach(function (p, i) {
      var px = f1(x + p[0]), py = f1(y + p[1]), b = '-' + p[2].toFixed(1) + 's', a = 'M' + px + ' ' + py + ' q 7 -7 0 -14 q -7 -7 0 -14', z = 'M' + px + ' ' + py + ' q -7 -7 0 -14 q 7 -7 0 -14';
      s += '<g opacity=".85"><path d="' + a + '" fill="none" stroke="' + col + '" stroke-width="3.6" stroke-linecap="round"><animate attributeName="d" values="' + a + ';' + z + ';' + a + '" dur="0.9s" begin="' + b + '" repeatCount="indefinite"/></path>' +
        '<animateTransform attributeName="transform" type="translate" values="0 8;' + (i % 2 ? -4 : 4) + ' -2;0 -12" dur="1.8s" begin="' + b + '" repeatCount="indefinite"/>' +
        '<animate attributeName="opacity" values="0;.9;.9;0" keyTimes="0;.25;.7;1" dur="1.8s" begin="' + b + '" repeatCount="indefinite"/></g>';
    });
    var fx = x + Math.cos(t * 3.1 + 1) * w * 0.9, fy = y + 20 + Math.sin(t * 4.3) * 7;
    return s + ell(fx, fy, 2.6, 2.1, '#3b3348') + ell(fx - 2.6, fy - 2.2, 2.6, 1.5, '#cfd6ff', ' opacity=".85"') + ell(fx + 2.6, fy - 2.2, 2.6, 1.5, '#cfd6ff', ' opacity=".85"');
  }
  function rumble(x, y, t, dir) {
    return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + (dir || 1) * 1.5 + ' 1.5)"><path d="M3 -4q5 2 3 7M8 -8q8 4 5 13" fill="none" stroke="#e58a3a" stroke-width="2" stroke-linecap="round"/></g>';
  }
  S.creature = creature; S.fx = { flame: flameD, star: star, zzz: zzz, stink: stink }; S.FIRE = FIRE;
})();
/*
 * SPR.build(sp, stage, palette): turns a species from creatures.js (its list of parts: ears, tail, crest, pattern...)
 * into a build for the rig: proportions for that stage plus every part, in that palette's colours. Each kind of part
 * is described once here, so a new species is still just data. ES5.
 */
(function () {
  'use strict';
  var S = window.SPR, dk = S.dk, lt = S.lt, mix = S.mix, INK = S.INK, CX = S.CX, GY = S.GY, D = S.D, ell = S.ell, path = S.path, line = S.line, f1 = S.f1, FIRE = S.FIRE;
  function pk(a, st) { return a instanceof Array ? a[st] : a; }
  function ext(a, b) { for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  var IRIS = { Fire: '#ffae2b', Water: '#3fa9ff', Leaf: '#5fcf4a', Cosmic: '#ffd84a', Mythic: '#b98cff' };

  /* proportions by body type: [baby, teen, grown] */
  var GEO = {
    cat:    [{ sc: 0.8, bl: 19.7, bw: 15, bh: 15, leg: 6.8, lw: 4.9, hr: 25, hf: 12.6 }, { sc: 0.9, bl: 22.6, bw: 16, bh: 16, leg: 7.9, lw: 5.3, hr: 25, hf: 14.3 }, { sc: 1, bl: 26.3, bw: 17, bh: 17, leg: 9.8, lw: 5.7, hr: 25, hf: 17.6 }],
    dog:    [{ sc: 0.8, bl: 18.8, bw: 16.5, bh: 15.5, leg: 5.6, lw: 5.3, hr: 25, hf: 10.9 }, { sc: 0.9, bl: 21.6, bw: 17.5, bh: 16.5, leg: 7.2, lw: 5.7, hr: 24.5, hf: 13.4 }, { sc: 1, bl: 25.4, bw: 19, bh: 18, leg: 8.6, lw: 6.2, hr: 25, hf: 16.8 }],
    bunny:  [{ sc: 0.8, bl: 17.9, bw: 15.5, bh: 15.5, leg: 5.2, lw: 5.1, hr: 25, hf: 10.9 }, { sc: 0.9, bl: 20.7, bw: 16, bh: 16, leg: 7.5, lw: 5.3, hr: 24, hf: 13.4 }, { sc: 1, bl: 23.5, bw: 17, bh: 17, leg: 9.8, lw: 5.7, hr: 24, hf: 16.0 }],
    bug:    [{ sc: 0.8, bl: 13, bw: 10.5, bh: 10, leg: 5, lw: 2.6, hr: 21, hf: 11, nlegs: 6, neckK: 1.1 }, { sc: 0.88, bl: 16, bw: 11.5, bh: 11, leg: 6, lw: 2.8, hr: 21, hf: 14, nlegs: 6, neckK: 1.1 }, { sc: 1, bl: 19, bw: 12.5, bh: 12, leg: 7, lw: 3, hr: 21, hf: 17, nlegs: 6, neckK: 1.1 }],
    bird:   [{ sc: 0.8, bl: 14, bw: 15, bh: 16, leg: 5, lw: 2.6, hr: 22, hf: 4, nlegs: 2, bodyK: 0.94, neckK: 1.3 }, { sc: 0.88, bl: 15, bw: 16, bh: 19, leg: 7, lw: 2.8, hr: 21, hf: 5, nlegs: 2, bodyK: 0.94, neckK: 1.34 }, { sc: 1, bl: 17, bw: 18, bh: 23, leg: 9, lw: 3, hr: 21, hf: 6, nlegs: 2, bodyK: 0.94, neckK: 1.38 }],
    low:    [{ sc: 0.8, bl: 22, bw: 13, bh: 10.5, leg: 5, lw: 4.8, hr: 23, hf: 19, neckK: 1.15 }, { sc: 0.9, bl: 25, bw: 14, bh: 11.5, leg: 6, lw: 5.2, hr: 23, hf: 21, neckK: 1.15 }, { sc: 1, bl: 28, bw: 15, bh: 12.5, leg: 7, lw: 5.6, hr: 23, hf: 24, neckK: 1.2 }],
    blob:   [{ sc: 0.8, hr: 31, foot: 5 }, { sc: 0.88, hr: 34, foot: 5.5 }, { sc: 1, hr: 37, foot: 6 }]
  };
  var SPOTS = [[0.3, 35, 3.6], [-0.3, -30, 4], [-0.55, 20, 3.2], [0.0, -65, 3.4], [0.5, 70, 3], [-0.5, -70, 3.4], [0.0, 10, 3], [-0.75, -10, 3.2]];
  var HSPOTS = [[-22, 56, 2.4], [22, 56, 2.4], [180, 30, 3], [150, 5, 2.6], [210, 5, 2.6], [180, -20, 2.6], [125, 30, 2.4], [235, 30, 2.4]];
  var LADY = [[0.3, 42, 4.2], [0.3, -42, 4.2], [-0.4, 48, 4.6], [-0.4, -48, 4.6], [-0.78, 0, 3.8], [0.72, 0, 3]];

  function colours(sp, p) {
    var body = p.main, dark = S.lum(body) < 0.36, cat = sp.family === 'cat' || sp.id === 'bunny' || sp.id === 'cupcat';
    return {
      body: body, bodyc: dk(body, 0.09), leg: dk(body, 0.15), belly: sp.belly || p.light, dark: p.dark, accent: p.accent, light: p.light,
      inner: sp.innerEar || mix(p.light, '#ff9aa8', 0.55), eye: INK, iris: sp.eye || IRIS[sp.type] || '#59b6ff',
      nose: cat ? (dark ? '#f08aa0' : '#e0647a') : INK, blush: '#ff8fa3', paw: cat ? mix(body, p.light, 0.75) : dk(body, 0.04), fluff: p.light, mouth: '#b04a5a',
      foot: sp.footColor || '#f29b38'
    };
  }

  function ears(sp, st, c) {
    switch (sp.ears) {
      case 'pointy': return { type: 'point', w: 9.5, h: [24, 27, 31][st], a: 54, p: 38, tilt: 14, inner: st === 2 && sp.id === 'fox' ? c.accent : c.inner };
      case 'cat': return { type: 'point', sharp: 1, w: 9.5, h: [19, 21, 23][st], a: 57, p: 38, tilt: 14 };
      case 'tuft': return { type: 'point', sharp: 1, w: 9, h: [19, 22, 25][st], a: 58, p: 38, tilt: 14, tip: sp.tipColor || c.dark, tuft: [0.1, 0.14, 0.18][st] };
      case 'perk': return { type: 'point', w: 8.6, h: [17, 19, 21][st], a: 52, p: 42, tilt: 9 };
      case 'round': return { type: 'round', w: [7.5, 8, 8.5][st], h: [14, 15, 16][st], a: 58, p: 40, tilt: 12 };
      case 'fold': return { type: 'fold', w: 8.5, h: 10, a: 56, p: 44, tilt: 22, droop: 6 };
      case 'long': return { type: 'long', w: [7.8, 8.2, 8.6][st], h: [28, 34, 40][st], a: 44, p: 52, tilt: 13, inner: st === 2 ? c.accent : c.inner };
      case 'floppy': return { type: 'flop', w: [6.5, 7, 7.5][st], h: [14, 17, 19][st], a: 80, p: 36, col: sp.earColor || c.dark };
      case 'poof': return { type: 'poof', w: 7.5, h: [13, 17, 21][st], n: 2 + st, a: 84, p: 30, col: c.light };
      case 'antennae': return { type: 'antennae', h: [9, 12, 15][st], ball: [3, 3.5, 4][st], tip: c.accent };
      case 'stalks': return { type: 'stalks', h: [10, 13, 16][st], ball: [3.6, 4.2, 4.8][st], tip: c.accent, w: 4.6, out: 0.5 };
      case 'feathery': return { type: 'feathery', h: [11, 14, 17][st], col: c.dark, w: 2.4 };
      case 'owltuft': return { type: 'point', sharp: 1, w: 6.5, h: [11, 13, 15][st], a: 50, p: 50, tilt: 34, inner: 0 };
      case 'gills': return { type: 'gills', h: [9, 11, 13][st], col: c.accent };
      case 'batears': return { type: 'point', w: 10.5, h: [26, 29, 33][st], a: 54, p: 34, tilt: 18 };
      case 'fin': return { type: 'fin', w: 8, h: [11, 14, 17][st], a: 80, p: 24, tilt: 40, col: c.accent };
      case 'bumps': return { type: 'bumps', a: 34, p: 56 };
    }
    return { type: 'none' };
  }

  function tails(sp, st, c) {
    var flame = sp.crest === 'flame';
    switch (sp.tail) {
      case 'fluffy': return [{ shape: 'bushy', len: [20, 26, 32][st], r: [6.5, 7.5, 8.5][st], up: 62, curl: 0.5, tip: flame ? c.accent : c.light, tipAt: 0.7, flame: flame && st > 0 && sp.family === 'classic' ? [c.accent, lt(c.accent, 0.45), '#fff7d6'] : null }];
      case 'puff': return [{ shape: 'ball', len: [4, 5, 6][st], r: [7, 8, 9.5][st], n: 1, up: 20, col: c.light }];
      case 'cat': return [{ len: [26, 32, 40][st], r: [3.5, 3.8, 4.1][st], up: 78, curl: 1.1, tip: sp.tipColor, tipAt: 0.82, rings: sp.pattern === 'stripes' ? c.dark : null }];
      case 'lion': return [{ len: [24, 30, 36][st], r: [2.7, 3, 3.3][st], up: 70, curl: 1.2, tuft: [5, 6.2, 7.5][st], tuftCol: sp.maneColor || c.dark }];
      case 'wag': return [{ len: [11, 14, 17][st], r: [4.2, 4.6, 5][st], up: 52, curl: 0.3, tip: sp.tipColor, tipAt: 0.6 }];
      case 'curl': return [{ len: [14, 17, 20][st], r: [4.6, 5, 5.5][st], up: 78, curl: 3.1, col: dk(c.body, 0.16) }];
      case 'paddle': return [{ shape: 'paddle', len: [16, 20, 24][st], r: [6, 7, 8][st], up: 10, curl: 0.25, flat: 0.55, tip: st > 0 ? c.accent : null, tipAt: 0.8 }];
      case 'glow': return [{ type: 'glow', shape: 'bulb', len: [10, 13, 16][st], r: [6.5, 8, 9.5][st], up: 8, col: c.accent, stiff: 1, at: 0.7 }];
      case 'abdomen': return [{ shape: 'bulb', len: [12, 15, 18][st], r: [7, 8.5, 10][st], up: 6, stiff: 1, at: 0.7, col: c.bodyc }];
      case 'rod': return [{ len: [24, 32, 40][st], r: [2.8, 3.1, 3.4][st], up: 7, stiff: 1, band: c.dark, at: 0.8 }];
      case 'stinger': return [{ shape: 'bulb', len: [9, 11, 13][st], r: [6.5, 7.5, 8.5][st], up: 4, stiff: 1, at: 0.6, band: INK, col: c.bodyc, sting: [5, 6, 7][st] }];
      case 'dragon': return [{ shape: 'taper', len: [22, 29, 36][st], r: [6, 7, 8][st], up: 20, curl: 0.9, arrow: [5, 6.5, 8][st], arrowCol: c.accent }];
      case 'lizard': return [{ shape: 'taper', len: [24, 30, 36][st], r: [6, 7, 8][st], up: 4, curl: 0.5, tip: st > 0 ? c.accent : null, tipAt: 0.86 }];
      case 'snake': return [{ len: [22, 28, 34][st], r: [3.2, 3.6, 4][st], up: 62, curl: 1.0, col: '#6fae4f', band: '#5a9a3f', snake: 1 }];
      case 'kitsune': return [{ shape: 'bushy', len: [22, 26, 30][st], r: [5.5, 6, 6.5][st], up: 64, curl: 0.4, tip: c.accent, tipAt: 0.7, count: [2, 5, 9][st], spread: [22, 46, 66][st] }];
      case 'phoenix': return [{ len: [18, 23, 28][st], r: [2.4, 2.7, 3][st], up: 24, curl: -0.7, col: c.body, tip: c.accent, tipAt: 0.75, count: [1, 2, 3][st], spread: [0, 16, 26][st], fanTip: [7, 8, 9][st], stiff: 1 }];
      case 'unicorn': return [{ shape: 'bushy', len: [22, 28, 34][st], r: [5, 5.8, 6.6][st], up: 28, curl: -1.5, col: sp.maneColor || c.accent, band: sp.mane2 || c.light }];
      case 'birdtail': return [{ len: 5, r: 3.4, n: 2, up: 12, stiff: 1, at: 0.8, atU: -0.2, fanTip: [10, 13, 16][st], tip: sp.tailColor || c.body, col: c.bodyc }];
    }
    return [];
  }

  function tops(sp, st, c, B) {
    var cr = pk(sp.crest, st), fl3 = [c.accent, lt(c.accent, 0.45), '#fff7d6'], out = [];
    switch (cr) {
      case 'flame': out.push({ type: 'flame', p: 78, r: [6.5, 8, 10][st], col: fl3 }); break;
      case 'gem': out.push({ type: 'gem', p: 46, r: [2.8, 3.2, 3.6][st], col: c.accent }); break;
      case 'bolt': out.push({ type: 'bolt', p: 76, r: [2.6, 3.2, 4][st], col: c.accent }); break;
      case 'drop': out.push({ type: 'drop', p: 46, r: [2.7, 3.1, 3.5][st], col: c.accent }); if (st > 0) out.push({ type: 'crestfeather', p: 82, r: [0, 3.2, 4.4][st], n: 1, col: c.accent }); break;
      case 'snowflake': out.push({ type: 'snowflake', p: 46, r: [2.8, 3.3, 3.8][st], col: c.accent }); break;
      case 'moon': out.push({ type: 'moon', p: 46, r: [2.9, 3.4, 3.9][st], col: c.accent }); break;
      case 'bubble': out.push({ type: 'bubble', p: 84, list: [[0, -8, 4.6], [9, -19, 3.4], [-7, -25, 2.8]].slice(0, 1 + st), col: c.accent }); break;
      case 'star': out.push({ type: 'star', p: 84, r: [3.6, 4.4, 5.4][st], col: c.accent }); break;
      case 'leaf': out.push({ type: 'sprout', a: 0, p: 82, h: [10, 13, 15][st], leaf: [8, 10, 12][st], col: sp.id === 'bunny' ? '#58b85a' : mix(c.dark, '#4faf52', 0.6), stem: '#4a9a4e', bloom: st === 2 ? 'always' : 1, petal: c.accent }); break;
      case 'flower': out.push({ type: 'flower', a: 54, p: 46, r: [3, 3.6, 4.3][st], col: c.accent }); break;
      case 'pom': out.push({ type: 'pom', p: 84, r: [5, 6, 7][st], col: c.light }); break;
      case 'tuft': out.push({ type: 'tuft', p: 80, r: [3, 3.6, 4.2][st], col: c.body }); break;
      case 'bangs': B.bangs = c.light; break;
      case 'rhino': out.push({ type: 'rhino', h: [9, 14, 20][st], r: [3, 3.6, 4.2][st], col: c.accent }); break;
      case 'cardinal': out.push({ type: 'crestfeather', p: 78, r: [4, 5, 6][st], n: 1, col: c.body }); break;
      case 'plumes': if (st > 0) out.push({ type: 'plumes', r: [0, 3, 4][st], col: c.accent }); break;
      case 'bobble': out.push({ type: 'bobble', p: 84, h: [14, 18, 23][st], r: [3.4, 4, 4.8][st], col: c.accent }); break;
      case 'horns': out.push({ type: 'horns', h: [8, 12, 17][st], r: [3.4, 4, 4.6][st], col: '#f3ead8', a2: 36, p: 58 }); break;
      case 'horn': out.push({ type: 'horn', h: [12, 18, 26][st], r: [3, 3.6, 4.2][st], col: sp.hornColor || '#f2c14e' }); break;
      case 'goat': out.push({ type: 'horns', h: [9, 13, 18][st], r: [3, 3.6, 4.2][st], col: '#e6d8b4', a2: 30, p: 66 }); break;
      case 'nemes': B.nemes = { col: c.accent, stripe: sp.stripe || '#2956c9' }; if (st > 0) out.push({ type: 'uraeus', p: 62, r: [0, 2.2, 2.8][st], col: '#f2c14e' }); break;
      case 'feathers': out.push({ type: 'crestfeather', p: 80, r: [3.2, 3.8, 4.6][st], n: [1, 3, 3][st], col: c.accent, col2: c.body }); break;
      case 'leafridge': B.ridge = { n: [3, 4, 5][st], h: [5, 6.5, 8][st], w: [3.4, 4, 4.6][st], col: c.accent }; break;
      case 'hornleaf': B.ridge = { n: 6, h: 9, w: 5, col: c.accent }; out.push({ type: 'horns', h: 9, r: 3.6, col: lt(c.accent, 0.15), a2: 38, p: 60 }); break;
    }
    return out;
  }

  function muzzle(sp, st, c) {
    var m = sp.muzzle;
    if (m === 'snout') return { type: 'snout', r: [0.42, 0.43, 0.44][st], out: 1.0, p: -30, col: sp.snoutColor || c.light, nose: S.lum(sp.snoutColor || c.light) < 0.3 ? '#15101c' : INK };
    if (m === 'wide') return { type: 'wide', w: 42, p: -30 };
    if (m === 'goofy') return { type: 'goofy', w: 34, p: -26, nostrils: 0 };
    if (m === 'beak') return { type: 'beak', col: sp.beakColor || '#f2b632', r: 0.22, len: 0.42 };
    if (m) return { type: 'bump', r: 0.3, out: 1.0, p: -36 };
    return { type: 'none', p: -30 };
  }

  function build(sp, st, p) {
    st = Math.max(0, Math.min(2, st || 0));
    var c = colours(sp, p), fam = sp.family, id = sp.id, B, dark = S.lum(c.body) < 0.36, f2 = sp.face || [];
    var geo = sp.blob ? 'blob' : fam === 'cat' || id === 'starling' || id === 'kitsune' || id === 'sphinx' || id === 'chimera' || id === 'griffin' || id === 'unicorn' || id === 'fox' ? 'cat'
      : fam === 'dog' || id === 'otter' || id === 'drake' || id === 'cerberus' ? 'dog' : id === 'bunny' ? 'bunny' : fam === 'bug' ? 'bug' : (fam === 'bird' || id === 'phoenix') ? 'bird' : (sp.low || id === 'axolittle' || id === 'tadlet') ? 'low' : 'dog';
    B = ext({}, GEO[geo][st]);
    B.c = c; B.id = id; B.st = st;
    B.plan = geo === 'blob' ? 'blob' : geo === 'bird' ? 'bird' : 'quad';
    B.ears = ears(sp, st, c);
    B.tails = tails(sp, st, c);
    B.muzzle = muzzle(sp, st, c);
    B.eyes = { style: fam === 'cat' || id === 'sphinx' || id === 'cupcat' ? 'cat' : fam === 'bug' ? 'bead' : 'round', size: ([0.5, 0.48, 0.46][st]) * (sp.eyeScale || 1), a: 34, p: 5 };
    B.marks = {};
    B.tops = tops(sp, st, c, B);

    /* markings */
    if (f2.indexOf('whiskers') >= 0) B.marks.whiskers = dark ? c.light : dk(c.dark, 0.25);
    if (f2.indexOf('forehead') >= 0) B.marks.forehead = c.dark;
    if (f2.indexOf('tears') >= 0) B.marks.tears = 1;
    if (f2.indexOf('kohl') >= 0) B.marks.kohl = 1;
    if (f2.indexOf('patch') >= 0) B.marks.patch = c.dark;
    if (f2.indexOf('mask') >= 0) { B.marks.mask = c.light; B.marks.browdots = c.light; }
    if (f2.indexOf('beakmask') >= 0) B.marks.beakmask = INK;
    if (f2.indexOf('owldisc') >= 0) B.marks.owldisc = c.light;
    if (sp.fangs && st > 0) B.marks.fangs = 1;
    if (sp.pattern === 'spots') { B.pattern = { type: 'spots', col: sp.spotColor || c.dark, list: SPOTS.slice(0, 5 + st + (st === 2 ? 1 : 0)).map(function (m) { return [m[0], m[1], m[2] * (1 + st * 0.06)]; }) }; if (!sp.smooth) { B.hspots = HSPOTS.slice(0, 5 + st + (st === 2 ? 1 : 0)); B.hspotCol = sp.spotColor || c.dark; } }
    else if (sp.pattern === 'stripes') { B.pattern = { type: 'stripes', col: c.dark }; B.marks.cheeks = c.dark; }
    else if (sp.pattern === 'bee') B.pattern = { type: 'bee' };
    else if (sp.pattern === 'segments') B.pattern = { type: 'segments', col: c.dark };
    else if (sp.pattern === 'ladybug') B.pattern = { type: 'shell', list: LADY.slice(0, 2 + st * 2), col: c.accent, line: c.accent };
    else if (sp.pattern === 'beetle') B.pattern = { type: 'shell', shine: 1, line: c.dark };
    else if (sp.pattern === 'chevrons') B.pattern = { type: 'chevrons', col: c.dark };
    else if (sp.pattern === 'scales') B.pattern = { type: 'scales', col: c.dark };
    else if (sp.pattern === 'snail') B.shell = { r: [13, 16, 19][st], col: c.accent, line: dk(c.accent, 0.45) };

    /* manes and wings */
    if (sp.mane === 'lion') B.mane = { type: 'lion', col: sp.maneColor || c.dark, k: [0.62, 0.85, 1.05][st] };
    else if (sp.mane === 'unicorn') B.mane = { type: 'unicorn', col: sp.maneColor || c.accent, col2: sp.mane2 || c.light, k: [0.85, 1, 1.12][st] };
    var wt = sp.wings || (sp.crest === 'star' && st > 0 ? 'star' : null), ws = sp.wingSize ? sp.wingSize[st] : 1;
    if (wt && (sp.wingsFrom || 0) <= st) {
      var span = [22, 30, 38][st] * (ws || 1), quadW = { rest: 50, swing: 26, at: 0.32, atU: 0.78, atS: 0.5 };
      if (wt === 'bug') B.wings = [{ type: 'bug', span: span * 1.25, col: '#e3f5ff', line: '#7fa8c8', rest: 52, swing: 30, at: 0.1, atU: 0.85, atS: 0.4, sweep: 0.5 }];
      else if (wt === 'butterfly') B.wings = [{ type: 'butterfly', span: span * 1.4, col: c.accent, col3: c.body, col2: c.light, rest: 46, swing: 32, at: 0.05, atU: 0.8, atS: 0.3, sweep: 0.3 }];
      else if (wt === 'bat') B.wings = [ext({ type: 'bat', span: span * 1.2, col: c.accent, line: c.dark }, quadW)];
      else if (wt === 'leafwing') B.wings = [ext({ type: 'leaf', span: span * 0.95, col: c.accent }, quadW)];
      else if (wt === 'star') B.wings = [ext({ type: 'star', span: [0, 26, 36][st], col: c.light, col2: c.accent }, quadW)];
      else if (wt === 'feather') B.wings = [ext({ type: 'feather', span: span * 1.2, col: sp.wingColor || c.light, line: c.dark }, quadW)];
      else if (wt === 'fire') B.wings = [{ type: 'fire', span: span * 0.95, col: c.accent, col2: c.body, line: c.body, rest: 30, swing: 30, at: 0.0, atS: 0.8, atU: 0.4 }];
      else if (wt === 'folded') B.wings = [{ type: 'folded', col: sp.wingColor || c.dark, len: 0.62, h: 0.62 }];
      else if (wt === 'flipper') B.wings = [{ type: 'flipper', col: c.body, len: 0.3, h: 0.62 }];
    }

    /* what each family looks like */
    if (fam === 'cat' || id === 'cupcat') { B.fluff = [5.5, 6.5, 7.5][st]; }
    if (fam === 'dog') { B.eyes.a = 36; B.eyes.p = 6; }
    if (fam === 'bug') { B.eyes.size *= 1.12; B.eyes.a = 36; B.belly = sp.belly ? 1 : 0; if (!sp.belly) c.belly = null; if (!sp.legs6) { B.nlegs = sp.pattern === 'snail' ? 0 : 6; } c.legInk = dk(c.dark, 0.35); }
    if (geo === 'bird') { B.bellyK = 1.25; B.eyes.a = 38; B.eyes.p = 8; B.muzzle.p = -14; }
    if (geo === 'blob') { B.eyes.a = 26; B.eyes.p = 8; B.muzzle.p = -22; B.hw = 1.1; B.hh = 0.94; c.paw = sp.footColor || c.dark; }
    if (st === 2 && fam === 'classic' && (sp.crest === 'flame' || sp.crest === 'drop' || sp.crest === 'leaf')) {
      B.ruff = sp.crest === 'flame' ? { col: c.accent, col2: lt(c.accent, 0.35), r: 5, n: 5 } : sp.crest === 'leaf' ? { col: '#5fb043', col2: '#77c756', r: 5, n: 5 } : { col: c.light, r: 5.2, n: 5 };
    }
    if (sp.collar && st > 0) B.collar = '#b3262a';
    if (sp.heads === 3) B.heads = 3;

    var T = TWEAK[id]; if (T) T(B, st, c, sp, p);
    return B;
  }

  /* ---- one-off touches that make each species itself ---- */
  var TWEAK = {
    fox: function (B, st, c) { B.fluff = [5, 6, 7][st]; B.muzzle.r = 0.3; },
    otter: function (B, st, c) { B.bl *= 1.08; B.leg *= 0.8; B.ears.h *= 0.8; B.ears.w *= 0.85; B.marks.whiskers = dk(c.dark, 0.2); B.muzzle.r = 0.36; B.belly = 1; },
    bunny: function (B, st, c) { B.muzzle = { type: 'none', p: -34 }; c.nose = '#f08aa0'; },
    starling: function (B, st, c) { B.hspots = [[-30, 50, 1.6], [34, 40, 1.4], [0, 66, 1.3], [150, 30, 1.8], [210, 20, 1.5]]; B.hspotCol = c.accent; B.pattern = { type: 'spots', col: c.accent, list: [[0.3, 35, 1.8], [-0.3, -30, 2], [-0.55, 20, 1.6], [0.0, -65, 1.7], [0.5, 70, 1.5]] }; },
    lynx: function (B, st, c) { B.fluff = [7, 8.5, 10][st]; B.tails[0].tip = '#4a2f26'; B.tails[0].flame = st > 0 ? [c.accent, lt(c.accent, 0.45), '#fff7d6'] : null; c.paw = c.light; },
    sunpaw: function (B, st, c) { B.fluff = 0; B.bw *= 1.06; },
    tigrit: function (B, st, c) { B.bw *= 1.06; B.marks.forehead = c.dark; },
    foldmew: function (B, st, c) { B.hw = 1.2; B.fluff = [6.5, 7.5, 8.5][st]; },
    snowleo: function (B, st, c) { B.tails[0].len *= 1.25; B.tails[0].r *= 1.2; B.tails[0].tip = c.dark; B.tails[0].tipAt = 0.82; B.fluff = [6.5, 7.5, 9][st]; },
    bubbit: function (B, st, c, sp, p) { c.paw = p.light; B.marks.mask = p.light; B.marks.blaze = p.light; },
    cheetling: function (B, st, c) { B.bw *= 0.9; B.leg *= 1.18; B.fluff = 0; B.tails[0].rings = c.dark; },
    shadekit: function (B, st, c) { c.paw = c.body; B.fluff = [6, 7, 8][st]; },
    petalpaw: function (B, st, c) { },
    toastie: function (B, st, c) { B.leg *= 0.62; B.bl *= 1.14; B.ears.h *= 1.22; B.ears.w *= 1.1; B.tails[0].len *= 0.5; B.marks.blaze = c.light; c.paw = c.light; },
    dotty: function (B, st, c, sp) { B.leg *= 1.12; B.bw *= 0.94; B.hspots = [[-40, 40, 2.6], [30, 62, 2.2], [160, 20, 3], [205, -10, 2.4]]; B.hspotCol = sp.spotColor; },
    shibble: function (B, st, c) { B.marks.mask = c.light; B.fluff = [5, 6, 7][st]; c.fluff = c.light; B.tails[0].col = c.body; B.tails[0].r *= 1.15; },
    weenie: function (B, st, c) { B.bl *= 1.38; B.leg *= 0.6; B.hf += [6, 8, 10][st]; B.bw *= 0.88; B.bh *= 0.9; B.ears.h *= 1.15; },
    snowpup: function (B, st, c) { B.fluff = [6, 7, 8.5][st]; c.fluff = c.light; B.tails[0].r *= 1.3; B.tails[0].col = c.body; B.tails[0].tip = c.light; B.tails[0].tipAt = 0.6; B.eyes.style = 'round'; c.iris = '#6cc8ff'; c.paw = c.light; },
    poofle: function (B, st, c) { B.shag = [4.6, 5, 5.6][st]; c.fluff = c.body; B.leg *= 1.1; B.ruff = { col: c.body, col2: lt(c.body, 0.3), r: [5, 5.6, 6.4][st], n: 5 }; },
    splashpup: function (B, st, c) { B.bw *= 1.04; B.ears.col = dk(c.body, 0.2); },
    puglet: function (B, st, c) { B.ears = { type: 'flop', w: [6.5, 7, 7.5][st], h: [13, 15, 17][st], a: 80, p: 36, col: '#5b4a52' }; B.muzzle.r += 0.03; B.hw = 1.16; B.eyes.size *= 1.06; B.leg *= 0.92; B.marks.mask = 0; },
    sniffle: function (B, st, c) { B.marks.blaze = c.light; c.paw = c.light; },
    scruff: function (B, st, c) { B.fluff = [5, 6, 7][st]; B.muzzle.r += 0.04; B.ruff = st > 0 ? { col: c.light, r: [0, 4, 4.8][st], n: 3 } : null; },
    pompom: function (B, st, c) { B.shag = [5, 5.6, 6.2][st]; c.fluff = c.body; B.sc *= 0.94; B.leg *= 0.8; B.tails[0].r *= 1.25; B.tails[0].tip = c.light; B.ruff = { col: c.light, col2: c.body, r: [5.5, 6.2, 7][st], n: 5 }; B.ears.h *= 0.8; },
    mopsy: function (B, st, c) { B.shag = [4.6, 5.2, 5.8][st]; c.fluff = c.light; B.ruff = { col: c.light, r: [5, 5.6, 6.4][st], n: 5 }; },
    glowbit: function (B, st, c) { },
    dotbug: function (B, st, c, sp, p) { c.bodyc = p.main; c.body = '#4a4058'; c.light = '#f4f1ea'; B.bw *= 1.25; B.bh *= 1.15; B.bl *= 1.05; c.blush = '#ff8fa3'; },
    hornbit: function (B, st, c) { B.bw *= 1.2; B.bh *= 1.1; },
    antsy: function (B, st, c) { B.pattern = null; },
    skimmer: function (B, st, c) { B.wings = [{ type: 'bug', span: [30, 40, 50][st], col: '#e3f5ff', line: '#7fa8c8', rest: 38, swing: 34, at: 0.15, atU: 0.85, atS: 0.4, sweep: 0.2 }]; B.bw *= 0.85; },
    shellby: function (B, st, c) { B.nlegs = 0; B.leg = 0; B.bl *= 1.35; B.bh *= 0.72; B.bw *= 0.9; B.hf *= 1.25; B.neckK = 1.25; B.tails = [{ shape: 'taper', len: [8, 10, 12][st], r: [5, 5.5, 6][st], up: 0, stiff: 1, at: 0.8, atU: -0.3 }]; },
    rolly: function (B, st, c) { B.bw *= 1.2; B.bh *= 1.2; B.bl *= 1.1; },
    mothlet: function (B, st, c) { B.shag = [3.6, 4, 4.4][st]; c.fluff = c.light; B.wings[0].col = c.body; B.wings[0].col3 = dk(c.body, 0.12); B.wings[0].col2 = c.accent; },
    buzzby: function (B, st, c) { B.bw *= 1.12; B.bh *= 1.1; B.shag = [3.2, 3.6, 4][st]; c.fluff = c.body; },
    fluttle: function (B, st, c) { },
    hopsy: function (B, st, c) { B.bl *= 1.2; B.wings[0].rest = 14; B.wings[0].swing = 10; B.wings[0].col = lt(c.body, 0.35); },
    sprigbug: function (B, st, c) { B.wings = [{ type: 'leaf', span: [24, 32, 40][st], col: c.body, line: c.dark, rest: 34, swing: 24, at: 0.05, atU: 0.8, atS: 0.4, sweep: 0.5 }]; },
    tadlet: function (B, st, c, sp) { B.eyes.a = 34; B.eyes.p = 50; B.eyes.out = 1.2; B.eyes.size *= 0.86; B.eyes.blushA = 56; B.eyes.blushP = -6; B.bw *= 1.15; B.hw = 1.18; B.hh = 0.9; B.hspots = null; B.muzzle.p = -18; if (st === 0) B.tails = [{ shape: 'taper', len: 13, r: 4.5, up: 12, curl: 0.3, col: c.bodyc }]; B.belly = 1; },
    flitter: function (B, st, c) { B.wings[0].span *= 1.3; B.wings[0].atU = 0.6; B.bl *= 0.72; B.bw *= 0.78; B.bh *= 0.82; B.leg *= 0.7; B.hf *= 0.7; B.marks.fangs = 1; B.muzzle.r = 0.24; B.fluff = [4, 5, 6][st]; c.fluff = c.body; },
    axolittle: function (B, st, c) { B.tails[0].col = c.bodyc; B.eyes.a = 40; B.eyes.size *= 0.82; B.hw = 1.2; B.hh = 0.92; B.muzzle.p = -24; B.eyes.style = 'bead'; },
    chirpet: function (B, st, c, sp) { B.tails[0].tip = sp.wingColor; B.muzzle.len = 0.36; },
    waddles: function (B, st, c, sp, p) { B.bh *= 1.12; B.leg *= 0.5; B.bw *= 1.05; B.bellyK = 1.5; B.marks.mask = '#ffffff'; B.lw = 3.4; B.legS = 0.5; B.tails = [{ len: 4, r: 3.2, n: 2, up: 30, stiff: 1, at: 0.8, atU: -0.5, col: c.bodyc }]; },
    hootlet: function (B, st, c) { B.hr *= 1.1; B.hw = 1.2; B.bw *= 1.08; B.muzzle.len = 0.22; B.muzzle.r = 0.16; B.muzzle.p = -10; B.eyes.p = 6; B.eyes.a = 30; B.tails = [{ len: 4, r: 3.4, n: 2, up: 0, stiff: 1, at: 0.8, atU: -0.4, fanTip: [7, 9, 11][st], tip: c.dark, col: c.bodyc }]; },
    blubbo: function (B, st, c) { },
    chai: function (B, st, c, sp) { B.hr *= sp.headScale[st] * 0.95; B.eyes.a = 38; B.hw = 1.16; B.hh = 0.94; B.muzzle.p = -26; B.hspots = null; B.belly = 1; },
    drake: function (B, st, c) { B.belly = 1; B.muzzle.r = 0.34; B.ridge = { n: [3, 4, 5][st], h: [4, 5.5, 7][st], w: [3, 3.6, 4.2][st], col: c.accent }; },
    unicorn: function (B, st, c) { B.leg *= 1.25; B.bw *= 0.94; B.fluff = 0; B.muzzle.r = 0.34; B.muzzle.col = lt(c.accent, 0.6); c.nose = dk(c.accent, 0.2); B.eyes.style = 'round'; c.paw = c.dark; },
    sphinx: function (B, st, c) { B.fluff = 0; B.ears.h *= 0.9; B.marks.whiskers = 0; },
    cerberus: function (B, st, c) { B.bw *= 1.12; B.bl *= 1.05; B.hf -= 2; },
    chimera: function (B, st, c) { B.fluff = 0; B.bw *= 1.05; },
    griffin: function (B, st, c, sp) { B.fluff = 0; B.muzzle.hook = 1; B.muzzle.len = 0.46; B.muzzle.p = -18; B.ruff = { col: c.accent, col2: lt(c.accent, 0.3), r: [5, 5.6, 6.4][st], n: 5 }; B.marks.whiskers = 0; c.paw = '#f2b632'; },
    kitsune: function (B, st, c) { B.fluff = [5.5, 6.5, 7.5][st]; B.marks.forehead = 0; B.tops.push({ type: 'gem', p: 44, r: [2.2, 2.6, 3][st], col: c.accent }); },
    phoenix: function (B, st, c) { B.bh *= 0.94; B.leg *= 1.2; B.muzzle.hook = 1; B.muzzle.len = 0.4; }
  };

  S.build = build;
})();
/*
 * Object creatures (a pebble, an ice cube, a match, a cupcake cat, a cube of goo): each stage is a different thing,
 * drawn here in sprite units (dx from the middle, u up from the ground) with a face that slides round it as it turns.
 * SPR.buildObject(sp, stage, palette) returns the build for the rig. ES5.
 */
(function () {
  'use strict';
  var S = window.SPR, dk = S.dk, lt = S.lt, mix = S.mix, INK = S.INK, CX = S.CX, GY = S.GY, ell = S.ell, path = S.path, line = S.line, f1 = S.f1;
  /* a path from [['M', dx, u], ['L', dx, u], ['Q', dx, u, dx, u] ...]; w widens it (pudgy / thin) */
  function PD(cmds, w, ox, oy) {
    var s = '', i, j; w = w || 1; ox = ox || 0; oy = oy || 0;
    for (i = 0; i < cmds.length; i++) { s += cmds[i][0]; for (j = 1; j < cmds[i].length; j += 2) s += f1(CX + (cmds[i][j] + ox) * w) + ' ' + f1(GY - cmds[i][j + 1] - oy) + ' '; }
    return s;
  }
  function poly(pts, w) { return PD(pts.map(function (p, i) { return [i ? 'L' : 'M', p[0], p[1]]; }).concat([['Z']]), w); }
  function X(dx, w) { return CX + dx * (w || 1); }
  function Y(u) { return GY - u; }
  function sprout(A, U, r, h, leaf) { A.top({ type: 'sprout', a: 0, p: 90, h: h, leaf: leaf, col: '#6fbe58', stem: '#4a9a4e', bloom: 1, petal: A.c.accent }, U, r); }

  var SHAPES = {
    /* ---------- pebble, rock, boulder ---------- */
    rock: [
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1);
        I.e(CX, Y(16), 27 * w, 16.5, c.body);
        I.x(S.crescent(CX, Y(16), 27 * w, 16.5, 0.55, dk(c.body, 0.32), 0.5) + line(PD([['M', -19, 22], ['Q', -13, 30, -2, 31]], w), '#fff', 2.6, ' opacity=".5"'));
        sprout(A, 14, 17.5, 7, 6.5); A.mark(Y(30), 28 * w);
        A.face(16, 15);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1);
        I.p(poly([[-24, 0], [-27, 20], [-17, 37], [0, 43], [19, 38], [27, 20], [24, 0]], w), c.body);
        I.x(path(poly([[19, 38], [27, 20], [24, 0], [9, 0], [13, 25]], w), dk(c.body, 0.3), ' opacity=".55"') + path(poly([[-17, 37], [0, 43], [3, 39], [-12, 31]], w), lt(c.body, 0.4), ' opacity=".8"') +
          line(PD([['M', 12, 36], ['L', 9, 29], ['L', 13, 25], ['L', 11, 19]], w), dk(c.body, 0.45), 1.5, ' opacity=".7"'));
        sprout(A, 22, 24, 8, 7.5); A.mark(Y(44), 28 * w);
        A.face(19, 17);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), cr = c.accent;
        [[34, 38, 20], [38, 26, -12], [-37, 12, 28]].forEach(function (q) {            /* crystals */
          I.g('rotate(' + (q[2] * (q[0] > 0 ? 1 : 1)) + ' ' + f1(X(q[0], w)) + ' ' + f1(Y(q[1])) + ')');
          I.p(PD([['M', q[0] - 3.4, q[1]], ['L', q[0], q[1] + 13], ['L', q[0] + 3.4, q[1]], ['L', q[0], q[1] - 3], ['Z']], w), cr).x(path(PD([['M', q[0], q[1] + 13], ['L', q[0] + 3.4, q[1]], ['L', q[0], q[1] + 2], ['Z']], w), '#fff', ' opacity=".45"')); I.end();
        });
        I.p(poly([[-36, 0], [-40, 27], [-29, 51], [-10, 63], [13, 64], [32, 51], [40, 27], [36, 0]], w), c.body);
        I.x(path(poly([[32, 51], [40, 27], [36, 0], [19, 0], [23, 36]], w), dk(c.body, 0.3), ' opacity=".55"') + path(poly([[-29, 51], [-10, 63], [-3, 57], [-22, 43]], w), lt(c.body, 0.4), ' opacity=".8"') +
          line(PD([['M', -26, 32], ['L', -20, 27], ['L', -23, 21], ['L', -18, 17], ['M', 19, 16], ['L', 24, 21], ['L', 30, 20]], w), dk(c.body, 0.45), 1.6, ' opacity=".7"'));
        var M = A.it(-0.5); [[-15, 61, 9], [3, 65, 11], [19, 60, 8]].forEach(function (m) { M.e(X(m[0], w), Y(m[1]), m[2] * w, 4.6, '#6fbe58'); });
        A.mark(Y(70), 42 * w);
        A.face(27, 22);
      }
    ],
    /* ---------- ice cube, snowcone, iceberg ---------- */
    ice: [
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), hi = lt(c.body, 0.45), sh = dk(c.body, 0.26);
        I.p(poly([[-20, 36], [-12, 44], [28, 44], [20, 36]], w), hi);
        I.p(poly([[20, 36], [28, 44], [28, 9], [20, 0]], w), sh);
        I.p(PD([['M', -20, 3], ['Q', -20, 0, -17, 0], ['L', 17, 0], ['Q', 20, 0, 20, 3], ['L', 20, 36], ['L', -20, 36], ['Z']], w), c.body);
        I.x(line(PD([['M', -15, 30], ['L', -15, 20], ['M', -12, 32], ['L', -5, 32]], w), '#fff', 2.4, ' opacity=".85"') + path(S.fx.star(X(13, w), Y(28), 3.4, 1.4), '#fff', ' opacity=".9"') + path(S.fx.star(X(-12, w), Y(6), 2.4, 1), '#fff', ' opacity=".8"'));
        A.mark(Y(46), 29 * w);
        A.face(17, 15);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), syr = c.accent;
        I.p(poly([[-15, 27], [15, 27], [0, 0]], w), '#f4f1ea');
        I.x(line(PD([['M', -8, 26], ['L', -2, 5], ['M', 0, 27], ['L', 0, 3], ['M', 8, 26], ['L', 2, 5]], w), syr, 2.2, ' opacity=".6"'));
        var J = A.it(-0.8);
        J.p(PD([['M', -23, 30], ['Q', -27, 46, -16, 54], ['Q', -11, 65, 0, 65], ['Q', 11, 65, 16, 54], ['Q', 27, 46, 23, 30], ['Q', 16, 25, 8, 29], ['Q', 0, 24, -8, 29], ['Q', -16, 25, -23, 30], ['Z']], w), c.light);
        J.x(path(PD([['M', -18, 52], ['Q', -11, 65, 0, 65], ['Q', 12, 65, 19, 51], ['Q', 16, 46, 13, 49], ['Q', 10, 42, 6, 47], ['Q', 0, 43, -5, 48], ['Q', -9, 43, -13, 49], ['Q', -16, 46, -18, 52], ['Z']], w), syr, ' opacity=".9"') +
          [[-15, 38], [-5, 33], [9, 36], [17, 40], [0, 40]].map(function (q) { return ell(X(q[0], w), Y(q[1]), 1.2, 1.2, '#fff', ' opacity=".9"'); }).join('') + line(PD([['M', -10, 60], ['Q', -4, 63, 2, 62]], w), '#fff', 2, ' opacity=".6"'));
        A.mark(Y(67), 25 * w);
        A.face(41, 16);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1);
        I.p(poly([[-40, 4], [-32, 33], [-21, 43], [-12, 67], [0, 77], [9, 63], [21, 57], [32, 33], [40, 4]], w), c.body);
        I.x(path(poly([[0, 77], [9, 63], [21, 57], [32, 33], [40, 4], [15, 4], [13, 46]], w), dk(c.body, 0.26), ' opacity=".5"') + path(poly([[-21, 43], [-12, 67], [0, 77], [-4, 59], [-14, 39]], w), '#fff', ' opacity=".5"') +
          path(PD([['M', -17, 53], ['L', -12, 67], ['L', 0, 77], ['L', 9, 63], ['L', 15, 60], ['Q', 11, 55, 6, 58], ['Q', 2, 52, -2, 57], ['Q', -6, 51, -10, 55], ['Q', -13, 50, -17, 53], ['Z']], w), '#ffffff') +
          path(S.fx.star(X(24, w), Y(40), 3, 1.2), '#fff') + path(S.fx.star(X(-28, w), Y(16), 2.6, 1.1), '#fff'));
        var Wt = A.it(1.2); Wt.x('<rect x="' + f1(X(-48, w)) + '" y="' + f1(Y(7)) + '" width="' + f1(96 * w) + '" height="9" rx="4.5" fill="#4a9ad8" opacity=".9"/>' +
          line('M' + f1(X(-44, w)) + ' ' + f1(Y(4)) + ' q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0 q 5.5 -3.4 11 0', '#fff', 1.6));
        A.mark(Y(80), 50 * w);
        A.face(27, 20);
      }
    ],
    /* ---------- match, torch, bonfire ---------- */
    fire: [
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), hd = mix(c.body, c.dark, 0.3), fk = 1 + Math.sin(A.t * 9) * 0.08, ln = Math.sin(A.t * 5) * 1.6;
        I.p(PD([['M', -3.4, 0], ['L', 3.4, 0], ['L', 3.4, 30], ['L', -3.4, 30], ['Z']]), '#e8c88a').x(line(PD([['M', -1, 4], ['L', -1, 28]]), '#fff', 1.2, ' opacity=".5"'));
        var F = A.it(-0.9); F.p(A.flame(CX, Y(48), 9.5, fk, ln), c.body).x('<g class="cre-flicker">' + path(A.flame(CX, Y(48), 6, 1, 0), c.accent) + path(A.flame(CX, Y(48), 2.8, 1, 0), '#fffbe6') + '</g>');
        var Hd = A.it(-0.8); Hd.e(CX, Y(39), 14.5 * w, 14, hd); Hd.x(S.crescent(CX, Y(39), 14.5 * w, 14, 0.62, dk(hd, 0.3), 0.45) + ell(X(-5, w), Y(46), 3.6, 2.2, '#fff', ' opacity=".35"'));
        A.c.body = hd; A.mark(Y(68), 15 * w);
        A.face(38, 13.5);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), fk = 1 + Math.sin(A.t * 9) * 0.06, ln = Math.sin(A.t * 5) * 2.4;
        I.p(poly([[-6.5, 30], [6.5, 30], [4.5, 0], [-4.5, 0]]), '#b07d4f').x(line(PD([['M', -5.4, 20], ['L', 5.4, 20], ['M', -5, 10], ['L', 5, 10]]), '#6b4a2a', 2));
        I.e(CX, Y(31), 15, 5.6, '#c8a878');
        var F = A.it(-0.8); F.p(A.flame(CX, Y(34), 27 * w, fk, ln), c.body).x('<g class="cre-flicker">' + path(A.flame(CX, Y(33), 19 * w, 1, ln * 0.4), c.accent) + '</g>' + path(A.flame(CX, Y(60), 5, 1, 0), '#fffbe6', ' opacity=".8"'));
        A.c.body = c.accent; A.mark(Y(84), 18 * w);
        A.face(45, 14);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1.2), fk = 1 + Math.sin(A.t * 9) * 0.05, ln = Math.sin(A.t * 5) * 3;
        [-28, -14, 0, 14, 28].forEach(function (dx) { I.e(X(dx, w), Y(3.5), 8, 4.4, '#9a9189'); });
        var L = A.it(-1.1); [[-10, 1], [10, -1]].forEach(function (q) { L.g('rotate(' + q[0] * 1.6 + ' ' + CX + ' ' + f1(Y(9)) + ')'); L.p(PD([['M', -25, 5], ['L', 25, 5], ['Q', 29, 9, 25, 13], ['L', -25, 13], ['Q', -29, 9, -25, 5], ['Z']], w), '#8a5a2b'); L.x(ell(X(24 * q[1] * -1, w), Y(9), 2.2, 3, '#e8c88a')); L.end(); });
        [-1, 1].forEach(function (d) { var Sf = A.it(-1); Sf.g('rotate(' + d * 24 + ' ' + f1(X(d * 29, w)) + ' ' + f1(Y(12)) + ')'); Sf.p(A.flame(X(d * 29, w), Y(12), 13, fk, -ln * d * 0.4), c.body).x(path(A.flame(X(d * 29, w), Y(12), 7.5, 1, 0), c.accent)); Sf.end(); });
        var F = A.it(-0.8); F.p(A.flame(CX, Y(10), 44 * w, fk, ln), c.body).x('<g class="cre-flicker">' + path(A.flame(CX, Y(9), 31 * w, 1, ln * 0.4), c.accent) + '</g>');
        F.x([[-36, 62], [34, 70], [28, 50], [-30, 44]].map(function (q, i) { return ell(X(q[0], w), Y(q[1] + Math.sin(A.t * 3 + i) * 2), 1.6, 1.6, c.accent, ' opacity=".9"'); }).join(''));
        A.c.body = c.accent; A.mark(Y(90), 44 * w);
        A.face(29, 21);
      }
    ],
    /* ---------- cupcake, layer cake, party cake: each with a frosting cat on top ---------- */
    cake: [
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), s = '';
        I.p(poly([[-15, 0], [15, 0], [20, 22], [-20, 22]], w), c.accent);
        for (var i = -3; i <= 3; i++) s += line(PD([['M', i * 5.6, 21], ['L', i * 4.3, 1]], w), dk(c.accent, 0.35), 1, ' opacity=".5"');
        I.x(s); I.e(CX, Y(23), 22.5 * w, 6.5, dk(c.body, 0.1));
        A.mark(Y(40), 23 * w); A.face(37, 18); sprinkles(A, 37, 18);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1);
        tier(I, c, w, 0, 30, 29);
        A.mark(Y(40), 30 * w); A.face(46, 17.5); sprinkles(A, 46, 17.5);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), fk = 1 + Math.sin(A.t * 9) * 0.1;
        tier(I, c, w, 0, 22, 36); tier(I, c, w, 22, 42, 26);
        [-31, -19, 19, 31].forEach(function (dx, i) { var u0 = Math.abs(dx) > 26 ? 22 : 42; I.p(PD([['M', dx - 1.6, u0], ['L', dx + 1.6, u0], ['L', dx + 1.6, u0 + 9], ['L', dx - 1.6, u0 + 9], ['Z']], w), ['#ff8fb8', '#7ad0ff', '#ffd23f', '#8fe36a'][i]).p(A.flame(X(dx, w), Y(u0 + 10.5), 3.6, fk, 0), '#ffcf3f'); });
        A.mark(Y(54), 37 * w); A.face(57, 17); sprinkles(A, 57, 17);
      }
    ],
    /* ---------- goo cube, blob, giant friendly slime ---------- */
    goo: [
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1), hi = lt(c.body, 0.4), sh = dk(c.body, 0.24), wob = Math.sin(A.t * 2.4) * 0.8;
        I.p(PD([['M', -12, 3], ['Q', -12, -4, -10, -5], ['Q', -8, -4, -8, 3], ['Z'], ['M', 7, 3], ['Q', 7, -6, 9, -7], ['Q', 11, -6, 11, 3], ['Z']], w), c.body);
        I.p(poly([[-21, 38 + wob], [-13, 46 + wob], [29, 46 + wob], [21, 38 + wob]], w), hi);
        I.p(poly([[21, 38 + wob], [29, 46 + wob], [29, 9], [21, 1]], w), sh);
        I.p(PD([['M', -21, 4], ['Q', -21, 0, -17, 0], ['L', 17, 0], ['Q', 21, 0, 21, 4], ['L', 21, 38 + wob], ['L', -21, 38 + wob], ['Z']], w), c.body);
        I.x(coin(X(-10, w), Y(9)) + ell(X(11, w), Y(13), 2.4, 2.4, '#fff', ' opacity=".4"') + ell(X(15, w), Y(18), 1.4, 1.4, '#fff', ' opacity=".4"') + line(PD([['M', -16, 32], ['Q', -15, 36, -9, 36]], w), '#fff', 2.6, ' opacity=".6"'));
        A.mark(Y(48), 30 * w);
        A.face(19, 16);
      },
      function (A) {
        var c = A.c, w = A.wide, I = A.it(-1);
        I.p(PD([['M', -28, 3], ['Q', -32, 40, 0, 54], ['Q', 32, 40, 28, 3], ['Q', 21, -2, 14, 3], ['Q', 7, -3, 0, 2], ['Q', -7, -3, -14, 3], ['Q', -21, -2, -28, 3], ['Z']], w), c.body);
        I.x(coin(X(-15, w), Y(12)) + bone(X(15, w), Y(14)) + ell(X(-2, w), Y(8), 2.4, 2.4, '#fff', ' opacity=".4"') + line(PD([['M', -21, 30], ['Q', -18, 43, -7, 48]], w), '#fff', 3, ' opacity=".55"') + S.crescent(CX, Y(4), 27 * w, 6, 0.3, dk(c.body, 0.3), 0.35));
        A.mark(Y(56), 31 * w);
        A.face(25, 19);
      },
      function (A) {
        var c = A.c, w = A.wide, I, up = A.happy ? 6 : 0;
        [-1, 1].forEach(function (d) {
          var Ar = A.it(-1.1);
          Ar.p(PD([['M', d * 30, 30], ['Q', d * 50, 40, d * 46, 62 + up], ['Q', d * 52, 67 + up, d * 55, 61 + up], ['Q', d * 60, 34, d * 32, 18], ['Z']], w), c.body);
          [[44, 66], [50, 69], [55, 64]].forEach(function (q) { Ar.e(X(d * q[0], w), Y(q[1] + up), 3.6, 3.6, c.body); });
        });
        I = A.it(-1);
        I.p(PD([['M', -38, 3], ['Q', -43, 40, -27, 62], ['Q', -19, 78, 0, 79], ['Q', 19, 78, 27, 62], ['Q', 43, 40, 38, 3], ['Q', 30, -3, 22, 3], ['Q', 13, -4, 5, 2], ['Q', -4, -4, -12, 3], ['Q', -21, -3, -27, 3], ['Q', -33, -2, -38, 3], ['Z']], w), c.body);
        I.x(path(PD([['M', -26, 60], ['Q', -26, 51, -24, 49], ['Q', -22, 51, -22, 60], ['Z'], ['M', 21, 56], ['Q', 21, 48, 23, 46], ['Q', 25, 48, 25, 56], ['Z']], w), lt(c.body, 0.3), ' opacity=".7"'));
        I.x(coin(X(-23, w), Y(14)) + bone(X(22, w), Y(18)) + key(X(-8, w), Y(8)) + ell(X(10, w), Y(9), 2.6, 2.6, '#fff', ' opacity=".4"') + line(PD([['M', -29, 44], ['Q', -25, 62, -12, 71]], w), '#fff', 3.4, ' opacity=".55"') + S.crescent(CX, Y(5), 37 * w, 7, 0.3, dk(c.body, 0.3), 0.35));
        A.mark(Y(82), 62 * w);
        A.face(46, 23);
      }
    ]
  };
  function coin(x, y) { return ell(x, y, 3.8, 3.8, '#f2c14e', ' stroke="#a67c12" stroke-width="1" opacity=".9"') + line('M' + f1(x - 1) + ' ' + f1(y - 1.6) + 'l0 3.2', '#a67c12', 1, ' opacity=".8"'); }
  function bone(x, y) { return line('M' + f1(x - 4.5) + ' ' + f1(y - 1) + 'L' + f1(x + 4.5) + ' ' + f1(y + 1), '#f4efe4', 2.2, ' opacity=".9"') + [[-5, -2], [-5, 0.4], [5, -0.4], [5, 2]].map(function (q) { return ell(x + q[0], y + q[1], 1.6, 1.6, '#f4efe4', ' opacity=".9"'); }).join(''); }
  function key(x, y) { return '<circle cx="' + f1(x - 3.5) + '" cy="' + f1(y) + '" r="2.2" fill="none" stroke="#c8a44c" stroke-width="1.3"/>' + line('M' + f1(x - 1.3) + ' ' + f1(y) + 'L' + f1(x + 5) + ' ' + f1(y) + 'M' + f1(x + 3) + ' ' + f1(y) + 'l0 2.2M' + f1(x + 5) + ' ' + f1(y) + 'l0 2.2', '#c8a44c', 1.3); }
  function tier(I, c, w, u0, u1, hw) {
    var d = [['M', -hw, u1 - 3]], n = Math.round(hw / 4.5), i;
    I.p(PD([['M', -hw, u0 + 3], ['Q', -hw, u0, -hw + 3, u0], ['L', hw - 3, u0], ['Q', hw, u0, hw, u0 + 3], ['L', hw, u1], ['L', -hw, u1], ['Z']], w), c.light);
    for (i = 0; i < n; i++) { var x0 = -hw + (2 * hw) * i / n, x1 = -hw + (2 * hw) * (i + 1) / n; d.push(['Q', (x0 + x1) / 2, u1 - 3 - (i % 2 ? 9 : 5.5), x1, u1 - 3]); }
    d.push(['L', hw, u1], ['L', -hw, u1], ['Z']);
    I.x('<rect x="' + f1(X(-hw, w)) + '" y="' + f1(Y(u0 + (u1 - u0) * 0.42)) + '" width="' + f1(hw * 2 * w) + '" height="3.4" fill="' + c.body + '"/>' + path(PD(d, w), c.body));
    I.e(CX, Y(u1), hw * w, 4.2, c.body);
  }
  function sprinkles(A, U, r) {
    if (A.v.c < -0.2) return;
    var I = A.it(1.5), s = '';
    [[-0.42, 0.72, '#ff5a6e', 30], [0.3, 0.8, '#5ac8f2', -40], [0.62, 0.52, '#ffd23f', 20], [-0.68, 0.4, '#8fe36a', -20], [-0.05, 0.9, '#b58cff', 70]].forEach(function (q) {
      var x = CX + q[0] * r * 1.05 * (0.6 + 0.4 * Math.abs(A.v.c)) + A.v.s * r * 0.2, y = Y(U + q[1] * r * 0.9);
      s += '<rect x="' + f1(x - 2.2) + '" y="' + f1(y - 0.8) + '" width="4.4" height="1.7" rx=".8" fill="' + q[2] + '" transform="rotate(' + q[3] + ' ' + f1(x) + ' ' + f1(y) + ')"/>';
    });
    I.x(s);
  }

  function buildObject(sp, st, p) {
    st = Math.max(0, Math.min(2, st || 0));
    var kind = sp.goo ? 'goo' : sp.shape, cake = kind === 'cake';
    var c = { body: p.main, bodyc: p.main, leg: p.main, belly: null, dark: p.dark, accent: p.accent, light: p.light, inner: mix(p.light, '#ff9aa8', 0.55), eye: INK, iris: { Fire: '#ffae2b', Water: '#3fa9ff', Leaf: '#5fcf4a' }[sp.type] || '#59b6ff',
      nose: '#e0647a', blush: '#ff8fa3', paw: p.main, fluff: p.light, mouth: '#b04a5a' };
    var B = { plan: 'obj', id: sp.id, st: st, c: c, sc: [0.8, 0.92, 1.04][st], hr: 16, faceU: 20, faceOnly: !cake, noLie: 1, obj: SHAPES[kind][st], bl: 0, bw: 0, bh: 0, shadowK: [1.5, 1.7, 1.9][st] * (kind === 'fire' && st < 2 ? 0.55 : 1),
      eyes: { style: cake ? 'cat' : 'round', size: cake ? 0.5 : 0.56, a: cake ? 34 : 30, p: cake ? 5 : 8 }, marks: {}, tops: [],
      muzzle: cake ? { type: 'none', p: -30 } : { type: 'wide', w: 30, p: -24, nostrils: 0 } };
    if (cake) {
      B.ears = { type: 'point', sharp: 1, w: 8, h: 15, a: 56, p: 38, tilt: 14 }; B.marks.whiskers = dk(p.dark, 0.2); B.fluff = 5;
      B.tops = [{ type: 'cherry', p: 90, r: 4.2, col: '#e2283c' }]; B.hw = 1.14;
    }
    return B;
  }
  S.buildObject = buildObject;
  var build0 = S.build;
  S.build = function (sp, st, p) { return (sp.shape || sp.goo) ? buildObject(sp, st, p) : build0(sp, st, p); };
})();
/*
 * SPR.pet(sp, stage, palette, mood, opts): the finished picture of a pet, as the <svg> the rest of the game expects
 * (viewBox -6 -34 212 234, feet at 100,186). opts: view ('three' | 'front' | 'side' | 'back') or yaw, flip, frame (walk
 * frame 0..FRAMES-1), blink, wag, flap, flags, acc, noStink, glow, shine, ow. Also SPR.petSpot() for where its head is.
 */
(function () {
  'use strict';
  var S = window.SPR, CX = S.CX, GY = S.GY, FIT = {}, FRAMES = 4, YAW = { three: 20, front: 0, side: 270, back: 180 };
  /* one scale per species, so a pet is the same size whichever way it faces, and grows from stage to stage */
  function fit(sp, p) {
    if (FIT[sp.id]) return FIT[sp.id];
    var ks = [9, 9, 9], shift = [0, 0, 0];
    [0, 1, 2].forEach(function (st) {
      [0, 20, 90].forEach(function (y) {
        var bb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }, B = S.build(sp, st, p);
        S.creature(B, { yaw: y, k: 1, ow: 0, bb: bb, t: 0.3, flap: 1 });
        var w = (bb.x1 - bb.x0) / 2 * B.sc + 4, h = (GY - bb.y0) * B.sc + 5;
        ks[st] = Math.min(ks[st], 101 / w, 213 / h);
        if (y === 90) shift[st] = (CX - (bb.x0 + bb.x1) / 2) * B.sc;
      });
    });
    ks[2] = Math.min(ks[2], 2.3); ks[1] = Math.min(ks[1], ks[2] * 1.05); ks[0] = Math.min(ks[0], ks[2] * 1.1);     /* babies are drawn a little larger than life, but never as big as the grown pet */
    return (FIT[sp.id] = { k: ks, shift: shift });
  }
  function yawOf(o) { var y = o.yaw != null ? o.yaw : YAW[o.view || 'three']; if (y == null) y = 20; return o.flip ? 360 - y : y; }
  function star(cx, cy, R, r) { return '<path d="' + S.fx.star(cx, cy, R, r) + '" fill="#ffe27a"/>'; }
  function pet(sp, st, p, mood, o) {
    o = o || {}; st = Math.max(0, Math.min(2, st || 0));
    var F = fit(sp, sp.palettes[0]), yaw = yawOf(o), B = S.build(sp, st, p), walking = o.frame != null;
    var r = S.creature(B, { yaw: yaw, k: F.k[st], t: o.t == null ? 0.3 : o.t, walk: walking ? 1 : 0, phase: walking ? (o.frame % FRAMES) / FRAMES : null, mood: mood || 'ok', flags: o.flags, blink: o.blink,
      wag: o.wag != null ? o.wag : (o.tailRot ? o.tailRot / 7 * 0.3 : 0), flap: o.flap != null ? o.flap : (o.wingFlap ? -0.6 : 0.5), acc: o.acc, noStink: o.noStink, ow: o.ow, fly: o.fly });
    var dx = F.shift[st] * F.k[st] * Math.sin(yaw * Math.PI / 180), s = dx ? '<g transform="translate(' + S.f1(dx) + ' 0)">' + r.svg + '</g>' : r.svg;
    if (sp.rare || o.glow) s = '<g opacity=".85">' + star(18, 20, 7, 3) + star(186, 50, 5, 2) + star(170, 150, 4, 1.8) + '</g>' + s;
    if (o.shine) s += '<path d="M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#ffe27a"/><path d="M168 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" fill="#ffe27a"/>';
    r.dx = dx;
    r.svg = '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '" class="cre">' + s + '</svg>';
    return r;
  }
  S.pet = pet; S.petFrames = FRAMES;
  S.petSvg = function (sp, st, p, mood, o) { return pet(sp, st, p, mood, o).svg; };
  S.petSpot = function (sp, st, view) { var r = pet(sp, st, sp.palettes[0], 'ok', { view: view || 'three' }); return { head: r.head && { x: r.head.x + r.dx, y: r.head.y, r: r.head.r }, mouth: r.mouth && { x: r.mouth.x + r.dx, y: r.mouth.y } }; };
})();
/*
 * SPR.person(k, opts): a person (the kids' characters, grown-ups, shopkeepers) on the same turnable rig as the pets.
 * k holds the look with colours already chosen: { h: 'tiny'|'small'|'medium'|'tall', hs, build, skin, hair, hairCol,
 *   hairFx, hair2, bangs, tendrils, eyes, face, top, topCol, topPat, topInk, bottom, pantsCol, pantsPat, pantsInk,
 *   shoes, shoeCol, acc }.
 * opts: view ('three'|'front'|'side'|'back') or yaw, flip, frame (walk frame 0..3), t, blink, abs (true sizes instead
 *   of filling the frame), ow (outline width). Returns the <svg> (viewBox 0 0 120 160, feet at 60,153). ES5.
 */
(function () {
  'use strict';
  var S = window.SPR, f1 = S.f1, P = S.P, ell = S.ell, path = S.path, line = S.line, D = S.D, dk = S.dk, lt = S.lt, mix = S.mix, INK = S.INK, CX = S.CX, GY = S.GY;
  var TAU = Math.PI * 2, YAW = { three: 28, front: 0, side: 270, back: 180 };
  var SIZE = { tiny: { hip: 15, th: 23, hr: 24.5 }, small: { hip: 23, th: 29, hr: 26 }, medium: { hip: 32, th: 34, hr: 25 }, tall: { hip: 44, th: 41, hr: 24 } };
  var BUILD = { slim: 0.86, medium: 1, large: 1.16 };
  var LONGSLEEVE = { hoodie: 1, suit: 1, karate: 1, hero: 1, space: 1, wizard: 1, jacket: 1, sweater: 1, chef: 1 };
  var ROBE = { gown: 1, wizard: 1 }, LEGSUIT = { karate: 1, hero: 1, space: 1 };
  var TOPX = { short: 6, spiky: 8, long: 6, ponytail: 6, curly: 13, buns: 15, bun: 22, wavy: 6, longcurly: 13, bob: 6, pigtails: 6, bald: 1, pixie: 6, buzz: 2, afro: 22, puffs: 18, braids: 6 };   /* how far each hairstyle stands above the head */
  var PAT = { dots: [8, '<circle cx="4" cy="4" r="1.7"/>'], stripes: [6, '<rect x="0" y="0" width="6" height="2.6"/>'],
    plaid: [9, '<rect x="0" y="0" width="9" height="2.2" opacity=".55"/><rect x="0" y="0" width="2.2" height="9" opacity=".55"/>'],
    stars: [10, '<path d="M5 1.2 L6.1 4 L9 4.1 L6.7 5.9 L7.5 8.8 L5 7.1 L2.5 8.8 L3.3 5.9 L1 4.1 L3.9 4 Z"/>'],
    hearts: [10, '<path d="M5 8.4 C1.5 6 1.2 3.4 3 2.6 C4 2.2 4.7 2.8 5 3.4 C5.3 2.8 6 2.2 7 2.6 C8.8 3.4 8.5 6 5 8.4 Z"/>'],
    camo: [18, '<path d="M2 3 Q6 0 9 4 Q11 8 6 8 Q1 8 2 3 Z M11 11 Q15 9 17 13 Q16 17 12 16 Q9 14 11 11 Z" opacity=".6"/><path d="M12 2 Q16 1 16 5 Q13 7 11 5 Z M1 12 Q5 11 6 15 Q3 18 1 15 Z"/>'] };
  function tall(k) { var Z = SIZE[k.h] || SIZE.small; return Z.hip + Z.th - 5 + Z.hr * 0.86 + Z.hr * 0.92 + (TOPX[k.hair] == null ? 6 : TOPX[k.hair]) + (k.acc === 'bow' ? 6 : k.acc === 'chefhat' ? 26 : k.acc === 'beanie' ? 6 : 0); }

  function wide(k) { var hr = (SIZE[k.h] || SIZE.small).hr, st = k.hair; return st === 'afro' ? hr * 1.5 + 6 : st === 'puffs' ? hr * 1.5 + 6 : st === 'braids' ? hr * 1.25 + 8 : st === 'ponytail' || st === 'pigtails' ? hr * 1.35 + 9 : st === 'curly' || st === 'longcurly' ? hr * 1.36 + 4 : st === 'long' || st === 'wavy' || st === 'bob' ? hr * 1.2 + 7 : hr * 1.13 + 7; }
  function fitK(k) { return Math.min(146 / tall(k), 58 / wide(k)); }
  function person(k, o) {
    k = k || {}; o = o || {};
    var yaw = o.yaw != null ? o.yaw : YAW[o.view || 'three']; if (yaw == null) yaw = 28; if (o.flip) yaw = 360 - yaw;
    var v = S.view(yaw), t = o.t == null ? 0.3 : o.t, walking = o.frame != null, wk = walking ? 1 : (o.walk || 0);
    var Z = SIZE[k.h] || SIZE.small, bx = BUILD[k.build] || 1, hr = Z.hr, hipU = Z.hip, th = Z.th;
    var kk = o.abs ? Math.min(fitK({ h: 'medium', hair: k.hair, acc: k.acc }) * (k.hs || 1), 58 / wide(k)) : fitK(k), OW = (o.ow == null ? 1.7 : o.ow) / kk;
    var c = { skin: k.skin || '#f5c9a3', hair: k.hairCol || '#5a3a22', top: k.topCol || '#4fb65f', pants: k.pantsCol || '#3b4a6b', shoe: k.shoeCol || '#2b2233', eye: INK, blush: '#ff8fa3' };
    var top = k.top || 'tee', bottom = k.bottom || 'pants', style = k.hair || 'short', id = S.uid(), items = [], defs = '';
    function it(d) { var i = new S.Item(d, OW, null); items.push(i); return i; }
    function far(sd) { return sd * -v.s < -0.3; }
    var ph = (walking ? (o.frame % 4) / 4 : t * 2) * TAU, sw = Math.sin(ph), bob = wk * Math.abs(sw) * 1.5;
    var torsoU = hipU + th / 2 - 2 + bob, headU = hipU + th - 5 + hr * 0.86 + bob + (wk ? Math.sin(ph * 2 + 0.8) * 0.5 : Math.sin(t * 1.8) * 0.3);
    var tw = (12.5 + 3 * Math.abs(v.c)) * bx, frontish = v.c > 0.25, backish = v.c < -0.25, fx = v.s * 5 * bx;   /* fx: where the chest's middle is as the body turns */
    var robe = !!ROBE[top], dress = top === 'dress' || robe, skirt = !dress && !LEGSUIT[top] && (bottom === 'skirt' || bottom === 'tutu'), tutu = skirt && bottom === 'tutu', shorts = !dress && !LEGSUIT[top] && bottom === 'shorts';
    var legCol = tutu ? c.pants : dress || skirt ? c.skin : LEGSUIT[top] ? c.top : c.pants, hat = dress || LEGSUIT[top] ? c.top : c.pants, hatD = dk(hat, 0.3);
    function pat(key, name, ink) { var q = PAT[name]; if (!q) return ''; defs += '<pattern id="' + id + key + '" width="' + q[0] + '" height="' + q[0] + '" patternUnits="userSpaceOnUse"><g fill="' + ink + '">' + q[1] + '</g></pattern>'; return 'url(#' + id + key + ')'; }
    var tFill = pat('t', k.topPat, k.topInk || '#fff'), pFill = pat('p', k.pantsPat, k.pantsInk || '#fff');

    /* ---- legs and shoes ---- */
    var legW = (bottom === 'leggings' && !dress && !LEGSUIT[top] ? 8.6 : 10) * Math.sqrt(bx), shoes = k.shoes || 'sneakers';
    [-1, 1].forEach(function (sd) {
      var swing = wk * 6.5 * sw * sd, lift = wk * Math.max(0, Math.cos(ph) * sd) * 5, fr = far(sd);
      var hip = P(v, 0, sd * 6.2 * bx, hipU + bob), foot = P(v, swing, sd * 6.8 * bx, lift), toe = P(v, swing + 4.5, sd * 6.8 * bx, lift), knee = { x: (hip.x + foot.x) / 2, y: (hip.y + foot.y - 6) / 2 };
      var I = it(dress || skirt ? Math.min(foot.d - 0.3, -0.6) : foot.d - 0.3), col = fr ? dk(legCol, 0.14) : legCol, sc2 = fr ? dk(c.shoe, 0.16) : c.shoe;
      I.l(D('M', hip.x, hip.y, 'L', foot.x, foot.y - 6), legW, shorts ? (fr ? dk(c.skin, 0.14) : c.skin) : col);
      if (shorts) I.l(D('M', hip.x, hip.y, 'L', knee.x, knee.y - 2), legW + 1.6, fr ? dk(c.pants, 0.14) : c.pants);
      if (bottom === 'cargo' && !dress && !LEGSUIT[top] && !skirt && !shorts && !fr) I.x('<rect x="' + f1(knee.x - 3.4 + sd * 2 * Math.abs(v.c)) + '" y="' + f1(knee.y - 4) + '" width="6.8" height="6.4" rx="1.4" fill="' + dk(c.pants, 0.16) + '"/>' + line(D('M', knee.x - 3 + sd * 2 * Math.abs(v.c), knee.y - 2.6, 'l', 6, 0), dk(c.pants, 0.3), 1));
      var sx = (foot.x + toe.x) / 2, sy = (foot.y + toe.y) / 2 - 4, srx = 6.4 + 3.2 * Math.abs(v.s), sry = 5.2, tallBoot = shoes === 'boots' || shoes === 'cowboy' ? 9 : shoes === 'ankle' ? 5 : shoes === 'hightops' || shoes === 'skates' ? 5.5 : 0;
      if (tallBoot) I.l(D('M', foot.x, foot.y - 6 - tallBoot, 'L', foot.x, foot.y - 5), legW + 1.4, sc2);
      if (shoes === 'flats') I.e(sx, sy + 2.4, srx * 0.92, sry * 0.6, sc2);
      else if (shoes === 'sandals') { var skf = fr ? dk(c.skin, 0.14) : c.skin; I.e(sx, sy + 2.6, srx * 0.95, sry * 0.6, skf); I.x('<rect x="' + f1(sx - srx) + '" y="' + f1(sy + 3.6) + '" width="' + f1(srx * 2) + '" height="2.4" rx="1.2" fill="' + sc2 + '"/>' + line(D('M', sx - srx * 0.7, sy + 1.6, 'L', sx + srx * 0.7, sy + 1.6, 'M', sx, sy + 1.6, 'L', sx, sy + 3.8), sc2, 1.8)); }
      else {
        if (shoes === 'lightup') I.x(ell(sx, sy + 3.4, srx + 4, sry * 0.9, '#fff27a', ' opacity=".45"'));
        I.e(sx, sy + 2.6, srx + 0.8, sry * 0.62, shoes === 'boots' || shoes === 'cowboy' || shoes === 'ankle' ? dk(c.shoe, 0.35) : shoes === 'lightup' ? '#ffe94a' : '#ffffff');
        I.p(D('M', sx - srx, sy + 2, 'A', srx, sry, 0, 0, 1, sx + srx, sy + 2, 'Z'), sc2);
        if (shoes === 'skates') I.x(ell(sx - srx * 0.5, sy + 5.6, 2.3, 2.3, '#f2c14e') + ell(sx + srx * 0.5, sy + 5.6, 2.3, 2.3, '#f2c14e'));
        if (shoes === 'sneakers' || shoes === 'hightops') I.x(line(D('M', sx - srx * 0.3, sy - 1.6, 'l', srx * 0.5, 0), '#fff', 1.3, ' opacity=".7"'));
      }
    });

    /* ---- cape (hero) and hood (hoodie) hang behind ---- */
    var Tq = P(v, 0, 0, torsoU), topY = Tq.y - th / 2 - 1, botY = Tq.y + th / 2 + 1;
    if (top === 'hero') { var cq = P(v, -7, 0, torsoU), CI = it(cq.d - 0.1); CI.p(D('M', cq.x - tw * 0.9, topY + 3, 'L', cq.x - tw - 5 + Math.sin(t * 2) * 1.2, botY + 9, 'Q', cq.x, botY + 13, cq.x + tw + 5 + Math.sin(t * 2 + 1) * 1.2, botY + 9, 'L', cq.x + tw * 0.9, topY + 3, 'Z'), '#e45757'); }
    if (top === 'hoodie') { var hq = P(v, -7.5, 0, torsoU + th / 2 - 2), HI0 = it(hq.d - 0.05); HI0.e(hq.x, hq.y, tw * 0.82, 7.5, dk(c.top, 0.14)); }

    /* ---- skirt (its own colour) ---- */
    if (tutu) { var TU = it(Tq.d - 0.02), ty0 = botY - 8, tl = lt(c.pants, 0.35), tsx = tw + 9; TU.p(D('M', Tq.x - tw + 1, ty0, 'Q', Tq.x - tsx - 3, ty0 + 6, Tq.x - tsx, ty0 + 10, 'Q', Tq.x - tsx * 0.5, ty0 + 13, Tq.x, ty0 + 11, 'Q', Tq.x + tsx * 0.5, ty0 + 13, Tq.x + tsx, ty0 + 10, 'Q', Tq.x + tsx + 3, ty0 + 6, Tq.x + tw - 1, ty0, 'Z'), tl);
      TU.x(line(D('M', Tq.x - tsx + 3, ty0 + 6, 'Q', Tq.x, ty0 + 10, Tq.x + tsx - 3, ty0 + 6), '#fff', 1.4, ' opacity=".6"')); }
    if (skirt && !tutu) { var SK = it(Tq.d - 0.02), sy0 = botY - 9, sy1 = GY - hipU + 10 - bob; SK.p(D('M', Tq.x - tw + 1, sy0, 'L', Tq.x - tw - 6, sy1, 'Q', Tq.x, sy1 + 5, Tq.x + tw + 6, sy1, 'L', Tq.x + tw - 1, sy0, 'Z'), c.pants); if (pFill) SK.x(path(D('M', Tq.x - tw + 1, sy0, 'L', Tq.x - tw - 6, sy1, 'Q', Tq.x, sy1 + 5, Tq.x + tw + 6, sy1, 'L', Tq.x + tw - 1, sy0, 'Z'), pFill)); }

    /* ---- torso ---- */
    var TI = it(Tq.d), ts = '', hem = robe ? GY - 3 : dress ? GY - hipU + 11 - bob : 0, flare = robe ? 9 : 7;
    if (dress) TI.p(D('M', Tq.x - tw, Tq.y - 2, 'L', Tq.x - tw - flare, hem, 'Q', Tq.x, hem + 5, Tq.x + tw + flare, hem, 'L', Tq.x + tw, Tq.y - 2, 'Z'), c.top);
    TI.r(Tq.x, Tq.y, tw * 2, th + 2, 9.5, c.top);
    if (tFill) { ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(Tq.y - th / 2 - 1) + '" width="' + f1(tw * 2) + '" height="' + f1(th + 2) + '" rx="9.5" fill="' + tFill + '"/>'; if (dress) ts += path(D('M', Tq.x - tw, Tq.y + 2, 'L', Tq.x - tw - flare, hem, 'Q', Tq.x, hem + 5, Tq.x + tw + flare, hem, 'L', Tq.x + tw, Tq.y + 2, 'Z'), tFill); }
    ts += '<clipPath id="' + id + 'tc"><rect x="' + f1(Tq.x - tw) + '" y="' + f1(Tq.y - th / 2 - 1) + '" width="' + f1(tw * 2) + '" height="' + f1(th + 2) + '" rx="9.5"/></clipPath><g clip-path="url(#' + id + 'tc)">';
    if (!dress) ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(botY - 9) + '" width="' + f1(tw * 2) + '" height="10" fill="' + (LEGSUIT[top] ? dk(c.top, 0.12) : skirt ? c.pants : c.pants) + '"/>' + (pFill && !LEGSUIT[top] ? '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(botY - 9) + '" width="' + f1(tw * 2) + '" height="10" fill="' + pFill + '"/>' : '');
    var cx0 = Tq.x + fx, w0 = Math.max(0.35, v.c);                   /* chest details face forward, and narrow as the body turns */
    if (frontish) {
      if (top === 'tee' || top === 'apron' || top === 'dress' || top === 'jersey' || top === 'gown') ts += path(D('M', cx0 - 6 * w0, topY, 'Q', cx0, topY + 9, cx0 + 6 * w0, topY, 'Z'), top === 'jersey' ? '#fff' : c.skin);
      if (top === 'hoodie') ts += path(D('M', cx0 - 8 * w0, topY, 'Q', cx0, topY + 13, cx0 + 8 * w0, topY, 'Z'), dk(c.top, 0.16)) + line(D('M', cx0 - 3 * w0, topY + 6, 'l', 0, 8, 'M', cx0 + 3 * w0, topY + 6, 'l', 0, 8), '#f4f1ea', 1.5) + '<rect x="' + f1(cx0 - 8 * w0) + '" y="' + f1(Tq.y + 1) + '" width="' + f1(16 * w0) + '" height="8" rx="3" fill="' + dk(c.top, 0.16) + '"/>';
      if (top === 'suit') ts += path(D('M', cx0 - 7 * w0, topY, 'L', cx0, topY + 17, 'L', cx0 + 7 * w0, topY, 'Z'), '#fafafa') + path(D('M', cx0 - 2 * w0, topY + 3, 'L', cx0 + 2 * w0, topY + 3, 'L', cx0 + 2.6 * w0, topY + 15, 'L', cx0, topY + 18.5, 'L', cx0 - 2.6 * w0, topY + 15, 'Z'), dk(c.top, 0.45)) + ell(cx0 - 3.4 * w0, Tq.y + 7, 1, 1, dk(c.top, 0.45)) + ell(cx0 + 3.4 * w0, Tq.y + 7, 1, 1, dk(c.top, 0.45));
      if (top === 'apron') ts += '<rect x="' + f1(cx0 - 9 * w0) + '" y="' + f1(topY + 9) + '" width="' + f1(18 * w0) + '" height="' + f1(th - 6) + '" rx="2.5" fill="#f7f3ea"/>' + line(D('M', cx0 - 7 * w0, topY + 9, 'L', cx0 - 5 * w0, topY, 'M', cx0 + 7 * w0, topY + 9, 'L', cx0 + 5 * w0, topY), '#f7f3ea', 2) + '<rect x="' + f1(cx0 - 4.5 * w0) + '" y="' + f1(Tq.y + 1) + '" width="' + f1(9 * w0) + '" height="5.5" rx="1.5" fill="none" stroke="#cfc6b4" stroke-width="1.2"/>';
      if (top === 'jacket') ts += '<rect x="' + f1(cx0 - 5.5 * w0) + '" y="' + f1(topY) + '" width="' + f1(11 * w0) + '" height="' + f1(th + 2) + '" fill="' + (k.top2 || '#f7f3ea') + '"/>' + line(D('M', cx0 - 5.5 * w0, topY, 'L', cx0 - 5.5 * w0, botY, 'M', cx0 + 5.5 * w0, topY, 'L', cx0 + 5.5 * w0, botY), dk(c.top, 0.3), 1.6) + path(D('M', cx0 - 5.5 * w0, topY, 'L', cx0 - 9 * w0, topY + 9, 'L', cx0 - 5.5 * w0, topY + 12, 'Z'), dk(c.top, 0.14)) + path(D('M', cx0 + 5.5 * w0, topY, 'L', cx0 + 9 * w0, topY + 9, 'L', cx0 + 5.5 * w0, topY + 12, 'Z'), dk(c.top, 0.14));
      if (top === 'sweater') ts += path(D('M', cx0 - 6.5 * w0, topY, 'Q', cx0, topY + 8, cx0 + 6.5 * w0, topY, 'Z'), c.skin) + line(D('M', cx0 - 7 * w0, topY + 0.5, 'Q', cx0, topY + 9.5, cx0 + 7 * w0, topY + 0.5), dk(c.top, 0.2), 2.2) + path(D('M', cx0 - 7 * w0, Tq.y - 1, 'l', 3.5 * w0, 4, 'l', 3.5 * w0, -4, 'l', 3.5 * w0, 4, 'l', 3.5 * w0, -4), 'none', ' stroke="' + (k.top2 || lt(c.top, 0.45)) + '" stroke-width="2.4" stroke-linejoin="round"');
      if (top === 'chef') ts += path(D('M', cx0 - 6 * w0, topY, 'Q', cx0, topY + 8, cx0 + 6 * w0, topY, 'Z'), c.skin) + path(D('M', cx0 - 7 * w0, topY + 1, 'L', cx0, topY + 9, 'L', cx0 + 7 * w0, topY + 1, 'L', cx0 + 3 * w0, topY + 12, 'L', cx0 - 3 * w0, topY + 12, 'Z'), k.top2 || '#e45757') + [-1, 1].map(function (sd) { return [0, 1, 2].map(function (j) { return ell(cx0 + sd * 4.5 * w0, topY + 14 + j * 5.5, 1.3, 1.3, dk(c.top, 0.35)); }).join(''); }).join('');
      if (top === 'karate') ts += line(D('M', cx0 - 7 * w0, topY, 'L', cx0 + 1.5 * w0, Tq.y + 2, 'M', cx0 + 7 * w0, topY, 'L', cx0, topY + 9), dk(c.top, 0.28), 2);
      if (top === 'hero') ts += path(S.fx.star(cx0, Tq.y - 3, 6 * Math.max(0.6, w0), 2.6 * Math.max(0.6, w0)), '#ffd84a');
      if (top === 'space') ts += '<rect x="' + f1(cx0 - 6 * w0) + '" y="' + f1(Tq.y - 5) + '" width="' + f1(12 * w0) + '" height="8" rx="2" fill="#e8eef5"/>' + ell(cx0 - 3 * w0, Tq.y - 1, 1.3, 1.3, '#e45757') + ell(cx0, Tq.y - 1, 1.3, 1.3, '#4fb65f') + ell(cx0 + 3 * w0, Tq.y - 1, 1.3, 1.3, '#3a8ed8');
      if (top === 'jersey') ts += '<text x="' + f1(cx0) + '" y="' + f1(Tq.y + 4) + '" font-size="12" font-weight="800" font-family="system-ui,sans-serif" text-anchor="middle" fill="#fff">7</text>';
    } else if (backish && top === 'jersey') ts += '<text x="' + f1(Tq.x - fx) + '" y="' + f1(Tq.y + 4) + '" font-size="12" font-weight="800" font-family="system-ui,sans-serif" text-anchor="middle" fill="#fff">7</text>';
    if (top === 'sweater') ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(botY - 13) + '" width="' + f1(tw * 2) + '" height="3" fill="' + dk(c.top, 0.18) + '"/>';
    if (top === 'karate') ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(Tq.y + 3) + '" width="' + f1(tw * 2) + '" height="4.4" fill="#2b2233"/>';
    if (top === 'space') ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(topY) + '" width="' + f1(tw * 2) + '" height="4.5" fill="#c0c6cf"/>';
    if (top === 'wizard' || top === 'gown') ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(Tq.y + 4) + '" width="' + f1(tw * 2) + '" height="3.6" fill="' + (top === 'wizard' ? '#f2c14e' : lt(c.top, 0.45)) + '"/>';
    ts += '<rect x="' + f1(Tq.x - tw) + '" y="' + f1(Tq.y + th * 0.24) + '" width="' + f1(tw * 2) + '" height="' + f1(th) + '" fill="' + dk(c.top, 0.4) + '" opacity=".16"/></g>';
    if (top === 'wizard') [[-0.5, 0.35], [0.45, 0.6], [-0.1, 0.8], [0.6, 0.2]].forEach(function (q) { ts += path(S.fx.star(Tq.x + q[0] * (tw + 4), Tq.y + (hem - Tq.y) * q[1], 2.6, 1.1), '#f2c14e'); });
    if (top === 'gown') [[-0.4, 0.5], [0.3, 0.75], [0.55, 0.4]].forEach(function (q) { ts += path(S.fx.star(Tq.x + q[0] * (tw + 4), Tq.y + (hem - Tq.y) * q[1], 2.2, 0.9), '#fff', ' opacity=".8"'); });
    TI.x(ts);

    /* ---- arms swing against the legs ---- */
    var longS = !!LONGSLEEVE[top], armW = 8.8 * Math.sqrt(bx);
    [-1, 1].forEach(function (sd) {
      var swing = -wk * 6 * sw * sd, sh = P(v, 0, sd * (tw + 2.4) * 0.92, torsoU + th / 2 - 6), el = P(v, swing * 0.5, sd * (tw + 5), torsoU - 1), hand = P(v, swing, sd * (tw + 6), torsoU - th * 0.36), fr = far(sd);
      var I = it(hand.d + (fr ? -0.2 : 0.4)), tc = fr ? dk(c.top, 0.16) : c.top, sk = fr ? dk(c.skin, 0.14) : c.skin;
      I.l(D('M', sh.x, sh.y, 'L', el.x, el.y), armW + 0.6, tc);
      I.l(D('M', el.x, el.y, 'L', hand.x, hand.y), longS ? armW : armW - 2, longS ? tc : sk);
      if (top === 'suit') I.e(hand.x, hand.y - 2.5, 4.6, 3.4, '#fafafa');
      if (top === 'sweater') I.e(hand.x, hand.y - 2.6, 4.6, 3.2, dk(tc, 0.18));
      I.e(hand.x, hand.y, 4.7, 4.7, sk);
    });

    /* ---- head ---- */
    var HC = [0, 0, headU], H = P(v, 0, 0, headU), hw = hr * 2.12, hh = hr * 1.84, rad = hr * 0.74, HI = it(H.d), hs = '', hd = dk(c.hair, 0.2), h2 = k.hair2 || lt(c.hair, 0.4), fxh = style !== 'bald' && k.hairFx && k.hairFx !== 'none' ? k.hairFx : '';
    function onHead(a, p, out) { return S.onBall(v, HC, hr, a, p, (out || 1) * 0.8); }
    HI.flat = style !== 'bald';      /* no inner line round a head that has hair: the hair would show it as a seam */
    [-1, 1].forEach(function (sd) { var q = P(v, 0, sd * hr * 1.02, headU - 3); HI.e(q.x, q.y, 5.2 * (0.35 + 0.65 * Math.abs(v.c)), 6, dk(c.skin, far(sd) ? 0.16 : 0.05)); });
    HI.r(H.x, H.y, hw, hh, rad, c.skin);
    hs += '<clipPath id="' + id + 'h"><rect x="' + f1(H.x - hw / 2) + '" y="' + f1(H.y - hh / 2) + '" width="' + f1(hw) + '" height="' + f1(hh) + '" rx="' + f1(rad) + '"/></clipPath><g clip-path="url(#' + id + 'h)">';
    hs += '<rect x="' + f1(H.x - hw / 2) + '" y="' + f1(H.y + hh * 0.2) + '" width="' + f1(hw) + '" height="' + f1(hh * 0.4) + '" fill="' + dk(c.skin, 0.3) + '" opacity=".14"/>';
    var beard = k.face === 'beard' || k.face === 'shortbeard';
    if (k.face === 'stubble') { var sq = onHead(0, -40); if (sq.n > -0.2) hs += ell(sq.x, sq.y + 4, hw * 0.42 * (0.5 + 0.5 * sq.w), hh * 0.3, c.hair, ' opacity=".25"'); }
    if (beard) { var bq = onHead(0, -40); if (bq.n > -0.35) hs += path(D('M', bq.x - hw * 0.52, H.y - hh * 0.02, 'Q', bq.x - hw * 0.5, H.y + hh * (k.face === 'beard' ? 0.62 : 0.52), bq.x, H.y + hh * (k.face === 'beard' ? 0.66 : 0.56), 'Q', bq.x + hw * 0.5, H.y + hh * (k.face === 'beard' ? 0.62 : 0.52), bq.x + hw * 0.52, H.y - hh * 0.02, 'Q', bq.x + hw * 0.3, H.y + hh * 0.24, bq.x, H.y + hh * 0.22, 'Q', bq.x - hw * 0.3, H.y + hh * 0.24, bq.x - hw * 0.52, H.y - hh * 0.02, 'Z'), c.hair); }
    if (!beard) [-1, 1].forEach(function (sd) { var q = onHead(sd * 50, -27); if (q.n > 0.1) hs += ell(q.x, q.y, 5 * Math.max(0.5, q.w), 4.2, c.blush, ' opacity=".8"'); });
    /* eyes */
    var eyeQ = [];
    [-1, 1].forEach(function (sd) {
      var q = onHead(sd * 30, -5); if (q.n < 0.05) return;
      var rx = 5 * Math.max(0.6, q.w), ry = 7.1, closed = o.blink || k.eyes === 'happy' || (k.eyes === 'wink' && sd > 0);
      eyeQ.push({ q: q, rx: rx, ry: ry });
      if (closed) hs += line(o.blink ? D('M', q.x - rx, q.y, 'Q', q.x, q.y + 3.4, q.x + rx, q.y) : D('M', q.x - rx, q.y + 2, 'Q', q.x, q.y - 4.6, q.x + rx, q.y + 2), c.eye, 2.3);
      else hs += ell(q.x, q.y, rx, ry, c.eye) + ell(q.x, q.y + ry * 0.42, rx * 0.62, ry * 0.36, '#8a6a7c', ' opacity=".75"') + ell(q.x - rx * 0.3, q.y - ry * 0.38, rx * 0.4, ry * 0.3, '#fff') + ell(q.x + rx * 0.34, q.y + ry * 0.4, rx * 0.18, ry * 0.14, '#fff', ' opacity=".85"');
      var b0 = onHead(sd * 38, 20), b1 = onHead(sd * 20, 22);
      if (b0.n > 0.1) hs += line(D('M', b0.x, b0.y, 'Q', (b0.x + b1.x) / 2, Math.min(b0.y, b1.y) - 1.6, b1.x, b1.y), style === 'bald' ? dk(c.hair, 0.1) : hd, 1.9);
    });
    var m = onHead(0, -36), nq = onHead(0, -17, 1.04);
    if (nq.n > 0.2) hs += line(D('M', nq.x - 1.5 * nq.w, nq.y, 'Q', nq.x, nq.y + 1.8, nq.x + 1.5 * nq.w, nq.y), dk(c.skin, 0.35), 1.5);
    if (k.face === 'mustache' || beard) { var mq = onHead(0, -27, 1.02); if (mq.n > 0.1) hs += path(D('M', mq.x - 8 * mq.w, mq.y + 1.5, 'Q', mq.x - 4 * mq.w, mq.y - 3.6, mq.x, mq.y, 'Q', mq.x + 4 * mq.w, mq.y - 3.6, mq.x + 8 * mq.w, mq.y + 1.5, 'Q', mq.x + 4 * mq.w, mq.y + 3.4, mq.x, mq.y + 1.6, 'Q', mq.x - 4 * mq.w, mq.y + 3.4, mq.x - 8 * mq.w, mq.y + 1.5, 'Z'), beard ? hd : c.hair); }
    if (m.n > 0.15 && !beard && k.face !== 'mustache' && (k.mouth === 'grin' || k.mouth === 'wow')) hs += k.mouth === 'grin' ? path(D('M', m.x - 6 * m.w, m.y - 1.5, 'Q', m.x, m.y + 8, m.x + 6 * m.w, m.y - 1.5, 'Z'), '#b04a5a') + ell(m.x, m.y + 3.4, 3 * m.w, 1.5, '#ff9db0') : ell(m.x, m.y + 1.6, 2.8 * m.w, 3.6, '#b04a5a');
    else if (m.n > 0.15) hs += line(D('M', m.x - 5.5 * m.w, m.y + (beard || k.face === 'mustache' ? 2 : -1), 'Q', m.x, m.y + (beard || k.face === 'mustache' ? 7 : 4.6), m.x + 5.5 * m.w, m.y + (beard || k.face === 'mustache' ? 2 : -1)), beard ? '#fff' : c.eye, 2.2);
    /* the ear shows on the side of the head in profile */
    if (Math.abs(v.s) > 0.55) hs += ell(H.x - v.s * hr * 0.12, H.y + 4, 4.6, 6, dk(c.skin, 0.08)) + line(D('M', H.x - v.s * hr * 0.12 + v.s * 1.5, H.y + 1, 'q', -v.s * 3, 3, 0, 6), dk(c.skin, 0.3), 1.3);
    /* hair on the head: a cap over the forehead that slides round as the head turns, and the side of the head in profile */
    if (style !== 'bald') {
      var fq = onHead(0, 70), capX = fq.x - v.s * hr * 0.25, capY = H.y - hh * 0.5 + 2, deep = style === 'bob' || style === 'long' || style === 'wavy' ? 0.36 : 0.31, curls = style === 'curly' || style === 'longcurly';
      /* the side of the head behind the ear is hair: a sliver when nearly facing us, the back half in profile */
      if (Math.abs(v.s) > 0.05) { var sg = v.s > 0 ? 1 : -1, sw2 = hr * (1.06 - 0.84 * Math.abs(v.c)) * Math.min(1, Math.abs(v.s) * 3); hs += ell(H.x - sg * hw / 2, H.y - hh * 0.1, sw2, hh * (deep > 0.33 ? 0.62 : 0.5), c.hair); }
      if (v.c > -0.35) {
        if (curls) { for (var ci = 0; ci < 7; ci++) { var ca = onHead(-75 + ci * 25, 48 - Math.abs(ci - 3) * 5); if (ca.n > -0.1) hs += ell(ca.x, ca.y - 3, 7.4, 7.4, ci % 2 ? dk(c.hair, 0.06) : c.hair); } hs += ell(capX, capY - 2, hw * 0.6, hh * 0.2, c.hair); }
        else if (style === 'buzz') hs += ell(capX, capY + 1, hw * 0.6, hh * 0.24, c.hair, ' opacity=".85"');
        else if (style === 'pixie') { hs += ell(capX, capY, hw * 0.62, hh * 0.3, c.hair); var pq = onHead(-20, 40); hs += path(D('M', pq.x - hw * 0.34, pq.y - 6, 'Q', pq.x + hw * 0.1, pq.y - 4, pq.x + hw * 0.42, pq.y + 7, 'Q', pq.x + hw * 0.05, pq.y + 3, pq.x - hw * 0.3, pq.y + 3, 'Z'), c.hair); }
        else if (style === 'afro' || style === 'puffs') { hs += ell(capX, capY, hw * 0.62, hh * 0.3, c.hair); for (var ai = 0; ai < 7; ai++) { var aa = onHead(-75 + ai * 25, 44 - Math.abs(ai - 3) * 4); if (aa.n > -0.1) hs += ell(aa.x, aa.y - 2, 5.6, 5.6, ai % 2 ? dk(c.hair, 0.06) : c.hair); } }
        else if (style === 'spiky') { hs += ell(capX, capY - 1, hw * 0.62, hh * 0.24, c.hair); for (var si = 0; si < 6; si++) { var sa = onHead(-65 + si * 26, 40); if (sa.n > -0.1) hs += path(D('M', sa.x - 5.5, sa.y - 7, 'L', sa.x + (si % 2 ? 2 : -2), sa.y + 5.5, 'L', sa.x + 5.5, sa.y - 7, 'Z'), c.hair); } }
        else hs += ell(capX, capY, hw * 0.62, hh * deep, c.hair) + ell(fq.x + hr * 0.42 * v.c - v.s * hr * 0.2, H.y - hh * 0.2, hr * 0.42, hr * 0.26, c.hair);
        if (deep > 0.33) [-1, 1].forEach(function (sd) { var q = onHead(sd * 80, 0); if (q.n > -0.05) hs += '<rect x="' + f1(q.x - 4.5 * Math.max(0.4, q.w) + sd * (v.c >= 0 ? 1 : -1) * 2.5) + '" y="' + f1(H.y - hh * 0.4) + '" width="' + f1(9 * Math.max(0.4, q.w)) + '" height="' + f1(hh) + '" fill="' + c.hair + '"/>'; });
        if (k.bangs === 'straight') { var gq = onHead(0, 38); hs += '<rect x="' + f1(gq.x - hw * 0.46 * (0.55 + 0.45 * gq.w)) + '" y="' + f1(H.y - hh * 0.5) + '" width="' + f1(hw * 0.92 * (0.55 + 0.45 * gq.w)) + '" height="' + f1(hh * 0.36) + '" rx="3" fill="' + c.hair + '"/>'; }
        if (k.bangs === 'curly') for (var gi = 0; gi < 6; gi++) { var ga = onHead(-58 + gi * 23, 30 + (gi % 2) * 4); if (ga.n > 0) hs += ell(ga.x, ga.y, 5.4, 5.4, gi % 2 ? dk(c.hair, 0.07) : c.hair); }
        if (fxh === 'streaks') [-40, -14, 14, 40].forEach(function (a) { var s0 = onHead(a, 74), s1 = onHead(a * 1.15, 46); if (s1.n > 0) hs += line(D('M', s0.x, s0.y - 2, 'L', s1.x, s1.y - 2), h2, 2.2, ' opacity=".85"'); });
        if (fxh === 'sides') [-1, 1].forEach(function (sd) { var q = onHead(sd * 76, 24); if (q.n > -0.05) hs += ell(q.x, q.y, 4.5 * Math.max(0.5, q.w), 8, h2, ' opacity=".9"'); });
        hs += line(D('M', capX - hw * 0.3, capY - 1, 'Q', capX - hw * 0.14, capY - hh * 0.14, capX + hw * 0.04, capY - hh * 0.15), '#fff', 2.2, ' opacity=".28"');
      }
    }
    hs += '</g>';
    HI.x(hs);
    if (k.acc === 'glasses' && eyeQ.length) { var GI = it(H.d + 0.6), gs = ''; eyeQ.forEach(function (e) { gs += '<ellipse cx="' + f1(e.q.x) + '" cy="' + f1(e.q.y) + '" rx="' + f1(e.rx * 1.75) + '" ry="' + f1(e.ry * 1.3) + '" fill="#fff" fill-opacity=".18" stroke="' + INK + '" stroke-width="1.7"/>'; }); if (eyeQ.length === 2) gs += line(D('M', eyeQ[0].q.x + eyeQ[0].rx * 1.75, eyeQ[0].q.y, 'L', eyeQ[1].q.x - eyeQ[1].rx * 1.75, eyeQ[1].q.y), INK, 1.7); GI.x(gs); }
    if (style !== 'bald' && k.tendrils && k.tendrils !== 'none') [-1, 1].forEach(function (sd) {
      var q = onHead(sd * 74, 4, 1.06); if (q.n < -0.05) return; var TI2 = it(H.d + 0.55);
      if (k.tendrils === 'straight') TI2.l(D('M', q.x, q.y - 6, 'Q', q.x + sd * (v.c >= 0 ? 1 : -1) * 1.5, q.y + 8, q.x, q.y + hh * 0.5), 3, c.hair);
      else for (var ti = 0; ti < 5; ti++) TI2.e(q.x + (ti % 2 ? 1.2 : -1.2), q.y - 5 + ti * 5.6, 3.1, 3.1, c.hair);
    });

    /* ---- hair: a shell that sits a little behind the head. Facing us it shows as a rim; from behind it covers the head. ---- */
    var topD = H.d;
    if (style !== 'bald') {
      var SH = P(v, -hr * 0.3, 0, headU + hr * 0.1), SI = it(SH.d - 0.4), tipC = fxh === 'tips' ? h2 : c.hair, sway = Math.sin(t * 2.4 + 1) * 2 + (wk ? sw * 3.5 : 0);
      topD = Math.max(H.d, SH.d - 0.4);
      if (style === 'afro') { for (var fi = 0; fi < 12; fi++) { var fa = fi / 12 * TAU; SI.e(SH.x + Math.cos(fa) * hr * 1.22, SH.y - hr * 0.2 + Math.sin(fa) * hr * 1.1, hr * 0.42, hr * 0.42, fi % 2 ? dk(c.hair, 0.07) : c.hair); } SI.e(SH.x, SH.y - hr * 0.2, hr * 1.32, hr * 1.2, c.hair); }
      else if (style === 'buzz') SI.r(SH.x + v.s * 0.8, SH.y - 1, hw * 0.95, hh * 0.95, rad, c.hair);
      else if (style === 'pixie') SI.r(SH.x, SH.y - 1, hw * 1.05, hh * 1.02, rad * 1.05, c.hair);
      else if (style === 'puffs' || style === 'braids') SI.r(SH.x, SH.y - 1, hw * 1.06, hh * 1.04, rad * 1.1, c.hair);
      if (style === 'puffs') [-1, 1].forEach(function (sd) { var q = P(v, -hr * 0.1, sd * hr * 0.98, headU + hr * 0.82), PU = it(q.d - 0.45); for (var pj = 0; pj < 7; pj++) { var pa = pj / 7 * TAU; PU.e(q.x + Math.cos(pa) * hr * 0.3, q.y + Math.sin(pa) * hr * 0.28, hr * 0.24, hr * 0.24, pj % 2 ? dk(c.hair, 0.07) : c.hair); } PU.e(q.x, q.y, hr * 0.42, hr * 0.4, c.hair).e(q.x, q.y + hr * 0.36, 3.2, 2.4, hat); });
      if (style === 'braids') [-1, 1].forEach(function (sd) { var b0 = P(v, -hr * 0.25, sd * hr * 1.0, headU - hr * 0.2), BR = it(b0.d - 0.45 + (sd * -v.s > 0.3 ? 0.9 : 0)); for (var bj = 0; bj < 5; bj++) { var bq4 = P(v, -hr * 0.25 - bj * 0.6, sd * (hr * 1.04 + Math.sin(t * 2 + bj) * 0.4), headU - hr * 0.2 - bj * hr * 0.3); BR.e(bq4.x, bq4.y, 4.4 - bj * 0.25, 4.2, bj % 2 ? dk(c.hair, 0.08) : c.hair); } var be = P(v, -hr * 0.25 - 3, sd * hr * 1.04, headU - hr * 1.72); BR.e(be.x, be.y, 3, 2.4, hat).e(be.x, be.y + 4, 3.4, 3.6, tipC); });
      if (style === 'curly' || style === 'longcurly') {
        for (var i = 0; i < 11; i++) { var a = i / 11 * TAU, r = hr * 0.42; SI.e(SH.x + Math.cos(a) * hr * 0.92, SH.y - hr * 0.1 + Math.sin(a) * hr * 0.8, r, r, i % 2 ? dk(c.hair, 0.07) : c.hair); }
        SI.e(SH.x, SH.y - hr * 0.05, hr * 1.05, hr * 0.92, c.hair);
        if (style === 'longcurly') for (var j = 0; j < 9; j++) { var lx = (j % 3 - 1) * hr * 0.72, ly = hr * (0.75 + Math.floor(j / 3) * 0.5); SI.e(SH.x + lx, SH.y + ly, hr * 0.4, hr * 0.4, Math.floor(j / 3) === 2 ? tipC : (j % 2 ? dk(c.hair, 0.07) : c.hair)); }
      } else SI.r(SH.x, SH.y - 1, hw * 1.07, hh * 1.06, rad * 1.1, c.hair);
      if (style === 'long') { SI.r(SH.x, SH.y + hr * 0.62, hw * 1.07, hr * 1.5, 11, c.hair); if (fxh === 'tips') SI.x('<rect x="' + f1(SH.x - hw * 0.535) + '" y="' + f1(SH.y + hr * 0.95) + '" width="' + f1(hw * 1.07) + '" height="' + f1(hr * 0.42) + '" rx="8" fill="' + h2 + '"/>'); }
      if (style === 'bob') { SI.r(SH.x, SH.y + hr * 0.3, hw * 1.13, hr * 1.25, 12, c.hair); if (fxh === 'tips') SI.x('<rect x="' + f1(SH.x - hw * 0.565) + '" y="' + f1(SH.y + hr * 0.62) + '" width="' + f1(hw * 1.13) + '" height="' + f1(hr * 0.3) + '" rx="7" fill="' + h2 + '"/>'); }
      if (style === 'wavy') { SI.r(SH.x, SH.y + hr * 0.6, hw * 1.05, hr * 1.5, 11, c.hair); [-1, 1].forEach(function (sd) { for (var w2 = 0; w2 < 4; w2++) SI.e(SH.x + sd * hw * (0.52 + (w2 % 2) * 0.05), SH.y + hr * (0.05 + w2 * 0.42), hr * 0.26, hr * 0.28, w2 === 3 ? tipC : c.hair); }); SI.e(SH.x, SH.y + hr * 1.36, hw * 0.4, hr * 0.2, tipC); }
      if (backish && fxh === 'streaks') SI.x([-0.3, -0.1, 0.1, 0.3].map(function (q) { return line(D('M', SH.x + hw * q, SH.y - hh * 0.4, 'L', SH.x + hw * q * 1.1, SH.y + hh * 0.1), h2, 2.2, ' opacity=".8"'); }).join(''));
      if (style === 'ponytail') { var p1 = P(v, -hr * 1.05, sway * 0.2, headU + hr * 0.3), p2 = P(v, -hr * 1.35, sway, headU - hr * 0.5), PI = it(p1.d - 0.5); PI.l(D('M', p1.x, p1.y, 'L', p2.x, p2.y), 11.5, c.hair).e(p2.x, p2.y + 4, 5.5, 7, tipC).e(p1.x, p1.y, 5.6, 5.6, hat); }
      if (style === 'pigtails') { [-1, 1].forEach(function (sd) { var q1 = P(v, -hr * 0.2, sd * hr * 1.05, headU + hr * 0.1), q2 = P(v, -hr * 0.3, sd * hr * 1.3 + sway * 0.3, headU - hr * 0.95), QI = it(q1.d - 0.45); QI.l(D('M', q1.x, q1.y, 'L', q2.x, q2.y), 9.5, c.hair).e(q2.x, q2.y + 3, 4.8, 6, tipC).e(q1.x, q1.y, 4.6, 4.6, hat); }); var b1q = P(v, -hr * 1.05, sway * 0.2, headU + hr * 0.2), b2q = P(v, -hr * 1.3, sway, headU - hr * 0.6), BI = it(b1q.d - 0.5); BI.l(D('M', b1q.x, b1q.y, 'L', b2q.x, b2q.y), 9.5, c.hair).e(b2q.x, b2q.y + 3, 4.8, 6, tipC); }
      if (style === 'buns') [-1, 1].forEach(function (sd) { var q = P(v, -hr * 0.15, sd * hr * 0.78, headU + hr * 0.92), NI = it(q.d - 0.45); NI.e(q.x, q.y, hr * 0.4, hr * 0.38, c.hair).x(S.crescent(q.x, q.y, hr * 0.4, hr * 0.38, 0.6, hd, 0.4)); });
      if (style === 'bun') { var nq2 = P(v, -hr * 0.2, 0, headU + hr * 1.12), NI2 = it(nq2.d - 0.42); NI2.e(nq2.x, nq2.y, hr * 0.46, hr * 0.42, c.hair).x(S.crescent(nq2.x, nq2.y, hr * 0.46, hr * 0.42, 0.6, hd, 0.4) + line(D('M', nq2.x - hr * 0.36, nq2.y + hr * 0.32, 'Q', nq2.x, nq2.y + hr * 0.46, nq2.x + hr * 0.36, nq2.y + hr * 0.32), hat, 3)); }
    }

    /* ---- hats and hair things ---- */
    if (k.acc === 'cap' || k.acc === 'visor') {
      var AI = it(topD + 0.9), bq3 = P(v, hr * 0.95, 0, headU + hr * 0.3), bw = hr * 0.8 * (0.45 + 0.55 * Math.abs(v.s)) + hr * 0.25;
      if (k.acc === 'cap') AI.p(D('M', H.x - hw * 0.54, H.y - hh * 0.16, 'Q', H.x - hw * 0.54, H.y - hh * 0.62, H.x, H.y - hh * 0.64, 'Q', H.x + hw * 0.54, H.y - hh * 0.62, H.x + hw * 0.54, H.y - hh * 0.16, 'Q', H.x, H.y - hh * 0.06, H.x - hw * 0.54, H.y - hh * 0.16, 'Z'), hat);
      else AI.x(line(D('M', H.x - hw * 0.52, H.y - hh * 0.2, 'Q', H.x, H.y - hh * 0.34, H.x + hw * 0.52, H.y - hh * 0.2), hatD, 4));
      if (v.c > -0.3) AI.e(bq3.x, bq3.y, bw, 4.2 + 2.5 * Math.max(0, v.c), k.acc === 'cap' ? hatD : hat);
    }
    if (k.acc === 'beanie') { var BE = it(topD + 0.9), bc = k.accCol || hat; BE.p(D('M', H.x - hw * 0.56, H.y - hh * 0.12, 'Q', H.x - hw * 0.58, H.y - hh * 0.78, H.x, H.y - hh * 0.8, 'Q', H.x + hw * 0.58, H.y - hh * 0.78, H.x + hw * 0.56, H.y - hh * 0.12, 'Z'), bc); BE.r(H.x, H.y - hh * 0.17, hw * 1.14, 7, 3.5, dk(bc, 0.14)); BE.e(H.x + v.s * 3, H.y - hh * 0.82, 5.2, 5, lt(bc, 0.4)); }
    if (k.acc === 'chefhat') { var CH = it(topD + 0.9), cy0 = H.y - hh * 0.46; CH.r(H.x, cy0 + 2, hw * 0.84, 9, 2, '#ffffff'); [-0.3, 0, 0.3].forEach(function (u) { CH.e(H.x + u * hw, cy0 - 13 - (u ? 0 : 3), hw * 0.26, 12, '#ffffff'); }); CH.x(line(D('M', H.x - hw * 0.38, cy0 - 3, 'L', H.x + hw * 0.38, cy0 - 3), '#dfe3e8', 1.4)); }
    if (k.acc === 'flowers') { var FC = it(topD + 0.95), fcols = ['#ff7aa8', '#ffd84a', '#c59cff', '#ff9f4a', '#7fd0ff']; [-62, -31, 0, 31, 62].forEach(function (a, i) { var q = onHead(a, 64, 1.04); if (q.n < -0.2) return; for (var pp = 0; pp < 5; pp++) { var pa2 = pp * 1.2566; FC.e(q.x + Math.cos(pa2) * 2.6, q.y + Math.sin(pa2) * 2.6, 2.4, 2.4, fcols[i]); } FC.x(ell(q.x, q.y, 1.5, 1.5, '#fff6c9')); }); }
    if (k.acc === 'headband') it(topD + 0.9).x(line(D('M', H.x - hw * 0.5, H.y - hh * 0.14, 'C', H.x - hw * 0.5, H.y - hh * 0.6, H.x + hw * 0.5, H.y - hh * 0.6, H.x + hw * 0.5, H.y - hh * 0.14), hat, 5));
    if (k.acc === 'bow') { var wq = P(v, 0, hr * 0.5, headU + hr * 0.98), WI = it(topD + 0.95), bs = 7 * (0.5 + 0.5 * Math.abs(v.c)); WI.p(D('M', wq.x, wq.y, 'L', wq.x - bs * 1.5, wq.y - 6.5, 'L', wq.x - bs * 1.5, wq.y + 6.5, 'Z'), hat).p(D('M', wq.x, wq.y, 'L', wq.x + bs * 1.5, wq.y - 6.5, 'L', wq.x + bs * 1.5, wq.y + 6.5, 'Z'), hat).e(wq.x, wq.y, 3.2, 3.6, hatD); }

    var out = (defs ? '<defs>' + defs + '</defs>' : '') + (o.shadow === false ? '' : '<ellipse cx="60" cy="154" rx="' + f1(Math.min(30, 22 * bx * kk)) + '" ry="5" fill="rgba(0,0,0,.15)"/>') +
      '<g transform="translate(60 153) scale(' + f1(kk * 1000) / 1000 + ') translate(' + (-CX) + ' ' + (-GY) + ')">' + S.paint(items) + '</g>';
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character">' + out + '</svg>';
  }
  S.person = person; S.personFrames = 4;
})();
