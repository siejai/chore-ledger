/*
 * Chore Ledger with a family bank and a pet game. ES5 so it runs in any Android WebView, Kindle Silk and desktop browsers.
 * Two entry points share this file: index.html (family app, CL_MODE 'family') and bank.html (parent app, CL_MODE 'bank').
 * Each device also remembers its role (localStorage cl.role): 'kids' for shared devices, 'parent' for a grown-up's own phone.
 * On a parent's phone index.html opens as the parent app too, so it does not matter which link was saved.
 * No family data is built in: the first run shows a setup screen, or loads a private family file.
 * Data lives behind window.DB (js/store.js). The pet game is js/pets.js + js/creatures.js.
 */
(function () {
  'use strict';

  /* ================= utilities ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function trim(s) { return String(s || '').replace(/^\s+|\s+$/g, ''); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dstr(new Date()); }
  function parseD(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
  function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 86400000); }
  function weekStart(s) { var d = parseD(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dstr(d); }
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmtDate(s) { try { return parseD(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return s; } }
  function fmtShort(ts) { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts), h = d.getHours(), m = d.getMinutes();
    return ((h % 12) || 12) + ':' + pad(m) + (h < 12 ? ' am' : ' pm');
  }
  function n0(n) { n = Math.round(Number(n) || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function money(c) {
    c = Math.round(Number(c) || 0);
    var s = (Math.abs(c) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (c < 0 ? '-$' : '$') + s;
  }
  function signed(c) { return (c > 0 ? '+' : '') + money(c); }
  function parseMoney(v) {
    v = String(v || '').replace(/[$,\s]/g, '');
    if (v === '') return 0;
    if (!/^\d*(\.\d{0,2})?$/.test(v) || v === '.') return NaN;
    return Math.round(parseFloat(v) * 100);
  }
  function dollars(c) { return (Number(c || 0) / 100).toFixed(2); }
  function rateLabel(r) { r = Number(r) || 0; return r ? (Math.round(r * 100) / 100) + '¢ per point' : 'not set'; }
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  };
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (s.hasOwnProperty(k)) t[k] = s[k]; } return t; }
  function find(arr, fn) { for (var i = 0; i < arr.length; i++) if (fn(arr[i])) return arr[i]; return null; }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function opt(v, label, cur) { return '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>'; }

  /* SHA-256 in plain JS so every device hashes PINs the same way. */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, maxWord = mp(2, 32), result = '', words = [], bitLen = ascii.length * 8;
    var hash = [], k = [], pc = 0, isComp = {}, i, j;
    for (var cand = 2; pc < 64; cand++) {
      if (!isComp[cand]) {
        for (i = 0; i < 313; i += cand) isComp[i] = cand;
        hash[pc] = (mp(cand, 0.5) * maxWord) | 0;
        k[pc++] = (mp(cand, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }

  /* ================= state ================= */
  var ROLE = LS.get('cl.role');
  var MODE = window.CL_MODE === 'bank' || ROLE === 'parent' ? 'bank' : 'family';
  function setRole(role) {
    LS.set('cl.role', role);
    if (role === 'kids') { LS.set('cl.keep', null); if (window.CL_MODE === 'bank') { location.href = 'index.html'; return; } }
    location.reload();
  }
  /* "keep me unlocked" on a parent's own phone: {id, until} */
  function keepInfo() { try { var k = JSON.parse(LS.get('cl.keep') || 'null'); return k && k.until > Date.now() ? k : null; } catch (e) { return null; } }
  var KEEP_DAYS = 30;
  var LIVE_DAYS = 45, IDLE_PICK_MS = 5 * 60 * 1000, UNDO_MS = 4500;
  var DEFAULTS = {
    bankName: 'Family Bank', requireApproval: true, catOrder: [], centsPerPoint: 1, petEvolve1Cents: 500, petEvolve2Cents: 1500,
    dadPid: '', allowanceCents: 0, allowanceDay: 5, allowanceLast: '', parents: [], foodCoins: 10, mealPrice: 10, careCoins: 10, kitPrice: 10,
    coinsPerDollar: 100, swapPrice: 20, toothPrice: 20, ballPrice: 20,
    logCooldown: 60, logCap: 5, hideHours: 24,   /* hideHours: how long a pet hides after a "pet hides" rating (cl-v32) */   /* kids: seconds between logging the same chore, and the most times a day (0 = no limit) */
    nightStart: '20:00', nightEnd: '06:30', nightOff: false, drainFood: 50, drainClean: 25, drainRest: 50, drainEnergy: 50   /* pets sleep at night; how fast each need drops per day */      /* chore coins: each chore's pts, traded at the bank, spent on clothes and store items */
  };
  var S = {
    phase: 'boot', err: '', ready: {},
    people: [], chores: [], entries: [], txns: [], reqs: [], pets: {}, settings: assign({}, DEFAULTS), settingsDoc: null,
    me: MODE === 'bank' ? '@parent' : null, lastMe: LS.get('cl.me'), picking: false, lastActive: Date.now(),
    admin: false, parent: null, adminOpen: MODE === 'bank', adminTimer: 0, fails: 0, lockUntil: 0,
    tab: LS.get(MODE === 'bank' ? 'cl.ptab' : 'cl.tab') || (MODE === 'bank' ? 'approvals' : 'log'), keepTried: false,
    sel: null, date: today(), dateAuto: true, q: '', cat: 'all', sort: 'cat', quest: null, chLv: {}, lvPick: null, lastLog: {},
    hist: { pid: 'all', range: '7', status: 'all' }, older: null,
    apMode: LS.get('cl.apmode') || 'chore', apClosed: {}, apSkip: {}, logMode: LS.get('cl.logmode') || 'person', chOpen: null, chPick: {}, queue: [],
    bankPid: null, bankForm: null, allTx: null,
    edit: null, cq: '', showArchived: false, armed: null, dirty: false,
    wiz: { people: [], starter: true, imported: null },
    nudges: [], devices: [], nudgeLock: {},
    shop: [], agenda: [], shopMeta: null
  };
  var root = $('#app'), view = document.createElement('div');
  var raf = 0;
  function schedule() { if (!raf) raf = window.requestAnimationFrame ? window.requestAnimationFrame(render) : setTimeout(render, 16); }
  function go() {
    var a = document.activeElement;
    if (a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) a.blur();
    S.dirty = false; schedule();
  }
  var toastT = 0;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = 'toast' + (err ? ' err' : ''); }, err ? 4200 : 2400);
  }
  function fail(e) {
    var c = e && (e.code || '');
    if (/permission/.test(c)) toast('This sign-in is not allowed to change that.', true);
    else if (/not-found/.test(c)) toast('That item no longer exists. Refresh and try again.', true);
    else if (/unavailable|network/.test(c)) toast('No connection. Changes will sync when you are back online.', true);
    else toast('Could not save. Try again.', true);
    if (window.console) console.warn(e);
  }
  function confirmTap(key, fn) {
    if (S.armed === key) { S.armed = null; fn(); schedule(); return; }
    S.armed = key;
    setTimeout(function () { if (S.armed === key) { S.armed = null; schedule(); } }, 4000);
    schedule();
  }
  function bankName() { return S.settings.bankName || DEFAULTS.bankName; }

  /* ================= derived data ================= */
  function activePeople() { return S.people.filter(function (p) { return p.active !== false; }); }
  function person(id) { return find(S.people, function (p) { return p.id === id; }); }
  function pIndex(p) { return p ? ((typeof p.order === 'number' ? p.order : 0) % 7) : 0; }
  /* each person's color follows the shirt color they picked for their character (falls back to the palette) */
  var AV_TOP = ['#e45757', '#f29b38', '#f2d43a', '#4fb65f', '#3a8ed8', '#7a5fd6', '#e36fae', '#8a93a6', '#a33a55', '#7f8f33', '#1f9a94', '#c4198f'];
  function pAvatar(p) {
    if (!p) return null; var pets = S.pets || {}, d = pets[p.id];
    if (d && d.avatar) return d.avatar;
    var nm = String(p.name || '').trim().toLowerCase(), par = (S.settings.parents || []).filter(function (x) { return String(x.name || '').trim().toLowerCase() === nm; })[0];
    if (!par && isAdult(p.id)) {
      /* no name match: the allowance account belongs to the first parent, other grown-ups take the remaining parents in order */
      var ps = S.settings.parents || [], taken = {}, adults = (S.people || []).filter(function (x) { return isAdult(x.id); });
      adults.forEach(function (x) { var n = String(x.name || '').trim().toLowerCase(); ps.forEach(function (q) { if (String(q.name || '').trim().toLowerCase() === n) taken[q.id] = 1; }); });
      var free = ps.filter(function (q) { return !taken[q.id]; });
      if (isDad(p.id)) par = free[0];
      else { var rest = free.slice(isDad(S.settings.dadPid) && person(S.settings.dadPid) ? 1 : 0), i = adults.filter(function (x) { return !isDad(x.id); }).indexOf(p); par = rest[i]; }
    }
    return par && pets[par.id] && pets[par.id].avatar || null;
  }
  function pColor(p) { var a = pAvatar(p); return a && typeof a.topColor === 'number' ? AV_TOP[a.topColor] || null : null; }
  function pKey(p) { return String(p && p.id || '').replace(/[^A-Za-z0-9_-]/g, '_'); }
  function pCls(p) { return p ? 'p' + pIndex(p) + ' pc-' + pKey(p) : 'p0'; }
  var pcsLast = '';
  function paintPersonColors() {
    var css = (S.people || []).map(function (p) { var c = pColor(p); return c ? '.pc-' + pKey(p) + '{--pc:' + c + '}' : ''; }).join('');
    if (css === pcsLast) return; pcsLast = css;
    var el = document.getElementById('pcStyle'); if (!el) { el = document.createElement('style'); el.id = 'pcStyle'; document.head.appendChild(el); }
    el.textContent = css;
  }
  function pname(id) { var p = person(id); return p ? p.name : 'Unknown'; }
  function isPerson(id) { return !!person(id); }
  function isDad(id) { return !!id && id === S.settings.dadPid; }
  /* grown-ups have a bank account and chores but no pet: the allowance account, plus anyone marked adult in Setup */
  function isAdult(id) { if (!id) return false; if (isDad(id)) return true; var p = person(id); return !!(p && p.adult); }
  function kids() { return activePeople().filter(function (p) { return !isAdult(p.id); }); }
  function catName(c) { return c.cat || 'Other'; }
  function catList(chores) {
    var present = [];
    chores.forEach(function (c) { var n = catName(c); if (present.indexOf(n) < 0) present.push(n); });
    var out = (S.settings.catOrder || []).filter(function (n) { return present.indexOf(n) >= 0; });
    present.filter(function (n) { return out.indexOf(n) < 0 && n !== 'Other'; }).sort().forEach(function (n) { out.push(n); });
    if (present.indexOf('Other') >= 0) out.push('Other');
    return out;
  }
  /* What a chore gives the pet: 'food' (food coins), 'clean' (clean coins), 'rest' (tuck-ins), 'energy' (play time), 'any' (whatever
     the pet needs most when it is approved) or '' (nothing). Every approved chore also earns its points as chore coins. Grown-up favors
     give whatever the pet needs most unless a parent picked something else. */
  function isFavor(c) { return /favou?r/i.test(catName(c)) || /favou?r/i.test(c.name || ''); }
  function needOf(c) {
    if (c.need === 'off') return '';
    if (isFavor(c) && (!c.need || c.need === 'none')) return 'any';
    if (c.need === 'none') return '';
    if (c.need) return c.need;
    var n = (c.name || '').toLowerCase();
    if (/shower|bathe|teeth|hair|ears cleaned|nails? clipped|fingernail|toenail/.test(n)) return 'clean';
    if (catName(c) === 'Bedtime') return 'rest';
    if (/jumping|push ?ups|burpee|outside|exercise|karate|walk|run |bike|swim/.test(n)) return 'energy';
    if (catName(c) === 'Health & Fitness') return 'energy';
    if (/^eat /.test(n)) return '';
    if (catName(c) === 'Meals & Kitchen' || /dish|sweep|dining|counter|kitchen|cook|dinner|breakfast|lunch|grocer|compost|wipe.*table/.test(n)) return 'food';
    return '';
  }
  var NEED_LABEL = { '': 'Nothing', none: 'Nothing', off: 'Nothing', food: 'Food coins', clean: 'Clean coins', rest: 'Tuck-in', energy: 'Play time', any: 'What the pet needs most' };
  /* ----- what a chore pays (cl-v29). Chore coins are the chore's pts: 100 trade for $1 at the bank, and they also buy food and clean
     coins, toothpaste, balls and clothes. rw holds the pet rewards: food and clean coins, tuck-in and play as a percent of one
     (100 = a whole one, 50 = half), and "needs most" as a percent of one share of whatever the pet needs most when it is approved
     (a share is the Setup amount of food or clean coins, or one tuck-in or play). Chores saved before rw existed are read through
     their old single "need". ----- */
  var RW_KEYS = ['food', 'clean', 'tuck', 'play', 'any'];
  function legacyRw(need, amt) {
    var st = S.settings, r = { food: 0, clean: 0, tuck: 0, play: 0, any: 0 };
    if (need === 'food') r.food = Number(amt) || Number(st.foodCoins) || 10;
    else if (need === 'clean') r.clean = Number(amt) || Number(st.careCoins) || 10;
    else if (need === 'rest') r.tuck = 100;
    else if (need === 'energy') r.play = 100;
    else if (need === 'any') r.any = 100;
    return r;
  }
  function cleanRw(o) { var r = {}; RW_KEYS.forEach(function (k) { r[k] = Math.max(0, Math.round(Number(o && o[k]) || 0)); }); return r; }
  function rewardsOf(c) { return c && c.rw ? cleanRw(c.rw) : legacyRw(needOf(c || {}), c && c.coins); }
  function entryRw(e) { return e.rw ? cleanRw(e.rw) : legacyRw(e.need || '', e.amt); }
  function scaleRw(r, pct) { var o = {}; RW_KEYS.forEach(function (k) { o[k] = Math.round((r[k] || 0) * pct / 100); }); return o; }
  /* for app versions before cl-v29, which still read a single "need" */
  function compatNeed(r) { return r.food ? 'food' : r.clean ? 'clean' : r.tuck >= 50 ? 'rest' : r.play >= 50 ? 'energy' : r.any ? 'any' : 'off'; }
  function pctTxt(v, one, many) { return v % 100 === 0 ? (v === 100 ? '1 ' + one : v / 100 + ' ' + many) : v + '% ' + one; }
  function rwText(pts, r) {
    var b = [];
    if (pts) b.push('+' + n0(pts) + ' chore coin' + (pts === 1 ? '' : 's'));
    if (r.food) b.push('+' + r.food + ' food');
    if (r.clean) b.push('+' + r.clean + ' clean');
    if (r.tuck) b.push(pctTxt(r.tuck, 'tuck-in', 'tuck-ins'));
    if (r.play) b.push(pctTxt(r.play, 'play', 'plays'));
    if (r.any) b.push(r.any === 100 ? 'what the pet needs most' : r.any + '% of what the pet needs most');
    return b.length ? b.join(' &middot; ') : 'no reward';
  }
  /* graded chores: levels [{n: 'Great', p: 100}, ...]; logging asks which one, and every reward scales by p percent */
  var DEFAULT_LEVELS = [{ n: 'Great', p: 100 }, { n: 'Good', p: 75 }, { n: 'OK', p: 50 }, { n: 'Bad', p: 0 }];
  function levelsOf(c) { return c && c.levels && c.levels.length ? c.levels : null; }
  function levelsText(lv) { return (lv || []).map(function (x) { return x.n + ' ' + x.p; }).join(', '); }
  function parseLevels(str) {
    var out = [];
    String(str || '').split(/[,;\n]+/).forEach(function (part) {
      var m = trim(part).match(/^(.*?)[\s:=]*(\d+)\s*%?$/);
      if (m && trim(m[1])) out.push({ n: trim(m[1]).slice(0, 20), p: Math.min(200, Math.round(Number(m[2]))) });
    });
    return out;
  }
  /* how often kids can log a chore: freq '' (any time, up to the daily limit) or 'Nd' / 'Nw' (N a day / N a week) */
  var FREQS = [['', 'Any time'], ['1d', 'Once a day'], ['2d', 'Twice a day'], ['3d', '3 times a day'], ['1w', 'Once a week'], ['2w', 'Twice a week'], ['3w', '3 times a week']];
  function freqOf(c) { var m = /^(\d+)([dw])$/.exec((c && c.freq) || ''); return m && Number(m[1]) > 0 ? { n: Number(m[1]), per: m[2] } : null; }
  function freqOpts(cur) {   /* the menu, plus an unusual limit from the spreadsheet (e.g. 5 times a day) so it isn't shown as Any time */
    var list = FREQS.slice(), f = freqOf({ freq: cur });
    if (f && !list.some(function (x) { return x[0] === cur; })) list.push([cur, freqText(f)]);
    return list.map(function (x) { return '<option value="' + x[0] + '"' + ((cur || '') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
  }
  function freqText(f) { if (!f) return 'Any time'; return (f.n === 1 ? 'Once' : f.n === 2 ? 'Twice' : f.n + ' times') + ' a ' + (f.per === 'd' ? 'day' : 'week'); }
  function freqKey(str) {
    var t = lc(String(str || '')).replace(/[^a-z0-9 \/]/g, ' ').replace(/\s+/g, ' ');
    if (!t || /^(any|any time|anytime|no limit|none|unlimited)$/.test(t)) return '';
    var per = /week/.test(t) || /\bw\b/.test(t) ? 'w' : /day|daily|\bd\b/.test(t) ? 'd' : '';
    if (!per) return null;
    var n = /(\d+)/.exec(t), k = n ? Number(n[1]) : /twice/.test(t) ? 2 : /three|thrice/.test(t) ? 3 : 1;
    return k > 0 && k < 100 ? k + per : null;
  }
  /* the limit actually enforced: the chore's How often, or once a day for a shared chore with none set (cl-v35) */
  function limOf(c) { return freqOf(c) || (c && c.shared ? { n: 1, per: 'd' } : null); }
  function freqUsed(pid, c, date) {   /* times logged (not denied) in the day or week of that date; a shared chore counts everyone's */
    var f = limOf(c); if (!f) return 0;
    var from = f.per === 'd' ? date : weekStart(date), to = f.per === 'd' ? date : addDays(from, 6), n = 0;
    S.entries.forEach(function (e) { if ((c.shared || e.pid === pid) && e.cid === c.id && e.status !== 'rejected' && e.date >= from && e.date <= to) n++; });
    return n;
  }
  function freqFull(pid, c, date) { var f = limOf(c); return !!f && freqUsed(pid, c, date) >= f.n; }
  function sharedBy(c, date) {   /* who logged a shared chore in its current day or week */
    var f = limOf(c); if (!c.shared || !f) return [];
    var from = f.per === 'd' ? date : weekStart(date), to = f.per === 'd' ? date : addDays(from, 6), who = [];
    S.entries.forEach(function (e) { if (e.cid === c.id && e.status !== 'rejected' && e.date >= from && e.date <= to && who.indexOf(e.pid) < 0) who.push(e.pid); });
    return who;
  }
  /* the days of the week a chore is offered (0 = Sunday); none or all seven = every day */
  var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function daysOf(c) { var d = c && c.days; if (!d || !d.length) return null; d = d.map(Number).filter(function (x) { return x >= 0 && x < 7; }); return d.length && d.length < 7 ? d : null; }
  function dow(date) { var q = String(date).split('-'); return new Date(Number(q[0]), Number(q[1]) - 1, Number(q[2])).getDay(); }
  function dayOk(c, date) { var d = daysOf(c); return !d || d.indexOf(dow(date)) >= 0; }
  function daysText(d) {
    if (!d || !d.length || d.length >= 7) return 'Every day';
    var k = d.slice().sort().join('');
    if (k === '12345') return 'Weekdays'; if (k === '06') return 'Weekends';
    return d.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); }).map(function (i) { return DAYN[i]; }).join(', ');
  }
  function daysKey(str) {   /* "Mon, Thu", "M Th", "weekdays", "Mon-Fri", "every day" -> [1, 4] etc.; null if it can't tell */
    var t = lc(String(str || '')).replace(/[^a-z\-, ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || /^(every ?day|daily|all|any|any ?day|all days)$/.test(t)) return [];
    if (/^week ?days?$/.test(t)) return [1, 2, 3, 4, 5];
    if (/^week ?ends?$/.test(t)) return [0, 6];
    function one(w) { w = w.trim(); var m = [['su', 0], ['m', 1], ['tu', 2], ['w', 3], ['th', 4], ['f', 5], ['sa', 6]]; for (var i = 0; i < m.length; i++) if (w.indexOf(m[i][0]) === 0) return m[i][1]; return -1; }
    var out = [], bad = false;
    t.split(/[ ,]+/).forEach(function (w) {
      if (!w || w === 'and') return;
      var r = w.split('-');
      if (r.length === 2 && r[0] && r[1]) { var a = one(r[0]), b = one(r[1]); if (a < 0 || b < 0) { bad = true; return; } for (var i = a; ; i = (i + 1) % 7) { if (out.indexOf(i) < 0) out.push(i); if (i === b) break; } }
      else { var d = one(w); if (d < 0) bad = true; else if (out.indexOf(d) < 0) out.push(d); }
    });
    return bad || !out.length ? null : out.length === 7 ? [] : out.sort();
  }
  function hideOpts(lv, cur) { return '<option value="">never</option>' + (lv || []).map(function (x) { return '<option value="' + esc(x.n) + '"' + (cur === x.n ? ' selected' : '') + '>' + esc(x.n) + '</option>'; }).join(''); }
  function levelExtra(c, i) { var lv = levelsOf(c), x = lv && lv[i]; return x ? { lv: x.n, lvPct: x.p } : null; }
  var STAR_SVG = '<svg class="rw-i" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="#b58cff" stroke="#6a4bc4" stroke-width="1.5"/><path d="M10 4.2 L11.7 8 L15.8 8.3 L12.7 11 L13.6 15 L10 12.9 L6.4 15 L7.3 11 L4.2 8.3 L8.3 8 Z" fill="#fff"/></svg>';
  function ptsBadge(n, graded) { return '<span class="pts mono" title="chore coins">' + STAR_SVG + (graded ? 'up to ' : '') + '+' + n0(n) + '</span>'; }
  /* the pet's biggest need right now, counting what is already in the bag and the coin purse */
  function needMost(pid) {
    if (!window.Pets) return 'food';
    var st = Pets.state(pid), n = st.needs, w = st.wallet, pr = Pets.prices();
    var have = { food: n.food + (w.meals + Math.floor(w.food / pr.meal)) * 50, clean: n.clean + (w.kits + Math.floor(w.care / pr.kit)) * 60, rest: n.rest + w.rest * 60, energy: n.energy + (w.energy + (w.balls || 0)) * 60 };
    var best = 'food'; ['clean', 'rest', 'energy'].forEach(function (k) { if (have[k] < have[best]) best = k; });
    return best;
  }
  function queuedIds() {
    var m = {};
    S.queue.forEach(function (q) { q.entries.forEach(function (e) { m[e.id] = q.status; }); });
    return m;
  }
  function derive() {
    var t = today(), wk = weekStart(t), tot = {}, pend = 0, qd = queuedIds();
    function T(id) { return tot[id] || (tot[id] = { today: 0, week: 0, pend: 0, unpaid: 0, pendN: 0 }); }
    S.entries.forEach(function (e) {
      var x = T(e.pid);
      if (e.status === 'approved') {
        if (e.date === t) x.today += e.pts;
        if (e.date >= wk) x.week += e.pts;
        if (!e.paid) x.unpaid += e.pts;
      } else if (e.status === 'pending' && !qd[e.id]) { x.pend += e.pts; x.pendN++; pend++; }
    });
    var reqPend = S.reqs.filter(function (r) { return r.status === 'pending'; });
    return { t: t, wk: wk, T: T, pendCount: pend, reqPend: reqPend };
  }
  function tagFor(s) {
    return s === 'approved' ? '<span class="tag ok">Approved</span>' : s === 'rejected' ? '<span class="tag no">Rejected</span>' : '<span class="tag pend">Waiting</span>';
  }
  function logTarget() { return S.admin ? S.sel : (isPerson(S.me) ? S.me : null); }
  function parentName(id) { var p = find(S.settings.parents || [], function (x) { return x.id === id; }); return p ? p.name : ''; }

  /* ================= writes ================= */
  /* everything an approved entry pays the pet: tuck-ins and plays add up in percent (pctRest, pctPlay; 100 = one) */
  function petGrantOps(e, sign) {
    var st = S.settings, d = {}, r = entryRw(e);
    if (r.any) {
      var got = sign > 0 ? (e.needGot = needMost(e.pid)) : (e.needGot || ''), f = r.any / 100;
      if (got === 'food') r.food += Math.round((Number(st.foodCoins) || 10) * f);
      else if (got === 'clean') r.clean += Math.round((Number(st.careCoins) || 10) * f);
      else if (got === 'rest') r.tuck += r.any;
      else if (got === 'energy') r.play += r.any;
    }
    if (r.food) d.coinsFood = DB.inc(sign * r.food);
    if (r.clean) d.coinsCare = DB.inc(sign * r.clean);
    if (r.tuck) d.pctRest = DB.inc(sign * r.tuck);
    if (r.play) d.pctPlay = DB.inc(sign * r.play);
    if (e.pts) d.chorePts = DB.inc(sign * e.pts);
    if (e.hide) d.hideUntil = sign > 0 ? Date.now() + Math.max(1, Number(st.hideHours) || 24) * 3600000 : 0;
    e.coins = sign > 0;
    if (!Object.keys(d).length) return [];
    return [{ t: 'merge', c: 'pets', id: e.pid, d: d }];
  }
  /* chore coins for points approved before they existed (and not paid out on a payday): once, from a parent's device */
  function coinBackfill() {
    if (S.settings.coinsStart || S.backfilling || !S.admin || !S.settingsDoc) return;
    S.backfilling = true;
    DB.query({ c: 'entries', where: [['status', '==', 'approved'], ['paid', '==', false]] }).then(function (list) {
      if (S.settings.coinsStart) return;
      var by = {}, ops = [];
      list.forEach(function (e) { if (e.coins || !e.pts) return; by[e.pid] = (by[e.pid] || 0) + e.pts; ops.push({ t: 'update', c: 'entries', id: e.id, d: { coins: true, paid: true, paidAs: 'coins' } }); });
      Object.keys(by).forEach(function (pid) { ops.push({ t: 'merge', c: 'pets', id: pid, d: { chorePts: DB.inc(by[pid]) } }); });
      ops.push({ t: 'update', c: 'meta', id: 'settings', d: { coinsStart: today() } });
      return DB.commit(ops);
    }).then(function () { S.backfilling = false; }, function () { S.backfilling = false; });
  }
  function chorePts(pid) { var d = S.pets[pid] || {}; return Math.max(0, Number(d.chorePts) || 0); }
  function cashIn(pid) {
    var per = Number(S.settings.coinsPerDollar) || 100, have = chorePts(pid);
    if (have < per) { toast('You need ' + per + ' chore coins to trade for $1. You have ' + have + '.', true); return; }
    DB.commit(txOps(pid, 100, 'coins', 'Traded ' + per + ' chore coins').concat([{ t: 'merge', c: 'pets', id: pid, d: { chorePts: DB.inc(-per) } }]))
      .then(function () { toast('$1.00 added to ' + bankName() + '!'); schedule(); }, fail);
  }
  function txOps(pid, cents, kind, memo, extra) {
    return [
      { t: 'set', c: 'txns', id: DB.newId('txns'), d: assign({ pid: pid, cents: cents, kind: kind, memo: memo || '', ts: Date.now(), date: today(), by: S.parent ? S.parent.id : '' }, extra || {}) },
      { t: 'update', c: 'people', id: pid, d: { balance: DB.inc(cents) } }
    ];
  }
  function bountyOps(e) {
    if (!(e.bountyCents > 0) || e.bountyPaid) return [];
    return txOps(e.pid, e.bountyCents, 'bounty', 'Bounty: ' + e.name + (e.share && e.share < 100 ? ' (' + e.share + '% share)' : ''));
  }
  function bankTx(pid, cents, kind, memo, extraOps) { return DB.commit(txOps(pid, cents, kind, memo).concat(extraOps || [])); }
  function autoApprove() { return S.admin || S.settings.requireApproval === false; }
  function newEntry(pid, date, chore, extra) {
    var r = rewardsOf(chore), pts = Number(chore.pts) || 0, base = null;
    if (extra && extra.lvPct !== undefined) { base = { pts: pts, rw: r }; pts = Math.round(pts * extra.lvPct / 100); r = scaleRw(r, extra.lvPct); }
    var hide = !!(extra && extra.lv && chore.hideLv && extra.lv === chore.hideLv);
    return assign({ pid: pid, cid: chore.id, name: chore.name, pts: pts, cat: chore.cat || '', rw: r, need: compatNeed(r), amt: r.food || r.clean || 0, date: date, ts: Date.now(), status: 'pending', paid: false, by: S.me || '' },
      base ? { lvBase: base } : {}, hide ? { hide: true } : {}, extra || {});
  }
  function saveEntries(list) {
    var ops = [], auto = autoApprove();
    list.forEach(function (e) {
      if (auto) {
        e.status = 'approved'; e.decidedTs = Date.now(); e.decidedBy = S.parent ? S.parent.id : '';
        ops = ops.concat(petGrantOps(e, 1), bountyOps(e));
        if (e.bountyCents > 0) e.bountyPaid = true;
      }
      ops.unshift({ t: 'set', c: 'entries', id: DB.newId('entries'), d: e });
    });
    return DB.commit(ops);
  }
  function addEntry(pid, date, chore, extra) { S.lastLog[pid + '|' + chore.id] = Date.now(); return saveEntries([newEntry(pid, date, chore, extra)]).catch(fail); }
  /* kids can't flood the approvals: a short wait between logs of the same chore, and a daily limit (parents are never limited) */
  /* ----- the daily review (cl-v33): chores marked review, rated for every kid in one place; saving logs them as approved ----- */
  function reviewItems(date) { var cats = catList(S.chores); return S.chores.filter(function (c) { return c.active !== false && c.review && (!date || dayOk(c, date)); }).sort(function (a, b) { return (cats.indexOf(catName(a)) - cats.indexOf(catName(b))) || ((a.order || 0) - (b.order || 0)); }); }
  function reviewKids() { return kids().filter(function (p) { return p.active !== false; }); }
  function rvEntry(pid, cid, date) { var best = null; S.entries.forEach(function (e) { if (e.pid === pid && e.cid === cid && e.date === date && e.status !== 'rejected' && (!best || (e.ts || 0) > (best.ts || 0))) best = e; }); return best; }
  function reviewLeft(date) {
    var n = 0, items = reviewItems(date);
    reviewKids().forEach(function (p) { if (items.some(function (c) { return (c.who || []).indexOf(p.id) >= 0 && !rvEntry(p.id, c.id, date); })) n++; });
    return n;
  }
  function rvState() { var d = S.rvDate || today(); if (!S.rv || S.rv.date !== d) S.rv = { date: d, picks: {} }; return S.rv; }
  function renderReview() {
    if (!S.admin) { view.innerHTML = locked('The daily review'); return; }
    var rv = rvState(), date = rv.date, items = reviewItems(date), kidsL = reviewKids(), changes = Object.keys(rv.picks).length;
    var h = '<section class="stack review"><div class="wrap end"><label class="field w-md" for="rvDate"><span>Day</span><input type="date" id="rvDate" value="' + esc(date) + '" max="' + today() + '"></label>' +
      (date !== today() ? '<button class="btn" type="button" data-act="rvToday">Today</button>' : '') + '</div>';
    if (!items.length && S.chores.some(function (c) { return c.active !== false && c.review; })) {
      view.innerHTML = h + '<div class="card stack tight"><h2>Daily review</h2><p class="note">None of the review chores are set for ' + esc(DAYN[dow(date)]) + '. Pick another day above.</p></div></section>';
      return;
    }
    if (!items.length) {
      view.innerHTML = h + '<div class="card stack tight"><h2>Daily review</h2><p class="note">Pick the chores you want to rate for every kid at the end of the day, like bedtime, attitude or cursing. ' +
        'Tick <b>Daily review</b> on them in Setup → Chores → Edit all in a table (or in the spreadsheet), or tick <b>Show it in the daily review</b> in a chore’s editor. Rated chores show their levels here; the rest just get a Done.</p>' +
        '<button class="btn primary" type="button" data-act="rvSetup">Open the chore table</button></div></section>';
      return;
    }
    h += '<p class="note">Tap how each one went for ' + (date === today() ? 'today' : esc(fmtDate(date))) + ', then Save. Saving approves them and pays the rewards; a kid’s own request is replaced by your rating.</p>';
    h += kidsL.map(function (p) {
      var mine = items.filter(function (c) { return (c.who || []).indexOf(p.id) >= 0; }); if (!mine.length) return '';
      return '<div class="card rv-kid ' + pCls(p) + '"><div class="rv-name"><span class="dot"></span><strong>' + esc(p.name) + '</strong></div>' + mine.map(function (c) {
        var k = p.id + '|' + c.id, ex = rvEntry(p.id, c.id, date), lv = levelsOf(c), opts = lv ? lv.map(function (x) { return x.n; }) : ['Done'];
        var cur = ex ? (lv ? opts.indexOf(ex.lv) : 0) : -1, ok = ex && ex.status === 'approved', pick = rv.picks[k] !== undefined ? rv.picks[k] : ok ? cur : -1;
        var st = ex ? (ok ? 'approved' + (ex.lv ? ': ' + ex.lv : '') : 'waiting' + (ex.lv ? ', ' + p.name + ' said ' + ex.lv : '') + ' (tap to rate it)') : 'not rated yet';
        return '<div class="rv-row"><div class="rv-chore">' + esc(c.name) + '<small' + (ex ? '' : ' class="rv-none"') + '>' + esc(st) + (rv.picks[k] !== undefined ? ' &middot; <b>changed</b>' : '') + '</small></div><div class="rv-lv">' + opts.map(function (n, i) {
          return '<button type="button" class="rv-b rv-' + (lv ? Math.min(i, 3) + (i === opts.length - 1 && opts.length > 2 ? ' rv-last' : '') : 0) + (!ok && ex && cur === i ? ' rv-said' : '') + '" data-act="rvPick" data-k="' + esc(k) + '" data-i="' + i + '" aria-pressed="' + (pick === i) + '">' + esc(n) + (lv && c.hideLv === n ? ' &#128064;' : '') + '</button>';
        }).join('') + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    var nobody = items.filter(function (c) { return !kidsL.some(function (p) { return (c.who || []).indexOf(p.id) >= 0; }); });
    if (nobody.length) h += '<p class="note">Not given to any kid, so not shown: ' + nobody.map(function (c) { return '<b>' + esc(c.name) + '</b>'; }).join(', ') + '. Pick who does it in the chore’s editor (Setup → Chores).</p>';
    h += '<div class="rv-bar"><span class="grow">' + (changes ? changes + ' rating' + (changes === 1 ? '' : 's') + ' to save' : 'Tap a rating to change it') + '</span>' +
      '<button class="btn" type="button" data-act="rvClear"' + (changes ? '' : ' disabled') + '>Clear</button><button class="btn primary" type="button" data-act="rvSave"' + (changes ? '' : ' disabled') + '>Save review</button></div></section>';
    view.innerHTML = h;
  }
  function rvSave() {
    var rv = rvState(), date = rv.date, ops = [], n = 0, by = S.parent ? S.parent.id : '';
    Object.keys(rv.picks).forEach(function (k) {
      var parts = k.split('|'), pid = parts[0], i = rv.picks[k], c = find(S.chores, function (x) { return x.id === parts[1]; }); if (!c) return;
      var lv = levelsOf(c), extra = lv ? levelExtra(c, i) : null, ex = rvEntry(pid, c.id, date);
      if (ex && ex.status === 'approved' && (!lv || ex.lv === extra.lv)) return;   /* already that */
      if (ex) { ops.push({ t: 'delete', c: 'entries', id: ex.id }); if (ex.status === 'approved') ops = ops.concat(petGrantOps(ex, -1)); }
      var e = newEntry(pid, date, c, extra); e.status = 'approved'; e.decidedTs = Date.now(); e.decidedBy = by; e.by = '@review';
      ops = ops.concat(petGrantOps(e, 1)); if (e.needGot) e.needGot = e.needGot;
      ops.unshift({ t: 'set', c: 'entries', id: DB.newId('entries'), d: e }); n++;
    });
    if (!ops.length) { rv.picks = {}; go(); return; }
    DB.commit(ops).then(function () { rv.picks = {}; toast('Review saved: ' + n + ' rating' + (n === 1 ? '' : 's') + '.'); go(); }, fail);
  }
  function canLog(pid, c) {
    if (S.admin) return true;
    var st = S.settings, cd = Math.max(0, Number(st.logCooldown != null ? st.logCooldown : 60) || 0) * 1000, cap = Math.max(0, Number(st.logCap != null ? st.logCap : 5) || 0);
    var k = pid + '|' + c.id, last = S.lastLog[k] || 0, n = 0;
    S.entries.forEach(function (e) {
      if (e.pid !== pid || e.cid !== c.id || e.status === 'rejected') return;
      if ((Number(e.ts) || 0) > last) last = Number(e.ts) || 0;
      if (e.date === S.date) n++;
    });
    var wait = cd - (Date.now() - last);
    if (wait > 0) { var sec = Math.ceil(wait / 1000); toast('You just logged ' + c.name + '. Wait ' + sec + ' more second' + (sec === 1 ? '' : 's') + ' to log it again.', true); return false; }
    if (cap && n >= cap) { toast(c.name + ' can be logged ' + cap + ' time' + (cap === 1 ? '' : 's') + ' a day, and that’s done for today. Ask a parent if you did it again.', true); return false; }
    if (!dayOk(c, S.date)) { toast(c.name + ' is only on ' + daysText(daysOf(c)) + '.', true); return false; }
    var f = limOf(c);
    if (f && freqUsed(pid, c, S.date) >= f.n) {
      var by = sharedBy(c, S.date).filter(function (x) { return x !== pid; });
      toast(c.shared && by.length ? by.map(pname).join(' and ') + ' already did ' + c.name + ' ' + (f.per === 'd' ? 'today' : 'this week') + '.' : c.name + ' can be logged ' + freqText(f).toLowerCase() + ', and that’s done ' + (f.per === 'd' ? 'for today' : 'for this week') + '.', true);
      return false;
    }
    return true;
  }
  /* a parent changes how well a waiting graded chore went: the rewards are worked out again from the full amounts */
  function setLevel(eid, i) {
    var e = find(S.entries, function (x) { return x.id === eid; }); if (!e || e.status !== 'pending') return;
    var c = find(S.chores, function (x) { return x.id === e.cid; }), lv = levelsOf(c) || DEFAULT_LEVELS, x = lv[i]; if (!x) return;
    var base = e.lvBase || { pts: Number(e.pts) || 0, rw: entryRw(e) }, r = scaleRw(cleanRw(base.rw), x.p), pts = Math.round((Number(base.pts) || 0) * x.p / 100);
    var d = { lv: x.n, lvPct: x.p, pts: pts, rw: r, need: compatNeed(r), amt: r.food || r.clean || 0, lvBase: base, hide: !!(c && c.hideLv && c.hideLv === x.n) };
    assign(e, d);
    DB.commit([{ t: 'update', c: 'entries', id: eid, d: d }]).then(function () { toast(e.name + ': ' + x.n); }, fail);
  }
  /* chores saved before cl-v29 get their rewards written out once (from a parent's device), so the table shows real numbers */
  function rwMigrate() {
    if (S.rwMig || !S.admin || !S.ready.chores || !S.ready.settings) return;
    var ops = S.chores.filter(function (c) { return !c.rw; }).map(function (c) { return { t: 'update', c: 'chores', id: c.id, d: { rw: rewardsOf(c) } }; });
    if (!ops.length) return;
    S.rwMig = true;
    DB.commit(ops).then(function () { S.rwMig = false; }, function () { S.rwMig = false; });
  }
  function addQuest(chore, shares, date) {
    var qid = DB.newId('entries'), pids = Object.keys(shares).filter(function (k) { return shares[k] > 0; });
    var bounty = Number(chore.bountyCents) || 0, list = [], given = 0, biggest = null;
    pids.forEach(function (pid) {
      var sh = shares[pid], cents = Math.floor(bounty * sh / 100);
      given += cents;
      var e = newEntry(pid, date, chore, { questId: qid, share: sh, pts: Math.max(chore.pts > 0 ? 1 : 0, Math.round((Number(chore.pts) || 0) * sh / 100)), bountyCents: cents, bountyPaid: false });
      if (!biggest || sh > biggest.share) biggest = e;
      list.push(e);
    });
    if (biggest) biggest.bountyCents += bounty - given;
    return saveEntries(list);
  }
  function removeEntry(e) {
    if (e.paid && e.paidAs !== 'coins') { toast('Already paid on a payday. Use a withdrawal in the bank to take it back.', true); return; }
    if (e.bountyPaid) { toast('The bounty was already paid. Use a withdrawal in the bank to take it back.', true); return; }
    var ops = [{ t: 'delete', c: 'entries', id: e.id }];
    if (e.status === 'approved') ops = ops.concat(petGrantOps(e, -1));
    return DB.commit(ops).catch(fail);
  }
  function setStatus(list, status) {
    var now = Date.now(), by = S.parent ? S.parent.id : '', ops = [];
    list.forEach(function (e) {
      if (e.status === status) return;
      var d = { status: status, decidedTs: now, decidedBy: by };
      if (status === 'approved') {
        ops = ops.concat(petGrantOps(e, 1), bountyOps(e));
        if (e.bountyCents > 0 && !e.bountyPaid) d.bountyPaid = true;
        d.coins = true; if (e.needGot) d.needGot = e.needGot;
      } else if (e.status === 'approved') { ops = ops.concat(petGrantOps(e, -1)); d.coins = false; }
      ops.unshift({ t: 'update', c: 'entries', id: e.id, d: d });
    });
    return ops.length ? DB.commit(ops) : Promise.resolve();
  }
  function saveSettings(p) {
    if (S.settingsDoc) return DB.commit([{ t: 'update', c: 'meta', id: 'settings', d: p }]);
    return DB.commit([{ t: 'set', c: 'meta', id: 'settings', d: assign({}, S.settings, p) }]);
  }
  /* Weekly allowance: deposits for each allowance day since the last one paid (up to 8), when a parent unlocks. */
  function lastAllowanceDay(day) { var d = parseD(today()); while (d.getDay() !== day) d.setDate(d.getDate() - 1); return dstr(d); }
  function runAllowance() {
    var st = S.settings, day = Number(st.allowanceDay);
    if (!st.dadPid || !isPerson(st.dadPid) || !(st.allowanceCents > 0) || !(day >= 0 && day <= 6)) return;
    var due = lastAllowanceDay(day);
    if (!st.allowanceLast) { saveSettings({ allowanceLast: due }).catch(function () {}); return; }
    if (st.allowanceLast >= due) return;
    /* paydays that fall inside the vacation dates are skipped (no paycheck on vacation) */
    var vac = st.vacation || {}, pause = st.allowanceVacPause !== false && vac.from && vac.to;
    var ops = [], d = addDays(st.allowanceLast, 7), n = 0, skipped = 0, guard = 0;
    while (d <= due && n < 8 && guard++ < 60) {
      if (pause && d >= vac.from && d <= vac.to) skipped++;
      else { ops = ops.concat(txOps(st.dadPid, st.allowanceCents, 'allowance', 'Weekly allowance (' + fmtDate(d) + ')')); n++; }
      d = addDays(d, 7);
    }
    ops.push({ t: 'update', c: 'meta', id: 'settings', d: { allowanceLast: due } });
    DB.commit(ops).then(function () {
      var msg = n ? money(st.allowanceCents * n) + ' weekly allowance deposited to ' + pname(st.dadPid) : '';
      if (skipped) msg += (msg ? '. ' : '') + 'Skipped ' + skipped + ' payday' + (skipped > 1 ? 's' : '') + ' during vacation';
      if (msg) toast(msg);
    }, fail);
  }

  /* ================= approval queue (swipe + undo) ================= */
  function queueDecision(units, status, label) {
    var entries = [];
    units.forEach(function (u) { entries = entries.concat(u.entries); });
    if (!entries.length) return;
    var q = { id: Date.now() + Math.random(), entries: entries, status: status, label: label || (units.length + ' item' + (units.length > 1 ? 's' : '')) };
    q.timer = setTimeout(function () { commitQueued(q); }, UNDO_MS);
    S.queue.push(q);
    go();
  }
  function commitQueued(q) {
    clearTimeout(q.timer);
    var i = S.queue.indexOf(q); if (i < 0) return;
    S.queue.splice(i, 1);
    setStatus(q.entries, q.status).then(schedule, function (e) { fail(e); schedule(); });
  }
  function flushQueue() { S.queue.slice().forEach(commitQueued); }
  function undoLast() {
    var q = S.queue.pop(); if (!q) return;
    clearTimeout(q.timer); toast('Undone'); go();
  }

  /* ================= parent mode ================= */
  function touchAdmin() {
    S.lastActive = Date.now();
    if (!S.admin) return;
    clearTimeout(S.adminTimer);
    if (MODE === 'bank' && keepInfo()) return;
    S.adminTimer = setTimeout(function () { setAdmin(null); toast('Parent mode locked after 10 minutes'); }, 10 * 60 * 1000);
  }
  function setAdmin(parent) {
    if (!parent) flushQueue();
    S.admin = !!parent; S.parent = parent; clearTimeout(S.adminTimer);
    S.adminOpen = MODE === 'bank' && !parent;
    if (parent) {
      touchAdmin();
      if (!S.sel || !isPerson(S.sel)) S.sel = isPerson(S.me) ? S.me : (kids()[0] || activePeople()[0] || {}).id;
      runAllowance();
    } else { S.edit = null; S.ctable = false; S.bankForm = null; S.quest = null; S.avEditFor = null; S.txEdit = null; }
    go();
  }
  function needAdmin() {
    if (S.admin) return true;
    toast('A parent needs to unlock that.', true);
    openAdmin();
    return false;
  }
  function openAdmin() { S.adminOpen = true; S.picking = false; schedule(); setTimeout(function () { var i = $('#pin'); if (i) i.focus(); }, 80); }
  function pinPanel() {
    if (!S.adminOpen || S.admin || S.phase !== 'app') return '';
    var cancel = MODE === 'bank' ? '' : '<button class="btn" type="button" data-act="adminClose">Cancel</button>';
    return '<form class="apanel" data-form="pin" data-mode="unlock"><h2>' + (MODE === 'bank' ? esc(bankName()) + ' is locked' : 'Parent unlock') + '</h2>' +
      '<div class="wrap end"><label class="field w-sm" for="pin"><span>Parent PIN</span><input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn primary" type="submit">Unlock</button>' + cancel + '</div>' +
      (MODE === 'bank' ? '<div class="checks"><label><input type="checkbox" id="pinKeep" checked>Keep me unlocked on this phone for ' + KEEP_DAYS + ' days</label></div>' : '') + '</form>';
  }
  function pinTaken(pin, exceptId) {
    return (S.settings.parents || []).some(function (p) { return p.id !== exceptId && sha256(p.salt + ':' + pin) === p.hash; });
  }
  function makeParent(name, pin) { var salt = DB.newId('meta'); return { id: DB.newId('meta'), name: name, salt: salt, hash: sha256(salt + ':' + pin) }; }
  /* PIN guessing: every 5 wrong tries locks this device, longer each time (1 min, 5 min, 15 min, 1 hour, 4 hours, then a day).
     The count lives on the device (reloading doesn't reset it) and each lock tells the parents (alerts collection). */
  var PIN_TRIES = 5, PIN_LOCKS = [60, 300, 900, 3600, 14400, 86400];
  function pinLock() { try { return JSON.parse(LS.get('cl.pinlock') || '{}') || {}; } catch (e) { return {}; } }
  function waitText(until) { var s = Math.max(1, Math.ceil((until - Date.now()) / 1000)); return s < 90 ? s + ' seconds' : s < 5400 ? Math.ceil(s / 60) + ' minutes' : Math.ceil(s / 3600) + ' hours'; }
  function alertBar() {
    var list = (S.alerts || []).filter(function (a) { return !a.seen; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!list.length) return '';
    var a = list[0], who = a.who ? pname(a.who) : '';
    return '<div class="alert-bar" role="alert"><span class="grow"><b>Wrong parent PIN</b> typed ' + a.n + ' times on ' + (a.app === 'parent' ? 'the parent app' : 'a kids’ device') + (who ? ' while ' + esc(who) + ' was using it' : '') +
      ', ' + esc(a.date === today() ? 'today' : fmtDate(a.date)) + ' at ' + hm(a.ts) + '. That device is locked for a while.' + (list.length > 1 ? ' <small>(+' + (list.length - 1) + ' more)</small>' : '') + '</span>' +
      '<button class="btn small" type="button" data-act="alertOk">OK</button></div>';
  }
  function submitPin(mode, pin, pin2, name, done) {
    if (!/^\d{4,8}$/.test(pin)) { toast('Use 4 to 8 digits.', true); return; }
    var parents = (S.settings.parents || []).slice();
    if (mode === 'add' || mode === 'change') {
      if (pin !== pin2) { toast('The two PINs do not match.', true); return; }
      if (pinTaken(pin, mode === 'change' ? S.parent.id : null)) { toast('That PIN is already used by another parent. Pick a different one.', true); return; }
      if (mode === 'change') {
        var salt = DB.newId('meta');
        parents = parents.map(function (p) { return p.id === S.parent.id ? assign({}, p, { salt: salt, hash: sha256(salt + ':' + pin) }) : p; });
      } else { name = trim(name) || 'Parent ' + (parents.length + 1); parents.push(makeParent(name, pin)); }
      saveSettings({ parents: parents }).then(function () { toast(mode === 'add' ? name + ' can now unlock with their PIN' : 'PIN changed'); if (done) done(); }, fail);
      return;
    }
    var L = pinLock();
    if (Date.now() < (L.until || 0)) { toast('Too many wrong PINs. Try again in ' + waitText(L.until) + '.', true); return; }
    var hit = find(parents, function (p) { return sha256(p.salt + ':' + pin) === p.hash; });
    if (hit) {
      S.fails = 0; LS.set('cl.pinlock', null);
      var kp = $('#pinKeep');
      if (MODE === 'bank') LS.set('cl.keep', kp && kp.checked ? JSON.stringify({ id: hit.id, until: Date.now() + KEEP_DAYS * 864e5 }) : null);
      setAdmin({ id: hit.id, name: hit.name }); toast('Hi ' + hit.name + '. ' + (MODE === 'bank' ? 'Unlocked.' : 'Parent mode is on.'));
    }
    else {
      L.n = (L.n || 0) + 1;
      if (L.n % PIN_TRIES === 0) {
        L.until = Date.now() + PIN_LOCKS[Math.min(L.k || 0, PIN_LOCKS.length - 1)] * 1000; L.k = (L.k || 0) + 1;
        toast('Too many wrong PINs. Locked for ' + waitText(L.until) + '. The parents will see this.', true);
        DB.commit([{ t: 'set', c: 'alerts', id: DB.newId('alerts'), d: { kind: 'pin', ts: Date.now(), date: today(), n: L.n, who: isPerson(S.me) ? S.me : (S.prevKid || ''), app: MODE === 'bank' ? 'parent' : 'kids', ua: String(navigator.userAgent || '').slice(0, 120), seen: false } }]).catch(function () {});
      } else toast('Wrong PIN. ' + (PIN_TRIES - L.n % PIN_TRIES) + ' more tr' + (PIN_TRIES - L.n % PIN_TRIES === 1 ? 'y' : 'ies') + ' before it locks.', true);
      LS.set('cl.pinlock', JSON.stringify(L));
      var i = $('#pin'); if (i) { i.value = ''; i.focus(); }
    }
  }

  /* ================= render ================= */
  function tabsFor() {
    if (MODE === 'bank') return [['approvals', 'Approvals'], ['review', 'Review'], ['bank', 'Accounts'], ['log', 'Chores'], ['lists', 'Lists'], ['pet', 'Pets'], ['history', 'History'], ['setup', 'Setup']];
    if (S.admin) return [['log', 'Chores'], ['pet', 'Pets'], ['approvals', 'Approvals'], ['review', 'Review'], ['bank', 'Bank'], ['lists', 'Lists'], ['history', 'History'], ['setup', 'Setup']];
    if (isAdult(S.me)) return [['log', 'Chores'], ['history', 'History']];
    return [['log', 'Chores'], ['pet', 'My Pet'], ['history', 'History']];
  }
  function header(D) {
    var p = person(S.me);
    var who = p ? '<span class="dot ' + pCls(p) + '"></span>' + esc(p.name) : (S.me === '@parent' ? 'Parent' : 'Who?');
    var showTabs = S.phase === 'app' && !(MODE === 'bank' && !S.admin) && !S.picking && !!S.me;
    var tabs = tabsFor().map(function (t) {
      var badge = '';
      if (t[0] === 'approvals' && D && D.pendCount) badge = '<span class="badge">' + D.pendCount + '</span>';
      if (t[0] === 'review' && S.admin && new Date().getHours() >= 16) { var rl = reviewLeft(today()); if (rl) badge = '<span class="badge">' + rl + '</span>'; }
      if (t[0] === 'bank' && D && D.reqPend.length && S.admin) badge = '<span class="badge">' + D.reqPend.length + '</span>';
      return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + badge + '</button>';
    }).join('');
    var title = MODE === 'bank' ? '<h1 class="bod-title">' + esc(bankName()) + '</h1>' : '<h1>Chore Quest</h1>';
    var right = S.phase !== 'app' || (MODE === 'family' && !ROLE) ? '' : MODE === 'bank'
      ? (S.admin ? '<span class="modeflag">' + esc(S.parent.name) + '</span><button class="btn small" type="button" data-act="adminToggle">Lock</button>' : '')
      : '<button class="who-btn" type="button" data-act="pick">' + who + '</button>' +
        (S.admin ? '<button class="btn small" type="button" data-act="adminToggle">Lock</button>' : '');
    return '<header class="top' + (S.admin ? ' admin' : '') + (MODE === 'bank' ? ' bod' : '') + '"><div class="brand">' + title + '<div class="right row-flex">' + right + '</div></div>' +
      (DB.mode === 'demo' ? '<div class="demo">Demo mode: saved on this device only</div>' : '') + (showTabs ? nudgeBar() : '') + (S.admin ? alertBar() : '') +
      (showTabs ? '<nav class="tabs' + (tabsFor().length > 4 ? ' many' : '') + '" role="tablist" aria-label="Sections">' + tabs + '</nav>' : '') + '</header>';
  }
  var lastShell = '';
  function render() {
    paintPersonColors();
    raf = 0;
    var ae = document.activeElement;
    var typing = ae && view.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.type !== 'search' && ae.type !== 'file';
    if (typing && (S.phase === 'app' || S.phase === 'wizard')) { if (S.phase === 'app') paintLists(); S.dirty = true; return; }
    S.dirty = false;
    if (S.phase === 'app' && S.admin && S.ready.settings && S.ready.pets) coinBackfill();
    if (S.phase === 'app' && S.admin) rwMigrate();
    if (S.phase === 'boot') { root.innerHTML = '<p class="note" style="margin-top:40px;text-align:center">Loading...</p>'; lastShell = ''; return; }
    if (S.phase === 'error') { root.innerHTML = '<div class="banner" style="margin-top:24px"><strong>Could not start.</strong><br>' + esc(S.err) + '</div>'; lastShell = ''; return; }
    if (S.phase === 'login') { renderLogin(); lastShell = ''; return; }
    if (!allReady() && DB.mode === 'firebase' && (S.noReach || Date.now() - (S.startedAt || Date.now()) > 12000)) { renderNoReach(); lastShell = ''; return; }
    if (!allReady()) { root.innerHTML = '<p class="note" style="margin-top:40px;text-align:center">Loading household data...</p>'; lastShell = ''; return; }
    if (!S.settingsDoc) S.phase = 'wizard'; else if (S.phase === 'wizard') S.phase = 'app';
    if (S.phase === 'app' && MODE === 'bank' && !S.admin && !S.keepTried) {
      S.keepTried = true;
      var kp = keepInfo(), hitK = kp && find(S.settings.parents || [], function (p) { return p.id === kp.id; });
      if (hitK) { S.admin = true; S.parent = { id: hitK.id, name: hitK.name }; S.adminOpen = false; if (!S.sel) S.sel = (kids()[0] || activePeople()[0] || {}).id; runAllowance(); }
    }
    var D = S.phase === 'app' ? derive() : null;
    var tabs = tabsFor().map(function (t) { return t[0]; });
    if (tabs.indexOf(S.tab) < 0) S.tab = tabs[0];
    var shell = header(D) + pinPanel(), fromData = S.fromData; S.fromData = false;
    /* the header (tab badges) updates on its own, so new approvals arriving never wipe or jump the page you are on */
    if (!document.getElementById('view') || !document.getElementById('shell')) {
      root.innerHTML = '<div id="shell" class="shell">' + shell + '</div><main id="view"></main><div id="undoBar"></div>';
      lastShell = shell; view = $('#view'); scrollNav();
    } else if (shell !== lastShell) { $('#shell').innerHTML = shell; lastShell = shell; scrollNav(); }
    renderUndoBar();
    /* a chore being edited in Setup stays as it is (with your unsaved ticks) until you save or cancel */
    if (fromData && S.phase === 'app' && S.tab === 'setup' && (S.edit || S.ctable)) { S.dirty = true; return; }
    if (S.phase === 'wizard') { view.setAttribute('data-view', 'wizard'); renderWizard(); return; }
    if (MODE === 'bank' && !S.admin) {
      view.setAttribute('data-view', 'locked');
      view.innerHTML = '<div class="stack"><p class="note">This is the parent app. Enter a parent PIN to open it.</p>' +
        '<div class="card stack tight"><h2>Is this a kid’s device?</h2><p class="note">Switch it to the kids’ app with the pet game. A parent can switch it back in Setup.</p>' +
        '<div class="wrap"><button class="btn" type="button" data-act="roleKids">Use the kids’ app here</button></div></div></div>';
      return;
    }
    if (MODE === 'family' && !ROLE) { view.setAttribute('data-view', 'role'); renderRoleChoice(); return; }
    if (MODE === 'family' && (S.picking || !(isPerson(S.me) || S.me === '@parent'))) { view.setAttribute('data-view', 'pick'); renderPicker(); return; }
    if (view.getAttribute('data-view') !== S.tab) { view.innerHTML = ''; view.setAttribute('data-view', S.tab); }
    if (S.tab === 'log') renderLog(D);
    else if (S.tab === 'pet') { if (window.Pets) window.Pets.render(view, D); else view.innerHTML = '<p class="note">The pet game did not load.</p>'; }
    else if (S.tab === 'approvals') renderApprovals(D);
    else if (S.tab === 'bank') renderBank(D);
    else if (S.tab === 'history') { if (S.admin && S.mtg && S.mtg.open) renderMeeting(); else renderHistory(D); }
    else if (S.tab === 'lists') renderLists();
    else if (S.tab === 'review') renderReview();
    else renderSetup(D);
  }
  function scrollNav() {
    var nav = root.querySelector('.tabs'), on = nav && nav.querySelector('[aria-selected="true"]');
    if (on && nav.scrollWidth > nav.clientWidth) {
      var l = on.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft, r = l + on.offsetWidth;
      if (r > nav.clientWidth - 16) nav.scrollLeft = r - nav.clientWidth + 32;
    }
  }
  function allReady() { var r = S.ready; return r.people && r.chores && r.entries && r.txns && r.reqs && r.settings && r.pets && r.adv; }
  function renderUndoBar() {
    var el = $('#undoBar'); if (!el) return;
    var q = S.queue[S.queue.length - 1];
    if (!q) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'undo-bar';
    el.innerHTML = '<span class="grow">' + (q.status === 'approved' ? 'Approved ' : 'Denied ') + esc(q.label) + (S.queue.length > 1 ? ' (+' + (S.queue.length - 1) + ' more)' : '') + '</span>' +
      '<button class="btn small" type="button" data-act="undo">Undo</button>';
  }

  /* ----- login (Firebase mode) ----- */
  function renderLogin() {
    root.innerHTML = '<div class="picker"><h1>' + (MODE === 'bank' ? 'Family bank' : 'Chore Quest') + '</h1><p class="note" style="margin:6px 0 16px">Sign in once on this device with the household account.</p>' +
      '<form data-form="login" class="stack tight"><label class="field" for="lgEmail"><span>Household email</span><input id="lgEmail" type="email" autocomplete="username"></label>' +
      '<label class="field" for="lgPw"><span>Password</span><input id="lgPw" type="password" autocomplete="current-password"></label>' +
      '<button class="btn primary block" type="submit">Sign in</button></form></div>';
  }

  /* ----- first-run setup ----- */
  function renderNoReach() {
    var lp = !!DB.longPoll;
    root.innerHTML = '<div class="picker stack"><div><h2>Can’t reach your household data yet</h2>' +
      '<p class="note">This device is signed in' + (DB.user && DB.user.email ? ' as <strong>' + esc(DB.user.email) + '</strong>' : '') + ' but hasn’t been able to load the family’s chores and pets. ' +
      'Check that it’s on Wi-Fi, then try again. If this keeps happening on this tablet, try the other connection mode.</p></div>' +
      '<div class="stack tight"><button class="btn primary block" type="button" data-act="nrRetry">Try again</button>' +
      '<button class="btn block" type="button" data-act="nrMode">' + (lp ? 'Switch back to the normal connection' : 'Try the other connection mode') + '</button>' +
      '<button class="btn block' + (S.armed === 'nrSignout' ? ' danger' : '') + '" type="button" data-act="nrSignout">' + (S.armed === 'nrSignout' ? 'Tap again to sign out' : 'Sign out (back to the sign-in screen)') + '</button></div>' +
      '<p class="note">Connection mode: ' + (lp ? 'compatibility (long polling)' : 'normal') + '. On a tablet with a kids profile, the profile’s web filter can block the database; try from the grown-up profile.</p></div>';
  }
  function renderWizard() {
    var w = S.wiz, imp = w.imported;
    var h = '<div class="picker wide stack"><div><h2>Set up your household</h2><p class="note">This runs once. Everything can be changed later in Setup.</p></div>' +
      (DB.mode === 'firebase' ? '<div class="banner warn"><strong>Already using Chore Quest on another device?</strong> Don’t fill this in. This device is signed in' + (DB.user && DB.user.email ? ' as ' + esc(DB.user.email) : '') +
        '; tap Try again to load your family, or sign out.<div class="wrap" style="margin-top:8px"><button class="btn small" type="button" data-act="nrRetry">Try again</button>' +
        '<button class="btn small' + (S.armed === 'nrSignout' ? ' danger' : '') + '" type="button" data-act="nrSignout">' + (S.armed === 'nrSignout' ? 'Tap again to sign out' : 'Sign out') + '</button></div></div>' : '') +
      '<form class="card stack tight" data-form="wizard">' +
      '<label class="field" for="wzBank"><span>Name of the family bank</span><input type="text" id="wzBank" maxlength="30" placeholder="Family Bank" value="' + esc(imp && imp.bankName || '') + '"></label>' +
      '<div class="wrap end"><label class="field w-md" for="wzName"><span>Your name (parent)</span><input type="text" id="wzName" maxlength="24" placeholder="Dad"></label>' +
      '<label class="field w-sm" for="wzPin"><span>Parent PIN</span><input type="password" id="wzPin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="wzPin2"><span>Repeat PIN</span><input type="password" id="wzPin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label></div>' +
      '<p class="note">Each parent gets their own 4 to 8 digit PIN. Add the other parent in Setup afterwards.</p>';
    if (imp) {
      h += '<div class="banner info">Loaded <strong>' + imp.people.length + ' people</strong> and <strong>' + imp.chores.length + ' chores</strong> from the family file. <button class="btn small" type="button" data-act="wzClearImport">Use the form instead</button></div>';
    } else {
      h += '<fieldset><legend>Family members who do chores (you can include yourself)</legend>' +
        (w.people.length ? '<div class="wrap">' + w.people.map(function (n, i) { return '<span class="chip">' + esc(n) + '<button type="button" class="x" data-act="wzDel" data-i="' + i + '" aria-label="Remove ' + esc(n) + '">&times;</button></span>'; }).join('') + '</div>' : '') +
        '<div class="wrap end" style="margin-top:6px"><div class="field w-md"><input type="text" id="wzPerson" maxlength="30" placeholder="Name" aria-label="Family member name"></div><button class="btn" type="button" data-act="wzAdd">Add</button>' +
        '<button class="btn small" type="button" data-act="wzSample">Use a sample family</button></div></fieldset>' +
        '<fieldset><legend>Chores</legend><div class="checks" style="display:block">' +
        '<label><input type="radio" name="wzStarter" value="1"' + (w.starter ? ' checked' : '') + '>Start with the starter list (' + ((window.CL_STARTER || []).length) + ' chores, everyone assigned)</label><br>' +
        '<label><input type="radio" name="wzStarter" value="0"' + (w.starter ? '' : ' checked') + '>Start with no chores</label></div></fieldset>';
    }
    h += '<fieldset><legend>What is this device?</legend><div class="checks" style="display:block">' +
      '<label><input type="radio" name="wzRole" value="parent"' + (MODE === 'bank' ? ' checked' : '') + '>My own phone: open the parent app (approvals, bank, setup) here</label><br>' +
      '<label><input type="radio" name="wzRole" value="kids"' + (MODE === 'bank' ? '' : ' checked') + '>A shared family device: open the kids’ app (chores and pet game) here</label></div></fieldset>';
    h += '<button class="btn primary block" type="submit">Create household</button></form>' +
      '<div class="card stack tight"><h2>Have a family file?</h2><p class="note">A family file holds your people, chores and who does what. It is private to you and not part of the app.</p>' +
      '<input type="file" id="wzFile" accept=".json,application/json"></div></div>';
    view.innerHTML = h;
  }
  function wizAddPerson() {
    var i = $('#wzPerson'), n = trim(i && i.value);
    if (!n) return;
    if (S.wiz.people.indexOf(n) < 0) S.wiz.people.push(n);
    i.value = ''; renderWizard(); var ni = $('#wzPerson'); if (ni) ni.focus();
  }
  function wizCreate() {
    var name = trim(val('wzName')) || 'Parent', pin = val('wzPin'), pin2 = val('wzPin2'), bank = trim(val('wzBank')) || 'Family Bank';
    if (!/^\d{4,8}$/.test(pin)) { toast('Use 4 to 8 digits for the PIN.', true); return; }
    if (pin !== pin2) { toast('The two PINs do not match.', true); return; }
    var imp = S.wiz.imported, ops = [], parent = makeParent(name, pin), st;
    var starterEl = $$('input[name=wzStarter]').filter(function (x) { return x.checked; })[0];
    if (imp) {
      imp.people.forEach(function (p, i) { ops.push({ t: 'set', c: 'people', id: p.id, d: { name: p.name, order: typeof p.order === 'number' ? p.order : i, active: p.active !== false, balance: 0 } }); });
      imp.chores.forEach(function (c, i) { var d = assign({}, c); delete d.id; if (typeof d.order !== 'number') d.order = i; if (d.active === undefined) d.active = true; ops.push({ t: 'set', c: 'chores', id: c.id || DB.newId('chores'), d: d }); });
      st = assign({}, DEFAULTS, imp.settings || {});
    } else {
      if (!S.wiz.people.length) { toast('Add at least one family member.', true); return; }
      var ids = [];
      S.wiz.people.forEach(function (n, i) {
        var id = slug(n), k = 1; while (ids.indexOf(id) >= 0) id = slug(n) + '-' + (++k);
        ids.push(id);
        ops.push({ t: 'set', c: 'people', id: id, d: { name: n, order: i, active: true, balance: 0 } });
      });
      if (starterEl && starterEl.value === '1') (window.CL_STARTER || []).forEach(function (c, i) {
        ops.push({ t: 'set', c: 'chores', id: 'c' + (1000 + i), d: { name: c.name, pts: c.pts, cat: c.cat, need: c.need || '', who: ids.slice(), order: i, active: true, bountyCents: c.bountyCents || 0, major: !!c.major, majorEach: !!c.majorEach, majorDays: c.majorDays || [] } });
      });
      st = assign({}, DEFAULTS, { catOrder: window.CL_STARTER_CATS || [] });
    }
    st.bankName = bank; st.parents = [parent]; st.seeded = Date.now();
    if (st.dadPid) st.allowanceLast = lastAllowanceDay(Number(st.allowanceDay));
    ops.push({ t: 'set', c: 'meta', id: 'settings', d: st });
    var roleEl = $$('input[name=wzRole]').filter(function (x) { return x.checked; })[0], role = roleEl ? roleEl.value : 'kids';
    /* ask the server (not this device's cache) whether a household already exists before writing anything */
    var check = DB.mode === 'firebase' ? DB.query({ c: 'meta', id: 'settings', server: true }) : Promise.resolve(null);
    check.then(function (existing) {
      if (existing) { toast('This household is already set up. Loading it now.'); setTimeout(function () { location.reload(); }, 1200); return; }
      wizCommit(ops, role, parent);
    }, function () { toast('Can’t reach the household data right now, so nothing was saved. Check the Wi-Fi and try again.', true); });
  }
  function wizCommit(ops, role, parent) {
    DB.commit(ops).then(function () {
      LS.set('cl.role', role); ROLE = role;
      if (role === 'parent') LS.set('cl.keep', JSON.stringify({ id: parent.id, until: Date.now() + KEEP_DAYS * 864e5 }));
      if ((role === 'parent') !== (MODE === 'bank')) { if (role === 'kids' && window.CL_MODE === 'bank') location.href = 'index.html'; else location.reload(); return; }
      S.wiz = { people: [], starter: true, imported: null }; S.phase = 'app';
      S.me = '@parent'; setAdmin({ id: parent.id, name: parent.name }); S.tab = 'setup';
      toast('Household created. Parent mode is on.');
    }, fail);
  }
  function wizImport(file) {
    if (!file || !window.FileReader) { toast('This browser cannot read files.', true); return; }
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !d.people || !d.people.length || !d.chores) throw new Error('bad');
        S.wiz.imported = d; renderWizard(); toast('Family file loaded. Add your parent name and PIN, then create.');
      } catch (e) { toast('That file is not a Chore Quest family file.', true); }
    };
    r.readAsText(file);
  }
  function exportFamily() {
    var st = S.settings, data = {
      app: 'chore-ledger', version: 1, bankName: st.bankName,
      settings: { catOrder: st.catOrder, centsPerPoint: st.centsPerPoint, petEvolve1Cents: st.petEvolve1Cents, petEvolve2Cents: st.petEvolve2Cents, dadPid: st.dadPid, allowanceCents: st.allowanceCents, allowanceDay: st.allowanceDay, requireApproval: st.requireApproval },
      people: S.people.map(function (p) { return { id: p.id, name: p.name, order: p.order, active: p.active !== false }; }),
      chores: S.chores.map(function (c) { var o = assign({}, c); return o; })
    };
    try {
      var a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 1));
      a.download = 'family-file-' + today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { toast('This browser cannot download files.', true); }
  }

  /* ----- one-time device question on a new device ----- */
  function renderRoleChoice() {
    view.innerHTML = '<div class="picker stack"><div><h2>Who uses this device?</h2><p class="note">This is asked once. A parent can change it later in Setup.</p></div>' +
      '<button type="button" class="role-btn" data-act="roleKids"><strong>Kids</strong><small>Shared devices. Each kid picks their name, logs chores and plays the pet game.</small></button>' +
      '<button type="button" class="role-btn" data-act="roleParent"><strong>A parent</strong><small>Your own phone. Opens the parent app: approvals, bank accounts, chores for anyone and setup. Locked with your PIN.</small></button></div>';
  }

  /* ----- profile picker (every time the app opens, since devices are shared) ----- */
  function renderPicker() {
    var ps = activePeople();
    view.innerHTML = '<div class="picker"><h2>Who is using the app?</h2>' +
      ps.map(function (p) {
        var pet = window.Pets ? window.Pets.miniHtml(p.id) : '';
        return '<button type="button" class="chip pick ' + pCls(p) + (p.id === S.lastMe ? ' last' : '') + '" data-act="choose" data-pid="' + esc(p.id) + '">' + (pet || '<span class="dot"></span>') + '<span class="grow">' + esc(p.name) + '</span></button>';
      }).join('') +
      '<button type="button" class="chip pick" data-act="choose" data-pid="@parent"><span class="dot"></span><span class="grow">Parent</span></button>' +
      '<p class="note" style="margin-top:10px">Pick your name each time. The app comes back here after 5 minutes without use.</p></div>';
  }

  /* ----- Chore reminders: a parent taps the bell, the kid's devices get a push notification and an in-app reminder bar ----- */
  function lastNudge(cid, pid) {
    var best = null;
    (S.nudges || []).forEach(function (n) { if (n.cid === cid && n.pid === pid && n.date === today() && (!best || n.ts > best.ts)) best = n; });
    return best;
  }
  function hm(ts) { var d = new Date(ts), h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' am' : ' pm'); }
  function nudgeNote(n) {
    var sent = n.push ? (n.push === 'no-devices' ? ', in the app' : ', ' + n.push + ' sent') : '';
    return '&#128276; reminded ' + hm(n.ts) + (n.seen ? ', seen' : sent);
  }
  function bellBtn(cid, pid, name) {
    return '<button class="btn small bell" type="button" data-act="nudge" data-cid="' + esc(cid) + '" data-pid="' + esc(pid) + '" aria-label="Remind ' + esc(name) + '" title="Send a reminder">&#128276;</button>';
  }
  function sendNudge(cid, pids) {
    var c = find(S.chores, function (x) { return x.id === cid; }); if (!c || !pids.length) return;
    var now = Date.now(), from = (S.parent && S.parent.name) || 'A parent', ops = [], names = [];
    pids.forEach(function (pid) {
      var k = cid + '|' + pid; if (S.nudgeLock[k] && now - S.nudgeLock[k] < 20000) return;
      S.nudgeLock[k] = now; names.push(pname(pid));
      ops.push({ t: 'set', c: 'nudges', id: DB.newId('nudges'), d: { pid: pid, cid: cid, chore: c.name, from: from, ts: now, date: today(), seen: false,
        title: pname(pid) + ', a reminder from ' + from, body: 'Time for: ' + c.name } });
    });
    if (!ops.length) { toast('Reminder already sent'); return; }
    DB.commit(ops).then(function () { toast('Reminder sent to ' + names.join(', ') + ': ' + c.name); }, fail);
  }
  function nudgeBar() {
    if (S.admin || !isPerson(S.me)) return '';
    var list = (S.nudges || []).filter(function (n) { return n.pid === S.me && n.date === today() && !n.seen; }).sort(function (a, b) { return b.ts - a.ts; });
    if (!list.length) return '';
    var n = list[0];
    return '<div class="nudge-bar" role="status"><span class="nb-bell" aria-hidden="true">&#128276;</span><span class="grow"><b>' + esc(n.from || 'A parent') + '</b> says it’s time for <b>' + esc(n.chore || 'a chore') + '</b>' +
      (list.length > 1 ? ' <small>(+' + (list.length - 1) + ' more)</small>' : '') + '</span>' +
      '<button class="btn small" type="button" data-act="nudgeGo" data-id="' + esc(n.id) + '">Show me</button><button class="btn small primary" type="button" data-act="nudgeOk" data-id="' + esc(n.id) + '">On it!</button></div>';
  }
  /* push: this device signs up with Firebase Cloud Messaging and records which kids use it; a Cloud Function sends the pushes */
  function pushCan() {
    var cfg = window.CL_CONFIG || {};
    return DB.mode === 'firebase' && !!cfg.vapidKey && location.protocol === 'https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function pushPrompt() {
    if (S.admin || !isPerson(S.me) || !pushCan() || Notification.permission !== 'default' || LS.get('cl.pushAsk') === 'no') return '';
    return '<div class="card push-ask"><p style="margin:0"><b>&#128276; Get chore reminders on this device?</b> A parent can send ' + esc(pname(S.me)) + ' a reminder even when the app is closed.</p>' +
      '<div class="wrap"><button class="btn primary" type="button" data-act="pushOn">Turn on reminders</button><button class="btn" type="button" data-act="pushNo">Not now</button></div></div>';
  }
  function hashStr(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36); }
  function pushRegister() {
    if (!pushCan() || Notification.permission !== 'granted' || !DB.pushToken) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) { return DB.pushToken(window.CL_CONFIG.vapidKey, reg); }).then(function (token) {
      if (!token) return null;
      var who = (LS.get('cl.pushWho') || '').split(',').filter(Boolean);
      if (isPerson(S.me) && who.indexOf(S.me) < 0) who.push(S.me);
      LS.set('cl.pushWho', who.join(','));
      var id = 'dev_' + hashStr(token);
      if (LS.get('cl.pushTok') === token && LS.get('cl.pushSaved') === who.join(',')) return token;
      return DB.commit([{ t: 'set', c: 'devices', id: id, d: { token: token, who: who, role: ROLE || MODE, ts: Date.now(), ua: String(navigator.userAgent).slice(0, 120) } }]).then(function () {
        LS.set('cl.pushTok', token); LS.set('cl.pushSaved', who.join(',')); return token;
      });
    }).catch(function (e) { if (window.console) console.warn('push', e && e.message); return null; });
  }
  function pushEnable() {
    if (!pushCan()) { toast('This device can’t get reminders. On iPhone, add the app to the Home Screen first.', true); return; }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { LS.set('cl.pushAsk', 'no'); toast('Reminders are off. You can turn them on in the device settings.', true); schedule(); return; }
      pushRegister().then(function (t) { toast(t ? 'Reminders are on for this device' : 'Could not turn on reminders', !t); schedule(); });
    });
  }
  function pushRefresh() { if (pushCan() && Notification.permission === 'granted') pushRegister(); }
  function remindersCard() {
    var devs = (S.devices || []).slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return '<section class="card stack tight"><h2>&#128276; Chore reminders</h2>' +
      '<p class="note" style="margin:0">Tap the bell next to a chore in the Chores tab to remind a kid. It shows up in their app' + (window.CL_CONFIG && CL_CONFIG.vapidKey ? ', and as a notification on any device below.' : '. Phone notifications switch on once push is set up.') + '</p>' +
      (devs.length ? '<ul class="list">' + devs.map(function (d) {
        return '<li class="row"><div class="rname">' + esc((d.who || []).map(pname).join(', ') || 'No one yet') + '<div class="meta note">' + esc(/iPhone|iPad/.test(d.ua || '') ? 'iPhone/iPad' : /Android/.test(d.ua || '') ? 'Android' : 'Device') + ' &middot; signed up ' + esc(fmtDate(new Date(d.ts || 0).toISOString().slice(0, 10))) + '</div></div>' +
          '<button class="btn small" type="button" data-act="devDel" data-id="' + esc(d.id) + '">Remove</button></li>';
      }).join('') + '</ul>' : '<p class="note" style="margin:0">No devices yet. On each kid’s device, open the Chores tab and tap <b>Turn on reminders</b>.</p>') + '</section>';
  }

  /* ----- Chores (log) ----- */
  function logModeSeg() {
    return '<div class="seg" role="group" aria-label="Log chores"><button type="button" data-act="logMode" data-m="person" aria-pressed="' + (S.logMode !== 'chore') + '">By person</button>' +
      '<button type="button" data-act="logMode" data-m="chore" aria-pressed="' + (S.logMode === 'chore') + '">By chore</button></div>';
  }
  function renderLog(D) {
    if (S.admin && S.logMode === 'chore') { renderLogByChore(D); return; }
    if (S.admin && (!S.sel || !isPerson(S.sel))) S.sel = (kids()[0] || activePeople()[0] || {}).id;
    var pid = logTarget();
    if (!pid) {
      view.innerHTML = '<div class="banner info">Unlock parent mode to log chores for anyone, or tap the name button at the top to pick a person.' +
        '<div style="margin-top:10px"><button class="btn primary" type="button" data-act="adminOpen">Parent unlock</button></div></div>';
      return;
    }
    if (!$('#logList')) {
      view.innerHTML = '<section class="stack">' +
        '<div id="logModeBox"></div>' +
        '<div id="chips" class="wrap"></div>' +
        '<div class="wrap end"><label class="field w-md" for="date"><span>Date</span><input type="date" id="date"></label>' +
        '<button class="btn" id="todayBtn" data-act="today" type="button">Today</button></div>' +
        '<div class="head-line" id="logHead"></div>' +
        '<p class="note" id="logNote"></p>' +
        '<div id="pushBox"></div>' +
        '<div id="passBox"></div>' +
        '<div id="questBox"></div>' +
        '<div class="cats" id="cats"></div><div class="cats gives" id="gives"></div>' +
        '<div class="wrap"><div class="field w-lg"><input type="search" id="q" placeholder="Search chores" aria-label="Search chores"></div>' +
        '<div class="field w-md"><select id="sort" aria-label="Sort chores"><option value="cat">By category</option><option value="routine">Routine order</option><option value="used">Most used</option><option value="points">Most chore coins</option><option value="name">A to Z</option></select></div></div>' +
        '<ul class="list" id="logList"></ul></section>';
      $('#q').value = S.q; $('#sort').value = S.sort;
    }
    $('#chips').innerHTML = S.admin ? activePeople().map(function (p) {
      var x = D.T(p.id);
      return '<button type="button" class="chip ' + pCls(p) + '" data-act="sel" data-pid="' + esc(p.id) + '" aria-pressed="' + (p.id === pid) + '"><span class="dot"></span>' + esc(p.name) +
        (x.pendN ? '<b title="waiting for approval">' + x.pendN + '</b>' : '') + '</button>';
    }).join('') : '';
    $('#chips').hidden = !S.admin;
    $('#logModeBox').innerHTML = S.admin ? logModeSeg() : '';
    var di = $('#date'); if (di && document.activeElement !== di) di.value = S.date;
    $('#todayBtn').hidden = S.date === D.t;
    var req = S.settings.requireApproval !== false;
    $('#logNote').textContent = !req ? 'Approved chores feed your pet.' : (S.admin ? 'Parent mode: chores you log are approved right away.' : 'Chores count and feed your pet once a parent approves them.');
    var mine = S.entries.filter(function (e) { return e.pid === pid && e.date === S.date; });
    var ok = 0, pe = 0;
    mine.forEach(function (e) { if (e.status === 'approved') ok += e.pts; else if (e.status === 'pending') pe += e.pts; });
    $('#logHead').innerHTML = '<strong>' + esc(pname(pid)) + '</strong> &middot; <span class="mono">' + n0(ok) + '</span> chore coins approved' +
      (pe ? ', <span class="mono">' + n0(pe) + '</span> waiting' : '') + ' ' + (S.date === D.t ? 'today' : 'on ' + esc(fmtDate(S.date))) +
      (S.date !== D.t ? '<span class="pill">Past date</span>' : '');
    renderQuestBox();
    renderPassBox(pid);
    var pb = $('#pushBox'); if (pb) pb.innerHTML = pushPrompt();
    updateLogList(pid);
  }
  /* ----- Chores tab, by chore (parent mode): tap a chore to see everyone assigned and mark or approve them together ----- */
  function boardChores() {
    var vac = window.ADV && ADV.onVacation();
    return S.chores.filter(function (c) { return c.active !== false && (c.who || []).length && vacShow(c, vac) && dayOk(c, S.date); });
  }
  function choreStatus(cid, pid) {
    var es = S.entries.filter(function (e) { return e.cid === cid && e.pid === pid && e.date === S.date; }), qd = queuedIds();
    if (es.some(function (e) { return e.status === 'pending' && !qd[e.id]; })) return 'wait';
    if (es.some(function (e) { return e.status === 'approved' || (e.status === 'pending' && qd[e.id]); })) return 'ok';
    if (es.some(function (e) { return e.status === 'rejected'; })) return 'no';
    return 'none';
  }
  function picked(cid, pid, st) { var k = cid + '|' + pid; return S.chPick.hasOwnProperty(k) ? S.chPick[k] : st === 'wait'; }
  function renderLogByChore(D) {
    if (!$('#choreList')) {
      view.innerHTML = '<section class="stack">' + '<div id="logModeBox">' + logModeSeg() + '</div>' +
        '<div class="wrap end"><label class="field w-md" for="date"><span>Date</span><input type="date" id="date"></label>' +
        '<button class="btn" id="todayBtn" data-act="today" type="button">Today</button></div>' +
        '<p class="note">Tap a chore to see everyone it is assigned to. Tick who did it, then approve them all at once. Anyone not logged yet gets logged and approved.</p>' +
        '<div class="cats" id="cats"></div><div class="cats gives" id="gives"></div>' +
        '<div class="wrap"><div class="field w-lg"><input type="search" id="q" placeholder="Search chores" aria-label="Search chores"></div></div>' +
        '<ul class="list board" id="choreList"></ul></section>';
      $('#q').value = S.q;
    }
    var di = $('#date'); if (di && document.activeElement !== di) di.value = S.date;
    $('#todayBtn').hidden = S.date === D.t;
    updateChoreBoard();
  }
  function updateChoreBoard() {
    var ul = $('#choreList'); if (!ul) return;
    var all = boardChores(), cats = catList(all), per = {}, waits = {}, nwait = 0;
    all.forEach(function (c) { var n = catName(c); per[n] = (per[n] || 0) + 1; });
    var ids = {}, qd = queuedIds(); all.forEach(function (c) { ids[c.id] = 1; });
    S.entries.forEach(function (e) { if (e.date === S.date && e.status === 'pending' && !qd[e.id] && ids[e.cid] && !waits[e.cid]) { waits[e.cid] = 1; nwait++; } });
    if (S.cat === '$w' && !nwait) S.cat = 'all';
    if (S.cat !== 'all' && S.cat !== '$' && S.cat !== '$w' && cats.indexOf(S.cat) < 0) S.cat = 'all';
    $('#cats').innerHTML = cats.length > 1 || nwait ? '<button type="button" class="cat" data-act="cat" data-cat="all" aria-pressed="' + (S.cat === 'all') + '">All<small>' + all.length + '</small></button>' +
      (nwait ? '<button type="button" class="cat" data-act="cat" data-cat="$w" aria-pressed="' + (S.cat === '$w') + '">Waiting<small>' + nwait + '</small></button>' : '') +
      (cats.length > 1 ? cats.map(function (n) { return '<button type="button" class="cat" data-act="cat" data-cat="' + esc(n) + '" aria-pressed="' + (S.cat === n) + '">' + esc(n) + '<small>' + per[n] + '</small></button>'; }).join('') : '') : '';
    var list = givesChips(all).filter(function (c) { return S.cat === 'all' ? true : S.cat === '$w' ? !!waits[c.id] : S.cat === '$' ? c.bountyCents > 0 : catName(c) === S.cat; });
    var q = trim(S.q).toLowerCase();
    if (q) list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || catName(c).toLowerCase().indexOf(q) >= 0; });
    var order = catList(S.chores);
    list.sort(function (a, b) { return (order.indexOf(catName(a)) - order.indexOf(catName(b))) || ((a.order || 0) - (b.order || 0)); });
    if (!list.length) { ul.innerHTML = '<li class="empty">No chores match.</li>'; return; }
    ul.innerHTML = list.map(function (c) {
      var ppl = (c.who || []).map(person).filter(function (p) { return p && p.active !== false; });
      var sts = ppl.map(function (p) { return choreStatus(c.id, p.id); });
      var nw = sts.filter(function (x) { return x === 'wait'; }).length, nok = sts.filter(function (x) { return x === 'ok'; }).length, open = S.chOpen === c.id;
      var tags = giveTag(c) + (nw ? '<span class="tag pend">' + nw + ' waiting</span>' : '') + (nok ? '<span class="tag ok">' + nok + ' of ' + ppl.length + ' done</span>' : '') +
        (!nw && !nok ? '<span class="tag">' + ppl.length + ' assigned</span>' : '') + (c.bountyCents > 0 ? '<span class="tag bounty">' + money(c.bountyCents) + ' bounty</span>' : '');
      var h = '<li class="crow' + (open ? ' open' : '') + (nw ? ' has-wait' : '') + '"><button type="button" class="crow-head" data-act="chOpen" data-cid="' + esc(c.id) + '" aria-expanded="' + open + '">' +
        '<span class="rname">' + esc(c.name) + '<span class="meta">' + tags + '</span></span>' + ptsBadge(c.pts, !!levelsOf(c)) + '<span class="chev" aria-hidden="true">' + (open ? '&#9652;' : '&#9662;') + '</span></button>';
      if (open) {
        var n = 0;
        h += '<div class="crow-body">' + ppl.map(function (p, i) {
          var st = sts[i], on = st === 'ok' || picked(c.id, p.id, st);
          if (on && st !== 'ok') n++;
          var lab = { wait: 'waiting', ok: 'approved', no: 'sent back', none: 'not yet' }[st];
          var pend = st === 'wait' ? find(S.entries, function (e) { return e.cid === c.id && e.pid === p.id && e.date === S.date && e.status === 'pending' && !e.questId; }) : null;
          var ln = st === 'none' || st === 'no' ? lastNudge(c.id, p.id) : null;
          return '<div class="cperson ' + pCls(p) + '"><label class="cp-main"><input type="checkbox" data-act="chPick" data-cid="' + esc(c.id) + '" data-pid="' + esc(p.id) + '"' + (on ? ' checked' : '') + (st === 'ok' ? ' disabled' : '') + '>' +
            '<span class="dot"></span><span class="grow">' + esc(p.name) + (ln ? '<small class="nudged">' + nudgeNote(ln) + '</small>' : '') + '</span><span class="cp-st st-' + st + '">' + lab + '</span></label>' +
            (st === 'none' || st === 'no' ? bellBtn(c.id, p.id, p.name) : '') +
            (pend ? '<button class="btn small danger" type="button" data-act="rjUnit" data-key="e' + esc(pend.id) + '" aria-label="Send back ' + esc(p.name) + '">&#10005;</button>' : '') + '</div>';
        }).join('') +
          (levelsOf(c) ? '<div class="crow-lv"><label class="field w-md"><span>How did it go?</span><select data-act="chLv" data-cid="' + esc(c.id) + '">' + levelsOf(c).map(function (x, i) {
            return '<option value="' + i + '"' + ((S.chLv[c.id] || 0) === i ? ' selected' : '') + '>' + esc(x.n) + ' (' + x.p + '%)</option>'; }).join('') + '</select></label></div>' : '') +
          '<div class="crow-foot"><button class="btn small" type="button" data-act="chAll" data-cid="' + esc(c.id) + '">Everyone</button><button class="btn small" type="button" data-act="chNone" data-cid="' + esc(c.id) + '">Nobody</button>' +
          (sts.filter(function (x) { return x === 'none' || x === 'no'; }).length ? '<button class="btn small" type="button" data-act="nudgeAll" data-cid="' + esc(c.id) + '">&#128276; Remind the rest</button>' : '') +
          '<button class="btn primary" type="button" data-act="chGo" data-cid="' + esc(c.id) + '"' + (n ? '' : ' disabled') + '>Approve ' + (n || '') + '</button></div></div>';
      }
      return h + '</li>';
    }).join('');
  }
  function choreGo(cid) {
    var c = find(S.chores, function (x) { return x.id === cid; }); if (!c) return;
    var ppl = (c.who || []).map(person).filter(function (p) { return p && p.active !== false; });
    var wait = [], fresh = [];
    ppl.forEach(function (p) {
      var st = choreStatus(cid, p.id);
      if (st === 'ok' || !picked(cid, p.id, st)) return;
      if (st === 'wait') wait.push(p.id); else fresh.push(p.id);
    });
    var units = pendingUnits().filter(function (u) { return u.cid === cid && u.entries.some(function (e) { return wait.indexOf(e.pid) >= 0; }); });
    var names = wait.concat(fresh).map(pname);
    if (units.length) queueDecision(units, 'approved', c.name + ' (' + wait.map(pname).join(', ') + ')');
    if (fresh.length) {
      if (c.bountyCents > 0) {
        var sh = {}, each = Math.floor(100 / fresh.length), left = 100 - each * fresh.length;
        fresh.forEach(function (pid, i) { sh[pid] = each + (i === 0 ? left : 0); });
        addQuest(c, sh, S.date);
      } else saveEntries(fresh.map(function (pid) { return newEntry(pid, S.date, c, levelExtra(c, S.chLv[cid] || 0)); })).catch(fail);
    }
    Object.keys(S.chPick).forEach(function (k) { if (k.indexOf(cid + '|') === 0) delete S.chPick[k]; });
    if (names.length) toast('Approved ' + c.name + ': ' + names.join(', '));
    schedule();
  }
  function renderPassBox(pid) {
    var box = $('#passBox'); if (!box || !window.ADV) return;
    if (isAdult(pid)) { box.innerHTML = ''; return; }
    var p = ADV.passInfo(pid), hs = p.house, vac = p.vacation, prog = window.Pets && Pets.progressHtml ? Pets.progressHtml(pid) : '';
    if (!hs.total && !vac) { box.innerHTML = prog; return; }
    box.innerHTML = prog + '<div class="passline' + (p.has ? ' ok' : '') + (hs.clean ? ' shine' : '') + '">' +
      (vac ? '<strong>Vacation mode.</strong> Travel chores only, and adventures are open all day.' :
        (p.has ? '<strong>' + (p.golden ? 'Golden Adventure Pass!' : 'Adventure Pass earned!') + '</strong> ' + p.left + ' minutes today.' :
          '<strong>Adventure Pass:</strong> ' + p.done + ' of ' + p.need + ' big jobs approved.') +
        ' <span class="note">House clean: ' + hs.done + '/' + hs.total + (hs.clean ? ', rare egg hunting is on!' : '') + '</span>') + '</div>';
  }
  function renderQuestBox() {
    var box = $('#questBox'); if (!box) return;
    var q = S.quest, c = q && find(S.chores, function (x) { return x.id === q.cid; });
    if (!c) { box.innerHTML = ''; return; }
    var total = 0; Object.keys(q.shares).forEach(function (k) { total += q.shares[k]; });
    var ps = activePeople().filter(function (p) { return (c.who || []).indexOf(p.id) >= 0 || q.shares[p.id]; });
    box.innerHTML = '<div class="card attn"><h2>Bounty: ' + esc(c.name) + '</h2>' +
      '<p class="note">' + money(c.bountyCents) + ' plus ' + c.pts + ' chore coins. If others helped, split it by how much of the work each person did.</p>' +
      '<div class="list">' + ps.map(function (p) {
        var v = q.shares[p.id] || 0;
        return '<div class="row' + (v ? ' done' : '') + '"><span class="dot ' + pCls(p) + '" style="margin-right:8px"></span><div class="rname">' + esc(p.name) +
          (v ? '<div class="meta note">' + money(Math.floor(c.bountyCents * v / 100)) + '</div>' : '') + '</div>' +
          '<div class="step"><button type="button" data-act="qshare" data-pid="' + esc(p.id) + '" data-d="-10"' + (v ? '' : ' disabled') + ' aria-label="Less for ' + esc(p.name) + '">&minus;</button>' +
          '<span class="n" style="min-width:48px">' + v + '%</span><button type="button" class="plus" data-act="qshare" data-pid="' + esc(p.id) + '" data-d="10"' + (total >= 100 ? ' disabled' : '') + ' aria-label="More for ' + esc(p.name) + '">+</button></div></div>';
      }).join('') + '</div>' +
      '<p class="mono' + (total === 100 ? '' : ' warn-text') + '" style="margin:0">Total ' + total + '%' + (total === 100 ? '' : ' (needs to be 100%)') + '</p>' +
      '<div class="wrap"><button class="btn primary" type="button" data-act="qsave"' + (total === 100 ? '' : ' disabled') + '>Log it</button><button class="btn" type="button" data-act="qcancel">Cancel</button></div></div>';
  }
  /* "Gives": filter chores by what they earn in the pet game */
  var GIVE_ORDER = ['food', 'clean', 'rest', 'energy', 'any'], GIVE_CHIP = { food: 'Food coins', clean: 'Clean coins', rest: 'Tuck-ins', energy: 'Play time', any: 'Needs most' };
  var GIVE_RW = { food: 'food', clean: 'clean', rest: 'tuck', energy: 'play', any: 'any' };
  function gives(c, k) { return rewardsOf(c)[GIVE_RW[k]] > 0; }
  function givesChips(list) {
    var el = $('#gives'); if (!el) return list;
    var per = {}; list.forEach(function (c) { GIVE_ORDER.forEach(function (k) { if (gives(c, k)) per[k] = (per[k] || 0) + 1; }); });
    if (S.give && !per[S.give]) S.give = '';
    var ks = GIVE_ORDER.filter(function (k) { return per[k]; });
    el.innerHTML = ks.length ? '<span class="gives-l">Gives</span>' + ks.map(function (k) {
      return '<button type="button" class="cat gv-' + k + '" data-act="give" data-k="' + k + '" aria-pressed="' + (S.give === k) + '"><i class="gv-dot"></i>' + GIVE_CHIP[k] + '<small>' + per[k] + '</small></button>';
    }).join('') : '';
    return S.give ? list.filter(function (c) { return gives(c, S.give); }) : list;
  }
  /* the pet rewards as little tags (chore coins show on the right of the row) */
  function giveTag(c) {
    var r = rewardsOf(c), h = '', lv = levelsOf(c);
    function t(k, x) { h += '<span class="tag gv gv-' + k + '"><i class="gv-dot"></i>' + x + '</span>'; }
    if (r.food) t('food', '+' + r.food + ' food');
    if (r.clean) t('clean', '+' + r.clean + ' clean');
    if (r.tuck) t('rest', r.tuck === 100 ? 'Tuck-in' : pctTxt(r.tuck, 'tuck-in', 'tuck-ins'));
    if (r.play) t('energy', r.play === 100 ? 'Play' : pctTxt(r.play, 'play', 'plays'));
    if (r.any) t('any', r.any === 100 ? 'Needs most' : r.any + '% needs most');
    if (lv) h += '<span class="tag plain" title="' + esc(lv.map(function (x) { return x.n; }).join(' / ')) + '">Rated</span>';
    return h;
  }
  /* graded chore: pick how it went before it is logged */
  function levelPickHtml(c, pid) {
    var lv = levelsOf(c) || DEFAULT_LEVELS, r = rewardsOf(c), pts = Number(c.pts) || 0;
    return '<li class="lvpick"><div class="lv-q">How did <strong>' + esc(c.name) + '</strong> go' + (S.admin ? ' for ' + esc(pname(pid)) : '') + '?</div><div class="lv-btns">' + lv.map(function (x, i) {
      return '<button type="button" class="btn lv lv-' + Math.min(i, 3) + '" data-act="lvPick" data-cid="' + esc(c.id) + '" data-i="' + i + '"><b>' + esc(x.n) + '</b><small>' + rwText(Math.round(pts * x.p / 100), scaleRw(r, x.p)) +
        (c.hideLv && c.hideLv === x.n ? ' &middot; your pet hides under the bed' : '') + '</small></button>';
    }).join('') + '</div><button class="btn small" type="button" data-act="lvCancel">Cancel</button></li>';
  }
  function rowHtml(c, x, pid) {
    var n = x ? x.a + x.p : 0, tags = giveTag(c);
    if (c.bountyCents > 0) tags += '<span class="tag bounty">' + money(c.bountyCents) + ' bounty</span>';
    if (c.major && window.ADV && ADV.bigJobsToday().indexOf(c) >= 0) tags += '<span class="tag big">Big job</span>';
    var full = pid && !S.admin && freqFull(pid, c, S.date), fq = limOf(c);
    if (full) { var by = c.shared ? sharedBy(c, S.date).filter(function (x) { return x !== pid; }) : []; tags += '<span class="tag ok">' + (by.length ? 'Done by ' + esc(by.map(pname).join(' & ')) : 'Done ' + (fq.per === 'd' ? 'for today' : 'this week')) + '</span>'; }
    if (S.admin && daysOf(c)) tags += '<span class="tag plain">' + esc(daysText(daysOf(c))) + '</span>';
    if (S.admin && c.shared) tags += '<span class="tag plain">Shared</span>';
    if (x) {
      if (x.p) tags += '<span class="tag pend">' + x.p + ' waiting</span>';
      if (x.a) tags += '<span class="tag ok">' + x.a + ' approved</span>';
      if (x.r) tags += '<span class="tag no">' + x.r + ' rejected</span>';
    }
    var ln = S.admin && pid && !n ? lastNudge(c.id, pid) : null;
    if (ln) tags += '<span class="tag plain">' + nudgeNote(ln) + '</span>';
    var pick = S.lvPick && S.lvPick.cid === c.id && S.lvPick.pid === pid ? levelPickHtml(c, pid) : '';
    return '<li class="row' + (n ? ' done' : '') + '"><div class="rname">' + esc(c.name) + (tags ? '<div class="meta">' + tags + '</div>' : '') + '</div>' +
      ptsBadge(c.pts, !!levelsOf(c)) + (S.admin && pid && !n ? bellBtn(c.id, pid, pname(pid)) : '') +
      '<div class="step"><button type="button" data-act="dec" data-cid="' + esc(c.id) + '" aria-label="Remove one: ' + esc(c.name) + '"' + (x && (x.p || (S.admin && x.a)) ? '' : ' disabled') + '>&minus;</button>' +
      '<span class="n' + (n ? '' : ' zero') + '">' + n + '</span>' +
      '<button type="button" class="plus" data-act="inc" data-cid="' + esc(c.id) + '" aria-label="Log: ' + esc(c.name) + '"' + (full ? ' disabled' : '') + '>+</button></div></li>' + pick;
  }
  function updateLogList(pid) {
    if (S.admin && S.logMode === 'chore') { updateChoreBoard(); return; }
    var ul = $('#logList'); if (!ul) return;
    pid = pid || logTarget();
    var cnt = {}, used = {};
    S.entries.forEach(function (e) {
      if (e.pid !== pid) return;
      if (e.status !== 'rejected') used[e.cid] = (used[e.cid] || 0) + 1;
      if (e.date === S.date) {
        var x = cnt[e.cid] || (cnt[e.cid] = { a: 0, p: 0, r: 0 });
        if (e.status === 'approved') x.a++; else if (e.status === 'pending') x.p++; else x.r++;
      }
    });
    var vac = window.ADV && ADV.onVacation();
    var mine = S.chores.filter(function (c) { return c.active !== false && (c.who || []).indexOf(pid) >= 0 && vacShow(c, vac) && dayOk(c, S.date); });
    /* kids: chores already done as many times as allowed drop out of the list (a "Done" link brings them back) */
    var doneHid = S.admin ? [] : mine.filter(function (c) { return freqFull(pid, c, S.date); });
    if (doneHid.length && !S.showDone) mine = mine.filter(function (c) { return doneHid.indexOf(c) < 0; });
    var cats = catList(mine);
    if (S.cat !== 'all' && S.cat !== '$' && cats.indexOf(S.cat) < 0) S.cat = 'all';
    var per = {}; mine.forEach(function (c) { var n = catName(c); per[n] = (per[n] || 0) + 1; });
    var bounties = mine.filter(function (c) { return c.bountyCents > 0; }).length;
    $('#cats').innerHTML = cats.length > 1 || bounties ? ('<button type="button" class="cat" data-act="cat" data-cat="all" aria-pressed="' + (S.cat === 'all') + '">All<small>' + mine.length + '</small></button>' +
      (bounties ? '<button type="button" class="cat" data-act="cat" data-cat="$" aria-pressed="' + (S.cat === '$') + '">Bounties<small>' + bounties + '</small></button>' : '') +
      cats.map(function (n) { return '<button type="button" class="cat" data-act="cat" data-cat="' + esc(n) + '" aria-pressed="' + (S.cat === n) + '">' + esc(n) + '<small>' + per[n] + '</small></button>'; }).join('')) : '';
    var list = givesChips(mine.slice());
    if (S.cat === '$') list = list.filter(function (c) { return c.bountyCents > 0; });
    else if (S.cat !== 'all') list = list.filter(function (c) { return catName(c) === S.cat; });
    var q = trim(S.q).toLowerCase();
    if (q) list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || catName(c).toLowerCase().indexOf(q) >= 0; });
    var doneLink = doneHid.length ? '<li class="done-link"><button type="button" class="btn small" data-act="showDone">' + (S.showDone ? 'Hide' : 'Show') + ' done (' + doneHid.length + ')</button></li>' : '';
    if (!mine.length) { ul.innerHTML = doneHid.length ? '<li class="empty">All done for now. Nice work!</li>' + doneLink : '<li class="empty">No chores are assigned to ' + esc(pname(pid)) + ' yet. A parent can add them in Setup.</li>'; return; }
    if (!list.length) { ul.innerHTML = '<li class="empty">No chores match.</li>' + doneLink; return; }
    function ord(c) { return typeof c.order === 'number' ? c.order : 0; }
    if (S.sort === 'points') list.sort(function (a, b) { return b.pts - a.pts || ord(a) - ord(b); });
    else if (S.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (S.sort === 'used') list.sort(function (a, b) { return (used[b.id] || 0) - (used[a.id] || 0) || ord(a) - ord(b); });
    else list.sort(function (a, b) { return ord(a) - ord(b); });
    if (!(S.sort === 'cat' && S.cat === 'all')) { ul.innerHTML = list.map(function (c) { return rowHtml(c, cnt[c.id], pid); }).join('') + doneLink; return; }
    var html = '';
    catList(list).forEach(function (n) {
      var items = list.filter(function (c) { return catName(c) === n; });
      var done = items.filter(function (c) { var x = cnt[c.id]; return x && x.a + x.p > 0; }).length;
      html += '<li class="grp"><span>' + esc(n) + '</span><span class="mono">' + done + ' / ' + items.length + '</span></li>' +
        items.map(function (c) { return rowHtml(c, cnt[c.id], pid); }).join('');
    });
    ul.innerHTML = html + doneLink;
  }

  /* ----- Approvals: swipe right to approve, left to deny, grouped by chore or by person ----- */
  function pendingUnits() {
    var qd = queuedIds(), units = [], qmap = {};
    S.entries.forEach(function (e) {
      if (e.status !== 'pending' || qd[e.id]) return;
      if (e.questId) {
        if (!qmap[e.questId]) { qmap[e.questId] = { key: 'q' + e.questId, quest: true, entries: [], cid: e.cid, name: e.name, date: e.date, ts: e.ts }; units.push(qmap[e.questId]); }
        qmap[e.questId].entries.push(e);
      } else units.push({ key: 'e' + e.id, quest: false, entries: [e], cid: e.cid, name: e.name, date: e.date, ts: e.ts, pid: e.pid });
    });
    units.forEach(function (u) {
      u.pts = 0; u.cents = 0;
      u.entries.forEach(function (e) { u.pts += e.pts; u.cents += e.bountyCents || 0; });
      if (u.quest) u.entries.sort(function (a, b) { return b.share - a.share; });
    });
    units.sort(function (a, b) { return a.ts - b.ts; });
    return units;
  }
  /* the same chore by the same person on the same day, waiting more than once (a kid tapping + over and over) */
  function dupGroups(units) {
    var by = {}, out = [];
    (units || pendingUnits()).forEach(function (u) { if (u.quest) return; var e = u.entries[0], k = e.pid + '|' + e.cid + '|' + e.date; (by[k] = by[k] || []).push(e); });
    Object.keys(by).forEach(function (k) { if (by[k].length > 1) out.push({ key: k, entries: by[k].sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }) }); });
    return out.sort(function (a, b) { return b.entries.length - a.entries.length; });
  }
  function dupHtml(units) {
    var gs = dupGroups(units); if (!gs.length) return '';
    var extra = 0; gs.forEach(function (g) { extra += g.entries.length - 1; });
    var list = gs.slice(0, 12).map(function (g) {
      var e = g.entries[0], p = person(e.pid);
      return '<div class="srow dup-row"><span class="dot ' + pCls(p) + '"></span><div class="grow">' + esc(pname(e.pid)) + ' &middot; ' + esc(e.name) + '<br><small>' + (e.date === today() ? 'Today' : esc(fmtDate(e.date))) + ' &middot; ' + g.entries.length + ' waiting</small></div>' +
        '<button class="btn small" type="button" data-act="dupKeep" data-k="' + esc(g.key) + '">Keep 1</button>' +
        '<button class="btn small' + (S.armed === 'dupNo' + g.key ? ' danger' : '') + '" type="button" data-act="dupDeny" data-k="' + esc(g.key) + '">' + (S.armed === 'dupNo' + g.key ? 'Tap again' : 'Deny all') + '</button></div>';
    }).join('');
    return '<div class="card attn stack tight dup-card"><h2>Logged more than once</h2><p class="note">' + n0(extra) + ' extra request' + (extra === 1 ? '' : 's') + ': the same chore by the same person on the same day, sent ' +
      'more than once. <b>Keep 1</b> removes the extras and leaves one to approve.</p>' +
      '<button class="btn primary block' + (S.armed === 'dupAll' ? ' danger' : '') + '" type="button" data-act="dupAll">' + (S.armed === 'dupAll' ? 'Tap again to remove ' + n0(extra) + ' extras' : 'Keep 1 of each (remove ' + n0(extra) + ' extras)') + '</button>' +
      '<div class="list">' + list + '</div>' + (gs.length > 12 ? '<p class="note">...and ' + (gs.length - 12) + ' more.</p>' : '') + '</div>';
  }
  /* extras are deleted outright: they were never approved, so nothing has to be taken back */
  function dupRemove(gs) {
    var ops = [];
    gs.forEach(function (g) { g.entries.slice(1).forEach(function (e) { if (e.status === 'pending') ops.push({ t: 'delete', c: 'entries', id: e.id }); }); });
    if (!ops.length) return;
    DB.commit(ops).then(function () { toast('Removed ' + n0(ops.length) + ' extra request' + (ops.length === 1 ? '' : 's') + '.'); }, fail);
  }
  function unitWho(u) { return u.entries.map(function (e) { return pname(e.pid) + (u.quest ? ' ' + e.share + '%' : ''); }).join(', '); }
  function groupUnits(units, mode) {
    var groups = [], gmap = {};
    units.forEach(function (u) {
      var k, title;
      if (mode === 'chore') { k = (u.quest ? 'Q:' : 'C:') + u.cid; title = u.name + (u.quest ? ' (shared)' : ''); }
      else if (u.quest) { k = 'P:@quests'; title = 'Shared bounties'; }
      else { k = 'P:' + u.pid; title = pname(u.pid); }
      if (!gmap[k]) { gmap[k] = { key: k, title: title, units: [], pts: 0, cents: 0, pid: mode === 'person' && !u.quest ? u.pid : null, cid: u.cid }; groups.push(gmap[k]); }
      gmap[k].units.push(u); gmap[k].pts += u.pts; gmap[k].cents += u.cents;
    });
    if (mode === 'chore') {
      var order = catList(S.chores);
      groups.sort(function (a, b) {
        var ca = find(S.chores, function (c) { return c.id === a.cid; }) || {}, cb = find(S.chores, function (c) { return c.id === b.cid; }) || {};
        return (order.indexOf(catName(ca)) - order.indexOf(catName(cb))) || ((ca.order || 0) - (cb.order || 0));
      });
    } else groups.sort(function (a, b) { return a.pid ? (b.pid ? pIndex(person(a.pid)) - pIndex(person(b.pid)) : -1) : 1; });
    return groups;
  }
  function renderApprovals(D) {
    var units = pendingUnits(), mode = S.apMode, t = D.t;
    var h = '<section class="stack approvals"><div class="wrap end"><div class="seg" role="group" aria-label="Group by">' +
      '<button type="button" data-act="apMode" data-m="chore" aria-pressed="' + (mode === 'chore') + '">By chore</button>' +
      '<button type="button" data-act="apMode" data-m="person" aria-pressed="' + (mode === 'person') + '">By person</button></div></div>';
    if (!S.admin) { view.innerHTML = h + locked('Approving') + '</section>'; return; }
    if (!units.length) { view.innerHTML = h + '<p class="note">Nothing is waiting for approval.</p>' + (window.ADV ? ADV.passesAdminHtml() : '') + '</section>'; return; }
    h += dupHtml(units);
    h += '<p class="note swipe-hint">Swipe right to approve, left to deny. Undo appears at the bottom.</p>';
    h += groupUnits(units, mode).map(function (g) {
      var open = !S.apClosed[g.key], n = g.units.length, p = g.pid ? person(g.pid) : null;
      if (n === 1 && mode !== 'chore') return '<div class="agrp single"><div class="list">' + swipeRow(g.units[0], 'full', t) + '</div></div>';
      var names = uniq(g.units.map(function (u) { return mode === 'chore' ? unitWho(u) : u.name; }));
      var sum = names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) + ' more' : '');
      var picked = g.units.filter(function (u) { return !S.apSkip[u.key]; }).length;
      var btn = picked === n ? 'Approve' + (n > 1 ? ' all ' + n : '') : 'Approve ' + picked + ' of ' + n;
      var head = '<div class="agrp-head"><div class="grow"><div class="agrp-title">' + (p ? '<span class="dot ' + pCls(p) + '"></span> ' : '') + esc(g.title) + '</div>' +
        '<div class="note">' + n + ' waiting &middot; ' + n0(g.pts) + ' chore coins' + (g.cents ? ' &middot; ' + money(g.cents) + ' bounty' : '') + '</div>' +
        (open || mode === 'chore' ? '' : '<div class="note agrp-sum">' + esc(sum) + '</div>') + '</div>' +
        '<div class="agrp-btns"><button class="btn small primary" type="button" data-act="apGroup" data-key="' + esc(g.key) + '"' + (picked ? '' : ' disabled') + '>' + btn + '</button>' +
        '<button class="btn small' + (S.armed === 'rjg' + g.key ? ' danger' : '') + '" type="button" data-act="rjGroup" data-key="' + esc(g.key) + '">' + (S.armed === 'rjg' + g.key ? 'Tap again' : 'Deny' + (picked > 1 ? ' ' + picked : '')) + '</button>' +
        '<button class="btn small" type="button" data-act="apToggle" data-key="' + esc(g.key) + '" aria-expanded="' + open + '">' + (open ? 'Hide' : 'Show') + '</button></div></div>';
      var body = !open ? '' : '<div class="list">' + g.units.map(function (u) { return swipeRow(u, mode, t, mode === 'chore'); }).join('') + '</div>';
      return '<div class="agrp">' + head + (mode === 'chore' ? roster(g, t) : '') + body + '</div>';
    }).join('');
    h += '<div class="ap-foot"><button class="btn primary block" type="button" data-act="apRest">Approve remaining (' + units.length + ')</button>' +
      '<button class="btn block' + (S.armed === 'rjRest' ? ' danger' : '') + '" type="button" data-act="rjRest">' + (S.armed === 'rjRest' ? 'Tap again to deny all ' + units.length : 'Deny all (' + units.length + ')') + '</button></div>';
    if (window.ADV) h += ADV.passesAdminHtml();
    view.innerHTML = h + '</section>';
  }
  /* everyone assigned to a chore and where they are with it today: waiting, approved, sent back, or not done yet */
  function roster(g, t) {
    var ch = find(S.chores, function (c) { return c.id === g.cid; });
    var ids = ch && ch.who && ch.who.length ? ch.who : [];
    if (!ids.length) return '';
    var chips = ids.map(function (pid) {
      var p = person(pid); if (!p || p.active === false) return '';
      var es = S.entries.filter(function (e) { return e.cid === g.cid && e.pid === pid && e.date === t; }), st = 'none', lab = 'not yet';
      if (es.some(function (e) { return e.status === 'pending'; })) { st = 'wait'; lab = 'waiting'; }
      else if (es.some(function (e) { return e.status === 'approved'; })) { st = 'ok'; lab = 'approved'; }
      else if (es.some(function (e) { return e.status === 'rejected'; })) { st = 'no'; lab = 'sent back'; }
      return '<span class="rchip st-' + st + ' ' + pCls(p) + '"><span class="dot"></span>' + esc(p.name) + ' <small>' + lab + '</small></span>';
    }).join('');
    return chips ? '<div class="roster" aria-label="Assigned today">' + chips + '</div>' : '';
  }
  function swipeRow(u, mode, t, sel) {
    var who = unitWho(u), label, sub;
    var up = !u.quest ? person(u.entries[0].pid) : null;
    if (mode === 'full') { label = u.name; sub = who + ' &middot; '; }
    else { label = mode === 'chore' ? who : u.name + (u.quest ? ' (' + who + ')' : ''); sub = ''; }
    return '<div class="swipe-wrap"><div class="swipe-bg"><span class="ok">Approve</span><span class="no">Deny</span></div>' +
      '<div class="hrow swipe' + (up ? ' ' + pCls(up) : '') + '" data-key="' + esc(u.key) + '">' +
      (sel ? '<label class="ap-sel" aria-label="Include in Approve"><input type="checkbox" data-act="apSel" data-key="' + esc(u.key) + '"' + (S.apSkip[u.key] ? '' : ' checked') + '></label>' : '') +
      (up && mode !== 'person' ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(label) + apLevelHtml(u) +
      '<small>' + (mode === 'full' ? esc(who) + ' &middot; ' : '') + (u.date === t ? 'Today' : esc(fmtDate(u.date))) + ' ' + esc(fmtTime(u.ts)) + (u.cents ? ' &middot; ' + money(u.cents) + ' bounty' : '') + '</small></div>' +
      '<span class="amt plus">+' + u.pts + '</span>' +
      '<span class="ap-btns"><button class="btn small ok-btn" type="button" data-act="apUnit" data-key="' + esc(u.key) + '" aria-label="Approve">&#10003;</button><button class="btn small danger" type="button" data-act="rjUnit" data-key="' + esc(u.key) + '" aria-label="Deny">&#10005;</button></span></div></div>';
  }
  function apLevelHtml(u) {
    var e = u.entries[0]; if (u.quest || !e || !e.lv) return '';
    var c = find(S.chores, function (x) { return x.id === e.cid; }), lv = levelsOf(c);
    if (!lv) return ' <span class="tag plain">' + esc(e.lv) + '</span>';
    return ' <select class="ap-lv" data-act="apLevel" data-id="' + esc(e.id) + '" aria-label="How it went">' + lv.map(function (x, i) {
      return '<option value="' + i + '"' + (x.n === e.lv ? ' selected' : '') + '>' + esc(x.n) + (c.hideLv === x.n ? ' (pet hides)' : '') + '</option>'; }).join('') + '</select>' +
      (e.hide ? ' <span class="tag no">Pet hides ' + (Number(S.settings.hideHours) || 24) + ' h</span>' : '');
  }
  function unitsFor(key) {
    var units = pendingUnits();
    if (key.charAt(0) === 'q' || key.charAt(0) === 'e') return units.filter(function (u) { return u.key === key; });
    var kind = key.slice(0, 2), rest = key.slice(2);
    return units.filter(function (u) {
      if (kind === 'C:') return !u.quest && u.cid === rest;
      if (kind === 'Q:') return u.quest && u.cid === rest;
      if (rest === '@quests') return u.quest;
      return !u.quest && u.pid === rest;
    });
  }
  function unitLabel(units) {
    if (units.length !== 1) return units.length + ' chores';
    var u = units[0]; return u.name + ' (' + unitWho(u) + ')';
  }
  function decide(key, status) {
    var units = unitsFor(key);
    if (units.length) queueDecision(units, status, unitLabel(units));
  }
  /* swipe gesture, touch and mouse */
  var drag = null, suppressClick = false;
  function pt(e) { var t = e.touches && e.touches[0] || e.changedTouches && e.changedTouches[0] || e; return { x: t.clientX, y: t.clientY }; }
  function swipeStart(e) {
    var el = e.target.closest ? e.target.closest('.swipe') : null;
    if (!el || e.target.closest('button') || e.target.closest('.ap-sel') || e.target.closest('select')) return;
    var p = pt(e); drag = { el: el, x0: p.x, y0: p.y, dx: 0, on: false };
  }
  function swipeMove(e) {
    if (!drag) return;
    var p = pt(e), dx = p.x - drag.x0, dy = p.y - drag.y0;
    if (!drag.on) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) drag.on = true;
      else if (Math.abs(dy) > 12) { drag = null; return; } else return;
    }
    if (e.cancelable) e.preventDefault();
    drag.dx = dx;
    drag.el.style.webkitTransform = drag.el.style.transform = 'translateX(' + dx + 'px)';
    drag.el.parentNode.className = 'swipe-wrap ' + (dx > 0 ? 'go-ok' : 'go-no');
  }
  function swipeEnd() {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.on) return;
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 50);
    var w = d.el.offsetWidth || 300;
    if (Math.abs(d.dx) > w * 0.28) {
      var dir = d.dx > 0 ? 1 : -1;
      d.el.style.transition = 'transform .15s';
      d.el.style.webkitTransform = d.el.style.transform = 'translateX(' + (dir * w) + 'px)';
      setTimeout(function () { decide(d.el.getAttribute('data-key'), dir > 0 ? 'approved' : 'rejected'); }, 150);
    } else {
      d.el.style.transition = 'transform .15s';
      d.el.style.webkitTransform = d.el.style.transform = '';
      setTimeout(function () { d.el.style.transition = ''; if (d.el.parentNode) d.el.parentNode.className = 'swipe-wrap'; }, 160);
    }
  }
  document.addEventListener('touchstart', swipeStart, false);
  document.addEventListener('touchmove', swipeMove, { passive: false });
  document.addEventListener('touchend', swipeEnd, false);
  document.addEventListener('touchcancel', function () { if (drag) { drag.dx = 0; swipeEnd(); } }, false);
  document.addEventListener('mousedown', swipeStart, false);
  document.addEventListener('mousemove', function (e) { if (drag) swipeMove(e); }, false);
  document.addEventListener('mouseup', swipeEnd, false);

  /* ----- Bank ----- */
  var KIND = { coins: 'Chore coins traded', chores: 'Chore earnings', deposit: 'Deposit', withdraw: 'Spent', purchase: 'Purchase', pet: 'Pet reward', bounty: 'Bounty', allowance: 'Allowance', transfer: 'Transfer', adjust: 'Adjustment' };
  function acctMeta(p, D) {
    var x = D.T(p.id), bits = [], rate = Number(S.settings.centsPerPoint) || 0;
    if (isDad(p.id)) bits.push('Allowance account');
    if (!isAdult(p.id) || chorePts(p.id)) bits.push(n0(chorePts(p.id)) + ' chore coins');
    var rq = D.reqPend.filter(function (r) { return r.pid === p.id; }).length;
    if (rq) bits.push(rq + ' request' + (rq > 1 ? 's' : '') + ' waiting');
    return bits.join(' &middot; ');
  }
  function renderBank(D) {
    if (!S.admin) {
      if (isPerson(S.me)) { S.bankPid = S.me; view.innerHTML = accountHtml(D, S.me, false); return; }
      view.innerHTML = locked('The bank'); return;
    }
    if (S.bankPid && isPerson(S.bankPid)) { view.innerHTML = accountHtml(D, S.bankPid, true); return; }
    S.bankPid = null;
    var ps = activePeople().slice().sort(function (a, b) { return isDad(a.id) ? -1 : isDad(b.id) ? 1 : 0; });
    var total = 0; kids().forEach(function (p) { total += Number(p.balance) || 0; });
    var rate = Number(S.settings.centsPerPoint) || 0, dad = person(S.settings.dadPid);
    var h = '<section class="stack"><div class="bank-head"><div class="bank-name">' + esc(bankName()) + '</div>' +
      (dad ? '<div class="bank-sub">' + esc(dad.name) + '’s account</div><div class="bank-big">' + money(dad.balance) + '</div><div class="bank-sub">Everyone else holds ' + money(total) + '</div>'
        : '<div class="bank-sub">Held across ' + ps.length + ' accounts</div><div class="bank-big">' + money(total) + '</div>') + '</div>';
    if (dad && S.settings.allowanceCents > 0) {
      var next = addDays(lastAllowanceDay(Number(S.settings.allowanceDay)), 7);
      h += '<p class="note">Next weekly deposit: ' + money(S.settings.allowanceCents) + ' on ' + esc(fmtDate(next)) + '.</p>';
    }
    h += '<div class="card"><h2>Chore coins</h2><p class="note">Chores pay chore coins (set per chore in Setup). Kids spend them on clothes, toothpaste and balls, buy 10 food or clean coins for ' + (Number(S.settings.swapPrice) || 20) + ', or trade ' +
      n0(Number(S.settings.coinsPerDollar) || 100) + ' of them for $1 at the bank.</p><div class="coin-list">' + kids().map(function (p) {
        return '<span class="coin-chip ' + pCls(p) + '"><span class="dot"></span>' + esc(p.name) + ' <b class="mono">' + n0(chorePts(p.id)) + '</b></span>';
      }).join('') + '</div></div>';
    if (D.reqPend.length) h += '<div><h2>Purchase requests</h2>' + reqList(D.reqPend, true) + '</div>';
    h += '<div><h2>Accounts</h2><ul class="accts">' + ps.map(function (p) {
      var b = Number(p.balance) || 0, meta = acctMeta(p, D);
      return '<li><button type="button" class="acct ' + pCls(p) + '" data-act="acct" data-pid="' + esc(p.id) + '"><span class="dot"></span><span class="nm">' + esc(p.name) + (meta ? '<small>' + meta + '</small>' : '') + '</span>' +
        '<span class="bal' + (b < 0 ? ' neg' : '') + '">' + money(b) + '</span><span class="chev">&rsaquo;</span></button></li>';
    }).join('') + '</ul></div>';
    var recent = S.txns.slice(0, 15);
    h += '<div><h2>Recent activity</h2>' + (recent.length ? '<div class="list ledger">' + recent.map(function (t) { return txRow(t, true); }).join('') + '</div>' : '<p class="note">No money has moved yet.</p>') + '</div>';
    view.innerHTML = h + '</section>';
  }
  var PENCIL = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" fill="#f2c14e" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 7l3 3" stroke="currentColor" stroke-width="1.8"/><path d="M4 20l1-4.5 3 3z" fill="currentColor"/></svg>';
  function txRow(t, showName) {
    var p = person(t.pid), by = t.by ? parentName(t.by) : '', edit = S.admin;
    var h = '<div class="hrow ' + pCls(p) + (S.txEdit === t.id ? ' editing' : '') + '">' + (showName ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(t.memo || KIND[t.kind] || 'Transaction') +
      '<small>' + (showName ? esc(pname(t.pid)) + ' &middot; ' : '') + esc(KIND[t.kind] || '') + ' &middot; ' + esc(fmtShort(t.ts)) + (by && S.admin ? ' &middot; ' + esc(by) : '') +
      (t.edited && S.admin ? ' &middot; edited' + (t.editedBy ? ' by ' + esc(parentName(t.editedBy)) : '') : '') + '</small></div>' +
      '<span class="amt ' + (t.cents >= 0 ? 'plus' : 'minus') + '">' + signed(t.cents) + '</span>' +
      (edit && S.txEdit !== t.id ? '<button class="tx-edit-btn" type="button" data-act="txEdit" data-id="' + esc(t.id) + '" aria-label="Edit this transaction" title="Edit">' + PENCIL + '</button>' : '') + '</div>';
    if (edit && S.txEdit === t.id) {
      var partner = txPartner(t);
      h += '<form class="tx-edit card" data-form="txedit" data-id="' + esc(t.id) + '">' +
        '<div class="wrap end"><label class="field w-lg" for="teMemo"><span>Description</span><input type="text" id="teMemo" maxlength="80" value="' + esc(t.memo || '') + '"></label>' +
        '<label class="field w-sm" for="teAmt"><span>Amount ($)</span><input type="text" id="teAmt" inputmode="decimal" value="' + dollars(Math.abs(t.cents)) + '"></label></div>' +
        '<p class="note">' + (t.cents < 0 ? 'This comes out of' : 'This goes into') + ' ' + esc(pname(t.pid)) + '’s balance, which updates to match.' +
        (partner ? ' It is a transfer, so ' + esc(pname(partner.pid)) + '’s side changes too.' : '') +
        (t.kind === 'payday' || t.kind === 'bounty' ? ' Deleting it does not un-pay the chores.' : '') + '</p>' +
        '<div class="wrap"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-act="txCancel">Cancel</button>' +
        '<button class="btn' + (S.armed === 'txdel' + t.id ? ' danger' : '') + '" type="button" data-act="txDelete" data-id="' + esc(t.id) + '">' + (S.armed === 'txdel' + t.id ? 'Tap again to delete' : 'Delete') + '</button></div></form>';
    }
    return h;
  }
  /* the other half of a transfer: linked by pair id, or (older transfers) same timestamp and opposite amount */
  function txPartner(t) {
    if (t.kind !== 'transfer') return null;
    var pool = S.txns.concat(S.allTx ? S.allTx.list : []), hit = null;
    pool.forEach(function (x) {
      if (hit || x.id === t.id || x.kind !== 'transfer') return;
      if ((t.pair && x.pair === t.pair) || (!t.pair && x.ts === t.ts && x.cents === -t.cents)) hit = x;
    });
    return hit;
  }
  function findTx(id) { var pool = S.txns.concat(S.allTx ? S.allTx.list : []); for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i]; return null; }
  function txSaveOps(t, memo, cents) {
    var delta = cents - t.cents, stamp = { edited: Date.now(), editedBy: S.parent ? S.parent.id : '' };
    var ops = [{ t: 'update', c: 'txns', id: t.id, d: assign({ memo: memo, cents: cents }, stamp) }];
    if (delta) ops.push({ t: 'update', c: 'people', id: t.pid, d: { balance: DB.inc(delta) } });
    var partner = txPartner(t);
    if (partner && delta) {
      ops.push({ t: 'update', c: 'txns', id: partner.id, d: assign({ cents: -cents }, stamp) });
      ops.push({ t: 'update', c: 'people', id: partner.pid, d: { balance: DB.inc(-delta) } });
    }
    return ops;
  }
  function txDeleteOps(t) {
    var ops = [{ t: 'delete', c: 'txns', id: t.id }, { t: 'update', c: 'people', id: t.pid, d: { balance: DB.inc(-t.cents) } }];
    var partner = txPartner(t);
    if (partner) ops.push({ t: 'delete', c: 'txns', id: partner.id }, { t: 'update', c: 'people', id: partner.pid, d: { balance: DB.inc(-partner.cents) } });
    return ops;
  }
  function reqList(list, showName) {
    return '<div class="list">' + list.map(function (r) {
      var p = person(r.pid), owner = r.pid === S.me;
      var stamp = r.status === 'approved' ? '<span class="stamp ok">Approved</span>' : r.status === 'denied' ? '<span class="stamp no">Not this time</span>' : '<span class="stamp pend">Waiting</span>';
      var acts = '';
      if (r.status === 'pending') {
        if (S.admin) {
          var short = (Number(p && p.balance) || 0) < r.cents;
          acts = '<span class="ap-btns"><button class="btn small ' + (S.armed === 'rq' + r.id ? 'danger' : 'primary') + '" type="button" data-act="reqApprove" data-id="' + esc(r.id) + '">' +
            (S.armed === 'rq' + r.id ? 'Approve anyway' : 'Approve') + '</button><button class="btn small" type="button" data-act="reqDeny" data-id="' + esc(r.id) + '">Deny</button></span>' +
            (short ? '<small class="note fullrow">Balance is ' + money(p ? p.balance : 0) + '. Approving goes below zero.</small>' : '');
        } else if (owner) acts = '<button class="btn small" type="button" data-act="reqCancel" data-id="' + esc(r.id) + '">Cancel</button>';
      }
      return '<div class="hrow ' + pCls(p) + '">' + (showName ? '<span class="dot"></span>' : '') + '<div class="desc">' + esc(r.item) +
        '<small>' + (showName ? esc(pname(r.pid)) + ' &middot; ' : '') + esc(fmtShort(r.ts)) + (r.note ? ' &middot; ' + esc(r.note) : '') + '</small></div>' +
        '<span class="amt minus">' + money(r.cents) + '</span>' + stamp + acts + '</div>';
    }).join('') + '</div>';
  }
  /* One account. Kids see it inside the pet game's bank (manage=false); parents reach it from Accounts. */
  function accountHtml(D, pid, manage) {
    var p = person(pid), b = Number(p.balance) || 0, own = pid === S.me;
    var per = Number(S.settings.coinsPerDollar) || 100, cp = chorePts(pid);
    var h = '<section class="stack">' + (manage ? '<div class="wrap"><button class="btn small" type="button" data-act="bankHome">&lsaquo; All accounts</button>' +
      '<button class="btn small" type="button" data-act="logFor" data-pid="' + esc(pid) + '">Log chores for ' + esc(p.name) + '</button></div>' : '') +
      '<div class="bank-head"><div class="bank-name">' + esc(bankName()) + '</div><div class="bank-sub">' + esc(p.name) + '’s account</div>' +
      '<div class="bank-big">' + money(b) + '<small>available</small></div></div>';
    h += '<div class="card coin-card"><div class="row-flex"><span class="grow"><strong>' + n0(cp) + ' chore coins</strong><br><small class="note">Trade ' + per + ' chore coins for $1.00</small></span>' +
      '<button class="btn primary" type="button" data-act="cashIn" data-pid="' + esc(pid) + '"' + (cp >= per ? '' : ' disabled') + '>Trade ' + per + ' for $1</button></div></div>';
    var btns = '', f = S.bankForm;
    if (own && !manage) btns += '<button class="btn' + (f === 'request' ? ' primary' : '') + '" type="button" data-act="bform" data-f="request">Ask to buy something</button>';
    if (manage) {
      btns += '<button class="btn' + (f === 'deposit' ? ' primary' : '') + '" type="button" data-act="bform" data-f="deposit">Deposit</button>' +
        '<button class="btn' + (f === 'withdraw' ? ' primary' : '') + '" type="button" data-act="bform" data-f="withdraw">' + (isDad(pid) ? 'Spend' : 'Withdraw') + '</button>' +
        '<button class="btn' + (f === 'transfer' ? ' primary' : '') + '" type="button" data-act="bform" data-f="transfer">Transfer</button>';
    }
    if (btns) h += '<div class="wrap">' + btns + '</div>';
    if (f === 'request' && own && !manage) {
      h += '<form class="card" data-form="request"><h2>Purchase request</h2>' +
        '<label class="field" for="rqItem"><span>What do you want to buy?</span><input type="text" id="rqItem" maxlength="80" placeholder="Lego set, book, game..."></label>' +
        '<div class="wrap end"><label class="field w-sm" for="rqAmt"><span>Price ($)</span><input type="text" id="rqAmt" inputmode="decimal" placeholder="0.00"></label>' +
        '<label class="field w-lg" for="rqNote"><span>Note (optional)</span><input type="text" id="rqNote" maxlength="120" placeholder="Where to buy it, why you want it"></label></div>' +
        '<div class="wrap"><button class="btn primary" type="submit">Send request</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div>' +
        '<p class="note">A parent will approve or deny it. Approved requests come out of your balance.</p></form>';
    } else if (manage && (f === 'deposit' || f === 'withdraw')) {
      var spend = f === 'withdraw' && isDad(pid);
      h += '<form class="card" data-form="money" data-kind="' + f + '"><h2>' + (f === 'deposit' ? 'Deposit' : spend ? 'Record spending' : 'Withdrawal') + '</h2>' +
        '<div class="wrap end"><label class="field w-sm" for="mAmt"><span>Amount ($)</span><input type="text" id="mAmt" inputmode="decimal" placeholder="0.00"></label>' +
        '<label class="field w-lg" for="mMemo"><span>' + (spend ? 'What was it for?' : 'Memo') + '</span><input type="text" id="mMemo" maxlength="80" placeholder="' + (f === 'deposit' ? 'Birthday money, correction...' : spend ? 'Groceries, gas, lunch...' : 'Cash out, correction...') + '"></label></div>' +
        '<div class="wrap"><button class="btn primary" type="submit">' + (f === 'deposit' ? 'Deposit' : spend ? 'Record' : 'Withdraw') + '</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div></form>';
    } else if (manage && f === 'transfer') {
      var others = activePeople().filter(function (x) { return x.id !== pid; });
      h += '<form class="card" data-form="transfer"><h2>Transfer from ' + esc(p.name) + '</h2>' +
        '<div class="wrap end"><label class="field w-md" for="tTo"><span>To</span><select id="tTo">' + others.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field w-sm" for="tAmt"><span>Amount ($)</span><input type="text" id="tAmt" inputmode="decimal" placeholder="0.00"></label></div>' +
        '<label class="field" for="tMemo"><span>Memo (optional)</span><input type="text" id="tMemo" maxlength="80" placeholder="Spending money, reward..."></label>' +
        '<div class="wrap"><button class="btn primary" type="submit">Transfer</button><button class="btn" type="button" data-act="bform" data-f="">Cancel</button></div></form>';
    }
    var reqs = S.reqs.filter(function (r) { return r.pid === pid; });
    var open = reqs.filter(function (r) { return r.status === 'pending'; });
    var closed = reqs.filter(function (r) { return r.status !== 'pending'; }).slice(0, 5);
    if (open.length || closed.length) h += '<div><h2>Requests</h2>' + reqList(open.concat(closed), false) + '</div>';
    var tx = S.allTx && S.allTx.pid === pid ? S.allTx.list : S.txns.filter(function (t) { return t.pid === pid; });
    h += '<div><h2>Transactions</h2>' + (tx.length ? '<div class="list ledger">' + tx.map(function (t) { return txRow(t, false); }).join('') + '</div>'
      : '<p class="note">No transactions yet.</p>') +
      (!(S.allTx && S.allTx.pid === pid) && tx.length >= 10 ? '<div style="margin-top:10px"><button class="btn small" type="button" data-act="allTx" data-pid="' + esc(pid) + '">Show all transactions</button></div>' : '') + '</div>';
    return h + '</section>';
  }
  function payday() {
    var rate = Number(S.settings.centsPerPoint) || 0;
    if (!rate) { toast('Set how much a point is worth first.', true); return; }
    DB.query({ c: 'entries', where: [['status', '==', 'approved'], ['paid', '==', false]] }).then(function (list) {
      var by = {}, ops = [], paidN = 0, total = 0;
      list.forEach(function (e) { if (!isPerson(e.pid)) return; (by[e.pid] = by[e.pid] || []).push(e); });
      Object.keys(by).forEach(function (pid) {
        var es = by[pid], pts = 0;
        es.forEach(function (e) { pts += e.pts; });
        var cents = Math.round(pts * rate);
        es.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        var span = es[0].date === es[es.length - 1].date ? fmtDate(es[0].date) : fmtDate(es[0].date) + ' to ' + fmtDate(es[es.length - 1].date);
        var t = txOps(pid, cents, 'chores', 'Chores ' + span + ': ' + es.length + ' done, ' + n0(pts) + ' pts', { pts: pts });
        ops = ops.concat(t);
        es.forEach(function (e) { ops.push({ t: 'update', c: 'entries', id: e.id, d: { paid: true, paidTx: t[0].id } }); });
        paidN++; total += cents;
      });
      if (!ops.length) { toast('Nothing to pay.'); return; }
      return DB.commit(ops).then(function () { toast('Paid ' + money(total) + ' to ' + paidN + (paidN > 1 ? ' people' : ' person')); });
    }).catch(fail);
  }

  /* ----- History ----- */
  function histRows() {
    var f = S.hist, t = today(), cut = '';
    if (f.range === '7') cut = addDays(t, -6); else if (f.range === '30') cut = addDays(t, -29); else if (f.range === 'month') cut = t.slice(0, 8) + '01';
    var src = S.entries.concat(f.range === 'all' && S.older ? S.older : []);
    var mineOnly = !S.admin && isPerson(S.me);
    return src.filter(function (e) {
      if (mineOnly && e.pid !== S.me) return false;
      return (f.pid === 'all' || e.pid === f.pid) && (!cut || e.date >= cut) && (f.status === 'all' || e.status === f.status);
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; });
  }
  function renderHistory() {
    var rows = histRows(), f = S.hist;
    var html = (S.admin ? meetingCard() : '') + '<section><h2>Chore history</h2><div class="wrap end">' +
      (S.admin ? '<label class="field w-md" for="hPid"><span>Person</span><select id="hPid" data-hist="pid">' + opt('all', 'Everyone', f.pid) +
        S.people.map(function (p) { return opt(esc(p.id), esc(p.name) + (p.active === false ? ' (archived)' : ''), f.pid); }).join('') + '</select></label>' : '') +
      '<label class="field w-md" for="hRange"><span>Period</span><select id="hRange" data-hist="range">' + opt('7', 'Last 7 days', f.range) + opt('30', 'Last 30 days', f.range) + opt('month', 'This month', f.range) + opt('all', 'Everything', f.range) + '</select></label>' +
      '<label class="field w-md" for="hStatus"><span>Status</span><select id="hStatus" data-hist="status">' + opt('all', 'All', f.status) + opt('pending', 'Waiting', f.status) + opt('approved', 'Approved', f.status) + opt('rejected', 'Rejected', f.status) + '</select></label>' +
      (S.admin ? '<button class="btn" type="button" data-act="csv"' + (rows.length ? '' : ' disabled') + '>Download CSV</button>' : '') + '</div>';
    if (f.range === 'all' && !S.older) html += '<p class="note" style="margin-top:10px">Showing the last ' + LIVE_DAYS + ' days. <button class="btn small" type="button" data-act="older">Load older history</button></p>';
    if (!rows.length) html += '<p class="note" style="margin-top:14px">Nothing logged for this selection yet.</p>';
    else {
      var groups = [], cur = null;
      rows.forEach(function (r) {
        if (!cur || cur.date !== r.date) { cur = { date: r.date, rows: [], sum: 0 }; groups.push(cur); }
        cur.rows.push(r); if (r.status === 'approved') cur.sum += r.pts;
      });
      html += groups.map(function (g) {
        return '<div><div class="day"><span>' + esc(fmtDate(g.date)) + '</span><span class="mono">' + n0(g.sum) + ' chore coins</span></div><div class="list">' +
          g.rows.map(function (r) {
            var p = person(r.pid), key = 'rm' + r.id, acts = '', by = r.decidedBy ? parentName(r.decidedBy) : '';
            var canRm = !r.paid && !r.bountyPaid && (r.status === 'pending' || S.admin);
            if (S.admin && r.status === 'rejected') acts += '<button class="btn small" type="button" data-act="reopen" data-id="' + esc(r.id) + '">Reopen</button>';
            if (canRm) acts += '<button class="btn small' + (S.armed === key ? ' danger' : '') + '" type="button" data-act="rm" data-id="' + esc(r.id) + '">' + (S.armed === key ? 'Confirm remove' : 'Remove') + '</button>';
            return '<div class="hrow ' + pCls(p) + (r.status === 'rejected' ? ' rej' : '') + '"><span class="dot"></span><div class="desc">' + esc(r.name) + (r.lv ? ' <span class="tag plain">' + esc(r.lv) + '</span>' : '') + (r.questId ? ' (' + r.share + '%)' : '') +
              '<small>' + esc(pname(r.pid)) + ' &middot; ' + esc(fmtTime(r.ts)) + (by && r.status !== 'pending' ? ' &middot; ' + (r.status === 'approved' ? 'approved' : 'denied') + ' by ' + esc(by) : '') +
              (r.bountyCents ? ' &middot; ' + money(r.bountyCents) + ' bounty' : '') + (r.paid ? ' &middot; paid' : '') + '</small></div>' + tagFor(r.status) +
              '<span class="amt plus">+' + r.pts + '</span>' + acts + '</div>';
          }).join('') + '</div></div>';
      }).join('');
    }
    view.innerHTML = html + '</section>';
  }
  /* ================= family meeting =================
   * A meeting is a marker (meetings/{id}: ts, date, by, notes, snap). The report covers everything since the chosen marker;
   * snap holds each kid's pet level, stage, tickets, Mess Defense round and balance so the report can show what changed. */
  function mtgLoadList() {
    return DB.query({ c: 'meetings', orderBy: ['ts', 'desc'], limit: 25 }).then(function (l) {
      l.sort(function (a, b) { return b.ts - a.ts; }); S.mtgList = l; return l;
    });
  }
  function meetingCard() {
    if (!S.mtgList) { if (!S.mtgListLoading) { S.mtgListLoading = true; mtgLoadList().then(schedule, function () { S.mtgList = []; }); } }
    var last = (S.mtgList || [])[0], days = last ? Math.max(0, Math.round((parseD(today()) - parseD(last.date)) / 864e5)) : 0;
    return '<section class="card mtg-card"><div class="row-flex"><div class="grow"><h2>Family meeting</h2><p class="note">' +
      (last ? 'Everything since your last meeting on ' + esc(fmtDate(last.date)) + ' (' + (days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago') + ').'
        : 'Chores, money, pets and games since the last meeting. Start your first meeting to set the marker.') + '</p>' + agendaTeaser() + '</div>' +
      '<button class="btn primary" type="button" data-act="mtgOpen">Open report</button></div></section>';
  }
  function mtgSince() {
    var m = S.mtg, list = S.mtgList || [], k = m.since;
    if (k === '7' || k === '30') return { ts: parseD(addDays(today(), -Number(k))).getTime(), label: 'Last ' + k + ' days', snap: null };
    var mt = find(list, function (x) { return x.id === k; }) || list[0];
    if (!mt) return { ts: parseD(addDays(today(), -30)).getTime(), label: 'Last 30 days', snap: null, none: true };
    return { ts: mt.ts, label: 'Since the meeting on ' + fmtDate(mt.date), date: mt.date, snap: mt.snap || null, meeting: mt };
  }
  function mtgLoad() {
    var m = S.mtg, tok = m.tok = (m.tok || 0) + 1; m.loading = true; schedule();
    var sn = mtgSince(), from = dstr(new Date(sn.ts));
    Promise.all([
      DB.query({ c: 'entries', where: [['date', '>=', from]] }),
      DB.query({ c: 'txns', where: [['ts', '>=', sn.ts]] })
    ]).then(function (r) {
      if (S.mtg !== m || m.tok !== tok) return;
      m.entries = r[0].filter(function (e) { return e.ts ? e.ts >= sn.ts : e.date >= from; });
      m.txns = r[1]; m.loading = false; schedule();
    }, function (e) { m.loading = false; fail(e); });
  }
  function mtgSnap() {
    var snap = {};
    S.people.forEach(function (p) {
      if (p.active === false) return;
      var d = (S.pets || {})[p.id] || {}, pet = d.pet || {};
      snap[p.id] = { balance: Number(p.balance) || 0, level: Number(pet.level) || 0, stage: Number(pet.stage) || 0, sp: pet.sp || '', name: pet.name || '',
        tickets: Number(d.tickets) || 0, def: Number(d.defLevel) || 0, bed: Number(d.bedLevel) || 0, house: (d.house || []).length };
    });
    return snap;
  }
  function mtgData() {
    var m = S.mtg, sn = mtgSince(), snap = sn.snap || {}, out = [], adults = [];
    var nDays = Math.max(1, Math.round((parseD(today()) - parseD(dstr(new Date(sn.ts)))) / 864e5));
    activePeople().forEach(function (p) {
      var es = (m.entries || []).filter(function (e) { return e.pid === p.id; });
      var ok = es.filter(function (e) { return e.status === 'approved'; }), pts = 0, byName = {}, dayset = {};
      ok.forEach(function (e) { var nm = e.name + (e.lv ? ' (' + e.lv + ')' : ''); pts += Number(e.pts) || 0; byName[nm] = (byName[nm] || 0) + 1; dayset[e.date] = 1; });
      var top = Object.keys(byName).sort(function (a, b) { return byName[b] - byName[a]; }).slice(0, 3).map(function (k) { return { name: k, n: byName[k] }; });
      var row = { p: p, done: ok.length, pts: pts, waiting: es.filter(function (e) { return e.status === 'pending'; }).length,
        back: es.filter(function (e) { return e.status === 'rejected'; }).length, days: Object.keys(dayset).length, top: top };
      if (isAdult(p.id)) { if (es.length) adults.push(row); return; }
      var tx = (m.txns || []).filter(function (t) { return t.pid === p.id; }), inC = 0, outC = 0, spent = [];
      tx.forEach(function (t) { var c = Number(t.cents) || 0; if (c >= 0) inC += c; else { outC += c; spent.push(t); } });
      spent.sort(function (a, b) { return a.cents - b.cents; });
      var d = (S.pets || {})[p.id] || {}, pet = d.pet || null, was = snap[p.id] || null;
      row.money = { inC: inC, outC: outC, bal: Number(p.balance) || 0, spent: spent.slice(0, 3) };
      row.pet = pet; row.was = was;
      row.lv = pet && was && was.sp === pet.sp ? (Number(pet.level) || 0) - was.level : null;
      row.evolved = !!(pet && was && was.sp === pet.sp && (pet.stage || 0) > was.stage);
      row.newPet = !!(pet && was && was.sp && was.sp !== pet.sp);
      row.tickets = Number(d.tickets) || 0; row.dTickets = was ? row.tickets - was.tickets : null;
      row.def = Number(d.defLevel) || 0; row.dDef = was ? row.def - was.def : null;
      row.bed = Number(d.bedLevel) || 0; row.dBed = was ? row.bed - (was.bed || 0) : null;
      row.movedIn = (d.house || []).filter(function (h) { return h.retired && h.retired >= dstr(new Date(sn.ts)); });
      out.push(row);
    });
    return { sn: sn, kids: out, adults: adults, nDays: nDays };
  }
  function mtgShout(kids) {
    function best(f, min) { var b = null; kids.forEach(function (r) { var v = f(r); if (v != null && v >= (min || 1) && (!b || v > f(b))) b = r; }); return b; }
    var sh = [], a = best(function (r) { return r.done; }), b = best(function (r) { return r.pts; }), c = best(function (r) { return r.lv; }), d = best(function (r) { return r.days; }, 2);
    if (a) sh.push(['Most chores', a.p.name + ' (' + a.done + ')']);
    if (b && b !== a) sh.push(['Most chore coins', b.p.name + ' (' + n0(b.pts) + ')']);
    if (c) sh.push(['Biggest pet glow-up', c.p.name + ' (+' + c.lv + ' level' + (c.lv === 1 ? '' : 's') + ')']);
    if (d && d !== a) sh.push(['Most days helping', d.p.name + ' (' + d.days + ')']);
    kids.forEach(function (r) { if (r.evolved) sh.push(['Evolved!', r.p.name + '’s ' + (r.pet.name || 'pet') + ' is now a ' + (window.Pets ? Pets.speciesName(r.pet) : 'new form')]); });
    return sh;
  }
  function delta(n, unit) { return n == null ? '' : n > 0 ? ' <b class="up">(+' + n0(n) + (unit || '') + ')</b>' : n < 0 ? ' <span class="note">(' + n0(n) + (unit || '') + ')</span>' : ''; }
  function renderMeeting() {
    var m = S.mtg, list = S.mtgList || [];
    if (m.since != null && !m.entries && !m.loading) mtgLoad();
    var sel = '<label class="field grow" for="mtgSince"><span>Since</span><select id="mtgSince" data-mtg="since">' +
      list.map(function (x, i) { return opt(esc(x.id), (i === 0 ? 'Last meeting, ' : 'Meeting, ') + esc(fmtDate(x.date)), m.since || (list[0] && list[0].id)); }).join('') +
      opt('7', 'Last 7 days', m.since) + opt('30', 'Last 30 days', m.since) + '</select></label>';
    var h = '<section class="mtg"><div class="row-flex"><button class="btn small" type="button" data-act="mtgClose">&larr; History</button></div>' +
      '<h2 style="margin-top:10px">Family meeting</h2><div class="wrap end">' + sel + '</div>' + mtgAgendaCard();
    if (m.since == null || m.loading || !m.entries) { view.innerHTML = h + '<p class="note" style="margin-top:14px">Gathering everything up&hellip;</p></section>'; return; }
    var D = mtgData(), sn = D.sn, kids = D.kids, tot = { done: 0, pts: 0, inC: 0, lv: 0 };
    kids.concat(D.adults).forEach(function (r) { tot.done += r.done; tot.pts += r.pts; });
    kids.forEach(function (r) { tot.inC += r.money.inC; if (r.lv > 0) tot.lv += r.lv; });
    h += '<p class="note" style="margin-top:8px">' + esc(sn.label) + ' &middot; ' + D.nDays + ' day' + (D.nDays === 1 ? '' : 's') + (sn.none ? ' (no meeting yet)' : '') + '</p>';
    var lastTalk = sn.meeting && sn.meeting.agenda || [];
    if (sn.meeting && (sn.meeting.notes || lastTalk.length)) h += '<div class="card mtg-notes"><div class="grp" style="margin:-14px -14px 10px;border-radius:var(--r) var(--r) 0 0">From that meeting</div>' +
      (lastTalk.length ? '<p class="note" style="margin:0 0 4px">Talked about</p><ul class="mtg-talked">' + lastTalk.map(function (x) { return '<li>' + esc(x.text) + '</li>'; }).join('') + '</ul>' : '') +
      (sn.meeting.notes ? '<p style="white-space:pre-wrap;margin:0">' + esc(sn.meeting.notes) + '</p>' : '') + '</div>';
    h += '<div class="mtg-tot">' + [[n0(tot.done), 'chores done'], [n0(tot.pts), 'chore coins'], [money(tot.inC), 'earned by kids'], [sn.snap ? n0(tot.lv) : '&ndash;', 'pet levels']].map(function (x) {
      return '<div class="card"><div class="big-num">' + x[0] + '</div><div class="note">' + x[1] + '</div></div>'; }).join('') + '</div>';
    var sh = mtgShout(kids);
    if (sh.length) h += '<div class="card mtg-shout"><h3>Shout-outs</h3>' + sh.map(function (x) { return '<div class="hrow"><span class="tag">' + esc(x[0]) + '</span><span class="grow">' + esc(x[1]) + '</span></div>'; }).join('') + '</div>';
    h += kids.map(function (r) {
      var p = r.p, pet = r.pet, parts = [];
      var head = '<div class="mtg-kid-head"><span class="dot ' + pCls(p) + '"></span><strong class="grow">' + esc(p.name) + '</strong><span class="mono">' + n0(r.pts) + ' chore coins</span></div>';
      var chores = '<div class="mtg-line"><b>Chores</b> ' + (r.done ? r.done + ' done on ' + r.days + ' day' + (r.days === 1 ? '' : 's') : 'none yet') +
        (r.waiting ? ' &middot; ' + r.waiting + ' waiting' : '') + (r.back ? ' &middot; ' + r.back + ' sent back' : '') +
        (r.top.length ? '<br><small class="note">' + r.top.map(function (t) { return esc(t.name) + (t.n > 1 ? ' &times;' + t.n : ''); }).join(', ') + '</small>' : '') + '</div>';
      var mon = '<div class="mtg-line"><b>Money</b> ' + (r.money.inC ? '<span class="amt plus">+' + money(r.money.inC) + '</span> in' : 'nothing in') + (r.money.outC ? ' &middot; <span class="amt">' + money(r.money.outC) + '</span> out' : '') +
        ' &middot; now ' + money(r.money.bal) + (r.money.spent.length ? '<br><small class="note">Spent on: ' + r.money.spent.map(function (t) { return esc(t.memo || KIND[t.kind] || 'something') + ' ' + money(-t.cents); }).join(', ') + '</small>' : '') + '</div>';
      var petl = '';
      if (pet) {
        petl = '<div class="mtg-line mtg-pet"><span class="mini-pet">' + (window.Pets ? Pets.petSvg(pet, 'happy') : '') + '</span><div class="grow"><b>' + esc(pet.name || 'Pet') + '</b> the ' + esc(window.Pets ? Pets.speciesName(pet) : '') +
          ' &middot; Lv ' + (pet.level || 0) + delta(r.lv) + (r.evolved ? ' <span class="tag">Evolved!</span>' : '') + (r.newPet ? ' <span class="tag">New pet!</span>' : '') +
          '<br><small class="note">' + n0(r.tickets) + ' tickets' + delta(r.dTickets) + (r.def ? ' &middot; Mess Defense round ' + r.def + delta(r.dDef) : '') + (r.bed ? ' &middot; Bedtime Defense night ' + r.bed + delta(r.dBed) : '') +
          (r.movedIn.length ? ' &middot; moved into the house: ' + r.movedIn.map(function (x) { return esc(x.name); }).join(', ') : '') + '</small></div></div>';
      }
      return '<div class="card mtg-kid ' + pCls(p) + '">' + head + chores + mon + petl + '</div>';
    }).join('');
    if (D.adults.length) h += '<div class="card"><h3>Grown-ups pitched in</h3>' + D.adults.map(function (r) { return '<div class="hrow"><span class="dot ' + pCls(r.p) + '"></span><span class="grow" style="margin-left:8px">' + esc(r.p.name) + '</span><span class="mono">' + r.done + ' chore' + (r.done === 1 ? '' : 's') + '</span></div>'; }).join('') + '</div>';
    h += '<div class="card stack tight"><h3>Wrap up</h3><label class="field" for="mtgNotes"><span>Notes and agreements for this meeting (optional)</span><textarea id="mtgNotes" rows="3" placeholder="e.g. Xander takes over trash night. Pizza if everyone hits 100 points.">' + esc(m.notes || '') + '</textarea></label>' +
      '<p class="note">Starting a new meeting saves these notes and today’s levels and balances, so the next report starts from here.</p>' +
      '<div class="wrap"><button class="btn" type="button" data-act="mtgShare">Share summary</button><button class="btn primary' + (S.armed === 'mtgStart' ? ' danger' : '') + '" type="button" data-act="mtgStart">' + (S.armed === 'mtgStart' ? 'Tap again to start' : 'Start new meeting') + '</button></div></div>';
    view.innerHTML = h + '</section>';
  }
  function mtgText() {
    var D = mtgData(), t = ['Family meeting, ' + fmtDate(today()), D.sn.label + ' (' + D.nDays + ' days)', ''];
    var ag = agendaSorted(), talked = ag.filter(function (x) { return x.talked; }), left = ag.filter(function (x) { return !x.talked; });
    if (talked.length) { t.push('Talked about:'); talked.forEach(function (x) { t.push('• ' + x.text); }); t.push(''); }
    if (left.length) { t.push('Still to talk about:'); left.forEach(function (x) { t.push('• ' + x.text); }); t.push(''); }
    mtgShout(D.kids).forEach(function (x) { t.push('★ ' + x[0] + ': ' + x[1]); });
    D.kids.forEach(function (r) {
      if (!r.done && !r.money.inC && !r.money.outC && !r.pet) return;
      t.push('', r.p.name + ': ' + r.done + ' chore' + (r.done === 1 ? '' : 's') + ', ' + n0(r.pts) + ' chore coins' + (r.money.inC ? ', +' + money(r.money.inC) : '') + (r.money.outC ? ', ' + money(r.money.outC) + ' spent' : '') + ', balance ' + money(r.money.bal));
      if (r.pet) t.push('  ' + (r.pet.name || 'Pet') + ' Lv ' + (r.pet.level || 0) + (r.lv ? ' (+' + r.lv + ')' : '') + (r.evolved ? ', evolved!' : '') + ', ' + r.tickets + ' tickets');
    });
    if (S.mtg.notes) t.push('', 'Notes: ' + S.mtg.notes);
    return t.join('\n');
  }
  function mtgShare() {
    var el = $('#mtgNotes'); if (el) S.mtg.notes = el.value;
    shareText('Family meeting', mtgText(), 'Summary copied. Paste it into your family chat.');
  }
  /* the phone's share sheet when there is one, otherwise copy to the clipboard */
  function shareText(title, txt, copied) {
    if (navigator.share) { navigator.share({ title: title, text: txt }).catch(function () {}); return; }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); toast(ok ? copied : 'Could not copy on this device.', !ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast(copied); }, fallback);
    else fallback();
  }
  function mtgStart() {
    var el = $('#mtgNotes'); if (el) S.mtg.notes = el.value;
    var ag = agendaSorted(), talked = ag.filter(function (x) { return x.talked; }), left = ag.length - talked.length;
    var id = DB.newId('meetings'), rec = { ts: Date.now(), date: today(), by: S.parent ? S.parent.id : '', notes: trim(S.mtg.notes || ''), snap: mtgSnap(),
      agenda: talked.map(function (x) { return { text: x.text, by: x.by || '' }; }) };
    DB.commit([{ t: 'set', c: 'meetings', id: id, d: rec }].concat(talked.map(function (x) { return { t: 'delete', c: 'agenda', id: x.id }; }))).then(function () {
      toast('New meeting started.' + (talked.length ? ' ' + talked.length + ' topic' + (talked.length === 1 ? '' : 's') + ' saved with it.' : '') + (left ? ' ' + left + ' topic' + (left === 1 ? '' : 's') + ' left for next time.' : ' The next report picks up from here.'));
      S.mtg = { open: false }; S.mtgList = null; S.mtgListLoading = false; go();
    }, fail);
  }
  function downloadCsv() {
    var rows = histRows();
    function q(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var csv = ['date,person,chore,level,category,chore_coins,status,decided_by,bounty,paid'].concat(rows.map(function (r) {
      return [r.date, pname(r.pid), r.name, r.lv || '', r.cat, r.pts, r.status, parentName(r.decidedBy), r.bountyCents ? dollars(r.bountyCents) : '', r.paid ? 'yes' : 'no'].map(q).join(',');
    })).join('\n');
    try {
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'chore-history-' + today() + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { toast('This browser cannot download files.', true); }
  }

  /* ================= lists: shopping and family meeting topics =================
   * shop/{id}: text, by (parent id), ts, got, gotTs, gotBy. Bought items wait at the bottom until Clear.
   * meta/shop: recent (things bought lately, newest first) for the "Again?" buttons.
   * agenda/{id}: text, by, ts, talked. Ticked off in the family meeting report; Start new meeting saves the
   * talked-about topics with the meeting and keeps the rest for next time. */
  function lc(s) { return trim(s).toLowerCase(); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function byLine(x) { var n = parentName(x.by) || (person(x.by) || {}).name || ''; return (n ? esc(n) + ' &middot; ' : '') + esc(fmtShort(x.ts)); }
  function me4() { return S.parent ? S.parent.id : (S.me || ''); }
  function shopSorted() {
    var a = S.shop || [];
    return { open: a.filter(function (x) { return !x.got; }).sort(function (p, q) { return (p.ts || 0) - (q.ts || 0); }),
      got: a.filter(function (x) { return x.got; }).sort(function (p, q) { return (q.gotTs || 0) - (p.gotTs || 0); }) };
  }
  function agendaSorted() { return (S.agenda || []).slice().sort(function (p, q) { return (p.ts || 0) - (q.ts || 0); }); }
  function delBtn(act, x) {
    var armed = S.armed === act + x.id;
    return '<button type="button" class="btn small li-del' + (armed ? ' danger' : '') + '" data-act="' + act + '" data-id="' + esc(x.id) + '" aria-label="Remove ' + esc(x.text) + '">' + (armed ? 'Remove?' : '&times;') + '</button>';
  }
  function shopRow(x) {
    return '<li class="li-row' + (x.got ? ' got' : '') + '"><button type="button" class="li-tick' + (x.got ? ' on' : '') + '" data-act="shopTick" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.got + '" aria-label="' + (x.got ? 'Put back on the list: ' : 'Got it: ') + esc(x.text) + '">' + (x.got ? '&#10003;' : '') + '</button>' +
      '<span class="grow li-text"><span class="li-name">' + esc(x.text) + '</span><small>' + byLine(x) + '</small></span>' + delBtn('shopDel', x) + '</li>';
  }
  function shopListHtml() {
    var s = shopSorted(), h = s.open.length ? '<ul class="li-list">' + s.open.map(shopRow).join('') + '</ul>' : '<p class="note">' + (S.ready.shop ? 'Nothing on the list.' : 'Loading&hellip;') + '</p>';
    if (s.got.length) h += '<div class="row-flex li-cart"><strong class="grow">In the cart (' + s.got.length + ')</strong><button class="btn small" type="button" data-act="shopClear">Clear</button></div><ul class="li-list">' + s.got.map(shopRow).join('') + '</ul>';
    return h;
  }
  function againHtml() {
    var on = {}; (S.shop || []).forEach(function (x) { on[lc(x.text)] = 1; });
    var r = ((S.shopMeta && S.shopMeta.recent) || []).filter(function (t) { return !on[lc(t)]; }).slice(0, 12);
    return r.length ? '<div class="li-again"><span class="note">Again?</span>' + r.map(function (t) { return '<button type="button" class="cat" data-act="shopAgain" data-t="' + esc(t) + '">+ ' + esc(t) + '</button>'; }).join('') + '</div>' : '';
  }
  function agendaRow(x, meeting) {
    return '<li class="li-row' + (meeting && x.talked ? ' got' : '') + '">' +
      (meeting ? '<button type="button" class="li-tick' + (x.talked ? ' on' : '') + '" data-act="agTick" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.talked + '" aria-label="Talked about: ' + esc(x.text) + '">' + (x.talked ? '&#10003;' : '') + '</button>' : '<span class="li-dot" aria-hidden="true"></span>') +
      '<span class="grow li-text"><span class="li-name">' + esc(x.text) + '</span><small>' + byLine(x) + (!meeting && x.talked ? ' &middot; talked about' : '') + '</small></span>' + delBtn('agDel', x) + '</li>';
  }
  function agendaListHtml(meeting) {
    var a = agendaSorted();
    if (!a.length) return '<p class="note">' + (meeting ? 'Nothing on the list. Add a topic below.' : 'Nothing yet.') + '</p>';
    return '<ul class="li-list">' + a.map(function (x) { return agendaRow(x, meeting); }).join('') + '</ul>';
  }
  function agendaTeaser() {
    var a = agendaSorted(); if (!a.length) return '';
    return '<p class="note mtg-teaser"><b>' + a.length + ' topic' + (a.length === 1 ? '' : 's') + ' to talk about:</b> ' + a.slice(0, 3).map(function (x) { return esc(x.text); }).join(' &middot; ') + (a.length > 3 ? ' &hellip;' : '') + '</p>';
  }
  function addForm(kind, id, ph, label, primary) {
    return '<form class="li-add" data-form="' + kind + '"><input id="' + id + '" type="text" maxlength="' + (kind === 'shop' ? 80 : 200) + '" placeholder="' + ph + '" aria-label="' + label + '" autocomplete="off" enterkeyhint="done">' +
      '<button class="btn' + (primary ? ' primary' : '') + '" type="submit">Add</button></form>';
  }
  function mtgAgendaCard() {
    return '<div class="card mtg-agenda stack tight"><h3>To talk about</h3><p class="note" style="margin:0">Tick each topic as you talk it through. Starting the next meeting saves the ticked ones with this meeting; the rest stay for next time.</p>' +
      '<div id="mtgAgenda">' + agendaListHtml(true) + '</div>' + addForm('agenda', 'agIn2', 'Add a topic', 'Add a topic to talk about', false) + '</div>';
  }
  function renderLists() {
    if (!S.admin) { view.innerHTML = locked('Lists'); return; }
    if (!$('#shopList')) {
      view.innerHTML = '<div class="stack lists">' +
        '<section class="card stack tight"><div class="row-flex"><h2 class="grow" style="margin:0">Shopping list</h2><button class="btn small" type="button" data-act="shopShare">Share</button></div>' +
        addForm('shop', 'shopIn', 'Add items, like milk, eggs', 'Add to the shopping list', true) + '<div id="shopAgain"></div><div id="shopList"></div></section>' +
        '<section class="card stack tight"><h2 style="margin:0">Family meeting topics</h2><p class="note" style="margin:0">Anything to bring up at the next family meeting. They show at the top of the meeting report (History &rarr; Open report), where you tick them off as you go.</p>' +
        addForm('agenda', 'agIn', 'Something to talk about', 'Add a family meeting topic', true) + '<div id="agendaList"></div></section></div>';
    }
    paintLists();
  }
  /* repaints only the lists, so an add box keeps its focus (and the phone keyboard stays up) while items come in */
  function paintLists() {
    [['#shopList', shopListHtml], ['#shopAgain', againHtml], ['#agendaList', function () { return agendaListHtml(false); }], ['#mtgAgenda', function () { return agendaListHtml(true); }]].forEach(function (p) {
      var el = $(p[0]); if (!el) return;
      var h = p[1](); if (el._h !== h) { el.innerHTML = h; el._h = h; }
    });
  }
  function addShop(raw) {
    if (!needAdmin()) return;
    var parts = String(raw || '').split(/[,\n]/).map(trim).filter(Boolean), ops = [], dup = [], seen = {}, now = Date.now();
    parts.forEach(function (t, i) {
      t = cap(t.slice(0, 80)); var k = lc(t); if (seen[k]) return; seen[k] = 1;
      var ex = find(S.shop || [], function (x) { return lc(x.text) === k; });
      if (ex && !ex.got) { dup.push(t); return; }
      if (ex) ops.push({ t: 'update', c: 'shop', id: ex.id, d: { got: false, gotTs: 0, gotBy: '', ts: now + i, by: me4() } });
      else ops.push({ t: 'set', c: 'shop', id: DB.newId('shop'), d: { text: t, by: me4(), ts: now + i, got: false } });
    });
    if (dup.length) toast(dup.join(', ') + (dup.length === 1 ? ' is' : ' are') + ' already on the list.');
    if (ops.length) DB.commit(ops).then(paintLists, fail);
  }
  function shopTick(id) {
    if (!needAdmin()) return;
    var x = find(S.shop, function (y) { return y.id === id; }); if (!x) return;
    DB.commit([{ t: 'update', c: 'shop', id: id, d: x.got ? { got: false, gotTs: 0, gotBy: '' } : { got: true, gotTs: Date.now(), gotBy: me4() } }]).catch(fail);
  }
  function shopClear() {
    if (!needAdmin()) return;
    var got = shopSorted().got; if (!got.length) return;
    var seen = {}, recent = got.map(function (x) { return x.text; }).concat((S.shopMeta && S.shopMeta.recent) || []).filter(function (t) { var k = lc(t); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 20);
    DB.commit(got.map(function (x) { return { t: 'delete', c: 'shop', id: x.id }; }).concat([{ t: 'merge', c: 'meta', id: 'shop', d: { recent: recent } }]))
      .then(function () { toast('Cleared ' + got.length + ' item' + (got.length === 1 ? '' : 's') + '.'); }, fail);
  }
  function addAgenda(raw) {
    if (!needAdmin()) return;
    var t = cap(trim(raw).slice(0, 200)); if (!t) return;
    if (find(S.agenda || [], function (x) { return lc(x.text) === lc(t); })) { toast('That topic is already on the list.'); return; }
    DB.commit([{ t: 'set', c: 'agenda', id: DB.newId('agenda'), d: { text: t, by: me4(), ts: Date.now(), talked: false } }]).then(paintLists, fail);
  }

  /* ----- Setup ----- */
  function locked(what) {
    return '<div class="banner info"><strong>' + what + ' is for parents.</strong>' +
      '<div style="margin-top:10px"><button class="btn primary" type="button" data-act="adminOpen">Parent unlock</button></div></div>';
  }
  function renderSetup() {
    if (S.ctable && S.admin) { renderChoreTable(); return; }
    S.ctable = false;
    var dev = '<section class="stack tight"><h2>This device</h2><p class="note">' + (DB.mode === 'firebase' && DB.user ? 'Signed in as ' + esc(DB.user.email) : 'Demo mode: data stays in this browser.') + '</p>' +
      '<div class="wrap">' + (DB.mode === 'firebase' ? '<button class="btn' + (S.armed === 'signout' ? ' danger' : '') + '" type="button" data-act="signout">' + (S.armed === 'signout' ? 'Tap again to sign out' : 'Sign out of this device') + '</button>' : '') +
      (S.admin ? '<button class="btn" type="button" data-act="exportFamily">Download family file</button>' : '') +
      (DB.mode === 'demo' ? '<button class="btn danger" type="button" data-act="resetDemo">' + (S.armed === 'resetDemo' ? 'Tap again to erase demo data' : 'Erase demo data') + '</button>' : '') + '</div>' +
      (S.admin ? '<p class="note">The family file is a backup of your people, chores and settings. It can set up the app again from scratch.</p>' : '') +
      (S.admin ? '<div class="wrap">' + (MODE === 'bank' ? '<button class="btn" type="button" data-act="roleKids">Switch this device to the kids’ app</button>' + (keepInfo() ? '<button class="btn" type="button" data-act="unkeep">Ask for my PIN every time</button>' : '')
        : '<button class="btn" type="button" data-act="roleParent">Make this my parent phone</button>') + '</div>' +
        '<p class="note">' + (MODE === 'bank' ? 'This device opens the parent app.' + (keepInfo() ? ' It stays unlocked until you tap Lock.' : ' It locks after 10 minutes without use.') : 'This device opens the kids’ app. Parents can still tap Parent at the top to approve things here.') + '</p>' : '') + '</section>';
    if (!S.admin) { view.innerHTML = '<div class="stack">' + locked('Setup') + dev + '</div>'; return; }
    if (S.avEditFor && window.Pets) { view.innerHTML = window.Pets.adultCreatorHtml(S.avEditFor); return; }
    var st = S.settings, act = activePeople(), h = '<div class="stack" style="margin-bottom:10px">' + remindersCard();
    if (S.parent && window.Pets) {
      var md = window.Pets.doc(S.parent.id), spot = md.spot || '';
      h += '<section class="card stack tight you-card"><h2>You in town</h2><div class="you-row"><div class="you-av">' + (md.avatar ? window.CHAR.drawAvatar(window.Pets.adultAv(md.avatar)) : '<span class="note">No character yet</span>') + '</div>' +
        '<div class="grow stack tight"><p class="note">Grown-ups get a character but no pet, and are always drawn tall so the kids can spot an approver. Pick where you hang out and the kids will find you there.</p>' +
        '<button class="btn primary" type="button" data-act="adultAv">' + (md.avatar ? 'Change my look' : 'Design my character') + '</button></div></div>' +
        (md.avatar ? '<div class="seg town spots" role="group" aria-label="Where you hang out">' + window.Pets.SPOTS.map(function (sp) {
          var label = sp[0] === 'bank' ? bankName() : sp[1];
          return '<button type="button" data-act="adultSpot" data-spot="' + sp[0] + '" aria-pressed="' + (spot === sp[0]) + '">' + esc(label) + '</button>';
        }).join('') + '</div>' : '') + '</section>';
    }
    h += '<form class="stack tight" data-form="money2"><h2>Money</h2>' +
      '<label class="field" for="bname"><span>Bank name</span><input type="text" id="bname" maxlength="30" value="' + esc(bankName()) + '"></label>' +
      '<div class="checks"><label><input type="checkbox" id="reqAppr"' + (st.requireApproval !== false ? ' checked' : '') + '>Chores need parent approval before they count</label></div>' +
      '<div class="wrap end"><label class="field w-md" for="lgWait"><span>Seconds a kid waits before logging the same chore again</span><input type="number" id="lgWait" min="0" max="3600" step="5" value="' + (st.logCooldown != null ? st.logCooldown : 60) + '"></label>' +
      '<label class="field w-md" for="lgCap"><span>Most times a kid can log the same chore in a day (0 = no limit)</span><input type="number" id="lgCap" min="0" max="100" step="1" value="' + (st.logCap != null ? st.logCap : 5) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="cpd"><span>Chore coins for $1</span><input type="number" id="cpd" min="1" step="1" value="' + (st.coinsPerDollar || 100) + '"></label>' +
      '<label class="field w-sm" for="ppc"><span>Chore coins for 10 food or clean coins</span><input type="number" id="ppc" min="1" step="1" value="' + (st.swapPrice || 20) + '"></label>' +
      '<label class="field w-sm" for="tprice"><span>Toothpaste (chore coins)</span><input type="number" id="tprice" min="1" step="1" value="' + (st.toothPrice || 20) + '"></label>' +
      '<label class="field w-sm" for="bprice"><span>Ball (chore coins)</span><input type="number" id="bprice" min="1" step="1" value="' + (st.ballPrice || 20) + '"></label></div>' +
      '<div class="wrap end">' +
      '<label class="field w-md" for="evo1"><span>First evolution pays ($)</span><input type="text" id="evo1" inputmode="decimal" value="' + dollars(st.petEvolve1Cents) + '"></label>' +
      '<label class="field w-md" for="evo2"><span>Final evolution pays ($)</span><input type="text" id="evo2" inputmode="decimal" value="' + dollars(st.petEvolve2Cents) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-md" for="dad"><span>Weekly allowance goes to</span><select id="dad"><option value="">Nobody</option>' + act.map(function (p) { return opt(esc(p.id), esc(p.name), st.dadPid); }).join('') + '</select></label>' +
      '<label class="field w-sm" for="allow"><span>Amount ($)</span><input type="text" id="allow" inputmode="decimal" value="' + dollars(st.allowanceCents) + '"></label>' +
      '<label class="field w-md" for="aday"><span>Every</span><select id="aday">' + DAYS.map(function (d, i) { return opt(String(i), d, String(st.allowanceDay)); }).join('') + '</select></label></div>' +
      '<div class="checks"><label><input type="checkbox" id="aVacPause"' + (st.allowanceVacPause !== false ? ' checked' : '') + '>Pause the weekly allowance during vacation (uses the vacation dates below)</label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="fcoins"><span>Food coins in a "needs most" share</span><input type="number" id="fcoins" min="1" step="1" value="' + (st.foodCoins || 10) + '"></label>' +
      '<label class="field w-sm" for="mprice"><span>Meal price</span><input type="number" id="mprice" min="1" step="1" value="' + (st.mealPrice || 10) + '"></label>' +
      '<label class="field w-sm" for="ccoins"><span>Clean coins in a "needs most" share</span><input type="number" id="ccoins" min="1" step="1" value="' + (st.careCoins || 10) + '"></label>' +
      '<label class="field w-sm" for="kprice"><span>Bath kit price</span><input type="number" id="kprice" min="1" step="1" value="' + (st.kitPrice || 10) + '"></label></div>' +
      '<p class="note">How many food and clean coins each chore pays is set per chore (Setup → Chores). A pet eats about two meals a day. Coin purses hold two purchases, so food and clean coins cannot be saved up for long; chore coins have no limit.</p>' +
      '<fieldset class="rw-edit"><legend>Pet night and needs</legend>' +
      '<div class="checks"><label><input type="checkbox" id="nOn"' + (st.nightOff ? '' : ' checked') + '>Pets sleep at night: the town goes dark, shops and the bank close, and nobody can play with their pet</label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="nFrom"><span>Night starts</span><input type="time" id="nFrom" value="' + esc(st.nightStart || '20:00') + '"></label>' +
      '<label class="field w-sm" for="nTo"><span>Morning</span><input type="time" id="nTo" value="' + esc(st.nightEnd || '06:30') + '"></label></div>' +
      '<p class="note">A pet tucked in that evening (from 4 hours before night starts) sleeps in its bed; otherwise it sleeps under the bed and wakes up a little tired. The other needs don’t drop at night.</p>' +
      '<div class="wrap end">' + [['dFood', 'Food drops', 'drainFood', 50], ['dClean', 'Clean drops', 'drainClean', 25], ['dRest', 'Sleep drops', 'drainRest', 50], ['dEnergy', 'Energy drops', 'drainEnergy', 50]].map(function (x) {
        return '<label class="field w-sm" for="' + x[0] + '"><span>' + x[1] + '</span><input type="number" id="' + x[0] + '" min="0" max="200" step="1" inputmode="numeric" value="' + (st[x[2]] != null && st[x[2]] !== '' ? st[x[2]] : x[3]) + '"></label>';
      }).join('') + '</div>' +
      '<div class="wrap end"><label class="field w-md" for="hHours"><span>Hours a pet hides after a “pet hides” rating</span><input type="number" id="hHours" min="1" max="168" step="1" value="' + (st.hideHours || 24) + '"></label></div>' +
      '<p class="note">How much each need drops in a whole day, out of 100 (it all happens during the waking hours). A meal adds 50, a bath 60, a tuck-in 60 and a game 60, so Clean at 25 means a bath about every two to three days.</p></fieldset>' +
      '<button class="btn primary" type="submit">Save</button>' +
      '<p class="note">Chores pay chore coins instead of money on paydays; kids trade them for dollars at the bank when they want (100 chore coins = $1 by default). The weekly allowance lands the first time a parent unlocks on or after that day. The allowance account is hidden from the kids.</p></form>';
    var ac = window.ADV ? ADV.cfg() : {}, vac = ac.vacation || {};
    h += '<form class="stack tight" data-form="advset"><h2>Adventures and vacation</h2>' +
      '<div class="wrap end"><label class="field w-sm" for="aJobs"><span>Big jobs for a pass</span><input type="number" id="aJobs" min="1" step="1" value="' + ac.passBigJobs + '"></label>' +
      '<label class="field w-sm" for="aMin"><span>Pass minutes</span><input type="number" id="aMin" min="5" step="5" value="' + ac.passMinutes + '"></label>' +
      '<label class="field w-sm" for="aGold"><span>Golden pass minutes</span><input type="number" id="aGold" min="5" step="5" value="' + ac.goldenMinutes + '"></label>' +
      '<label class="field w-sm" for="aEarly"><span>Golden if done by</span><input type="time" id="aEarly" value="' + esc(ac.earlyBy) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-sm" for="aWd1"><span>Weekday hours from</span><input type="time" id="aWd1" value="' + esc(ac.advWeekday[0]) + '"></label>' +
      '<label class="field w-sm" for="aWd2"><span>to</span><input type="time" id="aWd2" value="' + esc(ac.advWeekday[1]) + '"></label>' +
      '<label class="field w-sm" for="aWe1"><span>Weekend hours from</span><input type="time" id="aWe1" value="' + esc(ac.advWeekend[0]) + '"></label>' +
      '<label class="field w-sm" for="aWe2"><span>to</span><input type="time" id="aWe2" value="' + esc(ac.advWeekend[1]) + '"></label></div>' +
      '<div class="wrap end"><label class="field w-md" for="vFrom"><span>Vacation from</span><input type="date" id="vFrom" value="' + esc(vac.from || '') + '"></label>' +
      '<label class="field w-md" for="vTo"><span>Vacation to</span><input type="date" id="vTo" value="' + esc(vac.to || '') + '"></label>' +
      '<label class="field w-sm" for="vMin"><span>Minutes a day on vacation</span><input type="number" id="vMin" min="5" step="5" value="' + ac.vacMinutes + '"></label></div>' +
      '<div class="checks"><label><input type="checkbox" id="vAuto"' + (ac.vacAutoPass ? ' checked' : '') + '>On vacation, passes are automatic (no approvals needed in the car)</label></div>' +
      '<div class="wrap"><button class="btn primary" type="submit">Save</button>' + (S.chores.some(function (c) { return c.travel; }) ? '' : '<button class="btn" type="button" data-act="addTravel">Add travel chores</button>') + '</div>' +
      '<p class="note">Mark big jobs in the chore editor. A kid earns a pass when their big jobs are approved; when every big job in the house is done, everyone gets a pass and can find a rare egg. During vacation every chore still works (untick Works while traveling in the chore editor for home-only ones), big jobs come from the trip big jobs, and pets get hungry and dirty half as fast and never starve.</p></form>';
    var parents = st.parents || [];
    h += '<section class="stack tight"><h2>Parents</h2><div class="list">' + parents.map(function (p) {
      var me = S.parent && p.id === S.parent.id;
      return '<div class="srow"><div class="grow">' + esc(p.name) + (me ? ' <small>(you)</small>' : '') + '</div>' +
        (!me ? '<button class="btn small' + (S.armed === 'rmp' + p.id ? ' danger' : '') + '" type="button" data-act="rmParent" data-id="' + esc(p.id) + '">' + (S.armed === 'rmp' + p.id ? 'Tap again to remove' : 'Remove') + '</button>' : '') + '</div>';
    }).join('') + '</div>' +
      '<form class="wrap end" data-form="addparent"><label class="field w-md" for="apName"><span>Add a parent</span><input type="text" id="apName" maxlength="24" placeholder="Mom"></label>' +
      '<label class="field w-sm" for="apPin"><span>Their PIN</span><input type="password" id="apPin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="apPin2"><span>Repeat</span><input type="password" id="apPin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn" type="submit">Add</button></form>' +
      '<form class="wrap end" data-form="newpin"><label class="field w-sm" for="npin"><span>My new PIN</span><input type="password" id="npin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<label class="field w-sm" for="npin2"><span>Repeat</span><input type="password" id="npin2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8"></label>' +
      '<button class="btn" type="submit">Change my PIN</button></form>' +
      '<p class="note">Each parent unlocks with their own PIN, and the history shows who approved what. On shared devices parent mode locks after 10 minutes without use.</p></section>';
    h += '<section class="stack tight"><h2>People</h2><div class="list">' + S.people.map(function (p) {
      var off = p.active === false;
      return '<div class="srow' + (off ? ' off' : '') + ' ' + pCls(p) + '"><span class="dot"></span><label class="field grow" for="pn_' + esc(p.id) + '"><span>' + (off ? 'Archived' : 'Name') + '</span>' +
        '<input type="text" id="pn_' + esc(p.id) + '" data-act="rename" data-pid="' + esc(p.id) + '" value="' + esc(p.name) + '" maxlength="40"></label>' +
        (isDad(p.id) ? '<span class="tag plain">Grown-up</span>' : '<button class="btn small" type="button" data-act="toggleAdult" data-pid="' + esc(p.id) + '" aria-pressed="' + !!p.adult + '">' + (p.adult ? 'Grown-up' : 'Kid') + '</button>') +
        '<button class="btn small" type="button" data-act="togglePerson" data-pid="' + esc(p.id) + '">' + (off ? 'Restore' : 'Archive') + '</button></div>';
    }).join('') + '</div>' +
      '<form class="wrap end" data-form="person"><label class="field w-md" for="newName"><span>Add a person</span><input type="text" id="newName" maxlength="40"></label>' +
      '<label class="field w-md" for="copyFrom"><span>Give them the chores of</span><select id="copyFrom"><option value="">Nobody yet</option>' + act.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn primary" type="submit">Add</button></form><p class="note">Tap Kid or Grown-up to switch. Grown-ups keep their bank account and chores but have no pet or house in the game.</p></section>';
    h += '<section class="stack tight"><h2>Chores</h2><div class="wrap"><div class="field w-lg"><input type="search" id="cq" placeholder="Search chores" aria-label="Search chores" value="' + esc(S.cq) + '"></div>' +
      '<button class="btn primary" type="button" data-act="newChore">Add chore</button><button class="btn" type="button" data-act="ctOpen">Edit all in a table</button><span class="checks"><label><input type="checkbox" id="showArch" data-act="showArch"' + (S.showArchived ? ' checked' : '') + '>Show archived</label></span></div>' +
      '<p class="note">Each chore can pay any mix of chore coins (100 = $1 at the bank), food coins, clean coins, part or all of a tuck-in or a play, and a share of whatever the pet needs most. Rated chores ask how it went (like Great, Good, OK, Bad) and pay that part. Edit all in a table is the quickest way to change many at once.</p>' +
      '<ul class="list" id="choreList"></ul></section>';
    var cats = catList(S.chores).filter(function (n) { return n !== 'Other'; });
    h += '<section class="stack tight"><h2>Categories</h2><div class="list">' + (cats.length ? cats.map(function (n, i) {
      return '<div class="srow"><label class="field grow" for="cn_' + i + '"><span>' + S.chores.filter(function (c) { return catName(c) === n; }).length + ' chores</span><input type="text" id="cn_' + i + '" data-act="renameCat" data-old="' + esc(n) + '" value="' + esc(n) + '" maxlength="40"></label>' +
        '<button class="btn small" type="button" data-act="catMove" data-dir="-1" data-cat="' + esc(n) + '"' + (i ? '' : ' disabled') + '>Up</button>' +
        '<button class="btn small" type="button" data-act="catMove" data-dir="1" data-cat="' + esc(n) + '"' + (i < cats.length - 1 ? '' : ' disabled') + '>Down</button></div>';
    }).join('') : '<div class="empty">No categories yet.</div>') + '</div></section>';
    view.innerHTML = h + dev + '</div>';
    updateChoreList();
  }
  function updateChoreList() {
    var el = $('#choreList'); if (!el) return;
    var act = activePeople(), q = trim(S.cq).toLowerCase();
    var list = S.chores.filter(function (c) { return (S.showArchived || c.active !== false) && (!q || c.name.toLowerCase().indexOf(q) >= 0 || catName(c).toLowerCase().indexOf(q) >= 0); });
    list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var html = S.edit === 'new' ? choreEditor(null, act) : '';
    catList(list).forEach(function (n) {
      var items = list.filter(function (c) { return catName(c) === n; });
      html += '<li class="grp"><span>' + esc(n) + '</span><span class="mono">' + items.length + '</span></li>';
      items.forEach(function (c) {
        if (S.edit === c.id) { html += choreEditor(c, act); return; }
        var who = (c.who || []).map(pname);
        html += '<li class="srow' + (c.active === false ? ' off' : '') + '"><div class="grow">' + esc(c.name) + (c.active === false ? ' (archived)' : '') +
          ' ' + giveTag(c) + (c.bountyCents > 0 ? ' <span class="tag bounty">' + money(c.bountyCents) + '</span>' : '') +
          (c.major ? ' <span class="tag big">Big job' + (c.majorEach ? ', everyone' : '') + '</span>' : '') + (c.travel && c.major ? ' <span class="tag plain">Trip big job</span>' : '') + (c.tripOnly ? ' <span class="tag plain">Only on vacation</span>' : c.homeOnly ? ' <span class="tag plain">Hidden on vacation</span>' : '') + (daysOf(c) ? ' <span class="tag plain">' + esc(daysText(daysOf(c))) + '</span>' : '') + (c.shared ? ' <span class="tag plain">Shared</span>' : '') + (freqOf(c) ? ' <span class="tag plain">' + freqText(freqOf(c)) + '</span>' : '') + (c.review ? ' <span class="tag plain">Daily review</span>' : '') +
          '<br><small>' + (who.length ? esc(who.join(', ')) : 'Nobody assigned') + '</small></div>' +
          ptsBadge(c.pts, !!levelsOf(c)) + '<button class="btn small" type="button" data-act="editChore" data-cid="' + esc(c.id) + '">Edit</button></li>';
      });
    });
    el.innerHTML = html || '<li class="empty">No chores match.</li>';
  }
  /* ----- the chore table: every chore in one grid, plus a spreadsheet (CSV) round trip.
     Edits wait in S.ct (d: changes per chore id, n: new rows) until Save; data arriving meanwhile never redraws it.
     Columns: chore coins (pts), food and clean coins, tuck-in %, play %, needs most %, levels (graded chores), bounty, on. ----- */
  var CT_NUM = ['pts', 'food', 'clean', 'tuck', 'play', 'any'];
  var CT_HEAD = { pts: 'Chore coins', food: 'Food coins', clean: 'Clean coins', tuck: 'Tuck-in %', play: 'Play %', any: 'Needs most %' };
  var CT_FILTER = [['', 'All'], ['food', 'Food coins'], ['clean', 'Clean coins'], ['tuck', 'Tuck-ins'], ['play', 'Play'], ['any', 'Needs most'], ['rated', 'Rated'], ['review', 'Daily review'], ['days', 'Set days'], ['shared', 'Shared'], ['vac', 'Vacation'], ['big', 'Big jobs'], ['only', 'Chore coins only']];
  function ctState() { if (!S.ct) S.ct = { d: {}, n: [], q: '', cat: '', give: '', arch: false, msg: '' }; return S.ct; }
  function whoKey(ids) { return (ids || []).slice().sort().join(','); }
  function ctBase(c) {
    var r = rewardsOf(c);
    return { name: c.name || '', cat: c.cat || '', pts: Number(c.pts) || 0, food: r.food, clean: r.clean, tuck: r.tuck, play: r.play, any: r.any,
      lv: levelsText(levelsOf(c)), freq: (freqOf(c) ? c.freq : ''), review: !!c.review, days: daysOf(c) ? daysText(daysOf(c)) : '', shared: !!c.shared, vac: vacOf(c), big: !!c.major,
      bounty: Number(c.bountyCents) || 0, active: c.active !== false, who: whoKey(c.who) };
  }
  function ctNewRow(cat) { return { name: '', cat: cat || '', pts: 4, food: 0, clean: 0, tuck: 0, play: 0, any: 0, lv: '', freq: '', review: false, days: '', shared: false, vac: '', big: false, bounty: 0, active: true, who: '' }; }
  /* vacation: '' shows it always, 'hide' hides it on vacation (homeOnly), 'only' shows it only on vacation (tripOnly) */
  var VACS = [['', 'Always'], ['hide', 'Hide on vacation'], ['only', 'Only on vacation']];
  function vacOf(c) { return c && c.tripOnly ? 'only' : c && c.homeOnly ? 'hide' : ''; }
  function vacShow(c, vac) { return vac ? !c.homeOnly : !c.tripOnly; }
  function vacKey(str) { var t = lc(String(str || '')).trim(); if (!t || /^(always|show|both|no|n|0|false|-)$/.test(t)) return ''; if (/^(hide|home)/.test(t) || /^(yes|y|1|x|true|✓|✔)$/.test(t)) return 'hide'; if (/only|trip|travel|away/.test(t)) return 'only'; return null; }
  function normDays(v) { var k = daysKey(v); return k === null ? v : k.length ? daysText(k) : ''; }   /* "mon thu" reads as "Mon, Thu"; unreadable text stays as typed */
  function ctRow(c) { var d = ctState().d[c.id]; return d ? assign(ctBase(c), d) : ctBase(c); }
  function ctChanged(c) {
    var b = ctBase(c), d = ctState().d[c.id] || {}, out = {};
    Object.keys(d).forEach(function (k) {
      var v = typeof d[k] === 'string' && k !== 'who' ? trim(d[k]) : d[k];
      if (k === 'lv') v = levelsText(parseLevels(v));
      if (k === 'days') v = normDays(v);
      if (v !== b[k]) out[k] = v;
    });
    return out;
  }
  function ctNew() { return ctState().n.filter(function (r) { return trim(r.name || ''); }); }
  function ctCount() { var n = ctNew().length; S.chores.forEach(function (c) { if (Object.keys(ctChanged(c)).length) n++; }); return n; }
  function ctOrder() {
    var cats = catList(S.chores);
    return S.chores.slice().sort(function (a, b) { return (cats.indexOf(catName(a)) - cats.indexOf(catName(b))) || ((a.order || 0) - (b.order || 0)); });
  }
  function ctList() {
    var ct = ctState(), q = lc(ct.q);
    return ctOrder().filter(function (c) {
      var r = ctRow(c);
      if (!ct.arch && c.active === false && !ct.d[c.id]) return false;
      if (ct.cat && catName(c) !== ct.cat) return false;
      if (ct.give === 'review' ? !r.review : ct.give === 'days' ? !r.days : ct.give === 'shared' ? !r.shared : ct.give === 'big' ? !r.big : ct.give === 'vac' ? !r.vac : ct.give === 'rated' ? !trim(r.lv) : ct.give === 'only' ? (r.food || r.clean || r.tuck || r.play || r.any) : ct.give && !(r[ct.give] > 0)) return false;
      return !q || lc(r.name).indexOf(q) >= 0 || lc(r.cat).indexOf(q) >= 0;
    });
  }
  function ctCells(key, r, ch) {
    function td(k, inner) { return '<td' + (ch[k] !== undefined ? ' class="chg"' : '') + '>' + inner + '</td>'; }
    var at = ' data-ct="' + esc(key) + '"';
    return td('name', '<input type="text"' + at + ' data-f="name" maxlength="120" aria-label="Chore" value="' + esc(r.name) + '">' + (ch.who !== undefined ? '<small class="ct-who">Who: ' + esc(r.who ? r.who.split(',').map(pname).join(', ') : 'nobody') + '</small>' : '')) +
      td('cat', '<input type="text"' + at + ' data-f="cat" maxlength="40" list="ctcats" aria-label="Category" value="' + esc(r.cat) + '">') +
      CT_NUM.map(function (k) { return td(k, '<input type="number"' + at + ' data-f="' + k + '" min="0" step="1" inputmode="numeric" aria-label="' + CT_HEAD[k] + '" placeholder="0" value="' + (r[k] ? r[k] : '') + '">'); }).join('') +
      td('lv', '<input type="text"' + at + ' data-f="lv" maxlength="120" aria-label="Levels" placeholder="none" value="' + esc(r.lv) + '">') +
      td('freq', '<select' + at + ' data-f="freq" aria-label="How often">' + freqOpts(r.freq) + '</select>') +
      td('review', '<input type="checkbox"' + at + ' data-f="review" aria-label="Daily review"' + (r.review ? ' checked' : '') + '>') +
      td('days', '<input type="text"' + at + ' data-f="days" maxlength="40" aria-label="Days" placeholder="every day"' + (r.days && daysKey(r.days) === null ? ' class="bad"' : '') + ' value="' + esc(r.days) + '">') +
      td('shared', '<input type="checkbox"' + at + ' data-f="shared" aria-label="Shared"' + (r.shared ? ' checked' : '') + '>') +
      td('vac', '<select' + at + ' data-f="vac" aria-label="On vacation">' + VACS.map(function (x) { return '<option value="' + x[0] + '"' + (r.vac === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>') +
      td('big', '<input type="checkbox"' + at + ' data-f="big" aria-label="Big job"' + (r.big ? ' checked' : '') + '>') +
      td('bounty', '<input type="text"' + at + ' data-f="bounty" inputmode="decimal" placeholder="0.00" aria-label="Bounty" value="' + (r.bounty ? dollars(r.bounty) : '') + '">') +
      td('active', '<input type="checkbox"' + at + ' data-f="active" aria-label="Active"' + (r.active ? ' checked' : '') + '>');
  }
  function ctBarHtml() {
    var n = ctCount();
    return '<span class="grow">' + (n ? n + ' chore' + (n === 1 ? '' : 's') + ' changed, not saved yet' : 'No changes yet') + '</span>' +
      '<button class="btn' + (S.armed === 'ctDiscard' ? ' danger' : '') + '" type="button" data-act="ctDiscard"' + (n ? '' : ' disabled') + '>' + (S.armed === 'ctDiscard' ? 'Tap again to undo' : 'Undo all') + '</button>' +
      '<button class="btn primary" type="button" data-act="ctSave"' + (n ? '' : ' disabled') + '>Save</button>';
  }
  function ctBar() {
    // update the bar in place: replacing its buttons while a cell loses focus would swallow the tap on Save
    var el = $('#ctBar'); if (!el) return;
    var n = ctCount(), sp = el.querySelector('.grow'), un = el.querySelector('[data-act=ctDiscard]'), sv = el.querySelector('[data-act=ctSave]');
    if (!sp || !un || !sv) { el.innerHTML = ctBarHtml(); return; }
    sp.textContent = n ? n + ' chore' + (n === 1 ? '' : 's') + ' changed, not saved yet' : 'No changes yet';
    un.disabled = !n; sv.disabled = !n;
  }
  function renderChoreTable() {
    var ct = ctState(), list = ctList(), cats = catList(S.chores), st = S.settings, cur = '', NC = 17;
    var rows = list.map(function (c) {
      var head = '';
      if (catName(c) !== cur) { cur = catName(c); head = '<tr class="grp"><td colspan="' + NC + '"><span>' + esc(cur) + '</span></td></tr>'; }
      return head + '<tr' + (c.active === false ? ' class="off"' : '') + '>' + ctCells(c.id, ctRow(c), ctChanged(c)) + '</tr>';
    }).join('');
    var all = { name: 1, cat: 1, pts: 1, food: 1, clean: 1, tuck: 1, play: 1, any: 1, lv: 1, freq: 1, review: 1, days: 1, shared: 1, vac: 1, big: 1, bounty: 1, active: 1 };
    var news = ct.n.map(function (r, i) { return '<tr class="new">' + ctCells('+' + i, r, all) + '</tr>'; }).join('');
    view.innerHTML = '<section class="stack tight ct">' +
      '<div class="wrap"><button class="btn" type="button" data-act="ctClose">&lsaquo; Setup</button><h2 class="grow">All chores</h2></div>' +
      '<p class="note">Each chore can pay any mix of these. <b>Chore coins</b>: 100 trade for $1 at the bank, and they buy food and clean coins, toothpaste, balls and clothes. <b>Food</b> and <b>clean coins</b> buy meals and bath kits. ' +
      '<b>Tuck-in %</b> and <b>Play %</b>: 100 is a whole tuck-in or play, 50 is half (two of those chores earn one). <b>Needs most %</b>: 100 gives one share of whatever the pet needs most (' + (Number(st.foodCoins) || 10) + ' food or ' + (Number(st.careCoins) || 10) + ' clean coins, or a tuck-in or play). ' +
      '<b>Levels</b> make a chore rated, like <i>Great 100, Good 75, OK 50, Bad 0</i>: logging it asks how it went and pays that percent. Nothing changes until you tap Save.</p>' +
      (ct.msg ? '<div class="banner info">' + ct.msg + '</div>' : '') +
      '<div class="wrap"><button class="btn" type="button" data-act="ctDown">Download spreadsheet</button><button class="btn" type="button" data-act="ctUp">Upload spreadsheet</button>' +
      '<input type="file" id="ctFile" accept=".csv,.txt,text/csv,text/plain" class="hide-file"></div>' +
      '<div class="wrap end"><div class="field w-md"><input type="search" id="ctq" placeholder="Search chores" aria-label="Search chores" value="' + esc(ct.q) + '"></div>' +
      '<div class="field w-md"><select id="ctCat" aria-label="Category"><option value="">Every category</option>' + cats.map(function (n) { return '<option value="' + esc(n) + '"' + (ct.cat === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      '<span class="checks"><label><input type="checkbox" id="ctArch"' + (ct.arch ? ' checked' : '') + '>Show archived</label></span></div>' +
      '<div class="cats gives"><span class="gives-l">Gives</span>' + CT_FILTER.map(function (f) {
        var gv = { food: 'food', clean: 'clean', tuck: 'rest', play: 'energy', any: 'any' }[f[0]];
        return '<button type="button" class="cat' + (gv ? ' gv-' + gv : '') + '" data-act="ctGive" data-k="' + f[0] + '" aria-pressed="' + (ct.give === f[0]) + '">' + (gv ? '<i class="gv-dot"></i>' : '') + f[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="wrap end ct-bulk"><span class="note">Set all ' + list.length + ' shown:</span>' +
      '<div class="field w-sm"><select id="ctBF" aria-label="Which column">' + CT_NUM.map(function (k) { return '<option value="' + k + '">' + CT_HEAD[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field w-xs"><input type="number" id="ctBV" min="0" step="1" inputmode="numeric" placeholder="to" aria-label="Value for all shown"></div>' +
      '<button class="btn" type="button" data-act="ctBulk"' + (list.length ? '' : ' disabled') + '>Apply</button></div>' +
      '<div class="wrap end ct-bulk"><span class="note">Levels for all shown:</span><div class="field w-lg"><input type="text" id="ctBL" maxlength="120" value="' + esc(levelsText(DEFAULT_LEVELS)) + '" aria-label="Levels for all shown"></div>' +
      '<button class="btn" type="button" data-act="ctBulkLv"' + (list.length ? '' : ' disabled') + '>Rate them</button><button class="btn" type="button" data-act="ctBulkLvOff"' + (list.length ? '' : ' disabled') + '>No levels</button></div>' +
      '<div class="wrap end ct-bulk"><span class="note">On vacation, for all shown:</span><div class="field w-md"><select id="ctBVac" aria-label="On vacation for all shown">' + VACS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<button class="btn" type="button" data-act="ctBulkVac"' + (list.length ? '' : ' disabled') + '>Apply</button></div>' +
      '<div class="ct-wrap"><table class="ct-t"><thead><tr><th>Chore</th><th>Category</th>' + CT_NUM.map(function (k) { return '<th>' + CT_HEAD[k] + '</th>'; }).join('') + '<th>Levels</th><th>How often</th><th>Daily review</th><th>Days</th><th>Shared</th><th>On vacation</th><th>Big job</th><th>Bounty $</th><th>On</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="' + NC + '" class="empty">No chores match.</td></tr>') + (news ? '<tr class="grp"><td colspan="' + NC + '"><span>New chores</span></td></tr>' + news : '') + '</tbody></table></div>' +
      '<div class="wrap"><button class="btn" type="button" data-act="ctAdd">Add a chore row</button></div>' +
      '<p class="note">Who does each chore, big jobs and travel settings are in each chore’s editor (Setup → Chores → Edit); the spreadsheet also has a column per person (1 = they do it). Rows you delete from the spreadsheet are left alone; to retire a chore, set Active to no.</p>' +
      '<datalist id="ctcats">' + cats.filter(function (n) { return n !== 'Other'; }).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div class="ct-bar" id="ctBar">' + ctBarHtml() + '</div></section>';
  }
  function upTo(el, tag) { while (el && el.tagName !== tag) el = el.parentNode; return el; }
  function ctEdit(t) {
    var key = t.getAttribute('data-ct'), f = t.getAttribute('data-f'), ct = ctState(), v;
    if (f === 'active' || f === 'review' || f === 'shared' || f === 'big') v = t.checked;
    else if (CT_NUM.indexOf(f) >= 0) v = t.value === '' ? 0 : Math.max(0, Math.round(Number(t.value) || 0));
    else if (f === 'bounty') { v = parseMoney(t.value); if (isNaN(v)) { t.classList.add('bad'); return; } t.classList.remove('bad'); }
    else v = t.value;
    if (key.charAt(0) === '+') { var r = ct.n[Number(key.slice(1))]; if (!r) return; r[f] = v; }
    else {
      var c = find(S.chores, function (x) { return x.id === key; }); if (!c) return;
      (ct.d[key] = ct.d[key] || {})[f] = v;
      var cell = upTo(t, 'TD'); if (cell) cell.className = ctChanged(c)[f] !== undefined ? 'chg' : '';
    }
    ctBar();
  }
  function ctBulk() {
    var ct = ctState(), f = val('ctBF'), v = val('ctBV'), n = 0;
    if (v === '' || isNaN(Number(v)) || Number(v) < 0) { toast('Type the number to set, 0 or more.', true); return; }
    ctList().forEach(function (c) { (ct.d[c.id] = ct.d[c.id] || {})[f] = Math.round(Number(v)); n++; });
    ct.msg = ''; toast(CT_HEAD[f] + ' set on ' + n + ' chore' + (n === 1 ? '' : 's') + '. Tap Save to keep it.'); renderChoreTable();
  }
  function ctBulkVac() {   /* e.g. pick the Travel category, then "Only on vacation" for all of them */
    var ct = ctState(), v = val('ctBVac'), n = 0, lab = find(VACS, function (x) { return x[0] === v; });
    ctList().forEach(function (c) { (ct.d[c.id] = ct.d[c.id] || {}).vac = v; n++; });
    ct.msg = ''; toast('On vacation: ' + (lab ? lab[1] : 'Always').toLowerCase() + ' for ' + n + ' chore' + (n === 1 ? '' : 's') + '. Tap Save to keep it.'); renderChoreTable();
  }
  function ctBulkLv(off) {
    var ct = ctState(), t = off ? '' : levelsText(parseLevels(val('ctBL'))), n = 0;
    if (!off && !t) { toast('Type the levels like: Great 100, Good 75, OK 50, Bad 0', true); return; }
    ctList().forEach(function (c) { (ct.d[c.id] = ct.d[c.id] || {}).lv = t; n++; });
    ct.msg = ''; toast((off ? 'Levels removed from ' : 'Levels set on ') + n + ' chore' + (n === 1 ? '' : 's') + '. Tap Save to keep it.'); renderChoreTable();
  }
  function rwFromRow(r) { return cleanRw({ food: r.food, clean: r.clean, tuck: r.tuck, play: r.play, any: r.any }); }
  function ctSave() {
    var ct = ctState(), ops = [], bad = [], known = catList(S.chores).filter(function (x) { return x !== 'Other'; }), newCats = [];
    var order = S.chores.reduce(function (m, c) { return Math.max(m, c.order || 0); }, 0);
    function noteCat(n) { if (n && known.indexOf(n) < 0 && newCats.indexOf(n) < 0) newCats.push(n); }
    S.chores.forEach(function (c) {
      var ch = ctChanged(c), d = {};
      if (!Object.keys(ch).length) return;
      var row = ctRow(c);
      if (ch.name !== undefined) { if (!ch.name) { bad.push('Every chore needs a name'); return; } d.name = ch.name; }
      if (ch.cat !== undefined) { d.cat = ch.cat; noteCat(ch.cat); }
      if (ch.pts !== undefined) d.pts = ch.pts;
      if (['food', 'clean', 'tuck', 'play', 'any'].some(function (k) { return ch[k] !== undefined; })) { var rw = rwFromRow(row); d.rw = rw; d.need = compatNeed(rw); d.coins = rw.food || rw.clean || 0; }
      if (ch.lv !== undefined) d.levels = parseLevels(ch.lv);
      if (ch.freq !== undefined) d.freq = ch.freq;
      if (ch.review !== undefined) d.review = ch.review;
      if (ch.days !== undefined) { var dk = daysKey(ch.days); if (dk === null) { bad.push(c.name + ': days "' + ch.days + '" should look like Mon, Thu or weekdays'); return; } d.days = dk; }
      if (ch.shared !== undefined) d.shared = ch.shared;
      if (ch.vac !== undefined) { d.homeOnly = ch.vac === 'hide'; d.tripOnly = ch.vac === 'only'; }
      if (ch.big !== undefined) d.major = ch.big;
      if (ch.bounty !== undefined) d.bountyCents = ch.bounty;
      if (ch.active !== undefined) d.active = ch.active;
      if (ch.who !== undefined) d.who = ch.who ? ch.who.split(',') : [];
      ops.push({ t: 'update', c: 'chores', id: c.id, d: d });
    });
    ctNew().forEach(function (r) {
      var name = trim(r.name), cat = trim(r.cat || ''), rw = rwFromRow(r);
      noteCat(cat);
      ops.push({ t: 'set', c: 'chores', id: DB.newId('chores'), d: { name: name, pts: Math.max(0, Math.round(Number(r.pts) || 0)), cat: cat, rw: rw, need: compatNeed(rw), coins: rw.food || rw.clean || 0, levels: parseLevels(r.lv), freq: r.freq || '', review: !!r.review, bountyCents: r.bounty || 0,
        who: r.who ? r.who.split(',') : activePeople().map(function (p) { return p.id; }), active: r.active !== false, order: ++order, major: !!r.big, majorEach: false, majorDays: [], travel: false, homeOnly: r.vac === 'hide', tripOnly: r.vac === 'only',
        days: daysKey(r.days || '') || [], shared: !!r.shared } });
    });
    if (bad.length) { toast(bad[0] + (bad.length > 1 ? ' (and ' + (bad.length - 1) + ' more)' : ''), true); return; }
    if (!ops.length) return;
    DB.commit(ops).then(function () {
      ct.d = {}; ct.n = []; ct.msg = ''; S.fromData = false;
      toast('Saved ' + ops.length + ' chore' + (ops.length === 1 ? '' : 's') + '.'); go();
      if (newCats.length) return saveSettings({ catOrder: known.concat(newCats) });
    }).catch(fail);
  }
  function csvCell(s) { s = String(s == null ? '' : s); return /[",;\t\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function ctDownload() {
    var ppl = activePeople();
    var lines = [['ID', 'Chore', 'Category'].concat(CT_NUM.map(function (k) { return CT_HEAD[k]; }), ['Levels', 'How often', 'Daily review', 'Days', 'Shared', 'On vacation', 'Big job', 'Bounty', 'Active']).concat(ppl.map(function (p) { return p.name; })).map(csvCell).join(',')];
    ctOrder().forEach(function (c) {
      var r = ctRow(c), who = r.who ? r.who.split(',') : [];
      lines.push([c.id, trim(r.name), trim(r.cat)].concat(CT_NUM.map(function (k) { return r[k] || 0; }), [levelsText(parseLevels(r.lv)), freqOf(r) ? freqText(freqOf(r)).toLowerCase() : 'any time', r.review ? 'yes' : '', r.days || 'every day', r.shared ? 'yes' : '', r.vac === 'hide' ? 'hide' : r.vac === 'only' ? 'only' : 'always', r.big ? 'yes' : '', r.bounty ? dollars(r.bounty) : '', r.active ? 'yes' : 'no'])
        .concat(ppl.map(function (p) { return who.indexOf(p.id) >= 0 ? 1 : ''; })).map(csvCell).join(','));
    });
    try {
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + lines.join('\r\n') + '\r\n');
      a.download = 'chores-' + today() + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { toast('This browser cannot download files.', true); }
  }
  function parseCsv(text) {
    text = String(text || '').replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '', nC = first.split(',').length, delim = first.split('\t').length > nC ? '\t' : first.split(';').length > nC ? ';' : ',';
    var rows = [], row = [], cell = '', q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (q) { if (ch === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"' && cell === '') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text.charAt(i + 1) === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return trim(x); }); });
  }
  /* the old single "Gives" words (spreadsheets made before cl-v29) */
  function giveFrom(s) {
    s = lc(String(s || '').replace(/\(.*?\)/g, '')).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');
    s = trim(s);
    if (!s) return null;
    if (/^(food|meal|kitchen)/.test(s)) return 'food';
    if (/^(clean|care|bath|soap|hygiene)/.test(s)) return 'clean';
    if (/^(tuck|rest|bed|sleep|tooth)/.test(s)) return 'rest';
    if (/^(play|energy|exercise|ball|fetch)/.test(s)) return 'energy';
    if (/^(needs|need|any|what|most|favou?r)/.test(s)) return 'any';
    if (/^(nothing|none|no|off|n a|na)$/.test(s)) return 'off';
    return undefined;
  }
  function ctImport(text, fname) {
    var rows = parseCsv(text);
    if (rows.length < 2) { toast('That file has no chore rows.', true); return; }
    var head = rows[0].map(function (h) { return lc(h).replace(/[^a-z]/g, ''); });
    function col(names) { for (var i = 0; i < head.length; i++) if (names.indexOf(head[i]) >= 0) return i; return -1; }
    var C = {
      id: col(['id']), name: col(['chore', 'name', 'chorename', 'chores', 'quest', 'quests']), cat: col(['category', 'cat', 'group']),
      pts: col(['chorecoins', 'chorecoin', 'points', 'pts', 'point']), food: col(['foodcoins', 'foodcoin', 'food']), clean: col(['cleancoins', 'cleancoin', 'clean']),
      tuck: col(['tuckin', 'tuckins', 'tuck', 'tuckinpct', 'tuckinpercent']), play: col(['play', 'plays', 'playtime', 'playpct', 'playpercent']), any: col(['needsmost', 'needmost', 'any']),
      lv: col(['levels', 'level', 'grades', 'rating']), freq: col(['howoften', 'often', 'frequency', 'freq', 'limit']), review: col(['dailyreview', 'review', 'inreview', 'checkin']), days: col(['days', 'day', 'onlyon', 'whichdays', 'ondays']), shared: col(['shared', 'sharedchore', 'oneforall']),
      vac: col(['onvacation', 'vacation', 'hideonvacation', 'hidevacation', 'homeonly', 'notonvacation', 'novacation', 'hideontrips']), big: col(['bigjob', 'bigjobs', 'big', 'major']), bounty: col(['bounty', 'bountyusd', 'bountydollars']), active: col(['active', 'on', 'enabled']), who: col(['who', 'assigned', 'assignedto', 'people', 'kids']),
      gives: col(['gives', 'give', 'cointype', 'reward', 'petgame']), coins: col(['coins', 'coin', 'petcoins', 'amount'])
    };
    if (C.name < 0) { toast('The first row needs column names, with at least a Chore column.', true); return; }
    var newStyle = ['food', 'clean', 'tuck', 'play', 'any'].some(function (k) { return C[k] >= 0; }), oldStyle = !newStyle && C.gives >= 0;
    var used = []; Object.keys(C).forEach(function (k) { if (C[k] >= 0) used.push(C[k]); });
    var ct = ctState(), byId = {}, byName = {}, warn = [], changed = 0, added = 0, seen = {};
    S.chores.forEach(function (c) { byId[c.id] = c; if (!byName[lc(c.name)]) byName[lc(c.name)] = c; });
    var ppl = S.people.map(function (p) { return { id: p.id, n: lc(p.name) }; });
    /* a column per person (1, x or yes = they do it), like the family's own quest sheet */
    var pcols = []; ppl.forEach(function (p) { var i = head.indexOf(p.n.replace(/[^a-z]/g, '')); if (i >= 0 && used.indexOf(i) < 0) pcols.push({ id: p.id, i: i }); });
    ct.d = {}; ct.n = [];
    rows.slice(1).forEach(function (r, ri) {
      var line = ri + 2;
      function get(i) { return i >= 0 ? trim(r[i] == null ? '' : String(r[i])) : null; }
      function numAt(k) { var x = get(C[k]); if (x === null) return null; if (x === '') return 0; var cx = x.replace(/[^0-9.\-]/g, ''), n = Number(cx); if (cx === '' || isNaN(n) || n < 0) { warn.push('Row ' + line + ': ' + CT_HEAD[k] + ' "' + x + '" is not a number, used 0'); return 0; } return Math.round(n); }
      var id = get(C.id), name = get(C.name);
      if (!name) { if (id || r.some(function (x) { return trim(x); })) warn.push('Row ' + line + ': no chore name, skipped'); return; }
      var c = id ? byId[id] : byName[lc(name)];
      if (id && !c) warn.push('Row ' + line + ' (' + name + '): ID not found, added as a new chore');
      if (c && seen[c.id]) { warn.push('Row ' + line + ' (' + name + '): ' + (id ? 'that ID' : 'that name') + ' is on more than one row, skipped'); return; }
      if (c) seen[c.id] = 1;
      var b = c ? ctBase(c) : ctNewRow(''), v = { name: name };
      if (C.cat >= 0) v.cat = get(C.cat);
      CT_NUM.forEach(function (k) { var n = numAt(k); if (n !== null) v[k] = n; });
      if (oldStyle) {
        var gs = get(C.gives), g = giveFrom(gs);
        if (gs && g === undefined) warn.push('Row ' + line + ' (' + name + '): Gives "' + gs + '" is not one of Food coins, Clean coins, Tuck-in, Play time, Needs most, Nothing');
        else if (gs) { var lr = legacyRw(g, C.coins >= 0 ? Number(get(C.coins)) || 0 : 0); RW_KEYS.forEach(function (k) { v[k] = lr[k]; }); }
      }
      if (C.lv >= 0) { var ls = get(C.lv); v.lv = levelsText(parseLevels(ls)); if (ls && !v.lv && !/^(none|no|-)$/i.test(ls)) warn.push('Row ' + line + ' (' + name + '): levels "' + ls + '" should look like Great 100, Good 75, OK 50, Bad 0'); }
      if (C.freq >= 0) { var fs = get(C.freq), fk = freqKey(fs); if (fk === null) warn.push('Row ' + line + ' (' + name + '): how often "' + fs + '" should look like any time, once a day, 2 a day or once a week'); else v.freq = fk; }
      if (C.review >= 0) v.review = /^(1(\.0+)?|y|yes|x|true|✓|✔)$/i.test(get(C.review));
      if (C.days >= 0) { var ds = get(C.days), dk = daysKey(ds); if (dk === null) warn.push('Row ' + line + ' (' + name + '): days "' + ds + '" should look like Mon, Thu or weekdays or every day'); else v.days = dk.length ? daysText(dk) : ''; }
      ['shared', 'big'].forEach(function (k) { if (C[k] >= 0) v[k] = /^(1(\.0+)?|y|yes|x|true|✓|✔)$/i.test(get(C[k])); });
      if (C.vac >= 0) { var vs = get(C.vac), vk = vacKey(vs); if (vk === null) warn.push('Row ' + line + ' (' + name + '): on vacation "' + vs + '" should be always, hide or only'); else v.vac = vk; }
      if (C.bounty >= 0) { var bc = parseMoney(get(C.bounty)); if (isNaN(bc)) warn.push('Row ' + line + ' (' + name + '): bounty "' + get(C.bounty) + '" should look like 5.00'); else v.bounty = bc; }
      if (C.active >= 0) { var as = lc(get(C.active)); v.active = !/^(n|no|false|0|off|archived?|retired?|x)$/.test(as); }
      if (C.who >= 0) {
        var ws = get(C.who);
        if (ws) {
          var ids = [], miss = [];
          if (/^(all|everyone|everybody)$/i.test(ws)) ids = activePeople().map(function (p) { return p.id; });
          else ws.split(/[,;\/&+]|\band\b/).forEach(function (w) { w = lc(w); if (!w) return; var hit = find(ppl, function (p) { return p.n === w; }) || find(ppl, function (p) { return p.n.indexOf(w) === 0; }); if (hit) { if (ids.indexOf(hit.id) < 0) ids.push(hit.id); } else miss.push(w); });
          if (miss.length) warn.push('Row ' + line + ' (' + name + '): who "' + miss.join(', ') + '" is not a person here, so Who was left as it was');
          else v.who = whoKey(ids);
        }
      }
      if (pcols.length) {
        var on = c ? (b.who ? b.who.split(',') : []) : [];
        pcols.forEach(function (pc) { var yes = /^(1(\.0+)?|y|yes|x|true|✓|✔)$/i.test(trim(String(r[pc.i] == null ? '' : r[pc.i]))), at = on.indexOf(pc.id); if (yes && at < 0) on.push(pc.id); if (!yes && at >= 0) on.splice(at, 1); });
        v.who = whoKey(on);
      }
      if (c) {
        var d = {};
        Object.keys(v).forEach(function (k) { if (v[k] !== b[k]) d[k] = v[k]; });
        if (Object.keys(d).length) { ct.d[c.id] = d; if (Object.keys(ctChanged(c)).length) changed++; else delete ct.d[c.id]; }
      } else { ct.n.push(assign(ctNewRow(''), v)); added++; }
    });
    ct.give = ''; ct.cat = ''; ct.q = '';
    ct.msg = '<strong>Loaded ' + esc(fname || 'the spreadsheet') + ':</strong> ' + changed + ' chore' + (changed === 1 ? '' : 's') + ' changed' + (added ? ', ' + added + ' new' : '') +
      '. Changed cells are highlighted; check them, then tap Save at the bottom.' + (oldStyle ? ' (This is an older spreadsheet with a Gives column; its rewards were converted.)' : '') +
      (warn.length ? '<br><small>' + warn.slice(0, 8).map(esc).join('<br>') + (warn.length > 8 ? '<br>...and ' + (warn.length - 8) + ' more' : '') + '</small>' : '');
    renderChoreTable();
  }
  function choreEditor(c, act) {
    var who = c ? (c.who || []) : act.map(function (p) { return p.id; }), r = c ? rewardsOf(c) : cleanRw({}), lv = levelsOf(c), st = S.settings;
    function nf(id, label, v, w) { return '<label class="field ' + (w || 'w-sm') + '" for="' + id + '"><span>' + label + '</span><input type="number" id="' + id + '" min="0" step="1" inputmode="numeric" placeholder="0" value="' + (v ? v : '') + '"></label>'; }
    var cats = catList(S.chores).filter(function (n) { return n !== 'Other'; });
    return '<li><form class="editor" data-form="chore" data-cid="' + (c ? esc(c.id) : '') + '">' +
      '<label class="field" for="ceName"><span>Chore</span><input type="text" id="ceName" maxlength="120" value="' + (c ? esc(c.name) : '') + '"></label>' +
      '<div class="wrap end"><label class="field w-lg" for="ceCat"><span>Category</span><input type="text" id="ceCat" maxlength="40" list="catlist" value="' + (c && c.cat ? esc(c.cat) : '') + '"></label></div>' +
      '<fieldset class="rw-edit"><legend>What it pays</legend><div class="wrap end">' + nf('cePts', 'Chore coins', c ? c.pts : 4) + nf('ceFood', 'Food coins', r.food) + nf('ceClean', 'Clean coins', r.clean) +
        nf('ceTuck', 'Tuck-in %', r.tuck) + nf('cePlay', 'Play %', r.play) + nf('ceAny', 'Needs most %', r.any) + '</div>' +
        '<p class="note">100% is a whole tuck-in or play; 50% means two of these chores earn one. Needs most gives a share of whatever the pet needs most when it is approved (' + (Number(st.foodCoins) || 10) + ' food or ' + (Number(st.careCoins) || 10) + ' clean coins, or a tuck-in or play).</p>' +
        '<div class="checks"><label><input type="checkbox" id="ceRate"' + (lv ? ' checked' : '') + '>Rate how well it went (asks when it is logged)</label></div>' +
        '<div id="ceLvBox"' + (lv ? '' : ' hidden') + '><label class="field" for="ceLevels"><span>Levels, and the percent of the pay each one gets</span><input type="text" id="ceLevels" maxlength="120" value="' + esc(levelsText(lv || DEFAULT_LEVELS)) + '"></label>' +
        '<label class="field w-lg" for="ceHide"><span>Pet hides under the bed (no playing with it for ' + (Number(st.hideHours) || 24) + ' hours) when rated</span><select id="ceHide">' + hideOpts(lv || DEFAULT_LEVELS, c && c.hideLv) + '</select></label></div></fieldset>' +
      '<datalist id="catlist">' + cats.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<fieldset><legend>Who can do it</legend><div class="checks">' + act.map(function (p) {
        return '<label><input type="checkbox" name="who" value="' + esc(p.id) + '"' + (who.indexOf(p.id) >= 0 ? ' checked' : '') + '>' + esc(p.name) + '</label>';
      }).join('') + '</div></fieldset>' +
      /* when it can be done (cl-v35): days of the week, how often, shared by everyone, hidden on vacation */
      '<fieldset><legend>When</legend>' +
        '<div class="field"><span>Days it shows up (none ticked = every day)</span><div class="checks days">' + [1, 2, 3, 4, 5, 6, 0].map(function (i) {
          return '<label><input type="checkbox" name="cday" value="' + i + '"' + (c && daysOf(c) && daysOf(c).indexOf(i) >= 0 ? ' checked' : '') + '>' + DAYN[i] + '</label>';
        }).join('') + '</div></div>' +
        '<div class="wrap end"><label class="field w-md" for="ceFreq"><span>How often each kid can log it</span><select id="ceFreq">' + freqOpts(freqOf(c) ? c.freq : '') + '</select></label></div>' +
        '<div class="checks"><label><input type="checkbox" id="ceShared"' + (c && c.shared ? ' checked' : '') + '>Shared: once one kid does it, it’s done for everyone (that day, or that week if How often is weekly)</label>' +
        '</div><div class="wrap end"><label class="field w-lg" for="ceVac"><span>On vacation</span><select id="ceVac">' + VACS.map(function (x) { return '<option value="' + x[0] + '"' + (vacOf(c) === x[0] ? ' selected' : '') + '>' + (x[0] ? x[1] : 'Show it (home and away)') + '</option>'; }).join('') + '</select></label></div>' +
      '</fieldset>' +
      '<fieldset><legend>Big job</legend><div class="checks"><label><input type="checkbox" id="ceMajor"' + (c && c.major ? ' checked' : '') + '>Big job (counts toward Adventure Passes)</label></div>' +
        '<div id="ceBigBox"' + (c && c.major ? '' : ' hidden') + '><div class="checks"><label><input type="checkbox" id="ceEach"' + (c && c.majorEach ? ' checked' : '') + '>Everyone assigned must do it</label>' +
        '<label><input type="checkbox" id="ceTrip"' + (c && c.travel ? ' checked' : '') + '>Big job on trips only (not at home)</label></div>' +
        '<div class="field"><span>Counts as a big job on these days (none ticked = every day)</span><div class="checks days">' + [1, 2, 3, 4, 5, 6, 0].map(function (i) {
          return '<label><input type="checkbox" name="mday" value="' + i + '"' + (c && c.majorDays && c.majorDays.indexOf(i) >= 0 ? ' checked' : '') + '>' + DAYN[i] + '</label>';
        }).join('') + '</div></div></div></fieldset>' +
      '<fieldset><legend>Extras</legend><div class="checks"><label><input type="checkbox" id="ceReview"' + (c && c.review ? ' checked' : '') + '>Show it in the daily review (parents rate it for every kid at the end of the day)</label></div>' +
        '<div class="wrap end"><label class="field w-sm" for="ceBounty"><span>Bounty ($)</span><input type="text" id="ceBounty" inputmode="decimal" placeholder="0.00" value="' + (c && c.bountyCents ? dollars(c.bountyCents) : '') + '"></label></div></fieldset>' +
      '<p class="note">A bounty pays money when approved. People who do it together choose how to split it.</p>' +
      '<div class="wrap"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-act="cancelEdit">Cancel</button>' +
      (c ? '<button class="btn ' + (c.active === false ? '' : 'danger') + '" type="button" data-act="toggleChore" data-cid="' + esc(c.id) + '">' + (c.active === false ? 'Restore' : 'Archive') + '</button>' : '') + '</div></form></li>';
  }
  var TRAVEL = [
    ['Pack your own bag', 10, 'none', true], ['Unpack and put your clothes away', 10, 'none', false], ['Keep your seat area tidy', 4, 'none', true],
    ['Help carry bags', 4, 'none', false], ['Clean up after a meal', 4, 'food', true], ['Help set or clear the table', 4, 'food', false],
    ['Brush teeth in the morning', 4, 'clean', false], ['Brush teeth before bed', 4, 'clean', false], ['Shower', 4, 'clean', false], ['Put on sunscreen', 4, 'clean', false],
    ['In bed on time', 10, 'rest', false], ['Swim, hike or go for a walk', 4, 'energy', false], ['Kind to everyone all day', 10, 'none', false], ['Try a new food', 4, 'none', false]
  ];
  function addTravelChores() {
    var ids = kids().map(function (p) { return p.id; }), base = S.chores.reduce(function (m, c) { return Math.max(m, c.order || 0); }, 0);
    var ops = TRAVEL.map(function (t, i) { return { t: 'set', c: 'chores', id: 'travel-' + i, d: { name: t[0], pts: t[1], need: t[2], major: t[3], majorEach: false, majorDays: [], travel: true, cat: 'Travel', who: ids.slice(), active: true, order: base + 1 + i, bountyCents: 0 } }; });
    DB.commit(ops).then(function () { toast('Added ' + ops.length + ' travel chores'); }, fail);
  }
  function renameCat(oldN, newN) {
    newN = trim(newN);
    if (!newN || newN === oldN) { schedule(); return; }
    var order = uniq(catList(S.chores).filter(function (n) { return n !== 'Other'; }).map(function (n) { return n === oldN ? newN : n; }));
    var ops = S.chores.filter(function (c) { return catName(c) === oldN; }).map(function (c) { return { t: 'update', c: 'chores', id: c.id, d: { cat: newN } }; });
    DB.commit(ops).then(function () { return saveSettings({ catOrder: order }); }).then(function () { toast('Category renamed'); }, fail);
  }

  /* ================= events ================= */
  function entry(id) { return find(S.entries, function (e) { return e.id === id; }); }
  function onClick(e) {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    if (window.Pets && window.Pets.onClick(e)) return;
    var tabBtn = e.target.closest ? e.target.closest('[data-tab]') : null;
    if (tabBtn) {
      flushQueue();
      S.tab = tabBtn.getAttribute('data-tab'); LS.set(MODE === 'bank' ? 'cl.ptab' : 'cl.tab', S.tab);
      S.edit = null; S.bankForm = null; S.bankPid = null; S.picking = false; S.quest = null; S.avEditFor = null; S.txEdit = null;
      if (window.Pets) window.Pets.reset();
      go(); return;
    }
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!b || (b.tagName === 'INPUT' && b.type !== 'button')) return;
    var a = b.getAttribute('data-act'), d = function (k) { return b.getAttribute('data-' + k); };
    var list, c, pid, en;
    switch (a) {
      case 'adminToggle': if (S.admin) { if (MODE === 'bank') LS.set('cl.keep', null); setAdmin(null); toast(MODE === 'bank' ? 'Locked' : 'Parent mode locked'); } else if (S.adminOpen && MODE !== 'bank') { S.adminOpen = false; schedule(); } else openAdmin(); break;
      case 'adminOpen': openAdmin(); break;
      case 'roleKids': setRole('kids'); break;
      case 'adultAv': if (!needAdmin()) break; S.avEditFor = S.parent.id; if (window.Pets) window.Pets.G.dirtyAvatar = null; go(); window.scrollTo(0, 0); break;
      case 'adultSpot': if (!needAdmin()) break; DB.commit([{ t: 'merge', c: 'pets', id: S.parent.id, d: { spot: d('spot'), adult: true } }]).then(function () { toast(d('spot') ? 'The kids will find you there.' : 'You are off the map.'); }, fail); break;
      case 'toggleAdult': if (!needAdmin()) break; var tp = person(d('pid')); if (tp) DB.commit([{ t: 'update', c: 'people', id: tp.id, d: { adult: !tp.adult } }]).then(function () { toast(tp.name + (tp.adult ? ' is a kid again.' : ' is now a grown-up (no pet).')); }, fail); break;
      case 'roleParent': if (S.phase === 'app' && S.settingsDoc && ROLE && !S.admin) { needAdmin(); break; } setRole('parent'); break;
      case 'nudge': if (needAdmin()) sendNudge(d('cid'), [d('pid')]); break;
      case 'nudgeAll': if (needAdmin()) (function (cid) {
          var c = find(S.chores, function (x) { return x.id === cid; }); if (!c) return;
          sendNudge(cid, (c.who || []).filter(function (pid) { var p = person(pid), st = choreStatus(cid, pid); return p && p.active !== false && (st === 'none' || st === 'no'); }));
        })(d('cid')); break;
      case 'nudgeOk': case 'nudgeGo': (function (id, go2) {
          var n = find(S.nudges, function (x) { return x.id === id; }); if (!n) return;
          DB.commit([{ t: 'update', c: 'nudges', id: id, d: { seen: true, seenTs: Date.now() } }]).catch(function () {});
          n.seen = true;
          if (go2) { S.tab = 'log'; S.q = n.chore || ''; S.cat = 'all'; view.innerHTML = ''; go(); var q = $('#q'); if (q) q.value = S.q; } else schedule();
        })(d('id'), a === 'nudgeGo'); break;
      case 'pushOn': pushEnable(); break;
      case 'alertOk': if (needAdmin()) DB.commit((S.alerts || []).filter(function (x) { return !x.seen; }).map(function (x) { return { t: 'update', c: 'alerts', id: x.id, d: { seen: true } }; })).catch(fail); break;
      case 'pushNo': LS.set('cl.pushAsk', 'no'); schedule(); break;
      case 'devDel': if (needAdmin()) DB.commit([{ t: 'delete', c: 'devices', id: d('id') }]).then(function () { toast('Removed'); }, fail); break;
      case 'unkeep': LS.set('cl.keep', null); toast('The app will ask for your PIN again.'); touchAdmin(); go(); break;
      case 'adminClose': S.adminOpen = false; schedule(); break;
      case 'pick': S.picking = true; S.adminOpen = false; if (S.admin) setAdmin(null); schedule(); break;
      case 'choose':
        if (isPerson(S.me)) S.prevKid = S.me;
        S.me = d('pid'); S.lastMe = S.me; LS.set('cl.me', S.me); S.picking = false; S.bankPid = null; S.quest = null;
        if (window.Pets) window.Pets.reset();
        if (S.me === '@parent') { if (!S.admin) openAdmin(); } else if (S.admin) setAdmin(null);
        S.tab = S.me === '@parent' ? S.tab : 'log'; go(); pushRefresh(); break;
      case 'sel': S.sel = d('pid'); S.quest = null; schedule(); break;
      case 'give': S.give = S.give === d('k') ? '' : d('k'); schedule(); break;
      case 'cat': S.cat = d('cat'); updateLogList(); break;
      case 'logMode': S.logMode = d('m'); LS.set('cl.logmode', S.logMode); S.cat = 'all'; view.innerHTML = ''; go(); break;
      case 'chOpen': S.chOpen = S.chOpen === d('cid') ? null : d('cid'); updateChoreBoard(); break;
      case 'chAll': case 'chNone':
        (function (cid, on) { var c = find(S.chores, function (x) { return x.id === cid; }); if (!c) return; (c.who || []).forEach(function (pid) { S.chPick[cid + '|' + pid] = on; }); })(d('cid'), a === 'chAll');
        updateChoreBoard(); break;
      case 'chGo': if (needAdmin()) choreGo(d('cid')); break;
      case 'today': S.date = today(); S.dateAuto = true; schedule(); break;
      case 'inc':
        c = find(S.chores, function (x) { return x.id === d('cid'); }); pid = logTarget();
        if (!c || !pid || !canLog(pid, c)) break;
        if (c.bountyCents > 0) {
          var sh = {}; sh[pid] = 100; S.quest = { cid: c.id, shares: sh };
          renderQuestBox();
          var qb = $('#questBox'); if (qb && qb.scrollIntoView) qb.scrollIntoView();
        } else if (levelsOf(c)) { S.lvPick = { cid: c.id, pid: pid }; updateLogList(); }
        else addEntry(pid, S.date, c);
        break;
      case 'lvPick':
        c = find(S.chores, function (x) { return x.id === d('cid'); }); pid = logTarget();
        S.lvPick = null;
        if (c && pid && canLog(pid, c)) addEntry(pid, S.date, c, levelExtra(c, Number(d('i'))));
        updateLogList(); break;
      case 'lvCancel': S.lvPick = null; updateLogList(); break;
      case 'showDone': S.showDone = !S.showDone; updateLogList(); break;
      case 'rvPick': if (needAdmin()) { var rv = rvState(), rk = d('k'), ri = Number(d('i')), ex0 = rvEntry(rk.split('|')[0], rk.split('|')[1], rv.date), c0 = find(S.chores, function (x) { return x.id === rk.split('|')[1]; });
        var cur0 = ex0 ? (levelsOf(c0) ? levelsOf(c0).map(function (x) { return x.n; }).indexOf(ex0.lv) : 0) : -1;
        if (rv.picks[rk] === ri || (rv.picks[rk] === undefined && cur0 === ri && ex0 && ex0.status === 'approved')) delete rv.picks[rk]; else rv.picks[rk] = ri; renderReview(); } break;
      case 'rvSave': if (needAdmin()) rvSave(); break;
      case 'rvClear': rvState().picks = {}; renderReview(); break;
      case 'rvToday': S.rvDate = today(); renderReview(); break;
      case 'rvSetup': S.tab = 'setup'; S.ctable = true; go(); break;
      case 'qshare':
        if (!S.quest) break;
        var cur = S.quest.shares[d('pid')] || 0, tot = 0;
        Object.keys(S.quest.shares).forEach(function (k) { tot += S.quest.shares[k]; });
        var nv = Math.max(0, Math.min(100, cur + Number(d('d'))));
        if (nv > cur && tot >= 100) break;
        S.quest.shares[d('pid')] = nv; renderQuestBox();
        break;
      case 'qsave':
        c = S.quest && find(S.chores, function (x) { return x.id === S.quest.cid; });
        if (c) addQuest(c, S.quest.shares, S.date).then(function () { S.quest = null; toast('Bounty logged'); schedule(); }, fail);
        break;
      case 'qcancel': S.quest = null; renderQuestBox(); break;
      case 'dec':
        pid = logTarget();
        list = S.entries.filter(function (x) { return x.pid === pid && x.date === S.date && x.cid === d('cid') && !x.paid && !x.bountyPaid && (x.status === 'pending' || (S.admin && x.status === 'approved')); });
        list.sort(function (x, y) { return y.ts - x.ts; });
        if (!list[0]) { toast('Approved chores can only be removed by a parent.', true); break; }
        if (list[0].questId) {
          var qid = list[0].questId, ops = [];
          S.entries.forEach(function (x) { if (x.questId === qid) { ops.push({ t: 'delete', c: 'entries', id: x.id }); if (x.status === 'approved') ops = ops.concat(petGrantOps(x, -1)); } });
          DB.commit(ops).catch(fail);
        } else removeEntry(list[0]);
        break;
      case 'apMode': S.apMode = d('m'); LS.set('cl.apmode', S.apMode); go(); break;
      case 'apToggle': S.apClosed[d('key')] = !S.apClosed[d('key')]; go(); break;
      case 'apGroup':
        if (!needAdmin()) break;
        var gu = unitsFor(d('key')).filter(function (u) { return !S.apSkip[u.key]; });
        if (gu.length) queueDecision(gu, 'approved', unitLabel(gu));
        break;
      case 'apUnit': if (needAdmin()) decide(d('key'), 'approved'); break;
      case 'rjGroup':
        if (!needAdmin()) break;
        (function (key) { confirmTap('rjg' + key, function () { var ru = unitsFor(key).filter(function (u) { return !S.apSkip[u.key]; }); if (ru.length) queueDecision(ru, 'rejected', unitLabel(ru)); }); })(d('key'));
        break;
      case 'rjRest':
        if (!needAdmin()) break;
        confirmTap('rjRest', function () { var rr2 = pendingUnits(); if (rr2.length) queueDecision(rr2, 'rejected', 'all ' + rr2.length); });
        break;
      case 'dupAll': if (needAdmin()) confirmTap('dupAll', function () { dupRemove(dupGroups()); }); break;
      case 'dupKeep': if (needAdmin()) { var dk = d('k'); dupRemove(dupGroups().filter(function (g) { return g.key === dk; })); } break;
      case 'dupDeny':
        if (!needAdmin()) break;
        (function (k) { confirmTap('dupNo' + k, function () {
          var g = dupGroups().filter(function (x) { return x.key === k; })[0]; if (!g) return;
          queueDecision([{ key: 'dup' + k, quest: false, entries: g.entries }], 'rejected', g.entries.length + ' ' + g.entries[0].name);
        }); })(d('k'));
        break;
      case 'rjUnit': if (needAdmin()) decide(d('key'), 'rejected'); break;
      case 'apRest':
        if (!needAdmin()) break;
        var rest = pendingUnits(); if (rest.length) queueDecision(rest, 'approved', 'the remaining ' + rest.length);
        break;
      case 'undo': undoLast(); break;
      case 'grantPass': if (needAdmin()) ADV.grantPass(d('pid'), 30).then(function () { toast('Added 30 adventure minutes for ' + pname(d('pid'))); }, fail); break;
      case 'addTravel': if (needAdmin()) addTravelChores(); break;
      case 'reopen':
        if (!needAdmin()) break;
        en = entry(d('id')); if (en) setStatus([en], 'pending').then(function () { toast('Moved back to waiting'); }, fail);
        break;
      case 'rm':
        en = entry(d('id'));
        if (!en) break;
        if (en.status !== 'pending' && !needAdmin()) break;
        confirmTap('rm' + en.id, function () { removeEntry(en); });
        break;
      case 'older':
        DB.query({ c: 'entries', where: [['date', '<', addDays(today(), -LIVE_DAYS)]], orderBy: ['date', 'desc'], limit: 1000 })
          .then(function (l) { S.older = l; go(); }, fail);
        break;
      case 'csv': downloadCsv(); break;
      case 'mtgOpen': if (!needAdmin()) break; S.mtg = { open: true, since: null }; window.scrollTo(0, 0);
        mtgLoadList().then(function (l) { if (S.mtg && S.mtg.since == null) { S.mtg.since = l[0] ? l[0].id : '30'; schedule(); } }, fail); go(); break;
      case 'mtgClose': S.mtg = null; go(); break;
      case 'mtgShare': mtgShare(); break;
      /* lists */
      case 'shopTick': shopTick(d('id')); break;
      case 'shopDel': if (needAdmin()) (function (id) { confirmTap('shopDel' + id, function () { DB.commit([{ t: 'delete', c: 'shop', id: id }]).catch(fail); }); })(d('id')); break;
      case 'shopClear': shopClear(); break;
      case 'shopAgain': addShop(d('t')); break;
      case 'shopShare': shareText('Shopping list', 'Shopping list\n' + shopSorted().open.map(function (x) { return '• ' + x.text; }).join('\n'), 'List copied. Paste it into a text.'); break;
      case 'agTick': if (needAdmin()) (function (x) { if (x) DB.commit([{ t: 'update', c: 'agenda', id: x.id, d: { talked: !x.talked } }]).catch(fail); })(find(S.agenda, function (y) { return y.id === d('id'); })); break;
      case 'agDel': if (needAdmin()) (function (id) { confirmTap('agDel' + id, function () { DB.commit([{ t: 'delete', c: 'agenda', id: id }]).catch(fail); }); })(d('id')); break;
      case 'mtgStart': if (needAdmin()) confirmTap('mtgStart', mtgStart); break;
      /* bank */
      case 'acct': S.bankPid = d('pid'); S.bankForm = null; S.allTx = null; go(); break;
      case 'bankHome': S.bankPid = null; S.bankForm = null; go(); break;
      case 'bform':
        var f = d('f') || null;
        if ((f === 'deposit' || f === 'withdraw' || f === 'transfer') && !needAdmin()) break;
        S.bankForm = S.bankForm === f ? null : f; go();
        setTimeout(function () { var i = $('#rqItem') || $('#mAmt') || $('#tAmt'); if (i) i.focus(); }, 80);
        break;
      case 'txEdit': if (!needAdmin()) break; S.txEdit = d('id'); S.armed = null; go(); break;
      case 'txCancel': S.txEdit = null; go(); break;
      case 'txDelete':
        if (!needAdmin()) break;
        confirmTap('txdel' + d('id'), function () {
          var dt = findTx(d('id')); if (!dt) return;
          DB.commit(txDeleteOps(dt)).then(function () { S.txEdit = null; S.allTx = null; toast('Transaction deleted'); go(); }, fail);
        });
        break;
      case 'allTx':
        var ap = d('pid');
        DB.query({ c: 'txns', where: [['pid', '==', ap]] }).then(function (l) { l.sort(function (x, y) { return y.ts - x.ts; }); S.allTx = { pid: ap, list: l }; go(); }, fail);
        break;
      case 'payday': if (needAdmin()) confirmTap('payday', payday); break;
      case 'cashIn': cashIn(d('pid')); break;
      case 'logFor': if (!needAdmin()) break; S.tab = 'log'; S.logMode = 'person'; S.sel = d('pid'); S.bankPid = null; S.cat = 'all'; S.q = ''; view.innerHTML = ''; go(); window.scrollTo(0, 0); break;
      case 'reqApprove':
        if (!needAdmin()) break;
        var r = find(S.reqs, function (x) { return x.id === d('id'); });
        if (!r || r.status !== 'pending') break;
        var bal = Number((person(r.pid) || {}).balance) || 0;
        if (bal < r.cents && S.armed !== 'rq' + r.id) { S.armed = 'rq' + r.id; schedule(); break; }
        S.armed = null;
        bankTx(r.pid, -r.cents, 'purchase', r.item, [{ t: 'update', c: 'requests', id: r.id, d: { status: 'approved', decidedTs: Date.now(), decidedBy: S.parent.id } }])
          .then(function () { toast('Approved. ' + money(r.cents) + ' taken from ' + pname(r.pid) + '.'); }, fail);
        break;
      case 'reqDeny':
        if (!needAdmin()) break;
        DB.commit([{ t: 'update', c: 'requests', id: d('id'), d: { status: 'denied', decidedTs: Date.now(), decidedBy: S.parent.id } }]).then(function () { toast('Request denied'); }, fail);
        break;
      case 'reqCancel':
        DB.commit([{ t: 'delete', c: 'requests', id: d('id') }]).then(function () { toast('Request cancelled'); }, fail);
        break;
      /* setup */
      case 'togglePerson':
        if (!needAdmin()) break;
        var p = person(d('pid')); if (p) DB.commit([{ t: 'update', c: 'people', id: p.id, d: { active: p.active === false } }]).catch(fail);
        break;
      case 'rmParent':
        if (!needAdmin()) break;
        var rid = d('id');
        confirmTap('rmp' + rid, function () { saveSettings({ parents: (S.settings.parents || []).filter(function (x) { return x.id !== rid; }) }).then(function () { toast('Parent removed'); }, fail); });
        break;
      case 'newChore': S.edit = 'new'; go(); break;
      case 'ctOpen': S.ctable = true; S.edit = null; ctState().msg = ''; go(); window.scrollTo(0, 0); break;
      case 'ctClose':
        if (ctCount() && S.armed !== 'ctClose') { S.armed = 'ctClose'; toast('You have unsaved changes. Tap Setup again to leave them for later.'); setTimeout(function () { if (S.armed === 'ctClose') S.armed = null; }, 4000); break; }
        S.armed = null; S.ctable = false; S.fromData = false; go(); window.scrollTo(0, 0); break;
      case 'ctSave': ctSave(); break;
      case 'ctBulkVac': ctBulkVac(); break;
      case 'ctDiscard': confirmTap('ctDiscard', function () { var ct = ctState(); ct.d = {}; ct.n = []; ct.msg = ''; renderChoreTable(); }); break;
      case 'ctAdd': ctState().n.push(ctNewRow(ctState().cat)); renderChoreTable();
        var nr = $$('.ct-t tr.new input[data-f=name]'); if (nr.length) nr[nr.length - 1].focus(); break;
      case 'ctGive': ctState().give = d('k'); renderChoreTable(); break;
      case 'ctBulk': ctBulk(); break;
      case 'ctBulkLv': ctBulkLv(false); break;
      case 'ctBulkLvOff': ctBulkLv(true); break;
      case 'ctDown': ctDownload(); break;
      case 'ctUp': var cf = $('#ctFile'); if (cf) { cf.value = ''; cf.click(); } break;
      case 'editChore': S.edit = d('cid'); go(); break;
      case 'cancelEdit': S.edit = null; go(); break;
      case 'toggleChore':
        var ch = find(S.chores, function (x) { return x.id === d('cid'); });
        if (ch) DB.commit([{ t: 'update', c: 'chores', id: ch.id, d: { active: ch.active === false } }]).then(function () { S.edit = null; go(); }, fail);
        break;
      case 'catMove':
        var order = catList(S.chores).filter(function (x) { return x !== 'Other'; });
        var i = order.indexOf(d('cat')), j = i + Number(d('dir'));
        if (i < 0 || j < 0 || j >= order.length) break;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        saveSettings({ catOrder: order }).catch(fail);
        break;
      case 'exportFamily': exportFamily(); break;
      case 'nrRetry': location.reload(); break;
      case 'nrMode': try { if (DB.longPoll) localStorage.removeItem('cl.lp'); else localStorage.setItem('cl.lp', '1'); } catch (e2) {} location.reload(); break;
      case 'nrSignout': confirmTap('nrSignout', function () { DB.logout().then(function () { location.reload(); }, function () { location.reload(); }); }); break;
      case 'signout': confirmTap('signout', function () { DB.logout().then(function () { location.reload(); }); }); break;
      case 'resetDemo': confirmTap('resetDemo', function () { DB.resetDemo(); LS.set('cl.me', null); location.reload(); }); break;
      /* wizard */
      case 'wzAdd': wizAddPerson(); break;
      case 'wzDel': S.wiz.people.splice(Number(d('i')), 1); renderWizard(); break;
      case 'wzSample': S.wiz.people = ['Alex', 'Sam', 'Riley']; renderWizard(); break;
      case 'wzClearImport': S.wiz.imported = null; renderWizard(); break;
    }
  }
  function onChange(e) {
    var t = e.target, a = t.getAttribute('data-act');
    if (t.id === 'date') { if (t.value) { S.date = t.value; S.dateAuto = t.value === today(); schedule(); } }
    else if (t.id === 'sort') { S.sort = t.value; updateLogList(); }
    else if (t.id === 'wzFile') wizImport(t.files && t.files[0]);
    else if (t.getAttribute('data-ct')) ctEdit(t);
    else if (t.id === 'rvDate') { if (t.value) { S.rvDate = t.value > today() ? today() : t.value; renderReview(); } }
    else if (t.id === 'ctCat') { ctState().cat = t.value; renderChoreTable(); }
    else if (t.id === 'ctArch') { ctState().arch = t.checked; renderChoreTable(); }
    else if (t.id === 'ctFile' && t.files && t.files[0]) {
      var cfile = t.files[0], fr = new FileReader();
      fr.onload = function () { ctImport(String(fr.result || ''), cfile.name); };
      fr.onerror = function () { toast('Could not read that file.', true); };
      fr.readAsText(cfile);
    }
    else if (t.name === 'wzStarter') S.wiz.starter = t.value === '1';
    else if (t.getAttribute('data-hist')) { S.hist[t.getAttribute('data-hist')] = t.value; go(); }
    else if (t.getAttribute('data-mtg') === 'since' && S.mtg) { S.mtg.since = t.value; S.mtg.entries = null; S.mtg.loading = false; go(); }
    else if (t.id === 'mtgNotes' && S.mtg) S.mtg.notes = t.value;
    else if (a === 'showArch') { S.showArchived = t.checked; updateChoreList(); }
    else if (a === 'chPick') { S.chPick[t.getAttribute('data-cid') + '|' + t.getAttribute('data-pid')] = !!t.checked; updateChoreBoard(); }
    else if (t.id === 'ceRate') { var lb = $('#ceLvBox'); if (lb) lb.hidden = !t.checked; }
    else if (t.id === 'ceMajor') { var bb = $('#ceBigBox'); if (bb) bb.hidden = !t.checked; }
    else if (a === 'chLv') { S.chLv[t.getAttribute('data-cid')] = Number(t.value); }
    else if (a === 'apLevel') setLevel(t.getAttribute('data-id'), Number(t.value));
    else if (a === 'apSel') { var sk = t.getAttribute('data-key'); if (t.checked) delete S.apSkip[sk]; else S.apSkip[sk] = 1; go(); }
    else if (a === 'rename') {
      var nm = trim(t.value);
      if (nm && needAdmin()) DB.commit([{ t: 'update', c: 'people', id: t.getAttribute('data-pid'), d: { name: nm } }]).catch(fail);
      else schedule();
    }
    else if (a === 'renameCat') { if (needAdmin()) renameCat(t.getAttribute('data-old'), t.value); else schedule(); }
  }
  function onInput(e) {
    var t = e.target;
    if (t.id === 'q') { S.q = t.value; updateLogList(); }
    else if (t.id === 'cq') { S.cq = t.value; updateChoreList(); }
    else if (t.id === 'ceLevels') { var hs = $('#ceHide'); if (hs) { var keep = hs.value; hs.innerHTML = hideOpts(parseLevels(t.value), keep); } }
    else if (t.id === 'ctq') { ctState().q = t.value; clearTimeout(S.ctqT); S.ctqT = setTimeout(function () { renderChoreTable(); var q = $('#ctq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
    else if (t.getAttribute('data-ct') && t.type !== 'checkbox' && t.tagName !== 'SELECT') ctEdit(t);
  }
  function onKey(e) { if (e.keyCode === 13 && e.target.id === 'wzPerson') { e.preventDefault(); wizAddPerson(); } }
  function onSubmit(e) {
    e.preventDefault();
    var f = e.target, kind = f.getAttribute('data-form');
    if (window.Pets && window.Pets.onSubmit(f, kind)) return;
    if (kind === 'login') {
      var em = val('lgEmail'), pw = val('lgPw');
      if (!em || !pw) { toast('Enter the email and password.', true); return; }
      DB.login(em, pw).then(function () { startApp(); }, function (err) {
        toast(/password|user-not-found|invalid/.test(err && err.code || '') ? 'Email or password is wrong.' : 'Could not sign in: ' + (err && err.message || 'unknown error'), true);
      });
      return;
    }
    if (kind === 'wizard') { var wp = $('#wzPerson'); if (wp && trim(wp.value)) wizAddPerson(); wizCreate(); return; }
    if (kind === 'pin') { submitPin('unlock', val('pin')); return; }
    if (kind === 'shop' || kind === 'agenda') { var li = f.querySelector('input'); if (!li) return; if (kind === 'shop') addShop(li.value); else addAgenda(li.value); li.value = ''; return; }
    if (kind === 'request') {
      var pid = S.bankPid, item = trim(val('rqItem')), cents = parseMoney(val('rqAmt'));
      if (!item) { toast('Say what you want to buy.', true); return; }
      if (!(cents > 0)) { toast('Enter a price like 12.99', true); return; }
      DB.commit([{ t: 'set', c: 'requests', id: DB.newId('requests'), d: { pid: pid, item: item, cents: cents, note: trim(val('rqNote')), status: 'pending', ts: Date.now(), by: S.me } }])
        .then(function () { S.bankForm = null; toast('Request sent'); go(); }, fail);
      return;
    }
    if (!needAdmin()) return;
    if (kind === 'newpin') submitPin('change', val('npin'), val('npin2'), '', function () { f.reset(); });
    else if (kind === 'addparent') submitPin('add', val('apPin'), val('apPin2'), val('apName'), function () { f.reset(); });
    else if (kind === 'txedit') {
      var et = findTx(f.getAttribute('data-id')), eAmt = parseMoney(val('teAmt'));
      if (!et) { S.txEdit = null; go(); return; }
      if (!(eAmt > 0)) { toast('Enter an amount like 5.00, or use Delete.', true); return; }
      var eCents = et.cents < 0 ? -eAmt : eAmt;
      DB.commit(txSaveOps(et, trim(val('teMemo')), eCents)).then(function () { S.txEdit = null; S.allTx = null; toast('Transaction updated'); go(); }, fail);
    }
    else if (kind === 'money') {
      var k = f.getAttribute('data-kind'), amt = parseMoney(val('mAmt'));
      if (!(amt > 0)) { toast('Enter an amount like 5.00', true); return; }
      bankTx(S.bankPid, k === 'deposit' ? amt : -amt, k, trim(val('mMemo')) || (k === 'deposit' ? 'Deposit' : isDad(S.bankPid) ? 'Spending' : 'Withdrawal'))
        .then(function () { S.bankForm = null; toast((k === 'deposit' ? 'Deposited ' : 'Recorded ') + money(amt)); go(); }, fail);
    } else if (kind === 'transfer') {
      var to = val('tTo'), tAmt = parseMoney(val('tAmt')), memo = trim(val('tMemo')), from = S.bankPid;
      if (!to || !(tAmt > 0)) { toast('Pick who gets it and an amount.', true); return; }
      var pair = DB.newId('txns');
      var tops = txOps(from, -tAmt, 'transfer', 'To ' + pname(to) + (memo ? ': ' + memo : ''), { pair: pair }).concat(txOps(to, tAmt, 'transfer', 'From ' + pname(from) + (memo ? ': ' + memo : ''), { pair: pair }));
      DB.commit(tops).then(function () { S.bankForm = null; toast('Sent ' + money(tAmt) + ' to ' + pname(to)); go(); }, fail);
    } else if (kind === 'person') {
      var name = trim(val('newName')); if (!name) return;
      var copy = val('copyFrom'), id = slug(name), n = 1;
      while (person(id)) id = slug(name) + '-' + (++n);
      var order = S.people.reduce(function (m, p) { return Math.max(m, typeof p.order === 'number' ? p.order : 0); }, -1) + 1;
      var pops = [{ t: 'set', c: 'people', id: id, d: { name: name, order: order, active: true, balance: 0 } }];
      if (copy) S.chores.forEach(function (c) { if ((c.who || []).indexOf(copy) >= 0) pops.push({ t: 'update', c: 'chores', id: c.id, d: { who: c.who.concat([id]) } }); });
      DB.commit(pops).then(function () { toast(name + ' added'); f.reset(); }, fail);
    } else if (kind === 'chore') {
      var cid = f.getAttribute('data-cid'), cname = trim(val('ceName')), pts = Math.max(0, Math.round(Number(val('cePts')) || 0)), cat = trim(val('ceCat'));
      var bounty = parseMoney(val('ceBounty')), rw = cleanRw({ food: val('ceFood'), clean: val('ceClean'), tuck: val('ceTuck'), play: val('cePlay'), any: val('ceAny') });
      var levels = $('#ceRate').checked ? parseLevels(val('ceLevels')) : [];
      if ($('#ceRate').checked && !levels.length) levels = DEFAULT_LEVELS;
      var hideLv = levels.length && levels.some(function (x) { return x.n === val('ceHide'); }) ? val('ceHide') : '';
      if (!cname) { toast('Enter a name for the chore.', true); return; }
      if (isNaN(bounty)) { toast('Enter the bounty like 5.00, or leave it empty.', true); return; }
      var who = $$('input[name=who]', f).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      var mdays = $$('input[name=mday]', f).filter(function (x) { return x.checked; }).map(function (x) { return Number(x.value); });
      var cdays = $$('input[name=cday]', f).filter(function (x) { return x.checked; }).map(function (x) { return Number(x.value); }).sort();
      if (cdays.length === 7) cdays = [];
      var data = { name: cname, pts: pts, who: who, cat: cat, rw: rw, need: compatNeed(rw), coins: rw.food || rw.clean || 0, levels: levels, hideLv: hideLv, freq: val('ceFreq') || '', review: $('#ceReview').checked, bountyCents: bounty, major: $('#ceMajor').checked, majorEach: $('#ceEach').checked, majorDays: mdays, travel: $('#ceTrip').checked, homeOnly: val('ceVac') === 'hide', tripOnly: val('ceVac') === 'only', days: cdays, shared: $('#ceShared').checked };
      var op = cid ? { t: 'update', c: 'chores', id: cid, d: data }
        : { t: 'set', c: 'chores', id: DB.newId('chores'), d: assign(data, { active: true, order: S.chores.reduce(function (m, c) { return Math.max(m, c.order || 0); }, 0) + 1 }) };
      var eff = catList(S.chores).filter(function (x) { return x !== 'Other'; });
      DB.commit([op]).then(function () {
        S.edit = null; toast('Chore saved'); go();
        if (cat && eff.indexOf(cat) < 0) return saveSettings({ catOrder: eff.concat([cat]) });
      }).catch(fail);
    } else if (kind === 'advset') {
      var from = val('vFrom'), to = val('vTo');
      if ((from && !to) || (!from && to) || (from && to && from > to)) { toast('Pick both vacation dates, with the start first.', true); return; }
      saveSettings({ passBigJobs: Math.max(1, Math.round(Number(val('aJobs')) || 2)), passMinutes: Math.max(5, Number(val('aMin')) || 30), goldenMinutes: Math.max(5, Number(val('aGold')) || 45),
        earlyBy: val('aEarly') || '10:00', advWeekday: [val('aWd1') || '16:00', val('aWd2') || '19:00'], advWeekend: [val('aWe1') || '09:00', val('aWe2') || '19:00'],
        vacation: { from: from, to: to }, vacMinutes: Math.max(5, Number(val('vMin')) || 60), vacAutoPass: $('#vAuto').checked }).then(function () { toast('Saved'); go(); }, fail);
    } else if (kind === 'money2') {
      var rate = Number(S.settings.centsPerPoint) || 0, e1 = parseMoney(val('evo1')), e2 = parseMoney(val('evo2')), al = parseMoney(val('allow'));
      if (isNaN(e1) || isNaN(e2) || isNaN(al)) { toast('Check the numbers: use amounts like 5.00', true); return; }
      var dn = function (id, d, mx) { var v = Math.round(Number(val(id))); return val(id) === '' || isNaN(v) ? d : Math.max(0, Math.min(mx || 200, v)); };
      var p2 = { logCooldown: dn('lgWait', 60, 3600), logCap: dn('lgCap', 5, 100), hideHours: Math.max(1, dn('hHours', 24, 168)), nightOff: !$('#nOn').checked, nightStart: val('nFrom') || '20:00', nightEnd: val('nTo') || '06:30',
        drainFood: dn('dFood', 50), drainClean: dn('dClean', 25), drainRest: dn('dRest', 50), drainEnergy: dn('dEnergy', 50),
        foodCoins: Math.max(1, Math.round(Number(val('fcoins')) || 10)), mealPrice: Math.max(1, Math.round(Number(val('mprice')) || 10)), careCoins: Math.max(1, Math.round(Number(val('ccoins')) || 10)), kitPrice: Math.max(1, Math.round(Number(val('kprice')) || 10)),
        coinsPerDollar: Math.max(1, Math.round(Number(val('cpd')) || 100)), swapPrice: Math.max(1, Math.round(Number(val('ppc')) || 20)), toothPrice: Math.max(1, Math.round(Number(val('tprice')) || 20)), ballPrice: Math.max(1, Math.round(Number(val('bprice')) || 20)), bankName: trim(val('bname')) || 'Family Bank', requireApproval: $('#reqAppr').checked, centsPerPoint: rate, petEvolve1Cents: e1, petEvolve2Cents: e2, dadPid: val('dad'), allowanceCents: al, allowanceDay: Number(val('aday')), allowanceVacPause: $('#aVacPause').checked };
      if (p2.dadPid !== S.settings.dadPid || p2.allowanceDay !== Number(S.settings.allowanceDay) || !S.settings.allowanceLast) p2.allowanceLast = lastAllowanceDay(p2.allowanceDay);
      saveSettings(p2).then(function () { toast('Saved'); go(); }, fail);
    }
  }
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('focusout', function () {
    if (!S.dirty) return;
    if (S.tab === 'setup' && (S.edit || S.ctable)) S.fromData = true;   /* refresh the header (badges) but leave the editor as it is */
    setTimeout(schedule, 300);
  });
  document.addEventListener('click', touchAdmin, true);
  document.addEventListener('keydown', touchAdmin, true);
  document.addEventListener('touchstart', function () { S.lastActive = Date.now(); }, true);
  /* Shared devices: back to the profile picker after 5 idle minutes. */
  function maybeRepick() {
    if (MODE !== 'family' || S.phase !== 'app' || S.picking || !S.me) return;
    if (Date.now() - S.lastActive > IDLE_PICK_MS) {
      S.me = null; S.quest = null; if (S.admin) setAdmin(null);
      if (window.Pets) window.Pets.reset();
      schedule();
    }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushQueue(); else maybeRepick(); });
  window.addEventListener('pagehide', flushQueue);

  /* ================= data ================= */
  function watch(name, spec, apply) {
    DB.watch(spec, function (res, meta) { if (apply(res, meta || {}) === false) return; S.ready[name] = true; S.fromData = true; schedule(); });
  }
  function startApp() {
    S.phase = 'app'; S.startedAt = Date.now(); schedule();
    setTimeout(schedule, 12500);
    watch('people', { c: 'people' }, function (a) { a.sort(function (x, y) { return (x.order || 0) - (y.order || 0); }); S.people = a; });
    watch('chores', { c: 'chores' }, function (a) { S.chores = a; });
    watch('entries', { c: 'entries', where: [['date', '>=', addDays(today(), -LIVE_DAYS)]] }, function (a) { S.entries = a; });
    watch('txns', { c: 'txns', orderBy: ['ts', 'desc'], limit: 300 }, function (a) { S.txns = a; });
    watch('reqs', { c: 'requests', orderBy: ['ts', 'desc'], limit: 150 }, function (a) { S.reqs = a; });
    watch('pets', { c: 'pets' }, function (a) { var m = {}; a.forEach(function (p) { m[p.id] = p; }); S.pets = m; });
    if (window.C3D) C3D.onReady(function () { schedule(); });
    /* "no settings" read from this device's own cache (no connection yet) must never look like a brand-new household:
       that would open the setup form and could overwrite the real family data once the device reconnects */
    watch('settings', { c: 'meta', id: 'settings' }, function (d, meta) {
      if (!d && meta.cache) { S.noReach = true; schedule(); return false; }
      S.noReach = false; S.settingsDoc = d; S.settings = assign({}, DEFAULTS, d || {});
    });
    watch('adv', { c: 'adv', id: today() }, function (d) { S.adv = d || {}; });
    watch('nudges', { c: 'nudges', where: [['date', '>=', addDays(today(), -1)]] }, function (a) { S.nudges = a; });
    watch('devices', { c: 'devices' }, function (a) { S.devices = a; });
    watch('alerts', { c: 'alerts', where: [['date', '>=', addDays(today(), -7)]] }, function (a) { S.alerts = a; });
    watch('shop', { c: 'shop' }, function (a) { S.shop = a; });
    watch('agenda', { c: 'agenda' }, function (a) { S.agenda = a; });
    watch('shopMeta', { c: 'meta', id: 'shop' }, function (d) { S.shopMeta = d || {}; });
    setTimeout(function () { pushRefresh(); }, 2500);
    setInterval(function () {
      if (S.dateAuto && S.date !== today()) { S.date = today(); schedule(); }
      maybeRepick();
    }, 30000);
  }
  DB.onError = function (err) {
    var c = err && err.code || '';
    toast(/permission/.test(c) ? 'This sign-in does not have access to the household data.' : 'Lost contact with the database. Retrying...', true);
  };
  DB.onAuthChange = function () { if (DB.needsLogin()) { S.phase = 'login'; schedule(); } };

  /* Shared helpers for the pet game (js/pets.js). */
  window.CL = {
    S: S, schedule: schedule, go: go, toast: toast, fail: fail, esc: esc, money: money, today: today, addDays: addDays, daysBetween: daysBetween,
    fmtDate: fmtDate, person: person, pname: pname, pIndex: pIndex, pCls: pCls, pColor: pColor, isPerson: isPerson, isDad: isDad, isAdult: isAdult, kids: kids, activePeople: activePeople,
    txOps: txOps, accountHtml: accountHtml, needAdmin: needAdmin, logTarget: logTarget, confirmTap: confirmTap, bankName: bankName
  };

  DB.start(window.CL_CONFIG).then(function () {
    if (DB.needsLogin()) { S.phase = 'login'; schedule(); return; }
    startApp();
  }, function (e) { S.phase = 'error'; S.err = (e && e.message) || 'Unknown error'; schedule(); });
  schedule();

  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.CL_CONFIG && window.CL_CONFIG.offline !== false) {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }
})();
