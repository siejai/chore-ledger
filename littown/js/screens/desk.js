/* Lit Town — her desk (ES5): the marker board, the chalkboard and the paper stack in her bedroom all
 * open this writing screen, each with its own look. Three things to do:
 *   free draw  — draw anything; a clear button
 *   my name    — trace her name over dotted letters (a grown-up types the name once)
 *   the pile   — letters she hasn't traced in a lesson yet (letters only, never words)
 * Desk work is never scored and unlocks nothing. A letter traced successfully clearAfter times here
 * (tracing.json settings.desk) leaves her lesson queue; a practised letter starts at the
 * freehand rung in lessons.
 */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, A = RA.Audio, E = RA.Engine;
  var LOOKS = { marker: 'marker', chalk: 'chalk', paper: 'paper' };
  var root = null, body = null, look = 'paper', mode = '', alive = 0;

  function later(fn, ms) { var mine = alive; setTimeout(function () { if (mine === alive) { fn(); } }, ms); }

  S.desk = {
    show: function (r, param) {
      root = r;
      alive++;
      look = LOOKS[param] || 'paper';
      U.addClass(root, 'desk-' + look);
      var p = RA.state.profile;
      var top = U.el('div.topbar.desk-top');
      top.appendChild(UI.btn('ui-back', '', function () { UI.go('place', 'home', true); }, 'small'));
      var modes = U.el('div.desk-modes');
      [['free', 'ui-free-draw'], ['name', 'ui-my-name'], ['pile', 'ui-letter-pile']].forEach(function (m) {
        var b = UI.btn(m[1], '', function () { open(m[0]); }, 'desk-mode');
        b.setAttribute('data-mode', m[0]);
        if (m[0] === 'pile') {
          var n = E.backlog(p).length;
          if (n) { b.appendChild(U.el('span.desk-count', { text: String(n) })); }
        }
        modes.appendChild(b);
      });
      top.appendChild(modes);
      root.appendChild(top);
      body = U.el('div.desk-body');
      root.appendChild(body);
      open(E.backlog(p).length ? 'pile' : 'free');
      A.line('desk-hello');
    },
    hide: function () { alive++; },
    current: function () { return { mode: mode, look: look, pad: S.desk.pad }; }
  };

  function ui(sayIt, doneBtn) {
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

  function open(m) {
    alive++;
    mode = m;
    U.clear(body);
    S.desk.pad = null;
    var btns = root.querySelectorAll('.desk-mode'), i;
    for (i = 0; i < btns.length; i++) { U[btns[i].getAttribute('data-mode') === m ? 'addClass' : 'removeClass'](btns[i], 'on'); }
    if (m === 'free') { free(); } else if (m === 'name') { name(); } else { pile(); }
  }

  /* free drawing: no letters, no checks */
  function free() {
    var S0 = RA.Trace.settings();
    var pad = S.desk.pad = RA.Trace.pad({ free: true, look: look, maxPoints: (S0.maxPoints || 600) * 3 });
    var side = U.el('div.trace-side', null, [UI.btn('ui-trash', '', function () { pad.clearAll(); RA.Sfx.play('whoosh'); }, 'desk-clear')]);
    body.appendChild(U.el('div.trace-area', null, [pad.el, side]));
    A.line('desk-free');
  }

  /* her name, traced over dotted letters, one box at a time (dotted rung only, never scored) */
  function name() {
    var p = RA.state.profile, letters = RA.Trace.letterList(E.trace(p).name);
    if (!letters.length) {
      body.appendChild(U.el('div.desk-note', null, [UI.icon('ui-my-name'), U.el('p', { text: 'A grown-up can type her name in the grown-up screen (Writing name).' })]));
      A.line('desk-no-name');
      return;
    }
    var word = letters.join('');
    var pad = S.desk.pad = RA.Trace.pad({ letters: letters, look: look });
    var doneBtn = UI.btn('ui-check', '', function () {}, 'trace-done hidden');
    var again = UI.btn('ui-play', '', function () { open('name'); }, 'desk-again hidden');
    body.appendChild(U.el('div.trace-area.word', null, [pad.el, U.el('div.trace-side', null, [doneBtn, again])]));
    pad.cells.forEach(function (c, k) { pad.showModel(k, 'dotted'); });
    var u = ui(function () { A.word(word); }, doneBtn), k = 0;
    A.line('desk-name');
    (function box() {
      if (k >= pad.cells.length) { RA.Sfx.play('sparkle'); UI.burstOn(pad.el); U.removeClass(again, 'hidden'); return; }
      RA.Trace.runLadder(pad, k, 'word-dotted', u, function (r) {
        E.deskTrace(p, pad.cells[k].letter, r.tries.some(function (t) { return t.pass; }));
        UI.saveProfile();
        k++;
        later(box, 400);
      });
    })();
  }

  /* the pile: letters waiting for a lesson slot */
  function pile() {
    var p = RA.state.profile, list = E.backlog(p);
    if (!list.length) {
      body.appendChild(U.el('div.desk-note', null, [UI.icon('ui-letter-pile'), U.el('p', { text: 'No letters waiting. Free draw, or trace your name!' })]));
      return;
    }
    var row = U.el('div.desk-pile');
    list.forEach(function (ch) {
      var c = U.el('button.pile-card', { type: 'button', text: ch, 'data-letter': ch });
      U.tap(c, function () { letter(ch); });
      row.appendChild(c);
    });
    body.appendChild(row);
    A.line('desk-pile');
  }

  /** One letter from the pile: up the ladder if she has never traced it, down it if she has. */
  function letter(ch) {
    alive++;
    U.clear(body);
    var p = RA.state.profile, rec = E.trace(p).letters[ch];
    var kind = rec && ((rec.desk || 0) > 0 || (rec.lessons || 0) > 0) ? 'review' : 'learn';
    var pad = S.desk.pad = RA.Trace.pad({ letters: [ch], look: look });
    var doneBtn = UI.btn('ui-check', '', function () {}, 'trace-done hidden');
    function sayIt() { A.phoneme(E.phonemeOf(ch)); }
    body.appendChild(U.el('div.trace-area', null, [pad.el, U.el('div.trace-side', null, [UI.btn('ui-speaker', '', sayIt, 'speaker-small'), doneBtn])]));
    RA.Trace.runLadder(pad, 0, kind, ui(sayIt, doneBtn), function (r) {
      var cleared = false;
      // each dotted or freehand pass is one successful desk trace (the forced trace can't fail, so it doesn't count)
      r.tries.forEach(function (t) { if (t.pass && t.rung !== 'forced') { cleared = E.deskTrace(p, ch, true) || cleared; } });
      UI.saveProfile();
      RA.Sfx.play('sparkle');
      if (cleared) { A.line('desk-cleared'); }
      body.appendChild(UI.btn('ui-letter-pile', '', function () { open('pile'); }, 'next-btn desk-back-pile'));
    });
  }
})(window);
