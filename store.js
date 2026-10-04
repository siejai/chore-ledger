/*
 * Storage layer. One small API over two backends:
 *  - Firestore (Firebase v8, works in older Android browsers) when config.js has a firebase config
 *  - a local demo store kept in this browser's localStorage when it does not
 *
 * spec = {c: collection, id?: docId, where?: [[field, op, value]], orderBy?: [field, 'asc'|'desc'], limit?: n}
 * ops  = [{t: 'set'|'update'|'delete', c: collection, id: docId, d: data}]; a value DB.inc(n) adds n.
 * Written in ES5 on purpose so it runs on old WebViews.
 */
(function () {
  'use strict';
  var DB = { mode: 'demo', user: null };
  DB.inc = function (n) { return { __inc: n }; };
  function isInc(v) { return v && typeof v === 'object' && typeof v.__inc === 'number'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function withId(id, d) { var o = clone(d); o.id = id; return o; }

  function cmp(a, op, b) {
    switch (op) {
      case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '>=': return a >= b;
      case 'in': return b.indexOf(a) >= 0;
      case 'array-contains': return a && a.indexOf(b) >= 0;
    }
    return false;
  }
  function runQuery(map, spec) {
    var out = [];
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var d = map[id], ok = true;
      (spec.where || []).forEach(function (w) { if (ok && !cmp(d[w[0]], w[1], w[2])) ok = false; });
      if (ok) out.push(withId(id, d));
    }
    if (spec.orderBy) {
      var f = spec.orderBy[0], dir = spec.orderBy[1] === 'desc' ? -1 : 1;
      out.sort(function (x, y) { return x[f] < y[f] ? -dir : x[f] > y[f] ? dir : 0; });
    }
    if (spec.limit) out = out.slice(0, spec.limit);
    return out;
  }

  /* ---------------- local demo backend ---------------- */
  function Local() {
    this.key = 'cl.demo.v1';
    this.data = {};
    this.watchers = [];
    this.seq = 0;
    try { var raw = localStorage.getItem(this.key); if (raw) this.data = JSON.parse(raw) || {}; } catch (e) { this.data = {}; }
  }
  Local.prototype.init = function () { return Promise.resolve(); };
  Local.prototype.save = function () { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} };
  Local.prototype.coll = function (c) { return this.data[c] || (this.data[c] = {}); };
  Local.prototype.newId = function () { return 'L' + Date.now().toString(36) + (this.seq++).toString(36) + Math.random().toString(36).slice(2, 6); };
  Local.prototype.result = function (spec) {
    if (spec.id) { var d = this.coll(spec.c)[spec.id]; return d ? withId(spec.id, d) : null; }
    return runQuery(this.coll(spec.c), spec);
  };
  Local.prototype.query = function (spec) { return Promise.resolve(this.result(spec)); };
  Local.prototype.watch = function (spec, cb) {
    var self = this, w = { spec: spec, cb: cb };
    this.watchers.push(w);
    setTimeout(function () { if (self.watchers.indexOf(w) >= 0) cb(self.result(spec)); }, 0);
    return function () { var i = self.watchers.indexOf(w); if (i >= 0) self.watchers.splice(i, 1); };
  };
  Local.prototype.commit = function (ops) {
    var self = this;
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.t === 'update' && !this.coll(op.c)[op.id]) return Promise.reject({ code: 'not-found', message: 'Missing ' + op.c + '/' + op.id });
    }
    ops.forEach(function (op) {
      var col = self.coll(op.c), key;
      if (op.t === 'delete') { delete col[op.id]; return; }
      var base = op.t === 'set' ? {} : (col[op.id] || {});
      col[op.id] = apply(base, op.d, op.t === 'merge');
    });
    this.save();
    setTimeout(function () { self.watchers.slice().forEach(function (w) { w.cb(self.result(w.spec)); }); }, 0);
    return Promise.resolve();
  };
  Local.prototype.needsLogin = function () { return false; };
  /* merge: nested plain objects merge key by key (like Firestore set with merge); set/update replace each top-level field */
  function apply(base, d, deep) {
    for (var key in d) {
      if (!d.hasOwnProperty(key)) continue;
      var v = d[key];
      if (isInc(v)) base[key] = (Number(base[key]) || 0) + v.__inc;
      else if (deep && v && typeof v === 'object' && !(v instanceof Array)) base[key] = apply(base[key] && typeof base[key] === 'object' && !(base[key] instanceof Array) ? base[key] : {}, v, true);
      else base[key] = clone(v === undefined ? null : v);
    }
    return base;
  }

  /* ---------------- Firestore backend ---------------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej({ code: 'load', message: 'Could not load ' + src }); };
      document.head.appendChild(s);
    });
  }
  function Fire(cfg) { this.cfg = cfg; this.user = null; }
  Fire.prototype.init = function () {
    var self = this;
    return loadScript('firebase-app.js')
      .then(function () { return loadScript('firebase-auth.js'); })
      .then(function () { return loadScript('firebase-firestore.js'); })
      .then(function () {
        firebase.initializeApp(self.cfg);
        self.fs = firebase.firestore();
        /* Some tablets (and some networks) can't keep Firestore's streaming connection open; long polling gets through.
           Auto-detect by default; a device can be switched to always long-poll from the "can't reach" screen (cl.lp). */
        var lp = false; try { lp = localStorage.getItem('cl.lp') === '1'; } catch (e) {}
        try { self.fs.settings(lp ? { experimentalForceLongPolling: true, merge: true } : { experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
        DB.longPoll = lp;
        try { self.fs.enablePersistence().catch(function () {}); } catch (e) {}
        self.auth = firebase.auth();
        return new Promise(function (res) {
          var first = true;
          self.auth.onAuthStateChanged(function (u) {
            self.user = u; DB.user = u ? { email: u.email } : null;
            if (first) { first = false; res(); } else if (DB.onAuthChange) DB.onAuthChange();
          });
        });
      });
  };
  Fire.prototype.needsLogin = function () { return !this.user; };
  Fire.prototype.login = function (email, pw) {
    var self = this;
    return this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () { return self.auth.signInWithEmailAndPassword(email, pw); });
  };
  Fire.prototype.logout = function () { return this.auth.signOut(); };
  Fire.prototype.newId = function (c) { return this.fs.collection(c).doc().id; };
  Fire.prototype.ref = function (spec) {
    if (spec.id) return this.fs.collection(spec.c).doc(spec.id);
    var r = this.fs.collection(spec.c);
    (spec.where || []).forEach(function (w) { r = r.where(w[0], w[1], w[2]); });
    if (spec.orderBy) r = r.orderBy(spec.orderBy[0], spec.orderBy[1] || 'asc');
    if (spec.limit) r = r.limit(spec.limit);
    return r;
  };
  function snapOut(spec, snap) {
    if (spec.id) return snap.exists ? withId(snap.id, snap.data()) : null;
    return snap.docs.map(function (d) { return withId(d.id, d.data()); });
  }
  Fire.prototype.query = function (spec) {
    return this.ref(spec).get(spec.server ? { source: 'server' } : undefined).then(function (s) { return snapOut(spec, s); });
  };
  Fire.prototype.watch = function (spec, cb) {
    return this.ref(spec).onSnapshot(function (s) { cb(snapOut(spec, s), { cache: !!(s.metadata && s.metadata.fromCache) }); }, function (err) {
      if (DB.onError) DB.onError(err);
    });
  };
  Fire.prototype.toFs = function (d) {
    var o = {}, key, self = this;
    for (key in d) {
      if (!d.hasOwnProperty(key)) continue;
      var v = d[key];
      if (isInc(v)) o[key] = firebase.firestore.FieldValue.increment(v.__inc);
      else if (v && typeof v === 'object' && !(v instanceof Array)) o[key] = self.toFs(v);
      else o[key] = v === undefined ? null : v;
    }
    return o;
  };
  Fire.prototype.commit = function (ops) {
    var self = this, chunks = [];
    for (var i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    return chunks.reduce(function (p, chunk) {
      return p.then(function () {
        var b = self.fs.batch();
        chunk.forEach(function (op) {
          var ref = self.fs.collection(op.c).doc(op.id);
          if (op.t === 'delete') b['delete'](ref);
          else if (op.t === 'set') b.set(ref, self.toFs(op.d));
          else if (op.t === 'merge') b.set(ref, self.toFs(op.d), { merge: true });
          else b.update(ref, self.toFs(op.d));
        });
        return b.commit();
      });
    }, Promise.resolve());
  };

  /* ---------------- public API ---------------- */
  DB.start = function (cfg) {
    if (cfg && cfg.firebase && cfg.firebase.apiKey) { DB.mode = 'firebase'; backend = new Fire(cfg.firebase); }
    else { DB.mode = 'demo'; backend = new Local(); }
    return backend.init();
  };
  var backend = null;
  DB.needsLogin = function () { return backend.needsLogin(); };
  DB.login = function (e, p) { return backend.login(e, p); };
  DB.logout = function () { return backend.logout ? backend.logout() : Promise.resolve(); };
  DB.newId = function (c) { return backend.newId(c); };
  DB.query = function (spec) { return backend.query(spec); };
  DB.watch = function (spec, cb) { return backend.watch(spec, cb); };
  /* push token for this device (Firebase Cloud Messaging, loaded only when a device turns reminders on) */
  DB.pushToken = function (vapidKey, reg) {
    if (DB.mode !== 'firebase') return Promise.resolve(null);
    return loadScript('firebase-messaging.js').then(function () { return firebase.messaging().getToken({ vapidKey: vapidKey, serviceWorkerRegistration: reg }); });
  };
  DB.commit = function (ops) { return backend.commit(ops); };
  DB.resetDemo = function () { try { localStorage.removeItem('cl.demo.v1'); } catch (e) {} };
  window.DB = DB;
})();
