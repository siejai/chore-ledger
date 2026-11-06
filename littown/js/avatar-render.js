/* Lit Town — builds a layered character SVG from rig parts (ES5). */
(function (w) {
  var RA = w.RA = w.RA || {};
  var ART = w.ART;

  var LAYERS = ['hairBack', 'legs', 'bot', 'shoes', 'arms', 'top', 'head', 'face', 'hairFront', 'acc'];

  /* class suffix -> config key */
  var COLOR_KEYS = {
    skin: 'skin', hair: 'hair', top: 'topColor', top2: 'top2',
    bot: 'botColor', bot2: 'bot2', shoe: 'shoeColor', acc: 'accColor'
  };

  var DEFAULT = {
    name: '',
    skin: '#EDB48A', hair: '#5A3825', hairStyle: 'bob',
    top: 'tee', topColor: '#3D8BFD', top2: '#FFFDF7',
    bot: 'pants', botColor: '#2F4C9C', bot2: '#FFD23F',
    shoes: 'sneakers', shoeColor: '#E5484D',
    acc: 'none', accColor: '#F76CA8',
    face: 'smile'
  };

  function merge(cfg) {
    var out = {}, k;
    for (k in DEFAULT) { if (DEFAULT.hasOwnProperty(k)) { out[k] = DEFAULT[k]; } }
    if (cfg) { for (k in cfg) { if (cfg.hasOwnProperty(k) && cfg[k] != null) { out[k] = cfg[k]; } } }
    return out;
  }

  function partSvg(slot, id, which) {
    var p = ART && ART.part(slot, id);
    if (!p) { return ''; }
    if (which) { return p[which] || ''; }
    return p.svg || '';
  }

  function layerSvg(layer, c) {
    switch (layer) {
      case 'hairBack': return partSvg('hair', c.hairStyle, 'back');
      case 'hairFront': return partSvg('hair', c.hairStyle, 'front');
      case 'legs': return partSvg('base', 'legs');
      case 'arms': return partSvg('base', 'arms');
      case 'head': return partSvg('base', 'head');
      case 'face': return partSvg('face', c.face) || partSvg('face', 'smile');
      case 'bot': return partSvg('bot', c.bot);
      case 'top': return partSvg('top', c.top);
      case 'shoes': return partSvg('shoes', c.shoes);
      case 'acc': return c.acc === 'none' ? '' : partSvg('acc', c.acc);
    }
    return '';
  }

  /** Replace default fills with the config colors (for tools and old WebViews). */
  function bake(str, c) {
    return str.replace(/class="c-(\w+)" fill="#[0-9A-Fa-f]{3,6}"/g, function (m, key) {
      var ck = COLOR_KEYS[key];
      if (!ck || !c[ck]) { return m; }
      return 'class="c-' + key + '" fill="' + c[ck] + '"';
    });
  }

  function styleVars(c) {
    return '--skin:' + c.skin + ';--hair:' + c.hair + ';--top:' + c.topColor + ';--top2:' + c.top2 +
      ';--bot:' + c.botColor + ';--bot2:' + c.bot2 + ';--shoe:' + c.shoeColor + ';--acc:' + c.accColor;
  }

  /**
   * Full character SVG.
   * opts.bake  – bake colors into fill attributes instead of relying on CSS variables.
   */
  function svg(cfg, opts) {
    var c = merge(cfg), inner = '', i;
    opts = opts || {};
    for (i = 0; i < LAYERS.length; i++) { inner += layerSvg(LAYERS[i], c); }
    var useBake = opts.bake || !RA.supportsCssVars;
    if (useBake) { inner = bake(inner, c); }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" class="avatar-svg' +
      (useBake ? '' : ' rc-avatar') + '"' + (useBake ? '' : ' style="' + styleVars(c) + '"') + '>' + inner + '</svg>';
  }

  RA.Avatar = {
    LAYERS: LAYERS,
    DEFAULT: DEFAULT,
    COLOR_KEYS: COLOR_KEYS,
    HEAD_TOP: [100, 30],
    HAND: [144, 214],
    merge: merge,
    bake: bake,
    styleVars: styleVars,
    svg: svg
  };

  if (RA.supportsCssVars === undefined) {
    try {
      RA.supportsCssVars = !!(w.CSS && w.CSS.supports && w.CSS.supports('--a', '0'));
    } catch (e) { RA.supportsCssVars = false; }
  }
})(typeof window !== 'undefined' ? window : this);
