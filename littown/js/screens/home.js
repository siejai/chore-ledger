/* Lit Town — profile picker, child home, character maker / dress-up (ES5). */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens;

  function header(title, onBack, extra) {
    var h = U.el('div.topbar');
    if (onBack) { h.appendChild(UI.btn('ui-back', '', onBack, 'small')); }
    h.appendChild(U.el('h1', { text: title }));
    if (extra) { h.appendChild(extra); }
    return h;
  }

  /* ================= profiles (the title screen) ================= */

  S.profiles = {
    show: function (root) {
      RA.state.profile = null;
      UI.applyFont(null);
      var top = U.el('div.title-top');
      // inside Chore Quest: a way back to it (Lit Town is one of its sections)
      if (RA.Hub && RA.Hub.inside) { top.appendChild(UI.btn('ui-back', '', function () { RA.Hub.leave(); }, 'small hub-back')); }
      top.appendChild(UI.holdButton('Grown-ups: hold', 2500, function () { UI.go('parent'); }, 'corner'));
      var brand = U.el('div.brand');
      brand.appendChild(UI.icon('brand-logo', 'logo'));
      brand.appendChild(U.el('div.tagline', { text: 'Read. Glow. Play.' }));
      top.appendChild(brand);
      root.appendChild(top);
      var grid = U.el('div.profile-grid');
      var list = RA.Store.profiles();
      list.forEach(function (p) {
        var card = U.el('button.profile-card', { type: 'button' });
        card.appendChild(UI.avatar(p.look, 'mini'));
        card.appendChild(U.el('span.profile-name', { text: p.name }));
        U.tap(card, function () {
          RA.Audio.unlock();
          RA.state.profile = p;
          RA.Store.setLastProfile(p.id);
          UI.applyFont(p);
          RA.Sfx.play('pop');
          UI.go('kid');
        });
        grid.appendChild(card);
      });
      if (!list.length) {
        var add = U.el('button.profile-card.add', { type: 'button' });
        add.appendChild(UI.icon('ui-plus'));
        add.appendChild(U.el('span.profile-name', { text: 'New reader' }));
        U.tap(add, function () { RA.Audio.unlock(); UI.go('create', 'new'); });
        grid.appendChild(add);
        root.appendChild(U.el('p.hint', { text: 'Grown-ups can add more readers later in the grown-up screen (hold the gear button).' }));
      }
      root.appendChild(grid);
      U.later(function () { RA.Audio.line('hello'); }, 300);
    }
  };

  /* ================= child home ================= */

  S.kid = {
    show: function (root) {
      var p = RA.state.profile, E = RA.Engine;
      if (!p.look) { UI.go('create', p.id, true); return; }
      root.appendChild(header(p.name, function () { UI.go('profiles'); }, UI.flameCount(p)));

      var main = U.el('div.kid-main');
      var av = UI.avatar(p.look, 'big idle');
      U.tap(av, function () { RA.Sfx.play('boing'); U.flash(av, 'hop', 600); });
      main.appendChild(av);

      var menu = U.el('div.kid-menu');
      // "Read" goes to her working lesson (which can step back); places and unlocks follow the highest reached
      var next = E.working(p);
      var allDone = E.level(p) >= E.count() && next >= E.count() && !!p.progress.passed[next];
      menu.appendChild(UI.btn('ui-book', allDone ? 'Read again' : 'Read: lesson ' + next, function () { UI.go('lesson', next); }, 'huge read'));
      // a brand-new reader can show what she already knows first
      if (!p.progress.lessonCount && !(p.progress.placements || []).length) {
        menu.appendChild(UI.btn('ui-star', 'Show me what you know', function () { UI.go('placement'); }, 'huge placement-btn'));
      }
      menu.appendChild(UI.btn('ui-shop', 'Shop', function () { UI.go('shop'); }, 'huge shop'));
      menu.appendChild(UI.btn('ui-hanger', 'Dress up', function () { UI.go('dress'); }, 'huge dress'));
      main.appendChild(menu);

      // the glowing town: tap to go play
      var town = U.el('button.mini-town', { type: 'button', 'aria-label': 'Play in town' });
      town.appendChild(RA.World.miniMap(p));
      var cap = U.el('div.mini-town-cap');
      cap.appendChild(UI.icon('ui-town'));
      cap.appendChild(U.el('span', { text: 'Play' }));
      town.appendChild(cap);
      U.tap(town, function () { RA.Audio.unlock(); RA.Sfx.play('whoosh'); UI.go('map'); });
      main.appendChild(town);
      root.appendChild(main);

      // lesson path: passed lessons can be replayed any time
      var path = U.el('div.path');
      for (var n = 1; n <= E.count(); n++) {
        (function (n) {
          var passed = p.progress.passed[n];
          var open = n <= p.progress.unlocked;
          var dot = U.el('button.path-dot' + (passed ? '.done' : '') + (n === next && !passed ? '.next' : '') + (!open ? '.locked' : ''), { type: 'button' });
          dot.appendChild(U.el('span.path-n', { text: String(n) }));
          if (passed && passed.stars) { dot.appendChild(UI.icon('ui-star', 'tiny')); }
          if (!open) { dot.appendChild(UI.icon('ui-lock', 'tiny')); }
          U.tap(dot, function () {
            if (!open) { RA.Sfx.play('soft'); U.flash(dot, 'wiggle', 500); return; }
            UI.go('lesson', n);
          });
          path.appendChild(dot);
        })(n);
      }
      root.appendChild(path);
      U.later(function () {
        var nd = U.qs('.path-dot.next', path) || U.qs('.path-dot:last-child', path);
        if (nd && path.scrollTo) { path.scrollLeft = Math.max(0, nd.offsetLeft - path.clientWidth / 2); }
      }, 50);
    }
  };

  /* ================= character maker / dress-up =================
   * Style C characters (www/js/avatar-render.js + lit-style.js). Tabs:
   *   Body  height and width sliders (only the body stretches), skin colour + shade slider
   *   Face  eyes (incl. anime eyes), eye colour, brows, nose, mouth, cheeks, freckles, mood
   *   Hair  hairstyle, colour + shade slider
   *   Top / Bottom / Shoes / Extras  the clothes she owns, each with its colours
   * Thumbnails are drawn a few at a time so the Fire 7 stays responsive. */
  var TABS = [
    { id: 'body', label: 'Body' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair', slot: 'hair', key: 'hairStyle', crop: 'head' },
    { id: 'top', label: 'Top', slot: 'top', key: 'top', color: 'topColor', color2: 'top2', crop: 'body' },
    { id: 'bot', label: 'Bottom', slot: 'bot', key: 'bot', color: 'botColor', color2: 'bot2', crop: 'body' },
    { id: 'shoes', label: 'Shoes', slot: 'shoes', key: 'shoes', color: 'shoeColor', crop: 'feet' },
    { id: 'acc', label: 'Extras', slot: 'acc', key: 'acc', color: 'accColor', crop: 'head' }
  ];
  var FACE_PARTS = [
    { id: 'eyes', label: 'Eyes' }, { id: 'brows', label: 'Brows' }, { id: 'nose', label: 'Nose' }, { id: 'mouth', label: 'Mouth' },
    { id: 'cheeks', label: 'Cheeks' }, { id: 'freckles', label: 'Freckles' }, { id: 'expr', label: 'Mood' }
  ];
  var MOODS = ['happy', 'silly', 'surprised', 'sleepy', 'determined'];

  var DEFAULT_PALETTES = {
    skin: ['#FDE7D6', '#F5D0B0', '#EDB48A', '#DDA071', '#C68552', '#A0663D', '#7A4A2A', '#5A3622'],
    hair: ['#2A2026', '#5A3825', '#8A5A3B', '#A2482C', '#E9C46A', '#B9B4BD', '#F28DB8', '#6FA8F2', '#9B7BE0', '#7FD6B5'],
    eye: ['#6B4A2F', '#3B2A22', '#8A7A3A', '#3F8F5B', '#3D7FD6', '#7D8A99', '#B8741A'],
    clothes: ['#E5484D', '#FF7A6B', '#FF9EC4', '#F76CA8', '#FF9F43', '#FFD23F', '#4CC27A', '#2E9E63', '#7CC8F8', '#3D8BFD', '#2F4C9C', '#8E6CEF', '#C9B6FF', '#FFFDF7', '#3B2F45', '#C98B5A']
  };

  function palette(name) {
    var wp = RA.Engine.world().palettes || {};
    return wp[name] || DEFAULT_PALETTES[name];
  }

  function unlockedParts(p, slot) {
    return w.ART.list(slot).filter(function (part) {
      return RA.Engine.isUnlocked(p, 'outfit:' + slot + '/' + part);
    });
  }

  function lockedCount(p, slot) {
    var n = 0;
    (RA.Engine.world().outfits || []).forEach(function (o) {
      if ((!slot || o.slot === slot) && !RA.Engine.isUnlocked(p, 'outfit:' + o.slot + '/' + o.part)) { n++; }
    });
    return n;
  }

  /* eye colours: the natural ones, plus fantasy colours she bought */
  function eyeColors(p) {
    var out = palette('eye').slice();
    unlockedParts(p, 'eyecolor').forEach(function (id) { var d = w.ART.part('eyecolor', id); if (d && d.hex) { out.push(d.hex); } });
    return out;
  }

  function kitList(kind) {
    var k = (w.LAB && w.LAB.KIT && w.LAB.KIT[kind]) || [];
    return k.map(function (x) { return x[0]; });
  }

  function editor(root, p, onDone) {
    var look = RA.Avatar.merge(p.look || randomStart(p));
    var tab = TABS[2], facePart = FACE_PARTS[0], alive = 0;   // opens on Hair, the fun part
    var wrap = U.el('div.dress');
    var preview = U.el('div.dress-preview');
    var side = U.el('div.dress-side');
    var tabs = U.el('div.dress-tabs');
    var opts = U.el('div.dress-opts');
    var colors = U.el('div.dress-colors');

    var redrawTimer = null;
    function redraw(now) {
      clearTimeout(redrawTimer);
      function go() { U.clear(preview); preview.appendChild(UI.avatar(look, 'big')); }
      if (now) { go(); } else { redrawTimer = setTimeout(go, 40); }
    }

    /* option buttons: drawn a few per tick */
    function optionGrid(list, makeLook, isOn, onPick, crop, extraCls) {
      var mine = ++alive, queue = [];
      list.forEach(function (val) {
        var b = U.el('button.dress-opt' + (extraCls ? '.' + extraCls : '') + (isOn(val) ? '.on' : ''), { type: 'button' });
        if (val === 'none') { b.appendChild(U.el('span.none-x', { text: '–' })); }
        else { queue.push({ b: b, val: val }); }
        U.tap(b, function () { onPick(val); RA.Sfx.play('pop'); redraw(true); drawTab(); });
        opts.appendChild(b);
      });
      (function next() {
        if (mine !== alive || !queue.length) { return; }
        queue.splice(0, 3).forEach(function (q) { q.b.appendChild(UI.avatar(makeLook(q.val), 'thumb thumb-' + (crop || 'full'), { crop: crop })); });
        setTimeout(next, 0);
      })();
    }

    function swatchRow(list, cur, onPick, small) {
      var row = U.el('div.swatch-row' + (small ? '.small' : ''));
      list.forEach(function (c) {
        var sw = U.el('button.swatch' + (cur === c ? '.on' : ''), { type: 'button', style: 'background:' + c });
        U.tap(sw, function () { onPick(c); RA.Sfx.play('tap'); redraw(); drawTab(); });
        row.appendChild(sw);
      });
      colors.appendChild(row);
    }

    /* a big, easy slider (-50..50 or 85..120) */
    function slider(label, icon, min, max, val, onMove) {
      var row = U.el('div.dress-slider');
      row.appendChild(U.el('span.slider-label', { text: label }));
      var input = U.el('input.slider', { type: 'range', min: String(min), max: String(max), step: '1', value: String(val) });
      function move() { onMove(parseInt(input.value, 10)); redraw(); }
      input.addEventListener('input', move);
      input.addEventListener('change', function () { move(); RA.Sfx.play('tap'); });
      row.appendChild(input);
      return row;
    }

    function shadeOf(key) { return Math.round((look[key + 'Tint'] || 0) * 100); }
    function setShade(key, v) {
      look[key + 'Tint'] = v / 100;
      look[key] = RA.Avatar.tint(look[key + 'Base'] || look[key], look[key + 'Tint']);
    }
    function pickBase(key, hex) {
      look[key + 'Base'] = hex;
      look[key] = look[key + 'Tint'] ? RA.Avatar.tint(hex, look[key + 'Tint']) : hex;
    }

    function drawTab() {
      alive++;
      U.clear(tabs); U.clear(opts); U.clear(colors);
      U[tab.id === 'body' ? 'addClass' : 'removeClass'](opts, 'sliders');
      TABS.forEach(function (t) {
        var b = U.el('button.dress-tab' + (t === tab ? '.on' : ''), { type: 'button', text: t.label });
        U.tap(b, function () { tab = t; RA.Sfx.play('tap'); drawTab(); });
        tabs.appendChild(b);
      });

      if (tab.id === 'body') {
        opts.appendChild(slider('Tall', 'height', 85, 120, Math.round(look.height * 100), function (v) { look.height = v / 100; }));
        opts.appendChild(slider('Wide', 'width', 85, 120, Math.round(look.width * 100), function (v) { look.width = v / 100; }));
        opts.appendChild(slider('Skin shade', 'shade', -40, 40, shadeOf('skin'), function (v) { setShade('skin', v); }));
        swatchRow(palette('skin'), look.skinBase || look.skin, function (c) { pickBase('skin', c); });
        return;
      }

      if (tab.id === 'face') {
        var sub = U.el('div.dress-sub');
        FACE_PARTS.forEach(function (fp) {
          var c = U.el('button.sub-chip' + (fp === facePart ? '.on' : ''), { type: 'button', text: fp.label });
          U.tap(c, function () { facePart = fp; RA.Sfx.play('tap'); drawTab(); });
          sub.appendChild(c);
        });
        opts.appendChild(sub);
        var list = facePart.id === 'expr' ? MOODS : kitList(facePart.id);
        optionGrid(list, function (v) { var t = U.clone(look); t[facePart.id] = v; return t; },
          function (v) { return look[facePart.id] === v; }, function (v) { look[facePart.id] = v; }, 'head', 'face-opt');
        if (facePart.id === 'eyes') { swatchRow(eyeColors(p), look.eye, function (c) { look.eye = c; }); }
        return;
      }

      var parts = unlockedParts(p, tab.slot);
      if (tab.slot === 'acc') { parts = ['none'].concat(parts); }
      optionGrid(parts, function (v) { var t = U.clone(look); t[tab.key] = v; return t; },
        function (v) { return look[tab.key] === v; }, function (v) { look[tab.key] = v; }, tab.crop);
      // more styles are in the shop (bought with flames)
      if (p.look && lockedCount(p, tab.slot)) {
        var more = U.el('button.locked-note', { type: 'button', 'aria-label': 'Shop' });
        more.appendChild(UI.icon('ui-shop'));
        more.appendChild(UI.flame(false, 'tiny'));
        U.tap(more, function () { RA.Sfx.play('tap'); UI.go('shop', tab.slot === 'hair' ? 'hair' : 'clothes'); });
        opts.appendChild(more);
      }
      if (tab.id === 'hair') {
        swatchRow(palette('hair'), look.hairBase || look.hair, function (c) { pickBase('hair', c); });
        colors.appendChild(slider('Shade', 'shade', -40, 40, shadeOf('hair'), function (v) { setShade('hair', v); }));
        return;
      }
      swatchRow(palette('clothes'), look[tab.color], function (c) {
        look[tab.color] = c;
        if (tab.color2 && look[tab.color2] === c) { look[tab.color2] = c === '#FFFDF7' ? '#3B2F45' : '#FFFDF7'; }
      });
      if (tab.color2) { swatchRow(palette('clothes'), look[tab.color2], function (c) { look[tab.color2] = c; }, true); }
    }

    side.appendChild(tabs);
    side.appendChild(opts);
    side.appendChild(colors);
    wrap.appendChild(preview);
    wrap.appendChild(side);
    root.appendChild(wrap);
    var ok = UI.btn('ui-check', 'Done', function () {
      p.look = look;
      RA.Store.saveProfile(p);
      RA.Sfx.play('chime');
      onDone();
    }, 'done-btn');
    root.appendChild(ok);
    redraw(true);
    drawTab();
    U.later(function () { RA.Audio.line('pick-look'); }, 300);
  }

  function randomStart(p) {
    var look = U.clone(RA.Avatar.DEFAULT);
    look.skinBase = look.skin = U.pick(DEFAULT_PALETTES.skin);
    look.hairBase = look.hair = U.pick(DEFAULT_PALETTES.hair.slice(0, 6));
    look.eye = U.pick(DEFAULT_PALETTES.eye);
    var hs = unlockedParts(p, 'hair');
    if (hs.length) { look.hairStyle = U.pick(hs.slice(0, 15)); }
    look.eyes = U.pick(['e9', 'e9', 'e4', 'a1', 'a2', 'e11']);
    look.topColor = U.pick(DEFAULT_PALETTES.clothes.slice(0, 13));
    look.botColor = U.pick(['#2F4C9C', '#3B2F45', '#8E6CEF', '#2E9E63', '#E5484D']);
    return look;
  }

  S.create = {
    show: function (root, param) {
      var p = (param && param !== 'new') ? RA.Store.profile(param) : null;
      if (p && p.name) { RA.state.profile = p; showEditor(); return; }
      root.appendChild(header('New reader', function () { UI.go(RA.Store.profiles().length ? 'parent' : 'profiles'); }));
      var box = U.el('div.name-box');
      box.appendChild(U.el('label', { text: 'What is your name?', 'for': 'name-in' }));
      var input = U.el('input.name-in', { id: 'name-in', type: 'text', maxlength: '14', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false' });
      box.appendChild(input);
      var go = UI.btn('ui-next', 'Next', function () {
        var name = (input.value || '').replace(/^\s+|\s+$/g, '');
        if (!name) { U.flash(input, 'wiggle', 500); input.focus(); return; }
        name = name.charAt(0).toUpperCase() + name.slice(1);
        p = RA.Store.newProfile(name);
        RA.Store.saveProfile(p);
        RA.state.profile = p;
        UI.applyFont(p);
        showEditor();
      }, 'big');
      box.appendChild(go);
      root.appendChild(box);
      U.later(function () { input.focus(); RA.Audio.line('make-character'); }, 300);

      function showEditor() {
        U.clear(root);
        root.appendChild(header(RA.state.profile.name, null));
        editor(root, RA.state.profile, function () { UI.go('kid', null, true); });
      }
    }
  };

  S.dress = {
    show: function (root) {
      root.appendChild(header('Dress up', function () { w.history.back(); }));
      editor(root, RA.state.profile, function () { w.history.back(); });
    }
  };
})(window);
