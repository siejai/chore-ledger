/* Lit Town — what a child can decode at lesson n (ES5, also used by tools in Node).
 *
 *   var P = Phonics.create(lessonsJson);
 *   P.segment('ship', 31)   -> [{g:'sh', sound:'sh', show:'sh'}, {g:'i'...}, {g:'p'...}]
 *   P.decodable('ship', 31) -> true
 *   P.textDecodable('Pip ran.', 17) -> true
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.RA = root.RA || {}; root.RA.Phonics = api; }
})(typeof window !== 'undefined' ? window : this, function () {

  var VOWELS = 'aeiou';

  function lower(s) { return String(s || '').toLowerCase(); }

  function tokens(text) {
    var out = [], re = /[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g, m;
    while ((m = re.exec(String(text || ''))) !== null) { out.push(m[0]); }
    return out;
  }

  function create(data) {
    var lessons = (data && data.lessons) || [];
    var graphemes = (data && data.graphemes) || {};
    /* every multi-letter pattern in the course (longest first). If a word contains one that
       has not been taught yet, reading it letter by letter would give the wrong sounds,
       so it is not decodable yet — except these, which sound the same letter by letter: */
    var BENIGN = { ff: 1, ll: 1, ss: 1, zz: 1, ck: 1, nk: 1, tch: 1 };
    /* patterns that only exist in one spot of a word: final -le (little) is not the l-e in leg or flex */
    var AT_END = { le: 1 };
    var coursePatterns = Object.keys(graphemes).filter(function (g) { return g.length > 1 && g.indexOf('_') < 0; })
      .sort(function (a, b) { return b.length - a.length; });
    var settings = (data && data.settings) || {};
    var capitalsLesson = settings.capitalsLesson || 9999;

    /* cumulative knowledge after each lesson */
    var know = [{ g: {}, sight: {}, concepts: {}, gList: [] }];
    var i, j, prev, cur, t, gs, k;
    for (i = 0; i < lessons.length; i++) {
      prev = know[i];
      cur = { g: {}, sight: {}, concepts: {}, gList: [] };
      for (k in prev.g) { if (prev.g.hasOwnProperty(k)) { cur.g[k] = true; } }
      for (k in prev.sight) { if (prev.sight.hasOwnProperty(k)) { cur.sight[k] = true; } }
      for (k in prev.concepts) { if (prev.concepts.hasOwnProperty(k)) { cur.concepts[k] = true; } }
      for (j = 0; j < (lessons[i].teach || []).length; j++) {
        t = lessons[i].teach[j];
        if (t.type === 'grapheme') {
          gs = typeof t.g === 'string' ? [t.g] : (t.g || []);
          for (k = 0; k < gs.length; k++) { cur.g[gs[k]] = true; }
        } else if (t.type === 'sight') {
          cur.sight[lower(t.w)] = true;
        } else if (t.type === 'concept') {
          cur.concepts[t.id] = true;
        }
      }
      for (k in cur.g) { if (cur.g.hasOwnProperty(k)) { cur.gList.push(k); } }
      // longest graphemes first for greedy matching; split digraphs handled separately
      cur.gList = cur.gList.filter(function (g) { return g.indexOf('_') < 0; })
        .sort(function (a, b) { return b.length - a.length; });
      know.push(cur);
    }

    function at(n) {
      if (n == null || n >= know.length) { return know[know.length - 1]; }
      if (n < 0) { return know[0]; }
      return know[n];
    }

    function soundOf(g) { return graphemes[g] ? graphemes[g].sound : g; }

    /** Greedy longest-match split of a lowercase letter string using known graphemes. */
    function greedy(str, K) {
      var out = [], pos = 0, m, found, g;
      while (pos < str.length) {
        found = null;
        for (m = 0; m < K.gList.length; m++) {
          g = K.gList[m];
          if (str.substr(pos, g.length) === g) { found = g; break; }
        }
        if (!found) { return null; }
        for (m = 0; m < coursePatterns.length; m++) {
          g = coursePatterns[m];
          if (g.length <= found.length) { break; }
          if (AT_END[g] && pos + g.length !== str.length) { continue; }
          if (str.substr(pos, g.length) === g && !BENIGN[g]) { return null; }
        }
        out.push({ g: found, sound: soundOf(found), show: found });
        pos += found.length;
      }
      return out;
    }

    /**
     * Split a word into graphemes the child knows at lesson n.
     * entry may be a string or { w, seg: ['h','a','s:z'] }.
     * Returns array of { g, sound, show, silent? } or null if not decodable.
     */
    function segment(entry, n) {
      var K = at(n), word, seg, out, i2, parts;
      if (entry && typeof entry === 'object') {
        word = lower(entry.w);
        if (entry.seg) {
          out = [];
          for (i2 = 0; i2 < entry.seg.length; i2++) {
            parts = entry.seg[i2].split(':');
            if (parts[0] === '_e') { out.push({ g: '_e', sound: '', show: 'e', silent: true }); continue; }
            if (!K.g[parts[0]]) { return null; }
            out.push({ g: parts[0], sound: parts[1] || soundOf(parts[0]), show: parts[0].replace('_e', '') });
          }
          return out;
        }
      } else {
        word = lower(entry);
      }
      word = word.replace(/['’]/g, '');
      if (!word) { return null; }
      // split digraph (silent e): …V C e
      var sm = /^(.*)([aeiou])([^aeiou]{1,2})e$/.exec(word);
      if (sm && graphemes[sm[2] + '_e'] && !K.g[sm[2] + '_e'] && sm[3] !== 'r' && word.length > 2) { return null; }
      if (sm && K.g[sm[2] + '_e'] && sm[3] !== 'r') {
        var head = sm[1] ? greedy(sm[1], K) : [];
        var mid = greedy(sm[3], K);
        if (head && mid) {
          out = head.concat([{ g: sm[2] + '_e', sound: soundOf(sm[2] + '_e'), show: sm[2] }], mid,
            [{ g: sm[2] + '_e', sound: '', show: 'e', silent: true }]);
          return out;
        }
      }
      return greedy(word, K);
    }

    function isSight(w, n) { return !!at(n).sight[lower(w)]; }

    function decodable(word, n) {
      var w = typeof word === 'object' ? word.w : word;
      if (!w) { return false; }
      if (isSight(w, n)) { return true; }
      var K = at(n);
      if (w !== lower(w)) {
        // capital letters are readable after the capitals lesson
        if (!K.concepts.capitals && n < capitalsLesson) { return false; }
      }
      return !!segment(word, n);
    }

    function textDecodable(text, n) {
      var tk = tokens(text), i2;
      if (!tk.length) { return false; }
      for (i2 = 0; i2 < tk.length; i2++) { if (!decodable(tk[i2], n)) { return false; } }
      return true;
    }

    /** First word in the text that is not decodable at lesson n, or null. */
    function firstProblem(text, n) {
      var tk = tokens(text), i2;
      for (i2 = 0; i2 < tk.length; i2++) { if (!decodable(tk[i2], n)) { return tk[i2]; } }
      return null;
    }

    function knownGraphemes(n) { return at(n).gList.concat(Object.keys(at(n).g).filter(function (g) { return g.indexOf('_') > 0; })); }
    function knownSight(n) { return Object.keys(at(n).sight); }
    function knows(concept, n) { return !!at(n).concepts[concept]; }

    /** Lesson number where grapheme / sight word / concept is first taught, or 0. */
    function taughtIn(kind, value) {
      for (var a = 1; a < know.length; a++) {
        if (kind === 'g' && know[a].g[value] && !know[a - 1].g[value]) { return a; }
        if (kind === 'sight' && know[a].sight[lower(value)] && !know[a - 1].sight[lower(value)]) { return a; }
        if (kind === 'concept' && know[a].concepts[value] && !know[a - 1].concepts[value]) { return a; }
      }
      return 0;
    }

    return {
      segment: segment,
      decodable: decodable,
      textDecodable: textDecodable,
      firstProblem: firstProblem,
      isSight: isSight,
      soundOf: soundOf,
      knownGraphemes: knownGraphemes,
      knownSight: knownSight,
      knows: knows,
      taughtIn: taughtIn,
      tokens: tokens,
      lessonCount: lessons.length
    };
  }

  return { create: create, tokens: tokens, VOWELS: VOWELS };
});
