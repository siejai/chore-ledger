/* Lit Town — art registry (ES5).
 * Art packs call ART.pack(name, defs) for whole sprites and
 * ART.parts(slot, defs, pack) for character-rig parts.
 * See STYLE_GUIDE.md for the drawing rules and ART_MANIFEST.json for the list.
 */
(function (w) {
  var ART = w.ART = w.ART || {};
  ART.sprites = ART.sprites || {};
  ART.slots = ART.slots || {};
  ART.packs = ART.packs || {};
  ART.loaded = ART.loaded || {};

  function parseViewBox(svg) {
    var m = /viewBox="\s*([\d.\-]+)[\s,]+([\d.\-]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(svg || '');
    if (!m) { return [0, 0, 100, 100]; }
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
  }

  function guessLayer(id) {
    if (id.indexOf('bg-') === 0) { return 'background'; }
    if (id.indexOf('ui-') === 0 || id.indexOf('icon-') === 0) { return 'ui'; }
    if (id.indexOf('bld-') === 0) { return 'building'; }
    if (id.indexOf('prop-') === 0) { return 'prop'; }
    if (id.indexOf('fx-') === 0) { return 'fixture'; }
    return 'object';
  }

  ART.parseViewBox = parseViewBox;

  /** Register whole sprites. defs: { id: '<svg…>' | {svg, anchor, scale, layer} } */
  ART.pack = function (name, defs) {
    var ids = [], id, d;
    for (id in defs) {
      if (!defs.hasOwnProperty(id)) { continue; }
      d = defs[id];
      if (typeof d === 'string') { d = { svg: d }; }
      d.id = id;
      d.pack = name;
      d.anchor = d.anchor || [0.5, 1];
      d.layer = d.layer || guessLayer(id);
      if (!d.scale) { d.scale = (d.layer === 'background' || d.layer === 'ui') ? 1 : 0.5; }
      d.vb = parseViewBox(d.svg);
      ART.sprites[id] = d;
      ids.push(id);
    }
    ART.packs[name] = (ART.packs[name] || []).concat(ids);
    ART.loaded[name] = true;
  };

  /** Register character parts. slot: 'base'|'face'|'hair'|'top'|'bot'|'shoes'|'acc'.
   * defs: { partId: '<g…>' | { svg, back, front, label } } (fragments in 200x300 rig space) */
  ART.parts = function (slot, defs, packName) {
    var s = ART.slots[slot] = ART.slots[slot] || {}, id, d;
    for (id in defs) {
      if (!defs.hasOwnProperty(id)) { continue; }
      d = defs[id];
      if (typeof d === 'string') { d = { svg: d }; }
      d.id = id;
      d.slot = slot;
      d.pack = packName || 'characters';
      s[id] = d;
    }
    ART.loaded[packName || 'characters'] = true;
  };

  ART.has = function (id) { return !!ART.sprites[id]; };

  ART.svg = function (id) {
    var d = ART.sprites[id];
    return d ? d.svg : '';
  };

  /** Display size in scene units. */
  ART.size = function (id) {
    var d = ART.sprites[id];
    if (!d) { return { w: 60, h: 60 }; }
    return { w: d.vb[2] * d.scale, h: d.vb[3] * d.scale };
  };

  ART.part = function (slot, id) {
    var s = ART.slots[slot];
    return (s && s[id]) ? s[id] : null;
  };

  ART.list = function (slot) {
    var out = [], s = ART.slots[slot] || {}, id;
    for (id in s) { if (s.hasOwnProperty(id)) { out.push(id); } }
    return out;
  };
})(typeof window !== 'undefined' ? window : this);
