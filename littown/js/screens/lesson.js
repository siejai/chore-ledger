/* Lit Town — the lesson player (ES5).
 * Routine (built by RA.Engine): warm-up → new sound(s) → blend, build & read words → one rotating
 * activity → sentences/story → flames earned.
 * No timers on screen, no failure sounds: a wrong pick wiggles softly and she tries again.
 * Scoring: every activity with a right answer counts toward the 80% first-try gate (tap-to-choose,
 * clue games, follow the directions, build the word, sorting); only free colouring (and the stuck
 * teach step) never count. Every screen has a Next/Done button so she can never get stuck — on a
 * scored screen, using it before answering counts as a miss. 3 misses on one item: the answer is
 * shown, it counts as a miss, and she moves on (with a short teach step). A scored answer faster than
 * a real read doesn't count either way (the item comes back). */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, A = RA.Audio, E = RA.Engine, IDS = RA.AudioIds;

  // taps this soon after a new step appears are ignored (stops double-taps skipping steps)
  var GUARD_MS = w.WT_TAP_GUARD_MS != null ? w.WT_TAP_GUARD_MS : 300;
  // automated tests answer instantly: they can turn the "too fast to have read it" check off
  function fastCheck() { return !w.WT_NO_MIN_READ; }
  var COLORS = [['red', '#E5484D'], ['orange', '#FF9F43'], ['yellow', '#FFD23F'], ['green', '#4CC27A'], ['blue', '#3D8BFD'],
    ['purple', '#8E6CEF'], ['pink', '#F76CA8'], ['tan', '#D9A877'], ['brown', '#8A5A3B']];
  var ses = null, stage = null, bar = null, replayFn = null, root = null, correctStreak = 0, busy = false, shownAt = 0, skipBtn = null, tracePad = null;

  S.lesson = {
    show: function (r, param) {
      root = r;
      var p = RA.state.profile, n = parseInt(param, 10);
      if (!E.canStart(p, n)) { UI.go('kid', null, true); return; }
      ses = new E.Session(p, n, { grownupCheck: RA.Store.settings().grownupCheck });
      correctStreak = 0;

      var top = U.el('div.lesson-top');
      top.appendChild(UI.btn('ui-back', '', confirmExit, 'small'));
      bar = U.el('div.lesson-bar', null, [U.el('div.lesson-bar-fill')]);
      top.appendChild(bar);
      top.appendChild(UI.btn('ui-speaker', '', function () { if (replayFn) { replayFn(); } }, 'small replay'));
      root.appendChild(top);
      stage = U.el('div.stage');
      root.appendChild(stage);
      // story pictures use art from place packs: load just those first
      var mine = ses;
      RA.World.ensurePacks(packsFor(ses.plan.lesson, ses.plan), function () { if (ses === mine) { render(); } });
    },
    hide: function () { ses = null; replayFn = null; },
    /* for automated tests and the grown-up "skip" tools */
    session: function () { return ses; },
    tracePad: function () { return tracePad; },
    __rerender: function () { render(); }
  };

  /** Art packs a lesson needs: its pictures (www/art/pics.js) and the place packs that hold the
   *  item pictures it uses (story pages, sentences and any picture an activity may pick). */
  function packsFor(lesson, plan) {
    var sprites = [], packs = ['pics'], k, pics = E.pictures();
    // the shop item a word she writes today unlocks (shown on the end screen)
    var wi = plan && plan.traces && plan.traces.word && E.wordItem(plan.traces.word);
    if (wi) { sprites.push(wi.sprite); }
    if (lesson.story) { (lesson.story.pages || []).forEach(function (pg) { if (pg.pic) { sprites.push(pg.pic); } }); }
    (lesson.sentences || []).forEach(function (st) { if (st.pic) { sprites.push(st.pic); } });
    ((lesson.activity && lesson.activity.items) || []).forEach(function (it) { if (it.pic) { sprites.push(it.pic); } });
    if (lesson.activity) { for (k in pics) { if (pics.hasOwnProperty(k)) { sprites.push(pics[k]); } } }
    (E.world().items || []).forEach(function (it) {
      if (sprites.indexOf(it.sprite) >= 0) {
        var loc = RA.World.location(it.location);
        RA.World.packsOf(loc).forEach(function (pk) { if (packs.indexOf(pk) < 0) { packs.push(pk); } });
      }
    });
    return packs;
  }

  function confirmExit() {
    UI.modal('Stop the lesson?', 'You can come back to it any time.', [
      { label: 'Keep reading', cls: 'good' },
      { label: 'Stop', cls: 'ghost', onTap: function () { UI.go('kid', null, true); } }
    ]);
  }

  function updateBar() {
    var pr = ses.progress();
    bar.firstChild.style.width = Math.round((pr.index / Math.max(1, pr.total - 1)) * 100) + '%';
  }

  function advance() {
    if (!ses) { return; }                         // lesson was closed meanwhile
    if (Date.now() - shownAt < GUARD_MS) { return; }   // a double-tap must not skip a step
    busy = false;
    ses.next();
    render();
  }

  /** Run fn later only if the same lesson is still open. */
  function later(fn, ms) {
    var mine = ses;
    setTimeout(function () { if (ses && ses === mine) { fn(); } }, ms);
  }

  /** caption shown only when a clip has not been generated yet (so testing still works) */
  function missingHint(id, text) {
    if (A.has(id)) { return null; }
    return U.el('div.missing-audio', { text: '(no audio yet: ' + text + ')' });
  }

  function nextButton(label) {
    return UI.btn('ui-next', label || '', advance, 'next-btn');
  }

  function render() {
    if (!ses) { return; }
    var s = ses.current();
    U.clear(stage);
    stage.className = 'stage stage-' + s.type;
    updateBar();
    replayFn = null;
    busy = false;
    shownAt = Date.now();
    skipBtn = null;
    tracePad = null;
    var fn = R[s.type];
    if (!fn) { advance(); return; }
    fn(s);
    // a scored screen always has a way on: Next before answering counts as a miss
    if (s.scored && !s.grownup && ses.current() === s && !s.resolved) { addSkip(); }
    fitStage();
  }

  /* Anything on the screen wider than it (a long word's sound tiles on a phone, a colouring page on a tablet
   * held upright) is shrunk to fit. Taps and drags still land right: the browser maps them through zoom. */
  function fitStage() {
    if (!stage || !stage.children) { return; }
    var avail = stage.clientWidth - 16, i, ch;
    if (!(avail > 0)) { return; }
    for (i = 0; i < stage.children.length; i++) {
      ch = stage.children[i];
      if (ch.style.zoom) { ch.style.zoom = ''; }
      var wd = ch.scrollWidth;
      if (wd > avail) { ch.style.zoom = String(Math.floor(avail / wd * 100) / 100); }
    }
  }
  if (window.addEventListener) { window.addEventListener('resize', function () { if (stage && stage.parentNode) { fitStage(); } }); }

  // Skip: a small, faded "skip" button (not the green Next arrow), which only shows up after a while, so it isn't
  // tapped by mistake. It counts as a miss, like a wrong first answer.
  var SKIP_AFTER_MS = 6000;
  function addSkip() {
    skipBtn = UI.btn('ui-skip', '', function () {
      if (busy || Date.now() - shownAt < GUARD_MS) { return; }
      busy = true;
      A.stop();
      ses.skip();
      correctStreak = 0;
      advance();
    }, 'skip-btn.waiting');
    skipBtn.setAttribute('aria-label', 'skip');
    stage.appendChild(skipBtn);
    var mine = skipBtn;
    later(function () { if (skipBtn === mine) { U.removeClass(mine, 'waiting'); } }, SKIP_AFTER_MS);
  }
  /** The answer is in (or shown): swap the skip button for the plain Next. */
  function hideSkip() { if (skipBtn && skipBtn.parentNode) { skipBtn.parentNode.removeChild(skipBtn); } skipBtn = null; }

  /* ---------- shared answer handling ---------- */

  function choose(s, optNode, correct, allNodes, rightNode, replay, onRight) {
    if (busy || Date.now() - shownAt < GUARD_MS) { return; }
    var res = ses.answer(correct, fastCheck() ? { ms: Date.now() - shownAt } : {});
    if (res.tooFast) {
      // too quick to have read it: no score either way; the same item comes back later
      busy = true;
      correctStreak = 0;
      allNodes.forEach(function (nd) { U.flash(nd, 'wiggle', 500); });
      A.line('slow-down', function () { later(advance, 200); });
      later(function () { if (busy) { advance(); } }, 2600);
      return;
    }
    if (correct) {
      busy = true;
      hideSkip();
      U.addClass(optNode, 'right');
      UI.burstOn(optNode);
      RA.Sfx.play('chime');
      correctStreak++;
      var praise = correctStreak % 3 === 0, moved = false, minDone = false, said = !onRight;
      // move on only once the word she picked has been said (onRight gets a done-callback), and not before
      // 650 ms; 4 s at most in case a clip never reports back
      var moveOn = function () {
        if (moved || !minDone || !said || ses.current() !== s) { return; }
        moved = true;
        later(function () {
          if (praise) { A.praise(function () { later(advance, 250); }); later(function () { if (ses.current() === s) { advance(); } }, 2500); } else { advance(); }
        }, onRight ? 300 : 0);
      };
      if (onRight) { later(function () { onRight(function () { said = true; moveOn(); }); }, 250); }
      later(function () { minDone = true; moveOn(); }, 650);
      later(function () { said = true; minDone = true; moveOn(); }, 4000);
      return;
    }
    correctStreak = 0;
    RA.Sfx.play('soft');
    U.flash(optNode, 'wiggle', 500);
    U.addClass(optNode, 'dim');
    if (res.retry) {
      A.line('try-again', function () { if (replay) { replay(); } });
      return;
    }
    // 3 misses (or a yes/no miss): show the right one — it counted as a miss — then on to the next
    // (after 3 misses a short teach step comes next)
    busy = true;
    hideSkip();
    allNodes.forEach(function (nd) { if (nd !== rightNode) { U.addClass(nd, 'dim'); } });
    U.addClass(rightNode, 'reveal');
    A.line('show-answer', function () { if (onRight) { onRight(function () {}); } else if (replay) { replay(); } });
    stage.appendChild(nextButton());
  }

  /* ---------- shared bits for the newer activities ---------- */

  function picBox(sprite, cls) {
    var d = U.el('div.pic' + (cls ? '.' + cls : ''));
    d.innerHTML = w.ART.svg(sprite) || '';
    return d;
  }

  /** A sentence with a blank (the "_"), as a tappable read-line. */
  function blankLine(t, cls) {
    var line = UI.readLine(t.replace('_', 'QQBLANKQQ'), cls || 'sentence');
    var words = line.querySelectorAll('.word'), i, blank = null;
    for (i = 0; i < words.length; i++) {
      if (words[i].textContent === 'QQBLANKQQ') {
        blank = U.el('span.blank', { text: '' });
        words[i].parentNode.replaceChild(blank, words[i]);
      }
    }
    return { line: line, blank: blank };
  }

  /** Drag a card or tile (touch or mouse); a plain tap calls onTap instead.
   *  onDrop(x, y) returns true when it landed somewhere useful; otherwise it slides back. */
  function draggable(el, onTap, onDrop) {
    var sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false, lastTouch = 0;
    function start(x, y) { down = true; moved = false; sx = x; sy = y; dx = 0; dy = 0; }
    function move(x, y) {
      if (!down) { return; }
      dx = x - sx; dy = y - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 12) { return; }
      moved = true;
      U.addClass(el, 'dragging');
      el.style.webkitTransform = el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
    }
    function end(x, y) {
      if (!down) { return; }
      down = false;
      U.removeClass(el, 'dragging');
      el.style.webkitTransform = el.style.transform = '';
      if (!moved) { onTap(); return; }
      if (!onDrop(x, y)) { U.flash(el, 'wiggle', 400); }
    }
    el.addEventListener('touchstart', function (e) { var t = e.touches[0]; start(t.clientX, t.clientY); }, false);
    el.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (down) { e.preventDefault(); } move(t.clientX, t.clientY); }, false);
    el.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; lastTouch = Date.now(); e.preventDefault(); end(t.clientX, t.clientY); }, false);
    el.addEventListener('mousedown', function (e) {
      if (Date.now() - lastTouch < 700) { return; }
      e.preventDefault();
      start(e.clientX, e.clientY);
      function mm(ev) { move(ev.clientX, ev.clientY); }
      function mu(ev) { w.removeEventListener('mousemove', mm, false); w.removeEventListener('mouseup', mu, false); end(ev.clientX, ev.clientY); }
      w.addEventListener('mousemove', mm, false);
      w.addEventListener('mouseup', mu, false);
    }, false);
    // keyboard / assistive "click" with no pointer events before it (also what automated tests use)
    el.addEventListener('click', function (e) { if (!down && e.detail === 0) { onTap(); } }, false);
  }
  function hit(node, x, y) { var r = node.getBoundingClientRect(); return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

  /** Colour palette for the colouring pages; onPick(name, hex). */
  function palette(onPick) {
    var row = U.el('div.palette'), chosen = null;
    COLORS.forEach(function (c) {
      var b = U.el('button.swatch', { type: 'button', 'data-color': c[0], style: 'background:' + c[1] });
      U.tap(b, function () {
        RA.Audio.unlock();
        if (chosen) { U.removeClass(chosen, 'on'); }
        chosen = b; U.addClass(b, 'on');
        RA.Sfx.play('pop');
        onPick(c[0], c[1]);
      });
      row.appendChild(b);
    });
    return row;
  }
  /** A colouring page: { box, parts: { name: <g> } }. */
  function colorPage(sprite) {
    var box = U.el('div.color-page');
    box.innerHTML = w.ART.svg(sprite) || '';
    var parts = {}, gs = box.querySelectorAll('g[data-part]'), i;
    for (i = 0; i < gs.length; i++) { parts[gs[i].getAttribute('data-part')] = gs[i]; }
    return { box: box, parts: parts };
  }
  function fillPart(g, hex) {
    var shapes = g.querySelectorAll('.cf'), i;
    for (i = 0; i < shapes.length; i++) { shapes[i].setAttribute('fill', hex); }
  }

  function optionGrid(values, renderFn, cls) {
    var grid = U.el('div.options' + (cls ? '.' + cls : ''));
    var nodes = [];
    values.forEach(function (v) {
      var b = U.el('button.option', { type: 'button' });
      renderFn(b, v);
      grid.appendChild(b);
      nodes.push(b);
    });
    return { grid: grid, nodes: nodes };
  }

  /* ---------- step renderers ---------- */

  var R = {};

  R.title = function () {
    var L = ses.plan.lesson;
    var card = U.el('div.title-card');
    card.appendChild(U.el('div.lesson-num', { text: 'Lesson ' + ses.n }));
    card.appendChild(U.el('div.lesson-title', { text: L.title }));
    stage.appendChild(card);
    stage.appendChild(UI.btn('ui-play', 'Start', advance, 'huge start'));
    replayFn = function () { A.line('lesson-start'); };
    replayFn();
  };

  R['find-sound'] = function (s) {
    var id = IDS.phoneme(s.sound);
    function sayIt() { A.play(id); }
    stage.appendChild(sectionTag(s));
    var spk = UI.btn('ui-speaker', '', sayIt, 'speaker-big');
    stage.appendChild(spk);
    var hint = missingHint(id, s.g);
    if (hint) { stage.appendChild(hint); }
    var og = optionGrid(s.options, function (b, g) { b.appendChild(U.el('span.grapheme', { text: g })); }, 'letters');
    var right = og.nodes[s.options.indexOf(s.g)];
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () { RA.Audio.unlock(); choose(s, nd, s.options[i] === s.g || E.phonemeOf(s.options[i]) === s.sound, og.nodes, right, sayIt); });
    });
    stage.appendChild(og.grid);
    replayFn = sayIt;
    if (s.first) { A.line(s.section === 'warmup' ? 'find-sound' : 'find-sound', sayIt); } else { sayIt(); }
  };

  R['find-word'] = function (s) {
    var id = IDS.word(s.w);
    function sayIt() { A.play(id); }
    stage.appendChild(sectionTag(s));
    stage.appendChild(UI.btn('ui-speaker', '', sayIt, 'speaker-big'));
    var hint = missingHint(id, s.w);
    if (hint) { stage.appendChild(hint); }
    var og = optionGrid(s.options, function (b, wd) { b.appendChild(U.el('span.wordtile', { text: wd })); }, 'words');
    var right = og.nodes[s.options.indexOf(s.w)];
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () { RA.Audio.unlock(); choose(s, nd, s.options[i].toLowerCase() === s.w.toLowerCase(), og.nodes, right, sayIt); });
    });
    stage.appendChild(og.grid);
    replayFn = sayIt;
    if (s.first) { A.line('find-word', sayIt); } else { sayIt(); }
  };

  // scored: hear a word, find it in a short passage she just read, and tap it
  R['find-in-text'] = function (s) {
    var id = IDS.word(s.w);
    function sayIt() { A.play(id); }
    stage.appendChild(sectionTag(s));
    stage.appendChild(UI.btn('ui-speaker', '', sayIt, 'speaker-big'));
    var hint = missingHint(id, s.w);
    if (hint) { stage.appendChild(hint); }
    var nodes = [], right = null;
    var box = UI.readLine(s.t, 'story-text.find-text', function (node, word, i) {
      choose(s, node, i === s.at || word.toLowerCase() === s.w, nodes, right, sayIt);
    });
    var spans = box.querySelectorAll('.word'), k;
    for (k = 0; k < spans.length; k++) { nodes.push(spans[k]); }
    right = nodes[s.at] || null;
    stage.appendChild(box);
    replayFn = sayIt;
    if (s.first) { A.line('find-in-text', sayIt); } else { sayIt(); }
  };

  R['match-case'] = function (s) {
    var id = IDS.phoneme(E.phonemeOf(s.lower));
    function sayIt() { A.play(id); }
    stage.appendChild(sectionTag(s));
    var big = U.el('button.big-letter', { type: 'button', text: s.upper });
    U.tap(big, sayIt);
    stage.appendChild(big);
    var og = optionGrid(s.options, function (b, g) { b.appendChild(U.el('span.grapheme', { text: g })); }, 'letters');
    var right = og.nodes[s.options.indexOf(s.lower)];
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () { choose(s, nd, s.options[i] === s.lower, og.nodes, right, sayIt); });
    });
    stage.appendChild(og.grid);
    replayFn = sayIt;
    if (s.first) { A.line('match-case'); }
  };

  R['teach-grapheme'] = function (s) {
    var id = IDS.phoneme(s.sound), taps = 0;
    function sayIt() { A.play(id); }
    stage.appendChild(U.el('div.section-tag', { text: 'New sound' }));
    var card = U.el('button.teach-card', { type: 'button' });
    card.appendChild(U.el('span.grapheme.huge', { text: s.g }));
    if (E.P.knows('capitals', ses.n) && s.g.length === 1) {
      card.appendChild(U.el('span.grapheme-cap', { text: s.g.toUpperCase() + ' ' + s.g }));
    }
    stage.appendChild(card);
    var hint = missingHint(id, s.g + ' says /' + s.sound + '/');
    if (hint) { stage.appendChild(hint); }
    var dots = U.el('div.tap-dots');
    for (var i = 0; i < 3; i++) { dots.appendChild(U.el('span.tap-dot')); }
    stage.appendChild(dots);
    var nb = nextButton();
    U.addClass(nb, 'hidden');
    stage.appendChild(nb);
    U.tap(card, function () {
      RA.Audio.unlock();
      sayIt();
      U.flash(card, 'pulse', 400);
      if (taps < 3) { U.addClass(dots.childNodes[taps], 'on'); }
      taps++;
      if (taps >= 1) { U.removeClass(nb, 'hidden'); }
      if (taps === 3) { RA.Sfx.play('sparkle'); UI.burstOn(card); U.addClass(nb, 'pulse-loop'); }
    });
    replayFn = sayIt;
    A.line('new-sound', function () { sayIt(); later(function () { if (ses.current() === s) { A.line('tap-and-say'); } }, 900); });
  };

  R['teach-sight'] = function (s) {
    var id = IDS.word(s.w);
    function sayIt() { A.play(id); }
    stage.appendChild(U.el('div.section-tag', { text: 'Tricky word' }));
    var card = U.el('button.teach-card.sight', { type: 'button' });
    card.appendChild(U.el('span.wordtile.huge', { text: s.w }));
    stage.appendChild(card);
    var hint = missingHint(id, s.w);
    if (hint) { stage.appendChild(hint); }
    U.tap(card, function () { sayIt(); U.flash(card, 'pulse', 400); });
    stage.appendChild(nextButton());
    replayFn = sayIt;
    A.line('new-sight', sayIt);
  };

  R['teach-concept'] = function (s) {
    var c = s.concept;
    function sayIt() { A.line('c-' + c.id); }
    stage.appendChild(U.el('div.section-tag', { text: 'Something new' }));
    stage.appendChild(U.el('p.concept-text', { text: c.say }));
    var grid = U.el('div.pairs');
    (c.pairs || []).forEach(function (pair) {
      var b = U.el('button.pair', { type: 'button' });
      b.appendChild(U.el('span.grapheme', { text: pair[0] }));
      b.appendChild(U.el('span.grapheme.small', { text: pair[1] }));
      U.tap(b, function () { A.phoneme(E.phonemeOf(pair[1])); U.flash(b, 'pulse', 400); });
      grid.appendChild(b);
    });
    stage.appendChild(grid);
    if (c.examples) { stage.appendChild(UI.readLine(c.examples.join('   '), 'examples')); }
    stage.appendChild(nextButton());
    replayFn = sayIt;
    sayIt();
  };

  R.blend = function (s) {
    stage.appendChild(sectionTag(s));
    var row = U.el('div.blend-word');
    var tiles = [], pos = 0;
    s.seg.forEach(function (sg) {
      var t = U.el('button.blend-tile' + (sg.silent ? '.silent' : ''), { type: 'button' });
      // show the letters as written (keeps capitals such as Pip)
      var shown = s.w.substr(pos, sg.show.length) || sg.show;
      pos += sg.show.length;
      t.appendChild(U.el('span.blend-g', { text: shown }));
      if (!sg.silent) { t.appendChild(U.el('span.blend-dot')); }
      U.tap(t, function () {
        if (sg.silent) { RA.Sfx.play('soft'); U.flash(t, 'wiggle', 400); return; }
        A.phoneme(sg.sound); U.flash(t, 'lit', 500);
      });
      row.appendChild(t);
      tiles.push({ node: t, seg: sg });
    });
    stage.appendChild(row);
    var hint = missingHint(IDS.word(s.w), s.w);
    if (hint) { stage.appendChild(hint); }

    var actions = U.el('div.blend-actions');
    var arrow = UI.btn('ui-next', 'Read it', function () { slide(); }, 'blend-arrow');
    actions.appendChild(arrow);
    stage.appendChild(actions);

    var after = U.el('div.after-row');   // Next is always there: she can never get stuck
    if (s.grownup) {
      after.appendChild(U.el('div.grownup-q', { text: 'Grown-up: did she read it?' }));
      after.appendChild(UI.btn('ui-check', 'Yes', function () { ses.answer(true); RA.Sfx.play('chime'); advance(); }, 'good'));
      after.appendChild(UI.btn('ui-next', 'Not yet', function () { ses.answer(false); advance(); }, 'ghost'));
    } else {
      after.appendChild(nextButton());
    }
    stage.appendChild(after);

    function slide() {
      var list = tiles.filter(function (t) { return !t.seg.silent; });
      var i = 0;
      A.stop();
      // the Next row always appears, even if a tap interrupts the sounds
      later(function () { U.removeClass(after, 'hidden'); }, list.length * 900 + 1200);
      function step() {
        tiles.forEach(function (t) { U.removeClass(t.node, 'lit'); });
        if (i >= list.length) {
          tiles.forEach(function (t) { U.addClass(t.node, 'joined'); });
          A.word(s.w, function () { U.removeClass(after, 'hidden'); });
          later(function () { U.removeClass(after, 'hidden'); }, 1200);
          return;
        }
        U.addClass(list[i].node, 'lit');
        RA.Audio.play(IDS.phoneme(list[i].seg.sound), function () { i++; later(step, 120); });
      }
      tiles.forEach(function (t) { U.removeClass(t.node, 'joined'); });
      step();
    }
    replayFn = slide;
    if (s.first) { A.line('blend'); }
  };

  R.sentence = function (s) {
    stage.appendChild(sectionTag(s));
    var line = UI.readLine(s.t, 'sentence');
    if (s.pic && w.ART.has(s.pic)) {
      // read it, then check it against the picture
      var duo = U.el('div.pic-sentence');
      duo.appendChild(picBox(s.pic, 'sentence-pic'));
      duo.appendChild(line);
      stage.appendChild(duo);
    } else {
      stage.appendChild(line);
    }
    var id = IDS.forText(s.t);
    function sayIt() { A.play(id); }
    var hint = missingHint(id, 'sentence');
    if (hint) { stage.appendChild(hint); }
    var row = U.el('div.sentence-actions');
    row.appendChild(UI.btn('ui-speaker', 'Check', sayIt, 'check-btn'));
    stage.appendChild(row);
    replayFn = sayIt;

    if (typeof s.yes === 'boolean') {
      var yn = U.el('div.options.yesno');
      var yes = U.el('button.option.yes', { type: 'button' }, [UI.icon('ui-thumb-up'), U.el('span.yn-label', { text: 'yes' })]);
      var no = U.el('button.option.no', { type: 'button' }, [UI.icon('ui-thumb-down'), U.el('span.yn-label', { text: 'no' })]);
      yn.appendChild(yes); yn.appendChild(no);
      var right = s.yes ? yes : no;
      U.tap(yes, function () { choose(s, yes, s.yes === true, [yes, no], right, sayIt); });
      U.tap(no, function () { choose(s, no, s.yes === false, [yes, no], right, sayIt); });
      stage.appendChild(yn);
      if (s.first || s.question || s.pic) { A.line(s.question ? 'story-question' : (s.pic ? 'pic-check' : (/\?\s*$/.test(s.t) ? 'yes-or-no' : 'make-sense'))); }
    } else if (s.grownup) {
      var after = U.el('div.after-row');
      after.appendChild(U.el('div.grownup-q', { text: 'Grown-up: did she read it?' }));
      after.appendChild(UI.btn('ui-check', 'Yes', function () { ses.answer(true); RA.Sfx.play('chime'); advance(); }, 'good'));
      after.appendChild(UI.btn('ui-next', 'Not yet', function () { ses.answer(false); advance(); }, 'ghost'));
      stage.appendChild(after);
      if (s.first) { A.line('read-it'); }
    } else {
      stage.appendChild(nextButton());
      if (s.first) { A.line('read-it'); }
    }
  };

  R['story-title'] = function (s) {
    var card = U.el('div.title-card.story');
    card.appendChild(U.el('div.lesson-num', { text: 'Story' }));
    card.appendChild(UI.readLine(s.title, 'story-title'));
    stage.appendChild(card);
    stage.appendChild(nextButton());
    replayFn = function () { A.text(s.title); };
    A.line('story-time');
  };

  R['story-page'] = function (s) {
    var page = U.el('div.story-page');
    if (s.pic && w.ART.has(s.pic)) {
      var pic = U.el('div.story-pic');
      pic.innerHTML = w.ART.svg(s.pic);
      page.appendChild(pic);
    }
    page.appendChild(UI.readLine(s.t, 'story-text'));
    stage.appendChild(page);
    stage.appendChild(U.el('div.page-count', { text: s.page + ' / ' + s.pages }));
    var id = IDS.forText(s.t);
    var row = U.el('div.sentence-actions');
    row.appendChild(UI.btn('ui-speaker', 'Check', function () { A.play(id); }, 'check-btn'));
    row.appendChild(nextButton());
    stage.appendChild(row);
    replayFn = function () { A.play(id); };
  };

  /* ---------- the rotating activity ---------- */

  /** Picture options (each { w, pic }) as a grid of picture buttons; no words shown. */
  function picGrid(opts) {
    return optionGrid(opts, function (b, o) { b.appendChild(picBox(o.pic)); b.setAttribute('data-w', o.w); }, 'pics');
  }

  // scored: pick the picture that starts with the sound
  R['pic-start'] = function (s) {
    var id = IDS.phoneme(s.sound);
    function sayIt() { A.play(id); }
    stage.appendChild(sectionTag(s));
    var head = U.el('div.sound-head');
    var g = U.el('button.big-letter', { type: 'button', text: s.g });
    U.tap(g, sayIt);
    head.appendChild(g);
    head.appendChild(UI.btn('ui-speaker', '', sayIt, 'speaker-small'));
    stage.appendChild(head);
    var hint = missingHint(id, s.g);
    if (hint) { stage.appendChild(hint); }
    var og = picGrid(s.options), idx = -1;
    s.options.forEach(function (o, i) { if (o.w === s.w) { idx = i; } });
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () {
        RA.Audio.unlock();
        choose(s, nd, s.options[i].w === s.w, og.nodes, og.nodes[idx], sayIt, function (done) { A.word(s.w, done); });
      });
    });
    stage.appendChild(og.grid);
    replayFn = sayIt;
    if (s.first) { A.line('pick-start', sayIt); } else { sayIt(); }
  };

  // scored: read the word (not spoken), tap its picture
  R['pic-match'] = function (s) {
    stage.appendChild(sectionTag(s));
    stage.appendChild(U.el('div.read-word', { text: s.w }));
    var og = picGrid(s.options), idx = -1;
    s.options.forEach(function (o, i) { if (o.w === s.w) { idx = i; } });
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () {
        RA.Audio.unlock();
        choose(s, nd, s.options[i].w === s.w, og.nodes, og.nodes[idx], null, function (done) { A.word(s.w, done); });
      });
    });
    stage.appendChild(og.grid);
    // the speaker only reminds her what to do: the word itself is hers to read
    replayFn = function () { A.line('match-pic'); };
    if (s.first) { A.line('match-pic'); }
  };

  // scored: finish the sentence by choosing a word
  R.finish = function (s) {
    stage.appendChild(sectionTag(s));
    var duo = U.el('div.pic-sentence');
    if (s.pic && w.ART.has(s.pic)) { duo.appendChild(picBox(s.pic, 'sentence-pic')); }
    var bl = blankLine(s.t, 'sentence');
    duo.appendChild(bl.line);
    stage.appendChild(duo);
    var og = optionGrid(s.options, function (b, wd) { b.appendChild(U.el('span.wordtile', { text: wd })); }, 'words');
    var right = og.nodes[s.options.indexOf(s.answer)];
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () {
        RA.Audio.unlock();
        choose(s, nd, s.options[i] === s.answer, og.nodes, right, null, function (done) {
          if (bl.blank) { bl.blank.textContent = s.answer; U.addClass(bl.blank, 'filled'); }
          A.text(s.full, done);
        });
      });
    });
    stage.appendChild(og.grid);
    replayFn = function () { A.line('finish-it'); };
    if (s.first) { A.line('finish-it'); }
  };

  // scored: "I'm thinking of an animal" — read the clues (one more each time she asks), tap the animal;
  // her first pick counts
  R.clue = function (s) {
    stage.appendChild(sectionTag(s));
    var box = U.el('div.clues'), shown = 0;
    stage.appendChild(box);
    var more = UI.btn('ui-next', 'More', function () { showClue(); }, 'more-clue');
    function showClue() {
      if (shown >= s.clues.length) { return; }
      var ln = UI.readLine(s.clues[shown], 'clue-line');
      box.appendChild(ln);
      U.flash(ln, 'pop-in', 400);
      shown++;
      if (shown >= s.clues.length) { U.addClass(more, 'hidden'); }
    }
    showClue();
    stage.appendChild(more);
    var og = picGrid(s.options), idx = -1;
    s.options.forEach(function (o, i) { if (o.w === s.w) { idx = i; } });
    og.nodes.forEach(function (nd, i) {
      U.tap(nd, function () {
        RA.Audio.unlock();
        choose(s, nd, s.options[i].w === s.w, og.nodes, og.nodes[idx], null, function (done) { U.addClass(more, 'hidden'); A.word(s.w, done); });
      });
    });
    stage.appendChild(og.grid);
    replayFn = function () { A.line('clue-game'); };
    if (s.first) { A.line('clue-game'); }
  };

  /** A wrong answer inside a multi-item screen (direction, sort): soft bump, no buzzer. */
  function softMiss(node) { RA.Sfx.play('soft'); correctStreak = 0; if (node) { U.flash(node, 'wiggle', 500); } }
  function slowDown() { correctStreak = 0; A.line('slow-down'); }
  /** All items of a direction/sort screen are done: the plain Next appears. */
  function screenDone(nb) {
    hideSkip();
    RA.Sfx.play('sparkle');
    U.removeClass(nb, 'hidden');
    U.addClass(nb, 'pulse-loop');
  }

  // scored: follow the directions — each one is an item: the right colour on the right part, first try
  R.direction = function (s) {
    stage.appendChild(sectionTag(s));
    var at = 0, color = null, hex = null, finished = false, subAt = Date.now(), waiting = false;
    var line = U.el('div.direction-line');
    var page = colorPage(s.picture);
    var pal = palette(function (name, h) { color = name; hex = h; });
    stage.appendChild(line);
    stage.appendChild(U.el('div.color-wrap', null, [page.box, pal]));
    var nb = nextButton();
    U.addClass(nb, 'hidden');
    stage.appendChild(nb);
    function hexOf(name) { var i; for (i = 0; i < COLORS.length; i++) { if (COLORS[i][0] === name) { return COLORS[i][1]; } } return '#FFD23F'; }
    function showStep() {
      waiting = false;
      U.clear(line);
      // skip any direction already counted (e.g. after the screen is redrawn)
      while (at < s.subs.length && s.subs[at].resolved) { at++; }
      if (at >= s.subs.length) {
        finished = true;
        UI.burstOn(page.box);
        A.praise();
        screenDone(nb);
        return;
      }
      line.appendChild(UI.readLine(s.subs[at].t, 'direction'));
      subAt = Date.now();
    }
    Object.keys(page.parts).forEach(function (name) {
      U.tap(page.parts[name], function () {
        if (finished || waiting || Date.now() - shownAt < GUARD_MS) { return; }
        RA.Audio.unlock();
        var st = s.subs[at];
        if (!color) { U.flash(pal, 'pulse', 500); A.line('pick-color'); return; }   // not an answer yet
        var right = name === st.part && (!st.color || st.color === color);
        var res = ses.answerSub(at, right, fastCheck() ? { ms: Date.now() - subAt } : {});
        if (res.tooFast) { subAt = Date.now(); slowDown(); return; }   // no hint either way
        if (res.done) {
          fillPart(page.parts[name], hex);
          RA.Sfx.play('chime');
          correctStreak++;
          at++; waiting = true;
          later(showStep, 450);
          return;
        }
        if (res.retry) {
          softMiss(name === st.part ? pal : line);    // right part, wrong colour → the palette wiggles
          A.line('try-again');
          return;
        }
        // 3 misses: show it (it counted as a miss) and go on
        softMiss(null);
        fillPart(page.parts[st.part], st.color ? hexOf(st.color) : (hex || '#FFD23F'));
        U.flash(line, 'pulse', 600);
        A.line('show-answer');
        at++; waiting = true;
        later(showStep, 1400);
      });
    });
    showStep();
    replayFn = function () { if (s.subs[at]) { A.text(s.subs[at].t); } };
    if (s.first) { A.line('follow-it'); }
  };

  // free play: colour the picture any way she likes (no right answer, never scored)
  R.color = function (s) {
    stage.appendChild(sectionTag(s));
    var hex = null;
    var page = colorPage(s.picture);
    var pal = palette(function (name, h) { hex = h; });
    stage.appendChild(U.el('div.color-wrap', null, [page.box, pal]));
    Object.keys(page.parts).forEach(function (name) {
      U.tap(page.parts[name], function () {
        if (!hex) { U.flash(pal, 'pulse', 500); A.line('pick-color'); return; }
        fillPart(page.parts[name], hex);
        RA.Sfx.play('pop');
      });
    });
    stage.appendChild(UI.btn('ui-check', 'Done', advance, 'next-btn done-color'));
    replayFn = function () { A.line('color-free'); };
    A.line('color-free');
  };

  // scored: sort the word cards into the boxes (drag, or tap a card then a box); each card's first
  // placement counts
  R.sort = function (s) {
    stage.appendChild(sectionTag(s));
    var bins = U.el('div.sort-bins'), deck = U.el('div.sort-deck'), picked = null, lastAt = Date.now(), finished = false;
    var binNodes = s.bins.map(function (b, bi) {
      var bin = U.el('div.sort-bin', { 'data-bin': String(bi) });
      var lab = U.el('button.bin-label', { type: 'button', text: b });
      U.tap(lab, function () { if (E.isGrapheme(b)) { A.phoneme(E.phonemeOf(b)); } else { A.word(b); } });
      bin.appendChild(lab);
      bin.appendChild(U.el('div.bin-cards'));
      U.tap(bin, function (e) { if (picked && e.target !== lab) { drop(picked, bi); } });
      bins.appendChild(bin);
      return bin;
    });
    var nb = nextButton();
    U.addClass(nb, 'hidden');
    function place(card, bi, cls) {
      card.done = true;
      binNodes[bi].lastChild.appendChild(card.node);
      U.addClass(card.node, cls);
    }
    function checkDone() {
      if (finished) { return; }
      if (s.subs.every(function (it) { return it.resolved; })) { finished = true; A.praise(); screenDone(nb); }
    }
    function drop(card, bi) {
      if (Date.now() - shownAt < GUARD_MS) { return false; }
      var right = E.sortBin(s, card.w) === bi;
      U.removeClass(card.node, 'picked');
      picked = null;
      var res = ses.answerSub(card.i, right, fastCheck() ? { ms: Date.now() - lastAt } : {});
      if (res.tooFast) { slowDown(); return false; }          // back to the deck, no hint
      if (res.done) {
        RA.Sfx.play('pop');
        correctStreak++;
        place(card, bi, 'sorted');
        lastAt = Date.now();
        checkDone();
        return true;
      }
      if (res.retry) { softMiss(card.node); return false; }
      // 3 misses: show where it goes (it counted as a miss)
      softMiss(null);
      place(card, E.sortBin(s, card.w), 'revealed');
      A.line('show-answer');
      lastAt = Date.now();
      checkDone();
      return true;
    }
    s.cards.forEach(function (wd, ci) {
      var card = { w: wd, i: ci, node: U.el('button.sort-card', { type: 'button', text: wd }), done: !!s.subs[ci].resolved };
      draggable(card.node, function () {
        if (card.done) { return; }
        if (picked) { U.removeClass(picked.node, 'picked'); }
        picked = card;
        U.addClass(card.node, 'picked');
        RA.Sfx.play('tap');
      }, function (x, y) {
        if (card.done) { return true; }
        for (var i = 0; i < binNodes.length; i++) { if (hit(binNodes[i], x, y)) { return drop(card, i); } }
        return false;
      });
      deck.appendChild(card.node);
      if (card.done) { place(card, E.sortBin(s, wd), 'sorted'); }
    });
    stage.appendChild(bins);
    stage.appendChild(deck);
    stage.appendChild(nb);
    replayFn = function () { A.line('sort-it'); };
    A.line('sort-it');
  };

  /* ---------- build the word (drag the sound tiles into order) ---------- */

  /** opts: { answer: [tile...], pool: [tile...], ghost: bool (faint letters to copy), letters: bool (tiles
   *  are letters of a tricky word, so they make no sound), word: string, onFull: fn(right) → 'done' |
   *  'retry' | 'reveal' | 'reset', onDone: fn } */
  function buildBox(opts) {
    var box = U.el('div.build'), slots = U.el('div.build-slots'), bank = U.el('div.build-bank');
    var tiles = [], slotNodes = [], filled = [], done = false;
    opts.answer.forEach(function (g, i) {
      var sl = U.el('div.build-slot', { 'data-slot': String(i) });
      if (opts.ghost) { sl.appendChild(U.el('span.ghost', { text: g })); }
      slots.appendChild(sl);
      slotNodes.push(sl);
      filled.push(null);
    });
    function sound(t) {
      if (!opts.letters && E.isGrapheme(t.g)) { A.phoneme(E.phonemeOf(t.g)); } else { RA.Sfx.play('pop'); }
    }
    function toBank(t) {
      if (t.slot >= 0) { filled[t.slot] = null; }
      t.slot = -1;
      bank.appendChild(t.node);
      U.removeClass(t.node, 'placed');
    }
    function toSlot(t, i, quiet) {
      if (filled[i] && filled[i] !== t) { toBank(filled[i]); }
      if (t.slot >= 0) { filled[t.slot] = null; }
      t.slot = i;
      filled[i] = t;
      slotNodes[i].appendChild(t.node);
      U.addClass(t.node, 'placed');
      if (!quiet) { sound(t); check(); }
    }
    function finish(cls) {
      done = true;
      U.addClass(box, cls);
      later(function () { A.word(opts.word); if (opts.onDone) { opts.onDone(cls); } }, 500);
    }
    function check() {
      var i;
      for (i = 0; i < filled.length; i++) { if (!filled[i]) { return; } }
      var right = true;
      for (i = 0; i < filled.length; i++) { if (filled[i].g !== opts.answer[i]) { right = false; } }
      var act = opts.onFull ? opts.onFull(right) : (right ? 'done' : 'retry');
      if (act === 'done') { RA.Sfx.play('chime'); UI.burstOn(slots); finish('built'); return; }
      if (act === 'reset') { tiles.forEach(toBank); return; }       // too fast: all back, no hint
      if (act === 'reveal') {
        // 3 misses: show the word built the right way (it counted as a miss)
        tiles.forEach(toBank);
        var used = [];
        opts.answer.forEach(function (g, si) {
          for (var k = 0; k < tiles.length; k++) { if (tiles[k].g === g && used.indexOf(k) < 0) { used.push(k); toSlot(tiles[k], si, true); break; } }
        });
        finish('revealed');
        return;
      }
      // the tiles in the wrong place hop back so she can try again
      RA.Sfx.play('soft');
      later(function () {
        for (i = 0; i < filled.length; i++) {
          if (filled[i] && filled[i].g !== opts.answer[i]) { U.flash(filled[i].node, 'wiggle', 400); toBank(filled[i]); }
        }
      }, 450);
    }
    opts.pool.forEach(function (g) {
      var t = { g: g, slot: -1, node: U.el('button.build-tile', { type: 'button' }, [U.el('span', { text: g })]) };
      draggable(t.node, function () {
        if (done || busy || Date.now() - shownAt < GUARD_MS) { return; }
        RA.Audio.unlock();
        if (t.slot >= 0) { toBank(t); return; }
        var i = filled.indexOf(null);
        if (i >= 0) { toSlot(t, i); }
      }, function (x, y) {
        if (done || busy) { return true; }
        for (var i = 0; i < slotNodes.length; i++) { if (hit(slotNodes[i], x, y)) { toSlot(t, i); return true; } }
        if (t.slot >= 0 && hit(bank, x, y)) { toBank(t); return true; }
        return false;
      });
      tiles.push(t);
      bank.appendChild(t.node);
    });
    box.appendChild(slots);
    box.appendChild(bank);
    // size the slots and tiles to the screen (full size on a tablet held sideways; smaller when it's upright or
    // on a phone), and again if the screen turns
    function fit() {
      var W = window.innerWidth || 1024, H = window.innerHeight || 600, availW = W - 48;
      var nS = opts.answer.length, nB = opts.pool.length, perRow = nB, rows = 1;
      var slot = Math.min(120, Math.floor(availW / nS) - 16);
      var tile = Math.min(104, Math.floor(availW / perRow) - 16);
      if (tile < slot - 16 && nB > 3) { rows = 2; perRow = Math.ceil(nB / 2); tile = Math.min(104, Math.floor(availW / perRow) - 16); }
      tile = Math.min(tile, slot - 16);
      var need = slot + 18 + rows * (tile + 12) + (H <= 450 ? 84 : 138), availH = H - 170;
      if (need > availH) {
        var k = Math.max(0.5, availH / need);
        slot = Math.floor(slot * k); tile = Math.min(Math.floor(tile * k), slot - 16);
      }
      slotNodes.forEach(function (sl) {
        sl.style.width = sl.style.height = slot + 'px';
        sl.style.borderRadius = Math.round(slot * 0.18) + 'px';
        var gh = sl.querySelector('.ghost');
        if (gh) { gh.style.fontSize = Math.round(slot * 0.58) + 'px'; gh.style.top = Math.round(slot * 0.08) + 'px'; }
      });
      tiles.forEach(function (t) {
        t.node.style.width = t.node.style.height = tile + 'px';
        t.node.style.fontSize = Math.round(tile * 0.615) + 'px';
        t.node.style.borderRadius = Math.round(tile * 0.19) + 'px';
      });
      bank.style.maxWidth = (perRow * (tile + 16)) + 'px';
      bank.style.minHeight = (rows * (tile + 6)) + 'px';
    }
    fit();
    var onResize = function () { if (!box.parentNode) { window.removeEventListener('resize', onResize); return; } fit(); };
    window.addEventListener('resize', onResize);
    return box;
  }

  // scored: build the word she hears — the tiles in the right order on the first try counts
  R.build = function (s) {
    stage.appendChild(sectionTag(s));
    var id = IDS.word(s.w);
    function sayIt() { A.play(id); }
    stage.appendChild(UI.btn('ui-speaker', '', sayIt, 'speaker-big'));
    var hint = missingHint(id, s.w);
    if (hint) { stage.appendChild(hint); }
    stage.appendChild(buildBox({
      answer: s.answer, pool: s.tiles, word: s.w,
      onFull: function (right) {
        if (busy) { return 'reset'; }
        var res = ses.answer(right, fastCheck() ? { ms: Date.now() - shownAt } : {});
        if (res.tooFast) { busy = true; slowDown(); later(advance, 1500); return 'reset'; }
        if (res.done) { busy = true; hideSkip(); correctStreak++; return 'done'; }
        if (res.retry) { correctStreak = 0; return 'retry'; }
        busy = true; hideSkip(); correctStreak = 0; A.line('show-answer');
        return 'reveal';
      },
      onDone: function (how) {
        if (how === 'built') { later(advance, 900); return; }
        stage.appendChild(nextButton());     // shown: she moves on when ready
      }
    }));
    replayFn = sayIt;
    if (s.first) { A.line('build-it', sayIt); } else { sayIt(); }
  };

  // stuck: stop testing, teach it — hear it, see it, build it (never scored; Next is always there)
  R['stuck-teach'] = function (s) {
    stage.appendChild(U.el('div.section-tag', { text: 'Let’s look together' }));
    var kind = s.key.slice(0, s.key.indexOf(':'));
    var nb = nextButton();
    var sayIt;
    if (kind === 'g') {
      var g = s.g || s.key.slice(2);
      sayIt = function () { A.phoneme(E.phonemeOf(g)); };
      var card = U.el('button.teach-card', { type: 'button' }, [U.el('span.grapheme.huge', { text: g })]);
      U.tap(card, function () { sayIt(); U.flash(card, 'pulse', 400); });
      stage.appendChild(card);
      if (s.w && E.picture(s.w) && w.ART.has(E.picture(s.w))) {
        var ex = U.el('button.stuck-example', { type: 'button' }, [picBox(E.picture(s.w)), U.el('span.wordtile', { text: s.w })]);
        U.tap(ex, function () { A.word(s.w); });
        stage.appendChild(ex);
      }
    } else {
      var word = s.w;
      if (kind === 's' && s.t) {
        // a sentence: hear it and see it, then build the word she missed
        sayIt = function () { A.text(s.t); };
        stage.appendChild(UI.readLine(s.t, 'sentence'));
      } else {
        sayIt = function () { A.word(word); };
        var big = U.el('button.teach-card.sight', { type: 'button' }, [U.el('span.wordtile.huge', { text: word })]);
        U.tap(big, function () { sayIt(); U.flash(big, 'pulse', 400); });
        stage.appendChild(big);
      }
      if (word) {
        var seg = s.seg || E.P.segment(word, ses.n);
        var parts = seg ? seg.filter(function (x) { return !x.silent; }).map(function (x) { return x.g; }) : word.split('');
        if (parts.length > 1 && parts.join('') === word.toLowerCase()) {
          stage.appendChild(buildBox({ answer: parts, pool: U.shuffle(parts.slice()), ghost: true, letters: !seg || kind === 'sw', word: word,
            onDone: function () { U.addClass(nb, 'pulse-loop'); } }));
        }
      }
    }
    stage.appendChild(nb);
    replayFn = sayIt;
    A.line('stuck-teach', sayIt);
  };

  /* ---------- writing: trace a letter or write a word (never scored, no skip) ---------- */

  /** What the tracing ladder needs from the lesson screen. */
  function traceUI(sayIt, doneBtn) {
    var submit = null;
    U.tap(doneBtn, function () { if (submit) { var f = submit; submit = null; f(); } });
    return {
      later: later,
      line: function (id, cb) { A.line(id, cb); },
      sound: function (n) { RA.Sfx.play(n); },
      say: sayIt,
      praise: function () { A.praise(); },
      doneBtn: function (show, fn) { submit = show ? fn : null; U[show ? 'removeClass' : 'addClass'](doneBtn, 'hidden'); }
    };
  }

  R.trace = function (s) {
    stage.appendChild(U.el('div.section-tag', { text: 'Writing' }));
    var isWord = s.kind === 'word';
    var letters = isWord ? RA.Trace.letterList(s.word) : [s.letter];
    function sayIt() { if (isWord) { A.word(s.word); } else { A.phoneme(E.phonemeOf(s.letter)); } }
    var pad = tracePad = RA.Trace.pad({ letters: letters, look: 'paper' });
    var doneBtn = UI.btn('ui-check', '', function () {}, 'trace-done hidden');
    var side = U.el('div.trace-side', null, [UI.btn('ui-speaker', '', sayIt, 'speaker-small'), doneBtn]);
    var area = U.el('div.trace-area' + (isWord ? '.word' : ''), null, [pad.el, side]);
    stage.appendChild(area);
    var ui = traceUI(sayIt, doneBtn);
    replayFn = sayIt;
    function finished(result) {
      ses.traceDone(s, result);
      U.addClass(doneBtn, 'hidden');
      RA.Sfx.play('sparkle');
      if (!isWord) {
        // her letter beside the right one
        U.addClass(area, 'hidden');
        var beside = U.el('div.trace-beside', null, [
          U.el('div.tr-mine', null, [pad.inkPicture(0, false)]),
          U.el('div.tr-right', null, [pad.inkPicture(0, true)])
        ]);
        stage.appendChild(beside);
        A.line('trace-beside');
      } else {
        pad.cells.forEach(function (c, k) { pad.showModel(k, 'faint'); });
        UI.burstOn(pad.el);
        A.word(s.word);
      }
      stage.appendChild(nextButton());
    }
    var mine = ses;
    A.line(s.first ? 'write-time' : (isWord ? 'trace-word' : 'trace-watch'), null);
    later(function () {
      if (ses !== mine || ses.current() !== s) { return; }
      if (isWord) { RA.Trace.runWord(pad, 'word', ui, finished); }
      else { RA.Trace.runLadder(pad, 0, s.mode, ui, finished); }
    }, s.first ? 1400 : 300);
  };

  R.end = function () {
    var res = ses.finish();
    if (res.needsTracing) {
      // writing is required before the flames: back to the first trace she hasn't done
      for (var ti = 0; ti < ses.steps.length; ti++) { if (ses.steps[ti].type === 'trace' && !ses.steps[ti].done) { ses.index = ti; break; } }
      render();
      return;
    }
    var p = RA.state.profile;
    UI.saveProfile();
    var box = U.el('div.end-card');
    box.appendChild(UI.stars(res.stars));
    if (res.pass) {
      box.appendChild(U.el('h2', { text: 'You did it!' }));
      RA.Sfx.play('fanfare');
      later(function () { A.line(res.flames.bonus ? 'perfect' : 'lesson-pass'); }, 900);
    } else {
      box.appendChild(U.el('h2', { text: 'Great practice!' }));
      box.appendChild(U.el('p', { text: 'Read this lesson one more time to open the next one.' }));
      RA.Sfx.play('chime');
      later(function () { A.line('lesson-practice'); }, 600);
    }
    stage.appendChild(box);

    // the flames she earned pop in one by one; bonus flames get a sparkle ring
    var row = U.el('div.earned');
    var i, n = 0;
    for (i = 0; i < res.flames.base; i++) { row.appendChild(UI.flame(n < 3, 'earn d' + Math.min(n++, 7))); }
    for (i = 0; i < res.flames.bonus; i++) { row.appendChild(UI.flame(false, 'earn bonus d' + Math.min(n++, 7))); }
    var total = U.el('div.earned-total');
    total.appendChild(UI.flameCount(p));
    row.appendChild(total);
    stage.appendChild(row);
    later(function () { RA.Sfx.play('sparkle'); U.flash(total, 'pulse', 500); }, 300 + n * 180);

    // a gentle step back: her working lesson moves down one (flames and unlocks stay)
    if (res.stepBack) {
      stage.appendChild(U.el('div.step-back-note', { text: 'Let\u2019s warm up with some easier ones!' }));
      later(function () { A.line('step-back'); }, 2400);
    }

    // a word she wrote unlocked its shop item
    if (res.newShop && res.newShop.length) {
      var shopRow = U.el('div.new-shop');
      shopRow.appendChild(UI.icon('ui-shop'));
      res.newShop.forEach(function (id) {
        var it = RA.World.item(id);
        var card = U.el('div.new-shop-item', { 'data-id': id });
        if (it && w.ART.has(it.sprite)) { card.innerHTML = w.ART.svg(it.sprite); }
        shopRow.appendChild(card);
      });
      stage.appendChild(shopRow);
      later(function () { A.line('new-in-shop'); }, 1800);
    }

    // tricky words she has now mastered go up on the shelf in her room
    if (res.newShelf && res.newShelf.length) {
      var shelf = U.el('div.new-shelf');
      shelf.appendChild(UI.icon('ui-room-bedroom'));
      res.newShelf.forEach(function (wd) {
        var c = U.el('button.shelf-card', { type: 'button', text: wd });
        U.tap(c, function () { A.word(wd); U.flash(c, 'pulse', 400); });
        shelf.appendChild(c);
      });
      stage.appendChild(shelf);
      later(function () { A.line('new-tricky'); }, 2600);
    }

    var btns = U.el('div.end-btns');
    if (res.stepBack) { btns.appendChild(UI.btn('ui-book', 'Lesson ' + res.working, function () { UI.go('lesson', res.working, true); }, 'big read')); }
    else if (!res.pass) { btns.appendChild(UI.btn('ui-book', 'Read again', function () { S.lesson.show(clearRoot(), String(ses.n)); }, 'big read')); }
    btns.appendChild(UI.btn('ui-shop', 'Shop', function () { UI.go('shop', null, true); }, 'big shop'));
    btns.appendChild(UI.btn('ui-town', 'Play', function () { UI.go('map', null, true); }, 'big play'));
    btns.appendChild(UI.btn('ui-back', 'Home', function () { UI.go('kid', null, true); }, 'big ghost'));
    stage.appendChild(btns);
    replayFn = function () { A.line(res.pass ? 'lesson-pass' : 'lesson-practice'); };
  };

  function clearRoot() { U.clear(root); return root; }

  function sectionTag(s) {
    var names = { warmup: 'Warm-up', 'new': 'New', words: 'Words', read: 'Read', story: 'Story', activity: 'Game time' };
    return U.el('div.section-tag', { text: names[s.section] || '' });
  }
})(window);
