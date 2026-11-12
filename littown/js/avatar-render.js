/* Lit Town — draws a character from a saved look (ES5), in the style C art (www/js/lit-style.js, the
 * character kit shared with Chore Quest). A look is plain data saved in the profile:
 *
 *   body   height, width (0.85–1.2; 1 = normal; only the torso, arms and legs stretch, never the head)
 *   colours skin, hair, eye (final colours, shade already applied); skinBase/skinTint, hairBase/hairTint
 *          (the swatch she picked and the shade slider, -0.5–0.5, so the editor can show them again)
 *   face   eyes, brows, nose, mouth, cheeks, freckles (kit part ids), expr (happy, surprised…)
 *   hair   hairStyle (kit hairstyle id)
 *   clothes top, bot, shoes, acc + topColor, top2, botColor, bot2, shoeColor, accColor
 *
 * Looks saved by the first version of the app (hairstyles pixie/afro/bun/buzz, face smile/grin/wow) are read as
 * the nearest new part, so nobody's character is lost. Drawn SVG is cached per look.
 * The SVG is 200 x 300 with the feet at y≈292, like before, so places and the shop still fit; a stretched
 * tall character's head may reach above the top (the SVG doesn't clip). */
(function (w) {
  var RA = w.RA = w.RA || {};
  var LAB = w.LAB;
  var PRESET = LAB ? LAB.preset('C') : null;

  var DEFAULT = {
    name: '',
    skin: '#EDB48A', hair: '#5A3825', eye: '#6B4A2F', hairStyle: 'bob',
    top: 'tee', topColor: '#3D8BFD', top2: '#FFFDF7',
    bot: 'pants', botColor: '#2F4C9C', bot2: '#FFD23F',
    shoes: 'sneakers', shoeColor: '#E5484D',
    acc: 'none', accColor: '#F76CA8',
    eyes: 'e9', brows: 'b2', nose: 'n4', mouth: 'm1', cheeks: 'c4', freckles: 'z1', expr: 'happy',
    height: 1, width: 1
  };

  /* the first version's parts → the nearest new ones */
  var OLD_HAIR = { pixie: 'crop', afro: 'curly', curly: 'longcurly', bun: 'highbun', buzz: 'shaved' };
  var OLD_FACE = { smile: { expr: 'happy', mouth: 'm2' }, grin: { expr: 'happy', mouth: 'm1' }, wow: { expr: 'surprised' } };
  /* first-version looks that predate faces: give them the kit's default face */
  function merge(cfg) {
    var out = {}, k;
    for (k in DEFAULT) { if (DEFAULT.hasOwnProperty(k)) { out[k] = DEFAULT[k]; } }
    if (cfg) { for (k in cfg) { if (cfg.hasOwnProperty(k) && cfg[k] != null && cfg[k] !== '') { out[k] = cfg[k]; } } }
    if (OLD_HAIR[out.hairStyle]) { out.hairStyle = OLD_HAIR[out.hairStyle]; }
    if (out.face && OLD_FACE[out.face]) {
      var f = OLD_FACE[out.face];
      if (!cfg || !cfg.expr) { out.expr = f.expr; }
      if (f.mouth && (!cfg || !cfg.mouth)) { out.mouth = f.mouth; }
    }
    delete out.face;
    out.height = clampNum(out.height, 0.85, 1.2, 1);
    out.width = clampNum(out.width, 0.85, 1.2, 1);
    return out;
  }
  function clampNum(v, lo, hi, d) { v = parseFloat(v); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); }

  /* body sliders → the kit's stretch object (from the kit's examples/render-node.js) */
  function stretch(width, height) {
    if (width === 1 && height === 1) { return 'normal'; }
    return { leg: height, th: 1 + (height - 1) * 0.6, arm: 1 + (height - 1) * 0.8, tw: width, lw: 1 + (width - 1) * 0.8, aw: 1 + (width - 1) * 0.5 };
  }

  function opts(c, mode) {
    return {
      t: PRESET, mode: mode || 'bake', style: c.hairStyle, expr: c.expr, body: stretch(c.width, c.height),
      wear: { top: c.top, bot: c.bot, shoes: c.shoes, acc: c.acc },
      kit: { eyes: c.eyes, brows: c.brows, nose: c.nose, mouth: c.mouth, cheeks: c.cheeks, freckles: c.freckles, frDensity: 0.6 },
      colors: { skin: c.skin, hair: c.hair, eye: c.eye, top: c.topColor, top2: c.top2, bot: c.botColor, bot2: c.bot2, shoe: c.shoeColor, acc: c.accColor }
    };
  }

  var cache = {}, cacheKeys = [], CACHE_MAX = 60;
  function remember(key, val) {
    if (!cache.hasOwnProperty(key)) { cacheKeys.push(key); }
    cache[key] = val;
    if (cacheKeys.length > CACHE_MAX) { delete cache[cacheKeys.shift()]; }
    return val;
  }

  /** The drawing for a look: { inner, g } in the kit's coordinates, with the feet moved to y = 292. */
  function draw(c) {
    var key = JSON.stringify(c);
    if (cache.hasOwnProperty(key)) { return cache[key]; }
    var r = LAB.character(opts(c, 'bake'));
    var dy = 292 - r.g.G;   // the kit moves everything down to fit tall hair; keep the feet where they always were
    var inner = dy ? '<g transform="translate(0 ' + LAB.n(dy) + ')">' + r.inner + '</g>' : r.inner;
    return remember(key, { inner: inner, g: r.g, dy: dy });
  }

  /**
   * Full character SVG (200 x 300).
   * opts.crop = 'head': only the head and hair, for face and hair thumbnails.
   */
  function svg(cfg, o) {
    if (!LAB) { return ''; }
    var c = merge(cfg), d = draw(c), vb = '0 0 200 300';
    o = o || {};
    if (o.crop === 'head') {
      var g = d.g, cy = g.hcy + d.dy;
      vb = '22 ' + LAB.n(cy - 82) + ' 156 156';
    } else if (o.crop === 'body') {
      vb = '30 ' + LAB.n(d.g.sh + d.dy - 20) + ' 140 140';
    } else if (o.crop === 'feet') {
      vb = '40 220 120 80';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" overflow="visible" class="avatar-svg">' + d.inner + '</svg>';
  }

  /** Where a worn hat's bottom-centre sits and where a held thing's centre goes (her right hand), in 200 x 300 units. */
  function anchors(cfg) {
    if (!LAB) { return { head: { x: 100, y: 76 }, hand: { x: 144, y: 214 } }; }
    var c = merge(cfg), d = draw(c), g = d.g;
    var hy = g.hcy - 16 * g.sy + d.dy;   // a worn hat's bottom-centre: a little above the middle of the head
    // the right hand: the left arm (pivot g.ax, g.ay, hanging down g.arm, rotated g.ang degrees) mirrored
    var a = g.ang * Math.PI / 180, L = g.arm - 4 + g.hand * 0.4;
    var lx = g.ax - Math.sin(a) * L, ly = g.ay + Math.cos(a) * L;
    return { head: { x: 100, y: hy }, hand: { x: 200 - lx, y: ly + d.dy } };
  }

  function styleVars() { return ''; }   // (kept for callers of the first version: colours are baked in now)

  RA.Avatar = {
    DEFAULT: DEFAULT,
    OLD_HAIR: OLD_HAIR,
    HEAD_TOP: [100, 30],
    HAND: [144, 214],
    merge: merge,
    svg: svg,
    anchors: anchors,
    stretch: stretch,
    styleVars: styleVars,
    tint: function (hex, t) { return LAB ? LAB.tint(hex, t) : hex; }
  };
})(typeof window !== 'undefined' ? window : this);
