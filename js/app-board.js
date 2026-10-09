/* 전자칠판 화면 */
(function (MT) {
  var S = MT.store.loadSettings(), G = MT.store.loadGame(), A = MT.store.loadAvatars();
  var pages = {};          // 활동지 원본 (이 화면이 열려 있는 동안만)
  var popup = null;        // 열린 문제 창
  var syncOn = false, unsubGifts = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var ICON = {
    speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M11 20c0-3 2.5-5 5-5s5 2 5 5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    later: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
  };

  function toast(msg) {
    var t = h('div', { class: 'toast', role: 'status', text: msg });
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function teamName(t) { return S.teams[t].name; }
  function josa(word, a, b) { var c = word.charCodeAt(word.length - 1); if (c < 0xAC00 || c > 0xD7A3) return word + a; return word + ((c - 0xAC00) % 28 ? a : b); }

  /* ---------- 저장, 연동 ---------- */
  function save() {
    MT.store.saveSettings(S); MT.store.saveGame(G); pushSync();
  }
  function saveAvatars() { if (!MT.store.saveAvatars(A)) toast('저장 공간이 부족해요. 쓰지 않는 그림을 빼 주세요.'); }
  function popupMirror() {
    if (!popup) return null;
    var q = MT.getQuestion(S, popup.cell, popup.qi), color = MT.cellColor(S, popup.cell);
    return { cell: popup.cell, qi: popup.qi, text: q.text, answer: popup.revealed ? q.answer : '', color: color, mission: S.missions[color].name, help: !!popup.help, team: popup.team };
  }
  function pushSync() {
    if (!syncOn) return;
    var teams = [];
    for (var i = 0; i < S.teamCount; i++) teams.push({ name: S.teams[i].name, color: S.teams[i].color, seats: MT.carSeats(S, A, i) });
    MT.Sync.pushState(S.room, {
      title: S.title, teamCount: S.teamCount, teams: teams, cellCount: S.cellCount, cellColors: S.cellColors, missions: S.missions,
      positions: G.positions, leaves: G.leaves, buds: G.buds, cleared: G.cleared, grass: G.grass,
      bloomed: G.bloomed, fairy: G.fairy, popup: popupMirror()
    });
  }
  function watchGifts() {
    if (unsubGifts) { unsubGifts(); unsubGifts = null; }
    if (!syncOn) return;
    unsubGifts = MT.Sync.watchGifts(S.room, function (list) {
      var have = {}; G.gifts.forEach(function (g) { have[g.id] = 1; });
      var fresh = list.filter(function (g) { return !have[g.id]; });
      if (!fresh.length) return;
      fresh.forEach(function (g) { G.gifts.push({ id: g.id, team: g.team, img: g.img }); });
      var last = fresh[fresh.length - 1];
      if (S.teams[last.team]) setFairy('선물이 도착했어! ' + josa(teamName(last.team), '이', '가') + ' 보낸 그림이야. 고마워!', 'cheer');
      MT.store.saveGame(G); render();
    });
  }

  /* ---------- 그리기 ---------- */
  var board = new MT.BoardView($('#board'), {
    interactive: true,
    onCellClick: openQuestion,
    onCarDrop: carDropped
  });

  function render(force) {
    board.render(S, G, A, force);
    $('#title').textContent = S.title;
    document.title = S.title;
    renderTeams();
    renderFairy();
  }

  function renderTeams() {
    var tot = $('#classTree');
    if (tot) tot.textContent = G.leaves.length ? '우리 반 나무에 나뭇잎이 ' + G.leaves.length + '장 자랐어요' + (G.buds.length ? ', 꽃봉오리도 ' + G.buds.length + '개' : '') + '.' : '우리 반 나무가 나뭇잎을 기다리고 있어요.';
    var box = $('#teamList'); box.innerHTML = '';
    for (var t = 0; t < S.teamCount; t++) {
      var faces = A.filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      var car = MT.carSVG(S.teams[t].color, MT.carSeats(S, A, t), faces, String(t + 1));
      var info = h('div', null, [h('div', { class: 'team-name', text: S.teams[t].name })]);
      box.appendChild(h('div', { class: 'team-row' }, [h('div', { class: 'car-mini', html: car.svg }), info]));
    }
  }

  var lastFairyId = null;
  function setFairy(text, mood) { G.fairy = { text: text, mood: mood || 'guide', id: MT.uid() }; }
  function renderFairy() {
    if (!G.fairy) setFairy(MT.FAIRY_LINES.hello, 'guide');
    var f = G.fairy;
    if (f.id === lastFairyId) return;
    lastFairyId = f.id;
    var b = $('#fairyText'); b.textContent = f.text;
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    $('#fairyImg').src = f.mood === 'cheer' ? MT.IMG.fairyCheer : MT.IMG.fairyGuide;
  }

  /* ---------- 읽어 주기 ---------- */
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('이 기기에서는 읽어 주기를 쓸 수 없어요.'); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.9;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^ko/i.test(x.lang); })[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* ---------- 말 옮기기 ---------- */
  function teamsAt(cell) { var r = []; for (var t = 0; t < S.teamCount; t++) if (G.positions[t] === cell) r.push(t); return r; }

  function carDropped(team, cell) {
    var name = teamName(team);
    G.positions[team] = cell;
    {
      if (cell === 0) setFairy(josa(name, '은', '는') + ' 출발 칸에 있어. 주사위를 굴려 출발해 볼까?', 'guide');
      else if (MT.cellColor(S, cell) === 'rainbow' && !G.rainbowSeen[team + '-' + cell]) {
        G.rainbowSeen[team + '-' + cell] = 1;
        G.grass = Math.min(6, (G.grass || 0) + 1);
        setFairy('무지개 칸이야! 땅에 초록 풀이 자라나고 있어. ' + cell + '번 칸을 눌러 미션도 해 보자.', 'cheer');
      } else setFairy(josa(name, '이', '가') + ' ' + cell + '번 칸에 왔어! 칸을 누르면 내가 문제를 낼게.', 'guide');
    }
    save(); render();
  }

  /* ---------- 문제 창 ---------- */
  function openQuestion(cell) {
    var qi = G.turns[cell] || 0;
    G.turns[cell] = 1 - qi; // 다음에 누르면 다음 문제
    var here = teamsAt(cell);
    popup = { cell: cell, qi: qi, team: here.length ? here[here.length - 1] : null, revealed: false, help: false };
    drawPopup();
    save();
    if (S.autoRead) speak(MT.getQuestion(S, cell, qi).text);
  }

  function closePopup() {
    var b = $('#qback'); if (b) b.remove();
    popup = null; save();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function drawPopup() {
    var old = $('#qback'); if (old) old.remove();
    if (!popup) return;
    var cell = popup.cell, color = MT.cellColor(S, cell), m = S.missions[color];
    var q = MT.getQuestion(S, cell, popup.qi);
    var isQuiz = m.kind === 'quiz';

    var chips = h('div', { class: 'qchips' }, [
      h('span', { class: 'chip' }, [h('span', { class: 'dot' }), m.name]),
      h('span', { class: 'chip soft', text: cell + '번 칸' }),
      h('span', { class: 'chip soft', text: '문제 ' + (popup.qi + 1) })
    ]);
    var body = h('div', { class: 'qbody' }, [chips, h('h2', { class: 'qtext', id: 'qtext', text: q.text })]);
    if (q.sample) body.appendChild(h('p', { class: 'sample-note', text: '예시 문제예요. 설정의 문제 탭에서 바꿀 수 있어요.' }));
    if (popup.revealed && q.answer) body.appendChild(h('div', { class: 'qanswer' }, [h('small', { text: '정답' }), q.answer]));
    if (popup.help) body.appendChild(h('p', { class: 'qhelp', text: '모둠 친구들이 함께 생각해 줄 시간이에요. 천천히 해도 괜찮아요. 친구가 힌트를 주거나 같이 해 볼까요?' }));

    var label = h('p', { class: 'qteams-label', id: 'qteamsLabel', text: '누가 도전하나요?' });
    var teams = h('div', { class: 'qteams', role: 'group', 'aria-labelledby': 'qteamsLabel' });
    for (var t = 0; t < S.teamCount; t++) (function (t) {
      var faces = A.filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      teams.appendChild(h('button', {
        class: 'chip-btn', type: 'button', 'aria-pressed': popup.team === t ? 'true' : 'false',
        onclick: function () { popup.team = t; drawPopup(); pushSync(); }
      }, [h('span', { class: 'car-ico', html: MT.carSVG(S.teams[t].color, MT.carSeats(S, A, t), faces, String(t + 1)).svg }), S.teams[t].name]));
    })(t);

    var actions = h('div', { class: 'qactions' });
    if (isQuiz && q.answer && !popup.revealed) actions.appendChild(h('button', { class: 'btn big', type: 'button', html: ICON.eye + '정답 보기', onclick: function () { popup.revealed = true; drawPopup(); pushSync(); } }));
    actions.appendChild(h('button', { class: 'btn big primary', type: 'button', html: ICON.leaf + (isQuiz ? '맞았어요!' : '해냈어요!'), onclick: success }));
    if (!popup.help) actions.appendChild(h('button', { class: 'btn big sky', type: 'button', html: ICON.help + '친구야 도와줘', onclick: function () { popup.help = true; setFairy('괜찮아, 친구들이 도와줄 거야. 같이 생각해 보자!', 'guide'); renderFairy(); drawPopup(); pushSync(); } }));
    actions.appendChild(h('button', { class: 'btn big', type: 'button', html: ICON.later + '다음에 다시 해요', onclick: closePopup }));

    body.appendChild(label); body.appendChild(teams); body.appendChild(actions);

    var top = h('div', { class: 'qtop' }, [
      h('button', { class: 'btn round', type: 'button', 'aria-label': '문제 읽어 주기', title: '읽어 주기', html: ICON.speak, onclick: function () { speak(q.text); } }),
      h('button', { class: 'btn round', type: 'button', 'aria-label': '이 칸의 다른 문제 보기', title: '다른 문제', html: ICON.swap, onclick: function () { popup.qi = 1 - popup.qi; popup.revealed = false; G.turns[cell] = 1 - popup.qi; drawPopup(); save(); } }),
      h('button', { class: 'btn round', type: 'button', 'aria-label': '닫기', html: ICON.close, onclick: closePopup })
    ]);

    var card = h('div', { class: 'qcard c-' + color, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'qtext' }, [
      h('div', { class: 'qfairy' }, [h('img', { src: MT.IMG.fairyQuiz, alt: '문제를 내는 나무 요정' })]),
      body, top
    ]);
    var back = h('div', { class: 'modal-back', id: 'qback' }, [card]);
    back.addEventListener('click', function (e) { if (e.target === back) closePopup(); });
    $('#layer').appendChild(back);
    var first = card.querySelector('.btn.primary'); if (first) first.focus({ preventScroll: true });
  }

  function success() {
    if (popup.team === null || popup.team === undefined) {
      document.querySelectorAll('.chip-btn').forEach(function (b) { b.classList.remove('need'); void b.offsetWidth; b.classList.add('need'); });
      toast('어느 모둠인지 골라 주세요.');
      return;
    }
    var cell = popup.cell, team = popup.team;
    var prev = G.cleared[cell] || [];
    var bonus = prev.some(function (t) { return t !== team; });
    G.cleared[cell] = prev.concat([team]);
    var n = Math.max(1, S.leafPerWin || 6), k = G.leaves.length;
    var b = $('#qback'); if (b) b.remove();
    popup = null;
    if (bonus) setFairy('정말 잘했어! 우리 반 나무에 나뭇잎이 ' + n + '장 자랐어. 다른 모둠이 다녀간 칸이라 꽃봉오리도 하나 달렸어!', 'cheer');
    else setFairy('정말 잘했어! 우리 반 나무에 나뭇잎이 ' + n + '장 자랐어.', 'cheer');
    save(); render();
    for (var j = 0; j < n; j++) (function (j) {
      var leaf = { id: MT.uid(), team: team, img: Math.floor(Math.random() * 4), rot: Math.round(Math.random() * 120 - 60), s: +(0.85 + Math.random() * 0.3).toFixed(2) };
      setTimeout(function () { fly('leaf', k + j, leaf.img, function () { G.leaves.push(leaf); save(); render(); }); }, j * 140);
    })(j);
    if (bonus) {
      var bud = { id: MT.uid(), team: team }, kb = G.buds.length;
      setTimeout(function () { fly('bud', kb, 0, function () { G.buds.push(bud); save(); render(); }); }, n * 140 + 200);
    }
  }

  function fly(kind, k, img, done) {
    if (reduce) { done(); return; }
    var e;
    if (kind === 'leaf') { e = h('img', { class: 'fly', src: MT.IMG.leaves[img], alt: '' }); }
    else { e = h('div', { class: 'fly', html: MT.budSVG() }); }
    document.body.appendChild(e);
    var to = board.anchorScreen(k, kind === 'leaf' ? 'leaf' : 'bud');
    var fx = window.innerWidth / 2 - 36, fy = window.innerHeight / 2 - 36;
    var tx = to.x - 36, ty = to.y - 36;
    var mx = (fx + tx) / 2 + (tx > fx ? -80 : 80), my = Math.min(fy, ty) - 140;
    var endScale = Math.max(0.3, (board.geo.tree.w * (kind === 'leaf' ? 0.085 : 0.085)) / 72);
    var anim = e.animate([
      { transform: 'translate(' + fx + 'px,' + fy + 'px) scale(2) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + fx + 'px,' + fy + 'px) scale(2.2) rotate(-10deg)', opacity: 1, offset: 0.15 },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.4) rotate(180deg)', offset: 0.6 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + endScale + ') rotate(320deg)', opacity: 1 }
    ], { duration: 1150, easing: 'cubic-bezier(.45,0,.35,1)' });
    anim.onfinish = function () { e.remove(); done(); };
  }

  /* ---------- 꽃 피우기 ---------- */
  function bloom() {
    if (G.bloomed) return;
    G.bloomed = true;
    setFairy('모두 고마워! 우리 반이 다 함께 힘을 모아서 나무에 꽃이 활짝 피었어!', 'cheer');
    save(); render();
    showBloom();
  }
  function showBloom() {
    var back = h('div', { class: 'modal-back', id: 'bloomBack' });
    for (var i = 0; i < (reduce ? 0 : 36); i++) {
      var p = h('span', { class: 'petal' });
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.animationDuration = (5 + Math.random() * 5) + 's';
      p.style.animationDelay = (-Math.random() * 8) + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.background = ['#FFC0D2', '#FFE08A', '#E3D0FF', '#FFD3A8'][i % 4];
      back.appendChild(p);
    }
    var card = h('div', { class: 'bloom-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bloomTitle' }, [
      h('img', { src: MT.IMG.fairyCheer, alt: '두 팔을 들고 기뻐하는 나무 요정' }),
      h('h2', { id: 'bloomTitle', text: '우리 나무에 꽃이 활짝 피었어요!' }),
      h('p', { text: '우리 반 모두가 함께 키운 나무야. 정말 고마워!' }),
      h('div', { class: 'qactions', style: 'justify-content:center' }, [
        h('button', { class: 'btn big sky', type: 'button', html: ICON.speak + '요정 목소리 듣기', onclick: function () { speak('모두 고마워! 우리 반이 다 함께 힘을 모아서 나무에 꽃이 활짝 피었어!'); } }),
        h('button', { class: 'btn big primary', type: 'button', text: '나무 보러 가기', onclick: function () { back.remove(); } })
      ])
    ]);
    back.appendChild(card);
    $('#layer').appendChild(back);
  }

  /* ---------- 처음부터 ---------- */
  function resetGame() {
    if (!confirm('자동차 위치, 나뭇잎, 꽃, 풀, 선물 그림을 모두 비우고 처음부터 할까요?\n(설정, 문제, 아이들 그림은 그대로 남아요)')) return;
    G = MT.defaultGame();
    setFairy(MT.FAIRY_LINES.hello, 'guide');
    popup = null;
    if (syncOn) MT.Sync.clearGifts(S.room).catch(function () {});
    save(); render(true);
  }

  /* ---------- 설정 창 ---------- */
  var curTab = 'game';
  function openSettings(tab) {
    curTab = tab || curTab;
    var old = $('#setBack'); if (old) old.remove();
    var tabs = [['game', '게임'], ['teams', '모둠과 그림'], ['questions', '문제'], ['connect', '태블릿 연결']];
    var tabBar = h('div', { class: 'tabs', role: 'tablist' });
    tabs.forEach(function (t) {
      tabBar.appendChild(h('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': curTab === t[0] ? 'true' : 'false', text: t[1], onclick: function () { openSettings(t[0]); } }));
    });
    var bodyEl = h('div', { class: 'sheet-body', role: 'tabpanel' });
    var sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': '설정' }, [
      h('div', { class: 'sheet-head' }, [h('h2', { text: '설정' }), tabBar, h('button', { class: 'btn round', type: 'button', 'aria-label': '설정 닫기', html: ICON.close, onclick: closeSettings })]),
      bodyEl
    ]);
    var back = h('div', { class: 'modal-back', id: 'setBack' }, [sheet]);
    $('#layer').appendChild(back);
    ({ game: tabGame, teams: tabTeams, questions: tabQuestions, connect: tabConnect })[curTab](bodyEl);
  }
  function closeSettings() { var b = $('#setBack'); if (b) b.remove(); save(); render(true); }

  function stepper(value, min, max, onChange) {
    var out = h('output', { text: value });
    function set(v) { v = Math.max(min, Math.min(max, v)); out.textContent = v; onChange(v); }
    return h('span', { class: 'stepper' }, [
      h('button', { class: 'btn round', type: 'button', 'aria-label': '하나 줄이기', text: '−', onclick: function () { set(+out.textContent - 1); } }),
      out,
      h('button', { class: 'btn round', type: 'button', 'aria-label': '하나 늘리기', text: '+', onclick: function () { set(+out.textContent + 1); } })
    ]);
  }

  function tabGame(el) {
    el.appendChild(h('h3', { text: '게임판' }));
    el.appendChild(h('div', { class: 'rowf' }, [h('label', { for: 'setTitle', text: '게임 이름' }),
      h('input', { class: 'inp', id: 'setTitle', value: S.title, style: 'width:min(420px,100%)', oninput: function (e) { S.title = e.target.value || '나무 길 보드게임'; save(); render(); } })]));
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '모둠 수' }), stepper(S.teamCount, 2, 8, function (v) { S.teamCount = v; save(); render(true); })]));
    var note = h('span', { class: 'hint', style: 'margin:0', text: '출발 칸을 포함한 전체 칸 수예요. 처음 값 36칸은 그 선생님 초안과 같아요. 문제가 들어가는 색깔 칸은 ' + (S.cellCount - 1) + '개예요.' });
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '칸 수' }), stepper(S.cellCount, 12, 40, function (v) {
      S.cellCount = v; S.cellColors = MT.makeCellColors(v - 1, S.seed);
      note.textContent = '출발 칸을 포함한 전체 칸 수예요. 처음 값 36칸은 그 선생님 초안과 같아요. 문제가 들어가는 색깔 칸은 ' + (v - 1) + '개예요.';
      Object.keys(G.positions).forEach(function (t) { if (G.positions[t] >= v) delete G.positions[t]; });
      save(); render(true);
    }), note]));
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '칸 색깔' }),
      h('button', { class: 'btn', type: 'button', text: '네 가지 색 다시 섞기', onclick: function () {
        S.seed = Math.floor(Math.random() * 1e9); S.cellColors = MT.makeCellColors(S.cellCount - 1, S.seed); save(); render(true); toast('칸 색깔을 다시 섞었어요.');
      } }),
      h('span', { class: 'hint', style: 'margin:0', text: '노랑, 파랑, 보라, 무지개가 같은 수만큼, 옆 칸과 겹치지 않게 놓여요.' })]));

    el.appendChild(h('h3', { text: '색깔별 미션' }));
    el.appendChild(h('p', { class: 'hint', text: '이름은 칸과 문제 창에 그대로 나와요. “정답이 있는 문제”를 고르면 문제 창에 정답 보기 버튼이 생겨요.' }));
    var grid = h('div', { class: 'mission-grid' });
    MT.COLOR_KEYS.forEach(function (c) {
      var m = S.missions[c];
      grid.appendChild(h('span', { class: 'swatch c-' + c, title: MT.COLORS[c].label }));
      grid.appendChild(h('input', { class: 'inp', value: m.name, 'aria-label': MT.COLORS[c].label + ' 칸 미션 이름', oninput: function (e) { m.name = e.target.value || MT.COLORS[c].label; save(); render(true); } }));
      var sel = h('select', { class: 'sel', 'aria-label': MT.COLORS[c].label + ' 칸 미션 종류', onchange: function (e) { m.kind = e.target.value; save(); } }, [
        h('option', { value: 'quiz', text: '정답이 있는 문제' }), h('option', { value: 'action', text: '정답이 없는 활동' })]);
      sel.value = m.kind; grid.appendChild(sel);
    });
    el.appendChild(grid);

    el.appendChild(h('h3', { text: '나뭇잎' }));
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '한 번에 자라는 나뭇잎' }), stepper(S.leafPerWin || 6, 1, 12, function (v) { S.leafPerWin = v; save(); }),
      h('span', { class: 'hint', style: 'margin:0', text: '미션을 해낼 때마다 이만큼 자라요. 6장이면 미션 30번쯤에 나무가 빽빽해져요.' })]));

    el.appendChild(h('h3', { text: '읽어 주기' }));
    var cb = h('input', { type: 'checkbox', id: 'autoRead', style: 'width:28px;height:28px', onchange: function (e) { S.autoRead = e.target.checked; save(); } });
    cb.checked = !!S.autoRead;
    el.appendChild(h('div', { class: 'rowf' }, [cb, h('label', { for: 'autoRead', text: '문제 창이 열리면 자동으로 소리 내어 읽어 주기' })]));

    el.appendChild(h('h3', { text: '게임 진행' }));
    el.appendChild(h('div', { class: 'rowf' }, [
      h('button', { class: 'btn berry', type: 'button', text: '지금 꽃 피우기', onclick: function () { closeSettings(); G.bloomed = false; bloom(); } }),
      h('button', { class: 'btn', type: 'button', text: '꽃 다시 접기', onclick: function () { G.bloomed = false; save(); render(true); toast('꽃을 다시 봉오리로 돌렸어요.'); } }),
      h('button', { class: 'btn', type: 'button', text: '게임 처음부터', onclick: function () { closeSettings(); resetGame(); } })
    ]));
    el.appendChild(h('p', { class: 'hint', text: '꽃은 위쪽 “꽃 피우기” 버튼이나 여기 “지금 꽃 피우기”를 누르면 피어요. 꽃봉오리는 꽃이 필 때 함께 꽃으로 바뀌어요.' }));
  }

  /* 모둠과 그림 */
  function tabTeams(el) {
    el.appendChild(h('h3', { text: '모둠 자동차' }));
    el.appendChild(h('p', { class: 'hint', text: '창문 수는 기본 4개예요. 그림을 5장 태우면 5인승으로 저절로 바뀌어요. 빈 창문에는 나무 요정이 타요.' }));
    var cards = h('div', { class: 'team-cards' });
    for (var t = 0; t < S.teamCount; t++) (function (t) {
      var team = S.teams[t];
      var faces = A.filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      var prev = h('div', { class: 'car-prev', html: MT.carSVG(team.color, MT.carSeats(S, A, t), faces, String(t + 1)).svg });
      var colors = h('div', { class: 'colors', role: 'group', 'aria-label': team.name + ' 색' });
      MT.TEAM_COLORS.forEach(function (c) {
        colors.appendChild(h('button', { type: 'button', style: 'background:' + c, 'aria-label': '색 ' + c, 'aria-pressed': team.color === c ? 'true' : 'false', onclick: function () { team.color = c; save(); render(); openSettings('teams'); } }));
      });
      var seats = h('select', { class: 'sel', 'aria-label': team.name + ' 창문 수', onchange: function (e) { team.seats = +e.target.value; save(); render(); openSettings('teams'); } },
        [3, 4, 5].map(function (n) { return h('option', { value: n, text: '창문 ' + n + '개' }); }));
      seats.value = team.seats || 4;
      cards.appendChild(h('div', { class: 'team-card' }, [prev,
        h('input', { class: 'inp', value: team.name, 'aria-label': (t + 1) + '번 모둠 이름', oninput: function (e) { team.name = e.target.value || (t + 1) + '모둠'; save(); render(); } }),
        colors, seats, h('div', { class: 'hint', style: 'margin:0', text: '탄 친구 ' + faces.length + '명' })]));
    })(t);
    el.appendChild(cards);

    el.appendChild(h('h3', { text: '아이들 그림 태우기' }));
    el.appendChild(h('p', { class: 'hint', text: '활동지를 스캔한 PDF나 사진을 한꺼번에 올리면 동그라미 안 그림만 잘라내요. 그림 아래 이름 칸을 보고 모둠을 골라 주세요. 그림은 이 컴퓨터에만 저장되고 인터넷으로 보내지 않아요.' }));
    var status = h('p', { class: 'hint', 'aria-live': 'polite' });
    var input = h('input', { type: 'file', accept: '.pdf,application/pdf,image/*', multiple: true, class: 'visually-hidden', id: 'scanInput', onchange: function (e) { handleFiles(e.target.files, status); e.target.value = ''; } });
    var drop = h('div', { class: 'drop' }, [
      h('p', { text: '여기로 파일을 끌어다 놓거나' }),
      h('label', { class: 'btn sky', for: 'scanInput', text: '활동지 파일 고르기' }), input,
      h('p', { class: 'hint', style: 'margin:0', text: 'PDF 여러 쪽, JPG, PNG 모두 돼요.' })
    ]);
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files, status); });
    el.appendChild(drop); el.appendChild(status);
    el.appendChild(h('div', { class: 'rowf', style: 'margin-top:6px' }, [
      h('button', { class: 'btn', type: 'button', text: '그림과 모둠 백업 저장', onclick: exportAvatars }),
      h('label', { class: 'btn', for: 'avImport', text: '백업 불러오기' }),
      h('input', { type: 'file', id: 'avImport', accept: '.json,application/json', class: 'visually-hidden', onchange: importAvatars }),
      h('span', { class: 'hint', style: 'margin:0', text: '다른 컴퓨터에서 준비했거나, 컴퓨터가 초기화될 때를 대비해 저장해 두세요.' })
    ]));

    var grid = h('div', { class: 'scan-grid' });
    var list = A.slice().sort(function (a, b) { return (a.team < 0 ? -1 : 0) - (b.team < 0 ? -1 : 0); });
    list.forEach(function (a) {
      var sel = h('select', { class: 'sel', 'aria-label': '이 그림의 모둠', onchange: function (e) {
        var v = +e.target.value;
        if (v >= 0 && A.filter(function (x) { return x.team === v && x.id !== a.id; }).length >= 5) { toast('한 자동차에는 5명까지 탈 수 있어요.'); e.target.value = a.team; return; }
        a.team = v; saveAvatars(); save(); render(); openSettings('teams');
      } }, [h('option', { value: -1, text: '모둠 고르기' })].concat(S.teams.slice(0, S.teamCount).map(function (t, i) { return h('option', { value: i, text: t.name }); })));
      sel.value = a.team;
      var btns = h('div', { class: 'scan-btns' });
      if (pages[a.id]) btns.appendChild(h('button', { class: 'btn', type: 'button', text: '위치 맞추기', onclick: function () { openAdjust(a); } }));
      btns.appendChild(h('button', { class: 'btn', type: 'button', text: '빼기', onclick: function () { A = A.filter(function (x) { return x.id !== a.id; }); delete pages[a.id]; saveAvatars(); save(); render(); openSettings('teams'); } }));
      var card = h('div', { class: 'scan-card' + (a.ok === false ? ' warn' : '') }, [
        h('div', { class: 'scan-face' }, [h('img', { src: a.img, alt: '잘라낸 그림' })]),
        a.nameImg ? h('img', { class: 'scan-name', src: a.nameImg, alt: '활동지 이름 칸' }) : null,
        a.ok === false ? h('p', { class: 'warnline', text: '동그라미를 잘 못 찾았어요. 위치를 맞춰 주세요.' }) : null,
        sel, btns
      ]);
      grid.appendChild(card);
    });
    el.appendChild(grid);
  }

  async function handleFiles(files, status) {
    if (!files || !files.length) return;
    status.textContent = '파일을 읽고 있어요…';
    try {
      var cvs = await MT.Scan.toPages(Array.from(files), function (m) { status.textContent = m; });
      var bad = 0;
      cvs.forEach(function (cv) {
        var d = MT.Scan.detect(cv), c = MT.Scan.crop(cv, d), id = MT.uid();
        if (!d.ok) bad++;
        pages[id] = { cv: cv, d: d };
        A.push({ id: id, img: c.img, nameImg: c.nameImg, team: -1, ok: d.ok });
      });
      saveAvatars();
      status.textContent = cvs.length + '장을 잘라냈어요.' + (bad ? ' 그중 ' + bad + '장은 위치를 확인해 주세요.' : '');
      openSettings('teams');
    } catch (e) {
      console.error(e); status.textContent = '파일을 읽지 못했어요. 다른 형식(JPG, PNG, PDF)으로 다시 올려 주세요.';
    }
  }

  function download(name, data) {
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function exportAvatars() {
    download('나무길_모둠그림_백업.json', { kind: 'namugil-avatars', teamCount: S.teamCount, teams: S.teams, avatars: A.map(function (a) { return { id: a.id, img: a.img, nameImg: a.nameImg, team: a.team, ok: a.ok }; }) });
  }
  function importAvatars(e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (d.kind !== 'namugil-avatars') throw new Error('kind');
      if (d.teams) S.teams = d.teams;
      if (d.teamCount) S.teamCount = d.teamCount;
      A = d.avatars || [];
      saveAvatars(); save(); render(true); openSettings('teams'); toast('그림과 모둠을 불러왔어요.');
    }).catch(function () { toast('이 게임에서 저장한 백업 파일이 아니에요.'); });
  }

  function openAdjust(a) {
    var src = pages[a.id]; if (!src) return;
    var pv = MT.Scan.preview(src.cv), d = Object.assign({}, src.d);
    var img = h('img', { src: pv.url, alt: '활동지 원본' });
    var ring = h('div', { class: 'adjust-ring', 'aria-label': '그림 위치' });
    var stage = h('div', { class: 'adjust-stage' }, [img, ring]);
    var range = h('input', { type: 'range', min: 40, max: 160, value: 100, style: 'flex:1', 'aria-label': '동그라미 크기' });
    var baseR = d.r;
    function place() {
      var k = img.clientWidth / src.cv.width;
      ring.style.left = ((d.cx - d.r) * k) + 'px'; ring.style.top = ((d.cy - d.r) * k) + 'px';
      ring.style.width = ring.style.height = (d.r * 2 * k) + 'px';
    }
    img.onload = place;
    range.addEventListener('input', function () { d.r = baseR * range.value / 100; place(); });
    var drag = null;
    ring.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: d.cx, cy: d.cy }; ring.setPointerCapture(e.pointerId); });
    ring.addEventListener('pointermove', function (e) { if (!drag) return; var k = img.clientWidth / src.cv.width; d.cx = drag.cx + (e.clientX - drag.x) / k; d.cy = drag.cy + (e.clientY - drag.y) / k; place(); });
    ring.addEventListener('pointerup', function () { drag = null; });
    var back = h('div', { class: 'modal-back', id: 'adjBack' }, [h('div', { class: 'adjust', role: 'dialog', 'aria-modal': 'true', 'aria-label': '그림 위치 맞추기' }, [
      h('h3', { style: 'margin:0;font-family:var(--f-display);font-weight:400;font-size:26px', text: '분홍 동그라미를 그림에 맞춰 주세요' }),
      stage,
      h('div', { class: 'rowf', style: 'margin:0' }, [h('span', { text: '크기' }), range]),
      h('div', { class: 'qactions' }, [
        h('button', { class: 'btn primary', type: 'button', text: '이렇게 자르기', onclick: function () {
          var c = MT.Scan.crop(src.cv, d); a.img = c.img; a.nameImg = c.nameImg; a.ok = true; src.d = d;
          saveAvatars(); save(); render(); back.remove(); openSettings('teams');
        } }),
        h('button', { class: 'btn', type: 'button', text: '취소', onclick: function () { back.remove(); } })
      ])
    ])]);
    $('#layer').appendChild(back);
    if (img.complete) setTimeout(place, 30);
  }

  /* 문제 */
  function tabQuestions(el) {
    el.appendChild(h('h3', { text: '칸마다 문제 두 개' }));
    el.appendChild(h('p', { class: 'hint', text: '칸을 처음 누르면 문제 1, 다음에 누르면 문제 2가 나와요. 비워 둔 칸에는 예시 문제가 나와요. 정답 칸은 “정답이 있는 문제” 색깔에서만 쓰여요.' }));
    var pasteBox = h('div', { style: 'display:none;margin-bottom:16px' }, [
      h('p', { class: 'hint', text: '스프레드시트에서 칸을 복사해 붙여 넣으세요. 순서: 칸 번호 | 색(노랑, 파랑, 보라, 무지개. 비워도 돼요) | 문제1 | 정답1 | 문제2 | 정답2' }),
      h('textarea', { class: 'ta', id: 'pasteArea', rows: 8, placeholder: '1\t노랑\t친구가 넘어졌어요. 어떤 말을 해 줄까요?\t괜찮아?\t…' }),
      h('div', { class: 'qactions' }, [h('button', { class: 'btn primary', type: 'button', text: '붙여 넣은 문제 넣기', onclick: applyPaste })])
    ]);
    el.appendChild(h('div', { class: 'rowf' }, [
      h('button', { class: 'btn sky', type: 'button', text: '표에서 붙여넣기', onclick: function () { pasteBox.style.display = pasteBox.style.display === 'none' ? 'block' : 'none'; } }),
      h('button', { class: 'btn', type: 'button', text: '문제 파일로 저장', onclick: exportQuestions }),
      h('label', { class: 'btn', for: 'qImport', text: '문제 파일 불러오기' }),
      h('input', { type: 'file', id: 'qImport', accept: '.json,application/json', class: 'visually-hidden', onchange: importQuestions })
    ]));
    el.appendChild(pasteBox);
    var rows = h('div', { class: 'q-rows' });
    for (var c = 1; c <= S.cellCount - 1; c++) (function (c) {
      var color = MT.cellColor(S, c), m = S.missions[color];
      var own = S.questions[c] || (S.questions[c] = { q1: '', a1: '', q2: '', a2: '' });
      function ta(key, ph, ans) {
        var t = h('textarea', { class: 'ta' + (ans ? ' ans' : ''), rows: ans ? 1 : 2, placeholder: ph, 'aria-label': c + '번 칸 ' + ph });
        t.value = own[key] || '';
        t.addEventListener('input', function () { own[key] = t.value; MT.store.saveSettings(S); clearTimeout(ta._t); ta._t = setTimeout(pushSync, 600); });
        return t;
      }
      var s1 = MT.getQuestion(Object.assign({}, S, { questions: {} }), c, 0), s2 = MT.getQuestion(Object.assign({}, S, { questions: {} }), c, 1);
      var isQuiz = m.kind === 'quiz';
      rows.appendChild(h('div', { class: 'q-row' }, [
        h('div', { class: 'q-num' }, [h('span', { class: 'swatch c-' + color, text: c }), h('small', { text: m.name })]),
        h('div', { class: 'q-pair' }, [ta('q1', '문제 1 (예시: ' + s1.text + ')'), isQuiz ? ta('a1', '정답 1', true) : null]),
        h('div', { class: 'q-pair' }, [ta('q2', '문제 2 (예시: ' + s2.text + ')'), isQuiz ? ta('a2', '정답 2', true) : null])
      ]));
    })(c);
    el.appendChild(rows);
  }

  function applyPaste() {
    var txt = $('#pasteArea').value, names = { '노랑': 'yellow', '파랑': 'blue', '보라': 'purple', '무지개': 'rainbow' }, n = 0;
    txt.split(/\r?\n/).forEach(function (line) {
      var col = line.split('\t'); if (col.length < 2) return;
      var cell = parseInt(col[0], 10); if (!(cell >= 1 && cell <= S.cellCount - 1)) return;
      var rest = col.slice(1);
      var cname = (rest[0] || '').trim();
      if (names[cname] || cname === '') { if (names[cname]) S.cellColors[cell - 1] = names[cname]; rest = rest.slice(1); }
      S.questions[cell] = { q1: (rest[0] || '').trim(), a1: (rest[1] || '').trim(), q2: (rest[2] || '').trim(), a2: (rest[3] || '').trim() };
      n++;
    });
    save(); render(true); openSettings('questions'); toast(n + '개 칸에 문제를 넣었어요.');
  }
  function exportQuestions() {
    var data = { kind: 'namugil-questions', title: S.title, cellCount: S.cellCount, cellColors: S.cellColors, missions: S.missions, questions: S.questions };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: '나무길_문제.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importQuestions(e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (d.kind !== 'namugil-questions') throw new Error('kind');
      if (d.cellCount) S.cellCount = d.cellCount;
      if (d.cellColors && d.cellColors.length === S.cellCount - 1) S.cellColors = d.cellColors; else MT.ensureColors(S);
      if (d.missions) S.missions = d.missions;
      S.questions = d.questions || {};
      save(); render(true); openSettings('questions'); toast('문제 파일을 불러왔어요.');
    }).catch(function () { toast('이 게임에서 저장한 문제 파일이 아니에요.'); });
  }

  /* 태블릿 연결 */
  function tabletURL() { return new URL('tablet.html?room=' + S.room, location.href).href; }
  function tabConnect(el) {
    el.appendChild(h('h3', { text: '모둠 태블릿 연결' }));
    if (!MT.Sync.configured()) {
      el.appendChild(h('p', { class: 'hint', text: '아직 파이어베이스 설정이 없어서 이 컴퓨터 혼자서만 돌아가고 있어요. firebase-config.js 파일에 설정을 넣으면 태블릿 연결과 선물 보내기가 켜져요. 방법은 README.md에 있어요.' }));
    } else if (!syncOn) {
      el.appendChild(h('p', { class: 'hint', text: '파이어베이스에 연결하지 못했어요. 인터넷 연결과 firebase-config.js 내용을 확인해 주세요.' }));
    } else {
      var qr = h('div', { class: 'qr', id: 'qrBox' });
      el.appendChild(h('div', { class: 'qr-box' }, [qr, h('div', null, [
        h('p', { class: 'hint', style: 'margin:0', text: '방 번호' }),
        h('div', { class: 'room-code', text: S.room }),
        h('p', { class: 'hint', text: '태블릿 카메라로 QR을 찍거나, 아래 주소를 열고 방 번호를 넣어요.' }),
        h('p', null, [h('span', { class: 'code', text: tabletURL() })])
      ])]));
      loadQR().then(function () { new window.QRCode(qr, { text: tabletURL(), width: 220, height: 220, colorDark: '#5B4636', colorLight: '#ffffff' }); }).catch(function () { qr.textContent = 'QR을 만들지 못했어요. 주소를 직접 입력해 주세요.'; });
      el.appendChild(h('div', { class: 'rowf', style: 'margin-top:18px' }, [
        h('button', { class: 'btn', type: 'button', text: '새 방 번호 만들기', onclick: function () {
          if (!confirm('방 번호를 바꾸면 태블릿을 다시 연결해야 해요. 바꿀까요?')) return;
          S.room = String(1000 + Math.floor(Math.random() * 9000)); save(); watchGifts(); openSettings('connect');
        } }),
        h('button', { class: 'btn', type: 'button', text: '받은 선물 그림 모두 지우기', onclick: function () {
          if (!confirm('게임판의 선물 그림을 모두 지울까요?')) return;
          G.gifts = []; MT.Sync.clearGifts(S.room).catch(function () {}); save(); render(true); toast('선물 그림을 지웠어요.');
        } }),
        h('button', { class: 'btn berry', type: 'button', text: '수업 끝: 이 방 기록 지우기', onclick: function () {
          if (!confirm('인터넷에 올라간 이 방의 기록(게임 상태, 선물 그림)을 지울까요? 이 컴퓨터의 게임판은 그대로예요.')) return;
          MT.Sync.clearRoom(S.room).then(function () { toast('이 방 기록을 지웠어요.'); }).catch(function () { toast('지우지 못했어요. 인터넷 연결을 확인해 주세요.'); });
        } })
      ]));
      el.appendChild(h('p', { class: 'hint', text: '태블릿에는 게임판 모습과 문제만 보내요. 아이들 얼굴 그림은 보내지 않아서 태블릿 화면 자동차 창문에는 요정이 타 있어요.' }));
    }

    el.appendChild(h('h3', { text: '태블릿 없이 선물 그림 올리기' }));
    el.appendChild(h('p', { class: 'hint', text: '종이에 그린 선물을 사진으로 찍어 올리면 게임판에 선물이 하나씩 나타나요.' }));
    var teamSel = h('select', { class: 'sel', 'aria-label': '선물을 보낸 모둠' }, S.teams.slice(0, S.teamCount).map(function (t, i) { return h('option', { value: i, text: t.name }); }));
    el.appendChild(h('div', { class: 'rowf' }, [teamSel,
      h('label', { class: 'btn sky', for: 'giftInput', text: '선물 사진 고르기' }),
      h('input', { type: 'file', id: 'giftInput', accept: 'image/*', multiple: true, class: 'visually-hidden', onchange: function (e) {
        var team = +teamSel.value, files = Array.from(e.target.files);
        MT.Scan.toPages(files).then(function (cvs) {
          cvs.forEach(function (cv, i) {
            var s = Math.min(cv.width, cv.height), o = document.createElement('canvas'); o.width = o.height = 360;
            o.getContext('2d').drawImage(cv, (cv.width - s) / 2, (cv.height - s) / 2, s, s, 0, 0, 360, 360);
            setTimeout(function () { G.gifts.push({ id: MT.uid(), team: team, img: o.toDataURL('image/jpeg', 0.8) }); MT.store.saveGame(G); render(); }, i * 600);
          });
          setFairy('선물이 도착했어! ' + josa(teamName(team), '이', '가') + ' 보낸 그림이야. 고마워!', 'cheer');
          closeSettings();
        });
      } })
    ]));
  }
  var qrReady = null;
  function loadQR() {
    if (qrReady) return qrReady;
    qrReady = new Promise(function (ok, no) {
      if (window.QRCode) return ok();
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
    return qrReady;
  }

  /* ---------- 시작 ---------- */
  $('#btnSettings').addEventListener('click', function () { openSettings(); });
  $('#btnReset').addEventListener('click', resetGame);
  $('#btnBloom').addEventListener('click', function () { if (G.bloomed) showBloom(); else if (confirm('우리 반 나무에 꽃을 피울까요?')) bloom(); });
  $('#btnFull').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () { toast('이 브라우저에서는 전체 화면을 쓸 수 없어요.'); });
  });
  $('#btnSayFairy').addEventListener('click', function () { speak($('#fairyText').textContent); });
  $('#btnHowto').addEventListener('click', function () { setFairy(MT.FAIRY_LINES.howto, 'guide'); save(); renderFairy(); speak(MT.FAIRY_LINES.howto); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('#adjBack')) $('#adjBack').remove();
    else if ($('#setBack')) closeSettings();
    else if ($('#qback')) closePopup();
    else if ($('#bloomBack')) $('#bloomBack').remove();
  });

  if (!G.fairy) setFairy(MT.FAIRY_LINES.hello, 'guide');
  render(true);
  requestAnimationFrame(function () { render(true); });

  MT.Sync.init().then(function (on) {
    syncOn = on;
    $('#syncBadge').textContent = on ? '태블릿 연결 켜짐, 방 번호 ' + S.room : (MT.Sync.configured() ? '태블릿 연결 안 됨 (인터넷 확인)' : '이 컴퓨터 혼자 하는 중');
    if (on) { pushSync(); watchGifts(); }
  });

  // 미리보기 확인용
  MT._debug = { S: function () { return S; }, G: function () { return G; }, open: openQuestion, drop: carDropped, success: function () { success(); }, bloom: bloom, settings: openSettings };
})(window.MT);
