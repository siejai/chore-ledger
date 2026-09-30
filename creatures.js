/*
 * Creature art: every pet is drawn from parts (ears, tail, crest, extras) so new species are data, not art files.
 * CRE.draw(speciesId, stage 0-2, paletteIndex, mood) returns an SVG string (viewBox -6 -34 212 234).
 * Moods: 'ok', 'happy', 'hungry', 'grubby', 'sleepy', 'lazy', 'asleep', 'eat'. ES5.
 */
(function () {
  'use strict';
  var SPECIES = [
    {
      id: 'fox', type: 'Fire', names: ['Pipkit', 'Flarefox', 'Solvane'],
      blurb: 'A warm little fox. Its tail glows brighter as it grows.',
      ears: 'pointy', tail: 'fluffy', crest: 'flame', muzzle: true,
      palettes: [
        { main: '#f08a3c', dark: '#b4531d', light: '#fff0dc', accent: '#ffcf3f', name: 'Ember' },
        { main: '#e2566e', dark: '#9d2940', light: '#ffe6ea', accent: '#ffb347', name: 'Rose' },
        { main: '#8a6ae6', dark: '#5438a8', light: '#efe9ff', accent: '#ff8fd0', name: 'Dusk' },
        { main: '#f3efe6', dark: '#a79f8e', light: '#ffffff', accent: '#62d9f5', name: 'Frost', rare: true }
      ]
    },
    {
      id: 'otter', type: 'Water', names: ['Droplet', 'Rippler', 'Tidalor'],
      blurb: 'A playful otter pup. It loves bath time more than anything.',
      ears: 'round', tail: 'paddle', crest: 'drop', muzzle: true,
      palettes: [
        { main: '#4b9fdc', dark: '#22659a', light: '#dff2ff', accent: '#78e0d2', name: 'Lagoon' },
        { main: '#3fb6a8', dark: '#1d7a70', light: '#dcfaf5', accent: '#9fd7ff', name: 'Reef' },
        { main: '#7b8fb0', dark: '#46587a', light: '#eef2f8', accent: '#ffd66b', name: 'Storm' },
        { main: '#f2a7c3', dark: '#b8577e', light: '#fff0f6', accent: '#8fe3ff', name: 'Pearl', rare: true }
      ]
    },
    {
      id: 'bunny', type: 'Leaf', names: ['Sprig', 'Thicket', 'Verdantis'],
      blurb: 'A sleepy bunny with a sprout on its head. It blooms when it is happy.',
      ears: 'long', tail: 'puff', crest: 'leaf', muzzle: false,
      palettes: [
        { main: '#93cf6c', dark: '#4e8c35', light: '#f3fce7', accent: '#ff9cc5', name: 'Meadow' },
        { main: '#e9d58c', dark: '#a78d33', light: '#fffbe9', accent: '#8bd46b', name: 'Wheat' },
        { main: '#a8c7a0', dark: '#5f7d58', light: '#f2f8ef', accent: '#c59cff', name: 'Sage' },
        { main: '#f6c1dd', dark: '#b96b95', light: '#fff4fa', accent: '#7dd87a', name: 'Blossom', rare: true }
      ]
    },
    {
      id: 'starling', type: 'Cosmic', rare: true, names: ['Twinkit', 'Stardust', 'Celestine'],
      blurb: 'A rare creature that fell from a shooting star. It glows in the dark and can do a little of everything.',
      ears: 'pointy', tail: 'fluffy', crest: 'star', muzzle: false,
      palettes: [
        { main: '#3d4296', dark: '#22265e', light: '#dfe3ff', accent: '#ffd84a', name: 'Midnight' },
        { main: '#f3f0ff', dark: '#9a8fd6', light: '#ffffff', accent: '#8fe3ff', name: 'Moonlight' },
        { main: '#2b2233', dark: '#120d18', light: '#b9a8e8', accent: '#ff8fd0', name: 'Nebula', rare: true }
      ]
    }
  ];
  var INK = '#2b2233';
  var GEO = [
    { hr: 46, hy: 90, by: 147, brx: 31, bry: 26, er: [9.5, 11.5], ed: 19, ey: 4, foot: 11, scale: 0.9 },
    { hr: 41, hy: 76, by: 138, brx: 37, bry: 35, er: [8, 10], ed: 17, ey: 3, foot: 12, scale: 1 },
    { hr: 37, hy: 62, by: 130, brx: 40, bry: 45, er: [7, 8.5], ed: 16, ey: 2, foot: 13, scale: 1.08 }
  ];

  function f(n) { return Math.round(n * 10) / 10; }
  function P() { return Array.prototype.slice.call(arguments).map(function (v) { return typeof v === 'number' ? f(v) : v; }).join(' '); }
  function el(tag, attrs, inner) {
    var s = '<' + tag;
    for (var k in attrs) if (attrs.hasOwnProperty(k) && attrs[k] != null) s += ' ' + k + '="' + attrs[k] + '"';
    return s + (inner == null ? '/>' : '>' + inner + '</' + tag + '>');
  }
  function circle(cx, cy, r, fill, extra) { return el('circle', assign({ cx: f(cx), cy: f(cy), r: f(r), fill: fill }, extra)); }
  function ellipse(cx, cy, rx, ry, fill, extra) { return el('ellipse', assign({ cx: f(cx), cy: f(cy), rx: f(rx), ry: f(ry), fill: fill }, extra)); }
  function path(d, fill, extra) { return el('path', assign({ d: d, fill: fill }, extra)); }
  function assign(a, b) { if (b) for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  function outline(c) { return { stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }; }

  /* ---------- parts ---------- */
  function ears(sp, st, g, c, hx) {
    var r = g.hr, hy = g.hy, s = '', o = outline(c.dark);
    if (sp.ears === 'pointy') {
      var tall = [1.35, 1.5, 1.7][st], spread = [0.2, 0.18, 0.12][st];
      [-1, 1].forEach(function (d) {
        var bx1 = hx + d * r * 0.92, by1 = hy - r * 0.2, tx = hx + d * r * (0.78 + spread), ty = hy - r * tall, bx2 = hx + d * r * 0.18, by2 = hy - r * 0.86;
        s += path(P('M', bx1, by1, 'Q', tx - d * 4, ty + 10, tx, ty, 'Q', bx2 + d * 10, by2 - 8, bx2, by2, 'Z'), c.main, o);
        s += path(P('M', bx1 - d * 7, by1 - 8, 'L', tx - d * 3, ty + 12, 'L', bx2 + d * 8, by2 + 2, 'Z'), st === 2 ? c.accent : c.light);
      });
    } else if (sp.ears === 'long') {
      var len = [0.62, 0.72, 0.85][st];
      [-1, 1].forEach(function (d) {
        var cx = hx + d * r * 0.42, cy = hy - r * (0.95 + len * 0.5), rot = d * [10, 16, 22][st];
        s += '<g transform="rotate(' + rot + ' ' + f(cx) + ' ' + f(hy - r * 0.6) + ')">' +
          ellipse(cx, cy, r * 0.24, r * len, c.main, o) + ellipse(cx, cy + 3, r * 0.12, r * len * 0.72, st === 2 ? c.accent : c.light) + '</g>';
      });
    } else if (sp.ears === 'round') {
      [-1, 1].forEach(function (d) {
        s += circle(hx + d * r * 0.78, hy - r * 0.62, r * 0.27, c.main, o) + circle(hx + d * r * 0.78, hy - r * 0.6, r * 0.14, c.light);
      });
    }
    return s;
  }
  function tail(sp, st, g, c, bx) {
    var by = g.by, rx = g.brx, ry = g.bry, s = '', o = outline(c.dark), k = [0.9, 1.15, 1.4][st];
    if (sp.tail === 'fluffy') {
      var x0 = bx + rx * 0.6, y0 = by + ry * 0.35;
      var d = P('M', x0, y0, 'C', x0 + 55 * k, y0 + 10, x0 + 62 * k, y0 - 70 * k, x0 + 22 * k, y0 - 78 * k,
        'C', x0 + 34 * k, y0 - 45 * k, x0 + 20 * k, y0 - 18, x0 - 6, y0 - ry * 0.5, 'Z');
      s += path(d, c.main, o);
      var tx = x0 + 22 * k, ty = y0 - 78 * k;
      s += path(P('M', tx, ty, 'C', tx + 22 * k, ty + 8, tx + 22 * k, ty + 26 * k, tx + 14 * k, ty + 34 * k, 'C', tx + 10, ty + 20 * k, tx + 2, ty + 12, tx, ty, 'Z'),
        sp.crest === 'flame' ? c.accent : c.light, o);
      if (sp.crest === 'flame' && st > 0) s += path(P('M', tx + 2, ty + 2, 'Q', tx + 6, ty - 14 * k, tx - 6, ty - 26 * k, 'Q', tx + 14, ty - 16 * k, tx + 14 * k, ty + 6), c.accent, { opacity: 0.9 });
    } else if (sp.tail === 'puff') {
      s += circle(bx + rx * 0.92, by + ry * 0.35, rx * [0.36, 0.4, 0.42][st], c.light, o);
      if (st === 2) s += circle(bx + rx * 1.02, by + ry * 0.25, 5, c.accent);
    } else if (sp.tail === 'paddle') {
      s += '<g transform="rotate(-28 ' + f(bx + rx * 0.7) + ' ' + f(by + ry * 0.6) + ')">' +
        ellipse(bx + rx * 0.7 + 24 * k, by + ry * 0.6, 30 * k, 10 * k, c.main, o) +
        (st > 0 ? ellipse(bx + rx * 0.7 + 38 * k, by + ry * 0.6, 12 * k, 5 * k, c.accent) : '') + '</g>';
    }
    return s;
  }
  function crest(sp, st, g, c, hx) {
    var r = g.hr, top = g.hy - r, s = '', o = outline(c.dark);
    if (sp.crest === 'flame') {
      var h = [18, 26, 38][st];
      s += path(P('M', hx - 12, top + 8, 'Q', hx - 14, top - h * 0.6, hx - 2, top - h, 'Q', hx - 2, top - h * 0.45, hx + 6, top - h * 0.7,
        'Q', hx + 16, top - h * 0.2, hx + 12, top + 8, 'Z'), c.accent, outline(c.dark));
      if (st === 2) s += path(P('M', hx - 5, top + 4, 'Q', hx - 4, top - h * 0.4, hx + 3, top - h * 0.55, 'Q', hx + 7, top - 6, hx + 5, top + 4, 'Z'), '#fff6c9');
    } else if (sp.crest === 'drop') {
      var dy = g.hy - r * 0.55;
      s += path(P('M', hx, dy - 9, 'Q', hx + 7, dy + 1, hx, dy + 5, 'Q', hx - 7, dy + 1, hx, dy - 9, 'Z'), c.accent);
      if (st > 0) s += path(P('M', hx - 10, top + 6, 'Q', hx + 4, top - [0, 18, 30][st], hx + 16, top + 2, 'Q', hx + 4, top - 4, hx - 10, top + 6, 'Z'), c.accent, o);
    } else if (sp.crest === 'star') {
      var sr = [11, 14, 18][st], sy = top - sr * 0.5;
      s += path(starPath(hx, sy, sr, sr * 0.45), c.accent, outline(c.dark));
      if (st === 2) { s += path(starPath(hx - 26, top + 2, 5, 2.2), c.accent) + path(starPath(hx + 26, top + 4, 4, 1.8), c.accent); }
    } else if (sp.crest === 'leaf') {
      var lh = [16, 20, 24][st];
      s += path(P('M', hx, top + 4, 'Q', hx + 1, top - lh * 0.6, hx - 2, top - lh), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
      s += path(P('M', hx - 2, top - lh, 'Q', hx - 22, top - lh - 10, hx - 24, top - lh + 8, 'Q', hx - 10, top - lh + 10, hx - 2, top - lh, 'Z'), c.dark === '#4e8c35' ? '#5fb043' : c.dark, o);
      s += path(P('M', hx - 2, top - lh, 'Q', hx + 18, top - lh - 14, hx + 24, top - lh + 2, 'Q', hx + 10, top - lh + 8, hx - 2, top - lh, 'Z'), c.dark === '#4e8c35' ? '#77c756' : c.main, o);
      if (st >= 1) {
        var fx = hx + r * 0.62, fy = top + r * 0.25, pr = st === 2 ? 6 : 4.5;
        for (var i = 0; i < 5; i++) {
          var a = i * 72 * Math.PI / 180;
          s += circle(fx + Math.cos(a) * pr, fy + Math.sin(a) * pr, pr * 0.85, c.accent);
        }
        s += circle(fx, fy, pr * 0.6, '#ffe27a');
      }
    }
    return s;
  }
  function starPath(cx, cy, R, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; pts.push(f(cx + Math.cos(a) * rad) + ' ' + f(cy + Math.sin(a) * rad)); }
    return 'M' + pts.join(' L') + ' Z';
  }
  function wings(sp, st, g, c, bx, by) {
    if (sp.crest !== 'star' || st < 1) return '';
    var s = '', span = [0, 38, 54][st];
    [-1, 1].forEach(function (d) {
      var x = bx + d * g.brx * 0.6, y = by - g.bry * 0.4;
      s += path(P('M', x, y, 'Q', x + d * span, y - span * 0.9, x + d * span * 1.1, y - span * 0.2, 'Q', x + d * span * 0.7, y + 4, x + d * span * 0.9, y + span * 0.4, 'Q', x + d * span * 0.4, y + 10, x, y + 8, 'Z'), c.light, outline(c.dark));
      s += path(P('M', x + d * span * 0.3, y - span * 0.2, 'Q', x + d * span * 0.7, y - span * 0.5, x + d * span * 0.95, y - span * 0.15), 'none', { stroke: c.accent, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    });
    return s;
  }
  /* Accessories sit on the head or neck; drawn inside the scaled group. */
  function accessory(id, g, hx, c) {
    var r = g.hr, top = g.hy - r, s = '', ey = g.hy + g.ey;
    switch (id) {
      case 'strawhat':
        s += ellipse(hx, top + 8, r * 1.15, r * 0.24, '#e9c46a', { stroke: '#b08a2e', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.55, top + 8, 'Q', hx - r * 0.5, top - r * 0.5, hx, top - r * 0.52, 'Q', hx + r * 0.5, top - r * 0.5, hx + r * 0.55, top + 8, 'Z'), '#f2d27a', { stroke: '#b08a2e', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.55, top + 2, 'Q', hx, top - 4, hx + r * 0.55, top + 2), 'none', { stroke: '#e45757', 'stroke-width': 5 });
        break;
      case 'sunglasses':
        [-1, 1].forEach(function (d) { s += el('rect', { x: f(hx + d * g.ed - g.er[0] * 1.5), y: f(ey - g.er[1] * 0.9), width: f(g.er[0] * 3), height: f(g.er[1] * 1.6), rx: 5, fill: '#1e2430', stroke: '#0a0d12', 'stroke-width': 2 }); });
        s += path(P('M', hx - g.ed + g.er[0] * 1.5, ey - 3, 'L', hx + g.ed - g.er[0] * 1.5, ey - 3), 'none', { stroke: '#0a0d12', 'stroke-width': 3 });
        s += path(P('M', hx - g.ed - 4, ey - 6, 'l 6 0'), 'none', { stroke: '#8aa4c8', 'stroke-width': 2, opacity: 0.7 });
        break;
      case 'lei':
        for (var i = -3; i <= 3; i++) {
          var lx = hx + i * r * 0.26, ly = g.hy + r * 0.92 + Math.abs(i) * -2.5, col = ['#ff7aa8', '#ffd84a', '#ff9f4a', '#c59cff'][(i + 3) % 4];
          for (var k = 0; k < 5; k++) { var a = k * 1.2566; s += circle(lx + Math.cos(a) * 4.5, ly + Math.sin(a) * 4.5, 4, col); }
          s += circle(lx, ly, 2.5, '#fff6c9');
        }
        break;
      case 'sailor':
        s += path(P('M', hx - r * 0.62, top + 10, 'Q', hx, top - r * 0.55, hx + r * 0.62, top + 10, 'Z'), '#ffffff', { stroke: '#9aa4b2', 'stroke-width': 2 });
        s += el('rect', { x: f(hx - r * 0.66), y: f(top + 4), width: f(r * 1.32), height: 9, rx: 3, fill: '#2a4a8f' });
        break;
      case 'captain':
        s += path(P('M', hx - r * 0.7, top + 8, 'Q', hx - r * 0.8, top - r * 0.45, hx, top - r * 0.5, 'Q', hx + r * 0.8, top - r * 0.45, hx + r * 0.7, top + 8, 'Z'), '#1f2f5c', { stroke: '#0f1a38', 'stroke-width': 2 });
        s += path(P('M', hx - r * 0.72, top + 8, 'Q', hx, top + 20, hx + r * 0.72, top + 8, 'Z'), '#0f1a38');
        s += path(starPath(hx, top - r * 0.12, 7, 3), '#ffd84a');
        break;
      case 'crown':
        s += path(P('M', hx - r * 0.55, top + 6, 'L', hx - r * 0.62, top - r * 0.38, 'L', hx - r * 0.3, top - r * 0.12, 'L', hx, top - r * 0.5, 'L', hx + r * 0.3, top - r * 0.12, 'L', hx + r * 0.62, top - r * 0.38, 'L', hx + r * 0.55, top + 6, 'Z'), '#f2c14e', { stroke: '#a67c12', 'stroke-width': 2, 'stroke-linejoin': 'round' });
        [-0.62, 0, 0.62].forEach(function (k, j) { s += circle(hx + k * r, top - r * (j === 1 ? 0.5 : 0.38), 4, '#fbf6ee', { stroke: '#d8cbb0', 'stroke-width': 1 }); });
        s += circle(hx, top - 2, 4, '#e45757');
        break;
      case 'bandana':
        s += path(P('M', hx - r * 0.7, g.hy + r * 0.78, 'Q', hx, g.hy + r * 1.05, hx + r * 0.7, g.hy + r * 0.78, 'L', hx + r * 0.2, g.hy + r * 1.35, 'Z'), '#e45757', { stroke: '#a63030', 'stroke-width': 2 });
        s += circle(hx - 6, g.hy + r * 0.98, 2, '#fff') + circle(hx + 8, g.hy + r * 1.05, 2, '#fff');
        break;
    }
    return s;
  }
  function extras(sp, st, g, c, hx) {
    if (st < 2) return '';
    var s = '', neckY = g.hy + g.hr * 0.82;
    if (sp.crest === 'flame') {
      for (var i = -2; i <= 2; i++) {
        var x = hx + i * 11;
        s += path(P('M', x - 8, neckY, 'Q', x - 4, neckY + 16, x, neckY + 22, 'Q', x + 4, neckY + 16, x + 8, neckY, 'Z'), i % 2 ? c.accent : c.main, outline(c.dark));
      }
    } else if (sp.crest === 'drop') {
      [-1, 1].forEach(function (d) {
        var x = hx + d * g.brx * 0.95, y = g.by - 4;
        s += path(P('M', x, y - 14, 'Q', x + d * 26, y - 6, x + d * 20, y + 16, 'Q', x + d * 8, y + 6, x, y + 8, 'Z'), c.accent, outline(c.dark));
      });
    } else if (sp.crest === 'leaf') {
      for (var j = -2; j <= 2; j++) {
        var lx = hx + j * 12, ly = neckY + 4 + Math.abs(j) * -2;
        s += path(P('M', lx, ly - 4, 'Q', lx - 9, ly + 8, lx, ly + 16, 'Q', lx + 9, ly + 8, lx, ly - 4, 'Z'), j % 2 ? '#6fbf4f' : '#4f9a37', { stroke: '#356b25', 'stroke-width': 1.5 });
      }
    }
    return s;
  }
  function eyes(st, g, c, hx, mood) {
    var s = '', ey = g.hy + g.ey, rx = g.er[0], ry = g.er[1];
    [-1, 1].forEach(function (d) {
      var x = hx + d * g.ed;
      if (mood === 'asleep' || mood === 'eat') {
        s += path(P('M', x - rx, ey, 'Q', x, ey + ry * 0.8, x + rx, ey), 'none', { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' });
      } else if (mood === 'happy') {
        s += path(P('M', x - rx, ey + 2, 'Q', x, ey - ry * 1.1, x + rx, ey + 2), 'none', { stroke: INK, 'stroke-width': 3.2, 'stroke-linecap': 'round' });
      } else {
        s += ellipse(x, ey, rx, ry, INK);
        s += circle(x - rx * 0.32, ey - ry * 0.38, rx * 0.36, '#fff');
        s += circle(x + rx * 0.35, ey + ry * 0.35, rx * 0.16, '#fff');
        if (mood === 'sleepy' || mood === 'lazy') s += path(P('M', x - rx - 2, ey - ry - 2, 'L', x + rx + 2, ey - ry - 2, 'L', x + rx + 2, ey - (mood === 'sleepy' ? 0 : ry * 0.35), 'Q', x, ey + (mood === 'sleepy' ? 3 : -ry * 0.1), x - rx - 2, ey - (mood === 'sleepy' ? 0 : ry * 0.35), 'Z'), c.main);
        if (st === 2 && mood !== 'sleepy' && mood !== 'lazy') s += path(P('M', x - d * rx * 1.3, ey - ry - 5, 'L', x + d * rx * 0.9, ey - ry - 1), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
        if (mood === 'hungry' || mood === 'grubby') s += path(P('M', x - d * rx * 1.1, ey - ry - 1, 'L', x + d * rx * 0.8, ey - ry - 6), 'none', { stroke: c.dark, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      }
    });
    return s;
  }
  function mouth(sp, g, c, hx, mood) {
    var my = g.hy + g.hr * 0.42, s = '';
    if (sp.muzzle) s += ellipse(hx, my - 2, g.hr * 0.36, g.hr * 0.24, c.light);
    s += ellipse(hx, my - 7, 3.6, 2.6, INK);
    if (mood === 'hungry' || mood === 'eat') s += ellipse(hx, my + 3, 4.5, mood === 'eat' ? 6 : 4, '#7a2a3a');
    else if (mood === 'grubby' || mood === 'lazy' || mood === 'sleepy') s += path(P('M', hx - 5, my + 3, 'Q', hx, my - 0.5, hx + 5, my + 3), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round' });
    else s += path(P('M', hx - 7, my, 'Q', hx - 3.5, my + (mood === 'happy' ? 7 : 4), hx, my, 'Q', hx + 3.5, my + (mood === 'happy' ? 7 : 4), hx + 7, my), 'none', { stroke: INK, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    return s;
  }
  function moodFx(g, hx, mood) {
    var s = '';
    if (mood === 'grubby') {
      [[-22, 12, 7], [18, 22, 6], [-6, -18, 5], [24, -8, 4]].forEach(function (m) { s += ellipse(hx + m[0], g.hy + m[1], m[2] * 1.3, m[2], '#8a6a4a', { opacity: 0.75 }); });
      [[-10, g.by + 4, 8], [14, g.by + 10, 6]].forEach(function (m) { s += ellipse(hx + m[0], m[1], m[2] * 1.3, m[2], '#8a6a4a', { opacity: 0.75 }); });
      s += path(P('M', hx + 52, g.hy - 20, 'q 6 -6 0 -12 q -6 -6 0 -12'), 'none', { stroke: '#8fa06a', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
      s += path(P('M', hx + 62, g.hy - 12, 'q 6 -6 0 -12 q -6 -6 0 -12'), 'none', { stroke: '#8fa06a', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    } else if (mood === 'asleep' || mood === 'sleepy') {
      var zx = hx + g.hr * 0.9, zy = g.hy - g.hr * 0.9;
      s += el('text', { x: f(zx), y: f(zy), 'font-size': 18, 'font-weight': 700, fill: '#6b7fd6', 'font-family': 'sans-serif' }, 'z');
      s += el('text', { x: f(zx + 12), y: f(zy - 14), 'font-size': 13, 'font-weight': 700, fill: '#6b7fd6', 'font-family': 'sans-serif' }, 'z');
    } else if (mood === 'hungry') {
      s += path(P('M', hx + 4, g.hy + g.hr * 0.52, 'q 2 8 0 10 q -3 -3 0 -10'), '#9ad6ff');
    } else if (mood === 'lazy') {
      s += path(P('M', hx - g.hr - 6, g.hy - 6, 'l -8 -2 M', hx - g.hr - 6, g.hy + 2, 'l -9 1'), 'none', { stroke: '#9aa4b2', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
    }
    return s;
  }

  /* opts.flags: thin (starving: skinny and dull), dirty (mud, messy hair, green stink), tired (eye bags, droopy lids), pudgy (no exercise: round and grumpy) */
  function draw(spId, st, pi, mood, opts) {
    opts = opts || {};
    var fl = opts.flags || {};
    var sp = byId(spId) || SPECIES[0];
    st = Math.max(0, Math.min(2, st || 0));
    var c = opts.pal || sp.palettes[pi] || sp.palettes[0];
    var g = GEO[st], hx = 100, bx = 100, o = outline(c.dark);
    mood = mood || 'ok';
    var calm = mood === 'ok' || mood === 'happy';
    var eyeMood = fl.tired && calm ? 'lazy' : (fl.pudgy && mood === 'happy' ? 'ok' : mood);
    var mouthMood = (fl.pudgy || fl.thin || fl.dirty) && calm ? 'grubby' : mood;
    var bw = fl.pudgy ? 1.32 : fl.thin ? 0.72 : 1, bh = fl.pudgy ? 1.05 : fl.thin ? 0.97 : 1;
    var s = '<defs><filter id="cre-dull"><feColorMatrix type="saturate" values="0.3"/></filter></defs>';
    s += ellipse(100, 186, 46 * g.scale * (fl.pudgy ? 1.2 : 1), 7, 'rgba(0,0,0,.14)');
    s += '<g transform="translate(100 186) scale(' + g.scale + ') translate(-100 -186)"' + (fl.thin ? ' filter="url(#cre-dull)"' : '') + '>';
    s += tail(sp, st, g, c, bx);
    var lazy = mood === 'lazy' || mood === 'asleep';
    var brx = g.brx * bw * (lazy ? 1.1 : 1), bry = g.bry * bh * (lazy ? 0.86 : 1), by = g.by + (lazy ? 6 : 0) + (fl.pudgy ? 2 : 0);
    s += wings(sp, st, g, c, bx, by);
    s += ellipse(bx, by, brx, bry, c.main, o);
    s += ellipse(bx, by + bry * 0.18, brx * 0.62, bry * 0.66, c.light);
    if (fl.thin) for (var r = 0; r < 3; r++) s += path(P('M', bx - brx * 0.4, by - 8 + r * 9, 'Q', bx, by - 3 + r * 9, bx + brx * 0.4, by - 8 + r * 9), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.6, 'stroke-linecap': 'round' });
    if (fl.pudgy) s += path(P('M', bx - brx * 0.35, by + bry * 0.35, 'Q', bx, by + bry * 0.55, bx + brx * 0.35, by + bry * 0.35), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.35 });
    if (st === 2 && sp.crest === 'flame') s += path(P('M', bx - brx * 0.9, by - 6, 'l 10 4 M', bx + brx * 0.9, by - 6, 'l -10 4'), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    var fy = by + bry - 3;
    [-1, 1].forEach(function (d) { s += ellipse(bx + d * brx * 0.52, fy, g.foot * (fl.thin ? 0.8 : 1), g.foot * 0.62, c.main, o); });
    s += extras(sp, st, g, c, hx);
    s += ears(sp, st, g, c, hx);
    s += circle(hx, g.hy, g.hr * (fl.pudgy ? 1.05 : fl.thin ? 0.95 : 1), c.main, o);
    if (fl.pudgy) [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.hr * 0.7, g.hy + g.hr * 0.32, g.hr * 0.3, g.hr * 0.22, c.main); });
    if (fl.thin) [-1, 1].forEach(function (d) { s += path(P('M', hx + d * g.hr * 0.55, g.hy + g.hr * 0.05, 'q', d * 4, 10, 0, 18), 'none', { stroke: c.dark, 'stroke-width': 2, opacity: 0.45 }); });
    s += crest(sp, st, g, c, hx);
    if (fl.dirty) s += messyHair(g, c, hx);
    if (!fl.thin && !fl.dirty) [-1, 1].forEach(function (d) { s += ellipse(hx + d * g.hr * 0.62, g.hy + g.hr * 0.3, g.hr * 0.16, g.hr * 0.1, '#ff8fa3', { opacity: 0.55 }); });
    s += mouth(sp, g, c, hx, mouthMood);
    s += eyes(st, g, c, hx, eyeMood);
    if (fl.tired && mood !== 'asleep') [-1, 1].forEach(function (d) {
      var ex = hx + d * g.ed, ey = g.hy + g.ey + g.er[1] + 2;
      s += path(P('M', ex - g.er[0], ey, 'Q', ex, ey + 7, ex + g.er[0], ey), 'none', { stroke: '#7b5aa6', 'stroke-width': 2.5, opacity: 0.75, 'stroke-linecap': 'round' });
    });
    if ((fl.pudgy || fl.dirty) && calm && !fl.tired) [-1, 1].forEach(function (d) {
      var ex = hx + d * g.ed, ey = g.hy + g.ey - g.er[1];
      s += path(P('M', ex - d * g.er[0] * 1.2, ey - 1, 'L', ex + d * g.er[0] * 0.9, ey - 6), 'none', { stroke: c.dark, 'stroke-width': 3, 'stroke-linecap': 'round' });
    });
    if (opts.acc) s += accessory(opts.acc, g, hx, c);
    s += moodFx(g, hx, mood === 'grubby' ? 'ok' : mood);
    if (fl.dirty) s += dirtFx(g, hx, by);
    s += '</g>';
    if (fl.dirty) s += stink();
    if (sp.rare || opts.glow) s = '<g opacity=".85">' + path(starPath(18, 20, 7, 3), '#ffe27a') + path(starPath(186, 50, 5, 2), '#ffe27a') + path(starPath(170, 150, 4, 1.8), '#ffe27a') + '</g>' + s;
    if (opts.shine) s += path('M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z', '#ffe27a') + path('M168 70 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z', '#ffe27a');
    return '<svg viewBox="-6 -34 212 234" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + sp.names[st] + '">' + s + '</svg>';
  }
  function messyHair(g, c, hx) {
    var top = g.hy - g.hr, s = '';
    [[-26, 8], [-14, 0], [-2, -4], [10, 0], [22, 6]].forEach(function (t, i) {
      var x = hx + t[0], y = top + t[1] + 6;
      s += path(P('M', x - 6, y + 4, 'L', x - 2 + (i % 2 ? 6 : -6), y - 12, 'L', x + 2, y, 'L', x + 7 + (i % 2 ? -4 : 5), y - 10, 'L', x + 6, y + 5, 'Z'), c.dark, { opacity: 0.85 });
    });
    return s;
  }
  function dirtFx(g, hx, by) {
    var s = '';
    [[-22, 12, 7], [18, 22, 6], [-6, -18, 5], [24, -8, 4]].forEach(function (m) { s += ellipse(hx + m[0], g.hy + m[1], m[2] * 1.3, m[2], '#7a5a3a', { opacity: 0.8 }); });
    [[-12, by + 4, 8], [14, by + 12, 7], [0, by - 10, 5]].forEach(function (m) { s += ellipse(hx + m[0], m[1], m[2] * 1.3, m[2], '#7a5a3a', { opacity: 0.8 }); });
    return s;
  }
  function stink() {
    var s = '', col = '#7fc241';
    [[150, 60], [165, 30], [40, 50]].forEach(function (p, i) {
      s += path(P('M', p[0], p[1], 'q 8 -8 0 -16 q -8 -8 0 -16'), 'none', { stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.85 });
      s += circle(p[0] + (i ? -6 : 8), p[1] - 36, 7, col, { opacity: 0.35 });
    });
    return s;
  }
  function byId(id) { for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i]; return null; }
  function randomPalette(sp) {
    var normal = [], rare = [];
    sp.palettes.forEach(function (p, i) { (p.rare ? rare : normal).push(i); });
    if (rare.length && Math.random() < 0.06) return rare[Math.floor(Math.random() * rare.length)];
    return normal[Math.floor(Math.random() * normal.length)];
  }
  /* The rare egg: gold, speckled, glowing. */
  function egg(size) {
    var s = '<defs><radialGradient id="egg-glow"><stop offset="0" stop-color="#fff6b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>' +
      circle(100, 110, 92, 'url(#egg-glow)') +
      path('M100 36 C140 36 158 96 158 124 C158 160 132 180 100 180 C68 180 42 160 42 124 C42 96 60 36 100 36 Z', '#f6c945', { stroke: '#b8860b', 'stroke-width': 4 }) +
      path('M60 118 Q80 104 100 118 Q120 132 140 118', 'none', { stroke: '#fff3b8', 'stroke-width': 6, 'stroke-linecap': 'round' }) +
      path(starPath(82, 86, 10, 4.5), '#fffbe0') + path(starPath(122, 150, 8, 3.5), '#fffbe0') + circle(118, 92, 5, '#e8a92b') + circle(76, 148, 6, '#e8a92b') +
      ellipse(80, 70, 10, 16, '#ffffff', { opacity: 0.5, transform: 'rotate(-20 80 70)' }) +
      path(starPath(30, 40, 9, 4), '#ffe27a') + path(starPath(176, 60, 7, 3), '#ffe27a') + path(starPath(170, 176, 6, 2.5), '#ffe27a');
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rare egg"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + s + '</svg>';
  }
  function starters() { return SPECIES.filter(function (s) { return !s.rare; }); }
  function rares() { return SPECIES.filter(function (s) { return s.rare; }); }
  window.CRE = { SPECIES: SPECIES, draw: draw, byId: byId, randomPalette: randomPalette, egg: egg, starters: starters, rares: rares, accessory: accessory };
})();
