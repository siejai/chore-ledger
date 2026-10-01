/*
 * Mess Defense: a lane-defense game at the Adventure Gate.
 * Mess monsters walk in from the right along five lanes toward the house on the left. Kids place creatures to stop them.
 *  - Pets a kid has raised (current pet + grown pets in their house) are stronger; random helpers fill the other slots.
 *  - Every species has its own attack (ATK below): shots, lobs, beams, swipes, walls, bubble makers, healers...
 *    Each attack also carries its element (Fire / Water / Leaf, Mythic & Cosmic = rainbow) for combos:
 *    fire + leaf drops hot coals (3 coals in a spot become a fire wall), fire + water makes stunning steam,
 *    water + leaf makes a mud patch that slows everything crossing it. Rainbow attacks finish any combo.
 *  - Soap bubbles float up: tap them to earn bubbles, which pay for defenders. Each lane has one Mop-Bot.
 * Uses Adventure Pass time and pays deck tickets. ES5, canvas 2D.
 */
(function () {
  'use strict';
  var LANES = 5, CELLS = 7, TEAM = 6;
  var RAF = window.requestAnimationFrame ? function (f) { window.requestAnimationFrame(f); } : function (f) { setTimeout(function () { f(Date.now()); }, 16); };
  function C() { return window.CL; }
  function A() { return window.ADV; }
  function Pz() { return window.Pets; }
  function esc(s) { return C().esc(s); }
  var D = null; /* game state while a round is open */

  /* ---------------- attacks ----------------
   * Four kinds of defender (t):
   *   ranged : stays put and fires at messes in its lane. Flavour f sets the look and usual effect:
   *            fire (burns), ice (slows or freezes), rock (heavy, pushes back), water (slows), leaf (quick seeds),
   *            zap, star, rainbow, moon, wind, bubble, light. Shape k: shot | pierce | lob | boomer | multi (3 lanes) |
   *            chain (jumps lanes) | snipe (farthest) | seek (homing) | rain (anywhere) | beam (short range)
   *   rush   : runs up the lane at the first mess within range r, hits it (pierce: everything on the way), runs back
   *   wall   : sits there and soaks up bites (thorns hurt biters, slow/knock on contact)
   *   ambush : hides in its square; when a mess steps on it, it springs: mine (blast around it), grab (takes one
   *            mess under; big hit on the boss), trap (freezes or confuses everything on the square). Re-arms after `rearm` s.
   *            Messes can't eat a hiding ambusher.
   * dmg, every (seconds); effects: slow, stun, burn (seconds), knock (squares), crit (chance), gen (makes bubbles every gen s),
   * heal (hp to neighbours every 3 s), hp (toughness), thorns (damage per second to biters), revive, tile ('mud')
   */
  var ATK = {
    /* ---- fire ---- */
    fox: { n: 'Ember Toss', t: 'ranged', f: 'fire', k: 'lob', dmg: 18, every: 1.7, splash: 0.7, burn: 2 },
    cinder: { n: 'Spark Pounce', t: 'rush', dmg: 22, every: 2.0, r: 3, burn: 1.5 },
    lynx: { n: 'Gem Flash', t: 'ranged', f: 'light', k: 'pierce', dmg: 16, every: 2.0 },
    sunpaw: { n: 'Sunny Charge', t: 'rush', dmg: 16, every: 2.6, r: 3, knock: 1 },
    tigrit: { n: 'Tiger Pounce', t: 'rush', dmg: 34, every: 2.8, r: 3.5 },
    toastie: { n: 'Hot Toast', t: 'ranged', f: 'fire', k: 'lob', dmg: 16, every: 1.8, burn: 2.5 },
    dotty: { n: 'Zap Bark', t: 'ranged', f: 'zap', k: 'chain', dmg: 14, every: 1.6 },
    shibble: { n: 'Fetch!', t: 'rush', dmg: 14, every: 1.6, r: 4 },
    weenie: { n: 'Long Guard', t: 'wall', hp: 3, thorns: 9 },
    glowbit: { n: 'Glow Glow', t: 'ranged', f: 'fire', k: 'shot', dmg: 6, every: 2.2, gen: 9 },
    dotbug: { n: 'Lucky Pop', t: 'ambush', a: 'mine', dmg: 70, rearm: 14, crit: 0.3 },
    hornbit: { n: 'Horn Charge', t: 'rush', dmg: 24, every: 2.4, r: 2.5, knock: 1.2, hp: 1.5 },
    antsy: { n: 'Ant Line', t: 'ranged', f: 'fire', k: 'shot', dmg: 6, every: 1.8, shots: 3 },
    flitter: { n: 'Hang and Drop', t: 'ambush', a: 'grab', dmg: 90, rearm: 16 },
    chirpet: { n: 'Peck Dive', t: 'ranged', f: 'fire', k: 'snipe', dmg: 20, every: 2.2 },
    match: { n: 'Flare Trap', t: 'ambush', a: 'mine', dmg: 55, rearm: 12, burn: 3 },
    /* ---- water ---- */
    otter: { n: 'Splash Slap', t: 'ranged', f: 'water', k: 'shot', dmg: 12, every: 1.6, slow: 2 },
    foldmew: { n: 'Puddle Pounce', t: 'ambush', a: 'trap', dmg: 15, rearm: 11, stun: 2.5, tile: 'mud' },
    snowleo: { n: 'Frost Breath', t: 'ranged', f: 'ice', k: 'beam', dmg: 8, every: 2.4, r: 2, stun: 1.2 },
    bubbit: { n: 'Bubble Trap', t: 'ranged', f: 'bubble', k: 'shot', dmg: 6, every: 3.0, stun: 2 },
    rainmew: { n: 'Rain Cloud', t: 'ranged', f: 'water', k: 'rain', dmg: 7, every: 3.0, shots: 3, slow: 1 },
    snowpup: { n: 'Snowball', t: 'ranged', f: 'ice', k: 'shot', dmg: 22, every: 2.4, slow: 1.5 },
    poofle: { n: 'Poof Wall', t: 'wall', hp: 2.5, knock: 0.6 },
    splashpup: { n: 'Hose Spray', t: 'ranged', f: 'water', k: 'beam', dmg: 5, every: 0.45, r: 3, slow: 0.6 },
    puglet: { n: 'Snort Bubbles', t: 'ranged', f: 'bubble', k: 'shot', dmg: 7, every: 2.0, gen: 10 },
    skimmer: { n: 'Dart Dash', t: 'ranged', f: 'water', k: 'pierce', dmg: 10, every: 1.1 },
    shellby: { n: 'Shell Up', t: 'wall', hp: 3.5, slow: 2 },
    rolly: { n: 'Roll Out', t: 'rush', dmg: 30, every: 6, r: 7, pierce: true },
    mothlet: { n: 'Moon Dust', t: 'ranged', f: 'moon', k: 'lob', dmg: 4, every: 3.5, splash: 1, stun: 1.8 },
    axolittle: { n: 'Regrow', t: 'ranged', f: 'water', k: 'shot', dmg: 6, every: 2.0, heal: 12 },
    waddles: { n: 'Belly Slide', t: 'rush', dmg: 15, every: 5, r: 7, pierce: true, knock: 1 },
    blubbo: { n: 'Big Bounce', t: 'ranged', f: 'rock', k: 'lob', dmg: 24, every: 2.6, splash: 1 },
    gloop: { n: 'Goo Trap', t: 'ambush', a: 'trap', dmg: 10, rearm: 12, stun: 4 },
    icecube: { n: 'Ice Chunk', t: 'ranged', f: 'ice', k: 'shot', dmg: 14, every: 1.7, slow: 2.5 },
    /* ---- leaf ---- */
    bunny: { n: 'Seed Spit', t: 'ranged', f: 'leaf', k: 'shot', dmg: 7, every: 0.7 },
    mossmew: { n: 'Moss Carpet', t: 'ambush', a: 'trap', dmg: 8, rearm: 10, slow: 4, tile: 'mud' },
    petalpaw: { n: 'Petal Storm', t: 'ranged', f: 'leaf', k: 'multi', dmg: 9, every: 1.8 },
    cheetling: { n: 'Speed Dash', t: 'rush', dmg: 9, every: 0.9, r: 3 },
    shadekit: { n: 'Shadow Pounce', t: 'ambush', a: 'grab', dmg: 100, rearm: 15 },
    sniffle: { n: 'Dig Up', t: 'ranged', f: 'rock', k: 'lob', dmg: 8, every: 3.0, gen: 8, knock: 0.4 },
    scruff: { n: 'Stick Throw', t: 'ranged', f: 'rock', k: 'boomer', dmg: 12, every: 1.9, knock: 0.5 },
    pompom: { n: 'Pollen Puff', t: 'ambush', a: 'trap', dmg: 6, rearm: 10, stun: 3, splash: 1 },
    mopsy: { n: 'Mop Charge', t: 'rush', dmg: 16, every: 1.8, r: 3 },
    buzzby: { n: 'Sting', t: 'ranged', f: 'leaf', k: 'shot', dmg: 10, every: 1.2, slow: 1.5 },
    fluttle: { n: 'Flutter Breeze', t: 'ranged', f: 'wind', k: 'beam', dmg: 3, every: 3.0, r: 3, knock: 0.7 },
    hopsy: { n: 'Hop Kick', t: 'rush', dmg: 14, every: 1.6, r: 2.5, knock: 0.5 },
    sprigbug: { n: 'Sprout Snare', t: 'ambush', a: 'grab', dmg: 80, rearm: 13 },
    tadlet: { n: 'Tongue Grab', t: 'ambush', a: 'grab', dmg: 60, rearm: 9 },
    hootlet: { n: 'Night Watch', t: 'ranged', f: 'moon', k: 'seek', dmg: 16, every: 2.2, near: true },
    pebble: { n: 'Rock Wall', t: 'wall', hp: 4 },
    /* ---- rare ---- */
    starling: { n: 'Star Shower', t: 'ranged', f: 'star', k: 'rain', dmg: 9, every: 3.0, shots: 4 },
    drake: { n: 'Dragon Breath', t: 'ranged', f: 'fire', k: 'beam', dmg: 12, every: 1.6, r: 3, burn: 2, sweep: true },
    unicorn: { n: 'Rainbow Beam', t: 'ranged', f: 'rainbow', k: 'pierce', dmg: 18, every: 1.8 },
    sphinx: { n: 'Riddle Trap', t: 'ambush', a: 'trap', dmg: 12, rearm: 12, knock: 2.5, splash: 1 },
    cerberus: { n: 'Guard Dog', t: 'wall', hp: 3.2, thorns: 16 },
    chimera: { n: 'Mixed Charge', t: 'rush', dmg: 18, every: 2.0, r: 3, mix: true },
    griffin: { n: 'Sky Swoop', t: 'rush', dmg: 24, every: 4, r: 7, pierce: true },
    kitsune: { n: 'Fox Fire', t: 'ranged', f: 'fire', k: 'seek', dmg: 18, every: 1.6, burn: 2 },
    phoenix: { n: 'Rebirth Flame', t: 'ranged', f: 'fire', k: 'shot', dmg: 20, every: 1.6, burn: 2, revive: 1 }
  };
  var ELEM = { Fire: 'fire', Water: 'water', Leaf: 'leaf', Mythic: 'rainbow', Cosmic: 'rainbow' };
  var ECOL = { fire: '#ff7a2a', water: '#3a9ae8', leaf: '#6fae4f', rainbow: '#b58cff' };
  var TYPE_LABEL = { ranged: 'Ranged', rush: 'Rush', wall: 'Wall', ambush: 'Ambush' };
  var FLAVOUR = { fire: 'Fire', ice: 'Ice', rock: 'Rocks', water: 'Water', leaf: 'Leaf', zap: 'Zap', star: 'Stars', rainbow: 'Rainbow', moon: 'Moon', wind: 'Wind', bubble: 'Bubbles', light: 'Light' };
  var FCOL = { fire: '#ff7a2a', ice: '#9fe3ff', rock: '#8f8a80', water: '#3a9ae8', leaf: '#6fae4f', zap: '#ffd84a', star: '#ffe27a', rainbow: '#b58cff', moon: '#c9b8ff', wind: '#e8f4f0', bubble: '#bfe8ff', light: '#fff2a8' };
  var SHAPE = { pierce: 'goes through', lob: 'lobbed', boomer: 'boomerang', multi: '3 lanes', chain: 'jumps lanes', snipe: 'hits the farthest', seek: 'homing', rain: 'falls anywhere', beam: 'short range' };
  var SPRING = { mine: 'blasts what steps on it', grab: 'grabs one that steps on it', trap: 'traps what steps on it' };
  function atk(sp) { return ATK[sp] || { n: 'Tackle', t: 'ranged', f: 'rock', k: 'shot', dmg: 12, every: 1.6 }; }
  function atkTitle(a) { return TYPE_LABEL[a.t] + (a.t === 'ranged' ? ' · ' + (FLAVOUR[a.f] || '') : ''); }
  function atkLine(a) {
    var bits = [];
    if (a.t === 'ranged' && SHAPE[a.k]) bits.push(SHAPE[a.k]);
    if (a.t === 'rush') bits.push(a.pierce ? 'charges down the whole lane' : 'runs up, hits, runs back');
    if (a.t === 'wall') bits.push('soaks up bites');
    if (a.t === 'ambush') bits.push(SPRING[a.a]);
    if (a.slow) bits.push('slows'); if (a.stun) bits.push('freezes'); if (a.burn) bits.push('burns'); if (a.knock) bits.push('pushes back');
    if (a.thorns) bits.push('bites back'); if (a.gen) bits.push('makes bubbles'); if (a.heal) bits.push('heals'); if (a.tile) bits.push('mud'); if (a.crit) bits.push('lucky hits'); if (a.revive) bits.push('comes back once');
    return bits.join(', ');
  }
  var FOES = {
    dust: { name: 'Dust bunny', hp: 60, speed: 0.24, bite: 16, size: 0.8 },
    crumb: { name: 'Crumb critter', hp: 34, speed: 0.4, bite: 10, size: 0.6 },
    sock: { name: 'Dirty sock', hp: 110, speed: 0.16, bite: 18, size: 0.85 },
    mud: { name: 'Mud blob', hp: 170, speed: 0.12, bite: 22, size: 0.9 },
    boss: { name: 'Laundry Pile', hp: 900, speed: 0.07, bite: 55, size: 1.5 }
  };
  function level(pid) { return Number(Pz().doc(pid).defLevel) || 0; }
  /* easy mode (bubbles collect themselves) is on unless this kid turned it off */
  function easyOn() { return D && D.easy != null ? D.easy : Pz().doc(D.pid).defEasy !== false; }

  /* ---------------- team ---------------- */
  function raised(pid) {
    var d = Pz().doc(pid), out = [];
    if (d.pet) out.push({ key: 'pet', sp: d.pet.sp, stage: d.pet.stage || 0, pal: d.pet.pal || 0, name: d.pet.name, power: [1.2, 1.5, 1.85][d.pet.stage || 0] + (d.pet.level || 0) * 0.02, mine: true, wear: d.pet.wear, dye: d.pet.dye });
    (d.house || []).forEach(function (x, i) { out.push({ key: 'h' + i, sp: x.sp, stage: 2, pal: x.pal || 0, name: x.name, power: 2, mine: true }); });
    return out;
  }
  function helpers(n, seed) {
    var pool = CRE.starters(), out = [];
    for (var i = 0; i < n; i++) {
      var sp = pool[Math.floor(Math.random() * pool.length)];
      out.push({ key: 'x' + i + seed, sp: sp.id, stage: 0, pal: CRE.randomPalette(sp), name: sp.names[0], power: 1, mine: false });
    }
    return out;
  }
  function open(pid) {
    var r = raised(pid);
    D = { pid: pid, phase: 'team', picks: r.slice(0, TEAM).map(function (x) { return x.key; }), raised: r, help: helpers(TEAM, Date.now() % 1000), level: level(pid) };
    A().startExpedition(pid, 'defense');
    if (window.World) window.World.unmount();
    C().go();
  }
  function active() { return !!D; }
  function teamList() {
    var picked = D.raised.filter(function (x) { return D.picks.indexOf(x.key) >= 0; }).slice(0, TEAM);
    return picked.concat(D.help.slice(0, TEAM - picked.length)).map(function (x) {
      var sp = CRE.byId(x.sp) || CRE.SPECIES[0], a = atk(sp.id);
      return { sp: x.sp, stage: x.stage, pal: x.pal, name: x.name, power: x.power, mine: x.mine, elem: ELEM[sp.type] || 'leaf', type: sp.type, atk: a, cost: (x.mine ? 75 : 50) + (a.t === 'wall' ? -10 : a.t === 'ambush' ? -15 : 0) + (a.gen ? -15 : 0), cool: 0, wear: x.wear, dye: x.dye };
    });
  }

  /* ---------------- screens ---------------- */
  function render(view) {
    if (!D) return;
    if (D.phase === 'team') { view.innerHTML = teamHtml(); return; }
    if (D.phase === 'play' && !view.querySelector('#defCanvas')) mount(view);
    if (D.phase === 'done') view.innerHTML = doneHtml();
  }
  function art(x) { return CRE.draw(x.sp, x.stage, x.pal, 'ok', { acc: x.wear || '', pal: x.dye && A() ? A().dyePal(x.dye) : null }); }
  function cardAtk(x) { var a = atk(x.sp); return '<small class="def-atk"><span class="def-kind k-' + a.t + '">' + esc(atkTitle(a)) + '</span><b>' + esc(a.n) + '</b> &middot; ' + esc(atkLine(a)) + '</small>'; }
  function teamHtml() {
    var h = '<section class="def stack tight"><div class="room-top"><strong>Mess Defense &middot; Round ' + (D.level + 1) + '</strong><button class="btn small" type="button" data-dact="quit">Leave</button></div>' +
      '<p class="note">Mess monsters are marching on the house! Pick your team. Pets you raised are stronger than helpers.</p>';
    if (D.raised.length) {
      h += '<h2>Your pets</h2><div class="def-team">' + D.raised.map(function (x) {
        var on = D.picks.indexOf(x.key) >= 0;
        return '<button type="button" class="def-card mine' + (on ? ' on' : '') + '" data-dact="pick" data-k="' + x.key + '" aria-pressed="' + on + '"><span class="def-art">' + art(x) + '</span><strong>' + esc(x.name) + '</strong><small>' + esc(CRE.byId(x.sp).type) + ' &middot; power ' + x.power.toFixed(1) + '</small>' + cardAtk(x) + '</button>';
      }).join('') + '</div>';
    }
    var list = teamList(), fill = list.filter(function (x) { return !x.mine; });
    if (fill.length) h += '<h2>Helpers</h2><div class="def-team">' + fill.map(function (x) { return '<div class="def-card"><span class="def-art">' + art(x) + '</span><strong>' + esc(x.name) + '</strong><small>' + esc(x.type) + ' &middot; helper</small>' + cardAtk(x) + '</div>'; }).join('') + '</div>';
    h += '<div class="card def-combos"><strong>Combos</strong><ul>' +
      '<li><b class="c-fire">Fire</b> + <b class="c-leaf">Leaf</b>: hot coals. Three coals in one spot become a <b>fire wall</b>.</li>' +
      '<li><b class="c-fire">Fire</b> + <b class="c-water">Water</b>: steam that freezes monsters for a moment.</li>' +
      '<li><b class="c-water">Water</b> + <b class="c-leaf">Leaf</b>: a mud patch that slows everything.</li>' +
      '<li><b class="c-rainbow">Mythic</b> rainbow attacks finish any combo.</li></ul>' +
      '<small class="note">Tap the soap bubbles to collect them, then tap a creature card and a square to place it.</small></div>';
    var left = A().exp() ? Math.max(0, Math.round((A().exp().endsAt - Date.now()) / 60000)) : 0;
    h += '<label class="def-easy"><input type="checkbox" id="defEasy"' + (easyOn() ? ' checked' : '') + '> <span><b>Easy mode</b>: soap bubbles collect themselves</span></label>';
    h += '<button class="btn primary block" type="button" data-dact="start">Start round (' + left + ' min of adventure time left)</button></section>';
    return h;
  }
  function doneHtml() {
    var r = D.result;
    return '<section class="def stack tight"><div class="celebrate-card' + (r.win ? ' r-rare' : '') + '" style="position:static;margin:0 auto">' +
      '<h2>' + (r.win ? 'The house is spotless!' : r.time ? 'Adventure time is up' : 'The mess got in!') + '</h2>' +
      '<p>' + r.kills + ' mess monster' + (r.kills === 1 ? '' : 's') + ' cleaned up' + (r.combos ? ', ' + r.combos + ' combo' + (r.combos === 1 ? '' : 's') : '') + '.</p>' +
      '<p><strong>+' + r.tickets + ' deck ticket' + (r.tickets === 1 ? '' : 's') + '</strong>' + (r.win ? ' &middot; next time is Round ' + (D.level + 2) : '') + '</p>' +
      '<div class="wrap" style="justify-content:center">' + (A().exp() && A().exp().endsAt > Date.now() + 30000 ? '<button class="btn primary" type="button" data-dact="again">Play again</button>' : '') +
      '<button class="btn" type="button" data-dact="quit">Back to town</button></div></div></section>';
  }

  /* ---------------- art ---------------- */
  var imgs = {};
  if (window.C3D) C3D.onReady(function () { imgs = {}; });
  function img(key, svg) {
    var e = imgs[key]; if (e) return e.ok ? e.im : null;
    e = imgs[key] = { im: new Image(), ok: false };
    e.im.onload = function () { e.ok = true; };
    e.im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(typeof svg === 'function' ? svg() : svg);
    return null;
  }
  function eyes(y, angry) {
    return '<ellipse cx="38" cy="' + y + '" rx="7" ry="8" fill="#fff"/><ellipse cx="62" cy="' + y + '" rx="7" ry="8" fill="#fff"/><circle cx="35" cy="' + (y + 2) + '" r="4" fill="#2b2233"/><circle cx="58" cy="' + (y + 2) + '" r="4" fill="#2b2233"/>' +
      (angry ? '<path d="M29 ' + (y - 10) + ' L45 ' + (y - 5) + ' M71 ' + (y - 10) + ' L55 ' + (y - 5) + '" stroke="#2b2233" stroke-width="4" stroke-linecap="round"/>' : '');
  }
  function foeSvg(type, frame) {
    var s = '', w = frame ? 3 : -3;
    if (type === 'dust') {
      for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2; s += '<circle cx="' + (50 + Math.cos(a) * 30).toFixed(1) + '" cy="' + (56 + Math.sin(a) * 28).toFixed(1) + '" r="12" fill="#9a9aa4"/>'; }
      s += '<circle cx="50" cy="56" r="32" fill="#a8a8b2" stroke="#6a6a74" stroke-width="3"/><ellipse cx="34" cy="22" rx="7" ry="16" fill="#a8a8b2" stroke="#6a6a74" stroke-width="3" transform="rotate(-15 34 22)"/><ellipse cx="66" cy="22" rx="7" ry="16" fill="#a8a8b2" stroke="#6a6a74" stroke-width="3" transform="rotate(15 66 22)"/>' + eyes(52, true) + '<path d="M42 70 Q50 64 58 70" stroke="#2b2233" stroke-width="3" fill="none"/>' +
        '<ellipse cx="' + (38 + w) + '" cy="90" rx="9" ry="5" fill="#6a6a74"/><ellipse cx="' + (62 - w) + '" cy="90" rx="9" ry="5" fill="#6a6a74"/>';
    } else if (type === 'crumb') {
      s += '<rect x="24" y="30" width="52" height="46" rx="8" fill="#e8c07a" stroke="#a8803a" stroke-width="3" transform="rotate(' + (frame ? 6 : -6) + ' 50 53)"/><circle cx="36" cy="40" r="2" fill="#a8803a"/><circle cx="64" cy="44" r="2" fill="#a8803a"/><circle cx="46" cy="70" r="2" fill="#a8803a"/>' + eyes(50, true) + '<path d="M44 64 L56 64" stroke="#2b2233" stroke-width="3"/>' +
        '<path d="M34 76 l' + w + ' 14 M66 76 l' + (-w) + ' 14" stroke="#a8803a" stroke-width="4" stroke-linecap="round"/>';
    } else if (type === 'sock') {
      s += '<path d="M30 8 L64 8 L64 62 Q66 86 44 90 L24 90 Q12 90 14 78 Q16 70 30 68 Z" fill="#f4f1ea" stroke="#8a8478" stroke-width="3" transform="rotate(' + (frame ? 4 : -4) + ' 45 50)"/><path d="M30 16 L64 16 M30 24 L64 24" stroke="#e45757" stroke-width="5"/><ellipse cx="30" cy="82" rx="10" ry="6" fill="#8a7a5a" opacity=".5"/>' +
        '<g transform="translate(-2 -12)">' + eyes(52, true) + '</g><path d="M40 58 Q48 54 56 58" stroke="#2b2233" stroke-width="3" fill="none"/>' +
        '<path d="M74 30 q6 -6 0 -12 q-6 -6 0 -12 M84 40 q6 -6 0 -12 q-6 -6 0 -12" stroke="#7fc241" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    } else if (type === 'mud') {
      s += '<path d="M14 88 Q8 50 30 34 Q50 ' + (18 + w) + ' 70 34 Q92 50 86 88 Q70 96 50 90 Q30 96 14 88 Z" fill="#8a5a34" stroke="#5a3418" stroke-width="3"/><circle cx="30" cy="70" r="5" fill="#a8784e"/><circle cx="72" cy="62" r="4" fill="#a8784e"/><circle cx="62" cy="80" r="3" fill="#a8784e"/>' + eyes(56, true) + '<path d="M40 74 Q50 68 60 74" stroke="#2b2233" stroke-width="3" fill="none"/>';
    } else {
      s += '<path d="M6 94 Q2 60 20 50 Q18 28 40 24 Q50 8 66 20 Q88 22 88 44 Q100 60 94 94 Z" fill="#7a8ac8" stroke="#3a4a88" stroke-width="3"/>' +
        '<path d="M14 60 L40 56 L44 70 L18 76 Z" fill="#e45757" stroke="#8a2424" stroke-width="2"/><path d="M58 30 L84 36 L80 52 L56 46 Z" fill="#f2d43a" stroke="#a8871c" stroke-width="2"/><path d="M20 80 L50 84 L48 94 L18 92 Z" fill="#6fcf8f" stroke="#2e7a4a" stroke-width="2"/><path d="M64 70 q10 -4 18 4 l-4 14 q-10 2 -16 -4 Z" fill="#f4f1ea" stroke="#8a8478" stroke-width="2"/>' +
        '<g transform="translate(0 4)">' + eyes(44, true) + '</g><path d="M34 ' + (68 + (frame ? 2 : 0)) + ' Q50 58 66 ' + (68 + (frame ? 2 : 0)) + ' Q50 78 34 68 Z" fill="#5a2a3a"/><path d="M40 66 l4 5 l4 -5 l4 5 l4 -5 l4 5" stroke="#fff" stroke-width="2" fill="none"/>';
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  }
  /* 3D mess monsters (art/foe3d.py): two walking frames each, recoloured with these colours */
  var FOE_PAL = {
    dust: { main: '#a8a8b2', dark: '#5e5e68', light: '#d8d8e0', accent: '#c8c8d0' }, crumb: { main: '#e8c07a', dark: '#a8803a', light: '#f6dca8', accent: '#c99a50' },
    sock: { main: '#f4f1ea', dark: '#8a8478', light: '#d8d0c0', accent: '#e45757' }, mud: { main: '#8a5a34', dark: '#4a2c14', light: '#a8784e', accent: '#6a4024' },
    boss: { main: '#7a8ac8', dark: '#3a4a88', light: '#b8c4f0', accent: '#f2d43a' }
  };
  function foeSprite(type, fr) { return window.C3D && !C3D.off && C3D.has('foe_' + type) ? C3D.sprite('foe_' + type, fr, FOE_PAL[type], 'walk') : null; }
  /* defenders face right toward the mess: the 3D side view, mirrored */
  function creImg(x, frame, left) {
    var key = 'c|' + x.sp + x.stage + x.pal + (x.wear || '') + (x.dye || '') + '|' + frame + (left ? 'L' : '');
    return img(key, function () {
      return CRE.draw(x.sp, x.stage, x.pal, frame === 2 ? 'happy' : 'ok', { view: 'side', flip: !left, tailRot: frame === 1 ? 8 : frame === 3 ? -8 : 0, blink: frame === 4, acc: x.wear || '', pal: x.dye && A() ? A().dyePal(x.dye) : null });
    });
  }

  /* ---------------- play ---------------- */
  function waves(L) {
    var list = [], t = 7, hpk = 1 + L * 0.15;
    for (var w = 0; w < 3; w++) {
      var n = 5 + L * 2 + w * 3;
      for (var i = 0; i < n; i++) {
        var r = Math.random(), type = 'dust';
        if (w + L >= 1 && r < 0.25) type = 'crumb';
        else if (w + L >= 1 && r < 0.5) type = 'sock';
        else if (w + L >= 2 && r < 0.68) type = 'mud';
        list.push({ t: t, type: type, lane: Math.floor(Math.random() * LANES), hpk: hpk, wave: w });
        t += Math.max(1.3, 3.4 - L * 0.2 - w * 0.4) + Math.random() * 1.2;
        if (type === 'crumb' && Math.random() < 0.6) { list.push({ t: t - 0.5, type: 'crumb', lane: Math.floor(Math.random() * LANES), hpk: hpk, wave: w }); }
      }
      if (w === 2 && L >= 1) list.push({ t: t + 2, type: 'boss', lane: 2, hpk: hpk * (1 + L * 0.1), wave: w });
      t += 11;
    }
    return list;
  }
  function start() {
    var team = teamList();
    D.phase = 'play';
    D.team = team; D.sel = -1; D.bubbles = 150; D.t = 0; D.spawns = waves(D.level); D.si = 0; D.wave = 0;
    D.defs = []; D.foes = []; D.shots = []; D.fx = []; D.swipes = []; D.booms = []; D.drops = []; D.tiles = {}; D.bots = [1, 1, 1, 1, 1]; D.botRuns = [];
    D.easy = easyOn();
    if (window.C3D) ['dust', 'crumb', 'sock', 'mud', 'boss'].forEach(function (k) { C3D.preload('foe_' + k); });
    D.kills = 0; D.combos = 0; D.nextBubble = 3; D.banner = { text: 'Get ready!', until: 3 }; D.lastSave = Date.now();
    C().go();
  }
  function mount(view) {
    view.innerHTML = '<section class="def-play"><div class="def-hud"><span class="def-bub"><i></i><b class="mono" id="defBub">0</b></span><span id="defWave" class="def-wave">Wave 1 of 3</span><span id="defTime" class="mono def-time"></span><button class="btn small" type="button" data-dact="quit">Leave</button></div>' +
      '<canvas id="defCanvas" class="def-canvas" aria-label="Mess Defense board"></canvas><div class="def-cards" id="defCards"></div><p class="note def-tip" id="defTip"></p></section>';
    var cv = view.querySelector('#defCanvas');
    D.cv = cv; D.ctx = cv.getContext('2d'); D.root = view;
    size();
    cardsHtml();
    D.run = true; D.last = 0; RAF(tick);
  }
  /* board: house strip on the left (HW wide), CELLS squares to the right; lane 0 at the top.
     A mess's progress p goes from -0.6 (just off the right edge) to CELLS (inside the house). */
  function size() {
    var w = Math.min(D.root.clientWidth || 320, 560), cell = Math.floor(w / (CELLS + 0.8)), dpr = Math.min(2, window.devicePixelRatio || 1);
    D.cell = cell; D.HW = Math.round(cell * 0.8); D.W = D.HW + cell * CELLS; D.H = cell * LANES; D.dpr = dpr;
    D.cv.width = D.W * dpr; D.cv.height = D.H * dpr; D.cv.style.width = D.W + 'px'; D.cv.style.height = D.H + 'px';
  }
  function sx(p) { return D.HW + (CELLS - 0.5 - p) * D.cell; }
  function sy(lane) { return lane * D.cell + D.cell / 2; }
  function cardsHtml() {
    var el = D.root.querySelector('#defCards'); if (!el) return;
    el.innerHTML = D.team.map(function (x, i) {
      return '<button type="button" class="def-slot' + (x.mine ? ' mine' : '') + '" data-dact="card" data-i="' + i + '"><span class="def-slot-art">' + CRE.draw(x.sp, x.stage, x.pal, 'ok', { acc: x.wear || '' }) + '</span><small class="mono">' + x.cost + '</small><i class="def-cool"></i></button>';
    }).join('');
    updateCards();
  }
  function updateCards() {
    var el = D.root && D.root.querySelector('#defCards'); if (!el) return;
    var btns = el.querySelectorAll('.def-slot');
    for (var i = 0; i < btns.length; i++) {
      var x = D.team[i], b = btns[i], ready = x.cool <= 0 && D.bubbles >= x.cost;
      b.className = 'def-slot' + (x.mine ? ' mine' : '') + (D.sel === i ? ' sel' : '') + (ready ? '' : ' wait');
      b.querySelector('.def-cool').style.height = Math.max(0, Math.min(1, x.cool / 6)) * 100 + '%';
    }
    var tip = D.root.querySelector('#defTip');
    if (tip) { var s = D.sel >= 0 ? D.team[D.sel] : null; tip.innerHTML = s ? '<b>' + esc(s.name) + '</b>: ' + esc(s.atk.n) + ' (' + esc(atkLine(s.atk)) + '). Tap a square to place.' : ''; }
    var bb = D.root.querySelector('#defBub'); if (bb) bb.textContent = D.bubbles;
    var wv = D.root.querySelector('#defWave'); if (wv) wv.textContent = 'Wave ' + (D.wave + 1) + ' of 3';
    var tm = D.root.querySelector('#defTime'), e = A().exp();
    if (tm && e) { var left = Math.max(0, Math.round((e.endsAt - Date.now()) / 1000)); tm.textContent = Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60); }
  }
  function tap(px, py) {
    var c = D.cell;
    for (var i = D.drops.length - 1; i >= 0; i--) {
      var b = D.drops[i];
      if (Math.abs(px - b.x) < c * 0.45 && Math.abs(py - b.y) < c * 0.45) { D.bubbles += b.v; D.drops.splice(i, 1); fxAt('+' + b.v, b.x, b.y, '#3a8ed8'); updateCards(); return; }
    }
    if (px < D.HW) return;
    var cell = CELLS - 1 - Math.floor((px - D.HW) / c), lane = Math.floor(py / c);
    if (cell < 0 || cell >= CELLS || lane < 0 || lane >= LANES) return;
    if (D.sel < 0) { if (defAt(lane, cell)) toast('Tap a creature card first, then an empty square.'); return; }
    var x = D.team[D.sel];
    if (defAt(lane, cell)) { toast('That square is taken.'); return; }
    if (x.cool > 0 || D.bubbles < x.cost) return;
    D.bubbles -= x.cost; x.cool = 6;
    var a = x.atk, hp = 80 * x.power * (a.hp || 1);
    D.defs.push({ lane: lane, cell: cell, pos: cell, x: x, a: a, hp: hp, max: hp, next: 0.4, kick: 0, gen: a.gen || 0, heal: 3, revive: a.revive || 0, rush: null, armed: a.t === 'ambush', rearmT: 0 });
    D.sel = -1; updateCards();
  }
  function toast(t) { D.banner = { text: t, until: D.t + 1.8, small: true }; }
  function defAt(lane, cell) { for (var i = 0; i < D.defs.length; i++) if (D.defs[i].lane === lane && D.defs[i].cell === cell) return D.defs[i]; return null; }
  function fx(text, p, lane, col) { D.fx.push({ text: text, x: sx(p), y: sy(lane) - D.cell * 0.2, col: col, t0: D.t }); }
  function fxAt(text, x, y, col) { D.fx.push({ text: text, x: x, y: y, col: col, t0: D.t }); }
  function tile(lane, cell) { var k = lane + ',' + cell; return D.tiles[k] || (D.tiles[k] = { coals: 0, wall: 0, mud: 0 }); }

  function spawn(s) {
    var F = FOES[s.type];
    D.foes.push({ type: s.type, lane: s.lane, p: -0.6, hp: F.hp * s.hpk, max: F.hp * s.hpk, slow: 0, stun: 0, burn: 0, burnD: 0, tags: {}, f: 0 });
    D.wave = Math.max(D.wave, s.wave);
    if (s.type === 'boss') D.banner = { text: 'The Laundry Pile is coming!', until: D.t + 3 };
  }
  /* one attack lands on one mess: damage, the attack's effects, then element combos */
  var mixI = 0;
  function hit(foe, elem, dmg, a, power) {
    if (a && a.crit && Math.random() < a.crit) { dmg *= 2.5; fx('Lucky!', foe.p, foe.lane, '#e8a92b'); }
    if (a && a.eats && foe.type === a.eats) { dmg = foe.hp + 1; fx('Gulp!', foe.p, foe.lane, '#3f7a2f'); }
    foe.hp -= dmg;
    if (a) {
      var eff = a.mix ? ['burn', 'slow', 'knock'][mixI = (mixI + 1) % 3] : null;
      if (a.slow || eff === 'slow') foe.slow = Math.max(foe.slow, a.slow || 2);
      if (a.stun) foe.stun = Math.max(foe.stun, a.stun * (foe.type === 'boss' ? 0.4 : 1));
      if (a.burn || eff === 'burn') { foe.burn = Math.max(foe.burn, a.burn || 2); foe.burnD = Math.max(foe.burnD, 4 * (power || 1)); }
      if ((a.knock || eff === 'knock') && foe.type !== 'boss') foe.p = Math.max(-0.6, foe.p - (a.knock || 1));
      if (a.tile) { var cl = Math.max(0, Math.min(CELLS - 1, Math.floor(foe.p + 0.5))); tile(foe.lane, cl).mud = Math.max(tile(foe.lane, cl).mud, 4); }
    }
    var now = D.t, tg = foe.tags, fresh = function (k) { return tg[k] && now - tg[k] < 2.5; };
    var others = ['fire', 'water', 'leaf'].filter(function (k) { return k !== elem && fresh(k); });
    var combo = null;
    if (elem === 'rainbow' && others.length) combo = pair(others[0], others[0] === 'fire' ? 'leaf' : 'fire');
    else if (elem === 'rainbow') { tg[['fire', 'water', 'leaf'][Math.floor(Math.random() * 3)]] = now; }
    else if (others.length) combo = pair(elem, others[0]);
    else tg[elem] = now;
    if (combo) {
      tg.fire = tg.water = tg.leaf = 0; D.combos++;
      var cell = Math.max(0, Math.min(CELLS - 1, Math.floor(foe.p + 0.5)));
      if (combo === 'coals') {
        var tl = tile(foe.lane, cell); tl.coals++;
        if (tl.coals >= 3) { tl.coals = 0; tl.wall = 8; fx('FIRE WALL!', cell, foe.lane, '#ff5a1a'); }
        else fx('Hot coals ' + tl.coals + '/3', foe.p, foe.lane, '#e8653c');
      } else if (combo === 'steam') {
        foe.stun = Math.max(foe.stun, 2.2); foe.hp -= 10;
        D.foes.forEach(function (o) { if (o !== foe && o.lane === foe.lane && Math.abs(o.p - foe.p) < 1.2) o.stun = Math.max(o.stun, 1.2); });
        fx('Steam!', foe.p, foe.lane, '#9aa4b2');
      } else {
        tile(foe.lane, cell).mud = 6; fx('Mud!', foe.p, foe.lane, '#8a5a34');
      }
    }
  }
  function pair(a, b) {
    var s = [a, b].sort().join('+');
    return s === 'fire+leaf' ? 'coals' : s === 'fire+water' ? 'steam' : s === 'leaf+water' ? 'mud' : null;
  }
  function tick(ts) {
    if (!D || !D.run) return;
    if (!D.cv || !document.body.contains(D.cv)) { D.run = false; return; }
    var dt = Math.min(0.05, D.last ? (ts - D.last) / 1000 : 0.016); D.last = ts; D.t += dt;
    step(dt);
    if (D && D.run) draw();
    if (D && Math.floor(D.t * 8) !== Math.floor((D.t - dt) * 8)) updateCards();
    if (D && D.run) RAF(tick);
  }
  /* messes in a lane that are ahead of (to the right of) a square, nearest first */
  function ahead(lane, cell, range) {
    return D.foes.filter(function (f) { return f.lane === lane && f.hp > 0 && f.p > -0.9 && f.p <= cell + 0.3 && cell - f.p <= range; })
      .sort(function (a, b) { return b.p - a.p; });
  }
  function act(d) {
    var a = d.a, x = d.x, dmg = (a.dmg || 0) * x.power, elem = x.elem, f = a.f, lane = d.lane, cell = d.cell, list, i;
    if (a.t === 'wall' || a.t === 'ambush') return false;
    if (a.t === 'rush') {
      list = ahead(lane, cell, a.r || 3); if (!list.length) return false;
      d.rush = { out: true, hits: [], target: list[0], until: Math.max(-0.5, cell - (a.r || 7)) };
      return true;
    }
    if (a.k === 'shot' || a.k === 'pierce' || a.k === 'boomer' || a.k === 'lob') {
      list = ahead(lane, cell, a.k === 'lob' ? 5 : 9); if (!list.length) return false;
      var nShots = a.shots || 1;
      for (i = 0; i < nShots; i++) D.shots.push({ lane: lane, p: cell - 0.1 + i * 0.28, from: cell, elem: elem, f: f, dmg: dmg, a: a, power: x.power, k: a.k, hits: [], back: false, tp: list[0].p, life: 3 });
      return true;
    }
    if (a.k === 'beam') {
      list = ahead(lane, cell, a.r || 1.5); if (!list.length) return false;
      (a.sweep ? list : [list[0]]).forEach(function (fo) { hit(fo, elem, dmg, a, x.power); });
      D.swipes.push({ lane: lane, from: cell, to: list[a.sweep ? list.length - 1 : 0].p, elem: elem, f: f, t0: D.t, k: 'beam' });
      return true;
    }
    if (a.k === 'snipe') {
      list = ahead(lane, cell, 9); if (!list.length) return false;
      var far = list[list.length - 1]; hit(far, elem, dmg, a, x.power);
      D.swipes.push({ lane: lane, from: cell, to: far.p, elem: elem, f: f, t0: D.t, k: 'beam' });
      return true;
    }
    if (a.k === 'seek' || a.k === 'rain') {
      var all = D.foes.filter(function (fo) { return fo.hp > 0 && fo.p > -0.5; }); if (!all.length) return false;
      var n = a.k === 'rain' ? (a.shots || 3) : 1;
      for (i = 0; i < n; i++) {
        var tg = a.k === 'rain' ? all[Math.floor(Math.random() * all.length)] : all.slice().sort(a.near ? function (p, q) { return q.p - p.p; } : function (p, q) { return q.hp - p.hp; })[0];
        D.shots.push({ lane: tg.lane, p: tg.p, from: cell, elem: elem, f: f, dmg: dmg, a: a, power: x.power, k: 'drop', target: tg, t0: D.t, life: 2, drop: a.k === 'rain' ? 0.5 + i * 0.12 : 0.35 });
      }
      return true;
    }
    if (a.k === 'multi' || a.k === 'chain') {
      var any = false;
      [lane, lane - 1, lane + 1].forEach(function (l, j) {
        if (l < 0 || l >= LANES) return;
        if (a.k === 'chain' && j > 0) return;
        if (ahead(l, cell, 9).length) { any = true; D.shots.push({ lane: l, p: cell - 0.1, from: cell, elem: elem, f: f, dmg: dmg, a: a, power: x.power, k: a.k === 'chain' ? 'chain' : 'shot', hits: [], life: 3 }); }
      });
      return any;
    }
    return false;
  }
  /* rushers run out at a mess (or down the whole lane), hit, and run back to their square */
  function rushStep(d, dt) {
    var R = d.rush, a = d.a, spd = 7;
    if (R.out) {
      d.pos -= spd * dt;
      if (a.pierce) {
        D.foes.forEach(function (f) { if (f.lane === d.lane && f.hp > 0 && R.hits.indexOf(f) < 0 && Math.abs(f.p - d.pos) < 0.45) { R.hits.push(f); hit(f, d.x.elem, a.dmg * d.x.power, a, d.x.power); } });
        if (d.pos <= R.until) R.out = false;
      } else if (!R.target || R.target.hp <= 0 || d.pos < -0.6) R.out = false;
      else if (d.pos <= R.target.p + 0.45) {
        hit(R.target, d.x.elem, a.dmg * d.x.power, a, d.x.power); d.kick = 1; R.out = false;
        D.booms.push({ x: sx(d.pos) + D.cell * 0.35, y: sy(d.lane), t0: D.t, col: '#ffffff', r: D.cell * 0.35 });
      }
    } else {
      d.pos += spd * dt;
      if (d.pos >= d.cell) { d.pos = d.cell; d.rush = null; }
    }
  }
  /* ambushers spring when a mess steps on their square, then re-arm */
  function spring(d, on) {
    var a = d.a, p = d.x.power, c = D.cell, elem = d.x.elem;
    d.armed = false; d.rearmT = a.rearm || 12; d.kick = 1;
    if (a.a === 'mine') {
      D.foes.forEach(function (f) { if (f.lane === d.lane && f.hp > 0 && Math.abs(f.p - d.cell) <= 0.9) hit(f, elem, a.dmg * p, a, p); });
      D.booms.push({ x: sx(d.cell), y: sy(d.lane), t0: D.t, col: a.burn ? '#ff7a2a' : '#ffd84a', r: c * 0.95 });
      fx('Pop!', d.cell, d.lane, '#e8653c');
    } else if (a.a === 'grab') {
      var f = on.sort(function (x, y) { return y.p - x.p; })[0];
      if (f.type === 'boss') hit(f, elem, a.dmg * p * 1.2, a, p);
      else { hit(f, elem, 0, null, p); f.hp = 0; }
      D.booms.push({ x: sx(f.p), y: sy(d.lane), t0: D.t, col: '#3f7a2f', r: c * 0.5 });
      fx(f.type === 'boss' ? 'Chomp!' : 'Gotcha!', d.cell, d.lane, '#3f7a2f');
    } else {
      D.foes.forEach(function (f) { if (f.lane === d.lane && f.hp > 0 && Math.abs(f.p - d.cell) <= (a.splash || 0.6)) hit(f, elem, a.dmg * p, a, p); });
      D.booms.push({ x: sx(d.cell), y: sy(d.lane), t0: D.t, col: '#9fe3ff', r: c * 0.75 });
      fx(a.knock ? 'Riddle me this!' : 'Trapped!', d.cell, d.lane, '#2a6aa8');
    }
  }
  function step(dt) {
    var e = A().exp();
    if (!e || Date.now() >= e.endsAt) { finish(false, true); return; }
    if (Date.now() - D.lastSave > 60000) { D.lastSave = Date.now(); A().saveTime(false); }
    while (D.si < D.spawns.length && D.spawns[D.si].t <= D.t) spawn(D.spawns[D.si++]);
    if (D.si < D.spawns.length && D.spawns[D.si].wave > D.wave && D.foes.length === 0 && !D.waveMsg) { D.waveMsg = true; D.banner = { text: 'Wave ' + (D.spawns[D.si].wave + 1) + '!', until: D.t + 2.5 }; }
    if (D.si < D.spawns.length && D.spawns[D.si].wave === D.wave) D.waveMsg = false;
    D.team.forEach(function (x) { if (x.cool > 0) x.cool -= dt; });
    var c = D.cell;
    /* bubbles float up from the bottom of the board */
    D.nextBubble -= dt;
    if (D.nextBubble <= 0) { D.nextBubble = 5 + Math.random() * 2.5; D.drops.push({ x: D.HW + c * 0.5 + Math.random() * (CELLS - 1) * c, y: D.H + c * 0.2, v: 25, life: 9 }); }
    D.drops.forEach(function (b) { if (!b.still) b.y = Math.max(D.H * 0.3, b.y - dt * c * 0.7); b.life -= dt; b.age = (b.age || 0) + dt; });
    if (D.easy) D.drops.forEach(function (b) { if (b.age > 0.8 && b.life > 0) { D.bubbles += b.v; fxAt('+' + b.v, b.x, b.y, '#3a8ed8'); b.life = 0; } });
    D.drops = D.drops.filter(function (b) { return b.life > 0; });
    /* tiles */
    for (var k in D.tiles) if (D.tiles.hasOwnProperty(k)) { var tl = D.tiles[k]; if (tl.wall > 0) tl.wall -= dt; if (tl.mud > 0) tl.mud -= dt; }
    /* defenders */
    D.defs.forEach(function (d) {
      d.kick = Math.max(0, d.kick - dt * 4);
      if (d.rush) { rushStep(d, dt); return; }
      if (d.a.t === 'ambush') {
        if (!d.armed) { d.rearmT -= dt; if (d.rearmT <= 0) { d.armed = true; fx('Ready', d.cell, d.lane, '#2f9e5b'); } return; }
        var on = D.foes.filter(function (f) { return f.lane === d.lane && f.hp > 0 && Math.abs(f.p - d.cell) < 0.35; });
        if (on.length) spring(d, on);
        return;
      }
      if (d.a.gen) { d.gen -= dt; if (d.gen <= 0) { d.gen = d.a.gen; D.drops.push({ x: sx(d.cell), y: sy(d.lane) - c * 0.4, v: 25, life: 8, still: true }); } }
      if (d.a.heal) { d.heal -= dt; if (d.heal <= 0) { d.heal = 3; D.defs.forEach(function (o) { if (o !== d && Math.abs(o.lane - d.lane) + Math.abs(o.cell - d.cell) <= 1 && o.hp < o.max) { o.hp = Math.min(o.max, o.hp + d.a.heal * d.x.power); fx('+', o.cell, o.lane, '#2f9e5b'); } }); } }
      d.next -= dt; if (d.next > 0) return;
      if (act(d)) { d.next = d.a.every || 1.6; d.kick = 1; } else d.next = 0.2;
    });
    /* shots */
    D.shots.forEach(function (s) {
      s.life -= dt; if (s.life <= 0) { s.dead = true; return; }
      if (s.k === 'drop') {
        if (D.t - s.t0 >= s.drop) { if (s.target.hp > 0) hit(s.target, s.elem, s.dmg, s.a, s.power); s.dead = true; }
        else { s.p = s.target.p; s.lane = s.target.lane; }
        return;
      }
      var speed = s.k === 'roll' ? 6 : s.k === 'lob' ? 4 : 5.5;
      s.p += (s.back ? 1 : -1) * dt * speed;
      if (s.k === 'lob') {
        if (s.p <= s.tp) {
          D.foes.forEach(function (f) { if (f.lane === s.lane && f.hp > 0 && Math.abs(f.p - s.p) <= (s.a.splash || 0.45)) hit(f, s.elem, s.dmg, s.a, s.power); });
          s.dead = true;
        } else {
          var tgt = ahead(s.lane, s.from, 9)[0]; if (tgt) s.tp = Math.max(s.tp, tgt.p);
        }
        return;
      }
      var hitF = null;
      D.foes.forEach(function (f) { if (f.lane === s.lane && f.hp > 0 && Math.abs(f.p - s.p) < 0.4 && s.hits.indexOf(f) < 0 && (!hitF || f.p > hitF.p)) hitF = f; });
      if (hitF) {
        hit(hitF, s.elem, s.dmg, s.a, s.power);
        if (s.k === 'pierce' || s.k === 'roll' || s.k === 'boomer') s.hits.push(hitF);
        else if (s.k === 'chain') {
          var nl = [s.lane - 1, s.lane + 1].filter(function (l) { return l >= 0 && l < LANES && D.foes.some(function (f) { return f.lane === l && f.hp > 0; }); });
          if (nl.length) { var l2 = nl[Math.floor(Math.random() * nl.length)], f2 = D.foes.filter(function (f) { return f.lane === l2 && f.hp > 0; }).sort(function (a2, b2) { return b2.p - a2.p; })[0]; D.swipes.push({ lane: s.lane, lane2: l2, from: s.p, to: f2.p, elem: s.elem, t0: D.t, k: 'zap' }); hit(f2, s.elem, s.dmg * 0.7, s.a, s.power); }
          s.dead = true;
        } else s.dead = true;
      }
      if (s.k === 'boomer' && !s.back && (s.p < -0.8 || s.from - s.p > 4)) { s.back = true; s.hits = []; }
      if (s.k === 'boomer' && s.back && s.p >= s.from) s.dead = true;
      if (s.p < -1) s.dead = true;
    });
    D.shots = D.shots.filter(function (s) { return !s.dead; });
    D.swipes = D.swipes.filter(function (w) { return D.t - w.t0 < 0.3; });
    D.booms = D.booms.filter(function (bm) { return D.t - bm.t0 < 0.45; });
    /* foes */
    D.foes.forEach(function (f) {
      var F = FOES[f.type], cl = Math.floor(f.p + 0.5), tl = cl >= 0 && cl < CELLS ? D.tiles[f.lane + ',' + cl] : null;
      if (tl && tl.wall > 0) f.hp -= 35 * dt;
      if (f.burn > 0) { f.burn -= dt; f.hp -= f.burnD * dt; }
      if (f.stun > 0) { f.stun -= dt; return; }
      if (f.slow > 0) f.slow -= dt;
      var spd = F.speed * (f.slow > 0 ? 0.6 : 1) * (tl && tl.mud > 0 ? 0.3 : 1);
      var eat = null;
      D.defs.forEach(function (d) { if (d.a.t !== 'ambush' && !d.rush && d.lane === f.lane && f.p + F.size * 0.45 >= d.cell && f.p < d.cell + 0.6) eat = d; });
      if (eat) {
        eat.hp -= F.bite * dt; f.f += dt * 6;
        if (eat.a.thorns) f.hp -= eat.a.thorns * eat.x.power * dt;
        if (eat.a.t === 'wall' && eat.a.slow) f.slow = Math.max(f.slow, eat.a.slow);
        if (eat.a.t === 'wall' && eat.a.knock && f.type !== 'boss' && Math.random() < dt * 0.5) { f.p -= eat.a.knock; fx('Boing!', f.p, f.lane, '#3a8ed8'); }
      } else { f.p += spd * dt; f.f += dt * 4; }
      if (f.p >= CELLS - 0.2) {
        if (D.bots[f.lane]) { D.bots[f.lane] = 0; D.botRuns.push({ lane: f.lane, p: CELLS + 0.2 }); fx('Mop-Bot!', CELLS - 1, f.lane, '#2a4a8f'); }
        else if (!D.botRuns.some(function (b) { return b.lane === f.lane; })) finish(false);
      }
    });
    if (!D.run) return;
    D.botRuns.forEach(function (b) { b.p -= dt * 7; D.foes.forEach(function (f) { if (f.lane === b.lane && f.p > b.p - 0.5) f.hp = 0; }); });
    D.botRuns = D.botRuns.filter(function (b) { return b.p > -1.5; });
    D.defs = D.defs.filter(function (d) {
      if (d.hp > 0) return true;
      if (d.revive > 0) { d.revive--; d.hp = d.max * 0.6; fx('Reborn!', d.cell, d.lane, '#ff7a2a'); return true; }
      fx('Oof!', d.cell, d.lane, '#9a4a4a'); return false;
    });
    var before = D.foes.length;
    D.foes = D.foes.filter(function (f) { if (f.hp <= 0) { fx('Clean!', f.p, f.lane, '#1e8a6a'); if (Math.random() < 0.3) D.drops.push({ x: sx(f.p), y: sy(f.lane), v: 15, life: 7 }); return false; } return true; });
    D.kills += before - D.foes.length;
    D.fx = D.fx.filter(function (x) { return D.t - x.t0 < 1.2; });
    if (D.si >= D.spawns.length && D.foes.length === 0) finish(true);
  }
  function finish(win, time) {
    if (!D || D.phase !== 'play') return;
    D.run = false; D.phase = 'done';
    var tickets = win ? 10 + Math.round(D.kills / 2) + D.combos : Math.floor(D.kills / 3);
    D.result = { win: win, time: !!time, kills: D.kills, combos: D.combos, tickets: tickets };
    var ops = [{ t: 'merge', c: 'pets', id: D.pid, d: { tickets: DB.inc(tickets), defBest: Math.max(Number(Pz().doc(D.pid).defBest) || 0, D.level + (win ? 1 : 0)) } }];
    if (win) ops[0].d.defLevel = DB.inc(1);
    DB.commit(ops).catch(C().fail);
    A().saveTime(false);
    C().go();
  }
  function quit() {
    if (!D) return;
    D.run = false; A().saveTime(true); D = null;
    var G = Pz().G; G.room = null;
    if (window.World && window.World.W && window.World.W.P) { var P = window.World.W.P; P.y = P.ty = Math.max(1, P.y - 1); }
    C().go();
  }

  /* ---------------- drawing ---------------- */
  function draw() {
    var g = D.ctx, c = D.cell, dpr = D.dpr, t = D.t, HW = D.HW;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var ln = 0; ln < LANES; ln++) for (var cl = 0; cl < CELLS; cl++) { g.fillStyle = (ln + cl) % 2 ? '#f1e3c8' : '#ecdcbc'; g.fillRect(HW + cl * c, ln * c, c, c); }
    g.strokeStyle = 'rgba(160,130,90,.25)'; g.lineWidth = 1;
    for (var l = 1; l < LANES; l++) { g.beginPath(); g.moveTo(HW, l * c); g.lineTo(D.W, l * c); g.stroke(); }
    /* the house on the left */
    g.fillStyle = '#b3262a'; g.fillRect(0, 0, HW, D.H);
    g.fillStyle = '#f6ecd9'; g.fillRect(0, 0, HW - 4, D.H);
    g.save(); g.translate(HW * 0.32, D.H / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = '#8a6a4a'; g.font = 'bold ' + Math.round(c * 0.17) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOME SWEET HOME', 0, 0); g.restore();
    /* tiles: mud, coals, fire walls */
    for (var k in D.tiles) if (D.tiles.hasOwnProperty(k)) {
      var tl = D.tiles[k], pp = k.split(','), tx = sx(+pp[1]) - c / 2, ty = +pp[0] * c;
      if (tl.mud > 0) { g.globalAlpha = Math.min(1, tl.mud); g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse ? g.ellipse(tx + c / 2, ty + c * 0.68, c * 0.44, c * 0.22, 0, 0, 7) : g.arc(tx + c / 2, ty + c * 0.68, c * 0.35, 0, 7); g.fill(); g.globalAlpha = 1; }
      for (var q = 0; q < tl.coals; q++) { g.fillStyle = '#5a1a0e'; g.beginPath(); g.arc(tx + c * (0.3 + q * 0.2), ty + c * 0.8, c * 0.07, 0, 7); g.fill(); g.fillStyle = 'rgba(255,120,40,' + (0.5 + 0.4 * Math.sin(t * 6 + q)) + ')'; g.beginPath(); g.arc(tx + c * (0.3 + q * 0.2), ty + c * 0.78, c * 0.035, 0, 7); g.fill(); }
      if (tl.wall > 0) for (var fl = 0; fl < 3; fl++) flame(g, tx + c * (0.2 + fl * 0.3), ty + c * 0.95, c * 0.3, c * (0.55 + 0.12 * Math.sin(t * 9 + fl)));
    }
    /* mop-bots wait in the house */
    for (var b = 0; b < LANES; b++) if (D.bots[b]) bot(g, HW * 0.72, sy(b), c * 0.15);
    D.botRuns.forEach(function (br) { bot(g, sx(br.p), sy(br.lane), c * 0.3); });
    /* defenders and messes, top lane first so lower lanes overlap */
    var items = [];
    D.defs.forEach(function (d) { items.push({ y: d.lane + 0.01, f: function () {
      var frame = d.kick > 0.3 ? 2 : (Math.floor(t * 2 + d.cell) % 8 === 0 ? 4 : 0), back = d.rush && !d.rush.out;
      var im = creImg(d.x, frame, back) || creImg(d.x, 0, back), w = c * 1.05, h = w * 1.1, cx = sx(d.pos) + (d.rush ? 0 : d.kick * 3), by = d.lane * c + c * 0.98;
      if (d.rush) by -= Math.abs(Math.sin(t * 18)) * c * 0.08;
      if (d.a.t === 'ambush') {
        if (d.armed) { g.globalAlpha = 0.55; if (im) g.drawImage(im, cx - w * 0.4, by - h * 0.62, w * 0.8, h * 0.8); g.globalAlpha = 1; }
        mound(g, cx, by - c * 0.1, c, d.armed ? 0 : d.rearmT / (d.a.rearm || 12));
      } else if (im) g.drawImage(im, cx - w / 2, by - h * 0.92, w, h);
      if (d.x.mine) { g.fillStyle = '#ffd84a'; star(g, cx - c * 0.36, d.lane * c + c * 0.14, c * 0.08); }
      if (d.hp < d.max) bar(g, cx, d.lane * c + c * 0.04, c * 0.6, d.hp / d.max, '#6fcf8f');
    } }); });
    D.foes.forEach(function (f) { items.push({ y: f.lane + 0.02, f: function () {
      var F = FOES[f.type], fr = Math.floor(f.f) % 2, s = c * F.size, cx = sx(f.p), cy = sy(f.lane), s3 = foeSprite(f.type, fr);
      if (f.stun > 0) g.globalAlpha = 0.75;
      if (s3 && s3.canvas) {
        var kk = c * (f.type === 'boss' ? 0.6 : 0.52) * s3.m.span / s3.T, gx = s3.a.ground[0], gy = s3.a.ground[1];
        g.drawImage(s3.canvas, cx - gx * kk, f.lane * c + c * 0.92 - gy * kk, s3.T * kk, s3.T * kk);
        if (f.type === 'sock') { g.strokeStyle = '#7fc241'; g.lineWidth = 2.5; g.lineCap = 'round'; for (var sl = 0; sl < 2; sl++) { var lx = cx + c * (0.18 + sl * 0.14), ly = cy - s * 0.55 - ((t * 12 + sl * 5) % 6); g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + 4, ly - 5, lx, ly - 10); g.quadraticCurveTo(lx - 4, ly - 15, lx, ly - 20); g.stroke(); } }
      } else if (window.C3D && C3D.has('foe_' + f.type) && !C3D.ready('foe_' + f.type)) { /* sheet still loading */ }
      else { var im = img('f|' + f.type + fr, foeSvg(f.type, fr)); if (im) g.drawImage(im, cx - s / 2, cy - s / 2, s, s); }
      g.globalAlpha = 1;
      if (f.stun > 0) { g.fillStyle = 'rgba(230,236,242,.8)'; for (var p2 = 0; p2 < 3; p2++) { g.beginPath(); g.arc(cx - s * 0.3 + p2 * s * 0.3, cy - s * 0.5 - (t * 20 % 8), s * 0.12, 0, 7); g.fill(); } }
      if (f.slow > 0) { g.fillStyle = 'rgba(58,154,232,.6)'; g.beginPath(); g.arc(cx + s * 0.35, cy - s * 0.35, 3, 0, 7); g.fill(); }
      if (f.burn > 0) { g.fillStyle = 'rgba(255,122,42,' + (0.5 + 0.3 * Math.sin(t * 12)) + ')'; g.beginPath(); g.arc(cx - s * 0.35, cy - s * 0.35, 3.5, 0, 7); g.fill(); }
      var tg = f.tags, dots = [['fire', '#ff7a2a'], ['water', '#3a9ae8'], ['leaf', '#6fae4f']].filter(function (x) { return tg[x[0]] && t - tg[x[0]] < 2.5; });
      dots.forEach(function (x, i) { g.fillStyle = x[1]; g.beginPath(); g.arc(cx - s * 0.3 + i * 8, cy + s * 0.5, 3.5, 0, 7); g.fill(); });
      bar(g, cx, cy - s * 0.55, s * 0.7, Math.max(0, f.hp / f.max), '#e45757');
    } }); });
    items.sort(function (a, b2) { return a.y - b2.y; }).forEach(function (it) { it.f(); });
    /* swipes and beams */
    D.swipes.forEach(function (w) {
      var a = 1 - (D.t - w.t0) / 0.3, col = (w.f || w.elem) === 'rainbow' ? 'hsl(' + Math.floor(t * 400 % 360) + ',80%,60%)' : FCOL[w.f] || ECOL[w.elem];
      g.globalAlpha = Math.max(0, a); g.strokeStyle = col; g.lineCap = 'round';
      if (w.k === 'zap') { g.lineWidth = 3; g.beginPath(); g.moveTo(sx(w.from), sy(w.lane)); g.lineTo((sx(w.from) + sx(w.to)) / 2 + 6, (sy(w.lane) + sy(w.lane2)) / 2); g.lineTo(sx(w.to), sy(w.lane2)); g.stroke(); }
      else if (w.k === 'beam') { g.lineWidth = c * 0.12; g.beginPath(); g.moveTo(sx(w.from) + c * 0.3, sy(w.lane)); g.lineTo(sx(w.to), sy(w.lane)); g.stroke(); }
      else { g.lineWidth = c * 0.08; g.beginPath(); g.arc(sx(w.from), sy(w.lane), Math.max(4, sx(w.to) - sx(w.from)), -0.6, 0.6); g.stroke(); }
      g.globalAlpha = 1;
    });
    /* shots, drawn by flavour */
    D.shots.forEach(function (s2) {
      var x = sx(s2.p), y = sy(s2.lane) - c * 0.12, f = s2.f || s2.elem, col = FCOL[f] || ECOL[s2.elem];
      if (f === 'rainbow') col = 'hsl(' + Math.floor(t * 400 % 360) + ',80%,60%)';
      if (s2.k === 'lob') { var span = Math.max(0.5, s2.from - s2.tp), u = Math.max(0, Math.min(1, (s2.from - s2.p) / span)); y -= Math.sin(u * Math.PI) * c * 0.7; }
      if (s2.k === 'drop') { var u2 = Math.min(1, (D.t - s2.t0) / s2.drop); y = sy(s2.lane) - c * (1 - u2) * 1.2; }
      g.globalAlpha = 0.3; g.fillStyle = col; g.beginPath(); g.arc(x + c * 0.12, y, c * 0.06, 0, 7); g.fill(); g.globalAlpha = 1;
      projectile(g, f, col, x, y, c, t);
    });
    /* bursts from rushers and ambushers */
    D.booms.forEach(function (bm) {
      var k = (D.t - bm.t0) / 0.45;
      g.globalAlpha = Math.max(0, 1 - k); g.strokeStyle = bm.col; g.lineWidth = c * 0.1 * (1 - k) + 1;
      g.beginPath(); g.arc(bm.x, bm.y, bm.r * (0.4 + k * 0.8), 0, 7); g.stroke();
      g.fillStyle = bm.col; for (var q2 = 0; q2 < 6; q2++) { var an = q2 * 1.047 + bm.t0; g.beginPath(); g.arc(bm.x + Math.cos(an) * bm.r * k, bm.y + Math.sin(an) * bm.r * k, c * 0.05, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    });
    /* bubbles */
    D.drops.forEach(function (b2) {
      var x = b2.x, y = b2.y + Math.sin(t * 3 + b2.x) * 3, r = c * 0.3;
      g.globalAlpha = b2.life < 2 ? b2.life / 2 : 1;
      g.fillStyle = 'rgba(200,236,255,.55)'; g.strokeStyle = '#6fb8e8'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, 7); g.fill();
      g.fillStyle = '#1f5a99'; g.font = 'bold ' + Math.round(c * 0.2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b2.v, x, y + 1);
      g.globalAlpha = 1;
    });
    /* floating text */
    D.fx.forEach(function (x) {
      var a = (t - x.t0) / 1.2;
      g.globalAlpha = 1 - a; g.font = 'bold ' + Math.round(c * 0.24) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeText(x.text, x.x, x.y - a * c * 0.6); g.fillStyle = x.col; g.fillText(x.text, x.x, x.y - a * c * 0.6);
    });
    g.globalAlpha = 1;
    /* selection hint */
    if (D.sel >= 0) { g.fillStyle = 'rgba(58,142,216,.12)'; g.fillRect(HW, 0, D.W - HW, D.H); }
    if (D.banner && t < D.banner.until) {
      g.font = 'bold ' + Math.round(c * (D.banner.small ? 0.22 : 0.36)) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var tw = g.measureText(D.banner.text).width + 24, bx = HW + (D.W - HW) / 2;
      g.fillStyle = 'rgba(23,33,30,.82)'; g.fillRect(bx - tw / 2, D.H / 2 - c * 0.3, tw, c * 0.6);
      g.fillStyle = '#fff'; g.fillText(D.banner.text, bx, D.H / 2);
    }
  }
  function projectile(g, f, col, x, y, c, t) {
    g.fillStyle = col; g.strokeStyle = col; g.beginPath();
    if (f === 'water') { g.moveTo(x - c * 0.12, y); g.quadraticCurveTo(x + c * 0.02, y - c * 0.09, x + c * 0.07, y); g.quadraticCurveTo(x + c * 0.02, y + c * 0.09, x - c * 0.12, y); g.fill(); }
    else if (f === 'ice' || f === 'light') { g.moveTo(x - c * 0.13, y); g.lineTo(x, y - c * 0.07); g.lineTo(x + c * 0.1, y); g.lineTo(x, y + c * 0.07); g.closePath(); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.stroke(); }
    else if (f === 'rock') { g.arc(x, y, c * 0.11, 0, 7); g.fill(); g.strokeStyle = '#5e5a52'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#b5b0a5'; g.beginPath(); g.arc(x - c * 0.03, y - c * 0.03, c * 0.035, 0, 7); g.fill(); }
    else if (f === 'leaf') { g.ellipse ? g.ellipse(x, y, c * 0.08, c * 0.05, -0.4, 0, 7) : g.arc(x, y, c * 0.06, 0, 7); g.fill(); g.strokeStyle = '#3f7a2f'; g.lineWidth = 1.2; g.stroke(); }
    else if (f === 'zap') { g.lineWidth = 2.5; g.moveTo(x + c * 0.1, y - c * 0.08); g.lineTo(x, y); g.lineTo(x + c * 0.04, y + c * 0.01); g.lineTo(x - c * 0.08, y + c * 0.09); g.stroke(); }
    else if (f === 'star') { star(g, x, y, c * 0.11); }
    else if (f === 'bubble') { g.globalAlpha = 0.6; g.arc(x, y, c * 0.1, 0, 7); g.fill(); g.globalAlpha = 1; g.strokeStyle = '#6fb8e8'; g.lineWidth = 1.5; g.stroke(); }
    else if (f === 'wind') { g.lineWidth = 2; g.arc(x, y, c * 0.09, 0.3, 5); g.stroke(); g.beginPath(); g.arc(x + c * 0.03, y, c * 0.04, 0.3, 5); g.stroke(); }
    else { g.arc(x, y, c * 0.1, 0, 7); g.fill(); if (f === 'fire') { g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(x, y, c * 0.05, 0, 7); g.fill(); } }
  }
  /* a dirt mound for ambushers; k > 0 draws the re-arm timer */
  function mound(g, x, y, c, k) {
    g.fillStyle = '#9a7650'; g.beginPath(); g.ellipse ? g.ellipse(x, y, c * 0.36, c * 0.13, 0, Math.PI, 0) : g.arc(x, y, c * 0.3, Math.PI, 0); g.fill();
    g.fillStyle = '#7a5a3a'; for (var i = -1; i <= 1; i++) { g.beginPath(); g.arc(x + i * c * 0.15, y - c * 0.04, c * 0.03, 0, 7); g.fill(); }
    if (k > 0) { g.strokeStyle = 'rgba(23,33,30,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - c * 0.32, c * 0.12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); g.stroke(); }
  }
  function flame(g, x, by, w, h) {
    g.fillStyle = '#ff7a2a'; g.beginPath(); g.moveTo(x - w / 2, by); g.quadraticCurveTo(x - w / 2, by - h * 0.6, x, by - h); g.quadraticCurveTo(x + w / 2, by - h * 0.6, x + w / 2, by); g.closePath(); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x - w / 4, by); g.quadraticCurveTo(x - w / 4, by - h * 0.35, x, by - h * 0.6); g.quadraticCurveTo(x + w / 4, by - h * 0.35, x + w / 4, by); g.closePath(); g.fill();
  }
  function bot(g, x, y, r) {
    g.fillStyle = '#2a4a8f'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#8fd8ff'; g.fillRect(x - r * 0.6, y - r * 0.2, r * 1.2, r * 0.3);
    g.fillStyle = '#f4f1ea'; g.fillRect(x - r * 1.1, y + r * 0.6, r * 2.2, r * 0.35);
  }
  function bar(g, x, y, w, k, col) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - w / 2, y, w, 4); g.fillStyle = col; g.fillRect(x - w / 2, y, w * k, 4); }
  function star(g, cx, cy, R) { g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }

  /* ---------------- input ---------------- */
  document.addEventListener('click', function (e) {
    if (!D) return;
    var b = e.target.closest ? e.target.closest('[data-dact]') : null;
    if (b) {
      var a = b.getAttribute('data-dact');
      if (a === 'quit') quit();
      else if (a === 'start') start();
      else if (a === 'again') { D.level = level(D.pid); D.help = helpers(TEAM, Date.now() % 1000); D.phase = 'team'; C().go(); }
      else if (a === 'pick') {
        var k = b.getAttribute('data-k'), i = D.picks.indexOf(k);
        if (i >= 0) D.picks.splice(i, 1); else if (D.picks.length < TEAM) D.picks.push(k); else C().toast('Your team is full. Tap a pet to take it off.');
        C().go();
      } else if (a === 'card') { var n = +b.getAttribute('data-i'); D.sel = D.sel === n ? -1 : n; updateCards(); }
      return;
    }
    if (D.phase === 'play' && e.target === D.cv) {
      var r = D.cv.getBoundingClientRect();
      tap(e.clientX - r.left, e.clientY - r.top);
    }
  });
  document.addEventListener('change', function (e) {
    if (!D || !e.target || e.target.id !== 'defEasy') return;
    D.easy = !!e.target.checked;
    DB.commit([{ t: 'merge', c: 'pets', id: D.pid, d: { defEasy: D.easy } }]).catch(C().fail);
  });
  window.addEventListener('resize', function () { if (D && D.phase === 'play' && D.cv && document.body.contains(D.cv)) size(); });

  window.Defense = { open: open, active: active, render: render, quit: quit, _state: function () { return D; }, FOES: FOES, ATK: ATK };
})();
