/* Character art: the kids' chibi avatars and the professor. CHAR.drawAvatar(avatar) returns an SVG (viewBox 0 0 120 160). ES5. */
(function () {
  'use strict';
  var PROF = 'Professor Pennywhistle';
  /* ================= avatar (character creator) ================= */
  var AV = {
    skin: ['#ffe0c7', '#f5c9a3', '#e0a878', '#c68652', '#9a5f35', '#6b3f22'],
    hairColor: ['#2b1d16', '#5a3a22', '#a0652d', '#e0b35a', '#f2e1a8', '#c2442e', '#7a4fd6', '#3a8ed8'],
    hair: ['short', 'spiky', 'long', 'ponytail', 'curly', 'buns', 'bald'],
    eyes: ['round', 'happy', 'wink'],
    top: ['tee', 'hoodie', 'dress', 'suit', 'apron'],
    face: ['none', 'beard', 'mustache', 'stubble'],
    topColor: ['#e45757', '#f29b38', '#f2d43a', '#4fb65f', '#3a8ed8', '#7a5fd6', '#e36fae', '#3b4252'],
    acc: ['none', 'glasses', 'cap', 'bow', 'headband', 'visor']
  };
  var AV_LABEL = { hair: { short: 'Short', spiky: 'Spiky', long: 'Long', ponytail: 'Ponytail', curly: 'Curly', buns: 'Buns', bald: 'Bald' },
    eyes: { round: 'Round', happy: 'Happy', wink: 'Wink' }, top: { tee: 'T-shirt', hoodie: 'Hoodie', dress: 'Dress', suit: 'Suit', apron: 'Apron' },
    face: { none: 'None', beard: 'Beard', mustache: 'Mustache', stubble: 'Stubble' },
    acc: { none: 'None', glasses: 'Glasses', cap: 'Cap', bow: 'Bow', headband: 'Headband', visor: 'Visor' } };
  function randAvatar() {
    function r(n) { return Math.floor(Math.random() * n); }
    return { skin: r(AV.skin.length), hair: AV.hair[r(6)], hairColor: r(AV.hairColor.length), eyes: 'round', top: AV.top[r(3)], topColor: r(AV.topColor.length), acc: 'none', face: 'none' };
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    function c(v) { v = Math.max(0, Math.min(255, v)); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + c(r) + c(g) + c(b);
  }
  function drawAvatar(a) {
    a = a || randAvatar();
    var skin = AV.skin[a.skin] || AV.skin[0], hc = AV.hairColor[a.hairColor] || AV.hairColor[0], tc = AV.topColor[a.topColor] || AV.topColor[0];
    var sd = shade(skin, -30), hd = shade(hc, -25), td = shade(tc, -40), ink = '#2b2233', s = '';
    s += '<ellipse cx="60" cy="154" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>';
    // back hair
    if (a.hair === 'long') s += '<path d="M27 52 Q24 100 36 104 L84 104 Q96 100 93 52 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/>';
    if (a.hair === 'ponytail') s += '<path d="M88 40 Q112 50 104 86 Q100 70 88 64 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/>';
    // legs
    if (a.top === 'dress') s += '<rect x="46" y="124" width="9" height="22" rx="4" fill="' + skin + '"/><rect x="65" y="124" width="9" height="22" rx="4" fill="' + skin + '"/>';
    else s += '<rect x="44" y="120" width="13" height="27" rx="5" fill="#3d4a6b"/><rect x="63" y="120" width="13" height="27" rx="5" fill="#3d4a6b"/>';
    s += '<ellipse cx="50" cy="148" rx="9" ry="5" fill="' + ink + '"/><ellipse cx="70" cy="148" rx="9" ry="5" fill="' + ink + '"/>';
    // arms
    s += '<rect x="26" y="88" width="12" height="30" rx="6" fill="' + tc + '" stroke="' + td + '" stroke-width="2" transform="rotate(12 32 90)"/>';
    s += '<rect x="82" y="88" width="12" height="30" rx="6" fill="' + tc + '" stroke="' + td + '" stroke-width="2" transform="rotate(-12 88 90)"/>';
    s += '<circle cx="28" cy="120" r="6" fill="' + skin + '"/><circle cx="92" cy="120" r="6" fill="' + skin + '"/>';
    // body
    if (a.top === 'dress') s += '<path d="M42 84 Q60 78 78 84 L90 130 Q60 138 30 130 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="2" stroke-linejoin="round"/>';
    else s += '<path d="M40 84 Q60 78 80 84 L82 124 Q60 128 38 124 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.top === 'hoodie') s += '<path d="M44 84 Q60 98 76 84" fill="none" stroke="' + td + '" stroke-width="3"/><rect x="48" y="104" width="24" height="12" rx="4" fill="' + td + '" opacity=".35"/>';
    if (a.top === 'tee' || a.top === 'apron') s += '<path d="M52 82 Q60 90 68 82" fill="' + skin + '"/>';
    if (a.top === 'suit') s += '<path d="M50 82 L60 104 L70 82 Z" fill="#fafafa"/><path d="M57 86 L63 86 L64 110 L60 115 L56 110 Z" fill="' + td + '"/><path d="M48 82 L58 104 L50 110 Z M72 82 L62 104 L70 110 Z" fill="' + shade(tc, -20) + '"/>';
    if (a.top === 'apron') s += '<path d="M46 94 L74 94 L78 126 Q60 130 42 126 Z" fill="#f7f3ea" stroke="#cfc6b4" stroke-width="1.5"/><path d="M50 94 L52 84 M70 94 L68 84" stroke="#cfc6b4" stroke-width="2"/><rect x="53" y="104" width="14" height="9" rx="2" fill="none" stroke="#cfc6b4" stroke-width="1.5"/>';
    // head
    s += '<circle cx="29" cy="58" r="6" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/><circle cx="91" cy="58" r="6" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/>';
    s += '<circle cx="60" cy="54" r="32" fill="' + skin + '" stroke="' + sd + '" stroke-width="2"/>';
    // front hair
    var front = {
      short: 'M28 56 Q26 20 60 20 Q94 20 92 56 Q88 40 74 36 Q66 44 52 38 Q38 42 28 56 Z',
      spiky: 'M28 58 L26 34 L38 38 L40 18 L52 30 L60 14 L68 30 L80 18 L82 38 L94 34 L92 58 Q84 40 60 38 Q36 40 28 58 Z',
      long: 'M27 60 Q24 20 60 20 Q96 20 93 60 Q86 36 60 34 Q38 36 34 50 Z',
      ponytail: 'M28 56 Q26 20 60 20 Q94 20 92 56 Q80 36 60 36 Q40 36 28 56 Z',
      curly: '',
      buns: 'M28 56 Q26 22 60 22 Q94 22 92 56 Q84 38 60 38 Q36 38 28 56 Z',
      bald: 'M28 62 Q26 50 31 42 Q33 52 35 62 Z M92 62 Q94 50 89 42 Q87 52 85 62 Z'
    };
    if (a.hair === 'curly') {
      [[32, 44, 10], [40, 30, 11], [54, 23, 11], [68, 23, 11], [81, 30, 11], [89, 44, 10], [60, 34, 8], [46, 38, 8], [74, 38, 8]].forEach(function (c) {
        s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>';
      });
    } else s += '<path d="' + front[a.hair || 'short'] + '" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.hair === 'buns') s += '<circle cx="34" cy="24" r="10" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/><circle cx="86" cy="24" r="10" fill="' + hc + '" stroke="' + hd + '" stroke-width="2"/>';
    // face
    if (a.eyes === 'happy') s += '<path d="M42 60 Q48 52 54 60 M66 60 Q72 52 78 60" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    else if (a.eyes === 'wink') s += '<ellipse cx="48" cy="59" rx="4.5" ry="5.5" fill="' + ink + '"/><circle cx="46.5" cy="57" r="1.6" fill="#fff"/><path d="M66 60 Q72 54 78 60" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    else s += '<ellipse cx="48" cy="59" rx="4.5" ry="5.5" fill="' + ink + '"/><ellipse cx="72" cy="59" rx="4.5" ry="5.5" fill="' + ink + '"/><circle cx="46.5" cy="57" r="1.6" fill="#fff"/><circle cx="70.5" cy="57" r="1.6" fill="#fff"/>';
    s += '<ellipse cx="40" cy="69" rx="5" ry="3" fill="#ff8fa3" opacity=".5"/><ellipse cx="80" cy="69" rx="5" ry="3" fill="#ff8fa3" opacity=".5"/>';
    if (a.face === 'stubble') s += '<path d="M32 66 Q34 88 60 90 Q86 88 88 66 Q80 80 60 80 Q40 80 32 66 Z" fill="' + hc + '" opacity=".28"/>';
    if (a.face === 'beard') s += '<path d="M29 58 Q28 94 60 97 Q92 94 91 58 Q86 74 74 77 Q60 82 46 77 Q34 74 29 58 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="2" stroke-linejoin="round"/>';
    if (a.face === 'beard' || a.face === 'mustache') s += '<path d="M45 71 Q52 64 60 69 Q68 64 75 71 Q68 75 60 72 Q52 75 45 71 Z" fill="' + hc + '" stroke="' + hd + '" stroke-width="1.5"/>';
    s += '<path d="M53 ' + (a.face === 'beard' || a.face === 'mustache' ? 76 : 72) + ' Q60 ' + (a.face === 'beard' || a.face === 'mustache' ? 81 : 78) + ' 67 ' + (a.face === 'beard' || a.face === 'mustache' ? 76 : 72) + '" fill="none" stroke="' + (a.face === 'beard' ? '#fff' : ink) + '" stroke-width="2.5" stroke-linecap="round"/>';
    // accessories
    if (a.acc === 'glasses') s += '<circle cx="48" cy="59" r="8" fill="none" stroke="' + ink + '" stroke-width="2.2"/><circle cx="72" cy="59" r="8" fill="none" stroke="' + ink + '" stroke-width="2.2"/><path d="M56 59 L64 59" stroke="' + ink + '" stroke-width="2.2"/>';
    if (a.acc === 'cap') s += '<path d="M28 44 Q30 16 60 16 Q90 16 92 44 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="2"/><path d="M60 40 Q88 38 104 44 Q90 48 60 46 Z" fill="' + td + '"/>';
    if (a.acc === 'bow') s += '<path d="M70 22 L84 14 L84 32 Z M70 22 L56 14 L56 32 Z" fill="' + tc + '" stroke="' + td + '" stroke-width="1.5" transform="translate(8 0)"/><circle cx="78" cy="23" r="4" fill="' + td + '"/>';
    if (a.acc === 'visor') s += '<path d="M29 40 Q60 26 91 40" fill="none" stroke="#2f7a4a" stroke-width="4"/><path d="M34 40 Q60 30 86 40 Q78 52 60 52 Q42 52 34 40 Z" fill="#3fa65c" fill-opacity=".75" stroke="#2f7a4a" stroke-width="2"/>';
    if (a.acc === 'headband') s += '<path d="M29 42 Q60 14 91 42" fill="none" stroke="' + tc + '" stroke-width="6" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Character">' + s + '</svg>';
  }

  function professorSvg() {
    return '<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + PROF + '">' +
      '<ellipse cx="60" cy="154" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>' +
      '<path d="M34 86 Q60 76 86 86 L94 148 L26 148 Z" fill="#f4f4f0" stroke="#b9b9b0" stroke-width="2"/>' +
      '<path d="M52 84 L60 108 L68 84" fill="#5a7bd6"/><path d="M60 86 L56 128 M60 86 L64 128" stroke="#b9b9b0" stroke-width="2"/>' +
      '<rect x="68" y="108" width="12" height="16" rx="2" fill="#dfe6f5" stroke="#b9b9b0"/>' +
      '<circle cx="60" cy="54" r="30" fill="#f1c9a5" stroke="#d09a72" stroke-width="2"/>' +
      '<path d="M30 50 Q28 26 44 30 Q46 20 60 24 Q74 20 76 30 Q92 26 90 50 Q84 38 76 40 Q70 32 60 36 Q50 32 44 40 Q36 38 30 50 Z" fill="#e9e9ee" stroke="#b8b8c4" stroke-width="2"/>' +
      '<circle cx="48" cy="56" r="8" fill="#fff" fill-opacity=".4" stroke="#5a4a3a" stroke-width="2.4"/><circle cx="72" cy="56" r="8" fill="#fff" fill-opacity=".4" stroke="#5a4a3a" stroke-width="2.4"/><path d="M56 56 L64 56" stroke="#5a4a3a" stroke-width="2.4"/>' +
      '<circle cx="48" cy="57" r="3" fill="#2b2233"/><circle cx="72" cy="57" r="3" fill="#2b2233"/>' +
      '<path d="M44 72 Q52 66 60 70 Q68 66 76 72 Q68 78 60 74 Q52 78 44 72 Z" fill="#e9e9ee" stroke="#b8b8c4" stroke-width="1.5"/>' +
      '<ellipse cx="38" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/><ellipse cx="82" cy="66" rx="5" ry="3" fill="#ff8fa3" opacity=".45"/></svg>';
  }
  window.CHAR = { AV: AV, AV_LABEL: AV_LABEL, randAvatar: randAvatar, drawAvatar: drawAvatar, professorSvg: professorSvg, PROF: PROF };
})();
