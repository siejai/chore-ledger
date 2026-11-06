/* Lit Town — placement test (ES5): "show me what you know".
 * A short tap game (about 10 minutes at most): hear a sound or a word, tap it. It starts easy (letter
 * sounds, then short words, blends, digraphs, silent e) and stops when she is missing most items.
 * No right/wrong feedback and no failure sounds: every tap gets the same soft pop. Same defences as
 * lessons: near-miss answers, varied answer position, and a tap faster than a real read doesn't count
 * (the item comes back). The rules are RA.Engine.PlacementTest; every threshold is in
 * www/content/placement.json. Quitting part-way changes nothing.
 */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, A = RA.Audio, E = RA.Engine, IDS = RA.AudioIds;
  var GUARD_MS = w.WT_TAP_GUARD_MS != null ? w.WT_TAP_GUARD_MS : 300;
  var root = null, stage = null, bar = null, test = null, shownAt = 0, busy = false, alive = 0, last = null;

  function later(fn, ms) { var mine = alive; setTimeout(function () { if (mine === alive) { fn(); } }, ms); }

  S.placement = {
    show: function (r) {
      root = r; alive++; test = null; last = null;
      var p = RA.state.profile;
      var top = U.el('div.lesson-top');
      top.appendChild(UI.btn('ui-back', '', function () { UI.go('kid', null, true); }, 'small'));
      bar = U.el('div.lesson-bar', null, [U.el('div.lesson-bar-fill')]);
      top.appendChild(bar);
      top.appendChild(UI.btn('ui-speaker', '', function () { if (test && test.current()) { say(test.current()); } }, 'small replay'));
      root.appendChild(top);
      stage = U.el('div.stage.placement');
      root.appendChild(stage);
      // intro: framed as a game, not a test
      var card = U.el('div.title-card.placement-intro');
      card.appendChild(UI.avatar(p.look, 'mini'));
      card.appendChild(U.el('div.lesson-title', { text: 'Show me what you know!' }));
      stage.appendChild(card);
      stage.appendChild(UI.btn('ui-play', 'Start', function () { RA.Audio.unlock(); begin(); }, 'huge start'));
      A.line('placement-hello');
    },
    hide: function () { alive++; test = null; },
    /* for automated tests */
    test: function () { return test; },
    __rerender: function () { if (test) { render(); } },
    result: function () { return last; }
  };

  function say(item) { if (item.type === 'sound') { A.phoneme(item.sound); } else { A.play(IDS.word(item.w)); } }

  function begin() {
    test = new E.PlacementTest(RA.state.profile);
    render();
  }

  function render() {
    var item = test.current();
    if (!item) { return finish(); }
    U.clear(stage);
    bar.firstChild.style.width = Math.round(test.progress() * 100) + '%';
    busy = false;
    shownAt = Date.now();
    stage.appendChild(UI.btn('ui-speaker', '', function () { say(item); }, 'speaker-big'));
    var grid = U.el('div.options' + (item.type === 'word' ? '.words' : '.letters'));
    var nodes = item.options.map(function (o) {
      var b = U.el('button.option', { type: 'button' }, [U.el(item.type === 'word' ? 'span.wordtile' : 'span.grapheme', { text: o })]);
      U.tap(b, function () { pick(b, o, nodes); });
      grid.appendChild(b);
      return b;
    });
    stage.appendChild(grid);
    say(item);
  }

  function pick(node, o, nodes) {
    if (busy || Date.now() - shownAt < GUARD_MS) { return; }
    var item = test.current(), right = item.type === 'sound' ? o === item.g : o === item.w;
    var res = test.answer(right, w.WT_NO_MIN_READ ? {} : { ms: Date.now() - shownAt });
    busy = true;
    if (res.tooFast) {
      // too fast to have read it: no score, the item comes back later
      nodes.forEach(function (nd) { U.flash(nd, 'wiggle', 500); });
      A.line('slow-down');
      later(render, 1600);
      return;
    }
    // the same soft pop for every answer: she never hears a right or a wrong
    RA.Sfx.play('pop');
    U.flash(node, 'pulse', 300);
    later(render, 450);
  }

  function finish() {
    var p = RA.state.profile;
    var res = test.result();
    var applied = E.applyPlacement(p, res);
    last = { result: res, applied: applied };
    UI.saveProfile();
    U.clear(stage);
    bar.firstChild.style.width = '100%';
    var box = U.el('div.end-card.placement-done');
    box.appendChild(UI.stars(3));
    box.appendChild(U.el('h2', { text: 'You know so much!' }));
    box.appendChild(U.el('p', { text: 'Lesson ' + applied.working + ' is next.' }));
    stage.appendChild(box);
    RA.Sfx.play('fanfare');
    later(function () { A.line('placement-done'); }, 700);
    var btns = U.el('div.end-btns');
    btns.appendChild(UI.btn('ui-book', 'Read', function () { UI.go('lesson', applied.working, true); }, 'big read'));
    btns.appendChild(UI.btn('ui-town', 'Play', function () { UI.go('map', null, true); }, 'big play'));
    stage.appendChild(btns);
  }
})(window);
