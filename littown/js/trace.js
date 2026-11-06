/* Lit Town — letter tracing and writing (ES5). The pad, the ladder and the feedback; the checks
 * themselves are in trace-check.js and every threshold is in www/content/tracing.json.
 *
 * The ladder, ONE try per rung, no failure sounds, no fail state:
 *   forced   — dotted letter + an animated pen, one stroke at a time; she follows with her finger.
 *              It cannot fail and ends with her letter beside the right one.
 *   dotted   — she traces the dotted letter (start near the start dot, cover most of it, right way).
 *   freehand — no guide; lenient. A letter facing the other way (b/d, p/q, s, j) gets a gentle
 *              "facing the other way" and her letter flips round.
 * A NEW letter goes up (forced → dotted → freehand). Review goes down (freehand; a miss drops to
 * dotted, then forced). In a word each box runs its own ladder, dotted at most; if most boxes drop,
 * the rest of the word becomes a dotted trace.
 *
 * Touch: plain touch events (old Silk / WebView on a Fire 7) with a mouse fallback; one finger at a
 * time; points closer than minPointGapPx are dropped and each drawing keeps at most maxPoints.
 */
(function (w) {
  var RA = w.RA, U = RA.U, TC = RA.TraceCheck;
  var Trace = RA.Trace = {};
  var NS = 'http://www.w3.org/2000/svg';
  var data = null;

  Trace.init = function (d) { data = d || { settings: {}, letters: {} }; };
  Trace.settings = function () { return (data && data.settings) || {}; };
  Trace.letters = function () { return (data && data.letters) || {}; };
  Trace.has = function (ch) { return !!Trace.letters()[ch]; };
  /** Letters of a word or name that can be traced (lowercase a–z; capitals come later). */
  Trace.letterList = function (text) {
    return String(text || '').toLowerCase().split('').filter(function (c) { return Trace.has(c); });
  };

  function svgEl(tag, attrs) {
    var e = w.document.createElementNS(NS, tag), k;
    for (k in attrs) { if (attrs.hasOwnProperty(k)) { e.setAttribute(k, attrs[k]); } }
    return e;
  }
  function cls(e, c, on) { var v = (e.getAttribute('class') || '').replace(new RegExp('(^| )' + c + '( |$)'), ' ').replace(/\s+/g, ' ').replace(/^ | $/g, ''); e.setAttribute('class', on ? (v ? v + ' ' : '') + c : v); }

  var CELL_PAD = 26, TOP = -14, BOTTOM = 164;

  /**
   * A writing pad: one box per letter, ruled like handwriting paper.
   * opts: { letters: ['m','a','t'] (or [] / null for free drawing), look: 'paper'|'marker'|'chalk',
   *         free: bool (free drawing: one wide box, no letters), maxPoints }
   */
  Trace.pad = function (opts) {
    var S = Trace.settings(), L = Trace.letters();
    var letters = opts.letters || [], look = opts.look || 'paper';
    var pad = { cells: [], active: 0, listeners: {}, points: 0, maxPoints: opts.maxPoints || S.maxPoints || 600, enabled: true };
    var x = 0;
    if (opts.free) {
      pad.cells.push({ letter: '', ox: 0, x0: 0, x1: 360, strokes: [] });
      x = 360;
    } else {
      letters.forEach(function (ch) {
        var lw = (L[ch] || { w: 50 }).w, cw = Math.max(lw, 50) + CELL_PAD * 2;
        pad.cells.push({ letter: ch, ox: x + (cw - lw) / 2, x0: x, x1: x + cw, strokes: [] });
        x += cw;
      });
    }
    var vb = { x: 0, y: TOP, w: Math.max(x, 1), h: BOTTOM - TOP };
    pad.vb = vb;
    var el = U.el('div.trace-pad.look-' + look + (opts.free ? '.free' : '') + (letters.length > 1 ? '.word' : ''));
    // a word pad is as wide as its boxes (330 px tall), up to the screen's width
    if (letters.length > 1) { el.style.width = Math.min(820, Math.round(vb.w * 330 / vb.h) + 12) + 'px'; }
    var svg = svgEl('svg', { viewBox: vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h, preserveAspectRatio: 'xMidYMid meet', 'class': 'trace-svg' });
    var gLines = svgEl('g', { 'class': 'tr-lines' }), gModel = svgEl('g', { 'class': 'tr-model' }), gInk = svgEl('g', { 'class': 'tr-ink' }), gTop = svgEl('g', { 'class': 'tr-top' });
    svg.appendChild(gLines); svg.appendChild(gModel); svg.appendChild(gInk); svg.appendChild(gTop);
    el.appendChild(svg);
    pad.el = el; pad.svg = svg;

    pad.cells.forEach(function (c, i) {
      // the box and its handwriting lines: top, dashed midline, baseline, tail line
      var box = svgEl('rect', { x: c.x0 + 4, y: TOP + 4, width: c.x1 - c.x0 - 8, height: BOTTOM - TOP - 8, rx: 10, 'class': 'tr-box' });
      gLines.appendChild(box);
      c.box = box;
      [[0, 'tr-line top'], [50, 'tr-line mid'], [100, 'tr-line base'], [150, 'tr-line tail']].forEach(function (ln) {
        gLines.appendChild(svgEl('line', { x1: c.x0 + 10, x2: c.x1 - 10, y1: ln[0], y2: ln[0], 'class': ln[1] }));
      });
      c.model = svgEl('g', { 'class': 'tr-letter', 'data-cell': String(i) });
      gModel.appendChild(c.model);
      c.ink = svgEl('g', { 'class': 'tr-cell-ink', 'data-cell': String(i) });
      gInk.appendChild(c.ink);
    });

    /* ---- the model letter: dotted, solid, faint, or none ---- */
    pad.showModel = function (i, style) {
      var c = pad.cells[i];
      U.clear(c.model);
      c.modelStyle = style;
      if (!c.letter || style === 'none') { return; }
      var def = L[c.letter], pd = TC.pathData(def, c.ox, 0, 1);
      pd.strokes.forEach(function (d, si) {
        c.model.appendChild(svgEl('path', { d: d, 'class': 'tr-model-line ' + style, 'data-stroke': String(si) }));
      });
      pd.dots.forEach(function (p) { c.model.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 5, 'class': 'tr-model-dot ' + style })); });
      if (style === 'dotted' || style === 'forced') {
        var s0 = TC.startPoint(def);
        c.model.appendChild(svgEl('circle', { cx: c.ox + s0.x, cy: s0.y, r: 9, 'class': 'tr-start' }));
      }
    };
    pad.setActive = function (i) {
      pad.active = i;
      pad.cells.forEach(function (c, k) { cls(c.box, 'active', k === i && pad.cells.length > 1); });
    };
    pad.clearInk = function (i) {
      var c = pad.cells[i];
      U.clear(c.ink);
      c.ink.removeAttribute('transform');
      pad.points -= c.points || 0;
      c.points = 0;
      c.strokes = [];
    };
    pad.clearAll = function () { pad.cells.forEach(function (c, i) { pad.clearInk(i); }); pad.points = 0; };
    /** Her ink in the cell's letter frame. */
    pad.ink = function (i) {
      var c = pad.cells[i];
      return c.strokes.map(function (st) { return st.pts.map(function (p) { return { x: p.x - c.ox, y: p.y }; }); });
    };
    pad.on = function (name, fn) { pad.listeners[name] = fn; };
    function emit(name, a) { if (pad.listeners[name]) { pad.listeners[name](a); } }

    /* ---- drawing ---- */
    var cur = null, touchId = null, lastTouch = 0, gapPx = S.minPointGapPx || 3;
    function toUnits(cx, cy) {
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) { return null; }
      var s = Math.min(r.width / vb.w, r.height / vb.h);
      var offX = (r.width - vb.w * s) / 2, offY = (r.height - vb.h * s) / 2;
      return { x: vb.x + (cx - r.left - offX) / s, y: vb.y + (cy - r.top - offY) / s, s: s };
    }
    function begin(p) {
      if (!pad.enabled || !p) { return; }
      var c = pad.cells[pad.active];
      var path = svgEl('path', { d: 'M' + r1(p.x) + ' ' + r1(p.y) + 'l0 0', 'class': 'tr-ink-line' });
      c.ink.appendChild(path);
      cur = { c: c, path: path, pts: [{ x: p.x, y: p.y }], d: 'M' + r1(p.x) + ' ' + r1(p.y), gap: gapPx / (p.s || 1) };
      c.strokes.push(cur);
      count(c, 1);
      emit('start', { cell: pad.active, pt: { x: p.x - c.ox, y: p.y } });
    }
    function moveTo(p) {
      if (!cur || !p) { return; }
      var last = cur.pts[cur.pts.length - 1], dx = p.x - last.x, dy = p.y - last.y;
      if (dx * dx + dy * dy < cur.gap * cur.gap) { return; }
      if (pad.points >= pad.maxPoints) { return; }       // the cap on points kept per drawing
      cur.pts.push({ x: p.x, y: p.y });
      cur.d += 'L' + r1(p.x) + ' ' + r1(p.y);
      cur.path.setAttribute('d', cur.d);
      count(cur.c, 1);
      emit('move', { cell: pad.active, pt: { x: p.x - cur.c.ox, y: p.y } });
    }
    function finish() {
      if (!cur) { return; }
      var c = cur.c;
      if (cur.pts.length === 1) { cur.path.setAttribute('d', cur.d + 'l0.1 0'); }   // a dot
      cur = null;
      emit('end', { cell: pad.active, strokes: pad.ink(pad.active) });
    }
    function count(c, n) { c.points = (c.points || 0) + n; pad.points += n; }
    function r1(v) { return Math.round(v * 10) / 10; }

    svg.addEventListener('touchstart', function (e) {
      e.preventDefault();
      lastTouch = Date.now();
      if (touchId !== null) { return; }                     // one finger at a time
      var t = e.changedTouches[0];
      touchId = t.identifier;
      begin(toUnits(t.clientX, t.clientY));
    }, false);
    svg.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var i, t;
      for (i = 0; i < e.changedTouches.length; i++) {
        t = e.changedTouches[i];
        if (t.identifier === touchId) { moveTo(toUnits(t.clientX, t.clientY)); }
      }
    }, false);
    function touchEnd(e) {
      e.preventDefault();
      lastTouch = Date.now();
      var i;
      for (i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) { touchId = null; finish(); }
      }
    }
    svg.addEventListener('touchend', touchEnd, false);
    svg.addEventListener('touchcancel', touchEnd, false);
    svg.addEventListener('mousedown', function (e) {
      if (Date.now() - lastTouch < 800) { return; }        // the mouse events old WebViews fake after a touch
      e.preventDefault();
      begin(toUnits(e.clientX, e.clientY));
      function mm(ev) { moveTo(toUnits(ev.clientX, ev.clientY)); }
      function mu() { w.removeEventListener('mousemove', mm, false); w.removeEventListener('mouseup', mu, false); finish(); }
      w.addEventListener('mousemove', mm, false);
      w.addEventListener('mouseup', mu, false);
    }, false);

    /** Draw strokes as if her finger did (automated tests, and the pen finishing a forced stroke).
     *  strokes are in the active cell's letter frame. */
    pad.feed = function (strokes) {
      var c = pad.cells[pad.active];
      strokes.forEach(function (st) {
        begin({ x: st[0].x + c.ox, y: st[0].y, s: 1 });
        st.slice(1).forEach(function (p) { moveTo({ x: p.x + c.ox, y: p.y, s: 1 }); });
        finish();
      });
    };
    /** A picture of her ink in cell i as an <svg>, to show beside the right letter. */
    pad.inkPicture = function (i, solidModel) {
      var c = pad.cells[i], pic = svgEl('svg', { viewBox: (c.ox - 30) + ' ' + TOP + ' ' + ((L[c.letter] || { w: 50 }).w + 60) + ' ' + (BOTTOM - TOP), 'class': 'tr-mini' });
      [0, 50, 100, 150].forEach(function (y) { pic.appendChild(svgEl('line', { x1: c.ox - 26, x2: c.ox + (L[c.letter] || { w: 50 }).w + 26, y1: y, y2: y, 'class': 'tr-line' + (y === 50 ? ' mid' : '') })); });
      if (solidModel) {
        var pd = TC.pathData(L[c.letter], c.ox, 0, 1);
        pic.appendChild(svgEl('path', { d: pd.d, 'class': 'tr-model-line solid' }));
        pd.dots.forEach(function (p) { pic.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 5, 'class': 'tr-model-dot solid' })); });
      } else {
        c.strokes.forEach(function (st) { pic.appendChild(svgEl('path', { d: st.d + (st.pts.length === 1 ? 'l0.1 0' : ''), 'class': 'tr-ink-line' })); });
      }
      return pic;
    };

    /* ---- the animated pen for the forced trace ---- */
    pad.pen = svgEl('g', { 'class': 'tr-pen hidden-pen' });
    pad.pen.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 11, 'class': 'tr-pen-tip' }));
    pad.pen.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 4, 'class': 'tr-pen-dot' }));
    gTop.appendChild(pad.pen);
    pad.penAt = function (x, y, show) {
      pad.pen.setAttribute('transform', 'translate(' + r1(x) + ' ' + r1(y) + ')');
      cls(pad.pen, 'hidden-pen', !show);
    };
    /** Light up the part of a forced stroke she has followed so far. */
    pad.follow = function (i, si, upto) {
      var c = pad.cells[i];
      var old = c.model.querySelector('.tr-followed');
      if (old) { old.parentNode.removeChild(old); }
      var st = TC.resample(TC.strokesOf(L[c.letter])[si] || [], 2);
      if (st.length < 2) { return; }
      var n = Math.max(1, Math.round(upto * (st.length - 1)));
      c.model.appendChild(svgEl('path', { d: 'M' + st.slice(0, n + 1).map(function (p) { return r1(p.x + c.ox) + ' ' + r1(p.y); }).join('L'), 'class': 'tr-followed' }));
    };
    pad.highlightStroke = function (i, si) {
      var lines = pad.cells[i].model.querySelectorAll('.tr-model-line'), k;
      for (k = 0; k < lines.length; k++) { cls(lines[k], 'now', String(si) === lines[k].getAttribute('data-stroke')); }
    };
    /** Her letter turns round (it was facing the other way): a few frames of the SVG transform
     *  attribute (CSS transforms on SVG are unreliable on old WebViews). */
    pad.flipInk = function (i) {
      var c = pad.cells[i], b = TC.bbox(c.strokes.map(function (st) { return st.pts; }), null), k = 0, N = 12;
      if (!b) { return; }
      (function frame() {
        var sx = Math.cos(Math.PI * k / N);       // 1 → -1: her letter turns round to face the right way
        c.ink.setAttribute('transform', 'translate(' + r1(b.cx) + ' 0) scale(' + (Math.round(sx * 100) / 100 || 0.01) + ' 1) translate(' + r1(-b.cx) + ' 0)');
        if (k++ < N) { w.setTimeout(frame, 60); }
      })();
    };
    return pad;
  };

  /* ---------- running the ladder on one box ---------- */

  /** The rungs to try, in order. kind: 'learn' (new letter), 'review', 'word' (a box in a word),
   *  'word-dotted' (the word moved to the dotted trace). */
  Trace.rungs = function (kind) {
    if (kind === 'learn') { return ['forced', 'dotted', 'freehand']; }
    if (kind === 'word') { return ['freehand', 'dotted']; }
    if (kind === 'word-dotted') { return ['dotted']; }
    return ['freehand', 'dotted', 'forced'];
  };

  /**
   * Run the ladder on box i of the pad.
   * ui: { later(fn, ms), line(id, cb), sound(name), say(), praise(), doneBtn(show, onTap) }
   * onDone({ needed: 'freehand'|'dotted'|'forced', tries: [{ rung, pass, why, mirror }], missedLast })
   */
  Trace.runLadder = function (pad, i, kind, ui, onDone) {
    var S = Trace.settings(), L = Trace.letters(), cell = pad.cells[i], def = L[cell.letter];
    var rungs = Trace.rungs(kind), at = 0, tries = [], passedAny = null, alive = true;
    var learn = kind === 'learn';
    pad.setActive(i);

    function next() {
      if (!alive) { return; }
      if (at >= rungs.length) { return end(); }
      var rung = rungs[at];
      pad.state = { cell: i, rung: rung, stroke: 0, waiting: false };   // where the ladder is (for tests and grown-ups)
      pad.clearInk(i);
      if (rung === 'forced') { return forced(); }
      pad.showModel(i, rung === 'dotted' ? 'dotted' : 'none');
      // say what to do for a single letter, the first box of a word, or when a box drops to the dots
      if (pad.cells.length === 1 || at > 0 || i === 0) { ui.line(rung === 'dotted' ? 'trace-dotted' : (pad.cells.length > 1 ? 'trace-word' : 'trace-free'), ui.say); }
      waitForLetter(function (ink) {
        var r = rung === 'dotted' ? TC.dotted(def, ink, S.dotted) : TC.freehand(def, ink, S.freehand, L, cell.letter);
        var mirrorMiss = r.mirror && (S.freehand.mirrorCountsAsMiss !== false);
        var pass = r.pass || (r.mirror && !mirrorMiss);
        tries.push({ rung: rung, pass: pass, why: r.why || '', mirror: !!r.mirror });
        if (pass && !passedAny) { passedAny = rung; }
        if (r.mirror) {
          // a gentle hint, and her letter flips round to face the right way
          pad.flipInk(i);
          ui.line('trace-flip');
        } else if (pass) {
          ui.sound('chime');
          ui.praise();
        } else {
          ui.line('trace-again');                           // no failure sound, just on to the next rung
        }
        at++;
        // going up (a new letter) she always does every rung; going down she stops at the first pass
        if (pass && !learn) { at = rungs.length; }
        ui.later(next, r.mirror ? 2200 : 1300);
      });
    }

    /** Wait for her letter: a check button once there is ink, or a quiet moment after her last stroke. */
    function waitForLetter(cb) {
      var timer = 0, done = false, auto = S.autoSubmitMs || 3500;
      function submit() {
        if (done || !alive) { return; }
        done = true;
        pad.state.waiting = false;
        pad.enabled = false;
        ui.doneBtn(false);
        cb(pad.ink(i));
        pad.enabled = true;
      }
      pad.on('start', function () { timer++; });
      pad.on('move', null);
      pad.on('end', function () {
        var mine = ++timer;
        ui.doneBtn(true, submit);
        ui.later(function () { if (mine === timer) { submit(); } }, auto);
      });
      pad.enabled = true;
      pad.state.waiting = true;
      ui.doneBtn(false);
    }

    /** Forced trace: the pen shows each stroke; she follows; it cannot fail. */
    function forced() {
      var strokes = TC.strokesOf(def), si = 0, prog = 0, lifts = 0, penTimer = 0, F = S.forced || {}, between = false;
      pad.showModel(i, 'forced');
      ui.line('trace-watch', ui.say);
      function startStroke() {
        if (!alive) { return; }
        if (si >= strokes.length) {
          pad.penAt(0, 0, false);
          pad.highlightStroke(i, -1);
          tries.push({ rung: 'forced', pass: true, why: '', mirror: false });
          if (!passedAny) { passedAny = 'forced'; }
          ui.sound('chime');
          at++;
          if (!learn) { at = rungs.length; }
          return ui.later(next, 900);
        }
        prog = 0; lifts = 0; between = false;
        pad.state.stroke = si;
        pad.highlightStroke(i, si);
        pad.follow(i, si, 0);
        demo();
      }
      // the pen glides along the stroke, waits, and goes again until she follows
      function demo() {
        var st = TC.resample(strokes[si], 3), k = 0, mine = ++penTimer, stepMs = Math.max(16, Math.round(3000 / (F.penUnitsPerSecond || 90)));
        if (st.length === 1) { pad.penAt(st[0].x + cell.ox, st[0].y, true); return; }
        (function tick() {
          if (!alive || mine !== penTimer) { return; }
          if (k < st.length) { pad.penAt(st[k].x + cell.ox, st[k].y, true); k++; return ui.later(tick, stepMs); }
          ui.later(function () { if (mine === penTimer) { k = 0; tick(); } }, F.idleReplayMs ? Math.min(F.idleReplayMs, 1500) : 1200);
        })();
      }
      // between strokes (and after the last) her finger is ignored until the pen shows the next one
      function done() { between = true; penTimer++; pad.follow(i, si, 1); si++; ui.later(startStroke, 250); }
      pad.on('start', function (e) { if (between) { return; } penTimer++; pad.penAt(0, 0, false); track([e.pt]); });
      pad.on('move', function (e) { if (!between) { track([e.pt]); } });
      pad.on('end', function () {
        if (between || si >= strokes.length) { return; }
        if (prog >= (F.strokeDone || 0.85) || strokes[si].length < 2) { done(); return; }
        lifts++;
        // she can't get it wrong: after a few lifts the pen finishes the stroke with her
        if (lifts >= (F.autoFinishAfterLifts || 3)) { done(); return; }
        demo();
      });
      function track(pts) {
        if (si >= strokes.length) { return; }
        prog = TC.progressOn(def, si, pts, F.followRadius || 24, prog);
        pad.follow(i, si, prog);
      }
      ui.doneBtn(false);
      startStroke();
    }

    function end() {
      alive = false;
      pad.on('start', null); pad.on('move', null); pad.on('end', null);
      pad.state = { cell: i, rung: 'done' };
      pad.showModel(i, 'solid');
      var needed;
      if (learn) { needed = tries.some(function (t) { return t.rung === 'freehand' && t.pass; }) ? 'freehand' : (tries.some(function (t) { return t.rung === 'dotted' && t.pass; }) ? 'dotted' : 'forced'); }
      else { needed = passedAny || (kind === 'word' || kind === 'word-dotted' ? 'forced' : 'forced'); }
      onDone({ needed: needed, tries: tries, missedLast: !tries.length || !tries[tries.length - 1].pass });
    }
    next();
    return { stop: function () { alive = false; } };
  };

  /** Run a whole word: box by box; if most boxes drop, the rest of the word is a dotted trace. */
  Trace.runWord = function (pad, kindFirst, ui, onDone) {
    var S = Trace.settings(), n = pad.cells.length, i = 0, dropped = 0, results = [], dotted = false;
    pad.cells.forEach(function (c, k) { pad.showModel(k, 'none'); });
    (function box() {
      if (i >= n) { return onDone({ boxes: results, dropped: dropped, dottedWord: dotted }); }
      Trace.runLadder(pad, i, dotted ? 'word-dotted' : kindFirst, ui, function (r) {
        results.push(r);
        if (r.tries.length && !r.tries[0].pass) { dropped++; }
        if (!dotted && dropped > n * ((S.words || {}).dropMost || 0.5)) {
          dotted = true;
          for (var k = i + 1; k < n; k++) { pad.showModel(k, 'dotted'); }
        }
        i++;
        ui.later(box, 500);
      });
    })();
  };
})(window);
