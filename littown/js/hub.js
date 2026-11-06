/* Lit Town — running inside the Chore Quest hub (ES5).
 *
 * Lit Town can run on its own (its own APK) or inside Chore Quest Kids, the tablets' home screen, as its own
 * section: Chore Quest's "Lit Town" tile opens littown/index.html, a copy of this www/ made by
 * tools/export-to-hub.js. Inside the hub it is the same app as Chore Quest, so both share one save store
 * (Lit Town's keys all start with "lt."), and Lit Town:
 *   - shows a back button on the "Who is reading?" screen that returns to Chore Quest (Android's back
 *     button does the same there), instead of minimising the app;
 *   - leaves over-the-air updates to Chore Quest (it carries Lit Town in its own releases);
 *   - hands Chore Quest's lock events (Home button, screen waking up, an app sent back) to Chore Quest.
 * Going back is a local page change inside the app (../index.html), never a network request.
 */
(function (w) {
  var RA = w.RA = w.RA || {};
  var inside = /\/littown\/(index\.html)?$/i.test(w.location.pathname || '');
  RA.Hub = {
    inside: inside,
    name: 'Chore Quest',
    leave: function () { if (inside) { w.location.replace('../index.html'); } }
  };
  if (inside && w.document && w.document.documentElement) { w.document.documentElement.className += ' in-hub'; }

  /* Chore Quest's tablet lock (the ChoreGate plugin) reports the Home button, the screen waking up after a while
     ("who's playing?") and apps it sent back, to whichever page is showing. While Lit Town is showing, hand each
     one to Chore Quest: note it for Chore Quest's page (localStorage cl.fromLitTown) and go back there. */
  if (inside) {
    var C = w.Capacitor;
    try {
      if (C && C.isPluginAvailable && C.isPluginAvailable('ChoreGate') && C.addListener) {
        C.addListener('ChoreGate', 'gate', function (ev) {
          try { w.localStorage.setItem('cl.fromLitTown', JSON.stringify({ ev: ev || {}, at: Date.now() })); } catch (e) { /* still go back */ }
          if (RA.World && RA.World.flush) { try { RA.World.flush(); } catch (e2) { /* ignore */ } }
          RA.Hub.leave();
        });
      }
    } catch (e) { /* no lock on this tablet: nothing to hand over */ }
  }
})(window);
