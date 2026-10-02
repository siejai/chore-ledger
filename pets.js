/*
 * Pet game data, economy and indoor screens. The walkable town is js/world.js; art is js/creatures.js and js/avatar.js.
 *
 * pets/{personId} = {
 *   avatar, intro, pet: {sp, pal, name, level, stage, hatched, leveledOn, final}, house: [retired pets],
 *   needs: {food, clean, rest, energy}, needsTs,       needs drain continuously (NEED_DRAIN per day)
 *   coinsFood, coinsCare,                                earned from kitchen chores / self-care chores (capped when spent)
 *   pantryFood, pantryCare,                              meals and bath kits bought at the store
 *   tokRest, tokEnergy                                   from bedtime / exercise chores, used at home (bed) and the park
 * }
 * A good day: all four needs at GOOD or more at the same time -> +1 level (once per day). Level 5 and 15 evolve and pay the bank.
 * ES5.
 */
(function () {
  'use strict';
  var NEEDS = [
    { k: 'food', label: 'Food', sad: 'Hungry' },
    { k: 'clean', label: 'Clean', sad: 'Stinky' },
    { k: 'rest', label: 'Sleep', sad: 'Tired' },
    { k: 'energy', label: 'Energy', sad: 'Grumpy' }
  ];
  var GOOD = 70, LOW = 35, STARVE = 20, NEED_DRAIN = 50, EVO1 = 5, EVO2 = 15;
  var MEAL_GAIN = 50, BATH_GAIN = 60, SLEEP_GAIN = 60, PLAY_GAIN = 60, PANTRY_CAP = 3, TOKEN_CAP = 2;
  var G = { talk: 0, pick: null, dirtyAvatar: null, room: null, game: null, D: null, creator: false, spin: 1, spinAdult: false };
  /* ----- spinning the character in the creator ----- */
  function spinOpts() { var F = window.C3D && C3D.spinFrames ? C3D.spinFrames() : [['three', 0]], f = F[G.spin % F.length] || F[0]; return { view: f[0], flip: !!f[1], abs: !G.spinAdult }; }
  function heightValue(a) { return typeof a.hv === 'number' ? a.hv : a.height === 'medium' ? 100 : a.height === 'tiny' ? 15 : 60; }
  /* the height slider: toddler to big kid, updating the preview as it moves */
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute('data-hv') || !G.dirtyAvatar) return;
    var v = Number(t.value), hh = window.CHAR.heightOf({ hv: v });
    G.dirtyAvatar.hv = v; G.dirtyAvatar.height = hh.h; G.dirtyAvatar.hscale = Math.round(hh.s * 1000) / 1000;
    spinTo(G.spin);
  });
  function spinTo(i) {
    var n = window.C3D && C3D.spinFrames ? C3D.spinFrames().length : 1; G.spin = ((i % n) + n) % n;
    var pv = document.querySelector('.creator .av-preview'); if (pv && G.dirtyAvatar) pv.innerHTML = avatarSvg(G.dirtyAvatar, G.spinAdult, spinOpts());
  }
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var pv = e.target.closest ? e.target.closest('.creator .av-preview') : null; if (!pv) return;
    drag = { x: e.clientX, i: G.spin, id: e.pointerId }; try { pv.setPointerCapture(e.pointerId); } catch (er) {}
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var step = Math.round((e.clientX - drag.x) / 28); if (drag.i + step !== G.spin) spinTo(drag.i + step);
  });
  document.addEventListener('pointerup', function () { drag = null; });
  document.addEventListener('pointercancel', function () { drag = null; });
  function C() { return window.CL; }
  function S() { return window.CL.S; }
  function esc(s) { return C().esc(s); }
  function doc(pid) { return S().pets[pid] || {}; }
  function me() { var s = S(); return C().isPerson(s.me) ? s.me : null; }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function num(v) { return Math.max(0, Number(v) || 0); }
  function assign(a, b) { for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  /* Grown-ups are always tall and kids never are, so approvers stand out at a glance. A kid's "Tall" is the medium size. */
  function avatarSvg(a, adult, opts) { return window.CHAR.drawAvatar(adult ? adultAv(a) : kidAv(a), null, opts); }
  function kidAv(av) { if (!av || (av.height !== 'tall' && av.height)) return av; var o = assign({}, av); o.height = av.height === 'tall' ? 'medium' : 'small'; return o; }
  /* Grown-ups (parents) have a character but no pet. Their avatar lives in pets/{parentId} with a spot where they hang out in town. */
  var SPOTS = [['bank', 'The bank'], ['store', 'The Store'], ['prizes', 'Prize Shop'], ['park', 'The Park'], ['gate', 'Adventure Gate'], ['square', 'Town square'], ['', 'Not in town']];
  var HOST_LINE = { bank: 'Welcome to the bank! Here is your account.', store: 'Welcome to the Store! Meals keep your pet full, and bath kits (soap and shampoo) keep it clean.',
    park: 'Great day for a game of fetch!', prizes: 'Welcome to the Prize Shop! Spend your deck tickets here.', gate: 'Big jobs done? Then adventure awaits!', square: 'Hi there! How is your pet doing today?' };
  function adultAv(av) { if (!av || av.height === 'tall') return av; var o = assign({}, av); o.height = 'tall'; return o; }
  function hosts(kind) {
    return (S().settings.parents || []).filter(function (p) { var d = doc(p.id); return d.avatar && d.spot === kind; })
      .map(function (p) { return { id: p.id, name: p.name, avatar: adultAv(doc(p.id).avatar) }; });
  }
  function hostScene(kind) {
    var hs = hosts(kind); if (!hs.length) return '';
    var line = kind === 'bank' ? 'Welcome to ' + C().bankName() + '! Here is your account.' : HOST_LINE[kind];
    return '<div class="shop-scene host-scene">' + hs.map(function (h) { return '<div class="shopkeeper">' + avatarSvg(h.avatar, true) + '<small>' + esc(h.name) + '</small></div>'; }).join('') +
      '<div class="speech">' + esc(line) + '</div></div>';
  }
  function adultCreatorHtml(parentId) { G.adultId = parentId; return creatorHtml(parentId, true); }

  /* ================= economy ================= */
  function prices() {
    var st = S().settings;
    var mp = Number(st.mealPrice) || 10, kp = Number(st.kitPrice) || 10;
    return { meal: mp, kit: kp, foodCap: mp * 2, careCap: kp * 2 };
  }
  function needsNow(d) {
    var n = d.needs || {}, ts = Number(d.needsTs) || Date.now(), days = Math.max(0, (Date.now() - ts) / 86400000), out = {};
    var vac = window.ADV && ADV.onVacation();
    NEEDS.forEach(function (x) {
      var base = n[x.k] == null ? 70 : n[x.k], v = base - (vac ? NEED_DRAIN / 2 : NEED_DRAIN) * days;
      if (vac) v = Math.max(v, Math.min(base, 40));
      out[x.k] = clamp(v);
    });
    return out;
  }
  function wallet(d) {
    var pr = prices();
    return {
      food: Math.min(num(d.coinsFood), pr.foodCap), care: Math.min(num(d.coinsCare), pr.careCap),
      foodOver: num(d.coinsFood) > pr.foodCap, careOver: num(d.coinsCare) > pr.careCap,
      meals: Math.min(num(d.pantryFood), PANTRY_CAP), kits: Math.min(num(d.pantryCare), PANTRY_CAP),
      rest: Math.min(num(d.tokRest), TOKEN_CAP), energy: Math.min(num(d.tokEnergy), TOKEN_CAP)
    };
  }
  /* hungry -> thin and dull; no exercise -> round; both -> "skinnyfat": thin, with a little pot belly */
  function flagsOf(n) { var thin = n.food < STARVE, lazy = n.energy < LOW; return { thin: thin, dirty: n.clean < LOW, tired: n.rest < LOW, pudgy: lazy && !thin, belly: lazy && thin }; }
  function moodOf(n) {
    var low = null;
    NEEDS.forEach(function (x) { if (n[x.k] < LOW && (!low || n[x.k] < n[low.k])) low = x; });
    if (n.food < STARVE) return { key: 'hungry', label: 'Starving' };
    if (low) return { key: low.k === 'food' ? 'hungry' : 'ok', label: low.sad };
    return NEEDS.every(function (x) { return n[x.k] >= GOOD; }) ? { key: 'happy', label: 'Happy' } : { key: 'ok', label: 'Okay' };
  }
  function state(pid) {
    var d = doc(pid), n = needsNow(d), w = wallet(d);
    return { doc: d, pet: d.pet, needs: n, wallet: w, flags: flagsOf(n), mood: moodOf(n), starving: n.food < STARVE && w.meals < 1 && !(window.ADV && ADV.onVacation()) };
  }
  function speciesName(p) { var sp = CRE.byId(p.sp); return sp ? sp.names[p.stage || 0] : 'Pet'; }
  function petSvg(p, mood, flags, opts) { return CRE.draw(p.sp, p.stage || 0, p.pal || 0, mood, assign({ flags: flags || {}, acc: p.wear || '', pal: p.dye && window.ADV ? ADV.dyePal(p.dye) : null }, opts || {})); }

  /* Every change goes through here: recompute needs to now, apply the change, normalise capped wallets, check for a level-up. */
  function act(pid, change) {
    var st = state(pid), d = st.doc, t = C().today(), w = st.wallet;
    if (!d.pet) return Promise.resolve(null);
    var needs = assign({}, st.needs);
    var up = { needsTs: Date.now() };
    var res = change(needs, w, up);
    if (res === false) return Promise.resolve(null);
    NEEDS.forEach(function (x) { needs[x.k] = clamp(needs[x.k]); });
    up.needs = needs;
    var ops = [], result = null;
    if (!d.pet.final && d.pet.leveledOn !== t && NEEDS.every(function (x) { return needs[x.k] >= GOOD; })) {
      var p = assign({}, d.pet), sset = S().settings;
      p.level = (p.level || 0) + 1; p.leveledOn = t;
      result = { level: p.level, evolved: false, final: false, pay: 0, from: speciesName(d.pet) };
      if (p.level >= EVO1 && (p.stage || 0) < 1) { p.stage = 1; result.evolved = true; result.pay = Number(sset.petEvolve1Cents) || 0; }
      if (p.level >= EVO2 && (p.stage || 0) < 2) { p.stage = 2; p.final = true; result.evolved = true; result.final = true; result.pay = Number(sset.petEvolve2Cents) || 0; }
      result.to = speciesName(p);
      up.pet = p;
      if (result.pay > 0) ops = ops.concat(C().txOps(pid, result.pay, 'pet', p.name + ' evolved into ' + result.to));
    }
    ops.unshift({ t: 'update', c: 'pets', id: pid, d: up });
    return DB.commit(ops).then(function () { if (result) celebrate(pid, result); return result; }, function (e) { C().fail(e); throw e; });
  }
  function feed(pid) {
    return act(pid, function (n, w, up) {
      if (w.meals < 1) { C().toast('No food in your bag. Buy a meal at the Store.', true); return false; }
      n.food += MEAL_GAIN; up.pantryFood = w.meals - 1;
    });
  }
  function buy(pid, item) {
    var pr = prices();
    return act(pid, function (n, w, up) {
      if (item === 'meal') {
        if (w.meals >= PANTRY_CAP) { C().toast('Your bag is full (' + PANTRY_CAP + ' meals). Tap Feed in town to use one.', true); return false; }
        if (w.food < pr.meal) { C().toast('A meal costs ' + pr.meal + ' food coins and you have ' + w.food + '. Kitchen chores earn them.', true); return false; }
        up.coinsFood = w.food - pr.meal; up.pantryFood = w.meals + 1;
      } else {
        if (w.kits >= PANTRY_CAP) { C().toast('Your bag is full (' + PANTRY_CAP + ' bath kits). Give a bath at home first.', true); return false; }
        if (w.care < pr.kit) { C().toast('A bath kit costs ' + pr.kit + ' care coins and you have ' + w.care + '. Showers, teeth and hair earn them.', true); return false; }
        up.coinsCare = w.care - pr.kit; up.pantryCare = w.kits + 1;
      }
    });
  }
  function bath(pid) { return act(pid, function (n, w, up) { if (w.kits < 1) return false; n.clean += BATH_GAIN; up.pantryCare = w.kits - 1; }); }
  function sleep(pid) { return act(pid, function (n, w, up) { if (w.rest < 1) return false; n.rest += SLEEP_GAIN; up.tokRest = w.rest - 1; }); }
  function play(pid) { return act(pid, function (n, w, up) { if (w.energy < 1) return false; n.energy += PLAY_GAIN; up.tokEnergy = w.energy - 1; }); }

  function celebrate(pid, res) {
    var p = doc(pid).pet;
    var box = document.createElement('div');
    box.className = 'celebrate';
    box.innerHTML = '<div class="celebrate-card"><div class="celebrate-art">' + (p ? petSvg(p, 'happy', {}, { shine: true }) : '') + '</div>' +
      (res.evolved ? '<h2>' + esc(res.from) + ' evolved into ' + esc(res.to) + '!</h2>' : '<h2>Level up! Now level ' + res.level + '</h2>') +
      (res.pay > 0 ? '<p>' + C().money(res.pay) + ' was deposited in the ' + esc(C().bankName()) + '.</p>' : '<p>Every need is taken care of today. Great job!</p>') +
      (res.final ? '<p>It is fully grown. Visit your house to move it in and meet a new partner.</p>' : '') +
      '<button class="btn primary" type="button" data-pact="closeCeleb">Yay!</button></div>';
    document.body.appendChild(box);
  }

  /* ================= screens ================= */
  function render(view, D) {
    G.D = D;
    var pid = me();
    if (!pid) { view.innerHTML = overviewHtml(); return; }
    var d = doc(pid);
    if (!d.avatar || G.creator) { if (window.World) window.World.unmount(); view.innerHTML = creatorHtml(pid); return; }
    if (!d.pet) { if (window.World) window.World.unmount(); view.innerHTML = professorHtml(pid, d); return; }
    if (window.Defense && window.Defense.active()) { window.Defense.render(view); return; }
    if (window.BedDefense && window.BedDefense.active()) { window.BedDefense.render(view); return; }
    if (!window.World) { view.innerHTML = '<p class="note">The town did not load.</p>'; return; }
    window.World.show(view, pid);
  }
  function overviewHtml() {
    var ps = C().activePeople().filter(function (p) { return doc(p.id).pet || (doc(p.id).house || []).length; });
    var h = '<div class="stack tight"><h2>Everyone’s pets</h2>';
    if (!ps.length) return h + '<p class="note">Nobody has a pet yet. Each person picks one the first time they open My Pet.</p></div>';
    return h + '<div class="friends">' + ps.map(function (p) { return friendCard(p.id); }).join('') + '</div></div>';
  }
  function friendCard(pid) {
    var st = state(pid), d = st.doc, p = C().person(pid);
    if (!d.pet) return '<div class="friend p' + C().pIndex(p) + '"><div class="friend-who"><span class="friend-av">' + avatarSvg(d.avatar) + '</span><div><strong>' + esc(p.name) + '</strong><br><small>Choosing a new partner</small></div></div></div>';
    var bad = NEEDS.filter(function (x) { return st.needs[x.k] < LOW; }).map(function (x) { return x.sad; });
    return '<div class="friend p' + C().pIndex(p) + '"><div class="friend-art">' + petSvg(d.pet, st.mood.key, st.flags) + '</div>' +
      '<div class="friend-who"><span class="friend-av">' + avatarSvg(d.avatar) + '</span><div><strong>' + esc(d.pet.name) + '</strong><br><small>' + esc(p.name) + '’s ' + esc(speciesName(d.pet)) + ' &middot; Lv ' + (d.pet.level || 0) + '</small></div></div>' +
      '<div>' + (bad.length ? bad.map(function (b) { return '<span class="tag pend">' + b + '</span>'; }).join('') : '<span class="tag ok">' + esc(st.mood.label) + '</span>') + '</div>' +
      (d.egg ? '<div class="egg-note small"><span class="egg-mini">' + CRE.egg() + '</span><strong>Has a rare egg!</strong></div>' : '') +
      miniBars(st.needs) + ((d.house || []).length ? '<small class="note">' + d.house.length + ' grown pet' + (d.house.length > 1 ? 's' : '') + ' at home</small>' : '') + '</div>';
  }
  function miniBars(n) {
    return '<div class="mini-needs">' + NEEDS.map(function (x) {
      var v = n[x.k], cls = v >= GOOD ? 'full' : v < LOW ? 'low' : '';
      return '<div class="need ' + cls + '"><span class="need-l">' + x.label + '</span><span class="bar"><i style="width:' + v + '%"></i></span></div>';
    }).join('') + '</div>';
  }

  /* ----- character creator ----- */
  function patSwatch(v, col) {
    var ink = window.CHAR.patInk ? window.CHAR.patInk(col, v) : '#fff', g = '';
    if (v === 'dots') g = '<circle cx="5" cy="5" r="1.6"/><circle cx="11" cy="9" r="1.6"/><circle cx="5" cy="13" r="1.6"/><circle cx="12" cy="2" r="1.4"/>';
    else if (v === 'stripes') g = '<rect x="0" y="3" width="16" height="2.5"/><rect x="0" y="9" width="16" height="2.5"/>';
    else if (v === 'plaid') g = '<rect x="0" y="4" width="16" height="2.4" opacity=".6"/><rect x="0" y="11" width="16" height="2.4" opacity=".6"/><rect x="4" y="0" width="2.4" height="16" opacity=".6"/><rect x="11" y="0" width="2.4" height="16" opacity=".6"/>';
    else if (v === 'stars') g = '<path d="M8 2.5 L9.5 6.3 L13.5 6.4 L10.3 8.8 L11.4 12.8 L8 10.4 L4.6 12.8 L5.7 8.8 L2.5 6.4 L6.5 6.3 Z"/>';
    else if (v === 'hearts') g = '<path d="M8 13 C2.5 9.3 2.2 5.3 4.8 4.1 C6.3 3.5 7.5 4.3 8 5.2 C8.5 4.3 9.7 3.5 11.2 4.1 C13.8 5.3 13.5 9.3 8 13 Z"/>';
    else if (v === 'camo') g = '<path d="M1 4 Q5 0 8 4 Q9 8 4 7 Z M9 10 Q13 8 15 12 Q12 16 9 13 Z" opacity=".6"/><path d="M10 2 Q14 1 14 5 Q11 6 10 4 Z M2 11 Q5 10 6 13 Q3 15 2 13 Z"/>';
    return '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="7.5" fill="' + col + '"/><g fill="' + ink + '" style="clip-path:circle(7.5px at 8px 8px)">' + g + '</g><circle cx="8" cy="8" r="7.5" fill="none" stroke="rgba(0,0,0,.25)"/></svg>';
  }
  function creatorHtml(pid, adult) {
    var AV = window.CHAR.AV, L = window.CHAR.AV_LABEL, d = doc(pid);
    var fresh = !G.dirtyAvatar;
    var a = G.dirtyAvatar || (d.avatar ? assign({}, d.avatar) : window.CHAR.randAvatar());
    if (adult) a.height = 'tall';
    else if (['tiny', 'small', 'medium'].indexOf(a.height) < 0) a.height = 'small';
    G.dirtyAvatar = a; G.spinAdult = !!adult;
    if (window.C3D && C3D.preloadSpin) C3D.preloadSpin();
    function sw(key, i, color) { return '<button type="button" class="sw" style="background:' + color + '" data-pact="av" data-k="' + key + '" data-v="' + i + '" aria-pressed="' + (a[key] === i) + '" aria-label="' + key + ' ' + (i + 1) + '"></button>'; }
    function word(key) { return AV[key].map(function (v) { return '<button type="button" class="cat" data-pact="av" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (a[key] === v) + '">' + L[key][v] + '</button>'; }).join(''); }
    var ORD = window.CHAR.ORDER || {};
    function swatches(key, from) { var lk = from || key, list = AV[lk], ord = ORD[lk] || list.map(function (c, i) { return i; }); return ord.map(function (i) { return sw(key, i, list[i]); }).join(''); }
    function word2(key, cur) { return AV[key].map(function (v) { return '<button type="button" class="cat" data-pact="av" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + L[key][v] + '</button>'; }).join(''); }
    if (a.hairFx && a.hairFx !== 'none' && a.hair2 == null) a.hair2 = AV.hairColor.indexOf(window.CHAR.hair2Default(a.hairFx));
    function pats(key, colorKey) {
      var col = AV[colorKey][a[colorKey]] || AV[colorKey][0], cur = a[key] || 'solid';
      return AV.pattern.map(function (v) {
        return '<button type="button" class="cat pat-btn" data-pact="av" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' +
          '<span class="pat-sw" aria-hidden="true">' + patSwatch(v, col) + '</span>' + L.pattern[v] + '</button>';
      }).join('');
    }
    var dress = a.top === 'dress', bot = AV.bottom.indexOf(a.bottom) >= 0 ? a.bottom : 'pants';
    return '<section class="stack creator"><div><h2>' + (d.avatar ? 'Change your look' : adult ? 'Design your character' : 'Make your character') + '</h2><p class="note">' + (adult ? 'The kids see you in town at the spot you pick.' : 'This is you in the town. Everyone sees it when they visit.') + '</p></div>' +
      '<div class="av-stage"><button type="button" class="av-turn" data-pact="avSpin" data-d="-1" aria-label="Turn left">&#8634;</button>' +
      '<div class="av-preview" title="Drag to spin">' + avatarSvg(a, adult, spinOpts()) + '</div>' +
      '<button type="button" class="av-turn" data-pact="avSpin" data-d="1" aria-label="Turn right">&#8635;</button></div>' +
      (adult ? '' : '<div class="av-row"><label class="av-l" for="avHv">Height</label><div class="hslider"><span aria-hidden="true">Toddler</span>' +
        '<input type="range" id="avHv" min="0" max="100" step="1" data-hv value="' + heightValue(a) + '" aria-label="Height, toddler to big kid"><span aria-hidden="true">Big kid</span></div></div>') +
      '<div class="av-row"><span class="av-l">Build</span><div class="wrap">' + ['slim', 'medium', 'large'].map(function (v) { return '<button type="button" class="cat" data-pact="av" data-k="build" data-v="' + v + '" aria-pressed="' + ((a.build || 'medium') === v) + '">' + window.CHAR.AV_LABEL.build[v] + '</button>'; }).join('') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Skin</span><div class="wrap">' + AV.skin.map(function (c, i) { return sw('skin', i, c); }).join('') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Hair</span><div class="wrap">' + word('hair') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Hair color</span><div class="wrap">' + swatches('hairColor') + '</div></div>' +
      (a.hair === 'bald' ? '' : '<div class="av-row"><span class="av-l">Hair 2nd color</span><div class="wrap">' + word2('hairFx', a.hairFx || 'none') + '</div>' +
        (a.hairFx && a.hairFx !== 'none' ? '<div class="wrap" style="margin-top:6px">' + swatches('hair2', 'hairColor') + '</div>' : '') + '</div>') +
      (a.hair === 'bald' ? '' : '<div class="av-row"><span class="av-l">Bangs</span><div class="wrap">' + word2('bangs', a.bangs || 'none') + '</div></div>' +
        '<div class="av-row"><span class="av-l">Tendrils</span><div class="wrap">' + word2('tendrils', a.tendrils || 'none') + '</div></div>') +
      '<div class="av-row"><span class="av-l">Eyes</span><div class="wrap">' + word('eyes') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Outfit</span><div class="wrap">' + word('top') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Outfit color</span><div class="wrap">' + swatches('topColor') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Outfit pattern</span><div class="wrap">' + pats('topPat', 'topColor') + '</div></div>' +
      (dress ? '' : '<div class="av-row"><span class="av-l">Bottoms</span><div class="wrap">' + word2('bottom', bot) + '</div></div>' +
        '<div class="av-row"><span class="av-l">' + L.bottom[bot] + ' color</span><div class="wrap">' + swatches('pantsColor') + '</div></div>' +
        '<div class="av-row"><span class="av-l">' + L.bottom[bot] + ' pattern</span><div class="wrap">' + pats('pantsPat', 'pantsColor') + '</div></div>') +
      (adult ? '<div class="av-row"><span class="av-l">Face</span><div class="wrap">' + word('face') + '</div></div>' : '') +
      '<div class="av-row"><span class="av-l">Extra</span><div class="wrap">' + word('acc') + '</div></div>' +
      '<div class="wrap"><button class="btn primary" type="button" data-pact="avSave">That’s me!</button><button class="btn" type="button" data-pact="avRandom">Surprise me</button>' +
      (d.avatar || adult ? '<button class="btn" type="button" data-pact="avCancel">Cancel</button>' : '') + '</div></section>';
  }

  /* ----- professor and starter pick ----- */
  function professorHtml(pid, d) {
    var name = C().pname(pid), first = !d.intro && !(d.house || []).length, PROF = window.CHAR.PROF, pr = prices();
    var lines = first ? [
      'Hello, ' + name + '! I’m ' + PROF + '. I study the little creatures that live in busy, helpful towns like this one.',
      'These three need a partner. Yours will follow you all over town, and everything it needs comes from your real chores.',
      'Kitchen chores like dishes, sweeping and wiping the table earn food coins. A meal at the Store costs ' + pr.meal + ', and your pet needs about two a day, so keep up with them!',
      'Showers, brushing teeth and hair earn care coins for soap and shampoo. Bedtime chores let you tuck it into bed at home, and exercise lets you play with it in the park.',
      'Take care of all four needs in one day and it goes up a level. At level ' + EVO1 + ' it evolves, and at level ' + EVO2 + ' it evolves again and moves into your house. Then I’ll bring you a new friend!'
    ] : [d.egg ? 'Welcome back, ' + name + '! Your rare egg is wiggling. It is ready to hatch, or you can pick a regular partner and save the egg.' : 'Welcome back, ' + name + '! Your house is looking lively. Ready for a new partner?'];
    var step = Math.min(G.talk, lines.length - 1);
    var h = '<section class="stack prof"><div class="prof-row"><div class="prof-art">' + window.CHAR.professorSvg() + '</div><div class="speech">' + esc(lines[step]) + '</div></div>';
    if (step < lines.length - 1) return h + '<button class="btn primary block" type="button" data-pact="talk">Next</button></section>';
    if (G.pick === '@egg' && d.egg) {
      var es = CRE.byId(d.egg.sp);
      return h + '<form class="card stack tight legendary" data-form="hatch"><div class="hatch-art egg-bob">' + CRE.egg() + '</div>' +
        '<p><strong>Your rare egg is ready to hatch!</strong> What will you name the baby?</p>' +
        '<label class="field" for="petName"><span>Name</span><input type="text" id="petName" maxlength="16" value="' + esc(es.names[0]) + '"></label>' +
        '<div class="wrap"><button class="btn primary" type="submit">Hatch it!</button><button class="btn" type="button" data-pact="unpick">Look again</button></div></form></section>';
    }
    if (G.pick) {
      var sp = CRE.byId(G.pick);
      return h + '<form class="card stack tight" data-form="hatch"><div class="hatch-art">' + CRE.draw(sp.id, 0, 0, 'happy') + '</div>' +
        '<p>' + esc(sp.names[0]) + ' will hatch in a surprise color. What will you name it?</p>' +
        '<label class="field" for="petName"><span>Name</span><input type="text" id="petName" maxlength="16" value="' + esc(sp.names[0]) + '"></label>' +
        '<div class="wrap"><button class="btn primary" type="submit">Choose ' + esc(sp.names[0]) + '</button><button class="btn" type="button" data-pact="unpick">Look again</button></div></form></section>';
    }
    var eggBtn = d.egg ? '<button type="button" class="starter legendary" data-pact="pick" data-sp="@egg"><span class="starter-art egg-bob">' + CRE.egg() + '</span><strong>Rare egg</strong><small>Legendary</small><small class="note">The egg you found on an adventure. Nobody knows what is inside!</small></button>' : '';
    return h + '<div class="starters">' + eggBtn + CRE.starters(pid + ':' + (d.house || []).length + ':' + (d.rerolls || 0)).map(function (sp) {
      return '<button type="button" class="starter" data-pact="pick" data-sp="' + sp.id + '"><span class="starter-art">' + CRE.draw(sp.id, 0, 0, 'ok') + '</span>' +
        '<strong>' + esc(sp.names[0]) + '</strong><small>' + esc(sp.type) + ' type</small><small class="note">' + esc(sp.blurb) + '</small></button>';
    }).join('') + '</div></section>';
  }

  /* ================= indoor screens (opened from the town) ================= */
  function roomHtml(room, pid) {
    var owner = room.owner, head = '<div class="room-top"><strong>' + esc(room.walk ? walkTitle(room) : room.title) + '</strong><button class="btn small" type="button" data-pact="leave">' + (room.walk ? 'Back' : 'Leave') + '</button></div>';
    if (room.kind === 'store') return head + storeHtml(pid);
    if (room.kind === 'cafe') return head + cafeHtml(pid);
    if (room.kind === 'bank') { S().bankPid = pid; return head + hostScene('bank') + '<div class="game-bank">' + C().accountHtml(G.D, pid, false) + '</div>'; }
    if (room.kind === 'park') return head + (G.game ? '' : hostScene('park')) + parkHtml(pid);
    if (room.kind === 'house') return head + houseHtml(owner, owner === pid, room);
    if (room.kind === 'gate') return head + hostScene('gate') + (window.ADV ? ADV.gateHtml(pid) : '');
    if (room.kind === 'prizes') return head + (hostScene('prizes') || '<div class="shop-scene host-scene"><div class="shopkeeper">' + window.CHAR.drawAvatar({ skin: 3, hair: 'bun', hairColor: 0, eyes: 'happy', top: 'suit', topColor: 5, acc: 'glasses', height: 'medium' }) + '</div><div class="speech">Welcome to the Prize Shop! Deck tickets from the Cruise Ship, Mess Defense and Bedtime Defense are good here.</div></div>') +
      '<div class="prize-room">' + (window.ADV ? ADV.prizesHtml(pid) : '') + '</div>';
    return head;
  }
  function coin(kind) {
    return kind === 'food'
      ? '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#f2b632" stroke="#b07d12" stroke-width="1.5"/><path d="M10 5 q3 0 3 3.5 q0 3.5 -3 6.5 q-3 -3 -3 -6.5 q0 -3.5 3 -3.5 Z" fill="#e8453c"/></svg>'
      : '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#8fd3f2" stroke="#3a8ed8" stroke-width="1.5"/><circle cx="8" cy="9" r="3" fill="#fff"/><circle cx="12.5" cy="12" r="2" fill="#fff"/></svg>';
  }
  /* ----- the Pet Café: take your pet out to eat (food coins, eaten right away) ----- */
  var CAFE = [
    { id: 'plate', name: 'Pet plate', blurb: 'A full plate of their favorite food.', food: 50, energy: 0, k: 1 },
    { id: 'dinner', name: 'Deluxe dinner', blurb: 'A feast with all the trimmings.', food: 80, energy: 10, k: 1.5 },
    { id: 'sundae', name: 'Ice cream sundae', blurb: 'A sweet treat that gives a burst of energy.', food: 20, energy: 25, k: 0.8 }
  ];
  function cafePrice(it) { return Math.max(1, Math.round(prices().meal * it.k)); }
  function dishSvg(id) {
    if (id === 'sundae') return '<path d="M182 166 L218 166 L206 186 L194 186 Z" fill="#cfe9f7" stroke="#9ac2d8" stroke-width="2"/><rect x="197" y="186" width="6" height="8" fill="#9ac2d8"/><ellipse cx="200" cy="195" rx="12" ry="3" fill="#9ac2d8"/>' +
      '<circle cx="192" cy="160" r="9" fill="#fff4dc"/><circle cx="207" cy="160" r="9" fill="#ff9cc0"/><circle cx="200" cy="150" r="9" fill="#8a5634"/><circle cx="200" cy="139" r="4" fill="#e3283a"/>';
    var big = id === 'dinner';
    return '<ellipse cx="200" cy="184" rx="' + (big ? 34 : 26) + '" ry="' + (big ? 10 : 8) + '" fill="#ffffff" stroke="#d8d0c0" stroke-width="2"/>' +
      '<ellipse cx="' + (big ? 192 : 200) + '" cy="179" rx="14" ry="6" fill="#c58a4a"/>' + (big ? '<circle cx="212" cy="178" r="6" fill="#6fae4f"/><circle cx="220" cy="181" r="4" fill="#e8653c"/><path d="M178 172 q4 -8 8 0" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>' : '<circle cx="206" cy="176" r="3" fill="#e8a33a"/>');
  }
  function cafeHtml(pid) {
    var st = state(pid), d = st.doc, w = st.wallet, ate = G.cafe && G.cafe.pid === pid && Date.now() - G.cafe.t < 8000 ? G.cafe : null;
    var floor = ''; for (var x = 0; x < 400; x += 20) for (var y = 192; y < 260; y += 20) if (((x + y) / 20) % 2 < 1) floor += '<rect x="' + x + '" y="' + y + '" width="20" height="20" fill="#2b2b33"/>';
    var back = '<rect width="400" height="260" fill="#fff4e2"/><rect y="132" width="400" height="60" fill="#2fae7a"/><rect y="128" width="400" height="6" fill="#1f8f6a"/><rect y="192" width="400" height="68" fill="#f6f1e6"/>' + floor +
      '<rect x="22" y="22" width="110" height="78" rx="6" fill="#24443a" stroke="#8a5a34" stroke-width="5"/><text x="77" y="44" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#fff">MENU</text>' +
      '<path d="M36 58 h60 M36 72 h48 M36 86 h56" stroke="#e8f4f0" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      '<rect x="262" y="20" width="110" height="80" rx="4" fill="#bfe6ff" stroke="#fff" stroke-width="5"/><path d="M256 20 h122 l-8 18 h-106 z" fill="#2fae7a"/><path d="M270 38 l10 -18 M292 38 l10 -18 M314 38 l10 -18 M336 38 l10 -18 M358 38 l10 -18" stroke="#fff" stroke-width="5"/>' +
      '<line x1="200" y1="0" x2="200" y2="40" stroke="#555" stroke-width="2"/><path d="M184 40 h32 l-8 16 h-16 z" fill="#ffd23f"/><circle cx="200" cy="62" r="30" fill="#ffe27a" opacity=".2"/>';
    var front = '<ellipse cx="200" cy="196" rx="92" ry="20" fill="#ffffff"/><path d="M108 196 q0 22 10 30 h164 q10 -8 10 -30" fill="#e45757"/><path d="M118 226 h164" stroke="#ffffff" stroke-width="4" stroke-dasharray="10 10"/>' +
      '<ellipse cx="200" cy="194" rx="88" ry="17" fill="#ffffff"/><rect x="194" y="226" width="12" height="30" fill="#8a5a34"/><ellipse cx="200" cy="256" rx="30" ry="5" fill="#6a4424"/>' +
      (ate ? dishSvg(ate.id) : '<rect x="232" y="176" width="22" height="14" rx="2" fill="#24443a"/><rect x="170" y="168" width="8" height="18" rx="3" fill="#cfe9f7"/><circle cx="174" cy="164" r="6" fill="#ff8fb8"/>');
    var h = '<div class="room scene-room cafe-scene">' + sceneSvg(back) +
      (d.pet ? '<div class="scene-pet sc-cafe-pet">' + petSvg(d.pet, ate ? 'happy' : st.mood.key, st.flags) + '</div>' : '') +
      sceneSvg(front) + '<div class="scene-av sc-av sc-cafe-av">' + avatarSvg(d.avatar) + '</div>' + (ate ? '<div class="cafe-yum">Yum!</div>' : '') + '</div>';
    h += '<div class="wallet-row"><span>' + coin('food') + ' <b class="mono">' + w.food + '</b>&nbsp;food coins</span><span class="note">Eats right away, no bag needed</span></div><div class="shelf">';
    CAFE.forEach(function (it) {
      var pr = cafePrice(it), can = w.food >= pr;
      h += '<div class="item"><div class="item-art"><svg viewBox="140 120 120 90">' + dishSvg(it.id) + '</svg></div><div class="grow"><strong>' + esc(it.name) + '</strong><br><small>' + esc(it.blurb) + ' Food +' + it.food + (it.energy ? ', Energy +' + it.energy : '') + '.' +
        (can ? '' : ' <b class="why">Need ' + (pr - w.food) + ' more food coin' + (pr - w.food === 1 ? '' : 's') + '</b>') + '</small></div>' +
        '<button class="btn primary' + (can ? '' : ' wait') + '" type="button" data-pact="eatOut" data-item="' + it.id + '">' + coin('food') + ' ' + pr + '</button></div>';
    });
    return h + '</div><p class="note">Kitchen chores earn food coins. Meals from the Store go in your bag so you can feed your pet anywhere, or at the kitchen table at home.</p>';
  }
  function eatOut(pid, id) {
    var it = null; CAFE.forEach(function (x) { if (x.id === id) it = x; }); if (!it) return;
    var pr = cafePrice(it), ok = false;
    act(pid, function (n, w, up) {
      if (w.food < pr) { C().toast(it.name + ' costs ' + pr + ' food coins and you have ' + w.food + '. Kitchen chores earn them.', true); return false; }
      n.food += it.food; n.energy += it.energy; up.coinsFood = w.food - pr; ok = true;
    }).then(function () { if (ok) { G.cafe = { pid: pid, id: id, t: Date.now() }; C().schedule(); setTimeout(C().schedule, 8100); } }, function () {});
  }
  function whyNot(have, coins, price, kind) {
    if (have >= PANTRY_CAP) return ' <b class="why">Bag full</b>';
    if (coins < price) return ' <b class="why">Need ' + (price - coins) + ' more ' + kind + ' coin' + (price - coins === 1 ? '' : 's') + '</b>';
    return '';
  }
  function storeHtml(pid) {
    var st = state(pid), w = st.wallet, pr = prices();
    return '<div class="store">' + (hostScene('store') || '<div class="shop-scene"><div class="shopkeeper">' + window.CHAR.drawAvatar({ skin: 2, hair: 'curly', hairColor: 4, eyes: 'happy', top: 'tee', topColor: 3, acc: 'cap' }) + '</div>' +
      '<div class="speech">Welcome! Meals keep your pet full, and bath kits (soap and shampoo) keep it clean.</div></div>') +
      '<div class="wallet-row"><span>' + coin('food') + ' <b class="mono">' + w.food + '</b>/' + pr.foodCap + ' food coins</span><span>' + coin('care') + ' <b class="mono">' + w.care + '</b>/' + pr.careCap + ' care coins</span></div>' +
      ((w.foodOver || w.careOver) ? '<p class="note">Your coin purse is full, so extra coins spill out. Spend them before earning more.</p>' : '') +
      '<div class="shelf">' +
      '<div class="item"><div class="item-art"><svg viewBox="0 0 60 50"><ellipse cx="30" cy="36" rx="26" ry="10" fill="#e9e3d6"/><ellipse cx="30" cy="32" rx="20" ry="9" fill="#c9793a"/><circle cx="22" cy="28" r="6" fill="#e8453c"/><circle cx="34" cy="26" r="7" fill="#7fc15a"/><circle cx="40" cy="31" r="5" fill="#f2a93b"/></svg></div>' +
      '<div class="grow"><strong>Meal</strong><br><small>Fills food +' + MEAL_GAIN + '. In your bag: ' + w.meals + ' of ' + PANTRY_CAP + '.' + whyNot(w.meals, w.food, pr.meal, 'food') + '</small></div>' +
      '<button class="btn primary' + (w.food >= pr.meal && w.meals < PANTRY_CAP ? '' : ' wait') + '" type="button" data-pact="buy" data-item="meal">' + coin('food') + ' ' + pr.meal + '</button></div>' +
      '<div class="item"><div class="item-art"><svg viewBox="0 0 60 50"><rect x="8" y="22" width="22" height="16" rx="5" fill="#f7a8c8"/><rect x="36" y="10" width="14" height="30" rx="4" fill="#6fc3e8"/><rect x="39" y="5" width="8" height="7" rx="2" fill="#3a8ed8"/><circle cx="14" cy="16" r="4" fill="#fff" stroke="#9ad6ff"/><circle cx="24" cy="12" r="3" fill="#fff" stroke="#9ad6ff"/></svg></div>' +
      '<div class="grow"><strong>Bath kit</strong><br><small>Soap and shampoo. Clean +' + BATH_GAIN + ' at home. In your bag: ' + w.kits + ' of ' + PANTRY_CAP + '.' + whyNot(w.kits, w.care, pr.kit, 'care') + '</small></div>' +
      '<button class="btn primary' + (w.care >= pr.kit && w.kits < PANTRY_CAP ? '' : ' wait') + '" type="button" data-pact="buy" data-item="kit">' + coin('care') + ' ' + pr.kit + '</button></div></div>' +
      '<p class="note">In your bag: ' + w.meals + ' meal' + (w.meals === 1 ? '' : 's') + ', ' + w.kits + ' bath kit' + (w.kits === 1 ? '' : 's') + '. Kitchen chores earn food coins; showers, teeth and hair earn care coins.</p></div>';
  }
  function parkHtml(pid) {
    var st = state(pid), w = st.wallet;
    if (G.game && G.game.kind === 'play') return '<div class="scene park-scene" id="scene"><div class="scene-pet" id="scenePet">' + petSvg(st.pet, 'happy', st.flags) + '</div><div id="gameLayer" class="g-layer"></div></div>';
    return '<div class="scene park-scene"><div class="scene-pet">' + petSvg(st.pet, st.mood.key, st.flags) + '</div></div>' +
      '<p>' + (w.energy ? 'You have ' + w.energy + ' play time' + (w.energy > 1 ? 's' : '') + ' from exercise chores.' : 'No play time left. Exercise chores (going outside, jumping jacks, sports) earn play time.') + '</p>' +
      '<button class="btn primary block" type="button" data-pact="startPlay"' + (w.energy ? '' : ' disabled') + '>Play fetch</button>';
  }
  function walkTitle(room) { return G.game ? (G.game.kind === 'bath' ? 'Bath time' : 'Bedtime') : ({ wardrobe: 'Wardrobe', book: 'Collection', final: 'Fully grown!' })[room.panel] || room.title; }
  /* bath and bedtime scenes: drawn as one picture (fixed shape, so the mud and stars line up with the pet) */
  function sceneSvg(inner) { return '<svg class="sc-layer" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">' + inner + '</svg>'; }
  function bathScene(owner) {
    var st = state(owner), d = st.doc, tiles = '';
    for (var y = 0; y < 170; y += 26) for (var x = (y / 26) % 2 ? -13 : 0; x < 400; x += 26) tiles += '<rect x="' + x + '" y="' + y + '" width="25" height="25" fill="#dff0f6" stroke="#c4dde8"/>';
    var back = '<rect width="400" height="260" fill="#cfe6ef"/>' + tiles + '<rect y="168" width="400" height="92" fill="#e8d7c0"/><rect y="168" width="400" height="6" fill="#d2bea2"/>' +
      '<rect x="30" y="58" width="78" height="8" rx="3" fill="#b98a58"/><rect x="38" y="30" width="16" height="28" rx="5" fill="#ff8fb8"/><rect x="42" y="24" width="8" height="8" rx="2" fill="#e3528f"/><rect x="60" y="36" width="14" height="22" rx="4" fill="#6fc3e8"/><rect x="80" y="40" width="18" height="18" rx="9" fill="#ffd23f"/>' +
      '<rect x="20" y="90" width="6" height="60" fill="#c0ccd6"/><rect x="14" y="96" width="34" height="50" rx="6" fill="#f29bb5"/><rect x="14" y="110" width="34" height="5" fill="#fff" opacity=".7"/>' +
      '<rect x="244" y="88" width="10" height="38" rx="4" fill="#c0ccd6"/><circle cx="249" cy="88" r="9" fill="#c0ccd6"/><rect x="230" y="82" width="20" height="6" rx="3" fill="#c0ccd6"/>' +
      '<ellipse cx="250" cy="152" rx="132" ry="18" fill="#ffffff" stroke="#b9c6d6" stroke-width="3"/><ellipse cx="250" cy="156" rx="118" ry="11" fill="#8fd0ee"/>';
    var front = '<path d="M118 152 Q118 238 170 242 L330 242 Q382 238 382 152 Z" fill="#ffffff" stroke="#b9c6d6" stroke-width="3"/><path d="M130 175 Q250 190 370 175" stroke="#e7eef4" stroke-width="5" fill="none"/>' +
      '<rect x="146" y="238" width="16" height="16" rx="4" fill="#c0ccd6"/><rect x="338" y="238" width="16" height="16" rx="4" fill="#c0ccd6"/>' +
      [[140, 150, 15], [168, 144, 12], [196, 152, 14], [300, 148, 13], [330, 152, 15], [358, 146, 11], [226, 156, 10], [272, 156, 10]].map(function (b) { return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#ffffff" opacity=".92"/>'; }).join('') +
      '<g transform="translate(150 128)"><ellipse cx="10" cy="10" rx="14" ry="10" fill="#ffd23f"/><circle cx="20" cy="-2" r="8" fill="#ffd23f"/><path d="M27 -2 l8 2 -8 3z" fill="#ff8a2a"/><circle cx="22" cy="-4" r="1.6" fill="#2b2233"/></g>';
    return '<div class="room scene-room" id="scene">' + sceneSvg(back) +
      (d.pet ? '<div class="scene-pet sc-bath-pet" id="scenePet">' + petSvg(d.pet, G.game && G.game.mood || st.mood.key, st.flags) + '</div>' : '') +
      sceneSvg(front) + '<div class="scene-av sc-av">' + avatarSvg(d.avatar) + '</div><div id="gameLayer" class="g-layer"></div></div>';
  }
  function bedScene(owner) {
    var st = state(owner), d = st.doc, p = C().person(owner), col = (p && C().pColor(p)) || '#6f93c8';
    var back = '<rect width="400" height="260" fill="#5b5f9a"/><rect y="190" width="400" height="70" fill="#7a5a3a"/>' + [0, 1, 2, 3].map(function (i) { return '<rect y="' + (198 + i * 16) + '" width="400" height="1.5" fill="#6a4c30"/>'; }).join('') +
      '<rect x="24" y="22" width="110" height="88" rx="6" fill="#2a2f5a" stroke="#c9a44c" stroke-width="5"/><rect x="77" y="22" width="4" height="88" fill="#c9a44c"/><rect x="24" y="64" width="110" height="4" fill="#c9a44c"/>' +
      '<circle cx="104" cy="44" r="12" fill="#fff6c8"/><circle cx="110" cy="40" r="11" fill="#2a2f5a"/>' + [[40, 36], [58, 50], [48, 86], [100, 92], [66, 32]].map(function (s) { return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="1.8" fill="#fff"/>'; }).join('') +
      '<rect x="40" y="168" width="64" height="62" rx="6" fill="#8a5a34"/><rect x="46" y="190" width="52" height="3" fill="#6a4424"/><path d="M58 168 L86 168 L80 146 L64 146 Z" fill="#ffe27a"/><circle cx="72" cy="156" r="34" fill="#ffe27a" opacity=".18"/>' +
      '<rect x="150" y="84" width="236" height="104" rx="18" fill="#8a5a34"/><rect x="162" y="96" width="212" height="12" rx="6" fill="#a8774a"/>' +
      '<rect x="146" y="160" width="244" height="64" rx="12" fill="#fbf6ee"/><ellipse cx="318" cy="166" rx="48" ry="17" fill="#ffffff" stroke="#e2dccf" stroke-width="2"/>';
    var front = '<path d="M146 196 L390 196 L390 232 Q390 244 378 244 L158 244 Q146 244 146 232 Z" fill="' + col + '"/><rect x="146" y="192" width="244" height="10" rx="5" fill="#ffffff"/>' +
      [0, 1, 2, 3, 4, 5].map(function (i) { return '<rect x="' + (150 + i * 40) + '" y="206" width="20" height="16" fill="#ffffff" opacity=".25"/>'; }).join('') + '<rect x="140" y="236" width="256" height="16" rx="6" fill="#8a5a34"/>';
    return '<div class="room scene-room" id="scene">' + sceneSvg(back) +
      (d.pet ? '<div class="scene-pet sc-bed-pet" id="scenePet">' + petSvg(d.pet, G.game && G.game.mood || st.mood.key, st.flags) + '</div>' : '') +
      sceneSvg(front) + '<div class="scene-av sc-av sc-av-bed">' + avatarSvg(d.avatar) + '</div><div id="gameLayer" class="g-layer"></div></div>';
  }
  function houseHtml(owner, mine, room) {
    var st = state(owner), d = st.doc, p = C().person(owner), w = st.wallet;
    if (room && room.walk) {
      if (G.game && G.game.kind === 'bath') return bathScene(owner);
      if (G.game && G.game.kind === 'sleep') return bedScene(owner);
      if (room.panel === 'wardrobe') return ADV.wardrobeHtml(owner);
      if (room.panel === 'book') return ADV.collectionHtml(owner);
      if (room.panel === 'final' && d.pet) return '<div class="card attn"><h2>' + esc(d.pet.name) + ' is fully grown!</h2><p>' + esc(d.pet.name) + ' can move in for good. ' + window.CHAR.PROF + ' will bring you a new partner.</p><button class="btn primary" type="button" data-pact="retire">Move ' + esc(d.pet.name) + ' in</button></div>';
      return '';
    }
    var shelf = (d.house || []).slice(-9), toys = window.ADV ? ADV.toysIn(owner) : [];
    var tab = mine && room && room.tab ? room.tab : 'room';
    var tabs = mine && !G.game ? '<div class="seg town" role="group">' + [['room', 'Room'], ['wardrobe', 'Wardrobe'], ['book', 'Collection']].map(function (t) { return '<button type="button" data-pact="htab" data-t="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' : '';
    if (mine && tab === 'wardrobe') return tabs + ADV.wardrobeHtml(owner);
    if (mine && tab === 'book') return tabs + ADV.collectionHtml(owner);
    var h = '<div class="room indoor" id="scene">' +
      '<div class="rug"></div>' + (mine ? '<div class="furn bed" title="Bed"></div><div class="furn tub" title="Bathtub"></div>' : '') +
      shelf.map(function (x, i) { return '<div class="room-pet" style="left:' + (4 + (i % 3) * 31) + '%;top:' + (4 + Math.floor(i / 3) * 18) + '%">' + CRE.draw(x.sp, 2, x.pal, i % 2 ? 'happy' : 'ok') + '</div>'; }).join('') +
      (d.pet ? '<div class="scene-pet" id="scenePet">' + petSvg(d.pet, G.game && G.game.mood || st.mood.key, st.flags) + '</div>' : '') +
      '<div class="scene-av">' + avatarSvg(d.avatar) + '</div>' +
      toys.map(function (id, i) { return '<div class="room-toy" style="left:' + (6 + i * 14) + '%">' + ADV.itemArt(id) + '</div>'; }).join('') +
      (d.egg ? '<div class="room-egg egg-bob" title="Rare egg">' + CRE.egg() + '</div>' : '') +
      '<div id="gameLayer" class="g-layer"></div></div>';
    if (G.game) return h;
    h = tabs + h;
    if (d.egg) h += '<div class="egg-note"><span class="egg-mini">' + CRE.egg() + '</span><span><strong>' + (mine ? 'Your' : esc(p.name) + '’s') + ' rare egg!</strong> ' + (mine ? 'It hatches after ' + (d.pet ? esc(d.pet.name) + ' is fully grown and moves in.' : 'you pick your next partner.') : 'Found on an adventure when the whole house was clean.') + '</span></div>';
    if (!mine) {
      h += '<p><strong>' + esc(p.name) + '’s house.</strong> ' + (d.pet ? esc(d.pet.name) + ' the ' + esc(speciesName(d.pet)) + ' is level ' + (d.pet.level || 0) + '.' : '') +
        (shelf.length ? ' ' + shelf.length + ' grown pet' + (shelf.length > 1 ? 's live' : ' lives') + ' here.' : '') + '</p>' + (d.pet ? miniBars(st.needs) : '');
      if (shelf.length) h += houseList(shelf);
      return h;
    }
    if (d.pet && d.pet.final) h += '<div class="card attn"><h2>Fully grown!</h2><p>' + esc(d.pet.name) + ' can move in for good. ' + window.CHAR.PROF + ' will bring you a new partner.</p><button class="btn primary" type="button" data-pact="retire">Move ' + esc(d.pet.name) + ' in</button></div>';
    h += '<div class="care">' +
      '<button type="button" class="care-btn" data-pact="startBath"' + (w.kits ? '' : ' disabled') + '><span class="care-v">Bath</span><span class="care-n mono">' + w.kits + ' kit</span></button>' +
      '<button type="button" class="care-btn" data-pact="startSleep"' + (w.rest ? '' : ' disabled') + '><span class="care-v">Tuck in</span><span class="care-n mono">' + w.rest + ' left</span></button></div>' +
      '<p class="note">Bath kits come from the Store. Tuck-ins come from bedtime chores.</p>' +
      '<div class="wrap"><button class="btn small" type="button" data-pact="avEdit">Change my look</button></div>' + (shelf.length ? houseList(shelf) : '');
    return h;
  }
  /* ----- pet card: tap a pet in town or at home to see how it's doing ----- */
  var ABIL_TXT = { Fire: 'Lights up the dark cave', Water: 'Swims you across deep water', Leaf: 'Climbs the vines', Mythic: 'Lights the cave, swims and climbs', Cosmic: 'Lights the cave, swims and climbs' };
  var STAGE_TXT = ['Baby', 'Evolved', 'Fully grown'];
  function careTip(st) {
    var n = st.needs, w = st.wallet, low = NEEDS.slice().sort(function (a, b) { return n[a.k] - n[b.k]; })[0];
    if (n[low.k] >= GOOD) return 'All four needs are good!';
    return { food: w.meals ? 'Tap Feed to give a meal.' : 'Buy a meal at the Store. Kitchen chores earn food coins.', clean: w.kits ? 'Walk to the tub at home for a bath.' : 'Buy a bath kit at the Store.',
      rest: w.rest ? 'Tuck it in: walk to the bed at home.' : 'Bedtime chores earn tuck-ins.', energy: w.energy ? 'Play fetch at the Park.' : 'Exercise chores earn play time.' }[low.k];
  }
  function petCardHtml(o) {
    var st = state(o.owner), d = st.doc, mine = o.owner === me(), p = o.grown || d.pet; if (!p) return '';
    var sp = CRE.byId(p.sp) || { names: ['', '', ''], type: '' }, stage = o.grown ? 2 : (p.stage || 0), who = C().person(o.owner), I = window.ADV ? ADV.ITEMS : {};
    var h = '<div class="pcard" role="dialog" aria-label="' + esc(p.name) + '"><button type="button" class="pcard-x" data-wact="closeCard" aria-label="Close">&times;</button>' +
      '<div class="pcard-top"><div class="pcard-art">' + (o.grown ? CRE.draw(p.sp, 2, p.pal || 0, 'happy') : petSvg(p, st.mood.key, st.flags)) + '</div>' +
      '<div class="pcard-id"><h3>' + esc(p.name) + '</h3><div class="note">' + esc(sp.names[stage]) + ' &middot; ' + esc(sp.type) + ' type</div>' +
      '<div class="pcard-lv">' + (o.grown ? 'Moved in ' + esc(C().fmtDate(p.retired)) : 'Level ' + (p.level || 0) + ' &middot; ' + STAGE_TXT[stage]) + '</div>' +
      (!mine && who ? '<div class="note">' + esc(who.name) + '’s ' + (o.grown ? 'grown pet' : 'pet') + '</div>' : '') + '</div></div>';
    if (!o.grown) {
      h += '<div class="pcard-needs">' + NEEDS.map(function (x) {
        var v = st.needs[x.k]; return '<div class="pn' + (v >= GOOD ? ' full' : v < LOW ? ' low' : '') + '"><span>' + x.label + '</span><span class="bar"><i style="width:' + v + '%"></i></span><b class="mono">' + v + '</b></div>';
      }).join('') + '</div>';
      h += '<p class="pcard-mood"><b>' + esc(st.mood.label) + '</b>' + (mine ? ' &middot; ' + esc(careTip(st)) : '') + '</p>';
      var lv = p.level || 0, next = stage === 0 ? EVO1 : stage === 1 ? EVO2 : 0;
      h += '<p class="note pcard-grow">' + (p.final ? 'Fully grown! It can move into the house.' : 'Goes up a level on any day all four needs reach ' + GOOD + (p.leveledOn === C().today() ? ' (done today!)' : '') + '. ' +
        (next ? (stage === 0 ? 'Evolves' : 'Evolves again') + ' at level ' + next + ' (' + Math.max(0, next - lv) + ' to go).' : '')) + '</p>';
    }
    if (window.Defense && window.Defense.kit) { var K = window.Defense.kit, a = K.atk(p.sp); h += '<div class="pcard-row"><span class="pcard-k">Mess Defense</span><span><b>' + esc(a.n) + '</b> &middot; ' + esc(K.atkTitle(a)) + '<small class="note">' + esc(K.atkLine(a)) + '</small></span></div>'; }
    if (ABIL_TXT[sp.type]) h += '<div class="pcard-row"><span class="pcard-k">At the beach</span><span>' + ABIL_TXT[sp.type] + '</span></div>';
    if (!o.grown && (p.wear || p.dye)) h += '<div class="pcard-row"><span class="pcard-k">Wearing</span><span>' + [p.wear, p.dye].filter(function (x) { return x && I[x]; }).map(function (x) { return esc(I[x].name); }).join(', ') + '</span></div>';
    if (!o.grown && p.hatched) { var days = Math.max(0, C().daysBetween(p.hatched, C().today())); h += '<div class="pcard-row"><span class="pcard-k">Together</span><span>Since ' + esc(C().fmtDate(p.hatched)) + ' (' + days + ' day' + (days === 1 ? '' : 's') + ')</span></div>'; }
    return h + '</div>';
  }
  function houseList(list) {
    return '<div class="list">' + list.slice().reverse().map(function (x) {
      return '<div class="hrow"><span class="mini-pet">' + CRE.draw(x.sp, 2, x.pal, 'ok') + '</span><div class="desc">' + esc(x.name) + '<small>' + esc((CRE.byId(x.sp) || { names: ['', '', ''] }).names[2]) + ' &middot; moved in ' + esc(C().fmtDate(x.retired)) + '</small></div></div>';
    }).join('') + '</div>';
  }

  /* ----- indoor mini-games ----- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mountGame() {
    var g = G.game, layer = document.getElementById('gameLayer'); if (!g || !layer) return;
    var name = esc((doc(me()).pet || {}).name || ''), h = '';
    if (g.kind === 'bath') {
      if (!g.spots) { var walkIn = G.room && G.room.walk; g.spots = []; for (var j = 0; j < 8; j++) g.spots.push(walkIn ? { x: rnd(50, 78), y: rnd(26, 58), on: true } : { x: rnd(58, 82), y: rnd(50, 90), on: true }); }
      h = '<div class="g-tip">Scrub ' + name + ' clean! Rub or tap the mud.</div><div class="suds"></div>' + g.spots.map(function (s, k) {
        return s.on ? '<button type="button" class="g-mud" data-pact="scrub" data-i="' + k + '" style="left:' + s.x + '%;top:' + s.y + '%" aria-label="Mud"></button>' : '<span class="g-bubble" style="left:' + s.x + '%;top:' + s.y + '%"></span>';
      }).join('');
    } else if (g.kind === 'sleep') {
      if (!g.stars) { g.stars = []; for (var q = 0; q < 5; q++) g.stars.push({ x: rnd(8, 88), y: rnd(6, 48), on: true }); }
      h = '<div class="g-night"></div><div class="g-tip light">Count the stars so ' + name + ' can fall asleep</div>' + g.stars.map(function (s, k) {
        return s.on ? '<button type="button" class="g-star" data-pact="star" data-i="' + k + '" style="left:' + s.x + '%;top:' + s.y + '%" aria-label="Star"><svg viewBox="0 0 30 30"><path d="M15 2 L18.5 11 L28 11.5 L20.5 17.5 L23 27 L15 21.5 L7 27 L9.5 17.5 L2 11.5 L11.5 11 Z" fill="#ffe27a" stroke="#e0b030" stroke-width="1.5"/></svg></button>' : '';
      }).join('');
    } else if (g.kind === 'play') {
      if (!g.ball) g.ball = { x: 70, y: 40, hits: 0 };
      h = '<div class="g-tip">Throw the ball! Tap it ' + (6 - g.ball.hits) + ' more times</div><button type="button" class="g-ball" data-pact="ball" style="left:' + g.ball.x + '%;top:' + g.ball.y + '%" aria-label="Ball"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#3a8ed8" stroke="#1f5a99" stroke-width="2"/><path d="M6 16 Q20 24 34 16 M8 28 Q20 20 32 28" stroke="#fff" stroke-width="3" fill="none"/></svg></button>';
    }
    layer.innerHTML = h;
  }
  function setPetMood(m) {
    var el = document.getElementById('scenePet'), st = state(me());
    if (el && st.pet) el.innerHTML = petSvg(st.pet, m, st.flags);
  }
  function endGame(fn) {
    var pid = me();
    fn(pid).then(function () { G.game = null; C().schedule(); }, function () { G.game = null; C().schedule(); });
  }
  function scrub(i) {
    var g = G.game; if (!g || !g.spots || !g.spots[i] || !g.spots[i].on) return;
    g.spots[i].on = false; mountGame();
    if (g.spots.every(function (s) { return !s.on; })) { setPetMood('happy'); setTimeout(function () { endGame(bath); }, 700); }
  }
  document.addEventListener('touchmove', function (e) {
    if (!G.game || G.game.kind !== 'bath' || !e.touches) return;
    var t = e.touches[0], el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.closest) { var m = el.closest('.g-mud'); if (m) { if (e.cancelable) e.preventDefault(); scrub(Number(m.getAttribute('data-i'))); } }
  }, { passive: false });
  document.addEventListener('mouseover', function (e) {
    if (!G.game || G.game.kind !== 'bath' || !(e.buttons & 1)) return;
    var m = e.target.closest ? e.target.closest('.g-mud') : null; if (m) scrub(Number(m.getAttribute('data-i')));
  });

  /* ================= events ================= */
  function onClick(e) {
    var b = e.target.closest ? e.target.closest('[data-pact]') : null;
    if (!b) return false;
    var a = b.getAttribute('data-pact'), pid = me(), g = G.game;
    switch (a) {
      case 'av': var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'); G.dirtyAvatar[k] = /^\d+$/.test(v) ? Number(v) : v;
        if (k === 'hairFx' && v !== 'none') G.dirtyAvatar.hair2 = window.CHAR.AV.hairColor.indexOf(window.CHAR.hair2Default(v));
        C().schedule(); break;
      case 'avSpin': spinTo(G.spin + Number(b.getAttribute('data-d'))); break;
      case 'avRandom': var keepH = G.dirtyAvatar && G.dirtyAvatar.height; G.dirtyAvatar = window.CHAR.randAvatar(); if (keepH) G.dirtyAvatar.height = keepH; C().schedule(); break;
      case 'avEdit': G.creator = true; G.dirtyAvatar = null; G.room = null; if (window.World) window.World.unmount(); C().go(); break;
      case 'avCancel': G.creator = false; G.dirtyAvatar = null; if (G.adultId) { G.adultId = null; S().avEditFor = null; } C().go(); break;
      case 'avSave':
        var target = G.adultId || pid, adultSave = !!G.adultId, dd = { avatar: G.dirtyAvatar };
        if (!target) break;
        if (adultSave) { dd.adult = true; if (doc(target).spot === undefined) dd.spot = ''; }
        DB.commit([{ t: 'merge', c: 'pets', id: target, d: dd }]).then(function () { G.creator = false; G.dirtyAvatar = null; if (adultSave) { G.adultId = null; S().avEditFor = null; } C().toast('Looking good!'); C().go(); }, C().fail);
        break;
      case 'talk': G.talk++; C().schedule(); break;
      case 'pick': G.pick = b.getAttribute('data-sp'); C().schedule(); break;
      case 'unpick': G.pick = null; C().schedule(); break;
      case 'leave': G.game = null; S().bankForm = null; if (window.World) window.World.closeRoom(); else G.room = null; break;   /* closeRoom needs the room to put you back outside its door */
      case 'htab': if (G.room) { G.room.tab = b.getAttribute('data-t'); C().schedule(); } break;
      case 'wear': case 'dye':
        var up = {}; up[a] = b.getAttribute('data-id') || '';
        var np = assign({}, doc(pid).pet); np[a] = up[a];
        DB.commit([{ t: 'update', c: 'pets', id: pid, d: { pet: np } }]).then(function () { C().schedule(); }, C().fail);
        break;
      case 'goRegion': G.room = null; if (b.getAttribute('data-r') === 'defense' && window.Defense) window.Defense.open(pid); else if (b.getAttribute('data-r') === 'bed' && window.BedDefense) window.BedDefense.open(pid); else if (window.World) window.World.enterRegion(b.getAttribute('data-r')); break;
      case 'buy': buy(pid, b.getAttribute('data-item')).then(function (r) { if (r !== null || true) C().schedule(); }); break;
      case 'eatOut': eatOut(pid, b.getAttribute('data-item')); break;
      case 'feed': feed(pid).then(function () { if (window.World) window.World.petEats(); C().schedule(); }); break;
      case 'startBath': G.game = { kind: 'bath', mood: 'ok', id: Date.now() }; C().schedule(); break;
      case 'startSleep': G.game = { kind: 'sleep', mood: 'lazy', id: Date.now() }; C().schedule(); break;
      case 'startPlay': G.game = { kind: 'play', id: Date.now() }; C().schedule(); break;
      case 'scrub': scrub(Number(b.getAttribute('data-i'))); break;
      case 'star':
        g.stars[Number(b.getAttribute('data-i'))].on = false; mountGame();
        if (g.stars.every(function (s) { return !s.on; })) { g.mood = 'asleep'; setPetMood('asleep'); setTimeout(function () { endGame(sleep); }, 1300); }
        break;
      case 'ball':
        g.ball.hits++; g.ball.x = rnd(8, 82); g.ball.y = rnd(8, 60);
        var pe = document.getElementById('scenePet'); if (pe) { pe.className = 'scene-pet hop'; setTimeout(function () { pe.className = 'scene-pet'; }, 400); }
        if (g.ball.hits >= 6) { setPetMood('happy'); document.getElementById('gameLayer').innerHTML = '<div class="g-tip">Great game!</div>'; setTimeout(function () { endGame(play); }, 700); }
        else mountGame();
        break;
      case 'retire':
        var d = doc(pid), house = (d.house || []).concat([{ sp: d.pet.sp, pal: d.pet.pal, name: d.pet.name, hatched: d.pet.hatched, retired: C().today() }]);
        DB.commit([{ t: 'update', c: 'pets', id: pid, d: { pet: null, house: house } }]).then(function () {
          G.talk = 0; G.pick = null; G.room = null; if (window.World) window.World.unmount();
          C().toast(d.pet.name + ' moved into your house!'); C().go();
        }, C().fail);
        break;
      case 'closeCeleb': var c = document.querySelector('.celebrate'); if (c) c.parentNode.removeChild(c); break;
      default: return false;
    }
    return true;
  }
  function onSubmit(f, kind) {
    if (kind !== 'hatch') return false;
    var pid = me(), d = doc(pid), fromEgg = G.pick === '@egg' && d.egg, sp = CRE.byId(fromEgg ? d.egg.sp : G.pick); if (!sp) return true;
    var name = (document.getElementById('petName').value || '').replace(/^\s+|\s+$/g, '') || sp.names[0];
    var t = C().today();
    var pet = { sp: sp.id, pal: fromEgg ? d.egg.pal : CRE.randomPalette(sp), name: name, level: 0, stage: 0, hatched: t, leveledOn: '', final: false, wear: '', dye: '' };
    DB.commit([{ t: 'merge', c: 'pets', id: pid, d: {
      pet: pet, needs: { food: 50, clean: 50, rest: 50, energy: 50 }, needsTs: Date.now(), intro: true, house: d.house || [],
      pantryFood: Math.max(1, num(d.pantryFood)), pantryCare: Math.max(1, num(d.pantryCare))
    } }].concat(fromEgg ? [{ t: 'update', c: 'pets', id: pid, d: { egg: null } }] : [])).then(function () {
      G.pick = null; G.talk = 0;
      var pal = sp.palettes[pet.pal];
      C().toast(name + ' hatched' + (pal && pal.rare ? ' in a rare ' + pal.name + ' color!' : ' in ' + (pal ? pal.name : '') + ' colors!'));
    }, C().fail);
    return true;
  }
  function miniHtml(pid) {
    var d = doc(pid);
    if (!d.avatar && !d.pet) return '';
    var st = state(pid);
    return '<span class="pick-art">' + (d.avatar ? '<span class="pick-av">' + avatarSvg(d.avatar) + '</span>' : '') + (d.pet ? '<span class="pick-pet">' + petSvg(d.pet, st.mood.key, st.flags) + '</span>' : '') + '</span>';
  }
  function reset() { G.game = null; G.talk = 0; G.pick = null; G.dirtyAvatar = null; G.room = null; G.creator = false; if (window.World) window.World.unmount(); }
  window.Pets = {
    render: render, onClick: onClick, onSubmit: onSubmit, reset: reset, miniHtml: miniHtml,
    state: state, prices: prices, feed: feed, petSvg: petSvg, avatarSvg: avatarSvg, speciesName: speciesName, doc: doc,
    roomHtml: roomHtml, mountGame: mountGame, petCardHtml: petCardHtml, hosts: hosts, adultAv: adultAv, kidAv: kidAv, SPOTS: SPOTS, HOST_LINE: HOST_LINE, adultCreatorHtml: adultCreatorHtml, G: G, NEEDS: NEEDS, GOOD: GOOD, LOW: LOW, coin: coin, friendCard: friendCard
  };
})();
