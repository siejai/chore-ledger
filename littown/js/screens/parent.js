/* Lit Town — grown-up screen (behind the hold-to-open gate) (ES5).
 * Progress per child, weak sounds, placement, reset, profiles, settings, backup. */
(function (w) {
  var RA = w.RA, U = RA.U, UI = RA.UI, S = RA.Screens, E = RA.Engine, Store = RA.Store;

  S.parent = {
    show: function (root) {
      RA.state.profile = null;
      UI.applyFont(null);
      var top = U.el('div.topbar');
      top.appendChild(UI.btn('ui-back', '', function () { UI.go('profiles'); }, 'small'));
      top.appendChild(U.el('h1', { text: 'Grown-ups' }));
      root.appendChild(top);
      var body = U.el('div.parent');
      root.appendChild(body);
      draw(body);
    }
  };

  function section(title) {
    var s = U.el('section.psec');
    s.appendChild(U.el('h2', { text: title }));
    return s;
  }

  function redraw() { UI.route(); }

  function draw(body) {
    var profiles = Store.profiles();

    /* ---- children ---- */
    var kids = section('Readers');
    profiles.forEach(function (p) { kids.appendChild(kidCard(p)); });
    kids.appendChild(UI.textBtn('+ Add a reader', function () { UI.go('create', 'new'); }, 'good'));
    body.appendChild(kids);

    /* ---- settings ---- */
    var st = Store.settings();
    var set = section('Settings');
    set.appendChild(toggleRow('Grown-up check', 'When on, word and sentence reading shows "did she read it?" buttons for you, and those count toward the score.', st.grownupCheck, function (v) { st.grownupCheck = v; Store.saveSettings(); }));
    set.appendChild(toggleRow('Sound effects', 'Pops, chimes and animal sounds in play.', st.sfx, function (v) { st.sfx = v; RA.Sfx.setEnabled(v); Store.saveSettings(); }));
    var vol = U.el('div.prow');
    vol.appendChild(U.el('div.plabel', { text: 'Voice volume' }));
    [['Low', 0.4], ['Medium', 0.7], ['High', 1]].forEach(function (pair) {
      vol.appendChild(UI.textBtn(pair[0], function () { st.volume = pair[1]; RA.Audio.setVolume(pair[1]); Store.saveSettings(); RA.Audio.line('great-1'); redraw(); }, st.volume === pair[1] ? 'on' : 'ghost'));
    });
    set.appendChild(vol);
    body.appendChild(set);

    /* ---- backup ---- */
    var bk = section('Backup');
    bk.appendChild(U.el('p.pnote', { text: Store.canWriteFiles()
      ? 'Backups are saved on this tablet in Android/data/<app>/files/LitTown/. Copy them to a computer with a USB cable to keep them safe.'
      : 'Backups download as a .json file.' }));
    var row = U.el('div.prow');
    row.appendChild(UI.textBtn('Save backup', function () {
      Store.saveBackupFile(function (err, where) {
        if (err) { UI.modal('Could not save', String(err.message || err) + '\n\nUse "Show backup text" instead and copy it.'); return; }
        UI.modal('Backup saved', 'Saved to: ' + where);
      });
    }, 'good'));
    row.appendChild(UI.textBtn('Restore backup', restoreDialog));
    row.appendChild(UI.textBtn('Show backup text', function () {
      var ta = U.el('textarea.backup-text', { readonly: 'readonly' });
      ta.value = JSON.stringify(Store.exportData());
      UI.modal('Backup text', ta, [{ label: 'Close' }]);
      setTimeout(function () { try { ta.focus(); ta.select(); } catch (e) { /* ignore */ } }, 50);
    }, 'ghost'));
    bk.appendChild(row);
    body.appendChild(bk);

    /* ---- about ---- */
    var ab = section('About this tablet');
    var needed = RA.AudioIds.collect(RA.data.lessons, RA.data.world).length;
    var info = [
      'Lessons: ' + E.count(),
      'Audio clips: ' + RA.Audio.count() + ' of ' + needed,
      'Saving with: ' + ({ native: 'app storage (Android)', localStorage: 'browser storage', memory: 'memory only — progress will NOT be kept' })[Store.mode()],
      'WebView: Chrome ' + (U.chromeVersion() || '?'),
      'Fonts: Andika, OpenDyslexic (SIL Open Font License)'
    ];
    info.forEach(function (t) { ab.appendChild(U.el('div.pinfo', { text: t })); });
    body.appendChild(ab);

    /* ---- app updates (over Wi-Fi; see docs/BUILD_ANDROID.md "Updates over Wi-Fi") ---- */
    var up = section('App updates');
    var lines = U.el('div.upd-lines');
    up.appendChild(lines);
    var note = U.el('div.pnote.upd-note');
    var btn = UI.textBtn('Check for updates', function () {
      btn.disabled = true;
      note.textContent = 'Checking…';
      RA.Updates.check(function (s) {
        btn.disabled = false;
        showUpd(s);
        if (s.hub) { note.textContent = 'Lit Town is part of Chore Quest here: it updates together with Chore Quest.'; }
        else if (!s.app) { note.textContent = 'Updates happen in the tablet app (this is a browser).'; }
        else if (s.lastError) { note.textContent = 'Could not update: ' + s.lastError; }
        else if (s.pending) { note.textContent = 'Downloaded ' + s.pending + '. It switches in on the "Who is reading?" screen (or the next time Lit Town starts).'; }
        else { note.textContent = 'Up to date.'; }
      });
    }, 'upd-check');
    up.appendChild(U.el('div.prow', null, [btn]));
    up.appendChild(note);
    body.appendChild(up);
    function showUpd(s) {
      U.clear(lines);
      var rows = ['Version: ' + (s.running || 'unknown') + (s.hub ? ' (inside Chore Quest)' : '')];
      if (s.app) {
        rows.push('Built into the app: ' + (s.bundled || 'unknown') + (s.downloaded ? ' · running a downloaded update' : ''));
        if (s.pending) { rows.push('Waiting to switch in: ' + s.pending); }
        rows.push('Last checked: ' + (s.lastCheck ? new Date(s.lastCheck).toLocaleString() : 'not yet') + (s.signed ? ' · signed updates only' : ''));
        if (s.lastError) { rows.push('Last problem: ' + s.lastError); }
      }
      rows.forEach(function (t) { lines.appendChild(U.el('div.pinfo', { text: t })); });
    }
    RA.Updates.status(showUpd);
  }

  function toggleRow(label, note, on, onChange) {
    var r = U.el('div.prow');
    var t = U.el('div.plabel', { text: label });
    var b = UI.textBtn(on ? 'On' : 'Off', function () { onChange(!on); redraw(); }, on ? 'on' : 'ghost');
    r.appendChild(t);
    r.appendChild(b);
    if (note) { r.appendChild(U.el('div.pnote', { text: note })); }
    return r;
  }

  function kidCard(p) {
    var c = U.el('div.kid-card');
    var head = U.el('div.kid-head');
    head.appendChild(UI.avatar(p.look, 'mini'));
    var lvl = E.level(p);
    head.appendChild(U.el('div.kid-title', { html: '<b>' + U.esc(p.name) + '</b><br>Lessons passed: ' + countPassed(p) + ' of ' + E.count() + (p.progress.unlocked > E.count() && p.progress.passed[E.working(p)] ? ' · all done!' : ' · working on lesson ' + E.working(p)) }));
    c.appendChild(head);

    // flames: earned by every finished lesson, spent in the shop and on the town map
    var fl = U.el('div.pline');
    fl.appendChild(U.el('span.plabel', { text: 'Flames: ' }));
    fl.appendChild(UI.price(p.flames || 0));
    var ownedCount = 0, k;
    for (k in (p.owned || {})) { if (p.owned.hasOwnProperty(k)) { ownedCount++; } }
    fl.appendChild(U.el('span.pnote', { text: '  to spend · ' + (p.flamesEarned || 0) + ' earned in all · ' + (p.spent || 0) + ' spent on ' + ownedCount + ' thing(s)' }));
    c.appendChild(fl);

    // recent results
    var hist = (p.progress.history || []).slice(-6).reverse();
    if (hist.length) {
      var h = U.el('div.pline');
      h.appendChild(U.el('span.plabel', { text: 'Recent: ' }));
      hist.forEach(function (x) {
        h.appendChild(U.el('span.chip' + (x.acc >= (E.settings.passAccuracy || 0.8) ? '.good' : '.warn'), { text: 'L' + x.n + ' ' + Math.round(x.acc * 100) + '%' }));
      });
      c.appendChild(h);
    }

    // where she is: working lesson, highest reached, placement results and step-backs
    var pos = U.el('div.pline.placement-line');
    pos.appendChild(U.el('span.plabel', { text: 'Working on: ' }));
    pos.appendChild(U.el('span.chip', { text: 'lesson ' + E.working(p) }));
    pos.appendChild(U.el('span.pnote', { text: '  highest reached: lesson ' + E.level(p) + (E.heavyReview(p) ? ' · extra review on' : '') }));
    c.appendChild(pos);
    var pls = (p.progress.placements || []).slice(-3).reverse();
    if (pls.length) {
      var pl = U.el('div.pline.placement-results');
      pl.appendChild(U.el('span.plabel', { text: 'Placement: ' }));
      pls.forEach(function (x) {
        var txt = x.override ? x.date + ' · set by a grown-up: start at lesson ' + x.working
          : x.date + ' · knows up to lesson ' + x.level + (x.rawLevel > x.level ? ' (and more: ' + x.rawLevel + ')' : '') + ' → started at ' + x.working + ' · ' + x.right + '/' + x.asked + ' right' + (x.tooFast ? ', ' + x.tooFast + ' too fast' : '');
        pl.appendChild(U.el('span.chip', { text: txt }));
        if (x.stages) {
          Object.keys(x.stages).forEach(function (k) {
            if (x.stages[k] === 'not tested') { return; }
            pl.appendChild(U.el('span.chip' + (x.stages[k] === 'knows' ? '.good' : '.warn'), { text: ((E.placementData().stages || {})[k] || k) + ': ' + x.stages[k] }));
          });
        }
      });
      c.appendChild(pl);
    }
    var sbs = (p.progress.stepBacks || []).slice(-4).reverse();
    if (sbs.length) {
      var sl = U.el('div.pline.step-backs');
      sl.appendChild(U.el('span.plabel', { text: 'Step-backs: ' }));
      sbs.forEach(function (x) {
        sl.appendChild(U.el('span.chip.warn', { text: x.date + ' · lesson ' + x.from + ' → ' + x.to + ' (' + (x.why === 'placement' ? 'first lesson after placement under ' + Math.round((E.placementData().settings.stepBack.firstLessonEasy || 0.9) * 100) + '%' : 'two tries in a row under ' + Math.round((E.placementData().settings.stepBack.failBelow || 0.8) * 100) + '%') + ', ' + Math.round(x.acc * 100) + '%)' }));
      });
      c.appendChild(sl);
    }
    var keeps = E.keepsMissing(p).slice(0, 8);
    if (keeps.length) {
      var kl = U.el('div.pline.keeps-missing');
      kl.appendChild(U.el('span.plabel', { text: 'Keeps missing: ' }));
      keeps.forEach(function (x) {
        var kind = x.kind === 'g' ? 'sound' : (x.kind === 'sw' ? 'tricky word' : (x.kind === 's' ? 'sentence' : (x.kind === 't' ? 'writing' : 'word')));
        kl.appendChild(U.el('span.chip.warn', { text: (x.kind === 's' ? '…' : x.label) + ' (' + kind + ', ' + x.w + '×)' }));
      });
      c.appendChild(kl);
    }

    // weak sounds & words
    var weak = E.weakItems(p, 8);
    var wl = U.el('div.pline');
    wl.appendChild(U.el('span.plabel', { text: 'Needs practice: ' }));
    if (!weak.length) { wl.appendChild(U.el('span.pnote', { text: lvl ? 'nothing stands out — nice!' : 'no lessons yet' })); }
    weak.forEach(function (x) {
      var kind = x.kind === 'g' ? 'sound' : (x.kind === 'sw' ? 'tricky word' : (x.kind === 's' ? 'sentence' : (x.kind === 't' ? 'writing' : 'word')));
      var label = x.kind === 's' ? '…' : x.label;
      wl.appendChild(U.el('span.chip.warn', { text: label + ' (' + kind + ', missed ' + x.w + '×)' }));
    });
    c.appendChild(wl);

    var btns = U.el('div.prow');
    btns.appendChild(UI.textBtn('Change look', function () { RA.state.profile = p; UI.go('create', p.id); }, 'ghost'));
    btns.appendChild(UI.textBtn('Rename', function () { renameDialog(p); }, 'ghost'));
    btns.appendChild(UI.textBtn('Writing name', function () { writingNameDialog(p); }, 'ghost writing-name'));
    btns.appendChild(UI.textBtn(p.font === 'dyslexic' ? 'Font: OpenDyslexic' : 'Font: Andika', function () {
      p.font = p.font === 'dyslexic' ? 'andika' : 'dyslexic';
      Store.saveProfile(p); redraw();
    }, 'ghost'));
    btns.appendChild(UI.textBtn((p.progress.placements || []).some(function (x) { return !x.override; }) ? 'Re-run placement test' : 'Placement test', function () { RA.state.profile = p; UI.go('placement'); }, 'ghost placement-test'));
    btns.appendChild(UI.textBtn('Start at lesson…', function () { placeDialog(p); }, 'ghost'));
    btns.appendChild(UI.textBtn('Reset progress', function () {
      UI.confirm('Reset ' + p.name + '?', 'This clears lessons, flames, everything she bought, and her world. Her name and look stay.', 'Reset', function () {
        E.resetProgress(p); Store.saveProfile(p); redraw();
      });
    }, 'danger'));
    btns.appendChild(UI.textBtn('Delete', function () {
      UI.confirm('Delete ' + p.name + '?', 'This removes the reader and all her progress from this tablet.', 'Delete', function () {
        Store.deleteProfile(p.id); redraw();
      });
    }, 'danger'));
    c.appendChild(btns);
    if (p.progress.passed && countPassed(p)) {
      var note = U.el('div.pnote', { text: 'Lesson notes: ' + (E.lesson(Math.min(p.progress.unlocked, E.count())).parentNote || '—') });
      c.appendChild(note);
    }
    return c;
  }

  function countPassed(p) { var n = 0, k; for (k in p.progress.passed) { if (p.progress.passed.hasOwnProperty(k)) { n++; } } return n; }

  function renameDialog(p) {
    var input = U.el('input.name-in', { type: 'text', maxlength: '14' });
    input.value = p.name;
    UI.modal('Rename', input, [{ label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'good', onTap: function () {
      var v = (input.value || '').replace(/^\s+|\s+$/g, '');
      if (v) { p.name = v; Store.saveProfile(p); redraw(); }
    } }]);
  }

  /** The name she traces at her desk ("my name"). Typed once by a grown-up; lowercase letters
   *  are traced for now (capital letters come later). */
  function writingNameDialog(p) {
    var t = E.trace(p);
    var input = U.el('input.name-in', { type: 'text', maxlength: '12' });
    input.value = t.name || p.name || '';
    var box = U.el('div', null, [U.el('p', { text: 'The name she traces at her desk (my name). Letters a to z; capital letters are traced as small letters for now.' }), input]);
    UI.modal('Writing name', box, [{ label: 'Cancel', cls: 'ghost' }, { label: 'Save', cls: 'good', onTap: function () {
      t.name = (input.value || '').replace(/[^A-Za-z]/g, '').slice(0, 12);
      Store.saveProfile(p); redraw();
    } }]);
  }

  function placeDialog(p) {
    var box = U.el('div');
    var n = Math.max(0, E.working(p) - 1);
    var num = U.el('div.place-num', { text: String(n + 1) });
    box.appendChild(U.el('p', { text: 'Overrides the placement test. Lessons before this one count as reached (places, house fix-ups and unlocks up to there — no flames: flames only come from finished lessons) and she works here. Earlier lessons stay open to replay. Nothing she has is taken away.' }));
    var row = U.el('div.prow');
    row.appendChild(UI.textBtn('−', function () { n = Math.max(0, n - 1); num.textContent = String(n + 1); }, 'ghost'));
    row.appendChild(num);
    row.appendChild(UI.textBtn('+', function () { n = Math.min(E.count() - 1, n + 1); num.textContent = String(n + 1); }, 'ghost'));
    box.appendChild(row);
    UI.modal('Start at lesson', box, [{ label: 'Cancel', cls: 'ghost' }, { label: 'Set', cls: 'good', onTap: function () {
      E.placeAt(p, n); Store.saveProfile(p); redraw();
    } }]);
  }

  function restoreDialog() {
    var box = U.el('div');
    function load(data) {
      var count;
      UI.modal('Restore backup?', 'Readers in the backup replace readers with the same name tag on this tablet. Others stay.', [
        { label: 'Cancel', cls: 'ghost' },
        { label: 'Restore', cls: 'good', onTap: function () {
          try { count = Store.importData(data, 'merge'); UI.toast('Restored ' + count + ' reader(s)'); redraw(); }
          catch (e) { UI.modal('Could not restore', String(e.message || e)); }
        } }
      ]);
    }
    if (Store.canWriteFiles()) {
      var list = U.el('div.backup-list', { text: 'Looking for backups…' });
      box.appendChild(list);
      Store.listBackupFiles(function (err, names) {
        U.clear(list);
        if (!names.length) { list.appendChild(U.el('p.pnote', { text: 'No backup files found in the LitTown folder.' })); }
        names.slice(0, 8).forEach(function (nm) {
          list.appendChild(UI.textBtn(nm, function () {
            m.close();
            Store.readBackupFile(nm, function (e2, data) { if (e2) { UI.modal('Could not read', String(e2.message || e2)); return; } load(data); });
          }, 'ghost'));
        });
      });
    } else {
      var file = U.el('input', { type: 'file', accept: '.json,application/json' });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) { return; }
        var rd = new w.FileReader();
        rd.onload = function () {
          var data = null;
          try { data = JSON.parse(rd.result); } catch (e) { UI.modal('Could not read', 'That file is not a backup.'); return; }
          m.close(); load(data);
        };
        rd.readAsText(f);
      }, false);
      box.appendChild(file);
    }
    box.appendChild(U.el('p.pnote', { text: 'Or paste backup text here:' }));
    var ta = U.el('textarea.backup-text');
    box.appendChild(ta);
    var m = UI.modal('Restore backup', box, [{ label: 'Cancel', cls: 'ghost' }, { label: 'Use pasted text', cls: 'good', onTap: function () {
      var data = null;
      try { data = JSON.parse(ta.value); } catch (e) { UI.modal('Could not read', 'The pasted text is not a backup.'); return; }
      load(data);
    } }]);
  }
})(window);
