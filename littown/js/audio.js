/* Lit Town — speech clips (pre-recorded MP3s) and tiny synthesized sound effects (ES5).
 * Missing clips fail silently: the callback still fires so the lesson never gets stuck.
 * There is no text-to-speech here, by design. */
(function (w) {
  var RA = w.RA = w.RA || {};
  var IDS = RA.AudioIds;

  var A = RA.Audio = {};
  var have = null;          // id -> true, from audio/manifest.json (null = unknown → try anyway)
  var player = null;
  var queue = [];
  var playing = null;       // { id, cb }
  var guard = null;
  var volume = 1;
  var unlocked = false;

  A.init = function (cb) {
    try { player = new w.Audio(); } catch (e) { player = null; }
    if (player) {
      player.preload = 'auto';
      player.addEventListener('ended', function () { if (playing) { done(); } }, false);
      player.addEventListener('error', function () { if (playing && player.src) { done(); } }, false);
    }
    RA.U.getJSON('audio/manifest.json', function (err, m) {
      if (!err && m && m.files) {
        have = {};
        for (var i = 0; i < m.files.length; i++) { have[m.files[i]] = true; }
      } else {
        have = {}; // no manifest = no audio yet; stay silent
      }
      cb();
    });
  };

  A.count = function () { var n = 0, k; if (have) { for (k in have) { if (have.hasOwnProperty(k)) { n++; } } } return n; };
  A.has = function (id) { return !!(have && have[id]); };
  A.setVolume = function (v) { volume = v; if (player) { player.volume = v; } };

  /** Call from the first user tap so old WebViews allow playback later. */
  A.unlock = function () {
    if (unlocked) { return; }
    unlocked = true;
    Sfx.unlock();
    // warm up audio output with a separate silent element so a real clip is never paused or muted
    try { var warm = new w.Audio(); warm.muted = true; var p = warm.play(); if (p && p.then) { p.then(null, function () {}); } } catch (e) { /* ignore */ }
  };

  function done() {
    if (guard) { clearTimeout(guard); guard = null; }
    var cur = playing;
    playing = null;
    if (cur && cur.cb) { cur.cb(); }
    if (!playing && queue.length) { start(queue.shift()); }
  }

  function start(job) {
    playing = job;
    function finish() { if (playing === job) { done(); } }   // ignore late events from older clips
    if (!player || !A.has(job.id)) { setTimeout(finish, job.silentMs || 0); return; }
    try {
      player.src = 'audio/' + job.id + '.mp3';
      player.volume = volume;
      var p = player.play();
      if (p && p.then) { p.then(null, finish); }
      guard = setTimeout(finish, 12000); // never wait forever
    } catch (e) { setTimeout(finish, 0); }
  }

  /** Stop everything (and drop pending callbacks). */
  A.stop = function () {
    queue = [];
    if (guard) { clearTimeout(guard); guard = null; }
    playing = null;
    if (player) { try { player.pause(); } catch (e) { /* ignore */ } }
  };

  /** Play one clip by id (e.g. 'w/cat'). Interrupts what is playing. cb when finished. */
  A.play = function (id, cb) {
    A.stop();
    start({ id: id, cb: cb });
  };

  /** Play clips one after another. items: ids or {id, gap}. */
  A.sequence = function (items, cb) {
    A.stop();
    var list = items.slice();
    function nextOne() {
      if (!list.length) { if (cb) { cb(); } return; }
      var it = list.shift();
      var id = typeof it === 'string' ? it : it.id;
      var gap = typeof it === 'string' ? 120 : (it.gap || 0);
      start({ id: id, cb: function () { setTimeout(nextOne, gap); } });
    }
    nextOne();
  };

  A.phoneme = function (ph, cb) { A.play(IDS.phoneme(ph), cb); };
  A.word = function (wd, cb) { A.play(IDS.word(wd), cb); };
  A.line = function (id, cb) { A.play(IDS.line(id), cb); };
  A.text = function (t, cb) { A.play(IDS.forText(t), cb); };

  A.praise = function (cb) {
    var lines = RA.Engine.lines(), ids = [], k;
    for (k in lines) { if (lines.hasOwnProperty(k) && k.indexOf('great') === 0) { ids.push(k); } }
    A.line(RA.U.pick(ids.length ? ids : ['great-1']), cb);
  };

  /* ---------- sound effects (WebAudio synth, no files) ---------- */

  var Sfx = RA.Sfx = {};
  var ctx = null;
  var enabled = true;

  Sfx.setEnabled = function (on) { enabled = on; };

  Sfx.unlock = function () {
    if (ctx) { return; }
    var AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) { return; }
    // "playback" latency: on some Android phones a default (interactive) context makes the speech clips crackle
    try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; } }
    if (ctx && ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
  };

  function tone(type, f1, f2, dur, vol, delay) {
    if (!ctx || !enabled) { return; }
    var t0 = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    if (f2 && f2 !== f1) { o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((vol || 0.2) * volume, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, freq, vol, delay, q) {
    if (!ctx || !enabled) { return; }
    var t0 = ctx.currentTime + (delay || 0);
    var len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.value = (vol || 0.3) * volume;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0);
  }

  /* a noise buffer shared by the looping sounds (made once) */
  var noiseBuf = null;
  function loopNoise() {
    if (noiseBuf) { return noiseBuf; }
    var len = ctx.sampleRate * 2, d, i;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    d = noiseBuf.getChannelData(0);
    for (i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }

  /* a noise burst whose filter sweeps from f1 to f2 (flush, slide) */
  function sweep(dur, f1, f2, vol, delay, q) {
    if (!ctx || !enabled) { return; }
    var t0 = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = loopNoise(); src.loop = true;
    f.type = 'bandpass'; f.Q.value = q || 1.5;
    f.frequency.setValueAtTime(f1, t0);
    f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((vol || 0.3) * volume, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  var FX = {
    pop: function () { tone('sine', 900, 300, 0.12, 0.25); },
    boing: function () { tone('sine', 220, 520, 0.18, 0.25); tone('sine', 520, 260, 0.2, 0.18, 0.15); },
    chime: function () { tone('sine', 880, 880, 0.35, 0.18); tone('sine', 1320, 1320, 0.45, 0.14, 0.09); },
    ding: function () { tone('triangle', 1568, 1568, 0.5, 0.2); },
    squeak: function () { tone('sine', 1400, 2200, 0.09, 0.15); tone('sine', 1600, 2400, 0.08, 0.12, 0.1); },
    drum: function () { tone('sine', 160, 60, 0.25, 0.4); noise(0.08, 1800, 0.12); },
    whoosh: function () { noise(0.35, 700, 0.25, 0, 0.7); },
    meow: function () { tone('sawtooth', 500, 800, 0.18, 0.06); tone('sawtooth', 800, 420, 0.25, 0.06, 0.17); },
    woof: function () { tone('square', 180, 110, 0.12, 0.08); tone('square', 170, 100, 0.12, 0.08, 0.18); },
    quack: function () { tone('sawtooth', 420, 300, 0.12, 0.07); tone('sawtooth', 400, 280, 0.12, 0.07, 0.16); },
    sparkle: function () { tone('sine', 1760, 1760, 0.12, 0.1); tone('sine', 2093, 2093, 0.12, 0.1, 0.07); tone('sine', 2637, 2637, 0.2, 0.1, 0.14); },
    tap: function () { tone('sine', 660, 520, 0.06, 0.12); },
    soft: function () { tone('sine', 330, 300, 0.12, 0.1); },   // gentle "try again" bump — not a buzzer
    // house sounds (all synthesized: no audio files)
    click: function () { tone('square', 2400, 1800, 0.025, 0.08); tone('square', 1200, 900, 0.03, 0.06, 0.035); },
    rattle: function () { for (var i = 0; i < 6; i++) { noise(0.04, 900 + (i % 2) * 500, 0.22, i * 0.07, 3); tone('square', 140 + (i % 2) * 40, 110, 0.04, 0.05, i * 0.07); } },
    slide: function () { sweep(0.9, 300, 1400, 0.22, 0, 0.9); tone('sine', 220, 330, 0.5, 0.05, 0.2); },
    flush: function () { sweep(0.35, 2000, 900, 0.3, 0, 1); sweep(1.6, 900, 160, 0.35, 0.2, 1.2); for (var i = 0; i < 5; i++) { tone('sine', 180 + i * 60, 90, 0.08, 0.08, 1.1 + i * 0.12); } },
    bubble: function () { tone('sine', 500 + Math.random() * 500, 1500 + Math.random() * 600, 0.05, 0.1); },
    fanfare: function () { tone('triangle', 523, 523, 0.15, 0.18); tone('triangle', 659, 659, 0.15, 0.18, 0.14); tone('triangle', 784, 784, 0.3, 0.2, 0.28); tone('triangle', 1047, 1047, 0.45, 0.2, 0.44); }
  };

  /* Looping sounds (running water, TV static). Returns a handle with stop(). */
  var LOOPS = {
    water: { type: 'bandpass', freq: 1300, q: 0.7, vol: 0.16, wobble: 1 },
    shower: { type: 'highpass', freq: 1800, q: 0.5, vol: 0.13, wobble: 1 },
    static: { type: 'highpass', freq: 3000, q: 0.3, vol: 0.06, wobble: 0 }
  };
  Sfx.loop = function (name) {
    var none = { stop: function () {} };
    if (!ctx) { Sfx.unlock(); }
    if (!ctx || !enabled || !LOOPS[name]) { return none; }
    var L = LOOPS[name], t0 = ctx.currentTime, stopped = false;
    try {
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = loopNoise(); src.loop = true;
      f.type = L.type; f.frequency.value = L.freq; f.Q.value = L.q;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(L.vol * volume, t0 + 0.15);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      var lfo = null;
      if (L.wobble) {      // a slow wobble so running water doesn't sound like a hiss
        lfo = ctx.createOscillator(); var lg = ctx.createGain();
        lfo.frequency.value = 3.2; lg.gain.value = 260;
        lfo.connect(lg); lg.connect(f.frequency); lfo.start(t0);
      }
      src.start(t0);
      return {
        stop: function () {
          if (stopped) { return; }
          stopped = true;
          var t = ctx.currentTime;
          try {
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            src.stop(t + 0.25);
            if (lfo) { lfo.stop(t + 0.25); }
          } catch (e) { /* already stopped */ }
        }
      };
    } catch (e2) { return none; }
  };

  Sfx.play = function (name) {
    if (!ctx) { Sfx.unlock(); }
    var f = FX[name] || FX.pop;
    try { f(); } catch (e) { /* ignore */ }
  };
})(window);
