/* Lit Town — over-the-air updates of the app's own files (ES5).
 *
 * The downloading is done by the native web-update plugin (shared with Chore Quest Kids), not by this web
 * page: the page still makes no network requests of its own. Here we only:
 *   - tell the plugin the app came up fine (webReady), once the first screen has drawn. A downloaded copy
 *     that never gets this far is thrown away and the built-in copy comes back by itself;
 *   - switch to a downloaded update (applyUpdate) only on the "Who is reading?" screen, never during a lesson,
 *     in the town or on any other screen, so nobody is ever interrupted;
 *   - give the grown-ups screen the version and a "Check for updates" button.
 * Nothing about updates is ever shown to the children. In a desktop browser there is no plugin: the version
 * is read from the manifest file instead and the button explains that updates happen in the tablet app.
 */
(function (w) {
  var RA = w.RA = w.RA || {};
  var C = w.Capacitor;
  // inside the Chore Quest hub, Chore Quest owns updates (and carries Lit Town in its releases)
  var HUB = !!(RA.Hub && RA.Hub.inside);
  var UP = !HUB && !!(C && C.isPluginAvailable && C.isPluginAvailable('WebUpdate') && C.nativePromise);
  var APPLY_SCREEN = 'profiles';
  var pending = '', readySent = false, applying = false, timer = null;

  function call(method, opts) {
    if (!UP) { return { then: function (ok, bad) { if (bad) { bad(new Error('no updater')); } return this; } }; }
    return C.nativePromise('WebUpdate', method, opts || {});
  }

  function screenName() { return RA.UI && RA.UI.currentName ? RA.UI.currentName() : ''; }

  /* switch in a downloaded copy, but only on the reader picker, with nothing open on top of it */
  function maybeApply() {
    clearTimeout(timer);
    if (!UP || !pending || applying || screenName() !== APPLY_SCREEN) { return; }
    // wait a moment so a tap that is about to open a reader isn't cut off
    timer = setTimeout(function () {
      if (!pending || applying || screenName() !== APPLY_SCREEN || w.document.querySelector('.modal-bg')) { return; }
      applying = true;
      call('applyUpdate').then(function (r) {
        // when applied, the web view reloads itself (with the new files)
        if (!r || !r.applied) { applying = false; pending = ''; }
      }, function () { applying = false; });
    }, 1500);
  }

  RA.Updates = {
    available: UP,

    /** Once, after the first screen has drawn. */
    ready: function () {
      if (readySent || !UP) { return; }
      readySent = true;
      call('webReady').then(function () {
        call('getStatus').then(function (s) { if (s && s.pending) { pending = s.pending; maybeApply(); } }, function () {});
      }, function () {});
      try {
        C.addListener('WebUpdate', 'update', function (ev) { pending = (ev && ev.version) || pending || 'new'; maybeApply(); });
      } catch (e) { /* older bridge: the update still switches in at the next start */ }
    },

    /** Called by the router every time a screen is shown. */
    onScreen: function (name) { if (name === APPLY_SCREEN) { maybeApply(); } else { clearTimeout(timer); } },

    /** cb(status) with { running, bundled, downloaded, pending, lastCheck, lastError, signed, app } (app=false in a browser). */
    status: function (cb) {
      if (HUB) {
        RA.U.getJSON('version.json', function (e, v) { cb({ app: false, hub: true, running: v && v.version || '' }); });
        return;
      }
      if (!UP) {
        RA.U.getJSON('lit-town-manifest.json', function (e, m) { cb({ app: false, running: m && m.version || '' }); });
        return;
      }
      call('getStatus').then(function (s) { s = s || {}; s.app = true; cb(s); }, function (e) { cb({ app: true, lastError: String(e && e.message || e) }); });
    },

    /** "Check for updates": cb(status) once the check (and any download) is done. */
    check: function (cb) {
      if (!UP) { RA.Updates.status(cb); return; }
      call('check', { force: true }).then(function (s) {
        s = s || {}; s.app = true;
        if (s.pending) { pending = s.pending; }
        cb(s);
      }, function (e) { cb({ app: true, lastError: String(e && e.message || e) }); });
    }
  };
})(window);
