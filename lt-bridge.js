/*
 * Chore Quest <-> Lit Town: one character per kid (cl-v51). ES5.
 *
 * Lit Town runs inside Chore Quest (littown/index.html, same app, same localStorage). This file is loaded by Lit Town's
 * page (littown/index.html adds <script src="../sprites.js"> and <script src="../lt-bridge.js"> after its own scripts;
 * Chore Quest's release script adds them if a fresh Lit Town export lacks them). It does four things there:
 *   1. draws every character in Lit Town with Chore Quest's 2D sprites (sprites.js), so both games look the same;
 *   2. links each Lit Town reader to a Chore Quest kid (the ?kid= Chore Quest opens Lit Town with), by name the first
 *      time, and opens that kid's reader straight away;
 *   3. a linked reader wears the kid's Chore Quest character (Chore Quest writes every kid's look into cl.looks when it
 *      opens Lit Town); Lit Town's own dress-up screen points to Chore Quest's character maker instead;
 *   4. clothes and hairstyles bought in Lit Town's shop (with flames, by reading) go back to Chore Quest (cl.ltBack), where
 *      they can be worn; clothes the kid already has in Chore Quest show as owned in Lit Town's shop.
 *
 * Keys: cl.looks   { <kid id>: { name, look: <sprites.js person look>, have: { <Chore Quest id>: 1 } } }   (Chore Quest writes)
 *       cl.ltBack  { <kid id>: { owned: [<Chore Quest id>...] } }                                        (Lit Town writes)
 *       lt.p.<id>.cqKid                                                                                   (the link, in Lit Town's save)
 */
(function (w) {
  'use strict';
  var RA = w.RA;
  if (!RA || !RA.Avatar) return;                     /* not on Lit Town's page */

  function lsGet(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function json(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  var KID = (/[?&]kid=([^&#]+)/.exec(w.location.search || '') || [])[1];
  KID = KID ? decodeURIComponent(KID) : '';
  var LOOKS = json('cl.looks') || {};

  /* ---- Lit Town part ids -> Chore Quest ---- */
  var MAP = {
    hair: { bob: 'bob', long: 'long', curly: 'curly', afro: 'afro', ponytail: 'ponytail', pixie: 'pixie', puffs: 'puffs', braids: 'braids', buzz: 'buzz', bun: 'bun' },
    top: { tee: 'tee', stripe: 'tee', hoodie: 'hoodie', dress: 'dress', jacket: 'jacket', sweater: 'sweater', chef: 'chef', jersey: 'jersey' },
    bot: { pants: 'pants', shorts: 'shorts', skirt: 'skirt', leggings: 'leggings', tutu: 'tutu', cargo: 'cargo' },
    shoes: { sneakers: 'sneakers', boots: 'ankle', sandals: 'sandals', rainboots: 'boots' },
    acc: { none: 'none', glasses: 'glasses', bow: 'bow', headband: 'headband', cap: 'cap', beanie: 'beanie', chefhat: 'chefhat', flowers: 'flowers' },
    face: { smile: 'smile', grin: 'grin', wow: 'wow' }
  };
  var SLOT_KEY = { hair: 'hairStyle', top: 'top', bot: 'bot', shoes: 'shoes', acc: 'acc' };
  /* Chore Quest's free options (everything in its maker that isn't earned somewhere) */
  var CQ_FREE = { bob: 1, long: 1, curly: 1, afro: 1, ponytail: 1, pixie: 1, bun: 1, tee: 1, hoodie: 1, dress: 1, pants: 1, shorts: 1, skirt: 1, sneakers: 1, ankle: 1, none: 1, glasses: 1, bow: 1, headband: 1, cap: 1 };

  /* a Lit Town look -> a sprites.js person look */
  function toSpr(c, adult) {
    c = RA.Avatar.merge(c || {});
    return { h: adult ? 'tall' : 'small', skin: c.skin, hair: MAP.hair[c.hairStyle] || 'short', hairCol: c.hair, top: MAP.top[c.top] || 'tee', topCol: c.topColor, top2: c.top2,
      topPat: c.top === 'stripe' ? 'stripes' : '', topInk: c.top2, bottom: MAP.bot[c.bot] || 'pants', pantsCol: c.botColor, shoes: MAP.shoes[c.shoes] || 'sneakers', shoeCol: c.shoeColor,
      acc: MAP.acc[c.acc] || 'none', accCol: c.accColor, mouth: MAP.face[c.face] || 'smile' };
  }

  /* ---- 1. drawing: same 200 x 300 box and the same head/hand spots as Lit Town's own figure ---- */
  var ORIG = RA.Avatar.svg;
  RA.Avatar.svg = function (cfg, opts) {
    if (!w.SPR || !w.SPR.person) return ORIG(cfg, opts);
    var k;
    if (cfg && cfg.__cq) {
      k = JSON.parse(JSON.stringify(cfg.__cq));
      /* the shop shows her wearing something new: apply what differs from the reader's own look */
      var base = cfg.__lt || {};
      if (cfg.hairStyle && cfg.hairStyle !== base.hairStyle && MAP.hair[cfg.hairStyle]) k.hair = MAP.hair[cfg.hairStyle];
      if (cfg.top && cfg.top !== base.top && MAP.top[cfg.top]) { k.top = MAP.top[cfg.top]; k.topPat = cfg.top === 'stripe' ? 'stripes' : k.topPat; }
      if (cfg.bot && cfg.bot !== base.bot && MAP.bot[cfg.bot]) k.bottom = MAP.bot[cfg.bot];
      if (cfg.shoes && cfg.shoes !== base.shoes && MAP.shoes[cfg.shoes]) k.shoes = MAP.shoes[cfg.shoes];
      if (cfg.acc && cfg.acc !== base.acc && MAP.acc[cfg.acc]) k.acc = MAP.acc[cfg.acc];
    } else k = toSpr(cfg, cfg && cfg.adult);
    var inner = w.SPR.person(k, { view: 'front', shadow: false, ow: 2 });
    /* sprites.js draws in a 120 x 160 box with the feet at y 153; Lit Town's figure fills 200 x 300 with the feet near 296 */
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" class="avatar-svg cq-avatar"><svg x="-14" y="10" width="228" height="304" viewBox="0 0 120 160">' +
      inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg></svg>';
  };

  /* ---- 2 and 3. readers linked to Chore Quest kids ---- */
  function lower(s) { return String(s || '').replace(/^\s+|\s+$/g, '').toLowerCase(); }
  function linkedTo(kid) { var out = null; RA.Store.profiles().forEach(function (p) { if (p.cqKid === kid) out = p; }); return out; }
  function wearCq(p) {
    var me = p && p.cqKid && LOOKS[p.cqKid];
    if (!me || !me.look) return false;
    var lt = RA.Avatar.merge(p.look && p.look.__lt ? p.look.__lt : p.look || {});
    var want = JSON.stringify(me.look);
    if (p.look && p.look.__cq && JSON.stringify(p.look.__cq) === want) return false;
    var look = JSON.parse(JSON.stringify(lt)); look.__cq = me.look; look.__lt = lt;
    p.look = look;
    return true;
  }
  function refreshAll() { RA.Store.profiles().forEach(function (p) { if (wearCq(p)) RA.Store.saveProfile(p); }); }
  function link(p, kid) {
    if (!p || !kid || p.cqKid === kid || linkedTo(kid)) return;
    if (p.cqKid && LOOKS[p.cqKid]) return;           /* already somebody else's reader */
    p.cqKid = kid; wearCq(p); RA.Store.saveProfile(p); sendOwned(p);
  }
  function guess(kid) {
    var me = LOOKS[kid]; if (!me) return null;
    var hit = null; RA.Store.profiles().forEach(function (p) { if (!p.cqKid && lower(p.name) === lower(me.name)) hit = p; });
    return hit;
  }
  var opened = false, UI = RA.UI, goOrig = UI.go;
  UI.go = function (name, param, replace) {
    if (!opened && name === 'profiles' && KID && RA.Store && RA.Store.profiles) {
      opened = true;
      refreshAll();
      var p = linkedTo(KID) || guess(KID);
      if (p) {
        link(p, KID);
        RA.state.profile = p;
        try { RA.Store.setLastProfile(p.id); UI.applyFont(p); } catch (e) { /* ignore */ }
        return goOrig.call(UI, 'kid', null, true);         /* straight to her home; Back from there is "Who is reading?" */
      }
    }
    /* "New reader" from Chore Quest: the reader is this kid, named and dressed already */
    if (name === 'create' && param === 'new' && KID && LOOKS[KID] && !linkedTo(KID)) {
      var np = RA.Store.newProfile(LOOKS[KID].name || 'Reader'); np.cqKid = KID; wearCq(np); RA.Store.saveProfile(np);
      RA.state.profile = np; try { RA.Store.setLastProfile(np.id); UI.applyFont(np); } catch (e) { /* ignore */ }
      return goOrig.call(UI, 'kid', null, true);
    }
    if (name === 'kid' && KID && RA.state && RA.state.profile && !RA.state.profile.cqKid && !linkedTo(KID)) link(RA.state.profile, KID);
    if (name === 'kid' && RA.state && RA.state.profile && wearCq(RA.state.profile)) RA.Store.saveProfile(RA.state.profile);
    return goOrig.apply(UI, arguments);
  };

  /* Lit Town's dress-up, for a reader who is a Chore Quest kid: the character is made in Chore Quest */
  var S = RA.Screens;
  if (S && S.dress) {
    var dressOrig = S.dress.show;
    S.dress.show = function (root) {
      var p = RA.state.profile;
      if (!p || !p.cqKid || !LOOKS[p.cqKid] || !(RA.Hub && RA.Hub.inside)) return dressOrig.apply(this, arguments);
      var U = RA.U, box = U.el('div.cq-dress');
      var top = U.el('div.topbar'); top.appendChild(UI.btn('ui-back', '', function () { w.history.back(); }, 'small')); top.appendChild(U.el('h1', { text: 'Your look' }));
      root.appendChild(top);
      box.appendChild(UI.avatar(p.look, 'big'));
      var txt = U.el('div.cq-dress-text');
      txt.appendChild(U.el('p', { text: 'Your character lives in Chore Quest, so you look the same in both games.' }));
      txt.appendChild(U.el('p', { text: 'Clothes and hair you buy in the Lit Town shop show up in Chore Quest’s character maker. Put them on there.' }));
      txt.appendChild(UI.btn('ui-hanger', 'Change my look', function () {
        lsSet('cl.fromLitTown', JSON.stringify({ ev: { kind: 'look', kid: p.cqKid }, at: Date.now() }));
        if (RA.World && RA.World.flush) { try { RA.World.flush(); } catch (e) { /* ignore */ } }
        RA.Hub.leave();
      }, 'big'));
      box.appendChild(txt);
      root.appendChild(box);
    };
  }

  /* ---- 4. the shop: owned in either game counts; buying here is sent to Chore Quest ---- */
  function cqId(key) {
    var m = /^outfit:([a-z]+)\/([a-z0-9]+)$/.exec(key || ''); if (!m) return '';
    var t = { hair: MAP.hair, top: MAP.top, bot: MAP.bot, shoes: MAP.shoes, acc: MAP.acc }[m[1]];
    return t && t[m[2]] || '';
  }
  function sendOwned(p) {
    if (!p || !p.cqKid) return;
    var ids = [];
    Object.keys(p.owned || {}).forEach(function (k) { var id = cqId(k); if (id && !CQ_FREE[id] && ids.indexOf(id) < 0) ids.push(id); });
    if (!ids.length) return;
    var back = json('cl.ltBack') || {};
    back[p.cqKid] = { owned: ids, at: Date.now() };
    lsSet('cl.ltBack', JSON.stringify(back));
  }
  var E = RA.Engine;
  if (E && E.isUnlocked && E.buy) {
    var unl = E.isUnlocked, buy = E.buy;
    E.isUnlocked = function (p, key) {
      if (unl.apply(E, arguments)) return true;
      var me = p && p.cqKid && LOOKS[p.cqKid], id = me && cqId(key);
      return !!(id && (CQ_FREE[id] || (me.have && me.have[id])));
    };
    E.buy = function (p, key) { var r = buy.apply(E, arguments); if (r === 'ok') sendOwned(p); return r; };
  }

  /* a little style for the "Your look" screen */
  try {
    var st = w.document.createElement('style');
    st.textContent = '.cq-dress{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:center;padding:16px}.cq-dress .avatar{width:220px;max-width:40vw}' +
      '.cq-dress-text{max-width:420px;display:flex;flex-direction:column;gap:12px;font-size:20px}.cq-dress-text p{margin:0}';
    w.document.head.appendChild(st);
  } catch (e) { /* ignore */ }
  RA.CqBridge = { toSpr: toSpr, MAP: MAP, kid: KID, looks: LOOKS, link: link, sendOwned: sendOwned };
})(window);
