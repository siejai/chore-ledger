/* Lit Town — interactive house fixtures (ES5).
 *
 * A fixture is a stack of SVG layers that share one box (see docs/ART_BRIEF.md, "The house").
 * Moving parts are separate layers; we only ever change CSS transform/opacity on their
 * wrappers. Anything that keeps running (water, TV static, bubbles, a flush) goes through
 * RA.Anim, which caps how many run at once and stops them all when she leaves the room.
 *
 * Types: container (fridge, cabinet), sink, toilet, tub, switch, tv, shelf, door, bed, lamp, deco,
 * wordshelf (her tricky-words shelf: the words she has mastered in lessons, tap to hear them all),
 * desk (her writing desk: the marker board, chalkboard and paper on it open the writing screen;
 * a badge shows when letters are waiting in her pile).
 * Used by screens/world.js, which owns the room, the items and dragging.
 *
 * Her house gets fixed up over time (world.json "house.chains", Engine "her house"): a layer's sprite
 * comes from the version of that thing in use (junk, fixed, deluxe, premium), so the same fixture can be
 * redrawn in place when she switches versions, and a free fix-up plays a little before-and-after.
 */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, E = RA.Engine, A = RA.Audio, ART = w.ART;

  var House = RA.House = {};

  function layer(cls, spriteId) {
    var d = U.el('div.fx-layer.' + cls);
    d.innerHTML = ART.svg(spriteId) || '';
    return d;
  }

  /** The sprite a fixture part shows now: the house version in use, or the fixture's own part. */
  function partSprite(def, part, dflt, ctx) {
    var a = ctx && ctx.p ? E.partArt(ctx.p, def.id, part, !!ctx.showJunk) : undefined;
    return a === undefined ? dflt : a;
  }

  /** A layer that follows the house version in use (redrawn by House.retier). */
  function tierLayer(f, cls, part, dflt, ctx) {
    var id = partSprite(f.def, part, dflt, ctx), d = layer(cls, id);
    f.layers = f.layers || {};
    f.layers[part] = { el: d, dflt: dflt, id: id };
    if (id === '') { d.style.display = 'none'; }
    d.setAttribute('data-sprite', id || '');
    return d;
  }

  function size(def, ctx) {
    var base = def.parts && def.parts.base;
    return ART.size(partSprite(def, 'base', base, ctx) || base);
  }

  /** Build every fixture of a room. ctx = the world screen's helpers (see world.js). */
  House.build = function (ctx) {
    var out = {};
    (ctx.room.fixtures || []).forEach(function (def) {
      if (!def.parts || !ART.has(partSprite(def, 'base', def.parts.base, ctx) || def.parts.base)) { return; }
      var f = make(def, ctx);
      out[def.id] = f;
    });
    return out;
  };

  function make(def, ctx) {
    var sz = size(def, ctx);
    var f = { def: def, w: sz.w, h: sz.h, x: def.x, y: def.y, open: false, on: false, layers: {} };
    f.left = def.x - sz.w / 2;
    f.top = def.y - sz.h;
    // against the wall: behind things standing on the floor; small wall switches sit in front of
    // big fixtures (the deck door) so their tap area always wins
    f.z = def.z != null ? def.z : (def.type === 'switch' ? 320 : 300);
    f.el = U.el('div.fx.fx-' + def.type, { 'data-fx': def.id, style: 'width:' + sz.w + 'px;height:' + sz.h + 'px;z-index:' + f.z });
    var t = 'translate3d(' + Math.round(f.left) + 'px,' + Math.round(f.top) + 'px,0)';
    f.el.style.webkitTransform = t; f.el.style.transform = t;
    f.el.appendChild(tierLayer(f, 'fx-base', 'base', def.parts.base, ctx));
    var P = def.parts;

    if (def.type === 'container') {
      f.doors = (P.doors || []).map(function (d, di) {
        var dl = tierLayer(f, 'fx-door', 'door' + di, d.part, ctx);
        dl.style.webkitTransformOrigin = dl.style.transformOrigin = (d.hinge === 'right' ? '100%' : '0%') + ' 50%';
        f.el.appendChild(dl);
        return dl;
      });
      // an oven: a warm glow over the shut door while something bakes
      if (P.glow) { f.glow = layer('fx-oven-glow', P.glow); f.el.appendChild(f.glow); }
    }
    if (def.type === 'sink' || def.type === 'tub') {
      var sx = def.spout[0] * sz.w, sy = def.spout[1] * sz.h, by = def.basin * sz.h;
      var water = U.el('div.fx-water', { style: 'left:' + Math.round(sx - 6) + 'px;top:' + Math.round(sy) + 'px;width:12px;height:' + Math.max(8, Math.round(by - sy)) + 'px' });
      var stream = U.el('div.fx-stream');
      stream.innerHTML = ART.svg('fx-water-stream');
      water.appendChild(stream);
      for (var i = 0; i < 3; i++) {
        var drop = U.el('div.fx-drop.d' + i);
        drop.appendChild(U.el('div.fx-drop-pic', { html: ART.svg('fx-water-drop') }));
        water.appendChild(drop);
      }
      f.el.appendChild(water);
    }
    if (def.type === 'toilet' || def.type === 'tub') {
      if (P.grime) { f.el.appendChild(layer('fx-grime', P.grime)); f.grimePart = P.grime; }
    }
    if (def.type === 'toilet' && P.swirl && def.swirl) {
      var sw = def.swirl.w * sz.w;
      var pos = U.el('div.fx-swirl-pos', { style: 'left:' + Math.round(def.swirl.at[0] * sz.w - sw / 2) + 'px;top:' + Math.round(def.swirl.at[1] * sz.h - sw / 2) + 'px;width:' + Math.round(sw) + 'px;height:' + Math.round(sw) + 'px' });
      var squash = U.el('div.fx-swirl-squash');
      var spin = U.el('div.fx-swirl-spin');
      spin.innerHTML = ART.svg(P.swirl);
      squash.appendChild(spin); pos.appendChild(squash); f.el.appendChild(pos);
    }
    if (def.type === 'tub' && def.bubbles) {
      var bx1 = def.bubbles[0] * sz.w, bx2 = def.bubbles[1] * sz.w, bby = def.bubbles[2] * sz.h;
      for (var b = 0; b < 6; b++) {
        var bub = U.el('div.fx-bubble.b' + b, { style: 'left:' + Math.round(bx1 + (bx2 - bx1) * (b / 5) - 11) + 'px;top:' + Math.round(bby - 22) + 'px' });
        bub.innerHTML = ART.svg('fx-bubble');
        f.el.appendChild(bub);
      }
    }
    if (def.type === 'switch') { f.toggle = layer('fx-toggle', P.toggle); f.el.appendChild(f.toggle); }
    if (def.type === 'tv') {
      f.el.appendChild(layer('fx-tv-on', P.on));
      (P.static || []).forEach(function (id, i) { f.el.appendChild(layer('fx-static.s' + i, id)); });
    }
    if (def.type === 'shelf') {
      f.book = layer('fx-book', P.book);
      var pv = def.pivot || [0.5, 1];
      f.book.style.webkitTransformOrigin = f.book.style.transformOrigin = Math.round(pv[0] * 100) + '% ' + Math.round(pv[1] * 100) + '%';
      f.el.appendChild(f.book);
    }
    if (def.type === 'door') { f.panel = layer('fx-panel', P.panel); f.el.appendChild(f.panel); }
    if (def.type === 'bed' && P.bedding) { f.el.appendChild(tierLayer(f, 'fx-bedding', 'bedding', P.bedding, ctx)); }
    if (def.type === 'lamp' && P.glow) { f.el.appendChild(tierLayer(f, 'fx-glow', 'glow', P.glow, ctx)); }
    if (def.type === 'wordshelf') { f.words = U.el('div.fx-words'); f.el.appendChild(f.words); }
    if (def.type === 'desk') {
      if (P.things) { f.el.appendChild(layer('fx-things', P.things)); }
      // the marker board, chalkboard and paper: each opens the writing screen with its own look
      Object.keys(def.zones || {}).forEach(function (look) {
        var z = def.zones[look];
        var zone = U.el('div.fx-zone', { 'data-zone': look, style: 'left:' + Math.round(z[0] * 100) + '%;top:' + Math.round(z[1] * 100) + '%;width:' + Math.round((z[2] - z[0]) * 100) + '%;height:' + Math.round((z[3] - z[1]) * 100) + '%' });
        U.tap(zone, function (e) { if (e && e.stopPropagation) { e.stopPropagation(); } RA.Audio.unlock(); openDesk(f, look); });
        f.el.appendChild(zone);
      });
      f.badge = U.el('div.fx-badge.hidden');
      f.el.appendChild(f.badge);
    }

    // everything inside one body, so a wiggle or hop never fights the position transform on f.el
    f.body = U.el('div.fx-body');
    while (f.el.firstChild) { f.body.appendChild(f.el.firstChild); }
    f.el.appendChild(f.body);
    if (def.type === 'container') { U.addClass(f.el, 'closed'); }
    U.tap(f.el, function () { RA.Audio.unlock(); tap(f, ctx); });
    ctx.scene.appendChild(f.el);
    refresh(f, ctx);
    return f;
  }

  /** Bring a fixture's look in line with saved state (fixed or grimy, switch, door). */
  function refresh(f, ctx) {
    var d = f.def;
    if (d.type === 'toilet' || d.type === 'tub') {
      // grimy while the toilet-and-tub chain is on its junk version ('' = no grime)
      var g = partSprite(d, 'grime', f.grimePart || '', ctx);
      f.fixed = !g;
      U[f.fixed ? 'removeClass' : 'addClass'](f.el, 'grimy');
    }
    if (d.type === 'lamp') { U[ctx.lightsOn() ? 'removeClass' : 'addClass'](f.el, 'off'); }
    if (d.type === 'wordshelf') { fillShelf(f, ctx); }
    if (d.type === 'desk') {
      var waiting = E.backlog(ctx.p).length;
      f.badge.textContent = waiting ? String(waiting) : '';
      U[waiting ? 'removeClass' : 'addClass'](f.badge, 'hidden');
    }
    if (d.type === 'switch') {
      var on = ctx.lightsOn();
      U[on ? 'removeClass' : 'addClass'](f.el, 'off');
      var dy = on ? 0 : Math.round((d['throw'] || 14) * 0.5);
      f.toggle.style.webkitTransform = f.toggle.style.transform = 'translate3d(0,' + dy + 'px,0)';
    }
    if (d.type === 'door') {
      var open = ctx.roomOpen(d.opens) && ctx.st.doorOpened;
      setDoor(f, open, false);
    }
  }
  /** Her tricky-words shelf: the words she has mastered stand on the planks (newest last). */
  function fillShelf(f, ctx) {
    var d = f.def, rows = d.rows || [0.5, 1], per = d.perRow || 5;
    var words = E.masteredSight(ctx.p), shown = words.slice(-rows.length * per);
    U.clear(f.words);
    rows.forEach(function (ry, r) {
      var row = U.el('div.fx-word-row', { style: 'top:' + Math.round(ry * 100) + '%' });
      shown.slice(r * per, r * per + per).forEach(function (wd) { row.appendChild(U.el('span.fx-word', { text: wd })); });
      f.words.appendChild(row);
    });
    U[words.length ? 'removeClass' : 'addClass'](f.el, 'empty');
  }

  function openDesk(f, look) {
    U.flash(f.body || f.el, 'wiggle', 400);
    RA.Sfx.play('pop');
    UI.go('desk', look);
  }

  /** Tapping the shelf: every tricky word she has mastered, big, to tap and hear. */
  function openShelf(f, ctx) {
    var words = E.masteredSight(ctx.p);
    var body = U.el('div.shelf-words');
    words.forEach(function (wd) {
      var b = U.el('button.shelf-word', { type: 'button', text: wd });
      U.tap(b, function () { A.word(wd); U.flash(b, 'pulse', 400); });
      body.appendChild(b);
    });
    if (!words.length) { body.appendChild(U.el('div.shelf-empty', { html: ART.svg('fx-wordshelf') })); }
    UI.modal('My tricky words', body, [{ label: 'OK', cls: 'good' }]);
    A.line(words.length ? 'tricky-shelf' : 'tricky-shelf-empty');
  }

  House.refresh = function (fixtures, ctx) { for (var k in fixtures) { if (fixtures.hasOwnProperty(k)) { refresh(fixtures[k], ctx); } } };

  /** Redraw every layer that follows a house version (after she switches or buys one). */
  House.retier = function (fixtures, ctx, onlyChain) {
    var k, f, part, L, id;
    for (k in fixtures) {
      if (!fixtures.hasOwnProperty(k)) { continue; }
      f = fixtures[k];
      for (part in f.layers) {
        if (!f.layers.hasOwnProperty(part)) { continue; }
        if (onlyChain && E.chainFor(f.def.id, part) !== onlyChain) { continue; }
        L = f.layers[part];
        id = partSprite(f.def, part, L.dflt, ctx);
        if (id === L.id) { continue; }
        L.id = id;
        L.el.innerHTML = ART.svg(id) || '';
        L.el.style.display = id === '' ? 'none' : '';
        L.el.setAttribute('data-sprite', id || '');
      }
      refresh(f, ctx);
    }
  };

  /** Fixtures drawn by a chain (to point at them: sparkles, the version picker). */
  House.fixturesOf = function (fixtures, ch) {
    var out = [], k, part;
    for (k in fixtures) {
      if (!fixtures.hasOwnProperty(k)) { continue; }
      for (part in fixtures[k].layers) { if (fixtures[k].layers.hasOwnProperty(part) && E.chainFor(k, part) === ch) { out.push(fixtures[k]); break; } }
      if (fixtures[k].grimePart && E.chainFor(k, 'grime') === ch && out.indexOf(fixtures[k]) < 0) { out.push(fixtures[k]); }
    }
    return out;
  };

  /** Free fix-ups that reached their lesson: show the old junk version, then a quick before-and-after.
   *  Called once the room is built (fixtures were drawn with ctx.showJunk). One after another. */
  House.revealDue = function (fixtures, ctx, room) {
    var due = E.roomChains(room.id).filter(function (ch) { return E.revealDue(ctx.p, ch); }), at = 900;
    due.forEach(function (ch) {
      E.markRevealed(ctx.p, ch.id);
      var fxs = House.fixturesOf(fixtures, ch);
      U.later(function () {
        if (!fxs.length || !fxs[0].el.parentNode) { return; }
        fxs.forEach(function (f) { U.flash(f.body || f.el, 'wiggle', 600); });
        RA.Sfx.play('rattle');
        setTimeout(function () {
          if (!fxs[0].el.parentNode) { return; }
          House.retier(fixtures, { p: ctx.p, showJunk: false, lightsOn: ctx.lightsOn, roomOpen: ctx.roomOpen, st: ctx.st }, ch);
          if (ctx.onRetier) { ctx.onRetier(); }
          fxs.forEach(function (f) { U.flash(f.body || f.el, 'hop', 650); ctx.sparkleAt(f.x, f.top + f.h / 2); });
          RA.Sfx.play('chime');
          setTimeout(function () { RA.Sfx.play('sparkle'); }, 350);
          A.line('fixed', function () { setTimeout(function () { if (fxs[0].el.parentNode) { A.line('new-to-pick'); } }, 300); });
          if (ctx.onFixed) { ctx.onFixed(ch); }
        }, 650);
      }, at);
      at += 2400;
    });
    if (due.length) { ctx.saveSoon(); }
    return due.length;
  };

  function setDoor(f, open, animate) {
    f.open = open;
    var dx = open ? Math.round((f.def.slide || -0.42) * f.w) : 0;
    U[animate ? 'addClass' : 'removeClass'](f.panel, 'sliding');
    f.panel.style.webkitTransform = f.panel.style.transform = 'translate3d(' + dx + 'px,0,0)';
    U[open ? 'addClass' : 'removeClass'](f.el, 'open');
  }

  /** The deck door slides open the first time she comes in after reaching its milestone. */
  House.openDoorsIfDue = function (fixtures, ctx) {
    var k, f;
    for (k in fixtures) {
      if (!fixtures.hasOwnProperty(k)) { continue; }
      f = fixtures[k];
      if (f.def.type === 'door' && !f.open && ctx.roomOpen(f.def.opens) && !ctx.st.doorOpened) {
        (function (f) {
          setTimeout(function () {
            if (!f.el.parentNode) { return; }
            ctx.st.doorOpened = true;
            setDoor(f, true, true);
            RA.Sfx.play('slide');
            setTimeout(function () { RA.Sfx.play('sparkle'); ctx.sparkleAt(f.x, f.top + f.h / 2); A.line('door-open'); }, 900);
            ctx.saveSoon();
          }, 700);
        })(f);
      }
    }
  };

  /* ---------- taps ---------- */

  function tap(f, ctx) {
    var d = f.def;
    ctx.closeBubble();
    switch (d.type) {
      case 'container': toggleContainer(f, ctx); break;
      case 'sink': runWater(f, ctx, 'water', 3500); break;
      case 'toilet':
        if (!f.fixed) { notYet(f); break; }
        flush(f, ctx);
        break;
      case 'tub':
        if (!f.fixed) { notYet(f); break; }
        runWater(f, ctx, 'shower', 6000);
        break;
      case 'bed':
        U.flash(f.body || f.el, 'squish', 500);
        RA.Sfx.play(E.partArt(ctx.p, d.id, 'base', false) === (d.parts || {}).base ? 'rattle' : 'boing');
        break;
      case 'lamp': ctx.toggleLights(); RA.Sfx.play('click'); break;
      case 'deco':
        U.flash(f.body || f.el, 'wiggle', 500);
        RA.Sfx.play('soft');
        if (d.say && E.canRead(ctx.p, d.say)) { A.text(d.say); }
        break;
      case 'switch': ctx.toggleLights(); RA.Sfx.play('click'); break;
      case 'tv': toggleTv(f, ctx); break;
      case 'desk': openDesk(f, 'paper'); break;
      case 'wordshelf':
        U.flash(f.body || f.el, 'wiggle', 500);
        RA.Sfx.play('pop');
        openShelf(f, ctx);
        break;
      case 'shelf':
        U.flash(f.book, 'tilt', 950);
        RA.Sfx.play('soft');
        if (d.say) { A.text(d.say); }
        break;
      case 'door':
        if (f.open) { RA.Sfx.play('whoosh'); ctx.goRoom(d.opens); break; }
        // jammed: shake, rattle, "stuck!"
        U.flash(f.panel, 'shake', 600);
        RA.Sfx.play('rattle');
        ctx.reactAt(f.x, f.top, 'stuck!');
        A.line('stuck');
        break;
    }
  }

  function toggleContainer(f, ctx) {
    f.open = !f.open;
    U[f.open ? 'addClass' : 'removeClass'](f.el, 'open');
    U[f.open ? 'removeClass' : 'addClass'](f.el, 'closed');
    RA.Sfx.play(f.open ? 'click' : 'soft');
    ctx.showContents(f.def.id, f.open);
    if (f.def.bake) {
      if (f.open) { RA.Anim.stop('bake:' + f.def.id); } else if (ctx.contentsCount(f.def.id) > 0) { bake(f, ctx); }
    }
  }

  /** The bakery oven: shut the door on something and it glows, then dings when it's done.
   *  Opening the door, leaving the room or another animation starting cuts it short (no ding). */
  function bake(f, ctx) {
    var id = 'bake:' + f.def.id, run = { done: false };
    RA.Anim.run(id, function () {
      U.addClass(f.el, 'baking');
      RA.Sfx.play('whoosh');
    }, function () {
      U.removeClass(f.el, 'baking');
      if (!run.done || !f.el.parentNode) { return; }
      RA.Sfx.play('ding');
      U.flash(f.el, 'hop', 650);
      ctx.sparkleAt(f.x, f.top + f.h / 2);
      if (f.def.say && E.canRead(ctx.p, f.def.say)) { setTimeout(function () { A.text(f.def.say); }, 400); }
    });
    f.bakeRun = run;
    setTimeout(function () {
      if (f.bakeRun === run && RA.Anim.isRunning(id)) { run.done = true; RA.Anim.stop(id); }
    }, f.def.bakeMs || 3000);
  }

  House.baking = function (fixtures, fxId) { var f = fixtures[fxId]; return !!(f && f.el && /(^|\s)baking(\s|$)/.test(f.el.className)); };

  function runWater(f, ctx, sound, ms) {
    var id = 'water:' + ctx.room.id + ':' + f.def.id;
    if (RA.Anim.isRunning(id)) { RA.Anim.stop(id); return; }
    var loop = null, pops = null;
    RA.Anim.run(id, function () {
      U.addClass(f.el, 'running');
      loop = RA.Sfx.loop(sound);
      if (f.def.type === 'tub') { pops = setInterval(function () { RA.Sfx.play('bubble'); }, 420); }
    }, function () {
      U.removeClass(f.el, 'running');
      if (loop) { loop.stop(); }
      if (pops) { clearInterval(pops); }
    }, ms);
  }

  function flush(f, ctx) {
    var id = 'flush:' + f.def.id;
    if (RA.Anim.isRunning(id)) { return; }
    RA.Anim.run(id, function () {
      U.addClass(f.el, 'flushing');
      RA.Sfx.play('flush');
    }, function () { U.removeClass(f.el, 'flushing'); }, 1900);
  }

  function toggleTv(f, ctx) {
    var id = 'tv:' + f.def.id;
    if (RA.Anim.isRunning(id)) { RA.Anim.stop(id); RA.Sfx.play('click'); return; }
    var loop = null;
    RA.Sfx.play('click');
    RA.Anim.run(id, function () {
      U.addClass(f.el, 'on');
      loop = RA.Sfx.loop('static');
    }, function () {
      U.removeClass(f.el, 'on');
      if (loop) { loop.stop(); }
    }, 30000);   // the TV turns itself off after a while
  }

  /** Still junky (the toilet and tub get fixed at their lesson): a wiggle and "keep reading". */
  function notYet(f) {
    U.flash(f.body || f.el, 'wiggle', 500);
    RA.Sfx.play('soft');
    A.line('keep-fixing');
  }

  /* ---------- containers: where things can be dropped inside ---------- */

  /** Open container under a scene point with a free slot for this item, or null. */
  House.dropTarget = function (fixtures, pt, item, taken) {
    var k, f;
    for (k in fixtures) {
      if (!fixtures.hasOwnProperty(k)) { continue; }
      f = fixtures[k];
      if (f.def.type !== 'container' || !f.open) { continue; }
      if (pt.x < f.left || pt.x > f.left + f.w || pt.y < f.top || pt.y > f.top + f.h) { continue; }
      if (f.def.accepts && (item.tags || []).indexOf(f.def.accepts) < 0) { return { refuse: true }; }
      var used = taken(f.def.id), slots = f.def.slots || [], i;
      for (i = 0; i < Math.min(slots.length, f.def.capacity || slots.length); i++) {
        if (used.indexOf(i) < 0) { return { fx: f, slot: i }; }
      }
      return { refuse: true };   // full
    }
    return null;
  };

  /** Scene position (bottom-centre) of a slot inside a container. */
  House.slotPos = function (f, slot) {
    var s = (f.def.slots || [])[slot] || [0.5, 0.9];
    return { x: f.left + s[0] * f.w, y: f.top + s[1] * f.h };
  };
})(window);
