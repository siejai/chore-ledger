/* Lit Town — small helpers (ES5, no dependencies). */
(function (w) {
  var RA = w.RA = w.RA || {};
  var doc = w.document;

  var U = RA.U = {};

  /* ---------- DOM ---------- */

  /** el('div.card.big', {onclick: fn, html: '...'}, [children]) */
  U.el = function (spec, attrs, children) {
    var parts = spec.split('.'), node = doc.createElement(parts[0] || 'div'), i, k;
    if (parts.length > 1) { node.className = parts.slice(1).join(' '); }
    if (attrs) {
      for (k in attrs) {
        if (!attrs.hasOwnProperty(k)) { continue; }
        if (k === 'html') { node.innerHTML = attrs[k]; }
        else if (k === 'text') { node.textContent = attrs[k]; }
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') { U.tap(node, attrs[k]); }
        else if (k === 'style') { node.style.cssText = attrs[k]; }
        else { node.setAttribute(k, attrs[k]); }
      }
    }
    if (children) {
      for (i = 0; i < children.length; i++) {
        if (children[i]) { node.appendChild(typeof children[i] === 'string' ? doc.createTextNode(children[i]) : children[i]); }
      }
    }
    return node;
  };

  U.clear = function (node) { while (node && node.firstChild) { node.removeChild(node.firstChild); } };

  U.qs = function (sel, root) { return (root || doc).querySelector(sel); };

  U.addClass = function (n, c) { if (n && n.classList) { n.classList.add(c); } };
  U.removeClass = function (n, c) { if (n && n.classList) { n.classList.remove(c); } };

  /** Restart a CSS animation class on a node. */
  U.flash = function (node, cls, ms) {
    if (!node || !node.classList) { return; }
    node.classList.remove(cls);
    void node.offsetWidth; // reflow so the animation restarts
    node.classList.add(cls);
    if (ms) { setTimeout(function () { node.classList.remove(cls); }, ms); }
  };

  /**
   * Fast, reliable tap handler for old touch WebViews (no 300 ms delay, no ghost clicks).
   * Calls fn(event) once per tap. Ignores taps that moved more than 12 px.
   */
  U.tap = function (node, fn) {
    var sx = 0, sy = 0, moved = false, touched = 0;
    node.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      sx = t.clientX; sy = t.clientY; moved = false;
      U.addClass(node, 'pressed');
    }, false);
    node.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) { moved = true; U.removeClass(node, 'pressed'); }
    }, false);
    node.addEventListener('touchend', function (e) {
      U.removeClass(node, 'pressed');
      if (moved) { return; }
      touched = Date.now();
      e.preventDefault();
      fn.call(node, e);
    }, false);
    node.addEventListener('touchcancel', function () { U.removeClass(node, 'pressed'); }, false);
    node.addEventListener('click', function (e) {
      if (Date.now() - touched < 700) { return; } // already handled by touchend
      fn.call(node, e);
    }, false);
  };

  /* ---------- data ---------- */

  U.getJSON = function (url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) { return; }
      // status 0 happens for some local loads in old WebViews; accept if there is text
      if ((x.status >= 200 && x.status < 300) || (x.status === 0 && x.responseText)) {
        var data = null;
        try { data = JSON.parse(x.responseText); } catch (e) { cb(e, null); return; }
        cb(null, data);
      } else {
        cb(new Error('HTTP ' + x.status + ' for ' + url), null);
      }
    };
    try { x.send(); } catch (e) { cb(e, null); }
  };

  U.loadScript = function (src, cb) {
    var s = doc.createElement('script');
    var done = false;
    s.src = src;
    s.onload = function () { if (!done) { done = true; cb(null); } };
    s.onerror = function () { if (!done) { done = true; cb(new Error('could not load ' + src)); } };
    doc.getElementsByTagName('head')[0].appendChild(s);
  };

  U.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };

  U.shuffle = function (arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  U.unique = function (arr) {
    var seen = {}, out = [], i;
    for (i = 0; i < arr.length; i++) {
      if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); }
    }
    return out;
  };

  U.contains = function (arr, v) { return arr.indexOf(v) >= 0; };

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  U.id = function (prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  };

  /** Edit distance on characters (for "near miss" distractor words). */
  U.editDistance = function (a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
    }
    return d[m][n];
  };

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  U.later = function (fn, ms) { return setTimeout(fn, ms || 0); };

  U.today = function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  U.stamp = function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  };

  /** Chrome/WebView major version, or 0. */
  U.chromeVersion = function () {
    var m = /Chrome\/(\d+)/.exec(w.navigator.userAgent || '');
    return m ? parseInt(m[1], 10) : 0;
  };
})(window);
