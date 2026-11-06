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

  /* ================= character maker / dress-up ================= */

  var TABS = [
    { id: 'skin', label: 'Skin', color: 'skin', palette: 'skin' },
    { id: 'hair', label: 'Hair', slot: 'hair', key: 'hairStyle', color: 'hair', palette: 'hair' },
    { id: 'top', label: 'Top', slot: 'top', key: 'top', color: 'topColor', palette: 'clothes' },
    { id: 'bot', label: 'Bottom', slot: 'bot', key: 'bot', color: 'botColor', palette: 'clothes' },
    { id: 'shoes', label: 'Shoes', slot: 'shoes', key: 'shoes', color: 'shoeColor', palette: 'clothes' },
    { id: 'acc', label: 'Extras', slot: 'acc', key: 'acc', color: 'accColor', palette: 'clothes' }
  ];

  var DEFAULT_PALETTES = {
    skin: ['#FFE0CC', '#F8CBA8', '#EDB48A', '#D99A6C', '#C17F4F', '#A0663D', '#7D4A2A', '#5B3420'],
    hair: ['#2B1E1A', '#5A3825', '#8B5A2B', '#C8843A', '#E8C170', '#F2E3B3', '#B6413A', '#7A7480', '#F76CA8', '#8E6CEF', '#3D8BFD', '#4CC27A'],
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

  function editor(root, p, onDone) {
    var look = RA.Avatar.merge(p.look || randomStart(p));
    var tab = TABS[1];
    var wrap = U.el('div.dress');
    var preview = U.el('div.dress-preview');
    var side = U.el('div.dress-side');
    var tabs = U.el('div.dress-tabs');
    var opts = U.el('div.dress-opts');
    var colors = U.el('div.dress-colors');

    function redraw() {
      preview.innerHTML = '';
      var av = UI.avatar(look, 'big');
      preview.appendChild(av);
    }

    function drawTab() {
      U.clear(tabs); U.clear(opts); U.clear(colors);
      TABS.forEach(function (t) {
        var b = U.el('button.dress-tab' + (t === tab ? '.on' : ''), { type: 'button', text: t.label });
        U.tap(b, function () { tab = t; RA.Sfx.play('tap'); drawTab(); });
        tabs.appendChild(b);
      });
      if (tab.slot) {
        var parts = unlockedParts(p, tab.slot);
        if (tab.slot === 'acc') { parts = ['none'].concat(parts); }
        parts.forEach(function (part) {
          var test = U.clone(look);
          test[tab.key] = part;
          var b = U.el('button.dress-opt' + (look[tab.key] === part ? '.on' : ''), { type: 'button' });
          if (part === 'none') { b.appendChild(U.el('span.none-x', { text: '–' })); }
          else { b.appendChild(UI.avatar(test, 'thumb thumb-' + tab.slot)); }
          U.tap(b, function () { look[tab.key] = part; RA.Sfx.play('pop'); redraw(); drawTab(); });
          opts.appendChild(b);
        });
        // more styles are in the shop (bought with flames)
        if (p.look && lockedCount(p, tab.slot)) {
          var more = U.el('button.locked-note', { type: 'button', 'aria-label': 'Shop' });
          more.appendChild(UI.icon('ui-shop'));
          more.appendChild(UI.flame(false, 'tiny'));
          U.tap(more, function () { RA.Sfx.play('tap'); UI.go('shop', tab.slot === 'hair' ? 'hair' : 'clothes'); });
          opts.appendChild(more);
        }
      }
      palette(tab.palette).forEach(function (c) {
        var sw = U.el('button.swatch' + (look[tab.color] === c ? '.on' : ''), { type: 'button', style: 'background:' + c });
        U.tap(sw, function () { look[tab.color] = c; if (tab.id === 'top' && look.top2 === c) { look.top2 = '#FFFDF7'; } RA.Sfx.play('tap'); redraw(); drawTab(); });
        colors.appendChild(sw);
      });
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
    redraw();
    drawTab();
    U.later(function () { RA.Audio.line('pick-look'); }, 300);
  }

  function randomStart(p) {
    var look = U.clone(RA.Avatar.DEFAULT);
    look.skin = U.pick(DEFAULT_PALETTES.skin);
    look.hair = U.pick(DEFAULT_PALETTES.hair.slice(0, 8));
    var hs = unlockedParts(p, 'hair');
    if (hs.length) { look.hairStyle = U.pick(hs); }
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
