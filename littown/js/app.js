/* Lit Town — start-up (ES5). Loads storage, content and audio list, then shows the first screen. */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI;

  function fail(msg) {
    var root = U.qs('#app');
    U.clear(root);
    root.className = 'screen screen-error';
    root.appendChild(U.el('h1', { text: 'Oops!' }));
    root.appendChild(U.el('p', { text: msg }));
    root.appendChild(U.el('p.pnote', { text: 'Grown-ups: run "node tools/validate-content.js" on your computer to find the problem, then rebuild.' }));
  }

  function boot() {
    var root = U.qs('#app');
    UI.init(root);
    RA.Store.init(function () {
      U.getJSON('content/lessons.json', function (e1, lessons) {
        if (e1) { fail('Could not load the lessons (' + e1.message + ').'); return; }
        U.getJSON('content/world.json', function (e2, world) {
          if (e2) { fail('Could not load the world (' + e2.message + ').'); return; }
          U.getJSON('content/tracing.json', function (e4, tracing) {
          if (e4) { fail('Could not load the letter shapes (' + e4.message + ').'); return; }
          U.getJSON('content/placement.json', function (e5, placement) {
          if (e5) { fail('Could not load the placement test (' + e5.message + ').'); return; }
          RA.data = { lessons: lessons, world: world, tracing: tracing, placement: placement };
          try { RA.Engine.init(lessons, world); RA.Engine.initTracing(tracing); RA.Trace.init(tracing); RA.Engine.initPlacement(placement); } catch (e3) { fail('The lessons file has a problem: ' + e3.message); return; }
          // bring saved progress from older versions up to date (flames format)
          RA.Store.profiles().forEach(function (p) { if (RA.Engine.migrateProfile(p)) { RA.Store.saveProfile(p); } });
          RA.Audio.init(function () {
            var st = RA.Store.settings();
            RA.Audio.setVolume(st.volume);
            RA.Sfx.setEnabled(st.sfx);
            U.addClass(w.document.body, 'ready');
            // always start at the profile picker after a cold start
            UI.go('profiles', null, true);
            // the app came up: tell the updater this copy of the files is good (a downloaded copy that
            // never gets here is dropped and the built-in one comes back by itself)
            if (RA.Updates) { setTimeout(function () { RA.Updates.ready(); }, 800); }
          });
          });
          });
        });
      });
    });
    hookAndroid();
    // unlock audio on the very first touch anywhere
    w.document.addEventListener('touchstart', function first() {
      RA.Audio.unlock();
      w.document.removeEventListener('touchstart', first, false);
    }, false);
  }

  /* Android: back button walks back through screens (never leaves to anything else);
     progress is saved when the app goes to the background. Needs @capacitor/app. */
  function hookAndroid() {
    var C = w.Capacitor, App = C && C.Plugins && C.Plugins.App;
    if (!App || !App.addListener) { return; }
    App.addListener('backButton', function () {
      var name = UI.currentName();
      if (U.qs('.modal-bg')) { var m = U.qs('.modal-bg'); m.parentNode.removeChild(m); return; }
      if (name === 'profiles' || name === 'loading' || name === '') {
        if (RA.Hub && RA.Hub.inside) { RA.Hub.leave(); return; }   // inside Chore Quest: back to it
        if (App.minimizeApp) { App.minimizeApp(); }
        return;
      }
      if (name === 'kid' || name === 'parent') { UI.go('profiles', null, true); return; }
      if (name === 'place') { UI.go('map', null, true); return; }
      if (name === 'map' || name === 'lesson' || name === 'dress' || name === 'shop') { UI.go('kid', null, true); return; }
      w.history.back();
    });
    App.addListener('pause', function () {
      if (RA.World && RA.World.flush) { RA.World.flush(); }
      RA.Audio.stop();
    });
  }

  if (w.document.readyState === 'loading') { w.document.addEventListener('DOMContentLoaded', boot, false); }
  else { boot(); }
})(window);
