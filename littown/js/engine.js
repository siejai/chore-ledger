/* Lit Town — lesson engine: builds the lesson rhythm, scores answers,
 * spaced repetition, mastery gating, and flames (earning and spending) (ES5). No DOM in here. */
(function (w) {
  var RA = w.RA = w.RA || {};
  var U = RA.U;

  var E = RA.Engine = {};
  var data = null, world = null, P = null;

  /* letters that are easy to confuse — preferred as distractors */
  var CONFUSE = {
    b: ['d', 'p', 'h'], d: ['b', 'p', 'g'], p: ['b', 'd', 'g'], g: ['d', 'p', 'c'],
    m: ['n', 'w', 'h'], n: ['m', 'u', 'h'], u: ['n', 'o', 'a'], h: ['n', 'b', 'k'],
    e: ['i', 'a', 'o'], i: ['e', 'l', 't'], a: ['o', 'e', 'u'], o: ['a', 'c', 'u'],
    t: ['f', 'l', 'i'], f: ['t', 'l', 'k'], s: ['z', 'c', 'a'], c: ['o', 'e', 's'],
    k: ['h', 'x', 'ck'], ck: ['k', 'c', 'x'], r: ['n', 'm', 'h']
  };

  E.init = function (lessonsData, worldData) {
    data = lessonsData;
    world = worldData || {};
    P = RA.Phonics.create(data);
    E.P = P;
    E.settings = data.settings || {};
  };

  E.count = function () { return data.lessons.length; };
  E.lesson = function (n) { return data.lessons[n - 1] || null; };
  E.lines = function () { return data.lines || {}; };
  E.phonemeOf = function (g) { return data.graphemes[g] ? data.graphemes[g].sound : g; };
  E.world = function () { return world; };
  E.pictures = function () { return data.pictures || {}; };
  E.isGrapheme = function (g) { return !!data.graphemes[g]; };

  function intervals() { return E.settings.intervals || [0, 1, 2, 4, 8, 16]; }

  /* ---------- the child's knowledge "level" ---------- */

  /** Highest lesson whose content she has been taught (for decodability in the world). */
  /** Highest lesson reached (passed, or placed by the test / a grown-up). It drives places, house
   *  fix-ups, the shop and unlocks, and never goes down. */
  E.level = function (profile) {
    var pr = profile.progress, passed = pr.passed, best = pr.highest || 0, k;
    for (k in passed) { if (passed.hasOwnProperty(k) && +k > best) { best = +k; } }
    return best;
  };
  /** Working lesson: where she practises now ("Read: lesson N"). It can step back; unlocks never do. */
  E.working = function (profile) {
    var pr = profile.progress;
    return U.clamp(pr.working || Math.min(pr.unlocked || 1, E.count()), 1, E.count());
  };

  E.canRead = function (profile, text) { return P.textDecodable(text, E.level(profile)); };

  /* ---------- spaced repetition ---------- */

  function rec(profile, key) {
    var it = profile.items[key];
    if (!it) { it = profile.items[key] = { box: 0, c: 0, w: 0, last: profile.progress.lessonCount }; }
    return it;
  }

  E.record = function (profile, key, correct) {
    if (!key) { return; }
    var it = rec(profile, key), now = profile.progress.lessonCount;
    // a box can move up at most once per lesson, so one good lesson doesn't hide a miss
    if (correct) {
      it.c++;
      if (it.adv !== now) { it.box = Math.min(it.box + 1, intervals().length - 1); it.adv = now; }
    } else { it.w++; it.box = 0; it.adv = now; }
    it.last = now;
  };

  function isDue(profile, key) {
    var it = profile.items[key];
    if (!it) { return false; }
    return profile.progress.lessonCount - it.last >= intervals()[it.box];
  }

  /** Items she finds hard: [{key, label, c, w}] most-missed first. */
  E.weakItems = function (profile, limit) {
    var out = [], k, it;
    for (k in profile.items) {
      if (!profile.items.hasOwnProperty(k)) { continue; }
      it = profile.items[k];
      if (it.w > 0 && (it.box <= 1 || it.w / (it.c + it.w) >= 0.25)) {
        out.push({ key: k, label: k.slice(k.indexOf(':') + 1), kind: k.slice(0, k.indexOf(':')), c: it.c, w: it.w, box: it.box });
      }
    }
    out.sort(function (a, b) { return (b.w / (b.c + b.w)) - (a.w / (a.c + a.w)) || b.w - a.w; });
    return limit ? out.slice(0, limit) : out;
  };

  /* ---------- pictures and words ---------- */

  /** The picture for a word (lessons.json "pictures"), or ''. */
  E.picture = function (word) { var p = (data.pictures || {})[String(word || '').toLowerCase()]; return p || ''; };
  E.isAnimal = function (word) { return U.contains(data.animals || [], String(word || '').toLowerCase()); };
  function pictureWords() { return Object.keys(data.pictures || {}); }

  var BLOCKED = null;
  /** Never shown: blocked words; and for made-up words (madeUp), anything containing a blocked part. */
  function blocked(w, madeUp) {
    if (!BLOCKED) { BLOCKED = {}; (data.blocked || []).forEach(function (b) { BLOCKED[b] = true; }); }
    var x = String(w).toLowerCase(), i, parts = data.blockedParts || [];
    if (BLOCKED[x]) { return true; }
    if (madeUp) { for (i = 0; i < parts.length; i++) { if (x.indexOf(parts[i]) >= 0) { return true; } } }
    return false;
  }
  E.blocked = blocked;

  function wordsUpTo(n) {
    var out = [], i, j, wd;
    for (i = 0; i < Math.min(n, data.lessons.length); i++) {
      for (j = 0; j < (data.lessons[i].words || []).length; j++) {
        wd = data.lessons[i].words[j];
        out.push(typeof wd === 'string' ? wd : wd.w);
      }
    }
    return U.unique(out.concat(P.knownSight(n).map(function (s) { return s === 'i' ? 'I' : s; })));
  }

  /** Real words she could read at lesson n (lessons, tricky words, pictures and the word list). */
  var lexCache = {};
  function realWords(n) {
    if (lexCache[n]) { return lexCache[n]; }
    var all = U.unique(wordsUpTo(n).map(function (x) { return x.toLowerCase(); }).concat(data.lexicon || [], pictureWords()));
    lexCache[n] = all.filter(function (x) { return !blocked(x) && P.decodable(x, n); });
    return lexCache[n];
  }

  /* ---------- near misses: wrong answers one sound away (mat / map / man) ---------- */

  function graphemesOf(word, n) {
    var seg = P.segment(word.toLowerCase(), n);
    return seg ? seg.map(function (x) { return x.g; }) : word.toLowerCase().split('');
  }
  function isVowelG(g) { return /^[aeiou]/.test(g) && g !== 'qu'; }
  function sameCase(model, w) { return model.length > 1 && model.charAt(0) !== model.charAt(0).toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w; }

  /** How far apart two grapheme lists are: 0 = one sound swapped, 1 = one sound added/dropped, 9 = further. */
  function soundDistance(a, b) {
    var i, diff = 0;
    if (a.length === b.length) {
      for (i = 0; i < a.length; i++) { if (a[i] !== b[i]) { diff++; } }
      return diff === 1 ? 0 : 9;
    }
    var L = a.length > b.length ? a : b, S = a.length > b.length ? b : a;
    if (L.length - S.length !== 1) { return 9; }
    for (i = 0; i < L.length; i++) { if (L.slice(0, i).concat(L.slice(i + 1)).join('|') === S.join('|')) { return 1; } }
    return 9;
  }

  /**
   * Up to count-1 wrong words for target, each one sound away and readable at lesson n.
   * Real words first; if there aren't enough, made-up ones from taught letters (never blocked words).
   */
  E.nearMisses = function (target, n, count) {
    var t = target.toLowerCase(), need = count - 1, out = [], usedPos = {};
    // tricky words (and anything she can't sound out) get real look-alike words only
    if (P.isSight(t, n) || !P.segment(t, n)) { return lookAlikes(target, n, need); }
    var tg = graphemesOf(t, n);
    var cands = realWords(n).filter(function (w) { return w !== t; }).map(function (w) { return { w: w, d: soundDistance(tg, graphemesOf(w, n)), g: graphemesOf(w, n) }; })
      .filter(function (c) { return c.d < 9; });
    cands = U.shuffle(cands);
    // one-sound swaps first, spread over different positions (beginning, middle, end)
    cands.sort(function (a, b) { return a.d - b.d; });
    cands.forEach(function (c) {
      if (out.length >= need) { return; }
      var pos = -1, i;
      if (c.d === 0) { for (i = 0; i < tg.length; i++) { if (tg[i] !== c.g[i]) { pos = i; } } }
      if (pos >= 0 && usedPos[pos] && cands.length > need + 2) { return; }
      usedPos[pos] = true;
      out.push(c.w);
    });
    if (out.length < need) {
      cands.forEach(function (c) { if (out.length < need && !U.contains(out, c.w)) { out.push(c.w); } });
    }
    // not enough real words this early: a made-up word that still sounds like a word. Only the vowel,
    // or a single consonant right next to a vowel, is swapped for another taught single letter.
    var known = P.knownGraphemes(n).filter(function (g) { return g.length === 1; }), tries = 0, spots = [], i;
    for (i = 0; i < tg.length; i++) {
      if (tg[i].length !== 1) { continue; }
      // a vowel, or a consonant on its own (not part of a blend like st, dr, nd or a double like ff)
      if (isVowelG(tg[i]) || ((i === 0 || isVowelG(tg[i - 1])) && (i === tg.length - 1 || isVowelG(tg[i + 1])))) { spots.push(i); }
    }
    while (out.length < need && tries++ < 80 && spots.length) {
      var at = U.pick(spots), g0 = tg[at];
      var same = known.filter(function (g) { return g !== g0 && isVowelG(g) === isVowelG(g0) && g !== 'x' && g !== 'q'; });
      if (!same.length) { continue; }
      var w2 = tg.slice(0, at).concat([U.pick(same)], tg.slice(at + 1)).join('');
      if (w2 !== t && !U.contains(out, w2) && !blocked(w2, !U.contains(data.lexicon || [], w2)) && P.decodable(w2, n)) { out.push(w2); }
    }
    return out.map(function (w) { return sameCase(target, w); });
  };

  /** Real words that look like a tricky word (he / the / she, was / as / gas). */
  function lookAlikes(target, n, need) {
    var t = target.toLowerCase();
    var cands = U.shuffle(realWords(n).filter(function (w) { return w !== t && Math.abs(w.length - t.length) <= 1; }));
    cands.sort(function (a, b) { return U.editDistance(a, t) - U.editDistance(b, t); });
    return cands.filter(function (w) { return U.editDistance(w, t) <= 2; }).slice(0, need).map(function (w) { return sameCase(target, w); });
  }

  /* ---------- where the right answer goes (never the same spot three times running) ---------- */

  function Placer() { this.last = []; }
  Placer.prototype.place = function (right, wrong) {
    var n = wrong.length + 1, avoid = this.last.length >= 2 && this.last[0] === this.last[1] ? this.last[0] : -1, i, spots = [];
    for (i = 0; i < n; i++) { if (i !== avoid && i !== this.last[this.last.length - 1]) { spots.push(i); } }
    if (!spots.length) { for (i = 0; i < n; i++) { if (i !== avoid) { spots.push(i); } } }
    var at = U.pick(spots), opts = U.shuffle(wrong.slice());
    opts.splice(at, 0, right);
    this.last.push(at);
    if (this.last.length > 2) { this.last.shift(); }
    return opts;
  };

  /* ---------- letters ---------- */

  function graphemeOptions(target, n, count, placer) {
    var known = P.knownGraphemes(n).filter(function (g) { return g.indexOf('_') < 0; });
    var tSound = E.phonemeOf(target);
    function ok(g) { return g !== target && E.phonemeOf(g) !== tSound && g.indexOf('_') < 0; }
    var pool = [], i;
    (CONFUSE[target] || []).forEach(function (g) { if (U.contains(known, g) && ok(g)) { pool.push(g); } });
    U.shuffle(known).forEach(function (g) { if (ok(g) && !U.contains(pool, g)) { pool.push(g); } });
    // very early lessons: fill with letters still to come (visual discrimination only)
    for (i = n; pool.length < count - 1 && i < data.lessons.length; i++) {
      (data.lessons[i].teach || []).forEach(function (t) {
        if (t.type === 'grapheme') {
          [].concat(t.g).forEach(function (g) { if (ok(g) && !U.contains(pool, g) && g.length === 1) { pool.push(g); } });
        }
      });
    }
    return placer.place(target, pool.slice(0, count - 1));
  }

  /* ---------- building a lesson ---------- */

  /* Every activity with a right answer feeds the 80% first-try gate. Unscored: free colouring (no
   * right answer), the stuck-item teach step (it teaches, it doesn't test) and tracing (if added). */
  var TIER_OF = {
    'find-sound': 'scored', 'find-word': 'scored', 'find-in-text': 'scored', 'match-case': 'scored', 'pic-start': 'scored', 'pic-match': 'scored', 'finish': 'scored',
    'clue': 'scored', 'direction': 'scored', 'build': 'scored', 'sort': 'scored',
    'stuck-teach': 'practice', 'trace': 'play', 'color': 'play'
  };
  /** Activity types for the rotating slot, and what each is called for grown-ups. */
  E.ACTIVITIES = {
    'pic-start': 'Pick the picture that starts with the sound', 'pic-match': 'Match the word to its picture',
    'hear-word': 'Tap the word you hear', 'finish': 'Finish the sentence', 'direction': 'Follow the directions',
    'clue': '"I\'m thinking of an animal"', 'sort': 'Sorting', 'color': 'Colouring'
  };
  E.stepTier = function (type) { return TIER_OF[type] || null; };

  function mk(type, extra) {
    var s = { type: type }, k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    s.tier = s.tier || TIER_OF[type] || null;
    s.scored = s.tier === 'scored';
    return s;
  }

  function stepFindSound(g, n, placer, section) {
    return mk('find-sound', { g: g, sound: E.phonemeOf(g), options: graphemeOptions(g, n, n <= 2 ? 3 : 4, placer), key: 'g:' + g, section: section });
  }

  function stepFindWord(word, n, placer, section) {
    var wrong = E.nearMisses(word, n, 3);
    if (wrong.length < 1) { return null; }   // too early for a real choice: skip rather than show unreadable words
    var isSight = P.isSight(word, n);
    return mk('find-word', { w: word, options: placer.place(word, wrong), key: (isSight ? 'sw:' : 'w:') + word.toLowerCase(), section: section });
  }

  /**
   * "Find the word you hear" in a short passage she has just read (two sentences or two story pages),
   * as in the 100-lesson books: she hears a word and taps it in the text. Built from the lesson's own
   * story or sentences, so no extra content is needed. Targets: words that appear once in the passage,
   * that she can read by this lesson (taught tricky words count), at least two letters; words with this
   * lesson's new sound first, then the lesson's word list, then the rest.
   * Returns up to `count` steps sharing one passage (fewer if the passage is too short).
   */
  var FIT_MIN_WORDS = 6;
  E.findInText = function (lesson, n, count) {
    var texts = [];
    function pairUp(list) {
      for (var i = 0; i < list.length; i += 2) { texts.push(list.slice(i, i + 2).join(' ')); }
    }
    if (lesson.story && lesson.story.pages) { pairUp(lesson.story.pages.map(function (pg) { return pg.t; })); }
    pairUp((lesson.sentences || []).map(function (x) { return x.t; }));
    var newGs = [], lessonWords = {};
    (lesson.teach || []).forEach(function (t) { if (t.type === 'grapheme') { newGs = newGs.concat(t.g); } });
    (lesson.words || []).forEach(function (wd) { lessonWords[(typeof wd === 'string' ? wd : wd.w).toLowerCase()] = 1; });
    function score(wd) {
      var seg = P.segment(wd.toLowerCase(), n) || [], sc = 0;
      if (seg.some(function (x) { return U.contains(newGs, x.g); })) { sc += 2; }
      if (lessonWords[wd.toLowerCase()]) { sc += 1; }
      return sc + Math.random() * 0.5;
    }
    var best = null;
    texts.forEach(function (t) {
      var tk = RA.AudioIds.tokens(t), counts = {};
      if (tk.length < FIT_MIN_WORDS) { return; }
      tk.forEach(function (x) { counts[x.toLowerCase()] = (counts[x.toLowerCase()] || 0) + 1; });
      var cands = [];
      tk.forEach(function (x, i) {
        var lw = x.toLowerCase();
        if (lw.length < 2 || counts[lw] !== 1) { return; }
        if (!P.decodable(x, n) && !P.decodable(lw, n)) { return; }
        cands.push({ w: lw, at: i, score: score(x) });
      });
      if (cands.length >= 2 && (!best || cands.length > best.cands.length)) { best = { t: t, cands: cands }; }
    });
    if (!best) { return []; }
    var picked = best.cands.sort(function (a, b) { return b.score - a.score; }).slice(0, count);
    // read them in a mixed order, so the answer isn't always further along the line
    return U.shuffle(picked).map(function (c) {
      return mk('find-in-text', { t: best.t, w: c.w, at: c.at, key: (P.isSight(c.w, n) ? 'sw:' : 'w:') + c.w });
    });
  };

  /** A build-the-word step: the word's sound tiles plus one near-miss tile, shuffled. */
  function stepBuild(word, n, section) {
    var seg = P.segment(word, n);
    if (!seg || seg.length < 2) { return null; }
    var tiles = seg.filter(function (x) { return !x.silent; }).map(function (x) { return x.g; });
    var known = P.knownGraphemes(n).filter(function (g) { return g.indexOf('_') < 0 && g.length === 1 && !U.contains(tiles, g); });
    // the spare tile is a near miss: a sound that is easy to mix up with one in the word (mat → n, p, o…)
    var near = [];
    tiles.forEach(function (g) { (CONFUSE[g] || []).forEach(function (c) { if (U.contains(known, c) && !U.contains(near, c)) { near.push(c); } }); });
    var spare = U.pick(near.length ? near : known);
    var pool = tiles.concat(spare ? [spare] : []), shuffled;
    do { shuffled = U.shuffle(pool.slice()); } while (shuffled.slice(0, tiles.length).join('') === tiles.join('') && pool.length > 1);
    return mk('build', { w: word, seg: seg, tiles: shuffled, answer: tiles, key: 'w:' + word.toLowerCase(), section: section });
  }

  function picOpt(w) { return { w: w, pic: E.picture(w) }; }

  /** Pictures whose names are near misses of a word (or else other pictures), for word-to-picture. */
  function nearPictures(word, n, count) {
    var t = word.toLowerCase(), tg = graphemesOf(t, n);
    var pics = pictureWords().filter(function (w) { return w !== t && E.picture(w); });
    pics = U.shuffle(pics);
    pics.sort(function (a, b) { return soundDistance(tg, graphemesOf(a, 99)) - soundDistance(tg, graphemesOf(b, 99)); });
    return pics.slice(0, count - 1);
  }

  function firstSound(w) { var seg = P.segment(w.toLowerCase(), 99); return seg ? seg[0].sound : w.charAt(0); }

  /** Steps for the lesson's rotating activity (lessons.json "activity"). */
  function activitySteps(a, n, placer, profile) {
    var out = [], first = true;
    function push(s) { if (s) { s.section = 'activity'; s.first = first; s.activity = a.type; first = false; out.push(s); } }
    if (a.type === 'pic-start') {
      (a.sounds || []).forEach(function (g) {
        var snd = E.phonemeOf(g), own = U.shuffle(pictureWords().filter(function (w) { return firstSound(w) === snd; }));
        if (!own.length) { return; }
        var right = own[0], pool = U.shuffle(pictureWords().filter(function (w) { return firstSound(w) !== snd && E.picture(w); }));
        // near misses first: pictures that start with a sound easily mixed up with this one (m → n, w, h)
        var conf = (CONFUSE[g] || []).map(function (c) { return E.phonemeOf(c); });
        pool.sort(function (a, b) { return (U.contains(conf, firstSound(a)) ? 0 : 1) - (U.contains(conf, firstSound(b)) ? 0 : 1); });
        var others = [], seenSnd = {};
        pool.forEach(function (w) { if (others.length < 2 && !seenSnd[firstSound(w)]) { seenSnd[firstSound(w)] = 1; others.push(w); } });
        push(mk('pic-start', { g: g, sound: snd, w: right, options: placer.place(picOpt(right), others.map(picOpt)), key: 'g:' + g }));
      });
    } else if (a.type === 'pic-match') {
      (a.words || []).forEach(function (w) {
        push(mk('pic-match', { w: w, options: placer.place(picOpt(w), nearPictures(w, n, 3).map(picOpt)), key: 'w:' + w.toLowerCase() }));
      });
    } else if (a.type === 'hear-word') {
      (a.words || []).forEach(function (w) { push(stepFindWord(w, n, placer, 'activity')); });
    } else if (a.type === 'finish') {
      (a.items || []).forEach(function (it) {
        var full = it.t.replace('_', it.answer);
        var wrong = (it.wrong && it.wrong.length) ? it.wrong.slice(0, 2) : E.nearMisses(it.answer, n, 3);
        push(mk('finish', { t: it.t, full: full, answer: it.answer, pic: it.pic || '', options: placer.place(it.answer, wrong), key: 's:' + RA.AudioIds.hash(full) }));
      });
    } else if (a.type === 'clue') {
      (a.items || []).forEach(function (it) {
        var opts = (it.options || []).filter(function (w) { return w !== it.answer; });
        push(mk('clue', { clues: it.clues, w: it.answer, options: placer.place(picOpt(it.answer), opts.map(picOpt)), key: 's:' + RA.AudioIds.hash(it.clues.join(' ')) }));
      });
    } else if (a.type === 'direction') {
      // each direction is one scored item (right colour on the right part, first try); order varies
      var dsteps = (a.steps || []).slice(), lead = dsteps.length && dsteps[0].color ? [dsteps.shift()] : [];
      dsteps = lead.concat(U.shuffle(dsteps));
      push(mk('direction', { picture: a.picture, steps: dsteps, subs: dsteps.map(function (st) { return { key: 's:' + RA.AudioIds.hash(st.t), t: st.t, part: st.part, color: st.color || '' }; }) }));
    } else if (a.type === 'sort') {
      // each card's first placement is one scored item
      var cards = U.shuffle((a.cards || []).slice());
      push(mk('sort', { by: a.by || 'start', bins: a.bins, cards: cards, subs: cards.map(function (c) { return { key: 'w:' + c.toLowerCase(), w: c }; }) }));
    } else if (a.type === 'color') {
      push(mk('color', { picture: a.picture }));
    }
    void profile;
    return out;
  }

  /** Which sort bin a card belongs in (by: start | end | has). */
  E.sortBin = function (step, card) {
    var c = card.toLowerCase(), i, b;
    for (i = 0; i < step.bins.length; i++) {
      b = step.bins[i].toLowerCase();
      if (step.by === 'end' && c.slice(-b.length) === b) { return i; }
      if (step.by === 'start' && c.indexOf(b) === 0) { return i; }
      if (step.by === 'has' && c.indexOf(b) >= 0) { return i; }
    }
    return -1;
  };

  function reviewKeys(profile, lesson, n) {
    var keys = [], k;
    // items she got stuck on come back first
    Object.keys(profile.stuck || {}).forEach(function (sk) { if (/^(g|w|sw):/.test(sk)) { keys.push(sk); } else { delete profile.stuck[sk]; } });
    (lesson.review || []).forEach(function (r) {
      if (data.graphemes[r] && P.taughtIn('g', r) && P.taughtIn('g', r) < n) { keys.push('g:' + r); }
      else if (P.taughtIn('sight', r) && P.taughtIn('sight', r) < n) { keys.push('sw:' + r.toLowerCase()); }
    });
    keys = U.unique(keys).slice(0, 5);
    var due = [];
    for (k in profile.items) {
      if (!profile.items.hasOwnProperty(k) || U.contains(keys, k)) { continue; }
      var label = k.slice(k.indexOf(':') + 1);
      var kind = k.slice(0, k.indexOf(':'));
      var okNow = (kind === 'g' && P.taughtIn('g', label) && P.taughtIn('g', label) < n) ||
        (kind === 'sw' && P.taughtIn('sight', label) && P.taughtIn('sight', label) < n) ||
        (kind === 'w' && P.decodable(label, n - 1));
      if (okNow && isDue(profile, k)) { due.push(k); }
    }
    due.sort(function (a, b) {
      var A = profile.items[a], B = profile.items[b];
      return A.box - B.box || B.w - A.w;
    });
    // after a step back the warm-up is heavier until she passes a lesson easily
    var count = profile.progress.heavy ? (pset('stepBack').heavyReviewCount || 10) : (E.settings.reviewCount || 6);
    if (profile.progress.heavy) {
      due.sort(function (a, b) { return (profile.items[b].w || 0) - (profile.items[a].w || 0); });
      // heavier review: not just what is due — anything she has learned, lowest box and most missed first
      var more = [];
      for (k in profile.items) {
        if (!profile.items.hasOwnProperty(k) || U.contains(keys, k) || U.contains(due, k)) { continue; }
        var lb = k.slice(k.indexOf(':') + 1), kd = k.slice(0, k.indexOf(':'));
        if ((kd === 'g' && P.taughtIn('g', lb) && P.taughtIn('g', lb) < n) || (kd === 'sw' && P.taughtIn('sight', lb) && P.taughtIn('sight', lb) < n) || (kd === 'w' && P.decodable(lb, n - 1))) { more.push(k); }
      }
      more.sort(function (a, b) { return profile.items[a].box - profile.items[b].box || (profile.items[b].w || 0) - (profile.items[a].w || 0); });
      due = due.concat(more);
    }
    return U.unique(keys.concat(due)).slice(0, count);
  }

  /**
   * The full step list for lesson n, following the fixed routine:
   * warm-up → new sound(s) → blend, build & read words → rotating activity → sentences & story → done.
   */
  E.build = function (n, profile, opts) {
    var lesson = E.lesson(n), steps = [], i;
    opts = opts || {};
    if (!lesson) { return null; }
    var grownup = !!opts.grownupCheck, placer = new Placer();
    function add(s, section, first) { if (s) { if (section) { s.section = section; } if (first != null) { s.first = first; } steps.push(s); } return s; }

    steps.push({ type: 'title' });

    /* 1. warm-up (stuck items first) */
    var rk = reviewKeys(profile, lesson, n), wfirst = true;
    rk.forEach(function (k) {
      var kind = k.slice(0, k.indexOf(':')), v = k.slice(k.indexOf(':') + 1), s = null;
      if (kind === 'g' && data.graphemes[v] && P.taughtIn('g', v) && P.taughtIn('g', v) < n) { s = stepFindSound(v, n - 1, placer); }
      else if ((kind === 'w' || kind === 'sw') && P.decodable(v === 'i' ? 'I' : v, n - 1)) { s = stepFindWord(v === 'i' ? 'I' : v, n - 1, placer); }
      if (!s) { return; }
      s.warmStuck = !!(profile.stuck || {})[k];
      add(s, 'warmup', wfirst); wfirst = false;
    });

    /* 2. new sound(s) / pattern */
    var newGs = [];
    lesson.teach.forEach(function (t) {
      if (t.type === 'grapheme') {
        [].concat(t.g).forEach(function (g) {
          newGs.push(g);
          add({ type: 'teach-grapheme', g: g, sound: E.phonemeOf(g) }, 'new');
          // find it among look-alikes: twice for this sound
          add(stepFindSound(g, n, placer), 'new', true);
          add(stepFindSound(g, n, placer), 'new', false);
        });
      } else if (t.type === 'sight') {
        add({ type: 'teach-sight', w: t.w }, 'new');
        add(stepFindWord(t.w, n, placer), 'new', true);
        add(stepFindWord(t.w, n, placer), 'new', false);
      } else if (t.type === 'concept') {
        add({ type: 'teach-concept', concept: t }, 'new');
        U.shuffle(t.pairs || []).slice(0, 5).forEach(function (pair, pi) {
          var lowers = (t.pairs || []).map(function (p) { return p[1]; }).filter(function (l) { return l !== pair[1]; });
          add(mk('match-case', { upper: pair[0], lower: pair[1], options: placer.place(pair[1], U.shuffle(lowers).slice(0, 2)), key: 'g:' + pair[1] }), 'new', pi === 0);
        });
      }
    });
    // several new sounds (lesson 1): a mixed round so she has to tell them apart
    if (newGs.length > 1) { U.shuffle(newGs.slice()).forEach(function (g) { add(stepFindSound(g, n, placer), 'new', false); }); }

    /* 3. blend, build and read words */
    var words = (lesson.words || []).slice(0, 8);
    words.forEach(function (wd, wi) {
      var seg = P.segment(wd, n), text = typeof wd === 'string' ? wd : wd.w;
      if (!seg) { return; }
      add({ type: 'blend', w: text, seg: seg, scored: grownup, tier: grownup ? 'scored' : null, grownup: grownup, key: 'w:' + text.toLowerCase() }, 'words', wi === 0);
    });
    (lesson.build || []).forEach(function (w, bi) { add(stepBuild(w, n), 'words', bi === 0); });
    var hear = U.shuffle((lesson.words || []).map(function (wd) { return typeof wd === 'string' ? wd : wd.w; })).slice(0, Math.min(4, (lesson.words || []).length));
    var firstFw = true;
    hear.forEach(function (text) { var s = stepFindWord(text, n, placer); if (s) { add(s, 'words', firstFw); firstFw = false; } });

    /* 4. the rotating activity */
    if (lesson.activity) { activitySteps(lesson.activity, n, placer, profile).forEach(function (s) { steps.push(s); }); }

    /* 5. sentences & story */
    (lesson.sentences || []).forEach(function (s, si) {
      var yn = typeof s.yes === 'boolean';
      var tier = yn || grownup ? 'scored' : null;
      add({ type: 'sentence', t: s.t, pic: s.pic || '', yes: yn ? s.yes : null, scored: !!tier, tier: tier, grownup: !yn && grownup, key: 's:' + RA.AudioIds.hash(s.t) }, 'read', si === 0);
    });
    if (lesson.story && lesson.story.pages && lesson.story.pages.length) {
      add({ type: 'story-title', title: lesson.story.title }, 'story');
      for (i = 0; i < lesson.story.pages.length; i++) {
        add({ type: 'story-page', t: lesson.story.pages[i].t, pic: lesson.story.pages[i].pic, page: i + 1, pages: lesson.story.pages.length }, 'story');
      }
      if (lesson.story.question) {
        add({ type: 'sentence', t: lesson.story.question.t, yes: lesson.story.question.yes, scored: true, tier: 'scored', question: true, key: 's:' + RA.AudioIds.hash(lesson.story.question.t) }, 'story');
      }
    }

    /* 5b. find the word you hear in a short passage she just read (like the 100-lesson books) */
    E.findInText(lesson, n, n <= 4 ? 2 : 3).forEach(function (s, k) {
      add(s, lesson.story && lesson.story.pages && lesson.story.pages.length ? 'story' : 'read', k === 0);
    });

    /* 6. writing: two traces just before the flames (never scored) */
    var tp = E.planTraces(profile, n);
    tp.steps.forEach(function (s, k) { s.tier = 'trace'; s.scored = false; add(s, 'write', k === 0); });

    steps.push({ type: 'end' });
    return { n: n, lesson: lesson, steps: steps, traces: tp };
  };

  /* ---------- a running lesson ---------- */

  /** Shortest time (ms) that a real read of this item takes; faster answers are guesses.
   *  s can be a step, or a sub-item of a direction ({ t }) or sort step ({ w }). */
  E.minReadMs = function (s) {
    var m = E.settings.minReadMs || {};
    function word(w) { return (m.word != null ? m.word : 700) + (m.perLetter != null ? m.perLetter : 100) * String(w || '').length; }
    function sentence(t) { return (m.sentence != null ? m.sentence : 1200) + (m.perWord != null ? m.perWord : 220) * RA.AudioIds.tokens(t || '').length; }
    if (!s.type) { return s.t ? sentence(s.t) : word(s.w); }
    if (s.type === 'find-sound' || s.type === 'match-case' || s.type === 'pic-start') { return m.letter != null ? m.letter : 600; }
    if (s.type === 'find-word' || s.type === 'pic-match') { return word(s.w); }
    if (s.type === 'find-in-text') { return word(s.w) + (m.perWord != null ? m.perWord : 220) * 2; }   // a moment to find it in the line
    if (s.type === 'sentence' || s.type === 'finish') { return sentence(s.t); }
    if (s.type === 'clue') { return sentence((s.clues || [])[0]); }
    if (s.type === 'build') { return (m.tile != null ? m.tile : 450) * (s.answer || []).length; }
    return 0;
  };

  function missLimit() { return E.settings.stuckAfter || 3; }
  function maxFast() { return E.settings.maxFastRequeues == null ? 2 : E.settings.maxFastRequeues; }

  E.Session = function (profile, n, opts) {
    this.profile = profile;
    this.n = n;
    this.opts = opts || {};
    profile.stuck = profile.stuck || {};
    this.plan = E.build(n, profile, this.opts);
    this.steps = this.plan.steps;
    this.index = 0;
    this.firstCorrect = 0;
    this.scoredTotal = 0;
    this.missed = [];
    this.misses = {};          // key -> misses this lesson (3 = stuck: show the answer, teach it, move on)
    this.stuckNow = [];        // keys she got stuck on in this lesson
    this.tooFast = 0;
    this.skipped = 0;
    this.shelfStart = E.masteredSight(profile);   // her tricky-words shelf when the lesson began
    var self = this;
    this.steps.forEach(function (s) {
      // a direction or sort step counts each direction / card as one item
      if (s.scored) { self.scoredTotal += s.subs ? s.subs.length : 1; }
      s.attempts = 0; s.requeues = 0;
    });
  };

  E.Session.prototype.current = function () { return this.steps[this.index]; };

  E.Session.prototype.progress = function () {
    return { index: this.index, total: this.steps.length };
  };

  /** Put a copy of step s back a few steps later (never inside the story). */
  E.Session.prototype.later = function (s, gap) {
    var at = Math.min(this.index + (gap || 4), this.steps.length - 1);
    while (at < this.steps.length - 1 && (this.steps[at].type === 'story-page' || this.steps[at].type === 'story-title')) { at++; }
    this.steps.splice(at, 0, s);
  };

  /** First try on one scored item: counts toward accuracy and her spaced-repetition record. */
  E.Session.prototype.firstTry = function (key, correct, retry) {
    if (retry) { return; }
    if (correct) { this.firstCorrect++; } else { this.missed.push(key); }
    if (key) { E.record(this.profile, key, correct); }
  };

  /** Stuck (3 misses on one item): remember it for the next warm-up and put a teach step
   *  (hear it, see it, build it) right after this one; whole steps also get an easy re-test later. */
  E.Session.prototype.stuck = function (key, item, step) {
    if (!key) { return; }
    // sounds and words come back first in the next warm-up (sentences can't be rebuilt there)
    if (/^(g|w|sw):/.test(key)) { this.profile.stuck[key] = U.today(); }
    if (U.contains(this.stuckNow, key)) { return; }
    this.stuckNow.push(key);
    var teach = { type: 'stuck-teach', key: key, w: item.w || item.answer || '', g: item.g || '', t: item.full || item.t || '', tier: 'practice', section: (step || item).section };
    if (teach.w && P.segment(teach.w, this.n)) { teach.seg = P.segment(teach.w, this.n); }
    this.steps.splice(this.index + 1, 0, teach);
    if (step) {
      var re = U.clone(step);
      re.attempts = 0; re.isRetry = true; re.stuckRetest = true; re.first = false; re.scored = true; re.requeues = 99; re.resolved = false;
      if (re.options && step.type !== 'finish') { re.options = U.shuffle(re.options); }
      if (re.tiles) { re.tiles = U.shuffle(re.tiles); }
      this.later(re, 5);
    }
  };

  /**
   * Report an answer for the current step. info.ms = how long after the item appeared she answered.
   * Returns { done } (move on), { retry } (try again), { reveal } (show the right answer, it counted as a
   * miss, move on), { reveal, stuck } (3 misses: show it, then a teach step) or { tooFast } (too quick to
   * have read it: doesn't count, the item comes back later).
   */
  E.Session.prototype.answer = function (correct, info) {
    var s = this.current(), self = this, i;
    if (!s || !s.scored || s.resolved) { return { done: true }; }
    if (s.subs) {
      // a whole direction / sort screen at once (grown-up tools, tests): every open item gets this answer
      for (i = 0; i < s.subs.length; i++) { if (!s.subs[i].resolved) { self.answerSub(i, correct, {}); } }
      if (s.subs.every(function (it) { return it.resolved; })) { s.resolved = true; return { done: true }; }
      return { retry: true };
    }
    info = info || {};
    if (info.ms != null && s.attempts === 0 && !s.isRetry && info.ms < E.minReadMs(s) && (s.fastCount || 0) < maxFast()) {
      // a guess: no score either way, the same item comes back later
      var again0 = U.clone(s);
      again0.attempts = 0; again0.requeues = 0; again0.first = false; again0.fastCount = (s.fastCount || 0) + 1;
      if (again0.options && s.type !== 'finish') { again0.options = U.shuffle(again0.options); }
      if (again0.tiles) { again0.tiles = U.shuffle(again0.tiles); }
      s.scored = false; s.voided = true; s.resolved = true;
      this.tooFast++;
      this.later(again0, 3);
      return { tooFast: true };
    }
    if (s.attempts === 0) { this.firstTry(s.key, correct, s.isRetry); }
    s.attempts++;
    if (correct) {
      s.resolved = true;
      // a stuck item answered right in a later warm-up is no longer stuck
      if (s.section === 'warmup' && this.profile.stuck[s.key]) { delete this.profile.stuck[s.key]; }
      return { done: true };
    }
    if (s.grownup) { s.resolved = true; return { done: true }; }
    this.misses[s.key] = (this.misses[s.key] || 0) + 1;
    // yes/no has only two choices, so a second try teaches nothing: show it and move on
    if (s.type === 'sentence') { s.resolved = true; return { reveal: true }; }
    if (s.attempts >= missLimit() || (this.misses[s.key] >= missLimit() && !s.stuckRetest)) {
      s.resolved = true;
      if (!s.stuckRetest) { this.stuck(s.key, s, s); return { reveal: true, stuck: true }; }
      return { reveal: true };
    }
    return { retry: true };
  };

  /**
   * One item inside the current step (a direction, or a sort card): i = its index in step.subs.
   * A too-fast answer is not counted and gives no hint (she just answers that item again);
   * after 3 misses the answer is shown, it counts as a miss, and she moves on.
   */
  E.Session.prototype.answerSub = function (i, correct, info) {
    var s = this.current(), it = s && s.subs && s.subs[i];
    if (!it || !s.scored || it.resolved) { return { done: true }; }
    info = info || {};
    it.attempts = it.attempts || 0;
    if (info.ms != null && it.attempts === 0 && !s.isRetry && info.ms < E.minReadMs(it) && (it.fastCount || 0) < maxFast()) {
      it.fastCount = (it.fastCount || 0) + 1;
      this.tooFast++;
      return { tooFast: true };
    }
    if (it.attempts === 0) { this.firstTry(it.key, correct, s.isRetry); }
    it.attempts++;
    if (correct) { it.resolved = true; return { done: true }; }
    this.misses[it.key] = (this.misses[it.key] || 0) + 1;
    if (it.attempts >= missLimit() || this.misses[it.key] >= missLimit()) {
      it.resolved = true;
      this.stuck(it.key, it, null);
      return { reveal: true, stuck: true };
    }
    return { retry: true };
  };

  /** Every screen has a Next / Done button so she can never get stuck. On a scored step, using it
   *  before the answer counts as a miss for every item still open (and 3 misses → stuck, as usual). */
  E.Session.prototype.skip = function () {
    var s = this.current(), self = this;
    if (!s || !s.scored) { return; }
    function miss(key, item, attempts, step) {
      if (attempts === 0) { self.firstTry(key, false, s.isRetry); }
      self.misses[key] = (self.misses[key] || 0) + 1;
      if (self.misses[key] >= missLimit() && !s.stuckRetest) { self.stuck(key, item, step); }
    }
    if (s.subs) {
      s.subs.forEach(function (it) { if (!it.resolved) { miss(it.key, it, it.attempts || 0, null); it.resolved = true; it.attempts = (it.attempts || 0) + 1; } });
    } else if (!s.resolved) {
      if (s.grownup) { s.resolved = true; return; }
      miss(s.key, s, s.attempts, s);
      s.attempts++;
    }
    s.resolved = true;
    this.skipped++;
  };

  E.Session.prototype.next = function () {
    if (this.index < this.steps.length - 1) { this.index++; }
    return this.current();
  };

  E.Session.prototype.accuracy = function () {
    return this.scoredTotal ? this.firstCorrect / this.scoredTotal : 1;
  };

  /** Tricky words she has mastered (right in 3 separate lessons): her shelf in the bedroom. */
  E.masteredSight = function (profile) {
    var out = [], k, it, need = E.settings.masteredBox || 3;
    for (k in (profile.items || {})) {
      if (!profile.items.hasOwnProperty(k) || k.indexOf('sw:') !== 0) { continue; }
      it = profile.items[k];
      if (it.box >= need || it.mastered) { out.push(k.slice(3) === 'i' ? 'I' : k.slice(3)); }
    }
    // in the order they were taught
    out.sort(function (a, b) { return P.taughtIn('sight', a) - P.taughtIn('sight', b); });
    return out;
  };

  /** Save results and award flames.
   * Returns { acc, pass, stars, firstPass, replay, flames: { base, bonus, total }, balance, newShelf } */
  /** A trace step is done (she wrote it): result from RA.Trace (letter: { needed }, word: { boxes }). */
  E.Session.prototype.traceDone = function (step, result) {
    if (!step || step.type !== 'trace') { return; }
    step.done = true;
    step.result = result;
  };
  /** Trace steps not done yet: the lesson can't finish (no flames, no unlocks) until they are. */
  E.Session.prototype.tracesLeft = function () {
    return this.steps.filter(function (s) { return s.type === 'trace' && !s.done; }).length;
  };

  E.Session.prototype.finish = function () {
    if (this.tracesLeft()) { return { needsTracing: this.tracesLeft() }; }
    if (this.finished) { return this.finished; }
    var p = this.profile, n = this.n, acc = this.accuracy();
    var passAt = E.settings.passAccuracy || 0.8;
    var pass = acc >= passAt;                        // accuracy opens the next lesson…
    var stars = acc >= 0.95 ? 3 : (pass ? 2 : 1);
    var pr = p.progress;
    var shelfBefore = this.shelfStart || [];
    // a tricky word stays on her shelf once it is there
    shelfBefore.forEach(function (w) { var it = p.items['sw:' + w.toLowerCase()]; if (it) { it.mastered = true; } });
    pr.lessonCount++;
    pr.history.push({ n: n, acc: Math.round(acc * 100) / 100, date: U.today() });
    if (pr.history.length > 60) { pr.history = pr.history.slice(-60); }
    // newly taught graphemes / sight words start in box 0 so they come back soon
    E.lesson(n).teach.forEach(function (t) {
      if (t.type === 'grapheme') { [].concat(t.g).forEach(function (g) { rec(p, 'g:' + g); }); }
      if (t.type === 'sight') { rec(p, 'sw:' + t.w.toLowerCase()); }
    });
    var old = pr.passed[n];
    var replay = !!old;
    var firstPass = pass && !old;
    pr.tries = pr.tries || {};
    pr.tries[n] = (pr.tries[n] || 0) + 1;
    if (pass) {
      pr.passed[n] = { best: Math.max(acc, old && old.best ? old.best : 0), stars: Math.max(stars, old && old.stars ? old.stars : 0), date: U.today(), tries: pr.tries[n] };
      if (pr.unlocked <= n) { pr.unlocked = n + 1; }
    }
    // …and every finished lesson earns flames, whatever the score (flames are never taken away)
    var award = E.flamesForLesson(acc, replay);
    E.addFlames(p, award.total);
    var shelfNow = E.masteredSight(p);
    shelfNow.forEach(function (w) { var it = p.items['sw:' + w.toLowerCase()]; if (it) { it.mastered = true; } });
    var newShelf = shelfNow.filter(function (w) { return !U.contains(shelfBefore, w); });
    // writing: what she traced feeds her review boxes; a word she wrote unlocks its shop item
    var newShop = applyTraces(p, n, this.steps);
    if (pass) { pr.highest = Math.max(pr.highest || 0, n); }
    // her working lesson moves forward, or gently steps back (flames and unlocks stay)
    var stepBack = stepAfterLesson(this, n, acc, pass);
    this.finished = { acc: acc, pass: pass, stars: stars, firstPass: firstPass, replay: replay, flames: award, balance: p.flames, newShelf: newShelf, stuck: this.stuckNow.slice(), tooFast: this.tooFast, newShop: newShop, stepBack: stepBack, working: E.working(p) };
    return this.finished;
  };

  /* ---------- writing: tracing letters and words ---------- */

  var tracing = { settings: {}, letters: {} };
  E.initTracing = function (t) { tracing = t || tracing; };
  E.tracing = function () { return tracing; };
  function tsets(k) { return (tracing.settings || {})[k] || {}; }

  /** Her writing record (created on first use): letters { ch: { lessons, desk, rung, last, cleared } },
   *  queue (letters waiting for a lesson slot), words { word: date written }, name (for the desk). */
  E.trace = function (profile) {
    var t = profile.trace = profile.trace || {};
    t.letters = t.letters || {}; t.queue = t.queue || []; t.words = t.words || {};
    if (t.name == null) { t.name = ''; }
    return t;
  };
  function canTrace(ch) { return !!(tracing.letters || {})[ch]; }
  function tracedInLesson(t, ch) { return !!(t.letters[ch] && t.letters[ch].lessons); }
  /** Has she traced it at all (in a lesson, or a successful desk trace)? */
  function practiced(t, ch) { var r = t.letters[ch]; return !!r && ((r.lessons || 0) > 0 || (r.desk || 0) > 0); }
  function cleared(t, ch) { return !!(t.letters[ch] && t.letters[ch].cleared); }

  /** The new letters a lesson teaches that can be traced (single letters, lowercase). */
  E.lessonLetters = function (n) {
    var out = [];
    ((E.lesson(n) || {}).teach || []).forEach(function (t) {
      if (t.type === 'grapheme') { [].concat(t.g).forEach(function (g) { if (g.length === 1 && canTrace(g) && !U.contains(out, g)) { out.push(g); } }); }
    });
    return out;
  };
  /** Letters taught in lessons 1..n that can be traced. */
  function taughtLetters(n) { var out = [], i; for (i = 1; i <= n; i++) { E.lessonLetters(i).forEach(function (c) { if (!U.contains(out, c)) { out.push(c); } }); } return out; }

  /** Letters she hasn't traced yet: the desk's backlog pile (letters only, never words). */
  E.backlog = function (profile) {
    var t = E.trace(profile);
    return t.queue.filter(function (ch) { return !cleared(t, ch) && !tracedInLesson(t, ch); });
  };

  /** The shop item that writing this word unlocks (world.json items with "word"). */
  E.wordItem = function (word) {
    var out = null;
    (world.items || []).forEach(function (it) { if (it.word && it.word === word) { out = it; } });
    return out;
  };
  E.written = function (profile, word) { return !!E.trace(profile).words[word]; };

  /** Words she could write now: every letter already traced, plain lowercase, not too long. */
  function pickWord(profile, n) {
    var t = E.trace(profile), max = tsets('words').maxLetters || 5, seen = {}, cands = [], i;
    function addW(wd, pri) {
      wd = typeof wd === 'string' ? wd : (wd && wd.w) || '';
      if (seen[wd] || !/^[a-z]+$/.test(wd) || wd.length < 2 || wd.length > max) { return; }
      if (!wd.split('').every(function (c) { return canTrace(c) && practiced(t, c); })) { return; }
      seen[wd] = 1;
      var item = E.wordItem(wd), p2 = pri;
      if (item && !t.words[wd] && !(profile.owned || {})['item:' + item.id]) { p2 = 0; }   // writing it unlocks a shop item
      else if (t.words[wd]) { p2 = 3; }
      cands.push({ w: wd, pri: p2 });
    }
    for (i = n; i >= 1; i--) {
      var L = E.lesson(i);
      (L.words || []).concat(L.build || []).forEach(function (wd) { addW(wd, i === n ? 1 : 2); });
    }
    if (!cands.length) { return null; }
    cands = U.shuffle(cands);
    cands.sort(function (a, b) { return a.pri - b.pri; });
    return cands[0].w;
  }

  /**
   * The lesson's two traces: one letter and one word, or two letters when no word is ready.
   * Letters: this lesson's new letters first, then letters waiting in the queue, then review
   * (due by spaced repetition). Letters cleared at the desk don't take a slot. A new letter goes up
   * the ladder ('learn'); one she has traced or practised goes down it ('review').
   */
  E.planTraces = function (profile, n) {
    var t = E.trace(profile), slots = tsets('lesson').traces || 2, out = [], picked = [];
    var news = E.lessonLetters(n);
    var word = slots > 1 ? pickWord(profile, n) : null;
    var letterSlots = word ? slots - 1 : slots;
    var cands = [];
    news.forEach(function (ch) { if (!tracedInLesson(t, ch) && !cleared(t, ch)) { cands.push(ch); } });
    t.queue.forEach(function (ch) { if (!cleared(t, ch) && !tracedInLesson(t, ch)) { cands.push(ch); } });
    var review = taughtLetters(n).filter(function (ch) { return tracedInLesson(t, ch) && !cleared(t, ch); });
    review.sort(function (a, b) {
      var A = profile.items['t:' + a] || { box: 0, last: 0 }, B = profile.items['t:' + b] || { box: 0, last: 0 };
      return (isDue(profile, 't:' + b) ? 1 : 0) - (isDue(profile, 't:' + a) ? 1 : 0) || A.box - B.box || A.last - B.last;
    });
    cands = cands.concat(news, review, taughtLetters(n)).filter(function (ch) { return !cleared(t, ch); });
    // letters cleared at the desk don't take a slot — unless there is nothing else to write
    cands = cands.concat(news, taughtLetters(n));
    cands.forEach(function (ch) { if (picked.length < letterSlots && !U.contains(picked, ch)) { picked.push(ch); } });
    picked.forEach(function (ch) { out.push({ type: 'trace', kind: 'letter', letter: ch, mode: practiced(t, ch) ? 'review' : 'learn' }); });
    if (word) { out.push({ type: 'trace', kind: 'word', word: word, mode: 'word' }); }
    return { steps: out, word: word, letters: picked };
  };

  function applyLetter(profile, ch, needed) {
    var t = E.trace(profile), r = t.letters[ch] = t.letters[ch] || { lessons: 0, desk: 0 };
    r.lessons = (r.lessons || 0) + 1;
    r.rung = needed;
    r.last = profile.progress.lessonCount;
    // the rung she needed feeds her review boxes and the grown-ups' "needs practice"
    E.record(profile, 't:' + ch, needed === 'freehand');
  }

  /** At the end of a lesson: record what she traced, keep the queue, unlock word items. */
  function applyTraces(profile, n, steps) {
    var t = E.trace(profile), newShop = [];
    steps.forEach(function (s) {
      if (s.type !== 'trace' || !s.done || !s.result) { return; }
      if (s.kind === 'letter') { applyLetter(profile, s.letter, s.result.needed); return; }
      (s.result.boxes || []).forEach(function (b, k) { if (s.word.charAt(k)) { applyLetter(profile, s.word.charAt(k), b.needed); } });
      if (!t.words[s.word]) {
        t.words[s.word] = U.today();
        var item = E.wordItem(s.word);
        if (item && !(profile.owned || {})['item:' + item.id]) { newShop.push(item.id); }
      }
    });
    // this lesson's new letters that didn't get a slot wait in the queue; traced ones leave it
    E.lessonLetters(n).forEach(function (ch) { if (!tracedInLesson(t, ch) && !cleared(t, ch) && !U.contains(t.queue, ch)) { t.queue.push(ch); } });
    t.queue = t.queue.filter(function (ch) { return !tracedInLesson(t, ch) && !cleared(t, ch); });
    return newShop;
  }

  /** A desk trace (unscored, unlocks nothing): successes count toward clearing a letter from the queue. */
  E.deskTrace = function (profile, ch, success) {
    var t = E.trace(profile), r = t.letters[ch] = t.letters[ch] || { lessons: 0, desk: 0 };
    if (!success) { return false; }
    r.desk = (r.desk || 0) + 1;
    if (!r.cleared && r.desk >= (tsets('desk').clearAfter || 3) && !tracedInLesson(t, ch)) {
      r.cleared = U.today();
      t.queue = t.queue.filter(function (c) { return c !== ch; });
      return true;
    }
    return false;
  };

  /** Letters taught up to lesson n go into the queue (placement, or saved progress from before writing). */
  function queueTaught(profile, n) {
    var t = E.trace(profile);
    taughtLetters(n).forEach(function (ch) { if (!practiced(t, ch) && !cleared(t, ch) && !U.contains(t.queue, ch)) { t.queue.push(ch); } });
  }
  /** Word items for lessons she has already passed stay in the shop (nothing she could see disappears). */
  function grandfatherWords(profile, n) {
    var t = E.trace(profile), i;
    for (i = 1; i <= n; i++) {
      ((E.lesson(i) || {}).words || []).forEach(function (wd) {
        wd = typeof wd === 'string' ? wd : wd.w;
        if (E.wordItem(wd) && !t.words[wd]) { t.words[wd] = 'kept'; }
      });
    }
  }

  /* ---------- flames: earning ---------- */

  var DEFAULT_FLAMES = {
    awards: [{ minAccuracy: 0, flames: 1 }, { minAccuracy: 0.8, flames: 2 }, { minAccuracy: 0.95, flames: 3 }],
    perfectBonus: 2, replayFlames: 1, startingFlames: 0
  };

  E.flameConfig = function () {
    var c = world.flames || {}, out = {}, k;
    for (k in DEFAULT_FLAMES) { if (DEFAULT_FLAMES.hasOwnProperty(k)) { out[k] = c[k] != null ? c[k] : DEFAULT_FLAMES[k]; } }
    return out;
  };

  /** Flames for one finished lesson. replay = she had already passed this lesson before. */
  E.flamesForLesson = function (acc, replay) {
    var c = E.flameConfig(), base = 0, bonus = 0;
    if (replay) { base = c.replayFlames; }
    else {
      c.awards.forEach(function (a) { if (acc >= a.minAccuracy - 1e-9 && a.flames > base) { base = a.flames; } });
      if (acc >= 0.9999) { bonus = c.perfectBonus; }
    }
    return { base: base, bonus: bonus, total: base + bonus };
  };

  E.addFlames = function (profile, n) {
    n = Math.max(0, Math.floor(n || 0));             // never negative: nothing is lost for mistakes
    profile.flames = (profile.flames || 0) + n;
    profile.flamesEarned = (profile.flamesEarned || 0) + n;
  };

  /* ---------- flames: spending ---------- */

  /** Everything that can be owned: places, things, characters, outfit parts. */
  E.catalog = function () {
    var out = [];
    // places are never bought: they light up by themselves at their milestone lesson
    (world.locations || []).forEach(function (l) { out.push({ key: 'loc:' + l.id, kind: 'loc', ref: l, cost: 0, location: l.id }); });
    (world.items || []).forEach(function (it) { out.push({ key: 'item:' + it.id, kind: 'item', ref: it, cost: it.cost || 0, location: it.location }); });
    (world.characters || []).forEach(function (c) { out.push({ key: 'char:' + c.id, kind: 'char', ref: c, cost: c.cost || 0, location: c.location }); });
    (world.outfits || []).forEach(function (o) { out.push({ key: 'outfit:' + o.slot + '/' + o.part, kind: 'outfit', ref: o, cost: o.cost || 0, slot: o.slot, location: o.location }); });
    // house upgrades: the deluxe and premium versions of each thing (junk is hers from the start, fixed is free at its lesson)
    E.chains().forEach(function (ch) {
      (ch.tiers || []).forEach(function (t) {
        if (!(t.cost > 0)) { return; }
        out.push({ key: E.tierKey(ch.id, t.id), kind: 'upgrade', cost: t.cost, location: (world.start || {}).location || 'home',
          ref: { id: ch.id + '/' + t.id, chain: ch, tier: t, art: E.tierArt(t), comingSoon: !!(ch.comingSoon || t.comingSoon), lesson: ch.lesson } });
      });
    });
    return out;
  };

  var catIndex = null;
  E.entry = function (key) {
    if (!catIndex || catIndex.world !== world) {
      catIndex = { world: world, map: {} };
      E.catalog().forEach(function (e) { catIndex.map[e.key] = e; });
    }
    return catIndex.map[key] || null;
  };

  E.costOf = function (key) { var e = E.entry(key); return e ? e.cost : 0; };

  /* ---------- places: milestones ---------- */

  /** The lesson that lights a place up (0 = lit from the start, like her home). */
  E.placeLesson = function (loc) { return (loc && loc.unlockLesson) || 0; };

  /** Has she passed the lesson that lights this place up? (true even if its art isn't drawn yet) */
  E.placeReached = function (profile, loc) { return E.level(profile) >= E.placeLesson(loc); };

  /** The lesson-100 finale: the whole town lights up. */
  E.finale = function () { return world.finale || null; };
  E.finaleReached = function (profile) {
    var f = E.finale();
    return !!f && E.level(profile) >= (f.lesson || 100);
  };

  /** Places that are lit but haven't had their light-up celebration yet (home never needs one). */
  E.uncelebrated = function (profile) {
    var done = profile.celebrated || {};
    return (world.locations || []).filter(function (l) {
      return E.placeLesson(l) > 0 && !done[l.id] && E.isUnlocked(profile, 'loc:' + l.id);
    });
  };

  E.markCelebrated = function (profile, id) {
    profile.celebrated = profile.celebrated || {};
    profile.celebrated[id] = U.today();
  };

  /**
   * Is this place lit / this thing hers?
   *  - a place: she has passed its milestone lesson (or lit it with flames back when places
   *    cost flames: those stay lit)
   *  - a thing or character: its place is lit, and it is free there or she bought it
   *  - an outfit part: it is a starter (cost 0) or she bought it
   */
  E.isUnlocked = function (profile, key) {
    var e = E.entry(key), owned = profile.owned || {};
    if (!e) { return false; }
    if (e.kind === 'loc') { return !e.ref.comingSoon && (E.placeReached(profile, e.ref) || !!owned[key]); }
    if (e.kind === 'item' || e.kind === 'char') {
      return E.isUnlocked(profile, 'loc:' + e.location) && (e.cost === 0 || !!owned[key]);
    }
    if (e.kind === 'upgrade') { return !e.ref.comingSoon && !!owned[key]; }
    return e.cost === 0 || !!owned[key];
  };
  E.owns = E.isUnlocked;

  /** 'ok' | 'owned' | 'soon' (not built yet) | 'lesson' (a place, or a house version of something
   *  that hasn't been fixed up yet) | 'place' (its place isn't lit) | 'write' (a word item she hasn't
   *  written in a lesson yet) | 'flames' (not enough) | 'none' */
  E.canBuy = function (profile, key) {
    var e = E.entry(key);
    if (!e) { return 'none'; }
    if (E.isUnlocked(profile, key)) { return 'owned'; }
    if ((e.kind === 'loc' || e.kind === 'upgrade') && e.ref.comingSoon) { return 'soon'; }
    if (e.kind === 'loc') { return 'lesson'; }
    if ((e.kind === 'item' || e.kind === 'char' || e.kind === 'upgrade' || e.kind === 'outfit') && e.location && !E.isUnlocked(profile, 'loc:' + e.location)) { return 'place'; }
    if (e.kind === 'upgrade' && !E.chainFixed(profile, e.ref.chain)) { return 'lesson'; }
    if (e.kind === 'item' && e.ref.word && !E.written(profile, e.ref.word)) { return 'write'; }
    if ((profile.flames || 0) < e.cost) { return 'flames'; }
    return 'ok';
  };

  /** Spend flames on something. Returns the same codes as canBuy ('ok' when bought). */
  E.buy = function (profile, key) {
    var why = E.canBuy(profile, key);
    if (why !== 'ok') { return why; }
    var e = E.entry(key);
    profile.flames -= e.cost;
    profile.owned = profile.owned || {};
    profile.owned[key] = U.today();
    profile.spent = (profile.spent || 0) + e.cost;
    // a new house version goes straight into her room
    if (e.kind === 'upgrade') { E.useTier(profile, e.ref.chain.id, e.ref.tier.id); }
    return 'ok';
  };

  /** Things to show in a shop tab (see world.json "shop"). */
  E.shopList = function (profile, tab) {
    var out = [];
    E.catalog().forEach(function (e) {
      if (e.cost <= 0 && !(e.kind === 'upgrade' && e.ref.comingSoon)) { return; }
      if (tab.slots && e.kind === 'outfit' && tab.slots.indexOf(e.slot) >= 0) { out.push(e); }
      if (tab.location && e.kind === 'item' && e.location === tab.location) { out.push(e); }
      if (tab.upgrades && e.kind === 'upgrade' && (!tab.location || e.location === tab.location)) { out.push(e); }
    });
    // clothes are grouped by kind (tops together, shoes together…), then cheapest first
    out.sort(function (a, b) {
      var sa = tab.slots ? tab.slots.indexOf(a.slot) : 0, sb = tab.slots ? tab.slots.indexOf(b.slot) : 0;
      return (sa - sb) || (a.cost - b.cost);
    });
    return out;
  };

  /* ---------- saved-progress format ---------- */

  /** Is a room of a place open? (the deck opens at a milestone lesson, set in world.json) */
  E.roomOpen = function (profile, room) {
    return !room.opensAtLesson || E.level(profile) >= room.opensAtLesson;
  };

  /* ---------- her house: things that get fixed up and upgraded ---------- *
   * world.json "house.chains": each chain is one thing (or a set, like bedding and rug) with tiers
   * junk -> fixed -> deluxe -> premium. Junk is how it starts; fixed is free when she reaches the
   * chain's lesson (one every 4 lessons); deluxe and premium cost flames after that. A tier's "art"
   * maps "fixtureId.part" to a sprite ('' hides that layer). She can switch among the tiers she owns.
   * Saved in profile.house: use (tier in use per chain), shown (the free fix-up moment has played),
   * seen (rooms and chains whose news she has already looked at). */

  var JUNK = 'junk', FIXED = 'fixed', TIER_ORDER = ['junk', 'fixed', 'deluxe', 'premium'];

  E.house = function () { return world.house || { chains: [] }; };
  E.chains = function () { return E.house().chains || []; };
  E.chain = function (id) {
    var cs = E.chains(), i;
    for (i = 0; i < cs.length; i++) { if (cs[i].id === id) { return cs[i]; } }
    return null;
  };
  E.tierKey = function (chainId, tierId) { return 'upgrade:' + chainId + '/' + tierId; };
  E.tierOf = function (ch, tierId) {
    var ts = (ch && ch.tiers) || [], i;
    for (i = 0; i < ts.length; i++) { if (ts[i].id === tierId) { return ts[i]; } }
    return null;
  };
  /** The main picture of a tier (its first sprite). */
  E.tierArt = function (t) {
    var a = (t && t.art) || {}, k;
    for (k in a) { if (a.hasOwnProperty(k) && a[k]) { return a[k]; } }
    return '';
  };
  /** Is this tier drawn and on offer (not a coming-soon chain or tier)? */
  E.tierReady = function (ch, t) { return !!t && !ch.comingSoon && !t.comingSoon && !!t.art; };

  function houseState(profile) {
    var h = profile.house = profile.house || {};
    h.use = h.use || {}; h.shown = h.shown || {}; h.seen = h.seen || {};
    return h;
  }

  /** Has she reached the lesson where this chain's free fix-up happens? */
  E.chainReached = function (profile, ch) { return !!ch && !ch.comingSoon && E.level(profile) >= (ch.lesson || 0); };

  E.tierOwned = function (profile, ch, tierId) {
    if (tierId === JUNK) { return true; }
    var owned = profile.owned || {};
    if (tierId === FIXED) { return E.chainReached(profile, ch); }   // repairs only ever come at their lesson
    return !!owned[E.tierKey(ch.id, tierId)];
  };

  /** Is the free fix-up waiting to be shown (before-and-after moment the next time she walks in)? */
  E.revealDue = function (profile, ch) {
    var fx = E.tierOf(ch, FIXED);
    return E.tierReady(ch, fx) && E.chainReached(profile, ch) && !houseState(profile).shown[ch.id];
  };
  E.markRevealed = function (profile, chainId) { houseState(profile).shown[chainId] = U.today(); };

  /** Has this thing been fixed in front of her (lesson reached and its before-and-after played)?
   *  Its deluxe and premium versions are locked, and not in the shop, until then. */
  E.chainFixed = function (profile, ch) { return E.chainReached(profile, ch) && !E.revealDue(profile, ch); };

  /** The tier she has chosen (or the best one she owns). */
  E.tierInUse = function (profile, ch) {
    var u = houseState(profile).use[ch.id], i;
    if (u && E.tierOwned(profile, ch, u) && (u === JUNK || E.tierReady(ch, E.tierOf(ch, u)))) { return u; }
    for (i = TIER_ORDER.length - 1; i > 0; i--) {
      if (E.tierOwned(profile, ch, TIER_ORDER[i]) && E.tierReady(ch, E.tierOf(ch, TIER_ORDER[i]))) { return TIER_ORDER[i]; }
    }
    return JUNK;
  };
  E.useTier = function (profile, chainId, tierId) {
    var ch = E.chain(chainId);
    if (!ch || !E.tierOwned(profile, ch, tierId)) { return false; }
    var h = houseState(profile);
    h.use[chainId] = tierId;
    h.shown[chainId] = h.shown[chainId] || U.today();   // no before-and-after once she has picked one herself
    return true;
  };

  var artIndex = null;
  /** Which chain draws a fixture part ("bed.bedding" -> the bedding chain). */
  E.chainFor = function (fixId, part) {
    if (!artIndex || artIndex.world !== world) {
      artIndex = { world: world, map: {} };
      E.chains().forEach(function (ch) {
        (ch.tiers || []).forEach(function (t) {
          var k; for (k in (t.art || {})) { if (t.art.hasOwnProperty(k)) { artIndex.map[k] = ch; } }
        });
      });
    }
    return artIndex.map[fixId + '.' + part] || null;
  };

  /** The sprite for a fixture part right now (undefined: use the fixture's own part; '' = hidden).
   *  showJunk: draw the junk tier for chains whose free fix-up hasn't been shown yet. */
  E.partArt = function (profile, fixId, part, showJunk) {
    var ch = E.chainFor(fixId, part);
    if (!ch) { return undefined; }
    var tid = showJunk && E.revealDue(profile, ch) ? JUNK : E.tierInUse(profile, ch);
    var t = E.tierOf(ch, tid), a = t && t.art;
    if (a && a.hasOwnProperty(fixId + '.' + part)) { return a[fixId + '.' + part]; }
    var j = E.tierOf(ch, JUNK);
    return j && j.art && j.art.hasOwnProperty(fixId + '.' + part) ? j.art[fixId + '.' + part] : undefined;
  };

  /** Chains in a room whose versions she can pick now (fixed up, so the nicer ones are available). */
  E.pickableChains = function (profile, roomId) {
    return E.roomChains(roomId).filter(function (ch) { return E.chainReached(profile, ch); });
  };
  /** New versions she hasn't looked at in the picker yet (the wrench gets a flame badge). */
  E.pickNews = function (profile, roomId) {
    var h = houseState(profile);
    return E.pickableChains(profile, roomId).filter(function (ch) { return !h.seen['pick:' + ch.id]; });
  };
  E.markPickSeen = function (profile, roomId) {
    var h = houseState(profile), today = U.today();
    E.pickableChains(profile, roomId).forEach(function (ch) { h.seen['pick:' + ch.id] = h.seen['pick:' + ch.id] || today; });
  };

  /** Chains she can change in a room (drawn ones, not the coming-soon ones). */
  E.roomChains = function (roomId) {
    return E.chains().filter(function (ch) { return ch.room === roomId && !ch.comingSoon && E.tierReady(ch, E.tierOf(ch, FIXED)); });
  };

  /** How dim a room is with the lights on (a dim old lamp): the largest "dim" of its chains in use. */
  E.roomDim = function (profile, roomId) {
    var d = 0;
    E.roomChains(roomId).forEach(function (ch) {
      var t = E.tierOf(ch, E.revealDue(profile, ch) ? JUNK : E.tierInUse(profile, ch));
      if (t && t.dim > d) { d = t.dim; }
    });
    return d;
  };

  /** News in a room of her house: a free fix-up or new versions to look at, or the room just opened.
   *  Returns a list of {chain} / {room} entries; empty when there is nothing new. */
  E.roomNews = function (profile, room) {
    var h = houseState(profile), out = [];
    if (!E.roomOpen(profile, room)) { return out; }
    if (room.opensAtLesson && !h.seen['room:' + room.id]) { out.push({ room: room.id }); }
    E.roomChains(room.id).forEach(function (ch) {
      if (E.chainReached(profile, ch) && !h.seen[ch.id]) { out.push({ chain: ch.id }); }
    });
    return out;
  };
  /** Rooms of her home with news (for the badge on the map). */
  E.homeNews = function (profile) {
    var loc = null, ls = world.locations || [], i, id = (world.start || {}).location || 'home';
    for (i = 0; i < ls.length; i++) { if (ls[i].id === id) { loc = ls[i]; } }
    return ((loc && loc.rooms) || []).filter(function (r) { return E.roomNews(profile, r).length > 0; });
  };
  E.markRoomSeen = function (profile, room) {
    var h = houseState(profile), today = U.today();
    if (E.roomOpen(profile, room)) { h.seen['room:' + room.id] = h.seen['room:' + room.id] || today; }
    E.roomChains(room.id).forEach(function (ch) { if (E.chainReached(profile, ch) && !h.seen[ch.id]) { h.seen[ch.id] = today; } });
  };

  /** Bring an older saved profile up to date (safe to call every time). Returns true if changed. */
  E.migrateProfile = function (profile) {
    if (!profile || profile.v >= 8) { return false; }
    if (profile.v === 7) { toV8(profile); return true; }
    if (profile.v === 6) { toV7(profile); toV8(profile); return true; }
    if (profile.v === 5) { toV6(profile); toV7(profile); toV8(profile); return true; }
    if (profile.v === 4) { toV5(profile); toV6(profile); toV7(profile); toV8(profile); return true; }
    if (profile.v === 3) { toV4(profile); toV5(profile); toV6(profile); toV7(profile); toV8(profile); return true; }
    if (profile.v === 2) { toV3(profile); toV4(profile); toV5(profile); toV6(profile); toV7(profile); toV8(profile); return true; }
    profile.owned = profile.owned || {};
    // v1 (lesson-unlock rewards): everything she had unlocked stays hers
    var old = profile.unlocks || {}, k;
    for (k in old) {
      if (old.hasOwnProperty(k) && k.indexOf('char:') !== 0 && !profile.owned[k]) { profile.owned[k] = 'kept'; }
    }
    delete profile.unlocks;
    if (profile.flames == null) { profile.flames = E.flameConfig().startingFlames; }
    if (profile.flamesEarned == null) { profile.flamesEarned = profile.flames; }
    toV3(profile);
    toV4(profile);
    toV5(profile);
    toV6(profile);
    toV7(profile);
    toV8(profile);
    return true;
  };

  /* v8: characters move to the style C art (more hairstyles, a face builder, body sliders). Her look keeps
     everything it can: hairstyles that were renamed get the nearest new one (pixie → short crop, afro → curly,
     curly → long curls, bun → high bun, buzz → shaved) and the old face becomes the matching expression.
     Puffs, braids, buzz and bun are free now, so she gets back the flames she spent on them (prices from v7). */
  var V7_HAIR_COST = { puffs: 3, braids: 3, buzz: 2, bun: 3 };
  var V7_HAIR_NEW = { pixie: 'crop', afro: 'curly', curly: 'longcurly', bun: 'highbun', buzz: 'shaved' };
  var V7_FACE = { smile: ['happy', 'm2'], grin: ['happy', 'm1'], wow: ['surprised', 'm8'] };
  function toV8(profile) {
    var owned = profile.owned = profile.owned || {}, back = 0, k;
    for (k in V7_HAIR_COST) {
      if (V7_HAIR_COST.hasOwnProperty(k) && owned['outfit:hair/' + k]) {
        if (owned['outfit:hair/' + k] !== 'kept') { back += V7_HAIR_COST[k]; }
        delete owned['outfit:hair/' + k];
      }
    }
    if (back) {
      profile.flames = (profile.flames || 0) + back;
      profile.spent = Math.max(0, (profile.spent || 0) - back);
    }
    var lk = profile.look;
    if (lk) {
      if (V7_HAIR_NEW[lk.hairStyle]) { lk.hairStyle = V7_HAIR_NEW[lk.hairStyle]; }
      if (lk.face && V7_FACE[lk.face] && !lk.expr) { lk.expr = V7_FACE[lk.face][0]; lk.mouth = lk.mouth || V7_FACE[lk.face][1]; }
      delete lk.face;
    }
    profile.v = 8;
  }

  /* v7: two markers. Highest lesson reached = what she had passed (or been placed at); working
     lesson = the lesson she was on. No step-backs, no placement check pending. */
  function toV7(profile) {
    var pr = profile.progress;
    pr.highest = Math.max(pr.highest || 0, E.level(profile));
    pr.working = U.clamp(pr.working || Math.min(pr.unlocked || 1, E.count()), 1, E.count());
    pr.firstCheck = false;
    pr.fails = pr.fails || {};
    pr.stepBacks = pr.stepBacks || [];
    pr.placements = pr.placements || [];
    profile.v = 7;
  }

  /* v6: writing. Letters from lessons she already passed wait in her writing queue (the desk's
     pile); shop items that writing a word unlocks stay in the shop for lessons she passed. */
  function toV6(profile) {
    E.trace(profile);
    profile.stuck = profile.stuck || {};
    var passed = (profile.progress && profile.progress.passed) || {}, top = 0, k;
    for (k in passed) { if (passed.hasOwnProperty(k) && +k > top) { top = +k; } }
    queueTaught(profile, top);
    grandfatherWords(profile, top);
    profile.v = 6;
  }

  /* v3: her home became rooms. Old positions in the one-room home no longer fit the new
     rooms, so things go back to their spots in their rooms; what she put away stays put away. */
  function toV3(profile) {
    var home = profile.world && profile.world[(world.start || {}).location || 'home'], k, o;
    if (home && home.objects) {
      for (k in home.objects) {
        if (!home.objects.hasOwnProperty(k)) { continue; }
        o = home.objects[k];
        home.objects[k] = o && o.stored ? { stored: true } : {};
      }
    }
    profile.v = 3;
  }

  /* v4: places light up at milestone lessons instead of costing flames. A place she already lit
     stays lit (nothing is ever taken away), she gets back the flames she spent on it, and it
     doesn't get a second celebration. Prices are the ones places had in format v3. */
  var V3_PLACE_COST = { bakery: 6, park: 10, school: 14, shop: 16, farm: 18 };
  function toV4(profile) {
    var owned = profile.owned || {}, k, id, back = 0;
    profile.celebrated = profile.celebrated || {};
    for (k in owned) {
      if (!owned.hasOwnProperty(k) || k.indexOf('loc:') !== 0) { continue; }
      id = k.slice(4);
      profile.celebrated[id] = owned[k];
      if (owned[k] !== 'kept' && V3_PLACE_COST[id]) { back += V3_PLACE_COST[id]; }
    }
    if (back) {
      profile.flames = (profile.flames || 0) + back;
      profile.spent = Math.max(0, (profile.spent || 0) - back);
    }
    profile.v = 4;
  }

  /* v5: her house starts junky and gets fixed up (house chains). Repairs only come at their lesson,
     so a toilet or tub she fixed early with flames goes back to grimy until the toilet-and-tub
     fix-up (lesson 24), and she gets those flames back. The rooms she could already visit don't
     get a "new" badge. Prices are the ones the fixes had in format v4. */
  var V4_FIX_COST = { 'upgrade:fix-toilet': 4, 'upgrade:fix-tub': 6 };
  function toV5(profile) {
    var owned = profile.owned = profile.owned || {}, h = houseState(profile), today = U.today(), back = 0, k;
    for (k in V4_FIX_COST) {
      if (V4_FIX_COST.hasOwnProperty(k) && owned[k]) { if (owned[k] !== 'kept') { back += V4_FIX_COST[k]; } delete owned[k]; }
    }
    if (back) {
      profile.flames = (profile.flames || 0) + back;
      profile.spent = Math.max(0, (profile.spent || 0) - back);
    }
    delete owned['upgrade:tv-new'];
    var home = null, ls = world.locations || [], i;
    for (i = 0; i < ls.length; i++) { if (ls[i].id === ((world.start || {}).location || 'home')) { home = ls[i]; } }
    ((home && home.rooms) || []).forEach(function (r) {
      if (r.opensAtLesson && E.roomOpen(profile, r) && profile.world && profile.world[home.id] && profile.world[home.id].doorOpened) { h.seen['room:' + r.id] = today; }
    });
    profile.v = 5;
  }

  /* ---------- grown-up tools ---------- */

  /** Parent placement: treat lessons 1..n as done (for older or returning readers),
   * with the flames a passed lesson would have earned. */
  /** Lessons 1..n count as reached: places, house fix-ups and unlocks up to n (celebrations play as
   *  usual), what they teach starts as known in her review boxes, and their letters wait to be
   *  traced. NO flames: flames only come from finished lessons. */
  function markPlaced(profile, n) {
    var i, L, pr = profile.progress;
    n = U.clamp(n, 0, E.count());
    for (i = 1; i <= n; i++) {
      if (!pr.passed[i]) { pr.passed[i] = { best: null, stars: 0, date: U.today(), placed: true }; }
      L = E.lesson(i);
      L.teach.forEach(function (t) {
        if (t.type === 'grapheme') { [].concat(t.g).forEach(function (g) { var it = rec(profile, 'g:' + g); it.box = Math.max(it.box, 2); }); }
        if (t.type === 'sight') { var it2 = rec(profile, 'sw:' + t.w.toLowerCase()); it2.box = Math.max(it2.box, 2); }
      });
    }
    pr.highest = Math.max(pr.highest || 0, n);
    pr.unlocked = Math.max(pr.unlocked, n + 1);
    // she hasn't written these letters yet: they wait in her writing queue (and on the desk)
    queueTaught(profile, n);
    grandfatherWords(profile, n);
    return n;
  }

  /** Grown-up override ("Start at lesson n+1"): lessons 1..n reached, working lesson n+1, no flames. */
  E.placeAt = function (profile, n) {
    var pr = profile.progress;
    n = markPlaced(profile, n);
    pr.working = U.clamp(n + 1, 1, E.count());
    pr.firstCheck = false;
    pr.placements = pr.placements || [];
    pr.placements.push({ date: U.today(), override: true, level: n, working: pr.working });
    if (pr.placements.length > 8) { pr.placements = pr.placements.slice(-8); }
    return 0;
  };

  /* ---------- placement test ("show me what you know") ---------- */

  var placement = { settings: {}, checkpoints: [], stages: {} };
  E.initPlacement = function (d) { placement = d || placement; };
  E.placementData = function () { return placement; };
  function pset(k) { return (placement.settings || {})[k] || {}; }

  /**
   * The adaptive test: checkpoints in order (easy first); each asks a block of itemsPerCheck items.
   * A block at passFrac or better passes the checkpoint; below stopFrac (missing most) ends the test;
   * in between she gets one more block, which must bring the total to extraBlockPass. It also ends
   * after maxItems items or maxMinutes. One tap per item, no right/wrong feedback, no failure
   * sounds. Near-miss answers, varied answer position, and an answer faster than minReadMs is not
   * scored (the item comes back at the end of the block).
   */
  E.PlacementTest = function (profile) {
    this.profile = profile;
    this.S = pset('test');
    this.cps = placement.checkpoints || [];
    this.ci = 0; this.queue = []; this.asked = 0; this.right = []; this.missed = [];
    this.tooFast = 0; this.level = 0; this.done = false; this.extra = null;
    this.started = Date.now(); this.byStage = {}; this.passedCps = [];
    this.placer = new Placer(); this.usedPool = {};
    if (!this.cps.length) { this.done = true; } else { this.block(); }
  };
  E.PlacementTest.prototype.block = function () {
    var cp = this.cps[this.ci], S = this.S, self = this, n = Math.min(cp.lesson, E.count()), want = S.itemsPerCheck || 4, opt = S.options || 4;
    var pool = (cp.sounds || []).map(function (g) { return { type: 'sound', g: g }; })
      .concat((cp.words || []).map(function (x) { return typeof x === 'string' ? { type: 'word', w: x } : { type: 'word', w: x.w, wrong: x.wrong }; }));
    var used = this.usedPool[this.ci] = this.usedPool[this.ci] || {};
    var fresh = U.shuffle(pool.filter(function (it) { return !used[it.g || it.w]; }));
    if (fresh.length < want) { fresh = fresh.concat(U.shuffle(pool.filter(function (it) { return used[it.g || it.w]; }))); }
    this.cur = { right: 0, asked: 0 };
    this.queue = fresh.slice(0, want).map(function (it) {
      used[it.g || it.w] = 1;
      var item = { cp: self.ci, lesson: cp.lesson, stage: cp.stage, type: it.type };
      if (it.type === 'sound') {
        item.g = it.g; item.sound = E.phonemeOf(it.g); item.key = 'g:' + it.g;
        item.options = graphemeOptions(it.g, n, opt, self.placer);
      } else {
        var wrong = it.wrong ? it.wrong.slice(0, opt - 1) : E.nearMisses(it.w, n, opt - 1);
        item.w = it.w; item.key = 'w:' + it.w;
        item.options = self.placer.place(it.w, wrong);
      }
      return item;
    });
  };
  E.PlacementTest.prototype.current = function () { return this.done ? null : this.queue[0]; };
  E.PlacementTest.prototype.progress = function () { return Math.min(1, this.asked / (this.S.maxItems || 48)); };
  /** One tap. info.ms = time since the item appeared. Returns { tooFast } or { done }. */
  E.PlacementTest.prototype.answer = function (correct, info) {
    var item = this.queue[0];
    if (!item || this.done) { return { done: true }; }
    info = info || {};
    var asStep = item.type === 'sound' ? { type: 'find-sound' } : { type: 'find-word', w: item.w };
    if (info.ms != null && info.ms < E.minReadMs(asStep) && (item.fast || 0) < (this.S.maxFastRequeues == null ? 2 : this.S.maxFastRequeues)) {
      // too fast to have read it: not scored; it comes back at the end of this block
      item.fast = (item.fast || 0) + 1;
      if (item.options && item.options.length) { item.options = U.shuffle(item.options); }
      this.queue.push(this.queue.shift());
      this.tooFast++;
      return { tooFast: true };
    }
    this.queue.shift();
    this.asked++; this.cur.asked++;
    var st = this.byStage[item.stage] = this.byStage[item.stage] || { right: 0, asked: 0 };
    st.asked++;
    if (correct) { this.cur.right++; st.right++; this.right.push(item.key); } else { this.missed.push(item.key); }
    if (!this.queue.length) { this.endBlock(); }
    else if (this.asked >= (this.S.maxItems || 48) || (Date.now() - this.started) > (this.S.maxMinutes || 12) * 60000) { this.done = true; }
    return { done: this.done };
  };
  E.PlacementTest.prototype.endBlock = function () {
    var S = this.S, cp = this.cps[this.ci], tot = this.cur;
    if (this.extra) { tot = { right: this.extra.right + this.cur.right, asked: this.extra.asked + this.cur.asked }; }
    var f = tot.asked ? tot.right / tot.asked : 0, pass = this.extra ? f >= (S.extraBlockPass || 0.6) : f >= (S.passFrac || 0.75);
    if (pass) {
      this.level = Math.max(this.level, cp.lesson);
      this.passedCps.push(this.ci);
      this.extra = null;
      this.ci++;
    } else if (!this.extra && f >= (S.stopFrac || 0.5)) {
      this.extra = { right: this.cur.right, asked: this.cur.asked };   // not sure yet: one more block here
    } else {
      this.done = true;                                                // missing most: stop, gently
    }
    if (this.ci >= this.cps.length || this.asked >= (S.maxItems || 48) || (Date.now() - this.started) > (S.maxMinutes || 12) * 60000) { this.done = true; }
    if (!this.done) { this.block(); }
  };
  /** { level (capped at the last written lesson), rawLevel, stages: { stage: 'knows'|'partly'|'not yet'|'not tested' }, … } */
  E.PlacementTest.prototype.result = function () {
    var S = this.S, stages = {}, self = this;
    Object.keys(placement.stages || {}).forEach(function (k) {
      var st = self.byStage[k];
      stages[k] = !st ? 'not tested' : (st.right / st.asked >= (S.passFrac || 0.75) ? 'knows' : (st.right / st.asked >= (S.stopFrac || 0.5) ? 'partly' : 'not yet'));
    });
    return { level: Math.min(this.level, E.count()), rawLevel: this.level, stages: stages, right: U.unique(this.right), missed: U.unique(this.missed),
      asked: this.asked, tooFast: this.tooFast, minutes: Math.round((Date.now() - this.started) / 6000) / 10 };
  };

  /**
   * Use a test result: lessons up to her level count as reached (places, house fix-ups and unlocks,
   * with the usual celebrations; NO flames), her WORKING lesson is set stepBelow below her result
   * (result = level + 1), what she got right starts as known, what she missed starts in "needs
   * practice", and untraced letters go on the desk pile. The first lesson she then does is checked.
   */
  E.applyPlacement = function (profile, res) {
    var pr = profile.progress, L = U.clamp(res.level || 0, 0, E.count());
    markPlaced(profile, L);
    res.right.forEach(function (k) { var it = rec(profile, k); it.box = Math.max(it.box, 2); it.c++; });
    res.missed.forEach(function (k) {
      if (U.contains(res.right, k)) { return; }
      var it = rec(profile, k); it.box = 0; it.w++; it.last = pr.lessonCount;
    });
    pr.working = U.clamp(L + 1 - (pset('result').stepBelow == null ? 1 : pset('result').stepBelow), 1, E.count());
    pr.firstCheck = true;
    pr.placements = pr.placements || [];
    pr.placements.push({ date: U.today(), level: L, rawLevel: res.rawLevel, working: pr.working, stages: res.stages, asked: res.asked,
      right: res.right.length, missed: res.missed.slice(0, 24), tooFast: res.tooFast, minutes: res.minutes });
    if (pr.placements.length > 8) { pr.placements = pr.placements.slice(-8); }
    return { level: L, working: pr.working };
  };

  /* ---------- step-back ---------- */

  /** After a lesson: move her working lesson forward, or gently back one step.
   *  - the first lesson after a placement test must be passed easily (firstLessonEasy, 90%) or she steps back
   *  - later, failsInARow failed tries in a row (under failBelow) on the same lesson step back
   *  A step back adds extra review: missed items move back demoteBoxes review boxes and get
   *  stuck-item treatment, and the warm-up is heavier until she passes a lesson easily (easyPass).
   *  Flames, unlocks and lessons reached are never taken away; she never goes below lesson 1. */
  function stepAfterLesson(ses, n, acc, pass) {
    var p = ses.profile, pr = p.progress, sb = pset('stepBack'), W = E.working(p), step = sb.step || 1, out = null;
    pr.fails = pr.fails || {}; pr.lastMissed = pr.lastMissed || {}; pr.stepBacks = pr.stepBacks || [];
    var failed = acc < (sb.failBelow || E.settings.passAccuracy || 0.8), easy = acc >= (sb.easyPass || 0.9);
    function back(why) {
      var to = Math.max(1, Math.min(W, n) - step);
      if (to >= W) { return null; }
      pr.working = to;
      pr.heavy = true;
      var missed = U.unique(ses.missed.concat(pr.lastMissed[n] || [])), demote = sb.demoteBoxes == null ? 1 : sb.demoteBoxes;
      missed.forEach(function (k) {
        var it = p.items[k];
        if (it) { it.box = Math.max(0, it.box - demote); }
        if (/^(g|w|sw):/.test(k)) { p.stuck[k] = U.today(); }
      });
      delete pr.lastMissed[n];
      var rec2 = { date: U.today(), from: n, to: to, why: why, acc: Math.round(acc * 100) / 100 };
      pr.stepBacks.push(rec2);
      if (pr.stepBacks.length > 20) { pr.stepBacks = pr.stepBacks.slice(-20); }
      return rec2;
    }
    if (pr.firstCheck && n === W) {
      pr.firstCheck = false;
      if (acc < (sb.firstLessonEasy || 0.9)) { out = back('placement'); }
      else { pr.working = Math.min(E.count(), n + 1); }
    } else if (failed) {
      pr.fails[n] = (pr.fails[n] || 0) + 1;
      if (pr.fails[n] >= (sb.failsInARow || 2)) { pr.fails[n] = 0; out = back('tries'); }
      else { pr.lastMissed[n] = ses.missed.slice(); }
    } else {
      pr.fails[n] = 0;
      delete pr.lastMissed[n];
      if (n >= W) { pr.working = Math.min(E.count(), n + 1); }      // forward again
    }
    if (easy && !out) { pr.heavy = false; }
    return out;
  }
  E.heavyReview = function (profile) { return !!profile.progress.heavy; };
  /** Items she keeps missing (missed at least stepBack.keepsMissing times), most-missed first. */
  E.keepsMissing = function (profile) {
    var need = pset('stepBack').keepsMissing || 3;
    return E.weakItems(profile, 50).filter(function (x) { return x.w >= need; }).sort(function (a, b) { return b.w - a.w; });
  };

  E.resetProgress = function (profile) {
    var fresh = RA.Store.newProfile(profile.name);
    profile.progress = fresh.progress;
    profile.items = {};
    profile.owned = {};
    profile.flames = E.flameConfig().startingFlames;
    profile.flamesEarned = profile.flames;
    profile.spent = 0;
    profile.world = {};
    profile.requestsDone = {};
    profile.celebrated = {};
    profile.house = { use: {}, shown: {}, seen: {} };
    profile.v = 5;
  };

  E.canStart = function (profile, n) {
    return n >= 1 && n <= E.count() && n <= profile.progress.unlocked;
  };
})(window);
