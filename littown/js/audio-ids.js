/* Lit Town — audio file naming + "what audio does the content need" (ES5).
 * Shared by the app (browser) and by audio-pipeline/generate-audio.js (Node),
 * so both always agree on file names.
 *
 *   phoneme   ->  ph/<phonemeId>.mp3        e.g. ph/m.mp3, ph/sh.mp3
 *   word      ->  w/<word>.mp3              e.g. w/cat.mp3, w/don_t.mp3
 *   sentence  ->  s/<slug>-<hash>.mp3       e.g. s/the-cat-sat-on-the-mat-1x9k2a.mp3
 *   line      ->  i/<lineId>.mp3            guide-voice instructions & praise
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.RA = root.RA || {}; root.RA.AudioIds = api; }
})(typeof window !== 'undefined' ? window : this, function () {

  function normText(t) {
    return String(t || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  /* djb2 → base36, 6 chars. Stable across browser and Node. */
  function hash(str) {
    var h = 5381, i;
    for (i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    var s = (h >>> 0).toString(36);
    while (s.length < 6) { s = '0' + s; }
    return s.slice(-6);
  }

  function wordKey(w) {
    return String(w || '').toLowerCase()
      .replace(/[‘’']/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /* Split text into word tokens (keeps apostrophes inside words). */
  function tokens(text) {
    var out = [], re = /[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g, m;
    while ((m = re.exec(String(text || ''))) !== null) { out.push(m[0]); }
    return out;
  }

  function phoneme(id) { return 'ph/' + id; }
  function word(w) { return 'w/' + wordKey(w); }
  function line(id) { return 'i/' + id; }
  function sentence(text) {
    var t = normText(text);
    var slug = tokens(t).slice(0, 6).join('-').toLowerCase().replace(/[^a-z0-9\-]/g, '');
    return 's/' + (slug || 'x') + '-' + hash(t);
  }

  /* The clip to play for any piece of text: single words use the word clip. */
  function forText(text) {
    var tk = tokens(text);
    if (tk.length === 1) { return word(tk[0]); }
    return sentence(text);
  }

  function wordText(entry) { return typeof entry === 'string' ? entry : (entry && entry.w) || ''; }

  /**
   * Every audio clip the content needs.
   * Returns [{ id, category, text, phoneme? }] with category in
   * phoneme | word | sentence | story | instruction | praise
   */
  function collect(lessons, world, placement) {
    var seen = {}, list = [];
    function add(id, category, text, extra) {
      if (!id || seen[id]) { return; }
      seen[id] = true;
      var item = { id: id, category: category, text: text };
      if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) { item[k] = extra[k]; } } }
      list.push(item);
    }
    function addWord(w) {
      var k = wordKey(w);
      if (k) { add('w/' + k, 'word', String(w).toLowerCase() === 'i' ? 'I' : String(w).toLowerCase()); }
    }
    function addSentence(text, cat) {
      if (!normText(text)) { return; }
      var tk = tokens(text), i;
      if (tk.length === 1) { addWord(tk[0]); return; }
      add(sentence(text), cat || 'sentence', normText(text));
      for (i = 0; i < tk.length; i++) { addWord(tk[i]); }
    }
    /* the rotating activity: words she hears, sentences she can tap to hear, bin labels */
    function collectActivity(a) {
      (a.words || []).forEach(addWord);
      (a.items || []).forEach(function (it) {
        if (it.t && it.answer) { addSentence(it.t.replace('_', it.answer)); }
        (it.clues || []).forEach(function (c) { addSentence(c); });
        if (it.answer) { addWord(it.answer); }
        (it.options || []).forEach(addWord);
      });
      (a.steps || []).forEach(function (st) { addSentence(st.t); });
      (a.bins || []).forEach(function (b) { if (!(lessons.graphemes || {})[b]) { addWord(b); } });
    }
    var p, i, j, L, id;
    lessons = lessons || {};
    for (p in (lessons.phonemes || {})) {
      if (lessons.phonemes.hasOwnProperty(p)) {
        add('ph/' + p, 'phoneme', lessons.phonemes[p].say || p, { phoneme: p, ipa: lessons.phonemes[p].ipa, kind: lessons.phonemes[p].kind });
      }
    }
    for (id in (lessons.lines || {})) {
      if (lessons.lines.hasOwnProperty(id)) {
        add('i/' + id, /^(great|praise|yay)/.test(id) ? 'praise' : 'instruction', lessons.lines[id]);
      }
    }
    var ls = lessons.lessons || [];
    for (i = 0; i < ls.length; i++) {
      L = ls[i];
      for (j = 0; j < (L.teach || []).length; j++) {
        var t = L.teach[j];
        if (t.type === 'sight') { addWord(t.w); }
        if (t.type === 'concept' && t.say) { add('i/c-' + t.id, 'instruction', t.say); }
        if (t.examples) { for (var e = 0; e < t.examples.length; e++) { addWord(t.examples[e]); } }
      }
      for (j = 0; j < (L.words || []).length; j++) { addWord(wordText(L.words[j])); }
      for (j = 0; j < (L.sentences || []).length; j++) { addSentence(L.sentences[j].t); }
      for (j = 0; j < (L.build || []).length; j++) { addWord(L.build[j]); }
      if (L.activity) { collectActivity(L.activity); }
      if (L.story) {
        addSentence(L.story.title, 'story');
        for (j = 0; j < (L.story.pages || []).length; j++) { addSentence(L.story.pages[j].t, 'story'); }
        if (L.story.question) { addSentence(L.story.question.t, 'story'); }
      }
    }
    // the placement test: every word it may say ("show me what you know")
    ((placement && placement.checkpoints) || []).forEach(function (cp) {
      (cp.words || []).forEach(function (x) { addWord(typeof x === 'string' ? x : x.w); });
    });
    // every picture name (said when she picks the right picture)
    for (id in (lessons.pictures || {})) { if (lessons.pictures.hasOwnProperty(id)) { addWord(id); } }
    world = world || {};
    var groups = ['items', 'characters', 'locations'];
    for (i = 0; i < groups.length; i++) {
      var arr = world[groups[i]] || [];
      for (j = 0; j < arr.length; j++) {
        if (arr[j].label) { addSentence(arr[j].label); }
        if (arr[j].name) { addSentence(arr[j].name); }
      }
    }
    var req = world.requests || [];
    for (i = 0; i < req.length; i++) { addSentence(req[i].text); if (req[i].thanks) { addSentence(req[i].thanks); } }
    var locs = world.locations || [];
    // signs, hotspots and fixtures that say a word: on the place itself and in each of its rooms
    for (i = 0; i < locs.length; i++) {
      var scenes = [locs[i]].concat(locs[i].rooms || []);
      for (var sc = 0; sc < scenes.length; sc++) {
        var signs = scenes[sc].signs || [];
        for (j = 0; j < signs.length; j++) { addSentence(signs[j].text); }
        var spots = scenes[sc].hotspots || [];
        for (j = 0; j < spots.length; j++) { if (spots[j].say) { addSentence(spots[j].say); } }
        var fxs = scenes[sc].fixtures || [];
        for (j = 0; j < fxs.length; j++) { if (fxs[j].say) { addSentence(fxs[j].say); } }
      }
    }
    for (i = 0; i < (world.extraWords || []).length; i++) { addWord(world.extraWords[i]); }
    return list;
  }

  return {
    normText: normText,
    hash: hash,
    wordKey: wordKey,
    tokens: tokens,
    phoneme: phoneme,
    word: word,
    line: line,
    sentence: sentence,
    forText: forText,
    collect: collect
  };
});
