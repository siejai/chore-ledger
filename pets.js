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
  var MEAL_GAIN = 50, BATH_GAIN = 60, SLEEP_GAIN = 60, PLAY_GAIN = 60, PANTRY_CAP = 1, TOKEN_CAP = 2;
  var G = { talk: 0, pick: null, dirtyAvatar: null, room: null, game: null, D: null, creator: false };
  function C() { return window.CL; }
  function S() { return window.CL.S; }
  function esc(s) { return C().esc(s); }
  function doc(pid) { return S().pets[pid] || {}; }
  function me() { var s = S(); return C().isPerson(s.me) ? s.me : null; }
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function num(v) { return Math.max(0, Number(v) || 0); }
  function assign(a, b) { for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  /* Grown-ups are always tall and kids never are, so approvers stand out at a glance. A kid's "Tall" is the medium size. */
  function avatarSvg(a, adult) { return window.CHAR.drawAvatar(adult ? adultAv(a) : kidAv(a)); }
  function kidAv(av) { if (!av || (av.height !== 'tall' && av.height)) return av; var o = assign({}, av); o.height = av.height === 'tall' ? 'medium' : 'small'; return o; }
  /* Grown-ups (parents) have a character but no pet. Their avatar lives in pets/{parentId} with a spot where they hang out in town. */
  var SPOTS = [['bank', 'The bank'], ['store', 'The Store'], ['park', 'The Park'], ['gate', 'Adventure Gate'], ['square', 'Town square'], ['', 'Not in town']];
  var HOST_LINE = { bank: 'Welcome to the bank! Here is your account.', store: 'Welcome to the Store! Meals keep your pet full, and bath kits (soap and shampoo) keep it clean.',
    park: 'Great day for a game of fetch!', gate: 'Big jobs done? Then adventure awaits!', square: 'Hi there! How is your pet doing today?' };
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
  function flagsOf(n) { return { thin: n.food < STARVE, dirty: n.clean < LOW, tired: n.rest < LOW, pudgy: n.energy < LOW }; }
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
        if (w.meals >= PANTRY_CAP) { C().toast('Your bag already holds a meal. Feed your pet first.', true); return false; }
        if (w.food < pr.meal) { C().toast('Not enough food coins. Kitchen chores earn them.', true); return false; }
        up.coinsFood = w.food - pr.meal; up.pantryFood = w.meals + 1;
      } else {
        if (w.kits >= PANTRY_CAP) { C().toast('You already have a bath kit. Use it at home first.', true); return false; }
        if (w.care < pr.kit) { C().toast('Not enough care coins. Self-care chores earn them.', true); return false; }
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
  function creatorHtml(pid, adult) {
    var AV = window.CHAR.AV, L = window.CHAR.AV_LABEL, d = doc(pid);
    var fresh = !G.dirtyAvatar;
    var a = G.dirtyAvatar || (d.avatar ? assign({}, d.avatar) : window.CHAR.randAvatar());
    if (adult) a.height = 'tall';
    else if (a.height !== 'medium') a.height = 'small';
    G.dirtyAvatar = a;
    function sw(key, i, color) { return '<button type="button" class="sw" style="background:' + color + '" data-pact="av" data-k="' + key + '" data-v="' + i + '" aria-pressed="' + (a[key] === i) + '" aria-label="' + key + ' ' + (i + 1) + '"></button>'; }
    function word(key) { return AV[key].map(function (v) { return '<button type="button" class="cat" data-pact="av" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (a[key] === v) + '">' + L[key][v] + '</button>'; }).join(''); }
    return '<section class="stack creator"><div><h2>' + (d.avatar ? 'Change your look' : adult ? 'Design your character' : 'Make your character') + '</h2><p class="note">' + (adult ? 'The kids see you in town at the spot you pick.' : 'This is you in the town. Everyone sees it when they visit.') + '</p></div>' +
      '<div class="av-preview">' + avatarSvg(a, adult) + '</div>' +
      (adult ? '' : '<div class="av-row"><span class="av-l">Height</span><div class="wrap">' + [['small', 'Small'], ['medium', 'Tall']].map(function (h) { return '<button type="button" class="cat" data-pact="av" data-k="height" data-v="' + h[0] + '" aria-pressed="' + (a.height === h[0]) + '">' + h[1] + '</button>'; }).join('') + '</div></div>') +
      '<div class="av-row"><span class="av-l">Build</span><div class="wrap">' + ['slim', 'medium', 'large'].map(function (v) { return '<button type="button" class="cat" data-pact="av" data-k="build" data-v="' + v + '" aria-pressed="' + ((a.build || 'medium') === v) + '">' + window.CHAR.AV_LABEL.build[v] + '</button>'; }).join('') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Skin</span><div class="wrap">' + AV.skin.map(function (c, i) { return sw('skin', i, c); }).join('') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Hair</span><div class="wrap">' + word('hair') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Hair color</span><div class="wrap">' + AV.hairColor.map(function (c, i) { return sw('hairColor', i, c); }).join('') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Eyes</span><div class="wrap">' + word('eyes') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Outfit</span><div class="wrap">' + word('top') + '</div></div>' +
      '<div class="av-row"><span class="av-l">Outfit color</span><div class="wrap">' + AV.topColor.map(function (c, i) { return sw('topColor', i, c); }).join('') + '</div></div>' +
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
    return h + '<div class="starters">' + eggBtn + CRE.starters().map(function (sp) {
      return '<button type="button" class="starter" data-pact="pick" data-sp="' + sp.id + '"><span class="starter-art">' + CRE.draw(sp.id, 0, 0, 'ok') + '</span>' +
        '<strong>' + esc(sp.names[0]) + '</strong><small>' + esc(sp.type) + ' type</small><small class="note">' + esc(sp.blurb) + '</small></button>';
    }).join('') + '</div></section>';
  }

  /* ================= indoor screens (opened from the town) ================= */
  function roomHtml(room, pid) {
    var owner = room.owner, head = '<div class="room-top"><strong>' + esc(room.title) + '</strong><button class="btn small" type="button" data-pact="leave">Leave</button></div>';
    if (room.kind === 'store') return head + storeHtml(pid);
    if (room.kind === 'bank') { S().bankPid = pid; return head + hostScene('bank') + '<div class="game-bank">' + C().accountHtml(G.D, pid, false) + '</div>'; }
    if (room.kind === 'park') return head + (G.game ? '' : hostScene('park')) + parkHtml(pid);
    if (room.kind === 'house') return head + houseHtml(owner, owner === pid, room);
    if (room.kind === 'gate') return head + hostScene('gate') + (window.ADV ? ADV.gateHtml(pid) : '');
    return head;
  }
  function coin(kind) {
    return kind === 'food'
      ? '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#f2b632" stroke="#b07d12" stroke-width="1.5"/><path d="M10 5 q3 0 3 3.5 q0 3.5 -3 6.5 q-3 -3 -3 -6.5 q0 -3.5 3 -3.5 Z" fill="#e8453c"/></svg>'
      : '<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#8fd3f2" stroke="#3a8ed8" stroke-width="1.5"/><circle cx="8" cy="9" r="3" fill="#fff"/><circle cx="12.5" cy="12" r="2" fill="#fff"/></svg>';
  }
  function storeHtml(pid) {
    var st = state(pid), w = st.wallet, pr = prices();
    return '<div class="store">' + (hostScene('store') || '<div class="shop-scene"><div class="shopkeeper">' + window.CHAR.drawAvatar({ skin: 2, hair: 'curly', hairColor: 4, eyes: 'happy', top: 'tee', topColor: 3, acc: 'cap' }) + '</div>' +
      '<div class="speech">Welcome! Meals keep your pet full, and bath kits (soap and shampoo) keep it clean.</div></div>') +
      '<div class="wallet-row"><span>' + coin('food') + ' <b class="mono">' + w.food + '</b>/' + pr.foodCap + ' food coins</span><span>' + coin('care') + ' <b class="mono">' + w.care + '</b>/' + pr.careCap + ' care coins</span></div>' +
      ((w.foodOver || w.careOver) ? '<p class="note">Your coin purse is full, so extra coins spill out. Spend them before earning more.</p>' : '') +
      '<div class="shelf">' +
      '<div class="item"><div class="item-art"><svg viewBox="0 0 60 50"><ellipse cx="30" cy="36" rx="26" ry="10" fill="#e9e3d6"/><ellipse cx="30" cy="32" rx="20" ry="9" fill="#c9793a"/><circle cx="22" cy="28" r="6" fill="#e8453c"/><circle cx="34" cy="26" r="7" fill="#7fc15a"/><circle cx="40" cy="31" r="5" fill="#f2a93b"/></svg></div>' +
      '<div class="grow"><strong>Meal</strong><br><small>Fills food +' + MEAL_GAIN + '. You can carry ' + PANTRY_CAP + '.</small></div>' +
      '<button class="btn primary" type="button" data-pact="buy" data-item="meal"' + (w.food >= pr.meal && w.meals < PANTRY_CAP ? '' : ' disabled') + '>' + coin('food') + ' ' + pr.meal + '</button></div>' +
      '<div class="item"><div class="item-art"><svg viewBox="0 0 60 50"><rect x="8" y="22" width="22" height="16" rx="5" fill="#f7a8c8"/><rect x="36" y="10" width="14" height="30" rx="4" fill="#6fc3e8"/><rect x="39" y="5" width="8" height="7" rx="2" fill="#3a8ed8"/><circle cx="14" cy="16" r="4" fill="#fff" stroke="#9ad6ff"/><circle cx="24" cy="12" r="3" fill="#fff" stroke="#9ad6ff"/></svg></div>' +
      '<div class="grow"><strong>Bath kit</strong><br><small>Soap and shampoo. Clean +' + BATH_GAIN + ' at home.</small></div>' +
      '<button class="btn primary" type="button" data-pact="buy" data-item="kit"' + (w.care >= pr.kit && w.kits < PANTRY_CAP ? '' : ' disabled') + '>' + coin('care') + ' ' + pr.kit + '</button></div></div>' +
      '<p class="note">In your bag: ' + w.meals + ' meal' + (w.meals === 1 ? '' : 's') + ', ' + w.kits + ' bath kit' + (w.kits === 1 ? '' : 's') + '. Kitchen chores earn food coins; showers, teeth and hair earn care coins.</p></div>';
  }
  function parkHtml(pid) {
    var st = state(pid), w = st.wallet;
    if (G.game && G.game.kind === 'play') return '<div class="scene park-scene" id="scene"><div class="scene-pet" id="scenePet">' + petSvg(st.pet, 'happy', st.flags) + '</div><div id="gameLayer" class="g-layer"></div></div>';
    return '<div class="scene park-scene"><div class="scene-pet">' + petSvg(st.pet, st.mood.key, st.flags) + '</div></div>' +
      '<p>' + (w.energy ? 'You have ' + w.energy + ' play time' + (w.energy > 1 ? 's' : '') + ' from exercise chores.' : 'No play time left. Exercise chores (going outside, jumping jacks, sports) earn play time.') + '</p>' +
      '<button class="btn primary block" type="button" data-pact="startPlay"' + (w.energy ? '' : ' disabled') + '>Play fetch</button>';
  }
  function houseHtml(owner, mine, room) {
    var st = state(owner), d = st.doc, p = C().person(owner), w = st.wallet;
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
      if (!g.spots) { g.spots = []; for (var j = 0; j < 8; j++) g.spots.push({ x: rnd(58, 82), y: rnd(50, 90), on: true }); }
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
      case 'av': var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'); G.dirtyAvatar[k] = /^\d+$/.test(v) ? Number(v) : v; C().schedule(); break;
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
      case 'leave': G.room = null; G.game = null; S().bankForm = null; if (window.World) window.World.closeRoom(); break;
      case 'htab': if (G.room) { G.room.tab = b.getAttribute('data-t'); C().schedule(); } break;
      case 'wear': case 'dye':
        var up = {}; up[a] = b.getAttribute('data-id') || '';
        var np = assign({}, doc(pid).pet); np[a] = up[a];
        DB.commit([{ t: 'update', c: 'pets', id: pid, d: { pet: np } }]).then(function () { C().schedule(); }, C().fail);
        break;
      case 'goRegion': G.room = null; if (window.World) window.World.enterRegion(b.getAttribute('data-r')); break;
      case 'buy': buy(pid, b.getAttribute('data-item')).then(function (r) { if (r !== null || true) C().schedule(); }); break;
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
    roomHtml: roomHtml, mountGame: mountGame, hosts: hosts, adultAv: adultAv, kidAv: kidAv, SPOTS: SPOTS, HOST_LINE: HOST_LINE, adultCreatorHtml: adultCreatorHtml, G: G, NEEDS: NEEDS, GOOD: GOOD, LOW: LOW, coin: coin, friendCard: friendCard
  };
})();
