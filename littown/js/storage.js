/* Lit Town — storage, profiles and backups (ES5).
 *
 * Inside the Android app, data is saved with the Capacitor Preferences plugin
 * (Android SharedPreferences — survives WebView cache clearing). A copy is also kept
 * in localStorage. In a desktop browser only localStorage is used.
 * Everything is cached in memory at start-up, so reads are synchronous.
 *
 * Keys:  lt.index        { version, profileIds[], settings{} }
 *        lt.p.<id>       one child profile (see newProfile())
 * Data saved under the old "wt." keys (before the app was renamed from Word Town) is copied
 * to "lt." keys on first start; the old keys are left in place, untouched.
 */
(function (w) {
  var RA = w.RA = w.RA || {};
  var U = RA.U;
  var PREFIX = 'lt.';
  var OLD_PREFIX = 'wt.';
  var cache = {};
  var mode = 'memory';
  var lastError = null;

  function prefs() {
    var C = w.Capacitor;
    if (!C || !C.Plugins || !C.Plugins.Preferences) { return null; }
    if (C.isNativePlatform && !C.isNativePlatform()) { return null; }
    return C.Plugins.Preferences;
  }

  function fs() {
    var C = w.Capacitor;
    return (C && C.Plugins && C.Plugins.Filesystem && (!C.isNativePlatform || C.isNativePlatform())) ? C.Plugins.Filesystem : null;
  }

  function lsGet(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); return true; } catch (e) { lastError = e; return false; } }
  function lsRemove(k) { try { w.localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function lsKeys() {
    var out = [], i, k;
    try { for (i = 0; i < w.localStorage.length; i++) { k = w.localStorage.key(i); if (k && (k.indexOf(PREFIX) === 0 || k.indexOf(OLD_PREFIX) === 0)) { out.push(k); } } } catch (e) { /* ignore */ }
    return out;
  }

  function parse(s) { if (s == null) { return null; } try { return JSON.parse(s); } catch (e) { return null; } }

  var Store = RA.Store = {};

  /** Load everything into memory, then cb(). Never fails: worst case = empty memory store. */
  Store.init = function (cb) {
    var P = prefs();
    function fromLocal() {
      var ks = lsKeys(), i;
      for (i = 0; i < ks.length; i++) { if (cache[ks[i]] === undefined) { cache[ks[i]] = parse(lsGet(ks[i])); } }
    }
    function finish() {
      migrateOldKeys();
      if (!cache[PREFIX + 'index']) { cache[PREFIX + 'index'] = { version: 1, profileIds: [], settings: {} }; }
      cb();
    }
    if (!P) {
      mode = lsSet(PREFIX + 'probe', '1') ? 'localStorage' : 'memory';
      lsRemove(PREFIX + 'probe');
      fromLocal();
      finish();
      return;
    }
    mode = 'native';
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; mode = 'localStorage'; fromLocal(); finish(); }, 4000);
    P.keys().then(function (res) {
      var keys = (res && res.keys) || [], wanted = [], i;
      for (i = 0; i < keys.length; i++) { if (keys[i].indexOf(PREFIX) === 0 || keys[i].indexOf(OLD_PREFIX) === 0) { wanted.push(keys[i]); } }
      var left = wanted.length;
      if (!left) { done(); return; }
      for (i = 0; i < wanted.length; i++) {
        (function (k) {
          P.get({ key: k }).then(function (r) { if (timedOut) { return; } cache[k] = parse(r && r.value); step(); }, step);
        })(wanted[i]);
      }
      function step() { if (timedOut) { return; } left--; if (left === 0) { done(); } }
      function done() {
        if (timedOut) { return; }
        clearTimeout(timer);
        // migrate anything that only exists in localStorage (e.g. from an older build)
        var before = {}, k;
        for (k in cache) { if (cache.hasOwnProperty(k)) { before[k] = true; } }
        fromLocal();
        for (k in cache) { if (cache.hasOwnProperty(k) && !before[k]) { Store.write(k, cache[k]); } }
        finish();
      }
    }, function (err) {
      if (timedOut) { return; }
      clearTimeout(timer);
      lastError = err; mode = 'localStorage'; fromLocal(); finish();
    });
  };

  /* Copy "wt." data (saved before the rename) to "lt." keys, once. */
  function migrateOldKeys() {
    if (cache[PREFIX + 'index'] || !cache[OLD_PREFIX + 'index']) { return; }
    var k;
    for (k in cache) {
      if (cache.hasOwnProperty(k) && k.indexOf(OLD_PREFIX) === 0 && cache[PREFIX + k.slice(OLD_PREFIX.length)] === undefined) {
        Store.write(PREFIX + k.slice(OLD_PREFIX.length), cache[k]);
      }
    }
  }

  Store.mode = function () { return mode; };
  Store.lastError = function () { return lastError; };

  Store.read = function (key) { return cache[key] === undefined ? null : cache[key]; };

  Store.write = function (key, value) {
    cache[key] = value;
    var s;
    try { s = JSON.stringify(value); } catch (e) { lastError = e; return; }
    lsSet(key, s);
    var P = prefs();
    if (P) { P.set({ key: key, value: s }).then(null, function (err) { lastError = err; }); }
  };

  Store.remove = function (key) {
    delete cache[key];
    lsRemove(key);
    var P = prefs();
    if (P) { P.remove({ key: key }).then(null, function (err) { lastError = err; }); }
  };

  /* ---------- index & settings ---------- */

  function index() { return cache[PREFIX + 'index']; }
  function saveIndex() { Store.write(PREFIX + 'index', index()); }

  Store.settings = function () {
    var s = index().settings || (index().settings = {});
    if (s.volume == null) { s.volume = 1; }
    if (s.grownupCheck == null) { s.grownupCheck = false; }
    if (s.sfx == null) { s.sfx = true; }
    return s;
  };
  Store.saveSettings = function () { saveIndex(); };

  /* ---------- profiles ---------- */

  Store.newProfile = function (name) {
    var start = (RA.Engine && RA.Engine.flameConfig) ? RA.Engine.flameConfig().startingFlames : 0;
    return {
      v: 7,                      // saved-progress format (see Engine.migrateProfile)
      id: U.id('kid'),
      name: name || 'Reader',
      created: U.today(),
      font: 'andika',            // 'andika' | 'dyslexic'
      look: null,                // avatar config (see avatar-render.js)
      progress: {
        unlocked: 1,             // highest lesson she may start (opened by accuracy, not flames)
        working: 1,              // where she practises now ("Read: lesson N"); can step back
        highest: 0,              // highest lesson reached (passed or placed): places, house, shop, unlocks
        firstCheck: false,       // after a placement test: her first lesson must be passed easily
        fails: {},               // lesson -> failed tries in a row (2 = step back)
        heavy: false,            // heavier warm-up review after a step back, until an easy pass
        stepBacks: [],           // [{ date, from, to, why, acc }]
        placements: [],          // placement test results (and grown-up "Start at lesson…")
        passed: {},              // "n": { best: 0.92, tries: 2, date: "2026-10-16", stars: 2 }
        history: [],             // [{ n, acc, date }]  (last 60 kept)
        lessonCount: 0           // lessons finished (any result) — clock for spaced repetition
      },
      flames: start,             // flames she can spend now
      flamesEarned: start,       // all flames ever earned
      spent: 0,
      owned: {},                 // "item:cat" | "outfit:hair/puffs" | "upgrade:bed/deluxe" -> date bought
                                 //   (places light up at their lesson; "loc:bakery" here = lit with flames in v3)
      celebrated: {},            // locationId (or "finale") -> date its light-up celebration played
      house: { use: {}, shown: {}, seen: {} },   // her house: tier in use per chain, free fix-ups already shown,
                                 //   rooms/chains whose news she has seen (see Engine "her house")
      items: {},                 // spaced repetition: "g:m" | "w:cat" -> { box, c, w, last }
      stuck: {},                 // items she missed 3 times in a lesson -> date; first in the next warm-up
      trace: { letters: {}, queue: [], words: {}, name: '' },   // writing: letters traced (lessons, desk,
                                 //   rung she needed), letters waiting for a slot, words written, name to trace
      world: {},                 // locationId -> { room, objects: { objId: { x, y, on, stored, room, in, slot } },
                                 //   lights: { roomId: bool }, doorOpened: bool }
      requestsDone: {}
    };
  };

  Store.profiles = function () {
    var ids = index().profileIds || [], out = [], i, p;
    for (i = 0; i < ids.length; i++) {
      p = Store.read(PREFIX + 'p.' + ids[i]);
      if (p) { out.push(p); }
    }
    return out;
  };

  Store.profile = function (id) { return Store.read(PREFIX + 'p.' + id); };

  Store.saveProfile = function (p) {
    var ix = index();
    if (!ix.profileIds) { ix.profileIds = []; }
    if (ix.profileIds.indexOf(p.id) < 0) { ix.profileIds.push(p.id); saveIndex(); }
    Store.write(PREFIX + 'p.' + p.id, p);
  };

  Store.deleteProfile = function (id) {
    var ix = index();
    ix.profileIds = (ix.profileIds || []).filter(function (x) { return x !== id; });
    if (ix.lastProfile === id) { ix.lastProfile = null; }
    saveIndex();
    Store.remove(PREFIX + 'p.' + id);
  };

  Store.setLastProfile = function (id) { index().lastProfile = id; saveIndex(); };

  /* ---------- backup ---------- */

  Store.exportData = function () {
    return {
      app: 'lit-town',
      backupVersion: 1,
      exported: new Date().toISOString(),
      settings: Store.settings(),
      profiles: Store.profiles()
    };
  };

  /** Import a backup object. mode 'merge' keeps existing kids (same id is replaced); 'replace' wipes first. */
  Store.importData = function (data, how) {
    if (!data || (data.app !== 'lit-town' && data.app !== 'word-town') || Object.prototype.toString.call(data.profiles) !== '[object Array]') {
      throw new Error('This is not a Lit Town backup file.');
    }
    if (how === 'replace') {
      Store.profiles().forEach(function (p) { Store.deleteProfile(p.id); });
    }
    data.profiles.forEach(function (p) {
      if (p && p.id && p.progress) {
        p = cleanProfile(p);
        if (RA.Engine && RA.Engine.migrateProfile) { RA.Engine.migrateProfile(p); }
        Store.saveProfile(p);
      }
    });
    if (data.settings) { index().settings = data.settings; saveIndex(); }
    return data.profiles.length;
  };

  /* a backup is outside data: keep only safe values in fields that end up in the page */
  function cleanProfile(p) {
    var HEX = /^#[0-9a-fA-F]{3,6}$/, ID = /^[a-z0-9\-]{1,24}$/, k;
    p.id = String(p.id).replace(/[^A-Za-z0-9\-]/g, '').slice(0, 40);
    p.name = String(p.name || 'Reader').slice(0, 14);
    if (p.look) {
      for (k in p.look) {
        if (!p.look.hasOwnProperty(k)) { continue; }
        var v = String(p.look[k]);
        if (/color$|^(skin|hair|top2|bot2)$/i.test(k) ? !HEX.test(v) : (k !== 'name' && !ID.test(v))) { delete p.look[k]; }
      }
    }
    if (p.font !== 'dyslexic') { p.font = 'andika'; }
    p.flames = Math.max(0, Math.floor(+p.flames || 0));
    p.flamesEarned = Math.max(p.flames, Math.floor(+p.flamesEarned || 0));
    return p;
  }

  Store.canWriteFiles = function () { return !!fs(); };

  /** Save a backup file. Native: app folder on the tablet. Browser: download. cb(err, whereText) */
  Store.saveBackupFile = function (cb) {
    var json = JSON.stringify(Store.exportData(), null, 1);
    var name = 'lit-town-backup-' + U.stamp() + '.json';
    var F = fs();
    if (F) {
      F.writeFile({ path: 'LitTown/' + name, data: json, directory: 'EXTERNAL', encoding: 'utf8', recursive: true })
        .then(function () {
          return F.getUri({ path: 'LitTown/' + name, directory: 'EXTERNAL' });
        })
        .then(function (r) { cb(null, (r && r.uri ? decodeURIComponent(r.uri).replace('file://', '') : name)); },
          function (err) { cb(err || new Error('save failed')); });
      return;
    }
    try {
      var blob = new w.Blob([json], { type: 'application/json' });
      var url = w.URL.createObjectURL(blob);
      var a = U.el('a', { href: url, download: name });
      w.document.body.appendChild(a);
      a.click();
      setTimeout(function () { w.document.body.removeChild(a); w.URL.revokeObjectURL(url); }, 1000);
      cb(null, 'your Downloads folder (' + name + ')');
    } catch (e) { cb(e); }
  };

  /** List backup files saved by saveBackupFile (native only). cb(err, [names]) */
  Store.listBackupFiles = function (cb) {
    var F = fs();
    if (!F) { cb(null, []); return; }
    F.readdir({ path: 'LitTown', directory: 'EXTERNAL' }).then(function (r) {
      var files = (r && r.files) || [];
      var names = files.map(function (f) { return typeof f === 'string' ? f : f.name; })
        .filter(function (n) { return /\.json$/.test(n); }).sort().reverse();
      cb(null, names);
    }, function () { cb(null, []); });
  };

  Store.readBackupFile = function (name, cb) {
    var F = fs();
    if (!F) { cb(new Error('not available')); return; }
    F.readFile({ path: 'LitTown/' + name, directory: 'EXTERNAL', encoding: 'utf8' }).then(function (r) {
      var data = parse(r && r.data);
      if (!data) { cb(new Error('That file could not be read.')); return; }
      cb(null, data);
    }, function (err) { cb(err || new Error('read failed')); });
  };
})(window);
