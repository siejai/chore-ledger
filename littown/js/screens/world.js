/* Lit Town — town map and play scenes (ES5).
 * Free play: drag, drop, dress, tap. No goals, scores, timers or losing.
 * Positions are saved per child per place. */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, A = RA.Audio, E = RA.Engine;
  var ART = w.ART;

  var SCENE_W = 1000, SCENE_H = 600;
  var CHAR_W = 120, CHAR_H = 180, CHAR_SCALE = 0.6;
  var HEAD = { x: 100 * CHAR_SCALE, y: 76 * CHAR_SCALE };   // where a worn hat's bottom-center sits (normal body)
  var HAND = { x: 144 * CHAR_SCALE, y: 214 * CHAR_SCALE };  // held item center (normal body)
  /* a stretched (taller or wider) character has its head and hand somewhere else */
  function anchorsOf(ch) {
    if (!ch.anch) {
      var a = RA.Avatar.anchors ? RA.Avatar.anchors(ch.def.look || {}) : null;
      ch.anch = a ? { head: { x: a.head.x * CHAR_SCALE, y: a.head.y * CHAR_SCALE }, hand: { x: a.hand.x * CHAR_SCALE, y: a.hand.y * CHAR_SCALE } } : { head: HEAD, hand: HAND };
    }
    return ch.anch;
  }

  var World = RA.World = {};

  World.location = function (id) {
    var locs = E.world().locations || [], i;
    for (i = 0; i < locs.length; i++) { if (locs[i].id === id) { return locs[i]; } }
    return null;
  };

  World.item = function (id) {
    var its = E.world().items || [], i;
    for (i = 0; i < its.length; i++) { if (its[i].id === id) { return its[i]; } }
    return null;
  };

  /** Item SVG with its color variant applied (CSS variables, or baked fills on old WebViews). */
  World.itemSvg = function (item) {
    var svg = ART.svg(item.sprite);
    if (!svg || !item.colors) { return svg; }
    var c = item.colors;
    if (RA.supportsCssVars) {
      var style = (c.item ? '--item:' + c.item + ';' : '') + (c.item2 ? '--item2:' + c.item2 + ';' : '');
      var cls = (c.item ? 'rc-item ' : '') + (c.item2 ? 'rc-item2' : '');
      return svg.replace(/^<svg\b/, '<svg class="' + cls + '" style="' + style + '"');
    }
    return svg.replace(/class="c-(item2?)" fill="#[0-9A-Fa-f]{3,6}"/g, function (m, k) {
      var col = c[k];
      return col ? 'class="c-' + k + '" fill="' + col + '"' : m;
    });
  };

  World.ensurePack = function (pack, cb) {
    if (!pack || ART.loaded[pack]) { cb(null); return; }
    U.loadScript('art/' + pack + '.js', cb);
  };

  /** Art packs of a place (a single "pack" and/or a list of "packs"). */
  World.packsOf = function (loc) {
    if (!loc) { return []; }
    return [].concat(loc.pack ? [loc.pack] : [], loc.packs || []);
  };

  /** Rooms of a place. A place without "rooms" is one room: the place itself. */
  World.rooms = function (loc) {
    if (loc.rooms && loc.rooms.length) { return loc.rooms; }
    return [{ id: 'main', background: loc.background, floor: loc.floor, surfaces: loc.surfaces, signs: loc.signs,
      hotspots: loc.hotspots, fixtures: loc.fixtures, playerStart: null }];
  };
  World.room = function (loc, id) {
    var rs = World.rooms(loc), i;
    for (i = 0; i < rs.length; i++) { if (rs[i].id === id) { return rs[i]; } }
    return rs[0];
  };

  /** Load several packs one after another; missing ones are skipped. */
  World.ensurePacks = function (packs, cb) {
    var list = (packs || []).slice();
    (function next() {
      if (!list.length) { cb(); return; }
      World.ensurePack(list.shift(), function () { next(); });
    })();
  };

  /* ---------- a scaled 1000×600 stage that fits any screen ---------- */

  function makeViewport(root, bgColor) {
    var vp = U.el('div.viewport', { style: 'background:' + (bgColor || '#BFE6FF') });
    var scene = U.el('div.scene');
    vp.appendChild(scene);
    root.appendChild(vp);
    var view = { vp: vp, scene: scene, s: 1, ox: 0, oy: 0 };
    view.fit = function () {
      var W = vp.clientWidth || w.innerWidth || 1024, H = vp.clientHeight || w.innerHeight || 600;
      view.s = Math.min(W / SCENE_W, H / SCENE_H);
      view.ox = Math.round((W - SCENE_W * view.s) / 2);
      view.oy = Math.round((H - SCENE_H * view.s) / 2);
      var t = 'translate(' + view.ox + 'px,' + view.oy + 'px) scale(' + view.s + ')';
      scene.style.webkitTransform = t;
      scene.style.transform = t;
    };
    view.toScene = function (cx, cy) {
      var r = vp.getBoundingClientRect();
      return { x: (cx - r.left - view.ox) / view.s, y: (cy - r.top - view.oy) / view.s };
    };
    view.fit();
    return view;
  }

  function setXY(el, left, top) {
    var t = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
    el.style.webkitTransform = t;
    el.style.transform = t;
  }

  /* ================= town map (starts dark; each place lights up at its milestone lesson) ================= */

  /** Does this building glow on the map? Lit places do, and at the finale every building does. */
  function glows(p, loc, skip) {
    if (skip && skip[loc.id]) { return false; }              // waiting for its celebration
    return E.isUnlocked(p, 'loc:' + loc.id) || E.finaleReached(p);
  }

  /** How dark the night is: darker when few places are lit; gone at the finale. */
  function nightOpacity(p, skip) {
    var lit = 0, total = 0;
    if (E.finaleReached(p) && !(skip && skip.finale)) { return 0; }
    (E.world().locations || []).forEach(function (l) { total++; if (glows(p, l, skip)) { lit++; } });
    return Math.max(0.12, 0.6 - 0.48 * (total ? lit / total : 0));
  }

  /** One building on the map, lit or dark. skip: places still waiting for their celebration */
  function buildingEl(p, loc, withName, skip) {
    var lit = glows(p, loc, skip);
    var sz = ART.size(loc.building);
    var b = U.el('div.building.' + (lit ? 'bld-lit' : 'bld-dark') + (loc.comingSoon ? '.soon' : ''),
      { style: 'width:' + sz.w + 'px;height:' + sz.h + 'px;z-index:' + Math.round(loc.hub[1]), 'data-loc': loc.id });
    b.innerHTML = ART.svg(loc.building);
    setXY(b, loc.hub[0] - sz.w / 2, loc.hub[1] - sz.h);
    if (withName && lit && loc.name && E.canRead(p, loc.name)) { b.appendChild(UI.readLine(loc.name, 'bld-name')); }
    return b;
  }

  /** Small, non-interactive picture of her town for the home screen. */
  World.miniMap = function (p) {
    var box = U.el('div.mini-map');
    var scene = U.el('div.mini-scene');
    var bg = U.el('div.bg');
    bg.innerHTML = ART.svg('bg-hub');
    scene.appendChild(bg);
    scene.appendChild(U.el('div.night', { style: 'opacity:' + nightOpacity(p) }));
    (E.world().locations || []).forEach(function (loc) {
      if (loc.building && ART.has(loc.building)) { scene.appendChild(buildingEl(p, loc, false)); }
    });
    box.appendChild(scene);
    return box;
  };

  var mapView = null;

  S.map = {
    show: function (root) {
      var p = RA.state.profile;
      mapView = makeViewport(root, '#1B1838');
      var bg = U.el('div.bg');
      bg.innerHTML = ART.svg('bg-hub');
      mapView.scene.appendChild(bg);
      // places that just reached their lesson start dark and light up in a little celebration
      var waiting = E.uncelebrated(p), skip = {}, els = {};
      waiting.forEach(function (l) { skip[l.id] = true; });
      var finaleNow = E.finaleReached(p) && !(p.celebrated || {}).finale;
      if (finaleNow) { skip.finale = true; }
      var night = U.el('div.night', { style: 'opacity:' + nightOpacity(p, skip) });
      mapView.scene.appendChild(night);
      (E.world().locations || []).forEach(function (loc) {
        if (!loc.building || !ART.has(loc.building)) { return; }
        var b = buildingEl(p, loc, true, skip);
        if (!glows(p, loc, skip) || (finaleNow && !E.isUnlocked(p, 'loc:' + loc.id))) { b.appendChild(lockTag(p, loc)); }
        if (loc.rooms && E.isUnlocked(p, 'loc:' + loc.id) && E.homeNews(p).length) { b.appendChild(newsBadge('bld-news')); }
        U.tap(b, function () { tapBuilding(p, loc, b); });
        mapView.scene.appendChild(b);
        els[loc.id] = b;
      });
      if (waiting.length || finaleNow) { celebrate(p, waiting, finaleNow, els, night); }
      var hud = U.el('div.hud');
      hud.appendChild(UI.btn('ui-back', '', function () { UI.go('kid'); }, 'small'));
      root.appendChild(hud);
      var counter = UI.flameCount(p);
      U.addClass(counter, 'hud-right');
      root.appendChild(counter);
      w.addEventListener('resize', mapView.fit, false);
      U.later(function () { A.line('where-to'); }, 300);
    },
    hide: function () { if (mapView) { w.removeEventListener('resize', mapView.fit, false); mapView = null; } }
  };

  /** A small flame badge: something new is waiting there (a free fix-up, new versions, a room that opened). */
  function newsBadge(cls) {
    var d = U.el('div.news-badge' + (cls ? '.' + cls : ''));
    d.appendChild(UI.icon('ui-flame'));
    return d;
  }
  World.newsBadge = newsBadge;

  /** "Reach lesson 10" under a dark place ("Coming soon" once she has reached it but it isn't drawn yet). */
  function lockTag(p, loc) {
    var tag = U.el('div.bld-reach');
    var reached = E.placeReached(p, loc) && loc.comingSoon;   // reached, but not built yet
    tag.innerHTML = ART.svg('ui-lock');
    tag.appendChild(U.el('span', { text: reached ? 'Coming soon' : 'Reach lesson ' + E.placeLesson(loc) }));
    return tag;
  }

  /** Light up a building on the map (from dark silhouette to full colour, windows and lamps glowing). */
  function lightUp(p, loc, b) {
    if (!b) { return; }
    U.removeClass(b, 'bld-dark');
    U.addClass(b, 'bld-lit');
    var t = b.querySelector('.bld-reach');
    if (t) { t.parentNode.removeChild(t); }
    if (loc.name && E.canRead(p, loc.name) && E.isUnlocked(p, 'loc:' + loc.id) && !b.querySelector('.bld-name')) {
      b.appendChild(UI.readLine(loc.name, 'bld-name'));
    }
    RA.Sfx.play('chime');
    setTimeout(function () { RA.Sfx.play('sparkle'); }, 500);
    UI.burstOn(b);
  }

  /** New places light up one after another; at the finale the whole town does. No taps needed. */
  function celebrate(p, waiting, finaleNow, els, night) {
    var at = 900, step = 1700, celebrateSkip = {};
    waiting.forEach(function (l) { celebrateSkip[l.id] = true; });
    waiting.forEach(function (loc) {
      E.markCelebrated(p, loc.id);
      U.later(function () {
        lightUp(p, loc, els[loc.id]);
        delete celebrateSkip[loc.id];
        night.style.opacity = String(nightOpacity(p, celebrateSkip));
        A.line('new-place');
      }, at);
      at += step;
    });
    if (finaleNow) {
      celebrateSkip.finale = true;
      p.celebrated = p.celebrated || {};
      p.celebrated.finale = U.today();
      U.later(function () {
        delete celebrateSkip.finale;
        night.style.opacity = '0';
        (E.world().locations || []).forEach(function (loc, i) {
          setTimeout(function () { if (els[loc.id] && els[loc.id].className.indexOf('bld-dark') >= 0) { lightUp(p, loc, els[loc.id]); } else if (els[loc.id]) { UI.burstOn(els[loc.id]); } }, i * 250);
        });
        A.line((E.finale() || {}).line || 'town-lit');
      }, at);
    }
    RA.Store.saveProfile(p);
  }

  function tapBuilding(p, loc, b) {
    RA.Audio.unlock();
    var key = 'loc:' + loc.id;
    if (E.isUnlocked(p, key)) { RA.Sfx.play('whoosh'); UI.go('place', loc.id); return; }
    // not yet: a little wiggle, and the label says which lesson lights it up
    RA.Sfx.play('soft');
    U.flash(b, 'wiggle', 500);
    var t = b.querySelector('.bld-reach');
    if (t) { U.flash(t, 'pulse', 450); }
    A.line(E.placeReached(p, loc) ? 'coming-soon' : 'keep-reading');
  }

  /* ================= a place ================= */

  var P = null; // current place state

  S.place = {
    show: function (root, locId) {
      var p = RA.state.profile;
      var loc = World.location(locId);
      if (!loc || !E.isUnlocked(p, 'loc:' + loc.id)) { UI.go('map', null, true); return; }
      var loading = U.el('div.loading', { text: '…' });
      root.appendChild(loading);
      World.ensurePacks(World.packsOf(loc), function () {
        if (UI.currentName() !== 'place') { return; }
        if (!ART.has(World.rooms(loc)[0].background)) { UI.toast('This place is still being built!'); UI.go('map', null, true); return; }
        U.clear(root);
        buildPlace(root, p, loc);
      });
    },
    hide: function () {
      RA.Anim.stopAll();
      if (P) {
        w.removeEventListener('resize', P.view.fit, false);
        flushSave();
        P = null;
      }
    }
  };

  /** Switch to another room of the current place (her house). */
  World.goRoom = function (roomId) {
    if (!P) { return; }
    var room = World.room(P.loc, roomId);
    if (!E.roomOpen(P.p, room)) { return; }
    RA.Anim.stopAll();
    flushSave();
    var root = P.root, p = P.p, loc = P.loc;
    P.st.room = room.id;
    w.removeEventListener('resize', P.view.fit, false);
    U.clear(root);
    buildPlace(root, p, loc);
  };
  World.current = function () { return P; };

  var saveTimer = null;
  World.flush = function () { flushSave(); };
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    if (RA.state.profile) { RA.Store.saveProfile(RA.state.profile); }
  }

  function placeState(p, loc) {
    p.world = p.world || {};
    var st = p.world[loc.id] = p.world[loc.id] || { objects: {} };
    st.objects = st.objects || {};
    return st;
  }

  function buildPlace(root, p, loc) {
    var st = placeState(p, loc);
    var room = World.room(loc, st.room);
    if (!E.roomOpen(p, room)) { room = World.rooms(loc)[0]; }
    st.room = room.id;
    var view = makeViewport(root, room.bgColor || loc.bgColor);
    P = { p: p, loc: loc, room: room, root: root, view: view, objs: {}, list: [], st: st, bubble: null, tag: null, fixtures: {} };
    var scene = view.scene;

    var bg = U.el('div.bg');
    bg.innerHTML = ART.svg(room.background);
    scene.appendChild(bg);

    // signs: words appear once she can read them
    (room.signs || []).forEach(function (sg) {
      var lvl = E.level(p);
      if (lvl < (sg.minLesson || 0) || !E.canRead(p, sg.text)) { return; }
      var d = U.el('div.sign', { style: 'left:' + sg.x + 'px;top:' + sg.y + 'px;width:' + sg.w + 'px;height:' + sg.h + 'px' });
      d.appendChild(UI.readLine(sg.text, 'sign-text'));
      scene.appendChild(d);
    });

    (room.hotspots || []).forEach(function (h) {
      var d = U.el('div.hotspot', { style: 'left:' + h.x + 'px;top:' + h.y + 'px;width:' + h.w + 'px;height:' + h.h + 'px' });
      U.tap(d, function () {
        RA.Audio.unlock();
        RA.Sfx.play(h.sfx || 'ding');
        sparkleAt(h.x + h.w / 2, h.y + h.h / 2);
        if (h.say && E.canRead(p, h.say)) { A.text(h.say); }
      });
      scene.appendChild(d);
    });

    // fixtures with moving parts (fridge, sink, TV…) — see screens/house.js. Things whose free
    // fix-up she hasn't seen yet are drawn in their old junky version first (see revealDue below).
    var bctx = houseCtx(); bctx.showJunk = true;
    P.fixtures = RA.House.build(bctx);

    // characters (the child's own character first)
    var start = room.playerStart || [(E.world().start || {}).x || 330, (E.world().start || {}).y || 560];
    addChar({ id: 'player', look: p.look, name: p.name, x: start[0], y: start[1], isPlayer: true });
    (E.world().characters || []).forEach(function (c) {
      if (c.location === loc.id && (c.room || roomKey()) === room.id && E.isUnlocked(p, 'char:' + c.id)) { addChar(c); }
    });
    // items: the ones that live in this room (or that she moved here)
    (E.world().items || []).forEach(function (it) {
      var sv = P.st.objects[it.id];
      if (it.location === loc.id && roomOf(it) === room.id && E.isUnlocked(p, 'item:' + it.id) && ART.has(it.sprite) && !(sv && sv.stored)) { addItem(it); }
    });
    // re-attach worn / held items
    P.list.forEach(function (o) {
      if (o.kind === 'item' && o.on && P.objs[o.on]) { attach(o, P.objs[o.on], true); }
      else if (o.kind === 'item') { o.on = null; }
    });

    // lights: a flat dimming layer over the room (no glow effects)
    P.dark = U.el('div.room-dark', { style: 'opacity:' + darkness() });
    scene.appendChild(P.dark);
    RA.House.openDoorsIfDue(P.fixtures, houseCtx());
    // her house: news in this room is now seen; a free fix-up plays its before-and-after
    var otherNews = {};
    if (loc.rooms) {
      loc.rooms.forEach(function (r) { otherNews[r.id] = r.id !== room.id && E.roomNews(p, r).length > 0; });
      E.markRoomSeen(p, room);
      if (RA.House.revealDue(P.fixtures, houseCtx(), room) === 0) { saveSoon(); }
    }

    // rooms of her house
    if (loc.rooms && loc.rooms.length > 1) {
      var bar = U.el('div.room-bar');
      loc.rooms.forEach(function (r) {
        var open = E.roomOpen(p, r);
        var b = U.el('button.room-btn' + (r.id === room.id ? '.on' : '') + (open ? '' : '.locked'), { type: 'button', 'data-room': r.id });
        b.appendChild(UI.icon(r.icon || 'ui-decor'));
        if (!open) { b.appendChild(UI.icon('ui-lock', 'tiny room-lock')); }
        else if (otherNews[r.id]) { b.appendChild(newsBadge('room-news')); }
        U.tap(b, function () {
          RA.Audio.unlock();
          if (r.id === P.room.id) { return; }
          if (!open) { RA.Sfx.play('rattle'); U.flash(b, 'shake', 600); A.line('stuck'); return; }
          RA.Sfx.play('whoosh');
          World.goRoom(r.id);
        });
        bar.appendChild(b);
      });
      root.appendChild(bar);
    }

    var hud = U.el('div.hud');
    hud.appendChild(UI.btn('ui-map', '', function () { UI.go('map'); }, 'small'));
    hud.appendChild(UI.btn('ui-hanger', '', function () { UI.go('dress'); }, 'small'));
    if (loc.decorate) {
      hud.appendChild(UI.btn('ui-decor', '', function () { toggleDecor(root); }, 'small decor-btn'));
      // the version picker: only once something in this room has been fixed up (nothing locked is ever shown)
      if (E.pickableChains(p, room.id).length) {
        var hb = UI.btn('ui-fix', '', function () { toggleHouse(root); }, 'small house-btn');
        if (E.pickNews(p, room.id).length) { hb.appendChild(newsBadge('pick-news')); }
        hud.appendChild(hb);
      }
      hud.appendChild(UI.btn('ui-shop', '', function () { UI.go('shop', 'home'); }, 'small'));
    }
    root.appendChild(hud);
    var counter = UI.flameCount(p);
    U.addClass(counter, 'hud-right');
    root.appendChild(counter);

    // tap on empty space closes bubbles
    U.tap(bg, function () { closeBubble(); });
    w.addEventListener('resize', view.fit, false);
  }

  /* ---------- decorating (places with "decorate": true, i.e. her home) ---------- */

  function toggleDecor(root) {
    var open = U.qs('.decor-drawer', root);
    if (open) { open.parentNode.removeChild(open); if (open.className.indexOf('house-drawer') < 0) { return; } }
    closeBubble();
    var drawer = U.el('div.decor-drawer');
    var row = U.el('div.decor-row');
    (E.world().items || []).forEach(function (it) {
      if (it.location !== P.loc.id || !E.isUnlocked(P.p, 'item:' + it.id) || !ART.has(it.sprite)) { return; }
      var placed = !!P.objs[it.id];      // in this room (things in other rooms can be brought here)
      var b = U.el('button.decor-item' + (placed ? '.placed' : ''), { type: 'button', 'data-id': it.id });
      var pic = U.el('div.decor-pic');
      pic.innerHTML = World.itemSvg(it);
      b.appendChild(pic);
      b.appendChild(UI.icon(placed ? 'ui-store' : 'ui-plus', 'decor-act'));
      U.tap(b, function () {
        if (P.objs[it.id]) { storeItem(P.objs[it.id]); }
        else { placeItem(it); }
        RA.Sfx.play('pop');
        U.removeClass(drawer, 'x'); drawer.parentNode.removeChild(drawer); toggleDecor(root);
      });
      row.appendChild(b);
    });
    drawer.appendChild(row);
    drawer.appendChild(UI.btn('ui-check', '', function () { drawer.parentNode.removeChild(drawer); }, 'small good decor-done'));
    root.appendChild(drawer);
    A.line('decorate');
  }

  /* ---------- her house: pick which version of each thing is in the room ---------- */

  var TIERS = ['junk', 'fixed', 'deluxe', 'premium'];

  function toggleHouse(root, chainId) {
    var old = U.qs('.decor-drawer', root);
    if (old) { old.parentNode.removeChild(old); if (!chainId && old.className.indexOf('house-drawer') >= 0) { return; } }
    closeBubble();
    var chains = E.pickableChains(P.p, P.room.id);
    if (!chains.length) { return; }
    // she has looked at what's new: the badge on the wrench goes
    E.markPickSeen(P.p, P.room.id);
    var badge = U.qs('.house-btn .news-badge', root);
    if (badge) { badge.parentNode.removeChild(badge); }
    saveSoon();
    var ch = E.chain(chainId) || chains[0];
    var drawer = U.el('div.decor-drawer.house-drawer');
    // which thing (bed, bedding and rug, lamp…), each shown as it looks now
    if (chains.length > 1) {
      var chips = U.el('div.house-chips');
      chains.forEach(function (c) {
        var b = U.el('button.house-chip' + (c === ch ? '.on' : ''), { type: 'button', 'data-chain': c.id });
        var pic = U.el('div.house-pic');
        pic.innerHTML = ART.svg(E.tierArt(E.tierOf(c, E.tierInUse(P.p, c))));
        b.appendChild(pic);
        U.tap(b, function () { RA.Sfx.play('tap'); toggleHouse(root, c.id); });
        chips.appendChild(b);
      });
      drawer.appendChild(chips);
    }
    var row = U.el('div.decor-row.house-tiers');
    TIERS.forEach(function (tid) {
      var t = E.tierOf(ch, tid);
      if (!t) { return; }
      var card = tierCard(root, ch, t);
      if (card) { row.appendChild(card); }
    });
    drawer.appendChild(row);
    drawer.appendChild(UI.btn('ui-check', '', function () { drawer.parentNode.removeChild(drawer); }, 'small good decor-done'));
    root.appendChild(drawer);
    if (!chainId) { A.line('pick-one'); }
  }

  /** One version of a thing: in use, hers (tap to use it), for sale, or still locked. */
  function tierCard(root, ch, t) {
    var p = P.p, ready = t.id === 'junk' || E.tierReady(ch, t), owned = E.tierOwned(p, ch, t.id), inUse = E.tierInUse(p, ch) === t.id;
    var key = E.tierKey(ch.id, t.id), why = t.cost > 0 ? E.canBuy(p, key) : (owned ? 'owned' : 'lesson');
    var state = !ready ? 'soon' : (inUse ? 'on' : (owned ? 'owned' : (why === 'lesson' ? 'locked' : 'buy')));
    if (state === 'soon' || state === 'locked') { return null; }   // nothing locked or coming-soon is shown
    var b = U.el('button.house-tier.' + state, { type: 'button', 'data-tier': t.id });
    var pic = U.el('div.house-pic');
    pic.innerHTML = ART.svg(E.tierArt(t) || E.tierArt(E.tierOf(ch, 'junk')));
    b.appendChild(pic);
    if (state === 'on') { b.appendChild(U.el('div.house-mark', null, [UI.icon('ui-check')])); }
    else if (state === 'buy') { b.appendChild(UI.price(t.cost, why === 'ok' ? '' : 'dim')); }
    U.tap(b, function () {
      RA.Audio.unlock();
      if (state === 'on') { RA.Sfx.play('pop'); U.flash(b, 'hop', 600); return; }
      if (state === 'owned') { useVersion(root, ch, t.id); return; }
      var art = U.el('div.buy-fx');
      art.innerHTML = ART.svg(E.tierArt(t));
      UI.buyPanel({
        art: art, cost: t.cost, have: p.flames || 0, soon: false, canBuy: why === 'ok',
        onBuy: function () {
          if (E.buy(p, key) !== 'ok') { return; }
          RA.Store.saveProfile(p);
          UI.updateFlames(p, true);
          RA.Sfx.play('chime');
          A.line('bought');
          showVersion(root, ch);
        }
      });
    });
    return b;
  }

  function useVersion(root, ch, tierId) {
    if (!E.useTier(P.p, ch.id, tierId)) { return; }
    RA.Sfx.play('pop');
    showVersion(root, ch);
    saveSoon();
  }

  /** Redraw the room's things in the version now in use, with a little sparkle, and refresh the drawer. */
  function showVersion(root, ch) {
    RA.House.retier(P.fixtures, houseCtx(), ch);
    houseCtx().onRetier();
    RA.House.fixturesOf(P.fixtures, ch).forEach(function (f) { U.flash(f.body || f.el, 'hop', 650); sparkleAt(f.x, f.top + f.h / 2); });
    toggleHouse(root, ch.id);
  }

  /** Put an owned item into this room (where it was before, or its starting spot here). */
  function placeItem(it) {
    var sv = P.st.objects[it.id] || {};
    sv.stored = false;
    sv['in'] = null;
    if (roomOf(it) !== P.room.id) {
      // brought from another room: its usual spot if it lives here, else the middle of the floor
      sv.room = P.room.id;
      var home = (it.room || roomKey()) === P.room.id;
      sv.x = home ? it.x : 470 + Math.round(Math.random() * 80);
      sv.y = home ? it.y : 575;
    }
    P.st.objects[it.id] = sv;
    addItem(it);
    var o = P.objs[it.id];
    U.flash(o.inner, 'hop', 650);
    sparkleAt(o.x, o.y - o.h / 2);
    remember(o);
  }

  /** Put an item away (it stays hers and can come back any time). */
  function storeItem(o) {
    if (o.on && P.objs[o.on]) { detachFrom(o, P.objs[o.on]); o.on = null; }
    if (o.el.parentNode) { o.el.parentNode.removeChild(o.el); }
    delete P.objs[o.id];
    P.list = P.list.filter(function (x) { return x !== o; });
    P.st.objects[o.id] = { x: Math.round(o.x), y: Math.round(o.y), on: null, stored: true, room: P.room.id };
    saveSoon();
  }

  /* ---------- rooms, lights, containers ---------- */

  function roomKey(r) { return r || World.rooms(P.loc)[0].id; }

  /** Which room an item is in now (she can move things between rooms). */
  function roomOf(it) {
    var sv = P.st.objects[it.id];
    return (sv && sv.room) || it.room || roomKey();
  }

  function lightsOn() {
    var l = P.st.lights || {};
    return l[P.room.id] !== false;
  }

  function setLights(on) {
    P.st.lights = P.st.lights || {};
    P.st.lights[P.room.id] = on;
    P.dark.style.opacity = String(darkness());
    RA.House.refresh(P.fixtures, houseCtx());
    saveSoon();
  }

  /** Room darkness: lights off, or a dim old lamp even with them on. */
  function darkness() {
    if (!lightsOn()) { return 0.5; }
    return E.roomDim(P.p, P.room.id);
  }

  /** Items sitting in a container (fridge, cabinet). */
  function contentsOf(fxId) {
    return P.list.filter(function (o) { return o.kind === 'item' && o.inFx === fxId; });
  }

  function showContents(fxId, open) {
    contentsOf(fxId).forEach(function (o) { U[open ? 'removeClass' : 'addClass'](o.el, 'in-closed'); });
  }

  function putInContainer(o, fx, slot, quiet) {
    var pos = RA.House.slotPos(fx, slot);
    o.inFx = fx.def.id; o.slot = slot;
    o.x = pos.x; o.y = pos.y;
    setXY(o.el, pos.x - o.w / 2, pos.y - o.h);
    o.el.style.zIndex = String(fx.z + 1);
    U[fx.open ? 'removeClass' : 'addClass'](o.el, 'in-closed');
    if (!quiet) {
      P.st.objects[o.id] = { 'in': fx.def.id, slot: slot, room: P.room.id };
      RA.Sfx.play('pop');
      U.flash(o.inner, 'squish', 500);
      saveSoon();
    }
  }

  function takenSlots(fxId) { return contentsOf(fxId).map(function (o) { return o.slot; }); }

  /** Everything screens/house.js needs from this screen. */
  function houseCtx() {
    return {
      p: P.p, st: P.st, room: P.room, scene: P.view.scene,
      lightsOn: lightsOn,
      toggleLights: function () { setLights(!lightsOn()); },
      roomOpen: function (id) { return E.roomOpen(P.p, World.room(P.loc, id)); },
      goRoom: World.goRoom,
      showContents: showContents,
      contentsCount: function (fxId) { return contentsOf(fxId).length; },
      sparkleAt: sparkleAt,
      reactAt: reactAt,
      closeBubble: closeBubble,
      saveSoon: saveSoon,
      onRetier: function () { if (P && P.dark) { P.dark.style.opacity = String(darkness()); } },
      onFixed: function () {
        // new versions to pick: pulse the wrench's flame badge
        var b = P && U.qs('.house-btn', P.root);
        if (b && !U.qs('.news-badge', b) && E.pickNews(P.p, P.room.id).length) { b.appendChild(newsBadge('pick-news')); }
        if (b) { U.flash(b, 'hop', 650); }
      }
    };
  }

  /* ---------- objects ---------- */

  function saved(id) { return P.st.objects[id]; }

  function addChar(c) {
    var sv = saved(c.id) || {};
    var o = { id: c.id, kind: 'char', def: c, w: CHAR_W, h: CHAR_H, x: sv.x != null ? sv.x : c.x, y: sv.y != null ? sv.y : c.y, held: {} };
    o.el = U.el('div.obj.char' + (c.isPlayer ? '.player' : ''), { style: 'width:' + CHAR_W + 'px;height:' + CHAR_H + 'px', 'data-id': c.id });
    o.inner = U.el('div.obj-inner');
    o.inner.innerHTML = RA.Avatar.svg(c.look || {});
    o.el.appendChild(o.inner);
    o.headSlot = U.el('div.att.att-head');
    o.handSlot = U.el('div.att.att-hand');
    o.el.appendChild(o.headSlot);
    o.el.appendChild(o.handSlot);
    if (!c.isPlayer && hasRequest(c)) { o.el.appendChild(U.el('div.has-request', null, [UI.icon('ui-bubble')])); }
    P.scene = P.view.scene;
    P.view.scene.appendChild(o.el);
    place(o, o.x, o.y);
    draggable(o);
    P.objs[o.id] = o;
    P.list.push(o);
  }

  function addItem(it) {
    var sv = saved(it.id) || {};
    var sz = ART.size(it.sprite);
    var dx = sv.room && sv.room !== (it.room || roomKey());   // moved here from its own room
    var o = { id: it.id, kind: 'item', def: it, w: sz.w, h: sz.h, x: sv.x != null ? sv.x : (dx ? 500 : it.x), y: sv.y != null ? sv.y : (dx ? 575 : it.y), on: sv.on || null };
    o.el = U.el('div.obj.item', { style: 'width:' + sz.w + 'px;height:' + sz.h + 'px', 'data-id': it.id });
    o.inner = U.el('div.obj-inner');
    o.inner.innerHTML = World.itemSvg(it);
    o.el.appendChild(o.inner);
    P.view.scene.appendChild(o.el);
    place(o, o.x, o.y);
    draggable(o);
    P.objs[o.id] = o;
    P.list.push(o);
    if (sv['in'] && P.fixtures[sv['in']]) { putInContainer(o, P.fixtures[sv['in']], sv.slot || 0, true); }
  }

  function place(o, x, y) {
    o.x = x; o.y = y;
    setXY(o.el, x - o.w / 2, y - o.h);
    // rugs and other flat things always lie under everything else
    o.el.style.zIndex = (o.def && o.def.flat) ? '1' : String(Math.round(y));
  }

  function remember(o) {
    var rec = { x: Math.round(o.x), y: Math.round(o.y), on: o.on || null };
    if (o.kind === 'item' && roomOf(o.def) !== (o.def.room || roomKey())) { rec.room = P.room.id; }
    if (o.inFx) { rec = { 'in': o.inFx, slot: o.slot, room: P.room.id }; }
    P.st.objects[o.id] = rec;
    saveSoon();
  }

  /* ---------- wearing & holding ---------- */

  function attach(item, ch, quiet) {
    var slot = item.def.wear === 'head' ? 'head' : 'hand';
    var prev = ch.held[slot];
    if (prev && prev !== item) { detach(prev); landAt(prev, ch.x + (slot === 'head' ? -70 : 70), ch.y); remember(prev); }
    if (item.on && P.objs[item.on] && P.objs[item.on] !== ch) { detachFrom(item, P.objs[item.on]); }
    ch.held[slot] = item;
    item.on = ch.id;
    var host = slot === 'head' ? ch.headSlot : ch.handSlot;
    host.appendChild(item.el);
    var an = anchorsOf(ch);
    var left = (slot === 'head' ? an.head.x : an.hand.x) - item.w / 2;
    var top = slot === 'head' ? an.head.y - item.h : an.hand.y - item.h * 0.6;
    setXY(item.el, left, top);
    item.el.style.zIndex = '1';
    U.addClass(item.el, 'attached');
    if (!quiet) { RA.Sfx.play('pop'); U.flash(ch.inner, 'hop', 600); remember(item); }
  }

  function detachFrom(item, ch) {
    if (ch.held.head === item) { ch.held.head = null; }
    if (ch.held.hand === item) { ch.held.hand = null; }
  }

  function detach(item) {
    var ch = item.on && P.objs[item.on];
    if (ch) {
      detachFrom(item, ch);
      // convert to scene coordinates
      var slot = item.def.wear === 'head' ? anchorsOf(ch).head : anchorsOf(ch).hand;
      item.x = ch.x - CHAR_W / 2 + slot.x;
      item.y = ch.y - CHAR_H + (item.def.wear === 'head' ? slot.y : slot.y + item.h * 0.4);
    }
    item.on = null;
    U.removeClass(item.el, 'attached');
    P.view.scene.appendChild(item.el);
    place(item, item.x, item.y);
  }

  /* ---------- gravity: land on a surface or the floor ---------- */

  function landY(x, y) {
    var room = P.room, floor = room.floor || { y1: 430, y2: 590 }, best = null;
    if (y >= floor.y1) { return Math.min(y, floor.y2); }
    (room.surfaces || []).forEach(function (s) {
      if (x >= s.x1 && x <= s.x2 && s.y >= y - 12 && (best === null || s.y < best)) { best = s.y; }
    });
    return best !== null ? best : floor.y1 + 25;
  }

  function landAt(o, x, y) {
    x = U.clamp(x, o.w / 2, SCENE_W - o.w / 2);
    var ty = landY(x, y);
    var fell = ty - y > 8;
    if (fell) { U.addClass(o.el, 'falling'); setTimeout(function () { U.removeClass(o.el, 'falling'); }, 320); }
    place(o, x, ty);
  }

  /* ---------- drag & tap ---------- */

  function draggable(o) {
    var start = null, grab = null, moved = false, lastTouch = 0, origin = null;
    function down(cx, cy) {
      RA.Audio.unlock();
      var pt = P.view.toScene(cx, cy);
      start = { cx: cx, cy: cy };
      moved = false;
      if (o.kind === 'item' && o.on) {
        origin = { x: P.objs[o.on].x, y: P.objs[o.on].y, on: o.on };
      } else {
        origin = { x: o.x, y: o.y, on: null };
      }
      grab = { dx: 0, dy: 0, pt: pt };
    }
    function move(cx, cy) {
      if (!start) { return; }
      if (!moved && Math.abs(cx - start.cx) + Math.abs(cy - start.cy) < 10) { return; }
      var pt = P.view.toScene(cx, cy);
      if (!moved) {
        moved = true;
        closeBubble();
        if (o.kind === 'item' && o.on) { detach(o); }
        if (o.inFx) { o.inFx = null; o.slot = null; U.removeClass(o.el, 'in-closed'); }   // taken out of the fridge
        grab.dx = o.x - grab.pt.x;
        grab.dy = o.y - grab.pt.y;
        U.addClass(o.el, 'dragging');
        RA.Sfx.play('tap');
      }
      setXY(o.el, pt.x + grab.dx - o.w / 2, pt.y + grab.dy - o.h);
      o.x = pt.x + grab.dx; o.y = pt.y + grab.dy;
      o.el.style.zIndex = '5000';
    }
    function up(cx, cy) {
      if (!start) { return; }
      start = null;
      if (!moved) { tapObj(o); return; }
      U.removeClass(o.el, 'dragging');
      drop(o, P.view.toScene(cx, cy), origin);
    }
    o.el.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { return; }
      e.stopPropagation();
      var t = e.touches[0]; down(t.clientX, t.clientY);
    }, false);
    o.el.addEventListener('touchmove', function (e) {
      if (!start) { return; }
      e.preventDefault(); e.stopPropagation();
      var t = e.touches[0]; move(t.clientX, t.clientY);
    }, false);
    o.el.addEventListener('touchend', function (e) {
      if (!start) { return; }
      e.preventDefault(); e.stopPropagation();
      lastTouch = Date.now();
      var t = e.changedTouches[0]; up(t.clientX, t.clientY);
    }, false);
    o.el.addEventListener('touchcancel', function () {
      if (!start) { return; }
      start = null;
      if (!moved) { return; }            // nothing moved (e.g. still worn): leave it where it is
      U.removeClass(o.el, 'dragging'); landAt(o, o.x, o.y); remember(o);
    }, false);
    // mouse (desktop testing)
    o.el.addEventListener('mousedown', function (e) {
      if (Date.now() - lastTouch < 800) { return; }
      e.preventDefault(); e.stopPropagation();
      down(e.clientX, e.clientY);
      function mm(ev) { move(ev.clientX, ev.clientY); }
      function mu(ev) { w.removeEventListener('mousemove', mm, false); w.removeEventListener('mouseup', mu, false); up(ev.clientX, ev.clientY); }
      w.addEventListener('mousemove', mm, false);
      w.addEventListener('mouseup', mu, false);
    }, false);
  }

  function charAt(pt, except) {
    var i, o;
    for (i = 0; i < P.list.length; i++) {
      o = P.list[i];
      if (o.kind !== 'char' || o === except) { continue; }
      if (pt.x > o.x - 55 && pt.x < o.x + 55 && pt.y > o.y - CHAR_H && pt.y < o.y) { return o; }
    }
    return null;
  }

  function drop(o, pt, origin) {
    if (o.kind === 'item') {
      var ch = charAt(pt, null);
      if (ch) {
        var req = ch.def.isPlayer ? null : activeRequest(ch.def);
        if (req) {
          if (U.contains(req.wants, o.def.id)) { completeRequest(ch, req, o); return; }
          bounceBack(o, origin); return;           // gentle: not what she asked for
        }
        if (o.def.wear) { attach(o, ch); return; }
      }
      // into an open fridge or cupboard?
      var tgt = RA.House.dropTarget(P.fixtures, pt, o.def, takenSlots);
      if (tgt && tgt.fx) { putInContainer(o, tgt.fx, tgt.slot); return; }
      if (tgt && tgt.refuse) { bounceBack(o, origin); return; }
    }
    landAt(o, o.x, o.y);
    RA.Sfx.play(o.kind === 'char' ? 'soft' : 'pop');
    remember(o);
  }

  function bounceBack(o, origin) {
    RA.Sfx.play('boing');
    U.addClass(o.el, 'falling');
    if (origin.on && P.objs[origin.on]) { setTimeout(function () { U.removeClass(o.el, 'falling'); attach(o, P.objs[origin.on], true); remember(o); }, 10); return; }
    place(o, origin.x, origin.y);
    setTimeout(function () { U.removeClass(o.el, 'falling'); U.flash(o.inner, 'wiggle', 500); }, 320);
    remember(o);
  }

  function tapObj(o) {
    closeBubble();
    if (o.kind === 'item') {
      var it = o.def;
      if (it.light) { setLights(!lightsOn()); RA.Sfx.play('click'); } else { RA.Sfx.play(it.sfx || 'pop'); }
      U.flash(o.inner, it.fx || 'hop', 650);
      if (it.label) {
        A.text(it.label);
        if (E.canRead(P.p, it.label)) { showTag(o, it.label); }
      }
      return;
    }
    // characters
    U.flash(o.inner, 'hop', 650);
    if (o.def.isPlayer) { RA.Sfx.play('boing'); sparkleAt(o.x, o.y - CHAR_H); return; }
    RA.Sfx.play('pop');
    var req = activeRequest(o.def);
    if (req) { showBubble(o, req.text, true); return; }
    if (o.def.name && E.canRead(P.p, o.def.name)) { showBubble(o, o.def.name, false); A.text(o.def.name); }
  }

  /* ---------- requests ("Get the red hat.") ---------- */

  function requestsFor(c) {
    var p = P.p, lvl = E.level(p);
    return (E.world().requests || []).filter(function (r) {
      if (r.character !== c.id || (r.minLesson || 0) > lvl) { return false; }
      if (!E.canRead(p, r.text)) { return false; }
      for (var i = 0; i < r.wants.length; i++) {
        var it = World.item(r.wants[i]);
        if (!it || it.location !== P.loc.id || !E.isUnlocked(p, 'item:' + it.id) || roomOf(it) !== P.room.id) { return false; }
        var svq = P.st.objects[it.id];
        if (svq && svq.stored) { return false; }
      }
      return true;
    });
  }

  function hasRequest(c) { return !!activeRequest(c); }

  function activeRequest(c) {
    if (!P) { return null; }
    var rs = requestsFor(c), done = P.p.requestsDone || {};
    var open = rs.filter(function (r) { return !done[r.id]; });
    if (open.length) { return open[0]; }
    if (!rs.length) { return null; }
    // everything done: keep asking, cycling, so play stays lively
    P.cycle = P.cycle || {};
    if (!P.cycle[c.id]) { P.cycle[c.id] = U.pick(rs); }
    return P.cycle[c.id];
  }

  function completeRequest(ch, req, item) {
    var p = P.p;
    p.requestsDone = p.requestsDone || {};
    p.requestsDone[req.id] = (p.requestsDone[req.id] || 0) + 1;
    if (P.cycle) { P.cycle[ch.id] = null; }
    if (item.def.wear) { attach(item, ch); }
    else { landAt(item, ch.x + 70, ch.y); remember(item); }
    RA.Sfx.play('chime');
    sparkleAt(ch.x, ch.y - CHAR_H + 20);
    // happy face for a moment
    var look = U.clone(ch.def.look || {});
    look.face = 'grin';
    ch.inner.innerHTML = RA.Avatar.svg(look);
    U.flash(ch.inner, 'hop', 650);
    setTimeout(function () { if (ch.inner) { ch.inner.innerHTML = RA.Avatar.svg(ch.def.look || {}); } }, 1800);
    if (req.thanks && E.canRead(p, req.thanks)) { showBubble(ch, req.thanks, false); A.text(req.thanks); }
    else { A.line('thanks'); }
    var badge = U.qs('.has-request', ch.el);
    if (badge && !activeRequest(ch.def)) { badge.parentNode.removeChild(badge); }
    saveSoon();
  }

  /* ---------- bubbles, tags, sparkles ---------- */

  function showBubble(o, text, withSpeaker) {
    closeBubble();
    var b = U.el('div.bubble');
    b.appendChild(UI.readLine(text, 'bubble-text'));
    if (withSpeaker) { b.appendChild(UI.btn('ui-speaker', '', function () { A.text(text); }, 'tiny-btn')); }
    var left = U.clamp(o.x - 170, 10, SCENE_W - 350);
    b.style.left = left + 'px';
    b.style.top = '0px';
    P.view.scene.appendChild(b);
    // sit just above the head; the tail points at the character
    var top = Math.max(8, o.y - CHAR_H - b.offsetHeight - 16);
    b.style.top = top + 'px';
    b.appendChild(U.el('div.bubble-tail', { style: 'left:' + U.clamp(o.x - left - 12, 20, 296) + 'px' }));
    P.bubble = b;
  }

  function closeBubble() {
    if (P && P.bubble && P.bubble.parentNode) { P.bubble.parentNode.removeChild(P.bubble); }
    if (P) { P.bubble = null; }
  }

  function showTag(o, text) {
    if (P.tag && P.tag.parentNode) { P.tag.parentNode.removeChild(P.tag); }
    var t = U.el('div.tag');
    t.appendChild(UI.readLine(text, 'tag-text'));
    var x = o.on && P.objs[o.on] ? P.objs[o.on].x : o.x;
    var y = o.on && P.objs[o.on] ? P.objs[o.on].y - CHAR_H : o.y - o.h;
    t.style.left = (x - 80) + 'px';
    t.style.top = Math.max(4, y - 64) + 'px';
    P.view.scene.appendChild(t);
    P.tag = t;
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 2600);
  }

  /** A little reaction bubble over a fixture ("stuck!"): the word only if she can read it. */
  function reactAt(x, y, text) {
    closeBubble();
    var b = U.el('div.bubble.react');
    if (E.canRead(P.p, text)) { b.appendChild(UI.readLine(text, 'bubble-text')); }
    else { b.appendChild(UI.icon('ui-lock', 'react-icon')); }
    var left = U.clamp(x - 70, 10, SCENE_W - 150);
    b.style.left = left + 'px';
    b.style.top = Math.max(8, y - 96) + 'px';
    b.appendChild(U.el('div.bubble-tail', { style: 'left:' + U.clamp(x - left - 12, 20, 110) + 'px' }));
    P.view.scene.appendChild(b);
    P.bubble = b;
    setTimeout(function () { if (P && P.bubble === b) { closeBubble(); } }, 1600);
  }

  function sparkleAt(x, y) {
    var d = U.el('div.scene-burst', { style: 'left:' + x + 'px;top:' + y + 'px' });
    for (var i = 0; i < 6; i++) { var s = U.el('span.burst-dot.d' + i); s.appendChild(UI.icon('ui-sparkle')); d.appendChild(s); }
    P.view.scene.appendChild(d);
    setTimeout(function () { if (d.parentNode) { d.parentNode.removeChild(d); } }, 900);
  }
})(window);
