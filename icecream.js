/*
 * Ice Cream Shop, an adventure at the Adventure Gate (cl-v36). One customer at a time asks for a soft-serve cone or a sundae;
 * the kid taps the items to build it and serves it. Customers wait as long as it takes. A round is 2 minutes (less if the
 * Adventure Pass is nearly used up) and every happy customer pays one deck ticket. The round itself is Games 'icecream'. ES5.
 */
(function () {
  'use strict';
  var S = null;
  function A() { return window.ADV; }
  function C() { return window.CL; }
  function Pz() { return window.Pets; }
  function secsLeft() { var e = A() && A().exp(); return e ? Math.max(0, Math.floor((e.endsAt - Date.now()) / 1000)) : 0; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  /* customers are random grown-ups and kids built from the character creator's pieces */
  function customer() {
    var AV = window.CHAR && window.CHAR.AV, adult = Math.random() < 0.5;
    if (!AV) return { skin: 1, hair: 'short', hairColor: 2, eyes: 'happy', top: 'tee', topColor: 3 };
    function n(k) { return Math.floor(Math.random() * AV[k].length); }
    return { skin: n('skin'), hairColor: n('hairColor'), topColor: n('topColor'), pantsColor: n('pantsColor'), eyes: pick(['round', 'happy', 'happy']),
      hair: pick(adult ? ['short', 'long', 'ponytail', 'curly', 'bun', 'wavy', 'bald', 'spiky', 'bob'] : ['short', 'spiky', 'long', 'ponytail', 'curly', 'buns', 'bob', 'pigtails']),
      top: pick(adult ? ['tee', 'hoodie', 'dress', 'suit'] : ['tee', 'hoodie', 'dress']), acc: pick(['none', 'none', 'cap', 'glasses', 'bow']),
      face: adult ? pick(['none', 'none', 'beard', 'mustache']) : 'none', height: adult ? 'tall' : pick(['small', 'medium']), build: pick(['slim', 'medium', 'large']),
      topPat: pick(['solid', 'solid', 'solid', 'dots', 'stripes', 'stars', 'hearts']), pantsPat: 'solid' };
  }
  function open(pid) {
    S = { pid: pid, phase: 'intro' };
    A().startExpedition(pid, 'icecream');
    if (window.World) window.World.unmount();
    C().go();
  }
  function active() { return !!S; }
  function head() { return '<div class="room-top"><strong>Ice Cream Shop</strong><button class="btn small" type="button" data-iact="quit">Leave</button></div>'; }
  function render(view) {
    if (!S) return;
    if (S.phase === 'intro') {
      var left = secsLeft(), mins = Math.floor(left / 60);
      view.innerHTML = '<section class="ic stack tight">' + head() +
        '<div class="card ic-intro"><h2>Scoop time!</h2><p>Customers come up one at a time and show what they want. Build it, then tap the customer (or <b>Serve</b>) to hand it over.</p>' +
        '<ul class="ic-how"><li><b>Cone</b>: pick vanilla, chocolate or mint soft-serve.</li><li><b>Bowl</b>: strawberries, apple pie or bananas first, then a scoop.</li>' +
        '<li>Then the toppings: chocolate or rainbow sprinkles, chocolate syrup, whipped cream.</li><li>Made a mistake? <b>Start over</b> tosses it.</li></ul>' +
        '<p>A round lasts ' + (left >= 120 ? '2 minutes' : 'the ' + (mins ? mins + ' min ' : '') + (left % 60) + ' s of adventure time you have left') + '. Every happy customer earns a <b>deck ticket</b>.</p>' +
        '<button class="btn primary block" type="button" data-iact="start"' + (left < 15 ? ' disabled' : '') + '>Open the shop</button></div></section>';
      return;
    }
    if (S.phase === 'play') {
      if (!view.querySelector('#icHost')) { view.innerHTML = '<section class="ic stack tight">' + head() + '<div id="icHost" class="mg-host"></div></section>'; mount(view.querySelector('#icHost')); }
      return;
    }
    var r = S.result || { happy: 0 };
    view.innerHTML = '<section class="ic stack tight"><div class="celebrate-card' + (r.happy >= 8 ? ' r-rare' : '') + '" style="position:static;margin:0 auto">' +
      '<h2>' + (r.happy ? 'Shop’s closed!' : 'Shop’s closed') + '</h2><p>' + r.happy + ' happy customer' + (r.happy === 1 ? '' : 's') + '.</p>' +
      '<p><strong>+' + r.happy + ' deck ticket' + (r.happy === 1 ? '' : 's') + '</strong></p>' +
      '<div class="wrap" style="justify-content:center">' + (secsLeft() >= 30 ? '<button class="btn primary" type="button" data-iact="again">Play again</button>' : '') +
      '<button class="btn" type="button" data-iact="quit">Back to town</button></div></div></section>';
  }
  function mount(host) {
    var secs = Math.max(15, Math.min(120, secsLeft())), avs = [];
    for (var i = 0; i < 6; i++) avs.push(customer());
    S.paid = false;
    window.Games.mount('icecream', host, {
      secs: secs,
      avatar: function (i) { return window.CHAR.drawAvatar(avs[i % avs.length], null, { view: 'front' }); },
      done: function (res) { end(res); }
    });
    clearInterval(S.timer);
    S.timer = setInterval(function () { if (S) A().saveTime(false); }, 30000);
  }
  function pay(n) { if (!S || S.paid || !n) return Promise.resolve(); S.paid = true; return A().addTickets(S.pid, n, 0); }
  function end(res) {
    if (!S) return;
    clearInterval(S.timer);
    var n = (res && res.happy) || 0;
    S.result = { happy: n }; S.phase = 'done';
    pay(n).then(function () { C().go(); }, function (e) { C().fail(e); C().go(); });
  }
  function quit() {
    if (!S) return;
    clearInterval(S.timer);
    var g = window.Games && window.Games.active() && window.Games._g(), n = S.phase === 'play' && g && g.kind === 'icecream' ? g.happy || 0 : 0;   /* leaving mid-round keeps what was earned */
    if (window.Games && window.Games.active()) window.Games.stop();
    pay(n).catch(function () {});
    A().saveTime(true); S = null;
    Pz().G.room = null;
    if (window.World && window.World.W && window.World.W.P) { var P = window.World.W.P; P.y = P.ty = Math.max(1, P.y - 1); }
    C().go();
  }
  document.addEventListener('click', function (e) {
    if (!S) return;
    var b = e.target.closest ? e.target.closest('[data-iact]') : null; if (!b) return;
    var a = b.getAttribute('data-iact');
    if (a === 'quit') quit();
    else if (a === 'start' || a === 'again') { S.phase = 'play'; S.result = null; C().go(); }
  });
  window.IceCream = { open: open, active: active, render: render, quit: quit };
})();
