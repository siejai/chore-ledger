/* Lit Town — letter-tracing checks (ES5, no DOM). Used by the app (RA.TraceCheck) and by
 * tools/validate-content.js, which proves every letter's own strokes pass and scribbles don't.
 *
 * Letter frame (www/content/tracing.json "letters"): ascender y=0, midline y=50, baseline y=100,
 * descender y=150; x from 0 to the letter's width "w". A stroke is a flat polyline
 * [x0,y0, x1,y1, …] in stroke order; a one-point stroke is a dot (i, j).
 * Her ink is an array of strokes, each an array of {x, y} points in the same frame.
 *
 * Three rungs (the "ladder"):
 *   forced   — follow an animated pen; cannot fail (see progressOn)
 *   dotted   — trace the dotted letter: starts near the start dot, covers most of the path,
 *              goes roughly the right way, and isn't a scribble
 *   freehand — no guide: a lenient shape match after scaling her letter to the model's size,
 *              plus scribble protection (ink, strokes, retracing, size, position). A letter that
 *              matches only when flipped (b/d, p/q, s, j) is "facing the other way".
 * All thresholds come from tracing.json "settings" so they can be loosened or tightened.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.RA = root.RA || {}; root.RA.TraceCheck = api; }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  /** Template strokes as arrays of points. */
  function strokesOf(def) {
    return (def.strokes || []).map(function (f) {
      var pts = [], i;
      for (i = 0; i + 1 < f.length; i += 2) { pts.push({ x: f[i], y: f[i + 1] }); }
      return pts;
    });
  }

  function lengthOf(stroke) {
    var L = 0, i;
    for (i = 1; i < stroke.length; i++) { L += dist(stroke[i - 1], stroke[i]); }
    return L;
  }
  function totalLength(strokes) { var L = 0; strokes.forEach(function (s) { L += lengthOf(s); }); return L; }

  /** Points every `step` units along a stroke (a dot stays one point). */
  function resample(stroke, step) {
    if (stroke.length < 2) { return stroke.slice(); }
    var out = [stroke[0]], carry = 0, i, a, b, d, t;
    for (i = 1; i < stroke.length; i++) {
      a = stroke[i - 1]; b = stroke[i]; d = dist(a, b);
      t = step - carry;
      while (t <= d) { out.push({ x: a.x + (b.x - a.x) * t / d, y: a.y + (b.y - a.y) * t / d }); t += step; }
      carry = d - (t - step);
    }
    var last = stroke[stroke.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.3) { out.push(last); }
    return out;
  }

  function isDot(stroke, dotMax) { return stroke.length < 2 || lengthOf(stroke) <= dotMax; }

  function bbox(strokes, dotMax) {
    var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }, any = false;
    strokes.forEach(function (s) {
      if (dotMax != null && isDot(s, dotMax)) { return; }   // dots (i, j) don't count toward the letter's size
      s.forEach(function (p) { any = true; b.x1 = Math.min(b.x1, p.x); b.y1 = Math.min(b.y1, p.y); b.x2 = Math.max(b.x2, p.x); b.y2 = Math.max(b.y2, p.y); });
    });
    if (!any) { return null; }
    b.w = b.x2 - b.x1; b.h = b.y2 - b.y1; b.cx = (b.x1 + b.x2) / 2; b.cy = (b.y1 + b.y2) / 2;
    return b;
  }

  /** Fraction of points in `from` that have a point of `to` within r. */
  function near(from, to, r) {
    if (!from.length) { return 0; }
    var hit = 0, i, j, r2 = r * r, dx, dy;
    for (i = 0; i < from.length; i++) {
      for (j = 0; j < to.length; j++) {
        dx = from[i].x - to[j].x; dy = from[i].y - to[j].y;
        if (dx * dx + dy * dy <= r2) { hit++; break; }
      }
    }
    return hit / from.length;
  }

  function flat(strokes) { var out = []; strokes.forEach(function (s) { out = out.concat(s); }); return out; }

  /** Ink strokes resampled, with each point remembering its order in the drawing. */
  function inkPoints(ink, step) {
    var out = [], n = 0;
    ink.forEach(function (s) { resample(s, step).forEach(function (p) { out.push({ x: p.x, y: p.y, i: n++ }); }); });
    return out;
  }

  /** How much of the ink goes back over ink drawn earlier (0–1). */
  function retrace(ink, cell) {
    var seen = {}, pts = inkPoints(ink, cell * 0.5), again = 0, gap = 6, i, k;
    for (i = 0; i < pts.length; i++) {
      k = Math.floor(pts[i].x / cell) + ',' + Math.floor(pts[i].y / cell);
      if (seen[k] != null && pts[i].i - seen[k] > gap) { again++; }
      if (seen[k] == null || pts[i].i - seen[k] > gap) { seen[k] = pts[i].i; }
    }
    return pts.length ? again / pts.length : 0;
  }

  /** Scale both to the same size (by the larger side of their bounding boxes, dots left out)
   *  and centre them, so shape can be compared wherever and however big she wrote. */
  function normalize(strokes, dotMax, flipX) {
    var b = bbox(strokes, dotMax) || bbox(strokes, null);
    if (!b) { return []; }
    var s = 1 / Math.max(b.w, b.h, 1e-6);
    return strokes.map(function (st) {
      return st.map(function (p) { return { x: (flipX ? (b.cx - p.x) : (p.x - b.cx)) * s, y: (p.y - b.cy) * s }; });
    });
  }

  /** Shape match after normalizing: score = the worst of overall coverage, precision and the
   *  coverage of each line of the model (so b ≠ d: b's stick on the left must be there). */
  function shapeScore(tplStrokes, ink, cfg, flipX) {
    var dotMax = cfg.dotMax || 8;
    var TS = normalize(tplStrokes.map(function (s) { return resample(s, 3); }), dotMax, false);
    var I = flat(normalize(ink.map(function (s) { return resample(s, 3); }), dotMax * 1.5, flipX));
    var T = flat(TS), cover = near(T, I, cfg.radius), prec = near(I, T, cfg.radius), worst = 1;
    TS.forEach(function (st, i) {
      if (isDot(tplStrokes[i], dotMax)) { return; }   // the dot on i / j is optional here
      worst = Math.min(worst, near(st, I, cfg.radius));
    });
    return { cover: cover, prec: prec, stroke: worst, score: Math.min(cover, prec), ok: Math.min(cover, prec) >= cfg.minScore && worst >= cfg.minStrokeCover };
  }

  var api = {
    strokesOf: strokesOf, resample: resample, bbox: bbox, totalLength: totalLength,

    /** Where the start dot goes: the first point of the first stroke. */
    startPoint: function (def) { var s = strokesOf(def)[0]; return s && s[0]; },

    /** Forced trace: how far along stroke `si` her finger has followed (0–1). It never fails. */
    progressOn: function (def, si, pts, radius, from) {
      var st = resample(strokesOf(def)[si] || [], 2), best = from || 0, i, j;
      if (st.length < 2) { return pts.length ? 1 : best; }
      for (i = 0; i < pts.length; i++) {
        // only let her move forward a little at a time: no jumping to the end of the stroke
        for (j = Math.floor(best * (st.length - 1)); j < st.length && j <= Math.floor(best * (st.length - 1)) + 12; j++) {
          if (dist(pts[i], st[j]) <= radius) { best = Math.max(best, j / (st.length - 1)); }
        }
      }
      return best;
    },

    /** Dotted trace: { pass, why, cover, prec, dir } — why: 'start' | 'cover' | 'direction' | 'scribble' */
    dotted: function (def, ink, cfg) {
      var tpl = strokesOf(def);
      var T = flat(tpl.map(function (s) { return resample(s, 3); }));
      var pts = inkPoints(ink, 3);
      var res = { pass: false, why: '' };
      if (!pts.length) { res.why = 'cover'; return res; }
      var tplLen = totalLength(tpl), inkLen = totalLength(ink);
      res.cover = near(T, pts, cfg.coverRadius);
      res.prec = near(pts, T, cfg.precRadius);
      res.start = dist(ink[0][0], tpl[0][0]);
      // direction: along each line, the ink near its 15% point should come before the ink near its 85% point
      var good = 0, counted = 0;
      tpl.forEach(function (s) {
        if (s.length < 2 || lengthOf(s) < 12) { return; }
        var r = resample(s, 2), a = r[Math.floor(r.length * 0.15)], b = r[Math.floor(r.length * 0.85)];
        var ia = -1, ib = -1, da = cfg.coverRadius * 1.5, db = da;
        pts.forEach(function (p) {
          var d1 = dist(p, a), d2 = dist(p, b);
          if (d1 < da) { da = d1; ia = p.i; }
          if (d2 < db) { db = d2; ib = p.i; }
        });
        if (ia < 0 || ib < 0) { return; }
        counted++;
        if (ia < ib) { good++; }
      });
      res.dir = counted ? good / counted : 1;
      if (inkLen > tplLen * cfg.maxInk || ink.length > tpl.length + cfg.extraStrokes || res.prec < cfg.minPrecision) { res.why = 'scribble'; return res; }
      if (res.start > cfg.startRadius) { res.why = 'start'; return res; }
      if (res.cover < cfg.minCover) { res.why = 'cover'; return res; }
      if (res.dir < cfg.minDirection) { res.why = 'direction'; return res; }
      res.pass = true;
      return res;
    },

    /**
     * Freehand: { pass, why, mirror, score } — why: 'empty' | 'size' | 'place' | 'ink' | 'strokes' |
     * 'retrace' | 'shape' | 'mirror' | 'other-letter'. all = every letter def (for the wrong-letter check).
     */
    freehand: function (def, ink, cfg, all, letter) {
      var tpl = strokesOf(def), dotMax = cfg.dotMax || 8;
      var res = { pass: false, why: '', mirror: false };
      var nonDot = ink.filter(function (s) { return !isDot(s, dotMax * 1.5); });
      if (!nonDot.length) { res.why = 'empty'; return res; }
      var tb = bbox(tpl, dotMax), ib = bbox(ink, dotMax * 1.5);
      // size and place: roughly the size of the model, roughly where it goes in the box
      var tSize = Math.max(tb.w, tb.h), iSize = Math.max(ib.w, ib.h);
      res.size = iSize / tSize;
      if (res.size < cfg.minSize || res.size > cfg.maxSize) { res.why = 'size'; return res; }
      if (Math.abs(ib.cx - tb.cx) > cfg.posTolX * 100 || Math.abs(ib.cy - tb.cy) > cfg.posTolY * 100) { res.why = 'place'; return res; }
      // tall letters reach up past the midline, tails go down past the baseline, short ones don't (l ≠ i, p ≠ o)
      var z = cfg.zone || 15;
      var tall = tb.y1 < 50 - z, tail = tb.y2 > 100 + z;
      if ((tall ? ib.y1 > 50 - z / 2 : ib.y1 < 50 - 1.5 * z) || (tail ? ib.y2 < 100 + z / 2 : ib.y2 > 100 + 1.5 * z)) { res.why = 'size'; return res; }
      // scribble protection: ink, strokes, going over the same spot again and again
      var inkRatio = totalLength(ink) / (totalLength(tpl) * res.size);
      res.ink = inkRatio;
      if (inkRatio < cfg.minInk || inkRatio > cfg.maxInk) { res.why = 'ink'; return res; }
      var minStrokes = Math.max(1, tpl.filter(function (s) { return s.length >= 2; }).length - 1);
      if (ink.length < minStrokes || ink.length > tpl.length + cfg.extraStrokes) { res.why = 'strokes'; return res; }
      res.retrace = retrace(ink, cfg.retraceCell * iSize);
      var own = retrace(tpl, cfg.retraceCell * tSize);
      if (res.retrace > own + cfg.maxRetrace) { res.why = 'retrace'; return res; }
      // shape
      var sh = shapeScore(tpl, ink, cfg, false);
      res.score = sh.score;
      res.stroke = sh.stroke;
      if (def.mirror) {
        // facing the other way: the flipped letter matches clearly better
        var fl = shapeScore(tpl, ink, cfg, true);
        res.mirrorScore = fl.score;
        if (fl.ok && (!sh.ok || Math.min(fl.score, fl.stroke) >= Math.min(sh.score, sh.stroke) + cfg.mirrorMargin)) { res.mirror = true; res.why = 'mirror'; return res; }
      }
      if (!sh.ok) {
        res.why = 'shape';
        return res;
      }
      // a clearly different letter (only when the match to her letter isn't a sure one)
      if (all && sh.score < cfg.sureScore) {
        var k, other;
        for (k in all) {
          if (!all.hasOwnProperty(k) || k === letter || (cfg.lookAlike && cfg.lookAlike[letter] && cfg.lookAlike[letter].indexOf(k) >= 0)) { continue; }
          other = shapeScore(strokesOf(all[k]), ink, cfg, false);
          if (other.ok && other.score >= cfg.otherLetterScore && other.score >= sh.score + cfg.mirrorMargin) { res.why = 'other-letter'; res.other = k; return res; }
        }
      }
      res.pass = true;
      return res;
    },

    /** Template drawn as SVG path data (dots come back separately). */
    pathData: function (def, ox, oy, s) {
      ox = ox || 0; oy = oy || 0; s = s || 1;
      var d = [], dots = [];
      strokesOf(def).forEach(function (st) {
        if (st.length < 2) { dots.push({ x: ox + st[0].x * s, y: oy + st[0].y * s }); return; }
        d.push('M' + st.map(function (p) { return Math.round((ox + p.x * s) * 10) / 10 + ' ' + Math.round((oy + p.y * s) * 10) / 10; }).join('L'));
      });
      return { d: d.join(''), dots: dots, strokes: d };
    }
  };
  return api;
});
