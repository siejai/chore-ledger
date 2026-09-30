/*
 * Adventures: passes, the Adventure Gate, expedition loot, the collection and the rare egg.
 * Needs window.CL (app.js), window.Pets, window.CRE and window.DB.
 *
 * Adventure Pass (per kid, per day):
 *   - earned when the kid has settings.passBigJobs of today's big jobs approved (or all of theirs, if they have fewer)
 *   - everyone gets one when the whole house is clean (every big job for today approved by someone), and the rare egg can drop
 *   - golden pass (more minutes) when the kid's big jobs were logged before settings.earlyBy
 *   - parents can grant minutes by hand; in vacation mode passes are automatic
 * Play only inside the adventure hours. Minutes used are kept on pets/{pid}.advDay / advUsed.
 * ES5.
 */
(function () {
  'use strict';
  function C() { return window.CL; }
  function S() { return window.CL.S; }
  function esc(s) { return C().esc(s); }
  function assign(a, b) { for (var k in b) if (b.hasOwnProperty(k)) a[k] = b[k]; return a; }
  var DEF = { passBigJobs: 2, passMinutes: 30, goldenMinutes: 45, earlyBy: '10:00', advWeekday: ['16:00', '19:00'], advWeekend: ['09:00', '19:00'], vacation: { from: '', to: '' }, vacMinutes: 60, vacAutoPass: true };
  function cfg() { var st = S().settings, o = {}; for (var k in DEF) o[k] = st[k] != null ? st[k] : DEF[k]; return o; }

  /* ================= items ================= */
  var RAR = { common: { label: 'Common', col: '#8a9a94' }, uncommon: { label: 'Uncommon', col: '#1e8a6a' }, rare: { label: 'Rare', col: '#7a4fd6' }, legendary: { label: 'Legendary', col: '#c9941a' } };
  var ITEMS = {
    strawhat: { name: 'Straw hat', kind: 'acc', r: 'common' },
    sunglasses: { name: 'Sunglasses', kind: 'acc', r: 'common' },
    lei: { name: 'Flower lei', kind: 'acc', r: 'common' },
    bandana: { name: 'Bandana', kind: 'acc', r: 'common' },
    sailor: { name: 'Sailor cap', kind: 'acc', r: 'uncommon' },
    captain: { name: 'Captain’s hat', kind: 'acc', r: 'rare' },
    crown: { name: 'Pearl crown', kind: 'acc', r: 'rare' },
    ball: { name: 'Beach ball', kind: 'toy', r: 'common' },
    bucket: { name: 'Sand bucket', kind: 'toy', r: 'common' },
    kite: { name: 'Kite', kind: 'toy', r: 'uncommon' },
    surfboard: { name: 'Surfboard', kind: 'toy', r: 'rare' },
    lifering: { name: 'Life ring', kind: 'toy', r: 'uncommon' },
    shipbottle: { name: 'Ship in a bottle', kind: 'toy', r: 'rare' },
    dye_ocean: { name: 'Ocean dye', kind: 'dye', r: 'uncommon', pal: { main: '#3f7fd0', dark: '#1d3f7a', light: '#eef5ff', accent: '#ffffff', name: 'Ocean' } },
    dye_coral: { name: 'Coral dye', kind: 'dye', r: 'uncommon', pal: { main: '#ff7f6e', dark: '#b8453a', light: '#fff0ea', accent: '#ffd1a8', name: 'Coral' } },
    dye_seafoam: { name: 'Seafoam dye', kind: 'dye', r: 'uncommon', pal: { main: '#7fd8c4', dark: '#2f8a78', light: '#effcf8', accent: '#ffe08a', name: 'Seafoam' } },
    dye_sunset: { name: 'Sunset dye', kind: 'dye', r: 'rare', pal: { main: '#f7894a', dark: '#a8452a', light: '#ffe9c9', accent: '#b56cf0', name: 'Sunset' } },
    dye_gold: { name: 'Golden shimmer', kind: 'dye', r: 'rare', pal: { main: '#f2c14e', dark: '#a67c12', light: '#fff6d8', accent: '#ffffff', name: 'Golden' } },
    scallop: { name: 'Scallop shell', kind: 'shell', r: 'common' },
    conch: { name: 'Conch shell', kind: 'shell', r: 'uncommon' },
    sanddollar: { name: 'Sand dollar', kind: 'shell', r: 'common' },
    starfish: { name: 'Starfish', kind: 'shell', r: 'uncommon' },
    sardine: { name: 'Sardine', kind: 'fish', r: 'common' },
    clownfish: { name: 'Clownfish', kind: 'fish', r: 'uncommon' },
    puffer: { name: 'Pufferfish', kind: 'fish', r: 'uncommon' },
    koi: { name: 'Golden koi', kind: 'fish', r: 'rare' }
  };
  var KIND_LABEL = { acc: 'Accessories', dye: 'Colors', toy: 'Toys', shell: 'Shells', fish: 'Fish' };
  function itemArt(id) {
    var it = ITEMS[id]; if (!it) return '';
    var v = '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">';
    if (it.kind === 'acc') {
      var g = { hr: 22, hy: 40, ey: 2, ed: 9, er: [4, 5] };
      v = '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-40 ' + ({ strawhat: 6, sailor: 6, captain: 8, crown: 8 }[id] || -14) + ')">' + (it.name === 'Sunglasses' ? '<circle cx="70" cy="40" r="22" fill="#e9e3d6"/>' : '') + CRE.accessory(id, g, 70, {}) + '</g>';
    } else if (it.kind === 'dye') {
      v += '<path d="M22 8 h16 v8 l6 8 v28 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-28 l6 -8 Z" fill="#fff" stroke="#9aa4b2" stroke-width="2"/><path d="M18 30 h24 v22 a4 4 0 0 1 -4 4 h-16 a4 4 0 0 1 -4 -4 Z" fill="' + it.pal.main + '"/><circle cx="26" cy="38" r="3" fill="' + it.pal.accent + '"/>';
    } else if (id === 'ball') v += '<circle cx="30" cy="32" r="20" fill="#fff" stroke="#9aa4b2" stroke-width="2"/><path d="M30 12 A20 20 0 0 1 50 32 L30 32 Z" fill="#e45757"/><path d="M10 32 A20 20 0 0 1 30 12 L30 32 Z" fill="#3a8ed8"/><path d="M30 52 A20 20 0 0 1 10 32 L30 32 Z" fill="#f2d43a"/>';
    else if (id === 'bucket') v += '<path d="M16 22 h28 l-4 30 h-20 Z" fill="#f29b38" stroke="#b86a0e" stroke-width="2"/><path d="M16 22 Q30 6 44 22" fill="none" stroke="#555" stroke-width="2"/><rect x="40" y="10" width="4" height="18" fill="#3a8ed8" transform="rotate(20 42 19)"/>';
    else if (id === 'kite') v += '<path d="M30 6 L48 26 L30 46 L12 26 Z" fill="#e36fae" stroke="#9d2f6a" stroke-width="2"/><path d="M30 6 V46 M12 26 H48" stroke="#fff" stroke-width="1.5"/><path d="M30 46 q-4 6 0 8 q4 2 0 6" fill="none" stroke="#555" stroke-width="1.5"/>';
    else if (id === 'surfboard') v += '<ellipse cx="30" cy="30" rx="9" ry="26" fill="#4fd1c5" stroke="#1d7a70" stroke-width="2" transform="rotate(25 30 30)"/><path d="M22 14 L40 48" stroke="#fff" stroke-width="3" transform="rotate(0)"/>';
    else if (id === 'lifering') v += '<circle cx="30" cy="30" r="20" fill="none" stroke="#f2f2f2" stroke-width="12"/><circle cx="30" cy="30" r="20" fill="none" stroke="#e8553c" stroke-width="12" stroke-dasharray="15.7 15.7"/><circle cx="30" cy="30" r="26" fill="none" stroke="#b8b0a4" stroke-width="1.5"/><circle cx="30" cy="30" r="14" fill="none" stroke="#b8b0a4" stroke-width="1.5"/>';
    else if (id === 'shipbottle') v += '<rect x="10" y="20" width="40" height="26" rx="12" fill="#d9f1f7" stroke="#7fb8c8" stroke-width="2"/><rect x="48" y="28" width="8" height="10" rx="2" fill="#a8703a"/><path d="M18 38 h24 l-4 5 h-16 Z" fill="#8a5a2b"/><path d="M29 38 V22 M29 23 l9 12 h-9 Z M28 25 l-7 10 h7 Z" fill="#fff" stroke="#555" stroke-width="1"/><path d="M12 42 q9 -3 18 0 q9 3 18 0" fill="none" stroke="#3a8ed8" stroke-width="2"/>';
    else if (it.kind === 'shell') {
      if (id === 'starfish') v += '<path d="M30 6 L36 24 L54 24 L40 35 L45 53 L30 42 L15 53 L20 35 L6 24 L24 24 Z" fill="#f29b6e" stroke="#b8553a" stroke-width="2"/>';
      else if (id === 'sanddollar') v += '<circle cx="30" cy="30" r="20" fill="#efe3c8" stroke="#bfae88" stroke-width="2"/><path d="M30 18 v8 M20 26 l7 5 M40 26 l-7 5 M24 40 l5 -6 M36 40 l-5 -6" stroke="#bfae88" stroke-width="2"/>';
      else if (id === 'conch') v += '<path d="M12 40 Q14 14 40 10 Q52 20 46 34 Q40 50 18 50 Z" fill="#f7c9b0" stroke="#c07a5a" stroke-width="2"/><path d="M40 10 Q30 24 18 50" fill="none" stroke="#c07a5a" stroke-width="2"/>';
      else v += '<path d="M30 52 L8 24 Q30 2 52 24 Z" fill="#f8b4a6" stroke="#c0706a" stroke-width="2"/><path d="M30 52 L20 16 M30 52 L30 12 M30 52 L40 16" stroke="#c0706a" stroke-width="1.5"/>';
    } else if (it.kind === 'fish') {
      var fc = { sardine: '#9fb3c8', clownfish: '#f29b38', puffer: '#e9d58c', koi: '#f2c14e' }[id];
      v += '<ellipse cx="28" cy="30" rx="' + (id === 'puffer' ? 16 : 18) + '" ry="' + (id === 'puffer' ? 14 : 10) + '" fill="' + fc + '" stroke="#555" stroke-width="1.5"/><path d="M44 30 L56 20 L56 40 Z" fill="' + fc + '" stroke="#555" stroke-width="1.5"/><circle cx="18" cy="27" r="2.5" fill="#2b2233"/>' +
        (id === 'clownfish' ? '<path d="M26 20 v20 M36 22 v16" stroke="#fff" stroke-width="3"/>' : '') + (id === 'koi' ? '<path d="M30 22 l3 8 l-3 8" stroke="#fff" stroke-width="2" fill="none"/>' : '');
    }
    return v + '</svg>';
  }
  function dyePal(id) { var it = ITEMS[id]; return it && it.pal ? it.pal : null; }

  /* ================= passes ================= */
  function dow(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); }
  function onVacation() { var v = cfg().vacation || {}, t = C().today(); return !!(v.from && v.to && t >= v.from && t <= v.to); }
  function bigJobsToday() {
    var d = dow(C().today()), vac = onVacation();
    return S().chores.filter(function (c) {
      if (c.active === false || !c.major) return false;
      if (vac ? !c.travel : c.travel) return false;
      return !c.majorDays || !c.majorDays.length || c.majorDays.indexOf(d) >= 0;
    });
  }
  function hm(s) { var p = String(s || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function windowToday() {
    var c = cfg();
    if (onVacation()) return ['07:00', '21:00'];
    var d = dow(C().today());
    return (d === 0 || d === 6) ? c.advWeekend : c.advWeekday;
  }
  function inWindow() { var w = windowToday(), n = new Date(), m = n.getHours() * 60 + n.getMinutes(); return m >= hm(w[0]) && m < hm(w[1]); }
  function fmtHM(s) { var m = hm(s), h = Math.floor(m / 60), mm = m % 60; return ((h % 12) || 12) + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + (h < 12 ? 'am' : 'pm'); }
  function kidIds() { return C().activePeople().filter(function (p) { return !C().isAdult(p.id); }).map(function (p) { return p.id; }); }
  /* A big job is done when anyone did it, or (for "everyone" jobs) when every assigned kid did it. */
  function houseStatus() {
    var t = C().today(), jobs = bigJobsToday(), kids = kidIds(), out = [];
    jobs.forEach(function (c) {
      var by = {}, pending = false;
      S().entries.forEach(function (e) {
        if (e.cid !== c.id || e.date !== t) return;
        if (e.status === 'approved') by[e.pid] = true; else if (e.status === 'pending') pending = true;
      });
      if (c.majorEach) {
        var need = (c.who || []).filter(function (id) { return kids.indexOf(id) >= 0; });
        var got = need.filter(function (id) { return by[id]; });
        out.push({ chore: c, each: true, need: need, got: got, done: need.length > 0 && got.length === need.length, pending: pending });
      } else {
        var who = Object.keys(by);
        out.push({ chore: c, each: false, by: who[0] || null, done: who.length > 0, pending: pending });
      }
    });
    var n = out.filter(function (x) { return x.done; }).length;
    return { jobs: out, done: n, total: out.length, clean: out.length > 0 && n === out.length };
  }
  function passInfo(pid) {
    var c = cfg(), t = C().today(), jobs = bigJobsToday(), house = houseStatus();
    var mine = jobs.filter(function (j) { return (j.who || []).indexOf(pid) >= 0; });
    var need = Math.min(Number(c.passBigJobs) || 2, mine.length);
    var doneE = {}, early = true, earlyM = hm(c.earlyBy);
    S().entries.forEach(function (e) {
      if (e.pid !== pid || e.date !== t || e.status !== 'approved') return;
      var j = null; jobs.forEach(function (x) { if (x.id === e.cid) j = x; });
      if (!j || doneE[j.id]) return;
      doneE[j.id] = e;
    });
    var doneN = Object.keys(doneE).length;
    Object.keys(doneE).forEach(function (k) { var d = new Date(doneE[k].ts); if (d.getHours() * 60 + d.getMinutes() >= earlyM) early = false; });
    var own = need > 0 && doneN >= need;
    var advDoc = S().adv && S().adv.id === t ? S().adv : {};
    var grant = Number((advDoc.grants || {})[pid]) || 0;
    var vac = onVacation() && c.vacAutoPass;
    var golden = own && early;
    var minutes = 0;
    if (vac) minutes = Number(c.vacMinutes) || 60;
    else if (own || house.clean) minutes = golden ? (Number(c.goldenMinutes) || 45) : (Number(c.passMinutes) || 30);
    minutes += grant;
    var d = Pets.doc(pid), used = d.advDay === t ? Number(d.advUsed) || 0 : 0;
    return { need: need, done: doneN, mineTotal: mine.length, own: own, golden: golden, house: house, bonus: house.clean, vacation: onVacation(), grant: grant,
      minutes: minutes, used: used, left: Math.max(0, Math.round(minutes - used)), open: inWindow(), window: windowToday(), has: minutes > 0 };
  }

  /* ================= gate screen ================= */
  function gateHtml(pid) {
    var p = passInfo(pid), h = '<div class="gate stack tight">';
    var w = p.window;
    h += '<div class="pass-card' + (p.has ? (p.golden ? ' golden' : ' ok') : '') + '"><div class="pass-t">' + (p.has ? (p.golden ? 'Golden Adventure Pass' : 'Adventure Pass') : 'No pass yet today') + '</div>' +
      (p.has ? '<div class="pass-big mono">' + p.left + ' min left</div>' : '') +
      '<div class="pass-s">' + (p.vacation ? 'Vacation mode: adventures are open all day.' :
        p.own ? (p.golden ? 'Big jobs done early! Extra time today.' : 'Your big jobs are done and approved.') :
        p.bonus ? 'The whole house is clean, so everyone gets to go!' :
        p.need ? 'Get ' + p.need + ' big job' + (p.need > 1 ? 's' : '') + ' approved to earn one: ' + p.done + ' of ' + p.need + ' done.' : 'You have no big jobs today. When the whole house is clean, everyone gets a pass.') +
      (p.grant ? ' A parent added ' + p.grant + ' minutes.' : '') + '</div>' +
      '<div class="pass-s">Adventure hours today: ' + fmtHM(w[0]) + ' to ' + fmtHM(w[1]) + (p.open ? ' (open now)' : ' (closed now)') + '. Get big jobs done before ' + fmtHM(cfg().earlyBy) + ' for a golden pass.</div></div>';
    var hs = p.house;
    if (hs.total) {
      h += '<div class="card house-card' + (hs.clean ? ' shine' : '') + '"><h2>Whole-house clean: ' + hs.done + ' of ' + hs.total + '</h2>' +
        '<div class="bar big"><i style="width:' + Math.round(100 * hs.done / hs.total) + '%"></i></div>' +
        (hs.clean ? '<p class="egg-note"><span class="egg-mini">' + CRE.egg() + '</span><strong>Rare egg hunting is on!</strong> Every dig, chest and catch today has a small chance of a rare egg.</p>'
          : '<p class="note">When every big job is done and approved, everyone gets a pass and a chance to find a <strong>rare egg</strong>.</p>') +
        '<div class="list">' + hs.jobs.map(function (j) {
          var sub = j.each ? (j.got.length + ' of ' + j.need.length + ' done' + (j.done ? '' : ': waiting on ' + j.need.filter(function (id) { return j.got.indexOf(id) < 0; }).map(C().pname).join(', ')))
            : (j.done ? 'Done by ' + C().pname(j.by) : j.pending ? 'Waiting for approval' : 'Not done yet');
          return '<div class="hrow"><span class="tick' + (j.done ? ' on' : '') + '">' + (j.done ? '&#10003;' : '') + '</span><div class="desc">' + esc(j.chore.name) + (j.each ? ' <span class="tag plain">Everyone</span>' : '') +
            '<small>' + esc(sub) + '</small></div></div>';
        }).join('') + '</div></div>';
    }
    var can = p.has && p.left > 0 && p.open && Pets.doc(pid).pet;
    h += '<h2>Where to?</h2><div class="regions">' +
      '<button type="button" class="region beach" data-pact="goRegion" data-r="beach"' + (can ? '' : ' disabled') + '><strong>Sunny Beach</strong><small>Dig for treasure, fish off the pier, and find chests only some pets can reach.</small></button>' +
      '<button type="button" class="region cruise" data-pact="goRegion" data-r="ship"' + (can ? '' : ' disabled') + '><strong>Cruise Ship</strong><small>Work on the Lido Deck: clear plates, return glasses to the bar, mop pool puddles and collect towels for deck tickets.</small></button>' +
      '<div class="region locked"><strong>Whispering Forest</strong><small>Coming soon</small></div>' +
      '<div class="region locked"><strong>Crystal Caves</strong><small>Coming soon</small></div></div>';
    if (!can) h += '<p class="note">' + (!Pets.doc(pid).pet ? 'You need a pet to go on an adventure.' : !p.has ? 'Earn a pass first.' : !p.open ? 'The gate is closed right now. Come back during adventure hours.' : 'You used all your adventure time today.') + '</p>';
    return h + '</div>';
  }

  /* ================= expedition session ================= */
  var EXP = null;
  function roll(weights) { var tot = 0, k; for (k in weights) tot += weights[k]; var r = Math.random() * tot; for (k in weights) { r -= weights[k]; if (r <= 0) return k; } return k; }
  function pickItem(pid, rarity, kinds) {
    var owned = Pets.doc(pid).items || {}, list = [], fresh = [];
    for (var id in ITEMS) if (ITEMS[id].r === rarity && kinds.indexOf(ITEMS[id].kind) >= 0) { list.push(id); if (!owned[id]) fresh.push(id); }
    if (!list.length) return null;
    var pool = fresh.length && Math.random() < 0.7 ? fresh : list;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function eggChance(kind) { return { dig: 0.025, chest: 0.06, fish: 0.02, crate: 0.08, bonus: 0.04 }[kind] || 0; }
  function loot(pid, kind) {
    var p = passInfo(pid), d = Pets.doc(pid);
    if (p.bonus && !d.egg && Math.random() < eggChance(kind)) return { egg: true };
    var id;
    if (kind === 'dig') { var r = roll({ shell: 45, common: 30, uncommon: 18, rare: 7 }); id = r === 'shell' ? pickItem(pid, Math.random() < 0.7 ? 'common' : 'uncommon', ['shell']) : pickItem(pid, r, ['acc', 'toy', 'dye']); }
    else if (kind === 'chest' || kind === 'crate') id = pickItem(pid, roll({ uncommon: 55, rare: 45 }), ['acc', 'toy', 'dye']);
    else if (kind === 'fish') { var f = roll({ common: 55, uncommon: 32, rare: 8, dye: 5 }); id = f === 'dye' ? 'dye_seafoam' : pickItem(pid, f, ['fish']); }
    return { id: id || 'scallop' };
  }
  function grant(pid, res) {
    var ops;
    if (res.egg) {
      var sp = CRE.rares()[Math.floor(Math.random() * CRE.rares().length)];
      res.eggSp = sp.id;
      ops = [{ t: 'merge', c: 'pets', id: pid, d: { egg: { sp: sp.id, pal: CRE.randomPalette(sp), found: C().today() } } }];
    } else {
      var d = {}; d.items = {}; d.items[res.id] = DB.inc(1);
      ops = [{ t: 'merge', c: 'pets', id: pid, d: d }];
    }
    EXP && EXP.found.push(res.egg ? 'egg' : res.id);
    return DB.commit(ops);
  }
  function reveal(res) {
    var box = document.createElement('div');
    box.className = 'celebrate' + (res.egg ? ' egg-reveal' : '');
    if (res.egg) {
      box.innerHTML = '<div class="celebrate-card legendary"><div class="celebrate-art egg-bob">' + CRE.egg() + '</div><div class="rarity" style="color:' + RAR.legendary.col + '">Legendary</div>' +
        '<h2>A RARE EGG!</h2><p>Something special is inside. Take good care of your pet: the egg hatches after your pet is fully grown and moves into your house.</p>' +
        '<button class="btn primary" type="button" data-pact="closeCeleb">Amazing!</button></div>';
    } else {
      var it = ITEMS[res.id], rr = RAR[it.r];
      box.innerHTML = '<div class="celebrate-card r-' + it.r + '"><div class="item-big">' + itemArt(res.id) + '</div><div class="rarity" style="color:' + rr.col + '">' + rr.label + '</div>' +
        '<h2>' + esc(it.name) + '</h2><p>' + (it.kind === 'acc' ? 'Your pet can wear it. Try it on in your house.' : it.kind === 'dye' ? 'Changes your pet’s colors. Use it in your house.' : it.kind === 'toy' ? 'It goes in your house for everyone to see.' : 'Added to your collection book.') + '</p>' +
        '<button class="btn primary" type="button" data-pact="closeCeleb">Nice!</button></div>';
    }
    document.body.appendChild(box);
  }
  function startExpedition(pid, region) {
    var p = passInfo(pid);
    EXP = { pid: pid, region: region, start: Date.now(), endsAt: Date.now() + p.left * 60000, lastSave: Date.now(), found: [], opened: {}, dug: {}, shells: {}, fishing: null };
    DB.commit([{ t: 'merge', c: 'pets', id: pid, d: { advDay: C().today(), advUsed: p.used } }]).catch(function () {});
    return EXP;
  }
  function saveTime(final) {
    if (!EXP) return;
    var now = Date.now(), mins = (now - EXP.lastSave) / 60000;
    EXP.lastSave = now;
    var d = Pets.doc(EXP.pid), base = d.advDay === C().today() ? Number(d.advUsed) || 0 : 0;
    DB.commit([{ t: 'merge', c: 'pets', id: EXP.pid, d: { advDay: C().today(), advUsed: Math.round((base + mins) * 10) / 10 } }]).catch(function () {});
    if (final) EXP = null;
  }

  /* ================= cruise ship: deck tickets and the prize desk ================= */
  var PRIZES = [{ id: 'crate', cost: 60 }, { id: 'sailor', cost: 60 }, { id: 'lifering', cost: 100 }, { id: 'dye_ocean', cost: 150 }, { id: 'shipbottle', cost: 250 }, { id: 'captain', cost: 400 }];
  function tickets(pid) { return Number(Pets.doc(pid).tickets) || 0; }
  function addTickets(pid, n, tasks) {
    if (EXP) EXP.tickets = (EXP.tickets || 0) + n;
    return DB.commit([{ t: 'merge', c: 'pets', id: pid, d: { tickets: DB.inc(n), deckDone: DB.inc(tasks || 0) } }]);
  }
  /* every 10 jobs in a row gives a captain's bonus; on whole-house-clean days it can hold the rare egg */
  function deckBonus(pid) { var p = passInfo(pid); return p.bonus && !Pets.doc(pid).egg && Math.random() < eggChance('bonus') ? { egg: true } : null; }
  function prizesHtml(pid) {
    var have = tickets(pid), items = Pets.doc(pid).items || {};
    return '<div class="fish-t">Prize desk &middot; you have <b class="mono">' + have + '</b> deck ticket' + (have === 1 ? '' : 's') + '</div><div class="prize-list">' + PRIZES.map(function (pz) {
      var crate = pz.id === 'crate', it = crate ? null : ITEMS[pz.id], owned = !crate && items[pz.id];
      var art = crate ? '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="40" height="32" rx="3" fill="#b07d4f" stroke="#6b4a2a" stroke-width="2"/><path d="M10 28 h40 M10 40 h40" stroke="#6b4a2a" stroke-width="2"/><text x="30" y="38" font-size="16" font-weight="700" text-anchor="middle" fill="#fff4d0">?</text></svg>' : itemArt(pz.id);
      return '<div class="prize"><span class="prize-art">' + art + '</span><span class="grow"><strong>' + (crate ? 'Mystery crate' : esc(it.name)) + '</strong><small style="color:' + (crate ? '#7a4fd6' : RAR[it.r].col) + '">' + (crate ? 'Something from the hold' : RAR[it.r].label) + '</small></span>' +
        (owned ? '<span class="tag plain">Owned</span>' : '<button type="button" class="btn small' + (have >= pz.cost ? ' primary' : '') + '" data-wact="prize" data-id="' + pz.id + '"' + (have >= pz.cost ? '' : ' disabled') + '>' + pz.cost + '</button>') + '</div>';
    }).join('') + '</div><div class="wrap"><button type="button" class="btn" data-wact="closePrizes">Close</button></div>';
  }
  function buyPrize(pid, id) {
    var pz = null; PRIZES.forEach(function (x) { if (x.id === id) pz = x; });
    if (!pz || tickets(pid) < pz.cost) return Promise.reject({ message: 'Not enough tickets yet.' });
    var res = id === 'crate' ? loot(pid, 'crate') : { id: id };
    var d = { tickets: DB.inc(-pz.cost) };
    if (res.egg) { var sp = CRE.rares()[Math.floor(Math.random() * CRE.rares().length)]; res.eggSp = sp.id; d.egg = { sp: sp.id, pal: CRE.randomPalette(sp), found: C().today() }; }
    else { d.items = {}; d.items[res.id] = DB.inc(1); }
    return DB.commit([{ t: 'merge', c: 'pets', id: pid, d: d }]).then(function () { return res; });
  }

  /* ================= collection and wardrobe (shown in the kid's own house) ================= */
  function wardrobeHtml(pid) {
    var d = Pets.doc(pid), items = d.items || {}, pet = d.pet, h = '';
    if (!pet) return '<p class="note">You need a pet to dress up.</p>';
    function row(kind, cur, act) {
      var ids = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].kind === kind && items[id]; });
      if (!ids.length) return '<p class="note">None yet. Find them on adventures.</p>';
      return '<div class="wardrobe">' + '<button type="button" class="ward' + (!cur ? ' on' : '') + '" data-pact="' + act + '" data-id="">' + '<span class="ward-art none">None</span></button>' +
        ids.map(function (id) { return '<button type="button" class="ward r-' + ITEMS[id].r + (cur === id ? ' on' : '') + '" data-pact="' + act + '" data-id="' + id + '"><span class="ward-art">' + itemArt(id) + '</span><small>' + esc(ITEMS[id].name) + '</small></button>'; }).join('') + '</div>';
    }
    h += '<div class="ward-preview">' + Pets.petSvg(pet, 'happy', {}) + '</div>';
    h += '<h2>Wear</h2>' + row('acc', pet.wear, 'wear') + '<h2>Colors</h2>' + row('dye', pet.dye, 'dye');
    return h;
  }
  function collectionHtml(pid) {
    var items = Pets.doc(pid).items || {}, total = 0, have = 0, h = '';
    ['acc', 'dye', 'toy', 'shell', 'fish'].forEach(function (kind) {
      var ids = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].kind === kind; });
      h += '<h2>' + KIND_LABEL[kind] + '</h2><div class="book">' + ids.map(function (id) {
        total++; var n = items[id] || 0; if (n) have++;
        return '<div class="book-slot r-' + ITEMS[id].r + (n ? '' : ' missing') + '">' + (n ? itemArt(id) : '<span class="q">?</span>') + '<small>' + (n ? esc(ITEMS[id].name) + (n > 1 ? ' x' + n : '') : RAR[ITEMS[id].r].label) + '</small></div>';
      }).join('') + '</div>';
    });
    var tk = Number(Pets.doc(pid).tickets) || 0;
    return '<p class="note">Adventure collection: <strong>' + have + ' of ' + total + '</strong> found.' + (tk ? ' Deck tickets saved: <strong>' + tk + '</strong>.' : '') + '</p>' + h;
  }
  function toysIn(pid) { var items = Pets.doc(pid).items || {}; return Object.keys(ITEMS).filter(function (id) { return ITEMS[id].kind === 'toy' && items[id]; }); }

  /* ================= parent controls ================= */
  function passesAdminHtml() {
    var kids = C().activePeople().filter(function (p) { return !C().isAdult(p.id); });
    return '<section class="stack tight"><h2>Adventure passes today</h2><div class="list">' + kids.map(function (p) {
      var pi = passInfo(p.id);
      return '<div class="hrow"><span class="dot p' + C().pIndex(p) + '"></span><div class="desc">' + esc(p.name) + '<small>' +
        (pi.has ? (pi.golden ? 'Golden pass' : 'Pass') + ': ' + pi.left + ' of ' + pi.minutes + ' min left' : 'No pass: ' + pi.done + ' of ' + pi.need + ' big jobs') + '</small></div>' +
        '<button class="btn small" type="button" data-act="grantPass" data-pid="' + esc(p.id) + '">+30 min</button></div>';
    }).join('') + '</div><p class="note">House clean: ' + houseStatus().done + ' of ' + houseStatus().total + ' big jobs approved today' + (onVacation() ? ' (vacation mode)' : '') + '.</p></section>';
  }
  function grantPass(pid, mins) {
    var t = C().today(), g = {}; g[pid] = DB.inc(mins);
    return DB.commit([{ t: 'merge', c: 'adv', id: t, d: { grants: g } }]);
  }

  window.ADV = {
    ITEMS: ITEMS, RAR: RAR, itemArt: itemArt, dyePal: dyePal, passInfo: passInfo, houseStatus: houseStatus, bigJobsToday: bigJobsToday, onVacation: onVacation, kidIds: kidIds,
    gateHtml: gateHtml, loot: loot, grant: grant, reveal: reveal, startExpedition: startExpedition, saveTime: saveTime, exp: function () { return EXP; },
    wardrobeHtml: wardrobeHtml, tickets: tickets, addTickets: addTickets, deckBonus: deckBonus, prizesHtml: prizesHtml, buyPrize: buyPrize, PRIZES: PRIZES, collectionHtml: collectionHtml, toysIn: toysIn, passesAdminHtml: passesAdminHtml, grantPass: grantPass, cfg: cfg, DEF: DEF, fmtHM: fmtHM
  };
})();
