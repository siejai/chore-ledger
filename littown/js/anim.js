/* Lit Town — animation budget for old tablets (ES5).
 *
 * Everything that keeps moving (running water, TV static, bubbles, a flushing swirl) is
 * registered here. At most RA.Anim.MAX run at once: starting another one stops the oldest.
 * When she leaves a room, or the app goes to the background, all of them stop, so only the
 * room she is looking at ever animates. Short one-off moves (a wiggle, a door shake) are plain
 * CSS classes and don't need to be registered.
 *
 * All motion is CSS transform/opacity on wrapper elements; nothing here uses SMIL or filters.
 */
(function (w) {
  var RA = w.RA = w.RA || {};

  var Anim = RA.Anim = { MAX: 3 };
  var active = [];   // [{ id, stop, timer }]

  function remove(entry) {
    var i = active.indexOf(entry);
    if (i >= 0) { active.splice(i, 1); }
    if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
  }

  /**
   * Start a running animation.
   *   id    – unique name ("sink:kitchen"); starting the same id again restarts it
   *   start – function that adds the classes / starts the sound; may return nothing
   *   stop  – function that removes them again
   *   ms    – optional: stop by itself after this long
   */
  Anim.run = function (id, start, stop, ms) {
    Anim.stop(id);
    while (active.length >= Anim.MAX) { Anim.stopEntry(active[0]); }
    var entry = { id: id, stop: stop, timer: null };
    active.push(entry);
    try { start(); } catch (e) { remove(entry); return; }
    if (ms) { entry.timer = setTimeout(function () { Anim.stopEntry(entry); }, ms); }
  };

  Anim.stopEntry = function (entry) {
    remove(entry);
    try { entry.stop(); } catch (e) { /* element already gone */ }
  };

  Anim.stop = function (id) {
    for (var i = active.length - 1; i >= 0; i--) {
      if (active[i].id === id) { Anim.stopEntry(active[i]); }
    }
  };

  Anim.isRunning = function (id) {
    for (var i = 0; i < active.length; i++) { if (active[i].id === id) { return true; } }
    return false;
  };

  Anim.stopAll = function () {
    while (active.length) { Anim.stopEntry(active[active.length - 1]); }
  };

  Anim.count = function () { return active.length; };

  // nothing keeps moving (or making noise) while the app is in the background
  if (w.document && w.document.addEventListener) {
    w.document.addEventListener('visibilitychange', function () {
      if (w.document.hidden) { Anim.stopAll(); }
    }, false);
  }
})(window);
