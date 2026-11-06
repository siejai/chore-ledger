/* Lit Town — the shop: spend flames on hairstyles, clothes and things for her house (ES5).
 * Tabs and prices come from world.json ("shop", and "cost" on outfits and items).
 * Places are lit from the town map, not here. Nothing here can be lost or taken away. */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, E = RA.Engine, A = RA.Audio;
  var ART = w.ART;

  var TAB_ICONS = { hair: 'ui-hanger', clothes: 'ui-hanger', home: 'ui-decor' };
  var TAB_LABELS = { hair: 'Hair', clothes: 'Clothes', home: 'Home' };
  var LOOK_KEY = { hair: 'hairStyle', top: 'top', bot: 'bot', shoes: 'shoes', acc: 'acc' };

  function tabs() {
    var t = (E.world().shop && E.world().shop.tabs) || [
      { id: 'hair', slots: ['hair'] }, { id: 'clothes', slots: ['top', 'bot', 'shoes', 'acc'] }, { id: 'home', location: 'home' }
    ];
    return t;
  }

  /** Picture for a catalog entry: her own character wearing it, or the item itself. */
  function art(entry, p, big) {
    var d = U.el('div.shop-art' + (big ? '.big' : ''));
    if (entry.kind === 'outfit') {
      var look = U.clone(p.look || {});
      look[LOOK_KEY[entry.slot]] = entry.ref.part;
      d.appendChild(UI.avatar(look, 'shop-av shop-av-' + entry.slot));
    } else if (entry.kind === 'upgrade') {
      // a version of something in her house (deluxe, premium), with a wrench badge
      d.innerHTML = ART.svg(upgradeArt(entry));
      U.addClass(d, 'upgrade-art');
      d.appendChild(UI.icon(entry.ref.comingSoon ? 'ui-lock' : 'ui-fix', 'upgrade-badge'));
    } else if (entry.kind === 'item') {
      d.innerHTML = RA.World.itemSvg(entry.ref);
    }
    return d;
  }

  S.shop = {
    show: function (root, tabId) {
      var p = RA.state.profile;
      var list = tabs();
      var tab = list[0], i;
      for (i = 0; i < list.length; i++) { if (list[i].id === tabId) { tab = list[i]; } }

      var top = U.el('div.topbar');
      top.appendChild(UI.btn('ui-back', '', function () { UI.go('kid', null, true); }, 'small'));
      top.appendChild(UI.icon('ui-shop', 'shop-title-icon'));
      var tabRow = U.el('div.shop-tabs');
      list.forEach(function (t) {
        var b = U.el('button.shop-tab' + (t === tab ? '.on' : ''), { type: 'button' });
        b.appendChild(UI.icon(TAB_ICONS[t.id] || 'ui-shop'));
        b.appendChild(U.el('span', { text: TAB_LABELS[t.id] || t.id }));
        U.tap(b, function () { RA.Sfx.play('tap'); UI.go('shop', t.id, true); });
        tabRow.appendChild(b);
      });
      top.appendChild(tabRow);
      top.appendChild(UI.flameCount(p));
      root.appendChild(top);

      var grid = U.el('div.shop-grid');
      root.appendChild(grid);

      // things for a place need that place's art pack; load it first
      var loc = tab.location ? RA.World.location(tab.location) : null;
      RA.World.ensurePacks(RA.World.packsOf(loc), function () {
        if (UI.currentName() !== 'shop') { return; }
        // things for places she hasn't lit yet are not on sale yet
        E.shopList(p, tab).filter(function (e) {
          // a word item joins the shop once she has written its word in a lesson
          if (e.kind === 'item') { return E.isUnlocked(p, 'loc:' + e.location) && ART.has(e.ref.sprite) && E.canBuy(p, e.key) !== 'write'; }
          if (e.kind === 'outfit') { return !!ART.part(e.slot, e.ref.part); }
          // house versions go on sale only once that thing has been fixed up in front of her (and is drawn)
          if (e.kind === 'upgrade') { return E.isUnlocked(p, 'loc:' + e.location) && !e.ref.comingSoon && E.chainFixed(p, e.ref.chain) && ART.has(upgradeArt(e)); }
          return false;
        }).forEach(function (e) { grid.appendChild(card(e, p, tab)); });
      });
      U.later(function () { A.line('shop-hello'); }, 300);
    }
  };

  /** The picture for a house version (its main sprite). */
  function upgradeArt(e) { return e.ref.art || ''; }

  function card(e, p, tab) {
    var owned = E.isUnlocked(p, e.key);
    var why = E.canBuy(p, e.key);
    var afford = !owned && why === 'ok';
    var c = U.el('button.shop-card' + (owned ? '.owned' : '') + (afford ? '.afford' : ''), { type: 'button', 'data-key': e.key });
    c.appendChild(art(e, p));
    if (owned) {
      c.appendChild(U.el('div.shop-owned', null, [UI.icon('ui-check')]));
    } else if (why === 'soon') {
      U.addClass(c, 'soon');
      c.appendChild(U.el('div.shop-owned', null, [UI.icon('ui-lock')]));
    } else {
      c.appendChild(UI.price(e.cost, afford ? '' : 'dim'));
    }
    U.tap(c, function () {
      RA.Audio.unlock();
      if (E.isUnlocked(p, e.key)) {
        RA.Sfx.play('pop');
        U.flash(c, 'hop', 600);
        if (e.kind === 'item' && e.ref.label) { A.text(e.ref.label); }
        return;
      }
      var reason = E.canBuy(p, e.key);
      UI.buyPanel({
        art: art(e, p, true),
        cost: e.cost,
        have: p.flames || 0,
        soon: reason === 'soon',
        lineAsk: null,
        canBuy: reason === 'ok',
        onBuy: function () {
          if (E.buy(p, e.key) !== 'ok') { return; }
          RA.Store.saveProfile(p);
          RA.Sfx.play('chime');
          UI.updateFlames(p, true);
          var fresh = card(e, p, tab);
          c.parentNode.replaceChild(fresh, c);
          UI.burstOn(fresh);
          U.flash(fresh, 'hop', 600);
          A.line('bought');
          // other cards may no longer be affordable
          var cards = fresh.parentNode.querySelectorAll('.shop-card.afford'), i;
          for (i = 0; i < cards.length; i++) {
            if (E.costOf(cards[i].getAttribute('data-key')) > (p.flames || 0)) {
              U.removeClass(cards[i], 'afford');
              var pr = cards[i].querySelector('.price');
              if (pr) { U.addClass(pr, 'dim'); }
            }
          }
        }
      });
    });
    return c;
  }
})(window);
