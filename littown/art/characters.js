/* characters.js — layered character rig parts (200x300 rig space, see STYLE_GUIDE §4).
 * Layer order: hairBack, legs, bot, shoes, arms, top, head, face, hairFront, acc. */
(function () {
  var SK = 'class="c-skin" fill="#EDB48A"', HR = 'class="c-hair" fill="#5A3825"',
    T = 'class="c-top" fill="#3D8BFD"', T2 = 'class="c-top2" fill="#FFFDF7"',
    B = 'class="c-bot" fill="#2F4C9C"', B2 = 'class="c-bot2" fill="#FFD23F"',
    SH = 'class="c-shoe" fill="#E5484D"', AC = 'class="c-acc" fill="#F76CA8"',
    INK = 'fill="#3B2F45"', PAPER = 'fill="#FFFDF7"',
    CT = 'class="c-top" fill="#FFFDF7"', CT2 = 'class="c-top2" fill="#E5484D"';
  function p(a, d, x) { return '<path ' + a + ' d="' + d + '"' + (x ? ' ' + x : '') + '/>'; }
  function c(a, cx, cy, r) { return '<circle ' + a + ' cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>'; }
  function e(a, cx, cy, rx, ry, x) { return '<ellipse ' + a + ' cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' + (x ? ' ' + x : '') + '/>'; }
  function r(a, x, y, w, h, rx, tr) {
    return '<rect ' + a + ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"' +
      (tr ? ' transform="' + tr + '"' : '') + '/>';
  }
  function g(s) { return '<g>' + s + '</g>'; }
  /* mirror a left-side fragment onto the right side (x -> 200 - x) */
  function m(s) { return '<g transform="matrix(-1 0 0 1 200 0)">' + s + '</g>'; }
  function both(s) { return s + m(s); }
  var LA = 'rotate(14 70 160)';          /* left arm angle around the shoulder */
  function sleeve(a, len, w) { return both(r(a, 70 - w / 2, 148, w, len, w / 2 - 1, LA)); }
  function cuff(a, at, w) { return both(r(a, 70 - w / 2, at, w, 9, 4.5, LA)); }
  var TORSO = 'M68 174Q68 150 92 150H108Q132 150 132 174V216Q132 226 122 226H78Q68 226 68 216Z';

  /* ---------- base ---------- */
  ART.parts('base', {
    legs: { label: 'Legs', svg: g(r(SK, 77, 208, 20, 80, 10) + r(SK, 103, 208, 20, 80, 10)) },
    arms: { label: 'Arms', svg: g(both(r(SK, 61, 156, 18, 58, 9, LA) + c(SK, 56, 214, 11))) },
    head: { label: 'Head', svg: g(c(SK, 40, 102, 11) + c(SK, 160, 102, 11) + c(SK, 100, 92, 62)) }
  }, 'characters');

  /* ---------- faces ---------- */
  var EYES = e(INK, 78, 100, 6, 8) + e(INK, 122, 100, 6, 8) +
    c('fill="#FF8FA3"', 66, 120, 8) + c('fill="#FF8FA3"', 134, 120, 8);
  var MOUTH = 'stroke="#3B2F45" stroke-width="4" stroke-linecap="round" fill="none"';
  ART.parts('face', {
    smile: { label: 'Smile', svg: g(EYES + p(MOUTH, 'M90 121Q100 130 110 121')) },
    grin: { label: 'Grin', svg: g(EYES + p(INK, 'M87 117H113Q113 135 100 135Q87 135 87 117Z') +
      p('fill="#FF7A6B"', 'M92 130Q100 124 108 130Q104 135 100 135Q96 135 92 130Z')) },
    wow: { label: 'Wow', svg: g(EYES + e(INK, 100, 126, 6, 7.5)) }
  }, 'characters');

  /* ---------- hair ---------- */
  /* CAP(y): outer hair edge = circle r67 around (100,90), from left temple over the top to the right temple */
  function CAP(y) { var dx = Math.round(Math.sqrt(67 * 67 - (y - 90) * (y - 90))); return 'M' + (100 - dx) + ' ' + y + 'A67 67 0 1 1 ' + (100 + dx) + ' ' + y; }
  var BK = p(HR, CAP(118) + 'Q160 126 150 122H50Q40 126 33 118Z');   /* short back: thin ring behind upper head */
  ART.parts('hair', {
    bob: { label: 'Bob',
      back: g(p(HR, 'M29 100Q29 23 100 23Q171 23 171 100V146Q171 168 150 164H50Q29 168 29 146Z')),
      front: g(p(HR, CAP(104) + 'V152Q166 162 156 162Q147 162 147 152V100Q146 76 132 70Q116 76 100 70Q84 76 68 70Q54 76 53 100V152Q53 162 44 162Q34 162 34 152Z')) },
    puffs: { label: 'Puffs',
      back: g(c(HR, 44, 46, 31) + c(HR, 156, 46, 31) + BK),
      front: g(p(HR, CAP(106) + 'Q164 66 132 56Q100 50 68 56Q36 66 36 106Z') +
        r(AC, 50, 54, 26, 11, 5.5, 'rotate(-48 63 59.5)') + r(AC, 124, 54, 26, 11, 5.5, 'rotate(48 137 59.5)')) },
    ponytail: { label: 'Ponytail',
      back: g(p(HR, 'M134 44C172 22 202 48 196 100C192 136 182 158 166 178C170 150 166 126 158 108C150 92 140 74 128 60Z') + BK),
      front: g(p(HR, CAP(104) + 'Q166 74 146 62Q124 52 100 62Q74 74 58 92Q46 102 34 104Z') + r(AC, 140, 32, 14, 24, 7, 'rotate(40 147 44)')) },
    braids: { label: 'Braids',
      back: g(BK),
      front: g(p(HR, CAP(110) + 'Q164 70 136 56Q116 50 102 54L100 60L98 54Q84 50 64 56Q36 70 36 110Z') +
        both(e(HR, 40, 124, 12, 12) + e(HR, 42, 144, 12, 11, 'transform="rotate(-12 42 144)"') + e(HR, 40, 163, 11, 10, 'transform="rotate(12 40 163)"') +
          e(HR, 42, 181, 10, 9) + p(HR, 'M38 196Q42 192 46 196L50 214Q42 222 34 214Z') + r(AC, 32, 189, 20, 8, 4))) },
    curly: { label: 'Curly',
      back: g(c(HR, 100, 80, 70) + c(HR, 36, 112, 22) + c(HR, 164, 112, 22) + c(HR, 38, 142, 21) + c(HR, 162, 142, 21) +
        c(HR, 50, 166, 17) + c(HR, 150, 166, 17) + c(HR, 34, 76, 22) + c(HR, 166, 76, 22) + c(HR, 58, 30, 24) + c(HR, 142, 30, 24) + c(HR, 100, 18, 18)),
      front: g(p(HR, CAP(102) + 'Q164 80 152 72H48Q36 80 36 102Z') +
        c(HR, 56, 70, 14) + c(HR, 78, 62, 14) + c(HR, 100, 60, 14) + c(HR, 122, 62, 14) + c(HR, 144, 70, 14)) },
    long: { label: 'Long',
      back: g(p(HR, 'M30 100Q30 23 100 23Q170 23 170 100L174 206Q176 226 162 230Q150 236 140 228H60Q50 236 38 230Q24 226 26 206Z')),
      front: g(p(HR, CAP(104) + 'L168 186Q168 206 156 210Q150 196 148 184L147 112Q146 76 122 62Q108 58 100 62Q92 58 78 62Q54 76 53 112L52 184Q50 196 44 210Q32 206 32 186Z')) },
    pixie: { label: 'Pixie',
      back: g(BK + e(HR, 44, 116, 10, 14) + e(HR, 156, 116, 10, 14)),
      front: g(p(HR, CAP(112) + 'Q160 104 158 92Q156 72 132 64Q104 60 86 74Q74 84 62 84Q52 88 50 100Q46 112 34 112Z') +
        p(HR, 'M150 70Q166 66 168 80Q158 74 150 76Z')) },
    bun: { label: 'Bun',
      back: g(c(HR, 100, 19, 19) + BK),
      front: g(p(HR, CAP(106) + 'Q164 66 132 56Q100 50 68 56Q36 66 36 106Z') + r(AC, 82, 22, 36, 10, 5)) },
    afro: { label: 'Afro',
      back: g(c(HR, 100, 82, 80)),
      front: g(p(HR, CAP(104) + 'Q164 72 140 64Q120 58 100 62Q80 58 60 64Q36 72 36 104Z')) },
    buzz: { label: 'Buzz',
      back: '',
      front: g(p(HR, 'M38 96Q37 30 100 28Q163 30 162 96Q160 70 136 60Q100 52 64 60Q40 70 38 96Z')) }
  }, 'characters');

  /* ---------- tops ---------- */
  ART.parts('top', {
    tee: { label: 'Tee', svg: g(sleeve(T, 44, 26) + p(T, TORSO)) },
    stripe: { label: 'Stripes', svg: g(sleeve(T, 44, 26) + both(r(T2, 57, 178, 26, 7, 3.5, LA)) + p(T, TORSO) +
      r(T2, 68, 176, 64, 8, 0) + r(T2, 68, 196, 64, 8, 0)) },
    hoodie: { label: 'Hoodie', svg: g(e(T2, 100, 152, 46, 16) + sleeve(T, 56, 26) + cuff(T2, 196, 26) + p(T, TORSO) +
      p(T2, 'M80 198H120Q124 198 125 202L128 216Q129 220 125 220H75Q71 220 72 216L75 202Q76 198 80 198Z') +
      r(T2, 88, 150, 4, 24, 2) + r(T2, 108, 150, 4, 24, 2)) },
    dress: { label: 'Dress', svg: g(both(c(T, 66, 166, 15)) +
      p(T, 'M80 150H120Q130 150 132 160L152 244Q155 258 140 258H60Q45 258 48 244L68 160Q70 150 80 150Z') +
      p(T2, 'M60 196H140L143 208H57Z') + p(T2, 'M51 236H149L151 246Q152 251 146 251H54Q48 251 49 246Z')) },
    jacket: { label: 'Jacket', svg: g(sleeve(T, 54, 26) + p(T2, TORSO) +
      both(p(T, 'M68 174Q68 150 92 150H94L86 158L96 178V230H78Q68 230 68 220Z') + r(T2, 74, 204, 14, 4, 2))) },
    sweater: { label: 'Sweater', svg: g(sleeve(T, 56, 26) + cuff(T2, 196, 26) + p(T, TORSO) +
      p(T2, 'M100 206Q84 194 84 184Q84 176 92 176Q97 176 100 181Q103 176 108 176Q116 176 116 184Q116 194 100 206Z') +
      r(T2, 68, 217, 64, 9, 0) ) },
    chef: { label: 'Chef coat', svg: g(sleeve(CT, 50, 26) + cuff(CT2, 190, 26) +
      p(CT, 'M68 174Q68 150 92 150H108Q132 150 132 174V220Q132 230 122 230H78Q68 230 68 220Z') +
      r(CT2, 80, 146, 40, 10, 5) + r(CT2, 99, 160, 2, 66, 1) +
      c(CT2, 88, 182, 3.5) + c(CT2, 88, 198, 3.5) + c(CT2, 88, 214, 3.5) + c(CT2, 112, 182, 3.5) + c(CT2, 112, 198, 3.5) + c(CT2, 112, 214, 3.5)) },
    jersey: { label: 'Jersey', svg: g(sleeve(T, 44, 28) + cuff(T2, 182, 28) + p(T, TORSO) +
      both(p(T2, 'M68 178H78V226Q68 226 68 216Z')) + p(T2, 'M84 150H92L100 162L108 150H116L100 174Z')) }
  }, 'characters');

  /* ---------- bottoms ---------- */
  var LEGS2 = 'M72 214Q72 206 80 206H120Q128 206 128 214V';
  ART.parts('bot', {
    pants: { label: 'Pants', svg: g(p(B, LEGS2 + '280Q128 284 124 284H106Q102 284 102 280V242Q100 236 98 242V280Q98 284 94 284H76Q72 284 72 280Z') +
      r(B2, 72, 272, 26, 10, 4) + r(B2, 102, 272, 26, 10, 4)) },
    shorts: { label: 'Shorts', svg: g(p(B, LEGS2 + '244Q128 250 122 250H106Q102 250 102 246V238Q100 232 98 238V246Q98 250 94 250H78Q72 250 72 244Z')) },
    skirt: { label: 'Skirt', svg: g(p(B, 'M76 206H124Q131 206 133 212L145 244Q148 252 139 252H61Q52 252 55 244L67 212Q69 206 76 206Z') +
      p(B2, 'M58 236H142L145 244Q148 252 139 252H61Q52 252 55 244Z')) },
    leggings: { label: 'Leggings', svg: g(p(B, 'M75 214Q75 206 82 206H118Q125 206 125 214V278Q125 284 119 284H107Q101 284 101 278V238Q100 234 99 238V278Q99 284 93 284H81Q75 284 75 278Z')) },
    tutu: { label: 'Tutu', svg: g(p(B2, 'M56 226Q46 238 54 246Q60 252 68 246Q76 254 84 246Q92 254 100 246Q108 254 116 246Q124 254 132 246Q140 252 146 246Q154 238 144 226Z') +
      p(B, 'M70 206H130Q144 214 148 230Q150 238 142 238Q136 244 128 238Q122 244 114 238Q107 244 100 238Q93 244 86 238Q78 244 72 238Q64 244 58 238Q50 238 52 230Q56 214 70 206Z')) },
    cargo: { label: 'Cargo', svg: g(p(B, LEGS2 + '280Q128 284 124 284H106Q102 284 102 280V242Q100 236 98 242V280Q98 284 94 284H76Q72 284 72 280Z') +
      both(r(B2, 70, 236, 16, 20, 5) + r(B2, 69, 234, 18, 6, 3))) }
  }, 'characters');

  /* ---------- shoes ---------- */
  ART.parts('shoes', {
    sneakers: { label: 'Sneakers', svg: g(both(p(SH, 'M97 287Q97 277 88 277H80Q74 277 73 283Q61 285 61 294H97Z') +
      r(PAPER, 59, 292, 39, 8, 4) + c(PAPER, 84, 284, 2.5))) },
    boots: { label: 'Boots', svg: g(both(p(SH, 'M76 264Q76 258 82 258H92Q97 258 97 264V294H61Q61 284 76 281Z') +
      r('fill="#8A5A3B"', 59, 292, 39, 8, 4) + r(SH, 74, 255, 25, 9, 4.5))) },
    sandals: { label: 'Sandals', svg: g(both(p(SK, 'M97 284Q97 278 90 278H82Q76 278 76 284Q66 286 66 294H97Z') +
      r(SH, 62, 293, 36, 7, 3.5) + r(SH, 69, 285, 29, 6, 3) + r(SH, 81, 275, 6, 13, 3) + c(PAPER, 84, 288, 2.5))) },
    rainboots: { label: 'Rain boots', svg: g(both(p(SH, 'M73 252Q73 246 79 246H92Q98 246 98 252V296H59Q59 284 73 281Z') +
      r(PAPER, 57, 292, 42, 8, 4) + r(SH, 70, 243, 31, 10, 5) + r(PAPER, 79, 256, 5, 18, 2.5))) }
  }, 'characters');

  /* ---------- accessories ---------- */
  var RING = 'M78 86A15 15 0 1 1 78 116A15 15 0 1 1 78 86ZM78 90A11 11 0 1 0 78 112A11 11 0 1 0 78 90Z';
  ART.parts('acc', {
    glasses: { label: 'Glasses', svg: g(c('fill="#CFEAFE" opacity=".45"', 78, 101, 12) + c('fill="#CFEAFE" opacity=".45"', 122, 101, 12) +
      both(p(AC, RING, 'fill-rule="evenodd"') + r(AC, 46, 94, 18, 5, 2.5)) + r(AC, 91, 96, 18, 5, 2.5)) },
    bow: { label: 'Bow', svg: g(p(AC, 'M138 46Q120 26 124 48Q126 64 140 54Z') + p(AC, 'M146 50Q166 34 166 58Q164 72 148 60Z') + c(AC, 143, 53, 7)) },
    headband: { label: 'Headband', svg: g(p(AC, 'M32 98A68 72 0 0 1 168 98H158A58 62 0 0 0 42 98Z')) },
    cap: { label: 'Cap', svg: g(p(AC, 'M36 74Q36 22 100 22Q164 22 164 74Z') + p(AC, 'M28 74Q100 62 172 74Q174 84 164 84Q100 76 36 84Q26 84 28 74Z') +
      c(AC, 100, 22, 6) + c(PAPER, 100, 52, 11)) },
    beanie: { label: 'Beanie', svg: g(c(PAPER, 100, 14, 14) + p(AC, 'M36 72Q36 18 100 18Q164 18 164 72Z') + r(AC, 30, 62, 140, 20, 10) +
      r('fill="#FFFDF7" opacity=".35"', 48, 66, 6, 12, 3) + r('fill="#FFFDF7" opacity=".35"', 68, 66, 6, 12, 3) + r('fill="#FFFDF7" opacity=".35"', 88, 66, 6, 12, 3) +
      r('fill="#FFFDF7" opacity=".35"', 108, 66, 6, 12, 3) + r('fill="#FFFDF7" opacity=".35"', 128, 66, 6, 12, 3) + r('fill="#FFFDF7" opacity=".35"', 148, 66, 6, 12, 3)) },
    chefhat: { label: 'Chef hat', svg: g(c(PAPER, 66, 30, 24) + c(PAPER, 134, 30, 24) + c(PAPER, 100, 24, 26) + r(PAPER, 52, 30, 96, 30, 12) +
      r('fill="#FFF1DC"', 44, 52, 112, 22, 11) + r(AC, 44, 60, 112, 6, 0)) },
    flowers: { label: 'Flower crown', svg: g(
      e('fill="#4CC27A"', 56, 54, 9, 5, 'transform="rotate(-50 56 54)"') + e('fill="#4CC27A"', 144, 54, 9, 5, 'transform="rotate(50 144 54)"') +
      e('fill="#4CC27A"', 82, 38, 9, 5, 'transform="rotate(-20 82 38)"') + e('fill="#4CC27A"', 118, 38, 9, 5, 'transform="rotate(20 118 38)"') +
      c('fill="#FF9EC4"', 44, 70, 12) + c('fill="#FFD23F"', 44, 70, 5) +
      c('fill="#C9B6FF"', 68, 44, 12) + c('fill="#FFD23F"', 68, 44, 5) +
      c(AC, 100, 34, 14) + c('fill="#FFFDF7"', 100, 34, 5) +
      c('fill="#FFD23F"', 132, 44, 12) + c('fill="#FF7A6B"', 132, 44, 5) +
      c('fill="#FF9EC4"', 156, 70, 12) + c('fill="#FFD23F"', 156, 70, 5)) }
  }, 'characters');
})();
