/* Lit Town — screen router and shared UI pieces (ES5). */
(function (w) {
  var RA = w.RA = w.RA || {};
  var U = RA.U;
  var UI = RA.UI = {};
  RA.Screens = RA.Screens || {};
  RA.state = RA.state || { profile: null };

  var root = null;
  var current = null;

  UI.init = function (rootEl) {
    root = rootEl;
    w.addEventListener('hashchange', route, false);
    // the app never opens links or other windows
    w.open = function () { return null; };
    w.document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== w.document) {
        if (t.tagName === 'A' && t.getAttribute('href') && t.getAttribute('href').charAt(0) !== '#' && !t.hasAttribute('download')) { e.preventDefault(); return; }
        t = t.parentNode;
      }
    }, true);
  };

  /** Navigate: UI.go('lesson', 5). replace=true avoids a history entry (Android back button). */
  UI.go = function (name, param, replace) {
    var h = '#/' + name + (param != null ? '/' + encodeURIComponent(param) : '');
    if (w.location.hash === h) { route(); return; }
    if (replace && w.history && w.history.replaceState) {
      w.history.replaceState(null, '', h);
      route();
    } else {
      w.location.hash = h;
    }
  };

  function route() {
    var h = (w.location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    var name = parts[0] || 'profiles';
    var param = parts[1] != null ? decodeURIComponent(parts[1]) : null;
    if (!RA.Screens[name]) { name = 'profiles'; param = null; }
    // screens that need a child selected
    if (name !== 'profiles' && name !== 'parent' && name !== 'create' && !RA.state.profile) { name = 'profiles'; }
    show(name, param);
  }
  UI.route = route;

  function show(name, param) {
    if (current && current.screen.hide) { try { current.screen.hide(); } catch (e) { /* ignore */ } }
    RA.Audio.stop();
    U.clear(root);
    root.className = 'screen screen-' + name;
    var scr = RA.Screens[name];
    current = { name: name, screen: scr };
    scr.show(root, param);
    if (RA.Updates) { RA.Updates.onScreen(name); }
  }

  UI.currentName = function () { return current ? current.name : ''; };

  /* ---------- building blocks ---------- */

  /** Inline SVG icon from the art registry. */
  UI.icon = function (id, cls) {
    var span = U.el('span.icon' + (cls ? '.' + cls : ''));
    span.innerHTML = w.ART && w.ART.svg(id) ? w.ART.svg(id) : '';
    return span;
  };

  /** Big round icon button. */
  UI.btn = function (iconId, label, onTap, cls) {
    var b = U.el('button.btn' + (cls ? '.' + cls : ''), { type: 'button', 'aria-label': label || iconId });
    b.appendChild(UI.icon(iconId));
    if (label) { b.appendChild(U.el('span.btn-label', { text: label })); }
    U.tap(b, function (e) { RA.Audio.unlock(); RA.Sfx.play('tap'); onTap(e); });
    return b;
  };

  /** Text button for grown-up screens. */
  UI.textBtn = function (label, onTap, cls) {
    var b = U.el('button.tbtn' + (cls ? '.' + cls : ''), { type: 'button', text: label });
    U.tap(b, function (e) { RA.Audio.unlock(); onTap(e); });
    return b;
  };

  /** A line of text where each word can be tapped to hear it. */
  UI.readLine = function (text, cls, onWord) {
    var box = U.el('div.readline' + (cls ? '.' + cls : ''));
    var count = 0;   // onWord(span, word, index): a tap on a word calls it instead of reading the word aloud
    // a word and the punctuation stuck to it stay together, so "mat." never wraps as "mat" / "."
    var re = /(["“]?)([A-Za-z0-9]+(?:['’][A-Za-z]+)*)([^A-Za-z0-9\s]*)(\s*)/g, m;
    while ((m = re.exec(text)) !== null) {
      if (!m[0]) { re.lastIndex++; continue; }
      var group = U.el('span.wgroup');
      if (m[1]) { group.appendChild(U.el('span.punct', { text: m[1] })); }
      (function (word) {
        var s = U.el('span.word', { text: word }), idx = count++;
        if (onWord) { s.setAttribute('data-i', String(idx)); U.tap(s, function () { RA.Audio.unlock(); onWord(s, word, idx); }); }
        else { U.tap(s, function () { RA.Audio.unlock(); U.flash(s, 'lit', 600); RA.Audio.word(word); }); }
        group.appendChild(s);
      })(m[2]);
      if (m[3]) { group.appendChild(U.el('span.punct', { text: m[3] })); }
      box.appendChild(group);
      if (m[4]) { box.appendChild(w.document.createTextNode(' ')); }
    }
    return box;
  };

  /** A character. opts.crop: 'head' (face and hair), 'body' or 'feet', for thumbnails. */
  UI.avatar = function (look, cls, opts) {
    var d = U.el('div.avatar' + (cls ? '.' + cls : ''));
    d.innerHTML = RA.Avatar.svg(look || {}, opts);
    return d;
  };

  /** Little sparkle burst at a screen point (or centered on a node). */
  UI.burst = function (x, y, parent) {
    var host = parent || w.document.body;
    var b = U.el('div.burst', { style: 'left:' + x + 'px;top:' + y + 'px' });
    for (var i = 0; i < 6; i++) {
      var s = U.el('span.burst-dot.d' + i);
      s.appendChild(UI.icon('ui-sparkle'));
      b.appendChild(s);
    }
    host.appendChild(b);
    setTimeout(function () { if (b.parentNode) { b.parentNode.removeChild(b); } }, 900);
  };

  UI.burstOn = function (node) {
    if (!node || !node.getBoundingClientRect) { return; }
    var r = node.getBoundingClientRect();
    UI.burst(r.left + r.width / 2, r.top + r.height / 2);
  };

  UI.toast = function (text, ms) {
    var t = U.el('div.toast', { text: text });
    w.document.body.appendChild(t);
    setTimeout(function () { U.addClass(t, 'show'); }, 20);
    setTimeout(function () { U.removeClass(t, 'show'); setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 400); }, ms || 2200);
  };

  /** Press-and-hold button (grown-up gate). Calls onDone after ms of holding. */
  UI.holdButton = function (label, ms, onDone, cls) {
    var b = U.el('button.hold' + (cls ? '.' + cls : ''), { type: 'button', 'aria-label': label });
    var fill = U.el('span.hold-fill');
    b.appendChild(fill);
    b.appendChild(UI.icon('ui-gear'));
    if (label) { b.appendChild(U.el('span.hold-label', { text: label })); }
    var timer = null, startT = 0, raf = null;
    function tick() {
      var p = Math.min(1, (Date.now() - startT) / ms);
      fill.style.height = Math.round(p * 100) + '%';
      if (!startT) { return; }
      if (p >= 1) { stop(); onDone(); return; }
      raf = setTimeout(tick, 50);
    }
    function start(e) {
      if (e) { e.preventDefault(); }
      if (startT) { return; }             // a second finger must not start a second timer
      startT = Date.now(); U.addClass(b, 'holding'); tick();
    }
    function stop() { clearTimeout(raf); clearTimeout(timer); startT = 0; U.removeClass(b, 'holding'); fill.style.height = '0'; }
    b.addEventListener('touchstart', start, false);
    b.addEventListener('touchend', stop, false);
    b.addEventListener('touchcancel', stop, false);
    b.addEventListener('mousedown', start, false);
    b.addEventListener('mouseup', stop, false);
    b.addEventListener('mouseleave', stop, false);
    return b;
  };

  /** Simple modal for grown-ups. buttons: [{label, onTap, cls}] */
  UI.modal = function (title, bodyNode, buttons) {
    var bg = U.el('div.modal-bg');
    var box = U.el('div.modal');
    box.appendChild(U.el('h2', { text: title }));
    if (bodyNode) { box.appendChild(typeof bodyNode === 'string' ? U.el('p', { text: bodyNode }) : bodyNode); }
    var row = U.el('div.modal-btns');
    function close() { if (bg.parentNode) { bg.parentNode.removeChild(bg); } }
    (buttons || [{ label: 'OK' }]).forEach(function (bt) {
      row.appendChild(UI.textBtn(bt.label, function () { close(); if (bt.onTap) { bt.onTap(); } }, bt.cls));
    });
    box.appendChild(row);
    bg.appendChild(box);
    w.document.body.appendChild(bg);
    return { close: close, box: box };
  };

  UI.confirm = function (title, text, yesLabel, onYes) {
    return UI.modal(title, text, [{ label: 'Cancel', cls: 'ghost' }, { label: yesLabel || 'Yes', cls: 'danger', onTap: onYes }]);
  };

  /** Apply the child's font choice to the whole app. */
  UI.applyFont = function (profile) {
    var b = w.document.body;
    U.removeClass(b, 'font-dyslexic');
    if (profile && profile.font === 'dyslexic') { U.addClass(b, 'font-dyslexic'); }
  };

  /* ---------- flames ---------- */

  /** A flame icon. flicker = gentle CSS flicker (use sparingly: only a few on screen). */
  UI.flame = function (flicker, cls) {
    return UI.icon('ui-flame', 'flame' + (flicker ? ' flicker' : '') + (cls ? ' ' + cls : ''));
  };

  /** Flame counter for the top bar. UI.updateFlames() refreshes every counter on screen. */
  UI.flameCount = function (profile) {
    var box = U.el('div.flame-count', { 'aria-label': 'flames' });
    box.appendChild(UI.flame(true));
    box.appendChild(U.el('span.flame-num', { text: String(profile.flames || 0) }));
    return box;
  };
  UI.updateFlames = function (profile, bump) {
    var nums = w.document.querySelectorAll('.flame-num'), i;
    for (i = 0; i < nums.length; i++) {
      nums[i].textContent = String(profile.flames || 0);
      if (bump) { U.flash(nums[i].parentNode, 'pulse', 450); }
    }
  };

  /** A price tag: flame icon + number. */
  UI.price = function (cost, cls) {
    var t = U.el('span.price' + (cls ? '.' + cls : ''));
    t.appendChild(UI.flame(false));
    t.appendChild(U.el('span.price-num', { text: String(cost) }));
    return t;
  };

  /** "What she has vs what it costs" as a row of full and empty flames (no reading needed). */
  UI.flameSlots = function (have, cost) {
    var row = U.el('div.flame-slots'), i, n = Math.min(cost, 20);
    for (i = 0; i < n; i++) { row.appendChild(UI.icon(i < have ? 'ui-flame' : 'ui-flame-empty', 'slot')); }
    return row;
  };

  /**
   * Kid-friendly "buy it?" panel: big picture, price, her flames, Buy / back.
   * opts: { art: Node, cost, have, lineAsk, onBuy, canBuy, soon }
   */
  UI.buyPanel = function (opts) {
    var bg = U.el('div.modal-bg.kid');
    var box = U.el('div.buy-panel');
    function close() { if (bg.parentNode) { bg.parentNode.removeChild(bg); } RA.Audio.stop(); }
    var art = U.el('div.buy-art');
    art.appendChild(opts.art);
    box.appendChild(art);
    var side = U.el('div.buy-side');
    if (!opts.soon) {
      side.appendChild(UI.price(opts.cost, 'big'));
      side.appendChild(UI.flameSlots(opts.have, opts.cost));
    }
    var row = U.el('div.buy-btns');
    row.appendChild(UI.btn('ui-back', '', function () { close(); }, 'big ghost'));
    if (opts.soon) {
      U.addClass(box, 'soon');
    } else if (opts.canBuy) {
      var buy = UI.btn('ui-check', '', function () { close(); opts.onBuy(); }, 'big good buy-btn');
      buy.insertBefore(UI.flame(true), buy.firstChild);
      row.appendChild(buy);
    }
    side.appendChild(row);
    box.appendChild(side);
    bg.appendChild(box);
    U.tap(bg, function (e) { if (e.target === bg) { close(); } });
    w.document.body.appendChild(bg);
    RA.Audio.line(opts.soon ? 'coming-soon' : (opts.canBuy ? (opts.lineAsk || 'buy-it') : 'need-more'));
    return { close: close };
  };

  UI.stars = function (count, max) {
    var d = U.el('div.stars');
    for (var i = 0; i < (max || 3); i++) { d.appendChild(UI.icon('ui-star', i < count ? 'on' : 'off')); }
    return d;
  };

  UI.saveProfile = function () { if (RA.state.profile) { RA.Store.saveProfile(RA.state.profile); } };
})(window);
